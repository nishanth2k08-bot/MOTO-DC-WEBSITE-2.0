(()=>{
 const PAGE_SIZE={catalog:12,admin:10};
 let observer=null,rendering=false,scanTimer=0;
 const getItems=(container,type)=>[...container.querySelectorAll(type==='admin'?':scope > .adminproduct':':scope > .card')];
 const signatureOf=items=>items.map(x=>x.querySelector('h3')?.textContent?.trim()||x.textContent.trim().slice(0,100)).join('|');
 const setPage=(container,items,type,page)=>{
  const size=PAGE_SIZE[type],total=Math.max(1,Math.ceil(items.length/size));
  page=Math.max(1,Math.min(page,total));
  container.dataset.paginationPage=String(page);
  const from=(page-1)*size,to=page*size;
  items.forEach((item,i)=>{item.hidden=!(i>=from&&i<to)});
  const nav=container.nextElementSibling;
  if(nav?.classList.contains('productPagination')){
   const info=nav.querySelector('.productPageInfo');if(info)info.textContent=`Page ${page} of ${total}`;
   nav.querySelectorAll('.productPageBtn').forEach(b=>b.classList.toggle('active',b.dataset.pageAction===String(page)));
   const prev=nav.querySelector('[data-page-action="prev"]'),next=nav.querySelector('[data-page-action="next"]');
   if(prev)prev.disabled=page===1;if(next)next.disabled=page===total;
  }
  return page;
 };
 const makeButton=(label,action,disabled,active)=>{const b=document.createElement('button');b.type='button';b.className='productPageBtn'+(active?' active':'');b.textContent=label;b.disabled=disabled;b.dataset.pageAction=action;return b};
 const render=(container,type)=>{
  if(!container||rendering)return;
  const items=getItems(container,type);if(!items.length)return;
  const sig=signatureOf(items),oldSig=container.dataset.paginationSignature||'';
  let page=Number(container.dataset.paginationPage||1);if(sig!==oldSig){page=1;container.dataset.paginationSignature=sig}
  const total=Math.max(1,Math.ceil(items.length/PAGE_SIZE[type]));page=Math.max(1,Math.min(page,total));
  rendering=true;
  try{
   setPage(container,items,type,page);
   let nav=container.nextElementSibling;if(!nav||!nav.classList.contains('productPagination')){nav=document.createElement('div');nav.className='productPagination';container.insertAdjacentElement('afterend',nav)}
   nav.dataset.ownerType=type;
   nav.replaceChildren();
   const info=document.createElement('span');info.className='productPageInfo';info.textContent=`Page ${page} of ${total}`;nav.appendChild(info);
   const controls=document.createElement('div');controls.className='productPageControls';controls.appendChild(makeButton('‹','prev',page===1,false));
   const start=Math.max(1,Math.min(page-2,total-4)),end=Math.min(total,start+4);
   for(let p=start;p<=end;p++)controls.appendChild(makeButton(String(p),String(p),false,p===page));
   controls.appendChild(makeButton('›','next',page===total,false));nav.appendChild(controls);
  }finally{rendering=false}
 };
 const scan=()=>{
  if(rendering)return;
  const toolbar=document.querySelector('.filterToolbar');const grid=toolbar?.parentElement?.querySelector(':scope > .grid');
  if(grid)render(grid,'catalog');
  document.querySelectorAll('.adminlist').forEach(list=>render(list,'admin'));
 };
 const schedule=()=>{clearTimeout(scanTimer);scanTimer=setTimeout(scan,150)};
 document.addEventListener('click',e=>{
  const b=e.target.closest('.productPageBtn');if(!b||b.disabled)return;
  const nav=b.closest('.productPagination');const container=nav?.previousElementSibling;if(!container)return;
  const type=nav.dataset.ownerType||'catalog',items=getItems(container,type);if(!items.length)return;
  const total=Math.ceil(items.length/PAGE_SIZE[type]);let page=Number(container.dataset.paginationPage||1),action=b.dataset.pageAction;
  if(action==='prev')page--;else if(action==='next')page++;else page=Number(action);
  setPage(container,items,type,Math.max(1,Math.min(page,total)));
  window.requestAnimationFrame(()=>container.scrollIntoView({behavior:'smooth',block:'start'}));
 });
 observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);scan();
})();
