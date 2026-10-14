/* artcache (artcache.h, FORMAT.md): the folder of card art and this machine's SQLite index of it.
 * Plain C11 that builds with GCC, Clang and MSVC; its only dependency is SQLite. */
#if !defined(_WIN32) && !defined(_POSIX_C_SOURCE) && !defined(_GNU_SOURCE)
#define _POSIX_C_SOURCE 200809L /* kill, realpath, fdopen under -std=c11 */
#endif
#if defined(_MSC_VER) && !defined(_CRT_SECURE_NO_WARNINGS)
#define _CRT_SECURE_NO_WARNINGS /* the wide C calls below are the portable ones */
#endif

#include "artcache.h"

#include "../sqlite/sqlite3.h" /* 3rd/sqlite beside 3rd/artcache, in either repository */

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <direct.h>
#include <fcntl.h>
#include <io.h>
#include <process.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <wchar.h>
#else
#include <fcntl.h>
#include <limits.h>
#include <signal.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#ifndef PATH_MAX
#define PATH_MAX 4096
#endif
#endif

#define PATH_CAP ARTCACHE_PATH_CAP
#define MARKER "artcache.txt"
#define BUSY_MS 5000         /* how long a write waits for another process's (theirs take microseconds) */
#define FRONT_RANK_MIN 1000  /* ARTCACHE_RANK_FRONT: at least this, above every host's own ranks */

struct ArtCache
{
    sqlite3* db;
    char root[PATH_CAP];
    char index[PATH_CAP];
    char owner[48]; /* "<pid>.<token>": this handle in the claim table */
    char token[24]; /* 16 hex digits: this handle's temporary files */
};

static const struct
{
    const char* kind;
    const char* ext;
} KINDS[] = {
    { "art_crop", "jpg" }, { "small", "jpg" }, { "normal", "jpg" }, { "large", "jpg" },
    { "png", "png" },      { "depth", "png" },
};
#define N_KINDS ((int)(sizeof KINDS / sizeof KINDS[0]))

/* -- the platform ----------------------------------------------------------------------------------
 * Paths are UTF-8; on Windows each call converts to UTF-16 and uses the wide API (the narrow one
 * would read them in the ANSI code page). '/' separators throughout: Windows takes them. */

#if defined(_WIN32)
typedef struct _stat64 Stat;

static bool
widen(
    const char* s,
    wchar_t* out,
    int cap)
{
    return MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, s, -1, out, cap) > 0;
}

static int
stat_utf8(
    const char* path,
    Stat* st)
{
    wchar_t w[PATH_CAP];
    return widen(path, w, PATH_CAP) ? _wstat64(w, st) : -1;
}

static bool
st_is_file(const Stat* st)
{
    return (st->st_mode & _S_IFMT) == _S_IFREG;
}

static bool
st_is_dir(const Stat* st)
{
    return (st->st_mode & _S_IFMT) == _S_IFDIR;
}

static bool
mkdir_one(const char* path)
{
    wchar_t w[PATH_CAP];
    return widen(path, w, PATH_CAP) && (_wmkdir(w) == 0 || errno == EEXIST);
}

static bool
rename_over(
    const char* from,
    const char* to)
{
    wchar_t a[PATH_CAP], b[PATH_CAP];
    return widen(from, a, PATH_CAP) && widen(to, b, PATH_CAP) && MoveFileExW(a, b, MOVEFILE_REPLACE_EXISTING) != 0;
}

static void
remove_file(const char* path)
{
    wchar_t w[PATH_CAP];
    if( widen(path, w, PATH_CAP) )
        _wremove(w);
}

static FILE*
open_file(
    const char* path,
    const char* mode)
{
    wchar_t w[PATH_CAP], m[8];
    return widen(path, w, PATH_CAP) && widen(mode, m, 8) ? _wfopen(w, m) : NULL;
}

/* A new file, opened for writing; NULL when it exists already (or cannot be made). */
static FILE*
create_new(const char* path)
{
    wchar_t w[PATH_CAP];
    int fd = widen(path, w, PATH_CAP) ? _wopen(w, _O_CREAT | _O_EXCL | _O_WRONLY | _O_BINARY, _S_IREAD | _S_IWRITE) : -1;
    return fd < 0 ? NULL : _fdopen(fd, "wb");
}

/* An environment variable as UTF-8; false when unset, empty or too long. */
static bool
env_utf8(
    const char* name,
    char* out,
    size_t cap)
{
    wchar_t wname[64];
    if( !widen(name, wname, 64) )
        return false;
    const wchar_t* v = _wgetenv(wname);
    return v && v[0] && WideCharToMultiByte(CP_UTF8, 0, v, -1, out, (int)cap, NULL, NULL) > 0;
}

static long
own_pid(void)
{
    return (long)_getpid();
}

static bool
pid_alive(long pid)
{
    HANDLE h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, (DWORD)pid);
    if( !h )
        return GetLastError() == ERROR_ACCESS_DENIED; /* someone else's: alive */
    DWORD code = 0;
    bool alive = GetExitCodeProcess(h, &code) && code == STILL_ACTIVE;
    CloseHandle(h);
    return alive;
}

/* The absolute form of an existing folder. */
static bool
absolute(
    const char* path,
    char* out,
    size_t cap)
{
    wchar_t w[PATH_CAP], full[PATH_CAP];
    return widen(path, w, PATH_CAP) && _wfullpath(full, w, PATH_CAP)
           && WideCharToMultiByte(CP_UTF8, 0, full, -1, out, (int)cap, NULL, NULL) > 0;
}
#else
typedef struct stat Stat;

static int
stat_utf8(
    const char* path,
    Stat* st)
{
    return stat(path, st);
}

static bool
st_is_file(const Stat* st)
{
    return S_ISREG(st->st_mode);
}

static bool
st_is_dir(const Stat* st)
{
    return S_ISDIR(st->st_mode);
}

static bool
mkdir_one(const char* path)
{
    return mkdir(path, 0777) == 0 || errno == EEXIST;
}

static bool
rename_over(
    const char* from,
    const char* to)
{
    return rename(from, to) == 0;
}

static void
remove_file(const char* path)
{
    remove(path);
}

