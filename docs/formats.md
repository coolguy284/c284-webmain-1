```
format for nodesrv_main/website_data.txt:
  # repeated paths' numbers are added together, "/*" at end of path to include entire folder, "*.ext" to include all files with extension
  <path> : int (flags) (
      bits:
        1 - immutable
        2 - compressable
    ),
  "#" : comment,
```
