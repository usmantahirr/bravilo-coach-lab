/*
 * press and pressOpen: the coach button in the tab dock is pressed (SPEC §4, the D76 press).
 *
 * A press, not a reaction: the whole coach sinks to 0.94 about its planted base the moment the
 * finger lands (a quick 'out' ease, no anticipation), the body widens a touch so it reads as a
 * squash rather than a shrink, and everything springs back to full size. The eyes stay open and
 * on the user (no squint, no blink): the tap is the user calling the coach, so the coach looks
 * receptive. The features dip a hair after the hood and the mittens bob after the body
 * (follow-through, no tuck), the right one a beat later. No swaps.
 *
 * Depth: root 0.94 x body 0.995 = about 0.935 tall, root 0.94 x body 1.02 = about 0.959 wide at
 * the bottom (90-100 ms); the hood top drops about 11 units. Don't go deeper: D77 found the motion
 * too strong. If it reads weak at 24 pt, check on a device first.
 *
 * The split (for the port; the D76 Tappable sinks on press-in and springs on release):
 *   0-90 ms    press-in. Plays on touch-down, then HOLDS the 90 ms state while the finger is down.
 *   90-420 ms  press-out. Plays on release (the spring back and the follow-through).
 *   The lab's dock button does this split by driving a progress value through
 *   BraviloPlayer.seek(coach, 'press', p): 0 to 90/420 over 90 ms on touch-down (then held), and on
 *   to the end over the rest of the 420 ms on release.
 *
 * The coach button is a tab: a tap opens the chat, a re-tap on the focused tab does nothing
 * (TabDock.selectRoute), and the dock stays visible on the chat tab. chatOpen has no tap beat of
 * its own (no blink, no squash), so press is the only touch reaction. One rule per case:
 *   - Opening tap (chat closed, coach at rest): press 0-90 ms on touch-down, held while the finger
 *     is down, then 90-420 ms on release. chatOpen starts at press t = 330 ms with
 *     play(coach, 'chatOpen', { settle: false }). At 330 ms the root and shadow tracks are exactly 1
 *     (their last keys) and the body is past its spring overshoot, within 0.0001 of 1. The
 *     leftovers (face.y 0.05, handL.y 0.13, handR.y 0.24 units) snap to rest when chatOpen starts,
 *     invisibly: under 0.06 pt at the 56 pt dock size. chatOpen does not track root or shadow, so
 *     an earlier start would snap the whole coach's size.
 *   - A touch at rest that does not open the chat (a cancelled touch, or a long press, which fires
 *     tabLongPress instead of onPress): press plays to its end on rest.
 *   - A re-tap on the coach while the chat is open (coach in the chatOpen pose): pressOpen. Playing
 *     press there would lower the raised mitten and drop the smile before the squash lands, then
 *     end on rest with the chat still open (the D75 open-state cue gone, the tap lost as in D77).
 *   - The chat closes when another tab is tapped (the coach button never closes it); the coach
 *     then eases chatOpen to rest with to(coach, 'rest') in TOKENS.ms.base.
 *   In the lab, the opening tap's release runs press on to t = 330 ms and then starts chatOpen
 *   with { settle: false }; a keyboard press (no touch-down) runs 0 to 330 ms in one go.
 *   An earlier hand-off (chatOpen at press t = 120 ms, from press's live values) can come later,
 *   but only if chatOpen first adds tracks that finish press's spring ({ part:'root', prop:'scale',
 *   keys:[[0,1],[210,1,'spring']] } and the same for shadow.scale) and the player gains a
 *   from:'current' start. Until both exist, use 330 ms.
 *
 * pressOpen is press offset onto the chatOpen pose (read from BraviloMotion.POSES.chatOpen, like
 * chatOpen reads its held mitten): x, y and rotate keys add the pose value, scale keys multiply by
 * it. Of the channels press tracks, only handR.y differs between rest and chatOpen, so today only
 * that track changes: [[0,-80],[150,-77],[420,-80]]. The mitten's
 * x 17 and rotate 14 and the smile hold from the start pose through the squash.
 *
 * Times in ms. Each key is [t, value, ease into this key].
 */
