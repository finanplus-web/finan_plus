// Finan+ — nuvem (Google Apps Script) — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Serviço da nuvem do Finan+: uma API JSON minúscula sobre uma Planilha Google.
//
// O que ele guarda: registros CIFRADOS (o conteúdo é selado no aparelho; aqui só há blocos ilegíveis),
// a versão (carimbo de tempo do serviço) de cada registro e um diário de alterações. Nada mais.
//
// Como usar (uma vez): veja backend/LEIA-ME.md. Resumo:
// 1. script.google.com → Novo projeto → cole este arquivo (e o appsscript.json).
// 2. Propriedades do script: SETUP_CODE = um código temporário só seu.
// 3. Implantar → App da Web → "Executar como: eu" / "Quem pode acessar: qualquer pessoa".
// 4. No Finan+ (Ajustes › Conta e nuvem), informe a URL /exec e o ID do cliente Google.
//
// Segurança: cada chamada exige um ID token do Google (validado aqui e conferido contra a lista de
// membros). O primeiro acesso vira administrador usando o SETUP_CODE, que é apagado em seguida.
// As gravações usam LockService (nada se sobrepõe) e conferência de versão por registro (baseTs).
//
// Ações: hello, pull, push, members, member-add, member-remove, wipe.

var SERVICE = 'finan-plus-nuvem';
var SERVICE_VERSION = 1;

var REC = 'registros', LOG = 'diario';
var REC_HEADER = ['col', 'id', 'ts', 'updater', 'del', 'blob'];
var LOG_HEADER = ['seq', 'ts', 'col', 'id', 'updater', 'del', 'blob'];
var MAX_PUSH = 100;        // registros por envio
var MAX_EVENTS = 3000;     // eventos por leitura
var COMPACT_AT = 4000;     // diário maior que isto é compactado
var MAX_BLOB = 40000;      // caracteres por bloco cifrado
var MAX_ID = 50, MAX_COL = 20, MAX_UPDATER = 40;

// ------------------------------------------------------------------ entrada HTTP
function doGet() {
  return json_({ ok: true, service: SERVICE, version: SERVICE_VERSION, message: 'Serviço do Finan+ no ar. Configure o app em Ajustes › Conta e nuvem.' });
}

function doPost(e) {
  var out;
  try {
    var body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    out = handle_(body);
  } catch (err) {
    if (err && err.apiError) out = { ok: false, error: err.apiCode, message: err.message };
    else out = { ok: false, error: 'internal', message: 'Erro interno no serviço: ' + (err && err.message ? err.message : err) };
  }
  return json_(out);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function apiError_(code, message) {
  var e = new Error(message);
  e.apiError = true; e.apiCode = code;
  return e;
}

function handle_(p) {
  var action = String(p.action || '');
  switch (action) {
    case 'hello': return actionHello_(p);
    case 'pull': return actionPull_(p);
    case 'push': return actionPush_(p);
    case 'members': return actionMembers_(p);
    case 'member-add': return actionMemberAdd_(p);
    case 'member-remove': return actionMemberRemove_(p);
    case 'wipe': return actionWipe_(p);
    default: throw apiError_('bad_request', 'Ação desconhecida: ' + action);
  }
}

// ------------------------------------------------------------------ propriedades e autorização
function props_() { return PropertiesService.getScriptProperties(); }
function getJson_(key, def) {
  var v = props_().getProperty(key);
  if (!v) return def;
  try { return JSON.parse(v); } catch (e) { return def; }
}
function setJson_(key, value) { props_().setProperty(key, JSON.stringify(value)); }
function intProp_(key, def) {
  var n = parseInt(props_().getProperty(key) || '', 10);
  return isFinite(n) ? n : def;
}

/** Confere o ID token do Google (com cache de 25 min) e devolve o e-mail em minúsculas. */
function auth_(p) {
  var token = typeof p.token === 'string' ? p.token : '';
  if (!token || token.length > 4096) throw apiError_('auth_invalid', 'Entre com o Google de novo.');
  var cache = CacheService.getScriptCache();
  var digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8));
  var ckey = 'tok-' + digest.substring(0, 44);
  var email = cache.get(ckey);
  if (!email) {
    var res;
    try { res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true }); }
    catch (e) { throw apiError_('auth_invalid', 'Não foi possível confirmar a sessão do Google agora.'); }
    if (res.getResponseCode() !== 200) throw apiError_('auth_invalid', 'Sessão do Google expirada ou inválida. Entre de novo.');
    var j = {};
    try { j = JSON.parse(res.getContentText() || '{}'); } catch (e2) { j = {}; }
    if (!j.email || j.email_verified === 'false') throw apiError_('auth_invalid', 'E-mail do Google não verificado.');
    var clientId = props_().getProperty('CLIENT_ID');
    if (clientId && j.aud !== clientId) throw apiError_('auth_invalid', 'Esta sessão do Google é de outro aplicativo.');
    email = String(j.email).toLowerCase();
    cache.put(ckey, email, 1500);
  }
  return email;
}

