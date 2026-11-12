// Histórico de publicações (historico.json): evita post duplicado e tema repetido.
const fs = require('fs');

function lerHistorico(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}

const jaPublicado = (hist, slug) => hist.some((h) => h.slug === slug && h.status === 'publicado');

/** Acrescenta uma entrada ({slug, data, slot, formato, tema, pilar, status, media_id?, permalink?}). */
function registrar(arquivo, entrada) {
  const hist = lerHistorico(arquivo);
  if (jaPublicado(hist, entrada.slug)) throw new Error(`post "${entrada.slug}" já publicado`);
  hist.push({ ...entrada, registradoEm: new Date().toISOString() });
  fs.writeFileSync(arquivo, JSON.stringify(hist, null, 2) + '\n', 'utf8');
  return hist;
}

/** Temas mais recentes primeiro (por data e ordem de registro). */
function temasRecentes(hist, n = 12) {
  return hist
    .map((h, i) => ({ h, i }))
    .sort((a, b) => b.h.data.localeCompare(a.h.data) || b.i - a.i)
    .slice(0, n)
    .map(({ h }) => h.tema);
}

module.exports = { lerHistorico, registrar, jaPublicado, temasRecentes };
