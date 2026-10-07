// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Telas do Finan+ web: Início, Lançamentos, Relatórios, Assistente e Ajustes.
// Cada tela só gera HTML; os cliques passam por data-act (tratados em app.js).
// No computador as telas se dividem em 2 ou 3 colunas (ctx.cols); no celular, uma.
import {
  Finance, isCard, isFlow, ymOf, ymFirst, ymLast, ymLen, addDays, brDate, brDayMonth, brMonthLabel, brMonthYear, fullDate,
  MONTHS, MONTHS_SHORT, THEMES, themeLabel, AUTOLOCK_OPTIONS, account, card, CARD_PAYMENT_CAT, Money,
} from './core.js';
import { Insights, Ask, ASK_EXAMPLES, Categorizer, Text, INSIGHT_LABELS } from './assist.js';
import { compact } from './report.js';
import { PDF_SERIES } from './pdf.js';
import { icon } from './icons.js';
import { esc, attr, btn, eyebrow, pageTitle, why, check } from './ui.js';
import { ctx, money, hidden, categoryIcon, APP_VERSION } from './ctx.js';

const pct1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const pct0 = v => String(Math.round(v));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const sumOf = l => l.reduce((n, t) => n + t.value, 0);
const cols = (...c) => ctx.cols === 1 ? c.flat().join('') : `<div class="cols cols${c.length}">${c.map(x => `<div class="col">${x.join('')}</div>`).join('')}</div>`;
const sectionHead = (eb, title, action = '') => `<div class="sectionHead"><div>${eyebrow(eb)}<h3>${esc(title)}</h3></div>${action}</div>`;
const glyph = cat => {
  const ic = categoryIcon(cat);
  return `<span class="badge" aria-hidden="true">${ic ? icon(ic, 20) : esc([...String(cat).trim()][0]?.toUpperCase() || '•')}</span>`;
};
export const assistOn = () => ctx.device.assistTips || ctx.device.assistAsk;
const visibleTips = (all) => all.filter(t => !ctx.device.dismissedTips.includes(t.id));

