// Grava o site do Clube da Navalha como vídeo de demonstração (prospecção).
// Uso: node record.cjs <h|v> <pasta-saida>
// Só navega e escolhe opções; NÃO confirma agendamento (nenhum dado é enviado).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] === 'v' ? 'v' : 'h';
const OUT = process.argv[3];
const SITE = 'https://barbearia-pink-ten.vercel.app';
const CONTACT = process.env.CONTACT || 'WhatsApp (47) 98919-1953';
const BRAND = process.env.BRAND || 'ARMAG · Sites e sistemas';

const cfg = MODE === 'v'
  ? { viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, W: 1080, H: 1920 }
  : { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2, isMobile: false, hasTouch: false, W: 1920, H: 1080 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- camada visual injetada (legendas, cursor, cartões) ---------- */
const overlayInit = (mode) => {
  const V = mode === 'v';
  window.__ov = {
    root() {
      let r = document.getElementById('__ov');
      if (r) return r;
      r = document.createElement('div');
      r.id = '__ov';
      r.innerHTML = `
<style>
#__ov{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Geist,ui-sans-serif,system-ui,sans-serif}
#__cap{position:absolute;left:50%;transform:translate(-50%,16px);opacity:0;transition:opacity .45s ease,transform .45s ease;
  ${V ? 'top:84px;width:calc(100% - 28px);' : 'bottom:56px;max-width:1100px;'}
  background:rgba(10,10,10,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.14);border-radius:${V ? 18 : 22}px;padding:${V ? '14px 18px' : '20px 34px'};
  box-shadow:0 20px 60px rgba(0,0,0,.6);text-align:${V ? 'left' : 'center'}}
#__cap.on{opacity:1;transform:translate(-50%,0)}
#__cap .k{font-size:${V ? 10 : 12}px;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:${V ? 6 : 8}px;display:flex;gap:8px;align-items:center;${V ? '' : 'justify-content:center;'}}
#__cap .k i{width:7px;height:7px;border-radius:50%;background:#3ddc84;box-shadow:0 0 8px #3ddc84;display:inline-block}
#__cap .t{font-family:"Instrument Serif",Georgia,serif;font-size:${V ? 26 : 44}px;line-height:1.08;color:#f5f5f4}
#__cap .t em{color:rgba(245,245,244,.62)}
#__cap .s{font-size:${V ? 13.5 : 19}px;color:rgba(255,255,255,.7);margin-top:${V ? 6 : 10}px;line-height:1.4}
#__cur{position:absolute;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -3px;opacity:${V ? 0 : 1};transition:opacity .3s;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
.__rip{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:2px solid rgba(255,255,255,.95);
  background:rgba(255,255,255,.18);animation:__rip .65s ease-out forwards}
@keyframes __rip{to{transform:scale(${V ? 3.4 : 2.8});opacity:0}}
#__card{position:absolute;inset:0;background:#0a0a0a;display:flex;flex-direction:column;justify-content:center;
  padding:${V ? '0 34px' : '0 160px'};opacity:0;transition:opacity .7s ease;overflow:hidden}
#__card.on{opacity:1}
#__card .glow{position:absolute;width:${V ? 520 : 900}px;height:${V ? 520 : 900}px;border-radius:50%;right:-180px;top:-200px;
  background:radial-gradient(circle,rgba(255,255,255,.08),transparent 65%)}
#__card .big{font-family:"Instrument Serif",Georgia,serif;color:#f5f5f4;font-size:${V ? 54 : 96}px;line-height:.98;letter-spacing:-.01em}
#__card .big em{color:rgba(245,245,244,.55)}
#__card .k{font-size:${V ? 11 : 14}px;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:${V ? 18 : 26}px}
#__card .s{font-size:${V ? 16 : 24}px;color:rgba(255,255,255,.72);margin-top:${V ? 20 : 30}px;line-height:1.45;max-width:900px}
#__card ul{list-style:none;padding:0;margin:${V ? '26px 0 0' : '38px 0 0'};display:grid;gap:${V ? 12 : 16}px}
#__card li{font-size:${V ? 16 : 24}px;color:#f5f5f4;display:flex;gap:12px;align-items:center}
#__card li b{width:${V ? 8 : 10}px;height:${V ? 8 : 10}px;border-radius:50%;background:#f5f5f4;flex:none}
#__card .cta{margin-top:${V ? 34 : 50}px;display:inline-flex;align-self:flex-start;gap:12px;align-items:center;background:#f5f5f4;color:#0a0a0a;
  border-radius:999px;padding:${V ? '14px 22px' : '20px 34px'};font-size:${V ? 17 : 26}px;font-weight:600}
#__card .foot{position:absolute;${V ? 'left:34px;bottom:46px' : 'left:160px;bottom:70px'};font-size:${V ? 12 : 16}px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45)}
</style>
<div id="__card"></div>
<div id="__cap"><div class="k"></div><div class="t"></div><div class="s"></div></div>
<svg id="__cur" viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.6 4.2 7.4-2.9 1.6-4.2-7.4L4 19z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
      document.documentElement.appendChild(r);
      const cur = r.querySelector('#__cur');
      const pos = window.__curPos || { x: innerWidth * 0.62, y: innerHeight * 0.55 };
      cur.style.transform = `translate(${pos.x}px,${pos.y}px)`;
      document.addEventListener('mousemove', (e) => {
        window.__curPos = { x: e.clientX, y: e.clientY };
        cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      }, true);
      return r;
    },
    caption(k, t, s) {
      const c = this.root().querySelector('#__cap');
      c.querySelector('.k').innerHTML = k ? `<i></i>${k}` : '';
      c.querySelector('.t').innerHTML = t;
      c.querySelector('.s').innerHTML = s || '';
      c.classList.add('on');
    },
    hide() { this.root().querySelector('#__cap').classList.remove('on'); },
    card(html) { const c = this.root().querySelector('#__card'); c.innerHTML = '<div class="glow"></div>' + html; c.classList.add('on'); },
    cardOff() { this.root().querySelector('#__card').classList.remove('on'); },
    ripple(x, y) {
      const d = document.createElement('div'); d.className = '__rip'; d.style.left = x + 'px'; d.style.top = y + 'px';
      this.root().appendChild(d); setTimeout(() => d.remove(), 800);
    },
  };
  document.addEventListener('DOMContentLoaded', () => window.__ov.root());
};

(async () => {
  fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
  // renderização em alta densidade: os quadros do screencast saem na resolução final (ex.: 1080×1920)
  const browser = await chromium.launch({ args: [`--force-device-scale-factor=${cfg.deviceScaleFactor}`] });
  const ctx = await browser.newContext({
    viewport: cfg.viewport, deviceScaleFactor: cfg.deviceScaleFactor, isMobile: cfg.isMobile, hasTouch: cfg.hasTouch,
    locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'no-preference',
  });
  // Segurança: qualquer escrita (POST/PUT/PATCH/DELETE) é bloqueada — o vídeo nunca confirma nada.
  await ctx.route('**/*', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  await ctx.addInitScript(overlayInit, MODE);
  const p = await ctx.newPage();
  p.setDefaultTimeout(20000);

  const ov = {
    caption: (k, t, s) => p.evaluate(([k, t, s]) => window.__ov.caption(k, t, s), [k, t, s]),
    hide: () => p.evaluate(() => window.__ov.hide()),
    card: (h) => p.evaluate((h) => window.__ov.card(h), h),
    cardOff: () => p.evaluate(() => window.__ov.cardOff()),
  };

  const settle = async () => {
    await p.waitForLoadState('domcontentloaded');
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.__ov.root(); });
  };

  // rolagem suave até um elemento (ou y absoluto)
  const scrollTo = async (target, dur = 1500, offset = MODE === 'v' ? 70 : 90) => {
    await p.evaluate(async ([target, dur, offset]) => {
      const el = typeof target === 'string' ? document.querySelector(target) : null;
      const goal = typeof target === 'number' ? target : el.getBoundingClientRect().top + scrollY - offset;
      const start = scrollY, d = Math.max(0, Math.min(goal, document.documentElement.scrollHeight - innerHeight)) - start;
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
    }, [target, dur, offset]);
  };

  // centraliza o elemento na tela com rolagem suave
  const reveal = async (loc, dur = 900) => {
    await loc.waitFor({ state: 'visible' });
    const y = await loc.evaluate((el) => el.getBoundingClientRect().top + scrollY - innerHeight * 0.42);
    await scrollTo(Math.max(0, y), dur, 0);
  };

  // move o cursor (desktop) ou mostra o toque (celular) e clica
  const press = async (loc) => {
    await reveal(loc, 700);
    const box = await loc.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (MODE === 'h') {
      await p.mouse.move(x, y, { steps: 38 });
      await sleep(260);
    }
    await p.evaluate(([x, y]) => window.__ov.ripple(x, y), [x, y]);
    await sleep(220);
    if (MODE === 'v') await loc.tap(); else await loc.click();
  };

  /* ---------- gravação via screencast (frames nítidos) ---------- */
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const f = path.join(OUT, 'frames', `f${String(n++).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });

  /* ---------- roteiro ---------- */
  await p.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await settle();
  await p.evaluate(() => scrollTo(0, 0));
  if (MODE === 'h') await p.mouse.move(cfg.viewport.width * 0.62, cfg.viewport.height * 0.55);
  await ov.card(`
    <div class="k">Exemplo real · Clube da Navalha</div>
    <div class="big">Sua barbearia<br/><em>com agendamento online.</em></div>
    <div class="s">Um site próprio, elegante e rápido — onde o cliente escolhe o serviço, o barbeiro e o horário sozinho.</div>`);
  await sleep(900);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: cfg.W, maxHeight: cfg.H, everyNthFrame: 1 });
  const t0 = Date.now();

  await sleep(3600);
  await ov.cardOff();
  await sleep(900);
  await ov.caption('Site próprio', 'Com a <em>cara da sua barbearia.</em>', 'Mostra na hora se está aberto e já leva o cliente para agendar.');
  await sleep(3400);
  await ov.hide();

  await scrollTo('#sobre', 1600);
  await ov.caption('Apresentação', 'Seu espaço e <em>seu diferencial.</em>', 'Hora marcada, profissionais especializados, cuidado em cada detalhe.');
  await sleep(3000);
  await ov.hide();

  await scrollTo('#servicos', 1600);
  await ov.caption('Serviços', 'Preço e duração <em>de cada serviço.</em>', 'O cliente já chega sabendo quanto vai pagar.');
  await sleep(1200);
  if (MODE === 'v') await scrollTo((await p.evaluate(() => scrollY)) + 420, 2200, 0);
  await sleep(2200);
  await ov.hide();

  await scrollTo('#profissionais', 1600);
  await ov.caption('Equipe', 'Cada barbeiro com <em>sua especialidade.</em>', 'O cliente escolhe com quem quer cortar.');
  await sleep(1200);
  if (MODE === 'v') await scrollTo((await p.evaluate(() => scrollY)) + 520, 2400, 0);
  await sleep(2000);
  await ov.hide();

  await scrollTo('#contato', 1500);
  await ov.caption('Funcionamento', 'Horários <em>sempre à vista.</em>', 'Dias, horários e endereço em um só lugar.');
  await sleep(3000);
  await ov.hide();

  // ---- agendamento ----
  await scrollTo(0, 1500, 0);
  await sleep(400);
  await ov.caption('Agendamento online', 'Em <em>4 passos,</em> sem ligação.', 'Funciona 24 horas — inclusive com a barbearia fechada.');
  await sleep(1800);
  const cta = p.getByRole('link', { name: /Agendar horário/ }).first();
  await press(cta);
  await p.waitForURL('**/agendar**');
  await settle();
  await sleep(1400);
  await ov.caption('Passo 1', 'O cliente escolhe <em>o serviço.</em>', '');
  await sleep(1600);
  await press(p.getByRole('button', { name: /Corte \+ Barba/ }));
  await sleep(1300);
  await ov.caption('Passo 2', 'Escolhe <em>o barbeiro</em>', 'ou deixa o sistema achar o primeiro horário livre.');
  await sleep(2200);
  await press(p.getByRole('button', { name: /Rafael/ }).first());
  await sleep(1300);
  await ov.caption('Passo 3', 'Só aparecem <em>horários livres.</em>', 'Nada de horário duplicado na agenda.');
  await sleep(1600);
  // próximo dia disponível depois de hoje
  const radios = p.getByRole('radio');
  const count = await radios.count();
  let day = null;
  for (let i = 1; i < count; i++) {
    const r = radios.nth(i);
    if ((await r.getAttribute('aria-disabled')) !== 'true' && !(await r.isDisabled())) { day = r; break; }
  }
  await press(day);
  await sleep(1400);
  const times = p.getByRole('button', { name: /^\d{1,2}:\d{2}$/ });
  const tcount = await times.count();
  let slot = times.nth(Math.min(4, tcount - 1));
  for (let i = 0; i < tcount; i++) if ((await times.nth(i).innerText()).trim() === '10:00') { slot = times.nth(i); break; }
  await press(slot);
  await sleep(1300);
  await scrollTo(0, 600, 0);
  await ov.caption('Passo 4', 'Resumo com <em>dia, serviço e valor.</em>', 'O cliente confirma com nome e telefone — e o horário entra na agenda.');
  await sleep(1500);
  if (MODE === 'v') await scrollTo((await p.evaluate(() => scrollY)) + 300, 1800, 0);
  await sleep(2600);
  await ov.hide();
  await sleep(500);

  await ov.card(`
    <div class="k">Para barbearias</div>
    <div class="big">Quer um site assim<br/><em>para a sua barbearia?</em></div>
    <ul>
      <li><b></b>Agendamento online 24h</li>
      <li><b></b>Sua barbearia aparecendo no Google</li>
      <li><b></b>Serviços, preços e equipe sempre atualizados</li>
    </ul>
    <div class="cta">${CONTACT}</div>
    <div class="foot">${BRAND}</div>`);
  await sleep(5200);

  const tEnd = Date.now();
  await cdp.send('Page.stopScreencast');
  await sleep(300);
  await browser.close();

  // lista de quadros com duração real (o screencast só emite quadro quando a tela muda)
  frames.sort((a, b) => a.t - b.t);
  const lastT = frames[0].t + (tEnd - t0) / 1000;
  let list = '';
  frames.forEach((fr, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : lastT;
    list += `file '${fr.f}'\nduration ${Math.max(0.001, next - fr.t).toFixed(4)}\n`;
  });
  list += `file '${frames[frames.length - 1].f}'\n`;
  fs.writeFileSync(path.join(OUT, 'list.txt'), list);
  console.log(`quadros: ${frames.length} · duração: ${((tEnd - t0) / 1000).toFixed(1)}s`);
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });
