// Web Audio API Synthesizer para Efeitos Sonoros do Passa a Bomba

let audioCtx = null;
let fuseSource = null;
let fuseGain = null;
let tickCount = 0;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => console.log("AudioContext resume failed:", e));
  }
  return audioCtx;
}

// Cria um buffer de ruído branco para a explosão e o pavio
function createNoiseBuffer(ctx, duration) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export const audioService = {
  // Inicialização prévia ao clique do usuário para desbloqueio
  init() {
    getAudioContext();
  },

  // Som de Tique-Taque (alternando entre tick e tock)
  playTick(speedFactor = 1.0) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Alterna frequências para simular "tique" e "taque"
      tickCount++;
      const baseFreq = tickCount % 2 === 0 ? 800 : 600;
      // Eleva o tom conforme a bomba acelera
      osc.frequency.setValueAtTime(baseFreq * Math.min(speedFactor, 2.5), ctx.currentTime);
      osc.type = "sine";

      // Envelope rápido
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {
      console.warn("Erro ao tocar som de tick:", e);
    }
  },

  // Som de Sucesso (palavra correta e passe da bomba)
  playSuccess() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Tom 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Tom 2 (ligeiramente atrasado)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.26);
    } catch (e) {
      console.warn("Erro ao tocar som de sucesso:", e);
    }
  },

  // Som de Erro (palavra rejeitada)
  playFailure() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, now); // Tom baixo e áspero
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.26);

      osc.start(now);
      osc.stop(now + 0.27);
    } catch (e) {
      console.warn("Erro ao tocar som de erro:", e);
    }
  },

  // Inicia o chiado contínuo do pavio queimando
  startFuseHiss() {
    try {
      const ctx = getAudioContext();
      if (!ctx || fuseSource) return;

      const now = ctx.currentTime;
      
      // Cria buffer de ruído
      const noiseBuffer = createNoiseBuffer(ctx, 2.0); // 2 segundos de loop
      fuseSource = ctx.createBufferSource();
      fuseSource.buffer = noiseBuffer;
      fuseSource.loop = true;

      // Filtro passa-altas para simular chiado agudo
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(4000, now);

      fuseGain = ctx.createGain();
      fuseGain.gain.setValueAtTime(0.02, now); // Chiado sutil em background

      fuseSource.connect(filter);
      filter.connect(fuseGain);
      fuseGain.connect(ctx.destination);

      fuseSource.start(now);
    } catch (e) {
      console.warn("Erro ao iniciar som do pavio:", e);
    }
  },

  // Para o chiado do pavio
  stopFuseHiss() {
    try {
      if (fuseSource) {
        fuseSource.stop();
        fuseSource.disconnect();
        fuseSource = null;
      }
      if (fuseGain) {
        fuseGain.disconnect();
        fuseGain = null;
      }
    } catch (e) {
      console.warn("Erro ao parar som do pavio:", e);
    }
  },

  // Som de Explosão
  playExplosion() {
    try {
      this.stopFuseHiss(); // Garante que o pavio para
      
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const duration = 2.0;

      // 1. Ruído de impacto (explosão ruidosa)
      const noiseBuffer = createNoiseBuffer(ctx, duration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(10, now + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // 2. Sub-bass estrondo (frequência grave para dar peso)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(65, now); // Frequência grave de 65Hz
      subOsc.frequency.linearRampToValueAtTime(30, now + 1.2);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      noiseSource.start(now);
      noiseSource.stop(now + duration);

      subOsc.start(now);
      subOsc.stop(now + 1.3);
    } catch (e) {
      console.warn("Erro ao tocar som de explosão:", e);
    }
  },

  // Sintetizador de Trilha Sonora Procedimental Cyberpunk
  startBackgroundMusic() {
    try {
      const ctx = getAudioContext();
      if (!ctx || musicInterval) return;

      musicGain = ctx.createGain();
      musicGain.gain.setValueAtTime(0.04, ctx.currentTime); // Volume bem baixo para não atrapalhar a voz/ticks
      musicGain.connect(ctx.destination);

      currentMusicStep = 0;

      musicInterval = setInterval(() => {
        if (ctx.state === "suspended") return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(musicGain);

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(musicSteps[currentMusicStep], now);

        // Filtro passa-baixa para baixo aveludado e macio
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, now);

        noteGain.gain.setValueAtTime(0.3, now);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.start(now);
        osc.stop(now + 0.40);

        currentMusicStep = (currentMusicStep + 1) % musicSteps.length;
      }, 400); // 400ms por batida (~150 BPM)
    } catch (e) {
      console.warn("Erro ao iniciar música de fundo:", e);
    }
  },

  stopBackgroundMusic() {
    try {
      if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
      }
      if (musicGain) {
        musicGain.disconnect();
        musicGain = null;
      }
    } catch (e) {
      console.warn("Erro ao parar música de fundo:", e);
    }
  }
};

// Variáveis e escala para a música de fundo procedimental
let musicInterval = null;
let musicGain = null;
let currentMusicStep = 0;
const musicSteps = [
  110.00, 110.00, 130.81, 146.83, // A2, A2, C3, D3
  110.00, 110.00, 130.81, 164.81, // A2, A2, C3, E3
  110.00, 110.00, 130.81, 146.83, // A2, A2, C3, D3
  98.00,  98.00,  116.54, 130.81  // G2, G2, A#2, C3
];

