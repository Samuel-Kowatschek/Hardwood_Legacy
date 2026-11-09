// Popups (How to Play, Unlocks) als kleine HTML-Fenster: scrollbar, mit X / Klick daneben / ESC schliessbar.
import { t, keyNames } from './i18n/index.js';
import { input } from './input.js';
import { sfx } from './systems/audio.js';
import { save } from './systems/save.js';
import { ARCHETYPES } from './data/archetypes.js';
import { PERKS } from './data/perks.js';

let el = null;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function isHelpOpen() { return !!el; }

// Allgemeines scrollbares Popup (Titel, HTML-Inhalt, Fusszeile)
function openModal(title, bodyHtml) {
  if (el) return;
  const k = keyNames();
  el = document.createElement('div');
  el.id = 'help';
  el.innerHTML = `
    <div class="help-win" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="help-head"><span>${esc(title)}</span><button class="help-x" aria-label="Close">X</button></div>
      <div class="help-body" tabindex="0">${bodyHtml}</div>
      <div class="help-foot">${esc(t('help.footer', { back: k.back }))}</div>
    </div>`;
  document.body.appendChild(el);
  input.blocked = true;
  const close = () => closeHelp();
  el.querySelector('.help-x').addEventListener('click', close);
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
  el.querySelector('.help-body').focus({ preventScroll: true });
}

export function openHelp() {
  const pages = t('help.pages');
  const body = pages.map((p, i) => {
    const b = t('help.pages.' + i + '.b');
    return `<section><h3>${esc(p.t)}</h3><p>${esc(b).replace(/\n/g, '<br>')}</p></section>`;
  }).join('');
  openModal(t('help.title'), body);
}

// Alle Freischaltungen: freigeschaltete mit Art und Wirkung, gesperrte nur mit Namen
export function openUnlocks() {
  const meta = save.meta();
  const has = x => !!x.unlock && (x.unlock.test(meta) || meta.unlocked.includes(x.id));
  const items = [
    ...ARCHETYPES.filter(a => a.unlock).map(a => ({ x: a, type: 'archetype' })),
    ...PERKS.filter(p => p.unlock).map(p => ({ x: p, type: 'perk' })),
  ];
  const n = items.filter(i => has(i.x)).length;
  const body = `<p class="u-count">${esc(t('unlocks.count', { n, m: items.length }))}</p>` + items.map(({ x, type }) => {
    if (!has(x)) return `<section class="u-locked"><h3>${esc(x.name)}</h3><p>${esc(t('unlocks.locked'))}</p></section>`;
    let desc;
    if (type === 'archetype') {
      const sk = ['sho', 'pla', 'def', 'ath', 'clu'].map(k => `${t('stat.' + k)} ${x.skills[k]}`).join(' · ');
      desc = `${esc(t('arch.' + x.id))} (${esc(x.pos)})<br>${esc(sk)}`;
    } else desc = esc(t('perks.' + x.id));
    return `<section><h3>${esc(x.name)}</h3><p class="u-type">${esc(t('unlocks.' + type))}</p><p>${desc}</p></section>`;
  }).join('');
  openModal(t('unlocks.title'), body);
}

export function closeHelp() {
  if (!el) return;
  el.remove();
  el = null;
  input.blocked = false;
  input.endFrame();
  sfx.back();
}
