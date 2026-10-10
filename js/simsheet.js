// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Folha do simulador "E se…?" (aberta em Relatórios). Só lê os dados: nada aqui grava no estado.
// As contas ficam em simulator.js; mesma tela do app Android (SimulatorSheet.kt). Detalhes em SIMULADOR.md.
import { Money, Finance } from './core.js';
import { Simulator } from './simulator.js';
import { icon } from './icons.js';
import { esc, attr, openSheet, closeSheet, field, moneyInput, input, btn } from './ui.js';
import { ctx, hidden } from './ctx.js';
import { goalEditor } from './editors.js';

const SCEN = [
  ['save', 'savings', 'E se eu economizar…', 'Ex.: R$ 200 por mês, por 12 meses'],
  ['buy', 'shopping-bag', 'Quanto tempo para comprar…', 'Ex.: um computador de R$ 4.500'],
  ['income', 'work', 'E se minha renda mudar…', 'Ex.: diminuir 15% a partir do mês que vem'],
  ['debt', 'account-balance', 'E se eu antecipar uma dívida…', 'Parcelas que faltam, valor para quitar e quanto sobra'],
];
const TITLES = { save: 'E se eu economizar…?', buy: 'Quanto tempo para comprar?', income: 'E se minha renda mudar…?', debt: 'E se eu antecipar uma dívida…?' };

// o que foi digitado vale enquanto a folha está aberta (trocar de pergunta não apaga); abrir de novo em Relatórios zera
let st = null;
const fresh = () => ({ inc: '', exp: '', adjust: null, save: { per: '200,00', months: '12' }, buy: { what: '', price: '', have: '', per: '' }, income: { pct: '-15' }, debt: { sel: null, pay: {} } });

const m = c => hidden() ? 'R$ ••••' : Money.format(c);
const plural = (n, one, many) => n === 1 ? `1 ${one}` : `${n} ${many}`;
const line = (l, v, cls = '') => `<div class="simLine"><span>${esc(l)}</span><b class="${cls}">${esc(v)}</b></div>`;
const result = (big, sentence, cls = 'accent') => `<small class="eyebrow">Resultado</small><div class="simBig ${cls}">${esc(big)}</div>${sentence ? `<p class="simSentence">${esc(sentence)}</p>` : ''}`;
const whyText = t => `<p class="simWhy">${esc(t)}</p>`;
const msg = t => `<p class="muted">${esc(t)}</p>`;
const safe = `<div class="simSafe">${icon('shield', 16)}<span>Só simulação: seus dados não mudam</span></div>`;

function base() {
  const auto = Simulator.base(ctx.state, ctx.today);
  const inc = Money.parse(st.inc), exp = Money.parse(st.exp);
  return { auto, base: Simulator.mkBase(inc ?? auto.income, exp ?? auto.expense, auto.months) };
}

/** abre a folha; [scen] = já numa pergunta. Vindo de Relatórios (reset), começa do zero. */
export function simulatorSheet(scen = null, reset = true) {
  if (reset || !st) st = fresh();
  const cur = SCEN.find(x => x[0] === scen);
  const back = cur ? `<button type="button" class="btn link simBack" data-sim="home">${icon('chevron-left', 20)}<span>E se…?</span></button>` : '';
  const body = `<div class="simWrap">${back}${cur ? '' : '<p class="muted">Teste decisões antes de tomá-las.</p>'}${safe}
    ${cur ? `<form class="simForm" novalidate>${formFor(scen)}</form><div class="simBox" id="simOut" aria-live="polite"></div><div id="simGoal"></div>` : homeBody()}</div>`;
  const d = openSheet({ title: cur ? TITLES[scen] : 'E se…?', body });
  const inner = d.querySelector('.sheetInner') || d;
  inner.addEventListener('click', e => {
    const b = e.target.closest('[data-sim]');
    if (!b) return;
    const a = b.dataset.sim;
    if (a === 'home') simulatorSheet(null, false);
    else if (a === 'go') simulatorSheet(b.dataset.s, false);
    else if (a === 'adjust') { st.adjust = !adjustOpen(); simulatorSheet(null, false); }
    else if (a === 'debt') { st.debt.sel = b.dataset.id; simulatorSheet('debt', false); }
    else if (a === 'goal') { const g = goalFor(scen); if (g) { closeSheet(); goalEditor(null, g); } }
  });
  inner.addEventListener('input', e => {
    const el = e.target;
    if (!el.name) return;
    if (el.name === 'inc' || el.name === 'exp') { st[el.name] = el.value; refreshBase(inner); return; }
    if (scen === 'debt') st.debt.pay[curDebt()?.groupId] = el.value; else st[scen][el.name] = el.value;
    update(inner, scen);
  });
  inner.addEventListener('submit', e => e.preventDefault());
  if (cur) update(inner, scen);
  return d;
}

