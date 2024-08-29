ARG branch=debug

FROM ubuntu:22.04 AS base
STOPSIGNAL SIGINT

RUN adduser webmain -u 2201
WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y && apt-get install curl git -y

# install node.js
ARG NODE_MAJOR_VER
ARG NODE_FULL_VER
RUN curl -fsSL https://deb.nodesource.com/nsolid_setup_deb.sh | bash -s $NODE_MAJOR_VER
RUN apt-get install nodejs fontconfig fonts-liberation pkg-config build-essential libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev make gcc -y
RUN npm install -g npm

USER webmain

RUN touch .env && mkdir data

# uses this CLEVER solution to invalidate cache when repo is updated (the comment):
# https://stackoverflow.com/questions/27529191/how-to-update-code-from-git-to-a-docker-container/41361409#41361409

# dockerfile if-else
# https://stackoverflow.com/questions/43654656/dockerfile-if-else-condition-with-external-arguments/60820156#60820156

FROM base AS production
  ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/node-server-new/commits?per_page=1' node-server-new_latest_commit
  RUN rm node-server-new_latest_commit
  RUN git clone --depth 1 https://github.com/coolguy284/node-server-new.git
  RUN mv node-server-new/* ./ && mv node-server-new/.[^.]* ./ && rmdir node-server-new
FROM base AS debug
  #ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/node-server-new/commits?per_page=1' node-server-new_latest_commit
  #RUN rm node-server-new_latest_commit
  RUN git clone --depth 1 https://github.com/coolguy284/node-server-new.git
  RUN mv node-server-new/* ./ && mv node-server-new/.[^.]* ./ && rmdir node-server-new
FROM ${branch} AS final

RUN npm install

RUN sed -i 's/terminal: true/terminal: false/' index.js && sed -i 's/preview: true/preview: false/' index.js

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "manager.js"]
