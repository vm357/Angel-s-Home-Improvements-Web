/* Before/After slider — replaces the .wrapper/.scroller block in script.js */
(function () {
  function init(ba) {
    var range = ba.querySelector('.ba-range');
    if (!range) return;
    var set = function () {
      ba.style.setProperty('--pos', range.value + '%');
    };
    range.addEventListener('input', set);

    // Direct pointer tracking. A bare <input type=range> only follows a touch
    // that starts on its thumb, so on phones the drag appeared dead unless you
    // happened to grab the divider. Here any press inside the frame jumps to
    // that point and tracks the finger from there.
    var dragging = false, startX = 0, startY = 0, locked = false;

    var pctAt = function (clientX) {
      var r = ba.getBoundingClientRect();
      if (!r.width) return null;
      var p = ((clientX - r.left) / r.width) * 100;
      return Math.max(0, Math.min(100, p));
    };
    var apply = function (clientX) {
      var p = pctAt(clientX);
      if (p === null) return;
      range.value = p;
      set();
      range.dispatchEvent(new Event('input', { bubbles: true }));
    };

    ba.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      // Mouse and pen commit immediately; touch waits to see whether the
      // gesture is a horizontal drag or a vertical page scroll.
      locked = e.pointerType !== 'touch';
      startX = e.clientX;
      startY = e.clientY;
      ba.classList.add('is-dragging');
      if (locked) apply(e.clientX);
    });

    ba.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (!locked) {
        var dx = Math.abs(e.clientX - startX);
        var dy = Math.abs(e.clientY - startY);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { dragging = false; ba.classList.remove('is-dragging'); return; }
        locked = true;
        try { ba.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (e.cancelable) e.preventDefault();
      apply(e.clientX);
    });

    var end = function (e) {
      if (!dragging) return;
      // A tap that never became a drag still moves the divider to that point.
      if (!locked && e && typeof e.clientX === 'number') apply(e.clientX);
      dragging = false;
      locked = false;
      ba.classList.remove('is-dragging');
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
      ba.addEventListener(n, end);
    });
    range.addEventListener('blur', function () { ba.classList.remove('is-dragging'); });

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
