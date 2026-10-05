// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes do relatório em PDF: estrutura do arquivo, paginação "Página n de N" e codificação do texto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tx, newState } from '../js/core.js';
import { buildReport } from '../js/report.js';
import { renderPdf, winAnsi, textWidth } from '../js/pdf.js';

const latin = b => Array.from(b, c => String.fromCharCode(c)).join('');

function bigState(n) {
  const txs = [];
  for (let i = 0; i < n; i++) txs.push(tx({ id: 'x' + i, kind: i % 5 ? 'expense' : 'income', value: 1000 + i * 37, date: `2026-${String(1 + (i % 10)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
    desc: `Lançamento (açúcar) nº ${i}`, category: i % 5 ? ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros'][i % 7] : 'Salário', paid: i % 3 !== 0 }));
  return newState({ txs });
}

test('pdf: arquivo válido com xref e páginas numeradas', () => {
  const s = bigState(400);
  const r = buildReport(s, '2026-01-01', '2026-12-31', '2026-10-15');
  const { bytes, pages } = renderPdf(r, s, { now: new Date(2026, 9, 15, 9, 5) });
  const t = latin(bytes);
  assert.ok(t.startsWith('%PDF-1.4'));
  assert.ok(t.trimEnd().endsWith('%%EOF'));
  assert.ok(pages >= 5);
  assert.equal((t.match(/\/Type \/Page\b/g) || []).length, pages);
  assert.ok(t.includes(`(P\\341gina 1 de ${pages})`));
  assert.ok(t.includes(`(P\\341gina ${pages} de ${pages})`));
  // a tabela xref aponta para o início de cada objeto
  const xref = +t.slice(t.lastIndexOf('startxref') + 10).trim().split('\n')[0];
  const lines = t.slice(xref).split('\n');
  const n = +lines[1].split(' ')[1];
  for (let i = 1; i < n; i++) assert.ok(t.startsWith(`${i} 0 obj`, +lines[2 + i].slice(0, 10)), `objeto ${i}`);
});

test('pdf: sem lançamentos no período', () => {
  const s = newState();
  const { pages, bytes } = renderPdf(buildReport(s, '2026-10-01', '2026-10-31', '2026-10-15'), s, { includeTransactions: false });
  assert.ok(pages <= 2);
  assert.ok(latin(bytes).includes('Sem despesas realizadas no per\\355odo.'));
});

test('pdf: texto em WinAnsi e medição', () => {
  assert.deepEqual(winAnsi('ação…“x”−•'), [97, 0xE7, 0xE3, 111, 0x85, 0x93, 120, 0x94, 0x96, 0x95]);
  assert.deepEqual(winAnsi('😀'), [63]);
  assert.ok(Math.abs(textWidth('Finan+', 10) - 30.85) < 0.01);
  assert.ok(textWidth('A', 10, true) > textWidth('i', 10));
});
