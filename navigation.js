(() => {
  'use strict';
  const mobile = matchMedia('(max-width: 740px)');
  const targets = new Set(['map-about', 'map-contact', 'map-client-work', 'map-award', 'map-portfolio', 'map-services']);
  // Leave Back/Forward restoration to the browser, including bfcache restores.
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  const links = [...document.querySelectorAll('.map-return, .brand')].map(link => ({link, href: link.getAttribute('href')}));
  const updateLinks = () => links.forEach(({link, href}) => {
    const hash = link.classList.contains('map-return') ? link.dataset.mapTarget : 'home-top';
    link.setAttribute('href', mobile.matches && (hash === 'home-top' || targets.has(hash)) ? `${href}#${hash}` : href);
  });
  updateLinks();
  mobile.addEventListener('change', updateLinks);

  const id = location.hash.slice(1);
  if (!mobile.matches || !targets.has(id)) return;
  const target = document.getElementById(id);
  const header = document.querySelector('.site-header');
  if (!target || !header) return;
  const spacer = document.createElement('div');
  spacer.setAttribute('aria-hidden', 'true');
  spacer.dataset.mapReturnSpace = '';
  document.body.append(spacer);
  const layout = () => {
    const offset = header.getBoundingClientRect().height + 12;
    const desired = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    const baseHeight = document.documentElement.scrollHeight - spacer.getBoundingClientRect().height;
    // Even the last card can align below the header without being clamped at the footer.
    spacer.style.height = `${Math.max(0, Math.ceil(desired + window.innerHeight - baseHeight))}px`;
    return desired;
  };
  layout();
  const backForward = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (backForward) return;
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  ['touchstart', 'wheel', 'pointerdown', 'keydown'].forEach(type => window.addEventListener(type, cancel, {passive: true, once: true}));
  const align = () => {
    if (!cancelled && mobile.matches) window.scrollTo({top: layout(), behavior: 'instant'});
  };
  requestAnimationFrame(align);
  window.addEventListener('pageshow', event => { if (!event.persisted) align(); });
  document.fonts?.ready.then(align);
})();
