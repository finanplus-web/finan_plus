// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Resumo de uma despesa compartilhada como imagem (PNG, 1080 px de largura), para mandar no WhatsApp,
// Telegram ou e-mail: tradução de export/SharedImage.kt do Finan+ Android, desenhada num <canvas>, no
// navegador, sem internet. Na identidade do Finan+: ícone e nome do app no topo, fundo azul-claro com brilhos
// suaves, cartão branco com o total, quem pagou e quem deve e quanto, e o endereço do site no rodapé.
// Usa sempre as cores claras do app (em qualquer tema) e mostra os valores mesmo com "Ocultar valores".
import { Money, brDate } from './core.js';
import { Shared, SPLIT } from './shared.js';

const W = 1080, PAD = 64, CARD_PAD = 56, ROW_H = 132, CARD_TOP = 300, FOOTER_H = 340;
const BG = '#EEF4FF', INK = '#182238', MUTED = '#5B6579', ACCENT = '#3A5FC8', GREEN = '#1B7351', RED = '#B03A4F', TRACK = '#E3E9F5', LINE = '#E6EBF5';
const AVATARS = ['#3A5FC8', '#7B61C9', '#1B9E77', '#E07A2F', '#2A9DB5', '#B03A4F'];
export const SITE = 'finanplus-web.github.io';
const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

/** altura da imagem: cresce com as linhas do título e o número de pessoas (mesma conta do Android) */
export const imageHeight = (titleLines, people) => CARD_TOP + (570 + titleLines * 70) + people * ROW_H + CARD_PAD + FOOTER_H;

/** texto que acompanha a imagem ou o PDF: quem falta pagar */
export function shareText(e, st = Shared.summary(e)) {
  const lines = [`${e.name} — ${Money.format(e.total)} (${brDate(e.date)})`, `Pago por ${Shared.payer(e)?.name ?? '—'}`];
  const debtors = st.people.filter(x => x.remaining > 0);
  if (!debtors.length) lines.push('Tudo quitado. Obrigado!');
  else for (const d of debtors) lines.push(`• ${d.person.name}: falta ${Money.format(d.remaining)}`);
  return lines.join('\n');
}

const alpha = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a / 255})`;

function fit(c, s, max) {
  if (c.measureText(s).width <= max) return s;
  let t = [...s];
  while (t.length && c.measureText(t.join('') + '…').width > max) t.pop();
  return t.join('') + '…';
}
/** quebra em até [maxLines] linhas; o resto vai cortado com "…" na última */
export function wrapLines(measure, s, max, maxLines) {
  const lines = [];
  let cur = '';
  for (const w of String(s).split(' ').filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (measure(next) <= max || !cur) cur = next; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines.length ? lines : [''];
  const keep = lines.slice(0, maxLines);
  let last = [...lines.slice(maxLines - 1).join(' ')];
  while (last.length && measure(last.join('') + '…') > max) last.pop();
  keep[maxLines - 1] = last.join('') + '…';
  return keep;
}

function loadIcon() {
  return new Promise(res => {
    if (typeof Image === 'undefined') return res(null);
    const img = new Image();
    img.onload = () => res(img); img.onerror = () => res(null);
    img.src = 'icons/icon-512.png';
  });
}
function drawIcon(c, img, x, y, size) {
  const r = size * 0.26;
  c.save();
  c.beginPath(); c.roundRect(x, y, size, size, r); c.clip();
  if (img) c.drawImage(img, x, y, size, size);
  else { c.fillStyle = ACCENT; c.fillRect(x, y, size, size); c.fillStyle = '#fff'; c.font = `800 ${size * 0.5}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F+', x + size / 2, y + size / 2); }
  c.restore();
}

