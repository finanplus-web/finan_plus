// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Assistente do Finan+ (sem internet, sem IA na nuvem): sugestão de categoria, resumo do mês,
// dicas de economia e perguntas rápidas. Tradução direta de core/assist/*.kt do app Android,
// com os mesmos limites e textos. Detalhes de cada regra em ASSISTENTE.md.
import {
  Money, isFlow, isCard, ymOf, ymLen, ymFirst, ymLast, ymYear, ymMonth, dom, addDays, dayNum, weekday,
  brMonth, brMonthYear, brDate, brDayMonth,
} from './core.js';

const sum = l => l.reduce((n, t) => n + t.value, 0);
/** agrupa preservando a ordem de chegada (como groupBy do Kotlin) */
function groupBy(list, key) {
  const m = new Map();
  for (const x of list) { const k = key(x); const g = m.get(k); if (g) g.push(x); else m.set(k, [x]); }
  return m;
}
const byDesc = f => (a, b) => f(b) - f(a);

// ------------------------------------------------------------------ texto
export const Text = {
  /** Palavras sem significado para classificar (artigos, preposições e "ruído" de extrato bancário). */
  STOP: new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
    'e', 'com', 'para', 'pra', 'por', 'pelo', 'pela', 'ao', 'aos', 'meu', 'minha',
    'pag', 'pagto', 'compra', 'compras', 'cp', 'deb', 'debito', 'cred', 'credito', 'cartao', 'parcela',
    'ltda', 'sa', 'me', 'eireli', 'epp', 'br', 'www', 'sem', 'descricao',
  ]),
  /** minúsculas, sem acentos, só letras e números separados por um espaço */
  fold: s => String(s ?? '').normalize('NFD').replace(/\p{Mn}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
  /** palavras relevantes: 2+ letras, não só números, fora da lista STOP */
  tokens: s => Text.fold(s).split(' ').filter(w => w.length >= 2 && !/^\d+$/.test(w) && !Text.STOP.has(w)),
  key: s => [...new Set(Text.tokens(s))].join(' '),
  same: (a, b) => Text.fold(a) === Text.fold(b),
};

export const pct = v => `${Math.round(Math.abs(v))}%`;
export const plural = (n, one, many) => n === 1 ? `1 ${one}` : `${n} ${many}`;
/** formatação que esconde os valores (Ocultar valores) */
export const hiddenMoney = () => 'R$ ••••';

// ------------------------------------------------------------------ dicionário
export class Dictionary {
  constructor(sections) { this.sections = sections; }

  static parse(text) {
    const out = [];
    let kind = null, names = [], terms = [], line0 = 0;
    const flush = () => { if (kind && terms.length) out.push({ kind, names, terms: [...new Set(terms)], line: line0 }); };
    String(text).split(/\r?\n/).forEach((raw, i) => {
      const l = raw.split('#')[0].trim();
      if (!l) return;
      const h = /^\[\s*(despesa|receita)\s*:\s*(.+)]$/i.exec(l);
      if (h) {
        flush();
        kind = h[1].toLowerCase() === 'receita' ? 'income' : 'expense';
        names = h[2].split('|').map(x => x.trim()).filter(Boolean);
        terms = []; line0 = i + 1;
      } else if (kind) for (const t of l.split(',').map(Text.fold)) if (t.length >= 2) terms.push(t);
    });
    flush();
    return new Dictionary(out);
  }

  /** Categoria com maior peso de termos encontrados; empate entre categorias diferentes = sem sugestão. */
  match(desc, kind, categories) {
    const folded = Text.fold(desc), padded = ` ${folded} `, words = folded.split(' ');
    const found = [];
    for (const s of this.sections) {
      if (s.kind !== kind) continue;
      let cat = null;
      for (const n of s.names) { cat = categories.find(c => Text.same(c, n)) ?? null; if (cat) break; }
      if (!cat) continue;
      const hits = s.terms.filter(t => padded.includes(` ${t} `) ||
        (t.length >= 5 && !t.includes(' ') && words.some(w => w.startsWith(t) && w.length - t.length <= 2)));
      if (hits.length) found.push({ category: cat, terms: hits, section: s });
    }
    if (!found.length) return null;
    const weight = m => m.terms.reduce((n, t) => n + t.split(' ').length, 0);
    const byCat = [...groupBy(found, m => m.category)].map(([c, l]) => ({ category: c, terms: [...new Set(l.flatMap(m => m.terms))], section: l[0].section }))
      .sort(byDesc(weight));
    if (byCat.length > 1 && weight(byCat[0]) === weight(byCat[1])) return null;
    return byCat[0];
  }
}

