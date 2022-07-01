cd "${0%/*}/.."

set -e

./proc_main/docker/build_no_cache.sh
./proc_mongodb/docker/build_no_cache.sh
./srv_web_old/docker/build_no_cache.sh
./srv_web_old2/docker/build_no_cache.sh
./srv_web_main/docker/build_no_cache.sh
