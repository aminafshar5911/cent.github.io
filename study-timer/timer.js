const body = document.body;
const header = document.getElementById('siteHeader');
const menu = document.getElementById('megaMenu');
const overlay = document.getElementById('megaOverlay');
const menuButton = document.getElementById('menuButton');
const menuTrigger = document.querySelector('.menu-trigger');
const closeMenu = document.getElementById('closeMenu');

function setMenu(open){
  menu.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
  body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuTrigger.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
}
menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menuTrigger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
closeMenu.addEventListener('click', () => setMenu(false));
overlay.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', e => { if(e.key === 'Escape') setMenu(false); });
document.querySelectorAll('.mega-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 30), {passive:true});

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if(entry.isIntersecting){ entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
}), {threshold:.12});
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

if(window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
      if(Math.hypot(dx,dy) < 120) btn.style.transform = `translate(${dx*.06}px,${dy*.06}px)`;
    });
    btn.addEventListener('pointerleave', () => btn.style.transform = '');
  });
}

if(window.matchMedia('(max-width:900px)').matches){
  document.querySelectorAll('.accordion-head').forEach(head => head.addEventListener('click', () => {
    const panel = head.nextElementSibling, wasOpen = head.classList.contains('open');
    document.querySelectorAll('.accordion-head.open').forEach(x => { x.classList.remove('open'); x.nextElementSibling.style.maxHeight = null; });
    if(!wasOpen){ head.classList.add('open'); panel.style.maxHeight = panel.scrollHeight + 'px'; }
  }));
}

const STORAGE = 'hamrah-study-timer-v1';
const defaults = { settings:{study:25, short:5, long:15, feedback:false}, sessionsToday:3, focusSeconds:6300, history:[] };
const modeConfig = { study:{label:'مطالعه'}, short:{label:'استراحت کوتاه'}, long:{label:'استراحت بلند'} };
let state = loadState();
let mode = 'study';
let running = false;
let endAt = 0;
let remainingSeconds = state.settings.study * 60;
let startedSeconds = remainingSeconds;
let completedSession = false;
let rafId = null;

const $ = id => document.getElementById(id);
const display = $('timerDisplay'), ring = $('timerRing'), status = $('timerStatus'), modeLabel = $('timerModeLabel');
const startPause = $('startPause'), startPauseText = $('startPauseText');
const elapsed = $('elapsedTime'), remaining = $('remainingTime'), statusReadout = $('statusReadout');
const sessionNumber = $('sessionNumber'), sessionsToday = $('sessionsToday'), focusToday = $('focusToday'), focusMinutesToday = $('focusMinutesToday'), completedToday = $('completedToday');
const historyEl = $('sessionHistory');

