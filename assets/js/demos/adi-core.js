/* Low-rank ADI for  A X + X A^T + B R B^T = 0  with symmetric, indefinite R.
   A is tridiagonal and stable. The approximation is kept as X ≈ L D L^T (st.Z holds
   the columns of L) and the
   residual as W R W^T, so the residual norm costs O(n m^2) per step.

   block:      every step solves with all m columns of W (m new columns of Z)
   tangential: every step solves with one direction W t, t an eigenvector of R
               (one new column of Z). As in Smith & Werner (arXiv:2512.04983):
               W_j = W_{j-1} - 2α_j v_j t_jᵀ, d_j = -2α_j s_p, and t_j picked by
               the paper's residual-based rule, the eigenvector maximizing ‖W t‖₂.
   Shifts: simplified here to log-spaced real shifts across A's spectrum, the
   same for both variants. The paper chooses shifts adaptively by projection;
   its MATLAB code is at https://doi.org/10.5281/zenodo.19582087            */
import { triMul, triSolveShift, dot, symEig } from './linalg.js';

function gram(W) { // W: array of columns
  const m = W.length, G = Array.from({ length: m }, () => new Float64Array(m));
  for (let i = 0; i < m; i++) for (let j = i; j < m; j++) G[i][j] = G[j][i] = dot(W[i], W[j]);
  return G;
}
// ||W R W^T||_F with R diagonal (we work in R's eigenbasis): sqrt(trace((G R)^2))
function resNorm(W, r) {
  const G = gram(W), m = W.length;
  let s = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) s += G[i][j] * r[j] * G[j][i] * r[i];
  return Math.sqrt(Math.max(s, 0));
}

export function makeADI(T, B, R, mode, shifts) {
  // Diagonalize R once: B R B^T = (B Q) Λ (B Q)^T
  const m = B.length, n = B[0].length;
  const { values: lam, vectors: Q } = symEig(R);
  const W = [];
  for (let j = 0; j < m; j++) {
    const c = new Float64Array(n);
    for (let i = 0; i < m; i++) { const q = Q[i][j]; if (q) for (let k = 0; k < n; k++) c[k] += B[i][k] * q; }
    W.push(c);
  }
  const res0 = resNorm(W, lam);
  const st = { Z: [], d: [], shifts: [], hist: [{ cols: 0, res: 1 }], W, lam, res0, done: false, dirs: [] };
  const pos = new Int32Array(m); let k0 = 0;

  st.step = function () {
    if (mode === 'block') {
      // Rayleigh quotient of the whole block: tr(W^T A W)/tr(W^T W)
      const p = shifts[k0++ % shifts.length];
      for (let j = 0; j < m; j++) {
        const v = triSolveShift(T, p, W[j]);
        for (let k = 0; k < n; k++) W[j][k] -= 2 * p * v[k];
        st.Z.push(v); st.d.push(-2 * p * lam[j]);
      }
      st.shifts.push(p);
    } else {
      // direction: the eigenvector t of R maximizing ‖W t‖₂ (residual-based rule)
      let best = 0, bv = -1;
      for (let j = 0; j < m; j++) { const v = dot(W[j], W[j]); if (v > bv) { bv = v; best = j; } }
      const w = W[best];
      const p = shifts[pos[best]++ % shifts.length];
      st.dirs.push(best);
      const v = triSolveShift(T, p, w);
      for (let k = 0; k < n; k++) w[k] -= 2 * p * v[k];
      st.Z.push(v); st.d.push(-2 * p * lam[best]); st.shifts.push(p);
    }
    const r = resNorm(W, lam) / res0;
    st.hist.push({ cols: st.Z.length, res: r });
    return r;
  };
  return st;
}

// ℓ log-spaced shifts between the extreme eigenvalues of the tridiagonal A
export function logShifts(T, l) {
  const n = T.d.length, d = T.d[0], g = 2 * Math.sqrt(T.l[1] * T.u[0]);
  const a = -(d + g * Math.cos(Math.PI / (n + 1))), b = -(d - g); // |λ| range
  const lo = Math.min(a, b), hi = Math.max(a, b), out = [];
  for (let i = 0; i < l; i++) out.push(-Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * (i + 0.5) / l));
  // order: spread out (bit-reversal-like) so early steps already cover the range
  const ord = []; for (let s = 0; s < l; s++) ord.push(out[(s * 7) % l]);
  return ord;
}

// 1D convection–diffusion operator on n interior points (stable, tridiagonal)
export function convDiff(n, c) {
  const h = 1 / (n + 1), T = { l: new Float64Array(n), d: new Float64Array(n), u: new Float64Array(n) };
  for (let i = 0; i < n; i++) { T.d[i] = -2 / (h * h); T.l[i] = 1 / (h * h) + c / (2 * h); T.u[i] = 1 / (h * h) - c / (2 * h); }
  return T;
}
// B from point sources {x in (0,1), w width}; R = diag(signs)
export function sourcesProblem(n, sources) {
  const h = 1 / (n + 1);
  // amplitude scaled by 1/√w so every source carries the same energy, whatever its width
  const B = sources.map(s => Float64Array.from({ length: n }, (_, k) => Math.sqrt(0.04 / s.w) * Math.exp(-(((k + 1) * h - s.x) ** 2) / (2 * s.w * s.w))));
  const R = sources.map((s, i) => { const r = new Float64Array(sources.length); r[i] = s.sign; return r; });
  return { B, R };
}

// Test problem: 1D convection–diffusion, n points; B random n×m; R = diag(±1 with decay)
export function testProblem(n, m, rnd, randn, opt = {}) {
  const h = 1 / (n + 1), nu = 1, c = opt.c ?? 60;
  const T = { l: new Float64Array(n), d: new Float64Array(n), u: new Float64Array(n) };
  for (let i = 0; i < n; i++) {
    T.d[i] = -2 * nu / (h * h);
    T.l[i] = nu / (h * h) + c / (2 * h);
    T.u[i] = nu / (h * h) - c / (2 * h);
  }
  // smooth-ish random inputs: localized bumps so X has visible structure
  const B = [];
  for (let j = 0; j < m; j++) {
    const ctr = 0.08 + 0.84 * (j + rnd()) / m, wid = 0.02 + 0.05 * rnd(), amp = 0.6 + rnd();
    const b = new Float64Array(n);
    for (let k = 0; k < n; k++) { const x = (k + 1) * h; b[k] = amp * Math.exp(-((x - ctr) ** 2) / (2 * wid * wid)); }
    B.push(b);
  }
  const R = Array.from({ length: m }, (_, i) => { const r = new Float64Array(m); r[i] = (i % 2 ? -1.3 : 1) * (1 + 0.5 * randn(rnd) ** 2); return r; });
  // mix R so it is not diagonal (makes the eigen-direction choice meaningful)
  for (let i = 0; i + 1 < m; i += 3) { R[i][i + 1] = R[i + 1][i] = 0.4; }
  return { T, B, R };
}
