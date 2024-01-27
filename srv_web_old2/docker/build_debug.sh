cd "${0%/*}/.."

sudo docker build --build-arg NODE_VERSION=21.6.1 -t coolguy284/c284-webmain-1_srv_web_old2 -f Dockerfile.debug .
