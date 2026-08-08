/* Before/After slider — replaces the .wrapper/.scroller block in script.js */
(function () {
  function init(ba) {
    var range = ba.querySelector('.ba-range');
    if (!range) return;
    var set = function () {
      ba.style.setProperty('--pos', range.value + '%');
    };
    range.addEventListener('input', set);
    ['pointerdown', 'touchstart'].forEach(function (e) {
      range.addEventListener(e, function () { ba.classList.add('is-dragging'); });
    });
    ['pointerup', 'pointercancel', 'touchend', 'blur'].forEach(function (e) {
      range.addEventListener(e, function () { ba.classList.remove('is-dragging'); });
    });
    set();
  }
  function boot() {
    document.querySelectorAll('.ba').forEach(init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.initBeforeAfter = boot;
})();
