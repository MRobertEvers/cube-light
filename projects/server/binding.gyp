{
  "targets": [
    {
      "target_name": "name_index",
      "sources": ["native/addon.c", "native/name_index.c"],
      "cflags": ["-std=c11", "-O3"],
      "xcode_settings": {"OTHER_CFLAGS": ["-std=c11", "-O3"]}
    },
    {
      "target_name": "kv_store",
      "sources": ["native/kv_addon.c", "native/kv_store.c"],
      "cflags": ["-std=c11", "-O3", "-Wall", "-Wextra", "-Wno-unused-parameter"],
      "xcode_settings": {"OTHER_CFLAGS": ["-std=c11", "-O3", "-Wall", "-Wextra", "-Wno-unused-parameter"]}
    },
    {
      "target_name": "image_sample",
      "sources": ["native/image_sample.c"],
      "cflags": ["-std=c11", "-O3"],
      "xcode_settings": {"OTHER_CFLAGS": ["-std=c11", "-O3"]}
    },
    {
      "target_name": "artcache",
      "sources": ["native/artcache_addon.c", "../../3rd/artcache/artcache.c", "../../3rd/sqlite/sqlite3.c"],
      "defines": ["SQLITE_OMIT_LOAD_EXTENSION", "SQLITE_DEFAULT_WAL_SYNCHRONOUS=1", "SQLITE_DQS=0"],
      "cflags": ["-std=c11", "-O2"],
      "xcode_settings": {"OTHER_CFLAGS": ["-std=c11", "-O2"]}
    }
  ]
}
