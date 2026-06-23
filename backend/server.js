const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { validateWord, normalizeString, CATEGORIES, findCorrectionSuggestion } = require("./dictionary");
const fs = require("fs");
const path = require("path");

const LEADERBOARD_PATH = path.join(__dirname, "leaderboard.json");

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_PATH)) {
      const data = fs.readFileSync(LEADERBOARD_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erro ao ler leaderboard.json:", error);
  }
  return [];
}

function saveLeaderboard(data) {
  try {
    fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar leaderboard.json:", error);
  }
}

function syncLeaderboard(room, activePlayersBeforeExplosion, loserId) {
  const leaderboard = loadLeaderboard();
  let updated = false;

  room.players.forEach(player => {
    if (player.isBot) return;

    const wasActive = activePlayersBeforeExplosion.some(ap => ap.id === player.id);
    const points = player.score - (player.lastSyncedScore || 0);

    if (wasActive || points > 0) {
      player.lastSyncedScore = player.score;
      const exploded = (loserId && player.id === loserId) ? 1 : 0;

      let entry = leaderboard.find(e => e.name.toLowerCase() === player.name.toLowerCase());
      if (!entry) {
        entry = {
          name: player.name,
          score: 0,
          roundsPlayed: 0,
          explosions: 0,
          survivalRate: 100
        };
        leaderboard.push(entry);
      }

      entry.score += points;
      if (wasActive) {
        entry.roundsPlayed += 1;
        entry.explosions += exploded;
      }

      if (entry.roundsPlayed > 0) {
        entry.survivalRate = Math.round(((entry.roundsPlayed - entry.explosions) / entry.roundsPlayed) * 100);
      } else {
        entry.survivalRate = 100;
      }
      updated = true;
    }
  });

  if (updated) {
    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    saveLeaderboard(leaderboard);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite todas as origens para facilidade de teste local
    methods: ["GET", "POST"]
  }
});

// Port configuration
const PORT = process.env.PORT || 3000;

// Desafios pré-programados
const CHALLENGES = [
  { category: "escola", letter: "b", display: "Objetos da escola com a letra B" },
  { category: "escola", letter: "c", display: "Objetos da escola com a letra C" },
  { category: "escola", letter: "p", display: "Objetos da escola com a letra P" },
  { category: "escola", letter: null, display: "Qualquer objeto da escola" },
  { category: "animais", letter: "c", display: "Animais que começam com C" },
  { category: "animais", letter: "g", display: "Animais que começam com G" },
  { category: "animais", letter: "m", display: "Animais que começam com M" },
  { category: "animais", letter: "a", display: "Animais que começam com A" },
  { category: "animais", letter: null, display: "Qualquer Animal" },
  { category: "frutas", letter: null, display: "Qualquer Fruta" },
  { category: "frutas", letter: "m", display: "Frutas que começam com M" },
  { category: "frutas", letter: "a", display: "Frutas que começam com A" },
  { category: "paises", letter: null, display: "Qualquer País" },
  { category: "paises", letter: "a", display: "Países que começam com A" },
  { category: "paises", letter: "e", display: "Países que começam com E" },
  { category: "paises", letter: "c", display: "Países que começam com C" },
  { category: "filmes", letter: null, display: "Qualquer Filme" },
  { category: "filmes", letter: "h", display: "Filmes que começam com H" },
  { category: "filmes", letter: "o", display: "Filmes que começam com O" },
  { category: "profissoes", letter: null, display: "Qualquer Profissão" },
  { category: "profissoes", letter: "m", display: "Profissões que começam com M" },
  { category: "profissoes", letter: "p", display: "Profissões que começam com P" }
];

// Estado dos quartos/salas em memória
// { roomCode: { code, hostId, players: [{ id, name, score, coins, skin, isEliminated, isConnected }], state: 'LOBBY'|'STARTING'|'ACTIVE'|'EXPLODED'|'GAME_OVER', ... } }
const rooms = {};

// Helpers para salas
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms[code] ? generateRoomCode() : code;
}

function cleanRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  if (room.timer) {
    clearInterval(room.timer);
  }
  if (room.botTimeout) {
    clearTimeout(room.botTimeout);
  }
  delete rooms[roomCode];
}

