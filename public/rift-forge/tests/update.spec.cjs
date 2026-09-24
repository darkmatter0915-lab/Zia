const {test,expect}=require('@playwright/test');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../src/engine.js');

test.use({serviceWorkers:'allow',hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
test('a returning player escapes the old cache and keeps their save',async({page},info)=>{
 let upgraded=false;
 const root=path.resolve('dist');
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const relative=pathname.replace(/^\/Zia\//,'');
  res.setHeader('Cache-Control','no-store');
  if(relative==='update-fixture.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Previous installation</title>');}
  if(relative==='sw.js'){
   res.setHeader('Content-Type','application/javascript');
   return res.end(fs.readFileSync(upgraded?'public/sw.js':'tests/fixtures/zia-sw-before-rift.js'));
  }
  const file=path.resolve(root,relative+(relative.endsWith('/')||!relative?'index.html':''));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const state=R.create({},42);state.hp=73;state.coins=29;
 const save=R.snapshot(state);delete save.ghosts;delete save.fireAnim;delete save.moveDir;
 const run=JSON.stringify(save),meta=JSON.stringify(R.metaSafe({credits:321,forge:2,runs:7}));
 try{
  await page.goto(`${origin}/Zia/update-fixture.html`);
  await page.evaluate(async({run,meta})=>{
   await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;
   localStorage.setItem('rift-forge.v1.run',run);localStorage.setItem('rift-forge.v1.meta',meta);
   const cache=await caches.open('zia-runtime-workspace-2-lab');
   for(const file of ['engine.js','render.js','app.js','controls.js','style.css'])await cache.put(new URL(`./rift-forge/src/${file}`,location.href),new Response('OLD_GEOMETRIC_RENDERER'));
   await cache.put(new URL('./workspace-kept',location.href),new Response('KEEP_WORKSPACE'));
  },{run,meta});
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  expect(await page.evaluate(()=>fetch('./rift-forge/src/render.js').then(r=>r.text()))).toBe('OLD_GEOMETRIC_RENDERER');
  upgraded=true;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/Zia/rift-forge/?qa=1`);
  await expect(page.locator('.stamp')).toContainText('戰鬥美術版 0.4.1');
  await expect(page.locator('#resume')).toBeEnabled();
  expect(await page.evaluate(()=>localStorage.getItem('rift-forge.v1.run'))).toBe(run);
  expect(await page.evaluate(()=>localStorage.getItem('rift-forge.v1.meta'))).toBe(meta);
  expect(await page.evaluate(()=>window.__RIFT.renderer.status.loaded)).toBe(5);
  expect(await page.evaluate(()=>[...document.scripts].every(s=>/\?v=[a-f0-9]{12}$/.test(s.src)))).toBe(true);
  await expect.poll(()=>page.evaluate(async()=>{
   const cache=await caches.open('zia-runtime-workspace-2-lab');return(await cache.keys()).filter(r=>r.url.includes('/rift-forge/')).length;
  })).toBe(0);
  expect(await page.evaluate(async()=>{const cache=await caches.open('zia-runtime-workspace-2-lab');return(await cache.match(new URL('../workspace-kept',location.href))).text();})).toBe('KEEP_WORKSPACE');
  await page.locator('#resume').tap();await expect(page.locator('#layer')).toBeHidden();
  expect(await page.evaluate(()=>window.__RIFT.state.hp)).toBe(73);
  await page.evaluate(()=>{const q=window.__RIFT;q.freeze();q.state.enemies=[];[['guard',260,170],['runner',490,245],['seer',700,180]].forEach(([kind,x,y])=>q.RF.spawn(q.state,kind,x,y));});
  await expect(page.locator('#toast')).not.toHaveClass(/on/);
  const out=`test-results/rift-forge/${info.project.name}`;fs.mkdirSync(out,{recursive:true});await page.screenshot({path:`${out}/upgraded-from-old-cache.png`});
  await page.reload();await expect(page.locator('#resume')).toBeEnabled();expect(errors).toEqual([]);
 }finally{await page.goto('about:blank');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
