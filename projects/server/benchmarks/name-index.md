# Name lookup benchmark

Measured on darwin/arm64, Node v24.5.0. 306 distinct queries from the 35,282-name SQLite corpus; 6,120 timed lookups per implementation after warmup. Both runs used separate processes with `--expose-gc`. The JSON baseline is generated only for this benchmark.

## Artifact size

| Artifact | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| JSON | 2,399,245 | 346,019 |
| Index | 768,201 | 290,883 |
| Wasm | 8,306 | 3,765 |
| Index + Wasm | 776,507 | 294,648 |

## Runtime

| Implementation | Init ms | RSS delta MiB | JS heap delta MiB | External delta MiB | Wasm linear memory MiB | Mean query µs | P50 µs | P95 µs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| json | 59.29 | 22.95 | 20.38 | 0.00 | 0.00 | 20.83 | 21.58 | 37.17 |
| wasm | 3.73 | 3.55 | 0.04 | 2.74 | 2.00 | 12.82 | 12.33 | 19.79 |

Result mismatches: 0 of 306.
Prefix verification mismatches: 0 of 40270. This covers the first five characters of every name, lowercase variants, and omitted punctuation.

The native node-gyp addon builds the index from SQLite. WebAssembly runs lookups in the browser. Initialization includes reading and parsing the generated JSON baseline or instantiating WebAssembly and loading the binary index. Memory deltas are process measurements and can vary with GC and the host allocator.
