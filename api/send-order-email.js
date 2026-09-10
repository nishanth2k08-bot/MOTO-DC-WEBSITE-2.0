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
  }catch{
    try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'))}
    catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')}
  }
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}

function send(res,status,body){res.status(status).json(body)}
function isOnline(order){return String(order.paymentMethod||'').toLowerCase()==='online'}

const templateFor=(event,order,request)=>{
  if(event==='cancelled')return isOnline(order)
    ?process.env.MSG91_TEMPLATE_ONLINE_CANCEL
    :process.env.MSG91_TEMPLATE_COD_CANCEL;
  if(event==='return-completed'){
    if(request?.type==='replacement')return process.env.MSG91_TEMPLATE_REPLACEMENT;
    return isOnline(order)
      ?process.env.MSG91_TEMPLATE_ONLINE_RETURN
      :process.env.MSG91_TEMPLATE_COD_RETURN;
  }
  return '';
};

function requiredConfig(){
  const missing=[];
  for(const key of [
    'MSG91_AUTHKEY',
    'MSG91_EMAIL_DOMAIN',
    'MSG91_FROM_EMAIL',
    'MSG91_TEMPLATE_ONLINE_CANCEL',
    'MSG91_TEMPLATE_COD_CANCEL',
    'MSG91_TEMPLATE_ONLINE_RETURN',
    'MSG91_TEMPLATE_COD_RETURN',
    'MSG91_TEMPLATE_REPLACEMENT'
  ])if(!process.env[key])missing.push(key);
  return missing;
}

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const authHeader=req.headers.authorization||'';
    const idToken=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});

    const a=getAdmin();
    const decoded=await a.auth().verifyIdToken(idToken);
    const db=getFirestore(a.app(),'asia-south1');
    const adminSnap=await db.collection('admins').doc(decoded.uid).get();
    if(!adminSnap.exists)return send(res,403,{error:'Admin access required'});

    const {event,orderDocId,returnId}=req.body||{};
    if(!event)return send(res,400,{error:'Email event is required'});

    let orderRef,order,requestRef=null,request=null;
    if(event==='cancelled'){
      if(!orderDocId)return send(res,400,{error:'Order reference is required'});
      orderRef=db.collection('orders').doc(String(orderDocId));
      const snap=await orderRef.get();
      if(!snap.exists)return send(res,404,{error:'Order not found'});
      order={id:snap.id,...snap.data()};
      if(order.orderStatus!=='cancelled')return send(res,409,{error:'Order is not cancelled'});
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
      if(request.emailNotifications?.completedSentAt)return send(res,200,{ok:true,alreadySent:true});
    }else return send(res,400,{error:'Unsupported email event'});

    const missing=requiredConfig();
    if(missing.length)return send(res,503,{error:`MSG91 email service is not configured. Missing: ${missing.join(', ')}`});

    const email=String(order.customer?.email||'').trim();
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send(res,400,{error:'Customer email is missing or invalid'});

    const templateId=templateFor(event,order,request);
    if(!templateId)return send(res,503,{error:'No MSG91 template is configured for this email event'});

    const customerName=String(order.customer?.name||'Customer').trim();
    const orderId=String(order.orderId||order.id);
    const amount=Number(request?.total??order.total??0).toLocaleString('en-IN');
    const payload={
      recipients:[{
        to:[{name:customerName,email}],
        variables:{
          customer_name:customerName,
          order_id:orderId,
          amount:`₹${amount}`
        }
      }],
      from:{
        name:process.env.MSG91_FROM_NAME||'MOTO DC',
        email:process.env.MSG91_FROM_EMAIL
      },
      domain:process.env.MSG91_EMAIL_DOMAIN,
      template_id:templateId,
      validate_before_send:true
    };

    const response=await fetch('https://control.msg91.com/api/v5/email/send',{
      method:'POST',
      headers:{
        accept:'application/json',
        authkey:process.env.MSG91_AUTHKEY,
        'content-type':'application/json'
      },
      body:JSON.stringify(payload)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const detail=data?.message||data?.error||data?.errors;
      throw new Error(`MSG91 rejected the email${detail?`: ${typeof detail==='string'?detail:JSON.stringify(detail)}`:''}`);
    }

    const sentAt=admin.firestore.FieldValue.serverTimestamp();
    if(requestRef){
      await requestRef.update({
        'emailNotifications.completedSentAt':sentAt,
        'emailNotifications.provider':'msg91'
      });
    }else{
      await orderRef.update({
        'emailNotifications.cancellationSentAt':sentAt,
        'emailNotifications.provider':'msg91'
      });
    }

    return send(res,200,{ok:true,provider:'msg91'});
  }catch(e){
    console.error('send-order-email error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.startsWith('MSG91 rejected the email'))return send(res,502,{error:message});
    return send(res,500,{error:'Could not send the customer email'});
  }
}
