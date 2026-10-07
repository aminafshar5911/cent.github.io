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
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>25),{passive:true});

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

if(window.matchMedia('(max-width:900px)').matches){
  document.querySelectorAll('.accordion-head').forEach(head=>head.addEventListener('click',()=>{
    const panel=head.nextElementSibling, wasOpen=head.classList.contains('open');
    document.querySelectorAll('.accordion-head.open').forEach(x=>{x.classList.remove('open');x.nextElementSibling.style.maxHeight=null});
    if(!wasOpen){head.classList.add('open');panel.style.maxHeight=panel.scrollHeight+'px'}
  }));
}

const expressionEl=document.getElementById('expression');
const resultEl=document.getElementById('result');
const statusEl=document.getElementById('calcStatus');
const historyList=document.getElementById('historyList');
const keypad=document.getElementById('keypad');
const clearHistoryBtn=document.getElementById('clearHistory');
const faDigits='۰۱۲۳۴۵۶۷۸۹';
let current='0', previous=null, operator=null, waiting=false, expression='';
let history=JSON.parse(localStorage.getItem('hamrah-calculator-history')||'[]');

function toFa(value){return String(value).replace(/\d/g,d=>faDigits[d]);}
function cleanNumber(value){
  if(!Number.isFinite(value)) return null;
  if(Math.abs(value)>1e15) return value.toExponential(8);
  const rounded=Math.round((value+Number.EPSILON)*1e12)/1e12;
  return String(rounded);
}
function displayValue(value){
  if(value===null||value===undefined) return 'خطا';
  const s=String(value); return toFa(s);
}
function updateDisplay(flash=false){
  expressionEl.textContent=expression?toFa(expression):'۰';
  resultEl.textContent=displayValue(current);
  if(flash){resultEl.classList.remove('flash');void resultEl.offsetWidth;resultEl.classList.add('flash')}
}
function setError(){current='خطا';previous=null;operator=null;waiting=true;expression='';statusEl.textContent='ورودی نامعتبر';updateDisplay(true)}
function inputDigit(d){
  if(current==='خطا'||waiting){current=d;waiting=false}else if(current==='0'){current=d}else if(current.length<18){current+=d}
  statusEl.textContent='ورودی'; updateDisplay();
}
function inputDecimal(){
  if(current==='خطا'||waiting){current='0.';waiting=false}else if(!current.includes('.')) current+='.';
  updateDisplay();
}
function toggleSign(){if(current==='خطا')return;current=current.startsWith('-')?current.slice(1):current==='0'?'0':'-'+current;updateDisplay()}
function percent(){if(current==='خطا')return;const n=Number(current);if(!Number.isFinite(n)){setError();return}current=cleanNumber(n/100);updateDisplay(true)}
function backspace(){if(current==='خطا'||waiting)return;if(current.length<=1||current==='-')current='0';else current=current.slice(0,-1);updateDisplay()}
function calculate(a,b,op){a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b))return null;let r;if(op==='+')r=a+b;if(op==='-')r=a-b;if(op==='*')r=a*b;if(op==='/'){if(b===0)return null;r=a/b}return cleanNumber(r)}
function chooseOperator(op){
  if(current==='خطا')return;
  const value=Number(current); if(!Number.isFinite(value)){setError();return}
  if(previous!==null&&operator&&!waiting){const r=calculate(previous,current,operator);if(r===null){setError();return}previous=Number(r);current=r}
  else previous=value;
  operator=op; waiting=true; expression=`${previous} ${op}`; statusEl.textContent='عملیات'; updateDisplay();
}
function equals(){
  if(current==='خطا'||operator===null||previous===null)return;
  const right=waiting?previous:Number(current); const r=calculate(previous,right,operator);
  if(r===null){setError();return}
  const shownExpression=`${previous} ${operator} ${right}`;
  addHistory(shownExpression,r); expression=`${shownExpression} =`; current=r; previous=null;operator=null;waiting=true;statusEl.textContent='نتیجه';updateDisplay(true);
}
function clearAll(){current='0';previous=null;operator=null;waiting=false;expression='';statusEl.textContent='آماده';updateDisplay()}
function saveHistory(){localStorage.setItem('hamrah-calculator-history',JSON.stringify(history))}
function addHistory(expr,res){history.unshift({expr,result:String(res),time:Date.now()});history=history.slice(0,12);saveHistory();renderHistory()}
function renderHistory(){
  if(!history.length){historyList.innerHTML='<div class="empty-history">هنوز محاسبه‌ای ثبت نشده.<br><small>اولین نتیجه‌ات را اینجا نگه می‌داریم.</small></div>';return}
  historyList.innerHTML=history.map((item,i)=>`<button class="history-item" data-history="${i}"><span class="history-expression">${toFa(item.expr)} =</span><span class="history-result">${displayValue(item.result)}</span></button>`).join('');
  historyList.querySelectorAll('.history-item').forEach(btn=>btn.addEventListener('click',()=>{const item=history[Number(btn.dataset.history)];current=item.result;previous=null;operator=null;waiting=true;expression=`${item.expr} =`;statusEl.textContent='از تاریخچه';updateDisplay(true);window.scrollTo({top:document.querySelector('.calculator-shell').offsetTop-100,behavior:'smooth'})}));
}
clearHistoryBtn.addEventListener('click',()=>{history=[];saveHistory();renderHistory()});
keypad.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;btn.classList.add('pressed');setTimeout(()=>btn.classList.remove('pressed'),130);const action=btn.dataset.action,value=btn.dataset.value;if(action==='clear')clearAll();else if(action==='backspace')backspace();else if(action==='percent')percent();else if(action==='sign')toggleSign();else if(action==='operator')chooseOperator(value);else if(action==='equals')equals();else if(value==='.')inputDecimal();else inputDigit(value)});

document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
  const key=e.key;
  if(/\d/.test(key)){inputDigit(key);pressKey(key)}
  else if(key==='.')inputDecimal();
  else if(['+','-','*','/'].includes(key)){chooseOperator(key);pressKey(key)}
  else if(key==='%')percent();
  else if(key==='Enter'||key==='='){e.preventDefault();equals();pressKey('=')}
  else if(key==='Backspace'){backspace();pressKey('⌫')}
  else if(key==='Escape')clearAll();
});
function pressKey(label){const map={'+':'+','-':'−','*':'×','/':'÷','=':'=','⌫':'⌫'};const btn=[...document.querySelectorAll('.key')].find(b=>b.textContent.trim()===map[label]||b.textContent.trim()===label||b.dataset.value===label);if(btn){btn.classList.add('pressed');setTimeout(()=>btn.classList.remove('pressed'),130)}}

renderHistory();updateDisplay();
