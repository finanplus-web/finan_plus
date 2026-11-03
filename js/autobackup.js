// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Backup automático numa pasta (BACKUP-AUTOMATICO.md), com a API de acesso a arquivos do navegador
// (File System Access: showDirectoryPicker). Existe no Chrome, Edge e outros navegadores Chromium no computador;
// nos outros (Firefox, Safari, Chrome do celular) a opção aparece desligada, com o motivo.
//
// - Uma cópia por dia, criptografada com senha (backupcrypto.js, o mesmo formato do Android), com o nome
//   finan-plus-auto-AAAA-MM-DD.json. No mesmo dia, a cópia nova substitui a anterior.
// - Um site não roda com o navegador fechado: a cópia do dia é feita quando o Finan+ é aberto (ou fica aberto)
//   e o dia virou. O navegador pode pedir de novo a permissão da pasta depois de reiniciado: o Finan+ avisa e
//   o botão "Permitir acesso à pasta" pede a permissão.
// - Guarda as últimas 7, 14 (padrão), 30 ou 60 cópias; apaga só arquivos com esse nome. Sem lançamentos, não
//   apaga cópias antigas. A pasta e a senha ficam só neste navegador (store.js), nunca no backup.
import { toJson, BACKUP_VERSION, todayStr } from './core.js';
import { BackupCrypto } from './backupcrypto.js';
import { ctx, APP_VERSION } from './ctx.js';

export const KEEP_OPTIONS = [7, 14, 30, 60];
export const DEFAULT_KEEP = 14;
export const PREFIX = 'finan-plus-auto-';
export const NAME_RE = /^finan-plus-auto-\d{4}-\d{2}-\d{2}\.json$/;
export const fileName = day => `${PREFIX}${day}.json`;

/** configuração deste aparelho (ctx.device.autoBackup), com valores padrão */
export function config(d = ctx.device) {
  const c = d?.autoBackup && typeof d.autoBackup === 'object' ? d.autoBackup : {};
  return {
    enabled: c.enabled === true, keep: KEEP_OPTIONS.includes(c.keep) ? c.keep : DEFAULT_KEEP, folder: typeof c.folder === 'string' ? c.folder : '',
    lastAt: Number(c.lastAt) || 0, lastFile: typeof c.lastFile === 'string' ? c.lastFile : '', lastError: typeof c.lastError === 'string' ? c.lastError : '',
    lastDay: typeof c.lastDay === 'string' ? c.lastDay : '',
  };
}
const setConfig = patch => ctx.setDevice(d => ({ ...d, autoBackup: { ...config(d), ...patch } }));

/** nomes das cópias que saem para ficar só as [keep] mais recentes (os outros arquivos da pasta nunca entram) */
export function toPrune(names, keep) {
  return names.filter(n => NAME_RE.test(n)).sort().reverse().slice(keep);
}

/** por que não dá para usar aqui (null = dá) */
export function unavailable() {
  if (ctx.remote) return 'No acesso pela rede, os dados ficam no celular: use o backup automático do Finan+ Android.';
  if (typeof globalThis.showDirectoryPicker !== 'function') return 'Este navegador não permite que um site grave numa pasta do computador. Funciona no Chrome, Edge e outros navegadores baseados no Chromium, no computador. Use o Backup JSON.';
  if (!ctx.store?.canKeepSecrets) return 'Precisa da criptografia do navegador para guardar a senha das cópias, e ela não está disponível aqui.';
  return null;
}

async function permission(dir, ask) {
  const o = { mode: 'readwrite' };
  try {
    if (typeof dir.queryPermission !== 'function') return true; // pastas sem pedido de permissão (ex.: a pasta privada do site)
    if ((await dir.queryPermission(o)) === 'granted') return true;
    return ask ? (await dir.requestPermission?.(o)) === 'granted' : false;
  } catch { return false; }
}

/** a pasta precisa de uma nova permissão (navegador reiniciado)? */
export async function needsPermission() {
  if (!config().enabled || unavailable()) return false;
  const sec = await ctx.store.autoBackupSecret();
  return !!sec && !(await permission(sec.dir, false));
}

/** escolhe a pasta (precisa de um toque do usuário); null se cancelou */
async function pickFolder() {
  try { return await globalThis.showDirectoryPicker({ id: 'finanplus-backup', mode: 'readwrite', startIn: 'documents' }); }
  catch (e) { if (e?.name === 'AbortError') return null; throw e; }
}

