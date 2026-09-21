#ifndef KV_STORE_H
#define KV_STORE_H

#include <stddef.h>
#include <stdint.h>

/*
 * A small in-memory key-value store with per-key expiry, in the spirit of Redis.
 *
 * Keys and values are byte strings. Open addressing with linear probing; deletion
 * shifts later entries back, so there are no tombstones and lookups stay short.
 * Keys hash with SipHash-1-3 under a caller-supplied random key, so clients who
 * choose keys (usernames, IPs) cannot force collisions.
 *
 * Expired keys vanish lazily when touched, and kv_sweep reclaims the rest a few
 * slots at a time. TTLs are milliseconds on a monotonic clock; 0 means no expiry.
 */

typedef struct kv kv_t;

#define KV_TTL_MISSING (-2)
#define KV_TTL_PERSIST (-1)

kv_t* kv_create(uint64_t seed0, uint64_t seed1);
void kv_destroy(kv_t* kv);

/* 0 on success, -1 when out of memory. Replaces any existing value and TTL. */
int kv_set(kv_t* kv, const char* key, size_t key_len, const char* value, size_t value_len, int64_t ttl_ms);

/* 1 and the value (valid until the next write) when present, else 0. */
int kv_get(kv_t* kv, const char* key, size_t key_len, const char** value, size_t* value_len);

/* 1 if the key existed. */
int kv_del(kv_t* kv, const char* key, size_t key_len);

/* 1 if the key exists; sets its TTL, or removes the TTL when ttl_ms is 0. */
int kv_expire(kv_t* kv, const char* key, size_t key_len, int64_t ttl_ms);

/* Remaining milliseconds, KV_TTL_PERSIST without expiry, KV_TTL_MISSING without the key. */
int64_t kv_ttl(kv_t* kv, const char* key, size_t key_len);

/*
 * Adds 1 to a decimal integer value. A missing key starts at 0 and takes ttl_ms;
 * an existing key keeps its TTL. 0 on success, -1 out of memory, -2 not an integer.
 */
int kv_incr(kv_t* kv, const char* key, size_t key_len, int64_t ttl_ms, int64_t* result);

/* Checks up to max_slots slots from where the last sweep stopped; returns keys expired. */
size_t kv_sweep(kv_t* kv, size_t max_slots);

/* Live keys plus expired keys not yet reclaimed. */
size_t kv_count(const kv_t* kv);

#endif
