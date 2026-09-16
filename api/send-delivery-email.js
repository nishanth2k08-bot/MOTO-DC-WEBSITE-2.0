import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';

function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{serviceAccount=JSON.parse(raw);if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount)}catch{try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'))}catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')}}
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}

function send(res,status,body){res.status(status).json(body)}
const isOnline=o=>String(o?.paymentMethod||'').toLowerCase()==='online';
const orderRef=(db,paymentMethod,id)=>db.collection('orders').doc(isOnline({paymentMethod})?'online orders':'cod orders').collection('records').doc(String(id));

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const authHeader=req.headers.authorization||'',idToken=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const adminSnap=await db.collection('admins').doc(decoded.uid).get();
    if(!adminSnap.exists)return send(res,403,{error:'Admin access required'});

    const {orderDocId,paymentMethod,status}=req.body||{};
    if(!orderDocId)return send(res,400,{error:'Order reference is required'});
    if(String(status||'').toLowerCase()!=='delivered')return send(res,400,{error:'Delivery email is only available for delivered orders'});

    const ref=orderRef(db,paymentMethod,orderDocId),snap=await ref.get();
    if(!snap.exists)return send(res,404,{error:'Order not found'});
    const order={id:snap.id,...snap.data()};
    if(String(order.orderStatus||'').toLowerCase()!=='delivered')return send(res,409,{error:'Order is not delivered'});
    if(order.emailNotifications?.deliverySentAt)return send(res,200,{ok:true,alreadySent:true});

    const email=String(order.customer?.email||'').trim();
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send(res,400,{error:'Customer email is missing or invalid'});
    const authkey=process.env.MSG91_AUTHKEY,domain=process.env.MSG91_EMAIL_DOMAIN,fromEmail=process.env.MSG91_FROM_EMAIL;
    if(!authkey||!domain||!fromEmail)return send(res,503,{error:'MSG91 email service is not configured. Check MSG91_AUTHKEY, MSG91_EMAIL_DOMAIN and MSG91_FROM_EMAIL'});

    const templateId=isOnline(order)?'motodc_online_order_delivery':'motodc_cod_order_delivery';
    const customerName=String(order.customer?.name||'Customer').trim();
    const orderId=String(order.orderId||order.id);
    const amount=Number(order.total||0).toLocaleString('en-IN');
    const deliveryDate=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date());
    const payload={recipients:[{to:[{name:customerName,email}],variables:{customer_name:customerName,order_id:orderId,amount:`₹${amount}`,order_amount:amount,payment_method:isOnline(order)?'Online Payment':'Cash on Delivery',delivery_date:deliveryDate,order_status:'delivered',status:'delivered'}}],from:{name:process.env.MSG91_FROM_NAME||'MOTO DC',email:fromEmail},domain,template_id:templateId,validate_before_send:true};

    const response=await fetch('https://control.msg91.com/api/v5/email/send',{method:'POST',headers:{accept:'application/json',authkey,'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const detail=data?.message||data?.error||data?.errors;throw new Error(`MSG91 rejected the delivery email${detail?`: ${typeof detail==='string'?detail:JSON.stringify(detail)}`:''}`)}

    await ref.update({'emailNotifications.deliverySentAt':admin.firestore.FieldValue.serverTimestamp(),'emailNotifications.deliveryTemplate':templateId,'emailNotifications.provider':'msg91'});
    return send(res,200,{ok:true,provider:'msg91',templateId});
  }catch(e){
    console.error('send-delivery-email error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.startsWith('MSG91 rejected the delivery email'))return send(res,502,{error:message});
    return send(res,500,{error:'Could not send the delivery email'});
  }
}
