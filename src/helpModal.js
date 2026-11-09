// How-to-Play als kleines HTML-Popup: scrollbar, mit X / Klick daneben / ESC schliessbar.
import { t, keyNames } from './i18n/index.js';
import { input } from './input.js';
import { sfx } from './systems/audio.js';

let el = null;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function isHelpOpen() { return !!el; }

export function openHelp() {
  if (el) return;
  const pages = t('help.pages');
  const k = keyNames();
  const body = pages.map((p, i) => {
    const b = t('help.pages.' + i + '.b');
    return `<section><h3>${esc(p.t)}</h3><p>${esc(b).replace(/\n/g, '<br>')}</p></section>`;
  }).join('');
  el = document.createElement('div');
  el.id = 'help';
  el.innerHTML = `
    <div class="help-win" role="dialog" aria-modal="true" aria-label="${esc(t('help.title'))}">
      <div class="help-head"><span>${esc(t('help.title'))}</span><button class="help-x" aria-label="Close">X</button></div>
      <div class="help-body" tabindex="0">${body}</div>
      <div class="help-foot">${esc(t('help.footer', { back: k.back }))}</div>
    </div>`;
  document.body.appendChild(el);
  input.blocked = true;
  const close = () => closeHelp();
  el.querySelector('.help-x').addEventListener('click', close);
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
  el.querySelector('.help-body').focus({ preventScroll: true });
}

export function closeHelp() {
  if (!el) return;
  el.remove();
  el = null;
  input.blocked = false;
  input.endFrame();
  sfx.back();
}
