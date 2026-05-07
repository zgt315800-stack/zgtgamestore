const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const statusText = document.querySelector("#statusText");
const turnChip = document.querySelector("#turnChip");
const moveCount = document.querySelector("#moveCount");
const blackScore = document.querySelector("#blackScore");
const whiteScore = document.querySelector("#whiteScore");
const undoBtn = document.querySelector("#undoBtn");
const restartBtn = document.querySelector("#restartBtn");
const localModeBtn = document.querySelector("#localModeBtn");
const aiModeBtn = document.querySelector("#aiModeBtn");
const aiPanel = document.querySelector("#aiPanel");
const playerBlackBtn = document.querySelector("#playerBlackBtn");
const playerWhiteBtn = document.querySelector("#playerWhiteBtn");
const localAiBtn = document.querySelector("#localAiBtn");
const llmAiBtn = document.querySelector("#llmAiBtn");
const localLevelSettings = document.querySelector("#localLevelSettings");
const noviceAiBtn = document.querySelector("#noviceAiBtn");
const normalAiBtn = document.querySelector("#normalAiBtn");
const hardAiBtn = document.querySelector("#hardAiBtn");
const expertAiBtn = document.querySelector("#expertAiBtn");
const llmSettings = document.querySelector("#llmSettings");
const llmEndpoint = document.querySelector("#llmEndpoint");
const llmApiKey = document.querySelector("#llmApiKey");

const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const LOCAL_MODE = "local";
const AI_MODE = "ai";
const LOCAL_AI = "local";
const LLM_AI = "llm";
const NOVICE_LEVEL = "novice";
const NORMAL_LEVEL = "normal";
const HARD_LEVEL = "hard";
const EXPERT_LEVEL = "expert";
const AI_DELAY = 420;
const LOCAL_LEVELS = {
  [NOVICE_LEVEL]: { label: "新手", attackWeight: 0.82, defenseWeight: 0.5, candidateLimit: 14, lookAhead: false, mistakeRate: 0.26 },
  [NORMAL_LEVEL]: { label: "普通", attackWeight: 1.12, defenseWeight: 1, candidateLimit: 999, lookAhead: false, mistakeRate: 0 },
  [HARD_LEVEL]: { label: "困难", attackWeight: 1.22, defenseWeight: 1.18, candidateLimit: 999, lookAhead: false, mistakeRate: 0 },
  [EXPERT_LEVEL]: { label: "专家", attackWeight: 1.3, defenseWeight: 1.28, candidateLimit: 18, lookAhead: true, mistakeRate: 0 },
};
const STAR_POINTS = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

let board = createBoard();
let currentPlayer = BLACK;
let moves = [];
let winner = EMPTY;
let score = { [BLACK]: 0, [WHITE]: 0 };
let hoverPoint = null;
let gameMode = LOCAL_MODE;
let playerColor = BLACK;
let aiDifficulty = LOCAL_AI;
let localAiLevel = NORMAL_LEVEL;
let aiThinking = false;
let aiTimer = null;
let aiMessage = "";

function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

function boardMetrics() {
  const size = canvas.width;
  const padding = size * 0.065;
  const cell = (size - padding * 2) / (BOARD_SIZE - 1);
  return { size, padding, cell };
}

function drawBoard() {
  const { size, padding, cell } = boardMetrics();
  ctx.clearRect(0, 0, size, size);

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#efc77d");
  gradient.addColorStop(0.52, "#d6a85d");
  gradient.addColorStop(1, "#bf873d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(62, 37, 12, 0.72)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  for (let i = 0; i < BOARD_SIZE; i += 1) {
    const position = padding + i * cell;
    ctx.beginPath();
    ctx.moveTo(padding, position);
    ctx.lineTo(size - padding, position);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(position, padding);
    ctx.lineTo(position, size - padding);
    ctx.stroke();
  }

  STAR_POINTS.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(62, 37, 12, 0.84)";
    ctx.arc(padding + x * cell, padding + y * cell, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });

  drawHover();
  drawStones();
}

function drawHover() {
  if (!hoverPoint || winner || isInputLocked()) return;
  const { padding, cell } = boardMetrics();
  const [x, y] = hoverPoint;
  if (board[y][x] !== EMPTY) return;

  ctx.beginPath();
  ctx.fillStyle = currentPlayer === BLACK ? "rgba(12, 14, 18, 0.18)" : "rgba(255, 255, 255, 0.42)";
  ctx.arc(padding + x * cell, padding + y * cell, cell * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

function drawStones() {
  const { padding, cell } = boardMetrics();
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (board[y][x] !== EMPTY) {
        drawStone(x, y, board[y][x], cell, padding);
      }
    }
  }
}

