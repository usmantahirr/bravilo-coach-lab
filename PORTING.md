# Porting Fold from the coach lab to the app

How the lab's coach (D142) moves into the iPhone app as `apps/mobile/src/ui/Fold.tsx`, drawn with
react-native-svg (15.15 in the app today) and animated with Reanimated (4.5). Nothing here changes
the app by itself: the move starts as an approved Linear issue for the Build session, and any change
to which moment plays where needs a decision row first (CLAUDE.md, "How work happens").

The lab is the reference. Whatever the founder approves in `index.html` must look and time the same
in the app, so the port replays the lab's data instead of re-authoring the motion.

## 1. What moves, and as what

| Lab file | What it holds | In the app |
|---|---|---|
| `coach.js` | the drawing: 74 paths in ten part groups, variants, pivots, theme colours, small mode | `ui/fold/geometry.ts`, generated (section 2) |
| `motion.js` | `TOKENS` (ms, cubic-bezier eases) and `POSES` | `ui/fold/motion.ts`, generated |
| `anims/*.js` | `ANIMS`: one spec per animation (keys, eases, swaps) | the same generated `motion.ts` |
| `player.js` | how a spec becomes motion: eases, `sample()`, settle, stop, reduced motion | `ui/fold/driver.ts`, hand-ported (sections 4 to 8) |
| `index.html` | the review page | stays in the lab |

Never parse the lab's source files. Several animation files compute their keys when they load
(they read `POSES` so their last keys always equal the pose: `thinking`, `encourage`, `concerned`,
`chatOpen`, `press`/`pressOpen`), so run them and serialise the result.

## 2. Export the data (both snippets were run against today's lab)

Motion: tokens, poses and every animation, as plain JSON (about 105 KB pretty-printed, 16 animations).

```js
// node export-motion.mjs fold-motion.json   (run from the lab root)
import vm from 'node:vm';
import fs from 'node:fs';
const ctx = vm.createContext({});
ctx.window = ctx;                                   // the files write window.BraviloMotion
const files = ['motion.js', ...fs.readdirSync('anims').filter((f) => f.endsWith('.js')).sort().map((f) => 'anims/' + f)];
for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const { TOKENS, POSES, ANIMS } = ctx.BraviloMotion;
fs.writeFileSync(process.argv[2], JSON.stringify({ TOKENS, POSES, ANIMS }, null, 2));
```

Geometry: `coach.js` builds its paths with code, so render it once in a browser and dump the tree:
groups with `data-part`, `data-variant`, `data-set` and `data-detail`, and every path as
structured props that map one to one onto react-native-svg's `<Path>`. Colours are theme token
names, never values (`'hood'` for `var(--coach-hood)`, `null` for none); the app looks them up in
its theme. The dark-theme rim is marked `rim: true` and has no `strokeWidth`: its width comes from
`rimSteps` by rendered size (section 3). About 15 KB as compact JSON.

```js
// node export-geometry.cjs fold-geometry.json   (Playwright is installed in the lab)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/sheet.html');
  const tree = await p.evaluate(() => {
    const c = BraviloCoach.create(document.body.appendChild(document.createElement('div')), { size: 240 });
    const token = (v) => { const m = /var\(--coach-([a-z-]+)\)/.exec(v || ''); return m ? m[1] : null; };
    // { d, fill: token|null, stroke: token|null, strokeWidth, strokeLinecap, strokeLinejoin, fillRule, rim }
    const path = (el) => {
      const s = el.style, o = { d: el.getAttribute('d'), fill: token(s.fill), stroke: token(s.stroke) };
      if (o.stroke) {
        o.strokeLinecap = s.strokeLinecap || 'butt';
        o.strokeLinejoin = s.strokeLinejoin || 'miter';
        if (el.hasAttribute('data-rim')) o.rim = true; else o.strokeWidth = +s.strokeWidth;
      }
      if (s.fillRule) o.fillRule = s.fillRule;
      return o;
    };
    const walk = (el) => el.tagName === 'path' ? path(el)
      : Object.assign({ children: [...el.children].map(walk) },
          ...['part', 'variant', 'set', 'detail'].filter((a) => el.hasAttribute('data-' + a)).map((a) => ({ [a]: el.getAttribute('data-' + a) })));
    return { viewBox: BraviloCoach.VIEWBOX, pivots: BraviloCoach.PIVOTS, themes: BraviloCoach.THEMES,
             rimSteps: BraviloCoach.RIM_STEPS, smallBelow: BraviloCoach.SMALL_BELOW, defaults: BraviloCoach.DEFAULTS,
             root: [...c.svg.children].map(walk) };
  });
  fs.writeFileSync(process.argv[2], JSON.stringify(tree));
  await b.close();
})();
```

