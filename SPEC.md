# Bravilo coach lab — the contract

A prototype of Bravilo's coach character ("Fold", decision **D142**) with expressions and
animations, built **outside** the Bravilo repo. Once the founder approves it, it moves into the
React Native app (`apps/mobile/src/ui/Fold.tsx`, react-native-svg + Reanimated). Everything
here must be portable to that stack.

Lab root: this repository (plain files, no build step except the lab page, see §6).

## 1. The character (D142: "Fold evolved, with the hoodie buddy's warmth")

References in `ref/`. Look at them as images with the Read tool:
- `ref/dir-A-fold-evolved.png`: **the base**. A charcoal hood that is softly rounded (no sharp
  peak), a cream face, two floating lime mitten hands (no arms, which makes them easy to
  animate), and eyes that carry the emotion (pill, happy arc, round, closed curve).
- `ref/dir-C-hoodie.png`: **take only the warmth**, meaning slightly bigger, friendlier eyes, and a
  small mouth used **only in big moments**. Don't take the lime hoodie body, the pocket or the
  childish proportions.
- `ref/fold-sheet.png` and `ref/fold-ref.png`: today's Fold, what we are evolving from.

Must have:
- Hood: charcoal, softly rounded top with a gentle peak at most (never pointed, never
  monk or reaper). The body corners are softened too. The hood frames the face like a hoodie.
- Face: warm cream, larger than today's, friendly. **The face is cream with dark eyes in BOTH
  themes** (never an inverted dark face with glowing eyes).
- Eyes: one consistent eye language across every expression (same stroke weight, same
  family). No glossy highlights, no realistic pupils.
- Mouth: none at rest. A small simple mouth only in big moments (happy, proud, surprised,
  welcome back). Concerned may use a very small soft mouth.