function drawStone(x, y, player, cell, padding) {
  const centerX = padding + x * cell;
  const centerY = padding + y * cell;
  const radius = cell * 0.39;
  const gradient = ctx.createRadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.35,
    radius * 0.1,
    centerX,
    centerY,
    radius,
  );

  if (player === BLACK) {
    gradient.addColorStop(0, "#62666b");
    gradient.addColorStop(0.55, "#17191d");
    gradient.addColorStop(1, "#030405");
  } else {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.65, "#eceff1");
    gradient.addColorStop(1, "#b8bec3");
  }

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = radius * 0.35;
  ctx.shadowOffsetY = radius * 0.18;
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (player === WHITE) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
    ctx.lineWidth = 1.4;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function getPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const { padding, cell } = boardMetrics();
  const clientX = event.touches?.[0]?.clientX ?? event.clientX;
  const clientY = event.touches?.[0]?.clientY ?? event.clientY;
  const x = ((clientX - rect.left) * scale - padding) / cell;
  const y = ((clientY - rect.top) * scale - padding) / cell;
  const boardX = Math.round(x);
  const boardY = Math.round(y);

  if (boardX < 0 || boardX >= BOARD_SIZE || boardY < 0 || boardY >= BOARD_SIZE) {
    return null;
  }

  const exactX = padding + boardX * cell;
  const exactY = padding + boardY * cell;
  const dx = (clientX - rect.left) * scale - exactX;
  const dy = (clientY - rect.top) * scale - exactY;
  if (Math.hypot(dx, dy) > cell * 0.46) return null;

  return [boardX, boardY];
}

function placeStone(point, options = {}) {
  if (!point || winner || (!options.byAi && isInputLocked())) return;
  const [x, y] = point;
  if (board[y][x] !== EMPTY) return;

  board[y][x] = currentPlayer;
  moves.push({ x, y, player: currentPlayer });

  if (hasWon(x, y, currentPlayer)) {
    winner = currentPlayer;
    score[currentPlayer] += 1;
  } else if (moves.length === BOARD_SIZE * BOARD_SIZE) {
    winner = -1;
  } else {
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
  }

  updateUi();
  drawBoard();

  if (!winner && shouldAiMove()) {
    scheduleAiMove();
  }
}

function hasWon(x, y, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.some(([dx, dy]) => {
    const count = 1 + countDirection(x, y, dx, dy, player) + countDirection(x, y, -dx, -dy, player);
    return count >= 5;
  });
}

function countDirection(x, y, dx, dy, player) {
  let count = 0;
  let nextX = x + dx;
  let nextY = y + dy;

  while (
    nextX >= 0 &&
    nextX < BOARD_SIZE &&
    nextY >= 0 &&
    nextY < BOARD_SIZE &&
    board[nextY][nextX] === player
  ) {
    count += 1;
    nextX += dx;
    nextY += dy;
  }

  return count;
}

function isInputLocked() {
  return aiThinking || shouldAiMove();
}

function aiColor() {
  return playerColor === BLACK ? WHITE : BLACK;
}

function shouldAiMove() {
  return gameMode === AI_MODE && currentPlayer === aiColor() && winner === EMPTY;
}

function scheduleAiMove() {
  aiThinking = true;
  aiMessage = aiDifficulty === LLM_AI ? "大模型 AI 正在思考" : `${LOCAL_LEVELS[localAiLevel].label} AI 正在思考`;
  updateUi();
  drawBoard();
  clearTimeout(aiTimer);
  aiTimer = setTimeout(async () => {
    const point = await chooseAiMove();
    aiThinking = false;
    if (point) {
      placeStone(point, { byAi: true });
    } else {
      aiMessage = "AI 暂时没有可落子位置";
      updateUi();
      drawBoard();
    }
  }, AI_DELAY);
}

async function chooseAiMove() {
  if (aiDifficulty === LLM_AI) {
    return chooseLlmMove();
  }
  return chooseLocalAiMove();
}

function chooseLocalAiMove() {
  const config = LOCAL_LEVELS[localAiLevel];
  const candidates = getCandidateMoves();
  const rankedMoves = rankLocalMoves(candidates, config);

  if (localAiLevel === NOVICE_LEVEL && rankedMoves.length > 2 && Math.random() < config.mistakeRate) {
    const loosePick = rankedMoves.slice(1, Math.min(rankedMoves.length, 6));
    return loosePick[Math.floor(Math.random() * loosePick.length)].point;
  }

  return rankedMoves[0]?.point ?? null;
}

