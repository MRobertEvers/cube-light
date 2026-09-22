# OCR runtime asset provenance

- `models/paddle/PP-OCRv5_mobile_det.tar` and `PP-OCRv6_small_rec.tar`: official PaddleOCR/PaddleX ONNX inference archives, from `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/`. Upstream project: https://github.com/PaddlePaddle/PaddleOCR (Apache-2.0).
- `models/paddle/medium-rec.onnx` and `medium-rec.yml`: extracted PP-OCRv6_medium_rec ONNX/configuration from the same official Paddle model distribution (`PP-OCRv6_medium_rec_onnx_infer.tar`).
- `models/glm/`: https://huggingface.co/onnx-community/GLM-OCR-ONNX, revision `aea46198f09e3aa2b63422dd234f1cc66afffe52`; original model https://huggingface.co/zai-org/GLM-OCR (MIT). The existing `provenance.json` records the export files. External weight data larger than 100 MiB is installed from the NAS, not stored in Git.
- `models/fonts/beleren.woff`: https://github.com/Saeris/typeface-beleren-bold, revision `cdbe3dc354a51b620636f8effd4c4b143d8969a1`, `Beleren2016-Bold.woff` (upstream package MIT).
- `card-names.json` and `models/title-references/catalog.json`: derived from the repository's MTGJSON `AllPrintings.sqlite`. Reference card images are fetched from Scryfall when required; only printed title lettering is compared. Card names and images remain the property of their respective owners.

Every runtime asset's exact size and SHA-256 is recorded in `deploy/ocr-assets.json`. This provenance note is documentation, not an additional runtime asset. See upstream repositories for full license texts.
