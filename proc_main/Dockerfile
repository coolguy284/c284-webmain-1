FROM ubuntu:22.04
STOPSIGNAL SIGINT

WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y

# install docker
RUN apt-get install ca-certificates curl gnupg lsb-release -y
RUN mkdir -p /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update
RUN apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# install node.js
ARG NODE_MAJOR_VER
ARG NODE_FULL_VER
RUN curl -fsSL https://deb.nodesource.com/nsolid_setup_deb.sh | bash -s $NODE_MAJOR_VER
RUN apt-get install nodejs -y
RUN npm install -g npm

COPY package-basic.json package.json
RUN npm install

COPY package.json index.js ./

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
