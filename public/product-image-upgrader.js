(()=>{
 const clean=s=>String(s||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const getName=img=>{
  const direct=img.alt||'';
  if(direct.trim())return direct;
  const admin=img.closest('.adminproduct');
  if(admin)return admin.querySelector('h3')?.textContent||'';
  const summary=img.closest('.summaryItem');
  if(summary)return summary.querySelector('b')?.textContent||'';
  return img.closest('.card')?.querySelector('h3')?.textContent||'';
 };
 const findSrc=(map,name)=>{
  const keys=Object.keys(map||{});
  if(!keys.length)return '';
  const n=clean(name);
  if(map[name])return map[name];
  const exact=keys.find(k=>clean(k)===n);
  if(exact)return map[exact];
  const compact=n.replace(/\s/g,'');
  const compactMatch=keys.find(k=>clean(k).replace(/\s/g,'')===compact);
  if(compactMatch)return map[compactMatch];
  const tokens=n.split(' ').filter(x=>x.length>2);
  let best='',score=0;
  for(const k of keys){
   const kt=clean(k);
   let hits=0;
   for(const t of tokens)if(kt.includes(t))hits++;
   const s=tokens.length?hits/tokens.length:0;
   if(s>score){score=s;best=k;}
  }
  return score>=0.75?map[best]:'';
 };
 const apply=img=>{
  if(!img)return;
  const name=getName(img).trim();
  if(!name)return;
  const src=findSrc(window.MotoDCRealImagesMoto,name)||findSrc(window.MotoDCRealImagesAuto,name);
  if(!src)return;
  if(img.dataset.motodcRealImageApplied===src)return;
  img.src=src;
  img.dataset.motodcRealImageApplied=src;
 };
 const scan=()=>document.querySelectorAll('img').forEach(apply);
 const observer=new MutationObserver(scan);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);
 scan();
 let tries=0;
 const timer=setInterval(()=>{scan();if(++tries>=240)clearInterval(timer)},250);
})();
