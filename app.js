(() => {
  'use strict';
  // Keep bookmarks from the first single-page prototype useful after the split.
  const legacyPages = {'sitemap':'sitemap','works':'works','mv-work':'mv','comic-work':'comic','about':'about','characters':'characters','achievements':'client-work','client-work':'client-work','award':'award','shop':'shop','services':'services','contact':'contact'};
  if (document.body.classList.contains('page-index') && Object.hasOwn(legacyPages, location.hash.slice(1))) {
    location.replace(legacyPages[location.hash.slice(1)] + '.html');
    return;
  }
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const closeMenu = () => {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.querySelector('span').textContent = '＋';
  };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? '−' : '＋';
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus();
    }
  });
  // One shared preview for pointer, keyboard and touch-friendly scene buttons.
  const stage = document.querySelector('[data-scene-stage]');
  if (stage) {
    const layers = [...stage.querySelectorAll('[data-scene-image]')];
    const caption = document.querySelector('.scene-caption');
    const backdrop = document.querySelector('[data-scene-backdrop]');
    const halo = document.querySelector('[data-scene-halo]');
    const choices = [...document.querySelectorAll('[data-scene-src]')];
    const permittedSources = new Set(choices.map(choice => choice.dataset.sceneSrc));
    const buttons = [...document.querySelectorAll('.scene-selector button')];
    let visibleLayer = 0;
    let requestNumber = 0;
    let shownSource = layers[0].getAttribute('src');
    const showScene = async choice => {
      const src = choice.dataset.sceneSrc;
      if (!permittedSources.has(src)) return;
      const thisRequest = ++requestNumber;
      // Decode before switching so rapid pointer movement never reveals a blank frame.
      const image = new Image();
      image.src = src;
      try { await image.decode(); } catch { return; }
      if (thisRequest !== requestNumber) return;
      if (src !== shownSource) {
        const incoming = layers[1 - visibleLayer];
        incoming.src = src;
        incoming.alt = choice.dataset.sceneAlt;
        incoming.removeAttribute('aria-hidden');
        incoming.classList.add('is-visible');
        layers[visibleLayer].classList.remove('is-visible');
        layers[visibleLayer].setAttribute('aria-hidden', 'true');
        visibleLayer = 1 - visibleLayer;
        shownSource = src;
        backdrop.src = src;
        halo.src = src;
      }
      layers[visibleLayer].alt = choice.dataset.sceneAlt;
      caption.textContent = choice.dataset.sceneCaption;
      choices.forEach(item => item.classList.toggle('is-previewed', item === choice));
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sceneSrc === src)));
    };
    document.querySelectorAll('.picture-link').forEach(link => {
      link.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') showScene(link);
      });
      link.addEventListener('focus', () => {
        if (link.matches(':focus-visible')) showScene(link);
      });
    });
    buttons.forEach(button => button.addEventListener('click', () => showScene(button)));
  }
  const videoDialog = document.querySelector('#video-dialog');
  const videoContainer = document.querySelector('#video-container');
  const videoTitle = document.querySelector('#video-title');
  const videoFallback = document.querySelector('#video-fallback');
  const allowedVideos = new Set(['1W9pCWQxaTg','UV4rZNda6uQ','fNoT0sCefBo','bVUr9U6f00E','hi4_zR1aNRw','gnrriyOY520','paLESgaDyGo','atXCVoSshMk']);
  document.querySelectorAll('[data-video]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.video;
      if (!allowedVideos.has(id)) return;
      const title = button.dataset.title || 'moframeの作品';
      videoTitle.textContent = title;
      videoFallback.href = `https://www.youtube.com/watch?v=${id}`;
      const frame = document.createElement('iframe');
      frame.title = title;
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      videoContainer.replaceChildren(frame);
      videoDialog.showModal();
      document.body.classList.add('modal-open');
    });
  });
  document.querySelector('[data-close-video]').addEventListener('click', () => videoDialog.close());
  videoDialog.addEventListener('close', () => {
    videoContainer.replaceChildren();
    document.body.classList.remove('modal-open');
  });
  const privacyDialog = document.querySelector('#privacy-dialog');
  document.querySelector('[data-open-privacy]').addEventListener('click', () => {
    privacyDialog.showModal(); document.body.classList.add('modal-open');
  });
  document.querySelector('[data-close-privacy]').addEventListener('click', () => privacyDialog.close());
  privacyDialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  [videoDialog, privacyDialog].forEach(dialog => dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  }));
  document.querySelectorAll('.work-image img, .award-video img').forEach(img => img.addEventListener('error', () => {
    img.hidden = true; img.parentElement.classList.add('image-unavailable');
  }));
  // Only a public responder link belongs in this file; never store recipient addresses or credentials.
  const rawFormUrl = window.MOFRAME_CONFIG?.contactFormUrl;
  if (rawFormUrl && document.querySelector('[data-contact-link]')) {
    try {
      const url = new URL(rawFormUrl);
      const validForm = url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        ((url.hostname === 'docs.google.com' && /^\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform$/.test(url.pathname)) ||
         (url.hostname === 'forms.gle' && /^\/[A-Za-z0-9]+$/.test(url.pathname)));
      if (!validForm) throw new Error('A public Google Forms responder URL is required.');
      const link = document.querySelector('[data-contact-link]');
      link.href = url.href; link.hidden = false;
      document.querySelector('[data-contact-pending]').hidden = true;
      document.querySelector('[data-contact-login]').hidden = false;
    } catch {
      // Keep the working Instagram fallback until a valid responder URL has been configured.
    }
  }
})();
