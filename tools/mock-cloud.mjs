// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Servidor de testes da nuvem: implementa o mesmo contrato de backend/appsscript/Code.gs, em memória,
// para desenvolver e testar o Finan+ web sem depender do Google. Não use em produção.
//
// Uso:  node tools/mock-cloud.mjs            (porta 8787)
//       MOCK_PORT=9000 node tools/mock-cloud.mjs
//
// No app (Ajustes › Conta e nuvem › Configurar), informe:
//   URL do serviço: http://localhost:8787
//   ID do cliente:  dev-mock
// e entre com o Google normalmente (o login é simulado).
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 8787);
const MAX_PUSH = 100, MAX_EVENTS = 3000, COMPACT_AT = 4000;

/** estado em memória */
const db = {
  admin: '', members: [], setupCode: process.env.MOCK_SETUP || 'dev',
  records: new Map(),           // "col\0id" → {col,id,ts,updater,del,blob}
  log: [],                      // {seq,ts,col,id,updater,del,blob}
  firstSeq: 1, lastSeq: 0,
};

const fail = (code, message) => ({ ok: false, error: code, message });

function auth(token) {
  const t = String(token || '');
  const m = /^dev:(.+)$/.exec(t);
  if (!m || !/^[^\s@]+@[^\s@]+$/.test(m[1])) return null;
  return m[1].toLowerCase();
}

function handle(p) {
  const action = String(p.action || '');
  const email = auth(p.token);
  if (!email) return fail('auth_invalid', 'Token de desenvolvimento ausente ou inválido.');
  if (action === 'hello') {
    if (!db.admin) {
      if (!db.setupCode) return fail('setup_pending', 'Defina SETUP_CODE.');
      if (p.setupCode !== db.setupCode) return fail('setup_bad_code', 'Código de instalação incorreto.');
      db.admin = email; db.setupCode = '';
    }
    const member = email === db.admin || db.members.some(m => m.email === email);
    if (!member) return fail('not_member', 'Conta não autorizada nesta casa.');
    return { ok: true, email, name: '', isAdmin: email === db.admin, claimed: false, serverTime: Date.now(), stats: p.stats === true ? { records: [...db.records.values()].filter(r => !r.del).length } : null };
  }
  const isMember = email === db.admin || db.members.some(m => m.email === email);
  if (!isMember) return fail('not_member', 'Conta não autorizada nesta casa.');
  const isAdmin = email === db.admin;

  if (action === 'pull') {
    const since = Number(p.since) || 0;
    const recOut = r => ({ col: r.col, id: r.id, ts: r.ts, updater: r.updater, deleted: r.del, blob: r.blob });
    const snapshot = () => ({ ok: true, full: true, records: [...db.records.values()].map(recOut), firstSeq: db.firstSeq, lastSeq: db.lastSeq, hasMore: false, serverTime: Date.now() });
    if (p.full === true || since + 1 < db.firstSeq) return snapshot();
    if (since >= db.lastSeq) return { ok: true, full: false, events: [], firstSeq: db.firstSeq, lastSeq: since, hasMore: false, serverTime: Date.now() };
    const start = since + 1 - db.firstSeq;
    if (start < 0 || start >= db.log.length) return snapshot();
    const slice = db.log.slice(start, start + MAX_EVENTS);
    const exclude = String(p.exclude || '');
    const events = slice.filter(e => e.updater !== exclude).map(e => ({ seq: e.seq, ts: e.ts, col: e.col, id: e.id, updater: e.updater, deleted: e.del, blob: e.blob }));
    const lastRead = slice.length ? slice[slice.length - 1].seq : since;
    return { ok: true, full: false, events, firstSeq: db.firstSeq, lastSeq: lastRead, hasMore: lastRead < db.lastSeq, serverTime: Date.now() };
  }

  if (action === 'push') {
    const changes = Array.isArray(p.changes) ? p.changes : [];
    if (changes.length > MAX_PUSH) return fail('bad_request', 'Muitos registros.');
    const updater = String(p.updater || '').slice(0, 40);
    const now = Date.now();
    const applied = [], conflicts = [];
    for (const c of changes) {
      const key = c.col + '\u0000' + c.id;
      const cur = db.records.get(key);
      if (cur && Number(cur.ts) > Number(c.baseTs || 0)) { conflicts.push({ ...cur }); continue; }
      db.lastSeq++;
      const rec = { col: String(c.col), id: String(c.id), ts: now, updater, del: c.deleted === true, blob: c.deleted === true ? '' : String(c.blob || '') };
      db.records.set(key, rec);
      db.log.push({ seq: db.lastSeq, ts: now, ...rec });
      applied.push({ col: rec.col, id: rec.id, seq: db.lastSeq, ts: now });
    }
    if (db.log.length > COMPACT_AT) { db.log = []; db.firstSeq = db.lastSeq + 1; }
    return { ok: true, applied, conflicts, firstSeq: db.firstSeq, lastSeq: db.lastSeq, serverTime: now };
  }

  if (action === 'members') return { ok: true, members: [{ email: db.admin, name: '', admin: true, added: 0 }, ...db.members.map(m => ({ ...m, admin: false }))] };
  if (action === 'member-add') {
    if (!isAdmin) return fail('admin_only', 'Só quem administra.');
    const add = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add)) return fail('bad_request', 'E-mail inválido.');
    if (add === db.admin || db.members.some(m => m.email === add)) return { ok: true, members: [{ email: db.admin, name: '', admin: true }, ...db.members] };
    db.members.push({ email: add, name: '', added: Date.now() });
    return { ok: true, members: [{ email: db.admin, name: '', admin: true }, ...db.members] };
  }
  if (action === 'member-remove') {
    if (!isAdmin) return fail('admin_only', 'Só quem administra.');
    db.members = db.members.filter(m => m.email !== String(p.email || '').toLowerCase());
    return { ok: true, members: [{ email: db.admin, name: '', admin: true }, ...db.members] };
  }
  if (action === 'wipe') {
    if (!isAdmin) return fail('admin_only', 'Só quem administra.');
    db.records.clear(); db.log = [];
    db.lastSeq++; db.firstSeq = db.lastSeq; // marca d'água: quem estava em dia percebe que a nuvem foi apagada
    console.log('[mock] nuvem apagada');
    return { ok: true, lastSeq: db.lastSeq, serverTime: Date.now() };
  }
  return fail('bad_request', 'Ação desconhecida: ' + action);
}

const server = createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (req.method === 'GET') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'finan-plus-nuvem-mock', version: 1 }));
      return;
    }
    let out;
    try { out = handle(JSON.parse(body || '{}')); }
    catch (e) { out = fail('internal', String(e && e.message || e)); }
    console.log(`[mock] ${JSON.parse(body || '{}').action || '?'} → ${out.ok ? 'ok' : out.error}`);
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out));
  });
});
server.listen(PORT, () => console.log(`Nuvem de testes do Finan+ em http://localhost:${PORT} (login simulado: clientId "dev-mock")`));
