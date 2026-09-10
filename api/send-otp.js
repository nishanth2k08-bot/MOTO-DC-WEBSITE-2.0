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
    const templateId=process.env.MSG91_OTP_TEMPLATE_ID;
    if(!authkey)return send(res,500,{error:'MSG91_AUTHKEY is not configured in Vercel'});
    if(!templateId)return send(res,500,{error:'MSG91_OTP_TEMPLATE_ID is not configured in Vercel'});

    const phone=normalizePhone(req.body?.phone);
    if(!phone)return send(res,400,{error:'Enter a valid phone number with country code, e.g. +919876543210'});

    const params=new URLSearchParams({
      template_id:templateId,
      mobile:phone.digits,
      otp_length:'6',
      otp_expiry:'10'
    });
    const response=await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`,{
      method:'POST',
      headers:{accept:'application/json',authkey,'content-type':'application/json'}
    });
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{}}catch{data={message:text};}

    console.log('MSG91 send OTP:',response.status,data?.type||data?.message||'response');
    if(!response.ok)return send(res,response.status,{error:data?.message||data?.type||'MSG91 could not send the OTP',details:data});
    if(String(data?.type||'').toLowerCase()==='error')return send(res,400,{error:data?.message||'MSG91 could not send the OTP',details:data});

    return send(res,200,{ok:true,message:data?.message||'OTP sent successfully'});
  }catch(e){
    console.error('send-otp error:',e);
    return send(res,500,{error:'Could not send OTP. Please try again.'});
  }
}
