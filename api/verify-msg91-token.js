import admin from 'firebase-admin';

function send(res,status,body){return res.status(status).json(body)}

function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{
    serviceAccount=JSON.parse(raw);
    if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount);
  }catch{
    try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));}
    catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');}
  }
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}

function normalizePhone(value){
  const raw=String(value||'').trim();
  if(!/^\+[1-9]\d{7,14}$/.test(raw))return null;
  return raw;
}

function digits(value){return String(value||'').replace(/\D/g,'')}

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const authkey=process.env.MSG91_AUTHKEY;
    if(!authkey)return send(res,500,{error:'MSG91_AUTHKEY is not configured in Vercel'});

    const accessToken=String(req.body?.accessToken||'').trim();
    const phone=normalizePhone(req.body?.phone);
    if(!accessToken)return send(res,400,{error:'Missing MSG91 access token'});
    if(!phone)return send(res,400,{error:'Invalid phone number'});

    const response=await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken',{
      method:'POST',
      headers:{accept:'application/json','content-type':'application/json'},
      body:JSON.stringify({authkey,'access-token':accessToken})
    });
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{data={message:text};}

    console.log('MSG91 access-token verification:',response.status,data?.type||data?.message||'response');
    if(!response.ok)return send(res,response.status,{error:data?.message||data?.type||'MSG91 access-token verification failed'});
    if(String(data?.type||'').toLowerCase()==='error')return send(res,401,{error:data?.message||'MSG91 access-token verification failed'});

    const verifiedPhone=data?.mobile||data?.phone||data?.identifier||data?.data?.mobile||data?.data?.phone||data?.data?.identifier;
    if(verifiedPhone&&digits(verifiedPhone)!==digits(phone))return send(res,401,{error:'The verified phone number does not match this login request'});

    const a=getAdmin();
    let user;
    try{
      user=await a.auth().getUserByPhoneNumber(phone);
    }catch(e){
      if(e?.code!=='auth/user-not-found')throw e;
      user=await a.auth().createUser({phoneNumber:phone});
    }

    const customToken=await a.auth().createCustomToken(user.uid,{phone_verified:true});
    return send(res,200,{ok:true,customToken,uid:user.uid,phone});
  }catch(e){
    console.error('verify-msg91-token error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    if(message.includes('phone number'))return send(res,400,{error:'This phone number could not be used for the Firebase account'});
    return send(res,500,{error:'Could not complete phone sign-in. Please try again.'});
  }
}
