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

RUN mkdir srv_web_main

ADD --chown=webmain:webmain https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt srv_web_main/websites/public/data/

COPY --chown=webmain:webmain srv_web_main/common/recursive_readdir.js srv_web_main/common/recursive_readdir.js
COPY --chown=webmain:webmain srv_web_main/common/website_data_parse.js srv_web_main/common/website_data_parse.js
COPY --chown=webmain:webmain srv_web_main/websites/website_data.txt srv_web_main/websites/website_data.txt
COPY --chown=webmain:webmain srv_web_main/helpers srv_web_main/helpers

RUN (cd srv_web_main; node helpers/compress_and_etags.js --only '^data/UnicodeData\.txt(?:\.gz|\.br)?$')

COPY --chown=webmain:webmain srv_web_main/log_utils.js srv_web_main/log_utils.js

COPY --chown=webmain:webmain srv_web_main/package-basic.json srv_web_main/package.json
RUN (cd srv_web_main; npm install)

RUN (cd srv_web_main; mkdir -p websites/public/libs/extern && cp node_modules/bson/dist/bson.browser.umd.js websites/public/libs/extern/bson.browser.umd.js && cp node_modules/bson/dist/bson.browser.umd.js.map websites/public/libs/extern/bson.browser.umd.js.map)

COPY --chown=webmain:webmain srv_web_main/websites/public/libs srv_web_main/websites/public/libs
RUN (cd srv_web_main; node helpers/compress_and_etags.js --only '^libs/.*$')

COPY --chown=webmain:webmain index.js index.js

COPY --chown=webmain:webmain .dockerenv .dockerenv

COPY --chown=webmain:webmain srv_web_main/package.json srv_web_main/package.json

COPY --chown=webmain:webmain srv_web_main/index.js srv_web_main/index.js
COPY --chown=webmain:webmain srv_web_main/common srv_web_main/common
COPY --chown=webmain:webmain srv_web_main/requests srv_web_main/requests
COPY --chown=webmain:webmain srv_web_main/websites srv_web_main/websites

RUN (cd srv_web_main; node helpers/put_version_in_index.js && node helpers/set_contact_info.js && node helpers/create_sitemap.js && node helpers/compress_and_etags.js --except '^data/UnicodeData\.txt(?:\.gz|\.br)?$' '^libs/.*$')

CMD ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
