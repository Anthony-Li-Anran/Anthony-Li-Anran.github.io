/* Official-editor export, with a single parameter/physics update per frame. */
(() => {
  'use strict';
  const companion = document.getElementById('live2d-companion');
  if (!companion) return;
  const panel = document.getElementById('live2d-panel');
  const host = document.getElementById('live2d-portrait');
  const canvas = document.getElementById('live2d-canvas');
  const show = document.getElementById('live2d-show');
  const hide = document.getElementById('live2d-hide');
  const greet = document.getElementById('live2d-greet');
  const hat = document.getElementById('stelle-birthday-hat');
  const retry = document.getElementById('live2d-retry');


  let expressionName = 'Neutral', gesture = 'none', gestureStart = 0;
  let talkLevel = 0, talking = false, speechLevel = null, idleTimer = 0;
  const desktop = matchMedia('(min-width: 1024px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'anthony-live2d-hidden';
  const scripts = new Map();
  let app, model, physics, loading = false, active = false;
  const hairParameters = ['ParamHairFront', 'ParamHairSide', 'ParamHairSideR', 'ParamHairBack', 'ParamHairFluffy'];
  let dismissed = reduced.matches;
  let mobileExpanded = false;
  let last = 0, blinkStart = -100;
  let expressionData, expressionUntil = 0;
  let expressionTarget = {}, expressionCurrent = {};
  let lastTap = 0, lastTapName = '';
  let target = { x: 0, y: 0 }, pointer = { x: 0, y: 0 };
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) dismissed = saved === 'true';
  } catch (_) { /* Storage is optional. */ }

  function remember() {
    try { localStorage.setItem(storageKey, String(dismissed)); } catch (_) { /* Optional. */ }
  }

  function setExpression(name, duration = 6000) {
    if (!expressionData || !expressionData.presets[name]) return;
    expressionTarget = { ...expressionData.defaults, ...expressionData.presets[name].values };
    expressionUntil = duration ? performance.now() + duration : Infinity;
    expressionName = name;
    companion.dataset.expression = name;
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
    companion.hidden = false;
    const visible = !dismissed && (desktop.matches || mobileExpanded);
    panel.hidden = !visible;
    show.hidden = visible;
    show.setAttribute('aria-expanded', String(visible));
    active = visible && Boolean(model) && !document.hidden;
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

  async function whenLive2D() {
    // The display bundle attaches Live2DModel asynchronously after script eval.
    for (let i = 0; i < 100; i++) {
      if (window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Live2D runtime did not finish registering');
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
    // Mouth opens in a speech-like rhythm while text is being typed out.
    const mouthOsc = reduced.matches ? 0 : speechLevel !== null ? speechLevel : talking ? Math.max(0, Math.sin(t * 9.2 + Math.sin(t * 2.7) * 1.5)) * (.5 + .35 * Math.sin(t * 3.1 + 1)) : 0;
    talkLevel += (mouthOsc - talkLevel) * (1 - Math.exp(-dt * (speechLevel !== null ? 28 : talking ? 30 : 10)));
    if (performance.now() > expressionUntil && expressionName !== 'Neutral') setExpression('Neutral', 0);
    for (const [id,value] of Object.entries(expressionTarget)) {
      const current = expressionCurrent[id] ?? value;
      expressionCurrent[id] = reduced.matches ? value : current + (value-current) * lerp;
      if (Math.abs(expressionCurrent[id]-value)<.001) expressionCurrent[id]=value;
    }
    const eye = Math.min(blink(t - blinkStart), reduced.matches ? 1 : blink(t % 5.2 - 2));
    const age = t - gestureStart;
    const nod = gesture === 'nod' && age < 1.2 ? Math.sin(age / 1.2 * Math.PI * 2) * Math.sin(age / 1.2 * Math.PI) * 6 : 0;
    const tilt = gesture === 'tilt' && age < 2 ? Math.sin(age / 2 * Math.PI) * 5 : 0;
    const values = {
      ...expressionCurrent,
      ParamEyeLOpen: (expressionCurrent.ParamEyeLOpen ?? 1) * eye,
      ParamEyeROpen: (expressionCurrent.ParamEyeROpen ?? 1) * eye,
      ParamAngleX: reduced.matches ? 0 : pointer.x * 25,
      ParamAngleY: reduced.matches ? 0 : pointer.y * 23 + nod,
      ParamAngleZ: reduced.matches ? 0 : -pointer.x * 2.8 + Math.sin(t * .7) * .8 + tilt,
      ParamEyeBallX: reduced.matches ? 0 : pointer.x,
      ParamEyeBallY: reduced.matches ? 0 : pointer.y,
      ParamBreath: reduced.matches ? 0 : (Math.sin(t * 1.5) + 1) / 2,
      ParamBodyAngleZ: reduced.matches ? 0 : -pointer.x * 1.2 + Math.sin(t * .65) * .4,
      ParamMouthOpenY: speechLevel !== null ? talkLevel * .9 : Math.max(expressionCurrent.ParamMouthOpenY || 0, talkLevel * .9)
    };
    const core = model.internalModel.coreModel;
    for (const [id, value] of Object.entries(values)) core.setParameterValueById(id, value);
    if (hat && !hat.hidden) {
      const scale = host.clientHeight / 230;
      hat.style.transform = `translate(calc(-50% + ${values.ParamAngleX * .22 * scale}px), ${-values.ParamAngleY * .12 * scale}px) rotate(${-10 - values.ParamAngleZ * .6}deg)`;
    }
    // The preview and website use the same order: input -> native physics -> mesh.
    if (reduced.matches) {
      for (const id of hairParameters) core.setParameterValueById(id, 0);
    } else if (physics) physics.evaluate(core, dt);
  }

  async function start() {
    if (dismissed || (!desktop.matches && !mobileExpanded) || loading || model) return;
    loading = true;
    companion.dataset.state = 'loading';
    retry.hidden = true;
    syncVisibility();
    try {
      const runtime = companion.dataset.runtime;
      // pixi and the Cubism core are independent and load in parallel; cubism4
      // checks both globals at eval time to register Live2DModel, so it must run last.
      const modelWarm = fetch(companion.dataset.model, { credentials: 'omit' }).then(response => response.ok ? null : null).catch(() => null);
      await Promise.all([runtime + 'pixi.min.js', runtime + 'live2dcubismcore.min.js'].map(loadScript));
      await loadScript(runtime + 'cubism4.min.js');
      await whenLive2D();
      await modelWarm;
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

      setExpression('Neutral', 0);
      model.anchor.set(0, 0);
      app.stage.addChild(model);
      model.internalModel.on('beforeModelUpdate', updateParameters);
      // Own the only update loop; hidden companions must stop updating too.
      app.ticker.maxFPS = 30;
      app.ticker.add(() => model.update(app.ticker.deltaMS));
      companion.dataset.state = 'ready';
      show.textContent = '✦ 看板娘';
      scheduleIdle();
    } catch (error) {
      if (app) app.destroy(false, { children: true });
      app = model = physics = undefined;
      companion.dataset.state = 'error';
      retry.hidden = false;
      show.textContent = '✦ 看板娘';
      console.warn('[Live2D] Companion could not load:', error);
    } finally {
      loading = false;
      show.disabled = false;
      syncVisibility();
    }
  }

  hide.addEventListener('click', () => {
    dismissed = true;
    mobileExpanded = false;
    remember();
    companion.dispatchEvent(new CustomEvent('stelle:hide'));
    syncVisibility();
    show.focus();
  });
  show.addEventListener('click', async () => {
    dismissed = false;
    mobileExpanded = true;
    remember();
    show.removeAttribute('title');
    syncVisibility();
    companion.dispatchEvent(new CustomEvent('stelle:open'));
    start();
  });
  retry.addEventListener('click', start);
  companion.addEventListener('stelle:perform', event => {
    const intent = event.detail || {};
    setExpression(intent.expression || 'Neutral', Math.min(18000, Math.max(500, intent.duration || 4500)));
    gesture = ['nod', 'tilt'].includes(intent.motion) ? intent.motion : 'none';
    gestureStart = performance.now() / 1000;
  });
  companion.addEventListener('stelle:talk', event => {
    talking = Boolean(event.detail?.active);
    speechLevel = Number.isFinite(event.detail?.level) ? Math.max(0, Math.min(1,event.detail.level)) : null;
  });
  function onTap() {
    if (!model || reduced.matches || companion.dataset.busy === 'true' || companion.dataset.birthdayOpen === 'true') return;
    const now = performance.now();
    if (now - lastTap < 500) return;
    lastTap = now;
    const pool = ['Question', 'Happy', 'Shy'].filter(name => name !== lastTapName);
    const picked = pool[Math.floor(Math.random() * pool.length)];
    lastTapName = picked;
    setExpression(picked, 1800);
  }
  host.addEventListener('click', onTap);
  host.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTap(); }
  });

  function scheduleIdle() {
    // Restrained idle life between conversations: small expressions, occasional drift.
    clearTimeout(idleTimer);
    idleTimer = setTimeout(idleMoment, 18000 + Math.random() * 24000);
  }
  function idleMoment() {
    scheduleIdle();
    if (!active || reduced.matches || dismissed || companion.dataset.birthdayOpen === 'true' || companion.dataset.busy === 'true' || (expressionName !== 'Neutral' && performance.now() < expressionUntil)) return;
    const chatEl = document.getElementById('stelle-chat');
    if (!chatEl || !chatEl.hidden) return;
    const roll = Math.random();
    if (roll < .45) setExpression('Smile', 2600 + Math.random() * 1800);
    else if (roll < .7) { gesture = 'tilt'; gestureStart = performance.now() / 1000; }
    else if (roll < .85) setExpression('SoftEyes', 3000 + Math.random() * 2000);
    else {
      target = { x: (Math.random() * 2 - 1) * .45, y: (Math.random() * 2 - 1) * .3 };
      setTimeout(() => { if (!talking) target = { x: 0, y: 0 }; }, 1400 + Math.random() * 1200);
    }
  }

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
    if (reduced.matches) { dismissed = true; companion.dispatchEvent(new CustomEvent('stelle:hide')); }
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
