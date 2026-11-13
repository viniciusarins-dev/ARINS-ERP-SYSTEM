# Prospecção ARMAG (serviço, MCP e Bob): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Olá, Bob" no iPhone, ou uma ferramenta do MCP no Claude Code, gera N leads do Google Places (negócios sem site próprio) no painel ARMAG, com a mensagem pronta para enviar pelo WhatsApp.

**Architecture:**
- **Lógica pura** em `apps/cobrancas/src/domain/` (testada com vitest): leitura do Places, filtros, interpretação da frase e mensagem.
- **Serviço único:** uma Supabase Edge Function `bob`, empacotada com esbuild num arquivo só. Ela usa `fetch` para o Google e para o PostgREST (`Accept-Profile: armag`), com a chave de serviço.
- **Clientes do serviço:** o Atalho do iPhone, o MCP `armag` (Node, stdio, só repassa chamadas) e a tela Prospecção do painel.

**Tech Stack:**
- React 19, Vite 8, TS e vitest (app existente);
- Deno (Edge Function), com esbuild via `npx esbuild@0.24.2`;
- Node 22 com `@modelcontextprotocol/sdk` e zod;
- Google Places API (New);
- Management API do Supabase (já acessível neste ambiente) para migração, deploy e segredos.

**Spec:** `docs/superpowers/specs/2026-11-13-mcp-prospeccao-design.md` (inclui a seção "Atualização (aprovada): o Bob").

## Global Constraints
- **Projeto Supabase:** `gxrvtdlcdqpirojyibbm` (Arins-ERP), schema `armag`.
- **Endpoint do Bob:** `https://gxrvtdlcdqpirojyibbm.supabase.co/functions/v1/bob`, com `verify_jwt = false` e cabeçalho obrigatório `X-Bob-Token`.
- **Segredos da função:** `GOOGLE_PLACES_KEY`, `BOB_TOKEN`; a chave de serviço é a `SUPABASE_SERVICE_ROLE_KEY`, que o Supabase já injeta. Nunca no repositório.
- **Google Places:**
  - `POST https://places.googleapis.com/v1/places:searchText`;
  - FieldMask: `places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.location`;
  - corpo: `languageCode "pt-BR"`, `regionCode "BR"`, `maxResultCount 20`.
- **Filtros:**
  - `businessStatus === "OPERATIONAL"`;
  - `userRatingCount >= 5`;
  - tem telefone;
  - sem site próprio: o domínio é vazio ou um destes: instagram.com, facebook.com, fb.com, linktr.ee, wa.me, api.whatsapp.com, whatsapp.com, linkin.bio, beacons.ai.
- **Quantidade:** padrão 5, máximo 10.
- **Segmentos:** `barbearia`, `salao`. Região padrão "Joinville SC".
- **Aviso de cota:** a partir de 300 buscas no mês.
- **Mensagem:** sempre com identificação, linha de saída e apenas fatos de `marketing/instagram-armag/marca/o-que-vendemos.md`.
- **Vídeo:** `instagram-armag/prospeccao/clube-da-navalha-curta.mp4`, no bucket público já criado.

## Review Focus
1. **Frases faladas variadas** ("cinco", "5", "quero dez barbearias", "vinte" → 10, sem número → 5, "salões no Saguaçu") → quantidade, segmento e região corretos. Pinned em T2.
2. **Mesmo negócio já é lead, ou o telefone dele bate com o de um cliente** em formato diferente (+55 (47) 9…) → excluído. Pinned em T1 e T4.
3. **O Google traz menos do que o pedido, ou zero** → resposta falada honesta, sem erro. Pinned em T4.
4. **Token ausente ou errado** → 401 e nada gravado. Pinned em T4.
5. **Chave do Google ausente ou erro da Google** → resposta falada "não consegui buscar agora…", e o contador de uso não sobe. Pinned em T4.

---

### Task 1: Núcleo do Google Places
**Files:**
- Create: `apps/cobrancas/src/domain/places.ts`
- Test: `apps/cobrancas/src/domain/places.test.ts`

