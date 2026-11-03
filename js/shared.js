// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Despesas compartilhadas (tradução de core/Shared.kt do Finan+ Android; DESPESAS-COMPARTILHADAS.md): uma despesa
// paga por uma pessoa e dividida com outras. Quem pagou recebe de cada participante a parte dele; os pagamentos
// podem ser parciais. Não mexe no saldo das contas nem nos lançamentos: é um controle de quem deve a quem.
//
// Formato (state.shared; o mesmo do backup, lido e validado em core.js normalize):
//   { id, name, total, date, payerId, people: [{ id, name, share }], split: 'equal'|'custom', note,
//     receipt, receiptType, payments: [{ id, personId, value, date }] }
// O comprovante (receipt) é um arquivo guardado só no aparelho Android; aqui só o nome e o tipo passam adiante.
import { Money, Finance, SHARED_LIMITS, newId, validDate, growthError } from './core.js';
import { Text } from './assist.js';

const err = (message, title = 'Revise os dados') => ({ ok: false, title, message });
const fold = s => Text.fold(s);
const clip = (s, max) => [...String(s ?? '').trim()].slice(0, max).join('');
const isBlank = s => !String(s ?? '').trim();
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;

/** situação de um participante */
export const PERSON_STATE = { NONE: 'Pagou a despesa', PAID: 'Quitado', PARTIAL: 'Pagou parte', PENDING: 'Pendente' };
/** situação da despesa */
export const SHARED_STATE = { OPEN: 'Pendente', PARTIAL: 'Parcialmente paga', SETTLED: 'Quitada' };
export const SPLIT = { EQUAL: 'equal', CUSTOM: 'custom' };

