import admin from 'firebase-admin';

function send(res,status,body){return res.status(status).json(body)}
function normalizePhone(value){
  const raw=String(value||'').trim();
  if(!/^\+[1-9]\d{7,14}$/.test(raw))return null;
  return {e164:raw,digits:raw.slice(1)};
}
function getAdmin(){
  if(admin.apps.length)return admin;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try{serviceAccount=JSON.parse(raw);if(typeof serviceAccount==='string')serviceAccount=JSON.parse(serviceAccount)}catch{
    try{serviceAccount=JSON.parse(Buffer.from(raw,'base64').toString('utf8'))}catch{throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')}
  }
  if(!serviceAccount?.project_id||!serviceAccount?.client_email||!serviceAccount?.private_key)throw new Error('Incomplete Firebase service account');
  admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
  return admin;
}

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const authkey=process.env.MSG91_AUTHKEY;
    if(!authkey)return send(res,500,{error:'MSG91_AUTHKEY is not configured in Vercel'});
    const phone=normalizePhone(req.body?.phone);
    const otp=String(req.body?.otp||'').trim();
    const name=String(req.body?.name||'').trim();
    if(!phone)return send(res,400,{error:'Enter a valid phone number with country code'});
    if(!/^\d{4,8}$/.test(otp))return send(res,400,{error:'Enter the verification code'});

    const response=await fetch('https://control.msg91.com/api/v5/otp/verify',{
      method:'POST',headers:{accept:'application/json',authkey,'content-type':'application/json'},
      body:JSON.stringify({mobile:phone.digits,otp})
    });
    const text=await response.text();
    let data={};try{data=text?JSON.parse(text):{}}catch{data={message:text}};
    console.log('MSG91 verify OTP:',response.status,data?.type||data?.message||'response');
    if(!response.ok)return send(res,response.status,{error:data?.message||data?.type||'Invalid OTP'});
    if(String(data?.type||'').toLowerCase()==='error')return send(res,400,{error:data?.message||'Invalid or expired OTP'});

    const a=getAdmin();
    let user;
    try{user=await a.auth().getUserByPhoneNumber(phone.e164)}catch(e){
      if(e?.code!=='auth/user-not-found')throw e;
      user=await a.auth().createUser({phoneNumber:phone.e164,displayName:name||undefined});
    }
    if(name&&user.displayName!==name)user=await a.auth().updateUser(user.uid,{displayName:name});
    const customToken=await a.auth().createCustomToken(user.uid,{phone_verified:true});
    return send(res,200,{ok:true,customToken,uid:user.uid,phone:user.phoneNumber||phone.e164,displayName:user.displayName||name||''});
  }catch(e){
    console.error('verify-otp error:',e);
    const message=String(e?.message||'');
    if(message.includes('FIREBASE_SERVICE_ACCOUNT_JSON')||message.includes('private key'))return send(res,500,{error:'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.'});
    return send(res,500,{error:'Could not verify OTP. Please try again.'});
  }
}
