import React,{useEffect,useRef,useState} from 'react';
import {collection,deleteDoc,doc,getDocs,addDoc,updateDoc,getDoc} from 'firebase/firestore';
import {onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {adminAuth,adminDb,adminStorage} from './firebase';
import AdminOrders from './AdminOrders';
import {Plus,Trash2,LogOut,Edit3,X,Package,Upload,LayoutDashboard,ShoppingCart} from 'lucide-react';
import {toast} from 'react-hot-toast';
import {majorSpareProducts} from './major-spares';
import './admin.css';

const empty={name:'',category:'Automobile',brand:'',fitment:'',price:'',rating:'5',stock:'0',image:'',description:''};
const num=v=>Number(v||0);

const CLOUDINARY_CLOUD_NAME=import.meta.env.VITE_CLOUDINARY_CLOUD_NAME||'';
const CLOUDINARY_UPLOAD_PRESET=import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET||'';

function optimizeImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    const cleanup=()=>URL.revokeObjectURL(url);
    img.onload=()=>{
      try{
        const max=1600;
        const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
        const w=Math.max(1,Math.round(img.naturalWidth*scale));
        const h=Math.max(1,Math.round(img.naturalHeight*scale));
        const canvas=document.createElement('canvas');
        canvas.width=w;
        canvas.height=h;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Could not prepare image canvas');
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(img,0,0,w,h);
        canvas.toBlob(blob=>{
          cleanup();
          if(!blob)return reject(new Error('Could not optimize image'));
          resolve(blob);
        },'image/webp',0.88);
      }catch(e){
        cleanup();
        reject(e);
      }
    };
    img.onerror=()=>{
      cleanup();
      reject(new Error('Invalid image'));
    };
    img.src=url;
  });
}

function uploadToCloudinary(file,onProgress){
  return new Promise((resolve,reject)=>{
    if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_UPLOAD_PRESET){
      reject(Object.assign(new Error('Cloudinary is not configured yet. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in Vercel settings.'),{code:'cloudinary/not-configured'}));
      return;
    }
    const xhr=new XMLHttpRequest();
    const endpoint=`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME.trim())}/image/upload`;
    xhr.open('POST',endpoint,true);
    xhr.upload.onprogress=event=>{
      if(event.lengthComputable)onProgress?.(Math.round((event.loaded/event.total)*100));
    };
    xhr.onerror=()=>reject(Object.assign(new Error('Network error: could not connect to Cloudinary'),{code:'cloudinary/network'}));
    xhr.onabort=()=>reject(Object.assign(new Error('Upload canceled'),{code:'cloudinary/canceled'}));
    xhr.onload=()=>{
      let data={};
      try{data=xhr.responseText?JSON.parse(xhr.responseText):{}}catch{}
      if(xhr.status>=200&&xhr.status<300&&data.secure_url){
        resolve(data.secure_url);
        return;
      }
      let message=data.error?.message||`Cloudinary upload failed (HTTP ${xhr.status})`;
      if(message.toLowerCase().includes('upload preset must be unsigned')){
        message="Cloudinary preset must be 'Unsigned'. In Cloudinary Settings > Upload > Edit Preset, change Signing Mode to Unsigned.";
      }else if(message.toLowerCase().includes('cloud name not found')||xhr.status===404){
        message=`Cloudinary cloud name '${CLOUDINARY_CLOUD_NAME}' was not found. Please verify VITE_CLOUDINARY_CLOUD_NAME.`;
      }
      reject(Object.assign(new Error(message),{code:'cloudinary/upload-failed',status:xhr.status}));
    };
    const formData=new FormData();
    formData.append('file',file);
    formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET.trim());
    formData.append('folder','motodc/products');
    xhr.send(formData);
  });
}

