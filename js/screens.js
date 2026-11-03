// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Telas do Finan+ web: Início, Lançamentos, Meu dinheiro, Resumo (relatórios), Assistente e Ajustes.
// Cada tela só gera HTML; os cliques passam por data-act (tratados em app.js).
// No computador as telas se dividem em 2 ou 3 colunas (ctx.cols); no celular, uma.
import {
  Finance, isCard, isFlow, isGoal, isProjected, Projection, ymOf, ymFirst, ymLast, ymLen, addDays, brDate, brDayMonth, brMonthLabel, brMonthYear, fullDate,
  MONTHS, MONTHS_SHORT, THEMES, dom, themeLabel, AUTOLOCK_OPTIONS, account, card, CARD_PAYMENT_CAT, Money,
} from './core.js';
import { Insights, Ask, ASK_EXAMPLES, Categorizer, Text, INSIGHT_LABELS } from './assist.js';
import { compact } from './report.js';
import { PDF_SERIES } from './pdf.js';
import { icon } from './icons.js';
import { esc, attr, btn, eyebrow, pageTitle, why, check, openSheet, closeSheet, toneTile, backLink, selectField, dangerText } from './ui.js';
import { ctx, money, hidden, categoryIcon, catIcon, APP_VERSION } from './ctx.js';
import { Totals } from './totals.js';
import { HomeAdvice } from './homeadvice.js';
import { SummaryView } from './summaryview.js';
import { ScreenRules } from './screenrules.js';
import { TxForm } from './txform.js';
import { Words } from './words.js';
import { MonthCalendar, Period } from './calendar.js';
import { PeriodCompare } from './simulator.js';
import { calendarView, roundBtn } from './calendarview.js';
import { sharedCardSubtitle } from './sharedview.js';
import * as AutoBackup from './autobackup.js';

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

// ================================================================== Início (Android 1.10/1.11; INICIO.md)
/** valor com sinal colado ("+R$ 792,22", "−R$ 10,00"), para comparações */
const signedMoney = c => (c >= 0 ? '+' : '−') + Money.format(Math.abs(c));
/** "dd/MM" */
const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
/** saldo no fim do mês anterior (null sem lançamentos antes deste mês): a base do chip "vs. outubro" */
function prevMonthEnd(s, ym) {
  const first = ymFirst(ym);
  return s.txs.some(t => t.date < first) ? Finance.balanceAt(s, ymLast(ym - 1)) : null;
}
/** tipo do lançamento → tom do ícone: exp (vermelho), inc (verde), goal (âmbar), card (lilás), neutral */
export const txTone = (t, neutral = false) => neutral ? 'neutral' : isGoal(t) ? 'goal' : isCard(t) || t.cardPayment ? 'card' : t.kind === 'income' ? 'inc' : 'exp';
const txIcon = t => isGoal(t) ? 'flag' : t.cardPayment ? 'credit-card' : catIcon(TxForm.displayCategory(t.category));

export function homeView() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today);
  const t = Totals.month(s, ym, today);
  const bal = t.opening, fut = t.closing;
  const fl = Finance.monthFlow(s, ym);
  const used = fl.income > 0 ? fl.expense * 100 / fl.income : 0;
  const saved = fl.income > 0 ? Math.max(0, (fl.income - fl.expense) * 100 / fl.income) : 0;
  const prevEnd = prevMonthEnd(s, ym);
  // o chip some no primeiro mês e com "Ocultar valores"
  const chip = hidden() || prevEnd === null ? '' : `<span class="compareChip ${fut - prevEnd >= 0 ? 'up' : 'down'}">${esc(signedMoney(fut - prevEnd))} vs. ${MONTHS[(ym - 1) % 12]}</span>`;
  const hero = `<section class="hero glass" aria-label="Saldo">
    ${ctx.cols > 1 ? `<div class="heroTop"><span class="todayLabel" id="todayLabel">${esc(MonthCalendar.dayTitle(today, today))}</span><span class="statusPill">${icon('shield', 14)}Privado</span></div>` : ''}
    <div class="balanceMain">${toneTile('account-balance-wallet', 'accent', 46)}<span>Saldo atual</span></div>
    <b class="balanceBig num${bal < 0 ? ' negative' : ''}">${money(bal)}</b>
    <div class="heroDiv" role="presentation"></div>
    <div class="forecastLine"><div class="fcMain"><span class="fcLabel">Previsto em ${dm(ymLast(ym))}
      <button type="button" class="infoBtn" data-act="forecast-info" aria-label="Como o saldo previsto é calculado">${icon('info', 20)}</button></span>
      <b class="fcValue num${fut < 0 ? ' negative' : ''}">${money(fut)}</b></div>${chip}</div>
    ${fl.income > 0 ? `<div class="progress${hidden() ? ' sensitive' : ''}" role="progressbar" aria-label="Despesas sobre as receitas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, used))}"><i style="width:${Math.min(100, used)}%"${used > 100 ? ' class="over"' : ''}></i></div>
    <div class="monthProgressText"><small>${esc(hidden() ? 'Valores ocultos.' : `Despesas equivalem a ${pct1(used)}% das receitas recebidas.`)}</small>${hidden() ? '' : `<b class="savedPill">${pct0(saved)}% economizado</b>`}</div>` : ''}
  </section>`;
  const frac = fl.income > 0 && t.toReceive > 0 ? fl.income * 100 / (fl.income + t.toReceive) : 0;
  const recvFoot = `${frac > 0 ? `<span class="flowBar${hidden() ? ' sensitive' : ''}" aria-hidden="true"><i style="width:${frac}%"></i></span><small class="flowPct">${hidden() ? 'Progresso oculto' : `${pct0(frac)}% recebido`}</small>` : ''}
    <small class="flowPct">${esc(ScreenRules.receiveNote(s, today, hidden()))}</small>`;
  const month = { from: ymFirst(ym), to: ymLast(ym), st: 'pending' };
  const flow = `<div class="flowGrid">
    <button type="button" class="flowCard in" data-act="open-moves" data-from="${month.from}" data-to="${month.to}" data-kind="income" data-st="pending" aria-label="Falta receber ${attr(money(t.toReceive))}. Abrir os valores a receber deste mês em Lançamentos">
      <span class="flowTop">${toneTile('arrow-upward', 'inc', 36)}<span class="flowLabel">Falta receber</span></span><b class="num">${money(t.toReceive)}</b><span class="flowFill"></span>${recvFoot}</button>
    <button type="button" class="flowCard out" data-act="open-moves" data-from="${month.from}" data-to="${month.to}" data-kind="expense" data-st="pending" aria-label="Falta pagar ${attr(money(t.toPay))}. Abrir as contas a pagar deste mês em Lançamentos">
      <span class="flowTop">${toneTile('arrow-downward', 'exp', 36)}<span class="flowLabel">Falta pagar</span></span><b class="num">${money(t.toPay)}</b><span class="flowFill"></span><small class="flowPct">${esc(ScreenRules.payNote(s, today))}</small></button>
  </div>`;
  const top = hero + flow, due = dueCard(), assist = homeAssistCard();
  const body = ctx.cols >= 3 ? cols([top], [assist], [due]) : ctx.cols === 2 ? cols([top, assist], [due]) : top + assist + due;
  return `<h2 id="homeTitle" class="srOnly">Início</h2>${body}`;
}

