// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// GERADO por tools/build.mjs (npm run build) a partir dos módulos em js/. O código-fonte legível está em js/*.js.
// Ícones: Material Symbols, © Google LLC, Licença Apache 2.0.
(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // js/core.js
  var core_exports = {};
  __export(core_exports, {
    AUTOLOCK_OPTIONS: () => AUTOLOCK_OPTIONS,
    BACKUP_MAX_BYTES: () => BACKUP_MAX_BYTES,
    BACKUP_VERSION: () => BACKUP_VERSION,
    BackupError: () => BackupError,
    CARD_PAYMENT_CAT: () => CARD_PAYMENT_CAT,
    Csv: () => Csv,
    DEFAULT_EXPENSE: () => DEFAULT_EXPENSE,
    DEFAULT_INCOME: () => DEFAULT_INCOME,
    Finance: () => Finance,
    MAIN_ACCOUNT: () => MAIN_ACCOUNT,
    MAX_ABS_CENTS: () => MAX_ABS_CENTS,
    MONTHS: () => MONTHS,
    MONTHS_SHORT: () => MONTHS_SHORT,
    Money: () => Money,
    Ops: () => Ops,
    THEMES: () => THEMES,
    account: () => account,
    addDays: () => addDays,
    brDate: () => brDate,
    brDayMonth: () => brDayMonth,
    brMonth: () => brMonth,
    brMonthLabel: () => brMonthLabel,
    brMonthYear: () => brMonthYear,
    card: () => card,
    clone: () => clone,
    dayNum: () => dayNum,
    dom: () => dom,
    fromDayNum: () => fromDayNum,
    fullDate: () => fullDate,
    isCard: () => isCard,
    isFlow: () => isFlow,
    newId: () => newId,
    newState: () => newState,
    normalize: () => normalize,
    pad2: () => pad2,
    parseBackup: () => parseBackup,
    plusMonths: () => plusMonths,
    themeLabel: () => themeLabel,
    themeOf: () => themeOf,
    toJson: () => toJson,
    todayStr: () => todayStr,
    tx: () => tx,
    validDate: () => validDate,
    weekday: () => weekday,
    ymDay: () => ymDay,
    ymFirst: () => ymFirst,
    ymLast: () => ymLast,
    ymLen: () => ymLen,
    ymMonth: () => ymMonth,
    ymOf: () => ymOf,
    ymStr: () => ymStr,
    ymYear: () => ymYear
  });
  var pad2 = (n) => String(n).padStart(2, "0");
  var dayNum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
  var fromDayNum = (n) => {
    const d = new Date(n * 864e5);
    return `${String(d.getUTCFullYear()).padStart(4, "0")}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  };
  var addDays = (s, n) => fromDayNum(dayNum(s) + n);
  var ymOf = (s) => +s.slice(0, 4) * 12 + +s.slice(5, 7) - 1;
  var ymYear = (ym) => Math.floor(ym / 12);
  var ymMonth = (ym) => ym - ymYear(ym) * 12 + 1;
  var ymStr = (ym) => `${String(ymYear(ym)).padStart(4, "0")}-${pad2(ymMonth(ym))}`;
  var ymLen = (ym) => new Date(Date.UTC(ymYear(ym), ymMonth(ym), 0)).getUTCDate();
  var ymFirst = (ym) => `${ymStr(ym)}-01`;
  var ymLast = (ym) => `${ymStr(ym)}-${pad2(ymLen(ym))}`;
  var ymDay = (ym, day) => `${ymStr(ym)}-${pad2(Math.min(Math.max(day, 1), ymLen(ym)))}`;
  var dom = (s) => +s.slice(8, 10);
  var plusMonths = (s, n) => ymDay(ymOf(s) + n, dom(s));
  var weekday = (s) => {
    const w = new Date(dayNum(s) * 864e5).getUTCDay();
    return w === 0 ? 7 : w;
  };
  var todayStr = (d = /* @__PURE__ */ new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function validDate(s) {
    if (typeof s !== "string" || !DATE_RE.test(s)) return false;
    const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= ymLen(y * 12 + m - 1);
  }
  var MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
  var brMonth = (ym) => MONTHS[ymMonth(ym) - 1];
  var brMonthYear = (ym) => `${brMonth(ym)} de ${ymYear(ym)}`;
  var brMonthLabel = (ym) => `${MONTHS_SHORT[ymMonth(ym) - 1]} de ${ymYear(ym)}`;
  var brDate = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  var brDayMonth = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
  var fullDate = (s) => {
    const n = MONTHS[+s.slice(5, 7) - 1];
    return `${s.slice(8, 10)} de ${n[0].toUpperCase()}${n.slice(1)} de ${+s.slice(0, 4)}`;
  };
  var Money = {
    /** "R$ 1.234,56" / "-R$ 0,50" — formatação própria, não depende do idioma do navegador */
    format(c) {
      const neg = c < 0, a = Math.abs(c);
      const reais = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return (neg ? "-" : "") + "R$ " + reais + "," + pad2(a % 100);
    },
    /** valor para campo de edição: "1500,50" */
    input(c) {
      const a = Math.abs(c);
      return (c < 0 ? "-" : "") + Math.floor(a / 100) + "," + pad2(a % 100);
    },
    /** reais (número do JSON) → centavos */
    fromReais: (d) => Math.round(d * 100),
    /** centavos → "12.50" para o JSON */
    reaisJson(c) {
      const a = Math.abs(c);
      return (c < 0 ? "-" : "") + Math.floor(a / 100) + "." + pad2(a % 100);
    },
    /** Aceita "1.500,50", "1500,50", "1500.50", "1,500.25", "R$ 2.000", "-50". Devolve centavos ou null. */
    parse(input2) {
      let s = String(input2 ?? "").replace(/R\$/g, "").replace(/\s/g, "");
      if (!s) return null;
      const neg = s.startsWith("-");
      if (neg || s.startsWith("+")) s = s.slice(1);
      if (!s || !/^[\d.,]+$/.test(s)) return null;
      const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
      const count = (str2, ch) => str2.split(ch).length - 1;
      if (lc >= 0 && ld >= 0) {
        const dec2 = lc > ld ? "," : ".", thou = dec2 === "," ? "." : ",";
        s = s.split(thou).join("");
        if (count(s, dec2) > 1) return null;
        s = s.replace(dec2, ".");
      } else if (lc >= 0) {
        if (count(s, ",") > 1) return null;
        s = s.replace(",", ".");
      } else if (ld >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.split(".").join("");
      }
      if (count(s, ".") > 1) return null;
      const parts = s.split(".");
      const intPart = parts[0] || "0";
      if (intPart.length > 13) return null;
      const frac = parts.length > 1 ? parts[1] : "";
      if (parts.length > 1 && !frac && !parts[0]) return null;
      const whole = parseInt(intPart, 10);
      if (Number.isNaN(whole)) return null;
      const f3 = parseInt((frac + "000").slice(0, 3), 10);
      const cents2 = whole * 100 + Math.floor((f3 + 5) / 10);
      return neg ? -cents2 : cents2;
    }
  };
  var MAIN_ACCOUNT = "main";
  var CARD_PAYMENT_CAT = "Pagamento de fatura";
  var DEFAULT_EXPENSE = ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros"];
  var DEFAULT_INCOME = ["Salário", "Extra", "Investimentos", "Outros"];
  var AUTOLOCK_OPTIONS = [0, 1, 5, 15, 30];
  var THEMES = [
    ["auto", "Sistema"],
    ["light", "Claro"],
    ["materialBlue", "Material You"],
    ["oledGray", "OLED Cinza"],
    ["tokyo", "Tokyo Night"],
    ["nord", "Nord"]
  ];
  var themeOf = (s) => s === "dark" ? "oledGray" : THEMES.some((t) => t[0] === s) ? s : "auto";
  var themeLabel = (id) => (THEMES.find((t) => t[0] === id) || THEMES[0])[1];
  var seq = 0;
  function newId() {
    const r = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] % (1 << 20) : Math.floor(Math.random() * (1 << 20));
    return Date.now().toString(36) + (seq++).toString(36) + r.toString(36);
  }
  function tx(o) {
    return {
      id: o.id,
      kind: o.kind,
      value: o.value,
      date: o.date,
      desc: o.desc,
      category: o.category,
      paid: !!o.paid,
      accountId: o.accountId ?? MAIN_ACCOUNT,
      cardId: o.cardId ?? "",
      cardPayment: o.cardPayment ?? "",
      recurringId: o.recurringId ?? "",
      groupId: o.groupId ?? "",
      parcelN: o.parcelN ?? 0,
      parcelTotal: o.parcelTotal ?? 0
    };
  }
  var isFlow = (t) => !t.cardPayment;
  var isCard = (t) => !!t.cardId;
  function newState(over2 = {}) {
    return {
      txs: [],
      goals: [],
      accounts: [{ id: MAIN_ACCOUNT, name: "Conta principal", initial: 0 }],
      cards: [],
      recurring: [],
      cats: { expense: [...DEFAULT_EXPENSE], income: [...DEFAULT_INCOME] },
      limits: /* @__PURE__ */ new Map(),
      privacy: false,
      autoLock: 0,
      theme: "auto",
      ...over2
    };
  }
  var clone = (s) => ({
    ...s,
    txs: s.txs.map((t) => ({ ...t })),
    goals: s.goals.map((g) => ({ ...g })),
    accounts: s.accounts.map((a) => ({ ...a })),
    cards: s.cards.map((c) => ({ ...c })),
    recurring: s.recurring.map((r) => ({ ...r })),
    cats: { expense: [...s.cats.expense], income: [...s.cats.income] },
    limits: new Map(s.limits)
  });
  var account = (s, id) => s.accounts.find((a) => a.id === id);
  var card = (s, id) => s.cards.find((c) => c.id === id);
  var sumOf = (l) => l.reduce((n, t) => n + t.value, 0);
  var Finance = {
    /** mês da fatura de uma compra: após o fechamento vai para a seguinte */
    invoiceYm(c, date) {
      const ym = ymOf(date);
      return dom(date) > Math.min(c.close, ymLen(ym)) ? ym + 1 : ym;
    },
    /** vencimento: mesmo mês se vence depois do fechamento, senão no mês seguinte */
    invoiceDue: (c, ym) => ymDay(c.due > c.close ? ym : ym + 1, c.due),
    invoiceClose: (c, ym) => ymDay(ym, c.close),
    /** Limite usado inclui parcelas futuras; pagamentos abatem da fatura mais antiga. */
    cardStatus(s, c, today2) {
      const purchases = s.txs.filter((t) => t.cardId === c.id && t.kind === "expense");
      const paid = sumOf(s.txs.filter((t) => t.cardPayment === c.id && t.paid));
      const by = /* @__PURE__ */ new Map();
      for (const p of purchases) {
        const k = Finance.invoiceYm(c, p.date);
        by.set(k, (by.get(k) || 0) + p.value);
      }
      let left = paid;
      const invoices = [...by.keys()].sort((a, b) => a - b).map((ym) => {
        const total = by.get(ym), pay = Math.min(left, total);
        left -= pay;
        const close = Finance.invoiceClose(c, ym);
        return { ym, total, paid: pay, open: total - pay, close, due: Finance.invoiceDue(c, ym), closed: today2 > close };
      });
      const spent = sumOf(purchases), used = Math.max(0, spent - paid);
      const current = invoices.find((i) => i.open > 0 && i.closed) || invoices.find((i) => i.open > 0 && !i.closed) || null;
      return { used, available: Math.max(0, c.limit - used), credit: Math.max(0, paid - spent), invoices, current };
    },
    // ---- saldos
    accountBalance: (s, a) => a.initial + s.txs.filter((t) => t.accountId === a.id && !isCard(t) && t.paid).reduce((n, t) => t.kind === "income" ? n + t.value : n - t.value, 0),
    currentBalance: (s) => s.accounts.reduce((n, a) => n + Finance.accountBalance(s, a), 0),
    /** saldo previsto em [until]: pendências das contas + faturas em aberto que vencem até lá */
    futureBalance(s, until, today2) {
      let c = Finance.currentBalance(s);
      for (const t of s.txs) {
        if (isCard(t) || t.paid || t.date > until) continue;
        c += t.kind === "income" ? t.value : -t.value;
      }
      for (const cd of s.cards) for (const inv of Finance.cardStatus(s, cd, today2).invoices) if (inv.open > 0 && inv.due <= until) c -= inv.open;
      return c;
    },
    // ---- recorrências
    /** Gera os lançamentos até o mês de [today], recuperando até 24 meses. Nunca antes do início. Devolve [estado, n]. */
    generateRecurring(s, today2) {
      const cur = ymOf(today2), add = [];
      let changed = false;
      const recs = s.recurring.map((r) => {
        if (!r.active) return r;
        const startYm = r.start ? ymOf(r.start) : r.last != null ? r.last + 1 : cur;
        let m = r.last != null && r.last + 1 > startYm ? r.last + 1 : startYm;
        let last = r.last, guard2 = 0;
        while (m <= cur && guard2 < 24) {
          const date = ymDay(m, r.day);
          last = m;
          if (!r.start || date >= r.start)
            add.push(tx({ id: newId(), kind: r.kind, value: r.value, date, desc: r.desc, category: r.category, paid: !!r.cardId, accountId: r.accountId, cardId: r.cardId, recurringId: r.id }));
          m++;
          guard2++;
        }
        if (last === r.last) return r;
        changed = true;
        return { ...r, last };
      });
      if (!add.length && !changed) return [s, 0];
      return [{ ...s, txs: [...s.txs, ...add], recurring: recs }, add.length];
    },
    /** divide [total] em [n] parcelas; a diferença de centavos fica na primeira */
    splitInstallments(total, n) {
      const base = Math.trunc(total / n), rest = total - base * n;
      return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
    },
    // ---- metas
    goalPlan(g, today2) {
      const remaining = Math.max(0, g.target - g.saved);
      if (remaining === 0) return { remaining: 0, done: true, needed: null, eta: null, late: false, pastDue: false };
      let needed = null, pastDue = false;
      if (g.deadline) {
        if (g.deadline < today2) pastDue = true;
        else {
          const months = ymOf(g.deadline) - ymOf(today2) + 1;
          needed = Math.floor((remaining + months - 1) / months);
        }
      }
      let eta = null, late = false;
      if (g.monthly > 0) {
        const months = Math.min(1200, Math.floor((remaining + g.monthly - 1) / g.monthly));
        eta = ymOf(today2) + months - 1;
        if (g.deadline && eta > ymOf(g.deadline)) late = true;
      }
      return { remaining, done: false, needed, eta, late, pastDue };
    },
    // ---- resumos
    flow(list) {
      const r = list.filter((t) => isFlow(t) && t.paid);
      return { income: sumOf(r.filter((t) => t.kind === "income")), expense: sumOf(r.filter((t) => t.kind === "expense")) };
    },
    monthFlow: (s, ym) => Finance.flow(s.txs.filter((t) => ymOf(t.date) === ym)),
    /** despesas do mês por categoria, incluindo pendentes (para limites) */
    budgetUsage(s, ym) {
      const m = /* @__PURE__ */ new Map();
      for (const t of s.txs) if (t.kind === "expense" && isFlow(t) && ymOf(t.date) === ym) m.set(t.category, (m.get(t.category) || 0) + t.value);
      return m;
    },
    /** despesas realizadas por categoria no período, decrescente */
    categoryTotals(s, from, to) {
      const m = /* @__PURE__ */ new Map();
      for (const t of s.txs) if (t.kind === "expense" && t.paid && isFlow(t) && (!from || t.date >= from) && (!to || t.date <= to)) m.set(t.category, (m.get(t.category) || 0) + t.value);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    },
    lastMonths: (s, today2, n = 6) => Array.from({ length: n }, (_, i) => {
      const ym = ymOf(today2) - (n - 1 - i);
      return [ym, Finance.monthFlow(s, ym)];
    }),
    // ---- lembretes
    reminders(s, today2, days = 2) {
      const limit = addDays(today2, days), out = [];
      for (const t of s.txs) {
        if (t.paid || isCard(t) || t.date > limit) continue;
        let type;
        if (t.kind === "income") {
          if (t.date > today2) continue;
          type = "INCOME_DUE";
        } else type = t.date < today2 ? "BILL_OVERDUE" : "BILL_DUE";
        out.push({ type, title: t.desc, amount: t.value, date: t.date, refId: t.id });
      }
      for (const c of s.cards) for (const inv of Finance.cardStatus(s, c, today2).invoices)
        if (inv.open > 0 && inv.due <= limit && inv.closed) out.push({ type: "INVOICE_DUE", title: `Fatura ${c.name}`, amount: inv.open, date: inv.due, refId: c.id });
      return out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    },
    nextDue(s, today2) {
      const bills = s.txs.filter((t) => !t.paid && !isCard(t) && t.kind === "expense").map((t) => ({ type: t.date < today2 ? "BILL_OVERDUE" : "BILL_DUE", title: t.desc, amount: t.value, date: t.date, refId: t.id }));
      const invs = s.cards.flatMap((c) => Finance.cardStatus(s, c, today2).invoices.filter((i) => i.open > 0).map((i) => ({ type: "INVOICE_DUE", title: `Fatura ${c.name}`, amount: i.open, date: i.due, refId: c.id })));
      let best = null;
      for (const r of [...bills, ...invs]) if (!best || r.date < best.date) best = r;
      return best;
    }
  };
  var Csv = {
    cell(v) {
      let s = v == null ? "" : String(v);
      if (s && "=+-@	\r".includes(s[0])) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    },
    build(s) {
      const head = ["data", "tipo", "categoria", "descricao", "valor", "situacao", "conta", "cartao"];
      const rows = [...s.txs].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).map((t) => [
        Csv.cell(t.date),
        Csv.cell(t.kind === "income" ? "receita" : "despesa"),
        Csv.cell(t.category),
        Csv.cell(t.desc),
        Csv.cell(Money.input(t.value)),
        Csv.cell(t.paid ? "realizado" : "pendente"),
        Csv.cell(isCard(t) ? "" : account(s, t.accountId)?.name ?? ""),
        Csv.cell(card(s, t.cardId || t.cardPayment)?.name ?? "")
      ].join(";"));
      return "\uFEFF" + head.join(";") + "\r\n" + rows.join("\r\n");
    }
  };
  var err = (message, title = "Revise os dados") => ({ ok: false, title, message });
  var ok = (state) => ({ ok: true, state });
  var blank = (s) => !s || !String(s).trim();
  var clean = (s, max) => [...String(s ?? "").trim()].slice(0, max).join("");
  var sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
  var intOf = (s) => {
    const t = String(s ?? "").trim();
    return /^[+-]?\d{1,9}$/.test(t) ? parseInt(t, 10) : null;
  };
  var catsOf = (s, k) => s.cats[k];
  var withCats = (s, k, list) => ({ ...s, cats: { ...s.cats, [k]: list } });
  var Ops = {
    /** d: {kind, desc, value, category, date, paid, accountId, cardId, reps, repsMode:'TOTAL'|'EACH', recurring} */
    saveTx(s, editId, d) {
      const desc = clean(d.desc, 200), value = Money.parse(d.value);
      const isC = d.kind === "expense" && !!d.cardId;
      if (!desc) return err("Informe uma descrição.", "Campo obrigatório");
      if (value == null || value <= 0) return err("Informe um valor maior que zero. Ex.: 59,90", "Valor inválido");
      if (!validDate(d.date)) return err("Informe uma data válida.", "Data inválida");
      if (isC && !card(s, d.cardId)) return err("Cadastre um cartão em Ajustes antes de lançar no cartão.", "Sem cartão");
      const accountId = account(s, d.accountId) ? d.accountId : s.accounts[0].id;
      const category = blank(d.category) ? catsOf(s, d.kind)[0] : d.category;
      const cardId = isC ? d.cardId : "";
      const paid = isC || !!d.paid;
      if (editId != null) {
        const t = s.txs.find((x) => x.id === editId);
        if (!t) return err("Lançamento não encontrado.");
        const upd = t.cardPayment ? { ...t, desc, value, category, date: d.date, accountId, paid: true } : { ...t, kind: d.kind, desc, value, category, date: d.date, paid, accountId, cardId };
        return ok({ ...s, txs: s.txs.map((x) => x.id === editId ? upd : x) });
      }
      const n = Math.min(60, Math.max(1, d.reps || 1));
      if (n > 1 && d.recurring) return err("Escolha parcelas ou repetição mensal, não os dois.", "Revise o lançamento");
      const base = tx({ id: newId(), kind: d.kind, value, date: d.date, desc, category, paid, accountId, cardId });
      let added;
      if (n > 1) {
        const values = d.repsMode === "EACH" ? Array(n).fill(value) : Finance.splitInstallments(value, n);
        if (values.some((v) => v <= 0)) return err("O valor é pequeno demais para tantas parcelas.", "Valor inválido");
        const group = newId();
        added = values.map((v, i) => ({
          ...base,
          id: newId(),
          value: v,
          date: plusMonths(d.date, i),
          paid: isC || i === 0 && !!d.paid,
          desc: `${desc} (${i + 1}/${n})`,
          groupId: group,
          parcelN: i + 1,
          parcelTotal: n
        }));
      } else added = [base];
      let rec = s.recurring;
      if (d.recurring) rec = [...rec, { id: newId(), kind: d.kind, desc, value, category, accountId, cardId, day: dom(d.date), active: true, start: d.date, last: ymOf(d.date) }];
      return ok({ ...s, txs: [...s.txs, ...added], recurring: rec });
    },
    laterParcels(s, id) {
      const t = s.txs.find((x) => x.id === id);
      if (!t || !t.groupId) return [];
      return s.txs.filter((x) => x.groupId === t.groupId && x.id !== t.id && x.date >= t.date);
    },
    deleteTx(s, id, withLater) {
      const ids = /* @__PURE__ */ new Set([id, ...withLater ? Ops.laterParcels(s, id).map((x) => x.id) : []]);
      return { ...s, txs: s.txs.filter((x) => !ids.has(x.id)) };
    },
    /** Compra no cartão e pagamento de fatura não alternam pago/pendente: desmarcar um pagamento de fatura reabria
     *  a fatura e deixava o pagamento pendente, descontando o mesmo valor duas vezes (igual ao app Android 1.1.1). */
    canTogglePaid: (t) => !isCard(t) && isFlow(t),
    togglePaid: (s, id) => ({ ...s, txs: s.txs.map((x) => x.id === id && Ops.canTogglePaid(x) ? { ...x, paid: !x.paid } : x) }),
    saveGoal(s, id, name, target, move, deadline, monthly) {
      const n = clean(name, 60), t = Money.parse(target), m = blank(monthly) ? 0 : Money.parse(monthly);
      if (!n) return err("Informe o nome da meta.");
      if (t == null || t <= 0) return err("Informe um valor de meta maior que zero. Ex.: 1500,50");
      if (m == null || m < 0) return err("Contribuição mensal inválida.");
      const mv = blank(move) ? 0 : Money.parse(move);
      if (mv == null) return err("Valor a guardar inválido.");
      if (deadline && !validDate(deadline)) return err("Informe um prazo válido ou deixe em branco.");
      if (id == null) return ok({ ...s, goals: [...s.goals, { id: newId(), name: n, target: t, saved: 0, deadline: deadline || null, monthly: m }] });
      return ok({ ...s, goals: s.goals.map((g) => g.id === id ? { ...g, name: n, target: t, deadline: deadline || null, monthly: m, saved: Math.max(0, g.saved + mv) } : g) });
    },
    deleteGoal: (s, id) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }),
    saveAccount(s, id, name, initial) {
      const n = clean(name, 40), ini = blank(initial) ? 0 : Money.parse(initial);
      if (!n) return err("Informe o nome da conta.");
      if (ini == null) return err("Saldo inicial inválido. Ex.: 1.250,00 ou -300");
      if (id == null) return ok({ ...s, accounts: [...s.accounts, { id: newId(), name: n, initial: ini }] });
      return ok({ ...s, accounts: s.accounts.map((a) => a.id === id ? { ...a, name: n, initial: ini } : a) });
    },
    deleteAccount(s, id) {
      if (s.accounts.length <= 1) return err("Mantenha pelo menos uma conta.", "Conta necessária");
      if (s.txs.some((t) => t.accountId === id && !isCard(t))) return err("Mova ou exclua os lançamentos desta conta antes.", "Conta em uso");
      if (s.recurring.some((r) => r.accountId === id && !r.cardId)) return err("Há recorrências usando esta conta. Edite ou exclua essas recorrências antes.", "Conta em uso");
      const rest = s.accounts.filter((a) => a.id !== id), first = rest[0].id;
      return ok({
        ...s,
        accounts: rest,
        txs: s.txs.map((t) => t.accountId === id ? { ...t, accountId: first } : t),
        recurring: s.recurring.map((r) => r.accountId === id ? { ...r, accountId: first } : r)
      });
    },
    saveCard(s, id, name, limit, close, due) {
      const n = clean(name, 40), lim = blank(limit) ? 0 : Money.parse(limit), c = intOf(close), d = intOf(due);
      if (!n) return err("Informe o nome do cartão.");
      if (lim == null || lim < 0) return err("Limite inválido.");
      if (c == null || d == null || c < 1 || c > 31 || d < 1 || d > 31) return err("Os dias de fechamento e vencimento devem estar entre 1 e 31.");
      if (id == null) return ok({ ...s, cards: [...s.cards, { id: newId(), name: n, limit: lim, close: c, due: d }] });
      return ok({ ...s, cards: s.cards.map((x) => x.id === id ? { ...x, name: n, limit: lim, close: c, due: d } : x) });
    },
    deleteCard(s, id) {
      if (s.txs.some((t) => t.cardId === id || t.cardPayment === id)) return err("Este cartão tem compras ou pagamentos registrados. Exclua esses lançamentos antes de excluir o cartão.", "Cartão em uso");
      if (s.recurring.some((r) => r.cardId === id)) return err("Há recorrências usando este cartão. Edite ou exclua essas recorrências antes.", "Cartão em uso");
      return ok({ ...s, cards: s.cards.filter((c) => c.id !== id) });
    },
    payInvoice(s, cardId, value, accountId, date) {
      const c = card(s, cardId);
      if (!c) return err("Cartão não encontrado.");
      const v = Money.parse(value);
      if (v == null || v <= 0) return err("Informe um valor maior que zero.");
      if (!validDate(date)) return err("Informe uma data válida.");
      const acc = account(s, accountId) ? accountId : s.accounts[0].id;
      return ok({ ...s, txs: [...s.txs, tx({ id: newId(), kind: "expense", value: v, date, desc: `Pagamento fatura ${c.name}`, category: CARD_PAYMENT_CAT, paid: true, accountId: acc, cardPayment: c.id })] });
    },
    saveRecurring(s, id, kind, desc, value, day, category, accountId, cardId, active, start, today2) {
      const ds = clean(desc, 120), v = Money.parse(value), dd = intOf(day);
      if (!ds) return err("Informe uma descrição.");
      if (v == null || v <= 0) return err("Informe um valor maior que zero.");
      if (dd == null || dd < 1 || dd > 31) return err("O dia deve estar entre 1 e 31.");
      const acc = account(s, accountId) ? accountId : s.accounts[0].id;
      const cd = kind === "expense" && card(s, cardId) ? cardId : "";
      const cat = blank(category) ? catsOf(s, kind)[0] : category;
      let next;
      if (id == null) {
        if (!validDate(start)) return err("Informe a data de início.");
        next = { ...s, recurring: [...s.recurring, { id: newId(), kind, desc: ds, value: v, category: cat, accountId: acc, cardId: cd, day: dd, active: true, start, last: null }] };
      } else next = { ...s, recurring: s.recurring.map((r) => r.id === id ? {
        ...r,
        kind,
        desc: ds,
        value: v,
        day: dd,
        category: cat,
        accountId: acc,
        cardId: cd,
        active,
        last: !r.active && active ? Ops.resumedLast(r.last, today2) : r.last
      } : r) };
      return ok(Finance.generateRecurring(next, today2)[0]);
    },
    /** Ao reativar uma recorrência pausada, os meses parados não geram lançamento: retoma a partir do mês atual.
     *  (Antes, reativar em outubro uma recorrência pausada em março criava 7 lançamentos pendentes de uma vez.) */
    resumedLast: (last, today2) => {
      const prev = ymOf(today2) - 1;
      return last != null && last > prev ? last : prev;
    },
    deleteRecurring: (s, id) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) }),
    saveLimit(s, old, category, value) {
      const v = Money.parse(value);
      if (blank(category)) return err("Escolha uma categoria.");
      if (v == null || v <= 0) return err("Informe um valor maior que zero.");
      const m = new Map(s.limits);
      if (old != null && old !== category) m.delete(old);
      m.set(category, v);
      return ok({ ...s, limits: m });
    },
    deleteLimit: (s, category) => {
      const m = new Map(s.limits);
      m.delete(category);
      return { ...s, limits: m };
    },
    addCategory(s, kind, name) {
      const n = clean(name, 40);
      if (!n) return err("Digite o nome da categoria.", "Nome vazio");
      if (catsOf(s, kind).some((c) => sameName(c, n))) return err("Essa categoria já existe.", "Categoria duplicada");
      return ok(withCats(s, kind, [...catsOf(s, kind), n]));
    },
    renameCategory(s, kind, old, name) {
      const n = clean(name, 40);
      if (!n) return err("Informe um nome.", "Nome vazio");
      if (n === old) return ok(s);
      if (catsOf(s, kind).some((c) => c !== old && sameName(c, n))) return err("Essa categoria já existe.", "Categoria duplicada");
      let limits = s.limits;
      if (kind === "expense" && s.limits.has(old)) {
        limits = new Map(s.limits);
        const v = limits.get(old);
        limits.delete(old);
        limits.set(n, v);
      }
      return ok({
        ...withCats(s, kind, catsOf(s, kind).map((c) => c === old ? n : c)),
        txs: s.txs.map((t) => t.kind === kind && t.category === old ? { ...t, category: n } : t),
        recurring: s.recurring.map((r) => r.kind === kind && r.category === old ? { ...r, category: n } : r),
        limits
      });
    },
    checkDeleteCategory(s, kind, name) {
      if (catsOf(s, kind).length <= 1) return err(`Mantenha pelo menos uma categoria de ${kind === "expense" ? "despesa" : "receita"}.`, "Categoria necessária");
      if (s.recurring.some((r) => r.kind === kind && r.category === name)) return err("Esta categoria está sendo usada por uma recorrência. Altere ou exclua a recorrência primeiro.", "Categoria em uso");
      return ok(s);
    },
    deleteCategory(s, kind, name) {
      const limits = new Map(s.limits);
      if (kind === "expense") limits.delete(name);
      return { ...withCats(s, kind, catsOf(s, kind).filter((c) => c !== name)), limits };
    },
    categoryUseCount: (s, kind, name) => s.txs.filter((t) => t.kind === kind && t.category === name).length
  };
  var BACKUP_VERSION = 5;
  var BACKUP_MAX_BYTES = 30 * 1024 * 1024;
  var ID_RE = /^[A-Za-z0-9_.-]{1,48}$/;
  var YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  var BackupError = class extends Error {
  };
  var isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
  var numToString = (d) => String(d);
  function str(v, max = 120) {
    const s = typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? numToString(v) : "";
    return [...s.trim()].slice(0, max).join("");
  }
  var NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
  function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const t = v.trim();
      if (!NUM_RE.test(t)) return null;
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v === "boolean") return v ? 1 : 0;
    return null;
  }
  var MAX_ABS_CENTS = 999999999999999;
  var cents = (v) => {
    if (typeof v === "boolean") return 0;
    const n = num(v);
    return n == null || Math.abs(n) > MAX_ABS_CENTS / 100 ? 0 : Money.fromReais(n);
  };
  var intIn = (v, a, b, def) => {
    const n = num(v);
    if (n == null) return def;
    const r = Math.round(n);
    return r >= a && r <= b ? r : def;
  };
  var safeId = (v) => {
    const s = typeof v === "number" && Number.isFinite(v) ? numToString(v) : typeof v === "string" ? v : "";
    return ID_RE.test(s) ? s : "";
  };
  var parseDate = (v) => validDate(v) ? v : null;
  var parseYm = (v) => typeof v === "string" && YM_RE.test(v) ? ymOf(v + "-01") : null;
  function normalize(raw) {
    if (!isObj(raw)) throw new BackupError("Formato inválido");
    if (!Array.isArray(raw.txs)) throw new BackupError("Backup sem lista de lançamentos");
    const d = { txs: 0, goals: 0, accounts: 0, cards: 0, recurring: 0 };
    const used = /* @__PURE__ */ new Set();
    const idFor = (v) => {
      let id = safeId(v);
      if (!id || used.has(id)) id = newId();
      used.add(id);
      return id;
    };
    const cats = { expense: [...DEFAULT_EXPENSE], income: [...DEFAULT_INCOME] };
    if (isObj(raw.cats)) for (const k of ["income", "expense"]) {
      const list = raw.cats[k];
      if (!Array.isArray(list)) continue;
      const seen = /* @__PURE__ */ new Set(), out = [];
      for (const x of list) {
        const n = str(x, 40);
        if (n && !seen.has(n.toLowerCase())) {
          seen.add(n.toLowerCase());
          out.push(n);
        }
      }
      if (out.length) cats[k] = out;
    }
    const accounts = [];
    if (Array.isArray(raw.accounts)) for (const x of raw.accounts) {
      if (!isObj(x) || !str(x.name, 40)) {
        d.accounts++;
        continue;
      }
      accounts.push({ id: idFor(x.id), name: str(x.name, 40), initial: cents(x.initial) });
    }
    if (!accounts.length) {
      used.add(MAIN_ACCOUNT);
      accounts.push({ id: MAIN_ACCOUNT, name: "Conta principal", initial: 0 });
    }
    const accIds = new Set(accounts.map((a) => a.id)), firstAcc = accounts[0].id;
    const accOf = (v) => {
      const s = str(v, 48);
      return accIds.has(s) ? s : firstAcc;
    };
    const cards = [];
    if (Array.isArray(raw.cards)) for (const x of raw.cards) {
      if (!isObj(x) || !str(x.name, 40)) {
        d.cards++;
        continue;
      }
      cards.push({ id: idFor(x.id), name: str(x.name, 40), limit: Math.max(0, cents(x.limit)), close: intIn(x.close, 1, 31, 5), due: intIn(x.due, 1, 31, 12) });
    }
    const cardIds = new Set(cards.map((c) => c.id));
    const cardOf = (v) => {
      const s = str(v, 48);
      return cardIds.has(s) ? s : "";
    };
    const kindOf = (v) => v === "income" || v === "expense" ? v : null;
    const recurring = [];
    if (Array.isArray(raw.recurring)) for (const o of raw.recurring) {
      const kind = isObj(o) ? kindOf(o.kind) : null, value = isObj(o) ? cents(o.value) : 0;
      if (!isObj(o) || !kind || value <= 0 || !str(o.desc)) {
        d.recurring++;
        continue;
      }
      recurring.push({
        id: idFor(o.id),
        kind,
        desc: str(o.desc),
        value,
        category: str(o.category, 40) || cats[kind][0],
        accountId: accOf(o.accountId),
        cardId: kind === "expense" ? cardOf(o.cardId) : "",
        day: intIn(o.day, 1, 31, 1),
        active: o.active !== false,
        start: parseDate(o.start),
        last: parseYm(o.last)
      });
    }
    const txs = [];
    for (const o of raw.txs) {
      const kind = isObj(o) ? kindOf(o.kind) : null, value = isObj(o) ? cents(o.value) : 0, date = isObj(o) ? parseDate(o.date) : null;
      if (!isObj(o) || !kind || value <= 0 || !date) {
        d.txs++;
        continue;
      }
      const cardId = kind === "expense" ? cardOf(o.cardId) : "";
      const cardPayment = kind === "expense" && !cardId ? cardOf(o.cardPayment) : "";
      const p = isObj(o.parcel) ? o.parcel : null;
      const pTotal = p ? intIn(p.total, 1, 120, 0) : 0, pN = p ? intIn(p.n, 1, 120, 0) : 0;
      const okP = pTotal > 0 && pN >= 1 && pN <= pTotal;
      txs.push(tx({
        id: idFor(o.id),
        kind,
        value,
        date,
        desc: str(o.desc, 200) || "Sem descrição",
        category: str(o.category, 40) || (cardPayment ? CARD_PAYMENT_CAT : "Outros"),
        paid: cardId ? true : o.paid !== false,
        accountId: accOf(o.accountId),
        cardId,
        cardPayment,
        recurringId: safeId(o.recurringId),
        groupId: safeId(o.groupId),
        parcelN: okP ? pN : 0,
        parcelTotal: okP ? pTotal : 0
      }));
    }
    const goals = [];
    if (Array.isArray(raw.goals)) for (const g of raw.goals) {
      const target = isObj(g) ? cents(g.target) : 0;
      if (!isObj(g) || !str(g.name, 60) || target <= 0) {
        d.goals++;
        continue;
      }
      goals.push({ id: idFor(g.id), name: str(g.name, 60), target, saved: Math.max(0, cents(g.saved)), deadline: parseDate(g.deadline), monthly: Math.max(0, cents(g.monthly)) });
    }
    const limits = /* @__PURE__ */ new Map();
    if (isObj(raw.limits)) for (const [k, v] of Object.entries(raw.limits)) {
      const c = [...k.trim()].slice(0, 40).join(""), n = cents(v);
      if (c && n > 0) limits.set(c, n);
    }
    const al = num(raw.autoLock), autoLock = al != null && AUTOLOCK_OPTIONS.includes(Math.round(al)) ? Math.round(al) : 0;
    const state = { txs, goals, accounts, cards, recurring, cats, limits, privacy: raw.privacy === true, autoLock, theme: themeOf(raw.theme) };
    return { state, dropped: d, droppedTotal: d.txs + d.goals + d.accounts + d.cards + d.recurring };
  }
  function parseBackup(text) {
    if (typeof text !== "string") throw new BackupError("Arquivo vazio");
    if (text.length > BACKUP_MAX_BYTES) throw new BackupError("Arquivo grande demais");
    if (text.charCodeAt(0) === 65279) text = text.slice(1);
    let depth = 0, inStr = false, escp = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (escp) escp = false;
        else if (c === "\\") escp = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === "{" || c === "[") {
        if (++depth > 64) throw new BackupError("JSON inválido: aninhamento excessivo");
      } else if (c === "}" || c === "]") depth--;
    }
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new BackupError("JSON inválido: " + e.message);
    }
    return normalize(raw);
  }
  function toJson(s, meta) {
    const R = (c) => `\0R${Money.reaisJson(c)}\0`;
    const o = {
      txs: s.txs.map((t) => {
        const x = { id: t.id, kind: t.kind, value: R(t.value), date: t.date, desc: t.desc, category: t.category, paid: t.paid, accountId: t.accountId, cardId: t.cardId };
        if (t.cardPayment) x.cardPayment = t.cardPayment;
        if (t.recurringId) x.recurringId = t.recurringId;
        if (t.groupId) x.groupId = t.groupId;
        if (t.parcelTotal > 0) x.parcel = { n: t.parcelN, total: t.parcelTotal };
        return x;
      }),
      goals: s.goals.map((g) => ({ id: g.id, name: g.name, target: R(g.target), saved: R(g.saved), deadline: g.deadline || "", monthly: R(g.monthly) })),
      accounts: s.accounts.map((a) => ({ id: a.id, name: a.name, initial: R(a.initial) })),
      cards: s.cards.map((c) => ({ id: c.id, name: c.name, limit: R(c.limit), close: c.close, due: c.due })),
      recurring: s.recurring.map((r) => ({
        id: r.id,
        kind: r.kind,
        desc: r.desc,
        value: R(r.value),
        category: r.category,
        accountId: r.accountId,
        cardId: r.cardId,
        day: r.day,
        active: r.active,
        start: r.start || "",
        last: r.last != null ? ymStr(r.last) : ""
      })),
      cats: { expense: s.cats.expense, income: s.cats.income },
      limits: Object.fromEntries([...s.limits].map(([k, v]) => [k, R(v)])),
      privacy: s.privacy,
      autoLock: s.autoLock,
      theme: s.theme,
      backupVersion: BACKUP_VERSION
    };
    if (meta) o._backup = meta;
    return JSON.stringify(o).replace(/"\\u0000R(-?\d+\.\d{2})\\u0000"/g, "$1");
  }

  // js/assist.js
  var sum = (l) => l.reduce((n, t) => n + t.value, 0);
  function groupBy(list, key) {
    const m = /* @__PURE__ */ new Map();
    for (const x of list) {
      const k = key(x);
      const g = m.get(k);
      if (g) g.push(x);
      else m.set(k, [x]);
    }
    return m;
  }
  var byDesc = (f) => (a, b) => f(b) - f(a);
  var Text = {
    /** Palavras sem significado para classificar (artigos, preposições e "ruído" de extrato bancário). */
    STOP: /* @__PURE__ */ new Set([
      "a",
      "o",
      "as",
      "os",
      "um",
      "uma",
      "de",
      "da",
      "do",
      "das",
      "dos",
      "em",
      "no",
      "na",
      "nos",
      "nas",
      "e",
      "com",
      "para",
      "pra",
      "por",
      "pelo",
      "pela",
      "ao",
      "aos",
      "meu",
      "minha",
      "pag",
      "pagto",
      "compra",
      "compras",
      "cp",
      "deb",
      "debito",
      "cred",
      "credito",
      "cartao",
      "parcela",
      "ltda",
      "sa",
      "me",
      "eireli",
      "epp",
      "br",
      "www",
      "sem",
      "descricao"
    ]),
    /** minúsculas, sem acentos, só letras e números separados por um espaço */
    fold: (s) => String(s ?? "").normalize("NFD").replace(/\p{Mn}+/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    /** palavras relevantes: 2+ letras, não só números, fora da lista STOP */
    tokens: (s) => Text.fold(s).split(" ").filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !Text.STOP.has(w)),
    key: (s) => [...new Set(Text.tokens(s))].join(" "),
    same: (a, b) => Text.fold(a) === Text.fold(b)
  };
  var pct = (v) => `${Math.round(Math.abs(v))}%`;
  var plural = (n, one2, many) => n === 1 ? `1 ${one2}` : `${n} ${many}`;
  var Dictionary = class _Dictionary {
    constructor(sections) {
      this.sections = sections;
    }
    static parse(text) {
      const out = [];
      let kind = null, names = [], terms = [], line0 = 0;
      const flush = () => {
        if (kind && terms.length) out.push({ kind, names, terms: [...new Set(terms)], line: line0 });
      };
      String(text).split(/\r?\n/).forEach((raw, i) => {
        const l = raw.split("#")[0].trim();
        if (!l) return;
        const h = /^\[\s*(despesa|receita)\s*:\s*(.+)]$/i.exec(l);
        if (h) {
          flush();
          kind = h[1].toLowerCase() === "receita" ? "income" : "expense";
          names = h[2].split("|").map((x) => x.trim()).filter(Boolean);
          terms = [];
          line0 = i + 1;
        } else if (kind) {
          for (const t of l.split(",").map(Text.fold)) if (t.length >= 2) terms.push(t);
        }
      });
      flush();
      return new _Dictionary(out);
    }
    /** Categoria com maior peso de termos encontrados; empate entre categorias diferentes = sem sugestão. */
    match(desc, kind, categories) {
      const folded = Text.fold(desc), padded = ` ${folded} `, words = folded.split(" ");
      const found = [];
      for (const s of this.sections) {
        if (s.kind !== kind) continue;
        let cat = null;
        for (const n of s.names) {
          cat = categories.find((c) => Text.same(c, n)) ?? null;
          if (cat) break;
        }
        if (!cat) continue;
        const hits = s.terms.filter((t) => padded.includes(` ${t} `) || t.length >= 5 && !t.includes(" ") && words.some((w) => w.startsWith(t) && w.length - t.length <= 2));
        if (hits.length) found.push({ category: cat, terms: hits, section: s });
      }
      if (!found.length) return null;
      const weight = (m) => m.terms.reduce((n, t) => n + t.split(" ").length, 0);
      const byCat = [...groupBy(found, (m) => m.category)].map(([c, l]) => ({ category: c, terms: [...new Set(l.flatMap((m) => m.terms))], section: l[0].section })).sort(byDesc(weight));
      if (byCat.length > 1 && weight(byCat[0]) === weight(byCat[1])) return null;
      return byCat[0];
    }
  };
  var MIN_CONFIDENCE = 0.7;
  var MIN_DOCS = 5;
  var MIN_WORD_DOCS = 2;
  var ALPHA = 0.1;
  var PARCEL = /\s*\(\d+\/\d+\)\s*$/;
  var cleanParcel = (d) => String(d).replace(PARCEL, "");
  var _Categorizer_instances, same_fn, learned_fn, dictionary_fn;
  var _Categorizer = class _Categorizer {
    constructor(s, kind, dict) {
      __privateAdd(this, _Categorizer_instances);
      this.kind = kind;
      this.categories = s.cats[kind];
      this.dict = dict || null;
      this.exact = /* @__PURE__ */ new Map();
      this.catDocs = /* @__PURE__ */ new Map();
      this.wordDocs = /* @__PURE__ */ new Map();
      this.catWords = /* @__PURE__ */ new Map();
      this.docs = 0;
      for (const t of _Categorizer.training(s, kind)) {
        const toks = Text.tokens(cleanParcel(t.desc));
        if (!toks.length) continue;
        this.docs++;
        const uniq = [...new Set(toks)], k = uniq.join(" ");
        if (!this.exact.has(k)) this.exact.set(k, /* @__PURE__ */ new Map());
        const m = this.exact.get(k), prev = m.get(t.category), d = dayNum(t.date);
        m.set(t.category, [(prev?.[0] ?? 0) + 1, Math.max(prev?.[1] ?? -Infinity, d)]);
        this.catDocs.set(t.category, (this.catDocs.get(t.category) || 0) + 1);
        this.catWords.set(t.category, (this.catWords.get(t.category) || 0) + toks.length);
        for (const w of uniq) {
          if (!this.wordDocs.has(w)) this.wordDocs.set(w, /* @__PURE__ */ new Map());
          const wm = this.wordDocs.get(w);
          wm.set(t.category, (wm.get(t.category) || 0) + 1);
        }
      }
    }
    /** lançamentos usados para aprender: do mesmo tipo, com descrição, em categoria que ainda existe */
    static training(s, kind) {
      const cats = new Set(s.cats[kind]);
      return s.txs.filter((t) => t.kind === kind && isFlow(t) && cats.has(t.category) && t.desc !== "Sem descrição");
    }
    get trainingSize() {
      return this.docs;
    }
    suggest(desc) {
      const toks = Text.tokens(cleanParcel(desc));
      if (!toks.length) return null;
      return __privateMethod(this, _Categorizer_instances, same_fn).call(this, toks) ?? __privateMethod(this, _Categorizer_instances, learned_fn).call(this, toks) ?? __privateMethod(this, _Categorizer_instances, dictionary_fn).call(this, desc);
    }
    /** "O que o assistente aprendeu": palavras mais frequentes por categoria (≥ 2 lançamentos) */
    learnedWords(perCategory = 6) {
      const out = [];
      for (const c of this.categories) {
        const words = [];
        for (const [w, m] of this.wordDocs) {
          const n = m.get(c);
          if (n >= MIN_WORD_DOCS) words.push([w, n]);
        }
        words.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        if (words.length) out.push([c, words.slice(0, perCategory)]);
      }
      return out;
    }
  };
  _Categorizer_instances = new WeakSet();
  same_fn = function(toks) {
    const m = this.exact.get([...new Set(toks)].join(" "));
    if (!m) return null;
    let total = 0;
    for (const v of m.values()) total += v[0];
    const [cat, [n]] = [...m].sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1])[0];
    const share = n / total;
    if (share < 0.6) return null;
    return {
      category: cat,
      source: "SAME_DESCRIPTION",
      confidence: share,
      why: `Você já lançou esta descrição ${n === 1 ? "1 vez" : `${n} vezes`} como ${cat}` + (total > n ? ` (e ${total - n} vez(es) em outra categoria).` : ".")
    };
  };
  learned_fn = function(toks) {
    if (this.docs < MIN_DOCS || this.catDocs.size < 2) return null;
    const known = [...new Set(toks)].filter((w) => this.wordDocs.has(w));
    if (!known.length) return null;
    const vocab = this.wordDocs.size, k = this.catDocs.size;
    const scores = /* @__PURE__ */ new Map();
    for (const [c, n] of this.catDocs) {
      let sc = Math.log((n + 1) / (this.docs + k));
      for (const w of known) sc += Math.log(((this.wordDocs.get(w).get(c) || 0) + ALPHA) / (this.catWords.get(c) + ALPHA * vocab));
      scores.set(c, sc);
    }
    let cat = null, best = -Infinity;
    for (const [c, v] of scores) if (v > best) {
      best = v;
      cat = c;
    }
    let z = 0;
    for (const v of scores.values()) z += Math.exp(v - best);
    const p = 1 / z;
    if (p < MIN_CONFIDENCE) return null;
    let word = null, wd = -1;
    for (const w of known) {
      const x = this.wordDocs.get(w).get(cat) || 0;
      if (x > wd) {
        wd = x;
        word = w;
      }
    }
    if (wd < MIN_WORD_DOCS) return null;
    let totalW = 0;
    for (const v of this.wordDocs.get(word).values()) totalW += v;
    return {
      category: cat,
      source: "LEARNED",
      confidence: p,
      why: `A palavra “${word}” aparece em ${wd} lançamento(s) seus de ${cat}` + (totalW > wd ? ` (de ${totalW} com essa palavra)` : "") + `. Confiança: ${pct(p * 100)}.`
    };
  };
  dictionary_fn = function(desc) {
    if (!this.dict) return null;
    const m = this.dict.match(desc, this.kind, this.categories);
    if (!m) return null;
    return {
      category: m.category,
      source: "DICTIONARY",
      confidence: 0.6,
      why: `${m.terms.map((t) => `“${t}”`).join(", ")} está no dicionário aberto do assistente, na seção de ${m.category} (linha ${m.section.line} de dicionario.txt).`
    };
  };
  var Categorizer = _Categorizer;
  var INSIGHT_LABELS = {
    DUPLICATE: "Possível duplicado",
    PRICE_UP: "Aumento de preço",
    LIMIT_PACE: "Ritmo do limite",
    OVER_INCOME: "Ritmo do mês",
    CATEGORY_SPIKE: "Acima da média",
    SMALL_SPENDS: "Pequenos gastos",
    SUBSCRIPTIONS: "Gastos fixos"
  };
  var SMALL_VALUE = 2e3;
  var SMALL_MIN_COUNT = 10;
  var SPIKE_RATIO = 1.3;
  var SPIKE_MIN_DIFF = 5e3;
  var PACE_MIN_DAY = 7;
  var SUB_MIN_MONTHS = 3;
  var SUB_TOLERANCE = 0.3;
  var PRICE_UP_RATIO = 1.05;
  var DUP_DAYS = 60;
  var expenses = (s) => s.txs.filter((t) => t.kind === "expense" && isFlow(t));
  var inMonthUntil = (t, ym, lastDay) => ymOf(t.date) === ym && dom(t.date) <= lastDay;
  var isFixed = (t) => !!t.recurringId || !!t.groupId;
  var insight = (id, type, title, text, why2, priority, extra = {}) => ({ id, type, title, text, why: why2, priority, query: null, from: null, to: null, ...extra });
  var Insights = {
    report(s, today2, money3 = Money.format) {
      const ym = ymOf(today2), day = dom(today2), prev = ym - 1, prevDay = Math.min(day, ymLen(prev));
      const exp = expenses(s);
      const curExp = exp.filter((t) => t.paid && inMonthUntil(t, ym, day));
      const prevExp = exp.filter((t) => t.paid && inMonthUntil(t, prev, prevDay));
      const curInc = s.txs.filter((t) => t.kind === "income" && t.paid && inMonthUntil(t, ym, day));
      const spent = sum(curExp), before = sum(prevExp), income = sum(curInc);
      const lines = [];
      if (spent === 0) lines.push(`Ainda não há despesas realizadas em ${brMonth(ym)}.`);
      else {
        let l = `Até hoje (dia ${day}) você gastou ${money3(spent)} em ${brMonth(ym)}.`;
        if (before > 0) {
          const c = (spent - before) * 100 / before;
          l += Math.abs(c) < 3 ? ` Praticamente o mesmo que no mesmo período de ${brMonth(prev)} (${money3(before)}).` : c > 0 ? ` São ${pct(c)} a mais que no mesmo período de ${brMonth(prev)} (${money3(before)}).` : ` São ${pct(c)} a menos que no mesmo período de ${brMonth(prev)} (${money3(before)}).`;
        }
        lines.push(l);
      }
      if (income > 0) lines.push(income >= spent ? `Entraram ${money3(income)}; sobram ${money3(income - spent)} até agora.` : `Entraram ${money3(income)}; as despesas já passam as receitas em ${money3(spent - income)}.`);
      let topCat = null, topV = -1;
      for (const [c, l] of groupBy(curExp, (t) => t.category)) {
        const v = sum(l);
        if (v > topV) {
          topV = v;
          topCat = c;
        }
      }
      if (topCat != null && spent > 0) lines.push(`A maior categoria é ${topCat}: ${money3(topV)} (${pct(topV * 100 / spent)} das despesas).`);
      const pending2 = exp.filter((t) => !t.paid && !isCard(t) && ymOf(t.date) === ym && t.date >= today2);
      if (pending2.length) lines.push(`Ainda faltam ${money3(sum(pending2))} em ${plural(pending2.length, "conta", "contas")} a pagar até o fim do mês.`);
      const toReceive = s.txs.filter((t) => t.kind === "income" && !t.paid && ymOf(t.date) === ym);
      if (toReceive.length) lines.push(`A receber neste mês: ${money3(sum(toReceive))} em ${plural(toReceive.length, "lançamento", "lançamentos")}.`);
      const late = exp.filter((t) => !t.paid && !isCard(t) && t.date < today2);
      if (late.length) lines.push(`${plural(late.length, "conta está", "contas estão")} em atraso (${money3(sum(late))}).`);
      if (day <= 7) {
        const pe = sum(exp.filter((t) => t.paid && ymOf(t.date) === prev));
        const pi = sum(s.txs.filter((t) => t.kind === "income" && t.paid && ymOf(t.date) === prev));
        if (pe > 0 || pi > 0) lines.push(`Fechamento de ${brMonth(prev)}: receitas ${money3(pi)}, despesas ${money3(pe)}, saldo ${money3(pi - pe)}.`);
      }
      return {
        title: `Resumo de ${brMonthYear(ym)}`,
        lines,
        why: `Considera só lançamentos realizados (pagos ou recebidos) até hoje. Compras no cartão contam na data da compra; pagamentos de fatura não contam como despesa nova. A comparação usa os mesmos dias (1 a ${day}) do mês anterior, para ser justa.`
      };
    },
    tips(s, today2, money3 = Money.format) {
      const subs = Insights.recurringExpenses(s, today2);
      const out = [
        ...Insights.duplicates(s, today2, money3),
        ...Insights.priceUps(subs, money3),
        ...Insights.limitPace(s, today2, money3),
        Insights.overIncome(s, today2, money3),
        ...Insights.spikes(s, today2, money3),
        Insights.smallSpends(s, today2, money3),
        Insights.subscriptionsSummary(subs, today2, money3)
      ].filter(Boolean);
      return out.map((x, i) => [x, i]).sort((a, b) => b[0].priority - a[0].priority || a[1] - b[1]).map((x) => x[0]);
    },
    /** mesma descrição + mesmo valor + mesma data, nos últimos 60 dias, sem ser parcela/recorrência */
    duplicates(s, today2, money3) {
      const since = addDays(today2, -DUP_DAYS);
      const g = groupBy(expenses(s).filter((t) => t.date >= since && !isFixed(t)), (t) => `${t.date}${t.value}${Text.key(t.desc)}`);
      return [...g].filter(([k, l]) => k.split("")[2] && l.length >= 2).map((e, i) => [e, i]).sort((a, b) => a[0][1][0].date < b[0][1][0].date ? 1 : a[0][1][0].date > b[0][1][0].date ? -1 : a[1] - b[1]).slice(0, 3).map(([[k, l]]) => {
        const t = l[0], [date, value, key] = k.split("");
        return insight(
          `dup:${date}:${value}:${key}`,
          "DUPLICATE",
          "Possível lançamento duplicado",
          `“${t.desc}” aparece ${l.length} vezes em ${brDayMonth(t.date)} com o mesmo valor (${money3(t.value)}). Se foi lançado em dobro, exclua a cópia.`,
          `Regra: mesma descrição, mesmo valor e mesma data, nos últimos ${DUP_DAYS} dias, sem ser parcela nem recorrência. Se forem compras diferentes de verdade, dispense este aviso.`,
          10,
          { query: t.desc, from: t.date, to: t.date }
        );
      });
    },
    /** gasto que se repete uma vez por mês, com valor parecido, em ≥ 3 meses seguidos até o mês atual ou o anterior */
    recurringExpenses(s, today2) {
      const cur = ymOf(today2), window2 = cur - 5, out = [];
      const groups = groupBy(expenses(s).filter((t) => !t.groupId && ymOf(t.date) >= window2 && ymOf(t.date) <= cur), (t) => Text.key(cleanParcel(t.desc)));
      for (const [key, list] of groups) {
        if (!key) continue;
        const byM = groupBy(list, (t) => ymOf(t.date));
        if ([...byM.values()].some((l) => l.length > 1)) continue;
        const months = [...byM.keys()].sort((a, b) => a - b), end = months.at(-1);
        if (end !== cur && end !== cur - 1) continue;
        let run = 1;
        while (run < months.length && months[months.length - 1 - run] === end - run) run++;
        if (run < SUB_MIN_MONTHS) continue;
        const seq2 = months.slice(-run).map((m) => [m, byM.get(m)[0]]);
        const vals = seq2.map((x) => x[1].value).sort((a, b) => a - b), median = vals[Math.floor(vals.length / 2)];
        if (vals.some((v) => v < median * (1 - SUB_TOLERANCE) || v > median * (1 + SUB_TOLERANCE))) continue;
        out.push({ name: cleanParcel(seq2.at(-1)[1].desc), key, byMonth: seq2, get last() {
          return this.byMonth.at(-1)[1];
        } });
      }
      return out.map((x, i) => [x, i]).sort((a, b) => b[0].last.value - a[0].last.value || a[1] - b[1]).map((x) => x[0]);
    },
    priceUps(subs, money3) {
      return subs.flatMap((m) => {
        if (m.byMonth.length < 2) return [];
        const [ymLastM, last] = m.byMonth.at(-1), before = m.byMonth.at(-2)[1];
        if (last.value < before.value * PRICE_UP_RATIO || last.value - before.value < 100) return [];
        const c = (last.value - before.value) * 100 / before.value;
        return [insight(
          `up:${m.key}:${ymLastM}`,
          "PRICE_UP",
          `${m.name} ficou mais caro`,
          `“${m.name}” passou de ${money3(before.value)} para ${money3(last.value)} em ${brMonth(ymLastM)} (+${pct(c)}). Vale conferir se houve reajuste ou mudança de plano.`,
          `Regra: gasto mensal (1 vez por mês, ${m.byMonth.length} meses seguidos) cujo último valor ficou pelo menos ${pct((PRICE_UP_RATIO - 1) * 100)} e R$ 1,00 acima do mês anterior.`,
          9,
          { query: m.name }
        )];
      });
    },
    subscriptionsSummary(subs, today2, money3) {
      if (!subs.length) return null;
      const total = subs.reduce((n, m) => n + m.last.value, 0);
      const list = subs.slice(0, 5).map((m) => `${m.name} (${money3(m.last.value)})`).join(", ") + (subs.length > 5 ? ` e mais ${subs.length - 5}` : "");
      return insight(
        `subs:${ymOf(today2)}:${subs.length}:${total}`,
        "SUBSCRIPTIONS",
        "Gastos fixos do mês",
        `Encontrei ${plural(subs.length, "gasto que se repete", "gastos que se repetem")} todo mês, somando ${money3(total)} por mês (${money3(total * 12)} por ano): ${list}. Gastos fixos pesam o ano inteiro: vale revisar planos, assinaturas e tarifas que dá para reduzir.`,
        `Regra: mesma descrição, uma vez por mês, em pelo menos ${SUB_MIN_MONTHS} meses seguidos (até este mês ou o anterior), com valores a até ${pct(SUB_TOLERANCE * 100)} da mediana. Parcelas não entram. O valor mensal é o do último lançamento.`,
        4
      );
    },
    /** compromissos do mês (recorrências, parcelas, contas agendadas) + gasto variável no ritmo diário atual */
    project(list, today2) {
      const ym = ymOf(today2), day = dom(today2), len = ymLen(ym);
      const month = list.filter((t) => ymOf(t.date) === ym);
      const committed = sum(month.filter((t) => isFixed(t) || !t.paid));
      const variable = sum(month.filter((t) => !isFixed(t) && t.paid && dom(t.date) <= day));
      return { committed, variable, projected: committed + Math.round(variable / day * len) };
    },
    limitPace(s, today2, money3) {
      const ym = ymOf(today2), day = dom(today2), len = ymLen(ym);
      if (day < PACE_MIN_DAY || day >= len) return [];
      const exp = expenses(s), out = [];
      for (const [cat, lim] of s.limits) {
        const l = exp.filter((t) => t.category === cat);
        const used = sum(l.filter((t) => ymOf(t.date) === ym));
        if (used >= lim) continue;
        const p = Insights.project(l, today2);
        if (p.projected <= lim || p.projected - lim < 1e3) continue;
        const left = len - day, perDay = Math.trunc(Math.max(0, lim - used) / left);
        out.push(insight(
          `pace:${ymOf(today2)}:${cat}`,
          "LIMIT_PACE",
          `${cat} pode passar do limite`,
          `No ritmo atual, ${cat} deve fechar ${brMonth(ym)} em cerca de ${money3(p.projected)}, acima do limite de ${money3(lim)}. Para ficar dentro, gaste até ${money3(perDay)} por dia nos ${left} dias restantes.`,
          `Conta: compromissos do mês (recorrências, parcelas e contas agendadas) ${money3(p.committed)} + gasto variável até hoje ${money3(p.variable)} ÷ ${day} dias × ${len} dias. Já usado: ${money3(used)} de ${money3(lim)}.`,
          8,
          { query: cat, from: ymFirst(ym), to: today2 }
        ));
      }
      return out;
    },
    overIncome(s, today2, money3) {
      const ym = ymOf(today2), day = dom(today2), len = ymLen(ym);
      if (day < PACE_MIN_DAY || day >= len) return null;
      const income = sum(s.txs.filter((t) => t.kind === "income" && ymOf(t.date) === ym));
      if (income <= 0) return null;
      const p = Insights.project(expenses(s), today2);
      if (p.projected <= income) return null;
      return insight(
        `over:${ym}`,
        "OVER_INCOME",
        "Despesas podem passar das receitas",
        `No ritmo atual, as despesas de ${brMonth(ym)} chegam a cerca de ${money3(p.projected)}, acima das receitas previstas para o mês (${money3(income)}). Diferença estimada: ${money3(p.projected - income)}.`,
        `Conta: compromissos do mês ${money3(p.committed)} + gasto variável até hoje ${money3(p.variable)} ÷ ${day} dias × ${len} dias. Receitas previstas = recebidas + a receber neste mês.`,
        8,
        { from: ymFirst(ym), to: today2 }
      );
    },
    spikes(s, today2, money3) {
      const ym = ymOf(today2), exp = expenses(s).filter((t) => t.paid), months = [ym - 1, ym - 2, ym - 3], out = [];
      for (const [cat, curList] of groupBy(exp.filter((t) => ymOf(t.date) === ym && t.date <= today2), (t) => t.category)) {
        const cur = sum(curList);
        const hist = months.map((m) => sum(exp.filter((t) => t.category === cat && ymOf(t.date) === m)));
        if (hist.filter((v) => v > 0).length < 2) continue;
        const avg = Math.trunc((hist[0] + hist[1] + hist[2]) / 3);
        if (avg <= 0 || cur < avg * SPIKE_RATIO || cur - avg < SPIKE_MIN_DIFF) continue;
        const top = [...curList].sort((a, b) => b.value - a.value).slice(0, 2).map((t) => `“${t.desc}” (${money3(t.value)})`).join(", ");
        out.push(insight(
          `spike:${ym}:${cat}`,
          "CATEGORY_SPIKE",
          `${cat} acima do normal`,
          `${cat} já soma ${money3(cur)} em ${brMonth(ym)}, ${pct((cur - avg) * 100 / avg)} acima da sua média dos últimos 3 meses (${money3(avg)}). Maiores: ${top}.`,
          `Regra: gasto realizado da categoria neste mês ≥ ${pct((SPIKE_RATIO - 1) * 100)} acima da média de ${[...months].reverse().map(brMonth).join(", ")} (${[...hist].reverse().map(money3).join(" + ")} ÷ 3) e pelo menos ${money3(SPIKE_MIN_DIFF)} a mais. Precisa de dados em pelo menos 2 desses meses.`,
          7,
          { query: cat, from: ymFirst(ym), to: today2 }
        ));
      }
      return out;
    },
    smallSpends(s, today2, money3) {
      const ym = ymOf(today2);
      const month = expenses(s).filter((t) => t.paid && ymOf(t.date) === ym && t.date <= today2);
      const small = month.filter((t) => t.value <= SMALL_VALUE);
      if (small.length < SMALL_MIN_COUNT) return null;
      const total = sum(small), all = sum(month);
      const freq = [...groupBy(small, (t) => Text.key(t.desc))].filter(([k, l]) => k && l.length >= 2).map((e, i) => [e, i]).sort((a, b) => b[0][1].length - a[0][1].length || a[1] - b[1]).slice(0, 3).map(([[, l]]) => `“${l[0].desc}” (${l.length}×)`).join(", ");
      return insight(
        `small:${ym}:${small.length}`,
        "SMALL_SPENDS",
        "Pequenos gastos somando",
        `${small.length} compras de até ${money3(SMALL_VALUE)} somaram ${money3(total)} em ${brMonth(ym)} (${pct(total * 100 / all)} das despesas).` + (freq ? ` Os mais frequentes: ${freq}.` : ""),
        `Regra: despesas realizadas de até ${money3(SMALL_VALUE)} neste mês, quando passam de ${SMALL_MIN_COUNT}. Sozinhas parecem pouco; juntas mostram para onde vai o dinheiro.`,
        5,
        { from: ymFirst(ym), to: today2 }
      );
    }
  };
  var INTENT_LABELS = { TOTAL: "total", MAX: "maior lançamento", COUNT: "quantidade", AVERAGE: "média por dia", BALANCE: "saldo" };
  var ASK_EXAMPLES = [
    "Quanto gastei este mês?",
    "Quanto gastei com mercado no mês passado?",
    "Maior gasto da semana",
    "Quanto recebi este ano?",
    "Saldo do mês passado",
    "Quantas vezes usei uber nos últimos 30 dias?"
  ];
  var W = (a) => new Set(a.split(" "));
  var EXPENSE_W = W("gastei gasto gastos gastou gastamos despesa despesas paguei pagamos saiu sairam custou custaram gastar");
  var INCOME_W = W("recebi recebemos receita receitas ganhei ganho ganhos entrou entraram entrada entradas renda");
  var BALANCE_W = W("saldo sobrou sobra economizei guardei balanco lucro");
  var MAX_W = W("maior maiores caro cara");
  var COUNT_W = W("quantas quantos vezes frequencia");
  var AVG_W = W("media medio");
  var FILLER = W("quanto quanta qual quais foi foram eu nos meu minha meus minhas total valor lancamento lancamentos usei fiz tive tem teve ja ate agora mes ano semana dia dias ultimos ultimas ultimo ultima passado passada este esta esse essa neste nesta nesse nessa deste desta desse dessa hoje ontem por no na em de do da com o a os as que mais gasto atual corrente inteiro todo toda periodo compra compras vez");
  var MONTH_W = {
    janeiro: 1,
    jan: 1,
    fevereiro: 2,
    fev: 2,
    marco: 3,
    abril: 4,
    abr: 4,
    maio: 5,
    junho: 6,
    jun: 6,
    julho: 7,
    jul: 7,
    agosto: 8,
    ago: 8,
    setembro: 9,
    set: 9,
    outubro: 10,
    out: 10,
    novembro: 11,
    nov: 11,
    dezembro: 12,
    dez: 12
  };
  var isDigits = (w) => /^\d+$/.test(w);
  var per = (from, to, label) => ({ from, to, label });
  function period(w, today2, used) {
    const f = ` ${w.join(" ")} `, has = (...p) => p.some((x) => f.includes(` ${x} `)), ym = ymOf(today2), year = ymYear(ym);
    const m = / ultimos (\d{1,3}) dias /.exec(f);
    if (m) {
      const n = Math.min(366, Math.max(1, +m[1]));
      used.add(m[1]);
      return per(addDays(today2, 1 - n), today2, `últimos ${n} dias`);
    }
    if (has("hoje")) return per(today2, today2, "hoje");
    if (has("ontem")) {
      const d = addDays(today2, -1);
      return per(d, d, `ontem (${brDate(d)})`);
    }
    if (has("semana passada", "ultima semana")) {
      const mon = addDays(today2, 1 - weekday(today2) - 7), sun = addDays(mon, 6);
      return per(mon, sun, `semana passada (${brDayMonth(mon)} a ${brDayMonth(sun)})`);
    }
    if (has("semana")) {
      const mon = addDays(today2, 1 - weekday(today2));
      return per(mon, today2, `esta semana (desde ${brDayMonth(mon)})`);
    }
    if (has("mes passado", "ultimo mes")) return per(ymFirst(ym - 1), ymLast(ym - 1), brMonthYear(ym - 1));
    if (has("ano passado")) return per(`${year - 1}-01-01`, `${year - 1}-12-31`, `ano de ${year - 1}`);
    if (has("este ano", "esse ano", "neste ano", "nesse ano", "ano atual", "deste ano", "desse ano")) return per(`${year}-01-01`, today2, `este ano (${year})`);
    for (let i = 0; i < w.length; i++) {
      const mm = MONTH_W[w[i]];
      if (!mm) continue;
      used.add(w[i]);
      const yw = w.slice(i + 1, i + 3).find((x) => x.length === 4 && isDigits(x));
      let y2;
      if (yw) {
        y2 = +yw;
        used.add(yw);
      } else y2 = mm > ymMonth(ym) ? year - 1 : year;
      const t = y2 * 12 + mm - 1;
      return per(ymFirst(t), ymLast(t), brMonthYear(t));
    }
    const y = w.find((x) => x.length === 4 && isDigits(x) && +x >= 1990 && +x <= 2100);
    if (y) {
      used.add(y);
      const a = `${y}-01-01`, b = `${y}-12-31`, mx = today2 > a ? today2 : a;
      return per(a, b < mx ? b : mx, `ano de ${y}`);
    }
    return per(ymFirst(ym), ymLast(ym), `${brMonthYear(ym)} (este mês)`);
  }
  var Ask = {
    parse(question, s, today2) {
      const f = Text.fold(question), words = f.split(" ").filter(Boolean), set = new Set(words), used = /* @__PURE__ */ new Set();
      let category = null, catKind = null;
      const padded = ` ${f} `;
      for (const k of ["income", "expense"]) for (const c of s.cats[k]) {
        const fc = Text.fold(c);
        if (fc && padded.includes(` ${fc} `) && (category == null || fc.length > Text.fold(category).length)) {
          category = c;
          catKind = k;
        }
      }
      if (category != null) for (const x of Text.fold(category).split(" ")) used.add(x);
      const any = (ws) => words.some((x) => ws.has(x));
      const kind = any(INCOME_W) ? "income" : any(EXPENSE_W) ? "expense" : catKind;
      const intent = any(BALANCE_W) ? "BALANCE" : any(AVG_W) ? "AVERAGE" : any(MAX_W) ? "MAX" : any(COUNT_W) ? "COUNT" : "TOTAL";
      for (const ws of [EXPENSE_W, INCOME_W, BALANCE_W, MAX_W, COUNT_W, AVG_W]) for (const x of ws) used.add(x);
      const p = period(words, today2, used);
      const rest = [...new Set(words.filter((x) => !used.has(x) && !FILLER.has(x) && !Text.STOP.has(x) && x.length >= 2 && !isDigits(x)))];
      const vocab = /* @__PURE__ */ new Set();
      for (const t of s.txs) for (const x of Text.fold(t.desc + " " + t.category).split(" ")) vocab.add(x);
      const vl = [...vocab], known = [], ignored = [];
      for (const x of rest) (vl.some((v) => v.startsWith(x)) ? known : ignored).push(x);
      return { intent, kind: intent === "BALANCE" ? null : kind ?? "expense", period: p, category, words: known, ignored };
    },
    answer(question, s, today2, money3 = Money.format) {
      const p = Ask.parse(question, s, today2);
      const all = s.txs.filter((t) => isFlow(t) && (p.kind == null || t.kind === p.kind) && t.date >= p.period.from && t.date <= p.period.to && (p.category == null || t.category === p.category) && (!p.words.length || ((d) => p.words.every((w) => ` ${d} `.includes(` ${w}`)))(Text.fold(t.desc + " " + t.category))));
      const done = all.filter((t) => t.paid), pending2 = all.filter((t) => !t.paid);
      const what = p.kind === "income" ? "receitas" : p.kind === "expense" ? "despesas" : "receitas e despesas";
      const filter = [p.category != null ? `categoria ${p.category}` : null, p.words.length ? `descrição com “${p.words.join(" ")}”` : null].filter(Boolean);
      const understood = `Como entendi: ${INTENT_LABELS[p.intent]} de ${what} · ${p.period.label}` + (filter.length ? " · " + filter.join(" · ") : "") + " · só valores realizados." + (p.ignored.length ? ` Ignorei ${p.ignored.map((x) => `“${x}”`).join(", ")}: não aparece em nenhum lançamento.` : "");
      const scope = (filter.length ? ` (${filter.join(", ")})` : "") + ` em ${p.period.label}`;
      const total = sum(done), verb = p.kind === "income" ? "recebeu" : "gastou";
      const pendNote = pending2.length && p.intent !== "BALANCE" ? ` Há ainda ${money3(sum(pending2))} pendente(s) em ${plural(pending2.length, "lançamento", "lançamentos")}.` : "";
      let text;
      switch (p.intent) {
        case "TOTAL":
          text = !done.length ? `Não encontrei ${what} realizadas${scope}.${pendNote}` : `Você ${verb} ${money3(total)}${scope}, em ${plural(done.length, "lançamento", "lançamentos")}.${pendNote}`;
          break;
        case "COUNT":
          text = !done.length ? `Nenhum lançamento de ${what}${scope}.${pendNote}` : `${plural(done.length, "lançamento", "lançamentos")} de ${what}${scope}, somando ${money3(total)}.${pendNote}`;
          break;
        case "MAX": {
          const top = done.map((t, i) => [t, i]).sort((a, b) => b[0].value - a[0].value || a[1] - b[1]).slice(0, 3).map((x) => x[0]);
          text = !top.length ? `Não encontrei ${what} realizadas${scope}.` : `O maior foi “${top[0].desc}”: ${money3(top[0].value)} em ${brDate(top[0].date)} (${top[0].category}).` + (top.length > 1 ? " Depois: " + top.slice(1).map((t) => `“${t.desc}” ${money3(t.value)}`).join("; ") + "." : "");
          break;
        }
        case "AVERAGE": {
          const end = p.period.to < today2 ? p.period.to : today2;
          const days = Math.max(1, dayNum(end) - dayNum(p.period.from) + 1);
          text = !done.length ? `Não encontrei ${what} realizadas${scope}.` : `Média de ${money3(Math.trunc(total / days))} por dia${scope} (${money3(total)} em ${days} dia(s) até ${brDate(end)}).`;
          break;
        }
        default: {
          const inc = sum(done.filter((t) => t.kind === "income")), exp = sum(done.filter((t) => t.kind === "expense"));
          text = `Em ${p.period.label}: receitas ${money3(inc)}, despesas ${money3(exp)}, saldo ${money3(inc - exp)}.`;
        }
      }
      return { text, understood, parsed: p, matches: done };
    }
  };

  // js/embedded-data.js
  var DICT_TEXT = "# Finan+ — Copyright (C) 2026 Juscelino Be\n# SPDX-License-Identifier: GPL-3.0-or-later\n# ============================================================================\n#  Finan+ · Dicionário inicial do assistente\n#  Este arquivo é lido pelo app para sugerir categorias pela descrição.\n#  Qualquer pessoa pode ler, corrigir ou ampliar. Formato:\n#\n#    [despesa: Categoria preferida | alternativa | outra alternativa]\n#    termo, outro termo, termo com várias palavras\n#\n#  - Vale o PRIMEIRO nome da seção que existir nas categorias do usuário.\n#    Se nenhum existir, a seção é ignorada.\n#  - Termos são comparados sem acento e sem diferenciar maiúsculas.\n#  - Termos de 5+ letras também casam com plurais simples (supermercado → supermercados).\n#  - Quando duas categorias empatam, o assistente NÃO sugere (prefere não errar).\n#  - O que o usuário já lançou sempre tem prioridade sobre este dicionário.\n# ============================================================================\n\n# ---------------------------------------------------------------- DESPESAS\n\n[despesa: Mercado | Supermercado | Alimentação]\nsupermercado, mercado, mercadinho, mercearia, hortifruti, sacolao, atacadao, atacado, assai, carrefour,\npao de acucar, extra, bompreco, zaffari, angeloni, condor, muffato, savegnago, sonda, supermercado dia,\noba hortifruti, mambo, hirota, makro, sams club, fort atacadista, mart minas, super nosso, verdemar,\nguanabara, prezunic, st marche, comper, giassi, bistek, coop, festval, feira, acougue\n\n[despesa: Delivery | Restaurante | Alimentação]\nifood, rappi, uber eats, eats, 99food, ze delivery, aiqfome, delivery\n\n[despesa: Restaurante | Alimentação]\nrestaurante, lanchonete, lanche, pizzaria, pizza, hamburgueria, burger, mcdonalds, mc donalds, bk,\nburger king, subway, habibs, giraffas, outback, madero, spoleto, china in box, kfc, popeyes, starbucks,\ncafeteria, cafe, padaria, panificadora, confeitaria, doceria, sorveteria, acai, pastelaria, churrascaria,\nself service, marmita, marmitex, almoco, jantar, bar, boteco, cervejaria, kopenhagen, cacau show\n\n[despesa: Combustível | Transporte]\nposto, combustivel, gasolina, etanol, alcool, diesel, gnv, ipiranga, shell, petrobras, br mania, raizen\n\n[despesa: Transporte]\nuber, 99 pop, 99app, 99 taxi, taxi, cabify, indriver, onibus, metro, trem, cptm, bilhete unico, brt, vlt,\npassagem, estacionamento, estapar, zona azul, pedagio, sem parar, conectcar, veloe, move mais, autopass,\nrecarga transporte, ipva, licenciamento, detran, multa transito, oficina, mecanico, borracharia,\nlava jato, lavagem, pneu, revisao carro, seguro auto, bike itau, tembici, patinete\n\n[despesa: Moradia | Casa | Contas]\naluguel, condominio, iptu, imobiliaria, quintoandar, quinto andar, financiamento imovel, prestacao casa,\ndiarista, faxina, reforma, material de construcao, leroy merlin, telhanorte, madeira madeira,\ntok stok, etna, camicado, mobly\n\n[despesa: Contas | Moradia | Casa]\nluz, energia, conta de luz, enel, cemig, copel, cpfl, light energia, celesc, coelba, celpe, cosern, equatorial,\nenergisa, neoenergia, rge, agua, conta de agua, sabesp, copasa, sanepar, cedae, caesb, embasa, compesa,\ncagece, saneago, corsan, casan, gas, comgas, naturgy, ultragaz, liquigas, supergasbras, internet,\nbanda larga, vivo fibra, claro net, net virtua, oi fibra, tim live, telefone, celular, recarga celular,\nvivo, claro, tim, oi fibra, oi celular\n\n[despesa: Assinaturas | Lazer]\nnetflix, spotify, disney, disney plus, hbo, hbo max, prime video, amazon prime, globoplay, paramount,\nstar plus, apple tv, apple music, deezer, youtube premium, youtube music, crunchyroll, mubi, telecine,\nxbox game pass, game pass, playstation plus, psn, nintendo, steam, icloud, google one, dropbox,\nmicrosoft 365, office 365, chatgpt, canva, assinatura, mensalidade app\n\n[despesa: Saúde]\nfarmacia, drogaria, drogasil, droga raia, raia, pague menos, panvel, pacheco, sao joao, venancio,\naraujo, nissei, onofre, ultrafarma, remedio, medicamento, consulta, medico, dentista, odonto,\nodontologia, exame, laboratorio, fleury, dasa, hermes pardini, sabin, clinica, hospital, pronto socorro,\npsicologo, terapia, fisioterapia, plano de saude, unimed, amil, bradesco saude, sulamerica, hapvida,\nnotredame, intermedica, prevent senior, porto saude, otica, oculos, lente\n\n[despesa: Academia | Saúde | Lazer]\nacademia, smart fit, smartfit, bluefit, bodytech, selfit, crossfit, pilates, yoga, gympass, wellhub, totalpass\n\n[despesa: Educação]\nescola, colegio, faculdade, universidade, mensalidade escolar, curso, cursinho, matricula, material escolar,\nlivraria, livro, apostila, udemy, alura, coursera, duolingo, ingles, idiomas, wizard, ccaa, fisk, cna,\nkumon, rematricula, uniforme escolar\n\n[despesa: Pets | Animais | Outros]\npetshop, pet shop, petz, cobasi, petlove, racao, veterinario, vet, banho e tosa\n\n[despesa: Vestuário | Compras | Outros]\nroupa, roupas, calcado, calcados, sapato, tenis, renner, riachuelo, marisa, zara, hering,\ncentauro, decathlon, netshoes, shein, havaianas, arezzo, youcom\n\n[despesa: Compras | Outros]\namazon, mercado livre, mercadolivre, magalu, magazine luiza, americanas, casas bahia, shopee,\naliexpress, kabum, fast shop, ponto frio\n\n[despesa: Beleza | Cuidados pessoais | Saúde]\nsalao, cabeleireiro, barbearia, barbeiro, manicure, depilacao, estetica, boticario, o boticario,\nnatura, sephora, avon, eudora, perfumaria\n\n[despesa: Lazer]\ncinema, cinemark, cinepolis, kinoplex, uci, teatro, show, ingresso, ingressos, sympla, eventim,\nticketmaster, parque, clube, viagem, hotel, pousada, airbnb, booking, decolar, passagem aerea, latam,\ngol linhas aereas, azul linhas aereas, cvc, hurb, jogo, game, praia, passeio, festa, balada\n\n[despesa: Impostos | Taxas | Outros]\nimposto, irpf, darf, das mei, inss, iof, tarifa bancaria, tarifa, anuidade, taxa, juros,\ncartorio, despachante\n\n[despesa: Presentes | Doações | Outros]\npresente, doacao, dizimo, oferta, vaquinha\n\n# ---------------------------------------------------------------- RECEITAS\n\n[receita: Salário]\nsalario, salario mensal, folha, folha de pagamento, holerite, adiantamento salarial, vale, 13o, decimo terceiro,\nferias, plr, participacao nos lucros, pro labore, prolabore\n\n[receita: Investimentos]\nrendimento, rendimentos, dividendo, dividendos, jcp, juros sobre capital, cdb, lci, lca, tesouro direto,\ntesouro, poupanca, resgate, fii, fundo imobiliario, cashback\n\n[receita: Extra | Outros]\nfreela, freelance, bico, venda, vendi, comissao, gorjeta, reembolso, premio, restituicao, aluguel recebido,\nservico prestado, uber motorista, 99 motorista, ifood entregador\n";
  var LICENSES = { "licenca/LICENSE.txt": `                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.

                            Preamble

  The GNU General Public License is a free, copyleft license for
software and other kinds of works.

  The licenses for most software and other practical works are designed
to take away your freedom to share and change the works.  By contrast,
the GNU General Public License is intended to guarantee your freedom to
share and change all versions of a program--to make sure it remains free
software for all its users.  We, the Free Software Foundation, use the
GNU General Public License for most of our software; it applies also to
any other work released this way by its authors.  You can apply it to
your programs, too.

  When we speak of free software, we are referring to freedom, not
price.  Our General Public Licenses are designed to make sure that you
have the freedom to distribute copies of free software (and charge for
them if you wish), that you receive source code or can get it if you
want it, that you can change the software or use pieces of it in new
free programs, and that you know you can do these things.

  To protect your rights, we need to prevent others from denying you
these rights or asking you to surrender the rights.  Therefore, you have
certain responsibilities if you distribute copies of the software, or if
you modify it: responsibilities to respect the freedom of others.

  For example, if you distribute copies of such a program, whether
gratis or for a fee, you must pass on to the recipients the same
freedoms that you received.  You must make sure that they, too, receive
or can get the source code.  And you must show them these terms so they
know their rights.

  Developers that use the GNU GPL protect your rights with two steps:
(1) assert copyright on the software, and (2) offer you this License
giving you legal permission to copy, distribute and/or modify it.

  For the developers' and authors' protection, the GPL clearly explains
that there is no warranty for this free software.  For both users' and
authors' sake, the GPL requires that modified versions be marked as
changed, so that their problems will not be attributed erroneously to
authors of previous versions.

  Some devices are designed to deny users access to install or run
modified versions of the software inside them, although the manufacturer
can do so.  This is fundamentally incompatible with the aim of
protecting users' freedom to change the software.  The systematic
pattern of such abuse occurs in the area of products for individuals to
use, which is precisely where it is most unacceptable.  Therefore, we
have designed this version of the GPL to prohibit the practice for those
products.  If such problems arise substantially in other domains, we
stand ready to extend this provision to those domains in future versions
of the GPL, as needed to protect the freedom of users.

  Finally, every program is threatened constantly by software patents.
States should not allow patents to restrict development and use of
software on general-purpose computers, but in those that do, we wish to
avoid the special danger that patents applied to a free program could
make it effectively proprietary.  To prevent this, the GPL assures that
patents cannot be used to render the program non-free.

  The precise terms and conditions for copying, distribution and
modification follow.

                       TERMS AND CONDITIONS

  0. Definitions.

  "This License" refers to version 3 of the GNU General Public License.

  "Copyright" also means copyright-like laws that apply to other kinds of
works, such as semiconductor masks.

  "The Program" refers to any copyrightable work licensed under this
License.  Each licensee is addressed as "you".  "Licensees" and
"recipients" may be individuals or organizations.

  To "modify" a work means to copy from or adapt all or part of the work
in a fashion requiring copyright permission, other than the making of an
exact copy.  The resulting work is called a "modified version" of the
earlier work or a work "based on" the earlier work.

  A "covered work" means either the unmodified Program or a work based
on the Program.

  To "propagate" a work means to do anything with it that, without
permission, would make you directly or secondarily liable for
infringement under applicable copyright law, except executing it on a
computer or modifying a private copy.  Propagation includes copying,
distribution (with or without modification), making available to the
public, and in some countries other activities as well.

  To "convey" a work means any kind of propagation that enables other
parties to make or receive copies.  Mere interaction with a user through
a computer network, with no transfer of a copy, is not conveying.

  An interactive user interface displays "Appropriate Legal Notices"
to the extent that it includes a convenient and prominently visible
feature that (1) displays an appropriate copyright notice, and (2)
tells the user that there is no warranty for the work (except to the
extent that warranties are provided), that licensees may convey the
work under this License, and how to view a copy of this License.  If
the interface presents a list of user commands or options, such as a
menu, a prominent item in the list meets this criterion.

  1. Source Code.

  The "source code" for a work means the preferred form of the work
for making modifications to it.  "Object code" means any non-source
form of a work.

  A "Standard Interface" means an interface that either is an official
standard defined by a recognized standards body, or, in the case of
interfaces specified for a particular programming language, one that
is widely used among developers working in that language.

  The "System Libraries" of an executable work include anything, other
than the work as a whole, that (a) is included in the normal form of
packaging a Major Component, but which is not part of that Major
Component, and (b) serves only to enable use of the work with that
Major Component, or to implement a Standard Interface for which an
implementation is available to the public in source code form.  A
"Major Component", in this context, means a major essential component
(kernel, window system, and so on) of the specific operating system
(if any) on which the executable work runs, or a compiler used to
produce the work, or an object code interpreter used to run it.

  The "Corresponding Source" for a work in object code form means all
the source code needed to generate, install, and (for an executable
work) run the object code and to modify the work, including scripts to
control those activities.  However, it does not include the work's
System Libraries, or general-purpose tools or generally available free
programs which are used unmodified in performing those activities but
which are not part of the work.  For example, Corresponding Source
includes interface definition files associated with source files for
the work, and the source code for shared libraries and dynamically
linked subprograms that the work is specifically designed to require,
such as by intimate data communication or control flow between those
subprograms and other parts of the work.

  The Corresponding Source need not include anything that users
can regenerate automatically from other parts of the Corresponding
Source.

  The Corresponding Source for a work in source code form is that
same work.

  2. Basic Permissions.

  All rights granted under this License are granted for the term of
copyright on the Program, and are irrevocable provided the stated
conditions are met.  This License explicitly affirms your unlimited
permission to run the unmodified Program.  The output from running a
covered work is covered by this License only if the output, given its
content, constitutes a covered work.  This License acknowledges your
rights of fair use or other equivalent, as provided by copyright law.

  You may make, run and propagate covered works that you do not
convey, without conditions so long as your license otherwise remains
in force.  You may convey covered works to others for the sole purpose
of having them make modifications exclusively for you, or provide you
with facilities for running those works, provided that you comply with
the terms of this License in conveying all material for which you do
not control copyright.  Those thus making or running the covered works
for you must do so exclusively on your behalf, under your direction
and control, on terms that prohibit them from making any copies of
your copyrighted material outside their relationship with you.

  Conveying under any other circumstances is permitted solely under
the conditions stated below.  Sublicensing is not allowed; section 10
makes it unnecessary.

  3. Protecting Users' Legal Rights From Anti-Circumvention Law.

  No covered work shall be deemed part of an effective technological
measure under any applicable law fulfilling obligations under article
11 of the WIPO copyright treaty adopted on 20 December 1996, or
similar laws prohibiting or restricting circumvention of such
measures.

  When you convey a covered work, you waive any legal power to forbid
circumvention of technological measures to the extent such circumvention
is effected by exercising rights under this License with respect to
the covered work, and you disclaim any intention to limit operation or
modification of the work as a means of enforcing, against the work's
users, your or third parties' legal rights to forbid circumvention of
technological measures.

  4. Conveying Verbatim Copies.

  You may convey verbatim copies of the Program's source code as you
receive it, in any medium, provided that you conspicuously and
appropriately publish on each copy an appropriate copyright notice;
keep intact all notices stating that this License and any
non-permissive terms added in accord with section 7 apply to the code;
keep intact all notices of the absence of any warranty; and give all
recipients a copy of this License along with the Program.

  You may charge any price or no price for each copy that you convey,
and you may offer support or warranty protection for a fee.

  5. Conveying Modified Source Versions.

  You may convey a work based on the Program, or the modifications to
produce it from the Program, in the form of source code under the
terms of section 4, provided that you also meet all of these conditions:

    a) The work must carry prominent notices stating that you modified
    it, and giving a relevant date.

    b) The work must carry prominent notices stating that it is
    released under this License and any conditions added under section
    7.  This requirement modifies the requirement in section 4 to
    "keep intact all notices".

    c) You must license the entire work, as a whole, under this
    License to anyone who comes into possession of a copy.  This
    License will therefore apply, along with any applicable section 7
    additional terms, to the whole of the work, and all its parts,
    regardless of how they are packaged.  This License gives no
    permission to license the work in any other way, but it does not
    invalidate such permission if you have separately received it.

    d) If the work has interactive user interfaces, each must display
    Appropriate Legal Notices; however, if the Program has interactive
    interfaces that do not display Appropriate Legal Notices, your
    work need not make them do so.

  A compilation of a covered work with other separate and independent
works, which are not by their nature extensions of the covered work,
and which are not combined with it such as to form a larger program,
in or on a volume of a storage or distribution medium, is called an
"aggregate" if the compilation and its resulting copyright are not
used to limit the access or legal rights of the compilation's users
beyond what the individual works permit.  Inclusion of a covered work
in an aggregate does not cause this License to apply to the other
parts of the aggregate.

  6. Conveying Non-Source Forms.

  You may convey a covered work in object code form under the terms
of sections 4 and 5, provided that you also convey the
machine-readable Corresponding Source under the terms of this License,
in one of these ways:

    a) Convey the object code in, or embodied in, a physical product
    (including a physical distribution medium), accompanied by the
    Corresponding Source fixed on a durable physical medium
    customarily used for software interchange.

    b) Convey the object code in, or embodied in, a physical product
    (including a physical distribution medium), accompanied by a
    written offer, valid for at least three years and valid for as
    long as you offer spare parts or customer support for that product
    model, to give anyone who possesses the object code either (1) a
    copy of the Corresponding Source for all the software in the
    product that is covered by this License, on a durable physical
    medium customarily used for software interchange, for a price no
    more than your reasonable cost of physically performing this
    conveying of source, or (2) access to copy the
    Corresponding Source from a network server at no charge.

    c) Convey individual copies of the object code with a copy of the
    written offer to provide the Corresponding Source.  This
    alternative is allowed only occasionally and noncommercially, and
    only if you received the object code with such an offer, in accord
    with subsection 6b.

    d) Convey the object code by offering access from a designated
    place (gratis or for a charge), and offer equivalent access to the
    Corresponding Source in the same way through the same place at no
    further charge.  You need not require recipients to copy the
    Corresponding Source along with the object code.  If the place to
    copy the object code is a network server, the Corresponding Source
    may be on a different server (operated by you or a third party)
    that supports equivalent copying facilities, provided you maintain
    clear directions next to the object code saying where to find the
    Corresponding Source.  Regardless of what server hosts the
    Corresponding Source, you remain obligated to ensure that it is
    available for as long as needed to satisfy these requirements.

    e) Convey the object code using peer-to-peer transmission, provided
    you inform other peers where the object code and Corresponding
    Source of the work are being offered to the general public at no
    charge under subsection 6d.

  A separable portion of the object code, whose source code is excluded
from the Corresponding Source as a System Library, need not be
included in conveying the object code work.

  A "User Product" is either (1) a "consumer product", which means any
tangible personal property which is normally used for personal, family,
or household purposes, or (2) anything designed or sold for incorporation
into a dwelling.  In determining whether a product is a consumer product,
doubtful cases shall be resolved in favor of coverage.  For a particular
product received by a particular user, "normally used" refers to a
typical or common use of that class of product, regardless of the status
of the particular user or of the way in which the particular user
actually uses, or expects or is expected to use, the product.  A product
is a consumer product regardless of whether the product has substantial
commercial, industrial or non-consumer uses, unless such uses represent
the only significant mode of use of the product.

  "Installation Information" for a User Product means any methods,
procedures, authorization keys, or other information required to install
and execute modified versions of a covered work in that User Product from
a modified version of its Corresponding Source.  The information must
suffice to ensure that the continued functioning of the modified object
code is in no case prevented or interfered with solely because
modification has been made.

  If you convey an object code work under this section in, or with, or
specifically for use in, a User Product, and the conveying occurs as
part of a transaction in which the right of possession and use of the
User Product is transferred to the recipient in perpetuity or for a
fixed term (regardless of how the transaction is characterized), the
Corresponding Source conveyed under this section must be accompanied
by the Installation Information.  But this requirement does not apply
if neither you nor any third party retains the ability to install
modified object code on the User Product (for example, the work has
been installed in ROM).

  The requirement to provide Installation Information does not include a
requirement to continue to provide support service, warranty, or updates
for a work that has been modified or installed by the recipient, or for
the User Product in which it has been modified or installed.  Access to a
network may be denied when the modification itself materially and
adversely affects the operation of the network or violates the rules and
protocols for communication across the network.

  Corresponding Source conveyed, and Installation Information provided,
in accord with this section must be in a format that is publicly
documented (and with an implementation available to the public in
source code form), and must require no special password or key for
unpacking, reading or copying.

  7. Additional Terms.

  "Additional permissions" are terms that supplement the terms of this
License by making exceptions from one or more of its conditions.
Additional permissions that are applicable to the entire Program shall
be treated as though they were included in this License, to the extent
that they are valid under applicable law.  If additional permissions
apply only to part of the Program, that part may be used separately
under those permissions, but the entire Program remains governed by
this License without regard to the additional permissions.

  When you convey a copy of a covered work, you may at your option
remove any additional permissions from that copy, or from any part of
it.  (Additional permissions may be written to require their own
removal in certain cases when you modify the work.)  You may place
additional permissions on material, added by you to a covered work,
for which you have or can give appropriate copyright permission.

  Notwithstanding any other provision of this License, for material you
add to a covered work, you may (if authorized by the copyright holders of
that material) supplement the terms of this License with terms:

    a) Disclaiming warranty or limiting liability differently from the
    terms of sections 15 and 16 of this License; or

    b) Requiring preservation of specified reasonable legal notices or
    author attributions in that material or in the Appropriate Legal
    Notices displayed by works containing it; or

    c) Prohibiting misrepresentation of the origin of that material, or
    requiring that modified versions of such material be marked in
    reasonable ways as different from the original version; or

    d) Limiting the use for publicity purposes of names of licensors or
    authors of the material; or

    e) Declining to grant rights under trademark law for use of some
    trade names, trademarks, or service marks; or

    f) Requiring indemnification of licensors and authors of that
    material by anyone who conveys the material (or modified versions of
    it) with contractual assumptions of liability to the recipient, for
    any liability that these contractual assumptions directly impose on
    those licensors and authors.

  All other non-permissive additional terms are considered "further
restrictions" within the meaning of section 10.  If the Program as you
received it, or any part of it, contains a notice stating that it is
governed by this License along with a term that is a further
restriction, you may remove that term.  If a license document contains
a further restriction but permits relicensing or conveying under this
License, you may add to a covered work material governed by the terms
of that license document, provided that the further restriction does
not survive such relicensing or conveying.

  If you add terms to a covered work in accord with this section, you
must place, in the relevant source files, a statement of the
additional terms that apply to those files, or a notice indicating
where to find the applicable terms.

  Additional terms, permissive or non-permissive, may be stated in the
form of a separately written license, or stated as exceptions;
the above requirements apply either way.

  8. Termination.

  You may not propagate or modify a covered work except as expressly
provided under this License.  Any attempt otherwise to propagate or
modify it is void, and will automatically terminate your rights under
this License (including any patent licenses granted under the third
paragraph of section 11).

  However, if you cease all violation of this License, then your
license from a particular copyright holder is reinstated (a)
provisionally, unless and until the copyright holder explicitly and
finally terminates your license, and (b) permanently, if the copyright
holder fails to notify you of the violation by some reasonable means
prior to 60 days after the cessation.

  Moreover, your license from a particular copyright holder is
reinstated permanently if the copyright holder notifies you of the
violation by some reasonable means, this is the first time you have
received notice of violation of this License (for any work) from that
copyright holder, and you cure the violation prior to 30 days after
your receipt of the notice.

  Termination of your rights under this section does not terminate the
licenses of parties who have received copies or rights from you under
this License.  If your rights have been terminated and not permanently
reinstated, you do not qualify to receive new licenses for the same
material under section 10.

  9. Acceptance Not Required for Having Copies.

  You are not required to accept this License in order to receive or
run a copy of the Program.  Ancillary propagation of a covered work
occurring solely as a consequence of using peer-to-peer transmission
to receive a copy likewise does not require acceptance.  However,
nothing other than this License grants you permission to propagate or
modify any covered work.  These actions infringe copyright if you do
not accept this License.  Therefore, by modifying or propagating a
covered work, you indicate your acceptance of this License to do so.

  10. Automatic Licensing of Downstream Recipients.

  Each time you convey a covered work, the recipient automatically
receives a license from the original licensors, to run, modify and
propagate that work, subject to this License.  You are not responsible
for enforcing compliance by third parties with this License.

  An "entity transaction" is a transaction transferring control of an
organization, or substantially all assets of one, or subdividing an
organization, or merging organizations.  If propagation of a covered
work results from an entity transaction, each party to that
transaction who receives a copy of the work also receives whatever
licenses to the work the party's predecessor in interest had or could
give under the previous paragraph, plus a right to possession of the
Corresponding Source of the work from the predecessor in interest, if
the predecessor has it or can get it with reasonable efforts.

  You may not impose any further restrictions on the exercise of the
rights granted or affirmed under this License.  For example, you may
not impose a license fee, royalty, or other charge for exercise of
rights granted under this License, and you may not initiate litigation
(including a cross-claim or counterclaim in a lawsuit) alleging that
any patent claim is infringed by making, using, selling, offering for
sale, or importing the Program or any portion of it.

  11. Patents.

  A "contributor" is a copyright holder who authorizes use under this
License of the Program or a work on which the Program is based.  The
work thus licensed is called the contributor's "contributor version".

  A contributor's "essential patent claims" are all patent claims
owned or controlled by the contributor, whether already acquired or
hereafter acquired, that would be infringed by some manner, permitted
by this License, of making, using, or selling its contributor version,
but do not include claims that would be infringed only as a
consequence of further modification of the contributor version.  For
purposes of this definition, "control" includes the right to grant
patent sublicenses in a manner consistent with the requirements of
this License.

  Each contributor grants you a non-exclusive, worldwide, royalty-free
patent license under the contributor's essential patent claims, to
make, use, sell, offer for sale, import and otherwise run, modify and
propagate the contents of its contributor version.

  In the following three paragraphs, a "patent license" is any express
agreement or commitment, however denominated, not to enforce a patent
(such as an express permission to practice a patent or covenant not to
sue for patent infringement).  To "grant" such a patent license to a
party means to make such an agreement or commitment not to enforce a
patent against the party.

  If you convey a covered work, knowingly relying on a patent license,
and the Corresponding Source of the work is not available for anyone
to copy, free of charge and under the terms of this License, through a
publicly available network server or other readily accessible means,
then you must either (1) cause the Corresponding Source to be so
available, or (2) arrange to deprive yourself of the benefit of the
patent license for this particular work, or (3) arrange, in a manner
consistent with the requirements of this License, to extend the patent
license to downstream recipients.  "Knowingly relying" means you have
actual knowledge that, but for the patent license, your conveying the
covered work in a country, or your recipient's use of the covered work
in a country, would infringe one or more identifiable patents in that
country that you have reason to believe are valid.

  If, pursuant to or in connection with a single transaction or
arrangement, you convey, or propagate by procuring conveyance of, a
covered work, and grant a patent license to some of the parties
receiving the covered work authorizing them to use, propagate, modify
or convey a specific copy of the covered work, then the patent license
you grant is automatically extended to all recipients of the covered
work and works based on it.

  A patent license is "discriminatory" if it does not include within
the scope of its coverage, prohibits the exercise of, or is
conditioned on the non-exercise of one or more of the rights that are
specifically granted under this License.  You may not convey a covered
work if you are a party to an arrangement with a third party that is
in the business of distributing software, under which you make payment
to the third party based on the extent of your activity of conveying
the work, and under which the third party grants, to any of the
parties who would receive the covered work from you, a discriminatory
patent license (a) in connection with copies of the covered work
conveyed by you (or copies made from those copies), or (b) primarily
for and in connection with specific products or compilations that
contain the covered work, unless you entered into that arrangement,
or that patent license was granted, prior to 28 March 2007.

  Nothing in this License shall be construed as excluding or limiting
any implied license or other defenses to infringement that may
otherwise be available to you under applicable patent law.

  12. No Surrender of Others' Freedom.

  If conditions are imposed on you (whether by court order, agreement or
otherwise) that contradict the conditions of this License, they do not
excuse you from the conditions of this License.  If you cannot convey a
covered work so as to satisfy simultaneously your obligations under this
License and any other pertinent obligations, then as a consequence you may
not convey it at all.  For example, if you agree to terms that obligate you
to collect a royalty for further conveying from those to whom you convey
the Program, the only way you could satisfy both those terms and this
License would be to refrain entirely from conveying the Program.

  13. Use with the GNU Affero General Public License.

  Notwithstanding any other provision of this License, you have
permission to link or combine any covered work with a work licensed
under version 3 of the GNU Affero General Public License into a single
combined work, and to convey the resulting work.  The terms of this
License will continue to apply to the part which is the covered work,
but the special requirements of the GNU Affero General Public License,
section 13, concerning interaction through a network will apply to the
combination as such.

  14. Revised Versions of this License.

  The Free Software Foundation may publish revised and/or new versions of
the GNU General Public License from time to time.  Such new versions will
be similar in spirit to the present version, but may differ in detail to
address new problems or concerns.

  Each version is given a distinguishing version number.  If the
Program specifies that a certain numbered version of the GNU General
Public License "or any later version" applies to it, you have the
option of following the terms and conditions either of that numbered
version or of any later version published by the Free Software
Foundation.  If the Program does not specify a version number of the
GNU General Public License, you may choose any version ever published
by the Free Software Foundation.

  If the Program specifies that a proxy can decide which future
versions of the GNU General Public License can be used, that proxy's
public statement of acceptance of a version permanently authorizes you
to choose that version for the Program.

  Later license versions may give you additional or different
permissions.  However, no additional obligations are imposed on any
author or copyright holder as a result of your choosing to follow a
later version.

  15. Disclaimer of Warranty.

  THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY
APPLICABLE LAW.  EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT
HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY
OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE.  THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM
IS WITH YOU.  SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF
ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

  16. Limitation of Liability.

  IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING
WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS
THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY
GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE
USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF
DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD
PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS),
EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF
SUCH DAMAGES.

  17. Interpretation of Sections 15 and 16.

  If the disclaimer of warranty and limitation of liability provided
above cannot be given local legal effect according to their terms,
reviewing courts shall apply local law that most closely approximates
an absolute waiver of all civil liability in connection with the
Program, unless a warranty or assumption of liability accompanies a
copy of the Program in return for a fee.

                     END OF TERMS AND CONDITIONS

            How to Apply These Terms to Your New Programs

  If you develop a new program, and you want it to be of the greatest
possible use to the public, the best way to achieve this is to make it
free software which everyone can redistribute and change under these terms.

  To do so, attach the following notices to the program.  It is safest
to attach them to the start of each source file to most effectively
state the exclusion of warranty; and each file should have at least
the "copyright" line and a pointer to where the full notice is found.

    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) <year>  <name of author>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

Also add information on how to contact you by electronic and paper mail.

  If the program does terminal interaction, make it output a short
notice like this when it starts in an interactive mode:

    <program>  Copyright (C) <year>  <name of author>
    This program comes with ABSOLUTELY NO WARRANTY; for details type \`show w'.
    This is free software, and you are welcome to redistribute it
    under certain conditions; type \`show c' for details.

The hypothetical commands \`show w' and \`show c' should show the appropriate
parts of the General Public License.  Of course, your program's commands
might be different; for a GUI interface, you would use an "about box".

  You should also get your employer (if you work as a programmer) or school,
if any, to sign a "copyright disclaimer" for the program, if necessary.
For more information on this, and how to apply and follow the GNU GPL, see
<https://www.gnu.org/licenses/>.

  The GNU General Public License does not permit incorporating your program
into proprietary programs.  If your program is a subroutine library, you
may consider it more useful to permit linking proprietary applications with
the library.  If this is what you want to do, use the GNU Lesser General
Public License instead of this License.  But first, please read
<https://www.gnu.org/licenses/why-not-lgpl.html>.
`, "licenca/APACHE-2.0.txt": `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
` };

  // js/store.js
  var store_exports = {};
  __export(store_exports, {
    ConflictError: () => ConflictError,
    DB_NAME: () => DB_NAME,
    DEVICE_DEFAULTS: () => DEVICE_DEFAULTS,
    PIN_ITERATIONS: () => PIN_ITERATIONS,
    Store: () => Store,
    Throttle: () => Throttle,
    hashPin: () => hashPin,
    loadDevice: () => loadDevice,
    pinValidFormat: () => pinValidFormat,
    saveDevice: () => saveDevice,
    verifyPin: () => verifyPin,
    wipeDevice: () => wipeDevice
  });
  var DB_NAME = "finan-plus";
  var DB_VERSION = 1;
  var LS_PLAIN = "finanplus_plain";
  var LS_DEVICE = "finanplus_device";
  var LEGACY = ["mf_v2", "mf_txs"];
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  function b64e(u) {
    let s = "";
    for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(s);
  }
  var hasCrypto = () => typeof crypto !== "undefined" && !!crypto.subtle && typeof crypto.getRandomValues === "function";
  var hasIdb = () => typeof indexedDB !== "undefined";
  var ls = () => {
    try {
      return globalThis.localStorage || null;
    } catch {
      return null;
    }
  };
  function openDb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error("Banco de dados bloqueado por outra aba"));
    });
  }
  var reqP = (r) => new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  async function idbGet(db, k) {
    return reqP(db.transaction("kv").objectStore("kv").get(k));
  }
  function idbTx(db, fn) {
    return new Promise((res, rej) => {
      const t = db.transaction("kv", "readwrite");
      fn(t.objectStore("kv"));
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error("Gravação cancelada"));
    });
  }
  async function encrypt(key, text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode("finan-plus/v1") }, key, enc.encode(text));
    return { v: 1, iv, ct: new Uint8Array(ct), savedAt: Date.now() };
  }
  async function decrypt(key, box) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: box.iv, additionalData: enc.encode("finan-plus/v1") }, key, box.ct);
    return dec.decode(pt);
  }
  var ConflictError = class extends Error {
  };
  var newRev = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
  var _Store_instances, problem_fn, ensureKey_fn, verify_fn, cleanupPlain_fn;
  var Store = class {
    constructor() {
      __privateAdd(this, _Store_instances);
      this.db = null;
      this.key = null;
      this.mode = "none";
      this.locked = false;
      this.noDb = false;
      this.queue = Promise.resolve();
      this.savedAt = 0;
      this.rev = void 0;
    }
    get encrypted() {
      return this.mode === "idb";
    }
    async open() {
      const legacy = readLegacy();
      if (hasCrypto() && hasIdb()) {
        let dbErr = null;
        try {
          this.db = await openDb();
        } catch (e) {
          dbErr = e;
        }
        if (dbErr && globalThis.location?.protocol === "file:") this.db = null;
        else if (dbErr) {
          const e = dbErr;
          this.noDb = true;
          return __privateMethod(this, _Store_instances, problem_fn).call(this, "O navegador não permitiu abrir o armazenamento local (IndexedDB). Feche outras abas do Finan+ e recarregue a página. (" + (e?.message || e) + ")");
        }
        if (this.db) try {
          this.mode = "idb";
          let box = await idbGet(this.db, "data");
          let key = await idbGet(this.db, "key");
          if (box && !key) return __privateMethod(this, _Store_instances, problem_fn).call(this, "A chave que protege seus dados não foi encontrada neste navegador.");
          if (box) {
            let text;
            try {
              text = await decrypt(key, box);
            } catch {
              const prev = await idbGet(this.db, "previous");
              if (prev) {
                try {
                  text = await decrypt(key, prev);
                  box = prev;
                } catch {
                }
              }
              if (text == null) return __privateMethod(this, _Store_instances, problem_fn).call(this, "Os dados salvos não puderam ser abertos com a chave deste navegador.");
            }
            const cur = await idbGet(this.db, "data");
            this.key = key;
            this.savedAt = box.savedAt || 0;
            this.rev = cur?.rev;
            const n = normalize(JSON.parse(text));
            return { status: "ok", state: n.state, dropped: n.droppedTotal };
          }
          this.key = key || await __privateMethod(this, _Store_instances, ensureKey_fn).call(this);
          const plain2 = readPlain() ?? legacy;
          if (plain2) {
            const n = normalize(plain2.raw);
            await this.save(n.state);
            await __privateMethod(this, _Store_instances, verify_fn).call(this);
            __privateMethod(this, _Store_instances, cleanupPlain_fn).call(this, true);
            return { status: "ok", state: n.state, dropped: n.droppedTotal, migrated: plain2.from, legacyPin: plain2.pin };
          }
          return { status: "new", state: newState() };
        } catch (e) {
          return __privateMethod(this, _Store_instances, problem_fn).call(this, "Não foi possível ler o armazenamento do navegador: " + (e?.message || e));
        }
      }
      this.mode = ls() ? "plain" : "none";
      const plain = readPlain() ?? legacy;
      if (plain) {
        const n = normalize(plain.raw);
        return { status: "ok", state: n.state, dropped: n.droppedTotal, migrated: plain.from === LS_PLAIN ? null : plain.from, legacyPin: plain.pin };
      }
      return { status: "new", state: newState() };
    }
    /** relê os dados gravados (outra aba salvou). Devolve o estado. */
    async reload() {
      if (this.mode !== "idb") {
        const p = readPlain();
        return p ? normalize(p.raw).state : newState();
      }
      const key = await idbGet(this.db, "key"), box = await idbGet(this.db, "data");
      if (!box) {
        this.key = key || this.key;
        this.rev = void 0;
        return newState();
      }
      const text = await decrypt(key, box);
      const n = normalize(JSON.parse(text));
      this.key = key;
      this.rev = box.rev;
      this.savedAt = box.savedAt || 0;
      return n.state;
    }
    close() {
      try {
        this.db?.close();
      } catch {
      }
    }
    /** grava o estado (em fila: gravações nunca se sobrepõem) */
    save(state) {
      const json = toJson(state);
      const job = this.queue.then(async () => {
        if (this.locked) throw new Error("Os dados não foram abertos; nada foi gravado.");
        if (this.mode === "idb") {
          const box = await encrypt(this.key, json);
          box.rev = newRev();
          await new Promise((res, rej) => {
            const t = this.db.transaction("kv", "readwrite"), st = t.objectStore("kv");
            let conflict = false;
            const g = st.get("data");
            g.onsuccess = () => {
              const cur = g.result;
              if (cur && cur.rev !== this.rev) {
                conflict = true;
                t.abort();
                return;
              }
              if (cur) st.put(cur, "previous");
              st.put(box, "data");
            };
            t.oncomplete = () => res();
            t.onabort = () => rej(conflict ? new ConflictError("Os dados foram alterados em outra aba.") : t.error || new Error("Gravação cancelada"));
            t.onerror = (e) => {
              if (conflict) e.preventDefault();
            };
          });
          this.savedAt = box.savedAt;
          this.rev = box.rev;
        } else if (this.mode === "plain") {
          ls().setItem(LS_PLAIN, json);
          this.savedAt = Date.now();
        } else throw new Error("Este navegador não permite guardar dados.");
      });
      this.queue = job.catch(() => {
      });
      return job;
    }
    /** "Começar do zero" na tela de problema: guarda os dados ilegíveis à parte (nada é apagado) e cria chave nova */
    async startOver() {
      if (this.noDb) {
        this.mode = ls() ? "plain" : "none";
        this.locked = false;
        return;
      }
      if (this.mode !== "idb") {
        this.locked = false;
        return;
      }
      const box = await idbGet(this.db, "data"), prev = await idbGet(this.db, "previous"), oldKey = await idbGet(this.db, "key");
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      await idbTx(this.db, (s) => {
        s.put({ data: box || null, previous: prev || null, key: oldKey || null, at: Date.now() }, "unreadable-" + Date.now());
        s.delete("data");
        s.delete("previous");
        s.put(key, "key");
      });
      this.key = key;
      this.locked = false;
      this.rev = void 0;
    }
    /** dados cifrados ilegíveis, para o usuário guardar (tela de problema) */
    async unreadableExport() {
      if (!this.db) return null;
      const box = await idbGet(this.db, "data");
      if (!box) return null;
      return JSON.stringify({ finanPlusEncrypted: 1, alg: "AES-GCM-256", iv: b64e(box.iv), ct: b64e(box.ct), savedAt: box.savedAt });
    }
    /** Apagar tudo: dados, versão anterior e chave (uma chave nova é criada na próxima gravação) */
    async wipe() {
      const l = ls();
      if (l) try {
        l.removeItem(LS_PLAIN);
        for (const k of LEGACY) l.removeItem(k);
      } catch {
      }
      if (this.mode === "idb") {
        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        await idbTx(this.db, (s) => {
          s.clear();
          s.put(key, "key");
        });
        this.key = key;
        this.rev = void 0;
      }
    }
    /** pede ao navegador para não apagar os dados quando faltar espaço */
    static async persist() {
      try {
        return navigator.storage?.persist ? await navigator.storage.persist() : false;
      } catch {
        return false;
      }
    }
  };
  _Store_instances = new WeakSet();
  problem_fn = function(message) {
    this.locked = true;
    return { status: "problem", message, state: newState() };
  };
  ensureKey_fn = async function() {
    const fresh = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return new Promise((res, rej) => {
      const t = this.db.transaction("kv", "readwrite"), st = t.objectStore("kv");
      let key = null;
      const g = st.get("key");
      g.onsuccess = () => {
        if (g.result) key = g.result;
        else {
          key = fresh;
          st.put(fresh, "key");
        }
      };
      t.oncomplete = () => res(key);
      t.onerror = () => rej(t.error);
    });
  };
  verify_fn = async function() {
    const box = await idbGet(this.db, "data");
    const text = await decrypt(this.key, box);
    normalize(JSON.parse(text));
  };
  cleanupPlain_fn = function(all = false) {
    const l = ls();
    if (!l) return;
    try {
      l.removeItem(LS_PLAIN);
      if (all) for (const k of LEGACY) l.removeItem(k);
    } catch {
    }
  };
  function readPlain() {
    const l = ls();
    if (!l) return null;
    try {
      const t = l.getItem(LS_PLAIN);
      if (t) return { raw: JSON.parse(t), from: LS_PLAIN };
    } catch {
    }
    return null;
  }
  function readLegacy() {
    const l = ls();
    if (!l) return null;
    try {
      const o = l.getItem("mf_v2");
      if (o) {
        const raw = JSON.parse(o);
        return { raw, from: "mf_v2", pin: typeof raw?.pin === "string" ? raw.pin : "" };
      }
      const t = l.getItem("mf_txs");
      if (t) return { raw: { txs: JSON.parse(t) }, from: "mf_txs", pin: "" };
    } catch {
    }
    return null;
  }
  var DEVICE_DEFAULTS = {
    pinHash: "",
    notifications: false,
    lastNotified: "",
    assistCategory: true,
    assistTips: true,
    assistAsk: true,
    dismissedTips: [],
    pinFails: 0,
    pinWaitUntil: 0,
    notice: ""
  };
  function loadDevice() {
    const l = ls();
    try {
      const o = l && JSON.parse(l.getItem(LS_DEVICE) || "null");
      if (o && typeof o === "object") return { ...DEVICE_DEFAULTS, ...o, dismissedTips: Array.isArray(o.dismissedTips) ? o.dismissedTips.filter((x) => typeof x === "string").slice(-300) : [] };
    } catch {
    }
    return { ...DEVICE_DEFAULTS, dismissedTips: [] };
  }
  function saveDevice(d) {
    const l = ls();
    try {
      l?.setItem(LS_DEVICE, JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  }
  function wipeDevice() {
    try {
      ls()?.removeItem(LS_DEVICE);
    } catch {
    }
  }
  var PIN_ITERATIONS = 21e4;
  var pinValidFormat = (p) => /^\d{4,8}$/.test(String(p ?? ""));
  var b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function pbkdf2(pin, salt, iterations) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 256));
  }
  var sameBytes = (a, b) => {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
  };
  async function hashPin(pin) {
    if (!hasCrypto()) throw new Error("Este navegador não tem as funções de segurança necessárias para o PIN.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return `pbkdf2-sha256$${PIN_ITERATIONS}$${b64e(salt)}$${b64e(await pbkdf2(pin, salt, PIN_ITERATIONS))}`;
  }
  async function verifyPin(pin, stored) {
    if (!stored) return { ok: false, upgrade: false };
    if (stored.startsWith("pbkdf2-sha256$")) {
      const [, it, salt, hash] = stored.split("$");
      const n = parseInt(it, 10);
      if (!(n >= 1e3 && n <= 1e7)) return { ok: false, upgrade: false };
      return { ok: sameBytes(await pbkdf2(pin, b64d(salt), n), b64d(hash)), upgrade: n < PIN_ITERATIONS };
    }
    if (/^[0-9a-f]{64}$/.test(stored) && hasCrypto()) {
      const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode("mf" + pin)))].map((b) => b.toString(16).padStart(2, "0")).join("");
      return { ok: sameBytes(enc.encode(h), enc.encode(stored)), upgrade: true };
    }
    if (stored.startsWith("p") && /^p\d+$/.test(stored)) return { ok: stored === "p" + pin, upgrade: true };
    return { ok: false, upgrade: false };
  }
  var Throttle = {
    waitSeconds(d, now = Date.now()) {
      return d.pinWaitUntil > now ? Math.ceil((d.pinWaitUntil - now) / 1e3) : 0;
    },
    fail(d, now = Date.now()) {
      const fails = (d.pinFails || 0) + 1;
      return { ...d, pinFails: fails, pinWaitUntil: fails >= 5 ? now + 3e4 * (fails - 4) : 0 };
    },
    reset: (d) => ({ ...d, pinFails: 0, pinWaitUntil: 0 })
  };

  // js/icons.js
  var ICONS = {
    "account-balance": ["0 -960 960 960", "M230-310v-240q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.38 8.62Q290-562.75 290-550v240q0 12.75-8.63 21.38-8.63 8.62-21.38 8.62-12.76 0-21.37-8.62Q230-297.25 230-310Zm220 0v-240q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.37 8.62Q510-562.75 510-550v240q0 12.75-8.63 21.38-8.63 8.62-21.38 8.62-12.76 0-21.37-8.62Q450-297.25 450-310ZM140.77-140q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37 8.62-8.62 21.37-8.62h678.46q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37-8.62 8.62-21.37 8.62H140.77ZM670-310v-240q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.37 8.62Q730-562.75 730-550v240q0 12.75-8.63 21.38-8.63 8.62-21.38 8.62-12.76 0-21.38-8.62Q670-297.25 670-310Zm150.77-350H136.39q-10.68 0-18.15-7.46-7.47-7.45-7.47-18.11v-15.62q0-7.81 3.91-13.47 3.92-5.65 10.32-9.19L448.23-882q14.98-7.23 31.72-7.23t31.82 7.23l321.61 157.15q7.54 3.85 11.69 10.77 4.16 6.93 4.16 14.88v10.84q0 12.28-8.04 20.32-8.04 8.04-20.42 8.04Zm-568.16-60h454.78-454.78Zm0 0h454.78l-222-107.69q-2.7-1.16-5.39-1.16-2.69 0-5.39 1.16L252.61-720Z"],
    "account-balance-wallet": ["0 -960 960 960", "M200-240v40-560 520Zm12.31 100q-29.92 0-51.12-21.19Q140-182.39 140-212.31v-535.38q0-29.92 21.19-51.12Q182.39-820 212.31-820h535.38q29.92 0 51.12 21.19Q820-777.61 820-747.69v108.85h-60v-108.85q0-5.39-3.46-8.85t-8.85-3.46H212.31q-5.39 0-8.85 3.46t-3.46 8.85v535.38q0 5.39 3.46 8.85t8.85 3.46h535.38q5.39 0 8.85-3.46t3.46-8.85v-108.85h60v108.85q0 29.92-21.19 51.12Q777.61-140 747.69-140H212.31Zm320-160q-29.92 0-51.12-21.19Q460-342.39 460-372.31v-215.38q0-29.92 21.19-51.12Q502.39-660 532.31-660h255.38q29.92 0 51.12 21.19Q860-617.61 860-587.69v215.38q0 29.92-21.19 51.12Q817.61-300 787.69-300H532.31Zm255.38-60q5.39 0 8.85-3.46t3.46-8.85v-215.38q0-5.39-3.46-8.85t-8.85-3.46H532.31q-5.39 0-8.85 3.46t-3.46 8.85v215.38q0 5.39 3.46 8.85t8.85 3.46h255.38ZM640-420q25 0 42.5-17.5T700-480q0-25-17.5-42.5T640-540q-25 0-42.5 17.5T580-480q0 25 17.5 42.5T640-420Z"],
    "add": ["0 -960 960 960", "M450-450H250q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q237.25-510 250-510h200v-200q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q510-722.75 510-710v200h200q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q722.75-450 710-450H510v200q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q450-237.25 450-250v-200Z"],
    "arrow-back": ["0 -960 960 960", "m294.92-450 206.77 206.77q8.92 8.92 8.81 20.88-.12 11.96-9.42 21.27-9.31 8.69-21.08 9-11.77.31-21.08-9L205.31-454.69q-5.62-5.62-7.92-11.85-2.31-6.23-2.31-13.46t2.31-13.46q2.3-6.23 7.92-11.85l253.61-253.61q8.31-8.31 20.58-8.5 12.27-.19 21.58 8.5 9.3 9.31 9.3 21.38 0 12.08-9.3 21.39L294.92-510H750q12.77 0 21.38 8.62Q780-492.77 780-480t-8.62 21.38Q762.77-450 750-450H294.92Z"],
    "arrow-downward": ["0 -960 960 960", "M450-294.92V-750q0-12.77 8.62-21.38Q467.23-780 480-780t21.38 8.62Q510-762.77 510-750v455.08l206.77-206.77q8.92-8.92 20.88-8.81 11.96.12 21.27 9.42 8.69 9.31 9 21.08.31 11.77-9 21.08L505.31-205.31q-5.62 5.62-11.85 7.92-6.23 2.31-13.46 2.31t-13.46-2.31q-6.23-2.3-11.85-7.92L201.08-458.92q-8.31-8.31-8.5-20.58-.19-12.27 8.5-21.58 9.31-9.3 21.38-9.3 12.08 0 21.39 9.3L450-294.92Z"],
    "arrow-upward": ["0 -960 960 960", "M450-665.08 243.23-458.31q-8.92 8.92-20.88 8.81-11.96-.12-21.27-9.42-8.69-9.31-9-21.08-.31-11.77 9-21.08l253.61-253.61q5.62-5.62 11.85-7.92 6.23-2.31 13.46-2.31t13.46 2.31q6.23 2.3 11.85 7.92l253.61 253.61q8.31 8.31 8.5 20.58.19 12.27-8.5 21.58-9.31 9.3-21.38 9.3-12.08 0-21.39-9.3L510-665.08V-210q0 12.77-8.62 21.38Q492.77-180 480-180t-21.38-8.62Q450-197.23 450-210v-455.08Z"],
    "attach-money": ["0 -960 960 960", "M480.23-130q-12.77 0-21.38-8.62-8.62-8.61-8.62-21.38v-53.69q-46.15-8.08-80.34-32.7-34.2-24.61-54.81-68.46-5.08-10.53-.12-22.38t17.35-16.92q10.54-4.46 22.07.3 11.54 4.77 17.23 15.93 17.39 33.07 44.74 50.5Q443.69-270 485.92-270q43.31 0 76.43-20.61 33.11-20.62 33.11-65.39 0-38.85-24.88-62.04-24.89-23.19-102.96-48.42-81.77-25.85-113.58-60.46-31.81-34.62-31.81-87.08 0-60.38 42.39-95.04 42.38-34.65 85.61-38.5V-800q0-12.77 8.62-21.38 8.61-8.62 21.38-8.62t21.38 8.62q8.62 8.61 8.62 21.38v52.46q36.85 4.85 64.65 21.43 27.81 16.57 46.58 43.57 6.69 9.92 2.92 21.69-3.77 11.77-16.15 17.23-10.54 4.85-21.88 1.08-11.35-3.77-20.89-14.31-14.15-16.3-33.96-25.73-19.81-9.42-49.27-9.42-45.15 0-72.58 22-27.42 22-27.42 56 0 34.92 28.08 55.85 28.07 20.92 104.38 43.84 70.92 21.54 105.85 61.39 34.92 39.84 34.92 95.69 0 65.61-42.19 101.84-42.19 36.24-103.04 42.93V-160q0 12.77-8.62 21.38Q493-130 480.23-130Z"],
    "auto-awesome": ["0 0 24 24", "M18.5 7.925q-.125 0-.25-.062-.125-.063-.175-.188L17.45 6.25l-1.425-.625q-.125-.05-.2-.175-.075-.125-.075-.25t.075-.25q.075-.125.2-.175l1.425-.65.625-1.4q.05-.15.175-.213.125-.062.25-.062t.25.062q.125.063.175.213l.625 1.4 1.425.65q.125.05.2.175.075.125.075.25t-.075.25q-.075.125-.2.175l-1.425.625-.625 1.425q-.05.125-.175.188-.125.062-.25.062Zm0 13.625q-.125 0-.25-.062-.125-.063-.175-.213l-.625-1.4-1.425-.65q-.125-.05-.2-.175-.075-.125-.075-.25t.075-.25q.075-.125.2-.175l1.425-.625.625-1.425q.05-.125.175-.188.125-.062.25-.062t.25.062q.125.063.175.188l.625 1.425 1.425.625q.125.05.2.175.075.125.075.25t-.075.25q-.075.125-.2.175l-1.425.65-.625 1.4q-.05.15-.175.213-.125.062-.25.062ZM8.875 17.5q-.225 0-.462-.137-.238-.138-.338-.388l-1.3-2.85-2.85-1.3q-.25-.125-.387-.35Q3.4 12.25 3.4 12q0-.25.138-.475.137-.225.387-.35l2.85-1.3 1.3-2.85q.1-.25.338-.388.237-.137.462-.137.25 0 .475.137.225.138.35.388l1.3 2.85 2.85 1.3q.25.125.388.35.137.225.137.475 0 .25-.137.475-.138.225-.388.35l-2.85 1.3-1.3 2.85q-.125.25-.35.388-.225.137-.475.137Zm0-2.35 1-2.15 2.15-1-2.15-1-1-2.15-1 2.15-2.15 1 2.15 1Zm0-3.15Z"],
    "backspace": ["0 -960 960 960", "M367.69-220q-20.77 0-39.04-9.39-18.26-9.38-30.03-26.15l-128.7-182.69q-13.46-19.08-13.46-41.77 0-22.69 13.46-41.77l128.7-181.92q11.77-16.77 29.84-26.54 18.08-9.77 39.23-9.77h380q29.92 0 51.12 21.19Q820-697.61 820-667.69v375.38q0 29.92-21.19 51.12Q777.61-220 747.69-220h-380ZM760-280v-400 400Zm-392.31 0h380q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-375.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85h-380q-5.77 0-10.96 2.88-5.19 2.89-8.27 7.12L218.38-487.31q-2.3 3.08-2.3 7.31 0 4.23 2.3 7.31L348.46-290q3.08 4.23 8.27 7.12 5.19 2.88 10.96 2.88Zm185.39-157.85L636-354.92q8.31 8.3 20.88 8.5 12.58.19 21.27-8.5 8.69-8.7 8.69-21.08 0-12.38-8.69-21.08L595.23-480l82.92-82.92q8.31-8.31 8.5-20.89.19-12.57-8.5-21.27-8.69-8.69-21.07-8.69-12.39 0-21.08 8.69l-82.92 82.93-82.93-82.93q-8.3-8.3-20.88-8.5-12.58-.19-21.27 8.5-8.69 8.7-8.69 21.08 0 12.38 8.69 21.08L510.92-480 428-397.08q-8.31 8.31-8.5 20.89-.19 12.57 8.5 21.27 8.69 8.69 21.08 8.69 12.38 0 21.07-8.69l82.93-82.93Z"],
    "bar-chart": ["0 -960 960 960", "M676.15-180q-15.36 0-25.76-10.4Q640-200.79 640-216.16V-380q0-15.36 10.39-25.76 10.4-10.39 25.76-10.39h67.69q15.37 0 25.76 10.39Q780-395.36 780-380v163.84q0 15.37-10.4 25.76-10.39 10.4-25.76 10.4h-67.69Zm-230 0q-15.36 0-25.76-10.4Q410-200.79 410-216.16v-527.68q0-15.37 10.39-25.76 10.4-10.4 25.76-10.4h67.7q15.36 0 25.76 10.4Q550-759.21 550-743.84v527.68q0 15.37-10.39 25.76-10.4 10.4-25.76 10.4h-67.7Zm-229.99 0q-15.37 0-25.76-10.4-10.4-10.39-10.4-25.76v-331.35q0-15.64 10.4-25.99 10.39-10.34 25.76-10.34h67.69q15.36 0 25.76 10.39Q320-563.06 320-547.69v331.35q0 15.65-10.39 25.99Q299.21-180 283.85-180h-67.69Z"],
    "calendar-month": ["0 -960 960 960", "M212.31-100Q182-100 161-121q-21-21-21-51.31v-535.38Q140-738 161-759q21-21 51.31-21h55.38v-53.85q0-13.15 8.81-21.96 8.81-8.8 21.96-8.8 13.16 0 21.96 8.8 8.81 8.81 8.81 21.96V-780h303.08v-54.61q0-12.77 8.61-21.39 8.62-8.61 21.39-8.61 12.77 0 21.38 8.61 8.62 8.62 8.62 21.39V-780h55.38Q778-780 799-759q21 21 21 51.31v535.38Q820-142 799-121q-21 21-51.31 21H212.31Zm0-60h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-375.38H200v375.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM200-607.69h560v-100q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H212.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v100Zm0 0V-720v112.31Zm280 210.77q-14.69 0-25.04-10.35-10.34-10.34-10.34-25.04 0-14.69 10.34-25.04 10.35-10.34 25.04-10.34t25.04 10.34q10.34 10.35 10.34 25.04 0 14.7-10.34 25.04-10.35 10.35-25.04 10.35Zm-160 0q-14.69 0-25.04-10.35-10.34-10.34-10.34-25.04 0-14.69 10.34-25.04 10.35-10.34 25.04-10.34t25.04 10.34q10.34 10.35 10.34 25.04 0 14.7-10.34 25.04-10.35 10.35-25.04 10.35Zm320 0q-14.69 0-25.04-10.35-10.34-10.34-10.34-25.04 0-14.69 10.34-25.04 10.35-10.34 25.04-10.34t25.04 10.34q10.34 10.35 10.34 25.04 0 14.7-10.34 25.04-10.35 10.35-25.04 10.35ZM480-240q-14.69 0-25.04-10.35-10.34-10.34-10.34-25.03 0-14.7 10.34-25.04 10.35-10.35 25.04-10.35t25.04 10.35q10.34 10.34 10.34 25.04 0 14.69-10.34 25.03Q494.69-240 480-240Zm-160 0q-14.69 0-25.04-10.35-10.34-10.34-10.34-25.03 0-14.7 10.34-25.04 10.35-10.35 25.04-10.35t25.04 10.35q10.34 10.34 10.34 25.04 0 14.69-10.34 25.03Q334.69-240 320-240Zm320 0q-14.69 0-25.04-10.35-10.34-10.34-10.34-25.03 0-14.7 10.34-25.04 10.35-10.35 25.04-10.35t25.04 10.35q10.34 10.34 10.34 25.04 0 14.69-10.34 25.03Q654.69-240 640-240Z"],
    "category": ["0 -960 960 960", "m321.23-590.62 127.85-209.53q5.61-9.23 13.75-13.16 8.13-3.92 17.17-3.92 9.04 0 17.17 3.92 8.14 3.93 13.75 13.16l127.85 209.53q5.61 9.04 5.61 18.98 0 9.95-4.61 18.18-4.62 8.23-12.69 13.15-8.08 4.92-18.85 4.92H351.77q-10.81 0-18.92-4.97-8.11-4.97-12.62-13.1-4.61-8.11-4.61-18.02t5.61-19.14ZM700-95.39q-68.85 0-116.73-47.88-47.88-47.88-47.88-116.73t47.88-116.73q47.88-47.88 116.73-47.88t116.73 47.88q47.88 47.88 47.88 116.73t-47.88 116.73Q768.85-95.39 700-95.39Zm-564.61-56.16v-217q0-15.37 10.39-25.72 10.4-10.34 25.77-10.34h217q15.37 0 25.72 10.39 10.34 10.4 10.34 25.77v217q0 15.37-10.39 25.72-10.4 10.34-25.77 10.34h-217q-15.37 0-25.72-10.39-10.34-10.4-10.34-25.77Zm564.6-3.83q43.93 0 74.28-30.34t30.35-74.27q0-43.93-30.34-74.28t-74.27-30.35q-43.93 0-74.28 30.34t-30.35 74.27q0 43.93 30.34 74.28t74.27 30.35Zm-504.61-20h169.24v-169.24H195.38v169.24Zm198.16-420h172.92L480-734.46l-86.46 139.08Zm86.46 0ZM364.62-344.62ZM700-260Z"],
    "check": ["0 -960 960 960", "m382-339.38 345.54-345.54q8.92-8.93 20.88-9.12 11.96-.19 21.27 9.12 9.31 9.31 9.31 21.38 0 12.08-9.31 21.39l-362.38 363q-10.85 10.84-25.31 10.84-14.46 0-25.31-10.84l-167-167q-8.92-8.93-8.8-21.2.11-12.26 9.42-21.57t21.38-9.31q12.08 0 21.39 9.31L382-339.38Z"],
    "checkroom": ["0 -960 960 960", "M220.77-240h518.85L480-432.69 220.77-240Zm197.69-439.77q-3.85 8.31-10.84 13.39-7 5.07-16.8 5.07-12.8 0-21.46-8.65-8.67-8.65-8.67-21.43 0-3.76.5-6.11.5-2.35 2.12-5.58 15.43-34.38 47.19-55.65Q442.27-780 480.38-780q53 0 89.97 36.66 36.96 36.65 36.96 89.65 0 44.69-27.12 78.81-27.11 34.11-70.19 44.65v44.85l338.23 251.46q6.08 3.74 9.11 10.11 3.04 6.36 3.04 13.85 0 12.73-8.62 21.34-8.63 8.62-21.38 8.62H130q-12.75 0-21.37-8.58-8.63-8.58-8.63-21.27 0-7.46 3.04-13.88 3.04-6.42 9.12-10.19L450-485.38v-70.77q0-12.75 8.96-21.38 8.96-8.62 21.66-8.62 27.69 0 47.19-19.93 19.5-19.94 19.5-47.62 0-27.68-19.52-46.99Q508.27-720 480.38-720q-19.92 0-36.84 10.65-16.93 10.66-25.08 29.58Z"],
    "chevron-right": ["0 -960 960 960", "M517.85-480 354.92-642.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69l179.77 179.77q5.61 5.62 7.92 11.85 2.31 6.23 2.31 13.46t-2.31 13.46q-2.31 6.23-7.92 11.85L397.08-274.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L517.85-480Z"],
    "close": ["0 -960 960 960", "M480-437.85 277.08-234.92q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L437.85-480 234.92-682.92q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69L480-522.15l202.92-202.93q8.31-8.3 20.89-8.5 12.57-.19 21.27 8.5 8.69 8.7 8.69 21.08 0 12.38-8.69 21.08L522.15-480l202.93 202.92q8.3 8.31 8.5 20.89.19 12.57-8.5 21.27-8.7 8.69-21.08 8.69-12.38 0-21.08-8.69L480-437.85Z"],
    "code": ["0 -960 960 960", "m178.77-479.38 162.31 162.3q8.3 8.31 8.5 20.89.19 12.57-8.5 21.27-8.7 8.69-21.08 8.69-12.38 0-21.08-8.69L119.15-454.69q-5.61-5.62-7.92-11.85-2.31-6.23-2.31-13.46t2.31-13.46q2.31-6.23 7.92-11.85l179.77-179.77q8.93-8.92 21.2-9.11 12.26-.19 21.57 9.11 9.31 9.31 9.31 21.39 0 12.07-9.31 21.38L178.77-479.38Zm602.46-1.24-162.31-162.3q-8.3-8.31-8.5-20.89-.19-12.57 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69l179.77 179.77q5.61 5.62 7.92 11.85 2.31 6.23 2.31 13.46t-2.31 13.46q-2.31 6.23-7.92 11.85L661.08-274.92q-8.93 8.92-20.89 8.8-11.96-.11-21.27-9.42-9.3-9.31-9.3-21.38 0-12.08 9.3-21.39l162.31-162.31Z"],
    "computer": ["0 -960 960 960", "M85.39-150.77q-12.77 0-21.39-8.62-8.61-8.61-8.61-21.38T64-202.15q8.62-8.62 21.39-8.62h789.22q12.77 0 21.39 8.62 8.61 8.61 8.61 21.38T896-159.39q-8.62 8.62-21.39 8.62H85.39Zm86.92-100q-30.31 0-51.31-21-21-21-21-51.31v-415.38q0-30.31 21-51.31 21-21 51.31-21h615.38q30.31 0 51.31 21 21 21 21 51.31v415.38q0 30.31-21 51.31-21 21-51.31 21H172.31Zm0-60h615.38q4.62 0 8.46-3.84 3.85-3.85 3.85-8.47v-415.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H172.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v415.38q0 4.62 3.85 8.47 3.84 3.84 8.46 3.84Zm-12.31 0v-440 440Z"],
    "credit-card": ["0 -960 960 960", "M860-707.69v455.38Q860-222 839-201q-21 21-51.31 21H172.31Q142-180 121-201q-21-21-21-51.31v-455.38Q100-738 121-759q21-21 51.31-21h615.38Q818-780 839-759q21 21 21 51.31Zm-700 83.85h640v-83.85q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H172.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v83.85Zm0 127.68v243.85q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h615.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-243.85H160ZM160-240v-480 480Z"],
    "dark-mode": ["0 -960 960 960", "M481.15-140Q339-140 240.08-238.92 141.16-337.85 141.16-480q0-118.38 73.26-210.46 73.27-92.08 195.19-118.69 12.62-3.16 22.23.61 9.62 3.77 15.62 11.23 6 7.47 7.08 18.12 1.07 10.65-5 21.27-12.39 22.54-18.39 46.83t-6 51.09q0 98.33 68.84 167.17Q562.82-424 661.15-424q29.47 0 56.31-7.46 26.85-7.46 47-17.31 9.85-4.3 19.23-3.04 9.39 1.27 16.02 6.27 7.37 5 10.94 13.66 3.58 8.65.81 20.34-21.31 118-114.81 194.77Q603.15-140 481.15-140Zm0-60q88 0 158-48.5t102-126.5q-20 5-40 8t-40 3q-123 0-209.5-86.5T365.15-660q0-20 3-40t8-40q-78 32-126.5 102t-48.5 158q0 116 82 198t198 82Zm-10-270Z"],
    "database": ["0 -960 960 960", "M480-140q-145.61 0-242.81-41.12Q140-222.23 140-283.85V-680q0-57.92 99.54-98.96Q339.08-820 480-820q140.92 0 240.46 41.04Q820-737.92 820-680v396.15q0 61.62-97.19 102.73Q625.61-140 480-140Zm0-461.69q87.46 0 176.12-24.73 88.65-24.73 102.73-53.35-13.7-29.38-101.66-54.81Q569.23-760 480-760q-89.08 0-176.58 24.73-87.5 24.73-103.04 53.96 15.16 30 102.27 54.81 87.12 24.81 177.35 24.81Zm0 200.15q41.62 0 81-4t75.27-11.69q35.88-7.69 67.19-19.08 31.31-11.38 56.54-25.77V-604q-25.23 14.38-56.54 25.77-31.31 11.38-67.19 19.07-35.89 7.7-75.27 11.7-39.38 4-81 4-42.38 0-82.58-4.2-40.19-4.19-75.88-11.88t-66.5-18.88Q224.23-589.62 200-604v141.92q24.23 14.39 55.04 25.58 30.81 11.19 66.5 18.88 35.69 7.7 75.88 11.89 40.2 4.19 82.58 4.19ZM480-200q48.69 0 95.62-6.42 46.92-6.43 85.38-17.54 38.46-11.12 64.88-25.81 26.43-14.69 34.12-30.85v-121.46q-25.23 14.39-56.54 25.77-31.31 11.39-67.19 19.08-35.89 7.69-75.27 11.69-39.38 4-81 4-42.38 0-82.58-4.19-40.19-4.19-75.88-11.89-35.69-7.69-66.5-18.88-30.81-11.19-55.04-25.58V-280q7.69 16.54 33.81 30.73 26.11 14.19 64.57 25.31 38.47 11.11 85.7 17.54Q431.31-200 480-200Z"],
    "delete": ["0 -960 960 960", "M292.31-140q-29.83 0-51.07-21.24Q220-182.48 220-212.31V-720h-10q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q197.25-780 210-780h150q0-14.69 10.35-25.04 10.34-10.34 25.03-10.34h169.24q14.69 0 25.03 10.34Q600-794.69 600-780h150q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q762.75-720 750-720h-10v507.69q0 29.83-21.24 51.07Q697.52-140 667.69-140H292.31ZM680-720H280v507.69q0 5.39 3.46 8.85t8.85 3.46h375.38q5.39 0 8.85-3.46t3.46-8.85V-720ZM406.17-280q12.75 0 21.37-8.62 8.61-8.63 8.61-21.38v-300q0-12.75-8.63-21.38-8.62-8.62-21.38-8.62-12.75 0-21.37 8.62-8.61 8.63-8.61 21.38v300q0 12.75 8.62 21.38 8.63 8.62 21.39 8.62Zm147.69 0q12.75 0 21.37-8.62 8.61-8.63 8.61-21.38v-300q0-12.75-8.62-21.38-8.63-8.62-21.39-8.62-12.75 0-21.37 8.62-8.61 8.63-8.61 21.38v300q0 12.75 8.63 21.38 8.62 8.62 21.38 8.62ZM280-720v520-520Z"],
    "directions-car": ["0 -960 960 960", "M224.61-220v37.69q0 17.63-12.35 29.97t-30 12.34q-17.64 0-29.95-12.34Q140-164.68 140-182.31v-282.15q0-6.23.81-12.46t2.72-11.94l71.63-202.52q7.19-21.61 26.06-35.11Q260.09-740 283.46-740h393.08q23.37 0 42.24 13.51 18.87 13.5 26.06 35.11l71.63 202.52q1.91 5.71 2.72 11.94.81 6.23.81 12.46v282.15q0 17.63-12.35 29.97-12.36 12.34-30 12.34-17.65 0-29.96-12.34-12.3-12.34-12.3-29.97V-220H224.61Zm-.3-316.92h511.38l-47.38-135q-1.54-3.85-4.62-5.96-3.08-2.12-7.31-2.12H283.62q-4.23 0-7.31 2.12-3.08 2.11-4.62 5.96l-47.38 135Zm-24.31 60V-280v-196.92Zm98.55 150.77q21.83 0 37.03-15.29 15.19-15.28 15.19-37.11t-15.28-37.03q-15.29-15.19-37.12-15.19t-37.02 15.28q-15.2 15.29-15.2 37.12t15.29 37.02q15.28 15.2 37.11 15.2Zm363.08 0q21.83 0 37.02-15.29 15.2-15.28 15.2-37.11t-15.29-37.03q-15.28-15.19-37.11-15.19t-37.03 15.28q-15.19 15.29-15.19 37.12t15.28 37.02q15.29 15.2 37.12 15.2ZM200-280h560v-196.92H200V-280Z"],
    "donut-large": ["0 -960 960 960", "M184.61-480q0 102.62 61.35 182.08 61.35 79.46 159.27 103.77 12.62 4.07 20.66 15.57 8.03 11.5 8.03 25.73 0 20.54-17 32.73-17 12.2-37.53 5.27-125.16-34.07-202.27-135Q100-350.77 100-480q0-129.23 77.12-230.15 77.11-100.93 202.27-135 20.53-6.93 37.53 5.27 17 12.19 17 32.73 0 14.23-8.03 25.73-8.04 11.5-20.66 15.57-97.92 24.31-159.27 103.77-61.35 79.46-61.35 182.08Zm563.93 268.15q-34.31 34.93-77.5 59.81-43.2 24.89-91.43 37.19-20.53 6.54-37.73-5.46-17.19-12-17.19-32.54 0-14.23 8.04-25.73t21.04-15.57q38.69-9.23 73.35-29.04Q661.77-243 689.77-271q27.62-28.61 46.92-62.46 19.31-33.85 29.16-72.77 4.07-13 15.57-21.04t25.73-8.04q20.54 0 32.54 17.19 12 17.2 5.46 37.73-12.3 48.23-37 90.93-24.69 42.69-59.61 77.61Zm0-536.3q34.92 34.92 59.61 77.61 24.7 42.7 37 90.93 6.54 20.53-5.46 37.73-12 17.19-32.54 17.19-14.23 0-25.73-8.04t-15.57-21.04q-9.85-38.92-29.16-72.77-19.3-33.85-46.92-62.46-28-28-62.65-47.81-34.66-19.81-73.35-29.04-13-4.07-21.04-15.57t-8.04-25.73q0-20.54 17.19-32.54 17.2-12 37.73-5.46 48.23 12.3 91.43 37.19 43.19 24.88 77.5 59.81Z"],
    "download": ["0 -960 960 960", "M480-343.54q-7.23 0-13.46-2.31-6.23-2.3-11.85-7.92L330.31-478.15q-8.92-8.93-8.81-20.89.12-11.96 8.81-21.27 9.31-9.3 21.38-9.61 12.08-.31 21.39 9L450-444v-306q0-12.77 8.62-21.38Q467.23-780 480-780t21.38 8.62Q510-762.77 510-750v306l76.92-76.92q8.93-8.92 21.19-8.81 12.27.12 21.58 9.42 8.69 9.31 9 21.08.31 11.77-9 21.08L505.31-353.77q-5.62 5.62-11.85 7.92-6.23 2.31-13.46 2.31ZM252.31-180Q222-180 201-201q-21-21-21-51.31v-78.46q0-12.77 8.62-21.38 8.61-8.62 21.38-8.62t21.38 8.62q8.62 8.61 8.62 21.38v78.46q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h455.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-78.46q0-12.77 8.62-21.38 8.61-8.62 21.38-8.62t21.38 8.62q8.62 8.61 8.62 21.38v78.46Q780-222 759-201q-21 21-51.31 21H252.31Z"],
    "edit": ["0 -960 960 960", "M200-200h50.46l409.46-409.46-50.46-50.46L200-250.46V-200Zm-23.84 60q-15.37 0-25.76-10.4-10.4-10.39-10.4-25.76v-69.3q0-14.63 5.62-27.89 5.61-13.26 15.46-23.11l506.54-506.31q9.07-8.24 20.03-12.73 10.97-4.5 23-4.5t23.3 4.27q11.28 4.27 19.97 13.58l48.85 49.46q9.31 8.69 13.27 20 3.96 11.31 3.96 22.62 0 12.07-4.12 23.03-4.12 10.97-13.11 20.04L296.46-161.08q-9.85 9.85-23.11 15.46-13.26 5.62-27.89 5.62h-69.3Zm584.22-570.15-50.23-50.23 50.23 50.23Zm-126.13 75.9-24.79-25.67 50.46 50.46-25.67-24.79Z"],
    "expand-more": ["0 -960 960 960", "M480-373.54q-7.23 0-13.46-2.31-6.23-2.3-11.85-7.92L274.92-563.54q-8.3-8.31-8.5-20.88-.19-12.58 8.5-21.27 8.7-8.69 21.08-8.69 12.38 0 21.08 8.69L480-442.77l162.92-162.92q8.31-8.31 20.89-8.5 12.57-.19 21.27 8.5 8.69 8.69 8.69 21.07 0 12.39-8.69 21.08L505.31-383.77q-5.62 5.62-11.85 7.92-6.23 2.31-13.46 2.31Z"],
    "favorite": ["0 -960 960 960", "M479.62-171.62q-12.85 0-25.81-4.61-12.96-4.62-22.81-14.46l-57.46-52.23q-106.38-97-189.96-190.58Q100-527.08 100-634q0-85.15 57.42-142.58Q214.85-834 300-834q48.38 0 95.58 22.31 47.19 22.31 84.42 72.46 37.23-50.15 84.42-72.46Q611.62-834 660-834q85.15 0 142.58 57.42Q860-719.15 860-634q0 108.08-85 202.73-85 94.65-189.54 188.96l-56.85 51.62q-9.84 9.84-22.99 14.46-13.16 4.61-26 4.61Zm-28.39-506.84q-32.46-49.46-68.35-72.5Q347-774 300-774q-60 0-100 40t-40 100q0 48.15 31.04 100.69t77.92 104.46q46.88 51.93 101.58 101.46 54.69 49.54 101.38 92.08 3.46 3.08 8.08 3.08t8.08-3.08q46.69-42.54 101.38-92.08 54.7-49.53 101.58-101.46 46.88-51.92 77.92-104.46Q800-585.85 800-634q0-60-40-100t-100-40q-47 0-82.88 23.04-35.89 23.04-68.35 72.5-5.08 7.69-12.77 11.54-7.69 3.84-16 3.84-8.31 0-16-3.84-7.69-3.85-12.77-11.54ZM480-502.54Z"],
    "fingerprint": ["0 -960 960 960", "M480.23-779.08q105.72 0 199.48 45.5 93.75 45.5 156.37 131.12 6.23 7.84 3.92 14.27-2.31 6.42-7.92 10.65-5.62 4.23-12.64 3.77-7.02-.45-12.29-7.77Q751.38-660.31 664.51-702q-86.86-41.69-184.28-41.69-97 0-182.38 42.07-85.39 42.08-141.77 120.08-5.62 8.23-12.85 8.85-7.23.61-12.85-4-5.65-4.23-6.86-10.58t3.63-13.19q62.39-84.23 155.15-131.42 92.77-47.2 197.93-47.2Zm.02 94q134.21 0 230.63 89.45 96.43 89.45 96.43 221.63 0 49.18-34.83 82.13-34.83 32.95-84.86 32.95-49.85 0-85.77-32.95-35.93-32.95-35.93-82.13 0-33.77-25.06-57.04-25.07-23.27-59.86-23.27-35.1 0-60.4 23.17-25.29 23.16-25.29 57.14 0 98.15 58.27 163.92 58.27 65.77 149.27 91.77 8.05 2.64 10.95 8.8 2.89 6.16.89 13.2-2 6.16-7.23 10.77-5.23 4.62-13.84 2.62-102.47-26-168.08-102.94-65.62-76.95-65.62-188.14 0-49.23 35.62-82.46 35.61-33.23 85.49-33.23 49.87 0 85.07 33.23 35.21 33.23 35.21 82.46 0 33.98 25.65 57.14 25.65 23.17 60.54 23.17 34.88 0 59.65-23.27 24.77-23.27 24.77-57.04 0-116.98-85.88-196.64-85.89-79.67-205.12-79.67t-204.8 79.78q-85.58 79.78-85.58 195.91 0 24.2 5.08 60.49 5.07 36.28 21.69 84.28 2.61 7.85-.31 13.89-2.92 6.04-10.15 9.04-7.23 3-13.77-.14-6.54-3.15-9.16-10.32-15.38-40.16-22.07-78.27-6.7-38.12-6.7-78.35 0-132.18 95.94-221.63 95.94-89.45 229.16-89.45Zm.75-192q63.49 0 124.01 15.5t117.07 44.5q8.61 4.62 9.92 11.04 1.31 6.42-1.31 12.66-2.61 6.23-9.04 9.46-6.42 3.23-14.5-1-52.61-28.16-109.68-42.46-57.07-14.31-116.66-14.31-58.58 0-114.96 14.27-56.39 14.27-108.54 42.5-6.08 3.84-13.12 1.73-7.04-2.12-10.27-8.96-3.23-6.85-1.8-12.77 1.42-5.93 8.26-10.16Q296-845.46 357-861.27q61-15.81 124-15.81Zm.02 289.39q92.21 0 158.25 61.73T705.31-374q0 7.96-4.87 12.83-4.86 4.86-12.82 4.86-6.85 0-12.27-4.86-5.43-4.87-5.43-12.83 0-75.77-56.06-127.04-56.07-51.27-132.85-51.27t-132.24 51.27q-55.46 51.27-55.46 127.01 0 81.8 28.38 138.49 28.39 56.69 82.39 114.39 6 6.07 5.42 13.11-.58 7.04-5.42 11.89-5.23 5.23-12.27 5.42-7.04.19-12.66-5.42-57.84-61.23-89.53-125.93-31.7-64.69-31.7-151.93 0-90.22 65.44-151.95 65.45-61.73 157.66-61.73Zm-1.48 196q7.92 0 12.84 5.31 4.93 5.3 4.93 12.38 0 76.18 54.57 124.94 54.58 48.75 127.74 48.75 7.92 0 18.92-1 11-1 22.61-3 7.47-1.61 12.81 2.12 5.35 3.73 7.35 11.65 2 7.05-2.62 12.33-4.61 5.29-11.84 7.29-14.54 3.84-27.66 4.92-13.11 1.08-19.57 1.08-87.85 0-152.77-59.46-64.93-59.45-64.93-149.62 0-7.08 4.85-12.38 4.84-5.31 12.77-5.31Z"],
    "fitness-center": ["0 -960 960 960", "m282-635.85-119 119q-9.08 9.08-22.69 9.39-13.62.31-23.31-9.39-9.08-9.07-9.38-22.69-.31-13.61 8.77-23.31l34.38-35-20.69-20.69q-10.85-10.84-10.85-25.31 0-14.46 10.85-25.3l58.69-58.7L153.23-764q-8.31-8.31-8.5-20.58-.19-12.27 9.12-21.57 8.69-8.69 20.77-9 12.07-.31 21.38 8.38l36.15 35.54 58.7-58.69q10.84-10.85 25.3-10.85 14.47 0 25.31 10.85l20.69 20.69 35-34.38q9.08-9.08 22.7-9.08 13.61 0 23.3 9.69 9.08 9.08 9.08 23t-9.08 23l-119 119L678-324.15l119-119q9.08-9.08 22.69-9.39 13.62-.31 23.31 9.39 9.08 9.07 9.38 22.69.31 13.61-8.77 23.31l-34.38 35 20.69 20.69q10.85 10.84 10.85 25.31 0 14.46-10.85 25.3l-58.69 58.7L806.77-196q8.31 8.31 8.5 20.58.19 12.27-9.12 21.57-8.69 8.69-20.77 9-12.07.31-21.38-8.38l-36.15-35.54-58.7 58.69q-10.84 10.85-25.3 10.85-14.47 0-25.31-10.85l-20.69-20.69-35 34.38q-9.08 9.08-22.7 9.08-13.61 0-23.3-9.69-9.08-9.08-9.08-23t9.08-23l119-119L282-635.85Z"],
    "flag": ["0 -960 960 960", "M280-420v260q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q220-147.25 220-160v-583.84q0-15.37 10.4-25.76 10.39-10.4 25.76-10.4h257.76q12.81 0 22.87 8.04 10.05 8.04 12.67 20.88L559.84-700h184q15.37 0 25.76 10.35Q780-679.3 780-664v288.01q0 15.3-10.4 25.64Q759.21-340 743.84-340H566.08q-12.81 0-22.87-8.04-10.05-8.04-12.67-20.88L520.16-420H280Zm306 20h134v-240H539.92q-12.8 0-22.86-8.04-10.06-8.04-12.68-20.88L494-720H280v240h260.08q12.8 0 22.86 8.04 10.06 8.04 12.68 20.88L586-400Zm-86-160Z"],
    "help": ["0 -960 960 960", "M479.56-255.39q17.13 0 28.94-11.82 11.81-11.83 11.81-28.97 0-17.13-11.83-28.94-11.83-11.8-28.96-11.8-17.13 0-28.94 11.83-11.81 11.83-11.81 28.96 0 17.13 11.83 28.94 11.83 11.8 28.96 11.8Zm.51 155.39q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Zm-.07-60q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Zm3.24-171.23q27.68 0 47.91 17.43 20.24 17.43 20.24 43.57 0 22-12.93 39.38-12.92 17.39-29.54 32.39-21.78 19.32-38.35 42.51-16.57 23.18-17.72 51.64-.39 10.93 7.69 18.31 8.08 7.38 18.84 7.38 11.54 0 19.54-7.69t10.23-18.84q4-20.62 17.04-36.73 13.04-16.12 28.25-30.65 21.87-21.32 38.17-46.48 16.31-25.17 16.31-56.14 0-47.54-37.46-78.12Q534-703.84 484-703.84q-35.69 0-67.31 15.8-31.61 15.81-49.23 46.12-5.46 9.31-3.5 19.59 1.95 10.29 10.55 15.62 10.95 6.09 22.49 3.48 11.54-2.62 19.61-13.15 12.16-15.77 29.43-25.31t37.2-9.54Z"],
    "history": ["0 -960 960 960", "M479.23-140q-120.61 0-212.61-73.62-92-73.61-117.93-188.38-3.23-11.92 3.89-21.92 7.11-10 20.15-11.62 12.27-1.61 22 4.85t13.58 19Q231.15-319 306.73-259.5t172.5 59.5q117 0 198.5-81.5t81.5-198.5q0-117-81.5-198.5T479.23-760q-65.54 0-122.84 29.12-57.31 29.11-98.7 80.11h74.62q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37-8.62 8.62-21.37 8.62H195.39q-15.37 0-25.76-10.4-10.4-10.39-10.4-25.76v-136.92q0-12.75 8.63-21.37 8.63-8.63 21.39-8.63 12.75 0 21.37 8.63 8.61 8.62 8.61 21.37v64.77q48.69-57.46 116.62-89.19Q403.77-820 479.23-820q70.8 0 132.63 26.77t107.83 72.77q46 46 72.77 107.82 26.77 61.83 26.77 132.62t-26.77 132.63q-26.77 61.85-72.77 107.85-46 46-107.83 72.77Q550.03-140 479.23-140Zm31.15-352.15 110 110q8.31 8.3 8.5 20.88.2 12.58-8.5 21.27-8.69 8.69-21.07 8.69-12.39 0-21.08-8.69l-117-117q-5.61-5.62-8.23-12.24-2.61-6.62-2.61-13.68V-650q0-12.75 8.62-21.38 8.63-8.62 21.39-8.62 12.75 0 21.37 8.62 8.61 8.63 8.61 21.38v157.85Z"],
    "home": ["0 -960 960 960", "M240-200h133.85v-201.54q0-15.36 10.39-25.76 10.4-10.39 25.76-10.39h140q15.36 0 25.76 10.39 10.39 10.4 10.39 25.76V-200H720v-353.85q0-3.07-1.35-5.57-1.34-2.5-3.65-4.43L487.31-735q-3.08-2.69-7.31-2.69-4.23 0-7.31 2.69L245-563.85q-2.31 1.93-3.65 4.43-1.35 2.5-1.35 5.57V-200Zm-60 0v-353.85q0-17.17 7.68-32.53 7.69-15.37 21.24-25.31l227.7-171.54q18.95-14.46 43.32-14.46t43.44 14.46l227.7 171.54q13.55 9.94 21.24 25.31 7.68 15.36 7.68 32.53V-200q0 24.54-17.73 42.27Q744.54-140 720-140H562.31q-15.37 0-25.76-10.4-10.4-10.39-10.4-25.76v-201.53h-92.3v201.53q0 15.37-10.4 25.76-10.39 10.4-25.76 10.4H240q-24.54 0-42.27-17.73Q180-175.46 180-200Zm300-269.23Z"],
    "home-fill": ["0 -960 960 960", "M180-200v-353.85q0-17.17 7.68-32.53 7.69-15.37 21.24-25.31l227.7-171.54q18.95-14.46 43.32-14.46t43.44 14.46l227.7 171.54q13.55 9.94 21.24 25.31 7.68 15.36 7.68 32.53V-200q0 24.54-17.73 42.27Q744.54-140 720-140H592.31q-15.37 0-25.76-10.4-10.4-10.39-10.4-25.76v-195.38q0-15.36-10.39-25.76-10.39-10.39-25.76-10.39h-80q-15.37 0-25.76 10.39-10.39 10.4-10.39 25.76v195.38q0 15.37-10.4 25.76-10.39 10.4-25.76 10.4H240q-24.54 0-42.27-17.73Q180-175.46 180-200Z"],
    "info": ["0 -960 960 960", "M480.01-290q12.76 0 21.37-8.63Q510-307.25 510-320v-170q0-12.75-8.63-21.38-8.63-8.62-21.38-8.62-12.76 0-21.37 8.62Q450-502.75 450-490v170q0 12.75 8.63 21.37 8.63 8.63 21.38 8.63ZM480-588.46q13.73 0 23.02-9.29t9.29-23.02q0-13.73-9.29-23.02-9.29-9.28-23.02-9.28t-23.02 9.28q-9.29 9.29-9.29 23.02t9.29 23.02q9.29 9.29 23.02 9.29Zm.07 488.46q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Zm-.07-60q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"],
    "key": ["0 -960 960 960", "M280-415.39q-26.65 0-45.63-18.98-18.98-18.98-18.98-45.63 0-26.65 18.98-45.63 18.98-18.98 45.63-18.98 26.65 0 45.63 18.98 18.98 18.98 18.98 45.63 0 26.65-18.98 45.63-18.98 18.98-45.63 18.98ZM280-260q-91.67 0-155.83-64.14Q60-388.28 60-479.91q0-91.63 64.17-155.86Q188.33-700 280-700q64.31 0 116.31 33.19 52 33.2 79.38 86.81h345q7.07 0 13.69 2.62 6.62 2.61 12.23 8.23l63.85 63.84q5.62 5.62 7.92 11.9 2.31 6.28 2.31 13.46 0 7.18-2.31 13.41-2.3 6.23-7.92 11.85L804.62-349.23q-4.5 4.65-10.79 7.44-6.29 2.79-12.52 3.4-6.23.62-12.46-1.19T757-345.62l-49.31-37.07-55.84 41.46q-4.62 3.61-9.85 5.23-5.23 1.61-10.85 1.61-5.61 0-11.15-1.8-5.54-1.81-10.15-5.04L553.46-380h-77.77q-27.38 53.23-79.38 86.61Q344.31-260 280-260Zm0-60q57.54 0 99.65-34.77 42.12-34.77 54.97-85.23h137.69l57.61 39.85q-.38 0-.19.3.19.31.19-.3l78.16-57.16L776-405.38v-.2.2L850.62-480h-.31.31l-40-40v-.31.31h-376q-12.85-50.46-54.97-85.23Q337.54-640 280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Z"],
    "keyboard": ["0 -960 960 960", "M172.31-220Q142-220 121-241q-21-21-21-51.31v-375.38Q100-698 121-719q21-21 51.31-21h615.38Q818-740 839-719q21 21 21 51.31v375.38Q860-262 839-241q-21 21-51.31 21H172.31Zm0-60h615.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-375.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H172.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v375.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM360-324.62h240q14.69 0 25.04-10.15 10.34-10.15 10.34-25.23 0-14.69-10.34-25.04-10.35-10.34-25.04-10.34H360q-14.69 0-25.04 10.15-10.34 10.15-10.34 25.23 0 14.69 10.34 25.04 10.35 10.34 25.04 10.34ZM160-280v-400 400Zm80-284.62q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm-480 120q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Zm120 0q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34Z"],
    "light-mode": ["0 -960 960 960", "M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 60q-74.92 0-127.46-52.54Q300-405.08 300-480q0-74.92 52.54-127.46Q405.08-660 480-660q74.92 0 127.46 52.54Q660-554.92 660-480q0 74.92-52.54 127.46Q554.92-300 480-300ZM80-450q-12.75 0-21.37-8.63Q50-467.26 50-480.01q0-12.76 8.63-21.37Q67.25-510 80-510h90q12.75 0 21.38 8.63 8.62 8.63 8.62 21.38 0 12.76-8.62 21.37Q182.75-450 170-450H80Zm710 0q-12.75 0-21.38-8.63-8.62-8.63-8.62-21.38 0-12.76 8.62-21.37Q777.25-510 790-510h90q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q892.75-450 880-450h-90ZM479.99-760q-12.76 0-21.37-8.62Q450-777.25 450-790v-90q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q510-892.75 510-880v90q0 12.75-8.63 21.38-8.63 8.62-21.38 8.62Zm0 710q-12.76 0-21.37-8.63Q450-67.25 450-80v-90q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.37 8.62Q510-182.75 510-170v90q0 12.75-8.63 21.37Q492.74-50 479.99-50ZM240.23-678.38l-50.31-48.93q-8.92-8.31-8.61-20.88.31-12.58 8.73-21.89 9.19-9.3 21.58-9.3 12.38 0 21.07 9.3L282-720.15q8.69 9.3 8.69 21.07t-8.5 21.08q-8.5 9.31-20.57 8.81-12.08-.5-21.39-9.19Zm487.08 488.46L678-239.85q-8.69-9.3-8.69-21.38 0-12.08 8.69-20.77 8.12-9.31 20.29-8.81t21.48 9.19l50.31 48.93q8.92 8.31 8.61 20.88-.31 12.58-8.73 21.89-9.19 9.3-21.58 9.3-12.38 0-21.07-9.3ZM678-677.81q-9.31-8.5-8.81-20.57.5-12.08 9.19-21.39l48.93-50.31q8.31-8.92 20.88-8.61 12.58.31 21.89 8.73 9.3 9.19 9.3 21.58 0 12.38-9.3 21.07L720.15-678q-9.3 8.69-21.07 8.69t-21.08-8.5ZM189.92-189.84q-9.3-9.39-9.3-21.78 0-12.38 9.3-21.07L239.85-282q9.3-8.69 21.38-8.69 12.08 0 20.77 8.69 8.92 8.12 8.42 20.29t-8.8 21.48l-48.93 50.31q-8.69 9.3-21.07 9-12.39-.31-21.7-8.92ZM480-480Z"],
    "local-gas-station": ["0 -960 960 960", "M180-176.16v-571.53Q180-778 201-799q21-21 51.31-21h215.38Q498-820 519-799q21 21 21 51.31v260h38.46q29.83 0 51.07 21.24 21.24 21.24 21.24 51.06v181.54q0 19.31 13.42 32.73 13.42 13.43 32.73 13.43 19.31 0 32.73-13.43 13.43-13.42 13.43-32.73v-280.3q-9 5.38-19 7.46-10 2.07-21 2.07-36.83 0-62.27-25.43-25.43-25.43-25.43-62.26 0-29.69 16.93-52.88 16.92-23.19 44.77-31.12l-73.39-73.38q-7.08-7.08-7.27-16.58-.19-9.5 7.38-17.07 6.74-6.74 16.35-7.04 9.62-.31 17.08 6.54l125.84 124q13.47 13.46 20.58 31.19 7.12 17.73 7.12 36.34v358.46q0 39.42-27.2 66.63Q736.38-140 697-140q-39.39 0-66.66-27.22-27.26-27.21-27.26-66.63v-193.84q0-5.39-3.47-8.85-3.46-3.46-8.84-3.46H540v263.84q0 15.37-10.35 25.76Q519.3-140 504-140H215.99q-15.3 0-25.64-10.4Q180-160.79 180-176.16ZM240-550h240v-197.69q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H252.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46V-550Zm463.08-2.31q17 0 28.5-11.5t11.5-28.5q0-17-11.5-28.5t-28.5-11.5q-17 0-28.5 11.5t-11.5 28.5q0 17 11.5 28.5t28.5 11.5ZM240-200h240v-290H240v290Zm240 0H240h240Z"],
    "lock": ["0 -960 960 960", "M252.31-100q-29.92 0-51.12-21.19Q180-142.39 180-172.31v-375.38q0-29.92 21.19-51.12Q222.39-620 252.31-620H300v-80q0-74.92 52.54-127.46Q405.08-880 480-880q74.92 0 127.46 52.54Q660-774.92 660-700v80h47.69q29.92 0 51.12 21.19Q780-577.61 780-547.69v375.38q0 29.92-21.19 51.12Q737.61-100 707.69-100H252.31Zm0-60h455.38q5.39 0 8.85-3.46t3.46-8.85v-375.38q0-5.39-3.46-8.85t-8.85-3.46H252.31q-5.39 0-8.85 3.46t-3.46 8.85v375.38q0 5.39 3.46 8.85t8.85 3.46ZM480-290q29.15 0 49.58-20.42Q550-330.85 550-360t-20.42-49.58Q509.15-430 480-430t-49.58 20.42Q410-389.15 410-360t20.42 49.58Q450.85-290 480-290ZM360-620h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"],
    "lock-open": ["0 -960 960 960", "M252.31-100q-29.92 0-51.12-21.19Q180-142.39 180-172.31v-375.38q0-29.92 21.19-51.12Q222.39-620 252.31-620H600v-80q0-50-35-85t-85-35q-43.54 0-76 27.42-32.46 27.43-41.15 68.12-2.85 10.92-12.08 17.69Q341.54-700 330-700q-12.77 0-21.38-8.5-8.62-8.5-6.39-20.04 10.54-64.38 60.54-107.92Q412.77-880 480-880q74.92 0 127.46 52.54Q660-774.92 660-700v80h47.69q29.92 0 51.12 21.19Q780-577.61 780-547.69v375.38q0 29.92-21.19 51.12Q737.61-100 707.69-100H252.31Zm0-60h455.38q5.39 0 8.85-3.46t3.46-8.85v-375.38q0-5.39-3.46-8.85t-8.85-3.46H252.31q-5.39 0-8.85 3.46t-3.46 8.85v375.38q0 5.39 3.46 8.85t8.85 3.46ZM480-290q29.15 0 49.58-20.42Q550-330.85 550-360t-20.42-49.58Q509.15-430 480-430t-49.58 20.42Q410-389.15 410-360t20.42 49.58Q450.85-290 480-290ZM240-160v-400 400Z"],
    "menu": ["0 -960 960 960", "M170-254.62q-12.75 0-21.37-8.63-8.63-8.62-8.63-21.38 0-12.75 8.63-21.37 8.62-8.61 21.37-8.61h620q12.75 0 21.37 8.62 8.63 8.63 8.63 21.39 0 12.75-8.63 21.37-8.62 8.61-21.37 8.61H170ZM170-450q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q157.25-510 170-510h620q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q802.75-450 790-450H170Zm0-195.39q-12.75 0-21.37-8.62-8.63-8.63-8.63-21.39 0-12.75 8.63-21.37 8.62-8.61 21.37-8.61h620q12.75 0 21.37 8.63 8.63 8.62 8.63 21.38 0 12.75-8.63 21.37-8.62 8.61-21.37 8.61H170Z"],
    "more-horiz": ["0 -960 960 960", "M249.23-420q-24.75 0-42.37-17.63-17.63-17.62-17.63-42.37 0-24.75 17.63-42.37Q224.48-540 249.23-540q24.75 0 42.38 17.63 17.62 17.62 17.62 42.37 0 24.75-17.62 42.37Q273.98-420 249.23-420ZM480-420q-24.75 0-42.37-17.63Q420-455.25 420-480q0-24.75 17.63-42.37Q455.25-540 480-540q24.75 0 42.37 17.63Q540-504.75 540-480q0 24.75-17.63 42.37Q504.75-420 480-420Zm230.77 0q-24.75 0-42.38-17.63-17.62-17.62-17.62-42.37 0-24.75 17.62-42.37Q686.02-540 710.77-540q24.75 0 42.37 17.63 17.63 17.62 17.63 42.37 0 24.75-17.63 42.37Q735.52-420 710.77-420Z"],
    "notifications": ["0 -960 960 960", "M210-204.62q-12.75 0-21.37-8.62-8.63-8.63-8.63-21.39 0-12.75 8.63-21.37 8.62-8.61 21.37-8.61h42.31v-298.47q0-80.69 49.81-142.69 49.8-62 127.88-79.31V-810q0-20.83 14.57-35.42Q459.14-860 479.95-860q20.82 0 35.43 14.58Q530-830.83 530-810v24.92q78.08 17.31 127.88 79.31 49.81 62 49.81 142.69v298.47H750q12.75 0 21.37 8.62 8.63 8.63 8.63 21.39 0 12.75-8.63 21.37-8.62 8.61-21.37 8.61H210Zm270-293.07Zm-.07 405.38q-29.85 0-51.04-21.24-21.2-21.24-21.2-51.07h144.62q0 29.93-21.26 51.12-21.26 21.19-51.12 21.19Zm-167.62-172.3h335.38v-298.47q0-69.46-49.11-118.57-49.12-49.12-118.58-49.12-69.46 0-118.58 49.12-49.11 49.11-49.11 118.57v298.47Z"],
    "open-in-new": ["0 -960 960 960", "M212.31-140Q182-140 161-161q-21-21-21-51.31v-535.38Q140-778 161-799q21-21 51.31-21h222.3q12.77 0 21.39 8.62 8.61 8.61 8.61 21.38T456-768.62q-8.62 8.62-21.39 8.62h-222.3q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v535.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h535.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-222.3q0-12.77 8.62-21.39 8.61-8.61 21.38-8.61t21.38 8.61q8.62 8.62 8.62 21.39v222.3Q820-182 799-161q-21 21-51.31 21H212.31ZM760-717.85 409.85-367.69q-8.31 8.3-20.89 8.5-12.57.19-21.27-8.5-8.69-8.7-8.69-21.08 0-12.38 8.69-21.08L717.85-760H590q-12.77 0-21.38-8.62Q560-777.23 560-790t8.62-21.38Q577.23-820 590-820h193.84q15.47 0 25.81 10.35Q820-799.31 820-783.84V-590q0 12.77-8.62 21.38Q802.77-560 790-560t-21.38-8.62Q760-577.23 760-590v-127.85Z"],
    "palette": ["0 -960 960 960", "M479.23-100q-77.77 0-146.92-29.96-69.16-29.96-120.77-81.58-51.62-51.61-81.58-120.96T100-480q0-79.15 30.77-148.5t83.58-120.65q52.8-51.31 123.54-81.08Q408.62-860 488.77-860q75 0 142.15 25.58 67.16 25.58 117.96 70.81 50.81 45.23 80.96 107.5Q860-593.85 860-521.08q0 103.85-61.73 162.46Q736.54-300 640-300h-72.46q-17.08 0-27.31 11.15Q530-277.69 530-262.46q0 18.54 15 38.54T560-178q0 39.61-21.92 58.81Q516.15-100 479.23-100Zm.77-380Zm-220 30q21.38 0 35.69-14.31Q310-478.62 310-500q0-21.38-14.31-35.69Q281.38-550 260-550q-21.38 0-35.69 14.31Q210-521.38 210-500q0 21.38 14.31 35.69Q238.62-450 260-450Zm120-160q21.38 0 35.69-14.31Q430-638.62 430-660q0-21.38-14.31-35.69Q401.38-710 380-710q-21.38 0-35.69 14.31Q330-681.38 330-660q0 21.38 14.31 35.69Q358.62-610 380-610Zm200 0q21.38 0 35.69-14.31Q630-638.62 630-660q0-21.38-14.31-35.69Q601.38-710 580-710q-21.38 0-35.69 14.31Q530-681.38 530-660q0 21.38 14.31 35.69Q558.62-610 580-610Zm120 160q21.38 0 35.69-14.31Q750-478.62 750-500q0-21.38-14.31-35.69Q721.38-550 700-550q-21.38 0-35.69 14.31Q650-521.38 650-500q0 21.38 14.31 35.69Q678.62-450 700-450ZM479.23-160q9.77 0 15.27-4.81T500-178q0-14-15-31.46t-15-54.69q0-42.77 29-69.31T570-360h70q70.62 0 115.31-41.38Q800-442.77 800-521.08q0-121.38-93.08-200.15Q613.85-800 488.77-800q-137.15 0-232.96 93T160-480q0 133 93.5 226.5T479.23-160Z"],
    "payments": ["0 -960 960 960", "M550-451.54q-41.92 0-70.96-29.04Q450-509.62 450-551.54q0-41.92 29.04-70.96 29.04-29.04 70.96-29.04 41.92 0 70.96 29.04Q650-593.46 650-551.54q0 41.92-29.04 70.96-29.04 29.04-70.96 29.04ZM286.15-327.69q-29.82 0-51.06-21.24-21.24-21.24-21.24-51.07v-303.08q0-29.82 21.24-51.06 21.24-21.24 51.06-21.24h527.69q29.83 0 51.07 21.24 21.24 21.24 21.24 51.06V-400q0 29.83-21.24 51.07-21.24 21.24-51.07 21.24H286.15Zm60-60h407.7q0-29.92 21.24-51.12Q796.33-460 826.15-460v-183.08q-29.92 0-51.11-21.24-21.19-21.24-21.19-51.06h-407.7q0 29.92-21.24 51.11-21.24 21.19-51.06 21.19V-460q29.92 0 51.11 21.24 21.19 21.24 21.19 51.07Zm390.77 200H146.16q-29.83 0-51.07-21.24Q73.85-230.17 73.85-260v-366.15q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.37 8.62 8.62 8.63 8.62 21.38V-260q0 4.61 3.84 8.46 3.85 3.85 8.47 3.85h590.76q12.75 0 21.38 8.63 8.62 8.62 8.62 21.38t-8.62 21.37q-8.63 8.62-21.38 8.62Zm-450.77-200h-12.3V-715.38h12.3q-5 0-8.65 3.65-3.65 3.65-3.65 8.65V-400q0 5 3.65 8.65 3.65 3.66 8.65 3.66Z"],
    "pets": ["0 -960 960 960", "M180.02-485q-37.79 0-63.9-26.09Q90-537.19 90-574.98t26.09-63.9Q142.19-665 179.98-665t63.9 26.09Q270-612.81 270-575.02t-26.09 63.9Q217.81-485 180.02-485Zm180-160q-37.79 0-63.9-26.09Q270-697.19 270-734.98t26.09-63.9Q322.19-825 359.98-825t63.9 26.09Q450-772.81 450-735.02t-26.09 63.9Q397.81-645 360.02-645Zm240 0q-37.79 0-63.9-26.09Q510-697.19 510-734.98t26.09-63.9Q562.19-825 599.98-825t63.9 26.09Q690-772.81 690-735.02t-26.09 63.9Q637.81-645 600.02-645Zm180 160q-37.79 0-63.9-26.09Q690-537.19 690-574.98t26.09-63.9Q742.19-665 779.98-665t63.9 26.09Q870-612.81 870-575.02t-26.09 63.9Q817.81-485 780.02-485ZM266-85q-41.15 0-68.58-31.53Q170-148.05 170-191q0-50.46 34.92-87.35 34.93-36.88 68.77-73.73 29-31.38 50.2-67.69 21.19-36.31 49.8-68.31 20.85-24.07 47.79-40.5Q448.42-545 480-545q32.01 0 59.31 15.62 27.3 15.61 47.77 40.07 28 32 49.3 68.62 21.31 36.61 49.93 68.61 33.84 36.85 68.77 73.73Q790-241.46 790-191q0 42.95-27.42 74.47Q735.15-85 694-85q-54 0-107-9t-107-9q-54 0-107 9t-107 9Z"],
    "picture-as-pdf": ["0 -960 960 960", "M388.46-542.31h44.62q15.03 0 25.21-10.17 10.17-10.17 10.17-25.21v-44.62q0-15.04-10.17-25.21-10.18-10.17-25.21-10.17h-62.31q-7.08 0-12.39 5.31-5.3 5.3-5.3 12.38v160q0 7.08 5.3 12.38 5.31 5.31 12.39 5.31 7.08 0 12.38-5.31 5.31-5.3 5.31-12.38v-62.31Zm0-35.38v-44.62h44.62v44.62h-44.62Zm199.23 115.38q15.04 0 25.21-10.17 10.18-10.17 10.18-25.21v-124.62q0-15.04-10.18-25.21-10.17-10.17-25.21-10.17h-60.77q-7.07 0-12.38 5.31-5.31 5.3-5.31 12.38v160q0 7.08 5.31 12.38 5.31 5.31 12.38 5.31h60.77Zm-43.08-35.38v-124.62h43.08v124.62h-43.08Zm158.47-44.62h30q7.07 0 12.38-5.31 5.31-5.3 5.31-12.38 0-7.08-5.31-12.38-5.31-5.31-12.38-5.31h-30v-44.62h30q7.07 0 12.38-5.31 5.31-5.3 5.31-12.38 0-7.08-5.31-12.38-5.31-5.31-12.38-5.31h-47.7q-7.07 0-12.38 5.31-5.31 5.3-5.31 12.38v160q0 7.08 5.31 12.38 5.31 5.31 12.38 5.31 7.08 0 12.39-5.31 5.31-5.3 5.31-12.38v-62.31ZM322.31-260Q292-260 271-281q-21-21-21-51.31v-455.38Q250-818 271-839q21-21 51.31-21h455.38Q808-860 829-839q21 21 21 51.31v455.38Q850-302 829-281q-21 21-51.31 21H322.31Zm0-60h455.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-455.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H322.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v455.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85Zm-140 200Q152-120 131-141q-21-21-21-51.31v-485.38q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.38 8.62 8.61 8.63 8.61 21.38v485.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h485.38q12.75 0 21.38 8.63 8.62 8.63 8.62 21.38 0 12.76-8.62 21.37-8.63 8.62-21.38 8.62H182.31ZM310-800v480-480Z"],
    "pie-chart": ["0 -960 960 960", "M510-510h288.77q-11.54-115.77-92.27-196.69-80.73-80.93-196.5-92.08V-510Zm-60 348.77v-637.54q-123.69 11.15-206.85 102.42Q160-605.08 160-480t83.15 216.35Q326.31-172.38 450-161.23Zm60 0Q625.77-171.77 706.81-253q81.04-81.23 91.96-197H510v288.77ZM480-480Zm.07 380q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 147.88 29.96 69.04 29.96 120.65 81.58 51.62 51.61 81.58 120.61Q860-558.86 860-479.88q0 78.03-29.92 147.33-29.92 69.29-81.21 121.02-51.29 51.73-120.63 81.63T480.07-100Z"],
    "pie-chart-fill": ["0 -960 960 960", "M510-510v-346.77q140.69 11.16 237.65 108.62Q844.61-650.69 856.77-510H510Zm-59.38 405.77q-147-11.16-247-119.16T103.62-480q0-149.61 100-257.61t247-119.16v752.54Zm59.38 0v-346.39h346.77q-10.93 140.31-108.5 238.08Q650.69-114.77 510-104.23Z"],
    "receipt-long": ["0 -960 960 960", "M240-100q-41.92 0-70.96-29.04Q140-158.08 140-200v-63.84q0-15.47 10.35-25.81Q160.69-300 176.16-300H260v-532.54q0-6.23 5.04-8.34 5.04-2.12 9.65 1.73l29.39 24.38q5.23 4.46 11.31 4.46 6.07 0 11.3-4.46l33.54-27.38q5.23-4.46 11.31-4.46t11.31 4.46l33.54 27.38q5.23 4.46 11.3 4.46 6.08 0 11.31-4.46l33.54-27.38q5.23-4.46 11.31-4.46 6.07 0 11.3 4.46l33.54 27.38q5.23 4.46 11.31 4.46t11.31-4.46l33.54-27.38q5.23-4.46 11.3-4.46 6.08 0 11.31 4.46L641-814.77q5.23 4.46 11.31 4.46 6.07 0 11.3-4.46l33.54-27.38q5.23-4.46 11.31-4.46t11.31 4.46l33.54 27.38q5.23 4.46 11.3 4.46 6.08 0 11.31-4.46l29.39-24.38q4.61-3.85 9.65-1.73 5.04 2.11 5.04 8.34V-200q0 41.92-29.04 70.96Q761.92-100 720-100H240Zm480-60q17 0 28.5-11.5T760-200v-560H320v460h323.85q15.46 0 25.8 10.35Q680-279.31 680-263.84V-200q0 17 11.5 28.5T720-160ZM397.69-670h166.93q12.76 0 21.38 8.62 8.61 8.61 8.61 21.38T586-618.62q-8.62 8.62-21.38 8.62H397.69q-12.77 0-21.38-8.62-8.62-8.61-8.62-21.38t8.62-21.38q8.61-8.62 21.38-8.62Zm0 120h166.93q12.76 0 21.38 8.62 8.61 8.61 8.61 21.38T586-498.62q-8.62 8.62-21.38 8.62H397.69q-12.77 0-21.38-8.62-8.62-8.61-8.62-21.38t8.62-21.38q8.61-8.62 21.38-8.62Zm280-54.62q-14.69 0-25.04-10.34-10.34-10.35-10.34-25.04t10.34-25.04q10.35-10.34 25.04-10.34t25.04 10.34q10.35 10.35 10.35 25.04t-10.35 25.04q-10.35 10.34-25.04 10.34Zm0 120q-14.69 0-25.04-10.34-10.34-10.35-10.34-25.04t10.34-25.04q10.35-10.34 25.04-10.34t25.04 10.34q10.35 10.35 10.35 25.04t-10.35 25.04q-10.35 10.34-25.04 10.34ZM240-160h380v-80H200v40q0 17 11.5 28.5T240-160Zm-40 0v-80 80Z"],
    "redeem": ["0 -960 960 960", "M160-288.46v76.15q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h615.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-76.15H160Zm12.31-410.77H283q-5-9-7.46-19t-2.46-21q0-41.92 29.04-70.96 29.04-29.04 70.96-29.04 25.15 0 46.53 13.07 21.38 13.07 37.31 32.47l22.31 29.85 22.31-29.85q15.31-20.15 37.06-32.85 21.76-12.69 46.87-12.69 41.84 0 70.87 29.04 29.04 29.04 29.04 70.96 0 11-2.27 21t-7.65 19h112.23q30.31 0 51.31 21 21 21 21 51.31v414.61Q860-182 839-161q-21 21-51.31 21H172.31Q142-140 121-161q-21-21-21-51.31v-414.61q0-30.31 21-51.31 21-21 51.31-21ZM160-391.54h640v-235.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H569.07l63.85 87.77q7.31 10.54 5.89 22.19-1.43 11.65-11.97 18.96-10.53 7.31-22.19 5.58-11.65-1.73-18.96-11.66L479.23-660.92 372.77-516.39q-7.31 9.93-18.96 11.66-11.65 1.73-22.19-5.58-10.54-7.31-12.27-18.96-1.73-11.65 5.57-22.19l63.24-87.77H172.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v235.38Zm213.08-307.69q17 0 28.5-11.5t11.5-28.5q0-17-11.5-28.5t-28.5-11.5q-17 0-28.5 11.5t-11.5 28.5q0 17 11.5 28.5t28.5 11.5Zm212.3 0q17 0 28.5-11.5t11.5-28.5q0-17-11.5-28.5t-28.5-11.5q-17 0-28.5 11.5t-11.5 28.5q0 17 11.5 28.5t28.5 11.5Z"],
    "remove": ["0 -960 960 960", "M250-450q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q237.25-510 250-510h460q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q722.75-450 710-450H250Z"],
    "repeat": ["0 -960 960 960", "m255.54-216.16 51.69 51.7q8.92 8.92 8.81 20.88-.12 11.96-8.81 21.27-9.31 9.31-21.38 9.62-12.08.3-21.39-9l-99.15-99.16q-5.62-5.61-7.92-11.84-2.31-6.23-2.31-13.46 0-7.24 2.31-13.47 2.3-6.23 7.92-11.84l99.15-99.16q8.93-8.92 21.19-8.8 12.27.11 21.58 9.42 8.69 9.31 9 21.08.31 11.77-9 21.07l-51.69 51.7h418.31q5.38 0 8.84-3.47 3.46-3.46 3.46-8.84v-117.69q0-12.77 8.62-21.39 8.61-8.61 21.38-8.61t21.39 8.61q8.61 8.62 8.61 21.39v117.69q0 29.92-21.19 51.11-21.19 21.19-51.11 21.19H255.54Zm448.92-467.69H286.15q-5.38 0-8.84 3.47-3.46 3.46-3.46 8.84v117.69q0 12.77-8.62 21.39-8.61 8.61-21.38 8.61t-21.39-8.61q-8.61-8.62-8.61-21.39v-117.69q0-29.92 21.19-51.11 21.19-21.19 51.11-21.19h418.31l-51.69-51.7q-8.92-8.92-8.81-20.88.12-11.96 8.81-21.27 9.31-9.31 21.38-9.62 12.08-.3 21.39 9l99.15 99.16q5.62 5.61 7.92 11.84 2.31 6.23 2.31 13.46 0 7.24-2.31 13.47-2.3 6.23-7.92 11.84l-99.15 99.16q-8.93 8.92-21.19 8.8-12.27-.11-21.58-9.42-8.69-9.31-9-21.08-.31-11.77 9-21.07l51.69-51.7Z"],
    "restaurant": ["0 -960 960 960", "M290-595.38V-840q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q350-852.75 350-840v244.62h55.39V-840q0-12.75 8.62-21.37 8.63-8.63 21.39-8.63 12.75 0 21.37 8.63 8.61 8.62 8.61 21.37v244.62q0 53.69-33.34 92.42-33.35 38.73-82.04 49.27V-120q0 12.75-8.63 21.37Q332.74-90 319.99-90q-12.76 0-21.37-8.63Q290-107.25 290-120v-333.69q-48.69-10.54-82.04-49.27-33.34-38.73-33.34-92.42V-840q0-12.75 8.63-21.37 8.62-8.63 21.38-8.63 12.75 0 21.37 8.63 8.61 8.62 8.61 21.37v244.62H290ZM674.61-410h-73.02q-15.51 0-25.86-10.39-10.34-10.4-10.34-25.76V-680q0-75.39 43.61-132.69Q652.61-870 697.61-870q16.85 0 26.93 12.08 10.07 12.07 10.07 30.31V-120q0 12.75-8.63 21.37Q717.36-90 704.6-90q-12.75 0-21.37-8.63-8.62-8.62-8.62-21.37v-290Z"],
    "savings": ["0 -960 960 960", "M248.15-140q-21.84 0-41.61-14.85-19.77-14.84-26-36.31-25-86.3-40.42-146.26-15.43-59.97-24.35-103.39-8.92-43.42-12.35-75.77Q100-548.92 100-580q0-83.54 58.23-141.77Q216.46-780 300-780h210q27-36 66-58t84-22q16.54 0 28.27 11.73T700-820q0 4.08-1.12 7.96-1.11 3.89-2.34 7.73-4.39 11.77-8.46 25.46-4.08 13.7-7.62 34.77L784.54-640h39.3q15.47 0 25.81 10.35Q860-619.31 860-603.84v181.92q0 11.84-6.73 21.07t-18.58 13.46l-83.85 27.62-50.38 168.15q-7.23 23.7-26.31 37.66Q655.08-140 630.77-140h-58.46q-29.92 0-51.12-21.19Q500-182.39 500-212.31V-220H380v7.69q0 29.92-21.19 51.12Q337.61-140 307.69-140h-59.54Zm1.85-60h57.69q5.39 0 8.85-3.46t3.46-8.85V-280h240v67.69q0 5.39 3.46 8.85t8.85 3.46h58.46q4.23 0 7.5-2.31 3.27-2.31 4.42-6.54L702-406l98-33v-141h-40L620-720q0-18.85 2.69-38.62 2.69-19.76 8.08-37-27.85 7.62-50.42 28.08Q557.77-747.08 547-720H300q-58 0-99 41t-41 99q0 40.23 20.23 137.04t57.08 233.34q1.15 4.23 4.81 6.93Q245.77-200 250-200Zm390-324.62q14.69 0 25.04-10.34 10.34-10.35 10.34-25.04t-10.34-25.04q-10.35-10.34-25.04-10.34t-25.04 10.34q-10.34 10.35-10.34 25.04t10.34 25.04q10.35 10.34 25.04 10.34ZM490-610q12.77 0 21.38-8.62Q520-627.23 520-640t-8.62-21.38Q502.77-670 490-670H350q-12.77 0-21.38 8.62Q320-652.77 320-640t8.62 21.38Q337.23-610 350-610h140Zm-10 112Z"],
    "school": ["0 -960 960 960", "M257.77-286.7q-17.69-9.84-27.73-26.56T220-350.77v-173.54l-79.84-44.15q-9.85-5.62-14.46-13.67-4.62-8.04-4.62-17.88t4.62-17.87q4.61-8.04 14.46-13.66l305.4-166.4q8.13-4.52 16.75-6.64 8.62-2.11 17.69-2.11 9.07 0 17.69 2.11 8.62 2.12 16.77 6.63l344.92 187.72q9.23 5 14.16 13.52 4.92 8.53 4.92 18.4v236q0 12.75-8.63 21.38-8.63 8.62-21.38 8.62-12.76 0-21.37-8.62-8.62-8.63-8.62-21.38v-224.46L740-524.31v173.54q0 20.79-10.04 37.51t-27.73 26.56L514.54-185.23q-8.23 4.61-16.85 6.73-8.62 2.11-17.69 2.11-9.07 0-17.69-2.11-8.62-2.12-16.85-6.73L257.77-286.7Zm217.61-167.61q2.7 1.54 4.81 1.54 2.12 0 4.81-1.54L753.62-600 485-745.31q-2.69-1.54-4.81-1.54-2.11 0-4.81 1.54L206.38-600l269 145.69ZM475-237.16q2.69 1.54 5 1.54t5-1.54l189.23-102.23q3.08-1.92 4.42-4.42 1.35-2.5 1.35-6.35v-142.15l-164.85 90.54q-8.23 4.61-17.07 6.73-8.85 2.12-18.08 2.12-9.23 0-18.08-2.12-8.84-2.12-17.07-6.73L280-492.31v142.15q0 3.08 1.35 5.97 1.34 2.88 4.42 4.8L475-237.16Zm5-215.22Zm0 94.07Zm0 0Z"],
    "search": ["0 -960 960 960", "M380.77-335.39q-102.46 0-173.54-71.07-71.07-71.08-71.07-173.54t71.07-173.54q71.08-71.07 173.54-71.07t173.54 71.07q71.07 71.08 71.07 173.54 0 42.85-14.38 81.85-14.39 39-38.39 67.84l230.16 230.16q8.31 8.3 8.5 20.88.19 12.58-8.5 21.27t-21.08 8.69q-12.38 0-21.07-8.69L530.46-388.16q-30 24.77-69 38.77-39 14-80.69 14Zm0-59.99q77.31 0 130.96-53.66 53.66-53.65 53.66-130.96t-53.66-130.96q-53.65-53.66-130.96-53.66t-130.96 53.66Q196.15-657.31 196.15-580t53.66 130.96q53.65 53.66 130.96 53.66Z"],
    "send": ["0 -960 960 960", "m748.92-446.46-558.3 235.38q-18.08 7.23-34.35-3.11Q140-224.54 140-244.23v-471.54q0-19.69 16.27-30.04 16.27-10.34 34.35-3.11l558.3 235.38q22.31 9.85 22.31 33.54 0 23.69-22.31 33.54ZM200-280l474-200-474-200v147.69L416.92-480 200-427.69V-280Zm0 0v-400 400Z"],
    "settings": ["0 -960 960 960", "M435.69-100q-20.46 0-35.34-13.58-14.89-13.57-18.12-33.42l-9.77-74.85q-16.07-5.38-32.96-15.07-16.88-9.7-30.19-20.77L240-228.23q-18.85 8.31-37.88 1.61-19.04-6.69-29.58-24.3l-45.08-78.16q-10.54-17.61-6.07-37.27 4.46-19.65 20.46-32.42l59.92-45q-1.38-8.92-1.96-17.92-.58-9-.58-17.93 0-8.53.58-17.34t1.96-19.27l-59.92-45q-16-12.77-20.27-32.62-4.27-19.84 6.27-37.46l44.69-77q10.54-17.23 29.58-24.11 19.03-6.89 37.88 1.42l68.92 29.08q14.47-11.46 30.89-20.96t32.27-15.27L382.23-813q3.23-19.85 18.12-33.42Q415.23-860 435.69-860h88.62q20.46 0 35.34 13.58 14.89 13.57 18.12 33.42l9.77 75.23q18 6.54 32.57 15.27 14.58 8.73 29.43 20.58L720.39-731q18.84-8.31 37.88-1.42 19.04 6.88 29.57 24.11l44.7 77.39q10.54 17.61 6.07 37.27-4.46 19.65-20.46 32.42l-61.46 46.15q2.15 9.69 2.35 18.12.19 8.42.19 16.96 0 8.15-.39 16.58-.38 8.42-2.76 19.27l60.3 45.38q16 12.77 20.66 32.42 4.65 19.66-5.89 37.27l-45.31 77.77q-10.53 17.62-29.76 24.31-19.23 6.69-38.08-1.62l-68.46-29.46q-14.85 11.85-30.31 20.96-15.46 9.12-31.69 14.89L577.77-147q-3.23 19.85-18.12 33.42Q544.77-100 524.31-100h-88.62Zm4.31-60h78.62L533-267.15q30.62-8 55.96-22.73 25.35-14.74 48.89-37.89L737.23-286l39.39-68-86.77-65.38q5-15.54 6.8-30.47 1.81-14.92 1.81-30.15 0-15.62-1.81-30.15-1.8-14.54-6.8-29.7L777.38-606 738-674l-100.54 42.38q-20.08-21.46-48.11-37.92-28.04-16.46-56.73-23.31L520-800h-79.38l-13.24 106.77q-30.61 7.23-56.53 22.15-25.93 14.93-49.47 38.46L222-674l-39.38 68L269-541.62q-5 14.24-7 29.62t-2 32.38q0 15.62 2 30.62 2 15 6.62 29.62l-86 65.38L222-286l99-42q22.77 23.38 48.69 38.31 25.93 14.92 57.31 22.92L440-160Zm40.46-200q49.92 0 84.96-35.04 35.04-35.04 35.04-84.96 0-49.92-35.04-84.96Q530.38-600 480.46-600q-50.54 0-85.27 35.04T360.46-480q0 49.92 34.73 84.96Q429.92-360 480.46-360ZM480-480Z"],
    "settings-fill": ["0 -960 960 960", "M435.69-100q-20.46 0-35.34-13.58-14.89-13.57-18.12-33.42l-9.77-74.85q-16.07-5.38-32.96-15.07-16.88-9.7-30.19-20.77L240-228.23q-18.85 8.31-37.88 1.61-19.04-6.69-29.58-24.3l-45.08-78.16q-10.54-17.61-6.07-37.27 4.46-19.65 20.46-32.42l59.92-45q-1.38-8.92-1.96-17.92-.58-9-.58-17.93 0-8.53.58-17.34t1.96-19.27l-59.92-45q-16-12.77-20.27-32.62-4.27-19.84 6.27-37.46l44.69-77q10.54-17.23 29.58-24.11 19.03-6.89 37.88 1.42l68.92 29.08q14.47-11.46 30.89-20.96t32.27-15.27L382.23-813q3.23-19.85 18.12-33.42Q415.23-860 435.69-860h88.62q20.46 0 35.34 13.58 14.89 13.57 18.12 33.42l9.77 75.23q18 6.54 32.57 15.27 14.58 8.73 29.43 20.58L720.39-731q18.84-8.31 37.88-1.42 19.04 6.88 29.57 24.11l44.7 77.39q10.54 17.61 6.07 37.27-4.46 19.65-20.46 32.42l-61.46 46.15q2.15 9.69 2.35 18.12.19 8.42.19 16.96 0 8.15-.39 16.58-.38 8.42-2.76 19.27l60.3 45.38q16 12.77 20.66 32.42 4.65 19.66-5.89 37.27l-45.31 77.77q-10.53 17.62-29.76 24.31-19.23 6.69-38.08-1.62l-68.46-29.46q-14.85 11.85-30.31 20.96-15.46 9.12-31.69 14.89L577.77-147q-3.23 19.85-18.12 33.42Q544.77-100 524.31-100h-88.62Zm44.77-260q49.92 0 84.96-35.04 35.04-35.04 35.04-84.96 0-49.92-35.04-84.96Q530.38-600 480.46-600q-50.54 0-85.27 35.04T360.46-480q0 49.92 34.73 84.96Q429.92-360 480.46-360Z"],
    "shield": ["0 -960 960 960", "M480-105.16q-6.23 0-12.23-1t-11.62-3q-126.53-45-201.34-159.57Q180-383.31 180-516v-180.15q0-22.79 13.11-41.03 13.1-18.23 33.89-26.43l227.69-85q12.85-4.62 25.31-4.62 12.46 0 25.31 4.62l227.69 85q20.79 8.2 33.89 26.43Q780-718.94 780-696.15V-516q0 132.69-74.81 247.27-74.81 114.57-201.34 159.57-5.62 2-11.62 3-6 1-12.23 1Zm0-58.84q104-33 172-132t68-220v-180.54q0-3.84-2.12-6.92-2.11-3.08-5.96-4.62l-227.69-85q-1.92-.77-4.23-.77-2.31 0-4.23.77l-227.69 85q-3.85 1.54-5.96 4.62-2.12 3.08-2.12 6.92V-516q0 121 68 220t172 132Zm0-315.23Z"],
    "shopping-bag": ["0 -960 960 960", "M252.31-100Q222-100 201-121q-21-21-21-51.31v-455.38Q180-658 201-679q21-21 51.31-21H330v-10q0-62.15 43.92-106.08Q417.85-860 480-860t106.08 43.92Q630-772.15 630-710v10h77.69Q738-700 759-679q21 21 21 51.31v455.38Q780-142 759-121q-21 21-51.31 21H252.31Zm0-60h455.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-455.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H630v90q0 12.77-8.62 21.38Q612.77-520 600-520t-21.38-8.62Q570-537.23 570-550v-90H390v90q0 12.77-8.62 21.38Q372.77-520 360-520t-21.38-8.62Q330-537.23 330-550v-90h-77.69q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v455.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM390-700h180v-10q0-37.61-26.19-63.81Q517.62-800 480-800q-37.62 0-63.81 26.19Q390-747.61 390-710v10ZM240-160v-480 480Z"],
    "shopping-cart": ["0 -960 960 960", "M286.15-97.69q-29.15 0-49.57-20.43-20.42-20.42-20.42-49.57 0-29.16 20.42-49.58 20.42-20.42 49.57-20.42 29.16 0 49.58 20.42 20.42 20.42 20.42 49.58 0 29.15-20.42 49.57-20.42 20.43-49.58 20.43Zm387.7 0q-29.16 0-49.58-20.43-20.42-20.42-20.42-49.57 0-29.16 20.42-49.58 20.42-20.42 49.58-20.42 29.15 0 49.57 20.42t20.42 49.58q0 29.15-20.42 49.57Q703-97.69 673.85-97.69ZM240.61-730 342-517.69h272.69q3.46 0 6.16-1.73 2.69-1.73 4.61-4.81l107.31-195q2.31-4.23.38-7.5-1.92-3.27-6.54-3.27h-486Zm-28.76-60h555.38q24.54 0 37.11 20.89 12.58 20.88 1.2 42.65L677.38-494.31q-9.84 17.31-26.03 26.96-16.2 9.66-35.5 9.66H324l-46.31 84.61q-3.08 4.62-.19 10 2.88 5.39 8.65 5.39h427.7q12.76 0 21.38 8.61 8.61 8.62 8.61 21.39 0 12.77-8.61 21.38-8.62 8.62-21.38 8.62h-427.7q-40 0-60.11-34.5-20.12-34.5-1.42-68.89l57.07-102.61L136.16-810H90q-12.77 0-21.38-8.62Q60-827.23 60-840t8.62-21.38Q77.23-870 90-870h61.15q10.24 0 19.08 5.42 8.85 5.43 13.46 15.27L211.85-790ZM342-517.69h280-280Z"],
    "spa": ["0 -960 960 960", "M454.92-105.77Q390.69-118 328.54-147.5q-62.15-29.5-110.96-82.08-48.81-52.57-78.96-129.84-30.16-77.27-30.16-184.42v-7.24q0-12.46 7.85-20.3 7.85-7.85 20.31-7.85h6.46q46.38 0 102.11 16.46t99.27 44q7.93-70.54 37.08-146.04 29.15-75.49 72.08-135.8Q464.08-815.3 480-815.3q15.92 0 26.38 14.69 42.93 60.31 72.08 136.19T615.54-518q42.38-26.38 97.34-43.23 54.96-16.85 103.27-18l5.54-.38q12.69-.39 21.65 8.57 8.97 8.96 8.58 21.66l-.38 6.3q-2.7 97.16-28.81 170.77-26.12 73.62-70.31 126.58-44.19 52.96-104.04 86.5-59.84 33.54-130.23 51.54-13 3.15-31.61 3.53-18.62.39-31.62-1.61ZM485.69-162q-11-165-99.5-250.5T169.69-518q-2 0 0 0 11 169 102.5 254t213.5 102q2 1 0 .5t0-.5ZM402-482q21.15 17.77 42.58 43.19Q466-413.38 480-389.84q14.23-23.54 35.54-48.97Q536.85-464.23 558-482q-1.23-58.92-21.73-123.61-20.5-64.7-56.27-124.85v.5-.5q-35.77 60.15-56.27 124.65T402-482Zm110.46 157.69q12 32 20.12 67.31 8.11 35.31 13.11 79.31 41-13.93 82.54-39.27 41.54-25.35 75.35-65.92 33.8-40.58 57.65-98.31 23.85-57.73 29.08-136.81 0-2 0 0-95.54 14-168.85 65.38-73.31 51.39-109 128.31Z"],
    "subscriptions": ["0 -960 960 960", "M172.31-100Q142-100 121-121q-21-21-21-51.31v-375.38Q100-578 121-599q21-21 51.31-21h615.38Q818-620 839-599q21 21 21 51.31v375.38Q860-142 839-121q-21 21-51.31 21H172.31Zm0-60h615.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-375.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H172.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v375.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85Zm265.61-77.54 161.69-107.38q8.23-5.62 8.23-15.08t-8.23-15.08L437.92-482.46q-9.23-6.23-18.57-1.31Q410-478.84 410-468v216q0 10.84 9.35 15.77 9.34 4.92 18.57-1.31ZM200-675.38q-12.77 0-21.38-8.62-8.62-8.61-8.62-21.38t8.62-21.39q8.61-8.61 21.38-8.61h560q12.77 0 21.38 8.61 8.62 8.62 8.62 21.39 0 12.77-8.62 21.38-8.61 8.62-21.38 8.62H200Zm120-115.39q-12.77 0-21.38-8.61Q290-808 290-820.77q0-12.77 8.62-21.38 8.61-8.62 21.38-8.62h320q12.77 0 21.38 8.62 8.62 8.61 8.62 21.38t-8.62 21.39q-8.61 8.61-21.38 8.61H320ZM160-160v-400 400Z"],
    "swap-horiz": ["0 -960 960 960", "m214.92-336.54 92.31 92.31q8.31 8.31 8.5 20.58.19 12.26-8.5 21.57-9.31 9.31-21.38 9.31-12.08 0-21.39-9.31L125.31-341.23q-5.62-5.62-7.92-11.85-2.31-6.23-2.31-13.46t2.31-13.46q2.3-6.23 7.92-11.85l139.77-139.77q8.92-8.92 20.88-8.8 11.96.11 21.27 9.42 8.69 9.31 9 21.08.31 11.77-9 21.07l-92.31 92.31h261.23q12.77 0 21.39 8.62 8.61 8.61 8.61 21.38t-8.61 21.39q-8.62 8.61-21.39 8.61H214.92Zm530.16-227.31H483.85q-12.77 0-21.39-8.61-8.61-8.62-8.61-21.39 0-12.76 8.61-21.38 8.62-8.61 21.39-8.61h261.23l-92.31-92.31q-8.31-8.31-8.5-20.58-.19-12.27 8.5-21.58 9.31-9.3 21.38-9.3 12.08 0 21.39 9.3l139.15 139.16q5.62 5.61 7.92 11.84 2.31 6.23 2.31 13.46 0 7.24-2.31 13.47-2.3 6.23-7.92 11.84L694.92-428.77q-8.92 8.92-20.88 8.81-11.96-.12-21.27-9.42-8.69-9.31-9-21.08-.31-11.77 9-21.08l92.31-92.31Z"],
    "swap-horiz-fill": ["0 -960 960 960", "m214.92-336.54 92.31 92.31q8.31 8.31 8.5 20.58.19 12.26-8.5 21.57-9.31 9.31-21.38 9.31-12.08 0-21.39-9.31L125.31-341.23q-5.62-5.62-7.92-11.85-2.31-6.23-2.31-13.46t2.31-13.46q2.3-6.23 7.92-11.85l139.77-139.77q8.92-8.92 20.88-8.8 11.96.11 21.27 9.42 8.69 9.31 9 21.08.31 11.77-9 21.07l-92.31 92.31h261.23q12.77 0 21.39 8.62 8.61 8.61 8.61 21.38t-8.61 21.39q-8.62 8.61-21.39 8.61H214.92Zm530.16-227.31H483.85q-12.77 0-21.39-8.61-8.61-8.62-8.61-21.39 0-12.76 8.61-21.38 8.62-8.61 21.39-8.61h261.23l-92.31-92.31q-8.31-8.31-8.5-20.58-.19-12.27 8.5-21.58 9.31-9.3 21.38-9.3 12.08 0 21.39 9.3l139.15 139.16q5.62 5.61 7.92 11.84 2.31 6.23 2.31 13.46 0 7.24-2.31 13.47-2.3 6.23-7.92 11.84L694.92-428.77q-8.92 8.92-20.88 8.81-11.96-.12-21.27-9.42-8.69-9.31-9-21.08-.31-11.77 9-21.08l92.31-92.31Z"],
    "sync": ["0 -960 960 960", "M230-477.23q0 46.88 17.75 91.15 17.74 44.27 55.33 81.77l25.38 25.39v-79.54q0-12.75 8.63-21.38 8.63-8.62 21.38-8.62 12.76 0 21.38 8.62 8.61 8.63 8.61 21.38v149.23q0 15.36-10.39 25.76-10.4 10.39-25.76 10.39H203.08q-12.75 0-21.38-8.63-8.62-8.63-8.62-21.38 0-12.76 8.62-21.37 8.63-8.62 21.38-8.62H290l-29.08-27.84q-49.3-45.62-70.11-102.2Q170-419.69 170-477.23q0-90.54 46.46-164.92 46.46-74.39 124.77-114.62 10.92-6.08 22.96-1.38 12.04 4.69 15.89 16.72 3.84 11.28-.47 22.78-4.32 11.51-15.3 17.65-61.46 33.15-97.89 92.65Q230-548.84 230-477.23Zm500-5.54q0-46.88-17.75-91.15-17.74-44.27-55.33-81.77l-25.38-25.39v79.54q0 12.75-8.63 21.38-8.63 8.62-21.38 8.62-12.76 0-21.38-8.62-8.61-8.63-8.61-21.38v-149.23q0-15.36 10.39-25.76 10.4-10.39 25.76-10.39h149.23q12.75 0 21.38 8.63 8.62 8.63 8.62 21.38 0 12.76-8.62 21.37-8.63 8.62-21.38 8.62H670l29.08 27.84q47.39 47.39 69.16 103.01Q790-540.46 790-482.71q0 90.48-46.27 164.67-46.27 74.19-124.58 114.42-10.92 6.08-22.96 1.58-12.04-4.5-15.88-16.53-3.85-11.28.5-22.81 4.34-11.54 14.88-17.62 61.46-33.15 97.89-92.65Q730-411.16 730-482.77Z"],
    "table-view": ["0 -960 960 960", "M372.31-140q-29.83 0-51.07-21.24Q300-182.48 300-212.31v-375.38q0-29.83 21.24-51.07Q342.48-660 372.31-660h375.38q29.83 0 51.07 21.24Q820-617.52 820-587.69v375.38q0 29.83-21.24 51.07Q777.52-140 747.69-140H372.31Zm24.61-366.92h326.16q15.69 0 26.3-10.62Q760-528.15 760-543.84v-19.24q0-15.69-10.62-26.3Q738.77-600 723.08-600H396.92q-15.69 0-26.3 10.62Q360-578.77 360-563.08v19.24q0 15.69 10.62 26.3 10.61 10.62 26.3 10.62Zm116.16 153.84h93.84v-93.84h-93.84v93.84Zm0 153.08h93.84v-93.08h-93.84V-200ZM360-353.08h93.08v-93.84h-56.93q-15.36 0-25.76 10.39Q360-426.14 360-410.77v57.69Zm306.92 0H760v-57.69q0-15.37-10.39-25.76-10.4-10.39-25.76-10.39h-56.93v93.84Zm-213.84 60H360v56.93q0 15.36 10.39 25.76Q380.79-200 396.15-200h56.93v-93.08Zm213.84 0V-200h56.93q15.36 0 25.76-10.39Q760-220.79 760-236.15v-56.93h-93.08ZM140-747.69q0-29.83 21.24-51.07Q182.48-820 212.31-820H630q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q642.75-760 630-760H212.31q-5.39 0-8.85 3.46t-3.46 8.85V-330q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q140-317.25 140-330v-417.69Z"],
    "theaters": ["0 -960 960 960", "M230-210v50q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q170-147.25 170-160v-640q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q230-812.75 230-800v50h100v-43.85q0-15.36 10.39-25.76Q350.79-830 366.15-830h227.7q15.36 0 25.76 10.39Q630-809.21 630-793.85V-750h100v-50q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q790-812.75 790-800v640q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63-12.76 0-21.37-8.63Q730-147.25 730-160v-50H630v43.85q0 15.36-10.39 25.76Q609.21-130 593.85-130h-227.7q-15.36 0-25.76-10.39Q330-150.79 330-166.15V-210H230Zm0-60h100v-100H230v100Zm0-160h100v-100H230v100Zm0-160h100v-100H230v100Zm400 320h100v-100H630v100Zm0-160h100v-100H630v100Zm0-160h100v-100H630v100ZM390-190h180v-580H390v580Zm0-580h180-180Z"],
    "tune": ["0 -960 960 960", "M479.99-130q-12.76 0-21.37-8.63Q450-147.25 450-160v-160q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q510-332.75 510-320v50h290q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q812.75-210 800-210H510v50q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63ZM160-210q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q147.25-270 160-270h160q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q332.75-210 320-210H160Zm159.99-160q-12.76 0-21.37-8.63Q290-387.25 290-400v-50H160q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q147.25-510 160-510h130v-50q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q350-572.75 350-560v160q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63ZM480-450q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q467.25-510 480-510h320q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q812.75-450 800-450H480Zm159.99-160q-12.76 0-21.37-8.63Q610-627.25 610-640v-160q0-12.75 8.63-21.37 8.63-8.63 21.38-8.63 12.76 0 21.37 8.63Q670-812.75 670-800v50h130q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q812.75-690 800-690H670v50q0 12.75-8.63 21.37-8.63 8.63-21.38 8.63ZM160-690q-12.75 0-21.37-8.63-8.63-8.63-8.63-21.38 0-12.76 8.63-21.37Q147.25-750 160-750h320q12.75 0 21.37 8.63 8.63 8.63 8.63 21.38 0 12.76-8.63 21.37Q492.75-690 480-690H160Z"],
    "upload": ["0 -960 960 960", "M252.31-180Q222-180 201-201q-21-21-21-51.31v-78.46q0-12.77 8.62-21.38 8.61-8.62 21.38-8.62t21.38 8.62q8.62 8.61 8.62 21.38v78.46q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85h455.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-78.46q0-12.77 8.62-21.38 8.61-8.62 21.38-8.62t21.38 8.62q8.62 8.61 8.62 21.38v78.46Q780-222 759-201q-21 21-51.31 21H252.31ZM450-664.46l-76.92 76.92q-8.93 8.92-21.19 8.81-12.27-.12-21.58-9.43-8.69-9.3-9-21.07-.31-11.77 9-21.08l124.38-124.38q5.62-5.62 11.85-7.92 6.23-2.31 13.46-2.31t13.46 2.31q6.23 2.3 11.85 7.92l124.38 124.38q8.92 8.92 8.81 20.89-.12 11.96-8.81 21.26-9.31 9.31-21.38 9.62-12.08.31-21.39-9L510-664.46v306q0 12.77-8.62 21.38-8.61 8.62-21.38 8.62t-21.38-8.62q-8.62-8.61-8.62-21.38v-306Z"],
    "visibility": ["0 -960 960 960", "M480.09-336.92q67.99 0 115.49-47.59t47.5-115.58q0-67.99-47.59-115.49t-115.58-47.5q-67.99 0-115.49 47.59t-47.5 115.58q0 67.99 47.59 115.49t115.58 47.5ZM480-392q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 172q-126.31 0-231.04-67.39-104.73-67.38-167.19-177.3-5-8.62-7.31-17.37-2.3-8.75-2.3-17.96t2.3-17.94q2.31-8.73 7.31-17.35 62.46-109.92 167.19-177.3Q353.69-780 480-780q126.31 0 231.04 67.39 104.73 67.38 167.19 177.3 5 8.62 7.31 17.37 2.3 8.75 2.3 17.96t-2.3 17.94q-2.31 8.73-7.31 17.35-62.46 109.92-167.19 177.3Q606.31-220 480-220Zm0-280Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"],
    "visibility-off": ["0 -960 960 960", "M595.08-615.08q24.38 24.39 37.69 59.27 13.31 34.89 10.07 70.04 0 11.54-8.3 19.54-8.31 8-19.85 8-11.54 0-19.54-8t-8-19.54q3.85-26.38-4.34-50-8.19-23.61-25.19-40.61t-41-25.81q-24-8.81-50.62-4.58-11.54.39-19.92-7.73-8.39-8.11-8.77-19.65-.39-11.54 7.42-19.93 7.81-8.38 19.35-8.76 34.92-4 70.19 9.11 35.27 13.12 60.81 38.65ZM480-720q-21.31 0-41.81 2.08-20.5 2.07-40.81 6.84-12.77 2.62-23-3.65t-14.07-18.04q-3.85-12.15 2.54-23.11 6.38-10.96 18.53-13.58 24.16-5.77 48.81-8.15Q454.85-780 480-780q128.92 0 236.85 67 107.92 67 165.99 181.31 4 7.61 5.81 15.34 1.81 7.73 1.81 16.35 0 8.62-1.5 16.35-1.5 7.73-5.5 15.34-18.38 38.46-44.69 71.73t-57.93 61.12q-9.3 8.31-21.26 6.88-11.97-1.42-19.66-11.96-7.69-10.54-6.38-22.61 1.31-12.08 10.61-20.39 27.08-24.54 49.39-53.65Q815.85-466.31 832-500q-50-101-144.5-160.5T480-720Zm0 500q-126.31 0-231.54-67.5Q143.23-355 81.16-465.31q-5-7.61-7.31-16.54-2.31-8.92-2.31-18.15 0-9.23 2-17.85 2-8.61 7-16.84 22.31-40.77 50.54-77.66 28.23-36.88 64.92-66.11l-90.31-90.93q-8.3-8.92-8.19-21.19.12-12.27 8.81-20.96 8.69-8.69 21.08-8.69 12.38 0 21.07 8.69l663.08 663.08q8.31 8.31 8.81 20.57.5 12.27-8.81 21.58-8.69 8.69-21.08 8.69-12.38 0-21.07-8.69L628.62-245.85q-35.39 13.69-72.74 19.77Q518.54-220 480-220ZM238.16-636.31q-35.16 27.16-63.2 61.42Q146.92-540.62 128-500q50 101 144.5 160.5T480-280q25.77 0 50.73-3.46 24.96-3.46 49.58-10.69L529.69-346q-12.15 5.31-24.27 7.19-12.11 1.89-25.42 1.89-68.08 0-115.58-47.5T316.92-500q0-13.31 2.08-25.42 2.08-12.12 7-24.27l-87.84-86.62ZM541-531Zm-131.77 65.77Z"],
    "warning": ["0 -960 960 960", "M137.02-140q-10.17 0-18.27-4.97t-12.59-13.11q-4.68-8.08-5.15-17.5-.47-9.42 5.08-18.66l342.43-591.52q5.56-9.24 13.9-13.66 8.35-4.42 17.58-4.42 9.23 0 17.58 4.42 8.34 4.42 13.9 13.66l342.43 591.52q5.55 9.24 5.08 18.66-.47 9.42-5.15 17.5-4.49 8.14-12.59 13.11-8.1 4.97-18.27 4.97H137.02ZM178-200h604L480-720 178-200Zm302-47.69q13.73 0 23.02-9.29t9.29-23.02q0-13.73-9.29-23.02T480-312.31q-13.73 0-23.02 9.29T447.69-280q0 13.73 9.29 23.02t23.02 9.29Zm.01-104.62q12.76 0 21.37-8.62 8.62-8.63 8.62-21.38v-140q0-12.75-8.63-21.37-8.63-8.63-21.38-8.63-12.76 0-21.37 8.63-8.62 8.62-8.62 21.37v140q0 12.75 8.63 21.38 8.63 8.62 21.38 8.62ZM480-460Z"],
    "work": ["0 -960 960 960", "M172.31-140Q142-140 121-161q-21-21-21-51.31v-415.38Q100-658 121-679q21-21 51.31-21H340v-67.69Q340-798 361-819q21-21 51.31-21h135.38Q578-840 599-819q21 21 21 51.31V-700h167.69Q818-700 839-679q21 21 21 51.31v415.38Q860-182 839-161q-21 21-51.31 21H172.31Zm0-60h615.38q4.62 0 8.46-3.85 3.85-3.84 3.85-8.46v-415.38q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H172.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46v415.38q0 4.62 3.85 8.46 3.84 3.85 8.46 3.85ZM400-700h160v-67.69q0-4.62-3.85-8.46-3.84-3.85-8.46-3.85H412.31q-4.62 0-8.46 3.85-3.85 3.84-3.85 8.46V-700ZM160-200v-440 440Z"]
  };
  function icon(name, size = 22, cls = "") {
    const i = ICONS[name] || ICONS["help"];
    return `<svg class="ic${cls ? " " + cls : ""}" width="${size}" height="${size}" viewBox="${i[0]}" aria-hidden="true" focusable="false"><path d="${i[1]}"/></svg>`;
  }

  // js/ui.js
  var $ = (s, root = document) => root.querySelector(s);
  var $$ = (s, root = document) => [...root.querySelectorAll(s)];
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  var attr = esc;
  function toast(msg, ms = 2600) {
    const box = $("#toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    box.append(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, ms);
  }
  var dlgQueue = [];
  var dlgBusy = false;
  var blocked = () => false;
  var setDialogGuard = (fn) => {
    blocked = fn;
  };
  function runDialog(build) {
    if (blocked()) return Promise.resolve(null);
    return new Promise((resolve) => {
      dlgQueue.push({ build, resolve });
      pump();
    });
  }
  function pump() {
    if (dlgBusy || !dlgQueue.length) return;
    if (blocked()) {
      while (dlgQueue.length) dlgQueue.shift().resolve(null);
      return;
    }
    dlgBusy = true;
    const { build, resolve } = dlgQueue.shift();
    const d = $("#appDialog");
    const o = build();
    d.className = "appDialog" + (o.notice ? " notice" : "") + (o.danger ? " danger" : "");
    d.innerHTML = `<form method="dialog" novalidate>
    <div class="dialogHead"><div><h3 id="appDialogTitle">${esc(o.title)}</h3>${o.message ? `<p class="dlgMsg">${esc(o.message)}</p>` : ""}</div>
      <button type="button" class="icon closeX" data-x aria-label="Fechar">${icon("close", 20)}</button></div>
    ${o.input ? `<label class="field"><span>${esc(o.input.label || "")}</span><input id="appDialogInput" autocomplete="off" maxlength="${o.input.max || 60}" value="${attr(o.input.value || "")}" ${o.input.type ? `type="${o.input.type}" inputmode="${o.input.inputmode || ""}"` : ""}></label>` : ""}
    <div class="appDialogActions">${o.notice ? "" : `<button type="button" class="btn soft" data-cancel>${esc(o.cancel || "Cancelar")}</button>`}
      <button class="btn ${o.danger ? "danger" : "primary"}" data-ok value="ok">${esc(o.ok || "OK")}</button></div></form>`;
    let result = null;
    const done = (r) => {
      result = r;
      d.close();
    };
    d.querySelector("[data-x]").onclick = () => done(null);
    const c = d.querySelector("[data-cancel]");
    if (c) c.onclick = () => done("cancel");
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      done(o.input ? d.querySelector("#appDialogInput").value : "ok");
    };
    d.onclose = () => {
      dlgBusy = false;
      resolve(result);
      setTimeout(pump, 0);
    };
    d.oncancel = (e) => {
      e.preventDefault();
      done(null);
    };
    d.showModal();
    (d.querySelector("#appDialogInput") || d.querySelector("[data-ok]")).focus();
  }
  var notice = (title, message) => runDialog(() => ({ title, message, notice: true, ok: "OK" }));
  var confirmDlg = (title, message, o = {}) => runDialog(() => ({ title, message, ...o }));
  var ask = async (title, message, o = {}) => await confirmDlg(title, message, o) === "ok";
  var promptDlg = (title, message, input2, o = {}) => runDialog(() => ({ title, message, input: input2, ok: o.ok || "Salvar", cancel: o.cancel }));
  var dialogOpen = () => $("#appDialog")?.open || $("#sheet")?.open;
  function closeDialogs() {
    while (dlgQueue.length) dlgQueue.shift().resolve(null);
    const d = $("#appDialog");
    if (d?.open) d.close();
    closeSheet();
  }
  var sheetOnClose = null;
  function openSheet(o) {
    const phantom = blocked();
    const d = phantom ? document.createElement("dialog") : $("#sheet");
    if (d.open) {
      sheetOnClose = null;
      d.close();
    }
    d.className = "sheet" + (o.wide ? " wide" : "");
    d.innerHTML = `<div class="sheetInner"><div class="handle" aria-hidden="true"></div>
    <div class="dialogHead"><div><h3 id="sheetTitle">${esc(o.title)}</h3>${o.subtitle ? `<p class="dlgMsg">${esc(o.subtitle)}</p>` : ""}</div>
      <button type="button" class="icon closeX" data-close aria-label="Fechar">${icon("close", 20)}</button></div>
    <div class="sheetBody">${o.body}</div></div>`;
    if (phantom) return d;
    sheetOnClose = o.onClose || null;
    d.querySelector("[data-close]").onclick = () => closeSheet();
    d.oncancel = (e) => {
      e.preventDefault();
      closeSheet();
    };
    d.showModal();
    o.onMount?.(d);
    const first = d.querySelector(".sheetBody input:not([type=hidden]):not([type=checkbox]):not([readonly]), .sheetBody select, .sheetBody textarea");
    if (first && window.matchMedia("(min-width: 900px)").matches) first.focus();
    else d.querySelector("[data-close]").focus();
    return d;
  }
  function closeSheet() {
    const d = $("#sheet");
    if (!d?.open) return;
    const cb = sheetOnClose;
    sheetOnClose = null;
    d.close();
    cb?.();
  }
  var field = (label, inner, o = {}) => `<label class="field${o.cls ? " " + o.cls : ""}"${o.id ? ` id="${o.id}"` : ""}${o.hidden ? " hidden" : ""}><span>${esc(label)}</span>${inner}${o.hint ? `<small class="hint">${esc(o.hint)}</small>` : ""}</label>`;
  var input = (name, value = "", o = {}) => `<input name="${name}" value="${attr(value)}"${o.type ? ` type="${o.type}"` : ""}${o.placeholder ? ` placeholder="${attr(o.placeholder)}"` : ""}${o.max ? ` maxlength="${o.max}"` : ""}${o.inputmode ? ` inputmode="${o.inputmode}"` : ""}${o.required ? " required" : ""} autocomplete="off"${o.extra || ""}>`;
  var moneyInput = (name, value = "", placeholder = "0,00") => input(name, value, { inputmode: "decimal", placeholder, max: 20 });
  var select = (name, options, value) => `<select name="${name}">${options.map(([v, l]) => `<option value="${attr(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  var check = (name, label, on, o = {}) => `<label class="switchRow"><span><b>${esc(label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span><input type="checkbox" role="switch" name="${name}"${on ? " checked" : ""}${o.disabled ? " disabled" : ""}></label>`;
  var btn = (label, o = {}) => `<button type="${o.submit ? "submit" : "button"}" class="btn ${o.cls || "soft"}"${o.act ? ` data-act="${o.act}"` : ""}${o.id ? ` id="${o.id}"` : ""}${o.data ? Object.entries(o.data).map(([k, v]) => ` data-${k}="${attr(v)}"`).join("") : ""}${o.label ? ` aria-label="${attr(o.label)}"` : ""}${o.disabled ? " disabled" : ""}>${o.icon ? icon(o.icon, o.iconSize || 20) : ""}${label ? `<span>${esc(label)}</span>` : ""}</button>`;
  var eyebrow = (t) => `<small class="eyebrow">${esc(t)}</small>`;
  var pageTitle = (id, eyebrowText, title, sub) => `<div class="pageTitle"><small class="eyebrow">${esc(eyebrowText)}</small><h2 id="${id}">${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>`;
  var formData = (form) => Object.fromEntries([...new FormData(form).entries()]);
  var why = (text) => `<details class="why"><summary>${icon("help", 16)}<span>Por quê?</span></summary><p>${esc(text)}</p></details>`;

  // js/ctx.js
  var APP_VERSION = "1.1.2";
  var ctx = {
    state: null,
    // dados (AppState do core)
    device: null,
    // configurações deste aparelho (store.js)
    store: null,
    dict: null,
    // dicionário do assistente
    today: todayStr(),
    view: "home",
    cols: 1,
    // colunas do layout (1 celular; 2 ou 3 no computador)
    locked: false,
    problem: false,
    moves: { from: null, to: null, q: "", kind: "", st: "", limit: 300 },
    // preenchidos por app.js
    commit: null,
    replace: null,
    render: null,
    setDevice: null,
    go: null,
    openMoves: null,
    lockNow: null
  };
  var hidden = () => !!ctx.state?.privacy;
  var money = (c) => hidden() ? "R$ ••••" : Money.format(c);
  var CAT_ICONS = [
    ["shopping-cart", "|alimentacao|mercado|supermercado|comida|feira|"],
    ["restaurant", "|restaurante|delivery|lanche|lanches|"],
    ["directions-car", "|transporte|carro|uber|mobilidade|"],
    ["local-gas-station", "|combustivel|gasolina|posto|"],
    ["home", "|moradia|casa|aluguel|contas|"],
    ["favorite", "|saude|farmacia|medico|"],
    ["fitness-center", "|academia|esporte|esportes|"],
    ["theaters", "|lazer|diversao|entretenimento|viagem|"],
    ["subscriptions", "|assinaturas|assinatura|streaming|"],
    ["school", "|educacao|estudos|escola|faculdade|cursos|"],
    ["more-horiz", "|outros|outro|diversos|"],
    ["payments", "|salario|pagamento|pro labore|"],
    ["attach-money", "|extra|extras|renda extra|freela|bonus|"],
    ["savings", "|investimentos|investimento|poupanca|rendimentos|reserva|"],
    ["pets", "|pets|pet|animais|"],
    ["checkroom", "|vestuario|roupas|roupa|"],
    ["shopping-bag", "|compras|shopping|"],
    ["spa", "|beleza|cuidados pessoais|estetica|"],
    ["receipt-long", "|impostos|taxas|tarifas|impostos e taxas|"],
    ["redeem", "|presentes|doacoes|presente|doacao|"],
    ["account-balance", "|emprestimo|emprestimos|financiamento|banco|dividas|"],
    ["work", "|trabalho|adiantamento quinzenal|adiantamento|comissao|"]
  ];
  function categoryIcon(cat) {
    if (cat === CARD_PAYMENT_CAT) return "credit-card";
    const key = `|${Text.fold(cat)}|`;
    const f = CAT_ICONS.find(([, names]) => names.includes(key));
    return f ? f[0] : null;
  }

  // js/report.js
  var TOP = 10;
  var MAX_CHART_MONTHS = 24;
  var sum2 = (l) => l.reduce((n, t) => n + t.value, 0);
  var cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  function buildReport(s, from, to, today2) {
    if (to < from) throw new Error("período inválido");
    const days = dayNum(to) - dayNum(from) + 1;
    const inRange = (t, a, b) => t.date >= a && t.date <= b;
    const period2 = s.txs.filter((t) => inRange(t, from, to));
    const flows = period2.filter(isFlow), done = flows.filter((t) => t.paid);
    const inc = done.filter((t) => t.kind === "income"), exp = done.filter((t) => t.kind === "expense");
    const pending2 = flows.filter((t) => !t.paid);
    const prevTo = addDays(from, -1), prevFrom = addDays(prevTo, 1 - days);
    const prevDone = s.txs.filter((t) => isFlow(t) && t.paid && inRange(t, prevFrom, prevTo));
    let span = 0;
    for (let m = ymOf(from); m <= ymOf(to); m++) {
      const a = from > ymFirst(m) ? from : ymFirst(m), b = to < ymLast(m) ? to : ymLast(m);
      span += (dayNum(b) - dayNum(a) + 1) / ymLen(m);
    }
    const byCategory = (l, limits) => {
      const total = sum2(l), g = /* @__PURE__ */ new Map();
      for (const t of l) {
        const x = g.get(t.category);
        if (x) x.push(t);
        else g.set(t.category, [t]);
      }
      return [...g].map(([name, list]) => {
        const value = sum2(list);
        const monthlyLimit = limits?.has(name) ? limits.get(name) : null;
        const monthlyAverage = Math.round(value / Math.max(span, 1));
        return {
          name,
          value,
          percent: total > 0 ? value * 100 / total : 0,
          count: list.length,
          monthlyAverage,
          monthlyLimit,
          overLimit: monthlyLimit != null && monthlyAverage > monthlyLimit
        };
      }).sort((a, b) => b.value - a.value || cmp(a.name, b.name));
    };
    const months = [];
    for (let m = ymOf(from); m <= ymOf(to); m++) {
      const l = done.filter((t) => ymOf(t.date) === m);
      const income2 = sum2(l.filter((t) => t.kind === "income")), expense2 = sum2(l.filter((t) => t.kind === "expense"));
      months.push({ ym: m, income: income2, expense: expense2, balance: income2 - expense2 });
    }
    const income = sum2(inc), expense = sum2(exp);
    return {
      from,
      to,
      days,
      monthSpan: span,
      income,
      expense,
      balance: income - expense,
      savingsRate: income > 0 ? (income - expense) * 100 / income : null,
      dailyAverage: days > 0 ? Math.trunc(expense / days) : 0,
      pendingIncome: sum2(pending2.filter((t) => t.kind === "income")),
      pendingExpense: sum2(pending2.filter((t) => t.kind === "expense")),
      prevFrom,
      prevTo,
      prevIncome: sum2(prevDone.filter((t) => t.kind === "income")),
      prevExpense: sum2(prevDone.filter((t) => t.kind === "expense")),
      expenseByCategory: byCategory(exp, s.limits),
      incomeByCategory: byCategory(inc, null),
      months,
      topExpenses: [...exp].sort((a, b) => b.value - a.value || cmp(a.date, b.date)).slice(0, TOP),
      txs: [...period2].sort((a, b) => cmp(a.date, b.date) || (a.kind !== "income") - (b.kind !== "income") || cmp(a.desc, b.desc)),
      accounts: s.accounts.map((a) => [a.name, Finance.accountBalance(s, a)]),
      goals: s.goals.map((g) => ({
        name: g.name,
        saved: g.saved,
        target: g.target,
        deadline: g.deadline,
        percent: g.target > 0 ? Math.min(100, g.saved * 100 / g.target) : 0
      }))
    };
  }
  function one(v) {
    const x = Math.round(v * 10) / 10;
    return x === Math.floor(x) ? String(x) : String(x).replace(".", ",");
  }
  function compact(c) {
    const r = Math.abs(c) / 100;
    const s = r < 1e3 ? "R$ " + Math.round(r) : r < 1e6 ? `R$ ${one(r / 1e3)} mil` : `R$ ${one(r / 1e6)} mi`;
    return c < 0 ? "-" + s : s;
  }
  function niceStep(max, ticks = 4) {
    if (max <= 0) return 1e4;
    const raw = max / ticks, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
    const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return Math.max(Math.round(f * mag), 100);
  }
  var reportFileName = (from, to) => `relatorio-finan-plus-${from}-a-${to}.pdf`;
  var PRESETS = [["mes", "Este mês"], ["anterior", "Mês passado"], ["ano", "Este ano"], ["12m", "12 meses"], ["tudo", "Tudo"]];
  function preset(key, today2, first, last) {
    const ym = ymOf(today2), y = ymYear(ym);
    switch (key) {
      case "mes":
        return [ymFirst(ym), ymLast(ym)];
      case "anterior":
        return [ymFirst(ym - 1), ymLast(ym - 1)];
      case "ano":
        return [`${y}-01-01`, `${y}-12-31`];
      case "12m":
        return [ymFirst(ym - 11), ymLast(ym)];
      default: {
        const a = first && first < ymFirst(ym) ? first : ymFirst(ym);
        const b = last && last > today2 ? last : today2;
        return [a, b];
      }
    }
  }

  // js/pdf-metrics.js
  var HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1e3, 556, 556, 333, 1e3, 667, 333, 1e3, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1e3, 333, 1e3, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1e3, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500];
  var HELVETICA_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 0, 278, 556, 500, 1e3, 556, 556, 333, 1e3, 667, 333, 1e3, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1e3, 333, 1e3, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1e3, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556];

  // js/pdf.js
  var W2 = 595;
  var H = 842;
  var M = 36;
  var CW = W2 - 2 * M;
  var FOOTER = 28;
  var hex = (n) => [n >> 16 & 255, n >> 8 & 255, n & 255];
  var INK = hex(1581624);
  var MUTED = hex(5989753);
  var ACCENT = hex(3825608);
  var GREEN = hex(1798993);
  var RED = hex(11549263);
  var CARD = hex(15988477);
  var LINE = hex(14541806);
  var TRACK = hex(15133685);
  var WHITE = hex(16777215);
  var ZEBRA = hex(16317182);
  var SERIES = [3825608, 14711343, 1810039, 11549263, 8085961, 2792885, 12884506, 9080729].map(hex);
  var PDF_SERIES = [3825608, 14711343, 1810039, 11549263, 8085961, 2792885, 12884506, 9080729].map((n) => "#" + n.toString(16).toUpperCase().padStart(6, "0"));
  var over = (a, fg, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
  var CP1252 = {
    8364: 128,
    8218: 130,
    402: 131,
    8222: 132,
    8230: 133,
    8224: 134,
    8225: 135,
    710: 136,
    8240: 137,
    352: 138,
    8249: 139,
    338: 140,
    381: 142,
    8216: 145,
    8217: 146,
    8220: 147,
    8221: 148,
    8226: 149,
    8211: 150,
    8212: 151,
    732: 152,
    8482: 153,
    353: 154,
    8250: 155,
    339: 156,
    382: 158,
    376: 159,
    8722: 150,
    160: 32
  };
  function winAnsi(s) {
    const out = [];
    for (const ch of String(s).normalize("NFC")) {
      const c = ch.codePointAt(0);
      if (c >= 32 && c < 127) out.push(c);
      else if (c >= 160 && c <= 255) out.push(c);
      else if (CP1252[c]) out.push(CP1252[c]);
      else if (c === 9 || c === 10 || c === 13) out.push(32);
      else out.push(63);
    }
    return out;
  }
  function textWidth(s, size, bold = false) {
    const t = bold ? HELVETICA_BOLD : HELVETICA;
    let w = 0;
    for (const c of winAnsi(s)) w += t[c - 32] || 556;
    return w * size / 1e3;
  }
  var pdfStr = (codes) => "(" + codes.map((c) => c === 40 || c === 41 || c === 92 ? "\\" + String.fromCharCode(c) : c < 32 || c > 126 ? "\\" + c.toString(8).padStart(3, "0") : String.fromCharCode(c)).join("") + ")";
  var n2 = (v) => {
    const r = Math.round(v * 100) / 100;
    return Object.is(r, -0) ? "0" : String(r);
  };
  var rgb = (c, op) => `${n2(c[0] / 255)} ${n2(c[1] / 255)} ${n2(c[2] / 255)} ${op}`;
  var Pen = class {
    constructor(total, r, draw) {
      this.total = total;
      this.r = r;
      this.draw = draw;
      this.pages = 0;
      this.y = 0;
      this.ops = null;
      this.out = [];
      this.size = 10;
      this.bold = false;
    }
    newPage() {
      this.finishPage();
      this.pages++;
      this.ops = [];
      if (this.pages === 1) this.y = 0;
      else {
        this.text(`Finan+ · Relatório financeiro · ${brDate(this.r.from)} a ${brDate(this.r.to)}`, M, M + 4, 8, MUTED);
        this.line(M, M + 12, W2 - M, M + 12);
        this.y = M + 26;
      }
    }
    finishPage() {
      if (this.pages === 0 || !this.ops) return;
      this.text("Gerado no navegador pelo Finan+ · os dados não saem do aparelho", M, H - 18, 7.5, MUTED);
      this.text(`Página ${this.pages} de ${this.total > 0 ? this.total : this.pages}`, W2 - M, H - 18, 7.5, MUTED, { align: "right" });
      this.out.push(this.ops.join("\n"));
      this.ops = null;
    }
    finish() {
      this.finishPage();
    }
    /** garante espaço vertical h; senão, nova página */
    need(h) {
      if (this.pages === 0 || this.y + h > H - M - FOOTER) this.newPage();
    }
    font(size, bold) {
      this.size = size;
      this.bold = bold;
    }
    measure(t) {
      return textWidth(t, this.size, this.bold);
    }
    fit(t, maxW) {
      if (this.measure(t) <= maxW) return t;
      let s = [...t];
      while (s.length > 1 && this.measure(s.join("") + "…") > maxW) s.pop();
      return s.join("") + "…";
    }
    text(t, x, base, size, color, o = {}) {
      this.font(size, !!o.bold);
      const s = o.maxW > 0 ? this.fit(t, o.maxW) : t;
      if (!this.draw) return;
      const w = this.measure(s), xx = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
      this.ops.push(`BT ${rgb(color, "rg")} /${o.bold ? "F2" : "F1"} ${n2(size)} Tf ${n2(xx)} ${n2(H - base)} Td ${pdfStr(winAnsi(s))} Tj ET`);
    }
    rect(x, y0, w, h, color, radius = 0) {
      if (!this.draw || w <= 0 || h <= 0) return;
      const r = Math.min(radius, w / 2, h / 2);
      const X = x, Y = H - y0 - h;
      if (r <= 0) {
        this.ops.push(`${rgb(color, "rg")} ${n2(X)} ${n2(Y)} ${n2(w)} ${n2(h)} re f`);
        return;
      }
      const k = r * 0.5523;
      this.ops.push(`${rgb(color, "rg")} ${n2(X + r)} ${n2(Y)} m ${n2(X + w - r)} ${n2(Y)} l ${n2(X + w - r + k)} ${n2(Y)} ${n2(X + w)} ${n2(Y + r - k)} ${n2(X + w)} ${n2(Y + r)} c ${n2(X + w)} ${n2(Y + h - r)} l ${n2(X + w)} ${n2(Y + h - r + k)} ${n2(X + w - r + k)} ${n2(Y + h)} ${n2(X + w - r)} ${n2(Y + h)} c ${n2(X + r)} ${n2(Y + h)} l ${n2(X + r - k)} ${n2(Y + h)} ${n2(X)} ${n2(Y + h - r + k)} ${n2(X)} ${n2(Y + h - r)} c ${n2(X)} ${n2(Y + r)} l ${n2(X)} ${n2(Y + r - k)} ${n2(X + r - k)} ${n2(Y)} ${n2(X + r)} ${n2(Y)} c f`);
    }
    line(x0, y0, x1, y1, color = LINE, w = 0.7) {
      if (!this.draw) return;
      this.ops.push(`${rgb(color, "RG")} ${n2(w)} w ${n2(x0)} ${n2(H - y0)} m ${n2(x1)} ${n2(H - y1)} l S`);
    }
    /** arco (graus, sentido horário a partir das 3 h, como no Canvas do Android) com traço grosso */
    arc(cx, cy, rad, start, sweep, color, width) {
      if (!this.draw || sweep <= 0) return;
      const segs = Math.ceil(sweep / 90), step = sweep / segs, P = (deg) => {
        const a = deg * Math.PI / 180;
        return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
      };
      const parts = [];
      let [x, y] = P(start);
      parts.push(`${n2(x)} ${n2(H - y)} m`);
      for (let i = 0; i < segs; i++) {
        const a0 = (start + i * step) * Math.PI / 180, a1 = (start + (i + 1) * step) * Math.PI / 180;
        const k = 4 / 3 * Math.tan((a1 - a0) / 4) * rad;
        const c1 = [cx + rad * Math.cos(a0) - k * Math.sin(a0), cy + rad * Math.sin(a0) + k * Math.cos(a0)];
        const e = [cx + rad * Math.cos(a1), cy + rad * Math.sin(a1)];
        const c2 = [e[0] + k * Math.sin(a1), e[1] - k * Math.cos(a1)];
        parts.push(`${n2(c1[0])} ${n2(H - c1[1])} ${n2(c2[0])} ${n2(H - c2[1])} ${n2(e[0])} ${n2(H - e[1])} c`);
      }
      this.ops.push(`${rgb(color, "RG")} ${n2(width)} w 0 J ${parts.join(" ")} S`);
    }
  };
  var money2 = (c) => Money.format(c);
  var pct2 = (v) => String(Math.round(v * 10) / 10).replace(".", ",") + "%";
  var changeText = (v, label) => v == null ? "sem base no período anterior" : (v >= 0 ? "+" : "−") + pct2(Math.abs(v)) + ` vs. ${label}`;
  var chg = (cur, prev) => prev > 0 ? (cur - prev) * 100 / prev : null;
  var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function layout(pen, r, s, opt) {
    pen.newPage();
    header(pen, r, opt.now);
    kpis(pen, r);
    section(pen, "Despesas por categoria", "Valores realizados. Média mensal comparada com o limite mensal definido em Ajustes.", 160);
    if (!r.expenseByCategory.length) note(pen, "Sem despesas realizadas no período.");
    else {
      donut(pen, r.expenseByCategory, r.expense);
      categoryTable(pen, r.expenseByCategory, true);
    }
    section(pen, "Evolução mensal", r.months.length > 1 ? "Receitas e despesas realizadas por mês." : "Receitas e despesas realizadas no mês.", r.months.length > 1 ? 200 : 60);
    if (r.months.length > 1) monthChart(pen, r);
    monthTable(pen, r);
    section(pen, "Receitas por categoria", "Valores recebidos no período.");
    if (!r.incomeByCategory.length) note(pen, "Sem receitas recebidas no período.");
    else categoryTable(pen, r.incomeByCategory, false);
    section(pen, "Maiores despesas", `As ${TOP} maiores despesas realizadas do período.`);
    if (!r.topExpenses.length) note(pen, "Sem despesas realizadas no período.");
    else topTable(pen, r.topExpenses);
    section(pen, "Contas e metas", "Saldos e metas na data de hoje (não dependem do período).");
    accountsAndGoals(pen, r);
    if (opt.includeTransactions) {
      section(pen, "Lançamentos do período", `${r.txs.length} lançamento(s), incluindo pendentes. Pagamentos de fatura aparecem, mas não contam como despesa.`);
      if (!r.txs.length) note(pen, "Nenhum lançamento no período.");
      else txTable(pen, r, s);
    }
    section(pen, "Como ler este relatório", "", 40);
    for (const l of [
      "Receitas e despesas consideram só o que foi pago ou recebido. O que está pendente aparece em “A receber” e “A pagar”.",
      "Compras no cartão contam na data da compra; o pagamento da fatura não é uma despesa nova.",
      `A comparação usa o período anterior com o mesmo número de dias (${brDate(r.prevFrom)} a ${brDate(r.prevTo)}).`,
      "Média mensal = valor da categoria ÷ meses do período (meses incompletos contam pela fração de dias)."
    ]) para(pen, `• ${l}`);
  }
  function header(pen, r, now) {
    pen.rect(0, 0, W2, 112, ACCENT);
    pen.text("FINAN+", M, 40, 10, over(0.8, WHITE, ACCENT), { bold: true });
    pen.text("Relatório financeiro", M, 68, 24, WHITE, { bold: true });
    pen.text(`${brDate(r.from)} a ${brDate(r.to)} · ${r.days} dia(s)`, M, 92, 12, WHITE);
    const d = now || /* @__PURE__ */ new Date();
    const ds = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    pen.text(`Gerado em ${brDate(ds)} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`, W2 - M, 40, 9, over(0.87, WHITE, ACCENT), { align: "right" });
    pen.y = 132;
  }
  function kpis(pen, r) {
    pen.need(150);
    const gap = 10, w3 = (CW - 2 * gap) / 3;
    const big = [
      ["Receitas", r.income, GREEN, changeText(chg(r.income, r.prevIncome), "período anterior")],
      ["Despesas", r.expense, RED, changeText(chg(r.expense, r.prevExpense), "período anterior")],
      ["Saldo do período", r.balance, r.balance < 0 ? RED : ACCENT, r.savingsRate != null ? `${pct2(r.savingsRate)} das receitas` : "sem receitas no período"]
    ];
    big.forEach(([t, v, c, sub], i) => {
      const x = M + i * (w3 + gap);
      pen.rect(x, pen.y, w3, 72, CARD, 12);
      pen.text(t, x + 12, pen.y + 20, 9, MUTED);
      pen.text(money2(v), x + 12, pen.y + 44, 16, c, { bold: true, maxW: w3 - 24 });
      pen.text(sub, x + 12, pen.y + 61, 7.5, MUTED, { maxW: w3 - 24 });
    });
    pen.y += 82;
    const w4 = (CW - 3 * gap) / 4;
    [
      ["A receber (pendente)", money2(r.pendingIncome)],
      ["A pagar (pendente)", money2(r.pendingExpense)],
      ["Média diária de gastos", money2(r.dailyAverage)],
      ["Lançamentos", String(r.txs.length)]
    ].forEach(([l, v], i) => {
      const x = M + i * (w4 + gap);
      pen.rect(x, pen.y, w4, 48, CARD, 10);
      pen.text(l, x + 10, pen.y + 17, 8, MUTED, { maxW: w4 - 20 });
      pen.text(v, x + 10, pen.y + 36, 12, INK, { bold: true, maxW: w4 - 20 });
    });
    pen.y += 60;
  }
  function section(pen, title, sub, keep = 60) {
    pen.need(56 + keep);
    pen.y += 12;
    pen.text(title, M, pen.y + 14, 14, INK, { bold: true });
    pen.y += 22;
    if (sub) para(pen, sub);
    pen.y += 2;
  }
  function note(pen, t) {
    pen.need(20);
    pen.text(t, M, pen.y + 12, 9.5, MUTED);
    pen.y += 22;
  }
  function para(pen, t) {
    pen.font(8.5, false);
    let line = "";
    const flush = () => {
      pen.need(13);
      pen.text(line, M, pen.y + 10, 8.5, MUTED);
      pen.y += 13;
    };
    for (const w of t.split(" ")) {
      const cand = line ? `${line} ${w}` : w;
      pen.font(8.5, false);
      if (pen.measure(cand) > CW) {
        flush();
        line = w;
      } else line = cand;
    }
    if (line) flush();
    pen.y += 3;
  }
  function donut(pen, rows, total) {
    pen.need(160);
    const rest = rows.slice(7);
    const slices = rows.slice(0, 7).map((x) => [x.name, x.value]);
    if (rest.length) slices.push([`Outras (${rest.length})`, rest.reduce((n, x) => n + x.value, 0)]);
    const d = 130, cx = M + d / 2 + 6, cy = pen.y + d / 2 + 6, rad = d / 2 - 11;
    let start = -90;
    slices.forEach(([, v], i) => {
      const sweep = total > 0 ? 360 * v / total : 0;
      if (sweep > 0) pen.arc(cx, cy, rad, start, Math.max(sweep - 0.8, 0.5), SERIES[i % SERIES.length], 22);
      start += sweep;
    });
    pen.text("Total", cx, cy - 4, 8, MUTED, { align: "center" });
    pen.text(compact(total), cx, cy + 11, 11, INK, { bold: true, align: "center" });
    const lx = M + d + 30;
    let ly = pen.y + 14;
    slices.forEach(([name, v], i) => {
      pen.rect(lx, ly - 8, 9, 9, SERIES[i % SERIES.length], 2);
      pen.text(name, lx + 16, ly, 9.5, INK, { maxW: 200 });
      pen.text(money2(v), W2 - M - 52, ly, 9.5, INK, { bold: true, align: "right" });
      pen.text(pct2(total > 0 ? v * 100 / total : 0), W2 - M, ly, 9, MUTED, { align: "right" });
      ly += 16;
    });
    pen.y += Math.max(d + 16, ly - pen.y + 4);
  }
  function tableHeader(pen, cols2, rightFrom) {
    pen.need(40);
    pen.rect(M, pen.y, CW, 18, CARD, 4);
    let x = M + 6;
    cols2.forEach(([t, w], i) => {
      if (i >= rightFrom) pen.text(t, x + w - 8, pen.y + 12.5, 8, MUTED, { bold: true, align: "right" });
      else pen.text(t, x, pen.y + 12.5, 8, MUTED, { bold: true });
      x += w;
    });
    pen.y += 22;
  }
  var rowBreak = (pen, h, cols2, right) => {
    if (pen.y + h > H - M - FOOTER) {
      pen.newPage();
      tableHeader(pen, cols2, right);
    }
  };
  function categoryTable(pen, rows, withLimit) {
    const cols2 = withLimit ? [["Categoria", 128], ["", 92], ["%", 46], ["Lanç.", 38], ["Média/mês", 74], ["Limite/mês", 70], ["Valor", CW - 448]] : [["Categoria", 150], ["", 150], ["%", 50], ["Lanç.", 50], ["Valor", CW - 400]];
    tableHeader(pen, cols2, 2);
    rows.forEach((row, i) => {
      rowBreak(pen, 18, cols2, 2);
      const base = pen.y + 11, color = SERIES[Math.min(i, 7) % SERIES.length];
      let x = M + 6;
      pen.text(row.name, x, base, 9, INK, { maxW: cols2[0][1] - 8 });
      x += cols2[0][1];
      pen.rect(x, pen.y + 5, cols2[1][1] - 10, 6, TRACK, 3);
      pen.rect(x, pen.y + 5, Math.max(2, (cols2[1][1] - 10) * row.percent / 100), 6, color, 3);
      x += cols2[1][1];
      pen.text(pct2(row.percent), x + cols2[2][1] - 8, base, 8.5, MUTED, { align: "right" });
      x += cols2[2][1];
      pen.text(String(row.count), x + cols2[3][1] - 8, base, 8.5, MUTED, { align: "right" });
      x += cols2[3][1];
      if (withLimit) {
        pen.text(money2(row.monthlyAverage), x + cols2[4][1] - 8, base, 8.5, row.overLimit ? RED : INK, { align: "right" });
        x += cols2[4][1];
        pen.text(
          row.monthlyLimit != null ? money2(row.monthlyLimit) + (row.overLimit ? " · acima" : "") : "—",
          x + cols2[5][1] - 8,
          base,
          8,
          row.overLimit ? RED : MUTED,
          { align: "right", maxW: cols2[5][1] - 6 }
        );
        x += cols2[5][1];
      }
      pen.text(money2(row.value), x + cols2.at(-1)[1] - 8, base, 9, INK, { bold: true, align: "right" });
      pen.line(M, pen.y + 17, W2 - M, pen.y + 17);
      pen.y += 18;
    });
    pen.y += 6;
  }
  var monthLabel = (ym) => MONTHS[ymMonth(ym) - 1].slice(0, 3) + "/" + pad2(ymYear(ym) % 100);
  function monthChart(pen, r) {
    const months = r.months.slice(-MAX_CHART_MONTHS), ch = 150;
    pen.need(ch + 40);
    const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)));
    const step = niceStep(max), top = Math.max(step, Math.ceil(max / step) * step);
    const left = M + 52, right = W2 - M, y0 = pen.y + 6, y1 = y0 + ch;
    for (let v = 0; v <= top; v += step) {
      const yy = y1 - ch * v / top;
      pen.line(left, yy, right, yy);
      pen.text(compact(v), left - 6, yy + 3, 7.5, MUTED, { align: "right" });
    }
    const slot = (right - left) / months.length, bw = Math.min(14, slot * 0.32);
    months.forEach((m, i) => {
      const x = left + i * slot + slot / 2, hi = ch * m.income / top, he = ch * m.expense / top;
      if (hi > 0) pen.rect(x - bw - 1, y1 - hi, bw, hi, GREEN, 2);
      if (he > 0) pen.rect(x + 1, y1 - he, bw, he, RED, 2);
      if (months.length <= 12 || i % 2 === 0) pen.text(monthLabel(m.ym), x, y1 + 12, 7.5, MUTED, { align: "center" });
    });
    pen.y = y1 + 22;
    pen.rect(left, pen.y - 7, 8, 8, GREEN, 2);
    pen.text("Receitas", left + 12, pen.y, 8, MUTED);
    pen.rect(left + 70, pen.y - 7, 8, 8, RED, 2);
    pen.text("Despesas", left + 82, pen.y, 8, MUTED);
    if (r.months.length > months.length) pen.text(`Gráfico com os últimos ${months.length} meses do período; a tabela abaixo traz todos.`, right, pen.y, 7.5, MUTED, { align: "right" });
    pen.y += 14;
  }
  function monthTable(pen, r) {
    const cols2 = [["Mês", 160], ["Receitas", 120], ["Despesas", 120], ["Saldo", CW - 400]];
    tableHeader(pen, cols2, 1);
    for (const m of r.months) {
      rowBreak(pen, 18, cols2, 1);
      const base = pen.y + 11;
      let x = M + 6;
      pen.text(cap(brMonthYear(m.ym)), x, base, 9, INK);
      x += cols2[0][1];
      pen.text(money2(m.income), x + cols2[1][1] - 8, base, 9, GREEN, { align: "right" });
      x += cols2[1][1];
      pen.text(money2(m.expense), x + cols2[2][1] - 8, base, 9, RED, { align: "right" });
      x += cols2[2][1];
      pen.text(money2(m.balance), x + cols2[3][1] - 8, base, 9, m.balance < 0 ? RED : INK, { bold: true, align: "right" });
      pen.line(M, pen.y + 17, W2 - M, pen.y + 17);
      pen.y += 18;
    }
    pen.y += 6;
  }
  function topTable(pen, list) {
    const cols2 = [["Data", 70], ["Descrição", 230], ["Categoria", 120], ["Valor", CW - 420]];
    tableHeader(pen, cols2, 3);
    for (const t of list) {
      rowBreak(pen, 18, cols2, 3);
      const base = pen.y + 11;
      let x = M + 6;
      pen.text(brDate(t.date), x, base, 8.5, MUTED);
      x += cols2[0][1];
      pen.text(t.desc, x, base, 9, INK, { maxW: cols2[1][1] - 8 });
      x += cols2[1][1];
      pen.text(t.category, x, base, 8.5, MUTED, { maxW: cols2[2][1] - 8 });
      x += cols2[2][1];
      pen.text(money2(t.value), x + cols2[3][1] - 8, base, 9, RED, { bold: true, align: "right" });
      pen.line(M, pen.y + 17, W2 - M, pen.y + 17);
      pen.y += 18;
    }
    pen.y += 6;
  }
  function accountsAndGoals(pen, r) {
    const cols2 = [["Conta", 300], ["Saldo atual", CW - 300]];
    tableHeader(pen, cols2, 1);
    for (const [name, bal] of r.accounts) {
      rowBreak(pen, 18, cols2, 1);
      pen.text(name, M + 6, pen.y + 11, 9, INK, { maxW: 290 });
      pen.text(money2(bal), W2 - M - 8, pen.y + 11, 9, bal < 0 ? RED : INK, { bold: true, align: "right" });
      pen.line(M, pen.y + 17, W2 - M, pen.y + 17);
      pen.y += 18;
    }
    pen.y += 8;
    if (!r.goals.length) {
      note(pen, "Nenhuma meta cadastrada.");
      return;
    }
    for (const g of r.goals) {
      pen.need(34);
      pen.text(g.name, M, pen.y + 11, 9.5, INK, { bold: true, maxW: 260 });
      pen.text(`${money2(g.saved)} de ${money2(g.target)} · ${pct2(g.percent)}` + (g.deadline ? ` · até ${brDate(g.deadline)}` : ""), W2 - M, pen.y + 11, 8.5, MUTED, { align: "right", maxW: 260 });
      pen.rect(M, pen.y + 17, CW, 7, TRACK, 3.5);
      pen.rect(M, pen.y + 17, Math.max(3, CW * g.percent / 100), 7, ACCENT, 3.5);
      pen.y += 32;
    }
  }
  function txTable(pen, r, s) {
    const cols2 = [["Data", 58], ["Descrição", 150], ["Categoria", 90], ["Conta / cartão", 86], ["Situação", 62], ["Valor", CW - 446]];
    tableHeader(pen, cols2, 5);
    r.txs.forEach((t, i) => {
      rowBreak(pen, 17, cols2, 5);
      if (i % 2 === 1) pen.rect(M, pen.y, CW, 17, ZEBRA);
      const base = pen.y + 11.5, payment = !isFlow(t);
      let x = M + 6;
      const where = isCard(t) ? "Cartão " + (card(s, t.cardId)?.name ?? "") : account(s, t.accountId)?.name ?? "";
      const status = payment ? "Pag. fatura" : isCard(t) ? "Cartão" : t.paid ? t.kind === "income" ? "Recebido" : "Pago" : t.kind === "income" ? "A receber" : "A pagar";
      pen.text(brDate(t.date), x, base, 8, MUTED);
      x += cols2[0][1];
      pen.text(t.desc, x, base, 8.5, payment ? MUTED : INK, { maxW: cols2[1][1] - 8 });
      x += cols2[1][1];
      pen.text(t.category, x, base, 8, MUTED, { maxW: cols2[2][1] - 8 });
      x += cols2[2][1];
      pen.text(where, x, base, 8, MUTED, { maxW: cols2[3][1] - 8 });
      x += cols2[3][1];
      pen.text(status, x, base, 8, !t.paid && !payment ? ACCENT : MUTED, { maxW: cols2[4][1] - 6 });
      x += cols2[4][1];
      const color = payment ? MUTED : t.kind === "income" ? GREEN : RED;
      pen.text((t.kind === "income" ? "+ " : "− ") + money2(t.value), x + cols2[5][1] - 8, base, 8.5, color, { bold: !payment, align: "right" });
      pen.y += 17;
    });
    pen.line(M, pen.y, W2 - M, pen.y);
    pen.y += 8;
  }
  var pdfDate = (d) => `D:${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  function assemble(pages, info) {
    const objs = [];
    const add = (body) => {
      objs.push(body);
      return objs.length;
    };
    const catalog = add(null), pagesId = add(null);
    const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const kids = [];
    for (const content of pages) {
      const bytes2 = content.length;
      const c = add(`<< /Length ${bytes2} >>
stream
${content}
endstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W2} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    const infoId = add(`<< /Title ${pdfStr(winAnsi(info.title))} /Producer ${pdfStr(winAnsi(info.producer))} /Creator (Finan+) /CreationDate (${pdfDate(info.now)}) >>`);
    let out = "%PDF-1.4\n%âãÏÓ\n";
    const offsets = [];
    objs.forEach((body, i) => {
      offsets.push(out.length);
      out += `${i + 1} 0 obj
${body}
endobj
`;
    });
    const xref = out.length;
    out += `xref
0 ${objs.length + 1}
0000000000 65535 f 
` + offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
    out += `trailer
<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>
startxref
${xref}
%%EOF
`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }
  function renderPdf(r, s, opt = {}) {
    const o = { includeTransactions: opt.includeTransactions !== false, now: opt.now || /* @__PURE__ */ new Date() };
    const count = new Pen(0, r, false);
    layout(count, r, s, o);
    count.finish();
    const pen = new Pen(count.pages, r, true);
    layout(pen, r, s, o);
    pen.finish();
    const bytes = assemble(pen.out, { title: `Relatório financeiro ${brDate(r.from)} a ${brDate(r.to)}`, producer: `Finan+ web ${opt.appVersion || ""}`.trim(), now: o.now });
    return { bytes, pages: pen.pages };
  }

  // js/screens.js
  var pct1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
  var pct0 = (v) => String(Math.round(v));
  var sumOf2 = (l) => l.reduce((n, t) => n + t.value, 0);
  var cols = (...c) => ctx.cols === 1 ? c.flat().join("") : `<div class="cols cols${c.length}">${c.map((x) => `<div class="col">${x.join("")}</div>`).join("")}</div>`;
  var sectionHead = (eb, title, action = "") => `<div class="sectionHead"><div>${eyebrow(eb)}<h3>${esc(title)}</h3></div>${action}</div>`;
  var glyph = (cat) => {
    const ic = categoryIcon(cat);
    return `<span class="badge" aria-hidden="true">${ic ? icon(ic, 20) : esc([...String(cat).trim()][0]?.toUpperCase() || "•")}</span>`;
  };
  var assistOn = () => ctx.device.assistTips || ctx.device.assistAsk;
  var visibleTips = (all) => all.filter((t) => !ctx.device.dismissedTips.includes(t.id));
  function homeView() {
    const s = ctx.state, today2 = ctx.today, ym = ymOf(today2);
    const bal = Finance.currentBalance(s), fut = Finance.futureBalance(s, ymLast(ym), today2);
    const fl = Finance.monthFlow(s, ym);
    const used = fl.income > 0 ? fl.expense * 100 / fl.income : 0;
    const saved = fl.income > 0 ? Math.max(0, (fl.income - fl.expense) * 100 / fl.income) : 0;
    const summary = fl.income > 0 ? `Neste mês você usou ${pct1(used)}% das receitas.` : s.txs.length ? "Ainda não há receitas realizadas neste mês." : "Adicione seus primeiros lançamentos.";
    const hero = `<section class="hero glass" aria-label="Resumo do mês">
    <div class="heroTop"><span class="todayLabel" id="todayLabel">${esc(fullDate(today2))}</span><span class="statusPill">${icon("shield", 14)}Privado</span></div>
    <div class="balanceGrid">
      <div class="balanceCard"><span>Saldo atual</span><b class="${bal < 0 ? "negative" : ""}">${money(bal)}</b></div>
      <div class="balanceCard future"><span>Previsto p/ fim do mês</span><b class="${fut < 0 ? "negative" : ""}">${money(fut)}</b></div>
    </div>
    <div class="stats">
      <div><span>${icon("arrow-upward", 14)}Receitas do mês</span><b class="green">${money(fl.income)}</b></div>
      <div><span>${icon("arrow-downward", 14)}Despesas do mês</span><b class="red">${money(fl.expense)}</b></div>
    </div>
    <div class="progress" role="progressbar" aria-label="Receitas usadas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, used))}"><i style="width:${Math.min(100, used)}%"${used > 100 ? ' class="over"' : ""}></i></div>
    <div class="monthProgressText"><small>${esc(summary)}</small>${fl.income > 0 ? `<b class="savedPill">${pct0(saved)}% economizado</b>` : ""}</div>
  </section>`;
    const quick = `<section class="quick" aria-label="Ações rápidas">
    ${btn("Receita", { act: "new-tx", data: { kind: "income" }, icon: "add" })}
    ${btn("Despesa", { act: "new-tx", data: { kind: "expense" }, icon: "remove" })}
    ${btn("Meta", { act: "new-goal", icon: "flag" })}</section>`;
    const blocks = { hero: hero + quick, due: dueCard(), assist: homeAssistCard(), wallet: walletSection(), limits: limitsSection(), goals: goalsSection() };
    const order3 = [[blocks.hero, blocks.due], [blocks.assist, blocks.wallet], [blocks.limits, blocks.goals]];
    const order2 = [[blocks.hero, blocks.due, blocks.limits], [blocks.assist, blocks.wallet, blocks.goals]];
    const body = ctx.cols >= 3 ? cols(...order3) : ctx.cols === 2 ? cols(...order2) : [blocks.hero, blocks.due, blocks.assist, blocks.wallet, blocks.limits, blocks.goals].join("");
    return `<h2 id="homeTitle" class="srOnly">Início</h2>${body}`;
  }
  function upcoming(s, today2, days = 30) {
    const limit = addDays(today2, days), out = [];
    for (const t of s.txs) {
      if (t.paid || isCard(t) || !isFlow(t) || t.date > limit) continue;
      out.push({ kind: t.kind, title: t.desc, amount: t.value, date: t.date, late: t.date < today2, act: "edit-tx", id: t.id, sub: t.category });
    }
    for (const c of s.cards) for (const inv of Finance.cardStatus(s, c, today2).invoices)
      if (inv.open > 0 && inv.due <= limit) out.push({ kind: "invoice", title: `Fatura ${c.name}`, amount: inv.open, date: inv.due, late: inv.due < today2, act: "pay-invoice", id: c.id, sub: `${brMonthLabel(inv.ym)}${inv.closed ? " · fechada" : " · aberta"}` });
    return out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  }
  function dueCard() {
    const list = upcoming(ctx.state, ctx.today);
    if (!list.length && ctx.cols === 1) return "";
    const rows = list.slice(0, 8).map((r) => {
      const ic = r.kind === "invoice" ? "credit-card" : r.kind === "income" ? "arrow-upward" : "receipt-long";
      const when = r.date === ctx.today ? "hoje" : r.date === addDays(ctx.today, 1) ? "amanhã" : brDayMonth(r.date);
      return `<button type="button" class="dueRow${r.late ? " late" : ""}" data-act="${r.act}" data-id="${attr(r.id)}">
      <span class="dueIc ${r.kind}">${icon(ic, 18)}</span>
      <span class="meta"><b>${esc(r.title)}</b><small>${esc(r.sub)} · ${r.late ? `<span class="red">em atraso desde ${brDayMonth(r.date)}</span>` : `vence ${esc(when)}`}</small></span>
      <span class="amount ${r.kind === "income" ? "green" : ""}">${r.kind === "income" ? "+" : ""}${money(r.amount)}</span></button>`;
    }).join("");
    return `<section class="section">${sectionHead("Próximos 30 dias", "Vencimentos", list.length ? btn("Ver todos", { act: "open-moves", data: { st: "pending" }, cls: "soft small" }) : "")}
    <div class="glass compactBox dueList">${rows || '<p class="muted center">Nada a pagar ou receber nos próximos 30 dias.</p>'}
    ${list.length > 8 ? `<p class="muted small center">e mais ${list.length - 8} vencimento(s)</p>` : ""}</div></section>`;
  }
  function homeAssistCard() {
    const d = ctx.device;
    if (!assistOn()) return "";
    const s = ctx.state, today2 = ctx.today;
    let inner = "";
    let tips = [];
    if (d.assistTips) {
      const rep = Insights.report(s, today2, money);
      tips = visibleTips(Insights.tips(s, today2, money));
      inner = `<h3>${esc(rep.title)}</h3><ul class="reportLines">${rep.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>${why(rep.why)}
      ${tips.slice(0, 2).map(tipItem).join("")}
      ${!tips.length && s.txs.length ? '<p class="muted small">Nenhuma dica no momento: nada fora do padrão.</p>' : ""}`;
    } else inner = "<h3>Pergunte sobre seus gastos</h3>";
    return `<section class="glass assistCard" aria-label="Assistente">
    <div class="assistHead">${icon("auto-awesome", 16)}<small class="eyebrow">Assistente · no aparelho</small></div>${inner}
    <div class="pillRow">${d.assistTips ? btn(tips.length > 2 ? `Ver as ${tips.length} dicas` : "Abrir assistente", { act: "go", data: { view: "assist" }, cls: "pill" }) : ""}
    ${d.assistAsk ? btn("Perguntar", { act: "go", data: { view: "assist", focus: "ask" }, cls: "pill", icon: "search", iconSize: 16 }) : ""}</div></section>`;
  }
  function tipItem(t, o = {}) {
    const canOpen = t.query != null || t.from != null;
    return `<article class="tip${o.dismissed ? " dismissed" : ""}">
    <div class="tipHead"><span class="tipType">${esc(INSIGHT_LABELS[t.type])}</span>
      ${o.dismissed ? btn("Mostrar de novo", { act: "restore-tip", data: { id: t.id }, cls: "link small" }) : btn("", { act: "dismiss-tip", data: { id: t.id }, cls: "icon tiny", icon: "close", iconSize: 16, label: "Dispensar dica" })}</div>
    <b>${esc(t.title)}</b><p>${esc(t.text)}</p>
    <div class="tipFoot">${why(t.why)}${canOpen && !o.dismissed ? btn("Ver lançamentos", { act: "open-moves", data: { q: t.query ?? "", from: t.from ?? "", to: t.to ?? "" }, cls: "link small", icon: "chevron-right", iconSize: 16 }) : ""}</div></article>`;
  }
  function walletSection() {
    const s = ctx.state, today2 = ctx.today;
    const accs = s.accounts.map((a) => {
      const b = Finance.accountBalance(s, a);
      return `<button type="button" class="walletCard" data-act="edit-account" data-id="${attr(a.id)}">
    <small>${icon("account-balance-wallet", 14)}Conta</small><b class="${b < 0 ? "negative" : ""}">${money(b)}</b><span class="sub">${esc(a.name)}</span></button>`;
    }).join("");
    const cards = s.cards.map((c) => {
      const st = Finance.cardStatus(s, c, today2), cur = st.current;
      return `<div class="walletCard cardItem"><small>${icon("credit-card", 14)}${esc(c.name)}</small>
      <b>${cur ? money(cur.open) : money(0)}</b>
      <span class="sub">${cur ? `Fatura ${esc(brMonthLabel(cur.ym))} · vence ${brDayMonth(cur.due)}${cur.closed ? " · fechada" : ""}` : "Sem fatura em aberto"}</span>
      <span class="sub">Disponível ${money(st.available)}</span>
      <div class="cardActions">${cur ? btn("Pagar fatura", { act: "pay-invoice", data: { id: c.id }, cls: "primary small" }) : ""}${btn("", { act: "edit-card", data: { id: c.id }, cls: "icon tiny", icon: "edit", iconSize: 16, label: `Editar cartão ${c.name}` })}</div></div>`;
    }).join("");
    return `<section class="section">${sectionHead("Patrimônio", "Contas e cartões", btn("Gerenciar", { act: "go", data: { view: "prefs", fold: "contas" }, cls: "soft small" }))}
    <div class="${ctx.cols === 1 ? "hscroll" : "walletGrid"}">${accs}${cards}</div></section>`;
  }
  function limitsSection() {
    const s = ctx.state, usage = Finance.budgetUsage(s, ymOf(ctx.today));
    const rows = [...s.limits].map(([cat, lim]) => {
      const u = usage.get(cat) || 0, p = lim > 0 ? u * 100 / lim : 0;
      const cls = u > lim ? "over" : p >= 80 ? "warn" : "";
      const status = u > lim ? "Limite ultrapassado" : p >= 100 ? "Limite atingido" : p >= 80 ? `Atenção: ${pct0(p)}% usado` : `${pct0(p)}% usado`;
      return `<button type="button" class="budgetLine ${cls}" data-act="edit-limit" data-cat="${attr(cat)}">
      <div><b>${esc(cat)}</b><span>${money(u)} / ${money(lim)}</span></div>
      <div class="budgetTrack"><i style="width:${Math.min(100, p)}%"></i></div><small>${status}</small></button>`;
    }).join("");
    return `<section class="section">${sectionHead("Orçamento · inclui pendentes", "Limites do mês", btn("", { act: "new-limit", cls: "icon small", icon: "add", label: "Novo limite" }))}
    <div class="glass compactBox">${rows || '<p class="muted small">Defina limites em Ajustes para acompanhar seu orçamento.</p>'}</div></section>`;
  }
  function goalsSection() {
    const s = ctx.state;
    const rows = s.goals.map((g) => {
      const p = g.target > 0 ? Math.min(100, g.saved * 100 / g.target) : 0, plan = Finance.goalPlan(g, ctx.today);
      const info = (g.deadline ? `Até ${brDate(g.deadline)}` : "Sem prazo") + (plan.pastDue ? " · prazo vencido" : "");
      const planTxt = plan.done ? `${icon("check", 14)} Meta atingida` : [
        plan.needed != null ? `Precisa de ${esc(money(plan.needed))}/mês` : null,
        plan.eta != null ? `Plano: conclui em ${esc(brMonthLabel(plan.eta))}${plan.late ? ` ${icon("warning", 14)} após o prazo` : ""}` : null
      ].filter(Boolean).join(" · ");
      return `<button type="button" class="tx goal" data-act="edit-goal" data-id="${attr(g.id)}">
      <div class="goalTop"><b>${esc(g.name)}</b><span>${money(g.saved)} / ${money(g.target)}</span></div>
      <div class="bar2"><i style="width:${p}%"></i></div>
      <div class="goalInfo"><span>${esc(info)}</span><span>${pct0(p)}%</span></div>${planTxt ? `<small class="goalPlan">${planTxt}</small>` : ""}</button>`;
    }).join("");
    return `<section class="section">${sectionHead("Objetivos", "Metas", btn("", { act: "new-goal", cls: "icon small", icon: "add", label: "Nova meta" }))}
    <div class="list">${rows || `<div class="empty glass"><span>Crie uma meta com o botão “Meta”.</span></div>`}</div></section>`;
  }
  function movesDefaults() {
    const ym = ymOf(ctx.today);
    if (!ctx.moves.from && !ctx.moves.to && !ctx.moves.all) {
      ctx.moves.from = ymFirst(ym);
      ctx.moves.to = ymLast(ym);
    }
  }
  function filteredTxs() {
    const f = ctx.moves, q = Text.fold(f.q);
    return ctx.state.txs.filter((t) => (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to) && (!f.kind || t.kind === f.kind) && (!f.st || (f.st === "paid" ? t.paid : !t.paid)) && (!q || Text.fold(t.desc + " " + t.category).includes(q))).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  }
  function movesView() {
    movesDefaults();
    const f = ctx.moves;
    const panel = `<section class="period glass" aria-label="Período">
      <div class="periodFields"><label class="field"><span>De</span><input type="date" id="fromDate" value="${attr(f.from || "")}"></label><span aria-hidden="true">${icon("arrow-back", 16, "flip")}</span>
      <label class="field"><span>Até</span><input type="date" id="toDate" value="${attr(f.to || "")}"></label></div>
      <div class="presetRow">${btn("Este mês", { act: "moves-preset", data: { p: "month" } })}${btn("30 dias", { act: "moves-preset", data: { p: "30" } })}${btn("Tudo", { act: "moves-preset", data: { p: "all" } })}</div></section>
    <section class="filterPanel glass" aria-label="Filtros"><small class="eyebrow">Filtros da lista</small>
      <div class="searchField">${icon("search", 20)}<input id="q" type="search" placeholder="Buscar lançamentos…" aria-label="Buscar lançamentos (descrição ou categoria)" value="${attr(f.q)}" maxlength="60"></div>
      <div class="filterSelects">
        <select id="kindF" aria-label="Tipo de lançamento"><option value="">Todos os tipos</option><option value="income"${f.kind === "income" ? " selected" : ""}>Receitas</option><option value="expense"${f.kind === "expense" ? " selected" : ""}>Despesas</option></select>
        <select id="stF" aria-label="Situação"><option value="">Pagos e pendentes</option><option value="paid"${f.st === "paid" ? " selected" : ""}>Só realizados</option><option value="pending"${f.st === "pending" ? " selected" : ""}>Só pendentes</option></select></div></section>
    <div id="movesTotals"></div>`;
    const list = `<section class="section listSection"><div class="sectionHead"><div>${eyebrow("No período")}<h3>Todos os lançamentos</h3></div><b id="periodCount" class="countPill">0</b></div>
    <div id="periodTransactions" class="list"></div></section>`;
    const title = pageTitle("movesTitle", "Movimentações", "Lançamentos", "Compare suas receitas e despesas em qualquer período.");
    return title + (ctx.cols === 1 ? panel + list : `<div class="movesGrid"><aside class="movesAside">${panel}</aside><div>${list}</div></div>`);
  }
  function movesData() {
    const all = filteredTxs(), f = ctx.moves;
    const fl = Finance.flow(all), total = fl.income + fl.expense, bal = fl.income - fl.expense;
    const pending2 = all.filter((t) => !t.paid && isFlow(t));
    const pi = sumOf2(pending2.filter((t) => t.kind === "income")), pe = sumOf2(pending2.filter((t) => t.kind === "expense"));
    const text = fl.income > 0 ? `As despesas representam ${pct1(fl.expense * 100 / fl.income)}% das receitas do período.` : fl.expense > 0 ? "Há despesas, mas nenhuma receita neste período." : "Nenhuma movimentação no período selecionado.";
    const pend = !pending2.length ? "" : hidden() ? " Há valores pendentes." : ` Pendente: a receber ${Money.format(pi)} · a pagar ${Money.format(pe)}.`;
    const bar = (label, v, cls) => {
      const p = total > 0 ? Math.round(v * 100 / total) : 0;
      return `<div class="barRow ${cls}"><span>${label}</span><div><i style="width:${p}%"></i></div><b>${p}%</b></div>`;
    };
    const totals = `<section class="compareCards">
      <article class="compare glass"><span>${icon("arrow-upward", 14)}Receitas</span><b class="green">${money(fl.income)}</b></article>
      <article class="compare glass"><span>${icon("arrow-downward", 14)}Despesas</span><b class="red">${money(fl.expense)}</b></article>
      <article class="compare balance glass"><span>Saldo do período</span><b class="${bal < 0 ? "negative" : ""}">${money(bal)}</b></article></section>
    <section class="comparison glass"><div class="compareHead"><div>${eyebrow("Comparação")}<h3>Receitas × despesas</h3></div><b>${fl.income > 0 ? `${Math.trunc(fl.expense * 100 / fl.income)}% gasto` : "—"}</b></div>
      ${bar("Receitas", fl.income, "")}${bar("Despesas", fl.expense, "expenseBar")}<small>${esc(text + pend)}</small></section>`;
    const shown = all.slice(0, f.limit);
    const rows = shown.map(txRow).join("");
    return {
      totals,
      count: all.length,
      list: rows ? rows + (all.length > shown.length ? btn(`Mostrar mais (${all.length - shown.length} restantes)`, { act: "moves-more", cls: "soft wide" }) : "") : `<div class="empty glass"><b>Nenhum lançamento neste período</b><span>Altere as datas ou adicione uma movimentação.</span></div>`
    };
  }
  function txRow(t) {
    const s = ctx.state, payment = !isFlow(t), cardT = isCard(t);
    const where = cardT ? `Cartão ${card(s, t.cardId)?.name ?? ""}` : account(s, t.accountId)?.name ?? "";
    const late = !t.paid && !cardT && t.date < ctx.today;
    const status = payment ? "Pagamento de fatura" : cardT ? "" : t.paid ? "" : late ? '<span class="red">Em atraso</span>' : t.kind === "income" ? "A receber" : "A pagar";
    const meta = [esc(t.category), esc(where), brDate(t.date), status].filter(Boolean).join(" · ");
    const toggle = cardT ? `<span class="chk card" title="Compra no cartão">${icon("credit-card", 16)}</span>` : payment ? `<span class="chk on" title="Pagamento de fatura">${icon("check", 16)}</span>` : `<button type="button" class="chk${t.paid ? " on" : ""}" data-act="toggle-paid" data-id="${attr(t.id)}" aria-pressed="${t.paid}" aria-label="${t.paid ? t.kind === "income" ? "Recebido" : "Pago" : t.kind === "income" ? "Marcar como recebido" : "Marcar como pago"}: ${attr(t.desc)}">${icon("check", 16)}</button>`;
    return `<div class="tx ${t.kind}${t.paid ? "" : " pending"}${payment ? " payment" : ""}" data-act="edit-tx" data-id="${attr(t.id)}" role="button" tabindex="0" aria-label="${attr(t.desc)}, ${t.kind === "income" ? "receita" : "despesa"} de ${attr(money(t.value))} em ${brDate(t.date)}">
    ${glyph(t.category)}<span class="meta"><b>${esc(t.desc)}</b><small>${meta}</small></span>
    <span class="amount">${t.kind === "income" ? "+" : "−"}${money(t.value)}</span>${toggle}</div>`;
  }
  function reportsView() {
    movesDefaults();
    const s = ctx.state, f = ctx.moves, today2 = ctx.today, ym = ymOf(today2);
    const period2 = !f.from && !f.to ? "Todo o histórico." : `Período: ${f.from ? brDate(f.from) : "início"} a ${f.to ? brDate(f.to) : "hoje"} (datas da aba Lançamentos).`;
    const cats = Finance.categoryTotals(s, f.from, f.to), total = cats.reduce((n, [, v]) => n + v, 0);
    const slices = cats.slice(0, 7).map(([n, v]) => [n, v]);
    if (cats.length > 7) slices.push([`Outras (${cats.length - 7})`, cats.slice(7).reduce((n, [, v]) => n + v, 0)]);
    const catCard = `<section class="comparison glass">${eyebrow("Despesas")}<h3>Por categoria</h3>
    ${cats.length ? `<div class="donutWrap">${donutSvg(slices, total)}<ul class="legend">${slices.map(([n, v], i) => `<li><i style="background:${PDF_SERIES[i % 8]}"></i><span>${esc(n)}</span><b>${money(v)}</b><small>${pct1(total ? v * 100 / total : 0)}%</small></li>`).join("")}</ul></div>
    <div class="catBars">${cats.map(([c, v], i) => {
      const lim = s.limits.get(c), p = total ? v * 100 / total : 0;
      return `<div class="catBar"><div class="catTop">${glyph(c)}<b>${esc(c)}</b><span>${money(v)}</span></div><div class="budgetTrack"><i style="width:${p}%;background:${PDF_SERIES[Math.min(i, 7)]}"></i></div>
        ${lim != null ? `<small class="${v > lim ? "red" : "muted"}">${v > lim ? `${icon("warning", 13)} Acima do` : "Dentro do"} limite mensal de ${esc(money(lim))}</small>` : ""}</div>`;
    }).join("")}</div>` : '<p class="muted small">Sem despesas no período.</p>'}</section>`;
    const months = Finance.lastMonths(s, today2, 6), max = Math.max(1, ...months.map(([, m]) => Math.max(m.income, m.expense)));
    const desc = months.map(([m, x]) => brMonthYear(m) + (hidden() ? "" : `: receitas ${Money.format(x.income)}, despesas ${Money.format(x.expense)}`)).join("; ");
    const evo = `<section class="comparison glass">${eyebrow("Evolução")}<h3>Últimos 6 meses</h3>
    <div class="evo${hidden() ? " sensitive" : ""}" role="img" aria-label="Gráfico de receitas e despesas. ${attr(desc)}">${months.map(([m, x]) => `<div class="evoCol"><div class="pair"><i class="inc" style="height:${x.income * 100 / max}%"></i><i class="exp" style="height:${x.expense * 100 / max}%"></i></div><span>${MONTHS_SHORT[m % 12]}</span></div>`).join("")}</div>
    <small class="legendLine"><i class="dot inc"></i>Receitas <i class="dot exp"></i>Despesas</small></section>`;
    const cur = Finance.monthFlow(s, ym), prev = Finance.monthFlow(s, ym - 1);
    const chg2 = (a, b) => b === 0 ? "Sem base" : `${icon(a >= b ? "arrow-upward" : "arrow-downward", 13)}${pct0(Math.abs((a - b) * 100 / b))}% vs. mês anterior`;
    const cmp2 = `<section class="comparison glass">${eyebrow("Comparação")}<h3>Este mês × mês anterior</h3>
    <div class="reportStat">${[["Receitas", cur.income, prev.income, "green"], ["Despesas", cur.expense, prev.expense, "red"]].map(([l, a, b, c]) => `<div><small>${l}</small><b class="${c}">${money(a)}</b><small class="chg">${chg2(a, b)}</small></div>`).join("")}</div></section>`;
    const exp = `<section class="comparison glass exportCard"><div><h3>${icon("picture-as-pdf", 20)} Relatório em PDF</h3><p class="muted small">Resumo, gráficos, maiores despesas, contas, metas e a lista de lançamentos de qualquer período. Gerado neste aparelho.</p></div>
    ${btn("Exportar relatório em PDF", { act: "pdf", cls: "primary", icon: "download" })}</section>`;
    const title = pageTitle("reportsTitle", "Análise", "Relatórios", `${period2} Considera só valores realizados.`);
    return title + (ctx.cols === 1 ? exp + catCard + evo + cmp2 : cols([catCard], [exp, evo, cmp2]));
  }
  function donutSvg(slices, total) {
    const r = 52, c = 2 * Math.PI * r;
    let off = 0;
    const arcs = slices.map(([, v], i) => {
      const len = total > 0 ? c * v / total : 0;
      const el = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${PDF_SERIES[i % 8]}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 1.2).toFixed(2)} ${(c - Math.max(0, len - 1.2)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
      off += len;
      return el;
    }).join("");
    return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Despesas por categoria: ${attr(slices.map(([n, v]) => `${n} ${hidden() ? "" : Money.format(v)}`).join(", "))}">
    <circle r="${r}" cx="70" cy="70" fill="none" class="donutTrack" stroke-width="22"/>${arcs}
    <text x="70" y="66" text-anchor="middle" class="donutLabel">Total</text><text x="70" y="84" text-anchor="middle" class="donutValue">${esc(hidden() ? "R$ ••••" : compact(total))}</text></svg>`;
  }
  function assistView() {
    const d = ctx.device, s = ctx.state, today2 = ctx.today;
    const back = ctx.cols === 1 ? btn("Início", { act: "go", data: { view: "home" }, cls: "link back", icon: "arrow-back", iconSize: 18 }) : "";
    const head = back + pageTitle("assistTitle", "No aparelho, sem internet", "Assistente", "Tudo é calculado neste aparelho, sem internet, a partir dos seus lançamentos. Toque em “Por quê?” para ver a regra usada.");
    const askBox = d.assistAsk ? `<section class="comparison glass" aria-label="Perguntas">${eyebrow("Pergunte")}
    <form id="askForm" class="askForm" novalidate><div class="searchField">${icon("search", 20)}<input id="askInput" type="search" maxlength="120" placeholder="Ex.: quanto gastei com mercado em agosto?" aria-label="Sua pergunta" value="${attr(ctx.lastQuestion || "")}"></div>
    ${btn("Perguntar", { submit: true, cls: "primary", icon: "send", iconSize: 18 })}</form>
    <div class="examples">${ASK_EXAMPLES.map((x) => btn(x, { act: "ask-example", data: { q: x }, cls: "pill small" })).join("")}</div>
    <div id="askAnswer">${ctx.lastQuestion ? answerHtml(ctx.lastQuestion) : ""}</div></section>` : "";
    let summary = "", tipsBox = "";
    if (d.assistTips) {
      const rep = Insights.report(s, today2, money);
      summary = `<section class="comparison glass">${eyebrow("Resumo")}<h3>${esc(rep.title)}</h3><ul class="reportLines">${rep.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>${why(rep.why)}</section>`;
      const all = Insights.tips(s, today2, money), vis = visibleTips(all), dis = all.filter((t) => d.dismissedTips.includes(t.id));
      tipsBox = `<section class="comparison glass">${eyebrow("Dicas")}<h3>Dicas de economia</h3>
      ${vis.length ? vis.map((t) => tipItem(t)).join("") : '<p class="muted small">Nenhuma dica no momento: nada fora do padrão nos seus lançamentos.</p>'}
      ${dis.length ? `<details class="dismissedBox"><summary>${icon("expand-more", 18)}Mostrar dispensadas (${dis.length})</summary>${dis.map((t) => tipItem(t, { dismissed: true })).join("")}</details>` : ""}</section>`;
    }
    const off = !d.assistAsk && !d.assistTips ? `<section class="comparison glass"><p class="muted">O resumo, as dicas e as perguntas estão desligados em Ajustes › Assistente.</p>${btn("Abrir Ajustes", { act: "go", data: { view: "prefs", fold: "assistente" }, cls: "soft" })}</section>` : "";
    return head + off + (ctx.cols === 1 ? askBox + summary + tipsBox : cols([askBox, summary], [tipsBox]));
  }
  function answerHtml(q) {
    const a = Ask.answer(q, ctx.state, ctx.today, money);
    const p = a.parsed;
    return `<div class="answer"><b>${esc(a.text)}</b><small>${esc(a.understood)}</small>
    ${a.matches.length ? btn("Ver lançamentos", { act: "open-moves", data: { q: p.category ?? p.words[0] ?? "", from: p.period.from, to: p.period.to, kind: p.kind ?? "" }, cls: "pill small", icon: "chevron-right", iconSize: 16 }) : ""}</div>`;
  }
  var openFolds = /* @__PURE__ */ new Set();
  function fold(id, title, sub, body, ic) {
    const open = openFolds.has(id);
    return `<section class="fold glass${open ? " open" : ""}" id="fold-${id}">
    <button type="button" class="foldHead" data-act="fold" data-id="${id}" aria-expanded="${open}" aria-controls="foldBody-${id}">
      <span class="foldIc">${icon(ic, 20)}</span><span class="foldTxt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
      <span class="foldBtn" aria-hidden="true">${icon(open ? "remove" : "add", 20)}</span></button>
    <div class="foldBody" id="foldBody-${id}"${open ? "" : " hidden"}>${body}</div></section>`;
  }
  var manage = (title, sub, actions2) => `<div class="manageItem"><div><b>${esc(title)}</b><small>${esc(sub)}</small></div><div class="manageActions">${actions2}</div></div>`;
  function prefsView(env2) {
    const s = ctx.state, d = ctx.device;
    const appearance = fold("aparencia", "Aparência", `Tema: ${themeLabel(s.theme)}`, `<div class="themeChoices">${THEMES.map(([id, label]) => `<button type="button" class="themeChoice${s.theme === id ? " active" : ""}" data-act="theme" data-id="${id}" aria-pressed="${s.theme === id}">
      <span>${esc(label)}${s.theme === id ? icon("check", 16) : ""}</span><span class="swatches t-${id}"><i></i><i></i><i></i><i></i></span></button>`).join("")}</div>
    <p class="muted small">“Sistema” acompanha o modo claro/escuro do aparelho.</p>`, "palette");
    const hasPin = !!d.pinHash;
    const privacy = fold("privacidade", "Privacidade e segurança", (hasPin ? "Bloqueio ativo" : "Bloqueio desativado") + (s.privacy ? " · valores ocultos" : ""), `
    <div class="manageItem"><div><b>Bloqueio por PIN</b><small>${hasPin ? "Ativo: o PIN é pedido ao abrir o Finan+" : "Desativado. Defina um PIN de 4 a 8 números."}</small></div>
      <div class="manageActions">${btn(hasPin ? "Remover PIN" : "Definir PIN", { act: hasPin ? "pin-remove" : "pin-set", cls: "soft small" })}${hasPin ? btn("Trocar", { act: "pin-set", cls: "soft small" }) : ""}</div></div>
    ${check("privacy", "Ocultar valores", s.privacy, { sub: "Esconde os valores em reais na tela e nos avisos (Ctrl+H)" })}
    <label class="field"><span>Bloqueio automático</span><select id="autoLockSel"${hasPin ? "" : " disabled"}>${AUTOLOCK_OPTIONS.map((m) => `<option value="${m}"${s.autoLock === m ? " selected" : ""}>${m === 0 ? "Desativado" : `${m} minuto${m > 1 ? "s" : ""} sem usar`}</option>`).join("")}</select>${hasPin ? "" : '<small class="hint">Precisa de um PIN.</small>'}</label>
    ${env2.remote ? `<div class="manageItem"><div><b>Conectado ao celular</b><small>Acesso pela rede do Finan+ Android</small></div><div class="manageActions">${btn("Desconectar", { act: "remote-logout", cls: "soft small" })}</div></div>` : ""}
    <div class="infoBox">${icon("lock", 18)}<p>${env2.remote ? "Modo remoto: os dados ficam no celular (criptografados lá) e chegam por conexão criptografada (HTTPS). Nada financeiro é gravado neste navegador; o PIN abaixo vale só para ele." : env2.encrypted ? "Os dados ficam criptografados (AES-256-GCM) neste navegador, com uma chave que não pode ser lida nem pelo próprio site. Nada é enviado para servidores." : "Atenção: este navegador não oferece as funções de criptografia necessárias. Os dados ficam neste aparelho, mas sem criptografia."} O PIN nunca vai para o backup.</p></div>
    <p class="muted small">Navegadores não permitem bloquear capturas de tela. Ao compartilhar a tela, ligue “Ocultar valores”.</p>`, "shield");
    const nperm = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
    const notif = env2.remote ? fold("avisos", "Avisos de vencimento", "Feitos pelo celular", `
    <p class="muted small">No modo remoto, os avisos de vencimento chegam pelo próprio celular.</p>
    ${btn("Ver vencimentos agora", { act: "notify-now", cls: "soft small", icon: "notifications", iconSize: 18 })}`, "notifications") : fold("avisos", "Avisos de vencimento", d.notifications && nperm === "granted" ? "Avisos de vencimento ligados" : "Avisos de vencimento desligados", `
    ${check("notifications", "Avisar vencimentos", d.notifications && nperm === "granted", { sub: "Contas a pagar, valores a receber e faturas, uma vez por dia a partir das 9h, com o Finan+ aberto", disabled: nperm === "unsupported" })}
    ${nperm === "denied" ? '<p class="muted small">As notificações estão bloqueadas para este site. Libere nas configurações do navegador.</p>' : ""}
    ${nperm === "unsupported" ? '<p class="muted small">Este navegador não oferece notificações.</p>' : ""}
    ${btn("Avisar agora", { act: "notify-now", cls: "soft small", icon: "notifications", iconSize: 18 })}
    <p class="muted small">Sites não podem rodar com o navegador fechado sem um servidor. Para manter tudo no aparelho, os avisos aparecem quando o Finan+ é aberto (ou fica aberto) a partir das 9h. O cartão “Vencimentos” do Início mostra os próximos 30 dias.</p>`, "notifications");
    const n = [d.assistCategory, d.assistTips, d.assistAsk].filter(Boolean).length;
    const assist = fold("assistente", "Assistente", `${n} de 3 funções ligadas`, `
    <p class="muted small">Funciona só neste aparelho, sem internet e sem enviar dados. Cada função pode ser desligada.</p>
    ${check("assistCategory", "Sugerir categoria", d.assistCategory, { sub: "Ao digitar a descrição de um lançamento novo" })}
    ${check("assistTips", "Resumo e dicas", d.assistTips, { sub: "No Início: resumo do mês, gastos fora do padrão, fixos, duplicados" })}
    ${check("assistAsk", "Perguntas rápidas", d.assistAsk, { sub: "Ex.: “quanto gastei com mercado em agosto?”" })}
    ${d.dismissedTips.length ? btn(`Restaurar ${d.dismissedTips.length} dica(s) dispensada(s)`, { act: "restore-all-tips", cls: "soft small" }) : ""}
    <details class="learned"><summary>${icon("expand-more", 18)}Ver o que o assistente aprendeu</summary>${learnedHtml()}</details>`, "auto-awesome");
    const accounts = fold("contas", "Contas e cartões", `${s.accounts.length} conta(s) · ${s.cards.length} cartão(ões)`, `
    <div class="manageList">${s.accounts.map((a) => manage(a.name, `Saldo ${money(Finance.accountBalance(s, a))}`, btn("Editar", { act: "edit-account", data: { id: a.id }, cls: "soft small" }))).join("")}
    ${s.cards.map((c) => {
      const st = Finance.cardStatus(s, c, ctx.today);
      return manage(`Cartão ${c.name}`, `Limite ${money(c.limit)} · usado ${money(st.used)} · fecha dia ${c.close} · vence dia ${c.due}`, btn("Editar", { act: "edit-card", data: { id: c.id }, cls: "soft small" }));
    }).join("")}</div>
    <div class="btnGrid">${btn("Conta", { act: "new-account", icon: "add", iconSize: 18 })}${btn("Cartão", { act: "new-card", icon: "add", iconSize: 18 })}</div>`, "account-balance-wallet");
    const recurring = fold("recorrencias", "Recorrências", s.recurring.length ? `${s.recurring.length} recorrência(s) cadastrada(s)` : "Nenhuma recorrência cadastrada", `
    <div class="foldTools">${btn("Nova", { act: "new-recurring", icon: "add", iconSize: 18, cls: "soft small" })}</div>
    ${s.recurring.length ? `<div class="manageList">${s.recurring.map((r) => {
      const where = r.cardId ? `Cartão ${card(s, r.cardId)?.name ?? ""}` : account(s, r.accountId)?.name ?? "";
      return manage(r.desc, `${r.kind === "income" ? "Receita" : "Despesa"} · ${money(r.value)} · dia ${r.day} · ${r.category} · ${where}${r.active ? "" : " · pausada"}`, btn("Editar", { act: "edit-recurring", data: { id: r.id }, cls: "soft small" }));
    }).join("")}</div>` : '<p class="muted small">Você também pode marcar “Repetir mensalmente” ao criar um lançamento.</p>'}`, "repeat");
    const limits = fold("limites", "Limites mensais", s.limits.size ? `${s.limits.size} limite(s) definido(s)` : "Nenhum limite definido", `
    <div class="foldTools">${btn("Adicionar", { act: "new-limit", icon: "add", iconSize: 18, cls: "soft small" })}</div>
    ${s.limits.size ? `<div class="manageList">${[...s.limits].map(([c, v]) => manage(c, `${money(v)} por mês`, btn("Editar", { act: "edit-limit", data: { cat: c }, cls: "soft small" }))).join("")}</div>` : '<p class="muted small">Defina apenas os limites que quiser acompanhar. Despesas pendentes do mês também contam.</p>'}`, "donut-large");
    const catList = (k, label) => `<h4 class="subhead">${label}</h4><div class="manageList">${s.cats[k].map((c) => manage(
      c,
      `${k === "expense" ? "Despesa" : "Receita"}${categoryUse(k, c)}`,
      btn("", { act: "rename-cat", data: { kind: k, cat: c }, cls: "icon tiny", icon: "edit", iconSize: 16, label: `Renomear ${c}` }) + btn("", { act: "delete-cat", data: { kind: k, cat: c }, cls: "icon tiny dangerIc", icon: "delete", iconSize: 16, label: `Excluir ${c}` })
    )).join("")}</div>`;
    const cats = fold("categorias", "Categorias", `${s.cats.expense.length + s.cats.income.length} categorias cadastradas`, `
    <form id="catForm" class="filters" novalidate><input id="newCat" placeholder="Nova categoria" maxlength="40" aria-label="Nova categoria"><select id="newCatKind" aria-label="Tipo da categoria"><option value="expense"${ctx.catKind !== "income" ? " selected" : ""}>Despesa</option><option value="income"${ctx.catKind === "income" ? " selected" : ""}>Receita</option></select>
    ${btn("Adicionar categoria", { submit: true, cls: "primary wide" })}</form>${catList("expense", "Despesas")}${catList("income", "Receitas")}`, "category");
    const data = fold("dados", "Dados", "Backup, restauração, CSV e relatório em PDF", `
    <div class="btnGrid">${btn("Exportar CSV", { act: "csv", icon: "table-view", iconSize: 18 })}${btn("Backup JSON", { act: "backup", icon: "download", iconSize: 18 })}
    ${btn("Restaurar", { act: "restore", icon: "upload", iconSize: 18 })}${btn("Relatório em PDF", { act: "pdf", icon: "picture-as-pdf", iconSize: 18 })}
    ${env2.remote ? "" : btn("Apagar tudo", { act: "wipe", cls: "dangerB", icon: "delete", iconSize: 18 })}</div>
    <p class="muted small">O backup JSON é compatível com o app Android e com a versão Linux do Finan+: dá para levar os dados de um para o outro. O arquivo de backup não é criptografado; guarde-o em local seguro.</p>`, "database");
    const about = fold("sobre", "Sobre", `Conheça o Finan+ · versão ${APP_VERSION}`, aboutHtml(env2), "info");
    const head = pageTitle("prefsTitle", "Configurações", "Ajustes", env2.remote ? "Tudo é salvo no celular, pela rede local." : env2.encrypted ? "Tudo fica salvo e criptografado neste aparelho." : "Tudo fica salvo neste aparelho.");
    const left = [appearance, privacy, notif, assist, about], right = [accounts, recurring, limits, cats, data];
    return head + (ctx.cols === 1 ? [appearance, privacy, notif, assist, accounts, recurring, limits, cats, data, about].join("") : cols(left, right));
  }
  function categoryUse(k, c) {
    const n = ctx.state.txs.filter((t) => t.kind === k && t.category === c).length;
    return n ? ` · ${n} lançamento(s)` : "";
  }
  function learnedHtml() {
    const s = ctx.state;
    const part = (k) => {
      const c = new Categorizer(s, k, ctx.dict), w = c.learnedWords();
      return `<small class="eyebrow">${k === "expense" ? "Despesas" : "Receitas"} · ${c.trainingSize} lançamento(s) analisado(s)</small>
      ${w.length ? `<div class="manageList">${w.map(([cat, ws]) => manage(cat, ws.map(([x, n]) => `${x} (${n})`).join(", "), "")).join("")}</div>` : '<p class="muted small">Ainda não há palavras repetidas o suficiente.</p>'}`;
    };
    return `<p class="muted small">O aprendizado vem dos seus próprios lançamentos (que ficam criptografados no aparelho). Não existe uma cópia separada: corrigir a categoria de um lançamento corrige o aprendizado, e apagar o lançamento apaga o que ele ensinou.</p>
    ${part("expense")}${part("income")}
    <p class="muted small">Dicionário inicial: ${ctx.dict ? ctx.dict.sections.length : 0} seções, arquivo aberto assistente/dicionario.txt. As regras de cada função estão descritas em ASSISTENTE.md no código-fonte.</p>`;
  }
  var REPO_WEB = "https://github.com/finanplus-web/finan_plus";
  var REPO_LINUX = "https://github.com/finanplus-web/finan_plus_linux";
  var LINUX_DOWNLOAD = "https://github.com/finanplus-web/finan_plus_linux/releases/latest";
  var extLink = (href, ic, title, sub) => `<a class="extLink" href="${attr(href)}" target="_blank" rel="noopener noreferrer">${icon(ic, 22)}<span><b>${esc(title)}</b><small>${esc(sub)}</small></span>${icon("open-in-new", 18)}</a>`;
  function aboutHtml(env2) {
    const paras = [
      "Finan+ é um aplicativo para gerenciamento financeiro pessoal, desenvolvido com foco em simplicidade, privacidade, leveza e funcionamento offline.",
      "O aplicativo permite organizar receitas, despesas, contas, cartões, categorias, limites mensais, metas e lançamentos recorrentes, além de acompanhar saldos e relatórios financeiros.",
      "Esta é a versão web (PWA): funciona no navegador do celular ou do computador, pode ser instalada como aplicativo e continua funcionando sem internet. Os dados ficam no aparelho, criptografados com AES-256-GCM e chave não extraível guardada pelo próprio navegador, sem conta, cadastro ou servidor.",
      "Inclui avisos de vencimento, bloqueio por PIN, relatório em PDF e backup em JSON compatível com o app Android e com a versão Linux.",
      "O assistente (sugestão de categoria, resumo do mês, dicas de economia e perguntas rápidas) funciona inteiro no aparelho, sem internet e sem modelo de IA externo: são regras e um classificador simples, com código aberto e explicação em cada resposta.",
      "A interface combina conceitos do Material 3 com elementos visuais inspirados em Liquid Glass, com layout próprio para computador e notebook e os temas Material You, OLED, Tokyo Night e Nord."
    ];
    return `${paras.map((p) => `<p class="muted">${esc(p)}</p>`).join("")}
    <p><b>Privacidade em primeiro lugar: seus dados financeiros permanecem no seu dispositivo.</b></p>
    <h4 class="subhead">Desenvolvimento</h4>
    <p class="muted">Finan+ é um projeto independente desenvolvido de forma colaborativa com auxílio de inteligência artificial. A concepção, as decisões de produto, os testes e o direcionamento da experiência são realizados por Juscelino Be, autor e idealizador do projeto, enquanto a inteligência artificial auxilia na implementação, revisão e evolução do código.</p>
    <div class="soft">${eyebrow("Idealizado e desenvolvido por")}<b class="big">Juscelino Be</b></div>
    <h4 class="subhead">Licença</h4>
    <p class="muted pre">Finan+ — Copyright (C) 2026 Juscelino Be.

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os termos da Licença Pública Geral GNU (GNU GPL), publicada pela Free Software Foundation, na versão 3 da licença ou (a seu critério) qualquer versão posterior.

Este programa é distribuído na esperança de que seja útil, mas SEM NENHUMA GARANTIA, nem mesmo a garantia implícita de COMERCIABILIDADE ou de ADEQUAÇÃO A UMA FINALIDADE ESPECÍFICA. Veja a licença completa para mais detalhes.</p>
    <details class="license" data-src="licenca/LICENSE.txt"><summary>${icon("expand-more", 18)}Ver licença completa (GNU GPL v3)</summary><pre class="licenseText">Carregando…</pre></details>
    <p class="muted">Ícones: Material Symbols, © Google, sob a Licença Apache 2.0 (compatível com a GPL v3).</p>
    <details class="license" data-src="licenca/APACHE-2.0.txt"><summary>${icon("expand-more", 18)}Ver licença dos ícones (Apache 2.0)</summary><pre class="licenseText">Carregando…</pre></details>
    <h4 class="subhead">Código-fonte e outras versões</h4>
    <p class="muted">O código do Finan+ é aberto. Aqui estão o repositório desta versão web e a versão para computadores Linux, com os mesmos recursos e backup compatível.</p>
    <div class="linkList">
      ${extLink(REPO_WEB, "code", "Código-fonte do Finan+ web (PWA)", "github.com/finanplus-web/finan_plus")}
      ${extLink(LINUX_DOWNLOAD, "computer", "Baixar para Linux (.deb)", "Ubuntu 24.04+, Linux Mint 22, Debian 13, KDE neon")}
      ${extLink(REPO_LINUX, "code", "Código-fonte do Finan+ para Linux", "github.com/finanplus-web/finan_plus_linux")}
    </div>
    <p class="muted small">Também publicado junto com o app, na pasta js/ (módulos legíveis; js/app.bundle.js é a junção deles, sem minificar). ${env2.storageNote || ""}</p>
    <div class="btnGrid">${btn("Atalhos de teclado", { act: "shortcuts", icon: "keyboard", iconSize: 18 })}${btn("Novidades desta versão", { act: "whatsnew", icon: "history", iconSize: 18 })}</div>`;
  }
  var NAV = [
    ["home", "Início", "home", "home-fill"],
    ["moves", "Lançamentos", "swap-horiz", "swap-horiz-fill"],
    ["reports", "Relatórios", "pie-chart", "pie-chart-fill"],
    ["assist", "Assistente", "auto-awesome", "auto-awesome"],
    ["prefs", "Ajustes", "settings", "settings-fill"]
  ];
  var VIEW_TITLES = { home: "Início", moves: "Lançamentos", reports: "Relatórios", assist: "Assistente", prefs: "Ajustes" };
  function sideNavHtml() {
    return NAV.map(([id, label, ic, icOn], i) => `<button type="button" class="${ctx.view === id ? "active" : ""}" data-act="go" data-view="${id}" aria-current="${ctx.view === id ? "page" : "false"}">
    ${icon(ctx.view === id ? icOn : ic, 22)}<span>${label}</span><kbd>${i + 1}</kbd></button>`).join("");
  }
  function sideFootHtml() {
    const s = ctx.state, today2 = ctx.today, ym = ymOf(today2);
    const bal = Finance.currentBalance(s), fut = Finance.futureBalance(s, ymLast(ym), today2);
    return `<div class="sideBal"><small>Saldo atual</small><b class="${bal < 0 ? "negative" : ""}">${money(bal)}</b>
    <small>Previsto para ${ymLen(ym)}/${String(ym % 12 + 1).padStart(2, "0")}</small><b class="future ${fut < 0 ? "negative" : ""}">${money(fut)}</b></div>
    <div class="sideTools">${btn("", { act: "toggle-privacy", cls: "icon small", icon: s.privacy ? "visibility" : "visibility-off", label: s.privacy ? "Mostrar valores (Ctrl+H)" : "Ocultar valores (Ctrl+H)" })}
    ${ctx.device.pinHash ? btn("", { act: "lock", cls: "icon small", icon: "lock", label: "Bloquear agora (Ctrl+L)" }) : ""}
    ${btn("", { act: "shortcuts", cls: "icon small", icon: "keyboard", label: "Atalhos de teclado (?)" })}</div>
    <small class="sideNote">${icon("shield", 12)} ${ctx.remote ? "Dados no celular (conexão segura)" : "Dados só neste aparelho"}</small>`;
  }
  function topbarHtml() {
    const s = ctx.state;
    const title = ctx.view === "home" ? `<div><small class="eyebrow">Controle financeiro</small><h1>Finan+</h1></div>` : `<div><small class="eyebrow">Finan+</small><h1>${VIEW_TITLES[ctx.view]}</h1></div>`;
    return `<div class="topTitle">${title}</div><div class="topActions">
    ${btn("Despesa", { act: "new-tx", data: { kind: "expense" }, cls: "soft", icon: "remove", iconSize: 18 })}
    ${btn("Receita", { act: "new-tx", data: { kind: "income" }, cls: "primary", icon: "add", iconSize: 18 })}
    ${btn("", { act: "search", cls: "icon", icon: "search", label: "Buscar lançamentos (Ctrl+F)" })}
    ${btn("", { act: "toggle-privacy", cls: "icon", icon: s.privacy ? "visibility" : "visibility-off", label: s.privacy ? "Mostrar valores (Ctrl+H)" : "Ocultar valores (Ctrl+H)" })}
    ${ctx.device.pinHash ? btn("", { act: "lock", cls: "icon", icon: "lock", label: "Bloquear agora (Ctrl+L)" }) : ""}
    <div class="menuWrap">${btn("", { act: "menu", cls: "icon", icon: "more-horiz", label: "Mais opções", id: "menuBtn" })}
      <div class="menu glass" id="menu" role="menu" hidden>
        ${[["pdf", "Relatório em PDF", "picture-as-pdf", "Ctrl+P"], ["csv", "Exportar CSV", "table-view", "Ctrl+E"], ["backup", "Salvar backup JSON", "download", "Ctrl+S"], ["restore", "Restaurar backup", "upload", "Ctrl+O"], ["shortcuts", "Atalhos de teclado", "keyboard", "Ctrl+/"], ["about", "Sobre o Finan+", "info", ""]].map(([a, l, ic, k]) => `<button type="button" role="menuitem" data-act="${a}">${icon(ic, 18)}<span>${l}</span>${k ? `<kbd>${k}</kbd>` : ""}</button>`).join("")}
      </div></div></div>`;
  }
  function mobileHeaderHtml() {
    const s = ctx.state;
    return `<div><small class="eyebrow">Controle financeiro</small><h1>Finan+</h1></div><div class="headTools">
    ${btn("", { act: "toggle-privacy", cls: "icon", icon: s.privacy ? "visibility" : "visibility-off", label: s.privacy ? "Mostrar valores" : "Ocultar valores" })}
    ${assistOn() ? btn("", { act: "go", data: { view: "assist" }, cls: "icon", icon: "auto-awesome", label: "Assistente" }) : ""}</div>`;
  }
  function bottomNavHtml() {
    const item = (id) => {
      const [, label, ic, icOn] = NAV.find((n) => n[0] === id);
      const on = ctx.view === id || id === "home" && ctx.view === "assist";
      return `<button type="button" class="${on ? "active" : ""}" data-act="go" data-view="${id}" aria-current="${on ? "page" : "false"}">${icon(on ? icOn : ic, 22)}<span>${label}</span></button>`;
    };
    return `${item("home")}${item("moves")}<button type="button" class="fab" data-act="new-tx" data-kind="expense" aria-label="Novo lançamento">${icon("add", 28)}</button>${item("reports")}${item("prefs")}`;
  }

  // js/editors.js
  var editors_exports = {};
  __export(editors_exports, {
    CARD_PAYMENT_CAT: () => CARD_PAYMENT_CAT,
    SHORTCUTS: () => SHORTCUTS,
    accountEditor: () => accountEditor,
    cardEditor: () => cardEditor,
    deleteCategory: () => deleteCategory,
    download: () => download,
    exportBackup: () => exportBackup,
    exportCsv: () => exportCsv,
    goalEditor: () => goalEditor,
    limitEditor: () => limitEditor,
    newState: () => newState,
    payInvoiceEditor: () => payInvoiceEditor,
    pdfDialog: () => pdfDialog,
    pickFile: () => pickFile,
    recurringEditor: () => recurringEditor,
    removePin: () => removePin,
    renameCategory: () => renameCategory,
    restoreBackup: () => restoreBackup,
    setPin: () => setPin,
    shortcutsDialog: () => shortcutsDialog,
    txEditor: () => txEditor,
    whatsNew: () => whatsNew,
    ymOf: () => ymOf
  });
  var today = () => ctx.today;
  function apply(o, msg) {
    if (!o.ok) {
      notice(o.title, o.message);
      return false;
    }
    ctx.replace(o.state);
    closeSheet();
    if (msg) toast(msg);
    return true;
  }
  function guard(form, fn) {
    let busy = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      try {
        await fn(formData(form), form);
      } finally {
        setTimeout(() => {
          busy = false;
        }, 250);
      }
    });
  }
  var actions = (save, del) => `<div class="sheetActions">${del ? btn(del, { act: "sheet-delete", cls: "danger" }) : ""}${btn(save, { submit: true, cls: "primary" })}</div>`;
  var onDelete = (d, fn) => d.querySelector('[data-act="sheet-delete"]')?.addEventListener("click", fn);
  function txEditor(kind = "expense", id = null) {
    const s = ctx.state, t = id ? s.txs.find((x) => x.id === id) : null;
    if (id && !t) return;
    const isPayment = !!t?.cardPayment;
    let k = t?.kind ?? kind;
    const cats = (kk) => {
      const l = [...s.cats[kk]];
      if (t && t.kind === kk && !l.includes(t.category)) l.push(t.category);
      return l;
    };
    const body = `<form id="txForm" novalidate>
    ${isPayment ? `<p class="infoBox">${icon("credit-card", 18)}<span>Pagamento de fatura: debita a conta e abate da fatura do cartão. Não conta como despesa nova.</span></p>` : `<div class="seg" role="tablist" aria-label="Tipo">${[["expense", "Despesa"], ["income", "Receita"]].map(([v, l]) => `<button type="button" role="tab" data-kind="${v}" class="${k === v ? "selected" : ""}" aria-selected="${k === v}">${l}</button>`).join("")}</div>`}
    ${field("Descrição", input("desc", t?.desc ?? "", { placeholder: "Ex.: Mercado", max: 200 }))}
    <div id="catHint"></div>
    ${field("Valor (R$)", moneyInput("value", t ? Money.input(t.value) : ""))}
    ${field("Categoria", select("category", cats(k).map((c) => [c, c]), t?.category ?? s.cats[k][0]))}
    <div id="payModeWrap">${field("Forma de pagamento", select("payMode", [["account", "Conta / dinheiro"], ["card", "Cartão de crédito"]], t?.cardId ? "card" : "account"))}</div>
    <div id="cardWrap">${field("Cartão", select("cardId", s.cards.map((c) => [c.id, c.name]), t?.cardId || s.cards[0]?.id || ""))}</div>
    <div id="accWrap">${field(isPayment ? "Pago com a conta" : "Conta", select("accountId", s.accounts.map((a) => [a.id, a.name]), t?.accountId ?? s.accounts[0].id))}</div>
    ${field("Data", input("date", t?.date ?? today(), { type: "date", required: true }))}
    <div id="paidWrap">${check("paid", "", t ? t.paid : true)}</div>
    ${t ? "" : `<div class="row2">${field("Parcelas", input("reps", "1", { inputmode: "numeric", max: 2 }), { hint: "Até 60" })}
      <div id="repsModeWrap" hidden>${field("O valor informado é", select("repsMode", [["TOTAL", "O total da compra (divide entre as parcelas)"], ["EACH", "O valor de cada parcela"]], "TOTAL"))}</div></div>
      ${check("recurring", "Repetir mensalmente", false, { sub: "Cria uma recorrência a partir desta data" })}`}
    ${actions("Salvar lançamento", t ? "Excluir lançamento" : null)}</form>`;
    const d = openSheet({ title: t ? "Editar lançamento" : "Novo lançamento", subtitle: isPayment ? "" : "Registre uma receita ou despesa", body });
    const f = d.querySelector("#txForm");
    const categorizers = {};
    const sug = () => ctx.device.assistCategory && !isPayment ? categorizers[k] ?? (categorizers[k] = new Categorizer(s, k, ctx.dict)) : null;
    const sync = () => {
      const canCard = k === "expense" && s.cards.length > 0 && !isPayment;
      const useCard = canCard && f.payMode.value === "card";
      d.querySelector("#payModeWrap").hidden = !canCard;
      d.querySelector("#cardWrap").hidden = !useCard;
      d.querySelector("#accWrap").hidden = useCard;
      d.querySelector("#paidWrap").hidden = useCard || isPayment;
      d.querySelector("#paidWrap b").textContent = k === "income" ? "Receita já recebida" : "Despesa já paga";
      const r = d.querySelector("#repsModeWrap");
      if (r) r.hidden = !(parseInt(f.reps.value, 10) > 1);
    };
    const hint = () => {
      const box = d.querySelector("#catHint"), c = sug(), desc = f.desc.value;
      const enabled = !t || desc !== t.desc;
      const g = c && enabled && desc.trim().length >= 2 ? c.suggest(desc) : null;
      if (!g || g.category === f.category.value) {
        box.innerHTML = "";
        return;
      }
      const src = g.source === "SAME_DESCRIPTION" ? "pelo que você já lançou" : g.source === "LEARNED" ? "aprendido com seus lançamentos" : "pelo dicionário";
      box.innerHTML = `<div class="catHint">${icon("auto-awesome", 16)}<div><b>Sugestão: ${esc(g.category)}</b><small>${src}</small>${why(g.why)}</div>${btn("Usar", { act: "use-cat", data: { cat: g.category }, cls: "primary small" })}</div>`;
      box.querySelector('[data-act="use-cat"]').onclick = () => {
        f.category.value = g.category;
        hint();
      };
    };
    d.querySelectorAll(".seg button").forEach((b) => b.onclick = () => {
      if (b.dataset.kind === k) return;
      k = b.dataset.kind;
      d.querySelectorAll(".seg button").forEach((x) => {
        x.classList.toggle("selected", x === b);
        x.setAttribute("aria-selected", x === b);
      });
      const cur = f.category.value;
      f.category.innerHTML = cats(k).map((c) => `<option value="${attr(c)}">${esc(c)}</option>`).join("");
      if (cats(k).includes(cur)) f.category.value = cur;
      sync();
      hint();
    });
    f.payMode.onchange = sync;
    if (f.reps) f.reps.oninput = () => {
      f.reps.value = f.reps.value.replace(/\D/g, "");
      sync();
    };
    f.desc.oninput = hint;
    f.category.onchange = hint;
    sync();
    guard(f, (v) => {
      const useCard = k === "expense" && s.cards.length > 0 && !isPayment && v.payMode === "card";
      const draft = {
        kind: k,
        desc: v.desc,
        value: v.value,
        category: v.category,
        date: v.date,
        paid: !!f.paid.checked,
        accountId: v.accountId,
        cardId: useCard ? v.cardId : "",
        reps: parseInt(v.reps || "1", 10) || 1,
        repsMode: v.repsMode || "TOTAL",
        recurring: !!f.recurring?.checked
      };
      apply(Ops.saveTx(ctx.state, t?.id ?? null, draft), t ? "Lançamento atualizado" : "Lançamento salvo");
    });
    onDelete(d, async () => {
      if (!await ask("Excluir lançamento", "Excluir este lançamento?", { ok: "Excluir", danger: true })) return;
      const later = Ops.laterParcels(ctx.state, t.id);
      if (!later.length) {
        ctx.replace(Ops.deleteTx(ctx.state, t.id, false));
        closeSheet();
        toast("Lançamento excluído");
        return;
      }
      const r = await confirmDlg("Parcelas", `Excluir também as ${later.length} parcela(s) seguinte(s)?`, { ok: "Excluir também", cancel: "Só esta", danger: true });
      if (r == null) return;
      ctx.replace(Ops.deleteTx(ctx.state, t.id, r === "ok"));
      closeSheet();
      toast("Lançamento excluído");
    });
  }
  function goalEditor(id = null) {
    const g = id ? ctx.state.goals.find((x) => x.id === id) : null;
    const body = `<form id="f" novalidate>
    ${field("Nome", input("name", g?.name ?? "", { max: 60 }))}
    ${field("Valor da meta (R$)", moneyInput("target", g ? Money.input(g.target) : ""))}
    ${g ? field("Guardar ou retirar agora (R$)", moneyInput("move", "", "Ex.: 100 ou -50")) : ""}
    ${field("Prazo (opcional)", input("deadline", g?.deadline ?? "", { type: "date" }))}
    ${field("Contribuição mensal planejada (opcional)", moneyInput("monthly", g?.monthly > 0 ? Money.input(g.monthly) : ""))}
    ${actions("Salvar", g ? "Excluir meta" : null)}</form>`;
    const d = openSheet({ title: g ? "Editar meta" : "Nova meta", subtitle: g ? `Guardado até agora: ${money(g.saved)}` : "Dê um nome e um valor ao seu objetivo.", body });
    guard(d.querySelector("#f"), (v) => apply(Ops.saveGoal(ctx.state, g?.id ?? null, v.name, v.target, v.move ?? "", v.deadline || null, v.monthly), "Meta salva"));
    onDelete(d, async () => {
      if (await ask("Excluir meta", `Excluir a meta “${g.name}”?`, { ok: "Excluir", danger: true })) {
        ctx.replace(Ops.deleteGoal(ctx.state, g.id));
        closeSheet();
      }
    });
  }
  function accountEditor(id = null) {
    const s = ctx.state, a = id ? account(s, id) : null;
    const body = `<form id="f" novalidate>${field("Nome", input("name", a?.name ?? "", { max: 40 }))}
    ${field("Saldo inicial (R$)", moneyInput("initial", a ? Money.input(a.initial) : "0,00"))}${actions("Salvar", a && s.accounts.length > 1 ? "Excluir conta" : null)}</form>`;
    const d = openSheet({ title: a ? "Editar conta" : "Nova conta", subtitle: "O saldo inicial entra no saldo atual.", body });
    guard(d.querySelector("#f"), (v) => apply(Ops.saveAccount(ctx.state, a?.id ?? null, v.name, v.initial), "Conta salva"));
    onDelete(d, async () => {
      const o = Ops.deleteAccount(ctx.state, a.id);
      if (!o.ok) return notice(o.title, o.message);
      if (await ask("Excluir conta", `Excluir a conta “${a.name}”?`, { ok: "Excluir", danger: true })) {
        ctx.replace(o.state);
        closeSheet();
      }
    });
  }
  function cardEditor(id = null) {
    const c = id ? card(ctx.state, id) : null;
    const body = `<form id="f" novalidate>${field("Nome", input("name", c?.name ?? "", { max: 40 }))}
    ${field("Limite (R$)", moneyInput("limit", c ? Money.input(c.limit) : ""))}
    <div class="row2">${field("Fecha dia", input("close", String(c?.close ?? 5), { inputmode: "numeric", max: 2 }))}${field("Vence dia", input("due", String(c?.due ?? 12), { inputmode: "numeric", max: 2 }))}</div>
    ${actions("Salvar", c ? "Excluir cartão" : null)}</form>`;
    const d = openSheet({ title: c ? "Editar cartão" : "Novo cartão", subtitle: "Compras feitas após o dia de fechamento entram na fatura seguinte.", body });
    guard(d.querySelector("#f"), (v) => apply(Ops.saveCard(ctx.state, c?.id ?? null, v.name, v.limit, v.close, v.due), "Cartão salvo"));
    onDelete(d, async () => {
      const o = Ops.deleteCard(ctx.state, c.id);
      if (!o.ok) return notice(o.title, o.message);
      if (await ask("Excluir cartão", `Excluir o cartão “${c.name}”?`, { ok: "Excluir", danger: true })) {
        ctx.replace(o.state);
        closeSheet();
      }
    });
  }
  function payInvoiceEditor(cardId) {
    const s = ctx.state, c = card(s, cardId), cur = c && Finance.cardStatus(s, c, today()).current;
    if (!c || !cur) return notice("Fatura", "Não há fatura em aberto neste cartão.");
    const body = `<form id="f" novalidate>${field("Valor pago (R$)", moneyInput("value", Money.input(cur.open)))}
    ${field("Pago com a conta", select("accountId", s.accounts.map((a) => [a.id, a.name]), s.accounts[0].id))}
    ${field("Data do pagamento", input("date", today(), { type: "date" }))}${actions("Registrar pagamento")}</form>`;
    const d = openSheet({ title: `Pagar fatura · ${c.name}`, subtitle: `Fatura de ${brMonthLabel(cur.ym)} · vence ${brDate(cur.due)} · em aberto ${money(cur.open)}`, body });
    guard(d.querySelector("#f"), (v) => apply(Ops.payInvoice(ctx.state, c.id, v.value, v.accountId, v.date), "Pagamento registrado"));
  }
  function recurringEditor(id = null) {
    const s = ctx.state, r = id ? s.recurring.find((x) => x.id === id) : null;
    let k = r?.kind ?? "expense";
    const cats = (kk) => {
      const l = [...s.cats[kk]];
      if (r && r.kind === kk && !l.includes(r.category)) l.push(r.category);
      return l;
    };
    const body = `<form id="f" novalidate>${field("Descrição", input("desc", r?.desc ?? "", { max: 120 }))}
    ${field("Valor (R$)", moneyInput("value", r ? Money.input(r.value) : ""))}
    <div class="row2">${field("Tipo", select("kind", [["expense", "Despesa"], ["income", "Receita"]], k))}${field("Dia do mês", input("day", String(r?.day ?? 1), { inputmode: "numeric", max: 2 }))}</div>
    ${field("Categoria", select("category", cats(k).map((c) => [c, c]), r?.category ?? s.cats[k][0]))}
    ${field("Conta", select("accountId", s.accounts.map((a) => [a.id, a.name]), r?.accountId ?? s.accounts[0].id))}
    <div id="recCard">${s.cards.length ? field("Cartão (opcional)", select("cardId", [["", "Nenhum (debita da conta)"], ...s.cards.map((c) => [c.id, c.name])], r?.cardId ?? "")) : ""}</div>
    ${r ? check("active", "Ativa", r.active, { sub: "Pausada não gera novos lançamentos" }) : field("Começa em", input("start", today(), { type: "date" }))}
    ${actions("Salvar", r ? "Excluir recorrência" : null)}</form>`;
    const d = openSheet({ title: r ? "Editar recorrência" : "Nova recorrência", subtitle: "Cria um lançamento pendente por mês, a partir da data de início.", body });
    const f = d.querySelector("#f");
    const sync = () => {
      const w = d.querySelector("#recCard");
      if (w) w.hidden = k !== "expense";
    };
    f.kind.onchange = () => {
      k = f.kind.value;
      const cur = f.category.value;
      f.category.innerHTML = cats(k).map((c) => `<option value="${attr(c)}">${esc(c)}</option>`).join("");
      if (cats(k).includes(cur)) f.category.value = cur;
      sync();
    };
    sync();
    guard(f, (v) => apply(Ops.saveRecurring(ctx.state, r?.id ?? null, k, v.desc, v.value, v.day, v.category, v.accountId, k === "expense" ? v.cardId ?? "" : "", r ? !!f.active.checked : true, v.start || null, today()), "Recorrência salva"));
    onDelete(d, async () => {
      if (await ask("Excluir recorrência", "Excluir esta recorrência? Os lançamentos já criados serão mantidos.", { ok: "Excluir", danger: true })) {
        ctx.replace(Ops.deleteRecurring(ctx.state, r.id));
        closeSheet();
      }
    });
  }
  function limitEditor(current = null) {
    const s = ctx.state;
    const cats = current != null && !s.cats.expense.includes(current) ? [...s.cats.expense, current] : s.cats.expense;
    const body = `<form id="f" novalidate>${field("Categoria", select("category", cats.map((c) => [c, c]), current ?? s.cats.expense[0]))}
    ${field("Valor mensal (R$)", moneyInput("value", current != null && s.limits.has(current) ? Money.input(s.limits.get(current)) : ""))}${actions("Salvar", current != null ? "Excluir limite" : null)}</form>`;
    const d = openSheet({ title: current == null ? "Novo limite" : "Editar limite", subtitle: "Valor máximo mensal da categoria. Despesas pendentes do mês também contam.", body });
    guard(d.querySelector("#f"), (v) => apply(Ops.saveLimit(ctx.state, current, v.category, v.value), "Limite salvo"));
    onDelete(d, async () => {
      if (await ask("Excluir limite", `Excluir o limite de “${current}”?`, { ok: "Excluir", danger: true })) {
        ctx.replace(Ops.deleteLimit(ctx.state, current));
        closeSheet();
      }
    });
  }
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4e3);
  }
  function exportCsv() {
    download(`lancamentos-${today()}.csv`, Csv.build(ctx.state), "text/csv;charset=utf-8");
    toast("CSV exportado");
  }
  function exportBackup() {
    const meta = { app: "Finan+", version: BACKUP_VERSION, appVersion: `web ${APP_VERSION}`, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    download(`backup-finan-plus-${today()}.json`, toJson(ctx.state, meta), "application/json");
    toast("Backup salvo");
  }
  function pickFile(accept) {
    return new Promise((resolve) => {
      const i = document.createElement("input");
      i.type = "file";
      i.accept = accept;
      i.hidden = true;
      i.onchange = () => {
        resolve(i.files[0] || null);
        i.remove();
      };
      i.oncancel = () => {
        resolve(null);
        i.remove();
      };
      document.body.append(i);
      i.click();
    });
  }
  async function restoreBackup() {
    const file = await pickFile("application/json,.json");
    if (!file) return;
    let n;
    try {
      if (file.size > 30 * 1024 * 1024) throw new BackupError("Arquivo grande demais");
      n = parseBackup(await file.text());
    } catch (e) {
      return notice("Não foi possível restaurar", "Arquivo de backup inválido ou danificado. Nada foi alterado." + (e instanceof BackupError ? `
(${e.message})` : ""));
    }
    const st = n.state, bad = n.droppedTotal;
    const ok2 = await ask("Revisar restauração", `Backup com ${st.txs.length} lançamentos, ${st.accounts.length} contas, ${st.cards.length} cartões e ${st.goals.length} metas.` + (bad > 0 ? `
${bad} item(ns) inválido(s) será(ão) ignorado(s).` : "") + "\nSubstituir os dados atuais? O PIN deste aparelho é mantido.", { ok: "Substituir", danger: true });
    if (!ok2 || ctx.locked) return;
    const [g] = Finance.generateRecurring(st, today());
    ctx.replace(g);
    toast("Backup restaurado");
  }
  function pdfDialog() {
    const s = ctx.state, t = today();
    const dates = s.txs.map((x) => x.date).sort();
    const first = dates[0] ?? null, last = dates.at(-1) ?? null;
    let [from, to] = ctx.moves.from && ctx.moves.to ? [ctx.moves.from, ctx.moves.to] : preset("mes", t, first, last);
    const body = `<form id="f" novalidate>
    <p class="muted small">Resumo com receitas, despesas e saldo, gráfico por categoria, evolução mensal, maiores despesas, contas, metas e a lista de lançamentos do período.</p>
    <div class="presetRow" id="pdfPresets">${PRESETS.map(([k, l]) => `<button type="button" data-p="${k}">${l}</button>`).join("")}</div>
    <div class="row2">${field("De", input("from", from, { type: "date" }))}${field("Até", input("to", to, { type: "date" }))}</div>
    ${check("withTxs", "Incluir a lista de lançamentos", true, { sub: "Todos os lançamentos do período, inclusive pendentes" })}
    <p class="muted small" id="pdfPreview"></p>
    <p class="infoBox warnBox">${icon("warning", 18)}<span>O PDF mostra os valores mesmo com “Ocultar valores” ligado e não é criptografado: guarde em local seguro e cuidado ao compartilhar.</span></p>
    ${actions("Gerar PDF")}</form>`;
    const d = openSheet({ title: "Relatório em PDF", body });
    const f = d.querySelector("#f");
    const upd = () => {
      const a = f.from.value, b = f.to.value, p = d.querySelector("#pdfPreview");
      d.querySelectorAll("#pdfPresets button").forEach((x) => {
        const [pa, pb] = preset(x.dataset.p, t, first, last);
        x.setAttribute("aria-pressed", pa === a && pb === b);
        x.classList.toggle("selected", pa === a && pb === b);
      });
      if (!a || !b || b < a) {
        p.textContent = "";
        return;
      }
      const r = buildReport(ctx.state, a, b, t);
      p.textContent = `${r.txs.length} lançamento(s) · receitas ${money(r.income)} · despesas ${money(r.expense)} · saldo ${money(r.balance)}`;
    };
    d.querySelectorAll("#pdfPresets button").forEach((b) => b.onclick = () => {
      [from, to] = preset(b.dataset.p, t, first, last);
      f.from.value = from;
      f.to.value = to;
      upd();
    });
    f.from.onchange = f.to.onchange = upd;
    upd();
    guard(f, (v) => {
      if (!v.from || !v.to) return notice("Período incompleto", "Escolha as datas inicial e final.");
      if (v.to < v.from) return notice("Período inválido", "A data final deve ser igual ou posterior à inicial.");
      try {
        const r = buildReport(ctx.state, v.from, v.to, today());
        const { bytes } = renderPdf(r, ctx.state, { includeTransactions: !!f.withTxs.checked, appVersion: APP_VERSION });
        download(reportFileName(v.from, v.to), new Blob([bytes], { type: "application/pdf" }));
        closeSheet();
        notice("PDF gerado", `Relatório de ${brDate(v.from)} a ${brDate(v.to)} salvo na pasta de downloads do navegador.`);
      } catch (e) {
        console.error(e);
        notice("Não foi possível gerar o PDF", "Tente de novo com outro período.");
      }
    });
  }
  async function renameCategory(kind, cat) {
    const n = await promptDlg("Renomear categoria", `Lançamentos, recorrências e limites de “${cat}” passam a usar o novo nome.`, { label: "Novo nome", value: cat, max: 40 });
    if (n == null) return;
    const o = Ops.renameCategory(ctx.state, kind, cat, n);
    if (!o.ok) return notice(o.title, o.message);
    ctx.replace(o.state);
  }
  async function deleteCategory(kind, cat) {
    const chk = Ops.checkDeleteCategory(ctx.state, kind, cat);
    if (!chk.ok) return notice(chk.title, chk.message);
    const used = Ops.categoryUseCount(ctx.state, kind, cat);
    const msg = used > 0 ? `Excluir “${cat}” da lista de categorias? ${used} lançamento(s) antigo(s) continuará(ão) com essa categoria no histórico.` : `Excluir a categoria “${cat}”?`;
    if (await ask("Excluir categoria", msg, { ok: "Excluir", danger: true })) ctx.replace(Ops.deleteCategory(ctx.state, kind, cat));
  }
  var pinInput = (label) => ({ label, type: "password", inputmode: "numeric", max: 8 });
  async function setPin() {
    const d = ctx.device;
    if (d.pinHash) {
      const cur = await promptDlg("Trocar PIN", "Digite o PIN atual.", pinInput("PIN atual"), { ok: "Continuar" });
      if (cur == null) return;
      if (!(await verifyPin(cur, d.pinHash)).ok) return notice("PIN incorreto", "O PIN não foi alterado.");
    }
    const p1 = await promptDlg("Definir PIN", "Use de 4 a 8 números.", pinInput("Novo PIN"), { ok: "Continuar" });
    if (p1 == null) return;
    if (!pinValidFormat(p1)) return notice("PIN inválido", "Use de 4 a 8 números.");
    const p2 = await promptDlg("Confirmar PIN", "Digite o PIN de novo.", pinInput("Repita o PIN"), { ok: "Ativar PIN" });
    if (p2 == null) return;
    if (p1 !== p2) return notice("PIN não definido", "Os PINs não conferem.");
    try {
      ctx.setDevice({ pinHash: await hashPin(p1), pinFails: 0, pinWaitUntil: 0 });
      notice("PIN ativado", "O PIN será pedido ao abrir o Finan+. Se esquecer o PIN, só será possível recuperar os dados com um backup.");
    } catch (e) {
      notice("PIN não definido", e.message);
    }
  }
  async function removePin() {
    const p = await promptDlg("Remover PIN", "Digite o PIN atual para confirmar.", pinInput("PIN atual"), { ok: "Remover" });
    if (p == null) return;
    if ((await verifyPin(p, ctx.device.pinHash)).ok) {
      ctx.setDevice({ pinHash: "" });
      ctx.replace({ ...ctx.state, autoLock: 0 });
      toast("PIN removido");
    } else notice("Não foi possível remover", "PIN incorreto.");
  }
  var SHORTCUTS = [
    ["Lançamentos", [["N  ·  Ctrl+N", "Nova despesa"], ["R  ·  Ctrl+Shift+N", "Nova receita"], ["M  ·  Ctrl+M", "Nova meta"], ["/  ·  Ctrl+F", "Buscar lançamentos"], ["K  ·  Ctrl+K", "Perguntar ao assistente"]]],
    ["Navegação", [["1 … 5  ·  Ctrl+1 … 5", "Início, Lançamentos, Relatórios, Assistente, Ajustes"], ["Ctrl+,", "Ajustes"], ["Esc", "Fechar a janela aberta"]]],
    ["Privacidade e dados", [["H  ·  Ctrl+H", "Ocultar ou mostrar valores"], ["Ctrl+L", "Bloquear agora (com PIN)"], ["Ctrl+P", "Relatório em PDF"], ["Ctrl+E", "Exportar CSV"], ["Ctrl+S", "Salvar backup JSON"], ["Ctrl+O", "Restaurar backup"]]],
    ["Geral", [["?  ·  Ctrl+/", "Atalhos de teclado"]]]
  ];
  function shortcutsDialog() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
    const k = (s) => esc(mac ? s.replace(/Ctrl/g, "⌘") : s);
    openSheet({
      title: "Atalhos de teclado",
      subtitle: "As teclas simples funcionam fora dos campos de texto. Numa aba comum do navegador, alguns atalhos com Ctrl são do próprio navegador; no app instalado, todos funcionam. Com uma janela aberta, os atalhos esperam até ela fechar.",
      wide: true,
      body: `<div class="shortcuts">${SHORTCUTS.map(([g, l]) => `<section><h4 class="subhead">${esc(g)}</h4>${l.map(([a, b]) => `<div class="sc"><span>${esc(b)}</span><kbd>${k(a)}</kbd></div>`).join("")}</section>`).join("")}</div>`
    });
  }
  function whatsNew() {
    const items = [
      "1.1.2: reativar uma recorrência pausada não cria mais os lançamentos dos meses parados; backups com valores gigantes são recusados.",
      "1.1.1: em Ajustes › Sobre, links para o código-fonte desta versão web e para baixar a versão Linux (.deb). Gráfico do relatório em PDF não trava mais com valores de centavos.",
      "Novo nome: Finan+, com o ícone do app Android.",
      "Layout para computador e notebook: barra lateral com saldo, telas em 2 ou 3 colunas, atalhos de teclado e janelas centrais.",
      "Dados criptografados (AES-256-GCM) com chave não extraível do navegador; os dados antigos são migrados automaticamente.",
      "PIN com hash PBKDF2 e espera crescente após erros; bloqueio automático por inatividade.",
      "Assistente no aparelho: sugestão de categoria, resumo do mês, 7 tipos de dica e perguntas rápidas.",
      "Relatório em PDF com escolha de período, gerado no próprio navegador.",
      "Data completa no Início, cartão de vencimentos dos próximos 30 dias e avisos de vencimento.",
      "Parcelas com valor total ou por parcela, exclusão das parcelas seguintes, recorrências recuperadas e categorias renomeáveis.",
      "Ajustes em cartões que abrem e fecham com + / −; somente ícones Material Symbols.",
      "Backup JSON versão 5, compatível com o app Android e a versão Linux."
    ];
    openSheet({ title: `Novidades da versão ${APP_VERSION}`, body: `<ul class="reportLines">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul><p class="muted small">Lista completa em CHANGELOG.md e FUNCIONALIDADES.md.</p>` });
  }

  // js/remote.js
  var isRemote = () => typeof document !== "undefined" && !!document.querySelector('meta[name="finanplus-remote"]');
  var TOKEN_KEY = "finanplus-lan-token";
  var ss = () => {
    try {
      return globalThis.sessionStorage || null;
    } catch {
      return null;
    }
  };
  var getToken = () => {
    try {
      return ss()?.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  };
  var setToken = (t) => {
    try {
      t ? ss()?.setItem(TOKEN_KEY, t) : ss()?.removeItem(TOKEN_KEY);
    } catch {
    }
  };
  var RemoteError = class extends Error {
    constructor(status, title, message, body) {
      super(message);
      this.status = status;
      this.title = title;
      this.body = body;
    }
  };
  async function call(method, path, body, fetchImpl = globalThis.fetch) {
    const t = getToken();
    let res;
    try {
      res = await fetchImpl(path, {
        method,
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...t ? { Authorization: "Bearer " + t } : {} },
        body: body === void 0 ? void 0 : JSON.stringify(body)
      });
    } catch {
      throw new RemoteError(0, "Sem conexão com o celular", "Confira se o acesso pela rede continua ligado no celular e se os dois estão no mesmo Wi-Fi.");
    }
    let j = null;
    try {
      j = await res.json();
    } catch {
    }
    if (!res.ok) throw new RemoteError(res.status, j?.title || "Erro", j?.message || "Erro " + res.status, j);
    return j;
  }
  var _RemoteStore_instances, call_fn, take_fn;
  var RemoteStore = class {
    constructor(fetchImpl = globalThis.fetch) {
      __privateAdd(this, _RemoteStore_instances);
      this.fetch = fetchImpl;
      this.mode = "remote";
      this.locked = false;
      this.noDb = false;
      this.savedAt = 0;
      this.rev = void 0;
      this.themeRev = void 0;
      this.palette = null;
      this.queue = Promise.resolve();
      this.onUnauthorized = null;
    }
    get encrypted() {
      return true;
    }
    // HTTPS, e nada gravado neste navegador
    get remote() {
      return true;
    }
    async open() {
      const n = __privateMethod(this, _RemoteStore_instances, take_fn).call(this, await __privateMethod(this, _RemoteStore_instances, call_fn).call(this, "GET", "/api/remote/state"));
      return { status: "ok", state: n.state, dropped: n.droppedTotal };
    }
    async reload() {
      return __privateMethod(this, _RemoteStore_instances, take_fn).call(this, await __privateMethod(this, _RemoteStore_instances, call_fn).call(this, "GET", "/api/remote/state")).state;
    }
    /** grava no celular (em fila: gravações nunca se sobrepõem) */
    save(state) {
      const data = JSON.parse(toJson(state));
      const job = this.queue.then(async () => {
        try {
          const j = await __privateMethod(this, _RemoteStore_instances, call_fn).call(this, "PUT", "/api/remote/state", { rev: this.rev, data });
          if (!Number.isSafeInteger(j?.rev)) throw new RemoteError(502, "Resposta inválida do celular", "Confirmação de gravação sem versão.");
          this.rev = j.rev;
          this.savedAt = Date.now();
        } catch (e) {
          if (e.status === 409) throw new ConflictError("Os dados foram alterados no celular.");
          throw e;
        }
      });
      this.queue = job.catch(() => {
      });
      return job;
    }
    /**
     * Algo mudou no celular desde a última leitura? Consulta leve, que não conta como uso
     * (o servidor continua desligando sozinho após 10 min parado).
     */
    async changed() {
      const j = await __privateMethod(this, _RemoteStore_instances, call_fn).call(this, "GET", "/api/rev");
      if (!Number.isSafeInteger(j?.data) || typeof j.rev !== "string") throw new RemoteError(502, "Resposta inválida do celular", "Versão em formato inesperado.");
      const theme = j.rev.split("-")[1] || "";
      const themeChanged = this.themeRev !== void 0 && theme !== this.themeRev;
      this.themeRev = theme;
      return themeChanged || j.data !== this.rev;
    }
    async logout() {
      try {
        await __privateMethod(this, _RemoteStore_instances, call_fn).call(this, "POST", "/api/logout");
      } catch {
      }
      setToken(null);
    }
    // o restante do Store não se aplica: os dados não ficam aqui
    async startOver() {
      this.locked = false;
    }
    async unreadableExport() {
      return null;
    }
    async wipe() {
      throw new Error("Apague os dados pelo celular.");
    }
    close() {
    }
    static async persist() {
      return false;
    }
  };
  _RemoteStore_instances = new WeakSet();
  call_fn = function(method, path, body) {
    return call(method, path, body, this.fetch).catch((e) => {
      if (e.status === 401) this.onUnauthorized?.();
      throw e;
    });
  };
  /** Resposta do celular validada antes de usar: versão inteira, dados num objeto, cores num objeto (ou nada). */
  take_fn = function(j) {
    if (!j || !Number.isSafeInteger(j.rev) || j.rev < 0 || !j.data || typeof j.data !== "object" || Array.isArray(j.data)) {
      throw new RemoteError(502, "Resposta inválida do celular", "Os dados recebidos não estão no formato esperado. Nada foi alterado.");
    }
    this.rev = j.rev;
    this.palette = j.palette && typeof j.palette === "object" ? j.palette : null;
    return normalize(j.data);
  };
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function pairFlow(el, message = "") {
    return new Promise((resolve) => {
      const shell = document.getElementById("shell");
      if (shell) shell.inert = true;
      el.hidden = false;
      let waiting = null;
      const form = (err2 = "") => {
        waiting = null;
        el.innerHTML = `<div class="lockBox glass pairBox" role="dialog" aria-modal="true" aria-labelledby="pairTitle">
        <img src="icons/icon-192.png" alt="" width="64" height="64">
        <h2 id="pairTitle">Conectar ao celular</h2>
        <p class="muted">No celular, abra <b>Ajustes › Acesso pela rede</b> e digite o código de 6 dígitos mostrado lá.</p>
        <form id="pairForm" novalidate autocomplete="off">
          <input id="pairCode" class="pairCode" inputmode="numeric" maxlength="7" aria-label="Código de pareamento" placeholder="000 000">
          <button type="submit" class="btn primary wide">Conectar</button>
        </form>
        <small id="pairErr" class="pinErr" role="alert">${esc(err2)}</small>
        <p class="muted small">Conexão criptografada. Os dados ficam no celular; nada é gravado neste navegador.</p>
      </div>`;
        const inp = el.querySelector("#pairCode");
        inp.oninput = () => {
          const d = inp.value.replace(/\D/g, "").slice(0, 6);
          inp.value = d.length > 3 ? d.slice(0, 3) + " " + d.slice(3) : d;
        };
        el.querySelector("#pairForm").onsubmit = async (e) => {
          e.preventDefault();
          const code = inp.value.replace(/\s/g, "");
          const errEl = el.querySelector("#pairErr");
          if (!/^\d{6}$/.test(code)) {
            errEl.textContent = "O código tem 6 dígitos.";
            return;
          }
          errEl.textContent = "Conectando…";
          try {
            const j = await call("POST", "/api/pair", { code });
            if (j?.token) return done(j.token);
            if (j?.pending) return wait(j.pending, j.label, j.timeout);
            errEl.textContent = "Resposta inesperada do celular.";
          } catch (err3) {
            errEl.textContent = err3.message;
          }
        };
        inp.focus();
      };
      const wait = async (id, label, timeoutS) => {
        const me = {};
        waiting = me;
        el.innerHTML = `<div class="lockBox glass pairBox" role="dialog" aria-modal="true" aria-labelledby="pairTitle">
        <div class="pairSpinner" aria-hidden="true"></div>
        <h2 id="pairTitle">Confirme no celular</h2>
        <p class="muted" role="status">O celular está perguntando se permite <b>${esc(label || "este navegador")}</b>. Toque em <b>Permitir</b> lá.</p>
        <button type="button" class="btn soft" id="pairCancel">Cancelar</button>
      </div>`;
        el.querySelector("#pairCancel").onclick = () => form("Pedido cancelado.");
        const until = Date.now() + (timeoutS || 120) * 1e3;
        while (waiting === me && Date.now() < until) {
          await sleep(1500);
          if (waiting !== me) return;
          try {
            const j = await call("GET", "/api/pair/" + encodeURIComponent(id));
            if (j.status === "approved") return done(j.token);
            if (j.status === "denied") return form("O acesso foi recusado no celular.");
          } catch (err2) {
            if (err2.status === 410) return form("O pedido expirou. Digite o novo código do celular.");
            return form(err2.message);
          }
        }
        if (waiting === me) form("Sem resposta do celular. Digite o novo código e tente de novo.");
      };
      const done = (token) => {
        waiting = null;
        setToken(token);
        el.hidden = true;
        el.innerHTML = "";
        if (shell) shell.inert = false;
        resolve(token);
      };
      form(message);
    });
  }
  var VARS = {
    bg: "--bg",
    surface: "--surface",
    text: "--text",
    muted: "--muted",
    accent: "--accent",
    onAccent: "--onAccent",
    accent2: "--accent2",
    red: "--red",
    green: "--green",
    track: "--track",
    glowA: "--glow1",
    glowB: "--glow2",
    border: "--line"
  };
  var opaque = (c) => String(c).replace(/^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/, "rgba($1,$2,$3,1)");
  function applyPalette(root, palette, dark) {
    const p = palette ? dark ? palette.dark : palette.light : null;
    for (const v of [...Object.values(VARS), "--solid", "--field", "--surface2"]) root.style.removeProperty(v);
    if (!p) return null;
    for (const [k, v] of Object.entries(VARS)) if (p[k]) root.style.setProperty(v, p[k]);
    if (p.surface) {
      root.style.setProperty("--solid", opaque(p.surface));
      root.style.setProperty("--field", p.dark ? opaque(p.bg) : opaque(p.surface));
    }
    return p.dark ? "oledGray" : "materialBlue";
  }

  // js/app.js
  var env = { encrypted: false, remote: false };
  var REMOTE = isRemote();
  var VIEWS = { home: "inicio", moves: "lancamentos", reports: "relatorios", assist: "assistente", prefs: "ajustes" };
  var HASH_TO_VIEW = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [v, k]));
  var channel = null;
  ctx.replace = (state, o = {}) => {
    ctx.state = state;
    if (!o.noSave) persist();
    render();
  };
  ctx.commit = (outcome) => {
    if (!outcome.ok) {
      notice(outcome.title, outcome.message);
      return false;
    }
    ctx.replace(outcome.state);
    return true;
  };
  function updateDevice(patch) {
    const fresh = loadDevice();
    ctx.device = typeof patch === "function" ? patch(fresh) : { ...fresh, ...patch };
    saveDevice(ctx.device);
    return ctx.device;
  }
  ctx.setDevice = (patch) => {
    updateDevice(patch);
    render();
  };
  setDialogGuard(() => ctx.locked);
  window.addEventListener("storage", (e) => {
    if (e.key !== "finanplus_device" || !ctx.device) return;
    const before = ctx.device.pinHash;
    ctx.device = loadDevice();
    if (ctx.device.pinHash && ctx.device.pinHash !== before && !ctx.locked && !ctx.problem) lockNow();
    else render();
  });
  async function persist() {
    try {
      await ctx.store.save(ctx.state);
      channel?.postMessage({ type: "saved" });
    } catch (e) {
      if (e instanceof ConflictError) {
        try {
          ctx.state = await ctx.store.reload();
          render();
        } catch (e2) {
          console.error(e2);
        }
        notice("Alteração não salva", REMOTE ? "Os dados foram alterados no celular (ou em outro navegador) ao mesmo tempo. A tela foi atualizada com a versão mais recente; refaça a última alteração." : "Os dados foram alterados em outra aba ou janela do Finan+ ao mesmo tempo. A tela foi atualizada com a versão mais recente; refaça a última alteração.");
        return;
      }
      console.error(e);
      if (REMOTE) {
        if (e?.status === 401) return;
        notice("Não foi possível salvar no celular", (e?.message || e) + "\nA alteração aparece aqui, mas não foi gravada. Ao reconectar, a tela volta aos dados do celular.");
        return;
      }
      notice("Não foi possível salvar", "Verifique o espaço livre do aparelho e tente de novo. Faça um backup JSON para não perder dados.\n(" + (e?.message || e) + ")");
    }
  }
  var THEME_COLORS = { light: "#d9e5ff", dark: "#0f1524", materialBlue: "#dbe7ff", oledGray: "#181a1f", tokyo: "#1a1b26", nord: "#2e3440" };
  var darkMq = matchMedia("(prefers-color-scheme: dark)");
  function applyTheme(theme) {
    const t = themeOf(theme);
    let eff = t === "auto" ? darkMq.matches ? REMOTE ? "oledGray" : "dark" : "light" : t;
    if (REMOTE) {
      const base = applyPalette(document.documentElement, t === "materialBlue" ? ctx.store?.palette : null, darkMq.matches);
      if (base) eff = base;
    }
    document.documentElement.dataset.theme = eff;
    document.querySelector("meta[name=theme-color]")?.setAttribute("content", THEME_COLORS[eff] || "#d9e5ff");
    if (ctx.device && ctx.device.themeCache !== theme) updateDevice({ themeCache: theme });
  }
  darkMq.addEventListener?.("change", () => ctx.state && applyTheme(ctx.state.theme));
  var mq2 = matchMedia("(min-width: 900px)");
  var mq3 = matchMedia("(min-width: 1360px)");
  function colsFor(view) {
    if (!mq2.matches) return 1;
    if (view === "home" && mq3.matches) return 3;
    return 2;
  }
  mq2.addEventListener?.("change", () => render());
  mq3.addEventListener?.("change", () => render());
  ctx.go = (view, o = {}) => {
    if (!VIEWS[view]) view = "home";
    if (o.fold) openFolds.add(o.fold);
    const h = "#" + VIEWS[view];
    if (location.hash !== h) {
      history.pushState(null, "", view === "home" ? location.pathname + location.search : h);
    }
    showView(view, o);
  };
  function viewFromHash() {
    return HASH_TO_VIEW[location.hash.slice(1)] || "home";
  }
  window.addEventListener("popstate", () => {
    closeSheet();
    showView(viewFromHash());
  });
  function showView(view, o = {}) {
    const changed = ctx.view !== view;
    ctx.view = view;
    render();
    if (changed) window.scrollTo({ top: 0 });
    if (o.fold) $(`#fold-${o.fold}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    if (o.focus === "ask") $("#askInput")?.focus();
    if (o.focus === "search") $("#q")?.focus();
    if (changed && !o.focus) $("#main")?.focus({ preventScroll: true });
  }
  ctx.openMoves = (q = "", from = "", to = "", kind = "", st = "") => {
    Object.assign(ctx.moves, { q: q || "", from: from || null, to: to || null, kind: kind || "", st: st || "", limit: 300, all: !from && !to });
    ctx.go("moves");
  };
  function render() {
    if (!ctx.state || ctx.locked || ctx.problem) return;
    applyTheme(ctx.state.theme);
    ctx.cols = colsFor(ctx.view);
    const act = document.activeElement;
    const keep = act && act.dataset ? { act: act.dataset.act, id: act.dataset.id, view: act.dataset.view, el: act.id } : null;
    document.body.classList.toggle("privacy", !!ctx.state.privacy);
    document.body.dataset.view = ctx.view;
    $("#sideNav").innerHTML = sideNavHtml();
    $("#sideFoot").innerHTML = sideFootHtml();
    $("#topbar").innerHTML = topbarHtml();
    $("#appHeader").innerHTML = mobileHeaderHtml();
    $("#appHeader").hidden = ctx.view !== "home";
    $("#bottomNav").innerHTML = bottomNavHtml();
    for (const v of Object.keys(VIEWS)) {
      const el = $(`#${v}View`);
      el.classList.toggle("activeView", v === ctx.view);
      if (v !== ctx.view) {
        el.innerHTML = "";
        continue;
      }
      el.innerHTML = v === "home" ? homeView() : v === "moves" ? movesView() : v === "reports" ? reportsView() : v === "assist" ? assistView() : prefsView(env);
    }
    bindView();
    if (keep && (keep.act || keep.el)) {
      const sel = keep.el && !keep.act ? `#${CSS.escape(keep.el)}` : `[data-act="${keep.act}"]${keep.id ? `[data-id="${CSS.escape(keep.id)}"]` : ""}${keep.view ? `[data-view="${keep.view}"]` : ""}`;
      const el = document.querySelector(sel);
      if (el && el !== document.activeElement && !dialogOpen()) el.focus({ preventScroll: true });
    }
  }
  ctx.render = render;
  function renderMovesData() {
    const d = movesData();
    $("#movesTotals") && ($("#movesTotals").innerHTML = d.totals);
    $("#periodTransactions") && ($("#periodTransactions").innerHTML = d.list);
    $("#periodCount") && ($("#periodCount").textContent = d.count);
  }
  function bindView() {
    if (ctx.view === "moves") {
      renderMovesData();
      const f = ctx.moves;
      const upd = () => {
        f.limit = 300;
        renderMovesData();
      };
      $("#fromDate").onchange = (e) => {
        f.from = e.target.value || null;
        f.all = !f.from && !f.to;
        upd();
      };
      $("#toDate").onchange = (e) => {
        f.to = e.target.value || null;
        f.all = !f.from && !f.to;
        upd();
      };
      $("#q").oninput = (e) => {
        f.q = e.target.value;
        upd();
      };
      $("#kindF").onchange = (e) => {
        f.kind = e.target.value;
        upd();
      };
      $("#stF").onchange = (e) => {
        f.st = e.target.value;
        upd();
      };
    }
    if (ctx.view === "assist") {
      const form = $("#askForm");
      if (form) form.onsubmit = (e) => {
        e.preventDefault();
        askQuestion($("#askInput").value);
      };
    }
    if (ctx.view === "prefs") {
      $$("#prefsView input[type=checkbox][role=switch]").forEach((i) => i.onchange = () => onSwitch(i));
      const al = $("#autoLockSel");
      if (al) al.onchange = () => ctx.replace({ ...ctx.state, autoLock: parseInt(al.value, 10) || 0 });
      const cf = $("#catForm");
      if (cf) cf.onsubmit = (e) => {
        e.preventDefault();
        ctx.catKind = $("#newCatKind").value;
        const r = OpsAddCategory(ctx.catKind, $("#newCat").value);
        if (r) {
          $("#newCat")?.focus();
          toast("Categoria adicionada");
        }
      };
      $$("details.license").forEach((d) => d.addEventListener("toggle", async () => {
        const pre = d.querySelector("pre");
        if (!d.open || pre.dataset.loaded) return;
        pre.textContent = LICENSES[d.dataset.src] || "O texto está no arquivo " + d.dataset.src + ".";
        pre.dataset.loaded = "1";
      }));
    }
  }
  function OpsAddCategory(kind, name) {
    const o = Ops.addCategory(ctx.state, kind, name);
    if (!o.ok) {
      notice(o.title, o.message);
      return false;
    }
    ctx.replace(o.state);
    return true;
  }
  function askQuestion(q) {
    q = String(q || "").trim();
    ctx.lastQuestion = q;
    const box = $("#askAnswer");
    if (box) box.innerHTML = q ? answerHtml(q) : "";
  }
  async function onSwitch(i) {
    const v = i.checked;
    switch (i.name) {
      case "privacy":
        ctx.replace({ ...ctx.state, privacy: v });
        break;
      case "assistCategory":
      case "assistTips":
      case "assistAsk":
        ctx.setDevice({ [i.name]: v });
        break;
      case "notifications": {
        if (!v) {
          ctx.setDevice({ notifications: false });
          break;
        }
        if (typeof Notification === "undefined") {
          i.checked = false;
          return notice("Avisos", "Este navegador não oferece notificações.");
        }
        let p = Notification.permission;
        if (p === "default") p = await Notification.requestPermission();
        if (p !== "granted") {
          i.checked = false;
          ctx.setDevice({ notifications: false });
          return notice("Notificações desativadas", "Para receber avisos de vencimento, permita as notificações do Finan+ nas configurações do navegador.");
        }
        ctx.setDevice({ notifications: true, lastNotified: "" });
        checkNotifications();
        break;
      }
    }
  }
  var ACTIONS = {
    "new-tx": (el) => txEditor(el.dataset.kind || "expense"),
    "edit-tx": (el) => txEditor("expense", el.dataset.id),
    "toggle-paid": (el) => {
      ctx.replace(Ops.togglePaid(ctx.state, el.dataset.id));
    },
    "new-goal": () => goalEditor(),
    "edit-goal": (el) => goalEditor(el.dataset.id),
    "new-account": () => accountEditor(),
    "edit-account": (el) => accountEditor(el.dataset.id),
    "new-card": () => cardEditor(),
    "edit-card": (el) => cardEditor(el.dataset.id),
    "pay-invoice": (el) => payInvoiceEditor(el.dataset.id),
    "new-recurring": () => recurringEditor(),
    "edit-recurring": (el) => recurringEditor(el.dataset.id),
    "new-limit": () => limitEditor(),
    "edit-limit": (el) => limitEditor(el.dataset.cat),
    go: (el) => ctx.go(el.dataset.view, { fold: el.dataset.fold, focus: el.dataset.focus }),
    "open-moves": (el) => ctx.openMoves(el.dataset.q, el.dataset.from, el.dataset.to, el.dataset.kind, el.dataset.st),
    "moves-preset": (el) => {
      const p = el.dataset.p, f = ctx.moves, ym = ymOf(ctx.today);
      if (p === "month") {
        f.from = ymFirst(ym);
        f.to = ymLast(ym);
        f.all = false;
      } else if (p === "30") {
        f.to = ctx.today;
        f.from = addDays(ctx.today, -29);
        f.all = false;
      } else {
        const ds = ctx.state.txs.map((t) => t.date).sort();
        f.from = ds[0] ?? null;
        f.to = ds.at(-1) ?? null;
        f.all = true;
      }
      f.limit = 300;
      render();
    },
    "moves-more": () => {
      ctx.moves.limit += 300;
      renderMovesData();
    },
    "dismiss-tip": (el) => ctx.setDevice({ dismissedTips: [...ctx.device.dismissedTips, el.dataset.id] }),
    "restore-tip": (el) => ctx.setDevice({ dismissedTips: ctx.device.dismissedTips.filter((x) => x !== el.dataset.id) }),
    "restore-all-tips": () => ctx.setDevice({ dismissedTips: [] }),
    "ask-example": (el) => {
      const i = $("#askInput");
      if (i) i.value = el.dataset.q;
      askQuestion(el.dataset.q);
    },
    "toggle-privacy": () => {
      ctx.replace({ ...ctx.state, privacy: !ctx.state.privacy });
      toast(ctx.state.privacy ? "Valores ocultos" : "Valores visíveis");
    },
    lock: () => lockNow(),
    "remote-logout": async () => {
      if (!await ask("Desconectar do celular", "Este navegador deixa de acessar os dados do celular. Para voltar, digite um novo código.", { ok: "Desconectar" })) return;
      await ctx.store.logout();
      location.reload();
    },
    pdf: () => pdfDialog(),
    csv: () => exportCsv(),
    backup: () => exportBackup(),
    restore: () => restoreBackup(),
    wipe: () => wipeAll(),
    theme: (el) => ctx.replace({ ...ctx.state, theme: el.dataset.id }),
    "pin-set": () => setPin(),
    "pin-remove": () => removePin(),
    "notify-now": () => checkNotifications(true),
    "rename-cat": (el) => renameCategory(el.dataset.kind, el.dataset.cat),
    "delete-cat": (el) => deleteCategory(el.dataset.kind, el.dataset.cat),
    fold: (el) => {
      const id = el.dataset.id;
      if (openFolds.has(id)) openFolds.delete(id);
      else openFolds.add(id);
      const sec = $(`#fold-${id}`), open = openFolds.has(id);
      sec.classList.toggle("open", open);
      el.setAttribute("aria-expanded", open);
      sec.querySelector(".foldBody").hidden = !open;
      sec.querySelector(".foldBtn").innerHTML = icon(open ? "remove" : "add", 20);
    },
    search: () => ctx.go("moves", { focus: "search" }),
    menu: () => {
      const m = $("#menu");
      m.hidden = !m.hidden;
      if (!m.hidden) m.querySelector("button")?.focus();
    },
    shortcuts: () => shortcutsDialog(),
    whatsnew: () => whatsNew(),
    about: () => ctx.go("prefs", { fold: "sobre" })
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    const menu = $("#menu");
    if (menu && !menu.hidden && !e.target.closest(".menuWrap")) menu.hidden = true;
    if (!el) return;
    const fn = ACTIONS[el.dataset.act];
    if (!fn) return;
    if (el.closest("#menu")) menu.hidden = true;
    e.preventDefault();
    fn(el);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".tx[role=button]")) {
      e.preventDefault();
      ACTIONS["edit-tx"](e.target);
    }
    if (e.key === "Escape") {
      const m = $("#menu");
      if (m && !m.hidden) {
        m.hidden = true;
        $("#menuBtn")?.focus();
      }
    }
  });
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("button,.tx,.chk");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--tap-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--tap-y", `${e.clientY - r.top}px`);
    el.classList.remove("tapFx");
    void el.offsetWidth;
    el.classList.add("tapFx");
    setTimeout(() => el.classList.remove("tapFx"), 360);
  }, { passive: true });
  var SIMPLE = { n: "n", r: "N", m: "m", "/": "f", k: "k", h: "h", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "?": "/" };
  document.addEventListener("keydown", (e) => {
    if (ctx.locked || ctx.problem || !ctx.state) return;
    if (dialogOpen()) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.altKey) return;
    if (!mod) {
      const typing = e.target.closest?.("input, select, textarea, [contenteditable]");
      const sk = SIMPLE[e.key];
      if (typing || !sk || e.repeat) return;
      e.preventDefault();
      if (sk === "N") return txEditor("income");
      return runShortcut(sk, false, e);
    }
    runShortcut(e.key.toLowerCase(), e.shiftKey, e);
  });
  function runShortcut(k, shift, e) {
    const map = {
      n: () => txEditor(shift ? "income" : "expense"),
      m: () => goalEditor(),
      f: () => ctx.go("moves", { focus: "search" }),
      k: () => ctx.go("assist", { focus: "ask" }),
      h: () => ACTIONS["toggle-privacy"](),
      l: () => ctx.device.pinHash && lockNow(),
      p: () => pdfDialog(),
      e: () => exportCsv(),
      s: () => exportBackup(),
      o: () => restoreBackup(),
      "1": () => ctx.go("home"),
      "2": () => ctx.go("moves"),
      "3": () => ctx.go("reports"),
      "4": () => ctx.go("assist"),
      "5": () => ctx.go("prefs"),
      ",": () => ctx.go("prefs"),
      "/": () => shortcutsDialog(),
      "?": () => shortcutsDialog()
    };
    const fn = map[k];
    if (!fn) return;
    if (k === "l" && !ctx.device.pinHash) return;
    e.preventDefault();
    fn();
  }
  var lastActivity = Date.now();
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) => document.addEventListener(ev, () => {
    lastActivity = Date.now();
  }, { passive: true, capture: true }));
  function lockNow() {
    if (!ctx.device.pinHash) return;
    closeDialogs();
    ctx.locked = true;
    showLock();
  }
  ctx.lockNow = lockNow;
  function showLock() {
    const el = $("#lock");
    $("#shell").inert = true;
    el.hidden = false;
    el.innerHTML = `<div class="lockBox glass" role="dialog" aria-modal="true" aria-labelledby="lockTitle">
    <img src="icons/icon-192.png" alt="" width="64" height="64">
    <h2 id="lockTitle">Finan+</h2><p class="muted">Digite seu PIN para entrar.</p>
    <form id="lockForm" novalidate><input id="pinIn" type="password" inputmode="none" autocomplete="off" maxlength="8" aria-label="PIN" placeholder="PIN">
    <div class="pinDots" aria-hidden="true">${"<i></i>".repeat(8)}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join("")}
      <button type="button" data-k="back" aria-label="Apagar">${icon("backspace", 22)}</button><button type="button" data-k="0">0</button>
      <button type="submit" class="ok" aria-label="Entrar">${icon("lock-open", 22)}</button></div></form>
    <small id="pinErr" class="pinErr" role="alert"></small></div>`;
    const inp = $("#pinIn"), err2 = $("#pinErr");
    const dots = () => $$(".pinDots i").forEach((d, i) => d.classList.toggle("on", i < inp.value.length));
    inp.oninput = () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 8);
      dots();
    };
    el.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
      if (b.dataset.k === "back") inp.value = inp.value.slice(0, -1);
      else if (inp.value.length < 8) inp.value += b.dataset.k;
      dots();
      inp.focus();
    });
    let busy = false;
    $("#lockForm").onsubmit = async (e) => {
      e.preventDefault();
      if (busy) return;
      const dev = loadDevice();
      const wait = Throttle.waitSeconds(dev);
      if (wait > 0) {
        err2.textContent = `Muitas tentativas. Aguarde ${wait} s.`;
        return;
      }
      if (!inp.value) return;
      busy = true;
      err2.textContent = "Verificando…";
      const r = await verifyPin(inp.value, dev.pinHash);
      busy = false;
      if (r.ok) {
        let newHash = null;
        if (r.upgrade) {
          try {
            newHash = await hashPin(inp.value);
          } catch {
          }
        }
        updateDevice((d) => ({ ...Throttle.reset(d), ...newHash ? { pinHash: newHash } : {} }));
        ctx.locked = false;
        el.hidden = true;
        el.innerHTML = "";
        $("#shell").inert = false;
        lastActivity = Date.now();
        render();
        launchParams();
        flushPending();
        checkNotifications();
        return;
      }
      updateDevice((d) => Throttle.fail(d));
      inp.value = "";
      dots();
      const w = Throttle.waitSeconds(ctx.device);
      err2.textContent = w > 0 ? `PIN incorreto. Aguarde ${w} s para tentar de novo.` : "PIN incorreto.";
      el.querySelector(".lockBox").classList.remove("shake");
      void el.offsetWidth;
      el.querySelector(".lockBox").classList.add("shake");
      inp.focus();
    };
    el.onkeydown = (e) => {
      if (e.target === inp) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        if (inp.value.length < 8) inp.value += e.key;
        dots();
        inp.focus();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        inp.value = inp.value.slice(0, -1);
        dots();
        inp.focus();
      } else if (e.key === "Enter" && e.target.type !== "submit") {
        e.preventDefault();
        $("#lockForm").requestSubmit();
      }
    };
    inp.focus();
  }
  function autoLockCheck() {
    const m = ctx.state?.autoLock || 0;
    if (!m || !ctx.device?.pinHash || ctx.locked || ctx.problem) return;
    if (Date.now() - lastActivity >= m * 6e4) lockNow();
  }
  function showProblem(message) {
    ctx.problem = true;
    $("#shell").inert = true;
    const el = $("#problem");
    el.hidden = false;
    el.innerHTML = `<div class="lockBox glass wideBox" role="alertdialog" aria-modal="true" aria-labelledby="pbTitle">
    ${icon("warning", 40, "red")}<h2 id="pbTitle">Não foi possível abrir seus dados</h2>
    <p>${esc(message)}</p><p class="muted small">Nada foi apagado nem sobrescrito. Isso pode acontecer se os dados do site foram limpos parcialmente pelo navegador.</p>
    <div class="btnCol"><button type="button" class="btn soft" id="pbSave">${icon("download", 18)}<span>Guardar os dados ilegíveis (arquivo)</span></button>
    <button type="button" class="btn soft" id="pbRestore">${icon("upload", 18)}<span>Restaurar um backup JSON</span></button>
    <button type="button" class="btn danger" id="pbFresh">${icon("delete", 18)}<span>Começar do zero</span></button></div></div>`;
    $("#pbSave").onclick = async () => {
      const t = await ctx.store.unreadableExport();
      if (t) download(`finan-plus-dados-ilegiveis-${todayStr()}.json`, t, "application/json");
      else notice("Nada para guardar", "Não há dados salvos.");
    };
    const fresh = async (state) => {
      await ctx.store.startOver();
      env.encrypted = ctx.store.encrypted;
      ctx.problem = false;
      el.hidden = true;
      el.innerHTML = "";
      $("#shell").inert = false;
      afterOpen({ status: "new", state });
      persist();
    };
    const askHere = (title, msg, ok2) => ask(title, msg, { ok: ok2, danger: true });
    $("#pbFresh").onclick = async () => {
      if (await askHere("Começar do zero", ctx.store.noDb ? "O Finan+ vai funcionar sem criptografia neste navegador, guardando os dados no armazenamento simples do site. Continuar?" : "Os dados ilegíveis ficam guardados à parte neste navegador (até “Apagar tudo”), e o Finan+ recomeça vazio. Continuar?", "Começar do zero")) fresh(newState());
    };
    $("#pbRestore").onclick = async () => {
      const file = await pickFile("application/json,.json");
      if (!file) return;
      let n;
      try {
        n = parseBackup(await file.text());
      } catch {
        notice("Não foi possível restaurar", "Arquivo de backup inválido ou danificado.");
        return;
      }
      await fresh(n.state);
      toast("Backup restaurado");
    };
  }
  async function wipeAll() {
    if (REMOTE) return notice("Apagar tudo", "Pelo navegador não é possível apagar os dados do celular. Se quiser mesmo apagar, use Ajustes › Dados › Apagar tudo no próprio celular.");
    if (!await ask("Apagar todos os dados", "Apagar TODOS os dados deste aparelho, inclusive o PIN? Faça um backup antes.", { ok: "Apagar tudo", danger: true })) return;
    await ctx.store.wipe();
    wipeDevice();
    ctx.device = loadDevice();
    openFolds.clear();
    ctx.state = newState();
    await persist();
    ctx.go("home");
    toast("Dados apagados");
  }
  async function checkNotifications(force = false) {
    const d = ctx.device;
    if (!ctx.state || ctx.locked || ctx.problem) return;
    if (REMOTE && !force) return;
    const today2 = ctx.today, list = Finance.reminders(ctx.state, today2, 2);
    if (force) {
      if (!list.length) return notice("Nenhum vencimento", "Nada vence nos próximos 2 dias, e não há contas em atraso.");
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return notice("Vencimentos", list.map(remText).join("\n"));
    } else {
      if (!d.notifications || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if ((/* @__PURE__ */ new Date()).getHours() < 9 || d.lastNotified === today2) return;
      ctx.setDevice({ lastNotified: today2 });
      if (!list.length) return;
    }
    const title = list.length === 1 ? "Finan+ · 1 vencimento" : `Finan+ · ${list.length} vencimentos`;
    const body = list.slice(0, 5).map(remText).join("\n") + (list.length > 5 ? `
e mais ${list.length - 5}` : "");
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.showNotification) await reg.showNotification(title, { body, icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "finan-vencimentos", data: { url: "./#lancamentos" } });
      else new Notification(title, { body, icon: "icons/icon-192.png", tag: "finan-vencimentos" });
    } catch (e) {
      console.warn(e);
      notice("Vencimentos", body);
    }
  }
  function remText(r) {
    const v = ctx.state.privacy ? "R$ ••••" : Money.format(r.amount);
    const when = r.date === ctx.today ? "hoje" : r.date < ctx.today ? "em atraso" : r.date === addDays(ctx.today, 1) ? "amanhã" : r.date.slice(8, 10) + "/" + r.date.slice(5, 7);
    return r.type === "INCOME_DUE" ? `A receber: ${r.title} (${v}) · ${when}` : `${r.title} (${v}) · ${when}`;
  }
  function dayTick() {
    const t = todayStr();
    if (t === ctx.today || !ctx.state) return;
    ctx.today = t;
    const [s, n] = Finance.generateRecurring(ctx.state, t);
    if (n > 0) ctx.replace(s);
    else render();
    checkNotifications();
  }
  async function boot() {
    ctx.device = loadDevice();
    ctx.remote = env.remote = REMOTE;
    if (ctx.device.themeCache) applyTheme(ctx.device.themeCache);
    if (REMOTE) {
      navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r2) => r2.unregister())).catch(() => {
      });
    } else if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW", e));
    try {
      ctx.dict = Dictionary.parse(DICT_TEXT);
    } catch {
      ctx.dict = null;
    }
    let r;
    if (REMOTE) {
      ctx.store = new RemoteStore();
      ctx.store.onUnauthorized = () => reconnect("A conexão com o celular expirou (o servidor foi reiniciado ou este navegador foi desconectado). Digite o novo código.");
      $("#shell").classList.add("ready");
      r = await openRemote();
    } else {
      ctx.store = new Store();
      r = await ctx.store.open();
    }
    env.encrypted = ctx.store.encrypted;
    $("#shell").classList.add("ready");
    if (r.status === "problem") {
      showProblem(r.message);
      return;
    }
    afterOpen(r);
  }
  var started = false;
  function afterOpen(r) {
    if (r.legacyPin && !loadDevice().pinHash) updateDevice({ pinHash: r.legacyPin });
    const [g, n] = Finance.generateRecurring(r.state, ctx.today);
    ctx.state = g;
    if (n > 0 || r.status === "new" || r.migrated) persist();
    ctx.view = viewFromHash();
    if (ctx.device.pinHash) {
      ctx.locked = true;
      applyTheme(ctx.state.theme);
      showLock();
    } else {
      render();
      launchParams();
    }
    if (r.migrated && r.migrated !== "finanplus_plain") pending.push(["Bem-vindo ao Finan+", "Seus dados do “Minhas Finanças” foram trazidos para o Finan+" + (env.encrypted ? " e agora ficam criptografados neste aparelho." : ".") + (r.dropped ? `
${r.dropped} item(ns) inválido(s) foram ignorados.` : "")]);
    else if (r.dropped) pending.push(["Itens ignorados", `${r.dropped} item(ns) inválido(s) nos dados salvos foram ignorados ao abrir. Se notar algo faltando, restaure um backup JSON recente (Ajustes › Dados).`]);
    if (!env.encrypted) toast("Este navegador não permite criptografar os dados. Eles ficam só neste aparelho.", 5e3);
    flushPending();
    checkNotifications();
    if (started) return;
    started = true;
    if (!REMOTE) Store.persist();
    try {
      channel = new BroadcastChannel("finan-plus");
      channel.onmessage = onPeer;
    } catch {
      channel = null;
    }
    setInterval(() => {
      dayTick();
      autoLockCheck();
    }, 15e3);
    if (REMOTE) setInterval(pollRemote, 4e3);
    setInterval(() => checkNotifications(), 5 * 6e4);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        dayTick();
        autoLockCheck();
        checkNotifications();
      }
    });
  }
  async function openRemote(message = "") {
    for (; ; ) {
      if (!getToken()) await pairFlow($("#lock"), message);
      try {
        return await ctx.store.open();
      } catch (e) {
        if (e?.status === 401) {
          setToken(null);
          message = "Digite o novo código mostrado no celular.";
          continue;
        }
        if (e?.status === 0) {
          await pairFlowRetry(e.message);
          continue;
        }
        throw e;
      }
    }
  }
  function pairFlowRetry(msg) {
    return new Promise((res) => {
      const el = $("#lock");
      el.hidden = false;
      el.innerHTML = `<div class="lockBox glass pairBox" role="alertdialog" aria-modal="true" aria-labelledby="offTitle">${icon("warning", 40, "red")}
      <h2 id="offTitle">Sem conexão com o celular</h2><p class="muted">${esc(msg)}</p>
      <button type="button" class="btn primary" id="retryBtn">Tentar de novo</button></div>`;
      $("#retryBtn").onclick = () => {
        el.hidden = true;
        el.innerHTML = "";
        res();
      };
      $("#retryBtn").focus();
    });
  }
  var reconnecting = false;
  async function reconnect(message) {
    if (reconnecting) return;
    reconnecting = true;
    closeDialogs();
    closeSheet();
    setToken(null);
    try {
      await pairFlow($("#lock"), message);
      ctx.state = await ctx.store.reload();
      render();
      toast("Conectado de novo ao celular. Confira se a última alteração aparece na lista.", 5e3);
    } catch (e) {
      console.warn(e);
    } finally {
      reconnecting = false;
    }
  }
  var offline = false;
  var polling = false;
  async function pollRemote() {
    if (polling || document.hidden || ctx.locked || ctx.problem || reconnecting || !ctx.state) return;
    polling = true;
    try {
      const changed = await ctx.store.changed();
      if (offline) {
        offline = false;
        toast("Conexão com o celular restabelecida");
      }
      if (!changed) return;
      ctx.state = await ctx.store.reload();
      render();
    } catch (e) {
      if (e?.status === 0 && !offline) {
        offline = true;
        toast("Sem conexão com o celular. As alterações não serão salvas até reconectar.", 6e3);
      } else if (e?.status !== 0 && e?.status !== 401) console.warn("poll", e?.status);
    } finally {
      polling = false;
    }
  }
  var pending = [];
  function flushPending() {
    if (ctx.locked || ctx.problem) return;
    while (pending.length) notice(...pending.shift());
  }
  function launchParams() {
    const p = new URLSearchParams(location.search), n = p.get("novo");
    if (!n) return;
    history.replaceState(null, "", location.pathname + location.hash);
    txEditor(n === "receita" ? "income" : "expense");
  }
  async function onPeer(m) {
    if (m.data?.type !== "saved" || ctx.problem || !ctx.store) return;
    try {
      ctx.state = await ctx.store.reload();
      if (!ctx.locked) {
        render();
        toast("Dados atualizados em outra aba");
      }
    } catch (e) {
      console.warn("reload", e);
    }
  }
  globalThis.FinanPlus = { ctx, core: core_exports, store: store_exports, editors: editors_exports };
  boot().catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML("beforeend", `<div class="fatal">Não foi possível iniciar o Finan+: ${esc(e?.message || e)}. Seus dados não foram alterados.</div>`);
  });
})();
