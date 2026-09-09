import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{serviceAccount=JSON.parse(raw);if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount);}catch(e){try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));}catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');}}
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}
function send(res,status,body){res.status(status).json(body)}
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature,customer,shipping}=req.body||{};
    const auth=req.headers.authorization||'',idToken=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature)return send(res,400,{error:'Incomplete payment response'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),secret=process.env.RAZORPAY_KEY_SECRET;
    if(!secret)return send(res,503,{error:'Payment verification is not configured'});
    const signature=String(razorpay_signature),expected=crypto.createHmac('sha256',secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature)))return send(res,400,{error:'Payment verification failed'});
    const db=getFirestore(a.app(),'asia-south1'),intentRef=db.collection('paymentIntents').doc(razorpay_order_id),intentSnap=await intentRef.get();
    if(!intentSnap.exists)return send(res,400,{error:'Payment session expired or invalid'});
    const intent=intentSnap.data();
    if(intent.userId!==decoded.uid||intent.status!=='created')return send(res,400,{error:'Invalid payment session'});
    const keyId=process.env.RAZORPAY_KEY_ID;
    const paymentResponse=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,{headers:{Authorization:`Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`}});
    const payment=await paymentResponse.json().catch(()=>({}));
    if(!paymentResponse.ok||payment.order_id!==razorpay_order_id||Number(payment.amount)!==Math.round(Number(intent.amount)*100)||payment.currency!=='INR'||payment.status!=='captured')return send(res,400,{error:'Payment could not be verified'});
    const orderId=`MDC-${Date.now().toString().slice(-8)}`;
    const orderRef=db.collection('orders').doc();
    let total=0;
    const finalItems=[];
    await db.runTransaction(async tx=>{
      for(const item of intent.items||[]){
        const productRef=db.collection('products').doc(String(item.id));
        const snap=await tx.get(productRef);
        if(!snap.exists)throw new Error('A product is no longer available');
        const p=snap.data(),qty=Math.max(1,Math.floor(Number(item.qty||1))),stock=Number(p.stock||0);
        if(qty>stock)throw new Error(`Insufficient stock for ${p.name}`);
        const price=Number(p.price||0);total+=price*qty;
        finalItems.push({id:snap.id,name:p.name,category:p.category||'',price,qty,image:p.image||''});
        tx.update(productRef,{stock:stock-qty});
      }
      if(Math.round(total*100)!==Math.round(Number(intent.amount)*100))throw new Error('Product prices changed. Payment requires review.');
      tx.set(orderRef,{orderId,userId:decoded.uid,customer:customer||{},shipping:shipping||{},items:finalItems,subtotal:total,total,delivery:'FREE',paymentMethod:'online',paymentStatus:'paid',razorpayOrderId:razorpay_order_id,razorpayPaymentId:razorpay_payment_id,orderStatus:'placed',createdAt:admin.firestore.FieldValue.serverTimestamp()});
      tx.update(intentRef,{status:'completed',paymentId:razorpay_payment_id,completedAt:admin.firestore.FieldValue.serverTimestamp(),orderDocId:orderRef.id});
    });
    return send(res,200,{ok:true,orderId,docId:orderRef.id,total});
  }catch(e){
    console.error('verify-payment error:',e);
    const message=String(e?.message||'');
    if(message.includes('NOT_FOUND'))return send(res,500,{error:'Firebase Firestore database was not found. The payment server is targeting asia-south1.'});
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.startsWith('Insufficient stock')||message.includes('no longer available'))return send(res,409,{error:message});
    return send(res,500,{error:'Could not verify payment'});
  }
}