function members_() { return getJson_('MEMBERS', []); }
function isAdmin_(email) { var a = props_().getProperty('ADMIN_EMAIL'); return !!a && a.toLowerCase() === email; }
function requireMember_(email) {
  if (isAdmin_(email)) return;
  var ok = members_().some(function (m) { return String(m.email || '').toLowerCase() === email; });
  if (!ok) throw apiError_('not_member', 'Esta conta Google ainda não foi autorizada nesta casa. Quem administra pode adicionar o seu e-mail em Ajustes › Conta e nuvem › Membros.');
}
function requireAdmin_(email) {
  if (!isAdmin_(email)) throw apiError_('admin_only', 'Só quem administra a casa pode fazer isso.');
}
function memberName_(email) {
  var m = members_().filter(function (x) { return String(x.email || '').toLowerCase() === email; })[0];
  return m && m.name ? m.name : '';
}
function membersList_(admin) {
  var list = members_().map(function (m) { return { email: m.email, name: m.name || '', added: m.added || 0, admin: false }; });
  list.unshift({ email: admin, name: memberName_(admin), added: 0, admin: true });
  return list;
}

// ------------------------------------------------------------------ planilha
function sheet_() {
  var id = props_().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  // primeira chamada: cria a planilha e as abas
  var ss = SpreadsheetApp.create('Finan+ · dados da nuvem (não edite à mão)');
  var first = ss.getSheets()[0];
  first.setName(REC);
  first.appendRow(REC_HEADER);
  var log = ss.insertSheet(LOG);
  log.appendRow(LOG_HEADER);
  props_().setProperty('SHEET_ID', ss.getId());
  props_().setProperty('FIRST_SEQ', '1');
  props_().setProperty('LAST_SEQ', '0');
  props_().setProperty('LOG_ROWS', '0');
  return ss;
}
function recSheet_() { return sheet_().getSheetByName(REC); }
function logSheet_() { return sheet_().getSheetByName(LOG); }

function ensureRows_(sh, needed) {
  var extra = needed - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);
}

/** Lê a aba de registros: { values: [[col,id,ts,updater,del,blob]…], index: Map } */
function readRecords_(sh) {
  var last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2, 1, last - 1, 6).getValues() : [];
  var index = {};
  for (var i = 0; i < values.length; i++) index[String(values[i][0]) + '\u0000' + String(values[i][1])] = i;
  return { values: values, index: index };
}

function stats_() {
  var sh = recSheet_();
  var last = sh.getLastRow();
  if (last <= 1) return { records: 0 };
  var vals = sh.getRange(2, 1, last - 1, 5).getValues();
  var n = 0;
  for (var i = 0; i < vals.length; i++) if (vals[i][4] !== true && String(vals[i][4]) !== 'true') n++;
  return { records: n };
}

