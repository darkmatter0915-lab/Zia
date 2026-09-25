const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
function output(info){const dir=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(dir,{recursive:true});return dir;}
async function legacyWinner(page){await page.addInitScript(()=>{if(!localStorage.getItem('rift-forge.v1.meta'))localStorage.setItem('rift-forge.v1.meta',JSON.stringify({v:1,wins:1,runs:3,credits:120,forge:2,ward:1}));});await page.goto('?qa=1');await expect(page.locator('#chapter-2')).toBeEnabled();}

test('legacy winners enter chapter two on mobile and resume its exact build',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#chapter-2')).toBeDisabled();
 await legacyWinner(page);await page.locator('#chapter-2').click();await expect(page.locator('.bestiary img')).toHaveCount(3);
 expect(await page.locator('.bestiary img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await page.screenshot({path:`${output(info)}/v09-portrait-bestiary.png`});await page.locator('#enter-chapter-2').click();await page.evaluate(()=>window.__RIFT.freeze());
 await expect(page.locator('#wave')).toHaveText('王庭 1 / 6');await expect(page.locator('#level')).toHaveText('LV 10');
 const before=await page.evaluate(()=>{const q=window.__RIFT;q.persist();return {chapter:q.state.chapter,level:q.state.level,loadout:q.state.loadout,maxHp:q.state.maxHp,forge:q.state.forge};});
 expect(before).toEqual({chapter:2,level:10,loadout:['ember','frost','spark'].map(id=>({id,level:2})),maxHp:142,forge:2});
 await page.reload();await expect(page.locator('#resume')).toBeEnabled();await page.locator('#resume').click();
 const after=await page.evaluate(()=>{const q=window.__RIFT;q.freeze();return {chapter:q.state.chapter,level:q.state.level,loadout:q.state.loadout,maxHp:q.state.maxHp,forge:q.state.forge};});expect(after).toEqual(before);
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.frostScenery)).toBe('ready');
 await expect(page.locator('#toast')).not.toHaveClass(/on/);await page.screenshot({path:`${output(info)}/v09-portrait-resume.png`});
});

test('chapter one victory carries the build through both new bosses without paying twice',async({page},info)=>{
 await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>{const q=window.__RIFT,R=q.RF,s=q.state;q.freeze();Object.assign(s,{level:12,wave:9,hp:32,maxHp:172,xp:7,coins:100,bossesDefeated:['maw','oracle'],loadout:[{id:'steam',level:2},{id:'spark',level:3}],passives:{power:2,haste:1,bank:2,ward:4,catch:1}});R.beginBoss(s,'bell');R.hit(s,s.enemies[0],1e6,'steam');q.phaseView();});
 await expect(page.locator('#next-chapter')).toBeVisible();const paid=await page.evaluate(()=>window.__RIFT.meta.credits);
 await page.locator('#next-chapter').click();await page.locator('#chapter-back').click();expect(await page.evaluate(()=>window.__RIFT.meta.credits)).toBe(paid);await expect(page.locator('.kpi')).toContainText(`+${paid}`);
 await page.locator('#next-chapter').click();await page.locator('#enter-chapter-2').click();await expect(page.locator('#wave')).toHaveText('王庭 1 / 6');
 expect(await page.evaluate(()=>{const s=window.__RIFT.state;return {chapter:s.chapter,level:s.level,hp:s.hp,maxHp:s.maxHp,coins:s.coins,loadout:s.loadout,bank:s.passives.bank};})).toEqual({chapter:2,level:12,hp:172,maxHp:172,coins:0,loadout:[{id:'steam',level:2},{id:'spark',level:3}],bank:2});
 await page.evaluate(()=>{const q=window.__RIFT,s=q.state;s.wave=3;q.RF.beginBoss(s,'reaper');q.RF.hit(s,s.enemies[0],1e6,'steam');q.phaseView();});await expect(page.locator('#skip')).toBeVisible();await page.locator('#skip').click();
 await page.evaluate(()=>{const q=window.__RIFT,s=q.state;s.wave=7;q.RF.beginBoss(s,'queen');q.RF.hit(s,s.enemies[0],1e6,'steam');q.phaseView();});
 await expect(page.getByRole('heading',{name:'霜骸女王已擊破'})).toBeVisible();await expect(page.locator('#next-chapter')).toHaveCount(0);await expect(page.locator('.panel')).toContainText('擊破頭目：2 / 2');
 expect(await page.evaluate(()=>window.__RIFT.meta.chapter2Wins)).toBe(1);const credits=await page.evaluate(()=>window.__RIFT.meta.credits);expect(credits).toBe(paid+224);
 await page.evaluate(()=>window.__RIFT.results());expect(await page.evaluate(()=>window.__RIFT.meta.credits)).toBe(credits);
 await page.screenshot({path:`${output(info)}/v09-chapter-two-victory.png`});await page.locator('#again').click();expect(await page.evaluate(()=>window.__RIFT.state.chapter)).toBe(2);
});

