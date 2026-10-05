// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Relatório financeiro em PDF (A4 retrato), gerado no próprio navegador: sem bibliotecas e sem
// internet. Escreve o arquivo PDF diretamente (fontes padrão Helvetica, codificação WinAnsi).
// Layout idêntico ao do app Android (export/PdfReport.kt) e da versão Linux (pdf_render.c).
// Os números vêm de buildReport() (report.js, testado). O layout roda duas vezes: a primeira só
// conta as páginas (para o rodapé "Página n de N"), a segunda desenha.
import { Money, MONTHS, brDate, brMonthYear, ymMonth, ymYear, pad2, isFlow, isCard, account, card } from './core.js';
import { compact, niceStep, TOP, MAX_CHART_MONTHS } from './report.js';
import { HELVETICA, HELVETICA_BOLD } from './pdf-metrics.js';

const W = 595, H = 842, M = 36, CW = W - 2 * M, FOOTER = 28;
const hex = n => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const INK = hex(0x182238), MUTED = hex(0x5B6579), ACCENT = hex(0x3A5FC8), GREEN = hex(0x1B7351), RED = hex(0xB03A4F),
  CARD = hex(0xF3F6FD), LINE = hex(0xDDE3EE), TRACK = hex(0xE6EBF5), WHITE = hex(0xFFFFFF), ZEBRA = hex(0xF8FAFE);
const SERIES = [0x3A5FC8, 0xE07A2F, 0x1B9E77, 0xB03A4F, 0x7B61C9, 0x2A9DB5, 0xC49A1A, 0x8A8F99].map(hex);
export const PDF_SERIES = [0x3A5FC8, 0xE07A2F, 0x1B9E77, 0xB03A4F, 0x7B61C9, 0x2A9DB5, 0xC49A1A, 0x8A8F99].map(n => '#' + n.toString(16).toUpperCase().padStart(6, '0'));
/** branco com transparência sobre o azul do cabeçalho (o PDF fica sem transparência) */
const over = (a, fg, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

// ------------------------------------------------------------------ texto em WinAnsi
const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89,
  0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96,
  0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F, 0x2212: 0x96, 0x00A0: 0x20 };
/** texto → códigos WinAnsi; o que a fonte padrão não tem vira "?" */
export function winAnsi(s) {
  const out = [];
  for (const ch of String(s).normalize('NFC')) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out.push(c);
    else if (c >= 0xA0 && c <= 0xFF) out.push(c);
    else if (CP1252[c]) out.push(CP1252[c]);
    else if (c === 9 || c === 10 || c === 13) out.push(32);
    else out.push(63);
  }
  return out;
}
export function textWidth(s, size, bold = false) {
  const t = bold ? HELVETICA_BOLD : HELVETICA;
  let w = 0;
  for (const c of winAnsi(s)) w += t[c - 32] || 556;
  return w * size / 1000;
}
const pdfStr = codes => '(' + codes.map(c => c === 40 || c === 41 || c === 92 ? '\\' + String.fromCharCode(c)
  : c < 32 || c > 126 ? '\\' + c.toString(8).padStart(3, '0') : String.fromCharCode(c)).join('') + ')';
const n2 = v => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
const rgb = (c, op) => `${n2(c[0] / 255)} ${n2(c[1] / 255)} ${n2(c[2] / 255)} ${op}`;

// ------------------------------------------------------------------ "caneta" com paginação
class Pen {
  constructor(total, r, draw) { this.total = total; this.r = r; this.draw = draw; this.pages = 0; this.y = 0; this.ops = null; this.out = []; this.size = 10; this.bold = false; }