- Hands: two floating lime (#C5ED62) rounded mittens, each with a sage (#94AF7C) inner-shade
  shape at most. They move independently.
- Lime is the only bright colour. No gradients, no textures, no outlines except a dark-theme
  rim if needed, no drop shadows except an optional flat ground shadow (a soft ellipse).
- Friendly, warm, approachable, aspirational. Not babyish, not stern, not scary.
- Reads at 24 pt (tab dock and avatar sizes) and at 180 pt.

Palette (tokens, as CSS variables on the SVG root so themes swap colours only):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--coach-hood` | #1E2220 | #2A302C (lighter so it separates from a #151918 background) | hood and body |
| `--coach-rim` | transparent | #C9D3BF at about 55% | optional thin rim on the hood edge in dark mode |
| `--coach-face` | #FAF7ED | #FAF7ED | face (same in both themes) |
| `--coach-ink` | #1E2220 | #1E2220 | eyes, mouth, brows (on the cream face) |
| `--coach-hand` | #C5ED62 | #C5ED62 | mittens |
| `--coach-hand-shade` | #94AF7C | #657D59 | mitten inner shade |
| `--coach-fx` | #94AF7C | #A4C584 | thinking dots, small z's |
| `--coach-shadow` | rgba(30,34,32,.10) | rgba(0,0,0,.35) | ground ellipse |

App backgrounds to test on: light #F6F5EF, dark #151918.

## 2. Code contract: the character module (`coach.js`)

Plain browser JavaScript (no build step, no modules). It defines a global:

```js
window.BraviloCoach = {
  VIEWBOX: [0, 0, 240, 240],          // drawing units, square
  PIVOTS: { root:[x,y], body:[x,y], face:[x,y], eyes:[x,y], mouth:[x,y], brows:[x,y],
            handL:[x,y], handR:[x,y], fx:[x,y], shadow:[x,y] }, // rotate and scale origins in drawing units
  VARIANTS: { eyes:[...], mouth:[...], brows:[...], fx:[...] },  // names, see below
  create(container, { theme:'light'|'dark', size: number /* CSS px */ }) => coach
}
// coach = { svg, parts: { root, body, face, eyes, mouth, brows, handL, handR, fx, shadow },
//           setVariant(group, name), setTheme(theme), setSize(px), small: boolean }
```

- Every part is an SVG `<g data-part="…">`. Transforms are applied ONLY to these groups,
  around the pivot in `PIVOTS`. `root` wraps everything except `shadow`. `body` holds the hood,
  face, eyes, mouth and brows (so a body tilt carries the face). `handL` and `handR` sit outside
  `body` and float.
- Variants are child `<g data-variant="…">` groups inside `eyes`, `mouth`, `brows` and `fx`;
  exactly one is visible per group (`display` toggled by `setVariant`). Required variants:
  - eyes: `rest` (soft pills), `happy` (upward arcs), `wide` (rounder, open), `closed`
    (soft downward curves), `up` (looking up and to the side), `left`, `right`, `down`
    (looking toward a direction)
  - mouth: `none`, `smile` (small), `open` (open happy smile, for big moments), `o` (small
    round, surprise), `soft` (tiny gentle line, for concern)
  - brows: `none`, `raised` (both up, gentle), `worried` (inner ends up, kind, never sad),
    `think` (one raised)
  - fx: `none`, `dots` (three small dots beside the head, for thinking), `zzz` (two or three
    small rounded z shapes drawn as paths, not text), `spark` (three tiny short lines near the
    raised hand, the most celebration allowed; NO confetti)
- **Small mode** (`size < 44` px): brows are hidden, and the eyes are drawn bigger and
  bolder (a separate small eye set, or a scale on the eyes group about its pivot) so they read
  at 24 pt. Of the fx, only the thinking dots stay (`dots`, `dots1`, `dots2`, drawn from a
  bigger small set so `thinking` still reads at 32 pt, the chat's pending-reply size); `zzz` and
  `spark` are hidden. (Amended in the lab's final fixes; it said brows and fx were hidden.)
- Colours come only from the CSS variables above, set on the `<svg>` per theme.
- No `<text>`, no filters, no masks, no gradients, no clipPaths needed for animation.

## 3. Motion contract (portable to Reanimated)

Animations are **data**, not hand-written GSAP code, so the app can replay the same data with
Reanimated later.

```js
window.BraviloMotion = {
  TOKENS: { ms: { quick:150, base:220, slow:320 },
            ease: { standard:[0.4,0,0.2,1], out:[0,0,0.2,1], in:[0.4,0,1,1],
                    spring:[0.34,1.56,0.64,1] } },   // cubic-bezier control points only
  POSES: { rest:{…}, happy:{…}, … },                  // static end poses (see below)
  ANIMS: { nod:{…}, … }                               // animation specs (see below)
}
// A pose: { eyes, mouth, brows, fx, parts: { body:{x,y,rotate,scaleX,scaleY}, handL:{…}, … } }
// An animation:
// { id, label, where /* where it plays in the app */, feel, durationMs, loop:false|true,
//   endPose: 'rest'|'happy'|…,
//   tracks: [ { part:'body'|'handL'|…, prop:'x'|'y'|'rotate'|'scaleX'|'scaleY'|'scale'|'opacity',
//               keys: [ [tMs, value, easeName], … ] } ],   // first key at t=0; ease applies into that key
//   swaps:  [ [tMs, group, variantName], … ] }             // discrete variant changes
```

Rules:
- Only translate (x, y in drawing units), rotate (degrees), scale, scaleX, scaleY and opacity on
  the named parts, plus discrete variant swaps. No path morphing. Hide a swap with a quick blink
  (eyes `scaleY` to about 0.15 and back over ~120 ms around the swap) when it would pop.
- Every animation starts from the `rest` pose (or from its own start pose, stated) and ends
  exactly on its `endPose`. Values at the last key equal the end pose.
- Durations: one-shot animations **≤ 1250 ms**. `thinking` loops with a period of about
  1200–1600 ms and must look right when stopped at any moment (it returns to `rest` in about
  220 ms).
- Easing names come only from `TOKENS.ease`.
- **Reduced motion:** the player shows `endPose` immediately, with no movement.
- Motion is small and purposeful, as the brand rules say. No idle loops. One coach animates per
  screen.
- **Overshoot** (amended in the lab's final fixes; it said overshoot was allowed only on
  `spring` keys): bouncy overshoot, a value swinging past its target and back more than once,
  comes only from `spring` keys and stays gentle. On any ease, a move may pass the value it settles
  on once and come back (keyed follow-through, no second swing), by at most about 8% of the move's
  travel or 1 unit (whichever is larger) in x and y, 4 degrees in rotate, and 0.03 in a scale.
  Anticipation, squash and stretch, and separate acting beats (hands flung up and then lowered to
  the cheeks, a wave, a pump with a nod, a sigh) are moves of their own, not overshoot.

## 4. The animations to build

| id | Where it plays in the app | Feel | End pose |
|---|---|---|---|
| `rest` | Today, coach lines, everywhere by default | calm, present (a static pose, not an animation) | rest |
| `greeting` | welcome screen, empty chat, first open | a warm hello: one hand waves twice, a small bounce, happy eyes | rest (or a smile settling to rest) |
| `nod` | something saved, plan updated, coach voice picked | "got it": a small dip of the body, a quick happy blink | rest |
| `thinking` | while the coach replies or a plan builds (the only loop) | focused: eyes up, a hand near the chin, dots pulse in sequence | rest when stopped |
| `happy` | finish screen | pleased with you: a small hop with squash and stretch, happy eyes, a small smile, hands up briefly | happy |
| `proud` | new best, milestones at workouts 3, 6 and 12, first time beating last time | the big moment: anticipation dip, stretch up, one hand punches high, open smile, a tiny spark | proud |
| `encourage` | before a workout, first workout, "twenty minutes counts" after a gap | "you've got this": a lean in, both mittens forward as fists ("ready, let's go"; amended in the lab's final fixes from "a mitten forward") with a nod, warm eyes | encourage |
| `sleepy` | rest-day card | content, rest is good: eyes slowly close, a gentle sink, one slow breath, small z's drift up and fade in | sleepy |
| `welcomeBack` | coming back after a break | relief and warmth: eyes widen then go happy, both hands open "there you are" | happy |
| `concerned` | "Something feels off", pain follow-up | attentive and calm, never sad: a slight head tilt, worried-kind brows, soft eyes, a hand lifted gently, slow easing, no bounce | concerned |
| `surprised` | an unexpected new best | a quick pop up, wide eyes, an "o" mouth, raised brows, then settling to happy | happy |
| `lookAt` | onboarding and plan reveal: the eyes guide to a button | the eyes (and a slight lean of the body) glance toward a direction and hold; variants `lookAtLeft`, `lookAtRight`, `lookAtDown` | lookLeft / lookRight / lookDown |
| `press` | the coach button in the tab dock is pressed | a squash to about 0.94 and a spring back (D76 press) | rest |
| `chatOpen` | the chat is open (the coach button's open state) | one hand raised and held, a friendly smile | chatOpen |

## 5. Engine (`player.js`) and the frames page

- `player.js` defines `window.BraviloPlayer = { apply(coach, pose), play(coach, animId, {onDone}), stop(coach), seek(coach, animId, progress0to1) /* paused at that moment */, reducedMotion: boolean }`, built on GSAP 3.13 (global `gsap`). It turns an animation spec into a GSAP timeline: tracks become `fromTo` tweens between keys with the named bezier ease (via a small custom ease from the control points), and swaps become `call`s at their times. It **must not** contain per-animation logic; everything comes from the spec.
- `frames.html?anim=<id>&n=<frames>&theme=light|dark&size=<px>` draws `n` coaches in a row (wrapping into rows), each seeked to `i/(n-1)` of the animation, labelled with its time in ms. With `anim=poses` it shows every pose. With `anim=variants` it shows every variant of every group. Use it to check your work.
- `tools/shot.sh <page-relative-to-lab> "<query>" <out.png> [width] [height]` takes a headless Chrome screenshot (already written; use it). Then look at the PNG with the Read tool.

## 6. Files (one owner each, so parallel agents never overwrite each other)

- `coach.js`, `sheet.html`: the character (Character phase).
- `motion.js`: tokens and poses (Engine phase). Each animation lives in its **own** file `anims/<id>.js`, which registers itself: `BraviloMotion.ANIMS['<id>'] = {…}`.
- `player.js`, `frames.html`: Engine phase.
- `index.html`: the phone lab (Lab phase), built from `lab-src.html` by `node tools/build-lab.mjs` along with `artifact.html` (the same page as a fragment, for claude.ai). One self-contained file that inlines everything except GSAP, which loads from `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js`. Local pages may load `vendor/gsap.min.js`.
- `PORTING.md`: how this moves into the React Native app (Lab phase).
- `out/`: screenshots.

Never change the Bravilo app repo from this lab.
