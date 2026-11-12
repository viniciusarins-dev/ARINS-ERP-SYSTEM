// Regras de um post do Instagram da ARMAG (ver docs/superpowers/specs/2026-11-12-instagram-armag-design.md).
const FORMATOS = ['post', 'carrossel', 'reel'];
const SLOTS = ['seg', 'ter', 'qua', 'qui'];
const LIMITE_LEGENDA = 2200;
const WHATSAPP = ['(47) 98919-1953', 'wa.me/5547989191953'];

const hashtags = (texto) => texto.match(/#[\p{L}\p{N}_]+/gu) || [];

/** Retorna a lista de problemas do post (vazia = válido). */
function validarPost(post) {
  const erros = [];
  if (!post || typeof post !== 'object') return ['post ausente'];
  for (const c of ['slug', 'data', 'tema', 'pilar', 'legenda']) if (!post[c]) erros.push(`campo obrigatório ausente: ${c}`);
  if (!FORMATOS.includes(post.formato)) erros.push(`formato inválido: ${post.formato} (use ${FORMATOS.join(', ')})`);
  if (!SLOTS.includes(post.slot)) erros.push(`slot inválido: ${post.slot} (use ${SLOTS.join(', ')})`);
  if (post.data && !/^\d{4}-\d{2}-\d{2}$/.test(post.data)) erros.push('data deve ser AAAA-MM-DD');

  const legenda = post.legenda || '';
  const tam = [...legenda].length;
  if (tam > LIMITE_LEGENDA) erros.push(`legenda com ${tam} caracteres (máximo ${LIMITE_LEGENDA})`);
  const tags = hashtags(legenda).map((t) => t.toLowerCase());
  if (tags.length < 5 || tags.length > 8) erros.push(`use de 5 a 8 hashtags (tem ${tags.length})`);
  if (!tags.includes('#joinville') && !tags.includes('#joinvillesc')) erros.push('inclua #joinville ou #joinvillesc');
  if (!WHATSAPP.some((w) => legenda.includes(w))) erros.push('legenda precisa do WhatsApp: (47) 98919-1953 ou wa.me/5547989191953');

  const slides = Array.isArray(post.slides) ? post.slides : [];
  if (post.formato === 'carrossel' && (slides.length < 2 || slides.length > 10)) erros.push(`carrossel precisa de 2 a 10 slides (tem ${slides.length})`);
  if (post.formato === 'post' && slides.length !== 1) erros.push(`post precisa de exatamente 1 slide (tem ${slides.length})`);
  if (post.formato !== 'reel') slides.forEach((s, i) => { if (!s || !s.titulo) erros.push(`slide ${i + 1} sem título`); });
  if (post.formato === 'reel' && !post.video) erros.push('reel precisa do arquivo de vídeo (campo "video")');
  return erros;
}

module.exports = { validarPost, hashtags, FORMATOS, SLOTS, LIMITE_LEGENDA, WHATSAPP };
