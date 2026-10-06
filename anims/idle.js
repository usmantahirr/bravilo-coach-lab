/*
 * idle: the small beat the coach does on Today between replays (D163). About every 10 s while
 * Today is on screen, the coach shows it is there without repeating its moment.
 *
 * One spec per still pose, registered as `idle_<pose>`: it starts and ends on that pose, so it
 * plays on top of whatever moment Today last showed (encourage, sleepy, welcome back's happy,
 * concerned, or rest) with no settle.
 *   - Open eyes (rest pill, wide, a look direction): a soft blink. The eyes close to a sliver and
 *     open again, slightly slower than they close.
 *   - Happy arcs or closed eyes (happy, proud, encourage, sleepy): a blink would read oddly, so it
 *     is one small breath instead. The body rises a touch from its base, the features lift a hair
 *     after it, and both settle.
 * Both are 300 ms or less, with no swaps, no mittens and no change of expression.
 *
 * Built like press.js: the keys are written relative to the pose (scale-like values multiply,
 * x, y and rotate add), so each spec's first and last keys equal the pose exactly (SPEC §3).
 * thinking has no idle beat; it loops already.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
(function () {
  var M = BraviloMotion;
  var FACTOR = { scale: true, scaleX: true, scaleY: true, opacity: true };

  var BLINK = [
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [90, 0.15, 'in'], [110, 0.15, 'standard'], [240, 1, 'out']] }
  ];
  var BREATH = [
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [140, 1.012, 'standard'], [300, 1, 'standard']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [140, 0.996, 'standard'], [300, 1, 'standard']] },
    { part: 'face', prop: 'y', keys: [[0, 0], [170, -0.8, 'standard'], [300, 0, 'standard']] }
  ];

  function onPose(pose, tr) {
    var base = ((pose.parts || {})[tr.part] || {})[tr.prop];
    return {
      part: tr.part,
      prop: tr.prop,
      keys: tr.keys.map(function (k) {
        var v = base == null ? k[1] : FACTOR[tr.prop] ? base * k[1] : base + k[1];
        return k.length > 2 ? [k[0], v, k[2]] : [k[0], v];
      })
    };
  }

  Object.keys(M.POSES).forEach(function (name) {
    if (name === 'thinking') return;
    var pose = M.POSES[name];
    var breath = pose.eyes === 'happy' || pose.eyes === 'closed';
    var tracks = breath ? BREATH : BLINK;
    M.ANIMS['idle_' + name] = {
      id: 'idle_' + name,
      label: 'Idle beat (' + name + ')',
      where: 'Today, between replays of its moment: about every 10 s while Today is on screen (D163)',
      feel: breath ? 'one small breath, the features lifting a hair' : 'a soft blink',
      durationMs: breath ? 300 : 240,
      loop: false,
      startPose: name,
      endPose: name,
      tracks: tracks.map(function (tr) { return onPose(pose, tr); }),
      swaps: []
    };
  });
})();
