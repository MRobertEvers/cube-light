#!/bin/sh
# Runs as root (local-dns-endpoints.service). Every few seconds writes one line per WireGuard
# peer, "<tunnel address> <endpoint>", to /run/local-dns/endpoints for local-dns to read.
# Built from `allowed-ips` and `endpoints` rather than `dump`, which would include preshared keys.
set -eu
INTERFACE=${1:-wg0}
OUT=/run/local-dns/endpoints
mkdir -p /run/local-dns
chmod 755 /run/local-dns
while :; do
    wg show "$INTERFACE" endpoints > "$OUT.endpoints"
    wg show "$INTERFACE" allowed-ips > "$OUT.allowed"
    awk 'NR == FNR { endpoint[$1] = $2; next }
         { for (i = 2; i <= NF; i++) { split($i, address, "/"); if (address[2] == "32") print address[1], endpoint[$1] } }' \
        "$OUT.endpoints" "$OUT.allowed" > "$OUT.tmp"
    chmod 644 "$OUT.tmp"
    mv "$OUT.tmp" "$OUT"
    rm -f "$OUT.endpoints" "$OUT.allowed"
    sleep 3
done
