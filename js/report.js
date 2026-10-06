// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Números do relatório em PDF de um período (tradução de core/report/Report.kt). Só cálculo.
// Convenções: receitas/despesas = realizados no período; pagamento de fatura não é despesa nova;
// pendentes (a receber / a pagar) aparecem à parte.
import { Finance, isFlow, ymOf, ymLen, ymFirst, ymLast, ymYear, dayNum, addDays } from './core.js';

export const TOP = 10;
export const MAX_CHART_MONTHS = 24;
const sum = l => l.reduce((n, t) => n + t.value, 0);
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function buildReport(s, from, to, today) {
  if (to < from) throw new Error('período inválido');
  void today;
  const days = dayNum(to) - dayNum(from) + 1;
  const inRange = (t, a, b) => t.date >= a && t.date <= b;
  const period = s.txs.filter(t => inRange(t, from, to));
  const flows = period.filter(isFlow), done = flows.filter(t => t.paid);
  const inc = done.filter(t => t.kind === 'income'), exp = done.filter(t => t.kind === 'expense');
  const pending = flows.filter(t => !t.paid);
  const prevTo = addDays(from, -1), prevFrom = addDays(prevTo, 1 - days);
  const prevDone = s.txs.filter(t => isFlow(t) && t.paid && inRange(t, prevFrom, prevTo));

  let span = 0;
  for (let m = ymOf(from); m <= ymOf(to); m++) {
    const a = from > ymFirst(m) ? from : ymFirst(m), b = to < ymLast(m) ? to : ymLast(m);
    span += (dayNum(b) - dayNum(a) + 1) / ymLen(m);
  }
  const byCategory = (l, limits) => {
    const total = sum(l), g = new Map();
    for (const t of l) { const x = g.get(t.category); if (x) x.push(t); else g.set(t.category, [t]); }
    return [...g].map(([name, list]) => {
      const value = sum(list);
      const monthlyLimit = limits?.has(name) ? limits.get(name) : null;
      const monthlyAverage = Math.round(value / Math.max(span, 1));
      return { name, value, percent: total > 0 ? value * 100 / total : 0, count: list.length, monthlyAverage, monthlyLimit,
        overLimit: monthlyLimit != null && monthlyAverage > monthlyLimit };
    }).sort((a, b) => b.value - a.value || cmp(a.name, b.name));
  };
  const months = [];
  for (let m = ymOf(from); m <= ymOf(to); m++) {
    const l = done.filter(t => ymOf(t.date) === m);
    const income = sum(l.filter(t => t.kind === 'income')), expense = sum(l.filter(t => t.kind === 'expense'));
    months.push({ ym: m, income, expense, balance: income - expense });
  }
  const income = sum(inc), expense = sum(exp);
  return {
    from, to, days, monthSpan: span, income, expense, balance: income - expense,
    savingsRate: income > 0 ? (income - expense) * 100 / income : null,
    dailyAverage: days > 0 ? Math.trunc(expense / days) : 0,
    pendingIncome: sum(pending.filter(t => t.kind === 'income')), pendingExpense: sum(pending.filter(t => t.kind === 'expense')),
    prevFrom, prevTo, prevIncome: sum(prevDone.filter(t => t.kind === 'income')), prevExpense: sum(prevDone.filter(t => t.kind === 'expense')),
    expenseByCategory: byCategory(exp, s.limits), incomeByCategory: byCategory(inc, null), months,
    topExpenses: [...exp].sort((a, b) => b.value - a.value || cmp(a.date, b.date)).slice(0, TOP),
    txs: [...period].sort((a, b) => cmp(a.date, b.date) || (a.kind !== 'income') - (b.kind !== 'income') || cmp(a.desc, b.desc)),
    accounts: s.accounts.map(a => [a.name, Finance.accountBalance(s, a)]),
    goals: s.goals.map(g => ({ name: g.name, saved: g.saved, target: g.target, deadline: g.deadline,
      percent: g.target > 0 ? Math.min(100, g.saved * 100 / g.target) : 0 })),
  };
}

/** variação percentual; null sem base de comparação */
export const change = (cur, prev) => prev > 0 ? (cur - prev) * 100 / prev : null;

function one(v) {
  const x = Math.round(v * 10) / 10;
  return x === Math.floor(x) ? String(x) : String(x).replace('.', ',');
}
/** valor curto para eixos: "R$ 950", "R$ 1,2 mil", "R$ 3,4 mi" */
export function compact(c) {
  const r = Math.abs(c) / 100;
  const s = r < 1000 ? 'R$ ' + Math.round(r) : r < 1e6 ? `R$ ${one(r / 1000)} mil` : `R$ ${one(r / 1e6)} mi`;
  return c < 0 ? '-' + s : s;
}
/** escala "bonita" para o eixo: 0, passo, 2·passo… até cobrir max */
export function niceStep(max, ticks = 4) {
  if (max <= 0) return 10000;
  const raw = max / ticks, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return Math.max(Math.round(f * mag), 100); // nunca zero: com 1 ou 2 centavos o passo arredondava para 0 e o gráfico do PDF travava
}
export const reportFileName = (from, to) => `relatorio-finan-plus-${from}-a-${to}.pdf`;

export const PRESETS = [['mes', 'Este mês'], ['anterior', 'Mês passado'], ['ano', 'Este ano'], ['12m', '12 meses'], ['tudo', 'Tudo']];
/** atalhos de período da tela de exportação → [de, até] */
export function preset(key, today, first, last) {
  const ym = ymOf(today), y = ymYear(ym);
  switch (key) {
    case 'mes': return [ymFirst(ym), ymLast(ym)];
    case 'anterior': return [ymFirst(ym - 1), ymLast(ym - 1)];
    case 'ano': return [`${y}-01-01`, `${y}-12-31`];
    case '12m': return [ymFirst(ym - 11), ymLast(ym)];
    default: {
      const a = first && first < ymFirst(ym) ? first : ymFirst(ym);
      const b = last && last > today ? last : today;
      return [a, b];
    }
  }
}
