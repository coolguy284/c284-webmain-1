cd "${0%/*}/.."

set -e

./proc_main/docker/build.sh
./proc_mongodb/docker/build.sh
./srv_web_old/docker/build.sh
./srv_web_old2/docker/build.sh
./srv_web_oldg/docker/build.sh
./srv_web_main/docker/build.sh
