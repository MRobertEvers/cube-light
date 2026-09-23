# Banner blending

Generation is an explicit asynchronous save operation. `generateAndSaveBannerBlend`
starts a worker only when artwork is saved in the picker, a crop is saved, or the
user clicks **Generate and save blend**. Saving a crop reuses the current blend and
subject settings. In the crop editor, moving the art re-runs an unsaved preview
(`previewBannerBlend`, debounced) with those same settings; page loads and resize
events never start a blend calculation. Existing decks without an artifact show a CSS
fade until the user generates one.

The worker decodes the art, applies the saved crop, composites in linear RGB, and
encodes desktop, mobile, and tile PNGs. All image processing and PNG encoding stay
in the worker. Only progress strings and the final encoded images cross to the
main thread. Loading/errors are surfaced in the settings UI; errors are retryable.

Methods:

- **Multiband:** Gaussian image/mask pyramids, Laplacian detail bands, independent
  blending at each scale, then reconstruction. Based on Burt and Adelson's
  multiresolution spline: https://ai.stanford.edu/~kosecka/burt-adelson-spline83.pdf
- **Poisson:** a screened Poisson solve matching tapered source gradients, with a
  small fidelity term anchoring colors to the initial composite. Fixed red/black
  Gauss-Seidel sweeps prevent scheduling-dependent numerical changes. The fidelity
  term limits color drift onto a flat surface. Foundation:
  https://legacy.sites.fas.harvard.edu/~cs278/papers/poisson.pdf
- **Content-aware seam:** optional for every method. A bounded dynamic-programming
  path penalizes image edges, distance from the chosen position, and bends. Fixed
  tie-breaking gives repeatable paths. This is a simpler path-search adaptation of
  content-driven seam placement, not the graph-cut algorithm in Photomontage:
  https://grail.cs.washington.edu/projects/photomontage/
- **Soft fade:** reference compositor using the same crop, surface, and optional seam.

## Transition geometry (algorithm version 2)

The seam search covers ±12% of the width around the requested position (was ±4.5%),
bounded so the band ends by `SURFACE_START` (68%). The per-pixel cost combines the
Sobel edge crossed by the centre line, local detail energy (edge density), the detail
the band would wash out (weighted by the fade profile), and, with a protected subject,
the protected alpha the foreground gate would fade. The DP path is smoothed with a
fixed Gaussian. The fade is driven by the slope-corrected distance to that curve, so
the band follows the boundary instead of a fixed column range. Seam-relative guards
restore the exact source before the band and the exact surface after it; `max()`
with the surface limit guarantees the HTML color from 68% on even for steep curves.

## Subject-preserving mode

"Protect subject" runs, once per generation in source-image coordinates:

1. **Segmentation — GrabCut** (Rother et al. 2004) on a ≤280 px working image:
   rectangle outside = background, inside = probable foreground; keep/blend brush
   strokes are hard labels. Five-component full-covariance GMMs, γ = 50, 8-neighbour
   n-links, λ = 8γ+1, five iterations, as in OpenCV's reference implementation. GMMs
   are initialised with Orchard–Bouman principal-axis splitting (no random seed), and
   the min-cut uses a Boykov–Kolmogorov max-flow with fixed traversal order.
   Strokes are also re-applied as hard constraints at full resolution.
2. **Guided mask refinement** (He et al. 2010, color guided filter, ε = 1e-4,
   radius = *Edge feather*) with the original art as guidance. It only replaces
   alpha inside a band of that radius around the GrabCut boundary; elsewhere the
   hard label is kept. Faint tails are contracted to avoid a translucent halo. The
   filter refines edges; it does not find the subject.
3. **Edge color decontamination:** C = αF + (1−α)B. B is push–pull filled from
   pixels with α ≤ 0.02, and F = (C − (1−α)B)/α is bounded to the range spanned by C
   and the push–pull-filled local foreground (±0.04, linear), which prevents
   bright/dark fringes and oversaturation. Below α ≈ 0.25 the estimate blends toward
   the local foreground, and α = 0 pixels are untouched. *Edge color cleanup* scales
   the correction.
4. **Compositing:** each crop resamples α, F−C, and B−C with the same placement as
   the art. The background blend (multiband/Poisson/fade) runs on the art with the
   subject replaced by B, so no subject ghost is smeared into the fade. The
   decontaminated foreground is composited over it with `a = α·gate(d)`; the gate is
   1 up to just past the seam and 0 where the background is pure surface.

