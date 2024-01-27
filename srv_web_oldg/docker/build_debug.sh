cd "${0%/*}/.."

sudo docker build -t coolguy284/c284-webmain-1_srv_web_oldg -f Dockerfile.debug .