export default function Admin(){
 const fileInputRef=useRef(null); const [user,setUser]=useState(null),[checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[loginBusy,setLoginBusy]=useState(false),[products,setProducts]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[uploadProgress,setUploadProgress]=useState(0),[bulkImporting,setBulkImporting]=useState(false),[activeTab,setActiveTab]=useState('dashboard');
 const handleTabChange=t=>{setActiveTab(t);try{localStorage.setItem('motodc-admin-tab',t)}catch{}};
 useEffect(()=>onAuthStateChanged(adminAuth,async u=>{setUser(u);setAllowed(false);if(!u){setChecking(false);return}try{const snap=await getDoc(doc(adminDb,'admins',u.uid));setAllowed(snap.exists());setActiveTab('dashboard');try{localStorage.setItem('motodc-admin-tab','dashboard')}catch{}}catch(e){console.error(e);toast.error('Could not verify admin access')}finally{setChecking(false)}}),[]);
 useEffect(()=>{if(allowed)loadProducts()},[allowed]);
 async function loadProducts(){try{const snap=await getDocs(collection(adminDb,'products'));setProducts(snap.docs.map(d=>({id:d.id,...d.data()})))}catch(e){console.error(e);toast.error(e.code==='permission-denied'?'Admin permissions are not enabled yet':'Could not load products')}}
 async function login(e){e.preventDefault();setLoginBusy(true);try{await signInWithEmailAndPassword(adminAuth,email,password);setActiveTab('dashboard');try{localStorage.setItem('motodc-admin-tab','dashboard')}catch{};toast.success('Admin signed in')}catch(e){toast.error(e.code==='auth/invalid-credential'?'Invalid email or password':e.message)}finally{setLoginBusy(false)}}
 function edit(p){setEditing(p.id);setForm({name:p.name||'',category:p.category||'Automobile',brand:p.brand||'',fitment:p.fitment||'',price:String(p.price??''),rating:String(p.rating??''),stock:String(p.stock??''),image:p.image||'',description:p.description||''});window.scrollTo({top:0,behavior:'smooth'})}
 function reset(){setEditing(null);setForm(empty);setUploadProgress(0)}
 async function uploadImage(e){
   const input=e.currentTarget;
   const file=input.files?.[0];
   input.value='';
   if(!file)return;
   if(!file.type.startsWith('image/')){
     toast.error('Please choose an image file');
     return;
   }
   if(file.size>20*1024*1024){
     toast.error('Image must be smaller than 20 MB');
     return;
   }
   setUploading(true);
   setUploadProgress(0);
   try{
     toast.loading('Optimizing image...',{id:'product-upload'});
     let optimized;
     try{
       optimized=await optimizeImage(file);
     }catch(optError){
       console.warn('Image optimization failed; uploading original file:',optError);
       optimized=file;
     }
     toast.loading('Uploading image... 0%',{id:'product-upload'});
     const url=await uploadToCloudinary(optimized,p=>{
       setUploadProgress(p);
       toast.loading(`Uploading image... ${p}%`,{id:'product-upload'});
     });
     setForm(f=>({...f,image:url}));
     toast.success('Image uploaded. Click Save product to apply it.',{id:'product-upload'});
   }catch(e){
     console.error('Product image upload error:',e);
     const code=e?.code||'';
     const msg=
       code==='cloudinary/not-configured'
         ?'Image storage is not configured. Add the Cloudinary cloud name and unsigned upload preset in Vercel.'
         :code==='cloudinary/canceled'
           ?'Upload canceled. Please try again.'
           :code==='cloudinary/network'
             ?'Could not reach the image server. Check your internet connection.'
             :(e?.message||'Image upload failed. Please try again.');
     toast.error(msg,{id:'product-upload'});
   }finally{
     setUploading(false);
   }
 }
 async function save(e){e.preventDefault();if(!form.name.trim()||form.price===''||!form.image.trim()){toast.error('Name, price and product image are required');return}setSaving(true);const payload={name:form.name.trim(),category:form.category,brand:form.brand.trim(),fitment:form.fitment.trim(),price:num(form.price),rating:num(form.rating),stock:num(form.stock),image:form.image.trim(),description:form.description.trim()};try{if(editing)await updateDoc(doc(adminDb,'products',editing),payload);else await addDoc(collection(adminDb,'products'),payload);toast.success(editing?'Product updated':'Product added');reset();await loadProducts()}catch(e){console.error(e);toast.error('Save failed. Check Firebase admin rules.')}finally{setSaving(false)}}
 async function importMajorSpares(){if(bulkImporting)return;setBulkImporting(true);try{const existing=await getDocs(collection(adminDb,'products'));const existingNames=new Set(existing.docs.map(d=>String(d.data().name||'').trim().toLowerCase()));const missing=majorSpareProducts.filter(p=>!existingNames.has(p.name.toLowerCase()));if(!missing.length){toast.success('All major spare products are already in the catalog');return}let added=0;for(let i=0;i<missing.length;i+=10){const batch=missing.slice(i,i+10);await Promise.all(batch.map(p=>addDoc(collection(adminDb,'products'),{...p,rating:Number(Number(p.rating).toFixed(1)),price:Number(p.price),stock:Number(p.stock),catalogSource:'MotoDC major-spares seed'})));added+=batch.length;await loadProducts()}toast.success(`${added} major spare products added`)}catch(e){console.error(e);toast.error('Bulk import stopped. Check Firebase admin rules and try again.')}finally{setBulkImporting(false)}}
 async function remove(id){if(!confirm('Delete this product permanently?'))return;try{await deleteDoc(doc(adminDb,'products',id));setProducts(p=>p.filter(x=>x.id!==id));toast.success('Product deleted')}catch(e){console.error(e);toast.error('Delete failed. Check Firebase admin rules')}}
 if(checking)return <section className="admin page"><div className="empty">Checking admin access...</div></section>;
 if(!user)return <section className="admin page"><div className="adminlogin"><p className="eyebrow">MOTODC ADMIN</p><h1>Admin <span>login.</span></h1><p>Sign in with your Firebase Authentication account.</p><form onSubmit={login}><input type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="heroBtn" disabled={loginBusy}>{loginBusy?'Signing in...':'Sign in'}</button></form></div></section>;
 if(!allowed)return <section className="admin page"><div className="empty"><div><h2>Admin access not granted</h2><p>Your signed-in Firebase admin user does not have an <b>admins/{user.uid}</b> document.</p><button className="heroBtn" onClick={()=>signOut(adminAuth)}>Sign out</button></div></div></section>;
  return (
    <section className="admin page">
      <div className="adminhead">
        <div>
          <p className="eyebrow">MOTODC CONTROL CENTER</p>
          {activeTab==='dashboard'&&(
            <>
              <h1>Admin <span>dashboard.</span></h1>
              <p className="adminSubtitle">Live business performance, sales analytics, and customer activity.</p>
            </>
          )}
          {activeTab==='products'&&(
            <>
              <h1>Product <span>manager.</span></h1>
              <p className="adminSubtitle">Add, edit, or manage products and inventory stock levels.</p>
            </>
          )}
          {activeTab==='orders'&&(
            <>
              <h1>Customer <span>orders.</span></h1>
              <p className="adminSubtitle">Review customer orders, update tracking status, and handle returns.</p>
            </>
          )}
        </div>
        <button className="adminsignout" onClick={()=>signOut(adminAuth)}><LogOut size={16}/> Sign out</button>
      </div>

      <div className="adminSectionNav" role="tablist" aria-label="Admin Navigation">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab==='dashboard'}
          className={activeTab==='dashboard'?'active':''}
          onClick={()=>handleTabChange('dashboard')}
        >
          <LayoutDashboard size={15}/> Admin Dashboard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab==='products'}
          className={activeTab==='products'?'active':''}
          onClick={()=>handleTabChange('products')}
        >
          <Package size={15}/> Product Manager
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab==='orders'}
          className={activeTab==='orders'?'active':''}
          onClick={()=>handleTabChange('orders')}
        >
          <ShoppingCart size={15}/> Customer's Orders
        </button>
      </div>

      {activeTab==='products'&&(
        <div className="adminlayout">
          <form className="adminform" onSubmit={save}>
            <div className="formtitle">
              <h2>{editing?'Edit product':'Add product'}</h2>
              {editing&&<button type="button" onClick={reset}><X size={17}/></button>}
            </div>
            <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Product name"/></label>
            <label>Brand<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="Brand"/></label>
            <label>Vehicle / fitment<input value={form.fitment} onChange={e=>setForm({...form,fitment:e.target.value})} placeholder="Compatible model or vehicle"/></label>
            <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Automobile</option><option>Motorcycle</option></select></label>
            <div className="formrow">
              <label>Price (₹)<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
              <label>Rating<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}/></label>
            </div>
            <label>Stock<input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label>
            <div className="adminupload">
              <label>Product image</label>
              <div className="adminuploadBtnRow">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadImage} disabled={uploading}/>
                <button type="button" className="seedBtn" disabled={uploading} onClick={e=>{e.preventDefault();e.stopPropagation();fileInputRef.current?.click()}}>
                  <Upload size={15}/>{uploading?`Uploading ${uploadProgress}%`:'Choose image file'}
                </button>
                {form.image&&(
                  <button type="button" className="adminsignout" style={{padding:'7px 11px',fontSize:'11px'}} onClick={()=>setForm(f=>({...f,image:''}))}>
                    Remove image
                  </button>
                )}
              </div>

              <label style={{marginTop:'4px'}}>
                <span>Or paste image URL</span>
                <input
                  value={form.image}
                  onChange={e=>setForm({...form,image:e.target.value})}
                  placeholder="https://... (or choose image file above)"
                />
              </label>

              {form.image&&(
                <img
                  className="adminimagepreview"
                  src={form.image}
                  alt="Product preview"
                  onError={e=>{e.currentTarget.style.display='none'}}
                />
              )}
            </div>
            <label>Description<textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Product description"/></label>
            <button className="heroBtn" disabled={saving||uploading}>
              {saving?'Saving...':editing?'Update product':<><Plus size={17}/> Add product</>}
            </button>
          </form>
          <div className="adminlist">
            <div className="listhead">
              <h2><Package size={20}/> Products</h2>
              <div className="listactions">
                <b>{products.length}</b>
              </div>
            </div>
            {products.map(p=>(
              <div className="adminproduct" key={p.id}>
                <img src={p.image} alt=""/>
                <div>
                  <h3>{p.name}</h3>
                  <small>{p.brand?`${p.brand} · `:''}{p.category} · ₹{num(p.price).toLocaleString('en-IN')} · {p.rating?`${p.rating}★ · `:''}{p.stock} stock</small>
                  {p.fitment&&<small className="fitment">Fits: {p.fitment}</small>}
                </div>
                <button onClick={()=>edit(p)} title="Edit"><Edit3 size={16}/></button>
                <button className="delete" onClick={()=>remove(p.id)} title="Delete"><Trash2 size={16}/></button>
              </div>
            ))}
            {!products.length&&<div className="empty">No products yet.</div>}
          </div>
        </div>
      )}

      <AdminOrders activeTab={activeTab}/>
    </section>
  );
}