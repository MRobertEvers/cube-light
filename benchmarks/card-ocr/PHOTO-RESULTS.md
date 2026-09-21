# OCR-only tabletop card-name benchmark

> This page documents the integrated 7-name baseline. See [EXPERIMENT-STATUS.md](EXPERIMENT-STATUS.md) for subsequent browser experiments and the fresh 12-name combined pipeline.

> Annotation correction: the upper-right red card was incorrectly labeled during manual setup. The user identified it as **Melded Moxite**. The expected-results file has been corrected; the OCR never produced the incorrect label.

The recommendation from the tested implementations is **PaddleOCR.js with full-resolution overlapping tiles and conservative catalog matching**. Tesseract.js was substantially weaker on this photograph. Neither library recovered every name reliably. **The 95% name-recall target has not been met.** This is an OCR prototype and benchmark, not a production accuracy claim.

No artwork matching is included in this harness. OpenCV only proposes and straightens potential title strips from sleeve edges. All identifications come from OCR text matched against the repository's card-name catalog.

## Measured result — 21 September 2026

| Pipeline | Distinct names | Exposed titles | Accepted false matches |
| --- | ---: | ---: | ---: |
| Tesseract, automatic tiles | 0/12 | 0/19 | 0 |
| PaddleOCR, whole photo | 0/12 | 0/19 | 0 |
| PaddleOCR, sensitive tiles | 7/12 | 10/19 | 0 |
| Final three-pass OCR pipeline | **7/12 (58.3%)** | **12/19 (63.2%)** | **0** |

The final run took **101.6 seconds** in headless Chrome 153.0.8010.52 on this macOS arm64 workstation. This is one end-to-end run, including model setup, cropping and matching; it is not a latency distribution or phone-performance estimate. Among all 35 annotated regions, recall was 12/35; no partial title was accepted. All 12 accepted title locations were correct in this fixture. That observed precision does not imply a 100% confidence guarantee.

Recovered names: Aether Chaser, Aether Swooper, Cryogen Relic, Gearseeker Serpent, Kenku Artificer, Metallic Rebuke, Selfcraft Mechan. Missed identities: Inventor's Goggles, Inventor's Axe, Galvanic Blast, Melded Moxite, Cloudsculpt Technician. The review list also contains incorrect suggestions; they are not included in accepted-name exports.

Browser execution reported zero page errors, and the request audit recorded zero non-GET/HEAD requests. The JSON download was checked against the scanner output. Eight regression checks cover catalog matching, ambiguous fragments, duplicate locations, rules-text false matches and one-to-one scoring.

## Run it

Use Node 22+ and Google Chrome. On the workstation used for this experiment, use `PATH=/tmp/cube-node/bin:$PATH` if Homebrew Node is still broken.

```sh
cd benchmarks/card-ocr
npm install
npm run prepare:photo -- --photo=/Users/matthewevers/Desktop/IMG_8535.jpeg
npm run dev
```

Open <http://127.0.0.1:4173/harness.html>. Upload a photo or use the supplied sample, select an engine, and analyze. The UI shows title-location overlays, raw recognized text, matching suggestions, and JSON export with a deduplicated `names` array. Green means the heuristic accepted the suggestion; it does not mean a calibrated probability or that every card was found. The scanner does not import cards into your application.

```sh
npm run test:photo           # matcher regression checks
npm run bench:tabletop      # starts its own server + real headless Chrome
npm run bench:tabletop:gate # exits nonzero unless >=95% names and zero false positives
```

The benchmark writes `photo-results/final.json`. `CHROME_PATH` can override the executable. Runtime models, the private photo, and raw experiment outputs are ignored by Git. The small recorded result summary is in `photo-benchmark-summary.json`.

## What is tested

