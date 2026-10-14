/*
 * The shared card-art cache (3rd/artcache, FORMAT.md) for Node: a handle on the folder of art and
 * this machine's index of it. Every call is synchronous and quick (an index lookup, at most a stat
 * of the folder); the host reads and writes the image files itself.
 *
 *   const cache = artcache.open(root, indexPath | null);  // throws Error with the reason
 *   cache.lookup('art_crop', id, null, 3600, now)         // 'absent' | 'present' | 'stale' | 'claimed' | 'failed'
 *
 * Times are whole seconds the caller passes (`now`), as in the C API.
 */
#include "../../../3rd/artcache/artcache.h"
#include <node_api.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// clang-format off
#define NAPI_OK(call) do { if ((call) != napi_ok) return NULL; } while (0)
// clang-format on

#define MAX_ARGS 7
#define MAX_TEXT (16 * 1024 * 1024) /* an info value or an error message; names and paths are far shorter */

static napi_value
fail(napi_env env, const char* message)
{
    napi_throw_error(env, NULL, message);
    return NULL;
}

/* -- arguments ------------------------------------------------------------------------------------ */

/* A UTF-8 copy of a JS string (NULL for null/undefined where that is allowed); short ones skip the heap. */
typedef struct
{
    char* data;
    char inline_buffer[256];
} text;

static void
text_free(text* t)
{
    if( t->data && t->data != t->inline_buffer )
        free(t->data);
    t->data = NULL;
}

static int
text_read(napi_env env, napi_value value, int nullable, size_t max, const char* what, text* out)
{
    out->data = NULL;
    napi_valuetype type = napi_undefined;
    if( value && napi_typeof(env, value, &type) != napi_ok )
        return 0;
    if( nullable && (type == napi_null || type == napi_undefined) )
        return 1;
    char message[96];
    snprintf(message, sizeof message, "%s must be a string%s", what, nullable ? " or null" : "");
    if( type != napi_string )
    {
        fail(env, message);
        return 0;
    }
    size_t length;
    if( napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok )
        return 0;
    if( length > max )
    {
        snprintf(message, sizeof message, "%s is too long", what);
        fail(env, message);
        return 0;
    }
    out->data = length < sizeof(out->inline_buffer) ? out->inline_buffer : malloc(length + 1);
    if( !out->data )
    {
        fail(env, "out of memory");
        return 0;
    }
    size_t copied;
    if( napi_get_value_string_utf8(env, value, out->data, length + 1, &copied) != napi_ok )
    {
        text_free(out);
        return 0;
    }
    if( strlen(out->data) != copied )
    {
        text_free(out);
        snprintf(message, sizeof message, "%s must not contain NUL characters", what);
        fail(env, message);
        return 0;
    }
    return 1;
}

/* Whole seconds from a JS number. */
static int
seconds_read(napi_env env, napi_value value, const char* what, int64_t* out)
{
    napi_valuetype type = napi_undefined;
    if( !value || napi_typeof(env, value, &type) != napi_ok || type != napi_number ||
        napi_get_value_int64(env, value, out) != napi_ok )
    {
        char message[96];
        snprintf(message, sizeof message, "%s must be a number of seconds", what);
        fail(env, message);
        return 0;
    }
    return 1;
}

/* -- results -------------------------------------------------------------------------------------- */

static napi_value
string_or_null(napi_env env, const char* s)
{
    napi_value result;
    if( s )
        NAPI_OK(napi_create_string_utf8(env, s, NAPI_AUTO_LENGTH, &result));
    else
        NAPI_OK(napi_get_null(env, &result));
    return result;
}

static napi_value
boolean(napi_env env, bool value)
{
    napi_value result;
    NAPI_OK(napi_get_boolean(env, value, &result));
    return result;
}

static napi_value
undefined(napi_env env)
{
    napi_value result;
    NAPI_OK(napi_get_undefined(env, &result));
    return result;
}

/* -- the handle ----------------------------------------------------------------------------------- */

/* What `this` wraps: the handle, NULL once closed. */
typedef struct
{
    struct ArtCache* cache;
} handle;

static void
finalize(napi_env env, void* data, void* hint)
{
    handle* h = data;
    ArtCache_Close(h->cache);
    free(h);
}

/*
 * A method call: the open handle behind `this` and its arguments (Node-API passes undefined for
 * those left out). Every string argument read into `texts` is freed by call_end.
 */
typedef struct
{
    handle* h;
    size_t argc;
    napi_value argv[MAX_ARGS];
    text texts[MAX_ARGS];
    int ntexts;
} call;

