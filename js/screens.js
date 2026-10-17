// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Telas do Finan+ web: Início, Lançamentos, Meu dinheiro, Resumo (relatórios), Assistente e Ajustes.
// Cada tela só gera HTML; os cliques passam por data-act (tratados em app.js).
// No computador as telas se dividem em 2 ou 3 colunas (ctx.cols); no celular, uma.
import {
  Finance, isCard, isFlow, isProjected, Projection, ymOf, ymFirst, ymLast, ymLen, addDays, brDate, brDayMonth, brMonthLabel, brMonthYear, fullDate,
  MONTHS, MONTHS_SHORT, THEMES, themeLabel, AUTOLOCK_OPTIONS, account, card, CARD_PAYMENT_CAT, Money,
} from './core.js';
import { Insights, Ask, ASK_EXAMPLES, Categorizer, Text, INSIGHT_LABELS } from './assist.js';
import { compact } from './report.js';
import { PDF_SERIES } from './pdf.js';
import { icon } from './icons.js';
import { esc, attr, btn, eyebrow, pageTitle, why, check } from './ui.js';
import { ctx, money, hidden, categoryIcon, APP_VERSION } from './ctx.js';
import { MonthCalendar, Period } from './calendar.js';
import { PeriodCompare } from './simulator.js';
import { calendarView, roundBtn } from './calendarview.js';

const pct1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const pct0 = v => String(Math.round(v));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const sumOf = l => l.reduce((n, t) => n + t.value, 0);
const cols = (...c) => ctx.cols === 1 ? c.flat().join('') : `<div class="cols cols${c.length}">${c.map(x => `<div class="col">${x.join('')}</div>`).join('')}</div>`;
const sectionHead = (eb, title, action = '') => `<div class="sectionHead"><div>${eb ? eyebrow(eb) : ''}<h3>${esc(title)}</h3></div>${action}</div>`;
const glyph = cat => {
  const ic = categoryIcon(cat);
  return `<span class="badge" aria-hidden="true">${ic ? icon(ic, 20) : esc([...String(cat).trim()][0]?.toUpperCase() || '•')}</span>`;
};
export const assistOn = () => ctx.device.assistTips || ctx.device.assistAsk;
const visibleTips = (all) => all.filter(t => !ctx.device.dismissedTips.includes(t.id));

// ================================================================== Início
// Ondas ao lado do saldo: só decoração (sem ponto, eixo ou valor), escondidas do leitor de tela.
const WAVES = `<svg class="balanceWaves" viewBox="0 0 230 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
<defs><linearGradient id="wavesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".2"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
<path d="M0 78C30 70 45 40 75 46C105 52 112 92 142 88C170 84 178 50 200 44C214 40 222 48 230 54V120H0Z" fill="url(#wavesFill)"/>
<path d="M0 92C35 86 55 66 85 70C115 74 125 100 155 98C185 96 195 74 230 72" fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
<path d="M0 78C30 70 45 40 75 46C105 52 112 92 142 88C170 84 178 50 200 44C214 40 222 48 230 54" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
export function homeView() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today);
  const bal = Finance.currentBalance(s), fut = Finance.futureBalance(s, ymLast(ym), today);
  const fl = Finance.monthFlow(s, ym);
  const pend = Period.monthPending(s, ym, today);
  const used = fl.income > 0 ? fl.expense * 100 / fl.income : 0;
  const saved = fl.income > 0 ? Math.max(0, (fl.income - fl.expense) * 100 / fl.income) : 0;
  // saldo no fim do mês anterior = saldo atual sem o que foi realizado nas contas a partir do dia 1º
  // (mesma regra de Finance.accountBalance); null sem lançamentos antes deste mês
  const first = ymFirst(ym), ids = new Set(s.accounts.map(a => a.id));
  const prevEnd = s.txs.some(t => t.date < first) ? bal - s.txs
    .filter(t => ids.has(t.accountId) && !isCard(t) && t.paid && t.date >= first)
    .reduce((n, t) => t.kind === 'income' ? n + t.value : n - t.value, 0) : null;
  const diff = prevEnd === null ? 0 : fut - prevEnd;
  const compareChip = hidden() ? '' : prevEnd === null
    ? '<span class="compareChip">1º mês · sem comparação</span>'
    : `<span class="compareChip ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${Money.format(Math.abs(diff))} vs. fim de ${MONTHS[(ym - 1) % 12]}</span>`;
  // como o previsto foi calculado (só quando a conta fecha exatamente com os números da tela)
  const explain = !hidden() && (pend.toReceive > 0 || pend.toPay > 0) && bal + pend.toReceive - pend.toPay === fut
    ? `<small class="forecastExplain">Hoje ${Money.format(bal)} + ${Money.format(pend.toReceive)} a receber − ${Money.format(pend.toPay)} a pagar</small>` : '';
  const hero = `<section class="hero glass" aria-label="Resumo do mês">
    ${ctx.cols > 1 ? `<div class="heroTop"><span class="todayLabel" id="todayLabel">${esc(fullDate(today))}</span><span class="statusPill">${icon('shield', 14)}Privado</span></div>` : ''}
    <div class="balanceWrap">${WAVES}
    <div class="balanceMain"><span class="tile" aria-hidden="true">${icon('account-balance-wallet', 22)}</span><span>Saldo atual</span></div>
    <b class="balanceBig${bal < 0 ? ' negative' : ''}">${money(bal)}</b></div>
    <div class="forecastBox"><span class="tile" aria-hidden="true">${icon('bar-chart', 20)}</span>
      <span class="meta"><small>Saldo previsto até ${brDate(ymLast(ym))}</small><b class="${fut < 0 ? 'negative' : ''}">${money(fut)}</b>
      <small class="forecastNote">Considera valores pendentes, faturas e recorrências até esta data.</small>${compareChip}</span></div>
    ${explain}
    ${fl.income > 0 ? `<div class="progress${hidden() ? ' sensitive' : ''}" role="progressbar" aria-label="Despesas sobre as receitas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, used))}"><i style="width:${Math.min(100, used)}%"${used > 100 ? ' class="over"' : ''}></i></div>
    <div class="monthProgressText"><small>${esc(hidden() ? 'Valores ocultos.' : `Despesas equivalem a ${pct1(used)}% das receitas recebidas.`)}</small>${hidden() ? '' : `<b class="savedPill">${pct0(saved)}% economizado</b>`}</div>` : ''}
  </section>
  <div class="flowGrid">
    ${pendingCard('in', 'arrow-upward', 'Falta receber', pend.toReceive, fl.income, 'recebido', true)}
    ${pendingCard('out', 'arrow-downward', 'Falta pagar', pend.toPay, fl.expense, 'pago', false)}
  </div>`;
  // contas, cartões, limites e metas ficam na aba Meu dinheiro; o + (celular) e os botões do topo (computador) lançam
  const blocks = { hero, due: dueCard(), assist: homeAssistCard() };
  const body = ctx.cols >= 2 ? cols([blocks.hero, blocks.due], [blocks.assist]) : [blocks.hero, blocks.due, blocks.assist].join('');
  return `<h2 id="homeTitle" class="srOnly">Início</h2>${body}`;
}

/** o que ainda falta entrar/sair no mês; realizado e pendente ficam separados (em despesas, sem porcentagem:
 *  faturas abertas podem corresponder a compras já lançadas e contariam duas vezes) */
function pendingCard(cls, ic, label, pending, realized, doneWord, showProgress) {
  const total = pending + realized, frac = total > 0 ? realized * 100 / total : 0;
  const foot = showProgress && total > 0
    ? `<span class="flowBar${hidden() ? ' sensitive' : ''}" aria-hidden="true"><i style="width:${frac}%"></i></span><small class="flowPct">${hidden() ? 'Progresso oculto' : `${pct0(frac)}% ${doneWord}`}</small>`
    : `<small class="flowPct">${!showProgress && pending > 0 ? 'Contas e faturas em aberto neste mês' : !showProgress ? 'Tudo pago neste mês' : 'Nada registrado neste mês'}</small>`;
  return `<button type="button" class="flowCard ${cls}" data-act="go" data-view="moves"><span class="flowTop"><span class="tile" aria-hidden="true">${icon(ic, 20)}</span><span class="flowLabel">${label}</span></span><b>${money(pending)}</b><span class="flowFill"></span>${foot}</button>`;
}

