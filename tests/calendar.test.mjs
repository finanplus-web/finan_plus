// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do calendário e do período da Lista: os mesmos casos do app Android (CalendarTest.kt, PeriodTest.kt).
// Rode com: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { tx, newState, Money } from '../js/core.js';
import { MonthCalendar, Period } from '../js/calendar.js';

const ym = (y, m) => y * 12 + m - 1;
const mk = (id, kind, value, date, o = {}) => tx({ id, kind, value, date, desc: id, category: 'Outros', paid: o.paid ?? true, accountId: 'main', cardId: o.card ?? '', cardPayment: o.pay ?? '' });
const OCT = ym(2026, 10), TODAY = '2026-10-08';

test('calendário: grade começa no domingo e tem semanas completas', () => {
  const cells = MonthCalendar.cells(OCT); // 01/10/2026 é quinta
  assert.equal(cells.length, 35);
  assert.deepEqual(cells.slice(0, 4), [null, null, null, null]);
  assert.equal(cells[4], '2026-10-01');
  assert.equal(cells[34], '2026-10-31');
  const feb = MonthCalendar.cells(ym(2026, 2));
  assert.equal(feb.length, 28); assert.equal(feb[0], '2026-02-01');
  assert.equal(MonthCalendar.cells(ym(2026, 8)).length, 42);
});

test('calendário: saldo do dia conta as contas, não as compras no cartão', () => {
  const s = newState({
    txs: [mk('sal', 'income', 520000, '2026-10-05'), mk('merc', 'expense', 18240, '2026-10-05'), mk('compra', 'expense', 9990, '2026-10-05', { card: 'c1' }), mk('outro', 'expense', 1000, '2026-11-05')],
    cards: [{ id: 'c1', name: 'Roxo', limit: 500000, close: 20, due: 28 }],
  });
  const days = MonthCalendar.build(s, OCT, TODAY), d = days.get('2026-10-05');
  assert.equal(d.income, 520000); assert.equal(d.expense, 18240); assert.equal(d.net, 520000 - 18240);
  assert.deepEqual(d.marks, ['income', 'expense', 'card']);
  assert.equal(d.txs.length, 3); assert.equal(d.txs[0].id, 'sal');
  assert.equal(days.get('2026-11-05'), undefined);
});

test('calendário: fatura em aberto no dia do vencimento', () => {
  const s = newState({
    txs: [mk('c-a', 'expense', 40000, '2026-09-20', { card: 'c1' }), mk('c-b', 'expense', 20000, '2026-09-25', { card: 'c1' }), mk('pg', 'expense', 10000, '2026-10-01', { pay: 'c1' })],
    cards: [{ id: 'c1', name: 'Roxo', limit: 500000, close: 5, due: 15 }],
  });
  const days = MonthCalendar.build(s, OCT, TODAY), due = days.get('2026-10-15');
  assert.equal(due.invoices.length, 1); assert.equal(due.invoices[0].amount, 50000); assert.equal(due.expense, 50000);
  assert.equal(due.overdue, false); assert.deepEqual(due.marks, ['card']);
  assert.equal(days.get('2026-10-01').expense, 10000);
  assert.equal(MonthCalendar.build(s, OCT, '2026-10-20').get('2026-10-15').overdue, true);
});

test('calendário: atraso só para pendente com data passada; totais = soma dos dias', () => {
  const s = newState({ txs: [mk('net', 'expense', 11990, '2026-10-06', { paid: false }), mk('alug', 'expense', 150000, '2026-10-10', { paid: false }), mk('farm', 'expense', 4690, '2026-10-07')] });
  const days = MonthCalendar.build(s, OCT, TODAY);
  assert.equal(days.get('2026-10-06').overdue, true); assert.equal(days.get('2026-10-10').overdue, false); assert.equal(days.get('2026-10-07').overdue, false);
  const s2 = newState({ txs: [mk('a', 'income', 520000, '2026-10-05'), mk('b', 'income', 90000, '2026-10-30', { paid: false }), mk('c', 'expense', 150000, '2026-10-10', { paid: false }), mk('d', 'expense', 34171, '2026-10-30', { paid: false })] });
  const d2 = MonthCalendar.build(s2, OCT, TODAY), t = MonthCalendar.totals(d2);
  assert.equal(t.income, 610000); assert.equal(t.expense, 184171);
  assert.equal(t.net, [...d2.values()].reduce((n, d) => n + d.net, 0));
  assert.equal(d2.get('2026-10-30').net, 55829);
});

test('calendário: valores abreviados cabem no dia', () => {
  const cases = [[0, '0'], [18240, '182'], [11990, '120'], [99949, '999'], [99999, '1 mil'], [100000, '1 mil'], [150000, '1,5 mil'], [520000, '5,2 mil'],
    [159999, '1,6 mil'], [1500000, '15 mil'], [1549900, '15 mil'], [99849999, '999 mil'], [99949999, '1 mi'], [99999999, '1 mi'], [100000000, '1 mi'],
    [120000000, '1,2 mi'], [2000000000000, '20 bi'], [999999999999999, '10000 bi']];
  for (const [c, s] of cases) assert.equal(MonthCalendar.compact(c), s, String(c));
  assert.equal(MonthCalendar.signed(520000), '+5,2 mil'); assert.equal(MonthCalendar.signed(-11990), '−120'); assert.equal(MonthCalendar.signed(0), '0');
});

