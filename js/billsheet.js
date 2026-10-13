// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// "Ler fatura ou boleto" (FATURAS.md): escolher o PDF ou colar o código, digitar a senha se o PDF tiver,
// conferir o que foi encontrado e salvar. Nada é lançado sem a pessoa confirmar. Mesmo fluxo do Android.
import { Ops, Money, card, brDate, brMonthLabel } from './core.js';
import { billFromCode, billFromText, isEmptyBill, BillMatch, SOURCE_LABEL } from './bill.js';
import { readPdfText, MAX_BYTES } from './billpdf.js';
import { Categorizer } from './assist.js';
import { icon } from './icons.js';
import { esc, openSheet, closeSheet, notice, field, input, moneyInput, select, check, btn, toast } from './ui.js';
import { ctx, money } from './ctx.js';
import { pickFile } from './editors.js';

const canRemember = () => typeof ctx.store?.setBillPassword === 'function' && !!ctx.store.canRememberBillPasswords;
const note = (text, warn) => `<p class="infoBox${warn ? ' warn' : ''}">${icon(warn ? 'warning' : 'check', 18)}<span>${esc(text)}</span></p>`;
const privacy = () => `<p class="hint billPrivacy">${icon('shield', 16)}<span>Tudo acontece neste aparelho, sem internet. O PDF é lido só na memória e não fica guardado.</span></p>`;

/** o: { cardId } — abre na fatura deste cartão */
export function billImportSheet(o = {}) {
  const st = { cardId: o.cardId && card(ctx.state, o.cardId) ? o.cardId : '', bytes: null, vaultFailed: false };
  chooseStep(st);
}

// ------------------------------------------------------------------ 1. escolher
function chooseStep(st) {
  const s = ctx.state;
  const body = `<form id="billForm" novalidate>
    ${s.cards.length ? field('É a fatura de um cartão?', select('cardId', [['', 'Não (boleto ou conta)'], ...s.cards.map(c => [c.id, c.name])], st.cardId)) : ''}
    <div class="sheetActions single">${btn('Escolher PDF', { act: 'pick', cls: 'primary', icon: 'receipt-long' })}</div>
    ${field('Ou cole o código do boleto ou o Pix copia e cola', `<textarea name="code" rows="2" maxlength="600" autocomplete="off" spellcheck="false"></textarea>`)}
    <div class="sheetActions single">${btn('Ler código', { submit: true })}</div>
    ${privacy()}</form>`;
  const d = openSheet({ title: 'Ler fatura ou boleto', subtitle: 'O valor e o vencimento saem do PDF ou do código. Você confere antes de salvar.', body });
  const f = d.querySelector('#billForm');
  if (f.cardId) f.cardId.onchange = () => { st.cardId = f.cardId.value; st.vaultFailed = false; };
  d.querySelector('[data-act="pick"]').onclick = async () => {
    const file = await pickFile('application/pdf,.pdf');
    if (!file) return;
    if (file.size > MAX_BYTES) return notice('Não foi possível ler', 'O arquivo é grande demais para uma fatura (mais de 25 MB).');
    st.bytes = new Uint8Array(await file.arrayBuffer());
    st.vaultFailed = false;
    openPdf(st, null, false);
  };
  f.onsubmit = e => {
    e.preventDefault();
    const info = billFromCode(f.code.value, ctx.today);
    if (!info) return notice('Código não reconhecido', 'Confira se copiou a linha digitável inteira (47 ou 48 números) ou o Pix copia e cola completo. Um número errado não passa na conferência.');
    resultStep(st, info);
  };
}

function busySheet() {
  openSheet({ title: 'Ler fatura ou boleto', body: `<p class="billBusy" role="status"><span class="spinner" aria-hidden="true"></span>Lendo a fatura…</p>` });
}

async function openPdf(st, password, fromVault) {
  busySheet();
  const r = await readPdfText(st.bytes, password || '');
  if (ctx.locked) return;
  if (r.status === 'text') {
    if (st.cardId && !fromVault && password && canRemember()) {
      try { await ctx.store.setBillPassword(st.cardId, st.remember ? password : null); } catch { /* lembrar é opcional */ }
    }
    st.bytes = null; // o arquivo não fica guardado depois de lido
    return resultStep(st, billFromText(r.text, ctx.today));
  }
  if (r.status === 'needsPassword') {
    const saved = st.cardId && !st.vaultFailed && canRemember() ? await ctx.store.billPassword(st.cardId).catch(() => null) : null;
    if (saved && password == null) return openPdf(st, saved, true);
    st.remember = !!(st.cardId && saved);
    return passwordStep(st, null);
  }
  if (r.status === 'wrongPassword') {
    if (fromVault) { st.vaultFailed = true; st.remember = true; return passwordStep(st, 'A senha lembrada não abriu esta fatura. Digite a senha atual.'); }
    return passwordStep(st, 'Senha incorreta. Confira e tente de novo.');
  }
  if (r.status === 'noText') {
    st.bytes = null;
    await notice('PDF sem texto', 'Esta fatura parece ser uma imagem (escaneada). Digite o valor e o vencimento, ou cole o código do boleto.');
    return resultStep(st, { amount: null, due: null, payee: null, segment: null, dynamicPix: false });
  }
  st.bytes = null;
  chooseStep(st);
  notice('Não foi possível ler', r.message);
}

