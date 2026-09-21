/*
 * Banner blend pixel pipeline, compiled to standalone WebAssembly.
 *
 * Why C/WASM: speed on tight loops, and cross-browser bit identity. JavaScript engines
 * may approximate Math.exp/log/pow differently; this module carries its own libm and is
 * built without fast-math, so identical inputs produce identical bytes in every browser.
 *
 * Contents (see banner-blending.md for the algorithms and references):
 *   - Boykov–Kolmogorov max-flow
 *   - GrabCut with Orchard–Bouman GMM initialisation
 *   - color guided filter, band-limited mask refinement
 *   - push–pull fill and edge color decontamination
 *   - seam search and boundary-following multiband / Poisson / fade compositing
 *
 * Storage types mirror the original TypeScript (float for image planes, double for
 * accumulators) so results can be compared against it.
 */
#include <math.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
#define WASM_EXPORT(name) __attribute__((export_name(#name)))

/* Stage notifications for progress UI: 0 segment, 1 refine, 2 decontaminate. */
WASM_IMPORT(bb_progress) void bb_progress(int stage);

static double clampd(double n, double lo, double hi) { return n < lo ? lo : n > hi ? hi : n; }
static int clampi(int n, int lo, int hi) { return n < lo ? lo : n > hi ? hi : n; }
static double smooth(double lo, double hi, double n)
{
    double t = clampd((n - lo) / (hi - lo), 0, 1);
    return t * t * (3 - 2 * t);
}
static double linear_from_srgb(double n)
{
    n /= 255;
    return n <= 0.04045 ? n / 12.92 : pow((n + 0.055) / 1.055, 2.4);
}
static int srgb_from_linear(double n)
{
    n = clampd(n, 0, 1);
    return (int)floor(255 * (n <= 0.0031308 ? n * 12.92 : 1.055 * pow(n, 1 / 2.4) - 0.055) + 0.5);
}
static float LINEAR[256];
static int linear_ready = 0;
static void init_linear(void)
{
    if( linear_ready ) return;
    for( int i = 0; i < 256; i++ ) LINEAR[i] = (float)linear_from_srgb(i);
    linear_ready = 1;
}

#define ALLOC(type, count) ((type*)calloc((size_t)(count) > 0 ? (size_t)(count) : 1, sizeof(type)))

/* ------------------------------------------------------------------ max-flow */

#define MF_NONE (-1)
#define MF_TERMINAL (-2)
#define MF_ORPHAN (-3)
#define MF_INF_DIST 0x3fffffff

typedef struct {
    int nodes, arcs, capacity;
    int *first, *head, *next;
    double *cap, *terminal;
    int *parent, *stamp, *distance;
    uint8_t *sink, *queued;
    double flow;
} Graph;

static int graph_init(Graph* g, int nodes, int edges)
{
    memset(g, 0, sizeof *g);
    g->nodes = nodes; g->capacity = edges * 2;
    g->first = ALLOC(int, nodes); g->head = ALLOC(int, g->capacity); g->next = ALLOC(int, g->capacity);
    g->cap = ALLOC(double, g->capacity); g->terminal = ALLOC(double, nodes);
    g->parent = ALLOC(int, nodes); g->stamp = ALLOC(int, nodes); g->distance = ALLOC(int, nodes);
    g->sink = ALLOC(uint8_t, nodes); g->queued = ALLOC(uint8_t, nodes);
    if( !g->first || !g->head || !g->next || !g->cap || !g->terminal || !g->parent || !g->stamp || !g->distance || !g->sink || !g->queued ) return 0;
    for( int i = 0; i < nodes; i++ ) g->first[i] = MF_NONE;
    return 1;
}
static void graph_free(Graph* g)
{
    free(g->first); free(g->head); free(g->next); free(g->cap); free(g->terminal);
    free(g->parent); free(g->stamp); free(g->distance); free(g->sink); free(g->queued);
}
static void graph_tweights(Graph* g, int node, double from_source, double to_sink)
{
    double delta = g->terminal[node];
    if( delta > 0 ) from_source += delta; else to_sink -= delta;
    g->flow += from_source < to_sink ? from_source : to_sink;
    g->terminal[node] = from_source - to_sink;
}
static void graph_edge(Graph* g, int i, int j, double forward, double backward)
{
    int a = g->arcs;
    g->head[a] = j; g->cap[a] = forward; g->next[a] = g->first[i]; g->first[i] = a;
    g->head[a + 1] = i; g->cap[a + 1] = backward; g->next[a + 1] = g->first[j]; g->first[j] = a + 1;
    g->arcs += 2;
}
/* Free nodes count as source, as in OpenCV. */
static int graph_in_source(const Graph* g, int node) { return g->parent[node] == MF_NONE || !g->sink[node]; }

typedef struct { int* data; int length, capacity; } IntList;
static int list_push(IntList* list, int value)
{
    if( list->length == list->capacity ) {
        int capacity = list->capacity ? list->capacity * 2 : 256;
        int* data = (int*)realloc(list->data, sizeof(int) * (size_t)capacity);
        if( !data ) return 0;
        list->data = data; list->capacity = capacity;
    }
    list->data[list->length++] = value;
    return 1;
}

