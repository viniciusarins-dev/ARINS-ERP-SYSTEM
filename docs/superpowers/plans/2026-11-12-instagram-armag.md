# Instagram ARMAG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A toolkit plus a scheduled routine. Claude generates ARMAG Instagram posts in the ARMAG brand, sends a preview, waits for the owner's "ok", and only then publishes via the Graph API at the scheduled slot.

**Architecture:**
- Plain Node (CommonJS) scripts live in `marketing/instagram-armag/`. Pure logic sits in `scripts/lib/*.cjs` and is unit-tested with `node:test`.
- I/O (Playwright render, Supabase Storage upload, Graph API) receives `fetch` by injection so it can be tested with fakes.
- Four recurring scheduled tasks (fresh session per fire, push notification on) run the instructions in `ROTINA.md`.

**Tech Stack:** Node 22 (`node:test`, global `fetch`), preinstalled Playwright/Chromium, FFmpeg (already used by the video project), Instagram Graph API v27.0, Supabase Storage (Arins-ERP project).

**Spec:** `docs/superpowers/specs/2026-11-12-instagram-armag-design.md`

## Global Constraints
- **Root:** all files live under `marketing/instagram-armag/`. No new npm dependencies.
- **Timezone:** America/Sao_Paulo.
- **Slots:**

  | Day | Time | Format |
  |---|---|---|
  | seg | 19:35 | carrossel |
  | ter | 12:10 | post |
  | qua | 19:40 | reel |
  | qui | 12:20 | carrossel |

- **Alert timing:** the alert fires ~60 min before each slot.
- **Confirmation window:** without confirmation by slot + 3 h, the post is skipped, never published.
- **Image sizes:** 1080×1350 PNG for posts and slides. Carousels have 2–10 slides.
- **Reels:** MP4 9:16, H.264 + AAC.
- **Caption:**
  - ≤ 2200 chars;
  - 5–8 hashtags, including at least one of `#joinville` / `#joinvillesc`;
  - must contain `(47) 98919-1953` or `wa.me/5547989191953`.
- **Brand:**
  - colours: ink `#050505`, gold `#d9a441`, cyan `#35ddfb`, ice `#f2f5f7`, mist `#9aa3ad`;
  - logo: `apps/cobrancas/public/brand/armag-logo.png`;
  - fonts: Anton, Montserrat, Inter (copy from `marketing/video-clube-da-navalha/composicao/fonts`).
- **Claims:** every product claim must come from `marca/o-que-vendemos.md`. Screens use fictitious data only.
- **Secrets:** never in the repo. The Meta token is set via `request_credential` for host `graph.facebook.com`. `IG_USER_ID` is passed as an env var or CLI flag.

## Review Focus
1. **Owner confirms late (after slot + 3 h)** → must not publish. Pinned in Task 2 (`decidir`).
2. **Reel container ends in `ERROR` or never finishes** → throw with the status, do not call publish, do not write history. Pinned in Task 5.
3. **Graph API returns 401/190 (expired token)** → clear error message naming the token, history untouched. Pinned in Task 5.
4. **Same post published twice** (session re-run) → refused, because history already has a `media_id` for that slug. Pinned in Tasks 3 and 5.
5. **Caption with accents/emoji near the limit** → length counted in code points, accents preserved through render and API. Pinned in Task 2.

---

### Task 1: Brand kit, product fact sheet, pillars, calendar

**Files:**
- Create: `marketing/instagram-armag/marca/armag-logo.png` (copy), `marca/fonts/*` (copy), `marca/tokens.css`
- Create: `marketing/instagram-armag/marca/o-que-vendemos.md`, `marca/pilares.md`, `calendario.json`

**Interfaces:**
- Produces:
  - `calendario.json` = `{ "fuso": "America/Sao_Paulo", "slots": [{ "id": "seg", "dia": 1, "hora": "19:35", "formato": "carrossel" }, ...] }`, where `dia` is 0 = Sunday;
  - `tokens.css` CSS variables `--ink --gold --cyan --ice --mist` and the `@font-face` rules.

