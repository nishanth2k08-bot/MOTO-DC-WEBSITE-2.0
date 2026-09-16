(function(){
  const STYLE_ID='motodc-auth-page-guard-style';
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='html.motodc-auth-only header,html.motodc-auth-only footer{display:none!important}';
    document.head.appendChild(style);
  }
  function syncAuthPage(){
    installStyle();
    const isAccount=window.location.pathname==='/account';
    const signedInAccount=!!document.querySelector('#root .accountcard');
    document.documentElement.classList.toggle('motodc-auth-only',isAccount&&!signedInAccount);
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
