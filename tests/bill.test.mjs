// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Ler fatura ou boleto: os mesmos casos do app Android (BillTest.kt), mais a leitura dos PDFs de
// exemplo (tests/fixtures/faturas, fatura fictícia) com o PDF.js embutido em js/vendor/pdfjs.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newState, Finance, ymOf } from '../js/core.js';
import { parseBoleto, parsePix, crc16, dueFromFactor, billFromCode, billFromText, dateIn, isEmptyBill, BillMatch, mod11Utility } from '../js/bill.js';
import { readPdfText, linesFromItems } from '../js/billpdf.js';

const TODAY = '2026-10-13';
// exemplos públicos com os quatro dígitos verificadores corretos
const ITAU = '34191.79001 01043.510047 91020.150008 5 84380000026000';
const BB = '00190500954014481606906809350314337370000000100';
const LUZ = '836200000005 667800481000 180975657313 001589636081';
const PIX = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42665544000052040000530398654071234.565802BR5913Fulano de Tal6008BRASILIA62070503***63046EE5';

test('boleto bancário', () => {
  const b = parseBoleto(ITAU, '2020-11-01');
  assert.equal(b.type, 'bank'); assert.equal(b.amount, 26000); assert.equal(b.due, '2020-11-13'); assert.equal(b.bank, 'Itaú');
  assert.equal(b.barcode, '34195843800000260001790001043510049102015000');
  assert.equal(parseBoleto(b.barcode, '2020-11-01').amount, 26000);
  assert.equal(parseBoleto(BB, TODAY).bank, 'Banco do Brasil');
  assert.equal(parseBoleto(BB, TODAY).amount, 100);
});

test('boleto com dígito errado não vale nada', () => {
  assert.equal(parseBoleto(ITAU.replace('84380000026000', '84380000026100'), TODAY), null);
  assert.equal(parseBoleto(ITAU.replace('79001', '79002'), TODAY), null);
  assert.equal(parseBoleto('1234', TODAY), null);
  assert.equal(parseBoleto(LUZ.replace('667800481000', '667800481001'), TODAY), null);
});

test('fator de vencimento antes e depois da virada de 2025', () => {
  assert.equal(dueFromFactor(9999, '2025-02-01'), '2025-02-21');
  assert.equal(dueFromFactor(1000, '2025-02-01'), '2025-02-22');
  assert.equal(dueFromFactor(1626, TODAY), '2026-11-10');
  assert.equal(dueFromFactor(0, TODAY), null);
});

test('boleto de arrecadação', () => {
  const b = parseBoleto(LUZ, TODAY);
  assert.equal(b.type, 'utility'); assert.equal(b.amount, 6678); assert.equal(b.segment, 'Energia elétrica e gás'); assert.equal(b.due, null);
  assert.equal(parseBoleto('846700000017435900240209024050002435842210108119', TODAY).amount, 14359);
});

test('arrecadação com módulo 11', () => {
  const body = '848' + '00000012345' + '0001' + '2026111500000000000000000';
  const bc = body.slice(0, 3) + mod11Utility(body) + body.slice(3);
  assert.equal(bc.length, 44);
  let line = '';
  for (let i = 0; i < 4; i++) { const p = bc.slice(i * 11, i * 11 + 11); line += p + mod11Utility(p); }
  const info = parseBoleto(line, TODAY);
  assert.equal(info.amount, 12345); assert.equal(info.segment, 'Telefone e internet');
});

test('Pix copia e cola', () => {
  assert.equal(crc16('123456789'), '29B1');
  const manual = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';
  const p = parsePix(manual);
  assert.equal(p.amount, null); assert.equal(p.name, 'Fulano de Tal');
  assert.equal(parsePix(PIX).amount, 123456);
  assert.equal(parsePix(PIX.replace('1234.56', '1234.57')), null);
});

test('código colado', () => {
  const i = billFromCode(` ${ITAU} \n`, '2020-11-01');
  assert.equal(i.amount.value, 26000); assert.equal(i.amount.source, 'boleto'); assert.equal(i.due.value, '2020-11-13');
  assert.equal(billFromCode('qualquer coisa', TODAY), null);
});

test('fatura de cartão por rótulos', () => {
  const text = ['BANCO EXEMPLO S.A.', 'Resumo da fatura', 'Total da fatura anterior R$ 1.020,00', 'Pagamento mínimo R$ 98,31',
    'Total desta fatura', 'R$ 1.655,40', 'Data de vencimento: 15/11/2026', 'Próximo vencimento 15/12/2026', 'Limite disponível R$ 3.000,00'].join('\n');
  const i = billFromText(text, TODAY);
  assert.equal(i.amount.value, 165540); assert.equal(i.amount.source, 'text'); assert.equal(i.due.value, '2026-11-15');
});

test('rótulos na mesma linha e mês por extenso', () => {
  const i = billFromText('Total da fatura R$ 655,40   Pagamento mínimo R$ 98,31\nVencimento 15 NOV\n', TODAY);
  assert.equal(i.amount.value, 65540); assert.equal(i.due.value, '2026-11-15');
  assert.equal(dateIn('vence em 5 de janeiro', TODAY), '2027-01-05');
  assert.equal(dateIn('01/12/26', TODAY), '2026-12-01');
  assert.equal(dateIn('31/02/2026', TODAY), null);
});

