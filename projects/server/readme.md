# Server

The server is an Express REST application that accesses SQLite through Node.js's built-in `node:sqlite` module.

## Getting Started

Use Node.js 24 or newer and install dependencies with `npm install` in this directory.

Run `npm start` to build and start the server on port 4040.

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

## Card images

The server returns its own image URLs in card and deck responses. A request to
`/images/{small|normal|large|art_crop}/{scryfallId}.jpg` first reads the local
cache, then downloads the JPEG from Scryfall and stores it before responding.
The default cache is `~/Documents/mtg-card-images`, outside this Git repository.
To use another storage system, implement `ImageCache` in `src/images/ImageCache.ts`
and replace `FileImageCache` in `src/main.ts`.

Successful images are served with `Cache-Control: public, max-age=31536000`
and a content-based `ETag`; matching conditional requests receive `304`. The
local copy is retained until you remove it from the cache directory. Run
`npm run test:images` to test image fetching, local caching, and HTTP responses.

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
