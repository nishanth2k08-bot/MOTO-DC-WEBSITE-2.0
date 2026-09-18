import React,{useEffect,useState} from 'react';
import {collection,query,where,getDocs} from 'firebase/firestore';
import {auth,db} from './firebase';
import {Package,RotateCcw,RefreshCw} from 'lucide-react';
import {toast} from 'react-hot-toast';
import './orders.css';

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const clean=value=>{try{return JSON.parse(JSON.stringify(value??{}))}catch{return{}}};
const sortNewest=xs=>xs.sort((a,b)=>{const av=a.createdAt?.toMillis?a.createdAt.toMillis():new Date(a.createdAt||0).getTime();const bv=b.createdAt?.toMillis?b.createdAt.toMillis():new Date(b.createdAt||0).getTime();return bv-av});
const groupFor=payment=>String(payment||'cod').toLowerCase()==='online'?'online request':'cod request';
const typeCollection=(payment,type)=>type==='replacement'?`${payment} replacement`:`${payment} return`;

export default function Returns(){
 const [orders,setOrders]=useState([]),[requests,setRequests]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 useEffect(()=>{
   const u=auth.currentUser;
   if(!u){setLoading(false);return}
   let active=true;
   const load=async()=>{
     try{
       const [cod,online]=await Promise.all([
         getDocs(query(collection(db,'orders','cod orders','records'),where('userId','==',u.uid))),
         getDocs(query(collection(db,'orders','online orders','records'),where('userId','==',u.uid)))
       ]);
       if(!active)return;
       const allOrders=[...cod.docs,...online.docs].map(d=>({id:d.id,...d.data()}))
         .filter(o=>['delivered','returned','replaced'].includes(String(o.orderStatus||'').toLowerCase()));
       const token=await u.getIdToken();
       const response=await fetch('/api/returns',{headers:{Authorization:`Bearer ${token}`}});
       const data=await response.json().catch(()=>({}));
       if(!response.ok)throw new Error(data.error||'Could not load return history');
       const history=Array.isArray(data.requests)?data.requests:[];
       const completedByOrder={};
       history.forEach(r=>{
         if(['completed','processing','approved','requested'].includes(r.status))completedByOrder[r.orderId]=r;
       });
       const merged=allOrders.map(o=>{
         const r=completedByOrder[o.id];
         if(r?.status==='completed'){
           const finalStatus=r.type==='replacement'?'replaced':'returned';
           return {...o,orderStatus:finalStatus,afterSalesType:r.type,afterSalesRequestId:r.id};
         }
         return o;
       });
       setOrders(sortNewest(merged));
       setRequests(sortNewest(history));
     }catch(e){console.error(e);toast.error(e?.message||'Could not load return information')}
     finally{if(active)setLoading(false)}
   };
   load();
   return()=>{active=false};
 },[]);
 const request=async(o,type)=>{
   if(busy)return;
   const u=auth.currentUser;
   if(!u){toast.error('Please sign in again');return}
   const existing=requests.find(r=>r.orderId===o.id&&['requested','approved','processing'].includes(r.status));
   if(existing){toast.error('A request is already active for this order');return}
   setBusy(o.id+type);
   try{
     const token=await u.getIdToken();
     const payment=String(o.paymentMethod||'cod').toLowerCase()==='online'?'online':'cod';
     const response=await fetch('/api/returns',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({
       orderId:o.id,displayOrderId:o.orderId||o.id,type,paymentMethod:payment,
       customer:clean(o.customer),shipping:clean(o.shipping),items:clean(o.items),total:Number(o.total||0)
     })});
     const data=await response.json().catch(()=>({}));
     if(!response.ok)throw new Error(data.error||'Could not submit the request');
     const group=groupFor(payment),sub=typeCollection(payment,type);
     setRequests(xs=>sortNewest([{id:data.id,requestGroup:group,requestCollection:sub,userId:u.uid,orderId:o.id,displayOrderId:o.orderId||o.id,type,paymentMethod:payment,status:'requested',customer:clean(o.customer),shipping:clean(o.shipping),items:clean(o.items),total:Number(o.total||0),createdAt:new Date()},...xs]));
     toast.success(`${type==='replacement'?'Replacement':'Return'} request submitted`);
   }catch(e){console.error('Return request error:',e);toast.error(e?.message||'Could not submit the request. Please try again.')}
   finally{setBusy('')}
 };
 return <section className="page ordersPage"><div className="pagehead"><p className="eyebrow">AFTER-SALES SUPPORT</p><h1>Returns & <span>replacement.</span></h1><p>Request help if an item arrived damaged, defective, or mismatched.</p></div>{loading?<div className="empty">Loading...</div>:<><div className="customerOrders">{orders.map(o=><article className="customerOrder" key={o.id}><div className="customerOrderTop"><div><b>{o.orderId||o.id}</b><small>{o.customer?.name||'Customer'} · {o.createdAt?.toDate?o.createdAt.toDate().toLocaleDateString('en-IN'):'Recently'}</small></div><strong>{money(o.total)}</strong><span className="status delivered"><Package size={14}/> Delivered</span></div><div className="returnActions"><button onClick={()=>request(o,'return')} disabled={busy.startsWith(o.id)}><RotateCcw size={16}/> {busy===o.id+'return'?'Submitting...':'Return'}</button><button onClick={()=>request(o,'replacement')} disabled={busy.startsWith(o.id)}><RefreshCw size={16}/> {busy===o.id+'replacement'?'Submitting...':'Replacement'}</button></div></article>)}</div>{!orders.length&&<div className="ordersEmpty"><Package size={40}/><h2>No delivered orders</h2><p>Delivered purchases will appear here when they become eligible for support.</p></div>}<div className="dashPanel returnHistory"><div className="dashPanelHead"><h3>Request history</h3></div>{requests.length?requests.map(r=><div className="returnRow" key={`${r.requestGroup}-${r.requestCollection}-${r.id}`}><b>{r.displayOrderId}</b><span>{r.type==='replacement'?'Replacement':'Return'}</span><strong>{r.status}</strong></div>):<p className="dashMuted">No return or replacement requests yet.</p>}</div></>}</section>;
}
