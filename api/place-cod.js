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
      const requestedItems = items.map(item=>({
        id: String(item.id),
        qty: Math.max(1, Math.floor(Number(item.qty || 1)))
      }));
      const productRefs = requestedItems.map(item => db.collection('products').doc(item.id));
      const snapshots = productRefs.length ? await tx.getAll(...productRefs) : [];
      const productMap = new Map(snapshots.map(s => [s.id, s]));

      for (const item of requestedItems) {
        const snap = productMap.get(item.id);
        let p = snap?.exists ? snap.data() : null;
        const catP = getCatalogProduct(item.id);
        if (!p && catP) {
          p = catP;
        }
        if (!p) throw new Error('A product is no longer available');

        let stock = snap?.exists && typeof p.stock === 'number' ? p.stock : (Number(catP?.stock) || 50);
        if (item.qty > stock) {
          if (catP && Number(catP.stock) >= item.qty) {
            stock = Number(catP.stock);
          } else {
            throw new Error(`Insufficient stock for ${p.name || item.id}`);
          }
        }

        const price = Number(p.price || catP?.price || 0);
        subtotal += price * item.qty;
        safeItems.push({
          id: String(item.id),
          name: p.name || catP?.name || 'Automotive Part',
          category: p.category || catP?.category || '',
          price,
          qty: item.qty,
          image: p.image || catP?.image || ''
        });
      }

      for (const item of requestedItems) {
        const snap = productMap.get(item.id);
        const catP = getCatalogProduct(item.id);
        const p = (snap?.exists ? snap.data() : null) || catP;
        const ref = db.collection('products').doc(item.id);
        const currentStock = snap?.exists && typeof p?.stock === 'number' ? p.stock : (Number(catP?.stock) || 50);
        const remainingStock = Math.max(0, currentStock - item.qty);

        if (snap?.exists) {
          tx.set(ref, {
            stock: remainingStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else if (p) {
          tx.set(ref, {
            name: p.name || catP?.name || '',
            category: p.category || catP?.category || '',
            brand: p.brand || catP?.brand || '',
            price: Number(p.price || catP?.price || 0),
            stock: remainingStock,
            rating: Number(p.rating || catP?.rating || 4.5),
            image: p.image || catP?.image || '',
            description: p.description || catP?.description || ''
          }, { merge: true });
        }
      }

      apexDiscount = isApex ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
      const taxableSubtotal = Math.max(0, subtotal - apexDiscount);
      tax = Math.round(taxableSubtotal * 0.18 * 100) / 100;
      deliveryFee = isApex || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
      grandTotal = Math.round((taxableSubtotal + tax + deliveryFee) * 100) / 100;

      const cleanShipping = {
        address: String(shipping?.address || ''),
        city: String(shipping?.city || ''),
        state: String(shipping?.state || ''),
        pincode: String(shipping?.pincode || ''),
        lat: typeof shipping?.lat === 'number' ? shipping.lat : null,
        lng: typeof shipping?.lng === 'number' ? shipping.lng : null
      };

      const cleanCustomer = {
        name: String(customer?.name || ''),
        email: String(customer?.email || ''),
        phone: String(customer?.phone || '')
      };

      tx.set(categoryRef, {
        name: 'cod orders',
        paymentMethod: 'cod',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      tx.set(paymentCategoryRef, {
        name: 'cod payment intents',
        paymentMethod: 'cod',
        note: 'COD does not use a Razorpay payment intent.',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      tx.set(orderRef, {
        orderId,
        userId: decoded.uid,
        customer: cleanCustomer,
        shipping: cleanShipping,
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
      customer: {
        name: String(customer?.name || ''),
        email: String(customer?.email || ''),
        phone: String(customer?.phone || '')
      },
      shipping: {
        address: String(shipping?.address || ''),
        city: String(shipping?.city || ''),
        state: String(shipping?.state || ''),
        pincode: String(shipping?.pincode || ''),
        lat: typeof shipping?.lat === 'number' ? shipping.lat : null,
        lng: typeof shipping?.lng === 'number' ? shipping.lng : null
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
    const message=String(e?.message||e?.details||e?.error||(typeof e==='string'?e:'')||'');
    if(message.includes('NOT_FOUND'))return send(res,500,{error:'Firebase Firestore database was not found. The payment server is targeting asia-south1.'});
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('verifyIdToken')||message.includes('auth/id-token-expired')||message.includes('expired'))return send(res,401,{error:'Firebase authentication expired or invalid. Please sign in again.'});
    if(message.startsWith('Insufficient stock')||message.includes('no longer available'))return send(res,409,{error:message});
    return send(res,500,{error:message||'Could not place Cash on Delivery order'});
  }
}
