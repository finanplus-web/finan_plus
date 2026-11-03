// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Aviso principal do Assistente no Início (HomeAdvice.risk) e os textos de apoio dos cartões.
// Mesmos casos de HomeAdviceTest.kt do app Android (1.11: as atrasadas entram no mês atual).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tx, newState, ymOf } from '../js/core.js';
import { Period } from '../js/calendar.js';
import { HomeAdvice } from '../js/homeadvice.js';
import { Totals } from '../js/totals.js';

const today = '2026-11-02';
const T = (id, kind, value, date, { paid = false, desc = id, cat = 'Outros', card = '' } = {}) =>
  tx({ id, kind, value, date, desc, category: cat, paid, accountId: 'main', cardId: card });
/** saldo 166,88; em 13/11 vencem 121,40 + 300,00 e cai o adiantamento de 1.213,62 */
const novembro = (...extra) => newState({
  accounts: [{ id: 'main', name: 'Conta principal', initial: 16688 }],
  txs: [
    T('emp', 'expense', 12140, '2026-11-13', { desc: 'Empréstimo', cat: 'Empréstimo' }),
    T('cel', 'expense', 30000, '2026-11-13', { desc: 'Celular' }),
    T('adi', 'income', 121362, '2026-11-13', { desc: 'Adiantamento', cat: 'Salário' }),
    T('luz', 'expense', 20000, '2026-11-25', { desc: 'Luz' }),
    ...extra,
  ],
});
const moveAdi = (s, date) => ({ ...s, txs: s.txs.map(t => t.id === 'adi' ? { ...t, date } : t) });

test('início: risco com recebimento no mesmo dia', () => {
  const r = HomeAdvice.risk(novembro(), today);
  assert.ok(r);
  assert.equal(r.day, '2026-11-13');
  assert.equal(r.bills, 42140);
  assert.equal(r.balance, 16688);
  assert.equal(r.missing, 25452);
  assert.equal(r.income.title, 'Adiantamento');
  assert.equal(r.income.amount, 121362);
  assert.equal(r.sameDay, true);
});

test('início: risco com recebimento antes', () => {
  const r = HomeAdvice.risk(moveAdi(novembro(), '2026-11-10'), today);
  assert.equal(r.sameDay, false);
  assert.equal(r.income.date, '2026-11-10');
});

test('início: risco sem recebimento até lá', () => {
  const r = HomeAdvice.risk(moveAdi(novembro(), '2026-11-20'), today);
  assert.equal(r.income, null);
  assert.equal(r.missing, 25452);
});

test('início: conta atrasada conta como de hoje', () => {
  const r = HomeAdvice.risk(novembro(T('agua', 'expense', 50000, '2026-11-01')), today);
  assert.equal(r.day, today);
  assert.equal(r.bills, 50000);
  assert.equal(r.income, null);
  const rich = { ...novembro(T('agua', 'expense', 1000, '2026-11-01')), accounts: [{ id: 'main', name: 'C', initial: 100000 }] };
  assert.equal(HomeAdvice.risk(rich, today), null);
});

test('início: atrasada de outro mês entra nas contas do mês atual (1.11)', () => {
  const s = novembro(T('out', 'expense', 9000, '2026-10-25'), T('rec', 'income', 7000, '2026-10-28'));
  const bills = HomeAdvice.monthBills(s, ymOf(today), today);
  assert.ok(bills.some(b => b.refId === 'out'));
  assert.equal(bills.reduce((n, b) => n + b.amount, 0), Totals.month(s, ymOf(today), today).toPay);
  assert.equal(HomeAdvice.monthIncome(s, ymOf(today), today).reduce((n, b) => n + b.amount, 0), Totals.month(s, ymOf(today), today).toReceive);
  assert.equal(HomeAdvice.nextIncome(s, today).refId, 'rec');
  // sem [today], só o próprio mês
  assert.ok(!HomeAdvice.monthIncome(s, ymOf(today)).some(b => b.refId === 'rec'));
});

test('início: sem risco', () => {
  const s = { ...novembro(), accounts: [{ id: 'main', name: 'Conta principal', initial: 50000 }] };
  assert.equal(HomeAdvice.risk(s, today), null);
});

test('início: mês sem contas pendentes', () => {
  const s = newState({
    accounts: [{ id: 'main', name: 'Conta principal', initial: 0 }],
    txs: [T('pago', 'expense', 10000, '2026-11-01', { paid: true }), T('dez', 'expense', 90000, '2026-12-05'), T('cartao', 'expense', 9000, '2026-11-05', { card: 'itau' })],
  });
  assert.deepEqual(HomeAdvice.monthBills(s, ymOf(today), today), []);
  assert.equal(HomeAdvice.risk(s, today), null);
});

test('início: próximo recebimento e contas do mês', () => {
  const s = novembro();
  assert.equal(HomeAdvice.nextIncome(s, today).title, 'Adiantamento');
  assert.equal(HomeAdvice.monthBills(s, ymOf(today), today).length, 3);
  const recebido = { ...s, txs: s.txs.map(t => t.kind === 'income' ? { ...t, paid: true } : t) };
  assert.equal(HomeAdvice.nextIncome(recebido, today), null);
});

test('início: contas do mês batem com o falta pagar', () => {
  const s = novembro();
  const p = Period.monthPending(s, ymOf(today), today);
  assert.equal(HomeAdvice.monthBills(s, ymOf(today), today).reduce((n, b) => n + b.amount, 0), p.toPay);
  assert.equal(HomeAdvice.monthIncome(s, ymOf(today)).reduce((n, b) => n + b.amount, 0), p.toReceive);
});

test('início: próximos vencimentos agrupados e mês seguinte', () => {
  const s = novembro(T('dez', 'expense', 5000, '2026-12-01', { desc: 'Fatura extra' }));
  const g = HomeAdvice.upcoming(s, today, 4);
  assert.deepEqual(g.map(x => x.date), ['2026-11-13', '2026-11-25', '2026-12-01']);
  assert.equal(g[0].items.length, 2);
  assert.deepEqual(g.map(x => x.nextMonth), [false, false, true]);
});

test('início: linhas que repetem os cartões', () => {
  assert.equal(HomeAdvice.repeatsCards('Ainda faltam R$ 10,00 a pagar até o fim do mês.'), true);
  assert.equal(HomeAdvice.repeatsCards('A receber neste mês: R$ 5,00.'), true);
  assert.equal(HomeAdvice.repeatsCards('Você gastou 20% a mais que em outubro.'), false);
});
