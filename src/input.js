// Keyboard (Space/Enter/Z = OK, Esc/X = Back, Pfeiltasten, S = Stats, M = Ton) + Touch-Pad.
// Intern heissen die Buttons weiter 'a' (OK) und 'b' (Back).

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ' ': 'a', Enter: 'a', z: 'a', Z: 'a',
  Escape: 'b', x: 'b', X: 'b', Backspace: 'b',
  s: 'stats', S: 'stats', Tab: 'stats',
  h: 'help', H: 'help', o: 'options', O: 'options',
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
  clearRegions() { regions = []; },
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
    const hit = hitAt(...toLogical(e));
    if (hit) { hit.hover?.(); hit.click?.(); return; }
    if (!regions.length) press('a');
  });
  canvas.addEventListener('pointerup', () => release('a'));
  canvas.addEventListener('pointercancel', () => release('a'));

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
