// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Comprovante de uma despesa compartilhada em PDF (A4 retrato), gerado no navegador, sem bibliotecas:
// tradução de export/SharedPdf.kt do Finan+ Android, com as mesmas cores do relatório (pdf.js).
// Dados da despesa, quem pagou, a parte de cada participante, o que cada um já devolveu, a situação
// e os pagamentos registrados. Mostra os valores mesmo com "Ocultar valores" ligado (como o relatório).
import { Money, brDate, pad2 } from './core.js';
import { Shared, SPLIT, PERSON_STATE, SHARED_STATE } from './shared.js';
import { Pen, assemble, textWidth, INK, MUTED, ACCENT, GREEN, RED, CARD, LINE } from './pdf.js';

const W = 595, H = 842, M = 40, CW = W - 2 * M, BOTTOM = H - 48;
const m = c => Money.format(c);
const stamp = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** caneta do comprovante: mesma escrita do relatório, com rodapé e margens do Android */
class SharedPen extends Pen {
  constructor(o) { super(0, null, true); this.o = o; }
  newPage() { this.finishPage(); this.pages++; this.ops = []; this.y = M; }
  finishPage() {
    if (this.pages === 0 || !this.ops) return;
    this.text(`Gerado pelo Finan+${this.o.appVersion ? ' web ' + this.o.appVersion : ''} em ${stamp(this.o.now)} · página ${this.pages}`, M, H - 24, 8, MUTED);
    this.out.push(this.ops.join('\n'));
    this.ops = null;
  }
  /** garante [h] pontos livres na página (senão começa outra) */
  need(h) { if (!this.ops || this.y + h > BOTTOM) this.newPage(); }
  box(top, h, color) { this.rect(M, top, CW, h, color, 10); }
  rule(at) { this.line(M, at, W - M, at, LINE, 0.8); }
}

/** quebra [s] em linhas de até [max] pontos (palavra maior que a linha fica sozinha) */
export function wrapText(s, max, size, bold = false) {
  const lines = [];
  for (const para of String(s).split('\n')) {
    let cur = '';
    for (const word of para.split(' ')) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidth(next, size, bold) <= max || !cur) cur = next; else { lines.push(cur); cur = word; }
    }
    lines.push(cur);
  }
  return lines;
}

