# Vídeo comercial — Clube da Navalha (v2)

Vídeo vertical 9:16 (1080×1920, 30 fps, ~55 s) para prospecção de donos de barbearia:
**problema → solução → demonstração real → benefícios → chamada para contato**.

## Como foi feito
| Etapa | Script | O que faz |
|---|---|---|
| 1 | `scripts/1-capturar.cjs` | Grava as **telas reais** do site no celular (1080×1920) e registra a posição de cada toque. Bloqueia qualquer envio (só GET): nenhuma conta ou agendamento é criado. |
| 2 | `scripts/2-narracao.py` | Gera a narração com o Piper (voz CC0 *jeff*) frase por frase, a partir de `roteiro/narracao.json`. |
| 3 | `scripts/3-audio.py` | Sintetiza a trilha e os efeitos (livres de direitos), posiciona a narração e mixa (música abaixa sob a voz, -14 LUFS). |
| 4 | `scripts/4-renderizar.cjs` | Renderiza `composicao/` quadro a quadro e junta com o áudio em `saida/clube-da-navalha-comercial-v2.mp4`. |

`roteiro/timeline.json` é a fonte única de tempos: início de cada fala, cortes da gravação e efeitos.
`composicao/video.js` desenha cada quadro em função do tempo (cenas, câmera/zoom nos toques, destaques, legendas).

## Para alterar
- **Texto falado:** edite `roteiro/narracao.json` → rode as etapas 2, 3 e 4. Se a duração mudar, ajuste `falas` em `roteiro/timeline.json`.
- **Outra voz:** `python3 scripts/2-narracao.py cadu` (ou `jeff`) → etapas 3 e 4. Para usar sua própria voz, grave cada frase como `audio/vo_<id>.wav` (48 kHz mono) e rode as etapas 3 e 4.
- **Contato no final:** constante `CONTATO` em `composicao/video.js` → etapa 4.
- **Legendas da demonstração:** lista `CAPS` em `composicao/video.js`.
- **Regravar telas do site** (ex.: endereço novo): `node scripts/1-capturar.cjs` (ou só `site`/`agendamento`).
- **Prévia rápida de quadros:** `node scripts/4-renderizar.cjs --previa 3,18,40` (PNG em `previa/`).

## Versão curta (primeiro contato, 23 s)
Mais agressiva: gancho → virada → demonstração relâmpago (telas reais aceleradas ~2×) → "sem ligação, sem mensagem, sem espera" → chama no WhatsApp.
Arquivos próprios: `roteiro/narracao-curta.json`, `roteiro/timeline-curta.json`, `composicao/curta.html` e `composicao/curta.js`
(usa as mesmas gravações de `clips/`). Para gerar:
```
VERSAO=curta python3 scripts/2-narracao.py
VERSAO=curta python3 scripts/3-audio.py
node scripts/4-renderizar.cjs --versao curta        # → saida/clube-da-navalha-curta.mp4
```
"Em menos de um minuto" vem do próprio texto do site.

## Requisitos
Node + Playwright (Chromium), Python 3 com `piper-tts`, `numpy`, `scipy`, e FFmpeg.
Vozes Piper pt_BR (CC0) em `vozes/` ou em `PIPER_VOICES` (baixar de huggingface.co/rhasspy/piper-voices).

## Fontes e licenças
Anton, Montserrat e Inter (SIL OFL 1.1) em `composicao/fonts/`. Vozes Piper (CC0). Música e efeitos sintetizados no próprio projeto.
As cenas de notificação no início são uma **dramatização genérica** (não é a interface do sistema). Todas as telas do Clube da Navalha são gravações reais do site.

## Versão 1
`v1/gravar-v1.cjs` — gravação contínua com legendas na tela (vídeo institucional anterior, preservado).
