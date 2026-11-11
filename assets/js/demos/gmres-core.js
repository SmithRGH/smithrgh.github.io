/* Tensor-structured GMRES, small dense version for the website demo.
   Problem: 3D convection–diffusion on an n×n×n grid,
     A = T⊗I⊗I + I⊗T⊗I + I⊗I⊗T   (a Kronecker sum, T = 1D operator),
   with a low-rank right-hand side b (two separable bumps of opposite sign).

   Two solvers:
   - gmres:  standard GMRES, full Arnoldi, no compression. Its Krylov vectors are
             stored as full tensors and their multilinear (Tucker) ranks grow.
   - sgmres: sketched GMRES with a short (k-term) recurrence. Every new basis
             vector is recompressed to low Tucker rank (HOSVD truncation at a
             tolerance), and the small least-squares problem is solved after a
             random sketch S:  y = argmin ‖S(A V y − b)‖.
   The paper (Bucci, Iannacito, Pasha & Smith, arXiv:2608.11091) works entirely in
   Tucker format and recompresses with a randomized HOSVD or a multilinear Nyström
   approximation; here vectors are kept dense for simplicity. Paper code:
   https://doi.org/10.5281/zenodo.19074856                                           */
import { dot, norm, symEig } from './linalg.js';

export function makeProblem(n, c = 20) {
  const h = 1 / (n + 1);
  const T = { l: 1 / (h * h) + c / (2 * h), d: -2 / (h * h), u: 1 / (h * h) - c / (2 * h) };
  const N = n * n * n, b = new Float64Array(N);
  const g = (x, m, w) => Math.exp(-((x - m) ** 2) / (2 * w * w));
  const bumps = [[0.3, 0.36, 0.5, 0.09, 1], [0.66, 0.62, 0.5, 0.08, -1]];
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + 1) * h, y = (j + 1) * h, z = (k + 1) * h; let v = 0;
    for (const [a, bb, cc, w, s] of bumps) v += s * g(x, a, w) * g(y, bb, w) * g(z, cc, w);
    b[i + n * j + n * n * k] = v;
  }
  return { n, N, T, b };
}

// y = -A x  (we solve with the positive definite-ish operator -A for nicer residuals)
export function applyA(P, x) {
  const { n, T } = P, N = n * n * n, y = new Float64Array(N), st = [1, n, n * n];
  for (let m = 0; m < 3; m++) {
    const s = st[m];
    for (let p = 0; p < N; p++) {
      const i = Math.floor(p / s) % n;
      let v = T.d * x[p];
      if (i > 0) v += T.l * x[p - s];
      if (i < n - 1) v += T.u * x[p + s];
      y[p] -= v;
    }
  }
  return y;
}

// Mode-m unfolding as n rows of length N/n
function unfold(x, n, m) {
  const M = (n * n), rows = Array.from({ length: n }, () => new Float64Array(M)), st = [1, n, n * n];
  const o = [[1, 2], [0, 2], [0, 1]][m];
  for (let a = 0; a < n; a++) { let t = 0; for (let q = 0; q < n; q++) for (let r = 0; r < n; r++) rows[a][t++] = x[a * st[m] + r * st[o[0]] + q * st[o[1]]]; }
  return rows;
}
function fold(rows, n, m, out) {
  const st = [1, n, n * n], o = [[1, 2], [0, 2], [0, 1]][m];
  for (let a = 0; a < n; a++) { let t = 0; for (let q = 0; q < n; q++) for (let r = 0; r < n; r++) out[a * st[m] + r * st[o[0]] + q * st[o[1]]] = rows[a][t++]; }
  return out;
}
function gramEig(rows) {
  const n = rows.length, G = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_, j) => (j >= i ? dot(rows[i], rows[j]) : 0)));
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) G[i][j] = G[j][i];
  const { values, vectors } = symEig(G);
  const ord = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  return { vals: ord.map(o => Math.max(o[0], 0)), vecs: ord.map(o => Float64Array.from({ length: n }, (_, k) => vectors[k][o[1]])) };
}

// Numerical multilinear ranks of x (relative tolerance on singular values)
export function tuckerRanks(x, n, tol = 1e-8) {
  return [0, 1, 2].map(m => { const { vals } = gramEig(unfold(x, n, m)); const s0 = Math.sqrt(vals[0]); return vals.filter(v => Math.sqrt(v) > tol * s0).length; });
}

// Truncate x to low multilinear rank by sequential HOSVD: error ≤ tol·‖x‖
export function truncate(x, n, tol) {
  let y = Float64Array.from(x); const nx2 = dot(x, x), ranks = [];
  for (let m = 0; m < 3; m++) {
    const rows = unfold(y, n, m), { vals, vecs } = gramEig(rows);
    let tail = 0, r = n;
    for (let k = n - 1; k >= 1; k--) { if (tail + vals[k] > (tol * tol / 3) * nx2) break; tail += vals[k]; r = k; }
    const U = vecs.slice(0, r); ranks.push(r);
    // rows ← U U^T rows
    const C = U.map(u => { const c = new Float64Array(rows[0].length); for (let a = 0; a < n; a++) { const ua = u[a]; if (ua) { const ra = rows[a]; for (let t = 0; t < c.length; t++) c[t] += ua * ra[t]; } } return c; });
    const out = rows.map(() => new Float64Array(rows[0].length));
    for (let a = 0; a < n; a++) for (let k = 0; k < r; k++) { const w = U[k][a]; if (w) { const ck = C[k], oa = out[a]; for (let t = 0; t < ck.length; t++) oa[t] += w * ck[t]; } }
    y = fold(out, n, m, new Float64Array(y.length));
  }
  return { y, ranks };
}

