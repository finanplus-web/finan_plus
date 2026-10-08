// Finan+ — Copyright (C) 2026 Juscelino Be
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Testes da criptografia de ponta a ponta: código da casa, derivação da chave e selagem dos registros.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCode, normalizeCode, validCode, formatCode, keyFromCode, seal, unseal, b64e, b64d } from '../js/e2e.js';

test('e2e: gera códigos válidos de 24 caracteres', () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) {
    const c = newCode();
    assert.equal(c.length, 24);
    assert.ok(validCode(c), c);
    assert.ok(/^[0-9A-HJKMNP-TV-Z]+$/.test(c), c); // sem I, L, O, U
    seen.add(c);
  }
  assert.ok(seen.size > 45); // praticamente todos diferentes
});

test('e2e: normaliza códigos digitados (hífens, minúsculas, confusões comuns)', () => {
  const c = newCode();
  const spaced = formatCode(c);
  assert.equal(normalizeCode(spaced), c);
  assert.equal(normalizeCode(c.toLowerCase()), c);
  // I/L viram 1 e O vira 0 (estilo Crockford)
  assert.equal(normalizeCode('ilo'), '110');
  assert.ok(!validCode(c.slice(0, 23)));
  assert.ok(!validCode(''));
});

test('e2e: o mesmo código gera sempre a mesma chave', async () => {
  const c = newCode();
  const k1 = await keyFromCode(c);
  const k2 = await keyFromCode(formatCode(c).toLowerCase());
  const box = await seal(k1, 'txs', 'a', { desc: 'segredo' });
  assert.deepEqual(await unseal(k2, 'txs', 'a', box), { desc: 'segredo' });
  await assert.rejects(keyFromCode('curto'));
});

test('e2e: sela e abre; código errado e troca de registro falham', async () => {
  const key = await keyFromCode(newCode());
  const other = await keyFromCode(newCode());
  const box = await seal(key, 'txs', 'a', { desc: 'mercado', value: 1234 });
  assert.deepEqual(await unseal(key, 'txs', 'a', box), { desc: 'mercado', value: 1234 });
  await assert.rejects(unseal(other, 'txs', 'a', box));                      // código diferente
  await assert.rejects(unseal(key, 'txs', 'b', box));                        // bloco colado em outro registro
  await assert.rejects(unseal(key, 'goals', 'a', box));                      // outra coleção
  const raw = Buffer.from(box, 'base64'); raw[20] ^= 1;                      // bloco adulterado
  await assert.rejects(unseal(key, 'txs', 'a', raw.toString('base64')));
  await assert.rejects(unseal(key, 'txs', 'a', 'x'));
});

test('e2e: base64 de ida e volta', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
  assert.deepEqual([...b64d(b64e(bytes))], [...bytes]);
});
