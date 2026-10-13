// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// "Ler fatura ou boleto": tira valor e vencimento de uma fatura em PDF (texto), de uma linha digitável
// de boleto ou de um Pix copia e cola. Cálculo puro, sem rede: o mesmo do app Android (core/bill/Bill.kt).
// O PDF é aberto em js/billpdf.js. Detalhes e limites em FATURAS.md.
//
// O resultado é sempre uma sugestão: a tela mostra de onde cada valor veio e a pessoa confirma.
import { Finance, ymOf, ymLen, pad2, dayNum, fromDayNum } from './core.js';

/** de onde veio a informação, em ordem de confiança: o código é exato, o texto é heurística */
export const SOURCE_LABEL = { boleto: 'código do boleto', pix: 'Pix copia e cola', text: 'texto da fatura' };

// --------------------------------------------------------------------------------------------- boleto
const digitsOf = s => String(s ?? '').replace(/\D/g, '');

export function mod10(s) {
  let sum = 0, w = 2;
  for (let i = s.length - 1; i >= 0; i--) {
    let p = (+s[i]) * w;
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    sum += p; w = w === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}
function weighted11(s) {
  let sum = 0, w = 2;
  for (let i = s.length - 1; i >= 0; i--) { sum += (+s[i]) * w; w = w === 9 ? 2 : w + 1; }
  return sum;
}
/** DV geral do boleto bancário: 0, 10 e 11 viram 1 */
export const mod11Bank = s => { const dv = 11 - (weighted11(s) % 11); return dv === 0 || dv === 10 || dv === 11 ? 1 : dv; };
/** DV do boleto de arrecadação: resto 0 ou 1 vira 0; resto 10 vira 1 */
export const mod11Utility = s => { const r = weighted11(s) % 11; return r === 0 || r === 1 ? 0 : 11 - r; };

const OLD_BASE = dayNum('1997-10-07');
const NEW_BASE = dayNum('2022-05-29');

/**
 * Fator de vencimento: dias desde 07/10/1997. Chegou a 9999 em 21/02/2025 e recomeçou em 1000
 * no dia 22/02/2025 (nova base 29/05/2022). Das duas datas possíveis, vale a mais próxima de hoje.
 */
export function dueFromFactor(factor, today) {
  if (!(factor > 0)) return null;
  const t = dayNum(today), a = OLD_BASE + factor, b = NEW_BASE + factor;
  return fromDayNum(Math.abs(a - t) <= Math.abs(b - t) ? a : b);
}

const SEGMENTS = { 1: 'Prefeitura', 2: 'Água e esgoto', 3: 'Energia elétrica e gás', 4: 'Telefone e internet', 5: 'Órgão do governo', 6: 'Carnê ou cobrança', 7: 'Multa de trânsito' };

/** bancos emissores mais comuns (código da câmara de compensação) */
export const BANKS = {
  '001': 'Banco do Brasil', '004': 'Banco do Nordeste', '021': 'Banestes', '033': 'Santander', '041': 'Banrisul', '070': 'BRB',
  '077': 'Inter', '104': 'Caixa', '197': 'Stone', '208': 'BTG Pactual', '212': 'Banco Original', '237': 'Bradesco', '260': 'Nubank',
  '290': 'PagBank', '323': 'Mercado Pago', '336': 'C6 Bank', '341': 'Itaú', '380': 'PicPay', '389': 'Mercantil do Brasil', '403': 'Cora',
  '422': 'Safra', '655': 'Banco Votorantim', '748': 'Sicredi', '756': 'Sicoob',
};

function bankBarcode(b, today) {
  if (b[3] !== '9') return null; // só real
  if (mod11Bank(b.slice(0, 4) + b.slice(5)) !== +b[4]) return null;
  const value = parseInt(b.slice(9, 19), 10);
  return { type: 'bank', barcode: b, amount: value > 0 ? value : null, due: dueFromFactor(parseInt(b.slice(5, 9), 10), today), bank: BANKS[b.slice(0, 3)] || null, segment: null };
}
function bankLine(d, today) {
  if (mod10(d.slice(0, 9)) !== +d[9] || mod10(d.slice(10, 20)) !== +d[20] || mod10(d.slice(21, 31)) !== +d[31]) return null;
  return bankBarcode(d.slice(0, 4) + d[32] + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31), today);
}
function utilityDv(ident, s) { return ident === '6' || ident === '7' ? mod10(s) : ident === '8' || ident === '9' ? mod11Utility(s) : null; }
function utilityBarcode(b) {
  const dv = utilityDv(b[2], b.slice(0, 3) + b.slice(4));
  if (dv == null || dv !== +b[3]) return null;
  // 6 e 8: valor em reais; 7 e 9: valor de referência (quantidade em outra moeda/índice), não é dinheiro
  const value = b[2] === '6' || b[2] === '8' ? parseInt(b.slice(4, 15), 10) : 0;
  return { type: 'utility', barcode: b, amount: value > 0 ? value : null, due: null, bank: null, segment: SEGMENTS[b[1]] || null };
}
function utilityLine(d) {
  let bc = '';
  for (let i = 0; i < 4; i++) {
    const bl = d.slice(i * 12, i * 12 + 12), dv = utilityDv(d[2], bl.slice(0, 11));
    if (dv == null || dv !== +bl[11]) return null;
    bc += bl.slice(0, 11);
  }
  return utilityBarcode(bc);
}

