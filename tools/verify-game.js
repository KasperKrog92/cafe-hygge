/* Run with agent-browser eval in a disposable, fresh /?dev session. */
(function () {
  'use strict';
  var game = window.__game;
  function check(ok, why) { if (!ok) throw new Error(why); }
  function advance(seconds) { for (var i = 0; i < seconds * 10; i++) game.update(0.1); }
  function finishDialogue() { for (var i = 0; i < 4; i++) document.getElementById('continue').click(); }
  check(game && game.state.done.length === 0, 'Use a fresh disposable game session');
  var idleSave = localStorage.getItem('cafe-hygge-save');
  for (var i = 0; i < 7; i++) {
    document.getElementById('action').click();
    advance(25);
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
  return { restorationTasks: 8, conversations: 2, waitingSeconds: 300, audit: game.audit(), saved: true };
}());
