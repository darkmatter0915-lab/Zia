
'use strict';
const $=s=>document.querySelector(s),C=$('#game'),X=C.getContext('2d'),P=$('#panel'),F=$('#floor'),G=$('#gold'),SO=$('#souls'),LOG=$('#log'),MSG=$('#msg');X.imageSmoothingEnabled=false;
const CL=[
['戰士','WARRIOR','#d34a38','近戰・防禦',150,23,[['⚔','重劈',1,'hit',1.35],['🛡','盾擊',2,'stun',.9],['🔥','背水',4,'buff',.35]]],
['法師','MAGE','#3988e7','遠程・爆發',92,28,[['🔥','火球',1,'hit',1.55],['❄','冰霜新星',3,'aoe',.85],['✦','奧術光束',4,'hit',2.4]]],
['補師','HEALER','#e9c85b','治療・支援',110,16,[['✚','治癒之光',1,'heal',.42],['◇','聖光屏障',3,'shield',.35],['♬','復甦鐘鳴',5,'revive',.45]]],
['弓箭手','ARCHER','#62b944','遠程・機動',100,24,[['➶','穿透箭',1,'hit',1.45],['⋰','箭雨',3,'aoe',.9],['↯','疾風連射',4,'multi',.62]]],
['盜賊','ROGUE','#9c52cf','爆擊・暗影',94,27,[['†','背刺',1,'crit',1.9],['☁','煙幕',3,'dodge',.55],['✣','暗影亂舞',4,'multi',.72]]],
['聖騎士','PALADIN','#e4a62d','坦克・制裁',165,20,[['🔨','審判鎚',2,'stun',1.2],['⬡','輝耀守護',3,'shield',.48],['➤','神聖衝鋒',4,'aoe',1.15]]],
['死靈法師','NECROMANCER','#7c3fc4','召喚・吸血',96,25,[['骨','骨矛',1,'hit',1.45],['☠','召喚怨靈',3,'aoe',.8],['◌','靈魂汲取',4,'drain',1.6]]],
['武僧','MONK','#d77c35','連擊・氣功',118,22,[['拳','百裂拳',1,'multi',.52],['◎','氣功爆',3,'aoe',.95],['禪','無念之境',4,'buff',.45]]],
['煉金術師','ALCHEMIST','#91b938','毒素・炸藥',104,21,[['⚗','劇毒瓶',1,'poison',1.0],['●','爆裂燒瓶',3,'aoe',1.05],['✚','萬能靈藥',4,'heal',.32]]],
['馴獸師','BEAST TAMER','#3ba89d','夥伴・獵殺',116,22,[['狼','戰狼撲擊',1,'hit',1.5],['◆','獵鷹標記',2,'mark',.25],['♞','群獸呼喚',4,'multi',.7]]],
['魔劍士','SPELLBLADE','#3f72df','近遠・元素',120,25,[['火','烈焰劍鋒',1,'hit',1.55],['╱','魔力斬波',2,'aoe',.8],['∞','元素轉換',4,'buff',.5]]],
['工程師','ENGINEER','#d77b2e','砲塔・機關',112,23,[['⚙','部署砲塔',2,'multi',.5],['✹','磁暴地雷',3,'stun',.9],['➹','火箭齊射',4,'aoe',1.2]]]
];
const EN=[['骷髏兵',54,11,'skel'],['洞穴蝙蝠',38,9,'bat'],['腐化史萊姆',70,10,'slime'],['暗影信徒',58,13,'cult'],['骸骨守衛',94,15,'guard']];
const ITEMS=[['⚔','裂骨劍','atk'],['🪓','熔火戰斧','atk'],['🔮','幽藍法杖','atk'],['🏹','荊棘長弓','atk'],['🛡','守望者鎧甲','hp'],['🥋','影行者皮甲','hp'],['📿','重生指環','crit'],['💎','虛空寶石','crit'],['⚙','命運齒輪','soul']];
const BI=[['#100a18','#241130','#392144'],['#190706','#46130d','#6d2615'],['#07101c','#102e45','#1e4e69'],['#07150f','#123b29','#1b5b35'],['#120b18','#30203c','#59396b']];
let meta;try{meta=JSON.parse(localStorage.drMobile||'{}')}catch{meta={}}meta={souls:0,runs:0,best:0,up:{hp:0,atk:0,luck:0},...meta,up:{hp:0,atk:0,luck:0,...(meta.up||{})}};
let S={screen:'title',sel:[0,1,2,3],party:[],enemies:[],floor:1,gold:0,kills:0,turn:0,phase:'hero',target:0,logs:[],particles:[],loot:[],shake:0};let t=0,locked=false;
const save=()=>localStorage.drMobile=JSON.stringify(meta);const rnd=(a,b=0)=>Math.random()*(a-b)+b;const ri=(a,b=0)=>Math.floor(rnd(a,b));const alive=a=>a.filter(x=>x.hp>0);
function sound(f=220,d=.05){try{let A=sound.a||(sound.a=new(window.AudioContext||webkitAudioContext)),o=A.createOscillator(),g=A.createGain();o.type='square';o.frequency.value=f;g.gain.value=.035;o.connect(g);g.connect(A.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,A.currentTime+d);o.stop(A.currentTime+d)}catch{}}
function toast(s){MSG.textContent=s;MSG.classList.add('show');clearTimeout(toast.i);toast.i=setTimeout(()=>MSG.classList.remove('show'),1200)}function log(s){S.logs.unshift(s);S.logs=S.logs.slice(0,4);LOG.innerHTML=S.logs.join('<br>')}
function stats(){F.textContent=S.screen==='play'?S.floor:'-';G.textContent=S.gold;SO.textContent=meta.souls}
function showTitle(){S.screen='title';stats();P.innerHTML=`<div class="center"><button class="big" onclick="showSelect()">⚔ 開始冒險</button><button class="sub" onclick="showUpgrades()">✦ 永久強化</button><div class="hint">12 大職業 · 隨機地下城 · 裝備掉落 · 死亡重生</div></div>`}
function showSelect(){S.screen='select';renderRoster()}
function miniPortrait(i){return `<canvas class="portrait" width="38" height="38" data-portrait="${i}"></canvas>`}
function renderRoster(){P.style.height='150px';P.style.minHeight='150px';P.innerHTML=`<div class="roster">${CL.map((c,i)=>`<button class="card ${S.sel.includes(i)?'on':''}" onclick="pick(${i})">${miniPortrait(i)}<div class="cn">${c[0]}</div><div class="en">${c[1]}</div><div class="role">${c[3]}</div>${S.sel.includes(i)?'<b class="check">✓</b>':''}</button>`).join('')}</div><div class="center" style="height:auto;margin-top:6px"><button class="big" onclick="startRun()">進入地下城 (${S.sel.length}/4)</button></div>`;setTimeout(drawPortraits)}
function drawPortraits(){document.querySelectorAll('[data-portrait]').forEach(c=>{let i=+c.dataset.portrait,x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,38,38);drawUnit(x,{cls:i,hp:1,max:1},19,32,1.15,false)})}
function pick(i){let q=S.sel.indexOf(i);if(q>=0)S.sel.splice(q,1);else if(S.sel.length<4)S.sel.push(i);else return toast('隊伍最多四人');renderRoster()}
function makeHero(i){let c=CL[i],max=Math.round(c[4]*(1+meta.up.hp*.08));return{cls:i,name:c[0],hp:max,max,atk:Math.round(c[5]*(1+meta.up.atk*.07)),cd:[0,0,0],shield:0,dodge:0,buff:0,dead:false}}
function startRun(){if(!S.sel.length)return toast('至少選一個職業');P.style.height='114px';P.style.minHeight='114px';S.party=S.sel.map(makeHero);S.floor=1;S.gold=0;S.kills=0;S.turn=0;S.logs=[];S.screen='play';spawn();}
function spawn(){S.enemies=[];let boss=S.floor%5===0,n=boss?1:Math.min(4,2+Math.floor(S.floor/3));if(boss){let m=420+S.floor*55;S.enemies.push({name:'骸骨霸主',hp:m,max:m,atk:20+S.floor*2,type:'boss',stun:0,poison:0,mark:0})}else for(let i=0;i<n;i++){let e=EN[ri(Math.min(EN.length,2+Math.floor(S.floor/2)))],m=Math.round(e[1]*(1+S.floor*.12));S.enemies.push({name:e[0],hp:m,max:m,atk:Math.round(e[2]*(1+S.floor*.09)),type:e[3],stun:0,poison:0,mark:0})}S.phase='hero';S.turn=0;S.target=0;locked=false;log(boss?'⚠ 骸骨霸主現身':'第 '+S.floor+' 層：敵影逼近');nextHero();}
function nextHero(){if(S.screen!=='play')return;if(!alive(S.enemies).length)return win();if(!alive(S.party).length)return die();let tries=0;while(tries<S.party.length&&S.party[S.turn%S.party.length].hp<=0){S.turn++;tries++}if(S.turn>=S.party.length){enemyPhase();return}let h=S.party[S.turn];h.cd=h.cd.map(v=>Math.max(0,v-1));if(h.buff>0)h.buff--;S.phase='hero';locked=false;renderBattlePanel();stats()}
function current(){return S.party[S.turn]}
function targetEnemy(){if(!S.enemies[S.target]||S.enemies[S.target].hp<=0)S.target=S.enemies.findIndex(e=>e.hp>0);return S.enemies[S.target]}
