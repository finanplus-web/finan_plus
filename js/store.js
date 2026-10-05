// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Armazenamento local do Finan+ web. Nada sai do aparelho.
//
// - Dados: criptografados com AES-GCM 256 (WebCrypto). A chave é criada no próprio navegador como
//   "não extraível" (nem o código da página consegue lê-la) e fica no IndexedDB, junto com os dados
//   cifrados. Cada gravação guarda também a versão anterior, na mesma transação.
// - Sem WebCrypto/IndexedDB (navegadores muito antigos ou modos restritos): grava sem criptografia
//   no localStorage e a tela de Ajustes avisa.
// - Nunca sobrescreve o que não conseguiu abrir: se a chave não abre os dados, o app mostra a tela
//   de problema e não grava nada até o usuário decidir.
// - Configurações deste aparelho (hash do PIN, avisos, assistente, dicas dispensadas) ficam à parte,
//   no localStorage, e nunca vão para o backup.
// - Migração automática do Finan+ web antigo ("Minhas Finanças", chaves mf_v2 / mf_txs).
import { normalize, toJson, newState } from './core.js';

export const DB_NAME = 'finan-plus';
const DB_VERSION = 1;
const LS_PLAIN = 'finanplus_plain';
const LS_DEVICE = 'finanplus_device';
const LEGACY = ['mf_v2', 'mf_txs'];
const enc = new TextEncoder(), dec = new TextDecoder();

function b64e(u) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
const hasCrypto = () => typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.getRandomValues === 'function';
const hasIdb = () => typeof indexedDB !== 'undefined';
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };

// ------------------------------------------------------------------ IndexedDB mínimo
function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('Banco de dados bloqueado por outra aba'));
  });
}
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function idbGet(db, k) { return reqP(db.transaction('kv').objectStore('kv').get(k)); }
function idbTx(db, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction('kv', 'readwrite');
    fn(t.objectStore('kv'));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Gravação cancelada'));
  });
}

// ------------------------------------------------------------------ cifra
async function encrypt(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('finan-plus/v1') }, key, enc.encode(text));
  return { v: 1, iv, ct: new Uint8Array(ct), savedAt: Date.now() };
}
async function decrypt(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv, additionalData: enc.encode('finan-plus/v1') }, key, box.ct);
  return dec.decode(pt);
}

/**
 * Store: abre, lê e grava. Uso:
 *   const st = new Store(); const r = await st.open();
 *   r.status: 'ok' (dados lidos), 'new' (nada salvo ainda), 'problem' (não abriu; nada será gravado)
 *   await st.save(state)
 */
/** outra aba gravou depois da última leitura desta: recarregue antes de gravar */
export class ConflictError extends Error {}
const newRev = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');

export class Store {
  constructor() { this.db = null; this.key = null; this.mode = 'none'; this.locked = false; this.noDb = false; this.queue = Promise.resolve(); this.savedAt = 0; this.rev = undefined; }

  get encrypted() { return this.mode === 'idb'; }

  async open() {
    const legacy = readLegacy();
    if (hasCrypto() && hasIdb()) {
      let dbErr = null;
      try { this.db = await openDb(); } catch (e) { dbErr = e; }
      // aberto direto da pasta (file://), alguns navegadores não oferecem IndexedDB: segue sem criptografia, com aviso
      if (dbErr && globalThis.location?.protocol === 'file:') this.db = null;
      else if (dbErr) {
        const e = dbErr;
        // IndexedDB existe mas não abriu (outra aba bloqueando, modo restrito…): não arrisca mostrar um app vazio
        this.noDb = true;
        return this.#problem('O navegador não permitiu abrir o armazenamento local (IndexedDB). Feche outras abas do Finan+ e recarregue a página. (' + (e?.message || e) + ')');
      }
      if (this.db) try {
        this.mode = 'idb';
        let box = await idbGet(this.db, 'data');
        let key = await idbGet(this.db, 'key');
        if (box && !key) return this.#problem('A chave que protege seus dados não foi encontrada neste navegador.');
        if (box) {
          let text;
          try { text = await decrypt(key, box); } catch {
            const prev = await idbGet(this.db, 'previous');
            if (prev) { try { text = await decrypt(key, prev); box = prev; } catch { /* segue para o problema */ } }
            if (text == null) return this.#problem('Os dados salvos não puderam ser abertos com a chave deste navegador.');
          }
          const cur = await idbGet(this.db, 'data');
          this.key = key; this.savedAt = box.savedAt || 0; this.rev = cur?.rev;
          const n = normalize(JSON.parse(text));
          return { status: 'ok', state: n.state, dropped: n.droppedTotal };
        }
        this.key = key || await this.#ensureKey();
        // primeira abertura com criptografia: traz dados sem criptografia (versão antiga ou modo sem cifra)
        const plain = readPlain() ?? legacy;
        if (plain) {
          const n = normalize(plain.raw);
          await this.save(n.state);              // só apaga o texto aberto depois de confirmar a gravação cifrada
          await this.#verify();
          this.#cleanupPlain(true);
          return { status: 'ok', state: n.state, dropped: n.droppedTotal, migrated: plain.from, legacyPin: plain.pin };
        }
        return { status: 'new', state: newState() };
      } catch (e) { // IndexedDB abriu mas falhou ao ler: não arrisca sobrescrever
        return this.#problem('Não foi possível ler o armazenamento do navegador: ' + (e?.message || e));
      }
    }
    // sem criptografia disponível
    this.mode = ls() ? 'plain' : 'none';
    const plain = readPlain() ?? legacy;
    if (plain) {
      const n = normalize(plain.raw);
      return { status: 'ok', state: n.state, dropped: n.droppedTotal, migrated: plain.from === LS_PLAIN ? null : plain.from, legacyPin: plain.pin };
    }
    return { status: 'new', state: newState() };
  }

