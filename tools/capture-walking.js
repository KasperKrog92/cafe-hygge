/* Render two travelling profiles; evaluate on a disposable ?dev page. */
(function(){
 const frames=[],p=__dev.study({seats:[0]}).patrons[0];
 for(let i=0;i<24;i++){
  const c=document.createElement('canvas');c.width=320;c.height=185;
  const g=c.getContext('2d');g.fillStyle='#c9b28a';g.fillRect(0,0,320,185);
  g.fillStyle='#8a6142';
  for(let x=0;x<320;x+=24){g.fillRect(x,86,12,1);g.fillRect(x,176,12,1);}
  [1,-1].forEach(function(facing){
   SCENE.drawPerson(g,Object.assign({},p,{x:facing===1?60+i*2:260-i*2,
    y:facing===1?82:172,pose:'walk',heading:'',facing:facing,
    walkDistance:i*2,animT:i/20,reading:false,holding:null}));
  });
  frames.push(c.toDataURL());
 }
 return frames;
})()
