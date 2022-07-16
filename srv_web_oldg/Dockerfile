FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN apt-get update && apt-get upgrade -y

RUN apt-get install git nginx -y

RUN adduser webmain -u 2201
WORKDIR /home/webmain

#COPY nginx-install-helper.sh .
#RUN chmod +x nginx-install-helper.sh && ./nginx-install-helper.sh
#RUN rm nginx-install-helper.sh

#RUN chown webmain -R /etc/nginx /usr/share/nginx /usr/lib/nginx

#USER webmain

RUN mkdir data

COPY etc_nginx/nginx.conf /etc/nginx/nginx.conf
COPY etc_nginx/sites-available/default /etc/nginx/sites-available/default

# uses this CLEVER solution to invalidate cache when repo is updated (the comment):
# https://stackoverflow.com/questions/27529191/how-to-update-code-from-git-to-a-docker-container/41361409#41361409
ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/coolguy284.github.io/commits?per_page=1' coolguy284.github.io_latest_commit
RUN rm coolguy284.github.io_latest_commit
RUN git clone --depth 1 https://github.com/coolguy284/coolguy284.github.io.git
RUN mv coolguy284.github.io site

#USER root

#ENTRYPOINT ["bash"]
ENTRYPOINT ["nginx", "-g", "daemon off;"]
