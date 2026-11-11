// Game-Loop, Scaling, Scene-Manager mit Transitions (Wipe / Kampf-Flash).
import { W, H, C, initFont, text, setScheme } from './gfx.js';
import { setLang } from './i18n/index.js';
import { StatsScene } from './scenes/stats.js';
import { OptionsScene } from './scenes/options.js';
import { QuitScene } from './scenes/quit.js';
import { t } from './i18n/index.js';
import { input, initInput } from './input.js';
import { initAudio, unlockAudio, setMuted, isMuted, sfx } from './systems/audio.js';
import { save } from './systems/save.js';
import { loadNameGen } from './names/nameGen.js';
import { TitleScene } from './scenes/title.js';
import { VERSION } from './version.js';
import { openHelp, closeHelp } from './helpModal.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const scr = document.getElementById('screen');
  // Rand zum Browser lassen: max. 90 % der Breite, 84 % der Hoehe
  const fit = Math.min((scr.clientWidth * 0.9) / W, (scr.clientHeight * 0.84) / H);
  const full = Math.min(scr.clientWidth / W, scr.clientHeight / H);
  // Ganzzahliges Scaling mit Rand; auf kleinen Screens Rand opfern statt unter 2x zu fallen
  let s = Math.floor(fit);
  if (s < 2) s = Math.floor(full);
  if (s < 1) s = Math.max(0.5, full);
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
try { new ResizeObserver(resize).observe(document.getElementById('screen')); } catch { /* alt */ }

export const game = {
  scene: null, t: 0, names: null, trans: null, run: null, overlay: null,
  // Szene setzen (optional mit Transition)
  set(scene, transition = 'wipe') {
    if (transition === 'none' || !this.scene) { this._enter(scene); return; }
    this.trans = { type: transition, phase: 'out', t: 0, next: scene };
    if (transition === 'flash') sfx.flash();
  },
  // Szene zeigen und auf ihr Ergebnis warten
  show(scene, transition = 'wipe') {
    return new Promise(res => { scene._resolve = res; this.set(scene, transition); });
  },
  _enter(scene) {
    this.scene = scene;
    scene.t = 0;
    scene.enter?.(this);
  },
};

const TRANS = { wipe: { out: 10, in: 10 }, flash: { out: 46, in: 14 } };

function drawTransition(tr) {
  const len = TRANS[tr.type][tr.phase];
  const k = tr.t / len;
  if (tr.type === 'wipe') {
    ctx.fillStyle = C.DARK;
    if (tr.phase === 'out') ctx.fillRect(0, 0, Math.ceil(W * k), H);
    else ctx.fillRect(Math.floor(W * k), 0, W, H);
    return;
  }
  // Flash: 3x weiss blinken, dann Wipe in Baendern von links nach rechts
  if (tr.phase === 'out') {
    if (tr.t < 24) {
      if (Math.floor(tr.t / 4) % 2 === 0) { ctx.fillStyle = C.WHITE; ctx.fillRect(0, 0, W, H); }
    } else {
      const kk = (tr.t - 24) / 22;
      for (let b = 0; b < 9; b++) {
        const off = b % 2 ? 0 : 0.15;
        const w = Math.max(0, Math.min(1, kk * 1.15 - off)) * W;
        ctx.fillStyle = b % 2 ? C.WHITE : C.DARK;
        if (b % 2) ctx.fillRect(W - w, b * 16, w, 16); else ctx.fillRect(0, b * 16, w, 16);
      }
    }
  } else {
    ctx.fillStyle = C.WHITE;
    ctx.globalAlpha = 1 - k;
    if (Math.floor(tr.t / 2) % 2 === 0) ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function frame() {
  game.t++;
  const tr = game.trans;
  if (tr) {
    tr.t++;
    if (tr.phase === 'out' && tr.t >= TRANS[tr.type].out) { game._enter(tr.next); tr.phase = 'in'; tr.t = 0; }
    else if (tr.phase === 'in' && tr.t >= TRANS[tr.type].in) game.trans = null;
  } else if (game.overlay) {
    game.overlay.t++;
    if (input.pressed('help')) openHelp();
    else game.overlay.update(game);
  } else if (game.scene) {
    // Stats-Overlay jederzeit waehrend eines Runs
    if (input.pressed('help')) openHelp();
    else if (input.pressed('menu')) {
      // Hauptmenue: im Run mit Rueckfrage (Autosave vom Season-Beginn), sonst direkt
      if (game.run) { game.overlay = new QuitScene(game); input.endFrame(); }
      else if (!(game.scene instanceof TitleScene)) game.set(new TitleScene());
    } else if (input.pressed('options')) { game.overlay = new OptionsScene({ overlay: true, game }); input.endFrame(); }
    else if (game.run && input.pressed('stats') && !game.scene.noStats) { game.overlay = new StatsScene(game.run, game.scene); input.endFrame(); }
    else { game.scene.t++; game.scene.update?.(game); }
  }
  ctx.fillStyle = C.BG;
  ctx.fillRect(0, 0, W, H);
  input.clearRegions();
  game.scene?.draw?.(ctx, game);
  if (game.trans) input.clearRegions();
  if (game.overlay) { input.clearRegions(); game.overlay.draw(ctx, game); }
  if (game.trans) drawTransition(game.trans);
  input.endFrame();
}

let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  // feste 60 Updates/s, unabhaengig von der Bildwiederholrate
  while (acc >= 1000 / 60) { frame(); acc -= 1000 / 60; }
  requestAnimationFrame(loop);
}

async function boot() {
  resize();
  document.getElementById('version').textContent = VERSION;
  ctx.fillStyle = C.BG; ctx.fillRect(0, 0, W, H);
  initInput(canvas);
  const settings = save.settings();
  initAudio(settings.mute);
  setLang(settings.lang || 'en');
  setScheme(settings.scheme || 'classic');
  const toggleMute = () => { setMuted(!isMuted()); save.setSettings({ ...save.settings(), mute: isMuted() }); };
  input.onAny(b => { unlockAudio(); if (b === 'mute') toggleMute(); });
  game.toggleMute = toggleMute;
  // Button-Beschriftungen (Hilfe/Optionen/Stats/Ton) in der aktuellen Sprache
  const labelButtons = () => document.querySelectorAll('[data-label]').forEach(el => { el.textContent = t('ui.' + el.dataset.label); });
  labelButtons();
  window.addEventListener('langchange', labelButtons);

  await initFont();
  text(ctx, 'LOADING...', 80, 68, C.WHITE, 'center');
  try {
    game.names = await loadNameGen();
  } catch (e) {
    ctx.fillStyle = C.BG; ctx.fillRect(0, 0, W, H);
    text(ctx, 'ERROR:', 4, 50, C.ORANGE);
    text(ctx, 'NAMES MISSING', 4, 62);
    text(ctx, 'NEEDS A', 4, 80);
    text(ctx, 'HTTP SERVER', 4, 92);
    console.error(e);
    return;
  }
  game.set(new TitleScene(), 'none');
  // Beim Laden der Seite: How-to-Play als Popup
  input.onClose = closeHelp;
  openHelp();
  requestAnimationFrame(loop);
}

boot();
