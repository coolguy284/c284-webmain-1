FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl git -y

# install node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install nodejs -y
RUN npm install -g npm

RUN adduser webmain -u 2201
USER webmain
WORKDIR /home/webmain

RUN git clone https://github.com/coolguy284/node-server.git
RUN mv node-server/* ./ && mv node-server/.[^.]* ./
RUN rmdir node-server

RUN npm install

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