io.on("connection", (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);

  // 1. Criar sala
  socket.on("createRoom", ({ hostName, config, avatarType, avatarValue }) => {
    const roomCode = generateRoomCode();
    const gameMode = config.gameMode || "classic";
    
    rooms[roomCode] = {
      code: roomCode,
      hostId: socket.id,
      state: "LOBBY",
      players: [
        {
          id: socket.id,
          name: hostName,
          score: 0,
          coins: 100, // Moedas iniciais
          skin: "classic",
          avatarType: avatarType || "emoji",
          avatarValue: avatarValue || "👽",
          isEliminated: false,
          isConnected: true,
          lives: 3,
          hasShield: false
        }
      ],
      config: {
        maxPlayers: parseInt(config.maxPlayers) || 10,
        gameMode: gameMode,
        roundTimeMin: parseInt(config.roundTimeMin) || 15,
        roundTimeMax: parseInt(config.roundTimeMax) || 45,
        maxRounds: config.maxRounds !== undefined ? parseInt(config.maxRounds) : 0,
        autoStartNextRound: config.autoStartNextRound !== undefined ? !!config.autoStartNextRound : true
      },
      currentRound: 0,
      currentTheme: null,
      bombHolderId: null,
      usedWords: [],
      timer: null,
      secretDuration: 0,
      elapsedTime: 0,
      battleRoyaleSpeedMultiplier: 1.0,
      selectedCategory: "",
      selectedLetter: "",
      playDirection: 1,
      isFrozen: false
    };

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, room: rooms[roomCode] });
    console.log(`Sala criada: ${roomCode} por ${hostName}`);
  });

  // 2. Entrar na sala
  socket.on("joinRoom", ({ roomCode, playerName, avatarType, avatarValue }) => {
    const code = roomCode.toUpperCase();
    const room = rooms[code];

    if (!room) {
      return socket.emit("joinError", "Sala não encontrada.");
    }

    if (room.players.length >= room.config.maxPlayers) {
      return socket.emit("joinError", "Sala cheia.");
    }

    // Se o jogador com o mesmo nome já existe e está desconectado, reconectar!
    const existingPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    
    if (existingPlayer) {
      if (!existingPlayer.isConnected) {
        existingPlayer.id = socket.id;
        existingPlayer.isConnected = true;
        socket.join(code);
        socket.emit("roomJoined", { roomCode: code, room });
        io.to(code).emit("playerReconnected", { player: existingPlayer, players: room.players });
        io.to(code).emit("chatMessage", { sender: "Sistema", text: `[Reconexão] ${existingPlayer.name} voltou à partida!` });
        console.log(`Jogador ${playerName} reconectado na sala ${code}`);
        return;
      } else {
        return socket.emit("joinError", "Já existe um jogador ativo com este nome nesta sala.");
      }
    }

    // Se o jogo já começou, entra como espectador ou entra eliminado
    const isEliminated = room.state !== "LOBBY";

    const newPlayer = {
      id: socket.id,
      name: playerName,
      score: 0,
      coins: 100,
      skin: "classic",
      avatarType: avatarType || "emoji",
      avatarValue: avatarValue || "👽",
      isEliminated: isEliminated,
      isConnected: true,
      lives: 3,
      hasShield: false
    };

    room.players.push(newPlayer);
    socket.join(code);
    socket.emit("roomJoined", { roomCode: code, room });
    io.to(code).emit("playerJoined", { player: newPlayer, players: room.players });
    
    io.to(code).emit("chatMessage", { 
      sender: "Sistema", 
      text: `${playerName} entrou na sala!${isEliminated ? " (Como espectador, pois a partida já está em andamento)" : ""}` 
    });

    console.log(`Jogador ${playerName} entrou na sala ${code}`);
  });

  // 3. Selecionar Skin e Cosméticos pelo jogador
  socket.on("selectSkin", ({ roomCode, skinName, title, explosionEffect }) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      if (skinName) player.skin = skinName;
      if (title) player.title = title;
      if (explosionEffect) player.explosionEffect = explosionEffect;
      io.to(roomCode).emit("playersUpdated", room.players);
    }
  });

  // 3.4. Atualizar Tema Selecionado no Lobby
  socket.on("updateSelectedTheme", ({ roomCode, category, letter }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.hostId !== socket.id) return;
    
    room.selectedCategory = category || "";
    room.selectedLetter = letter || "";
    io.to(roomCode).emit("themeSelectedUpdated", { 
      category: room.selectedCategory, 
      letter: room.selectedLetter 
    });

    // Envia aviso no chat sobre a alteração do tema
    const categoryNameMap = {
      escola: "Objetos da Escola 🏫",
      animais: "Animais 🦊",
      frutas: "Frutas 🍉",
      paises: "Países 🗺️",
      filmes: "Filmes/Séries 🎬",
      profissoes: "Profissões 💼",
      nome: "Nomes 👤",
      objeto: "Objetos 🎒",
      cor: "Cores 🎨",
      comida: "Comidas 🍕"
    };

    const catText = room.selectedCategory !== "" ? categoryNameMap[room.selectedCategory] : "Qualquer Categoria 🎲";
    const letText = room.selectedLetter !== "" ? room.selectedLetter.toUpperCase() : "Qualquer Letra 🎲";
    io.to(roomCode).emit("chatMessage", {
      sender: "Sistema",
      text: `Configuração do Tema: Categoria [${catText}] | Letra [${letText}]`
    });
  });

  // 3.5. Adicionar Bot (Anfitrião)
  socket.on("addBot", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.hostId !== socket.id) {
      return socket.emit("errorMsg", "Apenas o anfitrião pode adicionar bots.");
    }

    if (room.players.length >= room.config.maxPlayers) {
      return socket.emit("errorMsg", "A sala está cheia.");
    }

    const botNames = ["BombaBot", "TurboPassador", "LexicoRobo", "DicioAndroid", "FaiscaGamer", "SilicioVoz", "Calculadora"];
    let botName = botNames[Math.floor(Math.random() * botNames.length)];
    let suffix = 1;
    while (room.players.some(p => p.name === botName)) {
      botName = `${botName}_${suffix++}`;
    }

    const botSkins = ["classic", "neon", "cyberpunk", "golden"];
    const botSkin = botSkins[Math.floor(Math.random() * botSkins.length)];
    
    const botAvatarTypes = ["emoji", "photo"];
    const botAvatarType = botAvatarTypes[Math.floor(Math.random() * botAvatarTypes.length)];
    
    let botAvatarValue = "👽";
    if (botAvatarType === "emoji") {
      const emojis = ["🤖", "👽", "🦊", "🦁", "🦖", "🦄", "👻", "🐱", "🐼", "🐸", "🥑", "🚀"];
      botAvatarValue = emojis[Math.floor(Math.random() * emojis.length)];
    } else {
      const photoPresets = [
        "/assets/avatars/cyber_neko.png",
        "/assets/avatars/cyber_hacker.png",
        "/assets/avatars/cyber_robot.png",
        "/assets/avatars/cyber_dj.png"
      ];
      botAvatarValue = photoPresets[Math.floor(Math.random() * photoPresets.length)];
    }

    const newBot = {
      id: `bot_${Math.random().toString(36).substring(2, 9)}`,
      name: botName,
      score: 0,
      coins: 50,
      skin: botSkin,
      avatarType: botAvatarType,
      avatarValue: botAvatarValue,
      isEliminated: room.state !== "LOBBY",
      isConnected: true,
      isBot: true,
      lives: 3,
      hasShield: false
    };

    room.players.push(newBot);
    io.to(roomCode).emit("playersUpdated", room.players);
    io.to(roomCode).emit("chatMessage", { sender: "Sistema", text: `🤖 Bot ${botName} foi adicionado à sala!` });
  });

  // 4. Iniciar rodada (apenas Anfitrião)
  socket.on("startRound", ({ roomCode, themeIndex }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.hostId !== socket.id) {
      return socket.emit("errorMsg", "Apenas o anfitrião pode iniciar a rodada.");
    }

    runStartRound(roomCode, themeIndex);
  });

  // 5. Submissão de palavra
  let lastSubmission = {}; // Anti-spam simples: { socketId: timestamp }
  
  socket.on("submitWord", async ({ roomCode, word }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Anti-spam check (500ms cooldown)
    const now = Date.now();
    if (lastSubmission[socket.id] && now - lastSubmission[socket.id] < 500) {
      return socket.emit("wordFeedback", { success: false, reason: "Aguarde um momento para tentar novamente (anti-spam)." });
    }
    lastSubmission[socket.id] = now;

    if (room.state !== "ACTIVE") {
      return socket.emit("wordFeedback", { success: false, reason: "A rodada não está ativa." });
    }

    if (room.bombHolderId !== socket.id) {
      return socket.emit("wordFeedback", { success: false, reason: "Não é a sua vez (você não está com a bomba)!" });
    }

    const cleanInput = word.trim();
    if (cleanInput.length < 2) {
      return socket.emit("wordFeedback", { success: false, reason: "Palavra muito curta." });
    }

    const normInput = normalizeString(cleanInput);

    // Verifica se já foi usada nesta rodada
    const alreadyUsed = room.usedWords.some(w => normalizeString(w.word) === normInput);
    if (alreadyUsed) {
      const suggestion = findCorrectionSuggestion("", room.currentTheme.category, room.currentTheme.letter, room.usedWords);
      return socket.emit("wordFeedback", { 
        success: false, 
        reason: "Esta palavra já foi usada nesta rodada!", 
        suggestion 
      });
    }

    // Valida a palavra baseada nas regras do tema
    const isValid = await validateWord(cleanInput, room.currentTheme.category, room.currentTheme.letter);
    
    if (!isValid) {
      const suggestion = findCorrectionSuggestion(cleanInput, room.currentTheme.category, room.currentTheme.letter, room.usedWords);
      socket.emit("wordFeedback", { 
        success: false, 
        reason: "Palavra inválida para o tema atual!", 
        suggestion 
      });
      
      // Envia alerta ao host para aprovação manual rápida
      io.to(room.hostId).emit("wordContest", {
        playerId: socket.id,
        playerName: player.name,
        word: cleanInput
      });
      return;
    }

    // Palavra correta!
    player.score += 10;
    player.coins += 5; // Moedas como recompensa

    room.usedWords.push({ word: cleanInput, player: player.name });

    // Se for modo Battle Royale, a bomba acelera a cada passe de bomba
    if (room.config.gameMode === "battle_royale") {
      room.battleRoyaleSpeedMultiplier += 0.15; // Acelera 15%
    }

    // Se for modo Adedonha Reversa, atualiza a letra inicial da rodada para a última letra da palavra digitada
    if (room.config.gameMode === "reverse_letter") {
      const normWord = normalizeString(cleanInput);
      if (normWord.length > 0) {
        const lastChar = normWord.charAt(normWord.length - 1);
        room.currentTheme.letter = lastChar;
        const categoryNameMap = {
          escola: "Objetos da Escola",
          animais: "Animais",
          frutas: "Frutas",
          paises: "Países",
          filmes: "Filmes/Séries",
          profissoes: "Profissões",
          nome: "Nomes",
          objeto: "Objetos",
          cor: "Cores",
          comida: "Comidas"
        };
        const chosenCategory = room.currentTheme.category;
        room.currentTheme.display = `${categoryNameMap[chosenCategory]} que começam com a letra ${lastChar.toUpperCase()}`;
      }
    }

    // Passar a bomba para o próximo jogador
    const activePlayers = room.players.filter(p => p.isConnected && !p.isEliminated);
    const currentIndex = activePlayers.findIndex(p => p.id === socket.id);
    
    // Procura o próximo jogador ativo respeitando a direção do jogo
    const dir = room.playDirection || 1;
    let nextIndex = (currentIndex + dir + activePlayers.length) % activePlayers.length;
    const nextPlayer = activePlayers[nextIndex];
    
    const previousHolderId = room.bombHolderId;
    room.bombHolderId = nextPlayer.id;

    console.log(`[Sala ${roomCode}] Bomba passou de ${player.name} para ${nextPlayer.name}. Palavra: ${cleanInput}`);

    socket.emit("wordFeedback", { success: true });
    io.to(roomCode).emit("bombPassed", {
      fromPlayerId: previousHolderId,
      toPlayerId: room.bombHolderId,
      word: cleanInput,
      playerName: player.name,
      players: room.players,
      usedWords: room.usedWords,
      speedMultiplier: room.battleRoyaleSpeedMultiplier,
      theme: room.currentTheme
    });

    // Se passou a vez para um robô
    triggerBotTurnIfActive(roomCode);
  });

  // 6. Mensagens de Chat
  socket.on("sendChatMessage", ({ roomCode, text }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const chatMsg = {
      sender: player.name,
      text: text.trim().substring(0, 150) // Limita a 150 caracteres
    };

    io.to(roomCode).emit("chatMessage", chatMsg);
  });

  // 7. Sobrescrita do Anfitrião (Host Force Pass)
  // Caso uma palavra seja correta mas não esteja no dicionário, o anfitrião pode aceitar manualmente!
  socket.on("hostAcceptWord", ({ roomCode, word, targetPlayerId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.hostId !== socket.id) return;
    if (room.state !== "ACTIVE") return;
    if (room.bombHolderId !== targetPlayerId) return;

    const player = room.players.find(p => p.id === targetPlayerId);
    if (!player) return;

    player.score += 10;
    player.coins += 5;
    room.usedWords.push({ word: `${word} (Aprovado pelo Host)`, player: player.name });

    if (room.config.gameMode === "battle_royale") {
      room.battleRoyaleSpeedMultiplier += 0.15;
    }

    // Se for modo Adedonha Reversa, atualiza a letra inicial da rodada para a última letra da palavra aceita
    if (room.config.gameMode === "reverse_letter") {
      const normWord = normalizeString(word);
      if (normWord.length > 0) {
        const lastChar = normWord.charAt(normWord.length - 1);
        room.currentTheme.letter = lastChar;
        const categoryNameMap = {
          escola: "Objetos da Escola",
          animais: "Animais",
          frutas: "Frutas",
          paises: "Países",
          filmes: "Filmes/Séries",
          profissoes: "Profissões",
          nome: "Nomes",
          objeto: "Objetos",
          cor: "Cores",
          comida: "Comidas"
        };
        const chosenCategory = room.currentTheme.category;
        room.currentTheme.display = `${categoryNameMap[chosenCategory]} que começam com a letra ${lastChar.toUpperCase()}`;
      }
    }

    const activePlayers = room.players.filter(p => p.isConnected && !p.isEliminated);
    const currentIndex = activePlayers.findIndex(p => p.id === targetPlayerId);
    const dir = room.playDirection || 1;
    let nextIndex = (currentIndex + dir + activePlayers.length) % activePlayers.length;
    const nextPlayer = activePlayers[nextIndex];

    const previousHolderId = room.bombHolderId;
    room.bombHolderId = nextPlayer.id;

    io.to(roomCode).emit("bombPassed", {
      fromPlayerId: previousHolderId,
      toPlayerId: room.bombHolderId,
      word: `${word} (Aprovado pelo Host)`,
      playerName: player.name,
      players: room.players,
      usedWords: room.usedWords,
      speedMultiplier: room.battleRoyaleSpeedMultiplier,
      theme: room.currentTheme
    });

    io.to(roomCode).emit("chatMessage", {
      sender: "Apresentador",
      text: `Palavra "${word}" de ${player.name} foi aceita manualmente!`
    });

    // Se passou a vez para um robô
    triggerBotTurnIfActive(roomCode);
  });

  // 7.5. Uso de Itens (Modo Caos e Itens)
  socket.on("useItem", ({ roomCode, itemId }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.state !== "ACTIVE") return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.isEliminated || !player.isConnected) return;

    const itemCosts = {
      shield: 50,
      freeze: 40,
      skip: 30,
      reverse: 25
    };

    const cost = itemCosts[itemId];
    if (cost === undefined) return;

    if (player.coins < cost) {
      return socket.emit("errorMsg", "Moedas insuficientes!");
    }

    if (itemId === "shield") {
      if (player.hasShield) {
        return socket.emit("errorMsg", "Você já tem um escudo ativo!");
      }
      player.coins -= cost;
      player.hasShield = true;
      
      io.to(roomCode).emit("playersUpdated", room.players);
      io.to(roomCode).emit("chatMessage", {
        sender: "Sistema",
        text: `🛡️ ${player.name} comprou um Escudo!`
      });
    } 
    else if (itemId === "freeze") {
      if (room.bombHolderId !== socket.id) {
        return socket.emit("errorMsg", "Você só pode congelar a bomba no seu turno!");
      }
      if (room.isFrozen) {
        return socket.emit("errorMsg", "A bomba já está congelada!");
      }
      player.coins -= cost;
      room.isFrozen = true;

      io.to(roomCode).emit("playersUpdated", room.players);
      io.to(roomCode).emit("chatMessage", {
        sender: "Sistema",
        text: `❄️ ${player.name} congelou a bomba por 5 segundos!`
      });
      io.to(roomCode).emit("bombFrozen", { holderId: socket.id, duration: 5 });

      setTimeout(() => {
        if (rooms[roomCode]) {
          rooms[roomCode].isFrozen = false;
          io.to(roomCode).emit("bombUnfrozen");
        }
      }, 5000);
    } 
    else if (itemId === "skip") {
      if (room.bombHolderId !== socket.id) {
        return socket.emit("errorMsg", "Você só pode pular a vez no seu turno!");
      }
      player.coins -= cost;

      const activePlayers = room.players.filter(p => p.isConnected && !p.isEliminated);
      const currentIndex = activePlayers.findIndex(p => p.id === socket.id);
      const dir = room.playDirection || 1;
      let nextIndex = (currentIndex + dir + activePlayers.length) % activePlayers.length;
      const nextPlayer = activePlayers[nextIndex];

      const previousHolderId = room.bombHolderId;
      room.bombHolderId = nextPlayer.id;

      io.to(roomCode).emit("playersUpdated", room.players);
      io.to(roomCode).emit("bombPassed", {
        fromPlayerId: previousHolderId,
        toPlayerId: room.bombHolderId,
        word: "[Pular Vez] ⏭️",
        playerName: player.name,
        players: room.players,
        usedWords: room.usedWords,
        speedMultiplier: room.battleRoyaleSpeedMultiplier,
        theme: room.currentTheme
      });

      triggerBotTurnIfActive(roomCode);
    } 
    else if (itemId === "reverse") {
      player.coins -= cost;
      room.playDirection = (room.playDirection || 1) * -1;

      io.to(roomCode).emit("playersUpdated", room.players);
      io.to(roomCode).emit("chatMessage", {
        sender: "Sistema",
        text: `🔄 ${player.name} inverteu o sentido do jogo!`
      });
      io.to(roomCode).emit("playDirectionChanged", { playDirection: room.playDirection });
    }
  });

  // 8. Desconexão

  // 8. Desconexão
  socket.on("disconnect", () => {
    console.log(`Jogador desconectou: ${socket.id}`);

    // Procura em todas as salas
    Object.keys(rooms).forEach((roomCode) => {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        player.isConnected = false;

        io.to(roomCode).emit("chatMessage", { sender: "Sistema", text: `${player.name} desconectou. Aguardando reconexão...` });

        // Se o jogo está ativo e quem desconectou estava com a bomba, passa a bomba
        if (room.state === "ACTIVE" && room.bombHolderId === socket.id) {
          const activePlayers = room.players.filter(p => p.isConnected && !p.isEliminated);
          if (activePlayers.length > 0) {
            const nextPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
            room.bombHolderId = nextPlayer.id;
            io.to(roomCode).emit("bombPassed", {
              fromPlayerId: socket.id,
              toPlayerId: room.bombHolderId,
              word: "[Desconexão]",
              playerName: "Sistema",
              players: room.players,
              usedWords: room.usedWords,
              speedMultiplier: room.battleRoyaleSpeedMultiplier
            });
            triggerBotTurnIfActive(roomCode);
          }
        }

        // Se o anfitrião saiu, passa o anfitrião para outro jogador conectado
        if (room.hostId === socket.id) {
          const activeConnectedPlayers = room.players.filter(p => p.isConnected);
          if (activeConnectedPlayers.length > 0) {
            room.hostId = activeConnectedPlayers[0].id;
            io.to(roomCode).emit("hostChanged", { hostId: room.hostId });
            const newHost = activeConnectedPlayers[0];
            io.to(roomCode).emit("chatMessage", { sender: "Sistema", text: `${newHost.name} é o novo anfitrião da sala.` });
            console.log(`Novo host na sala ${roomCode}: ${newHost.name}`);
          }
        }

        // Atualiza a lista de jogadores
        io.to(roomCode).emit("playerLeft", { playerId: socket.id, players: room.players });

        // Agenda remoção definitiva da sala se todo mundo sair da sala
        const connectedPlayers = room.players.filter(p => p.isConnected);
        if (connectedPlayers.length === 0) {
          console.log(`Sala vazia ${roomCode}. Agendando encerramento.`);
          setTimeout(() => {
            const r = rooms[roomCode];
            if (r) {
              const stillConnected = r.players.filter(p => p.isConnected);
              if (stillConnected.length === 0) {
                console.log(`Encerrando sala vazia: ${roomCode}`);
                cleanRoom(roomCode);
              }
            }
          }, 30000); // 30 segundos de tolerância para salas totalmente vazias
        }
      }
    });
  });
});

