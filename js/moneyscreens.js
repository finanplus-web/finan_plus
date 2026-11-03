// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Meu dinheiro (Android 1.11; REDESIGN-COERENCIA.md §5 e MEU-DINHEIRO.md): resumo no topo (saldo nas contas, fatura
// aberta em lilás e guardado em metas em âmbar), alerta de meta fora do prazo e cards que abrem páginas próprias
// com "‹ Meu dinheiro": Contas e cartões, Dívidas, Limites mensais, Metas e Categorias. Despesas compartilhadas e
// E se…? abrem as folhas de sempre. Os números vêm de MoneyView, Debts, Finance e Totals; nada de regra nova.
import { Finance, Money, Ops, ymOf, brDate, brMonthLabel, brMonthYear, card as cardOf } from './core.js';
import { MoneyView } from './moneyview.js';
import { Debts } from './debts.js';
import { ScreenRules } from './screenrules.js';
import { TxForm } from './txform.js';
import { Words } from './words.js';
import { icon } from './icons.js';
import { esc, attr, btn, eyebrow, openSheet, closeSheet, notice, toast, promptDlg, toneTile, backLink, segmented, bindSegmented, dangerText } from './ui.js';
import { ctx, money, hidden, catIcon } from './ctx.js';
import { sharedCardSubtitle } from './sharedview.js';
import { txRow, navRow } from './screens.js';

