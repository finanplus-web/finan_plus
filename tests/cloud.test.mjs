// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do cliente da nuvem: configurações, requisição "simples" (text/plain) e erros tipados.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Cloud, CloudError, validCloudUrl, cloudReady, loadCloudConfig, saveCloudConfig, clearCloudConfig, siteCloudConfig, effectiveCloudConfig, loadCloudSession, saveCloudSession, clearCloudSession } from '../js/cloud.js';

class MemStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
beforeEach(() => { globalThis.localStorage = new MemStorage(); });

test('nuvem: configuração válida e inválida', () => {
  assert.ok(validCloudUrl('https://script.google.com/macros/s/AKfy/exec'));
  assert.ok(validCloudUrl('http://localhost:8787'));
  assert.ok(validCloudUrl('http://127.0.0.1:8787'));
  assert.ok(!validCloudUrl('http://exemplo.com/servico'));
  assert.ok(!validCloudUrl(''));
  assert.ok(!validCloudUrl('nada disso'));
  assert.ok(cloudReady({ url: 'https://script.google.com/macros/s/x/exec', clientId: 'abc.apps.googleusercontent.com' }));
  assert.ok(!cloudReady({ url: 'https://script.google.com/macros/s/x/exec', clientId: '' }));
});

test('nuvem: configuração digitada neste aparelho', () => {
  assert.deepEqual(loadCloudConfig(), { url: '', clientId: '' });
  saveCloudConfig({ url: ' https://script.google.com/macros/s/x/exec ', clientId: ' cli ' });
  assert.deepEqual(loadCloudConfig(), { url: 'https://script.google.com/macros/s/x/exec', clientId: 'cli' });
  clearCloudConfig();
  assert.deepEqual(loadCloudConfig(), { url: '', clientId: '' });
});

test('nuvem: nuvem.json do site e precedência do que foi digitado', async () => {
  const fetchJson = body => async () => ({ ok: true, json: async () => body });
  const site = await siteCloudConfig(fetchJson({ url: 'https://script.google.com/macros/s/site/exec', clientId: 'site-cli' }));
  assert.equal(site.clientId, 'site-cli');
  assert.equal(await siteCloudConfig(async () => ({ ok: false })), null);
  assert.equal(await siteCloudConfig(async () => { throw new Error('sem rede'); }), null);
  saveCloudConfig({ url: 'https://script.google.com/macros/s/local/exec', clientId: 'local-cli' });
  const eff = await effectiveCloudConfig(fetchJson({ url: 'https://script.google.com/macros/s/site/exec', clientId: 'site-cli' }));
  assert.equal(eff.clientId, 'local-cli'); // o que foi digitado manda
});

test('nuvem: sessão guardada sem nada financeiro', () => {
  assert.equal(loadCloudSession(), null);
  saveCloudSession({ email: 'a@x.com', name: 'A', isAdmin: true });
  assert.deepEqual(loadCloudSession(), { email: 'a@x.com', name: 'A', isAdmin: true });
  clearCloudSession();
  assert.equal(loadCloudSession(), null);
});

test('nuvem: chamada usa POST text/plain (sem preflight) e devolve JSON', async () => {
  const calls = [];
  const fetchImpl = async (url, o) => {
    calls.push([url, o]);
    return { ok: true, status: 200, json: async () => ({ ok: true, hello: 'sim' }) };
  };
  const cloud = new Cloud('https://script.google.com/macros/s/x/exec', fetchImpl);
  const j = await cloud.call('hello', { a: 1 }, 'tok', { timeoutMs: 5000 });
  assert.equal(j.hello, 'sim');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.equal(calls[0][1].cache, 'no-store');
  const sent = JSON.parse(calls[0][1].body);
  assert.deepEqual(sent, { v: 1, action: 'hello', token: 'tok', a: 1 });
});

test('nuvem: erros viram CloudError com código e mensagem do serviço', async () => {
  const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
  const cloud = new Cloud('https://x/exec', reply(200, { ok: false, error: 'not_member', message: 'Não autorizado' }));
  await assert.rejects(cloud.call('hello'), e => e instanceof CloudError && e.code === 'not_member' && e.message === 'Não autorizado');
  const bad = new Cloud('https://x/exec', reply(200, 'não é json'));
  await assert.rejects(bad.call('hello'), e => e.code === 'bad_response');
  const off = new Cloud('https://x/exec', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(off.call('hello'), e => e.code === 'offline');
  const http = new Cloud('https://x/exec', reply(500, { ok: false }));
  await assert.rejects(http.call('hello'), e => e.code === 'http_500');
});
