#!/bin/bash

while true
do
    echo "$(date) ${0} boucle" >> /var/log/ed.log
    cd /home/pi/ed-notif
    timeout 60 /usr/bin/node --experimental-fetch --trace-warnings index.js  2>&1 >> /var/log/ed.log
    echo "Fin $?"   >> /var/log/ed.log
    sleep 1800
done
