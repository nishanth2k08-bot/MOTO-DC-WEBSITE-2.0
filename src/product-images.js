const motorcycleImages=[
'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1558980664-10ea4b0e4d7d?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1558980394-0c6e2e4f1d7c?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1558981420-87aa9dad1c75?auto=format&fit=crop&w=1200&q=90'];
const automobileImages=[
'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=90',
'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=90'];
const hash=v=>[...String(v||'')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
export function productImage(p){const text=`${p?.name||''} ${p?.brand||''} ${p?.fitment||''}`.toLowerCase();const pool=String(p?.category||'').toLowerCase()==='motorcycle'?motorcycleImages:automobileImages;let offset=hash(text)%pool.length;if(/brake|disc|pad|shoe/.test(text))offset=(offset+1)%pool.length;if(/filter|air/.test(text))offset=(offset+2)%pool.length;if(/clutch|belt/.test(text))offset=(offset+3)%pool.length;if(/chain|sprocket/.test(text))offset=(offset+4)%pool.length;if(/oil|spark|plug/.test(text))offset=(offset+5)%pool.length;return pool[offset]||p?.image;}
