import React,{useState,useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {auth} from './firebase';
import {ArrowLeft,CheckCircle,MapPin,Wallet,Truck,LogIn,ShieldCheck,Phone} from 'lucide-react';
import {toast} from 'react-hot-toast';

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const getCart=()=>{try{return JSON.parse(localStorage.getItem('motodc-cart')||'[]')}catch{return[]}};
const clearCart=()=>{localStorage.removeItem('motodc-cart');window.dispatchEvent(new Event('cartchange'))};

const loadRazorpay=()=>new Promise((resolve,reject)=>{
  if(window.Razorpay)return resolve(true);
  const existing=document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if(existing){
    existing.addEventListener('load',()=>resolve(true),{once:true});
    existing.addEventListener('error',()=>reject(new Error('Payment gateway could not load')),{once:true});
    return;
  }
  const s=document.createElement('script');
  s.src='https://checkout.razorpay.com/v1/checkout.js';
  s.onload=()=>resolve(true);
  s.onerror=()=>reject(new Error('Payment gateway could not load'));
  document.body.appendChild(s);
});

const readApiResponse=async response=>{
  const text=await response.text();
  let data;
  try{data=text?JSON.parse(text):{}}catch{
    throw new Error(response.ok?'Unexpected payment server response':'Payment server error. Please check the Vercel deployment logs.');
  }
  if(!response.ok)throw new Error(data.error||'Payment request failed');
  return data;
};

const lockScroll=()=>{
  document.documentElement.classList.add('motodc-payment-modal-open');
  document.body.classList.add('motodc-payment-modal-open');
};

const unlockScroll=()=>{
  document.documentElement.classList.remove('motodc-payment-modal-open');
  document.body.classList.remove('motodc-payment-modal-open');
};

export default function Checkout(){
  const nav=useNavigate(),[items]=useState(getCart()),[placed,setPlaced]=useState(null),[loading,setLoading]=useState(false),user=auth.currentUser;
  const [countryCode,setCountryCode]=useState('+');
  const [form,setForm]=useState({name:user?.displayName||'',email:user?.email||'',phone:(user?.phoneNumber||'').replace(/^\+\d{1,4}/,'')||'',address:'',city:'',state:'',pincode:''});
  const [payment,setPayment]=useState('cod');

  useEffect(()=>{
    if(user){
      loadRazorpay().catch(()=>{});
      user.getIdToken().catch(()=>{});
    }
    return ()=>{
      unlockScroll();
    };
  },[user]);

  const subtotal=items.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||1),0);
  const update=e=>setForm({...form,[e.target.name]:e.target.value});

  const handleCountryCodeChange=(e)=>{
    let val=e.target.value.trim().replace(/[^\d+]/g,'');
    if(!val||val==='+'){setCountryCode('+');return}
    val='+'+val.replace(/\+/g,'');
    if(val.length>5)val=val.slice(0,5);
    setCountryCode(val);
  };

  const handlePhoneChange=(e)=>{
    let val=e.target.value;
    if(val.includes('+')){
      const cleanFull=val.replace(/[^\d+]/g,'');
      if(cleanFull.startsWith('+91')&&cleanFull.length>3){
        setCountryCode('+91');
        setForm(prev=>({...prev,phone:cleanFull.slice(3).slice(0,15)}));
        return;
      }else if(cleanFull.startsWith('+')&&cleanFull.length>1){
        setForm(prev=>({...prev,phone:cleanFull.slice(1).slice(0,15)}));
        return;
      }
    }
    const digits=val.replace(/\D/g,'').slice(0,15);
    setForm(prev=>({...prev,phone:digits}));
  };

  const getFullPhone=()=>{
    const rawNum=form.phone.trim().replace(/\D/g,'');
    let rawCode=countryCode.trim();
    if(rawCode==='+'||rawCode===''){rawCode='+91'}
    else if(!rawCode.startsWith('+')){rawCode=`+${rawCode}`}
    return `${rawCode}${rawNum}`;
  };

  if(!user)return (
    <section className="page empty checkoutLogin">
      <div>
        <LogIn size={42}/>
        <p className="eyebrow">ACCOUNT REQUIRED</p>
        <h2>Sign in to complete your order</h2>
        <p>Please sign in before placing an order so your order can be securely linked to your account.</p>
        <button type="button" className="heroBtn" onClick={()=>nav('/account')}>Sign In</button>
      </div>
    </section>
  );

  const validate=()=>{
    if(!items.length){
      toast.error('Your cart is empty');
      nav('/products');
      return false;
    }
    const rawDigits=form.phone.replace(/\D/g,'');
    if(rawDigits.length<10){
      toast.error('Enter a valid 10-digit phone number');
      return false;
    }
    if(!/^[0-9]{6}$/.test(form.pincode)){
      toast.error('Enter a valid 6-digit PIN code');
      return false;
    }
    return true;
  };

  const placeCod=async()=>{
    const token=await user.getIdToken();
    const fullPhone=getFullPhone();
    const response=await fetch('/api/place-cod',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
      body:JSON.stringify({
        items:items.map(x=>({id:x.id,qty:x.qty})),
        customer:{name:form.name,email:form.email,phone:fullPhone},
        shipping:{address:form.address,city:form.city,state:form.state,pincode:form.pincode}
      })
    });
    const result=await readApiResponse(response);
    clearCart();
    setPlaced({orderId:result.orderId,total:result.total});
    toast.success('Order placed successfully');
  };

  const placeOnline=async()=>{
    const [_,token]=await Promise.all([loadRazorpay(),user.getIdToken()]);
    const create=await fetch('/api/create-payment',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
      body:JSON.stringify({items:items.map(x=>({id:x.id,qty:x.qty})),amount:subtotal})
    });
    const created=await readApiResponse(create);
    const fullPhone=getFullPhone();
    const options={
      key:created.keyId,
      amount:created.amount,
      currency:created.currency,
      name:'MotoDC',
      description:'Automotive parts order',
      order_id:created.orderId,
      prefill:{name:form.name,email:form.email,contact:fullPhone},
      theme:{color:'#ff3157'},
      modal:{
        ondismiss:()=>{
          unlockScroll();
          setLoading(false);
        }
      },
      handler:async response=>{
        // 1. Immediately unlock background scroll
        unlockScroll();
        // 2. Instantly clear cart
        clearCart();
        // 3. Show order confirmation screen INSTANTANEOUSLY (0ms delay)
        const instantOrderId=`MDC-${(response.razorpay_payment_id||'').slice(-8).toUpperCase()||Date.now().toString().slice(-8)}`;
        setPlaced({orderId:instantOrderId,total:subtotal});
        toast.success('Payment successful! Order confirmed.');

        // 4. Finalize server verification in the background without blocking the UI
        try{
          const verify=await fetch('/api/verify-payment',{
            method:'POST',
            headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
            body:JSON.stringify({
              razorpay_order_id:response.razorpay_order_id,
              razorpay_payment_id:response.razorpay_payment_id,
              razorpay_signature:response.razorpay_signature,
              customer:{name:form.name,email:form.email,phone:fullPhone},
              shipping:{address:form.address,city:form.city,state:form.state,pincode:form.pincode},
              paymentMethod:'online'
            })
          });
          const result=await readApiResponse(verify);
          if(result?.orderId){
            setPlaced(prev=>prev?{...prev,orderId:result.orderId,total:result.total||prev.total}:prev);
          }
        }catch(e){
          console.error('Background payment verification error:',e);
        }
      }
    };
    const rzp=new window.Razorpay(options);
    rzp.on('payment.failed',response=>{
      unlockScroll();
      setLoading(false);
      toast.error(response.error?.description||'Payment failed');
    });
    // Lock background scroll while payment modal is open
    lockScroll();
    rzp.open();
  };

  const submit=async e=>{
    e.preventDefault();
    if(!validate())return;
    setLoading(true);
    try{
      if(payment==='cod')await placeCod();
      else await placeOnline();
    }catch(err){
      unlockScroll();
      console.error(err);
      toast.error(err.message||'Could not place the order');
    }finally{
      setLoading(false);
    }
  };

  if(placed)return (
    <section className="page checkoutPage">
      <div className="orderSuccess">
        <CheckCircle size={64}/>
        <p className="eyebrow">ORDER CONFIRMED</p>
        <h1>Thank you for your <span>order.</span></h1>
        <p>Your order has been placed successfully.</p>
        <div className="orderNumber">Order ID <strong>{placed.orderId}</strong></div>
        <h2>{money(placed.total)}</h2>
        <div className="successActions">
          <button type="button" className="heroBtn" onClick={()=>nav('/products')}>Continue Shopping</button>
          <button type="button" className="secondaryBtn" onClick={()=>nav('/')}>Back Home</button>
        </div>
      </div>
    </section>
  );

  if(!items.length)return (
    <section className="page empty">
      <h2>Your cart is empty</h2>
      <button type="button" className="heroBtn" onClick={()=>nav('/products')}>Browse Products</button>
    </section>
  );

  return (
    <section className="page checkoutPage">
      <button type="button" className="backBtn" onClick={()=>nav('/cart')}><ArrowLeft size={16}/> Back to Cart</button>
      <div className="pagehead">
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h1>Complete your <span>order.</span></h1>
        <p>Enter your delivery details and choose a payment method.</p>
      </div>
      <div className="checkoutSteps">
        <div className="checkoutStep done"><div className="checkoutStepDot">✓</div><span className="checkoutStepLabel">Cart</span></div>
        <div className="checkoutStep active"><div className="checkoutStepDot">2</div><span className="checkoutStepLabel">Details</span></div>
        <div className="checkoutStep"><div className="checkoutStepDot">3</div><span className="checkoutStepLabel">Review</span></div>
      </div>
      <div className="checkoutLayout">
        <form className="checkoutForm" onSubmit={submit}>
          <div className="checkoutBlock">
            <h2>Contact details</h2>
            <div className="formGrid">
              <label>Full name<input required name="name" value={form.name} onChange={update} placeholder="Your full name"/></label>
              <label>Email<input required type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com"/></label>
              <label className="phoneLabel full">
                <span>Mobile Phone</span>
                <div className="phoneInputsRow">
                  <div className="countryCodeBox">
                    <input
                      type="tel"
                      className="countryCodeInput"
                      value={countryCode}
                      onChange={handleCountryCodeChange}
                      placeholder="+"
                      maxLength={5}
                      aria-label="Country code"
                      title="Country code (e.g. + or +91)"
                    />
                  </div>
                  <div className="phoneNumberBox">
                    <Phone size={17}/>
                    <input
                      required
                      type="tel"
                      className="phoneNumberInput"
                      name="phone"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder="10-digit mobile number"
                      maxLength={15}
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div className="checkoutBlock">
            <h2><MapPin size={19}/> Delivery address</h2>
            <div className="formGrid">
              <label className="full">Address<input required name="address" value={form.address} onChange={update} placeholder="House / street / area"/></label>
              <label>City<input required name="city" value={form.city} onChange={update} placeholder="City"/></label>
              <label>State<input required name="state" value={form.state} onChange={update} placeholder="State"/></label>
              <label>PIN code<input required name="pincode" value={form.pincode} onChange={update} placeholder="6-digit PIN" maxLength={6}/></label>
            </div>
          </div>
          <div className="checkoutBlock">
            <h2><Wallet size={19}/> Payment method</h2>
            <div className="paymentOptions">
              <label className={payment==='cod'?'selected':''}>
                <input type="radio" name="payment" checked={payment==='cod'} onChange={()=>setPayment('cod')}/>
                <span><b>Cash on Delivery</b><small>Pay when your order arrives</small></span>
              </label>
              <label className={payment==='online'?'selected':''}>
                <input type="radio" name="payment" checked={payment==='online'} onChange={()=>setPayment('online')}/>
                <span><b>Online Payment</b><small>Secure Razorpay checkout</small></span>
              </label>
            </div>
          </div>
          <button className="heroBtn placeOrder" disabled={loading}>
            {loading?'Processing...':payment==='online'?<>Pay Securely · {money(subtotal)} <ShieldCheck size={17}/></>:<>Place Order · {money(subtotal)}</>}
          </button>
        </form>
        <aside className="checkoutSummary">
          <h2>Order Summary</h2>
          {items.map(x=><div className="summaryItem" key={x.id}><img src={x.image} alt=""/><div><b>{x.name}</b><small>Qty {x.qty}</small></div><strong>{money(x.price*x.qty)}</strong></div>)}
          <hr/>
          <p>Subtotal <b>{money(subtotal)}</b></p>
          <p>Delivery <b>FREE</b></p>
          <h3>Total <span>{money(subtotal)}</span></h3>
          <div className="trust"><Truck size={17}/> Free delivery on this order</div>
        </aside>
      </div>
    </section>
  );
}