/**
 * Boleto bancário (linha digitável de 47 números ou código de barras de 44) e de arrecadação
 * (contas de consumo e tributos: 48 números, ou 44 começando com 8), padrão Febraban.
 * Todos os dígitos verificadores são conferidos. null = não é um boleto válido.
 */
export function parseBoleto(input, today) {
  const d = digitsOf(input);
  if (d.length === 47) return bankLine(d, today);
  if (d.length === 48) return d[0] === '8' ? utilityLine(d) : null;
  if (d.length === 44) return d[0] === '8' ? utilityBarcode(d) : bankBarcode(d, today);
  return null;
}

// ------------------------------------------------------------------------------------------------ Pix
/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), 4 dígitos hexadecimais maiúsculos */
export function crc16(s) {
  let crc = 0xFFFF;
  for (const b of new TextEncoder().encode(s)) {
    crc ^= b << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function tlv(s) {
  const out = {};
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) return null;
    const id = s.slice(i, i + 2), len = +s.slice(i + 2, i + 4);
    if (!/^\d\d$/.test(s.slice(i + 2, i + 4)) || i + 4 + len > s.length) return null;
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

/** Pix copia e cola (BR Code, padrão EMV): confere o CRC antes de aceitar. */
export function parsePix(input) {
  const s = String(input ?? '').trim();
  if (!s.startsWith('000201')) return null;
  const at = s.length - 8;
  if (at < 6 || s.slice(at, at + 4) !== '6304') return null;
  if (crc16(s.slice(0, at + 4)) !== s.slice(at + 4).toUpperCase()) return null;
  const tags = tlv(s); if (!tags || !tags['26']) return null;
  const sub = tlv(tags['26']); if (!sub || String(sub['00'] || '').toLowerCase() !== 'br.gov.bcb.pix') return null;
  let amount = null;
  const a = tags['54'];
  if (a && /^\d{1,13}(\.\d{1,2})?$/.test(a)) { const [w, f = ''] = a.split('.'); amount = parseInt(w, 10) * 100 + parseInt((f + '00').slice(0, 2), 10); }
  return { amount: amount > 0 ? amount : null, name: (tags['59'] || '').trim() || null, city: (tags['60'] || '').trim() || null, dynamic: '25' in sub };
}

// --------------------------------------------------------------------------------------------- leitor
const short = s => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > 90 ? t.slice(0, 87) + '…' : t; };
/** minúsculas e sem acento */
const fold = s => s.toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, '');

const fromPixInfo = (p, raw) => ({ amount: p.amount != null ? { value: p.amount, source: 'pix', excerpt: short(raw) } : null, due: null, payee: p.name, segment: null, dynamicPix: p.dynamic && p.amount == null });
const fromBoletoInfo = (b, raw) => ({
  amount: b.amount != null ? { value: b.amount, source: 'boleto', excerpt: short(raw) } : null,
  due: b.due ? { value: b.due, source: 'boleto', excerpt: short(raw) } : null,
  payee: b.bank, segment: b.segment, dynamicPix: false,
});