// ------------------------------------------------------------------ sugestão de categoria
export const MIN_CONFIDENCE = 0.70, MIN_DOCS = 5, MIN_WORD_DOCS = 2, ALPHA = 0.1;
const PARCEL = /\s*\(\d+\/\d+\)\s*$/;
export const cleanParcel = d => String(d).replace(PARCEL, '');

export class Categorizer {
  /** lançamentos usados para aprender: do mesmo tipo, com descrição, em categoria que ainda existe */
  static training(s, kind) {
    const cats = new Set(s.cats[kind]);
    return s.txs.filter(t => t.kind === kind && isFlow(t) && cats.has(t.category) && t.desc !== 'Sem descrição');
  }

  constructor(s, kind, dict) {
    this.kind = kind; this.categories = s.cats[kind]; this.dict = dict || null;
    this.exact = new Map(); this.catDocs = new Map(); this.wordDocs = new Map(); this.catWords = new Map(); this.docs = 0;
    for (const t of Categorizer.training(s, kind)) {
      const toks = Text.tokens(cleanParcel(t.desc));
      if (!toks.length) continue;
      this.docs++;
      const uniq = [...new Set(toks)], k = uniq.join(' ');
      if (!this.exact.has(k)) this.exact.set(k, new Map());
      const m = this.exact.get(k), prev = m.get(t.category), d = dayNum(t.date);
      m.set(t.category, [(prev?.[0] ?? 0) + 1, Math.max(prev?.[1] ?? -Infinity, d)]);
      this.catDocs.set(t.category, (this.catDocs.get(t.category) || 0) + 1);
      this.catWords.set(t.category, (this.catWords.get(t.category) || 0) + toks.length);
      for (const w of uniq) {
        if (!this.wordDocs.has(w)) this.wordDocs.set(w, new Map());
        const wm = this.wordDocs.get(w); wm.set(t.category, (wm.get(t.category) || 0) + 1);
      }
    }
  }
  get trainingSize() { return this.docs; }

  suggest(desc) {
    const toks = Text.tokens(cleanParcel(desc));
    if (!toks.length) return null;
    return this.#same(toks) ?? this.#learned(toks) ?? this.#dictionary(desc);
  }

  #same(toks) {
    const m = this.exact.get([...new Set(toks)].join(' '));
    if (!m) return null;
    let total = 0; for (const v of m.values()) total += v[0];
    const [cat, [n]] = [...m].sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1])[0];
    const share = n / total;
    if (share < 0.6) return null;
    return { category: cat, source: 'SAME_DESCRIPTION', confidence: share,
      why: `Você já lançou esta descrição ${n === 1 ? '1 vez' : `${n} vezes`} como ${cat}` + (total > n ? ` (e ${total - n} vez(es) em outra categoria).` : '.') };
  }

  #learned(toks) {
    if (this.docs < MIN_DOCS || this.catDocs.size < 2) return null;
    const known = [...new Set(toks)].filter(w => this.wordDocs.has(w));
    if (!known.length) return null;
    const vocab = this.wordDocs.size, k = this.catDocs.size;
    const scores = new Map();
    for (const [c, n] of this.catDocs) {
      let sc = Math.log((n + 1) / (this.docs + k));
      for (const w of known) sc += Math.log(((this.wordDocs.get(w).get(c) || 0) + ALPHA) / (this.catWords.get(c) + ALPHA * vocab));
      scores.set(c, sc);
    }
    let cat = null, best = -Infinity;
    for (const [c, v] of scores) if (v > best) { best = v; cat = c; }
    let z = 0; for (const v of scores.values()) z += Math.exp(v - best);
    const p = 1 / z;
    if (p < MIN_CONFIDENCE) return null;
    let word = null, wd = -1;
    for (const w of known) { const x = this.wordDocs.get(w).get(cat) || 0; if (x > wd) { wd = x; word = w; } }
    if (wd < MIN_WORD_DOCS) return null;
    let totalW = 0; for (const v of this.wordDocs.get(word).values()) totalW += v;
    return { category: cat, source: 'LEARNED', confidence: p,
      why: `A palavra “${word}” aparece em ${wd} lançamento(s) seus de ${cat}` + (totalW > wd ? ` (de ${totalW} com essa palavra)` : '') + `. Confiança: ${pct(p * 100)}.` };
  }

  #dictionary(desc) {
    if (!this.dict) return null;
    const m = this.dict.match(desc, this.kind, this.categories);
    if (!m) return null;
    return { category: m.category, source: 'DICTIONARY', confidence: 0.6,
      why: `${m.terms.map(t => `“${t}”`).join(', ')} está no dicionário aberto do assistente, na seção de ${m.category} (linha ${m.section.line} de dicionario.txt).` };
  }

  /** "O que o assistente aprendeu": palavras mais frequentes por categoria (≥ 2 lançamentos) */
  learnedWords(perCategory = 6) {
    const out = [];
    for (const c of this.categories) {
      const words = [];
      for (const [w, m] of this.wordDocs) { const n = m.get(c); if (n >= MIN_WORD_DOCS) words.push([w, n]); }
      words.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      if (words.length) out.push([c, words.slice(0, perCategory)]);
    }
    return out;
  }
}

