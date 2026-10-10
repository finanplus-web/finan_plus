# Changelog — Finan+ web (PWA)

## Correção — botões das janelas de confirmação (10/10/2026)

- Nas janelas de confirmação (ex.: **Excluir lançamento**), o botão da ação (como "Excluir") aparecia mais alto que o "Cancelar". Agora os dois têm sempre a mesma altura e largura. Só `style.css` mudou (`.appDialogActions`).

## 1.3.0 — Simulador "E se…?" e Relatórios renovados (09/10/2026)

Mesmas mudanças do app Android 1.3.0, sem mexer em nenhum tema (tudo usa as cores do tema escolhido). Detalhes e contas em [SIMULADOR.md](SIMULADOR.md).

- **E se…?** (em Relatórios): quatro perguntas — economizar por mês, quanto tempo para comprar algo, mudança na renda e antecipar uma dívida parcelada. Parte da média dos 3 meses completos anteriores (só realizados), que dá para ajustar. **Nada é gravado.** "Transformar em meta" abre o formulário de meta já preenchido.
- **Relatórios:** mesmo ‹ mês › da aba Lançamentos, botão **PDF** no título, Receitas e Despesas realizadas com comparação justa (mês atual contra os mesmos dias do mês anterior; outro mês contra o anterior inteiro; período livre contra o mesmo tamanho logo antes), cartão "Nada realizado… ainda" com o que falta receber e pagar e o link **Ver no calendário**, e texto no lugar do gráfico de evolução vazio. Saíram o cartão "Este mês × mês anterior" e o cartão grande de exportar PDF.

| Arquivo | Mudança |
|---|---|
| `js/simulator.js` (novo) | Contas do simulador e `PeriodCompare` |
| `js/simsheet.js` (novo) | Folha "E se…?" |
| `js/screens.js` | `reportsView` renovada |
| `js/editors.js` | `goalEditor(id, pre)` aceita valores iniciais; novidades da 1.3.0 |
| `js/app.js` | Ações `simulator` e `reports-calendar` |
| `style.css` | Estilos novos, só com as variáveis do tema |
| `tests/simulator.test.mjs` (novo) | 5 testes (101 no total) |

## 1.2.1 — Correção das dicas de ritmo do assistente (08/10/2026)

**Problema (relatado pelo autor):** no dia 8, com R$ 500 de receita e uma única despesa de R$ 200, o assistente avisou "Despesas podem passar das receitas" com R$ 775 previstos. A conta multiplicava aquela compra pelos dias do mês (R$ 200 ÷ 8 × 31), como se ela se repetisse todo dia. O mesmo valia para "Ritmo do limite". A regra vinha da 1.1.0 e era igual no Android e no Linux; as três versões foram corrigidas juntas.

**Regra nova** (`Insights.project` em `js/assist.js`; detalhes em [ASSISTENTE.md](ASSISTENTE.md)):
- **Mínimo de dados:** a projeção só é feita com pelo menos **5 despesas variáveis pagas no mês** ("Ritmo do mês") ou **3 na categoria** ("Ritmo do limite"). Com menos, não há ritmo para projetar e a dica não aparece.
- **Gasto pontual:** uma despesa que sozinha passa de **metade** do gasto variável conta uma vez, sem ser multiplicada pelos dias.
- O "Por quê?" mostra o gasto pontual separado e explica o mínimo de despesas.

Testes: os dois testes antigos de ritmo usavam uma ou duas despesas (justamente o padrão do problema) e passaram a usar dados suficientes; um teste novo cobre o caso relatado e o gasto pontual. 96 no total. Versão 1.2.1.

## 1.2.0 — Calendário, gestos, Início e Lista enxutos (08/10/2026)

