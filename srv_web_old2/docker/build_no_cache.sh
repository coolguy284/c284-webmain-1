cd "${0%/*}/.."

sudo docker build $(../docker/get_build_args.sh) --build-arg branch=production --no-cache -t coolguy284/c284-webmain-1_srv_web_old2 .
