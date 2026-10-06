// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Núcleo do Finan+ web: modelo, dinheiro, datas, regras financeiras, validações e backup.
// Tradução direta do núcleo Kotlin do app Android (core/Model.kt, Money.kt, Finance.kt, Ops.kt,
// Backup.kt), com os mesmos testes (tests/). Não depende do navegador: roda também no Node.
//
// Convenções:
// - todo valor em dinheiro é inteiro em centavos (nada de ponto flutuante nas contas);
// - datas são strings "AAAA-MM-DD"; meses são inteiros ano*12 + (mês-1);
// - receitas/despesas contam só o que foi realizado (pago/recebido);
// - compra no cartão conta na data da compra; pagamento de fatura não é despesa nova.

// ------------------------------------------------------------------ datas
export const pad2 = n => String(n).padStart(2, '0');
export const dayNum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
export const fromDayNum = n => { const d = new Date(n * 86400000); return `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`; };
export const addDays = (s, n) => fromDayNum(dayNum(s) + n);
export const ymOf = s => (+s.slice(0, 4)) * 12 + (+s.slice(5, 7)) - 1;
export const ymYear = ym => Math.floor(ym / 12);
export const ymMonth = ym => ym - ymYear(ym) * 12 + 1;
export const ymStr = ym => `${String(ymYear(ym)).padStart(4, '0')}-${pad2(ymMonth(ym))}`;
export const ymLen = ym => new Date(Date.UTC(ymYear(ym), ymMonth(ym), 0)).getUTCDate();
export const ymFirst = ym => `${ymStr(ym)}-01`;
export const ymLast = ym => `${ymStr(ym)}-${pad2(ymLen(ym))}`;
/** dia [day] do mês, limitado ao último dia (31 → 28/29/30) */
export const ymDay = (ym, day) => `${ymStr(ym)}-${pad2(Math.min(Math.max(day, 1), ymLen(ym)))}`;
export const dom = s => +s.slice(8, 10);
/** soma meses mantendo o dia quando possível (31/jan + 1 → 28/fev) */
export const plusMonths = (s, n) => ymDay(ymOf(s) + n, dom(s));
/** 1 = segunda … 7 = domingo */
export const weekday = s => { const w = new Date(dayNum(s) * 86400000).getUTCDay(); return w === 0 ? 7 : w; };
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function validDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= ymLen(y * 12 + m - 1);
}

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));
export const brMonth = ym => MONTHS[ymMonth(ym) - 1];
export const brMonthYear = ym => `${brMonth(ym)} de ${ymYear(ym)}`;
export const brMonthLabel = ym => `${MONTHS_SHORT[ymMonth(ym) - 1]} de ${ymYear(ym)}`;
export const brDate = s => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
export const brDayMonth = s => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
/** "04 de Outubro de 2026" */
export const fullDate = s => { const n = MONTHS[+s.slice(5, 7) - 1]; return `${s.slice(8, 10)} de ${n[0].toUpperCase()}${n.slice(1)} de ${+s.slice(0, 4)}`; };

// ------------------------------------------------------------------ dinheiro
export const Money = {
  /** "R$ 1.234,56" / "-R$ 0,50" — formatação própria, não depende do idioma do navegador */
  format(c) {
    const neg = c < 0, a = Math.abs(c);
    const reais = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + 'R$ ' + reais + ',' + pad2(a % 100);
  },
  /** valor para campo de edição: "1500,50" */
  input(c) { const a = Math.abs(c); return (c < 0 ? '-' : '') + Math.floor(a / 100) + ',' + pad2(a % 100); },
  /** reais (número do JSON) → centavos */
  fromReais: d => Math.round(d * 100),
  /** centavos → "12.50" para o JSON */
  reaisJson(c) { const a = Math.abs(c); return (c < 0 ? '-' : '') + Math.floor(a / 100) + '.' + pad2(a % 100); },
  /** Aceita "1.500,50", "1500,50", "1500.50", "1,500.25", "R$ 2.000", "-50". Devolve centavos ou null. */
  parse(input) {
    let s = String(input ?? '').replace(/R\$/g, '').replace(/\s/g, '');
    if (!s) return null;
    const neg = s.startsWith('-');
    if (neg || s.startsWith('+')) s = s.slice(1);
    if (!s || !/^[\d.,]+$/.test(s)) return null;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    const count = (str, ch) => str.split(ch).length - 1;
    if (lc >= 0 && ld >= 0) {
      const dec = lc > ld ? ',' : '.', thou = dec === ',' ? '.' : ',';
      s = s.split(thou).join('');
      if (count(s, dec) > 1) return null;
      s = s.replace(dec, '.');
    } else if (lc >= 0) {
      if (count(s, ',') > 1) return null;
      s = s.replace(',', '.');
    } else if (ld >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.split('.').join('');
    }
    if (count(s, '.') > 1) return null;
    const parts = s.split('.');
    const intPart = parts[0] || '0';
    if (intPart.length > 13) return null;
    const frac = parts.length > 1 ? parts[1] : '';
    if (parts.length > 1 && !frac && !parts[0]) return null;
    const whole = parseInt(intPart, 10);
    if (Number.isNaN(whole)) return null;
    // arredonda a partir da 3ª casa, como o Finan+ web sempre fez (Math.round)
    const f3 = parseInt((frac + '000').slice(0, 3), 10);
    const cents = whole * 100 + Math.floor((f3 + 5) / 10);
    return neg ? -cents : cents;
  },
};

