// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do assistente e do relatório: os mesmos casos do app Android (AssistTest.kt, ReportTest.kt)
// e da versão Linux. Rode com: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tx, newState, Money, CARD_PAYMENT_CAT, DEFAULT_EXPENSE, DEFAULT_INCOME } from '../js/core.js';
import { Text, Dictionary, Categorizer, cleanParcel, Insights, Ask, hiddenMoney } from '../js/assist.js';
import { buildReport, change, compact, niceStep, reportFileName, preset } from '../js/report.js';

const DICT = Dictionary.parse(readFileSync(new URL('../assistente/dicionario.txt', import.meta.url), 'utf8'));
const money = Money.format;
let seq = 0;
const ex = (desc, category, value, date, o = {}) => tx({ id: 't' + seq++, kind: 'expense', value, date, desc, category, paid: o.paid ?? true, recurringId: o.rec, groupId: o.group });
const inc = (desc, category, value, date, paid = true) => tx({ id: 't' + seq++, kind: 'income', value, date, desc, category, paid });
const st = (...txs) => newState({ txs });
const of = (tips, type) => tips.filter(t => t.type === type);
const TODAY = '2026-10-15';

// ------------------------------------------------------------------ texto e dicionário
test('texto: normalização', () => {
  assert.equal(Text.fold('PAG*Uber  Trip (2/3)'), 'pag uber trip 2 3');
  assert.deepEqual(Text.tokens('PAG*Uber  Trip (2/3)'), ['uber', 'trip']);
  assert.deepEqual(Text.tokens('Pão de Açúcar'), ['pao', 'acucar']);
  assert.ok(Text.same('Saúde', 'SAUDE'));
});

const match = (desc, kind = 'expense', cats = DEFAULT_EXPENSE, d = DICT) => d.match(desc, kind, cats)?.category ?? null;

test('dicionário: arquivo real', () => {
  assert.ok(DICT.sections.length >= 20);
  assert.equal(match('iFood pizza'), 'Alimentação');
  assert.equal(match('Supermercados Pão de Açúcar'), 'Alimentação');
  assert.equal(match('PAG*UBER TRIP'), 'Transporte');
  assert.equal(match('Conta Sabesp'), 'Moradia');
  assert.equal(match('Drogasil'), 'Saúde');
  assert.equal(match('Netflix.com'), 'Lazer');
  assert.equal(match('Salário setembro', 'income', DEFAULT_INCOME), 'Salário');
  assert.equal(match('Presente da Ana'), 'Outros');
});

test('dicionário: categoria mais específica do usuário', () => {
  const cats = [...DEFAULT_EXPENSE, 'Mercado', 'Assinaturas'];
  assert.equal(match('Carrefour', 'expense', cats), 'Mercado');
  assert.equal(match('Spotify', 'expense', cats), 'Assinaturas');
});

test('dicionário: termo mais longo vence', () => {
  assert.equal(match('Uber Eats'), 'Alimentação');
  assert.equal(match('Mercado Livre'), 'Outros');
});

test('dicionário: empate não sugere e categoria inexistente nunca aparece', () => {
  const d = Dictionary.parse('[despesa: A]\nfoo\n[despesa: B]\nbar');
  assert.equal(match('foo bar', 'expense', ['A', 'B'], d), null);
  assert.equal(match('foo', 'expense', ['A', 'B'], d), 'A');
  assert.equal(match('foo', 'expense', ['B'], d), null);
});

// ------------------------------------------------------------------ categorias
const history = () => st(ex('Feira do Seu Zé', 'Alimentação', 4500, '2026-07-02'), ex('Feira do Seu Zé', 'Alimentação', 3900, '2026-07-09'),
  ex('Uber casa', 'Transporte', 2300, '2026-07-03'), ex('Uber trabalho', 'Transporte', 1800, '2026-07-04'),
  ex('Uber aeroporto', 'Transporte', 6100, '2026-07-10'), ex('Academia Fit', 'Saúde', 9900, '2026-07-05'),
  ex('Cinema shopping', 'Lazer', 5000, '2026-07-06'), ex('Livro faculdade', 'Educação', 7000, '2026-07-07'));

