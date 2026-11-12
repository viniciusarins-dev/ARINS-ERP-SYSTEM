// Mostra o desempenho por post e por horário: node scripts/metricas.cjs
const path = require('path');
const { lerHistorico } = require('./lib/historico.cjs');
const { coletar, resumoPorSlot } = require('./lib/metricas.cjs');

(async () => {
  const linhas = await coletar(lerHistorico(path.join(__dirname, '..', 'historico.json')), { fetch: globalThis.fetch });
  console.log('| post | slot | formato | alcance | salvos | compart. | visitas ao perfil |\n|---|---|---|---|---|---|---|');
  for (const l of linhas) console.log(`| ${l.slug} | ${l.slot} | ${l.formato} | ${l.alcance} | ${l.salvos} | ${l.compartilhamentos} | ${l.visitas_perfil} |`);
  console.log('\n| slot | posts | alcance médio |\n|---|---|---|');
  for (const r of resumoPorSlot(linhas)) console.log(`| ${r.slot} | ${r.posts} | ${r.alcanceMedio} |`);
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