// ================================================================== Início
export function homeView() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today);
  const bal = Finance.currentBalance(s), fut = Finance.futureBalance(s, ymLast(ym), today);
  const fl = Finance.monthFlow(s, ym);
  const used = fl.income > 0 ? fl.expense * 100 / fl.income : 0;
  const saved = fl.income > 0 ? Math.max(0, (fl.income - fl.expense) * 100 / fl.income) : 0;
  const summary = fl.income > 0 ? `Neste mês você usou ${pct1(used)}% das receitas.`
    : s.txs.length ? 'Ainda não há receitas realizadas neste mês.' : 'Adicione seus primeiros lançamentos.';
  const hero = `<section class="hero glass" aria-label="Resumo do mês">
    <div class="heroTop"><span class="todayLabel" id="todayLabel">${esc(fullDate(today))}</span><span class="statusPill">${icon('shield', 14)}Privado</span></div>
    <div class="balanceGrid">
      <div class="balanceCard"><span>Saldo atual</span><b class="${bal < 0 ? 'negative' : ''}">${money(bal)}</b></div>
      <div class="balanceCard future"><span>Previsto p/ fim do mês</span><b class="${fut < 0 ? 'negative' : ''}">${money(fut)}</b></div>
    </div>
    <div class="stats">
      <div><span>${icon('arrow-upward', 14)}Receitas do mês</span><b class="green">${money(fl.income)}</b></div>
      <div><span>${icon('arrow-downward', 14)}Despesas do mês</span><b class="red">${money(fl.expense)}</b></div>
    </div>
    <div class="progress" role="progressbar" aria-label="Receitas usadas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, used))}"><i style="width:${Math.min(100, used)}%"${used > 100 ? ' class="over"' : ''}></i></div>
    <div class="monthProgressText"><small>${esc(summary)}</small>${fl.income > 0 ? `<b class="savedPill">${pct0(saved)}% economizado</b>` : ''}</div>
  </section>`;
  const quick = `<section class="quick" aria-label="Ações rápidas">
    ${btn('Receita', { act: 'new-tx', data: { kind: 'income' }, icon: 'add' })}
    ${btn('Despesa', { act: 'new-tx', data: { kind: 'expense' }, icon: 'remove' })}
    ${btn('Meta', { act: 'new-goal', icon: 'flag' })}</section>`;
  const blocks = { hero: hero + quick, due: dueCard(), assist: homeAssistCard(), wallet: walletSection(), limits: limitsSection(), goals: goalsSection() };
  const order3 = [[blocks.hero, blocks.due], [blocks.assist, blocks.wallet], [blocks.limits, blocks.goals]];
  const order2 = [[blocks.hero, blocks.due, blocks.limits], [blocks.assist, blocks.wallet, blocks.goals]];
  const body = ctx.cols >= 3 ? cols(...order3) : ctx.cols === 2 ? cols(...order2)
    : [blocks.hero, blocks.due, blocks.assist, blocks.wallet, blocks.limits, blocks.goals].join('');
  return `<h2 id="homeTitle" class="srOnly">Início</h2>${body}`;
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
  const list = upcoming(ctx.state, ctx.today);
  if (!list.length && ctx.cols === 1) return '';
  const rows = list.slice(0, 8).map(r => {
    const ic = r.kind === 'invoice' ? 'credit-card' : r.kind === 'income' ? 'arrow-upward' : 'receipt-long';
    const when = r.date === ctx.today ? 'hoje' : r.date === addDays(ctx.today, 1) ? 'amanhã' : brDayMonth(r.date);
    return `<button type="button" class="dueRow${r.late ? ' late' : ''}" data-act="${r.act}" data-id="${attr(r.id)}">
      <span class="dueIc ${r.kind}">${icon(ic, 18)}</span>
      <span class="meta"><b>${esc(r.title)}</b><small>${esc(r.sub)} · ${r.late ? `<span class="red">em atraso desde ${brDayMonth(r.date)}</span>` : `vence ${esc(when)}`}</small></span>
      <span class="amount ${r.kind === 'income' ? 'green' : ''}">${r.kind === 'income' ? '+' : ''}${money(r.amount)}</span></button>`;
  }).join('');
  return `<section class="section">${sectionHead('Próximos 30 dias', 'Vencimentos', list.length ? btn('Ver todos', { act: 'open-moves', data: { st: 'pending' }, cls: 'soft small' }) : '')}
    <div class="glass compactBox dueList">${rows || '<p class="muted center">Nada a pagar ou receber nos próximos 30 dias.</p>'}
    ${list.length > 8 ? `<p class="muted small center">e mais ${list.length - 8} vencimento(s)</p>` : ''}</div></section>`;
}

function homeAssistCard() {
  const d = ctx.device;
  if (!assistOn()) return '';
  const s = ctx.state, today = ctx.today;
  let inner = '';
  let tips = [];
  if (d.assistTips) {
    const rep = Insights.report(s, today, money);
    tips = visibleTips(Insights.tips(s, today, money));
    inner = `<h3>${esc(rep.title)}</h3><ul class="reportLines">${rep.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>${why(rep.why)}
      ${tips.slice(0, 2).map(tipItem).join('')}
      ${!tips.length && s.txs.length ? '<p class="muted small">Nenhuma dica no momento: nada fora do padrão.</p>' : ''}`;
  } else inner = '<h3>Pergunte sobre seus gastos</h3>';
  return `<section class="glass assistCard" aria-label="Assistente">
    <div class="assistHead">${icon('auto-awesome', 16)}<small class="eyebrow">Assistente · no aparelho</small></div>${inner}
    <div class="pillRow">${d.assistTips ? btn(tips.length > 2 ? `Ver as ${tips.length} dicas` : 'Abrir assistente', { act: 'go', data: { view: 'assist' }, cls: 'pill' }) : ''}
    ${d.assistAsk ? btn('Perguntar', { act: 'go', data: { view: 'assist', focus: 'ask' }, cls: 'pill', icon: 'search', iconSize: 16 }) : ''}</div></section>`;
}

