/*
 * Timing pass (D165): Pocket's one-shot moments run about 1.3x longer than they were designed.
 * Every key time, swap time and duration is multiplied evenly, so each moment keeps its shape and
 * only gets calmer. This file loads after every other anims/*.js file (the name sorts last), so
 * the registered ANIMS (and anything exported from them) already carry the slower times.
 *
 * Not slowed: the tab-bar press, pressOpen and chatOpen (the button's response stays quick), the
 * thinking loop and the idle beats.
 */
(function () {
  var SCALE = 1.3;
  var KEEP = { press: true, pressOpen: true, chatOpen: true, thinking: true };
  var A = BraviloMotion.ANIMS;
  BraviloMotion.TIMING = { scale: SCALE, unchanged: Object.keys(KEEP).concat(['idle_*']) };
  Object.keys(A).forEach(function (id) {
    var a = A[id];
    if (KEEP[id] || a.loop || id.indexOf('idle_') === 0) return;
    function t(ms) { return Math.round(ms * SCALE); }
    a.durationMs = t(a.durationMs);
    a.tracks.forEach(function (tr) { tr.keys = tr.keys.map(function (k) { var n = k.slice(); n[0] = t(k[0]); return n; }); });
    a.swaps = (a.swaps || []).map(function (s) { var n = s.slice(); n[0] = t(s[0]); return n; });
  });
})();
