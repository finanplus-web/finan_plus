// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Utilidades de interface: escape de texto, avisos, diálogos (aviso, confirmação, pergunta),
// folha/janela de edição e pequenos componentes HTML. Todo texto do usuário passa por esc().
import { icon } from './icons.js';

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);
export const attr = esc;

// ------------------------------------------------------------------ avisos rápidos
/** aviso rápido; o: { action, onAction } mostra um botão (ex.: Desfazer) que some junto com o aviso */
export function toast(msg, ms = 2600, o = {}) {
  const box = $('#toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast' + (o.action ? ' withAction' : '');
  const txt = document.createElement('span'); txt.textContent = msg; t.append(txt);
  if (o.action) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toastAct'; b.textContent = o.action;
    b.onclick = () => { b.disabled = true; t.classList.remove('show'); setTimeout(() => t.remove(), 300); o.onAction?.(); };
    t.append(b);
  }
  box.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

// ------------------------------------------------------------------ diálogos (sobre a folha, se houver)
const dlgQueue = [];
let dlgBusy = false;
/** com o app bloqueado (PIN) ou na tela de problema, nenhum diálogo ou folha abre por cima */
let blocked = () => false;
export const setDialogGuard = fn => { blocked = fn; };
function runDialog(build) {
  if (blocked()) return Promise.resolve(null);
  return new Promise(resolve => { dlgQueue.push({ build, resolve }); pump(); });
}
function pump() {
  if (dlgBusy || !dlgQueue.length) return;
  if (blocked()) { while (dlgQueue.length) dlgQueue.shift().resolve(null); return; }
  dlgBusy = true;
  const { build, resolve } = dlgQueue.shift();
  const d = $('#appDialog');
  const o = build();
  d.className = 'appDialog' + (o.notice ? ' notice' : '') + (o.danger ? ' danger' : '');
  d.innerHTML = `<form method="dialog" novalidate>
    <div class="dialogHead"><div><h3 id="appDialogTitle">${esc(o.title)}</h3>${o.message ? `<p class="dlgMsg">${esc(o.message)}</p>` : ''}</div>
      <button type="button" class="icon closeX" data-x aria-label="Fechar">${icon('close', 20)}</button></div>
    ${o.input ? `<label class="field"><span>${esc(o.input.label || '')}</span><input id="appDialogInput" autocomplete="off" maxlength="${o.input.max || 60}" value="${attr(o.input.value || '')}" ${o.input.type ? `type="${o.input.type}" inputmode="${o.input.inputmode || ''}"` : ''}></label>` : ''}
    <div class="appDialogActions">${o.notice ? '' : `<button type="button" class="btn soft" data-cancel>${esc(o.cancel || 'Cancelar')}</button>`}
      <button class="btn ${o.danger ? 'danger' : 'primary'}" data-ok value="ok">${esc(o.ok || 'OK')}</button></div></form>`;
  let result = null;
  const done = r => { result = r; d.close(); };
  d.querySelector('[data-x]').onclick = () => done(null);
  const c = d.querySelector('[data-cancel]');
  if (c) c.onclick = () => done('cancel');
  d.querySelector('form').onsubmit = e => { e.preventDefault(); done(o.input ? d.querySelector('#appDialogInput').value : 'ok'); };
  d.onclose = () => { dlgBusy = false; resolve(result); setTimeout(pump, 0); };
  d.oncancel = e => { e.preventDefault(); done(null); };
  d.showModal();
  (d.querySelector('#appDialogInput') || d.querySelector('[data-ok]')).focus();
}
export const notice = (title, message) => runDialog(() => ({ title, message, notice: true, ok: 'OK' }));
/** devolve 'ok', 'cancel' (botão secundário) ou null (fechou) */
export const confirmDlg = (title, message, o = {}) => runDialog(() => ({ title, message, ...o }));
export const ask = async (title, message, o = {}) => (await confirmDlg(title, message, o)) === 'ok';
/** pergunta com campo de texto; devolve o texto ou null */
export const promptDlg = (title, message, input, o = {}) => runDialog(() => ({ title, message, input, ok: o.ok || 'Salvar', cancel: o.cancel }));
export const dialogOpen = () => $('#appDialog')?.open || $('#sheet')?.open || $('#picker')?.open;
export function closeDialogs() {
  while (dlgQueue.length) dlgQueue.shift().resolve(null);
  const d = $('#appDialog');
  if (d?.open) d.close();
  closePicker();
  closeSheet();
}

// ------------------------------------------------------------------ folha de edição
let sheetOnClose = null;
/**
 * Abre a folha (celular: de baixo para cima; computador: janela central).
 * o: { title, subtitle, body (HTML), wide, onMount(el), onClose() }
 */
export function openSheet(o) {
  const phantom = blocked(); // bloqueado: monta numa folha solta, que nunca aparece (o código do editor roda sem efeito)
  const d = phantom ? document.createElement('dialog') : $('#sheet');
  if (d.open) { sheetOnClose = null; d.close(); }
  d.className = 'sheet' + (o.wide ? ' wide' : '') + (o.cls ? ' ' + o.cls : '');
  // o.raw: o corpo já traz o próprio cabeçalho (tela cheia do lançamento); o.back: "‹ tela anterior" no topo
  d.innerHTML = o.raw ? o.body : `<div class="sheetInner"><div class="handle" aria-hidden="true"></div>
    ${o.back ? backLink(o.back.label, { id: 'sheetBack' }) : ''}
    <div class="dialogHead"><div><h3 id="sheetTitle">${esc(o.title)}</h3>${o.subtitle ? `<p class="dlgMsg">${esc(o.subtitle)}</p>` : ''}</div>
      <button type="button" class="icon closeX" data-close aria-label="Fechar">${icon('close', 20)}</button></div>
    <div class="sheetBody">${o.body}</div></div>`;
  if (phantom) return d;
  sheetOnClose = o.onClose || null;
  const tryClose = async () => { if (!o.canClose || await o.canClose()) closeSheet(); };
  d.querySelector('[data-close]').onclick = tryClose;
  if (o.back) d.querySelector('#sheetBack').onclick = o.back.onClick;
  d.oncancel = e => { e.preventDefault(); if (!$('#picker')?.open) tryClose(); };
  d.showModal();
  o.onMount?.(d);
  const first = d.querySelector(o.focus || '.sheetBody input:not([type=hidden]):not([type=checkbox]):not([readonly]), .sheetBody select, .sheetBody textarea');
  if (first && (o.focus || window.matchMedia('(min-width: 900px)').matches)) first.focus(); else d.querySelector('[data-close]').focus();
  return d;
}
export function closeSheet() {
  const d = $('#sheet');
  if (!d?.open) return;
  const cb = sheetOnClose; sheetOnClose = null;
  d.close();
  cb?.();
}

// ------------------------------------------------------------------ componentes
export const field = (label, inner, o = {}) => `<label class="field${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''}${o.hidden ? ' hidden' : ''}><span>${esc(label)}</span>${inner}${o.hint ? `<small class="hint">${esc(o.hint)}</small>` : ''}</label>`;
export const input = (name, value = '', o = {}) => `<input name="${name}" value="${attr(value)}"${o.type ? ` type="${o.type}"` : ''}${o.placeholder ? ` placeholder="${attr(o.placeholder)}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}${o.required ? ' required' : ''} autocomplete="off"${o.extra || ''}>`;
export const moneyInput = (name, value = '', placeholder = '0,00') => input(name, value, { inputmode: 'decimal', placeholder, max: 20 });
export const select = (name, options, value) => `<select name="${name}">${options.map(([v, l]) => `<option value="${attr(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
export const check = (name, label, on, o = {}) => `<label class="switchRow"><span><b>${esc(label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span><input type="checkbox" role="switch" name="${name}"${on ? ' checked' : ''}${o.disabled ? ' disabled' : ''}></label>`;
export const btn = (label, o = {}) => `<button type="${o.submit ? 'submit' : 'button'}" class="btn ${o.cls || 'soft'}"${o.act ? ` data-act="${o.act}"` : ''}${o.id ? ` id="${o.id}"` : ''}${o.data ? Object.entries(o.data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('') : ''}${o.label ? ` aria-label="${attr(o.label)}"` : ''}${o.disabled ? ' disabled' : ''}>${o.icon ? icon(o.icon, o.iconSize || 20) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
export const eyebrow = t => `<small class="eyebrow">${esc(t)}</small>`;
export const pageTitle = (id, eyebrowText, title, sub) => `<div class="pageTitle"><small class="eyebrow">${esc(eyebrowText)}</small><h2 id="${id}">${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
export const formData = form => Object.fromEntries([...new FormData(form).entries()]);

/** "Por quê?": botão que mostra/esconde a explicação */
export const why = (text) => `<details class="why"><summary>${icon('help', 16)}<span>Por quê?</span></summary><p>${esc(text)}</p></details>`;

// ------------------------------------------------------------------ componentes do redesign (Android 1.11; REDESIGN-COERENCIA.md)
/** "‹ Meu dinheiro": seta + nome da tela anterior, sem fundo */
export const backLink = (label, o = {}) => `<button type="button" class="backLink"${o.act ? ` data-act="${o.act}"` : ''}${o.id ? ` id="${o.id}"` : ''}${o.data ? Object.entries(o.data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('') : ''} aria-label="Voltar para ${attr(label)}">${icon('chevron-left', 20)}<span>${esc(label)}</span></button>`;

/** 2–3 opções lado a lado (role=radiogroup); [name] fica em data-seg; o valor escolhido tem aria-checked */
export const segmented = (name, options, value, o = {}) => `<div class="segChoice${o.cls ? ' ' + o.cls : ''}" role="radiogroup" data-seg="${attr(name)}"${o.label ? ` aria-label="${attr(o.label)}"` : ''}>${options.map(([v, l]) =>
  `<button type="button" role="radio" data-v="${attr(v)}" aria-checked="${String(v) === String(value)}" tabindex="${String(v) === String(value) ? 0 : -1}">${esc(l)}</button>`).join('')}</div>`;
/** liga os botões de um segmentado; onPick(valor) */
export function bindSegmented(root, name, onPick) {
  const box = root.querySelector(`[data-seg="${CSS.escape(name)}"]`);
  if (!box) return;
  const set = v => box.querySelectorAll('[role=radio]').forEach(b => { const on = b.dataset.v === v; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  box.querySelectorAll('[role=radio]').forEach(b => {
    b.onclick = () => { set(b.dataset.v); onPick(b.dataset.v); };
    b.onkeydown = e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const all = [...box.querySelectorAll('[role=radio]')], i = all.indexOf(b), n = all[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? all.length - 1 : 1)) % all.length];
      n.focus(); n.click();
    };
  });
  return set;
}

/** "Parcelas  − 1 +": número pequeno; [fmt] formata o valor mostrado */
export const stepper = (name, label, value, min, max, fmt = v => String(v)) => `<div class="stepper" data-step="${attr(name)}" data-min="${min}" data-max="${max}" data-value="${value}">
  <span class="stepLabel" id="st-${attr(name)}">${esc(label)}</span>
  <div class="stepBox" role="group" aria-labelledby="st-${attr(name)}"><button type="button" data-d="-1" aria-label="Diminuir ${attr(label.toLowerCase())}"${value <= min ? ' disabled' : ''}>${icon('remove', 22)}</button>
  <output aria-live="polite">${esc(fmt(value))}</output><button type="button" data-d="1" aria-label="Aumentar ${attr(label.toLowerCase())}"${value >= max ? ' disabled' : ''}>${icon('add', 22)}</button></div></div>`;
export function bindStepper(root, name, fmt, onChange) {
  const el = root.querySelector(`[data-step="${CSS.escape(name)}"]`);
  if (!el) return;
  const min = +el.dataset.min, max = +el.dataset.max;
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const v = Math.min(max, Math.max(min, +el.dataset.value + +b.dataset.d));
    el.dataset.value = v;
    el.querySelector('output').textContent = fmt(v);
    el.querySelector('[data-d="-1"]').disabled = v <= min;
    el.querySelector('[data-d="1"]').disabled = v >= max;
    if (b.disabled) el.querySelector(`[data-d="${-b.dataset.d}"]`).focus();
    onChange(v);
  });
}

