// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Login com o Google (Google Identity Services) para a nuvem.
//
// - O script do Google é baixado só quando a nuvem é usada pela primeira vez; o resto do app continua
//   sem nenhuma dependência externa.
// - O resultado é um "ID token" (JWT) que comprova para o serviço da nuvem qual conta Google entrou.
//   Ele fica só na memória desta página: nada de token em disco, e nada financeiro passa por aqui.
// - No modo de teste (clientId 'dev-mock') devolve um token de mentira, para desenvolvimento local.
const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisPromise = null;

/** Carrega o script do Google (uma vez). */
export function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (globalThis.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = GIS_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { gisPromise = null; reject(new Error('Não foi possível carregar o login do Google. Confira a internet.')); };
    document.head.append(s);
  });
  return gisPromise;
}

/** Decodifica a parte pública do JWT (e-mail, nome, validade). Não valida assinatura: quem valida é o serviço. */
export function decodeCredential(jwt) {
  const part = String(jwt || '').split('.')[1];
  if (!part) return null;
  try {
    const s = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const j = JSON.parse(s);
    return { email: typeof j.email === 'string' ? j.email : '', name: typeof j.name === 'string' ? j.name : '', exp: Number(j.exp) || 0 };
  } catch { return null; }
}

/**
 * Pede um ID token ao Google.
 *
 * - `render(el)`: coloca o botão oficial do Google dentro de [el]; a promessa resolve quando a pessoa entrar.
 * - `silent: true`: tenta entrar sem interação (One Tap), com prazo curto; resolve null se não der.
 * - sem opções: dispara o One Tap e espera; resolve null se a pessoa fechar.
 *
 * Em todos os modos resolve com { credential, email, name, exp } ou null.
 */
export async function requestGoogleToken({ clientId, silent = false, render = null, timeoutMs = silent ? 8000 : 0 } = {}) {
  if (clientId === 'dev-mock') {
    // desenvolvimento local (tools/mock-cloud.mjs): token de mentira, sem falar com o Google
    const email = (globalThis.FinanPlus?.mockEmail || 'dev@finanplus.local').toLowerCase();
    return { credential: 'dev:' + email, email, name: 'Desenvolvimento', exp: Math.floor(Date.now() / 1000) + 3600 };
  }
  await loadGis();
  return new Promise(resolve => {
    let done = false;
    let timer = null;
    const finish = t => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(t);
    };
    const accept = r => {
      const c = r?.credential;
      const d = decodeCredential(c);
      finish(c && d && d.email ? { credential: c, ...d } : null);
    };
    globalThis.google.accounts.id.initialize({
      client_id: clientId,
      callback: accept,
      auto_select: silent,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });
    if (render) {
      globalThis.google.accounts.id.renderButton(render, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'pt-BR', width: 280 });
      return; // o botão resolve a promessa pelo callback
    }
    globalThis.google.accounts.id.prompt(n => {
      if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.() || n?.isDismissedMoment?.()) finish(null);
    });
    if (silent && timeoutMs) timer = setTimeout(() => finish(null), timeoutMs);
  });
}

/** "Sair" também desliga a entrada automática das próximas vezes. */
export function disableGoogleAutoSelect() {
  try { globalThis.google?.accounts?.id?.disableAutoSelect?.(); } catch { /* ignore */ }
}
