# Browser card-name OCR: measured status

Updated 21 September 2026. **The 12/12 target has not been met.**

The best scored research composite is **11/12 distinct names (91.7%), 17 correct title instances, zero accepted false matches on this development photo**. This combines cached browser experiment outputs. It is not an integrated upload-to-result pipeline, and its full latency has not been measured. Thresholds were selected on this same photo; these figures are not held-out accuracy or calibrated confidence.

The upload harness still runs the integrated Paddle baseline: **7/12 names in 101.6 seconds**.

| Experiment | Measured time | Correct distinct names | Accepted false matches | Scope |
| --- | ---: | ---: | ---: | --- |
| Integrated Paddle pipeline | 101.6 s | 7/12 | 0 | Full photo, model setup included |
| GLM unrestricted text + catalog matching | 17.0 s | 6/12 | 0 | 91 cached automatic crop proposals; proposal-generation cost excluded |
| GLM catalog constraint, preserved crops | 168.6 s | 2 | 13 | First 60 of 224 proposals; partial-region experiment, not whole-photo recall |
| OCR + printed-name template refinement | Not measured end to end | 10/12 | 0 | Composite of cached passes |
| Above + GLM/template agreement | Not measured end to end | **11/12** | **0** | Experimental consensus rule; cached passes |

The last GLM run overlapped a separate browser blur experiment; its time is not an isolated performance benchmark. Its recorded breakdown was 0.42 s selection, 2.79 s model/catalog setup, and 165.43 s preprocessing/inference/search. It evaluates several catalog hypotheses per crop, which is substantially more work than free decoding. The original Paddle run took 40.8 s for tiled pass one, 34.0 s for tiled pass two, 25.9 s for edge-title recognition, and about 0.9 s for other work. First-time model downloads are not represented by the local-asset timings.

## Accepted names in the best research composite

Aether Chaser; Aether Swooper; Cloudsculpt Technician; Cryogen Relic; Gearseeker Serpent; Inventor's Axe; Inventor's Goggles; Kenku Artificer; Melded Moxite; Metallic Rebuke; Selfcraft Mechan.

**Remaining: Galvanic Blast.** It appears in optical candidates but competes closely with Thermal Blast. It has not passed the acceptance rules. We do not count an expected name simply because it appears somewhere in a candidate list.

## What changed in the latest iteration

- A refinement filter previously discarded an entire candidate crop when its first suggestion was short. It now retains the crop when another candidate is a plausible longer title. Refining the previously generated full-catalog candidates recovered Melded Moxite as the best optical fit (0.877 versus 0.719 for the next candidate). This added refinement took 0.67 s over cached proposals.
- GLM region selection no longer discards nested crops just because a larger surrounding frame crop exists. GLM ranked Inventor's Goggles first on two preserved crops.
- `consensus.js` requires the best GLM hypothesis and the best optical candidate to agree spatially and by name. Current development thresholds: GLM raw-token geometric mean >=0.03, searched-hypothesis log-score gap >=0.15, optical similarity >=0.5. These are heuristics, not probabilities. Optical candidates also seed GLM search, so the methods are not statistically independent.
- A broader blur search took 118.4 s, still recovered only ten distinct names, and introduced eleven false matches at optical threshold 0.75/margin 0.12. That variant was rejected.
- Fourteen matcher and token-constraint tests passed. Scoring checks name and location, counts each annotation at most once, and runs outside inference.

## GLM finite-vocabulary implementation

Yes: `catalog-logits.js` constructs a token trie from the complete 34,299-name catalog (excluding Arena `A-` variants), masks invalid next tokens during generation, permits termination only at full names or initial abstention, and records original unmasked token support. It searches a bounded set of optical seed names and alternative token prefixes. This is bounded hypothesis search, not exhaustive likelihood evaluation of every catalog name and not a true beam-search implementation.

Finite vocabulary prevents invented strings but does not prevent selecting an incorrect real card. The standalone GLM acceptance rule produced false matches and is not suitable for deployment.

The Paddle models tested are PP-OCR recognition/detection models. **PaddleOCR-VL-1.5 was not successfully tested.** A benchmark for that VLM cannot be treated as the accuracy of the PP-OCR browser pipeline.

All model inference and printed-glyph comparison occurred in Chrome. No artwork matching is used. The three user-provided corrections are evaluation labels, not a runtime three-name vocabulary. Browser research passes currently depend on cached proposal files; the integrated scanner does not. The private photo, models and raw outputs are gitignored.

## Reproduce scoring and checks

```sh
cd benchmarks/card-ocr
PATH=/tmp/cube-node/bin:$PATH npm run test:photo
PATH=/tmp/cube-node/bin:$PATH npm run report:experiments
```

The report script reads saved experiment outputs and corrected annotations, writes `photo-results/hybrid-v12.json` and `photo-results/consensus-v14.json`, and updates `photo-benchmark-summary.json`. It does not rerun inference. The integrated baseline run command remains `npm run bench:tabletop`; see `PHOTO-RESULTS.md` for setup.

Next required work: improve the final ambiguous title, consolidate successful proposal generation and recognition into one fresh browser run, measure total time, and evaluate separately labeled photos. The current prototype is not a validated high-certainty scanner.
