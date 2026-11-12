/* Open links to other websites (arXiv, Zenodo, Google Scholar, ...) and PDFs such as the CV
   in a new tab, so this site stays open in the original one. */
(function () {
  function mark(root) {
    var links = (root || document).querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i], href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) continue;
      var external = a.hostname && a.hostname !== window.location.hostname;
      var pdf = /\.pdf($|[?#])/i.test(a.pathname || href);
      if (external || pdf) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mark(); });
  else mark();
})();
