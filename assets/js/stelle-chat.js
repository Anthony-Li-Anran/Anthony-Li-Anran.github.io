/* Text-only conversation UI. Credentials never enter persisted conversation state. */
(() => {
  'use strict';
  const root = document.getElementById('live2d-companion');
  if (!root) return;
  const el = id => document.getElementById(id);
  const chat = el('stelle-chat'), log = el('stelle-messages'), input = el('stelle-input');
  const settings = el('stelle-settings'), status = el('stelle-status'), intro = el('stelle-intro');
  const api = root.dataset.api || (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:8787' : '');
  const store = {
    read(key, fallback) { try { return JSON.parse(sessionStorage.getItem('stelle-' + key)) ?? fallback; } catch (_) { return fallback; } },
    write(key, value) { try { sessionStorage.setItem('stelle-' + key, JSON.stringify(value)); } catch (_) { /* optional */ } }
  };
  const savedHistory = store.read('history', []);
  let history = (Array.isArray(savedHistory) ? savedHistory : []).filter(x => x && ['user','assistant'].includes(x.role) && typeof x.content === 'string').slice(-16);
  const savedToken = store.read('invite-token', null);
  let credential = typeof savedToken === 'string' ? {mode:'invite',token:savedToken} : null;
  let controller = null, busy = false, introTimer, generation = 0;
  const savedMemes = store.read('memes', []);
  let usedMemes = (Array.isArray(savedMemes) ? savedMemes : []).filter(x => typeof x === 'string').slice(-8);
  if (credential) status.textContent = '邀请码体验 · 凭证已恢复';
  const perform = (expression = 'Neutral', motion = 'none') => root.dispatchEvent(new CustomEvent('stelle:perform', {detail:{expression,motion}}));
  function add(role, text) {
    const node = document.createElement('div'); node.className = 'stelle-message'; node.dataset.role = role;
    node.textContent = text; log.append(node); log.scrollTop = log.scrollHeight; return node;
  }
  function save() { store.write('history', history.slice(-16)); store.write('memes', usedMemes.slice(-8)); }
  function showSettings(show) { settings.hidden = !show; chat.classList.toggle('settings-open',show); el('stelle-settings-toggle').setAttribute('aria-expanded', String(show)); }
  function open() {
    chat.hidden = false; intro.hidden = true; el('live2d-greet').setAttribute('aria-expanded','true'); input.focus();
  }
  function close() {
    chat.hidden = true; el('live2d-greet').setAttribute('aria-expanded','false'); el('live2d-greet').focus();
  }
  function pageIntro() {
    if (root.dataset.intro) return root.dataset.intro;
    if (location.pathname === '/') return '来了？这里是 Anthony 的个人网站。学习笔记和项目都在这里，随便看看。';
    return `现在看到的是「${root.dataset.pageTitle}」。可以先看看正文，遇到想聊的地方就来找我。`;
  }
  history.forEach(x => add(x.role, x.content));
  if (!history.length) add('assistant', '来了？想聊这页的内容，还是想了解 Anthony？');
  el('live2d-greet').addEventListener('click', () => chat.hidden ? open() : close());
  el('stelle-close').addEventListener('click', close);
  el('stelle-intro-close').addEventListener('click', () => { intro.hidden = true; });
  el('stelle-settings-toggle').addEventListener('click', () => showSettings(settings.hidden));
  el('stelle-mode').addEventListener('change', () => {
    el('stelle-byok').hidden = el('stelle-mode').value !== 'byok';
    el('stelle-invite-fields').hidden = el('stelle-mode').value !== 'invite';
  });
  el('stelle-provider').addEventListener('change', () => { el('stelle-model').value = el('stelle-provider').value === 'qwen' ? 'qwen-plus' : 'deepseek-v4-flash'; });
  async function request(path, body, signal) {
    if (!api) throw new Error('聊天服务尚未配置。页面介绍仍然可以使用。');
    const response = await fetch(api.replace(/\/$/, '') + path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal});
    if (!response.ok) {
      let detail; try { detail = (await response.json()).detail; } catch (_) { /* generic */ }
      throw new Error(typeof detail === 'string' ? detail : '连接暂时不可用，请稍后重试。');
    }
    return response;
  }
  settings.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const button = settings.querySelector('[type=submit]'); button.disabled = true;
    try {
      if (el('stelle-mode').value === 'byok') {
        const key = el('stelle-key').value.trim(), model = el('stelle-model').value.trim();
        if (!key || !model) throw new Error('填写模型名称和 API Key 后就能连接。');
        if (!api) throw new Error('本站聊天服务尚未配置。');
        credential = {mode:'byok', key, model, provider:el('stelle-provider').value};
        store.write('invite-token', null);
        el('stelle-key').value = '';
        status.textContent = '自己的 API · 发送时验证连接';
      } else {
        const response = await request('/api/redeem', {code:el('stelle-invite').value.trim()}, AbortSignal.timeout(15000));
        credential = {mode:'invite', token:(await response.json()).token};
        store.write('invite-token', credential.token);
        el('stelle-invite').value = ''; status.textContent = '邀请码体验已连接';
      }
      showSettings(false); input.focus();
    } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
  });
  function stop() { controller?.abort(); }
  el('stelle-stop').addEventListener('click', stop);
  el('stelle-clear').addEventListener('click', () => {
    stop(); generation++; credential = null; store.write('invite-token',null); history = []; usedMemes = []; save(); log.replaceChildren();
    el('stelle-key').value = ''; el('stelle-invite').value = ''; status.textContent = '会话与凭证已清除';
  });
  async function send(text) {
    if (busy || !text.trim()) return;
    open();
    if (text === '介绍一下这页') { add('assistant', pageIntro()); perform('Smile','nod'); return; }
    if (!credential) { showSettings(true); status.textContent = '先选择一种连接方式'; return; }
    const preceding = history.slice(-12);
    while (preceding.reduce((size,row) => size + row.content.length,0) > 9000) preceding.shift();
    history.push({role:'user',content:text}); add('user',text); input.value = ''; save();
    busy = true; el('stelle-send').hidden = true; el('stelle-stop').hidden = false; showSettings(false);
    controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 90000);
    const thisGeneration = generation;
    status.textContent = '让我想想…'; perform('Thinking','tilt');
    const reply = add('assistant',''); let full = '', pending = '', paragraph = null, completed = false;
    const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 70;
    async function render(text) {
      // Render small increments, separating natural sentences without parsing model HTML.
      for (const char of text) {
        if (controller.signal.aborted) throw new DOMException('Stopped','AbortError');
        if (!paragraph && /\s/.test(char)) { full += char; continue; }
        const follow = nearBottom();
        if (!paragraph) { paragraph = document.createElement('p'); reply.append(paragraph); }
        paragraph.append(document.createTextNode(char)); full += char;
        if (/[。！？\n]/.test(char)) { paragraph = null; await new Promise(r => setTimeout(r, 100)); }
        else await new Promise(r => setTimeout(r, 8));
        if (follow) log.scrollTop = log.scrollHeight;
      }
    }
    try {
      const response = await request('/api/chat', {...credential, message:text, history:preceding, page:location.pathname, used_memes:usedMemes}, controller.signal);
      const reader = response.body.getReader(), decoder = new TextDecoder();
      while (true) {
        const {value,done} = await reader.read(); pending += decoder.decode(value || new Uint8Array(), {stream:!done});
        let index;
        while ((index = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0,index); pending = pending.slice(index+1); if (!line.trim()) continue;
          const item = JSON.parse(line);
          if (item.type === 'text') { status.textContent = '正在回应你'; await render(item.text); }
          if (item.type === 'performance') perform(item.expression,item.motion);
          if (item.type === 'sources') {
            const sources = document.createElement('div'); sources.className = 'stelle-sources';
            if (item.items.length) sources.append(document.createTextNode('参考页面：'));
            for (const source of item.items) {
              if (!source.url.startsWith('/') || source.url.startsWith('//')) continue;
              const link = document.createElement('a'); link.href = source.url; link.textContent = source.title; sources.append(link);
            } reply.append(sources);
          }
          if (item.type === 'memes') usedMemes = [...usedMemes,...item.ids].slice(-8);
          if (item.type === 'error') throw new Error(item.message);
          if (item.type === 'done') completed = true;
        }
        if (done) break;
      }
      if (!completed) throw new Error('连接中断了，已经收到的内容为你保留。');
      status.textContent = '我在，继续说。';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? '已停止' : '暂时没接上';
      if (error.name !== 'AbortError' && generation === thisGeneration) add('notice',error instanceof TypeError ? '暂时连接不上聊天服务，请稍后重试。' : error.message);
      if (!full) reply.remove();
    } finally {
      clearTimeout(timeout); if (full && generation === thisGeneration) history.push({role:'assistant',content:full}); save();
      busy = false; controller = null; el('stelle-send').hidden = false; el('stelle-stop').hidden = true; perform();
    }
  }
  el('stelle-compose').addEventListener('submit', event => { event.preventDefault(); send(input.value.trim()); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(input.value.trim()); } });
  el('stelle-suggestions').addEventListener('click', event => { const button = event.target.closest('[data-prompt]'); if (button) send(button.dataset.prompt); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && !chat.hidden) close(); });
  root.addEventListener('stelle:hide', () => { stop(); chat.hidden = true; intro.hidden = true; el('live2d-greet').setAttribute('aria-expanded','false'); });
  window.addEventListener('pagehide', () => { stop(); credential = null; el('stelle-key').value = ''; el('stelle-invite').value = ''; });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const token = store.read('invite-token',null);
    credential = typeof token === 'string' ? {mode:'invite',token} : null;
    status.textContent = credential ? '邀请码体验 · 凭证已恢复' : '在这里，陪你看看。';
  });
  const auto = el('stelle-auto-intro'); auto.checked = store.read('auto',true);
  auto.addEventListener('change', () => { store.write('auto',auto.checked); if (!auto.checked) intro.hidden = true; });
  function scheduleIntro() {
    clearTimeout(introTimer);
    if (document.hidden) return;
    introTimer = setTimeout(() => {
      const seen = store.read('seen',[]), last = store.read('intro-time',0);
      if (!auto.checked || document.hidden || root.hidden || el('live2d-panel').hidden || busy || !chat.hidden || seen.includes(location.pathname) || Date.now()-last < 60000) return;
      el('live2d-message').textContent = pageIntro(); intro.hidden = false; perform('Smile');
      store.write('seen',[...seen,location.pathname].slice(-100)); store.write('intro-time',Date.now());
      setTimeout(() => { intro.hidden = true; },14000);
    },2500);
  }
  new MutationObserver(scheduleIntro).observe(root,{attributes:true,attributeFilter:['data-state']});
  document.addEventListener('visibilitychange',scheduleIntro); scheduleIntro();
})();
