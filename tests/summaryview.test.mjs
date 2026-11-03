// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Resumo: selo do mês, percentuais, comparação, Receitas zeradas, categorias e evolução (SummaryView).
// Mesmos casos de SummaryViewTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Finance, tx, newState, GOAL_CAT, isCard, ymStr } from '../js/core.js';
import { SummaryView } from '../js/summaryview.js';

const today = '2026-11-02';
const T = (id, kind, value, date, { paid = true, cat = 'Outros', card = '', goal = '' } = {}) =>
  tx({ id, kind, value, date, desc: id, category: goal ? GOAL_CAT : cat, paid: paid || !!card || !!goal, accountId: 'main', cardId: card, goalId: goal });

test('resumo: percentuais somam 100', () => {
  assert.deepEqual(SummaryView.percents([12600, 10000]), [56, 44]);
  assert.deepEqual(SummaryView.percents([100, 100, 100]), [34, 33, 33]);
  assert.deepEqual(SummaryView.percents([777]), [100]);
  assert.deepEqual(SummaryView.percents([0, 0]), [0, 0]);
  for (const v of [[1, 1, 1, 1, 1, 1, 1], [5, 3, 2], [999, 1], [1, 2, 3, 4, 5, 6, 7]])
    assert.equal(SummaryView.percents(v).reduce((a, b) => a + b, 0), 100);
});

test('resumo: comparação só com dados no mês anterior', () => {
  const prev = { income: 100000, expense: 40000 };
  assert.deepEqual(SummaryView.delta(120000, prev, prev.income), { amount: 20000, up: true });
  assert.deepEqual(SummaryView.delta(30000, prev, prev.expense), { amount: -10000, up: false });
  assert.equal(SummaryView.delta(30000, { income: 0, expense: 0 }, 0), null);
  assert.equal(SummaryView.delta(30000, null, 0), null);
  assert.equal(SummaryView.delta(5, prev, 5).up, true);
});

test('resumo: selo do mês', () => {
  assert.deepEqual(SummaryView.status('2026-11-01', '2026-11-30', today), { phase: 'IN_PROGRESS', day: 2, length: 30 });
  assert.equal(SummaryView.status('2026-10-01', '2026-10-31', today).phase, 'CLOSED');
  assert.equal(SummaryView.status('2026-12-01', '2026-12-31', today).phase, 'FUTURE');
  assert.equal(SummaryView.status('2026-11-01', '2026-11-15', today), null);
});

test('resumo: receitas zeradas mostram a próxima entrada ou nada pendente', () => {
  const semRecebido = [T('c', 'expense', 12600, '2026-11-01', { card: 'itau' }), T('adi', 'income', 121362, '2026-11-13', { paid: false }), T('sal', 'income', 250000, '2026-11-05', { paid: false })];
  assert.equal(Finance.flow(semRecebido).income, 0);
  const next = SummaryView.nextIncome(semRecebido);
  assert.equal(next.date, '2026-11-05');
  assert.equal(next.amount, 250000);
  assert.equal(SummaryView.nextIncome(semRecebido.filter(t => t.kind === 'expense')), null);
});

test('resumo: compras no cartão com a data da fatura', () => {
  const s = newState({ cards: [{ id: 'itau', name: 'Itaú', limit: 200000, close: 24, due: 1 }],
    txs: [T('a', 'expense', 12600, '2026-11-01', { card: 'itau' }), T('b', 'expense', 5000, '2026-11-02', { card: 'itau' }), T('x', 'expense', 999, '2026-11-02')] });
  const c = SummaryView.cardSpend(s, s.txs, today);
  assert.equal(c.amount, 17600);
  assert.equal(c.invoiceDue, '2026-12-01');
  assert.equal(SummaryView.cardSpend(s, s.txs.filter(t => !isCard(t)), today), null);
});

test('resumo: sem categoria e cartão como subtítulo', () => {
  const s = newState({ cards: [{ id: 'itau', name: 'Itaú', limit: 200000, close: 24, due: 1 }], txs: [
    T('a', 'expense', 10000, '2026-11-01', { cat: 'Mercado', card: 'itau' }),
    T('b', 'expense', 5000, '2026-11-01', { cat: '' }),
    T('c', 'expense', 2000, '2026-11-01', { cat: '   ' }),
    T('meta', 'expense', 9999, '2026-11-01', { goal: 'g1' }),
    T('pend', 'expense', 7777, '2026-11-09', { paid: false, cat: 'Luz' }),
  ] });
  const c = SummaryView.categories(s, s.txs);
  assert.deepEqual(c.all.map(r => r.name), ['Mercado', SummaryView.NO_CATEGORY]);
  assert.equal(c.all[1].value, 7000);
  assert.deepEqual(c.all[0].cards, ['Itaú']);
  assert.equal(c.total, 17000);
  assert.equal(c.others, null);
});

test('resumo: categoria antiga de cartão aparece em Outros', () => {
  const s = newState({ txs: [T('a', 'expense', 1000, '2026-11-01', { cat: 'Cartão de Crédito' }), T('b', 'expense', 500, '2026-11-01', { cat: 'Outros' }), T('c', 'expense', 300, '2026-11-01', { cat: 'Limite Especial' })] });
  const c = SummaryView.categories(s, s.txs);
  assert.deepEqual(c.all.map(r => [r.name, r.value]), [['Outros', 1800]]);
});

test('resumo: cinco categorias mais Outras', () => {
  const cats = [['A', 700], ['B', 600], ['C', 500], ['D', 400], ['E', 300], ['F', 200], ['G', 100]];
  const s = newState({ txs: cats.map(([n, v], i) => T(`t${i}`, 'expense', v, '2026-11-01', { cat: n })) });
  const c = SummaryView.categories(s, s.txs);
  assert.deepEqual(c.top.map(r => r.name), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(c.others.name, SummaryView.OTHERS);
  assert.equal(c.others.value, 300);
  assert.equal(c.othersCount, 2);
  assert.equal(c.all.length, 7);
  assert.equal(c.all.reduce((n, r) => n + r.percent, 0), 100);
  assert.equal(SummaryView.categories(s, s.txs.slice(0, 5)).others, null);
});

test('resumo: evolução só com meses com lançamentos', () => {
  const s = newState({ txs: [
    T('s', 'income', 300000, '2026-09-05'), T('g', 'expense', 10000, '2026-09-06', { goal: 'g1' }),
    T('o', 'expense', 50000, '2026-07-10'),
    T('n', 'income', 1000, '2026-11-01'),
    T('pend', 'expense', 9000, '2026-10-20', { paid: false }),
  ] });
  const e = SummaryView.evolution(s, today);
  assert.deepEqual(e.map(m => ymStr(m.ym)), ['2026-07', '2026-09', '2026-11']);
  assert.deepEqual(e.map(m => m.current), [false, false, true]);
  assert.equal(e[1].goals, 10000);
});

test('resumo: valor curto sobre as barras', () => {
  assert.equal(SummaryView.short(95000), '950');
  assert.equal(SummaryView.short(120000), '1,2 mil');
  assert.equal(SummaryView.short(99960), '1 mil'); // a faixa é decidida depois de arredondar
  assert.equal(SummaryView.short(99999996), '1 mi');
});
