/*
 * Card-name checking for the "Add cards" list editor, compiled to standalone WebAssembly
 * and run in a web worker (src/workers/card-list-lint.worker.ts).
 *
 * Input is the server's NMI1 name blob (/suggest/card-names/index, built by
 * projects/server/native/name_index.c): "NMI1", u32 count, u32 string bytes, count u32
 * offsets, then NUL-terminated UTF-8 names sorted by bytes. All integers little endian.
 *
 * Three queries:
 *   - cl_find: exact lookup with the server's rule (`name = ? COLLATE NOCASE`, which folds
 *     ASCII case only), so the editor never disagrees with what an import will accept.
 *   - cl_suggest: "did you mean". Names are folded (case, accents, punctuation), padded
 *     trigrams shortlist candidates, and optimal-string-alignment distance ranks them.
 *     Split and double-faced cards are also indexed by each face.
 *   - cl_complete: autocomplete. Every word start of every folded name is indexed and
 *     sorted, so each query word prefix-matches consecutive name words: "light bo" finds
 *     Lightning Bolt and "bolt" finds it too.
 */
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define WASM_EXPORT(name) __attribute__((export_name(#name)))

#define NMI_HEADER 12u
#define MAX_KEY 255
#define GRAM_BITS 16
#define GRAM_BUCKETS (1u << GRAM_BITS)
#define SHORTLIST 512
#define MAX_RESULTS 32
#define MAX_COMPLETION_SCAN 60000
#define SHORT_QUERY 5

typedef struct
{
    uint32_t name;
    uint32_t key;
    uint16_t length;
    uint8_t alias;
} Entry;

typedef struct
{
    uint32_t entry;
    uint16_t offset;
} WordRef;

typedef struct
{
    uint32_t name;
    uint32_t entry;
    uint32_t rank[4];
} Ranked;

static const char** names;
static uint32_t name_count;
static Entry* entries;
static uint32_t entry_count;
static char* keys;
static uint32_t* exact_table;
static uint32_t exact_mask;
static uint32_t* gram_start;
static uint32_t* grams;
static WordRef* words;
static uint32_t word_count;
static uint16_t* counts;
static uint32_t* touched;

static uint32_t
read32(const uint8_t* p)
{
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static unsigned char
ascii_lower(unsigned char c)
{
    return c >= 'A' && c <= 'Z' ? (unsigned char)(c + 32) : c;
}

/* ------------------------------------------------------------------ folding */

/* Base letters for U+00C0–U+00FF and U+0100–U+017F; '*' is "ae", ' ' is a separator. */
#define LATIN1_TEXT "aaaaaa*ceeeeiiiidnooooo ouuuuytsaaaaaa*ceeeeiiiidnooooo ouuuuyty"
#define LATIN_EXTENDED_A_TEXT                                                                      \
    "AaAaAaCcCcCcCcDdDdEeEeEeEeEeGgGgGgGgHhHhIiIiIiIiIiIiJjKkkLlLlLlLlLlNnNnNnnNnOoOoOoOoRrRrRrSs" \
    "SsSsSs"                                                                                       \
    "TtTtTtUuUuUuUuUuUuWwYyYZzZzZzs"
_Static_assert(sizeof(LATIN1_TEXT) == 65, "one letter per code point U+00C0-U+00FF");
_Static_assert(sizeof(LATIN_EXTENDED_A_TEXT) == 129, "one letter per code point U+0100-U+017F");
static const char LATIN1[] = LATIN1_TEXT;
static const char LATIN_EXTENDED_A[] = LATIN_EXTENDED_A_TEXT;

/*
 * Lowercases, strips accents, drops punctuation and turns spaces, '-', '/', '_', ':' and
 * dashes into single separating spaces, so "Fire//Ice", "Jace the Mind Sculptor" and
 * "Lim-Dul" land on the same keys as the real names. Output is never longer than input.
 */
static size_t
fold(const char* text, size_t length, char* out, size_t capacity)
{
    const unsigned char* s = (const unsigned char*)text;
    size_t n = 0;
    int space = 0;
    for( size_t i = 0; i < length; )
    {
        unsigned c = s[i];
        size_t width = c < 0x80 ? 1 : c >= 0xF0 ? 4 : c >= 0xE0 ? 3 : c >= 0xC0 ? 2 : 1;
        if( i + width > length )
            width = 1;
        for( size_t k = 1; k < width; k++ )
        {
            if( (s[i + k] & 0xC0) != 0x80 )
                width = 1;
        }
        char piece[4];
        size_t piece_length = 0;
        int separator = 0;
        if( width == 1 && c < 0x80 )
        {
            unsigned char lower = ascii_lower((unsigned char)c);
            if( (lower >= 'a' && lower <= 'z') || (lower >= '0' && lower <= '9') )
                piece[piece_length++] = (char)lower;
            else if( c == ' ' || c == '\t' || c == '-' || c == '/' || c == '_' || c == ':' )
                separator = 1;
        }
        else if( width == 2 && c >= 0xC3 && c <= 0xC5 )
        {
            unsigned code = ((c & 0x1F) << 6) | (s[i + 1] & 0x3F);
            char base = code < 0x100 ? LATIN1[code - 0xC0] : LATIN_EXTENDED_A[code - 0x100];
            if( base == '*' )
            {
                piece[piece_length++] = 'a';
                piece[piece_length++] = 'e';
            }
            else if( base == ' ' )
                separator = 1;
            else
                piece[piece_length++] = (char)ascii_lower((unsigned char)base);
        }
        else if( width == 3 && c == 0xE2 && s[i + 1] == 0x80 )
        {
            /* U+2010–U+2015 dashes separate; quotes, ellipses and the rest drop. */
            separator = s[i + 2] >= 0x90 && s[i + 2] <= 0x95;
        }
        else if( width > 1 && c != 0xC2 )
        {
            memcpy(piece, s + i, width);
            piece_length = width;
        }
        i += width;
        if( separator )
        {
            space = n > 0;
            continue;
        }
        if( !piece_length )
            continue;
        if( n + space + piece_length > capacity )
            break;
        if( space )
            out[n++] = ' ';
        space = 0;
        memcpy(out + n, piece, piece_length);
        n += piece_length;
    }
    return n;
}

/* ------------------------------------------------------------------ exact lookup */

static uint32_t
hash_lower(const char* text, size_t length)
{
    uint32_t hash = 2166136261u;
    for( size_t i = 0; i < length; i++ )
        hash = (hash ^ ascii_lower((unsigned char)text[i])) * 16777619u;
    return hash;
}

static int
equal_lower(const char* name, const char* text, size_t length)
{
    for( size_t i = 0; i < length; i++ )
    {
        if( !name[i] || ascii_lower((unsigned char)name[i]) != ascii_lower((unsigned char)text[i]) )
            return 0;
    }
    return !name[length];
}

/* ------------------------------------------------------------------ trigrams */

static uint32_t
gram_bucket(unsigned char a, unsigned char b, unsigned char c)
{
    return (((uint32_t)a << 16 | (uint32_t)b << 8 | c) * 2654435761u) >> (32 - GRAM_BITS);
}

/* Unique trigram buckets of " key ", so even one- and two-letter names have grams. */
static size_t
key_grams(const char* key, size_t length, uint32_t* out)
{
    size_t count = 0;
    for( size_t i = 0; i < length; i++ )
    {
        unsigned char a = i ? (unsigned char)key[i - 1] : ' ';
        unsigned char b = (unsigned char)key[i];
        unsigned char c = i + 1 < length ? (unsigned char)key[i + 1] : ' ';
        uint32_t bucket = gram_bucket(a, b, c);
        size_t k = 0;
        while( k < count && out[k] != bucket )
            k++;
        if( k == count )
            out[count++] = bucket;
    }
    return count;
}

/* ------------------------------------------------------------------ distance */

/* Edits charged for cutting `b` short after `j` bytes: a whole word, or part of one. */
static uint32_t
cut_cost(const char* b, size_t j, size_t m)
{
    if( j == m )
        return 0;
    return b[j] == ' ' || (j && b[j - 1] == ' ') ? 1 : 2;
}

/*
 * Optimal string alignment (Damerau–Levenshtein without repeated edits of a substring).
 * With `prefix`, `a` may also match a leading part of `b` plus the cost of the cut, so a
 * name still being typed ("ligntng bol") reaches the full name ("lightning bolt").
 */
static uint32_t
osa_distance(const char* a, size_t n, const char* b, size_t m, uint32_t bound, int prefix)
{
    uint32_t rows[3][MAX_KEY + 1];
    uint32_t *before = rows[0], *previous = rows[1], *current = rows[2];
    for( size_t j = 0; j <= m; j++ )
        previous[j] = (uint32_t)j;
    for( size_t i = 1; i <= n; i++ )
    {
        current[0] = (uint32_t)i;
        uint32_t smallest = current[0];
        for( size_t j = 1; j <= m; j++ )
        {
            uint32_t cost = a[i - 1] != b[j - 1];
            uint32_t best = previous[j - 1] + cost;
            if( previous[j] + 1 < best )
                best = previous[j] + 1;
            if( current[j - 1] + 1 < best )
                best = current[j - 1] + 1;
            if( i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1] &&
                before[j - 2] + 1 < best )
                best = before[j - 2] + 1;
            current[j] = best;
            if( best < smallest )
                smallest = best;
        }
        if( smallest > bound )
            return bound + 1;
        uint32_t* spare = before;
        before = previous;
        previous = current;
        current = spare;
    }
    uint32_t distance = previous[m];
    for( size_t j = 1; prefix && j < m; j++ )
    {
        if( previous[j] + cut_cost(b, j, m) < distance )
            distance = previous[j] + cut_cost(b, j, m);
    }
    return distance;
}

static uint32_t
max_distance(size_t length)
{
    if( length <= 3 )
        return 1;
    if( length <= 5 )
        return 2;
    if( length <= 8 )
        return 3;
    return length / 3 + 1 < 8 ? (uint32_t)(length / 3 + 1) : 8;
}

/* ------------------------------------------------------------------ ranking */

static int
ranks_before(const uint32_t* a, const uint32_t* b)
{
    for( int i = 0; i < 4; i++ )
    {
        if( a[i] != b[i] )
            return a[i] < b[i];
    }
    return 0;
}

/* Keeps `list` sorted, holding each name once at its best rank. */
static void
offer(
    Ranked* list,
    uint32_t* size,
    uint32_t capacity,
    uint32_t name,
    uint32_t entry,
    const uint32_t rank[4])
{
    for( uint32_t i = 0; i < *size; i++ )
    {
        if( list[i].name != name )
            continue;
        if( !ranks_before(rank, list[i].rank) )
            return;
        memmove(list + i, list + i + 1, (*size - i - 1) * sizeof(Ranked));
        (*size)--;
        break;
    }
    uint32_t at = *size;
    while( at > 0 && ranks_before(rank, list[at - 1].rank) )
        at--;
    if( at >= capacity )
        return;
    uint32_t keep = *size < capacity ? *size : capacity - 1;
    memmove(list + at + 1, list + at, (keep - at) * sizeof(Ranked));
    list[at].name = name;
    list[at].entry = entry;
    memcpy(list[at].rank, rank, sizeof(list[at].rank));
    if( *size < capacity )
        (*size)++;
}

/* ------------------------------------------------------------------ loading */

static void
reset(void)
{
    free(names);
    free(entries);
    free(keys);
    free(exact_table);
    free(gram_start);
    free(grams);
    free(words);
    free(counts);
    free(touched);
    names = NULL;
    entries = NULL;
    keys = NULL;
    exact_table = NULL;
    gram_start = NULL;
    grams = NULL;
    words = NULL;
    counts = NULL;
    touched = NULL;
    name_count = entry_count = word_count = 0;
}

static int
validate(const uint8_t* blob, uint32_t size)
{
    if( !blob || size < NMI_HEADER || memcmp(blob, "NMI1", 4) )
        return 0;
    uint32_t count = read32(blob + 4), data_size = read32(blob + 8);
    if( (uint64_t)NMI_HEADER + (uint64_t)count * 4 + data_size != size || !data_size ||
        blob[size - 1] != 0 )
        return 0;
    for( uint32_t i = 0; i < count; i++ )
    {
        if( read32(blob + NMI_HEADER + (size_t)i * 4) >= data_size )
            return 0;
    }
    return 1;
}

static int
add_entry(uint32_t name, const char* text, size_t length, uint8_t alias, size_t* arena_used)
{
    size_t key_length = fold(text, length, keys + *arena_used, MAX_KEY);
    if( !key_length )
        return 0;
    const char* key = keys + *arena_used;
    if( alias )
    {
        /* A face that folds to the same key as the entry before it adds nothing. */
        const Entry* previous = &entries[entry_count - 1];
        if( previous->name == name && previous->length == key_length &&
            !memcmp(keys + previous->key, key, key_length) )
            return 0;
    }
    entries[entry_count].name = name;
    entries[entry_count].key = (uint32_t)*arena_used;
    entries[entry_count].length = (uint16_t)key_length;
    entries[entry_count].alias = alias;
    entry_count++;
    keys[*arena_used + key_length] = 0;
    *arena_used += key_length + 1;
    return 1;
}

static int
compare_words(const void* a, const void* b)
{
    const WordRef* x = a;
    const WordRef* y = b;
    int order =
        strcmp(keys + entries[x->entry].key + x->offset, keys + entries[y->entry].key + y->offset);
    if( order )
        return order;
    return x->entry < y->entry ? -1 : x->entry > y->entry;
}

/* Takes ownership of nothing: `blob` must stay allocated while the index is in use. */
WASM_EXPORT(cl_load)
int
cl_load(const uint8_t* blob, uint32_t size)
{
    reset();
    if( !validate(blob, size) )
        return 0;
    name_count = read32(blob + 4);
    const char* data = (const char*)blob + NMI_HEADER + (size_t)name_count * 4;
    names = malloc((name_count ? name_count : 1) * sizeof(char*));
    size_t faces = 0, text_bytes = 0;
    if( !names )
        goto fail;
    for( uint32_t i = 0; i < name_count; i++ )
    {
        names[i] = data + read32(blob + NMI_HEADER + (size_t)i * 4);
        size_t length = strlen(names[i]);
        text_bytes += length + 1;
        size_t splits = 0;
        for( const char* p = strstr(names[i], "//"); p; p = strstr(p + 2, "//") )
            splits++;
        faces += splits ? splits + 1 : 0;
    }

    /* Faces never outgrow their name, so twice the text bounds every key plus its NUL. */
    size_t entry_capacity = name_count + faces + 1;
    entries = malloc(entry_capacity * sizeof(Entry));
    keys = malloc(text_bytes * 2 + 1);
    if( !entries || !keys )
        goto fail;
    size_t arena_used = 0;
    for( uint32_t i = 0; i < name_count; i++ )
    {
        size_t length = strlen(names[i]);
        if( length > MAX_KEY )
            continue;
        if( !add_entry(i, names[i], length, 0, &arena_used) || !strstr(names[i], "//") )
            continue;
        const char* face = names[i];
        for( const char* split = strstr(face, "//"); face;
             split = face ? strstr(face, "//") : NULL )
        {
            size_t face_length = split ? (size_t)(split - face) : strlen(face);
            add_entry(i, face, face_length, 1, &arena_used);
            face = split ? split + 2 : NULL;
        }
    }

    exact_mask = 1;
    while( exact_mask < name_count * 2u + 1 )
        exact_mask <<= 1;
    exact_table = calloc(exact_mask, sizeof(uint32_t));
    if( !exact_table )
        goto fail;
    exact_mask--;
    for( uint32_t i = 0; i < name_count; i++ )
    {
        uint32_t slot = hash_lower(names[i], strlen(names[i])) & exact_mask;
        while( exact_table[slot] )
            slot = (slot + 1) & exact_mask;
        exact_table[slot] = i + 1;
    }

    /* Trigram postings as a CSR table: count per bucket, prefix sum, then fill. */
    uint32_t local[MAX_KEY];
    gram_start = calloc(GRAM_BUCKETS + 1, sizeof(uint32_t));
    if( !gram_start )
        goto fail;
    size_t total = 0;
    for( uint32_t e = 0; e < entry_count; e++ )
    {
        size_t count = key_grams(keys + entries[e].key, entries[e].length, local);
        for( size_t k = 0; k < count; k++ )
            gram_start[local[k] + 1]++;
        total += count;
    }
    for( uint32_t b = 0; b < GRAM_BUCKETS; b++ )
        gram_start[b + 1] += gram_start[b];
    grams = malloc((total ? total : 1) * sizeof(uint32_t));
    uint32_t* fill = malloc(GRAM_BUCKETS * sizeof(uint32_t));
    if( !grams || !fill )
    {
        free(fill);
        goto fail;
    }
    memcpy(fill, gram_start, GRAM_BUCKETS * sizeof(uint32_t));
    for( uint32_t e = 0; e < entry_count; e++ )
    {
        size_t count = key_grams(keys + entries[e].key, entries[e].length, local);
        for( size_t k = 0; k < count; k++ )
            grams[fill[local[k]]++] = e;
    }
    free(fill);

    /* Word starts of full names, sorted by the text from there on. */
    size_t word_capacity = 0;
    for( uint32_t e = 0; e < entry_count; e++ )
    {
        if( entries[e].alias )
            continue;
        const char* key = keys + entries[e].key;
        for( uint16_t i = 0; i < entries[e].length; i++ )
            word_capacity += !i || key[i - 1] == ' ';
    }
    words = malloc((word_capacity ? word_capacity : 1) * sizeof(WordRef));
    counts = calloc(entry_count ? entry_count : 1, sizeof(uint16_t));
    touched = malloc((entry_count ? entry_count : 1) * sizeof(uint32_t));
    if( !words || !counts || !touched )
        goto fail;
    for( uint32_t e = 0; e < entry_count; e++ )
    {
        if( entries[e].alias )
            continue;
        const char* key = keys + entries[e].key;
        for( uint16_t i = 0; i < entries[e].length; i++ )
        {
            if( !i || key[i - 1] == ' ' )
            {
                words[word_count].entry = e;
                words[word_count].offset = i;
                word_count++;
            }
        }
    }
    qsort(words, word_count, sizeof(WordRef), compare_words);
    return 1;

fail:
    reset();
    return 0;
}

WASM_EXPORT(cl_count)
uint32_t
cl_count(void)
{
    return name_count;
}

WASM_EXPORT(cl_name)
const char*
cl_name(uint32_t index)
{
    return index < name_count ? names[index] : NULL;
}

/* Index of the name the server would accept for `text`, or -1. */
WASM_EXPORT(cl_find)
int32_t
cl_find(const char* text, uint32_t length)
{
    while( length && (*text == ' ' || *text == '\t') )
    {
        text++;
        length--;
    }
    while( length && (text[length - 1] == ' ' || text[length - 1] == '\t') )
        length--;
    if( !exact_table || !length )
        return -1;
    uint32_t slot = hash_lower(text, length) & exact_mask;
    while( exact_table[slot] )
    {
        uint32_t index = exact_table[slot] - 1;
        if( equal_lower(names[index], text, length) )
            return (int32_t)index;
        slot = (slot + 1) & exact_mask;
    }
    return -1;
}

/* Folded edit distance from the query to entry `e`, or bound + 1 when too far. */
static uint32_t
entry_distance(const char* query, size_t n, uint32_t e, uint32_t bound)
{
    const Entry* entry = &entries[e];
    const char* key = keys + entry->key;
    /* Truncated names (a paste cut short, a name mid-typing) may match a longer key. */
    int prefix = n >= 4 && entry->length > n;
    uint32_t difference =
        entry->length > n ? entry->length - (uint32_t)n : (uint32_t)n - entry->length;
    return prefix || difference <= bound ? osa_distance(query, n, key, entry->length, bound, prefix)
                                         : bound + 1;
}

static void
offer_entry(
    Ranked* best,
    uint32_t* best_count,
    const char* query,
    size_t n,
    uint32_t e,
    uint32_t shared,
    uint32_t bound)
{
    uint32_t distance = entry_distance(query, n, e, bound);
    if( distance > bound )
        return;
    const Entry* entry = &entries[e];
    uint32_t difference =
        entry->length > n ? entry->length - (uint32_t)n : (uint32_t)n - entry->length;
    uint32_t rank[4] = { distance, entry->alias, difference, UINT16_MAX - shared };
    offer(best, best_count, MAX_RESULTS, entry->name, e, rank);
}

/*
 * Up to `capacity` names close to `text`, best first, with their folded edit distances.
 * A face match is dropped when a better result already matched the same text, so reprint
 * oddities like "Sol Ring // Sol Ring" don't crowd out the card itself.
 */
WASM_EXPORT(cl_suggest)
uint32_t
cl_suggest(
    const char* text,
    uint32_t length,
    uint32_t* out_names,
    uint32_t* out_distances,
    uint32_t capacity)
{
    char query[MAX_KEY + 1];
    size_t n = fold(text, length, query, MAX_KEY);
    if( !counts || !n || !capacity )
        return 0;

    uint32_t query_grams[MAX_KEY];
    size_t gram_count = key_grams(query, n, query_grams);
    uint32_t touched_count = 0;
    for( size_t g = 0; g < gram_count; g++ )
    {
        for( uint32_t p = gram_start[query_grams[g]]; p < gram_start[query_grams[g] + 1]; p++ )
        {
            uint32_t e = grams[p];
            if( !counts[e] )
                touched[touched_count++] = e;
            if( counts[e] < UINT16_MAX )
                counts[e]++;
        }
    }

    /* The lowest shared-gram count that keeps the shortlist within SHORTLIST entries. */
    uint32_t histogram[256] = { 0 };
    for( uint32_t t = 0; t < touched_count; t++ )
        histogram[counts[touched[t]] > 255 ? 255 : counts[touched[t]]]++;
    uint32_t threshold = 255, kept = 0;
    while( threshold > 1 && kept + histogram[threshold] <= SHORTLIST )
        kept += histogram[threshold--];
    if( kept + histogram[threshold] > SHORTLIST && kept )
        threshold++;

    uint32_t bound = max_distance(n);
    Ranked best[MAX_RESULTS];
    uint32_t best_count = 0;
    for( uint32_t t = 0; t < touched_count; t++ )
    {
        uint32_t e = touched[t];
        uint32_t shared = counts[e];
        counts[e] = 0;
        if( shared >= threshold )
            offer_entry(best, &best_count, query, n, e, shared, bound);
    }
    /* Short typos like "otp" share no trigram with "opt", so short queries scan everything. */
    if( n <= SHORT_QUERY )
    {
        for( uint32_t e = 0; e < entry_count; e++ )
            offer_entry(best, &best_count, query, n, e, 0, bound);
    }

    uint32_t written = 0;
    for( uint32_t i = 0; i < best_count && written < capacity; i++ )
    {
        const Entry* entry = &entries[best[i].entry];
        int repeated = 0;
        for( uint32_t k = 0; k < i && entry->alias && !repeated; k++ )
        {
            const Entry* earlier = &entries[best[k].entry];
            repeated = earlier->length == entry->length &&
                       !memcmp(keys + earlier->key, keys + entry->key, entry->length);
        }
        if( repeated )
            continue;
        out_names[written] = best[i].name;
        if( out_distances )
            out_distances[written] = best[i].rank[0];
        written++;
    }
    return written;
}

/* Every query word must prefix consecutive words of `key`, starting at its first. */
static int
words_match(const char* key, const char* query, size_t n)
{
    size_t q = 0;
    while( q < n )
    {
        while( q < n && query[q] != ' ' )
        {
            if( *key != query[q] )
                return 0;
            key++;
            q++;
        }
        if( q == n )
            return 1;
        q++;
        key = strchr(key, ' ');
        if( !key )
            return 0;
        key++;
    }
    return 1;
}

/*
 * Up to `capacity` names whose words start with the query's words, best first: names that
 * start with the query, then shorter names, then byte order.
 */
WASM_EXPORT(cl_complete)
uint32_t
cl_complete(const char* text, uint32_t length, uint32_t* out_names, uint32_t capacity)
{
    char query[MAX_KEY + 1];
    size_t n = fold(text, length, query, MAX_KEY);
    if( !words || !n || !capacity )
        return 0;
    if( capacity > MAX_RESULTS )
        capacity = MAX_RESULTS;
    query[n] = 0;
    const char* space = memchr(query, ' ', n);
    size_t first = space ? (size_t)(space - query) : n;

    uint32_t low = 0, high = word_count;
    while( low < high )
    {
        uint32_t middle = low + (high - low) / 2;
        const WordRef* word = &words[middle];
        if( strncmp(keys + entries[word->entry].key + word->offset, query, first) < 0 )
            low = middle + 1;
        else
            high = middle;
    }

    Ranked best[MAX_RESULTS];
    uint32_t best_count = 0;
    for( uint32_t i = low; i < word_count && i - low < MAX_COMPLETION_SCAN; i++ )
    {
        const WordRef* word = &words[i];
        const Entry* entry = &entries[word->entry];
        const char* key = keys + entry->key + word->offset;
        if( strncmp(key, query, first) )
            break;
        if( !words_match(key, query, n) )
            continue;
        uint32_t rank[4] = { word->offset > 0, entry->length, entry->name, 0 };
        offer(best, &best_count, capacity, entry->name, word->entry, rank);
    }
    for( uint32_t i = 0; i < best_count; i++ )
        out_names[i] = best[i].name;
    return best_count;
}
