FROM ubuntu:20.10

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl -y

RUN curl -fsSL https://deb.nodesource.com/setup_15.x | bash -
RUN apt-get install nodejs -y

RUN curl https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
RUN apt-get update
RUN apt-get install mongodb-org -y

RUN npm install -g npm

RUN adduser webmain -u 2201
USER webmain
WORKDIR /home/webmain

RUN mkdir cert
RUN mkdir logs-mongodb
RUN mkdir mongodb

COPY --chown=webmain:webmain package.json /home/webmain/package.json
RUN npm install

RUN mkdir nodesrv_main

ADD --chown=webmain:webmain https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt /home/webmain/nodesrv_main/websites/public/data/

COPY --chown=webmain:webmain nodesrv_main/package-basic.json /home/webmain/nodesrv_main/package.json
RUN (cd nodesrv_main; npm install)

COPY --chown=webmain:webmain index.js /home/webmain/index.js

COPY --chown=webmain:webmain nodesrv_main/logutils.js /home/webmain/nodesrv_main/logutils.js
COPY --chown=webmain:webmain nodesrv_main/helpers /home/webmain/nodesrv_main/helpers
COPY --chown=webmain:webmain nodesrv_main/websites/website_data.txt /home/webmain/nodesrv_main/websites/website_data.txt
COPY --chown=webmain:webmain nodesrv_main/index.js /home/webmain/nodesrv_main/index.js
COPY --chown=webmain:webmain nodesrv_main/common /home/webmain/nodesrv_main/common
COPY --chown=webmain:webmain nodesrv_main/requests /home/webmain/nodesrv_main/requests
COPY --chown=webmain:webmain nodesrv_main/websites /home/webmain/nodesrv_main/websites
COPY --chown=webmain:webmain nodesrv_main/package.json /home/webmain/nodesrv_main/package.json
RUN (cd nodesrv_main; node helpers/put_version_in_index.js && node helpers/create_sitemap.js && node helpers/compress_and_etags.js)

CMD ["node", "index.js"]
