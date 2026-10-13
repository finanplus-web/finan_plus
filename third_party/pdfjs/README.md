# Mozilla PDF.js

- **O que é:** biblioteca da Mozilla que lê arquivos PDF no navegador. O Finan+ usa só a leitura do texto, para "Ler fatura ou boleto" ([FATURAS.md](../../FATURAS.md)). Nada é desenhado nem enviado.
- **Versão:** 5.7.284 (pacote `pdfjs-dist` do npm, build "legacy" para navegadores mais antigos).
- **Arquivo no app:** `js/vendor/pdfjs.js`, gerado por `tools/vendor-pdfjs.mjs` (`npm run vendor:pdfjs`): a biblioteca e o "worker" juntos num único arquivo comum, minificado, sem alterações no código da Mozilla. O worker roda na própria página.
- **Código-fonte:** https://github.com/mozilla/pdf.js/tree/v5.7.284
- **Licença:** Apache 2.0 (texto em `licenca/APACHE-2.0.txt`), compatível com a GPL v3 do Finan+. Copyright Mozilla Foundation e colaboradores.
- **Como atualizar:** troque a versão de `pdfjs-dist` no `package.json`, rode `npm install`, `npm run vendor:pdfjs`, `npm test` e atualize a versão aqui e no CHANGELOG.