export function tipItem(t, o = {}) {
  const canOpen = t.query != null || t.from != null;
  return `<article class="tip${o.dismissed ? ' dismissed' : ''}">
    <div class="tipHead"><span class="tipType">${esc(INSIGHT_LABELS[t.type])}</span>
      ${o.dismissed ? btn('Mostrar de novo', { act: 'restore-tip', data: { id: t.id }, cls: 'link small' }) : btn('', { act: 'dismiss-tip', data: { id: t.id }, cls: 'icon tiny', icon: 'close', iconSize: 16, label: 'Dispensar dica' })}</div>
    <b>${esc(t.title)}</b><p>${esc(t.text)}</p>
    <div class="tipFoot">${why(t.why)}${canOpen && !o.dismissed ? btn('Ver lançamentos', { act: 'open-moves', data: { q: t.query ?? '', from: t.from ?? '', to: t.to ?? '' }, cls: 'link small', icon: 'chevron-right', iconSize: 16 }) : ''}</div></article>`;
}

function walletSection() {
  const s = ctx.state, today = ctx.today;
  const accs = s.accounts.map(a => { const b = Finance.accountBalance(s, a); return `<button type="button" class="walletCard" data-act="edit-account" data-id="${attr(a.id)}">
    <small>${icon('account-balance-wallet', 14)}Conta</small><b class="${b < 0 ? 'negative' : ''}">${money(b)}</b><span class="sub">${esc(a.name)}</span></button>`; }).join('');
  const cards = s.cards.map(c => {
    const st = Finance.cardStatus(s, c, today), cur = st.current;
    return `<div class="walletCard cardItem"><small>${icon('credit-card', 14)}${esc(c.name)}</small>
      <b>${cur ? money(cur.open) : money(0)}</b>
      <span class="sub">${cur ? `Fatura ${esc(brMonthLabel(cur.ym))} · vence ${brDayMonth(cur.due)}${cur.closed ? ' · fechada' : ''}` : 'Sem fatura em aberto'}</span>
      <span class="sub">Disponível ${money(st.available)}</span>
      <div class="cardActions">${cur ? btn('Pagar fatura', { act: 'pay-invoice', data: { id: c.id }, cls: 'primary small' }) : ''}${btn('', { act: 'edit-card', data: { id: c.id }, cls: 'icon tiny', icon: 'edit', iconSize: 16, label: `Editar cartão ${c.name}` })}</div></div>`;
  }).join('');
  return `<section class="section">${sectionHead('Patrimônio', 'Contas e cartões', btn('Gerenciar', { act: 'go', data: { view: 'prefs', fold: 'contas' }, cls: 'soft small' }))}
    <div class="${ctx.cols === 1 ? 'hscroll' : 'walletGrid'}">${accs}${cards}</div></section>`;
}

function limitsSection() {
  const s = ctx.state, usage = Finance.budgetUsage(s, ymOf(ctx.today));
  const rows = [...s.limits].map(([cat, lim]) => {
    const u = usage.get(cat) || 0, p = lim > 0 ? u * 100 / lim : 0;
    const cls = u > lim ? 'over' : p >= 80 ? 'warn' : '';
    const status = u > lim ? 'Limite ultrapassado' : p >= 100 ? 'Limite atingido' : p >= 80 ? `Atenção: ${pct0(p)}% usado` : `${pct0(p)}% usado`;
    return `<button type="button" class="budgetLine ${cls}" data-act="edit-limit" data-cat="${attr(cat)}">
      <div><b>${esc(cat)}</b><span>${money(u)} / ${money(lim)}</span></div>
      <div class="budgetTrack"><i style="width:${Math.min(100, p)}%"></i></div><small>${status}</small></button>`;
  }).join('');
  return `<section class="section">${sectionHead('Orçamento · inclui pendentes', 'Limites do mês', btn('', { act: 'new-limit', cls: 'icon small', icon: 'add', label: 'Novo limite' }))}
    <div class="glass compactBox">${rows || '<p class="muted small">Defina limites em Ajustes para acompanhar seu orçamento.</p>'}</div></section>`;
}

