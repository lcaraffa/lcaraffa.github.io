/* fig-dt.js — "A worked example: the digital twin of a field."
   Port of the companion's dt-field figure (belief-cost-geometry/js/figures/dt-field.js)
   onto this page's helpers (util.js slider/button/toggle/readout, .stage/.controls/
   .readouts CSS). EN only. Two regimes:
   LEARN (n): a fixed field h★(x), a FIXED pool of 40 point sensors; the n slider
   selects how much of that evidence the belief has read — a label. The photos are
   the kriging posteriors after k sensors; the orange thread joins them end to end
   (drip-fed), the violet arc is the same revision in one go.
   REVISE (two campaigns): two simultaneous surveys separated by a declared
   calibration offset — two confident beliefs that disagree. The cheapest revision
   opens up, traverses, re-tightens; the W₂ chord keeps its width and costs more.
   Beads mark 1 nat each: cheapest = fewest beads. d(A,B) = d(B,A), and the sensor
   ORDER is a gauge (shuffle it: the endpoints hold still). */
import { fit, reg } from './canvas.js';
import { PHYS } from './phys.js';
import { C, fmt, clamp, randn, el, slider, button, toggle, readout } from './util.js';
import { texte } from './plane.js';

/* ---- on-screen strings (descriptive; words mirrored by the page legend) ---- */
const S = {
  aria: 'A fixed field, a fixed sensor pool; the kriging belief on the left, the scalar slice in belief space on the right. Two regimes: learn, revise.',
  tabLearn: 'Learn (n)', tabRevise: 'Revise (two campaigns)',
  n: 'evidence looked at n (a label)', sobs: 'sensor noise s', ell: 'prior range ℓ', x0: 'scalar readout x₀',
  pin: 'Pin photo A', unpin: 'Unpin A', truth: 'reveal h★', resample: 'Another dataset',
  shuffle: 'Shuffle the order',
  pField: 'the field C — belief = kriging m(x) ± 2σ(x)',
  pFieldRev: 'the field C — two campaigns (declared calibration offset: +0.45 m)',
  pPlane: 'belief space — the scalar slice at x₀',
  pPlaneRev: 'belief space — revising between two confident surveys',
  boundary: 'σ = 0 · certainty at infinite cost-distance',
  used: 'read (n)', unused: 'in the pool, unread — the whole dataset is already there',
  static: 'n is a label: two photos, one distance',
  staticRev: 'two simultaneous surveys of one fixed field: d(A,B) = d(B,A)',
  photo: 'photo n', photoA: 'A (n=', prior: 'photo 0 · prior',
  double: 'rings n=5,10,20,40: doubling the evidence ≈ a constant step · ● = 1 nat',
  threadLeg: 'orange = drip-fed (one sensor order) · violet = in one go',
  orderCap: 'shuffle the order: the endpoints hold still',
  legendRev: 'violet = cheapest (Gaussian leaf) · dashed = W₂ chord · ● = 1 nat',
  open: 'open up',
  campA: 'campaign 2 · A', campB: 'campaign 1 · B',
  truthLab: 'h★ — the real field, fixed',
  stripGeo: 'geodesic', stripChord: 'W₂ chord', stripN: 'stills',
  stripCap: 'contact sheet: one intermediate belief per nat of route — the cheap route spends its nats opening up, and needs fewer of them',
  bud: 'budget spent b (nats)', arrived: 'arrived',
  mSig: 'σ(x₀) =', mStep: 'cost photo n−1→n =', mAB: 'd(A→B) = d(B→A) =', mJ: 'whole field Σₖ J(xₖ) =',
  mPath: 'drip-fed: n legs end to end =', mDirect: 'in one go (direct 0→n) =',
  mGeo: 'cheapest revision =', mCh: 'W₂ chord =', mSav: 'saved =', mFloor: 'entropy floor √(2c)|ΔH| =',
  mBud: 'equal spend, remaining:',
};