// ------------------------------------------------------------------ modelo
export const MAIN_ACCOUNT = 'main';
export const CARD_PAYMENT_CAT = 'Pagamento de fatura';
export const DEFAULT_EXPENSE = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'];
export const DEFAULT_INCOME = ['Salário', 'Extra', 'Investimentos', 'Outros'];
export const AUTOLOCK_OPTIONS = [0, 1, 5, 15, 30];
export const THEMES = [
  ['auto', 'Sistema'], ['light', 'Claro'], ['materialBlue', 'Material You'],
  ['oledGray', 'OLED Cinza'], ['tokyo', 'Tokyo Night'], ['nord', 'Nord'],
];
export const themeOf = s => s === 'dark' ? 'oledGray' : THEMES.some(t => t[0] === s) ? s : 'auto';
export const themeLabel = id => (THEMES.find(t => t[0] === id) || THEMES[0])[1];

let seq = 0;
export function newId() {
  const r = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] % (1 << 20) : Math.floor(Math.random() * (1 << 20));
  return Date.now().toString(36) + (seq++).toString(36) + r.toString(36);
}

export function tx(o) {
  return {
    id: o.id, kind: o.kind, value: o.value, date: o.date, desc: o.desc, category: o.category, paid: !!o.paid,
    accountId: o.accountId ?? MAIN_ACCOUNT, cardId: o.cardId ?? '', cardPayment: o.cardPayment ?? '',
    recurringId: o.recurringId ?? '', groupId: o.groupId ?? '', parcelN: o.parcelN ?? 0, parcelTotal: o.parcelTotal ?? 0,
  };
}
export const isFlow = t => !t.cardPayment;
export const isCard = t => !!t.cardId;

export function newState(over = {}) {
  return {
    txs: [], goals: [], accounts: [{ id: MAIN_ACCOUNT, name: 'Conta principal', initial: 0 }], cards: [], recurring: [],
    cats: { expense: [...DEFAULT_EXPENSE], income: [...DEFAULT_INCOME] },
    limits: new Map(), privacy: false, autoLock: 0, theme: 'auto', ...over,
  };
}
export const clone = s => ({
  ...s, txs: s.txs.map(t => ({ ...t })), goals: s.goals.map(g => ({ ...g })), accounts: s.accounts.map(a => ({ ...a })),
  cards: s.cards.map(c => ({ ...c })), recurring: s.recurring.map(r => ({ ...r })),
  cats: { expense: [...s.cats.expense], income: [...s.cats.income] }, limits: new Map(s.limits),
});
export const account = (s, id) => s.accounts.find(a => a.id === id);
export const card = (s, id) => s.cards.find(c => c.id === id);
const sumOf = l => l.reduce((n, t) => n + t.value, 0);

