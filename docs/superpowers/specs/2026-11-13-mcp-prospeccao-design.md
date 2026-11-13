# Prospecção da ARMAG: serviço, MCP e o assistente de voz "Bob" — design

## Intenção
O dono quer que o Claude **puxe cerca de 5 potenciais leads por dia** (negócios de Joinville e região sem site próprio) e já deixe **uma mensagem de abordagem pronta**. Nas barbearias e salões, a mensagem vai com o **vídeo de 23 s** (`clube-da-navalha-curta.mp4`). O dono envia com um toque e o acompanhamento fica no painel ARMAG Cobranças (tela Prospecção, tabela `armag.leads`).

## Objetivos
- **Servidor MCP da ARMAG no repositório**, registrado em `.mcp.json`. Ele carrega sozinho em qualquer sessão do Claude Code, incluindo as tarefas agendadas.
- **Busca no Google Places API (New)** de negócios operando que:
  - não têm site próprio;
  - têm telefone;
  - têm avaliações (sinal de negócio ativo).

  Ignora quem já é lead ou cliente.
- **Para cada lead:**
  - motivo da escolha;
  - mensagem personalizada;
  - link `wa.me` com o texto preenchido.
- **Tarefa agendada nos dias úteis às 8h40 (São Paulo)** com notificação push, trazendo os 5 do dia. Também funciona sob demanda ("me traz mais 5", "hoje oficinas").
- **Marcação de status por conversa.** Por exemplo, "enviei 1, 2 e 4" muda esses leads para `contatado`.

## Fora do escopo
- Enviar mensagens. É o modo **A**: quem envia é o dono. O envio pela Evolution API (modo B) fica para uma evolução futura.
- MCP publicado na internet (conector do claude.ai).
- Cobrança e orçamentos pelo MCP.
- O Cobrança iPad.

## O que não pode acontecer
- Abordar quem já é cliente ou já é lead (por telefone ou id do Google).
- Mensagem que afirme algo fora de `marketing/instagram-armag/marca/o-que-vendemos.md`.
- Mensagem sem identificação ou sem saída ("se não tiver interesse, é só avisar").
- Gravar no banco algo além de leads.
- Gastar além da cota gratuita do Google sem o dono saber.

## Restrições
- **Segmentos iniciais:** barbearia e salão, onde o vídeo encaixa. Outros só sob pedido; nesses, a mensagem vai sem o vídeo.
- **Google Places API (New):**
  - endpoint: `POST https://places.googleapis.com/v1/places:searchText`;
  - cabeçalhos: `X-Goog-Api-Key` (credencial do ambiente, nunca no repositório) e `X-Goog-FieldMask`;
  - campos: `id`, `displayName`, `formattedAddress`, `nationalPhoneNumber`, `websiteUri`, `rating`, `userRatingCount`, `businessStatus`, `googleMapsUri`, `location`;
  - Telefone e site entram numa faixa de cobrança maior. Com 1 a 3 buscas por dia (até 20 resultados cada), o uso fica bem abaixo da cota gratuita mensal. O servidor conta as buscas do mês e avisa ao passar de um limite configurável (padrão 300).
- **"Sem site próprio":** `websiteUri` ausente ou apontando só para Instagram, Facebook, Linktree, WhatsApp ou similares.
- **Filtros:**
  - `businessStatus = OPERATIONAL`;
  - `userRatingCount ≥ 5`;
  - preferir celular. Fixo é aceito, marcado como "fixo, pode não ter WhatsApp".
- **Banco:**
  - schema `armag` do projeto Arins-ERP;
  - nova migração aceitando `source = 'google'`;
  - `source_ref = 'google:<place_id>'`, que já é único.

## Abordagens consideradas
| | Como | Troca |
|---|---|---|
| **1. MCP no repositório (escolhida)** | Servidor stdio registrado em `.mcp.json` | Funciona nas sessões do Claude Code e nas tarefas agendadas. Reaproveita o domínio do painel. |
| 2. Só scripts | Receita em Markdown + CLIs | Mais simples, mas não dá para usar livremente por conversa |
| 3. MCP remoto (conector) | HTTP + OAuth, hospedado | Funciona no chat do claude.ai, mas exige hospedagem e login. Fica para depois. |

**Envio:** o dono escolheu o **A**. O Claude prepara e o dono envia pelo link `wa.me`, anexando o vídeo.

**Fonte:** o dono escolheu o **Google Places** em vez do OpenStreetMap, que tem cobertura fraca em Joinville.

## Como funciona (decidido)
### Ferramentas do MCP (`armag`)
- **`buscar_prospects { segmento?, bairro_ou_cidade? = "Joinville SC", quantidade? = 5 }`:** consulta o Google e aplica os filtros. Remove duplicados contra leads e clientes, comparando id do Google e telefone normalizado. Devolve os candidatos ordenados por número de avaliações, sem gravar nada.
- **`salvar_leads { candidatos[] }`:** grava em `armag.leads` com `source 'google'` e status `novo`. Devolve os ids.
- **`mensagem_abordagem { lead_id }`:** monta o texto a partir do modelo do painel (`settings.prospectMessage`, ou o padrão), personalizado com nome, bairro e segmento. Devolve `{ texto, link_whatsapp, anexar_video: boolean }`.
- **`marcar_status { lead_ids[], status, nota? }`:** atualiza o status (`contatado`, `interessado`, …).
- **`listar_leads { status?, limite? }`:** mostra o funil.

### Fluxo diário (tarefa agendada)
1. Rodar `buscar_prospects` para barbearias e salões, alternando bairros ou regiões para variar.
2. Escolher 5 e chamar `salvar_leads`.
3. Gerar `mensagem_abordagem` para cada um.
4. Enviar ao dono uma lista numerada com:
   - nome, bairro e telefone;
   - motivo ("sem site, 48 avaliações, nota 4,8");
   - mensagem;
   - link **Abrir no WhatsApp**;
   - quando for o caso, o arquivo do vídeo (enviado uma vez, para salvar no celular).