const adjustOpen = () => st.adjust ?? Simulator.base(ctx.state, ctx.today).months === 0;

function baseCard() {
  const { auto, base: b } = base();
  const mo = n => n === 1 ? 'mês' : 'meses';
  return `<small class="eyebrow">${auto.months > 0 ? `Sua base · média dos últimos ${auto.months} ${mo(auto.months)}` : 'Sua base'}</small>
    ${auto.months === 0 && b.income === 0 && b.expense === 0 ? '<p class="muted small">Ainda não há meses completos com valores realizados. Informe abaixo quanto entra e sai num mês típico.</p>' : ''}
    <div class="simBase"><div><small>Entra</small><b class="green">${esc(m(b.income))}</b></div><div><small>Sai</small><b class="red">${esc(m(b.expense))}</b></div><div><small>Sobra</small><b class="${b.left < 0 ? 'red' : 'accent'}">${esc(m(b.left))}</b></div></div>
    ${auto.months >= 1 && auto.months <= 2 ? `<small class="muted">Pouco histórico: a média usa só ${auto.months} ${mo(auto.months)}. Os resultados são aproximados.</small>` : ''}`;
}
function refreshBase(inner) { const el = inner.querySelector('#simBase'); if (el) el.innerHTML = baseCard(); }

function homeBody() {
  const { auto } = base(), open = adjustOpen();
  return `<div class="simBox" id="simBase">${baseCard()}</div>
    <button type="button" class="btn link simAdjust" data-sim="adjust" aria-expanded="${open}">${open ? 'Ocultar ajuste da base' : 'Ajustar a base'}</button>
    ${open ? `<div class="row2">${field('Entra por mês', input('inc', st.inc, { inputmode: 'decimal', placeholder: Money.input(auto.income), max: 20 }))}${field('Sai por mês', input('exp', st.exp, { inputmode: 'decimal', placeholder: Money.input(auto.expense), max: 20 }))}</div>
      <small class="muted">Vazio = usa a média. Vale só para esta simulação.</small>` : ''}
    <h4 class="simH">Escolha uma pergunta</h4>
    ${SCEN.map(([k, ic, t, sub]) => `<button type="button" class="simScen" data-sim="go" data-s="${k}"><span class="simIco">${icon(ic, 22)}</span><span class="simTxt"><b>${esc(t)}</b><small>${esc(sub)}</small></span>${icon('chevron-right', 20)}</button>`).join('')}`;
}

// ------------------------------------------------------------------ formulários
function formFor(scen) {
  if (scen === 'save') return field('Guardar por mês (R$)', moneyInput('per', st.save.per)) + field('Por quantos meses', input('months', st.save.months, { inputmode: 'numeric', max: 3 }));
  if (scen === 'buy') return field('O que', input('what', st.buy.what, { placeholder: 'Ex.: Computador', max: 40 }))
    + `<div class="row2">${field('Preço (R$)', moneyInput('price', st.buy.price))}${field('Já tenho (R$)', moneyInput('have', st.buy.have))}</div>`
    + field('Guardar por mês (R$)', moneyInput('per', st.buy.per)) + '<small class="muted" id="simShare"></small>';
  if (scen === 'income') return field('Mudança na renda (%)', input('pct', st.income.pct, { inputmode: 'decimal', placeholder: 'Ex.: -15 ou 10', max: 6 }));
  // dívida
  const debts = Simulator.debts(ctx.state, ctx.today);
  if (!debts.length) return '';
  const d = curDebt();
  return `<h4 class="simH">Qual parcelamento</h4><div role="radiogroup">${debts.map(x => `<button type="button" role="radio" aria-checked="${x.groupId === d.groupId}" class="simDebt${x.groupId === d.groupId ? ' on' : ''}" data-sim="debt" data-id="${attr(x.groupId)}">
      <span><b>${esc(x.name)}</b><small>${esc(plural(x.remaining, 'parcela restante', 'parcelas restantes'))} de ${esc(m(x.parcel))}${x.card ? ' · cartão' : ''}</small></span><b>${esc(m(x.left))}</b></button>`).join('')}</div>
    ${field('Valor para quitar hoje (R$)', moneyInput('pay', st.debt.pay[d.groupId] ?? Money.input(d.left)), { hint: 'Use o valor que o credor ou o banco oferecer para quitar.' })}`;
}
function curDebt() {
  const debts = Simulator.debts(ctx.state, ctx.today);
  return debts.find(x => x.groupId === st.debt.sel) || debts[0] || null;
}

