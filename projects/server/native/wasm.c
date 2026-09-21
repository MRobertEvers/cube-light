#include "name_index.h"

#include <stdint.h>
#include <stdlib.h>

static const uint8_t* loaded_blob = NULL;

int
nm_wasm_load(
    const uint8_t* blob,
    uint32_t size)
{
    if( !nm_validate(blob, size) )
        return 0;
    loaded_blob = blob;
    return 1;
}

int
nm_wasm_has_prefix(
    const char* prefix,
    uint32_t length)
{
    return loaded_blob && nm_has_prefix(loaded_blob, prefix, length);
}

uint32_t
nm_wasm_find_prefix(
    const char* prefix,
    uint32_t length,
    uint32_t* out,
    uint32_t capacity)
{
    return loaded_blob ? nm_find_prefix(loaded_blob, prefix, length, out, capacity) : 0;
}

const char*
nm_wasm_name_ptr(uint32_t index)
{
    return loaded_blob ? nm_name(loaded_blob, index) : NULL;
}
