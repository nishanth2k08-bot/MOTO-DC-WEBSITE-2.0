(function(){
  const CUSTOMER_KEY='motodc-theme';
  const ADMIN_KEY='motodc-theme-admin';
  const HUB_KEY='motodc-theme-hub';
  const PARTNER_KEY='motodc-theme-partner';

  const isHub=()=>location.pathname.startsWith('/hub');
  const isPartner=()=>location.pathname.startsWith('/partner');
  const isAdmin=()=>location.pathname==='/admin';

  const themeKey=()=>{
    if(isHub()) return HUB_KEY;
    if(isPartner()) return PARTNER_KEY;
    if(isAdmin()) return ADMIN_KEY;
    return CUSTOMER_KEY;
  };

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
    const currentKey = themeKey();
    const theme = nativeGet.call(localStorage, currentKey) || 'dark';
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    if (document.body) document.body.classList.toggle('light-theme', theme === 'light');
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', applyTheme, { once: true });

  const originalPushState = history.pushState;
  history.pushState = function(state, title, url){
    const prevKey = themeKey();
    const result = originalPushState.apply(this, arguments);
    const nextKey = themeKey();
    if (prevKey !== nextKey) {
      applyTheme();
      window.dispatchEvent(new CustomEvent('motodc:theme-change', { detail: { key: nextKey, theme: nativeGet.call(localStorage, nextKey) || 'dark' } }));
    }
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function(state, title, url){
    const prevKey = themeKey();
    const result = originalReplaceState.apply(this, arguments);
    const nextKey = themeKey();
    if (prevKey !== nextKey) {
      applyTheme();
      window.dispatchEvent(new CustomEvent('motodc:theme-change', { detail: { key: nextKey, theme: nativeGet.call(localStorage, nextKey) || 'dark' } }));
    }
    return result;
  };

  window.addEventListener('popstate', function(){
    applyTheme();
    window.dispatchEvent(new CustomEvent('motodc:theme-change', { detail: { key: themeKey(), theme: nativeGet.call(localStorage, themeKey()) || 'dark' } }));
  });
})();
