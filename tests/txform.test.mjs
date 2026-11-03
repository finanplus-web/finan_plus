// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Tela de lançamento: valor em pt-BR, bloqueio de zero, categorias, recentes e sugestões (AmountInput e TxForm).
// Mesmos casos de TxFormTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ops, tx, newState } from '../js/core.js';
import { AmountInput, TxForm } from '../js/txform.js';

const T = (id, kind, date, category, desc = id, goalId = '') => tx({ id, kind, value: 1000, date, desc, category, paid: true, accountId: 'main', goalId });

test('valor: formata em pt-BR', () => {
  assert.equal(AmountInput.format(''), '');
  assert.equal(AmountInput.format('0'), '0');
  assert.equal(AmountInput.format('12,5'), '12,5');
  assert.equal(AmountInput.format('1234,56'), '1.234,56');
  assert.equal(AmountInput.format('1234'), '1.234');
  assert.equal(AmountInput.format('1234567,89'), '1.234.567,89');
});

test('valor: formata em tempo real, dígito a dígito', () => {
  let text = '';
  const seen = [];
  for (const ch of '1234,5') { text = AmountInput.format(text + ch); seen.push(text); }
  assert.deepEqual(seen, ['1', '12', '123', '1.234', '1.234,', '1.234,5']);
  assert.equal(AmountInput.format('1.23'), '123');
  assert.equal(AmountInput.format('1.2345'.slice(0, -1)), '1.234');
});

test('valor: ponto digitado no fim vale como vírgula', () => {
  assert.equal(AmountInput.format('12.'), '12,');
  assert.equal(AmountInput.format('1.234.'), '1.234,');
  assert.equal(AmountInput.format('12,5'), '12,5');
});

test('valor: limita casas e zeros à esquerda', () => {
  assert.equal(AmountInput.format('1,2345'), '1,23');
  assert.equal(AmountInput.format('007'), '7');
  assert.equal(AmountInput.format('0,5'), '0,5');
  assert.equal(AmountInput.format(',5'), '0,5');
  assert.equal(AmountInput.format('1a2b'), '12');
  assert.equal(AmountInput.format('1234,56'), '1.234,56');
  assert.equal([...AmountInput.format('1'.repeat(20))].filter(c => c === '1').length, 13);
});

test('valor: centavos batem com o que o app salva', () => {
  assert.equal(AmountInput.cents('1.234,56'), 123456);
  assert.equal(AmountInput.cents('12,5'), 1250);
  assert.equal(AmountInput.cents('0'), 0);
  assert.equal(AmountInput.cents(''), null);
  assert.equal(AmountInput.fromCents(123456), '1.234,56');
  assert.equal(AmountInput.fromCents(1250), '12,50');
});

test('valor: zero e vazio não podem ser salvos', () => {
  assert.equal(AmountInput.isPositive(''), false);
  assert.equal(AmountInput.isPositive('0'), false);
  assert.equal(AmountInput.isPositive('0,00'), false);
  assert.equal(AmountInput.isPositive('0,01'), true);
  assert.equal(AmountInput.isPositive('12,5'), true);
  assert.equal(AmountInput.isZeroTyped(''), false);
  assert.equal(AmountInput.isZeroTyped('0'), true);
  assert.equal(AmountInput.isZeroTyped('0,00'), true);
  assert.equal(AmountInput.isZeroTyped('0,01'), false);
  const s = newState({ accounts: [{ id: 'main', name: 'Conta', initial: 0 }] });
  assert.equal(Ops.saveTx(s, null, { kind: 'expense', desc: '', value: '0,00', category: 'Outros', date: '2026-11-03', paid: true, accountId: 'main' }, '2026-11-03').ok, false);
});

test('categoria: trocar de tipo limpa a categoria que não existe', () => {
  const despesas = ['Alimentação', 'Transporte', 'Outros'], receitas = ['Salário', 'Extra', 'Outros'];
  assert.equal(TxForm.categoryAfterKindChange('Transporte', receitas), '');
  assert.equal(TxForm.categoryAfterKindChange('Outros', receitas), 'Outros');
  assert.equal(TxForm.categoryAfterKindChange('Salario', receitas), 'Salário');
  assert.equal(TxForm.categoryAfterKindChange('Salário', despesas), '');
  assert.equal(TxForm.categoryAfterKindChange('', despesas), '');
});

