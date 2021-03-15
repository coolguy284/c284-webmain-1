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

RUN adduser webmain -u 1002
USER webmain
WORKDIR /home/webmain

RUN mkdir cert
RUN mkdir logs-mongodb
RUN mkdir mongodb

COPY package.json /home/webmain/package.json
RUN npm install

RUN mkdir nodesrv_main

COPY nodesrv_main/package.json /home/webmain/nodesrv_main/package.json
RUN (cd nodesrv_main; npm install)

COPY index.js /home/webmain/index.js

COPY nodesrv_main/logutils.js /home/webmain/nodesrv_main/logutils.js
COPY nodesrv_main/index.js /home/webmain/nodesrv_main/index.js
COPY nodesrv_main/common /home/webmain/nodesrv_main/common
COPY nodesrv_main/requests /home/webmain/nodesrv_main/requests
COPY nodesrv_main/websites /home/webmain/nodesrv_main/websites

CMD ["node", "index.js"]
