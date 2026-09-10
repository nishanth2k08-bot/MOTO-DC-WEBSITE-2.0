function send(res,status,body){return res.status(status).json(body)}

function normalizePhone(value){
  const raw=String(value||'').trim();
  if(!/^\+[1-9]\d{7,14}$/.test(raw))return null;
  return {e164:raw,digits:raw.slice(1)};
}

export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  try{
    const authkey=process.env.MSG91_AUTHKEY;
    if(!authkey)return send(res,500,{error:'MSG91_AUTHKEY is not configured in Vercel'});

    const phone=normalizePhone(req.body?.phone);
    const otp=String(req.body?.otp||'').trim();
    if(!phone)return send(res,400,{error:'Enter a valid phone number with country code'});
    if(!/^\d{4,8}$/.test(otp))return send(res,400,{error:'Enter the verification code'});

    const response=await fetch('https://control.msg91.com/api/v5/otp/verify',{
      method:'POST',
      headers:{accept:'application/json',authkey,'content-type':'application/json'},
      body:JSON.stringify({mobile:phone.digits,otp})
    });
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{data={message:text};}

    console.log('MSG91 verify OTP:',response.status,data?.type||data?.message||'response');
    if(!response.ok)return send(res,response.status,{error:data?.message||data?.type||'Invalid OTP',details:data});
    if(String(data?.type||'').toLowerCase()==='error')return send(res,400,{error:data?.message||'Invalid or expired OTP',details:data});

    return send(res,200,{ok:true,message:data?.message||'OTP verified successfully'});
  }catch(e){
    console.error('verify-otp error:',e);
    return send(res,500,{error:'Could not verify OTP. Please try again.'});
  }
}
