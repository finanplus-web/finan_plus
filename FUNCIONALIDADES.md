# Finan+ web — todas as funcionalidades

Lista completa do que o Finan+ web (PWA) faz e de onde fica cada coisa. O núcleo (`js/core.js`, `js/assist.js`, `js/report.js`) é uma tradução direta do Kotlin do app Android e passa nos mesmos 60 testes, mais os testes de PDF e de armazenamento.

## Onde funciona

- Em qualquer navegador moderno, no celular ou no computador: Chrome, Edge, Firefox, Safari (iOS 16.4+), Samsung Internet.
- **Instalável como aplicativo** ("Instalar app" / "Adicionar à tela inicial"): abre em janela própria, com o ícone do Finan+, e tem atalhos no ícone (Nova despesa, Nova receita, Lançamentos).
- **Funciona sem internet** depois da primeira abertura: o service worker (`sw.js`) guarda todos os arquivos do app. Os dados nunca passam pelo service worker.

## Layout para computador e notebook

| O quê | Como funciona |
|---|---|
| Quando ativa | A partir de **900 px** de largura. Abaixo disso, o layout de celular (cabeçalho, navegação inferior e botão ＋ flutuante). |
| Barra lateral | Início, Lançamentos, Relatórios, Assistente e Ajustes, com o atalho de cada um. No rodapé: **saldo atual** e **previsto para o fim do mês** sempre à vista, e botões de ocultar valores, bloquear e atalhos. |
| Barra superior | Título da tela e botões "Despesa", "Receita", buscar, ocultar valores, bloquear (com PIN) e o menu ⋯ (relatório em PDF, CSV, backup, restaurar, atalhos, sobre). |
| Colunas | Início em **3 colunas a partir de 1360 px** (resumo e vencimentos · assistente e patrimônio · limites e metas) e em 2 colunas de 900 a 1360 px. Lançamentos com filtros e totais à esquerda (fixos ao rolar) e a lista à direita. Relatórios, Assistente e Ajustes em 2 colunas. |
| Janelas | Editores e diálogos abrem no centro da tela (no celular, sobem de baixo). Enter salva, Esc fecha. |
| Teclado | Todos os itens têm foco visível e funcionam com Tab/Enter/Espaço. Linhas da lista abrem com Enter. |

### Atalhos de teclado (? mostra todos; no Mac, ⌘ no lugar de Ctrl)

| Tecla simples | Com Ctrl | Ação |
|---|---|---|
| N / R | Ctrl+N / Ctrl+Shift+N | Nova despesa / nova receita |
| M | Ctrl+M | Nova meta |
| / | Ctrl+F | Buscar lançamentos |
| K | Ctrl+K | Perguntar ao assistente |
| 1 … 5 | Ctrl+1 … Ctrl+5 (Ctrl+, para Ajustes) | Trocar de tela |
| H | Ctrl+H | Ocultar ou mostrar valores |
| — | Ctrl+L | Bloquear agora (com PIN) |
| — | Ctrl+P / Ctrl+E | Relatório em PDF / exportar CSV |
| — | Ctrl+S / Ctrl+O | Salvar backup JSON / restaurar backup |
| ? | Ctrl+/ | Lista de atalhos |
| Esc | — | Fechar a janela aberta |

As teclas simples funcionam fora dos campos de texto, em qualquer navegador. Numa aba comum, alguns atalhos com Ctrl pertencem ao próprio navegador (Ctrl+N abre outra janela, Ctrl+1 troca de aba); no app instalado, todos funcionam. Com uma janela aberta, os atalhos esperam, para não abrir um editor por cima do outro.

## Início

- **Data completa do dia** ("04 de Outubro de 2026") no cartão principal. Ela muda sozinha na virada do dia e quando o app volta a ficar visível.
- Saldo atual (soma das contas) e saldo previsto para o fim do mês (inclui pendências e faturas que vencem até lá).
- Receitas e despesas realizadas no mês, barra de uso das receitas e selo "% economizado".
- Botões rápidos: Receita, Despesa, Meta.
- **Vencimentos dos próximos 30 dias**: contas a pagar, valores a receber e faturas; atrasados em vermelho. Um toque abre o lançamento ou o pagamento da fatura.
- Cartão do assistente com o resumo do mês e as 2 dicas mais importantes.
- Contas (com saldo) e cartões (fatura atual, vencimento, disponível e "Pagar fatura").
- Limites do mês com barra que muda de cor (80%: atenção; acima do limite: vermelha).
- Metas: guardado, quanto falta por mês até o prazo, mês previsto pelo plano e aviso "após o prazo".

