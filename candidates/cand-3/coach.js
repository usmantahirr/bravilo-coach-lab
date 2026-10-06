/*
 * Bravilo coach, candidate 3: "iconic".
 * Plain browser JavaScript (no build step, no modules). Defines window.BraviloCoach per SPEC §2.
 *
 * Idea: a bold, soft-peaked hood silhouette (today's Fold "house" shape, rounded), a big cream
 * face window whose lower edge is Fold's front-fold drape (a soft diagonal, higher on the left,
 * with a sage lining peeking out where it turns over), two lime mittens, and chunky eyes that
 * stay readable as tiny shapes.
 *
 * Layering (back to front):
 *   shadow | root > body > [ face > (face fill, eyes, mouth, brows) ] [ hood ring + lining + rim ]
 *                   fx, handL, handR
 * The hood is drawn as a ring (outer silhouette with the face window cut out, even-odd) ON TOP of an
 * oversized face, so the `face` group can shift a few units (a head turn) or scale (a pop) and the
 * hood edge and fold stay put.
 *
 * Conventions:
 *   - handL is the mitten on the viewer's left (x < 120), handR on the viewer's right.
 *   - Hand pivots are the wrists (the cuff's bottom centre), so a rotate is a wave.
 *   - Part groups never carry a transform in the markup; the player owns their `transform`.
 *     Static placement lives on inner, unnamed groups.
 *   - Each eye and mouth variant holds a regular rendition (data-size="b") and a bolder small
 *     rendition (data-size="s"); small mode (size < 44 px) swaps them, hides brows, fx and fine
 *     detail, and thickens the dark-theme rim.
 *   - Extra fx variants `dots1` and `dots2` (one and two dots) let a player pulse the thinking dots
 *     in sequence with plain swaps.
 */
