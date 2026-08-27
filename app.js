/* BIFOR 2026 App */
const STORAGE_KEY = 'bifor_data_v2';

let state = {
  currentUser: null,
  users: [],
  quizzes: [],
  timer: null,
  timeLeft: 15,
  currentQuiz: null,
  currentQIndex: 0,
  liveScore: 0,
  editingQuizId: null,
  quizPlays: {},
  live: { onlineHistory: [], respondingHistory: [], feed: [], lastResponsesPerMin: 0 }
};
const CONFIG_KEY='bifor_config_v1';
let config={ soundEnabled:true, musicEnabled:true, sfxEnabled:true, volume:40, fontScale:100, animations:true, theme:'dark' };
let audioCtx=null, bgOscNodes=[], musicPlaying=false;

const defaultQuizzes = [
  {
    id: 'q1',
    title: 'Innovación BIFOR',
    desc: '¿Cuánto sabes de innovación que transforma?',
    preguntas: [
      { pregunta: '¿En qué ciudad se celebra BIFOR 2026?', opciones:['Medellín','Manizales','Bogotá','Cali'], correcta:1 },
      { pregunta: '¿Qué significa el lema "Innovación que Transforma"?', opciones:['Solo tecnología','Cambios sostenibles con impacto real','Marketing digital','Ninguna anterior'], correcta:1 },
      { pregunta: '¿Cuántos días dura BIFOR 2026?', opciones:['1 día','2 días','3 días','5 días'], correcta:2 },
      { pregunta: 'BIFOR apuesta por:', opciones:['Innovación + Sostenibilidad','Solo finanzas','Entretenimiento','Deportes'], correcta:0 }
    ]
  },
  {
    id: 'q2',
    title: 'Sostenibilidad y Futuro',
    desc: 'Reto verde - responde rápido',
    preguntas: [
      { pregunta: '¿Cuál es un pilar de la sostenibilidad?', opciones:['Economía','Ambiente','Sociedad','Todas'], correcta:3 },
      { pregunta: 'Economía circular busca:', opciones:['Usar y desechar','Reutilizar y reciclar','Solo producir más','Exportar residuos'], correcta:1 },
      { pregunta: 'Manizales es conocida como:', opciones:['Ciudad de las puertas abiertas','Eje cafetero','Ciudad de la eterna primavera','Todas son válidas'], correcta:1 }
    ]
  },
  {
    id: 'q3',
    title: 'Cultura General BIFOR',
    desc: 'Preguntas rápidas estilo Kahoot',
    preguntas: [
      { pregunta: 'BIFOR 2026 se realiza en:', opciones:['Abril 2026','Diciembre 2026','Enero 2025','Julio 2026'], correcta:0 },
      { pregunta: '¿Qué color identifica a BIFOR 2026?', opciones:['Rojo','Verde lima / Negro','Azul','Rosa'], correcta:1 },
      { pregunta: 'Un minijuego tipo Kahoot premia:', opciones:['Rapidez + acierto','Solo acierto','Solo rapidez','Azar'], correcta:0 }
    ]
  }
];

