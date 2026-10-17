// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regras da 1.6.0, iguais ao app Android (SettlementDateTest, LimitsTest, RegressionTest).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newState, Ops, Finance, normalize, parseBackup, toJson, centsFromDecimal, LIMITS, BackupError, MAX_ABS_CENTS } from '../js/core.js';

const today = '2026-10-17';
const draft = (o = {}) => ({ kind: 'expense', desc: 'Luz', value: '100', category: 'Moradia', date: today, paid: true, accountId: 'main', cardId: '', reps: 1, repsMode: 'TOTAL', recurring: false, ...o });
const state = r => { assert.ok(r.ok, r.message); return r.state; };

test('novo lançamento só vem realizado por padrão na data de hoje', () => {
  assert.equal(Ops.defaultPaid(today, today), true);
  assert.equal(Ops.defaultPaid('2026-10-16', today), false);
  assert.equal(Ops.defaultPaid('2026-10-18', today), false);
  assert.equal(Ops.defaultPaid(null, today), false);
});

test('confirmar pendente guarda a data real e a prevista; desfazer restaura', () => {
  const s = state(Ops.saveTx(newState(), null, draft({ date: '2026-10-10', paid: false }), today));
  const id = s.txs[0].id;
  const paid = Ops.togglePaid(s, id, today).txs[0];
  assert.deepEqual([paid.paid, paid.date, paid.scheduledDate], [true, today, '2026-10-10']);
  const back = Ops.togglePaid(Ops.togglePaid(s, id, today), id, today).txs[0];
  assert.deepEqual([back.paid, back.date, back.scheduledDate], [false, '2026-10-10', null]);
});

test('lançamento futuro marcado como pago conta hoje e guarda o vencimento', () => {
  const s = state(Ops.saveTx(newState(), null, draft({ date: '2026-10-25', paid: true }), today));
  assert.deepEqual([s.txs[0].date, s.txs[0].scheduledDate], [today, '2026-10-25']);
  assert.equal(Finance.monthFlow(s, 2026 * 12 + 9).expense, 10000);
  // editar de volta para pendente restaura a data prevista
  const e = state(Ops.saveTx(s, s.txs[0].id, draft({ date: today, paid: false }), today)).txs[0];
  assert.deepEqual([e.paid, e.date, e.scheduledDate], [false, '2026-10-25', null]);
});

test('data prevista atravessa o backup (e some em compra no cartão)', () => {
  const s = state(Ops.saveTx(newState(), null, draft({ date: '2026-10-25', paid: true }), today));
  const back = parseBackup(toJson(s)).state.txs[0];
  assert.equal(back.scheduledDate, '2026-10-25');
  const raw = JSON.parse(toJson(s)); raw.txs[0].paid = false;
  assert.equal(normalize(raw).state.txs[0].scheduledDate, null, 'pendente não tem data prevista');
});

test('valores do backup viram centavos exatos', () => {
  assert.equal(centsFromDecimal('1.005'), 101);
  assert.equal(centsFromDecimal('-2.345'), -235);
  assert.equal(centsFromDecimal('1e3'), 100000);
  assert.equal(centsFromDecimal('abc'), null);
  const n = normalize({ txs: [{ id: 'a', kind: 'expense', value: 1.005, date: today }, { id: 'b', kind: 'expense', value: '0.005', date: today }] });
  assert.deepEqual(n.state.txs.map(t => t.value), [101, 1]);
});

test('soma acima do limite seguro é recusada', () => {
  const big = (MAX_ABS_CENTS / 100).toFixed(2);
  const txs = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, kind: 'income', value: big, date: today }));
  assert.throws(() => normalize({ txs }), BackupError);
});

test('limites: backup externo recusa, dados próprios abrem, criação barrada, edição liberada', () => {
  const accounts = n => Array.from({ length: n }, (_, i) => ({ id: 'a' + i, name: 'Conta ' + i, initial: 0 }));
  assert.throws(() => normalize({ txs: [], accounts: accounts(LIMITS.accounts + 1) }), BackupError);
  const own = normalize({ txs: [], accounts: accounts(LIMITS.accounts + 3) }, { enforceLimits: false }).state;
  assert.equal(own.accounts.length, LIMITS.accounts + 3);
  assert.equal(Ops.saveAccount(own, null, 'Mais uma', '').ok, false);
  assert.equal(state(Ops.saveAccount(own, 'a1', 'Renomeada', '')).accounts[1].name, 'Renomeada');
  const atLimit = normalize({ txs: [], accounts: accounts(LIMITS.accounts) }).state;
  assert.equal(parseBackup(toJson(atLimit)).state.accounts.length, LIMITS.accounts);
});

test('próximos vencimentos em ordem e no máximo 3', () => {
  let s = newState();
  for (const d of ['2026-10-30', '2026-10-20', '2026-10-05', '2026-11-02']) s = state(Ops.saveTx(s, null, draft({ date: d, paid: false, desc: d }), today));
  const u = Finance.upcomingDues(s, today);
  assert.deepEqual(u.map(x => x.date), ['2026-10-05', '2026-10-20', '2026-10-30']);
  assert.equal(u[0].type, 'BILL_OVERDUE');
  assert.equal(Finance.nextDue(s, today).date, '2026-10-05');
});