function rankLocalMoves(candidates, config) {
  const ai = aiColor();
  const player = playerColor;
  const center = Math.floor(BOARD_SIZE / 2);
  const rankedMoves = [];

  for (const [x, y] of candidates) {
    if (wouldWinAt(x, y, ai)) {
      rankedMoves.push({ point: [x, y], score: 1_000_000 });
      continue;
    }

    if (wouldWinAt(x, y, player)) {
      rankedMoves.push({ point: [x, y], score: 900_000 });
      continue;
    }

    const distanceToCenter = Math.abs(x - center) + Math.abs(y - center);
    const attackScore = scoreMove(x, y, ai);
    const defenseScore = scoreMove(x, y, player);
    const threatScore =
      localAiLevel === HARD_LEVEL || localAiLevel === EXPERT_LEVEL
        ? scoreThreatsAfterMove(x, y, ai) * 1.1 + scoreThreatsAfterMove(x, y, player)
        : 0;
    const total =
      attackScore * config.attackWeight +
      defenseScore * config.defenseWeight +
      threatScore +
      (BOARD_SIZE - distanceToCenter) * 3;

    rankedMoves.push({ point: [x, y], score: total });
  }

  rankedMoves.sort((a, b) => b.score - a.score);

  if (config.lookAhead) {
    return rankedMoves
      .slice(0, config.candidateLimit)
      .map((move) => ({ ...move, score: move.score - bestOpponentReplyScore(move.point) * 0.86 }))
      .sort((a, b) => b.score - a.score);
  }

  return rankedMoves.slice(0, config.candidateLimit);
}

function bestOpponentReplyScore(point) {
  const [x, y] = point;
  const ai = aiColor();
  const player = playerColor;
  board[y][x] = ai;
  const replies = getCandidateMoves();
  let bestScore = 0;

  for (const [replyX, replyY] of replies) {
    if (wouldWinAt(replyX, replyY, player)) {
      bestScore = 1_000_000;
      break;
    }

    const replyScore = scoreMove(replyX, replyY, player) + scoreThreatsAfterMove(replyX, replyY, player) * 1.7;
    if (replyScore > bestScore) {
      bestScore = replyScore;
    }
  }

  board[y][x] = EMPTY;
  return bestScore;
}

function scoreThreatsAfterMove(x, y, player) {
  board[y][x] = player;
  const patterns = analyzePointThreats(x, y, player);
  board[y][x] = EMPTY;
  return patterns.openFour * 90000 + patterns.closedFour * 24000 + patterns.openThree * 8500 + patterns.closedThree * 1600;
}

function analyzePointThreats(x, y, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  const result = { openFour: 0, closedFour: 0, openThree: 0, closedThree: 0 };

  for (const [dx, dy] of directions) {
    const forward = scanLine(x, y, dx, dy, player);
    const backward = scanLine(x, y, -dx, -dy, player);
    const stones = 1 + forward.stones + backward.stones;
    const openEnds = Number(forward.open) + Number(backward.open);

    if (stones >= 4 && openEnds === 2) result.openFour += 1;
    else if (stones >= 4 && openEnds === 1) result.closedFour += 1;
    else if (stones === 3 && openEnds === 2) result.openThree += 1;
    else if (stones === 3 && openEnds === 1) result.closedThree += 1;
  }

  return result;
}

async function chooseLlmMove() {
  const fallbackMove = chooseLocalAiMove();
  const endpoint = llmEndpoint.value.trim();

  if (!endpoint) {
    aiMessage = "未连接大模型服务，已用本地 AI 代走";
    return fallbackMove;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(llmApiKey.value.trim() ? { Authorization: `Bearer ${llmApiKey.value.trim()}` } : {}),
      },
      body: JSON.stringify({
        board,
        boardSize: BOARD_SIZE,
        aiColor: aiColor() === BLACK ? "black" : "white",
        playerColor: playerColor === BLACK ? "black" : "white",
        legalMoves: getCandidateMoves().map(([x, y]) => ({ x, y })),
        lastMoves: moves.slice(-12),
        expectedResponse: { x: 7, y: 7 },
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const move = await response.json();
    const point = normalizeLlmMove(move);
    if (point) {
      aiMessage = "";
      return point;
    }
    throw new Error("Invalid move");
  } catch (error) {
    aiMessage = "大模型服务不可用，已用本地 AI 代走";
    return fallbackMove;
  }
}

function normalizeLlmMove(move) {
  const x = Number(move?.x);
  const y = Number(move?.y);
  if (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < BOARD_SIZE &&
    y >= 0 &&
    y < BOARD_SIZE &&
    board[y][x] === EMPTY
  ) {
    return [x, y];
  }
  return null;
}

function getCandidateMoves() {
  if (moves.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2);
    return [[center, center]];
  }

  const seen = new Set();
  const candidates = [];

  for (const move of moves) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const x = move.x + dx;
        const y = move.y + dy;
        const key = `${x},${y}`;
        if (
          x >= 0 &&
          x < BOARD_SIZE &&
          y >= 0 &&
          y < BOARD_SIZE &&
          board[y][x] === EMPTY &&
          !seen.has(key)
        ) {
          seen.add(key);
          candidates.push([x, y]);
        }
      }
    }
  }

  return candidates;
}