function layout(p, e) {
  const st = Shared.summary(e), payer = Shared.payer(e);
  p.newPage();

  // ---- título
  p.text('COMPROVANTE DE DESPESA COMPARTILHADA', M, p.y + 10, 9, ACCENT, { bold: true });
  p.y += 34;
  for (const line of wrapText(e.name, CW, 22, true)) { p.text(line, M, p.y, 22, INK, { bold: true }); p.y += 26; }
  p.text(`Data da despesa: ${brDate(e.date)}`, M, p.y, 11, MUTED);
  p.y += 22;

  // ---- dados principais
  const top = p.y, col = CW / 3;
  p.box(top, 92, CARD);
  const stat = (i, label, value) => {
    const x = M + 14 + i * col;
    p.text(label, x, top + 24, 9, MUTED);
    p.text(value, x, top + 44, 15, INK, { bold: true, maxW: col - 20 });
  };
  stat(0, 'Valor total', m(e.total));
  stat(1, 'Pago por', payer?.name ?? '—');
  stat(2, 'Divisão', e.split === SPLIT.EQUAL ? `Igual (${e.people.length})` : 'Personalizada');
  p.text(`Recebido: ${m(st.received)}`, M + 14, top + 72, 11, GREEN, { bold: true, maxW: col - 20 });
  p.text(`Pendente: ${m(st.pending)}`, M + 14 + col, top + 72, 11, st.pending > 0 ? RED : GREEN, { bold: true, maxW: col - 20 });
  p.text(`Situação: ${SHARED_STATE[st.state]}`, M + 14 + 2 * col, top + 72, 11, INK, { bold: true, maxW: col - 20 });
  p.y = top + 92 + 24;

  // ---- participantes
  p.text('Participantes', M, p.y, 13, INK, { bold: true }); p.y += 16;
  const cols = [M, M + 200, M + 290, M + 380, W - M];
  const header = () => {
    p.text('Nome', cols[0], p.y, 9, MUTED, { bold: true });
    p.text('Parte', cols[2] - 8, p.y, 9, MUTED, { bold: true, align: 'right' });
    p.text('Devolveu', cols[3] - 8, p.y, 9, MUTED, { bold: true, align: 'right' });
    p.text('Falta', cols[4] - 92, p.y, 9, MUTED, { bold: true, align: 'right' });
    p.text('Situação', cols[4], p.y, 9, MUTED, { bold: true, align: 'right' });
    p.y += 6; p.rule(p.y); p.y += 14;
  };
  header();
  for (const ps of st.people) {
    if (p.y + 20 > BOTTOM) { p.newPage(); header(); }
    p.text(ps.person.name + (ps.isPayer ? ' (pagou)' : ''), cols[0], p.y, 10.5, INK, { bold: ps.isPayer, maxW: cols[1] - cols[0] - 8 });
    p.text(m(ps.person.share), cols[2] - 8, p.y, 10.5, INK, { align: 'right' });
    p.text(ps.isPayer ? '—' : m(ps.paid), cols[3] - 8, p.y, 10.5, GREEN, { align: 'right' });
    p.text(ps.isPayer ? '—' : m(ps.remaining), cols[4] - 92, p.y, 10.5, ps.remaining > 0 ? RED : INK, { align: 'right' });
    const c = ps.state === 'PAID' ? GREEN : ps.state === 'PENDING' ? RED : MUTED;
    p.text(PERSON_STATE[ps.state], cols[4], p.y, 9.5, c, { bold: true, align: 'right' });
    p.y += 6; p.rule(p.y); p.y += 14;
  }
  p.y += 8;

  // ---- quem deve a quem
  const to = payer?.name ?? 'quem pagou';
  const debtors = st.people.filter(x => x.remaining > 0);
  p.need(30 + 16 * Math.max(1, debtors.length));
  p.text('Quem deve e quanto', M, p.y, 13, INK, { bold: true }); p.y += 18;
  if (!debtors.length) { p.text('Ninguém deve nada: a despesa está quitada.', M, p.y, 10.5, GREEN); p.y += 16; }
  for (const d of debtors) { p.need(16); p.text(`${d.person.name} deve ${m(d.remaining)} a ${to}`, M, p.y, 10.5, INK, { maxW: CW }); p.y += 16; }
  p.y += 6;
  p.need(20);
  p.text(`Total a receber: ${m(st.toReceive)}   ·   Recebido: ${m(st.received)}   ·   Pendente: ${m(st.pending)}`, M, p.y, 10.5, INK, { bold: true, maxW: CW });
  p.y += 26;

  // ---- pagamentos registrados
  if (e.payments.length) {
    p.need(40);
    p.text('Pagamentos registrados', M, p.y, 13, INK, { bold: true }); p.y += 18;
    const list = [...e.payments].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    for (const pay of list) {
      p.need(16);
      p.text(`${brDate(pay.date)}  ·  ${Shared.person(e, pay.personId)?.name ?? 'Participante'}`, M, p.y, 10.5, INK, { maxW: CW - 110 });
      p.text(m(pay.value), W - M, p.y, 10.5, GREEN, { bold: true, align: 'right' });
      p.y += 16;
    }
    p.y += 10;
  }

  // ---- observação
  if (String(e.note ?? '').trim()) {
    p.need(40);
    p.text('Observação', M, p.y, 13, INK, { bold: true }); p.y += 18;
    for (const line of wrapText(e.note, CW, 10.5)) { p.need(15); p.text(line, M, p.y, 10.5, INK); p.y += 15; }
    p.y += 10;
  }
  if (e.receipt) { p.need(16); p.text('Há uma nota fiscal ou comprovante anexado a esta despesa no Finan+.', M, p.y, 9.5, MUTED); p.y += 16; }
}

/** Gera o comprovante. opt: { now (Date), appVersion }. Devolve { bytes: Uint8Array, pages }. */
export function renderSharedPdf(e, opt = {}) {
  const p = new SharedPen({ now: opt.now || new Date(), appVersion: opt.appVersion || '' });
  layout(p, e);
  p.finishPage();
  const bytes = assemble(p.out, { title: `Despesa compartilhada: ${e.name}`, producer: `Finan+ web ${opt.appVersion || ''}`.trim(), now: opt.now || new Date() });
  return { bytes, pages: p.pages };
}
