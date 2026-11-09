// Grafik-Basics: Palette, Pixel-Font (Press Start 2P, per Alpha-Threshold ohne Antialiasing),
// 3x5-Mini-Font, Gen-1-Textboxen, Cursor/Pfeile.

export const W = 160, H = 144;
// Farbrollen. 'classic' ist das Haupt-Schema (Blau/Weiss/Orange), dazu Alternativen.
export const SCHEMES = {
  classic: { BG: '#1e3a8a', DARK: '#142a63', WHITE: '#ffffff', ORANGE: '#f97316' },
  pocket: { BG: '#306230', DARK: '#0f380f', WHITE: '#e0f8d0', ORANGE: '#c4f02a' },
  la: { BG: '#552583', DARK: '#3a1760', WHITE: '#ffffff', ORANGE: '#FDB927' },
  mono: { BG: '#000000', DARK: '#2a2a2a', WHITE: '#ffffff', ORANGE: '#a6a6a6' },
};
export const SCHEME_LIST = Object.keys(SCHEMES);
export const C = { ...SCHEMES.classic };
export function setScheme(name) {
  Object.assign(C, SCHEMES[name] || SCHEMES.classic);
  try {
    const r = document.documentElement.style;
    r.setProperty('--bg', C.BG); r.setProperty('--dark', C.DARK); r.setProperty('--white', C.WHITE); r.setProperty('--orange', C.ORANGE);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', C.BG);
  } catch { /* kein DOM */ }
}
const FONT = '"Press Start 2P"';

let fontOk = false;
const glyphCache = new Map();

export async function initFont() {
  try {
    await Promise.race([
      document.fonts.load(`8px ${FONT}`, 'AZaz09'),
      new Promise(r => setTimeout(r, 2500)),
    ]);
    fontOk = document.fonts.check(`8px ${FONT}`);
  } catch { fontOk = false; }
  glyphCache.clear();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function glyph(ch, color) {
  const key = ch + '|' + color;
  let g = glyphCache.get(key);
  if (g) return g;
  g = document.createElement('canvas');
  g.width = 8; g.height = 8;
  const gx = g.getContext('2d');
  gx.font = fontOk ? `8px ${FONT}` : 'bold 8px monospace';
  gx.textBaseline = 'alphabetic';
  gx.fillStyle = color;
  gx.fillText(ch, 0, 8);
  const img = gx.getImageData(0, 0, 8, 8);
  const [r, gg, b] = hexToRgb(color);
  for (let i = 0; i < img.data.length; i += 4) {
    const on = img.data[i + 3] >= 100;
    img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = on ? 255 : 0;
  }
  gx.putImageData(img, 0, 0);
  glyphCache.set(key, g);
  return g;
}

// 8x8-Text. align: 'left' | 'center' | 'right'
export function text(ctx, str, x, y, color = C.WHITE, align = 'left') {
  str = String(str);
  if (align === 'center') x = Math.round(x - str.length * 4);
  else if (align === 'right') x = x - str.length * 8;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch !== ' ') ctx.drawImage(glyph(ch, color), x + i * 8, y);
  }
}

