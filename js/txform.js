// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regras da tela de lançamento (Receita e Despesa) que não dependem da interface: valor digitado em pt-BR,
// categorias, recentes, sugestões de descrição e a migração das categorias antigas. Tradução de core/TxForm.kt
// do Finan+ Android (mesmos testes em tests/txform.test.mjs). Ver LANCAMENTO.md e REDESIGN-COERENCIA.md.
import { Money, Ops, isFlow } from './core.js';
import { Text } from './assist.js';
import { Debts } from './debts.js';

const digits = s => [...s].filter(c => c >= '0' && c <= '9').join('');

/** Valor digitado na tela de lançamento: formatação em tempo real. O valor salvo continua vindo de Money.parse. */
export const AmountInput = {
  /** mais algarismos de reais que isto passam do limite de MAX_ABS_CENTS */
  MAX_INT_DIGITS: 13,

  /**
   * Texto digitado → texto formatado: milhar com ponto, vírgula decimal com até 2 casas.
   * "" → "", "0" → "0", "12,5" → "12,5", "1234,56" → "1.234,56", "1234" → "1.234".
   * Um ponto digitado no fim ("12.") vale como vírgula; os pontos do meio são o agrupamento de milhar
   * que a própria formatação põe, então saem e voltam.
   */
  format(raw) {
    let s = [...String(raw ?? '')].filter(c => (c >= '0' && c <= '9') || c === ',' || c === '.').join('');
    if (s.endsWith('.') && !s.includes(',')) s = s.slice(0, -1) + ',';
    s = s.split('.').join('');
    const comma = s.indexOf(',');
    const intDigits = digits(comma >= 0 ? s.slice(0, comma) : s).slice(0, AmountInput.MAX_INT_DIGITS);
    const dec = comma >= 0 ? digits(s.slice(comma + 1)).slice(0, 2) : null;
    if (!intDigits && dec == null) return '';
    // zeros à esquerda não valem ("007" → "7"), mas "0" e "0,5" ficam
    const clean = intDigits.replace(/^0+/, '') || '0';
    const grouped = clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dec != null ? `${grouped},${dec}` : grouped;
  },
  /** valor em centavos do texto formatado (null se vazio) */
  cents: text => Money.parse(text),
  /** só valor maior que zero pode ser salvo (zero e vazio não) */
  isPositive: text => (AmountInput.cents(text) ?? 0) > 0,
  /** digitou algo, mas o valor é zero ("0", "0,00"): é quando o erro discreto aparece embaixo do valor */
  isZeroTyped: text => !!text && AmountInput.cents(text) === 0,
  /** valor guardado (centavos) → texto do campo, já formatado ("1.234,56") */
  fromCents: c => AmountInput.format(Money.input(c)),
};

/** formas de pagamento que eram categorias: cartão é forma de pagamento; limite especial é da conta */
const PAYMENT_LIKE = new Set(['cartao de credito', 'cartao', 'limite especial', 'cheque especial']);
const isLegacyCard = c => PAYMENT_LIKE.has(Text.fold(String(c ?? '').trim()));
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const isBlank = s => !String(s ?? '').trim();