export const Shared = {
  ...SHARED_LIMITS,

  person: (e, id) => e.people.find(p => p.id === id) ?? null,
  payer: e => Shared.person(e, e.payerId),

  /** partes iguais: reaproveita a divisão das parcelas (o resto dos centavos fica com o primeiro) */
  equalShares: (total, n) => n <= 0 ? [] : Finance.splitInstallments(total, n),

  /**
   * Resumo: { people: [{ person, isPayer, owed, paid, remaining, state }], toReceive (o que os outros devem a quem
   * pagou), received, pending, state } — state do participante: NONE | PAID | PARTIAL | PENDING; da despesa:
   * OPEN | PARTIAL | SETTLED (textos em PERSON_STATE e SHARED_STATE).
   */
  summary(e) {
    const paidBy = new Map();
    for (const p of e.payments) paidBy.set(p.personId, (paidBy.get(p.personId) ?? 0) + p.value);
    const people = e.people.map(p => {
      const isPayer = p.id === e.payerId, owed = isPayer ? 0 : p.share, paid = paidBy.get(p.id) ?? 0;
      const remaining = Math.max(0, owed - paid);
      const state = isPayer || owed === 0 ? 'NONE' : remaining === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
      return { person: p, isPayer, owed, paid, remaining, state };
    });
    const toReceive = people.reduce((n, x) => n + x.owed, 0);
    // um pagamento acima da parte (não deveria acontecer: save/addPayment barram) não conta como recebido a mais
    const received = people.reduce((n, x) => n + Math.min(x.paid, x.owed), 0);
    const pending = Math.max(0, toReceive - received);
    const state = toReceive === 0 || pending === 0 ? 'SETTLED' : received > 0 ? 'PARTIAL' : 'OPEN';
    return { people, toReceive, received, pending, state };
  },

  /** totais de todas as despesas: [falta receber, já recebido] */
  totals(list) {
    let pending = 0, received = 0;
    for (const e of list) { const s = Shared.summary(e); pending += s.pending; received += s.received; }
    return [pending, received];
  },

  /** nomes de todos os participantes já usados (para o filtro), sem repetir e em ordem alfabética */
  peopleNames(list) {
    const seen = new Map();
    for (const e of list) for (const p of e.people) { const k = fold(p.name); if (!seen.has(k)) seen.set(k, p.name); }
    return [...seen.values()].sort((a, b) => cmp(fold(a), fold(b)));
  },

  /**
   * Histórico: mais recentes primeiro, com busca (nome, observação, participantes), período, pessoa e situação.
   * f = { query, from, to, person, state (OPEN|PARTIAL|SETTLED ou null = todas) }; [person] sem diferenciar maiúsculas.
   */
  filter(list, f = {}) {
    const q = fold(String(f.query ?? '').trim()), who = fold(String(f.person ?? '').trim());
    return list.filter(e => (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to) &&
      (!who || e.people.some(p => fold(p.name) === who)) &&
      (f.state == null || Shared.summary(e).state === f.state) &&
      (!q || fold(e.name + ' ' + e.note + ' ' + e.people.map(p => p.name).join(' ')).includes(q)))
      .sort((a, b) => cmp(b.date, a.date) || cmp(b.id, a.id));
  },

  // ---------------- alterações (validadas; o estado só muda com { ok: true, state })

  /**
   * Salva a partir do formulário. d = { name, total, date, split: 'equal'|'custom', people: [{ id ('' = novo), name,
   * share (texto, só na divisão personalizada) }], payerIndex (posição de quem pagou em people), note, receipt, receiptType }.
   */
  save(s, editId, d) {
    const name = clip(d.name, Shared.NAME_MAX);
    if (!name) return err('Dê um nome para a despesa. Ex.: Mercado do mês', 'Nome da despesa');
    const total = Money.parse(d.total);
    if (total == null || total <= 0) return err('Informe o valor total, maior que zero. Ex.: 450,00', 'Valor inválido');
    if (!validDate(d.date)) return err('Informe a data da despesa.', 'Data inválida');
    const date = d.date;
    const rows = (d.people ?? []).map(r => ({ ...r, id: r.id ?? '', name: clip(r.name, Shared.PERSON_MAX), share: r.share ?? '' }));
    if (rows.some(r => !r.name)) return err('Preencha o nome de todos os participantes (ou remova a linha vazia).', 'Participantes');
    if (rows.length < 2) return err('Adicione pelo menos duas pessoas: quem pagou e quem vai dividir.', 'Participantes');
    if (rows.length > Shared.PEOPLE_MAX) return err(`Use no máximo ${Shared.PEOPLE_MAX} participantes.`, 'Participantes');
    const names = new Set();
    for (const r of rows) {
      const k = fold(r.name);
      if (names.has(k)) return err(`"${r.name}" aparece duas vezes. Use nomes diferentes (ex.: João S. e João P.).`, 'Participantes');
      names.add(k);
    }
    if (!Number.isInteger(d.payerIndex) || d.payerIndex < 0 || d.payerIndex >= rows.length) return err('Escolha quem pagou a despesa.', 'Quem pagou');

    const split = d.split === SPLIT.CUSTOM ? SPLIT.CUSTOM : SPLIT.EQUAL;
    let shares;
    if (split === SPLIT.EQUAL) shares = Shared.equalShares(total, rows.length);
    else {
      shares = [];
      for (const r of rows) {
        const v = isBlank(r.share) ? 0 : Money.parse(r.share);
        if (v == null) return err(`Valor inválido para ${r.name}. Ex.: 150,00`, 'Valor inválido');
        shares.push(v);
      }
      if (shares.some(v => v < 0)) return err('Os valores não podem ser negativos.', 'Valor inválido');
      const sum = shares.reduce((a, b) => a + b, 0);
      if (sum !== total) {
        const diff = total - sum;
        return err(`A soma das partes (${Money.format(sum)}) precisa ser igual ao total (${Money.format(total)}). ` +
          (diff > 0 ? `Faltam ${Money.format(diff)}.` : `Passou ${Money.format(-diff)}.`), 'Divisão não fecha');
      }
    }

    let old = null;
    if (editId != null) { old = (s.shared ?? []).find(e => e.id === editId); if (!old) return err('Despesa não encontrada.'); }
    const oldIds = new Set(old ? old.people.map(p => p.id) : []);
    const people = rows.map((r, i) => ({ id: oldIds.has(r.id) ? r.id : newId(), name: r.name, share: shares[i] }));
    const payments = old ? old.payments.map(p => ({ ...p })) : [];
    const e = { id: old?.id ?? newId(), name, total, date, payerId: people[d.payerIndex].id, people, split,
      note: clip(d.note, Shared.NOTE_MAX), receipt: d.receipt ?? '', receiptType: d.receiptType ?? '', payments };
    // editar não pode deixar pagamentos "soltos": de quem saiu, de quem virou o pagador ou acima da nova parte
    if (old) {
      const st = Shared.summary(e);
      for (const pid of new Set(payments.map(p => p.personId))) {
        const who = st.people.find(x => x.person.id === pid);
        const oldName = Shared.person(old, pid)?.name ?? 'um participante';
        if (!who) return err(`${oldName} tem pagamentos registrados. Exclua os pagamentos antes de remover essa pessoa.`, 'Pagamentos registrados');
        if (who.isPayer) return err(`${who.person.name} tem pagamentos registrados e não pode ser quem pagou. Exclua os pagamentos antes.`, 'Pagamentos registrados');
        if (who.paid > who.owed) return err(`${who.person.name} já devolveu ${Money.format(who.paid)}, mais do que a nova parte (${Money.format(who.owed)}). Exclua algum pagamento antes.`, 'Pagamentos registrados');
      }
    }
    const list = s.shared ?? [];
    const next = { ...s, shared: old ? list.map(x => x.id === e.id ? e : x) : [...list, e] };
    const g = growthError(s, next);
    return g ? err(`${g} Exclua despesas antigas antes de criar novas.`, 'Limite atingido') : { ok: true, state: next };
  },

  /** registra que [personId] devolveu [value] (texto; total ou parcial) a quem pagou, na data [date] */
  addPayment(s, expenseId, personId, value, date) {
    const e = (s.shared ?? []).find(x => x.id === expenseId);
    if (!e) return err('Despesa não encontrada.');
    const who = Shared.summary(e).people.find(x => x.person.id === personId);
    if (!who) return err('Participante não encontrado.');
    if (who.isPayer) return err(`${who.person.name} pagou a despesa: não há o que devolver.`, 'Quem pagou');
    const v = Money.parse(value);
    if (v == null || v <= 0) return err('Informe um valor maior que zero. Ex.: 50,00', 'Valor inválido');
    if (who.remaining === 0) return err(`${who.person.name} já quitou a parte dele.`, 'Já quitado');
    if (v > who.remaining) return err(`${who.person.name} deve ${Money.format(who.remaining)}. Informe até esse valor.`, 'Valor acima do devido');
    if (!validDate(date)) return err('Informe a data do pagamento.', 'Data inválida');
    if (e.payments.length >= Shared.PAYMENTS_MAX) return err(`Limite de ${Shared.PAYMENTS_MAX} pagamentos nesta despesa.`, 'Limite atingido');
    const pay = { id: newId(), personId, value: v, date };
    return { ok: true, state: { ...s, shared: s.shared.map(x => x.id === expenseId ? { ...x, payments: [...x.payments, pay] } : x) } };
  },

  /** quita tudo o que [personId] ainda deve, na data [date] */
  settle(s, expenseId, personId, date) {
    const e = (s.shared ?? []).find(x => x.id === expenseId);
    if (!e) return err('Despesa não encontrada.');
    const who = Shared.summary(e).people.find(x => x.person.id === personId);
    if (!who) return err('Participante não encontrado.');
    return Shared.addPayment(s, expenseId, personId, Money.input(who.remaining), date);
  },

  deletePayment: (s, expenseId, paymentId) => ({ ...s, shared: (s.shared ?? []).map(x => x.id === expenseId ? { ...x, payments: x.payments.filter(p => p.id !== paymentId) } : x) }),

  delete: (s, id) => ({ ...s, shared: (s.shared ?? []).filter(x => x.id !== id) }),

  /** troca (ou remove, com "") o comprovante de uma despesa já salva */
  setReceipt: (s, id, file, type) => ({ ...s, shared: (s.shared ?? []).map(x => x.id === id ? { ...x, receipt: file, receiptType: file ? type : '' } : x) }),

  /** arquivos de comprovante em uso */
  receiptsInUse: s => new Set((s.shared ?? []).map(x => x.receipt).filter(Boolean)),

  /** nome do PDF: "comprovante-mercado-do-mes-2026-11-02.pdf" */
  pdfName(e) {
    const slug = [...fold(e.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')].slice(0, 40).join('') || 'despesa';
    return `comprovante-${slug}-${e.date}.pdf`;
  },
  /** nome da imagem: "finanplus-mercado-do-mes-2026-11-02.png" */
  imageName: e => `finanplus-${Shared.pdfName(e).replace(/^comprovante-/, '').replace(/\.pdf$/, '')}.png`,
};
