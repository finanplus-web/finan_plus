// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do modo remoto (Finan+ web aberto pelo celular): lê e grava no celular com versão,
// conflito vira ConflictError, token perdido avisa, e nada é gravado no navegador.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RemoteStore, setToken, getToken, applyPalette } from '../js/remote.js';
import { ConflictError } from '../js/store.js';
import { newState, tx, toJson } from '../js/core.js';

class MemStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } get size() { return this.m.size; } }
beforeEach(() => { globalThis.sessionStorage = new MemStorage(); globalThis.localStorage = new MemStorage(); });

/** "celular" de mentira: guarda o estado e a versão, como o LanServer */
function fakePhone(initial = newState()) {
  const phone = { data: JSON.parse(toJson(initial)), rev: 1, theme: 'abc', calls: [], palette: { id: 'tokyo' } };
  phone.fetch = async (path, o) => {
    phone.calls.push([o.method, path, o.headers.Authorization]);
    const body = o.body ? JSON.parse(o.body) : null;
    const res = (status, j) => ({ ok: status < 400, status, json: async () => j });
    if (o.headers.Authorization !== 'Bearer tok') return res(401, { title: 'Não pareado', message: 'código' });
    if (path === '/api/remote/state' && o.method === 'GET') return res(200, { rev: phone.rev, palette: phone.palette, data: phone.data });
    if (path === '/api/remote/state' && o.method === 'PUT') {
      if (body.rev !== phone.rev) return res(409, { conflict: true, rev: phone.rev });
      phone.data = body.data; phone.rev++;
      return res(200, { ok: true, rev: phone.rev });
    }
    if (path === '/api/rev') return res(200, { rev: phone.rev + '-' + phone.theme, data: phone.rev });
    return res(404, {});
  };
  return phone;
}

const sample = () => newState({ txs: [tx({ id: 'a', kind: 'expense', value: 1234, date: '2026-10-01', desc: 'Mercado', category: 'Alimentação', paid: true })] });

test('remoto: abre os dados do celular', async () => {
  setToken('tok');
  const phone = fakePhone(sample());
  const st = new RemoteStore(phone.fetch);
  const r = await st.open();
  assert.equal(r.status, 'ok');
  assert.equal(r.state.txs[0].desc, 'Mercado');
  assert.equal(st.rev, 1);
  assert.deepEqual(st.palette, { id: 'tokyo' });
  assert.equal(st.encrypted, true);
});

test('remoto: grava no celular com a versão lida e atualiza a versão', async () => {
  setToken('tok');
  const phone = fakePhone(sample());
  const st = new RemoteStore(phone.fetch);
  const { state } = await st.open();
  await st.save({ ...state, privacy: true });
  assert.equal(phone.data.privacy, true);
  assert.equal(st.rev, 2);
  assert.equal(await st.changed(), false); // a própria gravação não conta como mudança no celular
});

test('remoto: celular mudou no meio-tempo → ConflictError e nada é gravado', async () => {
  setToken('tok');
  const phone = fakePhone(sample());
  const st = new RemoteStore(phone.fetch);
  const { state } = await st.open();
  phone.rev = 7; phone.data = { ...phone.data, privacy: true }; // alteração feita no celular
  assert.equal(await st.changed(), true);
  await assert.rejects(st.save({ ...state, txs: [] }), ConflictError);
  assert.equal(phone.data.txs.length, 1);
  const fresh = await st.reload();
  assert.equal(fresh.privacy, true);
  await st.save({ ...fresh, privacy: false }); // depois de recarregar, grava normalmente
  assert.equal(phone.data.privacy, false);
});

test('remoto: troca de cores no celular (Material You) também conta como mudança', async () => {
  setToken('tok');
  const phone = fakePhone();
  const st = new RemoteStore(phone.fetch);
  await st.open();
  assert.equal(await st.changed(), false);
  phone.theme = 'def';
  assert.equal(await st.changed(), true);
});

test('remoto: token perdido avisa o app', async () => {
  setToken('velho');
  const phone = fakePhone();
  const st = new RemoteStore(phone.fetch);
  let called = 0;
  st.onUnauthorized = () => { called++; };
  await assert.rejects(st.open(), e => e.status === 401);
  assert.equal(called, 1);
});

test('remoto: nada é gravado no navegador (só o token, na sessão)', async () => {
  setToken('tok');
  const phone = fakePhone(sample());
  const st = new RemoteStore(phone.fetch);
  const { state } = await st.open();
  await st.save(state);
  assert.equal(globalThis.localStorage.size, 0);
  assert.equal(globalThis.sessionStorage.size, 1);
  assert.equal(getToken(), 'tok');
  await st.logout();
  assert.equal(getToken(), null);
});

test('remoto: cores do celular no Material You', () => {
  const props = new Map();
  const root = { style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) } };
  const pal = { light: { dark: false, bg: 'rgba(1,2,3,1.000)', surface: 'rgba(4,5,6,0.800)', accent: 'rgba(7,8,9,1.000)' }, dark: { dark: true, bg: 'rgba(9,9,9,1.000)', surface: 'rgba(8,8,8,1.000)' } };
  assert.equal(applyPalette(root, pal, false), 'materialBlue');
  assert.equal(props.get('--accent'), 'rgba(7,8,9,1.000)');
  assert.equal(props.get('--solid'), 'rgba(4,5,6,1)');
  assert.equal(applyPalette(root, pal, true), 'oledGray');
  assert.equal(props.get('--bg'), 'rgba(9,9,9,1.000)');
  assert.equal(applyPalette(root, null, true), null);
  assert.equal(props.size, 0);
});

test('remoto: resposta fora do formato é recusada sem alterar nada', async () => {
  setToken('tok');
  const bad = async () => ({ ok: true, status: 200, json: async () => ({ rev: '7', data: [] }) });
  const st = new RemoteStore(bad);
  await assert.rejects(st.open(), e => e.status === 502);
  assert.equal(st.rev, undefined);
});
