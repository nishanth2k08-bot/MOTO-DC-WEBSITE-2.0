(()=>{
  document.addEventListener('click',e=>{
    const link=e.target.closest('.nav nav a');
    if(!link)return;
    const label=link.textContent.trim().toLowerCase();
    let category='';
    if(label==='automobile')category='Automobile';
    if(label==='motorcycle')category='Motorcycle';
    if(!category)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const target=`/products?category=${encodeURIComponent(category)}`;
    if(window.location.pathname+window.location.search===target)return;
    // Keep the Products component mounted so the already-loaded catalog is reused.
    window.history.pushState({},'',target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({top:0,behavior:'auto'});
  },true);
})();