test('categoria: "Cartão de Crédito" aparece como Outros e fica fora da lista', () => {
  assert.equal(TxForm.displayCategory('Cartão de Crédito'), 'Outros');
  assert.equal(TxForm.displayCategory('cartao de credito'), 'Outros');
  assert.equal(TxForm.displayCategory('  CARTÃO DE CRÉDITO '), 'Outros');
  assert.equal(TxForm.displayCategory('Mercado'), 'Mercado');
  assert.equal(TxForm.isPaymentLike('Cheque especial'), true);
  assert.deepEqual(TxForm.choices(['Alimentação', 'Cartão de Crédito', 'Outros', 'Outros']), ['Alimentação', 'Outros']);
  const t = T('a', 'expense', '2026-11-01', 'Cartão de Crédito');
  TxForm.displayCategory(t.category);
  assert.equal(t.category, 'Cartão de Crédito');
});

test('categoria: busca sem diferenciar acento nem caixa', () => {
  const l = ['Alimentação', 'Saúde', 'Educação', 'Outros'];
  assert.deepEqual(TxForm.filter(l, 'alimen'), ['Alimentação']);
  assert.deepEqual(TxForm.filter(l, 'SAUDE'), ['Saúde']);
  assert.deepEqual(TxForm.filter(l, 'ç'), ['Alimentação', 'Educação']);
  assert.deepEqual(TxForm.filter(l, '  '), l);
  assert.deepEqual(TxForm.filter(l, 'zzz'), []);
});

test('categoria: recentes do mais recente para o menos, até quatro', () => {
  const all = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'];
  const txs = [
    T('1', 'expense', '2026-10-01', 'Moradia'),
    T('2', 'expense', '2026-10-20', 'Lazer'),
    T('3', 'expense', '2026-10-25', 'Alimentação'),
    T('4', 'expense', '2026-10-25', 'Transporte'),
    T('5', 'expense', '2026-10-10', 'Alimentação'),
    T('6', 'expense', '2026-09-01', 'Saúde'),
    T('7', 'income', '2026-10-30', 'Salário'),
    T('8', 'expense', '2026-10-31', 'Meta', '8', 'g1'),
  ];
  assert.deepEqual(TxForm.recentCategories(txs, 'expense', all), ['Transporte', 'Alimentação', 'Lazer', 'Moradia']);
  assert.deepEqual(TxForm.recentCategories(txs, 'income', ['Salário', 'Extra']), ['Salário']);
  assert.deepEqual(TxForm.recentCategories(txs, 'expense', all.filter(c => c !== 'Alimentação')), ['Transporte', 'Lazer', 'Moradia', 'Saúde']);
  assert.deepEqual(TxForm.recentCategories([], 'expense', all), []);
  assert.equal(TxForm.recentCategories(txs, 'expense', all, 2).length, 2);
});

test('descrição: sugestões mais usadas primeiro', () => {
  const txs = [
    T('1', 'expense', '2026-10-01', 'Alimentação', 'Mercado'),
    T('2', 'expense', '2026-10-05', 'Alimentação', 'mercado'),
    T('3', 'expense', '2026-10-06', 'Transporte', 'Uber'),
    T('4', 'expense', '2026-10-07', 'Alimentação', 'iFood'),
    T('5', 'expense', '2026-10-08', 'Outros', 'Outros'),
    T('6', 'income', '2026-10-09', 'Salário', 'Empresa'),
  ];
  assert.deepEqual(TxForm.descriptionSuggestions(txs, 'expense'), ['mercado', 'iFood', 'Uber']);
  assert.deepEqual(TxForm.descriptionSuggestions(txs, 'income'), ['Empresa']);
  assert.deepEqual(TxForm.descriptionSuggestions([], 'expense'), []);
});