static FILE*
open_file(
    const char* path,
    const char* mode)
{
    return fopen(path, mode);
}

static FILE*
create_new(const char* path)
{
    int fd = open(path, O_CREAT | O_EXCL | O_WRONLY, 0666);
    return fd < 0 ? NULL : fdopen(fd, "wb");
}

static bool
env_utf8(
    const char* name,
    char* out,
    size_t cap)
{
    const char* v = getenv(name);
    return v && v[0] && snprintf(out, cap, "%s", v) < (int)cap;
}

static long
own_pid(void)
{
    return (long)getpid();
}

static bool
pid_alive(long pid)
{
    return kill((pid_t)pid, 0) == 0 || errno == EPERM;
}

static bool
absolute(
    const char* path,
    char* out,
    size_t cap)
{
    char buf[PATH_MAX];
    return realpath(path, buf) && snprintf(out, cap, "%s", buf) < (int)cap;
}
#endif

static bool
is_sep(char c)
{
#if defined(_WIN32)
    return c == '/' || c == '\\';
#else
    return c == '/';
#endif
}

static bool
is_dir(const char* path)
{
    Stat st;
    return stat_utf8(path, &st) == 0 && st_is_dir(&st);
}

/* The size and modification time of a regular, non-empty file. */
static bool
file_stat(
    const char* path,
    int64_t* size,
    int64_t* mtime)
{
    Stat st;
    if( stat_utf8(path, &st) != 0 || !st_is_file(&st) || st.st_size <= 0 )
        return false;
    *size = (int64_t)st.st_size;
    *mtime = (int64_t)st.st_mtime;
    return true;
}

/* '\' to '/' (Windows), and no trailing separator unless the path is a root ("/", "C:/"). */
static void
tidy(char* path)
{
#if defined(_WIN32)
    for( char* p = path; *p; p++ )
        if( *p == '\\' )
            *p = '/';
#endif
    size_t n = strlen(path);
    while( n > 1 && path[n - 1] == '/' && !(n == 3 && path[1] == ':') )
        path[--n] = 0;
}

/* Every missing folder of path (a drive, "\\server\share" or "/" is taken as there). */
static bool
mkdirs(const char* path)
{
    char buf[PATH_CAP];
    if( snprintf(buf, sizeof buf, "%s", path) >= (int)sizeof buf )
        return false;
    size_t n = strlen(buf);
    while( n > 1 && is_sep(buf[n - 1]) )
        buf[--n] = 0;
    size_t start = 0;
#if defined(_WIN32)
    if( n >= 2 && buf[1] == ':' )
        start = 2;
    else if( n >= 2 && is_sep(buf[0]) && is_sep(buf[1]) )
    {
        size_t p = 2;
        while( p < n && !is_sep(buf[p]) )
            p++; /* the server */
        p++;
        while( p < n && !is_sep(buf[p]) )
            p++; /* the share */
        start = p;
    }
#endif
    for( size_t i = start + 1; i <= n; i++ )
    {
        if( i < n && !is_sep(buf[i]) )
            continue;
        char c = buf[i];
        buf[i] = 0;
        bool ok = is_dir(buf) || mkdir_one(buf);
        buf[i] = c;
        if( !ok && i == n )
            return false;
    }
    return is_dir(buf);
}

/* The per-user data folder's torimtg/ (artcache.h, ArtCache_DefaultRoot). */
static bool
data_dir(
    char* out,
    size_t cap)
{
    char base[PATH_CAP];
    bool ok;
#if defined(_WIN32)
    ok = env_utf8("LOCALAPPDATA", base, sizeof base) && snprintf(out, cap, "%s/torimtg", base) < (int)cap;
#elif defined(__APPLE__)
    ok = env_utf8("HOME", base, sizeof base)
         && snprintf(out, cap, "%s/Library/Application Support/torimtg", base) < (int)cap;
#else
    /* the XDG base directory spec: only an absolute XDG_DATA_HOME counts */
    if( env_utf8("XDG_DATA_HOME", base, sizeof base) && base[0] == '/' )
        ok = snprintf(out, cap, "%s/torimtg", base) < (int)cap;
    else
        ok = env_utf8("HOME", base, sizeof base) && snprintf(out, cap, "%s/.local/share/torimtg", base) < (int)cap;
#endif
    if( ok )
        tidy(out);
    return ok;
}

/* -- names ---------------------------------------------------------------------------------------- */

static int
kind_index(const char* kind)
{
    for( int i = 0; kind && i < N_KINDS; i++ )
        if( strcmp(kind, KINDS[i].kind) == 0 )
            return i;
    return -1;
}

static bool
is_hex(char c)
{
    return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

bool
ArtCache_KindOk(const char* kind)
{
    return kind_index(kind) >= 0;
}

bool
ArtCache_Name(
    const char* kind,
    const char* name,
    char* out)
{
    int k = kind_index(kind);
    if( k < 0 || !name )
        return false;
    /* "<uuid>" or "<uuid>-back", 8-4-4-4-12 hex digits */
    bool uuid = true;
    for( int i = 0; i < 36 && uuid; i++ )
    {
        bool dash = i == 8 || i == 13 || i == 18 || i == 23;
        uuid = dash ? name[i] == '-' : is_hex(name[i]);
    }
    if( uuid && (name[36] == 0 || strcmp(name + 36, "-back") == 0) )
    {
        size_t n = strlen(name);
        for( size_t i = 0; i <= n; i++ )
            out[i] = (name[i] >= 'A' && name[i] <= 'F') ? (char)(name[i] - 'A' + 'a') : name[i];
        return true;
    }
    /* a depth map may be an Arena art's: "arena-<1 to 9 digits>" */
    if( strcmp(KINDS[k].kind, "depth") == 0 && strncmp(name, "arena-", 6) == 0 )
    {
        int n = 0;
        for( const char* p = name + 6; *p; p++, n++ )
            if( *p < '0' || *p > '9' || n >= 9 )
                return false;
        if( n == 0 )
            return false;
        snprintf(out, ARTCACHE_NAME_CAP, "%s", name);
        return true;
    }
    return false;
}

bool
ArtCache_NameOk(
    const char* kind,
    const char* name)
{
    char buf[ARTCACHE_NAME_CAP];
    return ArtCache_Name(kind, name, buf);
}

bool
ArtCache_Path(
    const struct ArtCache* c,
    const char* kind,
    const char* name,
    char* out,
    size_t cap)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !ArtCache_Name(kind, name, canon) )
        return false;
    int n = snprintf(out, cap, "%s/%s/%s.%s", c->root, kind, canon, KINDS[kind_index(kind)].ext);
    return n > 0 && (size_t)n < cap;
}

