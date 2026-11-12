// Publica um post já renderizado e confirmado pelo dono.
// Uso: node scripts/publicar.cjs posts/<slug> --ig <IG_USER_ID> [--dry-run]
// Ambiente: SUPABASE_URL (projeto do bucket), opcional SUPABASE_STORAGE_KEY e IG_TOKEN (na sessão do Claude o proxy injeta).
const fs = require('fs');
const path = require('path');
const { validarPost } = require('./lib/post.cjs');
const { lerHistorico, registrar, jaPublicado } = require('./lib/historico.cjs');
const { publicarPost } = require('./lib/graph.cjs');
const { hospedar } = require('./lib/hospedagem.cjs');

const ROOT = path.resolve(__dirname, '..');

function midias(pasta, post) {
  if (post.formato === 'reel') {
    const v = path.join(pasta, post.video);
    if (!fs.existsSync(v)) throw new Error(`vídeo não encontrado: ${v}`);
    return [v];
  }
  const pngs = post.slides.map((_, i) => path.join(pasta, `${String(i + 1).padStart(2, '0')}.png`));
  const falta = pngs.filter((f) => !fs.existsSync(f));
  if (falta.length) throw new Error(`imagens não renderizadas: ${falta.join(', ')} — rode scripts/render.cjs antes`);
  return pngs;
}

async function executar(pasta, { fetch = globalThis.fetch, igUserId, historico = path.join(ROOT, 'historico.json'), supabaseUrl, chave, dryRun = false, log = console.log } = {}) {
  pasta = path.resolve(pasta);
  const post = JSON.parse(fs.readFileSync(path.join(pasta, 'post.json'), 'utf8'));
  if (jaPublicado(lerHistorico(historico), post.slug)) throw new Error(`post "${post.slug}" já publicado — nada a fazer`);
  const erros = validarPost(post);
  if (erros.length) throw new Error(`post inválido:\n- ${erros.join('\n- ')}`);
  if (!igUserId) throw new Error('informe o id da conta: --ig <IG_USER_ID> (ou IG_USER_ID)');
  if (!supabaseUrl) throw new Error('defina SUPABASE_URL para hospedar a mídia');
  const arquivos = midias(pasta, post);

  if (dryRun) {
    log(`[simulação] ${post.formato} "${post.slug}" — ${arquivos.length} arquivo(s):`);
    arquivos.forEach((a) => log(`  hospedar ${path.basename(a)} → posts/${post.slug}/${path.basename(a)}`));
    log(`  Graph API: ${post.formato === 'carrossel' ? `${arquivos.length} filhos + CAROUSEL` : post.formato === 'reel' ? 'REELS + aguardar FINISHED' : 'imagem'} → media_publish`);
    log(`  legenda (${[...post.legenda].length} caracteres):\n${post.legenda}`);
    return null;
  }

  const urls = [];
  for (const a of arquivos) urls.push(await hospedar(a, `posts/${post.slug}/${path.basename(a)}`, { fetch, url: supabaseUrl, chave }));
  const r = await publicarPost(post, urls, { fetch, igUserId });
  registrar(historico, { slug: post.slug, data: post.data, slot: post.slot, formato: post.formato, tema: post.tema, pilar: post.pilar, status: 'publicado', media_id: r.media_id, permalink: r.permalink });
  log(`publicado: ${r.permalink}`);
  return r;
}

module.exports = { executar };

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (k) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : undefined; };
  executar(a[0], {
    igUserId: val('--ig') || process.env.IG_USER_ID,
    supabaseUrl: process.env.SUPABASE_URL,
    chave: process.env.SUPABASE_STORAGE_KEY,
    dryRun: a.includes('--dry-run'),
  }).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
}
