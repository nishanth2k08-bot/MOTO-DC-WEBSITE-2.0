(()=>{
 const init=()=>{
  if(location.pathname==='/admin')return;
  const nav=document.querySelector('.nav nav');
  if(!nav)return;
  if(nav.querySelector('[data-about-us-link]'))return;
  const link=document.createElement('a');
  link.href='/about-us';
  link.dataset.aboutUsLink='true';
  link.textContent='About Us';
  link.addEventListener('click',e=>{
   e.preventDefault();
   window.location.assign('/about-us');
   nav.classList.remove('open');
  });
  nav.appendChild(link);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));
 else setTimeout(init,100);
 new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});
})();