function goalsSection() {
  const s = ctx.state;
  const rows = s.goals.map(g => {
    const p = g.target > 0 ? Math.min(100, g.saved * 100 / g.target) : 0, plan = Finance.goalPlan(g, ctx.today);
    const info = (g.deadline ? `Até ${brDate(g.deadline)}` : 'Sem prazo') + (plan.pastDue ? ' · prazo vencido' : '');
    const planTxt = plan.done ? `${icon('check', 14)} Meta atingida` : [
      plan.needed != null ? `Precisa de ${esc(money(plan.needed))}/mês` : null,
      plan.eta != null ? `Plano: conclui em ${esc(brMonthLabel(plan.eta))}${plan.late ? ` ${icon('warning', 14)} após o prazo` : ''}` : null,
    ].filter(Boolean).join(' · ');
    return `<button type="button" class="tx goal" data-act="edit-goal" data-id="${attr(g.id)}">
      <div class="goalTop"><b>${esc(g.name)}</b><span>${money(g.saved)} / ${money(g.target)}</span></div>
      <div class="bar2"><i style="width:${p}%"></i></div>
      <div class="goalInfo"><span>${esc(info)}</span><span>${pct0(p)}%</span></div>${planTxt ? `<small class="goalPlan">${planTxt}</small>` : ''}</button>`;
  }).join('');
  return `<section class="section">${sectionHead('Objetivos', 'Metas', btn('', { act: 'new-goal', cls: 'icon small', icon: 'add', label: 'Nova meta' }))}
    <div class="list">${rows || `<div class="empty glass"><span>Crie uma meta com o botão “Meta”.</span></div>`}</div></section>`;
}

// ================================================================== Lançamentos
export function movesDefaults() {
  const ym = ymOf(ctx.today);
  if (!ctx.moves.from && !ctx.moves.to && !ctx.moves.all) { ctx.moves.from = ymFirst(ym); ctx.moves.to = ymLast(ym); }
}
export function filteredTxs() {
  const f = ctx.moves, q = Text.fold(f.q);
  return ctx.state.txs.filter(t => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to)
    && (!f.kind || t.kind === f.kind) && (!f.st || (f.st === 'paid' ? t.paid : !t.paid))
    && (!q || Text.fold(t.desc + ' ' + t.category).includes(q)))
    .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
}

export function movesView() {
  movesDefaults();
  const f = ctx.moves;
  const panel = `<section class="period glass" aria-label="Período">
      <div class="periodFields"><label class="field"><span>De</span><input type="date" id="fromDate" value="${attr(f.from || '')}"></label><span aria-hidden="true">${icon('arrow-back', 16, 'flip')}</span>
      <label class="field"><span>Até</span><input type="date" id="toDate" value="${attr(f.to || '')}"></label></div>
      <div class="presetRow">${btn('Este mês', { act: 'moves-preset', data: { p: 'month' } })}${btn('30 dias', { act: 'moves-preset', data: { p: '30' } })}${btn('Tudo', { act: 'moves-preset', data: { p: 'all' } })}</div></section>
    <section class="filterPanel glass" aria-label="Filtros"><small class="eyebrow">Filtros da lista</small>
      <div class="searchField">${icon('search', 20)}<input id="q" type="search" placeholder="Buscar lançamentos…" aria-label="Buscar lançamentos (descrição ou categoria)" value="${attr(f.q)}" maxlength="60"></div>
      <div class="filterSelects">
        <select id="kindF" aria-label="Tipo de lançamento"><option value="">Todos os tipos</option><option value="income"${f.kind === 'income' ? ' selected' : ''}>Receitas</option><option value="expense"${f.kind === 'expense' ? ' selected' : ''}>Despesas</option></select>
        <select id="stF" aria-label="Situação"><option value="">Pagos e pendentes</option><option value="paid"${f.st === 'paid' ? ' selected' : ''}>Só realizados</option><option value="pending"${f.st === 'pending' ? ' selected' : ''}>Só pendentes</option></select></div></section>
    <div id="movesTotals"></div>`;
  const list = `<section class="section listSection"><div class="sectionHead"><div>${eyebrow('No período')}<h3>Todos os lançamentos</h3></div><b id="periodCount" class="countPill">0</b></div>
    <div id="periodTransactions" class="list"></div></section>`;
  const title = pageTitle('movesTitle', 'Movimentações', 'Lançamentos', 'Compare suas receitas e despesas em qualquer período.');
  return title + (ctx.cols === 1 ? panel + list : `<div class="movesGrid"><aside class="movesAside">${panel}</aside><div>${list}</div></div>`);
}