// Sparse sign embedding S (s rows, ζ nonzeros per column)
function sparseSign(N, s, rnd, zeta = 4) {
  const rows = new Int32Array(N * zeta), vals = new Float64Array(N * zeta), sc = 1 / Math.sqrt(zeta);
  for (let j = 0; j < N; j++) for (let z = 0; z < zeta; z++) { rows[j * zeta + z] = Math.floor(rnd() * s); vals[j * zeta + z] = (rnd() < 0.5 ? -1 : 1) * sc; }
  return (x) => { const y = new Float64Array(s); for (let j = 0; j < N; j++) { const xj = x[j]; if (xj) for (let z = 0; z < zeta; z++) y[rows[j * zeta + z]] += vals[j * zeta + z] * xj; } return y; };
}

// Least squares min ‖M y − f‖ for small dense M (columns given), via modified Gram–Schmidt QR
function lsq(cols, f) {
  const m = cols.length, Q = [], R = Array.from({ length: m }, () => new Float64Array(m));
  for (let j = 0; j < m; j++) {
    const q = Float64Array.from(cols[j]);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < Q.length; i++) { const h = dot(Q[i], q); R[i][j] += h; for (let t = 0; t < q.length; t++) q[t] -= h * Q[i][t]; }
    const nq = norm(q); R[j][j] = nq; for (let t = 0; t < q.length; t++) q[t] /= nq || 1; Q.push(q);
  }
  const g = Q.map(q => dot(q, f)), y = new Float64Array(m);
  for (let i = m - 1; i >= 0; i--) { let s = g[i]; for (let k = i + 1; k < m; k++) s -= R[i][k] * y[k]; y[i] = R[i][i] ? s / R[i][i] : 0; }
  return y;
}

function combine(V, y, N) { const x = new Float64Array(N); V.forEach((v, j) => { const c = y[j]; for (let t = 0; t < N; t++) x[t] += c * v[t]; }); return x; }

/* Both solvers as step-by-step iterators, so a page can advance them one
   iteration per animation frame. Each step returns the new relative residual
   and the Tucker rank of the basis vector it used. */
export function standardGMRES(P, { rankTol = 1e-6 } = {}) {
  const { n, N, b } = P, nb = norm(b);
  const V = [Float64Array.from(b, v => v / nb)], H = [], cs = [], sn = [], gv = [nb];
  let j = 0;
  return {
    step() {
      const rank = Math.max(...tuckerRanks(V[j], n, rankTol));
      const w = applyA(P, V[j]), h = new Float64Array(j + 2);
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= j; i++) { const c = dot(w, V[i]); h[i] += c; for (let t = 0; t < N; t++) w[t] -= c * V[i][t]; }
      h[j + 1] = norm(w);
      for (let i = 0; i < j; i++) { const a = cs[i] * h[i] + sn[i] * h[i + 1]; h[i + 1] = -sn[i] * h[i] + cs[i] * h[i + 1]; h[i] = a; }
      const r = Math.hypot(h[j], h[j + 1]); cs[j] = h[j] / r; sn[j] = h[j + 1] / r; h[j] = r; h[j + 1] = 0;
      gv[j + 1] = -sn[j] * gv[j]; gv[j] = cs[j] * gv[j]; H.push(h);
      const nw = norm(w); V.push(w.map(v => v / (nw || 1))); j++;
      return { res: Math.abs(gv[j]) / nb, rank };
    },
  };
}

export function sketchedGMRES(P, { tol = 1e-3, k = 3, sketch = 160, rnd = Math.random } = {}) {
  const { n, N, b } = P, nb = norm(b), S = sparseSign(N, sketch, rnd), Sb = S(b);
  const t0 = truncate(b, n, tol), V = [t0.y.map(v => v / norm(t0.y))], SAV = [], AV = [];
  let rank = Math.max(...t0.ranks), x = new Float64Array(N);
  return {
    get x() { return x; },
    step() {
      const used = rank, j = V.length - 1;
      const w = applyA(P, V[j]); AV.push(Float64Array.from(w)); SAV.push(S(w));
      for (let i = Math.max(0, V.length - k); i < V.length; i++) { const h = dot(w, V[i]); for (let t = 0; t < N; t++) w[t] -= h * V[i][t]; }
      const y = lsq(SAV, Sb), r = Float64Array.from(b); AV.forEach((a, i) => { for (let t = 0; t < N; t++) r[t] -= y[i] * a[t]; });
      x = combine(V, y, N);
      const tr = truncate(w, n, tol), nw = norm(tr.y);
      V.push(tr.y.map(v => v / (nw || 1))); rank = Math.max(...tr.ranks);
      return { res: norm(r) / nb, rank: used };
    },
  };
}

export function sliceOf(x, n, k = Math.floor(n / 2)) { const o = new Float64Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) o[j * n + i] = x[i + n * j + n * n * k]; return o; }
