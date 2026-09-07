/* Café Hygge — hand-painted sign and a quiet, character-anchored voice. */
(function () {
  'use strict';
  const S=SCENE,L=S.L,px=S._.px;
  const letters={N:['101','111','111','111','101'],E:['111','100','110','100','111'],
    W:['10101','10101','10101','10101','01010'],C:['111','100','100','100','111'],
    A:['010','101','111','101','101'],F:['111','100','110','100','100']};
  S.drawNewSign=function(g,x,y,scale) {
    g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale||1,scale||1);
    px(g,-18,-6,4,9,'#705037');px(g,14,-6,4,9,'#705037');
    px(g,-22,-35,44,30,'#705037');px(g,-21,-34,43,13,'#bc9566');
    px(g,-22,-20,43,13,'#c9a477');px(g,-20,-33,40,1,'#dfbd89');
    px(g,-17,-22,32,1,'#a77e51');px(g,14,-32,5,1,'#9c784f');
    [-18,17].forEach(x=>{px(g,x,-31,1,2,'#66523d');px(g,x,-11,1,2,'#66523d');});
    ['NEW','CAFE'].forEach(function(word,row) {
      let x=row?-16:-13;
      word.split('').forEach(function(ch,index) {
        letters[ch].forEach((line,y)=>line.split('').forEach((v,k)=>{
          if(v==='1')px(g,x+k*2,-30+row*13+y*2+(index===1?1:0),2,2,'#f5e8cb');
        }));x+=(letters[ch][0].length+1)*2;
      });
    });
    g.restore();
  };
  S.drawIntroPorch=function(g,w) {
    const i=w.memory.life.intro;if(!i)return;
    const d=L.door;
    g.save();g.beginPath();g.rect(d.x,d.y,d.w,d.h);g.clip();
    px(g,d.x,d.y,d.w,d.h,w.pal.skyBot);
    px(g,d.x,d.y+65,d.w,d.h-65,'#969080');
    px(g,d.x,d.y+88,d.w,2,'#777666');
    if(i.sign==='outside')S.drawNewSign(g,L.intro.porchSign.x,L.intro.porchSign.y,.72);
    if(w.barista.introOutside) {
      const t=i.time, p=Object.assign({},w.barista,{x:L.intro.porchPerson.x,
        y:L.intro.porchPerson.y,pose:t<1?'walk':'stand',heading:'',facing:1,introOutside:false,
        holding:null,colors:w.barista.colors});
      S.drawPerson(g,p);
      if(i.sign==='carried') {
        const q=Math.max(0,Math.min(1,(t-1)/3));
        S.drawNewSign(g,p.x+5,p.y-15+Math.round(q*15),.72);
        px(g,p.x-9,p.y-29,16,4,p.colors.skin);
      }
    }
    g.restore();
  };
  function dialogueData(w) {
    if(w.moment && w.moment.phase==='talk') {
      const line=SIM.momentLine(w);
      return {text:line.text,visible:w.moment.visible,name:line.speaker,choices:line.choices,
        speaker:line.speaker==='Lunafreya'?w.barista:w.moment.owner||w.barista,moment:true};
    }
    if(!w.dialogue || w.memory.life.intro.skipped || w.shop.phase!=='settling')return null;
    return {text:w.dialogue.text,visible:w.dialogue.visible,speaker:w.barista,
      name:w.memory.life.intro.line===0?'Lunafreya':null};
  }
  function wrap(g,text) {
    const rows=[],words=text.split(' ');let row='',offset=0;
    words.forEach(function(word) {
      if(row && g.measureText(row+' '+word).width>242) {
        rows.push({text:row,start:offset});offset+=row.length+1;row=word;
      } else row+=(row?' ':'')+word;
    });
    if(row)rows.push({text:row,start:offset});return rows;
  }
  S.dialogueLayout=function(g,w) {
    const d=dialogueData(w);if(!d)return null;
    const room=S.presentation(w),b=d.speaker;
    g.font='13px Georgia, serif';
    const rows=wrap(g,d.text),choices=(d.choices||[]).map(c=>({rows:wrap(g,c.text)}));
    const all=rows.concat.apply(rows,choices.map(c=>c.rows));
    const width=Math.ceil(Math.max.apply(null,all.map(r=>g.measureText(r.text).width)))+24;
    let height=rows.length*17+18+(d.name?15:0);
    choices.forEach(c=>{c.top=height;c.height=c.rows.length*17+12;height+=c.height;});
    const x=Math.round(Math.max(16,Math.min(room.w-16-width,b.x-width/2)));
    const y=Math.round(Math.max(44,b.y-88-height));
    return {x:x,y:y,w:width,h:height,rows:rows,name:d.name,choices:choices,data:d};
  };
  S.drawIntroDialogue=function(g,w) {
    const d=dialogueData(w);if(!d)return;
    g.save();const r=S.dialogueLayout(g,w);
    px(g,r.x+2,r.y+3,r.w,r.h,'rgba(32,22,16,.2)');
    px(g,r.x-1,r.y-1,r.w+2,r.h+2,'#a68b65');px(g,r.x,r.y,r.w,r.h,'#fdf8ec');
    const tail=Math.round(Math.max(r.x+9,Math.min(r.x+r.w-12,d.speaker.x)));
    px(g,tail,r.y+r.h,7,3,'#a68b65');px(g,tail+2,r.y+r.h+3,4,3,'#a68b65');
    px(g,tail+1,r.y+r.h-1,5,3,'#fdf8ec');px(g,tail+3,r.y+r.h+2,2,3,'#fdf8ec');
    g.textBaseline='top';g.fillStyle='#514331';
    if(r.name){g.font='10px Georgia, serif';g.fillText(r.name,r.x+12,r.y+8);}
    g.font='13px Georgia, serif';
    r.rows.forEach((line,n)=>g.fillText(line.text.slice(0,Math.max(0,d.visible-line.start)),
      r.x+12,r.y+9+(r.name?15:0)+n*17));
    r.choices.forEach(function(c,i) {
      px(g,r.x+8,r.y+c.top,r.w-16,1,'#d9c9aa');
      if(w.moment.hover===i)px(g,r.x+4,r.y+c.top+1,r.w-8,c.height-2,'#eee2ca');
      g.fillStyle=d.visible<d.text.length?'#a68b65':'#514331';
      c.rows.forEach((line,n)=>g.fillText(line.text,r.x+12,r.y+c.top+6+n*17));
    });
    g.restore();
  };
})();