## Lançamentos

- Período De/Até e atalhos Este mês, 30 dias e Tudo.
- Busca por descrição ou categoria **sem diferenciar acento** ("cafe" encontra "Café"). Filtros por tipo e situação.
- Totais do período (receitas, despesas, saldo), comparação receitas × despesas e pendentes à parte.
- Lista com ícone da categoria, descrição, categoria · conta ou cartão, data, situação ("Em atraso" em vermelho), valor e botão de pago/recebido. Compras no cartão mostram o ícone do cartão.
- Mostra 300 por vez, com "Mostrar mais".

## Editor de lançamento

- Despesa ou receita, descrição, valor ("59,90", "1.500,00", "R$ 2.000"…), categoria, forma de pagamento (conta ou cartão), conta/cartão, data e "já paga/recebida".
- **Parcelas** (até 60): valor total (dividido em centavos, com a diferença na 1ª parcela) ou valor de cada parcela. As parcelas ficam ligadas; ao excluir uma, o app pergunta se exclui as seguintes.
- **Repetir mensalmente**: cria uma recorrência a partir da data.
- **Sugestão de categoria** do assistente abaixo da descrição, com "Usar" e "Por quê?".
- Pagamento de fatura editado mostra o aviso "não conta como despesa nova".
- Validações com as mesmas mensagens do app Android ("Informe uma descrição.", "Informe um valor maior que zero. Ex.: 59,90"…).

## Cartões, faturas e recorrências

- Dia de fechamento e de vencimento; compras após o fechamento vão para a fatura seguinte.
- O limite usado inclui parcelas futuras; os pagamentos abatem primeiro a fatura mais antiga.
- "Pagar fatura" registra o pagamento debitando a conta escolhida, sem contar como despesa nova.
- Recorrências geradas na abertura e na virada do dia. Meses em que o app ficou fechado são recuperados (até 24 de uma vez), nunca antes da data de início. Dia 31 vira o último dia em meses curtos. Recorrências podem ser pausadas.

## Relatórios

- Período: o mesmo da tela Lançamentos.
- Despesas por categoria em **gráfico de rosca** (7 maiores + "Outras") e em barras, com o aviso de limite mensal.
- Evolução dos últimos 6 meses (com descrição completa para leitores de tela) e este mês × mês anterior.
- Botão "Exportar relatório em PDF".

## Relatório em PDF

- Atalhos (este mês, mês passado, este ano, 12 meses, tudo) ou datas livres, com prévia dos totais.
- A4: resumo com variação contra o período anterior de mesmo tamanho, a receber, a pagar, média diária e nº de lançamentos; rosca e tabela por categoria (%, nº, média mensal, limite e "acima"); gráfico e tabela mensal; receitas por categoria; 10 maiores despesas; contas e metas; lista completa de lançamentos (opcional); "Como ler este relatório"; "Página n de N".
- **Gerado no próprio navegador** (`js/pdf.js`), sem bibliotecas e sem internet, com o mesmo layout do app Android e da versão Linux. O diálogo avisa que o PDF não é criptografado.

## Assistente (detalhes em ASSISTENTE.md)

- Sugestão de categoria em três etapas: mesma descrição, aprendizado Naive Bayes com os seus lançamentos e dicionário aberto.
- Resumo do mês, comparado com os mesmos dias do mês anterior.
- 7 dicas: duplicado, aumento de preço, ritmo do limite, ritmo do mês, acima da média, pequenos gastos e gastos fixos. Cada dica pode ser dispensada e restaurada.
- Perguntas rápidas em português, com a linha "Como entendi" e "Ver lançamentos".
- Tudo sem internet, com "Por quê?". Cada função pode ser desligada.

## Ajustes (todos os cartões abrem e fecham com + / −)

| Cartão | O que tem |
|---|---|
| Aparência | Temas Sistema, Claro, Material You, OLED Cinza, Tokyo Night e Nord. "Sistema" acompanha o modo claro/escuro do aparelho. |
| Privacidade e segurança | PIN de 4 a 8 números (definir, trocar, remover), ocultar valores e bloqueio automático (1, 5, 15 ou 30 min sem usar). Mostra se os dados estão criptografados. |
| Avisos de vencimento | Notificações do navegador, uma vez por dia a partir das 9h (com o app aberto), e "Avisar agora". |
| Assistente | 3 interruptores, restaurar dicas dispensadas e "Ver o que o assistente aprendeu". |
| Contas e cartões | Lista com saldos e limites, editar, ＋ Conta, ＋ Cartão. |
| Recorrências | Lista com tipo, valor, dia, categoria, conta/cartão e "pausada". |
| Limites mensais | Por categoria de despesa (pendentes do mês também contam). |
| Categorias | Adicionar, renomear (leva junto lançamentos, recorrências e limites) e excluir, com as proteções de uso. |
| Dados | Exportar CSV, backup JSON, restaurar (com revisão antes de substituir), relatório em PDF e apagar tudo. |
| Sobre | Texto do projeto, autoria, licença GPL v3 e licença dos ícones (textos completos dentro do app), atalhos e novidades. |

