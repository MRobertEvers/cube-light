#include "kv_store.h"
#include <node_api.h>

#include <stdlib.h>
#include <string.h>

// clang-format off
#define NAPI_OK(call) do { if ((call) != napi_ok) return NULL; } while (0)
// clang-format on

#define MAX_ARGS 3

static napi_value
fail(napi_env env, const char* message)
{
    napi_throw_error(env, NULL, message);
    return NULL;
}

/* A UTF-8 copy of a JS string; short strings (every session key) skip the heap. */
typedef struct
{
    char* data;
    size_t length;
    char inline_buffer[128];
} string_arg;

static int
string_arg_read(napi_env env, napi_value value, string_arg* out)
{
    size_t length;
    if( napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok )
        return 0;
    out->data = length < sizeof(out->inline_buffer) ? out->inline_buffer : malloc(length + 1);
    if( !out->data )
        return 0;
    if( napi_get_value_string_utf8(env, value, out->data, length + 1, &out->length) != napi_ok )
    {
        if( out->data != out->inline_buffer )
            free(out->data);
        return 0;
    }
    return 1;
}

static void
string_arg_free(string_arg* arg)
{
    if( arg->data != arg->inline_buffer )
        free(arg->data);
}

/* The store behind `this`, its arguments, and the first as the key. */
typedef struct
{
    kv_t* kv;
    size_t argc;
    napi_value argv[MAX_ARGS];
    string_arg key;
} call;

static int
call_begin(napi_env env, napi_callback_info info, call* c)
{
    napi_value self;
    c->argc = MAX_ARGS;
    if( napi_get_cb_info(env, info, &c->argc, c->argv, &self, NULL) != napi_ok ||
        napi_unwrap(env, self, (void**)&c->kv) != napi_ok )
    {
        fail(env, "KVStore method called on an invalid receiver");
        return 0;
    }
    if( c->argc < 1 || !string_arg_read(env, c->argv[0], &c->key) )
    {
        fail(env, "key must be a string");
        return 0;
    }
    return 1;
}

/* Milliseconds from argument i; undefined means no expiry. */
static int
get_ttl(napi_env env, call* c, size_t i, int64_t* ttl)
{
    napi_valuetype type = napi_undefined;
    if( i < c->argc && napi_typeof(env, c->argv[i], &type) != napi_ok )
        return 0;
    if( type == napi_undefined )
    {
        *ttl = 0;
        return 1;
    }
    if( type != napi_number || napi_get_value_int64(env, c->argv[i], ttl) != napi_ok || *ttl < 0 )
    {
        fail(env, "ttl must be a non-negative number of milliseconds");
        return 0;
    }
    return 1;
}

static napi_value
number(napi_env env, double value)
{
    napi_value result;
    NAPI_OK(napi_create_double(env, value, &result));
    return result;
}

static napi_value
boolean(napi_env env, int value)
{
    napi_value result;
    NAPI_OK(napi_get_boolean(env, value, &result));
    return result;
}

static void
finalize(napi_env env, void* data, void* hint)
{
    kv_destroy(data);
}

/* new KVStore(seed: Buffer) — seed is 16 random bytes keying the hash. */
static napi_value
construct(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value argv[1], self;
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, &self, NULL));
    bool is_buffer = false;
    uint8_t* seed;
    size_t size;
    if( argc != 1 || napi_is_buffer(env, argv[0], &is_buffer) != napi_ok || !is_buffer ||
        napi_get_buffer_info(env, argv[0], (void**)&seed, &size) != napi_ok || size != 16 )
        return fail(env, "KVStore expects a 16-byte seed Buffer");
    uint64_t k0, k1;
    memcpy(&k0, seed, 8);
    memcpy(&k1, seed + 8, 8);
    kv_t* kv = kv_create(k0, k1);
    if( !kv )
        return fail(env, "out of memory");
    if( napi_wrap(env, self, kv, finalize, NULL, NULL) != napi_ok )
    {
        kv_destroy(kv);
        return fail(env, "could not create KVStore");
    }
    return self;
}

