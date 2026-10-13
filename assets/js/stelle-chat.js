/* Text-only conversation UI. Optional credentials stay in this tab's session storage. */
(() => {
  'use strict';
  const root = document.getElementById('live2d-companion');
  if (!root) return;
  const el = id => document.getElementById(id);
  const chat = el('stelle-chat'), log = el('stelle-messages'), input = el('stelle-input');
  const settings = el('stelle-settings'), status = el('stelle-status'), intro = el('stelle-intro');
  const store = {
    read(key, fallback) { try { return JSON.parse(sessionStorage.getItem('stelle-' + key)) ?? fallback; } catch (_) { return fallback; } },
    write(key, value) { try { sessionStorage.setItem('stelle-' + key, JSON.stringify(value)); return true; } catch (_) { return false; } },
    remove(key) { try { sessionStorage.removeItem('stelle-' + key); } catch (_) { /* optional */ } }
  };
  const savedHistory = store.read('history', []);
  let history = (Array.isArray(savedHistory) ? savedHistory : []).filter(x => x && ['user','assistant'].includes(x.role) && typeof x.content === 'string').slice(-16);
  // Retire old invitation credentials; this build has no owner-funded route.
  try { sessionStorage.removeItem('stelle-invite-token'); } catch (_) { /* optional */ }
  const validCredential = value => value && Object.hasOwn(window.StelleDirect.providers,value.provider) &&
    typeof value.model === 'string' && /^[A-Za-z0-9._:/-]{1,80}$/.test(value.model) &&
    typeof value.key === 'string' && value.key.length >= 8 && value.key.length <= 512 && !/[\r\n]/.test(value.key);
  const remembered = store.read('credential',null);
  let credential = validCredential(remembered) ? remembered : null;
  let controller = null, busy = false, introTimer, generation = 0;
  const actor = window.StellePerformance.create(root);
  const modeSwitch = el('stelle-classic-mode');
  function setMode(classic) {
    root.dataset.chatMode = classic ? 'classic' : 'immersive';
    modeSwitch.checked = classic;
    const controls = chat.querySelector(classic ? '.stelle-header' : '.stelle-mode-control');
    controls.append(el('stelle-settings-toggle'),el('stelle-close'));
    el('stelle-mode-label').textContent = classic ? '经典模式' : '沉浸模式';
    log.setAttribute('aria-label',classic ? '对话记录' : '星当前说的话');
    store.write('classic-mode',classic);
    log.scrollTop = log.scrollHeight;
  }
  setMode(store.read('classic-mode',false) === true);
  modeSwitch.addEventListener('change', () => setMode(modeSwitch.checked));
  function syncState() {
    root.dataset.busy = String(busy);
    root.dataset.chatOpen = String(!chat.hidden);
    el('stelle-send').hidden = busy; el('stelle-stop').hidden = !busy;
    el('stelle-suggestions').querySelectorAll('button').forEach(button => { button.disabled = busy; });
    root.dispatchEvent(new CustomEvent('stelle:chatstate'));
  }
  const savedMemes = store.read('memes', []);
  let usedMemes = (Array.isArray(savedMemes) ? savedMemes : []).filter(x => typeof x === 'string').slice(-8);
  const rememberKey = el('stelle-remember-key');
  rememberKey.checked = store.read('remember-key',true) !== false;
  if (!rememberKey.checked) store.remove('credential');
  if (credential) {
    el('stelle-provider').value = credential.provider;
    el('stelle-model').value = credential.model;
    status.textContent = '用自己的 Key · 已连接';
  }
  const perform = (expression = 'Neutral', motion = 'none') => root.dispatchEvent(new CustomEvent('stelle:perform', {detail:{expression,motion}}));
  function add(role, text) {
    if (role !== 'notice') log.querySelectorAll('[data-current]').forEach(node => node.removeAttribute('data-current'));
    const node = document.createElement('div'); node.className = 'stelle-message'; node.dataset.role = role;
    if (role !== 'user') node.dataset.current = 'true';
    node.textContent = text; log.append(node); log.scrollTop = log.scrollHeight; return node;
  }
  function save() { store.write('history', history.slice(-16)); store.write('memes', usedMemes.slice(-8)); }
  function showSettings(show) { settings.hidden = !show; chat.classList.toggle('settings-open',show); el('stelle-settings-toggle').setAttribute('aria-expanded', String(show)); }
  function open() {
    chat.hidden = false; intro.hidden = true; el('live2d-greet').setAttribute('aria-expanded','true'); input.focus();
    syncState();
  }
  function close() {
    chat.hidden = true; el('live2d-greet').setAttribute('aria-expanded','false'); el('live2d-greet').focus();
    syncState();
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
  el('stelle-provider').addEventListener('change', () => { el('stelle-model').value = el('stelle-provider').value === 'qwen' ? 'qwen-plus' : 'deepseek-v4-flash'; });
  rememberKey.addEventListener('change', () => {
    store.write('remember-key',rememberKey.checked);
    if (rememberKey.checked && credential) store.write('credential',credential);
    else store.remove('credential');
  });
  settings.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const button = settings.querySelector('[type=submit]'); button.disabled = true;
    try {
      const provider = el('stelle-provider').value, model = el('stelle-model').value.trim();
      const entered = el('stelle-key').value.trim();
      const key = entered || (credential?.provider === provider ? credential.key : '');
      if (!key) {
        // Empty key = back to the free cloud channel.
        credential = null; store.remove('credential'); el('stelle-key').value = '';
        status.textContent = '免费通道 · 直接开聊';
        showSettings(false); input.focus(); return;
      }
      if (key.length < 8 || key.length > 512 || /[\r\n]/.test(key) || !/^[A-Za-z0-9._:/-]{1,80}$/.test(model)) throw new Error('请填写有效的模型名称和 API Key。');
      credential = {key, model, provider};
      store.write('remember-key',rememberKey.checked);
      if (rememberKey.checked) store.write('credential',credential); else store.remove('credential');
      el('stelle-key').value = '';
      status.textContent = rememberKey.checked ? '用自己的 Key · 本标签页已记住' : '用自己的 Key · 当前页面已连接';
      showSettings(false); input.focus();
    } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
  });
  function stop() { controller?.abort(); actor.cancel(); }
  el('stelle-use-cloud').addEventListener('click', () => {
    stop(); credential = null; store.remove('credential'); el('stelle-key').value = '';
    status.textContent = '免费通道 · 直接开聊'; showSettings(false);
  });
  el('stelle-stop').addEventListener('click', stop);
  el('stelle-clear').addEventListener('click', () => {
    stop(); generation++; credential = null; store.remove('credential'); history = []; usedMemes = []; save(); log.replaceChildren();
    el('stelle-key').value = ''; status.textContent = '会话与凭证已清除';
    busy = false; controller = null; syncState();
    root.dispatchEvent(new CustomEvent('stelle:talk', {detail:{active:false}}));
    if (root.dataset.birthdayOpen !== 'true') perform();
  });
  async function localUpdates(message, signal) {
    // Offline fallback for the "他的近况" suggestion when the cloud route is unreachable.
    try {
      const response = await fetch(root.dataset.context, { credentials: 'omit', signal });
      if (!response.ok) return null;
      const data = await response.json();
      const result = window.StelleDirect.recent(message, history, data.updates);
      if (result.status === 'query_failed' || result.status === 'not_requested') return null;
      if (!result.records.length) return '最近七天没有相关新记录——他可能又把「更新近况」这个支线任务忘了。';
      return '公开近况里写着：' + result.records.map(row => row.text).join('；');
    } catch (_) { return null; }
  }
  async function send(text) {
    if (busy || !text.trim()) return;
    open();
    if (text === '介绍一下这页') { add('assistant', pageIntro()); perform('Smile','nod'); return; }
    const preceding = history.slice(-12);
    while (preceding.reduce((size,row) => size + row.content.length,0) > 9000) preceding.shift();
    history.push({role:'user',content:text}); add('user',text); input.value = ''; save();
    busy = true; syncState(); showSettings(false);
    const requestController = new AbortController(); controller = requestController;
    let timedOut = false;
    const armTimeout = () => setTimeout(() => { timedOut = true; requestController.abort(); }, 60000);
    let timeout = armTimeout();
    const thisGeneration = ++generation;
    const current = () => thisGeneration === generation;
    const usingOwnKey = Boolean(credential);
    const acting = actor.begin(text, requestController.signal);
    status.textContent = '让我想想…';
    const reply = add('assistant',''); let full = '', paragraph = null, completed = false;
    const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 70;
    function render(text) {
      // Append text on the same beat that drives the mouth.
      for (const char of text) {
        if (requestController.signal.aborted || !current()) throw new DOMException('Stopped','AbortError');
        if (!paragraph && /\s/.test(char)) { full += char; continue; }
        const follow = nearBottom();
        if (!paragraph) { paragraph = document.createElement('p'); reply.append(paragraph); }
        paragraph.append(document.createTextNode(char)); full += char;
        if (/[。！？\n]/.test(char)) paragraph = null;
        if (follow) log.scrollTop = log.scrollHeight;
      }
    }
    try {
      const request = {message:text,history:preceding,page:location.pathname,usedMemes,
        knowledgeURL:root.dataset.knowledge,contextURL:root.dataset.context,signal:requestController.signal};
      const transport = credential ? window.StelleDirect.stream({credential,...request}) : window.StelleCloud.stream(request);
      for await (const item of transport) {
          if (!current()) throw new DOMException('Stopped','AbortError');
          requestController.signal.throwIfAborted();
          if (item.type === 'text') {
            await acting.ready();
            requestController.signal.throwIfAborted();
            if (!current()) throw new DOMException('Stopped','AbortError');
            status.textContent = '正在回应你';
            clearTimeout(timeout);
            await acting.text(item.text,render);
            requestController.signal.throwIfAborted();
            timeout = armTimeout();
          }
          if (item.type === 'performance') acting.expression(item);
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
      if (!completed) throw new Error('连接中断了，已经收到的内容为你保留。');
      clearTimeout(timeout);
      await acting.finish();
      requestController.signal.throwIfAborted();
      if (current()) status.textContent = '我在，继续说。';
    } catch (error) {
      if (!current()) return;
      acting.cancel();
      status.textContent = timedOut ? '等待超时了，可以重试' : requestController.signal.aborted ? '已停止' : '暂时没接上';
      if (!requestController.signal.aborted) add('notice', error.message);
      if (!requestController.signal.aborted && !usingOwnKey && !full && /最近|近况|在忙/.test(text)) {
        const local = await localUpdates(text, requestController.signal);
        if (local && current() && !requestController.signal.aborted) {
          add('assistant', local); history.push({role:'assistant',content:local});
          if (root.dataset.birthdayOpen !== 'true') perform('Smile','tilt');
        }
      }
      if (!full) reply.remove();
    } finally {
      clearTimeout(timeout);
      if (current()) {
        acting.cancel();
        if (full) history.push({role:'assistant',content:full}); save();
        busy = false; controller = null; syncState();
        if (root.dataset.birthdayOpen !== 'true') perform();
      }
    }
  }
  el('stelle-compose').addEventListener('submit', event => { event.preventDefault(); send(input.value.trim()); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(input.value.trim()); } });
  el('stelle-suggestions').addEventListener('click', event => { const button = event.target.closest('[data-prompt]'); if (button) send(button.dataset.prompt); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && !chat.hidden) close(); });
  root.addEventListener('stelle:hide', () => { stop(); chat.hidden = true; intro.hidden = true; el('live2d-greet').setAttribute('aria-expanded','false'); syncState(); });
  root.addEventListener('stelle:open', open);
  window.addEventListener('pagehide', () => { stop(); if (!rememberKey.checked) credential = null; el('stelle-key').value = ''; });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const saved = store.read('credential',null);
    credential = validCredential(saved) ? saved : null;
    status.textContent = credential ? '用自己的 Key · 已连接' : '在这里，随时能聊。';
  });
  const auto = el('stelle-auto-intro'); auto.checked = store.read('auto',true);
  auto.addEventListener('change', () => { store.write('auto',auto.checked); if (!auto.checked) intro.hidden = true; });
  function scheduleIntro() {
    clearTimeout(introTimer);
    if (document.hidden) return;
    introTimer = setTimeout(() => {
      const seen = store.read('seen',[]), last = store.read('intro-time',0);
      if (!auto.checked || document.hidden || root.hidden || el('live2d-panel').hidden || busy || !chat.hidden || root.dataset.birthdayOpen === 'true' || seen.includes(location.pathname) || Date.now()-last < 60000) return;
      el('live2d-message').textContent = pageIntro(); intro.hidden = false; perform('Smile');
      store.write('seen',[...seen,location.pathname].slice(-100)); store.write('intro-time',Date.now());
      setTimeout(() => { intro.hidden = true; },14000);
    },2500);
  }
  new MutationObserver(scheduleIntro).observe(root,{attributes:true,attributeFilter:['data-state']});
  document.addEventListener('visibilitychange',scheduleIntro); scheduleIntro();
  function viewport() {
    const v = window.visualViewport;
    root.dataset.compactViewport = String((v?.height || innerHeight) < 500);
    root.style.setProperty('--stelle-vh', (v?.height || innerHeight) + 'px');
    root.style.setProperty('--stelle-keyboard', Math.max(0,innerHeight-(v?.height || innerHeight)-(v?.offsetTop || 0)) + 'px');
  }
  window.visualViewport?.addEventListener('resize',viewport);
  window.visualViewport?.addEventListener('scroll',viewport);
  window.addEventListener('resize',viewport); viewport(); syncState();
})();
