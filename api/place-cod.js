import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { waitUntil } from '@vercel/functions';
import { sendCustomerTemplateEmail } from './_send-email.js';
import { indexOrderInAlgolia } from './_algolia.js';
import { getCatalogProduct } from './_catalog.js';
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
    function computePin(id){let hash=0;const s=String(id||'7482');for(let i=0;i<s.length;i++)hash=(hash*31+s.charCodeAt(i))>>>0;return String(1000+(hash%9000));}
    const deliveryPin=computePin(orderId);
    const isApex = Boolean(req.body?.isApexMember);
    const FREE_DELIVERY_THRESHOLD = 799;
    const STANDARD_DELIVERY_FEE = 99;
    let subtotal = 0;
    let apexDiscount = 0;
    let tax = 0;
    let deliveryFee = 0;
    let grandTotal = 0;
    const safeItems = [];
    await db.runTransaction(async tx=>{
      safeItems.length = 0;
      subtotal = 0;
      const productRefs=items.map(item=>db.collection('products').doc(String(item.id)));
      const snapshots=await Promise.all(productRefs.map(ref=>tx.get(ref)));
      snapshots.forEach((snap,index)=>{
        const item=items[index];
        let p=snap.exists?snap.data():null;
        if(!p){
          const catP=getCatalogProduct(item.id);
          if(catP) p=catP;
        }
        if(!p)throw new Error('A product is no longer available');
        const qty=Math.max(1,Math.floor(Number(item.qty||1))),stock=Number(p.stock||0);
        if(qty>stock)throw new Error(`Insufficient stock for ${p.name}`);
        const price=Number(p.price||0);subtotal+=price*qty;
        safeItems.push({id:String(item.id),name:p.name,category:p.category||'',price,qty,image:p.image||''});
      });
      tx.set(categoryRef,{name:'cod orders',paymentMethod:'cod',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      tx.set(paymentCategoryRef,{name:'cod payment intents',paymentMethod:'cod',note:'COD does not use a Razorpay payment intent.',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      snapshots.forEach((snap,index)=>{
        const item=items[index];
        let p=snap.exists?snap.data():getCatalogProduct(item.id);
        const qty=Math.max(1,Math.floor(Number(item.qty||1))),stock=Number(p.stock||0);
        if(snap.exists){
          tx.update(productRefs[index],{stock:stock-qty});
        }else if(p){
          tx.set(productRefs[index],{
            name:p.name,category:p.category||'',brand:p.brand||'',price:p.price,
            stock:Math.max(0,stock-qty),rating:p.rating||4.5,image:p.image||'',description:p.description||''
          });
        }
      });
      apexDiscount = isApex ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
      const taxableSubtotal = Math.max(0, subtotal - apexDiscount);
      tax = Math.round(taxableSubtotal * 0.18 * 100) / 100;
      deliveryFee = isApex || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
      grandTotal = Math.round((taxableSubtotal + tax + deliveryFee) * 100) / 100;
      tx.set(orderRef, {
        orderId,
        userId: decoded.uid,
        customer: customer || {},
        shipping: {
          address: shipping?.address || '',
          city: shipping?.city || '',
          state: shipping?.state || '',
          pincode: shipping?.pincode || '',
          lat: shipping?.lat || null,
          lng: shipping?.lng || null
        },
        items: safeItems,
        subtotal,
        isApexMember: isApex,
        apexDiscount,
        tax,
        delivery: deliveryFee === 0 ? 'FREE' : deliveryFee,
        total: grandTotal,
        deliveryPin,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        statusHistory: [{ status: 'placed', updatedAt: new Date().toISOString() }],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    const order = {
      id: orderRef.id,
      orderId,
      userId: decoded.uid,
      customer: customer || {},
      shipping: {
        address: shipping?.address || '',
        city: shipping?.city || '',
        state: shipping?.state || '',
        pincode: shipping?.pincode || '',
        lat: shipping?.lat || null,
        lng: shipping?.lng || null
      },
      items: safeItems,
      subtotal,
      isApexMember: isApex,
      apexDiscount,
      tax,
      delivery: deliveryFee === 0 ? 'FREE' : deliveryFee,
      total: grandTotal,
      deliveryPin,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'placed'
    };
    waitUntil(indexOrderInAlgolia(order));
    const templateId=process.env.MSG91_TEMPLATE_COD_ORDER;
    if(templateId)waitUntil((async()=>{try{await sendCustomerTemplateEmail({order,templateId});}catch(emailError){console.error('COD order email error:',emailError);}})());
    else console.error('COD order email skipped: MSG91_TEMPLATE_COD_ORDER is not configured');
    return send(res,200,{ok:true,orderId,subtotal,tax,delivery:deliveryFee,total:grandTotal,docId:orderRef.id});
  }catch(e){
    console.error('place-cod error:',e);
    const message=String(e?.message||'');
    if(message.includes('NOT_FOUND'))return send(res,500,{error:'Firebase Firestore database was not found. The payment server is targeting asia-south1.'});
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('verifyIdToken'))return send(res,401,{error:'Firebase authentication could not be verified'});
    if(message.startsWith('Insufficient stock')||message.includes('no longer available'))return send(res,409,{error:message});
    return send(res,500,{error:e?.message||'Could not place Cash on Delivery order'});
  }
}
