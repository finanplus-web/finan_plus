// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Calendário da aba Lançamentos e período da Lista: tradução de core/MonthCalendar.kt e core/Period.kt
// do Finan+ Android, com as mesmas regras e os mesmos testes (tests/calendar.test.mjs).
// Datas são textos "AAAA-MM-DD"; meses (ym) são inteiros ano*12 + mês-1, como no core.js.
import { Finance, Money, MONTHS, isCard, ymOf, ymFirst, ymLast, ymLen, ymDay, weekday } from './core.js';

const WEEKDAYS = { 1: 'segunda-feira', 2: 'terça-feira', 3: 'quarta-feira', 4: 'quinta-feira', 5: 'sexta-feira', 6: 'sábado', 7: 'domingo' };
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
const ymYear = ym => Math.floor(ym / 12);

export const MonthCalendar = {
  /** cabeçalho das colunas: a semana começa no domingo (padrão brasileiro) */
  WEEK_HEADER: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],

  /** grade do mês: dias vazios (null) antes do dia 1 e no fim, sempre em semanas completas de 7 */
  cells(ym) {
    const first = ymFirst(ym), lead = weekday(first) % 7; // domingo (7) → 0
    const out = Array(lead).fill(null);
    for (let d = 1; d <= ymLen(ym); d++) out.push(ymDay(ym, d));
    while (out.length % 7) out.push(null);
    return out;
  },

  /** faturas em aberto (de todos os cartões) que vencem no mês */
  invoicesDue(s, ym, today) {
    const out = [];
    for (const c of s.cards) for (const inv of Finance.cardStatus(s, c, today).invoices)
      if (inv.open > 0 && ymOf(inv.due) === ym) out.push({ cardId: c.id, cardName: c.name, amount: inv.open, due: inv.due, overdue: inv.due < today });
    return out;
  },

  /**
   * Dias do mês que têm algo (Map data → dia). income/expense = dinheiro que entra/sai das contas no dia
   * (realizado ou pendente): receitas e despesas fora do cartão, pagamentos de fatura e faturas em aberto
   * no vencimento. Compras no cartão aparecem em txs (marca 'card'), mas não entram na soma.
   */
  build(s, ym, today) {
    const byDay = new Map();
    const get = d => { if (!byDay.has(d)) byDay.set(d, { date: d, txs: [], invoices: [] }); return byDay.get(d); };
    for (const t of s.txs) if (ymOf(t.date) === ym) get(t.date).txs.push(t);
    for (const i of MonthCalendar.invoicesDue(s, ym, today)) get(i.due).invoices.push(i);
    const days = new Map();
    for (const d of [...byDay.keys()].sort()) {
      const g = byDay.get(d);
      const txs = g.txs.sort((a, b) => (a.kind !== 'income') - (b.kind !== 'income') || isCard(a) - isCard(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      let income = 0, expense = 0, overdue = false;
      const marks = new Set();
      for (const t of txs) {
        if (isCard(t)) marks.add('card');
        else if (t.kind === 'income') { income += t.value; marks.add('income'); }
        else { expense += t.value; marks.add(t.cardPayment ? 'card' : 'expense'); }
        if (!t.paid && !isCard(t) && t.date < today) overdue = true;
      }
      for (const i of g.invoices) { expense += i.amount; marks.add('card'); if (i.overdue) overdue = true; }
      days.set(d, {
        date: d, txs, invoices: g.invoices, income, expense, net: income - expense, overdue,
        marks: ['income', 'expense', 'card'].filter(m => marks.has(m)), count: txs.length + g.invoices.length,
      });
    }
    return days;
  },

  /** totais do mês: a soma de todos os dias */
  totals(days) {
    let income = 0, expense = 0;
    for (const d of days.values()) { income += d.income; expense += d.expense; }
    return { income, expense, net: income - expense };
  },

  /** valor curto para o quadradinho do dia (sem "R$"), arredondado ao mais próximo: 182 · 1,5 mil · 15 mil · 1,2 mi */
  compact(c) {
    const reais = Math.floor((Math.abs(c) + 50) / 100), sign = c < 0 ? '−' : '';
    const short = (unit, suffix) => {
      const tenths = Math.floor((reais * 10 + unit / 2) / unit);
      if (tenths >= 100) return `${Math.floor((reais + unit / 2) / unit)} ${suffix}`;
      return tenths % 10 === 0 ? `${tenths / 10} ${suffix}` : `${Math.floor(tenths / 10)},${tenths % 10} ${suffix}`;
    };
    if (reais < 1000) return sign + reais;
    if (Math.floor((reais + 500) / 1000) < 1000) return sign + short(1000, 'mil');
    if (Math.floor((reais + 500000) / 1000000) < 1000) return sign + short(1000000, 'mi');
    return sign + short(1000000000, 'bi');
  },
  /** "+5,2 mil", "−120"; zero fica "0" */
  signed: c => c > 0 ? '+' + MonthCalendar.compact(c) : c < 0 ? MonthCalendar.compact(c) : '0',

  /** "Outubro de 2026" */
  monthTitle: ym => `${capFirst(MONTHS[ym % 12])} de ${ymYear(ym)}`,
  /** "Quinta, 15 de outubro" (ano só quando não é o de hoje) */
  dayTitle(d, today) {
    const wd = capFirst(WEEKDAYS[weekday(d)].split('-')[0]);
    return `${wd}, ${+d.slice(8, 10)} de ${MONTHS[+d.slice(5, 7) - 1]}` + (d.slice(0, 4) !== today.slice(0, 4) ? ` de ${+d.slice(0, 4)}` : '');
  },
  /** frase do leitor de tela para um dia; com "Ocultar valores", sem valores */
  describe(d, day, today, hide) {
    const parts = [`${+d.slice(8, 10)} de ${MONTHS[+d.slice(5, 7) - 1]}, ${WEEKDAYS[weekday(d)]}`];
    if (d === today) parts.push('hoje');
    if (!day || !day.count) parts.push('sem lançamentos');
    else {
      parts.push(day.count === 1 ? '1 lançamento' : `${day.count} lançamentos`);
      if (!hide && (day.income || day.expense)) parts.push(day.net > 0 ? `saldo do dia mais ${Money.format(day.net)}` : day.net < 0 ? `saldo do dia menos ${Money.format(-day.net)}` : 'saldo do dia zero');
      if (day.overdue) parts.push('em atraso');
    }
    return parts.join(', ');
  },
};

export const Period = {
  /** o período é exatamente um mês inteiro? Devolve o mês (ym) ou null */
  fullMonth(from, to) {
    if (!from || !to || from.slice(8, 10) !== '01') return null;
    const ym = ymOf(from);
    return to === ymLast(ym) ? ym : null;
  },
  /** "Outubro de 2026", "Todo o período", "01/10/2026 a 15/10/2026", "Desde 01/10/2026", "Até 15/10/2026" */
  label(from, to) {
    const ym = Period.fullMonth(from, to);
    if (ym != null) return MonthCalendar.monthTitle(ym);
    const f = d => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
    if (!from && !to) return 'Todo o período';
    if (!from) return `Até ${f(to)}`;
    if (!to) return `Desde ${f(from)}`;
    if (from === to) return f(from);
    return `${f(from)} a ${f(to)}`;
  },
  /** setas ‹ ›: anda um mês inteiro; um período livre vai para o mês vizinho de onde começa (ou de hoje) */
  shift(from, to, delta, today) {
    const base = Period.fullMonth(from, to) ?? ymOf(from || to || today);
    const ym = base + delta;
    return [ymFirst(ym), ymLast(ym)];
  },
  /** pendências do mês: receitas a receber e contas a pagar fora do cartão + faturas em aberto que vencem no mês */
  monthPending(s, ym, today) {
    let toReceive = 0, toPay = 0;
    for (const t of s.txs) {
      if (t.paid || isCard(t) || ymOf(t.date) !== ym) continue;
      if (t.kind === 'income') toReceive += t.value; else toPay += t.value;
    }
    for (const i of MonthCalendar.invoicesDue(s, ym, today)) toPay += i.amount;
    return { toReceive, toPay };
  },
  /** pendências de uma lista já filtrada (fora do cartão) */
  pending(list) {
    let toReceive = 0, toPay = 0;
    for (const t of list) {
      if (t.paid || t.cardPayment || isCard(t)) continue;
      if (t.kind === 'income') toReceive += t.value; else toPay += t.value;
    }
    return { toReceive, toPay };
  },
  /** saldo de um dia na lista agrupada (mesma regra do calendário, sem as faturas) */
  cashNet: txs => txs.reduce((n, t) => isCard(t) ? n : t.kind === 'income' ? n + t.value : n - t.value, 0),
};

