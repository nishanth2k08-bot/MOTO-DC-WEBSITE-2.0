(()=>{
  const clean=s=>String(s||'').trim().replace(/\.[a-z0-9]+$/i,'').replace(/&/g,'and').replace(/[^a-z0-9]+/gi,' ').trim().replace(/\s+/g,' ');
  const fileVariants=name=>{const n=clean(name);if(!n)return[];const base=n.replace(/\s+/g,'_'),compact=n.replace(/\s+/g,'');return[...new Set([base,compact].flatMap(v=>[v+'.jpg',v+'.jpeg',v+'_2.jpg',v+'_2.jpeg']))]};
  const getName=img=>{if(img.alt?.trim())return img.alt;const card=img.closest('.card');if(card)return card.querySelector('h3')?.textContent||'';const detail=img.closest('.detail');if(detail)return detail.querySelector('h1')?.textContent||'';const admin=img.closest('.adminproduct');if(admin)return admin.querySelector('h3')?.textContent||'';const summary=img.closest('.summaryItem');if(summary)return summary.querySelector('b')?.textContent||'';return''};
  const focal={
    'Amaron_Car_Battery_45Ah.jpg':'23%','Bajaj_Platina_Rear_Brake_Shoe.jpg':'82%','Bajaj_Pulsar_150_Air_Filter.jpg':'50%','Bajaj_Pulsar_150_Chain_Sprocket_Kit.jpg':'50%','Bajaj_Pulsar_150_Chain_Sprocket_Kit_2.jpg':'50%','Bajaj_Pulsar_Front_Disc_Brake_Pads.jpg':'50%',
    'Bosch_Car_Battery_45Ah.jpg':'34%','Bosch_Premium_Petrol_Spark_Plug_Set.jpg':'63%','Denso_Radiator_Cooling_Fan_Motor.jpg':'65%','Exide_Car_Battery_35Ah.jpg':'25%',
    'Hero_Passion_Pro_Front_Brake_Shoe.jpg':'77%','Hero_Splendor_Clutch_Plate_Set.jpg':'29%','Hero_Xtreme_160R_Front_Brake_Pads.jpg':'50%','Honda_Activa_6G_Air_Filter.jpg':'50%','Honda_Amaze_Front_Brake_Pads.jpg':'47%','Honda_CB_Shine_Front_Disc_Pad.jpg':'50%','Honda_City_Air_Filter.jpg':'70%','Honda_Shine_Clutch_Plate_Set.jpg':'49%','Honda_Unicorn_Chain_Sprocket_Kit.jpg':'65%',
    'Hyundai_Creta_Cabin_Filter.jpg':'25%','Hyundai_i10_Air_Filter.jpg':'50%','Hyundai_i20_Front_Brake_Pad_Set.jpg':'53%','KTM_Duke_200_Air_Filter.jpg':'53%','KTM_Duke_200_Front_Brake_Pads.jpg':'79%','KTM_RC_200_Oil_Filter.jpg':'78%','Kia_Sonet_Front_Brake_Pads.jpg':'88%',
    'Mahindra_Scorpio_N_Air_Filter.jpg':'49%','Mahindra_Thar_Front_Brake_Pads.jpg':'56%','Mahindra_XUV700_Cabin_Filter.jpg':'54%','Maruti_Suzuki_Alto_K10_Air_Filter.jpg':'37%','Maruti_Suzuki_Baleno_Cabin_Air_Filter.jpg':'50%','Maruti_Suzuki_Swift_Front_Brake_Pad_Set.jpg':'56%',
    'Minda_Universal_Indicator_Set.jpg':'50%','Pricol_Digital_Motorcycle_Speedometer.jpg':'50%','Renault_Duster_Cabin_Filter.jpg':'61%','Renault_Kwid_Front_Brake_Pad_Set.jpg':'26%','Royal_Enfield_Classic_350_Air_Filter.jpg':'29%','Royal_Enfield_Classic_350_Front_Brake_Pads.jpg':'73%','Royal_Enfield_Classic_350_Front_Brake_Pads_2.jpg':'59%','Royal_Enfield_Meteor_350_Clutch_Plate_Set.jpg':'60%',
    'Suzuki_Access_125_Air_Filter.jpg':'50%','Suzuki_Burgman_Street_Brake_Shoe.jpg':'44%','Suzuki_Gixxer_Chain_Sprocket_Kit.jpg':'75%','TVS_Apache_RTR_160_Air_Filter.jpg':'70%','TVS_Raider_Chain_Sprocket_Kit.jpg':'30%','TVS_Raider_Chain_Sprocket_Kit_2.jpg':'73%','Tata_Nexon_Air_Filter.jpg':'50%','Tata_Nexon_Front_Brake_Pads.jpg':'45%','Tata_Punch_Cabin_Filter.jpg':'49%','Toyota_Fortuner_Front_Brake_Pad_Set.jpg':'79%','Toyota_Glanza_Cabin_Filter.jpg':'34%','Toyota_Innova_Crysta_Air_Filter.jpg':'50%','Uno_Minda_Car_Horn_Pair.jpg':'18%','Yamaha_FZ_FI_Air_Filter.jpg':'75%','Yamaha_FZ_Rear_Brake_Shoe.jpg':'51%','Yamaha_MT_15_Oil_Filter.jpg':'54%','Yamaha_R15_V3_Front_Brake_Pads.jpg':'70%'
  };
  const reject=new Set(['KTM_Duke_250_Chain_Sprocket_Kit.jpg','Hero_Splendor_Plus_Air_Filter.jpg','Bajaj_Platina_Rear_Brake_Shoe_2.jpg','Royal_Enfield_Meteor_350_Clutch_Plate_Set_2.jpg']);
  const tested=new Map();
  const tryLocal=async img=>{
    if(!img||img.dataset.motodcLocalTried==='1')return;
    const name=getName(img),variants=fileVariants(name);if(!variants.length)return;
    img.dataset.motodcLocalTried='1';const original=img.currentSrc||img.src||'';
    for(const file of variants){
      if(reject.has(file)) continue;
      const src='/products/'+encodeURIComponent(file).replace(/%2F/g,'/');let ok=tested.get(src);
      if(ok===undefined)ok=await new Promise(r=>{const p=new Image();p.onload=()=>r(true);p.onerror=()=>r(false);p.src=src});
      tested.set(src,ok);
      if(ok){img.src=src;img.removeAttribute('srcset');img.dataset.motodcLocalSource=src;img.style.setProperty('--motodc-local-pos',focal[file]||'50%');img.style.setProperty('--motodc-local-zoom','1.35');return}
    }
    if(original)img.src=original;
  };
  const scan=()=>document.querySelectorAll('.grid .pic img').forEach(tryLocal);
  const start=()=>{scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
