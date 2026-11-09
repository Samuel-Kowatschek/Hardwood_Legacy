// Keyboard (Space/Enter/Z = OK, Esc/X = Back, Pfeiltasten, S = Stats, M = Ton) + Touch-Pad.
// Intern heissen die Buttons weiter 'a' (OK) und 'b' (Back).

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ' ': 'a', Enter: 'a', z: 'a', Z: 'a',
  Escape: 'b', x: 'b', X: 'b', Backspace: 'b',
  s: 'stats', S: 'stats', Tab: 'stats',
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

export const input = {
  device: 'kb',
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
    if (e.key === 'm' || e.key === 'M') { anyListeners.forEach(f => f('mute')); return; }
    const b = KEYMAP[e.key];
    if (!b) return;
    e.preventDefault();
    if (!e.repeat) press(b);
  });
  window.addEventListener('keyup', e => { const b = KEYMAP[e.key]; if (b) release(b); });
  window.addEventListener('blur', () => down.clear());

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (e.pointerType !== 'mouse') input.device = 'touch';
    press('a');
  });
  canvas.addEventListener('pointerup', () => release('a'));
  canvas.addEventListener('pointercancel', () => release('a'));

  document.querySelectorAll('[data-btn]').forEach(el => {
    const b = el.dataset.btn;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      input.device = 'touch';
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
