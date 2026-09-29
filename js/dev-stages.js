/* Café Hygge — dev stages: get to any point of the game without waiting for it.
   Dev-only like dev.js: the panel exists only with ?dev, and nothing else runs
   unless the console or ?day calls it. Loads after dev.js, before main.js.

   The autoplayer plays the real game in a private world, fast: it answers
   every conversation (first answers by default), plays story beats, buys
   every improvement on offer (free, so the café keeps its takings), lets every
   regular whose first day has come visit daily, and goes to sleep once the
   evening's supper and unpacking are done. Its saves
   are ordinary saves, so opening one is exactly a reload of that café.

   URL:
     ?dev&day=n        replace the save with the morning of café day n from the
                       playthrough (1 = a new café), then carry on from there
   Console API:
     __dev.play(o)       run the autoplayer; returns {world, days:[{day, save, events}], stuck}
                         (days[0] is the day it started on, save null)
                         o: {state, seed, choices:'first'|'last'|'random', talk,
                         buy, brisk, rich, mornings, until(w), maxDays}
     __dev.timeline(o)   the cached playthrough, built now if missing or stale
                         ({rebuild, choices, day}: sync, a few seconds per ten days)
     __dev.buildTimeline(onProgress, o)  the same in slices → Promise (the panel)
     __dev.day(n)        open the morning of café day n (1 = a new café)
     __dev.nextMorning() play the rest of today and the night, leaving stories
                         and purchases alone, and open the next morning
     __dev.bookmark(name) / __dev.bookmarks() / __dev.openBookmark(i) /
     __dev.forgetBookmark(i)   in-browser save slots
     __dev.openSave(text) replace the save (null: a new café) and reload */
