// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Editores (folhas): lançamento, meta, conta, cartão, pagamento de fatura, recorrência e limite;
// relatório em PDF; categorias; PIN; atalhos. Validações e mensagens vêm de Ops (core.js).
import { Ops, Finance, Money, account, card, brDate, brMonthLabel, toJson, BACKUP_VERSION, Csv, parseBackup, BackupError, newState, ymOf, CARD_PAYMENT_CAT } from './core.js';
import { Categorizer } from './assist.js';
import { buildReport, preset, PRESETS, reportFileName } from './report.js';
import { renderPdf } from './pdf.js';
import { hashPin, verifyPin, pinValidFormat } from './store.js';
import { newCode, formatCode, validCode } from './e2e.js';
import { loadCloudConfig, saveCloudConfig, clearCloudConfig, validCloudUrl } from './cloud.js';
import { requestGoogleToken } from './google.js';
import { icon } from './icons.js';
import { esc, attr, openSheet, closeSheet, notice, confirmDlg, ask, promptDlg, field, input, moneyInput, select, check, btn, formData, toast, why } from './ui.js';
import { ctx, money, APP_VERSION } from './ctx.js';

const today = () => ctx.today;
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
const actions = (save, del) => `<div class="sheetActions">${del ? btn(del, { act: 'sheet-delete', cls: 'danger' }) : ''}${btn(save, { submit: true, cls: 'primary' })}</div>`;
const onDelete = (d, fn) => d.querySelector('[data-act="sheet-delete"]')?.addEventListener('click', fn);

