// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Despesas compartilhadas (Android 1.8.0): divisão, quem deve, pagamentos parciais, histórico e backup.
// Mesmos casos de SharedTest.kt do app Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newState, clone, parseBackup, toJson, plusMonths } from '../js/core.js';
import { Shared } from '../js/shared.js';

const day = '2026-11-02';
const ok = r => { assert.equal(r.ok, true, r.message); return r.state; };
const msg = r => { assert.equal(r.ok, false, 'esperava erro'); return r.message; };
const people = (...n) => n.map(name => ({ id: '', name }));
const draft = (name, total, date, split, ppl, payerIndex, extra = {}) => ({ name, total, date, split, people: ppl, payerIndex, ...extra });
const mercadoIgual = () => ok(Shared.save(newState(), null, draft('Mercado', '450', day, 'equal', people('João', 'Maria', 'Pedro'), 0)));

test('compartilhada: divisão igual, cada um deve a sua parte a quem pagou', () => {
  const e = mercadoIgual().shared[0];
  assert.deepEqual(e.people.map(p => p.share), [15000, 15000, 15000]);
  const st = Shared.summary(e);
  assert.equal(Shared.payer(e).name, 'João');
  assert.equal(st.people[0].state, 'NONE');
  assert.deepEqual(st.people.map(p => p.owed), [0, 15000, 15000]);
  assert.equal(st.toReceive, 30000); assert.equal(st.received, 0); assert.equal(st.pending, 30000);
  assert.equal(st.state, 'OPEN');
});

test('compartilhada: divisão igual com centavos que sobram', () => {
  assert.deepEqual(Shared.equalShares(10000, 3), [3334, 3333, 3333]);
});

test('compartilhada: divisão personalizada precisa fechar com o total', () => {
  const rows = [{ id: '', name: 'João', share: '150' }, { id: '', name: 'Maria', share: '120' }, { id: '', name: 'Pedro', share: '180' }];
  const s = ok(Shared.save(newState(), null, draft('Mercado', '450,00', day, 'custom', rows, 0)));
  const st = Shared.summary(s.shared[0]);
  assert.deepEqual(st.people.map(p => p.owed), [0, 12000, 18000]);
  assert.equal(st.pending, 30000);
  const wrong = rows.map((r, i) => i === 2 ? { ...r, share: '100' } : r);
  const r = Shared.save(newState(), null, draft('Mercado', '450', day, 'custom', wrong, 0));
  assert.ok(msg(r).includes('Faltam R$ 80,00'));
  assert.equal(r.title, 'Divisão não fecha');
  assert.ok(msg(Shared.save(newState(), null, draft('Mercado', '450', day, 'custom', rows.map((x, i) => i === 2 ? { ...x, share: '200' } : x), 0))).includes('Passou R$ 20,00'));
});

test('compartilhada: pagamentos parciais e totais', () => {
  let s = mercadoIgual();
  const e = s.shared[0], maria = e.people[1].id, pedro = e.people[2].id;
  s = ok(Shared.addPayment(s, e.id, maria, '50', day));
  let st = Shared.summary(s.shared[0]);
  assert.equal(st.people[1].state, 'PARTIAL'); assert.equal(st.people[1].remaining, 10000);
  assert.equal(st.state, 'PARTIAL');
  // acima do que falta: recusado
  assert.ok(msg(Shared.addPayment(s, e.id, maria, '100,01', day)).includes('R$ 100,00'));
  // quem pagou não devolve
  assert.equal(Shared.addPayment(s, e.id, e.payerId, '10', day).ok, false);
  s = ok(Shared.settle(s, e.id, maria, day));
  s = ok(Shared.settle(s, e.id, pedro, day));
  st = Shared.summary(s.shared[0]);
  assert.equal(st.received, 30000); assert.equal(st.pending, 0); assert.equal(st.state, 'SETTLED');
  assert.equal(Shared.settle(s, e.id, pedro, day).ok, false);
  // excluir um pagamento volta a dever
  const first = s.shared[0].payments[0];
  s = Shared.deletePayment(s, e.id, first.id);
  assert.equal(Shared.summary(s.shared[0]).pending, 5000);
});

