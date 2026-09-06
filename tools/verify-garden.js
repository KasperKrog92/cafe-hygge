/* Run after verify-neighborhood.js, in its disposable /?dev browser. */
(function () {
  'use strict';
  var game=__game,s=game.state,checks=0;
  function check(ok,why){if(!ok)throw new Error(why);checks++;}
  function advance(seconds){for(var i=0;i<seconds*10;i++){game.update(0.1);check(!game.audit().length,'Walker/state audit');}game.shot();}
  function click(id){game.shot();document.getElementById(id).click();}
  function dialogue(){for(var i=0;i<20&&game.inspect().talking;i++)click('continue');check(!game.inspect().talking,'Dialogue finished');}
  function morning(){click('tomorrow');advance(15);click('action');advance(15);dialogue();click('action');advance(15);document.querySelector('[data-drink="'+FLEUR.visit(s.day).drink+'"]').click();advance(5);click('action');advance(15);check(s.stage==='served','Cup delivered');}
  check(s.day===8&&s.coins===18&&!s.gardenDay,'Expected completed neighborhood check');
  var idle=localStorage.getItem('cafe-hygge-save');
  click('journal');click('repot');advance(6);
  check(game.inspect().working==='repot','Repotting started');
  click('action');var elapsed=game.inspect().workElapsed;advance(300);
  check(game.inspect().workPaused&&game.inspect().workElapsed===elapsed,'Hand rest preserves work');
  check(!s.gardenDay&&s.coins===18,'Unfinished work spends nothing');
  click('action');advance(30);
  check(s.gardenDay===8&&s.coins===12,'Repotting commits once');
  var committed=JSON.stringify(s);advance(600);
  check(JSON.stringify(s)===committed,'Waiting neither grows nor charges the plant');
  game.act(FLEUR.garden);advance(30);check(JSON.stringify(s)===committed,'Repeated repotting rejected');
  click('journal');check(!document.getElementById('repot'),'Completed task disappears');click('close-notebook');
  morning();check(s.day===9&&!game.inspect().invitation,'Plant needs two player-started mornings');
  morning();check(s.day===10&&!game.inspect().invitation,'Holger does not speak Astrid story');
  morning();check(game.inspect().invitation==='growing','Astrid notices flowers');
  advance(600);check(game.inspect().invitation==='growing','Invitation waits');
  // Skip once: she offers it on her next visit without penalty.
  morning();morning();check(game.inspect().invitation==='growing','Skipped invitation returns');
  click('invitation');advance(15);check(game.inspect().talking,'Growing conversation begins');
  var position=JSON.stringify([game.player.x,game.player.y,game.patron.x,game.patron.y]);committed=JSON.stringify(s);advance(300);
  check(JSON.stringify(s)===committed&&position===JSON.stringify([game.player.x,game.player.y,game.patron.x,game.patron.y]),'Conversation suspends progress');
  dialogue();check(s.stories.growing&&!game.inspect().invitation,'Gift remembered once');
  check(s.plant==='table','Chosen plant location preserved');
  check(s.coins===42&&s.cups===13,'Service ledger survives gardening');
  check(localStorage.getItem('cafe-hygge-save')===idle,'Reference save untouched');
  check(JSON.stringify(FLEUR_MEMORY.load())===JSON.stringify(FLEUR_MEMORY.normalize(s)),'Saved garden round trip');
  return {checks:checks,day:s.day,coins:s.coins,gardenDay:s.gardenDay,stories:Object.keys(s.stories),audit:game.audit()};
}());
