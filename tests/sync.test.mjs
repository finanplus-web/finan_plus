// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes da sincronização: ativação, dois aparelhos/pessoas, conflitos, exclusões, compactação e
// modo sem conexão. O "serviço" é um FakeCloud em memória com o mesmo contrato do Apps Script.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { Sync, stateRecords, applyRecord, sanitize, settingsOf } from '../js/sync.js';
import { CloudError } from '../js/cloud.js';
import { newCode, keyFromCode, unseal } from '../js/e2e.js';
import { newState, tx, Ops } from '../js/core.js';

class MemStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
beforeEach(() => { globalThis.indexedDB = new IDBFactory(); globalThis.localStorage = new MemStorage(); });

const EMAILS = { tok: 'a@x.com', tokb: 'b@x.com' };
const sample = () => newState({ txs: [tx({ id: 'a', kind: 'expense', value: 1234, date: '2026-10-01', desc: 'Mercado', category: 'Alimentação', paid: true })] });

/** Serviço de mentira com o mesmo contrato do Code.gs (pull/push com versões, diário e lápides). */
class FakeCloud {
  constructor() {
    this.records = new Map(); this.log = []; this.firstSeq = 1; this.lastSeq = 0;
    this.admin = ''; this.members = []; this.offline = false; this.tsOverride = 0;
  }
  ts() { return this.tsOverride || Date.now() + 50; }
  membersList() { return [{ email: this.admin, admin: true }, ...this.members.map(e => ({ email: e, admin: false }))]; }
  async call(action, params = {}, token = null) {
    if (this.offline) throw new CloudError('offline', 'Sem conexão com a nuvem.');
    const email = EMAILS[token] || '';
    if (!email) throw new CloudError('auth_invalid', 'Sessão inválida.');
    if (action === 'hello') {
      if (!this.admin) this.admin = email;
      if (email !== this.admin && !this.members.includes(email)) throw new CloudError('not_member', 'não autorizada');
      return { ok: true, email, name: email, isAdmin: email === this.admin, claimed: false, stats: params.stats === true ? { records: [...this.records.values()].filter(r => !r.del).length } : null };
    }
    if (email !== this.admin && !this.members.includes(email)) throw new CloudError('not_member', 'não autorizada');
    if (action === 'members') return { ok: true, members: this.membersList() };
    if (action === 'member-add') { if (email !== this.admin) throw new CloudError('admin_only', 'só admin'); this.members.push(String(params.email).toLowerCase()); return { ok: true, members: this.membersList() }; }
    if (action === 'member-remove') { if (email !== this.admin) throw new CloudError('admin_only', 'só admin'); this.members = this.members.filter(e => e !== params.email); return { ok: true, members: this.membersList() }; }
    if (action === 'pull') {
      const since = Number(params.since) || 0;
      const recOut = r => ({ col: r.col, id: r.id, ts: r.ts, updater: r.updater, deleted: r.del, blob: r.blob });
      const snapshot = () => ({ ok: true, full: true, records: [...this.records.values()].map(recOut), firstSeq: this.firstSeq, lastSeq: this.lastSeq, hasMore: false, serverTime: this.ts() });
      if (params.full === true || since + 1 < this.firstSeq) return snapshot();
      if (since >= this.lastSeq) return { ok: true, full: false, events: [], firstSeq: this.firstSeq, lastSeq: since, hasMore: false, serverTime: this.ts() };
      const start = since + 1 - this.firstSeq;
      if (start < 0 || start >= this.log.length) return snapshot();
      const slice = this.log.slice(start, start + 3000);
      const events = slice.filter(e => e.updater !== params.exclude).map(e => ({ seq: e.seq, ts: e.ts, col: e.col, id: e.id, updater: e.updater, deleted: e.del, blob: e.blob }));
      const lastRead = slice[slice.length - 1].seq;
      return { ok: true, full: false, events, firstSeq: this.firstSeq, lastSeq: lastRead, hasMore: lastRead < this.lastSeq, serverTime: this.ts() };
    }
    if (action === 'push') {
      const now = this.ts();
      const applied = [], conflicts = [];
      for (const c of params.changes || []) {
        const k = c.col + '\u0000' + c.id;
        const cur = this.records.get(k);
        if (cur && Number(cur.ts) > Number(c.baseTs || 0)) { conflicts.push({ ...cur }); continue; }
        this.lastSeq++;
        const rec = { col: c.col, id: c.id, ts: now, updater: String(params.updater || ''), del: c.deleted === true, blob: c.deleted === true ? '' : String(c.blob || '') };
        this.records.set(k, rec);
        this.log.push({ seq: this.lastSeq, ts: now, col: rec.col, id: rec.id, updater: rec.updater, del: rec.del, blob: rec.blob });
        applied.push({ col: rec.col, id: rec.id, seq: this.lastSeq, ts: now });
      }
      if (this.log.length > 4000) { this.log = []; this.firstSeq = this.lastSeq + 1; }
      return { ok: true, applied, conflicts, firstSeq: this.firstSeq, lastSeq: this.lastSeq, serverTime: now };
    }
    if (action === 'wipe') {
      if (email !== this.admin || params.confirm !== 'APAGAR') throw new CloudError('admin_only', 'só admin');
      this.records.clear(); this.log = [];
      this.lastSeq++; this.firstSeq = this.lastSeq; // marca d'água: quem estava em dia percebe que a nuvem foi apagada
      return { ok: true, lastSeq: this.lastSeq, serverTime: this.ts() };
    }
    throw new CloudError('bad_request', action);
  }
  /** valor em claro de um registro (para conferir nos testes) */
  async plain(key, code) {
    const rec = this.records.get(key);
    if (!rec || rec.del) return null;
    return unseal(await keyFromCode(code), rec.col, rec.id, rec.blob);
  }
}

