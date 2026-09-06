/* Evaluate in a disposable ?dev browser. Render real walking steps beside
   occupied fireside seats; detached studies are never ticked as simulations. */
(function () {
  const w = __dev.study({hour:14, rain:0, seats:[8,9]});
  const p = Object.assign({}, w.patrons[0], SCENE.L.doorSpot, {
    name:'Visitor', seat:null, pose:'walk', state:'enter', reading:false,
    holding:null, speed:60, path:null, bubble:null, walkDistance:0
  });
  w.patrons.push(p);
  SIM._.makePath(p,SCENE.L.orderSpot.x,SCENE.L.orderSpot.y);
  const route=p.path.map(q=>({x:q.x,y:q.y})), frames=[];
  for(let n=0;n<1000;n++) {
    const arrived=SIM._.walker(p,.05);p.animT=n*.05;
    if(frames.length<3 && p.x>= [298,390,478][frames.length])
      frames.push(__dev.shot(null,{world:w}));
    if(arrived)break;
  }
  return {route,frames};
})()
