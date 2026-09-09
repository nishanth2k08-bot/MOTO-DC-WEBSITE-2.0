import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';

function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{
    serviceAccount=JSON.parse(raw);
    if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount);
  }catch(e){
    try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'))}
    catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')}
  }
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}

function send(res,status,body){res.status(status).json(body)}
function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
function money(value){return '₹'+Number(value||0).toLocaleString('en-IN')}
function isOnline(order){return String(order.paymentMethod||'').toLowerCase()==='online'}

function buildEmail(event,order,request){
  const customer=esc(order.customer?.name||'Customer');
  const orderId=esc(order.orderId||order.id);
  const total=money(request?.total??order.total);
  const online=isOnline(order);
  const type=request?.type;

  if(event==='cancelled'){
    const subject=`MotoDC order ${orderId} cancelled`;
    const paymentMessage=online
      ? `Your online payment of <strong>${esc(total)}</strong> will be refunded to the original payment method within <strong>5 business working days</strong>.`
      : `This order was placed with Cash on Delivery. If you have already paid any amount for this order, please reply with your <strong>UPI ID or bank account details</strong> so we can arrange the refund. For your security, never send your card PIN, CVV, OTP, or full card number by email.`;
    return {subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto"><h2 style="margin-bottom:8px">Order cancelled</h2><p>Hi ${customer},</p><p>Your MotoDC order <strong>${orderId}</strong> has been cancelled.</p><p>${paymentMessage}</p><p>If you need help, please reply to this email with your order ID.</p><p style="margin-top:28px">Regards,<br><strong>MotoDC</strong></p></div>`}
  }

  if(event==='return-completed'){
    if(type==='replacement')return {subject:`MotoDC replacement completed for ${orderId}`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto"><h2>Replacement completed</h2><p>Hi ${customer},</p><p>Your replacement request for order <strong>${orderId}</strong> has been completed.</p><p>Your replacement item has been processed by MotoDC. Thank you for your patience.</p><p style="margin-top:28px">Regards,<br><strong>MotoDC</strong></p></div>`};
    const paymentMessage=online
      ? `Your refund amount of <strong>${esc(total)}</strong> will be refunded to the original online payment method within <strong>5 business working days</strong>.`
      : `As this was a Cash on Delivery payment, the delivery person will return <strong>${esc(total)}</strong> to you when the returned product is picked up.`;
    return {subject:`MotoDC return accepted for ${orderId}`,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:620px;margin:auto"><h2>Return confirmed</h2><p>Hi ${customer},</p><p>Your return request for order <strong>${orderId}</strong> has been completed.</p><p>${paymentMessage}</p><p style="margin-top:28px">Regards,<br><strong>MotoDC</strong></p></div>`}
  }
  throw new Error('Unsupported email event');
}

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const authHeader=req.headers.authorization||'',idToken=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const adminSnap=await db.collection('admins').doc(decoded.uid).get();
    if(!adminSnap.exists)return send(res,403,{error:'Admin access required'});
    const {event,orderDocId,returnId}=req.body||{};
    if(!event)return send(res,400,{error:'Email event is required'});

    let orderRef,order,requestRef=null,request=null,notificationPath='';
    if(event==='cancelled'){
      if(!orderDocId)return send(res,400,{error:'Order reference is required'});
      orderRef=db.collection('orders').doc(String(orderDocId));
      const snap=await orderRef.get();
      if(!snap.exists)return send(res,404,{error:'Order not found'});
      order={id:snap.id,...snap.data()};
      if(order.orderStatus!=='cancelled')return send(res,409,{error:'Order is not cancelled'});
      notificationPath='emailNotifications.cancellationSentAt';
      if(order.emailNotifications?.cancellationSentAt)return send(res,200,{ok:true,alreadySent:true});
    }else if(event==='return-completed'){
      if(!returnId)return send(res,400,{error:'Return request reference is required'});
      requestRef=db.collection('returns').doc(String(returnId));
      const requestSnap=await requestRef.get();
      if(!requestSnap.exists)return send(res,404,{error:'Return request not found'});
      request={id:requestSnap.id,...requestSnap.data()};
      if(request.status!=='completed')return send(res,409,{error:'Return request is not completed'});
      if(!request.orderId)return send(res,400,{error:'Return request has no order reference'});
      orderRef=db.collection('orders').doc(String(request.orderId));
      const orderSnap=await orderRef.get();
      if(!orderSnap.exists)return send(res,404,{error:'Original order not found'});
      order={id:orderSnap.id,...orderSnap.data()};
      if(request.userId!==order.userId)return send(res,403,{error:'Return request does not belong to this order'});
      notificationPath='emailNotifications.completedSentAt';
      if(request.emailNotifications?.completedSentAt)return send(res,200,{ok:true,alreadySent:true});
    }else return send(res,400,{error:'Unsupported email event'});

    const email=order.customer?.email;
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)))return send(res,400,{error:'Customer email is missing or invalid'});
    const apiKey=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
    if(!apiKey||!from)return send(res,503,{error:'Email service is not configured. Add RESEND_API_KEY and EMAIL_FROM in Vercel.'});

    const built=buildEmail(event,order,request);
    const idempotencyKey=`motodc/${event}/${event==='cancelled'?order.id:request.id}`;
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`,'Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[String(email)],subject:built.subject,html:built.html})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.message||data?.error||'Email provider rejected the message');

    if(requestRef)await requestRef.update({[notificationPath]:admin.firestore.FieldValue.serverTimestamp(),emailId:data.id||null});
    else await orderRef.update({[notificationPath]:admin.firestore.FieldValue.serverTimestamp(),emailId:data.id||null});
    return send(res,200,{ok:true,emailId:data.id||null});
  }catch(e){
    console.error('send-order-email error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('RESEND'))return send(res,502,{error:message});
    return send(res,500,{error:'Could not send the customer email'});
  }
}