export function mountDT(root) {
  /* ---- the world (fixed) and the dataset (fixed pool) ------------------- */
  const NMAX = 40, GOLD = 0.6180339887498949;
  const HMIN = 0, HMAX = 2.4;                       // display range (metres)
  const MU0 = 1.15, AMP = 0.65;                     // GP prior: N(MU0, AMP²) pointwise
  const BIAS = 0.45;                                // declared calibration offset (campaign 2)
  const hstar = x => 1.15 + 0.42 * Math.sin(2 * Math.PI * 1.1 * x + 0.6)
                          + 0.25 * Math.sin(2 * Math.PI * 2.7 * x + 2.1);
  const SX = Array.from({ length: NMAX }, (_, i) => 0.03 + 0.94 * ((0.5 + (i + 1) * GOLD) % 1));
  let zNoise = SX.map(() => randn());               // fixed noise draws (rescaled by s)
  const SGN = 56;
  const SGRID = Array.from({ length: SGN }, (_, i) => i / (SGN - 1));
  let zSamp = [0, 1, 2].map(() => SGRID.map(() => randn()));
  const GRID = Array.from({ length: 96 }, (_, i) => i / 95);
  const JGRID = Array.from({ length: 8 }, (_, i) => 0.05 + 0.9 * i / 7);

  /* ---- state ------------------------------------------------------------- */
  let mode = 'learn', bud = 0;                      // bud: nats spent along each route (a budget)
  try { const q = new URLSearchParams(location.search);
    if (q.get('dtmode') === 'revise') mode = 'revise';
    const b = parseFloat(q.get('dtb')); if (isFinite(b)) bud = clamp(b, 0, 99);
  } catch (e) { /* headless */ }
  let n = 8, sobs = 0.25, ell = 0.18, x0 = 0.62;
  let showTruth = false, pin = null;                // pin = {n, m, s}
  let ord = Array.from({ length: NMAX }, (_, i) => i);   // sensor ORDER: a gauge
  let rB = null;                                    // budget slider (built after the caches)

  const ys = () => SX.map((x, i) => hstar(x) + sobs * zNoise[i]);
  const opts = () => ({ amp: AMP, ell, mu0: MU0 });
  const sub = (arr, k) => ord.slice(0, k).map(i => arr[i]);
  const slice = k => {                              // photo k : belief at x₀ after k sensors (in ord)
    const g = PHYS.gpPosterior(sub(SX, k), sub(ys(), k),
                               Array.from({ length: k }, () => sobs * sobs), [x0], opts());
    return { m: g.mean[0], s: Math.max(g.sd[0], 0.02) };
  };

  /* ---- caches ------------------------------------------------------------ */
  let post = null, samples = [], traj = [], fieldJ = 0;
  let rev = null;
  function recomputeField() {
    const yy = ys(), s2 = Array.from({ length: n }, () => sobs * sobs);
    post = PHYS.gpPosterior(sub(SX, n), sub(yy, n), s2, GRID, opts());
    samples = zSamp.map(z => PHYS.gpSample(sub(SX, n), sub(yy, n), s2, SGRID, opts(), z));
    fieldJ = PHYS.gpFieldJ(sub(SX, n), sub(yy, n), s2, JGRID, opts());
  }
  function recomputeTraj() { traj = Array.from({ length: NMAX + 1 }, (_, k) => slice(k)); }
  const cumOf = pts => { const c = [0];
    for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + 2 * PHYS.dHyp(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    return c; };
  const atCost = (pts, cum, target) => { let i = 1;
    while (i < cum.length && cum[i] < target) i++;
    return pts[Math.min(i, pts.length - 1)]; };
  function recomputeRevise() {
    const yy = ys(), s2 = Array.from({ length: NMAX }, () => sobs * sobs);
    const yyA = yy.map(y => y + BIAS);
    const gB = PHYS.gpPosterior(SX, yy, s2, GRID, opts());
    const gA = PHYS.gpPosterior(SX, yyA, s2, GRID, opts());       // same sd: kriging is value-blind
    const pA = PHYS.gpPosterior(SX, yyA, s2, [x0], opts());
    const pB = PHYS.gpPosterior(SX, yy, s2, [x0], opts());
    const A = { m: pA.mean[0], s: Math.max(pA.sd[0], 0.02) };
    const B = { m: pB.mean[0], s: Math.max(pB.sd[0], 0.02) };
    const gp = PHYS.geoPoints(A.m, A.s, B.m, B.s, 240);
    const lp = PHYS.linePoints(A.m, A.s, B.m, B.s, 400);
    const cumG = cumOf(gp), cumL = cumOf(lp);
    const dGeo = PHYS.dVie(A.m, A.s, B.m, B.s), dCh = cumL[cumL.length - 1];
    const floor = Math.sqrt(4) * Math.abs(Math.log(B.s / A.s));   // √(2c)|ΔH|, c=2; = 0 here (σ_A = σ_B)
    const stations = pts => { const cum = cumOf(pts), out = [];
      for (let k = 0; k <= Math.floor(cum[cum.length - 1]); k++) out.push(atCost(pts, cum, k));
      out.push(pts[pts.length - 1]); return out; };
    rev = { A, B, gp, lp, cumG, cumL, dGeo, dCh, floor,
            meanA: gA.mean, meanB: gB.mean, sd: gB.sd,
            stG: stations(gp), stL: stations(lp) };
    if (rB) { rB.input.max = Math.ceil(dCh * 10) / 10; bud = clamp(bud, 0, +rB.input.max); rB.input.value = bud; }
  }
  recomputeField(); recomputeTraj(); recomputeRevise();

  /* ---- DOM --------------------------------------------------------------- */
  const cv = el('canvas', { height: 470, tabindex: '0', 'aria-label': S.aria });
  const stage = el('div', { class: 'stage' }, [cv]);
  root.appendChild(stage);

  const bLearn = button(S.tabLearn, () => setMode('learn'));
  const bRevise = button(S.tabRevise, () => setMode('revise'));
  const rN = slider({ min: 0, max: NMAX, step: 1, value: n, accent: 'info', label: S.n });
  const rX = slider({ min: 0.02, max: 0.98, step: 0.01, value: x0, accent: 'energie', label: S.x0 });
  const bPin = button(S.pin, () => { pin = pin ? null : { n, ...traj[n] }; labels(); draw(); });
  const bShuf = button(S.shuffle, () => {
    for (let i = NMAX - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    pin = null; recomputeField(); recomputeTraj(); labels(); draw();
  });
  const tgT = toggle({ checked: false, label: S.truth });
  root.appendChild(el('div', { class: 'controls' }, [bLearn, bRevise, rN.ctl, rX.ctl, bPin, bShuf, tgT.wrap]));
  const rS = slider({ min: 0.05, max: 0.6, step: 0.01, value: sobs, accent: 'energie', label: S.sobs });
  const rL = slider({ min: 0.06, max: 0.6, step: 0.01, value: ell, accent: 'soudure', label: S.ell });
  rB = slider({ min: 0, max: Math.ceil(rev.dCh * 10) / 10, step: 0.05, value: clamp(bud, 0, rev.dCh), accent: 'soudure', label: S.bud });
  bud = +rB.input.value;
  const bRe = button(S.resample, () => { zNoise = SX.map(() => randn()); zSamp = zSamp.map(() => SGRID.map(() => randn()));
    pin = null; recomputeField(); recomputeTraj(); recomputeRevise(); labels(); draw(); });
  root.appendChild(el('div', { class: 'controls' }, [rS.ctl, rL.ctl, rB.ctl, bRe]));

  // two readout sets, toggled by mode
  const mSig = readout(S.mSig, 'encre'), mStep = readout(S.mStep, 'info'),
        mPath = readout(S.mPath, 'energie'), mAB = readout(S.mDirect, 'soudure'), mJ = readout(S.mJ, 'encre');
  const mGeo = readout(S.mGeo, 'soudure'), mCh = readout(S.mCh, 'info'),
        mSav = readout(S.mSav, 'encre'), mFloor = readout(S.mFloor, 'encre'), mBud = readout(S.mBud, 'energie');
  root.appendChild(el('div', { class: 'readouts' },
    [mSig.pill, mStep.pill, mPath.pill, mAB.pill, mJ.pill,
     mGeo.pill, mCh.pill, mSav.pill, mFloor.pill, mBud.pill]));

  function setMode(k) {
    mode = k;
    const learn = mode === 'learn';
    bLearn.classList.toggle('active', learn);
    bRevise.classList.toggle('active', !learn);
    rN.ctl.style.display = learn ? '' : 'none';
    bPin.style.display = learn ? '' : 'none';
    bShuf.style.display = learn ? '' : 'none';
    rB.ctl.style.display = learn ? 'none' : '';
    [mSig, mStep, mPath, mAB, mJ].forEach(p => p.pill.style.display = learn ? '' : 'none');
    [mGeo, mCh, mSav, mFloor, mBud].forEach(p => p.pill.style.display = learn ? 'none' : '');
    labels(); draw();
  }

  rN.input.addEventListener('input', () => { n = +rN.input.value; recomputeField(); labels(); draw(); });
  rX.input.addEventListener('input', () => { x0 = +rX.input.value; recomputeTraj(); recomputeRevise(); if (pin) pin = { n: pin.n, ...traj[pin.n] }; labels(); draw(); });
  rS.input.addEventListener('input', () => { sobs = +rS.input.value; pin = null; recomputeField(); recomputeTraj(); recomputeRevise(); labels(); draw(); });
  rL.input.addEventListener('input', () => { ell = +rL.input.value; pin = null; recomputeField(); recomputeTraj(); recomputeRevise(); labels(); draw(); });
  tgT.input.addEventListener('change', () => { showTruth = tgT.input.checked; draw(); });
  rB.input.addEventListener('input', () => { bud = +rB.input.value; labels(); draw(); });

  function labels() {
    rN.val.textContent = String(n);
    rX.val.textContent = fmt(x0);
    rS.val.textContent = fmt(sobs) + ' m';
    rL.val.textContent = fmt(ell);
    rB.val.textContent = fmt(bud) + ' nats';
    bPin.textContent = pin ? S.unpin : S.pin;
  }

  /* ---- layout + transforms ----------------------------------------------- */
  const MUL = 0.2, MUR = 2.1, SMAX = 0.85;          // half-plane window (μ = height)
  const STRIP_H = 96;                               // contact-sheet strip (revise, wide only)
  let lay = null;
  const layout = (W, Hp) => (W < 560)
    ? { stack: true, field: { x: 0, y: 0, w: W, h: Hp / 2 - 6 }, plane: { x: 0, y: Hp / 2 + 6, w: W, h: Hp / 2 - 6 } }
    : { stack: false, field: { x: 0, y: 0, w: W / 2 - 6, h: Hp }, plane: { x: W / 2 + 6, y: 0, w: W / 2 - 6, h: Hp } };
  const padL = 34, padR = 12, padT = 22, padB = 26;
  const Xf = (r, x) => r.x + padL + x * (r.w - padL - padR);
  const Yf = (r, h) => r.y + r.h - padB - ((h - HMIN) / (HMAX - HMIN)) * (r.h - padT - padB);
  const invXf = (r, px) => (px - r.x - padL) / (r.w - padL - padR);
  const Xp = (r, m) => r.x + padL + (m - MUL) / (MUR - MUL) * (r.w - padL - padR);
  const Yp = (r, s) => r.y + r.h - padB - (s / SMAX) * (r.h - padT - padB);

  /* ---- drag x₀ on the field panel ---------------------------------------- */
  let dragX0 = false;
  const at = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', ev => {
    const q = at(ev); if (!lay) return;
    const r = lay.field;
    if (q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h
        && Math.abs(q.x - Xf(r, x0)) < 16) {
      dragX0 = true; cv.setPointerCapture(ev.pointerId); ev.preventDefault();
    }
  });
  cv.addEventListener('pointermove', ev => {
    const q = at(ev); if (!lay) return;
    const r = lay.field;
    const near = q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h && Math.abs(q.x - Xf(r, x0)) < 16;
    cv.style.cursor = (dragX0 || near) ? 'ew-resize' : 'default';
    if (!dragX0) return;
    x0 = clamp(invXf(r, q.x), 0.02, 0.98); rX.input.value = x0;
    recomputeTraj(); recomputeRevise(); if (pin) pin = { n: pin.n, ...traj[pin.n] }; labels(); draw();
  });
  const up = () => dragX0 = false;
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  /* ---- drawing: the field panel ------------------------------------------- */
  function drawField(ctx, r) {
    const revise = mode === 'revise';
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1;
    [0.5, 1, 1.5, 2].forEach(h => { const y = Yf(r, h); ctx.beginPath(); ctx.moveTo(Xf(r, 0), y); ctx.lineTo(Xf(r, 1), y); ctx.stroke();
      texte(ctx, h + ' m', Xf(r, 0) - 4, y + 3, C.encre2, 8.5, 'right', false); });
    ctx.strokeStyle = C.filet; ctx.beginPath(); ctx.moveTo(Xf(r, 0), Yf(r, HMIN)); ctx.lineTo(Xf(r, 1), Yf(r, HMIN)); ctx.stroke();

    const mean = revise ? rev.meanB : post.mean, sd = revise ? rev.sd : post.sd;
    // kriging band m ± 2σ (campaign 1 in revise mode)
    ctx.beginPath();
    GRID.forEach((x, i) => { const y = Yf(r, mean[i] + 2 * sd[i]); i ? ctx.lineTo(Xf(r, x), y) : ctx.moveTo(Xf(r, x), y); });
    for (let i = GRID.length - 1; i >= 0; i--) ctx.lineTo(Xf(r, GRID[i]), Yf(r, mean[i] - 2 * sd[i]));
    ctx.closePath(); ctx.fillStyle = C.info + '1E'; ctx.fill();
    if (!revise) {
      ctx.strokeStyle = C.soudure + '55'; ctx.lineWidth = 1;
      samples.forEach(sp => { ctx.beginPath();
        SGRID.forEach((x, i) => { const y = Yf(r, sp[i]); i ? ctx.lineTo(Xf(r, x), y) : ctx.moveTo(Xf(r, x), y); }); ctx.stroke(); });
    }
    ctx.strokeStyle = C.info; ctx.lineWidth = 2.2; ctx.beginPath();
    GRID.forEach((x, i) => { const y = Yf(r, mean[i]); i ? ctx.lineTo(Xf(r, x), y) : ctx.moveTo(Xf(r, x), y); }); ctx.stroke();
    if (revise) {  // campaign 2 mean (same σ band, offset readings)
      ctx.strokeStyle = C.soudure; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.beginPath();
      GRID.forEach((x, i) => { const y = Yf(r, rev.meanA[i]); i ? ctx.lineTo(Xf(r, x), y) : ctx.moveTo(Xf(r, x), y); }); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (showTruth) { ctx.strokeStyle = C.encre; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.beginPath();
      GRID.forEach((x, i) => { const y = Yf(r, hstar(x)); i ? ctx.lineTo(Xf(r, x), y) : ctx.moveTo(Xf(r, x), y); }); ctx.stroke();
      ctx.setLineDash([]); texte(ctx, S.truthLab, Xf(r, 0.98), Yf(r, hstar(0.98)) - 6, C.encre, 9, 'right', false); }

    // the FIXED dataset: read sensors filled + error bar, the rest hollow
    const yy = ys();
    const used = new Set(ord.slice(0, revise ? NMAX : n));
    for (let i = 0; i < NMAX; i++) {
      const X = Xf(r, SX[i]), Y = Yf(r, yy[i]);
      if (used.has(i)) {
        ctx.strokeStyle = C.energie; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(X, Yf(r, yy[i] - sobs)); ctx.lineTo(X, Yf(r, yy[i] + sobs)); ctx.stroke();
        ctx.beginPath(); ctx.arc(X, Y, 3.4, 0, 7); ctx.fillStyle = C.energie; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(X, Y, 2.6, 0, 7); ctx.strokeStyle = C.encre2 + '77'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    // the scalar readout x₀ (drag it, or use its slider)
    const cx = Xf(r, x0);
    ctx.strokeStyle = C.energie; ctx.lineWidth = 1.6; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, Yf(r, HMIN)); ctx.lineTo(cx, r.y + padT); ctx.stroke(); ctx.setLineDash([]);
    if (revise) {   // the two campaign bars at x₀
      const dx = 5;
      [[rev.A, C.soudure, -dx, S.campA], [rev.B, C.info, dx, S.campB]].forEach(([p, col, off, lab]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(cx + off, Yf(r, p.m - 2 * p.s)); ctx.lineTo(cx + off, Yf(r, p.m + 2 * p.s)); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + off, Yf(r, p.m), 4.2, 0, 7); ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.stroke();
        texte(ctx, lab, cx + off + 7, Yf(r, p.m) + (off < 0 ? -8 : 12), col, 9.5, 'left', false);
      });
      // the belief AT x₀ transforming with the budget: sideways bells of the two
      // waypoints at equal spend b — geodesic opens right, chord opens left. The
      // marginal at x₀ is shown: the route lives on the leaf slice.
      if (bud > 0) {
        const pkRef = 1 / (Math.min(rev.A.s, rev.B.s) * Math.sqrt(2 * Math.PI));   // fixed scale: mass conserved
        [[rev.gp, rev.cumG, rev.dGeo, C.soudure, +1], [rev.lp, rev.cumL, rev.dCh, C.info, -1]].forEach(([pts, cum, total, col, side]) => {
          const p = atCost(pts, cum, Math.min(bud, total));   // [μ, σ] of the waypoint belief
          ctx.save(); ctx.beginPath();
          for (let i = 0; i <= 60; i++) {
            const h = p[0] - 3 * p[1] + (i / 60) * 6 * p[1];
            const X = cx + side * (PHYS.pdf(h, p[0], p[1]) / pkRef) * 40;
            i === 0 ? ctx.moveTo(X, Yf(r, h)) : ctx.lineTo(X, Yf(r, h));
          }
          ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.stroke();
          ctx.lineTo(cx, Yf(r, p[0] + 3 * p[1])); ctx.closePath(); ctx.fillStyle = col + '22'; ctx.fill();
          ctx.restore();
        });
      }
    } else {
      const curp = traj[n];
      ctx.strokeStyle = C.energie; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(cx, Yf(r, curp.m - 2 * curp.s)); ctx.lineTo(cx, Yf(r, curp.m + 2 * curp.s)); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, Yf(r, curp.m), 4.6, 0, 7); ctx.fillStyle = C.energie; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    texte(ctx, 'x₀', cx + 5, r.y + padT + 10, C.energie, 10.5, 'left', false);

    texte(ctx, revise ? S.pFieldRev : S.pField, r.x + 6, r.y + 13, C.encre2, 10.5, 'left', false);
    if (!revise) texte(ctx, '● ' + S.used + '   ○ ' + S.unused, r.x + padL, r.y + r.h - 8, C.encre2, 9, 'left', false);
    ctx.restore();
  }

  /* ---- drawing: the belief-space panel ------------------------------------ */
  // quantized tariff bands: σ halves at each edge → price 2/σ doubles; every band
  // has the SAME cost thickness (2·ln2 nats) — the boundary is an infinite stack
  function drawBands(ctx, r) {
    for (let k = 1, sHi = SMAX; k <= 7; k++) {
      const sLo = SMAX / Math.pow(2, k);
      const y1 = Yp(r, Math.min(sHi, SMAX)), y2 = Yp(r, sLo);
      ctx.fillStyle = 'rgba(109,40,217,' + Math.min(0.024 * k, 0.17) + ')';
      ctx.fillRect(Xp(r, MUL), y1, Xp(r, MUR) - Xp(r, MUL), y2 - y1);
      if (k <= 3) texte(ctx, '×' + Math.pow(2, k), Xp(r, MUR) - 4, y2 - 3, C.soudure + '99', 8.5, 'right', false);
      sHi = sLo;
    }
  }
  // integer-nat beads along a (μ,σ) polyline (2-nat spacing past 20)
  function drawBeads(ctx, r, pts, cum, col) {
    const total = cum[cum.length - 1], step = total > 20 ? 2 : 1;
    for (let target = step; target < total; target += step) {
      const p = atCost(pts, cum, target);
      ctx.beginPath(); ctx.arc(Xp(r, p[0]), Yp(r, p[1]), 2.4, 0, 7);
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  const path = (ctx, r, pts, col, lw, dash) => { ctx.save(); if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach((p, i) => { const X = Xp(r, p[0]), Y = Yp(r, p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); };

  function drawPlane(ctx, r) {
    const revise = mode === 'revise';
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    drawBands(ctx, r);
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1;
    [0.2, 0.4, 0.6, 0.8].forEach(s => { const y = Yp(r, s); ctx.beginPath(); ctx.moveTo(Xp(r, MUL), y); ctx.lineTo(Xp(r, MUR), y); ctx.stroke();
      texte(ctx, 'σ=' + s, Xp(r, MUL) + 2, y - 3, C.encre2, 8.5, 'left', false); });
    const yb = Yp(r, 0); ctx.strokeStyle = C.encre; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(Xp(r, MUL), yb); ctx.lineTo(Xp(r, MUR), yb); ctx.stroke();
    texte(ctx, S.boundary, r.x + r.w / 2, yb - 5, C.encre2, 9.5, 'center', false);

    if (revise) {
      path(ctx, r, rev.lp, C.info, 1.6, [5, 4]);
      path(ctx, r, rev.gp, C.soudure, 2.4);
      drawBeads(ctx, r, rev.lp, rev.cumL, C.info);
      drawBeads(ctx, r, rev.gp, rev.cumG, C.soudure);
      // apex: the cheapest revision opens up
      let apex = rev.gp[0]; rev.gp.forEach(p => { if (p[1] > apex[1]) apex = p; });
      texte(ctx, '↑ ' + S.open, Xp(r, apex[0]), Yp(r, apex[1]) - 7, C.soudure, 9.5, 'center', false);
      // equal-spend travelers: the same b nats along each route
      if (bud > 0) {
        [[rev.gp, rev.cumG, rev.dGeo, C.soudure], [rev.lp, rev.cumL, rev.dCh, C.info]].forEach(([pts, cum, total, col]) => {
          const p = atCost(pts, cum, Math.min(bud, total));
          const X = Xp(r, p[0]), Y = Yp(r, p[1]);
          ctx.beginPath(); ctx.arc(X, Y, 4.4, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.stroke();
          if (bud >= total) texte(ctx, '✓ ' + S.arrived, X, Y - 20, col, 9, 'center', false);
        });
      }
      // endpoints; labels extend OUTWARD (A carries the +offset: rightmost dot)
      const aRight = rev.A.m >= rev.B.m;
      [[rev.A, C.soudure, S.campA, aRight ? 'left' : 'right'],
       [rev.B, C.info, S.campB, aRight ? 'right' : 'left']].forEach(([p, col, lab, side]) => {
        const X = Xp(r, p.m), Y = Yp(r, p.s);
        ctx.beginPath(); ctx.arc(X, Y, 5.2, 0, 7); ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        texte(ctx, lab, side === 'left' ? X + 8 : X - 8, Y - 9, col, 10, side, false);
      });
      texte(ctx, S.pPlaneRev, r.x + 6, r.y + 13, C.encre2, 10.5, 'left', false);
      texte(ctx, S.legendRev, r.x + padL, r.y + r.h - 8, C.encre2, 8.5, 'left', false);
      ctx.restore();
      return;
    }

    // LEARN mode: geodesic (pin|photo 0)→current + 1-nat beads, photo family, thread
    const A = pin ?? { n: 0, ...traj[0] }, B = traj[n];
    const sep = Math.abs(A.m - B.m) > 1e-6 || Math.abs(A.s - B.s) > 1e-6;
    if (sep) {
      const gp = PHYS.geoPoints(A.m, A.s, B.m, B.s, 200);
      const cum = cumOf(gp);
      path(ctx, r, gp, C.soudure, 2.2);
      drawBeads(ctx, r, gp, cum, C.soudure);
    }
    // the photos k = 0..NMAX (the whole static family): the drip-fed thread —
    // paid portion (k ≤ n, what the Σ meter bills) solid, the rest faint
    const seg = (from, to, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let k = from; k <= to; k++) { const X = Xp(r, traj[k].m), Y = Yp(r, traj[k].s);
        k === from ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke(); };
    if (n >= 1) seg(0, n, C.energie + 'BB', 1.4);
    if (n < NMAX) seg(n, NMAX, C.energie + '2E', 1);
    // doubling rings + the photo dots
    traj.forEach((p, k) => {
      const X = Xp(r, p.m), Y = Yp(r, p.s);
      ctx.beginPath(); ctx.arc(X, Y, k === 0 ? 3 : 2, 0, 7);
      ctx.fillStyle = k <= n ? C.energie : C.energie + '44'; ctx.fill();
      if ([5, 10, 20, 40].includes(k)) { ctx.beginPath(); ctx.arc(X, Y, 5, 0, 7);
        ctx.strokeStyle = C.encre2; ctx.lineWidth = 1; ctx.stroke(); }
    });
    texte(ctx, S.prior, Xp(r, traj[0].m) + 7, Yp(r, traj[0].s) - 6, C.encre2, 9, 'left', false);
    if (pin) { const X = Xp(r, pin.m), Y = Yp(r, pin.s);
      ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.strokeStyle = C.soudure; ctx.lineWidth = 2.4; ctx.stroke();
      texte(ctx, S.photoA + pin.n + ')', X + 9, Y - 7, C.soudure, 10.5, 'left', false); }
    const X = Xp(r, B.m), Y = Yp(r, B.s);
    ctx.beginPath(); ctx.arc(X, Y, 5.4, 0, 7); ctx.fillStyle = C.energie; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    texte(ctx, S.photo.replace('n', String(n)), X + 8, Y + 12, C.energie, 10.5, 'left', false);

    texte(ctx, S.pPlane, r.x + 6, r.y + 13, C.encre2, 10.5, 'left', false);
    texte(ctx, S.threadLeg, r.x + padL, r.y + r.h - 17, C.encre2, 8.5, 'left', false);
    texte(ctx, '◦ ' + S.double, r.x + padL, r.y + r.h - 7, C.encre2, 8.5, 'left', false);
    ctx.restore();
  }

  /* ---- drawing: the contact sheet (revise, wide layouts) ------------------ */
  function drawStrip(ctx, W, y0) {
    const rows = [[S.stripGeo, rev.stG, rev.dGeo, C.soudure], [S.stripChord, rev.stL, rev.dCh, C.info]];
    const labW = 128, rh = (STRIP_H - 14) / 2;
    const all = rev.stG.concat(rev.stL);
    const sMax = Math.max(...all.map(p => p[1]));
    const xlo = Math.min(...all.map(p => p[0])) - 2.5 * sMax, xhi = Math.max(...all.map(p => p[0])) + 2.5 * sMax;
    const peakMax = 1 / (Math.min(...all.map(p => p[1])) * Math.sqrt(2 * Math.PI));
    texte(ctx, S.stripCap, 6, y0 + 9, C.encre2, 9, 'left', false);
    rows.forEach(([lab, st, total, col], ri) => {
      const ry = y0 + 14 + ri * rh;
      texte(ctx, lab + ' · ' + st.length + ' ' + S.stripN + ' (' + fmt(total, 1) + ' nats)', 6, ry + rh / 2 + 3, col, 9, 'left', false);
      const bw = Math.min(40, (W - labW - 8) / st.length);
      const curK = bud > 0 ? Math.min(Math.floor(Math.min(bud, total)), st.length - 1) : -1;
      st.forEach((p, k) => {
        const bx = labW + k * bw;
        if (k === curK) { ctx.strokeStyle = C.energie; ctx.lineWidth = 1.2;
          ctx.strokeRect(bx + 0.5, ry + 1, bw - 3, rh - 4); }
        ctx.strokeStyle = col + (k === 0 || k === st.length - 1 ? 'FF' : '99'); ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let px = 0; px <= bw - 4; px += 1) {
          const x = xlo + (px / (bw - 4)) * (xhi - xlo);
          const Y = ry + rh - 3 - (PHYS.pdf(x, p[0], p[1]) / peakMax) * (rh - 6);
          px === 0 ? ctx.moveTo(bx + 2 + px, Y) : ctx.lineTo(bx + 2 + px, Y);
        }
        ctx.stroke();
      });
    });
  }

  function draw() {
    const g = fit(cv), ctx = g.ctx, W = g.W, Hp = g.Hpx;
    ctx.clearRect(0, 0, W, Hp);
    const revise = mode === 'revise';
    const stripH = (revise && W >= 560) ? STRIP_H : 0;
    lay = layout(W, Hp - 18 - stripH);                // bottom caption strip + contact sheet
    drawField(ctx, lay.field);
    drawPlane(ctx, lay.plane);
    if (!lay.stack) { ctx.strokeStyle = C.filet; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2, 8); ctx.lineTo(W / 2, Hp - 24 - stripH); ctx.stroke(); }
    if (stripH) drawStrip(ctx, W, Hp - 18 - stripH + 4);
    texte(ctx, revise ? S.staticRev : (S.static + ' · ' + S.orderCap), 6, Hp - 5, C.encre2, 9.5, 'left', false);

    if (revise) {
      mGeo.val.textContent = fmt(rev.dGeo) + ' nats';
      mCh.val.textContent = fmt(rev.dCh) + ' nats';
      mSav.val.textContent = Math.max(0, Math.round(100 * (1 - rev.dGeo / rev.dCh))) + ' %';
      mFloor.val.textContent = fmt(rev.floor) + ' · ' + fmt(rev.dGeo) + ' nats';
      const restG = Math.max(0, rev.dGeo - bud), restL = Math.max(0, rev.dCh - bud);
      mBud.val.textContent = (restG > 0 ? fmt(restG) : '✓ 0') + ' · W₂ ' + (restL > 0 ? fmt(restL) : '✓ 0') + ' nats';
    } else {
      const cp = traj[n];
      mSig.val.textContent = fmt(cp.s) + ' m';
      const step = n >= 1 ? PHYS.dVie(traj[n - 1].m, traj[n - 1].s, cp.m, cp.s) : 0;
      mStep.val.textContent = fmt(step) + ' nats';
      // drip-fed bill: the n one-leg revisions end to end (each leg billed at its
      // own two-point distance; the SUM exceeds the direct one: triangle inequality)
      let pathSum = 0;
      for (let k = 1; k <= n; k++) pathSum += PHYS.dVie(traj[k - 1].m, traj[k - 1].s, traj[k].m, traj[k].s);
      const dDirect = PHYS.dVie(traj[0].m, traj[0].s, cp.m, cp.s);
      mPath.val.textContent = fmt(pathSum) + ' nats' +
        (n >= 2 && dDirect > 1e-6 ? ' (×' + fmt(pathSum / dDirect, 1) + ')' : '');
      mPath.key.textContent = S.mPath.replace('n ', n + ' ');
      // direct revision 0→n (the same endpoints in one go); a pin overrides the start
      const A = pin ?? { ...traj[0], n: 0 };
      const dAB = PHYS.dVie(A.m, A.s, cp.m, cp.s);   // symmetric by construction
      mAB.val.textContent = fmt(dAB) + ' nats';
      mAB.key.textContent = pin ? S.mAB : S.mDirect;
      mJ.val.textContent = fmt(fieldJ, 0);
    }
  }

  setMode(mode);
  reg(cv, draw);
  draw();
}
