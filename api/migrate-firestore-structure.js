import admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';
function send(res,status,body){res.status(status).json(body)}
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

export default async function handler(req,res){
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 try{
  const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token)return send(res,401,{error:'Authentication required'});
  const a=getAdmin(),decoded=await a.auth().verifyIdToken(token),db=getFirestore(a.app(),'asia-south1');
  const adminSnap=await db.collection('admins').doc(decoded.uid).get();
  if(!adminSnap.exists)return send(res,403,{error:'Admin access required'});

  const marker=db.collection('_system').doc('firestore-structure-v4');
  const markerSnap=await marker.get();
  if(markerSnap.exists){
   const existing=markerSnap.data()||{};
   return send(res,200,{ok:true,alreadyMigrated:true,summary:existing.summary||null});
  }

  const summary={
   orders:{cod:0,online:0,deleted:0},
   paymentIntents:{cod:0,online:0,deleted:0},
   returns:{codReturn:0,codReplacement:0,onlineReturn:0,onlineReplacement:0,deleted:0}
  };
  const now=admin.firestore.FieldValue.serverTimestamp();

  // Move legacy root orders into the exact category/records hierarchy.
  const oldOrders=await db.collection('orders').get();
  for(const d of oldOrders.docs){
   const data=d.data();
   if(!data.userId||!Array.isArray(data.items)||!data.orderStatus)continue;
   const online=String(data.paymentMethod||'cod').toLowerCase()==='online';
   const group=online?'online orders':'cod orders';
   await db.collection('orders').doc(group).set({name:group,paymentMethod:online?'online':'cod',updatedAt:now},{merge:true});
   await db.collection('orders').doc(group).collection('records').doc(d.id).set({...data,migratedFrom:`orders/${d.id}`,migratedAt:now},{merge:true});
   await d.ref.delete();
   summary.orders[online?'online':'cod']++;
   summary.orders.deleted++;
  }

  // Move legacy payment intents into the exact category/records hierarchy.
  const oldIntents=await db.collection('paymentIntents').get();
  for(const d of oldIntents.docs){
   const data=d.data();
   if(!data.userId&&!data.amount&&!data.status)continue;
   const online=String(data.paymentMethod||'online').toLowerCase()==='online';
   const group=online?'online payment intents':'cod payment intents';
   await db.collection('paymentIntents').doc(group).set({name:group,paymentMethod:online?'online':'cod',updatedAt:now},{merge:true});
   await db.collection('paymentIntents').doc(group).collection('records').doc(d.id).set({...data,migratedFrom:`paymentIntents/${d.id}`,migratedAt:now},{merge:true});
   await d.ref.delete();
   summary.paymentIntents[online?'online':'cod']++;
   summary.paymentIntents.deleted++;
  }

  // Move legacy returns into request/{payment request}/{payment return|replacement}.
  const oldReturns=await db.collection('returns').get();
  for(const d of oldReturns.docs){
   const data=d.data();
   if(!data.userId||!data.orderId)continue;
   const online=String(data.paymentMethod||'cod').toLowerCase()==='online';
   const type=String(data.type||'return').toLowerCase()==='replacement'?'replacement':'return';
   const group=online?'online request':'cod request';
   const sub=online?(type==='replacement'?'online replacement':'online return'):(type==='replacement'?'cod replacement':'cod return');
   await db.collection('request').doc(group).set({name:group,paymentMethod:online?'online':'cod',updatedAt:now},{merge:true});
   await db.collection('request').doc(group).collection(sub).doc(d.id).set({...data,requestGroup:group,requestCollection:sub,migratedFrom:`returns/${d.id}`,migratedAt:now},{merge:true});
   await d.ref.delete();
   const key=online?(type==='replacement'?'onlineReplacement':'onlineReturn'):(type==='replacement'?'codReplacement':'codReturn');
   summary.returns[key]++;
   summary.returns.deleted++;
  }

  // Always ensure all requested parent documents exist, even when there are no records yet.
  const categories=[
   ['orders','cod orders','cod'],
   ['orders','online orders','online'],
   ['paymentIntents','cod payment intents','cod'],
   ['paymentIntents','online payment intents','online']
  ];
  for(const [root,id,paymentMethod] of categories){
   await db.collection(root).doc(id).set({name:id,paymentMethod,updatedAt:now},{merge:true});
  }
  for(const [id,paymentMethod] of [['cod request','cod'],['online request','online']]){
   await db.collection('request').doc(id).set({name:id,paymentMethod,updatedAt:now},{merge:true});
  }

  await marker.set({completedAt:now,summary});
  return send(res,200,{ok:true,summary});
 }catch(e){
  console.error('migrate-firestore-structure error:',e);
  const message=String(e?.message||'');
  if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
  return send(res,500,{error:'Firestore structure migration failed'});
 }
}
