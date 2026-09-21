// clock_gettime and CLOCK_MONOTONIC are POSIX, hidden by strict -std=c11 on glibc.
#define _POSIX_C_SOURCE 200809L

#include "kv_store.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32)
#include <windows.h>
#else
#include <time.h>
#endif

#define INITIAL_CAPACITY 64u
#define NOT_FOUND SIZE_MAX

typedef struct
{
    uint32_t key_len;
    uint32_t value_len;
    uint32_t value_cap;
    char data[]; /* key bytes, then value_cap bytes of value */
} entry_t;

typedef struct
{
    uint64_t hash;
    int64_t expires; /* monotonic milliseconds; 0 never expires */
    entry_t* entry;  /* NULL marks an empty slot */
} slot_t;

struct kv
{
    slot_t* slots;
    size_t mask; /* capacity - 1; capacity is a power of two */
    size_t count;
    size_t cursor; /* where the next kv_sweep resumes */
    uint64_t k0, k1;
};

static int64_t
now_ms(void)
{
#if defined(_WIN32)
    return (int64_t)GetTickCount64();
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (int64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
#endif
}

static int64_t
deadline(int64_t ttl_ms)
{
    if( ttl_ms <= 0 )
        return 0;
    int64_t now = now_ms();
    return ttl_ms > INT64_MAX - now ? INT64_MAX : now + ttl_ms;
}

static int
is_expired(
    const slot_t* slot,
    int64_t now)
{
    return slot->expires && slot->expires <= now;
}

/* SipHash-1-3 (Aumasson and Bernstein), the keyed hash Rust and Python use for tables. */
#define ROTL(x, b) (uint64_t)(((x) << (b)) | ((x) >> (64 - (b))))
#define SIPROUND                                                                                   \
    do                                                                                             \
    {                                                                                              \
        v0 += v1; v1 = ROTL(v1, 13); v1 ^= v0; v0 = ROTL(v0, 32);                                  \
        v2 += v3; v3 = ROTL(v3, 16); v3 ^= v2;                                                     \
        v0 += v3; v3 = ROTL(v3, 21); v3 ^= v0;                                                     \
        v2 += v1; v1 = ROTL(v1, 17); v1 ^= v2; v2 = ROTL(v2, 32);                                  \
    } while( 0 )

static uint64_t
read64le(const uint8_t* p)
{
    uint64_t value = 0;
    for( int i = 0; i < 8; i++ )
        value |= (uint64_t)p[i] << (8 * i);
    return value;
}

static uint64_t
hash_key(
    const kv_t* kv,
    const char* key,
    size_t key_len)
{
    const uint8_t* in = (const uint8_t*)key;
    uint64_t v0 = 0x736f6d6570736575ULL ^ kv->k0;
    uint64_t v1 = 0x646f72616e646f6dULL ^ kv->k1;
    uint64_t v2 = 0x6c7967656e657261ULL ^ kv->k0;
    uint64_t v3 = 0x7465646279746573ULL ^ kv->k1;
    const uint8_t* end = in + (key_len & ~(size_t)7);
    for( ; in != end; in += 8 )
    {
        uint64_t m = read64le(in);
        v3 ^= m;
        SIPROUND;
        v0 ^= m;
    }
    uint64_t b = (uint64_t)key_len << 56;
    switch( key_len & 7 )
    {
    case 7: b |= (uint64_t)in[6] << 48; /* fall through */
    case 6: b |= (uint64_t)in[5] << 40; /* fall through */
    case 5: b |= (uint64_t)in[4] << 32; /* fall through */
    case 4: b |= (uint64_t)in[3] << 24; /* fall through */
    case 3: b |= (uint64_t)in[2] << 16; /* fall through */
    case 2: b |= (uint64_t)in[1] << 8;  /* fall through */
    case 1: b |= (uint64_t)in[0];
    }
    v3 ^= b;
    SIPROUND;
    v0 ^= b;
    v2 ^= 0xff;
    SIPROUND;
    SIPROUND;
    SIPROUND;
    return v0 ^ v1 ^ v2 ^ v3;
}

static size_t
find(
    const kv_t* kv,
    uint64_t hash,
    const char* key,
    size_t key_len)
{
    for( size_t i = hash & kv->mask;; i = (i + 1) & kv->mask )
    {
        const slot_t* slot = &kv->slots[i];
        if( !slot->entry )
            return NOT_FOUND;
        if( slot->hash == hash && slot->entry->key_len == key_len &&
            memcmp(slot->entry->data, key, key_len) == 0 )
            return i;
    }
}

/* Empties slot i, then pulls later entries of the probe run back so no lookup stops early. */
static void
remove_at(
    kv_t* kv,
    size_t i)
{
    free(kv->slots[i].entry);
    for( size_t j = (i + 1) & kv->mask; kv->slots[j].entry; j = (j + 1) & kv->mask )
    {
        size_t home = kv->slots[j].hash & kv->mask;
        // Movable unless its home lies cyclically in (i, j]: then it already sits at or past home.
        if( ((j - home) & kv->mask) >= ((j - i) & kv->mask) )
        {
            kv->slots[i] = kv->slots[j];
            i = j;
        }
    }
    kv->slots[i].entry = NULL;
    kv->count--;
}

/* The live slot for key, reclaiming it first if it has expired. */
static slot_t*
lookup(
    kv_t* kv,
    const char* key,
    size_t key_len)
{
    size_t i = find(kv, hash_key(kv, key, key_len), key, key_len);
    if( i == NOT_FOUND )
        return NULL;
    if( is_expired(&kv->slots[i], now_ms()) )
    {
        remove_at(kv, i);
        return NULL;
    }
    return &kv->slots[i];
}

static void
place(
    kv_t* kv,
    slot_t slot)
{
    size_t i = slot.hash & kv->mask;
    while( kv->slots[i].entry )
        i = (i + 1) & kv->mask;
    kv->slots[i] = slot;
    kv->count++;
}

/* Rehashes into a new table, dropping expired entries on the way. */
static int
resize(
    kv_t* kv,
    size_t capacity)
{
    slot_t* slots = calloc(capacity, sizeof(slot_t));
    if( !slots )
        return -1;
    slot_t* old = kv->slots;
    size_t old_capacity = kv->mask + 1;
    kv->slots = slots;
    kv->mask = capacity - 1;
    kv->count = 0;
    kv->cursor = 0;
    int64_t now = now_ms();
    for( size_t i = 0; i < old_capacity; i++ )
    {
        if( !old[i].entry )
            continue;
        if( is_expired(&old[i], now) )
            free(old[i].entry);
        else
            place(kv, old[i]);
    }
    free(old);
    return 0;
}

static int
set_value(
    slot_t* slot,
    const char* value,
    size_t value_len)
{
    entry_t* entry = slot->entry;
    // Reuse the allocation unless the value outgrows it or would waste most of it.
    if( value_len > entry->value_cap || value_len < entry->value_cap / 2 )
    {
        entry = realloc(entry, sizeof(entry_t) + entry->key_len + value_len);
        if( !entry )
            return -1;
        entry->value_cap = (uint32_t)value_len;
        slot->entry = entry;
    }
    memcpy(entry->data + entry->key_len, value, value_len);
    entry->value_len = (uint32_t)value_len;
    return 0;
}

kv_t*
kv_create(
    uint64_t seed0,
    uint64_t seed1)
{
    kv_t* kv = calloc(1, sizeof(kv_t));
    if( !kv )
        return NULL;
    kv->slots = calloc(INITIAL_CAPACITY, sizeof(slot_t));
    if( !kv->slots )
    {
        free(kv);
        return NULL;
    }
    kv->mask = INITIAL_CAPACITY - 1;
    kv->k0 = seed0;
    kv->k1 = seed1;
    return kv;
}

void
kv_destroy(kv_t* kv)
{
    if( !kv )
        return;
    for( size_t i = 0; i <= kv->mask; i++ )
        free(kv->slots[i].entry);
    free(kv->slots);
    free(kv);
}

int
kv_set(
    kv_t* kv,
    const char* key,
    size_t key_len,
    const char* value,
    size_t value_len,
    int64_t ttl_ms)
{
    if( key_len > UINT32_MAX || value_len > UINT32_MAX )
        return -1;
    uint64_t hash = hash_key(kv, key, key_len);
    size_t i = find(kv, hash, key, key_len);
    if( i != NOT_FOUND )
    {
        if( set_value(&kv->slots[i], value, value_len) != 0 )
            return -1;
        kv->slots[i].expires = deadline(ttl_ms);
        return 0;
    }
    // Keep the load factor at or under 3/4 so probe runs stay short.
    if( (kv->count + 1) * 4 > (kv->mask + 1) * 3 && resize(kv, (kv->mask + 1) * 2) != 0 )
        return -1;
    entry_t* entry = malloc(sizeof(entry_t) + key_len + value_len);
    if( !entry )
        return -1;
    entry->key_len = (uint32_t)key_len;
    entry->value_len = (uint32_t)value_len;
    entry->value_cap = (uint32_t)value_len;
    memcpy(entry->data, key, key_len);
    memcpy(entry->data + key_len, value, value_len);
    place(kv, (slot_t){ hash, deadline(ttl_ms), entry });
    return 0;
}

int
kv_get(
    kv_t* kv,
    const char* key,
    size_t key_len,
    const char** value,
    size_t* value_len)
{
    slot_t* slot = lookup(kv, key, key_len);
    if( !slot )
        return 0;
    *value = slot->entry->data + slot->entry->key_len;
    *value_len = slot->entry->value_len;
    return 1;
}

int
kv_del(
    kv_t* kv,
    const char* key,
    size_t key_len)
{
    size_t i = find(kv, hash_key(kv, key, key_len), key, key_len);
    if( i == NOT_FOUND )
        return 0;
    int live = !is_expired(&kv->slots[i], now_ms());
    remove_at(kv, i);
    return live;
}

int
kv_expire(
    kv_t* kv,
    const char* key,
    size_t key_len,
    int64_t ttl_ms)
{
    slot_t* slot = lookup(kv, key, key_len);
    if( !slot )
        return 0;
    slot->expires = deadline(ttl_ms);
    return 1;
}

int64_t
kv_ttl(
    kv_t* kv,
    const char* key,
    size_t key_len)
{
    slot_t* slot = lookup(kv, key, key_len);
    if( !slot )
        return KV_TTL_MISSING;
    if( !slot->expires )
        return KV_TTL_PERSIST;
    return slot->expires - now_ms();
}

static int
parse_int(
    const char* s,
    size_t len,
    int64_t* out)
{
    size_t i = 0;
    int negative = len > 0 && s[0] == '-';
    if( negative )
        i++;
    if( i == len || len - i > 19 )
        return 0;
    uint64_t value = 0;
    for( ; i < len; i++ )
    {
        if( s[i] < '0' || s[i] > '9' )
            return 0;
        value = value * 10 + (uint64_t)(s[i] - '0');
    }
    if( value > (uint64_t)INT64_MAX + (uint64_t)negative )
        return 0;
    *out = negative ? (int64_t)(0 - value) : (int64_t)value;
    return 1;
}

int
kv_incr(
    kv_t* kv,
    const char* key,
    size_t key_len,
    int64_t ttl_ms,
    int64_t* result)
{
    slot_t* slot = lookup(kv, key, key_len);
    int64_t value = 0;
    if( slot && !parse_int(slot->entry->data + slot->entry->key_len, slot->entry->value_len, &value) )
        return -2;
    if( value == INT64_MAX )
        return -2;
    value++;
    char digits[24];
    int length = snprintf(digits, sizeof(digits), "%lld", (long long)value);
    if( slot ? set_value(slot, digits, (size_t)length) != 0
             : kv_set(kv, key, key_len, digits, (size_t)length, ttl_ms) != 0 )
        return -1;
    *result = value;
    return 0;
}

size_t
kv_sweep(
    kv_t* kv,
    size_t max_slots)
{
    size_t removed = 0;
    int64_t now = now_ms();
    for( size_t n = 0; n < max_slots && kv->count; n++ )
    {
        // After a removal the next entry may have shifted into the cursor, so look again.
        if( kv->slots[kv->cursor].entry && is_expired(&kv->slots[kv->cursor], now) )
        {
            remove_at(kv, kv->cursor);
            removed++;
        }
        else
            kv->cursor = (kv->cursor + 1) & kv->mask;
    }
    return removed;
}

size_t
kv_count(const kv_t* kv)
{
    return kv->count;
}
