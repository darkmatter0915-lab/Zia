/* Canvas court and VFX with original generated actor atlases. See README provenance. */
function makeRenderer(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});let scale=1,ox=0,oy=0,dpr=1;
 const stone=document.createElement('canvas');stone.width=960;stone.height=600;const b=stone.getContext('2d');
 const round=(c,x,y,w,h,r=6)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
 const poly=(c,pts,fill,stroke)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
 const circle=(c,x,y,r,fill,stroke)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
 function label(c,text,x,y,size=12,color='#99aeb3',align='left'){c.fillStyle=color;c.font=`${size}px system-ui,"Noto Sans CJK TC",sans-serif`;c.textAlign=align;c.fillText(text,x,y);}
 let gradient=b.createLinearGradient(0,0,0,600);gradient.addColorStop(0,'#101c27');gradient.addColorStop(1,'#070e16');b.fillStyle=gradient;b.fillRect(0,0,960,600);
 b.save();b.globalAlpha=.25;for(let y=50;y<590;y+=50)for(let x=22-(y%100?22:0);x<960;x+=72){b.strokeStyle='#586376';round(b,x,y,68,45,3);b.stroke();}b.restore();
 // A lowered, inlaid slate combat court.
 b.fillStyle='#050b12';round(b,98,68,764,481,13);b.fill();b.strokeStyle='#63717b';b.lineWidth=2;b.stroke();
 gradient=b.createLinearGradient(112,82,848,486);gradient.addColorStop(0,'#142831');gradient.addColorStop(.5,'#10202b');gradient.addColorStop(1,'#172735');b.fillStyle=gradient;b.fillRect(112,82,736,456);
 b.save();b.beginPath();b.rect(112,82,736,456);b.clip();for(let row=0;row<9;row++)for(let col=0;col<13;col++){
  let x=104+col*62-(row%2)*31,y=78+row*53;b.fillStyle=`rgba(95,124,139,${.025+((row*13+col*7)%9)*.006})`;b.fillRect(x+2,y+2,59,50);b.strokeStyle='#0b1923';b.lineWidth=1;b.strokeRect(x+1,y+1,61,52);
  if((row*3+col)%5===0){b.strokeStyle='#243642';b.beginPath();b.moveTo(x+14,y+8);b.lineTo(x+25,y+23);b.lineTo(x+20,y+34);b.stroke();}}
 b.translate(480,283);for(let r of [90,102,165])circle(b,0,0,r,null,'#233d48');for(let n=0;n<12;n++){b.save();b.rotate(n*Math.PI/6);b.strokeStyle='#34505a';b.beginPath();b.moveTo(0,107);b.lineTo(0,117);b.moveTo(-4,112);b.lineTo(4,112);b.stroke();b.restore();}
 poly(b,[[0,-70],[23,-21],[72,0],[23,21],[0,70],[-23,21],[-72,0],[-23,-21]],null,'#2a4650');circle(b,0,0,35,null,'#2a4650');b.restore();
 for(const x of [80,880]){for(let y=94;y<536;y+=77){b.fillStyle='#111b28';round(b,x-13,y-5,26,59,4);b.fill();b.strokeStyle='#3d4c59';b.stroke();b.fillStyle='#2c3c47';b.fillRect(x-10,y-9,20,8);b.fillRect(x-10,y+51,20,6);}}
 b.fillStyle='#101923';b.fillRect(112,487,736,51);b.strokeStyle='#916b58';b.setLineDash([4,6]);b.beginPath();b.moveTo(112,487);b.lineTo(848,487);b.stroke();b.setLineDash([]);
 label(b,'裂 隙 封 鎖 線',824,479,10,'#9e756b','right');
 b.strokeStyle='#819089';b.strokeRect(107,77,746,466);b.strokeStyle='#293d49';b.strokeRect(103,73,754,474);
 // Corner brasswork.
 for(const x of [105,855])for(const y of [76,544]){b.save();b.translate(x,y);b.rotate(x>480?Math.PI:0);poly(b,[[-7,-7],[22,-7],[22,-3],[3,-3],[3,14],[-2,14],[-2,2],[-7,2]],'#927456');b.restore();}
 const status={ready:false,failed:[],loaded:0,scenery:'loading'};
 // Decorative art never prevents entering combat if a download fails.
 const floor=new Image();
 floor.onload=()=>{b.drawImage(floor,112,82,736,404);b.fillStyle='#071a2424';b.fillRect(112,82,736,404);status.scenery='ready';dispatchEvent(new Event('rift-art-ready'));};
 floor.onerror=()=>{status.scenery='unavailable';};floor.src=window.RIFT_RELEASE.floor;
 const frostStone=document.createElement('canvas');frostStone.width=960;frostStone.height=600;const fb=frostStone.getContext('2d');fb.drawImage(stone,0,0);fb.fillStyle='#41568a38';fb.fillRect(112,82,736,404);fb.strokeStyle='#a5d6eb';fb.strokeRect(107,77,746,466);label(fb,'II / THE FROSTBONE COURT',126,100,10,'#b7dbea');
 const frostFloor=new Image();status.frostScenery='loading';frostFloor.onload=()=>{fb.drawImage(frostFloor,112,82,736,404);fb.fillStyle='#08182924';fb.fillRect(112,82,736,404);status.frostScenery='ready';dispatchEvent(new Event('rift-art-ready'));};frostFloor.onerror=()=>{status.frostScenery='unavailable';};frostFloor.src=window.RIFT_RELEASE.frostFloor;
 const sprites={},flashSprites={},iceSprites={},spriteNames=Object.keys(window.RIFT_RELEASE.sprites);status.total=spriteNames.length;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let quality='full',drawCount=0,drawMs=0,terminalTime=null,previousState=null;
 const metrics={frames:0,drawCalls:0,averageDrawMs:0,quality:'full',assets:status,viewport:null};
 function load(){
  status.ready=false;status.failed=[];status.loaded=0;
  return Promise.all(spriteNames.map(name=>new Promise(resolve=>{
   const im=new Image();let settled=false;
   const finish=ok=>{if(settled)return;settled=true;clearTimeout(timeout);if(ok){sprites[name]=im;
    const mask=document.createElement('canvas');mask.width=im.width;mask.height=im.height;const m=mask.getContext('2d');m.drawImage(im,0,0);m.globalCompositeOperation='source-in';m.fillStyle='#fff7dc';m.fillRect(0,0,im.width,im.height);flashSprites[name]=mask;
    const ice=document.createElement('canvas');ice.width=im.width;ice.height=im.height;const ic=ice.getContext('2d');ic.drawImage(im,0,0);ic.globalCompositeOperation='source-in';ic.fillStyle='#99e3f1';ic.fillRect(0,0,ice.width,ice.height);iceSprites[name]=ice;status.loaded++;
   }else status.failed.push(name);dispatchEvent(new Event('rift-assets-progress'));resolve(ok);};
   const timeout=setTimeout(()=>finish(false),12000);im.onload=()=>finish(im.width===768&&im.height===512);im.onerror=()=>finish(false);im.src=window.RIFT_RELEASE.sprites[name];
  }))).then(results=>{status.ready=results.every(Boolean);return status.ready;});
 }
 const ready=load();
 function resize(){
  dpr=Math.min(window.devicePixelRatio||1,quality==='lite'?1.35:1.8);const w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  const hud=document.getElementById('hud').getBoundingClientRect(),dock=document.getElementById('dock').getBoundingClientRect();
  if(hud.height&&dock.height){const top=hud.bottom+8,bottom=dock.top-10,margin=innerWidth<1100?Math.max(12,hud.left):20,worldWidth=innerHeight>innerWidth?776:840;
   scale=Math.min((innerWidth-2*margin)/worldWidth,Math.max(80,bottom-top)/492);ox=innerWidth/2-480*scale;oy=top+(bottom-top-492*scale)/2-64*scale;
  }else{scale=Math.min(innerWidth/960,innerHeight/600);ox=(innerWidth-960*scale)/2;oy=(innerHeight-600*scale)/2;}
  metrics.viewport={left:ox+112*scale,right:ox+848*scale,top:oy+82*scale,bottom:oy+540*scale,scale};
  document.documentElement.style.setProperty('--arena-bottom',metrics.viewport.bottom+'px');
 }
 function point(x,y){return{x:(x-ox)/scale,y:(y-oy)/scale};}
 function setQuality(value){quality=value==='lite'?'lite':'full';metrics.quality=quality;resize();}
 const lights={};
 function glow(c,x,y,r,color,alpha=1){
  if(!lights[color]){const a=document.createElement('canvas');a.width=a.height=128;const ac=a.getContext('2d'),g=ac.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color);g.addColorStop(.28,color+'90');g.addColorStop(1,color+'00');ac.fillStyle=g;ac.fillRect(0,0,128,128);lights[color]=a;}
  c.save();c.globalAlpha*=alpha;c.drawImage(lights[color],x-r,y-r,r*2,r*2);c.restore();
 }
 const elements=makeElementArt({glow,poly,circle,reduced,getQuality:()=>quality});
 const actorSize={hero:89,guard:86,runner:79,seer:90,boss:163,maw:170,oracle:164,iceguard:92,icehound:100,icewitch:102,reaper:176,queen:184};
 const actorName=e=>e.kind==='boss'?(RF.BOSSES[e.bossId||'bell']?.sprite||'boss'):e.kind;
 const portraitCache={};
 function portrait(name){if(!portraitCache[name]&&sprites[name]){const tile=document.createElement('canvas');tile.width=tile.height=256;tile.getContext('2d').drawImage(sprites[name],0,0,256,256,0,0,256,256);portraitCache[name]=tile.toDataURL('image/webp');}return portraitCache[name]||'';}
 function sprite(c,name,frame,x,foot,size,alpha=1,lean=0,flash=0,frost=0){const im=sprites[name];if(!im)return;
  c.save();c.translate(x,foot);c.rotate(lean);c.globalAlpha*=alpha;const sx=(frame%3)*256,sy=Math.floor(frame/3)*256;
  c.drawImage(im,sx,sy,256,256,-size*.5,-size*240/256,size,size);
  if(frost>0){c.save();c.globalAlpha*=Math.min(.42,frost*.7);c.drawImage(iceSprites[name],sx,sy,256,256,-size*.5,-size*240/256,size,size);c.restore();}
  if(flash>0){c.globalAlpha*=Math.min(.68,flash*5);c.drawImage(flashSprites[name],sx,sy,256,256,-size*.5,-size*240/256,size,size);}c.restore();
 }
 const iconCache={};
 function glyph(c,id,r,t=0){const color=RF.TYPES[id].color;c.lineWidth=r*.15;c.strokeStyle=color;c.fillStyle=color;
  const points=n=>Array.from({length:n},(_,i)=>[Math.cos(i*Math.PI*2/n-Math.PI/2)*r,Math.sin(i*Math.PI*2/n-Math.PI/2)*r]);
  if(id==='ember'){poly(c,[[0,-r*1.25],[r*.65,-r*.1],[r*.6,r*.55],[0,r],[-r*.7,r*.4],[-r*.6,-r*.3],[-r*.2,0]],color);poly(c,[[0,-r*.55],[r*.3,r*.5],[0,r*.76],[-r*.27,r*.4]],'#fff5c2');}
  else if(id==='frost'){poly(c,points(6),'#bff8ff',color);poly(c,[[0,-r],[-r*.25,0],[0,r],[r*.7,0]],'#58b5d7');c.strokeStyle='#efffff';c.beginPath();c.moveTo(0,-r);c.lineTo(0,r);c.moveTo(-r*.75,-r*.5);c.lineTo(r*.75,r*.5);c.stroke();}
  else if(id==='spark'){poly(c,[[r*.25,-r*1.2],[-r*.75,r*.15],[-r*.12,r*.1],[-r*.3,r*1.2],[r*.8,-r*.25],[r*.15,-r*.2]],'#fff6b8',color);}
  else if(id==='thorn'){poly(c,points(4),color,'#edffb7');for(let i=0;i<5;i++){c.save();c.rotate(i*1.256);poly(c,[[r*.2,-r*.3],[0,-r*1.25],[-r*.25,-r*.4]],'#9eda75');c.restore();}circle(c,0,0,r*.38,'#e6ffb2');}
  else if(id==='leech'){c.beginPath();c.moveTo(0,-r*1.2);c.bezierCurveTo(r*1.5,r*.1,r*.7,r,0,r);c.bezierCurveTo(-r*.7,r,-r*1.5,r*.1,0,-r*1.2);c.fill();circle(c,-r*.24,r*.22,r*.2,'#ffe5eb');}
  else if(id==='echo'){c.lineWidth=r*.3;for(const v of [-1,1]){c.beginPath();c.arc(v*r*.3,0,r*.7,v<0?Math.PI*.55:-Math.PI*.45,v<0?Math.PI*1.55:Math.PI*.55);c.stroke();}poly(c,[[0,-r*.55],[r*.35,0],[0,r*.55],[-r*.35,0]],'#eee7ff');}
  else if(id==='steam'){for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);poly(c,[[0,-r*1.3],[r*.19,-r*.4],[-r*.2,-r*.4]],i%2?'#86e6ff':'#ffaf67');c.restore();}circle(c,0,0,r*.55,'#fff6df',color);}
  else if(id==='tempest'){for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);poly(c,[[0,-r*1.3],[-r*.6,0],[0,-r*.2],[-r*.15,r*.5],[r*.6,-r*.4],[r*.15,-r*.3]],'#b5ffe8');c.restore();}}
  else {for(let i=0;i<5;i++){c.save();c.rotate(i*Math.PI*2/5);c.beginPath();c.ellipse(0,-r*.62,r*.32,r*.6,0,0,Math.PI*2);c.fill();c.restore();}circle(c,0,0,r*.43,'#ccffb0');}
 }
 for(const id of Object.keys(RF.TYPES)){const tile=document.createElement('canvas');tile.width=tile.height=96;const c=tile.getContext('2d');glow(c,48,48,44,RF.TYPES[id].color,.55);c.translate(48,48);glyph(c,id,18);iconCache[id]=tile.toDataURL('image/png');}
 function shadow(c,x,y,r,alpha=.45){c.save();c.globalAlpha*=alpha;c.fillStyle='#00090f';c.beginPath();c.ellipse(x,y,r,r*.28,0,0,Math.PI*2);c.fill();c.restore();}
 function rune(c,x,y,r,color,amount=1){c.save();c.translate(x,y);c.scale(1,.45);c.globalAlpha*=amount;c.lineWidth=1.3;circle(c,0,0,r,null,color);circle(c,0,0,r*.82,null,color);for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.strokeStyle=color;c.beginPath();c.moveTo(0,-r*.84);c.lineTo(0,-r);c.stroke();c.restore();}c.restore();}
 function enemy(c,e,t){const boss=e.kind==='boss',r=e.r,foot=e.y+r*.9,name=actorName(e),size=actorSize[name],bossColor=boss?RF.BOSSES[e.bossId||'bell'].color:'#e7a0ef';
  const walk=[0,1,0,2],moving=(e.age||0)+(e.seed||0),casting=['seer','icewitch'].includes(e.kind)||boss;
  let frame=walk[Math.floor(moving*(['runner','icehound'].includes(e.kind)?7:3))%4];
  // Melee wind-up and lunge align with the real breach damage threshold.
  if(!casting){const gap=RF.FLOOR-e.y-e.r,speed=e.speed*(e.slow>0?.55:1);if(gap<speed*.45)frame=3;if(gap<speed*.16)frame=4;}
  if(casting&&e.shot<.48)frame=3;if((e.cast||0)>0)frame=4;if(e.flash>.075)frame=5;
  if(e.kind==='icehound'&&e.flash<=.075){if(e.windup>0)frame=3;else if(e.rush>0)frame=4;}
  const bob=reduced?0:Math.sin(moving*(e.kind==='runner'?9:3))*(e.kind==='seer'?3:1.2);
  shadow(c,e.x,foot+1,r*.95);if(boss)rune(c,e.x,foot,r*1.12,e.hp<e.maxHp*.5?'#f18a76':bossColor,.65);
  if(casting&&e.shot<.48){const p=1-e.shot/.48;glow(c,e.x,e.y,r*1.4,bossColor,.3+p*.25);rune(c,e.x,foot+1,r*(.6+p*.5),bossColor,.8);}
  elements.frostGround(c,e,t);
  const recoil=reduced?0:Math.max(0,e.flash-.045)*35;
  sprite(c,name,frame,e.x,foot+bob-recoil,size,1,e.flash>.075?(reduced?0:.04):0,e.flash,e.slow||0);
  if(e.kind==='iceguard'&&e.guard>0){c.save();c.globalAlpha=.55;c.lineWidth=1.7;c.strokeStyle='#bdf5ff';c.beginPath();c.ellipse(e.x,e.y+12,r*.94,r*.7,0,0,Math.PI);c.stroke();for(let i=0;i<e.guard;i++)poly(c,[[e.x-9+i*9,foot+10],[e.x-6+i*9,foot+14],[e.x-9+i*9,foot+18],[e.x-12+i*9,foot+14]],'#aeeaff');c.restore();}
  if(e.kind==='icehound'&&e.windup>0){rune(c,e.x,foot,r*1.3,'#c4e7ff',.8);c.save();c.setLineDash([4,6]);c.strokeStyle='#c4e7ff';c.globalAlpha=.6;c.beginPath();c.moveTo(e.x,foot);c.lineTo(e.targetX,486);c.stroke();c.restore();}
  elements.status(c,e,t);
  if(e.hp<e.maxHp&&!boss){const w=r*1.7;c.fillStyle='#06101ce8';round(c,e.x-w/2-1,foot+5,w+2,5,2);c.fill();c.fillStyle=e.poison>0?'#98d482':'#d6b787';c.fillRect(e.x-w/2,foot+6,w*Math.max(0,e.hp/e.maxHp),2);}
 }
 function hero(c,s,t){const step=[1,0,2,0],shoot=s.fireAnim||0;let frame=s.moveDir?step[Math.floor(t*10)%4]:0;
  if(shoot>0)frame=4;else if(s.shotCd<.065)frame=3;
  const hurt=s.fx.some(f=>f.type==='hurt');if(hurt)frame=5;
  let death=s.phase==='lose'?Math.min(1,(t-s.time)/.8):0;
  const form=RF.heroForm(s.level),tier=form.tier;
  metrics.hero={level:s.level,tier,sprite:form.sprite};
  shadow(c,s.x,539,23);rune(c,s.x,537,28,s.charge>=100?'#efdda8':'#a3d7d9',s.charge>=100?.65:.25);
  if(!death&&tier>=2){
   rune(c,s.x,537,29+(tier-2)*5,form.color,.42);glow(c,s.x,515,25+tier*4,form.color,.09+tier*.02);
   if(tier>=3){c.save();c.translate(s.x,504);c.rotate(reduced?0:t*.18);c.globalAlpha=.48;c.lineWidth=.85;circle(c,0,0,27,null,form.color);for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);poly(c,[[0,-30],[2,-26],[0,-23],[-2,-26]],form.color);c.restore();}c.restore();}
   if(tier>=4){c.save();c.translate(s.x,501);c.globalAlpha=.62;c.lineWidth=1.3;c.beginPath();c.arc(0,0,33,Math.PI*1.06,Math.PI*1.94);c.strokeStyle='#ffe9b7';c.stroke();for(let i=-1;i<=1;i++){const x=i*11,y=-35-Math.abs(i)*-3;poly(c,[[x,y-5],[x+2,y],[x,y+5],[x-2,y]],'#ffe9b7');}c.restore();}
  }
  if(s.charge>=100)glow(c,s.x,522,44,'#a7d9d1',.2);
  if(s.chill>0){rune(c,s.x,538,32,'#c3ecff',.85);glow(c,s.x,525,28,'#98c6ff',.2);}
  if(s.invuln>0&&!hurt){c.save();c.strokeStyle='#bde8e1';c.lineWidth=1.6;c.globalAlpha=.5;circle(c,s.x,520,25,null,'#bde8e1');c.restore();}
  sprite(c,form.sprite,frame,s.x,540+death*8,form.size*(1-death*.25),(1-death*.8)*(s.invuln>0&&hurt?.72:1),death*.7, hurt?.09:0);
  if(!death){const core=s.lastCore||'ember';glow(c,s.x+14,493,(shoot>0?17:9)*(1+(tier-1)*.16),RF.TYPES[core].color,shoot>0?.55:.2);if(tier>=3)glow(c,s.x+18,506,7+tier,form.color,.4);}
 }
 function dangerArt(c,h,outline=false){const p=1-h.life/h.max,x=h.x,w=h.width,cold=['ice','blizzard'].includes(h.kind),color=cold?'#c5eeff':h.kind==='star'?'#ddaaff':'#ffad78';c.save();c.lineWidth=1.5;
  if(!outline){c.fillStyle=cold?'#80b7e524':h.kind==='star'?'#8f457228':'#b3412528';c.fillRect(x-w/2,RF.TOP,w,456);c.fillStyle=cold?'#a0cfff30':h.kind==='star'?'#b060a124':'#ea643a24';c.fillRect(x-w/2,RF.TOP+456*(1-p),w,456*p);c.strokeStyle=color+'70';for(let y=100;y<526;y+=34){c.beginPath();c.moveTo(x-w/2+6,y);c.lineTo(x,y+12);c.lineTo(x+w/2-6,y);c.stroke();}}
  else {c.strokeStyle=color;c.setLineDash([5,4]);c.strokeRect(x-w/2,RF.TOP,w,456);c.setLineDash([]);c.fillStyle='#100d18e8';round(c,x-28,497,56,23,4);c.fill();label(c,'閃避',x,513,12,'#fff0dd','center');c.lineWidth=3;c.beginPath();c.arc(x,470,11,-Math.PI/2,-Math.PI/2+p*Math.PI*2);c.stroke();}c.restore();
 }
 function effect(c,f,t){const p=1-f.life/f.max,remain=1-p,color=f.color;
  c.save();c.globalAlpha=remain;c.lineCap='round';c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.8;
  if(f.type==='impact'){elements.impact(c,f,p,t);
  }else if(f.type==='hazard'){c.globalAlpha=remain*.55;c.fillRect(f.x-f.size/2,82,f.size,457);c.lineWidth=4*remain+.5;c.beginPath();c.moveTo(f.x,82);for(let i=1;i<12;i++)c.lineTo(f.x+Math.sin(i*4)*f.size*.22,82+i*40);c.stroke();glow(c,f.x,517,f.size,color,.5);circle(c,f.x,517,p*f.size,null,'#fff2da');if(['ice','blizzard'].includes(f.core))for(let i=0;i<7;i++){const y=115+i*64,x=f.x+Math.sin(i*3)*f.size*.22;poly(c,[[x,y-32*remain],[x+9*remain,y],[x,y+18*remain],[x-9*remain,y]],'#81b9df','#e5fbff');}
  }else if(f.type==='shatter'){for(let i=0;i<8;i++){const a=i*Math.PI/4,r=12+p*36,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;c.save();c.translate(x,y);c.rotate(a);poly(c,[[0,-8*remain],[4*remain,0],[0,8*remain],[-4*remain,0]],'#95d9f0','#e5fbff');c.restore();}
  }else if(f.type==='siphon'){elements.siphon(c,f,p);
  }else if(f.type==='arc'){
   elements.bolt(c,f.x,f.y,f.x2,f.y2,t,f.core==='spark'?'#85baff':f.core==='tempest'?'#7fffe0':color,RF.spellArt(f.core,f.level,f.heroLevel).scale,true);glow(c,f.x2,f.y2,24,color,.4);
  }else if(f.type==='dash'){const form=RF.heroForm(f.heroLevel);for(let i=0;i<3+form.tier;i++){const x=f.x+(f.x2-f.x)*i/(3+form.tier);sprite(c,form.sprite,1,x,540,form.size,remain*(.09+i*.03),0,0);}for(let j=0;j<2+form.tier;j++){const y=513+j*6;c.strokeStyle=j===1?'#e6fffa':form.color;c.lineWidth=j===1?2:1;c.globalAlpha=remain*(j===1?.7:.4);c.beginPath();c.moveTo(f.x,y);c.quadraticCurveTo((f.x+f.x2)/2,y-7,f.x2,y);c.stroke();}glow(c,f.x2,520,28,form.color,remain*.35);
  }else if(f.type==='pulse'){const r=20+p*720,tier=RF.heroForm(f.heroLevel).tier;c.lineWidth=(8+tier*2)*remain+1;c.globalAlpha=remain*.22;circle(c,f.x,f.y,r,null,'#c5f3e2');c.globalAlpha=remain;c.lineWidth=2;circle(c,f.x,f.y,r,null,'#e9ffe8');circle(c,f.x,f.y,r*.96,null,'#79cdc5');if(tier>=3){c.lineWidth=1;circle(c,f.x,f.y,r*.88,null,'#ffe4a2');}if(quality==='full')for(let i=0;i<12+tier*4;i++){const a=i*Math.PI*2/(12+tier*4);c.save();c.translate(f.x+Math.cos(a)*r*.97,f.y+Math.sin(a)*r*.97);c.rotate(a);poly(c,[[0,-3],[-8,0],[0,3],[6,0]],null,'#c5f3e2');c.restore();}
  }else if(f.type==='ascend'||f.type==='levelup'){
   const big=f.type==='ascend',r=12+(1-Math.pow(1-p,3))*(big?62:34);glow(c,f.x,f.y,40*remain,color,big?.5:.3);c.lineWidth=2*remain+.5;c.save();c.translate(f.x,535);c.scale(1,.38);circle(c,0,0,r,null,color);if(big)circle(c,0,0,r*.76,null,'#e6ffff');c.restore();
   for(let i=0;i<(big?10:5);i++){const a=i*Math.PI*2/(big?10:5),x=f.x+Math.cos(a)*r*.6,y=f.y-10-Math.sin(a)*r*.35-p*36;poly(c,[[x,y-5*remain],[x+2*remain,y],[x,y+5*remain],[x-2*remain,y]],i%2?color:'#f5ffe8');}
  }else if(f.type==='nova'||f.type==='bloom'){elements.burst(c,f,p,t);
  }else if(f.type==='ring'){const r=4+(1-Math.pow(1-p,2))*27*f.size;c.lineWidth=3*remain+.5;circle(c,f.x,f.y,r,null,color);
  }else if(f.type==='muzzle'){elements.muzzle(c,f,p,t);
  }else if(f.type==='catch'){c.beginPath();c.ellipse(f.x,f.y,3+p*22,2+p*7,0,0,Math.PI*2);c.stroke();}
  else if(f.type==='wall'){c.lineWidth=2*remain+.5;circle(c,f.x,f.y,3+p*17,null,color);glow(c,f.x,f.y,14*remain,color,.3);}
  else {const count=quality==='lite'?4:f.type==='death'?10:7,spread=f.type==='wall'?12:f.type==='death'?42:24;
   for(let i=0;i<count;i++){const a=i*Math.PI*2/count+.35,r=p*spread*f.size,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r+p*p*8;c.save();c.translate(x,y);c.rotate(a+p*2);
    if(f.core==='frost'||f.core==='steam')poly(c,[[0,-5*remain],[2*remain,0],[0,6*remain],[-2*remain,0]],i%2?color:'#e9ffff');
    else if(f.core==='thorn'||f.core==='plague'){circle(c,0,0,1+remain*2.5,null,color);}
    else if(f.core==='echo'||f.core==='tempest')poly(c,[[0,-4*remain],[3*remain,0],[0,4*remain],[-3*remain,0]],color);
    else {c.lineWidth=Math.max(.6,remain*2);c.beginPath();c.moveTo(0,0);c.lineTo(5*remain,0);c.stroke();}c.restore();}
  }c.restore();
 }
 function draw(s,wallTime){metrics.drawCalls++;const begin=performance.now();let t=s?s.time:wallTime;
  if(s!==previousState){terminalTime=null;previousState=s;}if(s&&['win','lose'].includes(s.phase)){if(terminalTime===null)terminalTime=wallTime;t=s.time+Math.min(1.2,wallTime-terminalTime);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050b12';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.drawImage(s?.chapter===2?frostStone:stone,0,0);metrics.chapter=s?.chapter||1;
  if(!s){if(status.ready){[['guard',440,230],['runner',660,285],['seer',750,195],['boss',535,125]].forEach(([kind,x,y],i)=>enemy(ctx,{kind,x,y,r:kind==='boss'?54:24,hp:1,maxHp:1,age:t,seed:i,shot:2},t));}return;}
  // Combat effects stay inside the arena and below the HUD.
  ctx.save();ctx.beginPath();ctx.rect(106,78,748,466);ctx.clip();
  if(quality==='full'){for(const x of [120,840]){glow(ctx,x,280,95,'#599da8',.10);glow(ctx,x,470,55,'#d99761',.13);}}
  if(s.chapter===2){label(ctx,'II / 霜骸王庭',126,100,10,'#bad9ec');if(quality==='full')for(let i=0;i<15;i++){const x=124+(i*139%712),y=100+((i*47+(reduced?0:t*12))%380);ctx.globalAlpha=.15+(i%3)*.07;circle(ctx,x+Math.sin(i+(reduced?0:t*.2))*8,y,1.2,'#ccedff');}ctx.globalAlpha=1;}
  for(const h of s.hazards||[])dangerArt(ctx,h);
  if(s.telegraph>0){const p=1-s.telegraph/1.3;ctx.fillStyle='#8b283b30';ctx.fillRect(s.lane-43,82,86,457);ctx.fillStyle='#ce465e30';ctx.fillRect(s.lane-43,82,86,457*p);ctx.strokeStyle='#ffb58d';ctx.lineWidth=2;ctx.setLineDash([9,5]);ctx.strokeRect(s.lane-43,82,86,457);ctx.setLineDash([]);label(ctx,'閃 避',s.lane,472,13,'#fff1cc','center');}
  const target=s.auto?s.enemies.filter(e=>!e.dead).sort((a,b)=>(b.y*1.8-Math.abs(b.x-s.x))-(a.y*1.8-Math.abs(a.x-s.x)))[0]:{x:s.aimX,y:s.aimY};
  if(target){let dx=target.x-(s.x+14),dy=Math.min(-55,target.y-493),len=Math.hypot(dx,dy);dx/=len;dy/=len;let x=s.x+14,y=493;ctx.strokeStyle='#aacfd2';ctx.globalAlpha=s.auto?.24:.52;ctx.lineWidth=1.2;ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(x,y);for(let n=0;n<48;n++){x+=dx*6;y+=dy*6;if(x<118||x>842){dx=-dx;x=RF.clamp(x,118,842);}if(y<88){dy=-dy;y=88;}ctx.lineTo(x,y);}ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
   const radius=s.auto?(target.r||20)+5:13;ctx.strokeStyle=s.auto?'#d9be8577':'#d4f4ed';ctx.lineWidth=1.5;for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.arc(target.x,target.y,radius,a+.15,a+.6);ctx.stroke();}}
  for(const g of s.ghosts||[]){const p=Math.min(1,1-(g.life-(t-s.time))/g.max),name=actorName(g),sz=actorSize[name];sprite(ctx,name,5,g.x,g.y+g.r*.9+p*7,sz*(1-p*.15),Math.max(0,1-p)*.65,p*.16,0);}
  [...s.enemies].sort((a,b)=>a.y-b.y).forEach(e=>enemy(ctx,e,t));
  for(const b of s.balls)elements.projectile(ctx,b,t);
  for(const b of s.bullets){const angle=Math.atan2(b.vy,b.vx),star=b.kind==='oracle',cold=b.kind==='ice',color=cold?'#92bdff':star?'#d79aff':'#ff8f75';ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);glow(ctx,0,0,17,color,.5);ctx.lineWidth=1.4;if(cold){poly(ctx,[[b.r+6,0],[-3,-5],[-b.r-6,0],[-3,5]],'#6793d7','#e3e8ff');poly(ctx,[[b.r+6,0],[-3,0],[-b.r-6,0],[-3,5]],'#b2daff');}else if(star){poly(ctx,[[b.r+3,0],[0,-b.r-1],[-b.r-3,0],[0,b.r+1]],'#bb64c9','#fff0fa');circle(ctx,0,0,2,'#fff4ed');}else poly(ctx,[[b.r+4,0],[-b.r,-b.r*.85],[-b.r*.6,0],[-b.r,b.r*.85]],'#f28a70','#ffe6c9');ctx.restore();}
  for(const f of s.fx)if(f.type==='dash')effect(ctx,f,t);
  hero(ctx,s,t);
  const reach=52+s.passives.catch*18;ctx.strokeStyle=s.charge>=100?'#f3d392':'#73b7c0';ctx.lineWidth=2;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(s.x-reach,535);ctx.lineTo(s.x-reach,530);ctx.moveTo(s.x-reach,535);ctx.lineTo(s.x+reach,535);ctx.lineTo(s.x+reach,530);ctx.stroke();ctx.globalAlpha=1;
  for(const f of s.fx)if(f.type!=='dash'&&f.life>t-s.time)effect(ctx,{...f,life:f.life-(t-s.time)},t);
  // Danger edges and countdowns remain legible above player effects, even in lite mode.
  for(const h of s.hazards||[])dangerArt(ctx,h,true);
  for(const d of s.texts){ctx.globalAlpha=Math.min(1,d.life*3);ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#06101bee';ctx.strokeText(d.text,d.x,d.y-18);ctx.fillStyle=d.color;ctx.fillText(d.text,d.x,d.y-18);}ctx.globalAlpha=1;ctx.restore();
  const boss=s.enemies.find(e=>e.kind==='boss');if(boss){const info=RF.BOSSES[boss.bossId||'bell'],rage=boss.hp<boss.maxHp*.5;ctx.fillStyle='#060d16ef';round(ctx,280,82,400,28,4);ctx.fill();ctx.fillStyle=rage?'#e8877d':info.color;ctx.fillRect(284,104,392*Math.max(0,boss.hp/boss.maxHp),3);label(ctx,info.name+(rage?' · 狂暴階段':''),480,97,12,'#eadac0','center');ctx.fillStyle='#060d16';ctx.fillRect(479,103,2,5);}
  if(s.chill>0)label(ctx,'寒霜緩速 · 閃避解除',480,556,11,'#c4e7ff','center');
  else if(s.pact?.wave===s.wave)label(ctx,'裂隙共鳴：傷害 +35% / 承傷 +25%',480,563,10,'#ccb1e9','center');
  if(s.hp<s.maxHp*.25){ctx.strokeStyle='#ce58647a';ctx.lineWidth=2;ctx.strokeRect(105,76,750,468);}
  const elapsed=performance.now()-begin;drawMs+=elapsed;drawCount++;if(drawCount===120){metrics.averageDrawMs=Number((drawMs/drawCount).toFixed(2));metrics.frames+=drawCount;drawMs=0;drawCount=0;}
 }
 resize();addEventListener('resize',resize);
 return {draw,point,resize,ready,load,status,setQuality,metrics,portrait,icon:id=>iconCache[id]};
}