  newPage() {
    this.finishPage();
    this.pages++;
    this.ops = [];
    if (this.pages === 1) this.y = 0;
    else {
      this.text(`Finan+ · Relatório financeiro · ${brDate(this.r.from)} a ${brDate(this.r.to)}`, M, M + 4, 8, MUTED);
      this.line(M, M + 12, W - M, M + 12);
      this.y = M + 26;
    }
  }
  finishPage() {
    if (this.pages === 0 || !this.ops) return;
    this.text('Gerado no navegador pelo Finan+ · os dados não saem do aparelho', M, H - 18, 7.5, MUTED);
    this.text(`Página ${this.pages} de ${this.total > 0 ? this.total : this.pages}`, W - M, H - 18, 7.5, MUTED, { align: 'right' });
    this.out.push(this.ops.join('\n'));
    this.ops = null;
  }
  finish() { this.finishPage(); }
  /** garante espaço vertical h; senão, nova página */
  need(h) { if (this.pages === 0 || this.y + h > H - M - FOOTER) this.newPage(); }
  font(size, bold) { this.size = size; this.bold = bold; }
  measure(t) { return textWidth(t, this.size, this.bold); }
  fit(t, maxW) {
    if (this.measure(t) <= maxW) return t;
    let s = [...t];
    while (s.length > 1 && this.measure(s.join('') + '…') > maxW) s.pop();
    return s.join('') + '…';
  }
  text(t, x, base, size, color, o = {}) {
    this.font(size, !!o.bold);
    const s = o.maxW > 0 ? this.fit(t, o.maxW) : t;
    if (!this.draw) return;
    const w = this.measure(s), xx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    this.ops.push(`BT ${rgb(color, 'rg')} /${o.bold ? 'F2' : 'F1'} ${n2(size)} Tf ${n2(xx)} ${n2(H - base)} Td ${pdfStr(winAnsi(s))} Tj ET`);
  }
  rect(x, y0, w, h, color, radius = 0) {
    if (!this.draw || w <= 0 || h <= 0) return;
    const r = Math.min(radius, w / 2, h / 2);
    const X = x, Y = H - y0 - h; // canto inferior esquerdo no sistema do PDF
    if (r <= 0) { this.ops.push(`${rgb(color, 'rg')} ${n2(X)} ${n2(Y)} ${n2(w)} ${n2(h)} re f`); return; }
    const k = r * 0.5523;
    this.ops.push(`${rgb(color, 'rg')} ${n2(X + r)} ${n2(Y)} m ${n2(X + w - r)} ${n2(Y)} l `
      + `${n2(X + w - r + k)} ${n2(Y)} ${n2(X + w)} ${n2(Y + r - k)} ${n2(X + w)} ${n2(Y + r)} c ${n2(X + w)} ${n2(Y + h - r)} l `
      + `${n2(X + w)} ${n2(Y + h - r + k)} ${n2(X + w - r + k)} ${n2(Y + h)} ${n2(X + w - r)} ${n2(Y + h)} c ${n2(X + r)} ${n2(Y + h)} l `
      + `${n2(X + r - k)} ${n2(Y + h)} ${n2(X)} ${n2(Y + h - r + k)} ${n2(X)} ${n2(Y + h - r)} c ${n2(X)} ${n2(Y + r)} l `
      + `${n2(X)} ${n2(Y + r - k)} ${n2(X + r - k)} ${n2(Y)} ${n2(X + r)} ${n2(Y)} c f`);
  }
  line(x0, y0, x1, y1, color = LINE, w = 0.7) {
    if (!this.draw) return;
    this.ops.push(`${rgb(color, 'RG')} ${n2(w)} w ${n2(x0)} ${n2(H - y0)} m ${n2(x1)} ${n2(H - y1)} l S`);
  }
  /** arco (graus, sentido horário a partir das 3 h, como no Canvas do Android) com traço grosso */
  arc(cx, cy, rad, start, sweep, color, width) {
    if (!this.draw || sweep <= 0) return;
    const segs = Math.ceil(sweep / 90), step = sweep / segs, P = (deg) => { const a = deg * Math.PI / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
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
    this.ops.push(`${rgb(color, 'RG')} ${n2(width)} w 0 J ${parts.join(' ')} S`);
  }
}

// ------------------------------------------------------------------ conteúdo
const money = c => Money.format(c);
const pct = v => String(Math.round(v * 10) / 10).replace('.', ',') + '%';
const changeText = (v, label) => v == null ? 'sem base no período anterior' : (v >= 0 ? '+' : '−') + pct(Math.abs(v)) + ` vs. ${label}`;
const chg = (cur, prev) => prev > 0 ? (cur - prev) * 100 / prev : null;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function layout(pen, r, s, opt) {
  pen.newPage();
  header(pen, r, opt.now);
  kpis(pen, r);
  section(pen, 'Despesas por categoria', 'Valores realizados. Média mensal comparada com o limite mensal definido em Ajustes.', 160);
  if (!r.expenseByCategory.length) note(pen, 'Sem despesas realizadas no período.');
  else { donut(pen, r.expenseByCategory, r.expense); categoryTable(pen, r.expenseByCategory, true); }

  section(pen, 'Evolução mensal', r.months.length > 1 ? 'Receitas e despesas realizadas por mês.' : 'Receitas e despesas realizadas no mês.', r.months.length > 1 ? 200 : 60);
  if (r.months.length > 1) monthChart(pen, r);
  monthTable(pen, r);

  section(pen, 'Receitas por categoria', 'Valores recebidos no período.');
  if (!r.incomeByCategory.length) note(pen, 'Sem receitas recebidas no período.'); else categoryTable(pen, r.incomeByCategory, false);

  section(pen, 'Maiores despesas', `As ${TOP} maiores despesas realizadas do período.`);
  if (!r.topExpenses.length) note(pen, 'Sem despesas realizadas no período.'); else topTable(pen, r.topExpenses);

  section(pen, 'Contas e metas', 'Saldos e metas na data de hoje (não dependem do período).');
  accountsAndGoals(pen, r);

  if (opt.includeTransactions) {
    section(pen, 'Lançamentos do período', `${r.txs.length} lançamento(s), incluindo pendentes. Pagamentos de fatura aparecem, mas não contam como despesa.`);
    if (!r.txs.length) note(pen, 'Nenhum lançamento no período.'); else txTable(pen, r, s);
  }
  section(pen, 'Como ler este relatório', '', 40);
  for (const l of [
    'Receitas e despesas consideram só o que foi pago ou recebido. O que está pendente aparece em “A receber” e “A pagar”.',
    'Compras no cartão contam na data da compra; o pagamento da fatura não é uma despesa nova.',
    `A comparação usa o período anterior com o mesmo número de dias (${brDate(r.prevFrom)} a ${brDate(r.prevTo)}).`,
    'Média mensal = valor da categoria ÷ meses do período (meses incompletos contam pela fração de dias).',
  ]) para(pen, `• ${l}`);
}

function header(pen, r, now) {
  pen.rect(0, 0, W, 112, ACCENT);
  pen.text('FINAN+', M, 40, 10, over(0.8, WHITE, ACCENT), { bold: true });
  pen.text('Relatório financeiro', M, 68, 24, WHITE, { bold: true });
  pen.text(`${brDate(r.from)} a ${brDate(r.to)} · ${r.days} dia(s)`, M, 92, 12, WHITE);
  const d = now || new Date();
  const ds = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  pen.text(`Gerado em ${brDate(ds)} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`, W - M, 40, 9, over(0.87, WHITE, ACCENT), { align: 'right' });
  pen.y = 132;
}

function kpis(pen, r) {
  pen.need(150);
  const gap = 10, w3 = (CW - 2 * gap) / 3;
  const big = [
    ['Receitas', r.income, GREEN, changeText(chg(r.income, r.prevIncome), 'período anterior')],
    ['Despesas', r.expense, RED, changeText(chg(r.expense, r.prevExpense), 'período anterior')],
    ['Saldo do período', r.balance, r.balance < 0 ? RED : ACCENT, r.savingsRate != null ? `${pct(r.savingsRate)} das receitas` : 'sem receitas no período'],
  ];
  big.forEach(([t, v, c, sub], i) => {
    const x = M + i * (w3 + gap);
    pen.rect(x, pen.y, w3, 72, CARD, 12);
    pen.text(t, x + 12, pen.y + 20, 9, MUTED);
    pen.text(money(v), x + 12, pen.y + 44, 16, c, { bold: true, maxW: w3 - 24 });
    pen.text(sub, x + 12, pen.y + 61, 7.5, MUTED, { maxW: w3 - 24 });
  });
  pen.y += 82;
  const w4 = (CW - 3 * gap) / 4;
  [['A receber (pendente)', money(r.pendingIncome)], ['A pagar (pendente)', money(r.pendingExpense)],
    ['Média diária de gastos', money(r.dailyAverage)], ['Lançamentos', String(r.txs.length)]].forEach(([l, v], i) => {
    const x = M + i * (w4 + gap);
    pen.rect(x, pen.y, w4, 48, CARD, 10);
    pen.text(l, x + 10, pen.y + 17, 8, MUTED, { maxW: w4 - 20 });
    pen.text(v, x + 10, pen.y + 36, 12, INK, { bold: true, maxW: w4 - 20 });
  });
  pen.y += 60;
}

/** título de seção; keep = altura mínima do conteúdo que precisa caber junto */
function section(pen, title, sub, keep = 60) {
  pen.need(56 + keep);
  pen.y += 12;
  pen.text(title, M, pen.y + 14, 14, INK, { bold: true });
  pen.y += 22;
  if (sub) para(pen, sub);
  pen.y += 2;
}
function note(pen, t) { pen.need(20); pen.text(t, M, pen.y + 12, 9.5, MUTED); pen.y += 22; }
function para(pen, t) {
  pen.font(8.5, false);
  let line = '';
  const flush = () => { pen.need(13); pen.text(line, M, pen.y + 10, 8.5, MUTED); pen.y += 13; };
  for (const w of t.split(' ')) {
    const cand = line ? `${line} ${w}` : w;
    pen.font(8.5, false);
    if (pen.measure(cand) > CW) { flush(); line = w; } else line = cand;
  }
  if (line) flush();
  pen.y += 3;
}

/** rosca com as 7 maiores categorias + "Outras", e legenda ao lado */
function donut(pen, rows, total) {
  pen.need(160);
  const rest = rows.slice(7);
  const slices = rows.slice(0, 7).map(x => [x.name, x.value]);
  if (rest.length) slices.push([`Outras (${rest.length})`, rest.reduce((n, x) => n + x.value, 0)]);
  const d = 130, cx = M + d / 2 + 6, cy = pen.y + d / 2 + 6, rad = d / 2 - 11;
  let start = -90;
  slices.forEach(([, v], i) => {
    const sweep = total > 0 ? 360 * v / total : 0;
    if (sweep > 0) pen.arc(cx, cy, rad, start, Math.max(sweep - 0.8, 0.5), SERIES[i % SERIES.length], 22);
    start += sweep;
  });
  pen.text('Total', cx, cy - 4, 8, MUTED, { align: 'center' });
  pen.text(compact(total), cx, cy + 11, 11, INK, { bold: true, align: 'center' });
  const lx = M + d + 30;
  let ly = pen.y + 14;
  slices.forEach(([name, v], i) => {
    pen.rect(lx, ly - 8, 9, 9, SERIES[i % SERIES.length], 2);
    pen.text(name, lx + 16, ly, 9.5, INK, { maxW: 200 });
    pen.text(money(v), W - M - 52, ly, 9.5, INK, { bold: true, align: 'right' });
    pen.text(pct(total > 0 ? v * 100 / total : 0), W - M, ly, 9, MUTED, { align: 'right' });
    ly += 16;
  });
  pen.y += Math.max(d + 16, ly - pen.y + 4);
}

function tableHeader(pen, cols, rightFrom) {
  pen.need(40);
  pen.rect(M, pen.y, CW, 18, CARD, 4);
  let x = M + 6;
  cols.forEach(([t, w], i) => {
    if (i >= rightFrom) pen.text(t, x + w - 8, pen.y + 12.5, 8, MUTED, { bold: true, align: 'right' });
    else pen.text(t, x, pen.y + 12.5, 8, MUTED, { bold: true });
    x += w;
  });
  pen.y += 22;
}
const rowBreak = (pen, h, cols, right) => { if (pen.y + h > H - M - FOOTER) { pen.newPage(); tableHeader(pen, cols, right); } };

function categoryTable(pen, rows, withLimit) {
  const cols = withLimit ? [['Categoria', 128], ['', 92], ['%', 46], ['Lanç.', 38], ['Média/mês', 74], ['Limite/mês', 70], ['Valor', CW - 448]]
    : [['Categoria', 150], ['', 150], ['%', 50], ['Lanç.', 50], ['Valor', CW - 400]];
  tableHeader(pen, cols, 2);
  rows.forEach((row, i) => {
    rowBreak(pen, 18, cols, 2);
    const base = pen.y + 11, color = SERIES[Math.min(i, 7) % SERIES.length];
    let x = M + 6;
    pen.text(row.name, x, base, 9, INK, { maxW: cols[0][1] - 8 }); x += cols[0][1];
    pen.rect(x, pen.y + 5, cols[1][1] - 10, 6, TRACK, 3);
    pen.rect(x, pen.y + 5, Math.max(2, (cols[1][1] - 10) * row.percent / 100), 6, color, 3); x += cols[1][1];
    pen.text(pct(row.percent), x + cols[2][1] - 8, base, 8.5, MUTED, { align: 'right' }); x += cols[2][1];
    pen.text(String(row.count), x + cols[3][1] - 8, base, 8.5, MUTED, { align: 'right' }); x += cols[3][1];
    if (withLimit) {
      pen.text(money(row.monthlyAverage), x + cols[4][1] - 8, base, 8.5, row.overLimit ? RED : INK, { align: 'right' }); x += cols[4][1];
      pen.text(row.monthlyLimit != null ? money(row.monthlyLimit) + (row.overLimit ? ' · acima' : '') : '—', x + cols[5][1] - 8, base, 8,
        row.overLimit ? RED : MUTED, { align: 'right', maxW: cols[5][1] - 6 }); x += cols[5][1];
    }
    pen.text(money(row.value), x + cols.at(-1)[1] - 8, base, 9, INK, { bold: true, align: 'right' });
    pen.line(M, pen.y + 17, W - M, pen.y + 17);
    pen.y += 18;
  });
  pen.y += 6;
}

const monthLabel = ym => MONTHS[ymMonth(ym) - 1].slice(0, 3) + '/' + pad2(ymYear(ym) % 100);

function monthChart(pen, r) {
  const months = r.months.slice(-MAX_CHART_MONTHS), ch = 150;
  pen.need(ch + 40);
  const max = Math.max(...months.map(m => Math.max(m.income, m.expense)));
  const step = niceStep(max), top = Math.max(step, Math.ceil(max / step) * step);
  const left = M + 52, right = W - M, y0 = pen.y + 6, y1 = y0 + ch;
  for (let v = 0; v <= top; v += step) {
    const yy = y1 - ch * v / top;
    pen.line(left, yy, right, yy);
    pen.text(compact(v), left - 6, yy + 3, 7.5, MUTED, { align: 'right' });
  }
  const slot = (right - left) / months.length, bw = Math.min(14, slot * 0.32);
  months.forEach((m, i) => {
    const x = left + i * slot + slot / 2, hi = ch * m.income / top, he = ch * m.expense / top;
    if (hi > 0) pen.rect(x - bw - 1, y1 - hi, bw, hi, GREEN, 2);
    if (he > 0) pen.rect(x + 1, y1 - he, bw, he, RED, 2);
    if (months.length <= 12 || i % 2 === 0) pen.text(monthLabel(m.ym), x, y1 + 12, 7.5, MUTED, { align: 'center' });
  });
  pen.y = y1 + 22;
  pen.rect(left, pen.y - 7, 8, 8, GREEN, 2); pen.text('Receitas', left + 12, pen.y, 8, MUTED);
  pen.rect(left + 70, pen.y - 7, 8, 8, RED, 2); pen.text('Despesas', left + 82, pen.y, 8, MUTED);
  if (r.months.length > months.length) pen.text(`Gráfico com os últimos ${months.length} meses do período; a tabela abaixo traz todos.`, right, pen.y, 7.5, MUTED, { align: 'right' });
  pen.y += 14;
}

function monthTable(pen, r) {
  const cols = [['Mês', 160], ['Receitas', 120], ['Despesas', 120], ['Saldo', CW - 400]];
  tableHeader(pen, cols, 1);
  for (const m of r.months) {
    rowBreak(pen, 18, cols, 1);
    const base = pen.y + 11;
    let x = M + 6;
    pen.text(cap(brMonthYear(m.ym)), x, base, 9, INK); x += cols[0][1];
    pen.text(money(m.income), x + cols[1][1] - 8, base, 9, GREEN, { align: 'right' }); x += cols[1][1];
    pen.text(money(m.expense), x + cols[2][1] - 8, base, 9, RED, { align: 'right' }); x += cols[2][1];
    pen.text(money(m.balance), x + cols[3][1] - 8, base, 9, m.balance < 0 ? RED : INK, { bold: true, align: 'right' });
    pen.line(M, pen.y + 17, W - M, pen.y + 17);
    pen.y += 18;
  }
  pen.y += 6;
}

function topTable(pen, list) {
  const cols = [['Data', 70], ['Descrição', 230], ['Categoria', 120], ['Valor', CW - 420]];
  tableHeader(pen, cols, 3);
  for (const t of list) {
    rowBreak(pen, 18, cols, 3);
    const base = pen.y + 11;
    let x = M + 6;
    pen.text(brDate(t.date), x, base, 8.5, MUTED); x += cols[0][1];
    pen.text(t.desc, x, base, 9, INK, { maxW: cols[1][1] - 8 }); x += cols[1][1];
    pen.text(t.category, x, base, 8.5, MUTED, { maxW: cols[2][1] - 8 }); x += cols[2][1];
    pen.text(money(t.value), x + cols[3][1] - 8, base, 9, RED, { bold: true, align: 'right' });
    pen.line(M, pen.y + 17, W - M, pen.y + 17);
    pen.y += 18;
  }
  pen.y += 6;
}

function accountsAndGoals(pen, r) {
  const cols = [['Conta', 300], ['Saldo atual', CW - 300]];
  tableHeader(pen, cols, 1);
  for (const [name, bal] of r.accounts) {
    rowBreak(pen, 18, cols, 1);
    pen.text(name, M + 6, pen.y + 11, 9, INK, { maxW: 290 });
    pen.text(money(bal), W - M - 8, pen.y + 11, 9, bal < 0 ? RED : INK, { bold: true, align: 'right' });
    pen.line(M, pen.y + 17, W - M, pen.y + 17);
    pen.y += 18;
  }
  pen.y += 8;
  if (!r.goals.length) { note(pen, 'Nenhuma meta cadastrada.'); return; }
  for (const g of r.goals) {
    pen.need(34);
    pen.text(g.name, M, pen.y + 11, 9.5, INK, { bold: true, maxW: 260 });
    pen.text(`${money(g.saved)} de ${money(g.target)} · ${pct(g.percent)}` + (g.deadline ? ` · até ${brDate(g.deadline)}` : ''), W - M, pen.y + 11, 8.5, MUTED, { align: 'right', maxW: 260 });
    pen.rect(M, pen.y + 17, CW, 7, TRACK, 3.5);
    pen.rect(M, pen.y + 17, Math.max(3, CW * g.percent / 100), 7, ACCENT, 3.5);
    pen.y += 32;
  }
}

function txTable(pen, r, s) {
  const cols = [['Data', 58], ['Descrição', 150], ['Categoria', 90], ['Conta / cartão', 86], ['Situação', 62], ['Valor', CW - 446]];
  tableHeader(pen, cols, 5);
  r.txs.forEach((t, i) => {
    rowBreak(pen, 17, cols, 5);
    if (i % 2 === 1) pen.rect(M, pen.y, CW, 17, ZEBRA);
    const base = pen.y + 11.5, payment = !isFlow(t);
    let x = M + 6;
    const where = isCard(t) ? 'Cartão ' + (card(s, t.cardId)?.name ?? '') : account(s, t.accountId)?.name ?? '';
    const status = payment ? 'Pag. fatura' : isCard(t) ? 'Cartão' : t.paid ? (t.kind === 'income' ? 'Recebido' : 'Pago') : (t.kind === 'income' ? 'A receber' : 'A pagar');
    pen.text(brDate(t.date), x, base, 8, MUTED); x += cols[0][1];
    pen.text(t.desc, x, base, 8.5, payment ? MUTED : INK, { maxW: cols[1][1] - 8 }); x += cols[1][1];
    pen.text(t.category, x, base, 8, MUTED, { maxW: cols[2][1] - 8 }); x += cols[2][1];
    pen.text(where, x, base, 8, MUTED, { maxW: cols[3][1] - 8 }); x += cols[3][1];
    pen.text(status, x, base, 8, !t.paid && !payment ? ACCENT : MUTED, { maxW: cols[4][1] - 6 }); x += cols[4][1];
    const color = payment ? MUTED : t.kind === 'income' ? GREEN : RED;
    pen.text((t.kind === 'income' ? '+ ' : '− ') + money(t.value), x + cols[5][1] - 8, base, 8.5, color, { bold: !payment, align: 'right' });
    pen.y += 17;
  });
  pen.line(M, pen.y, W - M, pen.y);
  pen.y += 8;
}

// ------------------------------------------------------------------ arquivo PDF
const pdfDate = d => `D:${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;

function assemble(pages, info) {
  const objs = [];
  const add = body => { objs.push(body); return objs.length; };
  const catalog = add(null), pagesId = add(null);
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const content of pages) {
    const bytes = content.length; // só ASCII (texto já escapado em octal)
    const c = add(`<< /Length ${bytes} >>\nstream\n${content}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  const infoId = add(`<< /Title ${pdfStr(winAnsi(info.title))} /Producer ${pdfStr(winAnsi(info.producer))} /Creator (Finan+) /CreationDate (${pdfDate(info.now)}) >>`);
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

/**
 * Gera o PDF. r = buildReport(...), s = estado. opt: { includeTransactions, now (Date), appVersion }.
 * Devolve { bytes: Uint8Array, pages }.
 */
export function renderPdf(r, s, opt = {}) {
  const o = { includeTransactions: opt.includeTransactions !== false, now: opt.now || new Date() };
  const count = new Pen(0, r, false);
  layout(count, r, s, o); count.finish();
  const pen = new Pen(count.pages, r, true);
  layout(pen, r, s, o); pen.finish();
  const bytes = assemble(pen.out, { title: `Relatório financeiro ${brDate(r.from)} a ${brDate(r.to)}`, producer: `Finan+ web ${opt.appVersion || ''}`.trim(), now: o.now });
  return { bytes, pages: pen.pages };
}
