/* ════════════════════════════════════════
   LIXO ELETRÔNICO — game.js (responsivo)
   ════════════════════════════════════════ */

const ITEMS = [
  // ── LINHA AZUL: pequenos eletrodomésticos e ferramentas ──
  { emoji: '🪛', name: 'Parafusadeira',   cat: 'azul'   },
  { emoji: '⛏️', name: 'Furadeira',        cat: 'azul'   },
  { emoji: '🥤', name: 'Liquidificador',   cat: 'azul'   },
  { emoji: '🔋', name: 'Batedeira',        cat: 'azul'   },
  { emoji: '🔌', name: 'Carregador',       cat: 'azul'   },
  { emoji: '🪚', name: 'Serra Elétrica',   cat: 'azul'   },
  // ── LINHA VERDE: informática e telefonia ──
  { emoji: '💻', name: 'Notebook',         cat: 'verde'  },
  { emoji: '🖨️', name: 'Impressora',      cat: 'verde'  },
  { emoji: '📱', name: 'Celular',          cat: 'verde'  },
  { emoji: '🖥️', name: 'Computador',      cat: 'verde'  },
  { emoji: '⌨️', name: 'Teclado',         cat: 'verde'  },
  { emoji: '🖱️', name: 'Mouse',           cat: 'verde'  },
  { emoji: '📠', name: 'Fax',             cat: 'verde'  },
  // ── LINHA MARROM: áudio e vídeo ──
  { emoji: '📺', name: 'Televisão',        cat: 'marrom' },
  { emoji: '🎮', name: 'Videogame',        cat: 'marrom' },
  { emoji: '📻', name: 'Rádio / Som',      cat: 'marrom' },
  { emoji: '🎧', name: 'Home Theater',     cat: 'marrom' },
  { emoji: '📹', name: 'Filmadora',        cat: 'marrom' },
  // ── LINHA BRANCA: grandes eletrodomésticos ──
  { emoji: '🧺', name: 'Máq. de Lavar',   cat: 'branca' },
  { emoji: '❄️', name: 'Geladeira',       cat: 'branca' },
  { emoji: '🍳', name: 'Fogão Elétrico',  cat: 'branca' },
  { emoji: '📡', name: 'Microondas',       cat: 'branca' },
  { emoji: '🫙', name: 'Lava-louças',     cat: 'branca' },
];

// ── Posição X do canhão por lixeira (0–100 % da largura) ──
const BIN_POSITIONS = { azul: 20, verde: 40, marrom: 60, branca: 80 };
const MAX_ERRORS    = 5;
const SCORE_MAX     = 200;  // preenche barra 100%

// ── Timer progressivo ──
const TIME_INITIAL  = 9000;  // ms no primeiro item
const TIME_MIN      = 3000;  // ms mínimo (nunca menos que isso)
const TIME_DECAY    = 150;   // ms reduzidos a cada acerto

// ── Pontuação por velocidade ──
// Acertou nos primeiros 33% do tempo = +20, meio = +10, último terço = +5
const SCORE_FAST    = 20;
const SCORE_MID     = 10;
const SCORE_SLOW    = 5;

// ── Referências DOM ──
const DOM = {
  scoreVal:     document.getElementById('score-val'),
  errorsVal:    document.getElementById('errors-val'),
  scoreFill:    document.getElementById('score-bar-fill'),
  scoreNumSide: document.getElementById('score-num-side'),
  overlay:      document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayMsg:   document.getElementById('overlay-msg'),
  overlayBtn:   document.getElementById('overlay-btn'),
  timerBar:     document.getElementById('timer-bar'),
  currentEmoji: document.getElementById('current-emoji'),
  itemName:     document.getElementById('item-name-label'),
  nextEmoji:    document.getElementById('next-emoji'),
  cannonCart:   document.getElementById('cannon-cart'),
  cannonBarrel: document.getElementById('cannon-barrel'),
  gameArea:     document.getElementById('game-area'),
};

// ── Estado ──
let state = {
  score: 0,
  errors: 0,
  running: false,
  locked: false,
  currentItem: null,
  nextItem: null,
  timerInterval: null,
  timeLeft: 0,
  timeMax: TIME_INITIAL,   // tempo atual (vai diminuindo)
  hits: 0,                 // acertos consecutivos (para reduzir timer)
  targetCat: null,
};

// ── Highscore persistido em localStorage ──
let highScore = parseInt(localStorage.getItem('lixo_highscore') || '0', 10);

