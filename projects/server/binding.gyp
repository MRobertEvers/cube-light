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
    }
  ]
}
