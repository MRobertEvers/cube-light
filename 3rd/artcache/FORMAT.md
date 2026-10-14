# artcache: the shared card-art cache

One folder of card art that **torimtgd** (mtg-ai, `torimtg/server`) and **cube-light**
(`projects/server`) both read and fill. The folder may be on a network share (a NAS) used by
several machines at once. This file is the contract. `artcache.h` and `artcache.c` implement it,
and both repositories carry the same copy in `3rd/artcache/`, next to SQLite in `3rd/sqlite/`.
mtg-ai's `torimtg/3rd/artcache` is the original. cube-light copies it with
`scripts/sync-artcache.sh`.

The library only caches. Downloading from Scryfall and making height maps belong to each host
(torimtgd's `server/fetch.c` and `server/depth.c`, cube-light's `CardImageService`), and those
hosts hand finished files to the library.

## The folder

```
<root>/
  artcache.txt               "torimtg art cache, format 1": the folder's format
  art_crop/<name>.jpg        Scryfall's art crop
  small/<name>.jpg           Scryfall's card images
  normal/<name>.jpg
  large/<name>.jpg
  png/<name>.png             Scryfall's full card PNG
  depth/<name>.png           a height map of art_crop/<name>.jpg (or of an Arena art)
  depth/stamp.txt            (older folders) what made the maps that carry no version
  ...                        anything else (cards/, index.tsv from torimtg's tools) is left alone
```

**Names.**
- A Scryfall id in lowercase, 8-4-4-4-12 hex digits.
- `<id>` names a card's front, and `<id>-back` names the back face of a double-faced card.
- A height map may also be named `arena-<art id>` (1 to 9 digits), for an Arena card art. Its
  source art lives in the Arena asset cache, not here.
- A name uses only `0-9 a-f - .` plus the letters of `arena`/`back`. That makes it a valid file name
  on every filesystem (Windows, macOS, Linux, SMB and NFS shares), and two spellings of one name can
  never coexist on a case-insensitive disk.
- Uppercase ids are accepted and lowercased.

**Writing.** A file is never written in place.
1. Write `<kind>/<name>.<ext>.<token>.part`. The token is 16 hex digits unique to the writer's
   handle.
2. Rename it over `<kind>/<name>.<ext>`.

A reader on any machine therefore sees a whole file or none. When two writers race, the second
rename wins with an equally good file. A `.part` file left behind by a crash is never mistaken for
art and can be deleted at any time.

**Versions.** Some kinds are made by a program that changes, such as the height maps and their
depth model.
- Such a file names its maker in a PNG `tEXt` chunk with keyword `torimtg-version`, placed before
  the image data. For height maps the value is depth_worker.py's stamp,
  `"<model> pipeline <N>"`.
- A PNG without that chunk takes the first line of its folder's `stamp.txt`, the convention of
  folders written before the chunk existed.
- A file of another version than the one a host asks for is **stale**. It is still served, and the
  host decides whether to make it again. torimtgd remakes it unless the map is newer than its own
  worker: the same model with a higher pipeline number. Two machines on different revisions
  therefore never take turns remaking each other's maps.
- Nothing ever deletes a folder of maps.

## The index (one per machine)

SQLite cannot safely share a database across machines: WAL needs shared memory, and network
filesystems lock unreliably. So no database lives in the folder. Each machine keeps its own index
of the folder:

- Default location: `<per-user data>/torimtg/artcache/<hash>.sqlite`. The per-user data folder is
  `%LOCALAPPDATA%` on Windows, `~/Library/Application Support` on macOS, and `$XDG_DATA_HOME` or
  `~/.local/share` elsewhere. The hash is 16 hex digits of FNV-1a 64 over the folder's absolute
  path (case-folded on Windows and macOS).
- `$TORIMTG_ART_INDEX` overrides the location.
- WAL journal, synchronous NORMAL, a 5 s busy timeout. Every write is a single statement or a
  short `BEGIN IMMEDIATE` transaction.
- An index belongs to one folder (`meta.root`) and refuses to open for another.
- The index is a cache of the folder. Deleting it loses only failure records and queued jobs.
- WSL and Windows are separate machines for this purpose, because their process ids differ.
  Never point both at one index.

| table     | holds                                                                                   |
|-----------|-----------------------------------------------------------------------------------------|
| `meta`    | `schema_version`, `root`                                                                |
| `file`    | (kind, name) → size, mtime, version, when seen: the files known to be in the folder      |
| `info`    | (kind, name, key) → value: facts a host keeps about a file, dropped when the file changes |
| `claim`   | (kind, name) → owner, lease end: which process on this machine is making it             |
| `failure` | (kind, name) → version, attempts, time, error: the last failed attempt(s)               |
| `job`     | (kind, name) → rank, seq: files queued to be made (the height maps)                     |

**Lookups.**
- A name in `file` is trusted without touching the folder. A host that then finds the file
  unreadable calls `ArtCache_Forget`.
- A name not in `file`, or known only at another version, is looked up in the folder with one
  stat (plus a read of the version for a PNG). A file found there, perhaps written by another
  machine, is taken in. This is how a machine learns of art another machine downloaded, with no
  download.

**Claims.**
- Before making a file, a process claims it with a lease. Other processes on the machine see it
  `CLAIMED` and wait for it (they poll) instead of downloading it too.
- A claim is refused while the index already has the file at the asked-for version, so a process
  that looked before another one finished does not make the file again.
- A claim ends when the process commits, fails or releases it, closes its handle, or dies. Claims
  of dead processes are swept when the next process opens the index. Otherwise the lease runs
  out.
- Two machines do not see each other's claims, so they may both make a file. The atomic rename
  makes that harmless.

**Failures.**
- A failure is recorded with the version it was for. A host asks with a retry window: torimtgd
  and cube-light don't ask Scryfall again for an hour after a 404.
- A height map is given up after two failures for one version. A new version starts the count
  again.

**Jobs.**
- The next job is the highest rank, then the oldest. `ARTCACHE_RANK_FRONT` is above every other
  job (at least 1000; hosts use 0 to 999).
- Taking a job claims it. Committing the file ends the job.

Migrations append to `MIGRATIONS` in artcache.c; never edit one that shipped. An index or folder
newer than the library is refused rather than misread.

## Configuration

| what        | torimtgd                                   | cube-light                       | both                    |
|-------------|--------------------------------------------|----------------------------------|-------------------------|
| the folder  | `--art-cache DIR`                          | `TORIMTG_ART_CACHE`              | `$TORIMTG_ART_CACHE`    |
| the index   | `--art-index FILE`                         | `TORIMTG_ART_INDEX`              | `$TORIMTG_ART_INDEX`    |

Folder resolution order:
1. The host's own flag or setting.
2. `$TORIMTG_ART_CACHE`.
3. `$TMG_SCRYFALL_CACHE`, the torimtg client's older name.
4. torimtgd only: the mtg-ai-assets checkout's `scryfall/` folder, its folder before this library.
5. `<per-user data>/torimtg/scryfall_cache`, the folder the torimtg client already reads.

To share the NAS between both servers on every machine, set `TORIMTG_ART_CACHE` for both, for
example to `Z:\mtg-ai-assets\scryfall` on Windows and `/mnt/z/mtg-ai-assets/scryfall` under WSL.
