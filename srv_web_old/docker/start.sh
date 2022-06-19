# this file is a reference only, service is started from proc_main

sudo docker run --rm -t --name c284-webmain-1_srv_web_old --network ${NETWORK_NAME} --network-alias srv_web_old \
  c284-webmain-1_srv_web_old
