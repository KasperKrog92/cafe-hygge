/* Café Hygge — shared improvement definitions, without simulation or storage. */
(function () {
  'use strict';
  const I = window.IMPROVEMENTS = {};
  const stages = ['available','purchased','scheduled','arrived','working','installed'];
  // Phase order is the v7 saved numeric step contract. Reordering needs migration.
  I.projects = {
    window: { price:30, destination:'cafe', delivery:'contractor', title:'repair the left window',
      phases:['protect the sill','remove the boards','repair the frame','clean the glass'],
      phaseIds:['protect','unboard','repair','clean'], duration:18, capability:'left-window', pair:'table' },
    table: { price:60, destination:'cafe', delivery:'carry', title:'table and chairs',
      phases:['unpack the kit','lay out the legs','fit the tabletop','assemble the chairs','wipe the wood','position the set'],
      phaseIds:['unpack','legs','top','chairs','wipe','position'], duration:18, capability:'project-table', pair:'window' },
    fireplace: { price:30, destination:'cafe', delivery:'carry', title:'clean the fireplace',
      phases:['brush the cooled hearth','gather the ash','wipe the stone','polish the hearth'],
      phaseIds:['brush','ash','wipe','polish'], duration:18, capability:'hearth' }
  };
  I.plant = { price:30, destination:'cafe', delivery:'carry',
    phases:['scheduled','carry','unpack','place','installed'],
    stages:['available','purchased','scheduled','carry','unpack','place','installed'],
    duration:4, maxTime:8, capability:'first-plant' };
  I.all = Object.assign({}, I.projects, {plant:I.plant});
  I.ids = Object.keys(I.all);
  I.ids.forEach(function (id) {
    const d = I.all[id];
    d.id = id; d.requires = d.requires || []; // Shipped choices have no prerequisites in either room.
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
    return !!p && !!world.plannerOpen && world.shop.phase === 'home' && l.mode === 'game' &&
      I.canPlan(l,id) && p.stage === 'available' && l.savings >= d.price &&
      d.requires.every(capability => I.installed(l,capability));
  };
})();