// Manipulador da explosão
function startRoomTimer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.timer) {
    clearInterval(room.timer);
  }

  room.timer = setInterval(() => {
    if (room.state !== "ACTIVE") {
      clearInterval(room.timer);
      return;
    }

    if (room.isFrozen) {
      return;
    }

    // Modo Contra o Tempo (Time Attack)
    if (room.config.gameMode === "time_attack") {
      const activePlayer = room.players.find(p => p.id === room.bombHolderId);
      if (activePlayer) {
        activePlayer.personalTime = Math.max(0, (activePlayer.personalTime || 30) - 1);
        
        io.to(roomCode).emit("timeTick", { 
          players: room.players,
          bombHolderId: room.bombHolderId
        });

        if (activePlayer.personalTime <= 0) {
          clearInterval(room.timer);
          handleExplosion(roomCode);
        }
      }
      return;
    }

    let timeStep = 1;
    if (room.config.gameMode === "battle_royale") {
      timeStep = 1 * room.battleRoyaleSpeedMultiplier;
    }

    room.elapsedTime += timeStep;

    io.to(roomCode).emit("timeTick", { 
      elapsedTime: Math.min(room.elapsedTime, room.secretDuration),
      speedMultiplier: room.battleRoyaleSpeedMultiplier
    });

    if (room.elapsedTime >= room.secretDuration) {
      clearInterval(room.timer);
      handleExplosion(roomCode);
    }
  }, 1000);
}