export function movesData() {
  const all = filteredTxs(), f = ctx.moves;
  const fl = Finance.flow(all), total = fl.income + fl.expense, bal = fl.income - fl.expense;
  const pending = all.filter(t => !t.paid && isFlow(t));
  const pi = sumOf(pending.filter(t => t.kind === 'income')), pe = sumOf(pending.filter(t => t.kind === 'expense'));
  const text = fl.income > 0 ? `As despesas representam ${pct1(fl.expense * 100 / fl.income)}% das receitas do período.`
    : fl.expense > 0 ? 'Há despesas, mas nenhuma receita neste período.' : 'Nenhuma movimentação no período selecionado.';
  const pend = !pending.length ? '' : hidden() ? ' Há valores pendentes.' : ` Pendente: a receber ${Money.format(pi)} · a pagar ${Money.format(pe)}.`;
  const bar = (label, v, cls) => { const p = total > 0 ? Math.round(v * 100 / total) : 0; return `<div class="barRow ${cls}"><span>${label}</span><div><i style="width:${p}%"></i></div><b>${p}%</b></div>`; };
  const totals = `<section class="compareCards">
      <article class="compare glass"><span>${icon('arrow-upward', 14)}Receitas</span><b class="green">${money(fl.income)}</b></article>
      <article class="compare glass"><span>${icon('arrow-downward', 14)}Despesas</span><b class="red">${money(fl.expense)}</b></article>
      <article class="compare balance glass"><span>Saldo do período</span><b class="${bal < 0 ? 'negative' : ''}">${money(bal)}</b></article></section>
    <section class="comparison glass"><div class="compareHead"><div>${eyebrow('Comparação')}<h3>Receitas × despesas</h3></div><b>${fl.income > 0 ? `${Math.trunc(fl.expense * 100 / fl.income)}% gasto` : '—'}</b></div>
      ${bar('Receitas', fl.income, '')}${bar('Despesas', fl.expense, 'expenseBar')}<small>${esc(text + pend)}</small></section>`;
  const shown = all.slice(0, f.limit);
  const rows = shown.map(txRow).join('');
  return {
    totals, count: all.length,
    list: rows ? rows + (all.length > shown.length ? btn(`Mostrar mais (${all.length - shown.length} restantes)`, { act: 'moves-more', cls: 'soft wide' }) : '')
      : `<div class="empty glass"><b>Nenhum lançamento neste período</b><span>Altere as datas ou adicione uma movimentação.</span></div>`,
  };
}

export function txRow(t) {
  const s = ctx.state, payment = !isFlow(t), cardT = isCard(t);
  const where = cardT ? `Cartão ${card(s, t.cardId)?.name ?? ''}` : account(s, t.accountId)?.name ?? '';
  const late = !t.paid && !cardT && t.date < ctx.today;
  const status = payment ? 'Pagamento de fatura' : cardT ? '' : t.paid ? '' : late ? '<span class="red">Em atraso</span>' : (t.kind === 'income' ? 'A receber' : 'A pagar');
  const meta = [esc(t.category), esc(where), brDate(t.date), status].filter(Boolean).join(' · ');
  const toggle = cardT ? `<span class="chk card" title="Compra no cartão">${icon('credit-card', 16)}</span>`
    : payment ? `<span class="chk on" title="Pagamento de fatura">${icon('check', 16)}</span>`
      : `<button type="button" class="chk${t.paid ? ' on' : ''}" data-act="toggle-paid" data-id="${attr(t.id)}" aria-pressed="${t.paid}" aria-label="${t.paid ? (t.kind === 'income' ? 'Recebido' : 'Pago') : (t.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago')}: ${attr(t.desc)}">${icon('check', 16)}</button>`;
  return `<div class="tx ${t.kind}${t.paid ? '' : ' pending'}${payment ? ' payment' : ''}" data-act="edit-tx" data-id="${attr(t.id)}" role="button" tabindex="0" aria-label="${attr(t.desc)}, ${t.kind === 'income' ? 'receita' : 'despesa'} de ${attr(money(t.value))} em ${brDate(t.date)}">
    ${glyph(t.category)}<span class="meta"><b>${esc(t.desc)}</b><small>${meta}</small></span>
    <span class="amount">${t.kind === 'income' ? '+' : '−'}${money(t.value)}</span>${toggle}</div>`;
}