/* -- where ---------------------------------------------------------------------------------------- */

bool
ArtCache_DefaultRoot(
    char* out,
    size_t cap)
{
    char v[PATH_CAP];
    out[0] = 0;
    const char* vars[] = { "TORIMTG_ART_CACHE", "TMG_SCRYFALL_CACHE" };
    for( int i = 0; i < 2; i++ )
        if( env_utf8(vars[i], v, sizeof v) )
        {
            if( strcmp(v, "none") == 0 || snprintf(out, cap, "%s", v) >= (int)cap )
            {
                out[0] = 0;
                return false;
            }
            tidy(out);
            return true;
        }
    char data[PATH_CAP];
    if( !data_dir(data, sizeof data) || snprintf(out, cap, "%s/scryfall_cache", data) >= (int)cap )
    {
        out[0] = 0;
        return false;
    }
    return true;
}

/* FNV-1a, 64 bits, of the root as this machine names it: case folded where the disks usually
 * fold it (Windows, macOS), so "C:/Art" and "c:/art" share one index. */
static uint64_t
root_hash(const char* root)
{
    uint64_t h = 1469598103934665603ull;
    for( const unsigned char* p = (const unsigned char*)root; *p; p++ )
    {
        unsigned char ch = *p;
#if defined(_WIN32) || defined(__APPLE__)
        if( ch >= 'A' && ch <= 'Z' )
            ch = (unsigned char)(ch - 'A' + 'a');
#endif
        h ^= ch;
        h *= 1099511628211ull;
    }
    return h;
}

bool
ArtCache_DefaultIndex(
    const char* root,
    char* out,
    size_t cap)
{
    char v[PATH_CAP];
    out[0] = 0;
    if( env_utf8("TORIMTG_ART_INDEX", v, sizeof v) )
    {
        if( snprintf(out, cap, "%s", v) >= (int)cap )
            return out[0] = 0, false;
        tidy(out);
        return true;
    }
    char data[PATH_CAP];
    if( !root || !data_dir(data, sizeof data)
        || snprintf(out, cap, "%s/artcache/%016llx.sqlite", data, (unsigned long long)root_hash(root)) >= (int)cap )
        return out[0] = 0, false;
    return true;
}

/* -- the index ------------------------------------------------------------------------------------
 * MIGRATIONS[i] takes the index from version i to i + 1 (meta.schema_version). Append; never edit
 * one that shipped. An index is a cache of the folder: deleting it loses only failures and jobs. */
static const char* const MIGRATIONS[] = {
    /* 0 -> 1 */
    "CREATE TABLE file ("
    "  kind    TEXT NOT NULL,"
    "  name    TEXT NOT NULL,"
    "  size    INTEGER NOT NULL,"
    "  mtime   INTEGER NOT NULL,"
    "  version TEXT NOT NULL,"
    "  seen    INTEGER NOT NULL,"
    "  PRIMARY KEY (kind, name)"
    ") WITHOUT ROWID;"
    "CREATE TABLE info ("
    "  kind  TEXT NOT NULL,"
    "  name  TEXT NOT NULL,"
    "  key   TEXT NOT NULL,"
    "  value TEXT NOT NULL,"
    "  PRIMARY KEY (kind, name, key)"
    ") WITHOUT ROWID;"
    "CREATE TABLE claim ("
    "  kind  TEXT NOT NULL,"
    "  name  TEXT NOT NULL,"
    "  owner TEXT NOT NULL,"
    "  until INTEGER NOT NULL,"
    "  PRIMARY KEY (kind, name)"
    ") WITHOUT ROWID;"
    "CREATE TABLE failure ("
    "  kind     TEXT NOT NULL,"
    "  name     TEXT NOT NULL,"
    "  version  TEXT NOT NULL,"
    "  attempts INTEGER NOT NULL,"
    "  at       INTEGER NOT NULL,"
    "  error    TEXT,"
    "  PRIMARY KEY (kind, name)"
    ") WITHOUT ROWID;"
    "CREATE TABLE job ("
    "  kind      TEXT NOT NULL,"
    "  name      TEXT NOT NULL,"
    "  rank      INTEGER NOT NULL,"
    "  seq       INTEGER NOT NULL,"
    "  queued_at INTEGER NOT NULL,"
    "  PRIMARY KEY (kind, name)"
    ") WITHOUT ROWID;"
    "CREATE INDEX job_next ON job(kind, rank DESC, seq);",
};
#define SCHEMA_VERSION ((int)(sizeof MIGRATIONS / sizeof MIGRATIONS[0]))

static void
set_err(
    char* err,
    size_t cap,
    const char* what,
    const char* why)
{
    if( err && cap )
        snprintf(err, cap, "%s: %s", what, why);
}

/* An unexpected SQLite error, with the start of the statement that met it. */
static void
complain(
    sqlite3* db,
    const char* sql)
{
    fprintf(stderr, "artcache: %s (%.48s)\n", sqlite3_errmsg(db), sql ? sql : "");
}

static sqlite3_stmt*
prep(
    struct ArtCache* c,
    const char* sql)
{
    sqlite3_stmt* st = NULL;
    if( sqlite3_prepare_v2(c->db, sql, -1, &st, NULL) != SQLITE_OK )
    {
        complain(c->db, sql);
        return NULL;
    }
    return st;
}

/* Steps a statement that returns no row, then finalizes it. */
static bool
run(
    struct ArtCache* c,
    sqlite3_stmt* st)
{
    if( !st )
        return false;
    bool ok = sqlite3_step(st) == SQLITE_DONE;
    if( !ok )
        complain(c->db, sqlite3_sql(st));
    sqlite3_finalize(st);
    return ok;
}

