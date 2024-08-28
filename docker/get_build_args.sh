# Get name of last folder in path, to give different build args for each folder
# https://stackoverflow.com/questions/10654135/take-the-last-part-of-the-folder-path-in-shell/10664847#10664847
path_name="${PWD##*/}"

echo -n ' --build-arg NODE_MAJOR_VER=22'
echo -n ' --build-arg NODE_FULL_VER=22.7.0'

if [ "$path_name" = "srv_web_oldg" ]; then
  echo -n ' --build-arg NGINX_VER=1.27.1'
  echo -n ' --build-arg ZLIB_VER=1.3.1'
fi