/** folha do botão "info" do previsto: o valor, a explicação e a conta (só quando fecha com os números da tela) */
export function forecastInfo() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today), t = Totals.month(s, ym, today);
  const math = hidden() ? null : ScreenRules.forecastMath(t);
  openSheet({ title: `Saldo previsto em ${dm(ymLast(ym))}`, body: `<b class="infoBig num${t.closing < 0 ? ' negative' : ' accent'}">${money(t.closing)}</b>
    <p class="muted">Considera valores pendentes (inclusive atrasados), faturas, recorrências e os aportes planejados nas metas que ainda faltam neste mês. O que você já guardou numa meta já saiu do saldo e não é descontado de novo.</p>
    ${math ? `<h4 class="subhead">Como chegamos a esse valor</h4><p class="mathLine num">${esc(math)}</p>` : ''}
    <div class="sheetActions">${btn('Entendi', { cls: 'primary', id: 'infoOk' })}</div>`,
  onMount: d => { d.querySelector('#infoOk').onclick = () => closeSheet(); } });
}

/** Próximos vencimentos: um cartão, grupos por data, linha inteira abre o pagamento (HomeAdvice.upcoming) */
function dueCard() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today), groups = HomeAdvice.upcoming(s, today, 4);
  const more = `<button type="button" class="btn link seeAll" data-act="open-moves" data-from="${ymFirst(ym)}" data-to="${ymLast(ym)}">Ver todos${icon('chevron-right', 18)}</button>`;
  const rows = groups.map(g => `<h4 class="dueGroup${g.overdue ? ' red' : ''}">${esc(ScreenRules.dueGroupLabel(g, today))}</h4>${g.items.map(r => {
    const tone = g.nextMonth ? 'neutral' : 'exp';
    const sub = r.invoice ? 'Fatura do cartão' : Words.ordinal(TxForm.displayCategory(r.category));
    return `<button type="button" class="dueRow" data-act="${r.invoice ? 'pay-invoice' : 'edit-tx'}" data-id="${attr(r.refId)}" aria-label="${attr(`${Words.ordinal(r.title)}, ${money(r.amount)}, ${brDate(r.date)}. Abrir o pagamento`)}">
      ${toneTile(r.invoice ? 'credit-card' : catIcon(TxForm.displayCategory(r.category)), tone, 44)}
      <span class="meta"><b>${esc(Words.ordinal(r.title))}</b><small>${esc(sub)}</small></span>
      <span class="amount num ${g.nextMonth ? 'muted' : 'red'}">${money(r.amount)}</span>${icon('chevron-right', 18)}</button>`;
  }).join('')}`).join('');
  return `<section class="section">${sectionHead(null, 'Próximos vencimentos', groups.length ? more : '')}
    <div class="dueCard glass">${rows || `<div class="dueEmpty">${toneTile('check', 'inc', 40)}<span class="meta"><b>Nenhum pagamento pendente</b><small>Quando houver uma conta ou fatura, ela aparecerá aqui.</small></span></div>`}</div></section>`;
}

/** Assistente no Início: um aviso só (HomeAdvice.risk), senão a frase mais útil que não repete os cartões, senão a dica principal */
function homeAssistCard() {
  const d = ctx.device;
  if (!assistOn()) return '';
  const s = ctx.state, today = ctx.today;
  let inner = '';
  if (d.assistTips) {
    const risk = HomeAdvice.risk(s, today);
    if (risk) {
      const txt = ScreenRules.riskParts(risk, hidden()).map(p => p.tone ? `<b class="${p.tone === 'neg' ? 'red' : 'green'}">${esc(p.text)}</b>` : esc(p.text)).join('');
      inner = `<div class="adviceBox" role="note" aria-label="Atenção ao dia ${+risk.day.slice(8, 10)}">${toneTile('warning', 'exp', 40)}<p>${txt}</p></div>`;
    } else {
      const rep = Insights.report(s, today, money);
      const line = [...rep.highlights, ...rep.lines].find(l => !HomeAdvice.repeatsCards(l));
      const tips = visibleTips(Insights.tips(s, today, money));
      inner = line ? `<div class="adviceBox">${toneTile('receipt-long', 'accent', 40)}<p>${esc(line)}</p></div>` : tips[0] ? tipItem(tips[0]) : '';
    }
  } else inner = '<p class="assistAskTxt">Pergunte sobre seus gastos.</p>';
  return `<section class="glass assistCard" aria-label="Assistente">
    <div class="assistHead">${icon('auto-awesome', 22)}<h3 class="assistTitle">Assistente</h3></div>${inner}
    <button type="button" class="btn link moreLink" data-act="go" data-view="assist"${d.assistTips ? '' : ' data-focus="ask"'}><span>${d.assistTips ? 'Abrir assistente' : 'Perguntar'}</span>${icon('chevron-right', 18)}</button></section>`;
}

export function tipItem(t, o = {}) {
  const canOpen = t.query != null || t.from != null;
  return `<article class="tip${o.dismissed ? ' dismissed' : ''}">
    <div class="tipHead"><span class="tipType">${esc(INSIGHT_LABELS[t.type])}</span>
      ${o.dismissed ? btn('Mostrar de novo', { act: 'restore-tip', data: { id: t.id }, cls: 'link small' }) : btn('', { act: 'dismiss-tip', data: { id: t.id }, cls: 'icon tiny', icon: 'close', iconSize: 16, label: 'Dispensar dica' })}</div>
    <b>${esc(t.title)}</b><p>${esc(t.text)}</p>
    <div class="tipFoot">${why(t.why)}${canOpen && !o.dismissed ? btn('Ver lançamentos', { act: 'open-moves', data: { q: t.query ?? '', from: t.from ?? '', to: t.to ?? '' }, cls: 'link small', icon: 'chevron-right', iconSize: 16 }) : ''}</div></article>`;
}

// Meu dinheiro: moneyscreens.js (resumo, alerta de meta e as páginas Contas e cartões, Dívidas, Limites, Metas e Categorias)
export { moneyView } from './moneyscreens.js';

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
  const filtered = !!(f.kind || f.st || String(f.q || '').trim());
  const ym = Period.fullMonth(f.from, f.to);
  // mês inteiro sem filtro: os números do glossário único (os mesmos do Início, do calendário e do Resumo)
  const totals = ym != null && !filtered ? monthSummaryHtml(Totals.month(ctx.state, ym, today), !!ctx.device.accumulateBalance) : periodSummaryHtml(all);
  // lista agrupada por dia (mais recentes primeiro), com o total de cada dia pela mesma regra do calendário
  const shown = all.slice(0, f.limit), groups = [];
  for (const t of shown) { const g = groups.at(-1); if (g && g.date === t.date) g.txs.push(t); else groups.push({ date: t.date, txs: [t] }); }
  const rows = groups.map(g => `<h4 class="dayHead"><span>${esc((g.date === today ? 'Hoje · ' : '') + MonthCalendar.dayTitle(g.date, today))}</span>${dayTotalHtml(Period.dayTotal(g.txs))}</h4>${g.txs.map(t => txRow(t, { noDate: true })).join('')}`).join('');
  return {
    totals, count: all.length,
    list: rows ? rows + (all.length > shown.length ? btn(`Mostrar mais (${all.length - shown.length} restantes)`, { act: 'moves-more', cls: 'soft wide' }) : '')
      : String(f.q || '').trim() ? `<div class="empty glass"><b>Nenhum lançamento encontrado</b><span>Tente outra palavra ou troque o mês. A busca procura na descrição e na categoria.</span></div>`
        : `<div class="empty glass"><b>Nenhum lançamento neste período</b><span>Troque o mês ou ajuste os filtros. Você também pode começar por aqui:</span>
        <div class="btnGrid">${btn('Despesa', { act: 'new-tx', data: { kind: 'expense' }, icon: 'arrow-downward', iconSize: 18 })}${btn('Receita', { act: 'new-tx', data: { kind: 'income' }, icon: 'arrow-upward', iconSize: 18 })}</div></div>`,
  };
}

