/* ============================================================================
   PHYS — closed forms for the transport-based geometry of belief-cost (faithful to main_en_v20b).
   Gaussian dictionary + v26 additions (Otto, cost metric, three characterizations,
   gauge). No DOM dependency: testable under Node (import) and in the browser.
   Every displayed number in the app comes from here; tests/test-phys.mjs pins these
   to the paper's closed forms and to companion/verify_*.py.
   ========================================================================= */
export const PHYS = (function () {
  const SIG_MIN = 1e-3;                       // certainty is never reached

  // ---- Gaussian dictionary ------------------------------------------------
  const H    = s => 0.5 * Math.log(2 * Math.PI * Math.E * s * s);   // entropy (nats)
  const J    = s => 1 / (s * s);                                    // Fisher info
  const Sdot = s => 2 / (s * s);             // maintenance cost (= 2J, kB=1)
  const U    = (s, c = 2, alpha = 1) => c * Math.pow(1 / (s * s), alpha); // relief U = c·J^α
  const pdf  = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const NAT_IN_BITS = 1 / Math.log(2);       // 1 nat = log2(e) ≈ 1.4427 bit

  // ---- forgetting (de Bruijn / diffusive ageing) --------------------------
  const forget = (s, D, dt) => Math.sqrt(s * s + 2 * D * dt);   // σ²(t+dt)=σ²+2Ddt
  const dHdt   = (s, D) => D * J(s);                            // dH/dt = D·J
  const tau    = (s, D) => s * s / (2 * D);                     // ageing time of σ

  // ---- the two rulers -----------------------------------------------------
  const dW2axis  = (s0, s1) => Math.abs(s1 - s0);                  // bare transport (axis)
  const dVieAxis = (s0, s1) => 2 * Math.abs(Math.log(s1 / s0));    // = 2|ΔH|
  const walker   = (s0, v, t) => s0 * Math.exp(-v * t / 2);        // constant cost-speed

  // ---- belief plane: Poincaré half-plane (pure relief) --------------------
  const dHyp = (m0, s0, m1, s1) => {
    const q = ((m1 - m0) ** 2 + (s1 - s0) ** 2) / (2 * s0 * s1);
    return Math.acosh(1 + q);
  };
  const dVie = (m0, s0, m1, s1) => 2 * dHyp(m0, s0, m1, s1);
  const dW2  = (m0, s0, m1, s1) => Math.hypot(m1 - m0, s1 - s0);

  // geodesic: half-circle centred on σ=0 (vertical segment if μ0=μ1)
  const geodesic = (m0, s0, m1, s1) => {
    if (Math.abs(m1 - m0) < 1e-9) return { vertical: true, m: m0, s0, s1 };
    const mc = (m1 * m1 - m0 * m0 + s1 * s1 - s0 * s0) / (2 * (m1 - m0));
    const R  = Math.hypot(m0 - mc, s0);
    const a0 = Math.atan2(s0, m0 - mc), a1 = Math.atan2(s1, m1 - mc);
    return { vertical: false, mc, R, a0, a1 };
  };
  const geoPoints = (m0, s0, m1, s1, n = 120) => {
    const g = geodesic(m0, s0, m1, s1), pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (g.vertical) pts.push([g.m, s0 + (s1 - s0) * t]);
      else { const a = g.a0 + (g.a1 - g.a0) * t;
             pts.push([g.mc + g.R * Math.cos(a), g.R * Math.sin(a)]); }
    }
    return pts;
  };
  const linePoints = (m0, s0, m1, s1, n = 400) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([m0 + (m1 - m0) * t, Math.max(s0 + (s1 - s0) * t, SIG_MIN)]);
    }
    return pts;
  };
  // Fisher–Rao geodesic between two 1D Gaussians, in (μ,σ) coordinates.
  // FR metric on Gaussians is ds² = (dμ² + 2dσ²)/σ²; with τ = σ√2 it becomes the
  // standard half-plane (dμ²+dτ²)/τ² (up to a constant), whose geodesics are the
  // semicircles centred on τ=0. So map σ→σ√2, take the half-plane geodesic, map back.
  const SQRT2 = Math.SQRT2;
  const frGeoPoints = (m0, s0, m1, s1, n = 120) =>
    geoPoints(m0, s0 * SQRT2, m1, s1 * SQRT2, n).map(([m, tau]) => [m, tau / SQRT2]);
  // cost length of a polyline under relief U = c·J^α (= ∫ √(2(e+U)) |γ̇|)
  const costLenPath = (pts, e = 0, c = 2, alpha = 1) => {
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const sm = Math.max(0.5 * (a[1] + b[1]), SIG_MIN);
      const f = 2 * (e + c * Math.pow(1 / (sm * sm), alpha));
      L += Math.sqrt(f) * Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return L;
  };
  // legacy alias: pure life length (U = 2J, e=0)
  const vieLengthPath = pts => costLenPath(pts, 0, 2, 1);

  // ---- inference chain: Gaussian Bayes posterior --------------------------
  // prior N(mu0, tau0²), sensor noise σobs², n i.i.d. draws with mean ybar
  const posterior = (n, sobs, mu0 = 0, tau0 = 3, ybar = 0) => {
    const prec = 1 / (tau0 * tau0) + n / (sobs * sobs);
    const sn = Math.sqrt(1 / prec);
    const mn = (mu0 / (tau0 * tau0) + n * ybar / (sobs * sobs)) / prec;
    return { mn, sn };
  };
  const crFloorVar = (sobs, n) => (sobs * sobs) / n;   // Cramér–Rao floor on the mean

  // ---- Fisher information internals ---------------------------------------
  const fisherIntegrand = (x, m, s) => ((x - m) ** 2 / (s ** 4)) * pdf(x, m, s); // ∫ = 1/σ²

  // ---- relative entropy (KL) between two Gaussians ------------------------
  const klGauss = (mp, sp, mq, sq) =>
    Math.log(sq / sp) + (sp * sp + (mp - mq) ** 2) / (2 * sq * sq) - 0.5;

  // ---- optimal transport (W2) between two Gaussians -----------------------
  const w2Gauss = (mp, sp, mq, sq) => Math.hypot(mp - mq, sp - sq);
  const otMap   = (x, mp, sp, mq, sq) => mq + (sq / sp) * (x - mp);     // T(x)
  const mccann  = (t, mp, sp, mq, sq) =>                                // W2 geodesic
    ({ m: (1 - t) * mp + t * mq, s: (1 - t) * sp + t * sq });

  // ---- Otto's identity: ||∇_{W2} H||² = J ; slope = √J = 1/σ --------------
  const ottoSlope = s => 1 / s;                          // √J on the leaf

  // ---- cost geometry: conformal factor f(σ) = 2(e+U) ----------------------
  const reliefU = (s, name = '2J', c = 2) => {
    switch (name) {
      case '2J':    return 2 / (s * s);
      case 'cJ':    return c / (s * s);
      case 'J+1':   return 1 / (s * s) + 1;
      case 'J2':    return 1 / (s ** 4);
      case 'sqrtJ': return 1 / s;
      case 'const': return 1;
      default:      return c / (s * s);
    }
  };
  const costFactor = (s, e = 0, name = '2J', c = 2) => 2 * (e + reliefU(s, name, c));

  // ---- Characterization II: eikonal / uniform pricing ---------------------
  // κ(σ) = ||∇_{g̃_{0,U}} H|| = √J / √(2U) = (1/σ)/√(2 U(σ)) ; flat ⟺ U = cJ
  const kappaOf = (s, name = '2J', c = 2) => (1 / s) / Math.sqrt(2 * reliefU(s, name, c));
  const eikonalKappa = (c = 2) => 1 / Math.sqrt(2 * c);   // κ for U = cJ

  // ---- Characterization I: the boundary at infinite cost-distance ---------
  const boundaryStands = alpha => alpha >= 1;
  // radial cost to certainty on U = cJ^α : ∫_cut^{σ0} √(2c)·σ^{-α} dσ
  const costToCertainty = (s0 = 1, alpha = 1, c = 2, cut = 1e-6) => {
    const k = Math.sqrt(2 * c);
    if (Math.abs(alpha - 1) < 1e-12) return k * Math.log(s0 / cut);
    return k * (Math.pow(s0, 1 - alpha) - Math.pow(cut, 1 - alpha)) / (1 - alpha);
  };
  // boundary bound : ℓ_e ≥ √(2ε)|ΔH|, with ε = c for U = cJ
  const costFloor = (s0, st, c = 2) => Math.sqrt(2 * c) * Math.abs(H(s0) - H(st));

  // ---- Characterization III: curvature & Stam rigidity --------------------
  // standardised base densities (mean 0, var 1) → Fisher info J0 (Stam: J0 ≥ 1)
  const J0base = name => {
    switch (name) {
      case 'gaussian':  return 1;
      case 'logistic':  return Math.PI * Math.PI / 9;        // ≈ 1.0966
      case 'studentt6': return 6 * 7 / (9 * 4);              // ν(ν+1)/((ν+3)(ν-2)) = 7/6
      case 'laplace':   return 2;                            // 1/b², b=1/√2 for var 1
      default:          return 1;
    }
  };
  const curvE0 = (c = 2, J0 = 1) => -1 / (2 * c * J0);       // e=0 : K = -1/(2cJ0)
  // e>0 on the Gaussian leaf (J0=1): K(μ,σ) = -c(c+3eσ²)/(2(c+eσ²)³)
  const curvE = (c, e, s) => -c * (c + 3 * e * s * s) / (2 * Math.pow(c + e * s * s, 3));

  // ---- Characterization (gauge invariance) --------------------------------
  // (e,U) -> (λe, λU) : metric ×λ, distance ×√λ, curvature ×1/λ, κ ×1/√λ
  const gauge = (lam, { d = 1, K = 1, kappa = 1 } = {}) =>
    ({ d: Math.sqrt(lam) * d, K: K / lam, kappa: kappa / Math.sqrt(lam) });

  // ---- Poincaré disk : Cayley map w = (z-i)/(z+i), z = μ + iσ --------------
  const cayley = (mu, sig) => {
    const re = mu, im = sig;                 // z = μ + iσ
    const dr = re, di = im + 1;              // z + i
    const nr = re, ni = im - 1;              // z - i
    const den = dr * dr + di * di;
    return { x: (nr * dr + ni * di) / den, y: (ni * dr - nr * di) / den };
  };

  // ---- epistemic efficiency (linear response) -----------------------------
  const eta = (s0, s1, T, D = 1) => {
    const dK = Math.log(s0 / s1);
    const l  = Math.abs(s0 - s1);
    const fr = l * l / (D * T);
    if (dK <= 0) return { eta: 0, dK: 0, fr };
    return { eta: dK / (dK + fr), dK, fr };
  };

  // ---- Kalman–Bucy filter (the rate D·J is realized) ----------------------
  const pSS = (D, R, alpha = 0) => -alpha * R + Math.sqrt((alpha * R) ** 2 + 2 * D * R);
  const tauF = (Pstar, D) => Pstar / D;            // forgetting time = 1/(D·J⋆)
  const dJrealise = (D, Pstar) => D / Pstar;       // = D·J⋆ = 1/τ_f

  // ---- EWC penalty (Fisher rule on weights) -------------------------------
  const ewcPenalty = (F, th, thstar) =>
    F.reduce((acc, Fi, i) => acc + Fi * (th[i] - thstar[i]) ** 2, 0);

  // ---- Gaussian-process posterior (kriging), 1D RBF kernel -----------------
  // Verbatim copy of the companion's tested block (belief-cost-geometry/js/phys.js,
  // pinned to 1e-9 against a numpy reference by its tests/test-phys.mjs).
  // k(x,x') = amp²·exp(−(x−x')²/2ℓ²) ; observations (xs[i], ys[i]) with known
  // noise variances s2s[i] ; constant prior mean mu0. Exact conjugate solve
  // (Cholesky) — the "inverse problem" step that turns a likelihood into a
  // proper belief over the whole field. n=0 returns the prior.
  const rbf = (a, b, amp, ell) => amp * amp * Math.exp(-0.5 * ((a - b) / ell) ** 2);
  const chol = A => {                       // lower-triangular L, A = L·Lᵀ
    const n = A.length, L = A.map(r => r.slice().fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
    }
    return L;
  };
  const cholSolve = (L, b) => {             // solve L·Lᵀ x = b
    const n = L.length, y = new Array(n), x = new Array(n);
    for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  };
  const gpPosterior = (xs, ys, s2s, xgrid, { amp = 1, ell = 0.3, mu0 = 0 } = {}) => {
    const n = xs.length;
    if (n === 0) return { mean: xgrid.map(() => mu0), sd: xgrid.map(() => amp) };
    const K = xs.map((xi, i) => xs.map((xj, j) => rbf(xi, xj, amp, ell) + (i === j ? s2s[i] : 0)));
    const L = chol(K);
    const alpha = cholSolve(L, ys.map(y => y - mu0));
    const mean = [], sd = [];
    for (const xq of xgrid) {
      const ks = xs.map(xi => rbf(xq, xi, amp, ell));
      const v = cholSolve(L, ks);
      mean.push(mu0 + ks.reduce((a, k, i) => a + k * alpha[i], 0));
      sd.push(Math.sqrt(Math.max(amp * amp - ks.reduce((a, k, i) => a + k * v[i], 0), 0)));
    }
    return { mean, sd };
  };
  // one sample path of the posterior on xgrid, given i.i.d. standard normals zs
  const gpSample = (xs, ys, s2s, xgrid, opts = {}, zs) => {
    const { amp = 1, ell = 0.3, mu0 = 0 } = opts, m = xgrid.length;
    const { mean } = gpPosterior(xs, ys, s2s, xgrid, opts);
    const Kgg = xgrid.map(a => xgrid.map(b => rbf(a, b, amp, ell)));
    let Sg = Kgg;
    if (xs.length > 0) {
      const K = xs.map((xi, i) => xs.map((xj, j) => rbf(xi, xj, amp, ell) + (i === j ? s2s[i] : 0)));
      const L = chol(K);
      const Ks = xgrid.map(xq => xs.map(xi => rbf(xq, xi, amp, ell)));
      const V = Ks.map(row => cholSolve(L, row));
      Sg = Kgg.map((row, a) => row.map((kab, b) =>
        kab - Ks[a].reduce((acc, k, i) => acc + k * V[b][i], 0)));
    }
    const jit = 1e-8 + 1e-6 * amp * amp;
    const Lg = chol(Sg.map((row, i) => row.map((v, j) => v + (i === j ? jit : 0))));
    return mean.map((mu, i) => {
      let s = 0; for (let k = 0; k <= i; k++) s += Lg[i][k] * zs[k];
      return mu + s;
    });
  };
  // field-level Fisher readout: sum of marginal informations Σₖ 1/Var(xₖ) on a
  // coarse grid (a lower bound of tr(Σ⁻¹)).
  const gpFieldJ = (xs, ys, s2s, xgrid, opts = {}) => {
    const { sd } = gpPosterior(xs, ys, s2s, xgrid, opts);
    return sd.reduce((a, s) => a + 1 / Math.max(s * s, 1e-12), 0);
  };

  // ---- physical scale (SI ; order of magnitude, Tier P) -------------------
  const KB = 1.380649e-23;                         // J/K
  const kBT = T => KB * T;                         // joules per nat
  const landauerNat = T => kBT(T);                 // per nat
  const landauerBit = T => kBT(T) * Math.log(2);   // per bit
  const erasureEnergy = (n, T) => n * kBT(T);      // n nats
  const pFloor = (T, tf) => kBT(T) / tf;           // = kB·T·D·J⋆
  const decades = (Pa, Pb) => Math.log10(Pa / Pb);

  return {
    SIG_MIN, NAT_IN_BITS,
    H, J, Sdot, U, pdf,
    forget, dHdt, tau,
    dW2axis, dVieAxis, walker,
    dHyp, dVie, dW2, geodesic, geoPoints, linePoints, frGeoPoints, costLenPath, vieLengthPath,
    posterior, crFloorVar, fisherIntegrand, klGauss,
    gpPosterior, gpSample, gpFieldJ,
    w2Gauss, otMap, mccann, ottoSlope,
    reliefU, costFactor, kappaOf, eikonalKappa,
    boundaryStands, costToCertainty, costFloor,
    J0base, curvE0, curvE, gauge, cayley,
    eta, pSS, tauF, dJrealise, ewcPenalty,
    KB, kBT, landauerNat, landauerBit, erasureEnergy, pFloor, decades,
  };
})();

export default PHYS;
