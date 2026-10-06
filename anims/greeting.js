/*
 * greeting: a warm hello (SPEC §4: welcome screen, empty chat, first open).
 *
 * Beats (ms):
 *     0-110   anticipation: the body squashes a little, the right mitten dips and tips in, the
 *             eyes blink into happy arcs (the swap hides at the bottom of the blink).
 *   110-410   a small bounce: the whole coach hops off the ground (root.y -8, the same hop
 *             primitive as happy and surprised) while the body stretches, the shadow shrinks, and
 *             it lands with a small squash that springs back. On the way up the right mitten is
 *             thrown up beside the head, the head tilts toward it and a small smile fades in.
 *   340-825   the wave: the mitten swings out, in, out, in (two waves) about its wrist, the
 *             second a touch smaller. The half-swings lengthen (150, 160, 175 ms) so the wave
 *             winds down warmly into the drop instead of ticking like a metronome.
 *   825-1200  settle: the mitten drops back to its place with a little follow-through (the drop
 *             is 295 ms, the settle 80 ms), the head tilt releases with it, the smile fades out
 *             and the eyes blink back to rest. Ends exactly on rest.
 *
 * The left mitten follows the bounce a beat late (follow-through). The mittens ride the root, so
 * their y keys over the hop (110-460 ms) have the hop taken out: on screen their paths are the
 * reviewed ones (the waving mitten within about 2 units, the other within 1).
 *
 * Times in ms. Each key is [t, value, ease into this key]; every key that changes value names its
 * ease, and a key that repeats the value before it is a hold.
 */
BraviloMotion.ANIMS['greeting'] = {
  id: 'greeting',
  label: 'Greeting',
  where: 'welcome screen, empty chat, first open',
  feel: 'a warm hello: one hand waves twice, a small bounce, happy eyes',
  durationMs: 1200,
  loop: false,
  endPose: 'rest',
  tracks: [
    // The bounce, from the planted base: squash (anticipation), stretch while rising, neutral at
    // the apex, a touch of stretch while falling, squash on landing, spring back.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [110, 0.962, 'standard'], [210, 1.035, 'out'],
      [290, 1, 'standard'], [390, 1.015, 'in'], [440, 0.972, 'out'], [620, 1, 'spring']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [110, 1.0127, 'standard'], [210, 0.9883, 'out'],
      [290, 1, 'standard'], [390, 0.995, 'in'], [440, 1.0093, 'out'], [620, 1, 'spring']] },
    // The hop: everything but the shadow leaves the ground.
    { part: 'root', prop: 'y', keys: [[0, 0], [110, 0], [290, -8, 'out'], [410, 0, 'in']] },
    // The ground shadow shrinks and fades while the coach is up.
    { part: 'shadow', prop: 'scale', keys: [[0, 1], [110, 1.02, 'standard'], [290, 0.88, 'out'], [410, 1, 'in']] },
    { part: 'shadow', prop: 'opacity', keys: [[0, 1], [110, 1], [290, 0.65, 'out'], [410, 1, 'in']] },

    // The features lag the bounce a little, and the head tilts toward the wave.
    { part: 'face', prop: 'y', keys: [[0, 0], [130, 1.5, 'standard'], [300, -1.5, 'out'], [450, 1.5, 'in'],
      [620, 0, 'standard']] },
    { part: 'face', prop: 'rotate', keys: [[0, 0], [340, 2.5, 'standard'], [850, 2.5], [1100, 0, 'standard']] },
    { part: 'face', prop: 'x', keys: [[0, 0], [340, 1, 'standard'], [850, 1], [1100, 0, 'standard']] },

    // The waving mitten: dips and tips in (anticipation), is thrown up beside the head arriving
    // on the first out-swing, swings in, out, in about the wrist, then drops back with a little
    // follow-through.
    // Raised, the mitten sits beside the head (wrist about [202, 115]) and stays clear of the cream
    // face window through the whole wave (330-825 ms): it holds x 17 and only rotates about the
    // wrist (out 28, in -3, out 25, in -2: the second wave a touch smaller, so it reads as
    // finishing), with a 1-unit lift on each out-swing. The half-swings lengthen (150, 160,
    // 175 ms) so the wave slows into the drop. On the way down it keeps x 17 until 980 ms, so it
    // falls beside the hood's right wall rather than across the face, then tucks in to its rest
    // place (never covering more of the window than the rest pose does). The mitten stays inside
    // x 155..235, y 67..209 throughout. Its y at 340 is -81.91 in the root, -88 on screen (the
    // root is still 6.09 up there).
    { part: 'handR', prop: 'y', keys: [[0, 0], [110, 4, 'standard'], [340, -81.91, 'out'], [490, -87, 'standard'],
      [650, -88, 'standard'], [825, -87, 'standard'], [1120, 2, 'standard'], [1200, 0, 'out']] },
    { part: 'handR', prop: 'x', keys: [[0, 0], [110, -1, 'standard'], [340, 17, 'out'], [980, 17],
      [1120, -1, 'standard'], [1200, 0, 'out']] },
    { part: 'handR', prop: 'rotate', keys: [[0, 0], [110, -6, 'standard'], [340, 28, 'out'], [490, -3, 'standard'],
      [650, 25, 'standard'], [825, -2, 'standard'], [1120, 3, 'standard'], [1200, 0, 'out']] },

    // The other mitten follows the bounce about 40 ms late. These keys are in the root, so the
    // hop is taken out of them; on screen it sinks 2.5 in the squash, lifts 7 a beat after the
    // body and lands a beat after it.
    { part: 'handL', prop: 'y', keys: [[0, 0], [110, 2.38, 'standard'], [150, 6.79, 'standard'],
      [290, 1.27, 'out'], [330, -0.31, 'in'], [410, -3.11, 'standard'], [460, 1.5, 'in'],
      [620, 0, 'standard']] },
    { part: 'handL', prop: 'rotate', keys: [[0, 0], [330, -5, 'standard'], [620, 0, 'standard']] },

    // Happy eyes: blink in at the bottom of the anticipation, blink back to rest at the end.
    { part: 'eyes', prop: 'scaleY', keys: [[0, 1], [45, 1], [110, 0.15, 'in'], [180, 1, 'out'],
      [1000, 1], [1065, 0.15, 'in'], [1135, 1, 'out']] },

    // The small smile: while the mouth is still `none` (nothing drawn) its opacity and scale drop,
    // it swaps to smile, then fades and grows in. At the end it fades and shrinks out, swaps back
    // to none, and the invisible group returns to identity.
    { part: 'mouth', prop: 'opacity', keys: [[0, 1], [100, 0, 'standard'], [140, 0], [280, 1, 'out'],
      [920, 1], [1040, 0, 'in'], [1080, 1, 'standard']] },
    { part: 'mouth', prop: 'scale', keys: [[0, 1], [100, 0.7, 'standard'], [140, 0.7], [340, 1, 'spring'],
      [920, 1], [1040, 0.8, 'in'], [1080, 1, 'standard']] }
  ],
  swaps: [
    [110, 'eyes', 'happy'],
    [140, 'mouth', 'smile'],
    [1040, 'mouth', 'none'],
    [1065, 'eyes', 'rest']
  ]
};
