# Instagram da ARMAG — posts automáticos com confirmação

Claude prepara cada post (imagem, carrossel ou reel) cerca de 1 h antes do horário e manda a prévia para o celular do dono pelo app do Claude. **Só publica depois do "ok".**

- **Design:** `docs/superpowers/specs/2026-11-12-instagram-armag-design.md`
- **Rotina de cada horário:** `ROTINA.md`

| Dia | Horário (Brasília) | Formato |
|---|---|---|
| seg | 19:35 | carrossel |
| ter | 12:10 | post |
| qua | 19:40 | reel |
| qui | 12:20 | carrossel |

## Arquivos
- `marca/`: logo, cores, fontes, **`o-que-vendemos.md`** (fonte de verdade, o dono aprova) e `pilares.md`.
- `templates/peca.html`: arte 1080×1350 no visual ARMAG.
- `scripts/render.cjs posts/<pasta>`: gera `01.png…`. Recusa post inválido ou texto que estoura o espaço.
- `scripts/publicar.cjs posts/<pasta> --ig <IG_USER_ID> [--dry-run]`: hospeda a mídia e publica pela Graph API.
- `scripts/metricas.cjs`: alcance, salvos, compartilhamentos e visitas ao perfil por post e por horário.
- `historico.json`: tudo o que foi publicado ou pulado. Impede duplicar post e repetir tema.
- `posts/`: um diretório por post (`post.json`, imagens ou `video.mp4`).
- `anuncio-meta.md`: pacote do anúncio com o vídeo de 23 s.
- **Testes:** `npm test` (ou `node --test test/*.test.cjs`).

## O que o dono faz uma vez (cerca de 30 min)
1. **Instagram:** crie a conta da ARMAG no app. Depois vá em Configurações → Tipo de conta e ferramentas → **Mudar para conta profissional** → Empresa.
2. **Página do Facebook:** crie em facebook.com/pages/create e ligue ao Instagram em Configurações da Página → Contas vinculadas → Instagram.
3. **Meta Business:** em business.facebook.com, crie o portfólio da empresa e adicione a Página e o Instagram.
4. **App da Meta:**
   - em developers.facebook.com → Meus apps → Criar app;
   - tipo **Empresa**, ligado ao portfólio;
   - adicione o produto **Instagram** (API com login do Facebook).
5. **Chave permanente:**
   - em business.facebook.com → Configurações → **Usuários do sistema**, crie um usuário Administrador;
   - atribua a ele o app, a Página e o Instagram;
   - gere o token com as permissões: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management`.
6. **Não cole o token no chat.** Claude abre um formulário seguro para a credencial de `graph.facebook.com`.
7. **ID da conta (IG_USER_ID):** Claude descobre sozinho depois da chave (`GET /me/accounts?fields=instagram_business_account`).

## O que Claude faz na entrada no ar
- Libera `graph.facebook.com` na rede do ambiente e pede a credencial.
- Cria o bucket público `instagram-armag` no Supabase do Arins-ERP.
- Faz um teste (`--dry-run`) e o primeiro post real, com a confirmação do dono.
- Cria as 4 tarefas agendadas (1 h antes de cada horário, com notificação push) e uma tarefa na 6ª semana para revisar horários com `metricas.cjs`. Os horários só mudam com o ok do dono.