  #problem(message) { this.locked = true; return { status: 'problem', message, state: newState() }; }

  /** cria a chave só se ainda não existir, numa única transação (duas abas abrindo juntas usam a mesma) */
  async #ensureKey() {
    const fresh = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return new Promise((res, rej) => {
      const t = this.db.transaction('kv', 'readwrite'), st = t.objectStore('kv');
      let key = null;
      const g = st.get('key');
      g.onsuccess = () => { if (g.result) key = g.result; else { key = fresh; st.put(fresh, 'key'); } };
      t.oncomplete = () => res(key);
      t.onerror = () => rej(t.error);
    });
  }

  /** relê os dados gravados (outra aba salvou). Devolve o estado. */
  async reload() {
    if (this.mode !== 'idb') { const p = readPlain(); return p ? normalize(p.raw).state : newState(); }
    const key = await idbGet(this.db, 'key'), box = await idbGet(this.db, 'data');
    if (!box) { this.key = key || this.key; this.rev = undefined; return newState(); }
    const text = await decrypt(key, box);
    const n = normalize(JSON.parse(text));
    this.key = key; this.rev = box.rev; this.savedAt = box.savedAt || 0;
    return n.state;
  }

  close() { try { this.db?.close(); } catch { /* ignore */ } }

  async #verify() {
    const box = await idbGet(this.db, 'data');
    const text = await decrypt(this.key, box);
    normalize(JSON.parse(text));
  }

  #cleanupPlain(all = false) {
    const l = ls();
    if (!l) return;
    try { l.removeItem(LS_PLAIN); if (all) for (const k of LEGACY) l.removeItem(k); } catch { /* sem acesso */ }
  }

  /** grava o estado (em fila: gravações nunca se sobrepõem) */
  save(state) {
    const json = toJson(state);
    const job = this.queue.then(async () => {
      if (this.locked) throw new Error('Os dados não foram abertos; nada foi gravado.');
      if (this.mode === 'idb') {
        const box = await encrypt(this.key, json);
        box.rev = newRev();
        await new Promise((res, rej) => { // confere e grava na mesma transação: nunca grava por cima do que outra aba salvou
          const t = this.db.transaction('kv', 'readwrite'), st = t.objectStore('kv');
          let conflict = false;
          const g = st.get('data');
          g.onsuccess = () => {
            const cur = g.result;
            if (cur && cur.rev !== this.rev) { conflict = true; t.abort(); return; }
            if (cur) st.put(cur, 'previous');
            st.put(box, 'data');
          };
          t.oncomplete = () => res();
          t.onabort = () => rej(conflict ? new ConflictError('Os dados foram alterados em outra aba.') : (t.error || new Error('Gravação cancelada')));
          t.onerror = e => { if (conflict) e.preventDefault(); };
        });
        this.savedAt = box.savedAt; this.rev = box.rev;
      } else if (this.mode === 'plain') {
        ls().setItem(LS_PLAIN, json);
        this.savedAt = Date.now();
      } else throw new Error('Este navegador não permite guardar dados.');
    });
    this.queue = job.catch(() => {});
    return job;
  }

  /** "Começar do zero" na tela de problema: guarda os dados ilegíveis à parte (nada é apagado) e cria chave nova */
  async startOver() {
    if (this.noDb) { this.mode = ls() ? 'plain' : 'none'; this.locked = false; return; } // segue sem criptografia, com aviso
    if (this.mode !== 'idb') { this.locked = false; return; }
    const box = await idbGet(this.db, 'data'), prev = await idbGet(this.db, 'previous'), oldKey = await idbGet(this.db, 'key');
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await idbTx(this.db, s => {
      s.put({ data: box || null, previous: prev || null, key: oldKey || null, at: Date.now() }, 'unreadable-' + Date.now());
      s.delete('data'); s.delete('previous'); s.put(key, 'key');
    });
    this.key = key; this.locked = false; this.rev = undefined;
  }

  /** dados cifrados ilegíveis, para o usuário guardar (tela de problema) */
  async unreadableExport() {
    if (!this.db) return null;
    const box = await idbGet(this.db, 'data');
    if (!box) return null;
    return JSON.stringify({ finanPlusEncrypted: 1, alg: 'AES-GCM-256', iv: b64e(box.iv), ct: b64e(box.ct), savedAt: box.savedAt });
  }

  /** Apagar tudo: dados, versão anterior e chave (uma chave nova é criada na próxima gravação) */
  async wipe() {
    const l = ls();
    if (l) try { l.removeItem(LS_PLAIN); for (const k of LEGACY) l.removeItem(k); } catch { /* ignore */ }
    if (this.mode === 'idb') {
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await idbTx(this.db, s => { s.clear(); s.put(key, 'key'); });
      this.key = key; this.rev = undefined;
    }
  }

  /** pede ao navegador para não apagar os dados quando faltar espaço */
  static async persist() {
    try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
  }
}

