// Configuración
const TOTAL_TO_POP = 10;
const ARENA = document.getElementById('arena');
const dartsLeftEl = document.getElementById('dartsLeft');
const poppedCountEl = document.getElementById('poppedCount');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const aimCanvas = document.getElementById('aim');
const winModal = document.getElementById('winModal');
const playAgain = document.getElementById('playAgain');
const sndThrow = document.getElementById('sndThrow');
const sndPop = document.getElementById('sndPop');

let popped = 0;
let running = false;
let balloons = [];
let mouse = {x:0, y:0};

function rand(min, max){ return Math.random() * (max - min) + min; }

// Crear globos
function spawnBalloons(count){
  const colors = ['color-1','color-2','color-3','color-4'];
  const pad = 20;
  for(let i=0;i<count;i++){
    const b = document.createElement('div');
    b.className = `balloon ${colors[i % colors.length]}`;
    b.style.left = `${rand(pad, ARENA.clientWidth - 68 - pad)}px`;
    b.style.top  = `${rand(pad+40, ARENA.clientHeight - 120)}px`;
    b.dataset.vx = rand(-0.4, 0.4).toFixed(3);
    b.dataset.vy = rand(-0.2, -0.6).toFixed(3); // flotan levemente hacia arriba
    const shine = document.createElement('div'); shine.className = 'shine'; b.appendChild(shine);
    b.addEventListener('pointerdown', () => throwDartAt(b));
    ARENA.appendChild(b);
    balloons.push(b);
  }
}

// Animación suave
function animate(){
  if(!running) return;
  const w = ARENA.clientWidth, h = ARENA.clientHeight;
  balloons.forEach(b=>{
    if(b.classList.contains('popped')) return;
    let x = parseFloat(b.style.left);
    let y = parseFloat(b.style.top);
    let vx = parseFloat(b.dataset.vx);
    let vy = parseFloat(b.dataset.vy);

    // Atracción ligera hacia el cursor para que sea más romántico/interactivo
    const cx = x + 34, cy = y + 43;
    const ax = (mouse.x - cx) * 0.0008;
    const ay = (mouse.y - cy) * 0.0006;

    vx += ax; vy += ay - 0.0003; // leve subida
    vx = Math.max(-0.8, Math.min(0.8, vx));
    vy = Math.max(-0.9, Math.min(0.3, vy));

    x += vx * 2.2; y += vy * 2.0;

    // Rebotes suaves en bordes
    if(x < 6){ x = 6; vx = Math.abs(vx); }
    if(x > w - 74){ x = w - 74; vx = -Math.abs(vx); }
    if(y < 6){ y = 6; vy = Math.abs(vy); }
    if(y > h - 96){ y = h - 96; vy = -Math.abs(vy); }

    b.dataset.vx = vx.toFixed(3);
    b.dataset.vy = vy.toFixed(3);
    b.style.left = `${x}px`; b.style.top = `${y}px`;
  });
  requestAnimationFrame(animate);
}

// Dibujo de línea de dardo en canvas para feedback
const ctx = aimCanvas.getContext('2d');
function resizeCanvas(){
  aimCanvas.width = ARENA.clientWidth;
  aimCanvas.height = ARENA.clientHeight;
}
function drawAimLine(x,y){
  ctx.clearRect(0,0,aimCanvas.width,aimCanvas.height);
  ctx.strokeStyle = 'rgba(255, 110, 166, .55)'; // rosa
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(aimCanvas.width/2, aimCanvas.height);
  ctx.lineTo(x,y);
  ctx.stroke();
  setTimeout(()=>ctx.clearRect(0,0,aimCanvas.width,aimCanvas.height), 140);
}

ARENA.addEventListener('pointermove', e=>{
  const rect = ARENA.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

function throwDartAt(balloon){
  if(!running || balloon.classList.contains('popped')) return;
  // sonido de lanzamiento (silencioso si el recurso es vacío)
  try{ sndThrow.currentTime = 0; sndThrow.play().catch(()=>{});}catch(e){}
  // chequeo de impacto inmediato (click sobre globo)
  popBalloon(balloon);
  // línea de tiro
  const rect = balloon.getBoundingClientRect();
  const arenaRect = ARENA.getBoundingClientRect();
  drawAimLine(rect.left - arenaRect.left + rect.width/2, rect.top - arenaRect.top + rect.height/2);
}

function popBalloon(balloon){
  if(balloon.classList.contains('popped')) return;
  balloon.classList.add('popped');
  try{ sndPop.currentTime = 0; sndPop.play().catch(()=>{});}catch(e){}
  popped++;
  poppedCountEl.textContent = popped.toString();

  // mini confeti en cada pop
  confetti({
    particleCount: 60,
    spread: 48,
    origin: relativeOrigin(balloon),
    scalar: 0.8,
    ticks: 140
  });

  if(popped >= TOTAL_TO_POP){
    win();
  }
}

function relativeOrigin(el){
  const rect = el.getBoundingClientRect();
  const a = ARENA.getBoundingClientRect();
  // convertir a 0-1 relativo a la pantalla
  return {
    x: (rect.left + rect.width/2) / window.innerWidth,
    y: (rect.top + rect.height/2) / window.innerHeight
  };
}

function win(){
  running = false;
  // confeti de celebración
  const burst = () => confetti({
    particleCount: 180,
    spread: 70,
    origin: { x: 0.5, y: 0.3 },
    scalar: 1.1
  });
  burst(); setTimeout(burst, 300); setTimeout(burst, 600);

  // mostrar premio y mensaje
  winModal.showModal();
  resetBtn.hidden = false;
}

function start(){
  if(running) return;
  running = true;
  popped = 0;
  poppedCountEl.textContent = '0';
  dartsLeftEl.textContent = '∞';

  // limpiar
  balloons.forEach(b=>b.remove());
  balloons = [];
  resizeCanvas();
  spawnBalloons(TOTAL_TO_POP);
  requestAnimationFrame(animate);
}

function reset(){
  running = false;
  balloons.forEach(b=>b.remove());
  balloons = [];
  popped = 0;
  poppedCountEl.textContent = '0';
  winModal.close();
  resetBtn.hidden = true;
  ctx.clearRect(0,0,aimCanvas.width,aimCanvas.height);
}

window.addEventListener('resize', resizeCanvas);
startBtn.addEventListener('click', start);
resetBtn.addEventListener('click', reset);
playAgain.addEventListener('click', ()=>{ winModal.close(); start(); });

/* Accesibilidad: también permite teclado (Enter/Space) sobre globos con foco */
ARENA.addEventListener('keydown', (e)=>{
  if(!running) return;
  if(e.key === 'Enter' || e.key === ' '){
    const el = document.activeElement;
    if(el?.classList?.contains('balloon')) popBalloon(el);
  }
});