(function () {
  var M = BraviloMotion;

  var PRESS_TRACKS = [
    // The press: the whole coach (body, mittens, fx) sinks about its base, then springs back
    // (the spring overshoots a hair past 1). 0-90 ms is press-in, held while the finger is down.
    { part: 'root', prop: 'scale', keys: [[0, 1], [90, 0.94, 'out'], [330, 1, 'spring']] },
    // Shape only, a beat behind the root: the body widens a touch so the press reads as a squash.
    { part: 'body', prop: 'scaleY', keys: [[0, 1], [100, 0.995, 'out'], [340, 1, 'spring']] },
    { part: 'body', prop: 'scaleX', keys: [[0, 1], [100, 1.02, 'out'], [340, 1, 'spring']] },
    // The ground shadow follows the footprint a little (it sits outside root).
    { part: 'shadow', prop: 'scale', keys: [[0, 1], [90, 0.97, 'out'], [330, 1, 'spring']] },
    // The features dip a little further and later than the hood. The eyes stay open.
    { part: 'face', prop: 'y', keys: [[0, 0], [120, 2, 'standard'], [380, 0, 'standard']] },
    // Follow-through: the mittens bob down after the body, the right one a beat later. No tuck.
    { part: 'handL', prop: 'y', keys: [[0, 0], [130, 3, 'standard'], [400, 0, 'standard']] },
    { part: 'handR', prop: 'y', keys: [[0, 0], [150, 3, 'standard'], [420, 0, 'standard']] }
  ];

  // The same track on top of a pose: offsets add, factors multiply. Returns new key arrays.
  var FACTOR = { scale: true, scaleX: true, scaleY: true, opacity: true };
  function onPose(pose, tr) {
    var base = ((pose.parts || {})[tr.part] || {})[tr.prop];
    var keys = tr.keys.map(function (k) {
      var v = base == null ? k[1] : FACTOR[tr.prop] ? base * k[1] : base + k[1];
      return k.length > 2 ? [k[0], v, k[2]] : [k[0], v];
    });
    return { part: tr.part, prop: tr.prop, keys: keys };
  }

  M.ANIMS['press'] = {
    id: 'press',
    label: 'Press',
    where: 'the coach button in the tab dock is touched while the chat is closed (coach at rest). ' +
           'Touch-down plays 0-90 ms and holds the 90 ms state while the finger is down; release ' +
           'plays 90-420 ms. Opening tap: chatOpen starts at press t = 330 ms with ' +
           'play(coach, \'chatOpen\', { settle: false }). press plays to its end only for a touch at ' +
           'rest that does not open the chat: a cancelled touch, or a long press (it fires ' +
           'tabLongPress instead of onPress). A re-tap on the coach while the chat is open plays ' +
           'pressOpen. The chat closes when another tab is tapped, and the coach then eases ' +
           'chatOpen to rest with to(coach, \'rest\') in TOKENS.ms.base.',
    feel: 'a squash to about 0.94 and a spring back (D76 press)',
    durationMs: 420,
    loop: false,
    startPose: 'rest',
    endPose: 'rest',
    tracks: PRESS_TRACKS.map(function (tr) { return onPose(M.POSES.rest, tr); }),
    swaps: []
  };

  M.ANIMS['pressOpen'] = {
    id: 'pressOpen',
    label: 'Press (chat open)',
    where: 'a re-tap on the coach button while the chat is open (coach in the chatOpen pose). ' +
           'TabDock.selectRoute does nothing for the focused tab, so the chat stays open and the ' +
           'coach keeps its raised mitten and smile through the squash. Same split as press: ' +
           'touch-down plays 0-90 ms and holds; release plays 90-420 ms.',
    feel: 'the D76 press on the chatOpen pose: a squash to about 0.94 and a spring back, the ' +
          'mitten still raised',
    durationMs: 420,
    loop: false,
    startPose: 'chatOpen',
    endPose: 'chatOpen',
    tracks: PRESS_TRACKS.map(function (tr) { return onPose(M.POSES.chatOpen, tr); }),
    swaps: []
  };
})();
