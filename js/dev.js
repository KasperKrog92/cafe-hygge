/* Café Hygge — dev harness. Agent/debug tooling behind `window.__dev`.
   Inert in normal use: nothing here runs unless the URL carries ?dev
   (or ?hour= / ?overlay) or the console calls __dev.* — zero user-facing
   change. Loads between sim.js (whose SIM._ debug contract it consumes)
   and main.js (whose boot it decorates).

   URL params:
     ?dev          boot straight into the scene (overlay dismissed; audio
                   stays uninitialized until the first real click)
     ?hour=20      start the clock at 20:00 (works with or without ?dev)
     ?overlay      layout overlay on from the first frame

   Console API:
     __dev.hour(h)     jump the in-world clock (no arg: read it)
     __dev.ff(sec)     fast-forward the sim in 0.25 s ticks, muted
     __dev.spawn(o)    real patron with chosen traits, via the front door
     __dev.send(n,x,y) path an entity through the real makePath
     __dev.overlay(b)  toggle the layout overlay
     __dev.audit()     invariant sweep; returns (and warns) violations */
(function () {
  'use strict';

  const D = (window.__dev = {});
  const L = SCENE.L;
  const params = new URLSearchParams(location.search);
  const state = { overlay: params.has('overlay') };

  function world() { return window.__world; }

  /* content-safe bounds: the 16:9 crop minus the horizontal overscan strips */
  const SAFE = {
    x0: (SCENE.W - SCENE.VIEW_MIN_W) / 2,
    x1: SCENE.W - (SCENE.W - SCENE.VIEW_MIN_W) / 2,
    y0: SCENE.VIEW_Y,
    y1: SCENE.VIEW_Y + SCENE.VIEW_H
  };

  /* ---------- time control ---------- */

  function setHour(w, h) {
    w.t = ((h - SIM._.START_HOUR + 24) % 24) / 24 * SIM._.DAY_SECONDS;
    w.lastCapT = w.t - 10;                 // keep the caption gate sane across jumps
    if (w.activeCaption) w.activeCaption.born = w.t;
    SIM.update(w, 0);                      // recompute hour/palette immediately
  }

  D.hour = function (h) {
    if (h == null) return world().hour;
    setHour(world(), h);
    return world().hour;
  };

  /* Fast-forward by ticking the sim like the hidden-tab path (0.25 s steps,
     SND.update skipped). One-shots the sim fires are muted for the duration
     plus a beat, so a day's worth of door bells doesn't land at once. */
  let ffRestore = null;
  D.ff = function (seconds) {
    const w = world();
    if (SND.ready()) {
      if (ffRestore) clearTimeout(ffRestore.timer);
      else ffRestore = { muted: SND.settings.muted };
      SND.settings.muted = true;
      SND.applyVolume();
      ffRestore.timer = setTimeout(function () {
        SND.settings.muted = ffRestore.muted;
        SND.applyVolume();
        ffRestore = null;
      }, 1500);
    }
    for (let s = 0; s < seconds; s += 0.25) SIM.update(w, 0.25);
    return w.hour;
  };

  /* ---------- scenario forcing ---------- */

  /* A real patron through the real front-door flow, with chosen traits.
     opts: { wantsBook, ownBook, chatty, drink: 'espresso', name: 'Freja' } */
  D.spawn = function (opts) {
    opts = opts || {};
    const w = world();
    const p = SIM._.makePatron();
    ['wantsBook', 'ownBook', 'chatty'].forEach(function (k) {
      if (k in opts) p[k] = !!opts[k];
    });
    if (opts.name) p.name = opts.name;
    if (opts.drink) {
      const d = SIM._.DRINKS.find(function (d) { return d.name === opts.drink; });
      if (d) p.drink = d;
      else console.warn('[dev] unknown drink "' + opts.drink + '" — kept ' + p.drink.name);
    }
    p.state = 'enter';
    p.doorCloseT = 1.1;
    w.patrons.push(p);
    SIM._.ringDoor(w);
    p.queueIdx = w.queue.length;
    w.queue.push(p);
    const slot = SIM._.queueSlot(p.queueIdx);
    SIM._.makePath(p, slot.x, slot.y);
    return p;
  };

  /* Path an entity through the real makePath. Only states that run the
     walker will actually move (the cat is forced into 'walk'; a seated
     patron stays seated — this is a path tool, not a state override). */
  D.send = function (name, x, y) {
    const w = world();
    let e;
    if (/^cat$/i.test(name)) { e = w.cat; e.state = 'walk'; e.stateT = 0; }
    else if (w.barista.name === name) e = w.barista;
    else e = w.patrons.find(function (p) { return p.name === name; });
    if (!e) { console.warn('[dev] no entity named "' + name + '"'); return null; }
    SIM._.makePath(e, x, y);
    return e;
  };

  /* ---------- layout overlay ---------- */

  D.overlay = function (on) {
    state.overlay = on === undefined ? !state.overlay : !!on;
    return state.overlay;
  };

  /* every {x, y} pair reachable inside SCENE.L, with its dotted path */
  function eachAnchor(fn) {
    (function walk(o, path) {
      if (typeof o.x === 'number' && typeof o.y === 'number') fn(path, o);
      Object.keys(o).forEach(function (k) {
        if (k === 'occluders') return;
        const v = o[k];
        if (Array.isArray(v)) {
          v.forEach(function (it, i) {
            if (it && typeof it === 'object') walk(it, path + '.' + k + '[' + i + ']');
          });
        } else if (v && typeof v === 'object') walk(v, path + '.' + k);
      });
    })(L, 'L');
  }

  /* every point the sim sends a patron to walk to (Nora's behind-the-counter
     spots are by-design occluded and excluded) */
  function walkTargets(w) {
    const t = [];
    w.seats.forEach(function (s, i) { t.push({ x: s.x, y: s.y, name: 'seat[' + i + ']' }); });
    for (let i = 0; i < 7; i++) {           // spawn cap is 7 — audit the worst case
      const q = SIM._.queueSlot(i);
      t.push({ x: q.x, y: q.y, name: 'queueSlot(' + i + ')' });
      const ws = SIM._.waitSpot(i);
      t.push({ x: ws.x, y: ws.y, name: 'waitSpot(' + i + ')' });
    }
    w.tables.forEach(function (tb, i) {
      t.push({ x: tb.x + (tb.small ? -28 : 24), y: tb.y + 20, name: 'busSpot(table ' + i + ')' });
    });
    t.push({ x: L.library.browseSpot.x, y: L.library.browseSpot.y, name: 'browseSpot' });
    t.push({ x: L.doorSpot.x, y: L.doorSpot.y, name: 'doorSpot' });
    t.push({ x: L.orderSpot.x, y: L.orderSpot.y, name: 'orderSpot' });
    t.push({ x: L.pickupSpot.x, y: L.pickupSpot.y, name: 'pickupSpot' });
    return t;
  }

  function label(g, x, y, text, c) {
    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.fillText(text, x + 6, y + 3);
    g.fillStyle = c;
    g.fillText(text, x + 5, y + 2);
  }

  function cross(g, x, y, c) {
    g.fillStyle = c;
    g.fillRect(x - 4, y, 9, 1);
    g.fillRect(x, y - 4, 1, 9);
  }

  function dot(g, x, y, r, c) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  function drawOverlay(g, w) {
    g.save();
    g.font = '9px monospace';
    g.textBaseline = 'top';

    // 16:9 crop (white) and content-safe bounds (cyan)
    g.setLineDash([6, 4]);
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.strokeRect(0.5, SCENE.VIEW_Y + 0.5, SCENE.W - 1, SCENE.VIEW_H - 1);
    g.strokeStyle = 'rgba(80,220,255,0.9)';
    g.strokeRect(SAFE.x0 + 0.5, SAFE.y0 + 0.5, SAFE.x1 - SAFE.x0 - 1, SAFE.y1 - SAFE.y0 - 1);
    label(g, SAFE.x0 + 2, SAFE.y0 + 2, 'content-safe ' + SAFE.x0 + '–' + SAFE.x1 + ' / ' + SAFE.y0 + '–' + SAFE.y1, 'rgba(80,220,255,0.9)');

    // the walking lane
    g.setLineDash([2, 3]);
    g.strokeStyle = 'rgba(255,200,60,0.9)';
    g.beginPath();
    g.moveTo(0, L.lane + 0.5);
    g.lineTo(SCENE.W, L.lane + 0.5);
    g.stroke();
    label(g, 2, L.lane - 12, 'lane ' + L.lane, 'rgba(255,200,60,0.95)');
    g.setLineDash([]);

    // occluder boxes with their baselines
    L.occluders.forEach(function (o) {
      g.fillStyle = 'rgba(255,70,70,0.14)';
      g.fillRect(o.x0, o.top, o.x1 - o.x0, o.baseline - o.top);
      g.strokeStyle = 'rgba(255,70,70,0.8)';
      g.strokeRect(o.x0 + 0.5, o.top + 0.5, o.x1 - o.x0 - 1, o.baseline - o.top - 1);
      g.fillStyle = 'rgba(255,70,70,0.9)';
      g.fillRect(o.x0, o.baseline - 1, o.x1 - o.x0, 2);
      label(g, o.x0, o.top + 2, o.name + ' → ' + o.baseline, 'rgba(255,120,120,0.95)');
    });

    // every L anchor as a labeled crosshair
    eachAnchor(function (path, o) {
      cross(g, o.x, o.y, 'rgba(255,90,220,0.95)');
      label(g, o.x, o.y, path.slice(2), 'rgba(255,150,230,0.95)');
    });

    // seats (green free / red taken)
    w.seats.forEach(function (s, i) {
      dot(g, s.x, s.y, 3, s.taken ? 'rgba(255,90,90,0.95)' : 'rgba(80,230,120,0.95)');
      label(g, s.x, s.y - 12, 's' + i, s.taken ? 'rgba(255,120,120,0.9)' : 'rgba(120,230,150,0.9)');
    });

    // queue / wait / bus spots (orange)
    for (let i = 0; i < 4; i++) {
      const q = SIM._.queueSlot(i);
      dot(g, q.x, q.y, 2, 'rgba(255,160,40,0.95)');
      label(g, q.x, q.y, 'q' + i, 'rgba(255,180,80,0.9)');
      const ws = SIM._.waitSpot(i);
      dot(g, ws.x, ws.y, 2, 'rgba(255,160,40,0.95)');
      label(g, ws.x, ws.y, 'w' + i, 'rgba(255,180,80,0.9)');
    }
    w.tables.forEach(function (tb) {
      const bx = tb.x + (tb.small ? -28 : 24);
      dot(g, bx, tb.y + 20, 2, 'rgba(255,160,40,0.95)');
      label(g, bx, tb.y + 20, 'bus', 'rgba(255,180,80,0.9)');
    });

    g.restore();
  }

  // the overlay rides on the last draw call of the frame (after captions)
  const origDrawCaption = SCENE.drawCaption;
  SCENE.drawCaption = function (g, w) {
    origDrawCaption(g, w);
    if (state.overlay) drawOverlay(g, w);
  };

  /* ---------- invariant audit ---------- */

  const PAD = 9; // half a character's body width, for the occlusion check

  D.audit = function () {
    const w = world();
    const problems = [];

    // every L anchor inside content-safe bounds
    eachAnchor(function (path, o) {
      if (o.x < SAFE.x0 || o.x > SAFE.x1 || o.y < SAFE.y0 || o.y > SAFE.y1) {
        problems.push(path + ' (' + o.x + ',' + o.y + ') outside content-safe bounds x ' +
          SAFE.x0 + '–' + SAFE.x1 + ', y ' + SAFE.y0 + '–' + SAFE.y1);
      }
    });

    // every number in L is an integer (whole-pixel rule)
    (function ints(o, path) {
      Object.keys(o).forEach(function (k) {
        const v = o[k], p = path + '.' + k;
        if (typeof v === 'number') {
          if (!Number.isInteger(v)) problems.push(p + ' = ' + v + ' is not an integer');
        } else if (Array.isArray(v)) {
          v.forEach(function (it, i) {
            if (it && typeof it === 'object') ints(it, p + '[' + i + ']');
            else if (typeof it === 'number' && !Number.isInteger(it)) problems.push(p + '[' + i + '] = ' + it + ' is not an integer');
          });
        } else if (v && typeof v === 'object') ints(v, p);
      });
    })(L, 'L');

    // walk targets: in bounds, integer, and never hidden behind an occluder
    walkTargets(w).forEach(function (t) {
      if (t.x < SAFE.x0 || t.x > SAFE.x1 || t.y < SAFE.y0 || t.y > SAFE.y1) {
        problems.push('walk target ' + t.name + ' (' + t.x + ',' + t.y + ') outside content-safe bounds');
      }
      if (!Number.isInteger(t.x) || !Number.isInteger(t.y)) {
        problems.push('walk target ' + t.name + ' (' + t.x + ',' + t.y + ') is not on whole pixels');
      }
      L.occluders.forEach(function (o) {
        if (t.x >= o.x0 - PAD && t.x <= o.x1 + PAD && t.y > o.top && t.y < o.baseline) {
          problems.push('walk target ' + t.name + ' (' + t.x + ',' + t.y + ') hides behind the ' +
            o.name + ' (x ' + o.x0 + '–' + o.x1 + ', baseline ' + o.baseline + ')');
        }
      });
    });

    // seats reference existing tables; nook seats pair with small side tables
    w.seats.forEach(function (s, i) {
      if (s.table >= 0) {
        const tb = w.tables[s.table];
        if (!tb) problems.push('seat[' + i + '] references missing table ' + s.table);
        else if (s.nook && !tb.small) problems.push('seat[' + i + '] is a nook seat but table ' + s.table + ' is not a small side table');
        else if (!s.nook && tb.small) problems.push('seat[' + i + '] points at small side table ' + s.table + ' but is not a nook seat');
      } else if (!s.armchair) {
        problems.push('seat[' + i + '] has no table and is not an armchair');
      }
    });

    // the hard-won constants
    if (L.baristaHome.y !== 286) problems.push('L.baristaHome.y = ' + L.baristaHome.y + ' (must be 286 — the counter swallows her below that; see AGENTS.md)');
    if (L.lane !== 368) problems.push('L.lane = ' + L.lane + ' (the walking lane is 368; see AGENTS.md)');
    if (!Array.isArray(L.occluders) || L.occluders.length < 2) problems.push('L.occluders missing or incomplete (expect at least bookshelf + counter)');

    if (problems.length) {
      console.warn('[dev] audit: ' + problems.length + ' problem(s)');
      problems.forEach(function (p) { console.warn('  - ' + p); });
    } else {
      console.log('[dev] audit: 0 problems');
    }
    return problems;
  };

  /* ---------- boot ---------- */

  // ?hour= — applied to the world the moment main.js creates it
  const hourParam = params.has('hour') ? parseFloat(params.get('hour')) : NaN;
  if (!isNaN(hourParam)) {
    const origCreate = SIM.create;
    SIM.create = function () {
      const w = origCreate.apply(this, arguments);
      setHour(w, hourParam);
      return w;
    };
  }

  // ?dev — straight into the scene: overlay dismissed, audio untouched until
  // a real click (autoplay policy). The click reuses main.js's own enter
  // handler so init + controls behave exactly as the normal path.
  if (params.has('dev')) {
    document.getElementById('overlay').classList.add('gone');
    document.addEventListener('click', function () {
      document.getElementById('enter').click();
    }, { once: true });
  }
})();
