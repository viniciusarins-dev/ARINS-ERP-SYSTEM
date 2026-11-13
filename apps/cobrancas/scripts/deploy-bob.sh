#!/usr/bin/env bash
# Empacota a Edge Function "bob" num arquivo só (esbuild) e publica no projeto Arins-ERP
# pela Management API do Supabase (o token vem do ambiente/proxy; nunca fica no repositório).
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${SUPABASE_PROJECT_REF:-gxrvtdlcdqpirojyibbm}"
OUT=dist-functions/bob
rm -rf "$OUT" && mkdir -p "$OUT"
npx --yes esbuild@0.24.2 supabase/functions/bob/index.ts --bundle --format=esm --platform=neutral \
  --target=es2022 --main-fields=module,main --outfile="$OUT/index.js" --log-level=warning
AUTH=()
[ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
curl -sS --fail-with-body -X POST "https://api.supabase.com/v1/projects/$REF/functions/deploy?slug=bob" "${AUTH[@]}" \
  -F 'metadata={"entrypoint_path":"index.js","name":"bob","verify_jwt":false};type=application/json' \
  -F "file=@$OUT/index.js;filename=index.js;type=application/javascript"
echo
