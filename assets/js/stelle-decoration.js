/* Decorative Q版星: one native Spine animation, no interaction or controls. */
(() => {
  const container = document.getElementById('stelle-decoration');
  if (!container) return;
  const desktop = matchMedia('(min-width: 1024px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let player;
  let loading = false;
  let visible = true;
  function sync() {
    if (!player) return;
    if (desktop.matches && visible && !document.hidden && !reducedMotion.matches) player.play();
    else player.pause();
  }
  function start() {
    if (!desktop.matches || loading || player) return;
    loading = true;
    const script = document.createElement('script');
    script.src = container.dataset.runtime;
    script.onload = () => {
      try {
        new spine.SpinePlayer(container, {
          skeleton: container.dataset.model,
          atlas: container.dataset.atlas,
          animation: 'animation2',
          alpha: true,
          backgroundColor: '#00000000',
          showControls: false,
          interactive: false,
          premultipliedAlpha: false,
          viewport: { padLeft: '5%', padRight: '5%', padTop: '5%', padBottom: '5%' },
          success: (instance) => {
            player = instance;
            container.dataset.loaded = 'true';
            sync();
          },
          error: () => { container.hidden = true; }
        });
      } catch (_) { container.hidden = true; }
    };
    script.onerror = () => { container.hidden = true; };
    document.head.appendChild(script);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(container);
  }
  desktop.addEventListener('change', () => { start(); sync(); });
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 0);
})();
