/* @agentic-media/agent-ui — icon loader.

   Two ways to use icons:

   1. Inline SVG (zero JS, recommended for SSR):
        <svg class="am-icon"><use href="/agent-ui/icons/sprite.svg#dashboard"/></svg>
      …or paste the path data straight from icons/<name>.svg.

   2. Data-attribute (this script):
        <span class="am-icon" data-icon="dashboard"></span>
      The script swaps each <span data-icon> for its inline SVG on
      DOMContentLoaded. Honours [data-size="sm|md|lg|xl"].

   Set window.AM_ICON_BASE before this script loads to point at a
   different path. Default: '/agent-ui/icons/'. */

(function () {
  var BASE = (typeof window !== 'undefined' && window.AM_ICON_BASE) || '/agent-ui/icons/';
  var cache = {};

  function load(name) {
    if (cache[name]) return cache[name];
    cache[name] = fetch(BASE + name + '.svg')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .catch(function () { return ''; });
    return cache[name];
  }

  function inject(el) {
    var name = el.getAttribute('data-icon');
    if (!name) return;
    load(name).then(function (svg) {
      if (!svg) return;
      // Insert the raw SVG, preserve size class on the wrapper.
      el.innerHTML = svg;
      var inner = el.querySelector('svg');
      if (inner) {
        inner.classList.add('am-icon');
        var size = el.getAttribute('data-size');
        if (size) inner.classList.add('am-icon--' + size);
      }
    });
  }

  function scan(root) {
    (root || document).querySelectorAll('[data-icon]:not([data-icon-loaded])').forEach(function (el) {
      el.setAttribute('data-icon-loaded', '1');
      inject(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  } else {
    scan();
  }

  // expose so consumers can call after dynamic DOM updates
  window.AmIcon = { scan: scan, load: load };
})();
