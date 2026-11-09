#!/usr/bin/env bash
# Runs every detection codemod against one cloned repo, appending FINDING rows to
# $OUT/<codemod>.tsv and wall-clock seconds per codemod to $OUT/timings.tsv.
# Usage: OUT=results-wide [CODEMODS="a b"] scripts/run-repo.sh /path/to/repo
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
repo="$(cd "$1" && pwd -P)"; name=$(basename "$repo")
OUT="${OUT:-$ROOT/results}"; mkdir -p "$OUT"
TEST_PATHS='(/__tests__/|/__stories__/|/stories/|/tests?/|/e2e/|/playwright/|/__mocks__/|/fixtures?/|\.(test|spec|stories|e2e)\.[jt]sx?:)'
for cm in ${CODEMODS:-$(ls "$ROOT/codemods")}; do
  start=$(date +%s.%N)
  codemod jssg run --language tsx -t "$repo" "$ROOT/codemods/$cm/scripts/codemod.ts" \
    --no-interactive --allow-dirty --dry-run --disable-analytics --param locations=1 2>/dev/null \
    | grep -a $'FINDING\t' | sed "s|$repo/||" | awk -F'\t' -v r="$name" 'BEGIN{OFS="\t"}{print r,$3,$4}' \
    | grep -Ev "$TEST_PATHS" > "$OUT/.$cm.$name.tmp" || true
  printf '%s\t%s\t%.1f\n' "$name" "$cm" "$(echo "$(date +%s.%N) - $start" | bc)" >> "$OUT/timings.tsv"
done
