import React, { useState, useEffect } from "react";
import { Play, Sparkles, Trophy, Users, ShieldAlert, Award, ShoppingBag, Coins, ArrowRight, User } from "lucide-react";
import { audioService } from "../audio";

export default function Home({ onCreateRoom, onJoinRoom, error, onAchievementUnlocked }) {
  const [activeTab, setActiveTab] = useState("play"); // play, shop, stats
  const [shopSubTab, setShopSubTab] = useState("skins"); // skins, effects, titles
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("pab_playerName") || "");
  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("room") || "").toUpperCase();
  });
  const [showConfig, setShowConfig] = useState(false);

  // Seleção de Tipo de Avatar e Valor do Avatar
  const [avatarType, setAvatarType] = useState(() => localStorage.getItem("pab_avatarType") || "emoji");
  const [avatarValue, setAvatarValue] = useState(() => localStorage.getItem("pab_avatarValue") || "👽");

  // Configurações padrão de criação de sala
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [gameMode, setGameMode] = useState("classic");
  const [roundTimeMin, setRoundTimeMin] = useState(15);
  const [roundTimeMax, setRoundTimeMax] = useState(45);
  const [maxRounds, setMaxRounds] = useState("infinite");
  const [autoStartNextRound, setAutoStartNextRound] = useState(true);

  // Moedas e Skins persistidas no localStorage
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem("pab_coins");
    return saved ? parseInt(saved) : 120; // 120 moedas iniciais
  });

  const [purchasedSkins, setPurchasedSkins] = useState(() => {
    const saved = localStorage.getItem("pab_purchasedSkins");
    return saved ? JSON.parse(saved) : ["classic"];
  });

  const [activeSkin, setActiveSkin] = useState(() => {
    return localStorage.getItem("pab_activeSkin") || "classic";
  });

  // Novos Cosméticos (Efeitos e Títulos)
  const [purchasedEffects, setPurchasedEffects] = useState(() => {
    const saved = localStorage.getItem("pab_purchasedEffects");
    return saved ? JSON.parse(saved) : ["classic"];
  });
  const [activeEffect, setActiveEffect] = useState(() => {
    return localStorage.getItem("pab_activeEffect") || "classic";
  });
  const [purchasedTitles, setPurchasedTitles] = useState(() => {
    const saved = localStorage.getItem("pab_purchasedTitles");
    return saved ? JSON.parse(saved) : ["none"];
  });
  const [activeTitle, setActiveTitle] = useState(() => {
    return localStorage.getItem("pab_activeTitle") || "none";
  });

  // Estatísticas persistidas no localStorage
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem("pab_stats");
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      gamesPlayed: parsed.gamesPlayed || 0,
      wins: parsed.wins || 0,
      bombsExploded: parsed.bombsExploded || 0,
      correctWords: parsed.correctWords || 0,
      highScore: parsed.highScore || 0,
      xp: parsed.xp || 0
    };
  });

  const [globalRanking, setGlobalRanking] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : `${window.location.protocol}//${window.location.hostname}:3000`
  );

  useEffect(() => {
    if (activeTab === "stats") {
      setLoadingRanking(true);
      fetch(`${BACKEND_URL}/api/leaderboard`)
        .then((res) => res.json())
        .then((data) => {
          setGlobalRanking(data);
          setLoadingRanking(false);
        })
        .catch((err) => {
          console.error("Erro ao buscar leaderboard:", err);
          setLoadingRanking(false);
        });
    }
  }, [activeTab]);

  // Conquistas persistidas
  const [achievements, setAchievements] = useState(() => {
    const saved = localStorage.getItem("pab_achievements");
    return saved ? JSON.parse(saved) : {
      firstGame: false,
      wordMaster: false, // 5+ palavras em uma rodada
      survivor: false,   // Sobreviveu com menos de 3s
      goldenSkin: false, // Comprou skin dourada
      firstWin: false    // Venceu uma partida
    };
  });

  // Salva nome do jogador
  useEffect(() => {
    localStorage.setItem("pab_playerName", playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem("pab_avatarType", avatarType);
  }, [avatarType]);

  useEffect(() => {
    localStorage.setItem("pab_avatarValue", avatarValue);
  }, [avatarValue]);

  // Sincroniza moedas e cosméticos
  useEffect(() => {
    localStorage.setItem("pab_coins", coins);
    localStorage.setItem("pab_purchasedSkins", JSON.stringify(purchasedSkins));
    localStorage.setItem("pab_activeSkin", activeSkin);
    localStorage.setItem("pab_purchasedEffects", JSON.stringify(purchasedEffects));
    localStorage.setItem("pab_activeEffect", activeEffect);
    localStorage.setItem("pab_purchasedTitles", JSON.stringify(purchasedTitles));
    localStorage.setItem("pab_activeTitle", activeTitle);
    
    // Conquista de ostentação se tiver skin dourada
    if ((purchasedSkins.includes("golden") || purchasedTitles.includes("imortal")) && !achievements.goldenSkin) {
      triggerAchievement("goldenSkin");
    }
  }, [coins, purchasedSkins, activeSkin, purchasedEffects, activeEffect, purchasedTitles, activeTitle]);

  const triggerAchievement = (key) => {
    if (onAchievementUnlocked) {
      onAchievementUnlocked(key);
      setAchievements((prev) => ({ ...prev, [key]: true }));
    } else {
      const updated = { ...achievements, [key]: true };
      setAchievements(updated);
      localStorage.setItem("pab_achievements", JSON.stringify(updated));
      audioService.playSuccess();
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return alert("Insira seu nome de jogador.");
    
    // Garante que o AudioContext está inicializado
    audioService.init();

    onCreateRoom(playerName.trim(), {
      maxPlayers,
      gameMode,
      roundTimeMin,
      roundTimeMax,
      activeSkin,
      maxRounds: maxRounds === "infinite" ? 0 : parseInt(maxRounds),
      autoStartNextRound: !!autoStartNextRound
    }, avatarType, avatarValue);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return alert("Insira seu nome de jogador.");
    if (!roomCode.trim()) return alert("Insira o código da sala.");

    audioService.init();

    onJoinRoom(roomCode.trim(), playerName.trim(), avatarType, avatarValue);
  };

  // Compra de Skins
  const skinsList = [
    { id: "classic", name: "Bomba Clássica", price: 0, desc: "A bomba clássica de ferro com pavio.", color: "gray" },
    { id: "neon", name: "Neon Vibes", price: 50, desc: "Bomba fluorescente rosa que pulsa luz neon.", color: "#ff007f" },
    { id: "ice", name: "Gelo Glacial", price: 90, desc: "Moldada em gelo eterno com cristais cintilantes.", color: "#80deea" },
    { id: "cyberpunk", name: "Cyber Hack", price: 100, desc: "Circuito cibernético azul com detalhes futuristas.", color: "#00ffcc" },
    { id: "silent", name: "Bomba Silenciosa", price: 120, desc: "Bomba furtiva que silencia o tique-taque ao ser segurada.", color: "#888888" },
    { id: "toxic", name: "Resíduo Tóxico", price: 130, desc: "Verde radioativo com o símbolo de risco biológico.", color: "#76ff03" },
    { id: "lava", name: "Núcleo de Lava", price: 150, desc: "Fendas de magma fervente brilhando em chamas.", color: "#ff3700" },
    { id: "golden", name: "Bomba de Ouro", price: 200, desc: "Ostentação de ouro maciço com coroa de realeza.", color: "#ffd700" }
  ];

  // Compra de Efeitos de Explosão
  const effectsList = [
    { id: "classic", name: "Fogo Clássico 🔥", price: 0, desc: "Explosão padrão com labaredas de fogo e fumaça." },
    { id: "confetti", name: "Festa de Confete 🎉", price: 40, desc: "Celebre com uma chuva de confetes coloridos!" },
    { id: "electric", name: "Choque Elétrico ⚡", price: 60, desc: "Raios elétricos cianos brilhantes de alta tensão." },
    { id: "toxic", name: "Nuvem Tóxica ☣️", price: 80, desc: "Deixa uma densa fumaça verde radioativa." },
    { id: "volcano", name: "Magma Vulcânico 🌋", price: 100, desc: "Chuva de fagulhas e brasa vulcânica incandescente." }
  ];

  // Compra de Títulos de Perfil
  const titlesList = [
    { id: "none", name: "Sem Título 🏷️", price: 0, desc: "Nenhum título especial exibido." },
    { id: "novato", name: "🐣 Novato", price: 15, desc: "Tag simples indicando que você começou sua jornada." },
    { id: "lexico", name: "📖 Léxico de Aço", price: 30, desc: "Seu dicionário mental é indestrutível." },
    { id: "veloz", name: "⚡ Dedo Veloz", price: 50, desc: "Para aqueles que digitam na velocidade da luz." },
    { id: "master", name: "💣 Bomba Master", price: 70, desc: "Apenas para os veteranos das arenas cyberpunk." },
    { id: "imortal", name: "🏆 Imortal", price: 100, desc: "O mais prestigioso título do Passa a Bomba." }
  ];

  const buySkin = (skin) => {
    if (coins >= skin.price) {
      setCoins(coins - skin.price);
      setPurchasedSkins([...purchasedSkins, skin.id]);
      setActiveSkin(skin.id);
      audioService.playSuccess();
    } else {
      audioService.playFailure();
      alert("Moedas insuficientes!");
    }
  };

  const buyEffect = (eff) => {
    if (coins >= eff.price) {
      setCoins(coins - eff.price);
      setPurchasedEffects([...purchasedEffects, eff.id]);
      setActiveEffect(eff.id);
      audioService.playSuccess();
    } else {
      audioService.playFailure();
      alert("Moedas insuficientes!");
    }
  };

  const buyTitle = (t) => {
    if (coins >= t.price) {
      setCoins(coins - t.price);
      setPurchasedTitles([...purchasedTitles, t.id]);
      setActiveTitle(t.id);
      audioService.playSuccess();
    } else {
      audioService.playFailure();
      alert("Moedas insuficientes!");
    }
  };

  return (
    <div className="home-container">
      {/* Cabeçalho */}
      <header className="home-header">
        <div className="logo-section">
          <div className="bomb-logo-icon">💣</div>
          <h1>Passa a Bomba</h1>
        </div>
        <div className="user-coins">
          <Coins size={18} className="coin-icon" />
          <span>{coins} moedas</span>
        </div>
      </header>

      {/* Tabs de navegação */}
      <nav className="home-tabs">
        <button className={activeTab === "play" ? "active" : ""} onClick={() => setActiveTab("play")}>
          <Play size={16} /> Jogar
        </button>
        <button className={activeTab === "shop" ? "active" : ""} onClick={() => setActiveTab("shop")}>
          <ShoppingBag size={16} /> Loja de Skins
        </button>
        <button className={activeTab === "stats" ? "active" : ""} onClick={() => setActiveTab("stats")}>
          <Trophy size={16} /> Rankings & Troféus
        </button>
      </nav>

      {/* Mensagens de erro de conexão do servidor */}
      {error && (
        <div className="error-banner">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Conteúdo da Tab: JOGAR */}
      {activeTab === "play" && (
        <div className="tab-content play-tab">
          <div className="card glass-card name-card">
            <div className="card-header">
              <User size={20} className="icon-pink" />
              <h3>Identificação do Jogador</h3>
            </div>
            <div className="input-group">
              <input
                type="text"
                maxLength="12"
                placeholder="Insira seu Nickname..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
          </div>

          <div className="card glass-card appearance-card" style={{ marginTop: "15px", marginBottom: "15px" }}>
            <div className="card-header">
              <Sparkles size={20} className="icon-yellow" />
              <h3>Aparência do Jogador</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {/* Tipo de Avatar */}
              <div className="form-item">
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                  Escolha o Tipo de Avatar:
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    style={{ flex: 1, fontSize: "0.95rem", padding: "10px" }}
                    className={`btn ${avatarType === "emoji" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => {
                      setAvatarType("emoji");
                      setAvatarValue("👽");
                    }}
                  >
                    Emoji 👽
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, fontSize: "0.95rem", padding: "10px" }}
                    className={`btn ${avatarType === "photo" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => {
                      setAvatarType("photo");
                      setAvatarValue("/assets/avatars/cyber_neko.png");
                    }}
                  >
                    Foto de Perfil 🖼️
                  </button>
                </div>
              </div>

              {/* Configuração específica do tipo de avatar */}
              <div style={{ marginTop: "10px", paddingTop: "15px", borderTop: "1px solid var(--panel-border)" }}>
                {avatarType === "emoji" && (
                  <div className="avatar-selection-emoji">
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
                      Selecione um Emoji ou digite um abaixo:
                    </label>
                    <div className="avatar-emoji-grid">
                      {["👽", "🤖", "🦊", "🦁", "👻", "🥑", "🍕", "🚀", "🐱", "🐼", "🐸", "👑", "🔥", "💎", "🎮", "❤️"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          style={{
                            fontSize: "1.4rem",
                            padding: "6px",
                            background: avatarValue === em ? "var(--neon-pink)" : "var(--bg-darker)",
                            border: "1px solid var(--panel-border)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onClick={() => setAvatarValue(em)}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Emoji Customizado:</span>
                      <input
                        type="text"
                        maxLength="2"
                        style={{
                          width: "60px",
                          textAlign: "center",
                          fontSize: "1.2rem",
                          padding: "6px",
                          background: "var(--bg-darker)",
                          border: "2px solid var(--panel-border)",
                          borderRadius: "6px",
                          color: "#fff"
                        }}
                        value={avatarValue}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val) setAvatarValue(val);
                        }}
                      />
                    </div>
                  </div>
                )}

                {avatarType === "photo" && (
                  <div className="avatar-selection-photo">
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
                      Escolha uma Foto Cyberpunk ou faça Upload:
                    </label>
                    <div className="avatar-photo-grid">
                      {[
                        { name: "Neko", path: "/assets/avatars/cyber_neko.png" },
                        { name: "Hacker", path: "/assets/avatars/cyber_hacker.png" },
                        { name: "Robô", path: "/assets/avatars/cyber_robot.png" },
                        { name: "DJ", path: "/assets/avatars/cyber_dj.png" }
                      ].map((avatar) => {
                        const isActive = avatarValue === avatar.path;
                        return (
                          <div
                            key={avatar.name}
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "10px",
                              border: `2px solid ${isActive ? "var(--neon-pink)" : "var(--panel-border)"}`,
                              boxShadow: isActive ? "0 0 8px var(--neon-pink-glow)" : "none",
                              overflow: "hidden",
                              cursor: "pointer",
                              position: "relative",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => setAvatarValue(avatar.path)}
                          >
                            <img src={avatar.path} alt={avatar.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        );
                      })}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>URL da Foto:</span>
                        <input
                          type="text"
                          placeholder="https://exemplo.com/foto.jpg"
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "var(--bg-darker)",
                            border: "1px solid var(--panel-border)",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "0.85rem"
                          }}
                          value={avatarValue.startsWith("data:") || avatarValue.startsWith("/assets/") ? "" : avatarValue}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            if (val) setAvatarValue(val);
                          }}
                        />
                      </div>
                      
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Fazer Upload:</span>
                        <input
                          type="file"
                          accept="image/*"
                          id="avatar-file-upload"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              alert("A imagem é muito grande. Escolha uma imagem de até 5MB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const ctx = canvas.getContext("2d");
                                const size = 128;
                                canvas.width = size;
                                canvas.height = size;
                                const minDim = Math.min(img.width, img.height);
                                const sx = (img.width - minDim) / 2;
                                const sy = (img.height - minDim) / 2;
                                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                                const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                                setAvatarValue(compressedBase64);
                              };
                              img.src = event.target.result;
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <label
                          htmlFor="avatar-file-upload"
                          className="btn btn-secondary btn-sm"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                        >
                          📤 Escolher Imagem
                        </label>
                        {avatarValue.startsWith("data:") && (
                          <span style={{ fontSize: "0.75rem", color: "var(--neon-green)", fontWeight: "bold" }}>✔️ Upload concluído!</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="play-actions-grid">
            {/* Criar Sala */}
            <div className="card glass-card action-card">
              <h3>Criar Nova Sala</h3>
              <p>Hospede uma partida personalizada e convide seus amigos.</p>
              
              {!showConfig ? (
                <button className="btn btn-primary" onClick={() => setShowConfig(true)}>
                  Configurar Sala <ArrowRight size={16} />
                </button>
              ) : (
                <form onSubmit={handleCreate} className="config-form">
                  <div className="form-item">
                    <label>Modo de Jogo:</label>
                    <select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
                      <option value="classic">Clássico (Perde pontos)</option>
                      <option value="elimination">Eliminação (Até restar um)</option>
                      <option value="battle_royale">Battle Royale (Aceleração)</option>
                      <option value="reverse_letter">Adedonha Reversa (Letra encadeada)</option>
                      <option value="hot_potato">Batata Quente (3 Vidas & Tempo Acumulado)</option>
                      <option value="chaos_items">Caos e Itens (Loja de Power-ups)</option>
                      <option value="blind_bomb">Bomba Cega (Sem Tique-Taque e Sem Timer)</option>
                      <option value="time_attack">Contra o Tempo (Tempo individual)</option>
                    </select>
                  </div>

                  <div className="form-item">
                    <label>Jogadores Máximos: {maxPlayers}</label>
                    <input
                      type="range"
                      min="2"
                      max="24"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-item">
                      <label>Tempo Mín. (s):</label>
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={roundTimeMin}
                        onChange={(e) => setRoundTimeMin(parseInt(e.target.value))}
                      />
                    </div>
                    <div className="form-item">
                      <label>Tempo Máx. (s):</label>
                      <input
                        type="number"
                        min="20"
                        max="90"
                        value={roundTimeMax}
                        onChange={(e) => setRoundTimeMax(parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-item">
                      <label>Rodadas:</label>
                      <select value={maxRounds} onChange={(e) => setMaxRounds(e.target.value)}>
                        <option value="infinite">Até restar 1 / Infinito</option>
                        <option value="3">3 Rodadas</option>
                        <option value="5">5 Rodadas</option>
                        <option value="10">10 Rodadas</option>
                      </select>
                    </div>
                    <div className="form-item" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", paddingTop: "15px" }}>
                      <input
                        type="checkbox"
                        id="autoStartNextRound"
                        checked={autoStartNextRound}
                        onChange={(e) => setAutoStartNextRound(e.target.checked)}
                        style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--neon-pink)" }}
                      />
                      <label htmlFor="autoStartNextRound" style={{ cursor: "pointer", fontSize: "0.85rem", userSelect: "none", fontWeight: "bold" }}>
                        Progresso Automático
                      </label>
                    </div>
                  </div>

                  <div className="config-buttons">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConfig(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Criar Sala
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Entrar na Sala */}
            <div className="card glass-card action-card">
              <h3>Entrar em Sala</h3>
              <p>Insira o código de 4 letras para participar de uma sala existente.</p>
              
              <form onSubmit={handleJoin} className="join-form">
                <input
                  type="text"
                  maxLength="4"
                  placeholder="EX: BOMB"
                  className="room-code-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
                <button type="submit" className="btn btn-neon">
                  Entrar na Partida <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Tab: LOJA DE COSMÉTICOS */}
      {activeTab === "shop" && (
        <div className="tab-content shop-tab">
          <p className="shop-intro">Desbloqueie estilos visuais, efeitos de explosão e títulos com as moedas ganhas nas partidas!</p>
          
          {/* Sub-navegação da Loja */}
          <div className="home-tabs shop-sub-tabs" style={{ marginBottom: "20px", borderBottom: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
            <button className={shopSubTab === "skins" ? "active" : ""} onClick={() => setShopSubTab("skins")} style={{ fontSize: "0.9rem", padding: "8px 16px" }}>
              🎨 Skins de Bomba
            </button>
            <button className={shopSubTab === "effects" ? "active" : ""} onClick={() => setShopSubTab("effects")} style={{ fontSize: "0.9rem", padding: "8px 16px" }}>
              💥 Efeitos de Explosão
            </button>
            <button className={shopSubTab === "titles" ? "active" : ""} onClick={() => setShopSubTab("titles")} style={{ fontSize: "0.9rem", padding: "8px 16px" }}>
              🏷️ Títulos de Perfil
            </button>
          </div>

          {/* Grid de Skins */}
          {shopSubTab === "skins" && (
            <div className="skins-grid">
              {skinsList.map((skin) => {
                const isPurchased = purchasedSkins.includes(skin.id);
                const isActive = activeSkin === skin.id;

                return (
                  <div key={skin.id} className={`card glass-card skin-card ${isActive ? "active-skin-card" : ""}`}>
                    <div className="skin-preview-wrapper">
                      {skin.id === "classic" && <span className="skin-emoji">💣</span>}
                      {skin.id === "neon" && <span className="skin-emoji neon-text">💗</span>}
                      {skin.id === "ice" && <span className="skin-emoji cyan-text">❄️</span>}
                      {skin.id === "cyberpunk" && <span className="skin-emoji cyan-text">🤖</span>}
                      {skin.id === "silent" && <span className="skin-emoji" style={{ opacity: 0.85 }}>🥷</span>}
                      {skin.id === "toxic" && <span className="skin-emoji" style={{ color: "var(--neon-green)", textShadow: "0 0 10px var(--neon-green-glow)" }}>☣️</span>}
                      {skin.id === "lava" && <span className="skin-emoji" style={{ color: "var(--neon-pink)", textShadow: "0 0 10px var(--neon-pink-glow)" }}>🌋</span>}
                      {skin.id === "golden" && <span className="skin-emoji yellow-text">👑</span>}
                    </div>
                    <h4>{skin.name}</h4>
                    <p className="skin-desc">{skin.desc}</p>
                    
                    <div className="skin-action">
                      {isActive ? (
                        <span className="badge badge-active">Equipado</span>
                      ) : isPurchased ? (
                        <button className="btn btn-secondary btn-block btn-sm" onClick={() => setActiveSkin(skin.id)}>
                          Equipar
                        </button>
                      ) : (
                        <button className="btn btn-neon btn-block btn-sm btn-shop" onClick={() => buySkin(skin)}>
                          <Coins size={14} /> Compre por {skin.price}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid de Efeitos de Explosão */}
          {shopSubTab === "effects" && (
            <div className="skins-grid">
              {effectsList.map((eff) => {
                const isPurchased = purchasedEffects.includes(eff.id);
                const isActive = activeEffect === eff.id;

                return (
                  <div key={eff.id} className={`card glass-card skin-card ${isActive ? "active-skin-card" : ""}`}>
                    <div className="skin-preview-wrapper">
                      {eff.id === "classic" && <span className="skin-emoji">🔥</span>}
                      {eff.id === "confetti" && <span className="skin-emoji">🎉</span>}
                      {eff.id === "electric" && <span className="skin-emoji">⚡</span>}
                      {eff.id === "toxic" && <span className="skin-emoji">☣️</span>}
                      {eff.id === "volcano" && <span className="skin-emoji">🌋</span>}
                    </div>
                    <h4>{eff.name}</h4>
                    <p className="skin-desc">{eff.desc}</p>
                    
                    <div className="skin-action">
                      {isActive ? (
                        <span className="badge badge-active">Equipado</span>
                      ) : isPurchased ? (
                        <button className="btn btn-secondary btn-block btn-sm" onClick={() => setActiveEffect(eff.id)}>
                          Equipar
                        </button>
                      ) : (
                        <button className="btn btn-neon btn-block btn-sm btn-shop" onClick={() => buyEffect(eff)}>
                          <Coins size={14} /> Compre por {eff.price}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid de Títulos */}
          {shopSubTab === "titles" && (
            <div className="skins-grid">
              {titlesList.map((t) => {
                const isPurchased = purchasedTitles.includes(t.id);
                const isActive = activeTitle === t.id;

                return (
                  <div key={t.id} className={`card glass-card skin-card ${isActive ? "active-skin-card" : ""}`}>
                    <div className="skin-preview-wrapper">
                      {t.id === "none" && <span className="skin-emoji">🏷️</span>}
                      {t.id === "novato" && <span className="skin-emoji">🐣</span>}
                      {t.id === "lexico" && <span className="skin-emoji">📖</span>}
                      {t.id === "veloz" && <span className="skin-emoji">⚡</span>}
                      {t.id === "master" && <span className="skin-emoji">💣</span>}
                      {t.id === "imortal" && <span className="skin-emoji">🏆</span>}
                    </div>
                    <h4 style={{ textShadow: "0 0 10px rgba(255, 255, 255, 0.1)" }}>{t.name}</h4>
                    <p className="skin-desc">{t.desc}</p>
                    
                    <div className="skin-action">
                      {isActive ? (
                        <span className="badge badge-active">Equipado</span>
                      ) : isPurchased ? (
                        <button className="btn btn-secondary btn-block btn-sm" onClick={() => setActiveTitle(t.id)}>
                          Equipar
                        </button>
                      ) : (
                        <button className="btn btn-neon btn-block btn-sm btn-shop" onClick={() => buyTitle(t)}>
                          <Coins size={14} /> Compre por {t.price}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Tab: STATUS E CONQUISTAS */}
      {activeTab === "stats" && (
        <div className="tab-content stats-tab">
          <div className="stats-grid">
            {/* Estatísticas Pessoais */}
            <div className="card glass-card personal-stats-card">
              <div className="card-header">
                <Trophy size={20} className="icon-yellow" />
                <h3>Suas Estatísticas</h3>
              </div>
              
              {/* Progresso de Nível */}
              {(() => {
                const getLevel = (xp) => 1 + Math.floor(Math.sqrt(xp / 80));
                const getXpForLevel = (lvl) => Math.pow(lvl - 1, 2) * 80;
                
                const currentLvl = getLevel(stats.xp || 0);
                const currentLvlMinXp = getXpForLevel(currentLvl);
                const nextLvlMinXp = getXpForLevel(currentLvl + 1);
                const lvlXpProgress = (stats.xp || 0) - currentLvlMinXp;
                const lvlXpTotalRequired = nextLvlMinXp - currentLvlMinXp;
                const lvlPercent = Math.min(100, Math.max(0, (lvlXpProgress / lvlXpTotalRequired) * 100));

                return (
                  <div className="level-progress-section" style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid var(--panel-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase" }}>Progresso de Nível</span>
                      <strong style={{ fontSize: "1.05rem", color: "var(--neon-blue)", textShadow: "0 0 10px var(--neon-blue-glow)" }}>NÍVEL {currentLvl}</strong>
                    </div>
                    <div className="xp-bar-bg" style={{ width: "100%", height: "8px", background: "var(--bg-darker)", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                      <div 
                        className="xp-bar-fill" 
                        style={{ 
                          width: `${lvlPercent}%`, 
                          height: "100%", 
                          background: "linear-gradient(90deg, var(--neon-blue) 0%, var(--neon-pink) 100%)",
                          boxShadow: "0 0 8px var(--neon-blue-glow)",
                          borderRadius: "4px",
                          transition: "width 0.5s ease" 
                        }} 
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "6px" }}>
                      <span>{stats.xp || 0} XP acumulados</span>
                      <span>Faltam {nextLvlMinXp - (stats.xp || 0)} XP para Nível {currentLvl + 1}</span>
                    </div>
                  </div>
                );
              })()}
              
              <div className="stats-list">
                <div className="stat-item">
                  <span className="label">Partidas Jogadas:</span>
                  <span className="value">{stats.gamesPlayed}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Vitórias Totais:</span>
                  <span className="value text-success">{stats.wins}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Explosões Sofridas:</span>
                  <span className="value text-danger">{stats.bombsExploded}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Palavras Certas:</span>
                  <span className="value">{stats.correctWords}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Pontuação Recorde:</span>
                  <span className="value text-success">{stats.highScore}</span>
                </div>
                <div className="stat-item">
                  <span className="label">XP Total Acumulada:</span>
                  <span className="value">{stats.xp || 0} XP</span>
                </div>
              </div>
            </div>

            {/* Quadro de Conquistas */}
            <div className="card glass-card achievements-card">
              <div className="card-header">
                <Award size={20} className="icon-cyan" />
                <h3>Títulos & Conquistas</h3>
              </div>
              <div className="achievements-list">
                <div className={`achievement-item ${achievements.firstGame ? "unlocked" : "locked"}`}>
                  <div className="badge-icon">🎖️</div>
                  <div className="ach-info">
                    <strong>Batismo de Fogo</strong>
                    <span>Concluiu a primeira partida.</span>
                  </div>
                </div>

                <div className={`achievement-item ${achievements.wordMaster ? "unlocked" : "locked"}`}>
                  <div className="badge-icon">📚</div>
                  <div className="ach-info">
                    <strong>Dicionário Humano</strong>
                    <span>Acertou 5 palavras em uma única rodada.</span>
                  </div>
                </div>

                <div className={`achievement-item ${achievements.survivor ? "unlocked" : "locked"}`}>
                  <div className="badge-icon">⏳</div>
                  <div className="ach-info">
                    <strong>Por um Fio</strong>
                    <span>Passou a bomba com menos de 3 segundos restantes.</span>
                  </div>
                </div>

                <div className={`achievement-item ${achievements.goldenSkin ? "unlocked" : "locked"}`}>
                  <div className="badge-icon">👑</div>
                  <div className="ach-info">
                    <strong>Realeza Dourada</strong>
                    <span>Desbloqueou a lendária Bomba de Ouro.</span>
                  </div>
                </div>

                <div className={`achievement-item ${achievements.firstWin ? "unlocked" : "locked"}`}>
                  <div className="badge-icon">🏆</div>
                  <div className="ach-info">
                    <strong>Último Sobrevivente</strong>
                    <span>Venceu uma partida no modo Eliminação.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking Global Mockado */}
          <div className="card glass-card global-ranking-card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={20} className="icon-pink" />
                <h3>Ranking Geral da Semana</h3>
              </div>
              {globalRanking.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "4px 8px", fontSize: "0.75rem", height: "auto" }}
                  onClick={() => {
                    if (window.confirm("Deseja realmente resetar o ranking semanal?")) {
                      fetch(`${BACKEND_URL}/api/leaderboard/reset`, { method: "POST" })
                        .then(() => setGlobalRanking([]))
                        .catch(err => console.error(err));
                    }
                  }}
                >
                  Resetar Ranking
                </button>
              )}
            </div>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Jogador</th>
                  <th>Pontos</th>
                  <th>Taxa de Sobrevivência</th>
                </tr>
              </thead>
              <tbody>
                {loadingRanking ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                      Carregando ranking...
                    </td>
                  </tr>
                ) : globalRanking.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                      Nenhum jogador registrado no ranking ainda. Jogue uma partida para pontuar!
                    </td>
                  </tr>
                ) : (
                  globalRanking.map((player, index) => {
                    const isMe = playerName && player.name.toLowerCase() === playerName.toLowerCase();
                    let medalClass = "";
                    let medalIcon = `${index + 1}º`;
                    if (index === 0) {
                      medalClass = "gold-medal";
                      medalIcon = "🥇 1º";
                    } else if (index === 1) {
                      medalClass = "silver-medal";
                      medalIcon = "🥈 2º";
                    } else if (index === 2) {
                      medalClass = "bronze-medal";
                      medalIcon = "🥉 3º";
                    }

                    return (
                      <tr key={player.name} className={`${medalClass} ${isMe ? "user-row" : ""}`} style={isMe ? { background: "rgba(255, 0, 127, 0.15)", fontWeight: "bold" } : {}}>
                        <td>{medalIcon}</td>
                        <td>{player.name} {isMe && "(Você)"}</td>
                        <td>{player.score.toLocaleString()} pts</td>
                        <td>{player.survivalRate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