// ------------------------------------------------------------------ cartões e faturas
export const Finance = {
  /** mês da fatura de uma compra: após o fechamento vai para a seguinte */
  invoiceYm(c, date) { const ym = ymOf(date); return dom(date) > Math.min(c.close, ymLen(ym)) ? ym + 1 : ym; },
  /** vencimento: mesmo mês se vence depois do fechamento, senão no mês seguinte */
  invoiceDue: (c, ym) => ymDay(c.due > c.close ? ym : ym + 1, c.due),
  invoiceClose: (c, ym) => ymDay(ym, c.close),

  /** Limite usado inclui parcelas futuras; pagamentos abatem da fatura mais antiga. */
  cardStatus(s, c, today) {
    const purchases = s.txs.filter(t => t.cardId === c.id && t.kind === 'expense');
    const paid = sumOf(s.txs.filter(t => t.cardPayment === c.id && t.paid));
    const by = new Map();
    for (const p of purchases) { const k = Finance.invoiceYm(c, p.date); by.set(k, (by.get(k) || 0) + p.value); }
    let left = paid;
    const invoices = [...by.keys()].sort((a, b) => a - b).map(ym => {
      const total = by.get(ym), pay = Math.min(left, total); left -= pay;
      const close = Finance.invoiceClose(c, ym);
      return { ym, total, paid: pay, open: total - pay, close, due: Finance.invoiceDue(c, ym), closed: today > close };
    });
    const spent = sumOf(purchases), used = Math.max(0, spent - paid);
    const current = invoices.find(i => i.open > 0 && i.closed) || invoices.find(i => i.open > 0 && !i.closed) || null;
    return { used, available: Math.max(0, c.limit - used), credit: Math.max(0, paid - spent), invoices, current };
  },

  // ---- saldos
  accountBalance: (s, a) => a.initial + s.txs.filter(t => t.accountId === a.id && !isCard(t) && t.paid)
    .reduce((n, t) => t.kind === 'income' ? n + t.value : n - t.value, 0),
  currentBalance: s => s.accounts.reduce((n, a) => n + Finance.accountBalance(s, a), 0),
  /** saldo previsto em [until]: pendências das contas + faturas em aberto que vencem até lá */
  futureBalance(s, until, today) {
    let c = Finance.currentBalance(s);
    for (const t of s.txs) { if (isCard(t) || t.paid || t.date > until) continue; c += t.kind === 'income' ? t.value : -t.value; }
    for (const cd of s.cards) for (const inv of Finance.cardStatus(s, cd, today).invoices) if (inv.open > 0 && inv.due <= until) c -= inv.open;
    return c;
  },

  // ---- recorrências
  /** Gera os lançamentos até o mês de [today], recuperando até 24 meses. Nunca antes do início. Devolve [estado, n]. */
  generateRecurring(s, today) {
    const cur = ymOf(today), add = [];
    let changed = false;
    const recs = s.recurring.map(r => {
      if (!r.active) return r;
      const startYm = r.start ? ymOf(r.start) : r.last != null ? r.last + 1 : cur;
      let m = r.last != null && r.last + 1 > startYm ? r.last + 1 : startYm;
      let last = r.last, guard = 0;
      while (m <= cur && guard < 24) {
        const date = ymDay(m, r.day);
        last = m;
        if (!r.start || date >= r.start)
          add.push(tx({ id: newId(), kind: r.kind, value: r.value, date, desc: r.desc, category: r.category, paid: !!r.cardId, accountId: r.accountId, cardId: r.cardId, recurringId: r.id }));
        m++; guard++;
      }
      if (last === r.last) return r;
      changed = true;
      return { ...r, last };
    });
    if (!add.length && !changed) return [s, 0];
    return [{ ...s, txs: [...s.txs, ...add], recurring: recs }, add.length];
  },

  /** divide [total] em [n] parcelas; a diferença de centavos fica na primeira */
  splitInstallments(total, n) { const base = Math.trunc(total / n), rest = total - base * n; return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0)); },

  // ---- metas
  goalPlan(g, today) {
    const remaining = Math.max(0, g.target - g.saved);
    if (remaining === 0) return { remaining: 0, done: true, needed: null, eta: null, late: false, pastDue: false };
    let needed = null, pastDue = false;
    if (g.deadline) {
      if (g.deadline < today) pastDue = true;
      else { const months = ymOf(g.deadline) - ymOf(today) + 1; needed = Math.floor((remaining + months - 1) / months); }
    }
    let eta = null, late = false;
    if (g.monthly > 0) {
      const months = Math.min(1200, Math.floor((remaining + g.monthly - 1) / g.monthly));
      eta = ymOf(today) + months - 1;
      if (g.deadline && eta > ymOf(g.deadline)) late = true;
    }
    return { remaining, done: false, needed, eta, late, pastDue };
  },

  // ---- resumos
  flow(list) { const r = list.filter(t => isFlow(t) && t.paid); return { income: sumOf(r.filter(t => t.kind === 'income')), expense: sumOf(r.filter(t => t.kind === 'expense')) }; },
  monthFlow: (s, ym) => Finance.flow(s.txs.filter(t => ymOf(t.date) === ym)),
  /** despesas do mês por categoria, incluindo pendentes (para limites) */
  budgetUsage(s, ym) {
    const m = new Map();
    for (const t of s.txs) if (t.kind === 'expense' && isFlow(t) && ymOf(t.date) === ym) m.set(t.category, (m.get(t.category) || 0) + t.value);
    return m;
  },
  /** despesas realizadas por categoria no período, decrescente */
  categoryTotals(s, from, to) {
    const m = new Map();
    for (const t of s.txs) if (t.kind === 'expense' && t.paid && isFlow(t) && (!from || t.date >= from) && (!to || t.date <= to)) m.set(t.category, (m.get(t.category) || 0) + t.value);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  },
  lastMonths: (s, today, n = 6) => Array.from({ length: n }, (_, i) => { const ym = ymOf(today) - (n - 1 - i); return [ym, Finance.monthFlow(s, ym)]; }),

  // ---- lembretes
  reminders(s, today, days = 2) {
    const limit = addDays(today, days), out = [];
    for (const t of s.txs) {
      if (t.paid || isCard(t) || t.date > limit) continue;
      let type;
      if (t.kind === 'income') { if (t.date > today) continue; type = 'INCOME_DUE'; }
      else type = t.date < today ? 'BILL_OVERDUE' : 'BILL_DUE';
      out.push({ type, title: t.desc, amount: t.value, date: t.date, refId: t.id });
    }
    for (const c of s.cards) for (const inv of Finance.cardStatus(s, c, today).invoices)
      if (inv.open > 0 && inv.due <= limit && inv.closed) out.push({ type: 'INVOICE_DUE', title: `Fatura ${c.name}`, amount: inv.open, date: inv.due, refId: c.id });
    return out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  },
  nextDue(s, today) {
    const bills = s.txs.filter(t => !t.paid && !isCard(t) && t.kind === 'expense')
      .map(t => ({ type: t.date < today ? 'BILL_OVERDUE' : 'BILL_DUE', title: t.desc, amount: t.value, date: t.date, refId: t.id }));
    const invs = s.cards.flatMap(c => Finance.cardStatus(s, c, today).invoices.filter(i => i.open > 0).map(i => ({ type: 'INVOICE_DUE', title: `Fatura ${c.name}`, amount: i.open, date: i.due, refId: c.id })));
    let best = null;
    for (const r of [...bills, ...invs]) if (!best || r.date < best.date) best = r;
    return best;
  },
};

