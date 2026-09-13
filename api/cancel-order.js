import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
function send(res,status,body){res.status(status).json(body)}
function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{serviceAccount=JSON.parse(raw);if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount);}catch{try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));}catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')}}
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
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
    const order=snap.data();
    if(order.userId!==decoded.uid)return send(res,403,{error:'You can only cancel your own order'});
    if(!['placed','confirmed','packed'].includes(order.orderStatus||'placed'))return send(res,409,{error:'This order can no longer be cancelled'});
    await ref.update({orderStatus:'cancelled',statusHistory:admin.firestore.FieldValue.arrayUnion({status:'cancelled',updatedAt:new Date().toISOString()})});
    return send(res,200,{ok:true,orderId:order.orderId||orderId,docId:String(docId)});
  }catch(e){
    console.error('cancel-order error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('verifyIdToken'))return send(res,401,{error:'Firebase authentication could not be verified'});
    return send(res,500,{error:'Could not cancel the order'});
  }
}
