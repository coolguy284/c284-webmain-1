cd "${0%/*}/.."

set -e

./proc_main/docker/build.sh || { echo 'error in proc_main build' && exit 1; }
./proc_mongodb/docker/build.sh || { echo 'error in proc_mongodb build' && exit 1; }
./srv_web_old/docker/build_debug.sh || { echo 'error in srv_web_old build' && exit 1; }
./srv_web_old2/docker/build_debug.sh || { echo 'error in srv_web_old2 build' && exit 1; }
./srv_web_oldg/docker/build_debug.sh || { echo 'error in srv_web_oldg build' && exit 1; }
./srv_web_main/docker/build_debug.sh || { echo 'error in srv_web_main build' && exit 1; }
