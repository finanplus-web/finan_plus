// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Editores (folhas): lançamento, meta, conta, cartão, pagamento de fatura, recorrência e limite;
// relatório em PDF; categorias; PIN; atalhos. Validações e mensagens vêm de Ops (core.js).
import { Ops, Finance, Money, account, card, brDate, brMonthLabel, toJson, BACKUP_VERSION, Csv, parseBackup, BackupError, newState, ymOf, CARD_PAYMENT_CAT, isGoal } from './core.js';
import { Categorizer } from './assist.js';
import { buildReport, preset, PRESETS, reportFileName } from './report.js';
import { renderPdf } from './pdf.js';
import { hashPin, verifyPin, pinValidFormat } from './store.js';
import { icon } from './icons.js';
import { esc, attr, openSheet, closeSheet, notice, confirmDlg, ask, promptDlg, field, input, moneyInput, select, check, btn, formData, toast, why, selectField, setSelectOptions, segmented, bindSegmented, dangerText } from './ui.js';
import { ctx, money, APP_VERSION, catIcon } from './ctx.js';
import { billImportSheet, cardHasBillPassword, forgetBillPassword } from './billsheet.js';
import { sharedEditor } from './sharedview.js';
import { BackupCrypto } from './backupcrypto.js';
import { txScreen, usesTxScreen } from './txscreen.js';
import { Words } from './words.js';

const today = () => ctx.today;
const accOpts = s => s.accounts.map(a => [a.id, a.name, 'account-balance']);
const cardOpts = s => s.cards.map(c => [c.id, c.name, 'credit-card']);
const catOpts = list => list.map(c => [c, c, catIcon(c)]);
/** aplica a operação: sucesso fecha a folha; erro mostra a mensagem e mantém o formulário */
function apply(o, msg) {
  if (!o.ok) { notice(o.title, o.message); return false; }
  ctx.replace(o.state);
  closeSheet();
  if (msg) toast(msg);
  return true;
}
/** evita salvar duas vezes com Enter repetido */
function guard(form, fn) {
  let busy = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    try { await fn(formData(form), form); } finally { setTimeout(() => { busy = false; }, 250); }
  });
}
const actions = (save, del) => `<div class="sheetActions">${btn(save, { submit: true, cls: 'primary' })}</div>${del ? `<div class="sheetDanger">${dangerText(del, { act: 'sheet-delete' })}</div>` : ''}`;
const onDelete = (d, fn) => d.querySelector('[data-act="sheet-delete"]')?.addEventListener('click', fn);

// ------------------------------------------------------------------ adicionar (botão +)
/** Despesa, Receita ou Nova recorrência (o + do celular, como no app Android) */
export function addChoiceSheet() {
  const row = (act, data, ic, cls, title, sub) => `<button type="button" class="choiceRow glass" data-choice="${act}"${data ? ` data-kind="${data}"` : ''}>
    <span class="tile ${cls}" aria-hidden="true">${icon(ic, 22)}</span><span class="meta"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${icon('chevron-right', 20)}</button>`;
  const d = openSheet({ title: 'Adicionar movimentação', subtitle: 'Escolha o que deseja registrar.', body: `<div class="choiceList">
    ${row('tx', 'expense', 'arrow-downward', 'out', 'Despesa', 'Dinheiro que saiu')}
    ${row('tx', 'income', 'arrow-upward', 'in', 'Receita', 'Dinheiro que entrou')}
    ${row('recurring', '', 'repeat', '', 'Nova recorrência', 'Configure uma movimentação que se repete')}
    ${row('shared', '', 'group', '', 'Despesa compartilhada', 'Divida uma conta e veja quem já pagou')}</div>` });
  d.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
    if (b.dataset.choice === 'recurring') recurringEditor(); else if (b.dataset.choice === 'shared') sharedEditor(); else txEditor(b.dataset.kind);
  });
}

// ------------------------------------------------------------------ lançamento
/** [date]: data inicial de um lançamento novo (ex.: o dia escolhido no calendário). Lançamento novo só vem como
 *  realizado se a data for hoje; trocar a data acompanha isso até a pessoa escolher a situação por conta própria. */
