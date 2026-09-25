const {test,expect}=require('@playwright/test');
const fs=require('node:fs');

async function boot(page){await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.scenery)).toBe('ready');}
async function scene(page,ids){await page.evaluate(ids=>{
 const q=window.__RIFT,R=q.RF;q.start(false);q.freeze();const s=q.state;
 Object.assign(s,{time:20,wave:2,waveTime:0,hp:85,x:480,fireAnim:0,shotCd:99,nextSpawn:99,charge:100,enemies:[],balls:[],bullets:[],fx:[],ghosts:[],texts:[],events:[],hazards:[]});
 s.auto=false;s.aimX=480;s.aimY=210;s.loadout=ids.slice(0,4).map(id=>({id,level:3}));
 ids.forEach((id,i)=>{
  const x=ids.length===1?480:220+i*260;
  R.spawn(s,'guard',x,218);const e=s.enemies.at(-1);e.hp=e.maxHp=500;e.speed=0;e.shot=99;
  // Actual travel samples, impact triggers, and status timers from the engine.
  R.ball(s,id,3,x,390,0,-470,R.TYPES[id].power);const b=s.balls.at(-1);
  b.age=.3;b.trail=Array.from({length:7},(_,j)=>({x,y:470-j*12}));
  R.impact(s,{...b,x:e.x,y:e.y+22},e);e.flash=.015;
  s.fx.forEach(f=>{f.life=f.max*.72;});
 });q.renderer.draw(s,s.time);
},ids);await expect(page.locator('#toast')).not.toHaveClass(/on/);await page.waitForTimeout(240);}

for(const [name,width,height] of [['desktop',1440,900],['phone',844,390]]){
 test(name+' elemental combat art in full and lite quality',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await boot(page);
  const out=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(out,{recursive:true});
  for(const [group,ids] of [['elements',['ember','spark','frost']],['arcane',['thorn','leech','echo']],['evolved',['steam','tempest','plague']]]){
   await scene(page,ids);
   for(const quality of ['full','lite']){
    await page.evaluate(quality=>{const q=window.__RIFT;q.renderer.setQuality(quality);q.renderer.draw(q.state,q.state.time);},quality);
    await page.screenshot({path:`${out}/v07-${name}-${group}-${quality}.png`});
   }
  }expect(errors).toEqual([]);
 });
}

test('drawing and quality toggles preserve combat, RNG and collision state',async({page})=>{
 await boot(page);await scene(page,['ember','spark','frost']);
 const result=await page.evaluate(()=>{
  const q=window.__RIFT,s=q.state;s.events=[];
  const before=JSON.stringify(s);
  for(const quality of ['full','lite']){q.renderer.setQuality(quality);for(let i=0;i<12;i++)q.renderer.draw(s,s.time+i/60);}
  return {same:JSON.stringify(s)===before,burn:s.enemies[0].burn,slow:s.enemies[2].slow};
 });expect(result).toEqual({same:true,burn:3,slow:2});
 // Status disappearance is driven by gameplay time, including restoring a save.
 const expired=await page.evaluate(()=>{const q=window.__RIFT,s=q.RF.restore(q.RF.snapshot(q.state));s.balls=[];s.fx=[];s.shotCd=99;s.nextSpawn=99;for(let i=0;i<400;i++)q.RF.step(s,1/120,{});q.renderer.draw(s,s.time);return s.enemies.map(e=>({burn:e.burn,slow:e.slow}));});
 expect(expired.every(e=>e.burn<=0&&e.slow<=0)).toBe(true);
});

test('reduced motion retains elemental forms and banked lightning uses real trails',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await boot(page);await scene(page,['spark','frost','ember']);
 const data=await page.evaluate(()=>{const q=window.__RIFT,R=q.RF,s=q.state;
  s.balls=[];R.ball(s,'spark',3,R.RIGHT-9,340,380,-210,10);
  for(let i=0;i<25;i++)R.step(s,1/120,{});
  const b=s.balls[0],result={banks:b.banks,vx:b.vx,trail:b.trail.map(p=>({...p}))};q.renderer.draw(s,s.time);return result;
 });expect(data.banks).toBe(1);expect(data.vx).toBeLessThan(0);expect(data.trail.length).toBeLessThanOrEqual(7);
 expect(data.trail.every(p=>p.x>=112&&p.x<=848)).toBe(true);
 const out=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(out,{recursive:true});await page.screenshot({path:`${out}/v07-reduced-motion-bank.png`});
});

test('new elemental script failure provides the startup recovery button',async({page})=>{
 await page.route('**/src/elements.js*',r=>r.abort());await page.goto('?qa=1');
 await expect(page.locator('#boot-status')).toHaveAttribute('data-failed','true');await expect(page.locator('#boot-retry')).toBeVisible();
 await page.unroute('**/src/elements.js*');await page.locator('#boot-retry').click();await expect(page.locator('#start')).toBeEnabled();
});

test('record elemental travel, hit and thaw with real simulation',async({browser},info)=>{
 const dir=`test-results/rift-forge/${info.project.name}/element-motion`;fs.mkdirSync(dir,{recursive:true});
 const context=await browser.newContext({viewport:{width:960,height:640},recordVideo:{dir,size:{width:960,height:640}}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4187/rift-forge/?qa=1');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>window.__RIFT.freeze());await expect(page.locator('#toast')).not.toHaveClass(/on/);await page.waitForTimeout(240);
 for(const id of ['ember','spark','frost','thorn','leech','echo','steam','tempest','plague']){
  await page.evaluate(id=>{
   const q=window.__RIFT,R=q.RF,s=q.state;Object.assign(s,{time:30,waveTime:0,phase:'play',shotCd:99,nextSpawn:99,auto:false,aimX:480,aimY:210,enemies:[],balls:[],fx:[],texts:[],events:[],bullets:[],hazards:[]});s.loadout=[{id,level:3}];s.lastCore=id;s.fireAnim=.12;
   for(const x of [390,480,570]){R.spawn(s,'guard',x,215);const e=s.enemies.at(-1);e.speed=0;e.hp=e.maxHp=1000;}
   R.ball(s,id,3,480,488,0,-470,R.TYPES[id].power);q.freeze(false);
  },id);await page.waitForTimeout(id==='frost'?2600:1350);await page.evaluate(()=>window.__RIFT.freeze());
 }
 expect(errors).toEqual([]);await context.close();
});
