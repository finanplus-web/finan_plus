// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Nova despesa / Nova receita / Editar lançamento (Android 1.11, TxScreen.kt; REDESIGN-COERENCIA.md §5 e LANCAMENTO.md).
// Tela cheia no celular e janela grande no computador: X, título, "Ler boleto", Despesa | Receita (neutro), valor em
// destaque com formatação pt-BR enquanto digita, categorias e data em chips, descrição com sugestões e "Mais opções"
// recolhido com resumo. Salva pelo mesmo Ops.saveTx de antes (nenhum campo novo) e avisa com "Desfazer".
// Reserva para meta e pagamento de fatura continuam nos editores de antes (editors.js).
import { Ops, Money, addDays, brDate, isFlow } from './core.js';
import { Categorizer } from './assist.js';
import { AmountInput, TxForm } from './txform.js';
import { Words } from './words.js';
import { ScreenRules } from './screenrules.js';
import { icon } from './icons.js';
import { esc, attr, openSheet, closeSheet, notice, ask, confirmDlg, toast, why, segmented, bindSegmented, stepper, bindStepper,
  selectField, setSelectValue, dangerText, pickOption, btn } from './ui.js';
import { ctx, catIcon } from './ctx.js';
import { billImportSheet } from './billsheet.js';

/**
 * [kind]: 'expense' | 'income'; [t]: lançamento a editar (receita ou despesa comum); o: { date, category }
 * (data e categoria iniciais de um lançamento novo, ex.: o dia do calendário ou "Nova dívida").
 */