function handleExplosion(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const activePlayersBeforeExplosion = room.players.filter(p => p.isConnected && !p.isEliminated);

  if (room.botTimeout) {
    clearTimeout(room.botTimeout);
  }
  const loser = room.players.find(p => p.id === room.bombHolderId);

  if (!loser) {
    room.state = "EXPLODED";
    io.to(roomCode).emit("roundExploded", { loserId: null, loserName: "Ninguém", players: room.players });
    return;
  }

  // Verificação do Escudo no modo Caos e Itens
  if (loser.hasShield && room.config.gameMode === "chaos_items") {
    loser.hasShield = false;
    io.to(roomCode).emit("playersUpdated", room.players);
    io.to(roomCode).emit("chatMessage", {
      sender: "Sistema",
      text: `🛡️ O Escudo de ${loser.name} bloqueou a explosão e foi destruído!`
    });

    const activePlayers = room.players.filter(p => p.isConnected && !p.isEliminated);
    const currentIndex = activePlayers.findIndex(p => p.id === loser.id);
    const dir = room.playDirection || 1;
    let nextIndex = (currentIndex + dir + activePlayers.length) % activePlayers.length;
    const nextPlayer = activePlayers[nextIndex];

    room.bombHolderId = nextPlayer.id;
    room.elapsedTime = 0;
    const min = room.config.roundTimeMin;
    const max = room.config.roundTimeMax;
    room.secretDuration = Math.floor(Math.random() * (max - min + 1)) + min;

    io.to(roomCode).emit("bombPassed", {
      fromPlayerId: loser.id,
      toPlayerId: room.bombHolderId,
      word: "[Bloqueio de Escudo] 🛡️",
      playerName: "Sistema",
      players: room.players,
      usedWords: room.usedWords,
      speedMultiplier: room.battleRoyaleSpeedMultiplier,
      theme: room.currentTheme
    });

    triggerBotTurnIfActive(roomCode);
    startRoomTimer(roomCode);
    return;
  }

  room.state = "EXPLODED";

  // Regras de pontuação e eliminação baseadas no modo
  let explanation = "";
  if (room.config.gameMode === "classic") {
    loser.score = Math.max(0, loser.score - 15); // Perde pontos
    explanation = `${loser.name} explodiu e perdeu 15 pontos!`;

    // Sobreviventes ganham +20 pontos
    room.players.forEach(p => {
      if (p.id !== loser.id && p.isConnected && !p.isEliminated) {
        p.score += 20;
        p.coins += 10;
      }
    });
  } 
  else if (room.config.gameMode === "hot_potato") {
    loser.lives = (loser.lives || 3) - 1;
    if (loser.lives <= 0) {
      loser.isEliminated = true;
      explanation = `${loser.name} explodiu, perdeu todas as vidas e foi ELIMINADO! 💀`;
    } else {
      explanation = `${loser.name} explodiu e perdeu 1 vida! Restam ${loser.lives} vidas. ❤️`;
    }

    // Sobreviventes ganham moedas
    room.players.forEach(p => {
      if (p.id !== loser.id && p.isConnected && !p.isEliminated) {
        p.coins += 15;
      }
    });
  }
  else {
    // Eliminação ou Battle Royale
    loser.isEliminated = true;
    explanation = `${loser.name} explodiu e foi ELIMINADO!`;

    // Sobreviventes ganham moedas
    room.players.forEach(p => {
      if (p.id !== loser.id && p.isConnected && !p.isEliminated) {
        p.coins += 15;
      }
    });
  }

  console.log(`Bomba explodiu na sala ${roomCode}. Perdedor: ${loser.name}`);

  const survivors = room.players.filter(p => p.isConnected && !p.isEliminated);
  const isElimMode = room.config.gameMode !== "classic";
  const maxRoundsReached = room.config.maxRounds > 0 && room.currentRound >= room.config.maxRounds;

  if ((isElimMode && survivors.length === 1) || maxRoundsReached) {
    room.state = "GAME_OVER";
    let winnerName = null;
    if (survivors.length > 0) {
      const winner = survivors.sort((a, b) => (b.lives || 0) - (a.lives || 0) || b.score - a.score)[0];
      winner.score += 100;
      winner.coins += 50;
      winnerName = winner.name;
    }

    let explanationSuffix = "";
    if (maxRoundsReached) explanationSuffix += " (Fim das rodadas programadas!)";

    io.to(roomCode).emit("roundExploded", {
      loserId: loser.id,
      loserName: loser.name,
      explanation: explanation + explanationSuffix,
      players: room.players,
      isGameOver: true,
      winnerName: winnerName
    });

    io.to(roomCode).emit("chatMessage", {
      sender: "Sistema",
      text: `🏆 FIM DE JOGO! O grande vencedor é ${winnerName || "Ninguém"}!`
    });
  } 
  else if (isElimMode && survivors.length === 0) {
    room.state = "GAME_OVER";
    io.to(roomCode).emit("roundExploded", {
      loserId: loser.id,
      loserName: loser.name,
      explanation,
      players: room.players,
      isGameOver: true,
      winnerName: null
    });
  } 
  else {
    // Apenas fim de rodada ordinário
    io.to(roomCode).emit("roundExploded", {
      loserId: loser.id,
      loserName: loser.name,
      explanation,
      players: room.players,
      isGameOver: false
    });

    // Se o avanço automático estiver ativo, inicia a próxima rodada após 3 segundos
    if (room.config.autoStartNextRound) {
      io.to(roomCode).emit("chatMessage", {
        sender: "Sistema",
        text: `Próxima rodada iniciando automaticamente em 3 segundos... 💣`
      });
      
      setTimeout(() => {
        if (rooms[roomCode] && rooms[roomCode].state === "EXPLODED") {
          runStartRound(roomCode, undefined);
        }
      }, 3000);
    }
  }

  // Sincroniza o leaderboard com as estatísticas acumuladas até o final desta rodada
  syncLeaderboard(room, activePlayersBeforeExplosion, loser ? loser.id : null);
}

