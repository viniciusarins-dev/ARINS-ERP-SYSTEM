const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarPost } = require('../scripts/lib/post.cjs');

const TAGS = '#joinville #joinvillesc #pequenosnegocios #software #automacao #empreendedorismo';
const base = () => ({
  slug: 'x', slot: 'seg', data: '2026-11-16', formato: 'carrossel', tema: 't', pilar: 'dor',
  legenda: `Ação 🚀 cobrança no WhatsApp. Chama: (47) 98919-1953\n\n${TAGS}`,
  slides: [{ titulo: 'a' }, { titulo: 'b' }, { titulo: 'c' }],
});
const has = (errs, s) => errs.some((e) => e.includes(s));

test('carrossel válido não tem erros', () => assert.deepEqual(validarPost(base()), []));
test('legenda com 2201 caracteres é rejeitada', () => {
  const p = base(); p.legenda = p.legenda + 'a'.repeat(2201 - [...p.legenda].length);
  assert.equal([...p.legenda].length, 2201);
  assert.ok(has(validarPost(p), '2200'));
});
test('emoji conta como 1 caractere (2200 exatos passa)', () => {
  const p = base(); p.legenda = p.legenda + '🚀'.repeat(2200 - [...p.legenda].length);
  assert.deepEqual(validarPost(p), []);
});
test('menos de 5 hashtags', () => {
  const p = base(); p.legenda = 'Chama: (47) 98919-1953 #joinville #a #b #c';
  assert.ok(has(validarPost(p), 'hashtags'));
});
test('mais de 8 hashtags', () => {
  const p = base(); p.legenda += ' #a1 #a2 #a3';
  assert.ok(has(validarPost(p), 'hashtags'));
});
test('sem WhatsApp', () => {
  const p = base(); p.legenda = p.legenda.replace('(47) 98919-1953', '');
  assert.ok(has(validarPost(p), 'WhatsApp'));
});
test('link wa.me vale como WhatsApp', () => {
  const p = base(); p.legenda = p.legenda.replace('(47) 98919-1953', 'wa.me/5547989191953');
  assert.deepEqual(validarPost(p), []);
});
test('sem #joinville', () => {
  const p = base(); p.legenda = p.legenda.replace('#joinville #joinvillesc', '#sc #brasil');
  assert.ok(has(validarPost(p), 'joinville'));
});
test('carrossel com 1 ou 11 slides', () => {
  const p = base(); p.slides = [{ titulo: 'a' }];
  assert.ok(validarPost(p).length > 0);
  p.slides = Array.from({ length: 11 }, () => ({ titulo: 'a' }));
  assert.ok(validarPost(p).length > 0);
});
test('reel sem vídeo', () => {
  const p = base(); p.formato = 'reel'; delete p.slides;
  assert.ok(has(validarPost(p), 'vídeo'));
});
test('post precisa de exatamente 1 slide', () => {
  const p = base(); p.formato = 'post';
  assert.ok(validarPost(p).length > 0);
  p.slides = [{ titulo: 'a' }];
  assert.deepEqual(validarPost(p), []);
});
test('formato e slot inválidos', () => {
  const p = base(); p.formato = 'story'; p.slot = 'dom';
  const e = validarPost(p);
  assert.ok(has(e, 'formato') && has(e, 'slot'));
});
