/* Recurring birthday event: every Oct 14 (Shanghai time). Greeting, effects and wishes work without AI. */
(() => {
  'use strict';
  const dialog = document.getElementById('birthday-dialog');
  if (!dialog) return;
  const root = document.getElementById('live2d-companion');
  const launcher = document.getElementById('birthday-launcher');
  const hat = document.getElementById('stelle-birthday-hat');
  const wish = document.getElementById('birthday-wish');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const BIRTHDAY_MD = '10-14';
  const preview = new URLSearchParams(location.search).get('birthday') === '1';
  const dateInShanghai = () => new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date()).reduce((parts, part) => (parts[part.type] = part.value, parts), {});
  function today() { const p = dateInShanghai(); return `${p.year}-${p.month}-${p.day}`; }
  function eventDate() { const p = dateInShanghai(); return `${p.year}-${BIRTHDAY_MD}`; }
  function seenKey() { return `anthony-birthday-${dateInShanghai().year}-seen`; }
  let seenHere = false, autoTimer, previousFocus, effects, loadingEffects;
  let savedOverflow = '', lastBurst = 0;
  function seen() {
    if (seenHere) return true;
    try { if (localStorage.getItem(seenKey())) return true; } catch (_) { /* session fallback */ }
    try { return Boolean(sessionStorage.getItem(seenKey())); } catch (_) { return false; }
  }
  function markSeen() {
    seenHere = true;
    if (preview) return;
    try { localStorage.setItem(seenKey(),'1'); } catch (_) { /* session fallback */ }
    try { sessionStorage.setItem(seenKey(),'1'); } catch (_) { /* current page still remembers */ }
  }
  function perform(expression, motion='none') {
    root?.dispatchEvent(new CustomEvent('stelle:perform',{detail:{expression,motion,duration:3200}}));
  }
  function loadEffects() {
    if (effects) return Promise.resolve(effects);
    if (loadingEffects) return loadingEffects;
    loadingEffects = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(Error('Confetti load timeout')),8000);
      function finish(error) {
        clearTimeout(timer); script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); return; }
        effects = window.confetti.create(document.getElementById('birthday-confetti'), {resize:true, useWorker:false});
        resolve(effects);
      }
      script.src = dialog.dataset.confetti;
      script.onload = () => finish(typeof window.confetti === 'function' ? null : Error('Confetti unavailable'));
      script.onerror = () => finish(Error('Confetti unavailable'));
      document.head.appendChild(script);
    }).catch(error => { loadingEffects = null; throw error; });
    return loadingEffects;
  }
  async function burst(large=false) {
    if (reduced.matches || !dialog.open) return;
    const token = ++lastBurst;
    try {
      const fire = await loadEffects();
      if (!dialog.open || reduced.matches || token !== lastBurst) return;
      const options = {particleCount:large?68:35,spread:65,startVelocity:large?42:30,
        gravity:1.1,decay:.93,ticks:160,scalar:.95,disableForReducedMotion:true,
        colors:['#eed093','#eabdb7','#8aa6ca','#f6f0dd','#b1a2c8'],shapes:['square','circle']};
      fire({...options,angle:60,origin:{x:0,y:.7}});
      fire({...options,angle:120,origin:{x:1,y:.7}});
    } catch (_) { /* The invitation remains usable when an optional effect fails. */ }
  }
  function chatting() {
    return root?.dataset.busy === 'true' || root?.dataset.chatOpen === 'true' ||
      Boolean(document.getElementById('stelle-input')?.value.trim());
  }
  function open(auto=false) {
    if (dialog.open || (auto && (chatting() || document.hidden))) return false;
    previousFocus = document.activeElement;
    wish.disabled = false;
    wish.innerHTML = '<span aria-hidden="true">✧</span> 生日快乐！';
    document.getElementById('birthday-response').hidden = true;
    document.getElementById('birthday-invite').hidden = false;
    if (root) root.dataset.birthdayOpen = 'true';
    document.getElementById('stelle-intro')?.setAttribute('hidden','');
    dialog.showModal();
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    markSeen();
    if (!chatting()) perform('Smile','tilt');
    burst(true);
    return true;
  }
  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    lastBurst++; effects?.reset();
    document.body.style.overflow = savedOverflow;
    if (root) root.dataset.birthdayOpen = 'false';
    if (!chatting()) perform('Neutral');
    if (previousFocus && previousFocus !== document.body && previousFocus.isConnected && previousFocus.getClientRects().length) previousFocus.focus();
    else if (!launcher.hidden) launcher.focus();
  });
  document.getElementById('birthday-close').addEventListener('click',close);
  document.getElementById('birthday-dismiss').addEventListener('click',close);
  // Native dialog supplies modal focus trapping and an inert background.
  dialog.addEventListener('cancel', event => {event.preventDefault();close();});
  dialog.addEventListener('keydown', event => {
    if(event.key === 'Escape') {event.preventDefault();close();}
  });
  let backdropDown = false;
  dialog.addEventListener('pointerdown', event => {backdropDown = event.target === dialog;});
  dialog.addEventListener('click', event => {if (event.target === dialog && backdropDown) close();});
  launcher.addEventListener('click', () => open());
  wish.addEventListener('click', () => {
    wish.disabled = true; wish.textContent = '✦ 一起祝他生日快乐';
    document.getElementById('birthday-invite').hidden = true;
    document.getElementById('birthday-response').hidden = false;
    document.getElementById('birthday-guestbook').focus({preventScroll:true});
    if (!chatting()) perform('Happy','nod');
    burst();
  });
  document.getElementById('birthday-guestbook').addEventListener('click',close);
  reduced.addEventListener('change', () => { if (reduced.matches) {lastBurst++;effects?.reset();} });
  function refresh() {
    const date = today(), active = preview || date === eventDate();
    launcher.hidden = !(preview || date >= eventDate());
    if (hat) hat.hidden = !active;
    document.getElementById('birthday-preview').hidden = !preview;
    document.getElementById('birthday-title').textContent = active ? '今天是 Anthony 的生日。' : '留给 Anthony 的生日祝福。';
    const footerDate = document.getElementById('birthday-footer-date');
    if (footerDate) footerDate.textContent = `${dateInShanghai().year} / 10 / 14`;
    document.getElementById('birthday-launcher-label').textContent = active ? '10.14 · 生日快乐' : '10.14 · 生日回忆';
    clearTimeout(autoTimer);
    if (!active || seenHere || (!preview && seen())) return;
    autoTimer = setTimeout(() => {
      if (today() !== eventDate() && !preview) return;
      if ((!preview && seen()) || seenHere) return;
      if (!open(true)) return; // Chat state/visibility changes will retry without polling.
    },1800);
  }
  root?.addEventListener('stelle:chatstate',refresh);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) { lastBurst++;effects?.reset(); } else refresh();
  });
  window.addEventListener('pageshow',refresh);
  // A tab left open over Shanghai midnight should also enter/leave the event.
  setInterval(refresh,60000);
  refresh();
})();