// Helper para iniciar rodada programaticamente
function runStartRound(roomCode, themeIndex) {
  const room = rooms[roomCode];
  if (!room) return;

  const previousState = room.state;

  // Limpa timers anteriores caso existam
  if (room.timer) {
    clearInterval(room.timer);
  }
  if (room.botTimeout) {
    clearTimeout(room.botTimeout);
  }

  // Define tema dinamicamente baseando-se na Categoria e Letra selecionadas (Adedonha/Stop)
  const categoryNameMap = {
    escola: "Objetos da Escola",
    animais: "Animais",
    frutas: "Frutas",
    paises: "Países",
    filmes: "Filmes/Séries",
    profissoes: "Profissões",
    nome: "Nomes",
    objeto: "Objetos",
    cor: "Cores",
    comida: "Comidas"
  };

  let chosenCategory = room.selectedCategory;
  if (!chosenCategory || chosenCategory === "") {
    const keys = Object.keys(categoryNameMap);
    chosenCategory = keys[Math.floor(Math.random() * keys.length)];
  }

  let chosenLetter = room.selectedLetter;
  if (!chosenLetter || chosenLetter === "") {
    // Letras amigáveis e comuns para Adedonha (evita W, Y, K, X etc.)
    const alphabet = "abcdefghijlmnopqrstuvz";
    chosenLetter = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  } else {
    chosenLetter = chosenLetter.toLowerCase();
  }

  const themeDisplay = `${categoryNameMap[chosenCategory]} que começam com a letra ${chosenLetter.toUpperCase()}`;
  
  const theme = {
    category: chosenCategory,
    letter: chosenLetter,
    display: themeDisplay
  };

  room.currentTheme = theme;
  room.state = "ACTIVE";
  room.battleRoyaleSpeedMultiplier = 1.0;
  room.isFrozen = false;

  // Reset de eliminações e vidas se for uma nova partida limpa
  const activePlayers = room.players.filter(p => p.isConnected);
  const nonEliminated = activePlayers.filter(p => !p.isEliminated);
  const isResetTime = previousState === "GAME_OVER" || previousState === "LOBBY" || nonEliminated.length <= 1;

  if (isResetTime) {
    room.currentRound = 1;
  } else {
    room.currentRound = (room.currentRound || 0) + 1;
  }

  // Reseta variáveis da rodada para todos os modos
  room.usedWords = [];
  room.elapsedTime = 0;
  room.playDirection = 1;

  if (isResetTime) {
    room.players.forEach(p => {
      if (p.isConnected) {
        p.isEliminated = false;
        p.hasShield = false;
        p.lives = 3; // Reseta vidas para o padrão de 3
        if (room.config.gameMode === "time_attack") {
          p.personalTime = room.config.roundTimeMax || 30;
        }
      }
    });
  } else {
    room.players.forEach(p => {
      if (p.isConnected) {
        p.hasShield = false;
        if (room.config.gameMode === "time_attack" && !p.isEliminated) {
          p.personalTime = room.config.roundTimeMax || 30;
        }
      }
    });
  }

  const playersPlaying = room.players.filter(p => p.isConnected && !p.isEliminated);
  
  if (playersPlaying.length < 2) {
    room.state = "LOBBY";
    io.to(roomCode).emit("gameError", "Não há jogadores suficientes para iniciar (mínimo de 2 jogadores ativos).");
    return;
  }

  // Sorteia jogador para começar com a bomba
  const randomPlayer = playersPlaying[Math.floor(Math.random() * playersPlaying.length)];
  room.bombHolderId = randomPlayer.id;

  // Define tempo secreto aleatório para todos os modos usando os segundos selecionados
  const min = room.config.roundTimeMin;
  const max = room.config.roundTimeMax;
  room.secretDuration = Math.floor(Math.random() * (max - min + 1)) + min;

  console.log(`Rodada iniciada na sala ${roomCode}. Tema: ${theme.display}. Bomba com: ${randomPlayer.name}. Tempo secreto: ${room.secretDuration}s.`);

  io.to(roomCode).emit("roundStarted", {
    theme: room.currentTheme,
    bombHolderId: room.bombHolderId,
    players: room.players,
    secretDuration: room.secretDuration,
    currentRound: room.currentRound
  });

  // Envia anúncio no chat
  io.to(roomCode).emit("chatMessage", {
    sender: "Apresentador",
    text: `🔔 A rodada começou! Tema: "${theme.display}". A bomba está com ${randomPlayer.name}! 💣`
  });

  // Inicia loop do temporizador
  startRoomTimer(roomCode);

  triggerBotTurnIfActive(roomCode);
}

