/* RHOSVD-Tucker sGMRES and RHOSVD-Tucker GMRES, following
   Bucci, Iannacito, Pasha & Smith, "Randomized Tucker-sketched GMRES",
   arXiv:2608.11091 (Algorithms 1–2, Section 4.2), at browser scale.

   Every tensor is kept in Tucker format { dims:[r1,r2,r3], G (core), U:[U1,U2,U3] }
   with factors stored as arrays of columns. Nothing is ever formed in full.

   - Operator (Section 4.2): L = L1⊗I⊗I + I⊗L1⊗I + I⊗I⊗L1, L1 = κΔ1 + ω∇1 (upwind).
     Applied to a Tucker tensor it gives a sum of three Tucker tensors.
   - RoundSum: randomized recompression of a sum of Tucker tensors
     (Smith et al., "Efficient sketching-based summation of Tucker tensors"):
     Khatri–Rao Gaussian sketches through MTTKRP, QR, core projection, then ST-HOSVD
     of the small core to tolerance ε. Sketch size s = max_k r̃_k + p, with r̃_k from
     the energy-weighted concatenated factors.
   - sGMRES: orthogonalize only against the last k_trunc basis tensors; solve
     min ‖M y − b_s‖ with the Khatri–Rao sketch S = ⊙_k S_k applied in Tucker form;
     stop when the sketched residual < η·tol (η = 0.3).
   - GMRES baseline: full Arnoldi with the same RoundSum truncation (Algorithm 1).

   Simplifications for the web: small n, and the true residual is computed exactly
   (in Tucker form) at every step for plotting. Paper code: doi:10.5281/zenodo.19074856 */
import { rng, randn, dot, symEig } from './linalg.js';

// ---------- small dense helpers ----------
const zeros = (n) => new Float64Array(n);
function gram(A, B) { return A.map(a => Float64Array.from(B, b => dot(a, b))); }             // A^T B (cols)
function matCols(cols, M) { // cols (n×r as r columns) times M (r×q as rows of length q) -> q columns
  const q = M[0] ? M[0].length : 0, n = cols[0] ? cols[0].length : 0, out = Array.from({ length: q }, () => zeros(n));
  for (let i = 0; i < cols.length; i++) { const c = cols[i], row = M[i]; for (let j = 0; j < q; j++) { const m = row[j]; if (m) { const o = out[j]; for (let t = 0; t < n; t++) o[t] += m * c[t]; } } }
  return out;
}
function orth(cols) { // modified Gram–Schmidt (twice), drops dependent columns
  const Q = [];
  for (const c0 of cols) {
    const c = Float64Array.from(c0), n0 = Math.sqrt(dot(c, c));
    for (let pass = 0; pass < 2; pass++) for (const q of Q) { const h = dot(q, c); for (let t = 0; t < c.length; t++) c[t] -= h * q[t]; }
    const nc = Math.sqrt(dot(c, c));
    if (nc > 1e-10 * Math.max(n0, 1e-300)) { for (let t = 0; t < c.length; t++) c[t] /= nc; Q.push(c); }
  }
  return Q;
}
function eigDesc(G) { // symmetric eig, descending, scale-normalised for the Jacobi tolerance
  const n = G.length; let tr = 0; for (let i = 0; i < n; i++) tr += Math.abs(G[i][i]);
  const sc = tr > 0 ? tr : 1, { values, vectors } = symEig(G.map(r => Float64Array.from(r, v => v / sc)));
  const ord = values.map((v, i) => [v * sc, i]).sort((a, b) => b[0] - a[0]);
  return { vals: ord.map(o => Math.max(o[0], 0)), vecs: ord.map(o => Float64Array.from({ length: n }, (_, k) => vectors[k][o[1]])) };
}

