// Gemeinsame Zeichen-Helfer fuer Arcade-Momente (Battle-Layout a la Gen 1).
import { C, text, tiny, box, bar, ball } from '../gfx.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

export function platform(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = C.DARK;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
    ctx.fillRect(cx - w, cy + y, w * 2, 1);
  }
}

export function hoop(ctx, x, y) {
  // Brett 14x10, Ring orange
  ctx.fillStyle = C.WHITE; ctx.fillRect(x, y, 14, 10);
  ctx.fillStyle = C.BG; ctx.fillRect(x + 1, y + 1, 12, 8);
  ctx.fillStyle = C.WHITE; ctx.fillRect(x + 4, y + 4, 6, 4);
  ctx.fillStyle = C.BG; ctx.fillRect(x + 5, y + 5, 4, 3);
  ctx.fillStyle = C.ORANGE; ctx.fillRect(x + 2, y + 10, 10, 1);
  ctx.fillStyle = C.WHITE;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 2 + (i % 2), y + 11 + (i % 2), 1, 3);
}

// Battle-Szene: Gegner oben rechts (Front), eigener Spieler unten links (Back)
export function drawBattle(ctx, s, t, { oppDx = 0, myFrame = null, showHoop = true } = {}) {
  const { run, opts } = s;
  const p = run.p, team = run.teams[p.teamId], opp = opts.opp, star = opp.star;
  platform(ctx, 126, 56, 26, 5);
  platform(ctx, 32, 92, 30, 5);
  drawSprite(ctx, star.look, opp.colors, 110 + oppDx, 6, { frame: idleFrame(t + 10), scale: 2 });
  drawSprite(ctx, p.look, team.colors, 16, 44, { view: 'back', frame: myFrame || idleFrame(t), scale: 2, age: p.age });
  if (showHoop) hoop(ctx, 88, 4);
  // Gegner-Box
  box(ctx, 2, 2, 82, 26);
  tiny(ctx, `${star.first[0]}. ${star.last}`.toUpperCase().slice(0, 18), 8, 7);
  tiny(ctx, `${opp.abbr} DEF`, 8, 15);
  bar(ctx, 40, 15, 38, 5, 0.4 + opts.pressure, C.ORANGE);
  // Eigene Box
  box(ctx, 70, 62, 88, 32);
  tiny(ctx, `${p.first[0]}. ${p.last}`.toUpperCase().slice(0, 19), 76, 67);
  const [a, b] = opts.scoreLine || [98, 99];
  text(ctx, `${a}-${b}`, 76, 75, C.ORANGE);
  tiny(ctx, opts.situation || '', 76, 85);
}

export { C, text, tiny, box, bar, ball };

// Horizontaler Meter mit oranger Zone und weisser And-One-Mitte
export const MX = 12, MW = 136;
export function drawMeter(ctx, m, zc, zw, inner, y = 117) {
  ctx.fillStyle = C.WHITE; ctx.fillRect(MX - 1, y, MW + 2, 10);
  ctx.fillStyle = C.DARK; ctx.fillRect(MX, y + 1, MW, 8);
  ctx.fillStyle = C.ORANGE;
  ctx.fillRect(MX + Math.round((zc - zw / 2) * MW), y + 1, Math.max(2, Math.round(zw * MW)), 8);
  if (inner) {
    ctx.fillStyle = C.WHITE;
    ctx.fillRect(MX + Math.round((zc - inner / 2) * MW), y + 2, Math.max(1, Math.round(inner * MW)), 6);
  }
  ctx.fillStyle = C.WHITE;
  ctx.fillRect(MX + Math.round(m * MW) - 1, y - 3, 3, 16);
  ctx.fillStyle = C.DARK;
  ctx.fillRect(MX + Math.round(m * MW), y - 2, 1, 14);
}
// Ergebnis eines Meter-Treffers
export function meterHit(m, zc, zw, inner) {
  const d = Math.abs(m - zc);
  return { make: d <= zw / 2, andOne: d <= inner / 2 };
}
