# this file is a reference only, service is started from proc_main

sudo docker run --rm -i --name c284-webmain-1_srv_web_old --network ${NETWORK_NAME} --network-alias srv_web_old \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/srv_web_old_data,target=/home/webmain/data \
  -e PORT=25000 \
  coolguy284/c284-webmain-1_srv_web_old