/** desenha a imagem e devolve o <canvas> */
export async function renderSharedImage(e) {
  const st = Shared.summary(e), payer = Shared.payer(e);
  const img = await loadIcon();
  const cardW = W - 2 * PAD, inner = cardW - 2 * CARD_PAD;
  const canvas = document.createElement('canvas');
  const c0 = canvas.getContext('2d');
  c0.font = `800 60px ${FONT}`;
  const title = wrapLines(s => c0.measureText(s).width, e.name, inner, 2);
  const h = imageHeight(title.length, st.people.length);
  canvas.width = W; canvas.height = h;
  const c = canvas.getContext('2d');
  const text = (s, x, y, size, weight, color, align = 'left') => { c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(s, x, y); };
  const setFont = (size, weight) => { c.font = `${weight} ${size}px ${FONT}`; };

  // ---- fundo azul-claro com brilhos suaves
  c.fillStyle = BG; c.fillRect(0, 0, W, h);
  const glow = (cx, cy, r, color, a) => { const g = c.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, alpha(color, a)); g.addColorStop(1, alpha(color, 0)); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); };
  glow(W * 0.95, 40, 700, ACCENT, 90);
  glow(0, h * 0.35, 620, '#C9BBFF', 110);
  glow(W * 0.9, h * 0.75, 600, '#A9E5CF', 90);
  glow(W * 0.1, h, 560, ACCENT, 60);

  // ---- topo: ícone do app + nome
  const iconSize = 136;
  drawIcon(c, img, PAD, 78, iconSize);
  text('Finan+', PAD + iconSize + 32, 150, 64, 800, INK);
  text('Despesa compartilhada', PAD + iconSize + 34, 198, 32, 400, MUTED);

  // ---- cartão branco
  const cardH = 570 + title.length * 70 + st.people.length * ROW_H + CARD_PAD;
  c.fillStyle = 'rgba(38,62,140,.14)'; c.beginPath(); c.roundRect(PAD, CARD_TOP + 14, cardW, cardH, 56); c.fill();
  c.fillStyle = 'rgba(255,255,255,.96)'; c.beginPath(); c.roundRect(PAD, CARD_TOP, cardW, cardH, 56); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();

  const x0 = PAD + CARD_PAD, x1 = PAD + cardW - CARD_PAD;
  let y = CARD_TOP + CARD_PAD + 20;
  for (const line of title) { y += 52; text(line, x0, y, 60, 800, INK); y += 18; }
  y += 44;
  setFont(32, 400);
  text(fit(c, `${brDate(e.date)} · pago por ${payer?.name ?? '—'} · ${e.split === SPLIT.EQUAL ? 'dividida igualmente' : 'valor de cada um'}`, inner), x0, y, 32, 400, MUTED);

  // total
  y += 40;
  y += 34; c.letterSpacing = '1.7px'; text('TOTAL', x0, y, 28, 700, MUTED); c.letterSpacing = '0px';
  y += 92; text(Money.format(e.total), x0, y, 92, 800, ACCENT);

  // recebido / pendente / situação
  y += 40;
  const colW = inner / 3;
  const stat = (i, label, value, color, size = 40) => {
    const x = x0 + i * colW;
    text(label, x, y + 30, 28, 400, MUTED);
    setFont(size, 700);
    text(fit(c, value, colW - 8), x, y + 82, size, 700, color);
  };
  const stateColor = st.state === 'SETTLED' ? GREEN : st.state === 'PARTIAL' ? ACCENT : RED;
  stat(0, 'Recebido', Money.format(st.received), GREEN);
  stat(1, 'Pendente', Money.format(st.pending), st.pending > 0 ? RED : GREEN);
  stat(2, 'Situação', { OPEN: 'Pendente', PARTIAL: 'Parcialmente paga', SETTLED: 'Quitada' }[st.state], stateColor, 32);
  y += 110;
  c.fillStyle = TRACK; c.beginPath(); c.roundRect(x0, y, x1 - x0, 18, 9); c.fill();
  if (st.toReceive > 0 && st.received > 0) { const f = Math.min(1, Math.max(0, st.received / st.toReceive)); c.fillStyle = GREEN; c.beginPath(); c.roundRect(x0, y, (x1 - x0) * f, 18, 9); c.fill(); }
  y += 18 + 46;

  // ---- quem deve e quanto
  c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
  y += 70;
  text('Quem deve e quanto', x0, y - 16, 40, 800, INK);
  st.people.forEach((ps, i) => { row(c, ps, i, x0, x1, y, st.toReceive, i === st.people.length - 1, text, setFont); y += ROW_H; });

  // ---- rodapé: marca, centralizada
  const cx = W / 2, small = 72, iconTop = CARD_TOP + cardH + 60;
  drawIcon(c, img, cx - small / 2, iconTop, small);
  text('Feito com Finan+', cx, iconTop + small + 50, 34, 800, INK, 'center');
  text('Finanças pessoais livres e privadas', cx, iconTop + small + 90, 26, 400, MUTED, 'center');
  text(SITE, cx, iconTop + small + 142, 28, 700, ACCENT, 'center');
  return canvas;
}

function row(c, ps, i, x0, x1, top, toReceive, last, text, setFont) {
  const cy = top + ROW_H / 2, nameX = x0 + 104;
  const color = AVATARS[i % AVATARS.length];
  c.fillStyle = alpha(color, 40); c.beginPath(); c.arc(x0 + 40, cy, 40, 0, Math.PI * 2); c.fill();
  const initial = [...ps.person.name.trim()][0]?.toUpperCase() || '?';
  setFont(36, 800); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(initial, x0 + 40, cy + 2);

  const [label, fg] = { NONE: ['Pagou', ACCENT], PAID: ['Quitado', GREEN], PARTIAL: ['Pagou parte', ACCENT], PENDING: ['Pendente', RED] }[ps.state];
  setFont(26, 700);
  const pw = c.measureText(label).width + 44;
  c.fillStyle = alpha(fg, 30); c.beginPath(); c.roundRect(x1 - pw, cy - 52, pw, 44, 22); c.fill();
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x1 - pw / 2, cy - 29);

  const amount = ps.isPayer ? `recebe ${Money.format(toReceive)}` : ps.remaining > 0 ? `falta ${Money.format(ps.remaining)}` : Money.format(ps.owed);
  text(amount, x1, cy + 36, 32, 700, !ps.isPayer && ps.remaining > 0 ? RED : INK, 'right');
  setFont(32, 700);
  const amountW = c.measureText(amount).width;

  setFont(36, 700);
  text(fit(c, ps.person.name, x1 - pw - 24 - nameX), nameX, cy - 10, 36, 700, INK);
  const sub = ps.isPayer ? `Pagou a despesa · parte ${Money.format(ps.person.share)}` : `Parte ${Money.format(ps.owed)} · devolveu ${Money.format(ps.paid)}`;
  setFont(28, 400);
  text(fit(c, sub, x1 - amountW - 28 - nameX), nameX, cy + 34, 28, 400, MUTED);

  if (!last) { c.strokeStyle = LINE; c.lineWidth = 2; c.beginPath(); c.moveTo(nameX, top + ROW_H - 1); c.lineTo(x1, top + ROW_H - 1); c.stroke(); }
}

/** PNG (Blob) da despesa */
export async function sharedImageBlob(e) {
  const canvas = await renderSharedImage(e);
  return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Não foi possível gerar a imagem')), 'image/png'));
}
