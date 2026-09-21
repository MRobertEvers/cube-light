#include "name_index.h"
#include <node_api.h>

#include <stdlib.h>
#include <string.h>

// clang-format off
#define NAPI_OK(call) do { if ((call) != napi_ok) return NULL; } while (0)
// clang-format on

static napi_value
fail(napi_env env, const char* message)
{
    napi_throw_error(env, NULL, message);
    return NULL;
}

static char*
get_string(napi_env env, napi_value value, size_t* length_out)
{
    size_t length;
    if( napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok )
        return NULL;
    char* string = malloc(length + 1);
    if( !string )
        return NULL;
    if( napi_get_value_string_utf8(env, value, string, length + 1, &length) != napi_ok )
    {
        free(string);
        return NULL;
    }
    if( length_out )
        *length_out = length;
    return string;
}

static napi_value
build(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value argv[1];
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
    bool is_array = false;
    if( argc != 1 || napi_is_array(env, argv[0], &is_array) != napi_ok || !is_array )
        return fail(env, "build expects an array of names");
    uint32_t count;
    NAPI_OK(napi_get_array_length(env, argv[0], &count));
    char** names = calloc(count ? count : 1, sizeof(char*));
    if( !names )
        return fail(env, "out of memory");
    uint32_t i;
    for( i = 0; i < count; i++ )
    {
        napi_value item;
        napi_valuetype type;
        if( napi_get_element(env, argv[0], i, &item) != napi_ok ||
            napi_typeof(env, item, &type) != napi_ok || type != napi_string ||
            !(names[i] = get_string(env, item, NULL)) )
            break;
    }
    size_t size = 0;
    uint8_t* blob = i == count ? nm_build((const char* const*)names, count, &size) : NULL;
    for( uint32_t j = 0; j < count; j++ )
        free(names[j]);
    free(names);
    if( !blob )
        return fail(env, "could not build name index");
    napi_value result;
    napi_status status = napi_create_buffer_copy(env, size, blob, NULL, &result);
    free(blob);
    if( status != napi_ok )
        return NULL;
    return result;
}

static int
get_blob(napi_env env, napi_value value, uint8_t** blob, size_t* size)
{
    bool is_buffer;
    return napi_is_buffer(env, value, &is_buffer) == napi_ok && is_buffer &&
           napi_get_buffer_info(env, value, (void**)blob, size) == napi_ok &&
           nm_validate(*blob, *size);
}

static napi_value
has_prefix(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value argv[2];
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
    uint8_t* blob;
    size_t size, length;
    if( argc != 2 || !get_blob(env, argv[0], &blob, &size) )
        return fail(env, "hasPrefix expects a valid index Buffer");
    char* prefix = get_string(env, argv[1], &length);
    if( !prefix )
        return fail(env, "hasPrefix expects a string prefix");
    int present = nm_has_prefix(blob, prefix, length);
    free(prefix);
    napi_value result;
    NAPI_OK(napi_get_boolean(env, present, &result));
    return result;
}

static napi_value
find_prefix(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value argv[3];
    NAPI_OK(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
    uint8_t* blob;
    size_t size, length;
    if( argc != 3 || !get_blob(env, argv[0], &blob, &size) )
        return fail(env, "findPrefix expects a valid index Buffer");
    char* prefix = get_string(env, argv[1], &length);
    if( !prefix )
        return fail(env, "findPrefix expects a string prefix");
    uint32_t capacity;
    if( napi_get_value_uint32(env, argv[2], &capacity) != napi_ok )
    {
        free(prefix);
        return fail(env, "findPrefix expects an unsigned limit");
    }
    if( capacity > nm_count(blob) )
        capacity = nm_count(blob);
    uint32_t* indices = malloc((capacity ? capacity : 1) * sizeof(uint32_t));
    if( !indices )
    {
        free(prefix);
        return fail(env, "out of memory");
    }
    uint32_t found = nm_find_prefix(blob, prefix, length, indices, capacity);
    free(prefix);
    napi_value result;
    napi_status status = napi_create_array_with_length(env, found, &result);
    for( uint32_t i = 0; status == napi_ok && i < found; i++ )
    {
        napi_value name;
        status = napi_create_string_utf8(env, nm_name(blob, indices[i]), NAPI_AUTO_LENGTH, &name);
        if( status == napi_ok )
            status = napi_set_element(env, result, i, name);
    }
    free(indices);
    return status == napi_ok ? result : NULL;
}

static napi_value
init(napi_env env, napi_value exports)
{
    napi_property_descriptor properties[] = {
        { "build",      NULL, build,       NULL, NULL, NULL, napi_default, NULL },
        { "hasPrefix",  NULL, has_prefix,  NULL, NULL, NULL, napi_default, NULL },
        { "findPrefix", NULL, find_prefix, NULL, NULL, NULL, napi_default, NULL }
    };
    NAPI_OK(napi_define_properties(env, exports, 3, properties));
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