function makeApp(state) { return { state, notices: [], applies: 0 }; }
function makeSync(app, cloud, credential) {
  const email = EMAILS[credential];
  const google = { requestToken: async () => ({ credential, email, name: email, exp: Math.floor(Date.now() / 1000) + 3600 }) };
  return new Sync({
    cloud, google, clientId: 'dev',
    getState: () => app.state,
    apply: s => { app.state = s; app.applies++; },
    notify: (t, m) => app.notices.push([t, m]),
  });
}
const edit = (state, desc) => Ops.saveTx(state, 'a', { kind: 'expense', desc, value: '12,34', date: '2026-10-01', paid: true, accountId: 'main', cardId: '' }).state;

/** dois aparelhos ligados à mesma nuvem, com dados em comum */
async function pair(seed = sample()) {
  const cloud = new FakeCloud();
  const appA = makeApp(seed);
  const a = makeSync(appA, cloud, 'tok'); a.deviceId = 'ap-a';
  await a.init(); await a.signIn({ interactive: true });
  const code = newCode();
  assert.equal((await a.activate({ mode: 'create', code })).ok, true);
  const appB = makeApp(newState());
  const b = makeSync(appB, cloud, 'tokb'); b.deviceId = 'ap-b';
  await b.init(); await b.signIn({ interactive: true });
  await a.memberAdd('b@x.com');
  assert.equal((await b.activate({ mode: 'join', code })).ok, true);
  assert.equal(appB.state.txs.length, 1);
  return { cloud, appA, a, appB, b, code };
}

