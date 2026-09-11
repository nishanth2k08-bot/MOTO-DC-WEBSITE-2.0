import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendCustomerTemplateEmail } from './_send-email.js';
function send(res,status,body){res.status(status).json(body)}
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
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const {items,customer,shipping}=req.body||{};
    const auth=req.headers.authorization||'',idToken=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    if(!Array.isArray(items)||!items.length)return send(res,400,{error:'Cart is empty'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const categoryRef=db.collection('orders').doc('cod orders');
    const paymentCategoryRef=db.collection('paymentIntents').doc('cod payment intents');
    const orderRef=categoryRef.collection('records').doc();
    const orderId=`MDC-${Date.now().toString().slice(-8)}`;
    let total=0;
    const safeItems=[];
    await db.runTransaction(async tx=>{
      for(const item of items){
        const productRef=db.collection('products').doc(String(item.id));
        const snap=await tx.get(productRef);
        if(!snap.exists)throw new Error('A product is no longer available');
        const p=snap.data(),qty=Math.max(1,Math.floor(Number(item.qty||1))),stock=Number(p.stock||0);
        if(qty>stock)throw new Error(`Insufficient stock for ${p.name}`);
        const price=Number(p.price||0);total+=price*qty;
        safeItems.push({id:snap.id,name:p.name,category:p.category||'',price,qty,image:p.image||''});
        tx.update(productRef,{stock:stock-qty});
      }
      tx.set(categoryRef,{name:'cod orders',paymentMethod:'cod',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      tx.set(paymentCategoryRef,{name:'cod payment intents',paymentMethod:'cod',note:'COD does not use a Razorpay payment intent.',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      tx.set(orderRef,{orderId,userId:decoded.uid,customer:customer||{},shipping:shipping||{},items:safeItems,subtotal:total,total,delivery:'FREE',paymentMethod:'cod',paymentStatus:'pending',orderStatus:'placed',statusHistory:[{status:'placed',updatedAt:new Date().toISOString()}],createdAt:admin.firestore.FieldValue.serverTimestamp()});
    });
    const order={id:orderRef.id,orderId,userId:decoded.uid,customer:customer||{},shipping:shipping||{},items:safeItems,subtotal:total,total,delivery:'FREE',paymentMethod:'cod',paymentStatus:'pending',orderStatus:'placed'};
    const templateId=process.env.MSG91_TEMPLATE_COD_ORDER;
    if(templateId){try{await sendCustomerTemplateEmail({order,templateId});}catch(emailError){console.error('COD order email error:',emailError);}}
    else console.error('COD order email skipped: MSG91_TEMPLATE_COD_ORDER is not configured');
    return send(res,200,{ok:true,orderId,total,docId:orderRef.id});
  }catch(e){
    console.error('place-cod error:',e);
    const message=String(e?.message||'');
    if(message.includes('NOT_FOUND'))return send(res,500,{error:'Firebase Firestore database was not found. The payment server is targeting asia-south1.'});
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('verifyIdToken'))return send(res,401,{error:'Firebase authentication could not be verified'});
    if(message.startsWith('Insufficient stock')||message.includes('no longer available'))return send(res,409,{error:message});
    return send(res,500,{error:'Could not place Cash on Delivery order'});
  }
}
