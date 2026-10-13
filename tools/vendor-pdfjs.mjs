// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Gera js/vendor/pdfjs.js a partir do pacote pdfjs-dist (Mozilla PDF.js, Licença Apache 2.0):
// a biblioteca e o "worker" num único arquivo comum (sem "import"), carregado só quando a pessoa
// usa "Ler fatura ou boleto". O worker roda na própria página (não abre outro processo), o que
// também funciona abrindo o Finan+ direto da pasta (file://). Nada é baixado da internet pelo app.
// Rode: npm run vendor:pdfjs (depois de atualizar o pdfjs-dist no package.json).
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url).pathname;
const version = JSON.parse(readFileSync(root + 'node_modules/pdfjs-dist/package.json', 'utf8')).version;
await build({
  stdin: {
    contents: `import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
globalThis.pdfjsWorker = { WorkerMessageHandler };
globalThis.pdfjsLib = pdfjsLib;`,
    resolveDir: root, loader: 'js',
  },
  bundle: true, format: 'iife', target: 'es2020', platform: 'browser', minify: true, outfile: root + 'js/vendor/pdfjs.js',
  charset: 'utf8', legalComments: 'none', logLevel: 'warning',
  banner: { js: `/* Mozilla PDF.js ${version} (pdfjs-dist), Copyright Mozilla Foundation, Licença Apache 2.0 (licenca/APACHE-2.0.txt).
 * GERADO por tools/vendor-pdfjs.mjs (npm run vendor:pdfjs). Fonte: https://github.com/mozilla/pdf.js/tree/v${version} */` },
});
console.log(`js/vendor/pdfjs.js gerado (pdf.js ${version})`);
