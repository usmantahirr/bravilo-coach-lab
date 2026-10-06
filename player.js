/*
 * Bravilo coach player (SPEC §5). Plain browser JavaScript on GSAP 3.13 (global `gsap`).
 * Defines window.BraviloPlayer:
 *
 *   apply(coach, pose)                 pose name or object; sets everything at once, stops motion
 *   play(coach, animId, { onDone, settle, settleMs })
 *                                      plays BraviloMotion.ANIMS[animId]; one-shots end exactly on
 *                                      their endPose, then onDone(coach). A loop runs until stop().
 *   stop(coach, { immediate, ms, onDone })
 *                                      ends what is playing: settles to its endPose in
 *                                      TOKENS.ms.base (220 ms), or at once with immediate.
 *   seek(coach, animId, progress)      paused at progress 0..1 of the animation (one period of a
 *                                      loop). Rebuilt from the start pose every call: deterministic.
 *   to(coach, pose, { ms, onDone })    a smooth transition from wherever the coach is to a pose.
 *   reducedMotion                      when true, play() shows the end pose at once (a loop shows
 *                                      its held pose until stop()). Defaults to the OS setting.
 *   sample(anim, tMs), validate(anim), ease(name), poseState(pose), state(coach),
 *   transitionSpec(fromPose, toPose, ms)
 *                                      pure helpers for tools and checks. Wherever an animId is
 *                                      taken, a spec object works too.
 *
 * No per-animation logic lives here: everything comes from the spec (SPEC §3).
 *
 * How a spec becomes motion
 *   - Each part has seven channels: x, y, rotate, scale, scaleX, scaleY, opacity. The tweens run on
 *     plain channel objects; one render per frame writes them to the part's <g> with GSAP, using
 *     svgOrigin = BraviloCoach.PIVOTS[part] (drawing units). The drawn transform is
 *     translate(x, y) rotate(rotate) scale(scale * scaleX, scale * scaleY) about the pivot.
 *   - A track's consecutive keys become fromTo tweens; key i's ease applies from key i-1 into key i
 *     (missing ease = standard). Eases are cubic-bezier curves solved here from TOKENS.ease (no
 *     CustomEase). A track holds its first value before its first key and its last value after.
 *   - Swaps become timeline calls at their times. Seeking never relies on the calls: the variants
 *     are rebuilt from the spec (start pose, then every swap at or before t, in order).
 *   - Optional spec fields the player understands: startPose (default 'rest'), reducedPose.
 */
