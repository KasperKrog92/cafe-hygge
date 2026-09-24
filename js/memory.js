/* Café Hygge — pure save codec and an injectable browser persistence adapter. */
(function () {
  'use strict';
  const KEY = 'cafe-hygge-save', VERSION = 15;
  const FURNITURE = ['table-window','table-hearth','table-front-left','table-front-right',
    'fireside','nook','window-seats','bookshelf','piano','studio','plants','terrace','hearth',
    'full-counter','rugs','drapes','open-windows','wall-menu','mantel-decor','entrance-screen',
    'counter-equipment','cake-stand','cat-corner','entrance'];
  function furnishings(full) {
    const result = {};
    FURNITURE.forEach(function (id) { result[id] = !!full; });
    return result;
  }
  const MEMORY = (window.MEMORY = {});
  // Waiting browser tabs may receive hidden/pagehide before they own a world.
  // Their exit listeners must not flush an old snapshot over the active save.
  MEMORY.readOnly = !!navigator.locks;
  const own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function record(o) {
    return !!o && typeof o === 'object' &&
      (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
  }
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function integer(n) { return finite(n) && Math.floor(n) === n; }
  function requireShape(ok, message) { if (!ok) throw new Error(message); }

  // Development phase (owner, 24 September 2026): nobody plays yet, so saves
  // are not migrated. Bump VERSION whenever the saved shape changes; any
  // older, newer or malformed save then opens a fresh café. The ladder below
  // stays for the first real players: a step consumes version n and must
  // return version n+1, and codec tests exercise it with synthetic steps.
  function createCodec(version, migrations) {
    function fresh() { return { version: version, lastSeen: 0, arcs: {}, bonds: {}, flags: {}, life: freshLife() }; }
    function validate(s) {
      requireShape(record(s) && s.version === version, 'unsupported save version');
      requireShape(finite(s.lastSeen) && s.lastSeen >= 0, 'invalid lastSeen');
      ['arcs', 'bonds', 'flags'].forEach(function (key) {
        requireShape(record(s[key]), 'invalid ' + key + ' record');
      });
      Object.keys(s.arcs).forEach(function (id) {
        const r = s.arcs[id];
        requireShape(record(r), 'invalid arc record: ' + id);
        requireShape(integer(r.stage) && r.stage >= 0, 'invalid arc stage: ' + id);
        requireShape(finite(r.progress) && r.progress >= 0, 'invalid arc progress: ' + id);
        requireShape(r.pendingBeat === null || r.pendingBeat === 'finished', 'invalid pending beat: ' + id);
      });
      Object.keys(s.bonds).forEach(function (id) {
        const b = s.bonds[id];
        requireShape(record(b), 'invalid bond record: ' + id);
        if (own(b, 'known')) requireShape(typeof b.known === 'boolean', 'invalid bond known');
        if (own(b, 'warmth')) requireShape(finite(b.warmth) && b.warmth >= 0, 'invalid bond warmth');
        if (own(b, 'visits')) requireShape(integer(b.visits) && b.visits >= 0, 'invalid bond visits');
        if (own(b, 'lastDay')) requireShape(integer(b.lastDay) && b.lastDay >= -1, 'invalid bond day');
      });
      Object.keys(s.flags).forEach(function (id) {
        requireShape(typeof s.flags[id] === 'boolean', 'invalid flag: ' + id);
      });
      validateLife(s.life);
      return s;
    }
    function migrate(input) {
      requireShape(record(input), 'invalid save root');
      requireShape(integer(input.version) && input.version >= 0 && input.version <= version,
        'unsupported save version');
      // Validate before JSON cloning: JSON would disguise NaN/Infinity as null.
      let s = input;
      if (s.version === version) validate(s);
      s = JSON.parse(JSON.stringify(s));
      while (s.version < version) {
        const v = s.version;
        requireShape(own(migrations, v) && typeof migrations[v] === 'function', 'missing migration: ' + v);
        s = migrations[v](s);
        requireShape(record(s) && s.version === v + 1, 'invalid migration result: ' + v);
      }
      return validate(s);
    }
    function decode(raw) {
      if (raw === null || raw === undefined) return { state: fresh(), error: null };
      try { return { state: migrate(JSON.parse(raw)), error: null }; }
      catch (e) { return { state: fresh(), error: String(e.message || e) }; }
    }
    function encode(s) { validate(s); return JSON.stringify(s); }
    return { fresh: fresh, validate: validate, migrate: migrate, decode: decode, encode: encode };
  }
  function freshLife() {
    return { mode: 'game', savings: 90, hour: 8.4, homeTime: 0, daysCompleted: 0, openSeconds: 0,
      plant: { stage: 'available', time: 0 }, projects: IMPROVEMENTS.freshProjects(), furniture: furnishings(false),
      homeStory: freshHomeStory(false), homeDinner:{time:0,done:false}, firstOpening:{step:0,time:0}, intro:freshIntro(false), room:'small', plannedTonight: false, checkpoint: null };
  }
  function freshHomeStory(complete) {
    return {step:complete?12:0,time:0,planned:complete,firstNight:!complete,sleepStep:-1,sleepTime:0,sleepFrom:null};
  }
  function freshIntro(complete) {
    return {line:0,finale:complete?8:0,time:0,skipped:false,complete:complete,sign:complete?'outside':'stored'};
  }
  function validateProjects(l) {
    requireShape(record(l.projects) && typeof l.plannedTonight === 'boolean', 'invalid projects');
    Object.keys(IMPROVEMENTS.projects).forEach(function (id) {
      const d = IMPROVEMENTS.projects[id], p = l.projects[id], steps = d.phaseIds.length;
      requireShape(record(p) && d.stages.indexOf(p.stage) >= 0 &&
        integer(p.step) && p.step >= 0 && p.step <= steps && finite(p.time) && p.time >= 0 && p.time < d.duration,
        'invalid project: ' + id);
      requireShape(p.stage === 'installed' ? p.step === steps && p.time === 0 : p.step < steps, 'invalid project completion');
      if (['available','purchased','scheduled','arrived'].indexOf(p.stage) >= 0)
        requireShape(p.step === 0 && p.time === 0, 'invalid project arrival');
    });
  }
  function validateLife(l) {
    const plant = IMPROVEMENTS.plant;
    requireShape(record(l), 'invalid life');
    requireShape(['idle', 'game'].indexOf(l.mode) >= 0, 'invalid mode');
    requireShape(integer(l.savings) && l.savings >= 0, 'invalid savings');
    requireShape(finite(l.hour) && l.hour >= 0 && l.hour < 24, 'invalid life hour');
    requireShape(finite(l.homeTime) && l.homeTime >= 0 && l.homeTime <= 90, 'invalid home time');
    requireShape(record(l.plant) && plant.stages.indexOf(l.plant.stage) >= 0 &&
      finite(l.plant.time) && l.plant.time >= 0 && l.plant.time <= plant.maxTime, 'invalid plant');
    validateProjects(l);
    requireShape(integer(l.daysCompleted) && l.daysCompleted >= 0, 'invalid café days');
    requireShape(finite(l.openSeconds) && l.openSeconds >= 0 && l.openSeconds <= 11700, 'invalid café popularity time');
    requireShape(record(l.furniture), 'invalid furniture');
    FURNITURE.forEach(id => requireShape(typeof l.furniture[id] === 'boolean', 'invalid furniture: ' + id));
    const first = l.firstOpening;
    requireShape(record(first) && integer(first.step) && first.step>=0 && first.step<=12 &&
      finite(first.time) && first.time>=0 && first.time<=18, 'invalid first opening');
    if (first.step===12) requireShape(first.time===0 && l.furniture['table-window'] &&
      l.furniture['table-hearth'], 'unfinished starting tables');
    requireShape(l.room === 'small' || l.room === 'full', 'invalid room size');
    const i = l.intro;
    requireShape(record(i) && integer(i.line) && i.line>=0 && i.line<=30 &&
      integer(i.finale) && i.finale>=0 && i.finale<=8 && finite(i.time) && i.time>=0 && i.time<=8 &&
      typeof i.skipped==='boolean' && typeof i.complete==='boolean' &&
      ['stored','carried','outside'].indexOf(i.sign)>=0, 'invalid intro');
    const h = l.homeStory;
    requireShape(record(h) && integer(h.step) && h.step>=0 && h.step<=12 &&
      finite(h.time) && h.time>=0 && h.time<=120 && typeof h.planned==='boolean' &&
      typeof h.firstNight==='boolean' && integer(h.sleepStep) && h.sleepStep>=-1 && h.sleepStep<=4 &&
      finite(h.sleepTime) && h.sleepTime>=0 && h.sleepTime<=120 &&
      (h.sleepFrom===null || record(h.sleepFrom) && finite(h.sleepFrom.x) && finite(h.sleepFrom.y) &&
      h.sleepFrom.x>=128 && h.sleepFrom.x<=832 && h.sleepFrom.y>=266 && h.sleepFrom.y<=550), 'invalid home story');
    const d = l.homeDinner;
    requireShape(record(d) && finite(d.time) && d.time>=0 && d.time<=180 &&
      typeof d.done==='boolean', 'invalid home dinner');
    if (l.checkpoint !== null) {
      const c = l.checkpoint;
      requireShape(record(c) && record(c.shop) && record(c.nora), 'invalid lifecycle checkpoint');
      const s = c.shop, b = c.nora;
      requireShape(['settling','closing','leaving','night','home','dawn','entering','opening'].indexOf(s.phase) >= 0, 'invalid lifecycle phase');
      requireShape(finite(s.elapsed) && s.elapsed >= 0 && integer(s.step) && s.step >= 0, 'invalid ritual progress');
      requireShape(Array.isArray(s.curtains) && s.curtains.length === 2 &&
        [s.fade,s.lights].concat(s.curtains).every(n => finite(n) && n >= 0 && n <= 1), 'invalid ritual lighting');
      ['lastCall','stocked','accepting','carryingCat','away'].forEach(k => requireShape(typeof s[k] === 'boolean', 'invalid ritual flag'));
      function point(p) { return record(p) && finite(p.x) && finite(p.y) && p.x >= 12 && p.x <= 948 && p.y >= 36 && p.y <= 576; }
      function route(p) { return p === null || (Array.isArray(p) && p.every(point)); }
      requireShape(point(b) && route(b.path) && ['idle','shop'].indexOf(b.state) >= 0, 'invalid Lunafreya checkpoint');
      if (s.task !== null) requireShape(record(s.task) &&
        ['lights','putCat','bowls','curtain','hearth','stock','greet','wipe','table','cat','home','plant'].indexOf(s.task.kind) >= 0 &&
        finite(s.task.time) && s.task.time >= 0 && Array.isArray(s.task.route) && route(s.task.route), 'invalid ritual task');
    }
  }
  const codec = createCodec(VERSION, {});
  MEMORY.freshHomeStory=freshHomeStory;
  MEMORY.VERSION = VERSION;
  MEMORY.furnishings = furnishings;
  MEMORY.codec = codec;
  MEMORY.createCodec = createCodec;
  MEMORY.isRecord = record;

  // Without a storage adapter this is private in-memory state: no timers,
  // stamps, writes, browser globals or persistence prompts. Useful for tests.
  MEMORY.createStore = function (options) {
    const o = options || {}, storage = o.storage;
    const now = o.now || function () { return 0; };
    const schedule = o.schedule || setTimeout, cancel = o.cancel || clearTimeout;
    let timer = null;
    const store = { state: codec.fresh(), now: now,
      status: { loadError: null, writeError: null, persistError: null, persisted: null } };
    function cancelPending() { if (timer !== null) { cancel(timer); timer = null; } }
    store.load = function () {
      cancelPending();
      let result;
      try { result = codec.decode(storage ? storage.getItem(KEY) : null); }
      catch (e) { result = { state: codec.fresh(), error: String(e.message || e) }; }
      store.state = result.state;
      store.status.loadError = result.error;
      return store.state;
    };
    store.saveNow = function () {
      cancelPending();
      if (!storage) return;
      try { storage.setItem(KEY, codec.encode(store.state)); store.status.writeError = null; }
      catch (e) { store.status.writeError = String(e.message || e); }
    };
    store.save = function () {
      if (storage && timer === null) timer = schedule(store.saveNow, 400);
    };
    // File imports are strict: the boot decoder's fresh-café fallback must
    // never turn a bad backup into a replacement save.
    store.exportText = function () { return codec.encode(store.state); };
    store.prepareImport = function (raw) {
      requireShape(typeof raw === 'string' && raw.length <= 1048576, 'invalid save file size');
      return codec.migrate(JSON.parse(raw.replace(/^\uFEFF/, '')));
    };
    store.importText = function (raw) {
      const next = store.prepareImport(raw), bytes = codec.encode(next);
      if (o.canWrite && !o.canWrite()) throw new Error('save owned by another tab');
      // localStorage.setItem is atomic. Keep the live state and its pending
      // save intact if validation or persistence fails.
      try { if (storage) storage.setItem(KEY, bytes); }
      catch (e) { store.status.writeError = String(e.message || e); throw e; }
      cancelPending();
      store.state = next;
      store.status.loadError = null; store.status.writeError = null;
      return next;
    };
    store.stamp = function () { if (storage) store.state.lastSeen = now(); };
    store.requestPersist = function () {
      if (!o.persist) return;
      try {
        Promise.resolve(o.persist()).then(function (granted) {
          store.status.persisted = !!granted;
          store.status.persistError = null;
        }, function (e) { store.status.persistError = String(e.message || e); });
      } catch (e) { store.status.persistError = String(e.message || e); }
    };
    store.reset = function () {
      cancelPending();
      try { if (storage) storage.removeItem(KEY); store.status.writeError = null; }
      catch (e) { store.status.writeError = String(e.message || e); }
      store.state = codec.fresh();
      return store.state;
    };
    if (own(o, 'state')) store.state = codec.migrate(o.state);
    else store.load();
    return store;
  };

  const browser = MEMORY.createStore({
    canWrite: function () { return !MEMORY.readOnly; },
    now: function () { return Date.now(); },
    storage: {
      getItem: function (key) { return localStorage.getItem(key); },
      setItem: function (key, value) { if (!MEMORY.readOnly) localStorage.setItem(key, value); },
      removeItem: function (key) { if (!MEMORY.readOnly) localStorage.removeItem(key); }
    },
    persist: function () {
      if (navigator.storage && navigator.storage.persist) return navigator.storage.persist();
      return false;
    }
  });
  Object.keys(browser).forEach(function (key) {
    Object.defineProperty(MEMORY, key, {
      enumerable: true, get: function () { return browser[key]; },
      set: function (value) { browser[key] = value; }
    });
  });
  window.addEventListener('pagehide', browser.saveNow);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) browser.saveNow();
  });
})();