test('categoria: mesma descrição', () => {
  const g = new Categorizer(history(), 'expense', DICT).suggest('feira do seu zé');
  assert.equal(g.category, 'Alimentação');
  assert.equal(g.source, 'SAME_DESCRIPTION');
  assert.match(g.why, /2 vezes/);
});

test('categoria: aprende com os lançamentos', () => {
  const c = new Categorizer(history(), 'expense', null);
  assert.equal(c.suggest('Uber shopping'), null);
  const g = c.suggest('Uber noite');
  assert.equal(g.category, 'Transporte');
  assert.equal(g.source, 'LEARNED');
  assert.ok(g.why.includes('“uber”') && g.why.includes('3 lançamento'));
  assert.equal(new Categorizer(history(), 'expense', DICT).suggest('Seu Zé banca').category, 'Alimentação');
});

test('categoria: dicionário como última etapa', () => {
  const c = new Categorizer(newState(), 'expense', DICT);
  assert.equal(c.suggest('Drogaria São Paulo').source, 'DICTIONARY');
  assert.equal(c.suggest('xyz abc'), null);
  assert.equal(c.suggest(''), null);
});

test('categoria: mesma descrição em categorias diferentes não decide', () => {
  assert.equal(new Categorizer(st(ex('Loja', 'Lazer', 100, '2026-07-01'), ex('Loja', 'Outros', 100, '2026-07-02')), 'expense', null).suggest('Loja'), null);
});

test('categoria: sufixo de parcela e categoria excluída', () => {
  assert.equal(cleanParcel('Compra TV (3/10)'), 'Compra TV');
  assert.equal(new Categorizer(st(ex('Coisa x', 'Antiga', 100, '2026-07-01')), 'expense', null).suggest('Coisa x'), null);
});

test('categoria: o que o assistente aprendeu', () => {
  const w = new Categorizer(history(), 'expense', null).learnedWords(6);
  const t = w.find(([c]) => c === 'Transporte');
  assert.deepEqual(t[1], [['uber', 3]]);
});

// ------------------------------------------------------------------ resumo e dicas
test('resumo do mês', () => {
  const s = st(ex('Mercado', 'Alimentação', 30000, '2026-10-05'), ex('Uber', 'Transporte', 10000, '2026-10-10'),
    ex('Mercado', 'Alimentação', 20000, '2026-09-05'), ex('Aluguel', 'Moradia', 100000, '2026-09-20'),
    inc('Salário', 'Salário', 300000, '2026-10-05'), ex('Luz', 'Moradia', 15000, '2026-10-25', { paid: false }));
  const r = Insights.report(s, TODAY, money);
  assert.ok(r.lines[0].includes('R$ 400,00') && r.lines[0].includes('100% a mais') && r.lines[0].includes('R$ 200,00'));
  assert.ok(r.lines.some(l => l.includes('sobram R$ 2.600,00')));
  assert.ok(r.lines.some(l => l.includes('maior categoria é Alimentação') && l.includes('75%')));
  assert.ok(r.lines.some(l => l.includes('faltam R$ 150,00 em 1 conta')));
  const r2 = Insights.report(st(inc('Salário', 'Salário', 90000, '2026-10-30', false), inc('Adiantamento', 'Extra', 121362, '2026-10-15', false)), TODAY, money);
  assert.ok(r2.lines.includes('A receber neste mês: R$ 2.113,62 em 2 lançamentos.'));
});

test('dica: duplicado', () => {
  const l = of(Insights.tips(st(ex('Padaria', 'Alimentação', 1250, '2026-10-10'), ex('padaria', 'Alimentação', 1250, '2026-10-10'),
    ex('Padaria', 'Alimentação', 1250, '2026-10-11')), TODAY, money), 'DUPLICATE');
  assert.equal(l.length, 1);
  assert.match(l[0].text, /2 vezes em 10\/10/);
});

test('dica: parcelas não são duplicados', () => {
  const s = st(ex('TV (1/2)', 'Outros', 50000, '2026-10-10', { group: 'g' }), ex('TV (2/2)', 'Outros', 50000, '2026-10-10', { group: 'g' }));
  assert.equal(of(Insights.tips(s, TODAY, money), 'DUPLICATE').length, 0);
});

