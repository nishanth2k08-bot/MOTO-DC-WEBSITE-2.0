(()=>{
  const enhance=()=>{
    const drawer=document.querySelector('.catalogFilters');
    const row=drawer?.querySelector('.filterRow');
    if(!drawer||!row)return;
    if(!row.querySelector('.applyFiltersBtn')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='applyFiltersBtn';
      btn.textContent='APPLY FILTERS';
      btn.addEventListener('click',()=>document.querySelector('.filterToggle')?.click());
      row.appendChild(btn);
    }
    if(!drawer.querySelector('.filterCloseBtn')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='filterCloseBtn';
      btn.setAttribute('aria-label','Close filters');
      btn.textContent='×';
      btn.addEventListener('click',()=>document.querySelector('.filterToggle')?.click());
      drawer.prepend(btn);
    }
  };
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  enhance();
})();