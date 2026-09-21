#ifndef NAME_INDEX_H
#define NAME_INDEX_H

#include <stddef.h>
#include <stdint.h>

/* Portable NMI1 blob: magic, count, string-byte length, offsets, NUL strings.
 * All integers are little endian. Names are unique and sorted by UTF-8 bytes. */
uint8_t *nm_build(const char *const *names, size_t count, size_t *size_out);
int nm_validate(const uint8_t *blob, size_t size);
uint32_t nm_count(const uint8_t *blob);
const char *nm_name(const uint8_t *blob, uint32_t index);
int nm_has_prefix(const uint8_t *blob, const char *prefix, size_t length);
uint32_t nm_find_prefix(const uint8_t *blob, const char *prefix, size_t length,
                        uint32_t *out, uint32_t capacity);

#endif
