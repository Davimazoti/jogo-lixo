/* ════════════════════════════════════════
   LIXO ELETRÔNICO — game.js
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
const TIME_MAX      = 9000; // ms
const SCORE_MAX     = 200;  // preenche barra 100%

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
  targetCat: null,   // lixeira alvo (usado apenas para posicionamento)
};

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
//  TIMER
// ════════════════════════════════════════
function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = TIME_MAX;
  DOM.timerBar.style.width   = '100%';
  DOM.timerBar.style.background = 'linear-gradient(to right, #1565c0, #00e5ff)';

  const step = 80;
  state.timerInterval = setInterval(() => {
    state.timeLeft -= step;
    const pct = Math.max(0, (state.timeLeft / TIME_MAX) * 100);
    DOM.timerBar.style.width = pct + '%';

    if (pct < 45) DOM.timerBar.style.background = 'linear-gradient(to right, #e65100, #ffd600)';
    if (pct < 20) DOM.timerBar.style.background = 'linear-gradient(to right, #b71c1c, #ff1744)';

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      if (!state.locked) onWrong(null);
    }
  }, step);
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
  // Criar projétil na ponta do canhão
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

  // Destino: centro da lixeira
  const br  = binEl.getBoundingClientRect();
  const endX = br.left - ga.left + br.width / 2 - 23;
  const endY = br.top  - ga.top  + br.height / 2 - 23;

  // Animação parabólica via Web Animations API
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
  state.score += 10;
  DOM.scoreVal.textContent     = state.score;
  DOM.scoreNumSide.textContent = state.score;
  const pct = Math.min(100, (state.score / SCORE_MAX) * 100);
  DOM.scoreFill.style.height = pct + '%';

  binEl.classList.add('hit-correct');
  setTimeout(() => binEl.classList.remove('hit-correct'), 500);

  spawnParticles(binEl);
  spawnFloatScore(binEl, '+10', '#00ff88');

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
    // tempo esgotado — mostrar na tela
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

  const star = state.score >= 150 ? '🏆' : state.score >= 80 ? '🥈' : '♻️';
  DOM.overlayTitle.textContent     = 'FIM DE JOGO!';
  DOM.overlayTitle.style.color     = '#ffd600';
  DOM.overlayTitle.style.textShadow = '0 0 24px #ffd600, 0 0 60px #ffd60040';
  document.getElementById('overlay-icon').textContent = star;
  DOM.overlayMsg.innerHTML = `
    Pontuação final:<br>
    <span style="font-family:'Orbitron',monospace;font-size:46px;color:#00ff88;
    text-shadow:0 0 20px #00ff88">${state.score}</span><br>
    Erros: <strong>${state.errors}</strong> de ${MAX_ERRORS}
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

  DOM.scoreVal.textContent      = 0;
  DOM.scoreNumSide.textContent  = 0;
  DOM.errorsVal.textContent     = 0;
  DOM.scoreFill.style.height    = '0%';
  DOM.overlay.style.display     = 'none';

  updateLives();

  state.nextItem = rand(ITEMS);
  loadNext();
}

// ── Hover nas lixeiras: apenas move o canhão (sem linha tracejada) ──
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

// ── Expor função de shoot globalmente (chamada pelo onclick do HTML) ──
window.Game = { shoot, start: startGame };