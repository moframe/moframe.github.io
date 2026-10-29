(() => {
  'use strict';
  const video = document.querySelector('#showreel-video');
  if (!video) return;
  const play = document.querySelector('[data-reel-play]');
  const sound = document.querySelector('[data-reel-sound]');
  const status = document.querySelector('[data-reel-status]');
  const english = document.documentElement.lang === 'en';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let attempted = false, revision = 0;
  video.muted = true;
  video.defaultMuted = true;
  const sync = () => {
    play.textContent = video.paused ? (english ? 'Play' : '再生する') : (english ? 'Pause' : '一時停止');
    sound.textContent = video.muted ? (english ? 'Sound on' : '音声オン') : (english ? 'Sound off' : '音声オフ');
    sound.setAttribute('aria-pressed', String(!video.muted));
    status.textContent = video.muted ? (english ? 'Sound off' : '音声オフ') : (english ? 'Sound on' : '音声オン');
  };
  const start = async () => {
    const request = ++revision;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    if (video.ended) video.currentTime = 0;
    try {
      await video.play();
      if (request !== revision) video.pause();
    } catch {
      if (request === revision) status.textContent = english ? 'Tap Play to watch' : '再生ボタンを押してご覧ください';
    }
  };
  const pause = () => { revision++; video.pause(); };
  play.addEventListener('click', () => { attempted = true; if (video.paused) start(); else pause(); });
  sound.addEventListener('click', () => {
    attempted = true;
    video.muted = !video.muted;
    sync();
    if (!video.muted && video.paused) start();
  });
  ['play','pause','ended','volumechange'].forEach(event => video.addEventListener(event, sync));
  video.addEventListener('ended', () => { video.currentTime = 0; video.muted = true; sync(); });
  video.addEventListener('error', () => { status.textContent = english ? 'Video unavailable. Please try again.' : '動画を読み込めませんでした。再度お試しください。'; });
  new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
    if (!visible) { pause(); return; }
    if (!attempted && !document.hidden && !reduced.matches && !connection?.saveData) {
      attempted = true;
      start();
    }
  }, {threshold:[0,.35]}).observe(video);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); video.muted = true; } });
  window.addEventListener('pagehide', () => { pause(); video.muted = true; });
  reduced.addEventListener('change', () => { if (reduced.matches) pause(); });
  connection?.addEventListener('change', () => { if (connection.saveData) pause(); });
})();