test('dica: gastos fixos e aumento de preço', () => {
  const s = st(ex('Netflix', 'Lazer', 4490, '2026-07-08'), ex('Netflix', 'Lazer', 4490, '2026-08-08'),
    ex('Netflix', 'Lazer', 4490, '2026-09-08'), ex('Netflix', 'Lazer', 5590, '2026-10-08'),
    ex('Spotify', 'Lazer', 2190, '2026-08-02'), ex('Spotify', 'Lazer', 2190, '2026-09-02'), ex('Spotify', 'Lazer', 2190, '2026-10-02'),
    ex('Uber', 'Transporte', 2000, '2026-09-01'), ex('Uber', 'Transporte', 2500, '2026-09-03'), ex('Uber', 'Transporte', 2200, '2026-10-01'),
    ex('Cinema', 'Lazer', 3000, '2026-08-10'), ex('Cinema', 'Lazer', 3000, '2026-10-10'));
  assert.deepEqual(Insights.recurringExpenses(s, TODAY).map(m => m.name).sort(), ['Netflix', 'Spotify']);
  const tips = Insights.tips(s, TODAY, money);
  const sum = of(tips, 'SUBSCRIPTIONS');
  assert.equal(sum.length, 1);
  assert.ok(sum[0].text.includes('R$ 77,80 por mês') && sum[0].text.includes('R$ 933,60 por ano'));
  const up = of(tips, 'PRICE_UP');
  assert.equal(up.length, 1);
  assert.ok(up[0].text.includes('R$ 44,90 para R$ 55,90') && up[0].text.includes('+24%'));
});

test('dica: categoria acima da média', () => {
  const s = st(ex('Bar', 'Lazer', 10000, '2026-07-10'), ex('Bar', 'Lazer', 10000, '2026-08-10'), ex('Bar', 'Lazer', 10000, '2026-09-10'),
    ex('Show', 'Lazer', 25000, '2026-10-03'), ex('Mercado', 'Alimentação', 50000, '2026-09-10'), ex('Mercado', 'Alimentação', 52000, '2026-10-10'));
  const l = of(Insights.tips(s, TODAY, money), 'CATEGORY_SPIKE');
  assert.equal(l.length, 1);
  assert.equal(l[0].query, 'Lazer');
  assert.ok(l[0].text.includes('R$ 250,00') && l[0].text.includes('150% acima') && l[0].text.includes('R$ 100,00'));
});

test('dica: ritmo do limite', () => {
  const s = st(ex('Restaurante', 'Alimentação', 30000, '2026-10-08'), ex('Mercado', 'Alimentação', 30000, '2026-10-12'),
    ex('Assinatura comida', 'Alimentação', 10000, '2026-10-01', { rec: 'r1' }));
  s.limits.set('Alimentação', 100000);
  const l = of(Insights.tips(s, TODAY, money), 'LIMIT_PACE');
  assert.equal(l.length, 1);
  assert.ok(l[0].text.includes('R$ 1.340,00') && l[0].text.includes('R$ 18,75 por dia') && l[0].text.includes('16 dias'));
  assert.equal(of(Insights.tips(s, '2026-10-05', money), 'LIMIT_PACE').length, 0);
});

test('dica: despesas acima das receitas', () => {
  const l = of(Insights.tips(st(inc('Salário', 'Salário', 100000, '2026-10-05'), ex('Gastos', 'Outros', 80000, '2026-10-10')), TODAY, money), 'OVER_INCOME');
  assert.equal(l.length, 1);
  assert.match(l[0].text, /R\$ 1\.653,33/);
});

test('dica: pequenos gastos', () => {
  const txs = [];
  for (let i = 1; i <= 10; i++) txs.push(ex(i % 2 === 0 ? 'Café' : 'Bala', 'Alimentação', 800, `2026-10-${String(i).padStart(2, '0')}`));
  txs.push(ex('Mercado', 'Alimentação', 22000, '2026-10-02'));
  const l = of(Insights.tips(st(...txs), TODAY, money), 'SMALL_SPENDS');
  assert.equal(l.length, 1);
  assert.ok(l[0].text.includes('10 compras de até R$ 20,00 somaram R$ 80,00') && l[0].text.includes('27%'));
  assert.equal(of(Insights.tips(st(...txs.slice(0, 9)), TODAY, money), 'SMALL_SPENDS').length, 0);
});

