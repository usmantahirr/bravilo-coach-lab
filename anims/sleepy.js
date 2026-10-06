/*
 * sleepy: "content, rest is good" (SPEC §4, the rest-day card).
 *
 * One slow, contented breath carries the whole thing. The inhale is the anticipation: the body
 * rises a touch (stretch), the features lift and the mittens float up with it while the eyes stay
 * open. The long exhale is the main action: the body sinks wider than rest, the features drop a
 * beat later, and the eyelids get heavy (a soft, lowered pill, never a flat slit, with a short
 * pause) and then close in one flat blink; the closed curves open out of that blink, so the swap
 * never pops and the line's change of width stays hidden. The mittens follow through last,
 * settling lower and turning in. As the eyes close, the small z's appear beside the head, clear of
 * the hood, and drift up into place while they fade in. Starts on rest, ends exactly on sleepy.
 *
 * Times in ms. Each key is [t, value, ease into this key]. Every key that changes value names its
 * ease; only holds (same value as the key before) leave it out.
 */
BraviloMotion.ANIMS['sleepy'] = {
  id: 'sleepy',
  label: 'Sleepy',
  where: 'rest-day card',
  feel: 'content, rest is good: eyes slowly close, a gentle sink, one slow breath, small z\'s drift up and fade in',
  durationMs: 1250,
  loop: false,
  endPose: 'sleepy',
  tracks: [
    // The breath: in (a small stretch from the planted base), then a long slow out that sinks the
    // body below rest and a little wider.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [360, 1.02, 'standard'], [1120, 0.975, 'standard']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [360, 0.993, 'standard'], [1120, 1.012, 'standard']] },
    // The features ride the breath a beat behind the hood: up a touch, then down to the sleepy drop.
    { part: 'face', prop: 'y', keys: [[0, 0], [400, -1.6, 'standard'], [1180, 2, 'standard']] },
    // Follow-through: the mittens float up with the inhale and settle last, lower and turned in.
    { part: 'handL', prop: 'y', keys: [[0, 0], [400, -4, 'standard'], [1200, 3, 'standard']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [400, -3, 'standard'], [1200, 8, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [430, -4, 'standard'], [1240, 3, 'standard']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [430, 3, 'standard'], [1240, -8, 'standard']] },
    // The eyes slowly close: open through the inhale, then heavy lids, a soft pill at about 0.6 of
    // its height (never a slit, which would read as deadpan), a short settle, then one flat blink
    // shut (0.1, so the swap's change of line width is barely a pixel tall). The closed curves open
    // out of the blink (swap at the bottom key).
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [340, 1], [640, 0.62, 'standard'], [700, 0.6, 'standard'],
                                           [860, 0.1, 'in'], [1040, 1, 'out']] },
    // The lids come down from the top: as the pill flattens it also slides down, keeping its lower
    // edge at about 118.5 (y = 6.5 x (1 - scaleY)); 5.3 at the bottom keeps the closed curve's lower
    // edge there too, so the line does not jump at the swap. The closed curves then rise back to
    // the eye line as they open.
    { part: 'eyes', prop: 'y', keys: [[0, 0], [340, 0], [640, 2.5, 'standard'], [700, 2.5],
                                      [860, 5.3, 'in'], [1040, 0, 'out']] },
    // The z's: invisible while fx is none, they swap in at opacity 0 as the eyes close. They fade in
    // early ('out') but travel slow-in, slow-out ('standard'), so most of the drift (up and a touch
    // right, growing) happens while they can be seen. The start offset (x -1, y +8, scale 0.8) keeps
    // the smallest z clear of the hood's shoulder and the dark-theme rim.
    { part: 'fx', prop: 'opacity', keys: [[0, 1], [200, 0, 'standard'], [860, 0], [1250, 1, 'out']] },
    { part: 'fx', prop: 'x', keys: [[0, 0], [200, -1, 'standard'], [860, -1], [1250, 0, 'standard']] },
    { part: 'fx', prop: 'y', keys: [[0, 0], [200, 8, 'standard'], [860, 8], [1250, 0, 'standard']] },
    { part: 'fx', prop: 'scale', keys: [[0, 1], [200, 0.8, 'standard'], [860, 0.8], [1250, 1, 'standard']] }
  ],
  swaps: [
    [860, 'eyes', 'closed'],
    [860, 'fx', 'zzz']
  ]
};
