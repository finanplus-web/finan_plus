// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Interface da paridade com o Android 1.7 a 1.9: comprovante e imagem das despesas compartilhadas, backup
// criptografado com senha (mesmo formato de BackupCrypto.kt), backup automático (nomes e limpeza),
// boas-vindas, saldo acumulado em Lançamentos e reservas para meta na lista (total do dia e linha).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync, createDecipheriv } from 'node:crypto';
import { newState, Ops, Money, Finance } from '../js/core.js';
import { Period } from '../js/calendar.js';
import { Shared } from '../js/shared.js';
import { renderSharedPdf, wrapText } from '../js/sharedpdf.js';
import { imageHeight, wrapLines, shareText } from '../js/sharedimage.js';
import { BackupCrypto } from '../js/backupcrypto.js';
import { toPrune, fileName, config, NAME_RE, DEFAULT_KEEP } from '../js/autobackup.js';
import { shouldShowWelcome, PAGES } from '../js/welcome.js';
import { DEVICE_DEFAULTS } from '../js/store.js';
import { ctx } from '../js/ctx.js';
import { isMe, sharedCardSubtitle } from '../js/sharedview.js';
import { movesAccumulated, dayTotalHtml, txRow } from '../js/screens.js';

const day = '2026-11-02';
const ok = r => { assert.equal(r.ok, true, r.message); return r.state; };
const mercado = (payer = 0, names = ['João', 'Maria', 'Pedro']) =>
  ok(Shared.save(newState(), null, { name: 'Mercado do mês', total: '450', date: day, split: 'equal', people: names.map(name => ({ id: '', name })), payerIndex: payer, note: 'Churrasco de domingo' }));
const pdfText = bytes => String.fromCharCode(...bytes);

// ------------------------------------------------------------------ despesas compartilhadas
test('compartilhada: "Eu" e "Você" são a própria pessoa (sem diferenciar acento e maiúsculas)', () => {
  for (const n of ['Eu', 'eu', ' Você ', 'VOCE', 'voce']) assert.equal(isMe(n), true, n);
  for (const n of ['Euclides', 'Vocês', 'Maria', '']) assert.equal(isMe(n), false, n);
});

test('compartilhada: texto que acompanha a imagem e o PDF lista quem falta pagar', () => {
  let s = mercado();
  const e = s.shared[0], maria = e.people[1];
  assert.equal(shareText(e), 'Mercado do mês — R$ 450,00 (02/11/2026)\nPago por João\n• Maria: falta R$ 150,00\n• Pedro: falta R$ 150,00');
  s = ok(Shared.settle(s, e.id, maria.id, day));
  s = ok(Shared.settle(s, e.id, e.people[2].id, day));
  assert.match(shareText(s.shared[0]), /Tudo quitado\. Obrigado!$/);
});

test('compartilhada: resumo do card em Meu dinheiro respeita "Ocultar valores"', () => {
  ctx.state = newState();
  assert.equal(sharedCardSubtitle(), 'Divida contas com amigos e família e acompanhe quem já pagou');
  ctx.state = mercado();
  assert.equal(sharedCardSubtitle(), '1 em aberto · a receber R$ 300,00');
  ctx.state = { ...ctx.state, privacy: true };
  assert.equal(sharedCardSubtitle(), '1 em aberto · a receber R$ ••••');
});

test('compartilhada: comprovante em PDF com participantes, quem deve, pagamentos e observação', () => {
  let s = mercado();
  const e0 = s.shared[0];
  s = ok(Shared.addPayment(s, e0.id, e0.people[1].id, '50', '2026-11-05'));
  const { bytes, pages } = renderSharedPdf(s.shared[0], { now: new Date(2026, 10, 3, 9, 30), appVersion: '1.4.0' });
  const t = pdfText(bytes);
  assert.ok(t.startsWith('%PDF-1.4'));
  assert.ok(t.trimEnd().endsWith('%%EOF'));
  assert.equal(pages, 1);
  for (const w of ['COMPROVANTE DE DESPESA COMPARTILHADA', 'Participantes', 'Quem deve e quanto', 'Pagamentos registrados', 'Pedro deve R$ 150,00 a Jo', 'Maria deve R$ 100,00 a Jo', 'Recebido: R$ 50,00', 'Pendente: R$ 250,00', 'Gerado pelo Finan+ web 1.4.0 em 03/11/2026'])
    assert.ok(t.includes(w), w);
});

