/*
 * nod: "got it". The reference animation for the motion contract (SPEC §3, §4).
 *
 * The body dips (a squash from its planted base, a touch wider), the features follow a beat later
 * so the head reads as nodding, and the mittens bob after that (follow-through). At the bottom of
 * the dip the eyes blink into happy arcs, hold them for a moment, and blink back to rest. The body
 * comes back up on a gentle spring. Starts and ends exactly on rest.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
BraviloMotion.ANIMS['nod'] = {
  id: 'nod',
  label: 'Nod',
  where: 'something saved, plan updated, coach voice picked',
  feel: '"got it": a small dip of the body, a quick happy blink',
  durationMs: 500,
  loop: false,
  endPose: 'rest',
  tracks: [
    // The dip: squash from the planted base (the hood top drops about 8 units, the body widens
    // about 2), then back up on a gentle spring (it overshoots by under 1 unit).
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [150, 0.955, 'standard'], [430, 1, 'spring']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [150, 1.014, 'standard'], [430, 1, 'spring']] },
    // The nod: the features dip a little further and a beat later than the hood.
    { part: 'face', prop: 'y', keys: [[0, 0], [180, 4.5, 'standard'], [460, 0, 'standard']] },
    // Follow-through: the mittens bob after the body.
    { part: 'handL', prop: 'y', keys: [[0, 0], [200, 3.5, 'standard'], [480, 0, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [220, 3.5, 'standard'], [500, 0, 'standard']] },
    // The happy blink: close, swap to happy (hidden), open; hold; close, swap back to rest, open.
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [70, 0.15, 'in'], [140, 1, 'out'],
                                           [280, 1], [340, 0.15, 'in'], [410, 1, 'out']] }
  ],
  swaps: [
    [70, 'eyes', 'happy'],
    [340, 'eyes', 'rest']
  ]
};
