// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Service worker do Finan+ web: guarda os arquivos do app para funcionar sem internet.
// Não guarda nem vê dados financeiros (eles ficam no IndexedDB, criptografados).
// VERSION é carimbada a cada publicação por tools/site.mjs (npm run site / GitHub Actions),
// para os aparelhos baixarem os arquivos novos. Publicando à mão, troque o valor.
const VERSION = 'finan-plus-web-1.1.0';
const FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/app.bundle.js',
  './assistente/dicionario.txt', './licenca/LICENSE.txt', './licenca/APACHE-2.0.txt',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-192-maskable.png', './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/badge-96.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// arquivos do app: primeiro do cache (abre instantâneo e offline); páginas: index.html do cache
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // o app não acessa outros sites
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});

// toque no aviso de vencimento: abre (ou traz para frente) o Finan+ na lista de lançamentos
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate?.(target).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
