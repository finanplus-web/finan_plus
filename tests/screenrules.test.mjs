// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regras de apresentação do redesign 1.10/1.11 (js/screenrules.js): a conta do botão "info", as frases dos cartões
// do Início, o aviso de risco com os valores marcados, o valor de cada dia do calendário, os resumos dos cards de
// Meu dinheiro, o alerta de meta, o resumo de "Mais opções" e a ordem das categorias.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tx, newState, ymOf } from '../js/core.js';
import { Totals } from '../js/totals.js';
import { HomeAdvice } from '../js/homeadvice.js';
import { ScreenRules } from '../js/screenrules.js';

const today = '2026-11-02';
const T = (id, kind, value, date, { paid = false, desc = id, cat = 'Outros', card = '', goalId = '' } = {}) =>
  tx({ id, kind, value, date, desc, category: cat, paid, accountId: 'main', cardId: card, goalId });
const base = (txs = [], over = {}) => newState({ accounts: [{ id: 'main', name: 'Conta principal', initial: 16688 }], txs, ...over });

test('info do previsto: a conta fecha com os números do glossário (com e sem aportes para metas)', () => {
  const s = base([T('adi', 'income', 121362, '2026-11-13', { desc: 'Adiantamento' }), T('luz', 'expense', 20000, '2026-11-25')]);
  const t = Totals.month(s, ymOf(today), today);
  assert.equal(ScreenRules.forecastMath(t), 'Hoje R$ 166,88 + R$ 1.213,62 a receber − R$ 200,00 a pagar = R$ 1.180,50');
  const g = { ...s, goals: [{ id: 'g', name: 'Notebook', target: 300000, saved: 0, deadline: null, monthly: 10000 }] };
  const t2 = Totals.month(g, ymOf(today), today);
  assert.equal(ScreenRules.forecastMath(t2), 'Hoje R$ 166,88 + R$ 1.213,62 a receber − R$ 200,00 a pagar − R$ 100,00 para metas = R$ 1.080,50');
  assert.equal(ScreenRules.forecastMath({ ...t2, closing: 1 }), null); // não fecha: não mostra
});

test('início: frases de "Falta receber" e "Falta pagar"', () => {
  const s = base([T('adi', 'income', 121362, '2026-11-14'), T('c1', 'expense', 30000, '2026-11-14'), T('c2', 'expense', 12140, '2026-11-14')]);
  assert.equal(ScreenRules.receiveNote(s, today), 'Próximo: R$ 1.213,62 em 14/11');
  assert.equal(ScreenRules.receiveNote(s, today, true), 'Próximo: R$ •••• em 14/11');
  assert.equal(ScreenRules.payNote(s, today), '2 contas até 30/11');
  const one = base([T('c1', 'expense', 30000, '2026-11-14')]);
  assert.equal(ScreenRules.payNote(one, today), '1 conta até 30/11');
  const done = base([T('s', 'income', 5000, '2026-11-01', { paid: true })]);
  assert.equal(ScreenRules.receiveNote(done, today), 'Tudo recebido este mês');
  assert.equal(ScreenRules.receiveNote(base(), today), 'Nada a receber este mês');
  assert.equal(ScreenRules.payNote(base(), today), 'Tudo pago neste mês');
});

test('início: aviso de risco com os valores marcados (e ocultos)', () => {
  const s = base([T('emp', 'expense', 12140, '2026-11-13'), T('cel', 'expense', 30000, '2026-11-13'), T('adi', 'income', 121362, '2026-11-13', { desc: 'Adiantamento' })]);
  const parts = ScreenRules.riskParts(HomeAdvice.risk(s, today));
  assert.equal(parts.map(p => p.text).join(''), 'No dia 13 vencem R$ 421,40 e o adiantamento de R$ 1.213,62 cai no mesmo dia. Se ele atrasar, seu saldo de R$ 166,88 não cobre: faltariam R$ 254,52.');
  assert.deepEqual(parts.filter(p => p.tone).map(p => p.tone), ['neg', 'pos', 'neg']);
  const hid = ScreenRules.riskParts(HomeAdvice.risk(s, today), true).map(p => p.text).join('');
  assert.doesNotMatch(hid, /\d,\d\d/);
  const none = base([T('emp', 'expense', 42140, '2026-11-13')]);
  assert.equal(ScreenRules.riskParts(HomeAdvice.risk(none, today)).map(p => p.text).join(''), 'No dia 13 vencem R$ 421,40 e seu saldo hoje é R$ 166,88. Faltam R$ 254,52 para cobrir essas contas.');
});

test('próximos vencimentos: rótulos dos grupos', () => {
  assert.equal(ScreenRules.dueGroupLabel({ date: '2026-11-14', nextMonth: false, overdue: false }, today), 'SÁBADO, 14 DE NOVEMBRO');
  assert.equal(ScreenRules.dueGroupLabel({ date: '2026-12-01', nextMonth: true, overdue: false }, today), 'PRÓXIMO MÊS · 1 DE DEZEMBRO');
  assert.equal(ScreenRules.dueGroupLabel({ date: '2026-11-01', nextMonth: false, overdue: true }, today), 'EM ATRASO · DOMINGO, 1 DE NOVEMBRO');
});

