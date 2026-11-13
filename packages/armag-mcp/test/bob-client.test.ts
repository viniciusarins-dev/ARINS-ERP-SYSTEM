import { test } from "node:test";
import assert from "node:assert/strict";
import { BOB_URL, chamarBob } from "../src/bob-client.ts";

const resposta = (status: number, json: unknown) => ({ ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) }) as unknown as Response;

test("POST no serviço com a ação e os dados", async () => {
  const chamadas: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string, init: RequestInit) => { chamadas.push({ url, init }); return resposta(200, { leads: [] }); }) as typeof globalThis.fetch;
  const r = await chamarBob("listar", { limite: 5 }, { fetch, token: "t" });
  assert.deepEqual(r, { leads: [] });
  assert.equal(chamadas[0].url, BOB_URL);
  assert.equal(chamadas[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(chamadas[0].init.body)), { acao: "listar", limite: 5 });
  assert.equal((chamadas[0].init.headers as Record<string, string>)["X-Bob-Token"], "t");
});

test("sem token local, não manda o cabeçalho (o proxy injeta)", async () => {
  let h: Record<string, string> = {};
  const fetch = (async (_: string, init: RequestInit) => { h = init.headers as Record<string, string>; return resposta(200, {}); }) as typeof globalThis.fetch;
  await chamarBob("listar", {}, { fetch });
  assert.equal("X-Bob-Token" in h, false);
});

test("401 vira erro falando do token", async () => {
  const fetch = (async () => resposta(401, { erro: "não autorizado" })) as typeof globalThis.fetch;
  await assert.rejects(chamarBob("listar", {}, { fetch }), /token/);
});

test("400 traz a mensagem do serviço", async () => {
  const fetch = (async () => resposta(400, { erro: "status inválido" })) as typeof globalThis.fetch;
  await assert.rejects(chamarBob("marcar_status", {}, { fetch }), /status inválido/);
});
