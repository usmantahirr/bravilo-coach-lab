/*
 * thinking: focused, while the coach replies or a plan builds. The only loop (SPEC §3, §4).
 *
 * It holds the thinking pose (eyes up, one brow raised, the face turned up and right, the right
 * mitten at the chin) and builds one "thought" per cycle, so the first thing a short reply shows is
 * a thought being built, not one being lost:
 *   0          one dot (the start pose). The eyes rest on it.
 *   340        the second dot pops in from a small squeeze of the dot cluster; the eyes climb to it
 *              (a 60 ms saccade that lands with the dot).
 *   680        the third dot completes the thought: the cluster pulses again, the eyes climb once
 *              more, and the mitten taps the chin once (a small drop away, a crisp strike up, a
 *              soft settle). One tap per cycle, on the completing dot, so it reads as "got it",
 *              not as drumming.
 *   680–1140   the full thought holds. The head has followed the eyes up, slowly.
 *   1140–1280  the thought dissolves: the dots fade and rise a little.
 *   1200–1440  the eyes, brow and head drift back down a touch toward where the first dot will
 *              appear: a slow drift, not a dart. The eyes' small rightward drift leads the head's
 *              leftward one and cancels it, so on screen the gaze settles straight down and never
 *              glances away.
 *   1280–1400  unseen, the first dot is swapped in and fades in from its own small squeeze.
 * The body breathes once per cycle with a very small lean (about 0.7 px of sway at the hood top
 * at 112 px, less than the eyes move, so the body is the stillest layer): in, leaning a touch
 * toward the dots, as the thought completes; out, leaning a touch away, as it clears. The resting
 * mitten floats with the breath, a beat behind (follow-through). The breath's eases carry its
 * velocity across the loop seam.
 *
 * Start pose. The loop starts on one dot, so its start pose is POSES.thinking with fx 'dots1' (an
 * inline pose object, which the player and frames.html accept). play()'s settle from rest then
 * fades in exactly one dot and runs straight into the loop with no pop, under the player as it is
 * today. Reduced motion shows the full thinking pose (three dots) instead, held until stop()
 * (`reducedPose`). stop() returns to rest from any moment in about 220 ms.
 *
 * Every track is written relative to the thinking pose and its values are read from
 * BraviloMotion.POSES.thinking when this file loads (x, y and rotate add an offset; scale and
 * opacity multiply a factor), so the loop stays on the pose if the pose is tuned (for example the
 * mitten's place at the chin). Today's pose: face x 2, y -1; handR x -42, y -20, rotate -22. The
 * registered ANIMS.thinking is plain numbers either way. Every track ends on its first value.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
(function () {
  'use strict';

  var POSE = (BraviloMotion.POSES && BraviloMotion.POSES.thinking) || {};
  var IDENTITY = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 };
  var ADDITIVE = { x: true, y: true, rotate: true };

  // The pose's value of one channel, or identity when the pose leaves it out.
  function held(part, prop) {
    var p = POSE.parts && POSE.parts[part];
    return p && typeof p[prop] === 'number' ? p[prop] : IDENTITY[prop];
  }
  function round(v) { return Math.round(v * 1e5) / 1e5; }
  // A track whose keys are written relative to the pose: an offset for x, y and rotate, a factor
  // for scale, scaleX, scaleY and opacity.
  function track(part, prop, keys) {
    var h = held(part, prop), add = ADDITIVE[prop];
    return {
      part: part,
      prop: prop,
      keys: keys.map(function (k) {
        var v = round(add ? h + k[1] : h * k[1]);
        return k.length > 2 ? [k[0], v, k[2]] : [k[0], v];
      })
    };
  }

  // POSES.thinking, building: one dot.
  var START = {
    name: 'thinking, one dot',
    eyes: POSE.eyes, mouth: POSE.mouth, brows: POSE.brows, fx: 'dots1',
    parts: JSON.parse(JSON.stringify(POSE.parts || {}))
  };

  BraviloMotion.ANIMS['thinking'] = {
    id: 'thinking',
    label: 'Thinking',
    where: 'while the coach replies or a plan builds (the only loop)',
    feel: 'focused: eyes up, a hand near the chin, dots pulse in sequence',
    durationMs: 1500,
    loop: true,
    startPose: START,
    reducedPose: 'thinking',
    endPose: 'rest',
    tracks: [
      // The dots. The full thought holds, then fades out rising 3 units; unseen, it resets and the
      // first dot fades back in. The swaps below add the second and third dots.
      track('fx', 'opacity', [[0, 1], [1140, 1], [1280, 0, 'in'], [1320, 0], [1400, 1, 'out'], [1500, 1]]),
      track('fx', 'y', [[0, 0], [1140, 0], [1280, -3, 'standard'], [1320, 0, 'standard'], [1500, 0]]),
      // The pulse in sequence: before each new dot the cluster squeezes to 0.9 about its centre, the
      // dot appears at the bottom of the squeeze, and the cluster springs back (about 1% over). The
      // first dot's squeeze happens while the cluster is invisible, so it grows in as it fades in.
      track('fx', 'scale', [[0, 1], [260, 1], [340, 0.9, 'in'], [520, 1, 'spring'],
                            [600, 1], [680, 0.9, 'in'], [860, 1, 'spring'],
                            [1280, 1], [1320, 0.9, 'standard'], [1500, 1, 'spring']]),

      // The eyes do the acting: a quick saccade up to each new dot, landing with it; after the
      // thought clears, a slow 220 ms drift back down to the first dot.
      track('eyes', 'x', [[0, 0], [280, 0], [340, -0.25, 'out'], [620, -0.25], [680, -0.5, 'out'],
                          [1200, -0.5], [1420, 0, 'standard'], [1500, 0]]),
      track('eyes', 'y', [[0, 0], [280, 0], [340, -0.75, 'out'], [620, -0.75], [680, -1.5, 'out'],
                          [1200, -1.5], [1420, 0, 'standard'], [1500, 0]]),
      // The raised brow rides with the eyes, a touch less and a touch later.
      track('brows', 'y', [[0, 0], [300, 0], [370, -0.5, 'out'], [640, -0.5], [710, -1, 'out'],
                           [1220, -1], [1450, 0, 'standard'], [1500, 0]]),
      // The head follows the eyes, slower: up and right as the thought builds, back a beat after
      // the eyes once it clears (so on screen the gaze never drifts left).
      track('face', 'x', [[0, 0], [800, 0.5, 'standard'], [1220, 0.5], [1440, 0, 'standard'], [1500, 0]]),
      track('face', 'y', [[0, 0], [800, -1, 'standard'], [1220, -1], [1440, 0, 'standard'], [1500, 0]]),

      // The body breathes with the thought, the stillest layer: in (and leaning a touch toward the
      // dots) as it completes, out (and a touch away) as it clears, rising back through the loop
      // seam.
      track('body', 'scaleY', [[0, 1], [760, 1.004, 'out'], [1360, 0.997, 'standard'], [1500, 1, 'in']]),
      track('body', 'scaleX', [[0, 1], [760, 0.9985, 'out'], [1360, 1.001, 'standard'], [1500, 1, 'in']]),
      track('body', 'rotate', [[0, 0], [760, 0.4, 'out'], [1360, -0.2, 'standard'], [1500, 0, 'in']]),

      // One chin tap, on the completing dot: the mitten drops away a little, strikes up into the
      // chin as the dot appears, and settles back. Big enough to read at 32 px (about 1 px).
      track('handR', 'y', [[0, 0], [530, 0], [610, 5, 'standard'], [680, -3.5, 'in'], [830, 0, 'out'], [1500, 0]]),
      track('handR', 'rotate', [[0, 0], [530, 0], [610, 6, 'standard'], [680, -4, 'in'], [830, 0, 'out'], [1500, 0]]),
      // The resting mitten floats with the breath, a beat behind the body (follow-through).
      track('handL', 'y', [[0, 0], [820, -0.5, 'out'], [1420, 0.4, 'standard'], [1500, 0, 'in']])
    ],
    swaps: [
      [340, 'fx', 'dots2'],  // the second dot, with the eyes' first climb
      [680, 'fx', 'dots'],   // the third completes the thought, with the chin tap
      [1280, 'fx', 'dots1']  // unseen, at the bottom of the fade; the first dot holds across the seam
    ]
  };
})();
