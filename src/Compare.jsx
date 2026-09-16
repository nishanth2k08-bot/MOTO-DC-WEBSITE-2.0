import React,{useEffect,useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft,Trash2,X} from 'lucide-react';
import './compare.css';

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const getCompare=()=>{try{return JSON.parse(localStorage.getItem('motodc-compare')||'[]')}catch{return[]}};
const saveCompare=items=>{localStorage.setItem('motodc-compare',JSON.stringify(items));window.dispatchEvent(new Event('comparechange'))};
const value=(p,key)=>{
  const v=p?.[key];
  if(v===undefined||v===null||v==='')return '—';
  if(key==='price')return money(v);
  if(key==='rating')return `${v} / 5`;
  if(key==='stock')return Number(v)>0?`${v} in stock`:'Out of stock';
  return String(v);
};

export default function Compare(){
  const nav=useNavigate();
  const [items,setItems]=useState(getCompare);
  useEffect(()=>{const sync=()=>setItems(getCompare());addEventListener('comparechange',sync);return()=>removeEventListener('comparechange',sync)},[]);
  const rows=useMemo(()=>[
    ['Category','category'],['Brand','brand'],['Price','price'],['Rating','rating'],['Availability','stock'],
    ['Part Number','partNumber'],['Vehicle','vehicle'],['Compatibility','compatibility'],['Description','description']
  ].filter(([,key])=>key==='category'||key==='price'||key==='rating'||key==='stock'||items.some(p=>p?.[key]!==undefined&&p?.[key]!=='')),[items]);
  const remove=id=>saveCompare(items.filter(p=>p.id!==id));
  const clear=()=>saveCompare([]);
  return <section className="page comparePage">
    <button className="backBtn" onClick={()=>nav('/products')}><ArrowLeft size={16}/> Back to products</button>
    <div className="pagehead compareHead"><div><p className="eyebrow">PRODUCT COMPARISON</p><h1>Compare <span>parts.</span></h1><p>See important specifications side by side before you buy.</p></div>{items.length>0&&<button className="secondaryBtn compareClear" onClick={clear}><Trash2 size={15}/> Clear comparison</button>}</div>
    {items.length<2?<div className="compareEmpty"><div><h2>{items.length===1?'Add one more part to compare':'Choose products to compare'}</h2><p>{items.length===1?'Select another product from the catalog to see a side-by-side comparison.':'You can select up to 3 products from the catalog.'}</p><button className="heroBtn" onClick={()=>nav('/products')}>Browse products</button></div></div>:<>
      <div className="compareTableWrap"><table className="compareTable"><thead><tr><th>Specification</th>{items.map(p=><th key={p.id}><div className="compareProduct"><button className="compareRemove" onClick={()=>remove(p.id)} aria-label={`Remove ${p.name} from comparison`}><X size={15}/></button><img src={p.image} alt={p.name}/><h3>{p.name}</h3><button className="compareView" onClick={()=>nav('/products/'+p.id)}>View product</button></div></th>)}</tr></thead><tbody>{rows.map(([label,key])=><tr key={key}><th>{label}</th>{items.map(p=><td key={p.id}>{value(p,key)}</td>)}</tr>)}</tbody></table></div>
      {items.length<3&&<div className="compareAdd"><span>You can compare {3-items.length} more product{3-items.length===1?'':'s'}.</span><button className="secondaryBtn" onClick={()=>nav('/products')}>+ Add another</button></div>}
    </>}
  </section>;
}
