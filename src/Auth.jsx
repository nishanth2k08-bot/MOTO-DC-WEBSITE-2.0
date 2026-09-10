import React,{useEffect,useRef,useState} from 'react';
import {GoogleAuthProvider,OAuthProvider,createUserWithEmailAndPassword,onAuthStateChanged,signInWithCustomToken,signInWithEmailAndPassword,signInWithPopup,signOut,updateProfile} from 'firebase/auth';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {useNavigate} from 'react-router-dom';
import {User,Mail,Lock,LogOut,ArrowRight,Phone,Chrome,Apple,ShieldCheck} from 'lucide-react';
import {toast} from 'react-hot-toast';
import {auth,db} from './firebase';
import './auth.css';

const MSG91_WIDGET_ID='36696a6b507a303132373731';
const MSG91_WIDGET_TOKEN='566450TDkg3WwhwL6a9f8bdfP1';

async function saveUserProfile(user,name=''){
 const ref=doc(db,'users',user.uid),snap=await getDoc(ref),profileName=(name||user.displayName||'').trim();
 const data={uid:user.uid,email:user.email||'',phoneNumber:user.phoneNumber||'',provider:user.providerData?.[0]?.providerId||'phone',updatedAt:serverTimestamp()};
 if(profileName)data.name=profileName;if(!snap.exists())data.createdAt=serverTimestamp();
 await setDoc(ref,data,{merge:true});
 if(profileName&&user.displayName!==profileName)await updateProfile(user,{displayName:profileName});
}

function loadMsg91Widget(){
 return new Promise((resolve,reject)=>{
  if(window.initSendOTP)return resolve();
  const existing=document.querySelector('script[data-msg91-otp-widget]');
  if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(new Error('MSG91 OTP Widget could not load')),{once:true});return}
  const script=document.createElement('script');
  script.src='https://verify.msg91.com/otp-provider.js';script.async=true;script.dataset.msg91OtpWidget='true';
  script.onload=()=>resolve();script.onerror=()=>reject(new Error('MSG91 OTP Widget could not load'));document.head.appendChild(script);
 });
}

