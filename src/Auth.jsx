import React,{useEffect,useRef,useState} from 'react';
import {GoogleAuthProvider,OAuthProvider,createUserWithEmailAndPassword,onAuthStateChanged,signInWithEmailAndPassword,signInWithPhoneNumber,signInWithPopup,signOut,updateProfile,RecaptchaVerifier} from 'firebase/auth';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {useNavigate} from 'react-router-dom';
import {User,Mail,Lock,LogOut,ArrowRight,Phone,ShieldCheck,Eye,EyeOff} from 'lucide-react';
import {toast} from 'react-hot-toast';
import {auth,db} from './firebase';
import './auth.css';

async function saveUserProfile(user,name=''){
 const ref=doc(db,'users',user.uid);
 const snap=await getDoc(ref);
 const savedName=snap.exists()?String(snap.data()?.name||'').trim():'';
 const profileName=(name||user.displayName||savedName).trim();
 const data={uid:user.uid,email:user.email||'',phoneNumber:user.phoneNumber||'',provider:user.providerData?.[0]?.providerId||'phone',updatedAt:serverTimestamp()};
 if(profileName)data.name=profileName;
 if(!snap.exists())data.createdAt=serverTimestamp();
 await setDoc(ref,data,{merge:true});
 if(profileName&&user.displayName!==profileName)await updateProfile(user,{displayName:profileName});
}

