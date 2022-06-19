```
format for srv_web_main/websites/website_data.txt:
  # repeated paths' numbers are added together, "/*" at end of path to include entire folder, "*.ext" to include all files with extension
  <path> : int (flags) (
      bits:
        1 - immutable
        2 - compressable
    ),
  "#" : comment,
```

```
format for srv_web_main/websites/redirects.txt:
  # put <from> and/or <to> in quotes to escape special characters in pathnames
  <type> <from> <to> : string (
    type : 3 char string (
      type[0]: F - file, D - folder, R - regex
      type[1]: T - temporary, P - permanent
      type[2]: S - same method, G - get request, "-" - doesn't matter
      Note: all 6 combinations of type[1], type[2] exist except PG.
    ),
    from : string (path to trigger redirect),
    to : string (path to redirect to),
  ),
  "#" : comment,
```
