(()=>{
  document.addEventListener('click',e=>{
    const link=e.target.closest('.nav nav a');
    if(!link)return;
    const label=link.textContent.trim().toLowerCase();
    let target='';
    if(label==='automobile')target='/products/auto';
    if(label==='motorcycle')target='/products/bike';
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(window.location.pathname!==target)window.location.assign(target);
  },true);
})();
