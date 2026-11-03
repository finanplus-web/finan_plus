// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regras de apresentação da aba Resumo (tradução de core/SummaryView.kt do Finan+ Android; RESUMO.md).
// Nada aqui muda quais lançamentos entram nas contas: receitas, despesas, reservas para meta e previsto continuam
// vindo de Finance e Period. Aqui só ficam o selo do mês, os percentuais que somam 100%, a comparação com o mês
// anterior, as categorias (até 5 + "Outras") e a evolução.
import { Finance, isCard, isFlow, card as cardOf, ymOf, ymLen, dom } from './core.js';
import { Period } from './calendar.js';
import { TxForm } from './txform.js';
import { compact } from './report.js';

const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sum = l => l.reduce((n, t) => n + t.value, 0);

export const SummaryView = {
  PHASE: { IN_PROGRESS: 'IN_PROGRESS', CLOSED: 'CLOSED', FUTURE: 'FUTURE' },
  MAX_CATEGORIES: 5,
  OTHERS: 'Outras',
  NO_CATEGORY: 'Sem categoria',

  /** Selo do mês, só para mês inteiro: { phase, day, length } (day/length só em IN_PROGRESS; senão 0). Período livre: null. */
  status(from, to, today) {
    const ym = Period.fullMonth(from, to);
    if (ym == null) return null;
    const cur = ymOf(today);
    if (ym === cur) return { phase: 'IN_PROGRESS', day: dom(today), length: ymLen(ym) };
    return { phase: ym < cur ? 'CLOSED' : 'FUTURE', day: 0, length: 0 };
  },

  /**
   * Percentuais inteiros que somam sempre 100 (método do maior resto): 126/226 e 100/226 viram 56% e 44%.
   * Valores negativos contam como zero. Sem total, tudo 0.
   */
  percents(values) {
    const v = values.map(x => Math.max(0, x));
    const total = v.reduce((a, b) => a + b, 0);
    if (total <= 0) return v.map(() => 0);
    const base = v.map(x => Math.trunc(x * 100 / total));
    let left = 100 - base.reduce((a, b) => a + b, 0);
    // quem tem o maior resto ganha o ponto que sobrou (empate: o maior valor, depois o primeiro)
    const order = v.map((_, i) => i).sort((a, b) => ((v[b] * 100) % total) - ((v[a] * 100) % total) || v[b] - v[a] || a - b);
    for (let i = 0; left > 0; i++, left--) base[order[i % order.length]]++;
    return base;
  },

  /**
   * Diferença em relação ao período anterior: { amount, up } — só existe se o período anterior tiver dados
   * ([prev] = { income, expense } com algo realizado). Sem comparação possível ou sem dados: null.
   */
  delta: (cur, prev, prevValue) => prev == null || (prev.income === 0 && prev.expense === 0) ? null
    : { amount: cur - prevValue, up: cur - prevValue >= 0 },

  /** próxima entrada pendente do período (a mais antiga; empate: a de maior valor) como Due; null = nada pendente */
  nextIncome(list) {
    let best = null;
    for (const t of list) {
      if (t.kind !== 'income' || t.paid || !isFlow(t) || isCard(t)) continue;
      if (!best || t.date < best.date || (t.date === best.date && t.value > best.value)) best = t;
    }
    return best && { title: best.desc, amount: best.value, date: best.date, category: best.category, refId: best.id, invoice: false };
  },

  /**
   * Compras no cartão do período (já contam como despesa, na data da compra) e a data da fatura em que entram:
   * { amount, invoiceDue } — a mais próxima de hoje em diante; se todas já venceram, a última. null = sem compras.
   */
  cardSpend(s, list, today) {
    const buys = list.filter(t => isCard(t) && isFlow(t) && t.paid && t.kind === 'expense');
    if (!buys.length) return null;
    const dues = [...new Set(buys.map(t => { const c = cardOf(s, t.cardId); return c ? Finance.invoiceDue(c, Finance.invoiceYm(c, t.date)) : null; })
      .filter(Boolean))].sort();
    return { amount: sum(buys), invoiceDue: dues.find(d => d >= today) ?? dues.at(-1) ?? null };
  },

  /**
   * Despesas realizadas por categoria da compra (cartão só como subtítulo; sem categoria = "Sem categoria"; categorias
   * antigas de cartão e limite especial aparecem como "Outros"), da maior para a menor. Pagamento de fatura e reserva
   * para meta ficam fora. { total, top (até [max]), others ("Outras" com a soma do resto, ou null), othersCount, all };
   * cada linha: { name, value, cards (nomes dos cartões usados), percent }.
   */
  categories(s, list, max = SummaryView.MAX_CATEGORIES) {
    const groups = new Map();
    for (const t of list) {
      if (t.kind !== 'expense' || !t.paid || !isFlow(t)) continue;
      const name = TxForm.displayCategory(String(t.category ?? '').trim()) || SummaryView.NO_CATEGORY;
      const g = groups.get(name);
      if (g) g.push(t); else groups.set(name, [t]);
    }
    const rows = [...groups].map(([name, g]) => ({ name, value: sum(g),
      cards: [...new Set(g.filter(isCard).map(t => cardOf(s, t.cardId)?.name).filter(n => n != null))].sort(cmp) }))
      .sort((a, b) => b.value - a.value || cmp(a.name, b.name));
    const total = rows.reduce((n, r) => n + r.value, 0);
    const pct = SummaryView.percents(rows.map(r => r.value));
    const all = rows.map((r, i) => ({ ...r, percent: pct[i] }));
    const top = all.slice(0, max), rest = all.slice(max);
    const others = rest.length ? { name: SummaryView.OTHERS, value: rest.reduce((n, r) => n + r.value, 0), cards: [], percent: 0 } : null;
    return { total, top, others, othersCount: rest.length, all };
  },

  /**
   * Últimos [n] meses até o de [today], só os que têm lançamentos (receita ou despesa realizada, ou reserva para meta):
   * [{ ym, income, expense, goals (guardado − retirado), current }].
   */
  evolution(s, today, n = 6) {
    const out = [], cur = ymOf(today);
    for (let i = n - 1; i >= 0; i--) {
      const ym = cur - i;
      const txs = s.txs.filter(t => ymOf(t.date) === ym);
      const fl = Finance.flow(txs), g = Finance.goalMoves(txs);
      if (fl.income === 0 && fl.expense === 0 && g.saved === 0 && g.withdrawn === 0) continue;
      out.push({ ym, income: fl.income, expense: fl.expense, goals: g.net, current: ym === cur });
    }
    return out;
  },

  /** valor curto sobre as barras, sem "R$": "950", "1,2 mil", "3,4 mi" */
  short: c => compact(c).replace('R$ ', ''),
};
