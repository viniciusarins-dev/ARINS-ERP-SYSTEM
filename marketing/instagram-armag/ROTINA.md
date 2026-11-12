# Rotina de publicação (seguida pela tarefa agendada de cada horário)

Você é a sessão disparada cerca de 1 h antes de um horário do Instagram da ARMAG. O prompt diz qual slot é (`seg`, `ter`, `qua` ou `qui`).

**Regra de ouro: nunca publique sem um "ok" explícito do dono nesta sessão.**

## 1. Preparar
1. Entre em `marketing/instagram-armag/` e rode `git pull`.
2. Leia `calendario.json`, `marca/o-que-vendemos.md`, `marca/pilares.md` e os temas recentes:
   ```
   node -e "const h=require('./scripts/lib/historico.cjs');console.log(h.temasRecentes(h.lerHistorico('historico.json')))"
   ```
3. Se `o-que-vendemos.md` ainda disser **AGUARDANDO APROVAÇÃO**, avise o dono e só siga se ele aprovar o post mesmo assim.
4. Calcule o horário de hoje com `horarioDoSlot(calendario, slot, hoje)` (`scripts/lib/agenda.cjs`).

## 2. Criar o post
1. **Se já existe `posts/<hoje>-*/post.json` para este slot**, use-o, porque pode ter sido preparado com antecedência.
2. **Se não existe**, crie `posts/<hoje>-<slug>/post.json`:
   - **Pilar:** o do slot no calendário. O tema não pode repetir nenhum dos 12 recentes.
   - **Afirmações:** só o que está em `o-que-vendemos.md`. Sem números de resultado, preços ou depoimentos.
   - **Formato:** o do slot.
     - `post`: 1 slide.
     - `carrossel`: 3 a 6 slides, com o último sendo a chamada.
     - `reel`: vídeo real em `video.mp4`. Reaproveite ou edite os vídeos de `marketing/video-clube-da-navalha/`, ou grave novas telas reais com dados fictícios.
   - **Slides:** títulos curtos. `*palavra*` deixa dourado, `_palavra_` deixa ciano e `\n` quebra a linha.
   - **Legenda:** gancho na 1ª linha, 5 a 8 hashtags (com #joinville ou #joinvillesc) e o WhatsApp (47) 98919-1953.
3. Rode `node scripts/render.cjs posts/<pasta>`. Se o texto estourar, encurte e rode de novo. Olhe cada PNG antes de mandar.

## 3. Pedir a confirmação
Envie as imagens (ou o vídeo) com SendUserFile e a legenda completa no texto, terminando com:

> **Confirma a publicação hoje às HH:MM?** Responda **ok**, **ajuste: …** ou **pular**.

Encerre o turno e espere a resposta.

## 4. Quando o dono responder
- **ajuste: …** → refaça, renderize e pergunte de novo.
- **pular** → registre o post como pulado:
  ```
  node -e "require('./scripts/lib/historico.cjs').registrar('historico.json',{slug:'<slug>',data:'<data>',slot:'<slot>',formato:'<formato>',tema:'<tema>',pilar:'<pilar>',status:'pulado'})"
  ```
- **ok** → aplique `decidir(agora, horario, true)`:
  - `agendar`: use `send_later` no horário com a mensagem "Publicar posts/<pasta> agora (confirmado pelo dono)". Quando ela chegar, publique.
  - `publicar`: publique agora.
  - `pular`: passou da janela de 3 h. Não publique, avise e registre como pulado.
- **Sem resposta:** não faça nada. Se alguma mensagem chegar depois do horário + 3 h, o resultado é `pular`.

## 5. Publicar
1. Teste antes com `node scripts/publicar.cjs posts/<pasta> --ig $IG_USER_ID --dry-run`.
2. Publique com `node scripts/publicar.cjs posts/<pasta> --ig $IG_USER_ID`. Precisa de `SUPABASE_URL`; o token da Meta é injetado pelo proxy.
3. Mande o link do post ao dono.
4. Faça commit de `posts/<pasta>` e `historico.json` e dê `git push`.

## Erros
- **Token inválido ou expirado:** avise o dono para gerar um novo token e atualizar a credencial de `graph.facebook.com`. Não tente de novo em seguida.
- **Vídeo com ERROR:** reexporte o MP4 (H.264, AAC, 9:16, 30 fps), hospede de novo e tente uma vez.
- **Qualquer outro erro:** mostre a mensagem ao dono. Nunca publique "às cegas".