export const isEmptyBill = i => !i.amount && !i.due;

/** Código colado (linha digitável, código de barras ou Pix copia e cola). null = não reconhecido. */
export function billFromCode(input, today) {
  const t = String(input ?? '').trim();
  const p = parsePix(t) || parsePix(t.replace(/[\r\n]/g, ''));
  if (p) return fromPixInfo(p, t);
  const b = parseBoleto(t, today);
  return b ? fromBoletoInfo(b, t) : null;
}

const CODE_RUN = /\d[\d .-]{41,80}\d/g;
function findBoleto(text, today) {
  let best = null;
  for (const m of text.replace(/\n/g, ' ').matchAll(CODE_RUN)) {
    const d = digitsOf(m[0]);
    // o trecho pode vir grudado em outros números: tenta as janelas de 47, 48 e 44 algarismos
    for (const len of [47, 48, 44]) {
      for (let st = 0; st + len <= d.length; st++) {
        const b = parseBoleto(d.slice(st, st + len), today);
        if (!b) continue;
        const info = fromBoletoInfo(b, m[0].trim());
        if (info.amount) return info;
        if (!best) best = info;
      }
    }
  }
  return best;
}
function findPix(text) {
  for (const v of [text.replace(/[\r\n]/g, ''), text.replace(/\s/g, '')]) {
    let from = 0;
    for (;;) {
      const i = v.indexOf('000201', from);
      if (i < 0) break;
      // o "6304" pode aparecer dentro do código: tenta cada ocorrência até o CRC conferir
      for (let k = v.indexOf('6304', i); k >= 0 && k + 8 <= v.length; k = v.indexOf('6304', k + 1)) {
        const cand = v.slice(i, k + 8), p = parsePix(cand);
        if (p) return fromPixInfo(p, cand);
      }
      from = i + 6;
    }
  }
  return null;
}

// procurado no texto já em minúsculas e sem acento ("r$")
const MONEY = /(?<![\d,.])(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d)/g;
const AMOUNT_LABELS = [
  ['total desta fatura', 100], ['total da fatura', 100], ['valor total da fatura', 100], ['total da sua fatura', 100],
  ['valor da fatura', 95], ['valor total a pagar', 95], ['total a pagar', 90], ['valor a pagar', 90],
  ['valor do documento', 85], ['valor cobrado', 80], ['pagamento total', 80], ['valor total', 60], ['total geral', 60],
];
/** palavras de outro valor (mínimo, limite, fatura anterior, juros…) */
const AMOUNT_SKIP = ['minimo', 'limite', 'anterior', 'parcelamento', 'parcelar', 'juros', 'encargo', 'multa', 'iof', 'cet ', 'rotativo', 'disponivel', 'saque', 'desconto', 'proxima', 'proximo'];
const skips = s => AMOUNT_SKIP.some(w => s.includes(w));
const moneyAt = (s, from) => { MONEY.lastIndex = Math.min(from, s.length); const m = MONEY.exec(s); return m; };
const moneyOf = m => parseInt(m[1].replace(/\./g, ''), 10) * 100 + parseInt(m[2], 10);

function findAmount(lines) {
  let best = null, bestW = -1;
  const norm = lines.map(fold);
  norm.forEach((l, i) => {
    for (const [label, w] of AMOUNT_LABELS) {
      if (w <= bestW) continue;
      const at = l.indexOf(label);
      if (at < 0) continue;
      // "Total da fatura anterior", "Pagamento mínimo do total da fatura": o rótulo é de outro valor
      if (skips(l.slice(Math.max(0, at - 25), at))) continue;
      const end = at + label.length;
      const same = moneyAt(l, end);
      let v = null;
      if (same) { if (!skips(l.slice(end, same.index))) v = [moneyOf(same), lines[i]]; }
      else for (let k = 1; k <= 2 && !v; k++) {
        const n = norm[i + k]; if (n == null) break;
        const m = moneyAt(n, 0); if (!m) continue;
        if (!skips(n.slice(0, m.index))) v = [moneyOf(m), lines[i] + ' ' + lines[i + k]];
      }
      if (v && v[0] > 0) { best = { value: v[0], source: 'text', excerpt: short(v[1]) }; bestW = w; }
    }
  });
  return best;
}

