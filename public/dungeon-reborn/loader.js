'use strict';
fetch('./game.js',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()})
  .then(code=>{
    code=code.replace(/\?\.(\d)/g,'? .$1');
    (0,eval)(code);
  })
  .catch(err=>{
    const c=document.getElementById('game'),g=c&&c.getContext('2d');
    if(g){g.fillStyle='#09070e';g.fillRect(0,0,c.width,c.height);g.fillStyle='#ff7b85';g.font='bold 22px monospace';g.textAlign='center';g.fillText('遊戲載入失敗',c.width/2,240);g.fillStyle='#d7c9e3';g.font='14px monospace';g.fillText(String(err),c.width/2,275)}
    console.error(err);
  });
