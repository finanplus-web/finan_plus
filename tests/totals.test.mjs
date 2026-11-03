// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Glossário único (Totals, Android 1.11): os mesmos números em todas as telas, sem descontar a meta duas vezes.
// Mesmos casos de TotalsTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Finance, tx, newState, GOAL_CAT, CARD_PAYMENT_CAT } from '../js/core.js';
import { Totals } from '../js/totals.js';

const today = '2026-11-02';
const ym = (y, m) => y * 12 + m - 1;
const T = (id, kind, value, date, desc, category, paid, extra = {}) => tx({ id, kind, value, date, desc, category, paid, accountId: 'main', ...extra });

/** Saldo R$ 166,88 depois de guardar R$ 100,00 no Notebook, a receber R$ 3.413,62, a pagar R$ 121,40 + fatura de R$ 488,51. */
const state = (monthly = 0) => newState({
  accounts: [{ id: 'main', name: 'Conta principal', initial: 26688 }],
  cards: [{ id: 'sofisa', name: 'Sofisa', limit: 50000, close: 5, due: 15 }],
  goals: [{ id: 'g1', name: 'Notebook', target: 800000, saved: 10000, deadline: '2028-12-31', monthly }],
  txs: [
    T('meta', 'expense', 10000, today, 'Meta › Notebook', GOAL_CAT, true, { goalId: 'g1' }),
    T('compra', 'expense', 48851, '2026-10-20', 'Compras', 'Outros', true, { cardId: 'sofisa' }),
    T('mp', 'expense', 12140, '2026-11-13', 'Mercado Pago', 'Dívidas', false),
    T('adi', 'income', 121362, '2026-11-13', 'Adiantamento', 'Salário', false),
    T('sal', 'income', 80000, '2026-11-30', 'Salário', 'Salário', false),
    T('13', 'income', 140000, '2026-11-30', '13º salário', '13º salário', false),
  ],
});

test('totais: previsto não desconta a meta duas vezes', () => {
  const m = Totals.month(state(), ym(2026, 11), today);
  assert.equal(m.whenIs, 'CURRENT');
  assert.equal(m.opening, 16688);
  assert.equal(m.toReceive, 341362);
  assert.equal(m.toPay, 60991);
  assert.equal(m.goalsPlanned, 0);
  assert.equal(m.goalsSaved, 10000);
  assert.equal(m.closing, 297059);
  assert.equal(m.closing, Totals.forecastAt(state(), '2026-11-30', today));
});

test('totais: aporte mensal planejado desconta só o que falta', () => {
  const s = state(30385);
  const m = Totals.month(s, ym(2026, 11), today);
  assert.equal(m.goalsPlanned, 20385);
  assert.equal(m.closing, 297059 - 20385);
  assert.equal(m.closing, Totals.forecastAt(s, '2026-11-30', today));
  assert.equal(Totals.goalsPlanned(s, ym(2026, 12), today), 30385);
  assert.equal(Totals.goalsPlanned(s, ym(2026, 10), today), 0);
});

test('totais: aporte limitado ao que falta para a meta', () => {
  const s0 = state(50000), s = { ...s0, goals: [{ ...s0.goals[0], target: 40000 }] }; // faltam R$ 300,00
  assert.equal(Totals.goalsPlanned(s, ym(2026, 11), today), 30000);
  assert.equal(Totals.goalsPlanned(s, ym(2026, 12), today), 0);
});

test('totais: realizado sem compra no cartão e com pagamento de fatura', () => {
  const s0 = state();
  const s = { ...s0, txs: [...s0.txs,
    T('pg', 'expense', 20000, '2026-11-01', 'Pagamento fatura Sofisa', CARD_PAYMENT_CAT, true, { cardPayment: 'sofisa' }),
    T('cine', 'expense', 5000, '2026-11-01', 'Cinema', 'Lazer', true),
    T('pix', 'income', 3000, '2026-11-01', 'Pix', 'Extra', true),
    T('nov-cartao', 'expense', 7000, '2026-11-01', 'Livro', 'Educação', true, { cardId: 'sofisa' }),
  ] };
  const m = Totals.month(s, ym(2026, 11), today);
  assert.equal(m.realizedIn, 3000);
  assert.equal(m.realizedOut, 25000);
  assert.equal(m.goalsSaved, 10000);
  assert.equal(m.result, 3000 - 25000 - 10000);
  assert.equal(m.resultForecast, m.result + m.toReceive - m.toPay - m.goalsPlanned);
});

test('totais: pendente atrasado entra no mês atual', () => {
  const s0 = state();
  const s = { ...s0, txs: [...s0.txs, T('luz', 'expense', 9000, '2026-10-25', 'Luz', 'Moradia', false)] };
  const m = Totals.month(s, ym(2026, 11), today);
  assert.equal(m.toPay, 60991 + 9000);
  assert.equal(m.closing, Totals.forecastAt(s, '2026-11-30', today));
  assert.equal(Totals.month(s, ym(2026, 10), today).toPay, 9000);
});

test('totais: mês futuro continua do previsto anterior', () => {
  const s = { ...state(30385), recurring: [{ id: 'r1', kind: 'expense', desc: 'Aluguel', value: 90000, category: 'Moradia', accountId: 'main', cardId: '', day: 5, active: true, start: null, last: null }] };
  const nov = Totals.month(s, ym(2026, 11), today), dez = Totals.month(s, ym(2026, 12), today);
  assert.equal(dez.whenIs, 'FUTURE');
  assert.equal(dez.opening, nov.closing);
  assert.equal(dez.toPay, 90000);
  assert.equal(dez.goalsPlanned, 30385);
  assert.equal(dez.closing, Totals.forecastAt(s, '2026-12-31', today));
});

test('totais: mês passado fecha no saldo do fim do mês', () => {
  const s = state();
  const out = Totals.month(s, ym(2026, 10), today);
  assert.equal(out.whenIs, 'PAST');
  assert.equal(out.closing, Finance.balanceAt(s, '2026-10-31'));
  assert.equal(out.opening, Finance.balanceAt(s, '2026-09-30'));
});