static bool
exec(
    sqlite3* db,
    const char* sql)
{
    char* msg = NULL;
    if( sqlite3_exec(db, sql, NULL, NULL, &msg) == SQLITE_OK )
        return true;
    fprintf(stderr, "artcache: %s (%.48s)\n", msg ? msg : sqlite3_errmsg(db), sql);
    sqlite3_free(msg);
    return false;
}

/* WAL, which the index keeps once set. Changing the journal mode takes the database whole, and SQLite
 * does not wait for that (no busy handler): several processes opening a new index at once take
 * turns here. */
static bool
set_wal(sqlite3* db)
{
    for( int waited = 0;; waited += 20 )
    {
        sqlite3_stmt* st = NULL;
        bool wal = false;
        int rc = sqlite3_prepare_v2(db, "PRAGMA journal_mode = WAL", -1, &st, NULL);
        if( rc == SQLITE_OK )
        {
            rc = sqlite3_step(st);
            wal = rc == SQLITE_ROW && sqlite3_column_text(st, 0)
                  && strcmp((const char*)sqlite3_column_text(st, 0), "wal") == 0;
        }
        sqlite3_finalize(st);
        if( wal )
            return true;
        if( (rc != SQLITE_BUSY && rc != SQLITE_LOCKED) || waited >= BUSY_MS )
        {
            complain(db, "PRAGMA journal_mode = WAL");
            return false;
        }
        sqlite3_sleep(20);
    }
}

