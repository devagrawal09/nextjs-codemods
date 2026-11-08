#!/usr/bin/env bash
# Runs every detection codemod (or the ones named as args) against every audited repo
# and writes FINDING lines to results/<codemod>.tsv: repo, file:line, dimensions.
# Usage: REPOS_DIR=/path/to/clones scripts/run-all.sh [codemod...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPOS_DIR="${REPOS_DIR:?set REPOS_DIR to a folder holding the cloned repos}"
TEST_PATHS='(/__tests__/|/__stories__/|/stories/|/tests?/|/e2e/|/playwright/|/__mocks__/|/fixtures?/|\.(test|spec|stories|e2e)\.[jt]sx?:)'
mkdir -p "$ROOT/results"
codemods=("$@"); [ ${#codemods[@]} -eq 0 ] && codemods=($(ls "$ROOT/codemods"))
for cm in "${codemods[@]}"; do
  out="$ROOT/results/$cm.tsv"; : > "$out"
  for repo in "$REPOS_DIR"/*/; do
    name=$(basename "$repo"); real=$(cd "$repo" && pwd -P)
    codemod jssg run --language tsx -t "$real" "$ROOT/codemods/$cm/scripts/codemod.ts" \
      --no-interactive --allow-dirty --dry-run --disable-analytics --param locations=1 2>/dev/null \
      | grep -a $'FINDING\t' | sed "s|$real/||" | awk -F'\t' -v r="$name" 'BEGIN{OFS="\t"}{print r,$3,$4}' \
      | grep -Ev "$TEST_PATHS" >> "$out" || true
  done
  printf '%-30s' "$cm"; cut -f1 "$out" | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}'; echo " total=$(wc -l < "$out")"
done
