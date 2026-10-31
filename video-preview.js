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
  const mobileCard = card => Boolean(card.dataset.mobilePreview);
  const enabled = () => !reducedMotion.matches && !connection?.saveData;
  const frame = card => card.querySelector('.preview-frame') || card;
  const owners = new Map(cards.map(card => [frame(card), card]));
  const prepare = (card, mobile) => {
    const source = mobile ? card.dataset.mobilePreview : card.dataset.preview;
    if (!source || !/^assets\/preview-[a-z0-9-]+\.mp4(?:\?v=\d+)?$/.test(source)) return null;
    let video = videos.get(card);
    if (!video) {
      video = document.createElement('video');
      video.className = 'hover-preview';
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.disablePictureInPicture = true;
      frame(card).append(video);
      videos.set(card, video);
      video.addEventListener('ended', () => { if (active === card) stop(); });
      video.addEventListener('error', () => {
        if (active === card) stop();
        card.classList.remove('preview-ready');
      });
    }
    if (video.dataset.source !== source) {
      video.dataset.source = source;
      video.preload = mobile ? 'auto' : 'none';
      video.src = source;
      if (mobile) video.load();
    }
    return video;
  };
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
      const video = prepare(card, mobile);
      if (!video) { stop(); return; }
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
    }, mobile ? 0 : 180);
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
  // Load only nearby, one-second clips before they enter the screen.
  const preloadObserver = new IntersectionObserver(entries => {
    if (!touch.matches || !enabled() || document.hidden) return;
    for (const entry of entries) {
      const card = owners.get(entry.target);
      if (entry.isIntersecting && !seen.has(card)) prepare(card, true);
    }
  }, {rootMargin:'240px 0px', threshold:0});
  // Observe the image frame, excluding captions. Half visible anywhere in the
  // viewport is enough for individual works and category montages.
  const mobileObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const card = owners.get(entry.target);
      const inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (inView) visible.add(card); else visible.delete(card);
      if (touch.matches && !inView && (active === card || pending === card)) stop();
    }
    if (!touch.matches || active || pending || !enabled()) return;
    const candidate = [...visible].filter(card => !seen.has(card)).sort((a,b) => {
      const center = card => { const r=card.getBoundingClientRect(); return Math.abs((r.top+r.bottom)/2-window.innerHeight/2); };
      return center(a)-center(b);
    })[0];
    if (candidate) start(candidate, true);
  }, {rootMargin:'0px', threshold:[0,0.5,1]});
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
    if (mobileCard(card)) {
      mobileObserver.observe(frame(card));
      preloadObserver.observe(frame(card));
    }
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
