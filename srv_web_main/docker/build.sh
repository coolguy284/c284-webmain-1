cd "${0%/*}/.."

sudo docker build --build-arg NODE_VERSION=18.7.0 -t c284-webmain-1_srv_web_main -f Dockerfile ..
