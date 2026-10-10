// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do simulador "E se…?" e da comparação dos Relatórios: os mesmos casos do app Android (SimulatorTest.kt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tx, newState } from '../js/core.js';
import { Simulator, PeriodCompare } from '../js/simulator.js';

const ym = (y, m) => y * 12 + m - 1;
const TODAY = '2026-10-09';
const t = (id, kind, value, date, o = {}) => tx({ id, kind, value, date, desc: o.desc ?? id, category: 'Outros', paid: o.paid ?? true, accountId: 'main', cardId: o.card ?? '', groupId: o.group ?? '', parcelN: o.n ?? 0, parcelTotal: o.total ?? 0 });

test('simulador: base é a média dos últimos meses com dados', () => {
  const s = newState({ txs: [
    t('a', 'income', 500000, '2026-09-05'), t('b', 'expense', 300000, '2026-09-10'),
    t('c', 'income', 400000, '2026-08-05'), t('d', 'expense', 200000, '2026-08-10'),
    t('e', 'expense', 99999, '2026-10-02'),                 // mês atual: fica de fora
    t('f', 'expense', 50000, '2026-09-20', { paid: false }), // pendente: fica de fora
  ] });
  assert.deepEqual(Simulator.base(s, TODAY), { income: 450000, expense: 250000, left: 200000, months: 2 });
  assert.deepEqual(Simulator.base(newState(), TODAY), { income: 0, expense: 0, left: 0, months: 0 });
});

test('simulador: economizar e comprar', () => {
  const base = Simulator.mkBase(211362, 113240, 3);
  const sv = Simulator.save(base, 20000, 12);
  assert.equal(sv.total, 240000); assert.equal(sv.newLeft, 78122); assert.equal(sv.overLeft, false);
  assert.equal(Simulator.save(base, 100000, 12).overLeft, true);
  const b = Simulator.buy(450000, 0, 30000, TODAY);
  assert.equal(b.months, 15); assert.equal(b.doneYm, ym(2028, 1));
  assert.equal(Simulator.monthYear(b.doneYm), 'janeiro de 2028');
  assert.equal(Simulator.buy(450000, 0, 50000, TODAY).months, 9);
  assert.equal(Simulator.buy(450000, 0, 20000, TODAY).months, 23);
  assert.equal(Simulator.buy(450000, 500000, 0, TODAY).months, 0);
  assert.equal(Simulator.buy(450000, 0, 0, TODAY), null);
});

test('simulador: mudança na renda', () => {
  const r = Simulator.income(Simulator.mkBase(500000, 400000, 3), -15, 60000);
  assert.deepEqual(r, { newIncome: 425000, diff: -75000, newLeft: 25000, yearDiff: -900000, goalsMonthly: 60000 });
  const s = newState({ goals: [{ id: 'g1', name: 'Viagem', target: 800000, saved: 310000, deadline: null, monthly: 60000 }, { id: 'g2', name: 'Pronta', target: 1000, saved: 1000, deadline: null, monthly: 5000 }] });
  assert.equal(Simulator.goalsMonthly(s), 60000);
});

test('simulador: dívidas e quitação', () => {
  const s = newState({ txs: [
    t('p1', 'expense', 12140, '2026-09-15', { group: 'g', n: 1, total: 6, desc: 'Mercado Pago 1/6' }),
    t('p2', 'expense', 12140, '2026-10-15', { paid: false, group: 'g', n: 2, total: 6, desc: 'Mercado Pago 2/6' }),
    t('p3', 'expense', 12140, '2026-11-15', { paid: false, group: 'g', n: 3, total: 6, desc: 'Mercado Pago 3/6' }),
    t('c1', 'expense', 60000, '2026-09-02', { card: 'nu', group: 'h', n: 1, total: 3, desc: 'Notebook (1/3)' }),
    t('c2', 'expense', 60000, '2026-10-02', { card: 'nu', group: 'h', n: 2, total: 3, desc: 'Notebook (2/3)' }),
    t('c3', 'expense', 60000, '2026-11-02', { card: 'nu', group: 'h', n: 3, total: 3, desc: 'Notebook (3/3)' }),
    t('q1', 'expense', 1000, '2026-09-01', { group: 'z', n: 1, total: 2 }), t('q2', 'expense', 1000, '2026-09-30', { group: 'z', n: 2, total: 2 }),
  ] });
  const l = Simulator.debts(s, TODAY);
  assert.deepEqual(l.map(d => d.name), ['Notebook', 'Mercado Pago']);
  assert.deepEqual(l[0], { groupId: 'h', name: 'Notebook', parcel: 60000, remaining: 1, total: 3, left: 60000, card: true });
  assert.deepEqual(l[1], { groupId: 'g', name: 'Mercado Pago', parcel: 12140, remaining: 2, total: 6, left: 24280, card: false });
  assert.deepEqual(Simulator.payoff(l[1], 22000, 100000), { payNow: 22000, saved: 2280, freedPerMonth: 12140, months: 2, balanceAfter: 78000 });
});

test('relatórios: comparação justa entre períodos', () => {
  const c = PeriodCompare.of('2026-10-01', '2026-10-31', TODAY);
  assert.deepEqual(c, { from: '2026-09-01', to: '2026-09-09', label: 'vs. set (mesmos dias)' });
  assert.deepEqual(PeriodCompare.of('2026-09-01', '2026-09-30', TODAY), { from: '2026-08-01', to: '2026-08-31', label: 'vs. agosto' });
  assert.equal(PeriodCompare.of('2026-03-01', '2026-03-31', '2026-03-31').to, '2026-02-28');
  assert.deepEqual(PeriodCompare.of('2026-10-01', '2026-10-10', TODAY), { from: '2026-09-21', to: '2026-09-30', label: 'vs. período anterior' });
  assert.equal(PeriodCompare.of(null, null, TODAY), null); assert.equal(PeriodCompare.of('2026-10-01', null, TODAY), null);
  assert.equal(PeriodCompare.text(520000, 585000, c), '−11% vs. set (mesmos dias)');
  assert.equal(PeriodCompare.text(120, 100, c), '+20% vs. set (mesmos dias)');
  assert.equal(PeriodCompare.text(100, 100, c), '0% vs. set (mesmos dias)');
  assert.equal(PeriodCompare.text(100, 0, c), 'Sem base para comparar');
});