function wouldWinAt(x, y, player) {
  board[y][x] = player;
  const won = hasWon(x, y, player);
  board[y][x] = EMPTY;
  return won;
}

function scoreMove(x, y, player) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.reduce((total, [dx, dy]) => {
    const forward = scanLine(x, y, dx, dy, player);
    const backward = scanLine(x, y, -dx, -dy, player);
    const stones = 1 + forward.stones + backward.stones;
    const openEnds = Number(forward.open) + Number(backward.open);
    return total + lineScore(stones, openEnds);
  }, 0);
}

function scanLine(x, y, dx, dy, player) {
  let stones = 0;
  let nextX = x + dx;
  let nextY = y + dy;

  while (
    nextX >= 0 &&
    nextX < BOARD_SIZE &&
    nextY >= 0 &&
    nextY < BOARD_SIZE &&
    board[nextY][nextX] === player
  ) {
    stones += 1;
    nextX += dx;
    nextY += dy;
  }

  const open =
    nextX >= 0 &&
    nextX < BOARD_SIZE &&
    nextY >= 0 &&
    nextY < BOARD_SIZE &&
    board[nextY][nextX] === EMPTY;

  return { stones, open };
}

function lineScore(stones, openEnds) {
  if (stones >= 5) return 120000;
  if (stones === 4 && openEnds === 2) return 30000;
  if (stones === 4 && openEnds === 1) return 9000;
  if (stones === 3 && openEnds === 2) return 3600;
  if (stones === 3 && openEnds === 1) return 900;
  if (stones === 2 && openEnds === 2) return 420;
  if (stones === 2 && openEnds === 1) return 120;
  if (stones === 1 && openEnds === 2) return 24;
  return 2;
}

function updateUi() {
  moveCount.textContent = String(moves.length);
  blackScore.textContent = String(score[BLACK]);
  whiteScore.textContent = String(score[WHITE]);
  undoBtn.disabled = moves.length === 0 || winner !== EMPTY || aiThinking;
  localModeBtn.classList.toggle("active", gameMode === LOCAL_MODE);
  aiModeBtn.classList.toggle("active", gameMode === AI_MODE);
  localModeBtn.setAttribute("aria-pressed", String(gameMode === LOCAL_MODE));
  aiModeBtn.setAttribute("aria-pressed", String(gameMode === AI_MODE));
  aiPanel.classList.toggle("visible", gameMode === AI_MODE);
  localLevelSettings.classList.toggle("hidden", aiDifficulty !== LOCAL_AI);
  llmSettings.classList.toggle("visible", gameMode === AI_MODE && aiDifficulty === LLM_AI);
  playerBlackBtn.classList.toggle("active", playerColor === BLACK);
  playerWhiteBtn.classList.toggle("active", playerColor === WHITE);
  playerBlackBtn.setAttribute("aria-pressed", String(playerColor === BLACK));
  playerWhiteBtn.setAttribute("aria-pressed", String(playerColor === WHITE));
  localAiBtn.classList.toggle("active", aiDifficulty === LOCAL_AI);
  llmAiBtn.classList.toggle("active", aiDifficulty === LLM_AI);
  localAiBtn.setAttribute("aria-pressed", String(aiDifficulty === LOCAL_AI));
  llmAiBtn.setAttribute("aria-pressed", String(aiDifficulty === LLM_AI));
  updateLevelButton(noviceAiBtn, NOVICE_LEVEL);
  updateLevelButton(normalAiBtn, NORMAL_LEVEL);
  updateLevelButton(hardAiBtn, HARD_LEVEL);
  updateLevelButton(expertAiBtn, EXPERT_LEVEL);

  turnChip.classList.toggle("win", winner !== EMPTY);
  const preview = turnChip.querySelector(".stone-preview");
  preview.className = `stone-preview ${currentPlayer === BLACK ? "black" : "white"}`;

  if (winner === BLACK || winner === WHITE) {
    preview.className = `stone-preview ${winner === BLACK ? "black" : "white"}`;
    statusText.textContent = `${winner === BLACK ? "黑棋" : "白棋"}获胜`;
  } else if (winner === -1) {
    statusText.textContent = "平局";
  } else if (aiThinking) {
    statusText.textContent = aiMessage;
  } else if (aiMessage) {
    statusText.textContent = aiMessage;
  } else if (gameMode === AI_MODE) {
    statusText.textContent =
      currentPlayer === playerColor
        ? `你执${playerColor === BLACK ? "黑" : "白"}落子`
        : `${aiDifficulty === LLM_AI ? "大模型 AI" : `${LOCAL_LEVELS[localAiLevel].label} AI`}执${aiColor() === BLACK ? "黑" : "白"}落子`;
  } else {
    statusText.textContent = `${currentPlayer === BLACK ? "黑棋" : "白棋"}落子`;
  }
}

