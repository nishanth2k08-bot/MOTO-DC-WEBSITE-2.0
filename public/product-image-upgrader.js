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
  if(!img)return;
  const name=norm(getName(img));
  if(!name)return;
  const moto=window.MotoDCRealImagesMoto||{};
  const auto=window.MotoDCRealImagesAuto||{};
  const src=moto[name]||auto[name];
  if(!src)return;
  if(img.dataset.motodcRealImageApplied===src)return;
  img.src=src;
  img.dataset.motodcRealImageApplied=src;
 };
 const scan=()=>document.querySelectorAll('img').forEach(apply);
 const mapsReady=()=>Object.keys(window.MotoDCRealImagesMoto||{}).length||Object.keys(window.MotoDCRealImagesAuto||{}).length;
 const observer=new MutationObserver(scan);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);
 scan();
 let tries=0;
 const timer=setInterval(()=>{
  scan();
  if(mapsReady()||++tries>=240)clearInterval(timer);
 },250);
})();