/** contas a pagar, a receber e faturas dos próximos 30 dias (inclui atrasados) */
export function upcoming(s, today, days = 30) {
  const limit = addDays(today, days), out = [];
  for (const t of s.txs) {
    if (t.paid || isCard(t) || !isFlow(t) || t.date > limit) continue;
    out.push({ kind: t.kind, title: t.desc, amount: t.value, date: t.date, late: t.date < today, act: 'edit-tx', id: t.id, sub: t.category });
  }
  for (const c of s.cards) for (const inv of Finance.cardStatus(s, c, today).invoices)
    if (inv.open > 0 && inv.due <= limit) out.push({ kind: 'invoice', title: `Fatura ${c.name}`, amount: inv.open, date: inv.due, late: inv.due < today, act: 'pay-invoice', id: c.id, sub: `${brMonthLabel(inv.ym)}${inv.closed ? ' · fechada' : ' · aberta'}` });
  return out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

function dueCard() {
  const s = ctx.state, list = Finance.upcomingDues(s, ctx.today, 3);
  const rows = list.map(r => {
    const late = r.date < ctx.today, inv = r.type === 'INVOICE_DUE';
    return `<button type="button" class="dueRow glass${late ? ' late' : ''}" data-act="${inv ? 'pay-invoice' : 'edit-tx'}" data-id="${attr(r.refId)}">
      <span class="dueIc">${icon(late ? 'warning' : 'calendar-month', 18)}</span>
      <span class="meta"><b>${esc(r.title)}</b><small class="${late ? 'red' : ''}">${late ? 'Vencido em' : 'Vence em'} ${brDate(r.date)}</small><small class="dueGo">Ver pagamento ›</small></span>
      <span class="amount red">${money(r.amount)}</span></button>`;
  }).join('');
  const more = list.length ? btn('Ver todos', { act: 'open-moves', data: { st: 'pending' }, cls: 'soft small' }) : '';
  return `<section class="section">${sectionHead(null, 'Próximos vencimentos', more)}
    <div class="dueList">${rows || `<div class="dueRow glass"><span class="dueIc ok">${icon('check', 18)}</span><span class="meta"><b>Nenhum pagamento pendente</b><small>Quando houver uma conta ou fatura, ela aparecerá aqui.</small></span></div>`}</div></section>`;
}

/** cartão compacto: as 2 frases mais úteis do mês (Insights.report().highlights), a dica principal e um link só */
function homeAssistCard() {
  const d = ctx.device;
  if (!assistOn()) return '';
  const s = ctx.state, today = ctx.today;
  let inner = '', tips = [];
  if (d.assistTips) {
    const rep = Insights.report(s, today, money);
    tips = visibleTips(Insights.tips(s, today, money));
    const lines = rep.highlights.length ? rep.highlights : rep.lines.slice(0, 1);
    // cada frase numa faixa com ícone; tocar abre o assistente (o mesmo que o link abaixo)
    inner = `<div class="reportTiles">${lines.map((l, i) => `<button type="button" class="reportTile" data-act="go" data-view="assist"><span class="tile" aria-hidden="true">${icon(i === 0 ? 'receipt-long' : 'calendar-month', 19)}</span><span class="txt">${esc(l)}</span>${icon('chevron-right', 18)}</button>`).join('')}</div>${tips[0] ? tipItem(tips[0]) : ''}`;
  } else inner = '<p class="assistAskTxt">Pergunte sobre seus gastos.</p>';
  const link = d.assistTips ? (tips.length > 1 ? `Ver as ${tips.length} dicas` : 'Abrir assistente') : 'Perguntar';
  return `<section class="glass assistCard" aria-label="Assistente">
    <div class="assistHead">${icon('auto-awesome', 22)}<h3 class="assistTitle">Assistente</h3></div>${inner}
    <button type="button" class="btn link moreLink" data-act="go" data-view="assist"${d.assistTips ? '' : ' data-focus="ask"'}><span>${esc(link)}</span>${icon('chevron-right', 18)}</button></section>`;
}

export function tipItem(t, o = {}) {
  const canOpen = t.query != null || t.from != null;
  return `<article class="tip${o.dismissed ? ' dismissed' : ''}">
    <div class="tipHead"><span class="tipType">${esc(INSIGHT_LABELS[t.type])}</span>
      ${o.dismissed ? btn('Mostrar de novo', { act: 'restore-tip', data: { id: t.id }, cls: 'link small' }) : btn('', { act: 'dismiss-tip', data: { id: t.id }, cls: 'icon tiny', icon: 'close', iconSize: 16, label: 'Dispensar dica' })}</div>
    <b>${esc(t.title)}</b><p>${esc(t.text)}</p>
    <div class="tipFoot">${why(t.why)}${canOpen && !o.dismissed ? btn('Ver lançamentos', { act: 'open-moves', data: { q: t.query ?? '', from: t.from ?? '', to: t.to ?? '' }, cls: 'link small', icon: 'chevron-right', iconSize: 16 }) : ''}</div></article>`;
}

// ================================================================== Meu dinheiro
/** contas, cartões, limites, metas, simulador e categorias, como a aba Meu dinheiro do app Android */
const moneyHead = (ic, title, sub, action = '') => `<div class="moneyHead"><span class="tile" aria-hidden="true">${icon(ic, 22)}</span><div><h3>${esc(title)}</h3><small>${esc(sub)}</small></div>${action}</div>`;
export const catsOpen = { on: false };

export function moneyView() {
  const s = ctx.state, today = ctx.today, usage = Finance.budgetUsage(s, ymOf(today));
  const head = `<div class="pageTitle"><h2 id="moneyTitle">Meu dinheiro</h2><p>Contas, cartões e seus planos financeiros em um só lugar.</p></div>`;

  const accRows = s.accounts.map(a => manage(a.name, `Conta · Saldo ${money(Finance.accountBalance(s, a))}`, btn('Editar', { act: 'edit-account', data: { id: a.id }, cls: 'soft small' }))).join('');
  const cardRows = s.cards.map(c => { const st = Finance.cardStatus(s, c, today); return manage(c.name, `Cartão · limite ${money(c.limit)} · usado ${money(st.used)} · fecha dia ${c.close} · vence dia ${c.due}`, btn('Editar', { act: 'edit-card', data: { id: c.id }, cls: 'soft small' })); }).join('');
  const invoices = s.cards.map(c => { const cur = Finance.cardStatus(s, c, today).current; return cur ? `<div class="invoiceRow"><div><small>Fatura ${esc(c.name)} · ${esc(brMonthLabel(cur.ym))} · vence ${brDate(cur.due)}</small><b>${money(cur.open)}</b></div>${btn('Pagar fatura', { act: 'pay-invoice', data: { id: c.id }, cls: 'primary small' })}</div>` : ''; }).join('');
  const wallet = `<section class="glass moneyCard">${moneyHead('account-balance', 'Contas e cartões', 'Saldo das contas e situação dos cartões')}
    ${s.cards.length ? '' : '<p class="muted small">Sem cartão cadastrado. Você pode adicionar um para acompanhar faturas e vencimentos.</p>'}
    <div class="manageList">${accRows}${cardRows}</div>
    <div class="btnGrid">${btn('Adicionar conta', { act: 'new-account', icon: 'add', iconSize: 18 })}${btn('Adicionar cartão', { act: 'new-card', icon: 'add', iconSize: 18 })}</div>${invoices}</section>`;

  const limitRows = [...s.limits].map(([cat, lim]) => {
    const u = usage.get(cat) || 0, p = lim > 0 ? u * 100 / lim : 0;
    const cls = u > lim ? 'over' : p >= 80 ? 'warn' : '';
    const status = u > lim ? 'Limite ultrapassado' : p >= 100 ? 'Limite atingido' : hidden() ? (p >= 80 ? 'Atenção: perto do limite' : 'Dentro do limite') : p >= 80 ? `Atenção: ${pct0(p)}% usado` : `${pct0(p)}% usado`;
    return `<button type="button" class="budgetLine ${cls}" data-act="edit-limit" data-cat="${attr(cat)}">
      <div><b>${esc(cat)}</b><span>${money(u)} / ${money(lim)}</span></div>
      <div class="budgetTrack${hidden() ? ' sensitive' : ''}"><i style="width:${Math.min(100, p)}%"></i></div><small>${status}</small></button>`;
  }).join('');
  const limits = `<section class="glass moneyCard">${moneyHead('track-changes', 'Limites mensais', 'Acompanhe quanto gasta por categoria', s.limits.size ? btn('Adicionar limite', { act: 'new-limit', icon: 'add', iconSize: 18, cls: 'soft small' }) : '')}
    ${s.limits.size ? `<p class="muted small">Inclui lançamentos pendentes deste mês.</p>${limitRows}`
      : `<p class="muted small">Defina quanto deseja gastar por categoria para acompanhar seus gastos do mês.</p>${btn('Criar meu primeiro limite', { act: 'new-limit', icon: 'add', iconSize: 18, cls: 'soft wide' })}`}</section>`;

  const goalRows = s.goals.map(g => {
    const p = g.target > 0 ? Math.min(100, g.saved * 100 / g.target) : 0, plan = Finance.goalPlan(g, today);
    const planTxt = plan.done ? 'Meta atingida' : [
      plan.needed != null ? `Precisa de ${money(plan.needed)}/mês` : null,
      plan.eta != null ? `Conclui em ${brMonthLabel(plan.eta)}${plan.late ? ' (após o prazo)' : ''}` : null,
    ].filter(Boolean).join(' · ');
    return `<button type="button" class="tx goal" data-act="edit-goal" data-id="${attr(g.id)}">
      <div class="goalTop"><b>${esc(g.name)}</b><span>${money(g.saved)} / ${money(g.target)}</span></div>
      <div class="bar2${hidden() ? ' sensitive' : ''}"><i style="width:${p}%"></i></div>
      <div class="goalInfo"><span>${g.deadline ? `Até ${brDate(g.deadline)}` : 'Sem prazo'}${plan.pastDue ? ' · prazo vencido' : ''}</span><span>${esc(planTxt)}</span></div></button>`;
  }).join('');
  const goals = `<section class="glass moneyCard">${moneyHead('flag', 'Metas', 'Acompanhe seus objetivos financeiros', s.goals.length ? btn('Criar meta', { act: 'new-goal', icon: 'add', iconSize: 18, cls: 'soft small' }) : '')}
    ${s.goals.length ? `<div class="list">${goalRows}</div>`
      : `<p class="muted small">Uma meta ajuda a acompanhar um objetivo, como uma viagem ou uma reserva.</p>${btn('Criar minha primeira meta', { act: 'new-goal', icon: 'add', iconSize: 18, cls: 'soft wide' })}`}</section>`;

  const sim = `<section class="glass moneyCard">${moneyHead('auto-awesome', 'Simular meu dinheiro', 'Teste cenários sem alterar seus dados')}
    <p class="muted small">Explore compras, mudanças na renda, economias e quitação de dívidas.</p>${btn('Abrir simulação', { act: 'simulator', icon: 'auto-awesome', iconSize: 18, cls: 'soft' })}</section>`;

  // categorias começam minimizadas (como no Android): a lista e o formulário só aparecem em "Maximizar"
  const catList = (k, label) => `<h4 class="subhead">${label}</h4><div class="manageList">${s.cats[k].map(c => manage(c, `${k === 'expense' ? 'Despesa' : 'Receita'}${categoryUse(k, c)}`,
    btn('Renomear', { act: 'rename-cat', data: { kind: k, cat: c }, cls: 'soft small', label: `Renomear ${c}` }) + btn('Excluir', { act: 'delete-cat', data: { kind: k, cat: c }, cls: 'soft small dangerB', label: `Excluir ${c}` }))).join('')}</div>`;
  const open = catsOpen.on;
  const cats = `<section class="glass moneyCard" id="catsCard">${moneyHead('tune', 'Categorias', 'Organize relatórios e lançamentos',
    `<button type="button" class="btn soft small" data-act="cats-fold" aria-expanded="${open}" aria-controls="catsBody">${icon('expand-more', 18)}<span>${open ? 'Minimizar' : 'Maximizar'}</span></button>`)}
    <div id="catsBody"${open ? '' : ' hidden'}><form id="catForm" class="filters" novalidate><input id="newCat" placeholder="Nova categoria" maxlength="40" aria-label="Nova categoria"><select id="newCatKind" aria-label="Tipo da categoria"><option value="expense"${ctx.catKind !== 'income' ? ' selected' : ''}>Despesa</option><option value="income"${ctx.catKind === 'income' ? ' selected' : ''}>Receita</option></select>
    ${btn('Adicionar categoria', { submit: true, cls: 'primary wide' })}</form>${catList('expense', 'Despesas')}${catList('income', 'Receitas')}</div></section>`;

  return head + (ctx.cols === 1 ? [wallet, limits, goals, sim, cats].join('') : cols([wallet, goals, sim], [limits, cats]));
}

// ================================================================== Lançamentos
export function movesDefaults() {
  const ym = ymOf(ctx.today);
  if (!ctx.moves.from && !ctx.moves.to && !ctx.moves.all) { ctx.moves.from = ymFirst(ym); ctx.moves.to = ymLast(ym); }
}
export function filteredTxs() {
  const f = ctx.moves, q = Text.fold(f.q);
  // recorrências previstas dos meses que ainda não chegaram (só com fim de período; não são gravadas)
  const projected = f.to ? Projection.between(ctx.state, f.from || ctx.today, f.to, ctx.today) : [];
  return [...ctx.state.txs, ...projected].filter(t => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to)
    && (!f.kind || t.kind === f.kind) && (!f.st || (f.st === 'paid' ? t.paid : !t.paid))
    && (!q || Text.fold(t.desc + ' ' + t.category).includes(q)))
    .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
}