/**
 * Resumo do mês (MonthSummary.kt): um número em destaque e as linhas rotuladas que somam até ele; frase neutra.
 * [accumulate] = "Cálculo do saldo › Acumular saldo entre os meses": desligada, o destaque é o resultado do mês.
 */
export function monthSummaryHtml(t, accumulate) {
  const past = t.whenIs === Totals.WHEN.PAST;
  const [title, main] = accumulate && past ? ['Saldo no fim do mês', t.closing] : accumulate ? ['Previsto no fim do mês', t.closing]
    : past ? ['Resultado do mês', t.result] : ['Resultado previsto do mês', t.resultForecast];
  const line = (label, v, sign, cls) => `<div class="msLine"><span>${esc(label)}</span><b class="num ${cls}">${sign ? sign + ' ' : ''}${money(v)}</b></div>`;
  let lines = '';
  if (accumulate) lines += line(t.whenIs === 'CURRENT' ? 'Saldo atual' : t.whenIs === 'FUTURE' ? 'Previsto no início do mês' : 'Saldo no início do mês', t.opening, '', t.opening < 0 ? 'red' : '');
  if (past || !accumulate) {
    lines += line('Entrou', t.realizedIn, '+', 'green') + line('Saiu', t.realizedOut, '−', 'red');
    if (t.goalsSaved !== 0) lines += line('Guardado em metas', t.goalsSaved, '−', 'goalTxt');
  }
  if (!past) {
    lines += line('A receber', t.toReceive, '+', 'green') + line('A pagar', t.toPay, '−', 'red');
    if (t.goalsPlanned > 0) lines += line('Reservado para metas', t.goalsPlanned, '−', 'goalTxt');
  } else {
    if (t.toReceive > 0) lines += line('Ficou a receber', t.toReceive, '', 'muted');
    if (t.toPay > 0) lines += line('Ficou a pagar', t.toPay, '', 'muted');
  }
  // frase informativa, sem julgamento
  const F = Money.format;
  const note = !hidden() && !past && (t.realizedOut > 0 || t.goalsSaved > 0)
    ? (t.realizedOut > 0 && t.goalsSaved > 0 ? `Já saíram ${F(t.realizedOut)} este mês e ${F(t.goalsSaved)} foram para metas.`
      : t.realizedOut > 0 ? `Já saíram ${F(t.realizedOut)} este mês.` : `${F(t.goalsSaved)} foram para metas este mês.`) + ' As compras no cartão contam pela fatura.' : '';
  const once = accumulate && !past && t.goalsPlanned === 0 && t.goalsSaved > 0 ? 'O que já foi guardado em metas já está fora do saldo atual.' : '';
  return `<section class="monthSummary glass" aria-label="Resumo do mês"><small class="msTitle">${esc(title)}</small>
    <b class="msMain num${main < 0 ? ' negative' : ''}">${money(main)}</b>${lines}
    ${note || once ? `<p class="msNote">${esc(note)}${note && once ? '<br>' : ''}${esc(once)}</p>` : ''}</section>`;
}

/** período livre ou com filtro: receitas, despesas e saldo do que está na lista (como antes) */
function periodSummaryHtml(all) {
  const fl = Finance.flow(all), pend = Period.pending(all);
  const acc = movesAccumulated();
  const bal = acc ? acc.balance : fl.income - fl.expense;
  const forecast = acc ? acc.forecast : bal + pend.toReceive - pend.toPay, hasPend = acc ? forecast !== bal : pend.toReceive > 0 || pend.toPay > 0;
  const col = (label, v, cls, subL, sv, scls, show) => `<div><small>${label}</small><b class="num ${cls}">${money(v)}</b>${show ? `<small class="statSub">${subL} <b class="num ${scls}">${money(sv)}</b></small>` : ''}</div>`;
  return `<section class="periodSummary glass" aria-label="Resumo do período"><div class="sumGrid">
      ${col('Receitas', fl.income, 'green', 'a receber', pend.toReceive, 'green', pend.toReceive > 0)}
      ${col('Despesas', fl.expense, 'red', 'a pagar', pend.toPay, 'red', pend.toPay > 0)}
      ${col('Saldo', bal, bal < 0 ? 'negative' : '', 'previsto', forecast, forecast < 0 ? 'negative' : 'accent', hasPend)}</div>
    ${acc ? '<small class="muted sumNote">Saldo acumulado: inclui o saldo das contas que vem dos meses anteriores.</small>'
      : ctx.device.accumulateBalance ? '<small class="muted sumNote">Com filtro, o saldo mostra só este período (sem acumular).</small>' : ''}</section>`;
}

/** "Acumular saldo entre os meses" ligada e sem filtro de tipo, situação ou busca: { balance, forecast } das contas ao fim do período */
export function movesAccumulated() {
  const f = ctx.moves, s = ctx.state, today = ctx.today;
  if (!ctx.device.accumulateBalance || f.kind || f.st || String(f.q || '').trim()) return null;
  // sem fim de período: até o último lançamento (ou hoje), sem recorrências previstas, como a lista
  const lastTx = s.txs.reduce((m, t) => t.date > m ? t.date : m, today);
  const until = f.to || lastTx;
  return { balance: Finance.balanceAt(s, until), forecast: Finance.forecastAt(s, until, today, !!f.to) };
}

/**
 * Total do dia na lista (Android 1.9): só receitas e despesas (verde entrou, vermelho saiu); as reservas para meta
 * ficam fora, numa linha "R$ X em metas" (cor das metas) ou "R$ X retirados de metas" (verde, voltou para a conta).
 */
export function dayTotalHtml(t) {
  if (hidden() || (!t.hasFlow && !t.goals)) return '';
  const net = t.net;
  const flow = t.hasFlow ? `<b class="${net < 0 ? 'red' : 'green'}" title="Resultado das movimentações deste dia" aria-label="Resultado das movimentações deste dia: ${net > 0 ? 'mais ' : net < 0 ? 'menos ' : ''}${attr(Money.format(Math.abs(net)))}">${net > 0 ? '+ ' : net < 0 ? '− ' : ''}${Money.format(Math.abs(net))}</b>` : '';
  const goals = t.goals ? `<small class="dayGoals ${t.goals > 0 ? 'goalTxt' : 'green'}${t.hasFlow ? '' : ' only'}">${icon('flag', 14)}${esc(t.goals > 0 ? `${Money.format(t.goals)} em metas` : `${Money.format(-t.goals)} retirados de metas`)}</small>` : '';
  return `<span class="dayTotal">${flow}${goals}</span>`;
}

