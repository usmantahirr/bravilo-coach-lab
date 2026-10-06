/*
 * concerned: "Something feels off", the pain follow-up (SPEC §4). Attentive and calm, never sad.
 *
 * Notice, feel, then offer, as a cascade (overlapping action):
 *   1. Notice (0-430): a soft blink starts at 70 ms, so the coach answers the tap at once. The
 *      kind worried brows are swapped in under the blink (140), then fade in while rising into
 *      place: the concern registers. Underneath, a tiny counter-lean (the anticipation) and an
 *      attentive breath in (the hood straightens a touch).
 *   2. Feel (140-900): the body leans in a few degrees toward the lifted hand, and the head tilts
 *      after it (the features lag the hood). The face lifts a touch as it notices, then settles
 *      straight back down onto rest: one way, it never passes rest (no bob, no bounce).
 *   3. Offer (300-1100): the left mitten sinks a little, lifts gently up and slightly out to beside
 *      the face, and its wrist turns palm out last (drag, no overshoot). The tiny soft mouth fades
 *      in while the hand rises. The right mitten settles with the shift of weight.
 * Every arrival decelerates (standard and out eases only): slow, no bounce, no spring. Starts on
 * rest and ends exactly on the concerned pose.
 *
 * The last key of every track reads its value from POSES.concerned (motion.js) when this file
 * loads, so the animation always lands exactly on the pose, even when the pose is tuned (for
 * example the lifted mitten's place, or a softening eye scale). Today's pose: body rotate -2.5,
 * face x -1.5 and rotate -3, eyes scale 1.04 (soft eyes), handL x -10, y -28, rotate -6. Because
 * the pose gives the eyes a `scale`, an eyes scale track is added that eases into it after the blink.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
(function () {
  'use strict';

  var POSE = (BraviloMotion.POSES && BraviloMotion.POSES.concerned) || {};
  var IDENTITY = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 };
  // The end value of one channel: the pose's value, or identity when the pose leaves it out.
  function end(part, prop) {
    var p = POSE.parts && POSE.parts[part];
    return p && typeof p[prop] === 'number' ? p[prop] : IDENTITY[prop];
  }

  var anim = {
    id: 'concerned',
    label: 'Concerned',
    where: '"Something feels off", pain follow-up',
    feel: 'attentive and calm, never sad: a slight head tilt, worried-kind brows, soft eyes, a hand lifted gently, slow easing, no bounce',
    durationMs: 1100,
    loop: false,
    endPose: 'concerned',
    tracks: [
      // The lean: a small counter-lean first (anticipation), then a slow tilt toward the lifted hand.
      { part: 'body', prop: 'rotate', keys: [[0, 0], [140, 0.5, 'standard'], [700, end('body', 'rotate'), 'standard']] },
      // Notice: the hood straightens a touch (an attentive breath in), then eases back as it leans.
      { part: 'body', prop: 'scaleY', keys: [[0, 1], [180, 1.008, 'standard'], [640, end('body', 'scaleY'), 'standard']] },
      // The head tilt follows the hood a beat later. The features perk up as they notice, then
      // settle back down onto rest in one move (never past it).
      { part: 'face', prop: 'rotate', keys: [[0, 0], [200, 0.4, 'standard'], [800, end('face', 'rotate'), 'standard']] },
      { part: 'face', prop: 'x', keys: [[0, 0], [200, 0.3, 'standard'], [780, end('face', 'x'), 'standard']] },
      { part: 'face', prop: 'y', keys: [[0, 0], [180, -1, 'standard'], [900, end('face', 'y'), 'standard']] },
      // A soft blink, the first thing you see: it starts at 70 ms and bottoms out at 140, where the
      // brows swap sits. No eye swap: the eyes stay rest.
      { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [70, 1, 'standard'], [140, 0.15, 'in'], [280, end('eyes', 'scaleY'), 'out']] },
      // The brows: faded out while still `none` (unseen), swapped to worried at 140, then fade in
      // while rising into place (the inner ends lift as the concern registers).
      { part: 'brows', prop: 'opacity', keys: [[0, 1], [140, 0, 'in'], [430, end('brows', 'opacity'), 'standard']] },
      { part: 'brows', prop: 'y', keys: [[0, 0], [140, 3.5, 'in'], [570, end('brows', 'y'), 'out']] },
      // The tiny soft mouth: hidden, swapped at 560, then fades in while widening a touch.
      { part: 'mouth', prop: 'opacity', keys: [[0, 1], [560, 0, 'in'], [900, end('mouth', 'opacity'), 'standard']] },
      { part: 'mouth', prop: 'scaleX', keys: [[0, 1], [560, 0.6, 'in'], [920, end('mouth', 'scaleX'), 'out']] },
      // The left mitten: a small sink and turn in (anticipation), a gentle lift up and slightly out
      // (x leads y, so it travels on a soft arc), and the wrist turning palm out last (drag).
      { part: 'handL', prop: 'y', keys: [[0, 0], [300, 2.5, 'standard'], [980, end('handL', 'y'), 'standard']] },
      { part: 'handL', prop: 'x', keys: [[0, 0], [300, 1, 'standard'], [900, end('handL', 'x'), 'standard']] },
      { part: 'handL', prop: 'rotate', keys: [[0, 0], [320, 3, 'standard'], [1100, end('handL', 'rotate'), 'standard']] },
      // The right mitten settles with the shift of weight and comes back to rest.
      { part: 'handR', prop: 'y', keys: [[0, 0], [320, 1.5, 'standard'], [900, end('handR', 'y'), 'standard']] }
    ],
    swaps: [
      [140, 'brows', 'worried'],
      [560, 'mouth', 'soft']
    ]
  };

  // Soft eyes, when the pose asks for them: after the blink has reopened, the eyes grow a touch
  // (never narrower, which would read as sleepy or skeptical).
  var eyesScale = end('eyes', 'scale');
  if (eyesScale !== 1) {
    anim.tracks.push({ part: 'eyes', prop: 'scale', keys: [[0, 1], [350, 1, 'standard'], [800, eyesScale, 'standard']] });
  }

  BraviloMotion.ANIMS['concerned'] = anim;
})();
