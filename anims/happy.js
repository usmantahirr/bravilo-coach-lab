/*
 * happy: "pleased with you" (finish screen). SPEC §3, §4. Starts on rest, ends exactly on happy.
 *
 * Anticipation: the body squashes from its planted base while the eyes blink into happy arcs and
 * the mittens press down and turn in a little (cocking for the jump). Takeoff: the body stretches
 * as the whole coach (root) leaves the ground, the small smile fades and grows in under cover of
 * the stretch, and both mittens fling up at different heights, the left one above the hood's
 * upper corner and the right one lower and further out, turned out ("yay"), a beat behind the
 * body. Apex: the features float up a touch, the shadow shrinks and fades. Landing: the body
 * squashes, the features drop past, the happy eyes squeeze for a moment, and the mittens drop to
 * the cheeks (follow-through) and settle into the happy pose while the body springs back to a
 * touch taller. Hands up only briefly: from about 300 to 500 ms.
 *
 * A quick, pleased hop rather than a float: about 360 ms off the ground for a 13-unit lift (in
 * line with surprised and greeting), which leaves a real hold on the end pose.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 *   0-170 anticipation · 170-380 takeoff and rise · 380 apex · 530 touch down · 590 squash ·
 *   810-870 settled on happy · held to 950.
 */
BraviloMotion.ANIMS['happy'] = {
  id: 'happy',
  label: 'Happy',
  where: 'finish screen',
  feel: 'pleased with you: a small hop with squash and stretch, happy eyes, a small smile, hands up briefly',
  durationMs: 950,
  loop: false,
  endPose: 'happy',
  tracks: [
    // The hop: everything but the shadow leaves the ground. Fast off the ground and slow at the
    // top ('out'), slow off the top and fast into the ground ('in').
    { part: 'root', prop: 'y', keys: [[0, 0], [170, 0], [380, -13, 'out'], [530, 0, 'in']] },

    // Squash and stretch from the planted base (scaleX pairs with 1 + (1 - scaleY) / 3):
    // anticipation squash, takeoff stretch, round at the apex, a slight stretch while falling that
    // turns straight into the landing squash (about round at touch down, 530 ms), then a gentle
    // spring up to happy's 1.01.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [170, 0.95, 'standard'], [260, 1.045, 'out'],
                                           [380, 1, 'standard'], [490, 1.02, 'standard'],
                                           [590, 0.955, 'standard'], [810, 1.01, 'spring']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [170, 1.017, 'standard'], [260, 0.985, 'out'],
                                           [380, 1, 'standard'], [490, 0.993, 'standard'],
                                           [590, 1.015, 'standard'], [810, 1, 'spring']] },

    // The ground shadow: a touch wider in the squashes, smaller and fainter at the apex.
    { part: 'shadow', prop: 'scale', keys: [[0, 1], [170, 1.03, 'standard'], [380, 0.85, 'out'],
                                            [530, 1, 'in'], [590, 1.03, 'out'], [810, 1, 'standard']] },
    { part: 'shadow', prop: 'opacity', keys: [[0, 1], [170, 1], [380, 0.6, 'out'], [530, 1, 'in']] },

    // The features lag the hood: they sink in the anticipation, trail on takeoff, float up past
    // the apex, drop past on landing and settle.
    { part: 'face', prop: 'y', keys: [[0, 0], [200, 3, 'standard'], [300, 1, 'standard'],
                                      [420, -2.5, 'out'], [610, 3, 'standard'], [840, 0, 'standard']] },

    // Eyes: a blink hides the swap into happy arcs (bottom and swap at 65 ms), then a short
    // joyful squeeze on the landing squash.
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [65, 0.15, 'in'], [135, 1, 'out'],
                                           [570, 1], [630, 0.82, 'standard'], [800, 1, 'out']] },

    // The small smile enters during the takeoff stretch. While the mouth is still empty it shrinks
    // to 0.35 and goes transparent; the swap to smile lands exactly on that minimum (240 ms), so
    // the smile appears at 0.35 and invisible, fades in over 100 ms and grows to full size on a
    // gentle spring (peak about 1.06). Nothing pops in a single frame.
    { part: 'mouth', prop: 'scale', keys: [[0, 1], [240, 0.35, 'standard'], [420, 1, 'spring']] },
    { part: 'mouth', prop: 'opacity', keys: [[0, 1], [220, 0, 'standard'], [240, 0], [340, 1, 'out']] },

    // Mittens: press down and turn in (cocking), fling up turned out ("yay") a beat after the body
    // leaves, at different heights (left y -100, right y -74 and further out), so at 32 px the pair
    // reads as a gesture, not as two matching blobs on the hood's sides (ears); then drop past the cheeks
    // after touch down with the wrists dragging (the turn lags, 4 degrees past the cheek angle,
    // the keyed follow-through limit of SPEC §3), then settle at the cheeks.
    // The right mitten trails the left by 30 ms so the pair doesn't move as one block.
    { part: 'handL', prop: 'x', keys: [[0, 0], [200, 1.5, 'standard'], [430, -14, 'out'], [840, -6, 'standard']] },
    { part: 'handL', prop: 'y', keys: [[0, 0], [200, 4, 'standard'], [430, -100, 'out'],
                                       [610, -15, 'standard'], [840, -20, 'out']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [200, 6, 'standard'], [430, -26, 'out'],
                                            [610, -16, 'standard'], [840, -20, 'out']] },
    { part: 'handR', prop: 'x', keys: [[0, 0], [230, -1.5, 'standard'], [460, 18, 'out'], [870, 6, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [230, 4, 'standard'], [460, -74, 'out'],
                                       [640, -15, 'standard'], [870, -20, 'out']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [230, -6, 'standard'], [460, 30, 'out'],
                                            [640, 16, 'standard'], [870, 20, 'out']] }
  ],
  swaps: [
    [65, 'eyes', 'happy'],
    [240, 'mouth', 'smile']
  ]
};
