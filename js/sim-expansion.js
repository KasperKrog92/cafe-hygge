/* Café Hygge — the room expansion. Tomas and his daughter take down the
   previous tenant's partition around the small room (IMPROVEMENTS.projects
   .expansion, a contractor job): they come after opening, work from inside
   the room along the partition while guests keep to it, carry the boards out
   through the propped door, and leave at closing. Saved phases resume the
   next morning and after a reload. The view has already pulled back
   (SCENE.presentation); finishing sets the saved room to 'full', opening the
   floor to everyone. No furniture or equipment comes with it. */
(function () {
  'use strict';
  const R = SIM._, L = SCENE.L, E = L.expansion, SND = R.sound;
  const rnd = R.rnd;
  const job = w => w.memory.life.projects.expansion;
  const def = () => IMPROVEMENTS.projects.expansion;
  const ACTIVE = ['scheduled', 'arrived', 'working'];
  const lerp = (a, b, q) => Math.round(a + (b - a) * Math.max(0, Math.min(1, q)));
  // Where Tomas works for the current phase (inside the room, along the
  // partition): kneeling over the dust sheets, prying boards off the right
  // run from the back forward, then the front run from right to left,
  // carrying boards out, kneeling to patch, and gathering the sheets.
  function tomasSpot(w) {
    const p = job(w), q = p.time / def().duration;
    if (p.step === 1) return { x: E.right.x, y: lerp(E.right.y0, E.right.y1, q), pose: 'reach', knock: true };
    if (p.step === 2) return { x: lerp(E.front.x0, E.front.x1, q), y: E.front.y, pose: 'reach', knock: true };
    if (p.step === 3) return null;
    if (p.step === 4) return q < .5 ? { x: E.right.x, y: lerp(E.right.y0, E.right.y1, q * 2), pose: 'kneel' }
      : { x: lerp(E.front.x0, E.front.x1, (q - .5) * 2), y: E.front.y, pose: 'kneel' };
    return { x: E.sheets.x, y: E.sheets.y, pose: 'kneel' };
  }
  // Boards go out while the partition comes down (and in the carrying phase).
  const carrying = p => p.step >= 1 && p.step <= 3;
  function spawn(w, p) {
    const d = CAST.expansionCrew, t = R.makeVisitor(w, 'tomas');
    const h = R.makePatron(w, d.helper.name);
    Object.assign(h, { kind: 'visitor', visitorId: 'tomas-daughter', quiet: true, nameStyle: d.helper.nameStyle,
      colors: Object.assign({}, d.helper.colors), speed: 36, pose: 'stand', holding: null, bubble: null, path: null });
    [t, h].forEach(function (a, i) {
      a.project = 'expansion'; a.x = L.doorSpot.x + i * 6; a.y = L.doorSpot.y + i * 4; a.state = 'arriving'; a.moveT = 0;
    });
    t.knockT = rnd(2, 4);
    h.trip = 'toTomas';
    w.expansionCrew = [t, h];
    R.ringDoor(w);
    R.caption(w, p.stage === 'scheduled' ? d.lines.arrive : d.lines.back);
    if (p.stage === 'scheduled') { p.stage = 'arrived'; R.commitLife(w); }
  }
  function go(a, x, y) {
    // Along the partition they move in short steps as the work moves on.
    if (a.goal && Math.hypot(a.goal.x - x, a.goal.y - y) < 16) return;
    a.goal = { x: x, y: y }; a.path = [{ x: x, y: y }];
  }
  function leave(w) {
    const crew = w.expansionCrew;
    crew.forEach(function (a) {
      if (a.state !== 'leaving') { a.state = 'leaving'; a.holding = null; a.goal = null; a.path = [{ x: L.doorSpot.x, y: L.doorSpot.y }]; }
    });
  }
  function update(w, dt) {
    const p = job(w), crew = w.expansionCrew, d = def();
    w.door.propped = false;
    if (!crew) {
      if (w.shop.phase === 'open' && ACTIVE.indexOf(p.stage) >= 0 && !w.windowWorker && !w.moment) spawn(w, p);
      return;
    }
    crew.forEach(function (a) { a.animT += dt; });
    if (w.moment && crew.indexOf(w.moment.owner) >= 0) return;
    if (w.shop.phase !== 'open' || p.stage === 'installed') leave(w);
    if (crew[0].state === 'leaving') {
      crew.forEach(function (a) { if (a.path && a.path.length) R.walker(a, dt); });
      if (crew.every(function (a) { return !a.path || !a.path.length; })) { w.expansionCrew = null; R.ringDoor(w); }
      return;
    }
    const t = crew[0], h = crew[1];
    // Tomas at his place along the partition (or carrying, in phase 3).
    const spot = tomasSpot(w);
    if (spot) {
      go(t, spot.x, spot.y);
      if (t.path && t.path.length) { t.state = 'walking'; R.walker(t, dt); }
      else {
        // Facing the partition: the right run beside him, the front run towards us.
        const front = spot.y === E.front.y;
        t.state = 'working'; t.pose = spot.pose; t.heading = front ? 'down' : ''; t.facing = 1;
        if (spot.knock && t.low === 0 && (t.knockT -= dt) <= 0) {
          t.knockT = rnd(2.6, 4.6); SND.boardKnock();
          if (R.random() < .08) R.caption(w, R.pick(CAST.expansionCrew.lines.knock));
        }
      }
    } else carry(w, t, dt, 0);
    // His daughter carries boards out, or helps with the sheets and the floor.
    if (carrying(p)) carry(w, h, dt, 1);
    else {
      go(h, E.sheets.x - 40, E.sheets.y);
      if (h.path && h.path.length) R.walker(h, dt);
      else { h.state = 'working'; h.holding = null; h.pose = p.step === 5 ? 'wipe' : 'kneel'; h.heading = 'up'; }
    }
    // The door stays propped while boards go out.
    if (carrying(p)) w.door.propped = true;
    // The work itself: saved phases, like any contractor's.
    if (t.state === 'walking' && p.stage === 'arrived') return;
    if (p.stage === 'arrived') { p.stage = 'working'; R.commitLife(w); }
    const before = p.time;
    p.time = Math.min(d.duration, p.time + dt);
    if (p.time >= d.duration) {
      p.time = 0; p.step++;
      if (p.step === d.phases.length) {
        p.stage = 'installed'; w.memory.life.room = 'full';
        R.caption(w, d.doneLine);
      } else if (p.step === 4) R.caption(w, CAST.expansionCrew.lines.patch);
      R.commitLife(w);
    } else if (Math.floor(before / 3) !== Math.floor(p.time / 3)) R.commitLife(w);
  }
  // A carrier's loop: pick boards up beside Tomas (or where the partition
  // stood), take them out through the door, come back.
  function carry(w, a, dt, which) {
    const t = w.expansionCrew[0], from = which ? { x: t.x - 22, y: t.y } : { x: E.right.x, y: E.right.y0 };
    if (a.trip === 'toDoor') {
      go(a, L.doorSpot.x, L.doorSpot.y + 6);
      if (a.path && a.path.length) { a.state = 'walking'; R.walker(a, dt); return; }
      a.state = 'working'; a.pose = 'stand'; a.heading = 'up';
      if ((a.moveT += dt) >= .9) { a.holding = null; a.trip = 'toTomas'; a.moveT = 0; R.sound.softThump(); }
      return;
    }
    const at = { x: Math.max(40, Math.min(E.right.x, from.x)), y: Math.min(E.front.y, from.y) };
    go(a, at.x, at.y);
    if (a.path && a.path.length) { a.state = 'walking'; R.walker(a, dt); return; }
    a.state = 'working'; a.pose = 'reach'; a.heading = '';
    if ((a.moveT += dt) >= 1.4) { a.holding = 'boards'; a.trip = 'toDoor'; a.moveT = 0; }
  }
  const before = R.updateWindowWorker;
  R.updateWindowWorker = function (w, dt) { before(w, dt); update(w, dt); };
})();
