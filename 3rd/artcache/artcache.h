/* artcache: the card-art cache that torimtgd (mtg-ai) and cube-light share (FORMAT.md).
 *
 * The art is files in one folder, which may be on a network share (a NAS) and may be used by
 * several machines at once. Each machine keeps an index of that folder in its own SQLite database,
 * never in the folder: SQLite's WAL and its locks only work between processes on one machine.
 *
 *   the folder   <root>/<kind>/<name>.<ext>, written only as a uniquely named temporary file
 *                renamed into place, so a reader on any machine sees a whole file or none.
 *   the index    on this machine: which files are there (a miss looks in the folder and takes in
 *                what another machine wrote), what each was made by (its version), which process
 *                here is making which file (a claim with a lease), the last failure of each, a
 *                queue of files to make, and facts about a file a host keeps (its measurements).
 *
 * Processes on one machine share its index, so they never make the same file twice at once; two
 * machines may, and the second rename leaves an equally good file. Nothing here touches the
 * network: a host downloads or makes a file itself (torimtgd's server/fetch.c and server/depth.c,
 * cube-light's CardImageService) and hands it over with ArtCache_Commit.
 *
 * Kinds and names: art_crop, small, normal and large are Scryfall's JPEG images (.jpg), png its
 * full card PNG (.png), depth a height map (.png). A name is a Scryfall id, lowercase, "<id>" for
 * a card's front and "<id>-back" for a double-faced card's back; a depth name may also be
 * "arena-<art id>" (an Arena card art's map). Every name is ASCII hex digits, digits, '-' and
 * lowercase letters: the same file on Windows, macOS and Linux, on case-insensitive disks too.
 * Uppercase hex is taken and lowercased.
 *
 * Paths are UTF-8 on every platform (Windows: converted to the wide API). Times are seconds; the
 * caller passes the clock (`now`) so tests can move it. A handle is used from one thread. */
#ifndef ARTCACHE_H
#define ARTCACHE_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define ARTCACHE_FORMAT 1     /* the folder's format (FORMAT.md), in <root>/artcache.txt */
#define ARTCACHE_NAME_CAP 48  /* a name and its NUL */
#define ARTCACHE_PATH_CAP 1200
#define ARTCACHE_VERSION_CAP 256

struct ArtCache;

enum ArtCacheState
{
    ARTCACHE_ABSENT,  /* no file, nobody here is making it, no failure inside the window asked about */
    ARTCACHE_PRESENT, /* the file is there (made by the version asked for, when one was) */
    ARTCACHE_STALE,   /* the file is there, made by another version than the one asked for */
    ARTCACHE_CLAIMED, /* no file; another process on this machine is making it now */
    ARTCACHE_FAILED,  /* no file; making it failed inside the window asked about */
};

/* -- where ---------------------------------------------------------------------------------------- */

/* The folder when the host names none: $TORIMTG_ART_CACHE, else $TMG_SCRYFALL_CACHE (the torimtg
 * client's older name), else the per-user data folder's torimtg/scryfall_cache (Windows
 * %LOCALAPPDATA%, macOS ~/Library/Application Support, else $XDG_DATA_HOME or ~/.local/share).
 * False when there is none (or a variable says "none"). */
bool
ArtCache_DefaultRoot(
    char* out,
    size_t cap);

/* The index of `root` on this machine when the host names none: $TORIMTG_ART_INDEX, else
 * <per-user data folder>/torimtg/artcache/<16 hex digits of the root's hash>.sqlite. */
bool
ArtCache_DefaultIndex(
    const char* root,
    char* out,
    size_t cap);

/* -- the handle ----------------------------------------------------------------------------------- */

/* Opens (creating when missing) the folder and this machine's index of it. `index` NULL: the
 * default. NULL with the reason in err when the folder cannot be made, its format is newer than
 * this library's, or the index cannot be opened, is newer, or belongs to another folder. */
struct ArtCache*
ArtCache_Open(
    const char* root,
    const char* index,
    char* err,
    size_t err_cap);

/* Gives up this handle's claims. Accepts NULL. */
void
ArtCache_Close(struct ArtCache* c);

/* The folder, with '/' separators and no trailing one. */
const char*
ArtCache_Root(const struct ArtCache* c);

const char*
ArtCache_IndexPath(const struct ArtCache* c);