static int graph_maxflow(Graph* g)
{
    int n = g->nodes, qsize = n + 1;
    int *first = g->first, *head = g->head, *next = g->next, *parent = g->parent, *stamp = g->stamp, *distance = g->distance;
    double *cap = g->cap, *terminal = g->terminal;
    uint8_t *sink = g->sink, *queued = g->queued;
    int* active = ALLOC(int, qsize);
    IntList orphans = { 0 };
    if( !active ) return 0;
    int active_head = 0, active_tail = 0, active_count = 0, orphan_head = 0, time = 0, ok = 1;

#define SET_ACTIVE(i) do { int _i = (i); if( !queued[_i] ) { queued[_i] = 1; active[active_tail] = _i; active_tail = (active_tail + 1) % qsize; active_count++; } } while( 0 )
#define ORPHAN(i) do { int _o = (i); parent[_o] = MF_ORPHAN; if( !list_push(&orphans, _o) ) ok = 0; } while( 0 )

    for( int i = 0; i < n; i++ ) {
        queued[i] = 0; stamp[i] = 0;
        if( terminal[i] > 0 ) { sink[i] = 0; parent[i] = MF_TERMINAL; distance[i] = 1; SET_ACTIVE(i); }
        else if( terminal[i] < 0 ) { sink[i] = 1; parent[i] = MF_TERMINAL; distance[i] = 1; SET_ACTIVE(i); }
        else parent[i] = MF_NONE;
    }

    int current = MF_NONE;
    while( ok ) {
        int i = current;
        if( i != MF_NONE ) { queued[i] = 0; if( parent[i] == MF_NONE ) i = MF_NONE; }
        if( i == MF_NONE ) {
            while( active_count > 0 ) {
                int k = active[active_head]; active_head = (active_head + 1) % qsize; active_count--;
                queued[k] = 0;
                if( parent[k] != MF_NONE ) { i = k; break; }
            }
            if( i == MF_NONE ) break;
        }

        int bridge = MF_NONE;
        if( !sink[i] ) {
            for( int a = first[i]; a != MF_NONE; a = next[a] ) {
                if( cap[a] <= 0 ) continue;
                int j = head[a];
                if( parent[j] == MF_NONE ) { sink[j] = 0; parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; SET_ACTIVE(j); }
                else if( sink[j] ) { bridge = a; break; }
                else if( stamp[j] <= stamp[i] && distance[j] > distance[i] ) { parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; }
            }
        } else {
            for( int a = first[i]; a != MF_NONE; a = next[a] ) {
                if( cap[a ^ 1] <= 0 ) continue;
                int j = head[a];
                if( parent[j] == MF_NONE ) { sink[j] = 1; parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; SET_ACTIVE(j); }
                else if( !sink[j] ) { bridge = a ^ 1; break; }
                else if( stamp[j] <= stamp[i] && distance[j] > distance[i] ) { parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; }
            }
        }
        time++;
        if( bridge == MF_NONE ) { current = MF_NONE; continue; }
        queued[i] = 1; current = i;

        double bottleneck = cap[bridge];
        for( int k = head[bridge ^ 1];; ) {
            int a = parent[k];
            if( a == MF_TERMINAL ) { if( terminal[k] < bottleneck ) bottleneck = terminal[k]; break; }
            if( cap[a ^ 1] < bottleneck ) bottleneck = cap[a ^ 1];
            k = head[a];
        }
        for( int k = head[bridge];; ) {
            int a = parent[k];
            if( a == MF_TERMINAL ) { if( -terminal[k] < bottleneck ) bottleneck = -terminal[k]; break; }
            if( cap[a] < bottleneck ) bottleneck = cap[a];
            k = head[a];
        }
        cap[bridge ^ 1] += bottleneck; cap[bridge] -= bottleneck;
        for( int k = head[bridge ^ 1];; ) {
            int a = parent[k];
            if( a == MF_TERMINAL ) { terminal[k] -= bottleneck; if( terminal[k] == 0 ) ORPHAN(k); break; }
            cap[a] += bottleneck; cap[a ^ 1] -= bottleneck;
            if( cap[a ^ 1] == 0 ) ORPHAN(k);
            k = head[a];
        }
        for( int k = head[bridge];; ) {
            int a = parent[k];
            if( a == MF_TERMINAL ) { terminal[k] += bottleneck; if( terminal[k] == 0 ) ORPHAN(k); break; }
            cap[a ^ 1] += bottleneck; cap[a] -= bottleneck;
            if( cap[a] == 0 ) ORPHAN(k);
            k = head[a];
        }
        g->flow += bottleneck;

        time++;
        while( ok && orphan_head < orphans.length ) {
            int o = orphans.data[orphan_head++];
            uint8_t in_sink = sink[o];
            int best_arc = MF_NONE, best_distance = MF_INF_DIST;
            for( int a = first[o]; a != MF_NONE; a = next[a] ) {
                if( (in_sink ? cap[a] : cap[a ^ 1]) <= 0 ) continue;
                int j = head[a];
                if( sink[j] != in_sink || parent[j] == MF_NONE ) continue;
                int d = 0, k = j;
                for( ;; ) {
                    if( stamp[k] == time ) { d += distance[k]; break; }
                    int up = parent[k]; d++;
                    if( up == MF_TERMINAL ) { stamp[k] = time; distance[k] = 1; break; }
                    if( up == MF_ORPHAN ) { d = MF_INF_DIST; break; }
                    k = head[up];
                }
                if( d >= MF_INF_DIST ) continue;
                if( d < best_distance ) { best_arc = a; best_distance = d; }
                for( k = j; stamp[k] != time; k = head[parent[k]] ) { stamp[k] = time; distance[k] = d--; }
            }
            if( best_arc != MF_NONE ) { parent[o] = best_arc; stamp[o] = time; distance[o] = best_distance + 1; continue; }
            parent[o] = MF_NONE;
            for( int a = first[o]; a != MF_NONE; a = next[a] ) {
                int j = head[a];
                if( sink[j] != in_sink || parent[j] == MF_NONE ) continue;
                if( (in_sink ? cap[a] : cap[a ^ 1]) > 0 ) SET_ACTIVE(j);
                int up = parent[j];
                if( up != MF_TERMINAL && up != MF_ORPHAN && head[up] == o ) ORPHAN(j);
            }
        }
        orphans.length = 0; orphan_head = 0;
    }
#undef SET_ACTIVE
#undef ORPHAN
    free(active); free(orphans.data);
    return ok;
}

/* Exported for tests: the terminal/edge layout mirrors graph_* above. */
WASM_EXPORT(bb_maxflow)
double bb_maxflow(int nodes, int edges, const double* terminals, const int* edge_nodes, const double* edge_caps)
{
    Graph g;
    double flow = -1;
    if( graph_init(&g, nodes, edges) ) {
        for( int i = 0; i < nodes; i++ ) graph_tweights(&g, i, terminals[i * 2], terminals[i * 2 + 1]);
        for( int e = 0; e < edges; e++ ) graph_edge(&g, edge_nodes[e * 2], edge_nodes[e * 2 + 1], edge_caps[e * 2], edge_caps[e * 2 + 1]);
        if( graph_maxflow(&g) ) flow = g.flow;
    }
    graph_free(&g);
    return flow;
}

/* ------------------------------------------------------------------- GrabCut */

enum { GC_BGD = 0, GC_FGD = 1, GC_PR_BGD = 2, GC_PR_FGD = 3 };
#define COMPONENTS 5
#define GAMMA 50.0
#define LAMBDA (8 * GAMMA + 1)

typedef struct { double weight[COMPONENTS], mean[COMPONENTS * 3], inverse[COMPONENTS * 9], log_norm[COMPONENTS]; } Gmm;

