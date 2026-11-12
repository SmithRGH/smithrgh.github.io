/* Home page paper icons with a "Random paper" button.
   The chosen icon crouches, hops out of the grid, spins as it flies to the front,
   lands with a small bounce, and a card opens around it with the summary and a
   link to the article. Clicking an icon opens that paper the same way. */

import { fitFormula } from './thumbs.js';

const root = document.querySelector('[data-lucky]');
if (root) {
  const tiles = [...root.querySelectorAll('[data-tile]')];
  const overlay = root.querySelector('[data-lucky-overlay]');
  document.body.appendChild(overlay); // above the site header, not inside the page column
  const card = overlay.querySelector('.rs-lucky__card');
  const backdrop = overlay.querySelector('.rs-lucky__backdrop');
  const cardThumb = overlay.querySelector('.rs-lucky__thumb');
  const cardCanvas = cardThumb.querySelector('canvas');
  const body = overlay.querySelector('.rs-lucky__body');
  const goBtn = root.querySelector('[data-lucky-go]');
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let open = null, busy = false, last = -1;

  const thumbOf = (tile) => tile.querySelector('.rs-tile__thumb');
  const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2];
  const tf = (x, y, r, sx, sy = sx) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sx}, ${sy})`;

  async function show(idx) {
    const tile = tiles[idx], srcCanvas = thumbOf(tile).querySelector('canvas');
    body.innerHTML = tile.parentElement.querySelector('.rs-tile__more').innerHTML;
    const h = body.querySelector('.rs-card__title'); if (h) h.id = 'lucky-title';
    cardCanvas.width = srcCanvas.width; cardCanvas.height = srcCanvas.height;
    cardCanvas.style.imageRendering = srcCanvas.style.imageRendering || '';
    cardCanvas.getContext('2d').drawImage(srcCanvas, 0, 0);
    cardThumb.querySelectorAll('.rs-formula').forEach(e => e.remove());
    const fm = thumbOf(tile).querySelector('.rs-formula');
    if (fm) { const c = fm.cloneNode(true); c.style.fontSize = ''; cardThumb.appendChild(c); }

    card.classList.remove('is-open');
    overlay.hidden = false; document.documentElement.classList.add('rs-noscroll');
    open = idx; last = idx;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([body]).catch(() => {});

    cardThumb.querySelectorAll('.rs-formula').forEach(fitFormula);
    const from = thumbOf(tile).getBoundingClientRect(), to = cardThumb.getBoundingClientRect();
    const [fx, fy] = centre(from), [tx, ty] = centre(to);
    const dx = fx - tx, dy = fy - ty, s = from.width / to.width;
    tile.classList.add('is-lifted');
    if (still()) { card.classList.add('is-open'); focusCard(); return; }

    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out', fill: 'both' });
    await cardThumb.animate([
      { transform: tf(dx, dy, 0, s), offset: 0 },
      { transform: tf(dx, dy + 6, 0, s * 1.12, s * 0.84), offset: 0.12, easing: 'ease-out' },              // crouch
      { transform: tf(dx * 0.85, dy * 0.85 - 90, -14, s * 0.95, s * 1.08), offset: 0.3, easing: 'ease-in-out' }, // hop
      { transform: tf(dx * 0.25, -60, 250, 0.9), offset: 0.62, easing: 'ease-in' },                             // spinning flight
      { transform: tf(0, 10, 360, 1.08, 0.92), offset: 0.82, easing: 'ease-out' },                             // landing squash
      { transform: tf(0, -6, 360, 0.98, 1.03), offset: 0.92, easing: 'ease-in-out' },                          // bounce
      { transform: tf(0, 0, 360, 1), offset: 1 },
    ], { duration: 1250, fill: 'both' }).finished;
    cardThumb.querySelectorAll('.rs-formula').forEach(fitFormula);
    card.classList.add('is-open');
    focusCard();
  }
  card.tabIndex = -1;
  function focusCard() { card.focus({ preventScroll: true }); }

  async function close() {
    if (open === null) return;
    const tile = tiles[open], dest = thumbOf(tile).getBoundingClientRect(), now = cardThumb.getBoundingClientRect();
    const [fx, fy] = centre(dest), [tx, ty] = centre(now);
    card.classList.remove('is-open');
    if (!still()) {
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'both' });
      cardThumb.getAnimations().forEach(a => a.cancel());
      await cardThumb.animate([
        { transform: tf(0, 0, 0, 1) },
        { transform: tf((fx - tx) * 0.5, (fy - ty) * 0.5 - 50, -8, 0.8) , offset: 0.5 },
        { transform: tf(fx - tx, fy - ty, 0, dest.width / now.width) },
      ], { duration: 560, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }).finished;
    }
    tile.classList.remove('is-lifted');
    overlay.hidden = true; document.documentElement.classList.remove('rs-noscroll');
    cardThumb.getAnimations().forEach(a => a.cancel());
    tile.focus({ preventScroll: true });
    open = null;
  }

  async function run(fn) { if (busy) return; busy = true; goBtn.disabled = true; try { await fn(); } finally { busy = false; goBtn.disabled = false; } }
  function randomPick() { let p; do { p = Math.floor(Math.random() * tiles.length); } while (tiles.length > 1 && p === last); return p; }

  goBtn.addEventListener('click', () => run(async () => { if (open !== null) await close(); await show(randomPick()); }));
  overlay.querySelectorAll('[data-lucky-close]').forEach(el => el.addEventListener('click', () => run(close)));
  tiles.forEach((t, i) => t.addEventListener('click', () => run(() => show(i))));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open !== null) run(close); });
}
