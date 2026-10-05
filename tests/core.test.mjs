// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do núcleo (JSON, dinheiro, backup, finanças, operações): os mesmos casos do app Android
// (CoreTest.kt) e da versão Linux (tests/test_core.c). Rode com: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Money, Finance, Ops, Csv, tx, newState, clone, parseBackup, toJson, normalize, BackupError, DEFAULT_INCOME,
  plusMonths, ymDay, weekday, fullDate, ymOf, fromDayNum, dayNum, CARD_PAYMENT_CAT,
} from '../js/core.js';

const ym = (y, m) => y * 12 + m - 1;
let seq = 0;
export const mk = (id, kind, value, date, paid, cardId = '', cardPayment = '', category = 'Outros') =>
  tx({ id, kind, value, date, desc: id, category, paid, accountId: 'main', cardId, cardPayment });
const withCard = limit => newState({ cards: [{ id: 'c', name: 'C', limit, close: 5, due: 12 }] });
const okState = r => { assert.equal(r.ok, true, r.message); return r.state; };
const fail = r => { assert.equal(r.ok, false); return r.message; };

// ------------------------------------------------------------------ JSON
test('json: ida e volta preserva texto e é estável', () => {
  const s = parseBackup('{"txs":[{"id":"a","kind":"expense","value":2.5,"date":"2026-10-01","desc":"x\\"yé\\nz","category":"Lazer","paid":true}]}').state;
  assert.equal(s.txs[0].desc, 'x"yé\nz');
  const j = toJson(s);
  assert.ok(j.includes('"desc":"x\\"yé\\nz"'));
  assert.ok(j.includes('"value":2.50'));
  assert.equal(toJson(parseBackup(j).state), j);
});

test('json: recusa texto inválido e aninhamento excessivo', () => {
  for (const bad of ['{', '{"txs":[{"id":1,"kind":"expense"', '[1,]', 'tru', '{}x', '"\\q"'])
    assert.throws(() => parseBackup(bad), BackupError);
  assert.throws(() => parseBackup('{"txs":[], "x":' + '['.repeat(200) + ']'.repeat(200) + '}'), /aninhamento/);
});

// ------------------------------------------------------------------ dinheiro
test('dinheiro: leitura', () => {
  const ok = { '1500,50': 150050, '1.500,50': 150050, '1500.50': 150050, 'R$ 2.000': 200000, '1,500.25': 150025, '-50': -5000, '0,1': 10, '10': 1000, '1,999': 200 };
  for (const [k, v] of Object.entries(ok)) assert.equal(Money.parse(k), v, k);
  for (const bad of ['', 'abc', '1,2,3', '1.2.3,4.5', 'x', '-']) assert.equal(Money.parse(bad), null, bad);
});

test('dinheiro: formatação', () => {
  assert.equal(Money.format(123456789), 'R$ 1.234.567,89');
  assert.equal(Money.format(0), 'R$ 0,00');
  assert.equal(Money.format(-50), '-R$ 0,50');
  assert.equal(Money.input(150050), '1500,50');
});

// ------------------------------------------------------------------ backup
test('backup: estados novos são iguais', () => {
  assert.equal(toJson(newState()), toJson(newState()));
  assert.equal(newState().txs.length, 0);
});

test('backup: recusa arquivo sem lista de lançamentos', () => {
  for (const raw of ['null', '{}', '{"txs":"x"}', '[]']) assert.throws(() => parseBackup(raw), BackupError);
});

test('backup: descarta itens inválidos e conta', () => {
  const r = parseBackup('{"txs":['
    + '{"id":1,"kind":"expense","value":10,"date":"2026-10-01","desc":"ok","category":"Lazer"},'
    + '{"id":2,"kind":"expense","value":10,"desc":"sem data"},'
    + '{"id":3,"kind":"expense","value":10,"date":"2026-02-31"},'
    + '{"id":4,"kind":"x","value":10,"date":"2026-10-01"},'
    + '{"id":5,"kind":"income","value":-3,"date":"2026-10-01"},'
    + '{"id":6,"kind":"income","value":"12.5","date":"2026-10-02"},"lixo",null],'
    + '"cats":{"expense":["A","a","",7]},"accounts":"nope","goals":[{"name":"g","target":0}],'
    + '"limits":{"A":"abc","B":50}}');
  const s = r.state;
  assert.equal(s.txs.length, 2);
  assert.equal(r.dropped.txs, 6);
  assert.equal(s.txs[1].value, 1250);
  assert.deepEqual(s.cats.expense, ['A', '7']);
  assert.equal(s.cats.income.length, DEFAULT_INCOME.length);
  assert.equal(s.accounts[0].id, 'main');
  assert.equal(s.goals.length, 0);
  assert.equal(s.limits.size, 1);
  assert.equal(s.limits.get('B'), 5000);
});

