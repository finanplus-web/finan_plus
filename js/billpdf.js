// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Abre a fatura em PDF com o PDF.js da Mozilla (js/vendor/pdfjs.js, Licença Apache 2.0, roda no
// navegador) e devolve o texto, linha a linha. Usado por "Ler fatura ou boleto" (FATURAS.md).
//
// - O arquivo é lido só na memória: nada é gravado no aparelho, nem uma cópia sem senha.
// - PDF com senha de abertura: só abre com a senha que a pessoa digitou (ou pediu para lembrar).
//   O app nunca tenta adivinhar a senha.
// - PDF com "proteção" só contra cópia ou impressão abre sem senha: o texto é lido normalmente,
//   porque é o documento da própria pessoa lido no aparelho dela.
// - O PDF.js (1,7 MB) só é carregado na primeira vez que a pessoa usa o recurso.

const MAX_PAGES = 12;          // faturas têm poucas páginas; o resumo fica no começo
export const MAX_BYTES = 25 * 1024 * 1024;

let loading = null;
/** carrega js/vendor/pdfjs.js uma vez (script comum: funciona também em file://) */
export function loadPdfJs() {
  if (globalThis.pdfjsLib) return Promise.resolve(globalThis.pdfjsLib);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/pdfjs.js';
    s.onload = () => globalThis.pdfjsLib ? resolve(globalThis.pdfjsLib) : reject(new Error('PDF.js não carregou'));
    s.onerror = () => { loading = null; reject(new Error('Não foi possível carregar o leitor de PDF.')); };
    document.head.append(s);
  });
  return loading;
}

/**
 * Junta os pedaços de texto do PDF.js em linhas, pela posição na página: rótulo e valor que estão
 * na mesma linha visual ("Total desta fatura ... R$ 1.655,40") ficam juntos, como no Android.
 */
export function linesFromItems(items) {
  const rows = [];
  for (const it of items) {
    if (!it || typeof it.str !== 'string' || !it.str.trim()) continue;
    const x = it.transform?.[4] ?? 0, y = it.transform?.[5] ?? 0, h = Math.abs(it.height || it.transform?.[3] || 10);
    let row = rows.find(r => Math.abs(r.y - y) <= Math.max(2, h * 0.4));
    if (!row) { row = { y, parts: [] }; rows.push(row); }
    row.parts.push({ x, s: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map(r => r.parts.sort((a, b) => a.x - b.x).map(p => p.s.trim()).join(' ')).join('\n');
}

/**
 * bytes: ArrayBuffer/Uint8Array do arquivo. Devolve:
 * { status: 'text', text } | { status: 'needsPassword' } | { status: 'wrongPassword' } | { status: 'noText' } | { status: 'error', message }
 */
export async function readPdfText(bytes, password = '', lib = null) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.length > MAX_BYTES) return { status: 'error', message: 'O arquivo é grande demais para uma fatura (mais de 25 MB).' };
  if (String.fromCharCode(...data.subarray(0, 5)) !== '%PDF-') return { status: 'error', message: 'Este arquivo não é um PDF.' };
  let pdfjs;
  try { pdfjs = lib || await loadPdfJs(); } catch (e) { return { status: 'error', message: e.message }; }
  let doc = null;
  try {
    // isEvalSupported: false — nada de código gerado em tempo de execução (e a página proíbe eval)
    doc = await pdfjs.getDocument({ data: new Uint8Array(data), password: password || undefined, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: false, verbosity: 0 }).promise;
    const parts = [];
    for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES); p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      parts.push(linesFromItems(tc.items));
      page.cleanup();
    }
    const text = parts.join('\n');
    return text.trim() ? { status: 'text', text } : { status: 'noText' };
  } catch (e) {
    if (e?.name === 'PasswordException') return { status: password ? 'wrongPassword' : 'needsPassword' };
    return { status: 'error', message: 'Não foi possível ler este PDF. Ele pode estar danificado.' };
  } finally {
    try { await doc?.destroy(); } catch { /* ignore */ }
  }
}