export function txEditor(kind = 'expense', id = null, date = null, o = {}) {
  const s = ctx.state, t = id ? s.txs.find(x => x.id === id) : null;
  if (id && !t) return;
  if (t && isGoal(t)) return goalMoveView(t); // reserva para meta: não se edita aqui (o valor muda pela meta)
  // receitas e despesas comuns: a tela de lançamento do Android 1.11 (txscreen.js); pagamento de fatura fica aqui
  if (usesTxScreen(t)) return txScreen(kind, t, { date, category: o.category });
  const isPayment = !!t?.cardPayment;
  let k = t?.kind ?? kind;
  const startDate = t?.date ?? date ?? today();
  let paid = t ? t.paid : Ops.defaultPaid(startDate, today()), touched = false;
  const cats = kk => { const l = [...s.cats[kk]]; if (t && t.kind === kk && !l.includes(t.category)) l.push(t.category); return l; };
  const titleOf = () => isPayment ? 'Pagamento de fatura' : `${t ? 'Editar' : 'Nova'} ${k === 'income' ? 'receita' : 'despesa'}`;
  const subOf = () => isPayment ? '' : k === 'income' ? 'Registre uma entrada de dinheiro' : 'Registre uma saída de dinheiro';
  const body = `<form id="txForm" novalidate>
    ${isPayment ? `<p class="infoBox">${icon('credit-card', 18)}<span>Este pagamento abate o valor da fatura e da conta, sem registrar uma nova despesa.</span></p>`
    : `<div class="seg" role="tablist" aria-label="Tipo">${[['expense', 'Despesa'], ['income', 'Receita']].map(([v, l]) => `<button type="button" role="tab" data-kind="${v}" class="${k === v ? 'selected' : ''}" aria-selected="${k === v}">${l}</button>`).join('')}</div>`}
    ${t ? '' : `<div id="billWrap" class="billShortcut">${btn('Ler fatura ou boleto', { act: 'bill', icon: 'receipt-long' })}</div>`}
    <div class="formCard valueCard">${field(k === 'income' ? 'Valor da receita (R$)' : 'Valor da despesa (R$)', moneyInput('value', t ? Money.input(t.value) : ''), { id: 'valueField' })}</div>
    <div class="formCard">
      <div id="catHint"></div>
      ${selectField('category', 'Categoria', catOpts(cats(k)), t?.category ?? s.cats[k][0])}
      ${field('Data', input('date', startDate, { type: 'date', required: true }))}
      ${field('Descrição (opcional)', input('desc', t?.desc ?? '', { placeholder: k === 'income' ? 'Ex.: Salário' : 'Ex.: Mercado', max: 200 }))}
      <button type="button" class="btn link moreToggle" id="moreBtn" aria-expanded="false" aria-controls="moreBox"><span>Mais opções</span>${icon('expand-more', 18)}</button>
    </div>
    <div id="moreBox" hidden>
      <div class="formCard"><h4 class="formHead">Detalhes adicionais</h4>
        <div id="payModeWrap">${field('Forma de pagamento', select('payMode', [['account', 'Conta / dinheiro'], ['card', 'Cartão de crédito']], t?.cardId ? 'card' : 'account'))}</div>
        <div id="cardWrap">${selectField('cardId', 'Cartão', cardOpts(s), t?.cardId || s.cards[0]?.id || '')}</div>
        <div id="accWrap">${selectField('accountId', isPayment ? 'Pago com a conta' : 'Conta', accOpts(s), t?.accountId ?? s.accounts[0].id)}</div>
        ${t?.scheduledDate ? `<p class="muted small">Data prevista original: ${brDate(t.scheduledDate)}. Ela será restaurada se o lançamento voltar a ficar pendente.</p>` : ''}
      </div>
      <div class="formCard" id="paidWrap" role="radiogroup" aria-labelledby="paidHead"><h4 class="formHead" id="paidHead"></h4>
        <label class="radioRow"><input type="radio" name="paidSel" value="1"><span id="paidYes"></span></label>
        <label class="radioRow"><input type="radio" name="paidSel" value="0"><span id="paidNo"></span></label>
        <small class="muted" id="paidNote"></small></div>
      ${t ? '' : `<div class="formCard"><h4 class="formHead">Parcelamento e repetição</h4>
        <div class="row2">${field('Número de parcelas', input('reps', '1', { inputmode: 'numeric', max: 2 }), { hint: 'Até 60' })}
        <div id="repsModeWrap" hidden>${field('O valor informado é', select('repsMode', [['TOTAL', 'O total da compra (divide entre as parcelas)'], ['EACH', 'O valor de cada parcela']], 'TOTAL'))}</div></div>
        ${check('recurring', 'Repetir mensalmente', false, { sub: 'Cria uma recorrência a partir desta data' })}</div>`}
    </div>
    <div class="sheetActions">${t ? btn('Excluir lançamento', { act: 'sheet-delete', cls: 'danger' }) : ''}${btn('', { submit: true, cls: 'primary', id: 'saveBtn' })}</div></form>`;
  const d = openSheet({ title: titleOf(), subtitle: subOf(), body });
  const f = d.querySelector('#txForm');
  const more = d.querySelector('#moreBox'), moreBtn = d.querySelector('#moreBtn');
  const setMore = open => { more.hidden = !open; moreBtn.setAttribute('aria-expanded', open); moreBtn.querySelector('span').textContent = open ? 'Menos opções' : 'Mais opções'; };
  setMore(!!t); // editar já mostra tudo
  moreBtn.onclick = () => setMore(more.hidden);
  const categorizers = {};
  const sug = () => ctx.device.assistCategory && !isPayment ? (categorizers[k] ??= new Categorizer(s, k, ctx.dict)) : null;
  const sync = () => {
    const canCard = k === 'expense' && s.cards.length > 0 && !isPayment;
    const useCard = canCard && f.payMode.value === 'card';
    d.querySelector('#payModeWrap').hidden = !canCard;
    d.querySelector('#cardWrap').hidden = !useCard;
    d.querySelector('#accWrap').hidden = useCard;
    d.querySelector('#paidWrap').hidden = useCard || isPayment;
    d.querySelector('#accWrap .selectField > span, #accWrap span').textContent = isPayment ? 'Pago com a conta' : k === 'income' ? 'Conta de destino' : 'Conta';
    d.querySelector('#paidHead').textContent = k === 'income' ? 'Situação da receita' : 'Situação da despesa';
    d.querySelector('#paidYes').textContent = k === 'income' ? 'Já recebida' : 'Já paga';
    d.querySelector('#paidNo').textContent = k === 'income' ? 'A receber' : 'A pagar';
    f.querySelector(`input[name=paidSel][value="${paid ? 1 : 0}"]`).checked = true;
    d.querySelector('#paidNote').textContent = paid ? 'O valor será considerado no saldo realizado da conta.' : 'O valor ficará pendente até ser recebido ou pago.';
    d.querySelector('#valueField span').textContent = k === 'income' ? 'Valor da receita (R$)' : 'Valor da despesa (R$)';
    d.querySelector('#saveBtn').innerHTML = `<span>${isPayment ? 'Registrar pagamento' : k === 'income' ? 'Salvar receita' : 'Salvar despesa'}</span>`;
    d.querySelector('#sheetTitle').textContent = titleOf();
    const sub = d.querySelector('.dialogHead .dlgMsg'); if (sub) sub.textContent = subOf();
    f.desc.placeholder = k === 'income' ? 'Ex.: Salário' : 'Ex.: Mercado';
    const r = d.querySelector('#repsModeWrap');
    if (r) r.hidden = !(parseInt(f.reps.value, 10) > 1);
    // atalho: preencher a partir de uma fatura em PDF, linha digitável do boleto ou Pix copia e cola (FATURAS.md)
    const b = d.querySelector('#billWrap');
    if (b) b.hidden = k !== 'expense';
  };
  const hint = () => {
    const box = d.querySelector('#catHint'), c = sug(), desc = f.desc.value;
    const enabled = !t || desc !== t.desc;
    const g = c && enabled && desc.trim().length >= 2 ? c.suggest(desc) : null;
    if (!g || g.category === f.category.value) { box.innerHTML = ''; return; }
    const src = g.source === 'SAME_DESCRIPTION' ? 'pelo que você já lançou' : g.source === 'LEARNED' ? 'aprendido com seus lançamentos' : 'pelo dicionário';
    box.innerHTML = `<div class="catHint">${icon('auto-awesome', 16)}<div><b>Sugestão: ${esc(g.category)}</b><small>${src}</small>${why(g.why)}</div>${btn('Usar', { act: 'use-cat', data: { cat: g.category }, cls: 'primary small' })}</div>`;
    box.querySelector('[data-act="use-cat"]').onclick = () => { setSelectOptions(f, 'category', catOpts(cats(k)), g.category); hint(); };
  };
  d.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    if (b.dataset.kind === k) return;
    k = b.dataset.kind;
    d.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-selected', x === b); });
    setSelectOptions(f, 'category', catOpts(cats(k)), f.category.value);
    sync(); hint();
  });
  f.querySelectorAll('input[name=paidSel]').forEach(i => i.onchange = () => { paid = i.value === '1'; touched = true; sync(); });
  f.date.onchange = () => { if (!t && !touched) { paid = Ops.defaultPaid(f.date.value, today()); sync(); } };
  d.querySelector('[data-act="bill"]')?.addEventListener('click', () => billImportSheet());
  f.payMode.onchange = sync;
  if (f.reps) f.reps.oninput = () => { f.reps.value = f.reps.value.replace(/\D/g, ''); sync(); };
  f.desc.oninput = hint;
  f.category.onchange = hint;
  sync();
  guard(f, v => {
    const useCard = k === 'expense' && s.cards.length > 0 && !isPayment && v.payMode === 'card';
    const draft = { kind: k, desc: v.desc, value: v.value, category: v.category, date: v.date, paid, accountId: v.accountId,
      cardId: useCard ? v.cardId : '', reps: parseInt(v.reps || '1', 10) || 1, repsMode: v.repsMode || 'TOTAL', recurring: !!f.recurring?.checked };
    const label = k === 'income' ? 'Receita' : 'Despesa';
    apply(Ops.saveTx(ctx.state, t?.id ?? null, draft, today()), t ? `${label} atualizada` : `${label} salva`);
  });
  onDelete(d, async () => {
    if (!await ask('Excluir lançamento', 'Excluir este lançamento?', { ok: 'Excluir', danger: true })) return;
    const later = Ops.laterParcels(ctx.state, t.id);
    if (!later.length) { ctx.replace(Ops.deleteTx(ctx.state, t.id, false)); closeSheet(); toast('Lançamento excluído'); return; }
    const r = await confirmDlg('Parcelas', `Excluir também ${later.length === 1 ? 'a parcela seguinte?' : `as ${later.length} parcelas seguintes?`}`, { ok: 'Excluir também', cancel: 'Só esta', danger: true });
    if (r == null) return;
    ctx.replace(Ops.deleteTx(ctx.state, t.id, r === 'ok')); closeSheet(); toast('Lançamento excluído');
  });
}

