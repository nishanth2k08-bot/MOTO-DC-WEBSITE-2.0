(()=>{
 const PAGE_SIZE={catalog:12,admin:10};
 let scanTimer=0,lockedUntil=0;
 const getItems=(c,t)=>[...c.querySelectorAll(t==='admin'?':scope > .adminproduct':':scope > .card')];
 const signature=items=>items.map(x=>x.querySelector('h3')?.textContent?.trim()||x.textContent.trim().slice(0,120)).join('|');
 const findNav=c=>c.querySelector(':scope > .productPagination');
 const applyPage=(c,items,type,page)=>{
  const size=PAGE_SIZE[type],total=Math.max(1,Math.ceil(items.length/size));
  page=Math.max(1,Math.min(page,total));c.dataset.paginationPage=page;
  const from=(page-1)*size,to=page*size;
  items.forEach((x,i)=>x.style.setProperty('display',i>=from&&i<to?'':'none','important'));
  const nav=findNav(c);if(!nav)return;
  const info=nav.querySelector('.productPageInfo');if(info)info.textContent=`Page ${page} of ${total}`;
  nav.querySelectorAll('.productPageBtn').forEach(b=>b.classList.toggle('active',b.dataset.pageAction===String(page)));
  const prev=nav.querySelector('[data-page-action="prev"]'),next=nav.querySelector('[data-page-action="next"]');
  if(prev)prev.disabled=page===1;if(next)next.disabled=page===total;
 };
 const makeButton=(label,action,disabled,active)=>{const b=document.createElement('button');b.type='button';b.className='productPageBtn'+(active?' active':'');b.textContent=label;b.disabled=disabled;b.dataset.pageAction=action;return b};
 const render=(c,type)=>{
  if(!c)return;const items=getItems(c,type);if(!items.length)return;
  const sig=signature(items),old=c.dataset.paginationSignature||'';let page=Number(c.dataset.paginationPage||1);
  if(sig!==old){page=1;c.dataset.paginationSignature=sig}
  const total=Math.max(1,Math.ceil(items.length/PAGE_SIZE[type]));page=Math.max(1,Math.min(page,total));
  let nav=findNav(c);
  if(!nav){
   nav=document.createElement('div');nav.className='productPagination';nav.dataset.ownerType=type;
   const info=document.createElement('span');info.className='productPageInfo';nav.appendChild(info);
   const controls=document.createElement('div');controls.className='productPageControls';controls.appendChild(makeButton('‹','prev',true,false));
   const start=Math.max(1,Math.min(page-2,total-4)),end=Math.min(total,start+4);
   for(let p=start;p<=end;p++)controls.appendChild(makeButton(String(p),String(p),false,p===page));
   controls.appendChild(makeButton('›','next',true,false));nav.appendChild(controls);
   c.appendChild(nav);
  }
  applyPage(c,items,type,page);
 };
 const scan=()=>{
  if(Date.now()<lockedUntil)return;
  const toolbar=document.querySelector('.filterToolbar'),grid=toolbar?.parentElement?.querySelector(':scope > .grid');
  if(grid)render(grid,'catalog');document.querySelectorAll('.adminlist').forEach(x=>render(x,'admin'));
 };
 document.addEventListener('click',e=>{
  const b=e.target.closest('.productPageBtn');if(!b||b.disabled)return;
  e.preventDefault();e.stopPropagation();
  const nav=b.closest('.productPagination');if(!nav)return;
  const type=nav.dataset.ownerType||'catalog';
  const c=type==='admin'?nav.parentElement:nav.previousElementSibling;if(!c)return;
  const items=getItems(c,type);if(!items.length)return;
  const total=Math.ceil(items.length/PAGE_SIZE[type]);let page=Number(c.dataset.paginationPage||1),a=b.dataset.pageAction;
  if(a==='prev')page--;else if(a==='next')page++;else page=Number(a);
  lockedUntil=Date.now()+700;applyPage(c,items,type,page);
  setTimeout(()=>{if(Date.now()>=lockedUntil)scan()},800);
  window.requestAnimationFrame(()=>c.scrollIntoView({behavior:'smooth',block:'start'}));
 },true);
 const observer=new MutationObserver(()=>{if(Date.now()>=lockedUntil){clearTimeout(scanTimer);scanTimer=setTimeout(scan,200)}});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);scan();
})();