// ------------------------------------------------------------------ ações
function actionHello_(p) {
  var email = auth_(p);
  var props = props_();
  var admin = props.getProperty('ADMIN_EMAIL');
  var claimed = false;
  if (!admin) {
    var expect = props.getProperty('SETUP_CODE') || '';
    var code = typeof p.setupCode === 'string' ? p.setupCode : '';
    if (!expect) throw apiError_('setup_pending', 'O serviço ainda não foi ativado. Rode a função bootstrap() no editor do script (recomendado) ou defina SETUP_CODE nas Propriedades do script e tente de novo.');
    if (!code || code !== expect) throw apiError_('setup_bad_code', 'Código de instalação incorreto. Confira o SETUP_CODE nas Propriedades do script.');
    props.setProperty('ADMIN_EMAIL', email);
    if (typeof p.clientId === 'string' && p.clientId && !props.getProperty('CLIENT_ID')) props.setProperty('CLIENT_ID', p.clientId);
    props.deleteProperty('SETUP_CODE');
    admin = email;
    claimed = true;
  }
  requireMember_(email);
  // o login do administrador guarda o ID do cliente que o app usa (confere a origem dos tokens)
  if (isAdmin_(email) && typeof p.clientId === 'string' && p.clientId && !props.getProperty('CLIENT_ID')) props.setProperty('CLIENT_ID', p.clientId);
  // guarda o nome de quem entrou (para a lista de membros), sem sobrescrever um nome já conhecido
  if (!isAdmin_(email)) {
    var list = members_(), changed = false;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].email || '').toLowerCase() === email && !list[i].name && typeof p.name === 'string' && p.name) { list[i].name = String(p.name).substring(0, 60); changed = true; }
    }
    if (changed) setJson_('MEMBERS', list);
  }
  return {
    ok: true, service: SERVICE, email: email, name: isAdmin_(email) ? (typeof p.name === 'string' ? String(p.name).substring(0, 60) : '') : memberName_(email),
    isAdmin: isAdmin_(email), claimed: claimed, serverTime: Date.now(),
    stats: p.stats === true ? stats_() : null,
  };
}

function actionPull_(p) {
  var email = auth_(p);
  requireMember_(email);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw apiError_('busy', 'O serviço está ocupado; tente de novo em instantes.');
  try {
    var firstSeq = intProp_('FIRST_SEQ', 1);
    var lastSeq = intProp_('LAST_SEQ', 0);
    var since = typeof p.since === 'number' && isFinite(p.since) ? Math.floor(p.since) : 0;
    if (since < 0) since = 0;
    if (p.full === true || since + 1 < firstSeq) return pullFull_(firstSeq, lastSeq);
    if (since >= lastSeq) return { ok: true, full: false, events: [], firstSeq: firstSeq, lastSeq: since, hasMore: false, serverTime: Date.now() };
    var logRows = intProp_('LOG_ROWS', 0);
    var startIndex = since + 1 - firstSeq;          // linha 0 = seq FIRST_SEQ
    var available = logRows - startIndex;
    if (startIndex < 0 || available <= 0) return pullFull_(firstSeq, lastSeq); // defensivo
    var count = Math.min(available, MAX_EVENTS);
    var lsh = logSheet_();
    var values = lsh.getRange(2 + startIndex, 1, count, 7).getValues();
    var exclude = typeof p.exclude === 'string' ? p.exclude.substring(0, MAX_UPDATER) : '';
    var events = [];
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (exclude && String(v[4]) === exclude) continue;   // eco das próprias gravações
      events.push({ seq: Number(v[0]), ts: Number(v[1]), col: String(v[2]), id: String(v[3]), updater: String(v[4]), deleted: v[5] === true || String(v[5]) === 'true', blob: String(v[6] || '') });
    }
    var lastRead = firstSeq + startIndex + count - 1;
    return { ok: true, full: false, events: events, firstSeq: firstSeq, lastSeq: lastRead, hasMore: lastRead < lastSeq, serverTime: Date.now() };
  } finally { lock.releaseLock(); }
}

