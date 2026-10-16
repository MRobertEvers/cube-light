#!/usr/bin/env bash
# Point <name>.mrobertevers.com at the reverse-proxy box with an A record, via GoDaddy's v3 API.
#   scripts/public-host-dns.sh                 # cube-light.mrobertevers.com
#   scripts/public-host-dns.sh torimtg         # any other single-label subdomain
# Runs on the proxy box over SSH and reuses the certbot GoDaddy hook installed there
# (/etc/letsencrypt/godaddy/godaddy_hook.py, dustinssols' deploy/certbot-godaddy-hook.py), so the
# root-only API token never leaves that machine. Idempotent: an existing A record is left alone.
# TLS needs nothing more: the proxy's *.mrobertevers.com wildcard covers any single label.
set -euo pipefail
NAME=${1:-cube-light}
PROXY_HOST=${PROXY_HOST:-mrobertevers.com}
PROXY_IP=${PROXY_IP:-35.206.97.22}
case "$NAME" in *[!a-z0-9-]*|"") echo "invalid subdomain label: $NAME" >&2; exit 1;; esac
case "$PROXY_IP" in *[!0-9.]*|"") echo "invalid IPv4 address: $PROXY_IP" >&2; exit 1;; esac

ssh "$PROXY_HOST" "sudo python3 - '$NAME' '$PROXY_IP'" <<'EOF'
import sys, json, urllib.parse
sys.path.insert(0, "/etc/letsencrypt/godaddy")
import godaddy_hook as g
ZONE = "mrobertevers.com"
name, ip = sys.argv[1], sys.argv[2]
def a_records():
    q = urllib.parse.urlencode({"type": "A", "name": name, "pageSize": "100"})
    items = (g.api("GET", ZONE, "/dns-records?" + q) or {}).get("items", [])
    return [{"name": r.get("name"), "data": r.get("data"), "ttl": r.get("ttl")} for r in items if r.get("type") == "A" and r.get("name") == name]
existing = a_records()
if existing:
    print("already present:", json.dumps(existing))
else:
    g.api("POST", ZONE, "/dns-records", {"type": "A", "name": name, "data": ip, "ttl": 600})
    print("created:", json.dumps(a_records()))
EOF
