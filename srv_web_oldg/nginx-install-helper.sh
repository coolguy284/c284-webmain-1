# not in dockerfile anymore:
# RUN mv /etc/nginx etc_nginx && mv /usr/share/nginx usr_share_nginx && mv /usr/lib/nginx usr_lib_nginx
# RUN mkdir run
# "-p", "usr_share_nginx", "-c", "etc_nginx/nginx.conf"

rm /etc/nginx/modules-enabled/50-mod-http-geoip2.conf
rm /etc/nginx/modules-enabled/50-mod-http-image-filter.conf
rm /etc/nginx/modules-enabled/50-mod-http-xslt-filter.conf
rm /etc/nginx/modules-enabled/50-mod-mail.conf
rm /etc/nginx/modules-enabled/50-mod-stream.conf
rm /etc/nginx/modules-enabled/70-mod-stream-geoip2.conf