const defaultUsers = [
  { nick:'Admin', email:'admin@bifor.com', password:'admin123', cargo:'Administrador', empresa:'BIFOR', puntaje:0, partidas:0 },
  { nick:'Demo', email:'demo@bifor.com', password:'demo123', cargo:'Visitante', empresa:'Demo Corp', puntaje:0, partidas:0 },
  { nick:'LauraInnov', email:'laura@bifor.com', password:'x', cargo:'Expositor', empresa:'EcoTech', puntaje:1850, partidas:5 },
  { nick:'CarlosCafe', email:'carlos@bifor.com', password:'x', cargo:'Patrocinador', empresa:'Café Andino', puntaje:1420, partidas:4 },
  { nick:'Sofi2026', email:'sofi@bifor.com', password:'x', cargo:'Estudiante', empresa:'U. Manizales', puntaje:980, partidas:3 },
];

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{ 
      const p = JSON.parse(raw);
      state.users = p.users || defaultUsers;
      state.quizzes = p.quizzes || defaultQuizzes;
      state.currentUser = p.currentUser || null;
      state.quizPlays = p.quizPlays || {};
      state.live = p.live || { onlineHistory: [], respondingHistory: [], feed: [], lastResponsesPerMin: 0 };
      if(!state.live.onlineHistory) state.live.onlineHistory=[];
      if(!state.live.respondingHistory) state.live.respondingHistory=[];
      if(!state.live.feed) state.live.feed=[];
    }catch{ initDefaults(); }
  } else initDefaults();
  if(!state.quizzes.length) state.quizzes = defaultQuizzes;
  if(!state.users.length) state.users = defaultUsers;
  if(!state.quizPlays) state.quizPlays={};
  if(!state.live) state.live={ onlineHistory:[], respondingHistory:[], feed:[], lastResponsesPerMin:0 };
  // inicializar historiales si vacios
  if(state.live.onlineHistory.length===0){
    for(let i=0;i<10;i++){ state.live.onlineHistory.push( 8 + Math.floor(Math.random()*6) ); state.live.respondingHistory.push(2+Math.floor(Math.random()*4)); }
  }
}
function initDefaults(){
  state.users = JSON.parse(JSON.stringify(defaultUsers));
  state.quizzes = JSON.parse(JSON.stringify(defaultQuizzes));
  state.quizPlays={}; state.live={ onlineHistory:[], respondingHistory:[], feed:[], lastResponsesPerMin:0 };
  for(let i=0;i<10;i++){ state.live.onlineHistory.push( 8 + Math.floor(Math.random()*6) ); state.live.respondingHistory.push(2+Math.floor(Math.random()*4)); }
  pushFeed('Sistema BIFOR iniciado - Bienvenidos a BIFOR 2026', 'sistema');
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({users:state.users, quizzes:state.quizzes, currentUser:state.currentUser, quizPlays:state.quizPlays, live:state.live}));
}
function pushFeed(text, type='info'){
  const time = new Date().toLocaleTimeString('es-CO',{hour:'2-digit', minute:'2-digit', second:'2-digit'});
  state.live.feed.unshift({time, text, type});
  if(state.live.feed.length>20) state.live.feed.pop();
  save();
}
// ===== CONFIGURACION =====
function loadConfig(){
  try{ const c=JSON.parse(localStorage.getItem(CONFIG_KEY)); if(c) config={...config, ...c}; }catch{}
  applyConfig();
}
function saveConfig(){ localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }
function applyConfig(){
  document.documentElement.style.setProperty('--font-scale', config.fontScale+'%');
  document.body.classList.toggle('light', config.theme==='light');
  const vol=config.volume/100;
  const audio=document.getElementById('bgMusic'); if(audio) audio.volume=vol*0.5;
  if(audioCtx) {
    const gain=audioCtx.gainNode; if(gain) gain.gain.value=vol*0.08;
  }
  // actualizar UI de config si existe
  const elVol=document.getElementById('cfgVolume'); if(elVol) elVol.value=config.volume;
  const elVolVal=document.getElementById('cfgVolumeVal'); if(elVolVal) elVolVal.textContent=config.volume+'%';
  const elSize=document.getElementById('cfgSizeVal'); if(elSize) elSize.textContent=config.fontScale+'%';
  const chkSound=document.getElementById('cfgSoundEnabled'); if(chkSound) chkSound.checked=config.soundEnabled;
  const chkMusic=document.getElementById('cfgMusicEnabled'); if(chkMusic) chkMusic.checked=config.musicEnabled;
  const chkSfx=document.getElementById('cfgSfxEnabled'); if(chkSfx) chkSfx.checked=config.sfxEnabled;
  const chkAnim=document.getElementById('cfgAnimations'); if(chkAnim) chkAnim.checked=config.animations;
  document.getElementById('themeDark')?.classList.toggle('active', config.theme==='dark');
  document.getElementById('themeLight')?.classList.toggle('active', config.theme==='light');
  document.body.classList.toggle('no-animations', !config.animations);
  // musica
  if(config.soundEnabled && config.musicEnabled) tryPlayMusic(); else stopMusic();
  renderConfigSession();
}
function renderConfigSession(){
  const el=document.getElementById('configSessionInfo'); if(!el) return;
  if(!state.currentUser) el.innerHTML='<p style="color:var(--muted)">No has iniciado sesion. <a href="#" onclick="showView(\'inicio\');return false" style="color:var(--turquoise)">Ir a registro</a></p>';
  else el.innerHTML=`<div style="display:flex;align-items:center;gap:12px"><div class="carnet-avatar" style="width:48px;height:48px;font-size:18px">${state.currentUser.nick.charAt(0).toUpperCase()}</div><div><strong>${state.currentUser.nick}</strong> - ${state.currentUser.cargo}<br><small style="color:var(--muted)">${state.currentUser.email} - ${state.currentUser.puntaje||0} pts</small></div><button class="btn-logout" style="margin-left:auto" onclick="doLogout()">Cerrar Sesion</button></div>`;
}
function doLogout(){
  if(!state.currentUser) { showView('inicio'); return; }
  if(!confirm(`Cerrar sesion de ${state.currentUser.nick}?`)) return;
  pushFeed(`${state.currentUser.nick} cerro sesion`, 'sistema');
  state.currentUser=null; save(); updateAuthUI(); showView('inicio');
  stopMusic();
}
function ensureAudioCtx(){
  if(audioCtx) return audioCtx;
  try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); audioCtx.gainNode=audioCtx.createGain(); audioCtx.gainNode.gain.value=(config.volume/100)*0.08; audioCtx.gainNode.connect(audioCtx.destination); }catch(e){ console.log('AudioContext no disponible',e); }
  return audioCtx;
}
function playSfx(type){
  if(!config.soundEnabled || !config.sfxEnabled || !config.animations) return;
  const ctx=ensureAudioCtx(); if(!ctx) return;
  const osc=ctx.createOscillator(), gain=ctx.createGain();
  osc.connect(gain); gain.connect(ctx.gainNode || ctx.destination);
  if(type==='correct'){
    osc.frequency.value=880; gain.gain.value=0.3;
    osc.type='sine';
    osc.start(); osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime+0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.4);
    osc.stop(ctx.currentTime+0.4);
    // segunda nota
    setTimeout(()=>{
      const o2=ctx.createOscillator(), g2=ctx.createGain();
      o2.connect(g2); g2.connect(ctx.gainNode);
      o2.frequency.value=1320; g2.gain.value=0.2; o2.type='sine';
      o2.start(); g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.3); o2.stop(ctx.currentTime+0.3);
    },120);
  } else {
    osc.frequency.value=220; gain.gain.value=0.25; osc.type='square';
    osc.start(); osc.frequency.linearRampToValueAtTime(150, ctx.currentTime+0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.4);
    osc.stop(ctx.currentTime+0.4);
  }
}
function tryPlayMusic(){
  const audio=document.getElementById('bgMusic');
  if(!audio) return;
  // si ya esta sonando via WebAudio, no usar audio tag
  if(bgOscNodes.length>0) return;
  // intentar cargar musica tranquila royalty free (Pixabay CC0) - fallback a sintesis
  if(!audio.src || audio.src===''){
    // track tranquila sin derechos: Pixabay lofi - usamos URL con CORS
    audio.src='https://cdn.pixabay.com/download/audio/2022/06/07/audio_b9bd4170e8.mp3?filename=ambient-piano-112199.mp3';
    audio.volume=(config.volume/100)*0.3;
  }
  audio.volume=(config.volume/100)*0.3;
  const playPromise=audio.play();
  if(playPromise) playPromise.catch(()=>{
    // fallback: sintesis WebAudio tranquila
    startSynthMusic();
  });
  musicPlaying=true;
  const btn=document.getElementById('musicToggle'); if(btn) btn.textContent='♫'; btn?.classList.add('playing');
}
function startSynthMusic(){
  if(bgOscNodes.length>0) return;
  const ctx=ensureAudioCtx(); if(!ctx) return;
  const baseFreq=110; // A2
  [0, 7, 12].forEach((semi, i)=>{
    const osc=ctx.createOscillator(), gain=ctx.createGain(), filter=ctx.createBiquadFilter();
    osc.type='sine'; osc.frequency.value=baseFreq * Math.pow(2, semi/12);
    filter.type='lowpass'; filter.frequency.value=800;
    gain.gain.value=0;
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.gainNode);
    osc.start();
    // fade in
    gain.gain.linearRampToValueAtTime((config.volume/100)*0.04, ctx.currentTime+2 + i*0.5);
    bgOscNodes.push({osc,gain,filter});
  });
  // leve movimiento
  let lfoPhase=0;
  const lfo=setInterval(()=>{
    if(!audioCtx || bgOscNodes.length===0){ clearInterval(lfo); return; }
    lfoPhase+=0.03;
    bgOscNodes.forEach((n,i)=>{
      try{ n.filter.frequency.value=600 + Math.sin(lfoPhase + i)*200; }catch{}
    });
  },100);
  bgOscNodes.lfo=lfo;
  musicPlaying=true;
}
function stopMusic(){
  const audio=document.getElementById('bgMusic');
  if(audio){ try{ audio.pause(); }catch{} }
  if(bgOscNodes.length>0){
    bgOscNodes.forEach(n=>{ try{ n.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.5); setTimeout(()=>{try{n.osc.stop()}catch{}},600); }catch{} });
    if(bgOscNodes.lfo) clearInterval(bgOscNodes.lfo);
    bgOscNodes=[];
  }
  musicPlaying=false;
  const btn=document.getElementById('musicToggle'); if(btn) btn.textContent='♪'; btn?.classList.remove('playing');
}
function triggerConfetti(){
  if(!config.animations) return;
  const canvas=document.getElementById('confettiCanvas');
  if(!canvas) return;
  canvas.classList.remove('hidden'); canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  const pieces=[]; const colors=['#8ed152','#0fb9a0','#0e3b2e','#ffffff','#f1c40f'];
  for(let i=0;i<120;i++) pieces.push({x:Math.random()*canvas.width, y:-10, r:4+Math.random()*6, c:colors[Math.floor(Math.random()*colors.length)], vx:(Math.random()-0.5)*8, vy:2+Math.random()*6, rot:Math.random()*360, vr:(Math.random()-0.5)*10});
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.rot+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180); ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r); ctx.restore(); });
    frame++;
    if(frame<180) requestAnimationFrame(draw); else { canvas.classList.add('hidden'); ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  draw();
}
function showCorrectAnimation(points){
  if(!config.animations) return;
  playSfx('correct');
  triggerConfetti();
  const burst=document.createElement('div'); burst.className='correct-burst anim-correct';
  burst.innerHTML=`<div class="emoji">✓</div><h2>¡Correcto!</h2><p>+${points} puntos</p>`;
  document.body.appendChild(burst);
  // score float
  const fl=document.createElement('div'); fl.className='score-float'; fl.textContent=`+${points}`; fl.style.left='50%'; fl.style.top='45%'; document.body.appendChild(fl);
  setTimeout(()=>{ burst.remove(); fl.remove(); }, 1200);
}
function showWrongAnimation(){
  if(!config.animations) { playSfx('wrong'); return; }
  playSfx('wrong');
  const burst=document.createElement('div'); burst.className='wrong-burst anim-wrong';
  burst.innerHTML=`<div class="emoji">✕</div><h2>¡Fallaste!</h2><p>Intenta la siguiente</p>`;
  document.body.appendChild(burst);
  document.body.style.animation='wrongShake .4s';
  setTimeout(()=>{ document.body.style.animation=''; burst.remove(); }, 900);
}

