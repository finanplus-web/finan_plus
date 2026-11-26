// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Transferência entre contas (Android 1.13): muda o saldo de cada conta, mas não é receita nem despesa.
// Mesmos casos de TransferTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ops, Finance, Csv, tx, newState, parseBackup, toJson, isFlow, isTransfer, Transfers, TRANSFER_CAT, ymOf } from '../js/core.js';
import { MonthCalendar, Period } from '../js/calendar.js';
import { Totals } from '../js/totals.js';

const today = '2026-11-10';
const ok = r => { assert.equal(r.ok, true, r.message); return r.state; };
const base = () => newState({ accounts: [{ id: 'main', name: 'Conta principal', initial: 100000 }, { id: 'poup', name: 'Poupança', initial: 0 }] });
const acc = (s, id) => s.accounts.find(a => a.id === id);
/** R$ 250 da Conta principal para a Poupança, mais uma despesa comum de R$ 45 no mesmo dia */
const withTransfer = () => {
  const s = ok(Ops.saveTransfer(base(), null, 'main', 'poup', '250', today, '', today));
  return { ...s, txs: [...s.txs, tx({ id: 'c1', kind: 'expense', value: 4500, date: today, desc: 'Feira', category: 'Alimentação', paid: true, accountId: 'main' })] };
};
const tidOf = s => s.txs.find(isTransfer).transferId;

test('cria os dois lados sem contar como receita ou despesa', () => {
  const s = withTransfer(), legs = s.txs.filter(isTransfer);
  assert.equal(legs.length, 2);
  assert.equal(new Set(legs.map(t => t.transferId)).size, 1);
  const l = Transfers.legs(s, legs[0].transferId);
  assert.equal(l.fromId, 'main'); assert.equal(l.toId, 'poup'); assert.equal(l.value, 25000);
  assert.ok(legs.every(t => t.paid && !isFlow(t) && t.category === TRANSFER_CAT && t.desc === 'Transferência'));
  assert.equal(Finance.accountBalance(s, acc(s, 'main')), 100000 - 25000 - 4500);
  assert.equal(Finance.accountBalance(s, acc(s, 'poup')), 25000);
  assert.equal(Finance.currentBalance(s), 100000 - 4500);
  assert.deepEqual(Finance.flow(s.txs), { income: 0, expense: 4500 });
  assert.deepEqual(Finance.categoryTotals(s, null, null).map(x => x[0] ?? x.category ?? x.name), ['Alimentação']);
  assert.deepEqual([...Finance.budgetUsage(s, ymOf(today)).keys()], ['Alimentação']);
  assert.deepEqual(Period.dayTotal(s.txs), { net: -4500, goals: 0, hasFlow: true });
  assert.ok(legs.every(t => !Ops.canTogglePaid(t)));
});

test('totais do mês e calendário ignoram a transferência', () => {
  const s = withTransfer(), m = Totals.month(s, ymOf(today), today);
  assert.equal(m.realizedIn, 0); assert.equal(m.realizedOut, 4500);
  assert.equal(m.opening, Finance.currentBalance(s));
  const day = MonthCalendar.build(s, ymOf(today), today).get(today);
  assert.equal(day.income, 0); assert.equal(day.expense, 4500);
  const only = ok(Ops.saveTransfer(base(), null, 'main', 'poup', '10', today, '', today));
  assert.equal(MonthCalendar.build(only, ymOf(today), today).get(today).hasFlow, false);
  assert.equal(Period.dayTotal(only.txs).hasFlow, false);
});

test('valida contas, valor e data', () => {
  const b = base();
  assert.equal(Ops.saveTransfer(b, null, 'main', 'main', '10', today, '', today).ok, false);
  assert.equal(Ops.saveTransfer(b, null, 'main', 'poup', '0', today, '', today).ok, false);
  assert.equal(Ops.saveTransfer(b, null, 'main', 'xyz', '10', today, '', today).ok, false);
  assert.equal(Ops.saveTransfer(b, null, 'main', 'poup', '10', '2026-11-11', '', today).ok, false);
  assert.equal(Ops.saveTransfer(b, null, 'main', 'poup', '10', '', '', today).ok, false);
  const one = newState({ accounts: [{ id: 'main', name: 'Conta principal', initial: 0 }] });
  assert.equal(Ops.saveTransfer(one, null, 'main', 'main', '10', today, '', today).title, 'Uma conta só');
  assert.equal(Ops.saveTransfer(b, null, 'main', 'poup', '10', '2026-11-07', 'Guardar', today).ok, true);
});

test('editar muda os dois lados juntos; o formulário comum recusa', () => {
  const s = withTransfer(), tid = tidOf(s);
  const e = ok(Ops.saveTransfer(s, tid, 'poup', 'main', '100', '2026-11-09', 'Volta', today));
  const l = Transfers.legs(e, tid);
  assert.equal(l.fromId, 'poup'); assert.equal(l.toId, 'main');
  assert.equal(l.value, 10000); assert.equal(l.date, '2026-11-09');
  assert.equal(l.out.desc, 'Volta'); assert.equal(l.into.desc, 'Volta');
  assert.equal(e.txs.length, s.txs.length);
  assert.equal(Finance.accountBalance(e, acc(e, 'poup')), -10000);
  assert.equal(Transfers.route(e, l), 'Poupança → Conta principal');
  const r = Ops.saveTx(e, l.out.id, { kind: 'expense', desc: 'x', value: '5', category: 'Outros', date: today, paid: true, accountId: 'main' }, today);
  assert.equal(r.ok, false); assert.equal(r.title, 'Transferência');
});

test('excluir um lado exclui os dois', () => {
  const s = withTransfer(), leg = s.txs.find(t => isTransfer(t) && t.kind === 'income');
  const d = Ops.deleteTx(s, leg.id, false);
  assert.deepEqual(d.txs.map(t => t.id), ['c1']);
  assert.equal(Finance.accountBalance(d, acc(d, 'main')), 100000 - 4500);
});

test('conta com transferência não pode ser excluída', () => {
  assert.equal(Ops.deleteAccount(withTransfer(), 'poup').ok, false);
});

test('backup guarda e restaura a transferência', () => {
  const s = withTransfer(), back = parseBackup(toJson(s)).state ?? parseBackup(toJson(s));
  const l = Transfers.legs(back, tidOf(s));
  assert.equal(l.value, 25000);
  assert.deepEqual(Finance.flow(back.txs), Finance.flow(s.txs));
  assert.equal(Finance.currentBalance(back), Finance.currentBalance(s));
});

test('backup com um lado só vira lançamento comum', () => {
  const s = withTransfer();
  const half = { ...s, txs: s.txs.filter(t => !(isTransfer(t) && t.kind === 'income')) };
  const p = parseBackup(toJson(half)), back = p.state ?? p;
  assert.ok(back.txs.every(t => !isTransfer(t)));
  assert.equal(Finance.flow(back.txs).expense, 25000 + 4500);
  const tid = tidOf(s);
  const wrong = s.txs.map(t => t.transferId === tid && t.kind === 'income' ? { ...t, value: 1 } : t);
  assert.equal(Transfers.legs({ ...s, txs: Transfers.sanitize(wrong) }, tid), null);
});

test('CSV marca a transferência', () => {
  const csv = Csv.build(withTransfer());
  assert.match(csv, /transferência enviada/);
  assert.match(csv, /transferência recebida/);
});
