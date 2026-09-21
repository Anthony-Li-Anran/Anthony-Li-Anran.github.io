import asyncio
import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault('STELLE_DB',str(Path(tempfile.gettempdir())/'stelle-tests-bootstrap.sqlite'))
import httpx
from fastapi.testclient import TestClient
import app
import budget
from context import recent_updates, retrieve

RealAsyncClient = httpx.AsyncClient

def upstream(request):
    body = json.loads(request.content)
    assert body['stream'] is True
    sentence = json.dumps({'text':'Anthony 的笔记可以一起慢慢看。','expression':'Smile','motion':'nod'},ensure_ascii=False)
    # Fragment across JSON boundaries like a real provider's SSE stream.
    events = [{'choices':[{'delta':{'content':sentence[:14]}}]},
              {'choices':[{'delta':{'content':sentence[14:]},'finish_reason':'stop'}]},
              {'choices':[],'usage':{'total_tokens':100}}]
    content = ''.join('data: '+json.dumps(event)+'\n\n' for event in events)+'data: [DONE]\n\n'
    return httpx.Response(200,text=content)

class BackendTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        budget.DB = str(Path(self.temp.name)/'budget.sqlite'); budget.init()
        self.env = patch.dict(os.environ,{'STELLE_OWNER_KEY':'test-owner-only','STELLE_MAX_CNY_PER_MILLION':'10','STELLE_DAILY_CNY':'5','STELLE_MONTHLY_CNY':'20'})
        self.env.start(); self.client = TestClient(app.app)
    def tearDown(self):
        self.client.close(); self.env.stop(); self.temp.cleanup()
    def token(self): return budget.redeem(budget.create_invite(total=1000000,daily=1000000))
    def mock(self, handler=upstream):
        return patch.object(app.httpx,'AsyncClient',lambda **kwargs: RealAsyncClient(transport=httpx.MockTransport(handler)))
    def test_invite_one_use_revoke_and_concurrency(self):
        code = budget.create_invite(); token = budget.redeem(code)
        with self.assertRaises(budget.LimitError): budget.redeem(code)
        who = budget.digest(token)
        def attempt(_):
            try: return budget.reserve(who,True,1000,1000000,1000000)
            except budget.LimitError: return None
        with ThreadPoolExecutor(max_workers=4) as executor: results=list(executor.map(attempt,range(4)))
        self.assertEqual(sum(x is not None for x in results),1)
        budget.settle(next(x for x in results if x),100)
        with budget.transaction() as db: db.execute('UPDATE invites SET revoked=1')
        with self.assertRaises(budget.LimitError): budget.reserve(who,True,1000,1000000,1000000)
    def test_budget_persistence_and_unknown_cost(self):
        who = budget.digest(self.token())
        call=budget.reserve(who,True,900000,1000000,1000000); budget.settle(call)
        budget.init()
        with self.assertRaises(budget.LimitError): budget.reserve(who,True,200000,1000000,1000000)
    def test_expiry_global_budget_and_rate(self):
        token=self.token()
        with budget.transaction() as db: db.execute('UPDATE invites SET expires=0')
        with self.assertRaises(budget.LimitError): budget.reserve(budget.digest(token),True,1,10,10)
        who=budget.digest(self.token())
        with self.assertRaises(budget.LimitError): budget.reserve(who,True,11,10,100)
        budget.rate('ip',1)
        with self.assertRaises(budget.LimitError): budget.rate('ip',1)
    def test_stream_and_settlement(self):
        with self.mock():
            response=self.client.post('/api/chat',json={'mode':'invite','token':self.token(),'message':'你好'})
        events=[json.loads(row) for row in response.text.splitlines()]
        self.assertEqual(response.status_code,200)
        self.assertIn('Anthony',next(e['text'] for e in events if e['type']=='text'))
        self.assertEqual(events[-1]['type'],'done')
        with budget.transaction() as db:
            row=db.execute('SELECT cost,active FROM calls').fetchone()
        self.assertEqual(tuple(row),(1000,0))
    def test_byok_no_owner_fallback_and_sanitized_error(self):
        def reject(request):
            self.assertEqual(request.headers['authorization'],'Bearer visitor-secret')
            return httpx.Response(401,text='private provider diagnostics')
        with self.mock(reject): response=self.client.post('/api/chat',json={'mode':'byok','key':'visitor-secret','message':'你好'})
        self.assertNotIn('private',response.text); self.assertNotIn('visitor-secret',response.text)
        self.assertIn('error',response.text)
    def test_validation_origins_and_body_limit(self):
        response=self.client.post('/api/chat',json={'mode':'oops','key':'secret-do-not-echo','message':'a'})
        self.assertEqual(response.status_code,422); self.assertNotIn('secret',response.text)
        self.assertEqual(self.client.post('/api/chat',headers={'Origin':'https://bad.example'},json={}).status_code,403)
        self.assertEqual(self.client.post('/api/chat',content='x'*41000).status_code,413)
        self.assertEqual(self.client.post('/api/chat',json={'mode':'byok','provider':'custom','key':'test-key','message':'a'}).status_code,422)
    def test_safe_performance(self):
        result=app.parse_sentence('{"text":"hi","expression":{},"motion":"eval","meme_id":[]}',set())
        self.assertEqual(result['expression'],'Neutral'); self.assertEqual(result['motion'],'none')
    def test_truncated_stream_releases_concurrency(self):
        def broken(request): return httpx.Response(200,text='data: {"choices":[{"delta":{"content":"{"}}]}\n\n')
        with self.mock(broken): response=self.client.post('/api/chat',json={'mode':'invite','token':self.token(),'message':'hi'})
        self.assertIn('error',response.text)
        with budget.transaction() as db: row=db.execute('SELECT cost,active FROM calls').fetchone()
        self.assertGreater(row['cost'],0); self.assertEqual(row['active'],0)
    def test_recent_boundaries_relevance_and_failure(self):
        now=datetime(2026,9,21,tzinfo=timezone.utc); path=Path(self.temp.name)/'updates.json'
        def write(rows): path.write_text(json.dumps(rows),encoding='utf-8')
        row={'public':True,'occurred_at':(now-timedelta(days=7)).isoformat(),'text':'写网站','topics':['网站']}
        write([row]); self.assertEqual(recent_updates('最近在忙什么',[],path,now)['status'],'recent')
        row['occurred_at']=(now-timedelta(days=7,seconds=1)).isoformat(); write([row])
        self.assertEqual(recent_updates('最近在忙什么',[],path,now)['status'],'no_recent_relevant')
        row['occurred_at']=now.isoformat(); write([row])
        self.assertEqual(recent_updates('最近跑步如何',[],path,now)['records'],[])
        row['public']=False; write([row]); self.assertEqual(recent_updates('最近呢',[],path,now)['records'],[])
        path.write_text('{',encoding='utf-8'); self.assertEqual(recent_updates('最近呢',[],path,now)['status'],'query_failed')
    def test_retrieval_and_meme_dedup(self):
        path=Path(self.temp.name)/'knowledge.json'
        path.write_text(json.dumps({'documents':[{'title':'梯度下降','url':'/learning/gd/','text':'梯度下降更新参数'}]}),encoding='utf-8')
        result=retrieve('垃圾桶','/learning/gd/',[],[],path)
        self.assertEqual(result['website']['documents'][0]['url'],'/learning/gd/')
        self.assertEqual(result['memes'][0]['id'],'trashcan')
        self.assertEqual(retrieve('垃圾桶','/',[],['trashcan'],path)['memes'],[])

if __name__ == '__main__': unittest.main()
