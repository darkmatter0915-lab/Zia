/* Original canvas illustration and presentation. All geometry is authored here. */
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
 function resize(){dpr=Math.min(window.devicePixelRatio||1,1.8);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);scale=Math.min(innerWidth/960,(innerHeight-(innerHeight<520?56:0))/600);ox=(innerWidth-960*scale)/2;oy=(innerHeight-600*scale)/2;}
 function point(x,y){return{x:(x-ox)/scale,y:(y-oy)/scale};}
 function orb(c,id,x,y,r=9,t=0){const k=RF.TYPES[id];c.save();c.translate(x,y);c.shadowColor=k.color;c.shadowBlur=r*2.8;const g=c.createRadialGradient(-r*.3,-r*.35,1,0,0,r);g.addColorStop(0,'#efffff');g.addColorStop(.34,k.color);g.addColorStop(1,'#21323e');circle(c,0,0,r,g,k.color);c.shadowBlur=0;c.strokeStyle=k.color;c.globalAlpha=.65;c.lineWidth=1.4;c.beginPath();c.ellipse(0,0,r*1.7,r*.57,t,0,Math.PI*2);c.stroke();c.globalAlpha=.6;circle(c,-r*.32,-r*.38,r*.17,'#fff');c.restore();}
 function enemy(c,e,t){c.save();c.translate(e.x,e.y+Math.sin(t*2+e.seed)*2);const r=e.r;c.globalAlpha=.4; c.scale(1,.38);circle(c,0,r*1.85,r*1.03,'#000');c.scale(1,1/.38);c.globalAlpha=1;
  if(e.kind==='guard'){
   poly(c,[[-21,7],[-27,-8],[-17,-24],[-9,-17],[0,-29],[9,-17],[17,-24],[27,-8],[21,7],[13,22],[-13,22]],'#425463','#82929a');
   poly(c,[[-18,-9],[-8,-17],[0,-14],[8,-17],[18,-9],[14,12],[0,22],[-14,12]],'#202d3a','#607780');
   poly(c,[[-19,-4],[-7,0],[-6,5],[-17,3]],'#d8966a');poly(c,[[19,-4],[7,0],[6,5],[17,3]],'#d8966a');
   poly(c,[[-4,-7],[0,-12],[4,-7],[2,14],[-2,14]],'#94a0a2');c.strokeStyle='#78858b';for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(j*6-1,12);c.lineTo(j*6,17);c.stroke();}
  }else if(e.kind==='runner'){
   poly(c,[[-16,0],[-24,-19],[-10,-13],[0,-22],[10,-13],[24,-19],[16,0],[21,9],[10,18],[0,12],[-10,18],[-21,9]],'#65504e','#a98b76');
   poly(c,[[-15,-6],[-8,-12],[0,-8],[8,-12],[15,-6],[9,12],[0,17],[-9,12]],'#ad8973');circle(c,-7,-2,3,'#2b2730');circle(c,7,-2,3,'#2b2730');circle(c,-7,-2,1.4,'#fb8f61');circle(c,7,-2,1.4,'#fb8f61');poly(c,[[-9,7],[9,7],[5,13],[-5,13]],'#262435');for(let x=-5;x<=5;x+=5)poly(c,[[x-2,7],[x+2,7],[x,11]],'#e9cd9d');
  }else if(e.kind==='seer'){
   poly(c,[[-23,21],[-18,-9],[-8,-26],[5,-29],[17,-9],[23,21],[11,16],[0,23],[-11,16]],'#55425d','#957fa0');
   poly(c,[[-13,1],[-11,-13],[0,-22],[11,-13],[13,1],[6,11],[-6,11]],'#111823','#6b597d');circle(c,0,-4,7,'#e1a0c4');circle(c,0,-4,3,'#291e38');c.strokeStyle='#e6bccf';c.beginPath();c.moveTo(-7,15);c.lineTo(0,8);c.lineTo(7,15);c.stroke();
  }else{
   c.scale(1.4,1.4);for(const side of [-1,1]){poly(c,[[side*18,-19],[side*39,-43],[side*33,-5],[side*44,3],[side*31,25],[side*17,12]],'#6d645e','#b39c80');}
   poly(c,[[-28,-17],[-19,-36],[0,-43],[19,-36],[28,-17],[33,12],[18,32],[0,39],[-18,32],[-33,12]],'#455464','#a6957b');
   poly(c,[[-21,-13],[-12,-27],[0,-23],[12,-27],[21,-13],[17,11],[0,28],[-17,11]],'#182636','#78848c');
   poly(c,[[-21,-7],[-6,-3],[-5,4],[-19,0]],e.hp<e.maxHp*.5?'#ff665e':'#e9b778');poly(c,[[21,-7],[6,-3],[5,4],[19,0]],e.hp<e.maxHp*.5?'#ff665e':'#e9b778');
   c.strokeStyle='#b39c80';c.lineWidth=2;for(let x=-12;x<=12;x+=8){c.beginPath();c.moveTo(x,12);c.lineTo(x,20-Math.abs(x)*.3);c.stroke();}circle(c,0,-32,4,'#ecd7a1');
  }
  if(e.slow>0){c.strokeStyle='#8fdee9';c.globalAlpha=.65;circle(c,0,0,r+5,null,'#8fdee9');c.globalAlpha=1;}
  if(e.burn>0)circle(c,-r+3,-r+6,3,'#ffa360');if(e.poison>0)circle(c,r-3,-r+6,3,'#99db85');
  if(e.flash>0){c.globalAlpha=e.flash*3;circle(c,0,0,r,'#e4e8cc');c.globalAlpha=1;}
  if(e.hp<e.maxHp&&e.kind!=='boss'){c.fillStyle='#060e17';c.fillRect(-r,r+7,r*2,3);c.fillStyle=e.poison>0?'#97c88c':'#b4a591';c.fillRect(-r,r+7,r*2*e.hp/e.maxHp,3);}c.restore();
 }
 function hero(c,s,t){c.save();c.translate(s.x,519);c.globalAlpha=s.invuln>0?.65+Math.sin(t*35)*.25:1;
  c.fillStyle='#090d19';c.beginPath();c.ellipse(0,14,25,7,0,0,Math.PI*2);c.fill();
  poly(c,[[-12,-2],[-18,21],[0,16],[18,21],[12,-2]],'#663d48','#9f6366');poly(c,[[-14,5],[-19,-3],[-11,-10],[-6,-5],[6,-5],[11,-10],[19,-3],[14,5],[8,12],[-8,12]],'#58717c','#a2b6b6');
  poly(c,[[-8,-8],[-10,-16],[-4,-23],[4,-23],[10,-16],[8,-8],[0,-4]],'#4a6571','#a2b6b6');c.fillStyle='#132634';c.fillRect(-6,-15,12,4);c.fillStyle='#a7e9e9';c.fillRect(-5,-14,10,1.5);orb(c,s.loadout[s.shotIndex%s.loadout.length].id,0,-28,5,t);
  if(s.charge>=100)circle(c,0,0,29+Math.sin(t*4)*2,null,'#d7d3a2');c.restore();
 }
 function draw(s,t){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#070d15';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.drawImage(stone,0,0);
  // Torches and drifting ember motes outside the critical play space.
  for(const x of [79,881])for(const y of [150,350]){const g=ctx.createRadialGradient(x,y,1,x,y,45);g.addColorStop(0,'rgba(224,152,82,.17)');g.addColorStop(1,'rgba(224,152,82,0)');ctx.fillStyle=g;ctx.fillRect(x-45,y-45,90,90);poly(ctx,[[x-4,y+8],[x-6,y-3],[x+Math.sin(t*6)*3,y-15],[x+5,y-1],[x+4,y+8]],'#c98b58');circle(ctx,x,y,2,'#fff0bd');}
  for(let i=0;i<18;i++){const x=44+(i*197)%880,y=100+(i*91-t*11)%440;ctx.globalAlpha=.12+(i%4)*.06;circle(ctx,x,y,1,'#bbad8b');}ctx.globalAlpha=1;
  if(!s){let sample=[['guard',420,235],['guard',535,175],['runner',640,262],['seer',715,198],['guard',760,334],['runner',553,343]];sample.forEach(([kind,x,y],i)=>enemy(ctx,{kind,x,y,r:24,hp:1,maxHp:1,seed:i},t));for(let i=0;i<7;i++)orb(ctx,['ember','frost','spark'][i%3],430+i*47+Math.sin(t+i)*20,390-Math.sin(t*.8+i)*80,6,t);return;}
  if(s.telegraph>0){ctx.fillStyle=`rgba(225,78,91,${.13+Math.sin(t*18)*.05})`;ctx.fillRect(s.lane-43,82,86,457);ctx.strokeStyle='#ffc0a3';ctx.lineWidth=3;ctx.setLineDash([9,5]);ctx.strokeRect(s.lane-43,82,86,457);ctx.setLineDash([]);ctx.fillStyle='#4a1519df';round(ctx,s.lane-35,445,70,29,5);ctx.fill();label(ctx,'閃避！',s.lane,465,15,'#fff4dc','center');}
  // Aim guide is deliberately short: show the first reflection, not guaranteed future hits.
  const target=s.auto?s.enemies.filter(e=>!e.dead).sort((a,b)=>(b.y*1.8-Math.abs(b.x-s.x))-(a.y*1.8-Math.abs(a.x-s.x)))[0]:{x:s.aimX,y:s.aimY};
  if(target){let dx=target.x-s.x,dy=Math.min(-55,target.y-520),len=Math.hypot(dx,dy);dx/=len;dy/=len;let x=s.x,y=505;ctx.strokeStyle='#7b9fa7';ctx.globalAlpha=.23;ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(x,y);for(let n=0;n<50;n++){x+=dx*6;y+=dy*6;if(x<118||x>842){dx=-dx;x=RF.clamp(x,118,842);}if(y<88){dy=-dy;y=88;}ctx.lineTo(x,y);}ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
  s.enemies.forEach(e=>enemy(ctx,e,t));
  ctx.lineCap='round';for(const b of s.balls){ctx.strokeStyle=RF.TYPES[b.type].color;ctx.globalAlpha=.36;ctx.lineWidth=b.generation?2:5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.045,b.y-b.vy*.045);ctx.stroke();ctx.globalAlpha=1;orb(ctx,b.type,b.x,b.y,b.r,t);if(b.banks>0&&!b.generation){ctx.fillStyle='#f8eac3';circle(ctx,b.x+8,b.y-9,Math.min(2.5,.7+b.banks*.45),'#f8eac3');}}
  for(const b of s.bullets){circle(ctx,b.x,b.y,b.r+2,'#672e3b');poly(ctx,[[b.x,b.y-b.r],[b.x+b.r,b.y],[b.x,b.y+b.r],[b.x-b.r,b.y]],'#f09b96','#ffe1bb');}
  hero(ctx,s,t);
  // The catch zone remains legible beneath the projectile swarm.
  ctx.strokeStyle=s.charge>=100?'#eedba5':'#a6d3cc';ctx.globalAlpha=.25+Math.sin(t*3)*.08;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x-52-s.passives.catch*18,527);ctx.lineTo(s.x+52+s.passives.catch*18,527);ctx.stroke();ctx.globalAlpha=1;
  for(const f of s.fx){const p=1-f.life/f.max;ctx.globalAlpha=1-p;ctx.strokeStyle=f.color;ctx.fillStyle=f.color;ctx.lineWidth=1.5;
   if(f.type==='arc'){ctx.beginPath();ctx.moveTo(f.x,f.y);for(let n=1;n<6;n++)ctx.lineTo(f.x+(f.x2-f.x)*n/6+Math.sin(n*17+t*30)*6,f.y+(f.y2-f.y)*n/6);ctx.lineTo(f.x2,f.y2);ctx.stroke();}
   else if(f.type==='ring'){ctx.lineWidth=Math.max(1,3*(1-p));circle(ctx,f.x,f.y,4+p*26*f.size,null,f.color);}
   else{for(let i=0;i<6;i++){const a=i*Math.PI/3;circle(ctx,f.x+Math.cos(a)*p*24*f.size,f.y+Math.sin(a)*p*24*f.size,Math.max(.1,2.4*(1-p)),f.color);}}
  }ctx.globalAlpha=1;for(const d of s.texts){ctx.globalAlpha=Math.min(1,d.life*3);ctx.shadowColor=d.color;ctx.shadowBlur=8;label(ctx,d.text,d.x,d.y,14,d.color,'center');ctx.shadowBlur=0;}ctx.globalAlpha=1;
  if(s.invuln>.38){const g=ctx.createRadialGradient(s.x,520,10,s.x,520,180);g.addColorStop(0,'#f063582a');g.addColorStop(1,'#f0635800');ctx.fillStyle=g;ctx.fillRect(s.x-180,340,360,200);}
  const boss=s.enemies.find(e=>e.kind==='boss');if(boss){ctx.fillStyle='#080f18';round(ctx,280,88,400,20,4);ctx.fill();ctx.fillStyle=boss.hp<boss.maxHp*.5?'#b57377':'#b69770';ctx.fillRect(284,104,392*boss.hp/boss.maxHp,3);label(ctx,'熔鐘守衛'+(boss.hp<boss.maxHp*.5?' · 破殼狂怒':''),480,101,11,'#dfd2b7','center');}
  label(ctx,'VIII  /  THE SUNKEN FOUNDRY',134,98,9,'#587580');
 }
 resize();addEventListener('resize',resize);return{draw,point,resize};
}