// ------------------------------------------------------------------ CSV
export const Csv = {
  cell(v) { let s = v == null ? '' : String(v); if (s && '=+-@\t\r'.includes(s[0])) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; },
  build(s) {
    const head = ['data', 'tipo', 'categoria', 'descricao', 'valor', 'situacao', 'conta', 'cartao'];
    const rows = [...s.txs].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).map(t => [
      Csv.cell(t.date), Csv.cell(t.kind === 'income' ? 'receita' : 'despesa'), Csv.cell(t.category), Csv.cell(t.desc),
      Csv.cell(Money.input(t.value)), Csv.cell(t.paid ? 'realizado' : 'pendente'),
      Csv.cell(isCard(t) ? '' : account(s, t.accountId)?.name ?? ''), Csv.cell(card(s, t.cardId || t.cardPayment)?.name ?? ''),
    ].join(';'));
    return '\uFEFF' + head.join(';') + '\r\n' + rows.join('\r\n');
  },
};

// ------------------------------------------------------------------ operações (validações e mensagens)
const err = (message, title = 'Revise os dados') => ({ ok: false, title, message });
const ok = state => ({ ok: true, state });
const blank = s => !s || !String(s).trim();
const clean = (s, max) => [...String(s ?? '').trim()].slice(0, max).join('');
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
const intOf = s => { const t = String(s ?? '').trim(); return /^[+-]?\d{1,9}$/.test(t) ? parseInt(t, 10) : null; };
const catsOf = (s, k) => s.cats[k];
const withCats = (s, k, list) => ({ ...s, cats: { ...s.cats, [k]: list } });

