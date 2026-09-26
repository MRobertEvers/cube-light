#!/usr/bin/env bash
# Sets up the TandE NAS as the home of the Scryfall card image mirror.
#
#   scripts/setup-tande-nas.sh            set up, copy the art crops, start the mirror
#   scripts/setup-tande-nas.sh --status   is the mirror alive, answering and making progress
#   scripts/setup-tande-nas.sh --stop     stop the mirror (it finishes the downloads in flight)
#   scripts/setup-tande-nas.sh --restart  stop it, upload the latest scripts, start it again
#
# It asks for your NAS login and opens one SSH session (ssh itself asks for the
# password; this script never sees it), then everything goes under ~/images in your
# home directory on the NAS:
#
#   ~/images/art_crop/...           art crops of every printing, copied from this Mac
#   ~/images/png/...                full PNGs of every printing (~200 GB), downloaded
#                                   by the NAS itself straight from Scryfall
#   ~/images/card-images.py         the mirror script (projects/server/tools/scripts)
#   ~/images/mirror-control.sh      starts, stops and checks it (scripts/nas)
#   ~/images/mirror.log             the mirror's progress
#
# The mirror runs on the NAS in the background (nohup), so this Mac can sleep or go
# offline once it has started. It resumes where it stopped: run this again at any time.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIRROR_SCRIPT="$ROOT/projects/server/tools/scripts/card-images.py"
CONTROL_SCRIPT="$ROOT/scripts/nas/mirror-control.sh"
LOCAL_IMAGES="$HOME/Library/Application Support/CubeLight/data/card-images"
REMOTE_DIR='images'
CONFIG="$HOME/.config/cube-light/tande-nas"

mode="setup"
case "${1:-}" in
	--status) mode="status" ;;
	--stop) mode="stop" ;;
	--restart) mode="restart" ;;
	"") ;;
	*) echo "Usage: $0 [--status | --stop | --restart]" >&2; exit 2 ;;
esac

# Remember the host and user between runs; never the password.
host="" user=""
if [ -f "$CONFIG" ]; then
	# shellcheck disable=SC1090
	. "$CONFIG"
fi
read -r -p "NAS host [${host:-TandE.local}]: " answer
host="${answer:-${host:-TandE.local}}"
read -r -p "NAS user [${user:-$USER}]: " answer
user="${answer:-${user:-$USER}}"
mkdir -p "$(dirname "$CONFIG")"
printf 'host=%q\nuser=%q\n' "$host" "$user" > "$CONFIG"

# One SSH login for the whole run: later commands reuse the connection. Its socket
# lives in a short /tmp folder: macOS caps socket paths at 104 bytes, and $TMPDIR is long.
control_dir="$(mktemp -d /tmp/cl-nas.XXXXXX)"
ssh_opts=(-o ControlMaster=auto -o "ControlPath=$control_dir/ssh" -o ControlPersist=10m -o ServerAliveInterval=30)
remote() { ssh "${ssh_opts[@]}" "$user@$host" "$@"; }
cleanup() {
	ssh "${ssh_opts[@]}" -O exit "$user@$host" 2>/dev/null || true
	rm -rf "$control_dir"
}
trap cleanup EXIT

echo
echo "Connecting to $user@$host. Enter your NAS password if ssh asks for it."
remote true
echo "Connected."

# The latest mirror and control scripts, sent through the SSH session itself: scp needs
# the SFTP service, which a Synology leaves off.
upload_scripts() {
	remote "mkdir -p ~/$REMOTE_DIR && cat > ~/$REMOTE_DIR/card-images.py" < "$MIRROR_SCRIPT"
	remote "cat > ~/$REMOTE_DIR/mirror-control.sh && chmod +x ~/$REMOTE_DIR/mirror-control.sh" < "$CONTROL_SCRIPT"
}
control() { remote "sh ~/$REMOTE_DIR/mirror-control.sh $*"; }
find_python() {
	remote 'for p in python3 /usr/bin/python3 /usr/local/bin/python3 /opt/bin/python3; do command -v "$p" >/dev/null 2>&1 && { command -v "$p"; exit 0; }; done' || true
}

if [ "$mode" = "status" ] || [ "$mode" = "stop" ]; then
	if ! remote "[ -d ~/$REMOTE_DIR ]"; then
		echo "No ~/$REMOTE_DIR on the NAS yet: run $0 without options first."
		exit 0
	fi
	upload_scripts
	control "$mode"
	exit 0
fi

if [ "$mode" = "restart" ]; then
	python="$(find_python)"
	[ -n "$python" ] || { echo "The NAS has no python3." >&2; exit 1; }
	upload_scripts
	control stop
	control start "$python"
	exit 0
fi

echo
echo "Checking the NAS…"
python="$(find_python)"
if [ -z "$python" ]; then
	echo "The NAS has no python3, which the mirror needs. Install it (on a Synology: Package Center → Python 3) and run this again." >&2
	exit 1
fi
version="$(remote "$python -c 'import sys; print(\"%d.%d\" % sys.version_info[:2])'")"
echo "  python: $python ($version)"
remote "mkdir -p ~/$REMOTE_DIR"
home="$(remote 'cd ~ && pwd')"
echo "  images: $home/$REMOTE_DIR"
remote "df -h ~/$REMOTE_DIR | tail -n 1" | awk '{print "  free space: " $4 " of " $2}'
echo "  The full PNG mirror needs about 200 GB."
read -r -p "Continue? [Y/n] " answer
case "$answer" in [nN]*) echo "Nothing changed on the NAS beyond ~/$REMOTE_DIR."; exit 0 ;; esac

echo
echo "Copying the mirror scripts…"
upload_scripts

if [ -d "$LOCAL_IMAGES/art_crop" ]; then
	echo "Copying the art crops already on this Mac (about $(du -sh "$LOCAL_IMAGES/art_crop" | cut -f1))…"
	# rsync resumes and skips what is there, but a Synology only allows it with its rsync
	# service on; otherwise stream a tar archive through the SSH session.
	if ! rsync -a --partial -e "ssh ${ssh_opts[*]}" "$LOCAL_IMAGES/art_crop" "$LOCAL_IMAGES/default-cards.jsonl.gz" "$user@$host:$REMOTE_DIR/" 2>/dev/null; then
		echo "  (rsync is not available on the NAS; sending a tar stream instead)"
		# Without macOS metadata (xattrs such as com.apple.provenance), which the NAS's tar
		# does not know and would warn about once per file.
		COPYFILE_DISABLE=1 tar -C "$LOCAL_IMAGES" --no-xattrs --no-mac-metadata -cf - art_crop default-cards.jsonl.gz \
			| remote "tar -C ~/$REMOTE_DIR -xf -"
	fi
	echo "  Copied."
else
	echo "No art crops on this Mac yet; the NAS will download them too."
fi

echo
echo "Starting the mirror on the NAS (art crops, then full PNGs)…"
control start "$python"

echo
echo "Done. The NAS keeps downloading on its own; this Mac can sleep."
echo "Check on it with:  $0 --status"
