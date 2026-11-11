/* Clube da Navalha — composição do vídeo comercial v2.
 * Tudo é função do tempo: window.renderFrame(t) desenha o quadro exato (determinístico).
 * Dados: ../roteiro/timeline.json (falas, cortes, efeitos) e ../clips/*.json (toques reais).
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

/* ---------- CENA 1: notificações (dramatização genérica, não é a tela do sistema) ---------- */
const NOTIFS = [
  [2.15, 'Rafa', 'Fala! Tem horário hoje?'],
  [2.75, 'Cliente', 'Consegue me encaixar às 18h?'],
  [3.35, 'Gui', 'Quanto tá o corte + barba?'],
  [3.95, 'Marcos', 'Tem vaga sábado de manhã?'],
  [4.5, 'Pedro', 'Oi?? Conseguiu ver?'],
  [5.0, 'Lucas', 'Amanhã às 9h tá livre?'],
  [5.5, 'Thiago', 'Dá pra trocar meu horário?'],
  [6.0, 'André', 'Vou passar aí, tem fila?'],
];
const VIBRA = [2.1, 3.9, 5.9];
const P = { W: 600, H: 1240, left: 240, top: 640 };

function initProblem() {
  const ph = $('p-phone');
  ph.style.width = `${P.W}px`; ph.style.height = `${P.H}px`;
  $('p-screen').style.cssText += `width:${P.W}px;height:${P.H}px`;
  $('p-frame').style.cssText += `width:${P.W + 52}px;height:${P.H + 52}px`;
  $('notifs').innerHTML = NOTIFS.map(([, de, msg]) => `
    <div class="notif"><div class="ic">${ICON_CHAT}</div><div class="b">
      <div class="top"><span>Mensagens</span><span>agora</span></div>
      <div class="de">${de}</div><div class="msg">${msg}</div></div></div>`).join('');
  buildWords($('t-p1'), [{ text: 'NO MEIO' }, { text: 'DO CORTE...' }]);
  buildWords($('t-p2'), [{ text: 'E O CELULAR' }, { text: '!NÃO! !PARA.!' }]);
  buildWords($('t-p3'), [{ text: 'QUERENDO *HORÁRIO*,' }, { text: 'PEDINDO *ENCAIXE*...', delay: 0.75 }]);
  buildWords($('t-p4'), [{ text: 'VOCÊ !PARA! !TUDO!' }, { text: 'PRA RESPONDER.' }]);
  ph._cards = [...$('notifs').children];
}

