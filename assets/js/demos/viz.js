/* Canvas helpers shared by the demos: theme colors, diverging heatmaps,
   and a small log-scale line chart with hover. */

export function themeColors() {
  const cs = getComputedStyle(document.documentElement), g = (v) => cs.getPropertyValue(v).trim();
  return { pos: g('--rs-pos'), neg: g('--rs-neg'), mid: g('--rs-field'), ink: g('--rs-ink'), muted: g('--rs-muted'), rule: g('--rs-rule') };
}
export function onThemeChange(fn) {
  new MutationObserver(() => fn()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
/* Diverging colormaps (index 0 = most negative, last = most positive).
   Light: ColorBrewer RdBu, the red–blue scale familiar from matplotlib's RdBu_r.
   Dark: the same hues around a dark centre so zero blends into the page.
   Stops are interpolated in OKLab, which keeps the ramps smooth and even. */
const STOPS = {
  light: ['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#fbfbfb', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f'],
  dark:  ['#a9d4f5', '#6fb0e8', '#4a8fd0', '#30689f', '#1c3550', '#14181f', '#4a1d25', '#80283a', '#b33a3e', '#dd6250', '#f3936f'],
};
function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }
const toLin = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
const toSrgb = (u) => { const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055; return Math.round(255 * Math.min(1, Math.max(0, v))); };
function rgb2lab([r, g, b]) {
  r = toLin(r); g = toLin(g); b = toLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function lab2rgb([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  return [toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
}
const LUTS = {};
function lut(theme) {
  if (LUTS[theme]) return LUTS[theme];
  const st = STOPS[theme].map(c => rgb2lab(hex(c))), N = 513, out = new Uint8ClampedArray(N * 3);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) * (st.length - 1), k = Math.min(Math.floor(t), st.length - 2), f = t - k;
    const c = lab2rgb([0, 1, 2].map(j => st[k][j] + f * (st[k + 1][j] - st[k][j])));
    out[3 * i] = c[0]; out[3 * i + 1] = c[1]; out[3 * i + 2] = c[2];
  }
  return (LUTS[theme] = out);
}
export function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
// Colour for value x in [-1, 1]
export function cmap(x) { const L = lut(isDark() ? 'dark' : 'light'), i = Math.round((Math.max(-1, Math.min(1, x)) + 1) * 256); return `rgb(${L[3 * i]},${L[3 * i + 1]},${L[3 * i + 2]})`; }

// Paint an n×m row-major Float64Array into a canvas (1 px per entry; CSS scales it).
export function heatmap(canvas, data, rows, cols, opts = {}) {
  const L = lut(isDark() ? 'dark' : 'light');
  if (canvas.width !== cols) canvas.width = cols;
  if (canvas.height !== rows) canvas.height = rows;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(cols, rows), px = img.data;
  let mx = opts.max; if (!mx) { mx = 0; for (let i = 0; i < data.length; i++) mx = Math.max(mx, Math.abs(data[i])); }
  const gamma = opts.gamma ?? 0.7, seq = opts.sequential;
  for (let i = 0; i < rows * cols; i++) {
    let x = mx ? data[i] / mx : 0;
    x = Math.sign(x) * Math.pow(Math.min(Math.abs(x), 1), gamma);
    if (seq) x = Math.abs(x) * 0.85;           // positive half only, stopping short of the darkest step
    const k = 3 * Math.round((x + 1) * 256);
    px[4 * i] = L[k]; px[4 * i + 1] = L[k + 1]; px[4 * i + 2] = L[k + 2]; px[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return mx;
}

export function fmtExp(x) {
  if (!isFinite(x) || x <= 0) return '0';
  const e = Math.floor(Math.log10(x)), m = x / 10 ** e;
  return `${m.toFixed(1)}×10<sup>${e}</sup>`;
}

/* Line chart: series = [{name, color, pts:[{x,y}]}], log y. Direct labels at line ends,
   hover crosshair with a tooltip listing each series' value at the nearest x. */
export function lineChart(canvas, series, opt) {
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const C = themeColors(), pad = { l: 52, r: 92, t: 12, b: 38 };
  const xs = series.flatMap(s => s.pts.map(p => p.x)), xmax = Math.max(opt.xmin ?? 0, ...xs, 1);
  const ylo = opt.ymin, yhi = opt.ymax ?? 1, lin = !!opt.linear;
  const X = (x) => pad.l + (W - pad.l - pad.r) * (x / xmax);
  const Y = lin ? (y) => pad.t + (H - pad.t - pad.b) * (yhi - y) / (yhi - ylo)
               : (y) => pad.t + (H - pad.t - pad.b) * (Math.log10(yhi) - Math.log10(Math.max(y, ylo))) / (Math.log10(yhi) - Math.log10(ylo));
  ctx.clearRect(0, 0, W, H);
  ctx.font = '12px "Instrument Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
  // grid + y ticks
  const yt = lin ? Array.from({ length: Math.floor((yhi - ylo) / (opt.ystep || 4)) + 1 }, (_, i) => ylo + i * (opt.ystep || 4)) : [];
  if (!lin) for (let e = Math.ceil(Math.log10(ylo)); e <= Math.log10(yhi); e += 2) yt.push(10 ** e);
  for (const v of yt) {
    const y = Y(v); ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(lin ? String(v) : `1e${Math.round(Math.log10(v))}`, pad.l - 8, y);
  }
  // x ticks: as many as fit without the numbers touching (fewer on narrow phone screens)
  const labelW = ctx.measureText(String(Math.round(xmax))).width + 14;
  const fit = Math.max(1, Math.floor((W - pad.l - pad.r) / labelW));
  let step = niceStep(xmax / Math.min(5, fit));
  while (xmax / step > fit) step = nextNice(step);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let x = 0; x <= xmax; x += step) { ctx.fillStyle = C.muted; ctx.fillText(String(x), X(x), H - pad.b + 8); }
  ctx.fillText(opt.xlabel, pad.l + (W - pad.l - pad.r) / 2, H - 16);
  ctx.save(); ctx.translate(12, pad.t + (H - pad.t - pad.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(opt.ylabel, 0, 0); ctx.restore();
  // lines
  for (const s of series) {
    if (!s.pts.length) continue;
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    s.pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke();
    const last = s.pts[s.pts.length - 1];
    ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(last.x), Y(last.y), 4, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s.name, X(last.x) + 8, Y(last.y) + (s.labelDy || 0));
  }
  // hover layer
  canvas._chart = { series, X, Y, pad, W, H, xmax, opt };
  if (!canvas._hover) {
    canvas._hover = true;
    const tip = document.createElement('div'); tip.className = 'rs-tip'; tip.hidden = true; canvas.parentElement.appendChild(tip);
    canvas.addEventListener('pointermove', (ev) => {
      const ch = canvas._chart, r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left;
      const xv = (mx - ch.pad.l) / (ch.W - ch.pad.l - ch.pad.r) * ch.xmax;
      if (xv < 0 || xv > ch.xmax) { tip.hidden = true; return; }
      const fmt = ch.opt.linear ? (v) => String(v) : fmtExp;
      const rows = ch.series.map(s => { let best = null; for (const p of s.pts) if (p.x <= xv) best = p; return best && `<span class="rs-sw" style="background:${s.color}"></span>${s.name}: ${fmt(best.y)}`; }).filter(Boolean);
      if (!rows.length) { tip.hidden = true; return; }
      tip.innerHTML = `<strong>${ch.opt.xunit ? ch.opt.xunit(Math.round(xv)) : Math.round(xv) + ' columns'}</strong><br>` + rows.join('<br>');
      tip.hidden = false; tip.style.left = Math.min(mx + 14, ch.W - 170) + 'px'; tip.style.top = (ev.clientY - r.top - 10) + 'px';
    });
    canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
}
/* The next larger step in the 1, 2, 5, 10, 20, 50, ... sequence */
function nextNice(s) { const e = 10 ** Math.floor(Math.log10(s) + 1e-9), m = Math.round(s / e); return (m < 2 ? 2 : m < 5 ? 5 : 10) * e; }
function niceStep(x) { const e = 10 ** Math.floor(Math.log10(x)), m = x / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; }

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