const pct0 = v => String(Math.round(v));
const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const cols2 = (a, b) => ctx.cols === 1 ? a + b : `<div class="cols cols2"><div class="col">${a}</div><div class="col">${b}</div></div>`;
const pageHead = (title, sub = '') => `${backLink('Meu dinheiro', { act: 'page', data: { view: 'money', page: '' } })}
  <div class="pageTitle"><h2 id="moneyTitle" class="pageH" tabindex="-1">${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
const groupHead = (title, action = '') => `<div class="groupHead"><h3>${esc(title)}</h3>${action}</div>`;

export const MONEY_PAGES = ['contas', 'dividas', 'limites', 'metas', 'categorias'];

export function moneyView() {
  const p = ctx.page.money;
  if (p === 'contas') return accountsPage();
  if (p === 'dividas') return debtsPage();
  if (p === 'limites') return limitsPage();
  if (p === 'metas') return goalsPage();
  if (p === 'categorias') return categoriesPage();
  const s = ctx.state, today = ctx.today, o = MoneyView.overview(s, today);
  const head = `<div class="pageTitle"><h2 id="moneyTitle">Meu dinheiro</h2><p>Contas, metas e planos em um só lugar.</p></div>`;
  const summary = `<section class="glass moneySum" aria-label="Resumo">
    <small class="muted">Saldo nas contas</small><b class="moneyBig num${o.inAccounts < 0 ? ' negative' : ''}">${money(o.inAccounts)}</b>
    <div class="moneyTiles">
      <div class="mTile card"><small>Fatura aberta</small><b class="num">${money(o.openInvoices)}</b></div>
      <div class="mTile goal"><small>Guardado em metas</small><b class="num">${money(o.inGoals)}</b></div></div></section>`;
  const a = ScreenRules.goalAlert(s, today, hidden());
  const alert = a ? `<section class="goalAlert" role="note">${icon('warning', 24)}<div><b>${esc(a.title)}</b>${a.text ? `<p>${esc(a.text)}</p>` : ''}
    <button type="button" class="btn link" data-act="edit-goal" data-id="${attr(a.goal.id)}">Ajustar contribuição</button></div></section>` : '';
  const P = (page, ic, title, sub) => navRow({ act: 'page', data: { view: 'money', page }, icon: ic, title, sub });
  const cards = [
    P('contas', 'account-balance', 'Contas e cartões', ScreenRules.accountsCardsSummary(s)),
    P('dividas', 'request-quote', 'Dívidas', ScreenRules.debtsSummary(s, hidden())),
    P('limites', 'speed', 'Limites mensais', ScreenRules.limitsSummary(s, today)),
    P('metas', 'flag', 'Metas', ScreenRules.goalsSummary(s.goals, hidden()) ?? 'Organize objetivos como viagens e reservas'),
    navRow({ act: 'shared-list', icon: 'group', title: 'Despesas compartilhadas', sub: sharedCardSubtitle(s) }),
    navRow({ act: 'simulator', icon: 'science', title: 'E se…?', sub: 'Teste decisões sem mudar seus dados' }),
    P('categorias', 'sell', 'Categorias', `${Words.count(s.cats.expense.length, 'de despesa', 'de despesa')} · ${Words.count(s.cats.income.length, 'de receita', 'de receita')}`),
  ].map(x => x.replace('class="navRow"', 'class="navRow navCard glass"'));
  return head + (ctx.cols === 1 ? summary + alert + cards.join('')
    : `<div class="moneyTop${alert ? ' withAlert' : ''}">${summary}${alert}</div><div class="navGrid">${cards.join('')}</div>`);
}

// ------------------------------------------------------------------ Contas e cartões
function accountsPage() {
  const s = ctx.state, today = ctx.today;
  const accRows = s.accounts.map(a => {
    const bal = Finance.accountBalance(s, a), res = MoneyView.reservedFrom(s, a);
    return navRow({ act: 'edit-account', data: { id: a.id }, icon: 'account-balance', title: a.name,
      sub: res > 0 ? `+ ${money(res)} guardados em metas` : 'Saldo atual', right: `<b class="num rowAmt${bal < 0 ? ' red' : ''}">${money(bal)}</b>` }).replace('class="navRow"', 'class="navRow navCard glass"');
  }).join('');
  const rows = MoneyView.cards(s, today);
  const firstDue = rows.find(r => r.invoice)?.card.id;
  const cardCards = rows.map(r => {
    const c = r.card, suffix = MoneyView.dueSuffix(r.daysToDue);
    const sub = r.invoice ? `Fatura vence em ${dm(r.invoice.due)}${suffix ? ' ' + suffix : ''}` : 'Sem fatura em aberto';
    const band = r.band.toLowerCase();
    return `<article class="ccCard glass">
      <button type="button" class="ccMain" data-act="card-detail" data-id="${attr(c.id)}" aria-label="${attr(`${c.name}, ${sub}${r.invoice ? `, ${money(r.open)}` : ''}. Abrir o cartão`)}">
        <span class="ccTop">${toneTile('credit-card', 'card', 44)}<span class="meta"><b>${esc(c.name)}</b><small class="${r.dueSoon ? 'red' : ''}">${esc(sub)}</small></span>
          ${r.invoice ? `<b class="num ccOpen red">${money(r.open)}</b>` : ''}</span>
        <span class="usage ${band}${hidden() ? ' sensitive' : ''}" role="img" aria-label="${attr(MoneyView.barDescription(r, hidden()))}"><i style="width:${Math.min(100, r.pct)}%"></i></span>
        <span class="usageLine ${band}"><small>${r.band === 'CRITICAL' ? icon('warning', 16) : ''}${esc(hidden() ? 'Uso do limite oculto' : `${r.pct}% do limite · disponível ${Money.format(r.available)}`)}</small><small class="num">de ${money(c.limit)}</small></span>
      </button>
      <div class="ccFoot"><small class="muted">Fecha dia ${c.close} · vence dia ${c.due}</small>
        ${r.invoice ? btn('Pagar fatura', { act: 'pay-invoice', data: { id: c.id }, cls: c.id === firstDue ? 'primary' : 'soft' }) : ''}</div></article>`;
  }).join('');
  const accounts = `<section class="section">${groupHead('Contas', btn('Conta', { act: 'new-account', cls: 'pill', icon: 'add', iconSize: 18, label: 'Adicionar conta' }))}
    <div class="list">${accRows || '<p class="muted small">Adicione uma conta para acompanhar seu saldo.</p>'}</div></section>`;
  const cardsSec = `<section class="section">${groupHead('Cartões', btn('Cartão', { act: 'new-card', cls: 'pill', icon: 'add', iconSize: 18, label: 'Adicionar cartão' }))}
    <div class="list">${cardCards || '<p class="muted small">Adicione um cartão para acompanhar faturas e vencimentos.</p>'}</div></section>`;
  return pageHead('Contas e cartões') + cols2(accounts, cardsSec);
}

/** detalhe do cartão: fatura aberta com pagar, compras desta fatura, histórico de faturas e "Editar cartão" */
export function cardDetailSheet(id) {
  const s = ctx.state, c = cardOf(s, id);
  if (!c) return;
  const r = MoneyView.cardRow(s, c, ctx.today), st = Finance.cardStatus(s, c, ctx.today);
  const inv = r.invoice;
  const buys = inv ? s.txs.filter(t => t.cardId === c.id && t.kind === 'expense' && Finance.invoiceYm(c, t.date) === inv.ym).sort((a, b) => a.date < b.date ? 1 : -1) : [];
  const hist = [...st.invoices].reverse().slice(0, 12).map(i => `<div class="msLine"><span>${esc(brMonthLabel(i.ym))} · vence ${dm(i.due)}</span><b class="num ${i.open > 0 ? 'red' : 'green'}">${i.open > 0 ? esc(`Em aberto: ${money(i.open)}`) : `Paga · ${money(i.total)}`}</b></div>`).join('');
  const body = `<section class="glass cdOpen"><small class="muted">Fatura aberta</small>
      ${inv ? `<b class="num moneyBig red">${money(inv.open)}</b><small class="muted">${esc(`${brMonthLabel(inv.ym)} · vence em ${brDate(inv.due)}`)}</small>
        <div class="sheetActions">${btn('Pagar fatura', { cls: 'primary', id: 'cdPay' })}</div>` : '<p class="muted">Sem fatura em aberto</p>'}</section>
    <h4 class="subhead">Compras desta fatura</h4><div class="list">${buys.length ? buys.map(t => txRow(t)).join('') : '<p class="muted small">Nenhuma compra nesta fatura.</p>'}</div>
    ${hist ? `<h4 class="subhead">Histórico de faturas</h4><section class="glass monthSummary">${hist}</section>` : ''}
    <div class="sheetActions">${btn('Editar cartão', { cls: 'soft', id: 'cdEdit', icon: 'edit', iconSize: 18 })}</div>`;
  openSheet({ title: c.name, subtitle: `Fecha dia ${c.close} · vence dia ${c.due}`, body, onMount: d => {
    d.querySelector('#cdPay')?.addEventListener('click', () => ctx.actions['pay-invoice']({ dataset: { id: c.id } }));
    d.querySelector('#cdEdit').onclick = () => ctx.actions['edit-card']({ dataset: { id: c.id } });
  } });
}

// ------------------------------------------------------------------ Dívidas
function debtsPage() {
  const s = ctx.state, list = Debts.list(s);
  const rows = list.map(d => {
    const paidPct = d.totalCount > 0 ? d.paidCount * 100 / d.totalCount : 0;
    return `<button type="button" class="debtCard glass" data-act="${d.next ? 'edit-tx' : 'open-moves'}" data-id="${attr(d.next?.id ?? '')}" data-q="${attr(d.name)}">
      <span class="ccTop">${toneTile('request-quote', d.done ? 'neutral' : 'exp', 44)}<span class="meta"><b>${esc(Words.ordinal(d.name))}</b>
        <small>${esc(d.done ? 'Quitada' : d.next ? `Próxima parcela: ${money(d.next.value)} em ${dm(d.next.date)}` : '')}</small></span>
        ${d.done ? '' : `<b class="num red">${money(d.pendingTotal)}</b>`}</span>
      <span class="usage${hidden() ? ' sensitive' : ''}" aria-hidden="true"><i style="width:${paidPct}%"></i></span>
      <span class="usageLine"><small>${esc(`${d.paidCount} de ${d.totalCount} parcelas pagas`)}</small>${d.done ? '' : `<small class="num">faltam ${money(d.pendingTotal)}</small>`}</span></button>`;
  }).join('');
  return pageHead('Dívidas', 'Empréstimos e financiamentos em parcelas, montados a partir dos lançamentos da categoria Dívidas.')
    + `<div class="pageTools">${btn('Nova dívida', { act: 'new-tx', data: { kind: 'expense', category: Debts.CATEGORY }, cls: 'primary', icon: 'add', iconSize: 18 })}</div>
    <div class="list narrow">${rows || '<div class="empty glass"><span>Nenhuma dívida por aqui. Ao lançar uma parcela de empréstimo ou financiamento, use a categoria Dívidas.</span></div>'}</div>`;
}

// ------------------------------------------------------------------ Limites mensais
function limitsPage() {
  const s = ctx.state, usage = Finance.budgetUsage(s, ymOf(ctx.today));
  const rows = [...s.limits].map(([cat, lim]) => {
    const u = usage.get(cat) || 0, p = lim > 0 ? u * 100 / lim : 0;
    const cls = u > lim ? 'over' : p >= 80 ? 'warn' : '';
    const status = u > lim ? 'Limite ultrapassado' : p >= 100 ? 'Limite atingido' : hidden() ? (p >= 80 ? 'Atenção: perto do limite' : 'Dentro do limite') : p >= 80 ? `Atenção: ${pct0(p)}% usado` : `${pct0(p)}% usado`;
    return `<button type="button" class="budgetLine glass ${cls}" data-act="edit-limit" data-cat="${attr(cat)}">
      <div>${toneTile(catIcon(cat), 'accent', 36)}<b>${esc(Words.ordinal(cat))}</b><span class="num">${money(u)} / ${money(lim)}</span></div>
      <div class="budgetTrack${hidden() ? ' sensitive' : ''}"><i style="width:${Math.min(100, p)}%"></i></div><small>${status}</small></button>`;
  }).join('');
  return pageHead('Limites mensais', 'Inclui lançamentos pendentes deste mês.')
    + `<div class="pageTools">${btn('Adicionar limite', { act: 'new-limit', cls: 'primary', icon: 'add', iconSize: 18 })}</div>
    <div class="list narrow">${rows || '<div class="empty glass"><span>Defina quanto deseja gastar por categoria para acompanhar seus gastos do mês.</span></div>'}</div>`;
}

// ------------------------------------------------------------------ Metas
function goalsPage() {
  const s = ctx.state, today = ctx.today;
  const rows = s.goals.map(g => {
    const p = g.target > 0 ? Math.min(100, g.saved * 100 / g.target) : 0, plan = Finance.goalPlan(g, today);
    const planTxt = plan.done ? 'Meta atingida' : [
      plan.needed != null ? `Precisa de ${money(plan.needed)}/mês` : null,
      plan.eta != null ? `Conclui em ${brMonthLabel(plan.eta)}${plan.late ? ' (após o prazo)' : ''}` : null,
    ].filter(Boolean).join(' · ');
    return `<button type="button" class="tx goal glass" data-act="edit-goal" data-id="${attr(g.id)}">
      <div class="goalTop">${toneTile('flag', 'goal', 36)}<b>${esc(g.name)}</b><span class="num">${money(g.saved)} / ${money(g.target)}</span></div>
      <div class="bar2 goalBar${hidden() ? ' sensitive' : ''}"><i style="width:${p}%"></i></div>
      <div class="goalInfo"><span>${g.deadline ? `Até ${brDate(g.deadline)}` : 'Sem prazo'}${plan.pastDue ? ' · prazo vencido' : ''}</span><span class="${plan.late || plan.pastDue ? 'red' : ''}">${esc(planTxt)}</span></div></button>`;
  }).join('');
  return pageHead('Metas', 'Toque numa meta para editar, guardar ou retirar.')
    + `<div class="pageTools">${btn('Criar meta', { act: 'new-goal', cls: 'primary', icon: 'add', iconSize: 18 })}</div>
    <div class="list narrow">${rows || '<div class="empty glass"><span>Uma meta ajuda a acompanhar um objetivo, como uma viagem ou uma reserva.</span></div>'}</div>`;
}

// ------------------------------------------------------------------ Categorias
function categoriesPage() {
  const s = ctx.state, kind = ctx.catKind === 'income' ? 'income' : 'expense', list = s.cats[kind];
  const rows = list.map((c, i) => `<li class="catItem" data-i="${i}" data-cat="${attr(c)}">
    <button type="button" class="dragHandle" data-handle="${i}" aria-label="${attr(`Reordenar ${c}. Use as setas para cima e para baixo`)}" aria-describedby="catsHelp">${icon('drag-indicator', 22)}</button>
    <button type="button" class="catName" data-act="cat-edit" data-kind="${kind}" data-cat="${attr(c)}">${toneTile(catIcon(c), 'accent', 40)}<span>${esc(Words.ordinal(c))}</span></button>
    <span class="catActs">
      <button type="button" class="btn icon tiny" data-act="cat-move" data-kind="${kind}" data-i="${i}" data-d="-1" aria-label="${attr(`Mover ${c} para cima`)}"${i === 0 ? ' disabled' : ''}>${icon('arrow-upward', 18)}</button>
      <button type="button" class="btn icon tiny" data-act="cat-move" data-kind="${kind}" data-i="${i}" data-d="1" aria-label="${attr(`Mover ${c} para baixo`)}"${i === list.length - 1 ? ' disabled' : ''}>${icon('arrow-downward', 18)}</button>
      <button type="button" class="btn icon tiny" data-act="cat-archive" data-kind="${kind}" data-cat="${attr(c)}" aria-label="${attr(`Arquivar ${c}`)}">${icon('archive', 18)}</button></span></li>`).join('');
  return pageHead('Categorias', 'Toque para editar, arraste para ordenar.')
    + `<div class="narrow">${segmented('catKind', [['expense', ScreenRules.catsTab('expense', s.cats.expense.length)], ['income', ScreenRules.catsTab('income', s.cats.income.length)]], kind, { label: 'Tipo de categoria' })}
    <ul class="catList glass" id="catList" aria-label="${kind === 'income' ? 'Categorias de receita' : 'Categorias de despesa'}">${rows}</ul>
    <p class="srOnly" id="catsHelp">Arraste pela alça ou use as setas do teclado para mudar a ordem. No celular, deslize a categoria para o lado para arquivar.</p>
    <div class="infoBox">${icon('info', 18)}<p>Cartões e limite especial agora ficam em Contas e cartões. Empréstimos ficam em Dívidas.</p></div>
    ${btn('Nova categoria', { act: 'cat-new', data: { kind }, cls: 'primary wide' })}</div>`;
}

/** liga os gestos da página Categorias: segmentado, arrastar pela alça, setas do teclado e deslizar para arquivar */
export function bindCategories(root) {
  bindSegmented(root, 'catKind', v => { ctx.catKind = v; ctx.render(); });
  const listEl = root.querySelector('#catList');
  if (!listEl) return;
  const kind = ctx.catKind === 'income' ? 'income' : 'expense';
  listEl.querySelectorAll('[data-handle]').forEach(h => {
    h.onkeydown = e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const i = +h.dataset.handle;
      if (moveCategory(kind, i, i + (e.key === 'ArrowUp' ? -1 : 1))) requestAnimationFrame(() => document.querySelector(`[data-handle="${i + (e.key === 'ArrowUp' ? -1 : 1)}"]`)?.focus());
    };
    h.onpointerdown = e => {
      if (e.button > 0) return;
      e.preventDefault();
      const item = h.closest('.catItem'), items = [...listEl.querySelectorAll('.catItem')], from = +h.dataset.handle;
      const rects = items.map(x => x.getBoundingClientRect()), startY = e.clientY;
      let to = from;
      item.classList.add('dragging');
      h.setPointerCapture(e.pointerId);
      const move = ev => {
        const dy = ev.clientY - startY;
        item.style.transform = `translateY(${dy}px)`;
        const y = rects[from].top + rects[from].height / 2 + dy;
        to = rects.findIndex(r => y < r.bottom);
        if (to < 0) to = items.length - 1;
        items.forEach((x, k) => { if (k === from) return; const shift = from < to ? (k > from && k <= to ? -rects[from].height : 0) : (k < from && k >= to ? rects[from].height : 0); x.style.transform = shift ? `translateY(${shift}px)` : ''; });
      };
      const up = () => {
        h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
        items.forEach(x => { x.style.transform = ''; x.classList.remove('dragging'); });
        if (to !== from) moveCategory(kind, from, to);
      };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    };
  });
  // deslizar a linha para o lado (toque): arquiva com Desfazer
  listEl.querySelectorAll('.catName').forEach(b => {
    let sx = null, sy = null, dx = 0;
    b.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; }, { passive: true });
    b.addEventListener('touchmove', e => {
      if (sx == null) return;
      dx = e.touches[0].clientX - sx;
      if (Math.abs(e.touches[0].clientY - sy) > Math.abs(dx)) { sx = null; b.style.transform = ''; return; }
      b.style.transform = `translateX(${Math.min(0, dx)}px)`; b.classList.toggle('swiping', dx < -30);
    }, { passive: true });
    b.addEventListener('touchend', () => {
      b.style.transform = ''; b.classList.remove('swiping');
      if (sx != null && dx < -90) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 400); archiveCategory(kind, b.dataset.cat); }
      sx = null;
    });
  });
}
let suppressClick = false;
export const catClickSuppressed = () => suppressClick;

function moveCategory(kind, from, to) {
  const s = ctx.state, next = ScreenRules.move(s.cats[kind], from, to);
  if (next === s.cats[kind]) return false;
  ctx.replace({ ...s, cats: { ...s.cats, [kind]: next } });
  return true;
}
export function moveCategoryBy(kind, i, d) { if (moveCategory(kind, i, i + d)) requestAnimationFrame(() => document.querySelector(`[data-act="cat-move"][data-i="${i + d}"][data-d="${d}"]`)?.focus() ?? document.querySelector(`[data-handle="${i + d}"]`)?.focus()); }

/** arquivar = a exclusão de sempre (sai da lista de escolha, o histórico fica), com Desfazer */
export function archiveCategory(kind, cat) {
  const chk = Ops.checkDeleteCategory(ctx.state, kind, cat);
  if (!chk.ok) return notice(chk.title, chk.message);
  const before = ctx.state;
  ctx.replace(Ops.deleteCategory(ctx.state, kind, cat));
  const after = ctx.state;
  toast(`Categoria “${cat}” arquivada`, 6000, { action: 'Desfazer', onAction: () => { if (ctx.state === after) ctx.replace(before); else notice('Não foi possível desfazer', 'Os dados mudaram depois de arquivar.'); } });
}

/** tocar numa categoria: renomear (e arquivar, para quem não desliza) */
export function categoryEditSheet(kind, cat) {
  const used = Ops.categoryUseCount(ctx.state, kind, cat);
  openSheet({ title: 'Editar categoria', subtitle: used ? `${Words.count(used, 'lançamento usa', 'lançamentos usam')} esta categoria. Ao renomear, lançamentos, recorrências e limites acompanham.` : 'Ao renomear, recorrências e limites acompanham.',
    body: `<form id="catF" novalidate><label class="field"><span>Nome</span><input name="name" value="${attr(cat)}" maxlength="40" autocomplete="off"></label>
      <div class="sheetActions">${btn('Salvar', { submit: true, cls: 'primary' })}</div><div class="sheetDanger">${dangerText('Arquivar', { id: 'catArch' })}</div></form>`,
    onMount: d => {
      const f = d.querySelector('#catF');
      f.onsubmit = e => {
        e.preventDefault();
        const n = f.name.value;
        if (n.trim() === cat) { closeSheet(); return; }
        const o = Ops.renameCategory(ctx.state, kind, cat, n);
        if (!o.ok) return notice(o.title, o.message);
        ctx.replace(o.state); closeSheet(); toast('Categoria renomeada');
      };
      d.querySelector('#catArch').onclick = () => { closeSheet(); archiveCategory(kind, cat); };
    } });
}

export async function newCategory(kind) {
  const n = await promptDlg('Nova categoria', kind === 'income' ? 'Categoria de receita.' : 'Categoria de despesa.', { label: 'Nome', max: 40 }, { ok: 'Adicionar' });
  if (n == null) return;
  const o = Ops.addCategory(ctx.state, kind, n);
  if (!o.ok) return notice(o.title, o.message);
  ctx.replace(o.state); toast('Categoria adicionada');
}
