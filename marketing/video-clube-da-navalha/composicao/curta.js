/* Clube da Navalha — composição do vídeo CURTO (primeiro contato, ~23 s).
 * Mesmo princípio da versão longa: window.renderFrame(t) desenha o quadro exato.
 * Dados: ../roteiro/timeline-curta.json e ../clips/*.json (telas e toques reais).
 * Os tempos abaixo seguem o começo de cada frase da narração (audio/vo_curta_*.wav).
 */
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: (k) => 1 - Math.pow(1 - k, 3),
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: (k) => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  expo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
};

const CONTATO = 'WhatsApp (47) 98919-1953';
const ICON_CHAT = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 3C7 3 3 6.6 3 11c0 2.3 1.1 4.4 2.9 5.9L5 21l4.3-2.2c.9.2 1.8.3 2.7.3 5 0 9-3.6 9-8s-4-8-9-8z"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

let TL, CLIPS = {};

/* ---------- texto animado palavra por palavra ----------
 * linhas: ["E O CELULAR", "!NÃO! !PARA.!"]  *palavra* = amarelo, !palavra! = vermelho
 * cada linha pode ter atraso próprio (segundos depois do início). */
function buildWords(el, lines) {
  el.innerHTML = lines.map((ln) => {
    let mode = null; // destaque que atravessa várias palavras: *SITE PRÓPRIO*
    return ln.text.split(' ').map((w) => {
      let cls = 'w';
      const start = w[0];
      if (!mode && (start === '*' || start === '!')) { mode = start; w = w.slice(1); }
      const cur = mode;
      if (mode && new RegExp(`\\${mode}[.,?!…]*$`).test(w)) { w = w.replace(new RegExp(`\\${mode}(?=[.,?!…]*$)`), ''); mode = null; }
      if (cur === '*') cls += ' hl';
      if (cur === '!') cls += ' hl-red';
      return `<span class="${cls}" data-d="${ln.delay || 0}">${w}</span>`;
    }).join(' ');
  }).join('<br>');
  el._words = [...el.querySelectorAll('.w')];
}

