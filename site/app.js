import { fetchRelease } from './release.js';

const isiOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isiOS) document.body.classList.add('ios');

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
