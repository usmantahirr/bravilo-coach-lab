/*
 * chatOpen: the chat is open (the coach button's open state). SPEC §4: one hand raised and held,
 * a friendly smile. Starts on rest, ends on chatOpen (right mitten raised beside the head, smile).
 *
 * How it relates to press (one tap on the dock button, see anims/press.js): press is the only
 * touch reaction. Its press-in (0-90 ms) plays on touch-down and holds while the finger is down;
 * its press-out (90-420 ms) plays on release, with the eyes open the whole time (no squint, no
 * blink). On an opening tap, chatOpen starts at press t = 330 ms with
 * play(coach, 'chatOpen', { settle: false }): at that moment press's root and shadow are exactly
 * at rest and its leftovers are under 0.06 pt at the 56 pt dock size, so nothing visibly snaps. So
 * chatOpen has no tap reaction of its own: no blink, no squash. Its only anticipation is the
 * mitten's wind-up.
 *
 * The beats:
 *   0–70 ms    wind-up. The right mitten dips and cocks inward.
 *   70–360     the raise. The mitten swings out first (x leads, eased 'out', there by 270 ms) and
 *              then up (y, 'standard', there by 360 ms), so it travels an arc around the hood
 *              instead of a straight line. It turns its palm out as it rises (rotate −8 → 4° past
 *              the held turn). The body stretches and leans toward it, the face follows a beat later
 *              with a small friendly head tilt, and the smile grows in (fading and scaling up from
 *              its pivot; the swap at 150 ms happens while the mouth is invisible).
 *   ~330–360   the "hi" accent: the mitten arrives with a small pop (scale 1.06), the head tilt
 *              peaks, and the eyes narrow a little as if the cheeks push up with the smile.
 *   360–600    settle and hold. The mitten's turn springs back to the held turn and its pop to 1,
 *              the body springs back upright, the head tilt and the cheek push ease out. Ends exactly
 *              on chatOpen.
 *
 * The held mitten values are read from BraviloMotion.POSES.chatOpen.parts.handR (today
 * { x: 17, y: -80, rotate: 14 }), so the last keys always equal the end pose (SPEC §3) when the
 * pose is moved. The registered ANIMS.chatOpen is plain numbers either way.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
(function () {
  var HELD = BraviloMotion.POSES.chatOpen.parts.handR;

  BraviloMotion.ANIMS['chatOpen'] = {
    id: 'chatOpen',
    label: 'Chat open',
    where: 'the chat reaches its open state (the coach button\'s open state); press plays on ' +
           'touch-down, chatOpen after it',
    feel: 'one hand raised and held, a friendly smile',
    durationMs: 600,
    loop: false,
    endPose: 'chatOpen',
    tracks: [
      // Body: a stretch as the hand goes up, a gentle spring home.
      { part: 'body', prop: 'scaleY', keys: [[0, 1], [290, 1.015, 'standard'], [540, 1, 'spring']] },
      { part: 'body', prop: 'scaleX', keys: [[0, 1], [290, 0.995, 'standard'], [540, 1, 'spring']] },
      // A lean toward the raised mitten, then back upright.
      { part: 'body', prop: 'rotate', keys: [[0, 0], [310, 1.5, 'standard'], [580, 0, 'standard']] },
      // The face lags the body's stretch and tilts toward the hand.
      { part: 'face', prop: 'y', keys: [[0, 0], [120, 0, 'standard'], [330, -1.5, 'standard'],
                                        [580, 0, 'standard']] },
      { part: 'face', prop: 'rotate', keys: [[0, 0], [120, 0, 'standard'], [340, 2, 'standard'],
                                             [600, 0, 'standard']] },
      // The right mitten: wind-up, then out and up along an arc, palm turning out, a small pop on
      // arrival, settling to the held pose. The turn's peak is only 4° past the held turn (the
      // keyed follow-through limit, SPEC §3); the spring does the rest of the settle.
      { part: 'handR', prop: 'x', keys: [[0, 0], [70, -2, 'standard'], [270, HELD.x, 'out']] },
      { part: 'handR', prop: 'y', keys: [[0, 0], [70, 4, 'standard'], [360, HELD.y, 'standard']] },
      { part: 'handR', prop: 'rotate', keys: [[0, 0], [70, -8, 'standard'],
                                              [330, HELD.rotate + 4, 'standard'],
                                              [540, HELD.rotate, 'spring']] },
      { part: 'handR', prop: 'scale', keys: [[0, 1], [200, 1, 'standard'], [330, 1.06, 'out'],
                                             [540, 1, 'spring']] },
      // A smiling squint at the "hi" accent: the eyes narrow a little and lift a touch, so it reads
      // as the cheeks pushing up, not the lids dropping.
      { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [270, 1, 'standard'], [350, 0.88, 'standard'],
                                             [560, 1, 'standard']] },
      { part: 'eyes', prop: 'y', keys: [[0, 0], [270, 0, 'standard'], [350, -1, 'standard'],
                                        [560, 0, 'standard']] },
      // The smile grows in. Its opacity drops while the mouth is still 'none' (nothing drawn), the
      // swap happens at 150 ms, then it fades in and scales up from its pivot on a gentle spring.
      { part: 'mouth', prop: 'opacity', keys: [[0, 1], [150, 0, 'standard'], [330, 1, 'out']] },
      { part: 'mouth', prop: 'scale', keys: [[0, 1], [150, 0.6, 'standard'], [380, 1, 'spring']] }
    ],
    swaps: [
      [150, 'mouth', 'smile']
    ]
  };
})();
