cd D:/Data/c284-webmain-1

powershell -ExecutionPolicy Bypass -File ./docker/stop.ps1

New-Item -ItemType Directory -Force -Path D:/Data/c284-webmain-1_s/cert | Out-Null
New-Item -ItemType Directory -Force -Path D:/Data/c284-webmain-1_s/logs | Out-Null
New-Item -ItemType Directory -Force -Path D:/Data/c284-webmain-1_s/logs_mongodb | Out-Null
New-Item -ItemType Directory -Force -Path D:/Data/c284-webmain-1_s/mongodb | Out-Null
New-Item -ItemType File -Path D:/Data/c284-webmain-1_s/.env 2>&1 | Out-Null

docker run -it --name c284-webmain-1 `
  --mount type=bind,source=D:/Data/c284-webmain-1_s/cert,target=/home/webmain/cert `
  --mount type=bind,source=D:/Data/c284-webmain-1_s/logs_mongodb,target=/home/webmain/logs_mongodb `
  --mount type=bind,source=D:/Data/c284-webmain-1_s/mongodb,target=/home/webmain/mongodb `
  --mount type=bind,source=D:/Data/c284-webmain-1_s/.env,target=/home/webmain/.env `
  -p 8080:8080 -p 8443:8443 c284-webmain-1 | tee "D:/Data/c284-webmain-1_s/logs/$((Get-Date).ToUniversalTime().ToString('yyyy_MM_dd HH_mm_ss ddd MMM dd hh_mm_ss tt UTC')).log"

powershell -ExecutionPolicy Bypass -File ./docker/stop.ps1