/* -- names ---------------------------------------------------------------------------------------- */

bool
ArtCache_KindOk(const char* kind);

/* Whether name is one of kind's (above). */
bool
ArtCache_NameOk(
    const char* kind,
    const char* name);

/* The canonical (lowercase) name into out (ARTCACHE_NAME_CAP); false when it is not one of kind's. */
bool
ArtCache_Name(
    const char* kind,
    const char* name,
    char* out);

/* <root>/<kind>/<name>.<ext>. False for a bad kind or name, or when it does not fit. */
bool
ArtCache_Path(
    const struct ArtCache* c,
    const char* kind,
    const char* name,
    char* out,
    size_t cap);

/* -- what there is -------------------------------------------------------------------------------- */

/* The state of kind/name. `version` NULL: any file is PRESENT. A failure younger than `retry_s`
 * makes a missing file FAILED (0: never). A name the index does not know is looked for in the
 * folder (one stat; and for a versioned file, its version read from it) and taken in. */
enum ArtCacheState
ArtCache_Lookup(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* version,
    int64_t retry_s,
    int64_t now);

/* The version of the file the index knows ("" unknown or none). False when it knows no file. */
bool
ArtCache_FileVersion(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    char* out,
    size_t cap);

/* The file was gone or unreadable when the host went to read it: the index forgets it. */
void
ArtCache_Forget(
    struct ArtCache* c,
    const char* kind,
    const char* name);

/* -- making a file: Claim, write TempPath, then Commit or Fail ---------------------------------- */

/* Whether this handle may make kind/name of `version` (NULL: any): true when nobody else here
 * holds a live claim on it and the index has no such file (another process may have made it since
 * this one looked). The claim is then this handle's until now + lease_s; claiming again renews it. */
bool
ArtCache_Claim(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* version,
    int64_t lease_s,
    int64_t now);

/* Gives up a claim without an outcome. */
void
ArtCache_Release(
    struct ArtCache* c,
    const char* kind,
    const char* name);

/* Where to write the file before Commit: beside it, named for this handle
 * (<name>.<ext>.<token>.part), its folder made. */
bool
ArtCache_TempPath(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    char* out,
    size_t cap);

/* Renames temp into place (replacing a file there), records it with `version` (NULL: none; a
 * versioned file carries its version too, FORMAT.md), and clears its claim, failure, queued job and
 * facts. False when the rename fails (temp is removed). */
bool
ArtCache_Commit(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* temp,
    const char* version,
    int64_t now);

/* Making it failed: records the failure (one more attempt for `version`, NULL none), clears the
 * claim, and removes temp (NULL: none). */
void
ArtCache_Fail(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* temp,
    const char* version,
    const char* error,
    int64_t now);

/* The failed attempts recorded for `version` (NULL none), 0 when there are none. */
int
ArtCache_Attempts(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* version);

/* -- facts about a file --------------------------------------------------------------------------- */

/* A value a host keeps for a file (cube-light: its measurements), dropped when the file changes.
 * Get: malloc'd text (free it) or NULL. Set: false when the index cannot write. */
char*
ArtCache_InfoGet(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* key);

bool
ArtCache_InfoSet(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* key,
    const char* value);

/* -- the queue of files to make (shared by the processes on this machine) ------------------------ */

#define ARTCACHE_RANK_FRONT (-1) /* above every job queued */

/* Queues kind/name at `rank` (a job already queued keeps the higher of the two). The next job is
 * the highest rank, then the oldest. */
void
ArtCache_JobAdd(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    int rank,
    int64_t now);

void
ArtCache_JobRemove(
    struct ArtCache* c,
    const char* kind,
    const char* name);

/* Takes the next job of kind and claims it for lease_s: its name into out (ARTCACHE_NAME_CAP).
 * Skipped: jobs another process here holds a live claim on, and jobs that have failed
 * max_attempts times for `version`. False when there is none. */
bool
ArtCache_JobNext(
    struct ArtCache* c,
    const char* kind,
    const char* version,
    int max_attempts,
    int64_t lease_s,
    int64_t now,
    char* out);

/* Jobs of kind still to make (queued: running ones included) and those given up (failed
 * max_attempts times for `version`). */
void
ArtCache_JobCount(
    struct ArtCache* c,
    const char* kind,
    const char* version,
    int max_attempts,
    int* queued,
    int* failed);

#endif
