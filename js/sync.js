// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sincronização com a nuvem (Google Apps Script), por registro e sem perder alterações.
//
// Como funciona:
// - O estado local (js/core.js) é visto como um conjunto de registros: cada lançamento, meta, conta,
//   cartão e recorrência é um registro; categorias, limites, tema etc. formam o registro "settings".
// - Cada gravação local vira uma diferença ("sujo") que sobe em segundo plano; o serviço responde
//   com a confirmação e com as alterações de outras pessoas desde a última leitura.
// - Cada registro tem uma versão (o instante em que o serviço o aceitou). Ao subir, enviamos a versão
//   que conhecíamos: se alguém alterou o mesmo registro nesse meio-tempo, o serviço recusa e a versão
//   mais recente (por horário, com desempate pelo horário da edição local) prevalece, com aviso.
// - Registros apagados viram "lápides": somem aqui e na nuvem, e não voltam.
// - Nada aqui vê os dados em claro para a rede: o conteúdo vai selado por js/e2e.js antes de sair.
import { tx as coreTx, validDate, themeOf, AUTOLOCK_OPTIONS, DEFAULT_EXPENSE, DEFAULT_INCOME, MAX_ABS_CENTS, newState } from './core.js';
import { seal, unseal, normalizeCode, validCode, keyFromCode } from './e2e.js';
import { loadCloudSession, saveCloudSession, clearCloudSession } from './cloud.js';
import { disableGoogleAutoSelect } from './google.js';

export const COLS = ['txs', 'goals', 'accounts', 'cards', 'recurring'];
export const SETTINGS_ID = 'settings';
export const DB_NAME = 'finan-plus-nuvem';
export const rk = (col, id) => col + '\u0000' + id;

// ------------------------------------------------------------------ leitura do estado em registros
export function settingsOf(s) {
  return {
    cats: { expense: [...s.cats.expense], income: [...s.cats.income] },
    limits: Object.fromEntries(s.limits), privacy: !!s.privacy, autoLock: s.autoLock, theme: s.theme,
  };
}
export function applySettingsTo(state, v) {
  const list = x => Array.isArray(x) ? [...x] : [];
  const lam = list(v?.cats?.expense), lin = list(v?.cats?.income);
  const limits = new Map(state.limits);
  if (v?.limits && typeof v.limits === 'object') { limits.clear(); for (const [k, n] of Object.entries(v.limits)) limits.set(k, n); }
  return {
    ...state,
    cats: { expense: lam.length ? lam : [...state.cats.expense], income: lin.length ? lin : [...state.cats.income] },
    limits, privacy: v?.privacy === true,
    autoLock: AUTOLOCK_OPTIONS.includes(v?.autoLock) ? v.autoLock : 0,
    theme: themeOf(v?.theme),
  };
}
/** Map id-do-registro → {col, id, value} */
export function stateRecords(state) {
  const out = new Map();
  for (const col of COLS) for (const item of state[col]) out.set(rk(col, item.id), { col, id: item.id, value: item });
  out.set(rk('settings', SETTINGS_ID), { col: 'settings', id: SETTINGS_ID, value: settingsOf(state) });
  return out;
}

// ------------------------------------------------------------------ validação de registros vindos da nuvem
const isObj = v => v != null && typeof v === 'object' && !Array.isArray(v);
const istr = (v, max) => { const s = typeof v === 'string' ? v.trim() : ''; return s ? [...s].slice(0, max).join('') : ''; };
const imag = v => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_ABS_CENTS) ? Math.round(v) : null;
const icents = v => { const n = imag(v); return n != null && n > 0 ? n : null; };
const icents0 = v => { const n = imag(v); return n != null && n >= 0 ? n : null; };
const iint = (v, a, b, def = null) => { const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : NaN; return Number.isFinite(n) && n >= a && n <= b ? n : def; };
const idOf = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';