A path comes out as, for example, `{ d: 'M 92.5 112 L 97.5 112', fill: null, stroke: 'ink',
strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 13 }`. Every variant group is in the
tree with its `display="none"` left out: show `defaults` (rest, none, none, none) at first.

Turn both JSON files into typed `.ts` modules with a "generated from the coach lab, do not edit"
header. A later change to the character or a motion is made in the lab, approved there, and
re-exported.

## 3. The drawing: parts become `<G>` groups

The tree is fixed, and only the ten part groups ever get a transform:

```
<Svg viewBox="0 0 240 240">
  <G part="shadow">  ground ellipse
  <G part="root">
    <G part="body">  face fill (static) · <G part="face"> eyes, mouth, brows </G> · hood ring · lining · rim
    <G part="handL"> · <G part="handR"> · <G part="fx">
```

- Every shape is a path with absolute `M L C Q Z` only (no arcs, text, filters, masks, gradients
  or clip paths), so each `d` goes straight into `<Path d=…>`.
- The hood ring is drawn over the face fill, so the features (the `face` group) move inside a fixed
  cream window and can never show cream outside the hood. Keep that order.
- Each part transforms about its pivot in drawing units (`PIVOTS`): root and body at the base
  (120, 204), the face at the window centre, eyes on the eye line, the hands at the wrists, fx at the
  dots' centre. A part's drawn transform is
  `translate(pivot + (x, y)) · rotate(rotate) · scale(scale·scaleX, scale·scaleY) · translate(−pivot)`.
- Animate each part with `Animated.createAnimatedComponent(G)` and `useAnimatedProps`, writing the
  native `matrix` prop and `opacity`. The worklet below matches the lab's drawn transforms within
  about 0.02 units (measured up to 0.013 against GSAP's drawn matrix across greeting, proud,
  encourage, concerned, thinking and surprised; GSAP rounds what it writes):

```ts
function partProps(c: Channels, [px, py]: readonly [number, number]) {
  'worklet';
  const r = (c.rotate * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const sx = c.scale * c.scaleX, sy = c.scale * c.scaleY;
  const a = cos * sx, b = sin * sx, cc = -sin * sy, d = cos * sy;
  return { matrix: [a, b, cc, d, px + c.x - (a * px + cc * py), py + c.y - (b * px + d * py)], opacity: c.opacity };
}
```

  Check this in a small spike on a device before building the rest: react-native-svg reads `matrix`
  natively, but if Reanimated 4 does not pass it through, the fallback is today's approach in
  `Fold.tsx` (stacked `Animated.View` layers with pivot offsets), arranged so the face layer stays
  between the face fill and the hood ring.
- Colours come from the theme, never from the paths. `ui/theme.ts` already has today's coach
  tokens (`coachShell`, `coachFace`, `coachEyes`, `coachCrease`, `coachArm`, `coachArmShade`,
  `coachFold`). **Replace them**, do not add the new ones beside them: today's dark theme draws the
  inverted face that D142 removes (`coachFace` n800 with `coachEyes` mist100, a light `coachShell`).
  The new tokens, from SPEC §1 (the face stays cream with dark ink in both themes):

  | Token | Light | Dark |
  |---|---|---|
  | `coachHood` | #1E2220 (n850) | #2A302C |
  | `coachRim` | transparent | rgba(201,211,191,0.55) |
  | `coachFace` | #FAF7ED | #FAF7ED |
  | `coachInk` | #1E2220 | #1E2220 |
  | `coachHand` | #C5ED62 (lime300) | #C5ED62 |
  | `coachHandShade` | #94AF7C (muscleSecondary) | #657D59 (muscleSecondaryDark) |
  | `coachFx` | #94AF7C | #A4C584 |
  | `coachShadow` | rgba(30,34,32,0.10) | rgba(0,0,0,0.35) |

  Map the geometry's token names onto them (`hood` → `coachHood`, `hand-shade` →
  `coachHandShade`, and so on). The dark rim thickens as the coach shrinks (`rimSteps`: 2, 2.5, 4
  and 7 units at 150, 72, 44 and 0 pt and up).

