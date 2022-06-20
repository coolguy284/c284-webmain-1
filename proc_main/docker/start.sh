cd "${0%/*}/.."

mkdir -p ../../c284-webmain-1_s/cert
mkdir -p ../../c284-webmain-1_s/logs
mkdir -p ../../c284-webmain-1_s/logs_mongodb
mkdir -p ../../c284-webmain-1_s/mongodb
if [ ! -f "../../c284-webmain-1_s/env.list" ]; then touch ../../c284-webmain-1_s/env.list; fi

NETWORK_NAME=c284-webmain-1_net
if [ -z $(sudo docker network ls --filter name=^${NETWORK_NAME}$ --format="{{ .Name }}") ]; then 
  sudo docker network create ${NETWORK_NAME}; 
fi

sudo docker run --rm -it --name c284-webmain-1_proc_main --network ${NETWORK_NAME} --network-alias proc_main \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/cert,target=/home/webmain/c284-webmain-1_s/cert,readonly \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/logs_mongodb,target=/home/webmain/c284-webmain-1_s/logs_mongodb \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/mongodb,target=/home/webmain/c284-webmain-1_s/mongodb \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/env.list,target=/home/webmain/c284-webmain-1_s/env.list,readonly \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  c284-webmain-1_proc_main ${NETWORK_NAME} $1 | tee "../../c284-webmain-1_s/logs/$(date -u +'%Y_%m_%d %H_%M_%S %a %b %d %I_%M_%S %p %Z').log"