// ------------------------------------------------------------------ resultados
function update(inner, scen) {
  const out = inner.querySelector('#simOut'), goal = inner.querySelector('#simGoal');
  const { base: b } = base();
  let html = '', canGoal = false;
  if (scen === 'save') {
    const v = posMoney(st.save.per), n = int(st.save.months, 1, 600);
    if (v == null || n == null) html = msg('Informe o valor por mês e por quantos meses.');
    else {
      const r = Simulator.save(b, v, n);
      html = result(m(r.total), `juntados em ${plural(n, 'mês', 'meses')}.`) + line('Sobra por mês hoje', m(b.left))
        + line(`Sobra por mês guardando ${m(v)}`, m(r.newLeft), r.newLeft < 0 ? 'red' : '')
        + (r.overLeft ? '<p class="red small">Esse valor é maior do que sobra por mês: faltaria dinheiro para as despesas de sempre.</p>' : '')
        + [6, 12, 24].filter(k => k !== n).map(k => line(`Em ${k} meses`, m(v * k))).join('')
        + whyText(`Conta: ${m(v)} × ${n} meses. Não considera rendimento: o Finan+ não sabe quanto o dinheiro guardado renderia.`);
    }
    canGoal = v != null;
  } else if (scen === 'buy') {
    const pr = posMoney(st.buy.price), hv = Math.max(0, Money.parse(st.buy.have) ?? 0), pm = Money.parse(st.buy.per) ?? 0;
    const share = inner.querySelector('#simShare');
    if (share) share.textContent = pm > 0 && b.left > 0 && !hidden() ? `${Math.round(pm * 100 / b.left)}% do que sobra por mês (${Money.format(b.left)})` : '';
    const r = pr == null ? null : Simulator.buy(pr, hv, pm, ctx.today);
    if (pr == null) html = msg('Informe o preço.');
    else if (r == null) html = msg('Informe quanto dá para guardar por mês.');
    else if (r.months === 0) html = result('Já dá', 'Você já tem o valor.');
    else {
      const bars = Math.min(r.months, 36);
      const chart = `<div class="simChart${hidden() ? ' sensitive' : ''}" role="img" aria-label="Gráfico do valor juntado mês a mês">${Array.from({ length: bars }, (_, i) => `<i class="${i === bars - 1 ? 'done' : ''}" style="height:${(12 + 88 * (i + 1) / bars).toFixed(1)}%"></i>`).join('')}</div>`;
      html = result(plural(r.months, 'mês', 'meses'), `Você teria o valor em ${Simulator.monthYear(r.doneYm)}.`) + chart
        + [pm * 2, Math.trunc(pm / 2)].filter(x => x > 0).map(alt => { const a = Simulator.buy(pr, hv, alt, ctx.today); return a ? line(`Guardando ${m(alt)}/mês`, `${plural(a.months, 'mês', 'meses')} · ${Simulator.monthYear(a.doneYm)}`) : ''; }).join('')
        + whyText(`Conta: falta ${m(r.missing)} ÷ ${m(pm)} por mês = ${plural(r.months, 'mês', 'meses')} (arredondado para cima), começando no mês que vem. Não considera rendimento nem mudança de preço.`);
    }
    canGoal = pr != null && pm > 0;
  } else if (scen === 'income') {
    const raw = String(st.income.pct).replace(',', '.').trim(), v = /^[-+]?\d+(\.\d+)?$/.test(raw) ? +raw : NaN;
    if (!(v > -100 && v <= 1000)) html = msg('Informe a mudança em porcentagem (ex.: -15 para diminuir 15%).');
    else if (b.income === 0) html = msg('Sem renda na base: ajuste a base em "E se…?".');
    else {
      const r = Simulator.income(b, v, Simulator.goalsMonthly(ctx.state));
      const sign = x => (x >= 0 ? '+ ' : '− ') + m(Math.abs(x));
      html = result(m(r.newLeft), r.newLeft >= 0 ? 'passaria a sobrar por mês.' : 'faltariam por mês.', r.newLeft < 0 ? 'red' : 'accent')
        + line('Renda por mês', `${m(b.income)} → ${m(r.newIncome)}`) + line('Diferença por mês', sign(r.diff), r.diff < 0 ? 'red' : 'green')
        + line('Em 12 meses', sign(r.yearDiff), r.yearDiff < 0 ? 'red' : 'green')
        + (r.goalsMonthly > 0 ? (r.newLeft >= r.goalsMonthly ? `<p class="muted small">Suas metas pedem ${esc(m(r.goalsMonthly))} por mês: ainda cabe no que sobra.</p>`
          : `<p class="red small">Suas metas pedem ${esc(m(r.goalsMonthly))} por mês: não cabe no que sobraria. Os prazos das metas atrasariam.</p>`) : '')
        + whyText(`Conta: renda da base × (1 ${v >= 0 ? '+' : '−'} ${String(Math.abs(v)).replace('.', ',')}%), com as despesas da base iguais. Começa a valer no mês que vem.`);
    }
  } else {
    const d = curDebt();
    if (!d) html = msg('Nenhuma compra parcelada com parcelas a pagar. As parcelas aparecem aqui quando um lançamento é feito com "Parcelas" maior que 1.');
    else {
      const pay = posMoney(st.debt.pay[d.groupId] ?? Money.input(d.left));
      if (pay == null) html = msg('Informe o valor para quitar.');
      else {
        const r = Simulator.payoff(d, pay, Finance.currentBalance(ctx.state));
        html = result(r.saved > 0 ? m(r.saved) : 'Sem desconto', r.saved > 0 ? `a menos do que pagar as ${plural(r.months, 'parcela', 'parcelas')}.` : 'Pagar hoje o mesmo valor só adianta a saída do dinheiro.', r.saved > 0 ? 'green' : 'muted')
          + line('Pagaria hoje', m(r.payNow)) + line('Deixaria de pagar', `${plural(r.months, 'parcela', 'parcelas')} de ${m(d.parcel)}`)
          + line('A partir do mês que vem, sobra a mais', `+ ${m(r.freedPerMonth)} por mês`, 'green')
          + line('Saldo das contas depois de pagar', m(r.balanceAfter), r.balanceAfter < 0 ? 'red' : '')
          + (r.balanceAfter < 0 ? '<p class="red small">O saldo atual não cobre esse pagamento.</p>' : '')
          + whyText(`O Finan+ não conhece os juros do parcelamento: a economia é só a diferença entre o que falta (${m(d.left)}) e o valor para quitar. ${d.card ? 'No cartão, a antecipação é feita com o banco do cartão.' : 'Confirme o valor com o credor.'}`);
      }
    }
  }
  out.innerHTML = html;
  goal.innerHTML = canGoal ? btn('Transformar em meta', { cls: 'primary wide', icon: 'flag' }).replace('<button ', '<button data-sim="goal" ') : '';
}

/** valores iniciais da meta a partir da simulação aberta */
function goalFor(scen) {
  if (scen === 'save') { const v = posMoney(st.save.per); if (v == null) return null; return { name: 'Reserva', target: v * (int(st.save.months, 1, 600) ?? 12), monthly: v }; }
  if (scen === 'buy') { const pr = posMoney(st.buy.price), pm = Money.parse(st.buy.per) ?? 0; if (pr == null || pm <= 0) return null; return { name: st.buy.what.trim() || 'Compra', target: pr, monthly: pm }; }
  return null;
}

function posMoney(t) { const v = Money.parse(t); return v != null && v > 0 ? v : null; }
function int(t, lo, hi) { const s = String(t ?? '').trim(); if (!/^\d+$/.test(s)) return null; const n = +s; return n >= lo && n <= hi ? n : null; }
