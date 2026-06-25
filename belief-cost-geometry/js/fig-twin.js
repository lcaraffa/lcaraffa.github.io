/* fig-twin.js — "A finite agent cannot hold a perfect twin."
   A finite machine watches a hidden state x* through a noisy sensor. Its coherent
   output is a BELIEF (the Bayes posterior) — a density over states, never a point.
   Certainty (the perfect twin, a centred Dirac) is denied TWICE, and both denials
   speak one language, Fisher information J = 1/sigma^2:
     wall 1 — observation : Var(x) >= 1/J  (Cramer-Rao); sigma shrinks only as sigma_obs/sqrt(n)
     wall 2 — physics     : erasing a nat costs >= kT  (Landauer); certainty => infinite energy
   Ambient: the belief sharpens as observations accrue, then resets — until you touch a control.
   Physics from phys.js (tested against the paper's closed forms). */
import { fit, reg } from './canvas.js';
import { observe, anim, motion } from './viewport.js';
import { PHYS } from './phys.js';
import { C, fmt, clamp, randn, el, slider, button, readout } from './util.js';
import { texte } from './plane.js';

export function mountTwin(root) {
  const XSTAR = 0.6, MU0 = 0, TAU0 = 3;        // hidden state; prior N(0, 3^2)
  const XMIN = -6, XMAX = 6, NMAX = 400;
  let nTarget = 12, sobs = 1.2, pool = [];
  let nShown = 1, autoplay = true;             // ambient until first interaction

  const drawPool = () => { pool = Array.from({ length: NMAX }, () => XSTAR + randn() * sobs); };
  drawPool();

  const cv = el('canvas', { height: 360, tabindex: '0',
    'aria-label': 'A hidden state, a noisy sensor, the observations, and the belief that forms — a density, never a point.' });
  const stage = el('div', { class: 'stage' }, [cv]);
  root.appendChild(stage);

  const stop = () => { autoplay = false; };
  const rN = slider({ min: 1, max: NMAX, step: 1, value: nTarget, accent: 'info', label: 'observations n' });
  const rS = slider({ min: 0.2, max: 3, step: 0.02, value: sobs, accent: 'energie', label: 'sensor noise σₒ' });
  const bRe = button('Resample', () => { stop(); drawPool(); draw(); });
  const bPlay = button('▶ Replay', () => { autoplay = true; nShown = 1; });
  root.appendChild(el('div', { class: 'controls' }, [rN.ctl, rS.ctl, bRe, bPlay]));

  const mS = readout('σ =', 'soudure'), mH = readout('H =', 'info'), mJ = readout('J =', 'energie');
  root.appendChild(el('div', { class: 'readouts' }, [mS.pill, mH.pill, mJ.pill]));

  rN.input.addEventListener('input', () => { stop(); nTarget = +rN.input.value; nShown = nTarget; draw(); });
  rS.input.addEventListener('input', () => { sobs = +rS.input.value; drawPool(); draw(); });

  const Xpx = (x, x0, w) => x0 + (x - XMIN) / (XMAX - XMIN) * w;

  function draw() {
    const g = fit(cv); const ctx = g.ctx, W = g.W, Hp = g.Hpx;
    ctx.clearRect(0, 0, W, Hp);
    const n = Math.max(1, Math.round(autoplay ? nShown : nTarget));
    const samp = pool.slice(0, n);
    const ybar = samp.reduce((a, b) => a + b, 0) / n;
    const { mn, sn } = PHYS.posterior(n, sobs, MU0, TAU0, ybar);

    const padL = 16, x0 = padL, w = W - padL - 16;
    const axisY = Math.round(Hp * 0.54);
    const topH = axisY - 26;
    const xs = Xpx(XSTAR, x0, w);

    const bumpUp = (mu, s, hmax, col, fill, lw, dash) => {
      const pk = PHYS.pdf(mu, mu, s), Y = x => axisY - PHYS.pdf(x, mu, s) / pk * hmax;
      ctx.save(); if (dash) ctx.setLineDash(dash);
      if (fill) { ctx.beginPath(); for (let px = 0; px <= w; px += 2) { const x = XMIN + px / w * (XMAX - XMIN);
          px === 0 ? ctx.moveTo(x0 + px, Y(x)) : ctx.lineTo(x0 + px, Y(x)); }
        ctx.lineTo(x0 + w, axisY); ctx.lineTo(x0, axisY); ctx.closePath(); ctx.fillStyle = col + '18'; ctx.fill(); }
      ctx.beginPath(); for (let px = 0; px <= w; px += 2) { const x = XMIN + px / w * (XMAX - XMIN);
        px === 0 ? ctx.moveTo(x0 + px, Y(x)) : ctx.lineTo(x0 + px, Y(x)); }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore();
    };

    // headings
    texte(ctx, 'the world · hidden state x★', x0, 14, C.encre2, 11, 'left', false);
    texte(ctx, 'noisy sensor  Q(y∣x)', x0 + w, 14, C.energie, 11, 'right', false);
    texte(ctx, 'the belief — Bayes posterior  p(x∣y₁…ₙ)', x0, 30, C.soudure, 11.5, 'left', false);

    // x* vertical
    ctx.strokeStyle = C.encre; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(xs, axisY - topH); ctx.lineTo(xs, axisY); ctx.stroke();

    // sensor likelihood (faint, dashed)
    bumpUp(XSTAR, sobs, topH * 0.5, C.energie, false, 1.3, [4, 3]);

    // histogram of samples (faint)
    { const bins = 44, cnt = new Array(bins).fill(0);
      samp.forEach(s => { const b = clamp(Math.floor((s - XMIN) / (XMAX - XMIN) * bins), 0, bins - 1); cnt[b]++; });
      const mx = Math.max(1, ...cnt);
      for (let b = 0; b < bins; b++) { const h = cnt[b] / mx * 30; ctx.fillStyle = C.info + '22';
        ctx.fillRect(x0 + b / bins * w, axisY - h, w / bins - 1, h); } }

    // prior ghost + the belief (protagonist)
    bumpUp(MU0, TAU0, topH * 0.86, C.encre2, false, 1, [2, 3]);
    bumpUp(mn, sn, topH * 0.86, C.soudure, true, 2.6);

    // the BARRED Dirac at x* : the perfect twin, excluded
    const dy = axisY - topH * 0.96;
    ctx.strokeStyle = C.encre; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(xs, axisY); ctx.lineTo(xs, dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xs - 4, dy + 3); ctx.lineTo(xs, dy); ctx.lineTo(xs + 4, dy + 3); ctx.stroke();
    ctx.strokeStyle = C.energie; ctx.lineWidth = 2; // the bar across it
    ctx.beginPath(); ctx.moveTo(xs - 13, dy + 22); ctx.lineTo(xs + 13, dy - 2); ctx.stroke();
    texte(ctx, 'the perfect twin (Dirac) — excluded', xs + 10, dy + 4, C.encre2, 9.5, 'left', false);

    // axis + sample rug
    ctx.strokeStyle = C.filet; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, axisY); ctx.lineTo(x0 + w, axisY); ctx.stroke();
    samp.forEach((s, i) => { const jx = Xpx(s, x0, w); ctx.strokeStyle = C.info + 'aa'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(jx, axisY); ctx.lineTo(jx, axisY - 5 - (i % 4) * 2); ctx.stroke(); });
    texte(ctx, n + ' observations', x0 + w, axisY - 4, C.info, 10.5, 'right', false);
    texte(ctx, 'prior', x0 + 4, axisY - 6, C.encre2, 9, 'left', false);

    // ----- the two walls -----
    const wallTop = axisY + 12, colW = w / 2;
    ctx.strokeStyle = C.filet; ctx.beginPath(); ctx.moveTo(x0, wallTop); ctx.lineTo(x0 + w, wallTop); ctx.stroke();
    const crFloor = Math.sqrt(PHYS.crFloorVar(sobs, n));   // sigma_obs / sqrt(n)

    // wall 1 — observation (Cramer-Rao)
    texte(ctx, 'wall 1 · observation  (Cramér–Rao)', x0, wallTop + 18, C.info, 11.5, 'left', false);
    const gx0 = x0 + 6, gw = colW - 30, trackY = wallTop + 40;
    const sc = v => clamp(v / TAU0, 0, 1) * gw;
    ctx.fillStyle = C.grille; ctx.fillRect(gx0, trackY, gw, 12);
    ctx.fillStyle = C.info + '55'; ctx.fillRect(gx0, trackY, sc(sn), 12);
    ctx.strokeStyle = C.okD; ctx.lineWidth = 2; ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(gx0 + sc(crFloor), trackY - 5); ctx.lineTo(gx0 + sc(crFloor), trackY + 17); ctx.stroke(); ctx.setLineDash([]);
    texte(ctx, 'σ = ' + fmt(sn), gx0, trackY - 6, C.info, 10, 'left', false);
    texte(ctx, '↑ floor  Var ≥ 1/J', gx0 + sc(crFloor) + 4, trackY + 30, C.okD, 9.5, 'left', false);
    texte(ctx, 'σ shrinks only as σₒ/√n', gx0, trackY + 46, C.encre2, 9.5, 'left', false);

    // wall 2 — physics (Landauer)
    const x2 = x0 + colW + 10;
    texte(ctx, 'wall 2 · physics  (Landauer)', x2, wallTop + 18, C.energie, 11.5, 'left', false);
    texte(ctx, 'pinning the belief costs ≥ kʙT per nat', x2, wallTop + 38, C.encre2, 9.5, 'left', false);
    const epn = PHYS.kBT(300) / 1e-21;
    texte(ctx, '≥ ' + epn.toFixed(1) + ' zJ / nat   (T = 300 K)', x2, wallTop + 54, C.energie, 10.5, 'left', false);
    texte(ctx, 'certainty ⇒ infinite energy', x2, wallTop + 70, C.energie, 9.5, 'left', false);

    // the one constraint
    texte(ctx, 'one constraint, read twice:  J = 1/σ²', x0 + w / 2, Hp - 7, C.soudure, 11.5, 'center', false);

    mS.val.textContent = fmt(sn); mH.val.textContent = fmt(PHYS.H(sn)) + ' nat'; mJ.val.textContent = fmt(PHYS.J(sn));
    rN.val.textContent = 'n = ' + n; rS.val.textContent = 'σₒ = ' + fmt(sobs);
  }

  reg(cv, draw);
  const vid = (root.closest('section[id]') || {}).id || 'problem';
  observe(vid);
  anim(vid, () => {
    if (autoplay && motion.ok) {
      nShown += Math.max(0.6, nShown * 0.04);
      if (nShown >= NMAX) nShown = 1;        // loop: build up, then start over
    }
    draw();
  });
  return { redraw: draw };
}
