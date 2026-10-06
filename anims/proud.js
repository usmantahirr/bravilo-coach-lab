/*
 * proud: the big moment (new best, milestones at workouts 3, 6 and 12, first time beating last
 * time). SPEC §3, §4. Starts on rest, ends exactly on the proud pose.
 *
 * Beats:
 *   0–200 ms    anticipation: the body squashes down and leans toward the punching side, the
 *               features dip a beat later, the eyes squeeze shut (the swap to happy hides at the
 *               bottom of the squeeze, 170 ms), the right mitten dips, and the left one sinks.
 *   200–430 ms  the main action: the body stretches up and leans back (counterbalance), the happy
 *               eyes pop open with the punch (open by 310), the open smile fades in at 250 and
 *               springs to full size, and the right mitten punches high: x leads (out to 25 by
 *               260 ms while y is still near the shoulder, so the mitten clears the face edge),
 *               then up past its mark and in.
 *   425–500 ms  the hit: the spark swaps in at opacity 0, fades in and pushes out around the raised
 *               mitten; from then on it rides with the mitten.
 *   500–860 ms  follow-through: everything settles straight onto the proud pose (no second swing).
 *               860–950 ms holds it.
 *
 * Overshoot (SPEC §3 as amended): only mouth.scale uses a spring key. A few channels pass their end
 * value once on an 'out' key and settle back on a 'standard' key, with no second swing, inside the
 * keyed follow-through limits (8% of the move's travel or 1 unit for x and y, 4 degrees, 0.03 of
 * scale): handR.y -127 vs -120 (6% of its 126-unit rise), handR.rotate 16 vs 12, handL.rotate -14
 * vs -10, handL.y -9 vs -8, face.y -2 vs -1, body.scaleY 1.05 vs 1.025, fx.scale 1.03 vs 1.
 * handR.x 25 then 20 is the punch's path (x leads so the mitten clears the face edge), not an
 * overshoot.
 *
 * Times in ms. Each key is [t, value, ease into this key]; every key after the first names its
 * ease, so a port never depends on a default.
 */
BraviloMotion.ANIMS['proud'] = {
  id: 'proud',
  label: 'Proud',
  where: 'new best, milestones at workouts 3, 6 and 12, first time beating last time',
  feel: 'the big moment: anticipation dip, stretch up, one hand punches high, open smile, a tiny spark',
  durationMs: 950,
  loop: false,
  endPose: 'proud',
  tracks: [
    // Anticipation squash, stretch up past the mark, settle onto the mark.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [200, 0.945, 'standard'], [420, 1.05, 'out'], [500, 1.048, 'standard'], [800, 1.025, 'standard']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [200, 1.018, 'standard'], [420, 0.982, 'out'], [500, 0.983, 'standard'], [800, 0.985, 'standard']] },
    // Lean toward the punching hand, then back away from the punch (counterbalance).
    { part: 'body', prop: 'rotate', keys: [[0, 0], [200, 1.5, 'standard'], [440, -2, 'out'], [850, -1, 'standard']] },
    // The features follow the body a beat later.
    { part: 'face', prop: 'y', keys: [[0, 0], [230, 4, 'standard'], [450, -2, 'out'], [520, -1.95, 'standard'], [830, -1, 'standard']] },
    { part: 'face', prop: 'x', keys: [[0, 0], [230, 0.8, 'standard'], [450, -1.6, 'out'], [850, -1, 'standard']] },
    // A short squeeze at the bottom of the dip (swap to happy there), then the happy eyes pop open
    // with the punch rather than after it.
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [110, 1, 'standard'], [170, 0.15, 'in'], [215, 0.15, 'standard'], [310, 1, 'out']] },
    // The open smile swaps in at opacity 0 (the mouth is 'none' before 250, so the fade-out is never
    // seen), fades in quickly and springs to full size about its pivot as the body shoots up.
    { part: 'mouth', prop: 'scale', keys: [[0, 1], [250, 0.35, 'standard'], [460, 1, 'spring']] },
    { part: 'mouth', prop: 'opacity', keys: [[0, 1], [250, 0, 'standard'], [310, 1, 'out']] },
    // The punch: dip, then x leads (out to 25 by 260 ms, comes in to 20) while y rises past the
    // mark, holds at the top and settles onto it.
    { part: 'handR', prop: 'x', keys: [[0, 0], [200, 0, 'standard'], [260, 25, 'out'], [460, 20, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [210, 6, 'standard'], [430, -127, 'out'], [500, -126, 'standard'], [800, -120, 'standard']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [210, -9, 'standard'], [430, 16, 'out'], [500, 15.5, 'standard'], [800, 12, 'standard']] },
    // The other mitten sinks with the dip, then lifts and turns out, lagging the body.
    { part: 'handL', prop: 'y', keys: [[0, 0], [230, 4, 'standard'], [480, -9, 'out'], [860, -8, 'standard']] },
    { part: 'handL', prop: 'x', keys: [[0, 0], [230, 1.5, 'standard'], [480, -3, 'out'], [860, -2, 'standard']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [230, 5, 'standard'], [480, -14, 'out'], [860, -10, 'standard']] },
    // The spark: fx is 'none' until 425 and the opacity is 0 there. It fades in as it pushes out
    // to 1.03 and settles to 1, with the rays clear of the raised mitten the whole way (coach.js
    // SPARK_C and SPARK_R). The scale is about the fx pivot, not the rays' fan centre (SPARK_C), so
    // x, y are solved at each key to keep the fan centre at its proud-pose offset from the mitten:
    // x = 5 + dx + (SPARK_C - pivot).x * (1 - scale), y = 4 + dy + (SPARK_C - pivot).y * (1 - scale),
    // where (5, 4) is the proud pose's fx offset and (dx, dy) is how far the mitten is from its pose
    // then ((1.58, -6.65) at 425, (1.31, -5.76) at 500). Peak right edge about x 239 of 240.
    { part: 'fx', prop: 'scale', keys: [[0, 1], [425, 0.96, 'standard'], [500, 1.03, 'out'], [800, 1, 'standard']] },
    { part: 'fx', prop: 'x', keys: [[0, 0], [425, 6.18, 'standard'], [500, 6.61, 'out'], [800, 5, 'standard']] },
    { part: 'fx', prop: 'y', keys: [[0, 0], [425, -2.39, 'standard'], [500, -1.96, 'out'], [800, 4, 'standard']] },
    { part: 'fx', prop: 'opacity', keys: [[0, 1], [425, 0, 'standard'], [490, 1, 'out']] },
    // The ground shadow widens with the squash and narrows with the stretch.
    { part: 'shadow', prop: 'scaleX', keys: [[0, 1], [200, 1.03, 'standard'], [420, 0.97, 'out'], [830, 1, 'standard']] }
  ],
  swaps: [
    [170, 'eyes', 'happy'],
    [250, 'mouth', 'open'],
    [425, 'fx', 'spark']
  ]
};
