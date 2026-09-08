/* Disposable browser: renderer fixtures are never ticked or installed live. */
(function () {
  'use strict';
  const failures = [], before = JSON.stringify(__world), save = JSON.stringify(MEMORY.state);
  function check(ok, message) { if (!ok) failures.push(message); }
  const rows = [
    ['walk right', 'walk', '', 1], ['walk left', 'walk', '', -1],
    ['walk toward', 'walk', 'down', 1], ['walk away', 'walk', 'up', 1],
    ['opening walk', 'shopWalk', 'down', 1],
    ['sit / blink', 'sit'], ['groom', 'groom'], ['stretch', 'stretch'],
    ['knead', 'knead'], ['bat at mote', 'pounce'], ['eat', 'eat'], ['drink', 'drink'],
    ['sleep', 'sleep'], ['lap', 'lap'], ['loaf', 'loaf'], ['window perch', 'perch'],
    ['shelf tail', 'loaf', '', 1, 'backShelf'], ['hop', 'hop']
  ];
  const sheet = document.createElement('canvas'); sheet.width = 960; sheet.height = rows.length * 90;
  const g = sheet.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#c9b28a'; g.fillRect(0, 0, sheet.width, sheet.height);
  function frame(cat) {
    const c = document.createElement('canvas'); c.width = 72; c.height = 64;
    SCENE.drawCat(c.getContext('2d'), Object.assign({animT:0}, cat, {x:36,y:40})); return c;
  }
  rows.forEach(function (row, r) {
    g.fillStyle = '#3a2a1c'; g.font = '13px monospace'; g.fillText(row[0], 10, r * 90 + 20);
    const frames = new Set();
    for (let i = 0; i < 6; i++) {
      const cat = { state:row[1], heading:row[2] || '', facing:row[3] || 1,
        surface:row[4] || 'floor', animT:row[1] === 'sit' ? 5.1 + i * .12 : i * .37,
        walkDistance:i * 3, stateT:1.6 - i * .3, hopT:i * .15, hopDur:.85 };
      const c = frame(cat); frames.add(c.toDataURL());
      g.drawImage(c, 180 + i * 128, r * 90 + 22);
      [-1, 1].forEach(function (facing) {
        const dressed = Object.assign({}, cat, {facing:facing, scarf:'#a94f3f'});
        check(frame(dressed).toDataURL() === frame(dressed).toDataURL(), row[0] + ' is not deterministic');
      });
    }
    check(frames.size > 1, row[0] + ' has no visible motion');
  });
  // Real walker direction at both ordinary and hidden-tab tick sizes. Short
  // routes and mainly vertical diagonals must not inherit the last profile.
  [1/60, .25].forEach(function (dt) {
    [[0,12,'down'],[0,-12,'up'],[3,30,'down'],[-3,-30,'up'],[30,3,''],[-30,-3,'']].forEach(function (route) {
      const e = {kind:'cat',x:400,y:368,speed:32,facing:-1,gazeFacing:1,
        state:'walk',path:[{x:400+route[0],y:368+route[1]}]};
      SIM._.walker(e,dt);
      check(e.heading === route[2], 'Incorrect cat heading ' + route + ' at dt=' + dt);
      if (!route[2]) check(e.facing === Math.sign(route[0]), 'Incorrect profile facing');
      const walking = frame(e).toDataURL();
      check(walking === frame(Object.assign({},e,{gazeFacing:-1})).toDataURL(), 'Old gaze overrides travel');
      const stopped = Object.assign({}, e, {animT:0});
      check(frame(stopped).toDataURL() === frame(Object.assign({},stopped,{animT:1})).toDataURL(),
        'Walking cycle runs without travel');
    });
  });
  const up = frame({state:'walk',heading:'up',facing:1,animT:0}).toDataURL();
  check(up !== frame({state:'walk',heading:'down',facing:1,animT:0}).toDataURL(), 'Front/back silhouettes identical');
  check(before === JSON.stringify(__world) && save === JSON.stringify(MEMORY.state), 'Gallery mutated live world/save');
  check(__dev.audit().length === 0, 'Live audit');
  // Export a compact animated review and a scarf/mirrored contact sheet.
  const dressed = document.createElement('canvas'); dressed.width=960; dressed.height=rows.length*90;
  const dg=dressed.getContext('2d'); dg.imageSmoothingEnabled=false;
  dg.fillStyle='#c9b28a';dg.fillRect(0,0,dressed.width,dressed.height);
  rows.forEach(function(row,r){
    dg.fillStyle='#3a2a1c';dg.font='13px monospace';dg.fillText(row[0],10,r*90+20);
    for(let i=0;i<6;i++) dg.drawImage(frame({state:row[1],heading:row[2]||'',facing:i<3?-1:1,
      surface:row[4]||'floor',scarf:'#a94f3f',animT:i*.37,walkDistance:i*3,
      stateT:1.6-i*.3,hopT:i*.15,hopDur:.85}),180+i*128,r*90+22);
  });
  window.hoursFrames={'cat-scarf':dressed.toDataURL()};
  const reviewRows=[rows[0],rows[1],rows[2],rows[3],rows[6],rows[7],rows[8],rows[11]];
  for(let i=0;i<24;i++){
    const c=document.createElement('canvas');c.width=768;c.height=400;
    const cg=c.getContext('2d');cg.imageSmoothingEnabled=false;
    cg.fillStyle='#c9b28a';cg.fillRect(0,0,c.width,c.height);
    reviewRows.forEach(function(row,r){
      const left=r%4*192,top=Math.floor(r/4)*200;
      cg.fillStyle='#3a2a1c';cg.font='14px monospace';cg.fillText(row[0],left+12,top+25);
      const sprite=frame({state:row[1],heading:row[2]||'',facing:row[3]||1,
        animT:i*.08,walkDistance:i*2,stateT:1.6-(i%20)*.08});
      cg.drawImage(sprite,8,0,56,56,left+12,top+30,168,168);
    });
    window.hoursFrames['cat-loop-'+String(i).padStart(2,'0')]=c.toDataURL();
  }
  if (failures.length) throw Error(failures.join('; '));
  return {failures:failures, rows:rows.length, sheet:sheet.toDataURL()};
})()
