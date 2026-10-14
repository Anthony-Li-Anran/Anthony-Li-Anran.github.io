'use strict';
// Owner-funded Alibaba Cloud FC proxy for Anthony's site Stelle chat.
// Holds the DashScope key server-side, validates origin + a shared token,
// then streams the OpenAI-compatible reply back to the browser. No business
// logic here — the browser assembles the full message list.

const http = require('http');

const PORT = process.env.PORT || 9000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://anthony-li-anran.github.io';
const DASHSCOPE_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = process.env.MODEL || 'qwen-plus';
const API_KEY = process.env.DASHSCOPE_API_KEY || '';
const STELLE_TOKEN = process.env.STELLE_TOKEN || '';

// ---- cost guards (best-effort, in-memory) ----
// Free tier: qwen-plus ~12M tokens / 90d (Beijing only); FC ~1M invokes / mo.
// These guards soften abuse; the real hard cap is set in the Alibaba console
// (DashScope key spend limit + "stop when exhausted", FC max instances, alarms).
const DAY_TOKEN_BUDGET = Number(process.env.DAY_TOKEN_BUDGET || 8_000_000); // safety margin under 12M
const MAX_IP_PER_MIN = Number(process.env.MAX_IP_PER_MIN || 8);
const MAX_IP_PER_DAY = Number(process.env.MAX_IP_PER_DAY || 300);
let dayTokenUsed = 0;
let dayWindow = startOfDay();

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function rolloverIfNewDay() {
  const today = startOfDay();
  if (dayWindow < today) { dayWindow = today; dayTokenUsed = 0; ipHits.clear(); }
}
function checkRateLimit(ip) {
  rolloverIfNewDay();
  let rec = ipHits.get(ip);
  if (!rec) { rec = { minute: [], day: 0 }; ipHits.set(ip, rec); }
  const now = Date.now();
  rec.minute = rec.minute.filter((t) => now - t < 60000);
  if (rec.minute.length >= MAX_IP_PER_MIN) return 'rate_minute';
  if (rec.day >= MAX_IP_PER_DAY) return 'rate_day';
  rec.minute.push(now); rec.day += 1;
  return null;
}
function checkBudget() {
  rolloverIfNewDay();
  if (dayTokenUsed >= DAY_TOKEN_BUDGET) return 'daily_budget_exhausted';
  return null;
}
const ipHits = new Map();

function setCORS(res, origin) {
  // Only echo the allow-listed origin; never reflect arbitrary origins.
  res.setHeader('Access-Control-Allow-Origin', origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-stelle-token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 64_000) { req.destroy(); reject(new Error('payload_too_large')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  if (req.method === 'OPTIONS') { setCORS(res, origin); res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('stelle-alibaba-proxy ok');
    return;
  }

  setCORS(res, origin);
  if (req.url !== '/chat') { res.writeHead(404); res.end('not found'); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end('method not allowed'); return; }
  if (origin !== ALLOWED_ORIGIN) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'forbidden_origin' }));
    return;
  }
  if (!STELLE_TOKEN || req.headers['x-stelle-token'] !== STELLE_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server_not_configured' }));
    return;
  }
  const rateErr = checkRateLimit(clientIp);
  if (rateErr) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: rateErr }));
    return;
  }
  const budgetErr = checkBudget();
  if (budgetErr) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: budgetErr, hint: '免费额度已达今日预算上限，明日恢复；或点⚙填自己的 Key 继续聊。' }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'bad_request' }));
    return;
  }
  const messages = payload && payload.messages;
  if (!Array.isArray(messages) || !messages.length) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing_messages' }));
    return;
  }

  let upstream;
  try {
    upstream = await fetch(DASHSCOPE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
      body: JSON.stringify({ model: MODEL, stream: true, max_tokens: 900, temperature: 0.3, enable_thinking: false, messages })
    });
  } catch (_) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream_unreachable' }));
    return;
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream_error', status: upstream.status, detail: detail.slice(0, 500) }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  try {
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let lastUsage = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // DashScope streams a final "usage": {"total_tokens": N} event.
      const m = chunk.match(/"total_tokens"\s*:\s*(\d+)/);
      if (m) lastUsage = Number(m[1]);
      res.write(chunk);
    }
    res.write(decoder.decode());
    // Count tokens actually billed by DashScope (prompt + completion) — the real
    // cost driver. Free tier for qwen-plus is ~12M tokens / 90d (Beijing only).
    dayTokenUsed += lastUsage || 0;
  } catch (_) {
    // Client disconnected or upstream closed early; nothing more to send.
  } finally {
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[stelle-alibaba-proxy] listening on ' + PORT);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