test('backup: neutraliza HTML em ids e campos numéricos', () => {
  const evil = '\\"><img src=x onerror=alert(1)>';
  const s = parseBackup(`{"txs":[{"id":"${evil}","kind":"expense","value":1,"date":"2026-10-01","cardId":"c1"}],`
    + `"cards":[{"id":"c1","name":"Nu","limit":100,"close":"${evil}","due":"${evil}"}],`
    + `"accounts":[{"id":"${evil}","name":"A","initial":0}],"theme":"${evil}","autoLock":"${evil}"}`).state;
  const safe = /^[A-Za-z0-9_.-]+$/;
  assert.equal(s.cards[0].close, 5);
  assert.equal(s.cards[0].due, 12);
  assert.match(s.txs[0].id, safe);
  assert.match(s.accounts[0].id, safe);
  assert.equal(s.theme, 'auto');
  assert.equal(s.autoLock, 0);
  assert.equal(s.txs[0].cardId, 'c1');
});

test('backup: ids repetidos e referências inválidas', () => {
  const s = parseBackup('{"txs":[{"id":1,"kind":"expense","value":1,"date":"2026-10-01","accountId":"x","cardId":"x"},'
    + '{"id":1,"kind":"income","value":1,"date":"2026-10-01","cardId":"c"}],"cards":[{"id":"c","name":"C"}]}').state;
  const [a, b] = s.txs;
  assert.notEqual(a.id, b.id);
  assert.equal(a.accountId, 'main');
  assert.equal(a.cardId, '');
  assert.equal(b.cardId, ''); // receita não vai para cartão
});

test('backup: ids numéricos do Finan+ web antigo e exportação', () => {
  const s = parseBackup('{"txs":[{"id":1696000000000.1234,"kind":"expense","value":0.1,"date":"2026-10-01","parcel":{"n":1,"total":3},'
    + '"groupId":"g1"}],"theme":"dark","pin":"p1234"}').state;
  assert.ok(s.txs[0].id.startsWith('1696000000000.123'));
  assert.equal(s.txs[0].value, 10);
  assert.equal(s.theme, 'oledGray');
  const json = toJson(s, { app: 'Finan+ web', version: '1.1.0' });
  assert.ok(json.includes('"value":0.10'));
  assert.ok(!json.includes('pin'));
  assert.equal(toJson(parseBackup(json).state), toJson(s));
});

test('backup: estado antigo do Finan+ web (mf_v2) é migrado', () => {
  const old = { txs: [{ id: 1, kind: 'expense', value: 12.3, date: '2026-09-01', desc: 'Pão', category: 'Alimentação', paid: true, accountId: 'main' }],
    goals: [], accounts: [{ id: 'main', name: 'Conta principal', initial: 100 }], cards: [], recurring: [{ id: 'r', kind: 'income', desc: 'Sal', value: 10, day: 5, last: '2026-09', start: '2026-01-05', active: true }],
    privacy: false, autoLock: 5, backupVersion: 4, cats: { expense: ['Alimentação'], income: ['Salário'] }, limits: { 'Alimentação': 300 }, pin: 'abc', theme: 'tokyo' };
  const s = normalize(old).state;
  assert.equal(s.txs[0].value, 1230);
  assert.equal(s.accounts[0].initial, 10000);
  assert.equal(s.recurring[0].last, ym(2026, 9));
  assert.equal(s.autoLock, 5);
  assert.equal(s.theme, 'tokyo');
  assert.equal(s.limits.get('Alimentação'), 30000);
  assert.equal(s.pin, undefined);
});

