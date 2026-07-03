/* main.js — boot the figures + KaTeX on the project page.
   The copy-BibTeX button is wired by a small inline script in index.html. */
import { observe } from './viewport.js';
import { mountTwin } from './fig-twin.js';
import { mountGeometry } from './fig-geometry.js';
import { mountDT } from './fig-dt.js';

/* ---- KaTeX rendering of every [data-tex] -------------------------------- */
function renderMath() {
  if (typeof katex === 'undefined') return;
  document.querySelectorAll('[data-tex]').forEach(el => {
    if (el.dataset.rendered) return;
    try {
      katex.render(el.getAttribute('data-tex'), el, {
        displayMode: el.dataset.display === '1', throwOnError: false,
      });
      el.dataset.rendered = '1';
    } catch (e) { el.textContent = el.getAttribute('data-tex'); }
  });
}

function boot() {
  const a = document.querySelector('[data-fig="twin"]');
  const b = document.querySelector('[data-fig="geometry"]');
  const d = document.querySelector('[data-fig="dt"]');
  try { if (a) mountTwin(a); } catch (e) { console.error('twin figure failed', e); if (a) a.innerHTML = '<p class="figerr">figure error</p>'; }
  try { if (b) mountGeometry(b); } catch (e) { console.error('geometry figure failed', e); if (b) b.innerHTML = '<p class="figerr">figure error</p>'; }
  try { if (d) mountDT(d); } catch (e) { console.error('dt figure failed', e); if (d) d.innerHTML = '<p class="figerr">figure error</p>'; }
  renderMath();
  document.querySelectorAll('section[id]').forEach(s => observe(s.id));
  // KaTeX may load after this module on slow connections — render again on load.
  window.addEventListener('load', renderMath);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