// ------------------------------------------------------------------ período e filtros da Lista
/** Lançamentos › Lista: datas livres, atalhos e situação (inclui "Realizados"). As mudanças valem na hora. */
export function movesFiltersSheet() {
  const f = ctx.moves;
  const body = `<form id="f" novalidate>
    <div class="row2">${field('De', input('from', f.from || '', { type: 'date' }))}${field('Até', input('to', f.to || '', { type: 'date' }))}</div>
    <div class="presetRow">${btn('Este mês', { act: 'moves-preset', data: { p: 'month' } })}${btn('30 dias', { act: 'moves-preset', data: { p: '30' } })}${btn('Tudo', { act: 'moves-preset', data: { p: 'all' } })}</div>
    <h4 class="fLabel">Situação</h4>${segmented('st', [['', 'Todos'], ['paid', 'Realizados'], ['pending', 'Pendentes']], f.st || '', { label: 'Situação' })}
    <div class="sheetActions">${btn('Pronto', { submit: true, cls: 'primary' })}</div></form>`;
  const d = openSheet({ title: 'Período e filtros', subtitle: 'O período também vale para o Resumo.', body });
  const form = d.querySelector('#f');
  const sync = () => { form.from.value = f.from || ''; form.to.value = f.to || ''; };
  form.from.onchange = () => { f.from = form.from.value || null; f.all = !f.from && !f.to; f.limit = 300; ctx.render(); };
  form.to.onchange = () => { f.to = form.to.value || null; f.all = !f.from && !f.to; f.limit = 300; ctx.render(); };
  bindSegmented(form, 'st', v => { f.st = v; f.limit = 300; ctx.render(); });
  // os atalhos (data-act moves-preset) mudam o período pelo app.js; a folha só acompanha
  d.addEventListener('click', e => { if (e.target.closest('[data-act="moves-preset"]')) setTimeout(sync); });
  form.onsubmit = e => { e.preventDefault(); closeSheet(); };
}

// ------------------------------------------------------------------ meta
/**
 * [pre]: valores iniciais de uma meta nova ({ name, target, monthly }), ex.: vindos do simulador "E se…?".
 * Reserva para meta (METAS.md): ao guardar, com "Tirar da conta" ligado (padrão), o valor sai da conta escolhida
 * num lançamento "Meta › nome", que não conta como despesa; ao retirar, "Devolver para a conta" faz o caminho inverso.
 */
