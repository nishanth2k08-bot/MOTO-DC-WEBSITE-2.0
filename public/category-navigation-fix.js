(()=>{
  document.addEventListener('click',e=>{
    const link=e.target.closest('.nav nav a');
    if(!link)return;
    const label=link.textContent.trim().toLowerCase();
    let target='';
    if(label==='automobile')target='/products/auto';
    if(label==='motorcycle')target='/products/bike';
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(window.location.pathname!==target)window.location.assign(target);
  },true);

  const simplifyWishlistToast=()=>document.querySelectorAll('[role="status"]').forEach(el=>{
    const text=(el.textContent||'').trim();
    if(/added to wishlist$/i.test(text))el.textContent='1 item added to wishlist';
  });
  const start=()=>{
    simplifyWishlistToast();
    new MutationObserver(simplifyWishlistToast).observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
