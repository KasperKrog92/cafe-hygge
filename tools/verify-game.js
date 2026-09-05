/* Run with agent-browser eval in a disposable, fresh /?dev session. */
(function () {
  'use strict';
  var game = window.__game;
  function check(ok, why) { if (!ok) throw new Error(why); }
  function advance(seconds) { for (var i = 0; i < seconds * 10; i++) game.update(0.1); }
  function finishDialogue() { for (var i = 0; i < 12 && game.inspect().talking; i++) document.getElementById('continue').click(); }
  check(game && game.state.done.length === 0, 'Use a fresh disposable game session');
  var idleSave = localStorage.getItem('cafe-hygge-save');
  var reflections=0;
  for (var i = 0; i < 7; i++) {
    document.getElementById('action').click();
    var t=game.layout.tasks[i];
    if(t.phases){
      check(t.duration>=50,'Opening work lost its deliberate duration');
      advance(10);game.shot();
      check(game.inspect().working===t.id&&!game.state.done.includes(t.id),'Cleanup completed immediately');
      document.getElementById('action').click();
      var before=game.inspect().workElapsed,position=[game.player.x,game.player.y];
      advance(60);
      check(game.inspect().workPaused&&game.inspect().workElapsed===before,'Rest advanced work');
      check(JSON.stringify(position)===JSON.stringify([game.player.x,game.player.y]),'Rest moved player');
      document.getElementById('action').click();
      for(var tick=0;tick<1800&&game.state.done.length===i;tick++){
        game.update(0.1);
        if(game.inspect().talking){
          reflections++;
          check(game.inspect().reflection===t.id,'Wrong reflection');
          check(game.inspect().workElapsed===t.moment.at,'Reflection missed its work boundary');
          var frozen=JSON.stringify(game.state),elapsed=game.inspect().workElapsed,px=game.player.x,py=game.player.y;
          advance(300);
          check(JSON.stringify(game.state)===frozen&&game.inspect().workElapsed===elapsed,'Reflection advanced progress');
          check(game.player.x===px&&game.player.y===py,'Reflection moved Lunafreya');
          check(!game.inspect().working&&game.audit().length===0,'Work active during reflection');
          finishDialogue();
          check(game.inspect().working===t.id,'Reflection did not resume interrupted work');
        }
        check(!game.audit().length,'Opening step audit');
      }
    }else advance(25);
    check(game.state.done.length === i + 1, 'Task did not finish: ' + game.layout.tasks[i].id);
    check(game.audit().length === 0, 'Audit after restoration');
    game.shot(); // Refresh the actual UI between accelerated actions.
  }
  document.getElementById('action').click(); advance(20);
  check(!document.getElementById('dialogue').hidden, 'First introduction did not open');
  var waiting = JSON.stringify(game.state), x = game.player.x, y = game.player.y;
  advance(300);
  check(JSON.stringify(game.state) === waiting, 'Conversation advanced progress unattended');
  check(game.player.x === x && game.player.y === y, 'Conversation moved the player');
  finishDialogue(); game.shot();
  document.getElementById('action').click(); advance(20); game.shot();
  check(game.state.done.indexOf('serve') >= 0, 'First coffee did not brew');
  document.getElementById('action').click(); advance(20);
  check(!document.getElementById('dialogue').hidden, 'Delivery conversation missing');
  finishDialogue();
  check(game.state.served, 'First service not complete');
  check(JSON.parse(localStorage.getItem('fleur-de-lune-save')).served, 'Completion not saved');
  check(localStorage.getItem('cafe-hygge-save') === idleSave, 'Changed idle narrative save');
  check(game.audit().length === 0, 'Final audit');
  check(reflections===3,'Expected three opening reflections');
  return { restorationTasks: 8, reflections:reflections, conversations: 2, waitingSeconds: 1440, audit: game.audit(), saved: true };
}());
