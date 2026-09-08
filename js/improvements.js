/* Café Hygge — shared improvement definitions, without simulation or storage. */
(function () {
  'use strict';
  const I = window.IMPROVEMENTS = {};
  const stages = ['available','purchased','scheduled','arrived','working','installed'];
  // Phase order is the v7 saved numeric step contract. Reordering needs migration.
  I.projects = {
    windowSeat: { price:40, destination:'cafe', delivery:'carry', title:'left window table and seats',
      phases:['unwrap the little table','fit the foot and post','fasten the tabletop','smooth the sill'],
      phaseIds:['unwrap','post','top','sill'], duration:12, capability:'left-window-table', requires:['left-window'] },
    bookshelf: { price:40, destination:'cafe', delivery:'shelf-keira', title:'three little wall shelves',
      phases:['unwrap the shelves','fit the lower shelf','fit the middle shelf','fit the upper shelf','pack the tools'],
      phaseIds:['unwrap','lower','middle','upper','tidy'], duration:12, capability:'empty-bookshelf' },
    window: { price:30, destination:'cafe', delivery:'contractor', title:'repair the left window',
      phases:['protect the sill','remove the boards','repair the frame','clean the glass'],
      phaseIds:['protect','unboard','repair','clean'], duration:18, capability:'left-window', pair:'table' },
    table: { price:60, destination:'cafe', delivery:'keira', title:'table and chairs',
      phases:['unpack the kit','lay out the legs','fit the tabletop','assemble the chairs','wipe the wood','position the set'],
      phaseIds:['unpack','legs','top','chairs','wipe','position'], duration:18, capability:'project-table', pair:'window' },
    fireplace: { price:30, destination:'cafe', delivery:'carry', title:'reopen the fireplace',
      phases:['remove the boards','sweep the firebox','clear the flue','lay the first fire'],
      phaseIds:['unboard','sweep','flue','light'], duration:18, capability:'hearth' },
    mantel: { price:40, destination:'cafe', delivery:'contractor', title:'mantel shelf and decorations',
      phases:['prepare the supports','fit the mantel shelf','set out the clock, candles and plant'],
      phaseIds:['supports','shelf','decorate'], duration:18, capability:'mantel-decor', requires:['hearth'] }
  };
  I.plant = { price:30, destination:'cafe', delivery:'carry',
    phases:['scheduled','carry','unpack','place','installed'],
    stages:['available','purchased','scheduled','carry','unpack','place','installed'],
    duration:4, maxTime:8, capability:'first-plant' };
  I.all = Object.assign({}, I.projects, {plant:I.plant});
  I.ids = Object.keys(I.all);
  I.ids.forEach(function (id) {
    const d = I.all[id];
    d.id = id; d.requires = d.requires || [];
    if (id !== 'plant') d.stages = stages;
  });
  I.freshProjects = function () {
    const result = {};
    Object.keys(I.projects).forEach(id => { result[id] = {stage:'available',step:0,time:0}; });
    return result;
  };
  I.state = function (life, id) { return id === 'plant' ? life.plant : life.projects[id]; };
  I.installed = function (life, capability) {
    return I.ids.some(id => I.all[id].capability === capability && I.state(life,id).stage === 'installed');
  };
  I.canPlan = function (life, id) {
    if (!life.plannedTonight) return true;
    const d = I.all[id];
    return !!d && !!d.pair && I.state(life,d.pair).stage === 'purchased' &&
      I.ids.every(other => other === id || other === d.pair || I.state(life,other).stage !== 'purchased');
  };
  I.canBuy = function (world, id) {
    const d = I.all[id], l = world.memory.life, p = d && I.state(l,id);
    const h=l.homeStory, tutorial=h && h.firstNight;
    if (tutorial && (h.step<12 || (id!=='window' && id!=='table'))) return false;
    if (id==='bookshelf' && l.furniture.bookshelf) return false;
    if (id==='windowSeat' && (!world.memory.flags['gerda-pillows-accepted'] || l.furniture['window-seats'])) return false;
    if (id==='fireplace' && !world.memory.flags['fireplace-unlocked']) return false;
    if (id==='mantel' && l.furniture['mantel-decor']) return false;
    return !!p && !!world.plannerOpen && world.shop.phase === 'home' && (l.mode === 'game' || tutorial) &&
      I.canPlan(l,id) && p.stage === 'available' && l.savings >= d.price &&
      d.requires.every(capability => I.installed(l,capability));
  };
})();
