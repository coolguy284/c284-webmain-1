cd /home/webmain/c284-webmain-1

node index.js | tee "/home/webmain/c284-webmain-1_s/logs/$(date -u +'%Y_%m_%d %H_%M_%S %a %b %d %I_%M_%S %p %Z').log"
