(()=>{
 const init=()=>{
  const section=document.querySelector('.aboutUsSection');
  const nav=document.querySelector('.nav nav');
  if(!section||!nav||nav.querySelector('[data-about-us-link]'))return;
  section.id='about-us';
  const link=document.createElement('a');
  link.href='#about-us';
  link.dataset.aboutUsLink='true';
  link.textContent='About Us';
  link.addEventListener('click',e=>{
   e.preventDefault();
   section.scrollIntoView({behavior:'smooth',block:'start'});
   history.replaceState(null,'','#about-us');
   document.querySelector('.nav nav')?.classList.remove('open');
  });
  nav.appendChild(link);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));
 else setTimeout(init,100);
 new MutationObserver(()=>init()).observe(document.documentElement,{childList:true,subtree:true});
})();