- Original `IMG_8535.jpeg`: 5712 × 4284 pixels. No downsampling to the chat preview.
- Full catalog lookup, with Arena's `A-` rebalanced names excluded for physical-card matching. No expected-deck shortlist.
- Manual evaluation annotations in `photo-ground-truth.json`, created separately from inference. The browser benchmark blocks requests to this file. Its scoring code runs outside the browser after recognition finishes.
- 12 known distinct names, across 35 annotated exposed title regions: 19 substantially exposed and 16 partial. Partial identities were annotated using the photo context; their hidden suffixes are not available to OCR. These 35 annotations are **not an asserted total number of physical cards**. Additional obscured/clipped cards and face-down sleeves cannot be reliably inventoried from this image.
- Name identity and title location must both match. A correct name appearing in rules text is not a true positive for a card title. Each annotation can be matched only once.
- Distinct-name recall, instance recall, accepted precision, false positives, timing, and an explicit pass/fail target. Similarity and model scores are not probabilities.

The labels and thresholds were developed on this photograph. It is a **development fixture**, not a held-out generalization test. A claim of high success on future phone photos needs a separate labeled photo set.

## Final pipeline

1. PaddleOCR v5 mobile text detector + v6 small recognizer: overlapping 960-pixel tiles, low detection thresholds to retain small text.
2. PaddleOCR v6 small text detector + v6 small recognizer: overlapping 1400-pixel tiles to recover segmentation misses from the first pass.
3. OpenCV sleeve-edge proposals, affine straightening, and multiple title offsets. Run the v6 small recognition ONNX model directly in a Web Worker, bypassing the general page-text detector.
4. Normalize OCR, shortlist candidates by trigrams, compute edit distance, compare the next-best name, reject common rules-text patterns, and deduplicate spatially. Uncertain outputs remain review suggestions.

The third pass currently targets orange sleeve boundaries. The first two passes are color-independent. No photo-specific card coordinates or expected names are embedded in this pipeline. Short names and ambiguous fragments are deliberately sent to review, so this conservative policy also needs validation on cards such as Shock and basic lands.

`name-scanner.js` exports `scanCardNames({ url, names, onProgress, isCancelled })`. For a user-selected `File`, pass an object URL and revoke it after scanning. Its output contains unique accepted names, all candidates with raw OCR and coordinates, timings, and raw per-pass evidence.

```js
import { scanCardNames } from './name-scanner.js';
const url = URL.createObjectURL(file);
try {
  const result = await scanCardNames({ url, names: fullCardNameCatalog, onProgress });
  console.log(result.names, result.candidates);
} finally {
  URL.revokeObjectURL(url);
}
```

## Experiments and limitations

Compared full-photo OCR, overlapping tiles, two text detectors, direct title recognition, Tesseract, an English-specific Paddle recognizer, a larger v5 server recognizer running locally, contrast/sharpening, aspect-ratio correction, and automatic title-band trimming. The larger model increased processing time and did not improve recall here. Preprocessing did not recover the blurred upper names. Early edge-merging experiments incorrectly combined adjacent title strips and were discarded.

The remaining errors are concentrated in blur, perspective, partial titles, and missed text regions. The software reports these limits instead of filling in a plausible deck. A closer, focused photo with unobscured title strips is needed to establish a substantially higher success rate for this scene.

All inference runs in Chrome: Paddle in its Web Worker, direct ONNX recognition in `recognizer.worker.js`, and OpenCV geometry in browser JavaScript/WASM. Node only serves static files, controls Chrome, and scores outputs. The browser downloads model/runtime assets on first use. The harness checks that it issues no POST/PUT image-upload requests. This is not an offline-first service-worker implementation; self-host/cache the OCR assets before claiming full offline support.

## Sources and versions

- [PaddleOCR.js architecture](https://github.com/PaddlePaddle/PaddleOCR/blob/main/paddleocr-js/docs/architecture.md): official browser worker pipeline; package pinned to 0.4.2.
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md): browser OCR workers; package pinned to 7.0.0.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/): local WASM inference; direct recognizer pinned to 1.30.0. Paddle's own worker selects its SDK-pinned runtime separately.
- OpenCV.js 4.10.0-release.1 for geometric preprocessing. These components use permissive Apache/MIT licenses; card names and imagery retain their respective owners' rights.

Only the new benchmark files were changed. Existing application and unrelated in-progress repository edits were preserved.
