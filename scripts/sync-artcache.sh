#!/usr/bin/env bash
# Copies the shared card-art cache library (artcache) and the SQLite it builds on from an mtg-ai
# checkout into 3rd/. mtg-ai's torimtg/3rd/artcache is the original (3rd/artcache/FORMAT.md):
# change it there, then run this to bring cube-light's copy up to date.
#
#   scripts/sync-artcache.sh [path to mtg-ai]    (else $MTG_AI, else ../mtg-ai beside this repo)
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mtg_ai="${1:-${MTG_AI:-$repo/../mtg-ai}}"
source_3rd="$mtg_ai/torimtg/3rd"

if [ ! -f "$source_3rd/artcache/artcache.h" ]; then
	echo "sync-artcache: no artcache in $source_3rd (pass the mtg-ai checkout as \$1 or \$MTG_AI)" >&2
	exit 1
fi

files=(
	artcache/artcache.h
	artcache/artcache.c
	artcache/FORMAT.md
	sqlite/sqlite3.c
	sqlite/sqlite3.h
	sqlite/VENDOR.md
)

changed=0
for file in "${files[@]}"; do
	from="$source_3rd/$file"
	to="$repo/3rd/$file"
	if [ ! -f "$from" ]; then
		echo "sync-artcache: missing $from" >&2
		exit 1
	fi
	if [ -f "$to" ] && cmp -s "$from" "$to"; then
		continue
	fi
	if [ -f "$to" ]; then
		echo "changed  3rd/$file"
	else
		echo "added    3rd/$file"
	fi
	mkdir -p "$(dirname "$to")"
	cp "$from" "$to"
	changed=$((changed + 1))
done

if [ "$changed" -eq 0 ]; then
	echo "3rd/artcache and 3rd/sqlite already match $source_3rd"
else
	echo "$changed file(s) copied from $source_3rd; rebuild the server's addons (npm run build:addon)"
fi
