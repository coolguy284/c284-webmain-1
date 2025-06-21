FROM ubuntu:24.04
STOPSIGNAL SIGINT

RUN useradd webmain -u 2201 -m
WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y && apt-get install curl git -y

# install node.js
ARG NODE_MAJOR_VER
ARG NODE_FULL_VER
RUN curl -fsSL https://deb.nodesource.com/nsolid_setup_deb.sh | bash -s $NODE_MAJOR_VER
RUN apt-get install nodejs fontconfig fonts-liberation pkg-config build-essential libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev make gcc -y
RUN npm install -g npm

# install mongodb
# https://stackoverflow.com/questions/25019183/docker-java7-install-fail/25020555#25020555
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get install curl gnupg -y
# next line is hotfix to enable mongodb to install, will be removed once mongodb officially supports 24.04
RUN (echo "deb http://security.ubuntu.com/ubuntu focal-security main" | tee /etc/apt/sources.list.d/focal-security.list; apt-get update; apt-get install libssl1.1)
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
RUN apt-get update
RUN apt-get install mongodb-org -y
# next line is hotfix to enable mongodb to install, will be removed once mongodb officially supports 24.04
RUN rm /etc/apt/sources.list.d/focal-security.list

USER webmain

RUN mkdir mongodb

COPY --chown=webmain:webmain index.js index.js

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