static int
call_begin(napi_env env, napi_callback_info info, call* c)
{
    napi_value self;
    c->argc = MAX_ARGS;
    c->ntexts = 0;
    if( napi_get_cb_info(env, info, &c->argc, c->argv, &self, NULL) != napi_ok ||
        napi_unwrap(env, self, (void**)&c->h) != napi_ok )
    {
        fail(env, "ArtCache method called on an invalid receiver");
        return 0;
    }
    if( !c->h->cache )
    {
        fail(env, "the art cache is closed");
        return 0;
    }
    return 1;
}

/* Argument i as a string (NULL for null/undefined when nullable). */
static int
call_text(napi_env env, call* c, size_t i, int nullable, size_t max, const char* what, const char** out)
{
    text* t = &c->texts[c->ntexts];
    if( !text_read(env, c->argv[i], nullable, max, what, t) )
        return 0;
    c->ntexts++;
    *out = t->data;
    return 1;
}

static void
call_end(call* c)
{
    for( int i = 0; i < c->ntexts; i++ )
        text_free(&c->texts[i]);
}

/* kind and name, the first two arguments of most methods. */
static int
call_kind_name(napi_env env, call* c, const char** kind, const char** name)
{
    return call_text(env, c, 0, 0, ARTCACHE_NAME_CAP, "kind", kind) &&
           call_text(env, c, 1, 0, ARTCACHE_NAME_CAP, "name", name);
}

/* new ArtCache(root, indexPath | null): see open(). */
static napi_value
construct(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value argv[2] = { NULL, NULL }, self;
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, &self, NULL));
    text root, index;
    if( !text_read(env, argv[0], 0, ARTCACHE_PATH_CAP, "root", &root) )
        return NULL;
    if( !text_read(env, argv[1], 1, ARTCACHE_PATH_CAP, "indexPath", &index) )
    {
        text_free(&root);
        return NULL;
    }
    char err[ARTCACHE_PATH_CAP + 256];
    struct ArtCache* cache = ArtCache_Open(root.data, index.data, err, sizeof err);
    text_free(&root);
    text_free(&index);
    if( !cache )
        return fail(env, err[0] ? err : "cannot open the art cache");
    handle* h = malloc(sizeof *h);
    if( !h )
    {
        ArtCache_Close(cache);
        return fail(env, "out of memory");
    }
    h->cache = cache;
    if( napi_wrap(env, self, h, finalize, NULL, NULL) != napi_ok )
    {
        ArtCache_Close(cache);
        free(h);
        return fail(env, "could not create ArtCache");
    }
    return self;
}

/* close(): gives up this handle's claims; later calls throw. Closing twice is harmless. */
static napi_value
close_handle(napi_env env, napi_callback_info info)
{
    napi_value self;
    handle* h;
    NAPI_OK(napi_get_cb_info(env, info, NULL, NULL, &self, NULL));
    NAPI_OK(napi_unwrap(env, self, (void**)&h));
    ArtCache_Close(h->cache);
    h->cache = NULL;
    return undefined(env);
}

/* root(): the folder, '/' separated */
static napi_value
root(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    return string_or_null(env, ArtCache_Root(c.h->cache));
}

/* indexPath(): this machine's index of the folder */
static napi_value
index_path(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    return string_or_null(env, ArtCache_IndexPath(c.h->cache));
}

/* path(kind, name): <root>/<kind>/<name>.<ext>, null for a bad kind or name */
static napi_value
path(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) )
    {
        char out[ARTCACHE_PATH_CAP];
        result = string_or_null(env, ArtCache_Path(c.h->cache, kind, name, out, sizeof out) ? out : NULL);
    }
    call_end(&c);
    return result;
}

/* lookup(kind, name, version | null, retrySeconds, nowSeconds): the file's state */
static napi_value
lookup(napi_env env, napi_callback_info info)
{
    static const char* const STATES[] = { "absent", "present", "stale", "claimed", "failed" };
    call c;
    const char *kind, *name, *version;
    int64_t retry, now;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 1, ARTCACHE_VERSION_CAP, "version", &version) &&
        seconds_read(env, c.argv[3], "retrySeconds", &retry) && seconds_read(env, c.argv[4], "nowSeconds", &now) )
    {
        enum ArtCacheState state = ArtCache_Lookup(c.h->cache, kind, name, version, retry, now);
        result = string_or_null(env, (unsigned)state < sizeof STATES / sizeof STATES[0] ? STATES[state] : "absent");
    }
    call_end(&c);
    return result;
}

/* fileVersion(kind, name): the version of the file the index knows ('' none), null when it knows none */
static napi_value
file_version(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) )
    {
        char out[ARTCACHE_VERSION_CAP];
        result = string_or_null(env, ArtCache_FileVersion(c.h->cache, kind, name, out, sizeof out) ? out : NULL);
    }
    call_end(&c);
    return result;
}

