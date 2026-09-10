(()=>{
 const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
 const getName=img=>{
  const direct=img.alt||'';
  if(direct.trim())return direct;
  const admin=img.closest('.adminproduct');
  if(admin)return admin.querySelector('h3')?.textContent||'';
  const summary=img.closest('.summaryItem');
  if(summary)return summary.querySelector('b')?.textContent||'';
  return img.closest('.card')?.querySelector('h3')?.textContent||'';
 };
 const apply=img=>{
  if(!img||img.dataset.motodcRealImageApplied)return;
  const name=norm(getName(img));
  if(!name)return;
  const maps=[window.MotoDCRealImagesMoto||{},window.MotoDCRealImagesAuto||{}];
  const src=maps[0][name]||maps[1][name];
  if(!src)return;
  img.src=src;
  img.dataset.motodcRealImageApplied='1';
 };
 const scan=()=>document.querySelectorAll('img').forEach(apply);
 const observer=new MutationObserver(scan);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);
 scan();
 let tries=0;const timer=setInterval(()=>{scan();if(++tries>=40)clearInterval(timer)},250);
})();