Selections (`protection`) are normalized source coordinates, tied to the artwork path,
so one selection serves desktop, mobile, and tile crops and survives crop changes.
Selecting new artwork discards the old selection at generation time. Saving new artwork
in the picker turns "Protect subject" on with the default subject area
(`configForNewArtwork`), except on phones and tablets (`DeviceProfile.isMobile`: mobile
user-agent hint, or no hover with a coarse pointer), where it starts off. The mask
preview is an explicit button that runs the same pipeline in the worker.

Obsolete work: starting a generation or mask preview terminates the previous worker of
that kind, and its promise rejects with `BannerBlendCancelled` (status becomes
"replaced", not an error). Messages carry a request id, so late messages are ignored.
The server still rejects saves whose source or crop changed.

Persistence and migration: `version` is stored in the config and hashed with source,
crop, config (including the protection mask), and PNG bytes into the revision. Version
1 configs (five fields) remain valid on the server and keep their saved images until
the user explicitly generates again; the client fills defaults via
`normalizeBannerBlendConfig`. `DeckBannerBlends.HistoryJson` is an additive column
holding a compact edit-history value (brush point lists replaced by a count).

Remaining limitations: segmentation is color-based. Subjects whose colors match the
background need brush corrections. On narrow mobile/tile cards the right-aligned title
starts well before the 68% surface limit, so a protected subject can sit under the
text.

No border column is stretched. Full source pixels are used throughout the blend
region; the far left remains the original art and the far right is exactly the
configured HTML surface color. Position, width, crop, and method remain adjustable.

`DeckBannerBlends` persists the configuration and all three PNGs in SQLite. Deck
responses contain only configuration and immutable, content-versioned image URLs.
The image endpoint supports ETags and a one-year immutable browser cache. A source
or crop change invalidates the current URLs in deck metadata without recomputing
anything. Uploads are checked against current source/crop again inside the save
transaction to reject stale background work. Cached output works across reloads,
server restarts, and browsers; no IndexedDB cache miss can trigger a recomputation.

## Implementation: C compiled to WebAssembly

All numeric pixel work (GrabCut, max-flow, guided filter, push–pull, decontamination,
seam search, multiband/Poisson/fade compositing) lives in `native/banner_blend.c` and
runs as `src/platform/wasm/banner-blend.wasm` (59 kB, 28.5 kB gzipped) inside the worker.
`banner-wasm.ts` only copies arrays in and out. TypeScript still handles decoding,
crop placement, resampling of the subject planes, brush rasterisation, and PNG
encoding; these use only + − × ÷, floor/ceil and sqrt, which are exact in every JS
engine. We chose our own C over OpenCV.js (~8 MB) to keep the download small and
every numerical step pinned.

The compiled `.wasm` is checked in, so `npm run build`/`dev` do not need Emscripten.
After editing the C, run `npm run build:wasm` (needs `emcc`) and commit the new binary.

Why WASM: JavaScript engines may implement `Math.exp/log/pow` with different last-bit
results. The module carries its own libm and is built without fast-math, so identical
RGBA input and configuration give identical bytes in every engine. Verified: the same
synthetic subject and all three blend methods hashed identically in V8 (Chrome) and
JavaScriptCore (bun). The C port was also checked against the previous TypeScript
implementation on real card art: 0 differing bytes across 36 renders (2 artworks × 3
crops × 3 methods × protection on/off) and identical subject planes.

Performance (Chrome, 626×457 art, same tab, medians): subject extraction
392 → 207 ms, desktop multiband blend 72 → 29 ms. A full protected generation with
Poisson takes about 0.53 s in the worker, down from 1.38 s. The largest remaining cost is
the desktop seam search (its band integral grows with width × band); it is exact, not
approximated.

Remaining caveat: images decoded and resampled by the browser's canvas (`drawImage`)
can still differ slightly between engines, as can PNG encoders. So a newly generated
PNG is only bit-identical across browsers when the decoded pixels are. Once saved,
every browser receives the same persisted PNG. Once saved,
every browser receives the same persisted PNG. Fixed output dimensions avoid
regeneration for viewport/DPR changes.

Verification: `bun test test/` in clientv2 and
`node --test test/banner-blend.test.js` in the server after compiling it.