/** linha de lançamento (Root.kt TxRow, 1.11); o: { noDate } quando o dia já aparece no título (lista por dia e calendário) */
export function txRow(t, o = {}) {
  const s = ctx.state, goalT = isGoal(t), payment = !!t.cardPayment, cardT = isCard(t), prev = isProjected(t);
  const late = !t.paid && !cardT && t.date < ctx.today;
  const statusTxt = prev ? 'Prevista · recorrência' : goalT ? (t.kind === 'expense' ? 'Guardado na meta' : 'Retirado da meta') : payment ? 'Pagamento de fatura' : cardT ? 'No cartão'
    : !t.paid ? (late ? (t.kind === 'income' ? 'Vencida · a receber' : 'Vencida · a pagar') : (t.kind === 'income' ? 'A receber' : 'A pagar'))
    : t.kind === 'income' ? 'Recebida' : 'Paga';
  const stCls = goalT ? 'goalTxt' : late ? 'red' : cardT ? 'cardTxt' : t.paid && !prev ? 'green' : 'muted';
  const when = [o.noDate ? '' : brDate(t.date), t.paid && t.scheduledDate ? `previsto ${brDate(t.scheduledDate)}` : ''].filter(Boolean).join(' · ');
  // a conta só aparece quando existe mais de uma; o cartão aparece sempre (é a forma de pagamento)
  const where = cardT ? `Cartão ${card(s, t.cardId)?.name ?? ''}` : s.accounts.length > 1 ? account(s, t.accountId)?.name ?? 'Conta' : null;
  const sub = [Words.ordinal(TxForm.displayCategory(t.category)), where].filter(Boolean).join(' · ');
  const toggle = prev ? `<span class="chk ghost" title="Previsto: o lançamento é criado quando o mês chegar">${icon('repeat', 18)}</span>`
    : goalT ? `<span class="chk ghost" title="${t.kind === 'expense' ? 'Guardado na meta' : 'Retirado da meta'}">${icon('flag', 18)}</span>`
    : cardT || payment ? `<span class="chk ghost" title="${payment ? 'Pagamento de fatura' : 'Compra no cartão'}">${icon('credit-card', 18)}</span>`
      : `<button type="button" class="chk${t.paid ? ' on' : ''}" data-act="toggle-paid" data-id="${attr(t.id)}" aria-label="${t.paid ? `Desfazer confirmação: ${t.kind === 'income' ? 'recebido' : 'pago'}` : (t.kind === 'income' ? 'Marcar como recebido' : 'Marcar como pago')}: ${attr(t.desc)}">${icon('check', 16)}</button>`;
  // 1.11: a reserva para meta sai do saldo ("−", no âmbar das metas); a retirada volta ("+", em verde)
  const what = goalT ? (t.kind === 'expense' ? 'guardado na meta' : 'retirado da meta') : t.kind === 'income' ? 'receita' : 'despesa';
  const sign = t.kind === 'expense' ? '−' : '+';
  const amtCls = goalT && t.kind === 'expense' ? 'goalTxt' : t.kind === 'expense' ? 'red' : 'green';
  return `<div class="tx ${t.kind}${goalT ? ' goalMove' : ''}${t.paid ? '' : ' pending'}${payment ? ' payment' : ''}${prev ? ' projected' : ''}" data-act="${prev ? 'edit-recurring' : 'edit-tx'}" data-id="${attr(prev ? t.recurringId : t.id)}" role="button" tabindex="0" aria-label="${attr(Words.ordinal(t.desc))}, ${prev ? 'previsto, ' : ''}${what}${goalT ? ',' : ' de'} ${attr(money(t.value))} em ${brDate(t.date)}">
    ${toneTile(txIcon(t), txTone(t, prev), 42)}<span class="meta"><b class="txName">${esc(Words.ordinal(t.desc))}</b>${sub ? `<small>${esc(sub)}</small>` : ''}<small class="txStatus ${stCls}">${esc(statusTxt)}${when ? ` · ${esc(when)}` : ''}</small></span>
    <span class="amount num ${amtCls}">${sign} ${money(t.value)}</span>${toggle}</div>`;
}

// ================================================================== Resumo (Android 1.10/1.11; RESUMO.md)
/** "Depois das despesas, sobraram R$ X." e variantes (relatório em PDF e assistente) */
export function resultText(fl) {
  if (fl.income === fl.expense) return 'Neste período, você gastou o mesmo valor que recebeu.';
  if (fl.expense > fl.income) return `Você gastou ${Money.format(fl.expense - fl.income)} a mais do que recebeu.`;
  return `Depois das despesas, sobraram ${Money.format(fl.income - fl.expense)}.`;
}

/** folha do botão "info" do Resumo */
export function summaryInfo() {
  const items = ['Só valores realizados (pagos ou recebidos), do período escolhido, o mesmo da aba Lançamentos.',
    'Despesas entram na data da compra, compras no cartão incluídas. A fatura só aparece como pagamento de conta, sem contar de novo.',
    'Reservas para meta não são despesa: ficam à parte, em “Guardado em metas”.',
    'Os valores são do mês selecionado. Para mudar, use as setas ao lado do mês.'];
  openSheet({ title: 'O que entra neste resumo', body: `<ul class="reportLines">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <div class="sheetActions">${btn('Entendi', { cls: 'primary', id: 'infoOk' })}</div>`, onMount: d => { d.querySelector('#infoOk').onclick = () => closeSheet(); } });
}

/** lista completa das despesas por categoria ("Outras") */
export function allCategoriesSheet() {
  const s = ctx.state, f = ctx.moves;
  const inRange = s.txs.filter(t => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to));
  const c = SummaryView.categories(s, inRange, 1000);
  openSheet({ title: 'Todas as categorias', subtitle: Period.label(f.from, f.to), body: `<div class="catRows">${c.all.map(r => catRowHtml(r, c.all[0]?.value || 1)).join('')}</div>` });
}

/** detalhe de um mês da Evolução */
export function monthDetailSheet(ym) {
  const s = ctx.state, today = ctx.today;
  const m = SummaryView.evolution(s, today, 6).find(x => x.ym === +ym);
  if (!m) return;
  const res = m.income - m.expense - m.goals;
  const line = (l, v, cls) => `<div class="msLine"><span>${esc(l)}</span><b class="num ${cls}">${money(v)}</b></div>`;
  openSheet({ title: cap(brMonthYear(m.ym)), body: `<section class="glass monthSummary">${line('Receitas', m.income, 'green')}${line('Despesas', m.expense, 'red')}
      ${m.goals ? line('Guardado em metas', m.goals, 'goalTxt') : ''}${line('Resultado', res, res < 0 ? 'red' : 'accent')}</section>
    ${m.current ? `<p class="muted small">Até o dia ${dom(today)}, o mês ainda está em andamento.</p>` : ''}
    <div class="sheetActions">${btn('Ver os lançamentos do mês', { cls: 'primary', id: 'mdOpen', icon: 'view-list', iconSize: 18 })}</div>`,
  onMount: d => { d.querySelector('#mdOpen').onclick = () => { closeSheet(); ctx.movesView = 'list'; ctx.openMoves('', ymFirst(m.ym), ymLast(m.ym)); }; } });
}

function catRowHtml(r, max) {
  const lim = ctx.state.limits.get(r.name);
  const sub = r.cards.length ? (r.cards.length === 1 ? `No cartão ${r.cards[0]}` : `Nos cartões ${r.cards.join(', ')}`) : '';
  return `<div class="catRow">${toneTile(r.name === SummaryView.NO_CATEGORY ? 'more-horiz' : catIcon(r.name), 'exp', 40)}<div class="catMain">
    <div class="catTop"><b>${esc(Words.ordinal(r.name))}</b><span class="num">${money(r.value)}</span></div>
    <div class="budgetTrack${hidden() ? ' sensitive' : ''}"><i class="expBar" style="width:${Math.max(2, r.value * 100 / max)}%"></i></div>
    ${sub ? `<small class="muted">${esc(sub)}</small>` : ''}
    ${lim != null ? `<small class="${r.value > lim ? 'red' : 'muted'}">${r.value > lim ? `${icon('warning', 13)} Acima do` : 'Dentro do'} limite mensal de ${esc(money(lim))}</small>` : ''}</div></div>`;
}