function renderProblem(t) {
  const L = $('s-prob');
  show(L, t < 8.4);
  if (t >= 8.4) return;
  // cortes dinâmicos: "soco" de câmera em cada frase + aproximação final com tensão
  let s = 1;
  for (const tc of [1.95, 3.35, 5.75]) if (t >= tc) s += 0.07 * Math.exp(-(t - tc) * 6);
  s += 0.12 * E.inOut(prog(t, 5.75, 8.0));
  const out = E.inOut(prog(t, 7.75, 8.35));
  s += out * 0.5;
  L.style.transform = `scale(${s.toFixed(4)})`;
  L.style.transformOrigin = '50% 62%';
  L.style.opacity = (1 - prog(t, 8.1, 8.35)).toFixed(3);
  L.style.filter = out > 0 ? `blur(${(out * 18).toFixed(1)}px)` : '';
  $('tint').style.background = `rgba(255,40,50,${(0.16 * E.inOut(prog(t, 5.75, 7.6)) * (1 - out)).toFixed(3)})`;

  // cartão "corte em andamento"
  const busy = $('busy');
  const kb = 1; // visível desde o 1º quadro (capa)
  const kbOut = E.inOut(prog(t, 1.85, 2.35));
  show(busy, kbOut < 1);
  busy.style.opacity = (kb * (1 - kbOut)).toFixed(3);
  busy.style.transform = `translateY(${((1 - kb) * 40 + kbOut * 260).toFixed(1)}px) scale(${lerp(0.94, 1, kb) * lerp(1, 0.9, kbOut)})`;
  const sec = 23 + Math.floor(t);
  $('cronometro').textContent = `00:${String(sec).padStart(2, '0')}`;
  const a = Math.sin(t * 14) * 11;
  $('lamina1').setAttribute('transform', `rotate(${a} 8 12)`);
  $('lamina2').setAttribute('transform', `rotate(${-a} 8 12)`);

  // celular com notificações
  const ph = $('p-phone');
  const kp = E.out(prog(t, 1.75, 2.3));
  let shake = 0;
  for (const tv of VIBRA) if (t >= tv && t < tv + 0.6) shake += Math.sin((t - tv) * 70) * 16 * Math.exp(-(t - tv) * 7);
  show(ph, kp > 0);
  ph.style.transform = `translate(${(P.left + shake).toFixed(1)}px, ${(P.top + (1 - kp) * 900).toFixed(1)}px) rotate(${(shake * 0.08).toFixed(2)}deg)`;
  let visible = 0;
  ph._cards.forEach((card, j) => {
    const tj = NOTIFS[j][0];
    if (t < tj) { card.style.opacity = 0; return; }
    visible++;
    let push = 0;
    NOTIFS.forEach(([ti], i) => { if (i > j && t >= ti) push += E.out(prog(t, ti, ti + 0.3)); });
    const k = E.back(prog(t, tj, tj + 0.35));
    card.style.opacity = prog(t, tj, tj + 0.15).toFixed(3);
    card.style.top = `${(380 + push * 168).toFixed(1)}px`;
    card.style.transform = `translateY(${((1 - k) * -50).toFixed(1)}px) scale(${lerp(0.88, 1, k).toFixed(3)})`;
  });
  const badge = $('badge');
  show(badge, visible > 0);
  badge.textContent = visible;
  const lastT = NOTIFS[Math.max(0, visible - 1)][0];
  badge.style.transform = `scale(${(1 + 0.35 * Math.exp(-(t - lastT) * 9)).toFixed(3)})`;

  animWords($('t-p1'), t, -0.6, 1.8); // já completo no 1º quadro (capa do WhatsApp)
  animWords($('t-p2'), t, 1.95, 3.2);
  animWords($('t-p3'), t, 3.35, 5.6);
  animWords($('t-p4'), t, 5.75, 8.0, { exit: 0.01 });
}

/* ---------- CENA 2: solução ---------- */
function initSolution() {
  buildWords($('t-s1a'), [{ text: 'E SE SEUS CLIENTES' }]);
  buildWords($('t-s1b'), [{ text: '*AGENDASSEM*' }]);
  buildWords($('t-s1c'), [{ text: 'SOZINHOS?' }]);
  buildWords($('t-s2a'), [{ text: 'SEU *SITE PRÓPRIO*' }]);
  $('t-s2b').textContent = 'com agendamento online';
}

function renderSolution(t) {
  const L = $('s-sol');
  show(L, t >= 8.3 && t < 15.9);
  if (t < 8.3 || t >= 15.9) return;
  animWords($('t-s1a'), t, 8.5, 12.95);
  animWords($('t-s1b'), t, 9.85, 12.95, { pop: true, dy: 40 });
  animWords($('t-s1c'), t, 10.5, 12.95, { pop: true, dy: 40 });
  fadeUp($('t-s1d'), t, 11.25, 12.95, { pop: true });
  fadeUp($('t-s1e'), t, 11.95, 12.95, { pop: true });
  // revelação da marca
  const kl = fadeUp($('logo-wrap'), t, 13.25, 15.0, { pop: true, dy: 0 });
  animWords($('t-s2a'), t, 13.85, 15.0);
  fadeUp($('t-s2b'), t, 14.4, 15.0);
  // camada inteira sobe quando o celular entra
  const up = E.inOut(prog(t, 14.95, 15.5));
  L.style.transform = `translateY(${(-up * 160).toFixed(1)}px)`;
  L.style.opacity = (1 - prog(t, 15.0, 15.3)).toFixed(3);
  void kl;
}

