// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Reserva para meta (Android 1.7.0): guardar tira da conta, mas não é despesa. Mesmos casos de
// GoalReserveTest.kt e DayTotalTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ops, Finance, Csv, tx, newState, parseBackup, toJson, isFlow, isGoal, GOAL_CAT, ymOf } from '../js/core.js';
import { MonthCalendar, Period } from '../js/calendar.js';
import { Insights } from '../js/assist.js';
import { buildReport } from '../js/report.js';

const today = '2026-10-17';
const ok = r => { assert.equal(r.ok, true, r.message); return r.state; };
const withGoal = () => {
  const base = newState({ accounts: [{ id: 'main', name: 'Conta principal', initial: 100000 }, { id: 'poup', name: 'Poupança', initial: 0 }] });
  const s = ok(Ops.saveGoal(base, null, 'Viagem', '6000', '', null, ''));
  return [s, s.goals[0].id];
};
const acc = (s, id) => s.accounts.find(a => a.id === id);

test('meta: guardar tira da conta sem contar como despesa', () => {
  const [s0, id] = withGoal();
  const s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', true, 'main', today));
  assert.equal(s.goals[0].saved, 30000);
  assert.equal(s.txs.length, 1);
  const t = s.txs[0];
  assert.ok(isGoal(t)); assert.ok(!isFlow(t)); assert.ok(t.paid);
  assert.equal(t.kind, 'expense'); assert.equal(t.category, GOAL_CAT); assert.equal(t.desc, 'Meta › Viagem'); assert.equal(t.date, today);
  assert.equal(Finance.accountBalance(s, s.accounts[0]), 70000);
  assert.equal(Finance.flow(s.txs).expense, 0);
  assert.deepEqual(Finance.categoryTotals(s, null, null), []);
  assert.equal(Finance.budgetUsage(s, ymOf(today)).size, 0);
  assert.equal(Ops.canTogglePaid(t), false);
  assert.deepEqual(Finance.goalMoves(s.txs), { saved: 30000, withdrawn: 0, net: 30000 });
});

test('meta: retirar devolve para a conta e para no zero', () => {
  const [s0, id] = withGoal();
  let s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '100', null, '', true, 'poup', today));
  s = ok(Ops.saveGoal(s, id, 'Viagem', '6000', '-250', null, '', true, 'poup', today));
  assert.equal(s.goals[0].saved, 0);
  const back = s.txs.at(-1);
  assert.equal(back.kind, 'income'); assert.equal(back.value, 10000); assert.equal(back.desc, 'Retirada da meta › Viagem');
  assert.equal(Finance.accountBalance(s, acc(s, 'poup')), 0);
  assert.equal(Finance.flow(s.txs).income, 0);
});

test('meta: sem tirar da conta fica como antes', () => {
  const [s0, id] = withGoal();
  const s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', false, 'main', today));
  assert.equal(s.goals[0].saved, 30000);
  assert.equal(s.txs.length, 0);
  assert.equal(Finance.accountBalance(s, s.accounts[0]), 100000);
  // a assinatura antiga (sem fromAccount) continua igual
  assert.equal(ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '')).txs.length, 0);
});

test('meta: conta inexistente cai na primeira; meta inexistente é recusada', () => {
  const [s0, id] = withGoal();
  const s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '10', null, '', true, 'sumiu', today));
  assert.equal(s.txs[0].accountId, 'main');
  const r = Ops.saveGoal(s0, 'nao-existe', 'Viagem', '6000', '10', null, '');
  assert.equal(r.ok, false); assert.equal(r.message, 'Meta não encontrada.');
});

test('meta: excluir o lançamento desfaz na meta', () => {
  const [s0, id] = withGoal();
  let s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', true, 'main', today));
  s = Ops.deleteTx(s, s.txs[0].id, false);
  assert.equal(s.goals[0].saved, 0);
  assert.equal(Finance.accountBalance(s, s.accounts[0]), 100000);
});

test('meta: editar o lançamento de meta é recusado', () => {
  const [s0, id] = withGoal();
  const s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', true, 'main', today));
  const r = Ops.saveTx(s, s.txs[0].id, { kind: 'expense', desc: 'x', value: '1', category: 'Outros', date: today, paid: true, accountId: 'main' }, today);
  assert.equal(r.ok, false); assert.equal(r.title, 'Lançamento de meta');
});

test('meta: excluir a meta devolve o que saiu das contas', () => {
  const [s0, id] = withGoal();
  let s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', true, 'main', today));
  // 50 guardados sem tirar da conta não voltam (nunca saíram)
  s = ok(Ops.saveGoal(s, id, 'Viagem', '6000', '50', null, '', false, 'main', today));
  assert.equal(Ops.goalFromAccounts(s, id), 30000);
  s = Ops.deleteGoal(s, id, today);
  assert.equal(s.goals.length, 0);
  assert.equal(s.txs.at(-1).desc, 'Meta excluída › Viagem');
  assert.equal(Finance.accountBalance(s, s.accounts[0]), 100000);
  assert.equal(Finance.flow(s.txs).income, 0);
  // meta sem dinheiro das contas: só some
  const [g0, gid] = withGoal();
  assert.equal(Ops.deleteGoal(g0, gid, today).txs.length, 0);
});