function loadState(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORAGE));
    if(!raw) return structuredClone(defaults);
    return {
      settings:{...defaults.settings, ...(raw.settings || {})},
      sessionsToday:Number.isFinite(raw.sessionsToday) ? raw.sessionsToday : defaults.sessionsToday,
      focusSeconds:Number.isFinite(raw.focusSeconds) ? raw.focusSeconds : defaults.focusSeconds,
      history:Array.isArray(raw.history) ? raw.history.slice(0,20) : []
    };
  }catch{return structuredClone(defaults)}
}
function saveState(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function toFa(value){ return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
function formatTime(seconds){
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe/3600), m = Math.floor((safe%3600)/60), s = safe%60;
  if(h > 0) return toFa(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  return toFa(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
}
function minutesValue(input){ const n = Number.parseInt(input.value,10); return Number.isFinite(n) ? Math.min(180,Math.max(1,n)) : null; }
function setStatus(text){ status.textContent=text; statusReadout.textContent=text; }
function updateSessionLabel(){ sessionNumber.textContent=toFa(String(Math.min(99,state.sessionsToday+1)).padStart(2,'0')); }
function renderStats(){
  sessionsToday.textContent=toFa(String(state.sessionsToday).padStart(2,'0'));
  focusMinutesToday.textContent=toFa(String(Math.floor(state.focusSeconds/60)));
  focusToday.textContent=formatTime(state.focusSeconds);
  completedToday.textContent=`${toFa(state.sessionsToday)} جلسه کامل`;
  updateSessionLabel();
}
function render(){
  display.textContent=formatTime(remainingSeconds);
  remaining.textContent=formatTime(remainingSeconds);
  elapsed.textContent=formatTime(Math.max(0, startedSeconds - remainingSeconds));
  const progress = startedSeconds > 0 ? Math.min(100, Math.max(0, ((startedSeconds-remainingSeconds)/startedSeconds)*100)) : 0;
  ring.style.setProperty('--progress', `${progress}%`);
  modeLabel.textContent=modeConfig[mode].label;
  document.querySelectorAll('.mode-button').forEach(btn => {
    const active=btn.dataset.mode===mode; btn.classList.toggle('active',active); btn.setAttribute('aria-selected',String(active));
  });
  startPauseText.textContent=running?'توقف':(remainingSeconds<startedSeconds?'ادامه':'شروع');
  body.classList.toggle('timer-running',running);
  renderStats();
}
function setMode(nextMode, reset=true){
  if(!modeConfig[nextMode]) return;
  if(running) pauseTimer();
  mode=nextMode;
  const minutes=state.settings[nextMode];
  remainingSeconds=minutes*60; startedSeconds=remainingSeconds; completedSession=false;
  body.classList.remove('timer-complete'); setStatus('آماده');
  if(reset) render();
}
function startTimer(){
  if(running || remainingSeconds<=0) return;
  running=true; endAt=performance.now()+remainingSeconds*1000; setStatus('در حال '+modeConfig[mode].label); render(); tick();
}
function pauseTimer(){
  if(!running) return;
  remainingSeconds=Math.max(0, Math.ceil((endAt-performance.now())/1000)); running=false; setStatus('متوقف'); render();
}
function resetTimer(){
  running=false; remainingSeconds=state.settings[mode]*60; startedSeconds=remainingSeconds; completedSession=false; body.classList.remove('timer-complete'); setStatus('آماده'); render();
}
function skipTimer(){
  if(running) pauseTimer();
  const next = mode === 'study' ? 'short' : (mode === 'short' ? 'long' : 'study');
  setMode(next);
  setStatus('مرحله بعد');
  render();
}
function tick(){
  if(!running) return;
  const left=Math.max(0,Math.ceil((endAt-performance.now())/1000));
  remainingSeconds=left; render();
  if(left<=0){ running=false; finishMode(false); return; }
  rafId=requestAnimationFrame(tick);
}
function finishMode(skipped){
  running=false; completedSession=!skipped && remainingSeconds<=0;
  if(completedSession){
    const duration=startedSeconds;
    const now=new Date();
    state.history.unshift({duration,mode,completed:true,time:now.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})});
    state.history=state.history.slice(0,20);
    if(mode==='study'){ state.sessionsToday+=1; state.focusSeconds+=duration; }
    saveState();
  }
  remainingSeconds=0; setStatus(skipped?'مرحله رد شد':'مرحله تمام شد'); body.classList.add('timer-complete'); render();
  if(state.settings.feedback) feedback();
}
function feedback(){
  if('vibrate' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate([30,20,30]);
}
function renderHistory(){
  if(!state.history.length){ historyEl.innerHTML='<div class="history-empty">هنوز جلسه‌ای ثبت نشده است. اولین جلسه را شروع کن.</div>'; return; }
  historyEl.innerHTML=state.history.map((item,index)=>`<button class="history-item" type="button" data-index="${index}" aria-label="${modeConfig[item.mode].label}، ${formatTime(item.duration)}"><span class="history-no">${toFa(String(index+1).padStart(2,'0'))}</span><span class="history-main"><strong>${formatTime(item.duration)}</strong><span>${modeConfig[item.mode].label} — ${item.completed?'کامل شد':'ثبت شد'}</span></span><time>${item.time||''}</time></button>`).join('');
  historyEl.querySelectorAll('.history-item').forEach(btn=>btn.addEventListener('click',()=>{
    const item=state.history[Number(btn.dataset.index)]; if(item) setMode(item.mode);
    window.scrollTo({top:document.querySelector('.focus-instrument').offsetTop-80,behavior:'smooth'});
  }));
}

document.querySelectorAll('.mode-button').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
startPause.addEventListener('click',()=>running?pauseTimer():startTimer());
$('resetTimer').addEventListener('click',resetTimer);
$('skipTimer').addEventListener('click',skipTimer);
$('clearHistory').addEventListener('click',()=>{state.history=[];saveState();renderHistory();});

['study','short','long'].forEach(key=>{
  const input=$(key+'Minutes'); input.value=state.settings[key];
  input.addEventListener('change',()=>{
    const value=minutesValue(input);
    if(value===null){ input.value=state.settings[key]; $('settingNote').textContent='یک عدد معتبر بین ۱ تا ۱۸۰ دقیقه وارد کن.'; return; }
    state.settings[key]=value; input.value=value; saveState();
    if(key===mode && !running) setMode(mode); else $('settingNote').textContent='تنظیمات ذخیره شد.';
  });
});
$('feedbackToggle').addEventListener('click',()=>{
  state.settings.feedback=!state.settings.feedback; saveState();
  const el=$('feedbackToggle'); el.setAttribute('aria-checked',String(state.settings.feedback)); el.querySelector('b').textContent=state.settings.feedback?'روشن':'خاموش';
});
$('feedbackToggle').setAttribute('aria-checked',String(state.settings.feedback)); $('feedbackToggle').querySelector('b').textContent=state.settings.feedback?'روشن':'خاموش';

document.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
  if(e.code==='Space'){e.preventDefault(); running?pauseTimer():startTimer();}
  else if(e.key.toLowerCase()==='r'){e.preventDefault();resetTimer();}
  else if(e.key.toLowerCase()==='s'){e.preventDefault();skipTimer();}
});

renderStats(); render(); renderHistory();
