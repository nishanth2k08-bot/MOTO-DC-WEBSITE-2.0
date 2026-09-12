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
  if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
  try{
    const authHeader=req.headers.authorization||'',idToken=authHeader.startsWith('Bearer ')?authHeader.slice(7):'';
    if(!idToken)return send(res,401,{error:'Authentication required'});
    const a=getAdmin(),decoded=await a.auth().verifyIdToken(idToken),db=getFirestore(a.app(),'asia-south1');
    const adminSnap=await db.collection('admins').doc(decoded.uid).get();
    if(!adminSnap.exists)return send(res,403,{error:'Admin access required'});

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