// Navigation
document.querySelectorAll('.nav-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    if(b.dataset.view==='admin' && (!state.currentUser || state.currentUser.cargo!=='Administrador')){
      alert('Acceso solo para administradores. Inicia sesión como admin@bifor.com');
      return;
    }
    showView(b.dataset.view);
  });
});
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const target=document.getElementById('view-'+name);
  if(!target){ console.warn('view not found',name); return; }
  target.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  if(name==='juegos') renderJuegos();
  if(name==='ranking') renderRanking();
  if(name==='carnet') renderCarnet();
  if(name==='admin') renderAdmin();
  if(name==='estadisticas') renderEstadisticas();
  if(name==='config') renderConfigSession();
  window.scrollTo({top:0, behavior:'smooth'});
  // iniciar musica al primer interaction si esta habilitada
  if(config.musicEnabled && config.soundEnabled && !musicPlaying) {
    // no autoplay hasta interaccion, se intentara en siguiente click
  }
}

// Auth
const registroForm = document.getElementById('registroForm');
const loginForm = document.getElementById('loginForm');

registroForm.addEventListener('submit', e=>{
  e.preventDefault();
  const nick = document.getElementById('nick').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const cargo = document.getElementById('cargo').value;
  const empresa = document.getElementById('empresa').value.trim() || '—';
  if(!nick || !email || !password || !cargo) return;
  if(state.users.find(u=>u.email===email)){ alert('Ese correo ya está registrado. Inicia sesión.'); return; }
  if(state.users.find(u=>u.nick.toLowerCase()===nick.toLowerCase())){ alert('Ese nombre de jugador ya existe, elige otro.'); return; }
  const user = { nick, email, password, cargo, empresa, puntaje:0, partidas:0, id: Date.now().toString(36) };
  state.users.push(user);
  state.currentUser = user;
  save(); pushFeed(`${nick} (${email}) se registro como ${cargo}`, 'registro'); updateAuthUI();
  alert(`¡Bienvenido ${nick}! Registro exitoso.`);
  showView('juegos');
});

loginForm.addEventListener('submit', e=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const user = state.users.find(u=>u.email===email && u.password===password);
  if(!user){ alert('Correo o contraseña incorrectos. Prueba demo@bifor.com / demo123'); return; }
  state.currentUser = user;
  save(); pushFeed(`${user.nick} conecto (${email})`, 'login'); updateAuthUI();
  showView('juegos');
});

document.getElementById('showLogin').addEventListener('click', e=>{ e.preventDefault(); toggleAuth('login'); });
document.getElementById('showRegistro').addEventListener('click', e=>{ e.preventDefault(); toggleAuth('registro'); });
function toggleAuth(which){
  document.getElementById('registroCard').classList.toggle('hidden', which!=='registro');
  document.getElementById('loginCard').classList.toggle('hidden', which!=='login');
}
document.getElementById('logoutBtn').addEventListener('click', doLogout);
let originalRegistroHTML = null;
function updateAuthUI(){
  const chip = document.getElementById('userChip');
  const logout = document.getElementById('logoutBtn');
  const adminBtn = document.querySelector('.nav-btn[data-view="admin"]');
  const regCard = document.getElementById('registroCard');
  if(originalRegistroHTML===null) originalRegistroHTML = regCard.innerHTML;
  if(state.currentUser){
    chip.textContent = state.currentUser.nick + ' - ' + state.currentUser.cargo;
    chip.classList.remove('hidden'); logout.classList.remove('hidden');
    if(state.currentUser.cargo==='Administrador') adminBtn.style.display='';
    else adminBtn.style.display='none';
    regCard.innerHTML = `
      <div class="card-watermark">BIFOR</div>
      <h3>Hola, ${state.currentUser.nick}!</h3>
      <p class="card-sub">Ya puedes acceder a los minijuegos y tu carnet.</p>
      <div style="display:grid;gap:10px;margin-top:16px">
        <button class="btn-primary" onclick="showView('juegos')">Ir a Minijuegos</button>
        <button class="btn-outline" onclick="showView('carnet')">Ver mi Carnet</button>
        <button class="btn-outline" onclick="showView('ranking')">Ver Ranking</button>
      </div>`;
    regCard.classList.remove('hidden');
    document.getElementById('loginCard').classList.add('hidden');
  } else {
    chip.classList.add('hidden'); logout.classList.add('hidden');
    adminBtn.style.display='none';
    regCard.innerHTML = originalRegistroHTML;
    bindRegistroForm();
    document.getElementById('loginCard').classList.add('hidden');
    regCard.classList.remove('hidden');
  }
  renderConfigSession();
  if(typeof updateSideUser==='function') try{ updateSideUser(); }catch{}
}
function bindRegistroForm(){
  const form = document.getElementById('registroForm');
  if(!form) return;
  form.onsubmit = (e)=>{
    e.preventDefault();
    const nick = document.getElementById('nick').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const cargo = document.getElementById('cargo').value;
    const empresa = document.getElementById('empresa').value.trim() || '-';
    if(!nick || !email || !password || !cargo) return;
    if(state.users.find(u=>u.email===email)){ alert('Ese correo ya esta registrado. Inicia sesion.'); return; }
    if(state.users.find(u=>u.nick.toLowerCase()===nick.toLowerCase())){ alert('Ese nombre de jugador ya existe, elige otro.'); return; }
    const user = { nick, email, password, cargo, empresa, puntaje:0, partidas:0, id: Date.now().toString(36) };
    state.users.push(user);
    state.currentUser = user;
    save(); pushFeed(`${nick} (${email}) se registro como ${cargo}`, 'registro'); updateAuthUI();
    alert('Bienvenido '+nick+'! Registro exitoso.');
    showView('juegos');
  };
  const showLogin = document.getElementById('showLogin');
  if(showLogin) showLogin.onclick = (e)=>{ e.preventDefault(); toggleAuth('login'); };
}

