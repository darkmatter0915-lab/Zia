const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const out='test-results/rift-forge';
async function boot(page){await page.goto('?qa=1');await expect(page.locator('#start')).toBeEnabled();}
async function scene(page){await page.evaluate(()=>{
 const q=window.__RIFT,R=q.RF;q.start(false);q.freeze();const s=q.state;
 s.time=42;s.wave=6;s.waveTime=13;s.enemies=[];s.balls=[];s.bullets=[];s.fx=[];s.ghosts=[];s.texts=[];
 s.hp=84;s.x=440;s.fireAnim=.12;s.charge=100;s.lastCore='ember';s.loadout=[{id:'ember',level:3},{id:'frost',level:3},{id:'tempest',level:1},{id:'plague',level:1}];
 [['guard',275,165],['guard',620,275],['runner',400,285],['runner',740,190],['seer',510,195],['seer',210,337]].forEach(([k,x,y])=>R.spawn(s,k,x,y));
 s.enemies[2].burn=2;s.enemies[3].slow=2;s.enemies[4].shot=.22;s.enemies[5].poison=3;
 Object.keys(R.TYPES).forEach((id,i)=>R.ball(s,id,2,240+i*60,405-(i%3)*40,150*(i%2?1:-1),-420,R.TYPES[id].power));
 s.fx.push({type:'arc',x:400,y:285,x2:510,y2:195,color:'#ead384',size:1,life:.3,max:.4});
 s.bullets.push({kind:'seer',x:550,y:360,vx:20,vy:150,r:5,life:5});
 });await page.waitForTimeout(160);
}
test.beforeAll(()=>fs.mkdirSync(out,{recursive:true}));
for(const [name,width,height] of [['desktop',1440,900],['mobile-landscape',926,428],['mobile-portrait',430,932]]){
 test(name+' combat art and UI fit',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await boot(page);
  await page.screenshot({path:`${out}/${name}-home.png`});await scene(page);
  await page.screenshot({path:`${out}/${name}-combat.png`});
  const geometry=await page.evaluate(()=>{
   const q=window.__RIFT,c=document.querySelector('#canvas'),h=document.querySelector('#hud').getBoundingClientRect(),d=document.querySelector('#dock').getBoundingClientRect();
   const bottomPoint=q.renderer.point(innerWidth/2,d.top);
   return{ready:q.renderer.status.ready,bodyWidth:document.documentElement.scrollWidth,width:innerWidth,hud:h.bottom,dock:d.top,heroClear:bottomPoint.y>540,canvasW:c.width};
  });expect(geometry.ready).toBe(true);expect(geometry.bodyWidth).toBe(width);expect(geometry.hud).toBeLessThan(geometry.dock);expect(geometry.heroClear).toBe(true);
  await page.locator('#pause').click();await expect(page.getByText('熔火尚未熄滅')).toBeVisible();await page.locator('#quality').click();await expect(page.locator('#quality')).toHaveText('特效：精簡');await page.locator('#continue').click();
  expect(await page.evaluate(()=>window.__RIFT.renderer.metrics.quality)).toBe('lite');expect(errors).toEqual([]);
 });
}
test('all five atlases decode with transparent gutters and all six key poses',async({page})=>{
 await boot(page);const results=await page.evaluate(async()=>{
  const items=[];for(const name of ['hero','guard','runner','seer','boss']){const im=new Image();im.src=`./assets/sprites/${name}.webp`;await im.decode();const c=document.createElement('canvas');c.width=768;c.height=512;const x=c.getContext('2d');x.drawImage(im,0,0);const bytes=x.getImageData(0,0,768,512).data,counts=[];for(let f=0;f<6;f++){let visible=0;for(let y=0;y<256;y++)for(let xx=0;xx<256;xx++)if(bytes[((Math.floor(f/3)*256+y)*768+(f%3)*256+xx)*4+3]>128)visible++;counts.push(visible);}items.push({name,w:im.width,h:im.height,corner:bytes[3],counts});}return items;
 });for(const a of results){expect(a.w).toBe(768);expect(a.h).toBe(512);expect(a.corner).toBe(0);a.counts.forEach(n=>expect(n).toBeGreaterThan(1000));}
});
test('asset load failure blocks combat and retry recovers',async({page})=>{
 await page.route('**/assets/sprites/seer.webp',r=>r.abort());await page.goto('?qa=1');await expect(page.locator('#retry-assets')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();
 await page.unroute('**/assets/sprites/seer.webp');await page.locator('#retry-assets').click();await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await expect(page.locator('#layer')).toBeHidden();
});
test('boss cast, evolution effects, and terminal transition render without errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:900});await boot(page);await scene(page);
 await page.evaluate(()=>{const {RF:R,state:s}=window.__RIFT;s.wave=9;R.spawn(s,'boss',480,163);const b=s.enemies.at(-1);b.hp=850;b.shot=.2;s.telegraph=.8;s.lane=640;
 for(const [i,type] of ['nova','bloom','pulse'].entries())s.fx.push({type,x:300+i*180,y:type==='pulse'?500:310,color:['#ffd9b1','#e5a6b6','#d6ecea'][i],size:type==='pulse'?12:3,life:.28,max:.65});});
 await page.waitForTimeout(160);await page.screenshot({path:`${out}/boss-cast.png`});
 await page.evaluate(()=>{const q=window.__RIFT;q.state.phase='lose';q.state.hp=0;});await expect(page.getByText('帶著經驗，回到熔爐')).toBeVisible();expect(errors).toEqual([]);
});
test('movement stops on pause and legacy save resumes',async({page})=>{
 await boot(page);await page.locator('#start').click();const left=await page.locator('#left').boundingBox();await page.mouse.move(left.x+20,left.y+20);await page.mouse.down();await page.waitForTimeout(180);await page.keyboard.press('Escape');await page.mouse.up();await page.locator('#continue').click();
 const x=await page.evaluate(()=>window.__RIFT.state.x);await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__RIFT.state.x)).toBeCloseTo(x,1);
 await page.evaluate(()=>{const q=window.__RIFT,s=q.RF.snapshot(q.state);delete s.ghosts;delete s.fireAnim;delete s.moveDir;localStorage.setItem('rift-forge.v1.run',JSON.stringify(s));});await page.reload();await expect(page.locator('#resume')).toBeEnabled();await page.locator('#resume').click();await expect(page.locator('#layer')).toBeHidden();
});
test('bounded dense render benchmark',async({page})=>{
 await page.setViewportSize({width:926,height:428});await boot(page);await scene(page);
 const data=await page.evaluate(()=>{const q=window.__RIFT,R=q.RF,s=q.state;s.enemies=[];s.balls=[];s.fx=[];
 for(let i=0;i<70;i++)R.spawn(s,['guard','runner','seer'][i%3],145+i%10*74,125+Math.floor(i/10)*48);
 for(let i=0;i<140;i++)R.ball(s,Object.keys(R.TYPES)[i%9],2,125+i%20*37,180+Math.floor(i/20)*40,200,-400,10);
 const run=quality=>{q.renderer.setQuality(quality);const a=[];for(let i=0;i<60;i++){const t=performance.now();q.renderer.draw(s,42+i/60);a.push(performance.now()-t);}a.sort((x,y)=>x-y);return{quality,mean:a.reduce((x,y)=>x+y)/a.length,p95:a[Math.floor(a.length*.95)]};};return{device:'Chromium CI, 926x428, not physical iPhone',enemies:s.enemies.length,balls:s.balls.length,results:[run('full'),run('lite')]};});
 fs.writeFileSync(`${out}/render-benchmark.json`,JSON.stringify(data,null,2));expect(data.enemies).toBe(70);expect(data.balls).toBe(140);for(const r of data.results)expect(r.mean).toBeLessThan(120);
});
