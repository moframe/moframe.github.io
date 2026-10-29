(() => {
  'use strict';
  const english = document.documentElement.lang === 'en';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const connection = navigator.connection;
  const cards = [...document.querySelectorAll('[data-preview]')];
  let active = null, pending = null, timer = null, revision = 0;
  const videos = new Map();
  const enabled = () => !reducedMotion.matches && !connection?.saveData;
  const stop = () => {
    revision++;
    clearTimeout(timer);
    pending = null;
    if (active) {
      const video = videos.get(active);
      video?.pause();
      if (video?.readyState) video.currentTime = 0;
      active.classList.remove('preview-playing');
      active = null;
    }
  };
  const start = card => {
    if (!enabled() || document.hidden || document.querySelector('dialog[open]')) return;
    if (active === card || pending === card) return;
    stop();
    pending = card;
    const request = revision;
    timer = setTimeout(async () => {
      if (request !== revision || !enabled() || document.hidden) return;
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
        video.currentTime = 0;
        await video.play();
        if (request === revision && active === card) card.classList.add('preview-playing');
      } catch { if (request === revision) stop(); }
    }, 180);
  };
  const updatePreference = () => {
    if (!enabled() || !pointer.matches) stop();
    cards.forEach(card => card.classList.toggle('preview-ready', enabled() && pointer.matches));
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting && (active === entry.target || pending === entry.target)) stop();
    }
  });
  cards.forEach(card => {
    card.dataset.previewLabel = english ? '5s silent preview' : '5秒・無音プレビュー';
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && pointer.matches) start(card);
    });
    card.addEventListener('pointerleave', () => {
      if (active === card || pending === card) stop();
    });
    card.addEventListener('focus', () => { if (card.matches(':focus-visible')) start(card); });
    card.addEventListener('blur', () => { if (active === card || pending === card) stop(); });
    // Original links/buttons still open the full film on click or tap.
    card.addEventListener('click', stop, {capture: true});
    observer.observe(card);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') stop(); });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-video], [data-open-privacy]')) stop();
  }, {capture: true});
  window.addEventListener('pagehide', stop);
  reducedMotion.addEventListener('change', updatePreference);
  pointer.addEventListener('change', updatePreference);
  connection?.addEventListener('change', updatePreference);
  updatePreference();
})();
