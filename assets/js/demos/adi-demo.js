/* Research page: block vs tangential low-rank ADI on the same equation. */
import { rng, randn } from './linalg.js';
import { makeADI, testProblem, logShifts } from './adi-core.js';
import { lineChart, heatmap, themeColors, onThemeChange, fmtExp } from './viz.js';

const root = document.querySelector('[data-demo="adi"]');
if (root) {
  const chart = root.querySelector('.rs-chart canvas'), strip = root.querySelector('[data-strip]'), xcv = root.querySelector('[data-x]');
  const mIn = root.querySelector('input[name=m]'), mOut = root.querySelector('[data-m]'), sum = root.querySelector('[data-summary]');
  const n = 260, tol = 1e-8; let seed = 7, out = null, animFrame = null;

  function compute() {
    // Cancel any ongoing computation if the user drags the slider or generates a new problem
    if (animFrame) cancelAnimationFrame(animFrame);
    
    const m = +mIn.value; mOut.textContent = m;
    const mk = () => testProblem(n, m, rng(seed), randn);
    const P = mk(), sh = logShifts(P.T, 12);
    const blk = makeADI(P.T, P.B, P.R, 'block', sh);
    const tan = makeADI(mk().T, mk().B, mk().R, 'tangential', sh);
    
    out = { blk, tan, X: null, m };
    sum.innerHTML = 'Computing...';

    function stepAnim() {
      let bDone = blk.hist.at(-1).res <= tol || blk.Z.length >= 1500;
      let tDone = tan.hist.at(-1).res <= tol || tan.Z.length >= 1500;

      // Execute a small chunk of steps per frame to avoid locking the UI thread.
      // 1 block step creates `m` columns; `m` tangential steps create `m` columns.
      if (!bDone) blk.step();
      for (let i = 0; i < m; i++) {
        if (!tDone) {
          tan.step();
          tDone = tan.hist.at(-1).res <= tol || tan.Z.length >= 1500;
        }
      }

      draw(); // Live render the updated history

      if (!bDone || !tDone) {
        animFrame = requestAnimationFrame(stepAnim);
      } else {
        // Compute the final heavy matrix X and update the summary only when calculations finish
        const X = new Float64Array(n * n);
        tan.Z.forEach((v, k) => { 
          const d = tan.d[k]; 
          for (let i = 0; i < n; i++) { 
            const a = d * v[i]; 
            for (let j = 0; j < n; j++) X[i * n + j] += a * v[j]; 
          } 
        });
        out.X = X;
        
        const b = blk.Z.length, t = tan.Z.length;
        sum.innerHTML = `To reach a relative residual of 10<sup>−8</sup>, block ADI stored <strong>${b}</strong> columns and the tangential method <strong>${t}</strong>, ${Math.round(100 * (1 - t / b))}% fewer.`;
        draw(); // Render the final state including the heatmap
      }
    }
    
    animFrame = requestAnimationFrame(stepAnim);
  }

  function draw() {
    if (!out) return;
    const C = themeColors(), { blk, tan, X, m } = out;
    lineChart(chart, [
      { name: 'Block ADI', color: C.neg, pts: blk.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: -8 },
      { name: 'Tangential', color: C.pos, pts: tan.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: 8 },
    ], { ymin: 1e-9, ymax: 1, xlabel: 'Columns in the solution factor L', ylabel: 'Relative residual' });
    
    // Defer heatmap drawing until computation finishes to maintain 60FPS during animation
    if (X) heatmap(xcv, X, n, n);
    
    // direction strip: one tick per tangential step, colored by the sign of R's eigenvalue
    const sc = strip, W = sc.clientWidth, H = sc.clientHeight, dpr = window.devicePixelRatio || 1;
    sc.width = W * dpr; sc.height = H * dpr; const ctx = sc.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const N = tan.dirs.length;
    if (N > 0) {
        const w = W / N, rows = m, h = H / rows;
        tan.dirs.forEach((j, i) => { 
          ctx.fillStyle = tan.lam[j] > 0 ? C.pos : C.neg; 
          ctx.fillRect(i * w, j * h + 1, Math.max(w - 0.5, 0.8), h - 2); 
        });
    }
  }

  mIn.addEventListener('input', () => { mOut.textContent = mIn.value; });
  mIn.addEventListener('change', compute);
  root.querySelector('[data-new]').addEventListener('click', () => { seed = 1 + Math.floor(Math.random() * 9999); compute(); });
  onThemeChange(() => out && draw());
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => out && draw(), 150); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); compute(); } }, { rootMargin: '200px' }).observe(root);
}
