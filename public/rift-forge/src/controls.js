/* Independent pointer owners let the two thumbs move and aim at the same time. */
function makeRiftControls({canvas,rail,left,right,enabled,onAim,onDirection,onActivity}){
 const held=new Map(),owners=new Map();let railId=null,aimId=null,analog=0;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const capture=(el,id)=>{owners.set(id,el);try{el.setPointerCapture(id);}catch{}};
 const direction=n=>{if(n)onDirection(Math.sign(n));};
 const paint=n=>{rail.style.setProperty('--thumb-x',n+'px');rail.classList.toggle('active',railId!==null);};
 function drag(e){const r=rail.getBoundingClientRect(),range=Math.max(12,(r.width-48)/2),dx=clamp(e.clientX-r.left-r.width/2,-range,range);
  analog=Math.abs(dx)<=6?0:Math.sign(dx)*(Math.abs(dx)-6)/(range-6);paint(dx);direction(analog);
 }
 function release(e){owners.delete(e.pointerId);held.delete(e.pointerId);if(e.pointerId===railId){railId=null;analog=0;paint(0);}if(e.pointerId===aimId)aimId=null;direction(move());}
 function move(){return railId!==null?analog:[...held.values()].at(-1)||0;}
 for(const [el,d] of [[left,-1],[right,1]]){
  el.addEventListener('pointerdown',e=>{if(!enabled())return;e.preventDefault();held.set(e.pointerId,d);capture(el,e.pointerId);direction(d);onActivity();});
  el.addEventListener('lostpointercapture',release);
 }
 rail.addEventListener('pointerdown',e=>{if(!enabled()||railId!==null)return;e.preventDefault();railId=e.pointerId;capture(rail,e.pointerId);drag(e);onActivity();});
 rail.addEventListener('lostpointercapture',release);
 canvas.addEventListener('pointerdown',e=>{if(!enabled()||aimId!==null)return;if(!onAim(e.clientX,e.clientY,true))return;e.preventDefault();aimId=e.pointerId;capture(canvas,e.pointerId);onActivity();});
 canvas.addEventListener('lostpointercapture',release);
 // Keep active gestures tracked if native pointer capture is unavailable.
 document.addEventListener('pointermove',e=>{if(!enabled())return;if(e.pointerId===railId){e.preventDefault();drag(e);}else if(e.pointerId===aimId){e.preventDefault();onAim(e.clientX,e.clientY,false);}else if(aimId===null&&e.target===canvas&&e.pointerType==='mouse'&&!e.buttons)onAim(e.clientX,e.clientY,false,true);},{passive:false});
 for(const event of ['pointerup','pointercancel'])document.addEventListener(event,release);
 function reset(){const old=[...owners];owners.clear();held.clear();railId=aimId=null;analog=0;paint(0);for(const [id,el] of old)try{if(el.hasPointerCapture(id))el.releasePointerCapture(id);}catch{}}
 return {move,reset};
}
