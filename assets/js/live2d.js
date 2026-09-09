/* A static-site companion using PixiJS 6 and native Cubism 4 keyforms. */
(() => {
  'use strict';

  const companion = document.getElementById('live2d-companion');
  if (!companion) return;

  const panel = document.getElementById('live2d-panel');
  const canvas = document.getElementById('live2d-canvas');
  const message = document.getElementById('live2d-message');
  const show = document.getElementById('live2d-show');
  const hide = document.getElementById('live2d-hide');
  const greet = document.getElementById('live2d-greet');
  const more = document.getElementById('live2d-more');
  const options = document.getElementById('live2d-options');
  const expression = document.getElementById('live2d-expression');
  const glasses = document.getElementById('live2d-glasses');
  const ears = document.getElementById('live2d-ears');
  const desktop = window.matchMedia('(min-width: 1024px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'anthony-live2d-hidden';
  const scripts = new Map();
  let app;
  let model;
  let loading = false;
  let dismissed = reducedMotion.matches;
  let messageTimer;
  let greetingIndex = 0;
  let idleTimer;
  let expressionTimer;
  let expressionVersion = 0;
  let active = false;
  let glassesOn = false;
  let earsOn = false;

  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!active || reducedMotion.matches) return;
    idleTimer = setTimeout(() => {
      if (active && model.internalModel.motionManager.isFinished()) {
        model.motion('Tap', Math.floor(Math.random() * 3)).catch(() => {});
      }
      scheduleIdle();
    }, 16000 + Math.random() * 8000);
  }

  async function setExpression(index) {
    if (!model) return;
    clearTimeout(expressionTimer);
    const version = ++expressionVersion;
    expression.value = String(index);
    try {
      await model.expression('expression' + (index === 0 ? '00' : index) + '.exp3');
      if (version !== expressionVersion) return;
      if (index !== 0) expressionTimer = setTimeout(() => setExpression(0), 6000);
    } catch (_) { expression.value = '0'; }
    scheduleIdle();
  }

  function toggleAccessory(kind) {
    if (kind === 'glasses') {
      glassesOn = !glassesOn;
      glasses.setAttribute('aria-pressed', String(glassesOn));
      say(glassesOn ? '戴上墨镜，是不是有点酷？' : '这样就能看清你啦。');
    } else {
      earsOn = !earsOn;
      ears.setAttribute('aria-pressed', String(earsOn));
      say(earsOn ? '今天是猫耳流萤。' : '恢复原来的样子啦。');
    }
    scheduleIdle();
  }

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) dismissed = saved === 'true';
  } catch (_) { /* The companion also works when browser storage is blocked. */ }

  function remember() {
    try { localStorage.setItem(storageKey, String(dismissed)); } catch (_) { /* Optional. */ }
  }

  function say(text) {
    clearTimeout(messageTimer);
    message.textContent = text;
    message.hidden = false;
    messageTimer = setTimeout(() => { message.hidden = true; }, 6000);
  }

  function syncVisibility() {
    companion.hidden = !desktop.matches;
    const visible = desktop.matches && !dismissed && Boolean(model);
    panel.hidden = !visible;
    show.hidden = visible;
    show.setAttribute('aria-expanded', String(visible));
    const wasActive = active;
    active = visible && !document.hidden;
    if (app) {
      if (active) app.start();
      else app.stop();
    }
    if (active !== wasActive) {
      if (active) scheduleIdle();
      else {
        clearTimeout(idleTimer);
        clearTimeout(expressionTimer);
        if (expression.value !== '0') setExpression(0);
      }
    }
  }

  function loadScript(url) {
    if (scripts.has(url)) return scripts.get(url);
    const pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('Live2D script timed out')), 20000);
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) {
          script.remove();
          reject(error);
        } else resolve();
      }
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.onload = () => finish();
      script.onerror = () => finish(new Error('Unable to load ' + url));
      document.head.appendChild(script);
    }).catch(error => {
      scripts.delete(url);
      throw error;
    });
    scripts.set(url, pending);
    return pending;
  }

  async function start() {
    if (!desktop.matches || dismissed || loading || model) return;
    loading = true;
    show.disabled = true;
    show.textContent = '看板娘加载中…';
    syncVisibility();
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js');
      await loadScript(companion.dataset.core);
      await loadScript('https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js');
      window.PIXI.live2d.config.sound = false;
      app = new window.PIXI.Application({
        view: canvas,
        width: 220,
        height: 300,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false
      });
      // Own the update loop so hiding the companion actually stops its animation.
      model = await window.PIXI.live2d.Live2DModel.from(companion.dataset.model, {
        autoUpdate: false,
        autoInteract: false
      });
      model.scale.set(Math.min(210 / model.width, 290 / model.height));
      model.anchor.set(0.5, 1);
      model.position.set(110, 300);
      app.stage.addChild(model);
      // Keep accessory toggles independent of facial expressions and idle motions.
      model.internalModel.on('beforeModelUpdate', () => {
        const core = model.internalModel.coreModel;
        core.setParameterValueById('Param', glassesOn ? 1 : 0);
        core.setParameterValueById('Param40', earsOn ? 1 : 0);
      });
      await setExpression(0);
      app.ticker.maxFPS = 30;
      app.ticker.add(() => model.update(app.ticker.deltaMS));
      say(location.pathname.includes('/learning/')
        ? '今天也一起学习吧！需要专心时，可以把我隐藏起来。'
        : '你好，我是流萤。欢迎来到 Anthony 的主页！');
      show.textContent = '显示看板娘';
    } catch (error) {
      if (app) app.destroy(false, { children: true });
      app = undefined;
      model = undefined;
      show.textContent = '重试看板娘';
      show.title = '加载失败，请检查网络后重试';
      console.warn('[Live2D] Companion could not load:', error);
    } finally {
      loading = false;
      show.disabled = false;
      syncVisibility();
    }
  }

  hide.addEventListener('click', () => {
    dismissed = true;
    remember();
    clearTimeout(messageTimer);
    message.hidden = true;
    options.hidden = true;
    more.setAttribute('aria-expanded', 'false');
    syncVisibility();
    show.focus();
  });

  show.addEventListener('click', async () => {
    dismissed = false;
    remember();
    show.removeAttribute('title');
    await start();
    syncVisibility();
    if (!panel.hidden) greet.focus();
  });

  greet.addEventListener('click', () => {
    const greetings = [
      '很高兴见到你！可以去 Learning 看看最近的学习笔记。',
      '学累了就休息一下，喝口水再继续吧。',
      '想了解 Anthony 在做什么？可以看看 Projects！'
    ];
    say(greetings[greetingIndex++ % greetings.length]);
    if (model && !reducedMotion.matches) model.motion('Tap', (greetingIndex - 1) % 3, 3).catch(() => {});
    scheduleIdle();
  });

  more.addEventListener('click', () => {
    options.hidden = !options.hidden;
    more.setAttribute('aria-expanded', String(!options.hidden));
  });
  expression.addEventListener('change', () => setExpression(Number(expression.value)));
  glasses.addEventListener('click', () => toggleAccessory('glasses'));
  ears.addEventListener('click', () => toggleAccessory('ears'));
  companion.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !options.hidden) {
      options.hidden = true;
      more.setAttribute('aria-expanded', 'false');
      more.focus();
    }
  });

  function hitsAt(event) {
    const bounds = canvas.getBoundingClientRect();
    return model.hitTest(event.clientX - bounds.left, event.clientY - bounds.top);
  }
  canvas.addEventListener('click', event => {
    if (!active) return;
    const hits = hitsAt(event);
    if (hits.includes('刘海')) toggleAccessory('glasses');
    else if (hits.includes('右侧后发')) toggleAccessory('ears');
  });

  window.addEventListener('pointermove', event => {
    if (!active) return;
    const bounds = canvas.getBoundingClientRect();
    if (!reducedMotion.matches) model.focus(event.clientX - bounds.left, event.clientY - bounds.top);
    // Only the named accessory regions intercept clicks; the rest stays transparent.
    const hits = hitsAt(event);
    const interactive = hits.includes('刘海') || hits.includes('右侧后发');
    canvas.style.pointerEvents = interactive ? 'auto' : 'none';
    canvas.style.cursor = interactive ? 'pointer' : '';
  }, { passive: true });

  desktop.addEventListener('change', () => { syncVisibility(); start(); });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      dismissed = true;
      syncVisibility();
    }
  });
  document.addEventListener('visibilitychange', syncVisibility);

  function schedule() {
    if (!desktop.matches) return;
    syncVisibility();
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => start(), { timeout: 2000 });
    else setTimeout(start, 1000);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
