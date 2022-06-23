cd "${0%/*}/.."

./proc_main/docker/build.sh
./proc_mongodb/docker/build.sh
./srv_web_old/docker/build.sh
./srv_web_old2/docker/build.sh
./srv_web_main/docker/build.sh
