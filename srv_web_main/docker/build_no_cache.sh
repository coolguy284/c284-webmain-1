cd "${0%/*}/.."

sudo docker build --no-cache -t c284-webmain-1_srv_web_main -f Dockerfile ..
