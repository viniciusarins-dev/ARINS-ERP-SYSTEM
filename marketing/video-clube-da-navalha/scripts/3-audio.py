"""3) Trilha sonora + efeitos (sintetizados do zero, livres de direitos) e mixagem final.
Uso: python3 scripts/3-audio.py
Saída: audio/musica.wav, audio/efeitos.wav, audio/narracao.wav e audio/mix.wav (-14 LUFS)
"""
import json, os, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
T = json.load(open(os.path.join(ROOT, "roteiro", "timeline.json")))
DUR = T["duracao"]
N = int(DUR * SR)
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env(n, a, d, sustain=None):
    """ataque linear + decaimento exponencial"""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / d))
    return e


def saw(freq, sec, detune=0.0):
    t = t_axis(sec)
    ph = (t * freq * (1 + detune)) % 1.0
    return 2 * ph - 1


def note(n):  # MIDI → Hz
    return 440.0 * 2 ** ((n - 69) / 12)


def reverb(x, sec=1.6, mix=0.25):
    ir_t = t_axis(sec)
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 4.0)
    ir = lp(ir, 6000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return x * (1 - mix) + wet * mix * np.max(np.abs(x))


# ---------------- instrumentos ----------------
def kick():
    t = t_axis(0.45)
    f = 45 + 75 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s[: int(0.004 * SR)] += rng.standard_normal(int(0.004 * SR)) * 0.4
    return np.tanh(s * 1.6) * 0.9


def clap():
    n = int(0.25 * SR)
    s = rng.standard_normal(n)
    e = np.zeros(n)
    for k in range(3):  # três "palmas" rápidas
        i = int(k * 0.011 * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / (0.012 if k < 2 else 0.07))
    return bp(s, 900, 3800) * e * 0.55


def hat(open_=False):
    n = int((0.16 if open_ else 0.045) * SR)
    s = hp(rng.standard_normal(n), 7500, 4)
    return s * env(n, 0.001, 0.05 if open_ else 0.012) * 0.22


def pad_chord(notes, sec):
    x = np.zeros(int(sec * SR))
    for m in notes:
        for dt in (-0.006, 0.0, 0.007):
            x += saw(note(m), sec, dt)
    x = lp(x / (len(notes) * 3), 1400)
    n = len(x)
    a = int(0.35 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-int(0.25 * SR):] *= np.linspace(1, 0.2, int(0.25 * SR))
    return x * e


def pluck(m, sec=0.32):
    x = saw(note(m), sec) + 0.5 * saw(note(m + 12), sec)
    n = len(x)
    return lp(x, 2600) * env(n, 0.002, 0.11) * 0.35


def bass(m, sec):
    t = t_axis(sec)
    x = np.sin(2 * np.pi * note(m) * t) + 0.25 * np.sin(4 * np.pi * note(m) * t)
    n = len(x)
    e = np.minimum(1, t / 0.01) * np.exp(-t * 2.2)
    return np.tanh(x * 1.3) * e * 0.55


# ---------------- música ----------------
beat = 60 / 100  # 100 BPM
bar = beat * 4
music = np.zeros(N)
drums = np.zeros(N)
padbus = np.zeros(N)
side = np.zeros(N)  # envelope do kick para "pumping" no pad/baixo

prog = [  # Am – F – C – G (voicings)
    ([57, 60, 64], 45), ([53, 57, 60], 41), ([55, 60, 64], 48), ([55, 59, 62], 43),
]

# Cena 1 (problema): drone escuro + tique de relógio acelerando + riser
s0, s1 = T["cenas"]["problema"]
drone_t = t_axis(s1)
drone = (np.sin(2 * np.pi * note(33) * drone_t) * 0.5 + lp(rng.standard_normal(len(drone_t)), 220) * 0.6)
drone *= np.minimum(1, drone_t / 1.5) * 0.35
place(music, drone, 0)
tick = hp(rng.standard_normal(int(0.02 * SR)), 3000) * env(int(0.02 * SR), 0.0005, 0.004) * 0.35
tt = 0.3
while tt < s1 - 0.3:
    place(drums, tick, tt)
    tt += 0.6 if tt < 4 else 0.3  # acelera: ansiedade
# batidas graves tipo "coração" no fim da cena
for k, tt in enumerate(np.arange(4.2, s1 - 0.4, 0.6)):
    place(drums, lp(kick(), 400) * 0.6, tt)

# Grooves a partir da solução
g0 = T["cenas"]["solucao"][0]
end_groove = T["falas"]["c2"] + 2.3
t = g0
i = 0
while t < end_groove:
    ch, root = prog[i % 4]
    place(padbus, pad_chord(ch, bar + 0.25), t)
    for b in range(4):
        bt = t + b * beat
        if bt >= end_groove:
            break
        section_demo = bt >= T["cenas"]["demo"][0]
        place(drums, kick(), bt, 1.0 if b in (0, 2) or section_demo else 0.0)
        k_env = np.exp(-t_axis(beat) * 9)
        place(side, k_env, bt)
        if b in (1, 3):
            place(drums, clap(), bt)
        place(drums, hat(), bt + beat / 2)
        if bt >= T["cenas"]["demo"][0]:
            place(drums, hat() * 0.6, bt + beat * 0.25)
            place(drums, hat() * 0.6, bt + beat * 0.75)
        # baixo em colcheias com variação
        for e8 in range(2):
            place(music, bass(root - 12 + (12 if (b == 3 and e8 == 1) else 0), beat / 2), bt + e8 * beat / 2)
        # arpejo de pluck nos benefícios e no CTA
        if bt >= T["cenas"]["beneficios"][0]:
            for e8 in range(2):
                place(music, pluck(ch[(b * 2 + e8) % 3] + 12), bt + e8 * beat / 2, 0.8)
    t += bar
    i += 1

# pumping (sidechain do kick) no pad
pump = 1 - 0.55 * np.clip(side, 0, 1)
padbus = reverb(padbus, 1.8, 0.3) * pump * 0.55
drums = reverb(drums, 0.9, 0.12)

# acerto final: kick + prato no fim da fala
fim = T["falas"]["c2"] + 2.4
crash = hp(rng.standard_normal(int(2.2 * SR)), 5000) * env(int(2.2 * SR), 0.002, 0.7) * 0.35
place(drums, kick() * 1.2, fim)
place(drums, crash, fim)
place(padbus, pad_chord([57, 60, 64, 69], 2.2) * env(int(2.2 * SR), 0.01, 0.9) * 0.6, fim)
# corta grooves depois do acerto
cut = int(fim * SR)
music[cut:] *= np.linspace(1, 0, len(music) - cut) ** 2

music = music + padbus + drums
music = hp(music, 30)
music /= np.max(np.abs(music)) + 1e-9
# fade final
fade = int(0.6 * SR)
music[-fade:] *= np.linspace(1, 0, fade)

# ---------------- efeitos ----------------
sfx = np.zeros(N)


def ping():
    out = np.zeros(int(0.45 * SR))
    for k, (f, at) in enumerate([(1318.5, 0.0), (1760.0, 0.075)]):
        tt = t_axis(0.35)
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14)
        i = int(at * SR)
        out[i : i + len(s)] += s
    return out * 0.32


