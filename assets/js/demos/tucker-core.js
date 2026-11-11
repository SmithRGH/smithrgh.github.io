/* Sum of Tucker tensors and a structured-sketch recompression (toy version).
   Each term j:  X_j = G_j ×1 U1_j ×2 U2_j ×3 U3_j,  n×n×n, multilinear rank r.
   Summing s terms gives formal ranks s·r and a block-diagonal core of (s r)^3
   entries. Here each mode is sketched through Khatri–Rao structure,
     Y1 = X_(1) (Ω3 ⊙ Ω2) = Σ_j U1_j G_j(1) ((U3_jᵀΩ3) ⊙ (U2_jᵀΩ2)),
   so the big core is never formed. Ranks come from the sketch's singular values. */
import { randn, dot, symEig } from './linalg.js';

export const R = 3; // rank of each term

// Hermite-type functions centred at c, width w, sampled on n points in [0,1]
function hermiteFactor(n, c, w) {
  const cols = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n - c) / w, g = Math.exp(-t * t / 2);
    cols[0][i] = g; cols[1][i] = t * g; cols[2][i] = (t * t - 1) * g * 0.5;
  }
  return cols; // r columns, each length n
}

export function makeTerm(n, x, y, z, rnd) {
  const w = 0.06 + 0.07 * rnd();
  const U = [hermiteFactor(n, x, w), hermiteFactor(n, y, w * (0.7 + 0.6 * rnd())), hermiteFactor(n, z, w)];
  const G = new Float64Array(R * R * R); // G[a + R*b + R*R*c]
  for (let k = 0; k < G.length; k++) G[k] = 0.35 * randn(rnd);
  G[0] = (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd());
  return { U, G };
}

// Contract term along mode 3 with vector v (length n), returning n×n slice (row-major i,j)
function addSlice(out, n, t, k) {
  const { U, G } = t, M = new Float64Array(R * R);
  for (let a = 0; a < R; a++) for (let b = 0; b < R; b++) {
    let s = 0; for (let c = 0; c < R; c++) s += G[a + R * b + R * R * c] * U[2][c][k];
    M[a + R * b] = s;
  }
  for (let i = 0; i < n; i++) {
    const ui = [U[0][0][i], U[0][1][i], U[0][2][i]];
    const row = [0, 0, 0];
    for (let b = 0; b < R; b++) row[b] = ui[0] * M[R * b] + ui[1] * M[1 + R * b] + ui[2] * M[2 + R * b];
    for (let j = 0; j < n; j++) out[i * n + j] += row[0] * U[1][0][j] + row[1] * U[1][1][j] + row[2] * U[1][2][j];
  }
}
export function sumSlice(n, terms, k) { const o = new Float64Array(n * n); for (const t of terms) addSlice(o, n, t, k); return o; }

// Full tensor (for the error), index i + n*j + n*n*k
export function fullSum(n, terms) {
  const X = new Float64Array(n * n * n);
  for (let k = 0; k < n; k++) { const s = sumSlice(n, terms, k); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) X[i + n * j + n * n * k] = s[i * n + j]; }
  return X;
}

// mode-m sketch: returns array of ℓ columns (length n)
function modeSketch(n, terms, mode, l, rnd) {
  const o1 = (mode + 1) % 3, o2 = (mode + 2) % 3;
  const Om = [o1, o2].map(() => Array.from({ length: l }, () => Float64Array.from({ length: n }, () => randn(rnd))));
  const Y = Array.from({ length: l }, () => new Float64Array(n));
  for (const t of terms) {
    // P = U_o1ᵀ Ω1 (R×ℓ), Q = U_o2ᵀ Ω2 (R×ℓ)
    const P = t.U[o1].map(u => Om[0].map(w => dot(u, w)));
    const Q = t.U[o2].map(u => Om[1].map(w => dot(u, w)));
    for (let c = 0; c < l; c++) {
      // coefficient vector: G contracted with P[:,c] on o1 and Q[:,c] on o2
      const coef = [0, 0, 0];
      for (let a = 0; a < R; a++) for (let b = 0; b < R; b++) for (let e = 0; e < R; e++) {
        const idx = [a, b, e]; // modes 0,1,2
        const g = t.G[a + R * b + R * R * e];
        coef[idx[mode]] += g * P[idx[o1]][c] * Q[idx[o2]][c];
      }
      const y = Y[c], U = t.U[mode];
      for (let i = 0; i < n; i++) y[i] += coef[0] * U[0][i] + coef[1] * U[1][i] + coef[2] * U[2][i];
    }
  }
  return Y;
}