**Interfaces:**
- Produces:
  - `type PlaceCandidate = { ref: string /* "google:<id>" */, name, segment: "barbearia"|"salao", address: string|null, bairro: string|null, city: string|null, phone: string|null /* nacional, só dígitos */, isMobile: boolean, website: string|null, rating: number|null, ratings: number, mapsUrl: string|null, lat: number|null, lon: number|null }`;
  - `PLACES_FIELD_MASK: string`;
  - `consultaPlaces(segment, regiao): { textQuery: string, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20 }`, com textQuery `"barbearia em <regiao>"` ou `"salão de beleza em <regiao>"`;
  - `temSiteProprio(url: string|null): boolean`;
  - `parsePlaces(json, segment): PlaceCandidate[]`. O bairro e a cidade saem do `formattedAddress` (padrão "Rua…, 123 - Bairro, Cidade - SC, CEP, Brasil"). O telefone passa por `normalizePhone` de `./phone`;
  - `selecionar(cands, { refs: Set<string>, fones: Set<string> }, n): PlaceCandidate[]`: aplica os filtros, remove duplicados e ordena por `ratings` decrescente.

- [ ] **Step 1: Testes que falham** (fixture JSON com 6 lugares)
  - Lugar com `websiteUri` "https://instagram.com/x" → `temSiteProprio` false. Com "https://barbeariax.com.br" → true. Com null → false.
  - `parsePlaces`:
    - `nationalPhoneNumber` "(47) 99123-4567" → phone "47991234567", isMobile true;
    - "(47) 3422-1111" → isMobile false;
    - endereço "Rua A, 10 - Saguaçu, Joinville - SC, 89221-000, Brasil" → bairro "Saguaçu", city "Joinville".
  - `selecionar` exclui cada um dos casos:
    - `CLOSED_TEMPORARILY`;
    - 4 avaliações;
    - sem telefone;
    - com site próprio;
    - ref em `refs`;
    - telefone em `fones`.

    Devolve os restantes ordenados por avaliações e corta em n.
- [ ] **Step 2:** Rodar `npx vitest run src/domain/places.test.ts` e esperar FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar o mesmo comando e esperar PASS.
- [ ] **Step 5:** Commit `feat(prospeccao): Google Places parsing and lead selection`.

### Task 2: Interpretar o pedido falado e montar as frases
**Files:**
- Create: `apps/cobrancas/src/domain/pedido.ts`
- Test: `apps/cobrancas/src/domain/pedido.test.ts`

**Interfaces:**
- Produces:
  - `interpretarPedido(texto: string): { quantidade: number, segmentos: ("barbearia"|"salao")[], regiao: string }`;
  - `fraseResultado({ pedidos: number, criados: number, segmentos, regiao }): string`;
  - `fraseErro(): string`.

- [ ] **Step 1: Testes que falham**
  - "cinco" → 5, os dois segmentos, "Joinville SC".
  - "5" → 5.
  - "quero dez barbearias" → 10, ["barbearia"].
  - "vinte" → 10.
  - "" → 5.
  - "três salões no Saguaçu" → 3, ["salao"], "Saguaçu, Joinville SC".
  - "dois em Araquari" → 2, "Araquari SC".
  - "um" e "uma" → 1. Acentos e maiúsculas ignorados.
  - `fraseResultado({pedidos:5, criados:5, segmentos:["barbearia"], regiao:"Joinville SC"})` === "Pronto! Criei 5 leads de barbearias sem site em Joinville e deixei as mensagens prontas."
  - Com `criados: 2` → "Só achei 2 hoje em Joinville. Já deixei as mensagens prontas."
  - Com `criados: 0` → contém "não encontrei" e "outra região".
  - `fraseErro()` contém "não consegui buscar".
- [ ] **Step 2:** Rodar e esperar FAIL.
- [ ] **Step 3:** Implementar.
  - Números por extenso de um a vinte.
  - A região é o trecho depois de " no ", " na " ou " em ". Se não for Joinville, recebe o sufixo "SC". Bairros recebem ", Joinville SC" quando o texto não cita uma cidade conhecida (lista: Joinville, Araquari, São Francisco do Sul, Jaraguá do Sul, Garuva, Itapoá, Barra Velha, Guaramirim).