def vibra():
    tt = t_axis(0.42)
    s = np.sign(np.sin(2 * np.pi * 155 * tt)) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * tt))
    return lp(s, 600) * np.minimum(1, tt / 0.02) * np.exp(-tt * 3) * 0.22


def whoosh():
    n = int(0.75 * SR)
    tt = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 350, 4200)
    e = np.where(tt < 0.28, (tt / 0.28) ** 2, np.exp(-(tt - 0.28) / 0.13))
    return s * e * 0.45


def impacto():
    tt = t_axis(1.4)
    f = 32 + 50 * np.exp(-tt * 9)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.6)
    s += lp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 10) * 0.5
    return np.tanh(s * 1.4) * 0.6


def riser(sec):
    tt = t_axis(sec)
    f = 180 * (12 ** (tt / sec))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    noise = hp(rng.standard_normal(len(tt)), 1500) * 0.6
    return (tone + noise) * (tt / sec) ** 2.2 * 0.45


def toque():
    n = int(0.06 * SR)
    s = bp(rng.standard_normal(n), 1500, 6000) * env(n, 0.0005, 0.008)
    tt = t_axis(0.06)
    s += np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 80) * 0.6
    return s * 0.35


def pop():
    tt = t_axis(0.12)
    f = 700 + 900 * (tt / 0.12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30) * 0.28


def brilho():
    out = np.zeros(int(1.4 * SR))
    for k, f in enumerate([2093, 2637, 3136, 4186]):
        tt = t_axis(1.2)
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3.5)
        i = int(k * 0.06 * SR)
        out[i : i + len(s)] += s
    return out * 0.08


gen = {"ping": ping, "vibra": vibra, "whoosh": whoosh, "impacto": impacto, "toque": toque, "pop": pop, "brilho": brilho}
for item in T["efeitos"]:
    for at in item["t"]:
        if item["som"] == "riser":
            place(sfx, riser(T["cenas"]["solucao"][0] - at), at)
        else:
            place(sfx, gen[item["som"]](), at - (0.28 if item["som"] == "whoosh" else 0))

# toques reais: tempo de cada toque da gravação convertido para o tempo do vídeo
for tr in T["trechos_gravacao"]:
    meta = json.load(open(os.path.join(ROOT, "clips", tr["clip"] + ".json")))
    for ev in meta["events"]:
        if ev["type"] == "tap" and tr["de"] <= ev["t"] <= tr["ate"]:
            place(sfx, toque(), tr["inicio"] + (ev["t"] - tr["de"]) / tr["velocidade"])

# ---------------- narração posicionada ----------------
vo = np.zeros(N)
for fid, at in T["falas"].items():
    sr, x = wavfile.read(os.path.join(ROOT, "audio", f"vo_{fid}.wav"))
    x = x.astype(np.float32) / 32768.0
    place(vo, x, at)


def save(name, x, peak=0.89):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    wavfile.write(os.path.join(ROOT, "audio", name), SR, (x * 32767).astype(np.int16))


save("musica.wav", music)
save("efeitos.wav", sfx, 0.8)
save("narracao.wav", vo, 0.95)

# ---------------- mixagem: música abaixa sob a voz (sidechain) ----------------
A = lambda n: os.path.join(ROOT, "audio", n)
subprocess.run([
    "ffmpeg", "-y", "-loglevel", "error",
    "-i", A("musica.wav"), "-i", A("narracao.wav"), "-i", A("efeitos.wav"),
    "-filter_complex",
    "[1:a]asplit=2[vo][vosc];"
    "[0:a]volume=0.55[mus];"
    "[mus][vosc]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350:makeup=1[duck];"
    "[2:a]volume=0.7[fx];"
    "[vo]volume=1.0[v];"
    "[duck][v][fx]amix=inputs=3:normalize=0,alimiter=limit=0.95,"
    "loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000[out]",
    "-map", "[out]", "-ac", "2", A("mix.wav"),
], check=True)
print("ok: audio/mix.wav")
