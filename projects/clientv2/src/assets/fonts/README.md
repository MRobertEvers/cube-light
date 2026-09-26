# Card fonts

Fonts for cards drawn from their text (`ui/kit/components/RenderedCard`), served from the app's own assets so the release precaches them and they draw offline.

- `beleren-bold.woff`: Beleren Bold, for names, type lines and stats. The same file as `public/ocr/models/fonts/beleren.woff`, from https://github.com/Saeris/typeface-beleren-bold, revision `cdbe3dc354a51b620636f8effd4c4b143d8969a1` (upstream package MIT).
- `eb-garamond-latin-400-normal.woff2`, `eb-garamond-latin-400-italic.woff2`: EB Garamond, Latin subset, for rules and flavor text. From `@fontsource/eb-garamond` 5.3.0, vendored on 2026-09-26. SIL Open Font License 1.1; see `EB-Garamond-OFL.txt`.