export const Ops = {
  /** d: {kind, desc, value, category, date, paid, accountId, cardId, reps, repsMode:'TOTAL'|'EACH', recurring} */
  saveTx(s, editId, d) {
    const desc = clean(d.desc, 200), value = Money.parse(d.value);
    const isC = d.kind === 'expense' && !!d.cardId;
    if (!desc) return err('Informe uma descrição.', 'Campo obrigatório');
    if (value == null || value <= 0) return err('Informe um valor maior que zero. Ex.: 59,90', 'Valor inválido');
    if (!validDate(d.date)) return err('Informe uma data válida.', 'Data inválida');
    if (isC && !card(s, d.cardId)) return err('Cadastre um cartão em Ajustes antes de lançar no cartão.', 'Sem cartão');
    const accountId = account(s, d.accountId) ? d.accountId : s.accounts[0].id;
    const category = blank(d.category) ? catsOf(s, d.kind)[0] : d.category;
    const cardId = isC ? d.cardId : '';
    const paid = isC || !!d.paid;
    if (editId != null) {
      const t = s.txs.find(x => x.id === editId);
      if (!t) return err('Lançamento não encontrado.');
      const upd = t.cardPayment ? { ...t, desc, value, category, date: d.date, accountId, paid: true }
        : { ...t, kind: d.kind, desc, value, category, date: d.date, paid, accountId, cardId };
      return ok({ ...s, txs: s.txs.map(x => x.id === editId ? upd : x) });
    }
    const n = Math.min(60, Math.max(1, d.reps || 1));
    if (n > 1 && d.recurring) return err('Escolha parcelas ou repetição mensal, não os dois.', 'Revise o lançamento');
    const base = tx({ id: newId(), kind: d.kind, value, date: d.date, desc, category, paid, accountId, cardId });
    let added;
    if (n > 1) {
      const values = d.repsMode === 'EACH' ? Array(n).fill(value) : Finance.splitInstallments(value, n);
      if (values.some(v => v <= 0)) return err('O valor é pequeno demais para tantas parcelas.', 'Valor inválido');
      const group = newId();
      added = values.map((v, i) => ({ ...base, id: newId(), value: v, date: plusMonths(d.date, i), paid: isC || (i === 0 && !!d.paid),
        desc: `${desc} (${i + 1}/${n})`, groupId: group, parcelN: i + 1, parcelTotal: n }));
    } else added = [base];
    let rec = s.recurring;
    if (d.recurring) rec = [...rec, { id: newId(), kind: d.kind, desc, value, category, accountId, cardId, day: dom(d.date), active: true, start: d.date, last: ymOf(d.date) }];
    return ok({ ...s, txs: [...s.txs, ...added], recurring: rec });
  },
  laterParcels(s, id) {
    const t = s.txs.find(x => x.id === id);
    if (!t || !t.groupId) return [];
    return s.txs.filter(x => x.groupId === t.groupId && x.id !== t.id && x.date >= t.date);
  },
  deleteTx(s, id, withLater) {
    const ids = new Set([id, ...(withLater ? Ops.laterParcels(s, id).map(x => x.id) : [])]);
    return { ...s, txs: s.txs.filter(x => !ids.has(x.id)) };
  },
  /** Compra no cartão e pagamento de fatura não alternam pago/pendente: desmarcar um pagamento de fatura reabria
   *  a fatura e deixava o pagamento pendente, descontando o mesmo valor duas vezes (igual ao app Android 1.1.1). */
  canTogglePaid: t => !isCard(t) && isFlow(t),
  togglePaid: (s, id) => ({ ...s, txs: s.txs.map(x => x.id === id && Ops.canTogglePaid(x) ? { ...x, paid: !x.paid } : x) }),

  saveGoal(s, id, name, target, move, deadline, monthly) {
    const n = clean(name, 60), t = Money.parse(target), m = blank(monthly) ? 0 : Money.parse(monthly);
    if (!n) return err('Informe o nome da meta.');
    if (t == null || t <= 0) return err('Informe um valor de meta maior que zero. Ex.: 1500,50');
    if (m == null || m < 0) return err('Contribuição mensal inválida.');
    const mv = blank(move) ? 0 : Money.parse(move);
    if (mv == null) return err('Valor a guardar inválido.');
    if (deadline && !validDate(deadline)) return err('Informe um prazo válido ou deixe em branco.');
    if (id == null) return ok({ ...s, goals: [...s.goals, { id: newId(), name: n, target: t, saved: 0, deadline: deadline || null, monthly: m }] });
    return ok({ ...s, goals: s.goals.map(g => g.id === id ? { ...g, name: n, target: t, deadline: deadline || null, monthly: m, saved: Math.max(0, g.saved + mv) } : g) });
  },
  deleteGoal: (s, id) => ({ ...s, goals: s.goals.filter(g => g.id !== id) }),

  saveAccount(s, id, name, initial) {
    const n = clean(name, 40), ini = blank(initial) ? 0 : Money.parse(initial);
    if (!n) return err('Informe o nome da conta.');
    if (ini == null) return err('Saldo inicial inválido. Ex.: 1.250,00 ou -300');
    if (id == null) return ok({ ...s, accounts: [...s.accounts, { id: newId(), name: n, initial: ini }] });
    return ok({ ...s, accounts: s.accounts.map(a => a.id === id ? { ...a, name: n, initial: ini } : a) });
  },
  deleteAccount(s, id) {
    if (s.accounts.length <= 1) return err('Mantenha pelo menos uma conta.', 'Conta necessária');
    if (s.txs.some(t => t.accountId === id && !isCard(t))) return err('Mova ou exclua os lançamentos desta conta antes.', 'Conta em uso');
    if (s.recurring.some(r => r.accountId === id && !r.cardId)) return err('Há recorrências usando esta conta. Edite ou exclua essas recorrências antes.', 'Conta em uso');
    const rest = s.accounts.filter(a => a.id !== id), first = rest[0].id;
    return ok({ ...s, accounts: rest, txs: s.txs.map(t => t.accountId === id ? { ...t, accountId: first } : t),
      recurring: s.recurring.map(r => r.accountId === id ? { ...r, accountId: first } : r) });
  },

  saveCard(s, id, name, limit, close, due) {
    const n = clean(name, 40), lim = blank(limit) ? 0 : Money.parse(limit), c = intOf(close), d = intOf(due);
    if (!n) return err('Informe o nome do cartão.');
    if (lim == null || lim < 0) return err('Limite inválido.');
    if (c == null || d == null || c < 1 || c > 31 || d < 1 || d > 31) return err('Os dias de fechamento e vencimento devem estar entre 1 e 31.');
    if (id == null) return ok({ ...s, cards: [...s.cards, { id: newId(), name: n, limit: lim, close: c, due: d }] });
    return ok({ ...s, cards: s.cards.map(x => x.id === id ? { ...x, name: n, limit: lim, close: c, due: d } : x) });
  },
  deleteCard(s, id) {
    if (s.txs.some(t => t.cardId === id || t.cardPayment === id)) return err('Este cartão tem compras ou pagamentos registrados. Exclua esses lançamentos antes de excluir o cartão.', 'Cartão em uso');
    if (s.recurring.some(r => r.cardId === id)) return err('Há recorrências usando este cartão. Edite ou exclua essas recorrências antes.', 'Cartão em uso');
    return ok({ ...s, cards: s.cards.filter(c => c.id !== id) });
  },
  payInvoice(s, cardId, value, accountId, date) {
    const c = card(s, cardId);
    if (!c) return err('Cartão não encontrado.');
    const v = Money.parse(value);
    if (v == null || v <= 0) return err('Informe um valor maior que zero.');
    if (!validDate(date)) return err('Informe uma data válida.');
    const acc = account(s, accountId) ? accountId : s.accounts[0].id;
    return ok({ ...s, txs: [...s.txs, tx({ id: newId(), kind: 'expense', value: v, date, desc: `Pagamento fatura ${c.name}`, category: CARD_PAYMENT_CAT, paid: true, accountId: acc, cardPayment: c.id })] });
  },

  saveRecurring(s, id, kind, desc, value, day, category, accountId, cardId, active, start, today) {
    const ds = clean(desc, 120), v = Money.parse(value), dd = intOf(day);
    if (!ds) return err('Informe uma descrição.');
    if (v == null || v <= 0) return err('Informe um valor maior que zero.');
    if (dd == null || dd < 1 || dd > 31) return err('O dia deve estar entre 1 e 31.');
    const acc = account(s, accountId) ? accountId : s.accounts[0].id;
    const cd = kind === 'expense' && card(s, cardId) ? cardId : '';
    const cat = blank(category) ? catsOf(s, kind)[0] : category;
    let next;
    if (id == null) {
      if (!validDate(start)) return err('Informe a data de início.');
      next = { ...s, recurring: [...s.recurring, { id: newId(), kind, desc: ds, value: v, category: cat, accountId: acc, cardId: cd, day: dd, active: true, start, last: null }] };
    } else next = { ...s, recurring: s.recurring.map(r => r.id === id ? { ...r, kind, desc: ds, value: v, day: dd, category: cat, accountId: acc, cardId: cd, active,
      last: !r.active && active ? Ops.resumedLast(r.last, today) : r.last } : r) };
    return ok(Finance.generateRecurring(next, today)[0]);
  },
  /** Ao reativar uma recorrência pausada, os meses parados não geram lançamento: retoma a partir do mês atual.
   *  (Antes, reativar em outubro uma recorrência pausada em março criava 7 lançamentos pendentes de uma vez.) */
  resumedLast: (last, today) => { const prev = ymOf(today) - 1; return last != null && last > prev ? last : prev; },
  deleteRecurring: (s, id) => ({ ...s, recurring: s.recurring.filter(r => r.id !== id) }),

  saveLimit(s, old, category, value) {
    const v = Money.parse(value);
    if (blank(category)) return err('Escolha uma categoria.');
    if (v == null || v <= 0) return err('Informe um valor maior que zero.');
    const m = new Map(s.limits);
    if (old != null && old !== category) m.delete(old);
    m.set(category, v);
    return ok({ ...s, limits: m });
  },
  deleteLimit: (s, category) => { const m = new Map(s.limits); m.delete(category); return { ...s, limits: m }; },

  addCategory(s, kind, name) {
    const n = clean(name, 40);
    if (!n) return err('Digite o nome da categoria.', 'Nome vazio');
    if (catsOf(s, kind).some(c => sameName(c, n))) return err('Essa categoria já existe.', 'Categoria duplicada');
    return ok(withCats(s, kind, [...catsOf(s, kind), n]));
  },
  renameCategory(s, kind, old, name) {
    const n = clean(name, 40);
    if (!n) return err('Informe um nome.', 'Nome vazio');
    if (n === old) return ok(s);
    if (catsOf(s, kind).some(c => c !== old && sameName(c, n))) return err('Essa categoria já existe.', 'Categoria duplicada');
    let limits = s.limits;
    if (kind === 'expense' && s.limits.has(old)) { limits = new Map(s.limits); const v = limits.get(old); limits.delete(old); limits.set(n, v); }
    return ok({ ...withCats(s, kind, catsOf(s, kind).map(c => c === old ? n : c)),
      txs: s.txs.map(t => t.kind === kind && t.category === old ? { ...t, category: n } : t),
      recurring: s.recurring.map(r => r.kind === kind && r.category === old ? { ...r, category: n } : r), limits });
  },
  checkDeleteCategory(s, kind, name) {
    if (catsOf(s, kind).length <= 1) return err(`Mantenha pelo menos uma categoria de ${kind === 'expense' ? 'despesa' : 'receita'}.`, 'Categoria necessária');
    if (s.recurring.some(r => r.kind === kind && r.category === name)) return err('Esta categoria está sendo usada por uma recorrência. Altere ou exclua a recorrência primeiro.', 'Categoria em uso');
    return ok(s);
  },
  deleteCategory(s, kind, name) {
    const limits = new Map(s.limits);
    if (kind === 'expense') limits.delete(name);
    return { ...withCats(s, kind, catsOf(s, kind).filter(c => c !== name)), limits };
  },
  categoryUseCount: (s, kind, name) => s.txs.filter(t => t.kind === kind && t.category === name).length,
};

