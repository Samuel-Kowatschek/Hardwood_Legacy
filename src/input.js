// Keyboard (Space/Enter/Z = OK, Esc/X = Back, Pfeiltasten, S = Stats, M = Ton) + Touch-Pad.
// Intern heissen die Buttons weiter 'a' (OK) und 'b' (Back).

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ' ': 'a', Enter: 'a', z: 'a', Z: 'a',
  Escape: 'b', x: 'b', X: 'b', Backspace: 'b',
  s: 'stats', S: 'stats', Tab: 'stats',
  h: 'help', H: 'help', o: 'options', O: 'options', q: 'menu', Q: 'menu',
};

const down = new Set();
let pressed = new Set();
const anyListeners = [];

function press(btn) {
  if (!down.has(btn)) pressed.add(btn);
  down.add(btn);
  anyListeners.forEach(f => f(btn));
}
function release(btn) { down.delete(btn); }

// Klickbare Bereiche (logische 160x144-Koordinaten). Werden jeden Frame beim Zeichnen neu registriert.
let regions = [];
// Richtungs-Steuerung per Maus fuer Minigames: Klick relativ zur Mitte (x, y) ergibt die Richtung.
// mode: 'dominant' (eine Richtung), 'both' (auch diagonal), 'horizontal' (nur links/rechts). Klick in der Mitte = OK.
let dirPad = null;
let mouseDirs = new Set();
function dirsFor(x, y) {
  const dx = x - dirPad.x, dy = y - dirPad.y, dead = dirPad.dead;
  if (dirPad.mode === 'horizontal') return Math.abs(dx) <= dead ? null : [dx < 0 ? 'left' : 'right'];
  if (Math.hypot(dx, dy) <= dead) return null;
  if (dirPad.mode === 'both') {
    const out = [];
    if (Math.abs(dx) > dead * 0.6) out.push(dx < 0 ? 'left' : 'right');
    if (Math.abs(dy) > dead * 0.6) out.push(dy < 0 ? 'up' : 'down');
    return out;
  }
  return [Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')];
}
function setMouseDirs(list) {
  for (const d of mouseDirs) if (!list.includes(d)) release(d);
  for (const d of list) if (!mouseDirs.has(d)) press(d);
  mouseDirs = new Set(list);
}
function hitAt(x, y) {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

export const input = {
  device: 'kb',
  blocked: false,
  // Widgets rufen das beim Zeichnen auf: hover() bei Mausbewegung darueber, click() bei Klick/Tap
  region(x, y, w, h, hover, click) { regions.push({ x, y, w, h, hover, click }); },
  clearRegions() { regions = []; dirPad = null; },
  dirPad(x, y, dead = 8, mode = 'dominant') { dirPad = { x, y, dead, mode }; },
  isDown: b => down.has(b),
  pressed: b => pressed.has(b),
  consume: b => pressed.delete(b),
  endFrame() { pressed = new Set(); },
  onAny(f) { anyListeners.push(f); },
  press, release,
};

export function initInput(canvas) {
  try { if (matchMedia('(pointer: coarse)').matches) input.device = 'touch'; } catch { /* egal */ }
  window.addEventListener('keydown', e => {
    input.device = 'kb';
    if (input.blocked) {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); input.onClose?.(); }
      return; // Pfeiltasten/Space scrollen im Popup
    }
    if (e.key === 'm' || e.key === 'M') { anyListeners.forEach(f => f('mute')); return; }
    const b = KEYMAP[e.key];
    if (!b) return;
    e.preventDefault();
    if (!e.repeat) press(b);
  });
  window.addEventListener('keyup', e => { const b = KEYMAP[e.key]; if (b) release(b); });
  window.addEventListener('blur', () => down.clear());

  const toLogical = e => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height];
  };
  let lastHover = null;
  canvas.addEventListener('pointermove', e => {
    if (input.blocked) return;
    const hit = hitAt(...toLogical(e));
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (hit && hit !== lastHover) hit.hover?.();
    lastHover = hit;
  });
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (input.blocked) return;
    if (e.pointerType !== 'mouse') input.device = 'touch';
    anyListeners.forEach(f => f('click'));
    // Klick auf einen Eintrag waehlt ihn aus; ohne klickbare Eintraege wirkt der Klick wie OK (Text weiter, Wurf ...)
    const pos = toLogical(e);
    const hit = hitAt(...pos);
    if (hit) { hit.hover?.(); hit.click?.(); return; }
    if (dirPad) {
      canvas.setPointerCapture?.(e.pointerId);
      const d = dirsFor(...pos);
      if (!d) press('a'); else { setMouseDirs(d); dragging = true; }
      return;
    }
    if (!regions.length) press('a');
  });
  let dragging = false;
  canvas.addEventListener('pointermove', e => {
    if (!dragging || !dirPad) return;
    setMouseDirs(dirsFor(...toLogical(e)) || []);
  });
  const endPointer = () => { release('a'); dragging = false; setMouseDirs([]); };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  document.querySelectorAll('[data-btn]').forEach(el => {
    const b = el.dataset.btn;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (e.pointerType !== 'mouse') input.device = 'touch';
      if (input.blocked) { if (b === 'b' || b === 'a' || b === 'help') input.onClose?.(); return; }
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('on');
      if (b === 'mute') anyListeners.forEach(f => f('mute')); else press(b);
    });
    const up = () => { el.classList.remove('on'); release(b); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  });
}