// Juegos
function renderJuegos(){
  const lista = document.getElementById('juegosLista');
  const quizArea = document.getElementById('quizArea');
  const result = document.getElementById('quizResult');
  quizArea.classList.add('hidden'); result.classList.add('hidden'); lista.classList.remove('hidden');
  if(!state.currentUser){
    lista.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:30px"><h3>🔒 Debes registrarte primero</h3><p style="color:#888;margin:8px 0">Crea tu nombre de jugador para competir</p><button class="btn-primary" onclick="showView('inicio')">Ir a Registro</button></div>`;
    return;
  }
  lista.innerHTML = state.quizzes.map(q=>`
    <div class="juego-card">
      <div class="juego-watermark">BIFOR 2026</div>
      <h4>🎯 ${q.title}</h4>
      <p>${q.desc}</p>
      <div class="juego-meta"><span>❓ ${q.preguntas.length} preguntas</span><span>⏱️ ${q.preguntas.length*15}s</span><span>🏆 +${q.preguntas.length*100} pts</span></div>
      <button class="btn-primary" onclick="startQuiz('${q.id}')">Jugar Ahora →</button>
    </div>
  `).join('');
}

function startQuiz(id){
  if(!state.currentUser){ alert('Regístrate primero'); showView('inicio'); return; }
  state.currentQuiz = state.quizzes.find(q=>q.id===id);
  state.currentQIndex = 0; state.liveScore = 0;
  document.getElementById('juegosLista').classList.add('hidden');
  document.getElementById('quizResult').classList.add('hidden');
  document.getElementById('quizArea').classList.remove('hidden');
  document.getElementById('liveScore').textContent = 0;
  showQuestion();
}

function showQuestion(){
  const q = state.currentQuiz.preguntas[state.currentQIndex];
  const total = state.currentQuiz.preguntas.length;
  document.getElementById('quizProgressText').textContent = `Pregunta ${state.currentQIndex+1} de ${total} — ${state.currentQuiz.title}`;
  document.getElementById('progressFill').style.width = `${((state.currentQIndex)/total)*100}%`;
  document.getElementById('quizQuestion').textContent = q.pregunta;
  const opts = document.getElementById('quizOptions');
  opts.innerHTML = q.opciones.map((op,i)=>`<button class="option-btn" data-i="${i}"><span style="opacity:.6;margin-right:8px">${String.fromCharCode(65+i)}</span> ${op}</button>`).join('');
  document.getElementById('quizFeedback').classList.add('hidden');
  // timer
  clearInterval(state.timer);
  state.timeLeft = 15;
  document.getElementById('quizTimer').textContent = state.timeLeft+'s';
  document.getElementById('quizTimer').style.background = '';
  state.timer = setInterval(()=>{
    state.timeLeft--;
    document.getElementById('quizTimer').textContent = state.timeLeft+'s';
    if(state.timeLeft<=5) document.getElementById('quizTimer').style.background='#ff3232';
    if(state.timeLeft<=0){ clearInterval(state.timer); handleAnswer(-1); }
  },1000);
  opts.querySelectorAll('.option-btn').forEach(b=>{
    b.addEventListener('click', ()=> handleAnswer(parseInt(b.dataset.i)));
  });
}

function handleAnswer(idx){
  clearInterval(state.timer);
  const q = state.currentQuiz.preguntas[state.currentQIndex];
  const buttons = document.querySelectorAll('.option-btn');
  const feedback = document.getElementById('quizFeedback');
  const isTimeout = idx===-1;
  const isCorrect = idx===q.correcta;
  buttons.forEach((b,i)=>{
    b.disabled = true;
    if(i===q.correcta) b.classList.add('correct');
    else if(i===idx && !isCorrect) b.classList.add('wrong');
  });
  if(isTimeout){
    feedback.textContent = `⏰ ¡Tiempo agotado! La correcta era: ${q.opciones[q.correcta]}`;
    feedback.className='feedback bad';
    showWrongAnimation();
    buttons.forEach(b=>{ if(b.classList.contains('wrong')) b.classList.add('wrong-anim'); });
  } else if(isCorrect){
    const pts = 100 + state.timeLeft*7;
    state.liveScore += pts;
    document.getElementById('liveScore').textContent = state.liveScore;
    feedback.textContent = `✅ ¡Correcto! +${pts} pts (bonus rapidez)`;
    feedback.className='feedback ok';
    // animacion correcta
    showCorrectAnimation(pts);
    buttons.forEach(b=>{ if(b.classList.contains('correct')) b.classList.add('correct-anim'); });
  } else {
    feedback.textContent = `❌ Incorrecto. La correcta era: ${q.opciones[q.correcta]}`;
    feedback.className='feedback bad';
    showWrongAnimation();
    const wrongBtn=document.querySelector('.option-btn.wrong'); if(wrongBtn) wrongBtn.classList.add('wrong-anim');
  }
  feedback.classList.remove('hidden');
  // animar feedback
  if(config.animations){
    feedback.style.animation='none'; void feedback.offsetWidth;
    feedback.style.animation= isCorrect ? 'correctPop .5s ease' : 'wrongShake .5s ease';
  }
  setTimeout(()=>{
    state.currentQIndex++;
    document.getElementById('progressFill').style.width = `${(state.currentQIndex/state.currentQuiz.preguntas.length)*100}%`;
    if(state.currentQIndex < state.currentQuiz.preguntas.length){
      showQuestion();
    } else {
      finishQuiz();
    }
  },1400);
}

function finishQuiz(){
  clearInterval(state.timer);
  document.getElementById('quizArea').classList.add('hidden');
  const res = document.getElementById('quizResult');
  res.classList.remove('hidden');
  // guardar puntaje + tracking por quiz
  if(state.currentQuiz) state.quizPlays[state.currentQuiz.id]=(state.quizPlays[state.currentQuiz.id]||0)+1;
  const userIdx = state.users.findIndex(u=>u.email===state.currentUser.email);
  if(userIdx>=0){
    state.users[userIdx].puntaje = (state.users[userIdx].puntaje||0) + state.liveScore;
    state.users[userIdx].partidas = (state.users[userIdx].partidas||0)+1;
    state.currentUser = state.users[userIdx];
    save();
    pushFeed(`${state.currentUser.nick} completo "${state.currentQuiz.title}" con ${state.liveScore} pts`, 'quiz');
  } else save();
  document.getElementById('resultScore').textContent = state.liveScore + ' pts';
  let msg = '';
  const max = state.currentQuiz.preguntas.length * (100+15*7);
  const pct = state.liveScore / max;
  if(pct>0.8) msg='🔥 ¡Increíble! Estás entre los mejores de BIFOR 2026.';
  else if(pct>0.5) msg='👏 ¡Muy bien! Sigue jugando para subir en el ranking.';
  else msg='💪 ¡Sigue intentando! Cada partida te hace mejorar.';
  document.getElementById('resultMessage').textContent = msg + ` Has jugado ${state.currentUser.partidas} partidas.`;
}

