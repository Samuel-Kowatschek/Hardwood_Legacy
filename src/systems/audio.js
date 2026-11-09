// WebAudio-Chiptune: Square/Triangle-SFX + kleiner Loop. Startet erst nach erster Eingabe.

let ac = null, master = null, musicGain = null, muted = false;
let musicTimer = null, musicStep = 0, nextTime = 0, currentSong = null, pendingSong = null, unlocked = false;

export function initAudio(isMuted) { muted = isMuted; }

function ensure() {
  if (!unlocked) return false; // erst nach User-Geste (Autoplay-Policy)
  if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);
    return true;
  } catch { return false; }
}
export function unlockAudio() {
  unlocked = true;
  const ok = ensure();
  if (ok && pendingSong) { const s = pendingSong; pendingSong = null; playMusic(s); }
  return ok;
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.35, ac.currentTime, 0.01);
}
export const isMuted = () => muted;

function tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, at = 0, dest } = {}) {
  if (!ensure() || muted && !dest) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.2, freq = 1200, q = 0.8, at = 0, attack = 0.005 } = {}) {
  if (!ensure() || muted) return;
  const t = ac.currentTime + at;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur);
}

export const sfx = {
  blip: () => tone(880, 0.05, { vol: 0.15 }),
  select: () => { tone(660, 0.06, { vol: 0.2 }); tone(990, 0.08, { vol: 0.2, at: 0.06 }); },
  back: () => tone(330, 0.08, { vol: 0.18 }),
  text: () => tone(1200, 0.015, { vol: 0.05 }),
  swish: () => { noise(0.25, { vol: 0.35, freq: 3000, q: 0.6 }); tone(1320, 0.12, { vol: 0.15, at: 0.05 }); tone(1760, 0.15, { vol: 0.15, at: 0.12 }); },
  miss: () => { tone(220, 0.1, { vol: 0.25 }); tone(160, 0.2, { vol: 0.25, at: 0.08, slide: -40 }); },
  buzzer: () => { tone(110, 0.7, { vol: 0.35 }); tone(116, 0.7, { vol: 0.25, type: 'sawtooth' }); },
  crowd: (len = 1.4) => { noise(len, { vol: 0.25, freq: 900, q: 0.4, attack: 0.25 }); noise(len * 0.8, { vol: 0.12, freq: 2200, q: 0.5, attack: 0.2, at: 0.1 }); },
  dunk: () => { noise(0.15, { vol: 0.5, freq: 400, q: 1 }); tone(90, 0.25, { vol: 0.4, type: 'triangle', slide: -40 }); },
  flash: () => { tone(1500, 0.06, { vol: 0.15 }); tone(1500, 0.06, { vol: 0.15, at: 0.12 }); tone(1500, 0.06, { vol: 0.15, at: 0.24 }); },
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.12, { vol: 0.22, at: i * 0.12 })),
  sad: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, { vol: 0.2, at: i * 0.22, type: 'triangle' })),
  tick: () => tone(1800, 0.02, { vol: 0.08 }),
  hit: () => tone(1046, 0.08, { vol: 0.2 }),
};

// ---- Musik: sehr einfacher Step-Sequencer ----
const N = n => 440 * Math.pow(2, (n - 69) / 12);
const SONGS = {
  title: { bpm: 132, lead: [72, 0, 76, 79, 0, 76, 74, 0, 71, 0, 74, 77, 0, 74, 72, 0, 69, 0, 72, 76, 0, 72, 71, 69, 67, 0, 71, 74, 0, 79, 0, 0],
    bass: [48, 48, 55, 55, 48, 48, 55, 55, 50, 50, 57, 57, 50, 50, 57, 57, 45, 45, 52, 52, 45, 45, 52, 52, 43, 43, 50, 50, 43, 43, 47, 47] },
  season: { bpm: 120, lead: [67, 0, 67, 69, 71, 0, 69, 67, 64, 0, 64, 67, 69, 0, 0, 0, 65, 0, 65, 67, 69, 0, 67, 65, 62, 0, 64, 65, 67, 0, 0, 0],
    bass: [43, 0, 50, 0, 43, 0, 50, 0, 40, 0, 47, 0, 40, 0, 47, 0, 41, 0, 48, 0, 41, 0, 48, 0, 38, 0, 45, 0, 43, 0, 47, 0] },
  arcade: { bpm: 160, lead: [64, 64, 0, 64, 0, 60, 64, 0, 67, 0, 0, 0, 55, 0, 0, 0, 60, 0, 55, 0, 52, 0, 57, 59, 58, 57, 55, 64, 67, 69, 65, 67],
    bass: [40, 0, 40, 0, 47, 0, 40, 0, 43, 0, 43, 0, 50, 0, 43, 0, 45, 0, 45, 0, 52, 0, 45, 0, 41, 0, 43, 0, 45, 0, 47, 0] },
};

export function playMusic(name) {
  if (!unlocked) { pendingSong = name; return; }
  if (currentSong === name) return;
  stopMusic();
  currentSong = name;
  if (!name || !ensure()) return;
  const song = SONGS[name];
  const stepDur = 60 / song.bpm / 2;
  musicStep = 0;
  nextTime = ac.currentTime + 0.05;
  musicTimer = setInterval(() => {
    while (nextTime < ac.currentTime + 0.2) {
      const i = musicStep % song.lead.length;
      const l = song.lead[i], b = song.bass[i];
      const at = nextTime - ac.currentTime;
      if (l) tone(N(l), stepDur * 0.9, { vol: 0.08, at, dest: musicGain });
      if (b) tone(N(b), stepDur * 0.95, { vol: 0.16, type: 'triangle', at, dest: musicGain });
      nextTime += stepDur;
      musicStep++;
    }
  }, 50);
}
export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  currentSong = null;
}