/**
 * Resumo: o mesmo período da aba Lançamentos (‹ mês › e período livre), só valores realizados. Selo do mês, resultado
 * com o previsto (glossário único) e o guardado em metas, Receitas e Despesas, fluxo, categorias e evolução.
 */
export function reportsView() {
  movesDefaults();
  const s = ctx.state, f = ctx.moves, today = ctx.today;
  const inRange = s.txs.filter(t => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to));
  const fl = Finance.flow(inRange), gm = Finance.goalMoves(inRange);
  const ym = Period.fullMonth(f.from, f.to), status = SummaryView.status(f.from, f.to, today);
  const head = `<div class="pageTitle reportsHead"><h2 id="reportsTitle">Resumo</h2><span class="headBtns">
      <button type="button" class="infoBtn big" data-act="summary-info" aria-label="O que entra neste resumo">${icon('info', 24)}</button>
      ${btn('PDF', { act: 'pdf', cls: 'pill', icon: 'receipt-long', iconSize: 18, label: 'Exportar relatório em PDF' })}</span></div>
    ${periodBar()}
    ${status ? `<span class="statusBadge">${icon('calendar-month', 16)}${esc(status.phase === 'IN_PROGRESS' ? `Mês em andamento · dia ${status.day} de ${status.length}` : status.phase === 'CLOSED' ? 'Mês encerrado' : 'Mês futuro')}</span>` : ''}`;

  // "Acumular saldo entre os meses" (Ajustes › Cálculo do saldo): o que vem dos meses anteriores e o saldo do fim do período
  let accBox = '';
  if (ctx.device.accumulateBalance) {
    const carried = f.from ? Finance.balanceAt(s, addDays(f.from, -1)) : s.accounts.reduce((n, a) => n + a.initial, 0);
    const until = f.to || s.txs.reduce((m, t) => t.date > m ? t.date : m, today);
    const closing = Finance.balanceAt(s, until);
    accBox = `<section class="glass resultBox accBox"><small class="muted">Saldo acumulado</small><b class="num ${closing < 0 ? 'negative' : 'accent'}">${money(closing)}</b>
      <div class="accRow"><small class="muted">Vindo dos meses anteriores</small><b class="num ${closing < 0 && carried < 0 ? 'negative' : ''}">${money(carried)}</b></div>
      <small class="muted">Saldo das contas ao fim do período, com o saldo inicial e o que sobrou dos meses anteriores (opção em Ajustes › Cálculo do saldo).</small></section>`;
  }

  if (!inRange.length) {
    const name = ym != null ? MONTHS[ym % 12] : 'este período';
    const empty = `<section class="comparison glass reportsEmpty"><b>Nada lançado em ${esc(name)} ainda</b>
      <p class="muted small">O resumo mostra o que já foi pago ou recebido. Troque o período ou lance uma receita ou despesa.</p>
      ${btn('Ver no calendário', { act: 'reports-calendar', cls: 'link', icon: 'calendar-month', iconSize: 18 })}</section>`;
    return head + accBox + empty;
  }

  // card de resultado
  const res = fl.income - fl.expense;
  const resLabel = status == null ? 'Resultado do período' : status.phase === 'IN_PROGRESS' ? 'Resultado até agora' : 'Resultado do mês';
  const showFc = ym != null && ym >= ymOf(today);
  const fc = showFc ? Totals.month(s, ym, today).closing : 0;
  const goalsRow = gm.saved > 0 || gm.withdrawn > 0 ? `<div class="goalsSaved"><span class="goalTxt">${icon('flag', 20)}</span><span class="meta"><b>Guardado em metas</b><small>Não entra nas despesas</small></span><b class="num goalTxt">${money(gm.net)}</b></div>` : '';
  const result = `<section class="glass resultCard" aria-label="Resultado"><div class="resTop">
      <div><small class="muted">${resLabel}</small><b class="resMain num ${res < 0 ? 'negative' : 'green'}">${money(res)}</b></div>
      ${showFc ? `<div class="resFc"><small class="muted">Saldo previsto em ${dm(ymLast(ym))}</small><b class="num ${fc < 0 ? 'negative' : 'accent'}">${money(fc)}</b></div>` : ''}</div>${goalsRow}</section>`;

  // Receitas e Despesas, com a comparação só quando o período anterior tem dados
  const c = PeriodCompare.of(f.from, f.to, today);
  const prev = c ? Finance.flow(s.txs.filter(t => t.date >= c.from && t.date <= c.to)) : null;
  const vs = status == null ? 'vs. período anterior' : status.phase === 'IN_PROGRESS' ? 'vs. mês anterior (mesmos dias)' : 'vs. mês anterior';
  const deltaTxt = (cur, pv) => { const dl = SummaryView.delta(cur, prev, pv); return dl == null ? '' : hidden() ? 'Variação oculta' : `${signedMoney(dl.amount)} ${vs}`; };
  const notes = (...l) => l.filter(Boolean).map(x => `<small>${esc(x)}</small>`).join('');
  const nx = fl.income === 0 ? SummaryView.nextIncome(inRange) : null;
  const incNote = fl.income === 0 ? (nx ? `Próxima: ${money(nx.amount)} em ${dm(nx.date)}` : 'Nada pendente') : '';
  const cs = SummaryView.cardSpend(s, inRange, today);
  const cardNote = cs ? (cs.invoiceDue ? `Inclui ${money(cs.amount)} no cartão · fatura em ${dm(cs.invoiceDue)}` : `Inclui ${money(cs.amount)} no cartão`) : '';
  const sums = `<section class="reportSum" aria-label="Receitas e despesas">
    <div class="glass"><small class="lbl">${icon('arrow-upward', 15)}Receitas</small><b class="num green">${money(fl.income)}</b>${notes(deltaTxt(fl.income, prev?.income), incNote)}</div>
    <div class="glass"><small class="lbl">${icon('arrow-downward', 15)}Despesas</small><b class="num red">${money(fl.expense)}</b>${notes(deltaTxt(fl.expense, prev?.expense), cardNote)}</div></section>`;

  // fluxo do dinheiro: Entrou / Saiu ou foi para o cartão (Despesas + Guardado em metas), na mesma escala
  const goalsOut = Math.max(0, gm.net), outTotal = fl.expense + goalsOut, scale = Math.max(fl.income, outTotal, 1);
  const by = new Map();
  for (const t of inRange) if (t.kind === 'income' && t.paid && isFlow(t)) { const k = String(t.category ?? '').trim() || 'Sem categoria'; by.set(k, (by.get(k) || 0) + t.value); }
  const ins = [...by].sort((x, y) => y[1] - x[1]);
  const pctIn = SummaryView.percents(ins.map(x => x[1]));
  const [pE, pG] = SummaryView.percents([fl.expense, goalsOut]);
  const lg = (name, v, color, p) => `<li><i style="background:${color}"></i><span>${esc(name)}</span><b class="num">${money(v)}<small>${hidden() ? '••%' : p + '%'}</small></b></li>`;
  const inPart = fl.income > 0
    ? `<div class="flowSeg${hidden() ? ' sensitive' : ''}" aria-hidden="true"><i style="width:${fl.income * 100 / scale}%;background:var(--green)"></i></div>
      <ul class="flowLegend">${ins.map(([n, v], i) => lg(Words.ordinal(n), v, 'var(--green)', pctIn[i])).join('')}</ul>`
    : `<p class="muted">${esc(nx ? `Nada recebido ainda. Próximo: ${money(nx.amount)} em ${dm(nx.date)}` : ym != null ? 'Nada pendente neste mês' : 'Nada pendente neste período')}</p>`;
  const outPart = outTotal > 0
    ? `<div class="flowSeg${hidden() ? ' sensitive' : ''}" aria-hidden="true"><i style="width:${fl.expense * 100 / scale}%;background:var(--red)"></i>${goalsOut ? `<i style="width:${goalsOut * 100 / scale}%;background:var(--goal)"></i>` : ''}</div>
      <ul class="flowLegend">${lg('Despesas', fl.expense, 'var(--red)', pE)}${goalsOut ? lg('Guardado em metas', goalsOut, 'var(--goal)', pG) : ''}</ul>`
    : '<p class="muted small">Nenhuma despesa realizada; todo o valor recebido permaneceu disponível.</p>';
  const flowDesc = `Fluxo do dinheiro. Entrou ${hidden() ? 'valor oculto' : Money.format(fl.income)}. Saiu ou foi para o cartão ${hidden() ? 'valor oculto' : Money.format(outTotal)}.`;
  const flow = `<section class="comparison glass flowBox" role="group" aria-label="${attr(flowDesc)}">${eyebrow('Análises')}<h3>Fluxo do dinheiro</h3>
    <div class="flowHead"><b>Entrou</b>${fl.income > 0 ? `<b class="num">${money(fl.income)}</b>` : ''}</div>${inPart}
    <div class="flowHead"><b>Saiu ou foi para o cartão</b>${outTotal > 0 ? `<b class="num">${money(outTotal)}</b>` : ''}</div>${outPart}</section>`;

  // despesas por categoria: até 5 e "Outras"
  const cat = SummaryView.categories(s, inRange);
  const max = cat.all[0]?.value || 1;
  const catCard = `<section class="comparison glass">${eyebrow('Despesas')}<h3>Despesas por categoria</h3>
    ${cat.all.length ? `<div class="catRows">${cat.top.map(r => catRowHtml(r, max)).join('')}
      ${cat.others ? `<button type="button" class="catRow othersRow" data-act="all-categories">${toneTile('more-horiz', 'exp', 40)}<div class="catMain"><div class="catTop"><b>Outras</b><span class="num">${money(cat.others.value)}</span></div>
        <small class="muted">${esc(Words.count(cat.othersCount, 'categoria', 'categorias'))} · toque para ver todas</small></div>${icon('chevron-right', 18)}</button>` : ''}</div>`
      : '<p class="muted small">Sem despesas realizadas no período.</p>'}</section>`;

  // evolução: só meses com dados, valor sobre cada barra (receita em cima, despesa embaixo: não se sobrepõem)
  const evo = SummaryView.evolution(s, today, 6);
  const emax = Math.max(1, ...evo.map(m => Math.max(m.income, m.expense)));
  const evoDesc = evo.map(m => brMonthYear(m.ym) + (hidden() ? '' : `: receitas ${Money.format(m.income)}, despesas ${Money.format(m.expense)}`)).join('; ');
  const evoCard = `<section class="comparison glass">${eyebrow('Evolução')}<h3>Últimos 6 meses</h3>
    ${evo.length ? `<div class="evo${hidden() ? ' sensitive' : ''}" role="group" aria-label="${attr(`Gráfico de receitas e despesas dos meses com lançamentos. Toque em um mês para ver o detalhe. ${evoDesc}`)}">${evo.map(m => `<button type="button" class="evoCol" data-act="month-detail" data-ym="${m.ym}" aria-label="${attr(hidden() ? `${brMonthYear(m.ym)}. Abrir o detalhe` : `${brMonthYear(m.ym)}: receitas ${Money.format(m.income)}, despesas ${Money.format(m.expense)}. Abrir o detalhe`)}">
        <span class="evoVals" aria-hidden="true">${hidden() ? '' : `<i class="vInc">${esc(SummaryView.short(m.income))}</i><i class="vExp">${esc(SummaryView.short(m.expense))}</i>`}</span>
        <span class="pair" aria-hidden="true"><i class="inc" style="height:${m.income * 100 / emax}%"></i><i class="exp" style="height:${m.expense * 100 / emax}%"></i></span>
        <span class="evoM">${MONTHS_SHORT[m.ym % 12]}${m.current ? `<small>até dia ${dom(today)}</small>` : ''}</span></button>`).join('')}</div>
    <small class="legendLine"><i class="dot inc"></i>Receitas <i class="dot exp"></i>Despesas</small>`
      : '<p class="muted small">Aparece quando houver pelo menos um mês com valores realizados.</p>'}</section>`;

  const left = [accBox, result, sums, flow], right = [catCard, evoCard];
  return head + (ctx.cols === 1 ? [...left, ...right].join('') : cols(left, right));
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
export const openFolds = new Set(); // compatibilidade: as seções viraram páginas (ctx.page.prefs)
const manage = (title, sub, actions) => `<div class="manageItem"><div><b>${esc(title)}</b><small>${esc(sub)}</small></div><div class="manageActions">${actions}</div></div>`;