(function () {
  'use strict';

  const D = window.__dev, R = SIM._;
  const params = new URLSearchParams(location.search);
  const TIMELINE = 'cafe-hygge-dev-timeline', BOOKMARKS = 'cafe-hygge-dev-bookmarks',
    PREVIOUS = 'cafe-hygge-dev-previous';
  // Bump when the autoplayer's policy changes, so cached playthroughs rebuild.
  const PLAYER = 1;
  const DAY_TICKS = 12000;   // a café day and night is ~3600 ticks; far past it, something is stuck

  function world() { return window.__world; }
  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /* ---------- what happened, in words ---------- */

  const names = {};
  CAST.regulars.forEach(function (r) { names[r.id] = r.name; });
  function nameOf(id) { return names[id] || id.charAt(0).toUpperCase() + id.slice(1); }
  // A saved conversation's prefix ('saira-listen-', 'home-calandra-') → words.
  function sceneTitle(prefix) {
    const parts = prefix.replace(/-$/, '').replace(/-node$/, '').replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase().split('-');
    if (parts[0] === 'home') return 'evening: ' + parts.slice(1).join(' ');
    return nameOf(parts[0]) + (parts.length > 1 ? ': ' + parts.slice(1).join(' ') : '');
  }
  function projectLabel(id) { return IMPROVEMENTS.all[id].label; }

  /* ---------- the autoplayer ---------- */

  // One step of a player's attention before each 0.25 s tick. It does what
  // the owner's clicks would do, through the same SIM entry points main.js uses.
  function player(w, o, note) {
    const choiceRandom = SIM.seededRandom((o.seed || 1) * 7919 + 13);
    let briskDay = -1, planDay = -1;
    function choose(line) {
      const n = line.choices.length;
      if (o.choices === 'last') return n - 1;
      if (o.choices === 'random') return Math.floor(choiceRandom() * n);
      return 0;
    }
    function buy(id) {
      const l = w.memory.life;
      if (!IMPROVEMENTS.offered(w, id) || IMPROVEMENTS.state(l, id).stage !== 'available') return;
      // Rich play gets improvements free, so the café keeps its own takings.
      const savings = l.savings;
      if (o.rich) l.savings = Math.max(l.savings, IMPROVEMENTS.all[id].price);
      if (IMPROVEMENTS.canBuy(w, id) && (id === 'plant' ? SIM.buyPlant(w) : SIM.buyProject(w, id)))
        note('bought ' + projectLabel(id));
      if (o.rich) l.savings = savings;
    }
    function beat() {
      if (w.shop.phase !== 'open' || w.shop.away) return false;
      return CAST.arcs.some(function (arc) {
        const rec = w.memory.arcs[arc.id];
        if (!rec || !rec.pendingBeat || arc.payoff === 'scene') return false;
        let at = null;
        if (arc.anchor) at = { x: arc.anchor.x, y: arc.anchor.y + 20 };
        else {
          const p = w.patrons.find(function (q) { return q.regularId === arc.owner && q.state === 'seated'; });
          if (p) at = { x: p.x, y: p.y - 40 };
        }
        if (!at || SIM.beatAt(w, at.x, at.y) !== arc) return false;
        note('beat: ' + arc.id.replace(/-/g, ' '));
        return true;
      });
    }
    return function () {
      const l = w.memory.life;
      if (SIM.homeSceneActive(w)) {
        if (w.dialogue) SIM.advanceHomeDialogue(w);
        else if (SIM.homeBedtimeActive(w)) SIM.skipBedtime(w);
      } else if (SIM.introActive(w) && w.dialogue) SIM.advanceIntro(w);
      const m = w.moment;
      if (m) {
        if (m.phase === 'talk') {
          const line = SIM.momentLine(w);
          m.visible = 999;
          SIM.advanceMoment(w, line.choices ? choose(line) : undefined);
        }
        return;
      }
      // Waiting conversations: all of them, or only the one that is required.
      const talk = o.talk !== false || SIM.holgerRequired(w);
      if (talk) {
        const inv = SIM.invitations(w).find(function (i) { return o.talk !== false || i.pulse; });
        if (inv && inv.start()) {
          note(w.moment && w.moment.memoryPrefix ? sceneTitle(w.moment.memoryPrefix) : inv.key);
          return;
        }
        if (o.talk !== false && beat()) return;
      }
      // Everyone whose first day has come visits today.
      if (o.brisk && w.shop.phase === 'open' && l.daysCompleted >= 1 && briskDay !== l.daysCompleted) {
        briskDay = l.daysCompleted;
        CAST.regulars.forEach(function (s) {
          if (!(s.firstDay > l.daysCompleted) && w.regulars[s.id]) w.regulars[s.id].force = true;
        });
      }
      if (w.shop.phase === 'home' && !SIM.homeSceneActive(w)) {
        if (planDay !== l.daysCompleted && SIM.plan(w, true)) {
          planDay = l.daysCompleted;
          // The first evening's pairing is required even when not buying.
          if (SIM.homePlanRequired(w) && o.buy === false) ['window', 'table'].forEach(buy);
          else if (o.buy !== false) IMPROVEMENTS.planOrder.forEach(buy);
          SIM.plan(w, false);
        }
        // Let the evening happen first: supper, tonight's box, and settling on
        // the bed (where a keepsake chosen for home is put in its place).
        if (!SIM.homeDinnerActive(w) && !SIM.homeUnpackActive(w) && l.homeTime >= 46) SIM.goToSleep(w);
      }
    };
  }

  // A run that can be ticked in slices (the panel builds without freezing the
  // page) or to completion. Each café morning becomes a snapshot; what happens
  // during a day is recorded on that day's snapshot.
  function playRun(options) {
    const o = Object.assign({ choices: 'first', talk: true, buy: true, brisk: true, rich: true,
      maxDays: 60, quietDays: 4 }, options);
    const state = o.state ? MEMORY.codec.migrate(o.state) : MEMORY.codec.fresh();
    const w = SIM.create({ random: SIM.seededRandom(o.seed || 1), memory: MEMORY.createStore({ state: state }) });
    const l = w.memory.life, mode = l.mode, startDay = l.daysCompleted;
    SIM.setMode(w, 'game');
    const run = { world: w, days: [], done: false, reason: null, stuck: null };
    let current = { day: startDay + 1, save: null, events: [] };
    function note(text) { current.events.push(text); }
    const step = player(w, o, note);
    const stages = {};
    Object.keys(l.projects).forEach(function (id) { stages[id] = l.projects[id].stage; });
    let wasOpen = w.shop.phase === 'open', ticks = 0, dayTicks = 0, quiet = 0, flagCount = Object.keys(w.memory.flags).length;

    function snapshot() {
      R.saveLife(w, 0);
      l.mode = mode;
      const text = w.context.memory.exportText();
      l.mode = 'game';
      return text;
    }
    function morning() {
      const flags = Object.keys(w.memory.flags).length;
      // Work under way, or a story arc (knitting, painting) still growing.
      const busy = Object.keys(l.projects).some(function (id) {
        const s = l.projects[id].stage; return s !== 'available' && s !== 'installed';
      }) || CAST.arcs.some(function (a) {
        const rec = w.memory.arcs[a.id];
        return rec && R.arcStarted(w.memory, a) && rec.stage < R.arcStages(a);
      });
      // A day that saved nothing new, with nothing under way, moved no story
      // (a declined offer may come back daily without changing anything).
      current.quiet = flags === flagCount && !busy;
      quiet = current.quiet ? quiet + 1 : 0;
      flagCount = flags;
      current = { day: l.daysCompleted + 1, save: snapshot(), events: [] };
      run.days.push(current);
      dayTicks = 0;
      run.reason = run.days.length >= (o.mornings || Infinity) ? 'mornings' : o.until && o.until(w) ? 'until' :
        l.daysCompleted - startDay >= o.maxDays ? 'maxDays' : quiet >= o.quietDays ? 'quiet' : null;
      if (run.reason) run.done = true;
    }
    run.first = current;
    run.tick = function (steps) {
      for (let i = 0; i < steps && !run.done; i++) {
        step();
        SIM.update(w, 0.25);
        ticks++; dayTicks++;
        Object.keys(stages).forEach(function (id) {
          const s = l.projects[id].stage;
          if (s !== stages[id] && s === 'installed') note('finished ' + projectLabel(id));
          stages[id] = s;
        });
        const open = w.shop.phase === 'open';
        if (open && !wasOpen && l.daysCompleted + 1 > current.day) morning();
        wasOpen = open;
        if (dayTicks > DAY_TICKS) {
          run.done = true; run.reason = 'stuck';
          run.stuck = 'no new morning after day ' + current.day + ' (phase ' + w.shop.phase +
            (w.moment ? ', in a conversation' : '') + (SIM.homeSceneActive(w) ? ', home scene' : '') + ')';
        }
      }
      return run;
    };
    return run;
  }

  D.play = function (o) {
    const run = playRun(o);
    while (!run.done) run.tick(4000);
    if (run.stuck) console.warn('[dev] play: ' + run.stuck);
    return { world: run.world, days: [run.first].concat(run.days), stuck: run.stuck };
  };

  /* ---------- the playthrough timeline ---------- */

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  // Content or save-shape changes make an older playthrough stale.
  function signature() {
    return [MEMORY.VERSION, PLAYER, hash(JSON.stringify(CAST)), hash(JSON.stringify(IMPROVEMENTS))].join(':');
  }
  function cached() {
    const t = read(TIMELINE);
    return t && t.signature === signature() && Array.isArray(t.days) && t.days.length ? t : null;
  }
  function freshTimeline(choices) {
    return { signature: signature(), choices: choices || 'first', built: 0, complete: false, stuck: null,
      days: [{ day: 1, save: null, events: [] }] };
  }
  // Continue a timeline from its last morning (a fresh café for day 1);
  // finish() puts the run's days in place of that last entry.
  function extend(t, o) {
    const last = t.days[t.days.length - 1];
    const run = playRun(Object.assign({ state: last.save ? JSON.parse(last.save) : null, choices: t.choices }, o));
    run.first.save = last.save;
    return run;
  }
  function finish(t, run) {
    t.days = t.days.slice(0, -1).concat([run.first], run.days);
    // A whole playthrough ends on the first morning after the story stopped
    // moving, not on the several quiet days that proved it.
    if (run.reason === 'quiet') {
      let end = t.days.length - 1;
      while (end > 0 && t.days[end - 1].quiet) end--;
      t.days.length = end + 1;
    }
    // Only a playthrough that ran out of story (or days) is whole.
    t.complete = run.reason === 'quiet' || run.reason === 'maxDays';
    t.stuck = run.stuck;
    t.built = Date.now();
    if (!write(TIMELINE, t)) console.warn('[dev] the playthrough is too large to keep in localStorage');
    return t;
  }
  function syncRun(run) { while (!run.done) run.tick(4000); return run; }

  // The cached playthrough, or one built now (a few seconds per ten days).
  D.timeline = function (o) {
    o = o || {};
    const c = !o.rebuild && cached();
    if (c && (c.complete || c.days.some(function (d) { return d.day === o.day; }))) return c;
    const t = c || freshTimeline(o.choices);
    const run = extend(t, o.day ? { until: function (w) { return w.memory.life.daysCompleted + 1 >= o.day; } } : {});
    return finish(t, syncRun(run));
  };
  // The same, in slices, reporting progress; resolves to the timeline.
  D.buildTimeline = function (onProgress, o) {
    o = o || {};
    const c = !o.rebuild && cached();
    if (c && c.complete) return Promise.resolve(c);
    const t = c || freshTimeline(o.choices);
    const run = extend(t, {});
    return new Promise(function (resolve) {
      (function slice() {
        const until = performance.now() + 40;
        while (!run.done && performance.now() < until) run.tick(200);
        if (onProgress) onProgress(run.days.length ? run.days[run.days.length - 1].day : run.first.day);
        if (run.done) resolve(finish(t, run));
        else setTimeout(slice, 0);
      })();
    });
  };

  /* ---------- opening a save ---------- */

  // Keep the café being replaced, once, so a jump can be undone.
  function keepPrevious() {
    const w = world();
    if (!w || MEMORY.readOnly) return;
    R.saveLife(w, 0);
    write(PREVIOUS, describe('the café before the last jump', MEMORY.exportText()));
  }
  function describe(name, text) {
    const s = JSON.parse(text);
    return { name: name, at: Date.now(), version: s.version, day: s.life.daysCompleted + 1,
      hour: s.life.hour, savings: s.life.savings, save: text };
  }
  function reloadUrl() {
    const q = [];
    params.forEach(function (v, k) { if (k !== 'day') q.push(k + (v ? '=' + encodeURIComponent(v) : '')); });
    if (!params.has('dev')) q.unshift('dev');
    return location.pathname + '?' + q.join('&');
  }
  // Replace the save (null: a new café) and reload into it. The old world
  // must never write over the new bytes, so persistence goes read-only first.
  D.openSave = function (text, options) {
    if (MEMORY.readOnly) throw new Error('the save belongs to another tab');
    if (!(options && options.keep === false)) keepPrevious();
    if (text === null) {
      MEMORY.reset();
      if (MEMORY.status.writeError) throw new Error(MEMORY.status.writeError);
    } else MEMORY.importText(text);
    MEMORY.readOnly = true;
    location.replace(reloadUrl());
  };
  function dayEntry(n) {
    if (n === 1) return { day: 1, save: null, events: [] };   // a new café
    const t = D.timeline({ day: n });
    const d = t.days.find(function (x) { return x.day === n; });
    if (!d) throw new Error('the playthrough has no day ' + n + ' (it has ' + t.days.length + ')');
    return d;
  }
  D.day = function (n) { D.openSave(dayEntry(n).save); };

  D.nextMorning = function () {
    const w = world();
    R.saveLife(w, 0);
    const run = syncRun(playRun({ state: JSON.parse(MEMORY.exportText()), talk: false, buy: false,
      brisk: false, rich: false, mornings: 1, seed: Date.now() % 100000 }));
    if (run.stuck || !run.days.length) throw new Error('could not reach the next morning: ' + run.stuck);
    D.openSave(run.days[0].save);
  };

  /* ---------- bookmarks ---------- */

  function bookmarks() { const b = read(BOOKMARKS); return Array.isArray(b) ? b : []; }
  D.bookmarks = function () {
    return bookmarks().map(function (b) {
      return { name: b.name, day: b.day, hour: b.hour, savings: b.savings, at: b.at, opens: b.version === MEMORY.VERSION };
    });
  };
  D.bookmark = function (name) {
    const w = world();
    R.saveLife(w, 0);
    const list = bookmarks(), l = w.memory.life;
    const b = describe(name || 'saved ' + new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit' }), MEMORY.exportText());
    list.unshift(b);
    if (!write(BOOKMARKS, list)) throw new Error('localStorage is full; forget a bookmark first');
    return b.name;
  };
  D.openBookmark = function (i) {
    const b = bookmarks()[i];
    if (!b) throw new Error('no bookmark ' + i);
    D.openSave(b.save);
  };
  D.forgetBookmark = function (i) {
    const list = bookmarks();
    list.splice(i, 1);
    write(BOOKMARKS, list);
  };
  function clock(h) {
    const m = Math.floor(h * 60) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  /* ---------- ?day=n: boot into a playthrough morning ---------- */

  if (params.has('day')) {
    const n = parseInt(params.get('day'), 10);
    const create = SIM.create;
    SIM.create = function () {
      // Only the shipped boot (no options) owns the browser save.
      if (!arguments.length && n >= 1 && !MEMORY.readOnly) {
        try {
          const d = dayEntry(n);
          MEMORY.state = d.save ? MEMORY.codec.migrate(JSON.parse(d.save)) : MEMORY.codec.fresh();
          MEMORY.saveNow();
          history.replaceState(null, '', reloadUrl());
        } catch (e) { console.warn('[dev] ?day: ' + (e.message || e)); }
      }
      return create.apply(this, arguments);
    };
  }

  /* ---------- the panel (?dev only) ---------- */

  if (!params.has('dev')) return;
  const esc = function (s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  const panel = document.createElement('dialog');
  panel.id = 'dev-stages';
  panel.setAttribute('aria-labelledby', 'dev-stages-title');
  panel.innerHTML =
    '<header class="settings-heading"><div><p class="eyebrow">development</p><h2 id="dev-stages-title">Stages</h2></div>' +
    '<button id="close-stages" aria-label="Close stages">✕</button></header>' +
    '<p class="stages-intro">Open the café as it was on any morning of a quick playthrough, skip ahead, or keep ' +
    'bookmarks. Opening one replaces this café; the one it replaces is kept below.</p>' +
    '<section aria-labelledby="stages-now-title"><h3 id="stages-now-title">This café</h3><p id="stages-now"></p>' +
    '<div class="stages-actions"><button id="stages-next">skip to next morning</button>' +
    '<button id="stages-bookmark">bookmark this café</button>' +
    '<input id="stages-mark-name" type="text" placeholder="name (optional)" aria-label="Bookmark name" maxlength="60"></div>' +
    '<p class="stages-note">Skipping plays the rest of today and the night without talking or buying; waiting stories keep waiting.</p>' +
    '<div class="stages-call"><span>call in:</span></div><p id="stages-called" class="stages-note" role="status"></p></section>' +
    '<section aria-labelledby="stages-marks-title"><h3 id="stages-marks-title">Bookmarks</h3><ul id="stages-marks"></ul></section>' +
    '<section aria-labelledby="stages-play-title"><h3 id="stages-play-title">A quick playthrough</h3>' +
    '<p class="stages-note">Every conversation answered, every improvement bought (free) as soon as it is offered, ' +
    'everyone whose first day has come visits daily. Each day lists what happened in it.</p>' +
    '<div class="stages-actions"><label for="stages-choices">answers</label><select id="stages-choices">' +
    '<option value="first">first</option><option value="last">last</option><option value="random">random</option></select>' +
    '<button id="stages-build">play it through</button><span id="stages-status" role="status"></span></div>' +
    '<ol id="stages-days"></ol></section>';
  document.getElementById('stage').appendChild(panel);
  const $ = function (id) { return document.getElementById(id); };

  const call = panel.querySelector('.stages-call');
  CAST.regulars.forEach(function (r) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = r.name;
    b.addEventListener('click', function () {
      const w = world();
      if (w.shop.phase !== 'open') { $('stages-called').textContent = 'The café is not open.'; return; }
      const p = D.regular(r.id);
      $('stages-called').textContent = p ? r.name + ' is coming in.' :
        r.name + ' will come in when there is room (and when they may).';
    });
    call.appendChild(b);
  });

  function row(label, meta, buttons) {
    const li = document.createElement('li');
    li.innerHTML = '<div><span class="stages-label">' + esc(label) + '</span>' +
      (meta ? '<small>' + esc(meta) + '</small>' : '') + '</div>';
    const actions = document.createElement('span');
    buttons.forEach(function (b) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = b.text; button.disabled = !!b.disabled;
      if (b.label) button.setAttribute('aria-label', b.label);
      button.addEventListener('click', b.run);
      actions.appendChild(button);
    });
    li.appendChild(actions);
    return li;
  }
  function attempt(fn) {
    try { fn(); } catch (e) { $('stages-status').textContent = String(e.message || e); }
  }
  function markMeta(b) {
    return 'day ' + b.day + ', ' + clock(b.hour) + ', ' + b.savings + ' coins' +
      (b.version === MEMORY.VERSION ? '' : ' — an older save version; it no longer opens');
  }
  function refreshMarks() {
    const list = $('stages-marks'), prev = read(PREVIOUS);
    list.replaceChildren();
    if (prev) list.appendChild(row(prev.name, markMeta(prev), [{ text: 'open', disabled: prev.version !== MEMORY.VERSION,
      label: 'open ' + prev.name, run: function () { attempt(function () { D.openSave(prev.save, { keep: false }); }); } }]));
    bookmarks().forEach(function (b, i) {
      list.appendChild(row(b.name, markMeta(b), [
        { text: 'open', disabled: b.version !== MEMORY.VERSION, label: 'open ' + b.name,
          run: function () { attempt(function () { D.openBookmark(i); }); } },
        { text: '×', label: 'forget ' + b.name, run: function () { D.forgetBookmark(i); refreshMarks(); } }]));
    });
    if (!list.children.length) list.appendChild(row('No bookmarks yet.', '', []));
  }
  function refreshDays(t) {
    const list = $('stages-days');
    list.replaceChildren();
    if (!t) {
      $('stages-status').textContent = 'Not played yet for this version of the café.';
      $('stages-build').textContent = 'play it through';
      return;
    }
    $('stages-build').textContent = t.complete ? 'play again' : 'play on';
    $('stages-choices').value = t.choices || 'first';
    $('stages-status').textContent = t.days.length + ' mornings' + (t.complete ? '' : ' so far') + ', ' +
      (t.choices || 'first') + ' answers' + (t.stuck ? ' — stopped: ' + t.stuck : '') +
      ', played ' + new Date(t.built).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    t.days.forEach(function (d, i) {
      const last = i === t.days.length - 1;
      const meta = last && !t.complete ? 'not played further yet' :
        last ? 'the story so far is told' + (d.events.length ? ' (' + d.events.join(' · ') + ')' : '') :
        d.events.length ? d.events.join(' · ') : 'a quiet day';
      list.appendChild(row('Day ' + d.day + (d.day === 1 ? ' — a new café' : ''), meta,
        [{ text: 'open', label: 'open day ' + d.day, run: function () { attempt(function () { D.openSave(d.save); }); } }]));
    });
  }
  function refreshNow() {
    const w = world(), l = w.memory.life;
    $('stages-now').textContent = 'Day ' + (l.daysCompleted + 1) + ', ' + clock(w.hour) + ', ' + l.savings +
      ' coins, ' + (l.room === 'full' ? 'the full room' : 'the small room') + (l.mode === 'idle' ? ', idle mode' : '') + '.';
    $('stages-called').textContent = '';
  }

  $('close-stages').addEventListener('click', function () { panel.close(); });
  $('stages-next').addEventListener('click', function () {
    $('stages-status').textContent = 'Skipping ahead…';
    setTimeout(function () { attempt(D.nextMorning); }, 30);
  });
  $('stages-bookmark').addEventListener('click', function () {
    attempt(function () {
      D.bookmark($('stages-mark-name').value.trim()); $('stages-mark-name').value = ''; refreshMarks();
    });
  });
  $('stages-build').addEventListener('click', function () {
    const button = $('stages-build'), c = cached(), choices = $('stages-choices').value;
    button.disabled = true;
    $('stages-days').replaceChildren();
    D.buildTimeline(function (day) { $('stages-status').textContent = 'Playing… day ' + day; },
      { rebuild: !!c && (c.complete || c.choices !== choices), choices: choices })
      .then(function (t) { button.disabled = false; refreshDays(t); });
  });

  const open = document.createElement('button');
  open.id = 'btn-stages'; open.type = 'button'; open.textContent = 'stages (dev)';
  open.title = 'Open the café at another point of the game';
  open.setAttribute('aria-haspopup', 'dialog');
  open.addEventListener('click', function () {
    refreshNow(); refreshMarks(); refreshDays(cached());
    panel.showModal();
  });
  const home = document.getElementById('btn-home');
  home.parentNode.insertBefore(open, home.nextSibling);
})();
