(()=>{
 const PAGE_SIZE={catalog:12,admin:10};
 const signatureOf=items=>items.map(x=>x.getAttribute('data-pagination-id')||x.querySelector('h3')?.textContent?.trim()||'').join('|');
 const button=(label,disabled,action,active=false)=>{const b=document.createElement('button');b.type='button';b.className='productPageBtn'+(active?' active':'');b.textContent=label;b.disabled=disabled;b.dataset.pageAction=action;return b};
 const render=(container,items,type)=>{
  if(!container)return;
  const size=PAGE_SIZE[type];
  if(!items.length){container.nextElementSibling?.classList.contains('productPagination')&&container.nextElementSibling.remove();return}
  const sig=signatureOf(items);let page=Number(container.dataset.paginationPage||1);const oldSig=container.dataset.paginationSignature||'';
  if(oldSig!==sig){page=1;container.dataset.paginationSignature=sig}
  const total=Math.max(1,Math.ceil(items.length/size));page=Math.max(1,Math.min(page,total));container.dataset.paginationPage=String(page);
  const from=(page-1)*size,to=page*size;items.forEach((item,i)=>{item.hidden=!(i>=from&&i<to)});
  let nav=container.nextElementSibling;if(!nav||!nav.classList.contains('productPagination')){nav=document.createElement('div');nav.className='productPagination';container.insertAdjacentElement('afterend',nav)}
  nav.dataset.ownerType=type;nav.replaceChildren();
  const info=document.createElement('span');info.className='productPageInfo';info.textContent=`Page ${page} of ${total}`;nav.appendChild(info);
  const controls=document.createElement('div');controls.className='productPageControls';
  controls.appendChild(button('‹',page===1,'prev'));
  const start=Math.max(1,Math.min(page-2,total-4)),end=Math.min(total,start+4);
  for(let p=start;p<=end;p++)controls.appendChild(button(String(p),false,String(p),p===page));
  controls.appendChild(button('›',page===total,'next'));nav.appendChild(controls);
 };
 const scan=()=>{
  const toolbar=document.querySelector('.filterToolbar');const grid=toolbar?.parentElement?.querySelector(':scope > .grid');
  if(grid)render(grid,[...grid.querySelectorAll(':scope > .card')],'catalog');
  document.querySelectorAll('.adminlist').forEach(list=>render(list,[...list.querySelectorAll(':scope > .adminproduct')],'admin'));
 };
 document.addEventListener('click',e=>{
  const b=e.target.closest('.productPageBtn');if(!b||b.disabled)return;
  const nav=b.closest('.productPagination');if(!nav)return;
  const container=nav.previousElementSibling;if(!container)return;
  const items=[...container.querySelectorAll(':scope > .card, :scope > .adminproduct')];
  const type=nav.dataset.ownerType||'catalog',size=PAGE_SIZE[type],total=Math.max(1,Math.ceil(items.length/size));
  let page=Number(container.dataset.paginationPage||1),action=b.dataset.pageAction;
  if(action==='prev')page--;else if(action==='next')page++;else page=Number(action);
  page=Math.max(1,Math.min(page,total));container.dataset.paginationPage=String(page);
  const from=(page-1)*size,to=page*size;items.forEach((item,i)=>{item.hidden=!(i>=from&&i<to)});
  const info=nav.querySelector('.productPageInfo');if(info)info.textContent=`Page ${page} of ${total}`;
  nav.querySelectorAll('.productPageBtn').forEach(x=>x.classList.toggle('active',x.dataset.pageAction===String(page)));
  const prev=nav.querySelector('[data-page-action="prev"]'),next=nav.querySelector('[data-page-action="next"]');if(prev)prev.disabled=page===1;if(next)next.disabled=page===total;
  window.requestAnimationFrame(()=>container.scrollIntoView({behavior:'smooth',block:'start'}));
 });
 let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(scan,100)};
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);scan();
})();