/* (kind, name) as the first two parameters. */
static sqlite3_stmt*
prep_kn(
    struct ArtCache* c,
    const char* sql,
    const char* kind,
    const char* name)
{
    sqlite3_stmt* st = prep(c, sql);
    if( st )
    {
        sqlite3_bind_text(st, 1, kind, -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(st, 2, name, -1, SQLITE_TRANSIENT);
    }
    return st;
}

static int
meta_int(
    sqlite3* db,
    const char* key)
{
    sqlite3_stmt* st = NULL;
    int v = 0;
    if( sqlite3_prepare_v2(db, "SELECT value FROM meta WHERE key = ?", -1, &st, NULL) == SQLITE_OK )
    {
        sqlite3_bind_text(st, 1, key, -1, SQLITE_STATIC);
        if( sqlite3_step(st) == SQLITE_ROW )
            v = sqlite3_column_int(st, 0);
    }
    sqlite3_finalize(st);
    return v;
}

static bool
meta_set(
    sqlite3* db,
    const char* key,
    const char* value)
{
    sqlite3_stmt* st = NULL;
    bool ok = sqlite3_prepare_v2(db, "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", -1, &st, NULL)
              == SQLITE_OK;
    if( ok )
    {
        sqlite3_bind_text(st, 1, key, -1, SQLITE_STATIC);
        sqlite3_bind_text(st, 2, value, -1, SQLITE_STATIC);
        ok = sqlite3_step(st) == SQLITE_DONE;
    }
    sqlite3_finalize(st);
    return ok;
}

/* The schema up to date and the index bound to root, in one write transaction (two processes
 * opening a new index at once take turns). */
static bool
migrate(
    sqlite3* db,
    const char* root,
    char* err,
    size_t err_cap)
{
    if( !exec(db, "BEGIN IMMEDIATE") )
    {
        set_err(err, err_cap, "index", sqlite3_errmsg(db));
        return false;
    }
    bool ok = exec(db, "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    int have = ok ? meta_int(db, "schema_version") : 0;
    if( ok && have > SCHEMA_VERSION )
    {
        set_err(err, err_cap, "index", "made by a newer artcache (schema version too high)");
        ok = false;
    }
    for( int v = have; ok && v < SCHEMA_VERSION; v++ )
    {
        char num[16];
        snprintf(num, sizeof num, "%d", v + 1);
        ok = exec(db, MIGRATIONS[v]) && meta_set(db, "schema_version", num);
        if( !ok )
            set_err(err, err_cap, "index migration", sqlite3_errmsg(db));
    }
    if( ok )
    {
        sqlite3_stmt* st = NULL;
        char bound[PATH_CAP] = "";
        if( sqlite3_prepare_v2(db, "SELECT value FROM meta WHERE key = 'root'", -1, &st, NULL) == SQLITE_OK
            && sqlite3_step(st) == SQLITE_ROW && sqlite3_column_text(st, 0) )
            snprintf(bound, sizeof bound, "%s", (const char*)sqlite3_column_text(st, 0));
        sqlite3_finalize(st);
        if( !bound[0] )
            ok = meta_set(db, "root", root);
        else if( root_hash(bound) != root_hash(root) )
        {
            set_err(err, err_cap, "index", "it is the index of another folder");
            ok = false;
        }
    }
    if( !exec(db, ok ? "COMMIT" : "ROLLBACK") && ok )
    {
        set_err(err, err_cap, "index", sqlite3_errmsg(db));
        ok = false;
    }
    return ok;
}

/* Claims whose process has ended (a crash; a claim is a process's, and they are all this
 * machine's): given up at once rather than when their lease runs out. This process's other
 * handles' claims are theirs; a reused process id waits for the lease. */
static void
sweep_claims(struct ArtCache* c)
{
    sqlite3_stmt* st = prep(c, "SELECT DISTINCT owner FROM claim");
    char dead[64][48];
    int n = 0;
    while( st && n < 64 && sqlite3_step(st) == SQLITE_ROW )
    {
        const char* owner = (const char*)sqlite3_column_text(st, 0);
        long pid = owner ? strtol(owner, NULL, 10) : 0;
        if( owner && pid > 0 && pid != own_pid() && !pid_alive(pid) && strlen(owner) < sizeof dead[0] )
            snprintf(dead[n++], sizeof dead[0], "%s", owner);
    }
    sqlite3_finalize(st);
    for( int i = 0; i < n; i++ )
    {
        st = prep(c, "DELETE FROM claim WHERE owner = ?");
        if( st )
            sqlite3_bind_text(st, 1, dead[i], -1, SQLITE_TRANSIENT);
        run(c, st);
    }
}

/* <root>/artcache.txt: names the folder's format. Written once by whoever comes first; a folder
 * of a newer format is refused. */
static bool
check_marker(
    const char* root,
    char* err,
    size_t err_cap)
{
    char path[PATH_CAP];
    if( snprintf(path, sizeof path, "%s/%s", root, MARKER) >= (int)sizeof path )
    {
        set_err(err, err_cap, root, "the path is too long");
        return false;
    }
    FILE* f = open_file(path, "rb");
    if( f )
    {
        char text[256] = "";
        size_t n = fread(text, 1, sizeof text - 1, f);
        fclose(f);
        text[n] = 0;
        const char* p = strstr(text, "format ");
        if( p && atoi(p + 7) > ARTCACHE_FORMAT )
        {
            set_err(err, err_cap, path, "the folder has a newer format than this artcache");
            return false;
        }
        return true;
    }
    f = create_new(path); /* exclusive: another process may be writing it now */
    if( f )
    {
        fprintf(f, "torimtg art cache, format %d\n"
                   "Card art in <kind>/<name>.<ext>, shared by torimtgd and cube-light.\n"
                   "See 3rd/artcache/FORMAT.md in either repository.\n",
                ARTCACHE_FORMAT);
        fclose(f);
    }
    return true;
}

struct ArtCache*
ArtCache_Open(
    const char* root,
    const char* index,
    char* err,
    size_t err_cap)
{
    if( err && err_cap )
        err[0] = 0;
    char dir[PATH_CAP], abs_root[PATH_CAP];
    if( !root || !root[0] || snprintf(dir, sizeof dir, "%s", root) >= (int)sizeof dir )
    {
        set_err(err, err_cap, "art cache", "no folder, or its path is too long");
        return NULL;
    }
    tidy(dir);
    if( !mkdirs(dir) || !absolute(dir, abs_root, sizeof abs_root) )
    {
        set_err(err, err_cap, dir, "cannot make the folder");
        return NULL;
    }
    tidy(abs_root);
    if( !check_marker(abs_root, err, err_cap) )
        return NULL;

    struct ArtCache* c = calloc(1, sizeof *c);
    if( !c )
    {
        set_err(err, err_cap, "art cache", "out of memory");
        return NULL;
    }
    snprintf(c->root, sizeof c->root, "%s", abs_root);
    if( index && index[0] )
        snprintf(c->index, sizeof c->index, "%s", index);
    else if( !ArtCache_DefaultIndex(c->root, c->index, sizeof c->index) )
    {
        set_err(err, err_cap, "art cache", "no folder for its index ($TORIMTG_ART_INDEX)");
        free(c);
        return NULL;
    }
    tidy(c->index);

    bool memory = strcmp(c->index, ":memory:") == 0;
    if( !memory )
    {
        char parent[PATH_CAP];
        snprintf(parent, sizeof parent, "%s", c->index);
        char* slash = strrchr(parent, '/');
        if( slash && slash != parent )
        {
            *slash = 0;
            if( !mkdirs(parent) )
            {
                set_err(err, err_cap, parent, "cannot make the index's folder");
                free(c);
                return NULL;
            }
        }
    }
    int rc = sqlite3_open_v2(c->index, &c->db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, NULL);
    if( rc != SQLITE_OK )
    {
        set_err(err, err_cap, c->index, c->db ? sqlite3_errmsg(c->db) : sqlite3_errstr(rc));
        sqlite3_close(c->db);
        free(c);
        return NULL;
    }
    sqlite3_busy_timeout(c->db, BUSY_MS);
    /* WAL: readers never wait for the writer; synchronous NORMAL: a write survives a crash of the
     * process and costs little. (A lost write costs at most a stat or a download.) */
    if( (!memory && !set_wal(c->db)) || !exec(c->db, "PRAGMA synchronous = NORMAL")
        || !migrate(c->db, c->root, err, err_cap) )
    {
        if( err && err_cap && !err[0] )
            set_err(err, err_cap, c->index, sqlite3_errmsg(c->db));
        sqlite3_close(c->db);
        free(c);
        return NULL;
    }
    unsigned char rnd[8];
    sqlite3_randomness((int)sizeof rnd, rnd);
    for( int i = 0; i < 8; i++ )
        snprintf(c->token + 2 * i, 3, "%02x", rnd[i]);
    snprintf(c->owner, sizeof c->owner, "%ld.%s", own_pid(), c->token);
    sweep_claims(c);
    return c;
}

void
ArtCache_Close(struct ArtCache* c)
{
    if( !c )
        return;
    sqlite3_stmt* st = prep(c, "DELETE FROM claim WHERE owner = ?");
    if( st )
        sqlite3_bind_text(st, 1, c->owner, -1, SQLITE_STATIC);
    run(c, st);
    sqlite3_close(c->db); /* every statement here is finalized before its function returns */
    free(c);
}

const char*
ArtCache_Root(const struct ArtCache* c)
{
    return c->root;
}

const char*
ArtCache_IndexPath(const struct ArtCache* c)
{
    return c->index;
}

/* -- a file's version ------------------------------------------------------------------------------
 * A versioned file (a height map) names what made it in a PNG tEXt chunk, keyword
 * "torimtg-version", before its image data. A PNG without one takes its folder's stamp.txt (maps
 * made before the chunk existed). */

static uint32_t
be32(const unsigned char* p)
{
    return (uint32_t)p[0] << 24 | (uint32_t)p[1] << 16 | (uint32_t)p[2] << 8 | p[3];
}

static bool
png_version(
    const char* path,
    char* out,
    size_t cap)
{
    static const unsigned char SIG[8] = { 137, 80, 78, 71, 13, 10, 26, 10 };
    static const char KEY[] = "torimtg-version";
    FILE* f = open_file(path, "rb");
    if( !f )
        return false;
    unsigned char head[8];
    bool found = false;
    if( fread(head, 1, 8, f) == 8 && memcmp(head, SIG, 8) == 0 )
    {
        for( int i = 0; i < 64 && !found && fread(head, 1, 8, f) == 8; i++ )
        {
            uint32_t len = be32(head);
            const unsigned char* type = head + 4;
            if( memcmp(type, "IDAT", 4) == 0 || memcmp(type, "IEND", 4) == 0 || len > (1u << 24) )
                break;
            if( memcmp(type, "tEXt", 4) == 0 && len <= sizeof KEY + ARTCACHE_VERSION_CAP )
            {
                char buf[sizeof KEY + ARTCACHE_VERSION_CAP + 1];
                if( fread(buf, 1, len, f) != len )
                    break;
                buf[len] = 0;
                size_t k = sizeof KEY; /* past the keyword's NUL */
                if( len >= k && strcmp(buf, KEY) == 0 )
                {
                    found = snprintf(out, cap, "%.*s", (int)(len - k), buf + k) < (int)cap;
                }
                if( fseek(f, 4, SEEK_CUR) != 0 )
                    break;
            }
            else if( fseek(f, (long)len + 4, SEEK_CUR) != 0 )
                break;
        }
    }
    fclose(f);
    return found;
}

static void
folder_stamp(
    const struct ArtCache* c,
    const char* kind,
    char* out,
    size_t cap)
{
    char path[PATH_CAP];
    out[0] = 0;
    if( snprintf(path, sizeof path, "%s/%s/stamp.txt", c->root, kind) >= (int)sizeof path )
        return;
    FILE* f = open_file(path, "rb");
    if( !f )
        return;
    if( !fgets(out, (int)cap, f) )
        out[0] = 0;
    fclose(f);
    size_t n = strlen(out);
    while( n && (out[n - 1] == '\n' || out[n - 1] == '\r' || out[n - 1] == ' ' || out[n - 1] == '\t') )
        out[--n] = 0;
}

static void
read_version(
    const struct ArtCache* c,
    const char* kind,
    const char* path,
    char* out,
    size_t cap)
{
    out[0] = 0;
    if( strcmp(KINDS[kind_index(kind)].ext, "png") == 0 && !png_version(path, out, cap) )
        folder_stamp(c, kind, out, cap);
}

/* -- what there is -------------------------------------------------------------------------------- */

static void
forget(
    struct ArtCache* c,
    const char* kind,
    const char* name)
{
    run(c, prep_kn(c, "DELETE FROM file WHERE kind = ?1 AND name = ?2", kind, name));
    run(c, prep_kn(c, "DELETE FROM info WHERE kind = ?1 AND name = ?2", kind, name));
}

/* Records the file at path (seen now) with its version, its facts dropped (it is another file). */
static bool
record(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    int64_t size,
    int64_t mtime,
    const char* version,
    int64_t now)
{
    sqlite3_stmt* st = prep_kn(c,
                               "INSERT OR REPLACE INTO file (kind, name, size, mtime, version, seen)"
                               " VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                               kind, name);
    if( !st )
        return false;
    sqlite3_bind_int64(st, 3, size);
    sqlite3_bind_int64(st, 4, mtime);
    sqlite3_bind_text(st, 5, version ? version : "", -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(st, 6, now);
    bool ok = run(c, st);
    run(c, prep_kn(c, "DELETE FROM info WHERE kind = ?1 AND name = ?2", kind, name));
    return ok;
}

/* A file in the folder the index does not know (or knows by an older size and time): taken in. */
static void
take_in(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* path,
    int64_t size,
    int64_t mtime,
    int64_t now,
    char* version,
    size_t cap)
{
    read_version(c, kind, path, version, cap);
    record(c, kind, name, size, mtime, version, now);
}

enum ArtCacheState
ArtCache_Lookup(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* version,
    int64_t retry_s,
    int64_t now)
{
    char canon[ARTCACHE_NAME_CAP], path[PATH_CAP], have[ARTCACHE_VERSION_CAP];
    if( !c || !ArtCache_Name(kind, name, canon) || !ArtCache_Path(c, kind, canon, path, sizeof path) )
        return ARTCACHE_ABSENT;
    int64_t size = 0, mtime = 0;
    bool known = false;
    sqlite3_stmt* st = prep_kn(c, "SELECT size, mtime, version FROM file WHERE kind = ?1 AND name = ?2", kind, canon);
    if( st && sqlite3_step(st) == SQLITE_ROW )
    {
        known = true;
        size = sqlite3_column_int64(st, 0);
        mtime = sqlite3_column_int64(st, 1);
        snprintf(have, sizeof have, "%s", sqlite3_column_text(st, 2) ? (const char*)sqlite3_column_text(st, 2) : "");
    }
    sqlite3_finalize(st);

    bool present = false;
    if( known && (!version || strcmp(have, version) == 0) )
        return ARTCACHE_PRESENT; /* trusted without a stat: a host that cannot read it calls Forget */
    int64_t now_size, now_mtime;
    if( file_stat(path, &now_size, &now_mtime) )
    {
        present = true;
        /* unknown, or of another version: perhaps another machine has made it again since */
        if( !known || now_size != size || now_mtime != mtime )
            take_in(c, kind, canon, path, now_size, now_mtime, now, have, sizeof have);
    }
    else if( known )
        forget(c, kind, canon);
    if( present )
        return !version || strcmp(have, version) == 0 ? ARTCACHE_PRESENT : ARTCACHE_STALE;

    st = prep_kn(c, "SELECT 1 FROM claim WHERE kind = ?1 AND name = ?2 AND owner <> ?3 AND until > ?4", kind, canon);
    bool claimed = false;
    if( st )
    {
        sqlite3_bind_text(st, 3, c->owner, -1, SQLITE_STATIC);
        sqlite3_bind_int64(st, 4, now);
        claimed = sqlite3_step(st) == SQLITE_ROW;
    }
    sqlite3_finalize(st);
    if( claimed )
        return ARTCACHE_CLAIMED;
    if( retry_s > 0 )
    {
        st = prep_kn(c,
                     "SELECT 1 FROM failure WHERE kind = ?1 AND name = ?2 AND at > ?3 AND (?4 IS NULL OR version = ?4)",
                     kind, canon);
        bool failed = false;
        if( st )
        {
            sqlite3_bind_int64(st, 3, now - retry_s);
            if( version )
                sqlite3_bind_text(st, 4, version, -1, SQLITE_TRANSIENT);
            else
                sqlite3_bind_null(st, 4);
            failed = sqlite3_step(st) == SQLITE_ROW;
        }
        sqlite3_finalize(st);
        if( failed )
            return ARTCACHE_FAILED;
    }
    return ARTCACHE_ABSENT;
}

bool
ArtCache_FileVersion(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    char* out,
    size_t cap)
{
    char canon[ARTCACHE_NAME_CAP];
    out[0] = 0;
    if( !c || !ArtCache_Name(kind, name, canon) )
        return false;
    sqlite3_stmt* st = prep_kn(c, "SELECT version FROM file WHERE kind = ?1 AND name = ?2", kind, canon);
    bool found = st && sqlite3_step(st) == SQLITE_ROW;
    if( found && sqlite3_column_text(st, 0) )
        snprintf(out, cap, "%s", (const char*)sqlite3_column_text(st, 0));
    sqlite3_finalize(st);
    return found;
}

void
ArtCache_Forget(
    struct ArtCache* c,
    const char* kind,
    const char* name)
{
    char canon[ARTCACHE_NAME_CAP];
    if( c && ArtCache_Name(kind, name, canon) )
        forget(c, kind, canon);
}

/* -- making a file -------------------------------------------------------------------------------- */

bool
ArtCache_Claim(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* version,
    int64_t lease_s,
    int64_t now)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !ArtCache_Name(kind, name, canon) )
        return false;
    /* One statement, so atomic: taken when free, this handle's, or its lease has run out; and not
     * when the file is there already (made by another process since this one looked). The SELECT
     * needs its WHERE for SQLite to read the ON CONFLICT as the upsert's. */
    sqlite3_stmt* st = prep_kn(c,
                               "INSERT INTO claim (kind, name, owner, until) SELECT ?1, ?2, ?3, ?4"
                               " WHERE NOT EXISTS (SELECT 1 FROM file WHERE kind = ?1 AND name = ?2"
                               "                   AND (?6 IS NULL OR version = ?6))"
                               " ON CONFLICT(kind, name) DO UPDATE SET owner = excluded.owner, until = excluded.until"
                               " WHERE claim.owner = excluded.owner OR claim.until <= ?5",
                               kind, canon);
    if( !st )
        return false;
    sqlite3_bind_text(st, 3, c->owner, -1, SQLITE_STATIC);
    sqlite3_bind_int64(st, 4, now + lease_s);
    sqlite3_bind_int64(st, 5, now);
    if( version )
        sqlite3_bind_text(st, 6, version, -1, SQLITE_TRANSIENT);
    else
        sqlite3_bind_null(st, 6);
    return run(c, st) && sqlite3_changes(c->db) == 1;
}

void
ArtCache_Release(
    struct ArtCache* c,
    const char* kind,
    const char* name)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !ArtCache_Name(kind, name, canon) )
        return;
    sqlite3_stmt* st = prep_kn(c, "DELETE FROM claim WHERE kind = ?1 AND name = ?2 AND owner = ?3", kind, canon);
    if( st )
        sqlite3_bind_text(st, 3, c->owner, -1, SQLITE_STATIC);
    run(c, st);
}