test('resumo com valores ocultos', () => {
  for (const l of Insights.report(st(ex('Mercado', 'Alimentação', 30000, '2026-10-05')), TODAY, hiddenMoney).lines) assert.ok(!l.includes('300'));
});

// ------------------------------------------------------------------ perguntas
const askState = () => st(ex('Mercado Extra', 'Alimentação', 25000, '2026-08-05'), ex('Uber centro', 'Transporte', 3000, '2026-08-07'),
  ex('Uber casa', 'Transporte', 2500, '2026-10-14'), ex('Netflix', 'Lazer', 5590, '2026-10-08'),
  ex('Aluguel', 'Moradia', 150000, '2026-10-10'), ex('Luz', 'Moradia', 18000, '2026-10-28', { paid: false }),
  inc('Salário', 'Salário', 400000, '2026-10-05'), inc('Freela', 'Extra', 50000, '2025-12-10'));

test('pergunta: total por categoria e mês', () => {
  const a = Ask.answer('Quanto gastei com alimentação em agosto?', askState(), TODAY, money);
  assert.equal(a.parsed.category, 'Alimentação');
  assert.equal(a.parsed.period.from, '2026-08-01');
  assert.match(a.text, /R\$ 250,00/);
  assert.ok(a.understood.startsWith('Como entendi: total de despesas · agosto de 2026 · categoria Alimentação'));
});

test('pergunta: filtro por palavra e período relativo', () => {
  const a = Ask.answer('quantas vezes usei uber nos ultimos 90 dias', askState(), TODAY, money);
  assert.equal(a.parsed.intent, 'COUNT');
  assert.deepEqual(a.parsed.words, ['uber']);
  assert.ok(a.text.startsWith('2 lançamentos') && a.text.includes('R$ 55,00'));
});

test('pergunta: maior gasto, total com pendentes e saldo', () => {
  const s = askState();
  assert.ok(Ask.answer('maior gasto do mês', s, TODAY, money).text.includes('“Aluguel”: R$ 1.500,00'));
  const t = Ask.answer('quanto gastei este mês', s, TODAY, money).text;
  assert.ok(t.includes('R$ 1.580,90') && t.includes('R$ 180,00 pendente'));
  const b = Ask.answer('saldo do mês', s, TODAY, money).text;
  assert.ok(b.includes('receitas R$ 4.000,00') && b.includes('saldo R$ 2.419,10'));
});

test('pergunta: mês sem ano que ainda não chegou vai para o ano anterior', () => {
  const a = Ask.answer('quanto recebi em dezembro', askState(), TODAY, money);
  assert.ok(a.parsed.period.from.startsWith('2025'));
  assert.match(a.text, /R\$ 500,00/);
  assert.equal(a.parsed.kind, 'income');
});

test('pergunta: palavras desconhecidas são ignoradas e avisadas', () => {
  const a = Ask.answer('quantas vezes pedi uber nos ultimos 90 dias', askState(), TODAY, money);
  assert.deepEqual(a.parsed.words, ['uber']);
  assert.deepEqual(a.parsed.ignored, ['pedi']);
  assert.match(a.understood, /Ignorei “pedi”/);
});

test('pergunta: média por dia', () => {
  const t = Ask.answer('média de gastos este mês', askState(), TODAY, money).text;
  assert.ok(t.includes('R$ 105,39 por dia') && t.includes('15 dia(s)'));
});

// ------------------------------------------------------------------ relatório
function reportState() {
  let n = 0;
  const rows = [
    ['income', 'Salário', 'Salário', 500000, '2026-10-05', true, ''], ['income', 'Freela', 'Extra', 80000, '2026-10-20', false, ''],
    ['expense', 'Aluguel', 'Moradia', 150000, '2026-10-10', true, ''], ['expense', 'Mercado', 'Alimentação', 60000, '2026-10-06', true, ''],
    ['expense', 'iFood', 'Alimentação', 15000, '2026-10-12', true, ''], ['expense', 'Luz', 'Moradia', 20000, '2026-10-28', false, ''],
    ['expense', 'Pagamento fatura', CARD_PAYMENT_CAT, 90000, '2026-10-15', true, 'c1'],
    ['expense', 'Mercado', 'Alimentação', 50000, '2026-09-06', true, ''], ['income', 'Salário', 'Salário', 500000, '2026-09-05', true, ''],
    ['expense', 'Fora', 'Lazer', 9900, '2026-11-02', true, ''],
  ];
  const s = newState({ txs: rows.map(([kind, desc, category, value, date, paid, cardPayment]) => tx({ id: 'r' + n++, kind, desc, category, value, date, paid, cardPayment })) });
  s.limits.set('Alimentação', 70000);
  s.goals.push({ id: 'g', name: 'Viagem', target: 1000000, saved: 250000, deadline: null, monthly: 0 });
  return s;
}
const oct = () => buildReport(reportState(), '2026-10-01', '2026-10-31', '2026-10-31');