// ---------- core (3-way) operations; index a + r0*(b + r1*c) ----------
// G ×_k M, with M given as m rows of length r_k (allocation-free inner loops)
function ttm(G, dims, k, M) {
  const [r0, r1, r2] = dims, m = M.length, nd = dims.slice(); nd[k] = m;
  const n0 = nd[0], n1 = nd[1], out = zeros(nd[0] * nd[1] * nd[2]);
  if (k === 0) {
    for (let c = 0; c < r2; c++) for (let b = 0; b < r1; b++) { const base = r0 * (b + r1 * c), ob = n0 * (b + n1 * c);
      for (let i = 0; i < m; i++) { const row = M[i]; let acc = 0; for (let a = 0; a < r0; a++) acc += row[a] * G[base + a]; out[ob + i] = acc; } }
  } else if (k === 1) {
    for (let c = 0; c < r2; c++) for (let i = 0; i < m; i++) { const row = M[i], ob = n0 * (i + n1 * c);
      for (let b = 0; b < r1; b++) { const w = row[b]; if (!w) continue; const base = r0 * (b + r1 * c); for (let a = 0; a < r0; a++) out[ob + a] += w * G[base + a]; } }
  } else {
    for (let i = 0; i < m; i++) { const row = M[i], ob = n0 * n1 * i;
      for (let c = 0; c < r2; c++) { const w = row[c]; if (!w) continue; const base = r0 * r1 * c; for (let t = 0; t < r0 * r1; t++) out[ob + t] += w * G[base + t]; } }
  }
  return { G: out, dims: nd };
}
// Gram of the mode-k unfolding of a core: (r_k × r_k)
function unfoldGram(G, dims, k) {
  const [r0, r1, r2] = dims, rk = dims[k], out = Array.from({ length: rk }, () => zeros(rk));
  const st = [1, r0, r0 * r1], sk = st[k], o = [0, 1, 2].filter(x => x !== k), so0 = st[o[0]], so1 = st[o[1]], d0 = dims[o[0]], d1 = dims[o[1]];
  const v = zeros(rk);
  for (let p = 0; p < d0; p++) for (let q = 0; q < d1; q++) {
    const base = p * so0 + q * so1;
    for (let a = 0; a < rk; a++) v[a] = G[base + a * sk];
    for (let a = 0; a < rk; a++) { const va = v[a]; if (!va) continue; const row = out[a]; for (let b = 0; b < rk; b++) row[b] += va * v[b]; }
  }
  return out;
}
const coreNorm2 = (G) => dot(G, G);

// ---------- Tucker tensor operations ----------
export function rank1(vs) { return { dims: [1, 1, 1], G: Float64Array.of(1), U: vs.map(v => [Float64Array.from(v)]) }; }
export function inner(X, Y) { // <X, Y>_F
  let G = Y.G, d = Y.dims;
  for (let k = 0; k < 3; k++) { const M = gram(X.U[k], Y.U[k]); ({ G, dims: d } = ttm(G, d, k, M)); }
  return dot(X.G, G);
}
export const fnorm = (X) => Math.sqrt(Math.max(inner(X, X), 0));
export const scale = (X, c) => ({ dims: X.dims.slice(), G: X.G.map(v => v * c), U: X.U });
// ‖Σ c_j X_j‖ exactly, through pairwise inner products
export function sumNorm(terms) { let s = 0; for (const a of terms) for (const b of terms) s += a.c * b.c * inner(a.X, b.X); return Math.sqrt(Math.max(s, 0)); }

// Khatri–Rao sketch of a Tucker tensor: (⊙_k S_k)^T vec(X), S_k given as s columns (length n)
export function krSketch(X, Sk) {
  const s = Sk[0].length, out = zeros(s), A = [0, 1, 2].map(k => gram(X.U[k], Sk[k])); // r_k × s
  const [r0, r1, r2] = X.dims;
  for (let c = 0; c < r2; c++) for (let b = 0; b < r1; b++) for (let a = 0; a < r0; a++) {
    const g = X.G[a + r0 * (b + r1 * c)]; if (!g) continue;
    const x = A[0][a], y = A[1][b], z = A[2][c];
    for (let t = 0; t < s; t++) out[t] += g * x[t] * y[t] * z[t];
  }
  return out;
}