/** Limpa um registro recebido (formato interno, centavos). Devolve o valor ou null se inválido. */
export function sanitize(col, id, v) {
  if (!isObj(v)) return null;
  if (col === 'txs') {
    const kind = v.kind === 'income' || v.kind === 'expense' ? v.kind : null;
    const value = icents(v.value), date = typeof v.date === 'string' && validDate(v.date) ? v.date : null;
    const desc = istr(v.desc, 200);
    if (!kind || !value || !date || !desc) return null;
    return coreTx({
      id, kind, value, date, desc, category: istr(v.category, 40) || 'Outros', paid: v.paid === true,
      accountId: idOf(v.accountId, 48) || undefined, cardId: idOf(v.cardId, 48), cardPayment: idOf(v.cardPayment, 48),
      recurringId: idOf(v.recurringId, 48), groupId: idOf(v.groupId, 48),
      parcelN: iint(v.parcelN, 0, 120, 0), parcelTotal: iint(v.parcelTotal, 0, 120, 0),
    });
  }
  if (col === 'goals') {
    const name = istr(v.name, 60), target = icents(v.target);
    if (!name || !target) return null;
    return { id, name, target, saved: Math.max(0, icents0(v.saved) ?? 0), deadline: typeof v.deadline === 'string' && validDate(v.deadline) ? v.deadline : null, monthly: Math.max(0, icents0(v.monthly) ?? 0) };
  }
  if (col === 'accounts') {
    const name = istr(v.name, 40); const initial = imag(v.initial);
    if (!name || initial == null) return null;
    return { id, name, initial };
  }
  if (col === 'cards') {
    const name = istr(v.name, 40); const limit = icents0(v.limit);
    if (!name || limit == null) return null;
    return { id, name, limit, close: iint(v.close, 1, 31, 5), due: iint(v.due, 1, 31, 12) };
  }
  if (col === 'recurring') {
    const kind = v.kind === 'income' || v.kind === 'expense' ? v.kind : null;
    const desc = istr(v.desc, 120), value = icents(v.value);
    if (!kind || !desc || !value) return null;
    const start = typeof v.start === 'string' && validDate(v.start) ? v.start : null;
    return {
      id, kind, desc, value, category: istr(v.category, 40) || 'Outros', accountId: idOf(v.accountId, 48) || undefined,
      cardId: kind === 'expense' ? idOf(v.cardId, 48) : '', day: iint(v.day, 1, 31, 1), active: v.active !== false,
      start, last: iint(v.last, 0, 120000, null),
    };
  }
  if (col === 'settings') {
    const catsOf = (x, def) => {
      if (!Array.isArray(x)) return null;
      const seen = new Set(), out = [];
      for (const c of x) { const n = istr(c, 40); if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push(n); } }
      return out.length ? out : null;
    };
    const limits = {};
    if (isObj(v.limits)) for (const [k, n] of Object.entries(v.limits)) { const c = istr(k, 40), val = icents(n); if (c && val) limits[c] = val; }
    return {
      cats: { expense: catsOf(v.cats?.expense) || [...DEFAULT_EXPENSE], income: catsOf(v.cats?.income) || [...DEFAULT_INCOME] },
      limits, privacy: v.privacy === true, autoLock: AUTOLOCK_OPTIONS.includes(v.autoLock) ? v.autoLock : 0, theme: themeOf(v.theme),
    };
  }
  return null;
}

/** Aplica um registro ao estado (value null = apagar). Devolve o novo estado. */
export function applyRecord(state, col, id, value) {
  if (col === 'settings') return value == null ? state : applySettingsTo(state, value);
  if (!COLS.includes(col)) return state;
  const list = state[col];
  const i = list.findIndex(x => x.id === id);
  if (value == null) {
    if (i < 0) return state;
    const copy = list.slice(); copy.splice(i, 1);
    return { ...state, [col]: copy };
  }
  if (i >= 0 && JSON.stringify(list[i]) === JSON.stringify(value)) return state;
  const copy = list.slice();
  if (i >= 0) copy[i] = value; else copy.push(value);
  return { ...state, [col]: copy };
}

// ------------------------------------------------------------------ IndexedDB (só metadados da sincronização)
const hasIdb = () => typeof indexedDB !== 'undefined';
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
let dbPromise = null;
function openDb() {
  if (!hasIdb()) return Promise.reject(new Error('sem IndexedDB'));
  if (!dbPromise) dbPromise = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbPromise = null; rej(r.error); };
  });
  return dbPromise;
}
async function idbGet(k) { try { const db = await openDb(); return await reqP(db.transaction('kv').objectStore('kv').get(k)); } catch { return undefined; } }
async function idbPut(k, v) { try { const db = await openDb(); return await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); } catch { /* segue só em memória */ } }
async function idbDel(k) { try { const db = await openDb(); return await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); } catch { /* ignore */ } }

