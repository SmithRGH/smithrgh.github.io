/* Research page: block vs tangential low-rank ADI on the same equation. */
import { rng, randn } from './linalg.js';
import { makeADI, testProblem, logShifts } from './adi-core.js';
import { lineChart, heatmap, themeColors, onThemeChange, fmtExp } from './viz.js';

const root = document.querySelector('[data-demo="adi"]');
if (root) {
  const chart = root.querySelector('.rs-chart canvas'), strip = root.querySelector('[data-strip]'), xcv = root.querySelector('[data-x]');
  const mIn = root.querySelector('input[name=m]'), mOut = root.querySelector('[data-m]'), sum = root.querySelector('[data-summary]');
  const n = 260, tol = 1e-8; let seed = 7, out = null;

  function compute() {
    const m = +mIn.value; mOut.textContent = m;
    const mk = () => testProblem(n, m, rng(seed), randn);
    const P = mk(), sh = logShifts(P.T, 12);
    const blk = makeADI(P.T, P.B, P.R, 'block', sh), tan = makeADI(mk().T, mk().B, mk().R, 'tangential', sh);
    while (blk.hist.at(-1).res > tol && blk.Z.length < 1500) blk.step();
    while (tan.hist.at(-1).res > tol && tan.Z.length < 1500) tan.step();
    const X = new Float64Array(n * n);
    tan.Z.forEach((v, k) => { const d = tan.d[k]; for (let i = 0; i < n; i++) { const a = d * v[i]; for (let j = 0; j < n; j++) X[i * n + j] += a * v[j]; } });
    out = { blk, tan, X, m };
    const b = blk.Z.length, t = tan.Z.length;
    sum.innerHTML = `To reach a relative residual of 10<sup>−8</sup>, block ADI stored <strong>${b}</strong> columns and the tangential method <strong>${t}</strong>, ${Math.round(100 * (1 - t / b))}% fewer.`;
    draw();
  }
  function draw() {
    const C = themeColors(), { blk, tan, X } = out;
    lineChart(chart, [
      { name: 'Block ADI', color: C.neg, pts: blk.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: -8 },
      { name: 'Tangential', color: C.pos, pts: tan.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: 8 },
    ], { ymin: 1e-9, ymax: 1, xlabel: 'Columns in the solution factor L', ylabel: 'Relative residual' });
    heatmap(xcv, X, n, n);
    // direction strip: one tick per tangential step, colored by the sign of R's eigenvalue
    const sc = strip, W = sc.clientWidth, H = sc.clientHeight, dpr = window.devicePixelRatio || 1;
    sc.width = W * dpr; sc.height = H * dpr; const ctx = sc.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const N = tan.dirs.length, w = W / N, rows = out.m, h = H / rows;
    tan.dirs.forEach((j, i) => { ctx.fillStyle = tan.lam[j] > 0 ? C.pos : C.neg; ctx.fillRect(i * w, j * h + 1, Math.max(w - 0.5, 0.8), h - 2); });
  }
  mIn.addEventListener('input', () => { mOut.textContent = mIn.value; });
  mIn.addEventListener('change', compute);
  root.querySelector('[data-new]').addEventListener('click', () => { seed = 1 + Math.floor(Math.random() * 9999); compute(); });
  onThemeChange(() => out && draw());
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => out && draw(), 150); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); compute(); } }, { rootMargin: '200px' }).observe(root);
}