- [ ] **Step 1:** Copy the logo and fonts. Write `tokens.css` with the brand values above.
- [ ] **Step 2:** Write `o-que-vendemos.md`. Use only facts verified in code; no numbers or testimonials.
  - **Clube da Navalha:** the site from `marketing/video-clube-da-navalha/README.md` and the captured flow.
  - **Cobrança iPad:** facts from the `Cobranca-ipad` README (parcelas/juros, campanha em fila com anti-banimento, cron diário de atrasados, provedores, multiusuário).
  - **Painel ARMAG Cobranças:** facts from `apps/cobrancas` (mensagem por cliente com PIX, parcela em atraso, orçamentos, prospecção).
  - **Serviço:** "software sob medida / ajustes em sistema existente".
  - Top of the file: `Status: AGUARDANDO APROVAÇÃO DO DONO`.
- [ ] **Step 3:** Write `pilares.md` with 4 pillars, each with 5 example themes:
  - Dor do pequeno negócio;
  - Demonstração real;
  - Case ARMAG;
  - "Seu sistema já faz X, a gente adiciona Y".
- [ ] **Step 4:** Write `calendario.json` with the four slots from Global Constraints.
- [ ] **Step 5:** Commit (`feat(instagram): brand kit, fact sheet and calendar`).

### Task 2: Post model, validation and the publish decision

**Files:**
- Create: `marketing/instagram-armag/scripts/lib/post.cjs`, `scripts/lib/agenda.cjs`
- Test: `marketing/instagram-armag/test/post.test.cjs`, `test/agenda.test.cjs`

**Interfaces:**
- Produces:
  - `post.json` shape: `{ slug, slot: "seg"|"ter"|"qua"|"qui", data: "YYYY-MM-DD", formato: "post"|"carrossel"|"reel", tema, pilar, legenda, slides?: [{ titulo, texto?, destaque?, imagem? }], video?: "arquivo.mp4" }`;
  - `validarPost(post) -> string[]` (an empty list means valid);
  - `horarioDoSlot(calendario, slotId, dataISO) -> Date`, the slot instant in São Paulo as a UTC Date;
  - `decidir(agora: Date, horario: Date, confirmado: boolean) -> "aguardar"|"agendar"|"publicar"|"pular"`.