test('compartilhada: editar não deixa pagamentos soltos', () => {
  let s = mercadoIgual();
  const e = s.shared[0];
  s = ok(Shared.addPayment(s, e.id, e.people[1].id, '150', day));
  const rows = e.people.map(p => ({ id: p.id, name: p.name }));
  // tirar a Maria (que já pagou): recusado
  assert.ok(msg(Shared.save(s, e.id, draft('Mercado', '450', day, 'equal', rows.filter(r => r.name !== 'Maria'), 0))).includes('Maria'));
  // diminuir o total abaixo do que ela já devolveu: recusado
  assert.equal(Shared.save(s, e.id, draft('Mercado', '300', day, 'equal', rows, 0)).ok, false);
  // mais uma pessoa: as partes caem para 112,50 e a Maria passaria do devido
  assert.equal(Shared.save(s, e.id, draft('Mercado', '450', day, 'equal', [...rows, { id: '', name: 'Ana' }], 0)).ok, false);
  // Maria não pode virar quem pagou
  assert.ok(msg(Shared.save(s, e.id, draft('Mercado', '450', day, 'equal', rows, 1))).includes('não pode ser quem pagou'));
  // mudar o nome mantém os ids e os pagamentos
  const ren = rows.map(r => r.name === 'Pedro' ? { ...r, name: 'Pedro H.' } : r);
  s = ok(Shared.save(s, e.id, draft('Mercado do mês', '450', day, 'equal', ren, 0)));
  const e2 = s.shared[0];
  assert.deepEqual(e2.people.map(p => p.id), e.people.map(p => p.id));
  assert.equal(e2.payments.length, 1); assert.equal(e2.name, 'Mercado do mês');
});

test('compartilhada: validações do formulário', () => {
  const save = d => Shared.save(newState(), null, d);
  assert.equal(save(draft('', '10', day, 'equal', people('A', 'B'), 0)).ok, false);
  assert.equal(save(draft('X', '0', day, 'equal', people('A', 'B'), 0)).ok, false);
  assert.equal(save(draft('X', '10', null, 'equal', people('A', 'B'), 0)).ok, false);
  assert.equal(save(draft('X', '10', day, 'equal', people('A'), 0)).ok, false);
  assert.ok(msg(save(draft('X', '10', day, 'equal', people('Ana', 'ana'), 0))).includes('aparece duas vezes'));
  assert.equal(save(draft('X', '10', day, 'equal', people('A', ' '), 0)).ok, false);
  assert.equal(save(draft('X', '10', day, 'equal', people('A', 'B'), 5)).title, 'Quem pagou');
  assert.equal(Shared.save(newState(), 'nao-existe', draft('X', '10', day, 'equal', people('A', 'B'), 0)).message, 'Despesa não encontrada.');
});

test('compartilhada: histórico com busca, período, pessoa e situação', () => {
  let s = mercadoIgual();
  s = ok(Shared.save(s, null, draft('Pizza', '90', plusMonths(day, -1), 'equal', people('Eu', 'Ana', 'Pedro'), 0, { note: 'aniversário' })));
  const pizza = s.shared.find(e => e.name === 'Pizza');
  s = ok(Shared.settle(s, pizza.id, pizza.people[1].id, day));
  s = ok(Shared.settle(s, pizza.id, pizza.people[2].id, day));
  const all = s.shared;
  const names = f => Shared.filter(all, f).map(e => e.name);
  assert.deepEqual(names({}), ['Mercado', 'Pizza']);
  assert.deepEqual(names({ query: 'aniversario' }), ['Pizza']);
  assert.deepEqual(names({ person: 'ana' }), ['Pizza']);
  assert.deepEqual(names({ person: 'Pedro' }), ['Mercado', 'Pizza']);
  assert.deepEqual(names({ from: '2026-11-01' }), ['Mercado']);
  assert.deepEqual(names({ state: 'SETTLED' }), ['Pizza']);
  assert.deepEqual(Shared.peopleNames(all), ['Ana', 'Eu', 'João', 'Maria', 'Pedro']);
  assert.deepEqual(Shared.totals(all), [30000, 6000]);
});

