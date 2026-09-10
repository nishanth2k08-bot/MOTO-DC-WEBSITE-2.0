function getEmailConfig(templateId){
  const missing=[];
  for(const key of ['MSG91_AUTHKEY','MSG91_EMAIL_DOMAIN'])if(!process.env[key])missing.push(key);
  if(!templateId)missing.push('email template id');
  if(missing.length)throw new Error(`MSG91 email service is not configured. Missing: ${missing.join(', ')}`);
}

export async function sendCustomerTemplateEmail({order,templateId}){
  const domain=String(process.env.MSG91_EMAIL_DOMAIN||'').trim();
  getEmailConfig(templateId);
  const email=String(order?.customer?.email||'').trim();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Customer email is missing or invalid');
  const customerName=String(order?.customer?.name||'Customer').trim();
  const orderId=String(order?.orderId||order?.id||'');
  const amount=Number(order?.total||0).toLocaleString('en-IN');
  const fromEmail=String(process.env.MSG91_FROM_EMAIL||`no-reply@${domain}`).trim();
  const payload={
    recipients:[{
      to:[{name:customerName,email}],
      variables:{customer_name:customerName,order_id:orderId,amount:`₹${amount}`}
    }],
    from:{name:process.env.MSG91_FROM_NAME||'MOTO DC',email:fromEmail},
    domain,
    template_id:templateId,
    validate_before_send:true
  };
  const response=await fetch('https://control.msg91.com/api/v5/email/send',{
    method:'POST',
    headers:{accept:'application/json',authkey:process.env.MSG91_AUTHKEY,'content-type':'application/json'},
    body:JSON.stringify(payload)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=data?.message||data?.error||data?.errors;
    throw new Error(`MSG91 rejected the email${detail?`: ${typeof detail==='string'?detail:JSON.stringify(detail)}`:''}`);
  }
  return data;
}