// ------------------------------------------------------------------ resumo do mês e dicas
export const INSIGHT_LABELS = {
  DUPLICATE: 'Possível duplicado', PRICE_UP: 'Aumento de preço', LIMIT_PACE: 'Ritmo do limite', OVER_INCOME: 'Ritmo do mês',
  CATEGORY_SPIKE: 'Acima da média', SMALL_SPENDS: 'Pequenos gastos', SUBSCRIPTIONS: 'Gastos fixos',
};
export const SMALL_VALUE = 2000, SMALL_MIN_COUNT = 10, SPIKE_RATIO = 1.30, SPIKE_MIN_DIFF = 5000, PACE_MIN_DAY = 7,
  SUB_MIN_MONTHS = 3, SUB_TOLERANCE = 0.30, PRICE_UP_RATIO = 1.05, DUP_DAYS = 60;

const expenses = s => s.txs.filter(t => t.kind === 'expense' && isFlow(t));
const inMonthUntil = (t, ym, lastDay) => ymOf(t.date) === ym && dom(t.date) <= lastDay;
const isFixed = t => !!t.recurringId || !!t.groupId;
const insight = (id, type, title, text, why, priority, extra = {}) => ({ id, type, title, text, why, priority, query: null, from: null, to: null, ...extra });

export const Insights = {
  report(s, today, money = Money.format) {
    const ym = ymOf(today), day = dom(today), prev = ym - 1, prevDay = Math.min(day, ymLen(prev));
    const exp = expenses(s);
    const curExp = exp.filter(t => t.paid && inMonthUntil(t, ym, day));
    const prevExp = exp.filter(t => t.paid && inMonthUntil(t, prev, prevDay));
    const curInc = s.txs.filter(t => t.kind === 'income' && t.paid && inMonthUntil(t, ym, day));
    const spent = sum(curExp), before = sum(prevExp), income = sum(curInc);
    const lines = [];
    if (spent === 0) lines.push(`Ainda não há despesas realizadas em ${brMonth(ym)}.`);
    else {
      let l = `Até hoje (dia ${day}) você gastou ${money(spent)} em ${brMonth(ym)}.`;
      if (before > 0) {
        const c = (spent - before) * 100 / before;
        l += Math.abs(c) < 3 ? ` Praticamente o mesmo que no mesmo período de ${brMonth(prev)} (${money(before)}).`
          : c > 0 ? ` São ${pct(c)} a mais que no mesmo período de ${brMonth(prev)} (${money(before)}).`
            : ` São ${pct(c)} a menos que no mesmo período de ${brMonth(prev)} (${money(before)}).`;
      }
      lines.push(l);
    }
    if (income > 0) lines.push(income >= spent ? `Entraram ${money(income)}; sobram ${money(income - spent)} até agora.`
      : `Entraram ${money(income)}; as despesas já passam as receitas em ${money(spent - income)}.`);
    let topCat = null, topV = -1;
    for (const [c, l] of groupBy(curExp, t => t.category)) { const v = sum(l); if (v > topV) { topV = v; topCat = c; } }
    if (topCat != null && spent > 0) lines.push(`A maior categoria é ${topCat}: ${money(topV)} (${pct(topV * 100 / spent)} das despesas).`);
    const pending = exp.filter(t => !t.paid && !isCard(t) && ymOf(t.date) === ym && t.date >= today);
    if (pending.length) lines.push(`Ainda faltam ${money(sum(pending))} em ${plural(pending.length, 'conta', 'contas')} a pagar até o fim do mês.`);
    const toReceive = s.txs.filter(t => t.kind === 'income' && !t.paid && ymOf(t.date) === ym);
    if (toReceive.length) lines.push(`A receber neste mês: ${money(sum(toReceive))} em ${plural(toReceive.length, 'lançamento', 'lançamentos')}.`);
    const late = exp.filter(t => !t.paid && !isCard(t) && t.date < today);
    if (late.length) lines.push(`${plural(late.length, 'conta está', 'contas estão')} em atraso (${money(sum(late))}).`);
    if (day <= 7) {
      const pe = sum(exp.filter(t => t.paid && ymOf(t.date) === prev));
      const pi = sum(s.txs.filter(t => t.kind === 'income' && t.paid && ymOf(t.date) === prev));
      if (pe > 0 || pi > 0) lines.push(`Fechamento de ${brMonth(prev)}: receitas ${money(pi)}, despesas ${money(pe)}, saldo ${money(pi - pe)}.`);
    }
    return {
      title: `Resumo de ${brMonthYear(ym)}`, lines,
      why: 'Considera só lançamentos realizados (pagos ou recebidos) até hoje. Compras no cartão contam na data da compra; '
        + `pagamentos de fatura não contam como despesa nova. A comparação usa os mesmos dias (1 a ${day}) do mês anterior, para ser justa.`,
    };
  },

  tips(s, today, money = Money.format) {
    const subs = Insights.recurringExpenses(s, today);
    const out = [
      ...Insights.duplicates(s, today, money), ...Insights.priceUps(subs, money), ...Insights.limitPace(s, today, money),
      Insights.overIncome(s, today, money), ...Insights.spikes(s, today, money), Insights.smallSpends(s, today, money),
      Insights.subscriptionsSummary(subs, today, money),
    ].filter(Boolean);
    return out.map((x, i) => [x, i]).sort((a, b) => b[0].priority - a[0].priority || a[1] - b[1]).map(x => x[0]);
  },

  /** mesma descrição + mesmo valor + mesma data, nos últimos 60 dias, sem ser parcela/recorrência */
  duplicates(s, today, money) {
    const since = addDays(today, -DUP_DAYS);
    const g = groupBy(expenses(s).filter(t => t.date >= since && !isFixed(t)), t => `${t.date}\u0001${t.value}\u0001${Text.key(t.desc)}`);
    return [...g].filter(([k, l]) => k.split('\u0001')[2] && l.length >= 2)
      .map((e, i) => [e, i]).sort((a, b) => (a[0][1][0].date < b[0][1][0].date ? 1 : a[0][1][0].date > b[0][1][0].date ? -1 : a[1] - b[1]))
      .slice(0, 3).map(([[k, l]]) => {
        const t = l[0], [date, value, key] = k.split('\u0001');
        return insight(`dup:${date}:${value}:${key}`, 'DUPLICATE', 'Possível lançamento duplicado',
          `“${t.desc}” aparece ${l.length} vezes em ${brDayMonth(t.date)} com o mesmo valor (${money(t.value)}). Se foi lançado em dobro, exclua a cópia.`,
          `Regra: mesma descrição, mesmo valor e mesma data, nos últimos ${DUP_DAYS} dias, sem ser parcela nem recorrência. `
          + 'Se forem compras diferentes de verdade, dispense este aviso.', 10, { query: t.desc, from: t.date, to: t.date });
      });
  },

  /** gasto que se repete uma vez por mês, com valor parecido, em ≥ 3 meses seguidos até o mês atual ou o anterior */
  recurringExpenses(s, today) {
    const cur = ymOf(today), window = cur - 5, out = [];
    const groups = groupBy(expenses(s).filter(t => !t.groupId && ymOf(t.date) >= window && ymOf(t.date) <= cur), t => Text.key(cleanParcel(t.desc)));
    for (const [key, list] of groups) {
      if (!key) continue;
      const byM = groupBy(list, t => ymOf(t.date));
      if ([...byM.values()].some(l => l.length > 1)) continue;
      const months = [...byM.keys()].sort((a, b) => a - b), end = months.at(-1);
      if (end !== cur && end !== cur - 1) continue;
      let run = 1;
      while (run < months.length && months[months.length - 1 - run] === end - run) run++;
      if (run < SUB_MIN_MONTHS) continue;
      const seq = months.slice(-run).map(m => [m, byM.get(m)[0]]);
      const vals = seq.map(x => x[1].value).sort((a, b) => a - b), median = vals[Math.floor(vals.length / 2)];
      if (vals.some(v => v < median * (1 - SUB_TOLERANCE) || v > median * (1 + SUB_TOLERANCE))) continue;
      out.push({ name: cleanParcel(seq.at(-1)[1].desc), key, byMonth: seq, get last() { return this.byMonth.at(-1)[1]; } });
    }
    return out.map((x, i) => [x, i]).sort((a, b) => b[0].last.value - a[0].last.value || a[1] - b[1]).map(x => x[0]);
  },

  priceUps(subs, money) {
    return subs.flatMap(m => {
      if (m.byMonth.length < 2) return [];
      const [ymLastM, last] = m.byMonth.at(-1), before = m.byMonth.at(-2)[1];
      if (last.value < before.value * PRICE_UP_RATIO || last.value - before.value < 100) return [];
      const c = (last.value - before.value) * 100 / before.value;
      return [insight(`up:${m.key}:${ymLastM}`, 'PRICE_UP', `${m.name} ficou mais caro`,
        `“${m.name}” passou de ${money(before.value)} para ${money(last.value)} em ${brMonth(ymLastM)} (+${pct(c)}). Vale conferir se houve reajuste ou mudança de plano.`,
        `Regra: gasto mensal (1 vez por mês, ${m.byMonth.length} meses seguidos) cujo último valor ficou pelo menos ${pct((PRICE_UP_RATIO - 1) * 100)} e R$ 1,00 acima do mês anterior.`,
        9, { query: m.name })];
    });
  },

  subscriptionsSummary(subs, today, money) {
    if (!subs.length) return null;
    const total = subs.reduce((n, m) => n + m.last.value, 0);
    const list = subs.slice(0, 5).map(m => `${m.name} (${money(m.last.value)})`).join(', ') + (subs.length > 5 ? ` e mais ${subs.length - 5}` : '');
    return insight(`subs:${ymOf(today)}:${subs.length}:${total}`, 'SUBSCRIPTIONS', 'Gastos fixos do mês',
      `Encontrei ${plural(subs.length, 'gasto que se repete', 'gastos que se repetem')} todo mês, somando ${money(total)} por mês (${money(total * 12)} por ano): ${list}. `
      + 'Gastos fixos pesam o ano inteiro: vale revisar planos, assinaturas e tarifas que dá para reduzir.',
      `Regra: mesma descrição, uma vez por mês, em pelo menos ${SUB_MIN_MONTHS} meses seguidos (até este mês ou o anterior), `
      + `com valores a até ${pct(SUB_TOLERANCE * 100)} da mediana. Parcelas não entram. O valor mensal é o do último lançamento.`, 4);
  },

  /** compromissos do mês (recorrências, parcelas, contas agendadas) + gasto variável no ritmo diário atual */
  project(list, today) {
    const ym = ymOf(today), day = dom(today), len = ymLen(ym);
    const month = list.filter(t => ymOf(t.date) === ym);
    const committed = sum(month.filter(t => isFixed(t) || !t.paid));
    const variable = sum(month.filter(t => !isFixed(t) && t.paid && dom(t.date) <= day));
    return { committed, variable, projected: committed + Math.round(variable / day * len) };
  },

  limitPace(s, today, money) {
    const ym = ymOf(today), day = dom(today), len = ymLen(ym);
    if (day < PACE_MIN_DAY || day >= len) return [];
    const exp = expenses(s), out = [];
    for (const [cat, lim] of s.limits) {
      const l = exp.filter(t => t.category === cat);
      const used = sum(l.filter(t => ymOf(t.date) === ym));
      if (used >= lim) continue;
      const p = Insights.project(l, today);
      if (p.projected <= lim || p.projected - lim < 1000) continue;
      const left = len - day, perDay = Math.trunc(Math.max(0, lim - used) / left);
      out.push(insight(`pace:${ymOf(today)}:${cat}`, 'LIMIT_PACE', `${cat} pode passar do limite`,
        `No ritmo atual, ${cat} deve fechar ${brMonth(ym)} em cerca de ${money(p.projected)}, acima do limite de ${money(lim)}. `
        + `Para ficar dentro, gaste até ${money(perDay)} por dia nos ${left} dias restantes.`,
        `Conta: compromissos do mês (recorrências, parcelas e contas agendadas) ${money(p.committed)} + gasto variável até hoje `
        + `${money(p.variable)} ÷ ${day} dias × ${len} dias. Já usado: ${money(used)} de ${money(lim)}.`,
        8, { query: cat, from: ymFirst(ym), to: today }));
    }
    return out;
  },

  overIncome(s, today, money) {
    const ym = ymOf(today), day = dom(today), len = ymLen(ym);
    if (day < PACE_MIN_DAY || day >= len) return null;
    const income = sum(s.txs.filter(t => t.kind === 'income' && ymOf(t.date) === ym));
    if (income <= 0) return null;
    const p = Insights.project(expenses(s), today);
    if (p.projected <= income) return null;
    return insight(`over:${ym}`, 'OVER_INCOME', 'Despesas podem passar das receitas',
      `No ritmo atual, as despesas de ${brMonth(ym)} chegam a cerca de ${money(p.projected)}, acima das receitas previstas para o mês (${money(income)}). `
      + `Diferença estimada: ${money(p.projected - income)}.`,
      `Conta: compromissos do mês ${money(p.committed)} + gasto variável até hoje ${money(p.variable)} ÷ ${day} dias × ${len} dias. `
      + 'Receitas previstas = recebidas + a receber neste mês.', 8, { from: ymFirst(ym), to: today });
  },

  spikes(s, today, money) {
    const ym = ymOf(today), exp = expenses(s).filter(t => t.paid), months = [ym - 1, ym - 2, ym - 3], out = [];
    for (const [cat, curList] of groupBy(exp.filter(t => ymOf(t.date) === ym && t.date <= today), t => t.category)) {
      const cur = sum(curList);
      const hist = months.map(m => sum(exp.filter(t => t.category === cat && ymOf(t.date) === m)));
      if (hist.filter(v => v > 0).length < 2) continue;
      const avg = Math.trunc((hist[0] + hist[1] + hist[2]) / 3);
      if (avg <= 0 || cur < avg * SPIKE_RATIO || cur - avg < SPIKE_MIN_DIFF) continue;
      const top = [...curList].sort((a, b) => b.value - a.value).slice(0, 2).map(t => `“${t.desc}” (${money(t.value)})`).join(', ');
      out.push(insight(`spike:${ym}:${cat}`, 'CATEGORY_SPIKE', `${cat} acima do normal`,
        `${cat} já soma ${money(cur)} em ${brMonth(ym)}, ${pct((cur - avg) * 100 / avg)} acima da sua média dos últimos 3 meses (${money(avg)}). Maiores: ${top}.`,
        `Regra: gasto realizado da categoria neste mês ≥ ${pct((SPIKE_RATIO - 1) * 100)} acima da média de `
        + `${[...months].reverse().map(brMonth).join(', ')} (${[...hist].reverse().map(money).join(' + ')} ÷ 3) e pelo menos ${money(SPIKE_MIN_DIFF)} a mais. `
        + 'Precisa de dados em pelo menos 2 desses meses.', 7, { query: cat, from: ymFirst(ym), to: today }));
    }
    return out;
  },

  smallSpends(s, today, money) {
    const ym = ymOf(today);
    const month = expenses(s).filter(t => t.paid && ymOf(t.date) === ym && t.date <= today);
    const small = month.filter(t => t.value <= SMALL_VALUE);
    if (small.length < SMALL_MIN_COUNT) return null;
    const total = sum(small), all = sum(month);
    const freq = [...groupBy(small, t => Text.key(t.desc))].filter(([k, l]) => k && l.length >= 2)
      .map((e, i) => [e, i]).sort((a, b) => b[0][1].length - a[0][1].length || a[1] - b[1]).slice(0, 3)
      .map(([[, l]]) => `“${l[0].desc}” (${l.length}×)`).join(', ');
    return insight(`small:${ym}:${small.length}`, 'SMALL_SPENDS', 'Pequenos gastos somando',
      `${small.length} compras de até ${money(SMALL_VALUE)} somaram ${money(total)} em ${brMonth(ym)} (${pct(total * 100 / all)} das despesas).`
      + (freq ? ` Os mais frequentes: ${freq}.` : ''),
      `Regra: despesas realizadas de até ${money(SMALL_VALUE)} neste mês, quando passam de ${SMALL_MIN_COUNT}. Sozinhas parecem pouco; juntas mostram para onde vai o dinheiro.`,
      5, { from: ymFirst(ym), to: today });
  },
};