/* RoundSum: recompress Σ_j c_j X_j to relative accuracy ε. */
export function roundSum(terms, eps, rnd, p = 5, full = false) {
  terms = terms.filter(t => t.c !== 0);
  const n = terms[0].X.U[0][0].length;
  // sketch size from energy-weighted concatenated factors V_k = [‖G_j‖ c_j U_k^{(j)}]
  let sMax = 1;
  if (!full) for (let k = 0; k < 3; k++) {
    const V = []; for (const t of terms) { const w = Math.abs(t.c) * Math.sqrt(coreNorm2(t.X.G)); for (const u of t.X.U[k]) V.push(u.map(v => v * w)); }
    const Gm = Array.from({ length: n }, () => zeros(n));
    for (const v of V) for (let a = 0; a < n; a++) { const va = v[a]; if (!va) continue; const row = Gm[a]; for (let b = 0; b < n; b++) row[b] += va * v[b]; }
    const { vals } = eigDesc(Gm), tot = vals.reduce((x, y) => x + y, 0);
    let acc = 0, r = 0; while (r < n && acc < (1 - (eps * eps) / 9) * tot) acc += vals[r++];
    sMax = Math.max(sMax, r);
  }
  // after orthogonalization the sum cancels heavily and the energy estimate is unreliable:
  // use the full sketch size there (the paper leaves this threshold unspecified)
  const s = full ? n : Math.min(n, sMax + p);
  // Gaussian sketches, one per mode
  const S = [0, 1, 2].map(() => Array.from({ length: n }, () => Float64Array.from({ length: s }, () => randn(rnd))));
  const Sc = S.map(rows => Array.from({ length: s }, (_, c) => Float64Array.from(rows, r => r[c])));
  // Y_k = Σ_j c_j U_k^{(j)} MTTKRP(G_j, {U_l^{(j)T} S_l}_{l≠k}, k)
  const Q = [0, 1, 2].map(k => {
    const Y = Array.from({ length: s }, () => zeros(n));
    for (const { X, c } of terms) {
      const A = [0, 1, 2].map(l => gram(X.U[l], Sc[l])), [r0, r1, r2] = X.dims, M = Array.from({ length: X.dims[k] }, () => zeros(s));
      for (let cc = 0; cc < r2; cc++) for (let b = 0; b < r1; b++) for (let a = 0; a < r0; a++) {
        const g = X.G[a + r0 * (b + r1 * cc)]; if (!g) continue;
        const u = k === 0 ? A[1][b] : A[0][a], v = k === 2 ? A[1][b] : A[2][cc], row = M[k === 0 ? a : k === 1 ? b : cc];
        for (let t = 0; t < s; t++) row[t] += g * u[t] * v[t];
      }
      const cols = matCols(X.U[k], M);
      for (let t = 0; t < s; t++) { const y = Y[t], cl = cols[t]; for (let i = 0; i < n; i++) y[i] += c * cl[i]; }
    }
    return orth(Y);
  });
  // project: core = Σ_j c_j G_j ×_k (Q_k^T U_k^{(j)})
  const dims = Q.map(q => q.length); let core = zeros(dims[0] * dims[1] * dims[2]);
  for (const { X, c } of terms) {
    let G = X.G, d = X.dims;
    for (let k = 0; k < 3; k++) ({ G, dims: d } = ttm(G, d, k, gram(Q[k], X.U[k])));
    for (let i = 0; i < core.length; i++) core[i] += c * G[i];
  }
  // ST-HOSVD of the small core to tolerance ε
  const total = coreNorm2(core); let cd = dims.slice(); const U = [];
  for (let k = 0; k < 3; k++) {
    const { vals, vecs } = eigDesc(unfoldGram(core, cd, k));
    let tail = 0, r = cd[k];
    for (let j = cd[k] - 1; j >= 1; j--) { if (tail + vals[j] > (eps * eps / 3) * total) break; tail += vals[j]; r = j; }
    const W = vecs.slice(0, r);                         // r rows of length cd[k]
    ({ G: core, dims: cd } = ttm(core, cd, k, W));
    U.push(matCols(Q[k], W.map(w => w).reduce((rows, w, j) => { w.forEach((v, i) => { (rows[i] = rows[i] || zeros(r))[j] = v; }); return rows; }, [])));
  }
  return { dims: cd, G: core, U };
}