5. Quando o dono responder "enviei 1, 2 e 4", chamar `marcar_status` com `contatado`.

### Mensagem
- Toda mensagem precisa ter:
  - identificação (nome do dono + ARMAG);
  - frase personalizada;
  - convite para ver o vídeo ou o trabalho;
  - linha de saída.
- O modelo padrão atual fala em "fotos dos cortes", que não está na ficha de fatos. Ajustar para só o que está lá.

## O que fica para quem implementar
- **Linguagem e execução:** TypeScript com `@modelcontextprotocol/sdk`, rodando com Node 22. Escolher entre remoção de tipos nativa ou `tsx`. Reaproveitar `apps/cobrancas/src/domain/phone.ts` e `prospect.ts` (status e modelo de mensagem) sem duplicar.
- **Acesso ao banco com o menor privilégio possível.** Opções, em ordem de preferência:
  1. usuário dedicado membro do schema `armag`, respeitando o RLS. Precisa guardar a senha como segredo; avaliar como fazer isso no ambiente;
  2. chave `service_role` injetada pelo proxy para o host do Supabase, com o código limitado a `leads`, `clients` (só leitura) e `settings` (só leitura);
  3. API de gerenciamento do Supabase, que já funciona neste ambiente, mas tem poder de superusuário.

  Apresentar ao dono antes de configurar.
- **Pedir ao dono a chave do Google**, com `request_credential`: host `places.googleapis.com`, cabeçalho `X-Goog-Api-Key`.
- **Testes unitários** com `fetch` falso:
  - leitura da resposta do Places;
  - filtro "sem site próprio";
  - remoção de duplicados por id e por telefone;
  - montagem da mensagem e do link `wa.me` (acentos codificados);
  - contador de cota.

## Atualização (aprovada): o "Bob" e o serviço de prospecção
O dono quer um assistente de voz no iPhone (iPhone 16, iOS 26.5.2): **"Olá, Bob"** → "Quantos leads você quer hoje?" → o Bob cria os leads.

Por isso, a lógica sai do MCP e vira um **serviço único na internet**: a Edge Function `bob` no projeto Arins-ERP. Quem chama esse serviço:
- **Atalho do iPhone**, disparado pelo Atalho Vocal "Olá, Bob", sem precisar dizer "E aí, Siri";
- **MCP `armag`** no Claude Code (lista diária às 8h40 e uso em conversa): as ferramentas viram chamadas HTTP ao serviço;
- **Painel**: a tela Prospecção ganha o filtro **"Hoje"**, o botão de baixar o vídeo e a mensagem personalizada.

### Serviço `bob` (Supabase Edge Function, Deno)
- **Rotas:** `POST /bob`, recebendo `{ acao, ... }`:
  - `pedido { texto }`: interpreta a frase falada e executa buscar → salvar. Devolve `{ falar, criados, url }`;
  - `buscar`, `salvar`, `mensagem`, `marcar_status` e `listar`: o mesmo que as ferramentas do MCP.
- **Interpretação da frase, sem IA:**
  - quantidade em número ou por extenso (um a dez; acima de 10, limita a 10; sem número, assume 5);
  - segmento: barbearia ou salão; padrão os dois;
  - bairro ou cidade: texto depois de "no", "na" ou "em"; padrão "Joinville SC".
- **Resposta falada:**
  - "Pronto! Criei N leads de <segmento> sem site e deixei as mensagens prontas.";
  - se achar menos: "Só achei N hoje em <região>.";
  - se achar zero: explica e sugere outra região.
- **Segredos, todos dentro do Supabase, como segredos da função:**
  - `SUPABASE_SERVICE_ROLE_KEY` (já injetada pelo Supabase);
  - `GOOGLE_PLACES_KEY` (o dono cola no painel do Supabase);
  - `BOB_TOKEN` (gerado; o Atalho e o MCP enviam no cabeçalho `X-Bob-Token`).
- **Configuração da função:**
  - `verify_jwt = false`; o próprio serviço exige o `X-Bob-Token`;
  - com a chave de serviço, o código só escreve em `armag.leads` e lê `armag.clients` e `armag.settings`.
- **Contador de buscas do mês** numa tabela `armag.prospect_usage`, com aviso a partir de 300.

### Atalho do iPhone (o dono monta com o passo a passo)
Não é possível gerar um Atalho assinado fora de um Mac.

1. Falar o texto "Fala, Vinicius! Quantos leads você quer hoje?"
2. Ditar texto.
3. Obter conteúdo do URL: `POST https://gxrvtdlcdqpirojyibbm.supabase.co/functions/v1/bob`, com o cabeçalho `X-Bob-Token` e o JSON `{acao:"pedido", texto}`.
4. Falar o campo `falar` da resposta.
5. Abrir o URL do campo `url` (painel → Prospecção → Hoje).

Depois: Ajustes → Acessibilidade → **Atalhos Vocais**, gravar "Olá, Bob" e escolher o Atalho Bob.

### Painel
- O filtro **"Hoje"** (`/prospeccao?hoje=1`) mostra os leads criados hoje.
- Cada lead tem a mensagem com `{bairro}` e `{segmento}`. O botão WhatsApp já existe e marca o lead como contatado.
- O botão **"Baixar vídeo"** aponta para o vídeo de 23 s no bucket público `instagram-armag`.

### Decisões que este desenho resolve
- **Acesso ao banco:** chave de serviço só dentro da função, com o código restrito. O Claude e o celular nunca a veem.
- **Chave do Google:** segredo da função, não credencial do proxy.
