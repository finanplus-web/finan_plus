// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Dívidas montadas a partir dos lançamentos da categoria Dívidas (ou o antigo Empréstimo); categorias antigas
// de forma de pagamento; plural e ordinal. Mesmos casos de DebtsTest.kt, CategoryMigrationTest.kt e WordsTest.kt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tx, newState, plusMonths, DEFAULT_EXPENSE } from '../js/core.js';
import { Debts } from '../js/debts.js';
import { TxForm } from '../js/txform.js';
import { Words } from '../js/words.js';

const parcel = (n, paid, category = 'Dívidas') => tx({ id: `mp${n}`, kind: 'expense', value: 12140, date: plusMonths('2026-10-13', n - 1),
  desc: `Mercado Pago (${n}/4)`, category, paid, accountId: 'main', groupId: 'mp', parcelN: n, parcelTotal: 4 });

test('dívidas: agrupa parcelas e mostra a próxima', () => {
  const s = newState({ txs: [parcel(1, true), parcel(2, false), parcel(3, false), parcel(4, false)] });
  const l = Debts.list(s);
  assert.equal(l.length, 1);
  assert.equal(l[0].name, 'Mercado Pago');
  assert.equal(l[0].next?.id, 'mp2');
  assert.equal(l[0].pendingCount, 3);
  assert.equal(l[0].pendingTotal, 3 * 12140);
  assert.equal(l[0].paidCount, 1);
  assert.equal(l[0].totalCount, 4);
  assert.equal(Debts.summary(s, false), '1 dívida · parcela de R$ 121,40 em 13/11');
  assert.equal(Debts.summary(s, true), '1 dívida · parcela de R$ •••• em 13/11');
});

test('dívidas: categoria antiga Empréstimo também conta', () => {
  const s = newState({ txs: [parcel(1, false, 'Empréstimo'), tx({ id: 'x', kind: 'expense', value: 500, date: '2026-11-01', desc: 'Mercado', category: 'Alimentação', paid: false })] });
  assert.equal(Debts.list(s).length, 1);
  assert.ok(Debts.isDebtCategory('emprestimos'));
  assert.equal(Debts.baseName('Carro (12/48) '), 'Carro');
});

test('dívidas: quitada não entra no resumo', () => {
  const s = newState({ txs: [1, 2, 3, 4].map(n => parcel(n, true)) });
  assert.ok(Debts.list(s)[0].done);
  assert.equal(Debts.summary(s, false), null);
});

test('dívidas: duas abertas falam da próxima parcela', () => {
  const s = newState({ txs: [parcel(2, false), tx({ id: 'carro', kind: 'expense', value: 50000, date: '2026-11-05', desc: 'Carro', category: 'Financiamento', paid: false })] });
  assert.equal(Debts.summary(s, false), '2 dívidas · próxima parcela de R$ 500,00 em 05/11');
});

// ------------------------------------------------------------------ migração das categorias
const day = '2026-11-02';
const st = () => newState({
  cats: { expense: ['Alimentação', 'Cartão de Crédito', 'Empréstimo', 'Limite Especial', 'Outros'], income: ['Salário', 'Caju'] },
  txs: [
    tx({ id: 'a', kind: 'expense', value: 100, date: day, desc: 'Anuidade', category: 'Cartão de Crédito', paid: true }),
    tx({ id: 'b', kind: 'expense', value: 12140, date: day, desc: 'Mercado Pago (2/4)', category: 'Empréstimo', paid: false }),
    tx({ id: 'c', kind: 'expense', value: 800, date: day, desc: 'Juros', category: 'Limite Especial', paid: true }),
  ],
  limits: new Map([['Empréstimo', 50000]]),
});

test('categorias: migra uma vez sem perder histórico', () => {
  const m = TxForm.migrate(st());
  assert.deepEqual(m.cats.expense, ['Alimentação', 'Dívidas', 'Outros']);
  assert.equal(m.txs.find(t => t.id === 'b').category, 'Dívidas');
  assert.equal(m.limits.get('Dívidas'), 50000);
  assert.equal(m.txs.find(t => t.id === 'a').category, 'Cartão de Crédito');
  assert.equal(TxForm.displayCategory('Limite Especial'), 'Outros');
  assert.deepEqual(m.cats.income, ['Salário', 'Caju']);
  assert.equal(TxForm.migrate(m), null); // idempotente
});

test('categorias: junta em Dívidas quando já existe', () => {
  const s = { ...st(), cats: { expense: ['Dívidas', 'Empréstimo', 'Outros'], income: ['Salário'] } };
  const m = TxForm.migrate(s);
  assert.deepEqual(m.cats.expense, ['Dívidas', 'Outros']);
  assert.ok(m.txs.every(t => t.category !== 'Empréstimo'));
  assert.equal(m.limits.get('Dívidas'), 50000);
  assert.ok(!m.limits.has('Empréstimo'));
});

test('categorias: o padrão novo já tem Dívidas', () => {
  assert.ok(DEFAULT_EXPENSE.includes('Dívidas'));
  assert.equal(DEFAULT_EXPENSE.indexOf('Dívidas'), DEFAULT_EXPENSE.indexOf('Outros') - 1);
  assert.equal(TxForm.migrate(newState()), null);
});

// ------------------------------------------------------------------ Words
test('palavras: ordinal troca grau por indicador', () => {
  assert.equal(Words.ordinal('13° Salário'), '13º Salário');
  assert.equal(Words.ordinal('13 ° Salário'), '13º Salário');
  assert.equal(Words.ordinal('13˚ Salário'), '13º Salário');
  assert.equal(Words.ordinal('13º Salário'), '13º Salário');
});

test('palavras: plural, só 1 é singular', () => {
  assert.equal(Words.count(1, 'conta', 'contas'), '1 conta');
  assert.equal(Words.count(0, 'conta', 'contas'), '0 contas');
  assert.equal(Words.count(3, 'cartão', 'cartões'), '3 cartões');
});
