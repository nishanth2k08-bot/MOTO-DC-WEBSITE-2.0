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

export default async function handler(req,res){
  if(!['GET','PATCH','DELETE'].includes(req.method))return send(res,405,{error:'Method not allowed'});
  try{
    const authHeader=req.headers.authorization||'',idToken=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const adminSnap=await db.collection('admins').doc(decoded.uid).get();
    if(!adminSnap.exists)return send(res,403,{error:'Admin access required'});

    if(req.method==='DELETE'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const requestGroup=String(body.requestGroup||''),requestCollection=String(body.requestCollection||''),requestId=String(body.requestId||'');
      const allowedGroups=new Set(['cod request','online request']);
      const allowedCollections=new Set(['cod return','cod replacement','online return','online replacement']);
      if(!allowedGroups.has(requestGroup)||!allowedCollections.has(requestCollection)||!requestId)return send(res,400,{error:'Invalid return request delete payload'});
      const requestRef=db.collection('request').doc(requestGroup).collection(requestCollection).doc(requestId);
      const requestSnap=await requestRef.get();
      if(!requestSnap.exists)return send(res,404,{error:'Return request not found'});
      const requestData=requestSnap.data()||{};
      if(requestData.status!=='completed'){
        return send(res,400,{error:'Only completed return or replacement requests can be removed'});
      }
      await requestRef.delete();
      return send(res,200,{ok:true,deletedId:requestId});
    }

    if(req.method==='PATCH'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const requestGroup=String(body.requestGroup||''),requestCollection=String(body.requestCollection||''),requestId=String(body.requestId||''),status=String(body.status||'');
      const allowedGroups=new Set(['cod request','online request']);
      const allowedCollections=new Set(['cod return','cod replacement','online return','online replacement']);
      const allowedStatuses=new Set(['requested','approved','processing','completed','rejected']);
      if(!allowedGroups.has(requestGroup)||!allowedCollections.has(requestCollection)||!requestId||!allowedStatuses.has(status))return send(res,400,{error:'Invalid return request update'});
      const requestRef=db.collection('request').doc(requestGroup).collection(requestCollection).doc(requestId);
      const requestSnap=await requestRef.get();
      if(!requestSnap.exists)return send(res,404,{error:'Return request not found'});
      const requestData=requestSnap.data()||{};
      const now=new Date();
      const history=Array.isArray(requestData.statusHistory)?requestData.statusHistory:[];
      history.push({status,updatedAt:now,updatedBy:decoded.uid});
      await requestRef.update({status,updatedAt:now,statusHistory:history});
      if(status==='completed'){
        const payment=String(requestData.paymentMethod||'').toLowerCase()==='online'?'online':'cod';
        const orderCategory=payment==='online'?'online orders':'cod orders';
        const orderId=String(requestData.orderId||'');
        if(orderId){
          const orderRef=db.collection('orders').doc(orderCategory).collection('records').doc(orderId);
          const orderSnap=await orderRef.get();
          if(orderSnap.exists){
            const nextStatus=requestData.type==='replacement'?'replaced':'returned';
            const orderData=orderSnap.data()||{};
            const orderHistory=Array.isArray(orderData.statusHistory)?orderData.statusHistory:[];
            orderHistory.push({status:nextStatus,updatedAt:now,reason:requestData.type==='replacement'?'Replacement request completed':'Return request completed'});
            await orderRef.update({orderStatus:nextStatus,statusHistory:orderHistory,afterSalesType:requestData.type,afterSalesRequestId:requestId,updatedAt:now});
          }
        }
      }
      return send(res,200,{ok:true,status,orderStatus:status==='completed'?(requestData.type==='replacement'?'replaced':'returned'):undefined});
    }

    const groups=[
      ['cod request','cod return'],
      ['cod request','cod replacement'],
      ['online request','online return'],
      ['online request','online replacement']
    ];
    const results=[];
    for(const [requestGroup,requestCollection] of groups){
      try{
        const snap=await db.collection('request').doc(requestGroup).collection(requestCollection).orderBy('createdAt','desc').get();
        snap.forEach(d=>results.push({id:d.id,requestGroup,requestCollection,...d.data()}));
      }catch(error){
        console.error(`admin-returns ${requestGroup}/${requestCollection}:`,error);
      }
    }
    results.sort((a,b)=>{
      const av=a.createdAt?.toMillis?.()||0,bv=b.createdAt?.toMillis?.()||0;
      return bv-av;
    });
    return send(res,200,{requests:results});
  }catch(e){
    console.error('admin-returns error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    return send(res,500,{error:'Could not load return requests'});
  }
}
