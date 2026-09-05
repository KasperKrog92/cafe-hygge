/* Authored neighborhood visits. Pure data; no clock or save writes. */
(function () {
  'use strict';
  window.FLEUR = {
    tasks: [
      {id:'debris',x:360,y:390,label:'Clear the fallen plaster',verb:'Clearing',duration:54,line:'The little scrap can dry on the sill. The rest can go.',
        phases:[{seconds:12,kind:'kneel',label:'Loosening the plaster, one piece at a time',site:0},{seconds:18,kind:'sort',label:'Brushing the dust from something folded',site:0},{seconds:14,kind:'gather',label:'Lifting the broken pieces into the sack',site:1},{seconds:10,kind:'rest',label:'Straightening slowly. Letting her hands rest.',site:1}],
        moment:{at:30,title:'Under the plaster',resume:'Fold it carefully, then carry on',lines:[['Lunafreya','A shopping list. Coffee, soap, something crossed out.'],['Lunafreya','On the back, someone has drawn the window. They gave it curtains.'],['Lunafreya','I have a drawer full of little plans like this. I used to close it before anyone came round.'],['Lunafreya','This one can stay out. Just until it dries.']]},
        note:'Under the plaster: a shopping list with a window drawn on the back. I left it on the sill. I know what it is to keep a little plan folded up.'},
      {id:'sweep',x:300,y:370,label:'Sweep the old floorboards',verb:'Sweeping',duration:64,line:'A worn place in the boards. I will put a chair near it.',
        phases:[{seconds:16,kind:'sweep',label:'Drawing the dust out of the seams',site:0},{seconds:16,kind:'sweep',label:'Small strokes. Gathering, never scattering.',site:1},{seconds:16,kind:'sweep',label:'Working along the grain of the boards',site:2},{seconds:16,kind:'pan',label:'The last thin line of dust into the pan',site:3}],
        moment:{at:32,title:'Where someone stood',resume:'Take the next slow pass',lines:[['Lunafreya','The wood is lighter here. Someone wore it smooth.'],['Lunafreya','I keep going over the clean bit. I do that when I cannot decide what comes next.'],['Lunafreya','I thought getting the key would make me feel certain.'],['Lunafreya','Well. I can do the next board without being certain.']]},
        note:'A pale hollow in the floor where someone used to stand. I swept the clean part twice. Then I tried the next board.'},
      {id:'window',x:337,y:310,label:'Mend and wash the window',verb:'Washing',duration:66,line:'The moon has moved a little. I had not noticed how long I stayed.',
        phases:[{seconds:14,kind:'unfasten',label:'Easing out the old brace and bedding the loose pane',site:0},{seconds:18,kind:'wipe',label:'Soaking the grime. Wiping a little circle clear.',site:0},{seconds:16,kind:'rinse',label:'Rinsing the cloth and wringing it slowly',site:0},{seconds:18,kind:'polish',label:'Following the edges with the clean side of the cloth',site:1}],
        moment:{at:32,title:'A little moon in the glass',resume:'Stay a breath, then finish the glass',lines:[['Lunafreya','Oh. There you are.'],['Lunafreya','I used to sit at my kitchen window after everyone else’s lights went out. No one needed an answer then.'],['Lunafreya','I nearly left the key in the door tonight. Kept thinking I should come back when I knew how to do all of this.'],['Lunafreya','But I wanted to see what the light would look like in here.'],['Lunafreya','…I think I will keep this bit of sill for myself.']]},
        note:'Moonlight through a circle in the grime. I nearly went home before starting. I stayed to see the light.'},
      {id:'walls',x:466,y:310,label:'Patch and wash the walls',verb:'Restoring',duration:66,line:'The old color can show at the edge. I like knowing it is there.',
        phases:[{seconds:16,kind:'scrape',label:'Testing the loose edges before lifting them',site:0},{seconds:20,kind:'patch',label:'Pressing plaster into the cracks, then smoothing it',site:0},{seconds:18,kind:'wash',label:'Washing around the old paint, slowly downward',site:1},{seconds:12,kind:'rest',label:'Putting down the cloth. Looking at what remains.',site:1}]},
      {id:'table',x:536,y:427,label:'Set out the second-hand table',verb:'Placing',duration:2,line:'Two chairs. That counts as an invitation.'},
      {id:'brew',x:620,y:349,label:'Unpack the kettle and coffee',verb:'Unpacking',duration:2,line:'A borrowed kettle, ground coffee, two cups. Enough to begin.'},
      {id:'open',x:686,y:335,label:'Turn the sign to open',verb:'Opening',duration:1,line:'Fleur de Lune. Let us see who finds us.'},
      {id:'serve',x:620,y:349,label:'Brew the first coffee',verb:'Brewing',duration:4,line:'Slowly poured. A little courage in a cup.'}
    ],
    people: {
      holger: {name:'Holger',colors:{skin:'#d99c6b',hair:'#d9d2c0',top:'#4a7a5a',pants:'#4a3222',scarf:'#a94f3f',hairStyle:1,beard:true}},
      astrid: {name:'Astrid',colors:{skin:'#e4b68c',hair:'#654733',top:'#a94f3f',pants:'#514355',hairStyle:2}}
    },
    upgrades: [
      {id:'lamp',name:'A brass reading lamp',cost:6,x:422,y:338,duration:2.5,verb:'Polishing and fitting',description:'A pool of warm light beside the window.',line:'I wanted the brass one. That is reason enough.'},
      {id:'shelf',name:'A shelf for shared books',cost:12,x:265,y:332,duration:3,verb:'Fitting the shelf',description:'An empty shelf today. Room for someone else tomorrow.',line:'Level. More or less. Now it needs a book.'},
      {id:'rug',name:'A woven terracotta rug',cost:12,x:556,y:460,duration:2.5,verb:'Unrolling',description:'A softer place for the old table and its mismatched chairs.',line:'The chairs sound different on it. The whole room does.'}
    ],
    introduction: [['Holger','I saw the light. Are you open?'],['Lunafreya','Just about. I have coffee, and a table with a very slight lean.'],['Holger','A little lean is all right. I am Holger.'],['Lunafreya','Lunafreya. Welcome to Fleur de Lune.']],
    firstCup: [['Holger','You kept the old table. My sister used to sit by this window.'],['Lunafreya','One leg is shorter than the others. I thought it deserved another chance.'],['Holger','Most good places do. This is a good cup, Lunafreya.'],['Lunafreya','Then tomorrow, there will be another.']],
    stories: {
      returning: {
        guest:'holger',title:'The same chair',note:'Holger came back. He suggested a shelf; I am still allowed to choose what goes on it.',
        lines:[['Holger','I nearly brought a book. Then I thought it might be rude on your second morning.'],['Lunafreya','Please bring one. I cannot invent conversation for every cup.'],['Holger','A shelf might be nice. A few books people could leave here.'],['Lunafreya','A small one. I still want room for things I have not thought of yet.'],['Holger','Good. Leave a little shelf empty, too.']]
      },
      cutting: {
        guest:'astrid',title:'Something for the light',note:'Astrid brought a pelargonium cutting. She asked before finding it a home.',
        lines:[['Astrid','I have something in my bag. Before you say yes: it is a plant.'],['Lunafreya','That sounds less alarming than most things introduced like that.'],['Astrid','A pelargonium cutting. Mine got ambitious. Would you like it?'],['Lunafreya','Yes. But I am choosing where it goes.'],['Astrid','I was hoping you would. I have already rearranged my own windows twice.']],
        choices:[{id:'sill',label:'The window. Let it catch the light.',reply:[['Lunafreya','There. I can see it from the kettle.'],['Astrid','And from outside. Now I will know which window is yours.']]},{id:'table',label:'The table. It can keep us company.',reply:[['Lunafreya','In the middle. The table needed something besides its lean.'],['Astrid','A small plant with a very important job.']]}]
      },
      book: {
        guest:'holger',title:'A book with room inside',note:'The first shared book is a collection of walks. Holger left a train ticket between two pages.',
        lines:[['Holger','I brought a book for the shelf. Walks along the coast.'],['Lunafreya','You have marked quite a few pages.'],['Holger','Places I meant to go. I have been to some of them now.'],['Lunafreya','May I borrow it myself? I do occasionally leave this room.'],['Holger','I should hope so. Put your own ticket in when you do.']]
      },
      ownCup: {
        guest:'astrid',title:'A cup for the owner',note:'Astrid noticed I had not sat down. We disagreed about a vase and finished our tea.',
        lines:[['Astrid','Have you had a cup yourself?'],['Lunafreya','I have been holding the idea of one since morning.'],['Astrid','That sounds difficult to drink. Sit down.'],['Lunafreya','Only if you stop suggesting that enormous blue vase.'],['Astrid','It is a very good vase.'],['Lunafreya','It is the size of my kettle.'],['Astrid','Fine. Tea first. Then I will draw it smaller.']]
      }
    },
    visit: function (day, state) {
      if (day === 2) return {guest:'holger',drink:'coffee',lines:[['Holger','You said there would be another cup.'],['Lunafreya','And you believed me. Coffee?'],['Holger','Yes, please. The same chair, if nobody has claimed it.']]};
      if (day === 3) return {guest:'astrid',drink:'tea',lines:[['Astrid','Is this Fleur de Lune? I am Astrid. I live two doors down.'],['Lunafreya','Lunafreya. You found us. What can I make you?'],['Astrid','Tea, please. I brought my own opinion about the weather.']]};
      if (day % 2 === 0) return {guest:'holger',drink:day % 4 === 0?'tea':'coffee',lines:day % 4 === 0?[['Holger','Tea today, please.'],['Lunafreya','I was reaching for the coffee.'],['Holger','I do like more than one thing.']]:state&&state.stories.book?[['Holger','Coffee, please. I found a walk in that book.'],['Lunafreya','An actual walk, or another bookmark?'],['Holger','I will report back.']]:[['Holger','Coffee, please. Is it all right if I read for a while?'],['Lunafreya','Only if you tell me when it gets good.'],['Holger','That may be some time. I am a demanding reader.']]};
      return {guest:'astrid',drink:'tea',lines:[['Astrid','Tea, please. I have spent the morning moving pots.'],['Lunafreya','Into better places?'],['Astrid','Different places. I will know about better tomorrow.']]};
    },
    invitation: function (s) {
      if (s.day < 2 || s.stage !== 'served' || s.lastStoryDay === s.day) return null;
      var guest = this.visit(s.day).guest;
      if (guest === 'holger' && !s.stories.returning) return 'returning';
      if (guest === 'astrid' && !s.stories.cutting) return 'cutting';
      if (guest === 'holger' && s.upgrades.shelf && !s.stories.book) return 'book';
      if (guest === 'astrid' && s.stories.cutting && !s.stories.ownCup) return 'ownCup';
      return null;
    }
  };
}());
