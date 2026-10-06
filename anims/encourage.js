/*
 * encourage: "you've got this" (SPEC §3, §4). Before a workout, first workout, "twenty minutes
 * counts" after a gap.
 *
 * The pose it lands on (POSES.encourage in motion.js): "ready, let's go". The coach leans in a touch
 * toward the viewer's right with warm happy eyes, and both mittens come forward to the chest as two
 * fists, tipped in toward each other: { x: ±22, y: -12, rotate: ±10 }, both at scale 1. No other
 * pose has that silhouette, so it never reads as happy without the smile.
 *
 * The beats:
 *   0–200 ms    anticipation. A small lean back with the chin up; both mittens cock back, a little
 *               down and out, turned out, and a touch smaller (further away).
 *   200–480     forward. The coach leans in toward the viewer and the features come a little closer
 *               (a small face scale); both fists come in and up to the chest, turning in, a touch
 *               bigger as they arrive (closer). A blink on the way in turns the eyes into warm
 *               happy arcs (swap at 295). The right fist, on the lean side, leads; the left trails
 *               by 30 ms.
 *   480–700     the nod. The head holds, then one firm nod: the body dips, the features dip a beat
 *               later with a small kind tilt, the eyes squeeze warmly, and both fists pump down with
 *               it, tipping in a little more, lagging the head.
 *   700–1000    settle. Everything eases into the encourage pose; the body, the lean and the fists'
 *               height land on gentle springs.
 * Starts on rest and ends exactly on encourage. The fists stay below the eyes and clear of the
 * mouth area the whole way.
 *
 * Overshoot (SPEC §3 as amended): the fists pass their pose once on arrival (x 1 unit, y 1 unit,
 * scale 1.03 vs 1) and the lean passes 2 degrees by 0.7; the pump and the nod are acting beats.
 *
 * Times in ms. Each key is [t, value, ease into this key]; every key that changes value names its
 * ease, and a key that repeats the value before it is a hold.
 */
BraviloMotion.ANIMS['encourage'] = {
  id: 'encourage',
  label: 'Encourage',
  where: 'before a workout, first workout, "twenty minutes counts" after a gap',
  feel: '"you\'ve got this": a lean in, both mittens forward as fists with a nod, warm eyes',
  durationMs: 1000,
  loop: false,
  endPose: 'encourage',
  tracks: [
    // Lean: back a touch (anticipation), then in toward the viewer in one move that carries on
    // through the nod, and a spring settle onto the pose's 2 degrees.
    { part: 'body', prop: 'rotate', keys: [[0, 0], [150, -1.2, 'standard'], [580, 2.7, 'standard'],
                                           [940, 2, 'spring']] },
    // Gather up a hair and hold it through the lean, then the nod: one squash from the held
    // stretch, from the planted base.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [150, 1.01, 'standard'], [420, 1.01],
                                           [570, 0.96, 'standard'], [900, 1, 'spring']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [150, 0.997, 'standard'], [420, 0.997],
                                           [570, 1.013, 'standard'], [900, 1, 'spring']] },
    // The head: turns away a little and lifts (anticipation), holds while it turns toward the
    // viewer, then one clean nod a beat after the body with a small kind tilt, and comes back up
    // to rest a touch low.
    { part: 'face', prop: 'x', keys: [[0, 0], [170, -1.5, 'standard'], [480, 2, 'standard']] },
    { part: 'face', prop: 'y', keys: [[0, 0], [170, -1.5, 'standard'], [430, -1.5],
                                      [600, 4.5, 'standard'], [960, 1, 'standard']] },
    { part: 'face', prop: 'rotate', keys: [[0, 0], [430, 0], [610, 2.5, 'standard'], [980, 0, 'standard']] },
    // Leaning in: the features come a little closer (they move inside the fixed cream window),
    // then settle back to their size.
    { part: 'face', prop: 'scale', keys: [[0, 1], [170, 0.99, 'standard'], [450, 1.04, 'standard'],
                                          [900, 1, 'standard']] },
    // Warm eyes: a blink on the way in hides the swap to happy; on the nod the arcs squeeze a
    // little (a warm squint) and open again.
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [230, 1], [295, 0.15, 'in'], [365, 1, 'out'],
                                           [560, 1], [620, 0.84, 'standard'], [800, 1, 'out']] },

    // The right fist (the lean side) leads: cocked back out, down, turned out and a touch smaller;
    // in and up to the chest turning in, a touch bigger as it arrives; a pump down with the nod,
    // tipping in a little more; a spring settle onto the pose.
    { part: 'handR', prop: 'x', keys: [[0, 0], [170, 2, 'standard'], [450, -23, 'standard'],
                                       [1000, -22, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [170, 4, 'standard'], [440, -13, 'standard'],
                                       [620, -8, 'standard'], [970, -12, 'spring']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [170, 6, 'standard'], [440, -11, 'standard'],
                                            [620, -13, 'standard'], [1000, -10, 'standard']] },
    { part: 'handR', prop: 'scale', keys: [[0, 1], [170, 0.97, 'standard'], [440, 1.03, 'standard'],
                                           [800, 1, 'standard']] },
    // The left fist mirrors it, 30 ms behind, so the pair never moves as one block.
    { part: 'handL', prop: 'x', keys: [[0, 0], [200, -2, 'standard'], [480, 23, 'standard'],
                                       [1000, 22, 'standard']] },
    { part: 'handL', prop: 'y', keys: [[0, 0], [200, 4, 'standard'], [470, -13, 'standard'],
                                       [650, -8, 'standard'], [1000, -12, 'spring']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [200, -6, 'standard'], [470, 11, 'standard'],
                                            [650, 13, 'standard'], [1000, 10, 'standard']] },
    { part: 'handL', prop: 'scale', keys: [[0, 1], [200, 0.97, 'standard'], [470, 1.03, 'standard'],
                                           [830, 1, 'standard']] }
  ],
  swaps: [
    [295, 'eyes', 'happy']
  ]
};
