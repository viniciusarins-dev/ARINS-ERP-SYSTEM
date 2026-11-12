const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { renderizar } = require('../scripts/render.cjs');

const dims = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const copia = (mexer) => {
  const dir = fs.mkdtempSync(path.join(__dirname, '..', 'posts', '.tmp-'));
  const post = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'posts', 'exemplo', 'post.json')));
  if (mexer) mexer(post);
  fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify(post));
  return dir;
};

test('carrossel de 3 slides gera 3 PNGs 1080×1350', { timeout: 120000 }, async () => {
  const dir = copia();
  try {
    const arquivos = await renderizar(dir);
    assert.equal(arquivos.length, 3);
    for (const f of arquivos) assert.deepEqual(dims(f), [1080, 1350]);
    assert.deepEqual(arquivos.map((f) => path.basename(f)), ['01.png', '02.png', '03.png']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('texto que estoura o espaço é rejeitado', { timeout: 120000 }, async () => {
  const dir = copia((p) => { p.slides[1].texto = 'texto muito longo '.repeat(120); });
  try { await assert.rejects(renderizar(dir), /estoura/); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('post inválido não é renderizado', { timeout: 120000 }, async () => {
  const dir = copia((p) => { p.legenda = 'sem contato'; });
  try { await assert.rejects(renderizar(dir), /WhatsApp/); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
