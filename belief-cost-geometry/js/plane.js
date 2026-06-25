/* plane.js — drawing primitives + (μ,σ) plane transforms and dragging. */
import { PHYS } from './phys.js';
import { fit } from './canvas.js';
import { C, clamp } from './util.js';

/* ---- primitives ---------------------------------------------------------- */
export function bump(ctx, W, mu, s, xmin, xmax, color, base, hmax, fill = true) {
  s = Math.max(s, 0.02);
  const hfac = Math.min(0.45 / s, 1);                 // mass conserved: wide = low
  const pk = PHYS.pdf(mu, mu, s);
  const Y = x => base - (PHYS.pdf(x, mu, s) / pk) * hmax * hfac;
  const trace = () => {
    ctx.beginPath();
    for (let px = 0; px <= W; px += 2) {
      const x = xmin + px / W * (xmax - xmin);
      px === 0 ? ctx.moveTo(px, Y(x)) : ctx.lineTo(px, Y(x));
    }
  };
  if (fill) { trace(); ctx.lineTo(W, base); ctx.lineTo(0, base); ctx.closePath();
    ctx.fillStyle = color + '14'; ctx.fill(); }
  trace(); ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
}

export function axe(ctx, W, y) {
  ctx.strokeStyle = C.filet; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
}

export function texte(ctx, t, x, y, col = C.encre2, size = 11.5, alignG = 'left', mono = true) {
  ctx.fillStyle = col; ctx.textAlign = alignG;
  ctx.font = size + 'px ' + (mono ? 'ui-monospace,Consolas,monospace' : 'system-ui,sans-serif');
  ctx.fillText(t, x, y); ctx.textAlign = 'left';
}

/* ---- (μ,σ) plane : transforms + drag ------------------------------------- */
export function makePlane(cv, MU, SMAX) {
  let g = fit(cv);
  const padL = 34, padR = 14, padT = 14, padB = 26;
  const api = {};
  api.refit = () => { g = fit(cv); api.W = g.W; api.Hpx = g.Hpx; api.ctx = g.ctx; };
  api.refit();
  api.X = m => padL + (m + MU) / (2 * MU) * (api.W - padL - padR);
  api.Y = s => (api.Hpx - padB) - (s / SMAX) * (api.Hpx - padT - padB);
  api.invX = px => (px - padL) / (api.W - padL - padR) * (2 * MU) - MU;
  api.invY = py => ((api.Hpx - padB) - py) / (api.Hpx - padT - padB) * SMAX;
  api.MU = MU; api.SMAX = SMAX; api.cv = cv;
  return api;
}

/** Make points draggable; also supports keyboard nudging when canvas focused. */
export function dragPoints(plane, pts, onMove) {
  const cv = plane.cv; let drag = -1, sel = 0;
  const pos = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const near = p => {
    let best = -1, bd = 18;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(p.x - plane.X(pts[i][0]), p.y - plane.Y(pts[i][1]));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const clampPt = i => {
    pts[i][0] = clamp(pts[i][0], -plane.MU, plane.MU);
    pts[i][1] = clamp(pts[i][1], PHYS.SIG_MIN * 6, plane.SMAX);
  };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', ev => {
    drag = near(pos(ev));
    if (drag >= 0) { sel = drag; cv.setPointerCapture(ev.pointerId); ev.preventDefault(); }
  });
  cv.addEventListener('pointermove', ev => {
    const p = pos(ev);
    cv.style.cursor = (drag >= 0 || near(p) >= 0) ? 'grab' : 'default';
    if (drag < 0) return;
    pts[drag][0] = plane.invX(p.x); pts[drag][1] = plane.invY(p.y); clampPt(drag); onMove();
  });
  const up = () => drag = -1;
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  // keyboard accessibility
  if (!cv.hasAttribute('tabindex')) cv.setAttribute('tabindex', '0');
  cv.addEventListener('keydown', ev => {
    const stepM = plane.MU / 40, stepS = plane.SMAX / 40;
    let used = true;
    if (ev.key === 'Tab') { return; }
    else if (ev.key === 'ArrowLeft') pts[sel][0] -= stepM;
    else if (ev.key === 'ArrowRight') pts[sel][0] += stepM;
    else if (ev.key === 'ArrowUp') pts[sel][1] += stepS;
    else if (ev.key === 'ArrowDown') pts[sel][1] -= stepS;
    else if (ev.key === ' ' || ev.key === 'Enter') sel = (sel + 1) % pts.length;
    else used = false;
    if (used) { ev.preventDefault(); clampPt(sel); onMove(); }
  });
}

export function drawPath(ctx, plane, pts, color, w = 2, dash = null) {
  ctx.save(); if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  pts.forEach((p, i) => { const X = plane.X(p[0]), Y = plane.Y(p[1]); i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}

export function drawDot(ctx, plane, m, s, color, label) {
  const X = plane.X(m), Y = plane.Y(s);
  ctx.beginPath(); ctx.arc(X, Y, 5, 0, 7); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  if (label) texte(ctx, label, X + 8, Y - 7, color, 12, 'left', false);
}