/* ---------- CENA 3: demonstração real ---------- */
const D = { W: 900, H: 1600, k: 900 / 1080, x0: 90, y0: 640, cy: 1150 };
let CAM = [], MARKS = [], CAPS = [];

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

  // eventos reais → tempo do vídeo
  const evs = [];
  for (const seg of TL.trechos_gravacao) {
    for (const ev of CLIPS[seg.clip].events) {
      if (ev.t >= seg.de && ev.t <= seg.ate) evs.push({ ...ev, tc: compTime(seg, ev.t), segFim: compTime(seg, seg.ate) });
    }
  }
  evs.sort((a, b) => a.tc - b.tc);

  // destaques (anel + toque) dentro da tela, acompanhando o zoom
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
    const hold = ev.label === 'botao-criar' ? 41.3 - ev.tc : ev.type === 'focus' ? 1.5 : 0.45;
    MARKS.push({ ev, r, rp, hold });
  });

  // câmera: posição neutra + zoom no ponto de cada toque
  const N = (t) => ({ t, s: 1, f: null });
  const F = (t, s, x, y) => ({ t, s, f: [x, y] });
  CAM = [N(14.9), N(15.6), F(17.9, 1.06, 540, 760), F(18.6, 1.2, 540, 1000), F(22.5, 1.22, 540, 1050)];
  CAM.push(N(22.69), F(22.7, 1.08, 540, 900));
  let last = 22.7;
  evs.forEach((ev, i) => {
    const cx = ev.box.x + ev.box.w / 2, cyy = ev.box.y + ev.box.h / 2;
    const z = ev.label === 'valor' ? 1.42 : ev.label === 'botao-criar' ? 1.26 : ev.type === 'focus' ? 1.26 : 1.32;
    const tIn = Math.max(last + 0.05, ev.tc - 0.55);
    CAM.push(F(tIn, 1.12, cx * 0.4 + 540 * 0.6, cyy));
    CAM.push(F(ev.tc - 0.08, z, cx * 0.55 + 540 * 0.45, cyy));
    const next = evs[i + 1];
    const hold = ev.label === 'botao-criar' ? 41.0 : ev.tc + (ev.type === 'focus' ? 1.3 : 0.75);
    CAM.push(F(hold, z, cx * 0.55 + 540 * 0.45, cyy));
    if (!next || next.tc - hold > 1.4) CAM.push(F(hold + 0.6, 1.1, 540, cyy));
    last = hold + 0.6;
    if (ev.label === 'criar-conta') { CAM.push(F(35.49, 1.1, 540, cyy)); CAM.push(F(35.5, 1.1, 540, 500)); last = 35.5; }
  });
  CAM.push(N(41.45));
  CAM.sort((a, b) => a.t - b.t);

  // legendas da demonstração
  const C = (t0, t1, chip, title, sub) => ({ t0, t1, chip, title, sub });
  CAPS = [
    C(15.6, 18.15, 'Site próprio', 'SUA BARBEARIA *ONLINE*', 'Página própria, rápida e pronta para o celular'),
    C(18.25, 22.62, 'Serviços', 'PREÇOS *À VISTA*', 'Valor e duração de cada serviço'),
    C(22.7, 24.9, 'Passo 1 de 4', 'ESCOLHE O *SERVIÇO*', ''),
    C(24.95, 26.75, 'Passo 2 de 4', 'ESCOLHE O *BARBEIRO*', ''),
    C(26.8, 31.0, 'Passo 3 de 4', 'SÓ *HORÁRIOS LIVRES*', 'Nada de horário duplicado'),
    C(31.1, 35.42, 'Passo 4 de 4', 'CONFERE O *RESUMO*', 'Dia, horário, profissional e valor'),
    C(35.5, 41.25, 'Cadastro', 'CONFIRMA COM *NOME E CELULAR*', 'Sem e-mail. Sem código.'),
  ];
  const host = $('d-cap');
  CAPS.forEach((c) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;right:0;top:0;text-align:center';
    d.innerHTML = `<div class="chamada chip"><i></i>${c.chip}</div>
      <div class="titulo" style="font-size:108px;margin-top:26px"></div>
      ${c.sub ? `<div class="apoio" style="font-size:40px;margin-top:20px;color:#d6d6d6">${c.sub}</div>` : ''}`;
    host.appendChild(d);
    c.el = d;
    c.chipEl = d.children[0];
    c.titleEl = d.children[1];
    c.subEl = c.sub ? d.children[2] : null;
    buildWords(c.titleEl, [{ text: c.title }]);
  });
}

