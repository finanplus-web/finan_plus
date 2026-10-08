// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Criptografia de ponta a ponta da nuvem (a "chave da casa").
//
// - A chave não existe em lugar nenhum: ela é derivada do "código da casa", um código aleatório de
//   24 caracteres (120 bits) que as pessoas da casa guardam e digitam uma vez em cada aparelho.
// - Tudo o que sobe para a nuvem é cifrado aqui antes: AES-GCM 256, IV novo a cada gravação, e o
//   nome da coleção + o id do registro entram como "dados adicionais" (um bloco não vale em outro lugar).
// - O serviço da nuvem (Google) guarda só blocos ilegíveis; sem o código não há como abrir.
// - Se o código for perdido E todos os aparelhos também, os dados da nuvem não têm como ser recuperados.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // base32 estilo Crockford (sem I, L, O, U)
const CODE_LEN = 24;                                  // 24 × 5 bits = 120 bits
const AD_PREFIX = 'finan-plus/nuvem/v1';
const enc = new TextEncoder(), dec = new TextDecoder();

const hasCrypto = () => typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.getRandomValues === 'function';

export function b64e(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function b64d(text) { return Uint8Array.from(atob(text), c => c.charCodeAt(0)); }

/** Gera um código da casa novo (24 caracteres, sem separadores). */
export function newCode() {
  if (!hasCrypto()) throw new Error('Este navegador não tem as funções de segurança necessárias.');
  const bytes = crypto.getRandomValues(new Uint8Array(15)); // 120 bits
  let out = '', acc = 0, bits = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(acc >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return out;
}

/** Aceita tudo que o usuário costuma colar (espaços, hífens, minúsculas) e conserta confusões comuns. */
export function normalizeCode(input) {
  return String(input ?? '')
    .toUpperCase().replace(/[^0-9A-Z]/g, '')
    .replace(/[IL]/g, '1').replace(/O/g, '0').replace(/U/g, 'V');
}

export function validCode(code) {
  const s = normalizeCode(code);
  return s.length === CODE_LEN && [...s].every(ch => ALPHABET.includes(ch));
}

/** "XXXX-XXXX-…" só para ler em voz alta ou anotar. */
export function formatCode(code) { return normalizeCode(code).replace(/(.{4})(?=.)/g, '$1-'); }

/**
 * Deriva a chave AES-GCM (não extraível) a partir do código da casa.
 * É determinística: o mesmo código gera a mesma chave em qualquer aparelho.
 */
export async function keyFromCode(code) {
  if (!hasCrypto()) throw new Error('Este navegador não tem as funções de segurança necessárias.');
  const s = normalizeCode(code);
  if (!validCode(s)) throw new Error('Código da casa incompleto ou inválido.');
  const material = await crypto.subtle.digest('SHA-256', enc.encode(`${AD_PREFIX}|chave|${s}`));
  return crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

const ad = (col, id) => enc.encode(`${AD_PREFIX}|${col}|${id}`);

/** Cifra um registro (objeto) para a nuvem. Devolve base64(iv + texto cifrado). */
export async function seal(key, col, id, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: ad(col, id) }, key, enc.encode(JSON.stringify(value))));
  const box = new Uint8Array(iv.length + ct.length);
  box.set(iv); box.set(ct, iv.length);
  return b64e(box);
}

/** Abre um registro vindo da nuvem. Lança se o código não for o mesmo ou o bloco estiver danificado. */
export async function unseal(key, col, id, text) {
  const raw = b64d(text);
  if (raw.length < 12 + 16) throw new Error('Registro cifrado inválido.');
  const iv = raw.subarray(0, 12), ct = raw.subarray(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: ad(col, id) }, key, ct);
  return JSON.parse(dec.decode(pt));
}
