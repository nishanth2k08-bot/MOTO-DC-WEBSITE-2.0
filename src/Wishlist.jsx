import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Heart,ShoppingCart,ArrowRight,Trash2,Star} from 'lucide-react';
import {toast} from 'react-hot-toast';

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const getWishlist=()=>{try{return JSON.parse(localStorage.getItem('motodc-wishlist')||'[]')}catch{return[]}};
const saveWishlist=w=>{localStorage.setItem('motodc-wishlist',JSON.stringify(w));window.dispatchEvent(new Event('wishlistchange'))};
const getCart=()=>{try{return JSON.parse(localStorage.getItem('motodc-cart')||'[]')}catch{return[]}};
const saveCart=c=>{localStorage.setItem('motodc-cart',JSON.stringify(c));window.dispatchEvent(new Event('cartchange'))};
const addToCart=p=>{const c=getCart(),i=c.findIndex(x=>x.id===p.id);if(i>=0)c[i].qty=Math.min(c[i].qty+1,p.stock);else c.push({...p,qty:1});saveCart(c);toast.success(`${p.name} added to cart`)};

export default function Wishlist(){
 const nav=useNavigate();
 const [items,setItems]=React.useState(getWishlist());
 React.useEffect(()=>{const f=()=>setItems(getWishlist());window.addEventListener('wishlistchange',f);return()=>window.removeEventListener('wishlistchange',f)},[]);
 const remove=p=>{const next=items.filter(x=>(typeof x==='string'?x:x.id)!==p.id);saveWishlist(next);toast.success('Removed from wishlist')};
 return <section className="page wishlistPage">
   <div className="pagehead"><p className="eyebrow">YOUR SAVED PARTS</p><h1>My <span>Wishlist.</span></h1><p>Keep your favourite automotive parts ready for later.</p></div>
   {!items.length?<div className="wishlistEmpty"><div className="wishlistEmptyIcon"><Heart size={30}/></div><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it here.</p><button className="heroBtn" onClick={()=>nav('/products')}>Browse Products <ArrowRight size={18}/></button></div>:
   <div className="grid">{items.map((stored,index)=>{const p=typeof stored==='string'?{id:stored,name:'Saved product',image:'/products/brake-disc.svg',category:'Automotive',price:0,rating:0,stock:1}:stored;return <article className="card wishlistCard" key={p.id||index}><div className="pic"><img src={p.image} alt={p.name}/><span>{p.category}</span><button className="heart wishActive" onClick={()=>remove(p)} aria-label="Remove from wishlist"><Heart size={17} fill="#ff3157" strokeWidth={2.5}/></button></div><div className="cardbody"><div className="rating"><Star size={14} fill="currentColor"/> {p.rating}<em>{p.stock} in stock</em></div><h3 onClick={()=>nav('/products/'+p.id)}>{p.name}</h3><strong>{money(p.price)}</strong><div className="actions"><button onClick={()=>remove(p)}><Trash2 size={14}/> Remove</button><button className="primary" onClick={()=>addToCart(p)}><ShoppingCart size={14}/> Add to Cart</button></div></div></article>})}</div>}
 </section>
}
