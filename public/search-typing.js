(()=>{
  const phrases=[
    "Find your part.",
    "Ride starts here.",
    "Parts made easy.",
    "Keep riding.",
    "Built to ride.",
    "Ride. Ready.",
    "Need a part?",
    "Your ride. Sorted.",
    "Power your ride.",
    "Part found. Ride on."
  ];
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
      if(!deleting){
        pos++;input.placeholder=text.slice(0,pos);
        if(pos>=text.length){deleting=true;timer=setTimeout(tick,pause);return}
        timer=setTimeout(tick,speed);
      }else{
        pos--;input.placeholder=text.slice(0,pos);
        if(pos<=0){deleting=false;phrase=(phrase+1)%phrases.length;timer=setTimeout(tick,350);return}
        timer=setTimeout(tick,eraseSpeed);
      }
    };
    tick();
    input.addEventListener('focus',()=>{input.placeholder='Search parts...'});
    input.addEventListener('blur',()=>{if(!input.value){clearTimeout(timer);pos=0;deleting=false;timer=setTimeout(tick,450)}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
