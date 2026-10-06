/*
 * Bravilo coach "Fold", candidate 1: faithful (D142, direction A refined).
 * Plain browser JavaScript, no build step, no modules. Defines window.BraviloCoach (SPEC §2).
 *
 * Drawing units: a 240 x 240 square. Every animated part is a <g data-part="..."> whose
 * transform is identity at rest; the player transforms it around PIVOTS[part].
 * All geometry is absolute path data (M, L, C, Q only; no arcs, no static transforms), so it
 * copies straight into react-native-svg. Colours come only from CSS variables on the <svg>.
 *
 * Authoring note: shapes are written in "design units" and mapped once by FIT (a uniform scale
 * about the standing point) so the character fills the square; the emitted numbers, PIVOTS
 * and stroke widths are all in final drawing units.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VIEWBOX = [0, 0, 240, 240];
  var SMALL_BELOW = 44; // CSS px: below this the coach draws its small, bold-eyed form

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

  // ---------- design-unit to drawing-unit mapping ----------

  var FIT = { s: 1.07, ax: 120, ay: 204 };
  function r2(v) { return Math.round(v * 100) / 100; }
  function fx_(x) { return r2(FIT.ax + (x - FIT.ax) * FIT.s); }
  function fy_(y) { return r2(FIT.ay + (y - FIT.ay) * FIT.s); }
  function pt(x, y) { return [fx_(x), fy_(y)]; }
  function sw(w) { return r2(w * FIT.s); }
  // Map every "x y" pair of an absolute M/L/C/Q path written in design units.
  function map(d) {
    return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, function (m, x, y) {
      return fx_(parseFloat(x)) + ' ' + fy_(parseFloat(y));
    });
  }
  // Mirror a design-unit path across the centre line x = 120.
  function mirror(d) {
    return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, function (m, x, y) {
      return r2(240 - parseFloat(x)) + ' ' + y;
    });
  }

  // Rotate and scale origins, in drawing units.
  var PIVOTS = {
    root: pt(120, 204),   // bottom centre of the body (where it stands)
    body: pt(120, 204),   // bottom centre: squash, stretch, lean and dip
    face: pt(120, 118),   // centre of the cream face
    eyes: pt(120, 121),   // midpoint between the eyes (blink = scaleY here)
    mouth: pt(120, 143),  // centre of the mouth shapes
    brows: pt(120, 102),  // midpoint between the brows
    handL: pt(60, 182),   // palm centre of the left mitten (screen left)
    handR: pt(180, 182),  // palm centre of the right mitten
    fx: pt(203, 52),      // the effects corner, top right of the head
    shadow: pt(120, 211)  // centre of the ground ellipse
  };

  var VARIANTS = {
    eyes: ['rest', 'happy', 'wide', 'closed', 'up', 'left', 'right', 'down'],
    mouth: ['none', 'smile', 'open', 'o', 'soft'],
    brows: ['none', 'raised', 'worried', 'think'],
    // dots1 and dots2 are extras (one, then two dots) so a loop can build the dots in sequence.
    fx: ['none', 'dots', 'zzz', 'spark', 'dots1', 'dots2']
  };

  var DEFAULTS = { eyes: 'rest', mouth: 'none', brows: 'none', fx: 'none' };

  // ---------- geometry (design units) ----------

  // Hood: direction A's gable made soft. Straight 1:2 slopes, a rounded peak (never a point),
  // round shoulders, straight sides and soft bottom corners.
  var HOOD =
    'M 48 179 ' +
    'L 48 100 ' +
    'C 48 84, 58 72.5, 70 66.4 ' +
    'L 105 48.6 ' +
    'C 113.5 44.3, 126.5 44.3, 135 48.6 ' +
    'L 170 66.4 ' +
    'C 182 72.5, 192 84, 192 100 ' +
    'L 192 179 ' +
    'C 192 192.8, 180.8 204, 167 204 ' +
    'L 73 204 ' +
    'C 59.2 204, 48 192.8, 48 179 Z';

  // Face: the hood opening, a soft hexagon. The top follows the hood's gable; the chin is a
  // shallow, rounded V with the same 1:2 slope as the top, so the face never reads as a jaw.
  var FACE =
    'M 120 71.2 ' +
    'C 124.5 71.2, 128.5 72, 132 73.8 ' +
    'L 154 85 ' +
    'C 164 90.1, 172.5 100, 172.5 114 ' +
    'L 172.5 127 ' +
    'C 172.5 136, 169.5 140.5, 161.5 144.5 ' +
    'L 135 157.75 ' +
    'C 129.5 160.5, 125 165.5, 120 165.5 ' +
    'C 115 165.5, 110.5 160.5, 105 157.75 ' +
    'L 78.5 144.5 ' +
    'C 70.5 140.5, 67.5 136, 67.5 127 ' +
    'L 67.5 114 ' +
    'C 67.5 100, 76 90.1, 86 85 ' +
    'L 108 73.8 ' +
    'C 111.5 72, 115.5 71.2, 120 71.2 Z';

  // Eye sets. k scales the shapes, w is the stroke weight of the line eyes (design units).
  var EYE = {
    regular: { l: [97.5, 121], r: [142.5, 121], k: 1, w: 5.6 },
    small: { l: [95, 121.5], r: [145, 121.5], k: 1.4, w: 9 }
  };

  // A capsule (pill) as a closed cubic path, design units.
  function pill(cx, cy, w, h) {
    var r = Math.min(w, h) / 2, c = r * 0.5523;
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    return 'M ' + r2(x0 + r) + ' ' + r2(y0) +
      ' L ' + r2(x1 - r) + ' ' + r2(y0) +
      ' C ' + r2(x1 - r + c) + ' ' + r2(y0) + ', ' + r2(x1) + ' ' + r2(cy - (h / 2 - r) - c) + ', ' + r2(x1) + ' ' + r2(cy - (h / 2 - r)) +
      ' L ' + r2(x1) + ' ' + r2(cy + (h / 2 - r)) +
      ' C ' + r2(x1) + ' ' + r2(cy + (h / 2 - r) + c) + ', ' + r2(x1 - r + c) + ' ' + r2(y1) + ', ' + r2(x1 - r) + ' ' + r2(y1) +
      ' L ' + r2(x0 + r) + ' ' + r2(y1) +
      ' C ' + r2(x0 + r - c) + ' ' + r2(y1) + ', ' + r2(x0) + ' ' + r2(cy + (h / 2 - r) + c) + ', ' + r2(x0) + ' ' + r2(cy + (h / 2 - r)) +
      ' L ' + r2(x0) + ' ' + r2(cy - (h / 2 - r)) +
      ' C ' + r2(x0) + ' ' + r2(cy - (h / 2 - r) - c) + ', ' + r2(x0 + r - c) + ' ' + r2(y0) + ', ' + r2(x0 + r) + ' ' + r2(y0) + ' Z';
  }

  // A rotated ellipse as four cubics (exact affine image of the standard approximation).
  function ellipse(cx, cy, rx, ry, deg) {
    var a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), c = 0.5523;
    function P(u, v) { return r2(cx + u * ca - v * sa) + ' ' + r2(cy + u * sa + v * ca); }
    return 'M ' + P(rx, 0) +
      ' C ' + P(rx, c * ry) + ', ' + P(c * rx, ry) + ', ' + P(0, ry) +
      ' C ' + P(-c * rx, ry) + ', ' + P(-rx, c * ry) + ', ' + P(-rx, 0) +
      ' C ' + P(-rx, -c * ry) + ', ' + P(-c * rx, -ry) + ', ' + P(0, -ry) +
      ' C ' + P(c * rx, -ry) + ', ' + P(rx, -c * ry) + ', ' + P(rx, 0) + ' Z';
  }

  // ---------- DOM helpers ----------

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var a in attrs) if (Object.prototype.hasOwnProperty.call(attrs, a)) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fill(token) { return 'fill:var(' + token + ')'; }
  function stroke(token, w) {
    return 'fill:none;stroke:var(' + token + ');stroke-width:' + sw(w) + ';stroke-linecap:round;stroke-linejoin:round';
  }
  function shape(parent, d, style) { return mk('path', { d: map(d), style: style }, parent); }

  // ---------- parts ----------

  function drawEyes(variantGroup, name, set) {
    var g = mk('g', { 'data-set': set }, variantGroup);
    var E = EYE[set], k = E.k;
    [E.l, E.r].forEach(function (c) {
      var x = c[0], y = c[1];
      function line(d) { shape(g, d, stroke('--coach-ink', E.w)); }
      function blob(d) { shape(g, d, fill('--coach-ink')); }
      switch (name) {
        case 'rest': // soft pills
          blob(pill(x, y, 18 * k, (set === 'small' ? 11.5 : 13.5) * k));
          break;
        case 'happy': // upward arcs
          line('M ' + r2(x - 8 * k) + ' ' + r2(y + 3.5 * k) +
            ' C ' + r2(x - 7 * k) + ' ' + r2(y - 6 * k) + ', ' + r2(x + 7 * k) + ' ' + r2(y - 6 * k) + ', ' +
            r2(x + 8 * k) + ' ' + r2(y + 3.5 * k));
          break;
        case 'closed': // soft downward curves
          line('M ' + r2(x - 8 * k) + ' ' + r2(y) +
            ' C ' + r2(x - 6 * k) + ' ' + r2(y + 6 * k) + ', ' + r2(x + 6 * k) + ' ' + r2(y + 6 * k) + ', ' +
            r2(x + 8 * k) + ' ' + r2(y));
          break;
        case 'wide': // rounder and open
          blob(set === 'small' ? pill(x, y, 14.5 * k, 15 * k) : pill(x, y - 0.5 * k, 16 * k, 17 * k));
          break;
        case 'up': // up and to the side
          blob(pill(x + 5 * k, y - 6.5 * k, 14.5 * k, 14 * k));
          break;
        case 'left':
          blob(pill(x - 7.5 * k, y + 0.5 * k, 15 * k, 14 * k));
          break;
        case 'right':
          blob(pill(x + 7.5 * k, y + 0.5 * k, 15 * k, 14 * k));
          break;
        case 'down':
          blob(pill(x, y + 6 * k, 16.5 * k, 12.5 * k));
          break;
      }
    });
    return g;
  }

  function drawBrows(v, name) {
    var st = stroke('--coach-ink', 4.4), left;
    if (name === 'raised') {
      left = 'M 90.5 104 Q 97.5 97.5 105 100.5';
      shape(v, left, st); shape(v, mirror(left), st);
    } else if (name === 'worried') {
      left = 'M 90 105 Q 97 101.2 105 101';
      shape(v, left, st); shape(v, mirror(left), st);
    } else if (name === 'think') {
      shape(v, 'M 136 100.5 Q 143.5 94 151 98.5', st);
    }
  }

  // Mouth: a regular set and a bolder, slightly bigger small set (for the tab dock and avatars).
  function drawMouth(v, name) {
    ['regular', 'small'].forEach(function (set) {
      var g = mk('g', { 'data-set': set }, v), sm = set === 'small';
      var k = sm ? 1.45 : 1, cx = 120, cy = sm ? 143 : 141;
      function X(u) { return r2(cx + u * k); }
      function Y(u) { return r2(cy + u * k); }
      if (name === 'smile') {
        shape(g, 'M ' + X(-7) + ' ' + Y(-1.5) + ' C ' + X(-5) + ' ' + Y(3.5) + ', ' + X(5) + ' ' + Y(3.5) + ', ' + X(7) + ' ' + Y(-1.5),
          stroke('--coach-ink', sm ? 7.5 : 4.4));
      } else if (name === 'open') {
        shape(g, 'M ' + X(-9.5) + ' ' + Y(-2.5) + ' C ' + X(-5) + ' ' + Y(-3.7) + ', ' + X(5) + ' ' + Y(-3.7) + ', ' + X(9.5) + ' ' + Y(-2.5) +
          ' C ' + X(9.5) + ' ' + Y(5.5) + ', ' + X(5) + ' ' + Y(10.5) + ', ' + X(0) + ' ' + Y(10.5) +
          ' C ' + X(-5) + ' ' + Y(10.5) + ', ' + X(-9.5) + ' ' + Y(5.5) + ', ' + X(-9.5) + ' ' + Y(-2.5) + ' Z', fill('--coach-ink'));
      } else if (name === 'o') {
        shape(g, sm ? pill(cx, Y(3), 6.5 * k, 7.5 * k) : pill(cx, Y(3), 9 * k, 10.5 * k), fill('--coach-ink'));
      } else if (name === 'soft') {
        shape(g, 'M ' + X(-5) + ' ' + Y(3.5) + ' C ' + X(-2.5) + ' ' + Y(4.8) + ', ' + X(2.5) + ' ' + Y(4.8) + ', ' + X(5) + ' ' + Y(3.5),
          stroke('--coach-ink', sm ? 6.5 : 4));
      }
    });
  }

  function zPath(x, y, s) {
    return 'M ' + x + ' ' + y + ' L ' + (x + s) + ' ' + y + ' L ' + x + ' ' + (y + s) + ' L ' + (x + s) + ' ' + (y + s);
  }

  var DOTS = [[195, 81, 4], [206.5, 69, 4.8], [218.5, 56, 5.5]];

  function drawFx(v, name) {
    var i;
    if (name === 'dots' || name === 'dots1' || name === 'dots2') {
      var count = name === 'dots1' ? 1 : name === 'dots2' ? 2 : 3;
      for (i = 0; i < count; i++) shape(v, pill(DOTS[i][0], DOTS[i][1], DOTS[i][2] * 2, DOTS[i][2] * 2), fill('--coach-fx'));
    } else if (name === 'zzz') {
      shape(v, zPath(193, 75, 7.5), stroke('--coach-fx', 3.4));
      shape(v, zPath(203.5, 57, 10), stroke('--coach-fx', 3.8));
      shape(v, zPath(212, 36, 12), stroke('--coach-fx', 4.2));
    } else if (name === 'spark') {
      var c = [202, 47];
      [-142, -90, -38].forEach(function (deg) {
        var a = deg * Math.PI / 180, ra = 12, rb = 19.5;
        shape(v, 'M ' + r2(c[0] + ra * Math.cos(a)) + ' ' + r2(c[1] + ra * Math.sin(a)) +
          ' L ' + r2(c[0] + rb * Math.cos(a)) + ' ' + r2(c[1] + rb * Math.sin(a)), stroke('--coach-fx', 4.2));
      });
    }
  }

  // Mitten, upright (fingers up) around its palm centre (cx, cy); the thumb points up and inward.
  // side = 1: right hand (thumb on its left); side = -1: left hand (mirrored).
  var MITT_K = 1.16;
  function drawMitten(g, cx, cy, side) {
    var k = MITT_K;
    function T(d) {
      return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, function (m, x, y) {
        return r2(cx + side * k * parseFloat(x)) + ' ' + r2(cy + k * parseFloat(y));
      });
    }
    var thumb = ellipse(-12.5, -6.5, 7, 9.6, -24);
    var main =
      'M 1.5 -21 ' +
      'C 10.5 -21, 16.5 -13.5, 16.5 -1 ' +
      'C 16.5 11.5, 10.5 19.5, 1 19.5 ' +
      'C -8 19.5, -14.5 13, -14.5 3 ' +
      'C -14.5 -11, -9 -21, 1.5 -21 Z';
    var shade =
      'M 16.5 -1 ' +
      'C 16.5 11.5, 10.5 19.5, 1 19.5 ' +
      'C 7 15, 12 8.5, 16.5 -1 Z';
    shape(g, T(thumb), fill('--coach-hand'));
    shape(g, T(main), fill('--coach-hand'));
    shape(g, T(shade), fill('--coach-hand-shade'));
  }

  function addVariants(partGroup, group, draw) {
    VARIANTS[group].forEach(function (name) {
      var v = mk('g', { 'data-variant': name }, partGroup);
      draw(v, name);
      if (name !== DEFAULTS[group]) v.setAttribute('display', 'none');
    });
  }

  // ---------- create ----------

  function create(container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.querySelector(container);
    var svg = mk('svg', { xmlns: NS, viewBox: VIEWBOX.join(' '), role: 'img', 'aria-label': 'Bravilo coach' });
    svg.style.display = 'block';

    var parts = {};
    parts.shadow = mk('g', { 'data-part': 'shadow' }, svg);
    shape(parts.shadow, ellipse(120, 211, 60, 6, 0), fill('--coach-shadow'));

    parts.root = mk('g', { 'data-part': 'root' }, svg);
    parts.body = mk('g', { 'data-part': 'body' }, parts.root);
    var hood = shape(parts.body, HOOD,
      'fill:var(--coach-hood);stroke:var(--coach-rim);stroke-width:' + sw(2.2) + ';stroke-linejoin:round');

    parts.face = mk('g', { 'data-part': 'face' }, parts.body);
    shape(parts.face, FACE, fill('--coach-face'));
    parts.eyes = mk('g', { 'data-part': 'eyes' }, parts.face);
    addVariants(parts.eyes, 'eyes', function (v, name) { drawEyes(v, name, 'regular'); drawEyes(v, name, 'small'); });
    parts.brows = mk('g', { 'data-part': 'brows' }, parts.face);
    addVariants(parts.brows, 'brows', drawBrows);
    parts.mouth = mk('g', { 'data-part': 'mouth' }, parts.face);
    addVariants(parts.mouth, 'mouth', drawMouth);

    parts.handL = mk('g', { 'data-part': 'handL' }, parts.root);
    drawMitten(parts.handL, 60, 182, -1);
    parts.handR = mk('g', { 'data-part': 'handR' }, parts.root);
    drawMitten(parts.handR, 180, 182, 1);

    parts.fx = mk('g', { 'data-part': 'fx' }, parts.root);
    addVariants(parts.fx, 'fx', drawFx);

    container.appendChild(svg);

    var coach = {
      svg: svg,
      parts: parts,
      small: false,
      theme: 'light',
      size: 112,
      variants: { eyes: DEFAULTS.eyes, mouth: DEFAULTS.mouth, brows: DEFAULTS.brows, fx: DEFAULTS.fx },

      setVariant: function (group, name) {
        var g = parts[group];
        if (!g || !VARIANTS[group] || VARIANTS[group].indexOf(name) < 0) return false;
        for (var i = 0; i < g.children.length; i++) {
          var v = g.children[i];
          if (!v.hasAttribute('data-variant')) continue;
          if (v.getAttribute('data-variant') === name) v.removeAttribute('display');
          else v.setAttribute('display', 'none');
        }
        coach.variants[group] = name;
        return true;
      },

      setTheme: function (theme) {
        var t = THEMES[theme] ? theme : 'light', vars = THEMES[t];
        for (var key in vars) if (Object.prototype.hasOwnProperty.call(vars, key)) svg.style.setProperty(key, vars[key]);
        coach.theme = t;
      },

      setSize: function (px) {
        px = +px || 112;
        svg.setAttribute('width', px);
        svg.setAttribute('height', px);
        svg.style.width = px + 'px';
        svg.style.height = px + 'px';
        coach.size = px;
        var small = coach.small = px < SMALL_BELOW;
        // Small mode: no brows or fx, the bold eye and mouth sets, and a thicker dark-theme rim.
        ['brows', 'fx'].forEach(function (p) {
          if (small) parts[p].setAttribute('display', 'none'); else parts[p].removeAttribute('display');
        });
        var sets = svg.querySelectorAll('[data-set]');
        for (var i = 0; i < sets.length; i++) {
          if ((sets[i].getAttribute('data-set') === 'small') === small) sets[i].removeAttribute('display');
          else sets[i].setAttribute('display', 'none');
        }
        hood.style.strokeWidth = String(small ? sw(6) : sw(2.2));
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
    SMALL_BELOW: SMALL_BELOW,
    create: create
  };
})();
