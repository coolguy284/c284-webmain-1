FROM ubuntu:22.04
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

RUN apt-get install gcc make -y

ARG NGINX_VER
ARG ZLIB_VER
RUN (mkdir nginx &&\
  cd nginx &&\
  #curl -sS https://nginx.org/keys/mdounin.key | gpg --import &&\
  curl -sSL https://zlib.net/zlib-$ZLIB_VER.tar.gz | tar -xzf - &&\
  curl -sSL https://nginx.org/download/nginx-$NGINX_VER.tar.gz | tar -xzf - &&\
  #gpg --trusted-key 0x520A9993A1C052F8 --verify nginx-$NGINX_VER.tar.gz{.asc,} &&\
  cd nginx-$NGINX_VER &&\
  ./configure --without-http_rewrite_module --with-zlib=../zlib-$ZLIB_VER &&\
  make &&\
  make install &&\
  cd ../.. &&\
  rm -r nginx)

RUN chown webmain:webmain -R /usr/local/nginx

USER webmain

RUN mkdir run data

COPY --chown=webmain:webmain usr_local_nginx_conf/nginx.conf /usr/local/nginx/conf/nginx.conf

# uses this CLEVER solution to invalidate cache when repo is updated (the comment):
# https://stackoverflow.com/questions/27529191/how-to-update-code-from-git-to-a-docker-container/41361409#41361409
ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/coolguy284.github.io/commits?per_page=1' coolguy284.github.io_latest_commit
RUN rm coolguy284.github.io_latest_commit
RUN git clone --depth 1 https://github.com/coolguy284/coolguy284.github.io.git
RUN mv coolguy284.github.io site

ENTRYPOINT ["/usr/local/nginx/sbin/nginx", "-g", "daemon off;"]
