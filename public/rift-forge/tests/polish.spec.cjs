const {test,expect}=require('@playwright/test');
test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
async function start(page){
 await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#boot-status')).toBeHidden();await page.locator('#start').tap();
 await page.evaluate(()=>{const s=window.__RIFT.state;s.enemies=[];s.nextSpawn=1e6;});
}
test('default touch buttons respond to a quick tap and then stop',async({page})=>{
 await start(page);await expect(page.locator('#left')).toBeVisible();
 const before=await page.evaluate(()=>window.__RIFT.state.x);await page.locator('#left').tap();
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.x)).toBeLessThan(before-20);
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.time)).toBeGreaterThan(.3);
 const stopped=await page.evaluate(()=>({x:window.__RIFT.state.x,t:window.__RIFT.state.time}));
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.time)).toBeGreaterThan(stopped.t+.2);
 expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeCloseTo(stopped.x,1);
 await page.locator('#right').focus();await page.keyboard.press('Enter');
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.x)).toBeGreaterThan(stopped.x+20);
});
test('browser toolbar resize keeps a held direction active without crossing orientation',async({page})=>{
 await start(page);const box=await page.locator('#right').boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();
 const before=await page.evaluate(()=>window.__RIFT.state.x);await page.setViewportSize({width:390,height:800});
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.x)).toBeGreaterThan(before+45);await page.mouse.up();
 await expect(page.locator('#layer')).toBeHidden();
});
test('touch aiming and dash work alongside the default movement controls',async({page})=>{
 await start(page);const v=await page.evaluate(()=>window.__RIFT.renderer.metrics.viewport);
 await page.touchscreen.tap(v.left+(v.right-v.left)*.7,v.top+60);await expect(page.locator('#auto')).toHaveText('手動瞄準');
 const before=await page.evaluate(()=>window.__RIFT.state.x);await page.locator('#dash').tap();
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.x)).toBeGreaterThan(before+100);await expect(page.locator('#dash')).toBeDisabled();
 await page.locator('#pause').tap();await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').tap();await expect(page.locator('#layer')).toBeHidden();
});
test('a blocked startup script exposes recovery and reload preserves saved progress',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('rift-forge.v1.meta',JSON.stringify({v:1,credits:137})));
 await page.route('**/src/controls.js*',r=>r.abort());await page.goto('?qa=1');
 await expect(page.locator('#boot-status')).toBeVisible();await expect(page.locator('#boot-detail')).toContainText('未完整啟動');
 await page.unroute('**/src/controls.js*');await page.locator('#boot-retry').tap();await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#boot-status')).toBeHidden();
 expect(await page.evaluate(()=>window.__RIFT.meta.credits)).toBe(137);await page.locator('#start').tap();await expect(page.locator('#layer')).toBeHidden();
});
test('missing decorative floor art does not prevent combat',async({page})=>{
 await page.route('**/assets/foundry-floor-v05.webp*',r=>r.abort());await start(page);
 expect(await page.evaluate(()=>window.__RIFT.renderer.status.scenery)).toBe('unavailable');
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.time)).toBeGreaterThan(.2);
});
test('a very short tap is consumed by game frames, and pause clears it',async({page})=>{
 await start(page);const before=await page.evaluate(()=>window.__RIFT.state.x);
 // Reproduce press/release within one JS task: no animation frame can sample held input.
 await page.locator('#left').evaluate(el=>{el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:89,bubbles:true}));document.dispatchEvent(new PointerEvent('pointerup',{pointerId:89,bubbles:true}));});
 await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.x)).toBeLessThan(before-20);
 await page.locator('#pause').tap();const x=await page.evaluate(()=>window.__RIFT.state.x);await page.locator('#continue').tap();
 const t=await page.evaluate(()=>window.__RIFT.state.time);await expect.poll(()=>page.evaluate(()=>window.__RIFT.state.time)).toBeGreaterThan(t+.2);expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeCloseTo(x,1);
});