export function txScreen(kind = 'expense', t = null, o = {}) {
  const s = ctx.state, today = ctx.today;
  const choicesOf = k => TxForm.choices(s.cats[k]);
  const recent1 = k => TxForm.recentCategories(s.txs, k, choicesOf(k), 1)[0] ?? '';
  const init = {
    kind: t?.kind ?? kind,
    amount: t ? AmountInput.fromCents(t.value) : '',
    date: t?.date ?? o.date ?? today,
    desc: t?.desc ?? '',
    accountId: t?.accountId ?? s.accounts[0].id,
    cardId: t?.cardId || s.cards[0]?.id || '',
    useCard: !!t?.cardId,
  };
  init.category = t?.category ?? o.category ?? recent1(init.kind);
  init.paid = t ? t.paid : Ops.defaultPaid(init.date, today);
  const st = { ...init, paidTouched: false, reps: 1, repsMode: 'TOTAL', recurring: false, more: false };
  const dirty = () => ['kind', 'amount', 'category', 'date', 'desc', 'paid', 'accountId', 'cardId', 'useCard'].some(k => st[k] !== init[k])
    || (!t && (st.reps !== 1 || st.repsMode !== 'TOTAL' || st.recurring));
  const canClose = async () => !dirty() || await ask('Descartar alterações?', 'O que você digitou neste formulário será perdido.', { ok: 'Descartar', cancel: 'Continuar editando', danger: true });

  const isExp = () => st.kind === 'expense';
  const canCard = () => isExp() && s.cards.length > 0;
  const card = () => st.useCard && canCard();
  const title = () => t ? 'Editar lançamento' : isExp() ? 'Nova despesa' : 'Nova receita';
  const payOptions = () => [
    ...s.accounts.map(a => [`a:${a.id}`, a.name, 'account-balance', canCard() ? 'Contas' : undefined]),
    ...(canCard() ? s.cards.map(c => [`c:${c.id}`, c.name, 'credit-card', 'Cartões']) : []),
  ];
  const payValue = () => card() ? `c:${st.cardId}` : `a:${st.accountId}`;
  const payName = () => card() ? s.cards.find(c => c.id === st.cardId)?.name ?? '' : s.accounts.find(a => a.id === st.accountId)?.name ?? '';

  const body = `<div class="txScreen">
    <header class="txTop">
      <button type="button" class="txClose" data-close aria-label="Fechar">${icon('close', 24)}</button>
      <h2 id="sheetTitle" class="txTitle">${esc(title())}</h2>
      ${t ? '' : `<button type="button" class="txBill" id="txBill">${icon('receipt-long', 18)}<span>Ler boleto</span></button>`}
    </header>
    <form id="txForm" class="txBody" novalidate>
      ${segmented('kind', [['expense', 'Despesa'], ['income', 'Receita']], st.kind, { label: 'Tipo do lançamento', cls: 'txKind' })}
      <label class="amountBox" for="txAmount"><span class="fLabel">Valor</span>
        <span class="amountRow"><span class="cur" aria-hidden="true">R$</span><input id="txAmount" name="amount" inputmode="decimal" autocomplete="off" placeholder="0,00" maxlength="22" value="${attr(st.amount)}" aria-label="Valor em reais" aria-describedby="txAmtErr"></span>
        <small class="amtErr" id="txAmtErr" role="alert"></small></label>
      <h3 class="fLabel" id="txCatLabel">Categoria</h3><div class="chipRow" id="txCats" role="group" aria-labelledby="txCatLabel"></div>
      <h3 class="fLabel" id="txDateLabel">Data</h3><div class="chipRow" id="txDates" role="group" aria-labelledby="txDateLabel"></div>
      <input type="date" id="txDate" class="txDateInput" value="${attr(st.date)}" aria-label="Escolher a data" hidden>
      <label class="fLabel" for="txDesc">Descrição (opcional)</label>
      <input id="txDesc" name="desc" class="txDesc" maxlength="${Ops.TX_DESC_MAX ?? 200}" autocomplete="off" placeholder="Ex.: mercado da semana" value="${attr(st.desc)}">
      <div class="sugRow" id="txSug" role="group" aria-label="Descrições mais usadas"></div>
      <div id="catHint"></div>
      <section class="moreCard glass">
        <button type="button" class="moreHead" id="txMoreBtn" aria-expanded="false" aria-controls="txMore"><span><b>Mais opções</b><small id="txMoreSum"></small></span>${icon('expand-more', 22)}</button>
        <div class="moreBody" id="txMore" hidden>
          <div id="txPayWrap"></div>
          <div id="txPaidWrap"><h4 class="fLabel" id="txPaidLabel"></h4><div id="txPaidSeg"></div></div>
          ${t?.scheduledDate ? `<p class="muted small">Data prevista original: ${brDate(t.scheduledDate)}. Ela será restaurada se o lançamento voltar a ficar pendente.</p>` : ''}
          ${t ? '' : `${stepper('reps', 'Parcelas', 1, 1, 48, v => v === 1 ? 'À vista' : `${v}x`)}
            <div id="txRepsMode" hidden>${segmented('repsMode', [['TOTAL', 'Valor total'], ['EACH', 'Valor de cada parcela']], 'TOTAL', { label: 'O valor informado é' })}</div>
            <label class="switchRow"><span><b id="txRepeatLabel"></b></span><input type="checkbox" role="switch" name="recurring"></label>`}
        </div>
      </section>
      ${t ? `<div class="txDanger">${dangerText('Excluir lançamento', { id: 'txDelete' })}</div>` : ''}
    </form>
    <footer class="txFoot"><button type="submit" form="txForm" class="btn primary txSave" id="txSave"></button></footer>
  </div>`;
  const d = openSheet({ raw: true, cls: 'txSheet', body, canClose, focus: t ? '.txClose' : '#txAmount' });
  const f = d.querySelector('#txForm'), amt = d.querySelector('#txAmount'), descEl = d.querySelector('#txDesc');
  // fechar e Esc perguntam antes de descartar (openSheet liga o [data-close] e o Esc com canClose)

  // ---- categorias em chips: a escolhida, as usadas recentemente e as primeiras, até 4, e "Todas ›"
  const drawCats = () => {
    const all = choicesOf(st.kind), cur = TxForm.displayCategory(st.category);
    const list = [...new Set([cur, ...TxForm.recentCategories(s.txs, st.kind, all, 4), ...all].filter(c => String(c ?? '').trim()))].slice(0, 4);
    d.querySelector('#txCats').innerHTML = list.map(c => `<button type="button" class="fchip${c === cur ? ' on' : ''}" data-cat="${attr(c)}" aria-pressed="${c === cur}">${icon(catIcon(c), 18)}<span>${esc(Words.ordinal(c))}</span></button>`).join('')
      + `<button type="button" class="fchip" id="txAllCats" aria-haspopup="dialog"><span>Todas</span>${icon('chevron-right', 18)}</button>`;
  };
  const drawDates = () => {
    const y = addDays(today, -1), other = st.date !== today && st.date !== y;
    const chip = (id, label, on, ic = '') => `<button type="button" class="fchip${on ? ' on' : ''}" data-date="${id}" aria-pressed="${on}">${ic ? icon(ic, 18) : ''}<span>${esc(label)}</span></button>`;
    d.querySelector('#txDates').innerHTML = chip('today', 'Hoje', st.date === today) + chip('yesterday', 'Ontem', st.date === y)
      + chip('pick', other ? brDate(st.date) : 'Escolher', other, 'calendar-month');
  };
  const drawSug = () => {
    const sug = TxForm.descriptionSuggestions(s.txs, st.kind, 8);
    d.querySelector('#txSug').innerHTML = sug.map(x => `<button type="button" class="sugChip" data-sug="${attr(x)}">${esc(Words.ordinal(x))}</button>`).join('');
  };
  const drawPay = () => {
    d.querySelector('#txPayWrap').innerHTML = selectField('pay', isExp() ? 'Pagar com' : 'Receber em', payOptions(), payValue());
    d.querySelector('#txPaidWrap').hidden = card();
    d.querySelector('#txPaidLabel').textContent = isExp() ? 'Situação da despesa' : 'Situação da receita';
    d.querySelector('#txPaidSeg').innerHTML = segmented('paid', [['1', isExp() ? 'Já paga' : 'Já recebida'], ['0', isExp() ? 'A pagar' : 'A receber']], st.paid ? '1' : '0', { label: 'Situação' });
    bindSegmented(d, 'paid', v => { st.paid = v === '1'; st.paidTouched = true; sync(); });
  };
  const sync = () => {
    const pos = AmountInput.isPositive(st.amount);
    d.querySelector('#txSave').disabled = !pos;
    d.querySelector('#txSave').textContent = isExp() ? 'Salvar despesa' : 'Salvar receita';
    d.querySelector('#txAmtErr').textContent = AmountInput.isZeroTyped(st.amount) ? 'Informe um valor maior que zero.' : '';
    d.querySelector('.amountBox').classList.toggle('inc', !isExp());
    d.querySelector('#sheetTitle').textContent = title();
    const bill = d.querySelector('#txBill');
    if (bill) bill.hidden = !isExp();
    d.querySelector('#txMoreSum').textContent = ScreenRules.moreSummary({ payName: payName(), card: card(), paid: st.paid, income: !isExp(), reps: st.reps });
    const rl = d.querySelector('#txRepeatLabel');
    if (rl) rl.textContent = isExp() ? 'Repetir esta despesa todo mês' : 'Repetir esta receita todo mês';
    const rm = d.querySelector('#txRepsMode');
    if (rm) rm.hidden = st.reps <= 1;
    // a fonte encolhe quando o valor é longo
    amt.style.setProperty('--len', Math.max(4, st.amount.length || 4));
  };

  // ---- assistente: sugestão de categoria pela descrição (como antes)
  const categorizers = {};
  const hint = () => {
    const box = d.querySelector('#catHint');
    const c = ctx.device.assistCategory ? (categorizers[st.kind] ??= new Categorizer(s, st.kind, ctx.dict)) : null;
    const enabled = !t || st.desc !== t.desc;
    const g = c && enabled && st.desc.trim().length >= 2 ? c.suggest(st.desc) : null;
    if (!g || g.category === st.category) { box.innerHTML = ''; return; }
    const src = g.source === 'SAME_DESCRIPTION' ? 'pelo que você já lançou' : g.source === 'LEARNED' ? 'aprendido com seus lançamentos' : 'pelo dicionário';
    box.innerHTML = `<div class="catHint">${icon('auto-awesome', 16)}<div><b>Sugestão: ${esc(g.category)}</b><small>${src}</small>${why(g.why)}</div>${btn('Usar', { cls: 'primary small', id: 'useCat' })}</div>`;
    box.querySelector('#useCat').onclick = () => { st.category = g.category; drawCats(); hint(); };
  };

  // ---- eventos
  bindSegmented(d, 'kind', v => {
    if (v === st.kind) return;
    st.kind = v;
    st.category = TxForm.categoryAfterKindChange(st.category, choicesOf(v)) || recent1(v);
    if (!canCard()) st.useCard = false;
    drawCats(); drawSug(); drawPay(); hint(); sync();
  });
  amt.oninput = () => {
    const before = amt.value, caretFromEnd = before.length - (amt.selectionStart ?? before.length);
    st.amount = AmountInput.format(before);
    if (st.amount !== before) { amt.value = st.amount; const p = Math.max(0, st.amount.length - caretFromEnd); amt.setSelectionRange(p, p); }
    sync();
  };
  d.querySelector('#txCats').onclick = async e => {
    const b = e.target.closest('[data-cat]');
    if (b) { st.category = b.dataset.cat; drawCats(); hint(); return; }
    if (!e.target.closest('#txAllCats')) return;
    const all = [...new Set([...choicesOf(st.kind), TxForm.displayCategory(st.category)].filter(c => String(c ?? '').trim()))];
    const v = await pickOption({ title: 'Escolher categoria', search: true, value: TxForm.displayCategory(st.category),
      options: all.map(c => ({ value: c, label: Words.ordinal(c), icon: catIcon(c) })), footer: { label: 'Gerenciar categorias', icon: 'sell', value: '\u0000manage' } });
    if (v === '\u0000manage') { if (await canClose()) { closeSheet(); ctx.catKind = st.kind; ctx.go('money', { page: 'categorias' }); } return; }
    if (v != null) { st.category = v; drawCats(); hint(); }
    d.querySelector('#txAllCats')?.focus();
  };
  const dateInput = d.querySelector('#txDate');
  const setDate = v => {
    if (!v) return;
    st.date = v;
    if (!t && !st.paidTouched) { st.paid = Ops.defaultPaid(v, today); drawPay(); }
    drawDates(); sync();
  };
  d.querySelector('#txDates').onclick = e => {
    const b = e.target.closest('[data-date]');
    if (!b) return;
    if (b.dataset.date === 'today') { dateInput.hidden = true; setDate(today); }
    else if (b.dataset.date === 'yesterday') { dateInput.hidden = true; setDate(addDays(today, -1)); }
    else { dateInput.hidden = false; dateInput.focus(); try { dateInput.showPicker?.(); } catch { /* só com gesto: o campo fica visível */ } }
  };
  dateInput.onchange = () => setDate(dateInput.value);
  descEl.oninput = () => { st.desc = descEl.value; hint(); };
  d.querySelector('#txSug').onclick = e => { const b = e.target.closest('[data-sug]'); if (b) { st.desc = b.dataset.sug.slice(0, 200); descEl.value = st.desc; hint(); descEl.focus(); } };
  const moreBtn = d.querySelector('#txMoreBtn');
  moreBtn.onclick = () => { st.more = !st.more; d.querySelector('#txMore').hidden = !st.more; moreBtn.setAttribute('aria-expanded', st.more); moreBtn.classList.toggle('open', st.more); };
  f.addEventListener('change', e => {
    if (e.target.name === 'pay') {
      const v = e.target.value;
      if (v.startsWith('c:')) { st.useCard = true; st.cardId = v.slice(2); } else { st.useCard = false; st.accountId = v.slice(2); }
      d.querySelector('#txPaidWrap').hidden = card();
      sync();
    } else if (e.target.name === 'recurring') { st.recurring = e.target.checked; }
  });
  bindStepper(d, 'reps', v => v === 1 ? 'À vista' : `${v}x`, v => { st.reps = v; sync(); });
  bindSegmented(d, 'repsMode', v => { st.repsMode = v; });
  d.querySelector('#txBill')?.addEventListener('click', async () => { if (await canClose()) billImportSheet(); });

  let busy = false;
  f.onsubmit = e => {
    e.preventDefault();
    if (busy || !AmountInput.isPositive(st.amount)) return;
    busy = true; setTimeout(() => { busy = false; }, 300);
    // sem categoria escolhida, salva em "Outros" (ou na primeira do tipo, se não houver "Outros")
    const cats = ctx.state.cats[st.kind];
    const cat = String(st.category ?? '').trim() ? st.category : cats.find(c => c === TxForm.OTHERS) ?? cats[0];
    const draft = { kind: st.kind, desc: st.desc, value: st.amount, category: cat, date: st.date, paid: st.paid, accountId: st.accountId,
      cardId: card() ? st.cardId : '', reps: st.reps, repsMode: st.repsMode, recurring: st.recurring };
    const before = ctx.state;
    const r = Ops.saveTx(before, t?.id ?? null, draft, today);
    if (!r.ok) { notice(r.title, r.message); return; }
    ctx.replace(r.state);
    const after = ctx.state;
    closeSheet();
    toast(isExp() ? 'Despesa salva' : 'Receita salva', 6000, { action: 'Desfazer', onAction: () => {
      if (ctx.state === after) ctx.replace(before); else notice('Não foi possível desfazer', 'Os dados mudaram depois de salvar.');
    } });
  };
  d.querySelector('#txDelete')?.addEventListener('click', async () => {
    if (!await ask('Excluir lançamento', 'Excluir este lançamento?', { ok: 'Excluir', danger: true })) return;
    const later = Ops.laterParcels(ctx.state, t.id);
    const before = ctx.state;
    let withLater = false;
    if (later.length) {
      const r = await confirmDlg('Parcelas', `Excluir também ${later.length === 1 ? 'a parcela seguinte?' : `as ${later.length} parcelas seguintes?`}`, { ok: 'Excluir também', cancel: 'Só esta', danger: true });
      if (r == null) return;
      withLater = r === 'ok';
    }
    ctx.replace(Ops.deleteTx(ctx.state, t.id, withLater));
    const after = ctx.state;
    closeSheet();
    toast('Lançamento excluído', 6000, { action: 'Desfazer', onAction: () => { if (ctx.state === after) ctx.replace(before); } });
  });

  drawCats(); drawDates(); drawSug(); drawPay(); hint(); sync();
  return d;
}

/** reserva para meta e pagamento de fatura não usam esta tela */
export const usesTxScreen = t => !t || (isFlow(t) && !t.cardPayment);
export { setSelectValue };