// ------------------------------------------------------------------ backup (formato do Finan+ web / Android / Linux)
export const BACKUP_VERSION = 5;
export const BACKUP_MAX_BYTES = 30 * 1024 * 1024;
const ID_RE = /^[A-Za-z0-9_.-]{1,48}$/;
const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export class BackupError extends Error {}

const isObj = v => v != null && typeof v === 'object' && !Array.isArray(v);
const numToString = d => String(d);
function str(v, max = 120) {
  const s = typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? numToString(v) : '';
  return [...s.trim()].slice(0, max).join('');
}
const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') { const t = v.trim(); if (!NUM_RE.test(t)) return null; const n = parseFloat(t); return Number.isFinite(n) ? n : null; }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
}
/** Maior valor aceito: 13 dígitos de reais, o mesmo limite da digitação (somas maiores perdiam precisão e trocavam de sinal). */
export const MAX_ABS_CENTS = 999_999_999_999_999;
/** Dinheiro do backup: número ou texto numérico; booleano não vale (true virava R$ 1,00) e valor acima do limite vira 0. */
const cents = v => {
  if (typeof v === 'boolean') return 0;
  const n = num(v);
  return n == null || Math.abs(n) > MAX_ABS_CENTS / 100 ? 0 : Money.fromReais(n);
};
const intIn = (v, a, b, def) => { const n = num(v); if (n == null) return def; const r = Math.round(n); return r >= a && r <= b ? r : def; };
const safeId = v => { const s = typeof v === 'number' && Number.isFinite(v) ? numToString(v) : typeof v === 'string' ? v : ''; return ID_RE.test(s) ? s : ''; };
const parseDate = v => validDate(v) ? v : null;
const parseYm = v => typeof v === 'string' && YM_RE.test(v) ? ymOf(v + '-01') : null;

