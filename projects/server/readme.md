# Server

The server is an Express REST application that accesses SQLite through Node.js's built-in `node:sqlite` module.

## Getting Started

Use Node.js 24 or newer and install dependencies with `npm install` in this directory.

Run `npm start` to build and start the server on port 4040.

The server reads its settings from `.env` in the repository's root (`CUBE_ENV_FILE` names
another file); a variable already set in the environment wins. `.env.template` lists them:
the ports, `CLIENT_ORIGINS`, the application database and its shared copy, and the art cache.

Run `npm run dev` to build and start the server with hot reload. Changes to
TypeScript source files recompile and restart the server automatically. Stop it
with Ctrl-C. Changes to the SQLite card data or native name-index code require
restarting `npm run dev` so the build step regenerates those assets.

## Accounts and sessions

Everything except card data (`/cards`, `/suggest`, `/images`) and `/auth` requires
a signed-in session. On a new server the client's sign-in screen offers to create
the first account; `POST /auth/setup` refuses once any account exists. Add more
accounts from this directory with `npm run create-user -- <username>`. Passwords
are hashed with scrypt and stored in the `Users` table of `database.sqlite`.

Sessions live in memory in a small C key-value store (`native/kv_store.c`, built
by node-gyp as `kv_store.node`) with per-key expiry, so restarting the server signs
everyone out. The session ID travels in an `HttpOnly`, `SameSite=Lax` cookie and
lasts 14 days after the last request. The same store rate-limits sign-in attempts
(10 per username and 50 per address every 15 minutes).

The client runs on a different port, so the server answers with credentialed CORS
for pages on its own hostname and refuses writes from any other origin. To serve the
client from another host, set `CLIENT_ORIGINS` to a comma-separated list of origins,
such as `CLIENT_ORIGINS=https://cube.example.com`. Run `npm run test:auth` to test
the store, sign-in, and CORS.

## Card data