// ---- 3x5 Mini-Font (4px Vorschub) fuer dichte Stat-Anzeigen ----
const TINY = {
  A: '.#.#.#####.##.#',
  B: '##.#.###.#.###.',
  C: '.###..#..#...##',
  D: '##.#.##.##.###.',
  E: '####..##.#..###',
  F: '####..##.#..#..',
  G: '.###..#.##.#.##',
  H: '#.##.#####.##.#',
  I: '###.#..#..#.###',
  J: '..#..#..##.#.#.',
  K: '#.##.###.#.##.#',
  L: '#..#..#..#..###',
  M: '#.########.##.#',
  N: '##.#.##.##.##.#',
  O: '.#.#.##.##.#.#.',
  P: '##.#.###.#..#..',
  Q: '.#.#.##.###..##',
  R: '##.#.###.#.##.#',
  S: '.###...#...###.',
  T: '###.#..#..#..#.',
  U: '#.##.##.##.####',
  V: '#.##.##.##.#.#.',
  W: '#.##.########.#',
  X: '#.##.#.#.#.##.#',
  Y: '#.##.#.#..#..#.',
  Z: '###..#.#.#..###',
  '0': '####.##.##.####',
  '1': '.#.##..#..#.###',
  '2': '##...#.#.#..###',
  '3': '##...#.#...###.',
  '4': '#.##.####..#..#',
  '5': '####..##...###.',
  '6': '.###..####.####',
  '7': '###..#.#..#..#.',
  '8': '####.#####.####',
  '9': '####.####..###.',
  '.': '.............#.',
  ',': '..........#.#..',
  ':': '....#.....#....',
  '-': '......###......',
  '+': '....#.###.#....',
  '/': '..#..#.#.#..#..',
  '%': '#.#..#.#.#..#.#',
  '!': '.#..#..#.....#.',
  '?': '##...#.#.....#.',
  "'": '.#..#..........',
  '(': '.#.#..#..#...#.',
  ')': '.#...#..#..#.#.',
  '#': '#.#####.#####.#',
  '=': '...###...###...',
  '>': '#...#...#.#.#..',
  '<': '..#.#.#...#...#',
  '*': '...#.#.#.#.#...',
  '&': '.#.#.#.#.#.#.##',
  '$': '.####..#..####.',
};
const UMLAUT = { 'Ä': 'AE', 'Ö': 'OE', 'Ü': 'UE', 'ß': 'SS', 'ä': 'AE', 'ö': 'OE', 'ü': 'UE' };

export function tinyWidth(str) { return tinyNorm(str).length * 4 - 1; }
export function tinyNorm(str) {
  return String(str).replace(/[ÄÖÜäöüß]/g, m => UMLAUT[m]).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

export function tiny(ctx, str, x, y, color = C.WHITE, align = 'left') {
  str = tinyNorm(str);
  const w = str.length * 4 - 1;
  if (align === 'center') x = Math.round(x - w / 2);
  else if (align === 'right') x = x - w;
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const g = TINY[str[i]];
    if (!g) continue;
    for (let p = 0; p < 15; p++) if (g[p] === '#') ctx.fillRect(x + i * 4 + (p % 3), y + ((p / 3) | 0), 1, 1);
  }
}

// ---- Boxen ----
export function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

// Gen-1-Textbox: doppelter weisser Rahmen, abgerundete Pixel-Ecken
export function box(ctx, x, y, w, h, fill = C.BG, border = C.WHITE) {
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = border;
  // aussen (Ecken ausgespart)
  ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
  ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  // innen
  ctx.fillRect(x + 3, y + 2, w - 6, 1); ctx.fillRect(x + 3, y + h - 3, w - 6, 1);
  ctx.fillRect(x + 2, y + 3, 1, h - 6); ctx.fillRect(x + w - 3, y + 3, 1, h - 6);
}

// Einfacher Panel-Rahmen (1px) mit 1px Hard-Shadow
export function panel(ctx, x, y, w, h, fill = C.DARK) {
  ctx.fillStyle = C.DARK; ctx.fillRect(x + 1, y + 1, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.WHITE; ctx.lineWidth = 1;
  ctx.fillStyle = C.WHITE;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
}

// Orangener Menue-Cursor ▶ (5x7)
export function cursor(ctx, x, y, color = C.ORANGE) {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 1, 7 - i * 2);
}
// Weisser "weiter"-Pfeil ▼ (7x4), blinkt
export function downArrow(ctx, x, y, t, color = C.WHITE) {
  if (Math.floor(t / 30) % 2) return;
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 7 - i * 2, 1);
}
export function upArrow(ctx, x, y, color = C.WHITE) {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 - i, y + i, 1 + i * 2, 1);
}

// Balken (z.B. Form/Koerper) mit Wert 0..1
export function bar(ctx, x, y, w, h, v, color = C.ORANGE) {
  ctx.fillStyle = C.WHITE; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.DARK; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, v))), h - 2);
}

// Zeilenumbruch nach Zeichen-Limit (Woerter bleiben ganz)
export function wrap(str, max) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!line) line = word;
      else if ((line + ' ' + word).length <= max) line += ' ' + word;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

// Basketball-Sprite 5x5 (orange)
export function ball(ctx, x, y) {
  ctx.fillStyle = C.ORANGE;
  ctx.fillRect(x + 1, y, 3, 5); ctx.fillRect(x, y + 1, 5, 3);
  ctx.fillStyle = C.DARK;
  ctx.fillRect(x + 2, y + 1, 1, 3); ctx.fillRect(x + 1, y + 2, 3, 1);
}
