cd "${0%/*}/.."

sudo docker build --build-arg NODE_VERSION=19.3.0 --no-cache -t coolguy284/c284-webmain-1_srv_web_main -f Dockerfile ..