test('relatório: totais', () => {
  const r = oct();
  assert.equal(r.days, 31);
  assert.equal(r.income, 500000);
  assert.equal(r.expense, 225000);
  assert.equal(r.balance, 275000);
  assert.equal(r.pendingIncome, 80000);
  assert.equal(r.pendingExpense, 20000);
  assert.ok(Math.abs(r.savingsRate - 55) < 1e-9);
  assert.equal(r.dailyAverage, Math.trunc(225000 / 31));
});

test('relatório: período anterior', () => {
  const r = oct();
  assert.equal(r.prevFrom, '2026-08-31');
  assert.equal(r.prevTo, '2026-09-30');
  assert.equal(r.prevExpense, 50000);
  assert.ok(Math.abs(change(r.expense, r.prevExpense) - 350) < 1e-9);
  assert.equal(change(100, 0), null);
});

test('relatório: categorias', () => {
  const r = oct(), [a, food] = r.expenseByCategory;
  assert.equal(r.expenseByCategory.length, 2);
  assert.equal(a.name, 'Moradia');
  assert.equal(food.name, 'Alimentação');
  assert.equal(a.value, 150000);
  assert.ok(Math.abs(a.percent - 66.67) < 0.01);
  assert.equal(food.count, 2);
  assert.equal(food.monthlyAverage, 75000);
  assert.equal(food.monthlyLimit, 70000);
  assert.equal(food.overLimit, true);
  assert.deepEqual(r.incomeByCategory.map(c => c.name), ['Salário']);
});

test('relatório: meses, maiores despesas e lista', () => {
  const r = oct();
  assert.equal(r.months.length, 1);
  assert.deepEqual([r.months[0].income, r.months[0].expense], [500000, 225000]);
  assert.deepEqual(r.topExpenses.map(t => t.desc), ['Aluguel', 'Mercado', 'iFood']);
  assert.equal(r.txs.length, 7);
  assert.equal(r.txs[0].desc, 'Salário');
  assert.equal(r.goals[0].percent, 25);
});

test('relatório: vários meses e atalhos de período', () => {
  const s = reportState();
  const y = buildReport(s, '2026-09-01', '2026-11-30', '2026-10-31');
  assert.ok(Math.abs(y.monthSpan - 3) < 1e-9);
  assert.ok(Math.abs(buildReport(s, '2026-11-01', '2026-11-15', '2026-11-15').monthSpan - 0.5) < 1e-9);
  assert.equal(y.months.length, 3);
  assert.equal(y.months[0].expense, 50000);
  assert.equal(y.months[2].expense, 9900);
  assert.deepEqual(preset('anterior', '2026-10-03'), ['2026-09-01', '2026-09-30']);
  assert.deepEqual(preset('12m', '2026-10-03'), ['2025-11-01', '2026-10-31']);
  assert.deepEqual(preset('tudo', '2026-10-03', '2024-02-03', '2026-12-01'), ['2024-02-03', '2026-12-01']);
});

test('relatório: formatos', () => {
  assert.equal(compact(95000), 'R$ 950');
  assert.equal(compact(123400), 'R$ 1,2 mil');
  assert.equal(compact(1500000), 'R$ 15 mil');
  assert.equal(compact(250000000), 'R$ 2,5 mi');
  assert.equal(niceStep(320000, 4), 100000);
  assert.equal(niceStep(100000, 4), 25000);
  assert.equal(reportFileName('2026-10-01', '2026-10-31'), 'relatorio-finan-plus-2026-10-01-a-2026-10-31.pdf');
});
