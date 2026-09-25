// Keep a usable recovery action when a script download or startup fails.
(() => {
 const panel=document.getElementById('boot-status'),detail=document.getElementById('boot-detail');
 let done=false;
 const fail=message=>{panel.hidden=false;panel.dataset.failed='true';detail.textContent=message;};
 const timer=setTimeout(()=>{if(!done)fail('啟動時間較長，請重新載入再試一次。你的已儲存進度會保留。');},12000);
 addEventListener('error',event=>{
  if(event.target?.tagName==='SCRIPT'||event.error){clearTimeout(timer);fail('遊戲程式未完整啟動。請重新載入；你的已儲存進度會保留。');}
 },true);
 document.getElementById('boot-retry').onclick=()=>{
  const url=new URL(location.href);url.searchParams.set('retry',Date.now());location.replace(url.href);
 };
 window.RiftBoot={ready(){done=true;clearTimeout(timer);panel.hidden=true;}};
})();
