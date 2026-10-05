// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Dados de demonstração (fictícios) para capturas de tela e testes manuais.
// Uso no console do navegador, com o Finan+ aberto:
//   const { demoState } = await import('./tools/demo-data.js');
//   const { ctx } = await import('./js/ctx.js'); ctx.replace(demoState());
import { newState, tx, ymOf, ymDay, todayStr, Finance } from '../js/core.js';

export function demoState(today = todayStr()) {
  let n = 0;
  const id = () => 'demo' + (n++);
  const cur = ymOf(today);
  const s = newState({
    accounts: [{ id: 'main', name: 'Conta principal', initial: 185000 }, { id: 'pp', name: 'Poupança', initial: 420000 }],
    cards: [{ id: 'nu', name: 'Roxinho', limit: 450000, close: 5, due: 12 }],
    goals: [{ id: 'g1', name: 'Viagem de férias', target: 800000, saved: 310000, deadline: ymDay(cur + 8, 30), monthly: 60000 },
      { id: 'g2', name: 'Reserva de emergência', target: 1500000, saved: 1120000, deadline: null, monthly: 50000 }],
  });
  s.limits.set('Alimentação', 120000); s.limits.set('Lazer', 40000); s.limits.set('Transporte', 45000);
  const add = o => s.txs.push(tx({ id: id(), accountId: 'main', paid: true, ...o }));
  for (let m = cur - 5; m <= cur; m++) {
    const past = m < cur, d = day => ymDay(m, day), until = day => past || d(day) <= today;
    add({ kind: 'income', value: 520000, date: d(5), desc: 'Salário', category: 'Salário', paid: until(5) });
    if (m % 2 === 0) add({ kind: 'income', value: 65000 + (m % 5) * 10000, date: d(18), desc: 'Freela de design', category: 'Extra', paid: until(18) });
    add({ kind: 'expense', value: 160000, date: d(10), desc: 'Aluguel', category: 'Moradia', paid: until(10) });
    add({ kind: 'expense', value: 18500 + (m % 3) * 1200, date: d(15), desc: 'Conta de luz', category: 'Moradia', paid: until(15) });
    add({ kind: 'expense', value: 9990, date: d(20), desc: 'Internet fibra', category: 'Moradia', paid: until(20) });
    add({ kind: 'expense', value: m === cur ? 5590 : 4490, date: d(8), desc: 'Netflix', category: 'Lazer', cardId: 'nu' });
    add({ kind: 'expense', value: 2190, date: d(2), desc: 'Spotify', category: 'Lazer', cardId: 'nu' });
    for (const [day, v, desc, cat] of [[3, 32000, 'Supermercado Pão de Açúcar', 'Alimentação'], [9, 8900, 'iFood pizza', 'Alimentação'], [12, 2400, 'Uber casa', 'Transporte'],
      [14, 27500, 'Mercado Extra', 'Alimentação'], [16, 1800, 'Uber trabalho', 'Transporte'], [21, 12000, 'Posto Shell', 'Transporte'], [23, 15000, 'Cinema e pipoca', 'Lazer'],
      [25, 6990, 'Drogasil', 'Saúde'], [27, 21000, 'Feira do mês', 'Alimentação']]) {
      if (!until(day)) continue;
      add({ kind: 'expense', value: v + ((m * 7 + day) % 9) * 150, date: d(day), desc, category: cat, cardId: day % 3 === 0 ? 'nu' : '' });
    }
    if (past) add({ kind: 'expense', value: 120000, date: d(12), desc: 'Pagamento fatura Roxinho', category: 'Pagamento de fatura', cardPayment: 'nu' });
  }
  ['Café', 'Pão de queijo', 'Café', 'Água', 'Café', 'Bala', 'Café', 'Pão de queijo', 'Café', 'Suco', 'Café'].forEach((desc, i) => {
    const date = ymDay(cur, 1 + i * 2);
    if (date <= today) add({ kind: 'expense', value: 650 + (i % 3) * 300, date, desc, category: 'Alimentação' });
  });
  for (let i = 1; i <= 6; i++) add({ kind: 'expense', value: 60000, date: ymDay(cur - 2 + i, 22), desc: `Notebook (${i}/6)`, category: 'Educação', cardId: 'nu', groupId: 'nb', parcelN: i, parcelTotal: 6 });
  s.recurring.push({ id: 'r1', kind: 'expense', desc: 'Academia', value: 11990, category: 'Saúde', accountId: 'main', cardId: '', day: 6, active: true, start: ymDay(cur - 3, 6), last: cur - 1 });
  return Finance.generateRecurring(s, today)[0];
}
