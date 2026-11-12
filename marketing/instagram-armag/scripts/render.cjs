// Gera as imagens (1080×1350) de um post: node scripts/render.cjs posts/<slug>
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { validarPost } = require('./lib/post.cjs');

const ROOT = path.resolve(__dirname, '..');
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

function servir() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

const tipoDoSlide = (post, slide, i) => slide.tipo || (i === 0 ? 'capa' : post.formato === 'carrossel' && i === post.slides.length - 1 ? 'cta' : 'conteudo');

/** Renderiza os slides do post em <pasta>/01.png… e devolve os caminhos absolutos. */
async function renderizar(pasta) {
  const dir = path.resolve(pasta);
  if (!dir.startsWith(ROOT + path.sep)) throw new Error(`a pasta do post precisa estar dentro de ${ROOT}`);
  const post = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
  const erros = validarPost(post);
  if (erros.length) throw new Error(`post inválido:\n- ${erros.join('\n- ')}`);
  if (post.formato === 'reel') return [];

  const srv = await servir();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const erroPagina = [];
    page.on('pageerror', (e) => erroPagina.push(e.message));
    await page.goto(`http://127.0.0.1:${srv.address().port}/templates/peca.html`);
    const base = '/' + path.relative(ROOT, dir).split(path.sep).map(encodeURIComponent).join('/');
    const saida = [];
    for (const [i, slide] of post.slides.entries()) {
      const r = await page.evaluate((a) => window.desenhar(a), { slide, indice: i, total: post.slides.length, tipo: tipoDoSlide(post, slide, i), base });
      if (erroPagina.length) throw new Error(erroPagina.join('; '));
      if (r.estouro) throw new Error(`o texto do slide ${i + 1} estoura o espaço: encurte o título ou o texto`);
      const f = path.join(dir, `${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: f });
      saida.push(f);
    }
    return saida;
  } finally {
    await browser.close();
    srv.close();
  }
}

module.exports = { renderizar, tipoDoSlide };

if (require.main === module) {
  renderizar(process.argv[2] || '.')
    .then((fs_) => console.log(fs_.length ? fs_.join('\n') : 'reel: nada para renderizar'))
    .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
}
