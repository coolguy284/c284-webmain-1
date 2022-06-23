# this file is a reference only, service is started from proc_main

sudo docker run --rm -i --name c284-webmain-1_srv_web_old2 --network ${NETWORK_NAME} --network-alias srv_web_old2 \
  -e HTTP=true -e HTTPS=false -e PORT=25000 \
  c284-webmain-1_srv_web_old2
