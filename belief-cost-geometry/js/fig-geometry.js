/* fig-geometry.js — "The geometry the cost imposes."
   Postulate 0 makes the cost a length on optimal transport (the arena); Postulate 1
   makes the price uniform — one nat costs the same length everywhere. Together they
   force a HYPERBOLIC leaf of beliefs: certainty (σ → 0) is pushed to INFINITE
   cost-distance — the boundary ∂∞. Shown in two models of the same leaf:
     · half-plane — the boundary is the bottom edge;
     · Poincaré disk — certainty is the whole boundary, at infinity.
   The cheapest way to change one's mind is the geodesic (open up → traverse → close),
   not the straight chord. Equal-cost graduations make uniform pricing visible: they crowd
   toward the boundary. Two travelers (one per route) spend the SAME budget of nats; the
   geodesic one arrives first, the chord one still owes — the chord costs more. BELOW the
   panels, a contact sheet shows the belief ITSELF — a Gaussian bell — one snapshot per nat
   of cost along each route: the geodesic opens up (mass conserved), the chord slides;
   the pricier chord simply needs about twice as many snapshots. Drag a belief in either
   panel. Distances/curvature from phys.js. */
import { fit, reg } from './canvas.js';
import { observe, anim, motion } from './viewport.js';
import { PHYS } from './phys.js';
import { C, fmt, clamp, el, toggle, slider, readout } from './util.js';
import { texte } from './plane.js';