### Layout: the box is now 240 × 240

Today's Fold draws in a 240 × 220 box (`W`, `H` in `Fold.tsx`), so a `size` of 48 is 48 × 44 pt.
The new coach is square: the same `size` is 48 × 48, about 9% taller, with the coach standing on the
bottom edge (the shadow sits at y 204 to 216). Every placement grows by that much: the coach line
(48), the dock button (56), the chat's empty state and the crash screen (88), the summary (88 or
112), BuildingPlan (112). Check each one for clipping and spacing in the simulator.

### Small mode (below 44 pt)

Below 44 pt the coach hides the brows and the fine detail (mitten shade, fold lining), and shows the
bold eye and mouth sets (`data-set="small"`). Of the effects only the thinking dots stay, drawn from
their own small set (radius 8 to 9 units, about 2 px across at 32 pt, kept clear of the hood and the
dark rim); `zzz` and `spark` have no small set, so they vanish (SPEC §2 as amended). Decide it once
from `size`, not per frame. So at the chat's 32 pt pending reply (`CoachChat.tsx`), `thinking`
still builds its dots one by one.

## 4. Tracks: keys become timing

A spec is data:

```
{ id, durationMs, loop, startPose, endPose, reducedPose?,
  tracks: [{ part, prop, keys: [[tMs, value, ease?], …] }],
  swaps:  [[tMs, group, variant], …] }
```

- `prop` is one of seven channels per part: `x`, `y` (drawing units), `rotate` (degrees, clockwise),
  `scale` (multiplies both axes), `scaleX`, `scaleY`, `opacity`. Every part has all seven, so a
  track can target any of them (`happy` and others animate `mouth.opacity`; `proud` animates
  `fx.scale` and `fx.opacity`). Missing channels hold the start pose's value.
- **Key-ease convention:** the ease on key *i* is the curve *into* key *i* from key *i−1*. Every
  key whose value differs from the key before it names its ease in every animation file; only holds
  (the same value again) leave it out. Treat a missing ease as `standard` anyway, as the lab's
  player does.
- **Hops** all use one primitive: `root.y` (happy, surprised, greeting). The mittens and fx ride
  the hop; the shadow sits outside root and stays on the ground.
- The four eases are cubic-bezier control points in `TOKENS.ease`; build them once with
  `Easing.bezier(...TOKENS.ease[name])`, never retype them. `spring` is a bezier with an overshoot
  (`[0.34, 1.56, 0.64, 1]`), not a physics spring, so durations stay exact.

The direct translation, one shared value per channel:

```ts
const EASE = mapValues(TOKENS.ease, (p) => Easing.bezier(p[0], p[1], p[2], p[3]));

function trackAnimation(keys: Key[], durationMs: number, loop: boolean) {
  const steps = keys.slice(1).map((k, i) =>
    withTiming(k[1], { duration: k[0] - keys[i][0], easing: EASE[k[2] ?? 'standard'] }));
  const lastT = keys[keys.length - 1][0];
  if (lastT < durationMs) steps.push(withDelay(durationMs - lastT, withTiming(keys[keys.length - 1][1], { duration: 0 })));
  const seq = withSequence(...steps);           // a key that repeats the value before it is a hold
  return loop ? withRepeat(seq, -1, false) : seq;
}
// sv.value = keys[0][1]; then sv.value = trackAnimation(keys, spec.durationMs, spec.loop)
```

Pad every track to `durationMs` (the `withDelay` above), so all tracks of a loop share one period.

### Recommended driver: one clock per coach

The per-channel sequences above are faithful, but three things the app needs are awkward with them:
the press split at 90 ms (most tracks have no key there), seeking, and checking parity with the lab.
All three are trivial with the lab's own model: one shared value `t` (ms into the current spec) and a
worklet port of `player.js`'s `sample(spec, t)` (its `cubicBezier` solver and `trackValue`). Each
part's `useAnimatedProps` samples its own tracks at `t`, and each variant group derives its visible
variant from the swaps at or before `t`.