`src/assets/AllPrintings.sqlite` is an export from [MTGJSON](https://mtgjson.com/downloads/all-files/), which combines data from Scryfall and other sources. The server reads card data and card sets from this SQLite file. MTGJSON stores Scryfall IDs in its `cardIdentifiers` table; the server uses those IDs to request card images from [Scryfall](https://scryfall.com/docs/api/cards/collection). The separate `database.sqlite` file holds this application's decks and collections.

Deck, collection, and storage location URLs use stable public IDs such as
`deck_N4zkx4TSvUwQm4dB`. Each ID has a type prefix and 96 random bits encoded
in 16 URL-safe characters. SQLite integer IDs remain internal database keys.
On startup, existing rows without public IDs are assigned one; the IDs remain
the same on later restarts. Old numeric URLs no longer resolve.

The large `AllPrintings` SQLite file is ignored by Git. To fetch the latest MTGJSON release and verify its published SHA-256 checksum, run from this directory:

```sh
python3 tools/scripts/refresh-mtgjson.py
```

Rebuild and restart the server after refreshing so the binary name index also updates. Existing decks continue to refer to MTGJSON card UUIDs.

The script also builds the **offline card pack** that clients can install from their
Profile page: one entry per card name with each face's name, mana cost, type line, rules
text, power/toughness, loyalty and defense, from its newest English printing, and the
card's default printing: the one `/sync/v1/resolve-card` picks (its first front face), so
a card added offline is the same printing it would be online. It has no other printings,
images or legality. It is written beside `AllPrintings.sqlite` as `CardPack.json.gz`
(about 3 MB for 35,000 cards) and `CardPack.info.json` (its version,
card count, size and SHA-256), both linked into `src/assets` and ignored by Git. The
server serves them at `/cards/pack` and `/cards/pack/info`. To rebuild only the pack
from the installed database:

```sh
python3 tools/scripts/refresh-mtgjson.py --pack-only
```

## Card image mirror and offline card art

`tools/scripts/card-images.py` mirrors Scryfall's card images and builds the offline card
art pack. Scryfall publishes no image archives, only bulk card data with each image's URL,
so `mirror` downloads its Default Cards bulk file (every printing) and then each image from
Scryfall's CDN, 24 at a time (the CDN has no rate limit). It resumes where it stopped, and
fetches each card's default printing first.

```sh
# Art crops (~10 GB) and full PNGs (~200 GB) of every printing, e.g. onto the NAS.
python3 tools/scripts/card-images.py mirror --dest /Volumes/<share>/card-images --variants art_crop png

# The offline art pack: each card's default-printing art at 240 px wide (WebP, ~137 MB for
# 35,000 cards) in 5 MB chunks, written beside AllPrintings.sqlite and linked as src/assets/card-art.
python3 tools/scripts/card-images.py art-pack --source /Volumes/<share>/card-images
```

Each card's art is its default printing's illustration, cropped from the plainest printing
of it the mirror holds: Scryfall's crops of promos and special frames can take in the frame.

The server serves the pack at `/cards/art/index` and `/cards/art/<chunk>`, and what it is
at `/cards/art/info` (CardArt.info.json: its size and the index's sha256, which names the
build, so clients can tell theirs is out of date). The card pack (`/cards/pack/info`) and
the card-name index (`/suggest/card-names/info`, NameLookup.info.json written by
`build-name-index.js`) publish their sha256 the same way. Clients offer it
once when the app installs, and Profile installs, updates or removes it; offline, the
service worker answers `/images/art_crop/<id>.jpg` from it.

## Card images

The server returns its own image URLs in card and deck responses. A request to
`/images/{small|normal|large|art_crop}/{scryfallId}.jpg` first reads the art cache,
then downloads the JPEG from Scryfall and stores it before responding. The cache is
artcache, the card-art cache this server shares with torimtgd (the mtg-ai repository's
server): its contract is [`3rd/artcache/FORMAT.md`](../../3rd/artcache/FORMAT.md), and
the C library (`3rd/artcache`, a copy of mtg-ai's `torimtg/3rd/artcache` made by
`scripts/sync-artcache.sh`; never edit it here) is built into the `artcache` addon
(`native/artcache_addon.c`).

- **The folder** holds the images as `<root>/<variant>/<id>.jpg`. Set it with
  `TORIMTG_ART_CACHE`; otherwise it is `TMG_SCRYFALL_CACHE`, else
  `<per-user data>/torimtg/scryfall_cache` (`%LOCALAPPDATA%` on Windows,
  `~/Library/Application Support` on macOS, `$XDG_DATA_HOME` or `~/.local/share`
  elsewhere). It may be on a network share used by several machines.
- **The mirror** (optional, `TORIMTG_ART_MIRROR`, as torimtgd's `--art-mirror`) is a second
  folder in the same layout behind the first, normally the NAS's behind a local one. An image
  the folder lacks is copied from the mirror before Scryfall is asked, and one Scryfall brings is
  copied up to the mirror in the background (written beside its place and renamed into it, at
  most four at once). A mirror that is not mounted, or does not answer within 15 seconds, is
  passed over for Scryfall.
- **The index** is this machine's SQLite record of the folder: which images are there,
  which process here is downloading which, recent failures, and each image's
  measurements (size, palette and preview, served at `/images/<variant>/<id>.json`). It
  never lives in the folder. Its default is
  `<per-user data>/torimtg/artcache/<hash of the folder>.sqlite`; set `TORIMTG_ART_INDEX`
  to put it elsewhere. Deleting it costs only re-measuring and the failure records.

The server logs both paths when it starts. Processes on one machine share the index, so
two servers asking for the same image download it once: the other waits for it. A
machine finds images another machine put in the folder without downloading them. A
Scryfall 404 (or other failure) is not asked again for an hour.

**Sharing a NAS with torimtgd.** Point both servers at the same folder on every machine,
for example `TORIMTG_ART_CACHE=Z:\mtg-ai-assets\scryfall` on Windows and
`/mnt/z/mtg-ai-assets/scryfall` under WSL (torimtgd also takes `--art-cache DIR`).
Leave each machine its own index: WSL and Windows count as different machines.

**Moving the old cache.** Earlier versions kept images in `~/Documents/mtg-card-images`
as `<variant>/<id>.jpg` with a `<variant>/<id>.json` sidecar beside each. Move the
`.jpg` files into the same `<variant>/` folders of the new cache; they are taken in the
first time they are asked for. The `.json` sidecars are no longer used and can be
deleted (each image is measured again, once per machine).

Successful images are served with `Cache-Control: public, max-age=31536000`
and a content-based `ETag`; matching conditional requests receive `304`. The
local copy is retained until you remove it from the cache folder (a file removed
there is downloaded again). To use another storage system, implement `ImageCache`
in `src/images/ImageCache.ts` and replace `ArtCacheImageCache` in `src/main.ts`. Run
`npm run test:images` to test image fetching, the cache shared between processes and
machines, and HTTP responses.

## Shared database

Several cube-light servers on one network can share their decks, collections and accounts
through a copy of the application database on the NAS: the second level behind each server's own
`database.sqlite`. Set `CUBE_SHARED_DATABASE` to the copy's path, by convention
`<share>/cube-light/database/cube-light-application-database.sqlite`; a `README.txt` beside it
says what it is. Each server keeps serving from its own database, and merges with the copy:

- **at boot**, before it listens. A server with no database of its own starts from the copy, less
  what belongs to the server that made it. The first server finds no copy and makes it.
- **after its own changes**, `CUBE_SHARED_CHANGE_SECONDS` (30) after the first.
- **every `CUBE_SHARED_SYNC_SECONDS`** (300), to take the other servers' changes.
- **when it stops**, for at most 30 seconds.

A merge takes `<copy>.lock` (made exclusively; one older than ten minutes is a dead server's and
is taken over), copies the file to this machine, merges both ways, and writes the result back
beside the copy and renames it into place. The copy is never opened where it lies, since SQLite's
locks do not hold over SMB. `cube-light-application-database.json` holds the copy's revision, so
when neither side has changed a merge reads only that. With the NAS away, the server serves its
own database and merges when the NAS is back.

What is merged (`src/sync/shared-merge.ts`):

- **The event ledger.** Where one server's chain for a deck, collection, location, scan or
  profile extends the other's, the missing events are copied as they are. Where both changed it
  since they last merged, the copy's chain is kept and this server's own events are replayed on
  top of it, as a git rebase does. Card quantity changes are recomputed from their deltas, so
  both servers' additions count. An event that no longer applies (its deck was deleted on the
  other server, say) is dropped, logged and kept in the `SharedMergeConflicts` table.
- **Accounts**, by id and name. The newer password wins, and "sign out everywhere" carries over.
  An account whose name has another id on the other server is a conflict and is left apart.
- **Uploads** (scan photos, banner images), by their content hash.

Sessions, signing keys, receipts, scan leases and each server's identity are never merged.
Devices hold a session with one server, so a device signs in once to each.

Run `node --test test/shared-database.test.js` (after `npm run compile`) to test merging.

## Parallax art (height maps)

With **Parallax art** on (Profile → Display, saved on the profile), deck banners draw
their card art with depth.
- **How:** the client marches through the art's height map in WebGL 2.
- **What moves the view:** the mouse over the art, or the phone's tilt. iOS must be asked
  for motion first: a small badge marks art that could follow the phone, and tapping the art
  shows the button that asks. With nothing moving it, the view drifts slowly.
- **When it stays flat:** without WebGL 2, without a map, or when the system asks for
  reduced motion.

The server makes each art crop's height map the first time a client asks, and keeps it in
the art cache as `depth/<id>.png`, where torimtgd keeps its own.

- **`GET /images/depth`** says whether this server makes them (`{ available, stamp, reason }`).
- **`GET /images/depth/<scryfallId>.png`** answers with the map: a greyscale PNG the size
  of the art, 105 for the farthest point and 223 for the nearest. While the map is being
  made the answer is `503` with `Retry-After`. It is `404` when there is none to be had: no
  art, no model, or making it failed twice. A map is cached for a day by its `ETag`.

**The model** is Depth-Anything V2 Small (ONNX, Apache-2.0), at
`models/depth-anything-v2-small/model.onnx`. It is tracked in Git, so a checkout has it.
`npm run depth-model` verifies it against `models/models.json`, and
`npm run depth-model -- install` restores it from Hugging Face if it is missing or corrupt.
`CUBELIGHT_DEPTH_MODEL` names another file, and `CUBELIGHT_DEPTH=0` turns parallax art off.

**How the maps are made.**
- **Where:** the model runs on `onnxruntime-node` (CPU) on a worker thread, so requests are
  never held up. It is loaded on the first request and released after ten idle minutes. A
  map takes about half a second.
- **The same maps as torimtgd's:** `src/images/depth/height-map.ts` ports mtg-ai's
  `torimtg/server/depth_worker.py`, pipeline 1 (the same input resize, bicubic upsampling,
  blur and tone curve). From the same pixels its maps agree with torimtgd's to within one
  byte. The two servers write the same stamp into each map's PNG (`torimtg-version`), so
  they use each other's maps instead of remaking them.
- **Keeping in step:** when mtg-ai bumps `PIPELINE`, port the change and bump
  `DEPTH_PIPELINE`.
- **Other stamps:** a map with an older stamp is served while it is made again. A newer one
  (the same model, a later pipeline) is left as it is.
- **Several processes:** on one machine, a map being made is claimed in the art cache's
  index, so two processes never make it at once.

Run `npm run test:depth` to test making, serving and sharing maps.

## Card name index

`npm run build` compiles the C name index with node-gyp, compiles the same lookup code
to WebAssembly with Emscripten (`emcc`), and builds `NameLookup.nmi` from
`src/assets/AllPrintings.sqlite`. A C compiler, Python, and Emscripten must be
available on `PATH`.

The server serves the binary index at `/suggest/card-names/index` and the Wasm
module at `/suggest/card-names/wasm`. Client v2 loads both and searches the index
through WebAssembly. Set lookups use the indexed `cards.name` column in SQLite.

Run `npm run benchmark:name-index` after building to compare lookup results,
memory use, file size, and query time. It writes the latest measurements to
[`benchmarks/name-index.md`](benchmarks/name-index.md).
