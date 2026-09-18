(()=>{
  const clean=s=>String(s||'').trim().replace(/\.[a-z0-9]+$/i,'').replace(/&/g,'and').replace(/[^a-z0-9]+/gi,' ').trim().replace(/\s+/g,' ');
  const fileVariants=name=>{const n=clean(name);if(!n)return[];const base=n.replace(/\s+/g,'_'),compact=n.replace(/\s+/g,'');return[...new Set([base,compact].flatMap(v=>[v+'.jpg',v+'.jpeg',v+'_2.jpg',v+'_2.jpeg']))]};
  const getName=img=>{if(img.alt?.trim())return img.alt;const card=img.closest('.card');if(card)return card.querySelector('h3')?.textContent||'';return''};
  const crop={
    'Bajaj_Platina_Rear_Brake_Shoe.jpg':['88%','1.9'],'Bajaj_Platina_Rear_Brake_Shoe_2.jpg':['88%','1.9'],
    'Hero_Passion_Pro_Front_Brake_Shoe.jpg':['78%','1.9'],'Bajaj_Pulsar_150_Air_Filter.jpg':['72%','1.8'],
    'Bajaj_Pulsar_150_Chain_Sprocket_Kit.jpg':['50%','1.7'],'Bajaj_Pulsar_150_Chain_Sprocket_Kit_2.jpg':['50%','1.7'],
    'Bajaj_Pulsar_Front_Disc_Brake_Pads.jpg':['50%','1.7'],'Hero_Xtreme_160R_Front_Brake_Pads.jpg':['50%','1.7'],
    'TVS_Ntorq_Clutch_Shoe_Set.jpg':['72%','1.8'],'TVS_Ntorq_Clutch_Shoe_Set_2.jpg':['72%','1.8'],
    'Honda_Activa_Front_Brake_Shoe_Set.jpg':['52%','1.8'],'Yamaha_FZ_Rear_Brake_Shoe.jpg':['80%','1.9'],
    'Suzuki_Burgman_Street_Brake_Shoe.jpg':['35%','1.8'],'Yamaha_R15_V3_Front_Brake_Pads.jpg':['72%','1.8'],
    'Honda_CB_Shine_Front_Disc_Pad.jpg':['40%','1.8'],'Toyota_Fortuner_Front_Brake_Pad_Set.jpg':['75%','1.8'],
    'Royal_Enfield_Classic_350_Air_Filter.jpg':['35%','1.8'],'Royal_Enfield_Classic_350_Front_Brake_Pads.jpg':['70%','1.8'],
    'Royal_Enfield_Classic_350_Front_Brake_Pads_2.jpg':['70%','1.8'],'Honda_Unicorn_Chain_Sprocket_Kit.jpg':['65%','1.8'],
    'Suzuki_Gixxer_Chain_Sprocket_Kit.jpg':['70%','1.8'],'TVS_Raider_Chain_Sprocket_Kit.jpg':['35%','1.8'],
    'TVS_Raider_Chain_Sprocket_Kit_2.jpg':['70%','1.8'],'Hero_Glamour_Chain_Sprocket_Kit.jpg':['50%','1.7'],
    'KTM_Duke_200_Front_Brake_Pads.jpg':['72%','1.8'],'Kia_Sonet_Front_Brake_Pads.jpg':['85%','1.8'],
    'Hyundai_i20_Front_Brake_Pad_Set.jpg':['55%','1.8'],'Maruti_Suzuki_Swift_Front_Brake_Pad_Set.jpg':['55%','1.8'],
    'Tata_Nexon_Front_Brake_Pads.jpg':['45%','1.8'],'Mahindra_Thar_Front_Brake_Pads.jpg':['55%','1.8']
  };
  const tested=new Map();
  const tryLocal=async img=>{
    if(!img||img.dataset.motodcLocalTried==='1')return;
    const variants=fileVariants(getName(img));if(!variants.length)return;
    img.dataset.motodcLocalTried='1';const original=img.currentSrc||img.src||'';
    for(const file of variants){
      const src='/products/'+encodeURIComponent(file).replace(/%2F/g,'/');let ok=tested.get(src);
      if(ok===undefined)ok=await new Promise(resolve=>{const p=new Image();p.onload=()=>resolve(true);p.onerror=()=>resolve(false);p.src=src});
      tested.set(src,ok);
      if(ok){img.src=src;img.removeAttribute('srcset');img.dataset.motodcLocalSource=src;const c=crop[file];if(c){img.style.setProperty('--motodc-local-pos',c[0]);img.style.setProperty('--motodc-local-zoom',c[1])}return}
    }
    if(original)img.src=original;
  };
  const scan=()=>document.querySelectorAll('.grid .pic img').forEach(tryLocal);
  const start=()=>{scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
