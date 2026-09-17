(function(){
  const CUSTOMER_KEY='motodc-theme';
  const ADMIN_KEY='motodc-theme-admin';
  const isAdmin=()=>location.pathname==='/admin';
  const themeKey=()=>isAdmin()?ADMIN_KEY:CUSTOMER_KEY;
  const nativeGet=Storage.prototype.getItem;
  const nativeSet=Storage.prototype.setItem;

  if(!window.__motodcThemeIsolation){
    Storage.prototype.getItem=function(name){
      return name==='motodc-theme'
        ? nativeGet.call(this,themeKey())
        : nativeGet.call(this,name);
    };
    Storage.prototype.setItem=function(name,value){
      return name==='motodc-theme'
        ? nativeSet.call(this,themeKey(),value)
        : nativeSet.call(this,name,value);
    };
    window.__motodcThemeIsolation=true;
  }

  function applyTheme(){
    const theme=localStorage.getItem('motodc-theme')||'dark';
    document.documentElement.classList.toggle('light-theme',theme==='light');
    if(document.body) document.body.classList.toggle('light-theme',theme==='light');
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded',applyTheme,{once:true});

  const originalPushState=history.pushState;
  history.pushState=function(state,title,url){
    const wasAdmin=isAdmin();
    const result=originalPushState.apply(this,arguments);
    const nowAdmin=isAdmin();
    if(wasAdmin!==nowAdmin){
      location.reload();
      return result;
    }
    applyTheme();
    return result;
  };

  window.addEventListener('popstate',function(){
    location.reload();
  });
})();