export default function Auth(){
 const nav=useNavigate();
 const otpRefs=useRef([]);
 const [user,setUser]=useState(null),[checking,setChecking]=useState(true),[mode,setMode]=useState('signin'),[method,setMethod]=useState('email'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[phone,setPhone]=useState(''),[code,setCode]=useState(''),[otpDigits,setOtpDigits]=useState(Array(6).fill('')),[confirmation,setConfirmation]=useState(false),[needsName,setNeedsName]=useState(false),[accessToken,setAccessToken]=useState(''),[reqId,setReqId]=useState(''),[busy,setBusy]=useState(false),[widgetReady,setWidgetReady]=useState(false);
 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setChecking(false)}),[]);
 useEffect(()=>{let alive=true;loadMsg91Widget().then(()=>{if(!alive)return;window.initSendOTP({widgetId:MSG91_WIDGET_ID,tokenAuth:MSG91_WIDGET_TOKEN,exposeMethods:true,identifier:'',captchaRenderId:'msg91-captcha',success:()=>{},failure:()=>{}});setWidgetReady(true)}).catch(e=>{console.error(e);if(alive)toast.error('Phone OTP service could not be loaded')});return()=>{alive=false}},[]);
 useEffect(()=>{if(confirmation)setTimeout(()=>otpRefs.current[0]?.focus(),50)},[confirmation]);
 function resetOtp(){setCode('');setOtpDigits(Array(6).fill(''));setConfirmation(false);setNeedsName(false);setAccessToken('');setReqId('')}
 function updateOtp(next){setOtpDigits(next);setCode(next.join(''))}
 function handleOtpChange(index,value){
  const digit=value.replace(/\D/g,'').slice(-1),next=[...otpDigits];next[index]=digit;updateOtp(next);
  if(digit&&index<5)otpRefs.current[index+1]?.focus();
 }
 function handleOtpKeyDown(index,e){
  if(e.key==='Backspace'){e.preventDefault();const next=[...otpDigits];if(next[index])next[index]='';else if(index>0){next[index-1]='';otpRefs.current[index-1]?.focus()}updateOtp(next)}
  if(e.key==='ArrowLeft'&&index>0){e.preventDefault();otpRefs.current[index-1]?.focus()}
  if(e.key==='ArrowRight'&&index<5){e.preventDefault();otpRefs.current[index+1]?.focus()}
 }
 function handleOtpPaste(e){
  e.preventDefault();const pasted=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);if(!pasted)return;const next=Array(6).fill('');pasted.split('').forEach((d,i)=>next[i]=d);updateOtp(next);otpRefs.current[Math.min(pasted.length,6)-1]?.focus();
 }
 async function social(provider){setBusy(true);try{const cred=await signInWithPopup(auth,provider);await saveUserProfile(cred.user);toast.success('Signed in successfully! Welcome to MotoDC.');setTimeout(()=>nav('/',{replace:true}),350)}catch(e){console.error(e);const m={'auth/popup-closed-by-user':'Sign-in window was closed','auth/popup-blocked':'Your browser blocked the sign-in popup','auth/account-exists-with-different-credential':'This email is already registered with another sign-in method'};toast.error(m[e.code]||e.message||'Social sign-in failed')}finally{setBusy(false)}}
 async function submitEmail(e){e.preventDefault();if(password.length<6){toast.error('Password must be at least 6 characters');return}setBusy(true);try{let cred;if(mode==='signup'){if(!name.trim()){toast.error('Please enter your name');setBusy(false);return}cred=await createUserWithEmailAndPassword(auth,email.trim(),password);await updateProfile(cred.user,{displayName:name.trim()});await saveUserProfile(cred.user,name.trim());toast.success('Account created successfully!')}else{cred=await signInWithEmailAndPassword(auth,email.trim(),password);await saveUserProfile(cred.user);toast.success('Signed in successfully! Welcome to MotoDC.')}setPassword('');setTimeout(()=>nav('/',{replace:true}),350)}catch(e){console.error(e);const messages={'auth/email-already-in-use':'An account with this email already exists','auth/invalid-email':'Please enter a valid email address','auth/invalid-credential':'Invalid email or password','auth/weak-password':'Password is too weak','auth/network-request-failed':'Network error. Please try again'};toast.error(messages[e.code]||e.message||'Authentication failed')}finally{setBusy(false)}}
 async function sendCode(e){e.preventDefault();const clean=phone.trim();if(!/^\+[1-9]\d{7,14}$/.test(clean)){toast.error('Enter your number with country code, e.g. +919876543210');return}if(!widgetReady||!window.sendOtp){toast.error('OTP service is still loading. Please try again in a moment.');return}setBusy(true);try{await new Promise((resolve,reject)=>{window.sendOtp(clean.slice(1),(data)=>{const id=data?.message||data?.reqId||data?.requestId;if(!id)reject(new Error('MSG91 did not return a request ID'));else{setReqId(String(id));resolve(data)}},error=>reject(new Error(error?.message||error?.type||'Could not send verification code'))) });setOtpDigits(Array(6).fill(''));setCode('');setConfirmation(true);toast.success('Verification code sent to your mobile')}catch(e){console.error('MSG91 send OTP error:',e);toast.error(e.message||'Could not send verification code')}finally{setBusy(false)}}
 async function finishPhoneSignIn(token,nameValue=''){
  const response=await fetch('/api/verify-msg91-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone.trim(),accessToken:token,name:nameValue.trim()})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||(!data.ok&&!data.needsName))throw new Error(data.error||'Could not complete phone sign-in');
  if(data.needsName){setAccessToken(token);setNeedsName(true);setName('');return false}
  await signInWithCustomToken(auth,data.customToken);
  const current=auth.currentUser;
  if(current)await saveUserProfile(current,data.name||nameValue.trim());
  return true;
 }
 async function verifyCode(e){e.preventDefault();if(!confirmation||!reqId)return;if(!/^\d{6}$/.test(code)){toast.error('Enter all 6 digits of the verification code');return}setBusy(true);try{const result=await new Promise((resolve,reject)=>{window.verifyOtp(code,data=>resolve(data),error=>reject(new Error(error?.message||error?.type||'Incorrect or expired verification code')),reqId)});const token=typeof result==='string'?result:(result?.['access-token']||result?.accessToken||result?.token||result?.message);if(!token)throw new Error('MSG91 did not return a verification token');const signedIn=await finishPhoneSignIn(token);if(signedIn){toast.success('Phone verified. Signed in successfully!');setCode('');setOtpDigits(Array(6).fill(''));setConfirmation(false);setReqId('');setTimeout(()=>nav('/',{replace:true}),350)}else{toast.success('New number verified. Enter your name to finish account setup.')}}catch(e){console.error('MSG91 verify OTP error:',e);toast.error(e.message||'Verification failed')}finally{setBusy(false)}}
 async function submitPhoneName(e){e.preventDefault();if(!name.trim()){toast.error('Please enter your name');return}if(!accessToken){toast.error('Verification session expired. Please request a new code.');setNeedsName(false);setConfirmation(false);return}setBusy(true);try{const signedIn=await finishPhoneSignIn(accessToken,name);if(!signedIn)throw new Error('Could not create your account');toast.success('Account created. Welcome to MotoDC!');resetOtp();setTimeout(()=>nav('/',{replace:true}),350)}catch(e){console.error('MSG91 name setup error:',e);toast.error(e.message||'Could not create your account')}finally{setBusy(false)}}
 async function logout(){try{await signOut(auth);toast.success('Signed out successfully');setTimeout(()=>nav('/',{replace:true}),250)}catch{toast.error('Could not sign out')}}
 if(checking)return <section className="auth page"><div className="authcard"><p>Loading account...</p></div></section>;
 if(user)return <section className="auth page"><div className="accountcard"><div className="accounticon"><User size={30}/></div><p className="eyebrow">MOTODC ACCOUNT</p><h1>Welcome, <span>{user.displayName||'Rider'}.</span></h1><p className="accountmuted">Your customer account is connected to Firebase.</p><div className="accountinfo"><div><small>Name</small><b>{user.displayName||'Not set'}</b></div><div><small>Email</small><b>{user.email||'Phone account'}</b></div>{user.phoneNumber&&<div><small>Phone</small><b>{user.phoneNumber}</b></div>}</div><button className="heroBtn" onClick={logout}><LogOut size={17}/> Sign out</button></div></section>;
 const google=new GoogleAuthProvider(),apple=new OAuthProvider('apple.com');
 return <section className="auth page"><div className="authcard"><div className="authintro"><p className="eyebrow">MOTODC ACCOUNT</p><h1>{mode==='signin'?<>Welcome <span>back.</span></>:<>Join the <span>ride.</span></>}</h1><p>{mode==='signin'?'Sign in to keep your cart, orders and wishlist connected to your account.':'Create your customer account to shop faster and keep your purchases connected.'}</p></div><div className="authswitch"><button type="button" className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');resetOtp()}}>Sign in</button><button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');resetOtp()}}>Create account</button></div><div className="authsocial"><button onClick={()=>social(google)} disabled={busy}><Chrome size={18}/> Continue with Google</button><button onClick={()=>social(apple)} disabled={busy}><Apple size={19}/> Continue with Apple</button></div><div className="authdivider"><span>or use</span></div><div className="methodswitch"><button type="button" className={method==='email'?'active':''} onClick={()=>{setMethod('email');resetOtp()}}><Mail size={15}/> Email</button><button type="button" className={method==='phone'?'active':''} onClick={()=>{setMethod('phone');resetOtp()}}><Phone size={15}/> Phone</button></div><div id="msg91-captcha" aria-hidden="true"></div>{method==='email'?<form className="authform" onSubmit={submitEmail}>{mode==='signup'&&<label><span>Name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name" required/></div></label>}<label><span>Email</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label><label><span>Password</span><div><Lock size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode==='signin'?'current-password':'new-password'} minLength="6" required/></div></label><button className="heroBtn" disabled={busy}>{busy?(mode==='signin'?'Signing in...':'Creating account...'):(mode==='signin'?'Sign in':'Create account')}<ArrowRight size={17}/></button></form>:needsName?<form className="authform" onSubmit={submitPhoneName}><label><span>Your name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" required autoFocus/></div></label><p className="authhint"><ShieldCheck size={15}/> Mobile verified. Enter your name to create your MotoDC account.</p><button className="heroBtn" disabled={busy}>{busy?'Creating account...':'Continue'}<ArrowRight size={17}/></button></form>:!confirmation?<form className="authform" onSubmit={sendCode}><label><span>Phone number</span><div><Phone size={17}/><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 9876543210" autoComplete="tel" required/></div></label><p className="authhint"><ShieldCheck size={15}/> We'll send a verification code by SMS using MSG91.</p><button className="heroBtn" disabled={busy}>{busy?'Sending code...':'Send verification code'}<ArrowRight size={17}/></button></form>:<form className="authform" onSubmit={verifyCode}><label><span>6-digit verification code</span><div className="otpInputWrap"><ShieldCheck size={17}/><div className="otpBoxes" role="group" aria-label="6-digit verification code" onPaste={handleOtpPaste}>{Array.from({length:6},(_,index)=><input key={index} ref={el=>{otpRefs.current[index]=el}} className="otpBox" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="1" value={otpDigits[index]} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} autoComplete={index===0?'one-time-code':'off'} aria-label={`OTP digit ${index+1}`} disabled={busy}/>)}</div></div></label><p className="authhint">Code sent to <b>{phone}</b></p><button className="heroBtn" disabled={busy}>{busy?'Verifying...':'Verify & continue'}<ArrowRight size={17}/></button><button type="button" className="textBtn" onClick={()=>{setConfirmation(false);setOtpDigits(Array(6).fill(''));setCode('');setReqId('')}}>Use a different number</button></form>}</div></section>;
}