export const TxForm = {
  /** cartão é forma de pagamento (campo "Pagar com"), não categoria */
  LEGACY_CARD_CATEGORY: 'Cartão de Crédito',
  OTHERS: 'Outros',

  /** nome mostrado: lançamento antigo salvo como "Cartão de Crédito" ou "Limite Especial" aparece como "Outros" (o dado não muda) */
  displayCategory: c => isLegacyCard(c) ? TxForm.OTHERS : c,
  /** categorias da gaveta: as do tipo, sem as formas de pagamento antigas, sem repetir */
  choices: cats => [...new Set(cats.filter(c => !isLegacyCard(c)))],
  isPaymentLike: c => isLegacyCard(c),

  /**
   * Migração das categorias (uma vez, ao abrir): "Cartão de Crédito" e "Limite Especial" saem da lista de despesas;
   * "Empréstimo" vira "Dívidas" (lançamentos, recorrências e limites acompanham o novo nome). Os lançamentos antigos
   * com cartão ou limite especial continuam com o nome salvo e aparecem como "Outros". null = nada a migrar.
   */
  migrate(s) {
    let exp = s.cats.expense, changed = false;
    const cleaned = exp.filter(c => !isLegacyCard(c));
    if (cleaned.length !== exp.length && cleaned.length) { exp = cleaned; changed = true; }
    let st = { ...s, cats: { ...s.cats, expense: exp } };
    const D = Debts.CATEGORY;
    for (const old of exp.filter(c => Debts.isDebtCategory(c) && c !== D)) {
      if (!st.cats.expense.includes(D)) {
        const r = Ops.renameCategory(st, 'expense', old, D);
        if (r.ok) st = r.state;
      } else {
        let limits;
        if (st.limits.has(old) && !st.limits.has(D)) { limits = new Map(st.limits); const v = limits.get(old); limits.delete(old); limits.set(D, v); }
        else { limits = new Map(st.limits); limits.delete(old); }
        st = { ...st, cats: { ...st.cats, expense: st.cats.expense.filter(c => c !== old) },
          txs: st.txs.map(t => t.kind === 'expense' && t.category === old ? { ...t, category: D } : t),
          recurring: st.recurring.map(r => r.kind === 'expense' && r.category === old ? { ...r, category: D } : r), limits };
      }
      changed = true;
    }
    return changed ? st : null;
  },

  /** Ao trocar Receita/Despesa: a categoria continua se existir no novo tipo (sem diferenciar maiúsculas e acentos); senão "". */
  categoryAfterKindChange: (current, available) =>
    available.find(c => Text.fold(c) === Text.fold(current) && !isBlank(current)) ?? '',

  /** busca na gaveta: contém o texto, sem diferenciar maiúsculas e acentos; busca vazia = tudo */
  filter(list, query) {
    const q = Text.fold(String(query ?? '').trim());
    return q ? list.filter(c => Text.fold(c).includes(q)) : list;
  },

  /**
   * "Usadas recentemente": até [n] categorias do tipo, da usada mais recentemente para a menos (data do lançamento;
   * empate: o gravado depois). Só as que ainda existem em [available]. Reservas para meta e pagamentos de fatura não contam.
   */
  recentCategories(txs, kind, available, n = 4) {
    const ok = new Map();
    for (const c of available) ok.set(Text.fold(c), c); // associateBy: vale o último com a mesma chave
    const out = [];
    const list = txs.map((t, i) => [t, i]).filter(([t]) => t.kind === kind && isFlow(t) && !isBlank(t.category))
      .sort((a, b) => cmp(b[0].date, a[0].date) || b[1] - a[1]);
    for (const [t] of list) {
      const c = ok.get(Text.fold(t.category));
      if (c != null && !out.includes(c)) out.push(c);
      if (out.length >= n) break;
    }
    return out;
  },

  /**
   * Sugestões de descrição: as mais usadas do tipo (empate: a mais recente), sem repetir. Descrição igual à
   * categoria não entra (é o que o app grava quando a descrição fica em branco).
   */
  descriptionSuggestions(txs, kind, n = 8) {
    const groups = new Map();
    txs.forEach((t, i) => {
      if (t.kind !== kind || !isFlow(t) || isBlank(t.desc) || t.desc.trim() === String(t.category).trim()) return;
      const k = Text.fold(t.desc.trim());
      const g = groups.get(k);
      if (g) g.push([t, i]); else groups.set(k, [[t, i]]);
    });
    return [...groups.values()].map(g => {
      let last = g[0];
      for (const x of g) if (cmp(x[0].date, last[0].date) > 0 || (x[0].date === last[0].date && x[1] > last[1])) last = x;
      return { desc: last[0].desc.trim(), count: g.length, date: last[0].date, index: last[1] };
    }).sort((a, b) => b.count - a.count || cmp(b.date, a.date) || b.index - a.index).slice(0, n).map(x => x.desc);
  },
};