// ------------------------------------------------------------------ 2. senha
function passwordStep(st, error) {
  const c = card(ctx.state, st.cardId);
  const remember = c && canRemember();
  const body = `<form id="pwForm" novalidate>
    <p>Esta fatura tem senha. Digite para abrir.</p>
    ${field('Senha do PDF', input('pw', '', { type: 'password', max: 64 }), { hint: 'Muitos bancos usam os primeiros dígitos do seu CPF.' })}
    <p class="formError" role="alert"${error ? '' : ' hidden'}>${esc(error || '')}</p>
    ${remember ? check('remember', `Lembrar a senha para ${c.name}`, !!st.remember, { sub: 'Fica cifrada só neste aparelho e não vai para o backup. Para esquecer, desmarque aqui ou use “Esquecer senha” no cartão.' }) : ''}
    <div class="sheetActions">${btn('Voltar', { act: 'back' })}${btn('Abrir', { submit: true, cls: 'primary' })}</div></form>`;
  const d = openSheet({ title: 'Ler fatura ou boleto', body });
  const f = d.querySelector('#pwForm');
  setTimeout(() => f.pw.focus(), 0);
  d.querySelector('[data-act="back"]').onclick = () => { st.bytes = null; chooseStep(st); };
  f.onsubmit = e => {
    e.preventDefault();
    const pw = f.pw.value;
    if (!pw) { const p = f.querySelector('.formError'); p.textContent = 'Digite a senha.'; p.hidden = false; return; }
    st.remember = !!f.remember?.checked;
    openPdf(st, pw, false);
  };
}

