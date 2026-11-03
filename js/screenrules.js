// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regras de apresentação das telas redesenhadas (Android 1.10 e 1.11; REDESIGN-COERENCIA.md) que não dependem do
// navegador: frases dos cartões, a conta do botão "info", o valor de cada dia do calendário, os resumos dos cards
// de navegação de Meu dinheiro, o alerta de meta, o resumo de "Mais opções" e a ordem das categorias.
// Nada aqui muda um número: tudo vem de Totals, HomeAdvice, MoneyView, Debts e Finance (testado em
// tests/screenrules.test.mjs).
import { Finance, Money, brMonthYear, ymOf, ymLast } from './core.js';
import { MonthCalendar } from './calendar.js';
import { HomeAdvice } from './homeadvice.js';
import { MoneyView } from './moneyview.js';
import { Debts } from './debts.js';
import { Words } from './words.js';

const HIDDEN = 'R$ ••••';
const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export const ScreenRules = {
  /**
   * A conta do botão "info" do previsto: "Hoje R$ X + R$ Y a receber − R$ Z a pagar = R$ W" (com "− R$ M para
   * metas" quando há aporte planejado). Só aparece quando fecha com os números da tela; null se não fechar.
   * [t] = Totals.month do mês atual.
   */
  forecastMath(t, fmt = Money.format) {
    if (t.opening + t.toReceive - t.toPay - t.goalsPlanned !== t.closing) return null;
    return t.goalsPlanned > 0
      ? `Hoje ${fmt(t.opening)} + ${fmt(t.toReceive)} a receber − ${fmt(t.toPay)} a pagar − ${fmt(t.goalsPlanned)} para metas = ${fmt(t.closing)}`
      : `Hoje ${fmt(t.opening)} + ${fmt(t.toReceive)} a receber − ${fmt(t.toPay)} a pagar = ${fmt(t.closing)}`;
  },

  /** linha de apoio de "Falta receber": "Próximo: R$ X em dd/MM", "Tudo recebido este mês" ou "Nada a receber este mês" */
  receiveNote(s, today, hide = false) {
    const n = HomeAdvice.nextIncome(s, today);
    if (n) return `Próximo: ${hide ? HIDDEN : Money.format(n.amount)} em ${dm(n.date < today ? today : n.date)}`;
    return Finance.monthFlow(s, ymOf(today)).income > 0 ? 'Tudo recebido este mês' : 'Nada a receber este mês';
  },

  /** linha de apoio de "Falta pagar": "2 contas até 30/11" ou "Tudo pago neste mês" */
  payNote(s, today) {
    const ym = ymOf(today), n = HomeAdvice.monthBills(s, ym, today).length;
    return n ? `${Words.count(n, 'conta', 'contas')} até ${dm(ymLast(ym))}` : 'Tudo pago neste mês';
  },

  /**
   * Partes do aviso de risco (o texto do HomeAdvice.risk com os valores marcados): [{ text, tone }] com tone
   * 'neg' (contas e o que falta), 'pos' (o recebimento) ou null. Com [hide], os valores viram "R$ ••••".
   */
  riskParts(r, hide = false) {
    const v = c => hide ? HIDDEN : Money.format(c);
    const day = String(+r.day.slice(8, 10));
    const P = (text, tone = null) => ({ text, tone });
    if (!r.income) return [P(`No dia ${day} vencem `), P(v(r.bills), 'neg'), P(` e seu saldo hoje é ${v(r.balance)}. Faltam `), P(v(r.missing), 'neg'), P(' para cobrir essas contas.')];
    const name = String(r.income.title ?? '').trim().toLowerCase() || 'recebimento';
    const when = r.sameDay ? ' cai no mesmo dia.' : ` cai antes, no dia ${+r.income.date.slice(8, 10)}.`;
    return [P(`No dia ${day} vencem `), P(v(r.bills), 'neg'), P(` e o ${name} de `), P(v(r.income.amount), 'pos'),
      P(`${when} Se ele atrasar, seu saldo de ${v(r.balance)} não cobre: faltariam `), P(v(r.missing), 'neg'), P('.')];
  },

  /** rótulo do grupo dos próximos vencimentos: "SÁBADO, 14 DE NOVEMBRO", "EM ATRASO · …", "PRÓXIMO MÊS · 1 DE DEZEMBRO" */
  dueGroupLabel(g, today) {
    if (g.nextMonth) return `Próximo mês · ${+g.date.slice(8, 10)} de ${MonthCalendar.dayTitle(g.date, today).split(' de ').slice(1).join(' de ')}`.toUpperCase();
    const t = MonthCalendar.dayTitle(g.date, today);
    return (g.overdue ? `Em atraso · ${t}` : t).toUpperCase();
  },

  /**
   * Valor do quadradinho do dia no calendário, sempre com sinal: { text, tone: 'red' | 'green' | 'goal' } ou null.
   * Dia só com reserva para meta mostra "−100" no âmbar das metas (retirada: "+100" em verde).
   */
  calDayValue(day) {
    if (!day) return null;
    const hasFlow = day.hasFlow ?? !!(day.income || day.expense), net = day.flowNet ?? day.net ?? 0;
    if (hasFlow) return { text: MonthCalendar.signed(net), tone: net < 0 ? 'red' : 'green' };
    if (day.goals) return { text: MonthCalendar.signed(-day.goals), tone: day.goals > 0 ? 'goal' : 'green' };
    return null;
  },

  /** resumo do card "Contas e cartões": "1 conta · 3 cartões" */
  accountsCardsSummary: s => [Words.count(s.accounts.length, 'conta', 'contas'), s.cards.length ? Words.count(s.cards.length, 'cartão', 'cartões') : null].filter(Boolean).join(' · '),

  /** resumo do card "Metas": "1 meta · R$ 100,00 guardados"; sem metas: null */
  goalsSummary(goals, hide = false) {
    if (!goals.length) return null;
    const total = hide ? HIDDEN : Money.format(goals.reduce((n, g) => n + g.saved, 0));
    return `${Words.count(goals.length, 'meta', 'metas')} · ${total} guardados`;
  },

  /** resumo do card "Limites mensais": "2 limites · 1 perto do teto"; sem limites: "Nenhum limite ainda" */
  limitsSummary: (s, today) => MoneyView.limitsSummary(s.limits, Finance.budgetUsage(s, ymOf(today))) ?? 'Nenhum limite ainda',

  /** resumo do card "Dívidas" */
  debtsSummary: (s, hide = false) => Debts.summary(s, hide) ?? 'Nenhuma dívida em aberto',

  /**
   * Alerta de Meu dinheiro: a primeira meta que vai passar do prazo (pela contribuição mensal) ou cujo prazo já
   * passou. { goal, title, text (ou null) } ou null.
   */
  goalAlert(s, today, hide = false) {
    for (const g of s.goals) {
      const plan = Finance.goalPlan(g, today);
      if (plan.done) continue;
      if (plan.pastDue) return { goal: g, title: `O prazo da meta ${g.name} já passou`, text: null };
      if (plan.late && plan.needed != null) return { goal: g, title: `A meta ${g.name} vai passar do prazo`,
        text: `Para chegar em ${brMonthYear(ymOf(g.deadline))}, guarde ${hide ? HIDDEN : Money.format(plan.needed)} por mês.` };
    }
    return null;
  },

  /** resumo de "Mais opções" da tela de lançamento: "Conta principal · já paga · à vista" */
  moreSummary({ payName, card, paid, income, reps }) {
    const status = card ? 'no cartão' : paid ? (income ? 'já recebida' : 'já paga') : (income ? 'a receber' : 'a pagar');
    return [payName, status, reps > 1 ? `${reps}x` : 'à vista'].filter(x => String(x ?? '').trim()).join(' · ');
  },

  /** move o item [from] para a posição [to] (mesma lista, sem perder nenhum); fora dos limites: a lista igual */
  move(list, from, to) {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const out = [...list];
    const [x] = out.splice(from, 1);
    out.splice(to, 0, x);
    return out;
  },

  /** "Despesas · 8" / "Receitas · 4" */
  catsTab: (kind, n) => `${kind === 'income' ? 'Receitas' : 'Despesas'} · ${n}`,
};
