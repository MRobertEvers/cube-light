# Set symbols

Every set's expansion symbol, vendored from the [Scryfall sets API](https://scryfall.com/docs/api/sets) on 2026-09-26 by `tools/vendor-set-symbols.mjs`. Rerun that script to pick up new sets.

- `set-symbols.svg`: one `<symbol id="<icon>">` per distinct icon, with fills removed so the page colors it by rarity and path numbers rounded.
- `set-symbol-sizes.json`: icon id → `[width, height]` of its viewBox, which `tools/tighten-set-symbols.mjs` crops to the symbol's shapes so every symbol fits its place on a card at a like size.
- `set-icons.json`: lower-case set code → icon id. Many sets (promos, tokens, reprints) share one icon; sets whose icon Scryfall no longer serves use `default`.

The symbols remain the property of Wizards of the Coast.
