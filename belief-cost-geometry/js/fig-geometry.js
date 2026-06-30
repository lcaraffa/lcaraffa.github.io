/* fig-geometry.js — "The geometry the cost imposes."
   Postulate 0 makes the cost a length on optimal transport (the arena); Postulate 1
   makes the price uniform — one nat costs the same length everywhere. Together they
   force a HYPERBOLIC leaf of beliefs: certainty (σ → 0) is pushed to INFINITE
   cost-distance — the boundary ∂∞. Shown in two models of the same leaf:
     · half-plane — the boundary is the bottom edge;
     · Poincaré disk — certainty is the whole boundary, at infinity.
   The cheapest way to change one's mind is the geodesic (open up → traverse → close),
   not the straight chord. Equal-cost graduations make uniform pricing visible: they crowd
   toward the boundary. A bead travels at constant COST-speed (ambient); drag a belief in
   either panel (interactive). Distances/curvature from phys.js. */
import { fit, reg } from './canvas.js';
import { observe, anim, motion } from './viewport.js';
import { PHYS } from './phys.js';
import { C, fmt, clamp, el, toggle, readout } from './util.js';
import { texte } from './plane.js';

export function mountGeometry(root) {
  let showRelief = true;
  const MU = 4, SMAX = 3.4;
  const DEF = () => [[-2.4, 0.5], [2.4, 0.5]];   // confident & far apart → big detour saving
  let P = DEF();
  let bead = 0, beadDir = 1;                       // ambient traveler along the geodesic

  const cv = el('canvas', { height: 380, tabindex: '0',
    'aria-label': 'The same beliefs in two models of one hyperbolic leaf: Poincaré half-plane and disk.' });
  const stage = el('div', { class: 'stage' }, [cv]);
  root.appendChild(stage);

  const tgR = toggle({ checked: true, label: 'cost relief' });
  root.appendChild(el('div', { class: 'controls' }, [tgR.wrap]));
  tgR.input.addEventListener('change', () => { showRelief = tgR.input.checked; draw(); });

  const mG = readout('geodesic cost =', 'soudure'), mC = readout('chord cost =', 'info'),
        mS = readout('saved', 'energie'), mK = readout('curvature K =', 'encre');
  root.appendChild(el('div', { class: 'readouts' }, [mG.pill, mC.pill, mS.pill, mK.pill]));

  /* per-panel transforms */
  const padL = 34, padR = 12, padT = 24, padB = 24;
  const Xh = (r, m) => r.x + padL + (m + MU) / (2 * MU) * (r.w - padL - padR);
  const Yh = (r, s) => r.y + r.h - padB - (s / SMAX) * (r.h - padT - padB);
  const invXh = (r, px) => (px - r.x - padL) / (r.w - padL - padR) * (2 * MU) - MU;
  const invYh = (r, py) => (r.y + r.h - padB - py) / (r.h - padT - padB) * SMAX;
  const diskOf = r => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 + 6, R: Math.min(r.w - 20, r.h - 36) * 0.5 });
  const toDisk = (d, m, s) => { const w = PHYS.cayley(m, s); return { x: d.cx + w.x * d.R, y: d.cy - w.y * d.R }; };
  const fromDisk = (d, px, py) => {
    const wx = (px - d.cx) / d.R, wy = -(py - d.cy) / d.R;
    const ar = 1 + wx, ai = wy, br = 1 - wx, bi = -wy, den = br * br + bi * bi;
    const rr = (ar * br + ai * bi) / den, ri = (ai * br - ar * bi) / den;
    return { m: -ri, s: rr };
  };
  const inRect = (r, q) => q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h;

  let lay = null;
  function layout(W, Hp) {
    if (W < 560) return { stack: true, half: { x: 0, y: 0, w: W, h: Hp / 2 - 6 }, disk: { x: 0, y: Hp / 2 + 6, w: W, h: Hp / 2 - 6 } };
    return { stack: false, half: { x: 0, y: 0, w: W / 2 - 6, h: Hp }, disk: { x: W / 2 + 6, y: 0, w: W / 2 - 6, h: Hp } };
  }

  /* unified drag across both panels */
  let drag = -1, dragOn = null;
  const at = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const pixOf = (panel, rect, m, s) => panel === 'disk' ? toDisk(diskOf(rect), m, s) : { x: Xh(rect, m), y: Yh(rect, s) };
  const nearest = q => {
    if (!lay) return null;
    for (const panel of ['half', 'disk']) {
      const rect = lay[panel]; if (!inRect(rect, q)) continue;
      for (let i = 0; i < P.length; i++) { const p = pixOf(panel, rect, P[i][0], P[i][1]);
        if (Math.hypot(q.x - p.x, q.y - p.y) < 20) return { i, panel }; }
    }
    return null;
  };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', ev => { const n = nearest(at(ev)); if (n) { drag = n.i; dragOn = n.panel; cv.setPointerCapture(ev.pointerId); ev.preventDefault(); } });
  cv.addEventListener('pointermove', ev => {
    const q = at(ev); cv.style.cursor = (drag >= 0 || nearest(q)) ? 'grab' : 'default';
    if (drag < 0 || !lay) return;
    const rect = lay[dragOn];
    const c = dragOn === 'disk' ? fromDisk(diskOf(rect), q.x, q.y) : { m: invXh(rect, q.x), s: invYh(rect, q.y) };
    P[drag] = [clamp(c.m, -MU, MU), clamp(c.s, 0.06, SMAX)]; draw();
  });
  const up = () => drag = -1; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  /* cost-arclength position of the bead: pick the geodesic point at fraction `bead`
     of total cost (so it slows where steps cost more — it crowds toward the boundary). */
  function beadPoint(gp, cum, total) {
    const target = total * bead; let i = 1; while (i < gp.length && cum[i] < target) i++;
    return gp[Math.min(i, gp.length - 1)];
  }

  function overlay(ctx, pfn, gp, lp) {
    const path = (pts, col, lw, dash) => { ctx.save(); if (dash) ctx.setLineDash(dash); ctx.beginPath();
      pts.forEach((p, i) => { const q = pfn(p[0], p[1]); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };
    path(lp, C.info, 1.6, [5, 4]);
    path(gp, C.soudure, 2.4);
    // equal-cost graduations
    const cum = [0]; for (let i = 1; i < gp.length; i++) cum[i] = cum[i - 1] + 2 * PHYS.dHyp(gp[i - 1][0], gp[i - 1][1], gp[i][0], gp[i][1]);
    const total = cum[cum.length - 1], K = 12;
    for (let j = 1; j < K; j++) { const target = total * j / K; let i = 1; while (i < gp.length && cum[i] < target) i++;
      const p = gp[Math.min(i, gp.length - 1)], q = pfn(p[0], p[1]);
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.4, 0, 7); ctx.fillStyle = C.soudure; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
    // ambient bead (constant cost-speed)
    if (total > 0) { const pb = beadPoint(gp, cum, total), q = pfn(pb[0], pb[1]);
      ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, 7); ctx.fillStyle = C.energie; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    // apex "open up"
    let apex = gp[0]; gp.forEach(p => { if (p[1] > apex[1]) apex = p; });
    const qa = pfn(apex[0], apex[1]); texte(ctx, '↑ open up', qa.x, qa.y - 7, C.soudure, 9.5, 'center', false);
    // the two beliefs
    [[0, C.soudure, 'p₀'], [1, C.info, 'p₁']].forEach(([i, col, lab]) => { const q = pfn(P[i][0], P[i][1]);
      ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      texte(ctx, lab, q.x + 7, q.y - 6, col, 11, 'left', false); });
  }

  function drawHalf(ctx, r, gp, lp) {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    if (showRelief) for (let s = 0.06; s <= SMAX; s += 0.06) { const y = Yh(r, s), y2 = Yh(r, Math.max(s - 0.06, 0));
      ctx.fillStyle = 'rgba(109,40,217,' + clamp(1 / (s * s) / 120, 0, 0.20) + ')'; ctx.fillRect(Xh(r, -MU), y, Xh(r, MU) - Xh(r, -MU), y2 - y); }
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1;
    [0.5, 1, 2, 3].forEach(s => { const y = Yh(r, s); ctx.beginPath(); ctx.moveTo(Xh(r, -MU), y); ctx.lineTo(Xh(r, MU), y); ctx.stroke();
      texte(ctx, 'σ=' + s, Xh(r, -MU) + 2, y - 3, C.encre2, 8.5, 'left', false); });
    const yb = Yh(r, 0); ctx.strokeStyle = C.encre; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(Xh(r, -MU), yb); ctx.lineTo(Xh(r, MU), yb); ctx.stroke();
    texte(ctx, 'the boundary ∂∞ · certainty σ=0 (infinite cost-distance)', r.x + r.w / 2, yb - 5, C.encre2, 9.5, 'center', false);
    overlay(ctx, (m, s) => ({ x: Xh(r, m), y: Yh(r, s) }), gp, lp);
    texte(ctx, 'half-plane — the boundary is the bottom edge', r.x + 6, r.y + 14, C.encre2, 10.5, 'left', false);
    ctx.restore();
  }

  // faint hyperbolic tiling (Escher backdrop): arcs ⟂ boundary between ideal points
  function drawTiling(ctx, d) {
    const M = 12;
    ctx.save(); ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R, 0, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(109,40,217,0.10)'; ctx.lineWidth = 1;
    const pt = a => ({ x: d.cx + Math.cos(a) * d.R, y: d.cy - Math.sin(a) * d.R });
    for (let j = 0; j < M; j++) for (let k = 1; k <= M / 2; k++) {
      if (k === M / 2 && j >= M / 2) continue;
      const a1 = 2 * Math.PI * j / M, a2 = 2 * Math.PI * ((j + k) % M) / M;
      const A = pt(a1), B = pt(a2);
      if (k === M / 2) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); continue; }
      const dlt = Math.PI * k / M, mid = a1 + dlt, sec = 1 / Math.cos(dlt), rho = Math.tan(dlt);
      const Cx = d.cx + sec * Math.cos(mid) * d.R, Cy = d.cy - sec * Math.sin(mid) * d.R, R2 = rho * d.R;
      const aA = Math.atan2(A.y - Cy, A.x - Cx); let aB = Math.atan2(B.y - Cy, B.x - Cx);
      let da = aB - aA; while (da <= -Math.PI) da += 2 * Math.PI; while (da > Math.PI) da -= 2 * Math.PI;
      ctx.beginPath(); ctx.arc(Cx, Cy, R2, aA, aA + da); ctx.stroke();
    }
    ctx.restore();
  }

  function drawDisk(ctx, r, gp, lp) {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    const d = diskOf(r);
    if (showRelief) drawTiling(ctx, d);
    ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R, 0, 7); ctx.strokeStyle = C.encre; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(d.cx - d.R, d.cy); ctx.lineTo(d.cx + d.R, d.cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(d.cx, d.cy, 2.5, 0, 7); ctx.fillStyle = C.encre2; ctx.fill();
    texte(ctx, 'N(0,1)', d.cx + 6, d.cy - 5, C.encre2, 8.5, 'left', false);
    overlay(ctx, (m, s) => toDisk(d, m, s), gp, lp);
    texte(ctx, 'disk — the boundary = infinity', r.x + 6, r.y + 14, C.encre2, 10.5, 'left', false);
    texte(ctx, 'boundary at infinity ∂∞ = certainty', d.cx, d.cy + d.R + 13, C.encre2, 9, 'center', false);
    ctx.restore();
  }

  function draw() {
    const g = fit(cv); const ctx = g.ctx, W = g.W, Hp = g.Hpx;
    ctx.clearRect(0, 0, W, Hp);
    lay = layout(W, Hp);
    const gp = PHYS.geoPoints(P[0][0], P[0][1], P[1][0], P[1][1], 160);
    const lp = PHYS.linePoints(P[0][0], P[0][1], P[1][0], P[1][1], 160);
    drawHalf(ctx, lay.half, gp, lp);
    drawDisk(ctx, lay.disk, gp, lp);
    if (!lay.stack) { ctx.strokeStyle = C.filet; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2, 8); ctx.lineTo(W / 2, Hp - 8); ctx.stroke(); }

    const dGeo = PHYS.dVie(P[0][0], P[0][1], P[1][0], P[1][1]), dCh = PHYS.vieLengthPath(lp);
    mG.val.textContent = fmt(dGeo); mC.val.textContent = fmt(dCh);
    mS.val.textContent = Math.max(0, Math.round(100 * (1 - dGeo / dCh))) + ' %';
    mK.val.textContent = fmt(PHYS.curvE0(2, 1));
    texte(ctx, '● equal-cost steps crowd toward the boundary', 6, Hp - 6, C.energie, 9, 'left', false);
    texte(ctx, 'drag a belief (either panel)', W - 6, Hp - 6, C.encre2, 9, 'right', false);
  }

  reg(cv, draw);
  const vid = (root.closest('section[id]') || {}).id || 'geometry';
  observe(vid);
  anim(vid, () => {
    if (motion.ok) { bead += 0.0045 * beadDir; if (bead > 1) { bead = 1; beadDir = -1; } if (bead < 0) { bead = 0; beadDir = 1; } }
    draw();
  });
  return { redraw: draw };
}
