const { test } = require('node:test');
const assert = require('node:assert/strict');
const { coletar, resumoPorSlot } = require('../scripts/lib/metricas.cjs');

const insights = (reach, saved, shares, visits) => ({ data: [
  { name: 'reach', values: [{ value: reach }] }, { name: 'saved', values: [{ value: saved }] },
  { name: 'shares', values: [{ value: shares }] }, { name: 'profile_visits', values: [{ value: visits }] }] });

test('coleta insights só dos publicados e resume por slot', async () => {
  const hist = [
    { slug: 'a', slot: 'seg', formato: 'carrossel', status: 'publicado', media_id: '1' },
    { slug: 'b', slot: 'qua', formato: 'reel', status: 'publicado', media_id: '2' },
    { slug: 'c', slot: 'seg', formato: 'carrossel', status: 'publicado', media_id: '3' },
    { slug: 'd', slot: 'ter', formato: 'post', status: 'pulado' },
  ];
  const urls = [];
  const resp = { 1: insights(100, 5, 1, 4), 2: insights(900, 20, 9, 30), 3: insights(300, 7, 2, 6) };
  const fetch = async (url) => { urls.push(url); const id = url.match(/v21\.0\/(\d+)\//)[1]; return { ok: true, status: 200, json: async () => resp[id] }; };
  const linhas = await coletar(hist, { fetch });
  assert.equal(linhas.length, 3);
  assert.ok(urls[0].includes('/1/insights?metric=reach,saved,shares,profile_visits'));
  assert.deepEqual(linhas[0], { slug: 'a', slot: 'seg', formato: 'carrossel', alcance: 100, salvos: 5, compartilhamentos: 1, visitas_perfil: 4 });
  assert.deepEqual(resumoPorSlot(linhas), [{ slot: 'qua', posts: 1, alcanceMedio: 900 }, { slot: 'seg', posts: 2, alcanceMedio: 200 }]);
});