/** Valida e normaliza um backup (já lido com JSON.parse). Lança BackupError sem lista de lançamentos. */
export function normalize(raw) {
  if (!isObj(raw)) throw new BackupError('Formato inválido');
  if (!Array.isArray(raw.txs)) throw new BackupError('Backup sem lista de lançamentos');
  const d = { txs: 0, goals: 0, accounts: 0, cards: 0, recurring: 0 };
  const used = new Set();
  const idFor = v => { let id = safeId(v); if (!id || used.has(id)) id = newId(); used.add(id); return id; };

  const cats = { expense: [...DEFAULT_EXPENSE], income: [...DEFAULT_INCOME] };
  if (isObj(raw.cats)) for (const k of ['income', 'expense']) {
    const list = raw.cats[k];
    if (!Array.isArray(list)) continue;
    const seen = new Set(), out = [];
    for (const x of list) { const n = str(x, 40); if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push(n); } }
    if (out.length) cats[k] = out;
  }

  const accounts = [];
  if (Array.isArray(raw.accounts)) for (const x of raw.accounts) {
    if (!isObj(x) || !str(x.name, 40)) { d.accounts++; continue; }
    accounts.push({ id: idFor(x.id), name: str(x.name, 40), initial: cents(x.initial) });
  }
  if (!accounts.length) { used.add(MAIN_ACCOUNT); accounts.push({ id: MAIN_ACCOUNT, name: 'Conta principal', initial: 0 }); }
  const accIds = new Set(accounts.map(a => a.id)), firstAcc = accounts[0].id;
  const accOf = v => { const s = str(v, 48); return accIds.has(s) ? s : firstAcc; };

  const cards = [];
  if (Array.isArray(raw.cards)) for (const x of raw.cards) {
    if (!isObj(x) || !str(x.name, 40)) { d.cards++; continue; }
    cards.push({ id: idFor(x.id), name: str(x.name, 40), limit: Math.max(0, cents(x.limit)), close: intIn(x.close, 1, 31, 5), due: intIn(x.due, 1, 31, 12) });
  }
  const cardIds = new Set(cards.map(c => c.id));
  const cardOf = v => { const s = str(v, 48); return cardIds.has(s) ? s : ''; };
  const kindOf = v => v === 'income' || v === 'expense' ? v : null;

  const recurring = [];
  if (Array.isArray(raw.recurring)) for (const o of raw.recurring) {
    const kind = isObj(o) ? kindOf(o.kind) : null, value = isObj(o) ? cents(o.value) : 0;
    if (!isObj(o) || !kind || value <= 0 || !str(o.desc)) { d.recurring++; continue; }
    recurring.push({ id: idFor(o.id), kind, desc: str(o.desc), value, category: str(o.category, 40) || cats[kind][0],
      accountId: accOf(o.accountId), cardId: kind === 'expense' ? cardOf(o.cardId) : '', day: intIn(o.day, 1, 31, 1),
      active: o.active !== false, start: parseDate(o.start), last: parseYm(o.last) });
  }

  const txs = [];
  for (const o of raw.txs) {
    const kind = isObj(o) ? kindOf(o.kind) : null, value = isObj(o) ? cents(o.value) : 0, date = isObj(o) ? parseDate(o.date) : null;
    if (!isObj(o) || !kind || value <= 0 || !date) { d.txs++; continue; }
    const cardId = kind === 'expense' ? cardOf(o.cardId) : '';
    const cardPayment = kind === 'expense' && !cardId ? cardOf(o.cardPayment) : '';
    const p = isObj(o.parcel) ? o.parcel : null;
    const pTotal = p ? intIn(p.total, 1, 120, 0) : 0, pN = p ? intIn(p.n, 1, 120, 0) : 0;
    const okP = pTotal > 0 && pN >= 1 && pN <= pTotal;
    txs.push(tx({ id: idFor(o.id), kind, value, date, desc: str(o.desc, 200) || 'Sem descrição',
      category: str(o.category, 40) || (cardPayment ? CARD_PAYMENT_CAT : 'Outros'),
      paid: cardId ? true : o.paid !== false, accountId: accOf(o.accountId), cardId, cardPayment,
      recurringId: safeId(o.recurringId), groupId: safeId(o.groupId), parcelN: okP ? pN : 0, parcelTotal: okP ? pTotal : 0 }));
  }

  const goals = [];
  if (Array.isArray(raw.goals)) for (const g of raw.goals) {
    const target = isObj(g) ? cents(g.target) : 0;
    if (!isObj(g) || !str(g.name, 60) || target <= 0) { d.goals++; continue; }
    goals.push({ id: idFor(g.id), name: str(g.name, 60), target, saved: Math.max(0, cents(g.saved)), deadline: parseDate(g.deadline), monthly: Math.max(0, cents(g.monthly)) });
  }

  const limits = new Map();
  if (isObj(raw.limits)) for (const [k, v] of Object.entries(raw.limits)) { const c = [...k.trim()].slice(0, 40).join(''), n = cents(v); if (c && n > 0) limits.set(c, n); }

  const al = num(raw.autoLock), autoLock = al != null && AUTOLOCK_OPTIONS.includes(Math.round(al)) ? Math.round(al) : 0;
  const state = { txs, goals, accounts, cards, recurring, cats, limits, privacy: raw.privacy === true, autoLock, theme: themeOf(raw.theme) };
  return { state, dropped: d, droppedTotal: d.txs + d.goals + d.accounts + d.cards + d.recurring };
}

