# Card frames

M15 card frames and power/toughness boxes for `RenderedCard`, from Magic Set Editor's
[Basic M15 Magic Pack](https://github.com/MagicSetEditorPacks/Basic-M15-Magic-Pack)
(`data/magic-modules.mse-include/cards/375 m15 simple/` and `pts/375 m15/`), converted to
WebP. Each frame is 375 × 523; `rendered-card.module.css` places the card's fields at the
pack's own coordinates (`data/magic-m15.mse-style/style`).

- `{w,u,b,r,g}card`: one color; `mcard` gold, `acard` artifact, `ccard` colorless.
- `{w,u,b,r,g,m,c}lcard`: lands, by the colors of mana they make.
- `{w,u,b,r,g,m,a,c}pt`: power/toughness boxes.

The frames recreate Wizards of the Coast's card frame design. The pack publishes no
license; they are used here, as in Magic Set Editor, for personal card previews.
