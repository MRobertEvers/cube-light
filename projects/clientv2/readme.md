# Client v2

This is a React single-page app built with Vite.

## Development

Use Node.js 20.19+ or 22.12+ and npm. From this directory:

```sh
npm install
npm run dev
```

The development server runs on port 3000 on all interfaces, so it is reachable at `http://localhost:3000` and from the LAN at `http://<hostname>.local:3000`. Start the backend separately. API requests go to port 4040 on whichever host served the page; set `VITE_BACKEND_HOST_URI` before starting Vite to use another backend URL.

### Releases

Devices load the last **release** by default, even from the dev server, so the app stays
usable while you develop. A release is the production build, committed under `release/`
and named for its day (`YYYY-MM-DD`, then `YYYY-MM-DD.2` for a second one that day).

```sh
npm run release                      # build into release/
git add release && git commit -m "Release 2026-09-25"
git tag release-2026-09-25 && git push && git push --tags
```

```text
 page load on a device with the shell worker
     │
     ▼
 development mode on? ──no──► release page from this device's cache (release/index.html)
     │ yes
     ▼
 dev server answers within 4 s? ──yes──► development page from Vite
     │ no
     ▼
 release page from this device's cache
```

The dev server serves the release's `sw.js`, its page at `/index.html?shell=release`,
and its `/assets/`. The worker precaches the release, so it also serves it offline.
Turn development mode on or off under **Profile → App version**, which also shows what
is running: a release's date and build time, or the dev server's commit and its time.
It also names the release the service worker has installed on the device, which is
what loads offline or when the dev server is down.
The toggle needs the service worker, so it only appears on a secure origin (see
below). Without a service worker, the dev server's own page loads as usual.

Changes to `src/workers/shell/shell.worker.ts` reach devices with the next release.
Before the first release, the dev server serves a worker with nothing cached, and
every page loads from the dev server.

### HTTPS on your network

A plain-HTTP LAN address is not a secure context, so browsers there withhold the
install prompt, the offline shell worker and `crypto.subtle`. To get a secure
context on a phone, the dev server serves a publicly trusted Let's Encrypt
certificate for `*.local.mrobertevers.com`, and each device is reached by a name
under it, such as `matthew-mbp-m4.local.mrobertevers.com`.

Those device names exist only in a small DNS server on the WireGuard host
(`tools/local-dns/`). Public DNS never holds them, and because the certificate is a
wildcard, Certificate Transparency logs record only `*.local.mrobertevers.com`.

```text
                         What is public                What stays private
                  ┌───────────────────────────┐   ┌──────────────────────────────────┐
                  │ Let's Encrypt certificate │   │ device names and their addresses │
                  │   *.local.mrobertevers.com│   │   matthew-mbp-m4 → 10.0.0.2      │
                  │ _acme-challenge.local TXT │   │   (answered only by local-dns)   │
                  │   (about a minute, every  │   │                                  │
                  │    ~60 days)              │   │ certs/dev-key.pem (dev machine)  │
                  └───────────────────────────┘   └──────────────────────────────────┘
```

#### Opening the app from a phone

```text
  Phone (WireGuard up)         WireGuard hub (cloud VM)             Dev machine
 ┌─────────────────────┐      ┌───────────────────────────┐      ┌──────────────────┐
 │ https://matthew-mbp │1. DNS│ local-dns 10.0.0.1:53     │      │ npm run dev      │
 │ -m4.local.mrobert…  │─────►│  matthew-mbp-m4.local.    │      │  Vite :3000      │
 │ :3000               │      │   mrobertevers.com?       │      │  certs/dev.pem   │
 │                     │      │  hosts file → 10.0.0.2    │      │  (*.local.       │
 │                     │◄─────│  A 10.0.0.2, TTL 30       │      │   mrobertevers)  │
 │                     │      │                           │      │                  │
 │                     │2. HTTPS to 10.0.0.2:3000 ────────┼─────►│ tunnel 10.0.0.2  │
 │                     │      │ (hub forwards peer ↔ peer)│      │                  │
 │                     │3. certificate: trusted CA ✓  name matches *.local… ✓  key ✓│
 └─────────────────────┘      └───────────────────────────┘      └──────────────────┘
```

That is the path away from home. When the phone and the Mac are both at home, local-dns
answers the Mac's LAN address instead, and the connection goes straight across the
Wi-Fi without leaving the house (next section).

#### How local-dns answers

Devices name themselves: `npm run dev` registers the machine with local-dns over the
tunnel, and local-dns answers with its LAN address when the phone is at home and its
tunnel address when it is not.