bool
ArtCache_TempPath(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    char* out,
    size_t cap)
{
    char path[PATH_CAP], dir[PATH_CAP];
    if( !ArtCache_Path(c, kind, name, path, sizeof path) )
        return false;
    int n = snprintf(out, cap, "%s.%s.part", path, c->token);
    if( n <= 0 || (size_t)n >= cap || snprintf(dir, sizeof dir, "%s/%s", c->root, kind) >= (int)sizeof dir )
        return false;
    return mkdirs(dir);
}

bool
ArtCache_Commit(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* temp,
    const char* version,
    int64_t now)
{
    char canon[ARTCACHE_NAME_CAP], path[PATH_CAP];
    if( !c || !temp || !ArtCache_Name(kind, name, canon) || !ArtCache_Path(c, kind, canon, path, sizeof path) )
        return false;
    int64_t size, mtime;
    if( !file_stat(temp, &size, &mtime) || !rename_over(temp, path) )
    {
        remove_file(temp);
        return false;
    }
    if( !file_stat(path, &size, &mtime) )
        return false;
    exec(c->db, "BEGIN IMMEDIATE");
    record(c, kind, canon, size, mtime, version, now);
    run(c, prep_kn(c, "DELETE FROM failure WHERE kind = ?1 AND name = ?2", kind, canon));
    run(c, prep_kn(c, "DELETE FROM job WHERE kind = ?1 AND name = ?2", kind, canon));
    run(c, prep_kn(c, "DELETE FROM claim WHERE kind = ?1 AND name = ?2", kind, canon));
    exec(c->db, "COMMIT");
    return true;
}

