# Changelog — Finan+ web (PWA)

## 1.1.1 — links para o código e a versão Linux (06/10/2026)

- **Ajustes › Sobre › Código-fonte e outras versões:** três links que abrem em nova aba — o repositório desta versão web (`github.com/finanplus-web/finan_plus`), o download da versão Linux (página da Release mais recente, com o `.deb`) e o repositório da versão Linux (`github.com/finanplus-web/finan_plus_linux`). Os links usam `rel="noopener noreferrer"`: a página aberta não recebe o endereço de origem nem acesso a esta aba.
- Ícones novos (Material Symbols Rounded, peso 300, 24 px, Apache 2.0): `code`, `computer`, `open-in-new`.
- Relatório em PDF: o passo da escala do gráfico nunca é zero (com totais de poucos centavos, a geração travava).

## 1.1.0 — Finan+ web (04/10/2026)

> **GitHub Pages (04/10/2026):** publicação automática pronta: `.github/workflows/pages.yml` gera o bundle, roda os testes e publica a cada envio para `main`; `tools/site.mjs` monta só os arquivos do site e carimba a versão do service worker com o commit; `.gitignore`; `npm run preview`. Testado num endereço com subpasta, como o do GitHub Pages, inclusive offline.

> **Correção (04/10/2026):** aberto direto da pasta (`index.html` com endereço `file://`), o app ficava em branco, porque os navegadores bloqueiam módulos JavaScript nesse modo. Agora o `index.html` carrega `js/app.bundle.js` (os mesmos módulos juntados num arquivo comum por `npm run build`), e o dicionário e as licenças vão embutidos. Testado no Chromium por `file://` (com criptografia) e por `http://`. Se um navegador não oferecer IndexedDB para arquivos locais, o app guarda sem criptografia e avisa.

O antigo "Minhas Finanças" (PWA 0.5.0) passa a se chamar **Finan+** e recebe **todas as funções e correções do app Android 1.1.0**, mais um **layout próprio para computador e notebook**. Os dados salvos no navegador são migrados sozinhos na primeira abertura. A lista completa está em [FUNCIONALIDADES.md](FUNCIONALIDADES.md).

### O que foi feito

| Parte | Arquivos | O que é |
|---|---|---|
| Núcleo | `js/core.js` | Tradução do núcleo Kotlin: datas, modelo, dinheiro em centavos, faturas, saldos, recorrências, parcelas, metas, lembretes, CSV, validações com as mesmas mensagens e backup JSON versão 5 |
| Assistente | `js/assist.js`, `assistente/dicionario.txt` | Texto, dicionário aberto, categorizador (Naive Bayes), resumo do mês, 7 dicas e perguntas rápidas, com as mesmas regras e limites |
| Relatório | `js/report.js` | Números do relatório (período anterior, categorias, meses, maiores despesas, atalhos de período) |
| PDF | `js/pdf.js`, `js/pdf-metrics.js` | Gerador de PDF próprio, sem bibliotecas, com o mesmo layout do app Android (A4, rosca, gráficos, tabelas, "Página n de N") |
| Armazenamento | `js/store.js` | AES-256-GCM com chave não extraível no IndexedDB, versão anterior guardada, migração do `mf_v2`, tela de problema, PIN com PBKDF2 e espera crescente, configurações do aparelho à parte |
| Interface | `index.html`, `style.css`, `js/app.js`, `js/screens.js`, `js/editors.js`, `js/ui.js`, `js/ctx.js` | Telas, editores, bloqueio, navegação, layout de celular e de computador, atalhos, temas, avisos e virada do dia |
| Ícones | `js/icons.js`, `icons/` | 76 Material Symbols Rounded (Apache 2.0) embutidos como SVG; ícone do app Finan+ (o mesmo do Android) |
| Offline | `sw.js`, `manifest.webmanifest` | Cache de todos os arquivos, nome Finan+, ícones "maskable", atalhos no ícone, toque no aviso abre os lançamentos |
| Testes | `tests/*.test.mjs` | 74 testes com `node --test`: os 60 do app Android, 2 extras (migração do formato antigo e cópia do estado), 3 de PDF e 9 de armazenamento/PIN |
| Ferramentas | `tools/demo-data.js` | Dados fictícios para capturas de tela |

### Novidades em relação ao Finan+ web 0.5.0

