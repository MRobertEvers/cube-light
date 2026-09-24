#!/bin/sh
# Installs local-dns on a WireGuard host: a systemd service listening only on the tunnel address
# (DNS on 53, device registrations on 8053), plus a small root helper that records peer endpoints.
#
#   tools/local-dns/deploy.sh <ssh-host> <zone> <tunnel-ip> <hosts-file>
#   tools/local-dns/deploy.sh mrobertevers.com local.mrobertevers.com 10.0.0.1 ~/local-dns.hosts
#
# The hosts file maps single-label names to WireGuard addresses ("laptop 10.0.0.2"). It holds
# your device names, so keep it out of the repository. Rerunning updates everything in place.
set -eu

if [ $# -ne 4 ]; then
    sed -n '2,8p' "$0"
    exit 1
fi
HOST=$1
ZONE=$2
LISTEN=$3
HOSTS_FILE=$4
DIR=$(cd "$(dirname "$0")" && pwd)

printf 'ZONE=%s\nLISTEN=%s\nTUNNEL_SUBNET=%s.0/24\nUPSTREAM=1.1.1.1\n' "$ZONE" "$LISTEN" "${LISTEN%.*}" > "${TMPDIR:-/tmp}/local-dns.env"
scp -q "$DIR/local-dns.mjs" "$DIR/mdns.mjs" "$DIR/dns-message.mjs" "$DIR/registry.mjs" "$DIR/endpoints.mjs" \
    "$DIR/wg-endpoints.sh" "$DIR/local-dns.service" "$DIR/local-dns-endpoints.service" \
    "$HOSTS_FILE" "${TMPDIR:-/tmp}/local-dns.env" "$HOST:/tmp/"
rm -f "${TMPDIR:-/tmp}/local-dns.env"

ssh "$HOST" "HOSTS_NAME=$(basename "$HOSTS_FILE") sh -eu" <<'REMOTE'
sudo install -d -m 755 /opt/local-dns /etc/local-dns
sudo install -m 644 /tmp/local-dns.mjs /tmp/mdns.mjs /tmp/dns-message.mjs /tmp/registry.mjs /tmp/endpoints.mjs /opt/local-dns/
sudo install -m 755 /tmp/wg-endpoints.sh /opt/local-dns/
sudo install -m 644 "/tmp/$HOSTS_NAME" /etc/local-dns/hosts
sudo install -m 644 /tmp/local-dns.env /etc/local-dns/env
sudo install -m 644 /tmp/local-dns.service /tmp/local-dns-endpoints.service /etc/systemd/system/
rm -f /tmp/local-dns.mjs /tmp/mdns.mjs /tmp/dns-message.mjs /tmp/registry.mjs /tmp/endpoints.mjs /tmp/wg-endpoints.sh \
    /tmp/local-dns.service /tmp/local-dns-endpoints.service /tmp/local-dns.env "/tmp/$HOSTS_NAME"
sudo systemctl daemon-reload
sudo systemctl enable local-dns-endpoints.service local-dns.service
sudo systemctl restart local-dns-endpoints.service local-dns.service
sleep 4
systemctl is-active local-dns-endpoints.service local-dns.service
sudo journalctl -u local-dns.service -n 3 --no-pager
REMOTE