document.getElementById('salirQuiz').addEventListener('click',()=>{
  clearInterval(state.timer); renderJuegos();
});
document.getElementById('volverJuegos').addEventListener('click', renderJuegos);

// Carnet
function renderCarnet(){
  if(!state.currentUser){
    document.getElementById('carnetCard').innerHTML = `<div style="padding:30px;text-align:center"><h3>🔒 Inicia sesión para ver tu carnet</h3><button class="btn-primary" onclick="showView('inicio')">Ir a Registro</button></div>`;
    return;
  }
  // restaurar carnet si fue reemplazado - reconstruir sin recargar
  if(!document.getElementById('carnetNombre')){
    document.getElementById('carnetCard').innerHTML = `
      <div class="carnet-header"><div class="carnet-logo"><span class="bif">BIF</span><span class="o">O</span><span class="r">R</span> <span class="year">2026</span><div class="sub">INNOVACION QUE TRANSFORMA</div></div><div class="carnet-badge">ACCESO OFICIAL</div></div>
      <div class="carnet-body"><div class="carnet-avatar" id="carnetAvatar">?</div><div class="carnet-info"><h3 id="carnetNombre">-</h3><p id="carnetCargo" class="carnet-cargo">-</p><p id="carnetEmpresa" class="carnet-empresa">-</p><p id="carnetEmail" class="carnet-email">-</p><div class="carnet-meta"><span>15-17 ABRIL 2026</span><span>MANIZALES, COLOMBIA</span></div></div><div class="carnet-qr"><canvas id="qrCanvas" width="140" height="140"></canvas><small id="qrCode">ID: -</small></div></div>
      <div class="carnet-footer"><span>VALIDO PARA LOS 3 DIAS DEL EVENTO</span><span class="carnet-watermark-inline">BIFOR 2026</span></div>`;
  }
  document.getElementById('carnetNombre').textContent = state.currentUser.nick;
  document.getElementById('carnetCargo').textContent = state.currentUser.cargo;
  document.getElementById('carnetEmpresa').textContent = state.currentUser.empresa || '—';
  document.getElementById('carnetEmail').textContent = state.currentUser.email;
  document.getElementById('carnetAvatar').textContent = state.currentUser.nick.charAt(0).toUpperCase();
  const code = 'BIFOR-'+state.currentUser.nick.toUpperCase().replace(/\s/g,'')+'-'+(state.currentUser.email.slice(0,3).toUpperCase())+'-2026';
  document.getElementById('qrCode').textContent = code;
  // generar QR fake con canvas
  const c = document.getElementById('qrCanvas');
  const ctx = c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,140,140);
  ctx.fillStyle='#000';
  // marco
  ctx.fillRect(6,6,32,32); ctx.fillRect(102,6,32,32); ctx.fillRect(6,102,32,32);
  ctx.fillStyle='#fff'; ctx.fillRect(12,12,20,20); ctx.fillRect(108,12,20,20); ctx.fillRect(12,108,20,20);
  ctx.fillStyle='#000'; ctx.fillRect(18,18,8,8); ctx.fillRect(114,18,8,8); ctx.fillRect(18,114,8,8);
  // ruido pseudo qr basado en nick
  let seed = 0; for(let ch of state.currentUser.nick) seed += ch.charCodeAt(0);
  for(let i=0;i<180;i++){
    const x = 44 + (seed * (i+1) * 9301 % 10000) % 52;
    const y = 44 + (seed * (i+7) * 49297 % 10000) % 52;
    // simple deterministic
    const v = (seed + i*31) % 3;
    if(v===0) ctx.fillRect(44 + (i%13)*6, 44+ Math.floor(i/13)*6, 4,4);
  }
  // texto central BIFOR
  ctx.fillStyle='#000'; ctx.font='700 7px Montserrat'; ctx.textAlign='center'; ctx.fillText('BIFOR',70,74);
}

document.getElementById('descargarCarnet')?.addEventListener('click',()=>{
  alert('Para descargar: usa Imprimir / Guardar como PDF (funciona en móvil y PC).');
});

// Ranking
function renderRanking(){
  const sorted = [...state.users].sort((a,b)=>(b.puntaje||0)-(a.puntaje||0));
  const podium = document.getElementById('podium');
  const body = document.getElementById('rankingBody');
  const top3 = sorted.slice(0,3);
  const medals = ['🥇','🥈','🥉'];
  const order = [1,0,2]; // visual order: 2nd,1st,3rd
  podium.innerHTML = top3.map((u,i)=>{
    const rank = sorted.indexOf(u);
    return `<div class="podium-item ${rank===0?'first':rank===1?'second':'third'}">
      <div class="podium-medal">${medals[rank]}</div>
      <div class="podium-name">${u.nick}</div>
      <div class="podium-cargo">${u.cargo}</div>
      <div class="podium-score">${u.puntaje||0} pts</div>
      <div style="font-size:10px;color:#777">${u.partidas||0} partidas</div>
    </div>`;
  }).join('');
  if(top3.length<3) podium.innerHTML += `<div style="color:#555;font-size:12px;align-self:center">¡Juega para llegar al podio!</div>`;

  body.innerHTML = sorted.map((u,idx)=>{
    const isMe = state.currentUser && u.email===state.currentUser.email;
    return `<tr class="${isMe?'highlight':''}">
      <td><strong>${idx+1}</strong> ${idx<3?medals[idx]:''}</td>
      <td><strong>${u.nick}</strong> ${isMe?'← tú':''}</td>
      <td>${u.cargo}</td>
      <td style="color:var(--lime);font-weight:800">${u.puntaje||0}</td>
      <td>${u.partidas||0}</td>
    </tr>`;
  }).join('');

  const myCard = document.getElementById('myPositionCard');
  if(!state.currentUser){ myCard.innerHTML='🔒 <a href="#" onclick="showView(\'inicio\');return false" style="color:var(--lime)">Regístrate</a> para ver tu posición'; }
  else {
    const pos = sorted.findIndex(u=>u.email===state.currentUser.email)+1;
    const total = sorted.length;
    myCard.innerHTML = `Tu posición: <strong>#${pos} de ${total}</strong> • ${state.currentUser.puntaje||0} pts • ${state.currentUser.partidas||0} partidas jugadas`;
  }
}

