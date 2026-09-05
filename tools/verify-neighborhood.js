/* Run after verify-game.js in a disposable /?dev profile. Exercises real actions. */
(function () {
  'use strict';
  var game=window.__game, s=game.state, checks=0;
  function check(ok,why){if(!ok)throw new Error(why);checks++;}
  function advance(seconds){for(var i=0;i<seconds*10;i++){game.update(0.1);check(!game.audit().length,'Frame audit: '+game.audit().join(', '));}game.shot();}
  function click(id){game.shot();document.getElementById(id).click();}
  function dialogue(choice){
    for(var i=0;i<16&&!document.getElementById('dialogue').hidden;i++){
      var options=document.getElementById('choices');
      if(options)options.children[choice||0].click();else document.getElementById('continue').click();
    }
    check(document.getElementById('dialogue').hidden,'Dialogue did not finish');game.shot();
  }
  function paused(label){var before=JSON.stringify(s),position=[game.player.x,game.player.y,game.patron.x,game.patron.y];advance(300);check(JSON.stringify(s)===before,label+' progressed save');check(JSON.stringify(position)===JSON.stringify([game.player.x,game.player.y,game.patron.x,game.patron.y]),label+' moved people');}
  function morning(){click('tomorrow');advance(20);check(s.stage==='arriving','Morning did not begin');click('action');advance(20);check(game.inspect().talking,'Welcome missing');dialogue();check(s.stage==='ordered','No order after welcome');}
  function serve(wrong){
    click('action');advance(20);check(game.inspect().modal==='drinks','No recipe selection');
    paused('Recipe choice');
    if(wrong){var before=s.coins;document.querySelector('[data-drink="coffee"]').click();advance(10);check(s.stage==='ordered'&&s.coins===before,'Wrong drink punished player or fulfilled order');click('action');advance(10);}
    document.querySelector('[data-drink="'+FLEUR.visit(s.day).drink+'"]').click();advance(10);
    check(s.stage==='brewed','Drink did not finish');var coins=s.coins,cups=s.cups;
    click('action');advance(20);check(s.stage==='served'&&s.coins===coins+6&&s.cups===cups+1,'Delivery payment incorrect');
    advance(20);check(s.coins===coins+6,'Duplicate payment');
  }
  function story(id,choice){check(game.inspect().invitation===id,'Expected invitation '+id);click('invitation');advance(20);paused(id);dialogue(choice);check(s.stories[id],'Story not remembered: '+id);check(!game.inspect().invitation,'A second story crowded the same morning');}
  function buy(id){click('journal');paused('Notebook');var index=FLEUR.upgrades.map(function(u){return u.id;}).indexOf(id);document.querySelectorAll('.improvement')[index].click();advance(20);check(s.upgrades[id],'Improvement did not install: '+id);}
  check(s.served&&s.day===1&&s.coins===6,'Start immediately after a fresh opening');
  var idle=localStorage.getItem('cafe-hygge-save');
  buy('lamp');check(s.coins===0,'Lamp cost');
  morning();paused('Welcome completed without service');serve();
  var before=JSON.stringify(s);advance(600);check(JSON.stringify(s)===before&&game.inspect().invitation==='returning','Invitation expired');
  story('returning');
  morning();serve(true);story('cutting',1);check(s.plant==='table','Plant choice ignored');
  buy('shelf');check(s.coins===0,'Shelf cost');
  morning();serve();story('book');
  morning();serve();story('ownCup');buy('rug');
  click('action');advance(20);check(game.inspect().resting,'Owner cannot sit');paused('Rest');
  click('action');advance(1);check(!game.inspect().resting,'Owner cannot stand');
  for(var day=6;day<=8;day++){morning();serve();check(!game.inspect().invitation,'Completed story repeated');}
  check(s.cups===8&&s.coins===18,'Repeat service ledger drift');
  check(localStorage.getItem('cafe-hygge-save')===idle,'Changed idle save');
  check(JSON.stringify(JSON.parse(localStorage.getItem('fleur-de-lune-save')))===JSON.stringify(s),'Live state not persisted');
  return {morning:s.day,cups:s.cups,coins:s.coins,stories:Object.keys(s.stories),improvements:Object.keys(s.upgrades),plant:s.plant,audit:game.audit(),frameAndFlowChecks:checks};
}());
