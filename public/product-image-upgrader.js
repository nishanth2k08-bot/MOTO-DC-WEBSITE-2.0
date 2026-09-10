(()=>{
 const clean=s=>String(s||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const getName=img=>{const direct=img.alt||'';if(direct.trim())return direct;const admin=img.closest('.adminproduct');if(admin)return admin.querySelector('h3')?.textContent||'';const summary=img.closest('.summaryItem');if(summary)return summary.querySelector('b')?.textContent||'';return img.closest('.card')?.querySelector('h3')?.textContent||''};
 const findSrc=name=>{const n=clean(name);for(const map of [window.MotoDCRealImagesMoto,window.MotoDCRealImagesAuto]){const keys=Object.keys(map||{});const k=keys.find(x=>clean(x)===n);if(k)return map[k]}return ''};
 const enhanced=new Map();
 const enhance=src=>{if(enhanced.has(src))return enhanced.get(src);const p=new Promise(resolve=>{const im=new Image();im.onload=()=>{const w=im.naturalWidth,h=im.naturalHeight,c=document.createElement('canvas');c.width=w*2;c.height=h*2;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(im,0,0,c.width,c.height);try{const d=x.getImageData(0,0,c.width,c.height),a=d.data,o=new Uint8ClampedArray(a);for(let y=1;y<c.height-1;y++)for(let xx=1;xx<c.width-1;xx++){const i=(y*c.width+xx)*4;for(let ch=0;ch<3;ch++){const v=a[i+ch]*5-a[i-4+ch]-a[i+4+ch]-a[i-c.width*4+ch]-a[i+c.width*4+ch];o[i+ch]=Math.max(0,Math.min(255,v))}}d.data.set(o);x.putImageData(d,0,0)}catch{}resolve(c.toDataURL('image/jpeg',.94))};im.onerror=()=>resolve(src);im.src=src});enhanced.set(src,p);return p};
 const apply=async img=>{if(!img||img.dataset.motodcSharpApplied)return;const src=findSrc(getName(img));if(!src)return;const out=await enhance(src);if(out){img.src=out;img.dataset.motodcSharpApplied='1'}};
 const scan=()=>document.querySelectorAll('img').forEach(apply);
 new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);scan();setInterval(scan,1000);
})();
