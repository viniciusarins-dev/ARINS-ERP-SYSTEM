// 1) Captura das telas REAIS do site (celular, 1080×1920), sem legendas.
//    Gera clips/<take>/0001.jpg… a 30 fps e clips/<take>.json com os toques (posição e tempo).
//    Segurança: qualquer requisição que não seja GET é bloqueada — nada é enviado ao site
//    (nenhuma conta ou agendamento é criado).
// Uso: node scripts/1-capturar.cjs [site|agendamento]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://barbearia-pink-ten.vercel.app';
const VIEW = { width: 432, height: 768 };
const DPR = 2.5; // 432×768 CSS → 1080×1920 px
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
  });
  await ctx.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  p.setDefaultTimeout(45000);
  return { ctx, p };
}

async function startTake(ctx, p, name) {
  const dir = path.join(ROOT, 'clips', name, 'raw');
  fs.rmSync(path.join(ROOT, 'clips', name), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const f = path.join(dir, `r${String(n++).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1080, maxHeight: 1920 });
  const t0 = Date.now();
  const events = [];
  return {
    t: () => (Date.now() - t0) / 1000,
    async mark(type, loc, label) {
      const b = await loc.boundingBox();
      events.push({ t: (Date.now() - t0) / 1000, type, label, box: { x: b.x * DPR, y: b.y * DPR, w: b.width * DPR, h: b.height * DPR } });
    },
    async stop() {
      const dur = (Date.now() - t0) / 1000;
      await cdp.send('Page.stopScreencast');
      await sleep(200);
      frames.sort((a, b) => a.t - b.t);
      const end = frames[0].t + dur;
      let list = '';
      frames.forEach((fr, i) => {
        const nx = i + 1 < frames.length ? frames[i + 1].t : end;
        list += `file '${fr.f}'\nduration ${Math.max(0.001, nx - fr.t).toFixed(4)}\n`;
      });
      list += `file '${frames[frames.length - 1].f}'\n`;
      const listFile = path.join(ROOT, 'clips', name, 'list.txt');
      fs.writeFileSync(listFile, list);
      // reamostra para 30 fps em sequência de imagens
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-vf', 'fps=30,scale=1080:1920:flags=lanczos', '-q:v', '2', path.join(ROOT, 'clips', name, '%04d.jpg')]);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(listFile);
      const count = fs.readdirSync(path.join(ROOT, 'clips', name)).filter((f) => f.endsWith('.jpg')).length;
      fs.writeFileSync(path.join(ROOT, 'clips', `${name}.json`), JSON.stringify({ duration: dur, frames: count, events }, null, 2));
      console.log(`${name}: ${dur.toFixed(1)}s, ${count} quadros, ${events.length} eventos`);
    },
  };
}

async function smoothScroll(p, to, dur) {
  await p.evaluate(async ([to, dur]) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const goal = typeof to === 'string'
      ? document.querySelector(to).getBoundingClientRect().top + scrollY - 70
      : to;
    const start = scrollY;
    const d = Math.max(0, Math.min(goal, document.documentElement.scrollHeight - innerHeight)) - start;
    const t0 = performance.now();
    await new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        scrollTo(0, start + d * e);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }, [to, dur]);
}

// rola até o elemento ficar numa altura confortável (sem pulo brusco)
async function bringTo(p, loc, frac = 0.45, dur = 700) {
  await loc.waitFor({ state: 'visible' });
  const y = await loc.evaluate((el, frac) => el.getBoundingClientRect().top + scrollY - innerHeight * frac, frac);
  await smoothScroll(p, Math.max(0, y), dur);
}

(async () => {
  const browser = await chromium.launch({ args: [`--force-device-scale-factor=${DPR}`] });

  const SO = process.argv[2]; // opcional: 'agendamento' ou 'site' para regravar só um take
  /* ---------- logotipo real do site (para a cena de solução) ---------- */
  if (!SO) {
    const { ctx, p } = await newPage(browser);
    await p.goto(SITE + '/', { waitUntil: 'load', timeout: 60000 });
    await sleep(3000);
    const logo = p.locator('header a').first();
    fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
    await logo.screenshot({ path: path.join(ROOT, 'assets', 'logo-clube-da-navalha.png'), omitBackground: true });
    await p.screenshot({ path: path.join(ROOT, 'assets', 'home.png') });
    await ctx.close();
  }

  /* ---------- take 1: página inicial → serviços ---------- */
  if (!SO || SO === 'site') {
    const { ctx, p } = await newPage(browser);
    await p.goto(SITE + '/', { waitUntil: 'load', timeout: 60000 });
    await sleep(3500);
    const take = await startTake(ctx, p, 'site');
    await sleep(1800);
    await smoothScroll(p, '#servicos', 2200);
    await sleep(900);
    await smoothScroll(p, (await p.evaluate(() => scrollY)) + 430, 3200);
    await sleep(1000);
    await take.stop();
    await ctx.close();
  }

  /* ---------- take 2: agendamento completo até o cadastro (sem enviar) ---------- */
  if (!SO || SO === 'agendamento') {
    const { ctx, p } = await newPage(browser);
    await p.goto(SITE + '/agendar', { waitUntil: 'load', timeout: 60000 });
    await sleep(3500);
    const take = await startTake(ctx, p, 'agendamento');
    await sleep(1000);

    const servico = p.getByRole('button', { name: /Corte \+ Barba/ });
    await bringTo(p, servico, 0.5, 600);
    await take.mark('tap', servico, 'servico');
    await servico.tap();
    await p.getByRole('button', { name: /Rafael/ }).first().waitFor();
    await sleep(1500);

    const barbeiro = p.getByRole('button', { name: /Rafael/ }).first();
    await take.mark('tap', barbeiro, 'barbeiro');
    await barbeiro.tap();
    await p.getByRole('radio').first().waitFor();
    await sleep(1500);

    // primeiro dia disponível depois de hoje
    const radios = p.getByRole('radio');
    let dia = null;
    for (let i = 1; i < (await radios.count()); i++) {
      const r = radios.nth(i);
      if ((await r.getAttribute('aria-disabled')) !== 'true' && !(await r.isDisabled())) { dia = r; break; }
    }
    await take.mark('tap', dia, 'dia');
    await dia.tap();
    await sleep(1600);

    const horarios = p.getByRole('button', { name: /^\d{1,2}:\d{2}$/ });
    let hora = horarios.nth(Math.min(4, (await horarios.count()) - 1));
    for (let i = 0; i < (await horarios.count()); i++) if ((await horarios.nth(i).innerText()).trim() === '10:00') { hora = horarios.nth(i); break; }
    await bringTo(p, hora, 0.55, 900);
    await sleep(500);
    await take.mark('tap', hora, 'horario');
    await hora.tap();
    await p.getByText('Confira e confirme').waitFor();
    await sleep(1400);

    const valor = p.getByText(/R\$\s*70/).last();
    await bringTo(p, valor, 0.5, 1200);
    await take.mark('focus', valor, 'valor');
    await sleep(1600);

    const criar = p.getByRole('link', { name: /Criar conta e confirmar/ });
    await bringTo(p, criar, 0.6, 900);
    await sleep(400);
    await take.mark('tap', criar, 'criar-conta');
    await criar.tap();
    await p.getByLabel('Nome completo').waitFor();
    await sleep(1600);

    // dados fictícios só para demonstrar (o envio está bloqueado)
    const nome = p.getByLabel('Nome completo');
    await nome.tap();
    await sleep(350); // o toque pode rolar a página: registra a posição já ajustada
    await take.mark('focus', nome, 'nome');
    await nome.pressSequentially('Lucas Almeida', { delay: 75 });
    await sleep(400);
    const cel = p.getByLabel(/Celular/);
    await cel.tap();
    await sleep(350);
    await take.mark('focus', cel, 'celular');
    await cel.pressSequentially('47912345678', { delay: 70 });
    await sleep(400);
    const senha = p.getByLabel(/senha/i).first();
    await senha.tap();
    await senha.pressSequentially('navalha2026', { delay: 60 });
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await sleep(500);
    const botao = p.getByRole('button', { name: /^Criar conta$/ });
    await bringTo(p, botao, 0.62, 800);
    await take.mark('focus', botao, 'botao-criar');
    await sleep(2200);
    await take.stop();
    await ctx.close();
  }

  await browser.close();
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
