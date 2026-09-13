(()=>{
const css=`
.heroVisual{position:relative;display:block!important;min-width:0!important;}
.heroVisual .orb.heroAdventure{width:min(760px,54vw);height:min(500px,38vw);min-width:520px;min-height:360px;position:relative;display:block;border:0;border-radius:24px;overflow:hidden;background:#111;box-shadow:0 28px 80px rgba(0,0,0,.55);}
.heroAdventure .heroImage{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;border-radius:24px;display:block;}
@media(max-width:850px){.heroVisual .orb.heroAdventure{display:none}}
`;
const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
function mount(){const o=document.querySelector('.heroVisual .orb');if(!o)return setTimeout(mount,300);o.className='orb heroAdventure';o.innerHTML='<img class="heroImage" src="/motodc-hero.webp" alt="MotoDC automotive hero" fetchpriority="high">';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();