// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Opção "Acumular saldo entre os meses" (Android 1.8.0): saldo das contas ao fim de um dia, realizado e previsto,
// e o relatório com o saldo acumulado. Mesmos casos de AccumulatedBalanceTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Finance, tx, newState } from '../js/core.js';
import { buildReport } from '../js/report.js';
import { renderPdf } from '../js/pdf.js';

const today = '2026-11-02';
const t = (id, kind, value, date, paid, accountId = 'main', cardId = '') => tx({ id, kind, value, date, desc: id, category: 'Outros', paid, accountId, cardId });
const base = newState({
  accounts: [{ id: 'main', name: 'Conta principal', initial: 100000 }, { id: 'poup', name: 'Poupança', initial: 50000 }],
  txs: [
    t('sal-set', 'income', 300000, '2026-09-05', true),
    t('alug-set', 'expense', 120000, '2026-09-10', true),
    t('sal-out', 'income', 300000, '2026-10-05', true),
    t('alug-out', 'expense', 120000, '2026-10-10', true, 'poup'),
    t('luz-nov', 'expense', 20000, '2026-11-20', false),
    t('freela-dez', 'income', 80000, '2026-12-15', false),
    // compra no cartão não mexe no saldo da conta
    t('mercado', 'expense', 9999, '2026-10-12', true, 'main', 'visa'),
    // lançamento de conta que não existe mais não entra (como em accountBalance)
    t('orfao', 'income', 777, '2026-10-01', true, 'apagada'),
  ],
});

test('acumulado: saldo inicial entra antes de qualquer lançamento', () => {
  assert.equal(Finance.balanceAt(base, '2026-08-31'), 150000);
});

test('acumulado: soma os meses anteriores', () => {
  assert.equal(Finance.balanceAt(base, '2026-09-30'), 330000);
  assert.equal(Finance.balanceAt(base, '2026-10-31'), 510000);
});

test('acumulado: mês futuro mantém o realizado e soma as pendências no previsto', () => {
  assert.equal(Finance.balanceAt(base, '2026-11-30'), 510000);
  assert.equal(Finance.forecastAt(base, '2026-11-30', today), 490000);
  assert.equal(Finance.forecastAt(base, '2026-12-31', today), 570000);
});

test('acumulado: previsto de hoje em diante bate com o saldo previsto do Início', () => {
  for (const until of [today, '2026-11-30', '2026-12-31']) assert.equal(Finance.forecastAt(base, until, today), Finance.futureBalance(base, until, today));
});

test('acumulado: soma do saldo das contas bate com o saldo atual', () => {
  assert.equal(Finance.balanceAt(base, today), Finance.currentBalance(base));
});

// ------------------------------------------------------------------ relatório (AccumulatedReportTest)
const s = newState({
  accounts: [{ id: 'main', name: 'Conta principal', initial: 100000 }],
  txs: [
    tx({ id: 'a', kind: 'income', value: 300000, date: '2026-10-05', desc: 'Salário', category: 'Salário', paid: true }),
    tx({ id: 'b', kind: 'expense', value: 120000, date: '2026-10-10', desc: 'Aluguel', category: 'Moradia', paid: true }),
    tx({ id: 'c', kind: 'expense', value: 20000, date: '2026-11-01', desc: 'Luz', category: 'Moradia', paid: true }),
  ],
});

test('relatório: opção desligada não muda o relatório', () => {
  const r = buildReport(s, '2026-11-01', '2026-11-30', today);
  assert.equal(r.carried, null); assert.equal(r.accumulated, null);
  assert.equal(r.months[0].accumulated, null);
});

test('relatório: ligada leva o saldo de outubro para novembro', () => {
  const r = buildReport(s, '2026-11-01', '2026-11-30', today, true);
  assert.equal(r.carried, 280000); assert.equal(r.accumulated, 260000);
  assert.equal(r.balance, -20000);
});

test('relatório: tabela mensal mostra o acumulado de cada mês', () => {
  const r = buildReport(s, '2026-09-01', '2026-11-30', today, true);
  assert.deepEqual(r.months.map(m => m.accumulated), [100000, 280000, 260000]);
  assert.equal(r.carried, 100000);
});

test('relatório: PDF com o saldo acumulado é gerado', () => {
  const r = buildReport(s, '2026-09-01', '2026-11-30', today, true);
  const { bytes } = renderPdf(r, s, { includeTransactions: true, now: new Date(2026, 10, 2, 10, 0) });
  const text = new TextDecoder('latin1').decode(bytes);
  assert.ok(text.includes('(Saldo acumulado)') && text.includes('(Acumulado)'));
  const off = new TextDecoder('latin1').decode(renderPdf(buildReport(s, '2026-09-01', '2026-11-30', today), s, {}).bytes);
  assert.ok(!off.includes('(Acumulado)'));
});