/** ação destrutiva discreta: texto em vermelho (a confirmação fica com quem trata o clique) */
export const dangerText = (label, o = {}) => `<button type="button" class="dangerText"${o.act ? ` data-act="${o.act}"` : ''}${o.id ? ` id="${o.id}"` : ''}>${esc(label)}</button>`;

/** quadrado arredondado com o ícone na cor do tom: exp (vermelho), inc (verde), goal (âmbar), card (lilás), neutral, accent */
export const toneTile = (ic, tone = 'accent', size = 42) => `<span class="toneTile t-${tone}" style="--ts:${size}px" aria-hidden="true">${icon(ic, Math.round(size * 0.5))}</span>`;

/**
 * Seletor em folha (no lugar do <select> nativo): botão com o valor e um campo escondido [name] (que recebe
 * "change"). options: [[valor, rótulo, ícone?, grupo?]]. A folha tem check na opção escolhida e busca com mais de 7.
 */
export const selectField = (name, label, options, value, o = {}) => {
  const cur = options.find(x => String(x[0]) === String(value)) ?? options[0];
  return `<div class="field selectField${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''}${o.hidden ? ' hidden' : ''}><span id="sf-${attr(name)}">${esc(label)}</span>
    <input type="hidden" name="${attr(name)}" value="${attr(cur?.[0] ?? '')}">
    <button type="button" class="selectBtn" data-select="${attr(name)}" data-title="${attr(o.title || label)}" data-options="${attr(JSON.stringify(options))}" aria-haspopup="dialog" aria-labelledby="sf-${attr(name)} sv-${attr(name)}"${o.disabled ? ' disabled' : ''}>
      <span class="selVal" id="sv-${attr(name)}">${cur?.[2] ? icon(cur[2], 20) : ''}<span>${esc(cur?.[1] ?? '')}</span></span>${icon('expand-more', 20)}</button>${o.hint ? `<small class="hint">${esc(o.hint)}</small>` : ''}</div>`;
};
/** troca as opções de um selectField já desenhado (ex.: categorias ao mudar Receita/Despesa) */
export function setSelectOptions(root, name, options, value) {
  const b = root.querySelector(`[data-select="${CSS.escape(name)}"]`);
  if (!b) return;
  b.dataset.options = JSON.stringify(options);
  const v = options.some(x => String(x[0]) === String(value)) ? value : options[0]?.[0] ?? '';
  setSelectValue(root, name, v, false);
}
export function setSelectValue(root, name, value, fire = true) {
  const b = root.querySelector(`[data-select="${CSS.escape(name)}"]`), inp = root.querySelector(`input[type=hidden][name="${CSS.escape(name)}"]`);
  if (!b || !inp) return;
  const opt = JSON.parse(b.dataset.options).find(x => String(x[0]) === String(value));
  inp.value = opt ? opt[0] : '';
  b.querySelector('.selVal').innerHTML = `${opt?.[2] ? icon(opt[2], 20) : ''}<span>${esc(opt?.[1] ?? '')}</span>`;
  if (fire) inp.dispatchEvent(new Event('change', { bubbles: true }));
}
if (typeof document !== 'undefined') document.addEventListener('click', async e => {
  const b = e.target.closest?.('[data-select]');
  if (!b || b.disabled) return;
  e.preventDefault();
  const root = b.closest('form, dialog, section, body') || document;
  const inp = root.querySelector(`input[type=hidden][name="${CSS.escape(b.dataset.select)}"]`);
  const v = await pickOption({ title: b.dataset.title, options: JSON.parse(b.dataset.options).map(([value, label, ic, group]) => ({ value, label, icon: ic, group })), value: inp?.value });
  if (v != null) setSelectValue(root, b.dataset.select, v);
  b.focus();
});

