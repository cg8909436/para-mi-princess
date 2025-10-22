// ====== Configuración ======
const TOTAL_TO_POP = 10;

// ====== Referencias DOM ======
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

// ====== Estado ======
let popped = 0;
let running = false;
let balloons = [];
let mouse = {x:0, y:0};

// ====== Utilidades ======
function rand(min, max){ return Math.random() * (max - min) + min; }
function clamp(n, min, max){ return Math.min(Math.max(n, min), max); }

// ====== Canvas de puntería ======
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

// ====== Crear globos ======
function spawnBalloons(count){
  const colors = ['color-1','color-2','color-3','color-4'];
  const pad = 20;
  for(let i=0;i<count;i++){
    const b = document.createElement('div');
    b.className = `balloon ${colors[i % colors.length]}`;
    b.style.left = `${rand(pad, ARENA.clientWidth - 68 - pad)}px`;
    b.style.top  = `${rand(pad+40, ARENA.clientHeight - 120)}px`;
    b.dataset.vx = rand(-0.4, 0.4).toFixed(3);
    b.dataset.vy = rand(-0.2, -0.6).toFixed(3); // flotan suavemente hacia arriba
    const shine = document.createElement('div'); shine.className = 'shine'; b.appendChild(shine);
    b.tabIndex = 0; // accesibilidad
    b.addEventListener('pointerdown', () => throwDartAt(b));
    ARENA.appendChild(b);
    balloons.push(b);
  }
}

// ====== Movimiento y rebotes sin atascarse ======
const EPS = 0.8;     // empujón mínimo tras rebotar
const VX_MAX = 0.9;  // límites de velocidad
const VY_MAX = 0.9;
const V_MIN = 0.15;  // velocidad mínima para despegar de paredes

function animate(){
  if(!running) return;
  const w = ARENA.clientWidth, h = ARENA.clientHeight;
  const bw = 68, bh = 86; // tamaño aproximado del globo

  balloons.forEach(b=>{
    if(b.classList.contains('popped')) return;

    let x = parseFloat(b.style.left);
    let y = parseFloat(b.style.top);
    let vx = parseFloat(b.dataset.vx);
    let vy = parseFloat(b.dataset.vy);

    // Atracción suave al cursor + flotación
    const cx = x + 34, cy = y + 43;
    const ax = (mouse.x - cx) * 0.0008;
    const ay = (mouse.y - cy) * 0.0006 - 0.0003; // leve tendencia hacia arriba

    vx += ax; vy += ay;

    // Limitar velocidad
    vx = clamp(vx, -VX_MAX, VX_MAX);
    vy = clamp(vy, -VY_MAX, VY_MAX);

    // Integración
    x += vx * 2.2;
    y += vy * 2.0;

    // Rebotes con corrección epsilon y velocidad mínima
    if(x < 6){
      x = 6 + EPS;
      vx = Math.abs(vx) < V_MIN ? V_MIN : Math.abs(vx);           // hacia derecha
    } else if(x > w - (bw + 6)){
      x = w - (bw + 6) - EPS;
      vx = Math.abs(vx) < V_MIN ? -V_MIN : -Math.abs(vx);         // hacia izquierda
    }

    if(y < 6){
      y = 6 + EPS;
      vy = Math.abs(vy) < V_MIN ? V_MIN : Math.abs(vy);           // hacia abajo
    } else if(y > h - (bh + 10)){
      y = h - (bh + 10) - EPS;
      vy = Math.abs(vy) < V_MIN ? -V_MIN : -Math.abs(vy);         // hacia arriba
    }

    // Guardar estado
    b.dataset.vx = vx.toFixed(3);
    b.dataset.vy = vy.toFixed(3);
    b.style.left = `${x}px`;
    b.style.top  = `${y}px`;
  });

  requestAnimationFrame(animate);
}

// ====== Interacción ======
ARENA.addEventListener('pointermove', e=>{
  const rect = ARENA.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

function throwDartAt(balloon){
  if(!running || balloon.classList.contains('popped')) return;
  // sonido de lanzamiento
  try{ sndThrow.currentTime = 0; sndThrow.play().catch(()=>{});}catch(e){}
  // impacto: click/tap sobre el globo
  popBalloon(balloon);

  // línea de tiro hacia el globo
  const rect = balloon.getBoundingClientRect();
  const arenaRect = ARENA.getBoundingClientRect();
  drawAimLine(rect.left - arenaRect.left + rect.width/2, rect.top - arenaRect.top + rect.height/2);
}

function relativeOrigin(el){
  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left + rect.width/2) / window.innerWidth,
    y: (rect.top + rect.height/2) / window.innerHeight
  };
}

function popBalloon(balloon){
  if(balloon.classList.contains('popped')) return;
  balloon.classList.add('popped');
  try{ sndPop.currentTime = 0; sndPop.play().catch(()=>{});}catch(e){}
  popped++;
  poppedCountEl.textContent = popped.toString();

  // mini confeti al explotar
  if(window.confetti){
    window.confetti({
      particleCount: 60,
      spread: 48,
      origin: relativeOrigin(balloon),
      scalar: 0.8,
      ticks: 140
    });
  }

  if(popped >= TOTAL_TO_POP){
    win();
  }
}

function win(){
  running = false;

  // confeti de celebración
  const burst = () => window.confetti && window.confetti({
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

// ====== Ciclo de juego ======
function start(){
  if(running) return;
  running = true;
  popped = 0;
  poppedCountEl.textContent = '0';
  dartsLeftEl.textContent = '∞';

  // limpiar globos anteriores
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

// ====== Listeners globales ======
window.addEventListener('resize', resizeCanvas);
startBtn.addEventListener('click', start);
resetBtn.addEventListener('click', reset);
playAgain.addEventListener('click', ()=>{ winModal.close(); start(); });

// Accesibilidad con teclado
ARENA.addEventListener('keydown', (e)=>{
  if(!running) return;
  if(e.key === 'Enter' || e.key === ' '){
    const el = document.activeElement;
    if(el?.classList?.contains('balloon')) popBalloon(el);
  }
});