export function goalEditor(id = null, pre = null) {
  const s = ctx.state, g = id ? s.goals.find(x => x.id === id) : null;
  if (id && !g) return;
  // a conta do último depósito nesta meta (ou a primeira)
  let last = null;
  if (g) for (const t of s.txs) if (t.goalId === g.id && t.kind === 'expense' && (!last || t.date > last.date)) last = t;
  const acc0 = last && account(s, last.accountId) ? last.accountId : s.accounts[0].id;
  const body = `<form id="f" novalidate>
    ${field('Nome', input('name', g?.name ?? pre?.name ?? '', { max: 60 }))}
    ${field('Valor da meta (R$)', moneyInput('target', g ? Money.input(g.target) : pre?.target > 0 ? Money.input(pre.target) : ''))}
    ${g ? `${field('Guardar ou retirar agora (R$)', moneyInput('move', '', 'Ex.: 100 ou -50'), { hint: 'Valor negativo retira da meta.' })}
      <div class="formCard goalMoveBox" id="moveBox" hidden>
        <label class="switchRow"><span><b id="fromLabel">Tirar da conta</b><small id="fromSub"></small></span><input type="checkbox" role="switch" name="fromAccount" checked></label>
        <div id="goalAccWrap">${selectField('accountId', 'Conta', accOpts(s), acc0)}</div></div>` : ''}
    ${field('Prazo (opcional)', input('deadline', g?.deadline ?? '', { type: 'date' }))}
    ${field('Contribuição mensal planejada (opcional)', moneyInput('monthly', g?.monthly > 0 ? Money.input(g.monthly) : !g && pre?.monthly > 0 ? Money.input(pre.monthly) : ''))}
    ${actions('Salvar', g ? 'Excluir meta' : null)}</form>`;
  const d = openSheet({ title: g ? 'Editar meta' : 'Nova meta', subtitle: g ? `Guardado até agora: ${money(g.saved)}` : 'Dê um nome e um valor ao seu objetivo.', body });
  const f = d.querySelector('#f');
  const sync = () => {
    if (!g) return;
    const mv = Money.parse(f.move.value), on = f.fromAccount.checked, withdraw = mv != null && mv < 0;
    d.querySelector('#moveBox').hidden = !(mv != null && mv !== 0);
    d.querySelector('#fromLabel').textContent = withdraw ? 'Devolver para a conta' : 'Tirar da conta';
    d.querySelector('#fromSub').textContent = on ? (withdraw ? 'O valor volta para o saldo da conta.' : 'O valor sai do saldo da conta, mas não conta como despesa.')
      : 'Só o valor guardado na meta muda; o saldo da conta continua igual.';
    d.querySelector('#goalAccWrap').hidden = !on;
  };
  if (g) { f.move.oninput = sync; f.fromAccount.onchange = sync; sync(); }
  guard(f, v => {
    const mv = g ? Money.parse(v.move ?? '') : null, moving = mv != null && mv !== 0 && !!f.fromAccount?.checked;
    apply(Ops.saveGoal(ctx.state, g?.id ?? null, v.name, v.target, v.move ?? '', v.deadline || null, v.monthly, !!f.fromAccount?.checked, v.accountId || '', today()),
      moving ? (mv > 0 ? 'Valor guardado na meta' : 'Valor devolvido para a conta') : 'Meta salva');
  });
  onDelete(d, async () => {
    const back = Ops.goalFromAccounts(ctx.state, g.id);
    const msg = back > 0 ? `Excluir a meta “${g.name}”? ${money(back)} que saíram das contas para ela voltam para a conta.` : `Excluir a meta “${g.name}”?`;
    if (!await ask('Excluir meta', msg, { ok: 'Excluir', danger: true })) return;
    const before = ctx.state;
    ctx.replace(Ops.deleteGoal(ctx.state, g.id, today()));
    const after = ctx.state;
    closeSheet();
    toast(back > 0 ? 'Meta excluída · o valor voltou para a conta' : 'Meta excluída', 6000, { action: 'Desfazer', onAction: () => {
      if (ctx.state === after) { ctx.replace(before); toast('Meta restaurada'); } else notice('Não foi possível desfazer', 'Os dados mudaram depois da exclusão.');
    } });
  });
}

/** reserva para meta aberta em Lançamentos: só leitura, com "Abrir a meta" e "Excluir lançamento" */
export function goalMoveView(t) {
  const s = ctx.state, goal = s.goals.find(x => x.id === t.goalId), saved = t.kind === 'expense';
  const body = `<div class="goalView">
    <div class="formCard"><b class="goalViewValue ${saved ? 'goalTxt' : 'green'}">${saved ? '' : '+ '}${money(t.value)}</b>
      <small class="muted">${esc(`${brDate(t.date)} · ${account(s, t.accountId)?.name ?? 'Conta'}`)}</small>
      <p class="muted small">${saved ? 'Este valor saiu do saldo da conta para a meta. Não conta como despesa, nem nos limites ou no assistente.' : 'Este valor voltou da meta para o saldo da conta. Não conta como receita.'}</p></div>
    <p class="muted small">Para mudar o valor, guarde ou retire pela própria meta.</p>
    <div class="sheetActions">${btn('Excluir lançamento', { act: 'sheet-delete', cls: 'danger' })}${goal ? btn('Abrir a meta', { id: 'openGoal', cls: 'primary', icon: 'flag', iconSize: 18 }) : ''}</div></div>`;
  const d = openSheet({ title: saved ? 'Guardado na meta' : 'Retirado da meta', subtitle: goal?.name ?? 'Meta excluída', body });
  d.querySelector('#openGoal')?.addEventListener('click', () => goalEditor(goal.id));
  onDelete(d, async () => {
    const what = !goal ? 'O saldo da conta volta ao que era antes deste lançamento.'
      : saved ? `O valor guardado na meta diminui ${money(t.value)} e volta para o saldo da conta.`
        : `O valor guardado na meta aumenta ${money(t.value)} e sai de novo do saldo da conta.`;
    if (!await ask('Excluir lançamento', what, { ok: 'Excluir', danger: true })) return;
    ctx.replace(Ops.deleteTx(ctx.state, t.id, false)); closeSheet(); toast('Lançamento excluído');
  });
}

// ------------------------------------------------------------------ conta
export function accountEditor(id = null) {
  const s = ctx.state, a = id ? account(s, id) : null;
  const body = `<form id="f" novalidate>${field('Nome', input('name', a?.name ?? '', { max: 40 }))}
    ${field('Saldo inicial (R$)', moneyInput('initial', a ? Money.input(a.initial) : '0,00'))}${actions('Salvar', a && s.accounts.length > 1 ? 'Excluir conta' : null)}</form>`;
  const d = openSheet({ title: a ? 'Editar conta' : 'Nova conta', subtitle: 'O saldo inicial entra no saldo atual.', body });
  guard(d.querySelector('#f'), v => apply(Ops.saveAccount(ctx.state, a?.id ?? null, v.name, v.initial), 'Conta salva'));
  onDelete(d, async () => {
    const o = Ops.deleteAccount(ctx.state, a.id);
    if (!o.ok) return notice(o.title, o.message);
    if (await ask('Excluir conta', `Excluir a conta “${a.name}”?`, { ok: 'Excluir', danger: true })) { ctx.replace(o.state); closeSheet(); }
  });
}

