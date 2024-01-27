cd "${0%/*}/.."

sudo docker build --build-arg NODE_VERSION=21.4.0 -t coolguy284/c284-webmain-1_srv_web_old -f Dockerfile.debug .
