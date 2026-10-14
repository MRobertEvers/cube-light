# Vendored: artcache

- Original: the mtg-ai repository, `torimtg/3rd/artcache/` (`artcache.h`, `artcache.c`,
  `FORMAT.md`). It builds on the SQLite amalgamation beside it, `3rd/sqlite/`, copied from mtg-ai's
  `torimtg/3rd/sqlite/` with it.
- Copied by `scripts/sync-artcache.sh` (`scripts/sync-artcache.sh [path to mtg-ai]`, else
  `$MTG_AI`, else `../mtg-ai` beside this repository). It reports each file it changed.
- **Never edit these files here.** Change the original in mtg-ai, then re-sync, so both
  repositories keep one copy of the library and of the folder format (`FORMAT.md`) they share.

Built into the server's `artcache` addon (`projects/server/binding.gyp`,
`projects/server/native/artcache_addon.c`).
