// Métricas dos posts publicados (Graph API /insights) para reavaliar horários e temas.
const { chamar } = require('./graph.cjs');

const METRICAS = ['reach', 'saved', 'shares', 'profile_visits'];

async function coletar(hist, { fetch }) {
  const linhas = [];
  for (const h of hist.filter((x) => x.status === 'publicado' && x.media_id)) {
    const { data = [] } = await chamar(fetch, 'GET', `${h.media_id}/insights?metric=${METRICAS.join(',')}`);
    const v = (n) => data.find((d) => d.name === n)?.values?.[0]?.value ?? 0;
    linhas.push({ slug: h.slug, slot: h.slot, formato: h.formato, alcance: v('reach'), salvos: v('saved'), compartilhamentos: v('shares'), visitas_perfil: v('profile_visits') });
  }
  return linhas;
}

function resumoPorSlot(linhas) {
  const por = {};
  for (const l of linhas) (por[l.slot] ||= []).push(l.alcance);
  return Object.entries(por)
    .map(([slot, a]) => ({ slot, posts: a.length, alcanceMedio: Math.round(a.reduce((s, x) => s + x, 0) / a.length) }))
    .sort((x, y) => y.alcanceMedio - x.alcanceMedio);
}

module.exports = { coletar, resumoPorSlot, METRICAS };
