(() => {
  'use strict';
  const stage = document.querySelector('[data-scene-stage]');
  if (!stage) return;
  const english = document.documentElement.lang === 'en';
  // Only decorative navigation artwork rotates. Project-specific cards stay fixed.
  const pool = [
    ['assets/water-fight.png', '水鉄砲を持つミケちゃんとボーダー君', 'Mike and Border with a water blaster'],
    ['assets/digidigi-dance.png', 'スーツ姿で踊るミケちゃんとボーダー君', 'Mike and Border dancing in suits'],
    ['assets/roadrunner.png', 'ロードランナーを追うミケちゃん、ボーダー君、タイハク', 'Mike, Border and Taihaku chasing a roadrunner'],
    ['assets/hootie-frutti.png', '夕焼けの街で華やかな衣装を着たミケちゃんとボーダー君', 'Mike and Border in colorful outfits at sunset'],
    ['assets/cream-puff-moment.png', '冷蔵庫のシュークリームを見つめるミケちゃんとボーダー君', 'Mike and Border looking at cream puffs in the fridge'],
    ['assets/western-high-five.png', '西部劇の街でハイタッチするミケちゃんとボーダー君', 'Mike and Border sharing a high five in a Western town'],
    ['assets/pulp-dance.png', '夜のレストランで踊るミケちゃんとボーダー君', 'Mike and Border dancing in a restaurant at night'],
    ['assets/pickup-break.png', '軽トラの荷台で飲み物を楽しむ3人', 'The three friends enjoying drinks on a pickup truck'],
    ['assets/pickup-drive.png', '夕焼けの道を軽トラで走る3人', 'The three friends driving a pickup truck at sunset'],
    ['assets/autumn-toast.png', '紅葉の湖畔で乾杯するミケちゃんたち', 'The friends sharing a toast beside an autumn lake'],
    ['assets/flight-home.png', '飛行機の座席で過ごすミケちゃんたち', 'The friends sharing a moment on a flight'],
    ['assets/moon-viewing.png', '浴衣姿で月見団子を食べる3人', 'The three friends enjoying moon-viewing dumplings in yukata'],
    ['assets/cream-puff-baking.png', '焼き上がるシュークリームを楽しみに待つミケちゃん', 'Mike eagerly watching cream puffs bake']
  ];
  const cards = ['works', 'characters', 'about', 'services', 'contact']
    .map(name => document.querySelector(`.picture-${name}`));
  const buttons = [...document.querySelectorAll('.scene-selector button')];
  if (cards.some(card => !card) || cards.length * 2 + buttons.length > pool.length) return;
  const key = 'moframe-art-order-v1';
  let previous = [];
  try { previous = JSON.parse(sessionStorage.getItem(key)) || []; } catch { /* Storage is optional. */ }
  const validPrevious = Array.isArray(previous) && previous.length === pool.length &&
    new Set(previous).size === pool.length && previous.every(src => pool.some(item => item[0] === src));
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Rotate the shuffled order until every slot differs from the last visit.
  // A cyclic shift of the previous order is a bounded, guaranteed fallback.
  if (validPrevious) {
    let attempts = 0;
    while (order.some((item, i) => item[0] === previous[i]) && attempts++ < pool.length) {
      order.push(order.shift());
    }
    if (order.some((item, i) => item[0] === previous[i])) {
      order.splice(0, order.length, ...previous.slice(1).concat(previous[0]).map(src => pool.find(item => item[0] === src)));
    }
  }
  try { sessionStorage.setItem(key, JSON.stringify(order.map(item => item[0]))); } catch { /* Still unique without storage. */ }
  const describe = item => item[english ? 2 : 1];
  const assignScene = (element, item) => {
    element.dataset.sceneSrc = item[0];
    element.dataset.sceneAlt = describe(item);
    element.dataset.sceneCaption = describe(item);
  };
  cards.forEach((card, i) => {
    const primary = order[i * 2];
    const alternate = order[i * 2 + 1];
    card.querySelector('.picture-primary').src = primary[0];
    card.querySelector('.picture-alternate').src = alternate[0];
    assignScene(card, primary);
  });
  buttons.forEach((button, i) => {
    const item = order[cards.length * 2 + i];
    assignScene(button, item);
    button.querySelector('img').src = item[0];
    button.setAttribute('aria-label', english ? `Show: ${describe(item)}` : `${describe(item)}の画像に切り替える`);
    button.setAttribute('aria-pressed', String(i === 0));
  });
  const initial = order[cards.length * 2];
  const main = stage.querySelector('.scene-image.is-visible');
  main.src = initial[0];
  main.alt = describe(initial);
  document.querySelector('[data-scene-backdrop]').src = initial[0];
  document.querySelector('[data-scene-halo]').src = initial[0];
  document.querySelector('.scene-caption').textContent = describe(initial);
})();
