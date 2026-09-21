# Banner blending

Generation is an explicit asynchronous save operation. `generateAndSaveBannerBlend`
starts a worker only when artwork is saved in the picker, a crop is saved, or the
user clicks **Generate and save blend**. Components, page loads, and resize events
never start a blend calculation. Existing decks without an artifact show a CSS
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

No border column is stretched. Full source pixels are used throughout the blend
region; the far left remains the original art and the far right is exactly the
configured HTML surface color. The seam heuristic does not identify semantic
subjects. Position, width, crop, and method remain adjustable.

`DeckBannerBlends` persists the configuration and all three PNGs in SQLite. Deck
responses contain only configuration and immutable, content-versioned image URLs.
The image endpoint supports ETags and a one-year immutable browser cache. A source
or crop change invalidates the current URLs in deck metadata without recomputing
anything. Uploads are checked against current source/crop again inside the save
transaction to reject stale background work. Cached output works across reloads,
server restarts, and browsers; no IndexedDB cache miss can trigger a recomputation.

The numerical algorithm is deterministic for the same RGBA input and configuration.
Browser image decoding/resampling can differ slightly between engines; strict
cross-engine bit identity of a newly generated PNG is not promised. Once saved,
every browser receives the same persisted PNG. Fixed output dimensions avoid
regeneration for viewport/DPR changes.

Verification: `bun test test/banner-blend.test.ts` in clientv2 and
`node --test test/banner-blend.test.js` in the server after compiling it.