test('compartilhada: backup leva e volta com pagamentos e comprovante', () => {
  let s = mercadoIgual();
  const e = s.shared[0];
  s = ok(Shared.addPayment(s, e.id, e.people[2].id, '20,50', day));
  s = Shared.setReceipt(s, e.id, 'rcpt123', 'image/jpeg');
  const j = toJson(s);
  const back = parseBackup(j);
  assert.equal(back.droppedTotal, 0);
  assert.deepEqual(back.state.shared, s.shared);
  assert.equal(toJson(back.state), j);
  assert.ok(j.includes('"receipt":"rcpt123","receiptType":"image/jpeg"'));
  // sem despesas, o campo nem aparece (o arquivo continua igual ao das versões anteriores)
  assert.ok(!toJson(newState()).includes('"shared"'));
  // gravação pelo acesso pela rede: vai sempre, mesmo vazio
  assert.ok(toJson(newState(), undefined, { alwaysShared: true }).includes('"shared":[]'));
  // clone não compartilha as listas
  const c = clone(s);
  c.shared[0].payments.push({ id: 'x', personId: 'y', value: 1, date: day });
  assert.equal(s.shared[0].payments.length, 1);
});

test('compartilhada: backup descarta despesa que não fecha e pagamento acima da parte', () => {
  const json = '{"txs":[],"shared":[{"id":"a","name":"X","total":10,"date":"2026-11-02","payer":"p1","people":[{"id":"p1","name":"A","share":5},{"id":"p2","name":"B","share":4}]}]}';
  const n = parseBackup(json);
  assert.equal(n.state.shared.length, 0); assert.equal(n.dropped.shared, 1); assert.equal(n.droppedTotal, 1);
  const json2 = '{"txs":[],"shared":[{"id":"a","name":"X","total":10,"date":"2026-11-02","payer":"p1","people":[{"id":"p1","name":"A","share":5},{"id":"p2","name":"B","share":5}],"payments":[{"id":"x","person":"p2","value":6,"date":"2026-11-02"},{"id":"y","person":"p1","value":1,"date":"2026-11-02"}]}]}';
  assert.equal(parseBackup(json2).state.shared[0].payments.length, 0);
  // pagador que não é participante: descartada; sem comprovante válido, sem tipo
  const json3 = '{"txs":[],"shared":[{"id":"a","name":"X","total":10,"date":"2026-11-02","payer":"zz","people":[{"id":"p1","name":"A","share":5},{"id":"p2","name":"B","share":5}]},' +
    '{"id":"b","name":"Y","total":10,"date":"2026-11-02","payer":"p1","split":"custom","receipt":"a b","receiptType":"image/png","people":[{"id":"p1","name":"A","share":5},{"id":"p2","name":"B","share":5}]}]}';
  const n3 = parseBackup(json3);
  assert.equal(n3.dropped.shared, 1);
  assert.equal(n3.state.shared[0].split, 'custom'); assert.equal(n3.state.shared[0].receipt, ''); assert.equal(n3.state.shared[0].receiptType, '');
  // limite de quantidade num backup de fora
  const many = { txs: [], shared: Array.from({ length: 1001 }, () => ({})) };
  assert.throws(() => parseBackup(JSON.stringify(many)), /Muitas despesas compartilhadas no backup/);
});

test('compartilhada: nome do PDF e da imagem', () => {
  const e = { ...mercadoIgual().shared[0], name: 'Mercado do Mês!' };
  assert.equal(Shared.pdfName(e), 'comprovante-mercado-do-mes-2026-11-02.pdf');
  assert.equal(Shared.imageName(e), 'finanplus-mercado-do-mes-2026-11-02.png');
  assert.equal(Shared.pdfName({ ...e, name: '!!!' }), 'comprovante-despesa-2026-11-02.pdf');
});
