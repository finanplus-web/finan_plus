// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Backup criptografado com senha (tradução de core/BackupCrypto.kt do Finan+ Android; BACKUP-AUTOMATICO.md).
// O mesmo formato aberto nos três apps, com algoritmos padrão (aqui, WebCrypto):
//
//   {"format":"finanplus-backup-cifrado","v":1,"kdf":"PBKDF2-HMAC-SHA256","iter":310000,
//    "salt":"<16 bytes, base64>","cipher":"AES-256-GCM","iv":"<12 bytes, base64>","data":"<texto cifrado + tag, base64>"}
//
// Dentro de "data" está o backup JSON comum (o mesmo do "Backup JSON"). Chave: PBKDF2-HMAC-SHA256(senha em UTF-8,
// salt, iter) → 32 bytes. Ao ler, só aceita v = 1 e iter entre 100.000 e 5.000.000.

export const BackupCrypto = {
  FORMAT: 'finanplus-backup-cifrado',
  ITER: 310_000,
  MIN_PASSWORD: 8,
  MIN_ITER: 100_000,
  MAX_ITER: 5_000_000,

  /** o texto é um backup criptografado do Finan+ (só olha o envelope; não precisa da senha) */
  isEncrypted(text) {
    try { const o = JSON.parse(String(text).replace(/^﻿/, '')); return !!o && typeof o === 'object' && o.format === BackupCrypto.FORMAT; } catch { return false; }
  },

  async encrypt(plain, password, iter = BackupCrypto.ITER) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, iter);
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, new TextEncoder().encode(plain)));
    return JSON.stringify({ format: BackupCrypto.FORMAT, v: 1, kdf: 'PBKDF2-HMAC-SHA256', iter, salt: b64e(salt), cipher: 'AES-256-GCM', iv: b64e(iv), data: b64e(data) });
  },

  /** devolve o backup JSON de dentro; lança BackupCryptoError com senha errada ou arquivo danificado */
  async decrypt(text, password) {
    let o;
    try { o = JSON.parse(String(text).replace(/^﻿/, '')); } catch { o = null; }
    if (!o || typeof o !== 'object') throw new BackupCryptoError('Arquivo danificado');
    if (o.format !== BackupCrypto.FORMAT) throw new BackupCryptoError('Não é um backup criptografado do Finan+');
    if (o.v !== 1) throw new BackupCryptoError('Este backup foi feito por uma versão mais nova do Finan+');
    const iter = o.iter;
    if (!Number.isInteger(iter) || iter < BackupCrypto.MIN_ITER || iter > BackupCrypto.MAX_ITER) throw new BackupCryptoError('Arquivo danificado');
    const salt = b64d(o.salt), iv = b64d(o.iv), data = b64d(o.data);
    if (salt.length !== 16 || iv.length !== 12 || data.length < 16) throw new BackupCryptoError('Arquivo danificado');
    const key = await deriveKey(password, salt, iter);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data));
    } catch { throw new BackupCryptoError('Senha incorreta ou arquivo danificado'); }
  },
};

export class BackupCryptoError extends Error {}

async function deriveKey(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function b64e(u) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function b64d(s) { try { return typeof s === 'string' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(0); } catch { return new Uint8Array(0); } }
