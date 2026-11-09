// Keyboard (Space/Z/Enter = A, X/Esc = B, Pfeiltasten) + Touch (A/B/Dpad, Tap auf Canvas = A)

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ' ': 'a', z: 'a', Z: 'a', Enter: 'a', x: 'b', X: 'b', Escape: 'b', Backspace: 'b',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

const down = new Set();
let pressed = new Set();
let anyListeners = [];

function press(btn) {
  if (!down.has(btn)) pressed.add(btn);
  down.add(btn);
  anyListeners.forEach(f => f(btn));
}
function release(btn) { down.delete(btn); }

export const input = {
  isDown: b => down.has(b),
  pressed: b => pressed.has(b),
  any: () => pressed.size > 0,
  endFrame() { pressed = new Set(); },
  onAny(f) { anyListeners.push(f); },
  press, release,
};

export function initInput(canvas) {
  window.addEventListener('keydown', e => {
    const b = KEYMAP[e.key];
    if (e.key === 'm' || e.key === 'M') { anyListeners.forEach(f => f('mute')); return; }
    if (!b) return;
    e.preventDefault();
    if (!e.repeat) press(b);
  });
  window.addEventListener('keyup', e => { const b = KEYMAP[e.key]; if (b) release(b); });
  window.addEventListener('blur', () => down.clear());

  canvas.addEventListener('pointerdown', e => { e.preventDefault(); press('a'); });
  canvas.addEventListener('pointerup', () => release('a'));
  canvas.addEventListener('pointercancel', () => release('a'));

  document.querySelectorAll('[data-btn]').forEach(el => {
    const b = el.dataset.btn;
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('on'); press(b); });
    const up = () => { el.classList.remove('on'); release(b); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  });
}
