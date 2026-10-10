const {test,expect}=require('@playwright/test');
const path=require('node:path');
const atlas=path.resolve(__dirname,'../assets/sprites/seer.webp');
const deadline=12000;

// Keep real HTMLImageElements, decoding and events. Per-request query strings only
// prevent the browser from coalescing old/new seer downloads in the race tests.
async function traceImages(page){
 await page.addInitScript(()=>{
  const NativeImage=window.Image,source=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');let sequence=0;
  window.__loaderStarts={};window.__loaderEvents=[];
  function TracedImage(...args){const image=new NativeImage(...args);let request=0;
   Object.defineProperty(image,'src',{get(){return source.get.call(image);},set(value){const url=new URL(value,document.baseURI);if(url.pathname.endsWith('/seer.webp')){request=++sequence;url.searchParams.set('qa-loader-request',String(request));window.__loaderStarts[request]=Date.now();}source.set.call(image,url.href);}});
   for(const type of ['load','error'])image.addEventListener(type,()=>{if(request)window.__loaderEvents.push({request,type,width:image.naturalWidth,height:image.naturalHeight});});return image;
  }
  TracedImage.prototype=NativeImage.prototype;Object.setPrototypeOf(TracedImage,NativeImage);window.Image=TracedImage;
 });
}
async function holdSeer(page){
 const requests=[];await traceImages(page);await page.route('**/assets/sprites/seer.webp*',route=>{requests.push(route);});return requests;
}
async function openLoading(page){
 await page.clock.install();await page.goto('?qa=1',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>page.evaluate(()=>{const s=window.__RIFT?.renderer.status;return !!s&&s.loaded===s.total-1;})).toBe(true);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+50));await expect(page.locator('#start')).toBeDisabled();
}
async function advanceDeadline(page,request,offset=1){
 const remaining=await page.evaluate(({request,deadline})=>window.__loaderStarts[request]+deadline-Date.now(),{request,deadline});
 expect(remaining).toBeGreaterThan(0);await page.clock.fastForward(remaining+offset);
}
async function status(page){return page.evaluate(()=>{const s=window.__RIFT.renderer.status;return {ready:s.ready,loaded:s.loaded,total:s.total,pending:s.pending,failed:s.failed,slow:s.slow};});}
async function loaded(page,route,request){await route.fulfill({path:atlas,contentType:'image/webp'});await expect.poll(()=>page.evaluate(request=>window.__loaderEvents.some(e=>e.request===request&&e.type==='load'),request)).toBe(true);}
async function ready(page){await expect(page.locator('#start')).toBeEnabled();const s=await status(page);expect(s).toEqual({ready:true,loaded:s.total,total:s.total,pending:0,failed:[],slow:[]});await expect(page.locator('#asset-status')).toContainText('戰鬥素材已就緒');await expect(page.locator('#retry-assets')).toHaveCount(0);}

test('a slow atlas arriving before the deadline enables play without a retry warning',async({page})=>{
 const requests=await holdSeer(page);await openLoading(page);expect(requests).toHaveLength(1);await advanceDeadline(page,1,-500);
 const waiting=await status(page);expect(waiting).toEqual({ready:false,loaded:waiting.total-1,total:waiting.total,pending:1,failed:[],slow:[]});await expect(page.locator('#retry-assets')).toHaveCount(0);
 await loaded(page,requests[0],1);await ready(page);expect(requests).toHaveLength(1);
});

test('an atlas arriving after the deadline automatically recovers the original first load',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=await holdSeer(page);await openLoading(page);await advanceDeadline(page,1);
 expect(await status(page)).toMatchObject({ready:false,pending:1,failed:[],slow:['seer']});await expect(page.locator('#asset-status')).toContainText(/素材下載較慢.*完成後會自動恢復/);await expect(page.locator('#retry-assets')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();
 await loaded(page,requests[0],1);await ready(page);expect(requests).toHaveLength(1);expect(errors).toEqual([]);
});

test('a permanently failed atlas stays blocked and offers an explicit retry',async({page})=>{
 const requests=await holdSeer(page);await openLoading(page);await requests[0].abort();await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.failed)).toEqual(['seer']);
 await expect(page.locator('#asset-status')).toContainText(/戰鬥素材未完整載入.*請重試/);await expect(page.getByRole('button',{name:'重新載入素材'})).toBeVisible();await expect(page.locator('#start')).toBeDisabled();await page.clock.fastForward(60000);
 const failed=await status(page);expect(failed).toEqual({ready:false,loaded:failed.total-1,total:failed.total,pending:0,failed:['seer'],slow:[]});expect(requests).toHaveLength(1);
});

