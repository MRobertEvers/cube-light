# Vendored: SQLite

- Version: 3.54.0 (`SQLITE_SOURCE_ID` "2026-10-09 15:46:58 be8d059e9a49089ab2dce5ed26dd87aaf598fdc5fbe0b107c0dd758464bcd5e3")
- Source: https://www.sqlite.org/2026/sqlite-amalgamation-3540000.zip (listed on https://www.sqlite.org/download.html)
- Zip SHA3-256: `7b670a62fdfbd672b75fef004cb703c8a3e87d3a5cc7d675b4a08337004a2d93` (matches the download page)
- Zip SHA-256: `68e913b0fe8ec6b4e5f391c594a28872884e80d6cd042a1e50c957be46b5aa4d`
- Files kept: `sqlite3.c`, `sqlite3.h` (the amalgamation), unmodified. Vendored 2026-10-13.
- License: public domain (https://www.sqlite.org/copyright.html).

Used by the server (server/store.c). Build `sqlite3.c` without warnings (`-w`) and with
`-DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1`
(the server is single threaded). Re-vendor by replacing both files from a newer amalgamation zip
and updating this file. Never patch in place.