function readPlain() {
  const l = ls();
  if (!l) return null;
  try { const t = l.getItem(LS_PLAIN); if (t) return { raw: JSON.parse(t), from: LS_PLAIN }; } catch { /* ilegível */ }
  return null;
}

/** Finan+ web antigo ("Minhas Finanças"): mf_v2 com o estado inteiro, ou mf_txs só com lançamentos */
function readLegacy() {
  const l = ls();
  if (!l) return null;
  try {
    const o = l.getItem('mf_v2');
    if (o) { const raw = JSON.parse(o); return { raw, from: 'mf_v2', pin: typeof raw?.pin === 'string' ? raw.pin : '' }; }
    const t = l.getItem('mf_txs');
    if (t) return { raw: { txs: JSON.parse(t) }, from: 'mf_txs', pin: '' };
  } catch { /* ilegível: ignora */ }
  return null;
}

// ------------------------------------------------------------------ configurações deste aparelho
export const DEVICE_DEFAULTS = {
  pinHash: '', notifications: false, lastNotified: '', assistCategory: true, assistTips: true, assistAsk: true,
  dismissedTips: [], pinFails: 0, pinWaitUntil: 0, notice: '',
};
export function loadDevice() {
  const l = ls();
  try { const o = l && JSON.parse(l.getItem(LS_DEVICE) || 'null'); if (o && typeof o === 'object') return { ...DEVICE_DEFAULTS, ...o, dismissedTips: Array.isArray(o.dismissedTips) ? o.dismissedTips.filter(x => typeof x === 'string').slice(-300) : [] }; } catch { /* padrão */ }
  return { ...DEVICE_DEFAULTS, dismissedTips: [] };
}
export function saveDevice(d) {
  const l = ls();
  try { l?.setItem(LS_DEVICE, JSON.stringify(d)); return true; } catch { return false; }
}
export function wipeDevice() { try { ls()?.removeItem(LS_DEVICE); } catch { /* ignore */ } }

// ------------------------------------------------------------------ PIN
export const PIN_ITERATIONS = 210000;
export const pinValidFormat = p => /^\d{4,8}$/.test(String(p ?? ''));
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function pbkdf2(pin, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256));
}
const sameBytes = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };

/** hash do PIN: "pbkdf2-sha256$iterações$sal$hash" (sal aleatório de 16 bytes) */
export async function hashPin(pin) {
  if (!hasCrypto()) throw new Error('Este navegador não tem as funções de segurança necessárias para o PIN.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${PIN_ITERATIONS}$${b64e(salt)}$${b64e(await pbkdf2(pin, salt, PIN_ITERATIONS))}`;
}

/** Confere o PIN. upgrade = true quando o hash é do formato antigo e deve ser regravado. */
export async function verifyPin(pin, stored) {
  if (!stored) return { ok: false, upgrade: false };
  if (stored.startsWith('pbkdf2-sha256$')) {
    const [, it, salt, hash] = stored.split('$');
    const n = parseInt(it, 10);
    if (!(n >= 1000 && n <= 10000000)) return { ok: false, upgrade: false };
    return { ok: sameBytes(await pbkdf2(pin, b64d(salt), n), b64d(hash)), upgrade: n < PIN_ITERATIONS };
  }
  // Finan+ web antigo: SHA-256 de "mf"+PIN em hexadecimal, ou "p"+PIN quando o navegador não tinha WebCrypto
  if (/^[0-9a-f]{64}$/.test(stored) && hasCrypto()) {
    const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode('mf' + pin)))].map(b => b.toString(16).padStart(2, '0')).join('');
    return { ok: sameBytes(enc.encode(h), enc.encode(stored)), upgrade: true };
  }
  if (stored.startsWith('p') && /^p\d+$/.test(stored)) return { ok: stored === 'p' + pin, upgrade: true };
  return { ok: false, upgrade: false };
}

/** Espera crescente a partir do 5º erro seguido: 30 s, 60 s, 90 s… (como no app Android) */
export const Throttle = {
  waitSeconds(d, now = Date.now()) { return d.pinWaitUntil > now ? Math.ceil((d.pinWaitUntil - now) / 1000) : 0; },
  fail(d, now = Date.now()) { const fails = (d.pinFails || 0) + 1; return { ...d, pinFails: fails, pinWaitUntil: fails >= 5 ? now + 30000 * (fails - 4) : 0 }; },
  reset: d => ({ ...d, pinFails: 0, pinWaitUntil: 0 }),
};
