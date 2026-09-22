# Client v2

This is a React single-page app built with Vite.

## Development

Use Node.js 20.19+ or 22.12+ and npm. From this directory:

```sh
npm install
npm run dev
```

The development server runs on port 3000 on all interfaces, so it is reachable at `http://localhost:3000` and from the LAN at `http://<hostname>.local:3000`. Start the backend separately. API requests go to port 4040 on whichever host served the page; set `VITE_BACKEND_HOST_URI` before starting Vite to use another backend URL.

## Import cards from a photo

Use **Create a deck from image** or **Add cards in image**. The selector offers:

| Choice | Browser pipeline | Intended tradeoff |
| --- | --- | --- |
| Card-aware (default) | Paddle text OCR, automatic title crops, printed-letter matching, reference title strips, Paddle medium verification | Best measured recovery: 12/12 names on the supplied photo |
| PaddleOCR · text only | Tiled text detection and recognition, followed by card-catalog matching | Fewer stages and downloads; the comparable sensitive OCR experiment recovered 7/12 names |

Both use CPU/WebAssembly and require **no WebGPU**. GLM has been removed from the selectable pipelines, runtime source, dependencies and installed model assets. Historical measurements below retain its name so the comparison remains auditable. Existing Git history has not been rewritten.

**Model loading is on demand.** Opening the idle app or pipeline selector does not fetch model weights. Starting analysis lazily imports the scanner, then downloads/initializes the detection and small recognition models. The card-aware pipeline loads its medium verifier only when it reaches verification; text-only never initializes it. An eligible desktop tab may automatically start previously queued work. HTTP caching can reduce transfers, but it does not mean an initialized model session survives across scans. Workers are disposed when their stages finish.

A directly selected desktop photo stays in that browser during recognition. The existing deferred-work feature uploads mobile/queued photos to this application's API so a desktop browser can process them later. No remote OCR service is used. The reference stage can request public card images from Scryfall, comparing only their printed title strips. Thus local OCR does not imply zero network traffic or a fully offline first run.

## How the card-aware pipeline works

The implementation is [experimental-scanner.js](src/lib/card-scanner/experimental-scanner.js), adapted to the application by [card-image-ocr.ts](src/utils/card-image-ocr.ts). The benchmark imports that same source. It uses the whole available card-name catalog, never the twelve expected answers or annotated coordinates as recognition input. It does **not match artwork**.

1. **Read visible titles.** [photo-scan.js](src/lib/card-scanner/photo-scan.js) preserves the original resolution and uses 960-pixel tiles with 200-pixel overlap (48 tiles for the 5712 × 4284 photo). PP-OCRv5_mobile_det and PP-OCRv6_small_rec run in a worker with WASM, one thread and SIMD, using detector/box thresholds 0.1/0.3. Catalog matching normalizes case, punctuation and accents, shortlists names with character trigrams, and ranks edit distance. Rules/type text is filtered. Normal acceptance requires similarity ≥0.84, OCR score ≥0.75, sufficient length and a ≥0.12 name margin unless exact. These scores are heuristics, not probabilities.
2. **Find possible title strips.** [fresh-proposals.js](src/lib/card-scanner/fresh-proposals.js) searches light title bands, ink components, and a perspective-corrected card plane. Orange sleeve masks and line geometry generate locations automatically. The plane transformation assumes roughly coplanar cards and normal card proportions; other sleeve colors and overlapping piles can reduce recovery. This is custom card geometry, not Paddle's optional document unwarping model.
3. **Compare printed letters.** [font-ocr.js](src/lib/card-scanner/font-ocr.js) renders the full catalog in Beleren, excluding digital `A-` rebalances, and normalizes strips to 96 × 16 pixels. Row-mean subtraction reduces background effects. A horizontal projection shortlists 100 names; pixel similarity retains five. [refine-font.js](src/lib/card-scanner/refine-font.js) fits horizontal/vertical blur. Optical acceptance requires a fit ≥0.75, a ≥0.12 lead and length/spatial checks. On this photo, font matching added Inventor's Axe, Cloudsculpt Technician and Melded Moxite to the seven OCR names.
4. **Compare real printed titles.** [reference-titles.js](src/lib/card-scanner/reference-titles.js) handles typography that the synthetic font does not reproduce. A catalog of 40,289 printing IDs covers 33,309 normal-layout names, with up to two frame versions per name. Only references for proposed candidates are requested. Images come from local assets when present, otherwise Scryfall; only the title band contributes to matching. A ≥0.85 fit and ≥0.15 margin recovered Galvanic Blast, reaching eleven names.
5. **Verify uncertain names with Paddle medium.** [paddle-region-reader.js](src/lib/card-scanner/paddle-region-reader.js) enlarges and straightens ambiguous strips, then runs the 73.01 MiB PP-OCRv6_medium_rec model in a WASM worker. Catalog-constrained CTC prefix search supplies alternatives. [ctc-candidate-score.js](src/lib/card-scanner/ctc-candidate-score.js) computes exact CTC forward likelihoods for the optical seeds and alternatives, summing valid blank/character alignments, including repeated letters. It preserves original model probabilities instead of making a forced catalog choice appear certain by renormalizing over the allowed names.
6. **Accept agreement and deduplicate.** [consensus.js](src/lib/card-scanner/consensus.js) requires the verifier and optical matcher to rank the same name first at the same location: optical similarity ≥0.5, unmasked support ≥0.03, mean log-likelihood margin ≥0.15, and at least eight letters. Close agreeing cases can retry up to three automatically generated crop geometries without relaxing acceptance. This added Inventor's Goggles and another Metallic Rebuke instance. Optical seeds also guide verification, so these are not independent probability estimates. Spatial deduplication merges repeated observations; accepted candidates enter the deck-import queue.