function pullFull_(firstSeq, lastSeq) {
  var sh = recSheet_();
  var last = sh.getLastRow();
  var values = last > 1 ? sh.getRange(2, 1, last - 1, 6).getValues() : [];
  var records = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    records.push({ col: String(v[0]), id: String(v[1]), ts: Number(v[2]), updater: String(v[3]), deleted: v[4] === true || String(v[4]) === 'true', blob: String(v[5] || '') });
  }
  return { ok: true, full: true, records: records, firstSeq: firstSeq, lastSeq: lastSeq, hasMore: false, serverTime: Date.now() };
}

function actionPush_(p) {
  var email = auth_(p);
  requireMember_(email);
  var changes = p.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    return { ok: true, applied: [], conflicts: [], firstSeq: intProp_('FIRST_SEQ', 1), lastSeq: intProp_('LAST_SEQ', 0), serverTime: Date.now() };
  }
  if (changes.length > MAX_PUSH) throw apiError_('bad_request', 'Envios são limitados a ' + MAX_PUSH + ' registros por vez.');
  var updater = typeof p.updater === 'string' ? p.updater.substring(0, MAX_UPDATER) : '';
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('busy', 'O serviço está ocupado; tente de novo em instantes.');
  try {
    var ss = sheet_();
    var sh = ss.getSheetByName(REC), lsh = ss.getSheetByName(LOG);
    var rec = readRecords_(sh);
    var firstSeq = intProp_('FIRST_SEQ', 1);
    var lastSeq = intProp_('LAST_SEQ', 0);
    var logRows = intProp_('LOG_ROWS', 0);
    var now = Date.now();
    var applied = [], conflicts = [], logOut = [], touched = false;
    for (var i = 0; i < changes.length; i++) {
      var c = changes[i] || {};
      var col = String(c.col || ''), id = String(c.id || '');
      if (!col || col.length > MAX_COL || !id || id.length > MAX_ID) continue;
      var deleted = c.deleted === true;
      var blob = deleted ? '' : String(c.blob || '');
      if (!deleted && (!blob || blob.length > MAX_BLOB)) throw apiError_('bad_request', 'Registro grande demais ou vazio.');
      var baseTs = typeof c.baseTs === 'number' && isFinite(c.baseTs) ? c.baseTs : 0;
      var key = col + '\u0000' + id;
      var at = rec.index[key];
      var curTs = at == null ? -1 : Number(rec.values[at][2]) || 0;
      if (at != null && curTs > baseTs) {
        var cv = rec.values[at];
        conflicts.push({ col: String(cv[0]), id: String(cv[1]), ts: Number(cv[2]), updater: String(cv[3]), deleted: cv[4] === true || String(cv[4]) === 'true', blob: String(cv[5] || '') });
        continue;
      }
      lastSeq++;
      var row = at == null ? null : rec.values[at];
      var newRow = [col, id, now, updater, deleted, blob];
      if (at == null) { rec.index[key] = rec.values.length; rec.values.push(newRow); }
      else rec.values[at] = newRow;
      logOut.push([lastSeq, now, col, id, updater, deleted, blob]);
      applied.push({ col: col, id: id, seq: lastSeq, ts: now });
      touched = true;
    }
    if (touched) {
      ensureRows_(sh, rec.values.length + 1);
      if (rec.values.length) sh.getRange(2, 1, rec.values.length, 6).setValues(rec.values);
      ensureRows_(lsh, 1 + logRows + logOut.length);
      lsh.getRange(2 + logRows, 1, logOut.length, 7).setValues(logOut);
      logRows += logOut.length;
      // compacta o diário quando fica grande (o retrato já está na aba de registros)
      if (logRows > COMPACT_AT) {
        lsh.deleteRows(2, logRows);
        firstSeq = lastSeq + 1;
        logRows = 0;
      }
      props_().setProperty('FIRST_SEQ', String(firstSeq));
      props_().setProperty('LAST_SEQ', String(lastSeq));
      props_().setProperty('LOG_ROWS', String(logRows));
    }
    return { ok: true, applied: applied, conflicts: conflicts, firstSeq: firstSeq, lastSeq: lastSeq, serverTime: now };
  } finally { lock.releaseLock(); }
}

