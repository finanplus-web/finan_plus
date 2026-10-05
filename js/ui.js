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
export function toast(msg, ms = 2600) {
  const box = $('#toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
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
export const dialogOpen = () => $('#appDialog')?.open || $('#sheet')?.open;
export function closeDialogs() {
  while (dlgQueue.length) dlgQueue.shift().resolve(null);
  const d = $('#appDialog');
  if (d?.open) d.close();
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
  d.className = 'sheet' + (o.wide ? ' wide' : '');
  d.innerHTML = `<div class="sheetInner"><div class="handle" aria-hidden="true"></div>
    <div class="dialogHead"><div><h3 id="sheetTitle">${esc(o.title)}</h3>${o.subtitle ? `<p class="dlgMsg">${esc(o.subtitle)}</p>` : ''}</div>
      <button type="button" class="icon closeX" data-close aria-label="Fechar">${icon('close', 20)}</button></div>
    <div class="sheetBody">${o.body}</div></div>`;
  if (phantom) return d;
  sheetOnClose = o.onClose || null;
  d.querySelector('[data-close]').onclick = () => closeSheet();
  d.oncancel = e => { e.preventDefault(); closeSheet(); };
  d.showModal();
  o.onMount?.(d);
  const first = d.querySelector('.sheetBody input:not([type=hidden]):not([type=checkbox]):not([readonly]), .sheetBody select, .sheetBody textarea');
  if (first && window.matchMedia('(min-width: 900px)').matches) first.focus(); else d.querySelector('[data-close]').focus();
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
