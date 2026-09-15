(()=>{
 const phrases=["Find your part.","Ride starts here.","Parts made easy.","Keep riding.","Built to ride.","Ride. Ready.","Need a part?","Your ride. Sorted.","Power your ride.","Part found. Ride on."];
 const speed=85,eraseSpeed=45,pause=1500;
 let timer=null,stopped=false;
 function start(){
  const input=document.querySelector('.search input');
  if(!input)return setTimeout(start,500);
  let phrase=0,pos=0,deleting=false;
  const tick=()=>{
   if(stopped)return;
   if(document.activeElement===input||input.value){input.placeholder='Search parts...';timer=setTimeout(tick,500);return}
   const text=phrases[phrase];
   if(!deleting){pos++;input.placeholder=text.slice(0,pos);if(pos>=text.length){deleting=true;timer=setTimeout(tick,pause);return}timer=setTimeout(tick,speed)}
   else{pos--;input.placeholder=text.slice(0,pos);if(pos<=0){deleting=false;phrase=(phrase+1)%phrases.length;timer=setTimeout(tick,350);return}timer=setTimeout(tick,eraseSpeed)}
  };
  tick();input.addEventListener('focus',()=>{input.placeholder='Search parts...'});input.addEventListener('blur',()=>{if(!input.value){clearTimeout(timer);pos=0;deleting=false;timer=setTimeout(tick,450)}});
 }
 function addAboutSection(){
  if(location.pathname!=='/'||document.querySelector('.aboutUsSection'))return;
  const footer=document.querySelector('footer');if(!footer)return;
  const section=document.createElement('section');section.className='aboutUsSection';section.innerHTML=`<div class="aboutUsWrap"><div class="aboutUsIntro"><p class="aboutUsEyebrow">ABOUT MOTO<span>DC</span></p><h2 class="aboutUsTitle">Built for riders. <span>Made for every machine.</span></h2><p class="aboutUsText">MotoDC is a modern spare-parts destination created to make finding dependable automobile and motorcycle parts simple. From everyday maintenance to performance upgrades, we bring carefully selected parts, clear product information and a straightforward shopping experience together in one place.</p><div class="aboutUsStats"><div class="aboutUsStat"><strong>2,500+</strong><small>Parts listed</small></div><div class="aboutUsStat"><strong>18+</strong><small>Brands supported</small></div><div class="aboutUsStat"><strong>98%</strong><small>Happy customers</small></div></div></div><div class="aboutUsContact"><h3>Get in touch</h3><div class="aboutUsContactList"><div class="aboutUsContactItem"><span class="aboutUsContactIcon">☎</span><div><b>Phone</b><a href="tel:+919876543210">+91 98765 43210</a></div></div><div class="aboutUsContactItem"><span class="aboutUsContactIcon">✉</span><div><b>Email</b><a href="mailto:hello@motodc.example">hello@motodc.example</a></div></div><div class="aboutUsContactItem"><span class="aboutUsContactIcon">⌖</span><div><b>Workshop & Support</b><span>45 Motor Avenue, Chennai, Tamil Nadu 600001</span></div></div></div><div class="aboutUsHours"><b>Support hours:</b> Monday–Saturday · 9:00 AM–6:00 PM IST</div></div></div>`;footer.parentNode.insertBefore(section,footer);
 }
 function addAboutNav(){
  if(location.pathname!=='/')return;
  const section=document.querySelector('.aboutUsSection'),nav=document.querySelector('.nav nav');
  if(!section||!nav||nav.querySelector('[data-about-us-link]'))return;
  section.id='about-us';
  const link=document.createElement('a');link.href='#about-us';link.dataset.aboutUsLink='true';link.textContent='About Us';
  link.addEventListener('click',e=>{e.preventDefault();section.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#about-us');nav.classList.remove('open')});
  nav.appendChild(link);
 }
 function addScrollAnimations(){
  if(location.pathname!=='/'||document.documentElement.dataset.motodcScrollAnimations)return;
  document.documentElement.dataset.motodcScrollAnimations='true';
  const link=document.createElement('link');link.rel='stylesheet';link.href='/scroll-animations.css';document.head.appendChild(link);
  const main=document.querySelector('main');if(!main)return;
  main.classList.add('motodc-scroll-animations');
  const hero=main.querySelector('.hero');
  if(hero){
   hero.classList.add('motodc-scroll-parallax');
   let ticking=false;
   const updateParallax=()=>{
    ticking=false;
    if(!hero.isConnected)return;
    const rect=hero.getBoundingClientRect(),y=Math.max(-70,Math.min(0,-rect.top*.16));
    main.style.setProperty('--hero-parallax-y',`${y}px`);
   };
   const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(updateParallax)}};
   addEventListener('scroll',onScroll,{passive:true});updateParallax();
  }
  const selectors=[
   '.hero ~ section:not(.stats):not(.aboutUsSection)',
   '.featured','.newArrivals','.bestSellers','.services','.testimonials','.newsletter',
   '.categoriesSection'
  ];
  const fadeTargets=[];
  selectors.forEach(selector=>document.querySelectorAll(selector).forEach(el=>{if(!el.classList.contains('motodc-scroll-fade')){el.classList.add('motodc-scroll-fade');fadeTargets.push(el)}}));
  document.querySelectorAll('.categories').forEach(el=>{
   el.classList.add('motodc-scroll-stagger');
   Array.from(el.children).forEach((child,i)=>child.style.setProperty('--stagger-delay',`${i*120}ms`));
  });
  const about=document.querySelector('.aboutUsSection');if(about)about.classList.add('motodc-scroll-scale');
  const targets=[...fadeTargets,...document.querySelectorAll('.motodc-scroll-stagger,.aboutUsSection.motodc-scroll-scale')];
  if(!targets.length)return;
  if(!('IntersectionObserver' in window)){targets.forEach(el=>el.classList.add('is-visible'));return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.14,rootMargin:'0px 0px -8% 0px'});
  targets.forEach(el=>observer.observe(el));
 }
 function init(){start();addAboutSection();addAboutNav();addScrollAnimations()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,300));else setTimeout(init,300);
 new MutationObserver(()=>{addAboutSection();addAboutNav();addScrollAnimations()}).observe(document.documentElement,{childList:true,subtree:true});
})();
