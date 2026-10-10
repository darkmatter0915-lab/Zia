const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
async function boot(page){await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();}
async function unlock(page){await page.addInitScript(()=>{if(!sessionStorage.getItem('rift-character-seeded')){localStorage.setItem('rift-forge.v1.meta',JSON.stringify({v:1,wins:1,credits:120,forge:2,ward:1}));sessionStorage.setItem('rift-character-seeded','1');}});await boot(page);}
function output(info){const dir=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(dir,{recursive:true});return dir;}

test('new players see distinct character cards and the real unlock condition',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await boot(page);await expect(page.locator('#choose-character')).toContainText('鍊金行者');await page.locator('#choose-character').click();
 await expect(page.locator('#character-forge')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#character-warden')).toBeDisabled();await expect(page.locator('#character-warden')).toContainText('熔鐘守衛');
 expect(await page.locator('.character-card>img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:`${output(info)}/characters-portrait-locked.png`});await page.locator('#character-done').click();await page.locator('#start').click();
 expect(await page.evaluate(()=>window.__RIFT.state.character)).toBe('forge');await expect(page.locator('#pulse')).toContainText('熔脈爆發');
});

test('legacy wins unlock a persistent choice without changing the resumed character',async({page})=>{
 await unlock(page);await page.locator('#choose-character').click();await expect(page.locator('#character-warden')).toBeEnabled();await expect(page.locator('#character-warden .skill-numbers')).toContainText('緩速45% 4秒');await page.locator('#character-warden').click();await expect(page.locator('#character-warden')).toHaveAttribute('aria-pressed','true');await page.locator('#character-done').click();
 await page.reload();await expect(page.locator('#choose-character')).toContainText('霜衛');await page.locator('#start').click();await page.evaluate(()=>window.__RIFT.freeze());
 expect(await page.evaluate(()=>({character:window.__RIFT.state.character,loadout:window.__RIFT.state.loadout}))).toEqual({character:'warden',loadout:[{id:'frost',level:1},{id:'thorn',level:1}]});await expect(page.locator('#pulse')).toContainText('霜環');
 await page.evaluate(()=>{const q=window.__RIFT;q.state.level=4;q.state.xp=q.state.xpNeed;q.RF.step(q.state,1/120);q.phaseView();});await expect(page.locator('.growth-strip')).toContainText('霜紋 2 階');await expect(page.locator('.growth-strip')).toContainText('下一光效覺醒 Lv.10');await expect(page.locator('.growth-strip')).not.toContainText('重鑄先鋒');await page.locator('#offer-0').click();
 await page.locator('#pause').click();await expect(page.locator('.character-name')).toHaveText('霜衛 · 霜環');await page.locator('#quit').click();await page.locator('#choose-character').click();await page.locator('#character-forge').click();await page.locator('#character-done').click();
 await page.locator('#resume').click();expect(await page.evaluate(()=>window.__RIFT.state.character)).toBe('warden');await expect(page.locator('#pulse')).toContainText('霜環');
 await page.locator('#pause').click();await page.locator('#quit').click();await page.locator('#start').click();expect(await page.evaluate(()=>window.__RIFT.state.character)).toBe('forge');
});

test('pre-character saved runs keep their original build even with a different title preference',async({page})=>{
 await unlock(page);await page.locator('#start').click();const before=await page.evaluate(()=>{const q=window.__RIFT;q.freeze();q.state.loadout=[{id:'steam',level:2},{id:'spark',level:3}];q.state.level=12;q.state.hp=67;const old=q.RF.snapshot(q.state);delete old.character;localStorage.setItem('rift-forge.v1.run',JSON.stringify(old));localStorage.setItem('rift-forge.v1.character',JSON.stringify('warden'));return {loadout:old.loadout,level:old.level,hp:old.hp};});
 await page.reload();await expect(page.locator('#choose-character')).toContainText('霜衛');await page.locator('#resume').click();expect(await page.evaluate(()=>{const q=window.__RIFT;q.freeze();return {character:q.state.character,loadout:q.state.loadout,level:q.state.level,hp:q.state.hp};})).toEqual({character:'forge',...before});
});

test('first victory unlocks warden and preserves the paid chapter transition across reloads',async({page},info)=>{
 await boot(page);await page.locator('#start').click();await page.evaluate(()=>{const q=window.__RIFT,s=q.state;q.freeze();Object.assign(s,{level:12,wave:9,hp:32,maxHp:172,coins:100,loadout:[{id:'steam',level:2},{id:'spark',level:3}],passives:{power:2,haste:1,bank:2,ward:4,catch:1},bossesDefeated:['maw','oracle']});q.RF.beginBoss(s,'bell');q.RF.hit(s,s.enemies[0],1e6,'steam');q.phaseView();});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rift-forge.v1.run')).paid)).toBe(true);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rift-forge.v1.meta')).unlockedCharacters)).toContain('warden');await expect(page.locator('.character-unlock')).toContainText('霜衛');const paid=await page.evaluate(()=>window.__RIFT.meta.credits);
 await page.screenshot({path:`${output(info)}/characters-victory-unlock.png`});await page.reload();await expect(page.locator('#resume')).toHaveText('承接第一章配裝');await page.locator('#resume').click();await expect(page.locator('#next-chapter')).toBeVisible();await expect(page.locator('.kpi')).toContainText(`+${paid}`);expect(await page.evaluate(()=>window.__RIFT.meta.credits)).toBe(paid);
 await page.locator('#next-chapter').click();await page.reload();await page.locator('#resume').click();await page.locator('#next-chapter').click();await page.locator('#enter-chapter-2').click();await page.evaluate(()=>window.__RIFT.freeze());
 expect(await page.evaluate(()=>{const s=window.__RIFT.state;return {character:s.character,chapter:s.chapter,level:s.level,loadout:s.loadout,maxHp:s.maxHp,hp:s.hp,bank:s.passives.bank,credits:window.__RIFT.meta.credits};})).toEqual({character:'forge',chapter:2,level:12,loadout:[{id:'steam',level:2},{id:'spark',level:3}],maxHp:172,hp:172,bank:2,credits:paid});
});

test('mobile role cards and replay choice remain usable, including chapter two loadout',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await unlock(page);
 for(const [width,height] of [[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#choose-character').click();await page.locator('#character-warden').click();await expect(page.locator('#character-done')).toBeEnabled();
  const boxes=await page.locator('.character-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,scroll:c.scrollWidth,client:c.clientWidth};}));for(const box of boxes){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);expect(box.scroll).toBe(box.client);}
  await page.screenshot({path:`${output(info)}/characters-${width}x${height}.png`});await page.locator('#character-done').click();
 }
 await page.locator('#chapter-2').click();await expect(page.locator('.chapter-panel')).toContainText('霜衛');await page.locator('#enter-chapter-2').click();await page.evaluate(()=>window.__RIFT.freeze());expect(await page.evaluate(()=>window.__RIFT.state.loadout)).toEqual(['frost','thorn','leech'].map(id=>({id,level:2})));
 await expect(page.locator('#pulse')).toContainText('霜環');await page.evaluate(()=>{const q=window.__RIFT;q.state.phase='lose';q.results();});await page.locator('#choose-next-character').click();await page.locator('#character-forge').click();await page.locator('#character-done').click();expect(await page.evaluate(()=>({chapter:window.__RIFT.state.chapter,character:window.__RIFT.state.character}))).toEqual({chapter:2,character:'forge'});expect(errors).toEqual([]);
});
