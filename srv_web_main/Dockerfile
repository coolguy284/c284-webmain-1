FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN adduser webmain -u 2201
WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl git -y

# install node.js
ARG NODE_VERSION
RUN curl -fsSL https://deb.nodesource.com/nsolid_setup_deb.sh | bash -s 21
RUN apt-get install nodejs -y
RUN npm install -g npm

USER webmain

RUN mkdir cert

ADD --chown=webmain:webmain https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt websites/public/data/

COPY --chown=webmain:webmain srv_web_main/common/recursive_readdir.js common/recursive_readdir.js
COPY --chown=webmain:webmain srv_web_main/common/website_data_parse.js common/website_data_parse.js
COPY --chown=webmain:webmain srv_web_main/websites/website_data.txt websites/website_data.txt
COPY --chown=webmain:webmain srv_web_main/helpers/compress_and_etags.js helpers/compress_and_etags.js

RUN node helpers/compress_and_etags.js --only '^data/UnicodeData\.txt(?:\.br|\.gz)?$'

COPY --chown=webmain:webmain srv_web_main/log_utils.js log_utils.js

COPY --chown=webmain:webmain srv_web_main/package-basic.json package.json
RUN npm install

RUN mkdir -p websites/public/libs/extern && cp node_modules/bson/lib/bson.bundle.js websites/public/libs/extern/bson.bundle.js && cp node_modules/bson/lib/bson.bundle.js.map websites/public/libs/extern/bson.bundle.js.map

COPY --chown=webmain:webmain srv_web_main/websites/public/libs websites/public/libs
RUN node helpers/compress_and_etags.js --only '^libs/.*$'

COPY --chown=webmain:webmain srv_web_main/dockerenv.list dockerenv.list

COPY --chown=webmain:webmain .git .git

COPY --chown=webmain:webmain srv_web_main/package.json package.json

COPY --chown=webmain:webmain srv_web_main/helpers helpers
COPY --chown=webmain:webmain srv_web_main/index.js index.js
COPY --chown=webmain:webmain srv_web_main/common common
COPY --chown=webmain:webmain srv_web_main/requests requests
COPY --chown=webmain:webmain srv_web_main/websites websites

COPY --chown=webmain:webmain srv_web_main/websites/redirects.txt srv_web_main/websites/website_data.txt websites/public/misc/debug/config/

RUN ln -s . srv_web_main && node helpers/main.js && rm srv_web_main

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
