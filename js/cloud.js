// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Nuvem do Finan+ (Google Apps Script + Planilhas): configuração e chamadas.
//
// - A configuração do serviço (URL do script publicado e ID do cliente Google) pode vir do arquivo
//   nuvem.json publicado junto do site ou, para testes/uso local, ser digitada em Ajustes.
// - As chamadas são requisições "simples" (Content-Type: text/plain), que é o que o Apps Script
//   aceita de um site estático sem o navegador bloquear por CORS. A resposta vem em JSON.
// - Aqui não há nenhum dado financeiro: só a chamada. O conteúdo vai cifrado (js/e2e.js).
const LS_CFG = 'finanplus_nuvem';          // configuração digitada em Ajustes (fica só neste aparelho)
const LS_SES = 'finanplus_nuvem_sessao';   // sessão (e-mail e nome vindo do Google; nada financeiro)
const TIMEOUT_MS = 25000;

const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export class CloudError extends Error {
  constructor(code, message, status = 0) { super(message); this.code = code; this.status = status; }
}

/** URL aceitável: HTTPS em qualquer lugar, ou HTTP só em localhost (servidor de testes). */
export function validCloudUrl(url) {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' || ((u.protocol === 'http:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
  } catch { return false; }
}

export function cloudReady(cfg) { return !!(cfg && validCloudUrl(cfg.url) && String(cfg.clientId || '').trim()); }

/** Configuração salva neste aparelho (Ajustes › Conta e nuvem), ou {url:'',clientId:''}. */
export function loadCloudConfig() {
  const l = ls();
  try {
    const o = l && JSON.parse(l.getItem(LS_CFG) || 'null');
    if (o && typeof o === 'object') return { url: String(o.url || ''), clientId: String(o.clientId || '') };
  } catch { /* padrão */ }
  return { url: '', clientId: '' };
}
export function saveCloudConfig(cfg) {
  const l = ls();
  try { l?.setItem(LS_CFG, JSON.stringify({ url: String(cfg.url || '').trim(), clientId: String(cfg.clientId || '').trim() })); return true; } catch { return false; }
}
export function clearCloudConfig() { try { ls()?.removeItem(LS_CFG); } catch { /* ignore */ } }

/** Configuração publicada com o site (nuvem.json); null se o arquivo não existir ou estiver vazio. */
export async function siteCloudConfig(fetchImpl = globalThis.fetch) {
  try {
    const r = await fetchImpl('nuvem.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const cfg = { url: String(j?.url || '').trim(), clientId: String(j?.clientId || '').trim() };
    return cloudReady(cfg) ? cfg : null;
  } catch { return null; }
}

/** Efetiva: o que foi digitado neste aparelho manda; senão vale o nuvem.json. */
export async function effectiveCloudConfig(fetchImpl = globalThis.fetch) {
  const local = loadCloudConfig();
  if (cloudReady(local)) return local;
  const site = await siteCloudConfig(fetchImpl);
  if (site) return site;
  return local.url || local.clientId ? local : null;
}

export function loadCloudSession() {
  const l = ls();
  try {
    const o = l && JSON.parse(l.getItem(LS_SES) || 'null');
    if (o && typeof o === 'object' && typeof o.email === 'string' && o.email) return { email: o.email, name: String(o.name || ''), isAdmin: !!o.isAdmin };
  } catch { /* sem sessão */ }
  return null;
}
export function saveCloudSession(s) { try { ls()?.setItem(LS_SES, JSON.stringify(s)); } catch { /* ignore */ } }
export function clearCloudSession() { try { ls()?.removeItem(LS_SES); } catch { /* ignore */ } }

/**
 * Cliente da API da nuvem. Uso: cloud.call('pull', {since}, token)
 * Lança CloudError: 'offline' (sem conexão), 'auth_invalid', 'not_member', 'setup_pending'… ou 'bad_response'.
 */
export class Cloud {
  constructor(url, fetchImpl = globalThis.fetch) { this.url = url; this.fetchImpl = fetchImpl; }

  async call(action, params = {}, token = null, o = {}) {
    const body = JSON.stringify({ v: 1, action, ...(token ? { token } : {}), ...params });
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => { try { ac?.abort(); } catch { /* ignore */ } }, o.timeoutMs || TIMEOUT_MS);
    const doFetch = this.fetchImpl || globalThis.fetch; // chamada "solta": o fetch nativo recusa outro this
    let res;
    try {
      res = await doFetch(this.url, {
        method: 'POST', cache: 'no-store', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body, ...(ac ? { signal: ac.signal } : {}),
      });
    } catch (e) {
      console.warn('nuvem: falha na chamada', e);
      throw new CloudError('offline', 'Sem conexão com a nuvem. Confira a internet e tente de novo.');
    } finally { clearTimeout(timer); }
    let j = null;
    try { j = await res.json(); } catch { /* corpo fora do formato */ }
    if (!j || typeof j !== 'object') throw new CloudError('bad_response', 'O serviço da nuvem respondeu em um formato inesperado.');
    if (!res.ok || j.ok !== true) {
      const code = typeof j.error === 'string' ? j.error : 'http_' + res.status;
      throw new CloudError(code, typeof j.message === 'string' && j.message ? j.message : ('Erro ' + res.status), res.status);
    }
    return j;
  }
}