test('calendário: todo valor do dia com sinal; dia só com meta em âmbar', () => {
  assert.deepEqual(ScreenRules.calDayValue({ hasFlow: true, flowNet: -48900, goals: 0 }), { text: '−489', tone: 'red' });
  assert.deepEqual(ScreenRules.calDayValue({ hasFlow: true, flowNet: 110000, goals: 0 }), { text: '+1,1 mil', tone: 'green' });
  assert.deepEqual(ScreenRules.calDayValue({ hasFlow: false, flowNet: 0, goals: 10000 }), { text: '−100', tone: 'goal' });
  assert.deepEqual(ScreenRules.calDayValue({ hasFlow: false, flowNet: 0, goals: -4000 }), { text: '+40', tone: 'green' });
  assert.equal(ScreenRules.calDayValue({ hasFlow: false, goals: 0 }), null);
  assert.equal(ScreenRules.calDayValue(undefined), null);
});

test('meu dinheiro: resumos dos cards com plural correto', () => {
  const s = base([], { cards: [{ id: 'a', name: 'A', limit: 100, close: 1, due: 10 }, { id: 'b', name: 'B', limit: 100, close: 1, due: 10 }, { id: 'c', name: 'C', limit: 100, close: 1, due: 10 }] });
  assert.equal(ScreenRules.accountsCardsSummary(s), '1 conta · 3 cartões');
  assert.equal(ScreenRules.accountsCardsSummary(base()), '1 conta');
  assert.equal(ScreenRules.goalsSummary([{ saved: 10000 }]), '1 meta · R$ 100,00 guardados');
  assert.equal(ScreenRules.goalsSummary([{ saved: 10000 }, { saved: 5000 }], true), '2 metas · R$ •••• guardados');
  assert.equal(ScreenRules.goalsSummary([]), null);
  assert.equal(ScreenRules.limitsSummary(base(), today), 'Nenhum limite ainda');
  assert.equal(ScreenRules.debtsSummary(base()), 'Nenhuma dívida em aberto');
  const d = base([T('p1', 'expense', 12140, '2026-11-13', { desc: 'Mercado Pago (1/3)', cat: 'Dívidas' })]);
  assert.equal(ScreenRules.debtsSummary(d), '1 dívida · parcela de R$ 121,40 em 13/11');
});

test('meu dinheiro: alerta de meta que vai passar do prazo e de prazo vencido', () => {
  const late = base([], { goals: [{ id: 'g', name: 'Notebook', target: 1400000, saved: 10000, deadline: '2027-05-30', monthly: 10000 }] });
  const a = ScreenRules.goalAlert(late, today);
  assert.equal(a.title, 'A meta Notebook vai passar do prazo');
  assert.equal(a.text, 'Para chegar em maio de 2027, guarde R$ 1.985,72 por mês.');
  assert.match(ScreenRules.goalAlert(late, today, true).text, /R\$ ••••/);
  const past = base([], { goals: [{ id: 'g', name: 'Viagem', target: 100000, saved: 0, deadline: '2026-10-01', monthly: 0 }] });
  assert.equal(ScreenRules.goalAlert(past, today).title, 'O prazo da meta Viagem já passou');
  const fine = base([], { goals: [{ id: 'g', name: 'Ok', target: 100000, saved: 0, deadline: '2027-12-01', monthly: 50000 }] });
  assert.equal(ScreenRules.goalAlert(fine, today), null);
});

test('lançamento: resumo de "Mais opções"', () => {
  assert.equal(ScreenRules.moreSummary({ payName: 'Conta principal', card: false, paid: true, income: false, reps: 1 }), 'Conta principal · já paga · à vista');
  assert.equal(ScreenRules.moreSummary({ payName: 'Itaú', card: true, paid: true, income: false, reps: 3 }), 'Itaú · no cartão · 3x');
  assert.equal(ScreenRules.moreSummary({ payName: 'Conta', card: false, paid: false, income: true, reps: 1 }), 'Conta · a receber · à vista');
});

test('categorias: mover sem perder nenhuma e rótulos das abas', () => {
  const l = ['A', 'B', 'C', 'D'];
  assert.deepEqual(ScreenRules.move(l, 0, 2), ['B', 'C', 'A', 'D']);
  assert.deepEqual(ScreenRules.move(l, 3, 0), ['D', 'A', 'B', 'C']);
  assert.equal(ScreenRules.move(l, 0, -1), l);
  assert.equal(ScreenRules.move(l, 1, 1), l);
  assert.equal(ScreenRules.catsTab('expense', 8), 'Despesas · 8');
  assert.equal(ScreenRules.catsTab('income', 4), 'Receitas · 4');
});
