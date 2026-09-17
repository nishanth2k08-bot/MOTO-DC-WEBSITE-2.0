(()=>{
  const clean=s=>String(s||'').trim().replace(/\.[a-z0-9]+$/i,'').replace(/&/g,'and').replace(/[^a-z0-9]+/gi,' ').trim().replace(/\s+/g,' ');
  const fileVariants=name=>{
    const n=clean(name); if(!n) return [];
    const base=n.replace(/\s+/g,'_');
    const compact=n.replace(/\s+/g,'');
    const variants=[base,base.replace(/_+/g,'_'),compact];
    return [...new Set(variants.flatMap(v=>[v+'.jpg',v+'.jpeg',v+'_2.jpg',v+'_2.jpeg']))];
  };
  const getName=img=>{
    if(img.alt&&img.alt.trim()) return img.alt;
    const card=img.closest('.card'); if(card) return card.querySelector('h3')?.textContent||'';
    const detail=img.closest('.detail'); if(detail) return detail.querySelector('h1')?.textContent||'';
    const admin=img.closest('.adminproduct'); if(admin) return admin.querySelector('h3')?.textContent||'';
    const summary=img.closest('.summaryItem'); if(summary) return summary.querySelector('b')?.textContent||'';
    return '';
  };
  const tested=new Map();
  const tryLocal=async img=>{
    if(!img||img.dataset.motodcLocalTried==='1') return;
    const name=getName(img); const variants=fileVariants(name); if(!variants.length) return;
    img.dataset.motodcLocalTried='1';
    const original=img.currentSrc||img.src||'';
    for(const file of variants){
      const src='/products/'+encodeURIComponent(file).replace(/%2F/g,'/');
      let ok=tested.get(src);
      if(ok===undefined){
        ok=await new Promise(resolve=>{const probe=new Image();probe.onload=()=>resolve(true);probe.onerror=()=>resolve(false);probe.src=src});
        tested.set(src,ok);
      }
      if(ok){
        img.src=src; img.removeAttribute('srcset'); img.dataset.motodcLocalSource=src; return;
      }
    }
    if(original) img.src=original;
  };
  const scan=()=>document.querySelectorAll('img').forEach(tryLocal);
  const start=()=>{scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true})};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
