import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';

function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{serviceAccount=JSON.parse(raw);if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount)}
  catch{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'))}
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}
const send=(res,status,body)=>res.status(status).json(body);
const groups=[
 ['cod request','cod return'],['cod request','cod replacement'],
 ['online request','online return'],['online request','online replacement']
];
const clean=v=>{try{return JSON.parse(JSON.stringify(v??{}))}catch{return{}}};

export default async function handler(req,res){
  try{
    const header=req.headers.authorization||'',token=header.startsWith('Bearer ')?header.slice(7):'';
    if(!token)return send(res,401,{error:'Authentication required'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(token),db=getFirestore(a.app(),'asia-south1');

    if(req.method==='GET'){
      const results=[];
      for(const [group,type] of groups){
        try{
          const snap=await db.collection('request').doc(group).collection(type).where('userId','==',decoded.uid).get();
          snap.forEach(d=>results.push({id:d.id,requestGroup:group,requestCollection:type,...d.data()}));
        }catch(e){console.error('customer return history:',e)}
      }
      results.sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
      return send(res,200,{requests:results});
    }

    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const orderId=String(body.orderId||'').trim(),type=body.type==='replacement'?'replacement':'return';
      if(!orderId)return send(res,400,{error:'Order ID is required'});
      const orderCategory=String(body.paymentMethod||'cod').toLowerCase()==='online'?'online':'cod';
      const group=orderCategory==='online'?'online request':'cod request';
      const requestCollection=orderCategory==='online'?(type==='replacement'?'online replacement':'online return'):(type==='replacement'?'cod replacement':'cod return');

      const active=await db.collection('request').doc(group).collection(requestCollection)
        .where('userId','==',decoded.uid).where('orderId','==',orderId).get();
      const hasActive=active.docs.some(d=>['requested','approved','processing'].includes(d.data().status));
      if(hasActive)return send(res,409,{error:'An active request already exists for this order'});

      // Enforce 7-Day Return/Replacement Policy
      try {
        const orderSnap = await db.collection('orders').doc(orderCategory === 'online' ? 'online orders' : 'cod orders')
          .collection('records').doc(orderId).get();
        if (orderSnap.exists) {
          const oData = orderSnap.data();
          let baseTime = null;
          if (oData.deliveredAt) {
            if (oData.deliveredAt.toMillis) baseTime = oData.deliveredAt.toMillis();
            else if (oData.deliveredAt.toDate) baseTime = oData.deliveredAt.toDate().getTime();
            else if (oData.deliveredAt.seconds) baseTime = oData.deliveredAt.seconds * 1000;
            else if (typeof oData.deliveredAt === 'number') baseTime = oData.deliveredAt;
          }
          if (!baseTime && oData.createdAt) {
            if (oData.createdAt.toMillis) baseTime = oData.createdAt.toMillis();
            else if (oData.createdAt.toDate) baseTime = oData.createdAt.toDate().getTime();
            else if (oData.createdAt.seconds) baseTime = oData.createdAt.seconds * 1000;
            else if (typeof oData.createdAt === 'number') baseTime = oData.createdAt;
          }
          if (baseTime && (Date.now() - baseTime) > (7 * 24 * 60 * 60 * 1000)) {
            return send(res, 400, {
              error: type === 'replacement'
                ? 'Your time period for replacement is closed'
                : 'Your time period for return is closed'
            });
          }
        }
      } catch (err) {
        console.warn('Could not verify 7-day period against order record:', err);
      }

      const ref=db.collection('request').doc(group).collection(requestCollection).doc();
      await ref.set({
        userId:decoded.uid,orderId,displayOrderId:String(body.displayOrderId||orderId),
        type,paymentMethod:orderCategory,requestGroup:group,requestCollection,
        reason:'Customer reported a mismatch or damage',status:'requested',
        customer:clean(body.customer),shipping:clean(body.shipping),items:clean(body.items),
        total:Number(body.total||0),createdAt:admin.firestore.Timestamp.now(),
        updatedAt:admin.firestore.Timestamp.now()
      });
      return send(res,201,{ok:true,id:ref.id,status:'requested'});
    }
    return send(res,405,{error:'Method not allowed'});
  }catch(e){
    console.error('customer returns API:',e);
    const msg=String(e?.message||'');
    if(msg.includes('Missing FIREBASE_SERVICE_ACCOUNT_JSON')||msg.includes('Incomplete Firebase')||msg.includes('private key'))return send(res,500,{error:'Firebase server credentials are not configured correctly in Vercel.'});
    if(msg.includes('PERMISSION_DENIED'))return send(res,500,{error:'Firebase server access was denied.'});
    return send(res,500,{error:'Could not process the return request'});
  }
}