const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
test.use({hasTouch:true,isMobile:true,deviceScaleFactor:2,viewport:{width:926,height:428}});
async function start(page){await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').tap();await expect(page.locator('#layer')).toBeHidden();await expect(page.locator('#move-rail')).toBeVisible();}
async function pointer(page,selector,type,id,x,y){await page.locator(selector).dispatchEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===31,clientX:x,clientY:y,bubbles:true,cancelable:true,buttons:type==='pointerup'||type==='pointercancel'?0:1});}
test('trusted drag stops on release, including release outside the rail',async({page})=>{
 await start(page);await page.evaluate(()=>{window.pointerTrace=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','resize'])window.addEventListener(type,e=>window.pointerTrace.push({type,id:e.pointerId,x:e.clientX,target:e.target.id,buttons:e.buttons,time:window.__RIFT.state.time}),true);});const r=await page.locator('#move-rail').boundingBox(),before=await page.evaluate(()=>window.__RIFT.state.x);
 await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width+70,r.y+r.height/2);
 // Software WebKit may not deliver a frame inside a short wall-clock delay.
 try{await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.x)).toBeGreaterThan(before+20);}catch(e){console.log('POINTER_TRACE',JSON.stringify(await page.evaluate(()=>window.pointerTrace)));throw e;}finally{await page.mouse.up();}
 const stopped=await page.evaluate(()=>({x:window.__RIFT.state.x,time:window.__RIFT.state.time}));await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.time)).toBeGreaterThan(stopped.time+.15);expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeCloseTo(stopped.x,1);
});
test('two pointer streams keep movement and aim independent, and cancel clears only its owner',async({page})=>{
 await start(page);const r=await page.locator('#move-rail').boundingBox(),v=await page.evaluate(()=>window.__RIFT.renderer.metrics.viewport);
 const ax=v.left+(v.right-v.left)*.75,ay=v.top+40;
 await pointer(page,'#move-rail','pointerdown',31,r.x+8,r.y+26);
 await pointer(page,'#canvas','pointerdown',32,ax,ay);await page.waitForTimeout(120);
 const s=await page.evaluate(()=>({x:window.__RIFT.state.x,aim:window.__RIFT.state.aimX,auto:window.__RIFT.state.auto}));expect(s.x).toBeLessThan(465);expect(s.auto).toBe(false);
 await pointer(page,'#canvas','pointermove',33,v.left+10,ay);expect(await page.evaluate(()=>window.__RIFT.state.aimX)).toBeCloseTo(s.aim,1);
 await pointer(page,'#move-rail','pointercancel',31,r.x+8,r.y+26);const stopped=await page.evaluate(()=>window.__RIFT.state.x);await page.waitForTimeout(150);expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeCloseTo(stopped,1);
 await pointer(page,'#canvas','pointermove',32,v.left+30,ay);expect(await page.evaluate(()=>window.__RIFT.state.aimX)).toBeLessThan(s.aim-100);
 await pointer(page,'#canvas','pointerup',32,v.left+30,ay);
});
test('rotation pauses play and releases held movement before resume',async({page})=>{
 await start(page);const r=await page.locator('#move-rail').boundingBox();await pointer(page,'#move-rail','pointerdown',31,r.x+r.width-6,r.y+26);
 await page.setViewportSize({width:430,height:932});await expect(page.locator('#continue')).toBeVisible();const time=await page.evaluate(()=>window.__RIFT.state.time);await page.waitForTimeout(160);expect(await page.evaluate(()=>window.__RIFT.state.time)).toBe(time);
 await page.locator('#continue').tap();const x=await page.evaluate(()=>window.__RIFT.state.x);await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeCloseTo(x,1);
});
test('control preference survives reload and preserves button input',async({page})=>{
 await start(page);await page.locator('#pause').tap();await page.locator('#move-mode').tap();await expect(page.locator('#move-mode')).toHaveText('移動：按鈕');await page.locator('#continue').tap();await expect(page.locator('#move-rail')).toBeHidden();await expect(page.locator('#left')).toBeVisible();
 await page.reload();await expect(page.locator('#resume')).toBeEnabled();await page.locator('#resume').tap();await expect(page.locator('#move-rail')).toBeHidden();const r=await page.locator('#left').boundingBox(),x=await page.evaluate(()=>window.__RIFT.state.x);await page.mouse.move(r.x+20,r.y+20);await page.mouse.down();await page.waitForTimeout(150);await page.mouse.up();expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeLessThan(x-15);
});
test('pause stops repeated canvas work and suspends sound, resume restarts both',async({page})=>{
 await start(page);await expect.poll(()=>page.evaluate(()=>window.__RIFT.audioState)).toBe('running');await page.locator('#pause').tap();await expect.poll(()=>page.evaluate(()=>window.__RIFT.audioState)).toBe('suspended');await page.waitForTimeout(150);
 const idle=await page.evaluate(()=>({draws:window.__RIFT.renderer.metrics.drawCalls,time:window.__RIFT.state.time}));await page.waitForTimeout(300);const after=await page.evaluate(()=>({draws:window.__RIFT.renderer.metrics.drawCalls,time:window.__RIFT.state.time}));expect(after).toEqual(idle);
 await page.locator('#continue').tap();await expect.poll(()=>page.evaluate(()=>window.__RIFT.audioState)).toBe('running');await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.time)).toBeGreaterThan(idle.time);expect(await page.evaluate(()=>window.__RIFT.renderer.metrics.drawCalls)).toBeGreaterThan(idle.draws);
});
test('touch layouts keep the court, four cores and controls clear at small sizes',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await page.evaluate(()=>{const q=window.__RIFT;q.freeze();q.state.loadout=['ember','frost','spark','echo'].map(id=>({id,level:2}));q.state.enemies=[];[['guard',270,180],['runner',540,240],['seer',690,155]].forEach(([kind,x,y])=>q.RF.spawn(q.state,kind,x,y));});
 const out=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(out,{recursive:true});await expect(page.locator('#toast')).not.toHaveClass(/on/);
 for(const [w,h] of [[926,428],[568,320],[430,932],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);if(await page.locator('#continue').isVisible())await page.locator('#continue').tap();await expect(page.locator('#layer')).toBeHidden();await page.waitForTimeout(150);
  const g=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,right:r.right,top:r.top,bottom:r.bottom};};return{v:window.__RIFT.renderer.metrics.viewport,hud:rect(document.querySelector('#hud')),dock:rect(document.querySelector('#dock')),groups:[...document.querySelector('#dock').children].map(rect),width:innerWidth,scroll:document.documentElement.scrollWidth};});
  expect(g.scroll).toBe(w);expect(g.v.top).toBeGreaterThan(g.hud.bottom);expect(g.v.bottom).toBeLessThan(g.dock.top);for(const r of g.groups){expect(r.x).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(w);}
  for(let a=0;a<g.groups.length;a++)for(let b=a+1;b<g.groups.length;b++){const x=g.groups[a],y=g.groups[b];expect(x.right<=y.x||y.right<=x.x||x.bottom<=y.top||y.bottom<=x.top).toBe(true);}
  await expect(page.locator('#toast')).not.toHaveClass(/on/);await page.screenshot({path:`${out}/touch-${w}x${h}.png`});
 }
 await page.setViewportSize({width:926,height:428});await page.waitForTimeout(100);if(await page.locator('#continue').isVisible())await page.locator('#continue').tap();await page.evaluate(()=>document.documentElement.style.setProperty('--safe-x','47px'));await page.waitForTimeout(150);
 const safe=await page.locator('#dock').boundingBox();expect(safe.x).toBeGreaterThanOrEqual(47);expect(safe.x+safe.width).toBeLessThanOrEqual(879);expect(errors).toEqual([]);
});