// ------------------------------------------------------------------ perguntas rápidas
export const INTENT_LABELS = { TOTAL: 'total', MAX: 'maior lançamento', COUNT: 'quantidade', AVERAGE: 'média por dia', BALANCE: 'saldo' };
export const ASK_EXAMPLES = [
  'Quanto gastei este mês?', 'Quanto gastei com mercado no mês passado?', 'Maior gasto da semana',
  'Quanto recebi este ano?', 'Saldo do mês passado', 'Quantas vezes usei uber nos últimos 30 dias?',
];
const W = a => new Set(a.split(' '));
const EXPENSE_W = W('gastei gasto gastos gastou gastamos despesa despesas paguei pagamos saiu sairam custou custaram gastar');
const INCOME_W = W('recebi recebemos receita receitas ganhei ganho ganhos entrou entraram entrada entradas renda');
const BALANCE_W = W('saldo sobrou sobra economizei guardei balanco lucro');
const MAX_W = W('maior maiores caro cara');
const COUNT_W = W('quantas quantos vezes frequencia');
const AVG_W = W('media medio');
const FILLER = W('quanto quanta qual quais foi foram eu nos meu minha meus minhas total valor lancamento lancamentos usei fiz tive tem teve ja ate agora '
  + 'mes ano semana dia dias ultimos ultimas ultimo ultima passado passada este esta esse essa neste nesta nesse nessa deste desta desse dessa hoje ontem '
  + 'por no na em de do da com o a os as que mais gasto atual corrente inteiro todo toda periodo compra compras vez');