- Nome e ícone **Finan+**.
- **Layout para computador**: barra lateral com saldo, barra superior, Início em 3 colunas, Lançamentos com filtros fixos ao lado da lista, Relatórios/Assistente/Ajustes em 2 colunas, janelas centrais e atalhos de teclado.
- **Data completa no Início** ("04 de Outubro de 2026"), atualizada sozinha.
- **Assistente** no aparelho (sugestão de categoria, resumo, dicas, perguntas).
- **Relatório em PDF** com escolha de período.
- **Vencimentos dos próximos 30 dias** e **avisos de vencimento** (notificações do navegador).
- **Ajustes em cartões que abrem e fecham com + / −**.
- **Somente ícones Material Symbols** (os símbolos de texto ⌂ ⇄ ◎ ⚙ ＋ foram substituídos).
- Parcelas com "valor total" ou "valor de cada parcela"; ao excluir uma parcela, pergunta se exclui as seguintes.
- Recorrências recuperam os meses em que o app ficou fechado, nunca antes da data de início, e ajustam o dia 31.
- Categorias podem ser renomeadas (leva junto lançamentos, recorrências e limites) e são protegidas contra exclusão quando usadas por recorrência.
- Pagamento de fatura não conta mais como despesa; compras no cartão contam na data da compra; o limite usado inclui parcelas futuras.
- Saldo previsto inclui as faturas que vencem até o fim do mês.
- Busca sem diferenciar acento; filtros por tipo e situação; "Mostrar mais".

### Correções trazidas do app Android

- Dinheiro calculado em **centavos inteiros** (antes, valores com ponto flutuante podiam somar R$ 0,01 a mais ou a menos).
- Parcelas: a diferença de centavos vai para a 1ª parcela (antes, a soma das parcelas podia não bater com o total).
- Fatura: compra no dia do fechamento fica na fatura do mês; vencimento antes do fechamento cai no mês seguinte.
- Backup: validação completa (ids, datas impossíveis como 31/02, referências a contas e cartões inexistentes, aninhamento e tamanho); itens inválidos são contados e mostrados antes de substituir.
- CSV com BOM (acentos certos no Excel), separador `;` e proteção contra fórmulas.
- O PIN deixou de ficar dentro dos dados e do backup.
- Datas e valores formatados sem depender do idioma do navegador.

### Segurança

- Dados criptografados (antes ficavam em texto aberto no localStorage).
- PIN com PBKDF2 (210.000 iterações, sal aleatório) no lugar de SHA-256 sem sal; o PIN antigo é aceito uma vez e convertido.
- Espera crescente após 5 erros de PIN.
- Política de segurança de conteúdo (CSP) sem scripts externos nem conexões para outros sites; todo texto do usuário é escapado antes de ir para a tela.

### Verificação

- `npm test`: 74 testes, todos passando (Node 22).
- Teste de ponta a ponta no Chromium (Playwright): migração do `mf_v2` com PIN antigo, desbloqueio, espera após erros, lançamento parcelado com sugestão de categoria, exclusão das parcelas seguintes, busca sem acento, ocultar valores, cartões dos Ajustes, tema, PDF, CSV, backup e restauração, dados cifrados no IndexedDB, recarregar com PIN, pergunta ao assistente, atalhos, uso offline e tela de problema. Sem erros no console.
- Uma revisão de código independente encontrou 10 problemas, todos corrigidos e conferidos com testes no navegador:
  - uma segunda aba aberta podia desfazer a troca de PIN ou zerar a espera após erros (agora as configurações são relidas antes de cada gravação, e a outra aba bloqueia quando o PIN muda);
  - "Restaurar" iniciado antes do bloqueio podia abrir a confirmação por cima da tela do PIN (agora nenhuma janela abre com o app bloqueado);
  - editar o limite de uma categoria que não estava na lista apagava esse limite e sobrescrevia outro;
  - datas impossíveis digitadas no campo (ano com 5 dígitos) eram aceitas e sumiam ao reabrir (agora são recusadas com "Informe uma data válida.", e itens ignorados ao abrir são informados);
  - duas abas gravando quase juntas podiam perder uma alteração (agora a gravação confere a versão e avisa);
  - falha ao abrir o IndexedDB mostrava um app vazio sem criptografia (agora mostra a tela de problema);
  - depois da tela de problema faltavam a virada do dia, o bloqueio automático e os avisos;
  - duas abas abrindo juntas na primeira vez podiam criar duas chaves;
  - clicar fora de uma janela de edição fechava e perdia o que foi digitado;
  - alguns atalhos com Ctrl são do navegador numa aba comum (agora há teclas simples: N, R, M, /, K, H, 1–5, ?).
- Capturas de tela em `docs/` (celular e computador).
