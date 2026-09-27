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
    // Contents are separate from the shelves. `shelves` is how many books
    // each phase puts on the wall (the shared stocking contract below).
    books: { price:25, destination:'cafe', delivery:'carry', title:'a box of books',
      label:'A box of books for the shelves', furniture:'bookshelf', showsWith:'wall-shelves', requires:['empty-bookshelf'],
      phases:['open the box','shelve the first books','shelve a few more','shelve the last of them','fold the box flat'],
      phaseIds:['open','first','second','last','fold'], duration:12, capability:'shelf-books',
      bookSource:'box', shelves:[0,2,2,2,0] },
    // Holger's six books, a gift: never offered or bought. His attended
    // handover makes it `scheduled` on the counter; the shelving is the same
    // ordinary work as a purchased box.
    holgerBooks: { price:0, gift:true, destination:'cafe', delivery:'gift', title:"Holger's books",
      label:"Holger's books", requires:['empty-bookshelf'],
      phases:['open his box',"shelve the bosun's book and the cookbook",'shelve the garden and bird books','shelve the last two','fold the box flat'],
      phaseIds:['open','first','second','last','fold'], duration:12, capability:'holger-books',
      bookSource:'holger', shelves:[0,2,2,2,0] },
    // Gerda's blanket, a keepsake: never offered or bought. Her gift scene
    // leaves it folded on the counter; downstairs it is draped over the chair
    // nearest the fire as ordinary work, upstairs it goes home with her.
    blanket: { price:0, gift:true, keepsake:true, destination:'cafe', delivery:'gift', title:"Gerda's blanket",
      label:"Gerda's blanket", phases:['drape the blanket over the chair'], phaseIds:['drape'], duration:4,
      capability:'gerda-blanket', homeFlag:'gerda-blanket-home',
      doneLine:'Gerda’s blanket hangs over the chair nearest the fire, for whoever gets cold.',
      homeLine:'Gerda’s blanket goes over the foot of the bed.' },
    // Elody's geranium cutting, Maud: on the counter, or the windowsill upstairs.
    cutting: { price:0, gift:true, keepsake:true, destination:'cafe', delivery:'gift', title:"Maud, Elody's cutting",
      label:"Maud", phases:['set Maud in her place'], phaseIds:['place'], duration:3,
      capability:'elody-cutting', homeFlag:'elody-cutting-home',
      doneLine:'Maud sits on the counter now, in her hand-labelled pot.',
      homeLine:'Maud goes on the windowsill, where she can see the night.' },
    // C2's reading chair: the left fireside wing chair (Holger's usual seat)
    // and its side table with a small lamp. Keira brings it wrapped in
    // blankets on her trolley; Lunafreya unwraps it, turns it to the fire and
    // sets the lamp. A room that already has the fireside pair never needs it.
    readingChair: { price:45, destination:'cafe', delivery:'keira', title:'a reading chair by the fire',
      label:'A reading chair by the fire', furniture:'fireside', showsWith:'wall-shelves', requires:['empty-bookshelf'],
      phases:['unwrap the chair','turn it to the fire','set a lamp beside it'], phaseIds:['unwrap','turn','lamp'],
      duration:12, capability:'reading-chair', doneLine:'a reading chair by the fire, and a small lamp for the evenings.' },
    // Keira's two photographs (an early delivery morning, and now): pinned up
    // by the till, or upstairs beside the old harbour print.
    photo: { price:0, gift:true, keepsake:true, destination:'cafe', delivery:'gift', title:"Keira's photographs",
      label:"Keira's photographs", phases:['pin the photographs up'], phaseIds:['pin'], duration:3,
      capability:'keira-photo', homeFlag:'keira-print-home',
      doneLine:'Keira’s two photographs are pinned up by the till: the first morning, and now.',
      homeLine:'Keira’s photographs go up beside the old harbour.' },
    // Tomas's frame, made from a board he took off the left window: fitted
    // around the photographs wherever they are.
    frame: { price:0, gift:true, keepsake:true, destination:'cafe', delivery:'gift', title:"Tomas's frame",
      label:"Tomas's frame", phases:['fit the frame around the photographs'], phaseIds:['fit'], duration:3,
      capability:'tomas-frame', homeFlag:'keira-print-home',
      doneLine:'The photographs sit in Tomas’s frame now: a board that once kept the weather out.',
      homeLine:'Tomas’s frame goes around Keira’s photographs, above the desk.' },
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
  I.planOrder = ['window','table','windowSeat','bookshelf','books','readingChair','plant','fireplace','mantel'];
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
  /* The little wall shelves' contents: one local contract for books, not a
     general inventory. life.shelf lists each shelved book's source in the
     order it was put up; a stocking project adds its phase's books when
     the phase completes, so the list and project progress always agree.
     Every source together fits the shelves exactly (4 per board). */
  I.shelf = { capacity:12, perRow:4 };
  I.bookProjects = function () { return Object.keys(I.projects).filter(id => I.projects[id].bookSource); };
  I.stocked = function (d, step) {
    let n = 0;
    for (let i = 0; i < step; i++) n += d.shelves[i] || 0;
    return n;
  };
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
    if (!d || d.gift || (h && h.firstNight && !d.tutorial)) return false;
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
