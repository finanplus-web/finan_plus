# Assistente do Finan+ web — o que é e como funciona

O assistente do Finan+ **não é um modelo de IA**: são regras de cálculo e um classificador estatístico simples, escritos em JavaScript puro, com o código inteiro neste repositório. Ele:

- **funciona 100% no aparelho** (celular ou computador), sem internet;
- **não usa bibliotecas**: nenhum pacote externo, nenhum servidor, nenhuma chamada de rede;
- **não guarda nada à parte**: aprende com os lançamentos que já existem, que continuam criptografados no navegador (AES-256-GCM, chave não extraível);
- **explica tudo**: cada sugestão, dica e resposta tem "Por quê?" com a regra e os números usados;
- **pode ser desligado** em *Ajustes › Assistente*, cada função separadamente;
- **respeita "Ocultar valores"**: com a opção ligada, os textos mostram "R$ ••••".

Licença: como todo o Finan+, o assistente é software livre sob a **GNU GPL v3 ou posterior** (ver `LICENSE`).

Código: `js/assist.js` (regras, sem interface; roda também no Node), a tela em `js/screens.js` (`assistView`, cartão do Início em `homeAssistCard`) e a sugestão no editor em `js/editors.js` (`txEditor`).
Testes: os 26 casos do assistente em `tests/assist.test.mjs` (os mesmos do app Android e da versão Linux). Rode com `npm test`.

---

## 1. Sugestão de categoria

**Onde aparece:** no editor de lançamento, logo abaixo da descrição: "Sugestão: Transporte · [Usar] · Por quê?" (com o ícone de brilho do Material Symbols). A categoria **nunca muda sozinha**: o usuário clica em "Usar". A sugestão só aparece em lançamentos novos, ou quando a descrição de um lançamento existente é alterada.

**Como decide:** três etapas, nesta ordem; a primeira que responder vence.

| Etapa | Regra | Exemplo de "Por quê?" |
|---|---|---|
| 1. Mesma descrição | Já existe lançamento com a mesma descrição normalizada. Usa a categoria mais usada nela, se tiver pelo menos 60% dos casos. Se a mesma descrição aparece em categorias diferentes, não decide. | "Você já lançou esta descrição 6 vezes como Lazer." |
| 2. Aprendizado | Classificador *Naive Bayes multinomial* treinado só com os lançamentos do usuário (palavras da descrição → categoria). Sugere só se: há ≥ 5 lançamentos e ≥ 2 categorias usadas, a confiança é ≥ 70%, e a palavra decisiva apareceu em ≥ 2 lançamentos da categoria. Palavras nunca vistas são ignoradas. Suavização α = 0,1. | "A palavra “uber” aparece em 20 lançamento(s) seus de Transporte. Confiança: 99%." |
| 3. Dicionário | Termos do arquivo aberto `assistente/dicionario.txt` (baixado com o app e guardado para uso offline). Vence a categoria com maior peso de termos encontrados (termo de 2 palavras vale 2). Empate = não sugere. | "“drogasil” está no dicionário aberto do assistente, na seção de Saúde (linha 61 de dicionario.txt)." |

**Normalização da descrição** (`Text` em `assist.js`): minúsculas, sem acento e sem pontuação. Remove palavras sem significado (de, da, com…) e ruído de extrato (pag, compra, débito, ltda…), além do sufixo de parcela "(2/10)". Exemplo: `PAG*Uber Trip (2/3)` → `uber trip`.

**O que entra no aprendizado:** lançamentos do mesmo tipo (despesa ou receita), em categoria que ainda existe, com descrição. Pagamentos de fatura não entram.

**Dicionário aberto:** ~110 linhas de texto simples, com marcas e termos brasileiros (iFood, Sabesp, Drogasil, Netflix, postos, operadoras…). Cada seção lista categorias alternativas, por exemplo `[despesa: Mercado | Supermercado | Alimentação]`: vale a primeira que o usuário tiver. **O assistente nunca sugere uma categoria que não existe na lista do usuário.** Qualquer pessoa pode corrigir ou ampliar o arquivo. O formato está explicado no topo dele.

