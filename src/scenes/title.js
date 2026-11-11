import { Scene } from './scene.js';
import { C, tiny, box, ball } from '../gfx.js';
import { Menu, bigText } from '../ui.js';
import { save } from '../systems/save.js';
import { input } from '../input.js';
import { playMusic, sfx } from '../systems/audio.js';
import { randomSeedString, dailySeedString, RNG } from '../systems/rng.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { t } from '../i18n/index.js';
import { CreateScene } from './create.js';
import { DailyCreateScene, dailyDone } from './daily.js';
import { HofScene } from './hof.js';
import { PracticeScene } from './practice.js';
import { openHelp, openUnlocks, openSeedInput } from '../helpModal.js';
import { restoreRun } from '../systems/league.js';
import { playRun } from '../flow.js';
import { OptionsScene } from './options.js';

export class TitleScene extends Scene {
  enter(game) {
    this.game = game;
    game.run = null;
    playMusic('title');
    this.meta = save.meta();
    const params = new URLSearchParams(location.search);
    this.urlSeed = (params.get('seed') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    this.buildMenu();
    const r = new RNG('title' + Math.floor(Date.now() / 60000));
    this.looks = [rollLook(r), rollLook(r)];
  }
  buildMenu() {
    this.saved = save.loadRun();
    const items = [];
    if (this.saved) items.push({ id: 'continue', label: t('title.continue', { s: this.saved.seasonNo }) });
    items.push({ id: 'new', label: t('title.newRun') }, { id: 'daily', label: dailyDone(dailySeedString()) ? t('title.dailyDone') : t('title.daily'), disabled: dailyDone(dailySeedString()) }, { id: 'enterseed', label: t('title.enterSeed') });
    if (this.urlSeed) items.push({ id: 'seed', label: t('title.seed', { s: this.urlSeed.slice(0, 8) }) });
    items.push({ id: 'practice', label: t('title.practice') }, { id: 'unlocks', label: t('title.unlocks') },
      { id: 'hof', label: t('title.hof') }, { id: 'help', label: t('title.help') }, { id: 'options', label: t('title.options') });
    this.items = items;
    this.menu = new Menu(items, { rowH: items.length > 9 ? 9 : 10, hint: false });
  }
  // Wer den heutigen Daily-Seed eintippt, spielt den Daily (inkl. 1x-pro-Tag-Regel)
  startSeed(game, seed) {
    if (seed !== dailySeedString()) return game.set(new CreateScene(seed));
    if (dailyDone(seed)) { sfx.back(); return; }
    game.set(new DailyCreateScene(seed));
  }
  update(game) {
    const i = this.menu.update();
    if (i === null) return;
    const id = this.items[i].id;
    if (id === 'continue') {
      const run = restoreRun(this.saved);
      playRun(game, run, { resume: true });
    } else if (id === 'enterseed') {
      openSeedInput(seed => this.startSeed(game, seed));
    } else if (id === 'new') game.set(new CreateScene(randomSeedString()));
    else if (id === 'daily') game.set(new DailyCreateScene(dailySeedString()));
    else if (id === 'seed') this.startSeed(game, this.urlSeed);
    else if (id === 'hof') game.set(new HofScene());
    else if (id === 'practice') game.set(new PracticeScene());
    else if (id === 'unlocks') openUnlocks();
    else if (id === 'help') openHelp();
    else game.set(new OptionsScene());
  }
  draw(ctx) {
    const t0 = this.t;
    // Logo kompakt, darunter das Menue (bis zu 10 Eintraege)
    bigText(ctx, 'HARDWOOD', 80, 2, C.WHITE, 2);
    bigText(ctx, 'LEGACY', 80, 18, C.ORANGE, 2);
    ctx.fillStyle = C.WHITE; ctx.fillRect(16, 35, 128, 1);
    drawSprite(ctx, this.looks[0], ['#1e5aa8', '#f97316'], 1, 70, { frame: idleFrame(t0) });
    drawSprite(ctx, this.looks[1], ['#ffffff', '#142a63'], 143, 70, { frame: idleFrame(t0 + 16) });
    const rowH = this.menu.rowH;
    box(ctx, 18, 38, 124, this.items.length * rowH + 9);
    this.menu.draw(ctx, 26, 43, 112);
    const showRec = this.meta.runs && Math.floor(t0 / 180) % 2;
    const hint = input.device === 'touch' ? t('title.tagline') : t('title.hint');
    tiny(ctx, showRec ? t('title.record', { n: this.meta.runs, b: this.meta.best }) : hint, 80, 139, showRec ? C.WHITE : C.ORANGE, 'center');
  }
}