```text
 npm run dev (Mac)                                   local-dns on the hub
   every 2 minutes, over the tunnel:
   POST http://10.0.0.1:8053/register   ─────────►   registry (entries last 10 minutes)
   {"name": "matthew-mbp-m4",                          matthew-mbp-m4
    "lan": ["192.168.1.148"]}                            tunnel 10.0.0.2   ← from the TCP connection,
                                                         LAN    192.168.1.148 not from the request
```

The registrant's identity is its tunnel address. WireGuard drops any packet whose
source address is not in the sending peer's `AllowedIPs`, and a TCP connection
cannot be completed from a spoofed address, so a registration from `10.0.0.2` came
from that peer. A name belongs to one tunnel address until it expires, and a name in
the hosts file can only be registered from the address listed there.

To tell whether two devices are in the same place, local-dns compares the public
address each tunnel comes from. `wg show` needs network-admin rights, so a small
root helper (`wg-endpoints.sh`) writes `tunnel address → endpoint` to
`/run/local-dns/endpoints` every 3 seconds, and local-dns only reads that file.

```text
 query from 10.0.0.10 (phone) for matthew-mbp-m4.local.mrobertevers.com
     │
     ▼
 registered?  ──no──► hosts file ──► mDNS (home-LAN hosts only) ──► NXDOMAIN
     │ yes                (tunnel address, TTL 30)
     ▼
 phone's tunnel comes from 136.34.76.29, Mac's from 136.34.76.29
     │
     ├── same public address (both at home)  ──► 192.168.1.148   straight across the Wi-Fi
     └── different, or unknown (phone away)  ──► 10.0.0.2        through the hub
                         TTL 10 s, so moving between Wi-Fi and cellular takes effect quickly
```

Names outside `.local.mrobertevers.com` are forwarded to `1.1.1.1`. WireGuard has no
split DNS: while the tunnel is up, every lookup goes to the `DNS =` server in the
client config, so local-dns must answer everything. AAAA and HTTPS queries for a
device get an empty answer, so clients fall back to its A record.

#### Where it runs

The WireGuard server for `mrobertevers.com` is a cloud VM acting as a hub: every
device is its own peer with one tunnel address, and no peer routes the home LAN.
So device names map to tunnel addresses, which work at home and away alike, and
local-dns answers from a hosts file (mDNS multicast cannot reach a cloud VM).

```text
                        WireGuard hub (cloud VM, wg0 10.0.0.1)
                        local-dns on 10.0.0.1:53, hosts file:
                          matthew-mbp-m4  10.0.0.2
                                   ▲  │
                        DNS query  │  │ A 10.0.0.2
                                   │  ▼
   phone 10.0.0.x ─────── tunnel ──┴──┴── tunnel ─────── matthew-mbp-m4 10.0.0.2
          │                                                  ▲
          └──── HTTPS to 10.0.0.2:3000, forwarded by the hub ─┘
```

The hosts file is a fallback for devices that do not register, such as ones that
never run `npm run dev`; registrations take precedence while they are fresh.

Each client's WireGuard config sends DNS to the hub and routes the tunnel subnet:

```ini
[Interface]
Address = 10.0.0.5/32
PrivateKey = …
DNS = 10.0.0.1                  # local-dns; WireGuard sends every lookup here

[Peer]
Endpoint = mrobertevers.com:51820
AllowedIPs = 10.0.0.0/24        # at least the tunnel subnet, so peers reach each other
```

On a Mac, `/etc/resolver/local.mrobertevers.com` containing `nameserver 10.0.0.1`
sends only this zone to local-dns and leaves every other lookup alone.

Install or update it with `tools/local-dns/deploy.sh`, which copies the scripts, the
hosts file and the two systemd units (`local-dns` and `local-dns-endpoints`), then
restarts them. local-dns listens only on the tunnel address, for DNS on port 53 and
registrations on 8053, so neither is reachable from the internet. Keep the hosts
file, which names your devices, outside the repository:

```sh
tools/local-dns/deploy.sh mrobertevers.com local.mrobertevers.com 10.0.0.1 ~/.config/local-dns/hosts
```

#### What `npm run dev` does first

```text
 npm run dev
     │
     ▼
 certs/acme.config.json? ──no──► serve plain HTTP (as before)
     │ yes
     ▼
 certs/dev.pem valid, trusted, covers the name,
 and more than 30 days left? ──yes──► start Vite with HTTPS          (almost every run)
     │ no
     ▼
 DNS provider automatic? ──no──► print "run npm run dev:cert:le", start with what exists
     │ yes
     ▼
 issue a new certificate (about 1–2 minutes), then start Vite with HTTPS
 (on failure: log it and start with the current certificate; the next run retries)
```