const MONTH_W = { janeiro: 1, jan: 1, fevereiro: 2, fev: 2, marco: 3, abril: 4, abr: 4, maio: 5, junho: 6, jun: 6, julho: 7, jul: 7, agosto: 8, ago: 8,
  setembro: 9, set: 9, outubro: 10, out: 10, novembro: 11, nov: 11, dezembro: 12, dez: 12 };
const isDigits = w => /^\d+$/.test(w);
const per = (from, to, label) => ({ from, to, label });

function period(w, today, used) {
  const f = ` ${w.join(' ')} `, has = (...p) => p.some(x => f.includes(` ${x} `)), ym = ymOf(today), year = ymYear(ym);
  const m = / ultimos (\d{1,3}) dias /.exec(f);
  if (m) { const n = Math.min(366, Math.max(1, +m[1])); used.add(m[1]); return per(addDays(today, 1 - n), today, `últimos ${n} dias`); }
  if (has('hoje')) return per(today, today, 'hoje');
  if (has('ontem')) { const d = addDays(today, -1); return per(d, d, `ontem (${brDate(d)})`); }
  if (has('semana passada', 'ultima semana')) {
    const mon = addDays(today, 1 - weekday(today) - 7), sun = addDays(mon, 6);
    return per(mon, sun, `semana passada (${brDayMonth(mon)} a ${brDayMonth(sun)})`);
  }
  if (has('semana')) { const mon = addDays(today, 1 - weekday(today)); return per(mon, today, `esta semana (desde ${brDayMonth(mon)})`); }
  if (has('mes passado', 'ultimo mes')) return per(ymFirst(ym - 1), ymLast(ym - 1), brMonthYear(ym - 1));
  if (has('ano passado')) return per(`${year - 1}-01-01`, `${year - 1}-12-31`, `ano de ${year - 1}`);
  if (has('este ano', 'esse ano', 'neste ano', 'nesse ano', 'ano atual', 'deste ano', 'desse ano')) return per(`${year}-01-01`, today, `este ano (${year})`);
  for (let i = 0; i < w.length; i++) {
    const mm = MONTH_W[w[i]];
    if (!mm) continue;
    used.add(w[i]);
    const yw = w.slice(i + 1, i + 3).find(x => x.length === 4 && isDigits(x));
    let y;
    if (yw) { y = +yw; used.add(yw); } else y = mm > ymMonth(ym) ? year - 1 : year;
    const t = y * 12 + mm - 1;
    return per(ymFirst(t), ymLast(t), brMonthYear(t));
  }
  const y = w.find(x => x.length === 4 && isDigits(x) && +x >= 1990 && +x <= 2100);
  if (y) {
    used.add(y);
    const a = `${y}-01-01`, b = `${y}-12-31`, mx = today > a ? today : a;
    return per(a, b < mx ? b : mx, `ano de ${y}`);
  }
  return per(ymFirst(ym), ymLast(ym), `${brMonthYear(ym)} (este mês)`);
}

