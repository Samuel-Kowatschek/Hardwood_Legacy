// Prozeduraler Spieler-Sprite: Layer (Koerper, Haare, Gesicht, Jersey, Shorts, Schuhe, Accessoires) + Palette-Swap.
import { BODY, HAIR, HAIR_STYLES, FACE, FACE_FEATURES, ACCESSORY, ACCESSORIES } from './parts.js';
import { OUTLINE, SKIN, HAIR_COLORS, GREY, GLASS, ACC_COLORS, SHOES, shade } from './palette.js';

const SW = 16, SH = 24;

export function rollLook(rng) {
  return {
    skin: rng.int(0, SKIN.length - 1),
    hair: rng.pick(HAIR_STYLES),
    hairColor: rng.int(0, HAIR_COLORS.length - 1),
    face: rng.weighted(FACE_FEATURES, f => (f === 'none' ? 4 : 1)),
    acc: rng.weighted(ACCESSORIES, a => (a === 'none' ? 3 : 1)),
    accColor: rng.int(0, ACC_COLORS.length - 1),
    shoe: rng.int(0, SHOES.length - 1),
    number: rng.int(0, 99),
  };
}

// Baut ein 16x24 Code-Raster fuer View/Frame
function buildGrid(look, view, frame) {
  const side = view === 'side';
  const shoot = frame === 'shoot';
  let base;
  if (side) base = BODY[frame === 'run1' ? 'side1' : 'side0'];
  else if (view === 'back') base = BODY[shoot ? 'backShoot' : 'back'];
  else base = BODY[shoot ? 'frontShoot' : 'front'];
  const g = base.map(r => r.split(''));
  const hair = HAIR[look.hair];

  if (side) {
    // vereinfachte Seitenfrisur: Oberkopf + Hinterkopf
    if (look.hair !== 'bald') {
      for (let x = 6; x <= 9; x++) g[2][x] = 'H';
      for (let x = 6; x <= 10; x++) g[3][x] = 'H';
      g[4][6] = 'H'; g[5][6] = 'H';
      if (['afro', 'long', 'dreads', 'braids'].includes(look.hair)) {
        g[1][5] = 'K'; g[0][6] = 'K'; g[0][7] = 'K'; g[0][8] = 'K'; g[0][9] = 'K';
        g[1][6] = 'H'; g[1][7] = 'H'; g[1][8] = 'H'; g[1][9] = 'H';
        for (let y = 4; y <= 8; y++) { g[y][5] = 'H'; g[y][4] = 'K'; }
      }
      if (look.hair === 'manbun') { g[1][4] = 'K'; g[2][4] = 'H'; g[2][3] = 'K'; }
    }
    if (look.face === 'headband') for (let x = 6; x <= 10; x++) g[3][x] = 'A';
    return g;
  }

  // Haare (Front-Overlay; bei Back-View Hinterkopf fuellen)
  const shootOff = shoot ? 0 : 0;
  hair.rows.forEach((row, y) => {
    for (let x = 0; x < SW; x++) {
      const c = row[x];
      if (c === '.') continue;
      // Shoot-Frame: Arme (Spalten 2-3, 12-13) nicht ueberschreiben
      if (shoot && (x <= 3 || x >= 12)) continue;
      g[y + shootOff][x] = c;
    }
  });
  if (view === 'back') {
    const fill = hair.back;
    for (let y = 2; y <= 7; y++) {
      for (let x = 5; x <= 10; x++) {
        if (g[y][x] !== 'S') continue;
        if (fill === 'full' && !(y === 7 && look.hair === 'buzz')) g[y][x] = 'H';
        if (fill === 'stripe' && (x === 7 || x === 8)) g[y][x] = 'H';
      }
    }
  } else {
    const face = FACE[look.face];
    face.forEach((row, y) => {
      if (!row) return;
      for (let x = 0; x < SW; x++) {
        const c = row[x];
        if (c === '.' || (shoot && (x <= 4 || x >= 11))) continue;
        g[y][x] = c;
      }
    });
  }
  if (view === 'back' && look.face === 'headband') for (let x = 5; x <= 10; x++) if (g[3][x] !== 'K') g[3][x] = 'A';

  // Accessoires
  if (!shoot || look.acc === 'kneebrace') {
    for (const [ax, ay] of ACCESSORY[look.acc]) {
      const x = view === 'back' ? SW - 1 - ax : ax;
      if (g[ay] && g[ay][x] && g[ay][x] !== '.' && g[ay][x] !== 'K') g[ay][x] = 'A';
    }
  }
  return g;
}

const cache = new Map();

// colors = [primary, secondary]; frame: idle0 | idle1 | shoot | run0 | run1
export function renderSprite(look, colors, view = 'front', frame = 'idle0', age = 20) {
  const key = JSON.stringify([look, colors, view, frame, age >= 36 ? 2 : age >= 33 ? 1 : 0]);
  let cv = cache.get(key);
  if (cv) return cv;
  const [primary, secondary] = colors;
  const skin = SKIN[look.skin];
  let hairCol = HAIR_COLORS[look.hairColor];
  const accRaw = ACC_COLORS[look.accColor];
  const acc = accRaw === 'trim' ? secondary : accRaw;
  const [shoeRaw, sole] = SHOES[look.shoe];
  const shoe = shoeRaw === 'team' ? primary : shoeRaw;
  const pal = {
    K: OUTLINE, E: OUTLINE, S: skin, s: shade(skin), J: primary, j: secondary, N: secondary,
    P: primary, O: shoe, o: sole, H: hairCol, A: acc, G: GLASS, W: '#ffffff',
  };
  const grid = buildGrid(look, view, frame === 'idle1' ? 'idle0' : frame);

  // Alterung: graue Schlaefen ab 33, mehr Grau + Falten ab 36
  if (age >= 33) {
    for (let y = 0; y < 9; y++) for (let x = 0; x < SW; x++) {
      if (grid[y][x] !== 'H') continue;
      const temple = x <= 5 || x >= 10;
      if (temple || (age >= 36 && (x + y) % 3 === 0)) grid[y][x] = 'g';
    }
    if (view === 'front' && age >= 36 && grid[4][6] === 'S') { grid[4][6] = 's'; grid[4][9] = 's'; }
    pal.g = GREY;
  }

  cv = document.createElement('canvas');
  cv.width = SW; cv.height = SH;
  const ctx = cv.getContext('2d');
  const bob = frame === 'idle1' ? 1 : 0;
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const c = grid[y][x];
      if (c === '.' || !pal[c]) continue;
      ctx.fillStyle = pal[c];
      // Idle-Wippen: Oberkoerper 1px nach unten, Beine bleiben
      const dy = bob && y < 18 ? 1 : 0;
      ctx.fillRect(x, y + dy, 1, 1);
    }
  }
  cache.set(key, cv);
  return cv;
}

// Zeichnet Sprite (optional skaliert) – frame-Helfer fuer Idle-Animation
export function drawSprite(ctx, look, colors, x, y, { view = 'front', frame = 'idle0', age = 20, scale = 1, flip = false } = {}) {
  const cv = renderSprite(look, colors, view, frame, age);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(x + SW * scale, y);
    ctx.scale(-1, 1);
    ctx.drawImage(cv, 0, 0, SW * scale, SH * scale);
  } else {
    ctx.drawImage(cv, x, y, SW * scale, SH * scale);
  }
  ctx.restore();
}

export const idleFrame = t => (Math.floor(t / 32) % 2 ? 'idle1' : 'idle0');
