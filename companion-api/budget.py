"""SQLite accounting: atomic reservations, conservative settlement on lost usage."""
import hashlib
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path

DB = os.getenv('STELLE_DB', str(Path(__file__).with_name('budget.sqlite')))

class LimitError(Exception):
    pass

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

@contextmanager
def transaction():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        db.execute('BEGIN IMMEDIATE')
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()

def init():
    with transaction() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS invites (
          code TEXT PRIMARY KEY, token TEXT UNIQUE, expires REAL NOT NULL,
          total INTEGER NOT NULL, daily INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS calls (
          id TEXT PRIMARY KEY, identity TEXT NOT NULL, paid INTEGER NOT NULL,
          cost INTEGER NOT NULL, started REAL NOT NULL, day TEXT NOT NULL,
          month TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE INDEX IF NOT EXISTS calls_identity ON calls(identity,started);
        CREATE TABLE IF NOT EXISTS attempts (identity TEXT NOT NULL, at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS attempts_time ON attempts(identity,at);
        ''')

def create_invite(days=7, total=1000000, daily=200000):
    code = secrets.token_urlsafe(18)
    with transaction() as db:
        db.execute('INSERT INTO invites(code,expires,total,daily) VALUES(?,?,?,?)',
                   (digest(code),time.time()+days*86400,total,daily))
    return code

def rate(identity, maximum=12):
    now = time.time()
    with transaction() as db:
        db.execute('DELETE FROM attempts WHERE at < ?', (now-60,))
        if db.execute('SELECT count(*) FROM attempts WHERE identity=? AND at>?', (identity,now-60)).fetchone()[0] >= maximum:
            raise LimitError('请求有些频繁，稍等一分钟再来。')
        db.execute('INSERT INTO attempts VALUES(?,?)',(identity,now))

def redeem(code):
    token = secrets.token_urlsafe(32)
    with transaction() as db:
        changed = db.execute('UPDATE invites SET token=? WHERE code=? AND token IS NULL AND revoked=0 AND expires>?',
                             (digest(token),digest(code),time.time())).rowcount
        if not changed: raise LimitError('邀请码无效、已兑换或已过期。')
    return token

def reserve(identity, paid, amount, global_daily, global_monthly):
    now = time.time()
    date = datetime.now(timezone(timedelta(hours=8)))
    day, month = date.strftime('%Y-%m-%d'), date.strftime('%Y-%m')
    call_id = secrets.token_hex(16)
    with transaction() as db:
        # Interrupted processes keep the maximum charge, but their concurrency lease expires.
        db.execute('UPDATE calls SET active=0 WHERE active=1 AND started<?',(now-150,))
        if db.execute('SELECT count(*) FROM calls WHERE active=1').fetchone()[0] >= 8:
            raise LimitError('现在有点忙，请稍后再试。')
        if db.execute('SELECT count(*) FROM calls WHERE identity=? AND active=1',(identity,)).fetchone()[0]:
            raise LimitError('上一条消息还在处理中。')
        if db.execute('SELECT count(*) FROM calls WHERE identity=? AND started>?',(identity,now-60)).fetchone()[0] >= 6:
            raise LimitError('先歇一会儿，一分钟后再聊。')
        if paid:
            invite = db.execute('SELECT * FROM invites WHERE token=? AND revoked=0 AND expires>?',(identity,now)).fetchone()
            if not invite: raise LimitError('体验凭证无效或已过期，请重新连接。')
            total = db.execute('SELECT coalesce(sum(cost),0) FROM calls WHERE identity=?',(identity,)).fetchone()[0]
            daily = db.execute('SELECT coalesce(sum(cost),0) FROM calls WHERE identity=? AND day=?',(identity,day)).fetchone()[0]
            gd = db.execute('SELECT coalesce(sum(cost),0) FROM calls WHERE paid=1 AND day=?',(day,)).fetchone()[0]
            gm = db.execute('SELECT coalesce(sum(cost),0) FROM calls WHERE paid=1 AND month=?',(month,)).fetchone()[0]
            if total+amount > invite['total'] or daily+amount > invite['daily']:
                raise LimitError('体验额度暂时用完了。你也可以使用自己的 API。')
            if gd+amount > global_daily or gm+amount > global_monthly:
                raise LimitError('本站体验预算已用完，请改用自己的 API 或稍后再来。')
        db.execute('INSERT INTO calls VALUES(?,?,?,?,?,?,?,1)',(call_id,identity,int(paid),amount if paid else 0,now,day,month))
    return call_id

def settle(call_id, actual=None):
    with transaction() as db:
        if actual is None:
            db.execute('UPDATE calls SET active=0 WHERE id=?',(call_id,))
        else:
            db.execute('UPDATE calls SET cost=?,active=0 WHERE id=?',(max(0,actual),call_id))

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Manage one-use invitation codes; budget units are micro-CNY.')
    parser.add_argument('action',choices=['create','revoke'])
    parser.add_argument('--code',default='')
    parser.add_argument('--days',type=int,default=7)
    parser.add_argument('--total',type=int,default=1000000)
    parser.add_argument('--daily',type=int,default=200000)
    args = parser.parse_args(); init()
    if args.action == 'create':
        if min(args.days,args.total,args.daily) <= 0: parser.error('Limits must be positive')
        print(create_invite(args.days,args.total,args.daily))
    else:
        with transaction() as db: db.execute('UPDATE invites SET revoked=1 WHERE code=?',(digest(args.code),))
        print('Revoked')