// ====== ESTADISTICAS LIVE ======
function getLiveCounts(){
  const total = state.users.length;
  // online simulado: base = total + 3 bots, con variacion
  const lastOnline = state.live.onlineHistory[state.live.onlineHistory.length-1] || 10;
  let online = lastOnline + (Math.random()>0.5?1:-1) * Math.floor(Math.random()*2);
  // asegurar rango 1.. total+15
  const maxOnline = total + 12;
  online = Math.max(1, Math.min(maxOnline, online));
  if(state.currentUser) online = Math.max(online, 1);
  // respondiendo = subset de online que esta jugando
  const lastResp = state.live.respondingHistory[state.live.respondingHistory.length-1] || 3;
  let responding = lastResp + (Math.random()>0.6?1:-1) * (Math.random()>0.7?1:0);
  // si alguien esta en quiz activo, forzar +1
  if(state.currentQuiz && document.getElementById('quizArea') && !document.getElementById('quizArea').classList.contains('hidden')) responding = Math.max(responding, 1);
  responding = Math.max(0, Math.min(online, responding));
  responding = Math.round(responding);
  online = Math.round(online);
  return {total, online, responding};
}
function tickStats(){
  const {online, responding} = getLiveCounts();
  state.live.onlineHistory.push(online);
  state.live.respondingHistory.push(responding);
  if(state.live.onlineHistory.length>10) state.live.onlineHistory.shift();
  if(state.live.respondingHistory.length>10) state.live.respondingHistory.shift();
  // respuestas por minuto simulado
  state.live.lastResponsesPerMin = Math.round(responding * (2 + Math.random()*3));
  // ocasionalmente push feed aleatorio para dinamismo
  if(Math.random()>0.75){
    const nicks = state.users.map(u=>u.nick);
    const n = nicks[Math.floor(Math.random()*nicks.length)];
    const actions = [`${n} respondio en Innovacion BIFOR`, `${n} completo un quiz +${(Math.floor(Math.random()*200)+50)} pts`, `${n} genero su carnet digital`, `Nuevo pico: ${online} correos conectados`];
    pushFeed(actions[Math.floor(Math.random()*actions.length)], 'live');
    if(document.getElementById('view-estadisticas')?.classList.contains('active')) renderEstadisticas();
  }
  save();
  updateLiveWidget();
  // si estamos en estadisticas, refrescar numeros sin redibujar todo
  if(document.getElementById('view-estadisticas')?.classList.contains('active')){
    refreshEstadisticasNumbers();
    drawActividadChart();
  }
}
function updateLiveWidget(){
  const {online, responding} = getLiveCounts();
  const lwOnline = document.getElementById('lwOnline');
  const lwPlaying = document.getElementById('lwPlaying');
  const lwBar = document.getElementById('lwBarFill');
  const lwSub = document.getElementById('lwSub');
  if(lwOnline) lwOnline.textContent = online;
  if(lwPlaying) lwPlaying.textContent = responding;
  if(lwBar) lwBar.style.width = (online? Math.round(responding/online*100):0) + '%';
  if(lwSub) lwSub.textContent = (state.live.lastResponsesPerMin||0) + ' respuestas/min';
  // ticker text
  const ticker = document.getElementById('tickerText');
  if(ticker){
    const total = state.users.length;
    const partidas = state.users.reduce((a,u)=>a+(u.partidas||0),0);
    ticker.textContent = `${online} conectados \u2022 ${responding} jugando ahora \u2022 ${total} registrados \u2022 ${partidas} partidas totales`;
  }
}
function refreshEstadisticasNumbers(){
  const {total, online, responding} = getLiveCounts();
  const partidas = state.users.reduce((a,u)=>a+(u.partidas||0),0);
  const avg = partidas ? Math.round(state.users.reduce((a,u)=>a+(u.puntaje||0),0)/partidas) : 0;
  const delta = (online - (state.live.onlineHistory[state.live.onlineHistory.length-2]||online));
  const elOnline=document.getElementById('statOnline'); if(elOnline){ elOnline.textContent=online; elOnline.classList.remove('bump'); void elOnline.offsetWidth; elOnline.classList.add('bump');}
  const elDelta=document.getElementById('statOnlineDelta'); if(elDelta) elDelta.textContent=(delta>=0?'+'+delta:delta);
  const elTotal=document.getElementById('statTotal'); if(elTotal) elTotal.textContent=total;
  const elTotalSub=document.getElementById('statTotalSub'); if(elTotalSub) elTotalSub.textContent= total + ' con carnet generado';
  const elResp=document.getElementById('statRespondiendo'); if(elResp){ elResp.textContent=responding; elResp.classList.remove('bump'); void elResp.offsetWidth; elResp.classList.add('bump');}
  const elRespSub=document.getElementById('statRespondiendoSub'); if(elRespSub) elRespSub.textContent=(state.live.lastResponsesPerMin||0)+' respuestas/min';
  const elPart=document.getElementById('statPartidas'); if(elPart) elPart.textContent=partidas;
  const elPartSub=document.getElementById('statPartidasSub'); if(elPartSub) elPartSub.textContent='Promedio '+avg+' pts';
}
function renderEstadisticas(){
  refreshEstadisticasNumbers();
  // tabla activos
  const tabla=document.getElementById('tablaActivos');
  if(tabla){
    const sorted=[...state.users].sort((a,b)=>(b.puntaje||0)-(a.puntaje||0));
    tabla.innerHTML=`<table class="ranking-table"><thead><tr><th>Correo</th><th>Jugador</th><th>Cargo</th><th>Estado</th><th>Puntaje</th></tr></thead><tbody>
    ${sorted.map((u,i)=>{
      const isOnline = i< getLiveCounts().online; // simular primeros como online
      const isPlaying = isOnline && i < getLiveCounts().responding;
      const estado = isPlaying?'<span class="badge playing"><span class="live-dot small"></span> Jugando</span>' : isOnline?'<span class="badge online">● Conectado</span>':'<span class="badge off">Offline</span>';
      return `<tr class="${isPlaying?'highlight':''}"><td>${u.email}</td><td><strong>${u.nick}</strong></td><td>${u.cargo}</td><td>${estado}</td><td>${u.puntaje||0}</td></tr>`;
    }).join('')}
    </tbody></table>`;
  }
  // feed
  const feed=document.getElementById('liveFeed');
  if(feed){
    feed.innerHTML=state.live.feed.map(f=>`<div class="feed-item ${f.type}"><span class="feed-time">${f.time}</span><span class="feed-text">${f.text}</span></div>`).join('') || '<div class="feed-item">Sin actividad aun</div>';
  }
  // bar charts
  renderBarQuizzes();
  renderBarCargos();
  drawActividadChart();
}
function renderBarQuizzes(){
  const c=document.getElementById('chartQuizzes'); if(!c) return;
  const max = Math.max(1, ...Object.values(state.quizPlays), 1);
  c.innerHTML = state.quizzes.map(q=>{
    const count = state.quizPlays[q.id]||0;
    const pct = Math.round(count/max*100);
    const isActive = state.currentQuiz?.id===q.id && !document.getElementById('quizArea')?.classList.contains('hidden');
    return `<div class="bar-row"><span class="bar-label">${q.title}</span><div class="bar-track"><div class="bar-fill ${isActive?'active':''}" style="width:${pct}%"></div></div><span class="bar-value">${count} jug.</span></div>`;
  }).join('') + (state.quizzes.length===0?'<p style="color:#777">Sin quizzes</p>':'');
}
function renderBarCargos(){
  const c=document.getElementById('chartCargos'); if(!c) return;
  const counts={}; state.users.forEach(u=>{ counts[u.cargo]=(counts[u.cargo]||0)+1; });
  const max=Math.max(...Object.values(counts),1);
  c.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([cargo, cnt])=>{
    const pct=Math.round(cnt/max*100);
    return `<div class="bar-row"><span class="bar-label">${cargo}</span><div class="bar-track"><div class="bar-fill cargo" style="width:${pct}%"></div></div><span class="bar-value">${cnt}</span></div>`;
  }).join('');
}
function drawActividadChart(){
  const canvas=document.getElementById('chartActividad'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, pad=20;
  ctx.clearRect(0,0,W,H);
  // grid
  ctx.strokeStyle='#222'; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){ const y=pad + i*(H-pad*2)/4; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke(); }
  const online=state.live.onlineHistory, resp=state.live.respondingHistory;
  const maxVal=Math.max(10, ...online, ...resp);
  function drawLine(data, color, width){
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath();
    data.forEach((v,i)=>{
      const x=pad + i*(W-pad*2)/(Math.max(1,data.length-1));
      const y=H-pad - (v/maxVal)*(H-pad*2);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    // puntos
    ctx.fillStyle=color;
    data.forEach((v,i)=>{
      const x=pad + i*(W-pad*2)/(Math.max(1,data.length-1));
      const y=H-pad - (v/maxVal)*(H-pad*2);
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    });
  }
  drawLine(online, '#8ed152', 2.5);
  drawLine(resp, '#0fb9a0', 2.5);
  // labels
  ctx.fillStyle='#777'; ctx.font='10px Inter'; ctx.fillText('max '+maxVal, W-60, 14);
}
let statsInterval=null;
function startStatsLoop(){
  if(statsInterval) clearInterval(statsInterval);
  updateLiveWidget();
  statsInterval=setInterval(tickStats, 2000);
}

// Admin
function renderAdmin(){
  const list = document.getElementById('adminQuizList');
  list.innerHTML = state.quizzes.map(q=>`
    <div class="admin-quiz-item">
      <div><h4>${q.title}</h4><p>${q.desc} • ${q.preguntas.length} preguntas</p></div>
      <div class="admin-actions">
        <button class="btn-icon" onclick="editQuiz('${q.id}')">✏️</button>
        <button class="btn-icon danger" onclick="deleteQuiz('${q.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
  const usersDiv = document.getElementById('adminUsers');
  usersDiv.innerHTML = `<div style="overflow-x:auto"><table class="ranking-table"><thead><tr><th>Nick</th><th>Email</th><th>Cargo</th><th>Pts</th><th>Acción</th></tr></thead><tbody>
    ${state.users.map(u=>`<tr><td>${u.nick}</td><td>${u.email}</td><td>${u.cargo}</td><td>${u.puntaje||0}</td><td><button class="btn-icon danger" onclick="deleteUser('${u.email}')">Eliminar</button></td></tr>`).join('')}
  </tbody></table></div>`;
  // reset form if not editing
  if(!state.editingQuizId) resetQuizForm();
}

function resetQuizForm(){
  document.getElementById('editQuizId').value='';
  document.getElementById('quizTitle').value='';
  document.getElementById('quizDesc').value='';
  document.getElementById('preguntasEditor').innerHTML='';
  document.getElementById('formTitle').textContent='➕ Crear Nuevo Quiz';
  document.getElementById('cancelEdit').classList.add('hidden');
  state.editingQuizId=null;
  addPreguntaBlock();
}

function addPreguntaBlock(data){
  const container = document.getElementById('preguntasEditor');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className='pregunta-block';
  div.innerHTML=`
    <h5>Pregunta ${idx+1} <button type="button" onclick="this.closest('.pregunta-block').remove();reindexPreguntas()" style="float:right;background:none;border:none;color:#ff6b6b;cursor:pointer">✕ quitar</button></h5>
    <input type="text" placeholder="Escribe la pregunta" class="pregunta-text" value="${data?data.pregunta.replace(/"/g,'&quot;'):''}" required>
    ${[0,1,2,3].map(i=>`
      <div class="option-row">
        <input type="radio" name="correcta_${idx}" value="${i}" ${data&&data.correcta===i?'checked':i===0 && !data?'checked':''} required>
        <input type="text" placeholder="Opción ${String.fromCharCode(65+i)}" class="opcion" value="${data?data.opciones[i].replace(/"/g,'&quot;'):''}" required>
      </div>
    `).join('')}
  `;
  container.appendChild(div);
}
function reindexPreguntas(){
  document.querySelectorAll('.pregunta-block h5').forEach((h,i)=>{
    h.childNodes[0].textContent = `Pregunta ${i+1} `;
  });
}
document.getElementById('addPregunta').addEventListener('click',()=>addPreguntaBlock());
document.getElementById('cancelEdit').addEventListener('click',resetQuizForm);

document.getElementById('quizForm').addEventListener('submit', e=>{
  e.preventDefault();
  const title = document.getElementById('quizTitle').value.trim();
  const desc = document.getElementById('quizDesc').value.trim();
  const blocks = document.querySelectorAll('.pregunta-block');
  if(!title){ alert('Título requerido'); return;}
  if(blocks.length===0){ alert('Añade al menos una pregunta'); return;}
  const preguntas = [];
  for(let b of blocks){
    const pregunta = b.querySelector('.pregunta-text').value.trim();
    const opciones = [...b.querySelectorAll('.opcion')].map(o=>o.value.trim());
    const correcta = parseInt(b.querySelector('input[type="radio"]:checked')?.value ?? 0);
    if(!pregunta || opciones.some(o=>!o)){ alert('Completa todas las preguntas y opciones'); return; }
    preguntas.push({ pregunta, opciones, correcta });
  }
  const id = document.getElementById('editQuizId').value || 'q'+Date.now();
  const quiz = { id, title, desc, preguntas };
  const existing = state.quizzes.findIndex(q=>q.id===id);
  const isNew = existing<0;
  if(existing>=0) state.quizzes[existing]=quiz; else state.quizzes.push(quiz);
  save(); pushFeed(`${isNew?'Nuevo':'Actualizado'} quiz "${title}" (${preguntas.length} preguntas)`, 'quiz'); renderAdmin(); alert('✅ Quiz guardado');
  resetQuizForm();
});

window.editQuiz = (id)=>{
  const q = state.quizzes.find(x=>x.id===id);
  if(!q) return;
  state.editingQuizId=id;
  document.getElementById('editQuizId').value=id;
  document.getElementById('quizTitle').value=q.title;
  document.getElementById('quizDesc').value=q.desc;
  document.getElementById('preguntasEditor').innerHTML='';
  q.preguntas.forEach(p=>addPreguntaBlock(p));
  document.getElementById('formTitle').textContent='✏️ Editando: '+q.title;
  document.getElementById('cancelEdit').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
};
window.deleteQuiz = (id)=>{
  if(!confirm('¿Eliminar este quiz?')) return;
  state.quizzes = state.quizzes.filter(q=>q.id!==id);
  save(); renderAdmin();
};
window.deleteUser = (email)=>{
  if(email==='admin@bifor.com'){ alert('No puedes eliminar al admin principal'); return; }
  if(!confirm('¿Eliminar usuario '+email+'?')) return;
  state.users = state.users.filter(u=>u.email!==email);
  if(state.currentUser?.email===email) state.currentUser=null;
  save(); renderAdmin(); renderRanking();
};

// init
load();
loadConfig();
updateAuthUI();
renderJuegos();
renderRanking();
renderCarnet();
renderEstadisticas();
startStatsLoop();
// bind config events
document.getElementById('configBtn')?.addEventListener('click', ()=> showView('config'));
document.getElementById('musicToggle')?.addEventListener('click', ()=>{
  if(musicPlaying) { config.musicEnabled=false; stopMusic(); }
  else { config.musicEnabled=true; if(config.soundEnabled) tryPlayMusic(); }
  saveConfig(); applyConfig();
});
document.getElementById('cfgSoundEnabled')?.addEventListener('change', e=>{ config.soundEnabled=e.target.checked; saveConfig(); applyConfig(); });
document.getElementById('cfgMusicEnabled')?.addEventListener('change', e=>{ config.musicEnabled=e.target.checked; saveConfig(); applyConfig(); });
document.getElementById('cfgSfxEnabled')?.addEventListener('change', e=>{ config.sfxEnabled=e.target.checked; saveConfig(); applyConfig(); });
document.getElementById('cfgVolume')?.addEventListener('input', e=>{ config.volume=parseInt(e.target.value); document.getElementById('cfgVolumeVal').textContent=config.volume+'%'; saveConfig(); applyConfig(); });
document.getElementById('cfgAnimations')?.addEventListener('change', e=>{ config.animations=e.target.checked; saveConfig(); applyConfig(); });
document.getElementById('cfgSizePlus')?.addEventListener('click', ()=>{ config.fontScale=Math.min(140, config.fontScale+10); saveConfig(); applyConfig(); });
document.getElementById('cfgSizeMinus')?.addEventListener('click', ()=>{ config.fontScale=Math.max(80, config.fontScale-10); saveConfig(); applyConfig(); });
document.getElementById('cfgFullscreen')?.addEventListener('click', ()=>{
  if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
});
document.getElementById('themeDark')?.addEventListener('click', ()=>{ config.theme='dark'; saveConfig(); applyConfig(); });
document.getElementById('themeLight')?.addEventListener('click', ()=>{ config.theme='light'; saveConfig(); applyConfig(); });
document.getElementById('testSound')?.addEventListener('click', ()=>{ playSfx('correct'); setTimeout(()=>playSfx('wrong'), 600); if(!musicPlaying && config.musicEnabled) tryPlayMusic(); });
document.getElementById('logoutBtn2')?.addEventListener('click', doLogout);
// activar musica al primer click del usuario (requerido por navegador)
document.addEventListener('click', function initAudioOnce(){
  if(config.soundEnabled && config.musicEnabled && !musicPlaying){
    // no autoplay agresivo, solo preparar AudioContext
    ensureAudioCtx();
  }
  document.removeEventListener('click', initAudioOnce);
}, {once:true});
window.addEventListener('keydown', (e)=>{
  if(e.key==='Escape' && document.fullscreenElement) document.exitFullscreen();
  if(e.key==='Escape' && document.getElementById('sideMenu')?.classList.contains('open')) closeSideMenu();
});
// ===== MENU LATERAL MOVIL + OPTIMIZACIONES =====
function openSideMenu(){ document.getElementById('sideMenu')?.classList.add('open'); document.getElementById('sideOverlay')?.classList.remove('hidden'); document.getElementById('sideMenu')?.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; updateSideUser(); }
function closeSideMenu(){ document.getElementById('sideMenu')?.classList.remove('open'); document.getElementById('sideOverlay')?.classList.add('hidden'); document.getElementById('sideMenu')?.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
function updateSideUser(){
  const el=document.getElementById('sideUserInfo');
  if(!el) return;
  if(!state.currentUser) el.innerHTML='<span style="color:var(--muted)">No has iniciado sesion</span>';
  else el.innerHTML=`<strong>${state.currentUser.nick}</strong><br><small>${state.currentUser.email}</small><br><small style="color:var(--muted)">${state.currentUser.cargo} - ${state.currentUser.puntaje||0} pts</small>`;
  // sincronizar active
  document.querySelectorAll('.side-link').forEach(b=>{
    const active=document.querySelector('.nav-btn.active')?.dataset.view;
    b.classList.toggle('active', b.dataset.view===active);
    b.style.display=(b.dataset.view==='admin' && (!state.currentUser || state.currentUser.cargo!=='Administrador'))?'none':'';
  });
}
document.getElementById('menuToggle')?.addEventListener('click', openSideMenu);
document.getElementById('sideClose')?.addEventListener('click', closeSideMenu);
document.getElementById('sideOverlay')?.addEventListener('click', closeSideMenu);
document.getElementById('sideLogout')?.addEventListener('click', ()=>{ closeSideMenu(); doLogout(); });
document.getElementById('sideMusicToggle')?.addEventListener('click', ()=>{
  if(musicPlaying){ config.musicEnabled=false; stopMusic(); }
  else { config.musicEnabled=true; if(config.soundEnabled) tryPlayMusic(); }
  saveConfig(); applyConfig();
});
document.querySelectorAll('.side-link').forEach(b=>{
  b.addEventListener('click', ()=>{
    const view=b.dataset.view;
    if(view==='admin' && (!state.currentUser || state.currentUser.cargo!=='Administrador')){ alert('Solo administradores'); return; }
    closeSideMenu();
    // pequeño delay para animacion
    setTimeout(()=> showView(view), 180);
  });
});
// optimizar rendimiento: debounce resize y throttling
let resizeTimer=null;
window.addEventListener('resize', ()=>{
  if(resizeTimer) clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    const c=document.getElementById('chartActividad');
    if(c && document.getElementById('view-estadisticas')?.classList.contains('active')) drawActividadChart();
  }, 250);
}, {passive:true});
// lazy: usar requestIdleCallback para stats
if('requestIdleCallback' in window){
  requestIdleCallback(()=>{ /* precarga diferida */ }, {timeout:2000});
}
// optimizar scroll con passive
document.addEventListener('touchstart', ()=>{}, {passive:true});
applyConfig();

// expose
window.showView = showView;
window.startQuiz = startQuiz;
window.renderEstadisticas = renderEstadisticas;
window.doLogout = doLogout;
window.playSfx = playSfx;
