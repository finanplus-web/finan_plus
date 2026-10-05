// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Monta a pasta _site/ com só o que o site precisa (sem testes, ferramentas nem node_modules)
// e carimba a versão do service worker, para os aparelhos baixarem os arquivos novos a cada publicação.
// Uso: npm run site            (versão = data e hora)
//      SITE_VERSION=abc123 npm run site   (o GitHub Actions passa o commit)
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname, out = root + '_site/';
const FILES = ['index.html', 'style.css', 'sw.js', 'manifest.webmanifest', 'LICENSE', 'README.md', 'FUNCIONALIDADES.md', 'ASSISTENTE.md', 'CHANGELOG.md'];
const DIRS = ['js', 'icons', 'assistente', 'licenca', 'third_party'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of FILES) cpSync(root + f, out + f);
for (const d of DIRS) cpSync(root + d, out + d, { recursive: true });
if (!existsSync(out + 'js/app.bundle.js')) throw new Error('Falta js/app.bundle.js: rode npm run build');
writeFileSync(out + '.nojekyll', ''); // o GitHub Pages não deve processar os arquivos

const pkg = JSON.parse(readFileSync(root + 'package.json', 'utf8'));
const stamp = (process.env.SITE_VERSION || new Date().toISOString().replace(/\D/g, '').slice(0, 12)).slice(0, 12);
const sw = readFileSync(out + 'sw.js', 'utf8');
const re = /const VERSION = '[^']*';/;
if (!re.test(sw)) throw new Error('sw.js sem a linha const VERSION');
writeFileSync(out + 'sw.js', sw.replace(re, `const VERSION = 'finan-plus-web-${pkg.version}-${stamp}';`));
console.log(`_site/ pronto (versão ${pkg.version}-${stamp})`);
