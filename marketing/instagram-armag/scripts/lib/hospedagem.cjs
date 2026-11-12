// Hospedagem pública da mídia (a Graph API baixa a imagem/vídeo por URL): bucket público do Supabase Storage.
const fs = require('fs');
const path = require('path');

const BUCKET = 'instagram-armag';
const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4' };
const caminhoURL = (d) => d.split('/').map(encodeURIComponent).join('/');

/** Envia o arquivo para <bucket>/<destino> e devolve a URL pública. `chave` é opcional quando o proxy injeta a credencial. */
async function hospedar(arquivoLocal, destino, { fetch, url, chave }) {
  const tipo = TIPOS[path.extname(arquivoLocal).toLowerCase()];
  if (!tipo) throw new Error(`tipo de arquivo não suportado: ${arquivoLocal}`);
  const headers = { 'Content-Type': tipo, 'x-upsert': 'true' };
  if (chave) { headers.Authorization = `Bearer ${chave}`; headers.apikey = chave; }
  const rsp = await fetch(`${url}/storage/v1/object/${BUCKET}/${caminhoURL(destino)}`, { method: 'POST', headers, body: fs.readFileSync(arquivoLocal) });
  if (!rsp.ok) {
    let msg = ''; try { msg = JSON.stringify(await rsp.json()); } catch { /* */ }
    throw new Error(`falha ao hospedar ${destino} (${rsp.status}) ${msg}`);
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${caminhoURL(destino)}`;
}

module.exports = { hospedar, BUCKET };
