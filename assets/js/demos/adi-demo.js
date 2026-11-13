/* Article page: block vs tangential low-rank ADI on the same equation.
   Both methods run a few steps per animation frame, so the residual curves, the solution
   heatmap and the direction strip grow live, and the page never freezes. Moving the slider
   or pressing "New random B and R" stops the current run and starts a new one. */
import { rng, randn } from './linalg.js';
import { makeADI, testProblem, logShifts } from './adi-core.js';
import { lineChart, heatmap, themeColors, onThemeChange, reducedMotion } from './viz.js';

const root = document.querySelector('[data-demo="adi"]');
if (root) {
  const chart = root.querySelector('.rs-chart canvas'), strip = root.querySelector('[data-strip]'), xcv = root.querySelector('[data-x]');
  const mIn = root.querySelector('input[name=m]'), mOut = root.querySelector('[data-m]'), sum = root.querySelector('[data-summary]');
  const n = 260, tol = 1e-8, MAXCOLS = 1500, COLS_PER_FRAME = 6;
  let seed = 7, run = null, raf = 0;

  function start() {
    cancelAnimationFrame(raf);
    const m = +mIn.value; mOut.textContent = m;
    const mk = () => testProblem(n, m, rng(seed), randn);
    const P = mk(), sh = logShifts(P.T, 12);
    run = {
      m, target: 0, X: new Float64Array(n * n), used: 0,
      blk: makeADI(P.T, P.B, P.R, 'block', sh),
      tan: makeADI(mk().T, mk().B, mk().R, 'tangential', sh),
    };
    sum.textContent = 'Running…';
    if (reducedMotion()) { while (!finished()) advance(1e9); draw(); report(); return; }
    raf = requestAnimationFrame(tick);
  }
  const busy = (A) => A.hist.at(-1).res > tol && A.Z.length < MAXCOLS;
  const finished = () => !busy(run.blk) && !busy(run.tan);
  /* Advance both methods up to the same number of stored columns, so they race fairly. */
  function advance(cols) {
    run.target += cols;
    const t0 = performance.now();
    while (busy(run.blk) && run.blk.Z.length < run.target && performance.now() - t0 < 25) run.blk.step();
    while (busy(run.tan) && run.tan.Z.length < run.target && performance.now() - t0 < 40) run.tan.step();
    /* add the new tangential columns to the heatmap of X = L D L^H */
    const { tan, X } = run;
    for (; run.used < tan.Z.length; run.used++) {
      const v = tan.Z[run.used], d = tan.d[run.used];
      for (let i = 0; i < n; i++) { const a = d * v[i]; if (a === 0) continue; const row = i * n; for (let j = 0; j < n; j++) X[row + j] += a * v[j]; }
    }
  }
  function tick() {
    advance(COLS_PER_FRAME); draw();
    if (finished()) report(); else raf = requestAnimationFrame(tick);
  }
  function draw() {
    const C = themeColors(), { blk, tan, X, m } = run;
    lineChart(chart, [
      { name: 'Block ADI', color: C.neg, pts: blk.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: -8 },
      { name: 'Tangential', color: C.pos, pts: tan.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: 8 },
    ], { ymin: 1e-9, ymax: 1, xmin: 70 * m, xlabel: 'Columns in the solution factor L', ylabel: 'Relative residual' });
    heatmap(xcv, X, n, n);
    /* direction strip: one tick per tangential step, colored by the sign of R's eigenvalue */
    const sc = strip, W = sc.clientWidth, H = sc.clientHeight, dpr = window.devicePixelRatio || 1;
    sc.width = W * dpr; sc.height = H * dpr; const ctx = sc.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const N = Math.max(tan.dirs.length, 1), w = W / N, h = H / m;
    tan.dirs.forEach((j, i) => { ctx.fillStyle = tan.lam[j] > 0 ? C.pos : C.neg; ctx.fillRect(i * w, j * h + 1, Math.max(w - 0.5, 0.8), h - 2); });
  }
  function report() {
    const b = run.blk.Z.length, t = run.tan.Z.length;
    sum.innerHTML = `To reach a relative residual of 10<sup>−8</sup>, block ADI stored <strong>${b}</strong> columns and the tangential method <strong>${t}</strong>, ${Math.round(100 * (1 - t / b))}% fewer.`;
  }
  mIn.addEventListener('input', () => { mOut.textContent = mIn.value; });
  mIn.addEventListener('change', start);
  root.querySelector('[data-new]').addEventListener('click', () => { seed = 1 + Math.floor(Math.random() * 9999); start(); });
  onThemeChange(() => run && draw());
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => run && draw(), 150); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); start(); } }, { rootMargin: '200px' }).observe(root);
}
