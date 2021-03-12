cd /home/webmain/c284-webmain-1

mkdir -p ../c284-webmain-1_s/cert
mkdir -p ../c284-webmain-1_s/logs_mongodb
mkdir -p ../c284-webmain-1_s/mongodb
if [ ! -f "../c284-webmain-1_s/.env" ]; then touch ../c284-webmain-1_s/.env; fi

sudo docker run -it --name c284-webmain-1 \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/cert,target=/home/webmain/cert \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/logs_mongodb,target=/home/webmain/logs_mongodb \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/mongodb,target=/home/webmain/mongodb \
  --mount type=bind,source=/home/webmain/c284-webmain-1_s/.env,target=/home/webmain/.env \
  -p 8080:8080 -p 8443:8443 \
  c284-webmain-1 | tee "../c284-webmain-1_s/logs/$(date -u +'%Y_%m_%d %H_%M_%S %a %b %d %I_%M_%S %p %Z').log"

./docker/stop.sh
