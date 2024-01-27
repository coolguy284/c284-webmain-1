cd "${0%/*}/.."

sudo docker build $(../docker/get_build_args.sh) --no-cache -t coolguy284/c284-webmain-1_srv_web_old .
