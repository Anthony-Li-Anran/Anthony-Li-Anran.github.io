const {test}=require('node:test');
const assert=require('node:assert/strict');
const direct=require('../assets/js/stelle-direct.js');
const options=()=>({credential:{provider:'deepseek',model:'deepseek-v4-flash',key:'visitor-test-key'},message:'最近在忙什么',history:[],page:'/',usedMemes:[],knowledgeURL:'/knowledge',contextURL:'/context',signal:new AbortController().signal});
function fixture(handler){
 const requests=[];const original=global.fetch;
 global.fetch=async(url,init)=>{
  requests.push({url,init});
  if(url==='/knowledge') return Response.json({documents:[{title:'首页',url:'/',text:'Anthony 的公开网站'}]});
  if(url==='/context') return Response.json({updates:[],memes:[]});
  return handler(url,init);
 };
 return {requests,restore:()=>global.fetch=original};
}
const collect=async(opts)=>{const events=[];for await(const event of direct.stream(opts))events.push(event);return events;};
function response(text,finish='stop') {
 const content=[JSON.stringify({choices:[{delta:{content:text},finish_reason:finish}]}),'[DONE]'].map(v=>'data: '+v+'\r\n\r\n').join('');
 const bytes=new TextEncoder().encode(content);let i=0;
 return new Response(new ReadableStream({pull(c){if(i>=bytes.length)c.close();else{c.enqueue(bytes.slice(i,i+7));i+=7;}}}));
}
test('direct SSE decodes split UTF8 and validates performance, without proxy',async()=>{
 const f=fixture(()=>response('{"text":"你好，Anthony 的访客。","expression":"Smile","motion":"nod"}\n'));
 try{
  const events=await collect(options());
  assert.equal(events.find(e=>e.type==='text').text,'你好，Anthony 的访客。');assert.equal(events.at(-1).type,'done');
  const request=f.requests.at(-1);assert.equal(request.url,direct.providers.deepseek.url);
  assert.equal(request.init.headers.Authorization,'Bearer visitor-test-key');
  assert.equal(request.init.credentials,'omit');assert.equal(request.init.redirect,'error');
  assert(!request.init.body.includes('visitor-test-key'));assert(!f.requests.some(r=>r.url.includes('/api/chat')||r.url.includes('8787')));
 }finally{f.restore();}
});
test('Qwen goes only to selected service and disables thinking',async()=>{
 const f=fixture(()=>response('{"text":"你好"}'));
 try{const opts=options();opts.credential.provider='qwen';await collect(opts);assert.equal(f.requests.at(-1).url,direct.providers.qwen.url);assert.equal(JSON.parse(f.requests.at(-1).init.body).enable_thinking,false);}finally{f.restore();}
});
test('unknown provider never receives a key or triggers a request',async()=>{
 const f=fixture(()=>{throw Error('unexpected request');});
 try{const opts=options();opts.credential.provider='constructor';await assert.rejects(collect(opts),/服务商/);assert.equal(f.requests.length,0);}finally{f.restore();}
});
test('401 is actionable, no fallback or reflected provider diagnostics',async()=>{
 const f=fixture(()=>new Response('visitor-test-key internal',{status:401}));
 try{await assert.rejects(collect(options()),/API Key 无效/);assert.equal(f.requests.filter(r=>r.url.startsWith('https:')).length,1);}finally{f.restore();}
});
test('interrupted stream never reports completion',async()=>{
 const f=fixture(()=>response('{"text":"部分回答"}\n','length'));
 try{await assert.rejects(collect(options()),/中断|长度限制/);}finally{f.restore();}
});
test('abort before call never sends visitor credential',async()=>{
 const f=fixture(()=>{throw Error('unexpected paid request');});
 try{const opts=options();opts.signal=AbortSignal.abort();await assert.rejects(collect(opts),{name:'AbortError'});assert(!f.requests.some(r=>r.url.startsWith('https:')));}finally{f.restore();}
});
test('dates: seven days, revoked, unrelated, failed vs absent',()=>{
 const now=Date.parse('2026-09-21T10:00:00+08:00');
 const row={public:true,text:'网站更新',topics:['网站'],occurred_at:'2026-09-14T10:00:00+08:00'};
 assert.equal(direct.recent('Anthony最近在忙什么',[],[row],now).status,'recent');
 assert.equal(direct.recent('最近呢',[],[row],now+1).status,'no_recent_relevant');
 assert.equal(direct.recent('最近呢',[],[{...row,revoked:true}],now).records.length,0);
 assert.equal(direct.recent('最近跑步如何',[],[row],now).records.length,0);
 assert.equal(direct.recent('最近呢',[],null,now).status,'query_failed');
 assert.equal(direct.recent('最近呢',[],[],now).status,'no_recent_relevant');
});
test('retrieval retains public page context, excludes unsafe URLs and repeats',()=>{
 const result=direct.context('垃圾桶','/',[],['trash'],{documents:[{title:'Home',url:'/',text:'Anthony'},{title:'垃圾桶',url:'//evil.test',text:'垃圾桶'}]},{updates:[],memes:[{id:'trash',terms:['垃圾桶']}]});
 assert.equal(result.website.documents.length,1);assert.equal(result.memes.length,0);
 assert.equal(direct.sentence('{"text":"ok","motion":"eval","expression":{}}',new Set()).motion,'none');
});
test('reply parser accepts fenced pretty JSON, arrays, NDJSON and plain text',()=>{
 const allowed=new Set(['meme']);
 const pretty='```json\n{\n  "segments": [\n    {"text":"第一句。","expression":"Smile","motion":"nod"},\n    {"text":"第二句。","expression":"bad","motion":"eval"}\n  ]\n}\n```';
 assert.deepEqual(direct.parseReply(pretty,allowed).map(x=>x.text),['第一句。','第二句。']);
 assert.equal(direct.parseReply(pretty,allowed)[1].expression,'Neutral');
 assert.equal(direct.parseReply('[{"text":"数组回答。"}]',allowed)[0].text,'数组回答。');
 assert.deepEqual(direct.parseReply('{"text":"一。"}\n{"text":"二。"}',allowed).map(x=>x.text),['一。','二。']);
 assert.equal(direct.parseReply('普通文字也应该显示。',allowed)[0].text,'普通文字也应该显示。');
});
test('reply parser recovers text from a truncated JSON object',()=>{
 assert.equal(direct.parseReply('{"text":"已经生成的内容。","expression":',new Set())[0].text,'已经生成的内容。');
});
