import { Scene } from './scene.js';
import { C, tiny, box, ball } from '../gfx.js';
import { Menu, bigText } from '../ui.js';
import { save } from '../systems/save.js';
import { input } from '../input.js';
import { playMusic } from '../systems/audio.js';
import { randomSeedString, dailySeedString, RNG } from '../systems/rng.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { t } from '../i18n/index.js';
import { CreateScene } from './create.js';
import { HofScene } from './hof.js';
import { PracticeScene } from './practice.js';
import { openHelp, openUnlocks } from '../helpModal.js';
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
    const items = [{ id: 'new', label: t('title.newRun') }, { id: 'daily', label: t('title.daily') }];
    if (this.urlSeed) items.push({ id: 'seed', label: t('title.seed', { s: this.urlSeed.slice(0, 8) }) });
    items.push({ id: 'practice', label: t('title.practice') }, { id: 'unlocks', label: t('title.unlocks') },
      { id: 'hof', label: t('title.hof') }, { id: 'help', label: t('title.help') }, { id: 'options', label: t('title.options') });
    this.items = items;
    this.menu = new Menu(items, { rowH: items.length > 8 ? 9 : 10, hint: false });
  }
  update(game) {
    const i = this.menu.update();
    if (i === null) return;
    const id = this.items[i].id;
    if (id === 'new') game.set(new CreateScene(randomSeedString()));
    else if (id === 'daily') game.set(new CreateScene(dailySeedString(), true));
    else if (id === 'seed') game.set(new CreateScene(this.urlSeed));
    else if (id === 'hof') game.set(new HofScene());
    else if (id === 'practice') game.set(new PracticeScene());
    else if (id === 'unlocks') openUnlocks();
    else if (id === 'help') openHelp();
    else game.set(new OptionsScene());
  }
  draw(ctx) {
    const t0 = this.t;
    bigText(ctx, 'HARDWOOD', 80, 4, C.WHITE, 2);
    bigText(ctx, 'LEGACY', 80, 21, C.ORANGE, 2);
    ctx.fillStyle = C.WHITE; ctx.fillRect(16, 39, 128, 1);
    // Spieler links/rechts neben dem Menue
    drawSprite(ctx, this.looks[0], ['#1e5aa8', '#f97316'], 1, 72, { frame: idleFrame(t0) });
    drawSprite(ctx, this.looks[1], ['#ffffff', '#142a63'], 143, 72, { frame: idleFrame(t0 + 16) });
    const rowH = this.menu.rowH;
    box(ctx, 18, 43, 124, this.items.length * rowH + 10);
    this.menu.draw(ctx, 26, 49, 112);
    const showRec = this.meta.runs && Math.floor(t0 / 180) % 2;
    const hint = input.device === 'touch' ? t('title.tagline') : t('title.hint');
    tiny(ctx, showRec ? t('title.record', { n: this.meta.runs, b: this.meta.best }) : hint, 80, 139, showRec ? C.WHITE : C.ORANGE, 'center');
  }
}
