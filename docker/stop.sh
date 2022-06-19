cd "${0%/*}/.."

./proc_main/docker/stop.sh
./srv_web_main/docker/stop.sh
./proc_mongodb/docker/stop.sh
./srv_web_old/docker/stop.sh
