import React,{useEffect,useRef,useState} from 'react';
import {collection,onSnapshot,query,where} from 'firebase/firestore';
import {auth,db} from './firebase';
import {Package,ChevronDown,MapPin,Truck,CheckCircle,Clock,XCircle,RotateCcw,History,Download,Ban} from 'lucide-react';
import {jsPDF} from 'jspdf';
import {useNavigate,useLocation} from 'react-router-dom';
import {toast} from 'react-hot-toast';
import './orders.css';
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const steps=['placed','confirmed','packed','shipped','out_for_delivery','delivered'];
const labels={placed:'Order placed',confirmed:'Confirmed',packed:'Packed',shipped:'Shipped',out_for_delivery:'Out for delivery',delivered:'Delivered',returned:'Returned',replaced:'Replacement completed',cancelled:'Cancelled'};
const formatDate=value=>{try{const d=value?.toDate?value.toDate():value?new Date(value):null;return d&&!Number.isNaN(d.getTime())?d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'Recently'}catch{return'Recently'}};
const STATUS_TARGETS={placed:0.052,confirmed:0.160,packed:0.270,shipped:0.508,out_for_delivery:0.747,delivered:0.957,returned:0.508,replaced:0.747,cancelled:0.052};
const STATUS_META={placed:{badge:'processing',title:'Order Placed',stageText:'Station 1 of 5',phase:'Hub Staging',speed:'Stationary',eta:'3–4 Business Days',location:'Central Fulfillment Hub, Bangalore'},confirmed:{badge:'processing',title:'Order Confirmed',stageText:'Station 1.5 of 5',phase:'Inspection & Verification',speed:'Bay 4',eta:'3–4 Business Days',location:'Quality Inspection Bay'},packed:{badge:'processing',title:'Packed & Staged',stageText:'Station 2 of 5',phase:'Ready for Carrier Handover',speed:'Dock B',eta:'2–3 Business Days',location:'Outbound Logistics Terminal'},shipped:{badge:'in_transit',title:'In Transit',stageText:'Station 3 of 5',phase:'Express Highway NH-44',speed:'68 km/h',eta:'1–2 Business Days',location:'Highway Corridor · Regional Transit'},out_for_delivery:{badge:'in_transit',title:'Out for Delivery',stageText:'Station 4 of 5',phase:'Final Mile Courier Dispatch',speed:'32 km/h',eta:'Arriving Today',location:'Local Hub ➔ Delivery Route'},delivered:{badge:'delivered',title:'Delivered',stageText:'Station 5 of 5',phase:'Completed at Doorstep',speed:'Parked',eta:'Delivered',location:'Customer Address'},returned:{badge:'processing',title:'Return in Transit',stageText:'Reverse Stream',phase:'Returning to Inspection Facility',speed:'45 km/h',eta:'2–3 Days',location:'Return Processing Facility'},replaced:{badge:'in_transit',title:'Replacement Shipped',stageText:'Priority Transit',phase:'Replacement Transit',speed:'58 km/h',eta:'1–2 Days',location:'Priority Transit Hub'},cancelled:{badge:'processing',title:'Order Cancelled',stageText:'Terminated',phase:'Halted at Origin',speed:'0 km/h',eta:'Cancelled',location:'Central Depot (Discontinued)'}};
const WAYPOINTS=[{id:'placed',step:1,x:90,y:135,label:'ORDER PLACED',sub:'Hub Dispatch',labelPos:'bottom'},{id:'packed',step:2,x:340,y:90,label:'PACKED & READY',sub:'Inspected',labelPos:'top'},{id:'shipped',step:3,x:610,y:145,label:'IN TRANSIT',sub:'Highway Corridor',labelPos:'bottom'},{id:'out_for_delivery',step:4,x:880,y:85,label:'OUT FOR DELIVERY',sub:'Final Mile',labelPos:'top'},{id:'delivered',step:5,x:1120,y:133,label:'DELIVERED',sub:'Customer Doorstep',labelPos:'bottom'}];
const safeText=value=>String(value??'').replace(/[\r\n]+/g,' ').trim();
function downloadInvoice(o){try{const pdf=new jsPDF();const pageW=pdf.internal.pageSize.getWidth();const margin=16;let y=18;const line=(text,x=margin,size=10,bold=false)=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.text(safeText(text),x,y);y+=6};pdf.setFont('helvetica','bold');pdf.setFontSize(24);pdf.text('MOTO DC',margin,y);pdf.setFontSize(11);pdf.setFont('helvetica','normal');pdf.text('AUTOMOTIVE PARTS',margin,y+7);pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text('INVOICE',pageW-margin,y,{align:'right'});y+=22;pdf.setDrawColor(210);pdf.line(margin,y,pageW-margin,y);y+=10;const date=formatDate(o.createdAt);line(`Invoice / Order ID: ${o.orderId||o.id}`,margin,10,true);line(`Order date: ${date}`,margin,9,false);line(`Payment: ${o.paymentMethod==='cod'?'Cash on Delivery':'Online Payment'} · ${o.paymentStatus||'pending'}`,margin,9,false);y+=4;pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text('BILL TO',margin,y);y+=7;line(o.customer?.name||'Customer',margin,10,true);if(o.customer?.email)line(o.customer.email,margin,9);if(o.customer?.phone)line(o.customer.phone,margin,9);const address=[o.shipping?.address,o.shipping?.city,o.shipping?.state,o.shipping?.pincode].filter(Boolean).join(', ');if(address){const wrapped=pdf.splitTextToSize(address,pageW-margin*2);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(wrapped,margin,y);y+=wrapped.length*5+5;}y+=4;const colX=[margin,92,132,pageW-margin];pdf.setFillColor(242,243,245);pdf.rect(margin,y-5,pageW-margin*2,9,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('ITEM',colX[0]+2,y);pdf.text('QTY',colX[1]+2,y);pdf.text('PRICE',colX[2]+2,y);pdf.text('TOTAL',colX[3]-2,y,{align:'right'});y+=9;(o.items||[]).forEach(item=>{const name=pdf.splitTextToSize(safeText(item.name||'Item'),82);if(y+name.length*5>260){pdf.addPage();y=18;}pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(name,colX[0]+2,y);pdf.text(String(item.qty||1),colX[1]+2,y);pdf.text(`Rs. ${Number(item.price||0).toLocaleString('en-IN')}`,colX[2]+2,y);pdf.text(`Rs. ${(Number(item.price||0)*Number(item.qty||1)).toLocaleString('en-IN')}`,colX[3]-2,y,{align:'right'});y+=Math.max(7,name.length*5);pdf.setDrawColor(225);pdf.line(margin,y-3,pageW-margin,y-3);});y+=7;const subtotal=Number(o.subtotal??o.total??0),delivery=Number(o.delivery||0);pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text('Subtotal',pageW-80,y);pdf.text(`Rs. ${subtotal.toLocaleString('en-IN')}`,pageW-margin,y,{align:'right'});y+=7;pdf.text('Delivery',pageW-80,y);pdf.text(delivery?'Rs. '+delivery.toLocaleString('en-IN'):'FREE',pageW-margin,y,{align:'right'});y+=9;pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text('TOTAL',pageW-80,y);pdf.text(`Rs. ${Number(o.total||0).toLocaleString('en-IN')}`,pageW-margin,y,{align:'right'});y+=14;pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(110);pdf.text('Thank you for shopping with MOTO DC.',margin,y);pdf.text('This is a computer-generated invoice.',margin,y+5);pdf.save(`MOTO-DC-Invoice-${safeText(o.orderId||o.id).replace(/[^a-z0-9_-]/gi,'-')}.pdf`);toast.success('Invoice downloaded');}catch(e){console.error(e);toast.error('Could not generate invoice');}}
const cancellableStatuses=['placed','confirmed','packed'];
async function cancelOrder(o,onDeleted){const u=auth.currentUser;if(!u||o.userId!==u.uid){toast.error('You can only cancel your own order.');return}const status=o.orderStatus||'placed';if(!cancellableStatuses.includes(status)){toast.error('This order can no longer be cancelled.');return}if(!window.confirm('Are you sure you want to cancel this order? The order will be permanently removed.'))return;try{const token=await u.getIdToken();const response=await fetch('/api/cancel-order.js',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({orderId:o.orderId,docId:o.id,paymentMethod:o.paymentMethod})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Cancellation failed');onDeleted?.(o.id);toast.success(data.emailSent?'Order cancelled and confirmation email sent':'Order cancelled successfully');if(!data.emailSent)toast.error('The order was cancelled, but the customer email could not be sent.');}catch(e){console.error('Cancel order error:',e);toast.error(e.message||'Could not cancel the order. Please try again.')}}
async function deleteCompletedOrder(o,onDeleted){
 const u=auth.currentUser;
 if(!u||o.userId!==u.uid){toast.error('You can only delete your own order.');return}
 const status=String(o.orderStatus||'').toLowerCase();
 if(!['delivered','returned','replaced'].includes(status)){toast.error('Only delivered, returned, or replaced orders can be deleted.');return}
 if(!window.confirm('Delete this order from your order history? This cannot be undone.'))return;
 try{
  const token=await u.getIdToken();
  const response=await fetch('/api/cancel-order.js',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({docId:o.id,paymentMethod:o.paymentMethod})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Could not delete the order');
  onDeleted?.(o.id);
  toast.success('Order removed from your history');
 }catch(e){console.error('Delete order error:',e);toast.error(e.message||'Could not delete the order. Please try again.')}
}
function TrackingHeroMap({orders,activeOrderId,setActiveOrderId}){
  const activeOrder=orders.find(o=>o.id===activeOrderId)||orders[0]||null;
  const status=String(activeOrder?.orderStatus||'placed').toLowerCase();
  const meta=STATUS_META[status]||STATUS_META.placed;
  const targetProgress=STATUS_TARGETS[status]??STATUS_TARGETS.placed;
  const routePathRef=useRef(null);
  const traveledPathRef=useRef(null);
  const carRef=useRef(null);
  const currentProgressRef=useRef(0.05);

  useEffect(()=>{
    const path=routePathRef.current;
    const traveled=traveledPathRef.current;
    const car=carRef.current;
    if(!path||!car||!traveled)return;

    const total=path.getTotalLength();
    traveled.style.strokeDasharray=`${total}`;

    let raf=0;
    let start=0;
    const startP=currentProgressRef.current||0.05;
    const endP=targetProgress;
    const duration=Math.max(900,Math.min(2400,Math.abs(endP-startP)*2800));
    const easeOutCubic=t=>1-Math.pow(1-t,3);

    const updateVehicle=p=>{
      const clampedP=Math.max(0.001,Math.min(0.999,p));
      const dist=total*clampedP;
      const pt=path.getPointAtLength(dist);
      const ahead=path.getPointAtLength(Math.min(total,dist+3));
      const behind=path.getPointAtLength(Math.max(0,dist-3));
      const angle=(Math.atan2(ahead.y-behind.y,ahead.x-behind.x)*180)/Math.PI;

      car.setAttribute('transform',`translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
      traveled.style.strokeDashoffset=`${total*(1-clampedP)}`;
      currentProgressRef.current=clampedP;
    };

    const frame=now=>{
      if(!start)start=now;
      const elapsed=now-start;
      const t=Math.min(1,elapsed/duration);
      const p=startP+(endP-startP)*easeOutCubic(t);
      updateVehicle(p);

      if(t<1){
        raf=requestAnimationFrame(frame);
      }else{
        let idleStart=performance.now();
        const idleFrame=nowIdle=>{
          const idleT=(nowIdle-idleStart)/1000;
          const drift=Math.sin(idleT*1.8)*0.0012;
          updateVehicle(Math.max(0,Math.min(1,endP+drift)));
          raf=requestAnimationFrame(idleFrame);
        };
        raf=requestAnimationFrame(idleFrame);
      }
    };

    raf=requestAnimationFrame(frame);
    return()=>cancelAnimationFrame(raf);
  },[activeOrder,targetProgress]);

  const activeStep=status==='delivered'?5:status==='out_for_delivery'?4:status==='shipped'?3:(status==='packed'||status==='confirmed')?2:1;
  const destCity=activeOrder?.shipping?.city||'Doorstep Destination';
  const itemName=activeOrder?.items?.[0]?.name||(activeOrder?'MotoDC Parts':'No active shipment');

  return (
    <div className="ordersHero" id="order-tracking-hero">
      <div className="ordersHeroHeader">
        <div className="ordersHeroCopy">
          <p className="eyebrow"><i/> LIVE GPS FLEET DISPATCH</p>
          <h1>Real-Time <span>Delivery Radar.</span></h1>
          <p>Autonomous shipment telemetry and route tracking from garage to doorstep.</p>
        </div>

        {orders.length>1&&(
          <div className="activeOrderSwitcher">
            <span className="switcherLabel">TRACKING:</span>
            <div className="switcherPills">
              {orders.slice(0,4).map(o=>(
                <button
                  key={o.id}
                  type="button"
                  className={`switcherPill ${activeOrder?.id===o.id?'active':''}`}
                  onClick={()=>setActiveOrderId(o.id)}
                >
                  <b>#{o.orderId||o.id}</b>
                  <small>{labels[o.orderStatus]||o.orderStatus}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="trackingTelemetryHud">
        <div className="telemetryCard">
          <div className="telemetryCardLabel"><Package size={13}/> SHIPMENT INFO</div>
          <div className="telemetryCardValue">{activeOrder?`Order #${activeOrder.orderId||activeOrder.id}`:'Idle Standby'}</div>
          <div className="telemetryCardSub">{itemName}</div>
        </div>

        <div className="telemetryCard">
          <div className="telemetryCardLabel"><Clock size={13}/> LIVE STATUS</div>
          <div className="telemetryCardValue">
            <span className={`telemetryBadge ${meta.badge}`}>
              {meta.title}
            </span>
          </div>
          <div className="telemetryCardSub">{meta.stageText} · {meta.phase}</div>
        </div>

        <div className="telemetryCard">
          <div className="telemetryCardLabel"><MapPin size={13}/> TRANSIT CORRIDOR</div>
          <div className="telemetryCardValue">{destCity}</div>
          <div className="telemetryCardSub">{meta.location}</div>
        </div>

        <div className="telemetryCard">
          <div className="telemetryCardLabel"><Truck size={13}/> FLEET TELEMETRY</div>
          <div className="telemetryCardValue">ETA: {meta.eta}</div>
          <div className="telemetryCardSub">Courier Unit #KA-04-MD · {meta.speed}</div>
        </div>
      </div>

      <div className="ordersRoute" aria-label="Live shipment tracking route">
        <svg viewBox="0 0 1200 230" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="routeAsphalt" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#090d14"/>
              <stop offset="25%" stopColor="#151b26"/>
              <stop offset="50%" stopColor="#1c2331"/>
              <stop offset="75%" stopColor="#151b26"/>
              <stop offset="100%" stopColor="#090d14"/>
            </linearGradient>
            <linearGradient id="neonTraveled" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff1744"/>
              <stop offset="50%" stopColor="#ff3157"/>
              <stop offset="100%" stopColor="#ff6b8b"/>
            </linearGradient>
            <linearGradient id="hypercarBody" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#ff3864"/>
              <stop offset="20%" stopColor="#e11d48"/>
              <stop offset="60%" stopColor="#9f1239"/>
              <stop offset="90%" stopColor="#4c0519"/>
              <stop offset="100%" stopColor="#1a040b"/>
            </linearGradient>
            <linearGradient id="hypercarBodyHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,107,139,0.2)"/>
              <stop offset="50%" stopColor="rgba(255,255,255,0.95)"/>
              <stop offset="100%" stopColor="rgba(255,107,139,0.3)"/>
            </linearGradient>
            <linearGradient id="hypercarCanopy" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#0f172a"/>
              <stop offset="50%" stopColor="#020617"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </linearGradient>
            <linearGradient id="carbonSplitter" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e2430"/>
              <stop offset="50%" stopColor="#0b0f15"/>
              <stop offset="100%" stopColor="#1e2430"/>
            </linearGradient>
            <linearGradient id="laserBeamVolumetric" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(240, 249, 255, 0.9)"/>
              <stop offset="20%" stopColor="rgba(56, 189, 248, 0.5)"/>
              <stop offset="60%" stopColor="rgba(14, 165, 233, 0.18)"/>
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)"/>
            </linearGradient>
            <linearGradient id="laserBeamCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 1)"/>
              <stop offset="40%" stopColor="rgba(125, 211, 252, 0.6)"/>
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)"/>
            </linearGradient>
            <linearGradient id="turbineAlloyRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="40%" stopColor="#cbd5e1"/>
              <stop offset="80%" stopColor="#64748b"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </linearGradient>
            <linearGradient id="discRotor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1"/>
              <stop offset="50%" stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#475569"/>
            </linearGradient>
            <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="superNeonGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="blur1"/>
              <feGaussianBlur stdDeviation="2" result="blur2"/>
              <feMerge>
                <feMergeNode in="blur1"/>
                <feMergeNode in="blur2"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4"/>
            </filter>
          </defs>

          {/* Tactical High-Tech Grid & Telemetry Coordinates */}
          <g opacity="0.22">
            <line x1="30" y1="45" x2="1170" y2="45" stroke="#334155" strokeWidth="0.7" strokeDasharray="4 8"/>
            <line x1="30" y1="115" x2="1170" y2="115" stroke="#334155" strokeWidth="0.7" strokeDasharray="4 8"/>
            <line x1="30" y1="185" x2="1170" y2="185" stroke="#334155" strokeWidth="0.7" strokeDasharray="4 8"/>
            {/* Crosshairs & Sector Markers */}
            <path d="M 340 38 L 340 48 M 335 43 L 345 43" stroke="#ff3157" strokeWidth="1"/>
            <path d="M 610 38 L 610 48 M 605 43 L 615 43" stroke="#ff3157" strokeWidth="1"/>
            <path d="M 880 38 L 880 48 M 875 43 L 885 43" stroke="#ff3157" strokeWidth="1"/>
            <text x="45" y="28" fill="#64748b" fontSize="8" fontFamily="monospace" letterSpacing="0.8">
              RADAR LINK // 5.8 GHz · SECURE TELEMETRY FEED · HIGH-SPEED DISPATCH
            </text>
            <text x="1010" y="28" fill="#64748b" fontSize="8" fontFamily="monospace" letterSpacing="0.8">
              CORRIDOR // KA-04 ➔ DEST
            </text>
          </g>

          {/* Road Foundation Bed & Ambient Shadow */}
          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="rgba(0,0,0,0.65)"
            strokeWidth="32"
            strokeLinecap="round"
            filter="url(#softShadow)"
          />

          {/* Highway Guard Rails / Edge Curbs */}
          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="#1e293b"
            strokeWidth="24"
            strokeLinecap="round"
          />

          {/* Highway Asphalt Road Surface */}
          <path
            ref={routePathRef}
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="url(#routeAsphalt)"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Road Marking Outer Edge Glow */}
          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="#334155"
            strokeWidth="21"
            strokeDasharray="4 16"
            opacity="0.35"
          />

          {/* Center Road Dividers */}
          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="10 14"
          />

          {/* Neon Traveled Corridor (Glowing Red Laser Path) */}
          <path
            ref={traveledPathRef}
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="url(#neonTraveled)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#superNeonGlow)"
          />

          {/* Milestone Waypoint Stations */}
          {WAYPOINTS.map(wp=>{
            const isDone=activeStep>=wp.step;
            const isCurrent=activeStep===wp.step;
            const isAbove=wp.labelPos==='top';
            const badgeY=isAbove?wp.y-44:wp.y+44;
            const pinY1=isAbove?wp.y-12:wp.y+12;
            const pinY2=isAbove?wp.y-30:wp.y+30;

            return (
              <g key={wp.id} className="milestoneStation">
                <line
                  x1={wp.x}
                  y1={pinY1}
                  x2={wp.x}
                  y2={pinY2}
                  stroke={isCurrent?'#ff3157':isDone?'#ff4767':'#334155'}
                  strokeWidth={isCurrent?1.6:1}
                  strokeDasharray="2 3"
                  opacity={isDone?1:0.45}
                />
                {/* Station Node Ring */}
                <circle cx={wp.x} cy={wp.y} r="9" fill="#06090e" stroke={isCurrent?'#ff3157':isDone?'#e11d48':'#334155'} strokeWidth={isCurrent?2.5:2}/>
                <circle cx={wp.x} cy={wp.y} r="3.5" fill={isCurrent?'#ffffff':isDone?'#ff3157':'#1e293b'}/>

                {/* Animated Pulsing Sonar Rings for Current Milestone */}
                {isCurrent&&(
                  <>
                    <circle cx={wp.x} cy={wp.y} r="14" fill="none" stroke="#ff3157" strokeWidth="1.5" opacity="0.8">
                      <animate attributeName="r" values="9;26" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx={wp.x} cy={wp.y} r="10" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6">
                      <animate attributeName="r" values="9;18" dur="2s" begin="0.6s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.7;0" dur="2s" begin="0.6s" repeatCount="indefinite"/>
                    </circle>
                  </>
                )}

                {/* Waypoint Label Badge */}
                <g transform={`translate(${wp.x}, ${badgeY})`}>
                  <rect
                    x="-60"
                    y="-14"
                    width="120"
                    height="28"
                    rx="14"
                    fill={isCurrent?'rgba(255, 49, 87, 0.22)':isDone?'rgba(15, 23, 42, 0.94)':'rgba(8, 11, 16, 0.88)'}
                    stroke={isCurrent?'#ff3157':isDone?'rgba(255, 49, 87, 0.6)':'#334155'}
                    strokeWidth={isCurrent?1.8:1}
                    filter={isCurrent?'url(#neonGlow)':undefined}
                  />
                  <text
                    x="0"
                    y="-0.5"
                    textAnchor="middle"
                    fill={isCurrent?'#ffffff':isDone?'#ff8599':'#94a3b8'}
                    fontSize="9"
                    fontWeight="800"
                    fontFamily="Sora, sans-serif"
                    letterSpacing="0.5"
                  >
                    {wp.label}
                  </text>
                  <text
                    x="0"
                    y="8.8"
                    textAnchor="middle"
                    fill={isCurrent?'#ffe4e8':isDone?'#cbd5e1':'#64748b'}
                    fontSize="7"
                    fontWeight="600"
                    fontFamily="Sora, sans-serif"
                  >
                    {wp.sub}
                  </text>
                </g>
              </g>
            );
          })}

          {/* NEXT-GEN RAPID LOGISTICS HYPERCAR INTERCEPTOR */}
          <g ref={carRef} className="routeRealisticCar">
            {/* Live Telemetry HUD Badge floating above vehicle */}
            <g transform="translate(0, -36)">
              <rect
                x="-64"
                y="-11"
                width="128"
                height="21"
                rx="10.5"
                fill="rgba(6, 9, 14, 0.94)"
                stroke="rgba(255, 49, 87, 0.75)"
                strokeWidth="1.2"
                filter="url(#neonGlow)"
              />
              <circle cx="-51" cy="-0.5" r="3.2" fill="#22c55e">
                <animate attributeName="opacity" values="1;0.25;1" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <text x="-43" y="3.2" fill="#f8fafc" fontSize="7.5" fontWeight="800" fontFamily="Sora, monospace" letterSpacing="0.6">
                {meta.speed && meta.speed !== 'Stationary' && meta.speed !== '0 km/h' ? `${meta.speed} · GPS LOCKED` : `${meta.title.toUpperCase()} · UNIT #07`}
              </text>
            </g>

            {/* Ambient Ground Occlusion Contact Shadow */}
            <ellipse cx="0" cy="2.5" rx="49" ry="4.5" fill="rgba(0,0,0,0.85)" filter="url(#softShadow)"/>

            {/* Dynamic Crimson Neon Ground Effects Underglow */}
            <ellipse cx="0" cy="1.2" rx="45" ry="4" fill="rgba(255,49,87,0.65)" filter="url(#superNeonGlow)"/>

            {/* Long Volumetric Laser Projector Headlight Beam */}
            <polygon points="45,-9.5 240,-30 250,16 44,-5" fill="url(#laserBeamVolumetric)" opacity="0.68" pointerEvents="none"/>
            <polygon points="46,-9 150,-17 155,7 45,-6.5" fill="url(#laserBeamCore)" opacity="0.88" pointerEvents="none"/>

            {/* Rear Exhaust / Afterburner Ion Pulse */}
            <g transform="translate(-45, -8)">
              <ellipse cx="-4" cy="0" rx="6" ry="2.5" fill="rgba(56, 189, 248, 0.55)" filter="url(#neonGlow)">
                <animate attributeName="rx" values="4;7.5;4" dur="0.8s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.45;0.95;0.45" dur="0.8s" repeatCount="indefinite"/>
              </ellipse>
              <circle cx="-1" cy="0" r="2.2" fill="#ff3157"/>
            </g>

            {/* Rear Wheel Assembly (x = -25, y = -7) */}
            <g transform="translate(-25, -7)">
              <circle cx="0" cy="0" r="8" fill="#090c12" stroke="#1e2430" strokeWidth="1.2"/>
              <circle cx="0" cy="0" r="6" fill="url(#discRotor)"/>
              <line x1="-4" y1="0" x2="4" y2="0" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              <line x1="-3" y1="-3" x2="3" y2="3" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              <line x1="-3" y1="3" x2="3" y2="-3" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              {/* Brembo Brake Caliper */}
              <path d="M -4 -6 A 5.5 5.5 0 0 1 2 -6 L 1.5 -3.5 L -3.5 -3.5 Z" fill="#ff1744" stroke="#ffffff" strokeWidth="0.3"/>
              {/* Directional Turbine Rim Spokes */}
              <circle cx="0" cy="0" r="5" fill="none" stroke="url(#turbineAlloyRim)" strokeWidth="1"/>
              <path d="M 0 -5 C 1.5 -3, 3 -1.5, 4.5 0 M 0 5 C -1.5 3, -3 1.5, -4.5 0 M -5 0 C -3 -1.5, -1.5 -3, 0 -4.5 M 5 0 C 3 1.5, 1.5 3, 0 4.5" stroke="#cbd5e1" strokeWidth="1.1" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="1.8" fill="#ff1744" stroke="#ffffff" strokeWidth="0.6"/>
            </g>

            {/* Front Wheel Assembly (x = 25, y = -7) */}
            <g transform="translate(25, -7)">
              <circle cx="0" cy="0" r="8" fill="#090c12" stroke="#1e2430" strokeWidth="1.2"/>
              <circle cx="0" cy="0" r="6" fill="url(#discRotor)"/>
              <line x1="-4" y1="0" x2="4" y2="0" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              <line x1="-3" y1="-3" x2="3" y2="3" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              <line x1="-3" y1="3" x2="3" y2="-3" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1 1.5"/>
              {/* Brembo Brake Caliper */}
              <path d="M -4 -6 A 5.5 5.5 0 0 1 2 -6 L 1.5 -3.5 L -3.5 -3.5 Z" fill="#ff1744" stroke="#ffffff" strokeWidth="0.3"/>
              {/* Directional Turbine Rim Spokes */}
              <circle cx="0" cy="0" r="5" fill="none" stroke="url(#turbineAlloyRim)" strokeWidth="1"/>
              <path d="M 0 -5 C 1.5 -3, 3 -1.5, 4.5 0 M 0 5 C -1.5 3, -3 1.5, -4.5 0 M -5 0 C -3 -1.5, -1.5 -3, 0 -4.5 M 5 0 C 3 1.5, 1.5 3, 0 4.5" stroke="#cbd5e1" strokeWidth="1.1" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="1.8" fill="#ff1744" stroke="#ffffff" strokeWidth="0.6"/>
            </g>

            {/* Carbon Fiber Aero Underbody Skirt & Diffusers */}
            <path
              d="M -44 -6 L -35 -6 C -34 -15, -16 -15, -15 -6 L 15 -6 C 16 -15, 34 -15, 35 -6 L 45 -6 L 46 -4 L -44 -4 Z"
              fill="url(#carbonSplitter)"
              stroke="#334155"
              strokeWidth="0.5"
            />
            {/* Side Skirt Neon Blade Pinstripe */}
            <line x1="-15" y1="-4.5" x2="15" y2="-4.5" stroke="#ff3157" strokeWidth="1.2" filter="url(#neonGlow)"/>

            {/* Front Aero Splitter & Canard Dive Planes */}
            <polygon points="42,-5 47,-4 46,-8 43,-7" fill="#090d14" stroke="#ff3157" strokeWidth="0.6"/>

            {/* Main Hypercar Aerodynamic Silhouette Body */}
            <path
              d="
                M -42 -7
                L -44 -15
                C -44 -17, -42 -19, -38 -20
                L -22 -21
                C -20 -23, -16 -26, -10 -26.5
                L 5 -26.5
                C 14 -26.5, 22 -22, 28 -17
                L 38 -14
                C 43 -12, 46 -10, 46 -7
                L 45 -5
                L 35 -5
                C 34 -14, 16 -14, 15 -5
                L -15 -5
                C -16 -14, -34 -14, -35 -5
                L -42 -7
                Z
              "
              fill="url(#hypercarBody)"
              stroke="#ff6b8b"
              strokeWidth="0.8"
            />

            {/* Metallic Waistline Reflection Highlight Line */}
            <path
              d="M -38 -15 Q -10 -18 36 -11"
              fill="none"
              stroke="url(#hypercarBodyHighlight)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Side Radiator Cooling Scoop Channel */}
            <path
              d="M -8 -16 L 8 -16 L 4 -9 L -10 -9 Z"
              fill="#080b11"
              stroke="#ff3157"
              strokeWidth="0.6"
              opacity="0.9"
            />

            {/* Panoramic Jet Cockpit Canopy Glass */}
            <path
              d="M -18 -21 L -8 -25.5 L 6 -25.5 L 18 -18 L 18 -14 L -18 -14 Z"
              fill="url(#hypercarCanopy)"
              stroke="#38bdf8"
              strokeWidth="0.6"
            />
            {/* Interior Holographic Dashboard Arc Glow */}
            <path d="M 6 -22 Q 12 -20 15 -16" fill="none" stroke="#00f5ff" strokeWidth="1.4" opacity="0.85" filter="url(#neonGlow)"/>
            {/* Cockpit Glare Streaks */}
            <path d="M -14 -24 L -17 -15 M -4 -25 L -8 -15 M 4 -25 L 1 -15" stroke="rgba(255,255,255,0.65)" strokeWidth="0.9" strokeLinecap="round"/>

            {/* Swan-Neck Carbon Fiber Rear GT Wing */}
            <path d="M -36 -19 L -34 -24 L -45 -24 L -43 -19 Z" fill="#090d14" stroke="#1e293b" strokeWidth="0.5"/>
            <rect x="-46" y="-25" width="13" height="2.2" rx="1" fill="#ff1744" stroke="#ffffff" strokeWidth="0.4" filter="url(#superNeonGlow)"/>

            {/* Door Livery Typography */}
            <text x="-6" y="-10.5" fill="#ffffff" fontSize="4.6" fontWeight="900" fontFamily="Sora, sans-serif" letterSpacing="0.4">
              MOTO<tspan fill="#ff3157">DC</tspan>
            </text>
            <text x="-6" y="-7.2" fill="#94a3b8" fontSize="2.3" fontWeight="700" fontFamily="Sora, sans-serif" letterSpacing="0.6">
              RAPID INTERCEPTOR // 07
            </text>

            {/* Front Matrix Dual Projector LED Headlamps */}
            <polygon points="40,-11 45,-9 44,-6.5 39,-8.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="0.6" filter="url(#neonGlow)"/>
            <circle cx="43" cy="-8.5" r="1.6" fill="#ffffff"/>
            <circle cx="43" cy="-8.5" r="3.2" fill="rgba(56,189,248,0.7)" filter="url(#superNeonGlow)"/>

            {/* Rear Full-Width Photon LED Taillight Bar */}
            <rect x="-44.5" y="-15.5" width="2.5" height="5.5" rx="1" fill="#ff0033" stroke="#ffffff" strokeWidth="0.4" filter="url(#superNeonGlow)"/>
            <circle cx="-45" cy="-13" r="4" fill="rgba(255,0,51,0.75)" filter="url(#superNeonGlow)"/>

            {/* Roof Shark Telemetry Sensor Pod & Expanding Radar Sonar Waves */}
            <g transform="translate(-12, -26.5)">
              <polygon points="0,0 -3,-3 3,-3" fill="#090d14" stroke="#ff3157" strokeWidth="0.5"/>
              <circle cx="0" cy="-3.5" r="1.5" fill="#22c55e">
                <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite"/>
              </circle>
              {/* Sonar Radar Wave Pulses */}
              <circle cx="0" cy="-3.5" r="4" fill="none" stroke="#22c55e" strokeWidth="0.6" opacity="0.8">
                <animate attributeName="r" values="3;15" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.9;0" dur="1.6s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="-3.5" r="7" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5">
                <animate attributeName="r" values="5;22" dur="1.6s" begin="0.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7;0" dur="1.6s" begin="0.5s" repeatCount="indefinite"/>
              </circle>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function Orders(){
  const nav=useNavigate(),
    location=useLocation(),
    [justPlacedData,setJustPlacedData]=useState(()=>location.state?.justPlaced?location.state:null),
    [orders,setOrders]=useState([]),
    [loading,setLoading]=useState(true),
    [open,setOpen]=useState(null),
    [activeOrderId,setActiveOrderId]=useState(()=>location.state?.orderId||null);

  useEffect(()=>{
    if(location.state?.justPlaced&&location.state?.orderId){
      setActiveOrderId(location.state.orderId);
      window.scrollTo({top:0,behavior:'smooth'});
    }
  },[location.state]);

  useEffect(()=>{
    const u=auth.currentUser;
    if(!u){setLoading(false);return}
    const queries=[
      query(collection(db,'orders','cod orders','records'),where('userId','==',u.uid)),
      query(collection(db,'orders','online orders','records'),where('userId','==',u.uid))
    ];
    let active=true;
    const lists=[[],[]];
    const unsubs=queries.map((q,i)=>onSnapshot(q,snap=>{
      lists[i]=snap.docs.map(d=>({id:d.id,...d.data()}));
      const next=[...lists[0],...lists[1]].sort((a,b)=>{
        const ad=a.createdAt?.toMillis?a.createdAt.toMillis():0,
          bd=b.createdAt?.toMillis?b.createdAt.toMillis():0;
        return bd-ad;
      });
      if(active){
        setOrders(next);
        if(!activeOrderId&&next.length>0){
          setActiveOrderId(location.state?.orderId||next[0].id);
        }
        setLoading(false);
      }
    },e=>{
      console.error(e);
      if(active){toast.error('Could not load your orders.');setLoading(false)}
    }));
    return()=>{active=false;unsubs.forEach(u=>u())};
  },[activeOrderId,location.state]);

  const displayOrders=React.useMemo(()=>{
    if(justPlacedData?.orderId&&!orders.some(o=>o.orderId===justPlacedData.orderId||o.id===justPlacedData.orderId)){
      const provisional={
        id:justPlacedData.orderId,
        orderId:justPlacedData.orderId,
        total:justPlacedData.total,
        paymentMethod:justPlacedData.method,
        orderStatus:'placed',
        createdAt:new Date(),
        items:[{name:'MotoDC Order #'+justPlacedData.orderId,price:justPlacedData.total,qty:1}],
        delivery:'FREE',
        statusHistory:[{status:'placed',updatedAt:new Date().toISOString()}]
      };
      return [provisional,...orders];
    }
    return orders;
  },[orders,justPlacedData]);

  const removeLocal=id=>{
    setOrders(xs=>xs.filter(x=>x.id!==id));
    setOpen(v=>v===id?null:v);
    if(activeOrderId===id){
      const remaining=displayOrders.filter(x=>x.id!==id);
      setActiveOrderId(remaining[0]?.id||null);
    }
  };

  return (
    <section className="page ordersPage">
      {justPlacedData&&(
        <div className="orderJustPlacedBanner" role="status" aria-live="polite">
          <div className="justPlacedBannerLeft">
            <div className="justPlacedCheckCircle">
              <CheckCircle size={26}/>
            </div>
            <div className="justPlacedBannerText">
              <span className="justPlacedBadge">ORDER CONFIRMED · {justPlacedData.method==='cod'?'CASH ON DELIVERY':'ONLINE PAYMENT'}</span>
              <h2>Thank you! Your order <span>#{justPlacedData.orderId}</span> is confirmed.</h2>
              <p>Total: <b>{money(justPlacedData.total)}</b> · Our dispatch team has queued your package for express fulfillment.</p>
            </div>
          </div>
          <button
            type="button"
            className="justPlacedDismissBtn"
            onClick={()=>setJustPlacedData(null)}
            aria-label="Dismiss confirmation banner"
          >
            ✕
          </button>
        </div>
      )}

      <TrackingHeroMap
        orders={displayOrders}
        activeOrderId={activeOrderId}
        setActiveOrderId={setActiveOrderId}
      />

      <div className="ordersSectionHeader">
        <div className="ordersSectionTitleGroup">
          <h2>All Orders</h2>
          <span className="ordersCountBadge">
            {displayOrders.length} {displayOrders.length===1?'Order':'Orders'}
          </span>
        </div>
      </div>

      {loading&&!displayOrders.length?<div className="empty">Loading your orders...</div>:!displayOrders.length?<div className="ordersEmpty">
        <Package size={42}/>
        <h2>No orders found</h2>
        <p>Your orders will appear here once placed.</p>
        <button className="heroBtn" onClick={()=>nav('/products')}>Start Shopping</button>
      </div>:<div className="customerOrders">
        {displayOrders.map(o=>{
          const status=o.orderStatus||'placed',
            cancelled=status==='cancelled',
            afterSales=status==='returned'||status==='replaced',
            canCancel=cancellableStatuses.includes(status),
            idx=steps.indexOf(status),
            history=Array.isArray(o.statusHistory)?[...o.statusHistory].reverse():[];

          return (
            <article className="customerOrder" key={o.id}>
              <div className="customerOrderTop">
                <div className="orderProductPreview">
                  {o.items?.[0]?.image?<img src={o.items[0].image} alt={o.items[0].name||'Product'} loading="lazy" decoding="async"/>:<Package size={30}/>}
                </div>
                <div className="orderIdentity">
                  <b>Order #{o.orderId||o.id}</b>
                  <small>{formatDate(o.createdAt)}</small>
                  <strong>{o.items?.[0]?.name||'MOTO DC Order'}</strong>
                  <em>{o.items?.[0]?.variant||'Premium parts'} · {o.items?.length||1} item</em>
                </div>
                <div className="orderAmount">
                  <strong>{money(o.total)}</strong>
                  <small>{o.items?.length||1} item{(o.items?.length||1)!==1?'s':''}</small>
                </div>
                <div className="orderMiniProgress">
                  <div className="miniTrack">
                    {steps.slice(0,5).map((s,i)=><i className={i<=Math.min(idx,4)?'done':''} key={s}/>)}
                  </div>
                  <div className="miniLabels">
                    <span>Placed</span>
                    <span>Processing</span>
                    <span>Shipped</span>
                    <span>Out for Delivery</span>
                    <span>Delivered</span>
                  </div>
                </div>
                <div className="orderActions">
                  <span className={`status ${status}`}>
                    {cancelled?<XCircle size={14}/>:status==='delivered'?<CheckCircle size={14}/>:<Clock size={14}/>} {labels[status]||status.replaceAll('_',' ')}
                  </span>
                  <button
                    type="button"
                    className="trackOrderBtn"
                    onClick={()=>{
                      setActiveOrderId(o.id);
                      document.getElementById('order-tracking-hero')?.scrollIntoView({behavior:'smooth'});
                    }}
                    title="Track on map"
                  >
                    <MapPin size={13}/> Track on Map
                  </button>
                  <button className="viewOrderButton" onClick={()=>setOpen(open===o.id?null:o.id)}>
                    {open===o.id?'Close':'View Details'} <span>→</span>
                  </button>
                </div>
              </div>

              {open===o.id&&(
                <div className="customerOrderDetails">
                  <div className="customerAddress">
                    <h3><MapPin size={16}/> Delivery</h3>
                    <p>{o.shipping?.address||'—'}, {o.shipping?.city||'—'}, {o.shipping?.state||'—'} - {o.shipping?.pincode||'—'}</p>
                  </div>
                  <div>
                    <h3><Truck size={16}/> Items</h3>
                    {(o.items||[]).map((x,i)=>(
                      <div className="customerItem" key={i}>
                        <img src={x.image} alt={x.name||'Product'} loading="lazy" decoding="async"/>
                        <span><b>{x.name}</b><small>Qty {x.qty}</small></span>
                        <strong>{money(x.price*x.qty)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="invoiceActions">
                    <button onClick={()=>downloadInvoice(o)}><Download size={15}/> Download Invoice (PDF)</button>
                    {canCancel&&<button className="cancelOrderButton" onClick={()=>cancelOrder(o,removeLocal)}><Ban size={15}/> Cancel Order</button>}
                    {afterSales&&<button className="cancelOrderButton" onClick={()=>deleteCompletedOrder(o,removeLocal)}><XCircle size={15}/> Delete Order</button>}
                  </div>
                  {history.length>0&&(
                    <div className="statusHistory">
                      <h3><History size={16}/> Tracking history</h3>
                      <div className="historyList">
                        {history.map((h,i)=>(
                          <div className="historyItem" key={`${h.status}-${i}`}>
                            <span className="historyDot"></span>
                            <div>
                              <b>{labels[h.status]||String(h.status||'').replaceAll('_',' ')}</b>
                              <small>{formatDate(h.updatedAt)}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {cancelled&&(
                    <div className="afterSales">
                      <h3><XCircle size={16}/> Order cancelled</h3>
                      <p>This order has been cancelled. If you need help, please contact MOTO DC support.</p>
                    </div>
                  )}
                  {status==='delivered'&&(
                    <div className="afterSales">
                      <h3>Need help with this order?</h3>
                      <p>If an item arrived damaged, defective, or mismatched, you can request a return or replacement.</p>
                      <button onClick={()=>nav('/returns')}><RotateCcw size={15}/> Return / Replacement</button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>}
    </section>
  );
}
