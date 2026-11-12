const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { lerHistorico, registrar, jaPublicado, temasRecentes } = require('../scripts/lib/historico.cjs');

const tmp = () => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hist-')), 'h.json'); fs.writeFileSync(f, '[]'); return f; };
const e = (slug, tema, status = 'publicado', data = '2026-11-16') => ({ slug, data, slot: 'seg', formato: 'post', tema, pilar: 'dor', status, media_id: status === 'publicado' ? '1' : undefined });

test('registrar e consultar publicado', () => {
  const f = tmp(); registrar(f, e('a', 'Tema A'));
  assert.equal(jaPublicado(lerHistorico(f), 'a'), true);
  assert.equal(jaPublicado(lerHistorico(f), 'b'), false);
});
test('pulado não conta como publicado', () => {
  const f = tmp(); registrar(f, e('a', 'Tema A', 'pulado'));
  assert.equal(jaPublicado(lerHistorico(f), 'a'), false);
});
test('registrar de novo um slug publicado lança erro', () => {
  const f = tmp(); registrar(f, e('a', 'Tema A'));
  assert.throws(() => registrar(f, e('a', 'Tema A')), /já publicado/);
});
test('temas recentes: mais novos primeiro, no máximo n', () => {
  const f = tmp();
  registrar(f, e('a', 'A', 'publicado', '2026-11-16'));
  registrar(f, e('b', 'B', 'publicado', '2026-11-17'));
  registrar(f, e('c', 'C', 'publicado', '2026-11-18'));
  assert.deepEqual(temasRecentes(lerHistorico(f), 2), ['C', 'B']);
});
test('acentos preservados no arquivo', () => {
  const f = tmp(); registrar(f, e('a', 'Cobrança com um botão'));
  assert.match(fs.readFileSync(f, 'utf8'), /Cobrança com um botão/);
});
test('arquivo inexistente = histórico vazio', () => assert.deepEqual(lerHistorico('/nao/existe.json'), []));
