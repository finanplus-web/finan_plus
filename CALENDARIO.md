# Calendário de lançamentos

Disponível desde a versão 1.2.0 do Finan+ web (1.3.0 no app Android), na aba **Lançamentos › Calendário**. As regras são as mesmas nas duas versões.

O calendário mostra o mês em grade, com o que entra e o que sai em cada dia. Ele serve para ver os dias apertados do mês (por exemplo, o aluguel vencendo antes do salário cair) sem ler a lista inteira.

## Como usar

1. Abra a aba **Lançamentos** e toque em **Calendário** no alto da tela. Para voltar à lista, toque em **Lista**.
2. Troque de mês pelas setas **‹ ›** ou deslizando o calendário para o lado. Fora do mês atual aparece **Voltar para hoje**.
3. Toque num dia para ver os lançamentos dele logo abaixo do calendário.
4. Para lançar algo num dia, há três caminhos, todos com a data já preenchida:
   - toque **de novo** no dia que já está escolhido;
   - **toque e segure** qualquer dia;
   - use os botões **Receita** ou **Despesa** abaixo do nome do dia.

   Os dois primeiros abrem o formulário como despesa; dá para trocar para receita no próprio formulário. Se a data for futura, o lançamento começa como pendente.
5. Na lista do dia:
   - toque num lançamento para editá-lo;
   - toque no círculo para marcar como pago ou recebido, como na lista normal;
   - toque numa fatura para abrir **Pagar fatura**.

No celular, deslizar o dedo **sobre o calendário** troca de mês, e deslizar em qualquer outra parte da tela troca de aba. No computador, o calendário fica à esquerda e o dia escolhido à direita; segurar o botão do mouse sobre um dia também abre o lançamento novo.

A escolha entre Lista e Calendário, o mês e o dia escolhido continuam enquanto o Finan+ está aberto. Com o app aberto na virada do dia, o calendário acompanha a nova data se estava em "hoje".

## O que cada dia mostra

| Elemento | Significado |
|---|---|
| Número do dia | Em cinza, os dias que já passaram. Hoje tem contorno azul. O dia escolhido fica preenchido. |
| Valor pequeno (+5,2 mil, −120) | Saldo do dia: o que entra menos o que sai das contas nesse dia. Verde quando o saldo é positivo ou zero, vermelho quando é negativo. Fica sem "R$" e é arredondado para caber (veja abaixo). |
| Pontinho verde | Há receita no dia. |
| Pontinho vermelho | Há despesa na conta no dia, paga ou pendente. |
| Pontinho roxo | Há algo de cartão: compra no cartão, pagamento de fatura ou fatura vencendo. |
| Ícone de alerta | Há conta pendente com data passada ou fatura vencida ainda em aberto. |

### Arredondamento do valor do dia

O quadradinho do dia é estreito, então o valor aparece abreviado e arredondado ao mais próximo:

| Valor | Mostra |
|---|---|
| R$ 182,40 | 182 |
| R$ 119,90 | 120 |
| R$ 1.500,00 | 1,5 mil |
| R$ 15.499,00 | 15 mil |
| R$ 1.200.000,00 | 1,2 mi |

O valor exato aparece no resumo do dia, logo abaixo do calendário, e é o que o leitor de tela fala.

## Que lançamentos entram na conta

O calendário mostra **dinheiro entrando e saindo das contas**, o que inclui o que ainda está pendente:

- **Receitas e despesas fora do cartão**, realizadas ou pendentes, na data do lançamento.
- **Pagamentos de fatura**, na data em que foram feitos (o dinheiro sai da conta nesse dia).
- **Faturas em aberto**, no dia do vencimento, com o valor que ainda falta pagar.
- **Compras no cartão** aparecem na lista do dia em que foram feitas, com o pontinho roxo, mas **não entram no saldo do dia**. Esse dinheiro só sai da conta quando a fatura é paga, e já é contado na fatura. Assim nada é contado duas vezes.

Abaixo do calendário ficam os totais do mês: **Entradas**, **Saídas** e **Resultado**. Eles são exatamente a soma dos dias. Por incluir pendências e faturas, podem ser diferentes dos totais da Lista, que somam só o que já foi realizado no período.

No dia escolhido, de hoje em diante, aparece também o **Saldo previsto ao fim do dia**. É a mesma conta do "Saldo previsto" do Início: o saldo atual das contas mais tudo o que está pendente até aquele dia, menos as faturas em aberto que vencem até lá.

O calendário mostra todos os lançamentos do mês. A busca e os filtros de tipo e situação valem só para a Lista.

## Privacidade e acessibilidade

- **Ocultar valores:** os valores somem de dentro dos dias e ficam só os pontinhos; os totais e os lançamentos aparecem como "R$ ••••".
- **Leitor de tela:** cada dia é um botão lido como frase completa, por exemplo "6 de outubro, terça-feira, 1 lançamento, saldo do dia menos R$ 119,90, em atraso" (sem o valor com "Ocultar valores"); o dia escolhido é anunciado como pressionado e com a dica "Toque de novo para lançar nesta data". O nome do mês é anunciado ao trocar de mês. O cabeçalho da semana e a legenda são decorativos.
- **Teclado:** os dias são botões comuns: Tab chega até eles e Enter escolhe o dia (Enter de novo abre o lançamento novo).
- **Toque:** cada dia tem pelo menos 54 px de altura; setas e a chave Lista/Calendário, 46–48 px. O valor do dia diminui para caber no quadradinho.

## Como foi feito

| Arquivo | O quê |
|---|---|
| `js/calendar.js` | Regras (tradução de `MonthCalendar.kt` e `Period.kt` do Android): grade, dias, faturas, atrasos, totais, valor abreviado, títulos e texto do leitor de tela |
| `js/calendarview.js` | Tela do calendário |
| `js/app.js` | Ações do calendário, tocar e segurar, deslizar para trocar de mês e de aba |
| `js/editors.js` | `txEditor(kind, id, date)`: lançamento novo com a data do dia |
| `tests/calendar.test.mjs` | Os mesmos casos de `CalendarTest.kt` e `PeriodTest.kt` |

Os dados e o formato do backup **não mudaram**: o calendário só mostra os lançamentos que já existem.