/** itens de Ajustes: cada um abre a sua página com "‹ Ajustes" (Android 1.11, SettingsScreen.kt) */
function prefsPages(env) {
  const s = ctx.state, d = ctx.device, hasPin = !!d.pinHash;
  const nperm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  const n = [d.assistCategory, d.assistTips, d.assistAsk].filter(Boolean).length;
  const P = {};
  P.aparencia = { title: 'Aparência', icon: 'palette', sub: `Tema: ${themeLabel(s.theme)}${d.glass ? ' · efeito vidro' : ''}`, body: () => `
    ${check('glass', 'Efeito vidro', d.glass, { sub: 'Cartões translúcidos sobre um fundo com brilhos suaves nas cores do tema. Vale para todos os temas e fica só neste aparelho.' })}
    <h4 class="fLabel">Tema</h4><div class="themeChoices" role="radiogroup" aria-label="Tema">${THEMES.map(([id, label]) => `<button type="button" role="radio" class="themeChoice${s.theme === id ? ' active' : ''}" data-act="theme" data-id="${id}" aria-checked="${s.theme === id}">
      <span>${esc(label)}${s.theme === id ? icon('check', 16) : ''}</span><span class="swatches t-${id}"><i></i><i></i><i></i><i></i></span></button>`).join('')}</div>
    <p class="muted small">“Sistema” acompanha o modo claro/escuro do aparelho.</p>` };
  P.avisos = { title: 'Avisos de vencimento', icon: 'notifications', sub: env.remote ? 'Feitos pelo celular' : d.notifications && nperm === 'granted' ? 'Avisos de vencimento ligados' : 'Avisos de vencimento desligados', body: () => env.remote ? `
    <p class="muted small">No modo remoto, os avisos de vencimento chegam pelo próprio celular.</p>
    ${btn('Ver vencimentos agora', { act: 'notify-now', cls: 'soft', icon: 'notifications', iconSize: 18 })}` : `
    ${check('notifications', 'Avisar vencimentos', d.notifications && nperm === 'granted', { sub: 'Contas a pagar, valores a receber e faturas, uma vez por dia a partir das 9h, com o Finan+ aberto', disabled: nperm === 'unsupported' })}
    ${nperm === 'denied' ? '<p class="muted small">As notificações estão bloqueadas para este site. Libere nas configurações do navegador.</p>' : ''}
    ${nperm === 'unsupported' ? '<p class="muted small">Este navegador não oferece notificações.</p>' : ''}
    ${btn('Avisar agora', { act: 'notify-now', cls: 'soft', icon: 'notifications', iconSize: 18 })}
    <p class="muted small">Sites não podem rodar com o navegador fechado sem um servidor. Para manter tudo no aparelho, os avisos aparecem quando o Finan+ é aberto (ou fica aberto) a partir das 9h. O Início mostra os próximos vencimentos.</p>` };
  P.saldo = { title: 'Cálculo do saldo', icon: 'calculate', sub: d.accumulateBalance ? 'Saldo acumulado entre os meses' : 'Cada mês com o seu saldo', body: () => `
    ${check('accumulateBalance', 'Acumular saldo entre os meses', d.accumulateBalance, { sub: 'Ligado, o resumo de cada mês em Lançamentos parte do saldo das contas e mostra o previsto no fim do mês; o Resumo e o relatório em PDF mostram o saldo acumulado. Desligado, cada mês mostra o resultado do que entrou e saiu nele.' })}
    <p class="muted small">Fica só neste aparelho (não vai para o backup). Receitas e despesas continuam sendo só as do período.</p>` };
  P.assistente = { title: 'Assistente', icon: 'auto-awesome', sub: `${n} de 3 funções ligadas`, body: () => `
    <p class="muted small">Funciona só neste aparelho, sem internet e sem enviar dados. Cada função pode ser desligada.</p>
    ${check('assistCategory', 'Sugerir categoria', d.assistCategory, { sub: 'Ao digitar a descrição de um lançamento novo' })}
    ${check('assistTips', 'Resumo e dicas', d.assistTips, { sub: 'No Início: um aviso do mês, gastos fora do padrão, fixos, duplicados' })}
    ${check('assistAsk', 'Perguntas rápidas', d.assistAsk, { sub: 'Ex.: “quanto gastei com mercado em agosto?”' })}
    ${d.dismissedTips.length ? btn(`Restaurar ${Words.count(d.dismissedTips.length, 'dica dispensada', 'dicas dispensadas')}`, { act: 'restore-all-tips', cls: 'soft small' }) : ''}
    <details class="learned"><summary>${icon('expand-more', 18)}Ver o que o assistente aprendeu</summary>${learnedHtml()}</details>` };
  P.recorrencias = { title: 'Recorrências', icon: 'repeat', sub: s.recurring.length ? Words.count(s.recurring.length, 'recorrência cadastrada', 'recorrências cadastradas') : 'Nenhuma recorrência cadastrada', body: () => `
    <div class="foldTools">${btn('Nova', { act: 'new-recurring', icon: 'add', iconSize: 18, cls: 'soft small' })}</div>
    ${s.recurring.length ? `<div class="navList">${s.recurring.map(r => {
      const where = r.cardId ? `Cartão ${card(s, r.cardId)?.name ?? ''}` : s.accounts.length > 1 ? account(s, r.accountId)?.name ?? '' : '';
      return navRow({ act: 'edit-recurring', data: { id: r.id }, icon: catIcon(r.category), tone: r.kind === 'income' ? 'inc' : 'exp', title: Words.ordinal(r.desc),
        sub: [`${money(r.value)} · dia ${r.day}`, Words.ordinal(r.category), where, r.active ? '' : 'pausada'].filter(Boolean).join(' · ') });
    }).join('')}</div>` : '<p class="muted small">Você também pode ligar “Repetir” em Mais opções ao criar um lançamento.</p>'}` };
  P.privacidade = { title: 'Privacidade e segurança', icon: 'shield', sub: (hasPin ? 'Bloqueio ativo' : 'Bloqueio desativado') + (s.privacy ? ' · valores ocultos' : ''), body: () => `
    <div class="manageItem"><div><b>Bloqueio por PIN</b><small>${hasPin ? 'Ativo: o PIN é pedido ao abrir o Finan+' : 'Desativado. Defina um PIN de 4 a 8 números.'}</small></div>
      <div class="manageActions">${btn(hasPin ? 'Trocar' : 'Definir PIN', { act: 'pin-set', cls: hasPin ? 'soft small' : 'primary small' })}</div></div>
    ${check('privacy', 'Ocultar valores', s.privacy, { sub: 'Esconde os valores em reais na tela e nos avisos (Ctrl+H)' })}
    ${selectField('autoLock', 'Bloqueio automático', AUTOLOCK_OPTIONS.map(m => [String(m), m === 0 ? 'Desativado' : `${m} ${m > 1 ? 'minutos' : 'minuto'} sem usar`, 'lock']), String(s.autoLock || 0), { disabled: !hasPin, hint: hasPin ? '' : 'Precisa de um PIN.' })}
    ${env.remote ? `<div class="manageItem"><div><b>Conectado ao celular</b><small>Acesso pela rede do Finan+ Android</small></div><div class="manageActions">${btn('Desconectar', { act: 'remote-logout', cls: 'soft small' })}</div></div>` : ''}
    <div class="infoBox">${icon('lock', 18)}<p>${env.remote ? 'Modo remoto: os dados ficam no celular (criptografados lá) e chegam por conexão criptografada (HTTPS). Nada financeiro é gravado neste navegador; o PIN abaixo vale só para ele.' : env.encrypted ? 'Os dados ficam criptografados (AES-256-GCM) neste navegador, com uma chave que não pode ser lida nem pelo próprio site. Nada é enviado para servidores.' : 'Atenção: este navegador não oferece as funções de criptografia necessárias. Os dados ficam neste aparelho, mas sem criptografia.'} O PIN nunca vai para o backup.</p></div>
    <p class="muted small">Navegadores não permitem bloquear capturas de tela. Ao compartilhar a tela, ligue “Ocultar valores”.</p>
    ${hasPin ? `<div class="sheetDanger">${dangerText('Remover PIN', { act: 'pin-remove' })}</div>` : ''}` };
  P.dados = { title: 'Dados e backup', icon: 'database', sub: 'Backup, backup automático, restauração, CSV e PDF', body: () => `
    <div class="btnGrid">${btn('Exportar CSV', { act: 'csv', icon: 'table-view', iconSize: 18 })}${btn('Backup JSON', { act: 'backup', icon: 'download', iconSize: 18 })}
    ${btn('Restaurar', { act: 'restore', icon: 'upload', iconSize: 18 })}${btn('Relatório em PDF', { act: 'pdf', icon: 'picture-as-pdf', iconSize: 18 })}</div>
    <p class="muted small">O backup JSON é compatível com o app Android e com a versão Linux do Finan+: dá para levar os dados de um para o outro. O arquivo de backup não é criptografado; guarde-o em local seguro. Restaurar também abre as cópias criptografadas do backup automático (pede a senha).</p>
    ${autoBackupHtml()}
    ${env.remote ? '' : `<div class="sheetDanger">${dangerText('Apagar tudo', { act: 'wipe' })}</div>`}` };
  P.sobre = { title: 'Sobre', icon: 'info', sub: `Conheça o Finan+ · versão ${APP_VERSION}`, body: () => aboutHtml(env) };
  return P;
}
const PREF_GROUPS = [['Personalização', ['aparencia', 'avisos']], ['Planejamento e automação', ['saldo', 'assistente', 'recorrencias']], ['Segurança e dados', ['privacidade', 'dados']], ['Aplicativo', ['sobre']]];
export const PREF_PAGES = PREF_GROUPS.flatMap(g => g[1]);

