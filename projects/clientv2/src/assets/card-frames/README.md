# Card frames

M15 card frames for `RenderedCard`, from the archived Card Conjurer
(https://github.com/fiahdrgn473/CardConjurer, `data/images/cardImages/m15/`), vendored on
2026-09-26 and converted to WebP. Frames are drawn on a 1500 × 2100 card (stored at 1050
wide); `rendered-card.module.css` places the card's fields at Card Conjurer's M15
coordinates (`data/scripts/versions/m15/version.js` and `regular.js`).

- `frame-{w,u,b,r,g}`: one color; `frame-m` gold, `frame-a` artifact, `frame-v` vehicle,
  `frame-l` land. Each is open over the art.
- `pt-{w,u,b,r,g,m,a,c}`: power/toughness boxes, 282 × 154 at (1136, 1858).
- `mask-pinline`: the frame's pinlines, through which a land shows the colors of mana it makes.
- `pw-frame-{w,u,b,r,g,m,a}`: planeswalker frames (`data/images/cardImages/planeswalker/`),
  open over the art and abilities down to the loyalty box, laid out per
  `data/scripts/versions/m15Planeswalker/version.js`.
- `pw-plus`, `pw-minus`, `pw-neutral`: loyalty ability cost shields.
- `pw-tear-{odd,even}-{upper,lower}`: masks for the torn edge where a planeswalker's light
  and dark ability bands meet, made from `abilityLineOdd.png` (light over dark) and
  `abilityLineEven.png` (dark over light): each line's lower shade as `lower`, its complement
  as `upper`, solid three rows from each end. Each band is masked by one, so the two shades
  meet along the tear and never overlap or leave a gap.

The frames recreate Wizards of the Coast's card frame design and come with no license:
fine for personal card previews, not for publishing.