// ------------------------------------------------------------------ ativação
test('nuvem: o primeiro aparelho envia tudo (cifrado) e o segundo entra com o código', async () => {
  const cloud = new FakeCloud();
  const appA = makeApp(sample());
  const a = makeSync(appA, cloud, 'tok'); a.deviceId = 'ap-a';
  await a.init();
  assert.equal(a.phase, 'signedOut');
  assert.equal((await a.signIn({ interactive: true })).ok, true);
  assert.equal(a.phase, 'needKey');
  const code = newCode();
  const r = await a.activate({ mode: 'create', code });
  assert.equal(r.ok, true);
  assert.equal(a.phase, 'ready');
  assert.equal(a.dirty.size, 0);
  // nada em claro na nuvem: o conteúdo é um bloco cifrado
  const rec = cloud.records.get('txs\u0000a');
  assert.ok(rec.blob && !rec.blob.includes('Mercado'));
  assert.equal((await cloud.plain('txs\u0000a', code)).desc, 'Mercado');
  assert.deepEqual((await cloud.plain('settings\u0000settings', code)).cats.expense, newState().cats.expense);

  // aparelho B (outra pessoa), vazio, entra com o mesmo código
  const appB = makeApp(newState());
  const b = makeSync(appB, cloud, 'tokb'); b.deviceId = 'ap-b';
  await a.memberAdd('b@x.com');
  await b.init(); await b.signIn({ interactive: true });
  const r2 = await b.activate({ mode: 'join', code });
  assert.equal(r2.ok, true);
  assert.equal(appB.state.txs[0].desc, 'Mercado');
  assert.equal(b.dirty.size, 0);
});

test('nuvem: entrar com código errado não mexe em nada', async () => {
  const cloud = new FakeCloud();
  const appA = makeApp(sample());
  const a = makeSync(appA, cloud, 'tok');
  await a.init(); await a.signIn({ interactive: true }); await a.activate({ mode: 'create', code: newCode() });

  const appB = makeApp(newState());
  const b = makeSync(appB, cloud, 'tokb'); b.deviceId = 'ap-b';
  await a.memberAdd('b@x.com');
  await b.init(); await b.signIn({ interactive: true });
  const r = await b.activate({ mode: 'join', code: newCode() });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'code_mismatch');
  assert.equal(appB.state.txs.length, 0);   // nada foi aplicado
  assert.equal(b.dirty.size, 0);            // e nada será enviado
  assert.equal(cloud.records.size, 3);      // a nuvem continua como estava
});

