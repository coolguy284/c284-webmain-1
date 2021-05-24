cd D:/Data/c284-webmain-1

node index.js | tee "D:/Data/c284-webmain-1_s/logs/$((Get-Date).ToUniversalTime().ToString('yyyy_MM_dd HH_mm_ss ddd MMM dd hh_mm_ss tt UTC')).log"