(function () {
  'use strict';

  var VIEWBOX = [0, 0, 240, 240];

  var THEMES = {
    light: {
      '--coach-hood': '#1E2220',
      '--coach-rim': 'transparent',
      '--coach-face': '#FAF7ED',
      '--coach-ink': '#1E2220',
      '--coach-hand': '#C5ED62',
      '--coach-hand-shade': '#94AF7C',
      '--coach-fx': '#94AF7C',
      '--coach-shadow': 'rgba(30,34,32,.10)'
    },
    dark: {
      '--coach-hood': '#2A302C',
      '--coach-rim': 'rgba(201,211,191,.55)',
      '--coach-face': '#FAF7ED',
      '--coach-ink': '#1E2220',
      '--coach-hand': '#C5ED62',
      '--coach-hand-shade': '#657D59',
      '--coach-fx': '#A4C584',
      '--coach-shadow': 'rgba(0,0,0,.35)'
    }
  };

  // ------------------------------------------------------------------ geometry (drawing units)

  // Outer silhouette: a hood with a gentle, rounded peak. Every top curve is strictly convex (no
  // S-bends), the sides are straight and the bottom corners softened (r ~ 22).
  var OUTER =
    'M60 214C47 214 38 205 38 192L38 106C38 88 44 76 56 67C75.2 52.6 110 28 120 28' +
    'C130 28 164.8 52.6 184 67C196 76 202 88 202 106' +
    'L202 192C202 205 193 214 180 214Z';

  // Face window. Top follows the hood (band ~24 at the sides, ~28 at the peak, its apex rounder
  // than the hood's); bottom is the fold: a soft diagonal from high-left to low-right that
  // flattens toward the right like heavy cloth.
  var FOLD = { p0: [163, 170.5], p1: [130, 165], p2: [96, 157], p3: [72, 149] };
  var WINDOW =
    'M62 112C62 97 67 87 77 79C92 67 109 56 120 56C131 56 148 67 163 79' +
    'C173 87 178 97 178 112L178 158C178 167 172 172 ' + pt(FOLD.p0) +
    'C' + pt(FOLD.p1) + ' ' + pt(FOLD.p2) + ' ' + pt(FOLD.p3) + 'C66 147 62 143 62 136Z';

  // Oversized face fill: 10 units outside the window at the top and sides, runs under the fold.
  var FACE =
    'M52 112C52 93 58 81 70 72C88 58.5 110 44 120 44C130 44 152 58.5 170 72' +
    'C182 81 188 93 188 112L188 186C188 192 184 196 178 196L62 196C56 196 52 192 52 186Z';

  var EYE_Y = 110;
  var MOUTH_Y = 141;
  var BROW_Y = 88;

  // Mitten, local coordinates, fingers up, thumb toward +x (the body side for the left hand).
  // Origin is the palm centre; the wrist (cuff bottom) is (0, 21).
  var MITTEN =
    'M0 21C-9.5 21 -17 17 -17 12C-17 -10 -10 -23 0 -23C10 -23 16 -15 16 -5' +
    'C19 -9 26 -11 28.5 -6.5C31 -2 27.5 3 23 6.5C20.5 8.2 17.5 9.5 15.5 11' +
    'C13.5 17 7.5 21 0 21Z';
  // Sage inner shade: a crescent along the mitten's bottom (the cuff side), tapering to nothing.
  var CUFF = 'M-17 12C-17 17 -9.5 21 0 21C7.5 21 13.5 17 15.5 11C11 14 6 15.5 0 15.5C-7 15.5 -13 14.3 -17 12Z';
  var WRIST = [0, 21];
  var HAND_REST = {
    handL: { x: 47, y: 184, rot: -10, flip: false },
    handR: { x: 193, y: 184, rot: -10, flip: true }
  };

  function r2(n) { return Math.round(n * 100) / 100; }

  function placePoint(pt, place) {
    var a = place.rot * Math.PI / 180;
    var x = pt[0] * Math.cos(a) - pt[1] * Math.sin(a);
    var y = pt[0] * Math.sin(a) + pt[1] * Math.cos(a);
    if (place.flip) x = -x;
    return [r2(place.x + x), r2(place.y + y)];
  }
  function placeAttr(place) {
    return 'translate(' + place.x + ' ' + place.y + ')' + (place.flip ? ' scale(-1 1)' : '') +
      ' rotate(' + place.rot + ')';
  }

  // Split the fold cubic at t (de Casteljau) so the lining can follow the exact fold edge.
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function splitCubic(c, t) {
    var a = lerp(c.p0, c.p1, t), b = lerp(c.p1, c.p2, t), d = lerp(c.p2, c.p3, t);
    var ab = lerp(a, b, t), bd = lerp(b, d, t), m = lerp(ab, bd, t);
    return { head: [c.p0, a, ab, m], tail: [m, bd, d, c.p3] };
  }
  function pt(p) { return r2(p[0]) + ' ' + r2(p[1]); }

  // Sage lining: where the fold turns over on the left, a tapering sliver along the fold edge that
  // starts at the hood's outer edge and fades out a third of the way across the face.
  function liningPath() {
    var tail = splitCubic(FOLD, 0.6).tail;      // from mid-face (x ~ 103) to the window corner
    var m = tail[0];
    var slope = (FOLD.p3[1] - FOLD.p2[1]) / (FOLD.p3[0] - FOLD.p2[0]); // fold direction at its left end
    var edgeX = 38.6;
    var edgeY = FOLD.p3[1] + (edgeX - FOLD.p3[0]) * slope;
    return 'M' + pt(m) +
      'C' + pt(tail[1]) + ' ' + pt(tail[2]) + ' ' + pt(tail[3]) +
      'L' + r2(edgeX) + ' ' + r2(edgeY) +
      'L' + r2(edgeX) + ' ' + r2(edgeY - 10) +
      'C' + r2(edgeX + 22) + ' ' + r2(edgeY - 4) + ' ' + r2(m[0] - 30) + ' ' + r2(m[1] - 9) + ' ' + pt(m) + 'Z';
  }

  // ------------------------------------------------------------------ pivots and variants

  var PIVOTS = {
    root: [120, 214],
    body: [120, 214],
    face: [120, 112],
    eyes: [120, EYE_Y],
    mouth: [120, MOUTH_Y],
    brows: [120, BROW_Y],
    handL: placePoint(WRIST, HAND_REST.handL),
    handR: placePoint(WRIST, HAND_REST.handR),
    fx: [200, 40],
    shadow: [120, 218]
  };

  var VARIANTS = {
    eyes: ['rest', 'happy', 'wide', 'closed', 'up', 'left', 'right', 'down'],
    mouth: ['none', 'smile', 'open', 'o', 'soft'],
    brows: ['none', 'raised', 'worried', 'think'],
    fx: ['none', 'dots', 'zzz', 'spark', 'dots1', 'dots2']
  };
  var DEFAULTS = { eyes: 'rest', mouth: 'none', brows: 'none', fx: 'none' };

  // ------------------------------------------------------------------ style helpers

  function fill(v) { return ' style="fill:var(' + v + ')"'; }
  function stroke(v, w) {
    return ' style="fill:none;stroke:var(' + v + ');stroke-width:' + w +
      ';stroke-linecap:round;stroke-linejoin:round"';
  }
  function path(d, style) { return '<path d="' + d + '"' + style + '/>'; }

  // ------------------------------------------------------------------ eyes

  // One eye language: every eye is a single rounded stroke (or a dot of the same family),
  // the same weight across variants. p sets the scale of the set.
  function eyeSet(p) {
    var ink = function (w) { return stroke('--coach-ink', w); };
    var L = 120 - p.dx, R = 120 + p.dx, y = EYE_Y;
    function pill(x, cy, len) { return path('M' + r2(x) + ' ' + r2(cy - len / 2) + 'L' + r2(x) + ' ' + r2(cy + len / 2), ink(p.w)); }
    function arc(x, cy, a, h, up) {
      var r = r2((a * a + h * h) / (2 * h));
      var yEnd = up ? cy + h / 2 : cy - h / 2;
      return path('M' + r2(x - a) + ' ' + r2(yEnd) + 'A' + r + ' ' + r + ' 0 0 ' + (up ? 1 : 0) + ' ' + r2(x + a) + ' ' + r2(yEnd), ink(p.w));
    }
    function dot(x, cy, rad) { return '<circle cx="' + r2(x) + '" cy="' + r2(cy) + '" r="' + r2(rad) + '"' + fill('--coach-ink') + '/>'; }
    function look(s, len) { return pill(L + s[0], y + s[1], len) + pill(R + s[0], y + s[1], len); }
    return {
      rest: pill(L, y, p.len) + pill(R, y, p.len),
      happy: arc(L, y, p.a, p.h, true) + arc(R, y, p.a, p.h, true),
      wide: dot(L, y, p.wideR) + dot(R, y, p.wideR),
      closed: arc(L, y + p.closedDy, p.a, p.closedH, false) + arc(R, y + p.closedDy, p.a, p.closedH, false),
      up: look(p.up, p.len * 0.8),
      left: look(p.left, p.len),
      right: look(p.right, p.len),
      down: look(p.down, p.len * 0.7)
    };
  }

  var EYES_B = eyeSet({
    dx: 24, w: 12, len: 12, a: 11, h: 9, closedDy: 2, closedH: 7, wideR: 10.5,
    up: [6, -8], left: [-9, 1], right: [9, 1], down: [-1, 8]
  });
  var EYES_S = eyeSet({
    dx: 27, w: 20, len: 13, a: 12, h: 10, closedDy: 1, closedH: 8, wideR: 15.5,
    up: [6, -8], left: [-9, 1], right: [9, 1], down: [-1, 7]
  });

  // ------------------------------------------------------------------ mouth

  function mouthSet(k, w) {
    // k scales the mouth about its pivot, w is the line weight
    function P(x, y) { return r2(120 + (x - 120) * k) + ' ' + r2(MOUTH_Y + (y - MOUTH_Y) * k); }
    var a = 10, h = 5.5, r = r2(((a * a + h * h) / (2 * h)) * k);
    return {
      none: '',
      smile: path('M' + P(110, 138) + 'A' + r + ' ' + r + ' 0 0 0 ' + P(130, 138), stroke('--coach-ink', w)),
      open: path('M' + P(107.5, 134) + 'Q' + P(120, 136.5) + ' ' + P(132.5, 134) +
        'C' + P(132.5, 145.5) + ' ' + P(127, 151) + ' ' + P(120, 151) +
        'C' + P(113, 151) + ' ' + P(107.5, 145.5) + ' ' + P(107.5, 134) + 'Z',
        ' style="fill:var(--coach-ink);stroke:var(--coach-ink);stroke-width:' + r2(3 * k) + ';stroke-linejoin:round"'),
      o: '<ellipse cx="120" cy="' + P(120, 142).split(' ')[1] + '" rx="' + r2(6 * k) + '" ry="' + r2(7.5 * k) + '"' + fill('--coach-ink') + '/>',
      soft: path('M' + P(114, 141.5) + 'Q' + P(120, 140) + ' ' + P(126, 141.5), stroke('--coach-ink', r2(w * 0.85)))
    };
  }
  var MOUTH_B = mouthSet(1, 7.5);
  var MOUTH_S = mouthSet(1.3, 14);

  // ------------------------------------------------------------------ brows

  var BW = 6.5;
  var BROWS = {
    none: '',
    raised: path('M86 84Q96 77.5 106 83.5', stroke('--coach-ink', BW)) +
      path('M134 83.5Q144 77.5 154 84', stroke('--coach-ink', BW)),
    worried: path('M86 90.5Q95 88.5 105 84', stroke('--coach-ink', BW)) +
      path('M135 84Q145 88.5 154 90.5', stroke('--coach-ink', BW)),
    think: path('M88 85Q96 82.5 104 84', stroke('--coach-ink', BW)) +
      path('M132 81Q141 74.5 150 79', stroke('--coach-ink', BW))
  };

  // ------------------------------------------------------------------ fx

  function circle(x, y, rad) { return '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '"' + fill('--coach-fx') + '/>'; }
  function zee(x, y, s) {
    return path('M' + x + ' ' + y + 'L' + r2(x + s) + ' ' + y + 'L' + x + ' ' + r2(y + s) + 'L' + r2(x + s) + ' ' + r2(y + s),
      stroke('--coach-fx', r2(Math.max(3.6, s * 0.3))));
  }
  var DOT1 = circle(187, 42, 4.5), DOT2 = circle(202, 29, 5.5), DOT3 = circle(219, 15, 6.5);
  // Spark: three short strokes radiating from around the raised right mitten (centre ~ (202, 46)).
  function ray(cx, cy, deg, r0, r1) {
    var a = deg * Math.PI / 180;
    return path('M' + r2(cx + Math.cos(a) * r0) + ' ' + r2(cy + Math.sin(a) * r0) +
      'L' + r2(cx + Math.cos(a) * r1) + ' ' + r2(cy + Math.sin(a) * r1), stroke('--coach-hand', 5));
  }
  var FX = {
    none: '',
    dots: DOT1 + DOT2 + DOT3,
    dots1: DOT1,
    dots2: DOT1 + DOT2,
    zzz: zee(170, 52, 11) + zee(189, 33, 14) + zee(210, 11, 17),
    spark: ray(202, 46, -150, 29, 38) + ray(202, 46, -95, 28, 37) + ray(202, 46, -38, 29, 38)
  };

  // ------------------------------------------------------------------ markup

  function variantGroup(name, b, s, visible) {
    var inner = s === undefined ? b : '<g data-size="b">' + b + '</g><g data-size="s">' + s + '</g>';
    return '<g data-variant="' + name + '"' + (visible ? '' : ' style="display:none"') + '>' + inner + '</g>';
  }
  function partVariants(group, b, s) {
    return VARIANTS[group].map(function (n) {
      return variantGroup(n, b[n], s ? s[n] : undefined, n === DEFAULTS[group]);
    }).join('');
  }
  function hand(name) {
    return '<g data-part="' + name + '"><g transform="' + placeAttr(HAND_REST[name]) + '">' +
      path(MITTEN, fill('--coach-hand')) +
      '<g data-detail="1">' + path(CUFF, fill('--coach-hand-shade')) + '</g>' +
      '</g></g>';
  }

  function markup() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VIEWBOX.join(' ') + '" role="img" aria-label="Bravilo coach">' +
      '<g data-part="shadow"><ellipse cx="120" cy="218" rx="66" ry="6.5"' + fill('--coach-shadow') + '/></g>' +
      '<g data-part="root">' +
        '<g data-part="body">' +
          '<g data-part="face">' +
            path(FACE, fill('--coach-face')) +
            '<g data-part="eyes">' + partVariants('eyes', EYES_B, EYES_S) + '</g>' +
            '<g data-part="mouth">' + partVariants('mouth', MOUTH_B, MOUTH_S) + '</g>' +
            '<g data-part="brows">' + partVariants('brows', BROWS) + '</g>' +
          '</g>' +
          '<path d="' + OUTER + WINDOW + '" style="fill:var(--coach-hood);fill-rule:evenodd"/>' +
          '<g data-detail="1">' + path(liningPath(), fill('--coach-hand-shade')) + '</g>' +
          '<path data-rim="1" d="' + OUTER + '" style="fill:none;stroke:var(--coach-rim);stroke-width:2.5;stroke-linejoin:round"/>' +
        '</g>' +
        '<g data-part="fx">' + partVariants('fx', FX) + '</g>' +
        hand('handL') +
        hand('handR') +
      '</g>' +
    '</svg>';
  }

  // ------------------------------------------------------------------ instance

  function create(container, opts) {
    opts = opts || {};
    var holder = document.createElement('div');
    holder.innerHTML = markup();
    var svg = holder.firstChild;
    svg.style.display = 'block';
    svg.style.overflow = 'hidden';
    container.appendChild(svg);

    var parts = {};
    ['root', 'body', 'face', 'eyes', 'mouth', 'brows', 'handL', 'handR', 'fx', 'shadow'].forEach(function (n) {
      parts[n] = svg.querySelector('[data-part="' + n + '"]');
    });

    var coach = {
      svg: svg,
      parts: parts,
      small: false,
      theme: 'light',
      size: 112,
      variants: { eyes: 'rest', mouth: 'none', brows: 'none', fx: 'none' },

      setVariant: function (group, name) {
        var g = parts[group];
        if (!g || VARIANTS[group].indexOf(name) < 0) return coach;
        var kids = g.children;
        for (var i = 0; i < kids.length; i++) {
          kids[i].style.display = kids[i].getAttribute('data-variant') === name ? '' : 'none';
        }
        coach.variants[group] = name;
        return coach;
      },

      setTheme: function (theme) {
        var t = THEMES[theme] ? theme : 'light';
        var tokens = THEMES[t];
        Object.keys(tokens).forEach(function (k) { svg.style.setProperty(k, tokens[k]); });
        coach.theme = t;
        return coach;
      },

      setSize: function (px) {
        var s = Math.max(1, Number(px) || 112);
        svg.style.width = s + 'px';
        svg.style.height = s + 'px';
        svg.setAttribute('width', s);
        svg.setAttribute('height', s);
        coach.size = s;
        coach.small = s < 44;
        var small = coach.small;
        // regular vs bold small renditions of eyes and mouth
        var sized = svg.querySelectorAll('[data-size]');
        for (var i = 0; i < sized.length; i++) {
          var isSmall = sized[i].getAttribute('data-size') === 's';
          sized[i].style.display = isSmall === small ? '' : 'none';
        }
        // fine detail (cuffs, lining) off when small
        var det = svg.querySelectorAll('[data-detail]');
        for (var j = 0; j < det.length; j++) det[j].style.display = small ? 'none' : '';
        parts.brows.style.display = small ? 'none' : '';
        parts.fx.style.display = small ? 'none' : '';
        // the dark-theme rim needs more weight to survive at icon sizes
        svg.querySelector('[data-rim]').style.strokeWidth = small ? '7' : (s < 72 ? '4' : (s < 150 ? '2.5' : '2'));
        return coach;
      }
    };

    coach.setTheme(opts.theme || 'light');
    coach.setSize(opts.size || 112);
    return coach;
  }

  window.BraviloCoach = {
    VIEWBOX: VIEWBOX,
    PIVOTS: PIVOTS,
    VARIANTS: VARIANTS,
    THEMES: THEMES,
    create: create
  };
})();
