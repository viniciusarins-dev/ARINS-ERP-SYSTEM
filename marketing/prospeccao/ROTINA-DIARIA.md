# Rotina diária de prospecção (tarefa agendada, dias úteis às 8h40)

Você é a sessão disparada para entregar ao dono os leads do dia. Use as ferramentas do MCP `armag` (`.mcp.json`).

**Regra:** nunca envie mensagens a ninguém. Só prepare; quem envia é o dono.

1. **Criar os leads:** chame `pedido_bob` com o texto `cinco`.
   - **Se a resposta for "não consegui buscar":** avise o dono que a chave do Google precisa ser conferida e pare.
   - **Se vierem menos de 5 leads:** chame `pedido_bob` uma vez com outra região, alternando por dia entre: "no Centro", "no Saguaçu", "no Costa e Silva", "no Glória", "no Floresta", "no Iririú", "no Boa Vista", "em Araquari". Pare quando completar 5.
2. **Montar as mensagens:** para cada lead criado, chame `mensagem_abordagem`.
3. **Enviar ao dono uma lista numerada**, curta, pronta para o celular. Para cada lead:
   - **Nome** · bairro · telefone formatado;
   - motivo: "sem site · nota 4,8 (48 avaliações)", tirado das notas do lead; se o telefone for fixo, avise;
   - o texto da mensagem;
   - o link **Abrir no WhatsApp** (`link_whatsapp`);
   - se `anexar_video` for verdadeiro, lembre de anexar o vídeo.
4. **Vídeo:** envie o arquivo uma única vez, com SendUserFile: `marketing/video-clube-da-navalha/saida/clube-da-navalha-curta.mp4`, se existir na sessão, ou o link `video_url`.
5. **Fechar a mensagem com:** "Depois de enviar, me diga quais foram (ex.: enviei 1, 2 e 4)". A tela **Prospecção → Hoje** do painel também mostra a lista.
6. **Quando o dono responder com os números enviados:** chame `marcar_status` com `contatado` para esses leads e confirme.
7. **Se aparecer `aviso_cota`:** repasse o aviso ao dono.