/* Symmetric 3×3 cyclic Jacobi with a fixed sweep count; returns the principal eigenpair. */
static double largest_eigenvector(const double m[6], double vector[3])
{
    double a[3][3] = { { m[0], m[1], m[2] }, { m[1], m[3], m[4] }, { m[2], m[4], m[5] } };
    double v[3][3] = { { 1, 0, 0 }, { 0, 1, 0 }, { 0, 0, 1 } };
    static const int pairs[3][2] = { { 0, 1 }, { 0, 2 }, { 1, 2 } };
    for( int sweep = 0; sweep < 12; sweep++ ) for( int r = 0; r < 3; r++ ) {
        int p = pairs[r][0], q = pairs[r][1];
        if( fabs(a[p][q]) < 1e-12 ) continue;
        double theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        double sign = theta > 0 ? 1 : theta < 0 ? -1 : 1;
        double t = sign / (fabs(theta) + sqrt(theta * theta + 1));
        double c = 1 / sqrt(t * t + 1), s = t * c;
        for( int k = 0; k < 3; k++ ) { double akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for( int k = 0; k < 3; k++ ) { double apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for( int k = 0; k < 3; k++ ) { double vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
    }
    int best = 0;
    for( int k = 1; k < 3; k++ ) if( a[k][k] > a[best][best] ) best = k;
    vector[0] = v[0][best]; vector[1] = v[1][best]; vector[2] = v[2][best];
    return a[best][best];
}

static void statistics(const double* color, const int* members, int count, double mean[3], double cov[6])
{
    double r = 0, g = 0, b = 0;
    for( int k = 0; k < count; k++ ) { int p = members[k] * 3; r += color[p]; g += color[p + 1]; b += color[p + 2]; }
    r /= count; g /= count; b /= count;
    for( int k = 0; k < 6; k++ ) cov[k] = 0;
    for( int k = 0; k < count; k++ ) {
        int p = members[k] * 3;
        double dr = color[p] - r, dg = color[p + 1] - g, db = color[p + 2] - b;
        cov[0] += dr * dr; cov[1] += dr * dg; cov[2] += dr * db; cov[3] += dg * dg; cov[4] += dg * db; cov[5] += db * db;
    }
    for( int k = 0; k < 6; k++ ) cov[k] /= count;
    mean[0] = r; mean[1] = g; mean[2] = b;
}

/* Orchard–Bouman: repeatedly split the cluster with the largest principal variance. */
static int orchard_bouman(const double* color, const int* pixels, int count, int* component)
{
    int *order = ALLOC(int, count), *scratch = ALLOC(int, count);
    if( !order || !scratch ) { free(order); free(scratch); return 0; }
    memcpy(order, pixels, sizeof(int) * (size_t)count);
    int start[COMPONENTS] = { 0 }, length[COMPONENTS] = { count }, clusters = 1;
    while( clusters < COMPONENTS ) {
        int best = -1;
        double best_value = -1, best_axis[3] = { 0 }, best_mean[3] = { 0 };
        for( int c = 0; c < clusters; c++ ) {
            if( length[c] < 2 ) continue;
            double mean[3], cov[6], axis[3];
            statistics(color, order + start[c], length[c], mean, cov);
            double value = largest_eigenvector(cov, axis);
            if( value > best_value ) { best = c; best_value = value; memcpy(best_axis, axis, sizeof axis); memcpy(best_mean, mean, sizeof mean); }
        }
        if( best < 0 || best_value <= 1e-9 ) break;
        double split = best_mean[0] * best_axis[0] + best_mean[1] * best_axis[1] + best_mean[2] * best_axis[2];
        int* segment = order + start[best];
        int low = 0, high = 0;
        for( int k = 0; k < length[best]; k++ ) {
            int p = segment[k];
            double projection = color[p * 3] * best_axis[0] + color[p * 3 + 1] * best_axis[1] + color[p * 3 + 2] * best_axis[2];
            if( projection <= split ) segment[low++] = p; else scratch[high++] = p;
        }
        if( !low || !high ) break;
        memcpy(segment + low, scratch, sizeof(int) * (size_t)high);
        for( int c = clusters; c > best + 1; c-- ) { start[c] = start[c - 1]; length[c] = length[c - 1]; }
        start[best + 1] = start[best] + low; length[best + 1] = high; length[best] = low;
        clusters++;
    }
    for( int c = 0; c < clusters; c++ ) for( int k = 0; k < length[c]; k++ ) component[order[start[c] + k]] = c;
    free(order); free(scratch);
    return 1;
}

static int learn_gmm(const double* color, const int* pixels, int count, const int* component, Gmm* gmm)
{
    memset(gmm, 0, sizeof *gmm);
    int sizes[COMPONENTS] = { 0 }, offsets[COMPONENTS] = { 0 };
    for( int k = 0; k < count; k++ ) sizes[component[pixels[k]]]++;
    for( int c = 1; c < COMPONENTS; c++ ) offsets[c] = offsets[c - 1] + sizes[c - 1];
    int* grouped = ALLOC(int, count);
    if( !grouped ) return 0;
    int cursor[COMPONENTS];
    memcpy(cursor, offsets, sizeof cursor);
    for( int k = 0; k < count; k++ ) grouped[cursor[component[pixels[k]]]++] = pixels[k];
    for( int c = 0; c < COMPONENTS; c++ ) {
        if( !sizes[c] ) continue;
        double mean[3], cov[6];
        statistics(color, grouped + offsets[c], sizes[c], mean, cov);
        cov[0] += 0.01; cov[3] += 0.01; cov[5] += 0.01;
        double a = cov[0], b = cov[1], d = cov[2], e = cov[3], f = cov[4], i = cov[5];
        double det = a * (e * i - f * f) - b * (b * i - f * d) + d * (b * f - e * d);
        double inv[9] = { e * i - f * f, d * f - b * i, b * f - d * e, d * f - b * i, a * i - d * d, b * d - a * f, b * f - d * e, b * d - a * f, a * e - b * b };
        for( int k = 0; k < 9; k++ ) gmm->inverse[c * 9 + k] = inv[k] / det;
        memcpy(gmm->mean + c * 3, mean, sizeof mean);
        gmm->weight[c] = (double)sizes[c] / count;
        gmm->log_norm[c] = log(gmm->weight[c]) - 0.5 * log(det);
    }
    free(grouped);
    return 1;
}

static double component_log_likelihood(const Gmm* gmm, int c, double r, double g, double b)
{
    if( gmm->weight[c] <= 0 ) return -INFINITY;
    const double *m = gmm->mean, *inv = gmm->inverse;
    int o = c * 9;
    double dr = r - m[c * 3], dg = g - m[c * 3 + 1], db = b - m[c * 3 + 2];
    double q = dr * (dr * inv[o] + dg * inv[o + 3] + db * inv[o + 6]) +
        dg * (dr * inv[o + 1] + dg * inv[o + 4] + db * inv[o + 7]) +
        db * (dr * inv[o + 2] + dg * inv[o + 5] + db * inv[o + 8]);
    return gmm->log_norm[c] - 0.5 * q;
}

static double mixture_negative_log(const Gmm* gmm, double r, double g, double b)
{
    double values[COMPONENTS], max = -INFINITY, sum = 0;
    for( int c = 0; c < COMPONENTS; c++ ) { values[c] = component_log_likelihood(gmm, c, r, g, b); if( values[c] > max ) max = values[c]; }
    if( max == -INFINITY ) return 1e3;
    for( int c = 0; c < COMPONENTS; c++ ) if( values[c] > -INFINITY ) sum += exp(values[c] - max);
    double value = -(max + log(sum));
    return value < 1e3 ? value : 1e3;
}

static const int NEIGHBOURS[4][2] = { { 1, 0 }, { 0, 1 }, { 1, 1 }, { -1, 1 } };

static int is_foreground(uint8_t label) { return label == GC_FGD || label == GC_PR_FGD; }

static int split_labels(const uint8_t* labels, int n, int* fg, int* fg_count, int* bg, int* bg_count)
{
    *fg_count = 0; *bg_count = 0;
    for( int p = 0; p < n; p++ ) { if( is_foreground(labels[p]) ) fg[(*fg_count)++] = p; else bg[(*bg_count)++] = p; }
    return *fg_count && *bg_count;
}

/* Runs GrabCut in place on `labels`. `rgb` is interleaved 0..255 sRGB. Returns 0 on allocation failure. */
static int grabcut(const double* rgb, int width, int height, uint8_t* labels, int iterations)
{
    int n = width * height, ok = 0;
    const double weights[4] = { 1, 1, M_SQRT1_2, M_SQRT1_2 };
    double sum = 0;
    int pairs = 0;
    for( int y = 0; y < height; y++ ) for( int x = 0; x < width; x++ ) for( int k = 0; k < 4; k++ ) {
        int nx = x + NEIGHBOURS[k][0], ny = y + NEIGHBOURS[k][1];
        if( nx < 0 || nx >= width || ny >= height ) continue;
        int p = (y * width + x) * 3, q = (ny * width + nx) * 3;
        double dr = rgb[p] - rgb[q], dg = rgb[p + 1] - rgb[q + 1], db = rgb[p + 2] - rgb[q + 2];
        sum += dr * dr + dg * dg + db * db; pairs++;
    }
    double beta = sum > 0 ? pairs / (2 * sum) : 0;
    double* smoothness = ALLOC(double, n * 4);
    int *component = ALLOC(int, n), *fg = ALLOC(int, n), *bg = ALLOC(int, n);
    Gmm fg_gmm, bg_gmm;
    int fg_count, bg_count;
    if( !smoothness || !component || !fg || !bg ) goto done;
    for( int y = 0; y < height; y++ ) for( int x = 0; x < width; x++ ) for( int k = 0; k < 4; k++ ) {
        int nx = x + NEIGHBOURS[k][0], ny = y + NEIGHBOURS[k][1];
        if( nx < 0 || nx >= width || ny >= height ) continue;
        int p = (y * width + x) * 3, q = (ny * width + nx) * 3;
        double dr = rgb[p] - rgb[q], dg = rgb[p + 1] - rgb[q + 1], db = rgb[p + 2] - rgb[q + 2];
        smoothness[(y * width + x) * 4 + k] = GAMMA * weights[k] * exp(-beta * (dr * dr + dg * dg + db * db));
    }
    if( !split_labels(labels, n, fg, &fg_count, bg, &bg_count) ) { ok = 1; goto done; }
    if( !orchard_bouman(rgb, fg, fg_count, component) || !orchard_bouman(rgb, bg, bg_count, component) ) goto done;
    if( !learn_gmm(rgb, fg, fg_count, component, &fg_gmm) || !learn_gmm(rgb, bg, bg_count, component, &bg_gmm) ) goto done;

    for( int iteration = 0; iteration < iterations; iteration++ ) {
        if( iteration > 0 ) {
            for( int p = 0; p < n; p++ ) {
                const Gmm* gmm = is_foreground(labels[p]) ? &fg_gmm : &bg_gmm;
                int best = 0;
                double best_value = -INFINITY;
                for( int c = 0; c < COMPONENTS; c++ ) {
                    double value = component_log_likelihood(gmm, c, rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
                    if( value > best_value ) { best_value = value; best = c; }
                }
                component[p] = best;
            }
            if( !split_labels(labels, n, fg, &fg_count, bg, &bg_count) ) { ok = 1; goto done; }
            if( !learn_gmm(rgb, fg, fg_count, component, &fg_gmm) || !learn_gmm(rgb, bg, bg_count, component, &bg_gmm) ) goto done;
        }
        Graph graph;
        if( !graph_init(&graph, n, n * 4) ) { graph_free(&graph); goto done; }
        for( int p = 0; p < n; p++ ) {
            uint8_t label = labels[p];
            if( label == GC_BGD ) graph_tweights(&graph, p, 0, LAMBDA);
            else if( label == GC_FGD ) graph_tweights(&graph, p, LAMBDA, 0);
            else {
                double r = rgb[p * 3], g = rgb[p * 3 + 1], b = rgb[p * 3 + 2];
                graph_tweights(&graph, p, mixture_negative_log(&bg_gmm, r, g, b), mixture_negative_log(&fg_gmm, r, g, b));
            }
        }
        for( int y = 0; y < height; y++ ) for( int x = 0; x < width; x++ ) for( int k = 0; k < 4; k++ ) {
            int nx = x + NEIGHBOURS[k][0], ny = y + NEIGHBOURS[k][1];
            if( nx < 0 || nx >= width || ny >= height ) continue;
            double weight = smoothness[(y * width + x) * 4 + k];
            graph_edge(&graph, y * width + x, ny * width + nx, weight, weight);
        }
        int flowed = graph_maxflow(&graph);
        if( flowed ) for( int p = 0; p < n; p++ )
            if( labels[p] == GC_PR_BGD || labels[p] == GC_PR_FGD ) labels[p] = graph_in_source(&graph, p) ? GC_PR_FGD : GC_PR_BGD;
        graph_free(&graph);
        if( !flowed ) goto done;
    }
    ok = 1;
done:
    free(smoothness); free(component); free(fg); free(bg);
    return ok;
}

WASM_EXPORT(bb_grabcut)
int bb_grabcut(const double* rgb, int width, int height, uint8_t* labels, int iterations)
{
    return grabcut(rgb, width, height, labels, iterations);
}

/* ------------------------------------------------------------------- matting */

/* Mean over a (2r+1)² window clipped at the borders, via a double summed-area table. */
static int box_mean(const double* input, int width, int height, int radius, double* out)
{
    int stride = width + 1;
    double* table = ALLOC(double, stride * (height + 1));
    if( !table ) return 0;
    for( int y = 0; y < height; y++ ) {
        double row = 0;
        for( int x = 0; x < width; x++ ) { row += input[y * width + x]; table[(y + 1) * stride + x + 1] = table[y * stride + x + 1] + row; }
    }
    for( int y = 0; y < height; y++ ) {
        int y0 = y - radius < 0 ? 0 : y - radius, y1 = y + radius + 1 > height ? height : y + radius + 1;
        for( int x = 0; x < width; x++ ) {
            int x0 = x - radius < 0 ? 0 : x - radius, x1 = x + radius + 1 > width ? width : x + radius + 1;
            out[y * width + x] = (table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0]) / ((x1 - x0) * (y1 - y0));
        }
    }
    free(table);
    return 1;
}

/* Color guided filter (He, Sun & Tang 2010). `guide` is interleaved RGB in 0..1. */
static int guided_filter(const float* guide, const float* input, int width, int height, int radius, double epsilon, float* out)
{
    int n = width * height, ok = 0;
    enum { MR, MG, MB, MP, RR, RG, RB, GG, GB, BB, RP, GP, BP, AR, AG, AB, B0, TMP, PLANES };
    double* planes = ALLOC(double, (size_t)n * PLANES);
    if( !planes ) return 0;
#define PLANE(k) (planes + (size_t)(k) * n)
    double* tmp = PLANE(TMP);
#define MEAN_OF(expr, target) do { for( int p = 0; p < n; p++ ) tmp[p] = (expr); if( !box_mean(tmp, width, height, radius, PLANE(target)) ) goto done; } while( 0 )
    MEAN_OF(guide[p * 3], MR); MEAN_OF(guide[p * 3 + 1], MG); MEAN_OF(guide[p * 3 + 2], MB);
    MEAN_OF(input[p], MP);
    MEAN_OF((double)guide[p * 3] * guide[p * 3], RR); MEAN_OF((double)guide[p * 3] * guide[p * 3 + 1], RG); MEAN_OF((double)guide[p * 3] * guide[p * 3 + 2], RB);
    MEAN_OF((double)guide[p * 3 + 1] * guide[p * 3 + 1], GG); MEAN_OF((double)guide[p * 3 + 1] * guide[p * 3 + 2], GB); MEAN_OF((double)guide[p * 3 + 2] * guide[p * 3 + 2], BB);
    MEAN_OF((double)guide[p * 3] * input[p], RP); MEAN_OF((double)guide[p * 3 + 1] * input[p], GP); MEAN_OF((double)guide[p * 3 + 2] * input[p], BP);
    {
        double *mr = PLANE(MR), *mg = PLANE(MG), *mb = PLANE(MB), *mp = PLANE(MP);
        double *rr = PLANE(RR), *rg = PLANE(RG), *rb = PLANE(RB), *gg = PLANE(GG), *gb = PLANE(GB), *bb = PLANE(BB);
        double *rp = PLANE(RP), *gp = PLANE(GP), *bp = PLANE(BP), *ar = PLANE(AR), *ag = PLANE(AG), *ab = PLANE(AB), *b = PLANE(B0);
        for( int p = 0; p < n; p++ ) {
            double vrr = rr[p] - mr[p] * mr[p] + epsilon, vrg = rg[p] - mr[p] * mg[p], vrb = rb[p] - mr[p] * mb[p];
            double vgg = gg[p] - mg[p] * mg[p] + epsilon, vgb = gb[p] - mg[p] * mb[p], vbb = bb[p] - mb[p] * mb[p] + epsilon;
            double cr = rp[p] - mr[p] * mp[p], cg = gp[p] - mg[p] * mp[p], cb = bp[p] - mb[p] * mp[p];
            double i00 = vgg * vbb - vgb * vgb, i01 = vgb * vrb - vrg * vbb, i02 = vrg * vgb - vgg * vrb;
            double i11 = vrr * vbb - vrb * vrb, i12 = vrb * vrg - vrr * vgb, i22 = vrr * vgg - vrg * vrg;
            double det = vrr * i00 + vrg * i01 + vrb * i02;
            ar[p] = (i00 * cr + i01 * cg + i02 * cb) / det;
            ag[p] = (i01 * cr + i11 * cg + i12 * cb) / det;
            ab[p] = (i02 * cr + i12 * cg + i22 * cb) / det;
            b[p] = mp[p] - ar[p] * mr[p] - ag[p] * mg[p] - ab[p] * mb[p];
        }
        /* Reuse the moment planes for the means of the coefficients. */
        if( !box_mean(ar, width, height, radius, rr) || !box_mean(ag, width, height, radius, rg) ||
            !box_mean(ab, width, height, radius, rb) || !box_mean(b, width, height, radius, gg) ) goto done;
        for( int p = 0; p < n; p++ ) out[p] = (float)(rr[p] * guide[p * 3] + rg[p] * guide[p * 3 + 1] + rb[p] * guide[p * 3 + 2] + gg[p]);
    }
    ok = 1;
done:
#undef MEAN_OF
#undef PLANE
    free(planes);
    return ok;
}

/*
 * Band-limited refinement: the guided filter only decides alpha within `feather` px of the
 * segmentation boundary; elsewhere the hard label stays, preventing a broad halo.
 */
static int refine_mask(const float* guide, const float* binary, int width, int height, double feather, float* alpha)
{
    int n = width * height, radius = (int)floor(feather + 0.5);
    if( radius < 1 ) radius = 1;
    float* filtered = ALLOC(float, n);
    double *binary_d = ALLOC(double, n), *coverage = ALLOC(double, n);
    int ok = 0;
    if( !filtered || !binary_d || !coverage ) goto done;
    if( !guided_filter(guide, binary, width, height, radius, 1e-4, filtered) ) goto done;
    for( int p = 0; p < n; p++ ) binary_d[p] = binary[p];
    if( !box_mean(binary_d, width, height, radius, coverage) ) goto done;
    for( int p = 0; p < n; p++ ) {
        if( coverage[p] <= 0 || coverage[p] >= 1 ) { alpha[p] = binary[p]; continue; }
        alpha[p] = (float)clampd((filtered[p] - 0.04) / 0.92, 0, 1);
    }
    ok = 1;
done:
    free(filtered); free(binary_d); free(coverage);
    return ok;
}

typedef struct { float *data, *weight; int width, height; } Level;

static int reduce_weighted(const Level* p, Level* out)
{
    int width = (p->width + 1) / 2, height = (p->height + 1) / 2;
    static const int kernel[3] = { 1, 2, 1 };
    out->width = width; out->height = height;
    out->data = ALLOC(float, width * height * 3); out->weight = ALLOC(float, width * height);
    if( !out->data || !out->weight ) return 0;
    for( int y = 0; y < height; y++ ) for( int x = 0; x < width; x++ ) {
        double w = 0, r = 0, g = 0, b = 0, total = 0;
        for( int j = -1; j <= 1; j++ ) for( int i = -1; i <= 1; i++ ) {
            int sx = clampi(x * 2 + i, 0, p->width - 1), sy = clampi(y * 2 + j, 0, p->height - 1), k = kernel[i + 1] * kernel[j + 1];
            int s = sy * p->width + sx;
            double sw = (double)p->weight[s] * k;
            w += sw; total += k;
            r += p->data[s * 3] * sw; g += p->data[s * 3 + 1] * sw; b += p->data[s * 3 + 2] * sw;
        }
        int o = y * width + x;
        out->weight[o] = (float)(w / total);
        if( w > 0 ) { out->data[o * 3] = (float)(r / w); out->data[o * 3 + 1] = (float)(g / w); out->data[o * 3 + 2] = (float)(b / w); }
    }
    return 1;
}

/* Push–pull fill (Gortler et al. 1996): weight-1 pixels are reproduced exactly. Writes n*3 floats. */
static int push_pull(const float* color, const float* weight, int width, int height, float* result)
{
    Level levels[40];
    int count = 1, ok = 0;
    levels[0].data = (float*)color; levels[0].weight = (float*)weight; levels[0].width = width; levels[0].height = height;
    while( (levels[count - 1].width > 1 || levels[count - 1].height > 1) && count < 40 ) {
        if( !reduce_weighted(&levels[count - 1], &levels[count]) ) { count++; goto done; }
        count++;
    }
    float* filled = levels[count - 1].data;
    float* owned = NULL;
    for( int l = count - 2; l >= 0; l-- ) {
        const Level *level = &levels[l], *coarse = &levels[l + 1];
        float* out = l == 0 ? result : ALLOC(float, level->width * level->height * 3);
        if( !out ) { free(owned); goto done; }
        for( int y = 0; y < level->height; y++ ) for( int x = 0; x < level->width; x++ ) {
            double sx = x / 2.0 < coarse->width - 1 ? x / 2.0 : coarse->width - 1;
            double sy = y / 2.0 < coarse->height - 1 ? y / 2.0 : coarse->height - 1;
            int x0 = clampi((int)floor(sx), 0, coarse->width - 1), y0 = clampi((int)floor(sy), 0, coarse->height - 1);
            int x1 = x0 + 1 < coarse->width - 1 ? x0 + 1 : coarse->width - 1, y1 = y0 + 1 < coarse->height - 1 ? y0 + 1 : coarse->height - 1;
            double fx = clampd(sx - x0, 0, 1), fy = clampd(sy - y0, 0, 1);
            int p = y * level->width + x;
            double w = level->weight[p] < 1 ? level->weight[p] : 1;
            for( int ch = 0; ch < 3; ch++ ) {
                double up = (filled[(y0 * coarse->width + x0) * 3 + ch] * (1 - fx) + filled[(y0 * coarse->width + x1) * 3 + ch] * fx) * (1 - fy) +
                    (filled[(y1 * coarse->width + x0) * 3 + ch] * (1 - fx) + filled[(y1 * coarse->width + x1) * 3 + ch] * fx) * fy;
                out[p * 3 + ch] = (float)(level->data[p * 3 + ch] * w + up * (1 - w));
            }
        }
        free(owned);
        owned = l == 0 ? NULL : out;
        filled = out;
    }
    if( count == 1 ) memcpy(result, color, sizeof(float) * (size_t)width * height * 3);
    ok = 1;
done:
    for( int l = 1; l < count; l++ ) { free(levels[l].data); free(levels[l].weight); }
    return ok;
}

WASM_EXPORT(bb_push_pull)
int bb_push_pull(const float* color, const float* weight, int width, int height, float* result)
{
    return push_pull(color, weight, width, height, result);
}

/* Edge color decontamination; see banner-blending.md. Writes F−C and B−C (n*3 floats each). */
static int decontaminate(const float* color, const float* alpha, int width, int height, double strength, float* foreground_delta, float* background_delta)
{
    int n = width * height, ok = 0;
    float *bg_weight = ALLOC(float, n), *fg_weight = ALLOC(float, n), *background = ALLOC(float, n * 3), *foreground = ALLOC(float, n * 3);
    if( !bg_weight || !fg_weight || !background || !foreground ) goto done;
    for( int p = 0; p < n; p++ ) { bg_weight[p] = alpha[p] <= 0.02f ? 1 : 0; fg_weight[p] = alpha[p] >= 0.98f ? 1 : 0; }
    if( !push_pull(color, bg_weight, width, height, background) || !push_pull(color, fg_weight, width, height, foreground) ) goto done;
    memset(foreground_delta, 0, sizeof(float) * (size_t)n * 3);
    memset(background_delta, 0, sizeof(float) * (size_t)n * 3);
    for( int p = 0; p < n; p++ ) {
        double a = alpha[p];
        if( a <= 0 ) continue;
        for( int ch = 0; ch < 3; ch++ ) background_delta[p * 3 + ch] = (float)((double)background[p * 3 + ch] - color[p * 3 + ch]);
        if( a >= 1 ) continue;
        double confidence = smooth(0.02, 0.25, a);
        for( int ch = 0; ch < 3; ch++ ) {
            double c = color[p * 3 + ch], local = foreground[p * 3 + ch];
            double solved = (c - (1 - a) * background[p * 3 + ch]) / (a > 1e-3 ? a : 1e-3);
            double lo = (c < local ? c : local) - 0.04, hi = (c > local ? c : local) + 0.04;
            double bounded = clampd(solved, lo > 0 ? lo : 0, hi < 1 ? hi : 1);
            double estimate = local * (1 - confidence) + bounded * confidence;
            foreground_delta[p * 3 + ch] = (float)(strength * (estimate - c));
        }
    }
    ok = 1;
done:
    free(bg_weight); free(fg_weight); free(background); free(foreground);
    return ok;
}

WASM_EXPORT(bb_decontaminate)
int bb_decontaminate(const float* color, const float* alpha, int width, int height, double strength, float* foreground_delta, float* background_delta)
{
    return decontaminate(color, alpha, width, height, strength, foreground_delta, background_delta);
}

WASM_EXPORT(bb_refine_mask)
int bb_refine_mask(const float* guide, const float* binary, int width, int height, double feather, float* alpha)
{
    return refine_mask(guide, binary, width, height, feather, alpha);
}

WASM_EXPORT(bb_guided_filter)
int bb_guided_filter(const float* guide, const float* input, int width, int height, int radius, double epsilon, float* out)
{
    return guided_filter(guide, input, width, height, radius, epsilon, out);
}

/* ------------------------------------------------------------------- subject */

/*
 * segmentation → guided refinement → decontamination, in source-image coordinates.
 * `work_labels` (work_width×work_height, GC_* values) are the rasterised selection;
 * `full_labels` (width×height, or NULL) re-apply correction strokes after refinement.
 */
WASM_EXPORT(bb_subject)
int bb_subject(const uint8_t* rgba, int width, int height, uint8_t* work_labels, int work_width, int work_height,
    const uint8_t* full_labels, int iterations, double feather, double strength,
    float* alpha, float* foreground_delta, float* background_delta)
{
    init_linear();
    int n = width * height, work_n = work_width * work_height, ok = 0;
    double* work_rgb = ALLOC(double, work_n * 3);
    float *binary = ALLOC(float, n), *guide = ALLOC(float, n * 3), *color = ALLOC(float, n * 3);
    if( !work_rgb || !binary || !guide || !color ) goto done;

    bb_progress(0);
    /* Area-averaged downsample to the working size. */
    for( int ty = 0; ty < work_height; ty++ ) for( int tx = 0; tx < work_width; tx++ ) {
        int x0 = (int)floor((double)tx * width / work_width), x1 = (int)floor((double)(tx + 1) * width / work_width);
        int y0 = (int)floor((double)ty * height / work_height), y1 = (int)floor((double)(ty + 1) * height / work_height);
        if( x1 < x0 + 1 ) x1 = x0 + 1;
        if( y1 < y0 + 1 ) y1 = y0 + 1;
        double r = 0, g = 0, b = 0;
        for( int y = y0; y < y1; y++ ) for( int x = x0; x < x1; x++ ) { int p = (y * width + x) * 4; r += rgba[p]; g += rgba[p + 1]; b += rgba[p + 2]; }
        double count = (double)(x1 - x0) * (y1 - y0);
        int o = (ty * work_width + tx) * 3;
        work_rgb[o] = r / count; work_rgb[o + 1] = g / count; work_rgb[o + 2] = b / count;
    }
    if( !grabcut(work_rgb, work_width, work_height, work_labels, iterations) ) goto done;

    bb_progress(1);
    /* Bilinear lookup of the working segmentation at full size, thresholded at 0.5. */
    for( int y = 0; y < height; y++ ) for( int x = 0; x < width; x++ ) {
        double sx = clampd((x + 0.5) * work_width / width - 0.5, 0, work_width - 1);
        double sy = clampd((y + 0.5) * work_height / height - 0.5, 0, work_height - 1);
        int x0 = (int)floor(sx), y0 = (int)floor(sy);
        int x1 = x0 + 1 < work_width - 1 ? x0 + 1 : work_width - 1, y1 = y0 + 1 < work_height - 1 ? y0 + 1 : work_height - 1;
        double fx = sx - x0, fy = sy - y0;
#define FG(xx, yy) (is_foreground(work_labels[(yy) * work_width + (xx)]) ? 1.0 : 0.0)
        double value = (FG(x0, y0) * (1 - fx) + FG(x1, y0) * fx) * (1 - fy) + (FG(x0, y1) * (1 - fx) + FG(x1, y1) * fx) * fy;
#undef FG
        binary[y * width + x] = value >= 0.5 ? 1 : 0;
    }
    for( int p = 0; p < n; p++ ) for( int ch = 0; ch < 3; ch++ ) {
        guide[p * 3 + ch] = (float)(rgba[p * 4 + ch] / 255.0);
        color[p * 3 + ch] = LINEAR[rgba[p * 4 + ch]];
    }
    if( !refine_mask(guide, binary, width, height, feather, alpha) ) goto done;
    if( full_labels ) for( int p = 0; p < n; p++ ) {
        if( full_labels[p] == GC_FGD ) alpha[p] = 1; else if( full_labels[p] == GC_BGD ) alpha[p] = 0;
    }

    bb_progress(2);
    if( !decontaminate(color, alpha, width, height, strength, foreground_delta, background_delta) ) goto done;
    ok = 1;
done:
    free(work_rgb); free(binary); free(guide); free(color);
    return ok;
}

/* ------------------------------------------------------------- compositing */

#define SURFACE_START 0.68
#define SEAM_REACH 0.12

typedef struct { float* data; int width, height, channels; } Plane;

static double foreground_gate(double distance, double half) { return 1 - smooth(half * 0.15, half, distance); }

static int plane_reduce(const Plane* p, Plane* out)
{
    int w = p->width, h = p->height, c = p->channels, nw = (w + 1) / 2, nh = (h + 1) / 2;
    static const int kernel[5] = { 1, 4, 6, 4, 1 };
    float* temp = ALLOC(float, nw * h * c);
    out->data = ALLOC(float, nw * nh * c); out->width = nw; out->height = nh; out->channels = c;
    if( !temp || !out->data ) { free(temp); return 0; }
    for( int y = 0; y < h; y++ ) for( int x = 0; x < nw; x++ ) for( int ch = 0; ch < c; ch++ ) {
        double sum = 0;
        for( int k = -2; k <= 2; k++ ) sum += (double)p->data[(y * w + clampi(x * 2 + k, 0, w - 1)) * c + ch] * kernel[k + 2];
        temp[(y * nw + x) * c + ch] = (float)(sum / 16);
    }
    for( int y = 0; y < nh; y++ ) for( int x = 0; x < nw; x++ ) for( int ch = 0; ch < c; ch++ ) {
        double sum = 0;
        for( int k = -2; k <= 2; k++ ) sum += (double)temp[(clampi(y * 2 + k, 0, h - 1) * nw + x) * c + ch] * kernel[k + 2];
        out->data[(y * nw + x) * c + ch] = (float)(sum / 16);
    }
    free(temp);
    return 1;
}

static float* plane_expand(const Plane* p, int width, int height)
{
    int w = p->width, h = p->height, c = p->channels;
    float* out = ALLOC(float, width * height * c);
    if( !out ) return NULL;
    for( int y = 0; y < height; y++ ) for( int x = 0; x < width; x++ ) {
        double sx = x / 2.0 < w - 1 ? x / 2.0 : w - 1, sy = y / 2.0 < h - 1 ? y / 2.0 : h - 1;
        int x0 = (int)floor(sx), y0 = (int)floor(sy), x1 = x0 + 1 < w - 1 ? x0 + 1 : w - 1, y1 = y0 + 1 < h - 1 ? y0 + 1 : h - 1;
        double fx = sx - x0, fy = sy - y0;
        for( int ch = 0; ch < c; ch++ ) out[(y * width + x) * c + ch] = (float)(
            (p->data[(y0 * w + x0) * c + ch] * (1 - fx) + p->data[(y0 * w + x1) * c + ch] * fx) * (1 - fy) +
            (p->data[(y1 * w + x0) * c + ch] * (1 - fx) + p->data[(y1 * w + x1) * c + ch] * fx) * fy);
    }
    return out;
}

typedef struct { double lo, hi, half; } Bounds;
static Bounds seam_bounds(int w, double position, double width)
{
    Bounds b;
    b.half = width * w / 2;
    double hi = SURFACE_START * w - b.half;
    if( hi < b.half + 2 ) hi = b.half + 2;
    double lo = (position - SEAM_REACH) * w;
    if( lo < b.half + 2 ) lo = b.half + 2;
    if( lo > hi ) lo = hi;
    double upper = (position + SEAM_REACH) * w;
    if( upper < lo ) upper = lo;
    b.lo = lo; b.hi = upper < hi ? upper : hi;
    return b;
}

/* Transition-centre cost: crossed edge, detail density, washed detail under the band, faded protected alpha. */
static float* seam_cost(const float* source, int w, int h, double position, Bounds bounds, const float* subject_alpha, int* x0_out, int* n_out)
{
    double half = bounds.half;
    int x0 = (int)floor(bounds.lo), x1 = (int)ceil(bounds.hi), n = x1 - x0 + 1;
    int radius = (int)floor(h * 0.02 + 0.5), band = (int)ceil(half);
    if( radius < 2 ) radius = 2;
    float *luma = ALLOC(float, w * h), *edge = ALLOC(float, w * h), *detail = ALLOC(float, w * h), *cost = ALLOC(float, n * h);
    double *row_sum = ALLOC(double, w + 1), *fade = ALLOC(double, 2 * band + 1), *gate = ALLOC(double, band + 1);
    if( !luma || !edge || !detail || !cost || !row_sum || !fade || !gate ) { free(cost); cost = NULL; goto done; }
    for( int p = 0; p < w * h; p++ )
        luma[p] = (float)pow(source[p * 3] * 0.2126 + source[p * 3 + 1] * 0.7152 + source[p * 3 + 2] * 0.0722, 1 / 2.2);
    for( int y = 0; y < h; y++ ) for( int x = 0; x < w; x++ ) {
#define AT(dx, dy) ((double)luma[clampi(y + (dy), 0, h - 1) * w + clampi(x + (dx), 0, w - 1)])
        double gx = AT(1, -1) + 2 * AT(1, 0) + AT(1, 1) - AT(-1, -1) - 2 * AT(-1, 0) - AT(-1, 1);
        double gy = AT(-1, 1) + 2 * AT(0, 1) + AT(1, 1) - AT(-1, -1) - 2 * AT(0, -1) - AT(1, -1);
#undef AT
        edge[y * w + x] = (float)(sqrt(gx * gx + gy * gy) / 4);
    }
    for( int y = 0; y < h; y++ ) {
        row_sum[0] = 0;
        for( int x = 0; x < w; x++ ) {
            double s = 0;
            for( int dy = -radius; dy <= radius; dy++ ) s += edge[clampi(y + dy, 0, h - 1) * w + x];
            row_sum[x + 1] = row_sum[x] + s;
        }
        for( int x = 0; x < w; x++ ) {
            int a = x - radius < 0 ? 0 : x - radius, b = x + radius + 1 > w ? w : x + radius + 1;
            detail[y * w + x] = (float)((row_sum[b] - row_sum[a]) / ((double)(b - a) * (2 * radius + 1)));
        }
    }
    for( int k = -band; k <= band; k++ ) fade[k + band] = smooth(-half, half, k);
    for( int k = 0; k <= band; k++ ) gate[k] = 1 - foreground_gate(k + 0.5, half);
    double center = position * w;
    for( int y = 0; y < h; y++ ) for( int j = 0; j < n; j++ ) {
        int x = x0 + j, row = y * w;
        double washed = 0, faded = 0;
        for( int k = -band; k <= band; k += 2 ) { int xx = x + k; if( xx >= 0 && xx < w ) washed += detail[row + xx] * fade[k + band]; }
        if( subject_alpha ) for( int k = 0; k <= band; k++ ) { int xx = x + k; if( xx < w ) faded += subject_alpha[row + xx] * gate[k]; }
        double prior = (x - center) / (SEAM_REACH * w);
        prior *= prior;
        cost[y * n + j] = (float)(3 * (double)edge[row + x] + 4 * (double)detail[row + x] + 2 * washed / (band + 1) + 40 * faded / (band + 1) + 0.06 * prior);
    }
    *x0_out = x0; *n_out = n;
done:
    free(luma); free(edge); free(detail); free(row_sum); free(fade); free(gate);
    return cost;
}

static int find_seam(const float* source, int w, int h, double position, double width, int content_aware, const float* subject_alpha, float* result)
{
    Bounds bounds = seam_bounds(w, position, width);
    double straight = clampd(position * w, bounds.lo, bounds.hi);
    for( int y = 0; y < h; y++ ) result[y] = (float)straight;
    if( !content_aware && !subject_alpha ) return 1;
    int x0, n, ok = 0;
    float* cost = seam_cost(source, w, h, position, bounds, subject_alpha, &x0, &n);
    double *prev = ALLOC(double, n), *next = ALLOC(double, n);
    int8_t* back = ALLOC(int8_t, n * h);
    float* smoothed = ALLOC(float, h);
    if( !cost || !prev || !next || !back || !smoothed ) goto done;
    const double bend = 0.015;
    for( int j = 0; j < n; j++ ) prev[j] = cost[j];
    for( int y = 1; y < h; y++ ) {
        for( int j = 0; j < n; j++ ) {
            double best = prev[j];
            int direction = 0;
            if( j > 0 && prev[j - 1] + bend < best ) { best = prev[j - 1] + bend; direction = -1; }
            if( j + 1 < n && prev[j + 1] + bend < best ) { best = prev[j + 1] + bend; direction = 1; }
            next[j] = best + cost[y * n + j];
            back[y * n + j] = (int8_t)direction;
        }
        double* swap = prev; prev = next; next = swap;
    }
    int best = 0;
    for( int j = 1; j < n; j++ ) if( prev[j] < prev[best] ) best = j;
    for( int y = h - 1; y >= 0; y-- ) { result[y] = (float)(x0 + best); best += back[y * n + best]; }
    double sigma = h * 0.025 > 2 ? h * 0.025 : 2;
    int taps = (int)ceil(sigma * 3);
    for( int y = 0; y < h; y++ ) {
        double sum = 0, total = 0;
        for( int k = -taps; k <= taps; k++ ) { double weight = exp(-(double)(k * k) / (2 * sigma * sigma)); sum += result[clampi(y + k, 0, h - 1)] * weight; total += weight; }
        smoothed[y] = (float)clampd(sum / total, bounds.lo, bounds.hi);
    }
    memcpy(result, smoothed, sizeof(float) * (size_t)h);
    ok = 1;
done:
    free(cost); free(prev); free(next); free(back); free(smoothed);
    return ok;
}

static float* multiband(const float* source, const float* mask, int w, int h, const double surface[3])
{
    Plane images[7], masks[7];
    int levels = 1;
    float* result = NULL;
    images[0].data = (float*)source; images[0].width = w; images[0].height = h; images[0].channels = 3;
    masks[0].data = (float*)mask; masks[0].width = w; masks[0].height = h; masks[0].channels = 1;
    while( levels < 7 && images[levels - 1].height > 4 ) {
        if( !plane_reduce(&images[levels - 1], &images[levels]) ) goto done;
        if( !plane_reduce(&masks[levels - 1], &masks[levels]) ) { free(images[levels].data); goto done; }
        levels++;
    }
    int i = levels - 1;
    Plane reconstructed = images[i];
    int count = images[i].width * images[i].height * 3;
    reconstructed.data = ALLOC(float, count);
    if( !reconstructed.data ) goto done;
    for( int k = 0; k < count; k++ )
        reconstructed.data[k] = (float)(((double)images[i].data[k] - surface[k % 3]) * masks[i].data[k / 3] + surface[k % 3]);
    for( i--; i >= 0; i-- ) {
        const Plane* current = &images[i];
        float* lower = plane_expand(&images[i + 1], current->width, current->height);
        float* up = plane_expand(&reconstructed, current->width, current->height);
        free(reconstructed.data);
        reconstructed.data = up; reconstructed.width = current->width; reconstructed.height = current->height;
        if( !lower || !up ) { free(lower); free(up); reconstructed.data = NULL; goto done; }
        int size = current->width * current->height * 3;
        for( int k = 0; k < size; k++ ) up[k] = (float)(up[k] + ((double)current->data[k] - lower[k]) * masks[i].data[k / 3]);
        free(lower);
    }
    result = reconstructed.data;
done:
    for( int l = 1; l < levels; l++ ) { free(images[l].data); free(masks[l].data); }
    return result;
}

/* Screened Poisson over a seam-following domain; fixed red/black Gauss–Seidel sweeps. */
static float* poisson(const float* source, const float* initial, const float* mask, const float* distance, double half, int w, int h)
{
    int n = w * h;
    float *out = ALLOC(float, n * 3), *rhs = ALLOC(float, n * 3);
    uint8_t* inside = ALLOC(uint8_t, n);
    if( !out || !rhs || !inside ) { free(out); free(rhs); free(inside); return NULL; }
    memcpy(out, initial, sizeof(float) * (size_t)n * 3);
    const double screen = 0.06;
    for( int y = 1; y < h - 1; y++ ) for( int x = 1; x < w - 1; x++ ) {
        int p = y * w + x;
        if( distance[p] < -half * 1.3 || distance[p] > half ) continue;
        inside[p] = 1;
        int neighbours[4] = { p - 1, p + 1, p - w, p + w };
        for( int ch = 0; ch < 3; ch++ ) {
            double divergence = 0;
            for( int k = 0; k < 4; k++ ) { int q = neighbours[k]; divergence += ((double)source[p * 3 + ch] - source[q * 3 + ch]) * ((double)mask[p] + mask[q]) / 2; }
            rhs[p * 3 + ch] = (float)(divergence + screen * initial[p * 3 + ch]);
        }
    }
    for( int iteration = 0; iteration < 180; iteration++ ) for( int parity = 0; parity < 2; parity++ ) {
        for( int y = 1; y < h - 1; y++ ) for( int x = 1 + ((1 + y + parity) % 2); x < w - 1; x += 2 ) {
            int i = y * w + x;
            if( !inside[i] ) continue;
            int p = i * 3;
            for( int ch = 0; ch < 3; ch++ )
                out[p + ch] = (float)(((double)out[p - 3 + ch] + out[p + 3 + ch] + out[p - w * 3 + ch] + out[p + w * 3 + ch] + rhs[p + ch]) / (4 + screen));
        }
    }
    free(rhs); free(inside);
    return out;
}

/*
 * Blends cropped artwork (RGBA) into the surface color. With subject planes (alpha, F−C,
 * B−C, or NULL), the background is replaced by its estimate under the subject, blended,
 * and the decontaminated foreground is composited over it: out = a·F + (1 − a)·B.
 * method: 0 multiband, 1 Poisson, 2 fade. `path_out` (h floats) is optional.
 */
WASM_EXPORT(bb_blend)
int bb_blend(const uint8_t* rgba, int w, int h, int method, int content_aware, double position, double width,
    int surface_r, int surface_g, int surface_b,
    const float* subject_alpha, const float* foreground_delta, const float* background_delta,
    uint8_t* output, float* path_out)
{
    init_linear();
    int n = w * h, ok = 0;
    double surface[3] = { linear_from_srgb(surface_r), linear_from_srgb(surface_g), linear_from_srgb(surface_b) };
    float *source = ALLOC(float, n * 3), *path = ALLOC(float, h), *distance = ALLOC(float, n);
    float *background = NULL, *mask = ALLOC(float, n), *initial = ALLOC(float, n * 3), *blended = NULL;
    if( !source || !path || !distance || !mask || !initial ) goto done;
    for( int p = 0; p < n; p++ ) for( int ch = 0; ch < 3; ch++ ) source[p * 3 + ch] = LINEAR[rgba[p * 4 + ch]];
    if( !find_seam(source, w, h, position, width, content_aware, subject_alpha, path) ) goto done;
    if( path_out ) memcpy(path_out, path, sizeof(float) * (size_t)h);
    Bounds bounds = seam_bounds(w, position, width);
    double half = bounds.half, limit = SURFACE_START * w;
    for( int y = 0; y < h; y++ ) {
        double slope = ((double)path[y + 1 < h ? y + 1 : h - 1] - path[y > 0 ? y - 1 : 0]) / 2;
        double scale = 1 / sqrt(1 + slope * slope);
        for( int x = 0; x < w; x++ ) {
            double across = (x + 0.5 - path[y]) * scale, guard = x + 0.5 - limit + half;
            distance[y * w + x] = (float)(across > guard ? across : guard);
        }
    }
    background = source;
    if( subject_alpha ) {
        background = ALLOC(float, n * 3);
        if( !background ) goto done;
        for( int k = 0; k < n * 3; k++ ) background[k] = (float)((double)source[k] + background_delta[k]);
    }
    for( int p = 0; p < n; p++ ) {
        mask[p] = (float)(1 - smooth(-half, half, distance[p]));
        for( int ch = 0; ch < 3; ch++ ) initial[p * 3 + ch] = (float)((double)background[p * 3 + ch] * mask[p] + surface[ch] * (1 - (double)mask[p]));
    }
    blended = method == 0 ? multiband(background, mask, w, h, surface) : method == 1 ? poisson(background, initial, mask, distance, half, w, h) : initial;
    if( !blended ) goto done;
    for( int p = 0; p < n; p++ ) {
        double d = distance[p];
        double enter = smooth(-half * 1.3, -half, d), leave = smooth(half * 0.85, half, d);
        double a = subject_alpha ? subject_alpha[p] * foreground_gate(d, half) : 0;
        for( int ch = 0; ch < 3; ch++ ) {
            int k = p * 3 + ch;
            double foreground = subject_alpha ? (double)source[k] + foreground_delta[k] : 0;
            double composite = a * foreground + (1 - a) * blended[k];
            double value = source[k] * (1 - enter) + composite * enter;
            output[p * 4 + ch] = (uint8_t)srgb_from_linear(value * (1 - leave) + surface[ch] * leave);
        }
        output[p * 4 + 3] = 255;
    }
    ok = 1;
done:
    if( blended && blended != initial ) free(blended);
    if( background && background != source ) free(background);
    free(source); free(path); free(distance); free(mask); free(initial);
    return ok;
}
