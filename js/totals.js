// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Glossário único de valores (tradução de core/Totals.kt do Finan+ Android; REDESIGN-COERENCIA.md): todas as telas
// leem estes números, para que o mesmo valor tenha o mesmo nome e a mesma conta em qualquer lugar.
//
// - Realizado: o que já entrou ou saiu das contas (pago ou recebido). Compras no cartão não entram: o que sai é o
//   pagamento da fatura. Reservas para meta ficam à parte ("guardado em metas"), nunca como despesa.
// - A receber: receitas pendentes fora do cartão (no mês atual, também as atrasadas) e recorrências previstas.
// - A pagar: despesas pendentes fora do cartão (no mês atual, também as atrasadas), faturas abertas que vencem no
//   mês e recorrências previstas. Compras no cartão entram pela fatura.
// - Reservado para metas: aportes mensais planejados que ainda não foram feitos no mês.
// - Saldo atual: Finance.currentBalance. Previsto no fim do mês: saldo atual + a receber − a pagar − reservado para metas.
import { Finance, Projection, isCard, isGoal, ymOf, ymFirst, ymLast } from './core.js';

export const Totals = {
  /** quando o mês está em relação a hoje */
  WHEN: { PAST: 'PAST', CURRENT: 'CURRENT', FUTURE: 'FUTURE' },

  /** Aportes planejados (meta.monthly) ainda não feitos no mês [ym]; 0 em meses passados. Limitado ao que falta para a meta. */
  goalsPlanned(s, ym, today) {
    const cur = ymOf(today);
    if (ym < cur) return 0;
    let total = 0;
    for (const g of s.goals) {
      if (!(g.monthly > 0)) continue;
      let left = Math.max(0, g.target - g.saved);
      if (!left) continue;
      const doneNow = s.txs.filter(t => t.goalId === g.id && t.paid && ymOf(t.date) === cur)
        .reduce((n, t) => n + (t.kind === 'expense' ? t.value : -t.value), 0);
      for (let m = cur; m <= ym && left > 0; m++) {
        const want = m === cur ? Math.max(0, g.monthly - doneNow) : g.monthly;
        const take = Math.min(want, left);
        if (m === ym) total += take;
        left -= take;
      }
    }
    return total;
  },

  /** Previsto ao fim do dia [d]: Finance.futureBalance − aportes planejados dos meses já encerrados até [d] (contam no último dia do mês). */
  forecastAt(s, d, today) {
    let c = Finance.futureBalance(s, d, today);
    for (let m = ymOf(today); ymLast(m) <= d; m++) c -= Totals.goalsPlanned(s, m, today);
    return c;
  },

  /**
   * Os números de um mês: { ym, whenIs, opening, realizedIn, realizedOut, goalsSaved, toReceive, toPay, goalsPlanned,
   * closing, result, resultForecast }.
   * opening: saldo atual (mês atual), previsto no fim do mês anterior (futuro), saldo no fim do mês anterior (passado);
   * closing: previsto no fim do mês (atual e futuro) ou saldo no fim do mês (passado);
   * result = entrou − saiu − guardado; resultForecast = result + a receber − a pagar − reservado para metas.
   */
  month(s, ym, today) {
    const cur = ymOf(today), W = Totals.WHEN;
    const whenIs = ym < cur ? W.PAST : ym === cur ? W.CURRENT : W.FUTURE;
    const ids = new Set(s.accounts.map(a => a.id));
    let realizedIn = 0, realizedOut = 0, goalsSaved = 0;
    for (const t of s.txs) {
      if (!t.paid || isCard(t) || !ids.has(t.accountId) || ymOf(t.date) !== ym) continue;
      if (isGoal(t)) goalsSaved += t.kind === 'expense' ? t.value : -t.value;
      else if (t.kind === 'income') realizedIn += t.value;
      else realizedOut += t.value;
    }
    // pendências: no mês atual, também as atrasadas (é o que o previsto desconta)
    const end = ymLast(ym);
    let toReceive = 0, toPay = 0;
    for (const t of s.txs) {
      if (t.paid || isCard(t)) continue;
      const counts = whenIs === W.CURRENT ? t.date <= end : ymOf(t.date) === ym;
      if (!counts) continue;
      if (t.kind === 'income') toReceive += t.value; else toPay += t.value;
    }
    for (const c of s.cards) for (const inv of Finance.cardStatus(s, c, today).invoices) {
      if (inv.open <= 0) continue;
      const counts = whenIs === W.CURRENT ? inv.due <= end : ymOf(inv.due) === ym;
      if (counts) toPay += inv.open;
    }
    if (whenIs !== W.PAST) for (const t of Projection.between(s, ymFirst(ym), end, today)) {
      if (isCard(t)) continue;
      if (t.kind === 'income') toReceive += t.value; else toPay += t.value;
    }
    const goalsPlanned = Totals.goalsPlanned(s, ym, today);
    const opening = whenIs === W.CURRENT ? Finance.currentBalance(s)
      : whenIs === W.FUTURE ? Totals.forecastAt(s, ymLast(ym - 1), today)
        : Finance.balanceAt(s, ymLast(ym - 1));
    const closing = whenIs === W.PAST ? Finance.balanceAt(s, end) : opening + toReceive - toPay - goalsPlanned;
    const result = realizedIn - realizedOut - goalsSaved;
    return { ym, whenIs, opening, realizedIn, realizedOut, goalsSaved, toReceive, toPay, goalsPlanned, closing,
      result, resultForecast: result + toReceive - toPay - goalsPlanned };
  },
};
