#include "name_index.h"

#include <limits.h>
#include <stdlib.h>
#include <string.h>

#define HEADER_SIZE 12u

static uint32_t
read32(const uint8_t* p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static void
write32(
    uint8_t* p,
    uint32_t value)
{
    p[0] = (uint8_t)value;
    p[1] = (uint8_t)(value >> 8);
    p[2] = (uint8_t)(value >> 16);
    p[3] = (uint8_t)(value >> 24);
}

static int
compare_names(
    const void* a,
    const void* b)
{
    const unsigned char* left = *(const unsigned char* const*)a;
    const unsigned char* right = *(const unsigned char* const*)b;
    for( ;; )
    {
        unsigned char x = *left ? *left : '$';
        unsigned char y = *right ? *right : '$';
        if( x != y )
            return x < y ? -1 : 1;
        if( !*left || !*right )
            return 0;
        left++;
        right++;
    }
}

uint8_t*
nm_build(
    const char* const* names,
    size_t count,
    size_t* size_out)
{
    if( !size_out || count > UINT32_MAX || count > SIZE_MAX / sizeof(char*) )
        return NULL;
    *size_out = 0;
    const char** sorted = malloc((count ? count : 1) * sizeof(char*));
    if( !sorted )
        return NULL;
    for( size_t i = 0; i < count; i++ )
        sorted[i] = names[i];
    qsort(sorted, count, sizeof(char*), compare_names);

    size_t unique = 0, data_size = 0;
    for( size_t i = 0; i < count; i++ )
    {
        if( i && !strcmp(sorted[i], sorted[i - 1]) )
            continue;
        size_t length = strlen(sorted[i]) + 1;
        if( length > UINT32_MAX - data_size )
        {
            free(sorted);
            return NULL;
        }
        data_size += length;
        unique++;
    }
    if( unique > (SIZE_MAX - HEADER_SIZE - data_size) / 4 )
    {
        free(sorted);
        return NULL;
    }
    size_t size = HEADER_SIZE + unique * 4 + data_size;
    uint8_t* blob = malloc(size);
    if( !blob )
    {
        free(sorted);
        return NULL;
    }
    memcpy(blob, "NMI1", 4);
    write32(blob + 4, (uint32_t)unique);
    write32(blob + 8, (uint32_t)data_size);
    uint8_t* data = blob + HEADER_SIZE + unique * 4;
    size_t offset = 0, index = 0;
    for( size_t i = 0; i < count; i++ )
    {
        if( i && !strcmp(sorted[i], sorted[i - 1]) )
            continue;
        size_t length = strlen(sorted[i]) + 1;
        write32(blob + HEADER_SIZE + index * 4, (uint32_t)offset);
        memcpy(data + offset, sorted[i], length);
        offset += length;
        index++;
    }
    free(sorted);
    *size_out = size;
    return blob;
}

int
nm_validate(
    const uint8_t* blob,
    size_t size)
{
    if( !blob || size < HEADER_SIZE || memcmp(blob, "NMI1", 4) )
        return 0;
    uint32_t count = read32(blob + 4), data_size = read32(blob + 8);
    if( (uint64_t)HEADER_SIZE + (uint64_t)count * 4 + data_size != size )
        return 0;
    const uint8_t* data = blob + HEADER_SIZE + (size_t)count * 4;
    uint32_t previous = 0;
    for( uint32_t i = 0; i < count; i++ )
    {
        uint32_t offset = read32(blob + HEADER_SIZE + (size_t)i * 4);
        if( offset >= data_size || (i && offset <= previous) )
            return 0;
        if( !memchr(data + offset, 0, data_size - offset) )
            return 0;
        previous = offset;
    }
    return !count || read32(blob + HEADER_SIZE) == 0;
}

uint32_t
nm_count(const uint8_t* blob)
{
    return read32(blob + 4);
}

const char*
nm_name(
    const uint8_t* blob,
    uint32_t index)
{
    uint32_t count = nm_count(blob);
    if( index >= count )
        return NULL;
    return (const char*)(blob + HEADER_SIZE + (size_t)count * 4 +
                         read32(blob + HEADER_SIZE + (size_t)index * 4));
}

static int
compare_prefix(
    const char* name,
    const char* prefix,
    size_t length)
{
    for( size_t i = 0; i < length; i++ )
    {
        unsigned char a = (unsigned char)name[i], b = (unsigned char)prefix[i];
        if( !a )
            a = '$';
        if( a != b )
            return a < b ? -1 : 1;
        if( !name[i] )
            return -1;
    }
    return 0;
}

static uint32_t
lower_bound(
    const uint8_t* blob,
    const char* prefix,
    size_t length)
{
    uint32_t low = 0, high = nm_count(blob);
    while( low < high )
    {
        uint32_t middle = low + (high - low) / 2;
        if( compare_prefix(nm_name(blob, middle), prefix, length) < 0 )
            low = middle + 1;
        else
            high = middle;
    }
    return low;
}

int
nm_has_prefix(
    const uint8_t* blob,
    const char* prefix,
    size_t length)
{
    uint32_t index = lower_bound(blob, prefix, length);
    return index < nm_count(blob) && compare_prefix(nm_name(blob, index), prefix, length) == 0;
}

uint32_t
nm_find_prefix(
    const uint8_t* blob,
    const char* prefix,
    size_t length,
    uint32_t* out,
    uint32_t capacity)
{
    uint32_t index = lower_bound(blob, prefix, length), found = 0;
    while( index < nm_count(blob) && found < capacity &&
           !compare_prefix(nm_name(blob, index), prefix, length) )
    {
        out[found++] = index++;
    }
    return found;
}
