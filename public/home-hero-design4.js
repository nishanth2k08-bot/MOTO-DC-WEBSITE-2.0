(()=>{
  const IMAGE='/526c5913-c066-4959-be22-11908d3a7375.jpg';
  const css=`
    .heroVisual .orb.heroImage{width:min(620px,48vw);height:auto;min-width:0;aspect-ratio:720/324;display:block;position:relative;border:0;border-radius:0;background:none;box-shadow:none;overflow:hidden;padding:0}
    .heroImage img{display:block;width:100%;height:100%;object-fit:cover;border:0;border-radius:0;box-shadow:0 24px 70px rgba(0,0,0,.55)}
    .heroImage:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(10,12,17,.12),transparent 35%,rgba(255,49,87,.06));mix-blend-mode:screen}
    @media(max-width:850px){.heroVisual .orb.heroImage{display:none}}
    @media(prefers-reduced-motion:reduce){.heroImage img{animation:none!important}}
  `;
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  function mount(){
    const o=document.querySelector('.heroVisual .orb');
    if(!o)return setTimeout(mount,300);
    o.className='orb heroImage';
    o.removeAttribute('aria-label');
    o.innerHTML=`<img src="${IMAGE}" alt="MotoDC car and motorcycle hero design" loading="eager" decoding="async">`;
    const v=o.closest('.heroVisual');
    if(v){
      v.addEventListener('pointermove',e=>{const r=v.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;o.style.transform=`translate3d(${x*5}px,${y*3}px,0)`});
      v.addEventListener('pointerleave',()=>o.style.transform='translate3d(0,0,0)');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();