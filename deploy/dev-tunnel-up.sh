#!/bin/sh
# Corre DESDE LA NOTEBOOK. Abre un túnel SSH inverso persistente hacia el
# server: reenvía el puerto 18010 del server (solo localhost, por
# GatewayPorts=no) hacia el 3010 de esta notebook. Mientras está vivo, nginx
# en el server puede proxear a `npm run dev` corriendo acá.
# (3010 en el server ya está tomado por otro servicio del cliente
# web_cuyo_smart_sas, por eso el forward remoto usa 18010.)
set -e

SERVER_HOST=${SERVER_HOST:-192.168.1.10}   # 207.191.165.97 si estás afuera de casa
SERVER_USER=${SERVER_USER:-usergen}

echo "Túnel: server:18010 (localhost) -> notebook:3010"
echo "Ctrl+C para cortar."
autossh -M 0 -N \
  -o "ServerAliveInterval=15" \
  -o "ServerAliveCountMax=3" \
  -o "ExitOnForwardFailure=yes" \
  -R 18010:localhost:3010 \
  "$SERVER_USER@$SERVER_HOST"
