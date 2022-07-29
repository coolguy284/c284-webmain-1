FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN adduser webmain -u 2201
WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y

# install mongodb
RUN apt-get install curl gnupg -y
# next line is hotfix to enable mongodb to install, will be removed once mongodb officially supports 22.04
RUN (echo "deb http://security.ubuntu.com/ubuntu focal-security main" | tee /etc/apt/sources.list.d/focal-security.list; apt-get update; apt-get install libssl1.1)
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
RUN apt-get update
RUN apt-get install mongodb-org -y
# next line is hotfix to enable mongodb to install, will be removed once mongodb officially supports 22.04
RUN rm /etc/apt/sources.list.d/focal-security.list

# install node.js
ARG NODE_VERSION
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install nodejs -y
RUN npm install -g npm

USER webmain

RUN mkdir mongodb

COPY --chown=webmain:webmain index.js index.js

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