// ================================================================== Relatórios
export function reportsView() {
  movesDefaults();
  const s = ctx.state, f = ctx.moves, today = ctx.today, ym = ymOf(today);
  const period = !f.from && !f.to ? 'Todo o histórico.' : `Período: ${f.from ? brDate(f.from) : 'início'} a ${f.to ? brDate(f.to) : 'hoje'} (datas da aba Lançamentos).`;
  const cats = Finance.categoryTotals(s, f.from, f.to), total = cats.reduce((n, [, v]) => n + v, 0);
  const slices = cats.slice(0, 7).map(([n, v]) => [n, v]);
  if (cats.length > 7) slices.push([`Outras (${cats.length - 7})`, cats.slice(7).reduce((n, [, v]) => n + v, 0)]);
  const catCard = `<section class="comparison glass">${eyebrow('Despesas')}<h3>Por categoria</h3>
    ${cats.length ? `<div class="donutWrap">${donutSvg(slices, total)}<ul class="legend">${slices.map(([n, v], i) => `<li><i style="background:${PDF_SERIES[i % 8]}"></i><span>${esc(n)}</span><b>${money(v)}</b><small>${pct1(total ? v * 100 / total : 0)}%</small></li>`).join('')}</ul></div>
    <div class="catBars">${cats.map(([c, v], i) => {
      const lim = s.limits.get(c), p = total ? v * 100 / total : 0;
      return `<div class="catBar"><div class="catTop">${glyph(c)}<b>${esc(c)}</b><span>${money(v)}</span></div><div class="budgetTrack"><i style="width:${p}%;background:${PDF_SERIES[Math.min(i, 7)]}"></i></div>
        ${lim != null ? `<small class="${v > lim ? 'red' : 'muted'}">${v > lim ? `${icon('warning', 13)} Acima do` : 'Dentro do'} limite mensal de ${esc(money(lim))}</small>` : ''}</div>`;
    }).join('')}</div>` : '<p class="muted small">Sem despesas no período.</p>'}</section>`;
  const months = Finance.lastMonths(s, today, 6), max = Math.max(1, ...months.map(([, m]) => Math.max(m.income, m.expense)));
  const desc = months.map(([m, x]) => brMonthYear(m) + (hidden() ? '' : `: receitas ${Money.format(x.income)}, despesas ${Money.format(x.expense)}`)).join('; ');
  const evo = `<section class="comparison glass">${eyebrow('Evolução')}<h3>Últimos 6 meses</h3>
    <div class="evo${hidden() ? ' sensitive' : ''}" role="img" aria-label="Gráfico de receitas e despesas. ${attr(desc)}">${months.map(([m, x]) => `<div class="evoCol"><div class="pair"><i class="inc" style="height:${x.income * 100 / max}%"></i><i class="exp" style="height:${x.expense * 100 / max}%"></i></div><span>${MONTHS_SHORT[(m % 12)]}</span></div>`).join('')}</div>
    <small class="legendLine"><i class="dot inc"></i>Receitas <i class="dot exp"></i>Despesas</small></section>`;
  const cur = Finance.monthFlow(s, ym), prev = Finance.monthFlow(s, ym - 1);
  const chg = (a, b) => b === 0 ? 'Sem base' : `${icon(a >= b ? 'arrow-upward' : 'arrow-downward', 13)}${pct0(Math.abs((a - b) * 100 / b))}% vs. mês anterior`;
  const cmp = `<section class="comparison glass">${eyebrow('Comparação')}<h3>Este mês × mês anterior</h3>
    <div class="reportStat">${[['Receitas', cur.income, prev.income, 'green'], ['Despesas', cur.expense, prev.expense, 'red']].map(([l, a, b, c]) => `<div><small>${l}</small><b class="${c}">${money(a)}</b><small class="chg">${chg(a, b)}</small></div>`).join('')}</div></section>`;
  const exp = `<section class="comparison glass exportCard"><div><h3>${icon('picture-as-pdf', 20)} Relatório em PDF</h3><p class="muted small">Resumo, gráficos, maiores despesas, contas, metas e a lista de lançamentos de qualquer período. Gerado neste aparelho.</p></div>
    ${btn('Exportar relatório em PDF', { act: 'pdf', cls: 'primary', icon: 'download' })}</section>`;
  const title = pageTitle('reportsTitle', 'Análise', 'Relatórios', `${period} Considera só valores realizados.`);
  return title + (ctx.cols === 1 ? exp + catCard + evo + cmp : cols([catCard], [exp, evo, cmp]));
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

  const accounts = fold('contas', 'Contas e cartões', `${s.accounts.length} conta(s) · ${s.cards.length} cartão(ões)`, `
    <div class="manageList">${s.accounts.map(a => manage(a.name, `Saldo ${money(Finance.accountBalance(s, a))}`, btn('Editar', { act: 'edit-account', data: { id: a.id }, cls: 'soft small' }))).join('')}
    ${s.cards.map(c => { const st = Finance.cardStatus(s, c, ctx.today); return manage(`Cartão ${c.name}`, `Limite ${money(c.limit)} · usado ${money(st.used)} · fecha dia ${c.close} · vence dia ${c.due}`, btn('Editar', { act: 'edit-card', data: { id: c.id }, cls: 'soft small' })); }).join('')}</div>
    <div class="btnGrid">${btn('Conta', { act: 'new-account', icon: 'add', iconSize: 18 })}${btn('Cartão', { act: 'new-card', icon: 'add', iconSize: 18 })}</div>`, 'account-balance-wallet');

  const recurring = fold('recorrencias', 'Recorrências', s.recurring.length ? `${s.recurring.length} recorrência(s) cadastrada(s)` : 'Nenhuma recorrência cadastrada', `
    <div class="foldTools">${btn('Nova', { act: 'new-recurring', icon: 'add', iconSize: 18, cls: 'soft small' })}</div>
    ${s.recurring.length ? `<div class="manageList">${s.recurring.map(r => {
      const where = r.cardId ? `Cartão ${card(s, r.cardId)?.name ?? ''}` : account(s, r.accountId)?.name ?? '';
      return manage(r.desc, `${r.kind === 'income' ? 'Receita' : 'Despesa'} · ${money(r.value)} · dia ${r.day} · ${r.category} · ${where}${r.active ? '' : ' · pausada'}`, btn('Editar', { act: 'edit-recurring', data: { id: r.id }, cls: 'soft small' }));
    }).join('')}</div>` : '<p class="muted small">Você também pode marcar “Repetir mensalmente” ao criar um lançamento.</p>'}`, 'repeat');

  const limits = fold('limites', 'Limites mensais', s.limits.size ? `${s.limits.size} limite(s) definido(s)` : 'Nenhum limite definido', `
    <div class="foldTools">${btn('Adicionar', { act: 'new-limit', icon: 'add', iconSize: 18, cls: 'soft small' })}</div>
    ${s.limits.size ? `<div class="manageList">${[...s.limits].map(([c, v]) => manage(c, `${money(v)} por mês`, btn('Editar', { act: 'edit-limit', data: { cat: c }, cls: 'soft small' }))).join('')}</div>` : '<p class="muted small">Defina apenas os limites que quiser acompanhar. Despesas pendentes do mês também contam.</p>'}`, 'donut-large');

  const catList = (k, label) => `<h4 class="subhead">${label}</h4><div class="manageList">${s.cats[k].map(c => manage(c, `${k === 'expense' ? 'Despesa' : 'Receita'}${categoryUse(k, c)}`,
    btn('', { act: 'rename-cat', data: { kind: k, cat: c }, cls: 'icon tiny', icon: 'edit', iconSize: 16, label: `Renomear ${c}` }) + btn('', { act: 'delete-cat', data: { kind: k, cat: c }, cls: 'icon tiny dangerIc', icon: 'delete', iconSize: 16, label: `Excluir ${c}` }))).join('')}</div>`;
  const cats = fold('categorias', 'Categorias', `${s.cats.expense.length + s.cats.income.length} categorias cadastradas`, `
    <form id="catForm" class="filters" novalidate><input id="newCat" placeholder="Nova categoria" maxlength="40" aria-label="Nova categoria"><select id="newCatKind" aria-label="Tipo da categoria"><option value="expense"${ctx.catKind !== 'income' ? ' selected' : ''}>Despesa</option><option value="income"${ctx.catKind === 'income' ? ' selected' : ''}>Receita</option></select>
    ${btn('Adicionar categoria', { submit: true, cls: 'primary wide' })}</form>${catList('expense', 'Despesas')}${catList('income', 'Receitas')}`, 'category');

  const data = fold('dados', 'Dados', 'Backup, restauração, CSV e relatório em PDF', `
    <div class="btnGrid">${btn('Exportar CSV', { act: 'csv', icon: 'table-view', iconSize: 18 })}${btn('Backup JSON', { act: 'backup', icon: 'download', iconSize: 18 })}
    ${btn('Restaurar', { act: 'restore', icon: 'upload', iconSize: 18 })}${btn('Relatório em PDF', { act: 'pdf', icon: 'picture-as-pdf', iconSize: 18 })}
    ${env.remote ? '' : btn('Apagar tudo', { act: 'wipe', cls: 'dangerB', icon: 'delete', iconSize: 18 })}</div>
    <p class="muted small">O backup JSON é compatível com o app Android e com a versão Linux do Finan+: dá para levar os dados de um para o outro. O arquivo de backup não é criptografado; guarde-o em local seguro.</p>`, 'database');

  const about = fold('sobre', 'Sobre', `Conheça o Finan+ · versão ${APP_VERSION}`, aboutHtml(env), 'info');
  const head = pageTitle('prefsTitle', 'Configurações', 'Ajustes', env.remote ? 'Tudo é salvo no celular, pela rede local.' : env.encrypted ? 'Tudo fica salvo e criptografado neste aparelho.' : 'Tudo fica salvo neste aparelho.');
  const left = [appearance, privacy, notif, assist, about], right = [accounts, recurring, limits, cats, data];
  return head + (ctx.cols === 1 ? [appearance, privacy, notif, assist, accounts, recurring, limits, cats, data, about].join('') : cols(left, right));
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
    'A interface combina conceitos do Material 3 com elementos visuais inspirados em Liquid Glass, com layout próprio para computador e notebook e os temas Material You, OLED, Tokyo Night e Nord.',
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
  ['home', 'Início', 'home', 'home-fill'], ['moves', 'Lançamentos', 'swap-horiz', 'swap-horiz-fill'], ['reports', 'Relatórios', 'pie-chart', 'pie-chart-fill'],
  ['assist', 'Assistente', 'auto-awesome', 'auto-awesome'], ['prefs', 'Ajustes', 'settings', 'settings-fill'],
];
export const VIEW_TITLES = { home: 'Início', moves: 'Lançamentos', reports: 'Relatórios', assist: 'Assistente', prefs: 'Ajustes' };

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
  return `<div><small class="eyebrow">Controle financeiro</small><h1>Finan+</h1></div><div class="headTools">
    ${btn('', { act: 'toggle-privacy', cls: 'icon', icon: s.privacy ? 'visibility' : 'visibility-off', label: s.privacy ? 'Mostrar valores' : 'Ocultar valores' })}
    ${assistOn() ? btn('', { act: 'go', data: { view: 'assist' }, cls: 'icon', icon: 'auto-awesome', label: 'Assistente' }) : ''}</div>`;
}
export function bottomNavHtml() {
  const item = id => { const [, label, ic, icOn] = NAV.find(n => n[0] === id); const on = ctx.view === id || (id === 'home' && ctx.view === 'assist'); return `<button type="button" class="${on ? 'active' : ''}" data-act="go" data-view="${id}" aria-current="${on ? 'page' : 'false'}">${icon(on ? icOn : ic, 22)}<span>${label}</span></button>`; };
  return `${item('home')}${item('moves')}<button type="button" class="fab" data-act="new-tx" data-kind="expense" aria-label="Novo lançamento">${icon('add', 28)}</button>${item('reports')}${item('prefs')}`;
}

export { cap, MONTHS, CARD_PAYMENT_CAT };