/** linha de lista que navega (ícone, título, resumo e chevron) */
export const navRow = o => `<button type="button" class="navRow" data-act="${o.act}"${Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('')}>
  ${toneTile(o.icon, o.tone || 'accent', 44)}<span class="meta"><b>${esc(o.title)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>${o.right ?? ''}${icon('chevron-right', 20)}</button>`;

export function prefsView(env) {
  const P = prefsPages(env), page = P[ctx.page.prefs] ? ctx.page.prefs : null;
  if (page) {
    const p = P[page];
    return `${backLink('Ajustes', { act: 'page', data: { view: 'prefs', page: '' } })}<div class="pageTitle"><h2 id="prefsTitle" class="pageH" tabindex="-1">${esc(p.title)}</h2></div>
      <section class="glass prefsPage">${p.body()}</section>`;
  }
  const head = `<div class="pageTitle"><h2 id="prefsTitle">Ajustes</h2><p class="lockLine">${icon('lock', 16, 'green')}<span>${env.remote ? 'Tudo é salvo no celular, pela rede local.' : env.encrypted ? 'Tudo fica criptografado neste aparelho.' : 'Tudo fica salvo neste aparelho.'}</span></p></div>`;
  const invite = !ctx.device.pinHash && !env.remote ? `<div class="inviteBox"><span>Proteja o app com um PIN.</span>${btn('Ativar', { act: 'pin-set', cls: 'primary small' })}</div>` : '';
  const groups = PREF_GROUPS.map(([title, ids]) => `<h3 class="prefsGroup">${esc(title)}</h3><div class="navList glass">${ids.map(id => navRow({ act: 'page', data: { view: 'prefs', page: id }, icon: P[id].icon, title: P[id].title, sub: P[id].sub })
    + (id === 'privacidade' ? invite : '')).join('')}</div>`);
  return head + (ctx.cols === 1 ? groups.join('') : cols(groups.slice(0, 2), groups.slice(2)));
}

