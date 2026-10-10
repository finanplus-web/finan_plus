// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Simulador "E se…?" e a comparação de períodos dos Relatórios.
// Nada aqui grava no estado. Mesmas regras e testes do app Android (core/Simulator.kt, PeriodCompare em core/Period.kt).
// Detalhes em SIMULADOR.md.
import { Finance, isCard, ymOf, ymFirst, ymLast, ymLen, ymDay, addDays, dayNum, dom, MONTHS, MONTHS_SHORT, ymYear, ymMonth } from './core.js';
import { Period } from './calendar.js';

export const BASE_MONTHS = 3;

export const Simulator = {
  /**
   * Base: média dos 3 meses completos antes do mês de hoje, só realizados, só meses com algum valor.
   * { income, expense, left, months } — months = quantos meses entraram (0 = sem histórico).
   */
  base(s, today) {
    const flows = [1, 2, 3].map(i => Finance.monthFlow(s, ymOf(today) - i)).filter(f => f.income > 0 || f.expense > 0);
    if (!flows.length) return mkBase(0, 0, 0);
    const n = flows.length;
    return mkBase(Math.round(flows.reduce((a, f) => a + f.income, 0) / n), Math.round(flows.reduce((a, f) => a + f.expense, 0) / n), n);
  },
  mkBase: (income, expense, months = 0) => mkBase(income, expense, months),

  /** guardar perMonth por months meses */
  save(base, perMonth, months) {
    return { perMonth, months, total: perMonth * months, newLeft: base.left - perMonth, overLeft: perMonth > base.left };
  },

  /** meses até juntar (a partir do mês que vem); null se nada a guardar e ainda falta dinheiro. doneYm = mês em que completa */
  buy(price, have, perMonth, today) {
    const missing = Math.max(0, price - have);
    if (missing === 0) return { missing: 0, months: 0, doneYm: ymOf(today) };
    if (perMonth <= 0) return null;
    const months = Math.ceil(missing / perMonth);
    return { missing, months, doneYm: ymOf(today) + months };
  },

  /** renda muda percent% (ex.: −15) */
  income(base, percent, goalsMonthly) {
    const newIncome = Math.round(base.income * (1 + percent / 100));
    const diff = newIncome - base.income;
    return { newIncome, diff, newLeft: base.left + diff, yearDiff: diff * 12, goalsMonthly };
  },

  /** soma das contribuições mensais das metas não concluídas */
  goalsMonthly: s => s.goals.filter(g => g.saved < g.target).reduce((n, g) => n + (g.monthly || 0), 0),

  /**
   * Parcelamentos com parcelas a pagar: na conta, as pendentes; no cartão, as com data depois de hoje.
   * Ordenados pelo que falta pagar (maior primeiro).
   */
  debts(s, today) {
    const groups = new Map();
    for (const t of s.txs) {
      if (!t.groupId || !(t.parcelTotal > 1) || t.kind !== 'expense') continue;
      if (!groups.has(t.groupId)) groups.set(t.groupId, []);
      groups.get(t.groupId).push(t);
    }
    const out = [];
    for (const [groupId, l] of groups) {
      const rest = l.filter(t => isCard(t) ? t.date > today : !t.paid);
      if (!rest.length) continue;
      const first = l.reduce((a, b) => b.parcelN < a.parcelN ? b : a);
      const name = first.desc.replace(/\s*\(?\d+\/\d+\)?\s*$/, '').trim() || first.desc;
      out.push({ groupId, name, parcel: Math.max(...rest.map(t => t.value)), remaining: rest.length, total: first.parcelTotal, left: rest.reduce((n, t) => n + t.value, 0), card: isCard(first) });
    }
    return out.sort((a, b) => b.left - a.left);
  },

  /** quitar hoje por payNow: o app não conhece os juros, a economia é a diferença entre o que falta e o valor oferecido */
  payoff: (debt, payNow, balance) => ({ payNow, saved: Math.max(0, debt.left - payNow), freedPerMonth: debt.parcel, months: debt.remaining, balanceAfter: balance - payNow }),

  /** "janeiro de 2028" */
  monthYear: ym => `${MONTHS[ymMonth(ym) - 1]} de ${ymYear(ym)}`,
};

function mkBase(income, expense, months) { return { income, expense, left: income - expense, months }; }

export const PeriodCompare = {
  /**
   * mês atual inteiro → mês anterior até o mesmo dia; outro mês inteiro → mês anterior inteiro;
   * período livre → mesmo tamanho logo antes; sem início ou fim → null. { from, to, label }
   */
  of(from, to, today) {
    const ym = Period.fullMonth(from, to);
    if (ym != null) {
      const prev = ym - 1;
      if (ym === ymOf(today)) return { from: ymFirst(prev), to: ymDay(prev, Math.min(dom(today), ymLen(prev))), label: `vs. ${MONTHS_SHORT[ymMonth(prev) - 1]} (mesmos dias)` };
      return { from: ymFirst(prev), to: ymLast(prev), label: `vs. ${MONTHS[ymMonth(prev) - 1]}` };
    }
    if (!from || !to || to < from) return null;
    const days = dayNum(to) - dayNum(from) + 1;
    return { from: addDays(from, -days), to: addDays(from, -1), label: 'vs. período anterior' };
  },
  /** "+12% vs. …", "−9% vs. …"; sem valor na referência: "Sem base para comparar" */
  text(cur, prev, c) {
    if (prev <= 0) return 'Sem base para comparar';
    const pct = Math.round((cur - prev) * 100 / prev);
    return (pct > 0 ? '+' : pct < 0 ? '−' : '') + Math.abs(pct) + '% ' + c.label;
  },
};