/* set(key, value, ttlMs?) */
static napi_value
set(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    string_arg value;
    int64_t ttl;
    napi_value result = NULL;
    if( c.argc < 2 || !string_arg_read(env, c.argv[1], &value) )
        fail(env, "value must be a string");
    else
    {
        if( get_ttl(env, &c, 2, &ttl) )
        {
            if( kv_set(c.kv, c.key.data, c.key.length, value.data, value.length, ttl) != 0 )
                fail(env, "out of memory");
            else
                napi_get_undefined(env, &result);
        }
        string_arg_free(&value);
    }
    string_arg_free(&c.key);
    return result;
}

/* get(key): string | null */
static napi_value
get(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    const char* value;
    size_t length;
    napi_value result = NULL;
    if( kv_get(c.kv, c.key.data, c.key.length, &value, &length) )
        napi_create_string_utf8(env, value, length, &result);
    else
        napi_get_null(env, &result);
    string_arg_free(&c.key);
    return result;
}

/* del(key): whether it existed */
static napi_value
del(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    int existed = kv_del(c.kv, c.key.data, c.key.length);
    string_arg_free(&c.key);
    return boolean(env, existed);
}

/* expire(key, ttlMs): whether it exists; a ttl of 0 removes expiry */
static napi_value
expire(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    int64_t ttl;
    napi_value result = NULL;
    if( get_ttl(env, &c, 1, &ttl) )
        result = boolean(env, kv_expire(c.kv, c.key.data, c.key.length, ttl));
    string_arg_free(&c.key);
    return result;
}

/* ttl(key): milliseconds left, -1 without expiry, -2 without the key */
static napi_value
ttl(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    int64_t remaining = kv_ttl(c.kv, c.key.data, c.key.length);
    string_arg_free(&c.key);
    return number(env, (double)remaining);
}

/* incr(key, ttlMs?): the new count; ttl applies only when the key is created */
static napi_value
incr(napi_env env, napi_callback_info info)
{
    call c;
    if( !call_begin(env, info, &c) )
        return NULL;
    int64_t ttl, value = 0;
    napi_value result = NULL;
    if( get_ttl(env, &c, 1, &ttl) )
    {
        int status = kv_incr(c.kv, c.key.data, c.key.length, ttl, &value);
        if( status == -2 )
            fail(env, "value is not an integer");
        else if( status != 0 )
            fail(env, "out of memory");
        else
            result = number(env, (double)value);
    }
    string_arg_free(&c.key);
    return result;
}

/* sweep(maxSlots): expired keys reclaimed */
static napi_value
sweep(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value argv[1], self;
    kv_t* kv;
    uint32_t max_slots;
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, &self, NULL));
    NAPI_OK(napi_unwrap(env, self, (void**)&kv));
    if( argc != 1 || napi_get_value_uint32(env, argv[0], &max_slots) != napi_ok )
        return fail(env, "sweep expects an unsigned slot count");
    return number(env, (double)kv_sweep(kv, max_slots));
}

static napi_value
size(napi_env env, napi_callback_info info)
{
    napi_value self;
    kv_t* kv;
    NAPI_OK(napi_get_cb_info(env, info, NULL, NULL, &self, NULL));
    NAPI_OK(napi_unwrap(env, self, (void**)&kv));
    return number(env, (double)kv_count(kv));
}

static napi_value
init(napi_env env, napi_value exports)
{
    napi_property_descriptor properties[] = {
        { "set",    NULL, set,    NULL, NULL, NULL, napi_default, NULL },
        { "get",    NULL, get,    NULL, NULL, NULL, napi_default, NULL },
        { "del",    NULL, del,    NULL, NULL, NULL, napi_default, NULL },
        { "expire", NULL, expire, NULL, NULL, NULL, napi_default, NULL },
        { "ttl",    NULL, ttl,    NULL, NULL, NULL, napi_default, NULL },
        { "incr",   NULL, incr,   NULL, NULL, NULL, napi_default, NULL },
        { "sweep",  NULL, sweep,  NULL, NULL, NULL, napi_default, NULL },
        { "size",   NULL, NULL,   size, NULL, NULL, napi_default, NULL }
    };
    napi_value constructor;
    NAPI_OK(napi_define_class(env, "KVStore", NAPI_AUTO_LENGTH, construct, NULL,
                              sizeof(properties) / sizeof(properties[0]), properties, &constructor));
    NAPI_OK(napi_set_named_property(env, exports, "KVStore", constructor));
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