The user-supplied five-module Paddle diagram maps to these options as follows:

| Module | Current implementation |
| --- | --- |
| Document Image Orientation Classification (optional) | Disabled in both choices |
| Text Image Unwarping (optional) | Disabled; card-aware has separate geometric plane correction |
| Text Line Orientation Classification (optional) | Disabled; card-aware uses title crop/deskew geometry |
| Text Detection | PP-OCRv5_mobile_det |
| Text Recognition | PP-OCRv6_small_rec, plus medium verification in card-aware |

The selector chooses two executable pipelines; it does not pretend to enable optional orientation/unwarping models that have not been integrated and tested. Selected pipeline IDs persist through deferred jobs; older jobs migrate to `card-aware`.

### Progress reporting

The UI displays the current operation and its actual work count: text-model loading, OCR tiles, three name-index/title-search passes, plane correction, blur refinement, reference downloads/comparison, verifier loading and per-crop verification. Unknown loading totals use an indeterminate bar. Known work maps to weighted stage intervals in [scan-progress.ts](src/utils/scan-progress.ts), stays monotonic even when verification adds crop variants, and stops at 99% until recognized cards have been added. Completion is then 100%. The percentage is stage-weighted work, **not a download-byte percentage or an ETA**. The processing tab has exact phase/count events; another device infers the stage from persisted overall progress. Refinement now yields periodically so the UI can repaint between batches; some geometry still runs on the main thread.

## Accuracy and speed evidence

Measurements below used the original full-resolution photo in headless Chrome 153 on macOS arm64, Apple M4 Max, 48 GiB RAM, on 21–22 September 2026. Timings are individual observations, not statistical averages. Public reference-image fetch time and browser/native allocation behavior can vary.

The target is **distinct names**, not editions or hidden-card counts. The annotations contain 35 title regions: 19 substantially exposed and 16 partial. A correct name must also occur at the annotated location (12-pixel tolerance); one annotation can receive credit once. The final medium run recovered **12/12 names, 17 correct title instances, zero accepted false matches**. That is 17/19 exposed titles (89.5%) and 17/35 total annotated titles (48.6%), not every physical copy. No partial title was accepted. The photo was used to develop the rules, so this is a development result, not a held-out general accuracy claim.

### OCR experiments

| Method | Time | Correct names / 12 | Accepted false matches |
| --- | ---: | ---: | ---: |
| Tesseract, 1400-pixel tiles | 18.08 s | 0 | 0 |
| Paddle, whole photo | 7.64 s | 0 | 0 |
| Paddle, 1400-pixel tiles | 27.09 s | 6 | 0 |
| Paddle, sensitive tile configuration | 42.07 s | 7 | 0 |
| Paddle v6, 1400-pixel experiment | 32.35 s | 5 | 0 |
| Earlier combined three-pass OCR baseline | 101.61 s | 7 | 0 |

These are accepted card-name results after filtering, not generic text recognition benchmark scores. Source: [photo-benchmark-summary.json](../../benchmarks/card-ocr/photo-benchmark-summary.json). Other rejected crop experiments and their limitations are recorded in [experimental-benchmark-summary.json](../../benchmarks/card-ocr/experimental-benchmark-summary.json); their cached-region times are not end-to-end photo times.

### Controlled final-verifier comparison

The image, preprocessing, catalog, automatically generated title candidates and acceptance cutoffs were held fixed. Each run used a fresh Chrome session; annotations were read only by the evaluator after recognition. Non-GLM runs hid `navigator.gpu` and blocked GLM assets.

