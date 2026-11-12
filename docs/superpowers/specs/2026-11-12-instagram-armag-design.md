# Instagram da ARMAG com posts automáticos e confirmação — design

## Intenção
A ARMAG é uma software house com dois cases principais:
- o site com agendamento da barbearia (Clube da Navalha);
- o app de cobranças, que dispara várias mensagens de WhatsApp com um botão (Evolution API).

O objetivo é atrair **donos de pequenos negócios da região** e levá-los a **chamar no WhatsApp pedindo orçamento**.

O cliente ideal já tem um processo ou sistema, como fluxo de caixa e estoque, e precisa de uma peça que falta, como a cobrança. O vídeo curto (23 s) vira anúncio patrocinado na Meta.

## Objetivos
- 4 publicações por semana, geradas por Claude, nos horários de maior alcance para esse público.
- **Antes de cada publicação, uma notificação no app do Claude com a prévia.** O post só sai depois que o dono confirma.
- Conteúdo verdadeiro, com telas reais dos sistemas e chamada para o WhatsApp (47) 98919-1953.
- Depois de 4 a 6 semanas, ler as métricas do perfil e propor ajuste de horários.
- Pacote do anúncio com o vídeo curto (textos, público, sugestão de orçamento) para o dono ativar.

## Fora do escopo
- Criar a conta do Instagram. É feito pelo dono, porque a Meta exige verificação humana.
- Responder DMs ou comentários.
- Postar em outras redes.
- Ativar ou pagar anúncios.

## O que não pode acontecer
- Publicar sem confirmação.
- Inventar funcionalidade, número ou depoimento.
- Mostrar dados reais de clientes: as telas usam dados fictícios ou o modo local.
- Repetir o mesmo post.
- Gastar dinheiro com anúncio.

## Restrições
- **Publicação pela API oficial da Meta (Instagram Graph API):**
  - Exige uma conta profissional ligada a uma Página do Facebook e um app no Meta for Developers.
  - Exige uma chave de acesso com as permissões `instagram_basic`, `instagram_content_publish` e `instagram_manage_insights`.
  - De preferência, chave de Usuário do Sistema, que não expira.
- **Mídia:** precisa estar numa URL pública. A API busca a imagem ou o vídeo pela URL.
- **Formatos:**
  - imagem 1080×1350 (4:5);
  - carrossel de até 10 imagens;
  - reel MP4 9:16 com H.264 e AAC.
- **Chaves:** ficam no ambiente pelo formulário seguro (`request_credential`). Nunca vão no repositório.

## Abordagens consideradas
| | Como funciona | Troca |
|---|---|---|
| A. Fila + agendador do GitHub | Lote pronto publicado por cron | Confiável, mas alguém precisa gerar mais conteúdo |
| **B. Claude gera e publica (escolhida)** | Tarefa agendada por horário: Claude cria, avisa, publica | Autônomo. O risco de erro foi resolvido com a confirmação por post |
| C. Pacote + Meta Business Suite | Dono agenda manualmente | Sem API, mas sem automação |

O dono escolheu **B, com confirmação antes de cada post**. O alerta é uma **notificação no app do Claude** (preferida à alternativa pelo WhatsApp via Evolution, que exigiria um receptor de respostas).

## Como funciona (decidido)
### Calendário
Horário de Brasília, baseado nos estudos de 2026 (Sprout, Buffer, Hootsuite) e na rotina de quem atende o dia todo:

| Dia | Horário | Formato |
|---|---|---|
| Seg | 19h35 | Carrossel (dor do pequeno negócio) |
| Ter | 12h10 | Post (dica ou antes × depois) |
| Qua | 19h40 | Reel (demonstração real) |
| Qui | 12h20 | Carrossel (case ou "seu sistema já faz X, a gente adiciona Y") |

### Fluxo de cada post
1. Uma tarefa agendada, que cria uma sessão nova a cada disparo com notificação push, dispara **cerca de 1 h antes** do horário.
2. A sessão:
   - lê a ficha de produtos, os pilares e o histórico;
   - escolhe o tema sem repetir;
   - gera a peça (imagem, carrossel ou reel) e a legenda;
   - envia a prévia (arquivo e texto) e pergunta "Confirma a publicação às HH:MM?".
3. **Se o dono responder confirmando:**
   - antes do horário, a sessão agenda a si mesma (`send_later`) para o horário e publica nele;
   - depois do horário, publica na hora.
4. **Se ele pedir ajuste**, a sessão refaz e pergunta de novo.
5. **Se não houver confirmação até 3 h depois do horário**, não publica e registra como "pulado".
6. **Ao publicar:**
   - sobe a mídia para a hospedagem pública;
   - cria o contêiner na Graph API e espera o status `FINISHED` (no caso de reel);
   - publica;
   - registra no histórico o id, a data, o tema e o link;
   - faz commit no repositório.

### Conteúdo
- **Fonte de verdade:** `marketing/instagram-armag/marca/o-que-vendemos.md`, com o que cada sistema faz de fato. Precisa ser aprovado pelo dono, e Claude não afirma nada fora dele.
- **Visual:** identidade ARMAG (preto, dourado e ciano, logo atual) em templates HTML renderizados com Playwright, como no vídeo.
- **Reels:** feitos com o pipeline de vídeo já existente (telas reais gravadas, narração do Jeff, música e efeitos). Os dois vídeos da barbearia já servem para os primeiros reels.
- **Legenda:** curta, gancho na 1ª linha, chamada para o WhatsApp, 5 a 8 hashtags locais e de nicho.

### Métricas
Após 4 a 6 semanas, uma tarefa semanal lê os insights dos posts (alcance, salvamentos, visitas ao perfil, cliques no WhatsApp). Ela propõe novos horários e temas e **pergunta antes de mudar**.

### Anúncio
`marketing/instagram-armag/anuncio-meta.md` traz:
- 3 variações de texto;
- público: raio de cerca de 25 km, donos de pequenas empresas, 25 a 55 anos;
- objetivo "mensagens no WhatsApp";
- sugestão de R$ 15–20 por dia por 7 dias e o passo a passo no Gerenciador.

O vídeo é `saida/clube-da-navalha-curta.mp4`.

### Organização
```
marketing/instagram-armag/
  README.md              como ligar a conta, chaves e tarefas
  marca/                 logo, cores, fontes, o-que-vendemos.md, pilares.md
  templates/             post.html, carrossel.html (1080×1350)
  scripts/render.cjs     gera PNGs a partir de um JSON de post
  scripts/publicar.cjs   hospedagem + Graph API (imagem, carrossel, reel)
  scripts/metricas.cjs   leitura de insights
  posts/AAAA-MM-DD-slug/ peça + legenda + post.json
  historico.json
  anuncio-meta.md
```

## O que fica para quem implementar
- Hospedagem pública da mídia. Sugestão: bucket público no Supabase do Arins-ERP. Confirmar como subir com uma única chave pelo proxy.
- Verificar se as sessões criadas pelas tarefas agendadas têm o repositório e a rede (`graph.facebook.com`) disponíveis. Se não tiverem, ajustar o ambiente.
- Fazer um teste ponta a ponta numa conta real antes de ligar o calendário. O primeiro post será confirmado pelo dono.
