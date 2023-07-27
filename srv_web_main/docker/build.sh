cd "${0%/*}/.."

sudo docker build --build-arg NODE_VERSION=20.5.0 -t coolguy284/c284-webmain-1_srv_web_main -f Dockerfile ..