// ------------------------------------------------------------------ lançamento
export function txEditor(kind = 'expense', id = null) {
  const s = ctx.state, t = id ? s.txs.find(x => x.id === id) : null;
  if (id && !t) return;
  const isPayment = !!t?.cardPayment;
  let k = t?.kind ?? kind;
  const cats = kk => { const l = [...s.cats[kk]]; if (t && t.kind === kk && !l.includes(t.category)) l.push(t.category); return l; };
  const body = `<form id="txForm" novalidate>
    ${isPayment ? `<p class="infoBox">${icon('credit-card', 18)}<span>Pagamento de fatura: debita a conta e abate da fatura do cartão. Não conta como despesa nova.</span></p>`
    : `<div class="seg" role="tablist" aria-label="Tipo">${[['expense', 'Despesa'], ['income', 'Receita']].map(([v, l]) => `<button type="button" role="tab" data-kind="${v}" class="${k === v ? 'selected' : ''}" aria-selected="${k === v}">${l}</button>`).join('')}</div>`}
    ${field('Descrição', input('desc', t?.desc ?? '', { placeholder: 'Ex.: Mercado', max: 200 }))}
    <div id="catHint"></div>
    ${field('Valor (R$)', moneyInput('value', t ? Money.input(t.value) : ''))}
    ${field('Categoria', select('category', cats(k).map(c => [c, c]), t?.category ?? s.cats[k][0]))}
    <div id="payModeWrap">${field('Forma de pagamento', select('payMode', [['account', 'Conta / dinheiro'], ['card', 'Cartão de crédito']], t?.cardId ? 'card' : 'account'))}</div>
    <div id="cardWrap">${field('Cartão', select('cardId', s.cards.map(c => [c.id, c.name]), t?.cardId || s.cards[0]?.id || ''))}</div>
    <div id="accWrap">${field(isPayment ? 'Pago com a conta' : 'Conta', select('accountId', s.accounts.map(a => [a.id, a.name]), t?.accountId ?? s.accounts[0].id))}</div>
    ${field('Data', input('date', t?.date ?? today(), { type: 'date', required: true }))}
    <div id="paidWrap">${check('paid', '', t ? t.paid : true)}</div>
    ${t ? '' : `<div class="row2">${field('Parcelas', input('reps', '1', { inputmode: 'numeric', max: 2 }), { hint: 'Até 60' })}
      <div id="repsModeWrap" hidden>${field('O valor informado é', select('repsMode', [['TOTAL', 'O total da compra (divide entre as parcelas)'], ['EACH', 'O valor de cada parcela']], 'TOTAL'))}</div></div>
      ${check('recurring', 'Repetir mensalmente', false, { sub: 'Cria uma recorrência a partir desta data' })}`}
    ${actions('Salvar lançamento', t ? 'Excluir lançamento' : null)}</form>`;
  const d = openSheet({ title: t ? 'Editar lançamento' : 'Novo lançamento', subtitle: isPayment ? '' : 'Registre uma receita ou despesa', body });
  const f = d.querySelector('#txForm');
  const categorizers = {};
  const sug = () => ctx.device.assistCategory && !isPayment ? (categorizers[k] ??= new Categorizer(s, k, ctx.dict)) : null;
  const sync = () => {
    const canCard = k === 'expense' && s.cards.length > 0 && !isPayment;
    const useCard = canCard && f.payMode.value === 'card';
    d.querySelector('#payModeWrap').hidden = !canCard;
    d.querySelector('#cardWrap').hidden = !useCard;
    d.querySelector('#accWrap').hidden = useCard;
    d.querySelector('#paidWrap').hidden = useCard || isPayment;
    d.querySelector('#paidWrap b').textContent = k === 'income' ? 'Receita já recebida' : 'Despesa já paga';
    const r = d.querySelector('#repsModeWrap');
    if (r) r.hidden = !(parseInt(f.reps.value, 10) > 1);
  };
  const hint = () => {
    const box = d.querySelector('#catHint'), c = sug(), desc = f.desc.value;
    const enabled = !t || desc !== t.desc;
    const g = c && enabled && desc.trim().length >= 2 ? c.suggest(desc) : null;
    if (!g || g.category === f.category.value) { box.innerHTML = ''; return; }
    const src = g.source === 'SAME_DESCRIPTION' ? 'pelo que você já lançou' : g.source === 'LEARNED' ? 'aprendido com seus lançamentos' : 'pelo dicionário';
    box.innerHTML = `<div class="catHint">${icon('auto-awesome', 16)}<div><b>Sugestão: ${esc(g.category)}</b><small>${src}</small>${why(g.why)}</div>${btn('Usar', { act: 'use-cat', data: { cat: g.category }, cls: 'primary small' })}</div>`;
    box.querySelector('[data-act="use-cat"]').onclick = () => { f.category.value = g.category; hint(); };
  };
  d.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    if (b.dataset.kind === k) return;
    k = b.dataset.kind;
    d.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-selected', x === b); });
    const cur = f.category.value;
    f.category.innerHTML = cats(k).map(c => `<option value="${attr(c)}">${esc(c)}</option>`).join('');
    if (cats(k).includes(cur)) f.category.value = cur;
    sync(); hint();
  });
  f.payMode.onchange = sync;
  if (f.reps) f.reps.oninput = () => { f.reps.value = f.reps.value.replace(/\D/g, ''); sync(); };
  f.desc.oninput = hint;
  f.category.onchange = hint;
  sync();
  guard(f, v => {
    const useCard = k === 'expense' && s.cards.length > 0 && !isPayment && v.payMode === 'card';
    const draft = { kind: k, desc: v.desc, value: v.value, category: v.category, date: v.date, paid: !!f.paid.checked, accountId: v.accountId,
      cardId: useCard ? v.cardId : '', reps: parseInt(v.reps || '1', 10) || 1, repsMode: v.repsMode || 'TOTAL', recurring: !!f.recurring?.checked };
    apply(Ops.saveTx(ctx.state, t?.id ?? null, draft), t ? 'Lançamento atualizado' : 'Lançamento salvo');
  });
  onDelete(d, async () => {
    if (!await ask('Excluir lançamento', 'Excluir este lançamento?', { ok: 'Excluir', danger: true })) return;
    const later = Ops.laterParcels(ctx.state, t.id);
    if (!later.length) { ctx.replace(Ops.deleteTx(ctx.state, t.id, false)); closeSheet(); toast('Lançamento excluído'); return; }
    const r = await confirmDlg('Parcelas', `Excluir também as ${later.length} parcela(s) seguinte(s)?`, { ok: 'Excluir também', cancel: 'Só esta', danger: true });
    if (r == null) return;
    ctx.replace(Ops.deleteTx(ctx.state, t.id, r === 'ok')); closeSheet(); toast('Lançamento excluído');
  });
}