// ---------- the problem of Section 4.2 ----------
export function makeProblem(n, { kappa = 1e-2, omega = 5e-2 } = {}) {
  const h = 1 / (n + 1);
  const L1 = (v) => { // κ(-u'')·(1/h²) + ω(u_i - u_{i-1})/h, Dirichlet
    const o = zeros(n);
    for (let i = 0; i < n; i++) {
      const um = i > 0 ? v[i - 1] : 0, up = i < n - 1 ? v[i + 1] : 0;
      o[i] = kappa * (2 * v[i] - um - up) / (h * h) + omega * (v[i] - um) / h;
    }
    return o;
  };
  const ones = Float64Array.from({ length: n }, () => 1 / Math.sqrt(n)), e1 = zeros(n); e1[0] = 1;
  return { n, L1, B: rank1([ones, e1, e1]) };
}
// L(X) as a sum of three Tucker tensors
export function applyL(P, X) {
  return [0, 1, 2].map(k => ({ c: 1, X: { dims: X.dims, G: X.G, U: X.U.map((Uk, l) => (l === k ? Uk.map(P.L1) : Uk)) } }));
}
const maxRank = (X) => Math.max(...X.dims);

/* RHOSVD-Tucker sGMRES (Algorithm 2), one step per call. */
export function sGMRES(P, { tol = 1e-4, eta = 0.3, ktrunc = 2, eps, maxit = 80, seed = 1, every = 5 } = {}) {
  const rnd = rng(seed), n = P.n, e = eps ?? tol, s = 2 * maxit + 20;
  const Sk = [0, 1, 2].map(() => Array.from({ length: s }, () => Float64Array.from({ length: n }, () => randn(rnd))));
  const sk = (X) => krSketch(X, Sk);
  const beta = fnorm(P.B), V = [scale(P.B, 1 / beta)], M = [], bs = sk(P.B), betas = Math.sqrt(dot(bs, bs));
  let x = null, done = false;
  const st = {
    get x() { return x; }, get done() { return done; }, V,
    step() {
      const k = V.length - 1, Vk = V[k];
      let W = roundSum(applyL(P, Vk), e, rnd);                         // truncation 1
      M.push(sk(W));
      const terms = [{ c: 1, X: W }];
      for (let j = Math.max(0, k - ktrunc + 1); j <= k; j++) terms.push({ c: -inner(V[j], W), X: V[j] });
      W = roundSum(terms, e, rnd, 5, true);                             // truncation 2
      const nw = fnorm(W);
      const y = lsq(M, bs);
      const r = M.reduce((acc, col, j) => { for (let t = 0; t < acc.length; t++) acc[t] -= y[j] * col[t]; return acc; }, Float64Array.from(bs));
      const sres = Math.sqrt(dot(r, r)) / betas;
      if (nw < 1e-12 || sres < eta * tol) done = true; else V.push(scale(W, 1 / nw));
      let tres = null;
      if (done || V.length % every === 0) {                             // truncation 3 (solution), for display
        x = roundSum(V.slice(0, y.length).map((v, j) => ({ c: y[j], X: v })), e, rnd, 5, true);
        tres = trueResidual(P, x) / beta;
      }
      return { sres, tres, rank: maxRank(Vk), xrank: x ? maxRank(x) : null };
    },
  };
  return st;
}

