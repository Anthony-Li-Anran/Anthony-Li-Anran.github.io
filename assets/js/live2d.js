/* Official-editor export, with a single parameter/physics update per frame. */
(() => {
  'use strict';
  const companion = document.getElementById('live2d-companion');
  if (!companion) return;
  const panel = document.getElementById('live2d-panel');
  const host = document.getElementById('live2d-portrait');
  const canvas = document.getElementById('live2d-canvas');
  const message = document.getElementById('live2d-message');
  const show = document.getElementById('live2d-show');
  const hide = document.getElementById('live2d-hide');
  const greet = document.getElementById('live2d-greet');
  const expressionMenu = document.getElementById('live2d-expressions');
  const expressionToggle = document.getElementById('live2d-expressions-toggle');
  const expressionSelect = document.getElementById('live2d-expression');
  const desktop = matchMedia('(min-width: 1024px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'anthony-live2d-hidden';
  const scripts = new Map();
  let app, model, physics, loading = false, active = false;
  const hairParameters = ['ParamHairFront', 'ParamHairSide', 'ParamHairSideR', 'ParamHairBack', 'ParamHairFluffy'];
  let dismissed = reduced.matches;
  let last = 0, blinkStart = -100, messageTimer;
  let expressionData, expressionUntil = 0;
  let expressionTarget = {}, expressionCurrent = {};
  let target = { x: 0, y: 0 }, pointer = { x: 0, y: 0 };
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) dismissed = saved === 'true';
  } catch (_) { /* Storage is optional. */ }

  function remember() {
    try { localStorage.setItem(storageKey, String(dismissed)); } catch (_) { /* Optional. */ }
  }

  function say(text, duration) {
    clearTimeout(messageTimer);
    message.textContent = text;
    message.hidden = false;
    messageTimer = setTimeout(() => { message.hidden = true; }, duration || 4000);
  }

  function setExpression(name, duration = 6000) {
    if (!expressionData || !expressionData.presets[name]) return;
    expressionTarget = { ...expressionData.defaults, ...expressionData.presets[name].values };
    expressionUntil = duration ? performance.now() + duration : Infinity;
    expressionSelect.value = name;
  }

  function fit() {
    if (!model || panel.hidden) return;
    app.renderer.resize(host.clientWidth, host.clientHeight);
    // Same source-space crop as the approved preview: crown to upper chest.
    const scale = host.clientHeight / (5.7 * 80);
    model.scale.set(scale);
    model.position.set(host.clientWidth / 2 - 600 * scale, -.5 * 80 * scale);
  }

  function syncVisibility() {
    companion.hidden = !desktop.matches;
    const visible = desktop.matches && !dismissed && Boolean(model);
    panel.hidden = !visible;
    show.hidden = visible;
    show.setAttribute('aria-expanded', String(visible));
    active = visible && !document.hidden;
    if (app) {
      if (active) {
        last = performance.now() / 1000;
        fit();
        app.start();
      } else {
        app.stop();
        target = { x: 0, y: 0 };
        pointer = { x: 0, y: 0 };
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
        if (error) { script.remove(); reject(error); } else resolve();
      }
      script.src = url;
      script.onload = () => finish();
      script.onerror = () => finish(new Error('Unable to load ' + url));
      document.head.appendChild(script);
    }).catch(error => { scripts.delete(url); throw error; });
    scripts.set(url, pending);
    return pending;
  }

  function blink(elapsed) {
    const smooth = x => x * x * (3 - 2 * x);
    if (elapsed < 0 || elapsed >= .28) return 1;
    if (elapsed < .07) return 1 - smooth(elapsed / .07);
    if (elapsed < .13) return 0;
    return smooth((elapsed - .13) / .15);
  }

  function updateParameters() {
    const t = performance.now() / 1000, dt = Math.max(0, Math.min(.05, t - last));
    last = t;
    const lerp = 1 - Math.exp(-dt * 12);
    pointer.x += (target.x - pointer.x) * lerp;
    pointer.y += (target.y - pointer.y) * lerp;
    if (performance.now() > expressionUntil && expressionSelect.value !== 'Neutral') setExpression('Neutral', 0);
    for (const [id,value] of Object.entries(expressionTarget)) {
      const current = expressionCurrent[id] ?? value;
      expressionCurrent[id] = reduced.matches ? value : current + (value-current) * lerp;
      if (Math.abs(expressionCurrent[id]-value)<.001) expressionCurrent[id]=value;
    }
    const eye = Math.min(blink(t - blinkStart), reduced.matches ? 1 : blink(t % 5.2 - 2));
    const values = {
      ...expressionCurrent,
      ParamEyeLOpen: (expressionCurrent.ParamEyeLOpen ?? 1) * eye,
      ParamEyeROpen: (expressionCurrent.ParamEyeROpen ?? 1) * eye,
      ParamAngleX: reduced.matches ? 0 : pointer.x * 25,
      ParamAngleY: reduced.matches ? 0 : pointer.y * 23,
      ParamAngleZ: reduced.matches ? 0 : -pointer.x * 2.8 + Math.sin(t * .7) * .8,
      ParamEyeBallX: reduced.matches ? 0 : pointer.x,
      ParamEyeBallY: reduced.matches ? 0 : pointer.y,
      ParamBreath: reduced.matches ? 0 : (Math.sin(t * 1.5) + 1) / 2,
      ParamBodyAngleZ: reduced.matches ? 0 : -pointer.x * 1.2 + Math.sin(t * .65) * .4,
      ParamMouthOpenY: expressionCurrent.ParamMouthOpenY || 0
    };
    const core = model.internalModel.coreModel;
    for (const [id, value] of Object.entries(values)) core.setParameterValueById(id, value);
    // The preview and website use the same order: input -> native physics -> mesh.
    if (reduced.matches) {
      for (const id of hairParameters) core.setParameterValueById(id, 0);
    } else if (physics) physics.evaluate(core, dt);
  }

  async function start() {
    if (!desktop.matches || dismissed || loading || model) return;
    loading = true;
    show.disabled = true;
    show.textContent = '看板娘加载中…';
    syncVisibility();
    try {
      const runtime = companion.dataset.runtime;
      await loadScript(runtime + 'pixi.min.js');
      await loadScript(runtime + 'live2dcubismcore.min.js');
      await loadScript(runtime + 'cubism4.min.js');
      window.PIXI.live2d.config.sound = false;
      app = new window.PIXI.Application({
        view: canvas, width: 320, height: 230, backgroundAlpha: 0,
        antialias: true, resolution: Math.min(devicePixelRatio || 1, 2),
        autoDensity: true, autoStart: false
      });
      // Versioned model directory keeps all dependent assets cacheable together.
      model = await window.PIXI.live2d.Live2DModel.from(companion.dataset.model, {
        autoUpdate: false, autoInteract: false, autoHitTest: false, autoFocus: false
      });
      physics = model.internalModel.physics;
      model.internalModel.physics = undefined;
      const expressionUrl = new URL('expressions.json', new URL(companion.dataset.model, location.href));
      const expressionResponse = await fetch(expressionUrl);
      if (!expressionResponse.ok) throw new Error('Unable to load expression definitions');
      expressionData = await expressionResponse.json();
      expressionCurrent = { ...expressionData.defaults };
      expressionSelect.replaceChildren(...Object.entries(expressionData.presets).map(([name,preset]) => {
        const option = document.createElement('option'); option.value = name; option.textContent = preset.label; return option;
      }));
      expressionSelect.disabled = false;
      setExpression('Neutral', 0);
      model.anchor.set(0, 0);
      app.stage.addChild(model);
      model.internalModel.on('beforeModelUpdate', updateParameters);
      // Own the only update loop; hidden companions must stop updating too.
      app.ticker.maxFPS = 30;
      app.ticker.add(() => model.update(app.ticker.deltaMS));
      companion.dataset.state = 'ready';
      show.textContent = '显示看板娘';
    } catch (error) {
      if (app) app.destroy(false, { children: true });
      app = model = physics = undefined;
      companion.dataset.state = 'error';
      show.textContent = '重试看板娘';
      show.title = '加载失败，点击重试';
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
    expressionMenu.hidden = true;
    expressionToggle.setAttribute('aria-expanded','false');
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
    blinkStart = performance.now() / 1000;
    setExpression('Smile');
    say('Anthony，今天从哪里开始开拓？我已经就位了。');
  });
  expressionToggle.addEventListener('click', () => {
    expressionMenu.hidden = !expressionMenu.hidden;
    expressionToggle.setAttribute('aria-expanded', String(!expressionMenu.hidden));
  });
  expressionSelect.addEventListener('change', () => setExpression(expressionSelect.value, 8000));
  companion.addEventListener('keydown', event => {
    if (event.key === 'Escape') { expressionMenu.hidden = true; expressionToggle.setAttribute('aria-expanded','false'); expressionToggle.focus(); }
  });

  function trackAxis(position, origin, extent) {
    const distance = position - origin, room = distance < 0 ? origin : extent - origin;
    return Math.sign(distance) * Math.pow(Math.min(1, Math.abs(distance) / Math.max(32, room)), .65);
  }
  document.addEventListener('pointermove', event => {
    if (!active || reduced.matches) return;
    const box = host.getBoundingClientRect();
    target = {
      x: trackAxis(event.clientX, box.left + box.width / 2, document.documentElement.clientWidth),
      y: -trackAxis(event.clientY, box.top + box.height * .35, innerHeight)
    };
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { target = { x: 0, y: 0 }; });
  new ResizeObserver(fit).observe(host);
  desktop.addEventListener('change', () => { syncVisibility(); start(); });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { dismissed = true; message.hidden = true; }
    syncVisibility();
  });
  document.addEventListener('visibilitychange', syncVisibility);

  function schedule() {
    syncVisibility();
    if (!desktop.matches || dismissed) return;
    if ('requestIdleCallback' in window) requestIdleCallback(() => start(), { timeout: 2000 });
    else setTimeout(start, 1000);
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