// ── Detectar se é dispositivo touch ──
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ════════════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════════════
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ════════════════════════════════════════
//  VIDAS (corações)
// ════════════════════════════════════════
function updateLives() {
  for (let i = 0; i < MAX_ERRORS; i++) {
    const el = document.getElementById(`l${i}`);
    if (!el) continue;
    el.classList.toggle('dead', i >= (MAX_ERRORS - state.errors));
  }
}

// ════════════════════════════════════════
//  POSICIONAR CARRINHO DO CANHÃO
// ════════════════════════════════════════
function moveCannon(cat) {
  const pct = BIN_POSITIONS[cat] ?? 50;
  DOM.cannonCart.style.left = `${pct}%`;
}

function resetCannon() {
  DOM.cannonCart.style.left = '50%';
  DOM.cannonBarrel.style.transform = 'none';
}

// ════════════════════════════════════════
//  TIMER PROGRESSIVO
// ════════════════════════════════════════
function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = state.timeMax;
  DOM.timerBar.style.width      = '100%';
  DOM.timerBar.style.background = 'linear-gradient(to right, #1565c0, #00e5ff)';

  // Mostra o tempo atual no indicador de velocidade
  updateSpeedIndicator();

  const step = 80;
  state.timerInterval = setInterval(() => {
    state.timeLeft -= step;
    const pct = Math.max(0, (state.timeLeft / state.timeMax) * 100);
    DOM.timerBar.style.width = pct + '%';

    if (pct < 45) DOM.timerBar.style.background = 'linear-gradient(to right, #e65100, #ffd600)';
    if (pct < 20) DOM.timerBar.style.background = 'linear-gradient(to right, #b71c1c, #ff1744)';

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      if (!state.locked) onWrong(null);
    }
  }, step);
}

// Indicador de velocidade (mostra quanto tempo resta disponível)
function updateSpeedIndicator() {
  const el = document.getElementById('speed-indicator');
  if (!el) return;
  const secs = (state.timeMax / 1000).toFixed(1);
  el.textContent = `⏱ ${secs}s`;

  // Cor muda conforme a dificuldade aumenta
  if (state.timeMax <= 4000)      el.style.color = '#ff1744';
  else if (state.timeMax <= 6000) el.style.color = '#ffd600';
  else                             el.style.color = '#00e5ff';
}

// ════════════════════════════════════════
//  CARREGAR PRÓXIMO ITEM
// ════════════════════════════════════════
function loadNext() {
  if (!state.running) return;
  state.locked = false;

  state.currentItem = state.nextItem;
  state.nextItem    = rand(ITEMS);

  DOM.currentEmoji.textContent = state.currentItem.emoji;
  DOM.itemName.textContent     = state.currentItem.name.toUpperCase();
  DOM.nextEmoji.textContent    = state.nextItem.emoji;

  resetCannon();
  startTimer();
}

// ════════════════════════════════════════
//  ATIRAR
// ════════════════════════════════════════
function shoot(cat) {
  if (!state.running || state.locked || !state.currentItem) return;
  state.locked = true;
  clearInterval(state.timerInterval);

  const correct = cat === state.currentItem.cat;
  const binEl   = document.querySelector(`.bin-${cat} .bin-body`);

  // 1. Mover canhão para a lixeira
  moveCannon(cat);

  // 2. Inclinação do cano (leve)
  const tilt = (BIN_POSITIONS[cat] - 50) * 0.8;
  DOM.cannonBarrel.style.transform = `rotate(${tilt}deg)`;

  // 3. Disparar projétil após posicionar
  setTimeout(() => {
    fireProjectile(cat, binEl, correct);
  }, 240);
}

function fireProjectile(cat, binEl, correct) {
  const proj = document.createElement('div');
  proj.className = 'projectile';
  proj.textContent = state.currentItem.emoji;

  const ga   = DOM.gameArea.getBoundingClientRect();
  const cart = DOM.cannonCart.getBoundingClientRect();

  const startX = cart.left - ga.left + cart.width / 2 - 23;
  const startY = cart.top  - ga.top  + cart.height - 14;

  proj.style.left = startX + 'px';
  proj.style.top  = startY + 'px';

  DOM.gameArea.appendChild(proj);

  const br  = binEl.getBoundingClientRect();
  const endX = br.left - ga.left + br.width / 2 - 23;
  const endY = br.top  - ga.top  + br.height / 2 - 23;

  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 30;

  proj.animate([
    { left: startX + 'px', top: startY + 'px', opacity: 1,   transform: 'scale(1)'   },
    { left: midX   + 'px', top: midY   + 'px', opacity: 1,   transform: 'scale(1.1)' },
    { left: endX   + 'px', top: endY   + 'px', opacity: 0.1, transform: 'scale(0.7)' },
  ], { duration: 340, easing: 'ease-in', fill: 'forwards' });

  setTimeout(() => {
    proj.remove();
    if (correct) onCorrect(cat, binEl);
    else         onWrong(binEl);
  }, 360);
}

