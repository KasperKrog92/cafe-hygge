/* Fleur de Lune — first restoration slice. Shared café sprites and quiet audio. */
(function () {
  'use strict';
  var KEY = 'fleur-de-lune-save', VERSION = 1;
  var canvas = document.getElementById('cafe'), g = canvas.getContext('2d');
  canvas.width = 960; canvas.height = 600;
  var L = SCENE.L.restoration = {
    bounds: {left:224,right:736,top:310,bottom:504},
    table: {left:451,right:516,top:375,bottom:418},
    entry: {x:687,y:335}, seat: {x:438,y:411},
    tasks: [
      {id:'debris',x:360,y:390,label:'Clear the fallen plaster',verb:'Clearing',duration:2.4,line:'A little less yesterday. A little more room.'},
      {id:'sweep',x:564,y:440,label:'Sweep the old floorboards',verb:'Sweeping',duration:3,line:'Good wood under all that dust. I knew it.'},
      {id:'window',x:355,y:325,label:'Repair the window',verb:'Repairing',duration:3,line:'There. The rain can stay on its own side.'},
      {id:'walls',x:531,y:321,label:'Patch and wash the walls',verb:'Restoring',duration:2.8,line:'Not perfect. Mine, though.'},
      {id:'table',x:480,y:427,label:'Set out the second-hand table',verb:'Placing',duration:2,line:'Two chairs. That counts as an invitation.'},
      {id:'brew',x:620,y:329,label:'Unpack the kettle and coffee',verb:'Unpacking',duration:2,line:'A borrowed kettle, ground coffee, two cups. Enough to begin.'},
      {id:'open',x:686,y:335,label:'Turn the sign to open',verb:'Opening',duration:1,line:'Fleur de Lune. Let us see who finds us.'},
      {id:'serve',x:620,y:329,label:'Brew the first coffee',verb:'Brewing',duration:4,line:'Slowly poured. A little courage in a cup.'}
    ]
  };
  function fresh(){return {version:VERSION,done:[],introduced:false,served:false};}
  function load(){try {var s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==VERSION||!Array.isArray(s.done))return fresh();var n=fresh();L.tasks.some(function(t){if(s.done.indexOf(t.id)<0)return true;n.done.push(t.id);return false;});n.introduced=n.done.indexOf('open')>=0&&s.introduced===true;n.served=n.done.indexOf('serve')>=0&&s.served===true;if(!n.introduced){n.done=n.done.filter(function(id){return id!=='serve';});n.served=false;}return n;}catch(e){return fresh();}}
  var save=load(), notice=save.served?'The first cup, the first familiar face. Fleur de Lune has begun.':'', time=0, target=null, working=null, keys={}, talk=null, zoom=1.45;
  var player={x:L.entry.x,y:420,facing:-1,heading:'down',pose:'stand',animT:0,walkDistance:0,colors:{skin:'#e4b68c',hair:'#e7ca79',hairStyle:4,top:'#788b77',pants:'#514355',smock:'#ddd0b4'}};
  var patron={x:L.entry.x,y:L.entry.y,facing:-1,pose:'stand',animT:0,walkDistance:0,colors:{skin:'#d99c6b',hair:'#d9d2c0',top:'#4a7a5a',pants:'#4a3222',scarf:'#a94f3f',hairStyle:1,beard:true}};
  var arrived=false;
  function has(id){return save.done.indexOf(id)>=0;}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){notice='Your browser cannot save this visit. You can still keep playing.';}}
  function next(){if(has('open')&&!save.introduced)return {id:'talk',x:patron.x-40,y:patron.y,label:'Welcome Holger'};if(has('serve'))return {id:'chat',x:patron.x-40,y:patron.y,label:save.served?'Sit a little with Holger':'Bring Holger his coffee'};return L.tasks[save.done.length];}
  function beginTalk(after){target=null;working=null;keys={};player.pose='stand';player.heading=null;player.facing=1;patron.facing=-1;talk={at:0,after:after,lines:after?[
    ['Holger','You kept the old table. My sister used to sit by this window.'],
    ['Lunafreya','One leg is shorter than the others. I thought it deserved another chance.'],
    ['Holger','Most good places do. This is a good cup, Lunafreya.'],
    ['Lunafreya','Then tomorrow, there will be another.']
  ]:[['Holger','I saw the light. Are you open?'],['Lunafreya','Just about. I have coffee, and a table with a very slight lean.'],['Holger','A little lean is all right. I am Holger.'],['Lunafreya','Lunafreya. Welcome to Fleur de Lune.'] ]};showTalk();}
  function showTalk(){document.body.classList.add('conversing');document.getElementById('dialogue').hidden=false;document.getElementById('speaker').textContent=talk.lines[talk.at][0];document.getElementById('line').textContent=talk.lines[talk.at][1];document.getElementById('continue').textContent=talk.at===talk.lines.length-1?'Back to the café':'Continue';}
  document.getElementById('continue').onclick=function(){if(!talk)return;if(++talk.at<talk.lines.length){showTalk();return;}if(talk.after){save.served=true;notice='The first cup, the first familiar face. Fleur de Lune has begun.';}else save.introduced=true;talk=null;document.body.classList.remove('conversing');document.getElementById('dialogue').hidden=true;persist();};
  function act(){if(talk||working)return;var n=next();if(!n)return;if((n.id==='talk'||n.id==='chat')&&!arrived)return;target={x:n.x,y:n.y,task:n};}
  document.getElementById('action').onclick=act;
  function move(p,x,y,dt){var dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,95*dt);p.pose=d>1?'walk':'stand';if(d>1){p.x+=dx/d*step;p.y+=dy/d*step;p.walkDistance+=step;p.facing=dx>=0?1:-1;p.heading=Math.abs(dy)>Math.abs(dx)?(dy>0?'down':'up'):null;}return d<=2;}
  function blocked(x,y){var b=L.table;return has('table')&&x>b.left&&x<b.right&&y>b.top&&y<b.bottom;}
  function walkPlayer(x,y,dt){var b=L.bounds;x=Math.max(b.left,Math.min(b.right,x));y=Math.max(b.top,Math.min(b.bottom,y));var oldX=player.x,oldY=player.y;move(player,x,y,dt);if(blocked(player.x,player.y)){player.x=oldX;player.y=oldY;return false;}return Math.hypot(player.x-x,player.y-y)<3;}
  function update(dt){time+=dt;player.animT=patron.animT=time;zoom+=( (talk?2:1.45)-zoom)*Math.min(1,dt*5);
    SND.update(dt,{rain:0.45,storm:false,fire:{level:0},daylight:0.6});
    if(has('open')&&!arrived){arrived=move(patron,L.seat.x,L.seat.y,dt);if(arrived)patron.pose='sit';}
    if(talk)return;
    if(working){player.pose='stand';working.elapsed+=dt;if(working.elapsed>=working.task.duration){var task=working.task;save.done.push(task.id);notice=task.line;working=null;persist();}return;}
    var dx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),dy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);
    if(dx||dy){target=null;walkPlayer(player.x+dx*100,player.y+dy*100,dt);return;}
    if(target){var waypoint=target;
      // Route around the table's shoulder-expanded box before the final approach.
      if(has('table')){
        var b=L.table;var nodes=[player,target,{x:b.left-4,y:b.top-4},{x:b.right+4,y:b.top-4},{x:b.left-4,y:b.bottom+4},{x:b.right+4,y:b.bottom+4}];
        function clear(a,b){var steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/2);for(var k=0;k<=steps;k++){var f=steps?k/steps:0;if(blocked(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f))return false;}return true;}
        var dist=[0,Infinity,Infinity,Infinity,Infinity,Infinity],prev=[],used=[];
        for(var k=0;k<nodes.length;k++){var u=-1;for(var q=0;q<nodes.length;q++)if(!used[q]&&(u<0||dist[q]<dist[u]))u=q;if(u<0||!isFinite(dist[u]))break;used[u]=true;for(q=0;q<nodes.length;q++)if(!used[q]&&clear(nodes[u],nodes[q])){var cost=dist[u]+Math.hypot(nodes[u].x-nodes[q].x,nodes[u].y-nodes[q].y);if(cost<dist[q]){dist[q]=cost;prev[q]=u;}}}
        var first=1;while(prev[first]!==undefined&&prev[first]!==0)first=prev[first];if(isFinite(dist[1]))waypoint=nodes[first];else{target=null;return;}
      }
      if(walkPlayer(waypoint.x,waypoint.y,dt)&&waypoint===target){var t=target.task;target=null;if(t){if(t.id==='talk'||t.id==='chat')beginTalk(t.id==='chat');else working={task:t,elapsed:0};}}else if(blocked(player.x,player.y))target=null;
    }else player.pose='stand';
  }
  function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);}
  function text(s,x,y,c,size){g.fillStyle=c;g.font=(size||12)+'px Georgia';g.textAlign='center';g.fillText(s,x,y);}
  function room(){rect(0,0,960,600,'#201e24');rect(194,122,572,398,'#15191a');rect(208,132,544,178,has('walls')?'#a4967b':'#736f62');
    for(var row=0;row<11;row++){var yy=310+row*18;rect(208,yy,544,18,row%2?'#775b46':'#80634c');rect(208,yy,544,1,'#493e34');for(var col=0;col<6;col++){var xx=208+col*108+(row%2)*47;if(xx<752)rect(xx,yy,1,18,'#554335');if(xx+12<752)rect(xx+12,yy+7,Math.min(42,752-xx-12),1,'#896c52');}}
    rect(208,300,544,10,'#493f33');rect(202,132,8,382,'#514639');rect(750,132,8,382,'#514639');rect(202,510,556,10,'#a08663');
    rect(285,165,151,129,'#423b32');rect(294,174,133,108,has('window')?'#829b9b':'#526264');
    rect(296,234,130,47,'#637d78');for(var i=0;i<9;i++){var rx=298+i*15,ry=176+(time*46+i*19)%97;rect(rx,ry,1,7,'#afbbb3');}
    rect(355,174,6,110,'#b2a080');rect(294,223,133,5,'#b2a080');rect(281,282,159,8,'#c0aa84');
    if(!has('window')){rect(307,198,5,21,'#c4c2aa');rect(311,215,12,3,'#c4c2aa');rect(320,217,3,17,'#c4c2aa');rect(287,258,148,9,'#695442');rect(306,246,4,28,'#b39a73');}
    rect(653,194,69,107,'#433e34');rect(660,201,55,98,'#687669');rect(667,209,40,48,'#8fa29b');rect(704,269,4,4,'#d2b675');rect(669,263,29,16,'#d6c5a3');text(has('open')?'open':'soon',684,274,'#514533',10);
    rect(485,180,96,54,'#534b3b');rect(488,183,90,48,'#343f39');text('Fleur de Lune',533,205,'#d8c598',13);text(has('open')?'coffee & company':'a place to begin',533,221,'#adae96',10);
    if(!has('walls')){for(i=0;i<20;i++){var x=455+(i*47)%181,y=146+(i*31)%134;rect(x,y,8+i%9,3,'#625f55');}rect(226,162,31,54,'#6b6355');rect(227,178,18,2,'#403f37');}
    rect(576,292,77,13,'#aa8962');rect(580,305,69,28,'#6c5240');rect(582,333,6,7,'#40372e');rect(638,333,6,7,'#40372e');
    if(has('brew')){rect(592,272,21,20,'#a6aaa0');rect(595,267,14,5,'#454c46');rect(610,277,8,4,'#b5b7a8');rect(628,283,10,9,'#e6d8b9');rect(576,278,10,14,'#a48863');if(working&&working.task.id==='serve')for(i=0;i<4;i++)rect(600+Math.sin(time*3+i)*3,267-((time*14+i*7)%30),2,4,'#d8d8bc');}
    else{rect(591,274,42,18,'#977b54');rect(610,274,4,18,'#c3ab78');}
    rect(536,135,2,25,'#403c30');rect(525,156,24,8,has('walls')?'#d5ba7c':'#716747');
    if(has('walls')){var glow=g.createRadialGradient(537,175,4,537,210,150);glow.addColorStop(0,'#f4c87825');glow.addColorStop(1,'#f4c87800');g.fillStyle=glow;g.fillRect(380,135,330,300);}
    if(!has('sweep'))for(i=0;i<85;i++){x=240+(i*67)%472;y=336+(i*43)%163;rect(x,y,3+i%8,2,'#a6947266');}
    if(!has('debris')){for(i=0;i<16;i++)rect(325+(i*23)%79,360+(i*17)%33,9+i%12,4+i%6,i%2?'#a79c82':'#574c3d');rect(350,345,9,36,'#66513a');rect(329,361,42,6,'#927653');}
    // Furniture and people share baseline ordering, as in the original café.
    var draws=[{y:player.y,draw:function(){SCENE.drawPerson(g,player);}}];
    if(has('open'))draws.push({y:patron.y,draw:function(){SCENE.drawPerson(g,patron);}});
    if(has('table'))draws.push({y:418,draw:function(){rect(450,410,67,8,'#493b303f');rect(458,391,5,25,'#483b30');rect(503,391,5,25,'#483b30');rect(450,382,67,10,'#aa8962');rect(450,392,67,5,'#70513b');rect(425,407,24,6,'#967151');rect(428,413,4,12,'#554333');rect(510,409,23,6,'#967151');rect(527,415,4,10,'#554333');if(save.served){rect(460,374,10,8,'#eee2c8');rect(468,375,4,5,'#d5c6a5');}}});
    draws.sort(function(a,b){return a.y-b.y;}).forEach(function(d){d.draw();});
    if(working){var wx=player.x+16+Math.sin(time*15)*5;rect(wx,player.y-35,3,31,'#c7ae7b');rect(wx-5,player.y-6,14,6,'#b49a65');rect(player.x-20,player.y-80,40,4,'#393c33');rect(player.x-20,player.y-80,Math.round(40*working.elapsed/working.task.duration),4,'#d7c08b');}
    var n=next();if(n&&!talk&&!working){rect(n.x-5,n.y-77+Math.round(Math.sin(time*2)*2),10,10,'#dbc38b');text('·',n.x,n.y-68,'#4a493b',14);}
  }
  function render(){g.save();if(zoom>1.001){var focus=Math.max(0,Math.min(1,(zoom-1.45)/0.55));g.translate(480,290-20*focus);g.scale(zoom,zoom);g.translate(-480+35*focus,-320-55*focus);}room();g.restore();var n=next();document.getElementById('objective').textContent=save.served?'A café, at last':has('open')?'Your very first guest':'An abandoned room. A small beginning.';document.getElementById('action').textContent=working?working.task.verb+'…':n?n.label:'Take a moment';document.getElementById('action').disabled=!!talk||!!working||!!(n&&(n.id==='talk'||n.id==='chat')&&!arrived);document.getElementById('status').textContent=notice||'Lunafreya · “I think there is a café in here somewhere.”';}
  window.addEventListener('keydown',function(e){if(/^(INPUT|TEXTAREA)$/.test(e.target.tagName)||(e.target.tagName==='BUTTON'&&e.key===' '))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key)>=0)e.preventDefault();keys[e.key.length===1?e.key.toLowerCase():e.key]=true;if((e.key.toLowerCase()==='e'||e.key===' ')&&!e.repeat)act();});
  window.addEventListener('keyup',function(e){keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});window.addEventListener('blur',function(){keys={};target=null;});
  canvas.addEventListener('pointerdown',function(e){if(talk||working)return;var r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*600/r.height,n=next(),focus=Math.max(0,Math.min(1,(zoom-1.45)/0.55));x=(x-480)/zoom+480-35*focus;y=(y-290+20*focus)/zoom+320+55*focus;if(n&&Math.hypot(x-n.x,y-(n.y-35))<64){act();return;}if(!blocked(x,y))target={x:x,y:y};});
  // Audio remains behind a real user gesture; do not change saved preferences on boot.
  document.getElementById('sound').textContent='Enable sound';
  var soundStarted=false;document.getElementById('sound').onclick=function(){if(!soundStarted){SND.init();soundStarted=true;SND.settings.muted=false;SND.settings.fire=false;}else SND.settings.muted=!SND.settings.muted;SND.applyVolume();this.textContent=SND.settings.muted?'Sound off':'Sound on';};
  var last=performance.now();function frame(now){var dt=Math.min((now-last)/1000,0.25);last=now;update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
  if(new URLSearchParams(location.search).has('dev'))window.__game={state:save,player:player,layout:L,update:update,act:act,audit:function(){var errors=[];if(blocked(player.x,player.y))errors.push('Player inside furniture');if(save.served&&!has('serve'))errors.push('Coffee served before brewing');if(has('serve')&&!save.introduced)errors.push('Service before introduction');if(new Set(save.done).size!==save.done.length)errors.push('Duplicate restoration');return errors;},shot:function(){render();return canvas.toDataURL();}};
}());
