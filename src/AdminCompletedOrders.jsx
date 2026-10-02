import React,{useEffect,useState,useMemo} from 'react';
import {collection,getDocs,query,where,orderBy,deleteDoc,doc} from 'firebase/firestore';
import {adminDb} from './firebase';
import {Package,ChevronDown,Trash2,MapPin,Phone,Mail,Search,X} from 'lucide-react';
import {toast} from 'react-hot-toast';
import './admin-dashboard.css';
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const records=p=>collection(adminDb,'orders',p==='online'?'online orders':'cod orders','records');
export default function AdminCompletedOrders(){
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[open,setOpen]=useState(null),[busy,setBusy]=useState('');
 const [searchQuery,setSearchQuery]=useState(''),[paymentFilter,setPaymentFilter]=useState('all');
 const load=async()=>{setLoading(true);try{const [cod,online]=await Promise.all([getDocs(query(records('cod'),where('orderStatus','==','delivered'),orderBy('createdAt','desc'))),getDocs(query(records('online'),where('orderStatus','==','delivered'),orderBy('createdAt','desc')))]);setOrders([...cod.docs,...online.docs].map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))}catch(e){console.error(e);toast.error(e.code==='failed-precondition'?'Create the Firestore indexes for completed order records first':'Could not load completed orders')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const remove=async o=>{if(!window.confirm(`Delete completed order ${o.orderId||o.id} permanently from Firebase?`))return;setBusy(o.id);try{await deleteDoc(doc(adminDb,'orders',o.paymentMethod==='online'?'online orders':'cod orders','records',o.id));setOrders(xs=>xs.filter(x=>x.id!==o.id));toast.success('Completed order deleted')}catch(e){console.error(e);toast.error('Could not delete completed order. Check Firebase rules.')}finally{setBusy('')}};
 const filteredOrders=useMemo(()=>{return orders.filter(o=>{if(paymentFilter!=='all'&&String(o.paymentMethod||'').toLowerCase()!==paymentFilter)return false;if(!searchQuery.trim())return true;const q=searchQuery.toLowerCase().trim();const id=String(o.orderId||o.id||'').toLowerCase();const name=String(o.customer?.name||'').toLowerCase();const phone=String(o.customer?.phone||'').toLowerCase();const email=String(o.customer?.email||'').toLowerCase();const city=String(o.shipping?.city||'').toLowerCase();const pincode=String(o.shipping?.pincode||'').toLowerCase();const address=String(o.shipping?.address||'').toLowerCase();const items=(o.items||[]).map(it=>String(it.name||'').toLowerCase()).join(' ');return id.includes(q)||name.includes(q)||phone.includes(q)||email.includes(q)||city.includes(q)||pincode.includes(q)||address.includes(q)||items.includes(q)})},[orders,searchQuery,paymentFilter]);

 return (
  <div className="completedOrdersSection">
   <div className="ordersHead">
    <div>
     <p className="eyebrow">ARCHIVE</p>
     <h2>Completed <span>orders.</span></h2>
     <p>Delivered orders are kept here separately from active order management.</p>
    </div>
    <button className="adminsignout" onClick={load} disabled={loading}><Package size={16}/> {loading?'Loading...':'Refresh'}</button>
   </div>
   <div className="adminSearchBar">
    <div className="adminSearchInputWrap">
     <Search size={16}/>
     <input type="text" placeholder="Search completed orders by ID, Customer Name, Phone, Email, City..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
     {searchQuery&&<button type="button" className="adminSearchClear" onClick={()=>setSearchQuery('')} title="Clear search"><X size={14}/></button>}
    </div>
    <div className="adminSearchFilters">
     <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}>
      <option value="all">All Payments</option>
      <option value="cod">Cash on Delivery (COD)</option>
      <option value="online">Online Payment</option>
     </select>
     {(searchQuery||paymentFilter!=='all')&&<button type="button" className="adminResetBtn" onClick={()=>{setSearchQuery('');setPaymentFilter('all')}}>Reset</button>}
    </div>
    <div className="adminSearchCount">Showing <b>{filteredOrders.length}</b> of {orders.length} completed orders</div>
   </div>
   {loading?<div className="empty">Loading completed orders...</div>:!orders.length?<div className="ordersEmpty"><Package size={40}/><h3>No completed orders</h3><p>Delivered orders will appear here.</p></div>:!filteredOrders.length?<div className="ordersEmpty"><Search size={38}/><h3>No matching completed orders</h3><p>No archive orders matched your search criteria.</p><button type="button" className="adminClearOrders" onClick={()=>{setSearchQuery('');setPaymentFilter('all')}} style={{marginTop:'10px'}}>Clear Search</button></div>:<div className="ordersList">{filteredOrders.map(o=><div className={`orderCard ${open===o.id?'expanded':''}`} key={`${o.paymentMethod}-${o.id}`}><div className="orderTop"><div><b>{o.orderId||o.id}</b><small>{o.customer?.name||'Customer'} · {o.customer?.phone||'No phone'}</small></div><strong>{money(o.total)}</strong><span className="status delivered">Delivered</span><button className="orderToggle" onClick={()=>setOpen(open===o.id?null:o.id)}><ChevronDown size={18}/></button><button className="adminOrderDelete" onClick={()=>remove(o)} disabled={busy===o.id} title="Delete completed order"><Trash2 size={17}/></button></div>{open===o.id&&<div className="orderDetails"><div className="detailGrid"><div><h4>Customer</h4><p><Mail size={14}/> {o.customer?.email||'—'}</p><p><Phone size={14}/> {o.customer?.phone||'—'}</p></div><div><h4>Delivery address</h4><p><MapPin size={14}/> {o.shipping?.address||'—'}, {o.shipping?.city||''}, {o.shipping?.state||''} - {o.shipping?.pincode||''}</p></div><div><h4>Payment</h4><p>{o.paymentMethod==='cod'?'Cash on Delivery':'Online Payment'} · {o.paymentStatus||'pending'}</p></div></div><div className="orderedItems"><h4>Items</h4>{(o.items||[]).map((x,i)=><div key={i}><img src={x.image} alt=""/><span><b>{x.name}</b><small>Qty {x.qty} · {money(x.price)} each</small></span><strong>{money(x.price*x.qty)}</strong></div>)}</div></div>}</div>)}</div>}
  </div>
 );
}
