const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://your-frontend-domain.com"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const players = {};
const gameRooms = {};
const REQUIRED_PLAYERS = 3;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("request_to_play", ({ playerName }) => {
    console.log(`Player ${playerName} requesting to play with socket ID: ${socket.id}`);

    players[socket.id] = {
      name: playerName,
      score: 0,
      room: null
    };

    let availableRoom = null;

    Object.keys(gameRooms).forEach(roomId => {
      if (!availableRoom && gameRooms[roomId].length < REQUIRED_PLAYERS) {
        availableRoom = roomId;
        console.log(`Found available room: ${roomId}`);
      }
    });

    if (!availableRoom) {
      availableRoom = `room-${Date.now()}`;
      gameRooms[availableRoom] = [];
      console.log(`Created new room: ${availableRoom}`);
    }

    gameRooms[availableRoom].push(socket.id);
    players[socket.id].room = availableRoom;
    socket.join(availableRoom);

    console.log(`Player ${playerName} joined room ${availableRoom}`);
    console.log(`Current players in room: ${gameRooms[availableRoom].length}`);

    const playersInRoom = gameRooms[availableRoom].map(playerId => ({
      id: playerId,
      name: players[playerId].name,
      score: players[playerId].score
    }));

    io.to(availableRoom).emit("waiting_for_players", {
      currentPlayers: gameRooms[availableRoom].length,
      requiredPlayers: REQUIRED_PLAYERS,
      players: playersInRoom
    });

    if (gameRooms[availableRoom].length === REQUIRED_PLAYERS) {
      console.log(`Starting game in room ${availableRoom} with ${REQUIRED_PLAYERS} players`);
      io.to(availableRoom).emit("game_start", {
        players: playersInRoom
      });
    }
  });

  socket.on("score_update", (score) => {
    if (players[socket.id] && players[socket.id].room) {
      players[socket.id].score = score;
      const roomId = players[socket.id].room;

      const playersInRoom = gameRooms[roomId].map(playerId => ({
        id: playerId,
        name: players[playerId].name,
        score: players[playerId].score
      }));

      io.to(roomId).emit("players_update", playersInRoom);
    }
  });

  socket.on("game_over", () => {
    const player = players[socket.id];
    const opponent = players[player.opponent];

    if (player && opponent) {
      let winner;
      if (player.score > opponent.score) {
        winner = player.name;
      } else if (player.score < opponent.score) {
        winner = opponent.name;
      } else {
        winner = "It's a Tie!";
      }

      io.to(socket.id).emit("announce_winner", winner);
      io.to(player.opponent).emit("announce_winner", winner);
    }
  });

  socket.on("chat_message", (message) => {
    const player = players[socket.id];
    if (player && player.room) {
      const chatData = {
        sender: player.name,
        message: message,
        timestamp: new Date().toLocaleTimeString()
      };
      io.to(player.room).emit("chat_message", chatData);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    if (players[socket.id]) {
      const opponentId = players[socket.id].opponent;
      if (opponentId && players[opponentId]) {
        players[opponentId].opponent = null;
        io.to(opponentId).emit("OpponentLeft");
      }
      delete players[socket.id];
    }
  });
});

// CRITICAL FIXES FOR RENDER DEPLOYMENT:

// 1. Use environment PORT (Render assigns this dynamically)
const PORT = process.env.PORT || 3000;

// 2. Listen on 0.0.0.0 (not localhost) to accept external connections
const HOST = '0.0.0.0';

// 3. Start server with proper host and port
httpServer.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});

// 4. Add basic HTTP endpoint for health checks
httpServer.on('request', (req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('TypeChamp Server is running!');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});
