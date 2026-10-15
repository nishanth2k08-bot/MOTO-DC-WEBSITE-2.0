(function(){
  const STYLE_ID='motodc-auth-page-guard-style';
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='header{display:block!important;visibility:visible!important;opacity:1!important}';
    document.head.appendChild(style);
  }
  function syncAuthPage(){
    installStyle();
  }
  function handleProfileClick(event){
    const button=event.target.closest('.account:not(.accountName)');
    if(!button||window.location.pathname==='/account')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('/account');
  }
  installStyle();
  document.addEventListener('click',handleProfileClick,true);
  document.addEventListener('DOMContentLoaded',syncAuthPage,{once:true});
  new MutationObserver(syncAuthPage).observe(document.documentElement,{childList:true,subtree:true});
  syncAuthPage();
})();