## Segurança e privacidade

| Recurso | Implementação |
|---|---|
| Criptografia dos dados | **AES-256-GCM** (WebCrypto), IV aleatório de 96 bits a cada gravação e dado autenticado fixo. |
| Onde fica a chave | Criada pelo navegador como **não extraível** (nem o código do site consegue lê-la) e guardada no IndexedDB do próprio site. |
| Gravação segura | A versão atual e a anterior são gravadas na mesma transação. Se a atual estiver danificada, o app abre a anterior. Gravações entram em fila e nunca se sobrepõem. |
| Nunca sobrescreve o que não abriu | Se a chave não abre os dados (ou o navegador não deixa abrir o armazenamento), aparece "Não foi possível abrir seus dados" e nada é gravado. Dá para guardar os dados ilegíveis num arquivo, restaurar um backup ou começar do zero. Ao começar do zero, os dados ilegíveis ficam guardados à parte no navegador até "Apagar tudo". |
| Várias abas | Cada gravação confere, na mesma transação, se outra aba gravou depois da última leitura; se gravou, **não grava por cima**: a tela é atualizada e o app avisa para refazer a última alteração. Quando uma aba grava, as outras recarregam os dados. As configurações do aparelho (PIN, avisos…) também são relidas antes de cada mudança; se o PIN mudar em outra aba, esta é bloqueada. |
| PIN | Hash **PBKDF2-SHA256** com 210.000 iterações e sal aleatório. A partir do 5º erro seguido há espera crescente (30 s, 60 s…), que vale para todas as abas e continua valendo se a página for recarregada. O PIN nunca vai para o backup. |
| Bloqueio | Ao abrir, com Ctrl+L e pelo bloqueio automático. Bloquear fecha janelas abertas, e nenhuma janela abre por cima da tela do PIN (nem as que estavam esperando um arquivo). Teclado numérico na tela e teclado físico. |
| Ocultar valores | "R$ ••••" na tela, nos gráficos e nos avisos. |
| Sem rede | O app não faz nenhuma requisição para outros sites. A política de segurança (CSP) da página proíbe scripts e conexões externas. |
| Backup e CSV | Arquivos gerados no aparelho. O CSV tem proteção contra fórmulas (=, +, -, @). |
| Leitura de backups | Validação completa: tamanho máximo 30 MB, profundidade do JSON, tipos, datas, ids e referências. Itens inválidos são descartados e contados. |
| Navegador sem WebCrypto | Os dados ficam no localStorage, sem criptografia, e o app avisa (Ajustes e aviso na abertura). |

## Migração do Finan+ web antigo ("Minhas Finanças")

- Na primeira abertura, os dados antigos (`mf_v2` ou `mf_txs` no localStorage) são lidos, validados e gravados já criptografados. Itens inválidos são contados e informados. O texto aberto só é apagado **depois** de conferir que a gravação cifrada abre.
- O PIN antigo continua funcionando e é convertido para PBKDF2 no primeiro desbloqueio.
- Os temas, o "ocultar valores" e o bloqueio automático são mantidos; "Escuro" vira "OLED Cinza", como no app Android.

## Diferenças em relação ao app Android (e por quê)

| Android | Web |
|---|---|
| Widget na tela inicial | Não existe widget para sites. O conteúdo fica no rodapé da barra lateral (computador) e no cartão "Vencimentos" do Início. |
| Desbloqueio por digital | Não incluído: o PIN funciona em qualquer navegador. |
| Bloquear capturas de tela | Navegadores não permitem. Ajustes recomenda "Ocultar valores" ao compartilhar a tela. |
| Notificações às 9h com o app fechado | Sem servidor, um site não acorda sozinho. O aviso aparece quando o Finan+ é aberto (ou está aberto) a partir das 9h. |
| Chave no Android Keystore | Chave não extraível do WebCrypto, guardada no IndexedDB do site. |

## Compatibilidade

- Backup JSON idêntico ao do app Android e da versão Linux (versão 5, valores em reais). Dá para levar os dados entre os três.
- Backups do Finan+ web antigo (versão 4, ids numéricos) são aceitos.