| Final stage | Correct names | Correct title instances | False matches | Whole scan | Verifier | Peak summed Chrome RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Omit verifier (historical ablation) | 11/12 | 15 | 0 | 139.74 s | — | 4.23 GiB |
| **Paddle medium (current default)** | **12/12** | **17** | **0** | **148.07 s** | **6.96 s** | **3.87 GiB** |
| GLM FP16 (removed) | 12/12 | 17 | 0 | 222.56 s | 53.20 s | 6.78 GiB |

The larger verifier added **no observed accuracy over Paddle medium** on this photo. Relative to omitting verification, both recovered Goggles and one extra Metallic Rebuke. Preliminary tests on 18 cached crops found the small recognizer took 1.82 s and stayed at 11 names; medium took 5.80 s and reached 12; the server recognizer took 5.84 s and stayed at 11. The medium choice was then confirmed with the fresh full run above. Those preliminary times exclude proposal generation and should not be compared to whole scans.

Source: [verifier-ablation-summary.json](../../benchmarks/card-ocr/verifier-ablation-summary.json). Historical GLM runs also took 173–192 s, and the 222.56 s control's earlier stages ran more slowly; the entire end-to-end difference is not attributable to its verifier. The no-verifier run's higher sampled RSS does not mean adding a model reduces memory. These measurements have run-to-run variation.

### Current default's time breakdown

| Stage, measured medium run | Time |
| --- | ---: |
| Initial text OCR, including initialization | 36.27 s |
| Three optical title-proposal passes | 85.18 s |
| Blur refinement | 11.08 s |
| Printed-reference loading and comparison | 8.03 s |
| Medium verifier, including initialization | 6.96 s |
| Other coordination/matching | about 0.55 s |
| **Total** | **148.07 s** |

The final instrumented progress validation recovered **12/12 names, 17 titles and zero false matches in 227.33 s**, with 4.22 GiB peak summed RSS and a 4.14 s longest main-thread task. All fourteen progress phases appeared, with no page errors or forbidden requests. See [paddle-current-summary.json](../../benchmarks/card-ocr/paddle-current-summary.json). It used Chrome 153.0.8010.53 and is an integration check, not a controlled speedup comparison. The corresponding text-only validation returned 7/12 names with zero false matches in 78.91 s and 2.33 GiB peak summed RSS; it reported no main-thread tasks over 50 ms during recognition.

A prior GLM-free production validation also recovered all twelve with zero false matches in 207.88 s while NAS work was running concurrently. It verifies integration, not a clean speed comparison. Rebuilding, moving computation into workers, retaining model sessions, or caching indexes can change time and memory; no unmeasured improvement is claimed.

## Model sizes and runtime memory

Exact sizes/checksums are in [deploy/ocr-assets.json](../../deploy/ocr-assets.json). Every current model fits GitHub's individual-file limit and is tracked in Git. The NAS mirrors the same Paddle-only bundle (`374268bf0e35f06d`). Large retired models are no longer installed or required.

| Runtime asset | Bytes | MiB | When requested |
| --- | ---: | ---: | --- |
| PP-OCRv5 mobile detector archive | 4,843,520 | 4.62 | Start of either pipeline |
| PP-OCRv6 small recognizer archive | 21,319,680 | 20.33 | Start of either pipeline |
| PP-OCRv6 medium verifier ONNX | 76,554,979 | 73.01 | Card-aware verification |
| Medium character/configuration file | 150,580 | 0.14 | Card-aware verification |
| Full name catalog | 658,950 | 0.63 | Scanner catalog input/fallback |
| Beleren font | 58,180 | 0.06 | Card-aware title indexing |
| Printed-reference catalog | 5,838,595 | 5.57 | Card-aware reference stage |
| **Declared total** | **109,424,484** | **104.36** | Not all downloaded at app startup |

MiB means 1,048,576 bytes. The total excludes JavaScript, WASM runtime binaries and requested reference images. A model's on-disk size is not its RAM requirement. The 5712 × 4284 photo is about 93.35 MiB for one RGBA buffer; canvases, bitmaps and OpenCV matrices can hold multiple copies. A 34k-name 96 × 16 float feature index plus its projection is roughly 212 MiB before overhead. Rendering and rebuilding several indexes creates additional allocation pressure.

The medium ablation's sampled peak summed Chrome process RSS was **3.87 GiB**; its post-scan idle RSS was about **3.07 GiB**. Browser/native/WASM allocations can remain resident after JS objects or workers are released. That run had 340 main-thread tasks longer than 50 ms, a maximum of 11.31 s, and 74.87 s total duration beyond the 50 ms/task threshold. These responsiveness measurements predate the new batched refinement yields; rerun the profiler before treating them as current UI latency. Inference workers do not move all surrounding geometry and glyph processing off the main thread.

