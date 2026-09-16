(() => {
  'use strict';
  const id = window.MOFRAME_CONFIG?.analyticsMeasurementId;
  const preview = ['127.0.0.1', 'localhost'].includes(location.hostname) && new URLSearchParams(location.search).get('analytics-preview') === '1';
  // Preview builds and unconfigured sites never contact Google Analytics.
  if (!preview && (location.hostname !== 'moframe.github.io' || location.protocol !== 'https:' || !/^G-[A-Z0-9]{6,20}$/.test(id || ''))) return;

  const banner = document.querySelector('[data-analytics-banner]');
  if (!banner) return;
  const key = 'moframe-analytics-choice-v1' + (preview ? '-preview' : '');
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const disableKey = `ga-disable-${id}`;
  let loaded = false;
  let returnFocus = null;

  const readChoice = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (['granted', 'denied'].includes(value?.choice) && value.expires > Date.now()) return value.choice;
    } catch { /* A blocked or unavailable storage must not imply consent. */ }
    return null;
  };
  const saveChoice = choice => {
    try { localStorage.setItem(key, JSON.stringify({choice, expires: Date.now() + lifetime})); } catch { /* Apply the choice for this page. */ }
  };
  const clearAnalyticsCookies = () => {
    if (preview) return;
    let cookies = '';
    try { cookies = document.cookie; } catch { return; }
    for (const part of cookies.split(';')) {
      const name = part.trim().split('=')[0];
      if (name !== '_ga' && !name.startsWith('_ga_')) continue;
      for (const domain of ['', ';domain=moframe.github.io', ';domain=.moframe.github.io']) {
        try { document.cookie = `${name}=;Max-Age=0;path=/${domain};SameSite=Lax;Secure`; } catch { /* Storage can be blocked. */ }
      }
    }
  };
  const startAnalytics = () => {
    if (loaded) return;
    loaded = true;
    if (preview) return;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Basic consent mode: even the tag itself loads only after an explicit choice.
    window.gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    window.gtag('consent', 'update', {analytics_storage: 'granted'});
    window.gtag('js', new Date());
    let referrer = '';
    try { referrer = new URL(document.referrer).origin + '/'; } catch { /* Direct visit. */ }
    window.gtag('config', id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: 'moframe.github.io',
      cookie_expires: lifetime / 1000,
      cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure',
      // Do not forward query strings, fragments or contact information.
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      page_title: document.title
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(script);
  };
  const dismiss = () => {
    banner.hidden = true;
    if (returnFocus?.isConnected && !returnFocus.closest('dialog')) returnFocus.focus();
    returnFocus = null;
  };
  document.querySelector('[data-analytics-accept]').addEventListener('click', () => {
    saveChoice('granted');
    dismiss();
    startAnalytics();
  });
  document.querySelector('[data-analytics-reject]').addEventListener('click', () => {
    saveChoice('denied');
    window[disableKey] = true;
    clearAnalyticsCookies();
    dismiss();
    // Remove the running tag as well as preventing any further collection.
    if (loaded) location.reload();
  });
  document.querySelectorAll('[data-analytics-settings]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      returnFocus = button;
      const privacy = document.querySelector('#privacy-dialog');
      if (privacy?.open) privacy.close();
      banner.hidden = false;
      banner.querySelector('h2').focus({preventScroll: true});
    });
  });
  document.querySelector('[data-analytics-privacy]').addEventListener('click', () => {
    document.querySelector('[data-open-privacy]').click();
  });
  // Honor revocation in another tab, too.
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      if (loaded && readChoice() !== 'granted') {
        window[disableKey] = true;
        clearAnalyticsCookies();
        location.reload();
      }
    }
  });
  window[disableKey] = true;
  const choice = readChoice();
  if (choice === 'granted') startAnalytics();
  else {
    clearAnalyticsCookies();
    banner.hidden = choice === 'denied';
  }
})();