test('pagamento mínimo não é o total', () => {
  assert.equal(billFromText('Pagamento mínimo do total da fatura R$ 98,31\nValor total R$ 980,00', TODAY).amount.value, 98000);
});

test('linha digitável no texto tem prioridade', () => {
  const i = billFromText(`Valor total R$ 999,99\nVencimento 01/01/2027\nPague com o código:\n${ITAU}\n`, '2020-11-01');
  assert.equal(i.amount.value, 26000); assert.equal(i.amount.source, 'boleto'); assert.equal(i.due.value, '2020-11-13');
});

test('Pix no texto quebrado em linhas', () => {
  const text = 'Pague com Pix copia e cola:\n' + PIX.match(/.{1,40}/g).join('\n');
  const i = billFromText(text, TODAY);
  assert.equal(i.amount.value, 123456); assert.equal(i.amount.source, 'pix'); assert.equal(i.payee, 'Fulano de Tal');
});

test('texto sem nada', () => {
  const i = billFromText('Olá, este documento não tem valores.', TODAY);
  assert.ok(isEmptyBill(i)); assert.equal(i.dynamicPix, false);
});

test('fatura do cartão', () => {
  const c = { id: 'c', name: 'Cartão X', limit: 500000, close: 5, due: 12 };
  const t = (id, value, date) => ({ id, kind: 'expense', value, date, desc: id, category: 'Outros', paid: true, accountId: 'main', cardId: 'c', cardPayment: '' });
  const s = newState({ cards: [c], txs: [t('1', 10000, '2026-10-03'), t('2', 20000, '2026-10-09'), t('3', 5000, '2026-11-02')] });
  const ym = BillMatch.invoiceYm(s, c, '2026-11-12', TODAY);
  assert.equal(ym, ymOf('2026-11-01'));
  assert.equal(BillMatch.appTotal(s, c, ym), 25000);
  assert.equal(Finance.invoiceYm(c, BillMatch.dateInInvoice(c, ym)), ym);
  const late = { id: 'l', name: 'Late', limit: 0, close: 25, due: 5 };
  assert.equal(BillMatch.invoiceYm(s, late, '2026-11-05', TODAY), ymOf('2026-10-01'));
});

test('linhas do PDF pela posição', () => {
  const it = (str, x, y) => ({ str, transform: [10, 0, 0, 10, x, y], height: 10 });
  assert.equal(linesFromItems([it('R$ 1.655,40', 300, 700), it('Total desta fatura', 50, 701), it('Vencimento', 50, 680), it('15/11/2026', 300, 680)]),
    'Total desta fatura R$ 1.655,40\nVencimento 15/11/2026');
});

// ------------------------------------------------------------------ PDFs de exemplo (PDF.js embutido)
// O PDF.js de navegador pede algumas classes de desenho que o Node não tem; para só ler texto, basta existirem.
globalThis.DOMMatrix ??= class DOMMatrix { constructor() { Object.assign(this, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }); } };
globalThis.ImageData ??= class ImageData {};
globalThis.Path2D ??= class Path2D {};
const origWarn = console.warn, origLog = console.log;
console.warn = () => {}; console.log = () => {};
await import('../js/vendor/pdfjs.js');
console.warn = origWarn; console.log = origLog;
const fx = n => readFileSync(new URL(`./fixtures/faturas/${n}`, import.meta.url));
const read = (n, pw = '') => readPdfText(fx(n), pw, globalThis.pdfjsLib);

test('PDF: fatura sem senha', async () => {
  const r = await read('fatura.pdf');
  assert.equal(r.status, 'text');
  const i = billFromText(r.text, TODAY);
  assert.equal(i.amount.value, 165540); assert.equal(i.amount.source, 'boleto'); assert.equal(i.due.value, '2026-11-15');
  assert.match(r.text, /Total desta fatura R\$ 1\.655,40/);
});

test('PDF com senha (AES-256 e RC4)', async () => {
  assert.equal((await read('fatura-senha.pdf')).status, 'needsPassword');
  assert.equal((await read('fatura-senha.pdf', '999')).status, 'wrongPassword');
  const ok = await read('fatura-senha.pdf', '12345');
  assert.equal(ok.status, 'text'); assert.equal(billFromText(ok.text, TODAY).amount.value, 165540);
  const rc4 = await read('fatura-senha-rc4.pdf', '12345');
  assert.equal(rc4.status, 'text');
});

test('PDF só com restrição de cópia abre sem senha', async () => {
  const r = await read('fatura-restrita.pdf');
  assert.equal(r.status, 'text'); assert.equal(billFromText(r.text, TODAY).amount.value, 165540);
});

test('PDF só imagem e arquivo que não é PDF', async () => {
  assert.equal((await read('imagem.pdf')).status, 'noText');
  assert.equal((await readPdfText(new TextEncoder().encode('não é pdf'), '', globalThis.pdfjsLib)).status, 'error');
});