test('nuvem: quem não foi autorizado não entra', async () => {
  const cloud = new FakeCloud();
  const appA = makeApp(sample());
  const a = makeSync(appA, cloud, 'tok');
  await a.init(); await a.signIn({ interactive: true }); await a.activate({ mode: 'create', code: newCode() });
  const appB = makeApp(newState());
  const b = makeSync(appB, cloud, 'tokb');
  await b.init();
  const r = await b.signIn({ interactive: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'not_member');
});

// ------------------------------------------------------------------ dia a dia
test('nuvem: a alteração de uma pessoa chega à outra', async () => {
  const { appA, a, appB, b } = await pair();
  appA.state = Ops.togglePaid(appA.state, 'a'); a.noteSave(appA.state);
  await a.syncNow();
  assert.equal(a.dirty.size, 0);
  await b.syncNow();
  assert.equal(appB.state.txs[0].paid, false);
  assert.equal(appB.notices.length, 0);
});

test('nuvem: mudanças em registros diferentes não se atropelam', async () => {
  const { appA, a, appB, b } = await pair();
  // A mexe no lançamento; B cria outro ao mesmo tempo
  appA.state = Ops.togglePaid(appA.state, 'a'); a.noteSave(appA.state);
  appB.state = Ops.saveTx(appB.state, null, { kind: 'income', desc: 'Freela', value: '500,00', date: '2026-10-02', paid: true, accountId: 'main' }).state;
  b.noteSave(appB.state);
  await Promise.all([a.syncNow(), b.syncNow()]);
  await Promise.all([a.syncNow(), b.syncNow()]); // segunda passada: cada um busca o do outro
  assert.equal(appA.state.txs.length, 2);
  assert.equal(appB.state.txs.length, 2);
  assert.equal(appA.state.txs.find(t => t.id === 'a').paid, false);
  assert.ok(appB.state.txs.some(t => t.desc === 'Freela'));
  assert.ok(appA.state.txs.some(t => t.desc === 'Freela'));
});

test('nuvem: conflito no mesmo registro — a edição mais nova prevalece, com aviso', async () => {
  const { appA, a, appB, b } = await pair();
  // B altera e envia primeiro
  appB.state = edit(appB.state, 'B editou'); b.noteSave(appB.state);
  await b.syncNow();
  // A altera o mesmo registro, mas a edição de A é mais antiga que a de B
  appA.state = edit(appA.state, 'A editou'); a.noteSave(appA.state);
  a.dirty.set('txs\u0000a', 1000);
  await a.syncNow();
  assert.equal(appA.state.txs[0].desc, 'B editou');
  assert.equal(a.dirty.size, 0);
  assert.match(appA.notices.at(-1)[0], /outra pessoa/);
});

test('nuvem: a edição local mais nova prevalece e sobe', async () => {
  const { cloud, appA, a, appB, b, code } = await pair();
  appB.state = edit(appB.state, 'B editou'); b.noteSave(appB.state);
  await b.syncNow();
  appA.state = edit(appA.state, 'A editou'); a.noteSave(appA.state);
  a.dirty.set('txs\u0000a', Date.now() + 60000); // a edição de A é mais nova
  await a.syncNow();
  assert.equal((await cloud.plain('txs\u0000a', code)).desc, 'A editou');
  await b.syncNow();
  assert.equal(appB.state.txs[0].desc, 'A editou');
});

test('nuvem: apagar chega como lápide e não ressuscita', async () => {
  const { cloud, appA, a, appB, b, code } = await pair();
  appA.state = Ops.deleteTx(appA.state, 'a', false); a.noteSave(appA.state);
  await a.syncNow();
  assert.equal(cloud.records.get('txs\u0000a').del, true);
  await b.syncNow();
  assert.equal(appB.state.txs.length, 0);
  // um terceiro aparelho entra agora e também não vê o lançamento
  const appC = makeApp(newState());
  const c = makeSync(appC, cloud, 'tokb'); c.deviceId = 'ap-c';
  await c.init(); await c.signIn({ interactive: true });
  assert.equal((await c.activate({ mode: 'join', code })).ok, true);
  assert.equal(appC.state.txs.length, 0);
});

test('nuvem: depois de compactar o diário, o aparelho se recupera sozinho', async () => {
  const { cloud, appA, a, appB, b, code } = await pair();
  appA.state = edit(appA.state, 'versão nova'); a.noteSave(appA.state);
  await a.syncNow();
  // compactação simulada no serviço
  cloud.log = []; cloud.firstSeq = cloud.lastSeq + 1;
  // B tem uma edição pendente (ainda não enviada) na mesma hora
  appB.state = edit(appB.state, 'B pendente'); b.noteSave(appB.state);
  b.dirty.set('txs\u0000a', Date.now() + 60000); // a edição de B é mais nova que o retrato da nuvem
  const r = await b.syncNow();
  assert.equal(r.ok, true);
  assert.equal(appB.state.txs[0].desc, 'B pendente'); // a edição pendente sobreviveu
  assert.equal(b.dirty.size, 0);
  assert.equal((await cloud.plain('txs\u0000a', code)).desc, 'B pendente'); // e subiu
  // A recebe a versão de B
  await a.syncNow();
  assert.equal(appA.state.txs[0].desc, 'B pendente');
});

test('nuvem: sem conexão a fila espera e sobe depois', async () => {
  const { cloud, appA, a, appB, b } = await pair();
  cloud.offline = true;
  appA.state = Ops.togglePaid(appA.state, 'a'); a.noteSave(appA.state);
  const r = await a.syncNow();
  assert.equal(r.ok, false);
  assert.equal(a.phase, 'offline');
  assert.ok(a.dirty.size > 0); // nada perdido
  cloud.offline = false;
  await a.syncNow();
  assert.equal(a.phase, 'ready');
  assert.equal(a.dirty.size, 0);
  await b.syncNow();
  assert.equal(appB.state.txs[0].paid, false);
});

// ------------------------------------------------------------------ administração
test('nuvem: membros — só o admin adiciona, e quem saiu deixa de acessar', async () => {
  const { a, b } = await pair();
  const list = await a.members();
  assert.ok(list.members.some(m => m.email === 'b@x.com' && !m.admin));
  assert.ok(list.members.some(m => m.email === 'a@x.com' && m.admin));
  const rm = await a.memberRemove('b@x.com');
  assert.equal(rm.ok, true);
  const r = await b.syncNow();
  assert.equal(r.ok, false);
  assert.equal(r.error, 'not_member');
});

test('nuvem: apagar os dados da nuvem (admin) esvazia e os outros acompanham', async () => {
  const { cloud, appA, a, appB, b } = await pair();
  const r = await a.wipeCloud();
  assert.equal(r.ok, true);
  assert.equal(cloud.records.size, 0);
  await b.syncNow();
  assert.equal(appB.state.txs.length, 0); // a nuvem é a fonte: o aparelho acompanha
});

test('nuvem: reenviar tudo restaura a nuvem a partir deste aparelho', async () => {
  const { cloud, appA, a, code } = await pair();
  await a.wipeCloud();
  assert.equal(cloud.records.size, 0);
  const r = await a.resendAll();
  assert.equal(r.ok, true);
  assert.equal((await cloud.plain('txs\u0000a', code)).desc, 'Mercado');
});

test('nuvem: desconectar mantém os dados locais e esquece a nuvem neste aparelho', async () => {
  const { appA, a } = await pair();
  await a.disconnect();
  assert.equal(a.phase, 'signedOut');
  assert.equal(a.code, '');
  assert.equal(appA.state.txs.length, 1); // os dados continuam aqui
});

// ------------------------------------------------------------------ registros
test('nuvem: registros do estado e validação do que vem da nuvem', () => {
  const s = sample();
  const recs = stateRecords(s);
  assert.ok(recs.has('txs\u0000a'));
  assert.ok(recs.has('accounts\u0000main'));
  assert.ok(recs.has('settings\u0000settings'));
  assert.deepEqual(settingsOf(s).cats.income, s.cats.income);

  const okTx = sanitize('txs', 'x', { kind: 'expense', value: 1234, date: '2026-10-01', desc: 'Ok', paid: false, accountId: 'main' });
  assert.equal(okTx.value, 1234);
  assert.equal(okTx.id, 'x');
  assert.equal(sanitize('txs', 'x', { kind: 'expense', value: -5, date: '2026-10-01', desc: 'Ok' }), null);
  assert.equal(sanitize('txs', 'x', { kind: 'expense', value: 100, date: '2026-13-01', desc: 'Ok' }), null);
  assert.equal(sanitize('txs', 'x', { kind: 'nada', value: 100, date: '2026-10-01', desc: 'Ok' }), null);
  assert.equal(sanitize('goals', 'g', { name: 'Viagem', target: 100000, saved: 0 }).target, 100000);
  assert.equal(sanitize('cards', 'c', { name: 'Cartão', limit: 0, close: 40, due: 5 }).close, 5);
  const st = sanitize('settings', 's', { cats: { expense: ['A', 'a', 'B'], income: ['C'] }, limits: { A: 1000, '': 5 }, theme: 'tokyo', autoLock: 5, privacy: true });
  assert.deepEqual(st.cats.expense, ['A', 'B']); // sem duplicata (maiúsc./minúsc.)
  assert.deepEqual(Object.keys(st.limits), ['A']);
  assert.equal(st.theme, 'tokyo');
  assert.equal(st.autoLock, 5);
  assert.equal(st.privacy, true);

  const s2 = applyRecord(s, 'txs', 'a', null);
  assert.equal(s2.txs.length, 0);
  const s3 = applyRecord(s, 'txs', 'a', { ...s.txs[0], desc: 'Outro' });
  assert.equal(s3.txs[0].desc, 'Outro');
  assert.equal(applyRecord(s3, 'txs', 'novo', okTx).txs.length, 2);
});