let pickerDone = null;
/**
 * Folha de opções (por cima de outra folha): título, busca (mais de 7 opções ou o.search), lista com ícone e check.
 * o: { title, options: [{ value, label, icon, group, sub }], value, search, footer: { label, icon, value } }.
 * Devolve o valor escolhido (ou footer.value) ou null.
 */
export function pickOption(o) {
  if (blocked()) return Promise.resolve(null);
  closePicker();
  const d = $('#picker');
  const withSearch = o.search ?? o.options.length > 7;
  d.innerHTML = `<div class="sheetInner"><div class="handle" aria-hidden="true"></div>
    <div class="dialogHead"><div><h3 id="pickerTitle">${esc(o.title)}</h3></div><button type="button" class="icon closeX" data-close aria-label="Fechar">${icon('close', 20)}</button></div>
    ${withSearch ? `<div class="searchField pickSearch">${icon('search', 20)}<input type="search" id="pickQ" placeholder="Buscar" aria-label="Buscar ${attr(o.title.toLowerCase())}" autocomplete="off" maxlength="40"></div>` : ''}
    <div class="pickList" role="listbox" aria-labelledby="pickerTitle"></div>
    ${o.footer ? `<button type="button" class="btn link pickFoot" data-foot>${o.footer.icon ? icon(o.footer.icon, 18) : ''}<span>${esc(o.footer.label)}</span>${icon('chevron-right', 18)}</button>` : ''}</div>`;
  const listEl = d.querySelector('.pickList');
  const fold = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const draw = q => {
    const f = fold(q || '').trim();
    const items = o.options.filter(x => !f || fold(x.label).includes(f));
    let lastGroup = null;
    listEl.innerHTML = items.length ? items.map(x => {
      const head = x.group && x.group !== lastGroup ? `<h4 class="pickGroup">${esc(x.group)}</h4>` : '';
      lastGroup = x.group;
      const on = String(x.value) === String(o.value);
      return `${head}<button type="button" role="option" class="pickRow${on ? ' on' : ''}" aria-selected="${on}" data-v="${attr(x.value)}">${x.icon ? toneTile(x.icon, 'accent', 36) : ''}<span class="meta"><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>${on ? icon('check', 22) : ''}</button>`;
    }).join('') : '<p class="muted center">Nada encontrado</p>';
  };
  draw('');
  return new Promise(resolve => {
    pickerDone = v => { pickerDone = null; d.close(); resolve(v); };
    listEl.onclick = e => { const r = e.target.closest('[data-v]'); if (r) pickerDone(o.options.find(x => String(x.value) === r.dataset.v)?.value ?? r.dataset.v); };
    d.querySelector('[data-close]').onclick = () => pickerDone(null);
    d.querySelector('[data-foot]')?.addEventListener('click', () => pickerDone(o.footer.value));
    d.oncancel = e => { e.preventDefault(); pickerDone?.(null); };
    const q = d.querySelector('#pickQ');
    if (q) q.oninput = () => draw(q.value);
    d.showModal();
    (listEl.querySelector('.pickRow.on') || q || listEl.querySelector('.pickRow'))?.focus();
  });
}
export function closePicker() { if (pickerDone) pickerDone(null); else if ($('#picker')?.open) $('#picker').close(); }