function camAt(t) {
  let a = CAM[0], b = CAM[CAM.length - 1];
  for (let i = 0; i < CAM.length - 1; i++) if (t >= CAM[i].t && t <= CAM[i + 1].t) { a = CAM[i]; b = CAM[i + 1]; break; }
  if (t < CAM[0].t) b = a;
  const k = b.t > a.t ? E.inOut(prog(t, a.t, b.t)) : 1;
  const P = (c) => (c.f
    ? { s: c.s, tx: 540 - c.s * c.f[0] * D.k, ty: D.cy - c.s * c.f[1] * D.k }
    : { s: c.s, tx: D.x0, ty: D.y0 });
  const pa = P(a), pb = P(b);
  // não deixa a tela "descolar" para baixo da área de legenda
  const r = { s: lerp(pa.s, pb.s, k), tx: lerp(pa.tx, pb.tx, k), ty: lerp(pa.ty, pb.ty, k) };
  r.ty = Math.min(r.ty, D.y0 + 40);
  return r;
}

const imgCache = { src: null };
async function renderDemo(t) {
  const L = $('s-demo');
  const on = t >= 14.85 && t < 41.75;
  show(L, on);
  if (!on) return;
  // entrada (celular sobe) e saída (encolhe para os benefícios)
  const rise = E.out(prog(t, 15.05, 15.8));
  const outK = E.inOut(prog(t, 41.2, 41.7));
  L.style.opacity = (1 - outK).toFixed(3);
  L.style.transform = `scale(${lerp(1, 0.85, outK).toFixed(3)})`;
  L.style.transformOrigin = '50% 60%';

  const c = camAt(t);
  const ty = c.ty + (1 - rise) * 1350;
  $('d-phone').style.transform = `translate(${c.tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${c.s.toFixed(4)})`;

  // quadro real da gravação
  const seg = segAt(t);
  const tt = t < seg.inicio ? seg.de : seg.de + (t - seg.inicio) * seg.velocidade;
  const meta = CLIPS[seg.clip];
  const fi = clamp(Math.round(Math.min(tt, seg.ate) * 30) + 1, 1, meta.frames);
  const src = `../clips/${seg.clip}/${String(fi).padStart(4, '0')}.jpg`;
  const img = $('clip');
  if (imgCache.src !== src) {
    img.src = src;
    imgCache.src = src;
    await img.decode().catch(() => {});
  }
  // brilho rápido nos cortes de gravação
  let cut = 0;
  for (const tc of [22.7, 35.5]) if (t >= tc && t < tc + 0.25) cut = 1 - (t - tc) / 0.25;
  img.style.filter = cut > 0 ? `brightness(${(1 + cut * 0.9).toFixed(2)})` : '';

  // destaques
  for (const m of MARKS) {
    const te = m.ev.tc;
    const a0 = te - 0.32, a1 = te + m.hold;
    // some ao fim do trecho de gravação (não vaza para a cena seguinte)
    if (t < a0 || t > a1 + 0.3 || t >= m.ev.segFim) { m.r.style.opacity = 0; if (m.rp) m.rp.style.opacity = 0; continue; }
    const kin = E.back(prog(t, a0, a0 + 0.3));
    const kout = prog(t, a1, a1 + 0.3);
    const pulse = m.ev.label === 'botao-criar' ? 1 + 0.03 * Math.sin((t - te) * 7) : 1;
    m.r.style.opacity = (prog(t, a0, a0 + 0.15) * (1 - kout)).toFixed(3);
    m.r.style.transform = `scale(${(lerp(1.18, 1, kin) * pulse).toFixed(3)})`;
    if (m.rp) {
      const kr = prog(t, te, te + 0.6);
      m.rp.style.opacity = t >= te ? (1 - kr).toFixed(3) : 0;
      m.rp.style.transform = `scale(${lerp(0.4, 2.4, E.out(kr)).toFixed(3)})`;
    }
  }

  // legendas
  for (const cp of CAPS) {
    const vis = t >= cp.t0 - 0.01 && t <= cp.t1 + 0.3;
    show(cp.el, vis);
    if (!vis) continue;
    fadeUp(cp.chipEl, t, cp.t0, cp.t1, { pop: true, dy: 20 });
    animWords(cp.titleEl, t, cp.t0 + 0.08, cp.t1, { stagger: 0.06, dy: 70 });
    if (cp.subEl) fadeUp(cp.subEl, t, cp.t0 + 0.35, cp.t1, { dy: 30 });
  }
}

