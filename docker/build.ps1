cd D:/Data/c284-webmain-1

powershell -ExecutionPolicy Bypass -File ./docker/stop.ps1

docker build -t c284-webmain-1 .
