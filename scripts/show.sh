#!/usr/bin/env bash
# show.sh <tsv> [n] [seed]: prints context around n sampled findings
f=$1; n=${2:-5}; seed=${3:-1}
shuf -n $n --random-source=<(yes $seed) "$f" | while IFS=$'\t' read repo loc dims; do
  file=${loc%:*}; line=${loc##*:}; echo "=== $repo $loc $dims"; sed -n "$((line>3?line-3:1)),$((line+${CTX:-8}))p" "${REPOS_DIR:?set REPOS_DIR}/$repo/$file"; done