// ════════════════════════════════════════
//  RESULTADO — CORRETO
// ════════════════════════════════════════
function onCorrect(cat, binEl) {
  // ── Pontuação por velocidade ──
  const elapsed = state.timeMax - state.timeLeft;
  const ratio   = elapsed / state.timeMax; // 0 = respondeu rapidíssimo, 1 = no limite

  let pts, speedLabel, speedColor;
  if (ratio <= 0.33) {
    pts = SCORE_FAST; speedLabel = '⚡ RÁPIDO! +' + pts; speedColor = '#00e5ff';
  } else if (ratio <= 0.66) {
    pts = SCORE_MID;  speedLabel = '+' + pts;             speedColor = '#00ff88';
  } else {
    pts = SCORE_SLOW; speedLabel = '🐢 +' + pts;         speedColor = '#ffd600';
  }

  state.score += pts;
  state.hits++;

  DOM.scoreVal.textContent     = state.score;
  DOM.scoreNumSide.textContent = state.score;
  const pct = Math.min(100, (state.score / SCORE_MAX) * 100);
  DOM.scoreFill.style.height = pct + '%';

  // ── Timer progressivo: reduz a cada acerto ──
  state.timeMax = Math.max(TIME_MIN, state.timeMax - TIME_DECAY);

  binEl.classList.add('hit-correct');
  setTimeout(() => binEl.classList.remove('hit-correct'), 500);

  spawnParticles(binEl);
  spawnFloatScore(binEl, speedLabel, speedColor);

  setTimeout(loadNext, 420);
}

// ════════════════════════════════════════
//  RESULTADO — ERRADO / TEMPO ESGOTADO
// ════════════════════════════════════════
function onWrong(binEl) {
  state.errors++;
  DOM.errorsVal.textContent = state.errors;
  updateLives();

  if (binEl) {
    binEl.classList.add('hit-wrong');
    setTimeout(() => binEl.classList.remove('hit-wrong'), 450);
    spawnFloatScore(binEl, '✕ ERROU', '#ef5350');
  } else {
    spawnFloatScore(DOM.gameArea, '⏱ TEMPO!', '#ff9800', true);
  }

  if (state.errors >= MAX_ERRORS) {
    setTimeout(endGame, 350);
  } else {
    setTimeout(loadNext, 480);
  }
}

