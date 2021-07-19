```
format for nodesrv_main/websites/website_data.txt:
  # repeated paths' numbers are added together, "/*" at end of path to include entire folder, "*.ext" to include all files with extension
  <path> : int (flags) (
      bits:
        1 - immutable
        2 - compressable
    ),
  "#" : comment,
```

```
format for nodesrv_main/websites/redirects.txt:
  # put <from> and/or <to> in quotes to escape special characters in pathnames
  <type> <from> <to> : string (
    type : 2 char string (
      type[0]: T - temporary, P - permanent
      type[1]: S - same method, G - get request, "-" - doesn't matter
      Note: all 6 combinations exist except PG.
    ),
    from : string (path to trigger redirect),
    to : string (path to redirect to),
  ),
  "#" : comment,
```

```
format for id:
  aaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
  bbbbbbbbccccccccddddddddddddddddeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
  a - u8 version (1 for now)
  b - u64be unix millisecond timestamp
  c - u8 bit server id (always 1 for now)
  d - u16be entity id (incremented)
  e - u32be random number
```