Historical, now-removed GLM runs were also profiled twice in one tab: 179.52/192.37 s, 6.31/6.85 GiB peak summed RSS, 140.6/152.5 MiB main-page JS heap, and 4.05/5.15 GiB RSS after ten seconds idle. Those are **not the current default's memory requirements**. The raw comparison remains in [memory-benchmark-summary.json](../../benchmarks/card-ocr/memory-benchmark-summary.json).

### Measurement limits

[profile-client-memory.mjs](../../benchmarks/card-ocr/profile-client-memory.mjs) samples an isolated Chrome process tree's OS RSS about every second and main-page JS heap about every two seconds. It records long tasks, phase events and page-observed network bytes. Summed RSS can double-count shared pages; it is not unique physical memory used by the OCR code. Main-page JS heap excludes worker heaps, many typed-array buffers, Canvas surfaces and WASM/native allocations. GPU-helper RSS is not VRAM or total GPU allocation. Sampled peaks can miss transient spikes. Network observation may miss worker transfers, so use the manifest for exact asset sizes.

No mobile RAM, thermal, battery, allocation-bandwidth or long-queue endurance benchmark has established a minimum supported device. No WebGPU dependency does **not** guarantee that a memory-constrained iPhone can complete this full-resolution pipeline. Font-index reuse trades retained memory for speed; moving work to workers improves responsiveness but can increase copies. Evaluate each change against accuracy, false acceptances, peak/retained RSS and cold/warm latency on a separate photo set.

## Reproduce and validate

Use Node 24+ for the complete application (the API uses Node SQLite); the frontend requires a Vite-compatible Node release. From the repository root:

```sh
node scripts/ocr-assets.mjs install
npm --prefix projects/clientv2 ci
npm --prefix projects/clientv2 run typecheck
npm --prefix projects/clientv2 test
npm --prefix projects/clientv2 run build
npm --prefix projects/clientv2 run preview -- --host 127.0.0.1 --port 4174
```

In another terminal:

```sh
cd benchmarks/card-ocr
npm install
npm run prepare:photo -- --photo=/absolute/path/to/IMG_8535.jpeg
npm run test:photo
PROFILE_ORIGIN=http://127.0.0.1:4174 PROFILE_RUNS=1 PROFILE_PIPELINE=card-aware PROFILE_ID=medium-current node profile-client-memory.mjs
PROFILE_ORIGIN=http://127.0.0.1:4174 PROFILE_RUNS=1 PROFILE_PIPELINE=paddle-only PROFILE_ID=text-current node profile-client-memory.mjs
node test-pipeline-selector.mjs
```

The profiler reads the scanner chunk from the corresponding local `dist/assets`. It defaults to macOS Chrome, `ps` and `sysctl`; adapt the executable and memory sampler on another OS. It blocks saved result/annotation requests and hides WebGPU; scoring is outside the browser. Inspect `results[].metrics`, `errors` and `forbidden` in its JSON output. The UI check verifies both desktop/mobile selectors and that idle UI interaction does not request model files. The private fixture and raw reports are ignored by Git.

For the development harness, `npm run dev` in the benchmark directory serves port 4173; `npm run bench:experimental:gate` evaluates the same default source against all expected names and zero false matches. Current static runtime assets come from Client v2's public directory. Older experimental scripts may require archived experimental assets; they are not installation prerequisites for the deployed pipeline.

Application use: `scanCardImage(file, names, onProgress, isCancelled, { pipeline: 'card-aware' })`, or `'paddle-only'`. The lower-level entry is `scanExperimental({ url, names, pipeline, onProgress, isCancelled })`; revoke a caller-created object URL after completion. Pass the complete available catalog, never photo-specific expected names.

## Storage and deployment

See [deploy/README.md](../../deploy/README.md). Runtime assets have checksums verified before each production build. The local production frontend is served at <http://localhost:3000> from an independent release directory; the API runs on port 4040. Benchmarks, caches and duplicate databases are not required in the Git checkout. The NAS has a complete repository snapshot and a consistent application-database backup. Historical experiment data is retained there without the retired standalone GLM weights; historical Git commits/reports remain for auditability.

The installed development environment keeps generated benchmark reports/models in `~/Library/Caches/CubeLight/benchmarks/` and the MTGJSON SQLite database in `~/Library/Application Support/CubeLight/data/`, with ignored symlinks from the checkout. Installed dependencies and build products are reproducible; deleting them requires reinstall/build before development. A clone on another machine must provision its data rather than rely on this machine's absolute symlink targets.

Primary implementation references: [PaddleOCR.js](https://github.com/PaddlePaddle/PaddleOCR/tree/main/paddleocr-js), [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/), and [Chrome memory measurement distinctions](https://developer.chrome.com/docs/devtools/memory-problems). The measured evidence above comes from this repository's saved experiments, not a claim that generic OCR benchmarks predict card-photo accuracy.
