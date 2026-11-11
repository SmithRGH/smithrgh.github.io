/* Research page: click to add Tucker tensors; watch the formal core grow and the sketch recompress it. */
import { rng } from './linalg.js';
import * as T from './tucker-core.js';
import { heatmap, themeColors, onThemeChange } from './viz.js';

const root = document.querySelector('[data-demo="tucker"]');
if (root) {
  const n = 48, rnd = rng(12);
  const [cvSum, cvCmp] = root.querySelectorAll('canvas[data-slice]'), cvCore = root.querySelector('canvas[data-core]');
  const kIn = root.querySelector('input[name=k]'), tolIn = root.querySelector('select[name=tol]');
  const el = (k) => root.querySelector(`[data-${k}]`);
  let terms = [], C = null, err = 0;

  function recompute() {
    if (!terms.length) { C = null; err = 0; return render(); }
    const l = Math.min(3 * terms.length, n) + 10;
    C = T.compress(n, terms, +tolIn.value, l, rng(99));
    const X = T.fullSum(n, terms), Xh = T.compressedFull(n, C);
    let e = 0, x = 0; for (let i = 0; i < X.length; i++) { e += (X[i] - Xh[i]) ** 2; x += X[i] ** 2; }
    err = Math.sqrt(e / x);
    render();
  }
  function render() {
    const k = +kIn.value, s = terms.length;
    const S = T.sumSlice(n, terms, k), mx = Math.max(1e-9, ...Array.from(S, Math.abs));
    heatmap(cvSum, S, n, n, { max: mx, gamma: 0.8 });
    heatmap(cvCmp, C ? T.compressedSlice(n, C, k) : new Float64Array(n * n), n, n, { max: mx, gamma: 0.8 });
    const f = (x) => x.toLocaleString('en-US');
    el('terms').textContent = s;
    el('formal').textContent = s ? `${3 * s} × ${3 * s} × ${3 * s} = ${f((3 * s) ** 3)}` : '0';
    el('sketched').textContent = C ? `${C.r.join(' × ')} = ${f(C.r[0] * C.r[1] * C.r[2])}` : '0';
    el('err').innerHTML = C ? err.toExponential(1).replace(/e([-+]\d+)/, (_, e) => `×10<sup>${+e}</sup>`) : '0';
    el('full').textContent = f(n ** 3);
    drawCores();
  }
  function drawCores() {
    const c = themeColors(), dpr = window.devicePixelRatio || 1, W = cvCore.clientWidth, H = cvCore.clientHeight;
    cvCore.width = W * dpr; cvCore.height = H * dpr; const ctx = cvCore.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = terms.length, maxSide = Math.min(H - 48, W * 0.55), scale = maxSide / Math.max(3 * Math.max(s, 1), n);
    ctx.font = '12px "Instrument Sans", system-ui, sans-serif'; ctx.textBaseline = 'top';
    // full tensor outline for scale
    const side = 3 * s * scale, fullSide = n * scale, x0 = 0, y0 = 22;
    ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.strokeRect(x0 + 0.5, y0 + 0.5, fullSide, fullSide); ctx.setLineDash([]);
    ctx.fillStyle = c.muted; ctx.fillText('Dashed: n = 48, the size of the tensor itself', x0, y0 + Math.max(side, fullSide) + 8);
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, side, side);
    for (let j = 0; j < s; j++) { ctx.fillStyle = c.neg; ctx.fillRect(x0 + 3 * j * scale + 1, y0 + 3 * j * scale + 1, 3 * scale - 1, 3 * scale - 1); }
    ctx.fillStyle = c.ink; ctx.fillText('Formal core (block diagonal)', x0, 2);
    if (C) {
      const xs = Math.max(side, fullSide) + 36, rs = C.r[0] * scale;
      ctx.fillStyle = c.pos; ctx.fillRect(xs, y0, C.r[0] * scale, C.r[1] * scale);
      ctx.fillStyle = c.ink; ctx.fillText('After sketching', xs, 2);
    }
  }
  function addAt(x, y) { terms.push(T.makeTerm(n, x, y, 0.2 + 0.6 * rnd(), rnd)); recompute(); }
  cvSum.addEventListener('click', (ev) => { const r = cvSum.getBoundingClientRect(); addAt((ev.clientY - r.top) / r.height, (ev.clientX - r.left) / r.width); });
  cvSum.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); addAt(rnd(), rnd()); } });
  root.querySelector('[data-add]').addEventListener('click', () => { for (let i = 0; i < 6; i++) terms.push(T.makeTerm(n, rnd(), rnd(), rnd(), rnd)); recompute(); });
  root.querySelector('[data-clear]').addEventListener('click', () => { terms = []; recompute(); });
  kIn.addEventListener('input', render); tolIn.addEventListener('change', recompute);
  onThemeChange(render);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawCores, 150); });
  for (let i = 0; i < 8; i++) terms.push(T.makeTerm(n, 0.15 + 0.7 * rnd(), 0.15 + 0.7 * rnd(), 0.3 + 0.4 * rnd(), rnd));
  recompute();
}