const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const LS_DEVICE = 'finanplus_nuvem_aparelho';

export function loadDeviceId() {
  const l = ls();
  try {
    const o = l && JSON.parse(l.getItem(LS_DEVICE) || 'null');
    if (o && typeof o.id === 'string' && o.id) return o.id;
  } catch { /* novo */ }
  const id = 'ap-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('');
  try { l?.setItem(LS_DEVICE, JSON.stringify({ id })); } catch { /* ignore */ }
  return id;
}

/** Apaga tudo o que a nuvem guardou neste aparelho (código da casa, versões vistas, pendências). */
export async function wipeLocalCloud() {
  for (const k of ['code', 'seen', 'dirty', 'lastSeq']) await idbDel(k);
}

// ------------------------------------------------------------------ motor
const now = () => Date.now();

/**
 * Sync: liga o estado local à nuvem.
 * Dependências: cloud (js/cloud.js), google ({requestToken}), getState() → estado atual,
 * apply(state) → aplica uma versão nova (ctx.replace), notify(título, mensagem[, tipo]) → aviso,
 * onStatus(info) → atualiza a interface.
 */
export class Sync {
  constructor({ cloud = null, google = null, clientId = '', getState = null, apply = null, notify = () => {}, onStatus = () => {}, isPaused = null, deviceLabel = '' } = {}) {
    this.cloud = cloud; this.google = google; this.clientId = clientId;
    this.getState = getState; this.apply = apply; this.isPaused = isPaused;
    this.notify = notify; this.onStatus = onStatus;
    this.deviceId = loadDeviceId();
    this.label = deviceLabel || '';
    this.code = ''; this.key = null;
    this.seen = {};          // chave → versão (ts do serviço) conhecida
    this.dirty = new Map();  // chave → quando foi alterado aqui (ms)
    this.lastSeq = 0;
    this.snap = null;
    this.token = null;       // ID token do Google (memória; some ao recarregar)
    this.session = null;
    this.phase = 'off';      // off | signedOut | needKey | ready | syncing | offline | error
    this.message = '';
    this.lastSyncAt = 0;
    this.applying = false;   // verdadeiro enquanto aplicamos mudanças da nuvem (não marca sujo)
    this.busy = false;
    this.started = false;
    this.pushTimer = null; this.tickTimer = null;
    this.lastSilentAt = 0;
    this.onVis = null; this.onLine = null;
  }

  // ---- estado para a interface
  info() {
    return {
      phase: this.phase, message: this.message, email: this.session?.email || '', name: this.session?.name || '',
      isAdmin: !!this.session?.isAdmin, lastSyncAt: this.lastSyncAt, pending: this.dirty.size, lastSeq: this.lastSeq,
      hasKey: !!this.code,
    };
  }
  #emit() { try { this.onStatus(this.info()); } catch (e) { console.warn('sync status', e); } }
  #setPhase(phase, message = '') { if (this.phase !== phase || this.message !== message) { this.phase = phase; this.message = message; this.#emit(); } }

  // ---- ciclo de vida
  /** Carrega o que ficou guardado e calcula o estado inicial. Devolve info(). */
  async init() {
    const [code, seen, dirty, lastSeq] = await Promise.all([idbGet('code'), idbGet('seen'), idbGet('dirty'), idbGet('lastSeq')]);
    this.code = typeof code === 'string' ? code : '';
    this.seen = isObj(seen) ? seen : {};
    this.dirty = new Map(isObj(dirty) ? Object.entries(dirty).filter(([, v]) => Number.isFinite(v)) : []);
    this.lastSeq = Number.isSafeInteger(lastSeq) && lastSeq >= 0 ? lastSeq : 0;
    if (this.code && validCode(this.code)) {
      try { this.key = await keyFromCode(this.code); } catch { this.code = ''; }
    }
    this.session = loadCloudSession();
    this.#snapshotState();
    this.#setPhase(!this.cloud ? 'off' : !this.session ? 'signedOut' : !this.code ? 'needKey' : 'ready');
    return this.info();
  }

