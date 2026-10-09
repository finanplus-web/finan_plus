// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Calendário da aba Lançamentos (visão "Calendário"): o mês em grade com o saldo de cada dia
// e os lançamentos do dia escolhido. As contas ficam em calendar.js (testadas); aqui só o HTML.
// Mesmo comportamento do Finan+ Android (ui/screens/CalendarView.kt).
import { Finance, Money, ymOf } from './core.js';
import { MonthCalendar } from './calendar.js';
import { icon } from './icons.js';
import { esc, attr, btn, eyebrow } from './ui.js';
import { ctx, money, hidden } from './ctx.js';
import { txRow } from './screens.js';

/** mês e dia iniciais: o mês de hoje, com hoje escolhido */
export function calDefaults() {
  if (ctx.cal.ym == null) { ctx.cal.ym = ymOf(ctx.today); ctx.cal.day = ctx.today; }
}

export function calendarView() {
  calDefaults();
  const s = ctx.state, today = ctx.today, ym = ctx.cal.ym;
  const days = MonthCalendar.build(s, ym, today);
  const grid = calCard(days, ym, today);
  const totals = monthTotals(days);
  const sel = ctx.cal.day && ymOf(ctx.cal.day) === ym ? ctx.cal.day : null;
  const day = sel ? dayBox(sel, days.get(sel), today)
    : `<div class="empty glass"><span>Toque num dia para ver os lançamentos dele.</span></div>`;
  return ctx.cols === 1 ? grid + totals + day : `<div class="calLayout"><div>${grid}${totals}</div><div>${day}</div></div>`;
}

function calCard(days, ym, today) {
  const cells = MonthCalendar.cells(ym).map(d => d ? dayCell(d, days.get(d), today) : '<span class="calEmpty" aria-hidden="true"></span>').join('');
  return `<section class="calCard glass" aria-label="Calendário de ${attr(MonthCalendar.monthTitle(ym))}">
    <div class="calHead">
      ${roundBtn('chevron-left', 'Mês anterior', 'cal-shift', { d: -1 })}
      <div class="calTitle"><h3 aria-live="polite">${esc(MonthCalendar.monthTitle(ym))}</h3>
        ${ym !== ymOf(today) ? btn('Voltar para hoje', { act: 'cal-today', cls: 'link small' }) : ''}</div>
      ${roundBtn('chevron-right', 'Próximo mês', 'cal-shift', { d: 1 })}
    </div>
    <div class="calWeek" aria-hidden="true">${MonthCalendar.WEEK_HEADER.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="calGrid">${cells}</div>
    <div class="calLegend" aria-hidden="true"><span><i class="dot income"></i>Receita</span><span><i class="dot expense"></i>Despesa</span>
      <span><i class="dot card"></i>Cartão</span><span>${icon('warning', 13, 'red')}Em atraso</span></div>
    <p class="srOnly">Toque num dia para ver os lançamentos. Toque de novo no dia escolhido, ou toque e segure, para lançar nessa data.</p>
  </section>`;
}

export const roundBtn = (ic, label, act, data = {}, cls = '') =>
  `<button type="button" class="roundBtn${cls ? ' ' + cls : ''}" data-act="${act}"${Object.entries(data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('')} aria-label="${attr(label)}">${icon(ic, 22)}</button>`;

function dayCell(d, day, today) {
  const sel = d === ctx.cal.day, cls = ['calDay', sel && 'sel', d === today && 'today', d < today && 'past'].filter(Boolean).join(' ');
  const val = day && !hidden() && (day.income || day.expense)
    ? `<span class="v ${day.net < 0 ? 'red' : 'green'}">${esc(MonthCalendar.signed(day.net))}</span>` : '';
  const dots = day?.marks.length ? `<span class="dots">${day.marks.map(m => `<i class="dot ${m}"></i>`).join('')}</span>` : '';
  return `<button type="button" class="${cls}" data-act="cal-day" data-date="${d}" data-id="${d}" aria-pressed="${sel}"
    aria-label="${attr(MonthCalendar.describe(d, day, today, hidden()) + (sel ? '. Toque de novo para lançar nesta data' : ''))}">
    ${day?.overdue ? `<span class="warn">${icon('warning', 11)}</span>` : ''}<span class="n">${+d.slice(8, 10)}</span>${val}${dots}</button>`;
}

function monthTotals(days) {
  const t = MonthCalendar.totals(days);
  return `<section class="calTotals" aria-label="Totais do mês">
    <div class="glass"><small>Entradas</small><b class="green">${money(t.income)}</b></div>
    <div class="glass"><small>Saídas</small><b class="red">${money(t.expense)}</b></div>
    <div class="glass"><small>Resultado</small><b class="${t.net < 0 ? 'red' : 'accent'}">${money(t.net)}</b></div></section>
    <p class="muted small calNote">Inclui o que ainda está pendente e as faturas no dia do vencimento. Compras no cartão aparecem no dia, mas só contam na fatura.</p>`;
}

function dayBox(d, day, today) {
  const n = day?.count || 0;
  const count = n === 0 ? 'Sem lançamentos' : n === 1 ? '1 lançamento' : `${n} lançamentos`;
  const net = day?.net || 0;
  const netTxt = hidden() || !day || (!day.income && !day.expense) ? '' : ` · saldo do dia ${net > 0 ? '+ ' : net < 0 ? '− ' : ''}${Money.format(Math.abs(net))}`;
  const forecast = d >= today ? (() => {
    const f = Finance.futureBalance(ctx.state, d, today);
    return `<div class="forecastRow glass"><span>Saldo previsto ao fim do dia</span><b class="${f < 0 ? 'negative' : ''}">${money(f)}</b></div>`;
  })() : '';
  const rows = day && n ? day.txs.map(t => txRow(t, { noDate: true })).join('') + day.invoices.map(invoiceRow).join('')
    : `<div class="empty glass"><b>Nada neste dia</b><span>Use Receita ou Despesa para lançar algo com esta data.</span></div>`;
  return `<section class="section calDayBox" aria-label="Lançamentos do dia">
    <div class="sectionHead"><div>${eyebrow(d === today ? 'Hoje' : d < today ? 'Dia escolhido' : 'Previsto')}<h3>${esc(MonthCalendar.dayTitle(d, today))}</h3>
      <small class="muted">${esc(count + netTxt)}</small></div></div>
    <div class="dayBtns">${btn('Receita', { act: 'new-tx', data: { kind: 'income', date: d }, icon: 'add', iconSize: 18 })}${btn('Despesa', { act: 'new-tx', data: { kind: 'expense', date: d }, icon: 'remove', iconSize: 18 })}</div>
    ${forecast}<div class="list">${rows}</div></section>`;
}

/** fatura em aberto que vence no dia; toque abre "Pagar fatura" */
function invoiceRow(i) {
  return `<button type="button" class="tx expense invoiceRow" data-act="pay-invoice" data-id="${attr(i.cardId)}">
    <span class="badge cardBadge" aria-hidden="true">${icon('credit-card', 20)}</span>
    <span class="meta"><b>Fatura ${esc(i.cardName)}</b><small>${i.overdue ? '<span class="red">Vencida · em aberto</span>' : 'Vence neste dia · toque para pagar'}</small></span>
    <span class="amount">−${money(i.amount)}</span></button>`;
}
