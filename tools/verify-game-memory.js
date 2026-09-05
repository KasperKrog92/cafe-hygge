/* Node-only save compatibility checks. No dependencies or browser profile. */
'use strict';
var vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
var context={window:{},localStorage:{getItem:function(){return null;},setItem:function(){}}};
context.window=context;
vm.createContext(context);
['js/game-content.js','js/game-memory.js'].forEach(function(path){vm.runInContext(fs.readFileSync(path,'utf8'),context);});
var memory=context.FLEUR_MEMORY, tasks=context.FLEUR.tasks.map(function(t){return t.id;});
function plain(s){return JSON.parse(JSON.stringify(s));}
for(var i=0;i<=tasks.length;i++){
  var old={version:1,done:tasks.slice(0,i),introduced:i>=7,served:i===8};
  var migrated=plain(memory.normalize(old));
  assert.deepEqual(migrated.done,plain(old.done));
  assert.equal(migrated.version,2);assert.equal(migrated.served,old.served);
  assert.equal(migrated.coins,i===8?6:0);
  assert.deepEqual(plain(memory.normalize(migrated)),migrated,'Migration is idempotent');
}
assert.equal(memory.normalize({version:99,done:tasks}).done.length,0);
assert.equal(memory.normalize({version:1,done:['sweep','window']}).done.length,0);
assert.equal(memory.normalize({version:1,done:tasks,introduced:false,served:true}).served,false);
assert.equal(memory.normalize({version:1,done:tasks,introduced:false,served:true}).done.length,7);
var saved=plain(memory.normalize({version:1,done:tasks,introduced:true,served:true}));
saved.day=4;saved.stage='brewed';saved.coins=0;saved.cups=3;saved.upgrades={shelf:true};saved.stories={returning:true,cutting:true};saved.plant='table';
assert.deepEqual(plain(memory.normalize(saved)),saved,'A carried cup and spent funds survive reload');
saved.coins=-8;saved.cups='42';saved.day=NaN;saved.stories.book=true;saved.upgrades={};
var safe=memory.normalize(saved);
assert.equal(safe.coins,6);assert.equal(safe.cups,1);assert.equal(safe.day,1);assert.equal(safe.stories.book,undefined);
context.localStorage.getItem=function(){throw new Error('Storage unavailable');};
assert.equal(memory.load().done.length,0);
context.localStorage.getItem=function(){return '{broken';};
assert.equal(memory.load().done.length,0);
context.localStorage.setItem=function(){throw new Error('Quota exceeded');};
assert.equal(memory.save(saved),false);
// Invitations survive skipped mornings and keep their prerequisites.
saved=plain(memory.normalize({version:1,done:tasks,introduced:true,served:true}));
saved.day=20;assert.equal(context.FLEUR.invitation(saved),'returning');
saved.stories.returning=true;assert.equal(context.FLEUR.invitation(saved),null);
saved.upgrades.shelf=true;assert.equal(context.FLEUR.invitation(saved),'book');
saved.day=21;assert.equal(context.FLEUR.invitation(saved),'cutting');
saved.stories.cutting=true;assert.equal(context.FLEUR.invitation(saved),'ownCup');
saved.lastStoryDay=saved.day;assert.equal(context.FLEUR.invitation(saved),null);
assert.equal(memory.normalize(saved).lastStoryDay,saved.day,'Story pacing survives reload');
console.log('Save checks passed: all v1 milestones, v2 in-progress service, malformed data, storage failure, persistent invitations.');
