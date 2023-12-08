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

# uses this CLEVER solution to invalidate cache when repo is updated (the comment):
# https://stackoverflow.com/questions/27529191/how-to-update-code-from-git-to-a-docker-container/41361409#41361409
ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/node-server/commits?per_page=1' node-server_latest_commit
RUN rm node-server_latest_commit
RUN git clone --depth 1 https://github.com/coolguy284/node-server.git
RUN mv node-server/* ./ && mv node-server/.[^.]* ./ && rmdir node-server

RUN npm install

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