void
ArtCache_Fail(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* temp,
    const char* version,
    const char* error,
    int64_t now)
{
    char canon[ARTCACHE_NAME_CAP];
    if( temp )
        remove_file(temp);
    if( !c || !ArtCache_Name(kind, name, canon) )
        return;
    exec(c->db, "BEGIN IMMEDIATE");
    /* a failure of another version starts the count again */
    sqlite3_stmt* st = prep_kn(c,
                               "INSERT INTO failure (kind, name, version, attempts, at, error) VALUES (?1, ?2, ?3, 1, ?4, ?5)"
                               " ON CONFLICT(kind, name) DO UPDATE SET"
                               "  attempts = CASE WHEN failure.version = excluded.version THEN failure.attempts + 1 ELSE 1 END,"
                               "  version = excluded.version, at = excluded.at, error = excluded.error",
                               kind, canon);
    if( st )
    {
        sqlite3_bind_text(st, 3, version ? version : "", -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(st, 4, now);
        if( error )
            sqlite3_bind_text(st, 5, error, -1, SQLITE_TRANSIENT);
        else
            sqlite3_bind_null(st, 5);
    }
    run(c, st);
    st = prep_kn(c, "DELETE FROM claim WHERE kind = ?1 AND name = ?2 AND owner = ?3", kind, canon);
    if( st )
        sqlite3_bind_text(st, 3, c->owner, -1, SQLITE_STATIC);
    run(c, st);
    exec(c->db, "COMMIT");
}

int
ArtCache_Attempts(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* version)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !ArtCache_Name(kind, name, canon) )
        return 0;
    sqlite3_stmt* st = prep_kn(c, "SELECT attempts FROM failure WHERE kind = ?1 AND name = ?2 AND version = ?3", kind, canon);
    int n = 0;
    if( st )
    {
        sqlite3_bind_text(st, 3, version ? version : "", -1, SQLITE_TRANSIENT);
        if( sqlite3_step(st) == SQLITE_ROW )
            n = sqlite3_column_int(st, 0);
    }
    sqlite3_finalize(st);
    return n;
}