/** Ajustes › Dados › Backup automático (autobackup.js; BACKUP-AUTOMATICO.md) */
function autoBackupHtml() {
  const why = AutoBackup.unavailable(), c = AutoBackup.config();
  const head = '<h4 class="subhead" id="autoBackup">Backup automático</h4>';
  if (why) return `${head}<p class="muted small">${esc(why)}</p>`;
  if (!c.enabled) return `${head}<p class="muted small">Uma cópia criptografada por dia numa pasta sua (por exemplo, uma pasta sincronizada com o Google Drive, o Syncthing ou o Nextcloud). A cópia do dia é feita quando o Finan+ está aberto. Só o Finan+ com a senha consegue abrir.</p>
    ${btn('Definir senha e escolher pasta', { act: 'ab-enable', cls: 'soft', icon: 'sync', iconSize: 18 })}`;
  const when = c.lastAt ? (() => { const t = new Date(c.lastAt); return `Última cópia: ${brDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`)} às ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}${c.lastFile ? ` (${c.lastFile})` : ''}`; })() : 'Nenhuma cópia ainda.';
  return `${head}<div class="manageItem"><div><b>Pasta: ${esc(c.folder || 'escolhida')}</b><small>${esc(when)}</small></div></div>
    ${c.lastError ? `<p class="small red" role="alert">${esc(c.lastError)}</p>` : ''}
    ${btn('Permitir acesso à pasta', { act: 'ab-permit', cls: 'primary wide', icon: 'lock-open', iconSize: 18, id: 'abPermit' }).replace('<button', '<button hidden')}
    ${selectField('abKeep', 'Guardar', AutoBackup.KEEP_OPTIONS.map(k => [String(k), `As últimas ${k} cópias`, 'history']), String(c.keep), { hint: 'Cópias mais antigas com o nome finan-plus-auto-… são apagadas. Os outros arquivos da pasta não são tocados.' })}
    <div class="btnGrid">${btn('Fazer agora', { act: 'ab-now', icon: 'download', iconSize: 18 })}${btn('Trocar pasta', { act: 'ab-folder', icon: 'sync', iconSize: 18 })}
      ${btn('Trocar senha', { act: 'ab-password', icon: 'key', iconSize: 18 })}</div>
    <div class="sheetDanger">${dangerText('Desligar o backup automático', { act: 'ab-disable' })}</div>`;
}


function learnedHtml() {
  const s = ctx.state;
  const part = k => {
    const c = new Categorizer(s, k, ctx.dict), w = c.learnedWords();
    return `<small class="eyebrow">${k === 'expense' ? 'Despesas' : 'Receitas'} · ${Words.count(c.trainingSize, 'lançamento analisado', 'lançamentos analisados')}</small>
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
    <div class="btnGrid">${btn('Atalhos de teclado', { act: 'shortcuts', icon: 'keyboard', iconSize: 18 })}${btn('Novidades desta versão', { act: 'whatsnew', icon: 'history', iconSize: 18 })}
      ${btn('Ver apresentação', { act: 'welcome', icon: 'auto-awesome', iconSize: 18 })}</div>`;
}

// ================================================================== barra lateral, topo e navegação
export const NAV = [
  ['home', 'Início', 'home', 'home-fill'], ['moves', 'Lançamentos', 'swap-horiz', 'swap-horiz-fill'], ['money', 'Meu dinheiro', 'account-balance-wallet', 'account-balance-wallet'],
  ['reports', 'Resumo', 'pie-chart', 'pie-chart-fill'], ['assist', 'Assistente', 'auto-awesome', 'auto-awesome'], ['prefs', 'Ajustes', 'settings', 'settings-fill'],
];
export const VIEW_TITLES = { home: 'Início', moves: 'Lançamentos', money: 'Meu dinheiro', reports: 'Resumo', assist: 'Assistente', prefs: 'Ajustes' };

export function sideNavHtml() {
  return NAV.map(([id, label, ic, icOn], i) => `<button type="button" class="${ctx.view === id ? 'active' : ''}" data-act="go" data-view="${id}" aria-current="${ctx.view === id ? 'page' : 'false'}">
    ${icon(ctx.view === id ? icOn : ic, 22)}<span>${label}</span><kbd>${i + 1}</kbd></button>`).join('');
}
export function sideFootHtml() {
  const s = ctx.state, today = ctx.today, ym = ymOf(today);
  // o mesmo glossário do Início (Totals): saldo atual e previsto no fim do mês
  const t = Totals.month(s, ym, today), bal = t.opening, fut = t.closing;
  return `<div class="sideBal"><small>Saldo atual</small><b class="num ${bal < 0 ? 'negative' : ''}">${money(bal)}</b>
    <small>Previsto em ${dm(ymLast(ym))}</small><b class="num future ${fut < 0 ? 'negative' : ''}">${money(fut)}</b></div>
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
        ${[['shared-list', 'Despesas compartilhadas', 'group', ''], ['pdf', 'Relatório em PDF', 'picture-as-pdf', 'Ctrl+P'], ['csv', 'Exportar CSV', 'table-view', 'Ctrl+E'], ['backup', 'Salvar backup JSON', 'download', 'Ctrl+S'], ['restore', 'Restaurar backup', 'upload', 'Ctrl+O'], ['shortcuts', 'Atalhos de teclado', 'keyboard', 'Ctrl+/'], ['about', 'Sobre o Finan+', 'info', '']]
          .map(([a, l, ic, k]) => `<button type="button" role="menuitem" data-act="${a}">${icon(ic, 18)}<span>${l}</span>${k ? `<kbd>${k}</kbd>` : ''}</button>`).join('')}
      </div></div></div>`;
}
export function mobileHeaderHtml() {
  const s = ctx.state;
  return `<div><h1>Finan+</h1><small class="headDate">${esc(MonthCalendar.dayTitle(ctx.today, ctx.today))}</small></div><div class="headTools">
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