export function mountGeometry(root) {
  let showRelief = true, playing = true;
  const MU = 4, SMAX = 3.4, STRIP_H = 150;
  const DEF = () => [[-2.4, 0.5], [2.4, 0.5]];   // confident & far apart → big detour saving
  let P = DEF();
  let bud = 0, budDir = 1;                          // budget of nats spent on each route
  let dGeoCur = 1, dChCur = 1;                      // current route totals (updated in draw)

  const cv = el('canvas', { height: 380 + STRIP_H, tabindex: '0',
    'aria-label': 'The same beliefs in two models of one hyperbolic leaf (Poincaré half-plane and disk); two travelers spend the same budget of nats, and the geodesic one arrives before the chord one, so the chord costs more. Below, a contact sheet shows the belief itself — a Gaussian bell — one snapshot per nat along each route: the geodesic opens up then re-tightens, the chord only slides and needs about twice as many snapshots.' });
  const stage = el('div', { class: 'stage' }, [cv]);
  root.appendChild(stage);

  const tgR = toggle({ checked: true, label: 'cost relief' });
  const tgA = toggle({ checked: true, label: 'animate' });
  const rP = slider({ min: 0, max: 20, step: 0.1, value: 0, accent: 'energie', label: 'budget spent (nats)' });
  root.appendChild(el('div', { class: 'controls' }, [tgR.wrap, tgA.wrap, rP.ctl]));
  tgR.input.addEventListener('change', () => { showRelief = tgR.input.checked; draw(); });
  tgA.input.addEventListener('change', () => { playing = tgA.input.checked; draw(); });
  rP.input.addEventListener('input', () => { playing = false; tgA.input.checked = false; bud = +rP.input.value; draw(); });

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

  /* cost cumulative along a (μ,σ) polyline — 2·d_hyp is the exact metric length element */
  const segCost = (a, b) => 2 * PHYS.dHyp(a[0], a[1], b[0], b[1]);
  const cumOf = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + segCost(pts[i - 1], pts[i]); return c; };
  const atFrac = (pts, cum, f) => { if (f <= 0) return pts[0]; const t = cum[cum.length - 1] * f; let i = 1; while (i < cum.length && cum[i] < t) i++; return pts[Math.min(i, pts.length - 1)]; };
  const atCost = (pts, cum, c) => atFrac(pts, cum, cum[cum.length - 1] > 0 ? c / cum[cum.length - 1] : 0);
  const npdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

  function overlay(ctx, pfn, gp, lp, cumG, cumL) {
    const path = (pts, col, lw, dash) => { ctx.save(); if (dash) ctx.setLineDash(dash); ctx.beginPath();
      pts.forEach((p, i) => { const q = pfn(p[0], p[1]); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };
    path(lp, C.info, 1.6, [5, 4]);
    path(gp, C.soudure, 2.4);
    // equal-cost graduations on the geodesic
    const total = cumG[cumG.length - 1], K = 12;
    for (let j = 1; j < K; j++) { const p = atFrac(gp, cumG, j / K), q = pfn(p[0], p[1]);
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.4, 0, 7); ctx.fillStyle = C.soudure; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
    // apex "open up" — only when the geodesic actually bulges above both endpoints
    let apex = gp[0]; gp.forEach(p => { if (p[1] > apex[1]) apex = p; });
    if (apex[1] > Math.max(gp[0][1], gp[gp.length - 1][1]) + 0.03) {
      const qa = pfn(apex[0], apex[1]); texte(ctx, '↑ open up', qa.x, qa.y - 7, C.soudure, 9.5, 'center', false);
    }
    // two travelers, same budget of nats: white disc rimmed in its route's colour
    const traveler = (pts, cum, tot, ring) => {
      if (tot <= 0) return; const p = atCost(pts, cum, Math.min(bud, tot)), q = pfn(p[0], p[1]);
      ctx.beginPath(); ctx.arc(q.x, q.y, 4.6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = ring; ctx.lineWidth = 2.4; ctx.stroke();
      if (bud >= tot - 1e-6) texte(ctx, '✓', q.x, q.y - 8, ring, 10, 'center', false);
    };
    traveler(lp, cumL, cumL[cumL.length - 1], C.info);
    traveler(gp, cumG, total, C.soudure);
    // the two beliefs
    [[0, C.soudure, 'p₀'], [1, C.info, 'p₁']].forEach(([i, col, lab]) => { const q = pfn(P[i][0], P[i][1]);
      ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      texte(ctx, lab, q.x + 7, q.y - 6, col, 11, 'left', false); });
  }

  function drawHalf(ctx, r, gp, lp, cumG, cumL) {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    if (showRelief) for (let s = 0.06; s <= SMAX; s += 0.06) { const y = Yh(r, s), y2 = Yh(r, Math.max(s - 0.06, 0));
      ctx.fillStyle = 'rgba(109,40,217,' + clamp(1 / (s * s) / 120, 0, 0.20) + ')'; ctx.fillRect(Xh(r, -MU), y, Xh(r, MU) - Xh(r, -MU), y2 - y); }
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1;
    [0.5, 1, 2, 3].forEach(s => { const y = Yh(r, s); ctx.beginPath(); ctx.moveTo(Xh(r, -MU), y); ctx.lineTo(Xh(r, MU), y); ctx.stroke();
      texte(ctx, 'σ=' + s, Xh(r, -MU) + 2, y - 3, C.encre2, 8.5, 'left', false); });
    const yb = Yh(r, 0); ctx.strokeStyle = C.encre; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(Xh(r, -MU), yb); ctx.lineTo(Xh(r, MU), yb); ctx.stroke();
    texte(ctx, 'the boundary ∂∞ · certainty σ=0 (infinite cost-distance)', r.x + r.w / 2, yb - 5, C.encre2, 9.5, 'center', false);
    overlay(ctx, (m, s) => ({ x: Xh(r, m), y: Yh(r, s) }), gp, lp, cumG, cumL);
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

  function drawDisk(ctx, r, gp, lp, cumG, cumL) {
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    const d = diskOf(r);
    if (showRelief) drawTiling(ctx, d);
    ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R, 0, 7); ctx.strokeStyle = C.encre; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(d.cx - d.R, d.cy); ctx.lineTo(d.cx + d.R, d.cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(d.cx, d.cy, 2.5, 0, 7); ctx.fillStyle = C.encre2; ctx.fill();
    texte(ctx, 'N(0,1)', d.cx + 6, d.cy - 5, C.encre2, 8.5, 'left', false);
    overlay(ctx, (m, s) => toDisk(d, m, s), gp, lp, cumG, cumL);
    texte(ctx, 'disk — the boundary = infinity', r.x + 6, r.y + 14, C.encre2, 10.5, 'left', false);
    texte(ctx, 'boundary at infinity ∂∞ = certainty', d.cx, d.cy + d.R + 13, C.encre2, 9, 'center', false);
    ctx.restore();
  }

  /* ---- the contact sheet: the belief itself, one snapshot per nat of cost ----
     Same rendering as the worked example's "Revise" strip: a shared world-window so
     each bell sits at its own μ (it slides) and mass is conserved (peak ∝ 1/σ); one
     cell per nat, so the pricier chord row is visibly ~twice as long as the geodesic. */
  const statNat = (pts, cum) => { const total = cum[cum.length - 1]; if (total <= 0) return [pts[0]];
    const out = []; for (let k = 0; k <= Math.floor(total); k++) out.push(atCost(pts, cum, k));
    out.push(pts[pts.length - 1]); return out; };

  function drawStrip(ctx, W, y0, H, gp, lp, cumG, cumL) {
    const stG = statNat(gp, cumG), stL = statNat(lp, cumL);
    const dGeo = cumG[cumG.length - 1], dCh = cumL[cumL.length - 1];
    const all = stG.concat(stL);
    const sMax = Math.max(...all.map(p => p[1])), sMin = Math.min(...all.map(p => p[1]));
    const xlo = Math.min(...all.map(p => p[0])) - 2.5 * sMax, xhi = Math.max(...all.map(p => p[0])) + 2.5 * sMax;
    const peakMax = npdf(0, 0, sMin);
    const labW = 96, rh = (H - 22) / 2;
    const geoBulges = Math.max(...stG.map(p => p[1])) > Math.max(stG[0][1], stG[stG.length - 1][1]) + 0.03;

    ctx.strokeStyle = C.filet; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, y0 + 2.5); ctx.lineTo(W - 6, y0 + 2.5); ctx.stroke();
    texte(ctx, 'the belief itself — one snapshot per nat of cost. The straight chord needs about twice as many snapshots: it costs more.', 6, y0 + 14, C.encre2, 9.5, 'left', false);

    const rows = [
      { st: stG, col: C.soudure, total: dGeo, lab: geoBulges ? 'geodesic · opens up' : 'geodesic' },
      { st: stL, col: C.info, total: dCh, lab: 'chord · never opens up' },
    ];
    rows.forEach(({ st, col, total, lab }, ri) => {
      const ry = y0 + 22 + ri * rh, baseY = ry + rh - 8;
      texte(ctx, lab, 6, ry + 13, col, 9, 'left', false);
      texte(ctx, st.length + ' bells · ' + fmt(total, 1) + ' nats', 6, ry + 25, C.encre2, 8.5, 'left', false);
      const bw = Math.min(40, (W - labW - 8) / st.length);
      const curK = Math.min(Math.round(bud), st.length - 1);
      // row baseline (its length shows the route's cost)
      ctx.strokeStyle = C.filet; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(labW, baseY + 0.5); ctx.lineTo(labW + st.length * bw, baseY + 0.5); ctx.stroke();
      st.forEach((p, k) => {
        const bx = labW + k * bw, cur = k === curK;
        if (cur) { ctx.strokeStyle = C.energie; ctx.lineWidth = 1.2; ctx.strokeRect(bx + 0.5, ry + 3, bw - 2, baseY - ry - 3); }
        ctx.strokeStyle = cur ? col : col + (k === 0 || k === st.length - 1 ? 'CC' : '80');
        ctx.lineWidth = cur ? 1.7 : 1;
        ctx.beginPath();
        const N = 40;
        for (let i = 0; i <= N; i++) { const x = xlo + (i / N) * (xhi - xlo);
          const X = bx + 2 + (i / N) * (bw - 4), Y = baseY - (npdf(x, p[0], p[1]) / peakMax) * (rh - 18);
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
        ctx.stroke();
      });
      // the geodesic finishes first: mark it "done" where the chord is still going
      if (ri === 0 && bud >= total - 1e-6 && bud < dCh) texte(ctx, '✓ arrived', labW + st.length * bw + 6, baseY - 2, col, 8.5, 'left', false);
    });
  }

  function draw() {
    const g = fit(cv); const ctx = g.ctx, W = g.W, Hp = g.Hpx;
    ctx.clearRect(0, 0, W, Hp);
    const panelsH = Hp - STRIP_H;
    lay = layout(W, panelsH);
    const gp = PHYS.geoPoints(P[0][0], P[0][1], P[1][0], P[1][1], 160);
    const lp = PHYS.linePoints(P[0][0], P[0][1], P[1][0], P[1][1], 160);
    const cumG = cumOf(gp), cumL = cumOf(lp);
    dGeoCur = cumG[cumG.length - 1]; dChCur = cumL[cumL.length - 1];
    drawHalf(ctx, lay.half, gp, lp, cumG, cumL);
    drawDisk(ctx, lay.disk, gp, lp, cumG, cumL);
    if (!lay.stack) { ctx.strokeStyle = C.filet; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2, 8); ctx.lineTo(W / 2, panelsH - 8); ctx.stroke(); }

    mG.val.textContent = fmt(dGeoCur); mC.val.textContent = fmt(dChCur);
    mS.val.textContent = Math.max(0, Math.round(100 * (1 - dGeoCur / dChCur))) + ' %';
    mK.val.textContent = fmt(PHYS.curvE0(2, 1));
    // keep the budget slider ranged to the costlier route
    const mx = Math.max(0.1, Math.ceil(dChCur * 10) / 10);
    if (+rP.input.max !== mx) rP.input.max = mx;
    bud = clamp(bud, 0, mx);
    rP.val.textContent = fmt(bud) + ' nats';
    texte(ctx, '● equal-cost steps crowd toward the boundary', 6, panelsH - 6, C.energie, 9, 'left', false);
    texte(ctx, 'drag a belief (either panel)', W - 6, panelsH - 6, C.encre2, 9, 'right', false);

    drawStrip(ctx, W, panelsH, STRIP_H, gp, lp, cumG, cumL);
  }

  reg(cv, draw);
  const vid = (root.closest('section[id]') || {}).id || 'geometry';
  observe(vid);
  anim(vid, () => {
    if (!(playing && motion.ok)) return;              // paused / reduced-motion: redraws come from input
    const span = dChCur > 0 ? dChCur : 1;
    bud += (span / 240) * budDir;
    if (bud >= span) { bud = span; budDir = -1; } if (bud <= 0) { bud = 0; budDir = 1; }
    rP.input.value = bud;
    draw();
  });
  draw();
  return { redraw: draw };
}
