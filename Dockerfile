FROM ubuntu:22.04

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl -y

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install nodejs -y

# hotfix to enable mongodb to install, will be removed once mongodb officially supports 22.04
RUN (echo "deb http://security.ubuntu.com/ubuntu impish-security main" | tee /etc/apt/sources.list.d/impish-security.list; apt-get update; apt-get install libssl1.1)

RUN curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
RUN apt-get update
RUN apt-get install mongodb-org -y

RUN npm install -g npm

RUN adduser webmain -u 2201
USER webmain
WORKDIR /home/webmain

RUN mkdir cert logs_mongodb mongodb

COPY --chown=webmain:webmain package.json package.json
RUN npm install

RUN mkdir nodesrv_main

ADD --chown=webmain:webmain https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt nodesrv_main/websites/public/data/

COPY --chown=webmain:webmain nodesrv_main/common/recursivereaddir.js nodesrv_main/common/recursivereaddir.js
COPY --chown=webmain:webmain nodesrv_main/common/websitedataparse.js nodesrv_main/common/websitedataparse.js
COPY --chown=webmain:webmain nodesrv_main/websites/website_data.txt nodesrv_main/websites/website_data.txt
COPY --chown=webmain:webmain nodesrv_main/helpers nodesrv_main/helpers

RUN (cd nodesrv_main; node helpers/compress_and_etags.js --only '^data/UnicodeData\.txt(?:\.gz|\.br)?$')

COPY --chown=webmain:webmain nodesrv_main/logutils.js nodesrv_main/logutils.js

COPY --chown=webmain:webmain nodesrv_main/package-basic.json nodesrv_main/package.json
RUN (cd nodesrv_main; npm install)

RUN mkdir -p nodesrv_main/websites/public/libs/extern
RUN sed '7a\\tvar global = commonjsGlobal;' nodesrv_main/node_modules/bson/dist/bson.browser.umd.js > nodesrv_main/websites/public/libs/extern/bson.browser.umd.js
RUN cp nodesrv_main/node_modules/bson/dist/bson.browser.umd.js.map nodesrv_main/websites/public/libs/extern/bson.browser.umd.js.map

COPY --chown=webmain:webmain nodesrv_main/websites/public/libs nodesrv_main/websites/public/libs
RUN (cd nodesrv_main; node helpers/compress_and_etags.js --only '^libs/.*$')

COPY --chown=webmain:webmain index.js index.js

COPY --chown=webmain:webmain .dockerenv .dockerenv
COPY --chown=webmain:webmain nodesrv_main/index.js nodesrv_main/index.js
COPY --chown=webmain:webmain nodesrv_main/common nodesrv_main/common
COPY --chown=webmain:webmain nodesrv_main/requests nodesrv_main/requests
COPY --chown=webmain:webmain nodesrv_main/websites nodesrv_main/websites
COPY --chown=webmain:webmain nodesrv_main/package.json nodesrv_main/package.json
RUN (cd nodesrv_main; node helpers/put_version_in_index.js && node helpers/set_contact_info.js && node helpers/create_sitemap.js && node helpers/compress_and_etags.js --except '^data/UnicodeData\.txt(?:\.gz|\.br)?$' '^libs/.*$')

CMD ["node", "index.js"]