  start() {
    if (this.started || !this.cloud || !this.google) return;
    this.started = true;
    this.tickTimer = setInterval(() => this.tick(), 15000);
    this.onVis = () => { if (!document.hidden) this.tick(); else this.flush(); };
    this.onLine = () => this.tick();
    document.addEventListener('visibilitychange', this.onVis);
    globalThis.addEventListener?.('online', this.onLine);
    globalThis.addEventListener?.('offline', () => this.#setPhase(this.phase === 'off' ? 'off' : 'offline'));
    this.tick();
  }
  stop() {
    this.started = false;
    clearInterval(this.tickTimer); clearTimeout(this.pushTimer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVis);
    globalThis.removeEventListener?.('online', this.onLine);
  }

  /** Um passo: entra de novo se preciso (sem interação), puxa e envia. */
  async tick() {
    if (!this.cloud || !this.session) { return; }
    if (this.isPaused?.()) return;
    if (!this.code) { this.#setPhase('needKey'); return; }
    if (!this.token && now() - this.lastSilentAt > 4 * 60000) {
      this.lastSilentAt = now();
      const t = await this.#googleToken(true);
      if (!t) { if (typeof document === 'undefined' || !document.hidden) this.#setPhase('signedOut'); return; }
    }
    if (!this.token) { this.#setPhase('signedOut'); return; }
    await this.syncNow();
  }

  /** Gravações locais pendentes sobem logo após a edição (com uma pequena espera para agrupar). */
  schedulePush() {
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => { if (this.session && this.code && !document.hidden) this.syncNow(); }, 1500);
  }
  /** Tenta esvaziar a fila agora (ex.: a aba ficou escondida). */
  flush() { if (this.session && this.code && this.dirty.size) this.syncNow(); }

  /** Marca o que mudou desde a última gravação conhecida (chamado pelo app a cada gravação local). */
  noteSave(state) {
    if (!this.snap) this.#snapshotState(state);
    const recs = stateRecords(state);
    const next = new Map();
    for (const [k, r] of recs) {
      const json = JSON.stringify(r.value);
      next.set(k, { col: r.col, id: r.id, json });
      const prev = this.snap.get(k);
      if (!prev || prev.json !== json) this.dirty.set(k, now());
    }
    for (const k of this.snap.keys()) if (!recs.has(k) && !this.dirty.has(k)) this.dirty.set(k, now());
    this.snap = next;
    this.#persistSoon();
    if (this.started && this.session && this.code) this.schedulePush();
  }

  // ---- entrar / ativar / sair
  /** Entra com o Google. Devolve {ok, error, message}; 'setup_pending'/'setup_bad_code' pedem o código de instalação. */
  async signIn({ interactive = false, setupCode = '', render = null } = {}) {
    if (!this.cloud) return { ok: false, error: 'off', message: 'Nuvem não configurada.' };
    const t = await this.#googleToken(!interactive, render);
    if (!t) return { ok: false, error: 'no_token', message: interactive ? 'Entrada não concluída.' : 'Precisa entrar com o Google de novo.' };
    return this.signInWithCredential(t, { setupCode });
  }

  /** Confirma a entrada usando um ID token já obtido (a tela de entrada guarda o token entre tentativas). */
  async signInWithCredential(t, { setupCode = '' } = {}) {
    if (!this.cloud) return { ok: false, error: 'off', message: 'Nuvem não configurada.' };
    let j;
    try {
      j = await this.cloud.call('hello', { clientId: this.clientId, name: t.name || '', ...(setupCode ? { setupCode } : {}) }, t.credential);
    } catch (e) {
      if (e.code === 'setup_pending' || e.code === 'setup_bad_code') return { ok: false, error: e.code, message: e.message };
      if (e.code === 'offline') return { ok: false, error: 'offline', message: e.message };
      return { ok: false, error: e.code || 'error', message: e.message || 'Não foi possível entrar.' };
    }
    this.token = t;
    this.session = { email: j.email || t.email, name: j.name || t.name, isAdmin: !!j.isAdmin };
    saveCloudSession(this.session);
    this.#setPhase(this.code ? 'ready' : 'needKey');
    return { ok: true, isAdmin: !!j.isAdmin, stats: j.stats || null };
  }

  /** Quantos registros existem na nuvem (para avisar antes de criar uma chave nova). */
  async serverStats() {
    try { const j = await this.#call('hello', { stats: true }); return j.stats || null; }
    catch { return null; }
  }

  /**
   * Liga este aparelho à nuvem.
   * mode 'create': os dados deste aparelho prevalecem (primeiro aparelho);
   * mode 'join': os dados da nuvem prevalecem (aparelho novo).
   */
  async activate({ mode, code }) {
    if (!this.session) return { ok: false, error: 'signedOut', message: 'Entre com o Google primeiro.' };
    const norm = normalizeCode(code);
    if (!validCode(norm)) return { ok: false, error: 'bad_code', message: 'O código da casa está incompleto (são 24 caracteres).' };
    let key;
    try { key = await keyFromCode(norm); } catch (e) { return { ok: false, error: 'bad_code', message: e.message }; }
    // lê o retrato da nuvem antes de mexer em qualquer coisa
    let full;
    try { full = await this.#call('pull', { since: 0, full: true }); } catch (e) { return { ok: false, error: e.code || 'error', message: e.message }; }
    const records = Array.isArray(full.records) ? full.records : [];
    const opened = [];
    let fails = 0;
    for (const rec of records) {
      if (!COLS.includes(rec.col) && rec.col !== 'settings') continue;
      if (rec.deleted) { opened.push({ rec, value: null }); continue; }
      try { opened.push({ rec, value: sanitize(rec.col, rec.id, await unseal(key, rec.col, rec.id, rec.blob)) }); }
      catch { fails++; }
    }
    if (fails && mode === 'join') return { ok: false, error: 'code_mismatch', message: `O código não abre ${fails === 1 ? 'um registro' : fails + ' registros'} que já estão na nuvem. Confira se é o mesmo código do outro aparelho.` };
    const state0 = this.getState();
    const local = stateRecords(state0);
    let state = state0;
    const seen = {}, remoteKeys = new Set(), dirty = new Map();
    for (const { rec, value } of opened) {
      const k = rk(rec.col, rec.id);
      remoteKeys.add(k); seen[k] = Number(rec.ts) || 0;
      if (rec.deleted) { if (mode === 'join') state = applyRecord(state, rec.col, rec.id, null); continue; }
      if (!value) continue;
      if (mode === 'join') state = applyRecord(state, rec.col, rec.id, value);
      else if (!local.has(k)) state = applyRecord(state, rec.col, rec.id, value);
      else dirty.set(k, now()); // create: a versão deste aparelho vence
    }
    for (const k of local.keys()) if (!remoteKeys.has(k)) dirty.set(k, now()); // registros só deste aparelho
    this.key = key; this.code = norm; this.seen = seen; this.dirty = dirty; this.lastSeq = Number(full.lastSeq) || 0;
    await idbPut('code', this.code); await this.#persist();
    this.#applyState(state);
    this.#setPhase('ready');
    const pushed = await this.pushOnce().catch(() => null);
    return { ok: true, failures: fails, pushed: pushed?.applied || 0, conflicts: pushed?.conflicts || 0, total: dirty.size };
  }

  /** Sai: para a sincronização e apaga os metadados desta nuvem neste aparelho (os dados locais ficam). */
  async disconnect() {
    this.stop();
    await wipeLocalCloud();
    this.code = ''; this.key = null; this.seen = {}; this.dirty = new Map(); this.lastSeq = 0; this.token = null; this.session = null; this.snap = null;
    clearCloudSession(); disableGoogleAutoSelect();
    this.#setPhase('signedOut');
    return { ok: true };
  }

  // ---- puxar e enviar
  async syncNow() {
    if (this.busy || !this.session || !this.code || !this.key) return { ok: false, error: 'not_ready' };
    this.busy = true;
    if (this.phase !== 'off') this.#setPhase('syncing');
    try {
      await this.pullOnce();
      await this.pushOnce();
      this.lastSyncAt = now();
      this.#setPhase('ready');
      this.#emit();
      return { ok: true };
    } catch (e) {
      const offline = e.code === 'offline';
      if (e.code === 'auth_invalid') { this.token = null; this.#setPhase('signedOut'); }
      else this.#setPhase(offline ? 'offline' : 'error', e.message || 'Não foi possível sincronizar.');
      return { ok: false, error: e.code || 'error', message: e.message };
    } finally { this.busy = false; }
  }

  async pullOnce() {
    let rounds = 0, changed = false, conflicts = 0;
    let state = this.getState();
    /** aplica um registro vindo da nuvem (evento ou retrato), respeitando a edição local pendente */
    const applyIncoming = async rec => {
      const k = rk(rec.col, rec.id);
      const ts = Number(rec.ts) || 0;
      const localTs = this.dirty.get(k) || 0;
      this.seen[k] = ts;
      if (rec.deleted) {
        if (localTs && localTs >= ts) return; // a minha alteração é mais nova: ela sobe depois
        const s2 = applyRecord(state, rec.col, rec.id, null);
        if (s2 !== state) { state = s2; changed = true; }
        this.dirty.delete(k);
        return;
      }
      let value = null;
      try { value = sanitize(rec.col, rec.id, await unseal(this.key, rec.col, rec.id, rec.blob)); } catch { return; }
      if (!value) return;
      if (localTs) {
        if (localTs >= ts) return; // a minha versão fica; ela sobe no próximo envio
        this.dirty.delete(k); conflicts++;
      }
      const s2 = applyRecord(state, rec.col, rec.id, value);
      if (s2 !== state) { state = s2; changed = true; }
    };
    while (rounds++ < 12) {
      const j = await this.#call('pull', { since: this.lastSeq, exclude: this.deviceId });
      if (j.full) {
        const used = new Set();
        for (const rec of (Array.isArray(j.records) ? j.records : [])) {
          if (!COLS.includes(rec.col) && rec.col !== 'settings') continue;
          used.add(rk(rec.col, rec.id));
          await applyIncoming({ col: rec.col, id: rec.id, ts: rec.ts, deleted: rec.deleted, blob: rec.blob });
        }
        // o que sumiu da nuvem (compactação ou “apagar dados da nuvem”) e não tem alteração local pendente também some daqui
        for (const [k] of stateRecords(state)) {
          if (used.has(k) || this.dirty.has(k)) continue;
          const [col, id] = k.split('\u0000');
          const s2 = applyRecord(state, col, id, null);
          if (s2 !== state) { state = s2; changed = true; }
        }
      } else {
        for (const ev of (Array.isArray(j.events) ? j.events : [])) {
          if (!COLS.includes(ev.col) && ev.col !== 'settings') continue;
          await applyIncoming({ col: ev.col, id: ev.id, ts: ev.ts, deleted: ev.deleted, blob: ev.blob });
        }
      }
      this.lastSeq = Math.max(this.lastSeq, Number(j.lastSeq) || 0);
      this.#persistSoon();
      if (!j.hasMore) break;
    }
    if (changed) this.#applyState(state);
    if (conflicts) this.notify('Alterações de outra pessoa', conflicts === 1
      ? 'Um registro foi alterado por outra pessoa antes da sua alteração. A versão mais recente foi mantida.'
      : `${conflicts} registros foram alterados por outra pessoa antes das suas alterações. As versões mais recentes foram mantidas.`);
    if (changed || conflicts) this.#emit();
  }

  /** Sobe as pendências. localWins: sobrescrever a nuvem mesmo que ela tenha mudado. */
  async pushOnce({ localWins = false } = {}) {
    let rounds = 0, applied = 0, conflicts = 0;
    const force = new Map(); // chave → versão da nuvem aceita como base para sobrescrever
    while (this.dirty.size && rounds++ < 8) {
      const recs = stateRecords(this.getState());
      const keys = [...this.dirty.keys()].slice(0, 100);
      const changes = [];
      for (const k of keys) {
        const r = recs.get(k);
        const base = force.has(k) ? force.get(k) : (this.seen[k] || 0);
        if (!r) changes.push({ col: k.split('\u0000')[0], id: k.split('\u0000')[1], baseTs: base, deleted: true });
        else changes.push({ col: r.col, id: r.id, baseTs: base, deleted: false, blob: await seal(this.key, r.col, r.id, r.value) });
      }
      const j = await this.#call('push', { changes, updater: this.deviceId });
      for (const a of j.applied || []) {
        const k = rk(a.col, a.id);
        this.dirty.delete(k); force.delete(k);
        this.seen[k] = Number(a.ts) || 0;
        applied++;
      }
      for (const c of j.conflicts || []) {
        const k = rk(c.col, c.id);
        const myTs = this.dirty.get(k) || 0;
        if (c.deleted) {
          if (localWins || myTs >= (Number(c.ts) || 0)) { force.set(k, Number(c.ts) || 0); continue; } // sobrescreve a exclusão
          this.dirty.delete(k);
          const s2 = applyRecord(this.getState(), c.col, c.id, null);
          if (s2 !== this.getState()) this.#applyState(s2);
          conflicts++;
          continue;
        }
        if (localWins || myTs >= (Number(c.ts) || 0)) { force.set(k, Number(c.ts) || 0); continue; } // mantém a minha e tenta de novo
        this.dirty.delete(k);
        this.seen[k] = Number(c.ts) || 0;
        let value = null;
        try { value = sanitize(c.col, c.id, await unseal(this.key, c.col, c.id, c.blob)); } catch { /* fica como está */ }
        if (value != null) {
          const s2 = applyRecord(this.getState(), c.col, c.id, value);
          if (s2 !== this.getState()) { this.#applyState(s2); }
        }
        conflicts++;
      }
      this.lastSeq = Math.max(this.lastSeq, Number(j.lastSeq) || 0);
      await this.#persist();
      const stuck = keys.filter(k => this.dirty.has(k) && !force.has(k));
      if (stuck.length === keys.length) break; // nada avançou; evita laço infinito
    }
    if (conflicts) this.notify('Alterações de outra pessoa', conflicts === 1
      ? 'Um registro que você alterou também foi alterado por outra pessoa. A versão mais recente foi mantida.'
      : `${conflicts} registros também foram alterados por outra pessoa. As versões mais recentes foram mantidas.`);
    if (applied || conflicts) this.#emit();
    return { applied, conflicts };
  }

  /** Envia todos os registros deste aparelho para a nuvem (a versão daqui prevalece). */
  async resendAll() {
    this.dirty = new Map([...stateRecords(this.getState()).keys()].map(k => [k, now()]));
    await this.#persist();
    try { return { ok: true, ...(await this.pushOnce({ localWins: true })) }; }
    catch (e) { return { ok: false, error: e.code || 'error', message: e.message }; }
  }

  /** Apaga tudo o que está na nuvem (admin). O código da casa e os membros continuam. */
  async wipeCloud() {
    try {
      const j = await this.#call('wipe', { confirm: 'APAGAR' });
      this.seen = {}; this.dirty = new Map(); this.lastSeq = Math.max(this.lastSeq, Number(j.lastSeq) || 0);
      await this.#persist();
      this.#emit();
      return { ok: true };
    } catch (e) { return { ok: false, error: e.code || 'error', message: e.message }; }
  }

  async members() {
    try { const j = await this.#call('members', {}); return { ok: true, members: j.members || [] }; }
    catch (e) { return { ok: false, error: e.code || 'error', message: e.message }; }
  }
  async memberAdd(email) {
    try { const j = await this.#call('member-add', { email }); return { ok: true, members: j.members || [] }; }
    catch (e) { return { ok: false, error: e.code || 'error', message: e.message }; }
  }
  async memberRemove(email) {
    try { const j = await this.#call('member-remove', { email }); return { ok: true, members: j.members || [] }; }
    catch (e) { return { ok: false, error: e.code || 'error', message: e.message }; }
  }

  /** Código da casa atual, para mostrar/copiar. */
  currentCode() { return this.code; }

  // ---- infraestrutura
  async #googleToken(silent, render = null) {
    try {
      const t = await this.google.requestToken({ silent, render, clientId: this.clientId });
      if (t?.credential) { this.token = t; return t; }
    } catch (e) { console.warn('google', e); }
    return null;
  }
  async #call(action, params) {
    if (!this.token) {
      const t = await this.#googleToken(true);
      if (!t) { this.#setPhase('signedOut'); const e = new Error('Sessão do Google expirada.'); e.code = 'auth_invalid'; throw e; }
    }
    try {
      return await this.cloud.call(action, params, this.token.credential);
    } catch (e) {
      if (e.code === 'auth_invalid') { this.token = null; }
      throw e;
    }
  }
  #snapshotState(state = this.getState()) {
    const recs = stateRecords(state || newState());
    this.snap = new Map([...recs].map(([k, r]) => [k, { col: r.col, id: r.id, json: JSON.stringify(r.value) }]));
  }
  #applyState(state) {
    this.applying = true;
    try { this.apply(state); } finally { this.applying = false; }
    this.#snapshotState(state);
  }
  #persistSoon() {
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.#persist(), 1200);
  }
  async #persist() {
    clearTimeout(this.persistTimer);
    await Promise.all([
      idbPut('seen', this.seen),
      idbPut('dirty', Object.fromEntries(this.dirty)),
      idbPut('lastSeq', this.lastSeq),
      this.code ? idbPut('code', this.code) : Promise.resolve(),
    ]);
  }
}