```ts
const t = useSharedValue(0);                    // the clock
const spec = useSharedValue<FoldSpec>(STILL);   // plain data, readable on the UI thread
// play:   spec.value = ANIMS.happy; t.value = 0; t.value = withTiming(D, { duration: D, easing: Easing.linear }, onEnd)
// loop:   t.value = withRepeat(withTiming(D, { duration: D, easing: Easing.linear }), -1, false)
// seek:   t.value = ms
// press:  touch-down t → 90 over 90 ms (then hold); release t → 420 over 330 ms
```

The `withTiming` callback (`onEnd` above) runs on the UI thread as a worklet. Anything that touches
React or JS state there (`onDone`, the next animation, the `played` set) must hop back with
`scheduleOnRN` (react-native-worklets, Reanimated 4) or `runOnJS`.

Both routes read the same generated data, so this choice can be made in the spike. The lab's dock
button already drives press this way (a tween on `t` through `seek`), so it is the reference for the
press split.

## 5. Swaps: discrete expression changes

`swaps` are `[tMs, group, variant]` with groups `eyes`, `mouth`, `brows`, `fx`. Draw every variant
of a group once, and show exactly one: an animated `opacity` of 1 or 0 per variant `<G>`, driven by
a numeric shared value per group (or derived from the clock). Never mount and unmount paths during
an animation.

- With per-channel sequences: `withSequence(withDelay(t1, withTiming(i1, { duration: 0 })), withDelay(t2 - t1, …))`
  on the group's index, with `withRepeat` for a loop.
