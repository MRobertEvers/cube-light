# Depth-Anything V2 Small (ONNX)

The model the server makes height maps ("parallax art") with: `src/images/depth/`.

- **What:** Depth-Anything V2 Small, a monocular relative-depth model, exported to ONNX (fp32).
- **Source:** [onnx-community/depth-anything-v2-small](https://huggingface.co/onnx-community/depth-anything-v2-small)
  at revision `4472b7362082ad9968fee890ca0f1e5aca36b93d`. It is an export of
  [depth-anything/Depth-Anything-V2-Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small),
  the same weights mtg-ai's torimtgd uses through transformers (`depth-anything/Depth-Anything-V2-Small-hf`).
- **Licence:** Apache-2.0 (`LICENSE`). Only the Small model has this licence; Base and Large are
  non-commercial and are not used.
- **Files:**
  - `model.onnx`: 99,060,839 bytes, SHA-256 `afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c`.
  - `preprocessor_config.json`: the input settings `height-map.ts` reproduces (518 px, a multiple of 14, ImageNet normalisation).

Both are tracked in Git (GitHub takes files under 100 MiB), so a checkout has them. `models.json`
records their sizes, checksums and sources:

```sh
npm run depth-model            # verify them
npm run depth-model -- install # restore one that is missing or corrupt from its source
```

The server says on startup whether parallax art is on, and why not (`GET /images/depth`).