test('compartilhada: PDF com muitos participantes continua em outra página', () => {
  const names = Array.from({ length: 50 }, (_, i) => `Pessoa ${i + 1}`);
  const s = ok(Shared.save(newState(), null, { name: 'Festa', total: '5000', date: day, split: 'equal', people: names.map(name => ({ id: '', name })), payerIndex: 0 }));
  const { pages } = renderSharedPdf(s.shared[0], { now: new Date(2026, 10, 3) });
  assert.ok(pages >= 2);
});

test('compartilhada: quebra de linha do PDF e da imagem', () => {
  assert.deepEqual(wrapText('a b c', 1000, 10), ['a b c']);
  assert.ok(wrapText('palavra '.repeat(40).trim(), 100, 10).length > 5);
  const measure = s => s.length * 10;
  assert.deepEqual(wrapLines(measure, 'Mercado do mês', 1000, 2), ['Mercado do mês']);
  const two = wrapLines(measure, 'um dois três quatro cinco seis sete oito', 100, 2);
  assert.equal(two.length, 2);
  assert.ok(two[1].endsWith('…'));
  assert.ok(measure(two[1]) <= 100);
});

test('compartilhada: a imagem cresce com o título e o número de pessoas (como o Android)', () => {
  assert.equal(imageHeight(1, 3), 300 + 640 + 3 * 132 + 56 + 340);
  assert.equal(imageHeight(2, 4) - imageHeight(1, 4), 70);
  assert.equal(imageHeight(1, 5) - imageHeight(1, 4), 132);
});

// ------------------------------------------------------------------ backup criptografado
test('backup criptografado: ida e volta, envelope igual ao do Android e senha errada', async () => {
  const plain = '{"txs":[],"_backup":{"auto":true}}';
  const text = await BackupCrypto.encrypt(plain, 'senha-forte-1', 100_000);
  const o = JSON.parse(text);
  assert.deepEqual(Object.keys(o), ['format', 'v', 'kdf', 'iter', 'salt', 'cipher', 'iv', 'data']);
  assert.equal(o.format, 'finanplus-backup-cifrado'); assert.equal(o.v, 1); assert.equal(o.kdf, 'PBKDF2-HMAC-SHA256'); assert.equal(o.cipher, 'AES-256-GCM');
  assert.equal(Buffer.from(o.salt, 'base64').length, 16); assert.equal(Buffer.from(o.iv, 'base64').length, 12);
  assert.ok(BackupCrypto.isEncrypted(text)); assert.ok(BackupCrypto.isEncrypted('﻿' + text));
  assert.equal(BackupCrypto.isEncrypted(plain), false); assert.equal(BackupCrypto.isEncrypted('não é json'), false);
  assert.equal(await BackupCrypto.decrypt(text, 'senha-forte-1'), plain);
  await assert.rejects(BackupCrypto.decrypt(text, 'outra-senha'), /Senha incorreta/);
});

test('backup criptografado: abre com uma implementação independente (OpenSSL do Node), como o Android e o Linux', async () => {
  const text = await BackupCrypto.encrypt('olá, Finan+ — R$ 1.234,56', 'minha senha', 100_000);
  const o = JSON.parse(text);
  const key = pbkdf2Sync('minha senha', Buffer.from(o.salt, 'base64'), o.iter, 32, 'sha256');
  const data = Buffer.from(o.data, 'base64');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64'));
  d.setAuthTag(data.subarray(data.length - 16));
  assert.equal(Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()]).toString('utf8'), 'olá, Finan+ — R$ 1.234,56');
});

