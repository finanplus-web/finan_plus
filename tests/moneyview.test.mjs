// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Meu dinheiro: saldo igual ao do Início, faturas, uso do limite, faixas, ordem, textos e plural (MoneyView).
// Mesmos casos de MoneyViewTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Finance, tx, newState, GOAL_CAT, CARD_PAYMENT_CAT } from '../js/core.js';
import { MoneyView } from '../js/moneyview.js';

const today = '2026-11-03';
const T = (id, kind, value, date, desc, category, extra = {}) => tx({ id, kind, value, date, desc, category, paid: true, accountId: 'main', ...extra });
/** Conta com R$ 266,88 antes da meta; R$ 100,00 reservados na meta saindo da conta. Três cartões. */
const state = () => newState({
  accounts: [{ id: 'main', name: 'Conta principal', initial: 26688 }],
  cards: [
    { id: 'nu', name: 'Nubank', limit: 100000, close: 1, due: 8 },
    { id: 'santander', name: 'Santander', limit: 200000, close: 20, due: 1 },
    { id: 'sofisa', name: 'Sofisa 6333', limit: 50000, close: 5, due: 15 },
  ],
  goals: [{ id: 'g1', name: 'Notebook', target: 300000, saved: 10000, deadline: null, monthly: 0 }],
  txs: [
    T('meta', 'expense', 10000, '2026-11-02', 'Meta › Notebook', GOAL_CAT, { goalId: 'g1' }),
    T('s1', 'expense', 48851, '2026-10-20', 'Compras', 'Outros', { cardId: 'sofisa' }),
    T('t1', 'expense', 49088, '2026-11-01', 'Compras', 'Outros', { cardId: 'santander' }),
  ],
});
const row = (s, id, d = today) => MoneyView.cards(s, d).find(r => r.card.id === id);

test('meu dinheiro: saldo da conta igual ao do Início, com reserva para meta', () => {
  const s = state(), acc = s.accounts[0];
  assert.equal(Finance.accountBalance(s, acc), 16688);
  assert.equal(MoneyView.overview(s, today).inAccounts, Finance.currentBalance(s));
  assert.equal(MoneyView.reservedFrom(s, acc), 10000);
  const back = { ...s, txs: [...s.txs, T('ret', 'income', 4000, today, 'Retirada da meta › Notebook', GOAL_CAT, { goalId: 'g1' })] };
  assert.equal(MoneyView.reservedFrom(back, acc), 6000);
  assert.equal(MoneyView.overview(back, today).inAccounts, Finance.currentBalance(back));
});

test('meu dinheiro: soma das faturas abertas e guardado em metas', () => {
  const o = MoneyView.overview(state(), today);
  assert.equal(o.openInvoices, 48851 + 49088);
  assert.equal(o.inGoals, 10000);
  const s0 = state(), paid = { ...s0, txs: [...s0.txs, T('p', 'expense', 851, today, 'Pagamento fatura Sofisa 6333', CARD_PAYMENT_CAT, { cardPayment: 'sofisa' })] };
  assert.equal(MoneyView.overview(paid, today).openInvoices, 48000 + 49088);
});

test('meu dinheiro: porcentagem e disponível do limite', () => {
  const r = row(state(), 'sofisa');
  assert.equal(r.pct, 97);
  assert.equal(r.available, 1149);
  assert.equal(MoneyView.pct(1000, 0), 0);
  assert.equal(Math.min(100, MoneyView.pct(60000, 50000)), 100);
  assert.equal(MoneyView.barDescription(r, false), 'Sofisa 6333, 97% do limite usado, disponível R$ 11,49');
  assert.ok(!MoneyView.barDescription(r, true).includes('11,49'));
});

test('meu dinheiro: faixas de cor da barra', () => {
  assert.equal(MoneyView.band(0), 'NORMAL');
  assert.equal(MoneyView.band(69), 'NORMAL');
  assert.equal(MoneyView.band(70), 'ALERT');
  assert.equal(MoneyView.band(89), 'ALERT');
  assert.equal(MoneyView.band(90), 'CRITICAL');
  assert.equal(MoneyView.band(120), 'CRITICAL');
  assert.equal(MoneyView.pct(8999, 10000), 89);
});

test('meu dinheiro: ordena pelo vencimento mais próximo', () => {
  assert.deepEqual(MoneyView.cards(state(), today).map(r => r.card.id), ['sofisa', 'santander', 'nu']);
  const nu = MoneyView.cards(state(), today).at(-1);
  assert.equal(nu.invoice, null);
  assert.equal(nu.open, 0);
});

