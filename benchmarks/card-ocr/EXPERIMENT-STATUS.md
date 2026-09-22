# Current deployment

Client v2 now defaults to the Paddle-medium card-aware pipeline; text-only Paddle is selectable. GLM runtime/model files are removed. See [the current client README](../../projects/clientv2/readme.md), [controlled verifier comparison](verifier-ablation-summary.json), and [latest integration measurement](paddle-current-summary.json). The older report below documents historical experiments, not current installation requirements.

# Browser card-name scanner: 12/12 on the supplied photo

The fresh browser benchmark recovered **12/12 distinct names, with zero accepted false matches, in 173.5 seconds** on 21 September 2026. It correctly located 17 title instances. This is a development result on one photo, with rules tuned on that photo—not a measured accuracy rate on future photos or a complete inventory of obscured cards.

The upload harness now includes the working combined pipeline as **Experimental OCR + printed title matching**. Open <http://127.0.0.1:4173/harness.html> while the dev server is running. Select a photo, analyze, inspect the evidence, and export JSON. The experimental mode requires WebGPU.

## Measured full-run timing

| Stage | Time |
| --- | ---: |
| PaddleOCR on overlapping full-resolution tiles | 40.6 s |
| Automatic title proposals and full-catalog printed-font search | 82.5 s |
| Blur-aware printed-font refinement | 10.8 s |
| Actual printed-title references | 6.3 s |
| GLM catalog-constrained verification, including a crop retry | 32.1 s |
| Other work | 1.2 s |
| **Total** | **173.5 s** |

These are wall-clock measurements from one headless Chrome run on this macOS arm64 workstation. Model loading is included; initial installation/download of model weights is excluded. Some title references were already cached locally; missing references were fetched from Scryfall. This is not an offline-first implementation or a mobile latency estimate.

## What worked

The baseline OCR found seven distinct names. Matching the printed letters against rendered full-catalog titles recovered three more. Comparing **only the printed title strips** of reference printings recovered Galvanic Blast. GLM and optical-text agreement, with an alternate automatically generated crop, recovered Inventor's Goggles. There is no artwork matching.

The reference-title method gave Galvanic Blast a clear lead where the synthetic-font fit had confused it with Thermal Blast. Different printed typography was relevant to this result. The final pipeline uses a full 34,299-name catalog for candidate generation, and reference identifiers covering 33,309 normal-layout catalog names. The expected 12 names are never used as the recognition vocabulary.

Accepted names: Aether Chaser; Aether Swooper; Cloudsculpt Technician; Cryogen Relic; Galvanic Blast; Gearseeker Serpent; Inventor's Axe; Inventor's Goggles; Kenku Artificer; Melded Moxite; Metallic Rebuke; Selfcraft Mechan.

## Verification

`run-experimental.mjs` regenerated crops from the original 5712×4284 image. It blocked browser requests to saved experiment results and annotations. **Neither was requested.** Evaluation ran in Node after browser recognition finished. The request audit recorded zero non-GET/HEAD requests. All OCR, geometric processing, glyph matching and GLM inference ran in Chrome; the photograph was not uploaded.

The `--require-target` gate passed: all twelve names correct, no accepted false matches, and no forbidden fixture requests or non-read requests. Eighteen matcher/constraint regression tests passed. The UI check verifies the experimental selection, evidence rendering without invalid scores, and JSON export against the measured result.

The earlier fresh run exposed a short-fragment false acceptance (Rebuke). The consensus stage now applies the same conservative minimum-length policy as the other matching stages. Very short names remain a limitation of this prototype. A borderline decision may retry up to three alternate geometries generated automatically from the image; it does not relax the acceptance threshold or receive the expected answer.

## Other methods tested

- GLM on thirty larger card crops: **72.4 s**. Blurred rules-text transcriptions were unreliable and were not used for acceptance.
- PARSeq, nonsequential decoding with refinement: **9.1 s**, one accepted correct name on sixty cached title crops.
- PARSeq, sequential decoding with padding: **9.8 s**, zero accepted correct names on those crops. ONNX/browser conversion was checked against PyTorch, with maximum logit differences under 0.000013. Neither variant improved the combined result.
- Printed-reference experiment: **3.34 s** over cached crops/references; recovered Galvanic Blast and Melded Moxite at the strict threshold.
- Text super-resolution was researched but not run: the printed-reference method resolved the missing name before that fallback was needed.

These component experiments are not comparable end-to-end latency measurements. See [EXPERIMENT-HISTORY.md](EXPERIMENT-HISTORY.md) for previous iterations and [PHOTO-RESULTS.md](PHOTO-RESULTS.md) for the original seven-name baseline.

## Run and reproduce

```sh
cd benchmarks/card-ocr
# Use PATH=/tmp/cube-node/bin:$PATH on this workstation if Homebrew Node is broken.
npm install
npm run prepare:photo -- --photo=/Users/matthewevers/Desktop/IMG_8535.jpeg
node prepare-font.mjs
node prepare-glm.mjs
python3 prepare-reference-catalog.py
npm run dev
```

In a second terminal, in the same directory:

```sh
npm run test:photo
npm run bench:experimental -- --require-target
```

Reference identifiers come from the repository's AllPrintings.sqlite database. The browser fetches only needed reference images. Large weights, private images and raw result files are gitignored. The compact measured record is [experimental-benchmark-summary.json](experimental-benchmark-summary.json); the successful raw run is `photo-results/fresh-integrated-v3.json`.

`experimental-scanner.js` exports `scanExperimental({url, names, onProgress, isCancelled})`. Pass an object URL for a selected File and revoke it afterward. Its output includes unique names, evidence and locations, per-stage timing, and raw stage outputs.

The next priority is speed and independent-photo validation. Title proposal generation alone accounts for almost half the run. This fixture now passes; general reliability and phone performance remain unmeasured.
