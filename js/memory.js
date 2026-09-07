/* Café Hygge — pure save codec and an injectable browser persistence adapter. */
(function () {
  'use strict';
  const KEY = 'cafe-hygge-save', VERSION = 6;
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

  // A step consumes version n and must explicitly return version n+1. Add a
  // step and bump VERSION together when the shipped schema actually changes.
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
      if (version >= 2) validateLife(s.life);
      if (version >= 3) validateProjects(s.life);
      if (version >= 4) {
        requireShape(record(s.life.furniture), 'invalid furniture');
        FURNITURE.forEach(id => requireShape(typeof s.life.furniture[id] === 'boolean', 'invalid furniture: ' + id));
        const first=s.life.firstOpening;
        requireShape(record(first) && integer(first.step) && first.step>=0 && first.step<=12 &&
          finite(first.time) && first.time>=0 && first.time<=18, 'invalid first opening');
        if(first.step===12) requireShape(first.time===0 && s.life.furniture['table-window'] &&
          s.life.furniture['table-hearth'], 'unfinished starting tables');
      }
      if (version >= 5) requireShape(s.life.room === 'small' || s.life.room === 'full', 'invalid room size');
      if (version >= 6) {
        const i=s.life.intro;
        requireShape(record(i) && integer(i.line) && i.line>=0 && i.line<=30 &&
          integer(i.finale) && i.finale>=0 && i.finale<=8 && finite(i.time) && i.time>=0 && i.time<=8 &&
          typeof i.skipped==='boolean' && typeof i.complete==='boolean' &&
          ['stored','carried','outside'].indexOf(i.sign)>=0, 'invalid intro');
      }
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
    return { mode: 'idle', savings: 30, hour: 8.4, homeTime: 0,
      plant: { stage: 'available', time: 0 }, projects: freshProjects(), furniture: furnishings(false),
      firstOpening:{step:0,time:0}, intro:freshIntro(false), room:'small', plannedTonight: false, checkpoint: null };
  }
  function freshIntro(complete) {
    return {line:0,finale:complete?8:0,time:0,skipped:false,complete:complete,sign:complete?'outside':'stored'};
  }
  function freshProjects() {
    return { table: { stage: 'available', step: 0, time: 0 }, fireplace: { stage: 'available', step: 0, time: 0 } };
  }
  function validateProjects(l) {
    requireShape(record(l.projects) && typeof l.plannedTonight === 'boolean', 'invalid projects');
    ['table','fireplace'].forEach(function (id) {
      const p = l.projects[id], steps = id === 'table' ? 6 : 4;
      requireShape(record(p) && ['available','purchased','scheduled','arrived','working','installed'].indexOf(p.stage) >= 0 &&
        integer(p.step) && p.step >= 0 && p.step <= steps && finite(p.time) && p.time >= 0 && p.time < 18,
        'invalid project: ' + id);
      requireShape(p.stage === 'installed' ? p.step === steps && p.time === 0 : p.step < steps, 'invalid project completion');
      if (['available','purchased','scheduled','arrived'].indexOf(p.stage) >= 0)
        requireShape(p.step === 0 && p.time === 0, 'invalid project arrival');
    });
  }
  function validateLife(l) {
    requireShape(record(l), 'invalid life');
    requireShape(['idle', 'game'].indexOf(l.mode) >= 0, 'invalid mode');
    requireShape(integer(l.savings) && l.savings >= 0, 'invalid savings');
    requireShape(finite(l.hour) && l.hour >= 0 && l.hour < 24, 'invalid life hour');
    requireShape(finite(l.homeTime) && l.homeTime >= 0 && l.homeTime <= 90, 'invalid home time');
    requireShape(record(l.plant) && ['available','purchased','scheduled','carry','unpack','place','installed'].indexOf(l.plant.stage) >= 0 &&
      finite(l.plant.time) && l.plant.time >= 0 && l.plant.time <= 8, 'invalid plant');
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
  const codec = createCodec(VERSION, { 1: function (s) {
    createCodec(1, {}).validate(s);
    s.version = 2; s.life = freshLife(); return s;
  }, 2: function (s) {
    createCodec(2, {}).validate(s);
    s.version = 3; s.life.projects = freshProjects();
    s.life.plannedTonight = s.life.plant.stage === 'purchased'; return s;
  }, 3: function (s) {
    createCodec(3, {}).validate(s);
    s.version = 4; s.life.furniture = furnishings(true); s.life.firstOpening={step:12,time:0}; return s;
  }, 4: function (s) {
    createCodec(4, {}).validate(s);
    s.version = 5; s.life.room = s.life.furniture['full-counter'] ? 'full' : 'small'; return s;
  }, 5: function (s) {
    createCodec(5, {}).validate(s);
    s.version=6; s.life.intro=freshIntro(s.life.firstOpening.step===12);
    // Earlier assembly is never replayed; remaining remarks join the next chore.
    return s;
  } });
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
