# Introduction

This is the code for the c284-webmain-1 server.

# File Layout

The code is split into 2 parts, the code part on the github repo, and information such as logs and the mongodb database which is stored off of the github repository.

the files are laid out as follows for linux:
```
/home/webmain/c284-webmain-1   . the github repository
/home/webmain/c284-webmain-1_s
|-cert .   .   .   .   .   .   . the certificates for nodesrv_main
|-logs .   .   .   .   .   .   . the logfiles
|-logs_mongodb .   .   .   .   . mongodb logfiles
|-mongodb  .   .   .   .   .   . the mongodb database
|-.env .   .   .   .   .   .   . the environment variable file
```

the files are laid out as follows for windows:
```
D:/Data/c284-webmain-1 . the github repository
D:/Data/c284-webmain-1_s
|-cert .   .   .   .   . the certificates for nodesrv_main
|-logs .   .   .   .   . the logfiles
|-logs_mongodb .   .   . mongodb logfiles
|-mongodb  .   .   .   . the mongodb database
|-.env .   .   .   .   . the environment variable file
```

# Environment Variables

The .in-env file in the repo directly corresponds to the .env file out of the repo, and things in angle brackets are substitutions (currently there are none).
