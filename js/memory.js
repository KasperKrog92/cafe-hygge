/* Café Hygge — MEMORY: the café's persistent, cross-visit memory.

   The narrative layer's keystone (docs/narrative.md §4). Mirrors SND.save()'s
   proven localStorage pattern: a single versioned JSON blob under
   `cafe-hygge-save` holding story arcs, bonds, and flags, plus a real-time
   `lastSeen` visit stamp (metadata — arcs ride the café's own clock, not the
   calendar; docs/narrative.md §3). Zero dependencies, loaded before sim-core
   so world creation can reconcile against it.

   Non-negotiables (docs/narrative.md §4):
   - Versioned, with a forward migration ladder — an old save is upgraded
     field-by-field, never dropped; a returning reader is never bricked by a
     code update. This is the single most important discipline in the layer.
   - Graceful fallback is a hard rule — a missing, unparseable, or wrong-shaped
     save always opens a FRESH café, never an error, never a "save not found".
     Data loss degrades to day zero, which is still a complete experience.
   - localStorage's limits are acknowledged, not fought (per-browser, cleared
     with site data, ~7-day purge on Safari/iOS). A lost save is a fresh café.

   This file guards the save's *shape*; the *semantic* reconcile against the arc
   and regular definitions (clamping a stage past its arc, dropping an arc that
   names a renamed regular, raising an invitation a threshold-touching save is
   owed) happens at world creation in sim-core. The dev audit checks both. */
(function () {
  'use strict';

  const MEMORY = (window.MEMORY = {});
  const KEY = 'cafe-hygge-save';
  const VERSION = 1;
  MEMORY.VERSION = VERSION;

  /* Date is available in the app — the ban on Date.now() is a Workflow-
     scripting constraint, not an app one. Real calendar time stamps `lastSeen`
     and dates bond continuity; arc pacing rides the café's in-world day
     (updateNarrative in sim-core — narrative.md §3). */
  function nowMs() { return Date.now(); }
  MEMORY.now = nowMs;

  function fresh() {
    return { version: VERSION, lastSeen: nowMs(), arcs: {}, bonds: {}, flags: {} };
  }

  /* The migration ladder. Each step upgrades a save exactly one version
     forward; the loader runs every step from the save's version up to the
     current VERSION, so a save written by any past build lands on today's
     shape. When the schema changes: add a step here (never edit an old one) and
     bump VERSION. Field back-filling below covers a save that merely predates a
     field, so most additive changes need no dedicated step. */
  const MIGRATIONS = {
    // 1: function (s) { /* upgrade a v1 save to v2 */ return s; }
  };

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return fresh();
    let s = raw;
    let v = typeof s.version === 'number' ? s.version : 0;
    while (v < VERSION && MIGRATIONS[v]) { s = MIGRATIONS[v](s) || s; v++; }
    s.version = VERSION;
    // back-fill any missing top-level shape so a partial/old save loads whole
    if (typeof s.lastSeen !== 'number') s.lastSeen = nowMs();
    if (!s.arcs || typeof s.arcs !== 'object') s.arcs = {};
    if (!s.bonds || typeof s.bonds !== 'object') s.bonds = {};
    if (!s.flags || typeof s.flags !== 'object') s.flags = {};
    return s;
  }

  MEMORY.load = function () {
    let s;
    try {
      const raw = localStorage.getItem(KEY);
      s = raw ? migrate(JSON.parse(raw)) : fresh();
    } catch (e) {
      s = fresh();   // corrupt / unparseable / storage blocked → a fresh café
    }
    MEMORY.state = s;
    return s;
  };

  let saveT = null;
  function writeNow() {
    saveT = null;
    try { localStorage.setItem(KEY, JSON.stringify(MEMORY.state)); } catch (e) {}
  }

  // debounced write (coalesces the boot reconcile's stamp + progress into one
  // put), same try/catch guard as SND.save(). Narrative state changes are rare,
  // so a short debounce never risks a dropped beat — and hidden/pagehide flush
  // below covers a reader who closes the tab the instant they tap.
  MEMORY.save = function () {
    if (saveT) return;
    saveT = setTimeout(writeNow, 400);
  };
  MEMORY.saveNow = function () {
    if (saveT) { clearTimeout(saveT); saveT = null; }
    writeNow();
  };

  MEMORY.reset = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    MEMORY.state = fresh();
    return MEMORY.state;
  };

  MEMORY.stamp = function () { MEMORY.state.lastSeen = nowMs(); };

  /* Ask the browser to exempt this origin from disk-pressure eviction — cheap,
     strictly better, fire-and-forget. Firefox prompts, Chrome often grants
     silently; it does not beat Safari's ~7-day cap (roadmap.md → Save
     durability). Called once on boot. */
  MEMORY.requestPersist = function () {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) {}
  };

  // flush a pending debounced write when the reader leaves, so a beat tapped
  // and immediately abandoned is never lost
  try {
    window.addEventListener('pagehide', MEMORY.saveNow);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) MEMORY.saveNow();
    });
  } catch (e) {}

  MEMORY.load();
})();
