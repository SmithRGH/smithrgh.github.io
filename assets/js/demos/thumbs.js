/* Paper icons: one smooth heatmap per paper, all in the same diverging
   colormap (red positive, blue negative), each computed from that paper's topic.
     adi        solution X of an indefinite Lyapunov equation (tangential ADI)
     tucker     a slice through a sum of Tucker tensors
     attention  attention scores QKᵀ for tokens with positional and content features
     gmres      middle slice of a 3D convection–diffusion solution from sketched GMRES */
import { rng } from './linalg.js';
import { makeADI, logShifts, convDiff, sourcesProblem } from './adi-core.js';
import * as T from './tucker-core.js';
import { makeProblem, sketchedGMRES, sliceOf } from './gmres-core.js';
import { heatmap, onThemeChange } from './viz.js';

const cache = {};
const icons = {
  adi() {
    const n = 120, src = [{ x: 0.18, w: 0.045, sign: 1 }, { x: 0.4, w: 0.035, sign: -1 }, { x: 0.62, w: 0.045, sign: 1 }, { x: 0.82, w: 0.035, sign: -1 }];
    const A = convDiff(n, 15), { B, R } = sourcesProblem(n, src), st = makeADI(A, B, R, 'tangential', logShifts(A, 12));
    while (st.hist[st.hist.length - 1].res > 1e-5) st.step();
    const X = new Float64Array(n * n);
    st.Z.forEach((v, k) => { for (let i = 0; i < n; i++) { const a = st.d[k] * v[i]; for (let j = 0; j < n; j++) X[i * n + j] += a * v[j]; } });
    return { data: X, n, gamma: 0.6 };
  },
  tucker() {
    const n = 64, r = rng(5), terms = [];
    for (let i = 0; i < 10; i++) terms.push(T.makeTerm(n, 0.15 + 0.7 * r(), 0.15 + 0.7 * r(), 0.5, r));
    return { data: T.sumSlice(n, terms, 32), n, gamma: 0.75 };
  },
  attention() {
    // scores S_ij = q_i·k_j: a few positional frequencies (diagonal bands) plus smooth content clusters
    const n = 112, d = 10, r = rng(4), t = (i) => (i + 0.5) / n;
    const cl = (x) => [Math.exp(-((x - 0.22) ** 2) / 0.006), Math.exp(-((x - 0.55) ** 2) / 0.01), Math.exp(-((x - 0.83) ** 2) / 0.005)];
    const feat = (x, key) => {
      const f = [];
      for (let k = 1; k <= 3; k++) { const w = 2 * Math.PI * k * x, a = 1 / k; f.push(a * Math.cos(w), a * Math.sin(w)); }
      const c = cl(x); f.push(...c.map((v, i) => (key && i === 1 ? -1 : 1) * 1.4 * v));
      return f;
    };
    const S = new Float64Array(n * n);
    for (let i = 0; i < n; i++) { const q = feat(t(i), false); for (let j = 0; j < n; j++) { const k = feat(t(j), true); let s = 0; for (let z = 0; z < q.length; z++) s += q[z] * k[z]; S[i * n + j] = s; } }
    let m = 0; for (const v of S) m += v; m /= S.length; for (let i = 0; i < S.length; i++) S[i] -= m;
    return { data: S, n, gamma: 0.85 };
  },
  gmres() {
    const n = 18, P = makeProblem(n, 20), G = sketchedGMRES(P, { tol: 1e-3, k: 3, rnd: rng(1) });
    for (let j = 0; j < 30; j++) G.step();
    return { data: sliceOf(G.x, n), n, gamma: 0.8 };
  },
};

export function drawThumbs() {
  document.querySelectorAll('[data-thumb]').forEach(el => {
    const key = el.dataset.thumb, cv = el.querySelector('canvas');
    if (!icons[key] || !cv) return;
    const ic = cache[key] || (cache[key] = icons[key]());
    cv.style.imageRendering = 'auto';
    heatmap(cv, ic.data, ic.n, ic.n, { gamma: ic.gamma });
  });
}
drawThumbs();
onThemeChange(drawThumbs);

/* Shrink each formula overlay until it fits the width of its icon. */
export function fitFormula(el) {
  // Measure only the visible maths (MathJax's hidden accessibility copy would inflate scrollWidth).
  el.style.fontSize = '';
  const cs = getComputedStyle(el), base = parseFloat(cs.fontSize);
  const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const parts = [...el.querySelectorAll('mjx-math')];
  if (!parts.length || avail <= 0) return;
  const need = Math.max(...parts.map(m => m.getBoundingClientRect().width / (el.getBoundingClientRect().width / el.offsetWidth || 1)));
  if (need > avail) el.style.fontSize = Math.max(7, base * avail / need * 0.98) + 'px';
}
export function fitAll() { document.querySelectorAll('.rs-formula').forEach(fitFormula); }
(function whenMathReady(tries = 0) {
  const MJ = window.MathJax;
  const settle = () => { fitAll(); if (document.fonts) document.fonts.ready.then(fitAll); setTimeout(fitAll, 600); setTimeout(fitAll, 1800); };
  if (MJ && MJ.startup && MJ.startup.promise) MJ.startup.promise.then(() => (MJ.typesetPromise ? MJ.typesetPromise() : null)).then(settle).catch(settle);
  else if (tries < 100) setTimeout(() => whenMathReady(tries + 1), 100);
  else fitAll();
})();
let fr; window.addEventListener('resize', () => { clearTimeout(fr); fr = setTimeout(fitAll, 150); });