export const Ask = {
  parse(question, s, today) {
    const f = Text.fold(question), words = f.split(' ').filter(Boolean), set = new Set(words), used = new Set();
    let category = null, catKind = null;
    const padded = ` ${f} `;
    for (const k of ['income', 'expense']) for (const c of s.cats[k]) {
      const fc = Text.fold(c);
      if (fc && padded.includes(` ${fc} `) && (category == null || fc.length > Text.fold(category).length)) { category = c; catKind = k; }
    }
    if (category != null) for (const x of Text.fold(category).split(' ')) used.add(x);
    const any = ws => words.some(x => ws.has(x));
    const kind = any(INCOME_W) ? 'income' : any(EXPENSE_W) ? 'expense' : catKind;
    const intent = any(BALANCE_W) ? 'BALANCE' : any(AVG_W) ? 'AVERAGE' : any(MAX_W) ? 'MAX' : any(COUNT_W) ? 'COUNT' : 'TOTAL';
    for (const ws of [EXPENSE_W, INCOME_W, BALANCE_W, MAX_W, COUNT_W, AVG_W]) for (const x of ws) used.add(x);
    void set;
    const p = period(words, today, used);
    const rest = [...new Set(words.filter(x => !used.has(x) && !FILLER.has(x) && !Text.STOP.has(x) && x.length >= 2 && !isDigits(x)))];
    const vocab = new Set();
    for (const t of s.txs) for (const x of Text.fold(t.desc + ' ' + t.category).split(' ')) vocab.add(x);
    const vl = [...vocab], known = [], ignored = [];
    for (const x of rest) (vl.some(v => v.startsWith(x)) ? known : ignored).push(x);
    return { intent, kind: intent === 'BALANCE' ? null : kind ?? 'expense', period: p, category, words: known, ignored };
  },

  answer(question, s, today, money = Money.format) {
    const p = Ask.parse(question, s, today);
    const all = s.txs.filter(t => isFlow(t) && (p.kind == null || t.kind === p.kind) && t.date >= p.period.from && t.date <= p.period.to
      && (p.category == null || t.category === p.category)
      && (!p.words.length || (d => p.words.every(w => ` ${d} `.includes(` ${w}`)))(Text.fold(t.desc + ' ' + t.category))));
    const done = all.filter(t => t.paid), pending = all.filter(t => !t.paid);
    const what = p.kind === 'income' ? 'receitas' : p.kind === 'expense' ? 'despesas' : 'receitas e despesas';
    const filter = [p.category != null ? `categoria ${p.category}` : null, p.words.length ? `descrição com “${p.words.join(' ')}”` : null].filter(Boolean);
    const understood = `Como entendi: ${INTENT_LABELS[p.intent]} de ${what} · ${p.period.label}` + (filter.length ? ' · ' + filter.join(' · ') : '')
      + ' · só valores realizados.' + (p.ignored.length ? ` Ignorei ${p.ignored.map(x => `“${x}”`).join(', ')}: não aparece em nenhum lançamento.` : '');
    const scope = (filter.length ? ` (${filter.join(', ')})` : '') + ` em ${p.period.label}`;
    const total = sum(done), verb = p.kind === 'income' ? 'recebeu' : 'gastou';
    const pendNote = pending.length && p.intent !== 'BALANCE'
      ? ` Há ainda ${money(sum(pending))} pendente(s) em ${plural(pending.length, 'lançamento', 'lançamentos')}.` : '';
    let text;
    switch (p.intent) {
      case 'TOTAL':
        text = !done.length ? `Não encontrei ${what} realizadas${scope}.${pendNote}`
          : `Você ${verb} ${money(total)}${scope}, em ${plural(done.length, 'lançamento', 'lançamentos')}.${pendNote}`;
        break;
      case 'COUNT':
        text = !done.length ? `Nenhum lançamento de ${what}${scope}.${pendNote}`
          : `${plural(done.length, 'lançamento', 'lançamentos')} de ${what}${scope}, somando ${money(total)}.${pendNote}`;
        break;
      case 'MAX': {
        const top = done.map((t, i) => [t, i]).sort((a, b) => b[0].value - a[0].value || a[1] - b[1]).slice(0, 3).map(x => x[0]);
        text = !top.length ? `Não encontrei ${what} realizadas${scope}.`
          : `O maior foi “${top[0].desc}”: ${money(top[0].value)} em ${brDate(top[0].date)} (${top[0].category}).`
          + (top.length > 1 ? ' Depois: ' + top.slice(1).map(t => `“${t.desc}” ${money(t.value)}`).join('; ') + '.' : '');
        break;
      }
      case 'AVERAGE': {
        const end = p.period.to < today ? p.period.to : today;
        const days = Math.max(1, dayNum(end) - dayNum(p.period.from) + 1);
        text = !done.length ? `Não encontrei ${what} realizadas${scope}.`
          : `Média de ${money(Math.trunc(total / days))} por dia${scope} (${money(total)} em ${days} dia(s) até ${brDate(end)}).`;
        break;
      }
      default: {
        const inc = sum(done.filter(t => t.kind === 'income')), exp = sum(done.filter(t => t.kind === 'expense'));
        text = `Em ${p.period.label}: receitas ${money(inc)}, despesas ${money(exp)}, saldo ${money(inc - exp)}.`;
      }
    }
    return { text, understood, parsed: p, matches: done };
  },
};
