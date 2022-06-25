# Introduction

This is the code for the c284-webmain-1 website, accessible at https://coolguy284.com.

# File Layout

The website is split into 2 parts, the code part on the github repo, and information such as logs and the mongodb database which is stored off of the github repository.

the files are laid out as follows for linux:
```
/home/webmain/c284-webmain-1   . github repository
/home/webmain/c284-webmain-1_s/
  cert .   .   .   .   .   .   . certificates for srv_web_main
  logs .   .   .   .   .   .   . main log files
  logs_mongodb .   .   .   .   . mongodb log files
  mongodb  .   .   .   .   .   . mongodb database
  srv_web_old_data .   .   .   . srv_web_old mounted data dir
  env.list .   .   .   .   .   . environment variable file
```

the files are laid out as follows for windows:
```
D:/Data/c284-webmain-1 . github repository
D:/Data/c284-webmain-1_s/
  cert .   .   .   .   . certificates for srv_web_main
  logs .   .   .   .   . main log files
  logs_mongodb .   .   . mongodb log files
  mongodb  .   .   .   . mongodb database
  srv_web_old_data .   . srv_web_old mounted data dir
  env.list .   .   .   . environment variable file
```

# Environment Variables

The in-env.list file in the repo directly corresponds to the env.list file out of the repo, and things in angle brackets are substitutions. Same for the srv_web_main/in-dockerenv.list and srv_web_main/dockerenv.list files.