// ------------------------------------------------------------------ cartão
export function cardEditor(id = null) {
  const c = id ? card(ctx.state, id) : null;
  const body = `<form id="f" novalidate>${field('Nome', input('name', c?.name ?? '', { max: 40 }))}
    ${field('Limite (R$)', moneyInput('limit', c ? Money.input(c.limit) : ''))}
    <div class="row2">${field('Fecha dia', input('close', String(c?.close ?? 5), { inputmode: 'numeric', max: 2 }))}${field('Vence dia', input('due', String(c?.due ?? 12), { inputmode: 'numeric', max: 2 }))}</div>
    ${c ? `<div class="billShortcut">${btn('Ler a fatura deste cartão (PDF)', { act: 'bill', icon: 'receipt-long' })}</div>
      <p class="hint billPw" hidden><span>Senha do PDF da fatura lembrada neste aparelho.</span>${btn('Esquecer senha', { act: 'forget-pw', cls: 'danger small' })}</p>` : ''}
    ${actions('Salvar', c ? 'Excluir cartão' : null)}</form>`;
  const d = openSheet({ title: c ? 'Editar cartão' : 'Novo cartão', subtitle: 'Compras feitas após o dia de fechamento entram na fatura seguinte.', body });
  guard(d.querySelector('#f'), v => apply(Ops.saveCard(ctx.state, c?.id ?? null, v.name, v.limit, v.close, v.due), 'Cartão salvo'));
  if (c) {
    d.querySelector('[data-act="bill"]').onclick = () => billImportSheet({ cardId: c.id });
    // senha do PDF da fatura lembrada só neste aparelho (FATURAS.md): dá para esquecer a qualquer momento
    const pwRow = d.querySelector('.billPw');
    cardHasBillPassword(c.id).then(has => { pwRow.hidden = !has; });
    pwRow.querySelector('[data-act="forget-pw"]').onclick = async () => { await forgetBillPassword(c.id); pwRow.hidden = true; toast('Senha esquecida'); };
  }
  onDelete(d, async () => {
    const o = Ops.deleteCard(ctx.state, c.id);
    if (!o.ok) return notice(o.title, o.message);
    if (await ask('Excluir cartão', `Excluir o cartão “${c.name}”?`, { ok: 'Excluir', danger: true })) { ctx.replace(o.state); forgetBillPassword(c.id); closeSheet(); }
  });
}

// ------------------------------------------------------------------ fatura
export function payInvoiceEditor(cardId) {
  const s = ctx.state, c = card(s, cardId), cur = c && Finance.cardStatus(s, c, today()).current;
  if (!c || !cur) return notice('Fatura', 'Não há fatura em aberto neste cartão.');
  const body = `<form id="f" novalidate>${field('Valor pago (R$)', moneyInput('value', Money.input(cur.open)))}
    ${selectField('accountId', 'Pago com a conta', accOpts(s), s.accounts[0].id)}
    ${field('Data do pagamento', input('date', today(), { type: 'date' }))}${actions('Registrar pagamento')}</form>`;
  const d = openSheet({ title: `Pagar fatura · ${c.name}`, subtitle: `Fatura de ${brMonthLabel(cur.ym)} · vence ${brDate(cur.due)} · em aberto ${money(cur.open)}`, body });
  guard(d.querySelector('#f'), v => apply(Ops.payInvoice(ctx.state, c.id, v.value, v.accountId, v.date), 'Pagamento registrado'));
}

// ------------------------------------------------------------------ recorrência
export function recurringEditor(id = null) {
  const s = ctx.state, r = id ? s.recurring.find(x => x.id === id) : null;
  let k = r?.kind ?? 'expense';
  const cats = kk => { const l = [...s.cats[kk]]; if (r && r.kind === kk && !l.includes(r.category)) l.push(r.category); return l; };
  const body = `<form id="f" novalidate>${field('Descrição', input('desc', r?.desc ?? '', { max: 120 }))}
    ${field('Valor (R$)', moneyInput('value', r ? Money.input(r.value) : ''))}
    ${segmented('kind', [['expense', 'Despesa'], ['income', 'Receita']], k, { label: 'Tipo' })}
    ${field('Dia do mês', input('day', String(r?.day ?? 1), { inputmode: 'numeric', max: 2 }))}
    ${selectField('category', 'Categoria', catOpts(cats(k)), r?.category ?? s.cats[k][0])}
    ${selectField('accountId', 'Conta', accOpts(s), r?.accountId ?? s.accounts[0].id)}
    <div id="recCard">${s.cards.length ? selectField('cardId', 'Cartão (opcional)', [['', 'Nenhum (debita da conta)', 'account-balance'], ...cardOpts(s)], r?.cardId ?? '') : ''}</div>
    ${r ? check('active', 'Ativa', r.active, { sub: 'Pausada não gera novos lançamentos' }) : field('Começa em', input('start', today(), { type: 'date' }))}
    ${actions('Salvar', r ? 'Excluir recorrência' : null)}</form>`;
  const d = openSheet({ title: r ? 'Editar recorrência' : 'Nova recorrência', subtitle: 'Cria um lançamento pendente por mês, a partir da data de início.', body });
  const f = d.querySelector('#f');
  const sync = () => { const w = d.querySelector('#recCard'); if (w) w.hidden = k !== 'expense'; };
  bindSegmented(f, 'kind', v => { k = v; setSelectOptions(f, 'category', catOpts(cats(k)), f.category.value); sync(); });
  sync();
  guard(f, v => apply(Ops.saveRecurring(ctx.state, r?.id ?? null, k, v.desc, v.value, v.day, v.category, v.accountId, k === 'expense' ? v.cardId ?? '' : '', r ? !!f.active.checked : true, v.start || null, today()), 'Recorrência salva'));
  onDelete(d, async () => { if (await ask('Excluir recorrência', 'Excluir esta recorrência? Os lançamentos já criados serão mantidos.', { ok: 'Excluir', danger: true })) { ctx.replace(Ops.deleteRecurring(ctx.state, r.id)); closeSheet(); } });
}