- [ ] **Step 4:** Rodar e esperar PASS.
- [ ] **Step 5:** Commit.

### Task 3: Mensagem de abordagem alinhada à ficha
**Files:**
- Modify: `apps/cobrancas/src/domain/prospect.ts` (`DEFAULT_PROSPECT_MESSAGE`, `renderProspectMessage`)
- Test: `apps/cobrancas/src/domain/prospect.test.ts`

**Interfaces:**
- Produces: `renderProspectMessage(template, { empresa, cidade?, meu_nome?, bairro?, segmento? })`. As novas variáveis são `{bairro}` (vazio → cidade) e `{segmento}` ("barbearia" ou "salão").

- [ ] **Step 1: Testes que falham**
  - O padrão contém "{meu_nome}", "ARMAG", "agendamento online" e "se não tiver interesse, é só me avisar".
  - O padrão **não** contém "fotos dos cortes".
  - `{bairro}` é substituído; sem bairro, cai na cidade.
  - Os testes antigos continuam passando.
- [ ] **Step 2:** Rodar `npx vitest run src/domain/prospect.test.ts` e esperar FAIL.
- [ ] **Step 3:** Implementar. Novo padrão:

  ```
  Olá, tudo bem? Falo com o responsável pela {empresa}?

  Sou {meu_nome}, da ARMAG — criamos sites e sistemas para negócios aqui de {cidade}.

  Vi que a {empresa}, no {bairro}, ainda não tem site próprio. Fizemos para uma barbearia um site em que o cliente agenda sozinho, 24 horas: escolhe o serviço, o profissional e o horário livre. Te mando um vídeo de 23 segundos mostrando.

  Se fizer sentido, te passo um orçamento sem compromisso. Se não tiver interesse, é só me avisar que não mando mais mensagens.
  ```
- [ ] **Step 4:** Rodar e esperar PASS.
- [ ] **Step 5:** Commit.

### Task 4: Serviço `bob` (Edge Function), migração e deploy
**Files:**
- Create: `apps/cobrancas/supabase/migrations/0007_armag_prospect_google.sql`
  - `leads.source` passa a aceitar `'google'`;
  - nova tabela `armag.prospect_usage(mes text primary key, buscas int not null default 0)` com RLS ligado e sem policies (só a chave de serviço acessa);
  - função `armag.bump_prospect_usage(p_mes text) returns int`.
- Create: `apps/cobrancas/supabase/functions/bob/handler.ts`, a lógica com tudo injetado:
  `handle(req: { token: string|null, body: unknown }, deps: { fetch, env: { BOB_TOKEN, GOOGLE_PLACES_KEY, SUPABASE_URL, SERVICE_KEY, PAINEL_URL }, hoje: string }) -> Promise<{ status: number, json: unknown }>`.
- Create: `apps/cobrancas/supabase/functions/bob/index.ts`: `Deno.serve`, que faz a ponte entre `Request` e `handle`.
- Create: `apps/cobrancas/scripts/deploy-bob.sh`: esbuild faz o bundle de `index.ts` para `dist/bob/index.js` (format esm, platform neutral), depois deploy pela Management API `POST /v1/projects/{ref}/functions/deploy?slug=bob` (multipart, `verify_jwt=false`).
- Test: `apps/cobrancas/supabase/functions/bob/handler.test.ts` (vitest).
- Modify: `apps/cobrancas/src/data/types.ts`: `Lead.source` passa a `"osm"|"manual"|"google"`.

