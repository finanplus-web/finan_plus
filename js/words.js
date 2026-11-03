// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Textos com número (tradução de core/Words.kt do Finan+ Android): plural correto em pt-BR (só 1 é
// singular), nunca "conta(s)"; ordinal com "º"/"ª" (nunca o símbolo de grau). Ver REDESIGN-COERENCIA.md.

export const Words = {
  /** "1 conta", "0 contas", "3 cartões" */
  count: (n, one, many) => `${n} ${n === 1 ? one : many}`,
  /** Troca o símbolo de grau usado como ordinal ("13° Salário") pelo indicador ordinal ("13º Salário"). Só para exibir. */
  ordinal: text => String(text).replace(/(\d)\s?[°˚ᵒ]/g, '$1º'),
};