test('retry requests only the failed atlas, retains verified art, and restores play',async({page})=>{
 const counts={};page.on('request',request=>{const match=new URL(request.url()).pathname.match(/\/assets\/sprites\/([^/]+)\.webp$/);if(match)counts[match[1]]=(counts[match[1]]||0)+1;});
 const requests=await holdSeer(page);await openLoading(page);await requests[0].abort();await expect(page.locator('#retry-assets')).toBeVisible();const before={...counts};await page.locator('#retry-assets').click();await expect.poll(()=>requests.length).toBe(2);
 const waiting=await status(page);expect(waiting).toEqual({ready:false,loaded:waiting.total-1,total:waiting.total,pending:1,failed:[],slow:[]});await expect(page.locator('#start')).toBeDisabled();await loaded(page,requests[1],2);await ready(page);
 expect(counts.seer).toBe(before.seer+1);for(const [name,count] of Object.entries(before))if(name!=='seer')expect(counts[name],name+' was needlessly downloaded again').toBe(count);
 await page.locator('#start').click();await expect(page.locator('#layer')).toBeHidden();expect(await page.evaluate(()=>window.__RIFT.state.phase)).toBe('play');
});

test('rapid retries reuse the active request and stale attempts cannot unlock or fail it',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=await holdSeer(page);await openLoading(page);await advanceDeadline(page,1);await expect(page.locator('#retry-assets')).toBeVisible();
 // Retain the same button to model queued repeat activations even when home redraws.
 const twice=()=>{const retry=document.getElementById('retry-assets');retry.click();retry.click();};
 await page.evaluate(twice);await expect.poll(()=>requests.length).toBe(2);expect(await status(page)).toMatchObject({ready:false,pending:1,failed:[],slow:[]});
 await advanceDeadline(page,2);await expect(page.locator('#retry-assets')).toBeVisible();await page.evaluate(twice);await expect.poll(()=>requests.length).toBe(3);
 await loaded(page,requests[0],1);const active=await status(page);expect(active).toEqual({ready:false,loaded:active.total-1,total:active.total,pending:1,failed:[],slow:[]});await expect(page.locator('#start')).toBeDisabled();
 await requests[1].abort();await expect.poll(()=>page.evaluate(()=>window.__loaderEvents.some(e=>e.request===2&&e.type==='error'))).toBe(true);expect(await status(page)).toEqual(active);await expect(page.locator('#start')).toBeDisabled();
 await loaded(page,requests[2],3);await ready(page);expect(requests).toHaveLength(3);expect(errors).toEqual([]);
});

test('a decoded image with the wrong natural dimensions never unlocks combat',async({page})=>{
 const requests=await holdSeer(page);await openLoading(page);
 await requests[0].fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#789"/></svg>'});
 await expect.poll(()=>page.evaluate(()=>window.__loaderEvents.find(e=>e.request===1&&e.type==='load'))).toEqual({request:1,type:'load',width:32,height:32});
 const invalid=await status(page);expect(invalid).toEqual({ready:false,loaded:invalid.total-1,total:invalid.total,pending:0,failed:['seer'],slow:[]});await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#retry-assets')).toBeVisible();
 await page.clock.fastForward(15000);expect(await status(page)).toEqual(invalid);await expect(page.locator('#start')).toBeDisabled();
});

for(const [menu,heading] of [['codex','讓組合產生質變'],['base','熔爐基地']]){
 test('late assets preserve the open '+menu+' panel and enable play when returning home',async({page})=>{
  const requests=await holdSeer(page);await openLoading(page);await page.locator('#'+menu).click();await expect(page.getByRole('heading',{name:heading})).toBeVisible();await advanceDeadline(page,1);
  expect(await status(page)).toMatchObject({ready:false,slow:['seer']});await expect(page.getByRole('heading',{name:heading})).toBeVisible();await loaded(page,requests[0],1);await expect.poll(()=>page.evaluate(()=>window.__RIFT.renderer.status.ready)).toBe(true);
  await expect(page.getByRole('heading',{name:heading})).toBeVisible();await expect(page.locator('#start')).toHaveCount(0);await page.locator('#back').click();await ready(page);expect(requests).toHaveLength(1);
 });
}