test('backup criptografado: recusa versão mais nova, iterações fora do limite e arquivo danificado', async () => {
  const o = JSON.parse(await BackupCrypto.encrypt('{}', 'senha-forte-1', 100_000));
  await assert.rejects(BackupCrypto.decrypt(JSON.stringify({ ...o, v: 2 }), 'senha-forte-1'), /versão mais nova/);
  await assert.rejects(BackupCrypto.decrypt(JSON.stringify({ ...o, iter: 1000 }), 'senha-forte-1'), /danificado/);
  await assert.rejects(BackupCrypto.decrypt(JSON.stringify({ ...o, iter: 6_000_000 }), 'senha-forte-1'), /danificado/);
  await assert.rejects(BackupCrypto.decrypt(JSON.stringify({ ...o, iv: 'AAAA' }), 'senha-forte-1'), /danificado/);
  await assert.rejects(BackupCrypto.decrypt(JSON.stringify({ ...o, format: 'x' }), 'senha-forte-1'), /Não é um backup/);
  await assert.rejects(BackupCrypto.decrypt('{', 'x'), /danificado/);
  assert.equal(BackupCrypto.ITER, 310_000);
  assert.equal(BackupCrypto.MIN_PASSWORD, 8);
});

// ------------------------------------------------------------------ backup automático
test('backup automático: nome do arquivo e limpeza só das cópias com esse nome', () => {
  assert.equal(fileName('2026-11-03'), 'finan-plus-auto-2026-11-03.json');
  assert.ok(NAME_RE.test(fileName('2026-11-03')));
  const names = ['finan-plus-auto-2026-11-01.json', 'finan-plus-auto-2026-11-03.json', 'finan-plus-auto-2026-11-02.json', 'notas.txt', 'backup-finan-plus-2026-11-01.json', 'finan-plus-auto-2026-11-02.json.bak'];
  assert.deepEqual(toPrune(names, 2), ['finan-plus-auto-2026-11-01.json']);
  assert.deepEqual(toPrune(names, 7), []);
});

test('backup automático: configuração padrão (desligado, 14 cópias) e valores inválidos', () => {
  assert.deepEqual(config({}), { enabled: false, keep: DEFAULT_KEEP, folder: '', lastAt: 0, lastFile: '', lastError: '', lastDay: '' });
  assert.equal(config({ autoBackup: { enabled: true, keep: 9 } }).keep, 14);
  assert.equal(config({ autoBackup: { enabled: true, keep: 30 } }).keep, 30);
  assert.equal(config({ autoBackup: { enabled: 'sim' } }).enabled, false);
});

// ------------------------------------------------------------------ boas-vindas e ajustes do aparelho
test('ajustes do aparelho: saldo acumulado, efeito vidro e boas-vindas começam desligados', () => {
  assert.equal(DEVICE_DEFAULTS.accumulateBalance, false);
  assert.equal(DEVICE_DEFAULTS.glass, false);
  assert.equal(DEVICE_DEFAULTS.welcomeSeen, false);
});

test('boas-vindas: 4 páginas, só na primeira abertura e sem lançamentos', () => {
  assert.equal(PAGES.length, 4);
  const empty = newState(), withTx = { ...empty, txs: [{ id: 'a' }] };
  assert.equal(shouldShowWelcome({ welcomeSeen: false }, empty), true);
  assert.equal(shouldShowWelcome({ welcomeSeen: true }, empty), false);
  assert.equal(shouldShowWelcome({ welcomeSeen: false }, withTx), false);
  assert.equal(shouldShowWelcome({ welcomeSeen: false }, empty, true), false); // acesso pela rede
});

