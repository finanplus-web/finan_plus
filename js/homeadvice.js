// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regras da tela Início que cruzam informações (tradução de core/HomeAdvice.kt do Finan+ Android; INICIO.md).
// Nada aqui muda os números da tela: saldo, previsto, "falta receber" e "falta pagar" vêm do glossário único
// (totals.js).
//
// Due = { title, amount, date, category, refId, invoice } — algo pendente que entra ou sai das contas numa data.
import { Finance, CARD_PAYMENT_CAT, isCard, ymOf, ymFirst, ymLast } from './core.js';
import { MonthCalendar } from './calendar.js';

const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const due = (title, amount, date, category, refId, invoice = false) => ({ title, amount, date, category, refId, invoice });
const byDateTitle = (a, b) => cmp(a.date, b.date) || cmp(a.title, b.title);

export const HomeAdvice = {
  /**
   * Contas a pagar pendentes do mês [ym]: despesas fora do cartão ainda não pagas e faturas em aberto que vencem no
   * mês (no mês atual, também as atrasadas): as mesmas que formam o "A pagar" de Totals.
   */
  monthBills(s, ym, today) {
    const current = ym === ymOf(today), first = ymFirst(ym);
    const bills = s.txs.filter(t => !t.paid && !isCard(t) && t.kind === 'expense' && (ymOf(t.date) === ym || (current && t.date < first)))
      .map(t => due(t.desc, t.value, t.date, t.category, t.id));
    const invs = current
      ? s.cards.flatMap(c => Finance.cardStatus(s, c, today).invoices.filter(i => i.open > 0 && i.due <= ymLast(ym))
        .map(i => due(`Fatura ${c.name}`, i.open, i.due, CARD_PAYMENT_CAT, c.id, true)))
      : MonthCalendar.invoicesDue(s, ym, today).map(i => due(`Fatura ${i.cardName}`, i.amount, i.due, CARD_PAYMENT_CAT, i.cardId, true));
    return [...bills, ...invs].sort(byDateTitle);
  },

  /** valores a receber pendentes do mês [ym] (os mesmos do "Falta receber"; com [today] no mês atual, também os atrasados), do mais antigo para o mais novo */
  monthIncome(s, ym, today = null) {
    const first = ymFirst(ym), current = today != null && ym === ymOf(today);
    return s.txs.filter(t => !t.paid && !isCard(t) && t.kind === 'income' && (ymOf(t.date) === ym || (current && t.date < first)))
      .map(t => due(t.desc, t.value, t.date, t.category, t.id))
      .sort((a, b) => cmp(a.date, b.date) || b.amount - a.amount);
  },

  /** próximo recebimento pendente do mês, para o cartão "Falta receber" (null = tudo recebido) */
  nextIncome: (s, today) => HomeAdvice.monthIncome(s, ymOf(today), today)[0] ?? null,

  /**
   * Risco no próximo dia com contas: soma as contas pendentes até esse dia (atrasadas contam como de hoje); se o
   * saldo de hoje não cobre, devolve { day, bills, balance, missing, income (o maior a receber até lá, ou null), sameDay }.
   * null = sem risco ou sem contas pendentes no mês.
   */
  risk(s, today) {
    const ym = ymOf(today);
    const bills = HomeAdvice.monthBills(s, ym, today);
    if (!bills.length) return null;
    const eff = d => d < today ? today : d;
    const day = bills.map(b => eff(b.date)).reduce((a, b) => b < a ? b : a);
    const c = bills.filter(b => eff(b.date) <= day).reduce((n, b) => n + b.amount, 0);
    const balance = Finance.currentBalance(s);
    if (balance >= c) return null;
    let best = null;
    for (const i of HomeAdvice.monthIncome(s, ym, today)) {
      if (eff(i.date) > day) continue;
      // maior valor; empate: a data mais tarde (empate total: o primeiro, como o maxWithOrNull do Kotlin)
      if (!best || i.amount > best.amount || (i.amount === best.amount && i.date > best.date)) best = i;
    }
    const income = best ? { ...best, date: eff(best.date) } : null;
    return { day, bills: c, balance, missing: c - balance, income, sameDay: income != null && income.date >= day };
  },

  /**
   * Próximos vencimentos do Início, agrupados por data: [{ date, nextMonth (de um mês seguinte: não entra no
   * "Falta pagar" do mês), overdue, items }].
   */
  upcoming(s, today, limit = 4) {
    const bills = s.txs.filter(t => !t.paid && !isCard(t) && t.kind === 'expense').map(t => due(t.desc, t.value, t.date, t.category, t.id));
    const invs = s.cards.flatMap(c => Finance.cardStatus(s, c, today).invoices.filter(i => i.open > 0)
      .map(i => due(`Fatura ${c.name}`, i.open, i.due, CARD_PAYMENT_CAT, c.id, true)));
    const groups = new Map();
    for (const d of [...bills, ...invs].sort(byDateTitle).slice(0, Math.max(0, limit))) {
      const g = groups.get(d.date);
      if (g) g.push(d); else groups.set(d.date, [d]);
    }
    return [...groups].map(([date, items]) => ({ date, nextMonth: ymOf(date) > ymOf(today), overdue: date < today, items }));
  },

  /** linhas do resumo que só repetem o que os cartões de cima já mostram ("faltam … a pagar", "a receber") */
  repeatsCards: line => line.startsWith('Ainda faltam ') || line.startsWith('A receber neste mês'),
};