**Interfaces:**
- Consumes: T1 `consultaPlaces`, `parsePlaces`, `selecionar`, `PLACES_FIELD_MASK`; T2 `interpretarPedido`, `fraseResultado`, `fraseErro`; T3 `renderProspectMessage`; `whatsappLink` (phone.ts).
- Produces: corpo `{ acao, ... }`:
  - **`pedido { texto }`** → `{ falar, criados: Lead[], url: PAINEL_URL + "/prospeccao?hoje=1" }`;
  - **`buscar { segmento?, regiao?, quantidade? }`** → `{ candidatos }`;
  - **`salvar { candidatos }`** → `{ ids }`;
  - **`mensagem { lead_id }`** → `{ texto, link_whatsapp, anexar_video, video_url }`;
  - **`marcar_status { lead_ids, status, nota? }`** → `{ ok: true }`;
  - **`listar { status?, limite? = 20 }`** → `{ leads }`;
  - **qualquer resposta** pode trazer `aviso_cota` quando o mês passar de 300 buscas.
  - **Detalhes de dados:**
    - os duplicados são verificados contra `armag.leads` (source_ref e phone) e `armag.clients` (whatsapp normalizado);
    - os leads são inseridos com `source 'google'`, status `novo` e `notes` = "Google: nota X (N avaliações)";
    - o PostgREST é acessado em `${SUPABASE_URL}/rest/v1/<tabela>` com `apikey`/`Authorization` da chave de serviço e `Accept-Profile`/`Content-Profile: armag`.

- [ ] **Step 1: Testes que falham** (fetch falso que encaminha por URL)
  - Sem token, ou com token errado → 401, e nenhuma chamada ao Google ou ao REST.
  - `pedido "cinco barbearias"` com o Google devolvendo 7 válidos, um deles já lead e outro com telefone de cliente:
    - insere 5;
    - `falar` começa com "Pronto! Criei 5";
    - incrementa o uso uma vez por busca.
  - O Google devolve 2 válidos → `falar` começa com "Só achei 2".
  - O Google responde 403 → status 200 com `falar === fraseErro()`, nada inserido e uso não incrementado.
  - `GOOGLE_PLACES_KEY` vazia → mesmo comportamento do 403.
  - `mensagem` → `link_whatsapp` começa com "https://wa.me/55" e o texto chega com acentos codificados. Barbearia → `anexar_video` true.
  - `marcar_status` com status inválido → 400.
  - Ação desconhecida → 400.
  - Uso em 301 → a resposta traz `aviso_cota`.
- [ ] **Step 2:** Rodar `npx vitest run supabase/functions/bob` e esperar FAIL.
- [ ] **Step 3:** Implementar `handler.ts`, `index.ts`, a migração e o script de deploy. Ajustar `Lead.source`.
- [ ] **Step 4:** Rodar todos os testes do app (`npm test --workspace apps/cobrancas`) e `npm run build:cobrancas`. Esperar tudo PASS e build OK.
- [ ] **Step 5: Aplicar e publicar.**
  - Aplicar a migração com a query da Management API e conferir com `select … from information_schema`.
  - Gerar `BOB_TOKEN` com `openssl rand -hex 24` e gravar o segredo da função `POST /v1/projects/{ref}/secrets`, junto com `PAINEL_URL`.
  - Subir o vídeo no bucket.
  - Rodar `deploy-bob.sh`.
  - **Smoke tests:**
    - curl sem token → 401;
    - com token e `listar` → 200;
    - com token e `pedido` sem chave do Google → `fraseErro`.
- [ ] **Step 6:** Commit.

### Task 5: Painel, com filtro "Hoje", vídeo e mensagem nova
**Files:**
- Modify: `apps/cobrancas/src/pages/ProspectingPage.tsx`
- Test: `apps/cobrancas/src/domain/prospect.test.ts`, com o helper puro `leadsDeHoje(leads, hoje)` em `prospect.ts`.

- [ ] **Step 1: Teste que falha**
  - `leadsDeHoje` retorna só os leads com `createdAt` na data de hoje.
  - Mantém a ordem mais nova primeiro.