- Two swaps can share a time (sleepy's `eyes: closed` and `fx: zzz` at 860 ms); apply them in the
  order listed.
- The specs already hide every swap that would pop (a blink with `eyes.scaleY` near 0.15, or the
  group's opacity at 0), so the port only has to land the swap on its exact time.
- Variant names: eyes `rest happy wide closed up left right down`, mouth `none smile open o soft`,
  brows `none raised worried think`, fx `none dots zzz spark dots1 dots2` (`dots1`/`dots2` build the
  thinking dots one by one).

## 6. Start poses, end poses, settle and stop

- `startPose` is a pose name **or an inline pose object**. `thinking` starts on an object (the
  thinking pose with one dot, named "thinking, one dot"). Never look it up as
  `POSES[spec.startPose]`; resolve it as the player does (`typeof p === 'string' ? POSES[p] : p`).
  `startPose` defaults to `rest`.
- Every one-shot ends exactly on its `endPose` (the lab validates it). Snap to the end pose on
  completion anyway, so float drift never shows.
- **Settle** (`play()` when the coach is not on the start pose, for example happy before a nod): a
  220 ms (`TOKENS.ms.base`) transition, every channel eased `standard` to the start pose plus any
  swap at t = 0 of the spec. A changed eye variant hides behind a blink (eyes `scaleY` to 0.15 at
  half time, swap, back); another changed group dips its opacity to 0 at half time and swaps there.
  `player.js` `transitionSpec()` builds this as an ordinary spec; port that function and play its
  result.
- **Stop** (`thinking` ending, or a screen cutting an animation short): the same transition to the
  spec's `endPose` in 220 ms. **To** a pose (the chat closing): the same, to that pose.

## 7. Thinking, the only loop

- One period is 1500 ms. It loops while the work runs and returns to rest in 220 ms from any frame
  when it stops (section 6).
- On each repeat the variants reset to the start variants (one dot), then the swaps build the thought
  again (two dots at 340 ms, three at 680 ms, back to one at 1280 ms while the dots are faded out).
- Reduced motion shows `reducedPose` (`thinking`: the full thought, three dots) while the work runs,
  and cuts to rest when it stops.

## 8. Reduced motion

With Reduce Motion on (`useReduceMotion()` in `Fold.tsx`, which follows the setting live), nothing
moves: playing an animation shows its end pose at once (a loop shows `reducedPose`), stop and `to`
cut instantly. The screen's own words carry the state, as D75 says.

## 9. D75's rules still hold

- **One coach animates per screen.** Only the screen's hero coach gets motion; every other coach on
  the screen is a still pose. The lab enforces this too: starting one card stops the others.
- **Each gesture plays once per event key per app session.** Keep the `played` set from today's
  `Fold.tsx` (`${name}:${key}`), so coming back to a screen never replays its moment.
- **Nothing loops except thinking**, and only while work runs. No idle motion, no blinking at rest.
- **Reduced motion shows the still pose.**

## 10. Which app moment plays which animation

From SPEC §4. "Today" is what the app does now (D75); a row that changes it needs a decision row.

| Animation | Plays in the app | App size (pt) | Suggested trigger and event key | Ends on | Today |
|---|---|---|---|---|---|
| (still) `rest` | Today, coach lines, everywhere by default | 48 coach line, 24–32 tab and avatar | `pose="rest"` | rest | FoldStatic |
| `greeting` | welcome screen, empty chat, first open | 48 welcome (coach line), 88 empty chat | `welcome`; `chat-empty`; first open per install | rest | greeting on welcome and empty chat |
| `nod` | something saved, plan updated, coach voice picked | 88 plan updated, 48 voice pick (coach line) | the saved item's id; `plan-updated:<version>`; `voice-<n>` | rest | nod on plan updated, voice pick |
| `thinking` | while the coach replies or a plan builds | 32 chat pending reply, 112 BuildingPlan | `thinking={pending}` (loop) | rest when stopped | thinking (chat 32 pt, BuildingPlan 112 pt) |
| `happy` | finish screen | 88, or 112 on the first workout | session id | happy | **encourage** on the summary (change needs a D-row) |
| `proud` | new best; milestones at workouts 3, 6 and 12; first time beating last time | 88 or 112 (summary) | best id; `milestone-<n>`; session id | proud | none |
| `surprised` | an unexpected new best | 88 or 112 (summary) | best id | happy | none |
| `encourage` | before a workout, first workout, "twenty minutes counts" after a gap | 48 coach line (88 on the summary today) | workout id; `first-workout`; gap id | encourage | on the summary today |
| `sleepy` | rest-day card | 48 coach line | date of the rest day | sleepy | none |
| `welcomeBack` | coming back after a break (14+ days in the art direction) | 48 coach line, or 88 if it gets a screen | date of return | happy | none |
| `concerned` | "Something feels off", pain follow-up | 48 coach line | the report's id | concerned | none |
| `lookAtLeft` / `lookAtRight` / `lookAtDown` | onboarding and plan reveal: the eyes guide to a button | 48 coach line, 112 plan reveal | step id; direction from the button's side | lookLeft / lookRight / lookDown | none |
| `press` / `pressOpen` | the coach button in the tab dock | 56 | every touch (no once-per-session rule) | rest / chatOpen | FoldStatic, no press |
| `chatOpen` | the chat is open (the button's open state) | 56 | each time the chat opens | chatOpen | FoldStatic `pose="open"` |

Sizes are today's placements in the app (`COACH_LINE_SIZE` 48, `COACH_SIZE` 56, the summary's 88 or
112 on the first workout, the chat's 88 empty state and 32 pending reply, BuildingPlan 112, plan
updated 88, the crash screen 88). Each is about 9% taller in the new square box (section 3).

Open product question: `proud` and `surprised` both answer a new best. The app needs one rule for
which plays (for example `surprised` when the best beats what the plan expected, `proud` otherwise),
recorded as a decision.

## 11. The coach button in the tab dock

`pressOpen` is registered from `anims/press.js` (there is no `pressOpen.js`), so any list of
animation ids must include it. One rule per case:

1. **Opening tap** (chat closed, coach at rest): `press` 0–90 ms on touch-down, held while the finger
   is down; 90–420 ms on release. `chatOpen` starts at press t = 330 ms with no settle
   (`play('chatOpen', { settle: false })`). At 330 ms root and shadow are exactly 1 and the leftovers
   are under 0.06 pt at 56 pt, so the hand-off is invisible.
2. **A touch that does not open the chat** (cancelled, or a long press, which fires `tabLongPress`):
   `press` plays to its end on rest.
3. **Re-tap while the chat is open**: `pressOpen` (the same squash on the chatOpen pose; the raised
   mitten and the smile stay).
4. **Another tab tapped** (the chat closes): `to('rest')` in 220 ms.

`chatOpen` has no tap reaction of its own (no blink, no squash); `press` is the only touch reaction.
An earlier hand-off (chatOpen at press t = 120 ms) needs chatOpen to finish press's root and shadow
springs and a start-from-current option first; until then the rule is 330 ms. The app does the
touch-down/release split. The lab's dock button now does the same split (press-in on touch-down,
held while the finger is down, the rest on release, chatOpen at 330 ms), so the founder can feel the
real press on his phone.

## 12. Suggested component API

One component replaces both `FoldStatic` and `FoldCharacter`:

```tsx
type FoldPose = 'rest' | 'happy' | 'proud' | 'encourage' | 'thinking' | 'sleepy' | 'concerned'
  | 'lookLeft' | 'lookRight' | 'lookDown' | 'chatOpen';
type FoldMoment = 'greeting' | 'nod' | 'happy' | 'proud' | 'encourage' | 'sleepy' | 'welcomeBack'
  | 'concerned' | 'surprised' | 'lookAtLeft' | 'lookAtRight' | 'lookAtDown' | 'press' | 'pressOpen' | 'chatOpen';

type FoldProps = {
  size?: number;                                  // pt; below 44 draws the small form
  pose?: FoldPose;                                // the still shown when nothing plays (default rest)
  play?: { name: FoldMoment; key: string | number } | null;   // once per key per app session
  thinking?: boolean;                             // loops while true, then returns to rest
  onDone?: (name: FoldMoment) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

type FoldHandle = {                               // for the dock button only
  pressIn(): void;                                // press (or pressOpen) 0–90 ms, then hold
  pressOut(opts?: { thenOpen?: boolean }): void;  // 90–420 ms; thenOpen starts chatOpen at 330 ms
  to(pose: FoldPose): void;                       // 220 ms transition, e.g. chatOpen → rest
};

export const Fold = forwardRef<FoldHandle, FoldProps>(…);
```

- After a one-shot, the coach holds the moment's end pose until `pose`, `play` or `thinking`
  changes; a still `pose` change uses `to()` (220 ms).
- Accessibility: keep today's default, `accessible={false}` with
  `importantForAccessibility="no-hide-descendants"`: the coach is decorative and the screen's own
  words carry the state. Only when a screen passes `accessibilityLabel` does the coach become an
  image with that label (`accessible`, `accessibilityRole="image"`).
- Static places (crash screen, icons, widgets later) render `<Fold pose="…" />` with no animated
  props, so a widget, a Live Activity or the Watch can draw any pose from the same data with no
  Reanimated (extension-readiness).
- Suggested files: `ui/fold/geometry.ts` and `ui/fold/motion.ts` (generated), `ui/fold/driver.ts`
  (eases, sample, transition, sequence or clock), `ui/Fold.tsx` (the component).

## 13. Tests to bring across

- **Spec rules**: port `player.js` `validate()` as a unit test over the generated `ANIMS`: first key
  at 0, keys in order, known parts, props, eases and variants, one-shots at most 1250 ms, every
  track starting on the start pose and ending on the end pose, loops ending on their first values.
- **Parity**: export `sample(spec, t)` from the lab for every animation at, say, every 10 ms, and
  check the app's `sample` (or the sequences' values) against it within 0.001.
