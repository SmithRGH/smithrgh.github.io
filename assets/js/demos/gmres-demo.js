/* Article page demo: RHOSVD-Tucker sGMRES vs RHOSVD-Tucker GMRES on the 3D
   convection–diffusion problem of Section 4.2 of the paper, everything in Tucker
   format (see tucker-gmres.js). The two solvers advance in turns, within a time
   budget per animation frame, so the page stays responsive. */
import { makeProblem, sGMRES, tGMRES, slice } from './tucker-gmres.js';
import { lineChart, heatmap, themeColors, onThemeChange, fmtExp } from './viz.js';

const root = document.querySelector('[data-demo="gmres"]');
if (root) {
  const n = 24, MAXIT = 80, P = makeProblem(n);
  const [resCv, timeCv] = root.querySelectorAll('.rs-chart canvas'), sliceCv = root.querySelector('canvas[data-slice]');
  const tolIn = root.querySelector('select[name=tol]'), kIn = root.querySelector('select[name=k]');
  const itEl = root.querySelector('[data-it]'), sum = root.querySelector('[data-summary]');
  let run = null, raf = 0, seed = 1;

  function start() {
    cancelAnimationFrame(raf);
    const tol = +tolIn.value;
    run = {
      tol, A: sGMRES(P, { tol, ktrunc: +kIn.value, maxit: MAXIT, seed }), B: tGMRES(P, { tol, seed: seed + 1 }),
      a: { res: [{ x: 0, y: 1 }], tres: null, time: [{ x: 0, y: 0 }], t: 0, rank: 0, its: 0 },
      b: { res: [{ x: 0, y: 1 }], tres: null, time: [{ x: 0, y: 0 }], t: 0, rank: 0, its: 0 }, x: null,
    };
    sum.textContent = ''; draw();
    raf = requestAnimationFrame(tick);
  }
  function stepOne(S, s) {
    const t0 = performance.now(), r = S.step(); s.t += performance.now() - t0; s.its++;
    s.res.push({ x: s.its, y: Math.max(r.sres, 1e-12) }); s.time.push({ x: s.its, y: s.t / 1000 });
    s.rank = Math.max(s.rank, r.rank); if (r.tres != null) s.tres = r.tres;
    return r;
  }
  function tick() {
    const t0 = performance.now();
    while (performance.now() - t0 < 30) {
      const aGo = !run.A.done && run.a.its < MAXIT, bGo = !run.B.done && run.b.its < MAXIT;
      if (!aGo && !bGo) break;
      if (aGo && (!bGo || run.a.t <= run.b.t)) { const r = stepOne(run.A, run.a); if (r.tres != null && run.A.x) run.x = run.A.x; }
      else stepOne(run.B, run.b);
    }
    draw();
    const more = (!run.A.done && run.a.its < MAXIT) || (!run.B.done && run.b.its < MAXIT);
    if (more) raf = requestAnimationFrame(tick); else finish();
  }
  function draw() {
    const C = themeColors();
    lineChart(resCv, [
      { name: 'Tucker GMRES', color: C.neg, pts: run.b.res, labelDy: -10 },
      { name: 'Tucker sGMRES', color: C.pos, pts: run.a.res, labelDy: 10 },
    ], { ymin: 1e-6, ymax: 1, xmin: MAXIT, xlabel: 'Iteration', ylabel: 'Residual', xunit: (x) => `Iteration ${x}` });
    const tmax = Math.max(0.5, run.a.t, run.b.t) / 1000, step = tmax > 8 ? 2 : tmax > 4 ? 1 : 0.5;
    lineChart(timeCv, [
      { name: 'Tucker GMRES', color: C.neg, pts: run.b.time, labelDy: -8 },
      { name: 'Tucker sGMRES', color: C.pos, pts: run.a.time, labelDy: 8 },
    ], { linear: true, ymin: 0, ymax: Math.ceil(tmax / step) * step, ystep: step, xmin: MAXIT, xlabel: 'Iteration', ylabel: 'Time (s)', xunit: (x) => `Iteration ${x}` });
    if (run.x) heatmap(sliceCv, slice(run.x, 1), n, n, { gamma: 0.5 });
    else heatmap(sliceCv, new Float64Array(n * n), n, n, { max: 1 });
    itEl.textContent = `${run.a.its} / ${run.b.its}`;
  }
  function finish() {
    const a = run.a, b = run.b, f = (s) => (s.t / 1000).toFixed(1);
    sum.innerHTML = `Tucker sGMRES (k<sub>trunc</sub> = ${kIn.value}) stopped after ${a.its} iterations and ${f(a)} s, with true residual ${fmtExp(a.tres)}. ` +
      `Tucker GMRES with full orthogonalization took ${b.its} iterations and ${f(b)} s, with true residual ${fmtExp(b.tres)}. ` +
      `The largest Tucker rank of any basis tensor was ${a.rank} and ${b.rank} respectively, out of ${n}.`;
  }
  tolIn.addEventListener('change', start); kIn.addEventListener('change', start);
  root.querySelector('[data-run]').addEventListener('click', () => { seed += 2; start(); });
  onThemeChange(() => run && draw());
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => run && draw(), 150); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); start(); } }, { rootMargin: '100px' }).observe(root);
}