// ------------------------------------------------------------------ limite
export function limitEditor(current = null) {
  const s = ctx.state;
  const cats = current != null && !s.cats.expense.includes(current) ? [...s.cats.expense, current] : s.cats.expense; // limite de categoria que não está mais na lista
  const body = `<form id="f" novalidate>${selectField('category', 'Categoria', catOpts(cats), current ?? s.cats.expense[0])}
    ${field('Valor mensal (R$)', moneyInput('value', current != null && s.limits.has(current) ? Money.input(s.limits.get(current)) : ''))}${actions('Salvar', current != null ? 'Excluir limite' : null)}</form>`;
  const d = openSheet({ title: current == null ? 'Novo limite' : 'Editar limite', subtitle: 'Valor máximo mensal da categoria. Despesas pendentes do mês também contam.', body });
  guard(d.querySelector('#f'), v => apply(Ops.saveLimit(ctx.state, current, v.category, v.value), 'Limite salvo'));
  onDelete(d, async () => { if (await ask('Excluir limite', `Excluir o limite de “${current}”?`, { ok: 'Excluir', danger: true })) { ctx.replace(Ops.deleteLimit(ctx.state, current)); closeSheet(); } });
}

// ------------------------------------------------------------------ arquivos
export function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function exportCsv() { download(`lancamentos-${today()}.csv`, Csv.build(ctx.state), 'text/csv;charset=utf-8'); toast('CSV exportado'); }
export function exportBackup() {
  const meta = { app: 'Finan+', version: BACKUP_VERSION, appVersion: `web ${APP_VERSION}`, createdAt: new Date().toISOString() };
  download(`backup-finan-plus-${today()}.json`, toJson(ctx.state, meta), 'application/json');
  toast('Backup salvo');
}
export function pickFile(accept) {
  return new Promise(resolve => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept; i.hidden = true;
    i.onchange = () => { resolve(i.files[0] || null); i.remove(); };
    i.oncancel = () => { resolve(null); i.remove(); };
    document.body.append(i); i.click();
  });
}
/**
 * Lê um arquivo de backup: o JSON comum ou a cópia criptografada do backup automático (pede a senha).
 * Devolve o resultado de parseBackup, null (cancelado) ou lança BackupError.
 */
export async function readBackupFile(file) {
  if (file.size > 30 * 1024 * 1024) throw new BackupError('Arquivo grande demais');
  let text = await file.text();
  if (BackupCrypto.isEncrypted(text)) {
    for (;;) {
      const pw = await promptDlg('Backup criptografado', 'Esta é uma cópia do backup automático. Digite a senha do backup.', { label: 'Senha do backup', type: 'password', max: 128 }, { ok: 'Abrir' });
      if (pw == null) return null;
      try { text = await BackupCrypto.decrypt(text, pw); break; } catch (e) {
        if (/Senha incorreta/.test(e?.message)) { await notice('Senha incorreta', 'A senha não abre esta cópia (ou o arquivo está danificado). Tente de novo.'); continue; }
        throw new BackupError(e?.message || 'Arquivo danificado');
      }
    }
  }
  return parseBackup(text);
}

export async function restoreBackup() {
  const file = await pickFile('application/json,.json');
  if (!file) return;
  let n;
  try {
    n = await readBackupFile(file);
    if (!n) return;
  } catch (e) {
    return notice('Não foi possível restaurar', 'Arquivo de backup inválido ou danificado. Nada foi alterado.' + (e instanceof BackupError ? `\n(${e.message})` : ''));
  }
  const st = n.state, bad = n.droppedTotal;
  const ok = await ask('Revisar restauração', `Backup com ${st.txs.length} lançamentos, ${st.accounts.length} contas, ${st.cards.length} cartões e ${st.goals.length} metas.`
    + (bad > 0 ? `\n${bad === 1 ? '1 item inválido será ignorado.' : `${bad} itens inválidos serão ignorados.`}` : '') + '\nSubstituir os dados atuais? O PIN deste aparelho é mantido.', { ok: 'Substituir', danger: true });
  if (!ok || ctx.locked) return;
  const [g] = Finance.generateRecurring(st, today());
  ctx.replace(g);
  toast('Backup restaurado');
}

