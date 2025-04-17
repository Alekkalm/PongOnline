const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let ball = { x: 50, y: 50, dx: 2, dy: 2 };
let gameInterval;

wss.on('connection', (ws) => {
  // Присваиваем игроку ID (1 или 2)
  const playerId = Object.keys(players).length + 1;
  players[playerId] = { y: 50, ws };

  // Отправляем игроку его ID
  ws.send(JSON.stringify({ type: 'init', playerId }));

  // Рассылаем состояние игры всем игрокам
  broadcastGameState();

  // Обработка движения ракетки
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move' && players[playerId]) {
      players[playerId].y = data.y;
    }
  });

  // Удаляем игрока при отключении
  ws.on('close', () => {
    delete players[playerId];
    if (Object.keys(players).length === 0) {
      clearInterval(gameInterval);
    }
  });
});

// Функция рассылки состояния игры
function broadcastGameState() {
  const state = {
    type: 'state',
    players,
    ball
  };
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(state));
    }
  });
}

// Игровой цикл (движение шарика)
function startGameLoop() {
  gameInterval = setInterval(() => {
    // Движение шарика
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Отскок от стен
    if (ball.y <= 0 || ball.y >= 100) ball.dy *= -1;

    // Отскок от ракеток
    if (ball.x <= 0 && Math.abs(ball.y - players[1].y) < 10) ball.dx *= -1;
    if (ball.x >= 100 && Math.abs(ball.y - players[2].y) < 10) ball.dx *= -1;

    // Гол (если шарик ушел за ракетку)
    if (ball.x < 0 || ball.x > 100) {
      ball = { x: 50, y: 50, dx: 2, dy: 2 }; // Сброс шарика
    }

    broadcastGameState();
  }, 16); // ~60 FPS
}

startGameLoop();