/* -- facts about a file --------------------------------------------------------------------------- */

char*
ArtCache_InfoGet(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* key)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !key || !ArtCache_Name(kind, name, canon) )
        return NULL;
    sqlite3_stmt* st = prep_kn(c, "SELECT value FROM info WHERE kind = ?1 AND name = ?2 AND key = ?3", kind, canon);
    char* out = NULL;
    if( st )
    {
        sqlite3_bind_text(st, 3, key, -1, SQLITE_TRANSIENT);
        if( sqlite3_step(st) == SQLITE_ROW && sqlite3_column_text(st, 0) )
        {
            size_t n = (size_t)sqlite3_column_bytes(st, 0);
            out = malloc(n + 1);
            if( out )
            {
                memcpy(out, sqlite3_column_text(st, 0), n);
                out[n] = 0;
            }
        }
    }
    sqlite3_finalize(st);
    return out;
}

bool
ArtCache_InfoSet(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    const char* key,
    const char* value)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !key || !value || !ArtCache_Name(kind, name, canon) )
        return false;
    sqlite3_stmt* st = prep_kn(c, "INSERT OR REPLACE INTO info (kind, name, key, value) VALUES (?1, ?2, ?3, ?4)", kind, canon);
    if( !st )
        return false;
    sqlite3_bind_text(st, 3, key, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(st, 4, value, -1, SQLITE_TRANSIENT);
    return run(c, st);
}

/* -- the queue ------------------------------------------------------------------------------------ */

void
ArtCache_JobAdd(
    struct ArtCache* c,
    const char* kind,
    const char* name,
    int rank,
    int64_t now)
{
    char canon[ARTCACHE_NAME_CAP];
    if( !c || !ArtCache_Name(kind, name, canon) )
        return;
    sqlite3_stmt* st = prep_kn(c,
                               "INSERT INTO job (kind, name, rank, seq, queued_at) VALUES (?1, ?2,"
                               "  CASE WHEN ?3 < 0 THEN max(?5, (SELECT coalesce(max(rank), 0) + 1 FROM job WHERE kind = ?1))"
                               "       ELSE ?3 END,"
                               "  (SELECT coalesce(max(seq), 0) + 1 FROM job), ?4)"
                               " ON CONFLICT(kind, name) DO UPDATE SET rank = max(job.rank, excluded.rank)",
                               kind, canon);
    if( !st )
        return;
    sqlite3_bind_int(st, 3, rank);
    sqlite3_bind_int64(st, 4, now);
    sqlite3_bind_int(st, 5, FRONT_RANK_MIN);
    run(c, st);
}

void
ArtCache_JobRemove(
    struct ArtCache* c,
    const char* kind,
    const char* name)
{
    char canon[ARTCACHE_NAME_CAP];
    if( c && ArtCache_Name(kind, name, canon) )
        run(c, prep_kn(c, "DELETE FROM job WHERE kind = ?1 AND name = ?2", kind, canon));
}

bool
ArtCache_JobNext(
    struct ArtCache* c,
    const char* kind,
    const char* version,
    int max_attempts,
    int64_t lease_s,
    int64_t now,
    char* out)
{
    out[0] = 0;
    if( !c || !ArtCache_KindOk(kind) || !exec(c->db, "BEGIN IMMEDIATE") )
        return false;
    sqlite3_stmt* st = prep(c, "SELECT j.name FROM job j WHERE j.kind = ?1"
                               " AND NOT EXISTS (SELECT 1 FROM claim l WHERE l.kind = j.kind AND l.name = j.name"
                               "                 AND l.owner <> ?3 AND l.until > ?4)"
                               " AND NOT EXISTS (SELECT 1 FROM failure f WHERE f.kind = j.kind AND f.name = j.name"
                               "                 AND f.version = ?2 AND f.attempts >= ?5)"
                               " ORDER BY j.rank DESC, j.seq LIMIT 1");
    if( st )
    {
        sqlite3_bind_text(st, 1, kind, -1, SQLITE_STATIC);
        sqlite3_bind_text(st, 2, version ? version : "", -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(st, 3, c->owner, -1, SQLITE_STATIC);
        sqlite3_bind_int64(st, 4, now);
        sqlite3_bind_int(st, 5, max_attempts);
        if( sqlite3_step(st) == SQLITE_ROW && sqlite3_column_text(st, 0) )
            snprintf(out, ARTCACHE_NAME_CAP, "%s", (const char*)sqlite3_column_text(st, 0));
    }
    sqlite3_finalize(st);
    if( out[0] )
    {
        st = prep_kn(c, "INSERT OR REPLACE INTO claim (kind, name, owner, until) VALUES (?1, ?2, ?3, ?4)", kind, out);
        if( st )
        {
            sqlite3_bind_text(st, 3, c->owner, -1, SQLITE_STATIC);
            sqlite3_bind_int64(st, 4, now + lease_s);
        }
        if( !run(c, st) )
            out[0] = 0;
    }
    exec(c->db, out[0] ? "COMMIT" : "ROLLBACK");
    return out[0] != 0;
}

void
ArtCache_JobCount(
    struct ArtCache* c,
    const char* kind,
    const char* version,
    int max_attempts,
    int* queued,
    int* failed)
{
    int q = 0, f = 0;
    sqlite3_stmt* st = c ? prep(c, "SELECT count(*), coalesce(sum(f.attempts >= ?3), 0) FROM job j"
                                   " LEFT JOIN failure f ON f.kind = j.kind AND f.name = j.name AND f.version = ?2"
                                   " WHERE j.kind = ?1")
                         : NULL;
    if( st )
    {
        sqlite3_bind_text(st, 1, kind, -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(st, 2, version ? version : "", -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(st, 3, max_attempts);
        if( sqlite3_step(st) == SQLITE_ROW )
        {
            f = sqlite3_column_int(st, 1);
            q = sqlite3_column_int(st, 0) - f;
        }
    }
    sqlite3_finalize(st);
    if( queued )
        *queued = q;
    if( failed )
        *failed = f;
}
