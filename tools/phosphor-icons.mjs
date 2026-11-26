// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Gera js/icons.js a partir do Phosphor Icons (MIT), como no app Android 1.12 e no Finan+ para Linux.
// Uso: npm pack @phosphor-icons/core@2.1.1 && tar xzf phosphor-icons-core-2.1.1.tgz
//      node tools/phosphor-icons.mjs package/assets
// Cada nome de tools/phosphor-map.txt recebe o peso Regular (ou Fill, se termina em "-fill") e, para os ícones
// dentro de quadradinhos, o peso Duotone (a parte clara é a mesma cor com opacidade 0,2: acompanha qualquer tema).
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const assets = process.argv[2];
const inner = f => readFileSync(f, 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
const reg = [], duo = [];
for (const line of readFileSync(root + 'tools/phosphor-map.txt', 'utf8').split('\n')) {
  const l = line.trim();
  if (!l || l.startsWith('#')) continue;
  const [name, glyph] = l.split(/\s+/);
  const fill = name.endsWith('-fill');
  reg.push(`  '${name}': ${JSON.stringify(inner(`${assets}/${fill ? 'fill' : 'regular'}/${glyph}${fill ? '-fill' : ''}.svg`))},`);
  if (!fill) duo.push(`  '${name}': ${JSON.stringify(inner(`${assets}/duotone/${glyph}-duotone.svg`))},`);
}
writeFileSync(root + 'js/icons.js', `// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ícones do Finan+ web: Phosphor Icons (https://phosphoricons.com), licença MIT — ver third_party/phosphor/.
// Os mesmos do app Android 1.12 e do Finan+ para Linux, embutidos como SVG (funcionam offline, sem fontes).
// GERADO por tools/phosphor-icons.mjs a partir de tools/phosphor-map.txt. Não edite à mão.
// Peso Regular (Fill nos nomes "-fill"); DUO = peso Duotone, usado nos ícones dentro de quadradinhos.
export const ICONS = {
${reg.join('\n')}
};

export const DUO = {
${duo.join('\n')}
};

/** <svg> do ícone; tamanho em px. Com a classe "duo", o peso Duotone. aria-hidden: o texto ao lado (ou o
 *  aria-label do botão) descreve a ação. */
export function icon(name, size = 22, cls = '') {
  const d = /(^|\\s)duo(\\s|$)/.test(cls) ? DUO[name] : null;
  const i = d ?? ICONS[name] ?? ICONS['help'];
  return \`<svg class="ic\${cls ? ' ' + cls : ''}" width="\${size}" height="\${size}" viewBox="0 0 256 256" aria-hidden="true" focusable="false">\${i}</svg>\`;
}
`);
console.log(`${reg.length} ícones (${duo.length} com Duotone)`);
