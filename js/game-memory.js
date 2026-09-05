/* Separate from the reference cafe save. Explicit v1 -> v2 migration. */
(function () {
  'use strict';
  var KEY = 'fleur-de-lune-save', VERSION = 2;
  function fresh() { return {version:VERSION,done:[],introduced:false,served:false,day:1,stage:'arriving',coins:0,cups:0,upgrades:{},stories:{},plant:'sill',lastStoryDay:0}; }
  function count(n, fallback) { return typeof n === 'number' && isFinite(n) && n >= 0 ? Math.min(1000000, Math.floor(n)) : fallback; }
  function normalize(s) {
    var n = fresh();
    if (!s || (s.version !== 1 && s.version !== VERSION) || !Array.isArray(s.done)) return n;
    FLEUR.tasks.some(function (t) { if (s.done.indexOf(t.id) < 0) return true; n.done.push(t.id); return false; });
    n.introduced = n.done.indexOf('open') >= 0 && s.introduced === true;
    n.served = n.done.indexOf('serve') >= 0 && n.introduced && s.served === true;
    if (!n.introduced) n.done = n.done.filter(function (id) { return id !== 'serve'; });
    if (!n.served) return n;
    // The first cup earns its payment once, including a finished v1 opening.
    n.coins = 6; n.cups = 1; n.stage = 'served';
    if (s.version === 1) return n;
    n.day = Math.max(1, count(s.day, 1));
    n.lastStoryDay = Math.min(n.day, count(s.lastStoryDay, 0));
    n.coins = count(s.coins, 6); n.cups = Math.max(1, count(s.cups, 1));
    if (n.day > 1 && ['arriving','ordered','brewed','served'].indexOf(s.stage) >= 0) n.stage = s.stage;
    FLEUR.upgrades.forEach(function (u) { if (s.upgrades && s.upgrades[u.id] === true) n.upgrades[u.id] = true; });
    Object.keys(FLEUR.stories).forEach(function (id) { if (s.stories && s.stories[id] === true) n.stories[id] = true; });
    if (!n.upgrades.shelf) delete n.stories.book;
    if (!n.stories.cutting) delete n.stories.ownCup;
    n.plant = s.plant === 'table' ? 'table' : 'sill';
    return n;
  }
  window.FLEUR_MEMORY = {
    fresh:fresh, normalize:normalize,
    load:function () { try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return fresh(); } },
    save:function (state) { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  };
}());