// ------------------------------------------------------------------ Lançamentos
function withDevice(over, fn) {
  const keep = { device: ctx.device, moves: ctx.moves, today: ctx.today, state: ctx.state };
  ctx.device = { ...DEVICE_DEFAULTS, ...over };
  try { return fn(); } finally { Object.assign(ctx, keep); }
}
const tx = (o) => ({ id: o.id, kind: o.kind ?? 'expense', value: o.value, date: o.date, desc: o.desc ?? 'x', category: o.category ?? 'Outros', paid: o.paid ?? true, accountId: 'main', cardId: '', cardPayment: '', recurringId: '', groupId: '', parcelN: 0, parcelTotal: 0, scheduledDate: null, goalId: o.goalId ?? '' });

test('lançamentos: saldo acumulado só com a opção ligada e sem filtro', () => {
  const s = { ...newState(), txs: [tx({ id: '1', kind: 'income', value: 100000, date: '2026-10-05' }), tx({ id: '2', value: 30000, date: '2026-10-10' }), tx({ id: '3', value: 20000, date: '2026-11-03' })] };
  const base = { state: s, today: '2026-11-03', moves: { from: '2026-11-01', to: '2026-11-30', q: '', kind: '', st: '' } };
  withDevice({}, () => { Object.assign(ctx, base); assert.equal(movesAccumulated(), null); });
  withDevice({ accumulateBalance: true }, () => {
    Object.assign(ctx, base);
    assert.deepEqual(movesAccumulated(), { balance: Finance.balanceAt(s, '2026-11-30'), forecast: Finance.forecastAt(s, '2026-11-30', '2026-11-03', true) });
    assert.equal(movesAccumulated().balance, 50000);
    ctx.moves = { ...base.moves, kind: 'expense' };
    assert.equal(movesAccumulated(), null);
    ctx.moves = { ...base.moves, q: 'mercado' };
    assert.equal(movesAccumulated(), null);
  });
});

test('lançamentos: reserva para meta fica fora do total do dia, numa linha "em metas"', () => {
  let s = ok(Ops.saveGoal(newState(), null, 'Notebook', '3000', '', null, ''));
  const g = s.goals[0];
  s = ok(Ops.saveGoal(s, g.id, 'Notebook', '3000', '100', null, '', true, 'main', day));
  const reserve = s.txs.find(t => t.goalId === g.id);
  withDevice({}, () => {
    ctx.state = s; ctx.today = day;
    const only = dayTotalHtml(Period.dayTotal([reserve]));
    assert.match(only, /R\$ 100,00 em metas/);
    assert.doesNotMatch(only, /− R\$ 100,00/);
    const mixed = dayTotalHtml(Period.dayTotal([reserve, tx({ id: 'b', value: 2500, date: day })]));
    assert.match(mixed, /− R\$ 25,00/); assert.match(mixed, /R\$ 100,00 em metas/);
    const row = txRow(reserve, { noDate: true });
    assert.match(row, /Guardado na meta/);
    assert.match(row, /<span class="amount">R\$ 100,00<\/span>/); // sem o sinal de menos
    assert.doesNotMatch(row, /data-act="toggle-paid"/);
    ctx.state = { ...s, privacy: true };
    assert.equal(dayTotalHtml(Period.dayTotal([reserve])), '');
  });
  // retirada: volta para a conta, "+" em verde e "retirados de metas"
  const s2 = ok(Ops.saveGoal(s, g.id, 'Notebook', '3000', '-40', null, '', true, 'main', day));
  const back = s2.txs.find(t => t.goalId === g.id && t.kind === 'income');
  withDevice({}, () => {
    ctx.state = s2; ctx.today = day;
    assert.match(dayTotalHtml(Period.dayTotal([back])), /R\$ 40,00 retirados de metas/);
    assert.match(txRow(back, { noDate: true }), /\+R\$ 40,00/);
  });
  assert.equal(Money.format(Finance.goalMoves(s2.txs).net), 'R$ 60,00');
});
