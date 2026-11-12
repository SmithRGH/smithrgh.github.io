/* Research page: block vs tangential low-rank ADI on the same equation. */
import { rng, randn } from './linalg.js';
import { makeADI, testProblem, logShifts } from './adi-core.js';
import { lineChart, heatmap, themeColors, onThemeChange, fmtExp } from './viz.js';

const root = document.querySelector('[data-demo="adi"]');
if (root) {
  const chart = root.querySelector('.rs-chart canvas'), strip = root.querySelector('[data-strip]'), xcv = root.querySelector('[data-x]');
  const mIn = root.querySelector('input[name=m]'), mOut = root.querySelector('[data-m]'), sum = root.querySelector('[data-summary]');
  const n = 260, tol = 1e-8; 
  let seed = 7, out = null, animFrame = null, computeTimer = null;

  function compute() {
    if (animFrame) cancelAnimationFrame(animFrame);
    
    const m = +mIn.value; mOut.textContent = m;
    const mk = () => testProblem(n, m, rng(seed), randn);
    const P = mk(), sh = logShifts(P.T, 12);
    const blk = makeADI(P.T, P.B, P.R, 'block', sh);
    const tan = makeADI(mk().T, mk().B, mk().R, 'tangential', sh);
    
    out = { blk, tan, X: null, m };
    sum.innerHTML = 'Computing...';

    let lastDraw = 0;

    function stepAnim(timestamp) {
      let bDone = blk.hist.at(-1).res <= tol || blk.Z.length >= 1500;
      let tDone = tan.hist.at(-1).res <= tol || tan.Z.length >= 1500;

      if (!bDone) blk.step();
      for (let i = 0; i < m; i++) {
        if (!tDone) {
          tan.step();
          tDone = tan.hist.at(-1).res <= tol || tan.Z.length >= 1500;
        }
      }

      // 1. Throttle chart rendering to ~15 FPS (every ~66ms) to prevent UI lockups
      if (timestamp - lastDraw > 66) {
        draw();
        lastDraw = timestamp;
      }

      if (!bDone || !tDone) {
        animFrame = requestAnimationFrame(stepAnim);
      } else {
        draw(); // Ensure final state is drawn
        sum.innerHTML = 'Computing final heatmap (this may take a moment)...';
        
        // Yield the thread so the UI can update before the heavy matrix math
        setTimeout(computeFinalX, 50); 
      }
    }
    
    animFrame = requestAnimationFrame(stepAnim);
  }

  // 2. Chunk the heavy math loop so it doesn't freeze the browser at the very end
  function computeFinalX() {
    const { tan, blk } = out;
    const X = new Float64Array(n * n);
    let k = 0;

    function chunkX() {
      // Process 300 columns per frame to maintain UI responsiveness
      const end = Math.min(k + 300, tan.Z.length);
      for (; k < end; k++) {
        const v = tan.Z[k], d = tan.d[k];
        for (let i = 0; i < n; i++) {
          const a = d * v[i];
          for (let j = 0; j < n; j++) X[i * n + j] += a * v[j];
        }
      }

      if (k < tan.Z.length) {
        animFrame = requestAnimationFrame(chunkX);
      } else {
        out.X = X;
        const b = blk.Z.length, t = tan.Z.length;
        sum.innerHTML = `To reach a relative residual of 10<sup>−8</sup>, block ADI stored <strong>${b}</strong> columns and the tangential method <strong>${t}</strong>, ${Math.round(100 * (1 - t / b))}% fewer.`;
        draw(); // Render final state including the heatmap
      }
    }
    chunkX();
  }

  function draw() {
    if (!out) return;
    const C = themeColors(), { blk, tan, X, m } = out;
    lineChart(chart, [
      { name: 'Block ADI', color: C.neg, pts: blk.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: -8 },
      { name: 'Tangential', color: C.pos, pts: tan.hist.map(h => ({ x: h.cols, y: h.res })), labelDy: 8 },
    ], { ymin: 1e-9, ymax: 1, xlabel: 'Columns in the solution factor L', ylabel: 'Relative residual' });
    
    // Defer heatmap drawing until computation finishes
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

  // 3. Debounce the slider to prevent rapid-fire matrix rebuilding while dragging
  mIn.addEventListener('input', () => { 
    mOut.textContent = mIn.value; 
  });
  
  mIn.addEventListener('change', () => {
    clearTimeout(computeTimer);
    computeTimer = setTimeout(compute, 150);
  });
  
  root.querySelector('[data-new]').addEventListener('click', () => { 
    seed = 1 + Math.floor(Math.random() * 9999); 
    clearTimeout(computeTimer);
    computeTimer = setTimeout(compute, 150);
  });
  
  onThemeChange(() => out && draw());
  let rt; 
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => out && draw(), 150); });
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { ob.disconnect(); compute(); } }, { rootMargin: '200px' }).observe(root);
}