test('meu dinheiro: texto "daqui a N dias"', () => {
  const r = MoneyView.cards(state(), today);
  assert.equal(r[0].daysToDue, 12);
  assert.equal(MoneyView.dueSuffix(12), '· daqui a 12 dias');
  assert.equal(MoneyView.dueSuffix(15), '· daqui a 15 dias');
  assert.equal(MoneyView.dueSuffix(16), null);
  assert.equal(MoneyView.dueSuffix(null), null);
  assert.equal(MoneyView.dueSuffix(1), '· amanhã');
  assert.equal(MoneyView.dueSuffix(0), '· vence hoje');
  assert.equal(MoneyView.dueSuffix(-2), '· vencida');
  assert.equal(r[0].dueSoon, true);
  assert.equal(r[1].dueSoon, false);
});

test('meu dinheiro: plural de contas, cartões e limites', () => {
  assert.equal(MoneyView.plural(1, 'conta', 'contas'), 'conta');
  assert.equal(MoneyView.plural(0, 'conta', 'contas'), 'contas');
  assert.equal(MoneyView.plural(3, 'cartão', 'cartões'), 'cartões');
  assert.equal(MoneyView.plural(1, 'cartão', 'cartões'), 'cartão');
  assert.equal(MoneyView.limitsSummary(new Map([['Lazer', 10000]]), new Map()), '1 limite · 0 perto do teto');
  assert.equal(MoneyView.limitsSummary(new Map([['Lazer', 10000], ['Saúde', 10000]]), new Map([['Lazer', 8000]])), '2 limites · 1 perto do teto');
  assert.equal(MoneyView.limitsSummary(new Map(), new Map()), null);
});

test('meu dinheiro: resumo das metas', () => {
  const g1 = { id: 'g1', name: 'Notebook', target: 300000, saved: 10000, deadline: null, monthly: 0 };
  const g2 = { id: 'g2', name: 'Viagem', target: 300000, saved: 5000, deadline: null, monthly: 0 };
  assert.equal(MoneyView.goalsSummary([g1], false), 'Notebook · R$ 100,00 guardado');
  assert.equal(MoneyView.goalsSummary([g1, g2], false), '2 metas · R$ 150,00 guardados');
  assert.equal(MoneyView.goalsSummary([g1], true), 'Notebook · R$ •••• guardado');
  assert.equal(MoneyView.goalsSummary([], false), null);
});

test('meu dinheiro: resumo com a seção recolhida', () => {
  const s = state();
  assert.equal(MoneyView.accountsCollapsed(s, false), 'Contas · R$ 166,88');
  const two = { ...s, accounts: [...s.accounts, { id: 'pp', name: 'Poupança', initial: 10000 }] };
  assert.equal(MoneyView.accountsCollapsed(two, false), 'Contas · R$ 266,88 · 2 contas');
  assert.equal(MoneyView.cardsCollapsed(s, today, false), 'Cartões · 3 · R$ 979,39 em faturas');
  assert.equal(MoneyView.cardsCollapsed(s, today, true), 'Cartões · 3 · R$ •••• em faturas');
  assert.equal(MoneyView.accountsCollapsed(s, true), 'Contas · R$ ••••');
});

test('meu dinheiro: linha de alerta só nas condições', () => {
  const s = state();
  assert.equal(row(s, 'sofisa').alert, true);
  assert.equal(MoneyView.alertLine(row(s, 'sofisa'), false), 'Sofisa 6333 · 97% do limite');
  assert.equal(row(s, 'santander').alert, false);
  assert.equal(row(s, 'nu').alert, false);
  const r8 = row(s, 'sofisa', '2026-11-08');
  assert.equal(MoneyView.alertLine(r8, false), 'Sofisa 6333 · vence 15/11 · 97% do limite');
  assert.equal(MoneyView.alertLine(r8, true), 'Sofisa 6333 · vence 15/11 · perto do limite');
  const low = { ...s, cards: s.cards.map(c => c.id === 'sofisa' ? { ...c, limit: 1000000 } : c) };
  assert.equal(row(low, 'sofisa', '2026-11-07').alert, false);
  assert.equal(row(low, 'sofisa', '2026-11-08').alert, true);
  assert.equal(MoneyView.alertLine(row(low, 'sofisa', '2026-11-08'), false), 'Sofisa 6333 · vence 15/11');
});