function updateLevelButton(button, level) {
  button.classList.toggle("active", localAiLevel === level);
  button.setAttribute("aria-pressed", String(localAiLevel === level));
}

function undoMove() {
  if (moves.length === 0 || winner !== EMPTY || aiThinking) return;
  const undoCount = gameMode === AI_MODE ? Math.min(2, moves.length) : 1;
  aiMessage = "";

  for (let i = 0; i < undoCount; i += 1) {
    const lastMove = moves.pop();
    if (!lastMove) break;
    board[lastMove.y][lastMove.x] = EMPTY;
    currentPlayer = lastMove.player;
  }

  updateUi();
  drawBoard();
}

function restartGame(options = {}) {
  clearTimeout(aiTimer);
  board = createBoard();
  currentPlayer = BLACK;
  moves = [];
  winner = EMPTY;
  hoverPoint = null;
  aiThinking = false;
  aiMessage = "";
  if (options.resetScore) {
    score = { [BLACK]: 0, [WHITE]: 0 };
  }
  updateUi();
  drawBoard();
  if (shouldAiMove()) {
    scheduleAiMove();
  }
}

function setMode(mode) {
  if (gameMode === mode) return;
  gameMode = mode;
  restartGame({ resetScore: true });
}

function setPlayerColor(color) {
  if (playerColor === color) return;
  playerColor = color;
  restartGame({ resetScore: true });
}

function setAiDifficulty(difficulty) {
  if (aiDifficulty === difficulty) return;
  aiDifficulty = difficulty;
  restartGame({ resetScore: true });
  if (difficulty === LLM_AI && !llmEndpoint.value.trim() && !aiThinking) {
    aiMessage = "大模型 AI 需要填写服务地址；未填写时会用本地 AI 代走";
    updateUi();
  }
}

function setLocalAiLevel(level) {
  if (localAiLevel === level) return;
  localAiLevel = level;
  restartGame({ resetScore: true });
}

canvas.addEventListener("click", (event) => {
  placeStone(getPointFromEvent(event));
});

canvas.addEventListener("mousemove", (event) => {
  hoverPoint = getPointFromEvent(event);
  drawBoard();
});

canvas.addEventListener("mouseleave", () => {
  hoverPoint = null;
  drawBoard();
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  placeStone(getPointFromEvent(event));
});

undoBtn.addEventListener("click", undoMove);
restartBtn.addEventListener("click", () => restartGame());
localModeBtn.addEventListener("click", () => setMode(LOCAL_MODE));
aiModeBtn.addEventListener("click", () => setMode(AI_MODE));
playerBlackBtn.addEventListener("click", () => setPlayerColor(BLACK));
playerWhiteBtn.addEventListener("click", () => setPlayerColor(WHITE));
localAiBtn.addEventListener("click", () => setAiDifficulty(LOCAL_AI));
llmAiBtn.addEventListener("click", () => setAiDifficulty(LLM_AI));
noviceAiBtn.addEventListener("click", () => setLocalAiLevel(NOVICE_LEVEL));
normalAiBtn.addEventListener("click", () => setLocalAiLevel(NORMAL_LEVEL));
hardAiBtn.addEventListener("click", () => setLocalAiLevel(HARD_LEVEL));
expertAiBtn.addEventListener("click", () => setLocalAiLevel(EXPERT_LEVEL));
llmEndpoint.addEventListener("input", () => {
  aiMessage = "";
  updateUi();
});

updateUi();
drawBoard();
