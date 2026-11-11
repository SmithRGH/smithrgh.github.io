/* Small dense/tridiagonal linear algebra helpers for the research demos.
   Plain ES module, no dependencies. */

// Seeded RNG (mulberry32) so demos are reproducible.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randn(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Tridiagonal operator A with sub/diag/super arrays (length n; sub[0], sup[n-1] unused).
export function triMul(T, x) {
  const n = x.length, y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = T.d[i] * x[i];
    if (i > 0) s += T.l[i] * x[i - 1];
    if (i < n - 1) s += T.u[i] * x[i + 1];
    y[i] = s;
  }
  return y;
}
// Solve (A + p I) x = b with the Thomas algorithm (real p).
export function triSolveShift(T, p, b) {
  const n = b.length, c = new Float64Array(n), d = new Float64Array(n);
  let m = T.d[0] + p;
  c[0] = T.u[0] / m; d[0] = b[0] / m;
  for (let i = 1; i < n; i++) {
    m = T.d[i] + p - T.l[i] * c[i - 1];
    c[i] = i < n - 1 ? T.u[i] / m : 0;
    d[i] = (b[i] - T.l[i] * d[i - 1]) / m;
  }
  const x = new Float64Array(n);
  x[n - 1] = d[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = d[i] - c[i] * x[i + 1];
  return x;
}
export function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
export function norm(a) { return Math.sqrt(dot(a, a)); }

// Symmetric eigen-decomposition by cyclic Jacobi (small matrices only).
export function symEig(Ain) {
  const n = Ain.length, A = Ain.map(r => Float64Array.from(r));
  const V = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n); r[i] = 1; return r; });
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  return { values: A.map((r, i) => r[i]), vectors: V }; // columns of V are eigenvectors
}

// Thin QR (modified Gram–Schmidt, twice) of column list; drops columns below tol.
export function orthCols(cols, tol = 1e-10) {
  const Q = [];
  for (const c0 of cols) {
    const c = Float64Array.from(c0), n0 = norm(c);
    for (let pass = 0; pass < 2; pass++) for (const q of Q) { const h = dot(q, c); for (let i = 0; i < c.length; i++) c[i] -= h * q[i]; }
    const nc = norm(c);
    if (nc > tol * Math.max(n0, 1e-300)) { for (let i = 0; i < c.length; i++) c[i] /= nc; Q.push(c); }
  }
  return Q;
}