**Ver o que foi aprendido:** *Ajustes › Assistente › Ver o que o assistente aprendeu* lista, por categoria, as palavras mais frequentes e em quantos lançamentos cada uma apareceu. Não há nada separado para apagar: corrigir a categoria de um lançamento corrige o aprendizado, e excluir o lançamento apaga o que ele ensinou.

---

## 2. Resumo do mês

**Onde aparece:** completo na tela Assistente (no computador, Ctrl+4 ou a barra lateral; no celular, o link do cartão do Início); no cartão do Início, só as **2 frases mais úteis** (desde a 1.2.0).

**Quais frases vão para o Início** (`highlights`), nesta ordem de prioridade, as 2 primeiras que existirem: contas em atraso; contas a pagar até o fim do mês; quanto já gastou no mês; quanto falta receber; quanto entrou e quanto sobra. "Ainda não há despesas realizadas" e o fechamento do mês anterior ficam só no resumo completo. Mesma regra do app Android.

Mostra, quando houver dados:
- quanto foi gasto no mês até hoje, comparado com **os mesmos dias** do mês anterior (dia 1 ao dia de hoje), para a comparação ser justa;
- receitas do mês e quanto sobra, ou quanto as despesas já passam das receitas;
- a maior categoria e quanto ela representa das despesas;
- contas a pagar até o fim do mês, valores a receber no mês e contas em atraso;
- nos 7 primeiros dias do mês, o fechamento do mês anterior (receitas, despesas e saldo).

Convenções (as mesmas dos Relatórios): conta só o que foi **realizado** (pago ou recebido); compras no cartão contam na data da compra; pagamento de fatura não é despesa nova.

---

## 3. Dicas de economia

Aparecem só quando há algo fora do padrão. A mais importante fica no Início (o link vira "Ver as N dicas" quando há mais de uma) e todas ficam na tela Assistente. Sem dicas, o Início não mostra aviso. Cada dica pode ser **dispensada** (e restaurada depois) e, quando faz sentido, tem **"Ver lançamentos"**, que abre a lista já filtrada.

| Dica | Regra exata | Constantes (em `assist.js`) |
|---|---|---|
| **Possível duplicado** | Mesma descrição + mesmo valor + mesma data, nos últimos 60 dias, sem ser parcela nem recorrência. | `DUP_DAYS = 60` |
| **Aumento de preço** | Gasto mensal (ver "Gastos fixos") cujo último valor ficou ≥ 5% e ≥ R$ 1,00 acima do mês anterior. | `PRICE_UP_RATIO = 1.05` |
| **Ritmo do limite** | Do dia 7 em diante, para categorias com limite ainda não ultrapassado e com **pelo menos 3 despesas variáveis pagas no mês**: **projeção = compromissos do mês + gasto pontual + resto do gasto variável ÷ dias passados × dias do mês**. Compromissos são recorrências, parcelas e contas agendadas, e não são extrapolados. **Gasto pontual** é uma despesa que sozinha passa de metade do gasto variável: conta uma vez, sem ser multiplicada pelos dias. Avisa se a projeção passar do limite por ≥ R$ 10 e mostra quanto dá para gastar por dia no resto do mês. | `PACE_MIN_DAY = 7`, `PACE_MIN_COUNT_CAT = 3`, `ONE_OFF_SHARE = 0.5` |
| **Ritmo do mês** | A mesma projeção para todas as despesas, com **pelo menos 5 despesas variáveis pagas no mês**, comparada com as receitas previstas do mês (recebidas + a receber). | `PACE_MIN_COUNT = 5` |

