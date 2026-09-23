#include "name_index.h"

#include <stdint.h>
#include <stdlib.h>

static const uint8_t* loaded_blob = NULL;
static uint32_t* word_starts = NULL;
static uint32_t word_starts_count = 0;

int
nm_wasm_load(
    const uint8_t* blob,
    uint32_t size)
{
    if( !nm_validate(blob, size) )
        return 0;
    uint32_t* starts = nm_build_word_starts(blob, &word_starts_count);
    if( !starts )
        return 0;
    free(word_starts);
    word_starts = starts;
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

uint32_t
nm_wasm_find_word_prefix(
    const char* prefix,
    uint32_t length,
    uint32_t* out,
    uint32_t capacity)
{
    return loaded_blob ? nm_find_word_prefix(loaded_blob, word_starts, word_starts_count,
                                             prefix, length, out, capacity)
                       : 0;
}

const char*
nm_wasm_name_ptr(uint32_t index)
{
    return loaded_blob ? nm_name(loaded_blob, index) : NULL;
}
