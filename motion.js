/*
 * Bravilo coach motion data (SPEC §3): tokens, static poses, and the registry the animation files
 * in anims/ fill in. Plain browser JavaScript, no build step. Defines window.BraviloMotion.
 *
 * Everything here is data, so the React Native app can replay it with Reanimated later.
 *
 * A pose:
 *   { eyes, mouth, brows, fx,                       // variant names (missing = coach default)
 *     parts: { <part>: { x, y, rotate, scale, scaleX, scaleY, opacity } } }
 *   - parts: root, body, face, eyes, mouth, brows, handL, handR, fx, shadow (missing = identity)
 *   - x, y in drawing units (the 240 x 240 viewBox), rotate in degrees (clockwise, SVG), all about
 *     BraviloCoach.PIVOTS[part]
 *   - scale is a uniform factor that multiplies scaleX and scaleY (so a `scale` pop and a
 *     `scaleY` blink on the same part compose instead of fighting). Defaults: 0, 0, 0, 1, 1, 1, 1.
 *
 * Directions are the viewer's: `lookLeft` looks toward the left of the screen.
 */
(function () {
  'use strict';

  var TOKENS = {
    ms: { quick: 150, base: 220, slow: 320 },
    ease: {
      standard: [0.4, 0, 0.2, 1],
      out: [0, 0, 0.2, 1],
      in: [0.4, 0, 1, 1],
      spring: [0.34, 1.56, 0.64, 1]
    }
  };

  // Static end poses. Each one is designed as a still that reads at 112 px and at 32 px (small mode
  // hides the brows and every effect but the thinking dots, so every pose also reads from eyes,
  // mouth, hands and body alone).
  var POSES = {
    // Calm, present. Everything at identity: hands rest on the hood's lower corners.
    rest: { eyes: 'rest', mouth: 'none', brows: 'none', fx: 'none', parts: {} },

    // Pleased with you (finish screen; also where welcomeBack and surprised land). Happy arcs, a
    // small smile, both mittens up at the cheeks and turned out, the body a touch taller.
    happy: {
      eyes: 'happy', mouth: 'smile', brows: 'none', fx: 'none',
      parts: {
        body: { scaleY: 1.01 },
        handL: { x: -6, y: -20, rotate: -20 },
        handR: { x: 6, y: -20, rotate: 20 }
      }
    },

    // The big moment: stretched tall and leaning back a touch, the right mitten punched high
    // beside the head, clear of the hood, with the spark moved (fx x, y) to sit around it, an open
    // smile, the other mitten lifted and turned out.
    proud: {
      eyes: 'happy', mouth: 'open', brows: 'none', fx: 'spark',
      parts: {
        body: { scaleX: 0.985, scaleY: 1.025, rotate: -1 },
        face: { x: -1, y: -1 },
        handL: { x: -2, y: -8, rotate: -10 },
        handR: { x: 20, y: -120, rotate: 12 },
        fx: { x: 5, y: 4 }
      }
    },

    // "You've got this", ready, let's go: leaning in a touch toward the viewer's right, warm happy
    // eyes, and both mittens brought forward to the chest as two fists, tipped in toward each
    // other. A silhouette no other pose has: the fists sit low and inside the hood's sides, below
    // the eyes and clear of the mouth area (mittens about x 61-108 and 132-179, y 143-193), and
    // both stay at scale 1 like every other pose.
    encourage: {
      eyes: 'happy', mouth: 'none', brows: 'none', fx: 'none',
      parts: {
        body: { rotate: 2 },
        face: { x: 2, y: 1 },
        handL: { x: 22, y: -12, rotate: 10 },
        handR: { x: -22, y: -12, rotate: -10 }
      }
    },

    // Focused: eyes up toward the dots, one brow raised, the face turned a little up and right,
    // the right mitten at the chin. The thinking loop holds this pose.
    thinking: {
      eyes: 'up', mouth: 'none', brows: 'think', fx: 'dots',
      parts: {
        face: { x: 2, y: -1 },
        handR: { x: -42, y: -20, rotate: -22 }
      }
    },

    // Content, rest is good: eyes closed, the body sunk a little and wider, the face a touch
    // lower, the mittens settled and turned in, small z's.
    sleepy: {
      eyes: 'closed', mouth: 'none', brows: 'none', fx: 'zzz',
      parts: {
        body: { scaleX: 1.012, scaleY: 0.975 },
        face: { y: 2 },
        handL: { y: 3, rotate: 8 },
        handR: { y: 3, rotate: -8 }
      }
    },

    // Attentive and calm, never sad: a slight head tilt, kind worried brows, soft eyes, a tiny
    // soft mouth, and the left mitten lifted gently toward you. Soft eyes are a touch larger (never
    // narrower); the mitten sits far enough out that its thumb clears the face corner and the fold.
    concerned: {
      eyes: 'rest', mouth: 'soft', brows: 'worried', fx: 'none',
      parts: {
        body: { rotate: -2.5 },
        face: { x: -1.5, rotate: -3 },
        eyes: { scale: 1.04 },
        handL: { x: -10, y: -28, rotate: -6 }
      }
    },

    // Glances: the eyes lead, the face follows a few units and the body leans about 2 degrees.
    lookLeft: {
      eyes: 'left', mouth: 'none', brows: 'none', fx: 'none',
      parts: { body: { rotate: -2 }, face: { x: -4 }, handL: { y: -1 }, handR: { y: 1 } }
    },
    lookRight: {
      eyes: 'right', mouth: 'none', brows: 'none', fx: 'none',
      parts: { body: { rotate: 2 }, face: { x: 4 }, handL: { y: 1 }, handR: { y: -1 } }
    },
    // Down: the eyes drop (coach.js EYE_SETS look.down), the features follow 5 units, and both
    // mittens tip in toward the button below.
    lookDown: {
      eyes: 'down', mouth: 'none', brows: 'none', fx: 'none',
      parts: { body: { scaleY: 0.99 }, face: { y: 5 }, handL: { rotate: 6 }, handR: { rotate: -6 } }
    },

    // The chat is open: the right mitten raised and held beside the head, a friendly smile.
    chatOpen: {
      eyes: 'rest', mouth: 'smile', brows: 'none', fx: 'none',
      parts: { handR: { x: 17, y: -80, rotate: 14 } }
    }
  };

  var prev = window.BraviloMotion;
  window.BraviloMotion = {
    TOKENS: TOKENS,
    POSES: POSES,
    // Each animation registers itself from anims/<id>.js: BraviloMotion.ANIMS['<id>'] = {…}.
    ANIMS: (prev && prev.ANIMS) || {}
  };
})();
