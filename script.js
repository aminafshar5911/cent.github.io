const body=document.body;
const header=document.getElementById('siteHeader');
const menu=document.getElementById('megaMenu');
const overlay=document.getElementById('megaOverlay');
const menuButton=document.getElementById('menuButton');
const menuTrigger=document.querySelector('.menu-trigger');
const closeMenu=document.getElementById('closeMenu');

function setMenu(open){
  menu.classList.toggle('open',open); overlay.classList.toggle('open',open); body.classList.toggle('menu-open',open);
  menuButton.setAttribute('aria-expanded',String(open)); menuTrigger.setAttribute('aria-expanded',String(open)); menu.setAttribute('aria-hidden',String(!open));
}
menuButton.addEventListener('click',()=>setMenu(!menu.classList.contains('open')));
menuTrigger.addEventListener('click',()=>setMenu(!menu.classList.contains('open')));
closeMenu.addEventListener('click',()=>setMenu(false));
overlay.addEventListener('click',()=>setMenu(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
document.querySelectorAll('.mega-menu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));

window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>30),{passive:true});

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal,.line-reveal').forEach(el=>revealObserver.observe(el));

const orbs=document.querySelectorAll('[data-depth]');
if(window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  window.addEventListener('pointermove',e=>{
    const x=(e.clientX/window.innerWidth-.5), y=(e.clientY/window.innerHeight-.5);
    orbs.forEach(el=>{const d=Number(el.dataset.depth);el.style.transform=`translate(${x*35*d}px,${y*35*d}px)`});
    document.querySelectorAll('.magnetic').forEach(btn=>{const r=btn.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);if(Math.hypot(dx,dy)<110)btn.style.transform=`translate(${dx*.08}px,${dy*.08}px)`;else btn.style.transform=''})
  });
  document.querySelectorAll('.magnetic').forEach(btn=>btn.addEventListener('mouseleave',()=>btn.style.transform=''));
}

const toolDetail=document.getElementById('toolDetail');
const descriptions={
 'ماشین حساب':'یک محاسبه‌ی دقیق، بدون حاشیه.','تبدیل واحد':'سانتی‌متر، کیلوگرم، دما و بیشتر.','تایمر':'زمان را برای خودت به بخش‌های روشن تقسیم کن.','یادداشت':'فکرهایت را همان لحظه ثبت کن.','رنگ':'رنگ‌ها را ساده‌تر و دقیق‌تر بررسی کن.','معدل':'نمره‌ها را وارد کن؛ نتیجه را ببین.'
};
document.querySelectorAll('.tool-orbit').forEach(item=>item.addEventListener('click',()=>{
 document.querySelectorAll('.tool-orbit').forEach(x=>x.classList.remove('active-tool')); item.classList.add('active-tool');
 const name=item.dataset.tool; toolDetail.querySelector('strong').textContent=name; toolDetail.querySelector('p').textContent=descriptions[name];
}));

// Mobile accordion
if(window.matchMedia('(max-width:900px)').matches){
 document.querySelectorAll('.accordion-head').forEach(head=>head.addEventListener('click',()=>{
   const panel=head.nextElementSibling, wasOpen=head.classList.contains('open');
   document.querySelectorAll('.accordion-head.open').forEach(x=>{x.classList.remove('open');x.nextElementSibling.style.maxHeight=null});
   if(!wasOpen){head.classList.add('open');panel.style.maxHeight=panel.scrollHeight+'px'}
 }));
}

// Gentle horizontal reveal for feature blocks based on scroll position.
const featureItems=[...document.querySelectorAll('.feature-item')];
const featureObserver=new IntersectionObserver(entries=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,delay:featureItems.indexOf(entry.target)%3*70,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});featureObserver.unobserve(entry.target)}}),{threshold:.08});
featureItems.forEach(x=>featureObserver.observe(x));
