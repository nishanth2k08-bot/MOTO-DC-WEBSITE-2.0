(()=>{
 const states=new WeakMap();
 const makeButton=(label,disabled,handler,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.className='productPageBtn'+(active?' active':'');b.addEventListener('click',handler);return b};
 const paginate=(container,items,pageSize,key)=>{
  if(!container||!items.length)return;
  let state=states.get(container);
  const signature=items.map((x,i)=>x.textContent.trim().slice(0,80)+i).join('|');
  if(!state||state.signature!==signature){state={page:1,signature};states.set(container,state)}
  const total=Math.ceil(items.length/pageSize);if(state.page>total)state.page=total;
  items.forEach((item,i)=>{item.style.display=(i>=((state.page-1)*pageSize)&&i<(state.page*pageSize))?'':'none'});
  let nav=container.parentElement.querySelector(':scope > .productPagination');
  if(!nav){nav=document.createElement('div');nav.className='productPagination';container.insertAdjacentElement('afterend',nav)}
  nav.replaceChildren();
  const info=document.createElement('span');info.className='productPageInfo';info.textContent=`Page ${state.page} of ${total}`;nav.appendChild(info);
  const controls=document.createElement('div');controls.className='productPageControls';
  controls.appendChild(makeButton('‹',state.page===1,()=>{state.page--;paginate(container,items,pageSize,key)}));
  const start=Math.max(1,Math.min(state.page-2,total-4));const end=Math.min(total,start+4);
  for(let p=start;p<=end;p++)controls.appendChild(makeButton(String(p),false,()=>{state.page=p;paginate(container,items,pageSize,key)},p===state.page));
  controls.appendChild(makeButton('›',state.page===total,()=>{state.page++;paginate(container,items,pageSize,key)}));
  nav.appendChild(controls);
 };
 const scan=()=>{
  const catalogToolbar=document.querySelector('.filterToolbar');
  const catalogGrid=catalogToolbar?.parentElement?.querySelector('.grid');
  if(catalogGrid){const items=[...catalogGrid.querySelectorAll(':scope > .card')];paginate(catalogGrid,items,12,'catalog')}
  document.querySelectorAll('.adminlist').forEach(list=>{const items=[...list.querySelectorAll(':scope > .adminproduct')];paginate(list,items,10,'admin')});
 };
 let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(scan,40)};
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scan);scan();
})();
