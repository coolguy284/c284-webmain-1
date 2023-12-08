FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN adduser webmain -u 2201
WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl git gcc make -y

RUN (mkdir nginx &&\
  cd nginx &&\
  #curl -sS https://nginx.org/keys/mdounin.key | gpg --import &&\
  curl -sSL https://zlib.net/zlib-1.3.tar.gz | tar -xzf - &&\
  curl -sSL https://nginx.org/download/nginx-1.25.3.tar.gz | tar -xzf - &&\
  #gpg --trusted-key 0x520A9993A1C052F8 --verify nginx-1.25.3.tar.gz{.asc,} &&\
  cd nginx-1.25.3 &&\
  ./configure --without-http_rewrite_module --with-zlib=../zlib-1.3 &&\
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
