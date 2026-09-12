(()=>{
  const css=`
  .heroVisual .orb.heroMachine{width:min(380px,34vw);height:min(380px,34vw);min-width:300px;min-height:300px;position:relative;display:block;border:0;background:none;box-shadow:none;color:inherit;overflow:visible}
  .heroMachine .machineGlow{position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,rgba(255,49,87,.16),rgba(255,49,87,.05) 42%,transparent 70%);filter:blur(10px);animation:machinePulse 4s ease-in-out infinite}
  .heroMachine .machineRing{position:absolute;inset:7%;border:1px solid rgba(255,49,87,.18);border-radius:50%;box-shadow:0 0 55px rgba(255,49,87,.1),inset 0 0 45px rgba(255,49,87,.04);animation:machineSpin 22s linear infinite}
  .heroMachine .machineRing:before,.heroMachine .machineRing:after{content:"";position:absolute;border-radius:50%;border:1px dashed rgba(255,255,255,.11)}
  .heroMachine .machineRing:before{inset:7%}
  .heroMachine .machineRing:after{inset:18%;border-color:rgba(255,49,87,.16)}
  .heroMachine .disc{position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 42% 36%,#343844 0,#1b1e27 38%,#0c0f15 70%);border:2px solid #555b68;box-shadow:inset 0 0 0 12px #151820,inset 0 0 35px rgba(0,0,0,.9),0 25px 60px rgba(0,0,0,.55);transform:perspective(700px) rotateX(8deg) rotateY(-12deg);animation:discFloat 5s ease-in-out infinite}
  .heroMachine .disc:before{content:"";position:absolute;inset:9%;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.04) 0deg 4deg,transparent 4deg 12deg);mask:radial-gradient(circle,transparent 0 42%,#000 43%)}
  .heroMachine .spokes{position:absolute;inset:10%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 7deg,#5b606c 7deg 13deg,transparent 13deg 72deg,#5b606c 72deg 78deg,transparent 78deg 137deg,#5b606c 137deg 143deg,transparent 143deg 202deg,#5b606c 202deg 208deg,transparent 208deg 267deg,#5b606c 267deg 273deg,transparent 273deg 332deg,#5b606c 332deg 338deg,transparent 338deg);filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
  .heroMachine .hub{position:absolute;left:50%;top:50%;width:27%;height:27%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#ff3157 0 18%,#991d3c 19% 31%,#11141b 32% 68%,#5b606c 69% 74%,#11141b 75%);box-shadow:0 0 24px rgba(255,49,87,.28)}
  .heroMachine .bolt{position:absolute;width:5.5%;height:5.5%;border-radius:50%;background:#ff3157;box-shadow:0 0 9px rgba(255,49,87,.45);left:47.25%;top:25%}
  .heroMachine .bolt.b2{transform:rotate(72deg);transform-origin:50% 454%}.heroMachine .bolt.b3{transform:rotate(144deg);transform-origin:50% 454%}.heroMachine .bolt.b4{transform:rotate(216deg);transform-origin:50% 454%}.heroMachine .bolt.b5{transform:rotate(288deg);transform-origin:50% 454%}
  .heroMachine .scan{position:absolute;left:8%;right:8%;top:50%;height:1px;background:linear-gradient(90deg,transparent,#ff3157 35%,#fff 50%,#ff3157 65%,transparent);box-shadow:0 0 14px rgba(255,49,87,.75);opacity:.8;animation:machineScan 4.5s ease-in-out infinite}
  .heroMachine .tag{position:absolute;padding:7px 10px;border:1px solid rgba(255,49,87,.25);border-radius:8px;background:rgba(9,11,16,.78);backdrop-filter:blur(8px);font:700 9px/1 Inter,sans-serif;letter-spacing:1.2px;color:#d9dde5;box-shadow:0 10px 25px rgba(0,0,0,.2);animation:tagFloat 4s ease-in-out infinite}
  .heroMachine .tag b{color:#ff3157}.heroMachine .tag.t1{right:-2%;top:22%}.heroMachine .tag.t2{left:-5%;top:35%;animation-delay:-1.2s}.heroMachine .tag.t3{right:5%;bottom:16%;animation-delay:-2.1s}
  .heroMachine .corner{position:absolute;width:28px;height:28px;border-color:rgba(255,49,87,.55);border-style:solid;opacity:.65}.heroMachine .c1{left:5%;top:11%;border-width:1px 0 0 1px}.heroMachine .c2{right:5%;bottom:11%;border-width:0 1px 1px 0}
  @keyframes machineSpin{to{transform:rotate(360deg)}}@keyframes machinePulse{0%,100%{transform:scale(.96);opacity:.7}50%{transform:scale(1.04);opacity:1}}@keyframes discFloat{0%,100%{transform:perspective(700px) rotateX(8deg) rotateY(-12deg) translateY(0)}50%{transform:perspective(700px) rotateX(8deg) rotateY(-12deg) translateY(-7px)}}@keyframes machineScan{0%,100%{transform:translateY(-120px);opacity:0}20%{opacity:.8}50%{transform:translateY(120px);opacity:.8}80%{opacity:0}}@keyframes tagFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  .light-theme .heroMachine .machineRing{border-color:rgba(255,49,87,.22);box-shadow:0 0 55px rgba(255,49,87,.08)}.light-theme .heroMachine .disc{background:radial-gradient(circle at 42% 36%,#e6e8ed 0,#c6c9d0 38%,#8e939e 70%);border-color:#9da2ad;box-shadow:inset 0 0 0 12px #b2b6bf,inset 0 0 35px rgba(0,0,0,.18),0 25px 60px rgba(0,0,0,.12)}.light-theme .heroMachine .spokes{background:conic-gradient(from 0deg,transparent 0 7deg,#858a96 7deg 13deg,transparent 13deg 72deg,#858a96 72deg 78deg,transparent 78deg 137deg,#858a96 137deg 143deg,transparent 143deg 202deg,#858a96 202deg 208deg,transparent 208deg 267deg,#858a96 267deg 273deg,transparent 273deg 332deg,#858a96 332deg 338deg,transparent 338deg)}.light-theme .heroMachine .tag{background:rgba(255,255,255,.84);color:#30343d;border-color:rgba(255,49,87,.2)}
  @media(max-width:850px){.heroVisual .orb.heroMachine{display:none}}
  @media(prefers-reduced-motion:reduce){.heroMachine *{animation:none!important}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  function mount(){
    const orb=document.querySelector('.heroVisual .orb');
    if(!orb)return setTimeout(mount,300);
    if(orb.classList.contains('heroMachine'))return;
    orb.className='orb heroMachine';
    orb.setAttribute('aria-label','MotoDC performance parts showcase');
    orb.innerHTML=`<div class="machineGlow"></div><div class="machineRing"></div><div class="disc"><div class="spokes"></div><div class="hub"></div><i class="bolt"></i><i class="bolt b2"></i><i class="bolt b3"></i><i class="bolt b4"></i><i class="bolt b5"></i></div><div class="scan"></div><div class="tag t1"><b>PARTS</b> / READY</div><div class="tag t2"><b>PERFORMANCE</b></div><div class="tag t3"><b>RIDE</b> / ON</div><div class="corner c1"></div><div class="corner c2"></div>`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
