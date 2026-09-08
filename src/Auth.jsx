import React,{useEffect,useState} from 'react';
import {createUserWithEmailAndPassword,onAuthStateChanged,signInWithEmailAndPassword,signOut,updateProfile} from 'firebase/auth';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {User,Mail,Lock,LogOut,ArrowRight} from 'lucide-react';
import {toast} from 'react-hot-toast';
import {auth,db} from './firebase';
import './auth.css';

export default function Auth(){
 const [user,setUser]=useState(null),[checking,setChecking]=useState(true),[mode,setMode]=useState('signin'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setChecking(false)}),[]);
 async function submit(e){
  e.preventDefault();
  if(password.length<6){toast.error('Password must be at least 6 characters');return}
  setBusy(true);
  try{
   if(mode==='signup'){
    if(!name.trim()){toast.error('Please enter your name');return}
    const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);
    await updateProfile(cred.user,{displayName:name.trim()});
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,name:name.trim(),email:email.trim(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
    toast.success('Account created successfully');
   }else{
    await signInWithEmailAndPassword(auth,email.trim(),password);
    const u=auth.currentUser;
    const snap=await getDoc(doc(db,'users',u.uid));
    if(!snap.exists()) await setDoc(doc(db,'users',u.uid),{uid:u.uid,name:u.displayName||'',email:u.email||email.trim(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});
    toast.success('Welcome back');
   }
   setPassword('');
  }catch(e){
   console.error(e);
   const messages={
    'auth/email-already-in-use':'An account with this email already exists',
    'auth/invalid-email':'Please enter a valid email address',
    'auth/invalid-credential':'Invalid email or password',
    'auth/weak-password':'Password is too weak',
    'auth/network-request-failed':'Network error. Please try again'
   };
   toast.error(messages[e.code]||e.message||'Authentication failed');
  }finally{setBusy(false)}
 }
 async function logout(){try{await signOut(auth);toast.success('Signed out')}catch(e){toast.error('Could not sign out')}}
 if(checking)return <section className="auth page"><div className="authcard"><p>Loading account...</p></div></section>;
 if(user)return <section className="auth page"><div className="accountcard"><div className="accounticon"><User size={30}/></div><p className="eyebrow">MOTODC ACCOUNT</p><h1>Welcome, <span>{user.displayName||'Rider'}.</span></h1><p className="accountmuted">Your customer account is connected to Firebase.</p><div className="accountinfo"><div><small>Name</small><b>{user.displayName||'Not set'}</b></div><div><small>Email</small><b>{user.email}</b></div></div><button className="heroBtn" onClick={logout}><LogOut size={17}/> Sign out</button></div></section>;
 return <section className="auth page"><div className="authcard"><div className="authintro"><p className="eyebrow">MOTODC ACCOUNT</p><h1>{mode==='signin'?<>Welcome <span>back.</span></>:<>Join the <span>ride.</span></>}</h1><p>{mode==='signin'?'Sign in to keep your cart, orders and wishlist connected to your account.':'Create your customer account to shop faster and keep your purchases connected.'}</p></div><div className="authswitch"><button className={mode==='signin'?'active':''} onClick={()=>setMode('signin')}>Sign in</button><button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Create account</button></div><form className="authform" onSubmit={submit}>{mode==='signup'&&<label><span>Name</span><div><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" autoComplete="name" required/></div></label>}<label><span>Email</span><div><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label><label><span>Password</span><div><Lock size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode==='signin'?'current-password':'new-password'} minLength="6" required/></div></label><button className="heroBtn" disabled={busy}>{busy?(mode==='signin'?'Signing in...':'Creating account...'):(mode==='signin'?'Sign in':'Create account')}<ArrowRight size={17}/></button></form></div></section>;
}
