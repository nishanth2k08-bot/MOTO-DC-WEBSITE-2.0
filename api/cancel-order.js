import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';
function send(res,status,body){res.status(status).json(body)}
function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{serviceAccount=JSON.parse(raw);if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount)}catch{try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'))}catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')}}
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}
function isOnline(order){return String(order?.paymentMethod||'').toLowerCase()==='online'}
function cancellationTemplate(order){return isOnline(order)?(process.env.MSG91_TEMPLATE_ONLINE_CANCEL||process.env.MSG91_TEMPLATE_ORDER_STATUS):(process.env.MSG91_TEMPLATE_COD_CANCEL||process.env.MSG91_TEMPLATE_ORDER_STATUS)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim())}
async function sendCancellationEmail(order){
  const email=String(order?.customer?.email||'').trim();
  const templateId=cancellationTemplate(order);
  const missing=['MSG91_AUTHKEY','MSG91_EMAIL_DOMAIN','MSG91_FROM_EMAIL'].filter(key=>!process.env[key]);
  if(!templateId)missing.push(isOnline(order)?'MSG91_TEMPLATE_ONLINE_CANCEL':'MSG91_TEMPLATE_COD_CANCEL');
  if(missing.length)throw new Error(`MSG91 email service is not configured. Missing: ${missing.join(', ')}`);
  if(!validEmail(email))throw new Error('Customer email is missing or invalid');
  const customerName=String(order.customer?.name||'Customer').trim();
  const orderId=String(order.orderId||order.id);
  const amount=Number(order.total||0).toLocaleString('en-IN');
  const payment=isOnline(order)?'Online Payment':'Cash on Delivery';
  const payload={recipients:[{to:[{name:customerName,email}],variables:{customer_name:customerName,order_id:orderId,amount:`₹${amount}`,order_amount:amount,payment_method:payment,order_status:'cancelled',status:'cancelled'}}],from:{name:process.env.MSG91_FROM_NAME||'MOTO DC',email:process.env.MSG91_FROM_EMAIL},domain:process.env.MSG91_EMAIL_DOMAIN,template_id:templateId,validate_before_send:true};
  const response=await fetch('https://control.msg91.com/api/v5/email/send',{method:'POST',headers:{accept:'application/json',authkey:process.env.MSG91_AUTHKEY,'content-type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const detail=data?.message||data?.error||data?.errors;throw new Error(`MSG91 rejected the email${detail?`: ${typeof detail==='string'?detail:JSON.stringify(detail)}`:''}`)}
  return {templateId,email};
}
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const auth=req.headers.authorization||'',idToken=auth.startsWith('Bearer ')?auth.slice(7):'';
    const {orderId,docId,paymentMethod}=req.body||{};
    if(!idToken)return send(res,401,{error:'Authentication required'});
    if(!docId||!paymentMethod)return send(res,400,{error:'Order information is incomplete'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const category=paymentMethod==='cod'?'cod orders':'online orders';
    const ref=db.collection('orders').doc(category).collection('records').doc(String(docId));
    const snap=await ref.get();
    if(!snap.exists)return send(res,404,{error:'Order not found'});
    const order={id:snap.id,...snap.data()};
    if(order.userId!==decoded.uid)return send(res,403,{error:'You can only cancel your own order'});
    if(!['placed','confirmed','packed'].includes(order.orderStatus||'placed'))return send(res,409,{error:'This order can no longer be cancelled'});
    let emailSent=false,emailError='';
    try{await sendCancellationEmail(order);emailSent=true}catch(e){emailError=String(e?.message||'Customer email could not be sent');console.error('Cancellation email error:',e)}
    await ref.delete();
    return send(res,200,{ok:true,deleted:true,orderId:order.orderId||orderId,docId:String(docId),emailSent,emailError:emailSent?'':emailError});
  }catch(e){
    console.error('cancel-order error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('verifyIdToken'))return send(res,401,{error:'Firebase authentication could not be verified'});
    return send(res,500,{error:'Could not cancel the order'});
  }
}
