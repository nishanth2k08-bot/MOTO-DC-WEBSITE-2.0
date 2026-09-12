(()=>{
 const simplify=()=>document.querySelectorAll('[role="status"],.go3958317564').forEach(el=>{
  const text=(el.textContent||'').trim();
  if(/added to wishlist$/i.test(text)) el.textContent='1 item added to wishlist';
 });
 const observer=new MutationObserver(simplify);
 const start=()=>{simplify();observer.observe(document.body,{childList:true,subtree:true,characterData:true})};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