const DUE_LABELS = ['data de vencimento', 'vencimento', 'vence em', 'pague ate', 'pagar ate', 'pagamento ate'];
const NUM_DATE = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/;
const MONTH_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const NAME_DATE = /(?<!\d)(\d{1,2})(?:\s+de)?\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(?:(?:\s+de)?\s+(\d{4}))?/;

function safeDate(y, m, d) {
  if (!(y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1)) return null;
  if (d > ymLen(y * 12 + m - 1)) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Primeira data do trecho: 15/11/2026, 15.11.26, "15 de novembro de 2026", "15 NOV" (sem ano: a próxima ocorrência). */
export function dateIn(s, today) {
  const f = fold(s), a = NUM_DATE.exec(f), b = NAME_DATE.exec(f);
  const first = a && (!b || a.index <= b.index) ? a : b;
  if (!first) return null;
  if (first === a) { let y = +a[3]; if (y < 100) y += 2000; return safeDate(y, +a[2], +a[1]); }
  const m = MONTH_ABBR.indexOf(b[2]) + 1, d = +b[1];
  if (b[3]) return safeDate(+b[3], m, d);
  const y0 = +today.slice(0, 4), min = fromDayNum(dayNum(today) - 60);
  for (const y of [y0 - 1, y0, y0 + 1]) { const c = safeDate(y, m, d); if (c && c >= min) return c; }
  return null;
}

function findDue(lines, today) {
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], l = fold(raw);
    for (const label of DUE_LABELS) {
      const at = l.indexOf(label);
      if (at < 0) continue;
      // "Próximo vencimento", "vencimento da fatura anterior": é de outra fatura
      const before = l.slice(Math.max(0, at - 25), at);
      if (before.includes('proxim') || before.includes('anterior') || l.slice(at).startsWith(label + ' da fatura anterior')) break;
      const d0 = dateIn(l.slice(at + label.length), today);
      if (d0) return { value: d0, source: 'text', excerpt: short(raw) };
      for (let k = 1; k <= 2; k++) {
        const n = lines[i + k]; if (n == null) break;
        if (fold(n).includes('proxim')) break;
        const d = dateIn(n, today);
        if (d) return { value: d, source: 'text', excerpt: short(raw + ' ' + n) };
      }
      break;
    }
  }
  return null;
}

/**
 * Texto extraído de uma fatura (PDF). Procura, nesta ordem de confiança:
 * 1. a linha digitável do boleto impressa na fatura (valor e vencimento exatos);
 * 2. um Pix copia e cola;
 * 3. rótulos como "Total da fatura" e "Vencimento" (o valor é o que vem logo depois).
 */
export function billFromText(text, today) {
  const lines = String(text).split('\n').map(l => l.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
  const boleto = findBoleto(String(text), today);
  const pix = boleto?.amount ? null : findPix(String(text));
  const amount = boleto?.amount || pix?.amount || findAmount(lines);
  const due = boleto?.due || findDue(lines, today);
  return { amount, due, payee: pix?.payee || boleto?.payee || null, segment: boleto?.segment || null, dynamicPix: !!pix?.dynamicPix && !amount };
}

// ------------------------------------------------------------------------------ fatura do cartão
export const BillMatch = {
  /** mês da fatura do cartão que vence no mês de [due]; sem vencimento, a fatura em aberto (ou a do mês) */
  invoiceYm(s, c, due, today) {
    if (due) {
      const target = ymOf(due);
      for (const ym of [target, target - 1, target - 2]) if (ymOf(Finance.invoiceDue(c, ym)) === target) return ym;
    }
    return Finance.cardStatus(s, c, today).current?.ym ?? Finance.invoiceYm(c, today);
  },
  /** total da fatura [ym] no Finan+ (compras do cartão naquele mês de fatura) */
  appTotal: (s, c, ym) => s.txs.filter(t => t.cardId === c.id && t.kind === 'expense' && Finance.invoiceYm(c, t.date) === ym).reduce((n, t) => n + t.value, 0),
  /** data de uma compra que cai na fatura [ym]: o dia do fechamento */
  dateInInvoice: (c, ym) => Finance.invoiceClose(c, ym),
};
