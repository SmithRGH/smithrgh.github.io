/* BibTeX pop-up for the Publications, Research and Software pages.
   A button with data-bibtex shows the text of the hidden <pre class="rs-bib"> next to it. */
(function () {
  var modal = document.querySelector('[data-bibmodal]');
  if (!modal) return;
  document.body.appendChild(modal); /* above the site header, not inside the page column */
  var text = modal.querySelector('[data-bibtext]'), copy = modal.querySelector('[data-bibcopy]'), opener = null;
  function close() {
    modal.hidden = true;
    document.documentElement.classList.remove('rs-noscroll');
    if (opener) opener.focus();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bibtex]');
    if (b) {
      var src = b.parentElement.querySelector('.rs-bib');
      if (!src) return;
      e.preventDefault();
      opener = b;
      text.textContent = src.textContent.trim();
      copy.textContent = 'Copy';
      modal.hidden = false;
      document.documentElement.classList.add('rs-noscroll');
      modal.querySelector('.rs-bibmodal__close').focus();
      return;
    }
    if (e.target.closest('[data-bibclose]')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) { e.stopImmediatePropagation(); close(); } });
  copy.addEventListener('click', function () {
    function done() { copy.textContent = 'Copied'; }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text.textContent).then(done, function () {}); return; }
    var r = document.createRange(); r.selectNodeContents(text);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    try { document.execCommand('copy'); done(); } catch (err) {}
  });
})();