// Endpoints REST opcionais para status / ranking
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: Object.keys(rooms).length });
});

// Lista desafios disponíveis
app.get("/api/challenges", (req, res) => {
  res.json(CHALLENGES);
});

// Retorna o ranking global
app.get("/api/leaderboard", (req, res) => {
  const leaderboard = loadLeaderboard();
  res.json(leaderboard);
});

// Reseta o ranking global
app.post("/api/leaderboard/reset", (req, res) => {
  saveLeaderboard([]);
  res.json({ status: "ok", message: "Ranking resetado com sucesso!" });
});

// ================= ENGINE DE BOTS DE TESTE =================

function getBotWord(category, letter, usedWords) {
  const words = CATEGORIES[category] || [];
  const normalizedLetter = letter ? normalizeString(letter) : null;
  const normalizedUsed = usedWords.map(w => normalizeString(w.word));

  const validOptions = words.filter(word => {
    const norm = normalizeString(word);
    if (normalizedLetter && !norm.startsWith(normalizedLetter)) {
      return false;
    }
    return !normalizedUsed.includes(norm);
  });

  if (validOptions.length === 0) return null;
  return validOptions[Math.floor(Math.random() * validOptions.length)];
}

function scheduleBotPlay(roomCode, botId) {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.botTimeout) {
    clearTimeout(room.botTimeout);
  }

  // Tempo de resposta do bot de acordo com o multiplicador de velocidade
  const baseDelay = 1800 + Math.random() * 2800; // Entre 1.8s e 4.6s
  const delay = Math.max(1000, baseDelay / room.battleRoyaleSpeedMultiplier);

  room.botTimeout = setTimeout(() => {
    if (room.state !== "ACTIVE" || room.bombHolderId !== botId) return;

    const theme = room.currentTheme;
    const word = getBotWord(theme.category, theme.letter, room.usedWords);

    if (word) {
      const botPlayer = room.players.find(p => p.id === botId);
      if (!botPlayer) return;

      botPlayer.score += 10;
      botPlayer.coins += 5;
      room.usedWords.push({ word, player: botPlayer.name });

      if (room.config.gameMode === "battle_royale") {
        room.battleRoyaleSpeedMultiplier += 0.15;
      }

      // Se for modo Adedonha Reversa, atualiza a letra inicial da rodada para a última letra da palavra do bot
      if (room.config.gameMode === "reverse_letter") {
        const normWord = normalizeString(word);
        if (normWord.length > 0) {
          const lastChar = normWord.charAt(normWord.length - 1);
          room.currentTheme.letter = lastChar;
          const categoryNameMap = {
            escola: "Objetos da Escola",
            animais: "Animais",
            frutas: "Frutas",
            paises: "Países",
            filmes: "Filmes/Séries",
            profissoes: "Profissões",
            nome: "Nomes",
            objeto: "Objetos",
            cor: "Cores",
            comida: "Comidas"
          };
          const chosenCategory = room.currentTheme.category;
          room.currentTheme.display = `${categoryNameMap[chosenCategory]} que começam com a letra ${lastChar.toUpperCase()}`;
        }
      }

      // Passa a bomba
      const activePlayers = room.players.filter(p => p.isConnected && !p.isEliminated);
      const currentIndex = activePlayers.findIndex(p => p.id === botId);
      const dir = room.playDirection || 1;
      let nextIndex = (currentIndex + dir + activePlayers.length) % activePlayers.length;
      const nextPlayer = activePlayers[nextIndex];

      const previousHolderId = room.bombHolderId;
      room.bombHolderId = nextPlayer.id;

      console.log(`[ROBÔ] ${botPlayer.name} respondeu "${word}" na sala ${roomCode}`);

      io.to(roomCode).emit("bombPassed", {
        fromPlayerId: previousHolderId,
        toPlayerId: room.bombHolderId,
        word,
        playerName: botPlayer.name,
        players: room.players,
        usedWords: room.usedWords,
        speedMultiplier: room.battleRoyaleSpeedMultiplier,
        theme: room.currentTheme
      });

      triggerBotTurnIfActive(roomCode);
    } else {
      console.log(`[ROBÔ PARALISADO] Bot ${botId} não encontrou palavra para ${theme.display}`);
    }
  }, delay);
}

function triggerBotTurnIfActive(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.state !== "ACTIVE") return;

  const activeHolder = room.players.find(p => p.id === room.bombHolderId);
  if (activeHolder && activeHolder.isBot && !activeHolder.isEliminated) {
    scheduleBotPlay(roomCode, activeHolder.id);
  }
}

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
