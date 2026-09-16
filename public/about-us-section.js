(()=>{
 const sync=()=>{
  const existing=document.querySelector('.aboutUsSection');
  if(location.pathname!=='/'){
   if(existing) existing.remove();
   return;
  }
  if(existing)return;
  const footer=document.querySelector('footer');if(!footer)return;
  const section=document.createElement('section');section.className='aboutUsSection';section.innerHTML=`<div class="aboutUsWrap"><div class="aboutUsIntro"><p class="aboutUsEyebrow">ABOUT MOTO<span>DC</span></p><h2 class="aboutUsTitle">Built for riders. <span>Made for every machine.</span></h2><p class="aboutUsText">MotoDC is a modern spare-parts destination created to make finding dependable automobile and motorcycle parts simple. From everyday maintenance to performance upgrades, we bring carefully selected parts, clear product information and a straightforward shopping experience together in one place.</p><div class="aboutUsStats"><div class="aboutUsStat"><strong>2,500+</strong><small>Parts listed</small></div><div class="aboutUsStat"><strong>18+</strong><small>Brands supported</small></div><div class="aboutUsStat"><strong>98%</strong><small>Happy customers</small></div></div></div><div class="aboutUsContact"><h3>Get in touch</h3><div class="aboutUsContactList"><div class="aboutUsContactItem"><span class="aboutUsContactIcon">☎</span><div><b>Phone</b><a href="tel:+919876543210">+91 98765 43210</a></div></div><div class="aboutUsContactItem"><span class="aboutUsContactIcon">✉</span><div><b>Email</b><a href="mailto:hello@motodc.example">hello@motodc.example</a></div></div><div class="aboutUsContactItem"><span class="aboutUsContactIcon">⌖</span><div><b>Workshop & Support</b><span>45 Motor Avenue, Chennai, Tamil Nadu 600001</span></div></div></div><div class="aboutUsHours"><b>Support hours:</b> Monday–Saturday · 9:00 AM–6:00 PM IST</div></div></div>`;footer.parentNode.insertBefore(section,footer);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
 new MutationObserver(sync).observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('popstate',sync);
})();
