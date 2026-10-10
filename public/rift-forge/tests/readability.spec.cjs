const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

async function boot(page){
 await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.frostScenery)).toBe('ready');
 await page.locator('#start').click();await page.evaluate(()=>window.__RIFT.freeze());
}

test('warning edges match the full player damage radius without changing simulation',async({page})=>{
 await boot(page);
 const result=await page.evaluate(()=>{
  const q=window.__RIFT,s=q.state,R=q.RF,c=document.querySelector('#canvas').getContext('2d');
  Object.assign(s,{enemies:[],balls:[],bullets:[],fx:[],texts:[],hazards:[{x:400,width:94,kind:'ice',life:.8,max:1.4,damage:24}]});
  const before=JSON.stringify(s),rects=[],original=c.strokeRect;
  c.strokeRect=function(...args){rects.push(args);return original.apply(this,args);};
  try{q.renderer.draw(s,s.time);}finally{c.strokeRect=original;}
  const warning=rects.find(r=>r[1]===R.TOP&&r[3]===456);
  return {warning,expected:[400-47-R.HAZARD_PADDING,R.TOP,94+2*R.HAZARD_PADDING,456],unchanged:before===JSON.stringify(s)};
 });
 expect(result.warning).toEqual(result.expected);expect(result.unchanged).toBe(true);
});

test('lite mode budgets cosmetic bursts while keeping skills and ground strikes',async({page})=>{
 await boot(page);
 const result=await page.evaluate(()=>{
  const q=window.__RIFT,s=q.state;
  s.fx=Array.from({length:90},(_,i)=>({type:'impact',core:'frost',level:3,heroLevel:10,x:150+i%10*70,y:150+Math.floor(i/10)*35,color:'#92bdff',size:1,life:.3,max:.48}));
  s.fx.unshift({type:'hazard',x:480,y:520,color:'#a9edff',size:94,life:.3,max:.4,core:'ice'}, {type:'pulse',character:'warden',x:480,y:500,color:'#a6eeeb',life:.4,max:.75,size:12});
  const before=JSON.stringify(s);
  q.renderer.setQuality('full');q.renderer.draw(s,s.time);const full=q.renderer.metrics.effectsDrawn;
  q.renderer.setQuality('lite');q.renderer.draw(s,s.time);
  return {full,lite:q.renderer.metrics.effectsDrawn,skipped:q.renderer.metrics.effectsSkipped,unchanged:before===JSON.stringify(s)};
 });
 expect(result).toEqual({full:92,lite:38,skipped:54,unchanged:true});
});

test('legacy enemy lightning is never discarded by the lite cosmetic budget',async({page})=>{
 await boot(page);
 const result=await page.evaluate(()=>{
  const q=window.__RIFT,s=q.state;
  s.fx=[{type:'arc',x:480,y:82,x2:480,y2:540,color:'#ff767b',core:'',size:4,life:.3,max:.4},...Array.from({length:90},()=>({type:'muzzle',x:480,y:493,x2:0,y2:-1,color:'#8be3ef',core:'frost',level:1,heroLevel:1,size:1,life:.1,max:.18}))];
  q.renderer.setQuality('lite');q.renderer.draw(s,s.time);
  return {drawn:q.renderer.metrics.effectsDrawn,skipped:q.renderer.metrics.effectsSkipped};
 });expect(result).toEqual({drawn:37,skipped:54});
});

for(const [name,width,height] of [['desktop',1440,900],['phone-landscape',844,390],['phone-portrait',390,844]]){
 test(name+' warden, frost ring and named warnings remain readable',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await boot(page);
  await page.evaluate(()=>{
   const q=window.__RIFT,s=q.state,R=q.RF;
   Object.assign(s,{character:'warden',chapter:2,phase:'play',level:10,wave:7,time:100,waveTime:0,xp:-1000,shotCd:99,nextSpawn:99,x:370,charge:100,hp:100,events:[],enemies:[],balls:[],bullets:[],fx:[],texts:[],ghosts:[],encounter:null});
   R.beginBoss(s,'queen');s.enemies[0].hp=s.enemies[0].maxHp*.45;s.enemies[0].shot=0;R.step(s,1/120);s.events=[];
   R.spawn(s,'iceguard',305,360);R.spawn(s,'icehound',580,375);R.spawn(s,'icewitch',690,290);
   R.pulse(s);s.fx.forEach(f=>f.life=f.max*.7);s.hazards.forEach(h=>h.life=.8);s.loadout=[{id:'frost',level:2},{id:'thorn',level:2},{id:'leech',level:2}];
  });
  await expect(page.locator('#toast')).not.toHaveClass(/on/);await expect(page.locator('#pulse')).toContainText('霜環');
  const out=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(out,{recursive:true});
  for(const quality of ['full','lite']){
   await page.evaluate(quality=>{const q=window.__RIFT;q.renderer.setQuality(quality);q.renderer.draw(q.state,q.state.time);},quality);
   await page.screenshot({path:`${out}/warden-${name}-${quality}.png`});
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  expect(await page.evaluate(()=>window.__RIFT.renderer.metrics.hero.sprite)).toBe('hero-warden');expect(errors).toEqual([]);
 });
}
