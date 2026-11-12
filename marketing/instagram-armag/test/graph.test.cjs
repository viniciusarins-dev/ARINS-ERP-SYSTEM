const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { publicarPost } = require('../scripts/lib/graph.cjs');
const { hospedar } = require('../scripts/lib/hospedagem.cjs');
const { executar } = require('../scripts/publicar.cjs');

// fetch falso: responde em ordem e guarda as chamadas
function falso(respostas) {
  const chamadas = [];
  const fn = async (url, opt = {}) => {
    chamadas.push({ url, metodo: opt.method || 'GET', corpo: typeof opt.body === 'string' ? JSON.parse(opt.body) : opt.body ?? null, headers: opt.headers || {} });
    const r = respostas.shift();
    if (!r) throw new Error('chamada inesperada: ' + url);
    const status = r.status || 200;
    return { ok: status < 400, status, json: async () => r.json ?? r };
  };
  fn.chamadas = chamadas;
  return fn;
}
const G = 'https://graph.facebook.com/v27.0';
const LEG = 'Ação 🚀 (47) 98919-1953';
const opts = (fetch) => ({ fetch, igUserId: '17841', esperaMs: 0, tentativas: 3 });

test('post: cria contêiner, publica e busca o link', async () => {
  const f = falso([{ id: 'c1' }, { id: 'm1' }, { permalink: 'https://instagram.com/p/x' }]);
  const r = await publicarPost({ formato: 'post', legenda: LEG }, ['https://h/01.png'], opts(f));
  assert.deepEqual(r, { media_id: 'm1', permalink: 'https://instagram.com/p/x' });
  assert.equal(f.chamadas[0].url, `${G}/17841/media`);
  assert.deepEqual(f.chamadas[0].corpo, { image_url: 'https://h/01.png', caption: LEG });
  assert.equal(f.chamadas[1].url, `${G}/17841/media_publish`);
  assert.deepEqual(f.chamadas[1].corpo, { creation_id: 'c1' });
  assert.equal(f.chamadas[2].url, `${G}/m1?fields=permalink`);
});

test('carrossel: 3 filhos, contêiner CAROUSEL e publicação', async () => {
  const f = falso([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'car' }, { id: 'm2' }, { permalink: 'p' }]);
  await publicarPost({ formato: 'carrossel', legenda: LEG }, ['u1', 'u2', 'u3'], opts(f));
  for (let i = 0; i < 3; i++) assert.deepEqual(f.chamadas[i].corpo, { image_url: `u${i + 1}`, is_carousel_item: true });
  assert.deepEqual(f.chamadas[3].corpo, { media_type: 'CAROUSEL', children: 'a,b,c', caption: LEG });
  assert.deepEqual(f.chamadas[4].corpo, { creation_id: 'car' });
});

test('reel: espera FINISHED e publica', async () => {
  const f = falso([{ id: 'r' }, { status_code: 'IN_PROGRESS' }, { status_code: 'FINISHED' }, { id: 'm3' }, { permalink: 'p' }]);
  await publicarPost({ formato: 'reel', legenda: LEG }, ['https://h/v.mp4'], opts(f));
  assert.deepEqual(f.chamadas[0].corpo, { media_type: 'REELS', video_url: 'https://h/v.mp4', caption: LEG, share_to_feed: true });
  assert.equal(f.chamadas[1].url, `${G}/r?fields=status_code`);
  assert.equal(f.chamadas[3].url, `${G}/17841/media_publish`);
});

test('reel com ERROR: não publica', async () => {
  const f = falso([{ id: 'r' }, { status_code: 'ERROR' }]);
  await assert.rejects(publicarPost({ formato: 'reel', legenda: LEG }, ['v'], opts(f)), /ERROR/);
  assert.ok(!f.chamadas.some((c) => c.url.endsWith('media_publish')));
});

test('reel que nunca termina: erro de tempo, não publica', async () => {
  const f = falso([{ id: 'r' }, { status_code: 'IN_PROGRESS' }, { status_code: 'IN_PROGRESS' }, { status_code: 'IN_PROGRESS' }]);
  await assert.rejects(publicarPost({ formato: 'reel', legenda: LEG }, ['v'], opts(f)), /tempo/);
  assert.ok(!f.chamadas.some((c) => c.url.endsWith('media_publish')));
});

test('token expirado: mensagem fala do token', async () => {
  const f = falso([{ status: 401, json: { error: { code: 190, message: 'Error validating access token' } } }]);
  await assert.rejects(publicarPost({ formato: 'post', legenda: LEG }, ['u'], opts(f)), /token/);
});

test('hospedar: envia ao Supabase Storage e devolve a URL pública', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'h-')); const arq = path.join(dir, '01.png'); fs.writeFileSync(arq, 'png');
  const f = falso([{ Key: 'ok' }]);
  const url = await hospedar(arq, 'posts/a b/01.png', { fetch: f, url: 'https://x.supabase.co', chave: 'k' });
  assert.equal(f.chamadas[0].url, 'https://x.supabase.co/storage/v1/object/instagram-armag/posts/a%20b/01.png');
  assert.equal(f.chamadas[0].headers['x-upsert'], 'true');
  assert.equal(f.chamadas[0].headers['Content-Type'], 'image/png');
  assert.equal(url, 'https://x.supabase.co/storage/v1/object/public/instagram-armag/posts/a%20b/01.png');
});

test('CLI recusa post já publicado antes de qualquer chamada', async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-'));
  const pasta = path.join(raiz, 'posts', 'x'); fs.mkdirSync(pasta, { recursive: true });
  const post = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'posts', 'exemplo', 'post.json')));
  post.slug = 'x';
  fs.writeFileSync(path.join(pasta, 'post.json'), JSON.stringify(post));
  const hist = path.join(raiz, 'historico.json');
  fs.writeFileSync(hist, JSON.stringify([{ slug: 'x', status: 'publicado', data: '2026-11-16', tema: 't', media_id: '1' }]));
  const f = falso([]);
  await assert.rejects(executar(pasta, { fetch: f, igUserId: '1', historico: hist, supabaseUrl: 'https://s' }), /já publicado/);
  assert.equal(f.chamadas.length, 0);
});