/* forget(kind, name): the file was gone or unreadable */
static napi_value
forget(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) )
    {
        ArtCache_Forget(c.h->cache, kind, name);
        result = undefined(env);
    }
    call_end(&c);
    return result;
}

/* claim(kind, name, version | null, leaseSeconds, nowSeconds): whether this handle may make it */
static napi_value
claim(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name, *version;
    int64_t lease, now;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 1, ARTCACHE_VERSION_CAP, "version", &version) &&
        seconds_read(env, c.argv[3], "leaseSeconds", &lease) && seconds_read(env, c.argv[4], "nowSeconds", &now) )
        result = boolean(env, ArtCache_Claim(c.h->cache, kind, name, version, lease, now));
    call_end(&c);
    return result;
}

/* release(kind, name): gives up a claim without an outcome */
static napi_value
release(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) )
    {
        ArtCache_Release(c.h->cache, kind, name);
        result = undefined(env);
    }
    call_end(&c);
    return result;
}

/* tempPath(kind, name): where to write the file before commit (its folder made), null when bad */
static napi_value
temp_path(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) )
    {
        char out[ARTCACHE_PATH_CAP];
        result = string_or_null(env, ArtCache_TempPath(c.h->cache, kind, name, out, sizeof out) ? out : NULL);
    }
    call_end(&c);
    return result;
}

/* commit(kind, name, tempPath, version | null, nowSeconds): whether the file is in place */
static napi_value
commit(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name, *temp, *version;
    int64_t now;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 0, ARTCACHE_PATH_CAP, "tempPath", &temp) &&
        call_text(env, &c, 3, 1, ARTCACHE_VERSION_CAP, "version", &version) &&
        seconds_read(env, c.argv[4], "nowSeconds", &now) )
        result = boolean(env, ArtCache_Commit(c.h->cache, kind, name, temp, version, now));
    call_end(&c);
    return result;
}

/* fail(kind, name, tempPath | null, version | null, error | null, nowSeconds) */
static napi_value
fail_file(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name, *temp, *version, *error;
    int64_t now;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 1, ARTCACHE_PATH_CAP, "tempPath", &temp) &&
        call_text(env, &c, 3, 1, ARTCACHE_VERSION_CAP, "version", &version) &&
        call_text(env, &c, 4, 1, MAX_TEXT, "error", &error) && seconds_read(env, c.argv[5], "nowSeconds", &now) )
    {
        ArtCache_Fail(c.h->cache, kind, name, temp, version, error, now);
        result = undefined(env);
    }
    call_end(&c);
    return result;
}

/* attempts(kind, name, version | null): failed attempts recorded for the version */
static napi_value
attempts(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name, *version;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 1, ARTCACHE_VERSION_CAP, "version", &version) )
    {
        napi_value n;
        if( napi_create_int32(env, ArtCache_Attempts(c.h->cache, kind, name, version), &n) == napi_ok )
            result = n;
    }
    call_end(&c);
    return result;
}

/* infoGet(kind, name, key): the value a host keeps for the file, or null */
static napi_value
info_get(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name, *key;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 0, MAX_TEXT, "key", &key) )
    {
        char* value = ArtCache_InfoGet(c.h->cache, kind, name, key);
        result = string_or_null(env, value);
        free(value);
    }
    call_end(&c);
    return result;
}

/* infoSet(kind, name, key, value): false when the index cannot write */
static napi_value
info_set(napi_env env, napi_callback_info info)
{
    call c;
    const char *kind, *name, *key, *value;
    napi_value result = NULL;
    if( call_begin(env, info, &c) && call_kind_name(env, &c, &kind, &name) &&
        call_text(env, &c, 2, 0, MAX_TEXT, "key", &key) && call_text(env, &c, 3, 0, MAX_TEXT, "value", &value) )
        result = boolean(env, ArtCache_InfoSet(c.h->cache, kind, name, key, value));
    call_end(&c);
    return result;
}

/* -- the module ----------------------------------------------------------------------------------- */

/* open(root, indexPath | null): new ArtCache(root, indexPath) */
static napi_value
open_cache(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value argv[2], constructor, instance;
    napi_ref* ref;
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
    NAPI_OK(napi_get_instance_data(env, (void**)&ref));
    NAPI_OK(napi_get_reference_value(env, *ref, &constructor));
    if( napi_new_instance(env, constructor, 2, argv, &instance) != napi_ok )
        return NULL; /* the constructor threw */
    return instance;
}

/* defaultRoot(): the folder when the host names none ($TORIMTG_ART_CACHE, ...), or null */
static napi_value
default_root(napi_env env, napi_callback_info info)
{
    char out[ARTCACHE_PATH_CAP];
    return string_or_null(env, ArtCache_DefaultRoot(out, sizeof out) ? out : NULL);
}

