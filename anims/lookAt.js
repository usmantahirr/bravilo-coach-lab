/*
 * lookAt: the eyes guide you to a button (onboarding, plan reveal). SPEC §3, §4.
 *
 * Three one-shots that glance toward a direction and hold it: lookAtLeft, lookAtRight and
 * lookAtDown, ending on lookLeft, lookRight and lookDown. Directions are the viewer's.
 *
 * The eyes lead: a blink on the turn (the classic head-turn blink) hides the eye swap. The sliver
 * holds shut for a moment around the swap, so at 60 fps at least one frame shows the closed eyes in
 * the new spot and the eyes only open once they already look the new way. A beat later the
 * features turn after them (face x, with a small dip on the arc), then the whole body leans and
 * lands on a gentle spring. The mittens do the acting: the one on the look side lifts, drifts out
 * and tips outward ("over there"), the other sinks with the shift of weight, and both settle into
 * the pose. Looking down is the same idea as a nod that stays down: everything lifts a hair, the
 * head dips (5 units, with the eyes dropping 11 inside it), the body leans in toward the button
 * below and settles back a touch shorter, and the mittens follow the head down a beat after it
 * lands and tip in toward the button (6 degrees each), so the whole coach points down.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
(function () {
  'use strict';

  // The look blink, shared by all three. Shut at 65 ms, held shut to 88 ms (the swap is at 70 ms,
  // so the closed sliver sits in the new spot for 18 ms, more than one 60 fps frame), open by 150.
  var SWAP_MS = 70;
  function blink() {
    return [[0, 1], [65, 0.15, 'in'], [88, 0.15, 'standard'], [150, 1, 'out']];
  }

  // A sideways glance. s = -1 looks left, +1 looks right; `lead` is the mitten on the look side.
  function glance(id, label, s, eyes, endPose) {
    var lead = s < 0 ? 'handL' : 'handR', trail = s < 0 ? 'handR' : 'handL';
    return {
      id: id,
      label: label,
      where: 'onboarding and plan reveal: the eyes guide to a button',
      feel: 'the eyes (and a slight lean of the body) glance toward a direction and hold',
      durationMs: 640,
      loop: false,
      endPose: endPose,
      tracks: [
        // The eyes lead: blink on the turn; the swap hides in the closed hold.
        { part: 'eyes', prop: 'scaleY', keys: blink() },
        // The head turn: a hair the other way first, then the features follow the eyes and land
        // on a gentle spring (about 0.4 past, then home). A small dip on the arc of the turn.
        { part: 'face', prop: 'x', keys: [[0, 0], [70, -0.8 * s, 'standard'], [360, 4 * s, 'spring']] },
        { part: 'face', prop: 'y', keys: [[0, 0], [180, 1.4, 'standard'], [400, 0, 'standard']] },
        // The lean: a touch of counter-lean, then the body follows the head (about 0.2 degrees
        // past on the spring).
        { part: 'body', prop: 'rotate', keys: [[0, 0], [90, -0.6 * s, 'standard'], [440, 2 * s, 'spring']] },
        // The mitten on the look side lifts, drifts out and tips outward toward the button, then
        // settles. The drift makes the "over there" read at onboarding sizes, not only at 180 px.
        { part: lead, prop: 'x', keys: [[0, 0], [320, 1.5 * s, 'standard'], [580, 0, 'out']] },
        { part: lead, prop: 'y', keys: [[0, 0], [110, 0.6, 'standard'], [320, -5, 'standard'], [580, -1, 'out']] },
        { part: lead, prop: 'rotate', keys: [[0, 0], [330, 7 * s, 'standard'], [600, 0, 'standard']] },
        // The other mitten sinks with the weight shift, a beat later, and settles.
        { part: trail, prop: 'y', keys: [[0, 0], [150, -0.6, 'standard'], [400, 2, 'standard'], [620, 1, 'out']] }
      ],
      swaps: [
        [SWAP_MS, 'eyes', eyes]
      ]
    };
  }

  BraviloMotion.ANIMS['lookAtLeft'] = glance('lookAtLeft', 'Look left', -1, 'left', 'lookLeft');
  BraviloMotion.ANIMS['lookAtRight'] = glance('lookAtRight', 'Look right', 1, 'right', 'lookRight');

  BraviloMotion.ANIMS['lookAtDown'] = {
    id: 'lookAtDown',
    label: 'Look down',
    where: 'onboarding and plan reveal: the eyes guide to a button below',
    feel: 'the eyes (and a slight lean of the body) glance down and hold',
    durationMs: 600,
    loop: false,
    endPose: 'lookDown',
    tracks: [
      // The eyes lead: blink, open already looking down.
      { part: 'eyes', prop: 'scaleY', keys: blink() },
      // A small lift, then the head dips after the eyes and lands on a gentle spring (its peak,
      // about 5.6, comes at about 235 ms).
      { part: 'face', prop: 'y', keys: [[0, 0], [70, -0.8, 'standard'], [360, 5, 'spring']] },
      // The lean: the body rises with the lift, leans in toward the button below, then settles
      // back while it ends a touch shorter (scaleY holds the end pose).
      { part: 'body', prop: 'y', keys: [[0, 0], [80, -0.6, 'standard'], [300, 1.2, 'standard'], [560, 0, 'out']] },
      { part: 'body', prop: 'scaleY', keys: [[0, 1], [80, 1.006, 'standard'], [400, 0.99, 'spring']] },
      // Follow-through: the mittens rise with the lift, then bob down after the head has landed
      // (left at 300 ms, right at 330 ms), and tip in toward the button below, passing the pose's
      // 6 degrees by 0.4 and settling on it.
      { part: 'handL', prop: 'y', keys: [[0, 0], [90, -0.5, 'standard'], [300, 2.5, 'standard'], [560, 0, 'standard']] },
      { part: 'handR', prop: 'y', keys: [[0, 0], [110, -0.5, 'standard'], [330, 2.5, 'standard'], [590, 0, 'standard']] },
      { part: 'handL', prop: 'rotate', keys: [[0, 0], [320, 6.4, 'standard'], [580, 6, 'standard']] },
      { part: 'handR', prop: 'rotate', keys: [[0, 0], [350, -6.4, 'standard'], [600, -6, 'standard']] }
    ],
    swaps: [
      [SWAP_MS, 'eyes', 'down']
    ]
  };
})();
