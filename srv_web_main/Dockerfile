FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl -y

# install node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install nodejs -y
RUN npm install -g npm

RUN adduser webmain -u 2201
USER webmain
WORKDIR /home/webmain

RUN mkdir cert

ADD --chown=webmain:webmain https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt websites/public/data/

COPY --chown=webmain:webmain common/recursive_readdir.js common/recursive_readdir.js
COPY --chown=webmain:webmain common/website_data_parse.js common/website_data_parse.js
COPY --chown=webmain:webmain websites/website_data.txt websites/website_data.txt
COPY --chown=webmain:webmain helpers/compress_and_etags.js helpers/compress_and_etags.js

RUN node helpers/compress_and_etags.js --only '^data/UnicodeData\.txt(?:\.gz|\.br)?$'

COPY --chown=webmain:webmain log_utils.js log_utils.js

COPY --chown=webmain:webmain package-basic.json package.json
RUN npm install

RUN mkdir -p websites/public/libs/extern && cp node_modules/bson/dist/bson.browser.umd.js websites/public/libs/extern/bson.browser.umd.js && cp node_modules/bson/dist/bson.browser.umd.js.map websites/public/libs/extern/bson.browser.umd.js.map

COPY --chown=webmain:webmain websites/public/libs websites/public/libs
RUN node helpers/compress_and_etags.js --only '^libs/.*$'

COPY --chown=webmain:webmain helpers helpers

COPY --chown=webmain:webmain dockerenv.list dockerenv.list

COPY --chown=webmain:webmain package.json package.json

COPY --chown=webmain:webmain index.js index.js
COPY --chown=webmain:webmain common common
COPY --chown=webmain:webmain requests requests
COPY --chown=webmain:webmain websites websites

RUN node helpers/put_version_in_index.js && node helpers/set_contact_info.js && node helpers/create_sitemap.js && node helpers/compress_and_etags.js --except '^data/UnicodeData\.txt(?:\.gz|\.br)?$' '^libs/.*$'

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
