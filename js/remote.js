// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Modo remoto: o Finan+ web aberto pelo endereço do celular (Finan+ Android › Acesso pela rede).
//
// - O celular é o dono dos dados. Aqui nada financeiro é gravado no navegador: o estado vive em
//   memória e cada alteração é enviada ao celular (estado inteiro, no formato do backup).
// - Cada gravação leva a versão (rev) que foi lida. Se o celular mudou nesse meio-tempo, ele recusa
//   (409) e o app mostra a versão nova: uma alteração nunca apaga a de outro aparelho.
// - O acesso exige o código de 6 dígitos do celular e um toque em "Permitir" lá. O token fica só em
//   sessionStorage (some ao fechar a aba).
// - Fora do modo remoto este módulo não faz nada: o Finan+ web continua lendo e gravando no navegador.
import { normalize, toJson } from './core.js';
import { ConflictError } from './store.js';
import { esc } from './ui.js';

/** A página foi servida pelo celular (o servidor do app acrescenta esta marca no index.html). */
export const isRemote = () => typeof document !== 'undefined' && !!document.querySelector('meta[name="finanplus-remote"]');

const TOKEN_KEY = 'finanplus-lan-token';
const ss = () => { try { return globalThis.sessionStorage || null; } catch { return null; } };
export const getToken = () => { try { return ss()?.getItem(TOKEN_KEY) || null; } catch { return null; } };
export const setToken = t => { try { t ? ss()?.setItem(TOKEN_KEY, t) : ss()?.removeItem(TOKEN_KEY); } catch { /* sem sessionStorage: só nesta página */ } };

export class RemoteError extends Error {
  constructor(status, title, message, body) { super(message); this.status = status; this.title = title; this.body = body; }
}

