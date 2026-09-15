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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
(()=>{
 const add=()=>{
  if(location.pathname!=='/'||document.querySelector('.aboutUsSection'))return;
  const footer=document.querySelector('footer');if(!footer)return;
  const section=document.createElement('section');section.className='aboutUsSection';section.innerHTML=`<div class="aboutUsWrap"><div class="aboutUsIntro"><p class="aboutUsEyebrow">ABOUT MOTO<span>DC</span></p><h2 class="aboutUsTitle">Built for riders. <span>Made for every machine.</span></h2><p class="aboutUsText">MotoDC is a modern spare-parts destination created to make finding dependable automobile and motorcycle parts simple. From everyday maintenance to performance upgrades, we bring carefully selected parts, clear product information and a straightforward shopping experience together in one place.</p><div class="aboutUsStats"><div class="aboutUsStat"><strong>2,500+</strong><small>Parts listed</small></div><div class="aboutUsStat"><strong>18+</strong><small>Brands supported</small></div><div class="aboutUsStat"><strong>98%</strong><small>Happy customers</small></div></div></div><div class="aboutUsContact"><h3>Get in touch</h3><div class="aboutUsContactList"><div class="aboutUsContactItem"><span class="aboutUsContactIcon">☎</span><div><b>Phone</b><a href="tel:+919876543210">+91 98765 43210</a></div></div><div class="aboutUsContactItem"><span class="aboutUsContactIcon">✉</span><div><b>Email</b><a href="mailto:hello@motodc.example">hello@motodc.example</a></div></div><div class="aboutUsContactItem"><span class="aboutUsContactIcon">⌖</span><div><b>Workshop & Support</b><span>45 Motor Avenue, Chennai, Tamil Nadu 600001</span></div></div></div><div class="aboutUsHours"><b>Support hours:</b> Monday–Saturday · 9:00 AM–6:00 PM IST</div></div></div>`;footer.parentNode.insertBefore(section,footer);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
 new MutationObserver(add).observe(document.documentElement,{childList:true,subtree:true});
})();