// Orthonormal basis for range(Y) truncated at relative tolerance tol (via eig of YᵀY)
function truncBasis(Y, tol) {
  const l = Y.length, n = Y[0].length;
  const Gm = Array.from({ length: l }, (_, i) => Array.from({ length: l }, (_, j) => dot(Y[i], Y[j])));
  const { values, vectors } = symEig(Gm);
  const ord = values.map((v, i) => [Math.sqrt(Math.max(v, 0)), i]).sort((a, b) => b[0] - a[0]);
  const smax = ord[0][0] || 1, Q = [], sig = ord.map(o => o[0] / smax);
  for (const [s, i] of ord) {
    if (s <= tol * smax || s < 1e-12 * smax) break;
    const q = new Float64Array(n);
    for (let c = 0; c < l; c++) { const v = vectors[c][i] / s; for (let k = 0; k < n; k++) q[k] += v * Y[c][k]; }
    Q.push(q);
  }
  return { Q, sig };
}

export function compress(n, terms, tol, l, rnd) {
  const bases = [0, 1, 2].map(m => truncBasis(modeSketch(n, terms, m, l, rnd), tol));
  const Qs = bases.map(b => b.Q), r = Qs.map(q => q.length);
  // core: Σ_j G_j ×_m (Q_mᵀ U_m^j)
  const core = new Float64Array(r[0] * r[1] * r[2]);
  for (const t of terms) {
    const M = [0, 1, 2].map(m => Qs[m].map(q => t.U[m].map(u => dot(q, u)))); // r_m × R
    for (let a = 0; a < R; a++) for (let b = 0; b < R; b++) for (let c = 0; c < R; c++) {
      const g = t.G[a + R * b + R * R * c]; if (!g) continue;
      for (let z = 0; z < r[2]; z++) { const gz = g * M[2][z][c];
        for (let y = 0; y < r[1]; y++) { const gyz = gz * M[1][y][b];
          for (let x = 0; x < r[0]; x++) core[x + r[0] * (y + r[1] * z)] += gyz * M[0][x][a]; } }
    }
  }
  return { Qs, core, r, sig: bases.map(b => b.sig) };
}

export function compressedSlice(n, C, k) {
  const { Qs, core, r } = C, o = new Float64Array(n * n);
  // M[x,y] = Σ_z core[x,y,z] Q3_z[k]
  const M = new Float64Array(r[0] * r[1]);
  for (let z = 0; z < r[2]; z++) { const q = Qs[2][z][k]; for (let y = 0; y < r[1]; y++) for (let x = 0; x < r[0]; x++) M[x + r[0] * y] += core[x + r[0] * (y + r[1] * z)] * q; }
  // T = Q1 M  (n × r1), then o = T Q2ᵀ
  const T = new Float64Array(n * r[1]);
  for (let x = 0; x < r[0]; x++) { const q = Qs[0][x]; for (let y = 0; y < r[1]; y++) { const m = M[x + r[0] * y]; if (m) for (let i = 0; i < n; i++) T[i * r[1] + y] += q[i] * m; } }
  for (let y = 0; y < r[1]; y++) { const q = Qs[1][y]; for (let i = 0; i < n; i++) { const t = T[i * r[1] + y]; if (t) for (let j = 0; j < n; j++) o[i * n + j] += t * q[j]; } }
  return o;
}
export function compressedFull(n, C) {
  const X = new Float64Array(n * n * n);
  for (let k = 0; k < n; k++) { const s = compressedSlice(n, C, k); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) X[i + n * j + n * n * k] = s[i * n + j]; }
  return X;
}
