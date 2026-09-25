/* Rift Forge: independent, deterministic combat rules. No third-party game code. */
const RF = (() => {
  const W=960,H=600,LEFT=112,RIGHT=848,TOP=82,FLOOR=486;
  const TYPES={
    ember:{name:'燼火核',color:'#ff9b64',icon:'焰',power:12,desc:'命中附加灼燒，持續 3 秒。'},
    frost:{name:'霜晶核',color:'#8be3ef',icon:'霜',power:10,desc:'命中減速 45%，持續 2 秒。'},
    spark:{name:'電弧核',color:'#ead384',icon:'雷',power:10,desc:'電弧跳向附近 2 個敵人。'},
    thorn:{name:'毒棘核',color:'#9dd99a',icon:'棘',power:11,desc:'施加持續 4 秒的毒素。'},
    leech:{name:'血珀核',color:'#f394ba',icon:'血',power:13,desc:'每次直接命中回復 0.35 生命。'},
    echo:{name:'裂響核',color:'#bda7ee',icon:'裂',power:9,desc:'首次命中生成 2 顆弱化子彈核。'},
    steam:{name:'熔霜星爆',color:'#ffd9b1',icon:'爆',power:26,desc:'命中產生範圍爆發，同時灼燒與減速。'},
    tempest:{name:'雷枝共振',color:'#b4f3e6',icon:'嵐',power:23,desc:'四目標電弧，首次命中分裂。'},
    plague:{name:'血棘花冠',color:'#e5a6b6',icon:'冠',power:25,desc:'劇毒蔓延周圍敵人，命中回復生命。'}
  };
  const RECIPES=[{a:'ember',b:'frost',out:'steam'},{a:'spark',b:'echo',out:'tempest'},{a:'thorn',b:'leech',out:'plague'}];
  const PASSIVES={
    power:{name:'重鑄棱鏡',desc:'直接傷害 +22%；發射間隔 +7%。'},
    haste:{name:'急速齒輪',desc:'發射間隔 −15%；直接傷害 −5%。'},
    bank:{name:'折射刻印',desc:'每次牆面反彈 +18% 傷害，最多計 3 次。'},
    ward:{name:'生命鍍層',desc:'生命上限 +18，立刻回復 18。'},
    catch:{name:'回收磁環',desc:'接球範圍 +18；回收獲得更多脈衝能量。'}
  };
  const BOSSES={
    maw:{name:'熔獄巨顎',english:'CINDERMAW',subtitle:'看準熔裂預告，閃過重擊',sprite:'maw',color:'#ff9b64',hp:680,r:48,wave:3},
    oracle:{name:'裂星司祭',english:'THE RIFT ORACLE',subtitle:'穿過星隕間隙，優先清除召喚物',sprite:'oracle',color:'#bca8ff',hp:1250,r:43,wave:6},
    bell:{name:'熔鐘守衛',english:'THE BELL GUARDIAN',subtitle:'封鎖線最後的試煉',sprite:'boss',color:'#f0bf81',hp:2000,r:54,wave:9}
  };
  const ENCOUNTERS={
    spring:{name:'月泉餘燼',tag:'REST / 休整',desc:'鑄造所深處，一池仍未冷卻的月泉映出你的輪廓。',color:'#8be3ef',choices:[{id:'heal',title:'飲下月泉',desc:'立即回復 32 生命。'},{id:'ward',title:'淬鍊護甲',desc:'本局生命上限 +12，並回復 12 生命。'}]},
    cache:{name:'封存的行囊',tag:'DISCOVERY / 遺藏',desc:'前一位鍊金師留下的行囊裡，碎晶與配方都還完好。',color:'#ead384',choices:[{id:'coins',title:'帶走碎晶',desc:'獲得 24 碎晶，可用於補給或帶回基地。'},{id:'reroll',title:'抄錄配方',desc:'本局重抽次數 +2。'}]},
    altar:{name:'猩紅契壇',tag:'SACRIFICE / 獻祭',desc:'石壇索取鮮血，也承諾更熾烈的力量。代價由你決定。',color:'#f394ba',choices:[{id:'power',title:'以血重鑄',desc:'失去 18 生命；本局直接傷害 +18%。生命須高於 18。'},{id:'heal',title:'熄滅祭火',desc:'拒絕契約，回復 12 生命。'}]},
    rift:{name:'失控的共鳴',tag:'ANOMALY / 裂隙',desc:'裂隙正在放大所有攻擊。你可以承受風險，也可以把它封住。',color:'#bda7ee',choices:[{id:'pact',title:'接受共鳴',desc:'本波及其頭目戰：直接傷害 +35%，受到的傷害 +25%。'},{id:'seal',title:'封住裂隙',desc:'安全回收能量，脈衝充能 +35%。'}]},
    merchant:{name:'迷途的鑄匠',tag:'TRADE / 交易',desc:'一位鑄匠願意替你的彈核刻上折射紋路。',color:'#9dd99a',choices:[{id:'bank',title:'購買折射刻印',desc:'花費 18 碎晶；折射刻印 +1（上限 4）。'},{id:'coins',title:'交換沿途見聞',desc:'獲得 8 碎晶，不需支付費用。'}]}
  };
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function rand(s){s.rng=(Math.imul(1664525,s.rng)+1013904223)>>>0;return s.rng/4294967296;}
  function shuffle(s,a){a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(rand(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function metaSafe(m={}){const num=(x,max)=>Number.isFinite(x)?clamp(Math.floor(x),0,max):0;return {v:1,credits:num(m.credits,1e7),forge:num(m.forge,5),ward:num(m.ward,5),archive:num(m.archive,3),runs:num(m.runs,1e6),wins:num(m.wins,1e6),best:num(m.best,1e7)};}
  function create(meta={},seed=Date.now()){
    meta=metaSafe(meta);
    const s={v:1,rng:seed>>>0,phase:'play',time:0,wave:1,waveTime:0,nextSpawn:0.4,spawned:0,bossSpawned:false,
      hp:100+meta.ward*12,maxHp:100+meta.ward*12,x:480,aimX:480,aimY:140,auto:true,invuln:0,dashCd:0,charge:40,
      level:1,xp:0,xpNeed:9,coins:0,kills:0,catches:0,rerolls:2+meta.archive,loadout:[{id:'ember',level:1},{id:'frost',level:1}],
      passives:{power:0,haste:0,bank:0,ward:0,catch:0},forge:meta.forge,shotCd:0,shotIndex:0,fireAnim:0,lastCore:'ember',moveDir:0,aimAngle:-Math.PI/2,
      enemies:[],balls:[],bullets:[],fx:[],ghosts:[],texts:[],events:[],offers:[],uid:0,damage:{},peakBalls:0,peakEnemies:0,paid:false,telegraph:0,lane:0,
      encounter:null,bossesDefeated:[],hazards:[],eventOrder:[],eventIndex:0,encounterEvent:null,eventHistory:[],alterations:{power:1},pact:null};
    spawn(s,'guard',350,134);spawn(s,'guard',480,116);spawn(s,'guard',610,134);s.eventOrder=shuffle(s,Object.keys(ENCOUNTERS));return s;
  }
  function spawn(s,kind,x,y,bossId='bell'){if(s.enemies.length>=70)return;
    const stats={guard:[26,29,8],runner:[19,19,16],seer:[23,23,7],boss:[54,2000,0]}[kind];
    if(!stats||kind==='boss'&&!BOSSES[bossId])return;const boss=kind==='boss'&&BOSSES[bossId];
    // Keep the full crown/shoulders below the arena edge and boss health bar.
    if(boss)y=Math.max(232,y);
    const hp=boss?boss.hp:stats[1]*(1+(s.wave-1)*0.25);
    s.enemies.push({id:++s.uid,kind,...(boss?{bossId,attack:0,summon:8}:{}),x,y,r:boss?boss.r:stats[0],hp,maxHp:hp,speed:stats[2],slow:0,burn:0,poison:0,burnD:0,poisonD:0,burnOwner:'ember',poisonOwner:'thorn',flash:0,cast:0,age:0,shot:boss?2.2:2+rand(s)*2,seed:rand(s)*6.28,dead:false});
  }
  function fx(s,type,x,y,color,size=1,x2=0,y2=0,core=''){if(s.fx.length>=210)return;const life=type==='pulse'?.75:type==='death'?.6:type==='muzzle'?.18:type==='wall'?.28:['nova','bloom','siphon'].includes(type)?.65:type==='impact'?.48:.4;s.fx.push({type,x,y,color,size,x2,y2,core,life,max:life});}
  function event(s,type){if(s.events.length<12)s.events.push(type);}
  function hit(s,e,d,owner,secondary=false){if(e.dead||d<=0)return;
    const actual=Math.min(e.hp,d);e.hp-=actual;e.flash=Math.max(e.flash,!secondary?.12:actual>2?.07:0);s.damage[owner]=(s.damage[owner]||0)+actual;
    if(!secondary&&s.texts.length<32)s.texts.push({x:e.x+(rand(s)-0.5)*15,y:e.y-15,text:Math.round(d),life:0.65,color:TYPES[owner]?.color||'#fff'});
    if(e.hp<=0){e.dead=true;if(s.ghosts.length>=28)s.ghosts.shift();s.ghosts.push({kind:e.kind,bossId:e.bossId,x:e.x,y:e.y,r:e.r,life:.55,max:.55,seed:e.seed});s.kills++;s.xp+=e.kind==='boss'?30:3;s.coins+=e.kind==='boss'?35:2;s.charge=clamp(s.charge+3,0,100);fx(s,'death',e.x,e.y,TYPES[owner]?.color||'#edc889',e.r/12);event(s,'kill');if(e.kind==='boss')defeatBoss(s,e.bossId||'bell');}
  }
  function beginBoss(s,id){if(!BOSSES[id]||s.encounter)return false;s.encounter=id;s.bossSpawned=true;s.enemies=[];s.balls=[];s.bullets=[];s.hazards=[];s.telegraph=0;spawn(s,'boss',480,155,id);event(s,'boss');return true;}
  function advanceWave(s){s.wave++;s.waveTime=0;s.nextSpawn=1.6;s.pact=null;event(s,'wave');
    if(s.wave===9){beginBoss(s,'bell');return;}
    if(s.wave===4||s.wave===7){s.phase='shop';makeOffers(s);}
    else if([3,6,8].includes(s.wave))openEncounter(s);
  }
  function defeatBoss(s,id){if(!s.bossesDefeated.includes(id))s.bossesDefeated.push(id);s.encounter=null;s.bullets=[];s.hazards=[];s.telegraph=0;
    if(id==='bell'){s.phase='win';s.offers=[];event(s,'win');return;}
    s.enemies=[];s.balls=[];s.hp=Math.min(s.maxHp,s.hp+18);s.charge=clamp(s.charge+25,0,100);advanceWave(s);event(s,'boss-clear');
  }
  function openEncounter(s){if(s.phase!=='play'||s.encounter)return false;const id=s.eventOrder[s.eventIndex];if(!ENCOUNTERS[id])return false;s.eventIndex++;s.encounterEvent=id;s.phase='event';s.offers=[];event(s,'encounter');return true;}
  function eventChoices(s){const data=ENCOUNTERS[s.encounterEvent];if(!data)return [];return data.choices.map(c=>({...c,disabled:(c.id==='power'&&s.hp<=18)||(c.id==='bank'&&(s.coins<18||s.passives.bank>=4))})).concat({id:'leave',title:'繼續前進',desc:'不接受任何效果。',disabled:false});}
  function chooseEncounter(s,id){if(s.phase!=='event'||!eventChoices(s).some(c=>c.id===id&&!c.disabled))return false;const encounter=s.encounterEvent;
    if(id!=='leave'){
      if(encounter==='spring'){if(id==='ward')s.maxHp+=12;s.hp=Math.min(s.maxHp,s.hp+(id==='ward'?12:32));}
      if(encounter==='cache'){if(id==='coins')s.coins+=24;else s.rerolls+=2;}
      if(encounter==='altar'){if(id==='power'){s.hp-=18;s.alterations.power+=.18;}else s.hp=Math.min(s.maxHp,s.hp+12);}
      if(encounter==='rift'){if(id==='pact')s.pact={wave:s.wave,damage:1.35,incoming:1.25};else s.charge=clamp(s.charge+35,0,100);}
      if(encounter==='merchant'){if(id==='bank'){s.coins-=18;s.passives.bank++;}else s.coins+=8;}
    }
    s.eventHistory.push({id:encounter,choice:id,wave:s.wave});s.encounterEvent=null;s.phase='play';event(s,'upgrade');return true;
  }
  function hazard(s,x,width,kind,delay=1.25){if(s.hazards.length>=12)return;s.hazards.push({x:clamp(x,LEFT+width/2,RIGHT-width/2),width,kind,life:delay,max:delay,damage:kind==='star'?17:20});}
  function enemyBall(s,e,angle,speed,kind){if(s.bullets.length<90)s.bullets.push({x:e.x,y:e.y+15,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:6,life:8,kind});}
  function bossAttack(s,e){const id=e.bossId||'bell',rage=e.hp<e.maxHp*.5;e.attack=(e.attack||0)+1;e.cast=.35;
    if(id==='maw'){const n=rage?7:5;for(let i=0;i<n;i++)enemyBall(s,e,Math.PI*.22+i/(n-1)*Math.PI*.56,rage?154:128,'maw');hazard(s,s.x,rage?108:86,'fissure',1.3);e.shot=rage?2.5:3.2;}
    else if(id==='oracle'){const aim=Math.atan2(520-e.y,s.x-e.x);for(let i=-2;i<=2;i++)enemyBall(s,e,aim+i*.16,rage?176:148,'oracle');const target=clamp(s.x,LEFT+55,RIGHT-55);hazard(s,target,78,'star',1.45);if(rage)hazard(s,target<480?target+155:target-155,78,'star',1.45);e.shot=rage?2.3:3.1;}
    else{const n=rage?9:5;for(let i=0;i<n;i++)enemyBall(s,e,Math.PI*.18+i/(n-1)*Math.PI*.64,rage?150:132,'boss');if(rage||e.attack%2===0)hazard(s,s.x,rage?92:72,'bell',1.3);e.shot=rage?1.9:2.7;}
  }
  function impact(s,b,e){
    const id=b.type,lv=b.level,kind=TYPES[id];const d=b.power*(1+s.passives.bank*.18*Math.min(3,b.banks));
    hit(s,e,d,id);fx(s,'impact',b.x,b.y,kind.color,1,b.vx,b.vy,id);event(s,'hit');
    const fire=id==='ember'||id==='steam',cold=id==='frost'||id==='steam';
    if(fire){e.burn=3;e.burnD=4+lv*3;e.burnOwner=id;}if(cold)e.slow=2;
    if(id==='thorn'||id==='plague'){e.poison=4;e.poisonD=4+lv*4;e.poisonOwner=id;}
    if(id==='leech'||id==='plague'){s.hp=Math.min(s.maxHp,s.hp+(id==='plague'?1.1:.35));fx(s,'siphon',e.x,e.y,kind.color,1,s.x,518,id);}
    if(id==='spark'||id==='tempest'){
      let last=e;const seen=new Set([e.id]);for(let n=0;n<(id==='tempest'?4:2);n++){
        const near=s.enemies.filter(q=>!q.dead&&!seen.has(q.id)&&dist(q,last)<160).sort((a,c)=>dist(a,last)-dist(c,last))[0];
        if(!near)break;hit(s,near,d*.55,id,true);fx(s,'arc',last.x,last.y,kind.color,1,near.x,near.y,id);seen.add(near.id);last=near;
      }
    }
    if(id==='steam'||id==='plague'){
      fx(s,id==='steam'?'nova':'bloom',e.x,e.y,kind.color,id==='steam'?3:2.2,0,0,id);
      for(const q of s.enemies)if(!q.dead&&q.id!==e.id&&dist(q,e)<(id==='steam'?86:68)){
        if(id==='steam'){hit(s,q,d*.65,id,true);q.slow=1.5;q.burn=3;q.burnD=9;q.burnOwner=id;}
        else{q.poison=4;q.poisonD=14;q.poisonOwner=id;}
      }
    }
    if((id==='echo'||id==='tempest')&&b.generation===0&&!b.split){
      b.split=true;for(const a of [-.65,.65]){const angle=Math.atan2(b.vy,b.vx)+a;ball(s,id,lv,b.x,b.y,Math.cos(angle)*450,Math.sin(angle)*450,b.power*.42,1);}
    }
  }
  function ball(s,type,level,x,y,vx,vy,power,generation=0){if(s.balls.length>=140)return;s.balls.push({type,level,x,y,vx,vy,power,generation,r:generation?4:6,age:0,banks:0,last:-1,lock:0,split:false,dead:false});s.peakBalls=Math.max(s.peakBalls,s.balls.length);}
  function shoot(s){
    if(s.balls.length>=140)return;
    let tx=s.aimX,ty=Math.min(450,s.aimY);
    if(s.auto){const target=s.enemies.filter(e=>!e.dead).sort((a,b)=>(b.y*1.8-Math.abs(b.x-s.x))-(a.y*1.8-Math.abs(a.x-s.x)))[0];if(target){tx=target.x;ty=target.y;}else{tx=480+Math.sin(s.time)*180;ty=140;}}
    const muzzleX=s.x+14,muzzleY=493;let dx=tx-muzzleX,dy=Math.min(-55,ty-muzzleY);const len=Math.hypot(dx,dy);dx/=len;dy/=len;
    const item=s.loadout[s.shotIndex++%s.loadout.length],power=TYPES[item.id].power*(1+(item.level-1)*.6)*(1+s.forge*.045)*(1+s.passives.power*.22)*Math.pow(.95,s.passives.haste)*s.alterations.power*(s.pact?.wave===s.wave?s.pact.damage:1);
    s.fireAnim=.14;s.lastCore=item.id;s.aimAngle=Math.atan2(dy,dx);ball(s,item.id,item.level,muzzleX,muzzleY,dx*470,dy*470,power);fx(s,'muzzle',muzzleX,muzzleY,TYPES[item.id].color,.7,dx,dy,item.id);
    s.shotCd=.27*Math.pow(.85,s.passives.haste)*Math.pow(1.07,s.passives.power);
  }
  function damagePlayer(s,d){if(s.phase!=='play'||s.invuln>0)return;s.hp=Math.max(0,s.hp-d*(s.pact?.wave===s.wave?s.pact.incoming:1));s.invuln=.55;fx(s,'hurt',s.x,520,'#f37878',2);event(s,'hurt');if(s.hp<=0){s.phase='lose';s.offers=[];event(s,'lose');}}
  function ready(s){return RECIPES.filter(r=>s.loadout.some(i=>i.id===r.a&&i.level===3)&&s.loadout.some(i=>i.id===r.b&&i.level===3));}
  function evolve(s,out){const r=ready(s).find(r=>r.out===out);if(!r)return false;s.loadout=s.loadout.filter(i=>i.id!==r.a&&i.id!==r.b);s.loadout.push({id:out,level:1});event(s,'evolve');fx(s,'ring',s.x,500,TYPES[out].color,5);return true;}
  function makeOffers(s){
    const balls=[];for(const [id,t] of Object.entries(TYPES)){const own=s.loadout.find(i=>i.id===id);if(own&&own.level<3)balls.push({kind:'ball',id,title:t.name+' '+(own.level+1)+' 階',desc:'直接傷害提高，保留球核特性。',tag:'強化已有彈核'});else if(!own&&s.loadout.length<4&&!RECIPES.some(r=>r.out===id))balls.push({kind:'ball',id,title:t.name+' 1 階',desc:t.desc,tag:'新彈核 · 佔用 1 格'});}
    const pool=balls.concat(Object.entries(PASSIVES).filter(([id])=>s.passives[id]<4).map(([id,p])=>({kind:'passive',id,title:p.name,desc:p.desc,tag:'刻印 · 含明確取捨'})));
    const own=shuffle(s,balls.filter(o=>s.loadout.some(i=>i.id===o.id)))[0];
    const picks=shuffle(s,pool.filter(o=>o!==own)).slice(0,own?2:3);if(own)picks.unshift(own);
    while(picks.length<3)picks.push({kind:'heal',id:'heal'+picks.length,title:'補給藥劑',desc:'回復 28 生命，滿血時改獲得 8 碎晶。',tag:'補給'});
    s.offers=picks;return picks;
  }
  function applyOffer(s,index){if(!['draft','shop'].includes(s.phase))return false;const o=s.offers[index];if(!o)return false;
    if(s.phase==='shop'&&s.coins<10)return false;if(s.phase==='shop')s.coins-=10;
    if(o.kind==='ball'){const i=s.loadout.find(i=>i.id===o.id);if(i)i.level=Math.min(3,i.level+1);else if(s.loadout.length<4)s.loadout.push({id:o.id,level:1});else return false;}
    if(o.kind==='passive'){s.passives[o.id]++;if(o.id==='ward'){s.maxHp+=18;s.hp=Math.min(s.maxHp,s.hp+18);}}
    if(o.kind==='heal'){if(s.hp===s.maxHp)s.coins+=8;else s.hp=Math.min(s.maxHp,s.hp+28);}
    s.offers=[];s.phase='play';event(s,'upgrade');return true;
  }
  function reroll(s){if(!['draft','shop'].includes(s.phase)||s.rerolls<=0)return false;s.rerolls--;makeOffers(s);return true;}
  function pulse(s){if(s.phase!=='play'||s.charge<100)return false;s.charge=0;s.bullets=[];for(const e of s.enemies){hit(s,e,e.kind==='boss'?65:25,'pulse',true);e.y=Math.max(TOP+e.r,e.y-70);e.slow=2;}fx(s,'pulse',s.x,500,'#d6ecea',12);event(s,'pulse');return true;}
  function dash(s,dir=1){if(s.phase!=='play'||s.dashCd>0)return false;const from=s.x;s.x=clamp(s.x+dir*125,LEFT+22,RIGHT-22);fx(s,'dash',from,520,'#a3dfeb',1,s.x,520);s.invuln=.65;s.dashCd=3.5;fx(s,'ring',s.x,520,'#a3dfeb',2);event(s,'dash');return true;}
  function step(s,dt,input={}){
    if(s.phase!=='play')return;dt=clamp(dt,0,1/30);s.time+=dt;if(!s.encounter)s.waveTime+=dt;s.shotCd-=dt;s.invuln=Math.max(0,s.invuln-dt);s.dashCd=Math.max(0,s.dashCd-dt);s.fireAnim=Math.max(0,(s.fireAnim||0)-dt);s.moveDir=input.move||0;for(const g of s.ghosts)g.life-=dt;s.ghosts=s.ghosts.filter(g=>g.life>0);
    s.x=clamp(s.x+(input.move||0)*330*dt,LEFT+22,RIGHT-22);
    if(Number.isFinite(input.x))s.x=clamp(input.x,LEFT+22,RIGHT-22);
    for(const f of s.fx)f.life-=dt;for(const t of s.texts){t.life-=dt;t.y-=28*dt;}s.fx=s.fx.filter(f=>f.life>0);s.texts=s.texts.filter(t=>t.life>0);
    if(s.shotCd<=0)shoot(s);
    if(s.wave<=8&&!s.encounter){s.nextSpawn-=dt;if(s.nextSpawn<=0){const count=s.wave<3?2:3;for(let j=0;j<count;j++){const k=rand(s);spawn(s,k<.52?'guard':k<.79?'runner':'seer',LEFT+40+rand(s)*(RIGHT-LEFT-80),TOP+27);}s.nextSpawn=Math.max(1.7,4-s.wave*.2);}}
    if(s.waveTime>=24&&s.wave<=8&&!s.encounter){const id=s.wave===3?'maw':s.wave===6?'oracle':null;if(id&&!s.bossesDefeated.includes(id))beginBoss(s,id);else advanceWave(s);if(s.phase!=='play')return;}
    for(const e of s.enemies){if(e.dead)continue;e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.cast=Math.max(0,(e.cast||0)-dt);e.slow=Math.max(0,e.slow-dt);
      if(e.burn>0){e.burn-=dt;hit(s,e,e.burnD*dt,e.burnOwner,true);}if(e.poison>0){e.poison-=dt;hit(s,e,e.poisonD*dt,e.poisonOwner,true);}if(e.dead)continue;
      e.y+=e.speed*(e.slow>0?.55:1)*dt;
      if(e.kind==='boss'){e.x=480+Math.sin(e.age*(e.bossId==='maw'?.48:.7))*(e.bossId==='maw'?200:160);if(e.bossId==='oracle'){e.summon-=dt;if(e.summon<=0){spawn(s,'seer',clamp(e.x-90,LEFT+25,RIGHT-25),TOP+35);spawn(s,'seer',clamp(e.x+90,LEFT+25,RIGHT-25),TOP+35);e.summon=e.hp<e.maxHp*.5?8:11;}}}
      if(e.kind==='runner')e.x=clamp(e.x+Math.sin(e.age*4+e.seed)*16*dt,LEFT+e.r,RIGHT-e.r);
      if(e.kind==='seer'||e.kind==='boss'){
        e.shot-=dt;if(e.shot<=0){if(e.kind==='boss')bossAttack(s,e);else{e.cast=.28;enemyBall(s,e,Math.atan2(520-e.y,s.x-e.x),150,'seer');e.shot=4;}}
      }
      if(e.y+e.r>=FLOOR){e.dead=true;damagePlayer(s,e.kind==='guard'?14:e.kind==='runner'?10:12);}
    }
    if(s.phase!=='play')return;
    for(const h of s.hazards){h.life-=dt;if(h.life<=0){fx(s,'hazard',h.x,520,h.kind==='star'?'#c5aaff':'#ff9b64',h.width,0,0,h.kind);if(Math.abs(s.x-h.x)<h.width/2+12)damagePlayer(s,h.damage);}}s.hazards=s.hazards.filter(h=>h.life>0);
    if(s.telegraph>0){s.telegraph-=dt;if(s.telegraph<=0){fx(s,'arc',s.lane,TOP,'#ff767b',4,s.lane,540);if(Math.abs(s.x-s.lane)<43)damagePlayer(s,20);}}
    if(s.phase!=='play')return;
    const active=s.enemies.filter(e=>!e.dead);s.peakEnemies=Math.max(s.peakEnemies,active.length);
    for(let bi=0,limit=s.balls.length;bi<limit;bi++){const b=s.balls[bi];if(!b||b.dead)continue;b.trail??=[];b.trailClock=(b.trailClock||0)+dt;if(b.trailClock>=.025){b.trail.push({x:b.x,y:b.y});if(b.trail.length>7)b.trail.shift();b.trailClock=0;}b.age+=dt;b.lock=Math.max(0,b.lock-dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(b.x-b.r<LEFT){b.x=LEFT+b.r;b.vx=Math.abs(b.vx);b.banks++;fx(s,'wall',b.x,b.y,TYPES[b.type].color,.35);}if(b.x+b.r>RIGHT){b.x=RIGHT-b.r;b.vx=-Math.abs(b.vx);b.banks++;fx(s,'wall',b.x,b.y,TYPES[b.type].color,.35);}
      if(b.y-b.r<TOP){b.y=TOP+b.r;b.vy=Math.abs(b.vy);b.banks++;fx(s,'wall',b.x,b.y,TYPES[b.type].color,.35);}
      for(const e of active){if(e.dead||(e.id===b.last&&b.lock>0))continue;const dx=b.x-e.x,dy=b.y-e.y,r=b.r+e.r;if(Math.abs(dx)>r||Math.abs(dy)>r)continue;const distance=Math.hypot(dx,dy);if(distance<r){const nx=distance?dx/distance:0,ny=distance?dy/distance:-1,dot=b.vx*nx+b.vy*ny;b.x=e.x+nx*(r+.5);b.y=e.y+ny*(r+.5);if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;}b.last=e.id;b.lock=.1;impact(s,b,e);break;}}
      if(b.y>518){if(Math.abs(b.x-s.x)<52+s.passives.catch*18){s.catches++;s.charge=clamp(s.charge+1+s.passives.catch*.35,0,100);fx(s,'catch',b.x,516,TYPES[b.type].color,.6);}b.dead=true;}
      if(b.age>12)b.dead=true;
    }
    for(const b of s.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-s.x,b.y-520)<18+b.r){damagePlayer(s,8);b.life=0;}if(b.x<LEFT-30||b.x>RIGHT+30||b.y>570)b.life=0;}
    s.enemies=s.enemies.filter(e=>!e.dead);s.balls=s.balls.filter(b=>!b.dead);s.bullets=s.bullets.filter(b=>b.life>0);
    if(s.phase==='play'&&s.xp>=s.xpNeed){s.xp-=s.xpNeed;s.level++;s.xpNeed=Math.round(s.xpNeed*1.18+2);s.phase='draft';makeOffers(s);event(s,'draft');}
  }
  function settle(s,m){m=metaSafe(m);if(!['win','lose'].includes(s.phase)||s.paid)return m;s.paid=true;const reward=Math.floor(s.coins*.7)+s.wave*5+(s.phase==='win'?80:0);m.credits+=reward;m.runs++;if(s.phase==='win')m.wins++;m.best=Math.max(m.best,s.kills);return m;}
  function cost(m,k){return 50+metaSafe(m)[k]*45;}
  function buy(m,k){if(!['forge','ward','archive'].includes(k))return false;const max=k==='archive'?3:5,c=cost(m,k);if(m[k]>=max||m.credits<c)return false;m.credits-=c;m[k]++;return true;}
  function snapshot(s){const o=JSON.parse(JSON.stringify(s));o.events=[];o.fx=[];o.ghosts=[];o.texts=[];for(const b of o.balls){delete b.trail;delete b.trailClock;}return o;}
  function restore(raw){try{
    if(!raw||raw.v!==1||!['play','pause','draft','shop','event'].includes(raw.phase)||!Array.isArray(raw.loadout)||raw.loadout.length<1||raw.loadout.length>4)return null;
    if(raw.loadout.some(i=>!TYPES[i.id]||![1,2,3].includes(i.level)))return null;
    if(!Number.isFinite(raw.hp)||raw.hp<=0||raw.hp>1000||!Number.isFinite(raw.time)||raw.time<0||!Number.isFinite(raw.wave)||raw.wave<1||raw.wave>9)return null;
    for(const [k,max] of [['balls',140],['enemies',70],['bullets',90]])if(!Array.isArray(raw[k])||raw[k].length>max||raw[k].some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)))return null;
    if(raw.enemies.some(e=>!['guard','runner','seer','boss'].includes(e.kind)||e.bossId&&!BOSSES[e.bossId]))return null;
    if(raw.encounter&&!BOSSES[raw.encounter]||raw.phase==='event'&&!ENCOUNTERS[raw.encounterEvent])return null;
    if(raw.hazards&&(!Array.isArray(raw.hazards)||raw.hazards.length>12||raw.hazards.some(h=>!Number.isFinite(h.x)||!Number.isFinite(h.width)||h.width<1||h.width>200||!Number.isFinite(h.life)||h.life<0||h.life>5||!Number.isFinite(h.max)||h.max<=0||!Number.isFinite(h.damage)||!['star','fissure','bell'].includes(h.kind))))return null;
    if(raw.eventOrder&&(!Array.isArray(raw.eventOrder)||raw.eventOrder.length!==5||new Set(raw.eventOrder).size!==5||raw.eventOrder.some(id=>!ENCOUNTERS[id])))return null;
    if(raw.eventIndex!==undefined&&(!Number.isInteger(raw.eventIndex)||raw.eventIndex<0||raw.eventIndex>5))return null;
    if(raw.alterations&&(!Number.isFinite(raw.alterations.power)||raw.alterations.power<1||raw.alterations.power>2))return null;
    if(raw.pact&&(!Number.isInteger(raw.pact.wave)||raw.pact.damage!==1.35||raw.pact.incoming!==1.25))return null;
    if(raw.bossesDefeated&&(!Array.isArray(raw.bossesDefeated)||raw.bossesDefeated.length>3||raw.bossesDefeated.some(id=>!BOSSES[id])))return null;
    const s=Object.assign(create({},1),raw);s.events=[];s.fx=[];s.ghosts=[];s.texts=[];s.fireAnim=0;
    // Existing 0.5 runs retain their current wave and do not replay missed events.
    if(raw.eventOrder===undefined)s.eventIndex=[3,6,8].filter(w=>w<=s.wave).length;
    for(const e of s.enemies)if(e.kind==='boss'){e.bossId??='bell';e.attack??=0;e.summon??=8;e.y=Math.max(232,e.y);s.encounter=e.bossId;}
    if(s.phase==='pause')s.phase='play';return s;
  }catch{return null;}}
  return {W,H,LEFT,RIGHT,TOP,FLOOR,TYPES,RECIPES,PASSIVES,BOSSES,ENCOUNTERS,clamp,rand,create,spawn,step,hit,impact,ball,ready,evolve,makeOffers,applyOffer,reroll,pulse,dash,settle,buy,cost,metaSafe,snapshot,restore,beginBoss,openEncounter,eventChoices,chooseEncounter};
})();
if(typeof module!=='undefined')module.exports=RF;