// ------------------------------------------------------------------ relatório em PDF
export function pdfDialog() {
  const s = ctx.state, t = today();
  const dates = s.txs.map(x => x.date).sort();
  const first = dates[0] ?? null, last = dates.at(-1) ?? null;
  let [from, to] = ctx.moves.from && ctx.moves.to ? [ctx.moves.from, ctx.moves.to] : preset('mes', t, first, last);
  const body = `<form id="f" novalidate>
    <p class="muted small">Resumo com receitas, despesas e saldo, gráfico por categoria, evolução mensal, maiores despesas, contas, metas e a lista de lançamentos do período.</p>
    <div class="presetRow" id="pdfPresets">${PRESETS.map(([k, l]) => `<button type="button" data-p="${k}">${l}</button>`).join('')}</div>
    <div class="row2">${field('De', input('from', from, { type: 'date' }))}${field('Até', input('to', to, { type: 'date' }))}</div>
    ${check('withTxs', 'Incluir a lista de lançamentos', true, { sub: 'Todos os lançamentos do período, inclusive pendentes' })}
    ${ctx.device.accumulateBalance ? '<p class="muted small">Com “Acumular saldo entre os meses” ligado, o PDF mostra o saldo anterior, o saldo acumulado e a coluna Acumulado.</p>' : ''}
    <p class="muted small" id="pdfPreview"></p>
    <p class="infoBox warnBox">${icon('warning', 18)}<span>O PDF mostra os valores mesmo com “Ocultar valores” ligado e não é criptografado: guarde em local seguro e cuidado ao compartilhar.</span></p>
    ${actions('Gerar PDF')}</form>`;
  const d = openSheet({ title: 'Relatório em PDF', body });
  const f = d.querySelector('#f');
  const upd = () => {
    const a = f.from.value, b = f.to.value, p = d.querySelector('#pdfPreview');
    d.querySelectorAll('#pdfPresets button').forEach(x => { const [pa, pb] = preset(x.dataset.p, t, first, last); x.setAttribute('aria-pressed', pa === a && pb === b); x.classList.toggle('selected', pa === a && pb === b); });
    if (!a || !b || b < a) { p.textContent = ''; return; }
    const r = buildReport(ctx.state, a, b, t, !!ctx.device.accumulateBalance);
    p.textContent = `${Words.count(r.txs.length, 'lançamento', 'lançamentos')} · receitas ${money(r.income)} · despesas ${money(r.expense)} · saldo ${money(r.balance)}` + (r.accumulated != null ? ` · saldo acumulado ${money(r.accumulated)}` : '');
  };
  d.querySelectorAll('#pdfPresets button').forEach(b => b.onclick = () => { [from, to] = preset(b.dataset.p, t, first, last); f.from.value = from; f.to.value = to; upd(); });
  f.from.onchange = f.to.onchange = upd;
  upd();
  guard(f, v => {
    if (!v.from || !v.to) return notice('Período incompleto', 'Escolha as datas inicial e final.');
    if (v.to < v.from) return notice('Período inválido', 'A data final deve ser igual ou posterior à inicial.');
    try {
      const r = buildReport(ctx.state, v.from, v.to, today(), !!ctx.device.accumulateBalance);
      const { bytes } = renderPdf(r, ctx.state, { includeTransactions: !!f.withTxs.checked, appVersion: APP_VERSION });
      download(reportFileName(v.from, v.to), new Blob([bytes], { type: 'application/pdf' }));
      closeSheet();
      notice('PDF gerado', `Relatório de ${brDate(v.from)} a ${brDate(v.to)} salvo na pasta de downloads do navegador.`);
    } catch (e) {
      console.error(e);
      notice('Não foi possível gerar o PDF', 'Tente de novo com outro período.');
    }
  });
}

// ------------------------------------------------------------------ categorias
export async function renameCategory(kind, cat) {
  const n = await promptDlg('Renomear categoria', `Lançamentos, recorrências e limites de “${cat}” passam a usar o novo nome.`, { label: 'Novo nome', value: cat, max: 40 });
  if (n == null) return;
  const o = Ops.renameCategory(ctx.state, kind, cat, n);
  if (!o.ok) return notice(o.title, o.message);
  ctx.replace(o.state);
}
export async function deleteCategory(kind, cat) {
  const chk = Ops.checkDeleteCategory(ctx.state, kind, cat);
  if (!chk.ok) return notice(chk.title, chk.message);
  const used = Ops.categoryUseCount(ctx.state, kind, cat);
  const msg = used > 0 ? `Excluir “${cat}” da lista de categorias? ${used === 1 ? '1 lançamento antigo continuará' : `${used} lançamentos antigos continuarão`} com essa categoria no histórico.` : `Excluir a categoria “${cat}”?`;
  if (await ask('Excluir categoria', msg, { ok: 'Excluir', danger: true })) ctx.replace(Ops.deleteCategory(ctx.state, kind, cat));
}

// ------------------------------------------------------------------ PIN
const pinInput = (label) => ({ label, type: 'password', inputmode: 'numeric', max: 8 });
export async function setPin() {
  const d = ctx.device;
  if (d.pinHash) {
    const cur = await promptDlg('Trocar PIN', 'Digite o PIN atual.', pinInput('PIN atual'), { ok: 'Continuar' });
    if (cur == null) return;
    if (!(await verifyPin(cur, d.pinHash)).ok) return notice('PIN incorreto', 'O PIN não foi alterado.');
  }
  const p1 = await promptDlg('Definir PIN', 'Use de 4 a 8 números.', pinInput('Novo PIN'), { ok: 'Continuar' });
  if (p1 == null) return;
  if (!pinValidFormat(p1)) return notice('PIN inválido', 'Use de 4 a 8 números.');
  const p2 = await promptDlg('Confirmar PIN', 'Digite o PIN de novo.', pinInput('Repita o PIN'), { ok: 'Ativar PIN' });
  if (p2 == null) return;
  if (p1 !== p2) return notice('PIN não definido', 'Os PINs não conferem.');
  try {
    ctx.setDevice({ pinHash: await hashPin(p1), pinFails: 0, pinWaitUntil: 0 });
    notice('PIN ativado', 'O PIN será pedido ao abrir o Finan+. Se esquecer o PIN, só será possível recuperar os dados com um backup.');
  } catch (e) { notice('PIN não definido', e.message); }
}
export async function removePin() {
  const p = await promptDlg('Remover PIN', 'Digite o PIN atual para confirmar.', pinInput('PIN atual'), { ok: 'Remover' });
  if (p == null) return;
  if ((await verifyPin(p, ctx.device.pinHash)).ok) { ctx.setDevice({ pinHash: '' }); ctx.replace({ ...ctx.state, autoLock: 0 }); toast('PIN removido'); }
  else notice('Não foi possível remover', 'PIN incorreto.');
}