(function () {
  'use strict';

  var PARTS = ['root', 'body', 'face', 'eyes', 'mouth', 'brows', 'handL', 'handR', 'fx', 'shadow'];
  var GROUPS = ['eyes', 'mouth', 'brows', 'fx'];
  var PROPS = ['x', 'y', 'rotate', 'scale', 'scaleX', 'scaleY', 'opacity'];
  var DEF = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 };
  var FALLBACK_VARIANTS = { eyes: 'rest', mouth: 'none', brows: 'none', fx: 'none' };
  var EPS = 1e-6;          // time comparisons (ms)
  var TOL = 1e-4;          // value comparisons (drawing units, degrees, factors)
  var BLINK = 0.15;        // eyes scaleY at the bottom of a blink that hides an eye swap
  var ONE_SHOT_MAX = 1700; // ms (SPEC §3, raised by D165)

  function Motion() { return window.BraviloMotion; }
  function Coach() { return window.BraviloCoach; }
  function warn(msg) { if (window.console && console.warn) console.warn('[BraviloPlayer] ' + msg); }
  function num(v, d) { return v == null || !isFinite(+v) ? d : +v; }

  // ------------------------------------------------------------------ easing

  // cubic-bezier(x1, y1, x2, y2) as an ease function: solve x(s) = t (Newton, then bisection),
  // return y(s). x1 and x2 lie in [0, 1], so x(s) is monotonic and the solve is unique.
  function cubicBezier(x1, y1, x2, y2) {
    if (x1 === y1 && x2 === y2) return function (t) { return t; };
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function X(s) { return ((ax * s + bx) * s + cx) * s; }
    function Y(s) { return ((ay * s + by) * s + cy) * s; }
    function dX(s) { return (3 * ax * s + 2 * bx) * s + cx; }
    function solve(t) {
      var s = t, i, e, d;
      for (i = 0; i < 8; i++) {
        e = X(s) - t;
        if (Math.abs(e) < 1e-7) return s;
        d = dX(s);
        if (Math.abs(d) < 1e-6) break;
        s -= e / d;
      }
      var lo = 0, hi = 1;
      s = t;
      for (i = 0; i < 60; i++) {
        e = X(s);
        if (Math.abs(e - t) < 1e-7) break;
        if (e < t) lo = s; else hi = s;
        s = (lo + hi) / 2;
      }
      return s;
    }
    return function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return Y(solve(t));
    };
  }

  var easeCache = {};
  function ease(name) {
    var table = Motion().TOKENS.ease;
    var pts = table[name || 'standard'] || table.standard;
    var key = pts.join(',');
    return easeCache[key] || (easeCache[key] = cubicBezier(pts[0], pts[1], pts[2], pts[3]));
  }

  // ------------------------------------------------------------------ poses and specs

  function resolvePose(p) {
    if (typeof p === 'string') {
      var pose = Motion().POSES[p];
      if (!pose) warn('unknown pose "' + p + '", using rest');
      return pose || Motion().POSES.rest || {};
    }
    return p || Motion().POSES.rest || {};
  }

  // A full state: every channel of every part, and every variant group.
  function poseState(pose) {
    pose = resolvePose(pose);
    var defaults = (Coach() && Coach().DEFAULTS) || FALLBACK_VARIANTS;
    var st = { parts: {}, variants: {} };
    PARTS.forEach(function (part) {
      var src = (pose.parts && pose.parts[part]) || {}, c = {};
      PROPS.forEach(function (k) { c[k] = num(src[k], DEF[k]); });
      st.parts[part] = c;
    });
    GROUPS.forEach(function (g) { st.variants[g] = pose[g] || defaults[g]; });
    return st;
  }

  function copyState(st) {
    var out = { parts: {}, variants: {} };
    PARTS.forEach(function (p) {
      var c = {};
      PROPS.forEach(function (k) { c[k] = st.parts[p][k]; });
      out.parts[p] = c;
    });
    GROUPS.forEach(function (g) { out.variants[g] = st.variants[g]; });
    return out;
  }

  function sameState(a, b) {
    for (var i = 0; i < PARTS.length; i++) {
      for (var j = 0; j < PROPS.length; j++) {
        if (Math.abs(a.parts[PARTS[i]][PROPS[j]] - b.parts[PARTS[i]][PROPS[j]]) > TOL) return false;
      }
    }
    for (var g = 0; g < GROUPS.length; g++) if (a.variants[GROUPS[g]] !== b.variants[GROUPS[g]]) return false;
    return true;
  }

  function getSpec(id) {
    if (id && typeof id === 'object') return id;
    var spec = Motion().ANIMS[id];
    if (!spec) warn('unknown animation "' + id + '"');
    return spec || null;
  }
  function startPoseOf(spec) { return spec.startPose || 'rest'; }
  function endPoseOf(spec) { return spec.endPose || 'rest'; }
  function reducedPoseOf(spec) {
    return spec.reducedPose || (spec.loop && spec.startPose ? spec.startPose : endPoseOf(spec));
  }
  function lastKeyTime(spec) {
    var m = 0;
    (spec.tracks || []).forEach(function (tr) {
      var k = tr.keys || [];
      if (k.length) m = Math.max(m, num(k[k.length - 1][0], 0));
    });
    (spec.swaps || []).forEach(function (s) { m = Math.max(m, num(s[0], 0)); });
    return m;
  }
  function durationOf(spec) { return num(spec.durationMs, 0) > 0 ? +spec.durationMs : lastKeyTime(spec); }

  function sortedSwaps(spec) {
    return (spec.swaps || []).map(function (s, i) { return { t: num(s[0], 0), g: s[1], v: s[2], i: i }; })
      .sort(function (a, b) { return a.t - b.t || a.i - b.i; });
  }
  function variantsAt(spec, tMs, base) {
    var v = {};
    GROUPS.forEach(function (g) { v[g] = base[g]; });
    sortedSwaps(spec).forEach(function (s) { if (s.t <= tMs + EPS && GROUPS.indexOf(s.g) >= 0) v[s.g] = s.v; });
    return v;
  }

  // The value of one track at tMs: the last key at or before t, eased toward the next key.
  function trackValue(keys, tMs) {
    var n = keys ? keys.length : 0, i = -1;
    if (!n) return undefined;
    for (var j = 0; j < n; j++) { if (keys[j][0] <= tMs + EPS) i = j; else break; }
    if (i < 0) return keys[0][1];
    if (i === n - 1) return keys[i][1];
    var k0 = keys[i], k1 = keys[i + 1], span = k1[0] - k0[0];
    var p = span > 0 ? Math.max(0, Math.min(1, (tMs - k0[0]) / span)) : 1;
    return k0[1] + (k1[1] - k0[1]) * ease(k1[2])(p);
  }

  // The state an animation shows at tMs, computed from the spec alone (no GSAP). The engine's
  // timeline must agree with this; frames.html checks it on every frame.
  function sample(anim, tMs) {
    var spec = getSpec(anim);
    if (!spec) return null;
    var st = poseState(startPoseOf(spec));
    (spec.tracks || []).forEach(function (tr) {
      if (!st.parts[tr.part] || !(tr.prop in DEF)) return;
      var v = trackValue(tr.keys, tMs);
      if (v !== undefined) st.parts[tr.part][tr.prop] = v;
    });
    st.variants = variantsAt(spec, tMs, st.variants);
    return st;
  }

  // ------------------------------------------------------------------ validation

  // Problems with a spec, as readable strings (empty when it follows SPEC §3).
  function validate(anim) {
    var spec = getSpec(anim), issues = [];
    if (!spec) return ['unknown animation'];
    function bad(m) { issues.push(m); }
    function f(v) { return Math.round(v * 1000) / 1000; }
    var T = Motion().TOKENS, D = durationOf(spec), Vn = (Coach() && Coach().VARIANTS) || {};
    ['id', 'label', 'where', 'feel'].forEach(function (k) { if (!spec[k]) bad('missing ' + k); });
    if (!(num(spec.durationMs, 0) > 0)) bad('durationMs must be a positive number');
    if (!spec.loop && D > ONE_SHOT_MAX) bad('one-shot lasts ' + D + ' ms (max ' + ONE_SHOT_MAX + ')');
    [['startPose', spec.startPose], ['endPose', spec.endPose], ['reducedPose', spec.reducedPose]].forEach(function (p) {
      if (typeof p[1] === 'string' && !Motion().POSES[p[1]]) bad(p[0] + ' "' + p[1] + '" is not in POSES');
    });
    if (!spec.endPose) bad('missing endPose');
    var start = poseState(startPoseOf(spec)), end = poseState(endPoseOf(spec)), seen = {};
    (spec.tracks || []).forEach(function (tr, n) {
      var where = (tr.part || '?') + '.' + (tr.prop || '?'), keys = tr.keys || [];
      if (PARTS.indexOf(tr.part) < 0) { bad('track ' + n + ': unknown part "' + tr.part + '"'); return; }
      if (PROPS.indexOf(tr.prop) < 0) { bad(where + ': unknown prop (use ' + PROPS.join(', ') + ')'); return; }
      if (seen[where]) bad(where + ': two tracks animate the same channel');
      seen[where] = true;
      if (!keys.length) { bad(where + ': no keys'); return; }
      if (keys[0][0] !== 0) bad(where + ': first key must be at t = 0');
      keys.forEach(function (k, i) {
        if (!isFinite(k[0]) || !isFinite(k[1])) bad(where + ' key ' + i + ': time and value must be numbers');
        if (i && k[0] < keys[i - 1][0]) bad(where + ' key ' + i + ': times must not go backwards');
        if (i && k[2] != null && !T.ease[k[2]]) bad(where + ' key ' + i + ': unknown ease "' + k[2] + '"');
        if (k[0] > D + EPS) bad(where + ' key ' + i + ': at ' + k[0] + ' ms, after durationMs ' + D);
      });
      var first = keys[0][1], last = keys[keys.length - 1][1];
      var s0 = start.parts[tr.part][tr.prop], e0 = end.parts[tr.part][tr.prop];
      if (Math.abs(first - s0) > TOL) bad(where + ' starts at ' + f(first) + ' but the start pose has ' + f(s0));
      if (spec.loop) {
        if (Math.abs(last - first) > TOL) bad(where + ' ends the loop at ' + f(last) + ', not its first value ' + f(first));
      } else if (Math.abs(last - e0) > TOL) {
        bad(where + ' ends at ' + f(last) + ' but endPose "' + endPoseOf(spec) + '" has ' + f(e0));
      }
    });
    if (!spec.loop) {
      PARTS.forEach(function (p) {
        PROPS.forEach(function (k) {
          if (!seen[p + '.' + k] && Math.abs(start.parts[p][k] - end.parts[p][k]) > TOL) {
            bad(p + '.' + k + ' differs between start (' + f(start.parts[p][k]) + ') and endPose (' + f(end.parts[p][k]) + ') but has no track');
          }
        });
      });
    }
    (spec.swaps || []).forEach(function (s, i) {
      if (GROUPS.indexOf(s[1]) < 0) bad('swap ' + i + ': unknown group "' + s[1] + '"');
      else if (Vn[s[1]] && Vn[s[1]].indexOf(s[2]) < 0) bad('swap ' + i + ': "' + s[2] + '" is not a ' + s[1] + ' variant');
      if (!(s[0] >= 0) || s[0] > D + EPS) bad('swap ' + i + ': time ' + s[0] + ' is outside 0..' + D);
    });
    var finalV = variantsAt(spec, D, start.variants);
    var want = spec.loop ? variantsAt(spec, 0, start.variants) : end.variants;
    GROUPS.forEach(function (g) {
      if (finalV[g] !== want[g]) {
        bad(g + ' ends as "' + finalV[g] + '" but ' + (spec.loop ? 'the loop starts with' : 'endPose has') + ' "' + want[g] + '"');
      }
    });
    return issues;
  }

  // ------------------------------------------------------------------ per-coach state and render

  function ctx(coach) {
    if (coach._bp) return coach._bp;
    var b = coach._bp = { st: poseState('rest').parts, last: {}, tl: null, spec: null, onDone: null, token: 0 };
    PARTS.forEach(function (part) {
      var el = coach.parts[part], pv = Coach().PIVOTS[part] || [0, 0];
      if (!el) return;
      // Pivots in drawing units. Set once, while every part is at identity.
      gsap.set(el, { svgOrigin: pv[0] + ' ' + pv[1], smoothOrigin: false, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
    });
    return b;
  }

  function render(coach) {
    var b = coach._bp;
    for (var i = 0; i < PARTS.length; i++) {
      var part = PARTS[i], el = coach.parts[part], s = b.st[part];
      if (!el) continue;
      var sx = s.scale * s.scaleX, sy = s.scale * s.scaleY;
      var key = s.x + '|' + s.y + '|' + s.rotate + '|' + sx + '|' + sy + '|' + s.opacity;
      if (b.last[part] === key) continue;
      b.last[part] = key;
      gsap.set(el, { x: s.x, y: s.y, rotation: s.rotate, scaleX: sx, scaleY: sy, opacity: s.opacity });
    }
  }

  function setVariants(coach, v) {
    var cur = coach.variants || {};
    GROUPS.forEach(function (g) { if (v[g] && cur[g] !== v[g]) coach.setVariant(g, v[g]); });
  }

  function setState(coach, st) {
    var b = ctx(coach);
    PARTS.forEach(function (p) {
      var c = b.st[p];
      PROPS.forEach(function (k) { c[k] = st.parts[p][k]; });
    });
    setVariants(coach, st.variants);
    render(coach);
  }

  function currentState(coach) {
    var b = ctx(coach), v = coach.variants || {}, defaults = Coach().DEFAULTS || FALLBACK_VARIANTS;
    var st = copyState({ parts: b.st, variants: {} });
    GROUPS.forEach(function (g) { st.variants[g] = v[g] || defaults[g]; });
    return st;
  }

  function halt(coach) {
    var b = ctx(coach);
    if (b.tl) { b.tl.kill(); b.tl = null; }
  }

  // ------------------------------------------------------------------ timelines

  // The spec as a paused GSAP timeline whose tweens drive this coach's channel objects.
  function build(coach, spec) {
    var b = ctx(coach), D = durationOf(spec) / 1000;
    var tl = gsap.timeline({ paused: true, onUpdate: function () { render(coach); } });
    (spec.tracks || []).forEach(function (tr) {
      var obj = b.st[tr.part], keys = tr.keys || [], prop = tr.prop;
      if (!obj || !(prop in DEF)) return;
      for (var i = 1; i < keys.length; i++) {
        var k0 = keys[i - 1], k1 = keys[i], from = {}, to = {};
        from[prop] = k0[1];
        to[prop] = k1[1];
        to.duration = Math.max(0, (k1[0] - k0[0]) / 1000);
        to.ease = ease(k1[2]);
        to.immediateRender = false;
        to.lazy = false;
        to.overwrite = false;
        tl.fromTo(obj, from, to, k0[0] / 1000);
      }
    });
    sortedSwaps(spec).forEach(function (s) {
      tl.call(function () { coach.setVariant(s.g, s.v); }, null, s.t / 1000);
    });
    if (tl.duration() < D) tl.to({}, { duration: D - tl.duration(), lazy: false }, tl.duration());
    return tl;
  }

  // A spec that moves from one state to another in ms: every channel eases (standard) straight to
  // its target; a changed eye variant hides behind a blink, other changed groups dip their opacity
  // to 0 at the midpoint where they swap.
  function transitionSpec(from, to, ms) {
    var tracks = [], swaps = [], half = Math.round(ms / 2), changed = {};
    GROUPS.forEach(function (g) { changed[g] = from.variants[g] !== to.variants[g]; });
    PARTS.forEach(function (p) {
      PROPS.forEach(function (k) {
        var a = from.parts[p][k], z = to.parts[p][k];
        if (p === 'eyes' && k === 'scaleY' && changed.eyes) {
          tracks.push({ part: p, prop: k, keys: [[0, a], [half, BLINK, 'in'], [ms, z, 'out']] });
        } else if (k === 'opacity' && p !== 'eyes' && changed[p]) {
          tracks.push({ part: p, prop: k, keys: [[0, a], [half, 0, 'in'], [ms, z, 'out']] });
        } else if (Math.abs(a - z) > TOL) {
          tracks.push({ part: p, prop: k, keys: [[0, a], [ms, z, 'standard']] });
        }
      });
    });
    GROUPS.forEach(function (g) { if (changed[g]) swaps.push([half, g, to.variants[g]]); });
    return { id: 'transition', durationMs: ms, tracks: tracks, swaps: swaps };
  }

  // Start a built timeline on the next GSAP tick, not now. GSAP's clock only advances on ticks, so a
  // timeline started after a busy stretch of main-thread work (building a screen, creating coaches)
  // would begin in the past and skip its first frames. On a tick the clock is fresh.
  function startOnTick(coach, tl, token) {
    function kick() {
      gsap.ticker.remove(kick);
      if (coach._bp.token === token && coach._bp.tl === tl) tl.play(0);
    }
    gsap.ticker.add(kick);
  }

  function transition(coach, target, ms, done) {
    var tl = build(coach, transitionSpec(currentState(coach), target, ms));
    tl.eventCallback('onComplete', function () { setState(coach, target); if (done) done(); });
    coach._bp.tl = tl;
    startOnTick(coach, tl, coach._bp.token);
    return tl;
  }

  function finish(coach, token, extra) {
    var b = coach._bp;
    if (b.token !== token) return;
    var cb = b.onDone;
    b.spec = null;
    b.onDone = null;
    b.tl = null;
    if (cb) cb(coach);
    if (extra) extra(coach);
  }

  // ------------------------------------------------------------------ public API

  function apply(coach, pose) {
    var b = ctx(coach);
    halt(coach);
    b.token++;
    b.spec = null;
    b.onDone = null;
    setState(coach, poseState(pose));
    return coach;
  }

  function play(coach, animId, opts) {
    opts = opts || {};
    var spec = getSpec(animId);
    if (!spec) return null;
    var b = ctx(coach), T = Motion().TOKENS;
    halt(coach);
    var token = ++b.token;
    b.spec = spec;
    b.onDone = opts.onDone || null;

    if (P.reducedMotion) {
      setState(coach, poseState(reducedPoseOf(spec)));
      if (!spec.loop) finish(coach, token);
      return { id: spec.id, settleMs: 0, durationMs: 0 };
    }

    var start = poseState(startPoseOf(spec));
    var startV = variantsAt(spec, 0, start.variants);
    // Settle to what the timeline shows at t = 0 (the start pose plus any swap at 0), so a swap at
    // t = 0 never pops when the settle hands over to the timeline.
    start.variants = startV;
    function run() {
      if (b.token !== token) return;
      setState(coach, start);
      setVariants(coach, startV);
      var tl = b.tl = build(coach, spec);
      if (spec.loop) {
        tl.repeat(-1);
        tl.eventCallback('onRepeat', function () { setVariants(coach, startV); });
      } else {
        tl.eventCallback('onComplete', function () {
          if (b.token !== token) return;
          setState(coach, poseState(endPoseOf(spec))); // exact, even if the spec drifts
          finish(coach, token);
        });
      }
      startOnTick(coach, tl, token);
    }

    // If the coach is not at the start pose (say happy, before a nod), ease there first.
    var settleMs = num(opts.settleMs, T.ms.base), settle = 0;
    if (opts.settle !== false && settleMs > 0 && !sameState(currentState(coach), start)) {
      settle = settleMs;
      b.tl = transition(coach, start, settleMs, run);
    } else {
      run();
    }
    return { id: spec.id, settleMs: settle, durationMs: spec.loop ? Infinity : durationOf(spec) };
  }

  function stop(coach, opts) {
    opts = opts || {};
    var b = coach && coach._bp;
    if (!b) return;
    var spec = b.spec;
    halt(coach);
    if (!spec) return;
    var token = ++b.token;
    var end = poseState(endPoseOf(spec));
    if (opts.immediate || P.reducedMotion) {
      setState(coach, end);
      finish(coach, token, opts.onDone);
      return;
    }
    b.tl = transition(coach, end, num(opts.ms, Motion().TOKENS.ms.base), function () { finish(coach, token, opts.onDone); });
  }

  function seek(coach, animId, progress) {
    var spec = getSpec(animId);
    if (!spec) return null;
    var b = ctx(coach);
    halt(coach);
    b.token++;
    b.spec = null;
    b.onDone = null;
    var p = Math.max(0, Math.min(1, num(progress, 0)));
    var tMs = p * durationOf(spec);
    var start = poseState(startPoseOf(spec));
    setState(coach, start);
    var tl = build(coach, spec);
    tl.time(tMs / 1000, true);        // events suppressed: no swap calls fire while seeking
    setVariants(coach, variantsAt(spec, tMs, start.variants));
    render(coach);
    tl.kill();
    return tMs;
  }

  function to(coach, pose, opts) {
    opts = opts || {};
    var b = ctx(coach), target = poseState(pose);
    halt(coach);
    var token = ++b.token;
    b.spec = null;
    b.onDone = null;
    if (P.reducedMotion) { setState(coach, target); if (opts.onDone) opts.onDone(coach); return; }
    b.tl = transition(coach, target, num(opts.ms, Motion().TOKENS.ms.base), function () {
      if (b.token !== token) return;
      b.tl = null;
      if (opts.onDone) opts.onDone(coach);
    });
  }

  function isPlaying(coach) { return !!(coach && coach._bp && coach._bp.spec); }

  // The transition play() uses to settle and stop() uses to return, as a spec between two poses,
  // so tools can draw it (frames.html?anim=to&from=thinking&to=rest).
  function stateToPose(st, name) {
    return { name: name, eyes: st.variants.eyes, mouth: st.variants.mouth, brows: st.variants.brows, fx: st.variants.fx, parts: st.parts };
  }
  function publicTransitionSpec(fromPose, toPose, ms) {
    var a = poseState(fromPose), z = poseState(toPose);
    var spec = transitionSpec(a, z, num(ms, Motion().TOKENS.ms.base));
    spec.label = 'Transition';
    spec.startPose = stateToPose(a, typeof fromPose === 'string' ? fromPose : 'custom');
    spec.endPose = stateToPose(z, typeof toPose === 'string' ? toPose : 'custom');
    return spec;
  }

  var P = window.BraviloPlayer = {
    apply: apply,
    play: play,
    stop: stop,
    seek: seek,
    to: to,
    isPlaying: isPlaying,
    reducedMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    // helpers
    sample: sample,
    validate: validate,
    ease: ease,
    cubicBezier: cubicBezier,
    poseState: poseState,
    transitionSpec: publicTransitionSpec,
    state: function (coach) { return currentState(coach); },
    durationOf: function (anim) { var s = getSpec(anim); return s ? durationOf(s) : 0; },
    PARTS: PARTS,
    GROUPS: GROUPS,
    PROPS: PROPS
  };
})();
