// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Dados da tela Meu dinheiro (tradução de core/MoneyView.kt do Finan+ Android; MEU-DINHEIRO.md). Só organiza números
// que o app já calcula: saldo das contas = Finance.accountBalance (o mesmo do "Saldo atual" do Início), fatura e
// limite = Finance.cardStatus, guardado = meta.saved. Nenhuma regra nova de cálculo.
import { Finance, Money, isGoal, dayNum } from './core.js';

const HIDDEN = 'R$ ••••';
const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export const MoneyView = {
  /** faixa da barra de uso do limite */
  BAND: { NORMAL: 'NORMAL', ALERT: 'ALERT', CRITICAL: 'CRITICAL' },

  /** singular ou plural (pt-BR: só 1 é singular) */
  plural: (n, one, many) => n === 1 ? one : many,

  /** % do limite usado, arredondado para baixo (0 quando o limite é zero) */
  pct: (used, limit) => limit <= 0 ? 0 : Math.min(Math.trunc(Math.max(used, 0) * 100 / limit), 2147483647),

  /** até 69%: primária; 70% a 89%: alerta; 90% ou mais: alerta com ícone e negrito */
  band: pct => pct >= 90 ? 'CRITICAL' : pct >= 70 ? 'ALERT' : 'NORMAL',

  /**
   * Linha de um cartão: { card, invoice (fatura aberta mostrada, a mesma do "Pagar fatura"; null sem fatura), used,
   * available, pct, band, daysToDue (negativo = vencida; null sem fatura), open, dueSoon (≤ 15 dias),
   * alert (vence em até 7 dias ou uso ≥ 90%) }.
   */
  cardRow(s, card, today) {
    const st = Finance.cardStatus(s, card, today);
    const invoice = st.current && st.current.open > 0 ? st.current : null;
    const pct = MoneyView.pct(st.used, card.limit);
    const daysToDue = invoice ? dayNum(invoice.due) - dayNum(today) : null;
    return { card, invoice, used: st.used, available: st.available, pct, band: MoneyView.band(pct), daysToDue,
      open: invoice?.open ?? 0, dueSoon: daysToDue != null && daysToDue <= 15,
      alert: (daysToDue != null && daysToDue <= 7) || pct >= 90 };
  },

  /** cartões pelo vencimento da fatura aberta mais próxima; os sem fatura vão para o fim (pelo nome) */
  cards: (s, today) => s.cards.map(c => MoneyView.cardRow(s, c, today))
    .sort((a, b) => (!a.invoice - !b.invoice) || cmp(a.invoice?.due ?? '', b.invoice?.due ?? '') || cmp(a.card.name.toLowerCase(), b.card.name.toLowerCase())),

  /** { inAccounts, inGoals, openInvoices } */
  overview: (s, today) => ({
    inAccounts: s.accounts.reduce((n, a) => n + Finance.accountBalance(s, a), 0),
    inGoals: s.goals.reduce((n, g) => n + g.saved, 0),
    openInvoices: MoneyView.cards(s, today).reduce((n, r) => n + r.open, 0),
  }),

  /** quanto saiu desta conta para metas e ainda não voltou (lançamentos de reserva da conta) */
  reservedFrom: (s, account) => Math.max(0, s.txs.filter(t => isGoal(t) && t.accountId === account.id)
    .reduce((n, t) => n + (t.kind === 'expense' ? t.value : -t.value), 0)),

  /** sufixo do vencimento quando faltam 15 dias ou menos: "· daqui a 12 dias", "· amanhã", "· vence hoje", "· vencida" */
  dueSuffix(days) {
    if (days == null || days > 15) return null;
    if (days < 0) return '· vencida';
    if (days === 0) return '· vence hoje';
    if (days === 1) return '· amanhã';
    return `· daqui a ${days} dias`;
  },

  /** resumo de Metas: "Notebook · R$ 100,00 guardado" ou "2 metas · R$ X guardados" */
  goalsSummary(goals, hide) {
    if (!goals.length) return null;
    const total = hide ? HIDDEN : Money.format(goals.reduce((n, g) => n + g.saved, 0));
    return goals.length === 1 ? `${goals[0].name} · ${total} guardado` : `${goals.length} metas · ${total} guardados`;
  },

  /** resumo de Limites: "3 limites · 1 perto do teto" (perto do teto = 80% ou mais). [limits]/[usage]: Map categoria → centavos */
  limitsSummary(limits, usage) {
    if (!limits.size) return null;
    let near = 0;
    for (const [c, l] of limits) if (l > 0 && (usage.get(c) ?? 0) * 100 >= l * 80) near++;
    return `${limits.size} ${MoneyView.plural(limits.size, 'limite', 'limites')} · ${near} perto do teto`;
  },

  /** cabeçalho recolhido de Contas: "Contas · R$ 266,88" (+ "· 2 contas" com mais de uma) */
  accountsCollapsed(s, hide) {
    const total = hide ? HIDDEN : Money.format(s.accounts.reduce((n, a) => n + Finance.accountBalance(s, a), 0));
    return `Contas · ${total}` + (s.accounts.length > 1 ? ` · ${s.accounts.length} contas` : '');
  },

  /** cabeçalho recolhido de Cartões: "Cartões · 3 · R$ 979,39 em faturas" */
  cardsCollapsed(s, today, hide) {
    const total = hide ? HIDDEN : Money.format(MoneyView.cards(s, today).reduce((n, r) => n + r.open, 0));
    return `Cartões · ${s.cards.length} · ${total} em faturas`;
  },

  /** linha de alerta: "Sofisa 6333 · vence 15/11 · 98% do limite" (só as partes que se aplicam) */
  alertLine(r, hide) {
    const parts = [r.card.name];
    if (r.invoice && r.daysToDue != null && r.daysToDue <= 7) parts.push(r.daysToDue < 0 ? `vencida em ${dm(r.invoice.due)}` : `vence ${dm(r.invoice.due)}`);
    if (r.pct >= 90) parts.push(hide ? 'perto do limite' : `${r.pct}% do limite`);
    return parts.join(' · ');
  },

  /** descrição da barra para leitores de tela: "Sofisa 6333, 98% do limite usado, disponível R$ 11,49" */
  barDescription: (r, hide) => hide ? `${r.card.name}, uso do limite oculto`
    : `${r.card.name}, ${r.pct}% do limite usado, disponível ${Money.format(r.available)}`,

  dm,
};
