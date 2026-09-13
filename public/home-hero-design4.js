(()=>{
  const css=`
    .heroVisual .orb.heroPlaceholder{width:310px;height:310px;border-radius:50%;display:grid;place-items:center;font:800 70px Sora;color:#ff3157;background:radial-gradient(circle,#29202a,#0e1118 65%);box-shadow:0 0 100px rgba(255,49,87,.15);border:1px solid #302630}
    @media(max-width:850px){.heroVisual .orb.heroPlaceholder{display:none}}
  `;
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  function mount(){
    const o=document.querySelector('.heroVisual .orb');
    if(!o)return setTimeout(mount,300);
    o.className='orb heroPlaceholder';
    o.removeAttribute('style');
    o.innerHTML='MDC';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();