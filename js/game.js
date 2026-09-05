/* Fleur de Lune — restoration, returning people, and a room taking shape. */
(function () {
  'use strict';
  var canvas = document.getElementById('cafe'), g = canvas.getContext('2d');
  canvas.width = 960; canvas.height = 600;
  var L = SCENE.L.restoration = {
    bounds:{left:224,right:736,top:310,bottom:504},
    table:{left:451,right:516,top:375,bottom:418},
    entry:{x:687,y:335}, seat:{x:438,y:411}, ownerSeat:{x:536,y:411},
    conversation:{x:540,y:420}, kettle:{x:620,y:349},
    shelf:{x:229,y:222}, lamp:{x:420,y:243}, plantSill:{x:320,y:281}, plantTable:{x:489,y:381},
    rug:{x:405,y:396,w:150,h:51}, tasks:FLEUR.tasks,
    workSites:{debris:[{x:360,y:390},{x:387,y:390}],sweep:[{x:300,y:370},{x:423,y:448},{x:553,y:400},{x:663,y:466}],window:[{x:337,y:310},{x:402,y:310}],walls:[{x:466,y:310},{x:606,y:310}]},
    workProps:{sack:{x:411,y:391},paper:{x:301,y:278},wear:{x:405,y:429},bucket:{x:367,y:323},plaster:{x:637,y:324}}
  };
  var save = FLEUR_MEMORY.load(), notice = save.served ? 'Another cup whenever you are ready. This room can wait.' : '';
  var time = 0, target = null, working = null, keys = {}, talk = null, zoom = 1.45, resting = false, modal = null;
  var saveFailed = false, arrived = false, lastFocus = null, selectedDrink = 'coffee';
  var heldWork=null, cameraX=480, cameraY=320, cameraScreenY=290;
  var player = {x:L.entry.x,y:450,facing:-1,heading:'down',pose:'stand',animT:0,walkDistance:0,colors:{skin:'#e4b68c',hair:'#e7ca79',hairStyle:4,top:'#788b77',pants:'#514355',smock:'#ddd0b4'}};
  var patron = {x:L.entry.x,y:L.entry.y,facing:1,pose:'stand',animT:0,walkDistance:0};
  function el(id) { return document.getElementById(id); }
  function uiText(id,value) { if(el(id).textContent!==value)el(id).textContent=value; }
  function has(id) { return save.done.indexOf(id) >= 0; }
  function visit() { return save.day === 1 ? {guest:'holger',drink:'coffee'} : FLEUR.visit(save.day,save); }
  function name() { return FLEUR.people[visit().guest].name; }
  function persist() { saveFailed = !FLEUR_MEMORY.save(save); }
  function setPatron() {
    patron.colors = FLEUR.people[visit().guest].colors;
    patron.x = L.entry.x; patron.y = L.entry.y; patron.pose = 'stand'; patron.heading = null;
    patron.reading = false; patron.hasCup = false; patron.walkDistance = 0; arrived = false;
  }
  setPatron();
  function task(id, point, label, extra) {
    var t = {id:id,x:point.x,y:point.y,label:label};
    Object.keys(extra || {}).forEach(function (key) { t[key] = extra[key]; });
    return t;
  }
  function next() {
    if (save.served) {
      if (save.stage === 'arriving') return task('order',L.conversation,'Welcome ' + name());
      if (save.stage === 'ordered') return task('choose',L.kettle,'Make ' + name() + '’s ' + visit().drink);
      if (save.stage === 'brewed') return task('deliver',L.conversation,'Bring ' + name() + ' the ' + visit().drink,{duration:1,verb:'Setting down the cup'});
      return task('rest',L.ownerSeat,resting?'Get up when you are ready':'Sit a little with ' + name());
    }
    if (has('open') && !save.introduced) return task('talk',L.conversation,'Welcome Holger');
    if (has('serve')) return task('chat',L.conversation,'Bring Holger his coffee');
    return L.tasks[save.done.length];
  }
  function stop() { target = null; keys = {}; resting = false; player.pose = 'stand'; }
  function startTalk(lines, complete, choices, seated) {
    stop(); player.heading = null; player.facing = -1; patron.facing = 1; patron.reading = false;
    lastFocus = document.activeElement;
    talk = {at:0,lines:lines.slice(),complete:complete,choices:choices,choice:null,seated:!!seated};
    if(seated)player.pose='sit';
    document.body.classList.add('conversing'); el('dialogue').hidden = false;
    showTalk(); el('continue').focus();
  }
  function showTalk() {
    el('speaker').textContent = talk.lines[talk.at][0]; el('line').textContent = talk.lines[talk.at][1];
    el('continue').hidden = false;
    el('continue').textContent = talk.at === talk.lines.length - 1 ? (heldWork?heldWork.task.moment.resume:talk.choices?'Choose a place':'Back to the café') : 'Continue';
    var old = el('choices'); if (old) old.remove();
  }
  el('continue').onclick = function () {
    if (!talk) return;
    if (talk.at + 1 < talk.lines.length) { talk.at++; showTalk(); return; }
    if (talk.choices) {
      if (el('choices')) return;
      var choices = document.createElement('div'); choices.id = 'choices';
      talk.choices.forEach(function (choice) {
        var b = document.createElement('button'); b.textContent = choice.label;
        b.onclick = function () { talk.choice = choice.id; talk.choices = null; talk.lines = choice.reply; talk.at = 0; showTalk(); el('continue').focus(); };
        choices.appendChild(b);
      });
      el('continue').hidden = true; el('dialogue').appendChild(choices); choices.firstChild.focus(); return;
    }
    var ended = talk; talk = null; ended.complete(ended.choice); resting=ended.seated; persist();
    document.body.classList.remove('conversing'); el('dialogue').hidden = true;
    if (lastFocus && !lastFocus.hidden) lastFocus.focus(); else el('action').focus();
  };
  function openModal(id) {
    stop(); modal = id; el(id).showModal();
  }
  function closeModal(id) { modal = null; el(id).close(); keys = {}; }
  ['notebook','drinks'].forEach(function (id) {
    el(id).addEventListener('close',function () { if(!el(id).open&&modal===id)modal=null; keys = {}; });
    el('close-' + id).onclick = function () { closeModal(id); };
  });
  function act(chosen) {
    if (talk || working || modal) return;
    var n = chosen && chosen.id ? chosen : next(); if (!n) return;
    if (['talk','chat','order','deliver','story','rest'].indexOf(n.id) >= 0 && !arrived) return;
    if (resting && n.id === 'rest') { resting = false; player.pose = 'stand'; return; }
    resting = false; target = {x:n.x,y:n.y,task:n};
  }
  el('action').onclick = function () { if(working&&working.task.phases){working.paused=!working.paused;keys={};return;}act(); };
  el('invitation').onclick = function () { var id = FLEUR.invitation(save); if (id) act(task('story',L.ownerSeat,FLEUR.stories[id].title,{story:id})); };
  el('tomorrow').onclick = function () {
    if (!save.served || save.stage !== 'served') return;
    act(task('tomorrow',L.kettle,'Another morning',{duration:2,verb:'Washing the cups'}));
  };
  function notebook() {
    var body = el('notebook-body'); body.replaceChildren();
    function paragraph(text, cls) { var p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; body.appendChild(p); }
    paragraph('Morning ' + save.day + ' · ' + save.cups + (save.cups === 1?' cup served':' cups served') + ' · ' + save.coins + ' coins for the café','ledger');
    paragraph('Each cup leaves 6 coins after supplies. Improvements are yours to choose.');
    var h = document.createElement('h3'); h.textContent = 'For this room'; body.appendChild(h);
    FLEUR.upgrades.forEach(function (u) {
      var b = document.createElement('button'); b.className = 'improvement';
      var title = document.createElement('span'); title.textContent = u.name + (save.upgrades[u.id]?' · In the room':' · ' + u.cost + ' coins');
      var desc = document.createElement('small'); desc.textContent = u.description;
      b.appendChild(title); b.appendChild(desc); b.disabled = !!save.upgrades[u.id] || save.coins < u.cost;
      b.onclick = function () { closeModal('notebook'); act(task('upgrade',u,u.name,{upgrade:u.id,duration:u.duration,verb:u.verb})); };
      body.appendChild(b);
    });
    h = document.createElement('h3'); h.textContent = 'Things I want to remember'; body.appendChild(h);
    paragraph('The first cup — Holger found the light. I told him there would be another tomorrow.');
    FLEUR.tasks.forEach(function(t){if(t.note&&has(t.id))paragraph(t.note);});
    Object.keys(FLEUR.stories).forEach(function (id) { if (save.stories[id]) paragraph(FLEUR.stories[id].note); });
    if (save.stories.cutting) paragraph('The cutting lives ' + (save.plant === 'sill'?'on the windowsill. I see it from the kettle.':'on the old table. A little company between the cups.'));
    var invitation = FLEUR.invitation(save);
    if (invitation) paragraph(name() + ' has something to share: “' + FLEUR.stories[invitation].title + '.” It can wait.','invitation-note');
    openModal('notebook');
  }
  el('journal').onclick = function () { if (!talk && !working && !modal && save.served) notebook(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-drink]'),function (button) {
    button.onclick = function () {
      if (save.stage !== 'ordered') return;
      selectedDrink = button.dataset.drink; closeModal('drinks');
      working = {task:task('drink',L.kettle,'Brew',{duration:selectedDrink==='tea'?4:3.5,verb:selectedDrink==='tea'?'Steeping tea':'Pouring coffee'}),elapsed:0};
      SND.kettlePour(1.5);
    };
  });
  function move(p,x,y,dt) {
    var dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,95*dt);
    p.pose=d>1?'walk':'stand';
    if(d>1){p.x+=dx/d*step;p.y+=dy/d*step;p.walkDistance+=step;p.facing=dx>=0?1:-1;p.heading=Math.abs(dy)>Math.abs(dx)?(dy>0?'down':'up'):null;}
    return d<=2;
  }
  function blocked(x,y) { var b=L.table; return has('table') && x>b.left && x<b.right && y>b.top && y<b.bottom; }
  function clear(a,b) {
    var steps=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/2);
    for(var k=0;k<=steps;k++){var f=steps?k/steps:0;if(blocked(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f))return false;} return true;
  }
  // Both guests and the owner use the same visible-corner routes.
  function route(p,destination) {
    if (!has('table') || clear(p,destination)) return destination;
    var b=L.table,nodes=[p,destination,{x:b.left-5,y:b.top-5},{x:b.right+5,y:b.top-5},{x:b.left-5,y:b.bottom+5},{x:b.right+5,y:b.bottom+5}];
    var dist=[0,Infinity,Infinity,Infinity,Infinity,Infinity],prev=[],used=[];
    for(var k=0;k<nodes.length;k++){
      var u=-1;for(var q=0;q<nodes.length;q++)if(!used[q]&&(u<0||dist[q]<dist[u]))u=q;
      if(u<0||!isFinite(dist[u]))break;used[u]=true;
      for(q=0;q<nodes.length;q++)if(!used[q]&&clear(nodes[u],nodes[q])){
        var cost=dist[u]+Math.hypot(nodes[u].x-nodes[q].x,nodes[u].y-nodes[q].y);
        if(cost<dist[q]){dist[q]=cost;prev[q]=u;}
      }
    }
    var first=1;while(prev[first]!==undefined&&prev[first]!==0)first=prev[first];
    return isFinite(dist[1])?nodes[first]:null;
  }
  function walkPlayer(x,y,dt) {
    var b=L.bounds;x=Math.max(b.left,Math.min(b.right,x));y=Math.max(b.top,Math.min(b.bottom,y));
    var old={x:player.x,y:player.y};move(player,x,y,dt);
    if(!clear(old,player)){player.x=old.x;player.y=old.y;return false;}
    return Math.hypot(player.x-x,player.y-y)<2;
  }
  function interact(t) {
    if(t.id==='talk')startTalk(FLEUR.introduction,function(){save.introduced=true;});
    else if(t.id==='chat')startTalk(FLEUR.firstCup,function(){save.served=true;save.stage='served';save.coins=6;save.cups=1;notice='The first cup earned 6 coins. A reading lamp, perhaps. Or keep them for a shelf.';});
    else if(t.id==='order')startTalk(visit().lines,function(){save.stage='ordered';notice=name()+' would like '+visit().drink+'. There is no hurry.';});
    else if(t.id==='story'){
      var story=FLEUR.stories[t.story];
      startTalk(story.lines,function(choice){save.stories[t.story]=true;save.lastStoryDay=save.day;if(choice)save.plant=choice;notice=story.note;},story.choices,true);
    }else if(t.id==='choose'){el('order').textContent=name()+' asked for '+visit().drink+'.';openModal('drinks');}
    else if(t.id==='rest'){resting=true;player.facing=-1;player.heading=null;SND.chairScrape(false);notice='The kettle can wait. For a moment, this chair is mine.';}
    else {working={task:t,elapsed:0};if(t.id==='serve')SND.kettlePour(1.5);}
  }
  function finishWork(t) {
    if(t.id==='drink'){
      if(selectedDrink===visit().drink){save.stage='brewed';notice='Ready to carry over. '+name()+' is still here.';}
      else notice='That was '+selectedDrink+'. '+name()+' asked for '+visit().drink+'. I will make another; nothing lost.';
    }else if(t.id==='deliver'){
      if(save.stage==='brewed'){save.stage='served';save.coins+=6;save.cups++;SND.cupDown();notice='A cup for '+name()+'. 6 coins set aside for the café.';}
    }else if(t.id==='tomorrow'){
      save.day++;save.stage='arriving';setPatron();SND.doorBell();notice='Clean cups. A fresh morning. Let us see who finds us today.';
    }else if(t.id==='upgrade'){
      var u=FLEUR.upgrades.filter(function(item){return item.id===t.upgrade;})[0];
      if(!save.upgrades[u.id]&&save.coins>=u.cost){save.coins-=u.cost;save.upgrades[u.id]=true;notice=u.line;}
    }else if(!has(t.id)){save.done.push(t.id);notice=t.line;if(t.id==='open')SND.doorBell();}
    persist();
  }
  function update(dt) {
    time+=dt;player.animT=patron.animT=time;
    var solo=!!heldWork;
    var cameraRate=Math.min(1,dt*(solo?1.1:2));
    zoom+=((solo?2.05:talk?1.95:1.45)-zoom)*cameraRate;
    cameraX+=((solo?player.x+28:480)-cameraX)*cameraRate;
    cameraY+=((solo?player.y-36:talk?375:320)-cameraY)*cameraRate;
    cameraScreenY+=((talk?245:290)-cameraScreenY)*cameraRate;
    SND.update(dt,{rain:0.45,storm:false,fire:{level:0},daylight:0.6});
    // Gestures belong to ambient life, including while a conversation waits.
    patron.reading=arrived&&!talk&&save.stage==='served'&&visit().guest==='holger'&&Math.sin(time/9)>-0.6;
    patron.pageTurn=patron.reading&&time%11<0.8?0.8-time%11:0;
    patron.holding=arrived&&save.stage==='served'&&!patron.reading?'cup':null;
    patron.armUp=Math.max(0,Math.sin(time*0.8))*0.9;
    player.holding=(save.served?save.stage==='brewed':has('serve'))?'cup':null;
    if(resting)player.holding='cup';
    player.armUp=resting?Math.max(0,Math.sin(time*0.7+2))*0.8:0;
    if(talk||modal)return;
    if(has('open')&&!arrived){var step=route(patron,L.seat);if(step&&move(patron,step.x,step.y,dt)&&step===L.seat)arrived=true;}
    if(arrived){patron.pose='sit';patron.heading=null;patron.facing=1;}
    if(working){
      player.pose='stand';
      if(working.paused)return;
      var ph=FLEUR_WORK.phase(working);
      if(ph){
        var site=L.workSites[working.task.id][ph.data.site];
        working.moving=Math.hypot(player.x-site.x,player.y-site.y)>2;
        if(working.moving){move(player,site.x,site.y,dt*0.32);return;}
        var soundBeat=ph.index+':'+Math.floor(ph.elapsed/5.6);
        if(ph.data.kind!=='rest'&&ph.elapsed%5.6>=0.9&&working.soundBeat!==soundBeat){working.soundBeat=soundBeat;SND.workStroke(ph.data.kind);}
      }
      working.elapsed=Math.min(working.task.duration,working.elapsed+dt);
      var moment=working.task.moment;
      if(moment&&!working.reflected&&working.elapsed>=moment.at){
        working.elapsed=moment.at;working.reflected=true;working.reflecting=true;
        heldWork=working;working=null;
        startTalk(moment.lines,function(){working=heldWork;heldWork=null;working.reflecting=false;keys={};notice='';});
        return;
      }
      if(working.elapsed>=working.task.duration){var t=working.task;working=null;keys={};finishWork(t);}return;
    }
    var dx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),dy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);
    if(dx||dy){target=null;resting=false;walkPlayer(player.x+dx*100,player.y+dy*100,dt);return;}
    if(target){
      var waypoint=route(player,target);
      if(!waypoint){target=null;return;}
      if(walkPlayer(waypoint.x,waypoint.y,dt)&&waypoint===target){var action=target.task;target=null;if(action)interact(action);}
    }else player.pose=resting?'sit':'stand';
  }

  function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);}
  function text(s,x,y,c,size){g.fillStyle=c;g.font=(size||12)+'px Georgia';g.textAlign='center';g.fillText(s,x,y);}
  function cup(x,y) { rect(x-2,y+7,15,2,'#493b3066');rect(x,y,10,8,'#eee2c8');rect(x+9,y+1,4,5,'#d5c6a5');rect(x+2,y,6,2,'#70513b'); }
  function plant(anchor) {
    var x=anchor.x,y=anchor.y,sway=Math.round(Math.sin(time*0.8));
    rect(x-9,y-2,20,3,'#493b3044');rect(x-7,y-11,14,10,'#a94f3f');rect(x-9,y-13,18,4,'#c08a58');rect(x-5,y-9,3,6,'#bc7951');
    rect(x,y-33,2,21,'#788b77');rect(x-8+sway,y-28,9,5,'#788b77');rect(x+2+sway,y-34,9,5,'#8d9d77');rect(x-6,y-19,8,4,'#4a7a5a');
  }
  function additions() {
    var x,y,i;
    if(save.upgrades.rug){var r=L.rug;rect(r.x-2,r.y+2,r.w+4,r.h,'#493b3044');rect(r.x,r.y,r.w,r.h,'#8f5a3a');rect(r.x+4,r.y+3,r.w-8,r.h-6,'#a34d3b');rect(r.x+9,r.y+7,r.w-18,r.h-14,'#8f5a3a');for(i=0;i<12;i++){rect(r.x+12+i*11,r.y+4,3,2,'#c08a58');rect(r.x+12+i*11,r.y+r.h-6,3,2,'#c08a58');}}
    if(save.upgrades.shelf){x=L.shelf.x;y=L.shelf.y;rect(x-2,y+8,44,5,'#493b3022');rect(x,y,42,5,'#c0aa84');rect(x,y+5,42,4,'#70513b');rect(x+5,y+9,4,16,'#70513b');rect(x+34,y+9,4,16,'#70513b');if(save.stories.book){rect(x+5,y-20,9,20,'#4a7a5a');rect(x+7,y-17,5,2,'#d7c08b');rect(x+11,y-21,2,12,'#eee2c8');rect(x+15,y-7,19,7,'#a94f3f');rect(x+17,y-5,15,3,'#d5c6a5');}}
    if(save.upgrades.lamp){x=L.lamp.x;y=L.lamp.y;var light=g.createRadialGradient(x,y+15,3,x,y+40,105);light.addColorStop(0,'#f4c87840');light.addColorStop(1,'#f4c87800');g.fillStyle=light;g.fillRect(x-105,y-65,210,210);rect(x-2,y+3,4,33,'#a48863');rect(x-9,y+35,18,4,'#d2b675');rect(x-8,y-5,16,4,'#c3ab78');rect(x-12,y-1,24,10,'#d2b675');rect(x-14,y+9,28,3,'#e6d8b9');}
    if(save.stories.cutting&&save.plant==='sill')plant(L.plantSill);
    if(has('open')){rect(659,305,55,18,'#8a6142');rect(664,309,45,2,'#a48863');rect(664,317,45,2,'#a48863');}
  }
  function room(){rect(0,0,960,600,'#201e24');rect(194,122,572,398,'#15191a');rect(208,132,544,178,has('walls')?'#a4967b':'#736f62');
    for(var row=0;row<11;row++){var yy=310+row*18;rect(208,yy,544,18,row%2?'#775b46':'#80634c');rect(208,yy,544,1,'#493e34');for(var col=0;col<6;col++){var xx=208+col*108+(row%2)*47;if(xx<752)rect(xx,yy,1,18,'#554335');if(xx+12<752)rect(xx+12,yy+7,Math.min(42,752-xx-12),1,'#896c52');}}
    rect(208,300,544,10,'#493f33');rect(202,132,8,382,'#514639');rect(750,132,8,382,'#514639');rect(202,510,556,10,'#a08663');
    var activeWork=working||heldWork;
    var cleanWindow=FLEUR_WORK.progress('window',save.done,activeWork),cleanWalls=FLEUR_WORK.progress('walls',save.done,activeWork),cleanDebris=FLEUR_WORK.progress('debris',save.done,activeWork),cleanFloor=FLEUR_WORK.progress('sweep',save.done,activeWork);
    rect(285,165,151,129,'#423b32');rect(294,174,133,108,save.served?'#829b9b':'#394c60');
    rect(296,234,130,47,save.served?'#637d78':'#455a62');
    if(!save.served){rect(319,237,13,13,'#d8d8bc');rect(322,234,7,19,'#d8d8bc');rect(328,235,5,11,'#455a62');}
    for(var i=0;i<9;i++){var rx=298+i*15,ry=176+(time*26+i*19)%97;rect(rx,ry,1,7,'#afbbb377');}
    // Dirty glass is removed in small overlapping patches, not a final swap.
    if(cleanWindow<1){g.beginPath();for(i=0;i<180;i++){
      var gx=295+(i%15)*9,gy=175+Math.floor(i/15)*9;
      var distance=Math.hypot((gx-323)*0.85,gy-253);
      var radius=Math.max(0,(cleanWindow-0.20)*240);
      if(distance>radius)g.rect(gx,gy,9,9);
    }g.fillStyle='#77705bdd';g.fill();
      for(i=0;i<27;i++){gx=297+(i*31)%120;gy=176+(i*43)%94;if(Math.hypot((gx-323)*0.85,gy-253)>radius){rect(gx,gy,2,12,'#4c514733');rect(gx+2,gy+7,6,2,'#9a8d6333');}}
    }
    rect(355,174,6,110,'#b2a080');rect(294,223,133,5,'#b2a080');rect(281,282,159,8,'#c0aa84');
    if(cleanWindow<0.21){rect(307,198,5,21,'#c4c2aa');rect(311,215,12,3,'#c4c2aa');rect(320,217,3,17,'#c4c2aa');rect(287,258,148,9,'#695442');rect(306,246,4,28,'#b39a73');}
    rect(653,194,69,107,'#433e34');rect(660,201,55,98,'#687669');rect(667,209,40,48,'#8fa29b');rect(704,269,4,4,'#d2b675');rect(669,263,29,16,'#d6c5a3');text(has('open')?'open':'soon',684,274,'#514533',10);
    rect(485,180,96,54,'#534b3b');rect(488,183,90,48,'#343f39');text('Fleur de Lune',533,205,'#d8c598',13);text(has('open')?'coffee & company':'a place to begin',533,221,'#adae96',10);
    if(!has('walls')){for(i=Math.floor(cleanWalls*20);i<20;i++){var x=455+(i*47)%181,y=146+(i*31)%134;rect(x,y,8+i%9,3,'#625f55');}rect(226,162,31,54,'#6b6355');rect(227,178,18,2,'#403f37');}
    // The first repair keeps its seam and a narrow edge of earlier green paint.
    rect(444,243,23,36,'#63745f');rect(447,246,20,33,cleanWalls>0.24?'#b4a48a':'#625f55');
    if(cleanWalls>0){rect(449,248,16,Math.round(29*Math.min(1,cleanWalls*2)),'#c0b498');rect(461,250,2,26,'#aa9c82');}
    rect(576,292,77,13,'#aa8962');rect(580,305,69,28,'#6c5240');rect(582,333,6,7,'#40372e');rect(638,333,6,7,'#40372e');
    if(has('brew')){rect(592,272,21,20,'#a6aaa0');rect(595,267,14,5,'#454c46');rect(610,277,8,4,'#b5b7a8');rect(628,283,10,9,'#e6d8b9');rect(576,278,10,14,'#a48863');if(save.served){rect(642,278,9,14,'#788b77');rect(643,281,7,3,'#d5c6a5');}if(working&&(working.task.id==='serve'||working.task.id==='drink'))for(i=0;i<4;i++)rect(600+Math.sin(time*3+i)*3,267-((time*14+i*7)%30),2,4,'#d8d8bc');}
    else{rect(591,274,42,18,'#977b54');rect(610,274,4,18,'#c3ab78');}
    rect(536,135,2,25,'#403c30');rect(525,156,24,8,has('walls')?'#d5ba7c':'#716747');
    if(has('walls')){var glow=g.createRadialGradient(537,175,4,537,210,150);glow.addColorStop(0,'#f4c87825');glow.addColorStop(1,'#f4c87800');g.fillStyle=glow;g.fillRect(380,135,330,300);}
    if(cleanFloor<1)for(i=0;i<85;i++){
      x=240+(i*67)%472;y=336+(i*43)%163;
      var nearest=0,dist=Infinity;
      L.workSites.sweep.forEach(function(site,index){var d=Math.hypot(x-site.x,y-site.y);if(d<dist){dist=d;nearest=index;}});
      if(cleanFloor*4-nearest<=dist/180)rect(x,y,3+i%8,2,'#a6947288');
    }
    if(cleanDebris<1){for(i=Math.floor(cleanDebris*16);i<16;i++)rect(325+(i*23)%79,360+(i*17)%33,9+i%12,4+i%6,i%2?'#a79c82':'#574c3d');if(cleanDebris<0.65){rect(350,345,9,36,'#66513a');rect(329,361,42,6,'#927653');}}
    FLEUR_WORK.traces(g,save.done,activeWork,time,L);
    additions();
    // Furniture and people share baseline ordering, as in the original café.
    var draws=[{y:player.y,draw:function(){FLEUR_WORK.draw(g,player,activeWork,time);}}];
    if(has('open'))draws.push({y:patron.y,draw:function(){SCENE.drawPerson(g,patron);}});
    if(has('table'))draws.push({y:418,draw:function(){rect(450,410,67,8,'#493b303f');rect(458,391,5,25,'#483b30');rect(503,391,5,25,'#483b30');rect(450,382,67,10,'#aa8962');rect(450,392,67,5,'#70513b');rect(464,384,15,2,'#977b54');if(save.stage==='served'){if(!patron.holding)cup(460,374);if(resting&&!player.holding)cup(500,374);}if(save.stories.cutting&&save.plant==='table')plant(L.plantTable);}});
    if(has('table'))[L.seat,L.ownerSeat].forEach(function(s){draws.push({y:s.y-1,draw:function(){rect(s.x-13,s.y-3,26,6,'#967151');rect(s.x-10,s.y+3,4,12,'#554333');rect(s.x+7,s.y+3,4,12,'#554333');}});});
    draws.sort(function(a,b){return a.y-b.y;}).forEach(function(d){d.draw();});
    if(working&&!working.task.phases){var wx=player.x+16+Math.sin(time*15)*3,id=working.task.id;
      if(id==='sweep'||id==='debris'){rect(wx,player.y-35,3,31,'#c7ae7b');rect(wx-5,player.y-6,14,6,'#b49a65');}
      else if(id==='serve'||id==='drink'||id==='tomorrow'){rect(wx-4,player.y-36,9,6,'#e6d8b9');rect(wx+2,player.y-30,2,8,'#afbbb3');}
      else {rect(wx,player.y-38,3,14,'#c7ae7b');rect(wx-4,player.y-40,11,5,'#a6aaa0');}
      rect(player.x-20,player.y-80,40,4,'#393c33');rect(player.x-20,player.y-80,Math.round(40*working.elapsed/working.task.duration),4,'#d7c08b');}
    var n=next();if(n&&!talk&&!working&&!modal&&!resting){rect(n.x-5,n.y-77+Math.round(Math.sin(time*2)*2),10,10,'#dbc38b');text('·',n.x,n.y-68,'#4a493b',14);}
    if(FLEUR.invitation(save)&&arrived&&!talk&&!modal){text('···',patron.x,patron.y-70,'#e6d8b9',17);}
  }
  function render(){
    g.save();g.translate(480,cameraScreenY);g.scale(zoom,zoom);g.translate(-cameraX,-cameraY);room();g.restore();
    var n=next(), busy=!!talk||!!working||!!modal;
    uiText('chapter',save.served?'Coffee & company · morning '+save.day:'Lunafreya’s café · chapter one');
    uiText('objective',save.served?(save.stage==='served'?'A little more like home':name()+' · '+(save.stage==='arriving'?'a visitor at the door':visit().drink)):(has('open')?'Your very first guest':'An abandoned room. A small beginning.'));
    var workPhase=FLEUR_WORK.phase(working);
    uiText('action',workPhase?(working.paused?'Continue the work':'Rest your hands'):working?working.task.verb+'…':n?n.label:'Take a moment');
    el('action').disabled=(busy&&!workPhase)||!!(n&&['talk','chat','order','deliver','rest'].indexOf(n.id)>=0&&!arrived);
    uiText('status',saveFailed?'Your browser cannot save this visit. You can still keep playing.':workPhase?(working.paused?'A breath. The room is not going anywhere.':working.moving?'Moving carefully to the next patch.':workPhase.data.label):notice||'Lunafreya · “I think there is a café in here somewhere.”');
    uiText('hint',workPhase?'Slow, steady work · rest whenever you need': 'WASD / arrows to move · click to walk · E to interact');
    el('journal').hidden=!save.served;el('journal').disabled=busy;
    el('tomorrow').hidden=!save.served||save.stage!=='served';el('tomorrow').disabled=busy;
    var invitation=FLEUR.invitation(save);el('invitation').hidden=!invitation;el('invitation').disabled=busy||!arrived;
    if(invitation)uiText('invitation',name()+' · '+FLEUR.stories[invitation].title);
  }
  window.addEventListener('keydown',function(e){
    if(talk){if(e.key==='Tab'){var buttons=Array.prototype.filter.call(el('dialogue').querySelectorAll('button'),function(b){return !b.hidden;});var current=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(current+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}return;}
    if(modal||/^(INPUT|TEXTAREA)$/.test(e.target.tagName)||(e.target.tagName==='BUTTON'&&(e.key===' '||e.key==='Enter')))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key)>=0)e.preventDefault();keys[e.key.length===1?e.key.toLowerCase():e.key]=true;if((e.key.toLowerCase()==='e'||e.key===' ')&&!e.repeat)act();
  });
  window.addEventListener('keyup',function(e){keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});window.addEventListener('blur',function(){keys={};target=null;});
  canvas.addEventListener('pointerdown',function(e){if(talk||working||modal)return;var r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*600/r.height,n=next();x=(x-480)/zoom+cameraX;y=(y-cameraScreenY)/zoom+cameraY;var invitation=FLEUR.invitation(save);if(invitation&&Math.hypot(x-patron.x,y-(patron.y-35))<32){el('invitation').click();return;}if(n&&Math.hypot(x-n.x,y-(n.y-35))<40){act();return;}x=Math.max(L.bounds.left,Math.min(L.bounds.right,x));y=Math.max(L.bounds.top,Math.min(L.bounds.bottom,y));if(!blocked(x,y)){resting=false;target={x:x,y:y};}});
  // Audio remains behind a real user gesture; do not change saved preferences on boot.
  document.getElementById('sound').textContent='Enable sound';
  var soundStarted=false;document.getElementById('sound').onclick=function(){if(!soundStarted){SND.init();soundStarted=true;SND.settings.muted=false;SND.settings.fire=false;}else SND.settings.muted=!SND.settings.muted;SND.applyVolume();this.textContent=SND.settings.muted?'Sound off':'Sound on';};
  var last=performance.now();function frame(now){var dt=Math.min((now-last)/1000,0.25);last=now;update(dt);render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
  if(new URLSearchParams(location.search).has('dev'))window.__game={state:save,player:player,patron:patron,layout:L,update:update,act:act,
    inspect:function(){return {working:working&&working.task.id,workElapsed:(working||heldWork)?(working||heldWork).elapsed:null,workPhase:FLEUR_WORK.phase(working||heldWork),workPaused:!!(working&&working.paused),reflection:heldWork&&heldWork.task.id,talking:!!talk,modal:modal,arrived:arrived,resting:resting,invitation:FLEUR.invitation(save)};},
    audit:function(){var errors=[];if(blocked(player.x,player.y))errors.push('Player inside furniture');if(has('open')&&blocked(patron.x,patron.y))errors.push('Guest inside furniture');if(save.served&&!has('serve'))errors.push('Coffee served before brewing');if(has('serve')&&!save.introduced)errors.push('Service before introduction');if(new Set(save.done).size!==save.done.length)errors.push('Duplicate restoration');if(save.coins<0||save.coins%1)errors.push('Invalid cafe funds');if(save.day>1&&!save.served)errors.push('Neighborhood before first cup');if(talk&&working)errors.push('Work during conversation');return errors;},
    shot:function(){render();return canvas.toDataURL();}};
}());
