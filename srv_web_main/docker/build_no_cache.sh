cd "${0%/*}/.."

sudo docker build $(../docker/get_build_args.sh) --build-arg branch=production --target production --no-cache -t coolguy284/c284-webmain-1_srv_web_main -f Dockerfile ..