// ------------------------------------------------------------------ atalhos e novidades
export const SHORTCUTS = [
  ['Lançamentos', [['N  ·  Ctrl+N', 'Nova despesa'], ['R  ·  Ctrl+Shift+N', 'Nova receita'], ['M  ·  Ctrl+M', 'Nova meta'], ['/  ·  Ctrl+F', 'Buscar lançamentos'], ['K  ·  Ctrl+K', 'Perguntar ao assistente']]],
  ['Navegação', [['1 … 6  ·  Ctrl+1 … 6', 'Início, Lançamentos, Meu dinheiro, Resumo, Assistente, Ajustes'], ['Ctrl+,', 'Ajustes'], ['Esc', 'Fechar a janela aberta']]],
  ['Privacidade e dados', [['H  ·  Ctrl+H', 'Ocultar ou mostrar valores'], ['Ctrl+L', 'Bloquear agora (com PIN)'], ['Ctrl+P', 'Relatório em PDF'], ['Ctrl+E', 'Exportar CSV'], ['Ctrl+S', 'Salvar backup JSON'], ['Ctrl+O', 'Restaurar backup']]],
  ['Geral', [['?  ·  Ctrl+/', 'Atalhos de teclado']]],
];
export function shortcutsDialog() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  const k = s => esc(mac ? s.replace(/Ctrl/g, '⌘') : s);
  openSheet({ title: 'Atalhos de teclado', subtitle: 'As teclas simples funcionam fora dos campos de texto. Numa aba comum do navegador, alguns atalhos com Ctrl são do próprio navegador; no app instalado, todos funcionam. Com uma janela aberta, os atalhos esperam até ela fechar.', wide: true,
    body: `<div class="shortcuts">${SHORTCUTS.map(([g, l]) => `<section><h4 class="subhead">${esc(g)}</h4>${l.map(([a, b]) => `<div class="sc"><span>${esc(b)}</span><kbd>${k(a)}</kbd></div>`).join('')}</section>`).join('')}</div>` });
}
export function whatsNew() {
  const items = [
    'Paridade com o redesign do app Android 1.10 e 1.11: um número, um nome, uma regra (Início, Lançamentos, calendário, Resumo e a barra lateral usam o mesmo cálculo de A receber, A pagar, Reservado para metas e Previsto, com a conta no botão "info"). Início com um aviso só do Assistente e próximos vencimentos agrupados; Resumo com selo do mês, fluxo "Entrou" e "Saiu ou foi para o cartão", até 5 categorias e evolução com o valor de cada mês; nova tela de lançamento (valor em destaque, categorias e data em chips, "Mais opções" recolhido e Desfazer ao salvar); Meu dinheiro com resumo, alerta de meta e páginas próprias (Contas e cartões, Dívidas, Limites, Metas e Categorias, com arrastar para ordenar e arquivar com Desfazer); Ajustes em listas que abrem páginas; seletores em folha, interruptores, stepper e sinal de menos nas reservas para meta, em âmbar.',
    'Paridade com o app Android 1.7 a 1.9: reserva para meta (guardar tira o dinheiro da conta, sem contar como despesa; "Guardado em metas" no Resumo), despesas compartilhadas (divisão igual ou por valor, pagamentos parciais, comprovante em PDF e imagem para compartilhar), "Acumular saldo entre os meses", efeito vidro opcional, apresentação de boas-vindas e backup automático criptografado numa pasta (Chrome e Edge no computador). Restaurar também abre as cópias criptografadas do backup automático do Android.',
    '1.4.0: o mesmo visual e as mesmas regras da versão 1.6.0 do app Android. Nova aba Meu dinheiro (contas, cartões, limites, metas e categorias); Relatórios virou Resumo, com o fluxo do dinheiro; no celular, o botão + abre Despesa, Receita ou Nova recorrência. Formulário mais simples, com descrição opcional e "Mais opções". Lançamento de outro dia começa pendente; ao confirmar, a data real e a prevista ficam guardadas, com Desfazer. Backup com valores exatos (sem perder centavos) e limites de tamanho.',
    '1.3.1: receitas e despesas fixas (recorrências) aparecem nos próximos meses como "Previsto" no calendário, na Lista e no saldo previsto. Clique num previsto para abrir a recorrência. Nada é gravado antes da hora: o lançamento real é criado quando o mês chega.',
    '1.3.0: simulador "E se…?" em Relatórios: economizar por mês, quanto tempo para comprar algo, mudança na renda e antecipar uma dívida, sem mudar seus dados (dá para transformar em meta). Relatórios com o mesmo ‹ mês › de Lançamentos e comparação justa (mês atual contra os mesmos dias do mês anterior).',
    '1.2.1: o assistente não avisa mais que as despesas vão passar das receitas com base em uma ou duas compras: a projeção precisa de pelo menos 5 despesas no mês (3 por categoria com limite), e uma compra grande isolada conta uma vez.',
    '1.2.0: calendário em Lançamentos (saldo de cada dia, faturas no vencimento, atrasos; toque de novo num dia, ou segure, para lançar nessa data). No celular, deslize para o lado para trocar de aba.',
    '1.2.0: Início e Lista mais enxutos: o que falta receber e pagar, assistente em 2 frases, "Comece por aqui", ‹ mês › com Período e filtros, filtros de um toque e lançamentos agrupados por dia.',
    '1.1.2: reativar uma recorrência pausada não cria mais os lançamentos dos meses parados; backups com valores gigantes são recusados.',
    '1.1.1: em Ajustes › Sobre, links para o código-fonte desta versão web e para baixar a versão Linux (.deb). Gráfico do relatório em PDF não trava mais com valores de centavos.',
    'Novo nome: Finan+, com o ícone do app Android.',
    'Layout para computador e notebook: barra lateral com saldo, telas em 2 ou 3 colunas, atalhos de teclado e janelas centrais.',
    'Dados criptografados (AES-256-GCM) com chave não extraível do navegador; os dados antigos são migrados automaticamente.',
    'PIN com hash PBKDF2 e espera crescente após erros; bloqueio automático por inatividade.',
    'Assistente no aparelho: sugestão de categoria, resumo do mês, 7 tipos de dica e perguntas rápidas.',
    'Relatório em PDF com escolha de período, gerado no próprio navegador.',
    'Data completa no Início, cartão de vencimentos dos próximos 30 dias e avisos de vencimento.',
    'Parcelas com valor total ou por parcela, exclusão das parcelas seguintes, recorrências recuperadas e categorias renomeáveis.',
    'Ajustes em cartões que abrem e fecham com + / −; somente ícones Material Symbols.',
    'Backup JSON versão 5, compatível com o app Android e a versão Linux.',
  ];
  openSheet({ title: `Novidades da versão ${APP_VERSION}`, body: `<ul class="reportLines">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul><p class="muted small">Lista completa em CHANGELOG.md e FUNCIONALIDADES.md.</p>` });
}

export { newState, ymOf, CARD_PAYMENT_CAT };
