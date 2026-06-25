/* canvas.js — DPR-aware canvas sizing + resize registry (ported). */

const canvases = [];

/** Size a canvas for the device pixel ratio; return {ctx,W,Hpx}.
 *  The logical (CSS) height is captured ONCE in dataset.h: setting cv.height
 *  reflects to the height attribute, so re-reading it would compound by dpr on
 *  every call (runaway growth on HiDPI screens). Width comes from clientWidth,
 *  which CSS pins to 100% of the container, so it stays stable. */
export function fit(cv) {
  const dpr = window.devicePixelRatio || 1;
  if (cv.dataset.h === undefined) cv.dataset.h = cv.getAttribute('height') || '200';
  const h = +cv.dataset.h;
  const w = cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 600;
  cv.style.width = '100%';                 // display width is CSS-controlled, not the device-px attribute
  cv.style.height = h + 'px';              // fixed display height
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: w, Hpx: h };
}

/** Register a redraw callback to be invoked on resize. */
export function reg(cv, redraw) { canvases.push({ cv, redraw }); }

/** Redraw every registered canvas (used by i18n toggle and reduced-motion change). */
export function redrawAll() { canvases.forEach(c => c.redraw()); }

let rsT;
window.addEventListener('resize', () => {
  clearTimeout(rsT);
  rsT = setTimeout(redrawAll, 120);
});