/** chave Lista | Calendário */
function viewSwitch() {
  const v = ctx.movesView;
  const b = (id, label, ic) => `<button type="button" role="tab" data-act="moves-view" data-v="${id}" aria-selected="${v === id}" class="${v === id ? 'selected' : ''}">${icon(ic, 19)}<span>${label}</span></button>`;
  return `<div class="viewSwitch glass" role="tablist" aria-label="Modo de exibição">${b('list', 'Lista', 'view-list')}${b('calendar', 'Calendário', 'calendar-month')}</div>`;
}

/** ‹ Outubro de 2026 › e o botão de período livre e situação (destacado quando há algo fora do mês inteiro) */
function periodBar() {
  const f = ctx.moves, custom = Period.fullMonth(f.from, f.to) == null || f.st === 'paid';
  return `<div class="periodBar">${roundBtn('chevron-left', 'Mês anterior', 'moves-shift', { d: -1 })}
    <h3 class="periodLabel" aria-live="polite">${esc(Period.label(f.from, f.to))}</h3>
    ${roundBtn('chevron-right', 'Próximo mês', 'moves-shift', { d: 1 })}${roundBtn('tune', 'Período e filtros', 'moves-filters', {}, custom ? 'on' : '')}</div>`;
}

/** filtros de um toque: Receitas/Despesas combinam com Pendentes; "Realizados" fica em Período e filtros */
function filterChips() {
  const f = ctx.moves;
  const chip = (c, label, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-act="moves-chip" data-c="${c}" aria-pressed="${on}">${label}</button>`;
  return `<div class="chips" role="group" aria-label="Filtros">${chip('all', 'Todos', !f.kind && !f.st)}${chip('income', 'Receitas', f.kind === 'income')}${chip('expense', 'Despesas', f.kind === 'expense')}${chip('pending', 'Pendentes', f.st === 'pending')}</div>`;
}

export function movesView() {
  movesDefaults();
  const f = ctx.moves;
  const title = `<div class="pageTitle"><h2 id="movesTitle">Lançamentos</h2></div>`;
  if (ctx.movesView === 'calendar') return title + viewSwitch() + calendarView();
  const panel = `${periodBar()}
    <div class="searchField">${icon('search', 20)}<input id="q" type="search" placeholder="Buscar descrição ou categoria" aria-label="Buscar lançamentos (descrição ou categoria)" value="${attr(f.q)}" maxlength="60"></div>
    ${filterChips()}<div id="movesTotals"></div>`;
  const list = `<section class="section listSection" aria-label="Lançamentos do período"><div id="periodTransactions" class="list"></div></section>`;
  return title + viewSwitch() + (ctx.cols === 1 ? panel + list : `<div class="movesGrid"><aside class="movesAside">${panel}</aside><div>${list}</div></div>`);
}

export function movesData() {
  const all = filteredTxs(), f = ctx.moves, today = ctx.today;
  const fl = Finance.flow(all), pend = Period.pending(all), bal = fl.income - fl.expense;
  const forecast = bal + pend.toReceive - pend.toPay, hasPend = pend.toReceive > 0 || pend.toPay > 0;
  const col = (label, v, cls, subL, sv, scls, show) => `<div><small>${label}</small><b class="${cls}">${money(v)}</b>${show ? `<small class="statSub">${subL} <b class="${scls}">${money(sv)}</b></small>` : ''}</div>`;
  const totals = `<section class="periodSummary glass" aria-label="Resumo do período"><div class="sumGrid">
      ${col('Receitas', fl.income, 'green', 'a receber', pend.toReceive, 'green', pend.toReceive > 0)}
      ${col('Despesas', fl.expense, 'red', 'a pagar', pend.toPay, 'red', pend.toPay > 0)}
      ${col('Saldo', bal, bal < 0 ? 'negative' : '', 'previsto', forecast, forecast < 0 ? 'negative' : 'accent', hasPend)}</div>
    ${(fl.income > 0 || fl.expense > 0) && !hidden() ? `<small class="muted sumNote">${esc(resultText(fl))}</small>` : ''}</section>`;
  // lista agrupada por dia (mais recentes primeiro), com o saldo de cada dia pela mesma regra do calendário
  const shown = all.slice(0, f.limit), groups = [];
  for (const t of shown) { const g = groups.at(-1); if (g && g.date === t.date) g.txs.push(t); else groups.push({ date: t.date, txs: [t] }); }
  const rows = groups.map(g => {
    const net = Period.cashNet(g.txs), cash = g.txs.some(t => !isCard(t));
    return `<h4 class="dayHead"><span>${esc((g.date === today ? 'Hoje · ' : '') + MonthCalendar.dayTitle(g.date, today))}</span>
      ${cash && !hidden() ? `<b class="${net < 0 ? 'red' : 'green'}" title="Resultado das movimentações deste dia" aria-label="Resultado das movimentações deste dia: ${net > 0 ? 'mais ' : net < 0 ? 'menos ' : ''}${attr(Money.format(Math.abs(net)))}">${net > 0 ? '+ ' : net < 0 ? '− ' : ''}${Money.format(Math.abs(net))}</b>` : ''}</h4>${g.txs.map(t => txRow(t, { noDate: true })).join('')}`;
  }).join('');
  return {
    totals, count: all.length,
    list: rows ? rows + (all.length > shown.length ? btn(`Mostrar mais (${all.length - shown.length} restantes)`, { act: 'moves-more', cls: 'soft wide' }) : '')
      : `<div class="empty glass"><b>Nenhum lançamento neste período</b><span>Troque o mês ou ajuste os filtros. Você também pode começar por aqui:</span>
        <div class="btnGrid">${btn('Despesa', { act: 'new-tx', data: { kind: 'expense' }, icon: 'arrow-downward', iconSize: 18 })}${btn('Receita', { act: 'new-tx', data: { kind: 'income' }, icon: 'arrow-upward', iconSize: 18 })}</div></div>`,
  };
}

/** linha de lançamento; o: { noDate } quando o dia já aparece no título (lista por dia e calendário) */
export function txRow(t, o = {}) {
  const s = ctx.state, payment = !isFlow(t), cardT = isCard(t), prev = isProjected(t);
  const where = cardT ? `Cartão ${card(s, t.cardId)?.name ?? ''}` : account(s, t.accountId)?.name ?? '';
  const late = !t.paid && !cardT && t.date < ctx.today;
  // situação por escrito, junto da data (como no Android 1.6.0)
  const statusTxt = prev ? 'Prevista · recorrência' : payment ? 'Pagamento de fatura' : cardT ? 'No cartão'
    : !t.paid ? (late ? (t.kind === 'income' ? 'Vencida · a receber' : 'Vencida · a pagar') : (t.kind === 'income' ? 'A receber' : 'A pagar'))
    : t.kind === 'income' ? 'Recebida' : 'Paga';
  const stCls = late ? 'red' : t.paid && !cardT && !payment && !prev ? 'green' : cardT ? 'accent' : '';
  const status = `<span class="txStatus ${stCls}">${esc(statusTxt)}</span>`;
  const when = (o.noDate ? '' : brDate(t.date)) + (t.paid && t.scheduledDate ? `${o.noDate ? '' : ' · '}previsto ${brDate(t.scheduledDate)}` : '');
  const meta = [status, esc(t.category), esc(where), when].filter(Boolean).join(' · ');
  // recorrência prevista (mês que ainda não chegou): não existe nos dados; clicar abre a recorrência
  const toggle = prev ? `<span class="chk card" title="Previsto: o lançamento é criado quando o mês chegar">${icon('repeat', 16)}</span>`
    : cardT ? `<span class="chk card" title="Compra no cartão">${icon('credit-card', 16)}</span>`
    : payment ? `<span class="chk on" title="Pagamento de fatura">${icon('check', 16)}</span>`
      : `<button type="button" class="chk${t.paid ? ' on' : ''}" data-act="toggle-paid" data-id="${attr(t.id)}" aria-label="${t.paid ? `Desfazer confirmação: ${t.kind === 'income' ? 'recebido' : 'pago'}` : (t.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago')}: ${attr(t.desc)}">${icon('check', 16)}</button>`;
  return `<div class="tx ${t.kind}${t.paid ? '' : ' pending'}${payment ? ' payment' : ''}${prev ? ' projected' : ''}" data-act="${prev ? 'edit-recurring' : 'edit-tx'}" data-id="${attr(prev ? t.recurringId : t.id)}" role="button" tabindex="0" aria-label="${attr(t.desc)}, ${prev ? 'previsto, ' : ''}${t.kind === 'income' ? 'receita' : 'despesa'} de ${attr(money(t.value))} em ${brDate(t.date)}">
    ${glyph(t.category)}<span class="meta"><b>${esc(t.desc)}</b><small>${meta}</small></span>
    <span class="amount">${t.kind === 'income' ? '+' : '−'}${money(t.value)}</span>${toggle}</div>`;
}

// ================================================================== Relatórios
/** "Depois das despesas, sobraram R$ X." e variantes (Resumo e Lançamentos) */
export function resultText(fl) {
  if (fl.income === fl.expense) return 'Neste período, você gastou o mesmo valor que recebeu.';
  if (fl.expense > fl.income) return `Você gastou ${Money.format(fl.expense - fl.income)} a mais do que recebeu.`;
  return `Depois das despesas, sobraram ${Money.format(fl.income - fl.expense)}.`;
}

/** Fluxo agregado do período: de onde veio (receitas por categoria) e para onde foi (despesas e a sobra).
 *  Não liga uma receita a uma despesa específica. */
const FLOW_COLORS = ['#00afc1', 'var(--red)', '#278ae5', 'var(--green)', '#8c9499', 'var(--accent)'];
function flowCard(inRange, s, f, fl) {
  const by = new Map();
  for (const t of inRange) if (t.kind === 'income' && t.paid && isFlow(t)) by.set(t.category || 'Sem categoria', (by.get(t.category || 'Sem categoria') || 0) + t.value);
  const ins = [...by].sort((a, b) => b[1] - a[1]).map(([n, v], i) => [n, v, FLOW_COLORS[i % 6]]);
  const outs = Finance.categoryTotals(s, f.from, f.to).map(([n, v], i) => [n, v, FLOW_COLORS[(i + 1) % 6]]);
  const left = Math.max(0, fl.income - fl.expense);
  if (left > 0) outs.push(['Sobrou', left, 'var(--green)']);
  const scale = Math.max(fl.income, fl.expense, 1);
  const bar = parts => `<div class="flowSeg${hidden() ? ' sensitive' : ''}" aria-hidden="true">${parts.map(([, v, c]) => `<i style="width:${v * 100 / scale}%;background:${c}"></i>`).join('')}</div>`;
  const legend = (parts, total) => `<ul class="flowLegend">${parts.map(([n, v, c]) => `<li><i style="background:${c}"></i><span>${esc(n)}</span><b>${money(v)}<small>${hidden() || total <= 0 ? '••%' : Math.min(100, Math.floor(v * 100 / total)) + '%'}</small></b></li>`).join('')}</ul>`;
  const desc = `Fluxo do dinheiro. Entradas realizadas: ${hidden() ? 'valores ocultos' : Money.format(fl.income)}. Despesas realizadas: ${hidden() ? 'valores ocultos' : Money.format(fl.expense)}`
    + (left > 0 ? `. Sobra: ${hidden() ? 'valor oculto' : Money.format(left)}` : fl.expense > fl.income ? `. Despesas acima das receitas: ${hidden() ? 'valor oculto' : Money.format(fl.expense - fl.income)}` : '');
  return `<section class="comparison glass flowBox" role="group" aria-label="${attr(desc)}">${eyebrow('Análises')}<h3>Fluxo do dinheiro</h3>
    <p class="muted small">De onde veio (em cima) e para onde foi (embaixo).</p>
    <h4 class="subhead">De onde veio</h4>${bar(ins)}${legend(ins, fl.income)}
    <div class="flowPill"><span>${hidden() ? 'Entradas ocultas' : `Entrou ${esc(Money.format(fl.income))}`}</span></div>
    <h4 class="subhead">Para onde foi</h4>${outs.length ? bar(outs) + legend(outs, Math.max(fl.income, fl.expense)) : '<p class="muted small">Nenhuma despesa realizada; todo o valor recebido permaneceu disponível.</p>'}
    ${fl.expense > fl.income ? '<p class="small red">As despesas passaram o valor recebido neste período.</p>' : ''}
    <small class="muted">Considera apenas lançamentos pagos ou recebidos; não associa uma entrada a uma despesa específica.</small></section>`;
}

/**
 * Resumo (relatórios): o mesmo período da aba Lançamentos (‹ mês › e período livre), só valores realizados.
 * Resumo com comparação justa (PeriodCompare), atalho para o simulador "E se…?", despesas por categoria e evolução.
 */
export function reportsView() {
  movesDefaults();
  const s = ctx.state, f = ctx.moves, today = ctx.today;
  const inRange = s.txs.filter(t => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to));
  const fl = Finance.flow(inRange);
  const head = `<div class="pageTitle reportsHead"><h2 id="reportsTitle">Resumo</h2>${btn('PDF', { act: 'pdf', cls: 'pill', icon: 'receipt-long', iconSize: 18, label: 'Exportar relatório em PDF' })}</div>
    ${periodBar()}<p class="muted small reportsNote">Só valores realizados (pagos ou recebidos). O período é o mesmo da aba Lançamentos.</p>`;
  let summary;
  if (fl.income === 0 && fl.expense === 0) {
    // nada realizado: em vez de zeros, mostra o que está pendente e leva ao calendário
    const pend = Period.pending(inRange), ym = Period.fullMonth(f.from, f.to);
    const name = ym != null ? MONTHS[ym % 12] : 'este período';
    summary = `<section class="comparison glass reportsEmpty"><b>Nada realizado em ${esc(name)} ainda</b>
      ${pend.toReceive > 0 || pend.toPay > 0 ? `<p class="muted small">Os relatórios mostram o que já foi pago ou recebido. Por enquanto, está pendente:</p>
        <div class="reportStat"><div><small>A receber</small><b class="green">${money(pend.toReceive)}</b></div><div><small>A pagar</small><b class="red">${money(pend.toPay)}</b></div></div>`
        : '<p class="muted small">Os relatórios mostram o que já foi pago ou recebido. Troque o período ou marque lançamentos como pagos.</p>'}
      ${btn('Ver no calendário', { act: 'reports-calendar', cls: 'link', icon: 'calendar-month', iconSize: 18 })}</section>`;
  } else {
    const c = PeriodCompare.of(f.from, f.to, today);
    const prev = c ? Finance.flow(s.txs.filter(t => t.date >= c.from && t.date <= c.to)) : null;
    // com "Ocultar valores", a variação também fica oculta (revelaria a proporção entre os períodos)
    const chg = (cur, old) => hidden() ? 'Variação oculta' : c ? PeriodCompare.text(cur, old, c) : '';
    const box = (l, ic, v, cls, ch) => `<div class="glass"><small>${icon(ic, 14)}${l}</small><b class="${cls}">${money(v)}</b>${ch ? `<small class="chg">${esc(ch)}</small>` : ''}</div>`;
    const res = fl.income - fl.expense;
    summary = `<section class="reportSum" aria-label="Resumo do período">${box('Receitas', 'arrow-upward', fl.income, 'green', chg(fl.income, prev?.income))}${box('Despesas', 'arrow-downward', fl.expense, 'red', chg(fl.expense, prev?.expense))}</section>
      <section class="glass resultBox"><small class="muted">Resultado do período</small><b class="${res < 0 ? 'negative' : 'accent'}">${money(res)}</b>
      <small class="muted">${esc(hidden() ? 'Os relatórios consideram somente valores já pagos ou recebidos.' : resultText(fl))}</small></section>`;
  }
  const flow = fl.income > 0 || fl.expense > 0 ? flowCard(inRange, s, f, fl) : '';
  const sim = `<button type="button" class="whatIf" data-act="simulator">${icon('auto-awesome', 22)}<span><b>Simular meu dinheiro</b><small>Simule economizar, comprar algo, uma mudança na renda ou antecipar uma dívida, sem mexer nos seus dados.</small></span>${icon('chevron-right', 20)}</button>`;
  const cats = Finance.categoryTotals(s, f.from, f.to), total = cats.reduce((n, [, v]) => n + v, 0);
  const slices = cats.slice(0, 7).map(([n, v]) => [n, v]);
  if (cats.length > 7) slices.push([`Outras (${cats.length - 7})`, cats.slice(7).reduce((n, [, v]) => n + v, 0)]);
  const catCard = `<section class="comparison glass">${eyebrow('Despesas')}<h3>Por categoria</h3>
    ${cats.length ? `<div class="donutWrap">${donutSvg(slices, total)}<ul class="legend">${slices.map(([n, v], i) => `<li><i style="background:${PDF_SERIES[i % 8]}"></i><span>${esc(n)}</span><b>${money(v)}</b><small>${pct1(total ? v * 100 / total : 0)}%</small></li>`).join('')}</ul></div>
    <div class="catBars">${cats.map(([c, v], i) => {
      const lim = s.limits.get(c), p = total ? v * 100 / total : 0;
      return `<div class="catBar"><div class="catTop">${glyph(c)}<b>${esc(c)}</b><span>${money(v)}</span></div><div class="budgetTrack"><i style="width:${p}%;background:${PDF_SERIES[Math.min(i, 7)]}"></i></div>
        ${lim != null ? `<small class="${v > lim ? 'red' : 'muted'}">${v > lim ? `${icon('warning', 13)} Acima do` : 'Dentro do'} limite mensal de ${esc(money(lim))}</small>` : ''}</div>`;
    }).join('')}</div>` : '<p class="muted small">Sem despesas realizadas no período.</p>'}</section>`;
  const months = Finance.lastMonths(s, today, 6), max = Math.max(1, ...months.map(([, m]) => Math.max(m.income, m.expense)));
  const empty = months.every(([, x]) => x.income === 0 && x.expense === 0);
  const desc = months.map(([m, x]) => brMonthYear(m) + (hidden() ? '' : `: receitas ${Money.format(x.income)}, despesas ${Money.format(x.expense)}`)).join('; ');
  const evo = `<section class="comparison glass">${eyebrow('Evolução')}<h3>Últimos 6 meses</h3>
    ${empty ? '<p class="muted small">Aparece quando houver pelo menos um mês com valores realizados.</p>' : `<div class="evo${hidden() ? ' sensitive' : ''}" role="img" aria-label="Gráfico de receitas e despesas. ${attr(desc)}">${months.map(([m, x]) => `<div class="evoCol"><div class="pair"><i class="inc" style="height:${x.income * 100 / max}%"></i><i class="exp" style="height:${x.expense * 100 / max}%"></i></div><span>${MONTHS_SHORT[(m % 12)]}</span></div>`).join('')}</div>
    <small class="legendLine"><i class="dot inc"></i>Receitas <i class="dot exp"></i>Despesas</small>`}</section>`;
  return head + (ctx.cols === 1 ? summary + sim + flow + catCard + evo : cols([summary, sim, flow], [catCard, evo]));
}

function donutSvg(slices, total) {
  const r = 52, c = 2 * Math.PI * r;
  let off = 0;
  const arcs = slices.map(([, v], i) => {
    const len = total > 0 ? c * v / total : 0;
    const el = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${PDF_SERIES[i % 8]}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 1.2).toFixed(2)} ${(c - Math.max(0, len - 1.2)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
    off += len;
    return el;
  }).join('');
  return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Despesas por categoria: ${attr(slices.map(([n, v]) => `${n} ${hidden() ? '' : Money.format(v)}`).join(', '))}">
    <circle r="${r}" cx="70" cy="70" fill="none" class="donutTrack" stroke-width="22"/>${arcs}
    <text x="70" y="66" text-anchor="middle" class="donutLabel">Total</text><text x="70" y="84" text-anchor="middle" class="donutValue">${esc(hidden() ? 'R$ ••••' : compact(total))}</text></svg>`;
}

// ================================================================== Assistente
export function assistView() {
  const d = ctx.device, s = ctx.state, today = ctx.today;
  const back = ctx.cols === 1 ? btn('Início', { act: 'go', data: { view: 'home' }, cls: 'link back', icon: 'arrow-back', iconSize: 18 }) : '';
  const head = back + pageTitle('assistTitle', 'No aparelho, sem internet', 'Assistente', 'Tudo é calculado neste aparelho, sem internet, a partir dos seus lançamentos. Toque em “Por quê?” para ver a regra usada.');
  const askBox = d.assistAsk ? `<section class="comparison glass" aria-label="Perguntas">${eyebrow('Pergunte')}
    <form id="askForm" class="askForm" novalidate><div class="searchField">${icon('search', 20)}<input id="askInput" type="search" maxlength="120" placeholder="Ex.: quanto gastei com mercado em agosto?" aria-label="Sua pergunta" value="${attr(ctx.lastQuestion || '')}"></div>
    ${btn('Perguntar', { submit: true, cls: 'primary', icon: 'send', iconSize: 18 })}</form>
    <div class="examples">${ASK_EXAMPLES.map(x => btn(x, { act: 'ask-example', data: { q: x }, cls: 'pill small' })).join('')}</div>
    <div id="askAnswer">${ctx.lastQuestion ? answerHtml(ctx.lastQuestion) : ''}</div></section>` : '';
  let summary = '', tipsBox = '';
  if (d.assistTips) {
    const rep = Insights.report(s, today, money);
    summary = `<section class="comparison glass">${eyebrow('Resumo')}<h3>${esc(rep.title)}</h3><ul class="reportLines">${rep.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>${why(rep.why)}</section>`;
    const all = Insights.tips(s, today, money), vis = visibleTips(all), dis = all.filter(t => d.dismissedTips.includes(t.id));
    tipsBox = `<section class="comparison glass">${eyebrow('Dicas')}<h3>Dicas de economia</h3>
      ${vis.length ? vis.map(t => tipItem(t)).join('') : '<p class="muted small">Nenhuma dica no momento: nada fora do padrão nos seus lançamentos.</p>'}
      ${dis.length ? `<details class="dismissedBox"><summary>${icon('expand-more', 18)}Mostrar dispensadas (${dis.length})</summary>${dis.map(t => tipItem(t, { dismissed: true })).join('')}</details>` : ''}</section>`;
  }
  const off = !d.assistAsk && !d.assistTips ? `<section class="comparison glass"><p class="muted">O resumo, as dicas e as perguntas estão desligados em Ajustes › Assistente.</p>${btn('Abrir Ajustes', { act: 'go', data: { view: 'prefs', fold: 'assistente' }, cls: 'soft' })}</section>` : '';
  return head + off + (ctx.cols === 1 ? askBox + summary + tipsBox : cols([askBox, summary], [tipsBox]));
}

export function answerHtml(q) {
  const a = Ask.answer(q, ctx.state, ctx.today, money);
  const p = a.parsed;
  return `<div class="answer"><b>${esc(a.text)}</b><small>${esc(a.understood)}</small>
    ${a.matches.length ? btn('Ver lançamentos', { act: 'open-moves', data: { q: p.category ?? p.words[0] ?? '', from: p.period.from, to: p.period.to, kind: p.kind ?? '' }, cls: 'pill small', icon: 'chevron-right', iconSize: 16 }) : ''}</div>`;
}

// ================================================================== Ajustes
export const openFolds = new Set();
function fold(id, title, sub, body, ic) {
  const open = openFolds.has(id);
  return `<section class="fold glass${open ? ' open' : ''}" id="fold-${id}">
    <button type="button" class="foldHead" data-act="fold" data-id="${id}" aria-expanded="${open}" aria-controls="foldBody-${id}">
      <span class="foldIc">${icon(ic, 20)}</span><span class="foldTxt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
      <span class="foldBtn" aria-hidden="true">${icon(open ? 'remove' : 'add', 20)}</span></button>
    <div class="foldBody" id="foldBody-${id}"${open ? '' : ' hidden'}>${body}</div></section>`;
}
const manage = (title, sub, actions) => `<div class="manageItem"><div><b>${esc(title)}</b><small>${esc(sub)}</small></div><div class="manageActions">${actions}</div></div>`;

export function prefsView(env) {
  const s = ctx.state, d = ctx.device;
  const appearance = fold('aparencia', 'Aparência', `Tema: ${themeLabel(s.theme)}`, `<div class="themeChoices">${THEMES.map(([id, label]) => `<button type="button" class="themeChoice${s.theme === id ? ' active' : ''}" data-act="theme" data-id="${id}" aria-pressed="${s.theme === id}">
      <span>${esc(label)}${s.theme === id ? icon('check', 16) : ''}</span><span class="swatches t-${id}"><i></i><i></i><i></i><i></i></span></button>`).join('')}</div>
    <p class="muted small">“Sistema” acompanha o modo claro/escuro do aparelho.</p>`, 'palette');

  const hasPin = !!d.pinHash;
  const privacy = fold('privacidade', 'Privacidade e segurança', (hasPin ? 'Bloqueio ativo' : 'Bloqueio desativado') + (s.privacy ? ' · valores ocultos' : ''), `
    <div class="manageItem"><div><b>Bloqueio por PIN</b><small>${hasPin ? 'Ativo: o PIN é pedido ao abrir o Finan+' : 'Desativado. Defina um PIN de 4 a 8 números.'}</small></div>
      <div class="manageActions">${btn(hasPin ? 'Remover PIN' : 'Definir PIN', { act: hasPin ? 'pin-remove' : 'pin-set', cls: 'soft small' })}${hasPin ? btn('Trocar', { act: 'pin-set', cls: 'soft small' }) : ''}</div></div>
    ${check('privacy', 'Ocultar valores', s.privacy, { sub: 'Esconde os valores em reais na tela e nos avisos (Ctrl+H)' })}
    <label class="field"><span>Bloqueio automático</span><select id="autoLockSel"${hasPin ? '' : ' disabled'}>${AUTOLOCK_OPTIONS.map(m => `<option value="${m}"${s.autoLock === m ? ' selected' : ''}>${m === 0 ? 'Desativado' : `${m} minuto${m > 1 ? 's' : ''} sem usar`}</option>`).join('')}</select>${hasPin ? '' : '<small class="hint">Precisa de um PIN.</small>'}</label>
    ${env.remote ? `<div class="manageItem"><div><b>Conectado ao celular</b><small>Acesso pela rede do Finan+ Android</small></div><div class="manageActions">${btn('Desconectar', { act: 'remote-logout', cls: 'soft small' })}</div></div>` : ''}
    <div class="infoBox">${icon('lock', 18)}<p>${env.remote ? 'Modo remoto: os dados ficam no celular (criptografados lá) e chegam por conexão criptografada (HTTPS). Nada financeiro é gravado neste navegador; o PIN abaixo vale só para ele.' : env.encrypted ? 'Os dados ficam criptografados (AES-256-GCM) neste navegador, com uma chave que não pode ser lida nem pelo próprio site. Nada é enviado para servidores.' : 'Atenção: este navegador não oferece as funções de criptografia necessárias. Os dados ficam neste aparelho, mas sem criptografia.'} O PIN nunca vai para o backup.</p></div>
    <p class="muted small">Navegadores não permitem bloquear capturas de tela. Ao compartilhar a tela, ligue “Ocultar valores”.</p>`, 'shield');

  const nperm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  const notif = env.remote ? fold('avisos', 'Avisos de vencimento', 'Feitos pelo celular', `
    <p class="muted small">No modo remoto, os avisos de vencimento chegam pelo próprio celular.</p>
    ${btn('Ver vencimentos agora', { act: 'notify-now', cls: 'soft small', icon: 'notifications', iconSize: 18 })}`, 'notifications') : fold('avisos', 'Avisos de vencimento', d.notifications && nperm === 'granted' ? 'Avisos de vencimento ligados' : 'Avisos de vencimento desligados', `
    ${check('notifications', 'Avisar vencimentos', d.notifications && nperm === 'granted', { sub: 'Contas a pagar, valores a receber e faturas, uma vez por dia a partir das 9h, com o Finan+ aberto', disabled: nperm === 'unsupported' })}
    ${nperm === 'denied' ? '<p class="muted small">As notificações estão bloqueadas para este site. Libere nas configurações do navegador.</p>' : ''}
    ${nperm === 'unsupported' ? '<p class="muted small">Este navegador não oferece notificações.</p>' : ''}
    ${btn('Avisar agora', { act: 'notify-now', cls: 'soft small', icon: 'notifications', iconSize: 18 })}
    <p class="muted small">Sites não podem rodar com o navegador fechado sem um servidor. Para manter tudo no aparelho, os avisos aparecem quando o Finan+ é aberto (ou fica aberto) a partir das 9h. O cartão “Vencimentos” do Início mostra os próximos 30 dias.</p>`, 'notifications');

  const n = [d.assistCategory, d.assistTips, d.assistAsk].filter(Boolean).length;
  const assist = fold('assistente', 'Assistente', `${n} de 3 funções ligadas`, `
    <p class="muted small">Funciona só neste aparelho, sem internet e sem enviar dados. Cada função pode ser desligada.</p>
    ${check('assistCategory', 'Sugerir categoria', d.assistCategory, { sub: 'Ao digitar a descrição de um lançamento novo' })}
    ${check('assistTips', 'Resumo e dicas', d.assistTips, { sub: 'No Início: resumo do mês, gastos fora do padrão, fixos, duplicados' })}
    ${check('assistAsk', 'Perguntas rápidas', d.assistAsk, { sub: 'Ex.: “quanto gastei com mercado em agosto?”' })}
    ${d.dismissedTips.length ? btn(`Restaurar ${d.dismissedTips.length} dica(s) dispensada(s)`, { act: 'restore-all-tips', cls: 'soft small' }) : ''}
    <details class="learned"><summary>${icon('expand-more', 18)}Ver o que o assistente aprendeu</summary>${learnedHtml()}</details>`, 'auto-awesome');

  const recurring = fold('recorrencias', 'Recorrências', s.recurring.length ? `${s.recurring.length} recorrência(s) cadastrada(s)` : 'Nenhuma recorrência cadastrada', `
    <div class="foldTools">${btn('Nova', { act: 'new-recurring', icon: 'add', iconSize: 18, cls: 'soft small' })}</div>
    ${s.recurring.length ? `<div class="manageList">${s.recurring.map(r => {
      const where = r.cardId ? `Cartão ${card(s, r.cardId)?.name ?? ''}` : account(s, r.accountId)?.name ?? '';
      return manage(r.desc, `${r.kind === 'income' ? 'Receita' : 'Despesa'} · ${money(r.value)} · dia ${r.day} · ${r.category} · ${where}${r.active ? '' : ' · pausada'}`, btn('Editar', { act: 'edit-recurring', data: { id: r.id }, cls: 'soft small' }));
    }).join('')}</div>` : '<p class="muted small">Você também pode marcar “Repetir mensalmente” ao criar um lançamento.</p>'}`, 'repeat');

  const data = fold('dados', 'Dados', 'Backup, restauração, CSV e relatório em PDF', `
    <div class="btnGrid">${btn('Exportar CSV', { act: 'csv', icon: 'table-view', iconSize: 18 })}${btn('Backup JSON', { act: 'backup', icon: 'download', iconSize: 18 })}
    ${btn('Restaurar', { act: 'restore', icon: 'upload', iconSize: 18 })}${btn('Relatório em PDF', { act: 'pdf', icon: 'picture-as-pdf', iconSize: 18 })}
    ${env.remote ? '' : btn('Apagar tudo', { act: 'wipe', cls: 'dangerB', icon: 'delete', iconSize: 18 })}</div>
    <p class="muted small">O backup JSON é compatível com o app Android e com a versão Linux do Finan+: dá para levar os dados de um para o outro. O arquivo de backup não é criptografado; guarde-o em local seguro.</p>`, 'database');

  const about = fold('sobre', 'Sobre', `Conheça o Finan+ · versão ${APP_VERSION}`, aboutHtml(env), 'info');
  const head = pageTitle('prefsTitle', 'Configurações', 'Ajustes', env.remote ? 'Tudo é salvo no celular, pela rede local.' : env.encrypted ? 'Tudo fica salvo e criptografado neste aparelho.' : 'Tudo fica salvo neste aparelho.');
  // agrupado como no Android 1.6.0; contas, cartões, limites e categorias estão em Meu dinheiro
  const group = (title, ...items) => `<h3 class="prefsGroup">${esc(title)}</h3>${items.join('')}`;
  const left = [group('Personalização', appearance, notif), group('Planejamento e automação', assist, recurring)];
  const right = [group('Segurança e dados', privacy, data), group('Aplicativo', about)];
  return head + (ctx.cols === 1 ? [...left, ...right].join('') : cols(left, right));
}

function categoryUse(k, c) { const n = ctx.state.txs.filter(t => t.kind === k && t.category === c).length; return n ? ` · ${n} lançamento(s)` : ''; }

function learnedHtml() {
  const s = ctx.state;
  const part = k => {
    const c = new Categorizer(s, k, ctx.dict), w = c.learnedWords();
    return `<small class="eyebrow">${k === 'expense' ? 'Despesas' : 'Receitas'} · ${c.trainingSize} lançamento(s) analisado(s)</small>
      ${w.length ? `<div class="manageList">${w.map(([cat, ws]) => manage(cat, ws.map(([x, n]) => `${x} (${n})`).join(', '), '')).join('')}</div>` : '<p class="muted small">Ainda não há palavras repetidas o suficiente.</p>'}`;
  };
  return `<p class="muted small">O aprendizado vem dos seus próprios lançamentos (que ficam criptografados no aparelho). Não existe uma cópia separada: corrigir a categoria de um lançamento corrige o aprendizado, e apagar o lançamento apaga o que ele ensinou.</p>
    ${part('expense')}${part('income')}
    <p class="muted small">Dicionário inicial: ${ctx.dict ? ctx.dict.sections.length : 0} seções, arquivo aberto assistente/dicionario.txt. As regras de cada função estão descritas em ASSISTENTE.md no código-fonte.</p>`;
}

// links do Sobre: abrem em nova aba, sem enviar a página de origem (rel noreferrer)
const REPO_WEB = 'https://github.com/finanplus-web/finan_plus';
const REPO_LINUX = 'https://github.com/finanplus-web/finan_plus_linux';
const LINUX_DOWNLOAD = 'https://github.com/finanplus-web/finan_plus_linux/releases/latest';
const extLink = (href, ic, title, sub) => `<a class="extLink" href="${attr(href)}" target="_blank" rel="noopener noreferrer">${icon(ic, 22)}<span><b>${esc(title)}</b><small>${esc(sub)}</small></span>${icon('open-in-new', 18)}</a>`;

function aboutHtml(env) {
  const paras = [
    'Finan+ é um aplicativo para gerenciamento financeiro pessoal, desenvolvido com foco em simplicidade, privacidade, leveza e funcionamento offline.',
    'O aplicativo permite organizar receitas, despesas, contas, cartões, categorias, limites mensais, metas e lançamentos recorrentes, além de acompanhar saldos e relatórios financeiros.',
    'Esta é a versão web (PWA): funciona no navegador do celular ou do computador, pode ser instalada como aplicativo e continua funcionando sem internet. Os dados ficam no aparelho, criptografados com AES-256-GCM e chave não extraível guardada pelo próprio navegador, sem conta, cadastro ou servidor.',
    'Inclui avisos de vencimento, bloqueio por PIN, relatório em PDF e backup em JSON compatível com o app Android e com a versão Linux.',
    'O assistente (sugestão de categoria, resumo do mês, dicas de economia e perguntas rápidas) funciona inteiro no aparelho, sem internet e sem modelo de IA externo: são regras e um classificador simples, com código aberto e explicação em cada resposta.',
    'A interface combina conceitos do Material 3 com elementos visuais inspirados em Liquid Glass, com layout próprio para computador e notebook e os temas Gruvbox, OLED, Gruvbox OLED, Tokyo Night e Nord.',
  ];
  return `${paras.map(p => `<p class="muted">${esc(p)}</p>`).join('')}
    <p><b>Privacidade em primeiro lugar: seus dados financeiros permanecem no seu dispositivo.</b></p>
    <h4 class="subhead">Desenvolvimento</h4>
    <p class="muted">Finan+ é um projeto independente desenvolvido de forma colaborativa com auxílio de inteligência artificial. A concepção, as decisões de produto, os testes e o direcionamento da experiência são realizados por Juscelino Be, autor e idealizador do projeto, enquanto a inteligência artificial auxilia na implementação, revisão e evolução do código.</p>
    <div class="soft">${eyebrow('Idealizado e desenvolvido por')}<b class="big">Juscelino Be</b></div>
    <h4 class="subhead">Licença</h4>
    <p class="muted pre">Finan+ — Copyright (C) 2026 Juscelino Be.

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os termos da Licença Pública Geral GNU (GNU GPL), publicada pela Free Software Foundation, na versão 3 da licença ou (a seu critério) qualquer versão posterior.

Este programa é distribuído na esperança de que seja útil, mas SEM NENHUMA GARANTIA, nem mesmo a garantia implícita de COMERCIABILIDADE ou de ADEQUAÇÃO A UMA FINALIDADE ESPECÍFICA. Veja a licença completa para mais detalhes.</p>
    <details class="license" data-src="licenca/LICENSE.txt"><summary>${icon('expand-more', 18)}Ver licença completa (GNU GPL v3)</summary><pre class="licenseText">Carregando…</pre></details>
    <p class="muted">Ícones: Material Symbols, © Google, sob a Licença Apache 2.0 (compatível com a GPL v3).</p>
    <details class="license" data-src="licenca/APACHE-2.0.txt"><summary>${icon('expand-more', 18)}Ver licença dos ícones (Apache 2.0)</summary><pre class="licenseText">Carregando…</pre></details>
    <h4 class="subhead">Código-fonte e outras versões</h4>
    <p class="muted">O código do Finan+ é aberto. Aqui estão o repositório desta versão web e a versão para computadores Linux, com os mesmos recursos e backup compatível.</p>
    <div class="linkList">
      ${extLink(REPO_WEB, 'code', 'Código-fonte do Finan+ web (PWA)', 'github.com/finanplus-web/finan_plus')}
      ${extLink(LINUX_DOWNLOAD, 'computer', 'Baixar para Linux (.deb)', 'Ubuntu 24.04+, Linux Mint 22, Debian 13, KDE neon')}
      ${extLink(REPO_LINUX, 'code', 'Código-fonte do Finan+ para Linux', 'github.com/finanplus-web/finan_plus_linux')}
    </div>
    <p class="muted small">Também publicado junto com o app, na pasta js/ (módulos legíveis; js/app.bundle.js é a junção deles, sem minificar). ${env.storageNote || ''}</p>
    <div class="btnGrid">${btn('Atalhos de teclado', { act: 'shortcuts', icon: 'keyboard', iconSize: 18 })}${btn('Novidades desta versão', { act: 'whatsnew', icon: 'history', iconSize: 18 })}</div>`;
}

// ================================================================== barra lateral, topo e navegação
export const NAV = [
  ['home', 'Início', 'home', 'home-fill'], ['moves', 'Lançamentos', 'swap-horiz', 'swap-horiz-fill'], ['money', 'Meu dinheiro', 'account-balance', 'account-balance'],
  ['reports', 'Resumo', 'pie-chart', 'pie-chart-fill'], ['assist', 'Assistente', 'auto-awesome', 'auto-awesome'], ['prefs', 'Ajustes', 'settings', 'settings-fill'],
];
export const VIEW_TITLES = { home: 'Início', moves: 'Lançamentos', money: 'Meu dinheiro', reports: 'Resumo', assist: 'Assistente', prefs: 'Ajustes' };

export function sideNavHtml() {
  return NAV.map(([id, label, ic, icOn], i) => `<button type="button" class="${ctx.view === id ? 'active' : ''}" data-act="go" data-view="${id}" aria-current="${ctx.view === id ? 'page' : 'false'}">
    ${icon(ctx.view === id ? icOn : ic, 22)}<span>${label}</span><kbd>${i + 1}</kbd></button>`).join('');
}
export function sideFootHtml() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today);
  const bal = Finance.currentBalance(s), fut = Finance.futureBalance(s, ymLast(ym), today);
  return `<div class="sideBal"><small>Saldo atual</small><b class="${bal < 0 ? 'negative' : ''}">${money(bal)}</b>
    <small>Previsto para ${ymLen(ym)}/${String(ym % 12 + 1).padStart(2, '0')}</small><b class="future ${fut < 0 ? 'negative' : ''}">${money(fut)}</b></div>
    <div class="sideTools">${btn('', { act: 'toggle-privacy', cls: 'icon small', icon: s.privacy ? 'visibility' : 'visibility-off', label: s.privacy ? 'Mostrar valores (Ctrl+H)' : 'Ocultar valores (Ctrl+H)' })}
    ${ctx.device.pinHash ? btn('', { act: 'lock', cls: 'icon small', icon: 'lock', label: 'Bloquear agora (Ctrl+L)' }) : ''}
    ${btn('', { act: 'shortcuts', cls: 'icon small', icon: 'keyboard', label: 'Atalhos de teclado (?)' })}</div>
    <small class="sideNote">${icon('shield', 12)} ${ctx.remote ? 'Dados no celular (conexão segura)' : 'Dados só neste aparelho'}</small>`;
}
export function topbarHtml() {
  const s = ctx.state;
  const title = ctx.view === 'home' ? `<div><small class="eyebrow">Controle financeiro</small><h1>Finan+</h1></div>` : `<div><small class="eyebrow">Finan+</small><h1>${VIEW_TITLES[ctx.view]}</h1></div>`;
  return `<div class="topTitle">${title}</div><div class="topActions">
    ${btn('Despesa', { act: 'new-tx', data: { kind: 'expense' }, cls: 'soft', icon: 'remove', iconSize: 18 })}
    ${btn('Receita', { act: 'new-tx', data: { kind: 'income' }, cls: 'primary', icon: 'add', iconSize: 18 })}
    ${btn('', { act: 'search', cls: 'icon', icon: 'search', label: 'Buscar lançamentos (Ctrl+F)' })}
    ${btn('', { act: 'toggle-privacy', cls: 'icon', icon: s.privacy ? 'visibility' : 'visibility-off', label: s.privacy ? 'Mostrar valores (Ctrl+H)' : 'Ocultar valores (Ctrl+H)' })}
    ${ctx.device.pinHash ? btn('', { act: 'lock', cls: 'icon', icon: 'lock', label: 'Bloquear agora (Ctrl+L)' }) : ''}
    <div class="menuWrap">${btn('', { act: 'menu', cls: 'icon', icon: 'more-horiz', label: 'Mais opções', id: 'menuBtn' })}
      <div class="menu glass" id="menu" role="menu" hidden>
        ${[['pdf', 'Relatório em PDF', 'picture-as-pdf', 'Ctrl+P'], ['csv', 'Exportar CSV', 'table-view', 'Ctrl+E'], ['backup', 'Salvar backup JSON', 'download', 'Ctrl+S'], ['restore', 'Restaurar backup', 'upload', 'Ctrl+O'], ['shortcuts', 'Atalhos de teclado', 'keyboard', 'Ctrl+/'], ['about', 'Sobre o Finan+', 'info', '']]
          .map(([a, l, ic, k]) => `<button type="button" role="menuitem" data-act="${a}">${icon(ic, 18)}<span>${l}</span>${k ? `<kbd>${k}</kbd>` : ''}</button>`).join('')}
      </div></div></div>`;
}
export function mobileHeaderHtml() {
  const s = ctx.state;
  return `<div><h1>Finan+</h1><small class="headTag">Seu dinheiro, sem complicação.</small><small class="headDate">${esc(MonthCalendar.dayTitle(ctx.today, ctx.today))}</small></div><div class="headTools">
    <button type="button" class="privacyPill${s.privacy ? ' on' : ''}" data-act="toggle-privacy" aria-label="${s.privacy ? 'Mostrar valores financeiros' : 'Ocultar valores financeiros'}">${icon('shield', 15)}<span>${s.privacy ? 'Mostrar valores' : 'Ocultar valores'}</span></button></div>`;
}
export function bottomNavHtml() {
  const item = id => { const [, label, ic, icOn] = NAV.find(n => n[0] === id); const on = ctx.view === id || (id === 'home' && ctx.view === 'assist'); return `<button type="button" class="${on ? 'active' : ''}" data-act="go" data-view="${id}" aria-current="${on ? 'page' : 'false'}">${icon(on ? icOn : ic, 22)}<span>${label}</span></button>`; };
  return `${item('home')}${item('moves')}${item('money')}${item('reports')}${item('prefs')}`;
}
/** botão + flutuante (celular), só em Início e Lançamentos: abre Despesa, Receita ou Nova recorrência */
export function fabHtml() {
  return ctx.view === 'home' || ctx.view === 'moves'
    ? `<button type="button" class="fab floatFab" data-act="add-choice" aria-label="Adicionar movimentação">${icon('add', 26)}</button>` : '';
}

export { cap, MONTHS, CARD_PAYMENT_CAT };
