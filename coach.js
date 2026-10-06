/*
 * Bravilo coach "Fold" (D142: Fold evolved, with the hoodie buddy's warmth). Final character.
 * Plain browser JavaScript, no build step, no modules. Defines window.BraviloCoach (SPEC §2).
 *
 * Built from candidate 1 (soft rounded gable hood, floating mittens, horizontal-pill eyes, clean
 * absolute paths, headroom) with these grafts from candidate 3 and the judges:
 *   - Fold's front fold is back: the face window's lower edge is a soft diagonal, higher on the
 *     viewer's left and flattening to the right, and a thin tapering sage lining shows where the
 *     fold turns over at the hood's left edge.
 *   - A bigger cream face window (thinner hood band at the sides and top, same rounded peak).
 *   - One eye language: every eye mark is one round-capped ink stroke of the same weight (or a
 *     dot of the same family for `wide`); look eyes are the rest pill moved, never reshaped.
 *   - Hood ring layering: the hood is a ring (outer silhouette with the window cut out) drawn ON
 *     TOP of an oversized cream face fill. The fill is static in `body`, and the `face` group holds
 *     only the features, so a face turn, tilt or pop (any translate, rotate up to 25 degrees or
 *     scale up to 1.2 about PIVOTS.face) moves the features inside a fixed, always-cream window and
 *     can never open a gap or show cream outside the hood (contract-test.html checks this).
 *   - Hand pivots at the wrists, so a rotate swings the mitten like a wave.
 *   - Fine detail (mitten shade, fold lining) is tagged data-detail and hidden in small mode.
 *   - Small mode (below 44 px) draws bold eye and mouth sets, hides the brows, and keeps only one
 *     effect: a bigger set of thinking dots (zzz and spark vanish).
 *   - The dark-theme rim steps with size (2 / 2.5 / 4 / 7 units).
 *   - setVariant, setTheme and setSize return the coach (chainable).
 *
 * Layering (back to front):
 *   shadow | root > body > face fill, [ face > (eyes, mouth, brows) ], hood ring, lining, rim
 *                   handL, handR, fx
 *
 * Portability (react-native-svg): every shape is a <path> with absolute M / L / C / Q / Z only
 * (no arcs, circles, ellipses, text, filters, masks, gradients or clipPaths). No element carries
 * a static transform; the player owns the `transform` of the ten data-part groups and transforms
 * them around PIVOTS. The hood ring uses fill-rule evenodd AND opposite winding for the window,
 * so it cuts the hole under either fill rule. Colours come only from CSS variables on the <svg>.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VIEWBOX = [0, 0, 240, 240];
  var SMALL_BELOW = 44; // CSS px: below this the coach draws its small, bold form

  // Dark-theme rim weight by rendered size (drawing units): [min px, width]. Thicker as it shrinks.
  var RIM_STEPS = [[150, 2], [72, 2.5], [44, 4], [0, 7]];

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

  // ------------------------------------------------------------------ number and path helpers

  function r2(v) { return Math.round(v * 100) / 100; }
  function P(p) { return r2(p[0]) + ' ' + r2(p[1]); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k]; }
  function unit(a) { var n = Math.sqrt(a[0] * a[0] + a[1] * a[1]); return [a[0] / n, a[1] / n]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  // Cubic Bezier helpers (c = [p0, p1, p2, p3]).
  function bez(c, t) {
    var u = 1 - t;
    return [
      u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
      u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]
    ];
  }
  function bezTangent(c, t) {
    var u = 1 - t;
    return unit([
      3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0]),
      3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1])
    ]);
  }
  function split(c, t) { // de Casteljau
    var a = lerp(c[0], c[1], t), b = lerp(c[1], c[2], t), d = lerp(c[2], c[3], t);
    var ab = lerp(a, b, t), bd = lerp(b, d, t), m = lerp(ab, bd, t);
    return [[c[0], a, ab, m], [m, bd, d, c[3]]];
  }
  function segment(c, t0, t1) { // the piece of c between t0 and t1
    var right = split(c, t0)[1];
    return split(right, (t1 - t0) / (1 - t0))[0];
  }
  function tAtX(c, x) { // x is monotonic along the curves this is used on
    var lo = 0, hi = 1;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      if (bez(c, mid)[0] < x) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Rounded corner at I between an incoming direction (unit vector a, from I back toward where the
  // path came from) and an outgoing one (unit vector b). Returns [T1, c1, c2, T2], a circular-ish
  // cubic with tangent length d.
  function corner(I, a, b, d) {
    var cosA = a[0] * b[0] + a[1] * b[1];
    var turn = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosA)));
    var k = (4 / 3) * Math.tan(turn / 4) / Math.tan(turn / 2);
    return [add(I, mul(a, d)), add(I, mul(a, d * (1 - k))), add(I, mul(b, d * (1 - k))), add(I, mul(b, d))];
  }
  function C(c1, c2, p) { return ' C ' + P(c1) + ', ' + P(c2) + ', ' + P(p); }
  function L(p) { return ' L ' + P(p); }

  // A capsule (pill) or circle as a closed cubic path.
  function pill(cx, cy, w, h) {
    var r = Math.min(w, h) / 2, k = r * 0.5523;
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    var hx = w / 2 - r, hy = h / 2 - r;
    return 'M ' + P([cx - hx, y0]) + (hx > 0 ? L([cx + hx, y0]) : '') +
      C([cx + hx + k, y0], [x1, cy - hy - k], [x1, cy - hy]) + (hy > 0 ? L([x1, cy + hy]) : '') +
      C([x1, cy + hy + k], [cx + hx + k, y1], [cx + hx, y1]) + (hx > 0 ? L([cx - hx, y1]) : '') +
      C([cx - hx - k, y1], [x0, cy + hy + k], [x0, cy + hy]) + (hy > 0 ? L([x0, cy - hy]) : '') +
      C([x0, cy - hy - k], [cx - hx - k, y0], [cx - hx, y0]) + ' Z';
  }
  // A rotated ellipse as four cubics.
  function ellipse(cx, cy, rx, ry, deg) {
    var a = (deg || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), k = 0.5523;
    function Q(u, v) { return [cx + u * ca - v * sa, cy + u * sa + v * ca]; }
    return 'M ' + P(Q(rx, 0)) +
      C(Q(rx, k * ry), Q(k * rx, ry), Q(0, ry)) + C(Q(-k * rx, ry), Q(-rx, k * ry), Q(-rx, 0)) +
      C(Q(-rx, -k * ry), Q(-k * rx, -ry), Q(0, -ry)) + C(Q(k * rx, -ry), Q(rx, -k * ry), Q(rx, 0)) + ' Z';
  }
  function mirrorX(d) { // mirror an absolute path across x = 120
    return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, function (m, x, y) { return r2(240 - parseFloat(x)) + ' ' + y; });
  }

  // ------------------------------------------------------------------ hood and face geometry

  // Outer silhouette (clockwise): candidate 1's soft gable. Straight shallow slopes (about 1:2), a
  // broad rounded apex (never a point), round shoulders, straight sides and soft bottom corners.
  var OUTER =
    'M 43 177.3 L 43 92.7 C 43 75.6, 53.7 63.3, 66.5 56.8 L 104 37.7 ' +
    'C 113 33.1, 127 33.1, 136 37.7 L 173.5 56.8 C 186.3 63.3, 197 75.6, 197 92.7 ' +
    'L 197 177.3 C 197 192, 185 204, 170.3 204 L 69.7 204 C 55 204, 43 192, 43 177.3 Z';

  // Face window. Roof parallel to the hood slopes (band ~23 at the top, 17.5 at the sides); the
  // lower edge is the fold: one cubic that starts at the hood's left OUTER edge (where the lining
  // shows) and drapes down to the right, flattening as it goes.
  var WALL_L = 60.5, WALL_R = 179.5;
  var SLOPE = 0.509, ROOF_Y0 = 55.6;            // window roof: y = ROOF_Y0 + SLOPE * |x - 120|
  var FOLD = [[43, 130], [80, 145.5], [128, 165.5], [181, 169.5]];

  function windowPath(grow) {
    // grow > 0 expands the shape (used for the oversized face fill under the ring).
    var g = grow || 0, wl = WALL_L - g, wr = WALL_R + g, y0 = ROOF_Y0 - g * 1.122;
    var up = unit([1, -SLOPE]), dnL = unit([-1, SLOPE]);
    var apex = corner([120, y0], dnL, [-dnL[0], dnL[1]], 11.2);              // round soft apex
    var shL = corner([wl, y0 + SLOPE * (120 - wl)], up, [0, 1], 17);          // left shoulder
    var shR = corner([wr, y0 + SLOPE * (wr - 120)], [0, 1], [-up[0], up[1]], 17); // right shoulder
    var d = 'M ' + P(apex[0]) + L(shL[0]) + C(shL[1], shL[2], shL[3]);
    if (g > 0) {
      // the fill's bottom is hidden under the hood: a plain rounded rectangle bottom
      var yb = 192;
      d += L([wl, yb - 8]) + C([wl, yb - 3.6], [wl + 3.6, yb], [wl + 8, yb]) + L([wr - 8, yb]) +
        C([wr - 3.6, yb], [wr, yb - 3.6], [wr, yb - 8]);
    } else {
      // bottom-left: the wall meets the fold (small rounding)
      var tI = tAtX(FOLD, wl), I = bez(FOLD, tI), tS = tAtX(FOLD, wl + 4.6);
      var S = bez(FOLD, tS), uS = bezTangent(FOLD, tS);
      d += L([wl, I[1] - 5]) + C([wl, I[1] - 2], sub(S, mul(uS, 2.8)), S);
      // the fold across the face, up to where the bottom-right rounding starts
      var tE = tAtX(FOLD, wr - 12), seg = segment(FOLD, tS, tE), Ep = seg[3];
      d += C(seg[1], seg[2], Ep);
      // bottom-right rounding into the right wall
      var uE = bezTangent(FOLD, tE);
      var Ib = add(Ep, mul(uE, (wr - Ep[0]) / uE[0]));   // tangent at Ep meets the right wall
      var br = corner(Ib, mul(uE, -1), [0, -1], Math.sqrt(Math.pow(Ib[0] - Ep[0], 2) + Math.pow(Ib[1] - Ep[1], 2)));
      d += C(br[1], br[2], br[3]);
    }
    d += L(shR[0]) + C(shR[1], shR[2], shR[3]) + L(apex[3]) + C(apex[2], apex[1], apex[0]) + ' Z';
    return d;
  }
  var WINDOW = windowPath(0);   // counter-clockwise, the hole in the hood ring
  var FACE_FILL = windowPath(8); // 8 units larger all round, its edges hidden under the ring

  // Sage lining where the fold turns over: a sliver along the fold from the hood's left outer edge
  // (9 units thick there) tapering to nothing about a third of the way across the face.
  function liningPath() {
    var tM = tAtX(FOLD, 101), s = segment(FOLD, 0, tM), E = s[0], Mp = s[3], th = 9;
    return 'M ' + P(E) + C(s[1], s[2], Mp) +
      C(sub(s[2], [0, th / 3]), sub(s[1], [0, th * 2 / 3]), sub(E, [0, th])) + ' Z';
  }
  var LINING = liningPath();

  // ------------------------------------------------------------------ features (drawing units)

  var EYE_Y = 112, MOUTH_Y = 138.5, BROW_Y = 92.5;

  // One eye language. Every mark is one round-capped ink stroke of weight w (or, for `wide`, a dot
  // of the same family). Look eyes are the rest pill moved, never reshaped.
  // The look offsets are big enough to read as a direction at their sizes: down drops 11 units
  // (9 in the small set), so lookDown's eyes still clear the fold by about 15 units; the small set's
  // up rises 9, about 1.2 px at 32 px, and stays well under the window roof.
  var EYE_SETS = {
    regular: { dx: 25, w: 13, half: 3.25, arcHalf: 10.75, rise: 8.75, closedDrop: 6, wideR: 9,
      look: { up: [5, -7], left: [-8, 1], right: [8, 1], down: [0, 11] } },
    small: { dx: 28, w: 20, half: 4, arcHalf: 12.5, rise: 10, closedDrop: 6.5, wideR: 13,
      look: { up: [6, -9], left: [-7, 1], right: [7, 1], down: [0, 9] } }
  };

  function eyeMarks(name, set) {
    var E = EYE_SETS[set], out = [];
    [120 - E.dx, 120 + E.dx].forEach(function (x) {
      var y = EYE_Y, a = E.arcHalf;
      function line(p0, p1) { out.push({ d: 'M ' + P(p0) + L(p1), stroke: E.w }); }
      function arc(p0, c1, c2, p1) { out.push({ d: 'M ' + P(p0) + C(c1, c2, p1), stroke: E.w }); }
      var o = E.look[name];
      if (name === 'rest' || o) {
        var s = o || [0, 0];
        line([x - E.half + s[0], y + s[1]], [x + E.half + s[0], y + s[1]]);
      } else if (name === 'happy') { // upward arcs, apex at y - rise/2
        var yb = y + E.rise / 2, yc = (y - E.rise / 2 - 0.25 * yb) / 0.75;
        arc([x - a, yb], [x - a * 0.62, yc], [x + a * 0.62, yc], [x + a, yb]);
      } else if (name === 'closed') { // soft downward curves
        var yt = y - 1, ycl = yt + E.closedDrop / 0.75;
        arc([x - a, yt], [x - a * 0.65, ycl], [x + a * 0.65, ycl], [x + a, yt]);
      } else if (name === 'wide') { // rounder, open
        out.push({ d: ellipse(x, y, E.wideR, E.wideR * 1.04), fill: true });
      }
    });
    return out;
  }

  // Mouth, a regular set and a bolder, larger small set. Only in big moments; `soft` is the tiny
  // upturned curve for concern (kind, never a frown). Strokes use the face's second pen (7 units,
  // like the brows; the eyes are the first, 13). In the small set `soft` is nearly flat: without the
  // worried brows (hidden below 44 px) an upturned curve would read as a pleased smile.
  function mouthMarks(name, set) {
    var sm = set === 'small', k = sm ? 1.35 : 1, cx = 120, cy = MOUTH_Y;
    function X(u) { return cx + u * k; }
    function Y(v) { return cy + v * k; }
    function Pt(u, v) { return [X(u), Y(v)]; }
    if (name === 'smile') {
      return [{ d: 'M ' + P(Pt(-9, -1.5)) + C(Pt(-6.5, 6.5), Pt(6.5, 6.5), Pt(9, -1.5)), stroke: sm ? 11 : 7 }];
    } else if (name === 'open') {
      return [{ d: 'M ' + P(Pt(-11.5, -4)) + ' Q ' + P(Pt(0, -1.5)) + ', ' + P(Pt(11.5, -4)) +
        C(Pt(11.5, 7), Pt(6.5, 12.5), Pt(0, 12.5)) + C(Pt(-6.5, 12.5), Pt(-11.5, 7), Pt(-11.5, -4)) + ' Z',
        fill: true, soften: sm ? 3.5 : 2.5 }];
    } else if (name === 'o') {
      return [{ d: ellipse(X(0), Y(3), 5.6 * k, 6.6 * k), fill: true }];
    } else if (name === 'soft') {
      return [{ d: 'M ' + P(Pt(-6, 1.5)) + ' Q ' + P(Pt(0, sm ? 2.5 : 5)) + ', ' + P(Pt(6, 1.5)), stroke: sm ? 9 : 7 }];
    }
    return [];
  }

  // Brows (hidden in small mode). Gentle and kind: worried lifts the inner ends about 4 units with
  // a slight upward bulge; think raises only the brow over the eye that looks up. Drawn with the
  // face's second pen (7 units, like the smile and the soft mouth), so the face has two weights.
  var BROW_W = 7;
  var BROWS = {
    none: [],
    raised: (function () { var l = 'M 84.5 94 Q 95 85.5 105.5 90.5'; return [l, mirrorX(l)]; })(),
    worried: (function () { var l = 'M 86 96.5 Q 95.5 93.2 104.5 92.5'; return [l, mirrorX(l)]; })(),
    think: ['M 136.5 91.5 Q 147 82.5 158 88.5']
  };

  // Effects, all in the top-right corner beside the head (the fx pivot is the dots' centre).
  // The thinking dots have a small set too: below 44 px they are the only effect still drawn
  // (thinking plays at 32 px while the chat waits for a reply), so they are bigger (radius 8 to 9,
  // about 2 px across at 32 px), spaced about 1 px apart there and kept 7 units clear of the hood
  // so the dark-theme rim never touches them.
  var DOTS = [[195, 57, 4], [207, 44, 5], [220, 30, 6]];
  var DOTS_SMALL = [[196, 56, 8], [213, 39, 8.5], [229.5, 22, 9]];
  function zee(x, y, s) {
    return 'M ' + P([x, y]) + L([x + s, y]) + L([x, y + s]) + L([x + s, y + s]);
  }
  // The spark: three short rays fanned around SPARK_C, from radius SPARK_R[0] to SPARK_R[1].
  var SPARK_C = [198.5, 49], SPARK_R = [30, 37.5];
  function spark() {
    return [-150, -92, -34].map(function (deg) {
      var a = deg * Math.PI / 180;
      return 'M ' + P([SPARK_C[0] + SPARK_R[0] * Math.cos(a), SPARK_C[1] + SPARK_R[0] * Math.sin(a)]) +
        L([SPARK_C[0] + SPARK_R[1] * Math.cos(a), SPARK_C[1] + SPARK_R[1] * Math.sin(a)]);
    });
  }

  // Mittens: candidate 1's mitten (fingers up, thumb up and inward), placed in absolute units.
  // Palm centres at rest and the scale of the local drawing.
  var MITT = { k: 1.2412, L: [55.8, 180.5], R: [184.2, 180.5] };
  function mittPaths(side) { // side -1: handL (viewer's left), 1: handR
    var c = side < 0 ? MITT.L : MITT.R, k = MITT.k;
    function T(d) {
      return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, function (m, x, y) {
        return r2(c[0] + side * k * parseFloat(x)) + ' ' + r2(c[1] + k * parseFloat(y));
      });
    }
    return {
      thumb: T(ellipse(-12.5, -6.5, 7, 9.6, -24)),
      main: T('M 1.5 -21 C 10.5 -21, 16.5 -13.5, 16.5 -1 C 16.5 11.5, 10.5 19.5, 1 19.5 ' +
        'C -8 19.5, -14.5 13, -14.5 3 C -14.5 -11, -9 -21, 1.5 -21 Z'),
      shade: T('M 16.5 -1 C 16.5 11.5, 10.5 19.5, 1 19.5 C 7 15, 12 8.5, 16.5 -1 Z')
    };
  }
  // Wrist: the bottom centre of the mitten, so a rotate swings the fingertips (a wave).
  function wrist(side) { var c = side < 0 ? MITT.L : MITT.R; return [r2(c[0] + side * MITT.k * 1), r2(c[1] + MITT.k * 17.5)]; }

  // ------------------------------------------------------------------ pivots and variants

  var PIVOTS = {
    root: [120, 204],    // bottom centre, where it stands
    body: [120, 204],    // bottom centre: squash, stretch, lean and dip
    face: [120, 113],    // centre of the face window (turns and pops)
    eyes: [120, EYE_Y],  // the eye line (blink = scaleY here), same for both eye sets
    mouth: [120, MOUTH_Y + 3],
    brows: [120, BROW_Y],
    handL: wrist(-1),    // wrists, so a rotate is a wave
    handR: wrist(1),
    fx: [208.5, 42.5],   // centre of the thinking dots (a dots pulse scales in place)
    shadow: [120, 210]   // centre of the ground ellipse
  };

  // Centres of each fx drawing, for players that want a per-variant origin.
  var FX_CENTERS = { dots: [208.5, 42.5], zzz: [206.75, 36.25], spark: [197.81, 22.76] };

  var VARIANTS = {
    eyes: ['rest', 'happy', 'wide', 'closed', 'up', 'left', 'right', 'down'],
    mouth: ['none', 'smile', 'open', 'o', 'soft'],
    brows: ['none', 'raised', 'worried', 'think'],
    // dots1 and dots2 are extras (one, then two dots) so a loop can build the dots in sequence.
    fx: ['none', 'dots', 'zzz', 'spark', 'dots1', 'dots2']
  };
  var DEFAULTS = { eyes: 'rest', mouth: 'none', brows: 'none', fx: 'none' };

  // ------------------------------------------------------------------ DOM helpers

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) if (Object.prototype.hasOwnProperty.call(attrs, a)) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fillStyle(token) { return 'fill:var(' + token + ')'; }
  function strokeStyle(token, w) {
    return 'fill:none;stroke:var(' + token + ');stroke-width:' + w + ';stroke-linecap:round;stroke-linejoin:round';
  }
  function drawMarks(parent, marks) {
    marks.forEach(function (m) {
      var st = m.fill
        ? (m.soften ? 'fill:var(--coach-ink);stroke:var(--coach-ink);stroke-width:' + m.soften + ';stroke-linejoin:round' : fillStyle('--coach-ink'))
        : strokeStyle('--coach-ink', m.stroke);
      mk('path', { d: m.d, style: st }, parent);
    });
  }
  function addVariants(partGroup, group, draw) {
    VARIANTS[group].forEach(function (name) {
      var v = mk('g', { 'data-variant': name }, partGroup);
      draw(v, name);
      if (name !== DEFAULTS[group]) v.setAttribute('display', 'none');
    });
  }

  // ------------------------------------------------------------------ create

  function create(container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.querySelector(container);
    var svg = mk('svg', { xmlns: NS, viewBox: VIEWBOX.join(' '), role: 'img', 'aria-label': 'Bravilo coach' });
    svg.style.display = 'block';
    svg.style.overflow = 'hidden';

    var parts = {};
    parts.shadow = mk('g', { 'data-part': 'shadow' }, svg);
    mk('path', { d: ellipse(120, 210, 62, 6), style: fillStyle('--coach-shadow') }, parts.shadow);

    parts.root = mk('g', { 'data-part': 'root' }, svg);
    parts.body = mk('g', { 'data-part': 'body' }, parts.root);

    // The cream face is static in body; the face group carries only the features (see the header).
    mk('path', { d: FACE_FILL, 'data-face-fill': '1', style: fillStyle('--coach-face') }, parts.body);
    parts.face = mk('g', { 'data-part': 'face' }, parts.body);
    parts.eyes = mk('g', { 'data-part': 'eyes' }, parts.face);
    addVariants(parts.eyes, 'eyes', function (v, name) {
      drawMarks(mk('g', { 'data-set': 'regular' }, v), eyeMarks(name, 'regular'));
      drawMarks(mk('g', { 'data-set': 'small' }, v), eyeMarks(name, 'small'));
    });
    parts.mouth = mk('g', { 'data-part': 'mouth' }, parts.face);
    addVariants(parts.mouth, 'mouth', function (v, name) {
      drawMarks(mk('g', { 'data-set': 'regular' }, v), mouthMarks(name, 'regular'));
      drawMarks(mk('g', { 'data-set': 'small' }, v), mouthMarks(name, 'small'));
    });
    parts.brows = mk('g', { 'data-part': 'brows' }, parts.face);
    addVariants(parts.brows, 'brows', function (v, name) {
      BROWS[name].forEach(function (d) { mk('path', { d: d, style: strokeStyle('--coach-ink', BROW_W) }, v); });
    });

    // The hood ring sits over the face fill: features move inside a fixed window.
    mk('path', { d: OUTER + ' ' + WINDOW, 'data-hood': '1', style: 'fill:var(--coach-hood);fill-rule:evenodd' }, parts.body);
    var lining = mk('g', { 'data-detail': '1' }, parts.body);
    mk('path', { d: LINING, style: fillStyle('--coach-hand-shade') }, lining);
    var rim = mk('path', { d: OUTER, 'data-rim': '1', style: 'fill:none;stroke:var(--coach-rim);stroke-width:2.5;stroke-linejoin:round' }, parts.body);

    ['handL', 'handR'].forEach(function (name) {
      var m = mittPaths(name === 'handL' ? -1 : 1);
      parts[name] = mk('g', { 'data-part': name }, parts.root);
      mk('path', { d: m.thumb, style: fillStyle('--coach-hand') }, parts[name]);
      mk('path', { d: m.main, style: fillStyle('--coach-hand') }, parts[name]);
      var det = mk('g', { 'data-detail': '1' }, parts[name]);
      mk('path', { d: m.shade, style: fillStyle('--coach-hand-shade') }, det);
    });

    // fx variants hold a regular set and a small set, like the eyes and mouth. Only the thinking
    // dots draw anything in the small set; zzz and spark are regular only, so they vanish below
    // 44 px.
    parts.fx = mk('g', { 'data-part': 'fx' }, parts.root);
    addVariants(parts.fx, 'fx', function (v, name) {
      var i, n, reg = mk('g', { 'data-set': 'regular' }, v), sml = mk('g', { 'data-set': 'small' }, v);
      if (name === 'dots' || name === 'dots1' || name === 'dots2') {
        n = name === 'dots1' ? 1 : name === 'dots2' ? 2 : 3;
        for (i = 0; i < n; i++) {
          mk('path', { d: ellipse(DOTS[i][0], DOTS[i][1], DOTS[i][2], DOTS[i][2]), style: fillStyle('--coach-fx') }, reg);
          mk('path', { d: ellipse(DOTS_SMALL[i][0], DOTS_SMALL[i][1], DOTS_SMALL[i][2], DOTS_SMALL[i][2]), style: fillStyle('--coach-fx') }, sml);
        }
      } else if (name === 'zzz') {
        mk('path', { d: zee(188, 52, 8), style: strokeStyle('--coach-fx', 3.4) }, reg);
        mk('path', { d: zee(199.5, 33.5, 10.5), style: strokeStyle('--coach-fx', 3.8) }, reg);
        mk('path', { d: zee(212.5, 12.5, 13), style: strokeStyle('--coach-fx', 4.2) }, reg);
      } else if (name === 'spark') {
        spark().forEach(function (d) { mk('path', { d: d, style: strokeStyle('--coach-fx', 4.4) }, reg); });
      }
    });

    container.appendChild(svg);

    var coach = {
      svg: svg,
      parts: parts,
      small: false,
      theme: 'light',
      size: 112,
      variants: { eyes: DEFAULTS.eyes, mouth: DEFAULTS.mouth, brows: DEFAULTS.brows, fx: DEFAULTS.fx },

      // Show one variant of a group. Unknown names leave the coach unchanged. Chainable.
      setVariant: function (group, name) {
        var g = parts[group];
        if (!g || !VARIANTS[group] || VARIANTS[group].indexOf(name) < 0) return coach;
        for (var i = 0; i < g.children.length; i++) {
          var v = g.children[i];
          if (!v.hasAttribute('data-variant')) continue;
          if (v.getAttribute('data-variant') === name) v.removeAttribute('display');
          else v.setAttribute('display', 'none');
        }
        coach.variants[group] = name;
        return coach;
      },

      setTheme: function (theme) {
        var t = THEMES[theme] ? theme : 'light', vars = THEMES[t];
        for (var key in vars) if (Object.prototype.hasOwnProperty.call(vars, key)) svg.style.setProperty(key, vars[key]);
        coach.theme = t;
        return coach;
      },

      setSize: function (px) {
        px = Math.max(1, +px || 112);
        svg.setAttribute('width', px);
        svg.setAttribute('height', px);
        svg.style.width = px + 'px';
        svg.style.height = px + 'px';
        coach.size = px;
        var small = coach.small = px < SMALL_BELOW;
        // Small mode: no brows or fine detail; the bold eye and mouth sets; of the effects only the
        // thinking dots (their small set), so thinking still reads at 32 px.
        if (small) parts.brows.setAttribute('display', 'none'); else parts.brows.removeAttribute('display');
        var i, sets = svg.querySelectorAll('[data-set]');
        for (i = 0; i < sets.length; i++) {
          if ((sets[i].getAttribute('data-set') === 'small') === small) sets[i].removeAttribute('display');
          else sets[i].setAttribute('display', 'none');
        }
        var det = svg.querySelectorAll('[data-detail]');
        for (i = 0; i < det.length; i++) {
          if (small) det[i].setAttribute('display', 'none'); else det[i].removeAttribute('display');
        }
        // The dark-theme rim thickens as the coach shrinks, so the hood stays separate from #151918.
        for (i = 0; i < RIM_STEPS.length; i++) {
          if (px >= RIM_STEPS[i][0]) { rim.style.strokeWidth = String(RIM_STEPS[i][1]); break; }
        }
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
    DEFAULTS: DEFAULTS,
    THEMES: THEMES,
    SMALL_BELOW: SMALL_BELOW,
    RIM_STEPS: RIM_STEPS,
    FX_CENTERS: FX_CENTERS,
    GEOMETRY: { OUTER: OUTER, WINDOW: WINDOW, FACE_FILL: FACE_FILL, LINING: LINING },
    create: create
  };
})();