/* RHOSVD-Tucker GMRES (Algorithm 1): full Arnoldi with RoundSum, Givens updates. */
export function tGMRES(P, { tol = 1e-4, eps, seed = 2, every = 5 } = {}) {
  const rnd = rng(seed), e = eps ?? tol, beta = fnorm(P.B), V = [scale(P.B, 1 / beta)], H = [], cs = [], sn = [], g = [beta];
  let x = null, done = false;
  return {
    get x() { return x; }, get done() { return done; },
    step() {
      const k = V.length - 1, Vk = V[k];
      let W = roundSum(applyL(P, Vk), e, rnd);
      const h = zeros(k + 2), terms = [{ c: 1, X: W }];
      for (let j = 0; j <= k; j++) { h[j] = inner(V[j], W); terms.push({ c: -h[j], X: V[j] }); }
      W = roundSum(terms, e, rnd, 5, true); const nw = fnorm(W); h[k + 1] = nw;
      for (let i = 0; i < k; i++) { const a = cs[i] * h[i] + sn[i] * h[i + 1]; h[i + 1] = -sn[i] * h[i] + cs[i] * h[i + 1]; h[i] = a; }
      const rr = Math.hypot(h[k], h[k + 1]); cs[k] = h[k] / rr; sn[k] = h[k + 1] / rr; h[k] = rr; h[k + 1] = 0;
      g[k + 1] = -sn[k] * g[k]; g[k] = cs[k] * g[k]; H.push(h);
      const m = k + 1, y = zeros(m);
      for (let i = m - 1; i >= 0; i--) { let t = g[i]; for (let q = i + 1; q < m; q++) t -= H[q][i] * y[q]; y[i] = t / H[i][i]; }
      const hres = Math.abs(g[k + 1]) / beta;
      if (hres < tol || nw < 1e-12) done = true; else V.push(scale(W, 1 / nw));
      let tres = null;
      if (done || m % every === 0) { x = roundSum(V.slice(0, m).map((v, j) => ({ c: y[j], X: v })), e, rnd, 5, true); tres = trueResidual(P, x) / beta; }
      return { sres: hres, tres, rank: maxRank(Vk), xrank: x ? maxRank(x) : null };
    },
  };
}

function trueResidual(P, X) { return sumNorm([{ c: 1, X: P.B }, ...applyL(P, X).map(t => ({ c: -1, X: t.X }))]); }

function lsq(cols, f) { // min ‖[cols] y − f‖ by MGS QR
  const m = cols.length, Q = [], R = Array.from({ length: m }, () => zeros(m));
  for (let j = 0; j < m; j++) {
    const q = Float64Array.from(cols[j]);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < Q.length; i++) { const h = dot(Q[i], q); R[i][j] += h; for (let t = 0; t < q.length; t++) q[t] -= h * Q[i][t]; }
    const nq = Math.sqrt(dot(q, q)); R[j][j] = nq; for (let t = 0; t < q.length; t++) q[t] /= nq || 1; Q.push(q);
  }
  const g = Q.map(q => dot(q, f)), y = zeros(m);
  for (let i = m - 1; i >= 0; i--) { let s = g[i]; for (let k = i + 1; k < m; k++) s -= R[i][k] * y[k]; y[i] = R[i][i] ? s / R[i][i] : 0; }
  return y;
}

// A 2D slice X(:, :, k) of a Tucker tensor (n×n, row-major)
export function slice(X, k) {
  const n = X.U[0][0].length, [r0, r1, r2] = X.dims, M = zeros(r0 * r1);
  for (let c = 0; c < r2; c++) { const w = X.U[2][c][k]; if (!w) continue; for (let i = 0; i < r0 * r1; i++) M[i] += X.G[i + r0 * r1 * c] * w; }
  const out = zeros(n * n);
  for (let a = 0; a < r0; a++) for (let b = 0; b < r1; b++) { const m = M[a + r0 * b]; if (!m) continue; const u = X.U[0][a], v = X.U[1][b]; for (let i = 0; i < n; i++) { const ui = u[i] * m; if (ui) for (let j = 0; j < n; j++) out[i * n + j] += ui * v[j]; } }
  return out;
}
