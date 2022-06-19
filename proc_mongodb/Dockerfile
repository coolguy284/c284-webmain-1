FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN apt-get update && apt-get upgrade -y

# install mongodb
RUN apt-get install curl gnupg -y
# net line is hotfix to enable mongodb to install, will be removed once mongodb officially supports 22.04
RUN (echo "deb http://security.ubuntu.com/ubuntu impish-security main" | tee /etc/apt/sources.list.d/impish-security.list; apt-get update; apt-get install libssl1.1)
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
RUN apt-get update
RUN apt-get install mongodb-org -y

RUN adduser webmain -u 2201
USER webmain
WORKDIR /home/webmain

RUN mkdir mongodb

CMD ["mongod", "--dbpath", "mongodb", "--bind_ip", "0.0.0.0", "--replSet", "c284wm1_1"]
