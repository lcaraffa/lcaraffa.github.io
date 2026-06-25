/* util.js — shared helpers + design tokens for the PROJECT page.
   Same keys as the companion's util.js (so plane.js/phys figures work unchanged),
   but a fresh palette: this is a research-project landing page, not the article. */

export const $ = id => document.getElementById(id);

/* design tokens — mirror css/style.css :root */
export const C = {
  papier: '#FFFFFF', blanc: '#FFFFFF',
  encre: '#15171C', encre2: '#5B606B',
  info:   '#1E6FB8',   // observation  (Cramér–Rao)
  energie:'#C2410C',   // physics      (Landauer)
  soudure:'#6D28D9',   // belief / geometry (the protagonist)
  okD: '#0E7C5A', okE: '#1E6FB8', okP: '#C2410C',
  grille: '#ECECF1', filet: '#DCDCE4',
};

export const fmt = (x, d = 2) =>
  (!isFinite(x) ? '∞'
    : (Math.abs(x) >= 1000 || (x !== 0 && Math.abs(x) < 0.01)) ? x.toExponential(1)
    : x.toFixed(d));

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;

export const randn = () => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export function roundRect(ct, x, y, w, h, r) {
  ct.beginPath();
  ct.moveTo(x + r, y);
  ct.arcTo(x + w, y, x + w, y + h, r);
  ct.arcTo(x + w, y + h, x, y + h, r);
  ct.arcTo(x, y + h, x, y, r);
  ct.arcTo(x, y, x + w, y, r);
  ct.closePath();
}

/* small DOM builder: el('div', {class:'x'}, [children|strings]) */
export function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'html') n.innerHTML = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach(c => {
    if (c == null) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}

/* minimal control helpers (project look; no dependency on the old ui.js) ---- */
export function slider({ min, max, step, value, accent = 'soudure', label = '' }) {
  const input = el('input', { type: 'range', min, max, step, value, class: 'sl sl-' + accent });
  const val = el('span', { class: 'sl-val' });
  const desc = el('span', { class: 'sl-lab' }, label);
  const ctl = el('label', { class: 'ctl' }, [desc, input, val]);
  return { ctl, input, val, desc };
}

export function button(text, onClick) {
  return el('button', { type: 'button', class: 'btn', onclick: onClick }, text);
}

export function toggle({ checked = true, label = '' }) {
  const input = el('input', { type: 'checkbox' });
  if (checked) input.checked = true;
  const span = el('span', {}, label);
  const wrap = el('label', { class: 'tg' }, [input, span]);
  return { wrap, input, span };
}

/* a row of readout pills; returns {pill, key, val} per entry */
export function readout(key, accent = 'soudure') {
  const k = el('span', { class: 'ro-k' }, key);
  const val = el('span', { class: 'ro-v ro-' + accent });
  const pill = el('span', { class: 'ro' }, [k, val]);
  return { pill, key: k, val };
}
