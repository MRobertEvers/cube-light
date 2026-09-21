# Deployment and NAS storage

Client v2 uses the combined browser card-name scanner. The private photograph stays in the browser. Small models and configuration files live in `projects/clientv2/public/ocr` and are tracked in Git. `ocr-assets.json` records the SHA-256 and size of every runtime asset. Three GLM external-weight files exceed GitHub's 100 MiB file limit and are ignored by Git.

Set `CUBE_NAS_ROOT` to the mounted private NAS directory allocated to this project, outside the checkout. No credentials are stored in the repository. Alternatively, installation can read a NAS HTTP(S) base URL from `CUBE_NAS_URL`. URLs with embedded credentials are rejected; use an authenticated mount for protected shares.

From the repository root:

```sh
# Publish the verified runtime assets once from a prepared development checkout.
CUBE_NAS_ROOT=/mounted/share/cube-light node scripts/ocr-assets.mjs publish

# Install a new checkout; large weights are copied from that NAS version.
CUBE_NAS_ROOT=/mounted/share/cube-light node scripts/install.mjs

# Verify all installed runtime models without network access.
node scripts/ocr-assets.mjs verify

# Back up the entire working repository, including Git history and ignored data/models.
CUBE_NAS_ROOT=/mounted/share/cube-light node scripts/backup-repo.mjs
```

The NAS uses `models/<manifest-version>/` for immutable runtime assets and `repository/<timestamp>/` for full snapshots. Each snapshot includes a verified Git bundle, a full tar archive (including `.git`, ignored models, private fixtures and installed dependencies), and its SHA-256 manifest. Keep this backup private. The mutable application database also receives a consistent SQLite backup when found at its standard path; prefer that copy when restoring a running server's data. The tar archive is a working-file snapshot and may contain other files being changed by running processes.

The client build is in `projects/clientv2/dist`. Serve it over HTTPS (or localhost), because the GLM verification stage requires WebGPU in a secure browser context. Configure the static server to serve `.wasm` as `application/wasm`, `.mjs` as JavaScript, and model files as binary data; support large static responses. Do not rewrite missing `/ocr/` assets to the SPA HTML document. The server API normally runs on port 4040. Configure `VITE_BACKEND_HOST_URI` before building when the API has a different address, and `CLIENT_ORIGINS` on the API for the deployed HTTPS origin.

The server additionally requires Node 24+, a C toolchain, Python and Emscripten, its MTGJSON SQLite data, and the application database. See `projects/server/readme.md`. A static frontend build alone is not a deployment of the API or a migration of the database.

The destination host/share and serving configuration must be supplied for an actual NAS transfer or live deployment. These scripts do not choose a host or overwrite an existing live installation automatically.

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
