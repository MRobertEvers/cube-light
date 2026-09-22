# Deployment and NAS storage

Client v2 uses the combined browser card-name scanner. Direct local scans keep the photograph in the browser; deferred mobile work uploads it to this application's API for processing by a desktop browser. Small models and configuration files live in `projects/clientv2/public/ocr` and are tracked in Git. `ocr-assets.json` records the SHA-256 and size of every runtime asset. All seven current declared assets fit GitHub; the largest is the 73.01 MiB Paddle medium verifier. There are no GLM runtime assets. The default card-aware and alternative text-only pipelines use WASM without WebGPU.

Set `CUBE_NAS_ROOT` to the mounted private NAS directory allocated to this project, outside the checkout. No credentials are stored in the repository. Alternatively, installation can read a NAS HTTP(S) base URL from `CUBE_NAS_URL`. URLs with embedded credentials are rejected; use an authenticated mount for protected shares.

From the repository root:

```sh
# Publish the verified runtime assets once from a prepared development checkout.
CUBE_NAS_ROOT=/mounted/share/cube-light node scripts/ocr-assets.mjs publish

# Install a new checkout; verify Git assets and restore missing assets from the NAS.
CUBE_NAS_ROOT=/mounted/share/cube-light node scripts/install.mjs

# Verify all installed runtime models without network access.
node scripts/ocr-assets.mjs verify

# Back up the entire working repository, including Git history and ignored data/models.
CUBE_NAS_ROOT=/mounted/share/cube-light node scripts/backup-repo.mjs
```

The NAS uses `models/<manifest-version>/` for immutable runtime assets and `repository/<timestamp>/` for full snapshots. Each snapshot includes a verified Git bundle, a full tar archive (including `.git`, ignored models, private fixtures and installed dependencies), and its SHA-256 manifest. Keep this backup private. The mutable application database also receives a consistent SQLite backup when found at its standard path; prefer that copy when restoring a running server's data. The tar archive is a working-file snapshot and may contain other files being changed by running processes.

The client build is in `projects/clientv2/dist`. HTTPS is recommended for network deployment; recognition does not require WebGPU. Configure the static server to serve `.wasm` as `application/wasm`, `.mjs` as JavaScript, and model files as binary data; support large static responses. Do not rewrite missing `/ocr/` assets to the SPA HTML document. The server API normally runs on port 4040. Configure `VITE_BACKEND_HOST_URI` before building when the API has a different address, and `CLIENT_ORIGINS` on the API for the deployed HTTPS origin.

The server additionally requires Node 24+, a C toolchain, Python and Emscripten, its MTGJSON SQLite data, and the application database. See `projects/server/readme.md`. A static frontend build alone is not a deployment of the API or a migration of the database.

This workstation uses `/Volumes/MatthewLLM_Shared/cube-light` on `TandE.local`. The current model bundle is `374268bf0e35f06d`. Model files are only requested as an analysis reaches their stage, including automatically claimed queued jobs; opening an idle UI does not initialize them.

To install code as well as models from the NAS on a new machine, copy `scripts/clone-from-nas.mjs` there and run:

```sh
CUBE_NAS_ROOT=/mounted/share/cube-light node clone-from-nas.mjs /new/checkout
```

It clones the verified Git bundle at the latest snapshot commit, then runs the model installer and client build. The larger `working-repository.tar` separately preserves ignored assets, data and dependency directories for complete recovery.

For a local production frontend after building:

```sh
HOST=127.0.0.1 PORT=3000 node deploy/serve-client.mjs
```

Use a reverse proxy for HTTPS when serving other devices. This server supports SPA routes, binary model files, MIME types and byte ranges, and returns a genuine 404 for missing model assets.

On macOS, `node scripts/deploy-local.mjs` verifies the models, snapshots the built client into `~/Library/Application Support/CubeLight/releases/`, and installs the `local.cube-light.client` user LaunchAgent on port 3000. It replaces only a listener belonging to this checkout and refuses to stop unrelated processes. Set `CUBE_NODE_EXECUTABLE` to a stable Node 24+ executable when the invoking Node is temporary. Logs are in `~/Library/Logs/CubeLight/`. The deployed artifact is separate from the working checkout. Before switching releases, deployment copies each retained release's `dist/assets` into the shared `~/Library/Application Support/CubeLight/client-assets/` directory. The static server uses `CLIENT_ASSET_ROOT` as a fallback only for `/assets/` requests. This preserves content-hashed lazy modules, workers and WASM for already-open tabs; never delete these shared assets merely because a new release is deployed. Identical files are deduplicated and conflicting contents at an existing immutable URL abort deployment. HTML and `/ocr/` model files are not retained by this mechanism, so removed models stay unavailable. On this workstation, the service uses an official, checksum-verified Node 24.5.0 installation under the application-support directory.

The pre-cleanup snapshot was retained after removing standalone retired model files. Historical Git history and measured comparison reports remain. Current full snapshots archive symlinks as symlinks; machine-local external cache/database targets are not silently dereferenced. The pre-cleanup archive preserves the original MTGJSON database and experiment data. Provision those separately when restoring onto another machine.

### Deployment compatibility checks

Run `node --test deploy/test/*.test.mjs` from the repository root. The tests publish an old build, remove its release directory, and verify that a new server still serves its lazy module and worker with the correct MIME/cache/range behavior. They also check current HTML, missing-model 404s, and immutable-file collision rejection.

This fixes the observed late-scan error for `paddle-region-reader-CqU0OoUX.js`: an open tab had code from the earlier release, but the server only served the newer release's hashed filenames. Model inference was not the cause. Already-failed jobs do not resume automatically when an asset becomes available. Cards already imported remain in the deck; restarting a separate import into the same deck can duplicate them.