test('meta: backup leva o goalId (ida e volta estável)', () => {
  const [s0, id] = withGoal();
  const s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', true, 'main', today));
  const j = toJson(s);
  assert.ok(j.includes(`"goalId":"${id}"`));
  const again = parseBackup(j).state;
  assert.equal(again.txs[0].goalId, id);
  assert.ok(!isFlow(again.txs[0]));
  assert.equal(toJson(again), j);
});

test('meta: backup — reserva sempre realizada, sem data prevista, nunca no cartão', () => {
  const raw = { txs: [
    { id: 'a', kind: 'expense', value: 10, date: '2026-10-01', desc: 'M', paid: false, goalId: 'g1', scheduledDate: '2026-09-30' },
    { id: 'b', kind: 'expense', value: 10, date: '2026-10-01', desc: 'C', cardId: 'c1', goalId: 'g1' },
    { id: 'c', kind: 'income', value: 10, date: '2026-10-01', desc: 'R', goalId: 'g1' },
    { id: 'd', kind: 'expense', value: 10, date: '2026-10-01', desc: 'X', goalId: 'id inválido' },
  ], cards: [{ id: 'c1', name: 'Cartão', limit: 100, close: 5, due: 12 }] };
  const t = parseBackup(JSON.stringify(raw)).state.txs;
  assert.equal(t[0].goalId, 'g1'); assert.equal(t[0].paid, true); assert.equal(t[0].scheduledDate, null); assert.equal(t[0].category, GOAL_CAT);
  assert.equal(t[1].goalId, ''); assert.equal(t[1].cardId, 'c1');
  assert.equal(t[2].goalId, 'g1'); assert.equal(t[2].kind, 'income');
  assert.equal(t[3].goalId, ''); assert.equal(t[3].category, 'Outros');
});

test('meta: assistente não vê reserva como gasto', () => {
  const [s0, id] = withGoal();
  const s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '5000', null, '', true, 'main', today));
  const r = Insights.report(s, today);
  assert.ok(r.lines.every(l => !l.includes('50,00') && !l.includes('5.000')), r.lines.join(' | '));
});

test('meta: CSV e relatório', () => {
  const [s0, id] = withGoal();
  let s = ok(Ops.saveGoal(s0, id, 'Viagem', '6000', '300', null, '', true, 'main', today));
  s = ok(Ops.saveGoal(s, id, 'Viagem', '6000', '-100', null, '', true, 'main', today));
  const csv = Csv.build(s);
  assert.ok(csv.includes('"reserva para meta"') && csv.includes('"retirada de meta"'));
  const r = buildReport(s, '2026-10-01', '2026-10-31', today);
  assert.equal(r.expense, 0); assert.equal(r.income, 0); assert.equal(r.pendingExpense, 0);
  assert.equal(r.txs.length, 2); // aparecem na lista, como os pagamentos de fatura
});

// ------------------------------------------------------------------ total do dia (DayTotalTest)
const day = '2026-11-02';
const dtx = (id, kind, value, { paid = true, card = '', goal = '' } = {}) =>
  tx({ id, kind, value, date: day, desc: id, category: goal ? GOAL_CAT : 'Outros', paid: paid || !!card || !!goal, accountId: 'main', cardId: card, goalId: goal });

test('total do dia: só receitas e despesas', () => {
  assert.deepEqual(Period.dayTotal([dtx('a', 'income', 50000), dtx('b', 'expense', 12000, { paid: false })]), { net: 38000, goals: 0, hasFlow: true });
});

test('total do dia: só reservas', () => {
  const t = Period.dayTotal([dtx('m', 'expense', 10000, { goal: 'g1' })]);
  assert.equal(t.net, 0); assert.equal(t.goals, 10000); assert.equal(t.hasFlow, false);
});

test('total do dia: misto, a reserva fica fora do total', () => {
  const t = Period.dayTotal([dtx('a', 'income', 50000), dtx('m', 'expense', 10000, { goal: 'g1' }), dtx('r', 'income', 2500, { goal: 'g1' })]);
  assert.equal(t.net, 50000); assert.equal(t.goals, 7500); assert.equal(t.hasFlow, true);
});

test('total do dia: compra no cartão + reserva (caso de 2 de novembro) e calendário', () => {
  const txs = [dtx('c', 'expense', 12600, { card: 'itau' }), dtx('m', 'expense', 10000, { goal: 'g1' })];
  assert.deepEqual(Period.dayTotal(txs), { net: 0, goals: 10000, hasFlow: false });
  const s = newState({ txs, cards: [{ id: 'itau', name: 'Itaú', limit: 20000, close: 24, due: 1 }] });
  const cal = MonthCalendar.build(s, ymOf(day), day).get(day);
  assert.equal(cal.flowNet, 0); assert.equal(cal.goals, 10000); assert.equal(cal.hasFlow, false);
  assert.equal(cal.net, -10000); // a reserva segue saindo da conta nos totais do mês
  assert.deepEqual(cal.marks, ['card', 'goal']);
  assert.equal(MonthCalendar.describe(day, cal, day, false), '2 de novembro, segunda-feira, hoje, 2 lançamentos, R$ 100,00 guardados em metas');
});

test('total do dia: saldos não mudam', () => {
  const s = newState({ accounts: [{ id: 'main', name: 'Conta principal', initial: 50000 }], txs: [dtx('m', 'expense', 10000, { goal: 'g1' }), dtx('b', 'expense', 5000)] });
  assert.equal(Finance.currentBalance(s), 35000);
  assert.deepEqual(Period.pending([dtx('m2', 'expense', 1, { goal: 'g1' })]), { toReceive: 0, toPay: 0 });
});
