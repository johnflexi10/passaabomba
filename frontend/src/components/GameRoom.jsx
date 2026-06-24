import React, { useState, useEffect, useRef } from "react";
import { LogOut, Play, Shield, ListCollapse, Award, Volume2, VolumeX, CheckCircle, AlertCircle, HelpCircle, Users, Share2, Link, X } from "lucide-react";
import { audioService } from "../audio";
import BombAnimation from "./BombAnimation";

export default function GameRoom({ socket, roomCode, room, playerId, onLeave }) {
  const [wordInput, setWordInput] = useState("");
  const [wordFeedback, setWordFeedback] = useState(null); // { success: boolean, message: string }
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pendingContest, setPendingContest] = useState(null); // { playerId, playerName, word }
  const [wordSuggestion, setWordSuggestion] = useState(null); // Sugestão do corretor ortográfico
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Categoria e Letra escolhidas no painel do host (Adedonha)
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [showStartAnnouncement, setShowStartAnnouncement] = useState(false);
  const prevRoomStateRef = useRef(room.state);
  const announcedRoundRef = useRef(null);

  // Referências para rolar lista de palavras
  const wordsEndRef = useRef(null);

  // Temporizadores locais sincronizados
  const [localElapsedTime, setLocalElapsedTime] = useState(0);
  const [localSpeedMultiplier, setLocalSpeedMultiplier] = useState(1.0);
  const [autoRestartCountdown, setAutoRestartCountdown] = useState(3);

  // Customização Visual em Tempo Real no Lobby
  const [isCosmeticsOpen, setIsCosmeticsOpen] = useState(false);
  const [purchasedSkins] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pab_purchasedSkins")) || ["classic"];
    } catch {
      return ["classic"];
    }
  });
  const [purchasedEffects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pab_purchasedEffects")) || ["classic"];
    } catch {
      return ["classic"];
    }
  });
  const [purchasedTitles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pab_purchasedTitles")) || ["none"];
    } catch {
      return ["none"];
    }
  });

  const [activeSkin, setActiveSkin] = useState(() => localStorage.getItem("pab_activeSkin") || "classic");
  const [activeEffect, setActiveEffect] = useState(() => localStorage.getItem("pab_activeEffect") || "classic");
  const [activeTitle, setActiveTitle] = useState(() => localStorage.getItem("pab_activeTitle") || "none");

  const SKINS_METADATA = {
    classic: { name: "Clássica 💣", emoji: "💣", color: "gray" },
    neon: { name: "Neon Vibes 🌸", emoji: "🌸", color: "#ff007f" },
    ice: { name: "Gelo Glacial ❄️", emoji: "❄️", color: "#80deea" },
    cyberpunk: { name: "Cyber Hack 👾", emoji: "👾", color: "#00ffcc" },
    silent: { name: "Silenciosa 🥷", emoji: "🥷", color: "#888888" },
    toxic: { name: "Tóxica ☣️", emoji: "☣️", color: "#76ff03" },
    lava: { name: "Magma 🔥", emoji: "🌋", color: "#ff3700" },
    golden: { name: "Ouro Real 👑", emoji: "👑", color: "#ffd700" }
  };

  const EFFECTS_METADATA = {
    classic: { name: "Fogo 🔥", emoji: "🔥" },
    confetti: { name: "Confete 🎉", emoji: "🎉" },
    electric: { name: "Choque ⚡", emoji: "⚡" },
    toxic: { name: "Tóxico ☣️", emoji: "☣️" },
    volcano: { name: "Vulcão 🌋", emoji: "🌋" }
  };

  const TITLES_METADATA = {
    none: { name: "Sem Título 🏷️", label: "🏷️ Sem Título" },
    novato: { name: "Novato 🐣", label: "🐣 Novato" },
    lexico: { name: "Léxico 📖", label: "📖 Léxico de Aço" },
    veloz: { name: "Veloz ⚡", label: "⚡ Dedo Veloz" },
    master: { name: "Master 💣", label: "💣 Bomba Master" },
    imortal: { name: "Imortal 🏆", label: "🏆 Imortal" }
  };

  const handleSelectCosmetic = (type, id) => {
    if (type === "skin") {
      setActiveSkin(id);
      localStorage.setItem("pab_activeSkin", id);
      socket.emit("selectSkin", { roomCode, skinName: id, title: activeTitle, explosionEffect: activeEffect });
    } else if (type === "effect") {
      setActiveEffect(id);
      localStorage.setItem("pab_activeEffect", id);
      socket.emit("selectSkin", { roomCode, skinName: activeSkin, title: activeTitle, explosionEffect: id });
    } else if (type === "title") {
      setActiveTitle(id);
      localStorage.setItem("pab_activeTitle", id);
      socket.emit("selectSkin", { roomCode, skinName: activeSkin, title: id, explosionEffect: activeEffect });
    }
  };

  // Regressão visual da próxima rodada se o avanço automático estiver habilitado
  useEffect(() => {
    if (room.state === "EXPLODED" && room.config?.autoStartNextRound) {
      setAutoRestartCountdown(3);
      const interval = setInterval(() => {
        setAutoRestartCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [room.state, room.config?.autoStartNextRound]);

  const activePlayers = room.players || [];
  const myPlayer = activePlayers.find(p => p.id === playerId) || {};
  const isHost = room.hostId === playerId;
  const isMyTurn = room.bombHolderId === playerId && room.state === "ACTIVE";
  const currentHolder = activePlayers.find(p => p.id === room.bombHolderId) || {};

  // Desafios disponíveis para o host selecionar
  const CHALLENGES_LIST = [
    "Objetos da escola com a letra B",
    "Objetos da escola com a letra C",
    "Objetos da escola com a letra P",
    "Qualquer objeto da escola",
    "Animais que começam com C",
    "Animais que começam com G",
    "Animais que começam com M",
    "Animais que começam com A",
    "Qualquer Animal",
    "Qualquer Fruta",
    "Frutas que começam com M",
    "Frutas que começam com A",
    "Qualquer País",
    "Países que começam com A",
    "Países que começam com E",
    "Países que começam com C",
    "Qualquer Filme",
    "Filmes que começam com H",
    "Filmes que começam com O",
    "Qualquer Profissão",
    "Profissões que começam com M",
    "Profissões que começam com P"
  ];

  const CHALLENGES_BY_GROUP = {
    "Escola 🏫": [
      { id: 0, text: "Objetos da escola com a letra B" },
      { id: 1, text: "Objetos da escola com a letra C" },
      { id: 2, text: "Objetos da escola com a letra P" },
      { id: 3, text: "Qualquer objeto da escola" }
    ],
    "Animais 🦊": [
      { id: 4, text: "Animais que começam com C" },
      { id: 5, text: "Animais que começam com G" },
      { id: 6, text: "Animais que começam com M" },
      { id: 7, text: "Animais que começam com A" },
      { id: 8, text: "Qualquer Animal" }
    ],
    "Frutas 🍉": [
      { id: 9, text: "Qualquer Fruta" },
      { id: 10, text: "Frutas que começam com M" },
      { id: 11, text: "Frutas que começam com A" }
    ],
    "Países 🗺️": [
      { id: 12, text: "Qualquer País" },
      { id: 13, text: "Países que começam com A" },
      { id: 14, text: "Países que começam com E" },
      { id: 15, text: "Países que começam com C" }
    ],
    "Filmes 🎬": [
      { id: 16, text: "Qualquer Filme" },
      { id: 17, text: "Filmes que começam com H" },
      { id: 18, text: "Filmes que começam com O" }
    ],
    "Profissões 💼": [
      { id: 19, text: "Qualquer Profissão" },
      { id: 20, text: "Profissões que começam com M" },
      { id: 21, text: "Profissões que começam com P" }
    ]
  };

  // Efeitos Sonoros e Hápticos ativados por mudanças de estado
  useEffect(() => {
    if (!soundEnabled) {
      audioService.stopFuseHiss();
      audioService.stopBackgroundMusic();
      return;
    }

    if (room.state === "ACTIVE") {
      audioService.startFuseHiss();
      audioService.startBackgroundMusic();
    } else if (room.state === "EXPLODED") {
      audioService.playExplosion();
      audioService.stopFuseHiss();
      audioService.stopBackgroundMusic();

      // Vibração longa de explosão (500ms)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(500);
      }
    } else {
      audioService.stopFuseHiss();
      audioService.stopBackgroundMusic();
    }

    return () => {
      audioService.stopFuseHiss();
      audioService.stopBackgroundMusic();
    };
  }, [room.state, soundEnabled]);

  // Sincronização do Tique-Taque local baseado em ticks do servidor e feedback tátil
  useEffect(() => {
    if (room.state !== "ACTIVE" || room.config?.gameMode === "blind_bomb") return;

    // Se a skin da bomba atual for silenciosa, silencia o tique-taque
    if (currentHolder.skin === "silent") return;

    if (soundEnabled) {
      audioService.playTick(localSpeedMultiplier);
    }

    // Se a bomba está comigo, vibra simulando batimentos cardíacos rápidos quando tempo estiver acabando
    if (room.bombHolderId === playerId) {
      const isTimeAttack = room.config?.gameMode === "time_attack";
      const remainingTime = isTimeAttack 
        ? (myPlayer.personalTime || 30) 
        : (room.secretDuration || 30) - localElapsedTime;

      if (remainingTime <= 5 && remainingTime > 0 && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([80, 100, 80]); // Batimento cardíaco duplo
      }
    }
  }, [localElapsedTime, room.state, soundEnabled, localSpeedMultiplier, room.config?.gameMode, currentHolder.skin, room.bombHolderId, myPlayer.personalTime, currentHolder.personalTime, room.secretDuration, playerId]);

  // Sincroniza dados locais ao receber atualizações da sala
  useEffect(() => {
    if (room) {
      if (room.elapsedTime !== undefined) {
        setLocalElapsedTime(room.elapsedTime);
      }
      if (room.battleRoyaleSpeedMultiplier !== undefined) {
        setLocalSpeedMultiplier(room.battleRoyaleSpeedMultiplier);
      }
      if (room.selectedCategory !== undefined) {
        setSelectedCategory(room.selectedCategory);
      }
      if (room.selectedLetter !== undefined) {
        setSelectedLetter(room.selectedLetter);
      }
    }
  }, [room]);

  // Listeners adicionais de Socket.IO locais
  useEffect(() => {
    if (!socket) return;

    const onFeedback = (data) => {
      if (data.success) {
        const msg = data.message || "Palavra aceita!";
        setWordFeedback({ success: true, provisional: !!data.provisional, message: msg });
        setWordInput("");
        setWordSuggestion(null);
        if (soundEnabled) audioService.playSuccess();
        
        // Vibração física de sucesso
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(60);
        }
        setTimeout(() => setWordFeedback(null), data.provisional ? 3000 : 1500);
      } else {
        setWordFeedback({ success: false, message: data.reason });
        setWordSuggestion(null);
        if (soundEnabled) audioService.playFailure();
        
        // Habilita vibração física no celular se o navegador suportar
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        setTimeout(() => {
          setWordFeedback(prev => prev && !prev.success ? null : prev);
        }, 3000);
      }
    };

    const onBombPassed = (data) => {
      if (soundEnabled) audioService.playSuccess();
      setWordFeedback(null);
      setPendingContest(null);
      setWordSuggestion(null);

      // Vibração física de recebimento/passe da bomba (dupla rápida)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (data.toPlayerId === playerId || data.fromPlayerId === playerId) {
          navigator.vibrate([60, 40, 60]);
        }
      }
    };

    const onTimeTick = (data) => {
      setLocalElapsedTime(data.elapsedTime);
      setLocalSpeedMultiplier(data.speedMultiplier);
    };

    const onWordContest = (data) => {
      if (isHost) {
        setPendingContest(data);
      }
    };

    const onThemeSelectedUpdated = (data) => {
      if (data.category !== undefined) setSelectedCategory(data.category);
      if (data.letter !== undefined) setSelectedLetter(data.letter);
    };

    socket.on("wordFeedback", onFeedback);
    socket.on("bombPassed", onBombPassed);
    socket.on("timeTick", onTimeTick);
    socket.on("wordContest", onWordContest);
    socket.on("themeSelectedUpdated", onThemeSelectedUpdated);

    return () => {
      socket.off("wordFeedback", onFeedback);
      socket.off("bombPassed", onBombPassed);
      socket.off("timeTick", onTimeTick);
      socket.off("wordContest", onWordContest);
      socket.off("themeSelectedUpdated", onThemeSelectedUpdated);
    };
  }, [socket, soundEnabled]);

  useEffect(() => {
    // Só faz scroll quando o sidebar está aberto — evita que o browser
    // mova o viewport lateral para alcançar o elemento fora da tela
    if (isSidebarOpen) {
      wordsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
    }
  }, [room.usedWords, isSidebarOpen]);

  const roundId = room.currentRound !== undefined ? room.currentRound : room.currentTheme?.display;

  // 1. Dispara o anúncio de overlay e voz quando uma nova rodada começa
  useEffect(() => {
    if (room.state === "ACTIVE" && roundId && announcedRoundRef.current !== roundId) {
      announcedRoundRef.current = roundId;
      setShowStartAnnouncement(true);

      if (soundEnabled && room.currentTheme?.display && typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(`O tema é: ${room.currentTheme.display}`);
          utterance.lang = "pt-BR";
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("SpeechSynthesis error:", err);
        }
      }
    }
    // Sempre sincroniza o prevRoomStateRef.current
    if (room.state !== "ACTIVE") {
      prevRoomStateRef.current = room.state;
    }
  }, [room.state, roundId, soundEnabled, room.currentTheme]);

  // 2. Controla o fechamento do overlay de forma independente
  useEffect(() => {
    if (showStartAnnouncement) {
      const timer = setTimeout(() => {
        setShowStartAnnouncement(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showStartAnnouncement]);

  // Submissão de Palavra
  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (!wordInput.trim() || !isMyTurn) return;
    
    socket.emit("submitWord", {
      roomCode,
      word: wordInput.trim()
    });
  };

  // Iniciar Rodada (Host)
  const handleStartRound = () => {
    socket.emit("startRound", {
      roomCode
    });
  };

  // Abrir modal de compartilhamento de convite
  const handleCopyInvite = (e) => {
    if (e) e.preventDefault();
    setShowShareModal(true);
  };

  const handleCopyLinkOnly = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        setCopied(true);
        if (soundEnabled) audioService.playSuccess();
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Erro ao copiar link:", err);
      });
  };

  // Adicionar Bot de Teste (Host)
  const handleAddBot = () => {
    socket.emit("addBot", { roomCode });
  };

  // Sobrescrever palavra aceita pelo Host
  const handleHostOverride = (word, targetPlayerId) => {
    if (!isHost) return;
    socket.emit("hostAcceptWord", {
      roomCode,
      word,
      targetPlayerId
    });
  };

  // Calcula porcentagem do tempo decorrido (ocultado se for Bomba Cega)
  const totalDuration = room.secretDuration || 30;
  const isTimeAttack = room.config?.gameMode === "time_attack";
  const progressPercent = room.config?.gameMode === "blind_bomb" 
    ? 0 
    : isTimeAttack
      ? Math.min(1.0, Math.max(0.0, 1 - ((currentHolder.personalTime || 0) / (room.config?.roundTimeMax || 30))))
      : Math.min(localElapsedTime / totalDuration, 1.0);



  const playerLength = activePlayers.length;
  let playersCountClass = "players-count-sm";
  if (playerLength >= 18) {
    playersCountClass = "players-count-xxl";
  } else if (playerLength >= 14) {
    playersCountClass = "players-count-xl";
  } else if (playerLength >= 10) {
    playersCountClass = "players-count-lg";
  } else if (playerLength >= 6) {
    playersCountClass = "players-count-md";
  }

  return (
    <div className={`gameroom-container ${playersCountClass} ${isInputFocused ? "keyboard-active" : ""}`}>
      {/* Overlay de anúncio de início de rodada */}
      {showStartAnnouncement && room.currentTheme && (
        <div className="round-start-overlay">
          <div className="round-start-content glass-card">
            <span className="announcement-badge">Nova Rodada! 💣</span>
            <h2>O TEMA É:</h2>
            <h1 className="announcement-theme">{room.currentTheme.display}</h1>
            {room.currentTheme.letter && (
              <div className="announcement-letter-badge">
                Inicia com: {room.currentTheme.letter.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra superior de status */}
      <header className="room-navbar">
        <div className="room-nav-info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="room-code-badge">Sala: <strong>{roomCode}</strong></span>
          <button 
            onClick={handleCopyInvite} 
            className="btn btn-secondary" 
            title="Copiar Link de Convite"
            style={{ padding: "4px 8px", fontSize: "0.75rem", height: "auto", display: "inline-flex", alignItems: "center", gap: "4px", borderRadius: "6px" }}
          >
            {copied ? "Copiado! ✔️" : "🔗 Convidar"}
          </button>
          <span className="mode-badge">{room.config?.gameMode.toUpperCase()}</span>
          {room.currentRound !== undefined && room.currentRound > 0 && (
            <span className="round-badge">
              Rodada {room.currentRound}
              {room.config?.maxRounds > 0 ? `/${room.config.maxRounds}` : ""}
            </span>
          )}
        </div>
        
        <div className="room-nav-actions">
          <button
            className="btn-icon sidebar-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Palavras Usadas"
          >
            <ListCollapse size={20} className={isSidebarOpen ? "icon-pink" : "icon-blue"} />
          </button>
          <button className="btn-icon" onClick={() => setSoundEnabled(!soundEnabled)} title="Toggle Som">
            {soundEnabled ? <Volume2 size={20} className="icon-pink" /> : <VolumeX size={20} className="text-muted" />}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onLeave}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="room-layout-wrapper">
        {/* Painel Esquerdo com Regras e Configurações */}
        <aside className="room-info-panel">
          <div className="info-panel-header">
            <HelpCircle size={16} className="icon-blue" />
            <h3>Regras & Modos</h3>
          </div>
          <div className="info-panel-content">
            <div className="info-section">
              <h4>
                {room.config?.gameMode === "classic" ? "Modo Clássico 💣" :
                 room.config?.gameMode === "chaos_items" ? "Modo Caos 🛍️" :
                 room.config?.gameMode === "time_attack" ? "Contra o Tempo ⏳" : "Modo de Jogo"}
              </h4>
              <p>
                {room.config?.gameMode === "classic" && "Digite uma palavra que pertença ao tema e comece com a letra indicada antes que a bomba exploda!"}
                {room.config?.gameMode === "chaos_items" && "Acerte palavras para ganhar moedas. Use itens da loja como o Escudo (50💰) para evitar a explosão!"}
                {room.config?.gameMode === "time_attack" && "Você tem um cronômetro individual de 30 segundos. Acerte uma palavra para resetar seu tempo, ou exploda!"}
              </p>
            </div>

            <div className="info-section">
              <h4>Configurações</h4>
              <div className="info-list">
                <div className="info-item">
                  <span>Modo:</span>
                  <strong>
                    {room.config?.gameMode === "classic" ? "Clássico" :
                     room.config?.gameMode === "chaos_items" ? "Caos c/ Itens" :
                     room.config?.gameMode === "time_attack" ? "Contra o Tempo" : "Padrão"}
                  </strong>
                </div>
                <div className="info-item">
                  <span>Tempo Máx:</span>
                  <strong>{room.config?.roundTimeMax || 30}s</strong>
                </div>
                <div className="info-item">
                  <span>Vidas:</span>
                  <strong>{room.config?.maxLives || 3} ❤️</strong>
                </div>
                <div className="info-item">
                  <span>Sílaba/Letra:</span>
                  <strong>{room.config?.syllableMode ? "Sílaba" : "Letra Única"}</strong>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h4>Dica Premium</h4>
              <p>Evite repetir palavras. Fique atento ao cronômetro visual da bomba no centro da tela e seja rápido!</p>
            </div>
          </div>
        </aside>

        {/* Painel do Jogo / Arena Central */}
        <main className="game-arena-wrapper">
          <div className="arena-circle-container">
            {/* Círculo do cronômetro visual em conic-gradient */}
            <div className="center-card-wrapper" style={{ "--progress": `${progressPercent * 100}%` }}>
              <div className={`arena-center-card state-${room.state ? room.state.toLowerCase() : "lobby"}`}>
                <div className="center-bomb-container">
                  <BombAnimation
                    state={room.state}
                    progress={progressPercent}
                    skin={currentHolder.skin || "classic"}
                    explosionEffect={currentHolder.explosionEffect || "classic"}
                  />
                </div>

                <div className="center-info-content">
                  {room.state === "ACTIVE" ? (
                    <>
                      <span className="theme-sub">Tema Atual</span>
                      <h2 className="center-theme-text">{room.currentTheme?.display}</h2>
                      {room.currentTheme?.letter && (
                        <div className="letter-badge">Inicia com: {room.currentTheme.letter.toUpperCase()}</div>
                      )}

                      {isMyTurn ? (
                        <form onSubmit={handleWordSubmit} className="center-word-form">
                          <div className="input-feedback-wrapper">
                            <input
                              type="text"
                              className="word-textbox center-textbox"
                              placeholder="Sua vez! Digite..."
                              autoFocus
                              value={wordInput}
                              onFocus={() => setIsInputFocused(true)}
                              onBlur={() => setIsInputFocused(false)}
                              onChange={(e) => {
                                setWordInput(e.target.value);
                                if (wordFeedback) {
                                  setWordFeedback(null);
                                  setWordSuggestion(null);
                                }
                              }}
                            />
                            {wordFeedback && (
                              <div className={`word-feedback center-feedback ${
                                wordFeedback.success
                                  ? (wordFeedback.provisional ? "provisional" : "success")
                                  : "error"
                              }`}>
                                <span>{wordFeedback.message}</span>
                              </div>
                            )}
                            {/* Corretor desativado a pedido do usuário */}
                          </div>
                        </form>
                      ) : null}

                      {/* Painel de Itens no Modo Caos */}
                      {room.config?.gameMode === "chaos_items" && (
                        <div className="chaos-items-tray" style={{ marginTop: "10px", borderTop: "1px dotted rgba(255,255,255,0.15)", paddingTop: "8px", width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "0.8rem", color: "var(--neon-blue)" }}>
                            <span>🛍️ Loja de Itens:</span>
                            <strong style={{ color: "var(--neon-green)" }}>💰 {myPlayer.coins || 0}</strong>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                            <button 
                              type="button" 
                              onClick={() => socket.emit("useItem", { roomCode, itemId: "shield" })} 
                              className="btn btn-secondary btn-sm"
                              disabled={myPlayer.hasShield || (myPlayer.coins || 0) < 50 || myPlayer.isEliminated}
                              style={{ fontSize: "0.7rem", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", height: "auto" }}
                              title="Escudo: Evita explodir 1 vez (50 Moedas)"
                            >
                              <span>🛡️</span>
                              <span style={{ fontSize: "0.6rem" }}>{myPlayer.hasShield ? "Ativo" : "50💰"}</span>
                            </button>
                            <button 
                              type="button" 
                              onClick={() => socket.emit("useItem", { roomCode, itemId: "freeze" })} 
                              className="btn btn-secondary btn-sm"
                              disabled={!isMyTurn || (myPlayer.coins || 0) < 40 || room.isFrozen || myPlayer.isEliminated}
                              style={{ fontSize: "0.7rem", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", height: "auto" }}
                              title="Congelar: Pausa a bomba por 5s (40 Moedas)"
                            >
                              <span>❄️</span>
                              <span style={{ fontSize: "0.6rem" }}>{room.isFrozen ? "Congelada" : "40💰"}</span>
                            </button>
                            <button 
                              type="button" 
                              onClick={() => socket.emit("useItem", { roomCode, itemId: "skip" })} 
                              className="btn btn-secondary btn-sm"
                              disabled={!isMyTurn || (myPlayer.coins || 0) < 30 || myPlayer.isEliminated}
                              style={{ fontSize: "0.7rem", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", height: "auto" }}
                              title="Pular: Passa a bomba sem responder (30 Moedas)"
                            >
                              <span>⏭️</span>
                              <span style={{ fontSize: "0.6rem" }}>30💰</span>
                            </button>
                            <button 
                              type="button" 
                              onClick={() => socket.emit("useItem", { roomCode, itemId: "reverse" })} 
                              className="btn btn-secondary btn-sm"
                              disabled={(myPlayer.coins || 0) < 25 || myPlayer.isEliminated}
                              style={{ fontSize: "0.7rem", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", height: "auto" }}
                              title="Inverter: Inverte a direção dos turnos (25 Moedas)"
                            >
                              <span>🔄</span>
                              <span style={{ fontSize: "0.6rem" }}>25💰</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : room.state === "EXPLODED" ? (
                    <div className="center-explosion-info">
                      <span className="explosion-icon">💥</span>
                      <h2>Cabum!</h2>
                      <p className="loser-text">{room.explanation || "Alguém explodiu!"}</p>
                      {room.config?.autoStartNextRound && (
                        <div className="center-auto-countdown">
                          <span>Próxima rodada em</span>
                          <div className="countdown-pulse">{autoRestartCountdown}s</div>
                        </div>
                      )}
                    </div>
                  ) : room.state === "GAME_OVER" ? (
                    <div className="center-gameover-info">
                      <span className="trophy-icon">🏆</span>
                      <h2>Fim de Jogo!</h2>
                      <p className="winner-text">
                        {room.winnerName ? `${room.winnerName} venceu!` : "Sem sobreviventes!"}
                      </p>
                    </div>
                  ) : (
                    <div className="center-lobby-info">
                      <h2 style={{ fontSize: "clamp(1rem, 4vw, 1.4rem)", margin: 0 }}>Lobby</h2>
                      <p className="text-muted" style={{ fontSize: "clamp(0.65rem, 3vw, 0.85rem)", margin: 0 }}>Aguardando início...</p>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "6px", width: "100%" }}>
                        <button 
                          onClick={handleCopyInvite} 
                          className="btn btn-secondary btn-sm" 
                          style={{ fontSize: "clamp(0.65rem, 3vw, 0.8rem)", padding: "4px 10px", borderRadius: "6px", flex: 1 }}
                        >
                          {copied ? "Pronto! ✔️" : "🔗 Convidar"}
                        </button>
                        <button 
                          onClick={() => setIsCosmeticsOpen(true)} 
                          className="btn btn-primary btn-sm" 
                          style={{ fontSize: "clamp(0.65rem, 3vw, 0.8rem)", padding: "4px 10px", borderRadius: "6px", flex: 1, background: "linear-gradient(135deg, var(--neon-pink), var(--neon-purple))", border: "none" }}
                        >
                          🎨 Visual
                        </button>
                      </div>
                      {(selectedCategory !== "" || selectedLetter !== "") && (
                        <div style={{ marginTop: "6px", width: "100%", overflow: "hidden" }}>
                          <span style={{ fontSize: "clamp(0.55rem, 2.5vw, 0.7rem)", color: "var(--text-muted)", display: "block" }}>Tema:</span>
                          <strong style={{ color: "var(--neon-blue)", fontSize: "clamp(0.6rem, 2.8vw, 0.85rem)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                            {selectedCategory !== "" ? (
                              selectedCategory === "escola" ? "Escola 🏫" :
                              selectedCategory === "animais" ? "Animais 🦊" :
                              selectedCategory === "frutas" ? "Frutas 🍉" :
                              selectedCategory === "paises" ? "Países 🗺️" :
                              selectedCategory === "filmes" ? "Filmes 🎬" :
                              selectedCategory === "profissoes" ? "Profissões 💼" :
                              selectedCategory === "nome" ? "Nomes 👤" :
                              selectedCategory === "objeto" ? "Objetos 🎒" :
                              selectedCategory === "cor" ? "Cores 🎨" :
                              selectedCategory === "comida" ? "Comidas 🍕" : selectedCategory
                            ) : "Qualquer 🎲"}
                            {selectedLetter !== "" ? ` · ${selectedLetter.toUpperCase()}` : " · 🎲"}
                          </strong>
                        </div>
                      )}
                    </div>

                  )}
                </div>
              </div>
            </div>

            {/* Jogadores dispostos na elipse */}
            {activePlayers.map((player, index) => {
              const hasBomb = (room.state === "ACTIVE" || room.state === "EXPLODED") && room.bombHolderId === player.id;
              const isPlayerHost = room.hostId === player.id;

              // Determina cor de tinta determinística se eliminado
              const inkColors = ["pink", "cyan", "green", "yellow"];
              const playerInkIndex = activePlayers.findIndex(p => p.id === player.id) % inkColors.length;
              const inkColor = inkColors[playerInkIndex >= 0 ? playerInkIndex : 0];

              // Cálculo de posição responsiva em formato de retângulo com bordas arredondadas (Squircle)
              const total = activePlayers.length || 1;
              const theta = (index / total) * 2.0 * Math.PI - Math.PI / 2.0;
              const ct = Math.cos(theta);
              const st = Math.sin(theta);
              const r = 3.2; // Expoente de arredondamento (quanto maior, mais próximo de um retângulo reto)
              const cosVal = (Math.sign(ct) * Math.pow(Math.abs(ct), 2 / r)).toFixed(4);
              const sinVal = (Math.sign(st) * Math.pow(Math.abs(st), 2 / r)).toFixed(4);

              const isSelf = player.id === playerId;
              const style = {
                left: `calc(50% + ${cosVal} * var(--ellipse-rx) - var(--card-half-width))`,
                top: `calc(50% + ${sinVal} * var(--ellipse-ry) - var(--card-half-height))`,
                cursor: isSelf ? "pointer" : "default"
              };

              return (
                <div
                  key={player.id}
                  className={`player-wrap-slot ${hasBomb ? "active-slot" : ""} ${player.isEliminated ? "elim-slot" : ""} ${isSelf ? "self-slot" : ""}`}
                  onClick={isSelf ? () => setIsCosmeticsOpen(true) : undefined}
                  style={style}
                >
                  <div className="slot-avatar-frame">
                    {player.avatarType === "photo" ? (
                      <img
                        src={player.avatarValue}
                        alt={player.name}
                        className="slot-avatar-photo-img"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23555'/%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <span className="slot-avatar-emoji-val">
                        {player.avatarValue || "👽"}
                      </span>
                    )}
                  </div>

                  {/* Detalhes do jogador */}
                  <div className="slot-label-capsule">
                    <span className="slot-online-dot" style={{ backgroundColor: player.isConnected ? "var(--neon-green)" : "#555" }}></span>
                    <span className="slot-name">
                      {hasBomb && <span className="mini-bomb-icon" title="Com a bomba!">💣</span>}
                      {player.hasShield && <span className="mini-shield-icon" title="Escudo Ativo!" style={{ marginRight: "3px" }}>🛡️</span>}
                      {player.name} {player.id === playerId ? " (Você)" : ""}
                      {isPlayerHost && <span className="host-star" title="Anfitrião">👑</span>}
                    </span>
                    {player.title && player.title !== "none" && (
                      <span className="slot-title" style={{ fontSize: "0.62rem", color: "var(--neon-pink)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>
                        {player.title === "novato" && "🐣 Novato"}
                        {player.title === "lexico" && "📖 Léxico de Aço"}
                        {player.title === "veloz" && "⚡ Dedo Veloz"}
                        {player.title === "master" && "💣 Bomba Master"}
                        {player.title === "imortal" && "🏆 Imortal"}
                      </span>
                    )}
                    <span className="slot-score">{player.score} pts</span>
                    {room.config?.gameMode === "hot_potato" && (
                      <span className="slot-lives" style={{ color: "var(--neon-pink)", fontSize: "0.75rem", display: "block", marginTop: "2px" }}>
                        {"❤️".repeat(Math.max(0, player.lives || 0)) || "💀"}
                      </span>
                    )}
                    {room.config?.gameMode === "time_attack" && !player.isEliminated && room.state === "ACTIVE" && (
                      <div className="personal-timer-container" style={{ marginTop: "4px", width: "100%", textAlign: "center" }}>
                        <span className={`personal-timer-text ${hasBomb ? "glow-red" : ""}`} style={{ fontSize: "0.75rem", fontWeight: "bold", color: (player.personalTime || 30) <= 5 ? "var(--neon-pink)" : "var(--neon-blue)" }}>
                          ⏱️ {player.personalTime || 30}s
                        </span>
                        <div className="personal-timer-bar-bg" style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                          <div 
                            className="personal-timer-bar-fill" 
                            style={{ 
                              width: `${Math.min(100, Math.max(0, ((player.personalTime || 30) / (room.config?.roundTimeMax || 30)) * 100))}%`, 
                              height: "100%", 
                              background: (player.personalTime || 30) <= 5 ? "var(--neon-pink)" : "var(--neon-blue)",
                              boxShadow: (player.personalTime || 30) <= 5 ? "0 0 5px var(--neon-pink)" : "0 0 5px var(--neon-blue)",
                              transition: "width 0.2s linear"
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* splash de tinta se eliminado */}
                  {player.isEliminated && (
                    <div className={`ink-splat splat-${inkColor}`} title="Eliminado com Tinta!" />
                  )}
                </div>
              );
            })}

            {/* ZONA 3 — Mensagens Flutuantes (abaixo do círculo, sem invadir avatares) */}
            <div className="arena-message-layer">
              {room.state === "ACTIVE" && room.lastWord && (
                <div className="arena-msg-last-word">
                  <strong>{room.lastWordPlayer}</strong> disse:{" "}
                  <span className="last-word-val">"{room.lastWord}"</span> ✔️
                </div>
              )}
              {room.state === "ACTIVE" && !isMyTurn && (
                <div className="arena-msg-turn">
                  Vez de <strong>{currentHolder.name || "Aguardando"}</strong> 💣
                </div>
              )}
              {room.state === "ACTIVE" && isMyTurn && (
                <div className="arena-msg-turn arena-msg-my-turn">
                  💣 Sua vez!
                </div>
              )}
            </div>
          </div>

          {/* Rodapé: Controles de início/próxima rodada para o Host (apenas fora do ACTIVE) */}
          {room.state !== "ACTIVE" && (
            <footer className="arena-footer-controls">
              {room.state === "EXPLODED" && room.config?.autoStartNextRound ? (
                <p className="text-center text-muted" style={{ width: "100%", margin: "10px 0" }}>
                  A rodada explodiu! A próxima rodada iniciará automaticamente em <strong style={{ color: "var(--neon-pink)" }}>{autoRestartCountdown}</strong> segundos... 💣
                </p>
              ) : isHost ? (
                <div className="host-start-panel">
                  <div className="theme-selection" style={{ display: "flex", gap: "10px", width: "100%", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        <Shield size={14} className="icon-yellow" /> Categoria:
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCategory(val);
                          socket.emit("updateSelectedTheme", { roomCode, category: val, letter: selectedLetter });
                        }}
                        style={{ width: "100%", background: "var(--bg-darker)", color: "#fff", border: "1px solid var(--panel-border)", padding: "10px", borderRadius: "8px" }}
                      >
                        <option value="">Qualquer Categoria 🎲</option>
                        <option value="nome">Nomes 👤</option>
                        <option value="objeto">Objetos 🎒</option>
                        <option value="animais">Animais 🦊</option>
                        <option value="frutas">Frutas 🍉</option>
                        <option value="paises">Países 🗺️</option>
                        <option value="cor">Cores 🎨</option>
                        <option value="profissoes">Profissões 💼</option>
                        <option value="filmes">Filmes/Séries 🎬</option>
                        <option value="comida">Comidas 🍕</option>
                        <option value="escola">Objetos da Escola 🏫</option>
                      </select>
                    </div>

                    <div style={{ flex: "0 0 120px" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        Letra Inicial:
                      </label>
                      <select
                        value={selectedLetter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedLetter(val);
                          socket.emit("updateSelectedTheme", { roomCode, category: selectedCategory, letter: val });
                        }}
                        style={{ width: "100%", background: "var(--bg-darker)", color: "#fff", border: "1px solid var(--panel-border)", padding: "10px", borderRadius: "8px", textAlign: "center" }}
                      >
                        <option value="">Qualquer 🎲</option>
                        {"abcdefghijlmnopqrstuvz".split("").map((l) => (
                          <option key={l} value={l}>{l.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={handleStartRound}>
                    <Play size={18} /> Iniciar Rodada
                  </button>
                  <button className="btn btn-neon btn-lg" onClick={handleAddBot} title="Adicionar Robô de Teste">
                    🤖 +Bot
                  </button>
                </div>
              ) : (
                <p className="text-center text-muted">Aguardando o anfitrião iniciar a rodada.</p>
              )}
            </footer>
          )}
        </main>

        {/* Sidebar com Palavras Usadas deslizante */}
        <aside className={`room-sidebar-panel ${isSidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <ListCollapse size={16} className="icon-cyan" />
            <h3>Palavras Usadas ({room.usedWords?.length || 0})</h3>
          </div>
          <div className="sidebar-list words-list">
            {room.usedWords && room.usedWords.length > 0 ? (
              room.usedWords.map((item, idx) => (
                <div key={idx} className="used-word-item">
                  <span className="used-word-text">✔️ {item.word}</span>
                  <span className="used-word-by">por {item.player}</span>
                </div>
              ))
            ) : (
              <p className="no-words text-muted">Nenhuma palavra usada ainda.</p>
            )}
            <div ref={wordsEndRef} />
          </div>
        </aside>
      </div>

      {/* Pop-up de Aprovação Rápida para o Anfitrião */}
      {isHost && pendingContest && room.state === "ACTIVE" && (
        <div className="host-contest-toast card glass-card">
          <div className="contest-header">
            <Shield size={16} className="icon-yellow" />
            <h4>Aprovação do Anfitrião</h4>
          </div>
          <p>
            <strong>{pendingContest.playerName}</strong> digitou <strong>"{pendingContest.word}"</strong>, que foi rejeitada. Deseja aceitar a palavra?
          </p>
          <div className="contest-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                socket.emit("hostAcceptWord", {
                  roomCode,
                  word: pendingContest.word,
                  targetPlayerId: pendingContest.playerId
                });
                setPendingContest(null);
              }}
            >
              Sim 👍
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPendingContest(null)}
            >
              Não 👎
            </button>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento / Convites */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid hsla(0, 0%, 100%, 0.05)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Convidar Amigos 🎮</h3>
              <button
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                onClick={() => setShowShareModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>
              Compartilhe o código ou o link da sala com seus amigos para começar a partida!
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--bg-darker)", border: "1px solid var(--panel-border)", padding: "12px", borderRadius: "10px", marginBottom: "16px", textAlign: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold" }}>Código da Sala</span>
              <strong style={{ fontSize: "2rem", color: "var(--neon-blue)", letterSpacing: "2px", fontFamily: "var(--font-game)" }}>{roomCode}</strong>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?room=${roomCode}`}
                style={{ flex: 1, background: "var(--bg-darker)", border: "1px solid var(--panel-border)", color: "#fff", borderRadius: "8px", padding: "8px 12px", fontSize: "0.85rem" }}
                onClick={(e) => e.target.select()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleCopyLinkOnly} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                <Link size={14} /> {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>

            <div className="share-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🎮 *Passa a Bomba* - Venha jogar comigo!\n📌 Código da Sala: *${roomCode}*\n🔗 Entre pelo link: ${window.location.origin}${window.location.pathname}?room=${roomCode}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary share-btn-whatsapp"
                style={{ fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", textDecoration: "none", color: "#fff" }}
              >
                <span>💬 WhatsApp</span>
              </a>

              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(
                  `${window.location.origin}${window.location.pathname}?room=${roomCode}`
                )}&text=${encodeURIComponent(`🎮 Passa a Bomba - Venha jogar comigo! Código: ${roomCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary share-btn-telegram"
                style={{ fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", textDecoration: "none", color: "#fff" }}
              >
                <span>✈️ Telegram</span>
              </a>

              {/* Discord */}
              <button
                className="btn btn-secondary share-btn-discord"
                style={{ fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#fff" }}
                onClick={() => {
                  const discordMsg = `🎮 *Passa a Bomba* - Venha jogar comigo!\n📌 Código da Sala: **${roomCode}**\n🔗 Entre pelo link: ${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                  navigator.clipboard.writeText(discordMsg).then(() => {
                    setCopied(true);
                    if (soundEnabled) audioService.playSuccess();
                    setTimeout(() => setCopied(false), 2000);
                    alert("Mensagem formatada copiada para colar no Discord! Abrindo o Discord...");
                    window.open("https://discord.com/channels/@me", "_blank");
                  });
                }}
              >
                <span>👾 Discord</span>
              </button>

              {/* Native sharing on mobile */}
              {typeof navigator !== "undefined" && navigator.share && (
                <button
                  className="btn btn-neon share-btn-native"
                  style={{ fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  onClick={() => {
                    navigator.share({
                      title: "Passa a Bomba",
                      text: `🎮 Passa a Bomba - Venha jogar comigo! Código: ${roomCode}`,
                      url: `${window.location.origin}${window.location.pathname}?room=${roomCode}`,
                    }).catch(err => console.log(err));
                  }}
                >
                  <Share2 size={14} />
                  <span>Compartilhar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Customização Visual */}
      {isCosmeticsOpen && (
        <div className="cosmetics-drawer-overlay" onClick={() => setIsCosmeticsOpen(false)}>
          <div className="cosmetics-drawer glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>🎨 Personalizar Visual</h3>
              <button className="btn-close" onClick={() => setIsCosmeticsOpen(false)}>✕</button>
            </div>
            
            <div className="drawer-content">
              {/* Seção Skins */}
              <div className="drawer-section">
                <h4>Skins de Bomba ({purchasedSkins.length})</h4>
                <div className="cosmetics-horizontal-scroll">
                  {purchasedSkins.map(id => {
                    const meta = SKINS_METADATA[id] || { name: id, emoji: "💣" };
                    const isActive = activeSkin === id;
                    return (
                      <button 
                        key={id} 
                        className={`cosmetic-item-btn ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectCosmetic("skin", id)}
                      >
                        <span className="cosmetic-emoji" style={{ color: meta.color }}>{meta.emoji}</span>
                        <span className="cosmetic-name">{meta.name}</span>
                        {isActive && <span className="active-badge">Equipado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção Efeitos */}
              <div className="drawer-section">
                <h4>Efeitos de Explosão ({purchasedEffects.length})</h4>
                <div className="cosmetics-horizontal-scroll">
                  {purchasedEffects.map(id => {
                    const meta = EFFECTS_METADATA[id] || { name: id, emoji: "💥" };
                    const isActive = activeEffect === id;
                    return (
                      <button 
                        key={id} 
                        className={`cosmetic-item-btn ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectCosmetic("effect", id)}
                      >
                        <span className="cosmetic-emoji">{meta.emoji}</span>
                        <span className="cosmetic-name">{meta.name}</span>
                        {isActive && <span className="active-badge">Equipado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção Títulos */}
              <div className="drawer-section">
                <h4>Títulos de Perfil ({purchasedTitles.length})</h4>
                <div className="cosmetics-horizontal-scroll">
                  {purchasedTitles.map(id => {
                    const meta = TITLES_METADATA[id] || { name: id, label: "🏷️" };
                    const isActive = activeTitle === id;
                    return (
                      <button 
                        key={id} 
                        className={`cosmetic-item-btn ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectCosmetic("title", id)}
                      >
                        <span className="cosmetic-emoji">🏷️</span>
                        <span className="cosmetic-name">{meta.name}</span>
                        {isActive && <span className="active-badge">Equipado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <button className="btn btn-primary btn-block btn-confirm" onClick={() => setIsCosmeticsOpen(false)}>
              Confirmar Visual
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
