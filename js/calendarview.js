// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Calendário da aba Lançamentos (visão "Calendário"): o mês em grade com o saldo de cada dia
// e os lançamentos do dia escolhido. As contas ficam em calendar.js (testadas); aqui só o HTML.
// Mesmo comportamento do Finan+ Android (ui/screens/CalendarView.kt).
import { Money, ymOf } from './core.js';
import { Totals } from './totals.js';
import { ScreenRules } from './screenrules.js';
import { MonthCalendar } from './calendar.js';
import { icon } from './icons.js';
import { esc, attr, btn, eyebrow, toneTile } from './ui.js';
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
  const totals = monthTotals(Totals.month(s, ym, today));
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
      <span><i class="dot card"></i>Cartão</span><span><i class="dot goal"></i>Meta</span><span>${icon('warning', 13, 'red')}Em atraso</span></div>
    <p class="srOnly">Toque num dia para ver os lançamentos. Toque de novo no dia escolhido, ou toque e segure, para lançar nessa data.</p>
  </section>`;
}

export const roundBtn = (ic, label, act, data = {}, cls = '') =>
  `<button type="button" class="roundBtn${cls ? ' ' + cls : ''}" data-act="${act}"${Object.entries(data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join('')} aria-label="${attr(label)}">${icon(ic, 22)}</button>`;

function dayCell(d, day, today) {
  const sel = d === ctx.cal.day, cls = ['calDay', sel && 'sel', d === today && 'today', d < today && 'past'].filter(Boolean).join(' ');
  // 1.11: todo valor do dia com sinal ("−489", "+1,1 mil"); dia só com reserva para meta: "−100" no âmbar das metas
  const dv = hidden() ? null : ScreenRules.calDayValue(day);
  const val = dv ? `<span class="v num ${dv.tone === 'goal' ? 'goalTxt' : dv.tone}">${esc(dv.text)}</span>` : '';
  const dots = day?.marks.length ? `<span class="dots">${day.marks.map(m => `<i class="dot ${m}"></i>`).join('')}</span>` : '';
  return `<button type="button" class="${cls}" data-act="cal-day" data-date="${d}" data-id="${d}" aria-pressed="${sel}"
    aria-label="${attr(MonthCalendar.describe(d, day, today, hidden()) + (sel ? '. Toque de novo para lançar nesta data' : ''))}">
    ${day?.overdue ? `<span class="warn">${icon('warning', 11)}</span>` : ''}<span class="n">${+d.slice(8, 10)}</span>${val}${dots}</button>`;
}

/** os mesmos totais da lista (glossário único): A receber | A pagar (+ metas) | Previsto; mês passado: Entrou | Saiu | Saldo final */
function monthTotals(t) {
  const past = t.whenIs === Totals.WHEN.PAST;
  const cell = (l, v, cls) => `<div><small>${esc(l)}</small><b class="num ${cls}">${money(v)}</b></div>`;
  const cells = past ? cell('Entrou', t.realizedIn, 'green') + cell('Saiu', t.realizedOut + t.goalsSaved, 'red') + cell('Saldo final', t.closing, t.closing < 0 ? 'red' : 'accent')
    : cell('A receber', t.toReceive, 'green') + cell(t.goalsPlanned > 0 ? 'A pagar + metas' : 'A pagar', t.toPay + t.goalsPlanned, 'red') + cell('Previsto', t.closing, t.closing < 0 ? 'red' : 'accent');
  return `<section class="calTotals glass" aria-label="Totais do mês">${cells}</section>
    <p class="muted small calNote">Inclui o que ainda está pendente, as faturas no vencimento e, nos próximos meses, as recorrências previstas. Compras no cartão aparecem no dia, mas só contam na fatura.</p>`;
}

function dayBox(d, day, today) {
  const n = day?.count || 0;
  const count = n === 0 ? 'Sem lançamentos' : n === 1 ? '1 lançamento' : `${n} lançamentos`;
  const net = day?.flowNet ?? day?.net ?? 0, hasFlow = day && (day.hasFlow ?? !!(day.income || day.expense));
  const netTxt = hidden() || !day || !hasFlow ? '' : ` · resultado das movimentações ${net > 0 ? '+ ' : net < 0 ? '− ' : ''}${Money.format(Math.abs(net))}`;
  const goalsTxt = hidden() || !day?.goals ? '' : `<small class="dayGoals ${day.goals > 0 ? 'goalTxt' : 'green'}">${icon('flag', 14)}${esc(day.goals > 0 ? `${Money.format(day.goals)} em metas` : `${Money.format(-day.goals)} retirados de metas`)}</small>`;
  const forecast = d >= today ? (() => {
    const f = Totals.forecastAt(ctx.state, d, today);
    return `<div class="forecastRow glass"><span>Saldo previsto ao fim do dia</span><b class="${f < 0 ? 'negative' : ''}">${money(f)}</b></div>`;
  })() : '';
  const rows = day && n ? day.txs.map(t => txRow(t, { noDate: true })).join('') + day.invoices.map(invoiceRow).join('')
    : `<div class="empty glass"><b>Nada neste dia</b><span>Use Receita ou Despesa para lançar algo com esta data.</span></div>`;
  return `<section class="section calDayBox" aria-label="Lançamentos do dia">
    <div class="sectionHead"><div>${eyebrow(d === today ? 'Hoje' : d < today ? 'Dia escolhido' : 'Previsto')}<h3>${esc(MonthCalendar.dayTitle(d, today))}</h3>
      <small class="muted">${esc(count + netTxt)}</small>${goalsTxt}</div></div>
    <div class="dayBtns">${btn('Receita', { act: 'new-tx', data: { kind: 'income', date: d }, icon: 'add', iconSize: 18 })}${btn('Despesa', { act: 'new-tx', data: { kind: 'expense', date: d }, icon: 'remove', iconSize: 18 })}</div>
    ${forecast}<div class="list">${rows}</div></section>`;
}

/** fatura em aberto que vence no dia; toque abre "Pagar fatura" */
function invoiceRow(i) {
  return `<button type="button" class="tx expense invoiceRow" data-act="pay-invoice" data-id="${attr(i.cardId)}">
    ${toneTile('credit-card', 'card', 42)}
    <span class="meta"><b>Fatura ${esc(i.cardName)}</b><small>${i.overdue ? '<span class="red">Vencida · em aberto</span>' : 'Vence neste dia · toque para pagar'}</small></span>
    <span class="amount num red">− ${money(i.amount)}</span></button>`;
}
