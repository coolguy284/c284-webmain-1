# this file is a reference only, service is started from proc_main

sudo docker run --rm -t --name c284-webmain-1_proc_mongodb --network ${NETWORK_NAME} --network-alias proc_mongodb \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/mongodb,target=/home/webmain/mongodb \
  c284-webmain-1_proc_mongodb