export default function Auth(){
 const nav=useNavigate();
 const otpRefs=useRef([]);
 const [user,setUser]=useState(null);
 const [checking,setChecking]=useState(true);
 const [mode,setMode]=useState('signin');
 const [method,setMethod]=useState('email');
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [phone,setPhone]=useState('');
 const [countryCode,setCountryCode]=useState('+91');
 const [code,setCode]=useState('');
 const [otpDigits,setOtpDigits]=useState(Array(6).fill(''));
 const [confirmation,setConfirmation]=useState(false);
 const [confirmationResult,setConfirmationResult]=useState(null);
 const [needsName,setNeedsName]=useState(false);
 const [busy,setBusy]=useState(false);
 const [resendTimer,setResendTimer]=useState(40);

 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setChecking(false)}),[]);
 useEffect(()=>{let timer;if(confirmation&&resendTimer>0){timer=setInterval(()=>{setResendTimer(prev=>(prev>0?prev-1:0))},1000)}return()=>{if(timer)clearInterval(timer)}},[confirmation,resendTimer]);
 useEffect(()=>{if(confirmation)setTimeout(()=>otpRefs.current[0]?.focus(),50)},[confirmation]);

 const resetOtp=()=>{
  setCode('');
  setOtpDigits(Array(6).fill(''));
  setConfirmation(false);
  setConfirmationResult(null);
  window.confirmationResult=null;
  setNeedsName(false);
  setResendTimer(40);
 };

 const updateOtp=next=>{setOtpDigits(next);setCode(next.join(''))};
 const handleOtpChange=(index,value)=>{const clean=value.replace(/\D/g,'');if(!clean){const next=[...otpDigits];next[index]='';updateOtp(next);return}if(clean.length>1){const next=[...otpDigits];clean.slice(0,6).split('').forEach((d,i)=>{if(index+i<6)next[index+i]=d});updateOtp(next);otpRefs.current[Math.min(index+clean.length,5)]?.focus();return}const next=[...otpDigits];next[index]=clean;updateOtp(next);if(index<5)otpRefs.current[index+1]?.focus()};
 const handleOtpKeyDown=(index,e)=>{if(e.key==='Backspace'){e.preventDefault();const next=[...otpDigits];if(next[index])next[index]='';else if(index>0){next[index-1]='';otpRefs.current[index-1]?.focus()}updateOtp(next)}if(e.key==='ArrowLeft'&&index>0){e.preventDefault();otpRefs.current[index-1]?.focus()}if(e.key==='ArrowRight'&&index<5){e.preventDefault();otpRefs.current[index+1]?.focus()}};
 const handleOtpPaste=e=>{e.preventDefault();const pasted=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);if(!pasted)return;const next=Array(6).fill('');pasted.split('').forEach((d,i)=>next[i]=d);updateOtp(next);otpRefs.current[Math.min(pasted.length,6)-1]?.focus()};
 const handleCountryCodeChange=(e)=>{let val=e.target.value.trim().replace(/[^\d+]/g,'');if(!val){setCountryCode('');return}if(!val.startsWith('+'))val='+'+val.replace(/\+/g,'');else val='+'+val.slice(1).replace(/\+/g,'');if(val.length>5)val=val.slice(0,5);setCountryCode(val)};
 const handlePhoneChange=(e)=>{let val=e.target.value||'';if(val.includes('+')){const cleanFull=val.replace(/[^\d+]/g,'');if(cleanFull.startsWith('+91')&&cleanFull.length>3){setCountryCode('+91');setPhone(cleanFull.slice(3).replace(/\D/g,'').slice(0,10));return}else if(cleanFull.startsWith('+')&&cleanFull.length>1){const match=cleanFull.match(/^(\+\d{1,4})(.*)$/);if(match){setCountryCode(match[1]);setPhone(match[2].replace(/\D/g,'').slice(0,10));return}}}let digits=val.replace(/\D/g,'');if(digits.length===12&&digits.startsWith('91')){digits=digits.slice(2)}else if(digits.length===11&&digits.startsWith('0')){digits=digits.slice(1)}setPhone(digits.slice(0,10))};
 const handlePhoneKeyDown=(e)=>{if(['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End','Enter'].includes(e.key)||e.ctrlKey||e.metaKey){return}if(!/^\d$/.test(e.key)){e.preventDefault();return}const hasSelection=e.target.selectionStart!==e.target.selectionEnd;if(phone.length>=10&&!hasSelection){e.preventDefault()}};
 const getFullPhone=()=>{const rawNum=phone.trim().replace(/\D/g,'').slice(0,10);let rawCode=countryCode.trim();if(!rawCode||rawCode==='+'){rawCode='+91'}else if(!rawCode.startsWith('+')){rawCode=`+${rawCode}`}return{code:rawCode,number:rawNum,full:`${rawCode}${rawNum}`}};

 async function social(provider){
  setBusy(true);
  try{
   const cred=await signInWithPopup(auth,provider);
   await saveUserProfile(cred.user);
   toast.success('Welcome back to MotoDC!');
   nav('/',{replace:true});
  }catch(e){
   console.error(e);
   const m={'auth/popup-closed-by-user':'Sign-in window was closed','auth/popup-blocked':'Your browser blocked the sign-in popup','auth/account-exists-with-different-credential':'This email is already registered with another sign-in method'};
   toast.error(m[e.code]||e.message||'Social sign-in failed');
  }finally{
   setBusy(false);
  }
 }

 async function submitEmail(e){
  e.preventDefault();
  if(password.length<6){toast.error('Password must be at least 6 characters');return}
  setBusy(true);
  try{
   let cred;
   if(mode==='signup'){
    if(!name.trim()){toast.error('Please enter your name');setBusy(false);return}
    cred=await createUserWithEmailAndPassword(auth,email.trim(),password);
    await updateProfile(cred.user,{displayName:name.trim()});
    await saveUserProfile(cred.user,name.trim());
    toast.success('Account created successfully!');
   }else{
    cred=await signInWithEmailAndPassword(auth,email.trim(),password);
    await saveUserProfile(cred.user);
    toast.success('Welcome back to MotoDC!');
   }
   setPassword('');
   nav('/',{replace:true});
  }catch(e){
   console.error(e);
   const messages={'auth/email-already-in-use':'An account with this email already exists','auth/invalid-email':'Please enter a valid email address','auth/invalid-credential':'Invalid email or password','auth/weak-password':'Password is too weak','auth/network-request-failed':'Network error. Please try again'};
   toast.error(messages[e.code]||e.message||'Authentication failed');
  }finally{
   setBusy(false);
  }
 }

 const setupRecaptcha=()=>{
  if(window.recaptchaVerifier){
   try{window.recaptchaVerifier.clear()}catch{}
   window.recaptchaVerifier=null;
  }
  window.recaptchaVerifier=new RecaptchaVerifier(auth,'recaptcha-container',{
   size:'invisible',
   callback:()=>{},
   'expired-callback':()=>{
    if(window.recaptchaVerifier){try{window.recaptchaVerifier.clear()}catch{}window.recaptchaVerifier=null}
   }
  });
  return window.recaptchaVerifier;
 };

 async function sendCode(e){
  if(e)e.preventDefault();
  const {code:rawCode,number:rawNum,full:clean}=getFullPhone();
  if(!countryCode.trim()||countryCode.trim()==='+'){toast.error('Country code is compulsory (e.g. +91)');return}
  if(!rawNum){toast.error('Please enter your 10-digit mobile number');return}
  if(rawNum.length!==10){toast.error('Mobile number must be exactly 10 digits');return}
  if(!/^\+[1-9]\d{7,14}$/.test(clean)){toast.error('Please enter a valid country code and 10-digit mobile number');return}
  setBusy(true);
  try{
   const verifier=setupRecaptcha();
   const result=await signInWithPhoneNumber(auth,clean,verifier);
   setConfirmationResult(result);
   window.confirmationResult=result;
   setOtpDigits(Array(6).fill(''));
   setCode('');
   setResendTimer(40);
   setConfirmation(true);
   toast.success('Verification code sent to your mobile');
   setTimeout(()=>otpRefs.current[0]?.focus(),50);
  }catch(err){
   console.error('Firebase sendCode error:',err);
   if(window.recaptchaVerifier){
    try{window.recaptchaVerifier.clear()}catch{}
    window.recaptchaVerifier=null;
   }
   let msg='Could not send verification code';
   if(err.code==='auth/invalid-phone-number')msg='Invalid mobile number format';
   else if(err.code==='auth/too-many-requests')msg='Too many requests. Please wait a few minutes before trying again';
   else if(err.code==='auth/quota-exceeded')msg='SMS quota exceeded for today. Please try again later';
   else if(err.code==='auth/captcha-check-failed')msg='Security verification failed. Please refresh the page';
   else if(err.message)msg=err.message;
   toast.error(msg);
  }finally{
   setBusy(false);
  }
 }

 async function handleResendCode(){
  if(resendTimer>0||busy)return;
  await sendCode();
 }

 async function verifyCode(e){
  if(e)e.preventDefault();
  if(!confirmation)return;
  const currentCode=(otpDigits.join('')||code).trim();
  if(!/^\d{6}$/.test(currentCode)){toast.error('Enter all 6 digits of the verification code');return}
  const conf=confirmationResult||window.confirmationResult;
  if(!conf){toast.error('Verification session is missing. Please request a new code.');return}
  setBusy(true);
  try{
   const res=await conf.confirm(currentCode);
   const loggedUser=res.user;
   const userRef=doc(db,'users',loggedUser.uid);
   const snap=await getDoc(userRef);
   const existingName=snap.exists()?String(snap.data()?.name||'').trim():(loggedUser.displayName||'');

   if(!existingName&&!name.trim()){
    setNeedsName(true);
    setName('');
    toast.success('Number verified! Enter your name to finish account setup.');
    return;
   }

   const finalName=name.trim()||existingName||'Rider';
   await saveUserProfile(loggedUser,finalName);
   toast.success('Welcome back to MotoDC!');
   resetOtp();
   nav('/',{replace:true});
  }catch(err){
   console.error('Firebase verifyCode error:',err);
   let msg='Incorrect or expired verification code';
   if(err.code==='auth/invalid-verification-code')msg='Incorrect verification code. Please check and try again';
   else if(err.code==='auth/code-expired')msg='Verification code has expired. Please request a new code';
   toast.error(msg);
  }finally{
   setBusy(false);
  }
 }

 async function submitPhoneName(e){
  e.preventDefault();
  if(!name.trim()){toast.error('Please enter your name');return}
  const current=auth.currentUser;
  if(!current){toast.error('Verification session expired. Please request a new code.');resetOtp();return}
  setBusy(true);
  try{
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
 const signInForm=<form className="authform" onSubmit={submitEmail}>{mode==='signup'&&<label><span>Name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name" required/></div></label>}<label><span>Email</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label><label><span>Password</span><div className="passwordInputWrap"><Lock size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode==='signin'?'current-password':'new-password'} minLength="6" required/><button type="button" className="pwToggleBtn" onClick={()=>setShowPassword(prev=>!prev)} aria-label={showPassword?'Hide password':'Show password'} title={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><button className="heroBtn" disabled={busy}>{busy?(mode==='signin'?'Signing in...':'Creating account...'):(mode==='signin'?'Sign in':'Create account')}<ArrowRight size={17}/></button></form>;
 const phoneNameForm=<form className="authform" onSubmit={submitPhoneName}><label><span>Your name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" required autoFocus/></div></label><p className="authhint"><ShieldCheck size={15}/> Mobile verified. Enter your name to create your MotoDC account.</p><button className="heroBtn" disabled={busy}>{busy?'Creating account...':'Continue'}<ArrowRight size={17}/></button></form>;
 const phoneForm=<form className="authform" onSubmit={sendCode}><label><span>Mobile number</span><div className="phoneInputsRow"><div className="countryCodeBox"><input type="tel" className="countryCodeInput" value={countryCode} onChange={handleCountryCodeChange} placeholder="+91" maxLength={5} required aria-label="Country code" title="Country code is compulsory (e.g. +91)"/></div><div className="phoneNumberBox"><Phone size={17}/><input type="tel" className="phoneNumberInput" value={phone} onChange={handlePhoneChange} onKeyDown={handlePhoneKeyDown} placeholder="10-digit mobile number" autoComplete="tel-national" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required autoFocus/></div></div></label><p className="authhint"><ShieldCheck size={15}/> We'll send a verification code by SMS.</p><button className="heroBtn" disabled={busy}>{busy?'Sending code...':'Send verification code'}<ArrowRight size={17}/></button></form>;
 const otpForm=<form className="authform" onSubmit={verifyCode}><label><span>6-digit verification code</span><div className="otpInputWrap"><ShieldCheck size={17}/><div className="otpBoxes" role="group" aria-label="6-digit verification code" onPaste={handleOtpPaste}>{Array.from({length:6},(_,index)=><input key={index} ref={el=>{otpRefs.current[index]=el}} className="otpBox" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="1" value={otpDigits[index]} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} autoComplete={index===0?'one-time-code':'off'} aria-label={`OTP digit ${index+1}`} disabled={busy}/>)}</div></div></label><p className="authhint">Code sent to <b>{getFullPhone().code} {getFullPhone().number}</b></p><button className="heroBtn" disabled={busy}>{busy?'Verifying...':'Verify & continue'}<ArrowRight size={17}/></button><div className="resendOtpWrap">{resendTimer>0?<span className="resendCountdownText">Didn't receive code? Resend OTP in <b>{resendTimer}s</b></span>:<span className="resendActionText">Didn't receive code? <button type="button" className="resendInlineLink" onClick={handleResendCode} disabled={busy}>{busy?'Sending...':'Resend OTP'}</button></span>}</div><button type="button" className="textBtn" onClick={()=>{setConfirmation(false);setOtpDigits(Array(6).fill(''));setCode('');setConfirmationResult(null);window.confirmationResult=null;setResendTimer(40)}}>Use a different number</button></form>;
 const SHOW_PHONE_AUTH=false;
 let methodForm=signInForm;
 if(SHOW_PHONE_AUTH&&method==='phone')methodForm=needsName?phoneNameForm:(confirmation?otpForm:phoneForm);
 return (
  <section className="auth page">
   <div className="authcard">
    {SHOW_PHONE_AUTH&&<div id="recaptcha-container"></div>}
    <div className="authintro">
     <p className="eyebrow">MOTODC ACCOUNT</p>
     <h1>{mode==='signin'?<>Welcome <span>back.</span></>:<>Join the <span>ride.</span></>}</h1>
     <p>{mode==='signin'?'Sign in to keep your cart, orders and wishlist connected to your account.':'Create your customer account to shop faster and keep your purchases connected.'}</p>
    </div>
    <div className="authswitch">
     <button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');resetOtp()}}>Sign in</button>
     <button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');resetOtp()}}>Create account</button>
    </div>
    <div className="authsocial">
     <button type="button" onClick={()=>social(google)} disabled={busy}><img src="/google-icon.svg?v=2" alt="Google"/> Continue with Google</button>
     <button type="button" onClick={()=>social(apple)} disabled={busy}><img src="/apple-icon.svg?v=2" alt="Apple"/> Continue with Apple</button>
    </div>
    <div className="authdivider"><span>{SHOW_PHONE_AUTH?'or continue with':'or continue with email'}</span></div>
    {SHOW_PHONE_AUTH&&(
     <div className="authmethods">
      <button type="button" className={method==='email'?'active':''} onClick={()=>{setMethod('email');resetOtp()}}><Mail size={16}/> Email</button>
      <button type="button" className={method==='phone'?'active':''} onClick={()=>{setMethod('phone');resetOtp()}}><Phone size={16}/> Mobile</button>
     </div>
    )}
    {methodForm}
   </div>
  </section>
 );
}