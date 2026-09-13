(()=>{
const src='/526c5913-c066-4959-be22-11908d3a7375.jpg';
function fix(){const img=document.querySelector('.heroBackgroundImage');if(!img)return setTimeout(fix,100);img.src=src;img.removeAttribute('alt');img.style.objectFit='cover';img.style.objectPosition='center center';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();
})();
