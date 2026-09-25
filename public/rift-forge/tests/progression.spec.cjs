const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
async function boot(page){await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.evaluate(()=>window.__RIFT.freeze());}
function output(info){const dir=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(dir,{recursive:true});return dir;}

for(const [name,width,height] of [['portrait',390,844],['landscape',844,390]]){
 test(name+' real level-ups change equipped art and keep upgrade choices usable',async({page},info)=>{
  await page.setViewportSize({width,height});await boot(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [level,tier,sprite] of [[5,2,'hero-veteran'],[10,3,'hero-ascendant'],[12,4,'hero-ascendant']]){
   await page.evaluate(level=>{const q=window.__RIFT,s=q.state;Object.assign(s,{phase:'play',level:level-1,xp:s.xpNeed,shotCd:99,nextSpawn:99,enemies:[],balls:[],fx:[],bullets:[],hazards:[],events:[]});q.RF.step(s,1/120,{});q.phaseView();},level);
   await expect(page.locator('.growth-strip')).toHaveAttribute('data-tier',String(tier));await expect(page.locator('.growth-strip')).toContainText(`Lv.${level}`);await expect(page.locator('.growth-strip')).toContainText('外觀覺醒');
   expect(await page.locator('.growth-strip img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await expect(page.locator('#toast')).not.toHaveClass(/on/);await page.screenshot({path:`${output(info)}/v08-${name}-upgrade-${level}.png`});
   const before=await page.evaluate(()=>window.__RIFT.state.time);await page.locator('#offer-2').click();await expect(page.locator('#layer')).toBeHidden();
   const result=await page.evaluate(()=>{const q=window.__RIFT;q.renderer.draw(q.state,q.state.time);q.persist();return {hero:q.renderer.metrics.hero,time:q.state.time,phase:q.state.phase};});
   expect(result).toEqual({hero:{level,tier,sprite},time:before,phase:'play'});
   await page.screenshot({path:`${output(info)}/v08-${name}-hero-${level}.png`});
  }expect(errors).toEqual([]);
 });
}

test('all nine cores show rank progression with level equipment in both quality modes',async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});await boot(page);await expect(page.locator('#toast')).not.toHaveClass(/on/);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [group,ids] of [['elements',['ember','spark','frost']],['arcane',['thorn','leech','echo']],['evolved',['steam','tempest','plague']]])for(const [rank,level] of [[1,1],[2,5],[3,12]])for(const quality of ['full','lite']){
  const result=await page.evaluate(({ids,rank,level,quality})=>{
   const q=window.__RIFT,R=q.RF,s=q.state;Object.assign(s,{phase:'play',level,time:24,waveTime:0,shotCd:99,nextSpawn:99,auto:false,aimX:480,aimY:210,charge:100,x:480,fireAnim:.05,lastCore:ids[0],enemies:[],balls:[],bullets:[],fx:[],ghosts:[],events:[],hazards:[],texts:[]});s.loadout=ids.map(id=>({id,level:rank}));
   ids.forEach((id,i)=>{const x=230+i*250;R.spawn(s,'guard',x,212);const e=s.enemies.at(-1);e.hp=e.maxHp=1000;e.speed=0;e.shot=99;R.ball(s,id,rank,x,372,0,-470,10);const b=s.balls.at(-1);b.age=.3;b.trail=Array.from({length:7},(_,j)=>({x,y:455-j*11}));R.impact(s,{...b,x,y:235},e);e.flash=0;});s.fx.forEach(f=>f.life=f.max*.65);
   q.renderer.setQuality(quality);const before=JSON.stringify(s);q.renderer.draw(s,s.time);return {same:before===JSON.stringify(s),hero:q.renderer.metrics.hero};
  },{ids,rank,level,quality});expect(result.same).toBe(true);expect(result.hero.level).toBe(level);
  await page.screenshot({path:`${output(info)}/v08-${group}-rank-${rank}-${quality}.png`});
 }expect(errors).toEqual([]);
});

test('legacy saves resume awakened equipment and new atlas failures can be retried',async({page})=>{
 await page.route('**/assets/sprites/hero-ascendant.webp*',r=>r.abort());await page.goto('?qa=1');
 await expect(page.locator('#retry-assets')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();
 await page.unroute('**/assets/sprites/hero-ascendant.webp*');await page.locator('#retry-assets').click();await expect(page.locator('#start')).toBeEnabled();
 await page.evaluate(()=>{const q=window.__RIFT,s=q.RF.create({},42);s.level=12;s.hp=73;s.coins=81;s.nextSpawn=999;s.shotCd=999;q.RF.ball(s,'frost',3,480,300,0,-470,40);const old=q.RF.snapshot(s);delete old.balls[0].heroLevel;localStorage.setItem('rift-forge.v1.run',JSON.stringify(old));});
 await page.reload();await expect(page.locator('#resume')).toBeEnabled();await page.locator('#resume').click();
 const result=await page.evaluate(()=>{const q=window.__RIFT;q.freeze();q.renderer.draw(q.state,q.state.time);return {level:q.state.level,hp:q.state.hp,coins:q.state.coins,hero:q.renderer.metrics.hero,balls:q.state.balls.map(b=>b.heroLevel),loaded:q.renderer.status.loaded};});
 expect(result).toEqual({level:12,hp:73,coins:81,hero:{level:12,tier:4,sprite:'hero-ascendant'},balls:[12],loaded:9});
});
