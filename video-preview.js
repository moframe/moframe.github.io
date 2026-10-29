(() => {
  'use strict';
  const english = document.documentElement.lang === 'en';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const touch = matchMedia('(hover: none) and (pointer: coarse)');
  const connection = navigator.connection;
  const cards = [...document.querySelectorAll('[data-preview]')];
  let active = null, pending = null, timer = null, finishTimer = null, revision = 0;
  const videos = new Map();
  const seen = new Set();
  const visible = new Set();
  const mobileCard = card => !card.classList.contains('collection-preview');
  const enabled = () => !reducedMotion.matches && !connection?.saveData;
  const stop = () => {
    revision++;
    clearTimeout(timer);
    clearTimeout(finishTimer);
    pending = null;
    if (active) {
      const video = videos.get(active);
      video?.pause();
      if (video?.readyState) video.currentTime = 0;
      active.classList.remove('preview-playing');
      active = null;
    }
  };
  const start = (card, mobile = false) => {
    if (!enabled() || document.hidden || document.querySelector('dialog[open]')) return;
    if (mobile && (!touch.matches || !mobileCard(card) || seen.has(card))) return;
    if (active === card || pending === card) return;
    stop();
    pending = card;
    const request = revision;
    timer = setTimeout(async () => {
      if (request !== revision) return;
      if (!enabled() || document.hidden || document.querySelector('dialog[open]') ||
          (mobile && (!touch.matches || !visible.has(card)))) { stop(); return; }
      pending = null;
      active = card;
      let video = videos.get(card);
      if (!video) {
        const source = card.dataset.preview;
        if (!/^assets\/preview-[a-z0-9-]+\.mp4(?:\?v=2)?$/.test(source)) { stop(); return; }
        video = document.createElement('video');
        video.className = 'hover-preview';
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.preload = 'none';
        video.setAttribute('aria-hidden', 'true');
        video.disablePictureInPicture = true;
        video.src = source;
        (card.querySelector('.preview-frame') || card).append(video);
        videos.set(card, video);
        video.addEventListener('ended', () => { if (active === card) stop(); });
        video.addEventListener('error', () => {
          if (active === card) stop();
          card.classList.remove('preview-ready');
        });
      }
      try {
        // Attempt at most once per page visit on touch, including autoplay denial.
        if (mobile) seen.add(card);
        video.currentTime = 0;
        await video.play();
        if (request === revision && active === card) {
          card.classList.add('preview-playing');
          if (mobile) finishTimer = setTimeout(() => {
            if (request === revision && active === card) stop();
          }, 1000);
        } else if (active !== card) video.pause();
      } catch { if (request === revision) stop(); }
    }, 180);
  };
  const updatePreference = () => {
    stop();
    cards.forEach(card => {
      const mobile = touch.matches;
      card.dataset.previewLabel = mobile
        ? (english ? '1s silent preview' : '1秒・無音プレビュー')
        : (english ? '5s silent preview' : '5秒・無音プレビュー');
      card.classList.toggle('preview-ready', enabled() && (mobile ? mobileCard(card) : pointer.matches));
    });
  };
  // The central 60% of the screen triggers individual works only. Category reels
  // stay still on touch. No autoplay is requested before a work enters this area.
  const mobileObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const inView = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      if (inView) visible.add(entry.target); else visible.delete(entry.target);
      if (touch.matches && !inView && (active === entry.target || pending === entry.target)) stop();
    }
    if (!touch.matches || active || pending || !enabled()) return;
    const candidate = [...visible].filter(card => !seen.has(card)).sort((a,b) => {
      const center = card => { const r=card.getBoundingClientRect(); return Math.abs((r.top+r.bottom)/2-window.innerHeight/2); };
      return center(a)-center(b);
    })[0];
    if (candidate) start(candidate, true);
  }, {rootMargin:'-20% 0px -20% 0px', threshold:[0,0.45,0.75]});
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting && (active === entry.target || pending === entry.target)) stop();
    }
  });
  cards.forEach(card => {
    card.dataset.previewLabel = english ? '5s silent preview' : '5秒・無音プレビュー';
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && pointer.matches && !touch.matches) start(card);
    });
    card.addEventListener('pointerleave', event => {
      if (!touch.matches && (active === card || pending === card)) stop();
    });
    card.addEventListener('focus', () => { if (!touch.matches && card.matches(':focus-visible')) start(card); });
    card.addEventListener('blur', () => { if (active === card || pending === card) stop(); });
    // Original links/buttons still open the full film on click or tap.
    card.addEventListener('click', stop, {capture: true});
    observer.observe(card);
    if (mobileCard(card)) mobileObserver.observe(card);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') stop(); });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-video], [data-open-privacy]')) stop();
  }, {capture: true});
  window.addEventListener('pagehide', stop);
  reducedMotion.addEventListener('change', updatePreference);
  pointer.addEventListener('change', updatePreference);
  touch.addEventListener('change', updatePreference);
  connection?.addEventListener('change', updatePreference);
  updatePreference();
})();
