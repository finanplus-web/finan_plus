// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Gera js/app.bundle.js: todos os módulos de js/ num único arquivo comum (sem "import"),
// para o Finan+ abrir também direto da pasta (file://), onde os navegadores bloqueiam módulos.
// Também embute o dicionário do assistente e os textos das licenças (o navegador não deixa
// ler arquivos da pasta com fetch em file://). Rode: npm run build
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '') + '/';
// quebras de linha normalizadas: o resultado é o mesmo no Windows e no Linux
const txt = p => JSON.stringify(readFileSync(root + p, 'utf8').replace(/\r\n/g, '\n'));
writeFileSync(root + 'js/embedded-data.js', `// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// GERADO por tools/build.mjs a partir de assistente/dicionario.txt e licenca/*.txt. Não edite à mão.
export const DICT_TEXT = ${txt('assistente/dicionario.txt')};
export const LICENSES = { 'licenca/LICENSE.txt': ${txt('licenca/LICENSE.txt')}, 'licenca/APACHE-2.0.txt': ${txt('licenca/APACHE-2.0.txt')} };
`);
await build({
  entryPoints: [root + 'js/app.js'], bundle: true, format: 'iife', target: 'es2020', outfile: root + 'js/app.bundle.js',
  charset: 'utf8', legalComments: 'inline',
  banner: { js: '// Finan+ — Copyright (C) 2026 Juscelino Be\n// SPDX-License-Identifier: GPL-3.0-or-later\n//\n// GERADO por tools/build.mjs (npm run build) a partir dos módulos em js/. O código-fonte legível está em js/*.js.\n// Ícones: Material Symbols, © Google LLC, Licença Apache 2.0.' },
});
console.log('js/app.bundle.js gerado');
