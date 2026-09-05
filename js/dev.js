/* Café Hygge — dev harness. Agent/debug tooling behind `window.__dev`.
   Inert in normal use: nothing here runs unless the URL carries ?dev
   (or ?hour= / ?overlay) or the console calls __dev.* — zero user-facing
   change. Loads after the sim siblings (whose SIM._ debug contract it consumes)
   before main.js (whose boot it decorates).

   URL params:
     ?dev          boot straight into the scene (overlay dismissed; audio
                   stays uninitialized until the first real click)
     ?hour=20      start the clock at 20:00 (works with or without ?dev)
     ?overlay      layout overlay on from the first frame
     ?audit        run the invariant sweep after boot and expose its count on
                   documentElement.dataset.auditProblems
     ?arc=id&stage=n&progress=n[&ready]  boot a saved arc state for screenshots

   Console API:
     __dev.hour(h)     jump the in-world clock (no arg: read it)
     __dev.study(o)    detached art world ({hour, rain, seats:[indices]})
     __dev.review(o)   ten repeatable PNGs: day/night/empty/people + six crops
     __dev.poses()     roster turnarounds through the real person renderer
     __dev.kettle()    re-arm the evening kettle to sound shortly
     __dev.storm(on)   force the weather into/out of a storm
     __dev.passer(o)   silhouette past the windows ({dir, umbrella, pair, pause})
     __dev.ff(sec)     fast-forward the sim in 0.25 s ticks, muted
     __dev.spawn(o)    real patron with chosen traits, via the front door
     __dev.regular(id) force a named regular's next arrival (default 'holger')
     __dev.arc(id,o)   inspect/nudge a story arc ({ready:true} → invitation now)
     __dev.age(days)   advance every active arc by n café days
     __dev.memory()    read the persisted MEMORY save
     __dev.reset()     wipe the save and reload into a fresh café
     __dev.doze()      put the first eligible reader to sleep
     __dev.piano(on)   force/stop the corner-piano sound engine
     __dev.fire(level) read/set the hearth's live burn 0..1 (low → tend loop)
     __dev.send(n,x,y) path an entity through the real makePath
     __dev.noraDo(name) force a Nora ritual on her next idle task ('fire' too)
     __dev.catDo(name) force a cat ritual on the next simulation tick
     __dev.bowls(f,w)  set the cat's food and water bowl levels
     __dev.overlay(b)  toggle the layout overlay
     __dev.shot(t,o)   headless render → PNG data URL, independent of the rAF
                       loop / tab visibility / preview pane. t: a region name
                       ('fireside','nook','counter','window0','window1','door',
                       'hearth','bookshelf','piano'), an entity name ('nora',
                       'cat', a patron), or a {x,y,w,h,scale} crop; no arg = the
                       whole 960×600 scene. o: {scale}
     __dev.regions     the named crop boxes shot(name) understands
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
    SIM._.snapCandles(w);                  // jumps show the destination, not a missed ritual
  }

  D.hour = function (h) {
    if (h == null) return world().hour;
    setHour(world(), h);
    return world().hour;
  };

  D.kettle = function () {
    const w = world();
    w.kettle.day = SIM._.dayIndex(w);
    w.kettle.hour = Math.min(23.99, w.hour + SIM._.rnd(0.05, 0.25));
    w.kettle.firedDay = -1;
    return w.kettle.hour;
  };

  D.storm = function (on) {
    const w = world();
    on = on === undefined ? true : !!on;
    if (on) {
      if (!w.storm) SIM._.caption(w, 'the sky darkens; a storm settles over the street.');
      SND.settings.rain = true;
      w.storm = true; w.rainTarget = 1; w.rain = Math.max(0.65, w.rain);
      w.weatherT = SIM._.rnd(150, 420);
      w.thunderT = SIM._.rnd(3, 10); w.thunderIn = 0; w.flash = 0;
    } else {
      w.storm = false;
      if (w.rainTarget > 0.8) w.rainTarget = 0.4;
      w.weatherT = SIM._.rnd(150, 420);
      w.thunderT = 0; w.thunderIn = 0; w.flash = 0;
    }
    return w.storm;
  };

  /* A street silhouette on demand: dir ±1, umbrella/pair/pause booleans. */
  D.passer = function (opts) {
    return SIM._.spawnPasser(world(), opts || {});
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
     opts adds umbrella, laptop, pianist and couple to the reader traits. */
  D.spawn = function (opts) {
    opts = opts || {};
    const w = world();
    if (opts.couple) return SIM._.spawnCouple(w, opts);
    const p = SIM._.makePatron(opts.name);
    ['wantsBook', 'ownBook', 'chatty', 'pianist'].forEach(function (k) {
      if (k in opts) p[k] = !!opts[k];
    });
    if (opts.pianist) { p.wantsBook = false; p.laptop = false; }
    if ('laptop' in opts) p.laptop = !!opts.laptop;
    if (opts.umbrella) {
      p.umbrella = { color: typeof opts.umbrella === 'string' ? opts.umbrella : '#3d4a5c' };
    }
    if (opts.drink) {
      const d = SIM._.DRINKS.find(function (d) { return d.name === opts.drink; });
      if (d) p.drink = d;
      else console.warn('[dev] unknown drink "' + opts.drink + '" — kept ' + p.drink.name);
    }
    return SIM._.enqueueArrival(w, p, 0, true);
  };

  D.regular = function (id) {
    id = id || 'holger';
    const spec = (window.CAST && CAST.regulars || []).find(function (r) { return r.id === id; });
    if (!spec) { console.warn('[dev] unknown regular "' + id + '"'); return null; }
    const w = world();
    const present = w.patrons.find(function (p) { return p.regularId === id; });
    if (present) return present;
    if (!w.regulars[id]) { console.warn('[dev] "' + id + '" has no schedule slot'); return null; }
    w.regulars[id].force = true;
    SIM._.updateRegulars(w);
    return w.patrons.find(function (p) { return p.regularId === id; }) || null;
  };

  /* Inspect or nudge a story arc's saved state (docs/narrative.md §2). No opts
     → return the record. { ready:true } → jump it to a waiting invitation now
     (progress at threshold, beat pending). Also takes { progress, stage,
     pendingBeat }. Persists via MEMORY. */
  D.arc = function (id, opts) {
    const w = world();
    if (!w.memory) { console.warn('[dev] no MEMORY bound to the world'); return null; }
    const def = ((window.CAST && CAST.arcs) || []).find(function (a) { return a.id === id; });
    if (id && !def && !w.memory.arcs[id]) { console.warn('[dev] unknown arc "' + id + '"'); return null; }
    let rec = w.memory.arcs[id];
    if (!rec) { rec = { stage: 0, progress: 0, pendingBeat: null }; w.memory.arcs[id] = rec; }
    if (!opts) return rec;
    if (opts.ready) {
      const stages = def ? SIM._.arcStages(def) : 1;
      if (rec.stage >= stages) rec.stage = stages - 1;   // re-open the last stage
      if (def) rec.progress = SIM._.arcRows(def, rec.stage);
      rec.pendingBeat = 'finished';
    }
    if ('progress' in opts) rec.progress = opts.progress;
    if ('stage' in opts) rec.stage = opts.stage;
    if ('pendingBeat' in opts) rec.pendingBeat = opts.pendingBeat;
    if (window.MEMORY) MEMORY.saveNow();
    return rec;
  };

  /* Advance every active arc by `days` café days — the same growth path the
     live narrative tick uses (arcs ride the café's own clock; a closed café
     holds still, so there are no "days away" to simulate any more). */
  D.age = function (days) {
    const w = world();
    if (!w.memory) { console.warn('[dev] no MEMORY bound to the world'); return null; }
    SIM._.advanceArcs(w, days || 1);
    if (window.MEMORY) MEMORY.saveNow();
    return w.memory.arcs;
  };

  D.memory = function () { return window.MEMORY ? MEMORY.state : null; };

  /* Wipe the save and reload into a fresh café — the same graceful-fallback
     path a cleared or expired save takes on its own. */
  D.reset = function () {
    if (window.MEMORY) MEMORY.reset();
    try { location.reload(); } catch (e) {}
  };

  D.doze = function () {
    const w = world();
    const p = w.patrons.find(function (p) {
      return p.state === 'seated' && p.reading && p.seat && (p.seat.armchair || p.seat.nook) && !p.laptop;
    });
    if (!p) { console.warn('[dev] no eligible seated reader to doze'); return null; }
    SIM._.startDoze(w, p);
    return p;
  };

  D.piano = function (on) {
    on = on === undefined ? true : !!on;
    if (on) SND.pianoStart('patron'); else SND.pianoStop();
    return SND.pianoActive();
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

  D.catDo = function (action) {
    const allowed = ['eat', 'window', 'bookshelf', 'counter', 'topShelf', 'piano', 'lap', 'mote', 'knead'];
    if (allowed.indexOf(action) < 0) {
      console.warn('[dev] unknown cat behavior "' + action + '"');
      return null;
    }
    const w = world(), cat = w.cat, reset = L.catSpots[2];
    if (cat.lapPatron) cat.lapPatron.lapCat = false;
    cat.x = reset.x; cat.y = reset.y; cat.target = reset;
    cat.surface = 'floor'; cat.state = 'sit'; cat.stateT = 0; cat.path = null;
    cat.hopQueue = null; cat.hopAfter = null; cat.lapPatron = null;
    cat.waitingBowl = ''; cat.forced = action;
    return cat;
  };

  D.noraDo = function (action) {
    const allowed = ['stretch', 'chalk', 'water', 'candles', 'fire', 'piano'];
    if (allowed.indexOf(action) < 0) {
      console.warn('[dev] unknown Nora behavior "' + action + '"');
      return null;
    }
    const w = world(), b = w.barista;
    b.forcedTask = action;
    b.idleT = 0;
    if (action === 'chalk') b.chalkT = 0;
    else if (action === 'water') b.wateringPending = true;
    else if (action === 'fire') { w.fire.wantsLog = true; w.fire.claimed = false; }
    else if (action === 'candles') {
      SIM._.candleTables(w).forEach(function (tb) { tb.candle = 0; tb.candleTarget = 0; });
      w.candles.mantel = 0; w.candles.mantelTarget = 0;
      w.candles.forceRound = true;
      b.candlePending = true; b.matchStruck = false; b.candleCaptioned = false;
    }
    return b;
  };

  /* Read or set the hearth's live burn (0..1). Setting it low is the quickest
     way to watch the tend loop: `__dev.fire(0.2)` drops it near embers, then a
     fireside regular or Nora lays a fresh log after the usual patient grace. */
  D.fire = function (level) {
    const w = world();
    if (level == null) return w.fire.level;
    level = Math.max(0, Math.min(1, Number(level)));
    w.fire.level = level; w.fire.target = level;
    w.fire.wantsLog = false; w.fire.claimed = false; w.fire.graceT = 0;
    return w.fire.level;
  };

  D.bowls = function (food, water) {
    const w = world();
    if (water == null) water = food;
    w.catBowls.food = Math.max(0, Math.min(1, Number(food)));
    w.catBowls.water = Math.max(0, Math.min(1, Number(water)));
    w.barista.idleT = 0;
    return { food: w.catBowls.food, water: w.catBowls.water };
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
        if (k === 'occluders' || k === 'footprints') return;
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
    w.seats.forEach(function (s, i) { t.push({ x: s.x, y: s.y, via: s.via, name: 'seat[' + i + ']' }); });
    for (let i = 0; i < 7; i++) {           // spawn cap is 7 — audit the worst case
      const q = SIM._.queueSlot(i);
      t.push({ x: q.x, y: q.y, name: 'queueSlot(' + i + ')' });
      const ws = SIM._.waitSpot(i);
      t.push({ x: ws.x, y: ws.y, name: 'waitSpot(' + i + ')' });
    }
    w.tables.forEach(function (tb, i) {
      const route = SIM._.busRoute(w, i);
      const end = route[route.length - 1];
      t.push({ x: end.x, y: end.y, name: 'busSpot(table ' + i + ')' });
    });
    t.push({ x: L.library.browseSpot.x, y: L.library.browseSpot.y, name: 'browseSpot' });
    t.push({ x: L.doorSpot.x, y: L.doorSpot.y, name: 'doorSpot' });
    t.push({ x: L.umbrellaSpot.x, y: L.umbrellaSpot.y, name: 'umbrellaSpot' });
    t.push({ x: L.orderSpot.x, y: L.orderSpot.y, name: 'orderSpot' });
    t.push({ x: L.pickupSpot.x, y: L.pickupSpot.y, name: 'pickupSpot' });
    t.push({ x: L.returnSpot.x, y: L.returnSpot.y, name: 'returnSpot' });
    t.push({ x: L.artist.watch.x, y: L.artist.watch.y, name: 'artistWatch' });
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

    // furniture footprints (the journey check's no-go floor boxes)
    L.footprints.forEach(function (f) {
      g.strokeStyle = 'rgba(120,170,255,0.5)';
      g.strokeRect(f.x0 + 0.5, f.y0 + 0.5, f.x1 - f.x0 - 1, f.y1 - f.y0 - 1);
    });

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
    w.tables.forEach(function (tb, i) {
      const route = SIM._.busRoute(w, i);
      const end = route[route.length - 1];
      dot(g, end.x, end.y, 2, 'rgba(255,160,40,0.95)');
      label(g, end.x, end.y, 'bus', 'rgba(255,180,80,0.9)');
    });

    g.restore();
  }

  // the overlay rides on the last draw call of the frame (after captions)
  const origDrawCaption = SCENE.drawCaption;
  SCENE.drawCaption = function (g, w) {
    origDrawCaption(g, w);
    if (state.overlay) drawOverlay(g, w);
  };

  /* ---------- headless render-to-image (docs/plans/llm-dev-ergonomics.md) ---------- */

  /* clamp {x0,y0}→{x1,y1} to the master and snap to whole pixels → {x,y,w,h} */
  function span(x0, y0, x1, y1) {
    x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(SCENE.W, Math.round(x1)); y1 = Math.min(SCENE.H, Math.round(y1));
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  }

  /* Named crop boxes in master coordinates — one source of truth for
     __dev.shot(name), derived from SCENE.L so they can't drift from the art.
     Every box is clamped in-bounds (Phase 2). */
  const regions = (function () {
    const axs = L.armchairs.map(function (a) { return a.x; });
    const lib = L.library;
    const nxs = lib.chairs.map(function (c) { return c.x; })
      .concat(lib.sideTables.map(function (s) { return s.x; }), lib.lamps.map(function (p) { return p.x; }));
    const nys = lib.chairs.map(function (c) { return c.y; })
      .concat(lib.sideTables.map(function (s) { return s.y; }), lib.lamps.map(function (p) { return p.y; }));
    const c = L.counter, f = L.fire, sh = lib.shelf, pn = L.piano, d = L.door, ar = L.artist;
    function winRegion(wn) { return span(wn.x - 24, wn.y - 16, wn.x + wn.w + 24, 268); }
    return {
      fireside: span(Math.min.apply(null, axs) - 52, 232, Math.max.apply(null, axs) + 52, 340),
      nook: span(Math.min.apply(null, nxs) - 40, Math.min.apply(null, nys) - 72,
                 Math.max.apply(null, nxs) + 40, Math.max.apply(null, nys) + 28),
      counter: span(c.x - 20, 90, c.x + c.w + 12, c.baseY + 20),
      window0: winRegion(L.win),
      window1: winRegion(L.win2),
      door: span(d.x - 20, d.y - 16, d.x + d.w + 60, 336),
      hearth: span(f.x - 12, 96, f.x + f.w + 40, f.stand.y + 20),
      bookshelf: span(sh.x - sh.w / 2 - 12, sh.y - sh.h - 32, sh.x + sh.w / 2 + 12, sh.y + 16),
      piano: span(pn.x - 10, pn.lamp.y - 24, pn.bench.x + 20, pn.baseline + 16),
      artist: span(ar.easel.canvas.x - 18, ar.easel.canvas.y - 16, ar.watch.x + 28, ar.watch.y + 20)
    };
  })();
  D.regions = regions;

  /* A detached, repeatable art fixture. Never SIM.create/update: those can
     write MEMORY, play sounds or consume randomness. Only this copy is posed;
     real seats/paths/colours and the shipping composeFrame still do the work.
     Custom seat indices let a review cover any occupancy without a live wait. */
  D.study = function (opts) {
    opts = opts || {};
    if (opts.seats && opts.seats.length > 7) throw new Error('[dev] study keeps the seven-patron cap');
    const w = structuredClone(world());
    w.t = 180; w.hour = opts.hour == null ? 12 : Number(opts.hour);
    w.pal = SCENE.dayPalette(w.hour); w.daylight = w.pal.daylight;
    w.rain = w.rainTarget = opts.rain == null ? 0.35 : opts.rain;
    w.storm = false; w.flash = 0; w.passersby = []; w.particles = [];
    w.door = { open: 0, target: 0, jiggle: 0 };
    w.brew = { active: false, stage: '', progress: 0 };
    w.fire = { level: 0.85, target: 0.85, wantsLog: false, claimed: false, graceT: 0 };
    w.queue = []; w.counterCups = []; w.umbrellaStand = []; w.sleeper = null;
    w.captionQueue = []; w.captionScript = []; w.activeCaption = null;
    w.catBowls = { food: 1, water: 1 };
    w.memory = { version: MEMORY.VERSION, arcs: {}, bonds: {}, flags: {} };
    CAST.arcs.forEach(function (a) {
      w.memory.arcs[a.id] = { stage: 0, progress: 0, pendingBeat: null };
    });
    // Half-painted canvas, never a completed/unseen narrative payoff.
    w.memory.arcs['lunafreya-paintings'].progress = SIM._.arcRows(
      CAST.arcs.find(function (a) { return a.id === 'lunafreya-paintings'; }), 0) * 0.55;
    w.tables.forEach(function (tb) { tb.items = []; });
    w.seats.forEach(function (s) { s.taken = false; });
    w.patrons = [];
    (opts.seats || [8, 9, 10, 11, 1, 16, 17]).forEach(function (index, i) {
      const s = w.seats[index];
      if (!s || s.taken) throw new Error('[dev] invalid/duplicate study seat: ' + index);
      const spec = CAST.regulars[i % CAST.regulars.length];
      const p = {
        id: -(i + 1), kind: 'patron', name: 'Study ' + index,
        nameStyle: spec.nameStyle, colors: structuredClone(spec.colors),
        x: s.window ? s.perchX : s.x, y: s.window ? s.perchY : s.y,
        facing: s.facing, heading: '', pose: 'sit', state: 'seated', animT: 0,
        seat: s, reading: !s.artist && !s.piano, painting: !!s.artist,
        playing: !!s.piano, hasShelfBook: !!s.nook,
        drink: SIM._.DRINKS[0], holding: null, armUp: 0, bubble: null
      };
      if (s.artist) p.colors = structuredClone(CAST.regulars.find(function (r) { return r.id === 'lunafreya'; }).colors);
      s.taken = true; w.patrons.push(p);
      if (s.table >= 0) w.tables[s.table].items.push({
        side: s.side, kind: 'cup', owner: p.id, hot: 0, hidden: false
      });
    });
    w.barista = { kind: 'barista', name: 'Nora', colors: structuredClone(world().barista.colors),
      x: L.baristaHome.x, y: L.baristaHome.y, facing: -1, heading: 'down',
      pose: 'stand', state: 'idle', animT: 0, orders: [], holding: null };
    w.cat = { x: L.catCorner.cushion.x, y: L.catCorner.cushion.y - 2,
      state: 'sleep', surface: 'floor', facing: 1, animT: 0, scarf: null };
    SIM._.snapCandles(w);
    return w;
  };

  /* Capture a fixed scene at both times plus native-integer detail crops.
     Plain data URLs make this usable from any browser tool or the console. */
  D.review = function (opts) {
    opts = opts || {};
    const shots = {}, day = D.study(opts);
    shots.day = D.shot(null, { world: day, scale: 1 });
    ['fireside', 'nook', 'bookshelf', 'counter', 'artist', 'piano'].forEach(function (name) {
      shots[name] = D.shot(name, { world: day, scale: 3 });
    });
    const night = D.study(Object.assign({}, opts, { hour: 20 }));
    shots.night = D.shot(null, { world: night, scale: 1 });
    shots.empty = D.shot(null, { world: D.study(Object.assign({}, opts, { seats: [] })), scale: 1 });
    shots.people = D.poses();
    return shots;
  };

  /* Character turnarounds at exact x2: the roster's actual colours and the
     shipping person renderer. Complements scene crops, never replaces them. */
  D.poses = function () {
    const out = document.createElement('canvas'); out.width = 960; out.height = 850;
    const g = out.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#e3cfa7'; g.fillRect(0, 0, out.width, out.height);
    const people = [{ name: 'Nora', colors: world().barista.colors }].concat(CAST.regulars);
    const views = ['right', 'left', 'front', 'back', 'reading'];
    people.forEach(function (spec, col) {
      views.forEach(function (view, row) {
        const x = col * 160, y = row * 170;
        g.fillStyle = '#c9b28a'; g.fillRect(x + 4, y + 4, 152, 162);
        g.save(); g.translate(x + 80, y + 146); g.scale(2, 2);
        SCENE.drawPerson(g, { x: 0, y: 0, colors: spec.colors,
          kind: col ? 'patron' : 'barista', pose: row === 4 ? 'sit' : 'stand',
          facing: row === 1 ? -1 : 1, heading: row === 2 ? 'down' : row === 3 ? 'up' : '',
          animT: 0, reading: row === 4, holding: null });
        g.restore(); g.font = '10px monospace'; g.fillStyle = '#4a3222';
        g.fillText(spec.name + ' / ' + view, x + 10, y + 166);
      });
    });
    return out.toDataURL('image/png');
  };

  /* A crop box around a named entity's sprite (feet at e.y, ~1 CH tall):
     'nora'/'barista', 'cat', or any patron by name or regularId. */
  function entityBox(w, name) {
    const lc = String(name).toLowerCase();
    let e = null;
    if (lc === 'nora' || lc === 'barista') e = w.barista;
    else if (lc === 'cat') e = w.cat;
    else e = w.patrons.find(function (p) {
      return (p.name && p.name.toLowerCase() === lc) || p.regularId === name;
    });
    return e ? span(e.x - 48, e.y - 76, e.x + 48, e.y + 20) : null;
  }

  /* Render the live world to a fresh offscreen 960×600 canvas exactly as
     main.js does (SCENE.composeFrame — same draw list, so no drift), crop it,
     and upscale by an integer with nearest-neighbour (pixel art). Returns a
     `data:image/png` URL and logs its length. Works with the tab hidden and
     the preview pane closed — this is the supported headless capture.
       __dev.shot()                  whole 960×600 scene
       __dev.shot('fireside')        a named region (D.regions)
       __dev.shot('nora')            cropped around a named entity
       __dev.shot({x,y,w,h,scale})   an arbitrary crop
     opts (2nd arg): { scale, world } — integer upscale; default keeps the
     crop readable. `world` optionally renders a detached __dev.study(). */
  D.shot = function (target, opts) {
    opts = opts || {};
    const w = opts.world || world();
    if (!w) { console.warn('[dev] no world yet — load ?dev first'); return null; }

    let box, name;
    if (target == null) {
      box = { x: 0, y: 0, w: SCENE.W, h: SCENE.H }; name = 'scene';
    } else if (typeof target === 'string') {
      name = target;
      box = regions[target] || entityBox(w, target);
      if (!box) {
        console.warn('[dev] unknown shot target "' + target + '" — regions: ' +
          Object.keys(regions).join(', ') + '; or an entity (nora, cat, a patron)');
        return null;
      }
    } else {
      box = span(target.x || 0, target.y || 0,
                 (target.x || 0) + (target.w || SCENE.W), (target.y || 0) + (target.h || SCENE.H));
      name = 'crop'; if (target.scale) opts.scale = target.scale;
    }
    if (box.w <= 0 || box.h <= 0) { console.warn('[dev] shot crop is empty'); return null; }

    const scale = opts.scale ? Math.max(1, opts.scale | 0)
      : Math.max(1, Math.min(8, Math.floor(640 / Math.max(box.w, box.h)) || 1));

    const master = document.createElement('canvas');
    master.width = SCENE.W; master.height = SCENE.H;
    const mg = master.getContext('2d');
    mg.imageSmoothingEnabled = false;
    SCENE.composeFrame(mg, w);

    const out = document.createElement('canvas');
    out.width = box.w * scale; out.height = box.h * scale;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(master, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);

    const url = out.toDataURL('image/png');
    console.log('[dev] shot ' + name + ' ' + box.w + '×' + box.h + ' ×' + scale +
      ' → ' + out.width + '×' + out.height + ' png (' + url.length + ' chars)');
    return url;
  };

  /* ---------- invariant audit ---------- */

  const PAD = 9; // half a character's body width, for occlusion/journey checks

  /* occluders and footprints, normalized to {name, x0, x1, y0, y1} */
  function noGoBoxes() {
    return L.occluders.map(function (o) {
      return { name: o.name, x0: o.x0, x1: o.x1, y0: o.top, y1: o.baseline };
    }).concat(L.footprints);
  }

  /* does the walk segment a→b (feet coordinates) cut through the box?
     Axis-aligned segments get exact tests; anything diagonal is sampled. */
  function segHitsBox(a, b, box, pad) {
    pad = pad == null ? PAD : pad;
    const bx0 = box.x0 - pad, bx1 = box.x1 + pad;
    if (a.y === b.y) {
      if (a.y <= box.y0 || a.y >= box.y1) return false;
      return Math.max(a.x, b.x) >= bx0 && Math.min(a.x, b.x) <= bx1;
    }
    if (a.x === b.x) {
      if (a.x < bx0 || a.x > bx1) return false;
      return Math.max(a.y, b.y) > box.y0 && Math.min(a.y, b.y) < box.y1;
    }
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
    for (let i = 0; i <= steps; i++) {
      const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
      if (x >= bx0 && x <= bx1 && y > box.y0 && y < box.y1) return true;
    }
    return false;
  }

  /* check every leg of a route against the no-go boxes; boxes that contain
     the destination are that stop's own furniture (a seat inside its chair,
     a bus spot beside its table) and are skipped, as are explicitly
     exempted boxes (Nora's routes legitimately start inside the counter). */
  function routeProblems(route, dest, label, exemptNames, allowInside, problems, pad) {
    pad = pad == null ? PAD : pad;
    noGoBoxes().forEach(function (box) {
      if (exemptNames && exemptNames.indexOf(box.name) >= 0) return;
      const ownBox = dest.x >= box.x0 - pad && dest.x <= box.x1 + pad &&
                     dest.y >= box.y0 && dest.y <= box.y1;
      if (ownBox) {
        if (!allowInside) {
          problems.push(label + ' (' + dest.x + ',' + dest.y + ') stands inside the ' + box.name +
            ' footprint (x ' + box.x0 + '–' + box.x1 + ', y ' + box.y0 + '–' + box.y1 + ')');
        }
        return; // own furniture: the final approach may cross it
      }
      if (box.passable) return; // torso-height table: depth sort renders passes fine
      for (let i = 1; i < route.length; i++) {
        if (segHitsBox(route[i - 1], route[i], box, pad)) {
          problems.push('route to ' + label + ' cuts through the ' + box.name +
            ' (leg ' + route[i - 1].x + ',' + route[i - 1].y + ' → ' + route[i].x + ',' + route[i].y + ')');
          return;
        }
      }
    });
  }

  D.audit = function (reviewWorld) {
    const w = reviewWorld || world();
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

    // journeys: the L-shaped walk to every target (lane-first, via the real
    // makePath) must not cut through an occluder or furniture footprint.
    // Seats and bus spots may end inside their own furniture's box; nothing
    // else may. Bus spots are excluded here — Nora reaches them by her own
    // routes, checked next.
    walkTargets(w).forEach(function (t) {
      if (/^busSpot/.test(t.name) || t.name === 'umbrellaSpot') return;
      const scratch = { x: L.doorSpot.x, y: L.lane, path: null, pose: 'stand', facing: 1, speed: 0 };
      // window seats with a declared clear column descend there first,
      // exactly as the sim's seatPath does
      SIM._.makePath(scratch, t.via || t.x, t.y);
      if (t.via) scratch.path.push({ x: t.x, y: t.y });
      const route = [{ x: scratch.x, y: scratch.y }].concat(scratch.path);
      routeProblems(route, t, t.name, null, /^seat\[/.test(t.name), problems);
    });

    // Nora's bus routes (shared with the sim via SIM._.busRoute): she starts
    // behind the counter by design, so the counter box is exempt
    w.tables.forEach(function (tb, i) {
      const route = SIM._.busRoute(w, i);
      const end = route[route.length - 1];
      routeProblems(route, end, 'busSpot(table ' + i + ')', ['counter'], true, problems);
    });

    ['doorToUmbrella', 'umbrellaApproach', 'umbrellaToDoor'].forEach(function (name) {
      const route = L.patronRoutes[name];
      routeProblems(route, route[route.length - 1], 'patron route ' + name, null, false, problems);
    });

    // Nora's bowl-refill route shares the same declared geometry as bussing.
    const refill = SIM._.refillRoute();
    const refillEnd = refill[refill.length - 1];
    routeProblems(refill, refillEnd, 'cat bowl refill', ['counter', 'cat corner'], true, problems);

    // Nora's three-stop watering round and full candle circuit are declared
    // by the sim, so this checks the geometry she actually walks.
    for (let i = 0; i < 3; i++) {
      const water = SIM._.waterRoute(i);
      const waterEnd = water[water.length - 1];
      routeProblems(water, waterEnd, 'watering stop ' + i, ['counter'], i === 0, problems);
    }
    const candles = SIM._.candleRoute(w);
    const candleEnd = candles[candles.length - 1];
    routeProblems(candles, candleEnd, 'candle round', ['counter'], true, problems);
    const piano = SIM._.pianoRoute();
    const pianoEnd = piano[piano.length - 1];
    routeProblems(piano, pianoEnd, 'Nora piano route', ['counter'], true, problems);
    const fire = SIM._.fireRoute();
    const fireEnd = fire[fire.length - 1];
    routeProblems(fire, fireEnd, 'Nora fire-tending route', ['counter'], true, problems);

    // Cat floor stops obey floor collision rules; aerial anchors are checked
    // against their declared surface instead. The cushion is deliberately
    // inside the cat-only corner footprint and is the sole floor exemption.
    const catStops = L.catSpots.concat([
      { id: 'window1Stand', x: L.catPerches.windows[0].stand.x, y: L.catPerches.windows[0].stand.y },
      { id: 'window2Stand', x: L.catPerches.windows[1].stand.x, y: L.catPerches.windows[1].stand.y },
      { id: 'bookshelfStand', x: L.catPerches.bookshelf.stand.x, y: L.catPerches.bookshelf.stand.y },
      { id: 'bookshelfEscape', x: L.catPerches.bookshelf.escape.x, y: L.catPerches.bookshelf.escape.y },
      { id: 'counterStand', x: L.catPerches.counter.stand.x, y: L.catPerches.counter.stand.y },
      { id: 'topShelfStand', x: L.catPerches.topShelf.stand.x, y: L.catPerches.topShelf.stand.y },
      { id: 'pianoStand', x: L.catPerches.piano.stand.x, y: L.catPerches.piano.stand.y },
      { id: 'pianoDismount', x: L.piano.dismount.x, y: L.piano.dismount.y,
        approach: L.catRoutes.pianoDismount },
      { id: 'eat', x: L.catCorner.eatSpot.x, y: L.catCorner.eatSpot.y, catCorner: true }
    ]);
    w.seats.filter(function (s) { return s.armchair || s.nook; }).forEach(function (seat, i) {
      const lap = { id: 'lapStand' + i, x: seat.x + seat.facing * 38, y: seat.y + 16 };
      lap.approach = [{ x: lap.x, y: L.lane }];
      catStops.push(lap);
    });
    catStops.forEach(function (stop) {
      routeProblems([{ x: stop.x, y: stop.y }], stop, 'cat stop ' + stop.id,
        stop.catCorner ? ['cat corner'] : null, !!stop.catCorner, problems, 6);
    });
    catStops.forEach(function (from) {
      catStops.forEach(function (to) {
        if (from === to) return;
        const route = [{ x: from.x, y: from.y }].concat(SIM._.catRoute(from, to));
        const exempt = (from.catCorner || to.catCorner || from.id === 'cushion' || to.id === 'cushion')
          ? ['cat corner'] : null;
        routeProblems(route, to, 'cat ' + from.id + ' → ' + to.id, exempt, false, problems, 6);
      });
    });

    L.catPerches.windows.forEach(function (p, i) {
      const win = i ? L.win2 : L.win;
      if (p.anchor.y !== win.y + win.h + 12 || p.anchor.x < win.x || p.anchor.x > win.x + win.w) {
        problems.push('cat window perch ' + i + ' is not anchored on its sill');
      }
    });
    if (L.catPerches.bookshelf.anchor.y !== L.library.shelf.y - L.library.shelf.h + 4) {
      problems.push('cat bookshelf perch is not anchored on the shelf top');
    }
    if (L.catPerches.counter.anchor.y !== L.counter.slabY + 2 ||
        L.catPerches.topShelf.counter.y !== L.counter.slabY + 2) {
      problems.push('cat counter perch is not anchored on the counter slab');
    }
    if (L.catPerches.topShelf.machine.y !== L.machine.y + 4) {
      problems.push('cat machine transit anchor is not on the espresso machine top');
    }
    if (L.catPerches.topShelf.anchor.y !== 104) {
      problems.push('cat back-shelf perch is not anchored on shelf 1');
    }
    if (L.catPerches.piano.anchor.x !== L.piano.catAnchor.x ||
        L.catPerches.piano.anchor.y !== L.piano.catAnchor.y) {
      problems.push('cat piano perch is not anchored on the lid');
    }
    if (L.piano.keysStep.x < L.piano.keyboardX ||
        L.piano.keysStep.x > L.piano.keyboardX + L.piano.keyboardW ||
        L.piano.keysStep.y !== L.piano.keyboardY) {
      problems.push('cat piano-key transit is not anchored on the keyboard');
    }

    // seats reference existing tables; nook seats pair with small side
    // tables, window seats with tall window tables
    w.seats.forEach(function (s, i) {
      if (s.table >= 0) {
        const tb = w.tables[s.table];
        if (!tb) problems.push('seat[' + i + '] references missing table ' + s.table);
        else if (s.piano && !tb.piano) problems.push('seat[' + i + '] is a piano seat but table ' + s.table + ' is not the piano lid');
        else if (!s.piano && tb.piano) problems.push('seat[' + i + '] points at the piano lid but is not the piano bench');
        else if (s.artist && !tb.artist) problems.push('seat[' + i + '] is an artist seat but table ' + s.table + ' is not the paint table');
        else if (!s.artist && tb.artist) problems.push('seat[' + i + '] points at the paint table but is not the artist stool');
        else if (s.nook && !tb.small) problems.push('seat[' + i + '] is a nook seat but table ' + s.table + ' is not a small side table');
        else if (!s.nook && tb.small) problems.push('seat[' + i + '] points at small side table ' + s.table + ' but is not a nook seat');
        else if (s.window && !tb.tall) problems.push('seat[' + i + '] is a window seat but table ' + s.table + ' is not a tall window table');
        else if (!s.window && tb.tall) problems.push('seat[' + i + '] points at tall window table ' + s.table + ' but is not a window seat');
      } else if (!s.armchair) {
        problems.push('seat[' + i + '] has no table and is not an armchair');
      }
    });
    // window seats must perch on whole pixels inside content-safe bounds
    w.seats.forEach(function (s, i) {
      if (!s.window) return;
      if (!Number.isInteger(s.perchX) || !Number.isInteger(s.perchY)) {
        problems.push('seat[' + i + '] perch (' + s.perchX + ',' + s.perchY + ') is not on whole pixels');
      } else if (s.perchX < SAFE.x0 || s.perchX > SAFE.x1 || s.perchY < SAFE.y0 || s.perchY > SAFE.y1) {
        problems.push('seat[' + i + '] perch (' + s.perchX + ',' + s.perchY + ') outside content-safe bounds');
      }
    });

    // the hard-won constants
    if (L.baristaHome.y !== 286) problems.push('L.baristaHome.y = ' + L.baristaHome.y + ' (must be 286 — the counter swallows her below that; see AGENTS.md)');
    if (L.lane !== 368) problems.push('L.lane = ' + L.lane + ' (the walking lane is 368; see AGENTS.md)');
    if (!Array.isArray(L.occluders) || L.occluders.length < 2) problems.push('L.occluders missing or incomplete (expect at least bookshelf + counter)');
    if (!Array.isArray(L.footprints) || !L.footprints.length) problems.push('L.footprints missing (the journey check needs the furniture floor boxes)');

    // the regulars roster (CAST): cheap constant-checks over the data the sim
    // reads for each regular — no geometry (they reuse existing seats/routes)
    if (!window.CAST || !Array.isArray(CAST.regulars)) {
      problems.push('CAST.regulars roster is missing (js/characters-roster.js)');
    } else {
      const drinkNames = {};
      SIM._.DRINKS.forEach(function (d) { drinkNames[d.name] = true; });
      const names = SIM._.PATRON_NAMES;
      const seenIds = {};
      CAST.regulars.forEach(function (spec, i) {
        const who = 'CAST.regulars[' + i + ']' + (spec.id ? ' (' + spec.id + ')' : '');
        if (!spec.id) problems.push(who + ' has no id');
        else if (seenIds[spec.id]) problems.push('duplicate regular id "' + spec.id + '"');
        seenIds[spec.id] = true;
        if (!drinkNames[spec.drink]) problems.push(who + ' drink "' + spec.drink + '" is not in DRINKS');
        if (!SIM._.SEAT_PREFS[spec.seat]) problems.push(who + ' seat "' + spec.seat + '" has no SEAT_PREFS predicate');
        if (names.feminine.indexOf(spec.name) >= 0 || names.masculine.indexOf(spec.name) >= 0) {
          problems.push(who + ' name "' + spec.name + '" collides with the random PATRON_NAMES pool');
        }
        // line pools are read with pick() at the caption seams — each must be an
        // array so a malformed row fails the audit, not the sim (Phase 2)
        if (!spec.lines || typeof spec.lines !== 'object') {
          problems.push(who + ' has no lines pools');
        } else {
          ['arrival', 'overheard', 'musing', 'backstory'].forEach(function (ctx) {
            if (!Array.isArray(spec.lines[ctx])) problems.push(who + ' lines.' + ctx + ' is not an array');
          });
          // the optional Phase 3 continuity pools: present-and-not-an-array is a
          // malformed row (specLine reads them with pick()); absent is fine
          ['arrivalRain', 'arrivalReturn', 'settle', 'usualTaken'].forEach(function (ctx) {
            if (spec.lines[ctx] !== undefined && !Array.isArray(spec.lines[ctx])) {
              problems.push(who + ' lines.' + ctx + ' is present but not an array');
            }
          });
          // a chatty regular with no mate-facing pool would fall silent at the table
          if (spec.traits && spec.traits.chatty && (!spec.lines.overheard || !spec.lines.overheard.length)) {
            problems.push(who + ' is chatty but has no overheard lines');
          }
        }
      });
    }

    // narrative arcs (CAST.arcs) + the loaded MEMORY save (docs/narrative.md
    // §7.3): no arc names a missing regular, no stage exceeds its definition,
    // the save matches version, and no completion flag is set without its beat.
    const arcDefs = (window.CAST && Array.isArray(CAST.arcs)) ? CAST.arcs : [];
    const regularIds = {};
    if (window.CAST && Array.isArray(CAST.regulars)) CAST.regulars.forEach(function (r) { regularIds[r.id] = true; });
    const seenArc = {};
    arcDefs.forEach(function (arc, i) {
      const who = 'CAST.arcs[' + i + ']' + (arc.id ? ' (' + arc.id + ')' : '');
      if (!arc.id) problems.push(who + ' has no id');
      else if (seenArc[arc.id]) problems.push('duplicate arc id "' + arc.id + '"');
      seenArc[arc.id] = true;
      // exactly one home: a regular owner, or a fixed café anchor
      if (arc.anchor && arc.owner) problems.push(who + ' has both an owner and an anchor');
      if (!arc.anchor && !regularIds[arc.owner]) problems.push(who + ' names a missing regular "' + arc.owner + '"');
      if (arc.anchor) {
        const a = arc.anchor;
        // the whole drawn bubble (x ± 24, y .. y + 40) must stay inside the
        // always-visible content box — never in the overscan strips
        const ok = typeof a.x === 'number' && typeof a.y === 'number' &&
          a.x >= 36 && a.x <= 924 && a.y >= 36 && a.y <= 536;
        if (!ok) problems.push(who + ' anchor must keep its bubble inside the content box (x 36-924, y 36-536)');
      }
      const stages = arc.stages || 1;
      if (!Number.isInteger(stages) || stages <= 0) problems.push(who + ' stages must be a positive integer');
      const rowsList = Array.isArray(arc.rows) ? arc.rows : [arc.rows];
      if (Array.isArray(arc.rows) && arc.rows.length !== stages) problems.push(who + ' rows array must carry one entry per stage');
      if (rowsList.some(function (r) { return !Number.isInteger(r) || r <= 0; })) problems.push(who + ' rows must be positive integers');
      if (!arc.glyph) problems.push(who + ' has no invitation glyph');
      if (!Array.isArray(arc.beat) || !arc.beat.length) problems.push(who + ' beat must be a non-empty array');
      else if (Array.isArray(arc.beat[0])) {
        if (arc.beat.length !== stages) problems.push(who + ' beat array must carry one caption run per stage');
        if (arc.beat.some(function (run) { return !Array.isArray(run) || !run.length; })) problems.push(who + ' has an empty per-stage beat');
      }
      const flags = Array.isArray(arc.flag) ? arc.flag : [arc.flag];
      if (Array.isArray(arc.flag) && arc.flag.length !== stages) problems.push(who + ' flag array must carry one key per stage');
      if (flags.some(function (flag) { return typeof flag !== 'string' || !flag; })) problems.push(who + ' has an invalid completion flag');
      if (arc.presenceBeat) {
        const pb = arc.presenceBeat;
        if (!regularIds[pb.owner]) problems.push(who + ' presenceBeat names a missing regular "' + pb.owner + '"');
        if (!Array.isArray(pb.lines) || !pb.lines.length) problems.push(who + ' presenceBeat must carry lines');
        if (pb.window != null && (!Number.isInteger(pb.window) || pb.window < 0 || pb.window >= L.winTables.length)) {
          problems.push(who + ' presenceBeat window is out of range');
        }
      }
    });
    if (window.MEMORY) {
      const mem = MEMORY.state;
      if (!mem || typeof mem !== 'object') {
        problems.push('MEMORY.state is missing');
      } else {
        if (mem.version !== MEMORY.VERSION) problems.push('MEMORY save version ' + mem.version + ' != current ' + MEMORY.VERSION + ' (the migration ladder should have upgraded it)');
        ['arcs', 'bonds', 'flags'].forEach(function (k) {
          if (!mem[k] || typeof mem[k] !== 'object') problems.push('MEMORY.state.' + k + ' is not an object');
        });
        if (typeof mem.lastSeen !== 'number') problems.push('MEMORY.state.lastSeen is not a number');
        arcDefs.forEach(function (arc) {
          const rec = mem.arcs && mem.arcs[arc.id];
          if (!rec) return;
          const stages = SIM._.arcStages(arc);
          if (rec.stage < 0 || rec.stage > stages) problems.push('arc "' + arc.id + '" stage ' + rec.stage + ' out of 0..' + stages);
          const rows = SIM._.arcRows(arc, Math.min(rec.stage, stages - 1));
          if (rec.progress < 0 || rec.progress > rows) problems.push('arc "' + arc.id + '" progress ' + rec.progress + ' out of 0..' + rows);
          if (rec.pendingBeat && rec.stage >= stages) problems.push('arc "' + arc.id + '" has a pending beat but is already complete (stage ' + rec.stage + ')');
          const flags = Array.isArray(arc.flag) ? arc.flag : [arc.flag];
          flags.forEach(function (flag, stage) {
            if (mem.flags[flag] && rec.stage < stage + 1) problems.push('arc "' + arc.id + '" flag "' + flag + '" set before stage ' + (stage + 1));
          });
        });
      }
    }

    // live-world invariants (the soak-test set — cheap enough to keep forever)
    const live = {};
    w.patrons.forEach(function (p) { live[p.id] = true; });
    w.seats.forEach(function (s, i) {
      const holders = w.patrons.filter(function (p) { return p.seat === s; }).length;
      if (s.taken && holders !== 1) problems.push('seat[' + i + '] taken but ' + holders + ' patron(s) hold it');
      if (!s.taken && holders) problems.push('seat[' + i + '] free but ' + holders + ' patron(s) hold it');
    });
    w.queue.forEach(function (q, i) {
      if (q.queueIdx !== i) problems.push('queue[' + i + '] (' + q.name + ') carries queueIdx ' + q.queueIdx);
    });
    w.tables.forEach(function (tb, ti) {
      const bySide = {};
      tb.items.forEach(function (it) {
        if (it.owner !== null && !live[it.owner]) problems.push('table ' + ti + ' item owned by departed patron ' + it.owner);
        const key = it.side + ':' + (it.kind === 'laptop' ? 'laptop' : 'service');
        bySide[key] = (bySide[key] || 0) + 1;
        if (bySide[key] === 2) problems.push('table ' + ti + ' has duplicate ' + key + ' items');
      });
    });
    w.counterCups.forEach(function (c) {
      if (!live[c.owner]) problems.push('counter cup owned by departed patron ' + c.owner);
    });
    if (w.patrons.length > 7) problems.push(w.patrons.length + ' patrons exceed the spawn cap (7)');
    const parkedOwners = {};
    w.umbrellaStand.forEach(function (u) {
      if (!live[u.owner]) problems.push('umbrella in stand belongs to departed patron ' + u.owner);
      if (parkedOwners[u.owner]) problems.push('patron ' + u.owner + ' has two umbrellas in the stand');
      parkedOwners[u.owner] = true;
    });
    w.patrons.forEach(function (p) {
      if (!!p.umbrellaParked !== !!parkedOwners[p.id]) problems.push(p.name + ' umbrella/stand link is inconsistent');
      if (p.partner && p.partner.partner !== p) problems.push(p.name + ' has a one-way partner link');
      if (p.colors.beard && p.nameStyle !== 'masculine') problems.push(p.name + ' has a beard inconsistent with nameStyle ' + p.nameStyle);
    });
    if (w.sleeper && (!live[w.sleeper.id] || !w.sleeper.dozing)) problems.push('world.sleeper is stale');
    if (w.patrons.filter(function (p) { return p.dozing; }).length > 1) problems.push('more than one patron is dozing');
    if (w.patrons.filter(function (p) { return p.state === 'toEasel' || p.state === 'watchingArtist' || p.state === 'backFromEasel'; }).length > 1) {
      problems.push('more than one patron is visiting the artist station');
    }
    if (w.cat.surface === 'lap' && (!w.cat.lapPatron || !w.cat.lapPatron.lapCat)) {
      problems.push('cat is on a lap without a matching patron link');
    } else if (w.cat.surface === 'lap') {
      const seat = w.cat.lapPatron.seat;
      const lapX = seat.x + seat.facing * 6, lapY = seat.y + 2;
      if (w.cat.x !== lapX || w.cat.y !== lapY) problems.push('lap cat is not on its derived seat anchor');
    }
    if (w.catBowls.food < 0 || w.catBowls.food > 1 || w.catBowls.water < 0 || w.catBowls.water > 1) {
      problems.push('cat bowl levels must stay between 0 and 1');
    }
    // the cat's scarf tracks the completed arc's flag, both ways
    const scarfArc = arcDefs.find(function (a) { return a.flag === 'cat-wore-scarf'; });
    if (scarfArc) {
      const worn = !!(w.memory && w.memory.flags['cat-wore-scarf']);
      if (worn && w.cat.scarf !== scarfArc.scarfColor) problems.push('cat wears the scarf in memory but cat.scarf is not its colour');
      if (!worn && w.cat.scarf) problems.push('cat.scarf is set but the cat-wore-scarf flag is not');
    }
    w.tables.forEach(function (tb, i) {
      if (tb.candle < 0 || tb.candle > 1 || tb.candleTarget < 0 || tb.candleTarget > 1) {
        problems.push('table ' + i + ' candle state must stay between 0 and 1');
      }
    });
    if (w.candles.mantel < 0 || w.candles.mantel > 1 ||
        w.candles.mantelTarget < 0 || w.candles.mantelTarget > 1) {
      problems.push('mantel candle state must stay between 0 and 1');
    }
    if (!w.fire || w.fire.level < 0 || w.fire.level > 1 ||
        w.fire.target < 0 || w.fire.target > 1) {
      problems.push('fire level/target must stay between 0 and 1');
    }
    if (w.rain < 0 || w.rain > 1 || w.rainTarget < 0 || w.rainTarget > 1) {
      problems.push('rain levels must stay between 0 and 1');
    }
    if (typeof w.storm !== 'boolean' || w.flash < 0 || w.flash > 1) {
      problems.push('storm flag and flash level must stay valid');
    }
    if (!w.kettle || w.kettle.hour < 0 || w.kettle.hour >= 24) {
      problems.push('kettle slot must be a valid in-world hour');
    }

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

  // URL-shaped arc forcing makes exact saved stages screenshotable even when
  // a browser console is unavailable. It is the boot equivalent of __dev.arc:
  // inert without ?arc, dev-only, and it keeps prior-stage lasting flags in
  // step with the requested stage so the wall and canvas tell one story.
  if (params.has('arc')) {
    window.addEventListener('load', function () {
      const id = params.get('arc');
      const def = ((window.CAST && CAST.arcs) || []).find(function (a) { return a.id === id; });
      const w = world();
      const rec = def && w && w.memory && w.memory.arcs[id];
      if (!def || !rec) return;
      const stages = SIM._.arcStages(def);
      const requestedStage = params.has('stage') ? parseInt(params.get('stage'), 10) : rec.stage;
      if (!isNaN(requestedStage)) rec.stage = Math.max(0, Math.min(stages, requestedStage));
      const rows = SIM._.arcRows(def, Math.min(rec.stage, stages - 1));
      const requestedProgress = params.has('progress') ? parseFloat(params.get('progress')) : rec.progress;
      if (!isNaN(requestedProgress)) rec.progress = Math.max(0, Math.min(rows, requestedProgress));
      rec.pendingBeat = params.has('ready') && rec.stage < stages ? 'finished' : null;
      for (let i = 0; i < stages; i++) {
        w.memory.flags[SIM._.arcFlag(def, i)] = i < rec.stage;
      }
      if (window.MEMORY) MEMORY.save();
    }, { once: true });
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

  if (params.has('audit')) {
    window.addEventListener('load', function () {
      const problems = D.audit();
      document.documentElement.dataset.auditProblems = String(problems.length);
      document.documentElement.dataset.auditDetails = JSON.stringify(problems);
    }, { once: true });
  }
})();
