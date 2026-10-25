import { fetchRelease } from './release.js';

const isiOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isiOS) document.body.classList.add('ios');

function setupMotion() {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('[data-hero-motion]');
  const toggle = document.querySelector('[data-motion-toggle]');
  let paused = false;
  function syncHero() {
    if (!hero || !toggle) return;
    hero.classList.toggle('is-animated', !preference.matches);
    hero.classList.toggle('is-paused', paused || document.hidden);
    toggle.hidden = preference.matches;
    toggle.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
  }
  toggle?.addEventListener('click', () => { paused = !paused; syncHero(); });
  document.addEventListener('visibilitychange', syncHero);
  syncHero();

  const pending = new Set();
  let observer;
  function reveal(node) {
    if (!node) return;
    node.classList.remove('is-pending');
    pending.delete(node);
    observer?.unobserve(node);
  }
  if (!preference.matches && typeof window.IntersectionObserver === 'function') {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { threshold: 0.08, rootMargin: '0px 0px 32px 0px' });
    for (const node of document.querySelectorAll('[data-reveal]')) {
      if (node.getBoundingClientRect().top < window.innerHeight * 0.96) continue;
      pending.add(node);
      node.classList.add('is-pending');
      observer.observe(node);
    }
  }
  document.addEventListener('focusin', (event) => {
    if (event.target instanceof Element) reveal(event.target.closest('[data-reveal]'));
  });
  function revealHash() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target || target.tagName === 'MAIN') return;
    reveal(target.closest('[data-reveal]'));
    for (const node of target.querySelectorAll('[data-reveal]')) reveal(node);
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
  preference.addEventListener?.('change', () => {
    syncHero();
    if (preference.matches) {
      for (const node of pending) reveal(node);
      observer?.disconnect();
    }
  });
}

setupMotion();

const release = await fetchRelease(new URL('./version.json', import.meta.url).href);
for (const node of document.querySelectorAll('[data-version]')) {
  node.textContent = release ? `Android ${release.version} · build ${release.buildNumber}` : 'Download Android temporariamente indisponível.';
}
for (const node of document.querySelectorAll('[data-download]')) {
  if (release) {
    node.href = release.downloadUrl;
    node.removeAttribute('aria-disabled');
  } else {
    node.removeAttribute('href');
    node.setAttribute('aria-disabled', 'true');
  }
}
