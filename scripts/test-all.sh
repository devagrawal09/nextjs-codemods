#!/usr/bin/env bash
# Runs every codemod's fixtures and prints one verbose line per spec.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; status=0
for dir in "$ROOT"/codemods/*/; do
  echo "## $(basename "$dir")"
  (cd "$dir" && codemod jssg test -l tsx scripts/codemod.ts tests 2>&1 | grep -E '^test |test result') || status=1
done
exit $status