// ------------------------------------------------------------------ meta
export function goalEditor(id = null) {
  const g = id ? ctx.state.goals.find(x => x.id === id) : null;
  const body = `<form id="f" novalidate>
    ${field('Nome', input('name', g?.name ?? '', { max: 60 }))}
    ${field('Valor da meta (R$)', moneyInput('target', g ? Money.input(g.target) : ''))}
    ${g ? field('Guardar ou retirar agora (R$)', moneyInput('move', '', 'Ex.: 100 ou -50')) : ''}
    ${field('Prazo (opcional)', input('deadline', g?.deadline ?? '', { type: 'date' }))}
    ${field('Contribuição mensal planejada (opcional)', moneyInput('monthly', g?.monthly > 0 ? Money.input(g.monthly) : ''))}
    ${actions('Salvar', g ? 'Excluir meta' : null)}</form>`;
  const d = openSheet({ title: g ? 'Editar meta' : 'Nova meta', subtitle: g ? `Guardado até agora: ${money(g.saved)}` : 'Dê um nome e um valor ao seu objetivo.', body });
  guard(d.querySelector('#f'), v => apply(Ops.saveGoal(ctx.state, g?.id ?? null, v.name, v.target, v.move ?? '', v.deadline || null, v.monthly), 'Meta salva'));
  onDelete(d, async () => { if (await ask('Excluir meta', `Excluir a meta “${g.name}”?`, { ok: 'Excluir', danger: true })) { ctx.replace(Ops.deleteGoal(ctx.state, g.id)); closeSheet(); } });
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
    ${actions('Salvar', c ? 'Excluir cartão' : null)}</form>`;
  const d = openSheet({ title: c ? 'Editar cartão' : 'Novo cartão', subtitle: 'Compras feitas após o dia de fechamento entram na fatura seguinte.', body });
  guard(d.querySelector('#f'), v => apply(Ops.saveCard(ctx.state, c?.id ?? null, v.name, v.limit, v.close, v.due), 'Cartão salvo'));
  onDelete(d, async () => {
    const o = Ops.deleteCard(ctx.state, c.id);
    if (!o.ok) return notice(o.title, o.message);
    if (await ask('Excluir cartão', `Excluir o cartão “${c.name}”?`, { ok: 'Excluir', danger: true })) { ctx.replace(o.state); closeSheet(); }
  });
}

// ------------------------------------------------------------------ fatura
export function payInvoiceEditor(cardId) {
  const s = ctx.state, c = card(s, cardId), cur = c && Finance.cardStatus(s, c, today()).current;
  if (!c || !cur) return notice('Fatura', 'Não há fatura em aberto neste cartão.');
  const body = `<form id="f" novalidate>${field('Valor pago (R$)', moneyInput('value', Money.input(cur.open)))}
    ${field('Pago com a conta', select('accountId', s.accounts.map(a => [a.id, a.name]), s.accounts[0].id))}
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
    <div class="row2">${field('Tipo', select('kind', [['expense', 'Despesa'], ['income', 'Receita']], k))}${field('Dia do mês', input('day', String(r?.day ?? 1), { inputmode: 'numeric', max: 2 }))}</div>
    ${field('Categoria', select('category', cats(k).map(c => [c, c]), r?.category ?? s.cats[k][0]))}
    ${field('Conta', select('accountId', s.accounts.map(a => [a.id, a.name]), r?.accountId ?? s.accounts[0].id))}
    <div id="recCard">${s.cards.length ? field('Cartão (opcional)', select('cardId', [['', 'Nenhum (debita da conta)'], ...s.cards.map(c => [c.id, c.name])], r?.cardId ?? '')) : ''}</div>
    ${r ? check('active', 'Ativa', r.active, { sub: 'Pausada não gera novos lançamentos' }) : field('Começa em', input('start', today(), { type: 'date' }))}
    ${actions('Salvar', r ? 'Excluir recorrência' : null)}</form>`;
  const d = openSheet({ title: r ? 'Editar recorrência' : 'Nova recorrência', subtitle: 'Cria um lançamento pendente por mês, a partir da data de início.', body });
  const f = d.querySelector('#f');
  const sync = () => { const w = d.querySelector('#recCard'); if (w) w.hidden = k !== 'expense'; };
  f.kind.onchange = () => { k = f.kind.value; const cur = f.category.value; f.category.innerHTML = cats(k).map(c => `<option value="${attr(c)}">${esc(c)}</option>`).join(''); if (cats(k).includes(cur)) f.category.value = cur; sync(); };
  sync();
  guard(f, v => apply(Ops.saveRecurring(ctx.state, r?.id ?? null, k, v.desc, v.value, v.day, v.category, v.accountId, k === 'expense' ? v.cardId ?? '' : '', r ? !!f.active.checked : true, v.start || null, today()), 'Recorrência salva'));
  onDelete(d, async () => { if (await ask('Excluir recorrência', 'Excluir esta recorrência? Os lançamentos já criados serão mantidos.', { ok: 'Excluir', danger: true })) { ctx.replace(Ops.deleteRecurring(ctx.state, r.id)); closeSheet(); } });
}

// ------------------------------------------------------------------ limite
export function limitEditor(current = null) {
  const s = ctx.state;
  const cats = current != null && !s.cats.expense.includes(current) ? [...s.cats.expense, current] : s.cats.expense; // limite de categoria que não está mais na lista
  const body = `<form id="f" novalidate>${field('Categoria', select('category', cats.map(c => [c, c]), current ?? s.cats.expense[0]))}
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
export async function restoreBackup() {
  const file = await pickFile('application/json,.json');
  if (!file) return;
  let n;
  try {
    if (file.size > 30 * 1024 * 1024) throw new BackupError('Arquivo grande demais');
    n = parseBackup(await file.text());
  } catch (e) {
    return notice('Não foi possível restaurar', 'Arquivo de backup inválido ou danificado. Nada foi alterado.' + (e instanceof BackupError ? `\n(${e.message})` : ''));
  }
  const st = n.state, bad = n.droppedTotal;
  const ok = await ask('Revisar restauração', `Backup com ${st.txs.length} lançamentos, ${st.accounts.length} contas, ${st.cards.length} cartões e ${st.goals.length} metas.`
    + (bad > 0 ? `\n${bad} item(ns) inválido(s) será(ão) ignorado(s).` : '') + '\nSubstituir os dados atuais? O PIN deste aparelho é mantido.', { ok: 'Substituir', danger: true });
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
    <p class="muted small" id="pdfPreview"></p>
    <p class="infoBox warnBox">${icon('warning', 18)}<span>O PDF mostra os valores mesmo com “Ocultar valores” ligado e não é criptografado: guarde em local seguro e cuidado ao compartilhar.</span></p>
    ${actions('Gerar PDF')}</form>`;
  const d = openSheet({ title: 'Relatório em PDF', body });
  const f = d.querySelector('#f');
  const upd = () => {
    const a = f.from.value, b = f.to.value, p = d.querySelector('#pdfPreview');
    d.querySelectorAll('#pdfPresets button').forEach(x => { const [pa, pb] = preset(x.dataset.p, t, first, last); x.setAttribute('aria-pressed', pa === a && pb === b); x.classList.toggle('selected', pa === a && pb === b); });
    if (!a || !b || b < a) { p.textContent = ''; return; }
    const r = buildReport(ctx.state, a, b, t);
    p.textContent = `${r.txs.length} lançamento(s) · receitas ${money(r.income)} · despesas ${money(r.expense)} · saldo ${money(r.balance)}`;
  };
  d.querySelectorAll('#pdfPresets button').forEach(b => b.onclick = () => { [from, to] = preset(b.dataset.p, t, first, last); f.from.value = from; f.to.value = to; upd(); });
  f.from.onchange = f.to.onchange = upd;
  upd();
  guard(f, v => {
    if (!v.from || !v.to) return notice('Período incompleto', 'Escolha as datas inicial e final.');
    if (v.to < v.from) return notice('Período inválido', 'A data final deve ser igual ou posterior à inicial.');
    try {
      const r = buildReport(ctx.state, v.from, v.to, today());
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
  const msg = used > 0 ? `Excluir “${cat}” da lista de categorias? ${used} lançamento(s) antigo(s) continuará(ão) com essa categoria no histórico.` : `Excluir a categoria “${cat}”?`;
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

// ------------------------------------------------------------------ nuvem (Conta e nuvem)
const syncOf = () => ctx.sync;
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

/** URL do serviço e ID do cliente Google (normalmente vêm do nuvem.json publicado com o site). */
export function cloudSetup() {
  const cur = loadCloudConfig();
  const d = openSheet({
    title: 'Serviço da nuvem', subtitle: 'Endereço do Apps Script e ID do cliente Google (veja NUVEM.md).',
    body: `${field('URL do serviço', input('url', cur.url, { placeholder: 'https://script.google.com/macros/s/…/exec', max: 300 }), { hint: 'A URL /exec da implantação do Apps Script.' })}
      ${field('ID do cliente Google', input('cid', cur.clientId, { placeholder: '…apps.googleusercontent.com', max: 200 }), { hint: 'O cliente OAuth criado no Google Cloud para o login.' })}
      <p class="muted small">Normalmente os dois valores ficam no arquivo <b>nuvem.json</b> publicado junto do site. Preencha aqui somente para testar ou usar uma nuvem própria neste aparelho.</p>
      <div class="btnGrid">${btn('Salvar', { id: 'cloudSave', cls: 'primary' })}${btn('Remover configuração', { id: 'cloudClear', cls: 'soft' })}</div>`,
  });
  d.querySelector('#cloudSave').onclick = async () => {
    const url = d.querySelector('[name=url]').value.trim(), clientId = d.querySelector('[name=cid]').value.trim();
    if (!validCloudUrl(url) || !clientId) return notice('Confira os valores', 'A URL precisa começar com https:// (ou http://localhost, para testes) e o ID do cliente não pode ficar vazio.');
    saveCloudConfig({ url, clientId });
    closeSheet();
    await ctx.cloudReload?.();
    toast('Serviço salvo');
  };
  d.querySelector('#cloudClear').onclick = async () => {
    clearCloudConfig();
    closeSheet();
    await ctx.cloudReload?.();
    toast('Configuração removida');
  };
}

/** Entrar com o Google (botão oficial dentro da folha) e, se o serviço for novo, ativá-lo com o SETUP_CODE. */
export function cloudLogin() {
  const sync = syncOf();
  if (!sync) return cloudSetup();
  const d = openSheet({
    title: 'Entrar com o Google', subtitle: 'A conta Google só é usada para autorizar este aparelho a sincronizar.',
    body: `<div class="gbox" id="gbtn"></div>
      <small id="loginMsg" class="pinErr" role="status">Toque no botão do Google para entrar.</small>
      <div id="setupBox" hidden>
        <div class="infoBox">${icon('settings', 18)}<p>O serviço ainda não foi ativado. No editor do Apps Script (script.google.com), rode a função <b>bootstrap</b> uma vez — ou crie a propriedade <b>SETUP_CODE</b> (Propriedades do projeto › Propriedades do script) e digite-a aqui. Quem entrar depois disso precisa ser autorizado em Membros.</p></div>
        ${field('Código de instalação', input('setupCode', '', { placeholder: 'o SETUP_CODE definido no script', max: 60 }))}
        <div class="btnGrid">${btn('Ativar serviço', { id: 'setupGo', cls: 'primary' })}</div>
      </div>`,
  });
  const msg = d.querySelector('#loginMsg'), box = d.querySelector('#setupBox');
  let cred = null;
  const attempt = async (setupCode = '') => {
    msg.textContent = 'Confirmando com a nuvem…';
    const r = await sync.signInWithCredential(cred, { setupCode });
    if (r.ok) {
      closeSheet();
      toast('Conectado à nuvem');
      if (!sync.currentCode()) cloudActivate();
      return;
    }
    if (r.error === 'setup_pending' || r.error === 'setup_bad_code') { box.hidden = false; msg.textContent = r.message; if (r.error === 'setup_bad_code') d.querySelector('[name=setupCode]').focus(); return; }
    msg.textContent = r.error === 'not_member'
      ? 'Esta conta ainda não foi autorizada. Peça para quem administra adicionar o seu e-mail em Ajustes › Conta e nuvem › Membros.'
      : (r.message || 'Não foi possível entrar.');
  };
  requestGoogleToken({ clientId: ctx.cloudCfg?.clientId || '', render: d.querySelector('#gbtn') })
    .then(g => { if (!g) { msg.textContent = 'Entrada não concluída. Toque no botão do Google.'; return; } cred = g; msg.textContent = `Conta: ${g.email}`; return attempt(''); })
    .catch(e => { msg.textContent = e?.message || 'Não foi possível falar com o Google.'; });
  d.querySelector('#setupGo').addEventListener('click', () => { if (!cred) return; attempt(d.querySelector('[name=setupCode]').value.trim()); });
}

/** Ativar a sincronização neste aparelho: primeiro (criar a chave) ou entrando numa nuvem que já existe. */
export function cloudActivate() {
  const sync = syncOf();
  if (!sync?.session) return cloudLogin();
  const d = openSheet({ title: 'Ativar a sincronização', subtitle: 'Ligue este aparelho à sua nuvem.', body: '<div></div>' });
  const body = d.querySelector('.sheetBody');
  let mode = null, genCode = null, stats = null, checking = true;
  sync.serverStats().then(s => { stats = s; checking = false; if (mode === null) render(); });
  const render = () => {
    if (mode === null) {
      body.innerHTML = `
        <p class="muted small">Como este aparelho entra na casa?</p>
        <div class="btnCol">
          <button type="button" class="optCard" id="mCreate">${icon('upload', 22)}<span><b>Este é o primeiro aparelho</b><small>Os dados que já existem aqui passam a valer para todos, cifrados na nuvem.</small></span></button>
          <button type="button" class="optCard" id="mJoin">${icon('download', 22)}<span><b>Já tenho a nuvem em outro aparelho</b><small>Os dados da nuvem chegam aqui; o que existe só aqui também sobe.<br>Você vai precisar do código da casa.</small></span></button>
        </div>
        ${checking ? '<p class="muted small">Verificando a nuvem…</p>' : stats && stats.records > 0 ? `<p class="muted small">A nuvem já tem ${stats.records} registro(s).</p>` : ''}`;
      d.querySelector('#mCreate').onclick = () => { mode = 'create'; render(); };
      d.querySelector('#mJoin').onclick = () => { mode = 'join'; render(); };
      return;
    }
    if (mode === 'create') {
      genCode = genCode || newCode();
      const hasData = stats && stats.records > 0;
      body.innerHTML = `
        ${hasData
          ? `<div class="infoBox">${icon('warning', 18)}<p>Já existem <b>${stats.records}</b> registro(s) na nuvem. Criar uma chave nova torna esses dados antigos ilegíveis (continuam lá, mas sem abrir). Se você já usava esta nuvem, use “Já tenho um código”.</p></div>`
          : `<p class="muted small">A chave da casa é criada agora. Guarde o código num lugar seguro (ex.: gerenciador de senhas): é ele que abre os dados da nuvem, e não há recuperação sem ele.</p>`}
        <label class="field codeField"><span>Código da casa (24 caracteres)</span><input readonly id="newKey" value="${attr(formatCode(genCode))}" spellcheck="false"></label>
        <div class="btnGrid">${btn('Copiar', { id: 'copyKey', cls: 'primary', icon: 'content-copy', iconSize: 18 })}${btn('Gerar outro', { id: 'genKey', icon: 'sync', iconSize: 18 })}</div>
        ${check('keyOk', 'Guardei o código num lugar seguro', false, { sub: 'Sem o código e todos os aparelhos, os dados da nuvem não têm como ser recuperados.' })}
        <div class="btnCol" style="margin-top:10px">
          ${btn('Ativar e enviar deste aparelho', { id: 'actGo', cls: 'primary wide', disabled: true })}
          ${btn('Já tenho um código', { id: 'toJoin', cls: 'soft' })}
          ${btn('Voltar', { id: 'back', cls: 'soft' })}
        </div>
        <small id="actMsg" class="pinErr" role="alert"></small>`;
      const chk = d.querySelector('[name=keyOk]');
      chk.onchange = () => { d.querySelector('#actGo').disabled = !chk.checked; };
      d.querySelector('#copyKey').onclick = async () => { const ok = await copyText(formatCode(genCode)); toast(ok ? 'Código copiado' : 'Selecione o campo e copie'); };
      d.querySelector('#genKey').onclick = () => { genCode = newCode(); render(); };
      d.querySelector('#toJoin').onclick = () => { mode = 'join'; render(); };
      d.querySelector('#back').onclick = () => { mode = null; render(); };
      d.querySelector('#actGo').onclick = async () => {
        const msg = d.querySelector('#actMsg');
        msg.textContent = 'Ativando e enviando os dados…';
        const r = await sync.activate({ mode: 'create', code: genCode });
        if (!r.ok) { msg.textContent = r.message || 'Não foi possível ativar. Tente de novo.'; return; }
        closeSheet(); toast('Sincronização ativada');
        if (r.failures) notice('Nuvem', `${r.failures} registro(s) antigos da nuvem não puderam ser abertos com a chave nova e continuam lá sem uso.`);
      };
      return;
    }
    body.innerHTML = `
      <p class="muted small">Digite o <b>código da casa</b> do outro aparelho (Ajustes › Conta e nuvem › Código da casa). São 24 caracteres; pode colar.</p>
      ${field('Código da casa', input('joinCode', '', { placeholder: 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX', max: 40 }))}
      ${check('joinOk', 'Entendi: os dados da nuvem passam a valer neste aparelho (o que existe só aqui também sobe)', false)}
      <div class="btnCol" style="margin-top:10px">
        ${btn('Ativar e baixar da nuvem', { id: 'actGo2', cls: 'primary wide', disabled: true })}
        ${btn('Voltar', { id: 'back2', cls: 'soft' })}
      </div>
      <small id="actMsg2" class="pinErr" role="alert"></small>`;
    const chk2 = d.querySelector('[name=joinOk]');
    chk2.onchange = () => { d.querySelector('#actGo2').disabled = !chk2.checked; };
    d.querySelector('#back2').onclick = () => { mode = null; render(); };
    d.querySelector('#actGo2').onclick = async () => {
      const msg = d.querySelector('#actMsg2'), raw = d.querySelector('[name=joinCode]').value;
      if (!validCode(raw)) { msg.textContent = 'O código tem 24 caracteres.'; return; }
      msg.textContent = 'Lendo e combinando os dados…';
      const r = await sync.activate({ mode: 'join', code: raw });
      if (!r.ok) { msg.textContent = r.message || 'Não foi possível ativar. Tente de novo.'; return; }
      closeSheet(); toast('Nuvem conectada neste aparelho');
    };
  };
  render();
}

/** Mostrar/copiar o código da casa. */
export function cloudKey() {
  const sync = syncOf();
  const code = sync?.currentCode();
  if (!code) return notice('Nuvem', 'Este aparelho ainda não tem o código da casa. Ative a sincronização primeiro.');
  const d = openSheet({
    title: 'Código da casa', subtitle: 'A chave que abre os dados na nuvem.',
    body: `<label class="field codeField"><span>Código da casa</span><input readonly id="keyIn" value="${attr(formatCode(code))}" spellcheck="false"></label>
      <div class="btnGrid">${btn('Copiar', { id: 'copyKey', cls: 'primary', icon: 'content-copy', iconSize: 18 })}</div>
      <div class="infoBox">${icon('lock', 18)}<p>Guarde num lugar seguro (ex.: gerenciador de senhas). Quem tiver este código <b>e</b> um login autorizado consegue ler os dados; sem ele, nem o Google consegue.</p></div>`,
  });
  d.querySelector('#copyKey').onclick = async () => { const ok = await copyText(formatCode(code)); toast(ok ? 'Código copiado' : 'Selecione o campo e copie'); };
}

/** Membros da casa: listar sempre; adicionar/remover só o administrador. */
export async function cloudMembers() {
  const sync = syncOf();
  if (!sync) return notice('Nuvem', 'Configure o serviço primeiro.');
  const d = openSheet({ title: 'Membros da casa', subtitle: 'Quem pode entrar e sincronizar com esta nuvem.', body: '<p class="muted small">Carregando…</p>' });
  const render = r => {
    const body = d.querySelector('.sheetBody');
    if (!r.ok) { body.innerHTML = `<p class="muted">${esc(r.message || 'Não foi possível carregar os membros.')}</p>`; return; }
    const me = sync.info();
    body.innerHTML = `
      <div class="manageList">${r.members.map(m => `<div class="manageItem"><div><b>${esc(m.email)}</b><small>${m.admin ? 'Administra a casa' : 'Membro'}${m.name ? ' · ' + esc(m.name) : ''}</small></div>
        <div class="manageActions">${(!m.admin && me.isAdmin) ? btn('', { cls: 'icon tiny dangerIc', icon: 'delete', iconSize: 16, label: `Remover ${m.email}`, data: { email: m.email } }) : ''}</div></div>`).join('')}</div>
      ${me.isAdmin
        ? `<form id="addForm" class="filters"><input name="email" type="email" placeholder="e-mail da pessoa" maxlength="120" aria-label="E-mail do novo membro" autocomplete="off">${btn('Adicionar', { submit: true, cls: 'primary' })}</form>
           <p class="muted small">A pessoa entra com essa conta Google em Ajustes › Conta e nuvem › Entrar com o Google. Ela também precisa do código da casa.</p>`
        : '<p class="muted small">Só quem administra pode adicionar ou remover pessoas.</p>'}`;
    const form = body.querySelector('#addForm');
    if (form) form.onsubmit = async e => {
      e.preventDefault();
      const email = form.querySelector('[name=email]').value.trim();
      if (!email) return;
      const res = await sync.memberAdd(email);
      if (!res.ok) return notice('Membros', res.message || 'Não foi possível adicionar.');
      toast('Membro adicionado');
      render(res);
    };
    body.querySelectorAll('[data-email]').forEach(b => b.onclick = async () => {
      if (!await ask('Remover membro', `“${b.dataset.email}” deixa de conseguir sincronizar nesta nuvem. O que já está no aparelho dessa pessoa continua lá.`, { ok: 'Remover', danger: true })) return;
      const res = await sync.memberRemove(b.dataset.email);
      if (!res.ok) return notice('Membros', res.message || 'Não foi possível remover.');
      toast('Membro removido');
      render(res);
    });
  };
  render(await sync.members());
}

/** Sincronizar agora, com recado claro do que aconteceu. */
export async function cloudSyncNow() {
  const sync = syncOf();
  if (!sync) return;
  const r = await sync.syncNow();
  if (r.ok) return toast('Nuvem em dia');
  if (r.error === 'not_ready') return;
  if (r.error === 'offline') return notice('Sem conexão', r.message || 'Confira a internet e tente de novo.');
  if (r.error === 'auth_invalid') return cloudLogin();
  notice('Nuvem', r.message || 'Não foi possível sincronizar.');
}

/** Desconectar este aparelho (os dados daqui ficam; os da nuvem continuam na conta Google). */
export async function cloudDisconnect() {
  const sync = syncOf();
  if (!sync) return;
  if (!await ask('Desconectar da nuvem', 'Este aparelho para de sincronizar e esquece o código da casa e a conta Google. Os dados daqui continuam neste aparelho; os da nuvem continuam na sua conta. Continuar?', { ok: 'Desconectar' })) return;
  await sync.disconnect();
  toast('Desconectado da nuvem');
}

/** Reenviar todos os registros deste aparelho (a versão daqui prevalece). */
export async function cloudResend() {
  const sync = syncOf();
  if (!sync) return;
  if (!await ask('Enviar tudo deste aparelho', 'Todos os registros daqui sobem para a nuvem, prevalecendo sobre as versões de lá. Use quando a nuvem ficou vazia ou fora de sincronia.', { ok: 'Enviar tudo' })) return;
  toast('Enviando…');
  const r = await sync.resendAll();
  if (r.ok) toast(`Enviados ${r.applied} registro(s)`);
  else notice('Nuvem', r.message || 'Não foi possível enviar.');
}

/** Apagar tudo o que está na nuvem (só o administrador). */
export async function cloudWipe() {
  const sync = syncOf();
  if (!sync) return;
  if (!sync.info().isAdmin) return notice('Nuvem', 'Só quem administra a casa pode apagar os dados da nuvem.');
  const t = await promptDlg('Apagar os dados da nuvem', 'Todos os registros da nuvem serão apagados (o código da casa e os membros continuam). Na próxima sincronização, os outros aparelhos ficam vazios também. Digite APAGAR para confirmar.', { label: 'Confirmação', value: '', max: 10 }, { ok: 'Apagar' });
  if (t == null) return;
  if (String(t).trim().toUpperCase() !== 'APAGAR') return notice('Nada foi apagado', 'Para confirmar, digite APAGAR.');
  const r = await sync.wipeCloud();
  if (!r.ok) return notice('Nuvem', r.message || 'Não foi possível apagar.');
  toast('Dados da nuvem apagados');
  if (await ask('Enviar deste aparelho?', 'A nuvem ficou vazia. Enviar agora os dados deste aparelho de volta?', { ok: 'Enviar' })) {
    const rr = await sync.resendAll();
    if (rr.ok) toast(`Enviados ${rr.applied} registro(s)`);
    else notice('Nuvem', rr.message || 'Não foi possível enviar.');
  }
}

// ------------------------------------------------------------------ atalhos e novidades
export const SHORTCUTS = [
  ['Lançamentos', [['N  ·  Ctrl+N', 'Nova despesa'], ['R  ·  Ctrl+Shift+N', 'Nova receita'], ['M  ·  Ctrl+M', 'Nova meta'], ['/  ·  Ctrl+F', 'Buscar lançamentos'], ['K  ·  Ctrl+K', 'Perguntar ao assistente']]],
  ['Navegação', [['1 … 5  ·  Ctrl+1 … 5', 'Início, Lançamentos, Relatórios, Assistente, Ajustes'], ['Ctrl+,', 'Ajustes'], ['Esc', 'Fechar a janela aberta']]],
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
    '1.2.0: Conta e nuvem (opcional): entre com o Google e sincronize entre Windows, Android e outros navegadores, com os dados cifrados numa planilha da sua conta Google. Duas pessoas podem usar ao mesmo tempo; conflitos avisam e nada se perde.',
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