// ------------------------------------------------------------------ finanças
test('finanças: datas limitadas ao fim do mês', () => {
  assert.equal(plusMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(plusMonths('2026-12-15', 1), '2027-01-15');
  assert.equal(ymDay(ym(2028, 2), 31), '2028-02-29');
  assert.equal(weekday('2026-10-03'), 6);
  assert.equal(fromDayNum(dayNum('1999-12-31')), '1999-12-31');
  assert.equal(fullDate('2026-10-03'), '03 de Outubro de 2026');
});

test('finanças: compra no cartão não mexe no saldo; pagamento da fatura sim', () => {
  let s = withCard(50000);
  s.accounts[0].initial = 100000;
  assert.equal(Finance.currentBalance(s), 100000);
  s.txs.push(mk('t1', 'expense', 20000, '2026-10-02', true, 'c'));
  assert.equal(Finance.currentBalance(s), 100000);
  assert.equal(Finance.accountBalance(s, s.accounts[0]), Finance.currentBalance(s));
  s.txs.push(mk('t2', 'expense', 20000, '2026-10-12', true, '', 'c'));
  assert.equal(Finance.currentBalance(s), 80000);
  assert.equal(Finance.cardStatus(s, s.cards[0], '2026-10-20').used, 0);
});

test('finanças: fechamento e vencimento da fatura', () => {
  const c = { id: 'c', name: 'C', limit: 100000, close: 5, due: 12 };
  assert.equal(Finance.invoiceYm(c, '2026-10-05'), ym(2026, 10));
  assert.equal(Finance.invoiceYm(c, '2026-10-06'), ym(2026, 11));
  assert.equal(Finance.invoiceDue(c, ym(2026, 10)), '2026-10-12');
  assert.equal(Finance.invoiceDue({ close: 25, due: 5 }, ym(2026, 10)), '2026-11-05');
  const s = withCard(100000);
  ['2026-10-02', '2026-11-02', '2026-12-02'].forEach((d, i) => s.txs.push(mk('p' + i, 'expense', 10000, d, true, 'c')));
  const cs = Finance.cardStatus(s, s.cards[0], '2026-10-03');
  assert.equal(cs.used, 30000);
  assert.equal(cs.available, 70000);
  assert.equal(cs.current.ym, ym(2026, 10));
  assert.equal(cs.current.open, 10000);
});

test('finanças: saldo previsto', () => {
  const s = withCard(100000);
  s.accounts[0].initial = 100000;
  s.txs.push(mk('a', 'expense', 30000, '2026-10-02', true, 'c'), mk('b', 'income', 5000, '2026-10-20', false), mk('n', 'expense', 99900, '2026-11-20', false));
  assert.equal(Finance.futureBalance(s, '2026-10-31', '2026-10-03'), 75000);
});

const rec = (o) => ({ id: 'r', kind: 'expense', desc: 'x', value: 1000, category: 'Lazer', accountId: 'main', cardId: '', day: 5, active: true, start: null, last: null, ...o });

test('finanças: recorrência com início no futuro não gera nada', () => {
  let s = newState({ recurring: [rec({ desc: 'Aluguel', category: 'Moradia', day: 10, start: '2026-12-10', last: ym(2026, 12) })] });
  assert.equal(Finance.generateRecurring(s, '2026-10-03')[1], 0);
  s = newState({ recurring: [{ ...s.recurring[0], last: null }] });
  assert.equal(Finance.generateRecurring(s, '2026-10-03')[1], 0);
});

test('finanças: recorrência recupera meses atrasados e ajusta o dia 31', () => {
  let s = newState({ recurring: [rec({ kind: 'income', desc: 'Salário', category: 'Salário', day: 31, start: '2026-06-30', last: ym(2026, 7) })] });
  let n;
  [s, n] = Finance.generateRecurring(s, '2026-10-03');
  assert.equal(n, 3);
  assert.deepEqual(s.txs.map(t => t.date), ['2026-08-31', '2026-09-30', '2026-10-31']);
  assert.equal(Finance.generateRecurring(s, '2026-10-20')[1], 0);
});

test('finanças: recorrência nunca antes do início', () => {
  const [s] = Finance.generateRecurring(newState({ recurring: [rec({ start: '2026-10-15' })] }), '2026-11-20');
  assert.equal(s.txs.length, 1);
  assert.equal(s.txs[0].date, '2026-11-05');
});

test('finanças: parcelas com a diferença na primeira', () => {
  assert.deepEqual(Finance.splitInstallments(10000, 3), [3334, 3333, 3333]);
});

test('finanças: plano da meta', () => {
  const p = Finance.goalPlan({ target: 120000, saved: 20000, deadline: '2027-03-31', monthly: 10000 }, '2026-10-03');
  assert.equal(p.remaining, 100000);
  assert.equal(p.needed, 16667);
  assert.equal(p.eta, ym(2027, 7));
  assert.equal(p.late, true);
  assert.equal(Finance.goalPlan({ target: 1000, saved: 1000, deadline: null, monthly: 0 }, '2026-10-03').done, true);
});

test('finanças: lembretes e próximo vencimento', () => {
  const s = withCard(100000);
  s.txs.push(mk('late', 'expense', 100, '2026-10-01', false), mk('soon', 'expense', 200, '2026-10-04', false),
    mk('far', 'expense', 300, '2026-10-20', false), mk('buy', 'expense', 400, '2026-10-01', true, 'c'));
  const r = Finance.reminders(s, '2026-10-10', 2);
  assert.deepEqual(r.map(x => x.type), ['BILL_OVERDUE', 'BILL_OVERDUE', 'INVOICE_DUE']);
  assert.equal(r[2].title, 'Fatura C');
  assert.equal(Finance.nextDue(s, '2026-10-02').refId, 'late');
});

test('finanças: CSV com BOM, ponto e vírgula e proteção contra fórmulas', () => {
  const s = newState({ cards: [{ id: 'c', name: 'Nu', limit: 1, close: 1, due: 2 }] });
  s.txs.push(tx({ id: 'a', kind: 'expense', value: 1050, date: '2026-10-01', desc: '=HYPERLINK("x")', category: 'Ca;sa "1"', paid: true, accountId: 'main', cardId: 'c' }));
  const csv = Csv.build(s);
  assert.ok(csv.startsWith('﻿data;tipo;categoria;descricao;valor;situacao;conta;cartao'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('"Ca;sa ""1"""'));
  assert.ok(csv.includes('"10,50"'));
  assert.ok(csv.endsWith('"Nu"'));
});

// ------------------------------------------------------------------ operações
const draft = (o = {}) => ({ kind: 'expense', desc: 'Mercado', value: '100', category: 'Alimentação', date: '2026-10-03', paid: true, accountId: 'main', cardId: '', reps: 1, repsMode: 'TOTAL', recurring: false, ...o });

test('operações: validações com mensagens', () => {
  const s = newState();
  assert.equal(fail(Ops.saveTx(s, null, draft({ desc: '   ' }))), 'Informe uma descrição.');
  assert.match(fail(Ops.saveTx(s, null, draft({ value: '0' }))), /maior que zero/);
  assert.match(fail(Ops.saveTx(s, null, draft({ cardId: 'nope' }))), /Cadastre um cartão/);
  assert.match(fail(Ops.saveTx(s, null, draft({ reps: 3, recurring: true }))), /parcelas ou repetição/);
  assert.equal(fail(Ops.saveAccount(s, null, '', '')), 'Informe o nome da conta.');
  assert.match(fail(Ops.saveTx(s, null, draft({ date: '20266-01-05' }))), /data válida/);
  assert.match(fail(Ops.saveTx(s, null, draft({ date: '2026-02-30' }))), /data válida/);
  assert.equal(s.txs.length, 0);
});

test('operações: parcelas ligadas e exclusão das seguintes', () => {
  const s = okState(Ops.saveTx(newState(), null, draft({ value: '1000', reps: 3 })));
  const [t0, t1, t2] = s.txs;
  assert.deepEqual([t0.value, t1.value, t2.value], [33334, 33333, 33333]);
  assert.deepEqual([t0.paid, t1.paid, t2.paid], [true, false, false]);
  assert.ok(t0.groupId && t0.groupId === t1.groupId && t1.groupId === t2.groupId);
  assert.equal(t1.desc, 'Mercado (2/3)');
  assert.equal(Ops.laterParcels(s, t0.id).length, 2);
  assert.equal(Ops.deleteTx(s, t0.id, true).txs.length, 0);
  assert.equal(Ops.deleteTx(s, t0.id, false).txs.length, 2);
  assert.equal(s.txs.length, 3); // o original não muda
});

test('operações: repetir mensalmente a partir de um lançamento', () => {
  const s = okState(Ops.saveTx(newState(), null, draft({ recurring: true, date: '2026-12-10' })));
  assert.equal(s.txs.length, 1);
  assert.equal(Finance.generateRecurring(s, '2026-10-03')[1], 0);
  assert.equal(Finance.generateRecurring(s, '2026-12-20')[1], 0);
  assert.equal(Finance.generateRecurring(s, '2027-01-20')[1], 1);
});

test('operações: compra parcelada no cartão e pagamento da fatura', () => {
  let s = okState(Ops.saveAccount(newState(), 'main', 'Conta', '1.000,00'));
  s = okState(Ops.saveCard(s, null, 'Nu', '500', '5', '12'));
  const c = s.cards[0].id;
  s = okState(Ops.saveTx(s, null, draft({ value: '300', reps: 3, cardId: c })));
  for (const t of s.txs) { assert.equal(t.paid, true); assert.equal(t.cardId, c); }
  assert.equal(Finance.currentBalance(s), 100000);
  assert.equal(Finance.cardStatus(s, s.cards[0], '2026-10-03').available, 20000);
  s = okState(Ops.payInvoice(s, c, '100', 'main', '2026-10-12'));
  assert.equal(s.txs.at(-1).category, CARD_PAYMENT_CAT);
  assert.equal(Finance.currentBalance(s), 90000);
  assert.match(fail(Ops.deleteCard(s, c)), /compras ou pagamentos/);
});

test('operações: metas', () => {
  let s = okState(Ops.saveGoal(newState(), null, 'Carro', '1500,50', '', null, '100'));
  const id = s.goals[0].id;
  assert.equal(s.goals[0].target, 150050);
  s = okState(Ops.saveGoal(s, id, 'Carro novo', '1500,50', '200,25', null, '100'));
  assert.equal(s.goals[0].saved, 20025);
  assert.equal(s.goals[0].name, 'Carro novo');
  s = okState(Ops.saveGoal(s, id, 'Carro novo', '1500,50', '-999999', null, ''));
  assert.equal(s.goals[0].saved, 0);
});

test('operações: renomear categoria leva lançamentos, recorrências e limites', () => {
  let s = okState(Ops.saveTx(newState(), null, draft({ recurring: true })));
  s = okState(Ops.saveLimit(s, null, 'Alimentação', '300'));
  s = okState(Ops.renameCategory(s, 'expense', 'Alimentação', 'Comida'));
  assert.equal(s.txs[0].category, 'Comida');
  assert.equal(s.recurring[0].category, 'Comida');
  assert.equal(s.limits.size, 1);
  assert.equal(s.limits.get('Comida'), 30000);
  assert.match(fail(Ops.addCategory(s, 'expense', 'comida')), /já existe/);
  assert.match(fail(Ops.checkDeleteCategory(s, 'expense', 'Comida')), /recorrência/);
});

test('operações: conta em uso e conta única', () => {
  let s = okState(Ops.saveAccount(newState(), null, 'Banco 2', ''));
  const b2 = s.accounts[1].id;
  s = okState(Ops.saveRecurring(s, null, 'expense', 'Curso', '250', '10', 'Educação', b2, '', true, '2026-12-01', '2026-10-03'));
  assert.match(fail(Ops.deleteAccount(s, b2)), /recorrências/);
  assert.match(fail(Ops.deleteAccount(newState(), 'main')), /pelo menos uma/);
});

test('estado: clone não compartilha listas', () => {
  const a = newState(); a.limits.set('X', 1);
  const b = clone(a); b.txs.push(mk('z', 'expense', 1, '2026-10-01', true)); b.limits.set('Y', 2);
  assert.equal(a.txs.length, 0); assert.equal(a.limits.size, 1);
  assert.equal(ymOf('2026-10-01'), ym(2026, 10));
});
