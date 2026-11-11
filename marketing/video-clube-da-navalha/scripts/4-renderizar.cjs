// 4) Renderiza a composição quadro a quadro e junta com o áudio.
// Uso: node scripts/4-renderizar.cjs                → vídeo completo em saida/
//      node scripts/4-renderizar.cjs --previa 1,5,9 → só esses instantes (PNG) em previa/
//      acrescente --versao curta para a versão curta (primeiro contato)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const iv = process.argv.indexOf('--versao');
const VERSAO = iv > -1 ? process.argv[iv + 1] : '';
const V = VERSAO
  ? { tl: `timeline-${VERSAO}.json`, page: `${VERSAO}.html`, quadros: `quadros-${VERSAO}`, previa: `previa-${VERSAO}`, audio: `${VERSAO}_mix.wav`, saida: `clube-da-navalha-${VERSAO}.mp4` }
  : { tl: 'timeline.json', page: 'index.html', quadros: 'quadros', previa: 'previa', audio: 'mix.wav', saida: 'clube-da-navalha-comercial-v2.mp4' };
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'roteiro', V.tl)));
const FPS = TL.fps;
const SAIDA = path.join(ROOT, 'saida', V.saida);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/composicao/${V.page}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);

  const previa = process.argv.indexOf('--previa');
  if (previa > -1) {
    const dir = path.join(ROOT, V.previa);
    fs.mkdirSync(dir, { recursive: true });
    for (const t of process.argv[previa + 1].split(',').map(Number)) {
      await page.evaluate((t) => window.renderFrame(t), t);
      await page.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.png`) });
    }
    console.log('prévias em', dir);
  } else {
    const dir = path.join(ROOT, V.quadros);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const total = Math.round(TL.duracao * FPS);
    const t0 = Date.now();
    for (let i = 0; i < total; i++) {
      await page.evaluate((t) => window.renderFrame(t), i / FPS);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
      fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
      if (i % 150 === 0) console.log(`quadro ${i}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'),
      '-i', path.join(ROOT, 'audio', V.audio),
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '19', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', SAIDA]);
    console.log('vídeo:', SAIDA);
  }
  await browser.close();
  srv.close();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