/** Chamada à API do celular. status 0 = sem conexão. */
export async function call(method, path, body, fetchImpl = globalThis.fetch) {
  const t = getToken();
  let res;
  try {
    res = await fetchImpl(path, {
      method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new RemoteError(0, 'Sem conexão com o celular', 'Confira se o acesso pela rede continua ligado no celular e se os dois estão no mesmo Wi-Fi.');
  }
  let j = null;
  try { j = await res.json(); } catch { /* sem corpo */ }
  if (!res.ok) throw new RemoteError(res.status, j?.title || 'Erro', j?.message || ('Erro ' + res.status), j);
  return j;
}

/**
 * Mesmo jeito de usar do Store (store.js): open(), save(state), reload()…, mas os dados ficam no celular.
 */
export class RemoteStore {
  constructor(fetchImpl = globalThis.fetch) {
    this.fetch = fetchImpl;
    this.mode = 'remote'; this.locked = false; this.noDb = false; this.savedAt = 0;
    this.rev = undefined;        // versão dos dados lida do celular
    this.themeRev = undefined;   // parte "cores" da revisão (Material You / modo escuro do celular)
    this.palette = null;         // cores do tema do app, para ficar igual ao celular
    this.queue = Promise.resolve();
    this.onUnauthorized = null;  // token perdido (servidor reiniciado, aparelho desconectado no celular)
  }

  get encrypted() { return true; } // HTTPS, e nada gravado neste navegador
  get remote() { return true; }

  #call(method, path, body) {
    return call(method, path, body, this.fetch).catch(e => { if (e.status === 401) this.onUnauthorized?.(); throw e; });
  }

  /** Resposta do celular validada antes de usar: versão inteira, dados num objeto, cores num objeto (ou nada). */
  #take(j) {
    if (!j || !Number.isSafeInteger(j.rev) || j.rev < 0 || !j.data || typeof j.data !== 'object' || Array.isArray(j.data)) {
      throw new RemoteError(502, 'Resposta inválida do celular', 'Os dados recebidos não estão no formato esperado. Nada foi alterado.');
    }
    this.rev = j.rev;
    this.palette = j.palette && typeof j.palette === 'object' ? j.palette : null;
    return normalize(j.data);
  }

  async open() {
    const n = this.#take(await this.#call('GET', '/api/remote/state'));
    return { status: 'ok', state: n.state, dropped: n.droppedTotal };
  }

  async reload() { return this.#take(await this.#call('GET', '/api/remote/state')).state; }

  /** grava no celular (em fila: gravações nunca se sobrepõem) */
  save(state) {
    const data = JSON.parse(toJson(state));
    const job = this.queue.then(async () => {
      try {
        const j = await this.#call('PUT', '/api/remote/state', { rev: this.rev, data });
        if (!Number.isSafeInteger(j?.rev)) throw new RemoteError(502, 'Resposta inválida do celular', 'Confirmação de gravação sem versão.');
        this.rev = j.rev; this.savedAt = Date.now();
      } catch (e) {
        if (e.status === 409) throw new ConflictError('Os dados foram alterados no celular.');
        throw e;
      }
    });
    this.queue = job.catch(() => {});
    return job;
  }

  /**
   * Algo mudou no celular desde a última leitura? Consulta leve, que não conta como uso
   * (o servidor continua desligando sozinho após 10 min parado).
   */
  async changed() {
    const j = await this.#call('GET', '/api/rev');
    if (!Number.isSafeInteger(j?.data) || typeof j.rev !== 'string') throw new RemoteError(502, 'Resposta inválida do celular', 'Versão em formato inesperado.');
    const theme = j.rev.split('-')[1] || '';
    const themeChanged = this.themeRev !== undefined && theme !== this.themeRev;
    this.themeRev = theme;
    return themeChanged || j.data !== this.rev;
  }

  async logout() { try { await this.#call('POST', '/api/logout'); } catch { /* já desconectado */ } setToken(null); }

  // o restante do Store não se aplica: os dados não ficam aqui
  async startOver() { this.locked = false; }
  async unreadableExport() { return null; }
  async wipe() { throw new Error('Apague os dados pelo celular.'); }
  close() {}
  static async persist() { return false; }
}

// ------------------------------------------------------------------ pareamento (código + "Permitir" no celular)
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Mostra a tela "Conectar ao celular" em [el] (o mesmo contêiner da tela do PIN) e resolve quando o
 * celular permitir. [message] aparece em destaque (ex.: "Conexão expirada").
 */
export function pairFlow(el, message = '') {
  return new Promise(resolve => {
    const shell = document.getElementById('shell');
    if (shell) shell.inert = true;
    el.hidden = false;
    let waiting = null;

    const form = (err = '') => {
      waiting = null;
      el.innerHTML = `<div class="lockBox glass pairBox" role="dialog" aria-modal="true" aria-labelledby="pairTitle">
        <img src="icons/icon-192.png" alt="" width="64" height="64">
        <h2 id="pairTitle">Conectar ao celular</h2>
        <p class="muted">No celular, abra <b>Ajustes › Acesso pela rede (beta)</b> e digite o código de 6 dígitos mostrado lá.</p>
        <form id="pairForm" novalidate autocomplete="off">
          <input id="pairCode" class="pairCode" inputmode="numeric" maxlength="7" aria-label="Código de pareamento" placeholder="000 000">
          <button type="submit" class="btn primary wide">Conectar</button>
        </form>
        <small id="pairErr" class="pinErr" role="alert">${esc(err)}</small>
        <p class="muted small">Conexão criptografada. Os dados ficam no celular; nada é gravado neste navegador.</p>
      </div>`;
      const inp = el.querySelector('#pairCode');
      inp.oninput = () => { const d = inp.value.replace(/\D/g, '').slice(0, 6); inp.value = d.length > 3 ? d.slice(0, 3) + ' ' + d.slice(3) : d; };
      el.querySelector('#pairForm').onsubmit = async e => {
        e.preventDefault();
        const code = inp.value.replace(/\s/g, '');
        const errEl = el.querySelector('#pairErr');
        if (!/^\d{6}$/.test(code)) { errEl.textContent = 'O código tem 6 dígitos.'; return; }
        errEl.textContent = 'Conectando…';
        try {
          const j = await call('POST', '/api/pair', { code });
          if (j?.token) return done(j.token);
          if (j?.pending) return wait(j.pending, j.label, j.timeout);
          errEl.textContent = 'Resposta inesperada do celular.';
        } catch (err) { errEl.textContent = err.message; }
      };
      inp.focus();
    };

    const wait = async (id, label, timeoutS) => {
      const me = {}; waiting = me;
      el.innerHTML = `<div class="lockBox glass pairBox" role="dialog" aria-modal="true" aria-labelledby="pairTitle">
        <div class="pairSpinner" aria-hidden="true"></div>
        <h2 id="pairTitle">Confirme no celular</h2>
        <p class="muted" role="status">O celular está perguntando se permite <b>${esc(label || 'este navegador')}</b>. Toque em <b>Permitir</b> lá.</p>
        <button type="button" class="btn soft" id="pairCancel">Cancelar</button>
      </div>`;
      el.querySelector('#pairCancel').onclick = () => form('Pedido cancelado.');
      const until = Date.now() + (timeoutS || 120) * 1000;
      while (waiting === me && Date.now() < until) {
        await sleep(1500);
        if (waiting !== me) return;
        try {
          const j = await call('GET', '/api/pair/' + encodeURIComponent(id));
          if (j.status === 'approved') return done(j.token);
          if (j.status === 'denied') return form('O acesso foi recusado no celular.');
        } catch (err) {
          if (err.status === 410) return form('O pedido expirou. Digite o novo código do celular.');
          return form(err.message);
        }
      }
      if (waiting === me) form('Sem resposta do celular. Digite o novo código e tente de novo.');
    };

    const done = token => {
      waiting = null;
      setToken(token);
      el.hidden = true; el.innerHTML = '';
      if (shell) shell.inert = false;
      resolve(token);
    };

    form(message);
  });
}

// ------------------------------------------------------------------ cores do tema do celular
// No Material You (cores do papel de parede do celular) as cores vêm do app. Nos demais temas,
// o CSS do Finan+ web já é igual ao do app.
const VARS = {
  bg: '--bg', surface: '--surface', text: '--text', muted: '--muted', accent: '--accent', onAccent: '--onAccent',
  accent2: '--accent2', red: '--red', green: '--green', track: '--track', glowA: '--glow1', glowB: '--glow2', border: '--line',
};
const opaque = c => String(c).replace(/^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/, 'rgba($1,$2,$3,1)');

/** Aplica (ou remove) as cores do celular. Devolve o data-theme base a usar, ou null para o padrão. */
export function applyPalette(root, palette, dark) {
  const p = palette ? (dark ? palette.dark : palette.light) : null;
  for (const v of [...Object.values(VARS), '--solid', '--field', '--surface2']) root.style.removeProperty(v);
  if (!p) return null;
  for (const [k, v] of Object.entries(VARS)) if (p[k]) root.style.setProperty(v, p[k]);
  if (p.surface) { root.style.setProperty('--solid', opaque(p.surface)); root.style.setProperty('--field', p.dark ? opaque(p.bg) : opaque(p.surface)); }
  return p.dark ? 'oledGray' : 'materialBlue';
}
