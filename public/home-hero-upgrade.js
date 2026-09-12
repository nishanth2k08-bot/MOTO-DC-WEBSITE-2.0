(()=>{
  const css=`
  .heroVisual .orb.heroMachine{width:min(450px,38vw);height:min(450px,38vw);min-width:330px;min-height:330px;position:relative;display:block;border:0;background:none;box-shadow:none;color:inherit;overflow:visible;transform:translateZ(0)}
  .heroMachine .machineGlow{position:absolute;inset:2%;border-radius:50%;background:radial-gradient(circle,rgba(255,49,87,.18),rgba(255,49,87,.07) 38%,transparent 68%);filter:blur(16px);animation:machinePulse 5s ease-in-out infinite}
  .heroMachine .machineRing{position:absolute;inset:5%;border:1px solid rgba(255,49,87,.22);border-radius:50%;box-shadow:0 0 70px rgba(255,49,87,.12),inset 0 0 50px rgba(255,49,87,.04);animation:machineSpin 26s linear infinite}
  .heroMachine .machineRing:before,.heroMachine .machineRing:after{content:"";position:absolute;border-radius:50%;border:1px dashed rgba(255,255,255,.12)}
  .heroMachine .machineRing:before{inset:5%}.heroMachine .machineRing:after{inset:17%;border-color:rgba(255,49,87,.17)}
  .heroMachine .disc{position:absolute;inset:15%;border-radius:50%;background:radial-gradient(circle at 37% 32%,#414652 0,#262a34 35%,#11141b 69%,#090b10 100%);border:2px solid #666c78;box-shadow:inset 0 0 0 13px #171a22,inset 0 0 42px rgba(0,0,0,.9),0 28px 70px rgba(0,0,0,.6);transform:perspective(850px) rotateX(10deg) rotateY(-16deg);animation:discFloat 6s ease-in-out infinite}
  .heroMachine .disc:before{content:"";position:absolute;inset:8%;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.055) 0deg 2deg,transparent 2deg 10deg);mask:radial-gradient(circle,transparent 0 42%,#000 43%)}
  .heroMachine .spokes{position:absolute;inset:10%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 6deg,#737986 6deg 12deg,transparent 12deg 72deg,#737986 72deg 78deg,transparent 78deg 138deg,#737986 138deg 144deg,transparent 144deg 204deg,#737986 204deg 210deg,transparent 210deg 270deg,#737986 270deg 276deg,transparent 276deg 336deg,#737986 336deg 342deg,transparent 342deg);filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));transform:rotate(3deg)}
  .heroMachine .spokes:after{content:"";position:absolute;inset:8%;border-radius:50%;border:1px solid rgba(255,255,255,.08)}
  .heroMachine .hub{position:absolute;left:50%;top:50%;width:25%;height:25%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#ff3157 0 17%,#a71f42 18% 30%,#11141b 31% 66%,#737986 67% 72%,#0c0f15 73%);box-shadow:0 0 28px rgba(255,49,87,.35)}
  .heroMachine .bolt{position:absolute;width:5%;height:5%;border-radius:50%;background:#d8dbe1;box-shadow:0 0 6px rgba(255,255,255,.2);left:47.5%;top:25.5%}
  .heroMachine .bolt.b2{transform:rotate(72deg);transform-origin:50% 490%}.heroMachine .bolt.b3{transform:rotate(144deg);transform-origin:50% 490%}.heroMachine .bolt.b4{transform:rotate(216deg);transform-origin:50% 490%}.heroMachine .bolt.b5{transform:rotate(288deg);transform-origin:50% 490%}
  .heroMachine .caliper{position:absolute;right:7%;top:31%;width:19%;height:35%;border:8px solid #e6e8ed;border-left:0;border-radius:0 45% 45% 0;transform:rotate(-10deg);filter:drop-shadow(0 0 7px rgba(255,49,87,.3))}
  .heroMachine .caliper:after{content:"";position:absolute;right:-9px;top:37%;width:12px;height:28%;border-radius:8px;background:#ff3157;box-shadow:0 0 12px rgba(255,49,87,.5)}
  .heroMachine .scan{position:absolute;left:4%;right:4%;top:50%;height:2px;background:linear-gradient(90deg,transparent,#ff3157 30%,#fff 50%,#ff3157 70%,transparent);box-shadow:0 0 16px rgba(255,49,87,.8);opacity:.8;animation:machineScan 5s ease-in-out infinite}
  .heroMachine .tag{position:absolute;padding:8px 11px;border:1px solid rgba(255,49,87,.3);border-radius:9px;background:rgba(9,11,16,.72);backdrop-filter:blur(10px);font:700 9px/1 Inter,sans-serif;letter-spacing:1.3px;color:#d9dde5;box-shadow:0 12px 30px rgba(0,0,0,.25);animation:tagFloat 4.5s ease-in-out infinite}
  .heroMachine .tag b{color:#ff3157}.heroMachine .tag.t1{right:-2%;top:19%}.heroMachine .tag.t2{left:-8%;top:34%;animation-delay:-1.4s}.heroMachine .tag.t3{right:3%;bottom:15%;animation-delay:-2.4s}
  .heroMachine .corner{position:absolute;width:32px;height:32px;border-color:rgba(255,49,87,.58);border-style:solid;opacity:.7}.heroMachine .c1{left:3%;top:8%;border-width:1px 0 0 1px}.heroMachine .c2{right:3%;bottom:8%;border-width:0 1px 1px 0}
  @keyframes machineSpin{to{transform:rotate(360deg)}}@keyframes machinePulse{0%,100%{transform:scale(.94);opacity:.65}50%{transform:scale(1.06);opacity:1}}@keyframes discFloat{0%,100%{transform:perspective(850px) rotateX(10deg) rotateY(-16deg) translateY(0) rotateZ(0deg)}50%{transform:perspective(850px) rotateX(10deg) rotateY(-16deg) translateY(-9px) rotateZ(1deg)}}@keyframes machineScan{0%,100%{transform:translateY(-145px);opacity:0}18%{opacity:.85}50%{transform:translateY(145px);opacity:.85}82%{opacity:0}}@keyframes tagFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .heroVisual .heroMachine{cursor:default}
  .heroVisual .heroMachine:hover .disc{animation-duration:3.5s}.heroVisual .heroMachine:hover .machineRing{animation-duration:12s}
  .light-theme .heroMachine .machineRing{border-color:rgba(255,49,87,.24);box-shadow:0 0 65px rgba(255,49,87,.09)}.light-theme .heroMachine .disc{background:radial-gradient(circle at 37% 32%,#f3f4f6 0,#d5d8de 35%,#a1a6b0 69%,#818793 100%);border-color:#aeb3bd;box-shadow:inset 0 0 0 13px #b9bdc5,inset 0 0 42px rgba(0,0,0,.15),0 28px 70px rgba(0,0,0,.12)}.light-theme .heroMachine .spokes{background:conic-gradient(from 0deg,transparent 0 6deg,#7b818d 6deg 12deg,transparent 12deg 72deg,#7b818d 72deg 78deg,transparent 78deg 138deg,#7b818d 138deg 144deg,transparent 144deg 204deg,#7b818d 204deg 210deg,transparent 210deg 270deg,#7b818d 270deg 276deg,transparent 276deg 336deg,#7b818d 336deg 342deg,transparent 342deg)}.light-theme .heroMachine .tag{background:rgba(255,255,255,.84);color:#30343d;border-color:rgba(255,49,87,.2)}
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
    orb.innerHTML=`<div class="machineGlow"></div><div class="machineRing"></div><div class="disc"><div class="spokes"></div><div class="hub"></div><i class="bolt"></i><i class="bolt b2"></i><i class="bolt b3"></i><i class="bolt b4"></i><i class="bolt b5"></i><div class="caliper"></div></div><div class="scan"></div><div class="tag t1"><b>PARTS</b> / READY</div><div class="tag t2"><b>PERFORMANCE</b></div><div class="tag t3"><b>RIDE</b> / ON</div><div class="corner c1"></div><div class="corner c2"></div>`;
    const visual=orb.closest('.heroVisual');
    if(visual){visual.addEventListener('pointermove',e=>{const r=visual.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;orb.style.setProperty('--mx',`${x*10}deg`);orb.style.setProperty('--my',`${y*8}deg`);orb.style.transform=`translate3d(${x*8}px,${y*6}px,0)`});visual.addEventListener('pointerleave',()=>{orb.style.transform='translate3d(0,0,0)'})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