Certificates last 90 days, so this renews roughly every 60 days. An expired
certificate is never served; the server falls back to plain HTTP instead.

With a certificate, port 3000 still answers plain HTTP as well: the first byte of each
connection tells a TLS handshake from an HTTP request (`tools/plain-http.mjs`). So
`http://localhost:3000` and `http://<lan-ip>:3000` keep working alongside the HTTPS
name, without a secure context.

#### How a certificate is issued (DNS-01)

Let's Encrypt must check for itself that you control the domain. With DNS-01 it
looks up a TXT record the script publishes, which works even though the dev
machine is unreachable from the internet.

```text
 letsencrypt.mjs        DnsProvider           Zone's nameservers         Let's Encrypt
      │                 (GoDaddy API)         (ns33/ns34, anycast)        (several regions)
      │── new order ───────────────────────────────────────────────────────────►│
      │◄─ challenge token ──────────────────────────────────────────────────────│
      │── setRecord(TXT _acme-challenge.local, token)►│                         │
      │                        │── publish ──────────►│                         │
      │── ask each nameserver until all have it ─────►│                         │
      │── wait propagationSeconds (default 60) ──     │                         │
      │── "ready, validate" ───────────────────────────────────────────────────►│
      │                                               │◄── TXT lookups ─────────│
      │◄─ valid ────────────────────────────────────────────────────────────────│
      │── CSR, finalize, download ─────────────────────────────────────────────►│
      │   write certs/dev.pem + certs/dev-key.pem                               │
      │── removeRecord(TXT) ──►│                                                │
```

The wait exists because the nameservers are anycast: each address is served by
many machines, and the script can only query the one nearest it. Let's Encrypt
checks from several regions and needs most of them to see the record.

```text
                     DNS provider API
                          │ write (instant)
          ┌───────────────┼────────────────┐   copies spread
          ▼               ▼                ▼   over seconds
   nameserver copy A  nameserver copy B  nameserver copy C
   (near this machine)  (other region)    (other region)
          ▲               ▲                ▲
     our check        Let's Encrypt    Let's Encrypt
```

If a validation fails, the "no such name" answer is cached for the zone's negative
TTL (600 s at GoDaddy), so wait that long before retrying. Let's Encrypt also allows
only five failed validations per name per hour.

#### Pieces and configuration

```text
 tools/vite.mjs            starts Vite; calls ensureCertificate() for dev and preview
 tools/letsencrypt.mjs     ensureCertificate() and issueCertificate(); CLI: npm run dev:cert:le
 tools/acme.mjs            minimal ACME (RFC 8555) client and DNS propagation check
 tools/dev-certs.mjs       loads certs/, reports days left / names / staging
 tools/dns/provider.mjs    DnsProvider interface: setRecord, removeRecord, automatic
      ├── dns/godaddy.mjs  GoDaddy Domains v3 API with a Personal Access Token
      └── dns/manual.mjs   prints the record and waits for Enter
 tools/local-dns/          the private DNS server (runs on the WireGuard host, not here)
      ├── local-dns.mjs    UDP/TCP server, hosts file, forwarding; CLI
      ├── registry.mjs     POST /register, name ownership, LAN-or-tunnel choice
      ├── endpoints.mjs    reads /run/local-dns/endpoints
      ├── wg-endpoints.sh  root helper that writes it
      ├── mdns.mjs         asks <host>.local over multicast DNS
      ├── dns-message.mjs  the DNS wire format it needs
      ├── register.mjs     the client side; npm run dev uses it
      └── deploy.sh, *.service
```

The certificate code depends only on `DnsProvider`; supporting another registrar
means adding one file under `tools/dns/` and a case in `createDnsProvider`.

`certs/` is git-ignored. `certs/acme.config.json`:

```json
{
  "email": "you@example.com",
  "domain": "*.local.example.com",
  "dns": "godaddy",
  "godaddyPatFile": "~/path/to/godaddy_dns_pat",
  "localDns": { "registry": "http://10.0.0.1:8053" }
}
```

Optional keys: `extraDomains` (more names on the same certificate), `zone` (when the
registered domain is not the last two labels), `propagationSeconds`, `localDns.name` (the name to register; the machine's `.local`
name by default; without `localDns`, `npm run dev` registers nothing). A wildcard
covers one label: `*.local.example.com` covers `laptop.local.example.com`, not
`local.example.com` or `a.b.local.example.com`. `GODADDY_PAT`
in the environment overrides `godaddyPatFile`. The token needs only the
`domains.dns:update` scope. With `"dns": "manual"`, run `npm run dev:cert:le` and
add the record when asked. Without `--production` it uses Let's Encrypt's staging
service, which is untrusted but has generous rate limits for testing.

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

