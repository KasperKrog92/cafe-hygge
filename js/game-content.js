/* Authored neighborhood visits. Pure data; no clock or save writes. */
(function () {
  'use strict';
  window.FLEUR = {
    tasks: [
      {id:'debris',x:360,y:390,label:'Clear the fallen plaster',verb:'Clearing',duration:2.4,line:'A little less yesterday. A little more room.'},
      {id:'sweep',x:564,y:440,label:'Sweep the old floorboards',verb:'Sweeping',duration:3,line:'Good wood under all that dust. I knew it.'},
      {id:'window',x:355,y:325,label:'Repair the window',verb:'Repairing',duration:3,line:'There. The rain can stay on its own side.'},
      {id:'walls',x:531,y:321,label:'Patch and wash the walls',verb:'Restoring',duration:2.8,line:'Not perfect. Mine, though.'},
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
