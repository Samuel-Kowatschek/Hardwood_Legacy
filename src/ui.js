// UI-Widgets: Typewriter-Textbox, Menue mit Cursor, Status-Leiste.
import { C, text, tiny, box, cursor, downArrow, wrap, bar } from './gfx.js';
import { sfx } from './systems/audio.js';
import { input } from './input.js';
import { ovr } from './systems/sim.js';
import { drawSprite, idleFrame } from './sprites/spriteGen.js';
import { t as tr } from './i18n/index.js';

export class Typewriter {
  constructor(str, cols = 18, rows = 3, speed = 1.5) {
    const lines = wrap(str, cols);
    this.pages = [];
    for (let i = 0; i < lines.length; i += rows) this.pages.push(lines.slice(i, i + rows));
    this.page = 0; this.chars = 0; this.speed = speed; this.done = false; this.t = 0;
  }
  get pageLen() { return this.pages[this.page].join('').length; }
  get pageDone() { return this.chars >= this.pageLen; }
  get last() { return this.page >= this.pages.length - 1; }
  // gibt true zurueck, sobald der letzte Page bestaetigt wurde
  update(confirm = true) {
    this.t++;
    if (this.done) return true;
    if (!this.pageDone) {
      const before = Math.floor(this.chars);
      this.chars += this.speed;
      if (Math.floor(this.chars) !== before && before % 3 === 0) sfx.text();
      if (input.pressed('a') || input.pressed('b')) this.chars = this.pageLen;
      return false;
    }
    if (!confirm && this.last) { this.done = true; return true; }
    if (input.pressed('a') || input.pressed('b')) {
      sfx.blip();
      if (this.last) this.done = true;
      else { this.page++; this.chars = 0; }
    }
    return this.done;
  }
  draw(ctx, x, y, lineH = 16, color = C.WHITE, arrow = true) {
    let left = Math.floor(this.chars);
    this.pages[this.page].forEach((ln, i) => {
      const s = ln.slice(0, Math.max(0, left));
      left -= ln.length;
      text(ctx, s, x, y + i * lineH, color);
    });
    return this.pageDone && !this.done && arrow;
  }
}

// Standard-Textbox unten (Gen-1-Layout): 160x48, 2 Zeilen
export class TextBox {
  constructor(str, { rows = 2, lineH = 16, y = 96, h = 48 } = {}) {
    this.tw = new Typewriter(str, 17, rows);
    this.y = y; this.h = h; this.lineH = lineH;
  }
  update() { return this.tw.update(); }
  get done() { return this.tw.done; }
  draw(ctx, t) {
    box(ctx, 0, this.y, 160, this.h);
    const arrow = this.tw.draw(ctx, 10, this.y + 12, this.lineH);
    if (arrow) downArrow(ctx, 146, this.y + this.h - 10, t);
  }
}

export class Menu {
  constructor(items, { rowH = 16, hint = true } = {}) {
    this.items = items; this.i = Math.max(0, items.findIndex(it => !it.disabled)); this.rowH = rowH; this.hint = hint;
  }
  update() {
    const n = this.items.length;
    if (this.clicked !== undefined && this.clicked !== null) {
      const k = this.clicked; this.clicked = null;
      if (this.items[k].disabled) { sfx.back(); return null; }
      sfx.select();
      return k;
    }
    if (input.pressed('down') || input.pressed('right')) { this.i = (this.i + 1) % n; sfx.blip(); }
    if (input.pressed('up') || input.pressed('left')) { this.i = (this.i + n - 1) % n; sfx.blip(); }
    if (input.pressed('a')) {
      if (this.items[this.i].disabled) { sfx.back(); return null; }
      sfx.select();
      return this.i;
    }
    return null;
  }
  draw(ctx, x, y, w = 160 - x - 4) {
    this.items.forEach((it, k) => {
      const yy = y + k * this.rowH;
      input.region(x - 2, yy - 2, w, this.rowH, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clicked = k; });
      if (k === this.i) cursor(ctx, x, yy);
      text(ctx, it.label, x + 8, yy, it.disabled ? C.DARK : k === this.i ? C.ORANGE : C.WHITE);
      if (this.hint && it.hint) tiny(ctx, it.hint, x + 8, yy + 9, C.WHITE);
    });
  }
}

// Kompakte Status-Leiste oben: Sprite + Name + OVR + 4 Kernwerte
export function drawStatus(ctx, run, t, kind = '') {
  const p = run.p, team = run.teams[p.teamId];
  ctx.fillStyle = C.DARK; ctx.fillRect(0, 0, 160, 30);
  ctx.fillStyle = C.WHITE; ctx.fillRect(0, 30, 160, 1);
  drawSprite(ctx, p.look, team.colors, 3, 3, { frame: idleFrame(t), age: p.age });
  tiny(ctx, `${p.first[0]}. ${p.last}`, 22, 3);
  const line = tr('status.line', { s: run.seasonNo, team: team.abbr, age: p.age });
  tiny(ctx, line, 22, 10);
  if (kind) tiny(ctx, kind, 26 + line.length * 4, 10, C.ORANGE);
  text(ctx, String(ovr(p)), 158, 3, C.ORANGE, 'right');
  tiny(ctx, tr('stat.ovr'), 158 - 3 * 8 - 14, 4, C.WHITE);
  if (input.device !== 'touch') {
    tiny(ctx, tr('status.hint'), 158, 12, C.WHITE, 'right');
    // Klick auf den Hinweis oeffnet die Stats
    input.region(124, 10, 36, 8, null, () => { input.press('stats'); input.release('stats'); });
  }
  const vals = [['form', p.form], ['body', p.body], ['chem', p.chem], ['fame', p.fame]];
  vals.forEach(([l, v], i) => {
    const x = 22 + (i % 2) * 69, y = 18 + Math.floor(i / 2) * 6;
    tiny(ctx, tr('stat.' + l).slice(0, 6), x, y);
    bar(ctx, x + 26, y, 40, 5, v / 100);
  });
}

export function header(ctx, title, right = '') {
  ctx.fillStyle = C.DARK; ctx.fillRect(0, 0, 160, 12);
  ctx.fillStyle = C.WHITE; ctx.fillRect(0, 12, 160, 1);
  text(ctx, title, 3, 2, C.WHITE);
  if (right) tiny(ctx, right, 157, 4, C.ORANGE, 'right');
}

// Text 2x skaliert (fuer grosse Zahlen)
const bigCache = document.createElement('canvas');
export function bigText(ctx, str, cx, y, color = C.ORANGE, scale = 2) {
  str = String(str);
  bigCache.width = str.length * 8; bigCache.height = 8;
  const b = bigCache.getContext('2d');
  b.clearRect(0, 0, bigCache.width, 8);
  text(b, str, 0, 0, color);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bigCache, Math.round(cx - (str.length * 8 * scale) / 2), y, str.length * 8 * scale, 8 * scale);
}
