import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import Home from "./components/Home";
import GameRoom from "./components/GameRoom";

// Resolve a URL do servidor backend dinamicamente
// Se for localhost no navegador, conecta a localhost:3000. 
// Se for acessado por IP local (celular), conecta ao IP da máquina na porta 3000.
const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : `${window.location.protocol}//${window.location.hostname}:3000`;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("HOME"); // HOME | GAME
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Cria conexão socket uma vez ao inicializar
  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on("connect", () => {
      console.log("Conectado ao servidor Socket.IO:", newSocket.id);
      setPlayerId(newSocket.id);
      setError("");
    });

    newSocket.on("connect_error", () => {
      setError("Erro ao conectar ao servidor de jogo. Certifique-se de que o backend está rodando.");
    });

    newSocket.on("joinError", (msg) => {
      setError(msg);
      newSocket.disconnect();
    });

    newSocket.on("roomCreated", ({ roomCode, room }) => {
      setRoomCode(roomCode);
      setRoom(room);
      setScreen("GAME");
      setError("");
      
      // Envia a skin, título e efeito de explosão ativos equipados
      const activeSkin = localStorage.getItem("pab_activeSkin") || "classic";
      const activeTitle = localStorage.getItem("pab_activeTitle") || "none";
      const activeEffect = localStorage.getItem("pab_activeEffect") || "classic";
      newSocket.emit("selectSkin", { 
        roomCode, 
        skinName: activeSkin, 
        title: activeTitle, 
        explosionEffect: activeEffect 
      });
    });

    newSocket.on("roomJoined", ({ roomCode, room }) => {
      setRoomCode(roomCode);
      setRoom(room);
      setScreen("GAME");
      setError("");

      const activeSkin = localStorage.getItem("pab_activeSkin") || "classic";
      const activeTitle = localStorage.getItem("pab_activeTitle") || "none";
      const activeEffect = localStorage.getItem("pab_activeEffect") || "classic";
      newSocket.emit("selectSkin", { 
        roomCode, 
        skinName: activeSkin, 
        title: activeTitle, 
        explosionEffect: activeEffect 
      });

      // Atualiza conquistas locais (Primeira partida participada)
      updateLocalAchievements("firstGame");
    });

    newSocket.on("playerJoined", ({ player, players }) => {
      setRoom((prev) => (prev ? { ...prev, players } : null));
    });

    newSocket.on("playerLeft", ({ playerId, players }) => {
      setRoom((prev) => (prev ? { ...prev, players } : null));
    });

    newSocket.on("playerReconnected", ({ player, players }) => {
      setRoom((prev) => (prev ? { ...prev, players } : null));
    });

    newSocket.on("playersUpdated", (players) => {
      setRoom((prev) => (prev ? { ...prev, players } : null));
    });

    newSocket.on("hostChanged", ({ hostId }) => {
      setRoom((prev) => (prev ? { ...prev, hostId } : null));
    });

    newSocket.on("roundStarted", ({ theme, bombHolderId, players, secretDuration, currentRound }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          state: "ACTIVE",
          currentTheme: theme,
          bombHolderId,
          players,
          secretDuration,
          currentRound: currentRound !== undefined ? currentRound : (prev.currentRound || 1),
          usedWords: [],
          elapsedTime: 0,
          battleRoyaleSpeedMultiplier: 1.0,
          lastWord: null,
          lastWordPlayer: null
        };
      });

      // Se eu estiver na lista de jogadores jogando, incrementa partidas jogadas
      const mySavedName = localStorage.getItem("pab_playerName");
      const isMeInRoom = players.find(p => p.name === mySavedName && p.isConnected && !p.isEliminated);
      if (isMeInRoom) {
        updateStats("gamesPlayed");
      }
    });

    newSocket.on("bombPassed", ({ fromPlayerId, toPlayerId, word, playerName, players, usedWords, speedMultiplier, theme }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          bombHolderId: toPlayerId,
          players,
          usedWords,
          battleRoyaleSpeedMultiplier: speedMultiplier,
          lastWord: word,
          lastWordPlayer: playerName,
          currentTheme: theme || prev.currentTheme
        };
      });

      // Se o passe foi feito por mim, incrementa palavras corretas
      if (fromPlayerId === newSocket.id) {
        updateStats("correctWords");
        addXp(5); // +5 XP por palavra correta
        
        // Verifica conquista "Por um Fio"
        const me = players.find(p => p.id === fromPlayerId);
        if (me) {
          if (room && room.config?.gameMode === "time_attack" && me.personalTime <= 2) {
            updateLocalAchievements("survivor");
          } else if (room && room.secretDuration && (room.secretDuration - room.elapsedTime <= 2.5)) {
            updateLocalAchievements("survivor");
          }
        }
        
        // Verifica se alcançou 5 palavras nesta rodada para desbloquear dicionário humano
        const myName = localStorage.getItem("pab_playerName");
        const myWordsCount = usedWords.filter(w => w.player === myName).length;
        if (myWordsCount >= 5) {
          updateLocalAchievements("wordMaster");
        }
      }

      // Sincroniza dados de moedas e pontuação recorde
      syncCoinsAndHighScore(players, newSocket.id);
    });

    newSocket.on("roundExploded", ({ loserId, loserName, explanation, players, isGameOver, winnerName }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          state: isGameOver ? "GAME_OVER" : "EXPLODED",
          explanation,
          players,
          winnerName
        };
      });

      // Se eu explodi
      if (loserId === newSocket.id) {
        updateStats("bombsExploded");
      } else {
        // Se eu estava na partida e sobrevivi a rodada, ganho +20 XP!
        const mySavedName = localStorage.getItem("pab_playerName");
        const me = players.find(p => p.name === mySavedName);
        if (me && !me.isEliminated && me.isConnected) {
          addXp(20);
        }
      }

      // Se eu ganhei o jogo nos modos de eliminação
      const mySavedName = localStorage.getItem("pab_playerName");
      if (isGameOver && winnerName === mySavedName) {
        updateStats("wins");
        updateLocalAchievements("firstWin");
        addXp(50); // +50 XP por vitória
      }

      syncCoinsAndHighScore(players, newSocket.id);
    });

    newSocket.on("timeTick", (data) => {
      if (data.players) {
        setRoom((prev) => (prev ? { ...prev, players: data.players } : null));
      }
    });

    newSocket.on("playDirectionChanged", ({ playDirection }) => {
      setRoom((prev) => (prev ? { ...prev, playDirection } : null));
    });

    newSocket.on("bombFrozen", () => {
      setRoom((prev) => (prev ? { ...prev, isFrozen: true } : null));
    });

    newSocket.on("bombUnfrozen", () => {
      setRoom((prev) => (prev ? { ...prev, isFrozen: false } : null));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Helpers de estatísticas persistidas
  const updateStats = (key) => {
    try {
      const saved = localStorage.getItem("pab_stats");
      const stats = saved ? JSON.parse(saved) : {
        gamesPlayed: 0,
        wins: 0,
        bombsExploded: 0,
        correctWords: 0,
        highScore: 0
      };
      stats[key] = (stats[key] || 0) + 1;
      localStorage.setItem("pab_stats", JSON.stringify(stats));
    } catch (e) {
      console.warn("Failed to update stats:", e);
    }
  };

  const syncCoinsAndHighScore = (players, myId) => {
    try {
      const me = players.find(p => p.id === myId);
      if (me) {
        localStorage.setItem("pab_coins", me.coins);
        
        const saved = localStorage.getItem("pab_stats");
        const stats = saved ? JSON.parse(saved) : {
          gamesPlayed: 0,
          wins: 0,
          bombsExploded: 0,
          correctWords: 0,
          highScore: 0
        };
        
        if (me.score > stats.highScore) {
          stats.highScore = me.score;
          localStorage.setItem("pab_stats", JSON.stringify(stats));
        }
      }
    } catch (e) {
      console.warn("Failed to sync coins and highscore:", e);
    }
  };

  const showToast = (title, message, type = "info") => {
    setToast({ title, message, type });
    if (type === "level_up" || type === "achievement") {
      audioService.playSuccess();
    }
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const addXp = (amount) => {
    try {
      const saved = localStorage.getItem("pab_stats");
      const statsObj = saved ? JSON.parse(saved) : {
        gamesPlayed: 0,
        wins: 0,
        bombsExploded: 0,
        correctWords: 0,
        highScore: 0,
        xp: 0
      };
      
      const oldXp = statsObj.xp || 0;
      const newXp = oldXp + amount;
      statsObj.xp = newXp;
      localStorage.setItem("pab_stats", JSON.stringify(statsObj));
      
      const getLevel = (xp) => 1 + Math.floor(Math.sqrt(xp / 80));
      const oldLevel = getLevel(oldXp);
      const newLevel = getLevel(newXp);
      
      if (newLevel > oldLevel) {
        showToast("SUBIU DE NÍVEL! ⚡", `Você alcançou o Nível ${newLevel}! Parabéns!`, "level_up");
      }
    } catch (e) {
      console.warn("Failed to add XP:", e);
    }
  };

  const updateLocalAchievements = (key) => {
    try {
      const saved = localStorage.getItem("pab_achievements");
      const achievementsObj = saved ? JSON.parse(saved) : {
        firstGame: false,
        wordMaster: false,
        survivor: false,
        goldenSkin: false,
        firstWin: false
      };
      if (!achievementsObj[key]) {
        achievementsObj[key] = true;
        localStorage.setItem("pab_achievements", JSON.stringify(achievementsObj));
        
        const achievementNames = {
          firstGame: "Batismo de Fogo 🎖️",
          wordMaster: "Dicionário Humano 📚",
          survivor: "Por um Fio ⏳",
          goldenSkin: "Realeza Dourada 👑",
          firstWin: "Último Sobrevivente 🏆"
        };
        showToast("CONQUISTA DESTRAVADA! 🏆", achievementNames[key] || key, "achievement");
      }
    } catch (e) {
      console.warn("Failed to update achievements:", e);
    }
  };

  // Ações do Lobby
  const handleCreateRoom = (hostName, config, avatarType, avatarValue) => {
    if (!socket) return;
    setError("");
    socket.connect();
    // Espera conectar antes de emitir
    socket.once("connect", () => {
      socket.emit("createRoom", { hostName, config, avatarType, avatarValue });
    });
  };

  const handleJoinRoom = (roomCode, playerName, avatarType, avatarValue) => {
    if (!socket) return;
    setError("");
    socket.connect();
    socket.once("connect", () => {
      socket.emit("joinRoom", { roomCode, playerName, avatarType, avatarValue });
    });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
    }
    setScreen("HOME");
    setRoomCode("");
    setRoom(null);
  };

  return (
    <div className="app-viewport">
      {screen === "HOME" ? (
        <Home
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          onAchievementUnlocked={updateLocalAchievements}
        />
      ) : (
        <GameRoom
          socket={socket}
          roomCode={roomCode}
          room={room}
          playerId={playerId}
          onLeave={handleLeaveRoom}
        />
      )}

      {/* Sistema de Toasts Cyberpunk */}
      {toast && (
        <div 
          className={`cyber-toast toast-${toast.type}`} 
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "var(--panel-bg)",
            border: "2px solid " + (toast.type === "level_up" ? "var(--neon-blue)" : "var(--neon-pink)"),
            boxShadow: "0 0 20px " + (toast.type === "level_up" ? "var(--neon-blue-glow)" : "var(--neon-pink-glow)"),
            borderRadius: "12px",
            padding: "16px 20px",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backdropFilter: "blur(16px)",
            animation: "slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            maxWidth: "340px"
          }}
        >
          <div style={{ fontSize: "2rem" }}>
            {toast.type === "level_up" ? "⚡" : "🏆"}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "800", color: "#fff", fontFamily: "var(--font-primary)" }}>{toast.title}</h4>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-primary)", lineHeight: "1.3" }}>{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
