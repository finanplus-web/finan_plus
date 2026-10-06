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
