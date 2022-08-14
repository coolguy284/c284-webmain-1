# this file is a reference only, service is started from proc_main

sudo docker run --rm -i --name c284-webmain-1_srv_web_main --network ${NETWORK_NAME} --network-alias srv_web_main \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/cert,target=/home/webmain/cert,readonly \
  --mount type=bind,source=/home/webmain/c284-webmain-1/srv_web_main/websites,target=/home/webmain/websites,readonly \
  --env-file /home/webmain/c284-webmain-1_s/env.list \
  -p 80:8080 -p 443:8443 \
  coolguy284/c284-webmain-1_srv_web_main