The implementation is [experimental-scanner.js](src/platform/card-scanner/experimental-scanner.js), adapted to the application by [card-image-ocr.ts](src/platform/card-scanner/card-image-ocr.ts). The benchmark imports that same source. It uses the whole available card-name catalog, never the twelve expected answers or annotated coordinates as recognition input. It does **not match artwork**.

1. **Read visible titles.** [photo-scan.js](src/platform/card-scanner/photo-scan.js) preserves the original resolution and uses 960-pixel tiles with 200-pixel overlap (48 tiles for the 5712 × 4284 photo). PP-OCRv5_mobile_det and PP-OCRv6_small_rec run in a worker with WASM, one thread and SIMD, using detector/box thresholds 0.1/0.3. Catalog matching normalizes case, punctuation and accents, shortlists names with character trigrams, and ranks edit distance. Rules/type text is filtered. Normal acceptance requires similarity ≥0.84, OCR score ≥0.75, sufficient length and a ≥0.12 name margin unless exact. These scores are heuristics, not probabilities.
2. **Find possible title strips.** [fresh-proposals.js](src/platform/card-scanner/fresh-proposals.js) searches light title bands, ink components, and a perspective-corrected card plane. Orange sleeve masks and line geometry generate locations automatically. The plane transformation assumes roughly coplanar cards and normal card proportions; other sleeve colors and overlapping piles can reduce recovery. This is custom card geometry, not Paddle's optional document unwarping model.
3. **Compare printed letters.** [font-ocr.js](src/platform/card-scanner/font-ocr.js) renders the full catalog in Beleren, excluding digital `A-` rebalances, and normalizes strips to 96 × 16 pixels. Row-mean subtraction reduces background effects. A horizontal projection shortlists 100 names; pixel similarity retains five. [refine-font.js](src/platform/card-scanner/refine-font.js) fits horizontal/vertical blur. Optical acceptance requires a fit ≥0.75, a ≥0.12 lead and length/spatial checks. On this photo, font matching added Inventor's Axe, Cloudsculpt Technician and Melded Moxite to the seven OCR names.
4. **Compare real printed titles.** [reference-titles.js](src/platform/card-scanner/reference-titles.js) handles typography that the synthetic font does not reproduce. A catalog of 40,289 printing IDs covers 33,309 normal-layout names, with up to two frame versions per name. Only references for proposed candidates are requested. Images come from local assets when present, otherwise Scryfall; only the title band contributes to matching. A ≥0.85 fit and ≥0.15 margin recovered Galvanic Blast, reaching eleven names.
5. **Verify uncertain names with Paddle medium.** [paddle-region-reader.js](src/platform/card-scanner/paddle-region-reader.js) enlarges and straightens ambiguous strips, then runs the 73.01 MiB PP-OCRv6_medium_rec model in a WASM worker. Catalog-constrained CTC prefix search supplies alternatives. [ctc-candidate-score.js](src/platform/card-scanner/ctc-candidate-score.js) computes exact CTC forward likelihoods for the optical seeds and alternatives, summing valid blank/character alignments, including repeated letters. It preserves original model probabilities instead of making a forced catalog choice appear certain by renormalizing over the allowed names.
6. **Accept agreement and deduplicate.** [consensus.js](src/platform/card-scanner/consensus.js) requires the verifier and optical matcher to rank the same name first at the same location: optical similarity ≥0.5, unmasked support ≥0.03, mean log-likelihood margin ≥0.15, and at least eight letters. Close agreeing cases can retry up to three automatically generated crop geometries without relaxing acceptance. This added Inventor's Goggles and another Metallic Rebuke instance. Optical seeds also guide verification, so these are not independent probability estimates. Spatial deduplication merges repeated observations; accepted candidates enter the deck-import queue.

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

The UI displays the current operation and its actual work count: text-model loading, OCR tiles, three name-index/title-search passes, plane correction, blur refinement, reference downloads/comparison, verifier loading and per-crop verification. Unknown loading totals use an indeterminate bar. Known work maps to weighted stage intervals in [scan-progress.ts](src/domain/scans/scan-progress.ts), stays monotonic even when verification adds crop variants, and stops at 99% until recognized cards have been added. Completion is then 100%. The percentage is stage-weighted work, **not a download-byte percentage or an ETA**. The processing tab has exact phase/count events; another device infers the stage from persisted overall progress. Refinement now yields periodically so the UI can repaint between batches; some geometry still runs on the main thread.

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
