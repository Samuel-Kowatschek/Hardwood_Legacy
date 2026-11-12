// Popups (How to Play, Unlocks) als kleine HTML-Fenster: scrollbar, mit X / Klick daneben / ESC schliessbar.
import { t, keyNames } from './i18n/index.js';
import { input } from './input.js';
import { sfx } from './systems/audio.js';
import { save } from './systems/save.js';
import { ARCHETYPES } from './data/archetypes.js';
import { PERKS } from './data/perks.js';
import { TIP } from './config.js';

let el = null;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function isHelpOpen() { return !!el; }

// Allgemeines scrollbares Popup (Titel, HTML-Inhalt, Fusszeile)
function openModal(title, bodyHtml) {
  if (el) return null;
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
  return el;
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
    if (!has(x)) return `<section class="u-locked"><h3>${esc(x.name)}</h3><p class="u-type">${esc(t('unlocks.' + type))} · ${esc(t('unlocks.locked'))}</p><p>${esc(t('unlocks.how'))} ${esc(t('unlock.' + x.unlock.key))}</p></section>`;
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

// Teilen am Ende eines Runs: Text kopieren, WhatsApp, Instagram (Bild), X, Facebook, Telegram, System-Teilen, PNG
export function openShare({ text, url, file, png }) {
  const full = `${text} ${url}`;
  const enc = encodeURIComponent;
  const links = [
    ['whatsapp', 'WHATSAPP', `https://wa.me/?text=${enc(full)}`],
    ['x', 'X / TWITTER', `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`],
    ['facebook', 'FACEBOOK', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ['telegram', 'TELEGRAM', `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`],
  ];
  const btn = (id, label) => `<button class="share-btn" data-share="${id}">${esc(label)}</button>`;
  const body = `
    <div class="share-card"><img alt="" id="share-img"></div>
    <p class="share-text">${esc(full)}</p>
    <div class="share-grid">
      ${btn('copy', t('share.copy'))}${links.map(([id, l]) => btn(id, l)).join('')}
      ${btn('instagram', t('share.instagram'))}${navigator.share ? btn('more', t('share.more')) : ''}${btn('png', t('share.png'))}
    </div>
    <p class="share-note" id="share-note"></p>`;
  const root = openModal(t('share.title'), body);
  if (!root) return;
  let blob = null;
  png().then(b => { blob = b; if (b && el) root.querySelector('#share-img').src = URL.createObjectURL(b); });
  const note = msg => { const n = root.querySelector('#share-note'); if (n) n.textContent = msg; };
  const download = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const shareFile = async () => {
    const f = blob && new File([blob], file, { type: 'image/png' });
    if (f && navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], text: full }); return true; }
    return false;
  };
  root.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.share;
    try {
      if (id === 'copy') { await navigator.clipboard.writeText(full); note(t('share.copied')); }
      else if (id === 'instagram') {
        // Instagram hat keinen Web-Teilen-Link: am Handy Bild ueber das System-Menue teilen, sonst Karte speichern
        if (!(await shareFile())) { download(); note(t('share.instaHint')); }
      } else if (id === 'more') { if (!(await shareFile())) await navigator.share({ text, url }); }
      else if (id === 'png') download();
      else window.open(links.find(l => l[0] === id)[2], '_blank', 'noopener');
    } catch { /* abgebrochen */ }
  }));
}

// Seed eingeben (z.B. um mit Freunden denselben Seed zu spielen)
// Daily Seed: Namen frei waehlen (nur kosmetisch)
export function openNameInput(cur, onDone) {
  const clean = s => s.replace(/[^\p{L}' .-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  const body = `
    <p>${esc(t('namein.text'))}</p>
    <input id="nm-first" class="seed-in" maxlength="12" autocomplete="off" spellcheck="false" value="${esc(cur.first)}">
    <input id="nm-last" class="seed-in" maxlength="12" autocomplete="off" spellcheck="false" value="${esc(cur.last)}">
    <button class="share-btn seed-go" id="nm-go">${esc(t('namein.ok'))}</button>
    <p class="share-note" id="nm-note"></p>`;
  const root = openModal(t('namein.title'), body);
  if (!root) return;
  const f = root.querySelector('#nm-first'), l = root.querySelector('#nm-last');
  const go = () => {
    const first = clean(f.value).toUpperCase(), last = clean(l.value).toUpperCase();
    if (!first || !last) { root.querySelector('#nm-note').textContent = t('namein.short'); return; }
    closeHelp();
    onDone({ first, last });
  };
  for (const inp of [f, l]) inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); if (e.key === 'Escape') closeHelp(); });
  root.querySelector('#nm-go').addEventListener('click', go);
  setTimeout(() => f.focus(), 0);
}

export function openSeedInput(onStart) {
  const body = `
    <p>${esc(t('seedin.text'))}</p>
    <input id="seed-in" class="seed-in" maxlength="12" autocomplete="off" spellcheck="false" placeholder="ABC123">
    <button class="share-btn seed-go" id="seed-go">${esc(t('seedin.start'))}</button>
    <p class="share-note" id="seed-note"></p>`;
  const root = openModal(t('seedin.title'), body);
  if (!root) return;
  const inp = root.querySelector('#seed-in');
  const go = () => {
    const seed = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (seed.length < 3) { root.querySelector('#seed-note').textContent = t('seedin.short'); return; }
    closeHelp();
    onStart(seed);
  };
  inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); if (e.key === 'Escape') closeHelp(); });
  root.querySelector('#seed-go').addEventListener('click', go);
  setTimeout(() => inp.focus(), 0);
}

// Trinkgeld: PayPal.me-Links mit festen Betraegen (oeffnen PayPal in neuem Tab)
const CUP = '<svg class="cup" viewBox="0 0 9 8" aria-hidden="true"><path d="M2 0h1v1H2zM4 0h1v1H4zM6 0h1v1H6zM0 2h7v4H0zM7 3h2v2H7zM1 6h5v1H1zM0 7h7v1H0z" fill="currentColor"/></svg>';
export const tipEnabled = () => !!TIP.paypal;
export function openTip() {
  if (!tipEnabled()) return;
  const base = 'https://www.paypal.com/paypalme/' + encodeURIComponent(TIP.paypal);
  const link = (href, label) => `<a class="share-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${CUP}${esc(label)}</a>`;
  const body = `
    <p>${esc(t('tip.text'))}</p>
    <div class="tip-grid">${TIP.amounts.map(a => link(`${base}/${a}${TIP.currency}`, `${a} ${TIP.currency}`)).join('')}</div>
    ${link(base, t('tip.any')).replace('class="share-btn"', 'class="share-btn tip-any"')}
    <p class="share-note">${esc(t('tip.note'))}</p>`;
  const root = openModal(t('tip.title'), body);
  if (!root) return;
  root.querySelectorAll('a').forEach(a => a.addEventListener('click', () => sfx.select()));
}
