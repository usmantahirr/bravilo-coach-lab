/*
 * welcomeBack: coming back after a break. "Relief and warmth": eyes widen, then go happy, both
 * hands open low and wide, palms out, "there you are", a small sigh of relief, and the mittens rise
 * to the cheeks (SPEC §4, ends on happy).
 *
 * Beats:
 *   1. Notice, "oh, hi" (0–430 ms). A blink opens into wide eyes (swap hidden at the blink's
 *      bottom) and the eyes grow a touch. The body catches a breath (a tiny squash), then rises;
 *      the head lifts a beat later and the mittens lift a little after the body. No brows: this is
 *      a soft "oh", not surprised's "whoa".
 *   2. Anticipation (430–550 ms). A second blink turns the eyes happy, and the small smile swaps in
 *      (invisible, at its smallest, while the eyes are shut). The body dips and the mittens gather
 *      inward, turned in toward each other, ready to open.
 *   3. "There you are" (550–890 ms). The body stretches up and both mittens sweep open low and wide,
 *      out to the hood's lower corners and a little below where they gathered, turning about 70
 *      degrees from facing in to palms out. This open-arms shape is welcomeBack's own: no other
 *      moment has the mittens low, wide and turned out. The left leads, the right trails by 30 ms.
 *      The smile fades in and springs up to full size. The open pose drifts a touch further (a
 *      moving hold) so it reads.
 *   4. Relief and settle (880–1200 ms). A small sigh: the body softens just under its height and
 *      the head drops a little, then both come back up to the happy pose, and the open arms rise
 *      into the happy cheeks, turning back from palms out to the happy angle.
 *
 * The mouth is the small smile throughout: the open smile belongs to proud alone, so the biggest
 * moment owns the biggest mouth.
 *
 * Times in ms. Each key is [t, value, ease into this key]; every key that changes value names its
 * ease, and a key that repeats the value before it is a hold.
 */
BraviloMotion.ANIMS['welcomeBack'] = {
  id: 'welcomeBack',
  label: 'Welcome back',
  where: 'coming back after a break',
  feel: 'relief and warmth: eyes widen then go happy, both hands open "there you are"',
  durationMs: 1200,
  loop: false,
  endPose: 'happy',
  tracks: [
    // Body: a tiny catch, rise (notice), dip (anticipation), stretch (open), a sigh just under
    // full height (relief), then up to happy's 1.01.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [70, 0.985, 'standard'], [240, 1.03, 'out'],
                                           [430, 1.025, 'standard'], [540, 0.97, 'standard'],
                                           [720, 1.04, 'out'], [880, 1.035, 'standard'],
                                           [1010, 0.995, 'standard'], [1180, 1.01, 'standard']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [70, 1.005, 'standard'], [240, 0.99, 'out'],
                                           [430, 0.992, 'standard'], [540, 1.01, 'standard'],
                                           [720, 0.987, 'out'], [880, 0.989, 'standard'],
                                           [1010, 1.006, 'standard'], [1180, 1, 'standard']] },
    // The head follows the body a beat later: lifts on the notice, dips, lifts, sinks a little
    // with the sigh, settles.
    { part: 'face', prop: 'y', keys: [[0, 0], [100, 0.8, 'standard'], [270, -3, 'out'],
                                      [450, -2.5, 'standard'], [570, 2, 'standard'], [750, -2, 'out'],
                                      [880, -1.8, 'standard'], [1020, 1, 'standard'], [1200, 0, 'standard']] },
    // A warm head tilt on "there you are", straightening as it settles.
    { part: 'face', prop: 'rotate', keys: [[0, 0], [560, 0], [800, -2.5, 'out'], [900, -2.5],
                                           [1200, 0, 'standard']] },

    // Eyes: blink into wide (swap at 60), grow a touch; blink into happy (swap at 495).
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [60, 0.15, 'in'], [130, 1, 'out'],
                                           [430, 1], [495, 0.15, 'in'], [565, 1, 'out']] },
    { part: 'eyes', prop: 'scale', keys: [[0, 1], [130, 1], [260, 1.08, 'out'], [430, 1.08],
                                          [495, 1, 'in']] },

    // Mouth: while it is still 'none' (nothing drawn) it goes transparent and shrinks; the small
    // smile swaps in at 500, invisible and at 0.35, then fades in and springs up to full size.
    // Nothing pops in a single frame.
    { part: 'mouth', prop: 'opacity', keys: [[0, 1], [480, 0, 'standard'], [500, 0], [580, 1, 'out']] },
    { part: 'mouth', prop: 'scale', keys: [[0, 1], [480, 1], [500, 0.35, 'standard'], [700, 1, 'spring']] },

    // Mittens: a small lift after the body (notice), gather inward and turn in (anticipation),
    // sweep open low and wide while turning palms out, drift a little further (a moving hold),
    // then rise to the cheeks at the happy angle. The right mitten mirrors the left, 30 ms behind.
    // Open, the mittens span about x 7.5-55 and 185-232.5, y 151-202: 7.5 units inside the
    // viewBox, the same margin surprised keeps.
    { part: 'handL', prop: 'x', keys: [[0, 0], [100, 0], [280, 2, 'out'], [440, 2],
                                       [550, 14, 'standard'], [750, -6, 'out'], [890, -6.5, 'standard'],
                                       [1170, -6, 'standard']] },
    { part: 'handL', prop: 'y', keys: [[0, 0], [90, 2, 'standard'], [280, -10, 'out'], [440, -9, 'standard'],
                                       [550, -12, 'standard'], [750, -8, 'out'], [890, -9, 'standard'],
                                       [1170, -20, 'standard']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [90, 3, 'standard'], [280, 8, 'out'],
                                            [440, 7, 'standard'], [550, 18, 'standard'], [750, -50, 'out'],
                                            [890, -51, 'standard'], [1170, -20, 'standard']] },
    { part: 'handR', prop: 'x', keys: [[0, 0], [130, 0], [310, -2, 'out'], [470, -2],
                                       [580, -14, 'standard'], [780, 6, 'out'], [920, 6.5, 'standard'],
                                       [1200, 6, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [120, 2, 'standard'], [310, -10, 'out'], [470, -9, 'standard'],
                                       [580, -12, 'standard'], [780, -8, 'out'], [920, -9, 'standard'],
                                       [1200, -20, 'standard']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [120, -3, 'standard'], [310, -8, 'out'],
                                            [470, -7, 'standard'], [580, -18, 'standard'], [780, 50, 'out'],
                                            [920, 51, 'standard'], [1200, 20, 'standard']] }
  ],
  swaps: [
    [60, 'eyes', 'wide'],
    [495, 'eyes', 'happy'],
    [500, 'mouth', 'smile']
  ]
};