function actionMembers_(p) {
  var email = auth_(p);
  requireMember_(email);
  return { ok: true, members: membersList_(props_().getProperty('ADMIN_EMAIL') || ''), isAdmin: isAdmin_(email) };
}

function actionMemberAdd_(p) {
  var email = auth_(p);
  requireAdmin_(email);
  var add = String(p.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add) || add.length > 120) throw apiError_('bad_request', 'Informe um e-mail válido.');
  if (add === (props_().getProperty('ADMIN_EMAIL') || '').toLowerCase()) throw apiError_('bad_request', 'Este e-mail já faz parte da casa.');
  var list = members_();
  if (!list.some(function (m) { return String(m.email || '').toLowerCase() === add; })) {
    list.push({ email: add, name: '', added: Date.now() });
    setJson_('MEMBERS', list);
  }
  return { ok: true, members: membersList_(props_().getProperty('ADMIN_EMAIL') || '') };
}

function actionMemberRemove_(p) {
  var email = auth_(p);
  requireAdmin_(email);
  var rm = String(p.email || '').trim().toLowerCase();
  var list = members_().filter(function (m) { return String(m.email || '').toLowerCase() !== rm; });
  setJson_('MEMBERS', list);
  return { ok: true, members: membersList_(props_().getProperty('ADMIN_EMAIL') || '') };
}

function actionWipe_(p) {
  var email = auth_(p);
  requireAdmin_(email);
  if (p.confirm !== 'APAGAR') throw apiError_('bad_request', 'Confirmação ausente.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_('busy', 'O serviço está ocupado; tente de novo em instantes.');
  try {
    var ss = sheet_();
    var sh = ss.getSheetByName(REC), lsh = ss.getSheetByName(LOG);
    var rows = sh.getLastRow() - 1;
    if (rows > 0) sh.deleteRows(2, rows);
    var lrows = lsh.getLastRow() - 1;
    if (lrows > 0) lsh.deleteRows(2, lrows);
    // marca d'água: aumenta a versão para que os aparelhos em dia percebam que a nuvem foi apagada
    var lastSeq = intProp_('LAST_SEQ', 0) + 1;
    props_().setProperty('LAST_SEQ', String(lastSeq));
    props_().setProperty('FIRST_SEQ', String(lastSeq));
    props_().setProperty('LOG_ROWS', '0');
    return { ok: true, lastSeq: lastSeq, serverTime: Date.now() };
  } finally { lock.releaseLock(); }
}

// ------------------------------------------------------------------ configuração rápida (rodar uma vez no editor)
/**
 * Atalho recomendado de ativação: no editor do Apps Script (script.google.com), escolha a função
 * `bootstrap` na lista de funções e clique em ▶ Executar. Na primeira vez o Google pede as
 * permissões (criar a planilha, conferir logins).
 *
 * O que ela faz: define ADMIN_EMAIL como o e-mail desta conta (que está executando) e cria a
 * planilha de dados. Depois disso, é só entrar no Finan+ com esta mesma conta Google — sem código
 * de instalação. Rodar de novo não muda nada.
 */
function bootstrap() {
  var props = props_();
  var atual = props.getProperty('ADMIN_EMAIL');
  var eu = '';
  try { eu = Session.getActiveUser().getEmail() || ''; } catch (e) { eu = ''; }
  if (!eu) { try { eu = Session.getEffectiveUser().getEmail() || ''; } catch (e2) { eu = ''; } }
  eu = eu.toLowerCase();
  if (atual) return 'Administrador já definido: ' + atual + (eu ? ' (esta conta: ' + eu + ')' : '');
  if (!eu) throw new Error('Não foi possível descobrir o e-mail desta conta Google.');
  props.setProperty('ADMIN_EMAIL', eu);
  sheet_(); // já cria a planilha e as abas ("Finan+ · dados da nuvem")
  return 'Pronto! Administrador da casa: ' + eu + '. Agora entre no Finan+ com esta mesma conta Google.';
}
