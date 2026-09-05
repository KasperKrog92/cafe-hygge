/* Render a detached motion sheet in /?dev. No save, clock or live-world writes. */
(function(){
  'use strict';
  var c=document.createElement('canvas');c.width=960;c.height=1120;
  var g=c.getContext('2d'),before=JSON.stringify(__game.state);
  var times=[[2,4,15,23,37,49],[2,4,18,23,36,55],[2,6,18,24,39,55],[3,7,20,29,40,59]];
  FLEUR.tasks.slice(0,4).forEach(function(task,row){
    times[row].forEach(function(t,col){
      var x=col*160,y=row*280,work={task:task,elapsed:t};
      g.fillStyle='#292c28';g.fillRect(x,y,159,279);
      g.fillStyle='#c0aa84';g.font='12px monospace';g.fillText(task.id+' / '+t+'s',x+9,y+17);
      g.fillStyle='#80634c';g.fillRect(x,y+246,159,2);
      g.save();g.translate(x+70,y+245);g.scale(2,2);
      FLEUR_WORK.draw(g,{x:0,y:0,colors:__game.player.colors},work,t);g.restore();
      g.fillStyle='#c0b6a4';g.font='11px monospace';g.fillText(FLEUR_WORK.phase(work).data.kind,x+9,y+270);
    });
  });
  if(JSON.stringify(__game.state)!==before)throw new Error('Art fixture changed save');
  return c.toDataURL();
}());
