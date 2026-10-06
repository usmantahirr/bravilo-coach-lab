/*
 * surprised: an unexpected new best. A quick pop up, wide eyes, an "o" mouth, raised brows, then
 * settling to happy (SPEC §4).
 *
 * The acting, beat by beat:
 *   1. Flinch (0–80 ms): a quick anticipation squash, the features dip and the eyes squeeze shut.
 *      The mittens pull in a beat later. The shut eyes hide the swaps to wide and to the "o".
 *   2. Pop (80–360 ms): the whole coach springs up off the ground in a small hop (root.y, the same
 *      hop primitive as happy and greeting, so the mittens ride it) with a stretch, the eyes snap
 *      open wide and a touch bigger, the face lifts and grows a little, the brows shoot up as they
 *      fade in, the "o" mouth opens from a dot. Both mittens fly up to the cheeks, turned IN, palms
 *      toward the face ("whoa"), lagging the body (follow-through), the right one a beat after the
 *      left. The stretch relaxes on the way up, so the body is round as it falls.
 *   3. Land and take (360–585 ms): the coach touches down round, the body squashes hard right after
 *      contact (390) and is back to round by 480, so the held "whoa" reads lifted, not deflated.
 *      The face holds and the mittens hold at the cheeks, palms in.
 *   4. Recognition (540–940 ms): the brows lift a touch and fade fast, then one short blink turns
 *      the eyes happy while the "o" shrinks and fades and comes back as a smile (all swapped at the
 *      bottom of the blink, 585). The face dips a little with delight, the body rises to happy and
 *      the mittens turn from palms in to palms out (happy's ±20 degrees) and settle a little lower
 *      at the cheeks: the turn of the hands is the visible change from surprise to joy, and the
 *      take's palms-in hands are surprised's own shape (happy flings its mittens up and out).
 *      Ends exactly on the happy pose.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
BraviloMotion.ANIMS['surprised'] = {
  id: 'surprised',
  label: 'Surprised',
  where: 'an unexpected new best',
  feel: 'a quick pop up, wide eyes, an "o" mouth, raised brows, then settling to happy',
  durationMs: 940,
  loop: false,
  endPose: 'happy',
  tracks: [
    // The hop (the whole coach but the shadow): rise decelerating to the apex at 210, fall
    // accelerating to land at 360.
    { part: 'root', prop: 'y', keys: [[0, 0], [80, 0], [210, -11, 'out'], [360, 0, 'in']] },
    // Squash (flinch), stretch (pop), relaxing to round by contact (360), then one landing squash
    // that hits right after contact and recovers by 480. Happy's 1.01 comes on a gentle spring.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [80, 0.96, 'standard'], [170, 1.045, 'out'],
                                           [360, 1, 'standard'], [390, 0.972, 'out'],
                                           [480, 1, 'standard'], [860, 1.01, 'spring']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [80, 1.013, 'standard'], [170, 0.985, 'out'],
                                           [360, 1, 'standard'], [390, 1.009, 'out'],
                                           [480, 1, 'standard']] },
    // The ground shadow shrinks and fades at the apex, and spreads a touch on the landing.
    { part: 'shadow', prop: 'scale', keys: [[0, 1], [80, 1], [210, 0.85, 'out'], [360, 1, 'in'],
                                            [390, 1.03, 'out'], [520, 1, 'standard']] },
    { part: 'shadow', prop: 'opacity', keys: [[0, 1], [80, 1], [210, 0.6, 'out'], [360, 1, 'in']] },
    // The features: dip with the flinch, lift and grow with the pop, settle a little on landing
    // and hold, then a small dip with the happy blink and back to centre.
    { part: 'face', prop: 'y', keys: [[0, 0], [80, 2.5, 'standard'], [200, -3.5, 'out'],
                                      [400, -1.5, 'standard'], [520, -1.5],
                                      [640, 1, 'standard'], [820, 0, 'out']] },
    { part: 'face', prop: 'scale', keys: [[0, 1], [80, 1], [200, 1.06, 'out'], [450, 1.04, 'standard'],
                                          [640, 1, 'standard']] },
    // Eyes: the flinch blink hides the swap to wide (70); they open a touch bigger. The
    // recognition blink closes quickly (540–585) and hides the swap to happy at its bottom (585),
    // by when the eyes are back to size.
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [70, 0.15, 'in'], [150, 1, 'out'],
                                           [540, 1], [585, 0.15, 'in'], [655, 1, 'out']] },
    { part: 'eyes', prop: 'scale', keys: [[0, 1], [80, 1], [190, 1.1, 'out'], [450, 1.06, 'standard'],
                                          [585, 1, 'standard']] },
    // Mouth: the "o" appears as a dot at the bottom of the flinch blink (70) and opens a little
    // past its size (the gasp). With the happy blink it shrinks and fades out, swaps to the smile
    // while invisible (585), then fades in and opens again.
    { part: 'mouth', prop: 'scale', keys: [[0, 1], [70, 0.3, 'standard'], [240, 1.15, 'out'],
                                           [540, 1.05, 'standard'], [585, 0.35, 'in'],
                                           [720, 1, 'out']] },
    { part: 'mouth', prop: 'opacity', keys: [[0, 1], [560, 1], [585, 0, 'in'], [640, 1, 'out']] },
    // Brows: once the eyes are open, they fade in while they shoot up. Before the happy blink they
    // fade out fast and lift a touch as they go, so they never sit low over closing eyes.
    // (The keys after the swap to none are invisible: they only bring the channels home.)
    { part: 'brows', prop: 'opacity', keys: [[0, 1], [60, 0, 'standard'], [110, 0], [210, 1, 'out'],
                                             [520, 1], [555, 0, 'out'], [590, 0],
                                             [660, 1, 'standard']] },
    { part: 'brows', prop: 'y', keys: [[0, 0], [80, 6, 'standard'], [110, 6], [230, -2, 'out'],
                                       [440, 0, 'standard'], [520, 0], [555, -1, 'out'], [590, -1],
                                       [660, 0, 'standard']] },
    // Mittens (they ride the hop with the root): pull in with the flinch, fly up to the cheeks
    // after the body (a beat apart), turned in, palms toward the face, pass their height by 2 units
    // and hold through the take; then, with the happy blink, turn out to happy's angle and settle
    // a little lower at the cheeks. At the take they sit beside the wide eyes and the "o", below
    // the eye line and clear of both (about x 45-93 and 147-195, y 115-165).
    { part: 'handL', prop: 'y', keys: [[0, 0], [100, 3, 'standard'], [260, -42, 'out'],
                                       [420, -40, 'standard'], [560, -40],
                                       [880, -20, 'standard']] },
    { part: 'handL', prop: 'x', keys: [[0, 0], [100, 1, 'standard'], [260, 4, 'out'],
                                       [560, 4], [880, -6, 'standard']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [100, 4, 'standard'], [270, 16, 'out'],
                                            [560, 16], [880, -20, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [120, 3, 'standard'], [280, -42, 'out'],
                                       [440, -40, 'standard'], [590, -40],
                                       [910, -20, 'standard']] },
    { part: 'handR', prop: 'x', keys: [[0, 0], [120, -1, 'standard'], [280, -4, 'out'],
                                       [590, -4], [910, 6, 'standard']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [120, -4, 'standard'], [290, -16, 'out'],
                                            [590, -16], [910, 20, 'standard']] }
  ],
  swaps: [
    [70, 'eyes', 'wide'],
    [70, 'mouth', 'o'],
    [80, 'brows', 'raised'],
    [585, 'eyes', 'happy'],
    [585, 'mouth', 'smile'],
    [585, 'brows', 'none']
  ]
};
