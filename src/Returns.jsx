import React,{useEffect,useState} from 'react';
import {collection,addDoc,query,where,getDocs} from 'firebase/firestore';
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
         getDocs(query(collection(db,'orders','cod orders','records'),where('userId','==',u.uid),where('orderStatus','==','delivered'))),
         getDocs(query(collection(db,'orders','online orders','records'),where('userId','==',u.uid),where('orderStatus','==','delivered')))
       ]);
       if(!active)return;
       const delivered=sortNewest([...cod.docs,...online.docs].map(d=>({id:d.id,...d.data()})));
       setOrders(delivered);
       const seen=[];
       await Promise.all(delivered.map(async o=>{
         const payment=String(o.paymentMethod||'cod').toLowerCase()==='online'?'online':'cod';
         const group=groupFor(payment);
         for(const type of ['return','replacement']){
           try{
             const snap=await getDocs(query(collection(db,'request',group,typeCollection(payment,type)),where('userId','==',u.uid),where('orderId','==',o.id)));
             snap.docs.forEach(d=>seen.push({id:d.id,requestGroup:group,requestCollection:typeCollection(payment,type),...d.data()}));
           }catch(e){console.warn('Return history unavailable:',e)}
         }
       }));
       if(active)setRequests(sortNewest(seen));
     }catch(e){console.error(e);toast.error('Could not load delivered orders')}
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
     const payment=String(o.paymentMethod||'cod').toLowerCase()==='online'?'online':'cod';
     const group=groupFor(payment);
     const sub=typeCollection(payment,type);
     const sameType=requests.find(r=>r.orderId===o.id&&r.type===type&&['requested','approved','processing'].includes(r.status));
     if(sameType){toast.error(`A ${type} request is already active for this order`);return}
     const ref=await addDoc(collection(db,'request',group,sub),{
       userId:u.uid,orderId:o.id,displayOrderId:o.orderId||o.id,type,paymentMethod:payment,
       requestGroup:group,requestCollection:sub,reason:'Customer reported a mismatch or damage',
       status:'requested',customer:clean(o.customer),shipping:clean(o.shipping),items:clean(o.items),
       total:Number(o.total||0),createdAt:new Date(),updatedAt:new Date()
     });
     const newRequest={id:ref.id,requestGroup:group,requestCollection:sub,userId:u.uid,orderId:o.id,displayOrderId:o.orderId||o.id,type,paymentMethod:payment,status:'requested',customer:o.customer||{},shipping:o.shipping||{},items:o.items||[],total:Number(o.total||0),createdAt:new Date()};
     setRequests(xs=>sortNewest([newRequest,...xs]));
     toast.success(`${type==='replacement'?'Replacement':'Return'} request submitted`);
   }catch(e){console.error('Return request error:',e);toast.error(e?.code==='permission-denied'?'Return request permission was denied. Please sign in again.':e?.message||'Could not submit the request. Please try again.')}
   finally{setBusy('')}
 };
 return <section className="page ordersPage"><div className="pagehead"><p className="eyebrow">AFTER-SALES SUPPORT</p><h1>Returns & <span>replacement.</span></h1><p>Request help if an item arrived damaged, defective, or mismatched.</p></div>{loading?<div className="empty">Loading...</div>:<><div className="customerOrders">{orders.map(o=><article className="customerOrder" key={o.id}><div className="customerOrderTop"><div><b>{o.orderId||o.id}</b><small>{o.customer?.name||'Customer'} · {o.createdAt?.toDate?o.createdAt.toDate().toLocaleDateString('en-IN'):'Recently'}</small></div><strong>{money(o.total)}</strong><span className="status delivered"><Package size={14}/> Delivered</span></div><div className="returnActions"><button onClick={()=>request(o,'return')} disabled={busy.startsWith(o.id)}><RotateCcw size={16}/> {busy===o.id+'return'?'Submitting...':'Return'}</button><button onClick={()=>request(o,'replacement')} disabled={busy.startsWith(o.id)}><RefreshCw size={16}/> {busy===o.id+'replacement'?'Submitting...':'Replacement'}</button></div></article>)}</div>{!orders.length&&<div className="ordersEmpty"><Package size={40}/><h2>No delivered orders</h2><p>Delivered purchases will appear here when they become eligible for support.</p></div>}<div className="dashPanel returnHistory"><div className="dashPanelHead"><h3>Request history</h3></div>{requests.length?requests.map(r=><div className="returnRow" key={`${r.requestGroup}-${r.requestCollection}-${r.id}`}><b>{r.displayOrderId}</b><span>{r.type==='replacement'?'Replacement':'Return'}</span><strong>{r.status}</strong></div>):<p className="dashMuted">No return or replacement requests yet.</p>}</div></>}</section>;
}