> **Por que o mínimo e o gasto pontual (desde a 1.2.1):** antes, uma única compra no começo do mês era multiplicada pelos dias. Exemplo real: no dia 8, R$ 200 gastos de uma vez viravam R$ 25 por dia, R$ 775 no mês, e o aviso "Despesas podem passar das receitas" aparecia com R$ 500 de receita. Com poucas despesas não existe "ritmo" para projetar, e uma compra grande isolada não se repete todo dia.
| **Acima da média** | Gasto realizado da categoria neste mês ≥ 30% acima da média dos 3 meses anteriores **e** ≥ R$ 50 a mais. Precisa de dados em pelo menos 2 desses meses. Mostra os 2 maiores lançamentos. | `SPIKE_RATIO = 1.30`, `SPIKE_MIN_DIFF = R$ 50` |
| **Pequenos gastos** | Mais de 10 despesas de até R$ 20 no mês: total, percentual das despesas e as descrições mais frequentes. | `SMALL_VALUE = R$ 20`, `SMALL_MIN_COUNT = 10` |
| **Gastos fixos** | Mesma descrição, **uma vez por mês**, em ≥ 3 meses seguidos (até este mês ou o anterior), com valores a até 30% da mediana. Parcelas não entram. Mostra o total por mês e por ano. | `SUB_MIN_MONTHS = 3`, `SUB_TOLERANCE = 0.30` |

As dicas dispensadas ficam só neste aparelho, nas configurações locais do navegador (`finanplus_device`, não vão para o backup). Os identificadores incluem o mês, então uma dica dispensada em outubro pode voltar em novembro se a situação se repetir.

---

## 4. Perguntas rápidas

**Onde:** tela Assistente (no computador, atalho Ctrl+K). Com o resumo e as dicas desligados, o link do cartão do Início vira "Perguntar".

É um **interpretador de palavras-chave em português**, não um chatbot. Toda resposta mostra uma linha **"Como entendi"**, com a intenção, o período e os filtros usados, para o usuário conferir.

| Entende | Palavras reconhecidas |
|---|---|
| Despesa / receita | gastei, gasto, paguei, despesas… / recebi, ganhei, entrou, receitas… |
| Total (padrão) | — |
| Maior | maior, mais caro |
| Quantidade | quantas, quantos, vezes |
| Média por dia | média |
| Saldo | saldo, sobrou, economizei |
| Período | hoje, ontem, esta semana, semana passada, este mês (padrão), mês passado, nome do mês (com ou sem ano; sem ano = a ocorrência mais recente), este ano, ano passado, "em 2025", "últimos N dias" |
| Categoria | qualquer categoria cadastrada pelo usuário que apareça na pergunta |
| Descrição | palavras que sobram ("uber", "netflix") filtram a descrição. Palavras que não existem em nenhum lançamento ("pedi", "comprei") são ignoradas, e o app avisa quais foram. |

Considera só valores realizados e informa à parte o que está pendente. "Ver lançamentos" abre a lista com o mesmo período e filtro.

Exemplos: "quanto gastei com mercado em agosto?", "maior gasto da semana", "quanto recebi este ano?", "saldo do mês passado", "quantas vezes usei uber nos últimos 30 dias?".

---

## Limitações conhecidas (de propósito)

- As perguntas não entendem frases muito livres ("estou gastando muito?"). Quando não entende algo, a linha "Como entendi" mostra exatamente o que foi considerado.
- O aprendizado começa a sugerir depois de alguns lançamentos (pelo menos 5). Antes disso, valem a "mesma descrição" e o dicionário.
- A projeção do mês supõe que o gasto variável continua no ritmo dos dias anteriores. É uma estimativa: só é feita com dados suficientes (veja acima), uma compra grande isolada conta uma vez, e o "Por quê?" mostra a conta.


## Diferenças em relação ao app Android e à versão Linux

Nenhuma nas regras: `assist.js` é uma tradução direta do Kotlin e passa nos mesmos 26 testes. Muda só onde aparece: no computador o assistente tem uma tela própria na barra lateral, com perguntas e resumo à esquerda e dicas à direita; no celular, ele abre pelo link do cartão do Início.
