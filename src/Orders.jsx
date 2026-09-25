import React,{useEffect,useRef,useState} from 'react';
import {collection,onSnapshot,query,where} from 'firebase/firestore';
import {auth,db} from './firebase';
import {Package,ChevronDown,MapPin,Truck,CheckCircle,Clock,XCircle,RotateCcw,History,Download,Ban} from 'lucide-react';
import {jsPDF} from 'jspdf';
import {useNavigate} from 'react-router-dom';
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
              <stop offset="0%" stopColor="#0d1117"/>
              <stop offset="50%" stopColor="#151b24"/>
              <stop offset="100%" stopColor="#0d1117"/>
            </linearGradient>
            <linearGradient id="neonTraveled" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff1744"/>
              <stop offset="50%" stopColor="#ff3157"/>
              <stop offset="100%" stopColor="#ff6b8b"/>
            </linearGradient>
            <linearGradient id="carPaint" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#ff4767"/>
              <stop offset="25%" stopColor="#e11d48"/>
              <stop offset="65%" stopColor="#9f1239"/>
              <stop offset="100%" stopColor="#4c0519"/>
            </linearGradient>
            <linearGradient id="carGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b"/>
              <stop offset="100%" stopColor="#090d16"/>
            </linearGradient>
            <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(224,242,254,0.65)"/>
              <stop offset="35%" stopColor="rgba(56,189,248,0.3)"/>
              <stop offset="100%" stopColor="rgba(56,189,248,0)"/>
            </linearGradient>
            <linearGradient id="alloyRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc"/>
              <stop offset="50%" stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#475569"/>
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3"/>
            </filter>
          </defs>

          <g opacity="0.18">
            <line x1="40" y1="50" x2="1160" y2="50" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 8"/>
            <line x1="40" y1="115" x2="1160" y2="115" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 8"/>
            <line x1="40" y1="180" x2="1160" y2="180" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 8"/>
            <text x="50" y="32" fill="#64748b" fontSize="8" fontFamily="monospace">GRID 12.97°N / 77.59°E · SECTOR CORRIDOR</text>
            <text x="1050" y="32" fill="#64748b" fontSize="8" fontFamily="monospace">DEST: 13.08°N / 80.27°E</text>
          </g>

          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="30"
            strokeLinecap="round"
          />
          <path
            ref={routePathRef}
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="url(#routeAsphalt)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="#263142"
            strokeWidth="22"
            strokeDasharray="6 14"
            opacity="0.45"
          />
          <path
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="#475569"
            strokeWidth="1.8"
            strokeDasharray="10 14"
          />

          <path
            ref={traveledPathRef}
            d="M 30 140 C 130 140, 220 90, 340 90 C 460 90, 490 145, 610 145 C 730 145, 760 85, 880 85 C 1000 85, 1030 135, 1170 135"
            fill="none"
            stroke="url(#neonTraveled)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />

          {WAYPOINTS.map(wp=>{
            const isDone=activeStep>=wp.step;
            const isCurrent=activeStep===wp.step;
            const isAbove=wp.labelPos==='top';
            const badgeY=isAbove?wp.y-42:wp.y+42;
            const pinY1=isAbove?wp.y-12:wp.y+12;
            const pinY2=isAbove?wp.y-28:wp.y+28;

            return (
              <g key={wp.id} className="milestoneStation">
                <line x1={wp.x} y1={pinY1} x2={wp.x} y2={pinY2} stroke={isDone?'#ff3157':'#334155'} strokeWidth="1" strokeDasharray="2 3" opacity={isDone?0.9:0.5}/>
                <circle cx={wp.x} cy={wp.y} r="8" fill="#090c12" stroke={isDone?'#ff3157':'#334155'} strokeWidth="2.5"/>
                <circle cx={wp.x} cy={wp.y} r="3" fill={isDone?(isCurrent?'#ffffff':'#ff3157'):'#1e293b'}/>

                {isCurrent&&(
                  <circle cx={wp.x} cy={wp.y} r="14" fill="none" stroke="#ff3157" strokeWidth="1.5" opacity="0.6">
                    <animate attributeName="r" values="8;22" dur="1.8s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite"/>
                  </circle>
                )}

                <g transform={`translate(${wp.x}, ${badgeY})`}>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill={isCurrent?'rgba(255, 49, 87, 0.22)':isDone?'rgba(15, 23, 42, 0.92)':'rgba(8, 11, 16, 0.85)'}
                    stroke={isCurrent?'#ff3157':isDone?'rgba(255, 49, 87, 0.5)':'#334155'}
                    strokeWidth={isCurrent?1.5:1}
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    fill={isCurrent?'#ffffff':isDone?'#ff8599':'#94a3b8'}
                    fontSize="8.5"
                    fontWeight="800"
                    fontFamily="Sora, sans-serif"
                    letterSpacing="0.4"
                  >
                    {wp.label}
                  </text>
                  <text
                    x="0"
                    y="8.5"
                    textAnchor="middle"
                    fill={isCurrent?'#ffd1d9':'#64748b'}
                    fontSize="6.8"
                    fontWeight="600"
                    fontFamily="Sora, sans-serif"
                  >
                    {wp.sub}
                  </text>
                </g>
              </g>
            );
          })}

          <g ref={carRef} className="routeRealisticCar">
            <ellipse cx="0" cy="1" rx="42" ry="4" fill="rgba(0,0,0,0.7)" filter="url(#softShadow)"/>
            <ellipse cx="0" cy="0" rx="35" ry="3" fill="rgba(255,49,87,0.4)" filter="url(#neonGlow)"/>

            <polygon points="36,-11 145,-26 150,10 35,-6" fill="url(#headlightBeam)" opacity="0.6" pointerEvents="none"/>

            <g transform="translate(-23, -8)">
              <circle cx="0" cy="0" r="7.5" fill="#14171d" stroke="#2a3342" strokeWidth="1.2"/>
              <circle cx="0" cy="0" r="5" fill="url(#alloyRim)"/>
              <path d="M 0 -4.5 L 0 4.5 M -4.5 0 L 4.5 0 M -3.2 -3.2 L 3.2 3.2 M -3.2 3.2 L 3.2 -3.2" stroke="#151921" strokeWidth="0.9"/>
              <path d="M -3 -4 A 4 4 0 0 1 1 -5.2 L 1 -3 Z" fill="#ff3157"/>
              <circle cx="0" cy="0" r="1.8" fill="#0d1117" stroke="#ffffff" strokeWidth="0.5"/>
            </g>

            <g transform="translate(23, -8)">
              <circle cx="0" cy="0" r="7.5" fill="#14171d" stroke="#2a3342" strokeWidth="1.2"/>
              <circle cx="0" cy="0" r="5" fill="url(#alloyRim)"/>
              <path d="M 0 -4.5 L 0 4.5 M -4.5 0 L 4.5 0 M -3.2 -3.2 L 3.2 3.2 M -3.2 3.2 L 3.2 -3.2" stroke="#151921" strokeWidth="0.9"/>
              <path d="M -3 -4 A 4 4 0 0 1 1 -5.2 L 1 -3 Z" fill="#ff3157"/>
              <circle cx="0" cy="0" r="1.8" fill="#0d1117" stroke="#ffffff" strokeWidth="0.5"/>
            </g>

            <path
              d="
                M -36 -7
                L -37 -17
                C -37 -21, -36 -23, -34 -24
                L -7 -25
                C 5 -25, 12 -22, 18 -17
                C 24 -17, 30 -15, 35 -13
                C 38 -12, 39 -9, 38 -6
                L 35 -4
                L 32 -4
                C 31 -14, 15 -14, 14 -4
                L -14 -4
                C -15 -14, -31 -14, -32 -4
                L -36 -7
                Z"
              fill="url(#carPaint)"
              stroke="#ff6b85"
              strokeWidth="0.6"
            />

            <path
              d="M 35 -4 L 32 -4 C 31 -13, 15 -13, 14 -4 L -14 -4 C -15 -13, -31 -13, -32 -4 L -36 -7 L -36 -4 L 35 -4 Z"
              fill="#11141a"
              stroke="#1e2430"
              strokeWidth="0.5"
            />

            <path d="M 38 -8 C 38 -7, 36 -6, 34 -6 L 34 -9 C 36 -9, 38 -9, 38 -8 Z" fill="#090d14"/>

            <path d="M 4 -24 L 16 -17.5 L 14 -17.5 L 3 -24 Z" fill="#090d14" opacity="0.9"/>
            <path d="M -5 -23.5 L 2.5 -23.5 L 13.5 -17.5 L 13.5 -13 L -5 -13 Z" fill="url(#carGlass)" stroke="#1e293b" strokeWidth="0.5"/>
            <path d="M -22 -23 L -7 -23 L -7 -13 L -22 -13 Z" fill="url(#carGlass)" stroke="#1e293b" strokeWidth="0.5"/>
            <path d="M -15 -23 L -19 -13 M 0 -23.5 L -4 -13" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" strokeLinecap="round"/>

            <path d="M 12 -16.5 C 15 -16.5 16 -15 14.5 -14 L 11 -14 Z" fill="#ff2247" stroke="#090d14" strokeWidth="0.5"/>
            <rect x="13.5" y="-15.5" width="1.5" height="1" rx="0.5" fill="#ffffff" opacity="0.8"/>

            <text x="-6" y="-15.5" fill="#ffffff" fontSize="4.2" fontWeight="900" fontFamily="Sora, sans-serif" letterSpacing="0.4">
              MOTO<tspan fill="#ff3157">DC</tspan>
            </text>
            <text x="-6" y="-11.5" fill="#cbd5e1" fontSize="2.2" fontWeight="700" fontFamily="Sora, sans-serif" letterSpacing="0.6">
              RAPID LOGISTICS
            </text>
            <path d="M -30 -9.5 L 8 -9.5" stroke="#ff3157" strokeWidth="0.8" opacity="0.8"/>
            <path d="M -30 -8 L 0 -8" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>

            <polygon points="34,-12 37,-10.5 36,-7.5 33,-8" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.5"/>
            <circle cx="35" cy="-9" r="1.3" fill="#ffffff"/>
            <circle cx="35" cy="-9" r="2.8" fill="rgba(56,189,248,0.4)" filter="url(#neonGlow)"/>

            <rect x="-37" y="-16.5" width="1.8" height="5" rx="0.8" fill="#ff2247" stroke="#ffffff" strokeWidth="0.3"/>
            <circle cx="-38" cy="-14" r="3.5" fill="rgba(255,34,71,0.6)" filter="url(#neonGlow)"/>

            <path d="M -26 -24 L -23 -26.5 L -20 -24 Z" fill="#14171d"/>
            <circle cx="-23" cy="-27.5" r="1.5" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx="-23" cy="-27.5" r="3.5" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.6">
              <animate attributeName="r" values="1.5;5" dur="1s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.8;0" dur="1s" repeatCount="indefinite"/>
            </circle>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function Orders(){
  const nav=useNavigate(),
    [orders,setOrders]=useState([]),
    [loading,setLoading]=useState(true),
    [open,setOpen]=useState(null),
    [filter,setFilter]=useState('all'),
    [activeOrderId,setActiveOrderId]=useState(null);

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
          setActiveOrderId(next[0].id);
        }
        setLoading(false);
      }
    },e=>{
      console.error(e);
      if(active){toast.error('Could not load your orders.');setLoading(false)}
    }));
    return()=>{active=false;unsubs.forEach(u=>u())};
  },[activeOrderId]);

  const removeLocal=id=>{
    setOrders(xs=>xs.filter(x=>x.id!==id));
    setOpen(v=>v===id?null:v);
    if(activeOrderId===id){
      const remaining=orders.filter(x=>x.id!==id);
      setActiveOrderId(remaining[0]?.id||null);
    }
  };

  const filteredOrders=filter==='all'?orders:orders.filter(o=>{
    const s=o.orderStatus||'placed';
    return filter==='placed'?['placed','confirmed','packed'].includes(s):s===filter;
  });

  return (
    <section className="page ordersPage">
      <TrackingHeroMap
        orders={orders}
        activeOrderId={activeOrderId}
        setActiveOrderId={setActiveOrderId}
      />

      <div className="orderFilters" role="tablist" aria-label="Order filters">
        {[
          ['all','All Orders'],
          ['placed','Processing'],
          ['shipped','Shipped'],
          ['out_for_delivery','Out for Delivery'],
          ['delivered','Delivered'],
          ['cancelled','Cancelled']
        ].map(([key,label])=>(
          <button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)} role="tab" aria-selected={filter===key}>
            {label}
          </button>
        ))}
      </div>

      {loading?<div className="empty">Loading your orders...</div>:!filteredOrders.length?<div className="ordersEmpty">
        <Package size={42}/>
        <h2>No orders found</h2>
        <p>Your orders matching this status will appear here.</p>
        <button className="heroBtn" onClick={()=>nav('/products')}>Start Shopping</button>
      </div>:<div className="customerOrders">
        {filteredOrders.map(o=>{
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
                  {o.items?.[0]?.image?<img src={o.items[0].image} alt=""/>:<Package size={30}/>}
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
                        <img src={x.image} alt=""/>
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