// ------------------------------------------------------------------ 3. conferir e salvar
function resultStep(st, info) {
  const s = ctx.state, c = card(s, st.cardId), today = ctx.today;
  const from = (x, what) => x ? `<small class="hint billFrom">${what} do ${esc(SOURCE_LABEL[x.source])}: “${esc(x.excerpt)}”</small>` : '';
  // valor e vencimento do mesmo trecho (o código do boleto): mostra uma vez só, embaixo do vencimento
  const same = info.amount && info.due && info.amount.source === info.due.source && info.amount.excerpt === info.due.excerpt;
  const desc = c ? `Fatura ${c.name}` : info.segment || (info.payee && info.amount?.source === 'pix' ? info.payee : 'Boleto');
  const msg = isEmptyBill(info) && info.dynamicPix ? 'Pix dinâmico: o valor fica no banco de quem cobra e não vem no código. Digite o valor.'
    : isEmptyBill(info) ? 'Não encontrei o valor nem o vencimento. Preencha abaixo.'
    : !info.amount ? 'Não encontrei o valor. Digite abaixo.' : !info.due ? 'Não encontrei o vencimento. Confira a data abaixo.' : '';
  const payeeNote = !c && info.payee && info.amount?.source !== 'pix' ? `<small class="hint billFrom">Boleto emitido pelo banco ${esc(info.payee)} (nem sempre é quem cobra).</small>` : '';
  const cats = s.cats.expense;
  // conta de consumo vai para Moradia; o resto começa em "Outros" (a primeira categoria, Alimentação, quase nunca é boleto)
  const cat0 = info.segment && cats.includes('Moradia') ? 'Moradia' : cats.find(x => x.toLowerCase() === 'outros') || cats[0];
  const body = `<form id="billRes" novalidate>
    ${msg ? note(msg, true) : ''}
    ${field('Descrição', input('desc', desc.slice(0, 200), { max: 200 }))}
    ${field('Valor (R$)', moneyInput('value', info.amount ? Money.input(info.amount.value) : ''))}${same ? '' : from(info.amount, 'Valor')}
    ${field('Vencimento', input('due', info.due?.value || today, { type: 'date', required: true }))}${from(info.due, same ? 'Valor e vencimento' : 'Vencimento')}${payeeNote}
    ${c ? '<div id="cmp" class="billCompare" aria-live="polite"></div><p class="billFrom" id="cardHint"></p><div class="sheetActions" id="cardActs"></div>'
    : `<div id="catHint"></div>${field('Categoria', select('category', cats.map(x => [x, x]), cat0))}
      ${field('Conta', select('accountId', s.accounts.map(a => [a.id, a.name]), s.accounts[0].id))}
      ${check('paid', 'Já paga', false)}
      <p class="billFrom" id="pendHint"></p>
      <div class="sheetActions">${btn('Ler outra', { act: 'again' })}${btn('Salvar como conta a pagar', { submit: true, cls: 'primary', id: 'saveBill' })}</div>`}
    </form>`;
  const d = openSheet({ title: 'Ler fatura ou boleto', subtitle: 'Confira e ajuste antes de salvar.', body });
  const f = d.querySelector('#billRes');

  if (c) {
    const cmp = d.querySelector('#cmp'), acts = d.querySelector('#cardActs');
    const render = () => {
      const due = f.due.value || null, ym = BillMatch.invoiceYm(s, c, due, today), app = BillMatch.appTotal(s, c, ym);
      const bank = Money.parse(f.value.value), diff = bank == null ? null : bank - app, mes = brMonthLabel(ym);
      cmp.innerHTML = `<b>Fatura de ${esc(mes)} · ${esc(c.name)}</b><span>No Finan+: ${money(app)}</span>${bank != null ? `<span>No PDF: ${money(bank)}</span>` : ''}
        <strong class="${diff === 0 ? 'ok' : diff < 0 ? 'bad' : ''}">${diff == null ? 'Informe o valor para comparar.' : diff === 0 ? 'Confere com as compras lançadas.'
          : diff > 0 && app === 0 ? 'Nenhuma compra deste cartão lançada nesta fatura no Finan+.'
          : diff > 0 ? `Faltam ${money(diff)} em compras no Finan+.` : `O Finan+ tem ${money(-diff)} a mais do que o banco. Confira as compras do cartão.`}</strong>`;
      acts.innerHTML = btn('Ler outra', { act: 'again' }) + (diff != null && diff > 0
        ? btn(app === 0 ? 'Lançar a fatura no cartão' : 'Lançar a diferença no cartão', { submit: true, cls: 'primary' })
        : btn('Fechar', { act: 'close', cls: 'primary' }));
      acts.querySelector('[data-act="again"]').onclick = () => chooseStep(st);
      acts.querySelector('[data-act="close"]')?.addEventListener('click', () => closeSheet());
      d.querySelector('#cardHint').textContent = diff > 0 ? `Entra como uma compra na fatura de ${mes}, para o Finan+ bater com o banco.` : '';
      return { ym, app, diff, mes };
    };
    f.value.oninput = render; f.due.onchange = render;
    render();
    f.onsubmit = e => {
      e.preventDefault();
      const { ym, app, diff, mes } = render();
      if (!(diff > 0)) return;
      const cat = s.cats.expense.find(x => x.toLowerCase() === 'outros') || s.cats.expense[0];
      const draft = { kind: 'expense', desc: app === 0 ? (f.desc.value.trim() || `Fatura ${c.name}`) : `Diferença da fatura ${c.name} (${mes})`,
        value: Money.input(diff), category: cat, date: BillMatch.dateInInvoice(c, ym), paid: true, accountId: s.accounts[0].id, cardId: c.id };
      save(Ops.saveTx(ctx.state, null, draft), app === 0 ? 'Fatura lançada no cartão' : 'Diferença lançada no cartão');
    };
    return;
  }

  const hintBox = d.querySelector('#catHint');
  const categorizer = ctx.device?.assistCategory ? new Categorizer(s, 'expense', ctx.dict) : null;
  const hint = () => {
    const g = categorizer && f.desc.value.trim().length >= 2 ? categorizer.suggest(f.desc.value) : null;
    if (!g || g.category === f.category.value) { hintBox.innerHTML = ''; return; }
    hintBox.innerHTML = `<div class="catHint">${icon('auto-awesome', 16)}<div><b>Sugestão: ${esc(g.category)}</b></div>${btn('Usar', { act: 'use-cat', cls: 'primary small' })}</div>`;
    hintBox.querySelector('[data-act="use-cat"]').onclick = () => { f.category.value = g.category; hint(); };
  };
  const pend = () => {
    const paid = f.paid.checked;
    d.querySelector('#saveBill span').textContent = paid ? 'Salvar despesa' : 'Salvar como conta a pagar';
    d.querySelector('#pendHint').textContent = !paid && f.due.value ? `Fica pendente até ${brDate(f.due.value)} e entra nos avisos de vencimento.` : '';
  };
  f.desc.oninput = hint; f.category.onchange = hint; f.paid.onchange = pend; f.due.onchange = pend;
  hint(); pend();
  d.querySelector('[data-act="again"]').onclick = () => chooseStep(st);
  f.onsubmit = e => {
    e.preventDefault();
    const draft = { kind: 'expense', desc: f.desc.value, value: f.value.value, category: f.category.value, date: f.due.value, paid: f.paid.checked, accountId: f.accountId.value };
    save(Ops.saveTx(ctx.state, null, draft), f.paid.checked ? 'Despesa salva' : 'Conta a pagar salva');
  };
}

function save(o, msg) {
  if (!o.ok) return notice(o.title, o.message);
  ctx.replace(o.state);
  closeSheet();
  toast(msg);
}

/** Ajustes do cartão: há senha de fatura lembrada? (para mostrar "Esquecer senha") */
export async function cardHasBillPassword(cardId) {
  if (!canRemember()) return false;
  try { return await ctx.store.hasBillPassword(cardId); } catch { return false; }
}
export async function forgetBillPassword(cardId) {
  if (!canRemember()) return;
  try { await ctx.store.setBillPassword(cardId, null); } catch { /* ignore */ }
}
