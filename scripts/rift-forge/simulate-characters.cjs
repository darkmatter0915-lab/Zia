// Offline deterministic rules simulation. Not human play, browser or mobile performance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const R=require(path.join(__dirname,'../../public/rift-forge/src/engine.js'));
const DT=1/60,SEEDS=[42,135,20261010],META={wins:1,forge:2,ward:2,archive:1};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function reflectedX(x){const lo=R.LEFT+6,width=R.RIGHT-R.LEFT-12;let p=((x-lo)%(width*2)+width*2)%(width*2);return lo+(p>width?width*2-p:p);}
function scoreOffer(s,o){
  if(o.kind==='heal')return s.hp<s.maxHp*.55?150:5;
  if(o.kind==='passive')return {power:42-s.passives.power*3,haste:40-s.passives.haste*3,bank:32,ward:s.hp<s.maxHp*.65?110:25,catch:36-s.passives.catch*3}[o.id];
  const own=s.loadout.find(i=>i.id===o.id);
  if(own)return 65+own.level*12;
  const pairs=R.RECIPES.filter(r=>r.a===o.id||r.b===o.id);
  if(pairs.some(r=>s.loadout.some(i=>i.id===r.a||i.id===r.b)))return 62;
  return {ember:22,frost:26,spark:28,thorn:22,leech:34,echo:25}[o.id]||20;
}
function chooseModal(s,stats){
  if(s.phase==='draft'||s.phase==='shop'){
    const phase=s.phase;stats[phase]++;
    if(phase==='shop'&&s.coins<10){s.phase='play';s.offers=[];return;}
    const best=s.offers.map((o,i)=>({i,score:scoreOffer(s,o)})).sort((a,b)=>b.score-a.score)[0];
    assert(R.applyOffer(s,best.i));
  }else if(s.phase==='event'){
    stats.events.push({id:s.encounterEvent,wave:s.wave});
    const options=R.eventChoices(s).filter(o=>!o.disabled),find=id=>options.find(o=>o.id===id);
    const priority=s.hp<s.maxHp*.6?['heal','ward','coins','seal','bank','reroll']:['ward','power','bank','coins','seal','reroll','heal'];
    const choice=priority.map(find).find(Boolean)||find('leave');assert(R.chooseEncounter(s,choice.id));
  }
  for(const recipe of R.ready(s)){if(R.evolve(s,recipe.out))stats.fusions.push(recipe.out);}
}
function direction(s,stats){
  const catches=s.balls.filter(b=>b.vy>0&&b.y>340&&b.y<518).map(b=>{
    const t=(518-b.y)/b.vy;return {x:reflectedX(b.x+b.vx*t),t};
  }).filter(b=>b.t<.75);
  function danger(x){
    let cost=0;
    for(const h of s.hazards)if(h.life<1.1&&Math.abs(x-h.x)<h.width/2+R.HAZARD_PADDING+10)cost+=180/(h.life+.15);
    for(const b of s.bullets){
      if(b.vy<=0)continue;const t=(520-b.y)/b.vy;if(t<-.1||t>.85)continue;
      const dx=Math.abs(b.x+b.vx*t-x);if(dx<35)cost+=(35-dx)*9/(t+.2);
    }
    return cost;
  }
  const candidates=[s.x];for(let x=R.LEFT+25;x<=R.RIGHT-25;x+=22)candidates.push(x);
  let target=s.x,best=Infinity;
  for(const x of candidates){
    const travel=Math.abs(x-s.x)/330;let cost=danger(x)+Math.abs(x-s.x)*.12;
    for(const b of catches)if(travel<=b.t+.1&&Math.abs(x-b.x)<50+s.passives.catch*18)cost-=14/(b.t+.25);
    if(cost<best){best=cost;target=x;}
  }
  const dir=Math.sign(target-s.x),urgent=s.hazards.some(h=>h.life<.42&&Math.abs(s.x-h.x)<h.width/2+R.HAZARD_PADDING+4);
  if(dir&&s.invuln<=0&&s.dashCd<=0&&(urgent||danger(s.x)>350)&&Math.abs(target-s.x)>38){if(R.dash(s,dir))stats.dashes++;}
  return Math.abs(target-s.x)>4?Math.sign(target-s.x):0;
}
function normalized(s){const snap=R.snapshot(s);delete snap.fireAnim;return snap;}
function simulate(id,chapter,seed,reload,initial){
  let s=initial||R.create(META,seed,chapter,id),nextSave=30;
  const stats={character:id,chapter,seed,reload,pulses:0,dashes:0,draft:0,shop:0,events:[],fusions:[],saves:0,saveChanges:[]};
  for(let frame=0;frame<60*900&&!['win','lose'].includes(s.phase);frame++){
    chooseModal(s,stats);
    if(s.phase!=='play')continue;
    if(s.charge>=100&&(s.encounter||s.enemies.filter(e=>!e.dead).length>=7||s.enemies.some(e=>e.y>340)||s.bullets.length>=4))if(R.pulse(s))stats.pulses++;
    const move=direction(s,stats);R.step(s,DT,{move});
    if(reload&&s.time>=nextSave&&!['win','lose'].includes(s.phase)){
      const before=normalized(s),restored=R.restore(R.snapshot(s));assert(restored,'run restore failed');
      const after=normalized(restored);if(JSON.stringify(before)!==JSON.stringify(after)){
        const keys=Object.keys(before).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]));stats.saveChanges.push({time:s.time,keys,oldBoss:before.enemies.filter(e=>e.kind==='boss').map(e=>({y:e.y,boss:e.bossId})),newBoss:after.enemies.filter(e=>e.kind==='boss').map(e=>({y:e.y,boss:e.bossId}))});
      }
      s=restored;stats.saves++;nextSave+=30;
    }
  }
  stats.outcome=s.phase;stats.wave=s.wave;stats.time=Number(s.time.toFixed(2));stats.hp=Number(s.hp.toFixed(2));stats.kills=s.kills;stats.catches=s.catches;stats.level=s.level;stats.bosses=s.bossesDefeated;stats.loadout=s.loadout;stats.enemiesLeft=s.enemies.length;
  stats.fingerprint=JSON.stringify(normalized(s));stats.finalState=s;return stats;
}
const results=[];
for(const character of ['forge','warden'])for(const chapter of [1,2])for(const seed of SEEDS){
  const normal=simulate(character,chapter,seed,false),reload=simulate(character,chapter,seed,true),same=normal.fingerprint===reload.fingerprint;
  delete normal.fingerprint;delete reload.fingerprint;delete normal.finalState;delete reload.finalState;results.push({...normal,reloadCheck:{same,saves:reload.saves,changes:reload.saveChanges,outcome:reload.outcome,time:reload.time,hp:reload.hp}});
}
const campaigns=[];
for(const character of ['forge','warden'])for(const seed of SEEDS){
  const first=simulate(character,1,seed,false),reloadedFirst=simulate(character,1,seed,true);assert.equal(first.outcome,'win');assert.equal(first.fingerprint,reloadedFirst.fingerprint);
  let uninterrupted=first.finalState,resumed=reloadedFirst.finalState;const normalMeta=R.settle(uninterrupted,META),reloadMeta=R.settle(resumed,META);
  resumed=R.restore(R.snapshot(resumed));assert(resumed);assert.deepEqual(R.settle(resumed,reloadMeta),normalMeta);assert(R.nextChapter(uninterrupted));assert(R.nextChapter(resumed));
  const second=simulate(character,2,seed,false,uninterrupted),reloadedSecond=simulate(character,2,seed,true,resumed);
  campaigns.push({character,seed,first:{outcome:first.outcome,time:first.time,hp:first.hp,pulses:first.pulses},second:{outcome:second.outcome,time:second.time,hp:second.hp,pulses:second.pulses,bosses:second.bosses,loadout:second.loadout},saveEqual:second.fingerprint===reloadedSecond.fingerprint,checkpointReward:normalMeta.credits-(META.credits||0),saves:reloadedFirst.saves+reloadedSecond.saves+1});
}
const report={method:'Deterministic Node rule simulation; same policy for both characters; auto-aim, keyboard-speed movement, safety/catch steering, charge-gated pulse, legal dash, fixed upgrade/event policy. No HP/enemy/XP cheats. results enters each chapter separately through RF.create; campaigns settles chapter 1 and carries its build through RF.nextChapter, including a win checkpoint reload. Every 30s reload variant is compared to uninterrupted run. Not human play or device performance.',dt:DT,meta:META,seeds:SEEDS,results,campaigns};
fs.mkdirSync(path.resolve('test-results'),{recursive:true});
fs.writeFileSync(path.resolve('test-results/character-sim-results.json'),JSON.stringify(report,null,2)+'\n');
for(const r of results)console.log(JSON.stringify({character:r.character,chapter:r.chapter,seed:r.seed,outcome:r.outcome,wave:r.wave,time:r.time,hp:r.hp,pulses:r.pulses,bosses:r.bosses,saves:r.reloadCheck.saves,saveEqual:r.reloadCheck.same,saveChanges:r.reloadCheck.changes}));
for(const r of campaigns)console.log(JSON.stringify({campaign:true,...r}));
