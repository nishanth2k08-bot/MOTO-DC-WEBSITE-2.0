import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
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
    const {items,amount}=req.body||{};
    const auth=req.headers.authorization||'';
    const idToken=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    if(!Array.isArray(items)||!items.length)return send(res,400,{error:'Cart is empty'});
    if(!Number.isFinite(Number(amount))||Number(amount)<=0)return send(res,400,{error:'Invalid amount'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const refs=items.map(x=>db.collection('products').doc(String(x.id)));
    const snaps=await db.getAll(...refs);
    let total=0;const safeItems=[];
    for(let i=0;i<snaps.length;i++){
      const snap=snaps[i],requested=Math.max(1,Math.floor(Number(items[i].qty||1)));
      if(!snap.exists)return send(res,400,{error:'A product is no longer available'});
      const p=snap.data(),stock=Number(p.stock||0);
      if(requested>stock)return send(res,400,{error:`Insufficient stock for ${p.name}`});
      const price=Number(p.price||0);total+=price*requested;
      safeItems.push({id:snap.id,name:p.name,category:p.category||'',price,qty:requested,image:p.image||''});
    }
    if(Math.round(total*100)!==Math.round(Number(amount)*100))return send(res,400,{error:'Cart total changed. Please refresh and try again.'});
    const keyId=process.env.RAZORPAY_KEY_ID,keySecret=process.env.RAZORPAY_KEY_SECRET;
    if(!keyId||!keySecret)return send(res,503,{error:'Razorpay server credentials are missing'});
    const receipt=`MDC-${Date.now()}-${decoded.uid.slice(0,8)}`;
    const response=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,'Content-Type':'application/json'},body:JSON.stringify({amount:Math.round(total*100),currency:'INR',receipt,notes:{userId:decoded.uid}})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return send(res,502,{error:data.error?.description||'Razorpay rejected the server credentials or request'});
    const categoryRef=db.collection('paymentIntents').doc('online payment intents');
    await categoryRef.set({name:'online payment intents',paymentMethod:'online',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    await categoryRef.collection('records').doc(data.id).set({userId:decoded.uid,amount:total,currency:'INR',items:safeItems,status:'created',createdAt:admin.firestore.FieldValue.serverTimestamp()});
    return send(res,200,{keyId,orderId:data.id,amount:data.amount,currency:data.currency});
  }catch(e){
    console.error('create-payment error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON'))return send(res,500,{error:message});
    if(message.includes('credential')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('verifyIdToken'))return send(res,401,{error:'Firebase authentication could not be verified'});
    if(message.includes('NOT_FOUND'))return send(res,500,{error:'Firebase Firestore database was not found. The payment server is now targeting the same asia-south1 database used by the website.'});
    return send(res,500,{error:'Payment server could not create the order'});
  }
}