// ════════════════════════════════════════
//  EFEITOS VISUAIS
// ════════════════════════════════════════
function spawnParticles(el) {
  const ga = DOM.gameArea.getBoundingClientRect();
  const br = el.getBoundingClientRect();
  const cx = br.left - ga.left + br.width  / 2;
  const cy = br.top  - ga.top  + br.height / 2;
  const emojis = ['✨', '💫', '⭐', '🌟', '🎉'];

  for (let i = 0; i < 8; i++) {
    const p   = document.createElement('div');
    p.className = 'particle';
    p.textContent = rand(emojis);
    p.style.left  = cx + 'px';
    p.style.top   = cy + 'px';
    const ang  = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 70;
    p.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
    p.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
    DOM.gameArea.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function spawnFloatScore(el, text, color, centered = false) {
  const ga   = DOM.gameArea.getBoundingClientRect();
  const br   = el.getBoundingClientRect();
  const fs   = document.createElement('div');
  fs.className   = 'float-score';
  fs.textContent = text;
  fs.style.color      = color;
  fs.style.textShadow = `0 0 12px ${color}`;

  if (centered) {
    fs.style.left = '50%';
    fs.style.top  = '45%';
    fs.style.transform = 'translateX(-50%)';
  } else {
    fs.style.left = (br.left - ga.left + br.width  / 2 - 30) + 'px';
    fs.style.top  = (br.top  - ga.top  - 10) + 'px';
  }

  DOM.gameArea.appendChild(fs);
  setTimeout(() => fs.remove(), 1000);
}

// ════════════════════════════════════════
//  FIM DE JOGO
// ════════════════════════════════════════
function endGame() {
  state.running = false;
  clearInterval(state.timerInterval);
  resetCannon();

  // Salva highscore
  const isNewRecord = state.score > highScore;
  if (isNewRecord) {
    highScore = state.score;
    localStorage.setItem('lixo_highscore', highScore);
  }

  // Ícone e título conforme pontuação
  let star, titulo, corTitulo;
  if (state.score >= 200)      { star = '🏆'; titulo = 'INCRÍVEL!';    corTitulo = '#ffd600'; }
  else if (state.score >= 120) { star = '🥈'; titulo = 'MUITO BOM!';   corTitulo = '#00e5ff'; }
  else if (state.score >= 60)  { star = '♻️'; titulo = 'FIM DE JOGO!'; corTitulo = '#00ff88'; }
  else                          { star = '💀'; titulo = 'TENTE DE NOVO!'; corTitulo = '#ef5350'; }

  DOM.overlayTitle.textContent      = titulo;
  DOM.overlayTitle.style.color      = corTitulo;
  DOM.overlayTitle.style.textShadow = `0 0 24px ${corTitulo}, 0 0 60px ${corTitulo}40`;
  document.getElementById('overlay-icon').textContent = star;

  // Tempo médio por item
  const avgTime = state.hits > 0
    ? ((TIME_INITIAL - state.timeMax) / TIME_DECAY).toFixed(0)
    : 0;

  DOM.overlayMsg.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%">

      <!-- Pontuação principal -->
      <div style="font-family:'Orbitron',monospace;font-size:clamp(36px,8vw,58px);
        color:#00ff88;text-shadow:0 0 24px #00ff88;line-height:1">
        ${state.score}
      </div>
      <div style="color:#546e7a;font-size:13px;letter-spacing:2px;margin-top:-6px">PONTOS</div>

      <!-- Linha divisória -->
      <div style="width:80%;height:1px;background:linear-gradient(to right,transparent,#1e3356,transparent);margin:4px 0"></div>

      <!-- Stats em linha -->
      <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-family:'Orbitron',monospace;font-size:22px;color:#ffd600">${state.hits}</div>
          <div style="color:#546e7a;font-size:10px;letter-spacing:1px">ACERTOS</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Orbitron',monospace;font-size:22px;color:#ef5350">${state.errors}</div>
          <div style="color:#546e7a;font-size:10px;letter-spacing:1px">ERROS</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Orbitron',monospace;font-size:22px;color:#00e5ff">${(state.timeMax/1000).toFixed(1)}s</div>
          <div style="color:#546e7a;font-size:10px;letter-spacing:1px">TEMPO FINAL</div>
        </div>
      </div>

      <!-- Linha divisória -->
      <div style="width:80%;height:1px;background:linear-gradient(to right,transparent,#1e3356,transparent);margin:4px 0"></div>

      <!-- Highscore -->
      <div style="text-align:center">
        ${isNewRecord
          ? `<div style="font-family:'Orbitron',monospace;font-size:13px;color:#ffd600;
              text-shadow:0 0 12px #ffd600;letter-spacing:2px;animation:pulse 0.8s ease infinite alternate">
              🏆 NOVO RECORDE!
             </div>`
          : `<div style="color:#546e7a;font-size:12px;letter-spacing:1px">
              RECORDE: <span style="color:#ffd600;font-family:'Orbitron',monospace">${highScore}</span>
             </div>`
        }
      </div>
    </div>
  `;

  DOM.overlayBtn.textContent = '▶ JOGAR NOVAMENTE';
  DOM.overlay.style.display = 'flex';
}

// ════════════════════════════════════════
//  INICIAR JOGO
// ════════════════════════════════════════
function startGame() {
  state.score   = 0;
  state.errors  = 0;
  state.running = true;
  state.locked  = false;
  state.hits    = 0;
  state.timeMax = TIME_INITIAL;  // reseta o timer progressivo

  DOM.scoreVal.textContent      = 0;
  DOM.scoreNumSide.textContent  = 0;
  DOM.errorsVal.textContent     = 0;
  DOM.scoreFill.style.height    = '0%';
  DOM.overlay.style.display     = 'none';

  updateLives();
  updateSpeedIndicator();

  state.nextItem = rand(ITEMS);
  loadNext();
}

// ── Hover nas lixeiras — apenas em dispositivos não-touch ──
if (!isTouch) {
  document.querySelectorAll('.bin').forEach(bin => {
    const cat = bin.dataset.cat;
    bin.addEventListener('mouseenter', () => {
      if (!state.running || state.locked) return;
      moveCannon(cat);
    });
    bin.addEventListener('mouseleave', () => {
      if (!state.running || state.locked) return;
      resetCannon();
    });
  });
}

// ── Expor função de shoot globalmente (chamada pelo onclick do HTML) ──
window.Game = { shoot, start: startGame };