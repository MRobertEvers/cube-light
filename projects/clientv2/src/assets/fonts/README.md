# Card fonts

Fonts for cards drawn from their text (`ui/kit/components/RenderedCard`), served from the app's own assets so the release precaches them and they draw offline. Sizes follow Card Conjurer's M15 layout on a 1500 × 2100 card.

- `beleren-bold.woff`: Beleren Bold, for names (80), type lines (68) and power/toughness (78). The same file as `public/ocr/models/fonts/beleren.woff`, from https://github.com/Saeris/typeface-beleren-bold, revision `cdbe3dc354a51b620636f8effd4c4b143d8969a1` (upstream package MIT).
- `beleren-bsc.ttf`: Beleren Bold Small Caps, for the artist's name in the collector line.
- `mplantin.ttf`, `mplantin-i.ttf`: MPlantin and MPlantin Italic, for rules (74) and flavor text.
- `gotham-medium.ttf`: Gotham Medium, for the collector lines (36).

`beleren-bsc.ttf`, `mplantin*.ttf` and `gotham-medium.ttf` are copied from the archived Card Conjurer (https://github.com/fiahdrgn473/CardConjurer, `data/fonts/`), vendored on 2026-09-26. They are commercial typefaces (Beleren by Wizards of the Coast; Plantin and Gotham by their foundries) with no license granted here: fine for personal card previews, not for publishing.