/* ---------- CENA 4: benefícios ---------- */
function initBenefits() {
  document.querySelectorAll('.ben .ck').forEach((c) => (c.innerHTML = ICON_CHECK));
}
function renderBenefits(t) {
  const L = $('s-ben');
  show(L, t >= 41.3 && t < 47.8);
  if (t < 41.3 || t >= 47.8) return;
  L.style.opacity = (prog(t, 41.3, 41.7) * (1 - prog(t, 47.25, 47.55))).toFixed(3);
  $('ben-bg').style.transform = `scale(${lerp(1, 1.08, prog(t, 41.3, 47.8)).toFixed(4)})`;
  fadeUp($('ben-k'), t, 41.6, 47.2, { dy: 30 });
  [42.0, 43.2, 44.4, 45.6].forEach((t0, i) => {
    const el = $(`ben${i + 1}`);
    const k = fadeUp(el, t, t0, 47.2, { dx: -80, dy: 0 });
    const ck = el.querySelector('.ck');
    ck.style.transform = `scale(${lerp(0.3, 1, E.back(prog(t, t0 + 0.05, t0 + 0.45))).toFixed(3)})`;
    void k;
  });
}

/* ---------- CENA 5: conversão ---------- */
function initCta() {
  buildWords($('c-a'), [{ text: 'SUA BARBEARIA MERECE' }, { text: 'UM ATENDIMENTO' }]);
  buildWords($('c-b'), [{ text: '*MAIS PROFISSIONAL.*' }]);
  $('c-c').innerHTML = 'Tenha um site próprio para sua barbearia<br>com o <b style="color:#fff;font-weight:800">Clube da Navalha</b>.';
  $('fone').textContent = CONTATO;
  document.querySelector('.contato .ic').innerHTML = ICON_CHAT;
}
function renderCta(t) {
  const L = $('s-cta');
  show(L, t >= 47.45);
  if (t < 47.45) return;
  animWords($('c-a'), t, 48.05, 99, { stagger: 0.09 });
  animWords($('c-b'), t, 49.55, 99, { pop: true, dy: 40, stagger: 0.12 });
  fadeUp($('c-c'), t, 50.6, 99, { dy: 40 });
  const kb = fadeUp($('c-d'), t, 51.1, 99, { pop: true, dy: 30 });
  const btn = $('cta-btn');
  btn.style.transform = `scale(${(1 + 0.025 * Math.sin(Math.max(0, t - 51.6) * 5) * prog(t, 51.6, 52)).toFixed(4)})`;
  const sh = ((t - 51.35) % 1.8) / 0.7;
  $('shine').style.left = t > 51.35 && sh <= 1 ? `${lerp(-160, 760, sh)}px` : '-300px';
  fadeUp($('c-e'), t, 51.45, 99, { dy: 30 });
  fadeUp($('c-f'), t, 51.75, 99, { dy: 50 });
  fadeUp($('c-g'), t, 52.3, 99, { dy: 30 });
  void kb;
}

/* ---------- global ---------- */
function renderGlobal(t) {
  // flash branco nos impactos
  let fl = 0;
  for (const [tc, a] of [[8.35, 0.85], [13.25, 0.5], [47.5, 0.45]]) if (t >= tc - 0.06 && t < tc + 0.45) fl = Math.max(fl, a * (t < tc ? (t - tc + 0.06) / 0.06 : 1 - (t - tc) / 0.45));
  $('flash').style.opacity = clamp(fl).toFixed(3);
  // brilho do fundo aumenta depois da virada
  const g = prog(t, 8.35, 9.5);
  $('bg').style.filter = `brightness(${lerp(0.75, 1.15, g).toFixed(3)})`;
}

window.renderFrame = async (t) => {
  renderGlobal(t);
  renderProblem(t);
  renderSolution(t);
  await renderDemo(t);
  renderBenefits(t);
  renderCta(t);
};

window.ready = (async () => {
  TL = await (await fetch('../roteiro/timeline.json')).json();
  for (const c of ['site', 'agendamento']) CLIPS[c] = await (await fetch(`../clips/${c}.json`)).json();
  initProblem(); initSolution(); initDemo(); initBenefits(); initCta();
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : i.decode().catch(() => {}))));
  return true;
})();
