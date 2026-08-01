#!/usr/bin/env bash
# Regenerate a SELF-CONTAINED Next app from this monorepo (spec §2.7), for hosts that
# cannot build a pnpm workspace directly. Core is folded in at ./core and imported as
# @pocketpulse/core via a tsconfig path alias — no import statement changes.
#
# Usage: bash scripts/make-standalone.sh [OUT_DIR]   (default: ./.standalone)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/.standalone}"

rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a --exclude node_modules --exclude .next --exclude .env.local "$ROOT/apps/web/" "$OUT/"
cp -r "$ROOT/packages/core/src" "$OUT/core"

# package.json: drop the workspace dep, add server-only.
node -e '
  const p = require("'"$OUT"'/package.json");
  p.name = "pocketpulse-web";
  delete p.dependencies["@pocketpulse/core"];
  p.dependencies["server-only"] = "^0.0.1";
  delete p.scripts.lint;
  require("fs").writeFileSync("'"$OUT"'/package.json", JSON.stringify(p, null, 2) + "\n");
'

# tsconfig.json: map @pocketpulse/core -> ./core
node -e '
  const fs = require("fs");
  const f = "'"$OUT"'/tsconfig.json";
  const t = JSON.parse(fs.readFileSync(f, "utf8"));
  t.compilerOptions.paths = t.compilerOptions.paths || {};
  t.compilerOptions.paths["@pocketpulse/core"] = ["./core/index.ts"];
  t.compilerOptions.paths["@pocketpulse/core/*"] = ["./core/*"];
  fs.writeFileSync(f, JSON.stringify(t, null, 2) + "\n");
'

# next.config.ts: no transpilePackages needed (core is app source now).
cat > "$OUT/next.config.ts" <<'EOF'
import type { NextConfig } from "next";
const config: NextConfig = {};
export default config;
EOF

echo "Standalone bundle ready at: $OUT"
echo "Deploy:  cd $OUT && vercel --yes --prod"
