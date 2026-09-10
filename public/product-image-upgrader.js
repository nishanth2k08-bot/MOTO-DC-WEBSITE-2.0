(()=>{
 const bikes=[
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1558980664-10ea4b0e4d7d?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1558980394-0c6e2e4f1d7c?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1558981420-87aa9dad1c75?auto=format&fit=crop&w=1200&q=90'
 ];
 const cars=[
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=90'
 ];
 const hash=s=>[...String(s)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
 const upgrade=img=>{
  if(!img||img.dataset.motodcImageUpgraded)return;
  const alt=(img.alt||'').toLowerCase();
  if(!alt)return;
  const pool=/motorcycle|bike|scooter|splendor|pulsar|apache|raider|fz|r15|mt-15|access|gixxer|burgman|classic 350|hunter 350|meteor 350|duke|rc 200|adventure 390/.test(alt)?bikes:cars;
  let offset=hash(alt)%pool.length;
  if(/brake|disc|pad|shoe/.test(alt))offset=(offset+1)%pool.length;
  else if(/filter|air/.test(alt))offset=(offset+2)%pool.length;
  else if(/clutch|belt/.test(alt))offset=(offset+3)%pool.length;
  else if(/chain|sprocket/.test(alt))offset=(offset+4)%pool.length;
  else if(/oil|spark|plug/.test(alt))offset=(offset+5)%pool.length;
  img.src=pool[offset];img.dataset.motodcImageUpgraded='1';
 };
 const scan=()=>document.querySelectorAll('img[alt]').forEach(upgrade);
 new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);scan();
})();
