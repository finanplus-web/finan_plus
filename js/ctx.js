// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado compartilhado da interface (um só objeto, importado pelas telas e editores).
import { Money, todayStr, CARD_PAYMENT_CAT } from './core.js';
import { Text } from './assist.js';

export const APP_VERSION = '1.5.0';

export const ctx = {
  state: null,        // dados (AppState do core)
  device: null,       // configurações deste aparelho (store.js)
  store: null,
  dict: null,         // dicionário do assistente
  today: todayStr(),
  view: 'home',
  cols: 1,            // colunas do layout (1 celular; 2 ou 3 no computador)
  locked: false,
  problem: false,
  moves: { from: null, to: null, q: '', kind: '', st: '', limit: 300 },
  /** Lançamentos: 'list' ou 'calendar' */
  movesView: 'list',
  /** calendário: mês mostrado (ym) e dia escolhido (null = nenhum); preenchidos na primeira abertura */
  cal: { ym: null, day: null },
  /** página aberta dentro de Meu dinheiro e Ajustes (null = a tela principal); vem do endereço (#meu-dinheiro/contas) */
  page: { money: null, prefs: null },
  // preenchidos por app.js
  commit: null, replace: null, render: null, setDevice: null, go: null, openMoves: null, lockNow: null,
};

export const hidden = () => !!ctx.state?.privacy;
/** valor em reais respeitando "Ocultar valores" */
export const money = c => hidden() ? 'R$ ••••' : Money.format(c);

// ícone de cada categoria (mesma tabela das versões Android e Linux)
const CAT_ICONS = [
  ['shopping-cart', '|mercado|supermercado|feira|'],
  ['restaurant', '|alimentacao|comida|restaurante|delivery|lanche|lanches|'],
  ['directions-car', '|transporte|carro|uber|mobilidade|'],
  ['local-gas-station', '|combustivel|gasolina|posto|'],
  ['home', '|moradia|casa|aluguel|contas|'],
  ['favorite', '|saude|farmacia|medico|'],
  ['fitness-center', '|academia|esporte|esportes|'],
  ['sports-esports', '|lazer|jogos|games|'],
  ['theaters', '|diversao|entretenimento|viagem|cinema|'],
  ['subscriptions', '|assinaturas|assinatura|streaming|'],
  ['school', '|educacao|estudos|escola|faculdade|cursos|'],
  ['more-horiz', '|outros|outro|diversos|'],
  ['payments', '|salario|pagamento|pro labore|'],
  ['attach-money', '|extra|extras|renda extra|freela|bonus|'],
  ['trending-up', '|investimentos|investimento|rendimentos|'],
  ['savings', '|poupanca|reserva|'],
  ['pets', '|pets|pet|animais|'],
  ['checkroom', '|vestuario|roupas|roupa|'],
  ['shopping-bag', '|compras|shopping|'],
  ['spa', '|beleza|cuidados pessoais|estetica|'],
  ['receipt-long', '|impostos|taxas|tarifas|impostos e taxas|'],
  ['redeem', '|presentes|doacoes|presente|doacao|13o salario|13 salario|decimo terceiro|'],
  ['account-balance', '|emprestimo|emprestimos|financiamento|financiamentos|banco|dividas|divida|'],
  ['work', '|trabalho|adiantamento quinzenal|adiantamento|comissao|'],
];
export function categoryIcon(cat) {
  if (cat === CARD_PAYMENT_CAT) return 'credit-card';
  const k = Text.fold(String(cat ?? '').replace(/(\d)\s?[°˚ºª]/g, '$1o')).trim();
  const key = `|${k}|`;
  const f = CAT_ICONS.find(([, names]) => names.includes(key));
  if (f) return f[0];
  // nomes compostos (INICIO.md): empréstimo e financiamento = banco; cartão e fatura = cartão; salário; meta
  if (/emprestimo|financiamento|divida/.test(k)) return 'account-balance';
  if (/cartao|fatura/.test(k)) return 'credit-card';
  if (/salario/.test(k)) return k.startsWith('13') ? 'redeem' : 'payments';
  if (/\bmeta/.test(k)) return 'flag';
  return null;
}
/** ícone para mostrar (o genérico "more-horiz" quando a categoria não tem um) */
export const catIcon = cat => categoryIcon(cat) ?? 'more-horiz';