> **Publicada** no GitHub Pages em 08/10/2026 (PR #4). Mesmas mudanças do Finan+ Android 1.3.0 (PR #4 do `finan_plus_android`, ainda não publicado), com as mesmas regras e os mesmos testes.

**Calendário de lançamentos** (Lançamentos › Calendário; detalhes em [CALENDARIO.md](CALENDARIO.md)):
- O mês em grade (semana começando no domingo), com o saldo de cada dia abreviado ("+5,2 mil", "−120"), pontinhos de receita (verde), despesa (vermelho) e cartão (roxo) e alerta nos dias com conta atrasada ou fatura vencida. Hoje tem contorno; o dia escolhido fica preenchido.
- Faturas em aberto no dia do vencimento (tocar abre "Pagar fatura"). Compras no cartão aparecem no dia, mas só contam no saldo pela fatura.
- Totais do mês (Entradas, Saídas, Resultado) e, no dia escolhido: lançamentos, saldo do dia, **saldo previsto ao fim do dia** (de hoje em diante) e botões **Receita** e **Despesa** já com a data.
- **Tocar de novo** no dia escolhido, ou **tocar e segurar** qualquer dia, abre o lançamento novo com a data; numa data futura, ele começa pendente.
- Setas, deslizar o dedo sobre o calendário (celular) e "Voltar para hoje" trocam de mês. No computador, calendário à esquerda e o dia à direita.
- "Ocultar valores": ficam só os pontinhos. Leitor de tela: cada dia é lido como frase ("6 de outubro, terça-feira, 1 lançamento, saldo do dia menos R$ 119,90, em atraso").

**Trocar de aba deslizando (celular):** deslizar para o lado passa para a aba vizinha (Início › Lançamentos › Relatórios › Ajustes). Os botões da barra continuam. Fica de fora sobre o calendário (troca de mês), em campos de texto, na fileira de contas e com uma janela aberta.

**Início mais enxuto:**
- Celular: o topo mostra o nome, a data ("Quinta, 8 de outubro"), o selo "Privado" e o botão de ocultar valores; saiu o botão do assistente (ele abre pelo cartão do Início).
- Embaixo de Receitas e Despesas do mês: "a receber" e "a pagar" (inclui faturas que vencem no mês). A barra de uso das receitas só aparece quando já entrou receita.
- Saíram os botões Receita, Despesa e Meta (o + da barra e os botões do topo no computador fazem o mesmo).
- Assistente compacto: as 2 frases mais úteis (regra em [ASSISTENTE.md](ASSISTENTE.md)), a dica principal e um link só.
- Seções com um título só; uma conta só ocupa a linha inteira; Limites e Metas só aparecem quando existem, e antes disso o cartão **"Comece por aqui"** tem os atalhos.
- O cartão "Vencimentos (30 dias)", que só existe na versão web, continua.

**Lançamentos › Lista mais enxuta:** ‹ mês › com o botão **Período e filtros** (datas livres, atalhos e "Realizados"); filtros de um toque (Todos, Receitas, Despesas, Pendentes); resumo do período num cartão só, com o que está pendente; lançamentos agrupados por dia com o saldo do dia (a data não se repete em cada linha); saiu a comparação receitas × despesas (está em Relatórios).

| Arquivo | Mudança |
|---|---|
| `js/calendar.js` (novo) | Regras do calendário e do período (tradução de `MonthCalendar.kt` e `Period.kt`) |
| `js/calendarview.js` (novo) | Tela do calendário |
| `js/assist.js` | `report().highlights`: as 2 frases do Início |
| `js/screens.js` | Início e Lista enxutos, chave Lista/Calendário, cabeçalho do celular |
| `js/editors.js` | `txEditor(kind, id, date)`; folha "Período e filtros"; novidades |
| `js/app.js` | Ações novas, tocar e segurar, deslizar (abas e meses), virada do dia |
| `js/ctx.js`, `package.json` | Versão 1.2.0; estado do calendário e da visão |
| `js/icons.js` | `chevron-left` e `view-list` (Material Symbols, Apache 2.0) |
| `style.css` | Estilos do calendário, da Lista e do Início |
| `tests/calendar.test.mjs` (novo), `tests/assist.test.mjs` | 10 testes novos: 95 no total |

Como foi verificado: os 95 testes passaram; o app foi aberto no Chromium (celular 412 px e computador 1440 px) com os dados de demonstração e com dados como os do autor: Início, Lista, filtros, Período e filtros, calendário, editor com a data do dia, "Ocultar valores", deslizar entre abas e meses e tocar e segurar um dia, sem erros no console.

## Modo remoto — para o "Acesso pela rede" do Finan+ Android 1.2.0 (07/10/2026)

- **Modo normal sem mudanças:** aberto pelo GitHub Pages, instalado ou pela pasta, o Finan+ web continua
  lendo e gravando os dados do navegador, criptografados, como antes.
- **Modo remoto** (`js/remote.js`): quando a página vem do celular (Finan+ Android › Acesso pela rede), os
  dados ficam no celular; nada financeiro é gravado no navegador; cada gravação leva a versão lida (conflito
  → aviso, sem sobrescrever); respostas do celular são validadas; sem service worker. Detalhes em `MODO-REMOTO.md`.
- 8 testes novos: 85 no total.

## 1.1.2 — correções da auditoria do app Android (06/10/2026)

A auditoria do Finan+ Android encontrou três erros nas regras financeiras que as três versões compartilham. Esta versão aplica as mesmas correções do Android 1.1.1 e do Linux 1.1.7, para os resultados continuarem iguais.

- **Recorrência reativada:** ao reativar uma recorrência pausada, os meses em que ela ficou parada não geram mais lançamentos de uma vez (reativar em outubro uma recorrência pausada em março criava 7 pendentes). Ela retoma a partir do mês atual (`Ops.resumedLast`). Uma recorrência que já estava ativa continua recuperando os meses atrasados, como antes.
- **Pagamento de fatura:** a regra `Ops.canTogglePaid` impede alternar pago/pendente em compra no cartão e em pagamento de fatura (desmarcar o pagamento descontava o mesmo valor duas vezes). A tela já não mostrava o botão nesses casos; agora o núcleo também garante.
- **Backup com valores gigantes ou booleanos:** valores acima de R$ 9.999.999.999.999,99 (o limite da digitação) e `true`/`false` em campos de dinheiro são recusados e o item é descartado na revisão; antes, somas perdiam precisão e o saldo podia trocar de sinal.
- 3 testes novos: 77 no total.

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
