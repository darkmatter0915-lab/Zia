/* Native animated elemental art. UI emblems are deliberately separate from combat bodies.
 * Pure rendering: no simulation writes, random calls, timers, or per-particle objects retained.
 * Cached flame frames + glow textures keep the heavy work out of the animation loop. */
function makeElementArt({glow,poly,circle,reduced,getQuality}){
 const TAU=Math.PI*2,full=()=>getQuality()==='full';
 const colors={ember:'#ff792b',frost:'#79deff',spark:'#85baff',thorn:'#95dd69',leech:'#ff5683',echo:'#b798ff',steam:'#ffb877',tempest:'#7fffe0',plague:'#dd85b6'};
 const motion=t=>reduced?0:t;
 const stroke=(c,points,color,width,alpha=1)=>{c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();};
 const flameFrames=Array.from({length:12},(_,frame)=>{
  const tile=document.createElement('canvas');tile.width=192;tile.height=104;
  const c=tile.getContext('2d'),phase=frame/12*TAU;
  // Three turbulent tongues wrap around a spherical incandescent heart.
  const outer=c.createLinearGradient(15,52,163,52);
  outer.addColorStop(0,'#dc342000');outer.addColorStop(.25,'#de391c90');outer.addColorStop(.7,'#ff661d');outer.addColorStop(1,'#ffd572');
  c.fillStyle=outer;c.beginPath();c.moveTo(161,52);
  c.bezierCurveTo(155,20,122,28,92,23+Math.sin(phase)*5);
  c.bezierCurveTo(105,40,51,19,23,32+Math.cos(phase)*9);
  c.bezierCurveTo(73,39,44,48,9,51);
  c.bezierCurveTo(60,59,45,71,28,76+Math.sin(phase)*8);
  c.bezierCurveTo(71,67,96,79,89,66);
  c.bezierCurveTo(123,82,157,79,161,52);c.fill();
  for(let i=0;i<3;i++){
   const y=52+(i-1)*10,tip=32+i*17,wave=Math.sin(phase+i*2)*7;
   c.fillStyle=i===1?'#ffcd55':'#ff9d32';c.beginPath();c.moveTo(145,y);
   c.bezierCurveTo(117,y-14,91,y+wave,tip,y-6+wave);
   c.bezierCurveTo(79,y+10,95,y+12,142,y+12);c.closePath();c.fill();
  }
  const heart=c.createRadialGradient(145,48,2,140,52,25);
  heart.addColorStop(0,'#fffef0');heart.addColorStop(.28,'#fff8b4');heart.addColorStop(.62,'#ffcf55');heart.addColorStop(.84,'#ff8b2c');heart.addColorStop(1,'#ff481900');
  c.fillStyle=heart;c.beginPath();c.ellipse(140,52,25,24,0,0,TAU);c.fill();
  c.strokeStyle='#fff2ac';c.lineWidth=2.2;c.beginPath();c.arc(140,52,15,.1+phase*.12,2.1+phase*.12);c.stroke();
  return tile;
 });
 function flame(c,x,y,r,t,angle=0,alpha=1){c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);const z=r/22;c.drawImage(flameFrames[Math.floor(motion(t)*24)%12],-140*z,-52*z,192*z,104*z);c.restore();}
 function crystal(c,x,y,length,width,angle=0,alpha=1,violet=false){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);c.lineWidth=.8;
  poly(c,[[-length*.6,0],[-length*.16,-width],[length*.6,0],[-length*.16,width]],violet?'#7357ba':'#53afcf',violet?'#cdb7ff':'#b9f7ff');
  poly(c,[[-length*.16,-width],[length*.6,0],[-length*.12,0]],violet?'#f6e6ff':'#efffff');
  poly(c,[[-length*.6,0],[-length*.12,0],[-length*.16,width]],violet?'#b998ea':'#87e0f4');
  stroke(c,[[-length*.48,0],[length*.48,0]],'#fff',.7,.8);c.restore();
 }
 function snow(c,x,y,r,alpha=1){c.save();c.translate(x,y);c.globalAlpha*=alpha;c.strokeStyle='#d2faff';c.lineWidth=.8;c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6,cs=Math.cos(a),sn=Math.sin(a);c.moveTo(0,0);c.lineTo(cs*r,sn*r);c.moveTo(cs*r*.6-sn*r*.22,sn*r*.6+cs*r*.22);c.lineTo(cs*r*.48,sn*r*.48);c.lineTo(cs*r*.6+sn*r*.22,sn*r*.6-cs*r*.22);}c.stroke();c.restore();}
 // Bolt endpoints always match the real hit / path; forks are purely decorative.
 function bolt(c,x,y,x2,y2,t,color='#85baff',strength=1,forks=true){
  const dx=x2-x,dy=y2-y,len=Math.hypot(dx,dy)||1,n=Math.max(4,Math.min(15,Math.ceil(len/10))),phase=Math.floor(motion(t)*18);
  const pts=[[x,y]];for(let i=1;i<n;i++){const k=i/n,j=Math.sin(i*13.7+phase*2.3+x*.07)*Math.min(10,len*.15)*Math.sin(k*Math.PI);pts.push([x+dx*k-dy/len*j,y+dy*k+dx/len*j]);}pts.push([x2,y2]);
  stroke(c,pts,color,full()?8*strength:5*strength,.17);stroke(c,pts,color,3*strength,.95);stroke(c,pts,'#f3ffff',1.1*strength);
  if(forks)for(let i=2;i<n-1;i+=full()?4:7){const [px,py]=pts[i],side=i%2?1:-1,reach=Math.min(23,len*.25);const bx=px-dy/len*reach*side-dx/len*12,by=py+dx/len*reach*side-dy/len*12;
   stroke(c,[[px,py],[(px+bx)/2+dx/len*5,(py+by)/2+dy/len*5],[bx,by]],color,1.2*strength,.7);
  }
 }
 function ribbon(c,b,t,color,width){
  if(!b.trail?.length)return;
  const points=b.trail.concat({x:b.x,y:b.y});
  for(let i=1;i<points.length;i++)stroke(c,[[points[i-1].x,points[i-1].y],[points[i].x,points[i].y]],color,width*i/points.length,.08+.2*i/points.length);
 }
 function projectile(c,b,t){
  const id=b.type,color=colors[id],age=b.age||0,a=Math.atan2(b.vy,b.vx),r=b.r*(b.generation?1.4:1.85+(b.level||1)*.12),tm=motion(t+age*.2);
  c.save();c.lineCap='round';
  if(full())ribbon(c,b,t,color,id==='frost'?5:id==='echo'?9:3);
  if(id==='spark'||id==='tempest'){
   // A travelling forked discharge, without a circular icon at its nose.
   const tail=b.trail?.[Math.max(0,b.trail.length-(full()?7:4))],len=Math.min(id==='tempest'?100:78,16+age*Math.hypot(b.vx,b.vy));
   const x=tail?.x??b.x-Math.cos(a)*len,y=tail?.y??b.y-Math.sin(a)*len;
   // Segment real trajectory at banks instead of cutting across the corner.
   const pts=b.trail?.length>1?b.trail.concat({x:b.x,y:b.y}):[{x,y},{x:b.x,y:b.y}];
   for(let i=1;i<pts.length;i++){c.save();c.globalAlpha*=.35+.65*i/(pts.length-1);bolt(c,pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,tm+i,color,b.generation?.65:1,true);c.restore();}
   glow(c,b.x,b.y,r*2.4,color,.55);
   stroke(c,[[b.x-Math.cos(a)*12,b.y-Math.sin(a)*12],[b.x+Math.cos(a)*5,b.y+Math.sin(a)*5]],'#efffff',2);
   if(id==='tempest'){bolt(c,b.x-Math.cos(a)*32-Math.sin(a)*11,b.y-Math.sin(a)*32+Math.cos(a)*11,b.x,b.y,tm+3,'#b8c0ff',.7);}
   c.restore();return;
  }
  c.translate(b.x,b.y);c.rotate(a);
  if(id==='ember'||id==='steam'){
   glow(c,0,0,r*3.2,'#ff792b',.5);flame(c,0,0,r,tm);
   if(full())for(let i=0;i<4;i++){const k=(tm*1.8+i*.24)%1;circle(c,-18-k*58,Math.sin(i*7+tm)*9*k,(1-k)*1.7,'#ffb654');}
   if(id==='steam'){crystal(c,-10,-r*.9,22,4,-.22);crystal(c,-8,r*.9,19,4,.22);glow(c,-23,0,24,'#9eefff',.2);}
  }else if(id==='frost'){
   glow(c,-8,0,31,'#71cde8',.35);crystal(c,0,0,r*3.3,r*.6);crystal(c,-r*.9,-r*.58,r*1.8,r*.28,-.25);crystal(c,-r*.9,r*.58,r*1.8,r*.28,.25);
   if(full())for(let i=0;i<4;i++){const k=(tm*.8+i*.27)%1;glow(c,-20-k*47,Math.sin(i*3+tm)*9,9+k*6,'#a4eaff',.15*(1-k));snow(c,-22-k*45,Math.cos(i*3)*11,2.5,(1-k)*.75);}
  }else if(id==='thorn'||id==='plague'){
   glow(c,-4,0,r*2.2,'#91d95e',.35);
   for(let j=0;j<2;j++){c.strokeStyle=j?'#d8f291':'#4e8c49';c.lineWidth=j?1:3;c.beginPath();c.moveTo(5,0);c.bezierCurveTo(-17,-14,-28,14,-55,Math.sin(tm*7)*7);c.stroke();}
   poly(c,[[r*1.5,0],[-r*.5,-r*.62],[-r*.15,0],[-r*.6,r*.58]],'#aee07d','#effbb7');
   for(let i=0;i<3;i++){const x=-11-i*11;poly(c,[[x,0],[x-8,-9+i],[x-4,2]],'#91c368');}
   if(id==='plague'){c.save();c.rotate(tm*.8);for(let i=0;i<5;i++){c.rotate(TAU/5);c.fillStyle='#dd85b6';c.beginPath();c.ellipse(0,-r*.65,r*.35,r*.8,.25,0,TAU);c.fill();}circle(c,0,0,r*.4,'#eaffb8');c.restore();}
  }else if(id==='leech'){
   glow(c,0,0,r*2.6,color,.4);c.fillStyle='#a62f60';c.beginPath();c.moveTo(r,0);c.bezierCurveTo(r,-r*1.4,-r*1.5,-r,-r*4,0);c.bezierCurveTo(-r*1.2,-r*.2,-r,r*1.7,r,0);c.fill();
   c.fillStyle='#fa7190';c.beginPath();c.ellipse(0,0,r,r*.7,0,0,TAU);c.fill();stroke(c,[[-r*.5,-r*.3],[r*.4,-r*.2]],'#ffe4e6',2);
   for(let i=1;i<4;i++){const p=(tm*1.3+i*.28)%1;circle(c,-r*2-p*32,Math.sin(i*2+tm)*7,2.5*(1-p),'#ff97ad');}
  }else if(id==='echo'){
   glow(c,0,0,r*2.7,color,.42);for(let i=3;i>=0;i--){c.save();c.translate(-i*13,Math.sin(tm*6+i)*3);c.globalAlpha*=1-i*.22;crystal(c,0,0,r*2.6,r*.6,0,1,true);c.restore();}
   c.strokeStyle='#c9a9ff';c.lineWidth=1.8;c.beginPath();c.ellipse(-6,0,r*.55,r*1.4,Math.sin(tm)*.3,-1,4);c.stroke();stroke(c,[[r*.9,0],[-r*.7,0]],'#f2daff',2);
  }
  c.restore();
 }
 function frostGround(c,e,t){
  if(!(e.slow>0))return;const fade=Math.min(1,e.slow*2),r=e.r*1.18,y=e.y+e.r*.9;
  c.save();c.globalAlpha*=fade*.75;c.translate(e.x,y);c.scale(1,.38);
  glow(c,0,0,r*1.45,'#7acde4',.38);poly(c,[[r,0],[r*.55,r*.7],[-r*.4,r],[-r,-r*.1],[-r*.3,-r*.8],[r*.65,-r*.7]],'#a5edff18','#88d4e67a');
  for(let i=0;i<6;i++){const a=i*TAU/6,dx=Math.cos(a),dy=Math.sin(a);stroke(c,[[0,0],[dx*r*.45-dy*5,dy*r*.45+dx*5],[dx*r,dy*r]],'#b2edfa',1,.65);}
  c.restore();
 }
 function status(c,e,t){
  const r=e.r,foot=e.y+r*.9,tm=motion(t)+(e.seed||0);
  if(e.slow>0){
   const fade=Math.min(1,e.slow*2);c.save();c.globalAlpha*=fade;
   // Faceted translucent ice grips the feet; the tinted sprite remains readable inside.
   const w=r*.83,h=r*1.48,x=e.x,y=foot;
   poly(c,[[x-w,y-2],[x-w*.87,y-h*.8],[x-w*.2,y-h],[x+w*.78,y-h*.83],[x+w,y-2],[x,y+5]],'#a4eaff26','#b5f0ff80');
   poly(c,[[x-w*.87,y-h*.8],[x-w*.2,y-h],[x+w*.25,y-4],[x-w,y-2]],'#dbfaff24');
   stroke(c,[[x-w*.2,y-h],[x+w*.2,y-h*.5],[x-w*.15,y-h*.3],[x+w*.1,y]],'#eaffff',1,.7);
   for(let i=0;i<4;i++)crystal(c,x+(i-1.5)*r*.43,y-3,13+(i%2)*10,3.5,-Math.PI/2+(i-1.5)*.13,.85);
   if(full())for(let i=0;i<3;i++){const p=(tm*.35+i*.34)%1;snow(c,x+Math.sin(i*5)*r,y-r*.3-p*r*1.6,2.5,fade*(1-p)*.7);}
   c.restore();
  }
  if(e.burn>0){const fade=Math.min(1,e.burn),n=full()?4:2;for(let i=0;i<n;i++){const x=e.x+Math.sin(i*7+1)*r*.65,y=foot-r*.3+(i%2)*5;flame(c,x,y,5+r*.075,tm+i,Math.PI/2,.68*fade);}glow(c,e.x,foot-r*.4,r*1.4,'#ff7636',.18*fade);}
  if(e.poison>0){c.save();c.globalAlpha*=Math.min(1,e.poison)*.65;for(let i=0;i<(full()?5:3);i++){const p=(tm*.45+i*.23)%1,x=e.x+Math.sin(i*5)*r*.8,y=foot-p*r*1.8;circle(c,x,y,2+p*2,null,'#b3e582');if(i%2===0)circle(c,x-.6,y-.7,.7,'#e4ffbc');}c.restore();}
 }
 function impact(c,f,p,t){
  const id=f.core||'ember',color=colors[id]||f.color,r=(id==='steam'?57:42)*(1-Math.pow(1-p,3)),fade=1-p,n=full()?9:5;
  c.save();c.translate(f.x,f.y);c.globalAlpha*=fade;
  if(p<.3){glow(c,0,0,35*(1-p),color,.7);circle(c,0,0,Math.max(.1,8*(1-p/.3)),'#fff8dc');}
  if(id==='ember'||id==='steam'){
   if(p<.65){glow(c,0,0,22+r*.55,'#fc631f',.5*fade);c.lineWidth=2.5*fade;circle(c,0,0,r*.78,null,'#ffb552');}
   for(let i=0;i<n;i++){const a=i*TAU/n+f.x*.1,d=r*(.65+i%3*.13);flame(c,Math.cos(a)*d,Math.sin(a)*d,Math.max(.2,8*fade),t+i,a,.8);}
  }else if(id==='frost'){
   glow(c,0,0,40,'#9ce9ff',.25);c.lineWidth=1.2;circle(c,0,0,r*.8,null,'#d0faff');
   for(let i=0;i<n;i++){const a=i*TAU/n,d=r*(.65+i%3*.13);crystal(c,Math.cos(a)*d,Math.sin(a)*d+p*p*10,(17+i%3*4)*fade,4*fade,a);}
   if(full())for(let i=0;i<4;i++){const a=i*1.7;snow(c,Math.cos(a)*r*.9,Math.sin(a)*r*.9,4*fade);}
  }else if(id==='spark'||id==='tempest'){
   for(let i=0;i<(full()?5:3);i++){const a=i*TAU/(full()?5:3)+f.x*.03;bolt(c,0,0,Math.cos(a)*r,Math.sin(a)*r,t+i,color,.8,true);}
  }else if(id==='thorn'||id==='plague'){
   glow(c,0,0,r,'#8ccc59',.2);for(let i=0;i<n;i++){const a=i*TAU/n;c.save();c.rotate(a);stroke(c,[[0,0],[r*.4,Math.sin(i)*8],[r,0]],'#a7d66f',2*fade);poly(c,[[r,0],[r-10*fade,-5*fade],[r-7*fade,4*fade]],i%2?color:'#d4f28f');c.restore();}
  }else if(id==='leech'){
   for(let i=0;i<3;i++){c.save();c.rotate(i*TAU/3+p);c.lineWidth=4*fade;c.strokeStyle=i?'#e85985':'#ffbdd0';c.beginPath();c.arc(0,0,r*(.5+i*.16),-.7,1);c.stroke();c.restore();}
   for(let i=0;i<n;i++){const a=i*TAU/n;circle(c,Math.cos(a)*r,Math.sin(a)*r+p*p*15,3*fade,color);}
  }else if(id==='echo'){
   c.save();c.rotate(p*.8);c.lineWidth=2*fade;for(let i=0;i<3;i++){c.strokeStyle=i%2?'#eee4ff':'#b18de9';c.beginPath();c.ellipse(0,0,r*(.65+i*.2),r*.46,i*TAU/3,0,TAU);c.stroke();}c.restore();
   for(let i=0;i<6;i++){const a=i*TAU/6;crystal(c,Math.cos(a)*r,Math.sin(a)*r,12*fade,4*fade,a,1,true);}
  }
  c.restore();
 }
 function muzzle(c,f,p,t){const id=f.core||'ember',a=Math.atan2(f.y2,f.x2);c.save();c.translate(f.x,f.y);c.rotate(a);c.globalAlpha*=1-p;
  if(id==='spark'||id==='tempest')bolt(c,-5,-7,24,0,t,colors[id],.8);
  else if(id==='frost'){for(let i=-1;i<=1;i++)crystal(c,8+i*3,i*5,17,3,i*.25);glow(c,0,0,21,colors[id],.5);}
  else if(id==='ember'||id==='steam')flame(c,10,0,8*(1-p),t,Math.PI);
  else{glow(c,8,0,25,colors[id],.55);stroke(c,[[0,-6],[19,0],[0,6]],colors[id],2);}
  c.restore();
 }
 function burst(c,f,p,t){const fade=1-p,ease=1-Math.pow(1-p,2),r=4+ease*27*f.size;
  c.save();c.globalAlpha*=fade;
  if(f.type==='nova'){
   glow(c,f.x,f.y,56*fade,'#ffb56a',.65);c.lineWidth=5*fade;circle(c,f.x,f.y,r,null,'#feb26e');c.lineWidth=2;circle(c,f.x,f.y,r*.83,null,'#bcefff');
   for(let i=0;i<(full()?12:6);i++){const a=i*TAU/(full()?12:6),x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;crystal(c,x,y,18*fade,4*fade,a);if(full())glow(c,x,y,12+14*p,'#c7f1f5',.28*fade);}
   if(p<.6)for(let i=0;i<6;i++){const a=i*TAU/6;flame(c,f.x+Math.cos(a)*r*.6,f.y+Math.sin(a)*r*.6,10*fade,t+i,a);}
  }else{
   glow(c,f.x,f.y,r,'#97cf77',.24);for(let i=0;i<6;i++){c.save();c.translate(f.x,f.y);c.rotate(i*TAU/6);c.lineWidth=2*fade;c.strokeStyle='#b3d984';c.fillStyle='#cc6fa638';c.beginPath();c.moveTo(0,0);c.bezierCurveTo(r*.3,-r*.5,r*.8,-r*.4,r,0);c.bezierCurveTo(r*.6,r*.3,r*.3,r*.45,0,0);c.fill();c.stroke();poly(c,[[r*.7,-r*.15],[r*.67,-r*.4],[r*.55,-r*.22]],'#cbe699');circle(c,r*.8,0,3*fade,'#ffbcdb');c.restore();}circle(c,f.x,f.y,r*.25,'#d9f0a64a','#ddf7b0');
  }c.restore();
 }
 function siphon(c,f,p){c.save();c.globalAlpha*=1-p;const point=k=>[f.x+(f.x2-f.x)*k+Math.sin(k*Math.PI)*60,f.y+(f.y2-f.y)*k];
  const pts=Array.from({length:8},(_,i)=>point(Math.max(0,p-i*.016))).reverse();stroke(c,pts,'#a63764',6,.35);stroke(c,pts,'#ff8aaa',2);const [x,y]=point(p);glow(c,x,y,13,'#ff8aaa',.7);circle(c,x,y,2.5,'#fff2e7');c.restore();
 }
 return {projectile,impact,bolt,frostGround,status,muzzle,burst,siphon};
}
