/* Café Hygge — shared improvement definitions, without simulation or storage. */
(function () {
  'use strict';
  const I = window.IMPROVEMENTS = {};
  const stages = ['available','purchased','scheduled','arrived','working','installed'];
  // Everything the planner and purchase rules need lives in the definition:
  // label (planner wording), tutorial (offered on the first evening),
  // unlockFlag (a story flag that must be set first), furniture (a piece that
  // makes the choice moot when the room already has it without this project),
  // showsWith (furniture that must be present to offer it) and requires
  // (capabilities installed by other improvements). Phase order is the saved
  // numeric step contract; reordering phases needs a VERSION bump.
  I.projects = {
    windowSeat: { price:40, destination:'cafe', delivery:'carry', title:'left window table and seats',
      label:'Left window table and seats', unlockFlag:'gerda-pillows-accepted', furniture:'window-seats',
      phases:['unwrap the little table','fit the foot and post','fasten the tabletop','smooth the sill'],
      phaseIds:['unwrap','post','top','sill'], duration:12, capability:'left-window-table', requires:['left-window'] },
    bookshelf: { price:40, destination:'cafe', delivery:'shelf-keira', title:'three little wall shelves',
      label:'Three little wall shelves', furniture:'bookshelf',
      phases:['unwrap the shelves','fit the lower shelf','fit the middle shelf','fit the upper shelf','pack the tools'],
      phaseIds:['unwrap','lower','middle','upper','tidy'], duration:12, capability:'empty-bookshelf' },
    window: { price:30, destination:'cafe', delivery:'contractor', title:'repair the left window',
      label:'Repair the left window', tutorial:true,
      phases:['protect the sill','remove the boards','repair the frame','clean the glass'],
      phaseIds:['protect','unboard','repair','clean'], duration:18, capability:'left-window', pair:'table' },
    table: { price:60, destination:'cafe', delivery:'keira', title:'table and chairs',
      label:'A table for two', tutorial:true,
      phases:['unpack the kit','lay out the legs','fit the tabletop','assemble the chairs','wipe the wood','position the set'],
      phaseIds:['unpack','legs','top','chairs','wipe','position'], duration:18, capability:'project-table', pair:'window' },
    fireplace: { price:30, destination:'cafe', delivery:'carry', title:'reopen the fireplace',
      label:'Reopen the fireplace', unlockFlag:'fireplace-unlocked',
      phases:['remove the boards','sweep the firebox','clear the flue','lay the first fire'],
      phaseIds:['unboard','sweep','flue','light'], duration:18, capability:'hearth' },
    mantel: { price:40, destination:'cafe', delivery:'contractor', title:'mantel shelf and decorations',
      label:'Mantel shelf and decorations', furniture:'mantel-decor', showsWith:'hearth',
      phases:['prepare the supports','fit the mantel shelf','set out the clock, candles and plant'],
      phaseIds:['supports','shelf','decorate'], duration:18, capability:'mantel-decor', requires:['hearth'] }
  };
  I.plant = { price:30, destination:'cafe', delivery:'carry', label:'A plant by the window',
    phases:['scheduled','carry','unpack','place','installed'],
    stages:['available','purchased','scheduled','carry','unpack','place','installed'],
    duration:4, maxTime:8, capability:'first-plant' };
  I.all = Object.assign({}, I.projects, {plant:I.plant});
  // The order choices appear in the evening planner.
  I.planOrder = ['window','table','windowSeat','bookshelf','plant','fireplace','mantel'];
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
  // Whether the planner shows this choice at all (bought ones stay, ticked).
  I.offered = function (world, id) {
    const d = I.all[id], l = world.memory.life, h = l.homeStory;
    if (!d || (h && h.firstNight && !d.tutorial)) return false;
    if (d.unlockFlag && !world.memory.flags[d.unlockFlag]) return false;
    if (d.furniture && l.furniture[d.furniture] && I.state(l,id).stage !== 'installed') return false;
    if (d.showsWith && !SCENE.hasFurniture(world, d.showsWith)) return false;
    return true;
  };
  I.canBuy = function (world, id) {
    const d = I.all[id], l = world.memory.life, p = d && I.state(l,id);
    const h=l.homeStory, tutorial=h && h.firstNight;
    if (tutorial && h.step<12) return false;
    return !!p && I.offered(world,id) && !!world.plannerOpen && world.shop.phase === 'home' &&
      (l.mode === 'game' || tutorial) && I.canPlan(l,id) && p.stage === 'available' && l.savings >= d.price &&
      d.requires.every(capability => I.installed(l,capability));
  };
})();
