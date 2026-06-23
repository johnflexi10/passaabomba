import React, { useEffect, useState } from "react";

/**
 * Componente que renderiza a Bomba animada em SVG.
 * Propriedades:
 * - state: 'LOBBY' | 'STARTING' | 'ACTIVE' | 'EXPLODED' | 'GAME_OVER'
 * - progress: número de 0 a 1 indicando quão perto está da explosão
 * - skin: 'classic' | 'neon' | 'cyberpunk' | 'golden'
 */
export default function BombAnimation({ state, progress = 0, skin = "classic", explosionEffect = "classic" }) {
  const [sparkParticles, setSparkParticles] = useState([]);
  const [explosionParticles, setExplosionParticles] = useState([]);

  // Controla partículas de faísca no pavio quando ativa
  useEffect(() => {
    if (state !== "ACTIVE") {
      setSparkParticles([]);
      return;
    }

    const interval = setInterval(() => {
      // Cria uma nova partícula perto do fim do pavio
      // O pavio do SVG diminui conforme o progresso aumenta
      const fuseLength = 1 - progress;
      const angle = 0.5 + fuseLength * 0.8; // Aproximação do caminho do pavio
      const r = 90 + fuseLength * 40;
      const x = 150 + Math.cos(angle) * r;
      const y = 80 - Math.sin(angle) * 30;

      const newParticle = {
        id: Date.now() + Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 1.0,
        color: Math.random() > 0.4 ? "#ffd700" : "#ff4500" // Ouro ou laranja-avermelhado
      };

      setSparkParticles((prev) => [...prev.slice(-15), newParticle]);
    }, 100);

    return () => clearInterval(interval);
  }, [state, progress]);

  // Atualiza física das partículas de faísca e da explosão
  useEffect(() => {
    if (sparkParticles.length === 0 && explosionParticles.length === 0) return;

    const frame = requestAnimationFrame(() => {
      // Faíscas
      setSparkParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.08
          }))
          .filter((p) => p.life > 0)
      );

      // Explosão
      setExplosionParticles((prev) =>
        prev
          .map((p) => {
            const decay = explosionEffect === "toxic" ? 0.025 : 0.04;
            const gravity = explosionEffect === "confetti" ? 0.25 : (explosionEffect === "volcano" ? -0.15 : 0.02);
            return {
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy + gravity,
              vx: p.vx * (explosionEffect === "toxic" ? 0.94 : 0.98),
              vy: p.vy * (explosionEffect === "toxic" ? 0.94 : 0.98),
              life: p.life - decay
            };
          })
          .filter((p) => p.life > 0)
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [sparkParticles, explosionParticles, explosionEffect]);

  // Efeito para inicializar partículas ao explodir
  useEffect(() => {
    if (state !== "EXPLODED") {
      setExplosionParticles([]);
      return;
    }

    const particles = [];
    const count = explosionEffect === "toxic" ? 25 : 50;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = explosionEffect === "toxic" 
        ? 1.5 + Math.random() * 3.5 
        : (explosionEffect === "volcano" ? 3 + Math.random() * 9 : 2 + Math.random() * 9);
      
      let color = "#ff4500";
      let size = 4 + Math.random() * 8;
      let shape = "circle";

      if (explosionEffect === "confetti") {
        const colors = ["#ff007f", "#00ffcc", "#ffd700", "#ff5500", "#76ff03", "#00ccff"];
        color = colors[Math.floor(Math.random() * colors.length)];
        shape = Math.random() > 0.45 ? "square" : "circle";
        size = 5 + Math.random() * 8;
      } else if (explosionEffect === "electric") {
        color = Math.random() > 0.35 ? "#00e5ff" : "#ffffff";
        size = 2 + Math.random() * 5;
      } else if (explosionEffect === "toxic") {
        color = Math.random() > 0.4 ? "#76ff03" : "#2e7d32";
        size = 12 + Math.random() * 15;
      } else if (explosionEffect === "volcano") {
        color = Math.random() > 0.35 ? "#ff3c00" : "#ffcc00";
        size = 3 + Math.random() * 5;
      }

      particles.push({
        id: i,
        x: 150,
        y: 150,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (explosionEffect === "volcano" ? 4 : 0),
        color,
        size,
        life: 1.0,
        shape
      });
    }

    setExplosionParticles(particles);
  }, [state, explosionEffect]);

  // Definições de skins (Cores principais e gradientes)
  const skinStyles = {
    classic: {
      bodyGradStart: "#434343",
      bodyGradEnd: "#000000",
      glowColor: "rgba(255, 255, 255, 0.2)",
      borderColor: "#222"
    },
    neon: {
      bodyGradStart: "#ff007f",
      bodyGradEnd: "#4a0026",
      glowColor: "rgba(255, 0, 127, 0.6)",
      borderColor: "#ff007f"
    },
    ice: {
      bodyGradStart: "#e0f7fa",
      bodyGradEnd: "#006064",
      glowColor: "rgba(0, 229, 255, 0.4)",
      borderColor: "#80deea"
    },
    cyberpunk: {
      bodyGradStart: "#00ffcc",
      bodyGradEnd: "#003326",
      glowColor: "rgba(0, 255, 204, 0.6)",
      borderColor: "#00ffcc"
    },
    silent: {
      bodyGradStart: "#2a2a2a",
      bodyGradEnd: "#0d0d0d",
      glowColor: "rgba(255, 255, 255, 0.05)",
      borderColor: "#1a1a1a"
    },
    toxic: {
      bodyGradStart: "#76ff03",
      bodyGradEnd: "#1b5e20",
      glowColor: "rgba(118, 255, 3, 0.5)",
      borderColor: "#76ff03"
    },
    lava: {
      bodyGradStart: "#ff3700",
      bodyGradEnd: "#4a0b00",
      glowColor: "rgba(255, 55, 0, 0.55)",
      borderColor: "#ff3700"
    },
    golden: {
      bodyGradStart: "#ffe066",
      bodyGradEnd: "#8a6d00",
      glowColor: "rgba(255, 215, 0, 0.5)",
      borderColor: "#ffd700"
    }
  };

  const currentSkin = skinStyles[skin] || skinStyles.classic;

  // Determina a expressão da bomba e intensidade do tremor baseada no progresso do tempo
  let expression = "calm";
  let shakeClass = "";
  let pulseRate = "2s";

  if (state === "ACTIVE") {
    if (progress < 0.4) {
      expression = "worried";
      shakeClass = "shake-mild";
      pulseRate = "1s";
    } else if (progress < 0.75) {
      expression = "nervous";
      shakeClass = "shake-medium";
      pulseRate = "0.5s";
    } else {
      expression = "panic";
      shakeClass = "shake-extreme";
      pulseRate = "0.2s";
    }
  } else if (state === "EXPLODED") {
    expression = "exploded";
    shakeClass = "shake-explode";
  }

  // Desenha os olhos dinâmicos
  const renderEyes = () => {
    switch (expression) {
      case "worried":
        return (
          <>
            {/* Olho Esquerdo */}
            <circle cx="125" cy="140" r="10" fill="#fff" />
            <circle cx="127" cy="140" r="5" fill="#000" />
            {/* Olho Direito */}
            <circle cx="175" cy="140" r="10" fill="#fff" />
            <circle cx="173" cy="140" r="5" fill="#000" />
            {/* Sobrancelhas */}
            <path d="M115,122 Q125,125 135,130" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M185,122 Q175,125 165,130" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      case "nervous":
        return (
          <>
            {/* Olho Esquerdo semicerrado */}
            <path d="M113,145 Q125,130 137,145" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
            <circle cx="125" cy="141" r="4" fill="#000" />
            {/* Olho Direito semicerrado */}
            <path d="M163,145 Q175,130 187,145" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
            <circle cx="175" cy="141" r="4" fill="#000" />
            {/* Sobrancelhas bem arqueadas */}
            <path d="M110,128 Q125,115 138,128" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M190,128 Q175,115 162,128" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Gota de Suor */}
            <path d="M102,120 C102,120 95,130 95,135 C95,138 98,140 101,140 C104,140 107,138 107,135 C107,130 102,120 102,120 Z" fill="#00e5ff" />
          </>
        );
      case "panic":
        return (
          <>
            {/* Olhos arregalados gigantes */}
            <circle cx="120" cy="135" r="16" fill="#fff" stroke="#ff0000" strokeWidth="2" className="eye-panic" />
            <circle cx="120" cy="135" r="7" fill="#000" />
            <circle cx="180" cy="135" r="16" fill="#fff" stroke="#ff0000" strokeWidth="2" className="eye-panic" />
            <circle cx="180" cy="135" r="7" fill="#000" />
            {/* Sobrancelhas em desespero */}
            <path d="M105,112 Q120,105 135,116" stroke="#000" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d="M195,112 Q180,105 165,116" stroke="#000" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          </>
        );
      case "exploded":
        return (
          <>
            {/* Olhos em X */}
            <path d="M110,130 L130,150 M130,130 L110,150" stroke="#ff3333" strokeWidth="6" strokeLinecap="round" />
            <path d="M170,130 L190,150 M190,130 L170,150" stroke="#ff3333" strokeWidth="6" strokeLinecap="round" />
          </>
        );
      case "calm":
      default:
        return (
          <>
            {/* Olhos felizes clássicos */}
            <circle cx="125" cy="140" r="9" fill="#fff" />
            <circle cx="127" cy="140" r="4.5" fill="#000" />
            <circle cx="175" cy="140" r="9" fill="#fff" />
            <circle cx="173" cy="140" r="4.5" fill="#000" />
            {/* Sobrancelhas amigáveis */}
            <path d="M115,128 Q125,122 135,128" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M185,128 Q175,122 165,128" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
    }
  };

  // Desenha a boca dinâmica
  const renderMouth = () => {
    switch (expression) {
      case "worried":
        return <path d="M135,165 Q150,170 165,165" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />;
      case "nervous":
        return <path d="M138,172 L162,168" stroke="#000" strokeWidth="4" strokeLinecap="round" />;
      case "panic":
        // Boca aberta gritando em O
        return <ellipse cx="150" cy="170" rx="14" ry="20" fill="#000" stroke="#ff3333" strokeWidth="2" />;
      case "exploded":
        return <path d="M130,175 Q140,160 150,175 Q160,160 170,175" stroke="#000" strokeWidth="4.5" fill="none" strokeLinecap="round" />;
      case "calm":
      default:
        // Sorriso fofo
        return <path d="M135,162 Q150,178 165,162" stroke="#000" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
    }
  };

  // Calcula a curva do pavio baseado no progresso
  // O pavio encolhe conforme progresso vai de 0 para 1
  const renderFuse = () => {
    if (state === "EXPLODED") return null;

    const fuseProgress = 1 - progress; // vai de 1 a 0
    const dashArray = 120;
    const dashOffset = (1 - fuseProgress) * dashArray;

    return (
      <path
        d="M150,85 C160,65 180,45 210,55 C225,60 235,50 240,40"
        fill="none"
        stroke="#8b5a2b"
        strokeWidth="6"
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className={`bomb-wrapper ${shakeClass}`}>
      <style>{`
        .bomb-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          margin: 0 auto;
          position: relative;
        }

        .bomb-svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.4));
        }

        /* Animações de tremor */
        .shake-mild {
          animation: shake 0.4s infinite alternate;
        }
        .shake-medium {
          animation: shake 0.2s infinite alternate;
        }
        .shake-extreme {
          animation: shake 0.08s infinite alternate, redPulse 0.2s infinite alternate;
        }
        .shake-explode {
          animation: explodeScale 0.6s ease-out forwards;
        }

        @keyframes shake {
          0% { transform: translate(2px, 1px) rotate(0deg); }
          100% { transform: translate(-1px, -2px) rotate(-1deg); }
        }

        @keyframes redPulse {
          0% { filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.4)) drop-shadow(0 10px 20px rgba(0,0,0,0.4)); }
          100% { filter: drop-shadow(0 0 25px rgba(255, 0, 0, 0.9)) drop-shadow(0 10px 20px rgba(0,0,0,0.6)); }
        }

        @keyframes explodeScale {
          0% { transform: scale(1); opacity: 1; }
          20% { transform: scale(1.3); filter: brightness(2) contrast(1.5); }
          60% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(0); opacity: 0; }
        }

        /* Pulsação do corpo da bomba ativa */
        .pulse-body {
          animation: bodyPulse ${pulseRate} infinite alternate ease-in-out;
          transform-origin: 150px 150px;
        }

        @keyframes bodyPulse {
          0% { transform: scale(0.98); }
          100% { transform: scale(1.02); }
        }

        .eye-panic {
          animation: eyeShake 0.15s infinite alternate;
        }

        @keyframes eyeShake {
          0% { transform: translate(0.5px, 0.5px); }
          100% { transform: translate(-0.5px, -0.5px); }
        }

        .spark-particle {
          pointer-events: none;
          transition: transform 0.05s linear;
        }

        .bomb-glow {
          mix-blend-mode: screen;
          pointer-events: none;
        }

        /* Detalhes de skins */
        .golden-crown {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .cyber-circuits {
          stroke: #00ffcc;
          stroke-width: 1.5;
          opacity: 0.6;
          fill: none;
        }
      `}</style>

      <svg viewBox="0 0 300 300" className="bomb-svg">
        <defs>
          {/* Gradiente da Bomba */}
          <radialGradient id="bombGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={currentSkin.bodyGradStart} />
            <stop offset="100%" stopColor={currentSkin.bodyGradEnd} />
          </radialGradient>

          {/* Sombra interna/Brilho */}
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={currentSkin.glowColor} stopOpacity="1" />
            <stop offset="100%" stopColor={currentSkin.glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Pavio */}
        {renderFuse()}

        {/* Suporte de Pavio (Metais superiores) */}
        {state !== "EXPLODED" && (
          <path
            d="M135,88 L165,88 L160,78 L140,78 Z"
            fill={skin === "golden" ? "#d4af37" : "#555"}
            stroke={currentSkin.borderColor}
            strokeWidth="2"
          />
        )}

        {/* Corpo Principal da Bomba */}
        {state !== "EXPLODED" ? (
          <g className={state === "ACTIVE" ? "pulse-body" : ""}>
            {/* Brilho da Skin */}
            <circle cx="150" cy="150" r="70" fill={`url(#bombGrad)`} stroke={currentSkin.borderColor} strokeWidth="4" />
            
            {/* Brilho Holográfico externo se for neon, cyberpunk ou novas skins vibrantes */}
            {(skin === "neon" || skin === "cyberpunk" || skin === "ice" || skin === "toxic" || skin === "lava") && (
              <circle cx="150" cy="150" r="72" fill="none" stroke={currentSkin.borderColor} strokeWidth="3" opacity="0.8" style={{ filter: "drop-shadow(0 0 10px " + currentSkin.borderColor + ")" }} />
            )}

            {/* Circuitos para skin cyberpunk */}
            {skin === "cyberpunk" && (
              <g className="cyber-circuits">
                <path d="M110,150 L130,150 L135,145" />
                <path d="M190,150 L170,150 L165,155" />
                <path d="M150,195 L150,185 L145,180" />
                <circle cx="135" cy="145" r="2" fill="#00ffcc" />
                <circle cx="165" cy="155" r="2" fill="#00ffcc" />
                <circle cx="145" cy="180" r="2" fill="#00ffcc" />
              </g>
            )}

            {/* Cristais de gelo para skin glacial */}
            {skin === "ice" && (
              <g stroke="#e0f7fa" strokeWidth="1.5" fill="none" opacity="0.65">
                <path d="M150,90 L150,110 M140,100 L160,100" />
                <path d="M125,185 L135,195 M125,195 L135,185" />
                <path d="M175,185 L165,195 M175,195 L165,185" />
                <circle cx="150" cy="100" r="2" fill="#fff" />
              </g>
            )}

            {/* Máscara ninja para skin silenciosa */}
            {skin === "silent" && (
              <g fill="#3a3a3a" opacity="0.95" stroke="#1c1c1c" strokeWidth="1">
                <path d="M92,150 C92,175, 208,175, 208,150 L205,143 C205,143, 150,150, 95,143 Z" />
                <path d="M88,145 L78,138 L84,152 Z" />
              </g>
            )}

            {/* Símbolo de resíduo radioativo simplificado para skin tóxica */}
            {skin === "toxic" && (
              <g fill="none" stroke="#000" strokeWidth="3" opacity="0.65" transform="translate(150, 98) scale(0.65)">
                <path d="M -6,-10 A 10,10 0 0,1 6,-10" />
                <path d="M -10,2 A 10,10 0 0,1 -5,-10" />
                <path d="M 5,-10 A 10,10 0 0,1 10,2" />
                <circle cx="0" cy="-3" r="2" fill="#000" />
              </g>
            )}

            {/* Fendas vulcânicas acesas para skin de lava */}
            {skin === "lava" && (
              <g stroke="#ffea00" strokeWidth="2.5" fill="none" opacity="0.8" style={{ filter: "drop-shadow(0 0 4px #ff5500)" }}>
                <path d="M102,150 L115,162 L120,155 L135,168" />
                <path d="M198,150 L185,162 L180,155 L165,168" />
                <path d="M150,205 L150,185 L142,180" />
              </g>
            )}

            {/* Coroa Real para skin dourada */}
            {skin === "golden" && (
              <g className="golden-crown" transform="translate(115, 45) scale(0.7)">
                <path d="M10,40 L20,10 L45,30 L70,10 L90,10 L110,30 L130,10 L140,40 Z" fill="#ffd700" stroke="#b8860b" strokeWidth="3" />
                <circle cx="20" cy="8" r="4" fill="#ff3366" />
                <circle cx="70" cy="8" r="4" fill="#00ccff" />
                <circle cx="130" cy="8" r="4" fill="#ffcc00" />
                <rect x="25" y="32" width="10" height="6" rx="2" fill="#33cc66" />
                <rect x="105" y="32" width="10" height="6" rx="2" fill="#ff6600" />
              </g>
            )}

            {/* Reflexo de Luz 3D */}
            <ellipse cx="125" cy="115" rx="18" ry="8" fill="#fff" opacity="0.35" transform="rotate(-30 125 115)" />

            {/* Rosto */}
            {renderEyes()}
            {renderMouth()}
          </g>
        ) : (
          /* Animação simplificada pós explosão */
          <g>
            <circle cx="150" cy="150" r="50" fill="#222" opacity="0.3" />
          </g>
        )}

        {/* Faíscas */}
        {sparkParticles.map((p) => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={3 * p.life}
            fill={p.color}
            opacity={p.life}
            className="spark-particle"
          />
        ))}

        {/* Partículas de Explosão Personalizada */}
        {state === "EXPLODED" && explosionParticles.map((p) => {
          if (explosionEffect === "electric") {
            const x2 = p.x + p.vx * 1.5;
            const y2 = p.y + p.vy * 1.5;
            return (
              <line
                key={p.id}
                x1={p.x}
                y1={p.y}
                x2={x2}
                y2={y2}
                stroke={p.color}
                strokeWidth={p.size * p.life}
                strokeLinecap="round"
                opacity={p.life}
                pointerEvents="none"
              />
            );
          }
          if (p.shape === "square") {
            return (
              <rect
                key={p.id}
                x={p.x - (p.size * p.life) / 2}
                y={p.y - (p.size * p.life) / 2}
                width={p.size * p.life}
                height={p.size * p.life}
                fill={p.color}
                opacity={p.life}
                transform={`rotate(${p.vx * 20} ${p.x} ${p.y})`}
                pointerEvents="none"
              />
            );
          }
          return (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size * p.life}
              fill={p.color}
              opacity={p.life}
              pointerEvents="none"
            />
          );
        })}
      </svg>
    </div>
  );
}