let running = null;
/** grava a cópia de hoje. Devolve null (gravou) ou o motivo do erro. [ask]: pode pedir permissão (só com toque do usuário). */
export function backupNow(ask = false) {
  running ??= (async () => {
    try { return await write(ask); } finally { running = null; }
  })();
  return running;
}

async function write(ask) {
  if (!config().enabled) return 'O backup automático está desligado.';
  if (!ctx.state || ctx.problem) return 'Os dados do Finan+ não foram abertos; nenhuma cópia foi feita.';
  const sec = await ctx.store.autoBackupSecret();
  if (!sec) { setConfig({ lastError: 'A pasta ou a senha não foram encontradas neste navegador. Ligue o backup automático de novo.' }); return config().lastError; }
  if (!(await permission(sec.dir, ask))) {
    const msg = 'O navegador pediu de novo a permissão da pasta. Toque em “Permitir acesso à pasta” em Ajustes › Dados.';
    setConfig({ lastError: msg }); return msg;
  }
  const today = todayStr(), name = fileName(today);
  try {
    const meta = { app: 'Finan+', version: BACKUP_VERSION, appVersion: `web ${APP_VERSION}`, createdAt: new Date().toISOString(), auto: true };
    const text = await BackupCrypto.encrypt(toJson(ctx.state, meta), sec.password);
    const fh = await sec.dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(new Blob([text], { type: 'application/json' }));
    await w.close();
    // sem lançamentos (ex.: depois de apagar tudo), as cópias antigas ficam
    if (ctx.state.txs.length > 0) {
      const names = [];
      for await (const [n, h] of sec.dir.entries()) if (h.kind === 'file') names.push(n);
      for (const n of toPrune(names, config().keep)) { try { await sec.dir.removeEntry(n); } catch { /* fica */ } }
    }
    setConfig({ lastAt: Date.now(), lastFile: name, lastError: '', lastDay: today, folder: sec.dir.name || config().folder });
    return null;
  } catch (e) {
    const msg = `Não foi possível gravar a cópia na pasta “${sec.dir.name || 'escolhida'}” (${e?.message || e}). Confira se ela ainda existe e se há espaço.`;
    setConfig({ lastError: msg });
    return msg;
  }
}

/** a cópia do dia ainda não foi feita? Faz em segundo plano (sem pedir permissão). Devolve o erro, se houver. */
export async function maybeRun() {
  const c = config();
  if (!c.enabled || unavailable() || c.lastDay === todayStr() || ctx.locked || ctx.problem) return null;
  return backupNow(false);
}

/** liga: escolhe a pasta, guarda pasta e senha e faz a primeira cópia. Devolve 'cancel', null (ok) ou o erro. */
export async function enable(password) {
  const dir = await pickFolder();
  if (!dir) return 'cancel';
  await ctx.store.setAutoBackupSecret({ dir, password });
  setConfig({ enabled: true, folder: dir.name || '', lastError: '', lastDay: '' });
  return backupNow(true);
}
export async function changeFolder() {
  const sec = await ctx.store.autoBackupSecret();
  if (!sec) return 'A senha não foi encontrada neste navegador. Desligue e ligue o backup automático de novo.';
  const dir = await pickFolder();
  if (!dir) return 'cancel';
  await ctx.store.setAutoBackupSecret({ dir, password: sec.password });
  setConfig({ folder: dir.name || '', lastError: '', lastDay: '' });
  return backupNow(true);
}
export async function setPassword(password) {
  const sec = await ctx.store.autoBackupSecret();
  if (!sec) return 'A pasta não foi encontrada neste navegador. Desligue e ligue o backup automático de novo.';
  await ctx.store.setAutoBackupSecret({ dir: sec.dir, password });
  setConfig({ lastDay: '' });
  return backupNow(true);
}
export const setKeep = keep => setConfig({ keep: KEEP_OPTIONS.includes(keep) ? keep : DEFAULT_KEEP });
/** desliga e esquece pasta e senha; os arquivos já gravados ficam na pasta */
export async function disable() {
  await ctx.store.setAutoBackupSecret(null);
  ctx.setDevice(d => ({ ...d, autoBackup: null }));
}
