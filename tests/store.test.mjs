// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do armazenamento: criptografia, migração do Finan+ web antigo, tela de problema, PIN e espera.
// Usa fake-indexeddb (só para testes) e um localStorage em memória.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { Store, ConflictError, hashPin, verifyPin, Throttle, pinValidFormat, loadDevice, saveDevice, DB_NAME } from '../js/store.js';
import { newState, tx, Ops } from '../js/core.js';

class MemStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); globalThis.localStorage = new MemStorage(); });

const sample = () => newState({ txs: [tx({ id: 'a', kind: 'expense', value: 1234, date: '2026-10-01', desc: 'Café segredo', category: 'Alimentação', paid: true })] });

async function rawData() {
  return new Promise((res) => {
    const r = indexedDB.open(DB_NAME);
    r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('data'); g.onsuccess = () => { res(g.result); r.result.close(); }; };
  });
}

test('armazenamento: grava cifrado e lê de volta', async () => {
  const a = new Store();
  assert.equal((await a.open()).status, 'new');
  await a.save(sample());
  const box = await rawData();
  assert.ok(box.ct instanceof Uint8Array && box.iv.length === 12);
  assert.ok(!Buffer.from(box.ct).toString('latin1').includes('segredo'));
  const b = new Store();
  const r = await b.open();
  assert.equal(r.status, 'ok');
  assert.equal(r.state.txs[0].desc, 'Café segredo');
  assert.equal(b.encrypted, true);
});

test('armazenamento: migra mf_v2 do Finan+ web antigo e apaga o texto aberto só depois', async () => {
  localStorage.setItem('mf_v2', JSON.stringify({ txs: [{ id: 1, kind: 'income', value: 50, date: '2026-09-05', desc: 'Sal', category: 'Salário', paid: true }], pin: 'abc123', theme: 'nord', backupVersion: 4 }));
  const s = new Store();
  const r = await s.open();
  assert.equal(r.status, 'ok');
  assert.equal(r.migrated, 'mf_v2');
  assert.equal(r.legacyPin, 'abc123');
  assert.equal(r.state.txs[0].value, 5000);
  assert.equal(r.state.theme, 'nord');
  assert.equal(localStorage.getItem('mf_v2'), null);
  assert.equal((await new Store().open()).state.txs.length, 1);
});

test('armazenamento: chave errada mostra problema e não grava nada', async () => {
  const a = new Store(); await a.open(); await a.save(sample());
  // troca a chave por outra (simula chave perdida)
  const other = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await new Promise(res => { const r = indexedDB.open(DB_NAME); r.onsuccess = () => { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put(other, 'key'); t.oncomplete = () => { r.result.close(); res(); }; }; });
  const b = new Store();
  const r = await b.open();
  assert.equal(r.status, 'problem');
  await assert.rejects(b.save(newState()), /nada foi gravado/);
  const before = await rawData();
  assert.ok(before);
  assert.ok((await b.unreadableExport()).includes('AES-GCM-256'));
  await b.startOver();
  await b.save(newState());
  assert.equal((await new Store().open()).state.txs.length, 0);
});

test('armazenamento: versão anterior é usada se a atual estiver corrompida', async () => {
  const a = new Store(); await a.open();
  await a.save(sample());
  const s2 = Ops.deleteTx(sample(), 'a', false);
  await a.save(s2);
  await new Promise(res => { const r = indexedDB.open(DB_NAME); r.onsuccess = () => { const db = r.result; const g = db.transaction('kv').objectStore('kv').get('data'); g.onsuccess = () => { const box = g.result; box.ct[0] ^= 1; const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(box, 'data'); t.oncomplete = () => { db.close(); res(); }; }; }; });
  const r = await new Store().open();
  assert.equal(r.status, 'ok');
  assert.equal(r.state.txs.length, 1); // voltou para a versão anterior
});

test('armazenamento: duas abas não gravam uma por cima da outra', async () => {
  const a = new Store(), b = new Store();
  await a.open(); await b.open();
  await a.save(sample());
  await assert.rejects(b.save(newState()), ConflictError);
  const st = await b.reload();
  assert.equal(st.txs.length, 1);
  await b.save(Ops.deleteTx(st, 'a', false));
  await assert.rejects(a.save(sample()), ConflictError);
  assert.equal((await new Store().open()).state.txs.length, 0);
});

test('armazenamento: duas abas abrindo juntas usam a mesma chave', async () => {
  const [a, b] = [new Store(), new Store()];
  await Promise.all([a.open(), b.open()]);
  await a.save(sample());
  assert.equal((await b.reload()).txs.length, 1);
});

test('armazenamento: apagar tudo', async () => {
  const a = new Store(); await a.open(); await a.save(sample());
  await a.wipe();
  assert.equal((await new Store().open()).status, 'new');
});

test('PIN: formato, hash com sal, PIN antigo e espera crescente', async () => {
  assert.ok(pinValidFormat('1234') && pinValidFormat('12345678'));
  assert.ok(!pinValidFormat('123') && !pinValidFormat('123456789') && !pinValidFormat('12a4'));
  const h1 = await hashPin('2580'), h2 = await hashPin('2580');
  assert.notEqual(h1, h2);
  assert.deepEqual(await verifyPin('2580', h1), { ok: true, upgrade: false });
  assert.equal((await verifyPin('2581', h1)).ok, false);
  const legacy = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mf1234'))).toString('hex');
  assert.deepEqual(await verifyPin('1234', legacy), { ok: true, upgrade: true });
  assert.equal((await verifyPin('4321', legacy)).ok, false);
  assert.deepEqual(await verifyPin('1234', 'p1234'), { ok: true, upgrade: true });
  let d = { pinFails: 0, pinWaitUntil: 0 };
  for (let i = 0; i < 4; i++) d = Throttle.fail(d, 1000);
  assert.equal(Throttle.waitSeconds(d, 1000), 0);
  d = Throttle.fail(d, 1000);
  assert.equal(Throttle.waitSeconds(d, 1000), 30);
  d = Throttle.fail(d, 1000);
  assert.equal(Throttle.waitSeconds(d, 1000), 60);
  assert.equal(Throttle.waitSeconds(Throttle.reset(d), 1000), 0);
});

test('aparelho: configurações à parte dos dados', () => {
  assert.equal(loadDevice().assistTips, true);
  saveDevice({ ...loadDevice(), notifications: true, dismissedTips: ['x', 3] });
  const d = loadDevice();
  assert.equal(d.notifications, true);
  assert.deepEqual(d.dismissedTips, ['x']);
});
