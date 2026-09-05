/* Evaluate in a disposable ?dev browser. Independent sampled collision checks. */
(function () {
  const L = SCENE.L, R = SIM._, w = SIM.create(), failures = [];
  const stops = w.seats.concat([L.doorSpot, L.orderSpot, L.pickupSpot,
    L.returnSpot, L.library.browseSpot, L.fire.stand, L.artist.watch, L.umbrellaSpot]);
  for (let i = 0; i < 6; i++) stops.push(R.queueSlot(i), R.waitSpot(i));
  // Keep the original plant-adjacent stop as a regression even if seats move.
  const plant = L.footprints.find(b => b.name === 'plant 0');
  stops.push({x:plant.x0-3,y:L.winSeats[3].y});
  const boxes = L.occluders.map(o => ({name:o.name,x0:o.x0,x1:o.x1,y0:o.top,y1:o.baseline}))
    .concat(L.footprints);
  const inside = (p,b,pad,yp) => p.x>b.x0-pad && p.x<b.x1+pad && p.y>b.y0-yp && p.y<b.y1+yp;
  let journeys = 0, oldLength = 0, newLength = 0, worstMs = 0;
  stops.forEach((a, ai) => stops.forEach((b, bi) => {
    if (ai === bi) return;
    const e = {x:a.x,y:a.y,speed:60,pose:'stand'};
    const t = performance.now(); R.makePath(e,b.x,b.y); worstMs = Math.max(worstMs,performance.now()-t);
    if (!e.path.length) { failures.push('unreachable '+ai+' → '+bi); return; }
    let from = a, length = 0;
    e.path.forEach(to => {
      const d = Math.hypot(to.x-from.x,to.y-from.y); length += d;
      for (let k=0;k<=Math.ceil(d);k++) {
        const f = k/Math.max(1,Math.ceil(d));
        const p = {x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f};
        boxes.forEach(box => {
          const departure = from.x===a.x && from.y===a.y;
          const arrival = to.x===b.x && to.y===b.y;
          const ownSeat = box.seat && ((departure && inside(a,box,0,0)) || (arrival && inside(b,box,0,0)));
          if(ownSeat) return;
          // No solid obstacle is exempt merely because a stop is nearby.
          if(inside(p,box,0,0)) failures.push(ai+' → '+bi+' crosses solid '+box.name);
          const marginStop = (departure && inside(a,box,10,2)) || (arrival && inside(b,box,10,2));
          if(!marginStop && inside(p,box,9,0)) failures.push(ai+' → '+bi+' clips '+box.name);
        });
      }
      from = to;
    });
    oldLength += Math.abs(a.y-L.lane)+Math.abs(b.x-a.x)+Math.abs(b.y-L.lane);
    newLength += length; journeys++;
    // The shipping walker must reach the exact endpoint at hidden-tab dt.
    let arrived = false;
    for(let n=0;n<200;n++) { if(R.walker(e,.25)) { arrived=true; break; } }
    if(!arrived || e.x!==b.x || e.y!==b.y) failures.push('arrival '+ai+' → '+bi);
  }));
  // Same open counter frontage: never retreat to the aisle between service stops.
  const direct = {x:L.orderSpot.x,y:L.orderSpot.y}; R.makePath(direct,L.pickupSpot.x,L.pickupSpot.y);
  if(direct.path.length!==1) failures.push('counter frontage detour');
  if(failures.length) throw Error(JSON.stringify([...new Set(failures)]));
  return {journeys, failures, distanceReduction:Math.round((1-newLength/oldLength)*100)+'%', worstPlanMs:worstMs};
})()