- **Banned words**: the component adds no copy, but its accessibility labels go through the glossary
  test like any other words.

## 14. Decided in the lab, and what is left

Fixed in the lab before the review (final fixes):
- `happy`'s raised mittens no longer read as ears at 32 pt: they fling up at different heights
  (left y −100, right y −74 and further out) instead of as a matching pair beside the head.
- `thinking` reads at 32 pt: the dots have a small set and stay visible below 44 pt (section 3).
- `lookAtDown` reads: the eyes drop 11 units (9 in the small set), the face 5, and both mittens tip
  in toward the button (`POSES.lookDown`, `lookAt.js`).
- `proud`'s spark no longer touches the raised mitten (`coach.js` `SPARK_C`, `SPARK_R`; `proud.js`
  fx keys re-solved, the pose's fx offset is now `{ x: 5, y: 4 }`). Peak right edge about x 239.
- `encourage` has its own pose (two fists forward at the chest, both mittens at scale 1) and the old
  upright-mitten fallback is gone; `surprised` holds its mittens palms-in at the cheeks; `welcomeBack`
  opens its arms low and wide and uses the small smile only (the open smile is proud's).
- The face has two line weights: eyes 13 units, every other feature 7 (brows, smile, soft mouth).
  The small set's soft mouth is nearly flat, so concerned does not read as pleased at 32 pt.
- Every hop is `root.y`; every key that changes value names its ease.

Overshoot (SPEC §3 as amended): bouncy overshoot only from `spring` keys; on any ease a move may
pass the value it settles on once, with no second swing, by at most about 8% of its travel or
1 unit in x and y, 4 degrees in rotate and 0.03 in a scale. The keyed follow-through cases, all
inside those limits: `proud` handR.y −127 → −120 (6% of 126), handR.rotate 16 → 12, handL.rotate
−14 → −10, handL.y −9 → −8, face.y −2 → −1, body.scaleY 1.05 → 1.025, fx.scale 1.03 → 1;
`happy` mittens' drop to the cheeks −15 → −20 (8.6% of 58) with the wrists 4 degrees past;
`encourage` fists x ±23 → ±22, y −13 → −12, scale 1.03 → 1, lean 2.7 → 2 degrees; `chatOpen`
handR.rotate 18 → 14; `lookAtDown` mittens 6.4 → 6 degrees; `surprised` mittens −42 → −40;
`welcomeBack` body scaleY 1.04 → 1.035. Squash and stretch, anticipation and separate acting beats
(happy's mittens flung up, greeting's wave, encourage's pump, lookAt's lead mitten lifting toward
the button and settling, welcomeBack's sigh) are moves of their own, not overshoot.

Still open:
- `proud` and `surprised` both answer a new best (section 10): one rule, recorded as a decision.
- The founder runs the D142 5-second test in the lab (`index.html`, "5-second test"; "Today vs new"
  shows today's Fold beside the new one) before anything moves into the app.

## 15. Today's replay and idle beat (D163)

Today amends D75 and D154 for its one coach only:
- The coach line's moment replays each time Today comes into view: the tab gains focus, the person comes back to it, or the app returns to the foreground. It starts about 600 ms after the screen settles. Key it by visit, not by date, so the once-per-key rule allows it.
- Between replays, play `idle_<pose>` about every 10 s, where `<pose>` is the pose the coach is holding. `anims/idle.js` registers one per still pose except thinking: a 240 ms blink for open eyes, and a 300 ms breath for happy or closed eyes. Each starts and ends on its pose, so it plays with no settle.
- Stop the idle timer when Today is not visible (blur, background, scrolled off screen).
- Reduce Motion: no replay and no idle beat.
- Every other screen keeps once per event and no idle motion.

## 16. Longer moments, twice on one-time screens, replay on view (D165)

- **Timing:** `anims/zz_timing.js` slows every one-shot evenly by 1.3×: key times, swap times and durationMs. It loads last, so `BraviloMotion.ANIMS` (and the §2 export) already carry the slower numbers. Port the exported data and never scale again in the app. Unchanged: press, pressOpen, chatOpen, thinking and `idle_*`. The validator's one-shot cap is now 1700 ms.
- **Twice:** on one-time screens, play the moment, hold its end pose for 1,500 ms, then play it again. The second play settles from the end pose to the start pose in 220 ms, as `play()` does. After that, hold the end pose. These screens:
  - welcome and sign-in (greeting);
  - the finish screen (happy, proud or surprised);
  - plan updated (nod);
  - onboarding look-down and voice pick (nod);
  - the chat opened from "Something feels off" (concerned).
- **Replay on view:** Today (§15, with the idle beat) and the empty chat (greeting, no idle beat) replay each time they come into view. Key the moment by visit.
- **Reduce Motion:** no second play and no replays.
- **The lab:** a new "Play: Once / Twice" control. Twice is the default and shows the one-time screen behaviour; it never applies to press, pressOpen, chatOpen or the idle beats.

## 17. Tap to animate (D167)

- A tap on Pocket plays the screen's moment again, with the same rules as a replay (settle from the current pose, then play), or `nod` where Pocket only holds a still pose.
- A tap is ignored while Pocket is moving and during thinking.
- The tab-bar button keeps its own press and chat open (§11).
- No haptic. Pocket stays `accessible={false}` (decorative), so the tap is never the only way to do anything.
- Reduce Motion: a tap does nothing.
- In the lab, tap any card's Pocket.
