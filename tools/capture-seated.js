/* Evaluate in a disposable ?dev browser. Detached worlds are never ticked. */
(function () {
  'use strict';
  const before = JSON.stringify(__world), save = JSON.stringify(MEMORY.state);
  const rows = ['laptop right', 'laptop left', 'page right', 'page left', 'sip right', 'sip left',
    'knitting', 'sketching', 'painting', 'mixing', 'piano', 'dozing'];
  const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = rows.length * 132;
  const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#c9b28a'; g.fillRect(0, 0, canvas.width, canvas.height);
  const failures = [];
  rows.forEach(function (label, row) {
    g.fillStyle = '#3a2a1c'; g.font = '12px monospace'; g.fillText(label, 8, row * 132 + 16);
    const images = new Set();
    for (let i = 0; i < 6; i++) {
      const seat = row < 2 ? row : row === 8 || row === 9 ? 16 : row === 10 ? 17 : 0;
      const w = __dev.study({seats:[seat]});
      const p = w.patrons[0];
      Object.assign(p, {reading:false,painting:false,playing:false,animT:i*.21,
        facing: row === 3 || row === 5 ? -1 : p.facing});
      if (row < 2) {
        p.typing = true; p.laptopActive = true;
        w.tables[p.seat.table].items.push({kind:'laptop',side:p.seat.side,owner:p.id,open:true});
      }
      if (row === 2 || row === 3) { p.reading = true; p.pageTurn = .8 - i * .15; }
      if (row === 4 || row === 5) { p.holding = 'cup'; p.armUp = [0,.3,.8,1,.7,0][i]; }
      if (row === 6) { p.knitting = true; p.knitProgress = .6; }
      if (row === 7) p.sketching = true;
      if (row === 8 || row === 9) { p.painting = true; p.paintMixing = row === 9; }
      if (row === 10) p.playing = true;
      if (row === 11) { p.reading = true; p.dozing = true; p.animT = i; }
      const c = document.createElement('canvas'); c.width = 70; c.height = 58;
      const cg = c.getContext('2d');
      cg.translate(35 - p.x - (row < 2 ? p.facing * 12 : 0), 54 - p.y);
      if (row < 2 || row >= 8 && row <= 10) SCENE.composeFrame(cg,w);
      else SCENE.drawPerson(cg,p);
      images.add(c.toDataURL());
      g.drawImage(c, 114 + i * 140, row * 132 + 16, 140, 116);
    }
    if (images.size < 2) failures.push(label + ' has no motion');
  });
  if (before !== JSON.stringify(__world) || save !== JSON.stringify(MEMORY.state)) failures.push('mutated live state');
  failures.push.apply(failures,__dev.audit());
  if (failures.length) throw new Error(failures.join('; '));
  const room = __dev.study({seats:[0,1,4,5,10,16,17]});
  room.patrons.slice(0,2).forEach(function(p) {
    p.reading=false;p.typing=true;
    room.tables[p.seat.table].items.push({kind:'laptop',side:p.seat.side,owner:p.id,open:true});
  });
  room.patrons[2].reading=false;room.patrons[2].knitting=true;room.patrons[2].knitProgress=.6;
  room.patrons[3].reading=false;room.patrons[3].sketching=true;
  return {failures:failures, sheet:canvas.toDataURL(),room:__dev.shot(null,{world:room})};
})()
