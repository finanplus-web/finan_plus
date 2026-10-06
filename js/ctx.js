// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Estado compartilhado da interface (um só objeto, importado pelas telas e editores).
import { Money, todayStr, CARD_PAYMENT_CAT } from './core.js';
import { Text } from './assist.js';

export const APP_VERSION = '1.1.1';

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
  // preenchidos por app.js
  commit: null, replace: null, render: null, setDevice: null, go: null, openMoves: null, lockNow: null,
};

export const hidden = () => !!ctx.state?.privacy;
/** valor em reais respeitando "Ocultar valores" */
export const money = c => hidden() ? 'R$ ••••' : Money.format(c);

// ícone de cada categoria (mesma tabela das versões Android e Linux)
const CAT_ICONS = [
  ['shopping-cart', '|alimentacao|mercado|supermercado|comida|feira|'],
  ['restaurant', '|restaurante|delivery|lanche|lanches|'],
  ['directions-car', '|transporte|carro|uber|mobilidade|'],
  ['local-gas-station', '|combustivel|gasolina|posto|'],
  ['home', '|moradia|casa|aluguel|contas|'],
  ['favorite', '|saude|farmacia|medico|'],
  ['fitness-center', '|academia|esporte|esportes|'],
  ['theaters', '|lazer|diversao|entretenimento|viagem|'],
  ['subscriptions', '|assinaturas|assinatura|streaming|'],
  ['school', '|educacao|estudos|escola|faculdade|cursos|'],
  ['more-horiz', '|outros|outro|diversos|'],
  ['payments', '|salario|pagamento|pro labore|'],
  ['attach-money', '|extra|extras|renda extra|freela|bonus|'],
  ['savings', '|investimentos|investimento|poupanca|rendimentos|reserva|'],
  ['pets', '|pets|pet|animais|'],
  ['checkroom', '|vestuario|roupas|roupa|'],
  ['shopping-bag', '|compras|shopping|'],
  ['spa', '|beleza|cuidados pessoais|estetica|'],
  ['receipt-long', '|impostos|taxas|tarifas|impostos e taxas|'],
  ['redeem', '|presentes|doacoes|presente|doacao|'],
  ['account-balance', '|emprestimo|emprestimos|financiamento|banco|dividas|'],
  ['work', '|trabalho|adiantamento quinzenal|adiantamento|comissao|'],
];
export function categoryIcon(cat) {
  if (cat === CARD_PAYMENT_CAT) return 'credit-card';
  const key = `|${Text.fold(cat)}|`;
  const f = CAT_ICONS.find(([, names]) => names.includes(key));
  return f ? f[0] : null;
}
