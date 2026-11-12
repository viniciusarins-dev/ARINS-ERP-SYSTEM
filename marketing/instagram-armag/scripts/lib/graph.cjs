// Publicação pela Instagram Graph API. O token NÃO fica no código: na sessão do Claude o proxy
// injeta o cabeçalho Authorization para graph.facebook.com; fora dela, defina IG_TOKEN.
const BASE = `https://graph.facebook.com/${process.env.IG_GRAPH_VERSION || 'v27.0'}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(fetch, metodo, caminho, corpo) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.IG_TOKEN) headers.Authorization = `Bearer ${process.env.IG_TOKEN}`;
  const rsp = await fetch(`${BASE}/${caminho}`, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  let json = {};
  try { json = await rsp.json(); } catch { /* corpo vazio */ }
  if (!rsp.ok || json.error) {
    const e = json.error || {};
    if (rsp.status === 401 || e.code === 190) throw new Error(`token do Instagram inválido ou expirado (${e.message || rsp.status}) — gere um novo token e atualize a credencial de graph.facebook.com`);
    throw new Error(`Graph API ${metodo} ${caminho} falhou (${rsp.status}): ${e.message || JSON.stringify(json)}`);
  }
  return json;
}

async function esperarPronto(fetch, id, esperaMs, tentativas) {
  for (let i = 0; i < tentativas; i++) {
    const { status_code } = await chamar(fetch, 'GET', `${id}?fields=status_code`);
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`o Instagram não processou o vídeo (status ${status_code})`);
    await sleep(esperaMs);
  }
  throw new Error(`tempo esgotado esperando o Instagram processar o vídeo (${tentativas} tentativas)`);
}

/** Publica e devolve { media_id, permalink }. `urls`: URLs públicas das imagens (ordem dos slides) ou do vídeo. */
async function publicarPost(post, urls, { fetch, igUserId, esperaMs = 5000, tentativas = 60 }) {
  const ig = igUserId;
  let criacao;
  if (post.formato === 'post') {
    criacao = (await chamar(fetch, 'POST', `${ig}/media`, { image_url: urls[0], caption: post.legenda })).id;
  } else if (post.formato === 'carrossel') {
    const filhos = [];
    for (const u of urls) filhos.push((await chamar(fetch, 'POST', `${ig}/media`, { image_url: u, is_carousel_item: true })).id);
    criacao = (await chamar(fetch, 'POST', `${ig}/media`, { media_type: 'CAROUSEL', children: filhos.join(','), caption: post.legenda })).id;
  } else if (post.formato === 'reel') {
    criacao = (await chamar(fetch, 'POST', `${ig}/media`, { media_type: 'REELS', video_url: urls[0], caption: post.legenda, share_to_feed: true })).id;
    await esperarPronto(fetch, criacao, esperaMs, tentativas);
  } else {
    throw new Error(`formato desconhecido: ${post.formato}`);
  }
  const { id } = await chamar(fetch, 'POST', `${ig}/media_publish`, { creation_id: criacao });
  const { permalink } = await chamar(fetch, 'GET', `${id}?fields=permalink`);
  return { media_id: id, permalink };
}

module.exports = { publicarPost, chamar, BASE };