/** Lê o texto de um backup. Recusa arquivos grandes demais e aninhamento excessivo. */
export function parseBackup(text) {
  if (typeof text !== 'string') throw new BackupError('Arquivo vazio');
  if (text.length > BACKUP_MAX_BYTES) throw new BackupError('Arquivo grande demais');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  let depth = 0, inStr = false, escp = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (escp) escp = false; else if (c === '\\') escp = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') { if (++depth > 64) throw new BackupError('JSON inválido: aninhamento excessivo'); }
    else if (c === '}' || c === ']') depth--;
  }
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new BackupError('JSON inválido: ' + e.message); }
  return normalize(raw);
}

/** Serializa no formato do Finan+ (valores em reais com 2 casas). [meta] = bloco _backup dos arquivos exportados. */
export function toJson(s, meta) {
  const R = c => `\u0000R${Money.reaisJson(c)}\u0000`;
  const o = {
    txs: s.txs.map(t => {
      const x = { id: t.id, kind: t.kind, value: R(t.value), date: t.date, desc: t.desc, category: t.category, paid: t.paid, accountId: t.accountId, cardId: t.cardId };
      if (t.cardPayment) x.cardPayment = t.cardPayment;
      if (t.recurringId) x.recurringId = t.recurringId;
      if (t.groupId) x.groupId = t.groupId;
      if (t.parcelTotal > 0) x.parcel = { n: t.parcelN, total: t.parcelTotal };
      return x;
    }),
    goals: s.goals.map(g => ({ id: g.id, name: g.name, target: R(g.target), saved: R(g.saved), deadline: g.deadline || '', monthly: R(g.monthly) })),
    accounts: s.accounts.map(a => ({ id: a.id, name: a.name, initial: R(a.initial) })),
    cards: s.cards.map(c => ({ id: c.id, name: c.name, limit: R(c.limit), close: c.close, due: c.due })),
    recurring: s.recurring.map(r => ({ id: r.id, kind: r.kind, desc: r.desc, value: R(r.value), category: r.category, accountId: r.accountId,
      cardId: r.cardId, day: r.day, active: r.active, start: r.start || '', last: r.last != null ? ymStr(r.last) : '' })),
    cats: { expense: s.cats.expense, income: s.cats.income },
    limits: Object.fromEntries([...s.limits].map(([k, v]) => [k, R(v)])),
    privacy: s.privacy, autoLock: s.autoLock, theme: s.theme, backupVersion: BACKUP_VERSION,
  };
  if (meta) o._backup = meta;
  return JSON.stringify(o).replace(/"\\u0000R(-?\d+\.\d{2})\\u0000"/g, '$1');
}
