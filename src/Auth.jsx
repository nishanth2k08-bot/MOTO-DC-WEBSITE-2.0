import React,{useEffect,useRef,useState} from 'react';
import {GoogleAuthProvider,OAuthProvider,createUserWithEmailAndPassword,onAuthStateChanged,signInWithCustomToken,signInWithEmailAndPassword,signInWithPopup,signOut,updateProfile} from 'firebase/auth';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {useNavigate} from 'react-router-dom';
import {User,Mail,Lock,LogOut,ArrowRight,Phone,ShieldCheck} from 'lucide-react';
import {toast} from 'react-hot-toast';
import {auth,db} from './firebase';
import './auth.css';

async function saveUserProfile(user,name=''){
 const ref=doc(db,'users',user.uid);const snap=await getDoc(ref);const savedName=snap.exists()?String(snap.data()?.name||'').trim():'';const profileName=(name||user.displayName||savedName).trim();const data={uid:user.uid,email:user.email||'',phoneNumber:user.phoneNumber||'',provider:user.providerData?.[0]?.providerId||'phone',updatedAt:serverTimestamp()};if(profileName)data.name=profileName;if(!snap.exists())data.createdAt=serverTimestamp();await setDoc(ref,data,{merge:true});if(profileName&&user.displayName!==profileName)await updateProfile(user,{displayName:profileName});
}
export default function Auth(){const nav=useNavigate();const otpRefs=useRef([]);const [user,setUser]=useState(null),[checking,setChecking]=useState(true),[mode,setMode]=useState('signin'),[method,setMethod]=useState('email'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[phone,setPhone]=useState(''),[countryCode,setCountryCode]=useState('+91'),[code,setCode]=useState(''),[otpDigits,setOtpDigits]=useState(Array(6).fill('')),[confirmation,setConfirmation]=useState(false),[needsName,setNeedsName]=useState(false),[pendingCustomToken,setPendingCustomToken]=useState(''),[reqId,setReqId]=useState(''),[busy,setBusy]=useState(false),[resendTimer,setResendTimer]=useState(40);
 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setChecking(false)}),[]);
 useEffect(()=>{let timer;if(confirmation&&resendTimer>0){timer=setInterval(()=>{setResendTimer(prev=>(prev>0?prev-1:0))},1000)}return()=>{if(timer)clearInterval(timer)}},[confirmation,resendTimer]);
 useEffect(()=>{if(confirmation)setTimeout(()=>otpRefs.current[0]?.focus(),50)},[confirmation]);
 const resetOtp=()=>{setCode('');setOtpDigits(Array(6).fill(''));setConfirmation(false);setNeedsName(false);setPendingCustomToken('');setReqId('');setResendTimer(40)};
 const updateOtp=next=>{setOtpDigits(next);setCode(next.join(''))};
 const handleOtpChange=(index,value)=>{const clean=value.replace(/\D/g,'');if(!clean){const next=[...otpDigits];next[index]='';updateOtp(next);return}if(clean.length>1){const next=[...otpDigits];clean.slice(0,6).split('').forEach((d,i)=>{if(index+i<6)next[index+i]=d});updateOtp(next);otpRefs.current[Math.min(index+clean.length,5)]?.focus();return}const next=[...otpDigits];next[index]=clean;updateOtp(next);if(index<5)otpRefs.current[index+1]?.focus()};
 const handleOtpKeyDown=(index,e)=>{if(e.key==='Backspace'){e.preventDefault();const next=[...otpDigits];if(next[index])next[index]='';else if(index>0){next[index-1]='';otpRefs.current[index-1]?.focus()}updateOtp(next)}if(e.key==='ArrowLeft'&&index>0){e.preventDefault();otpRefs.current[index-1]?.focus()}if(e.key==='ArrowRight'&&index<5){e.preventDefault();otpRefs.current[index+1]?.focus()}};
 const handleOtpPaste=e=>{e.preventDefault();const pasted=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);if(!pasted)return;const next=Array(6).fill('');pasted.split('').forEach((d,i)=>next[i]=d);updateOtp(next);otpRefs.current[Math.min(pasted.length,6)-1]?.focus()};
 const handleCountryCodeChange=(e)=>{let val=e.target.value.trim().replace(/[^\d+]/g,'');if(!val){setCountryCode('');return}if(!val.startsWith('+'))val='+'+val.replace(/\+/g,'');else val='+'+val.slice(1).replace(/\+/g,'');if(val.length>5)val=val.slice(0,5);setCountryCode(val)};
 const handlePhoneChange=(e)=>{let val=e.target.value||'';if(val.includes('+')){const cleanFull=val.replace(/[^\d+]/g,'');if(cleanFull.startsWith('+91')&&cleanFull.length>3){setCountryCode('+91');setPhone(cleanFull.slice(3).replace(/\D/g,'').slice(0,10));return}else if(cleanFull.startsWith('+')&&cleanFull.length>1){const match=cleanFull.match(/^(\+\d{1,4})(.*)$/);if(match){setCountryCode(match[1]);setPhone(match[2].replace(/\D/g,'').slice(0,10));return}}}let digits=val.replace(/\D/g,'');if(digits.length===12&&digits.startsWith('91')){digits=digits.slice(2)}else if(digits.length===11&&digits.startsWith('0')){digits=digits.slice(1)}setPhone(digits.slice(0,10))};
 const handlePhoneKeyDown=(e)=>{if(['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End','Enter'].includes(e.key)||e.ctrlKey||e.metaKey){return}if(!/^\d$/.test(e.key)){e.preventDefault();return}const hasSelection=e.target.selectionStart!==e.target.selectionEnd;if(phone.length>=10&&!hasSelection){e.preventDefault()}};
 const getFullPhone=()=>{const rawNum=phone.trim().replace(/\D/g,'').slice(0,10);let rawCode=countryCode.trim();if(!rawCode||rawCode==='+'){rawCode='+91'}else if(!rawCode.startsWith('+')){rawCode=`+${rawCode}`}return{code:rawCode,number:rawNum,full:`${rawCode}${rawNum}`}};
 async function social(provider){setBusy(true);try{const cred=await signInWithPopup(auth,provider);await saveUserProfile(cred.user);toast.success('Welcome back to MotoDC!');nav('/',{replace:true})}catch(e){console.error(e);const m={'auth/popup-closed-by-user':'Sign-in window was closed','auth/popup-blocked':'Your browser blocked the sign-in popup','auth/account-exists-with-different-credential':'This email is already registered with another sign-in method'};toast.error(m[e.code]||e.message||'Social sign-in failed')}finally{setBusy(false)}}
 async function submitEmail(e){e.preventDefault();if(password.length<6){toast.error('Password must be at least 6 characters');return}setBusy(true);try{let cred;if(mode==='signup'){if(!name.trim()){toast.error('Please enter your name');setBusy(false);return}cred=await createUserWithEmailAndPassword(auth,email.trim(),password);await updateProfile(cred.user,{displayName:name.trim()});await saveUserProfile(cred.user,name.trim());toast.success('Account created successfully!')}else{cred=await signInWithEmailAndPassword(auth,email.trim(),password);await saveUserProfile(cred.user);toast.success('Welcome back to MotoDC!')}setPassword('');nav('/',{replace:true})}catch(e){console.error(e);const messages={'auth/email-already-in-use':'An account with this email already exists','auth/invalid-email':'Please enter a valid email address','auth/invalid-credential':'Invalid email or password','auth/weak-password':'Password is too weak','auth/network-request-failed':'Network error. Please try again'};toast.error(messages[e.code]||e.message||'Authentication failed')}finally{setBusy(false)}}
 async function sendCode(e){
  if(e)e.preventDefault();
  const {code:rawCode,number:rawNum,full:clean}=getFullPhone();
  if(!countryCode.trim()||countryCode.trim()==='+'){toast.error('Country code is compulsory (e.g. +91)');return}
  if(!rawNum){toast.error('Please enter your 10-digit mobile number');return}
  if(rawNum.length!==10){toast.error('Mobile number must be exactly 10 digits');return}
  if(!/^\+[1-9]\d{7,14}$/.test(clean)){toast.error('Please enter a valid country code and 10-digit mobile number');return}
  setBusy(true);
   try {
     let sentSuccess = false;
    let reqIdFound = '';
    let lastError = '';

    // 1. Direct browser-to-MSG91 dispatch (runs from user device IP, bypassing cloud IP blocks)
    try {
      const clientPhone = rawNum.length === 10 ? '91' + rawNum : clean.replace(/\D/g, '');
      const clientResp = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          widgetId: '366a6f6a6e66333835303837',
          tokenAuth: '566450TeAGmYSf56ad0a7b5P1',
          identifier: clientPhone
        })
      });
      const clientData = await clientResp.json().catch(() => ({}));
      if (clientResp.ok && (clientData.type === 'success' || clientData.message)) {
        sentSuccess = true;
        reqIdFound = clientData.message || 'otp_sent';
      } else if (clientData.message || clientData.error) {
        lastError = clientData.message || clientData.error;
      }
    } catch (err) {
      console.warn('Direct client dispatch error:', err);
    }

    // 2. Server fallback if direct browser dispatch was not successful
    if (!sentSuccess) {
      const resp = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: clean })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || lastError || 'Could not send verification code');
      }
      reqIdFound = data.reqId || 'otp_sent';
      sentSuccess = true;
    }

    const id = reqIdFound || 'otp_sent';
    setReqId(String(id));
    setOtpDigits(Array(6).fill(''));
    setCode('');
    setResendTimer(40);
    // Instantly transition to 6-digit OTP view
    setConfirmation(true);
    toast.success('Verification code sent to your mobile');
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  } catch (e) {
    console.error('Send OTP error:', e);
    toast.error(e.message || 'Could not send verification code');
  } finally {
    setBusy(false);
  }
 }
 async function handleResendCode(){
   if(resendTimer>0||busy)return;
   const {number:rawNum,full:clean}=getFullPhone();
   setBusy(true);
   try{
     let resendSuccess = false;
     let newReqId = '';
     try {
       const clientResp = await fetch('https://control.msg91.com/api/v5/widget/retryOtp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
         body: JSON.stringify({ widgetId: '366a6f6a6e66333835303837', tokenAuth: '566450TeAGmYSf56ad0a7b5P1', reqId, retryChannel: 11 })
       });
       const clientData = await clientResp.json().catch(() => ({}));
       if (clientResp.ok && (clientData.type === 'success' || clientData.message)) {
         resendSuccess = true;
         newReqId = clientData.message || reqId;
       }
     } catch {}
     if (!resendSuccess) {
       const resp=await fetch('/api/otp',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'retry',phone:clean,reqId}) });
       const data=await resp.json().catch(()=>({}));
       if(!resp.ok||!data.ok) throw new Error(data.error||'Could not resend verification code');
       if(data.reqId) newReqId = String(data.reqId);
     }
     if(newReqId) setReqId(String(newReqId));
     setOtpDigits(Array(6).fill(''));
     setCode('');
     setResendTimer(40);
     toast.success('New verification code sent!');
     setTimeout(()=>otpRefs.current[0]?.focus(),50);
   }catch(e){
     console.error('Resend OTP error:',e);
     toast.error(e.message||'Could not resend verification code');
   }finally{
     setBusy(false);
   }
 }
 async function verifyCode(e){
   if(e)e.preventDefault();
   if(!confirmation)return;
   const currentCode=(otpDigits.join('')||code).trim();
   if(!/^\d{6}$/.test(currentCode)){toast.error('Enter all 6 digits of the verification code');return}
   setBusy(true);
   try{
     const {number:rawNum,full:clean}=getFullPhone();
     const clientPhone = rawNum.length === 10 ? '91' + rawNum : clean.replace(/\D/g, '');
     let verifiedDirectly = false;
     try {
       const clientResp = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
         body: JSON.stringify({ widgetId: '366a6f6a6e66333835303837', tokenAuth: '566450TeAGmYSf56ad0a7b5P1', reqId, otp: currentCode, identifier: clientPhone })
       });
       const clientData = await clientResp.json().catch(() => ({}));
       if (clientResp.ok && (clientData.type === 'success' || (clientData.message && String(clientData.message).toLowerCase().includes('success')))) {
         verifiedDirectly = true;
       } else if (clientData.type === 'error' && clientData.message && !clientData.message.toLowerCase().includes('ip')) {
         throw new Error(clientData.message || 'Incorrect verification code');
       }
     } catch (err) {
       if (err.message && err.message.toLowerCase().includes('incorrect')) throw err;
     }
     const resp=await fetch('/api/otp',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({action:'verify',phone:clean,otp:currentCode,reqId,name,verifiedDirectly})
     });
     const data=await resp.json().catch(()=>({}));
     if(!resp.ok||(!data.ok&&!data.needsName)){
       throw new Error(data.error||'Incorrect or expired verification code');
     }
     if(data.needsName){
       if(!data.customToken)throw new Error('Could not prepare your account. Please try again.');
       setPendingCustomToken(data.customToken);
       setNeedsName(true);
       setName('');
       toast.success('Number verified! Enter your name to finish account setup.');
       return;
     }
     if(data.ok&&data.customToken){
       await signInWithCustomToken(auth,data.customToken);
       const current=auth.currentUser;
       if(current)await saveUserProfile(current,data.name||'');
       toast.success('Welcome back to MotoDC!');
       resetOtp();
       nav('/',{replace:true});
     }
   }catch(e){
     console.error('Verify OTP error:',e);
     toast.error(e.message||'Verification failed');
   }finally{
     setBusy(false);
   }
 }
 async function submitPhoneName(e){
  e.preventDefault();
  if(!name.trim()){toast.error('Please enter your name');return}
  if(!pendingCustomToken){toast.error('Verification session expired. Please request a new code.');resetOtp();return}
  setBusy(true);
  try{
    await signInWithCustomToken(auth,pendingCustomToken);
    const current=auth.currentUser;
    if(!current)throw new Error('Could not sign in to your new account');
    await updateProfile(current,{displayName:name.trim()});
    await saveUserProfile(current,name.trim());
    toast.success('Account created. Welcome to MotoDC!');
    resetOtp();
    nav('/',{replace:true});
  }catch(e){
    console.error('Name setup error:',e);
    toast.error(e.message||'Could not create your account');
  }finally{
    setBusy(false);
  }
 }
 const logout=async()=>{setBusy(true);try{await signOut(auth);nav('/account',{replace:true})}catch{toast.error('Could not sign out');setBusy(false)}};
 if(checking)return <section className="auth page"><div className="authcard"><p>Loading account...</p></div></section>;
 if(user)return <section className="auth page"><div className="accountcard"><div className="accounticon"><User size={30}/></div><p className="eyebrow">MOTODC ACCOUNT</p><h1>Welcome, <span>{user.displayName||'Rider'}.</span></h1><p className="accountmuted">Your customer account is connected to Firebase.</p><div className="accountinfo"><div><small>Name</small><b>{user.displayName||'Not set'}</b></div><div><small>Email</small><b>{user.email||'Phone account'}</b></div>{user.phoneNumber&&<div><small>Phone</small><b>{user.phoneNumber}</b></div>}</div><button className="heroBtn" onClick={logout} disabled={busy}><LogOut size={17}/>{busy?'Signing out...':'Sign out'}</button></div></section>;
 const google=new GoogleAuthProvider();const apple=new OAuthProvider('apple.com');
 const signInForm=<form className="authform" onSubmit={submitEmail}>{mode==='signup'&&<label><span>Name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name" required/></div></label>}<label><span>Email</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label><label><span>Password</span><div><Lock size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode==='signin'?'current-password':'new-password'} minLength="6" required/></div></label><button className="heroBtn" disabled={busy}>{busy?(mode==='signin'?'Signing in...':'Creating account...'):(mode==='signin'?'Sign in':'Create account')}<ArrowRight size={17}/></button></form>;
 const phoneNameForm=<form className="authform" onSubmit={submitPhoneName}><label><span>Your name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" required autoFocus/></div></label><p className="authhint"><ShieldCheck size={15}/> Mobile verified. Enter your name to create your MotoDC account.</p><button className="heroBtn" disabled={busy}>{busy?'Creating account...':'Continue'}<ArrowRight size={17}/></button></form>;
  const phoneForm=<form className="authform" onSubmit={sendCode}><label><span>Mobile number</span><div className="phoneInputsRow"><div className="countryCodeBox"><input type="tel" className="countryCodeInput" value={countryCode} onChange={handleCountryCodeChange} placeholder="+91" maxLength={5} required aria-label="Country code" title="Country code is compulsory (e.g. +91)"/></div><div className="phoneNumberBox"><Phone size={17}/><input type="tel" className="phoneNumberInput" value={phone} onChange={handlePhoneChange} onKeyDown={handlePhoneKeyDown} placeholder="10-digit mobile number" autoComplete="tel-national" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required autoFocus/></div></div></label><p className="authhint"><ShieldCheck size={15}/> We'll send a verification code by SMS.</p><button className="heroBtn" disabled={busy}>{busy?'Sending code...':'Send verification code'}<ArrowRight size={17}/></button></form>;
 const otpForm=<form className="authform" onSubmit={verifyCode}><label><span>6-digit verification code</span><div className="otpInputWrap"><ShieldCheck size={17}/><div className="otpBoxes" role="group" aria-label="6-digit verification code" onPaste={handleOtpPaste}>{Array.from({length:6},(_,index)=><input key={index} ref={el=>{otpRefs.current[index]=el}} className="otpBox" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="1" value={otpDigits[index]} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} autoComplete={index===0?'one-time-code':'off'} aria-label={`OTP digit ${index+1}`} disabled={busy}/>)}</div></div></label><p className="authhint">Code sent to <b>{getFullPhone().code} {getFullPhone().number}</b></p><button className="heroBtn" disabled={busy}>{busy?'Verifying...':'Verify & continue'}<ArrowRight size={17}/></button><div className="resendOtpWrap">{resendTimer>0?<span className="resendCountdownText">Didn't receive code? Resend OTP in <b>{resendTimer}s</b></span>:<span className="resendActionText">Didn't receive code? <button type="button" className="resendInlineLink" onClick={handleResendCode} disabled={busy}>{busy?'Sending...':'Resend OTP'}</button></span>}</div><button type="button" className="textBtn" onClick={()=>{setConfirmation(false);setOtpDigits(Array(6).fill(''));setCode('');setReqId('');setResendTimer(40)}}>Use a different number</button></form>;
 let methodForm=signInForm;if(method==='phone')methodForm=needsName?phoneNameForm:(confirmation?otpForm:phoneForm);
 return <section className="auth page"><div className="authcard"><div className="authintro"><p className="eyebrow">MOTODC ACCOUNT</p><h1>{mode==='signin'?<>Welcome <span>back.</span></>:<>Join the <span>ride.</span></>}</h1><p>{mode==='signin'?'Sign in to keep your cart, orders and wishlist connected to your account.':'Create your customer account to shop faster and keep your purchases connected.'}</p></div><div className="authswitch"><button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');resetOtp()}}>Sign in</button><button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');resetOtp()}}>Create account</button></div><div className="authsocial"><button type="button" onClick={()=>social(google)} disabled={busy}><img src="/google-icon.svg?v=2" alt="Google"/> Continue with Google</button><button type="button" onClick={()=>social(apple)} disabled={busy}><img src="/apple-icon.svg?v=2" alt="Apple"/> Continue with Apple</button></div><div className="authdivider"><span>or continue with</span></div><div className="authmethods"><button type="button" className={method==='email'?'active':''} onClick={()=>{setMethod('email');resetOtp()}}><Mail size={16}/> Email</button><button type="button" className={method==='phone'?'active':''} onClick={()=>{setMethod('phone');resetOtp()}}><Phone size={16}/> Mobile</button></div>{methodForm}</div></section>;
}