/* defaultIndex(root): this machine's index of root when the host names none, or null */
static napi_value
default_index(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value argv[1] = { NULL };
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
    text root;
    if( !text_read(env, argv[0], 0, ARTCACHE_PATH_CAP, "root", &root) )
        return NULL;
    char out[ARTCACHE_PATH_CAP];
    napi_value result = string_or_null(env, ArtCache_DefaultIndex(root.data, out, sizeof out) ? out : NULL);
    text_free(&root);
    return result;
}

/* nameOk(kind, name): whether name is one of kind's */
static napi_value
name_ok(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value argv[2] = { NULL, NULL };
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
    text kind, name;
    if( !text_read(env, argv[0], 0, ARTCACHE_NAME_CAP, "kind", &kind) )
        return NULL;
    /* a longer name is simply not one */
    napi_valuetype type = napi_undefined;
    size_t length = 0;
    bool ok = false;
    if( argv[1] && napi_typeof(env, argv[1], &type) == napi_ok && type == napi_string &&
        napi_get_value_string_utf8(env, argv[1], NULL, 0, &length) == napi_ok && length < ARTCACHE_NAME_CAP )
    {
        if( !text_read(env, argv[1], 0, ARTCACHE_NAME_CAP, "name", &name) )
        {
            text_free(&kind);
            return NULL;
        }
        ok = ArtCache_NameOk(kind.data, name.data);
        text_free(&name);
    }
    text_free(&kind);
    return boolean(env, ok);
}

static void
free_constructor(napi_env env, void* data, void* hint)
{
    napi_ref* ref = data;
    napi_delete_reference(env, *ref);
    free(ref);
}

static napi_value
init(napi_env env, napi_value exports)
{
    napi_property_descriptor methods[] = {
        { "close",       NULL, close_handle, NULL, NULL, NULL, napi_default, NULL },
        { "root",        NULL, root,         NULL, NULL, NULL, napi_default, NULL },
        { "indexPath",   NULL, index_path,   NULL, NULL, NULL, napi_default, NULL },
        { "path",        NULL, path,         NULL, NULL, NULL, napi_default, NULL },
        { "lookup",      NULL, lookup,       NULL, NULL, NULL, napi_default, NULL },
        { "fileVersion", NULL, file_version, NULL, NULL, NULL, napi_default, NULL },
        { "forget",      NULL, forget,       NULL, NULL, NULL, napi_default, NULL },
        { "claim",       NULL, claim,        NULL, NULL, NULL, napi_default, NULL },
        { "release",     NULL, release,      NULL, NULL, NULL, napi_default, NULL },
        { "tempPath",    NULL, temp_path,    NULL, NULL, NULL, napi_default, NULL },
        { "commit",      NULL, commit,       NULL, NULL, NULL, napi_default, NULL },
        { "fail",        NULL, fail_file,    NULL, NULL, NULL, napi_default, NULL },
        { "attempts",    NULL, attempts,     NULL, NULL, NULL, napi_default, NULL },
        { "infoGet",     NULL, info_get,     NULL, NULL, NULL, napi_default, NULL },
        { "infoSet",     NULL, info_set,     NULL, NULL, NULL, napi_default, NULL }
    };
    napi_value constructor;
    NAPI_OK(napi_define_class(env, "ArtCache", NAPI_AUTO_LENGTH, construct, NULL,
                              sizeof(methods) / sizeof(methods[0]), methods, &constructor));
    napi_ref* ref = malloc(sizeof *ref);
    if( !ref )
        return fail(env, "out of memory");
    if( napi_create_reference(env, constructor, 1, ref) != napi_ok )
    {
        free(ref);
        return NULL;
    }
    if( napi_set_instance_data(env, ref, free_constructor, NULL) != napi_ok )
    {
        napi_delete_reference(env, *ref);
        free(ref);
        return NULL;
    }

    napi_property_descriptor functions[] = {
        { "open",         NULL, open_cache,    NULL, NULL, NULL, napi_enumerable, NULL },
        { "defaultRoot",  NULL, default_root,  NULL, NULL, NULL, napi_enumerable, NULL },
        { "defaultIndex", NULL, default_index, NULL, NULL, NULL, napi_enumerable, NULL },
        { "nameOk",       NULL, name_ok,       NULL, NULL, NULL, napi_enumerable, NULL }
    };
    NAPI_OK(napi_define_properties(env, exports, sizeof(functions) / sizeof(functions[0]), functions));
    NAPI_OK(napi_set_named_property(env, exports, "ArtCache", constructor));
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