- [ ] **Step 1: Write failing tests.**
  - `validarPost`:
    - legenda of 2201 code points → error containing `"2200"`;
    - legenda with 4 hashtags → error `"hashtags"`;
    - legenda missing both phone forms → error `"WhatsApp"`;
    - legenda without `#joinville`/`#joinvillesc` → error `"joinville"`;
    - carrossel with 1 or 11 slides → error;
    - reel without `video` → error;
    - a valid carrossel (3 slides, caption with "Ação", 🚀, 6 hashtags incl. #joinville and the phone) → `[]`;
    - emoji counts as 1 code point.
  - `horarioDoSlot(cal, "qua", "2026-11-18")` → `2026-11-18T22:40:00.000Z`.
  - `decidir`, with horario = H:
    - not confirmed, now = H − 30 min → `aguardar`;
    - confirmed at H − 30 min → `agendar`;
    - confirmed at H + 10 min → `publicar`;
    - confirmed at H + 3 h + 1 min → `pular`;
    - not confirmed at H + 3 h + 1 min → `pular`.
- [ ] **Step 2:** Run `node --test marketing/instagram-armag/test/` and expect FAIL (module not found).
- [ ] **Step 3:** Implement both modules.
  - Count characters with `[...str].length`.
  - Hashtags match `/#[\p{L}\p{N}_]+/gu`.
  - São Paulo has no DST, so the offset is fixed at −03:00.
- [ ] **Step 4:** Run the tests and expect all PASS.
- [ ] **Step 5:** Commit.

### Task 3: History with duplicate protection

**Files:**
- Create: `marketing/instagram-armag/scripts/lib/historico.cjs`, `historico.json` (initial `[]`)
- Test: `marketing/instagram-armag/test/historico.test.cjs`

**Interfaces:**
- Produces:
  - `lerHistorico(arquivo) -> Entry[]`;
  - `registrar(arquivo, { slug, data, slot, formato, tema, pilar, status: "publicado"|"pulado", media_id?, permalink? })`;
  - `jaPublicado(hist, slug) -> boolean`;
  - `temasRecentes(hist, n = 12) -> string[]`.

- [ ] **Step 1: Write failing tests** (use a temp file).
  - `registrar` followed by `jaPublicado` → true.
  - A slug registered with status `pulado` → `jaPublicado` false.
  - `registrar` of a slug already published → throws `"já publicado"`.
  - `temasRecentes` returns the newest themes first, at most n.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement. Write the JSON with 2-space indent and UTF-8.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit.

### Task 4: Templates and renderer

**Files:**
- Create: `marketing/instagram-armag/templates/peca.html` (one template, 1080×1350, used for posts and every carousel slide; variant via `?tipo=capa|conteudo|cta`)
- Create: `marketing/instagram-armag/scripts/render.cjs`
- Create: `marketing/instagram-armag/posts/exemplo/post.json` (fixture)
- Test: `marketing/instagram-armag/test/render.test.cjs`

**Interfaces:**
- Consumes: `validarPost` (Task 2) and `tokens.css` (Task 1).
- Produces:
  - `renderizar(pastaDoPost) -> Promise<string[]>`: the absolute paths of `01.png…NN.png`, written in the post folder;
  - CLI: `node scripts/render.cjs posts/<slug>`.
  - Slide titles use the video project's `*palavra*` syntax for gold highlights.
  - The first slide is a `capa` (big Anton hook). For carousels, the last is a `cta` (logo, "Chama no WhatsApp", phone).
  - A slide with `imagem` shows that real screenshot inside a phone frame.

- [ ] **Step 1: Write the failing test.**
  - Render `posts/exemplo` (a carrossel with 3 slides).
  - Expect 3 PNG files.
  - Each must be 1080×1350: read the IHDR bytes 16–23 of the PNG.
  - The text must not overflow: the template sets `data-overflow="1"` on `body` when any text box has scrollHeight > clientHeight, and `renderizar` throws in that case.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement the template and renderer.
  - Serve the folder over a local HTTP server, as `4-renderizar.cjs` does.
  - Use viewport 1080×1350 with deviceScaleFactor 1, and run `validarPost` first.
- [ ] **Step 4:** Run and expect PASS. Look at the 3 PNGs (Read tool) for layout sanity.
- [ ] **Step 5:** Commit.

### Task 5: Hosting and Graph API publisher

**Files:**
- Create: `marketing/instagram-armag/scripts/lib/graph.cjs`, `scripts/lib/hospedagem.cjs`, `scripts/publicar.cjs`
- Test: `marketing/instagram-armag/test/graph.test.cjs`

**Interfaces:**
- Consumes: `validarPost`, `registrar`, `jaPublicado`.
- Produces:
  - `hospedar(arquivoLocal, destino, { fetch, url, chave }) -> Promise<string>`, the public URL. It uploads to the Supabase Storage bucket `instagram-armag` (public) with `x-upsert: true`.
  - `publicarPost(post, urls, { fetch, igUserId, esperaMs = 5000, tentativas = 60 }) -> Promise<{ media_id, permalink }>`:
    - **post:** `POST /{ig}/media {image_url, caption}`;
    - **carrossel:** one child container per image (`is_carousel_item=true`), then `{media_type:"CAROUSEL", children, caption}`;
    - **reel:** `{media_type:"REELS", video_url, caption, share_to_feed:true}`, then poll `GET /{container}?fields=status_code` until `FINISHED`.
    - All types end with `POST /{ig}/media_publish {creation_id}` and `GET /{media}?fields=permalink`.
  - Base URL: `https://graph.facebook.com/v21.0`. No token in code (the proxy injects the Authorization header).
  - CLI: `node scripts/publicar.cjs posts/<slug> --ig <IG_USER_ID> [--dry-run]`. It refuses when `jaPublicado`. On success it calls `registrar(..., status "publicado")`. `--dry-run` prints the planned API calls and touches nothing.

- [ ] **Step 1: Write failing tests** with a fake `fetch` that records calls and returns scripted JSON.
  - **post:** 3 calls in order (media, media_publish, permalink); the caption is sent unchanged, including "Ação 🚀".
  - **carrossel with 3 images:** 3 child calls, 1 CAROUSEL call with `children` = the 3 ids, then publish.
  - **reel:** the status sequence `IN_PROGRESS` then `FINISHED` publishes. A status `ERROR` rejects with a message containing `"ERROR"`, and media_publish is never called. Never reaching FINISHED within `tentativas` rejects with `"tempo"`.
  - **expired token:** HTTP 401 with `{error:{code:190}}` rejects with a message containing `"token"`.
  - **CLI guard:** calling publish on a slug already in history throws `"já publicado"` before any fetch.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement. Run tests with `esperaMs: 0`.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit.

### Task 6: Insights reader

**Files:**
- Create: `marketing/instagram-armag/scripts/lib/metricas.cjs`, `scripts/metricas.cjs`
- Test: `marketing/instagram-armag/test/metricas.test.cjs`

**Interfaces:**
- Produces:
  - `coletar(hist, { fetch }) -> Promise<Array<{ slug, slot, formato, alcance, salvos, compartilhamentos, visitas_perfil }>>`, using `GET /{media_id}/insights?metric=reach,saved,shares,profile_visits`;
  - `resumoPorSlot(linhas) -> Array<{ slot, posts, alcanceMedio }>`, sorted by alcanceMedio descending.
  - The CLI prints a Markdown table.

- [ ] **Step 1: Write failing tests.**
  - The fake fetch returns insights for 3 entries in 2 slots; the averages and the ordering must be correct.
  - Entries with status `pulado` are ignored.
- [ ] **Step 2:** Run and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run and expect PASS.
- [ ] **Step 5:** Commit.

### Task 7: Routine instructions, first week of content, ad pack

**Files:**
- Create: `marketing/instagram-armag/ROTINA.md`, `marketing/instagram-armag/anuncio-meta.md`, `marketing/instagram-armag/README.md`
- Create: `marketing/instagram-armag/posts/<data>-<slug>/post.json` + rendered PNGs, for the 4 slots of the first week
  - the reel reuses the 23 s short: copy `marketing/video-clube-da-navalha/saida/clube-da-navalha-curta.mp4` (gitignored there, ~6 MB) into the reel's post folder as `video.mp4`.

**Interfaces:**
- Consumes: every CLI above.

- [ ] **Step 1: Write `ROTINA.md`**, the exact procedure a fired session follows:
  1. `git pull`;
  2. read `calendario.json`, `o-que-vendemos.md`, `pilares.md` and `temasRecentes`;
  3. pick a theme (pillar rotation, no repeat of the last 12);
  4. write `post.json`, render it, check the PNGs visually;
  5. send the preview with SendUserFile and the caption as text, then ask "Confirma a publicação às HH:MM? (ok / ajuste: … / pular)";
  6. on reply, apply `decidir`: `agendar` → `send_later` at the slot with "publicar posts/<slug>"; `publicar` → run `publicar.cjs`; `pular` → `registrar` status `pulado`;
  7. commit and push `posts/<slug>` and `historico.json`;
  8. never publish without an explicit "ok" in this session.
- [ ] **Step 2: Produce the first week** (4 posts, one per pillar) and render them.
  - `node --test` and `validarPost` must pass for each.
  - Inspect every PNG.
- [ ] **Step 3: Write `anuncio-meta.md`.**
  - 3 copy variants (primary text ≤ 125 chars, headline ≤ 40);
  - objective "Mensagens (WhatsApp)";
  - location Joinville +25 km, ages 25–55, interests pequenas empresas / empreendedorismo;
  - suggested R$ 15–20/day for 7 days;
  - Ads Manager steps;
  - video: the 23 s short.
- [ ] **Step 4: Write `README.md`.**
  - Owner setup: Instagram professional account → linked Facebook Page → Meta app with Instagram Graph API → System User token with the permissions listed in the spec → where to find `IG_USER_ID`.
  - Supabase bucket creation.
  - How to run each script.
- [ ] **Step 5:** Commit and push.

### Task 8: Go-live (requires the owner's Meta setup)

- [ ] **Step 1:** `get_environment`, then propose `graph.facebook.com` and the Supabase storage host if they are blocked. Request the credential for `graph.facebook.com` (bearer).
- [ ] **Step 2:** Create the public bucket `instagram-armag` and request the storage credential if needed.
- [ ] **Step 3:** Run `publicar.cjs --dry-run` on week-1 post 1. Then do one real publication that the owner confirms in chat. Check the permalink.
- [ ] **Step 4:** Create the 4 recurring scheduled tasks:
  - fresh session per fire, `notifications: {push: true}`;
  - cron 60 min before each slot: `CRON_TZ=America/Sao_Paulo 35 18 * * 1`, `10 11 * * 2`, `40 18 * * 3`, `20 11 * * 4`;
  - prompt: "Siga marketing/instagram-armag/ROTINA.md para o slot <id> de hoje."
- [ ] **Step 5:** Create a scheduled task for week 6 that runs `metricas.cjs` and asks the owner before changing `calendario.json`.
- [ ] **Step 6:** Report the task names and next fire times to the owner.
