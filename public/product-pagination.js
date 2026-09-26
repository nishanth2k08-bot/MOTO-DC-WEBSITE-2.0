(()=>{
 const PAGE_SIZE={catalog:12,admin:10};
 let scanTimer=0,lockedUntil=0;
 const isAdminPage=()=>location.pathname.replace(/\/$/,'')==='/admin';
 const getItems=(c,t)=>[...c.querySelectorAll(t==='admin'?':scope > .adminproduct':':scope > .card')];
 const signature=items=>items.map(x=>x.querySelector('h3')?.textContent?.trim()||x.textContent.trim().slice(0,120)).join('|');
 const findNav=c=>c.classList.contains('adminlist')
  ?c.querySelector(':scope > #adminProductPagination')
  :c.parentElement?.querySelector(`:scope > .productPagination[data-owner="catalog"]`);

 const makeButton=(label,action,disabled,active)=>{
  const b=document.createElement('button');
  b.type='button';
  b.className='productPageBtn'+(active?' active':'');
  b.textContent=label;
  b.disabled=disabled;
  b.dataset.pageAction=action;
  return b;
 };

 const updateNav=(nav,page,total)=>{
  if(!nav)return;
  const info=nav.querySelector('.productPageInfo');
  if(info)info.textContent=`Page ${page} of ${total}`;
  const controls=nav.querySelector('.productPageControls');
  if(!controls)return;
  controls.innerHTML='';
  controls.appendChild(makeButton('‹','prev',page===1,false));
  const start=Math.max(1,Math.min(page-2,total-4)),end=Math.min(total,Math.max(5,start+4));
  for(let p=Math.max(1,start);p<=end;p++){
   controls.appendChild(makeButton(String(p),String(p),false,p===page));
  }
  controls.appendChild(makeButton('›','next',page===total,false));
 };

 const applyPage=(c,items,type,page)=>{
  const size=PAGE_SIZE[type],total=Math.max(1,Math.ceil(items.length/size));
  page=Math.max(1,Math.min(page,total));
  c.dataset.paginationPage=String(page);
  const from=(page-1)*size,to=page*size;
  items.forEach((x,i)=>x.style.setProperty('display',i>=from&&i<to?'':'none','important'));
  const nav=findNav(c);
  if(nav)updateNav(nav,page,total);
  if(type==='catalog'){
   try{
    sessionStorage.setItem('motodc-catalog-page',String(page));
    const url=new URL(window.location.href);
    if(page>1)url.searchParams.set('page',String(page));else url.searchParams.delete('page');
    window.history.replaceState(null,'',url.pathname+url.search);
   }catch(_){}
  }
 };

 const render=(c,type)=>{
  if(!c)return;
  const items=getItems(c,type);
  if(!items.length)return;
  const sig=signature(items);
  const oldSig=c.dataset.paginationSignature||'';
  const total=Math.max(1,Math.ceil(items.length/PAGE_SIZE[type]));

  let page=Number(c.dataset.paginationPage||0);

  if(type==='catalog'){
   const isNewMount=!c.dataset.paginationPage;
   const urlPage=Number(new URLSearchParams(window.location.search).get('page')||0);
   const savedPage=Number(sessionStorage.getItem('motodc-catalog-page')||0);
   const isReturning=sessionStorage.getItem('motodc-from-detail')==='1';

   if(isNewMount){
    const target=urlPage||savedPage||1;
    page=Math.max(1,Math.min(target,total));
    c.dataset.paginationSignature=sig;
    sessionStorage.setItem('motodc-catalog-sig',sig);
   }else if(sig!==oldSig){
    if(isReturning){
     const target=urlPage||savedPage||1;
     page=Math.max(1,Math.min(target,total));
    }else{
     page=1;
    }
    c.dataset.paginationSignature=sig;
    sessionStorage.setItem('motodc-catalog-sig',sig);
   }
  }else{
   if(!page||sig!==oldSig){
    page=1;
    c.dataset.paginationSignature=sig;
   }
  }

  page=Math.max(1,Math.min(page||1,total));
  let nav=findNav(c);
  if(type==='admin'){
   document.querySelectorAll('.productPagination[data-owner="admin"]').forEach(n=>{if(n.id!=='adminProductPagination')n.remove()});
   nav=findNav(c);
  }
  if(!nav){
   nav=document.createElement('div');
   nav.className='productPagination';
   nav.dataset.owner=type;
   if(type==='admin')nav.id='adminProductPagination';
   const info=document.createElement('span');
   info.className='productPageInfo';
   nav.appendChild(info);
   const controls=document.createElement('div');
   controls.className='productPageControls';
   nav.appendChild(controls);
   if(type==='admin')c.appendChild(nav);
   else c.insertAdjacentElement('afterend',nav);
  }
  applyPage(c,items,type,page);

  if(type==='catalog'){
   const savedScroll=sessionStorage.getItem('motodc-catalog-scroll');
   if(savedScroll!==null){
    const top=Number(savedScroll);
    requestAnimationFrame(()=>{
     window.scrollTo({top,behavior:'instant'});
     setTimeout(()=>{
      window.scrollTo({top,behavior:'instant'});
      sessionStorage.removeItem('motodc-catalog-scroll');
      sessionStorage.removeItem('motodc-from-detail');
     },80);
    });
   }
  }
 };

 const scan=()=>{
  if(Date.now()<lockedUntil)return;
  if(isAdminPage()){
   document.querySelectorAll('.productPagination[data-owner="catalog"]').forEach(n=>n.remove());
   document.querySelectorAll('.adminlist').forEach(x=>render(x,'admin'));
   return;
  }
  const toolbar=document.querySelector('.filterToolbar'),grid=toolbar?.parentElement?.querySelector(':scope > .grid');
  if(grid)render(grid,'catalog');
 };

 document.addEventListener('click',e=>{
  const card=e.target.closest('.grid > .card');
  if(card && !e.target.closest('button')){
   const grid=card.closest('.grid');
   const p=grid?.dataset?.paginationPage||sessionStorage.getItem('motodc-catalog-page')||'1';
   sessionStorage.setItem('motodc-catalog-page',String(p));
   sessionStorage.setItem('motodc-catalog-scroll',String(window.scrollY||0));
   sessionStorage.setItem('motodc-from-detail','1');
  }

  const b=e.target.closest('.productPageBtn');
  if(!b||b.disabled)return;
  e.preventDefault();
  e.stopPropagation();
  const nav=b.closest('.productPagination');
  if(!nav)return;
  const type=nav.dataset.owner||'catalog';
  const c=type==='admin'?nav.closest('.adminlist'):nav.previousElementSibling;
  if(!c)return;
  const items=getItems(c,type);
  if(!items.length)return;
  let page=Number(c.dataset.paginationPage||1),a=b.dataset.pageAction;
  if(a==='prev')page--;else if(a==='next')page++;else page=Number(a);
  lockedUntil=Date.now()+700;
  applyPage(c,items,type,page);
  setTimeout(()=>{if(Date.now()>=lockedUntil)scan()},800);
  window.requestAnimationFrame(()=>c.scrollIntoView({behavior:'smooth',block:'start'}));
 },true);

 const observer=new MutationObserver((mutations)=>{
  if(Date.now()<lockedUntil)return;
  const hasNewGrid=mutations.some(m=>[...m.addedNodes].some(n=>(n.classList?.contains('grid')||n.querySelector?.('.grid'))));
  clearTimeout(scanTimer);
  scanTimer=setTimeout(scan,hasNewGrid?30:120);
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);
 scan();
})();