test('calendário: títulos e leitor de tela', () => {
  assert.equal(MonthCalendar.monthTitle(OCT), 'Outubro de 2026');
  assert.equal(MonthCalendar.monthTitle(ym(2027, 3)), 'Março de 2027');
  assert.equal(MonthCalendar.dayTitle('2026-10-15', TODAY), 'Quinta, 15 de outubro');
  assert.equal(MonthCalendar.dayTitle('2027-01-02', TODAY), 'Sábado, 2 de janeiro de 2027');
  assert.equal(MonthCalendar.dayTitle('2026-10-05', TODAY), 'Segunda, 5 de outubro');
  const s = newState({ txs: [mk('net', 'expense', 11990, '2026-10-06', { paid: false })] });
  const day = MonthCalendar.build(s, OCT, TODAY).get('2026-10-06');
  assert.equal(MonthCalendar.describe('2026-10-06', day, TODAY, false), '6 de outubro, terça-feira, 1 lançamento, saldo do dia menos R$ 119,90, em atraso');
  assert.equal(MonthCalendar.describe('2026-10-06', day, TODAY, true), '6 de outubro, terça-feira, 1 lançamento, em atraso');
  assert.equal(MonthCalendar.describe(TODAY, undefined, TODAY, false), '8 de outubro, quinta-feira, hoje, sem lançamentos');
});

test('período: títulos', () => {
  assert.equal(Period.label('2026-10-01', '2026-10-31'), 'Outubro de 2026');
  assert.equal(Period.label('2028-02-01', '2028-02-29'), 'Fevereiro de 2028');
  assert.equal(Period.label('2026-10-01', '2026-10-15'), '01/10/2026 a 15/10/2026');
  assert.equal(Period.label(null, null), 'Todo o período');
  assert.equal(Period.label('2026-10-01', null), 'Desde 01/10/2026');
  assert.equal(Period.label(null, '2026-10-15'), 'Até 15/10/2026');
  assert.equal(Period.label(TODAY, TODAY), '08/10/2026');
  assert.equal(Period.fullMonth('2026-10-02', '2026-10-31'), null);
});

test('período: setas andam meses inteiros', () => {
  assert.deepEqual(Period.shift('2026-10-01', '2026-10-31', 1, TODAY), ['2026-11-01', '2026-11-30']);
  assert.deepEqual(Period.shift('2026-10-01', '2026-10-31', -1, TODAY), ['2026-09-01', '2026-09-30']);
  assert.deepEqual(Period.shift('2026-09-10', '2026-10-09', 1, TODAY), ['2026-10-01', '2026-10-31']);
  assert.deepEqual(Period.shift(null, null, -1, TODAY), ['2026-09-01', '2026-09-30']);
  assert.deepEqual(Period.shift('2026-12-01', '2026-12-31', 1, TODAY), ['2027-01-01', '2027-01-31']);
});

test('período: pendências do mês incluem faturas, não compras no cartão; saldo do dia = calendário', () => {
  const s = newState({
    txs: [mk('sal', 'income', 121362, '2026-10-15', { paid: false }), mk('alug', 'expense', 70000, '2026-10-15', { paid: false }), mk('pago', 'expense', 5000, '2026-10-02'),
      mk('nov', 'expense', 9999, '2026-11-02', { paid: false }), mk('compra', 'expense', 20000, '2026-09-25', { card: 'c1' })],
    cards: [{ id: 'c1', name: 'Roxo', limit: 500000, close: 5, due: 15 }],
  });
  assert.deepEqual(Period.monthPending(s, OCT, TODAY), { toReceive: 121362, toPay: 90000 });
  assert.deepEqual(Period.pending(s.txs.filter(t => t.date.startsWith('2026-10'))), { toReceive: 121362, toPay: 70000 });
  const txs = [mk('a', 'income', 121362, '2026-10-15', { paid: false }), mk('b', 'expense', 113240, '2026-10-15', { paid: false }), mk('c', 'expense', 9990, '2026-10-15', { card: 'c1' }), mk('d', 'expense', 1000, '2026-10-15', { pay: 'c1' })];
  assert.equal(Period.cashNet(txs), 121362 - 113240 - 1000);
  const s2 = newState({ txs, cards: [{ id: 'c1', name: 'Roxo', limit: 500000, close: 20, due: 28 }] });
  assert.equal(MonthCalendar.build(s2, OCT, TODAY).get('2026-10-15').net, Period.cashNet(txs));
  assert.ok(Money.format(1) === 'R$ 0,01');
});
