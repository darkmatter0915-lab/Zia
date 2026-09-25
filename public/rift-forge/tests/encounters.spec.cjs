const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
let out;
test.beforeEach(({},info)=>{out=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(out,{recursive:true});});
async function boot(page){await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.scenery)).toBe('ready');await page.evaluate(()=>{const q=window.__RIFT;q.start(false);q.freeze();q.state.enemies=[];q.state.xp=-10000;q.state.nextSpawn=10000;});}
async function bossScene(page,id){await page.evaluate(id=>{
 const q=window.__RIFT,R=q.RF,s=q.state;s.phase='play';s.encounter=null;s.wave=R.BOSSES[id].wave;s.time=92;s.x=460;s.hp=80;s.bossesDefeated=[];s.fx=[];s.ghosts=[];s.texts=[];s.shotCd=100;R.beginBoss(s,id);
 const boss=s.enemies[0];boss.hp=boss.maxHp*.45;boss.shot=0;R.step(s,1/120);s.hazards.forEach(h=>h.life=.65);s.events=[];s.fireAnim=.12;
 s.loadout=[{id:'steam',level:2},{id:'tempest',level:2},{id:'plague',level:2}];
 for(const [i,type] of ['ember','frost','spark','thorn','leech','echo','steam','tempest','plague'].entries())R.ball(s,type,2,240+i%5*108,330+Math.floor(i/5)*83,90,-420,26);
 R.spawn(s,'guard',300,300);R.spawn(s,'runner',650,335);R.spawn(s,'seer',590,265);
 for(const [i,type] of ['steam','tempest','plague'].entries()){const e=s.enemies[i+1];e.hp=e.maxHp=999;R.impact(s,{type,level:2,power:26,banks:0,generation:1,x:e.x,y:e.y,vx:30,vy:-420},e);}
 for(const f of s.fx)f.life=f.max*.6;for(const e of s.enemies)e.flash=.02;s.texts=[];
 },id);await expect(page.locator('#wave')).toHaveText({maw:'熔獄巨顎',oracle:'裂星司祭',bell:'熔鐘守衛'}[id]);await expect(page.locator('#toast')).not.toHaveClass(/on/);}
for(const [name,width,height] of [['desktop',1440,900],['mobile-landscape',926,428]]){
 test(name+' three unique bosses and layered attacks render with readable hazards',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await boot(page);
  for(const id of ['maw','oracle','bell']){await bossScene(page,id);await page.screenshot({path:`${out}/v06-${name}-${id}.png`});expect(await page.evaluate(()=>window.__RIFT.state.hazards.length)).toBeGreaterThan(0);}
  await page.locator('#pause').click();await page.locator('#quality').click();await page.locator('#continue').click();await page.screenshot({path:`${out}/v06-${name}-lite-hazards.png`});expect(await page.evaluate(()=>window.__RIFT.renderer.metrics.quality)).toBe('lite');expect(errors).toEqual([]);
 });
}
for(const [name,width,height] of [['portrait',390,844],['landscape',844,390]]){
 test(name+' all five events are selectable and fit the mobile panel',async({page})=>{
  await page.setViewportSize({width,height});await boot(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of ['spring','cache','altar','rift','merchant']){
   await page.evaluate(id=>{const q=window.__RIFT,s=q.state;s.phase='play';s.hp=75;s.coins=30;s.eventIndex=0;s.eventOrder=[id,...Object.keys(q.RF.ENCOUNTERS).filter(k=>k!==id)];q.RF.openEncounter(s);q.phaseView();},id);
   await expect(page.locator('.encounter-panel')).toBeVisible();await expect(page.locator('.event-choices button')).toHaveCount(3);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
   if(id==='altar'||id==='rift')await page.screenshot({path:`${out}/v06-event-${id}-${name}.png`});
   await page.locator('.event-choices button').first().click();await expect(page.locator('#layer')).toBeHidden();expect(await page.evaluate(()=>window.__RIFT.state.phase)).toBe('play');
  }expect(await page.evaluate(()=>window.__RIFT.state.eventHistory.length)).toBe(5);expect(errors).toEqual([]);
 });
}
test('event save reload keeps the same event, freezes combat, and commits the choice once',async({page})=>{
 await boot(page);await page.evaluate(()=>{const q=window.__RIFT,s=q.state;s.wave=3;s.eventOrder=['altar','cache','rift','spring','merchant'];s.eventIndex=0;s.hp=80;q.RF.openEncounter(s);q.phaseView();});
 await expect(page.getByRole('heading',{name:'猩紅契壇'})).toBeVisible();const time=await page.evaluate(()=>window.__RIFT.state.time);await page.reload();await expect(page.locator('#resume')).toBeEnabled();await page.locator('#resume').click();await expect(page.getByRole('heading',{name:'猩紅契壇'})).toBeVisible();
 await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__RIFT.state.time)).toBe(time);await page.locator('#event-power').click();await expect(page.locator('#layer')).toBeHidden();
 const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('rift-forge.v1.run')));expect(save.alterations.power).toBe(1.18);expect(save.hp).toBe(62);expect(save.eventHistory).toEqual([{id:'altar',choice:'power',wave:3}]);
 await page.locator('#pause').click();await page.reload();await expect(page.locator('#resume')).toBeEnabled();await page.locator('#resume').click();expect(await page.evaluate(()=>window.__RIFT.state.alterations.power)).toBe(1.18);
});
test('insufficient event costs are visibly disabled and keyboard can leave safely',async({page})=>{
 await boot(page);await page.evaluate(()=>{const q=window.__RIFT,s=q.state;s.hp=18;s.eventOrder=['altar','cache','rift','spring','merchant'];s.eventIndex=0;q.RF.openEncounter(s);q.phaseView();});await expect(page.locator('#event-power')).toBeDisabled();await page.locator('#event-leave').focus();await page.keyboard.press('Enter');await expect(page.locator('#layer')).toBeHidden();expect(await page.evaluate(()=>window.__RIFT.state.hp)).toBe(18);
});
test('new boss asset failure offers retry instead of entering with missing art',async({page})=>{
 await page.route('**/assets/sprites/oracle.webp*',r=>r.abort());await page.goto('?qa=1');await expect(page.locator('#retry-assets')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();await page.unroute('**/assets/sprites/oracle.webp*');await page.locator('#retry-assets').click();await expect(page.locator('#start')).toBeEnabled();expect(await page.evaluate(()=>window.__RIFT.renderer.status.loaded)).toBe(7);
});