for(const [name,width,height] of [['desktop',1440,900],['mobile-landscape',844,390]]){
 test(name+' frost enemies and both boss phases remain readable in full and lite effects',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await legacyWinner(page);await page.locator('#chapter-2').click();await page.locator('#enter-chapter-2').click();await page.evaluate(()=>window.__RIFT.freeze());
  await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.frostScenery)).toBe('ready');
  for(const id of ['reaper','queen'])for(const rage of [false,true])for(const quality of ['full','lite']){
   const result=await page.evaluate(({id,rage,quality})=>{const q=window.__RIFT,R=q.RF,s=q.state;Object.assign(s,{phase:'play',encounter:null,level:12,x:480,hp:s.maxHp,wave:id==='reaper'?3:7,time:100,waveTime:0,xp:-1000,shotCd:99,nextSpawn:99,events:[],fx:[],texts:[],ghosts:[],bossesDefeated:[]});R.beginBoss(s,id);const boss=s.enemies[0];boss.hp=boss.maxHp*(rage?.45:1);boss.shot=0;R.step(s,1/120);s.events=[];s.hazards.forEach(h=>h.life=.8);for(const [kind,x,y] of [['iceguard',245,330],['icehound',630,355],['icewitch',740,270]])R.spawn(s,kind,x,y);s.enemies.find(e=>e.kind==='icehound').windup=.5;
   for(const [i,type] of ['ember','frost','spark'].entries()){R.ball(s,type,3,335+i*105,385,30,-470,40);s.balls.at(-1).trail=Array.from({length:7},(_,j)=>({x:335+i*105,y:460-j*10}));}q.renderer.setQuality(quality);const before=JSON.stringify(s);q.renderer.draw(s,s.time);return {same:JSON.stringify(s)===before,hazards:s.hazards.length,chapter:q.renderer.metrics.chapter};},{id,rage,quality});
   expect(result.same).toBe(true);expect(result.chapter).toBe(2);expect(result.hazards).toBe(id==='queen'?3:2);await expect(page.locator('#wave')).toHaveText(id==='queen'?'霜骸女王':'凜獄斬刑者');await expect(page.locator('#level')).toHaveText('LV 12');await expect(page.locator('#toast')).not.toHaveClass(/on/);
   await page.screenshot({path:`${output(info)}/v09-${name}-${id}-${rage?'rage':'normal'}-${quality}.png`});
  }expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 });
}

test('new boss atlas failures retry safely while decorative floor failure still permits play',async({page})=>{
 await page.route('**/assets/sprites/queen.webp*',r=>r.abort());await page.route('**/assets/frost-court-v09.webp*',r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('rift-forge.v1.meta',JSON.stringify({wins:1})));await page.goto('?qa=1');await expect(page.locator('#retry-assets')).toBeVisible();await expect(page.locator('#chapter-2')).toBeDisabled();
 await page.unroute('**/assets/sprites/queen.webp*');await page.locator('#retry-assets').click();await expect(page.locator('#chapter-2')).toBeEnabled();await page.locator('#chapter-2').click();await page.locator('#enter-chapter-2').click();await expect(page.locator('#wave')).toHaveText('王庭 1 / 6');
 expect(await page.evaluate(()=>{const q=window.__RIFT;q.freeze();return {ready:q.renderer.status.ready,floor:q.renderer.status.frostScenery,chapter:q.state.chapter};})).toEqual({ready:true,floor:'unavailable',chapter:2});
});