- [ ] **Step 2:** Rodar e esperar FAIL.
- [ ] **Step 3:** Implementar.
  - **Helper:** `leadsDeHoje`.
  - **Filtro "Hoje" na lista de leads:**
    - ativo quando a URL tem `?hoje=1`, que é o que o Bob abre;
    - com o filtro ativo, aparece um cartão "Leads de hoje: N" no topo.
  - **Mensagem:** o botão WhatsApp passa `bairro` (extraído do `address`) e `segmento` para `renderProspectMessage`.
  - **Vídeo:** botão **"Baixar vídeo"** com o link público do vídeo em cada lead de barbearia ou salão.
- [ ] **Step 4:** `npm test --workspace apps/cobrancas` e `npm run build:cobrancas` passam. Captura com Playwright da tela `/prospeccao?hoje=1` em modo local, conferida visualmente.
- [ ] **Step 5:** Commit.

### Task 6: MCP `armag`
**Files:**
- Create: `packages/armag-mcp/package.json` (deps: `@modelcontextprotocol/sdk`, `zod`; `"type": "module"`)
- Create: `packages/armag-mcp/src/server.ts`
- Create: `packages/armag-mcp/src/bob-client.ts`: `chamarBob(acao, dados, { fetch, url, token? }) -> Promise<unknown>`, que lança o erro com status e mensagem.
- Create: `.mcp.json` na raiz: `{"mcpServers":{"armag":{"command":"node","args":["packages/armag-mcp/src/server.ts"]}}}`. O Node 22 remove os tipos sozinho; se a versão exigir, usar `--experimental-strip-types`.
- Test: `packages/armag-mcp/test/bob-client.test.ts` (`node --test`).

**Interfaces:**
- Consumes: o contrato do T4.
- Produces: as ferramentas `buscar_prospects`, `salvar_leads`, `mensagem_abordagem`, `marcar_status`, `listar_leads` e `pedido_bob { texto }`. Cada uma é um `chamarBob` com o schema zod correspondente.
- **Token:** o cabeçalho `X-Bob-Token` vem de `process.env.BOB_TOKEN` quando existir. Senão, fica por conta do proxy, que injeta a credencial do host `gxrvtdlcdqpirojyibbm.supabase.co`.

- [ ] **Step 1: Testes que falham**
  - `chamarBob("listar", {limite:5}, fakeFetch)` faz POST no endpoint com o corpo `{acao:"listar", limite:5}` e devolve o JSON.
  - Resposta 401 → erro contendo "token".
- [ ] **Step 2:** Rodar e esperar FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Os testes passam. Smoke test: `node packages/armag-mcp/src/server.ts` responde a `tools/list` por stdio (mensagens JSON-RPC `initialize` e `tools/list` via script) com as 6 ferramentas.
- [ ] **Step 5:** Commit.

### Task 7: Guia do iPhone, rotina diária e entrada no ar
**Files:**
- Create: `docs/bob-iphone.md`, o passo a passo do Atalho com as 5 ações do spec, os Atalhos Vocais e onde colar o token.
- Create: `marketing/prospeccao/ROTINA-DIARIA.md`, a receita da tarefa das 8h40:
  1. `pedido_bob "cinco"` (ou `buscar` + `salvar`);
  2. `mensagem_abordagem` de cada lead;
  3. enviar a lista numerada e o vídeo com SendUserFile;
  4. quando o dono responder "enviei 1, 2 e 4", chamar `marcar_status` com `contatado`.

- [ ] **Step 1:** Escrever os dois documentos.
- [ ] **Step 2: Depende do dono.** Ele cria o projeto no Google Cloud, ativa a Places API (New), gera a chave restrita à Places API e cola em Supabase → Edge Functions → Secrets como `GOOGLE_PLACES_KEY`.
- [ ] **Step 3:** Pedir com `request_credential` o `X-Bob-Token` para o host do Supabase (para o MCP). Teste real: `pedido_bob "dois"` cria 2 leads.
- [ ] **Step 4:** Criar a tarefa agendada (sessão nova a cada disparo, push ligado) com cron `CRON_TZ=America/Sao_Paulo 40 8 * * 1-5` e o prompt "Siga marketing/prospeccao/ROTINA-DIARIA.md".
- [ ] **Step 5:** Commit e push.
