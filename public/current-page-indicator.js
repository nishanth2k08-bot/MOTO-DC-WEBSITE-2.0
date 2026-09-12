/* Keep the header navigation visibly synced with the current SPA route. */
(function(){
  const update=()=>{
    const path=window.location.pathname.replace(/\/$/,'')||'/';
    const params=new URLSearchParams(window.location.search);
    const category=params.get('category')||'';
    document.querySelectorAll('.nav nav a').forEach(link=>{
      const label=(link.textContent||'').trim().toLowerCase();
      let active=false;
      if(label==='home')active=path==='/';
      else if(label==='products')active=path==='/products'&&!['Automobile','Motorcycle'].includes(category)||(path.startsWith('/products/')&&!['/products/auto','/products/bike'].includes(path));
      else if(label==='automobile')active=(path==='/products/auto')||(path==='/products'&&category==='Automobile');
      else if(label==='motorcycle')active=(path==='/products/bike')||(path==='/products'&&category==='Motorcycle');
      else if(label==='my orders')active=path==='/orders';
      link.classList.toggle('currentPage',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    const wishlist=document.querySelector('.wishlistNav');
    if(wishlist)wishlist.classList.toggle('currentPage',path==='/wishlist');
    const cart=document.querySelector('.cart');
    if(cart)cart.classList.toggle('currentPage',path==='/cart');
    const account=document.querySelector('.accountWrap:not(.signedIn) .account');
    if(account)account.classList.toggle('currentPage',path==='/account');
  };
  const originalPush=history.pushState;
  const originalReplace=history.replaceState;
  history.pushState=function(){const r=originalPush.apply(this,arguments);window.dispatchEvent(new Event('motodc-routechange'));return r};
  history.replaceState=function(){const r=originalReplace.apply(this,arguments);window.dispatchEvent(new Event('motodc-routechange'));return r};
  window.addEventListener('popstate',update);
  window.addEventListener('motodc-routechange',update);
  new MutationObserver(update).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',update);
  update();
})();
