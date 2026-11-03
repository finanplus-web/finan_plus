// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Dívidas (Meu dinheiro › Dívidas), tradução de core/Debts.kt do Finan+ Android: empréstimos e financiamentos
// são lançamentos da categoria "Dívidas" (o antigo "Empréstimo"), normalmente em parcelas. Nada novo é gravado:
// as dívidas são montadas a partir dos lançamentos que já existem, agrupando as parcelas do mesmo parcelamento
// (ou a mesma descrição).
import { Money, isFlow, isCard } from './core.js';
import { Text } from './assist.js';
import { Words } from './words.js';

const NAMES = new Set(['dividas', 'divida', 'emprestimo', 'emprestimos', 'financiamento', 'financiamentos']);
const SUFFIX = /\s*\((\d+)\/(\d+)\)\s*$/;
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export const Debts = {
  CATEGORY: 'Dívidas',

  isDebtCategory: c => NAMES.has(Text.fold(c).trim()),

  /** "Mercado Pago (3/10)" → "Mercado Pago" */
  baseName: desc => String(desc).replace(SUFFIX, '').trim(),

  /**
   * Dívidas: { name, parcels (por data), next (parcela pendente mais antiga ou null), pendingCount, pendingTotal,
   * paidCount, totalCount (o total do parcelamento quando o lançamento diz, senão o nº de lançamentos), done }.
   * Abertas primeiro, pela próxima parcela; depois pelo nome.
   */
  list(s) {
    const groups = new Map();
    for (const t of s.txs) {
      if (t.kind !== 'expense' || !isFlow(t) || isCard(t) || !Debts.isDebtCategory(t.category)) continue;
      const k = t.groupId ? 'g:' + t.groupId : 'd:' + Text.fold(Debts.baseName(t.desc));
      const g = groups.get(k);
      if (g) g.push(t); else groups.set(k, [t]);
    }
    const out = [...groups.values()].map(l => {
      const sorted = l.map((t, i) => [t, i]).sort((a, b) => cmp(a[0].date, b[0].date) || a[1] - b[1]).map(x => x[0]);
      const pending = sorted.filter(t => !t.paid);
      const pendingCount = pending.length;
      return {
        name: Debts.baseName(sorted.at(-1).desc) || Debts.CATEGORY,
        parcels: sorted, next: pending[0] ?? null, pendingCount,
        pendingTotal: pending.reduce((n, t) => n + t.value, 0),
        paidCount: sorted.filter(t => t.paid).length,
        totalCount: Math.max(sorted.length, ...sorted.map(t => t.parcelTotal)),
        done: pendingCount === 0,
      };
    });
    return out.sort((a, b) => (a.done - b.done) || cmp(a.next?.date ?? '￿', b.next?.date ?? '￿') || cmp(a.name, b.name));
  },

  /** "1 dívida · parcela de R$ 121,40 em 13/11"; sem dívidas abertas: null. */
  summary(s, hide) {
    const open = Debts.list(s).filter(d => !d.done);
    if (!open.length) return null;
    const n = Words.count(open.length, 'dívida', 'dívidas');
    let next = null;
    for (const d of open) if (d.next && (!next || d.next.date < next.date)) next = d.next;
    if (!next) return n;
    const v = hide ? 'R$ ••••' : Money.format(next.value);
    const dm = `${next.date.slice(8, 10)}/${next.date.slice(5, 7)}`;
    return open.length === 1 ? `${n} · parcela de ${v} em ${dm}` : `${n} · próxima parcela de ${v} em ${dm}`;
  },
};
