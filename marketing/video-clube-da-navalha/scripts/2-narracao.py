"""2) Gera a narração (Piper, voz CC0) frase por frase e mede a duração de cada uma.
Uso: python3 scripts/2-narracao.py [voz]   (vozes: faber, cadu, jeff)
     VERSAO=curta python3 scripts/2-narracao.py   → usa roteiro/narracao-curta.json
Saída: audio/vo_<id>.wav (48 kHz) e roteiro/duracoes[-versao].json
"""
import json, os, subprocess, sys, wave
from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUF = f"-{os.environ['VERSAO']}" if os.environ.get("VERSAO") else ""
PRE = f"{os.environ['VERSAO']}_" if os.environ.get("VERSAO") else ""
cfg = json.load(open(os.path.join(ROOT, "roteiro", f"narracao{SUF}.json")))
voz = sys.argv[1] if len(sys.argv) > 1 else cfg["voz"]
modelo = os.environ.get("PIPER_VOICES", os.path.join(ROOT, "vozes")) + f"/pt_BR-{voz}-medium.onnx"
voice = PiperVoice.load(modelo)
syn = SynthesisConfig(length_scale=cfg["velocidade"], noise_scale=0.55, noise_w_scale=0.5)

dur = {}
for f in cfg["falas"]:
    raw = os.path.join(ROOT, "audio", f"_raw_{PRE}{f['id']}.wav")
    # velocidade opcional por fala (length_scale: menor = mais rápido)
    syn_f = SynthesisConfig(length_scale=f.get("velocidade", cfg["velocidade"]), noise_scale=0.55, noise_w_scale=0.5)
    with wave.open(raw, "wb") as w:
        voice.synthesize_wav(f["texto"], w, syn_config=syn_f)
    out = os.path.join(ROOT, "audio", f"vo_{PRE}{f['id']}.wav")
    # 48 kHz, corta silêncio das pontas, leve compressão e EQ de presença para voz comercial
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,"
        "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
        "highpass=f=80,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.2:g=3,"
        "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=3,aresample=48000",
        "-ac", "1", out], check=True)
    os.remove(raw)
    with wave.open(out) as w:
        dur[f["id"]] = round(w.getnframes() / w.getframerate(), 3)
    print(f"{f['id']}: {dur[f['id']]:.2f}s  {f['texto']}")

json.dump({"voz": voz, "duracoes": dur}, open(os.path.join(ROOT, "roteiro", f"duracoes{SUF}.json"), "w"), indent=2)
print("total de fala: %.1fs" % sum(dur.values()))
