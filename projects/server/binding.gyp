{
  "targets": [
    {
      "target_name": "name_index",
      "sources": ["native/addon.c", "native/name_index.c"],
      "cflags": ["-std=c11", "-O3"],
      "xcode_settings": {"OTHER_CFLAGS": ["-std=c11", "-O3"]}
    }
  ]
}