function animWords(el, t, t0, t1, o = {}) {
  const stagger = o.stagger ?? 0.07, dur = o.dur ?? 0.38, dy = o.dy ?? 90, exit = o.exit ?? 0.28;
  if (t < t0 - 0.01 || t > t1 + exit + 0.02) { el.style.display = 'none'; return; }
  el.style.display = '';
  const ke = E.inOut(prog(t, t1, t1 + exit));
  el._words.forEach((w, i) => {
    const s = t0 + Number(w.dataset.d) + i * stagger;
    const k = (o.pop ? E.back : E.out)(prog(t, s, s + dur));
    const y = (1 - k) * dy - ke * 70;
    const sc = o.pop ? lerp(0.6, 1, k) : 1;
    w.style.opacity = (prog(t, s, s + dur * 0.6) * (1 - ke)).toFixed(3);
    w.style.transform = `translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
  });
}

function fadeUp(el, t, t0, t1, o = {}) {
  const exit = o.exit ?? 0.28;
  if (t < t0 - 0.01 || t > t1 + exit + 0.02) { el.style.display = 'none'; return 0; }
  el.style.display = '';
  const k = (o.pop ? E.back : E.out)(prog(t, t0, t0 + (o.dur ?? 0.45)));
  const ke = E.inOut(prog(t, t1, t1 + exit));
  const sc = o.pop ? lerp(0.55, 1, k) : 1;
  el.style.opacity = (prog(t, t0, t0 + 0.25) * (1 - ke)).toFixed(3);
  el.style.transform = `translate(${(o.dx ?? 0) * (1 - k)}px, ${((o.dy ?? 60) * (1 - k) - ke * 60).toFixed(1)}px) scale(${sc.toFixed(3)})`;
  return k;
}

function show(el, on) { el.style.display = on ? '' : 'none'; }

/* ---------- 1: gancho — notificações (dramatização genérica, não é a tela do sistema) ---------- */
const NOTIFS = [
  [-1.2, 'Rafa', 'Fala! Tem horário hoje?'],
  [-0.6, 'Cliente', 'Consegue me encaixar às 18h?'],
  [0.45, 'Gui', 'Quanto tá o corte + barba?'],
  [0.8, 'Marcos', 'Tem vaga sábado de manhã?'],
  [1.15, 'Pedro', 'Oi?? Conseguiu ver?'],
  [1.5, 'Lucas', 'Amanhã às 9h tá livre?'],
  [1.85, 'Thiago', 'Dá pra trocar meu horário?'],
  [2.2, 'André', 'Vou passar aí, tem fila?'],
  [2.55, 'Bruno', 'Ainda tem horário hoje?'],
  [2.9, 'Felipe', 'Responde aí, por favor'],
  [3.25, 'Caio', 'Vou ver em outro lugar então'],
  [3.6, 'Diego', 'Tem como às 17h?'],
  [3.95, 'Vitor', 'Alô??'],
  [4.3, 'João', 'Deixa, já marquei em outra'],
];
const VIBRA = [0.4, 1.9, 3.5];
const P = { W: 600, H: 1240, left: 240, top: 790 };

function initProblem() {
  const ph = $('p-phone');
  ph.style.width = `${P.W}px`; ph.style.height = `${P.H}px`;
  $('p-screen').style.cssText += `width:${P.W}px;height:${P.H}px`;
  $('p-frame').style.cssText += `width:${P.W + 52}px;height:${P.H + 52}px`;
  $('notifs').innerHTML = NOTIFS.map(([, de, msg]) => `
    <div class="notif"><div class="ic">${ICON_CHAT}</div><div class="b">
      <div class="top"><span>Mensagens</span><span>agora</span></div>
      <div class="de">${de}</div><div class="msg">${msg}</div></div></div>`).join('');
  buildWords($('t-k1'), [{ text: 'AINDA MARCA HORÁRIO' }, { text: 'PELO *WHATSAPP*' }, { text: '!NO MEIO DO CORTE?!' }]);
  buildWords($('t-k2'), [{ text: 'QUANTOS CLIENTES' }, { text: '!DESISTEM!' }, { text: 'ESPERANDO VOCÊ?' }]);
  ph._cards = [...$('notifs').children];
}

function renderProblem(t) {
  const L = $('s-prob');
  show(L, t < 5.65);
  if (t >= 5.65) return;
  let s = 1;
  for (const tc of [1.99, 3.06]) if (t >= tc) s += 0.06 * Math.exp(-(t - tc) * 6);
  s += 0.1 * E.inOut(prog(t, 3.06, 5.3));
  const out = E.inOut(prog(t, 5.3, 5.62));
  s += out * 0.5;
  L.style.transform = `scale(${s.toFixed(4)})`;
  L.style.transformOrigin = '50% 62%';
  L.style.opacity = (1 - prog(t, 5.45, 5.62)).toFixed(3);
  L.style.filter = out > 0 ? `blur(${(out * 18).toFixed(1)}px)` : '';
  $('tint').style.background = `rgba(255,40,50,${(0.2 * E.inOut(prog(t, 3.0, 5.0)) * (1 - out)).toFixed(3)})`;

  const ph = $('p-phone');
  let shake = 0;
  for (const tv of VIBRA) if (t >= tv && t < tv + 0.6) shake += Math.sin((t - tv) * 70) * 16 * Math.exp(-(t - tv) * 7);
  ph.style.transform = `translate(${(P.left + shake).toFixed(1)}px, ${P.top}px) rotate(${(shake * 0.08).toFixed(2)}deg)`;
  let visible = 0;
  ph._cards.forEach((card, j) => {
    const tj = NOTIFS[j][0];
    if (t < tj) { card.style.opacity = 0; return; }
    visible++;
    let push = 0;
    NOTIFS.forEach(([ti], i) => { if (i > j && t >= ti) push += E.out(prog(t, ti, ti + 0.25)); });
    const k = E.back(prog(t, tj, tj + 0.3));
    card.style.opacity = prog(t, tj, tj + 0.12).toFixed(3);
    card.style.top = `${(380 + push * 168).toFixed(1)}px`;
    card.style.transform = `translateY(${((1 - k) * -50).toFixed(1)}px) scale(${lerp(0.88, 1, k).toFixed(3)})`;
  });
  const badge = $('badge');
  badge.textContent = visible;
  const lastT = NOTIFS[Math.max(0, visible - 1)][0];
  badge.style.transform = `scale(${(1 + 0.35 * Math.exp(-(t - lastT) * 9)).toFixed(3)})`;

  animWords($('t-k1'), t, -0.9, 2.85); // completo no 1º quadro (capa)
  animWords($('t-k2'), t, 3.06, 5.5, { exit: 0.01, stagger: 0.09 });
}

/* ---------- 2: virada ---------- */
function initSolution() {
  buildWords($('t-k3a'), [{ text: 'O CLIENTE AGENDA' }]);
  buildWords($('t-k3b'), [{ text: '*SOZINHO.*' }]);
}
function renderSolution(t) {
  const L = $('s-sol');
  show(L, t >= 5.55 && t < 8.9);
  if (t < 5.55 || t >= 8.9) return;
  fadeUp($('logo-wrap'), t, 5.72, 99, { pop: true, dy: 0, exit: 0 });
  $('logo').style.transform = `scale(${lerp(1, 1.06, prog(t, 6, 8.5)).toFixed(4)})`;
  animWords($('t-k3a'), t, 7.2, 99, { stagger: 0.07 });
  animWords($('t-k3b'), t, 7.5, 99, { pop: true, dy: 40 });
  const up = E.inOut(prog(t, 8.35, 8.8));
  L.style.transform = `translateY(${(-up * 200).toFixed(1)}px)`;
  L.style.opacity = (1 - prog(t, 8.4, 8.75)).toFixed(3);
}

/* ---------- 3: demonstração relâmpago (gravação real, acelerada) ---------- */
const D = { W: 900, H: 1600, k: 900 / 1080, x0: 90, y0: 640, cy: 1160 };
let CAM = [], MARKS = [], CAPS = [];
const T_DEMO = [8.35, 15.45];

function compTime(seg, tt) { return seg.inicio + (tt - seg.de) / seg.velocidade; }
function segAt(t) {
  const s = TL.trechos_gravacao;
  for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].inicio) return s[i];
  return s[0];
}

function initDemo() {
  $('d-screen').style.cssText += `width:${D.W}px;height:${D.H}px`;
  $('d-frame').style.cssText += `width:${D.W + 52}px;height:${D.H + 52}px`;
  $('clip').style.cssText += `width:${D.W}px;height:${D.H}px`;

  const segs = TL.trechos_gravacao;
  const evs = [];
  segs.forEach((seg, i) => {
    const fim = i + 1 < segs.length ? segs[i + 1].inicio : T_DEMO[1];
    for (const ev of CLIPS[seg.clip].events) if (ev.t >= seg.de && ev.t <= seg.ate) evs.push({ ...ev, tc: compTime(seg, ev.t), segFim: fim });
  });
  evs.sort((a, b) => a.tc - b.tc);

  const marks = $('marks');
  evs.forEach((ev) => {
    const r = document.createElement('div');
    r.className = 'ring';
    const pad = 10;
    Object.assign(r.style, {
      left: `${ev.box.x * D.k - pad}px`, top: `${ev.box.y * D.k - pad}px`,
      width: `${ev.box.w * D.k + pad * 2}px`, height: `${ev.box.h * D.k + pad * 2}px`,
    });
    marks.appendChild(r);
    let rp = null;
    if (ev.type === 'tap') {
      rp = document.createElement('div');
      rp.className = 'ripple';
      rp.style.left = `${(ev.box.x + ev.box.w / 2) * D.k}px`;
      rp.style.top = `${(ev.box.y + ev.box.h / 2) * D.k}px`;
      marks.appendChild(rp);
    }
    MARKS.push({ ev, r, rp, hold: ev.type === 'focus' ? 0.8 : 0.04 });
  });

  // câmera: acompanha cada toque real com zoom moderado (cortes rápidos)
  const N = (t) => ({ t, s: 1, f: null });
  const F = (t, s, x, y) => ({ t, s, f: [x, y] });
  CAM = [N(8.35), N(9.0), F(9.95, 1.08, 540, 900), N(10.0)];
  evs.forEach((ev, i) => {
    const fx = (ev.box.x + ev.box.w / 2) * 0.5 + 540 * 0.5, fy = ev.box.y + ev.box.h / 2;
    const z = ev.label === 'valor' ? 1.38 : 1.24;
    const prev = CAM[CAM.length - 1].t;
    CAM.push(F(Math.max(prev + 0.05, ev.tc - 0.28), z, fx, fy));
    const next = evs[i + 1];
    CAM.push(F(next ? Math.max(ev.tc + 0.05, next.tc - 0.45) : T_DEMO[1], z, fx, fy));
  });
  CAM.sort((a, b) => a.t - b.t);

  const C = (t0, t1, chip, title) => ({ t0, t1, chip, title });
  CAPS = [
    C(8.9, 9.95, 'Site próprio', 'NO AR *24 HORAS*'),
    C(10.0, 10.62, 'Escolhe', 'O *SERVIÇO*'),
    C(10.65, 11.42, 'Escolhe', 'O *BARBEIRO*'),
    C(11.45, 14.0, 'Escolhe', 'O *HORÁRIO LIVRE*'),
    C(14.05, 15.15, 'Pronto', '*MENOS DE 1 MINUTO*'),
  ];
  const host = $('d-cap');
  CAPS.forEach((c) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;right:0;top:0;text-align:center';
    d.innerHTML = `<div class="chamada chip"><i></i>${c.chip}</div><div class="titulo" style="font-size:120px;margin-top:24px"></div>`;
    host.appendChild(d);
    c.el = d; c.chipEl = d.children[0]; c.titleEl = d.children[1];
    buildWords(c.titleEl, [{ text: c.title }]);
  });
}

function camAt(t) {
  let a = CAM[0], b = CAM[CAM.length - 1];
  for (let i = 0; i < CAM.length - 1; i++) if (t >= CAM[i].t && t <= CAM[i + 1].t) { a = CAM[i]; b = CAM[i + 1]; break; }
  if (t < CAM[0].t) b = a;
  if (t > CAM[CAM.length - 1].t) a = b;
  const k = b.t > a.t ? E.inOut(prog(t, a.t, b.t)) : 1;
  const Pp = (c) => (c.f ? { s: c.s, tx: 540 - c.s * c.f[0] * D.k, ty: D.cy - c.s * c.f[1] * D.k } : { s: c.s, tx: D.x0, ty: D.y0 });
  const pa = Pp(a), pb = Pp(b);
  const r = { s: lerp(pa.s, pb.s, k), tx: lerp(pa.tx, pb.tx, k), ty: lerp(pa.ty, pb.ty, k) };
  r.ty = Math.min(r.ty, D.y0 + 40);
  return r;
}

const imgCache = { src: null };
async function renderDemo(t) {
  const L = $('s-demo');
  const on = t >= T_DEMO[0] && t < T_DEMO[1];
  show(L, on);
  if (!on) return;
  const rise = E.out(prog(t, 8.45, 9.0));
  const outK = E.inOut(prog(t, 15.1, 15.42));
  L.style.opacity = (1 - outK).toFixed(3);
  L.style.transform = `scale(${lerp(1, 1.25, outK).toFixed(3)})`;
  L.style.transformOrigin = '50% 60%';

  const c = camAt(t);
  $('d-phone').style.transform = `translate(${c.tx.toFixed(2)}px, ${(c.ty + (1 - rise) * 1350).toFixed(2)}px) scale(${c.s.toFixed(4)})`;

  const seg = segAt(t);
  const tt = t < seg.inicio ? seg.de : seg.de + (t - seg.inicio) * seg.velocidade;
  const meta = CLIPS[seg.clip];
  const fi = clamp(Math.round(Math.min(tt, seg.ate) * 30) + 1, 1, meta.frames);
  const src = `../clips/${seg.clip}/${String(fi).padStart(4, '0')}.jpg`;
  const img = $('clip');
  if (imgCache.src !== src) { img.src = src; imgCache.src = src; await img.decode().catch(() => {}); }
  let cut = 0;
  for (const tc of [10.0]) if (t >= tc && t < tc + 0.25) cut = 1 - (t - tc) / 0.25;
  img.style.filter = cut > 0 ? `brightness(${(1 + cut * 0.9).toFixed(2)})` : '';

  for (const m of MARKS) {
    const te = m.ev.tc, a0 = te - 0.22, a1 = te + m.hold;
    if (t < a0 || t > a1 + 0.25 || t >= m.ev.segFim) { m.r.style.opacity = 0; if (m.rp) m.rp.style.opacity = 0; continue; }
    const kin = E.back(prog(t, a0, a0 + 0.22));
    const kout = prog(t, a1, a1 + (m.rp ? 0.08 : 0.25));
    m.r.style.opacity = (prog(t, a0, a0 + 0.1) * (1 - kout)).toFixed(3);
    m.r.style.transform = `scale(${lerp(1.18, 1, kin).toFixed(3)})`;
    if (m.rp) {
      const kr = prog(t, te, te + 0.3);
      m.rp.style.opacity = t >= te ? (1 - kr).toFixed(3) : 0;
      m.rp.style.transform = `scale(${lerp(0.4, 2.4, E.out(kr)).toFixed(3)})`;
    }
  }

  for (const cp of CAPS) {
    const vis = t >= cp.t0 - 0.01 && t <= cp.t1 + 0.2;
    show(cp.el, vis);
    if (!vis) continue;
    fadeUp(cp.chipEl, t, cp.t0, cp.t1, { pop: true, dy: 20, dur: 0.3, exit: 0.15 });
    animWords(cp.titleEl, t, cp.t0 + 0.04, cp.t1, { stagger: 0.05, dy: 60, dur: 0.28, exit: 0.15, pop: true });
  }
}

/* ---------- 4: impacto — "sem ligação, sem mensagem, sem espera" ---------- */
const SEM = [15.42, 16.66, 17.93];
function renderImpact(t) {
  const L = $('s-ben');
  show(L, t >= 15.2 && t < 19.0);
  if (t < 15.2 || t >= 19.0) return;
  L.style.opacity = (prog(t, 15.2, 15.4) * (1 - prog(t, 18.75, 18.98))).toFixed(3);
  let shake = 0;
  for (const ts of SEM) if (t >= ts && t < ts + 0.4) shake += Math.sin((t - ts) * 60) * 14 * Math.exp(-(t - ts) * 10);
  L.style.transform = `translate(${shake.toFixed(1)}px, ${(shake * 0.5).toFixed(1)}px)`;
  $('ben-bg').style.transform = `scale(${lerp(1, 1.1, prog(t, 15.2, 19)).toFixed(4)})`;
  SEM.forEach((ts, i) => {
    const el = $(`sem${i + 1}`);
    if (t < ts - 0.02) { el.style.opacity = 0; return; }
    const k = E.out(prog(t, ts - 0.02, ts + 0.16));
    el.style.opacity = prog(t, ts - 0.02, ts + 0.06).toFixed(3);
    el.style.transform = `scale(${lerp(1.9, 1, k).toFixed(3)})`;
  });
}

/* ---------- 5: chamada ---------- */
function initCta() {
  buildWords($('c-a'), [{ text: 'QUER ISSO NA' }, { text: '*SUA BARBEARIA?*' }]);
  $('fone').textContent = CONTATO.replace('WhatsApp ', '');
  document.querySelector('.contato .ic').innerHTML = ICON_CHAT;
}
function renderCta(t) {
  const L = $('s-cta');
  show(L, t >= 18.85);
  if (t < 18.85) return;
  animWords($('c-a'), t, 19.06, 99, { stagger: 0.09, pop: true, dy: 50 });
  fadeUp($('c-d'), t, 20.6, 99, { pop: true, dy: 30, dur: 0.4 });
  $('cta-btn').style.transform = `scale(${(1 + 0.035 * Math.sin(Math.max(0, t - 21.0) * 6) * prog(t, 21.0, 21.3)).toFixed(4)})`;
  const sh = ((t - 20.75) % 1.4) / 0.6;
  $('shine').style.left = t > 20.75 && sh <= 1 ? `${lerp(-160, 860, sh)}px` : '-300px';
  fadeUp($('c-f'), t, 20.95, 99, { dy: 50 });
  fadeUp($('c-g'), t, 21.35, 99, { dy: 30 });
}

/* ---------- global ---------- */
function renderGlobal(t) {
  let fl = 0;
  for (const [tc, a] of [[5.6, 0.85], [15.42, 0.3], [16.66, 0.3], [17.93, 0.3], [19.0, 0.4]]) if (t >= tc - 0.06 && t < tc + 0.4) fl = Math.max(fl, a * (t < tc ? (t - tc + 0.06) / 0.06 : 1 - (t - tc) / 0.4));
  $('flash').style.opacity = clamp(fl).toFixed(3);
  if (t >= 5.65) $('tint').style.background = 'transparent';
  $('bg').style.filter = `brightness(${lerp(0.75, 1.15, prog(t, 5.6, 6.5)).toFixed(3)})`;
}

window.renderFrame = async (t) => {
  renderGlobal(t);
  renderProblem(t);
  renderSolution(t);
  await renderDemo(t);
  renderImpact(t);
  renderCta(t);
};

window.ready = (async () => {
  TL = await (await fetch('../roteiro/timeline-curta.json')).json();
  for (const c of ['site', 'agendamento']) CLIPS[c] = await (await fetch(`../clips/${c}.json`)).json();
  initProblem(); initSolution(); initDemo(); initCta();
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : i.decode().catch(() => {}))));
  return true;
})();
