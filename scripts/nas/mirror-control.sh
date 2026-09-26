#!/bin/sh
# Controls the card image mirror on the NAS. setup-tande-nas.sh uploads it next to
# card-images.py in ~/images and runs it there:
#
#   mirror-control.sh status          is it alive and answering, and is it making progress
#   mirror-control.sh stop            ask it to stop (TERM), and wait until it has
#   mirror-control.sh start PYTHON    start it in the background, and check it stays up
#
# The mirror answers USR1 by writing its progress to mirror.log at once.
cd "$(dirname "$0")" || exit 1

running() {
	pid=$(cat mirror.pid 2>/dev/null)
	[ -n "$pid" ] && ps -p "$pid" -o args= 2>/dev/null | grep -q card-images.py
}

last_downloaded() {
	grep ' checked, ' mirror.log 2>/dev/null | tail -n 1 | sed -n 's/.* checked, \([0-9]*\) downloaded.*/\1/p'
}

case "$1" in
status)
	if running; then
		echo "Mirror: running (process $pid)"
		lines=$(wc -l < mirror.log)
		kill -USR1 "$pid"
		sleep 2
		if [ "$(wc -l < mirror.log)" -gt "$lines" ]; then
			echo "It answered a status request: $(tail -n 1 mirror.log)"
		else
			echo "It did not answer a status request within 2 s: it may be stuck."
		fi
	else
		echo "Mirror: not running"
	fi
	if [ -f mirror.log ]; then
		# GNU stat (the NAS) or BSD stat (a Mac).
		written=$(stat -c %Y mirror.log 2>/dev/null || stat -f %m mirror.log)
		echo "Log last written $(( $(date +%s) - written ))s ago. Last lines:"
		tail -n 4 mirror.log | sed 's/^/  /'
	fi
	echo "Images so far:"
	for d in art_crop png; do
		[ -d "$d" ] && echo "  $d: $(find "$d" -type f | wc -l) files, $(du -sh "$d" | cut -f1)"
	done
	df -h . | tail -n 1 | awk '{print "  free space: " $4 " of " $2}'
	if running; then
		before=$(last_downloaded)
		echo "Measuring progress for 30 seconds…"
		sleep 30
		after=$(last_downloaded)
		if [ -n "$before" ] && [ -n "$after" ] && [ "$after" -gt "$before" ]; then
			echo "Progress: $((after - before)) images downloaded in 30 s ($(( (after - before) / 30 ))/s)."
		else
			echo "Progress: none in the last 30 s (it may still be checking files it already has; see the log)."
		fi
	fi
	;;
stop)
	if ! running; then
		echo "The mirror was not running."
		exit 0
	fi
	kill -TERM "$pid"
	i=0
	while [ $i -lt 60 ]; do
		if ! running; then
			echo "Stopped the mirror."
			tail -n 2 mirror.log | sed 's/^/  /'
			exit 0
		fi
		sleep 1
		i=$((i + 1))
	done
	echo "It did not stop within a minute; forcing it."
	kill -KILL "$pid"
	;;
start)
	python="$2"
	if running; then
		echo "The mirror is already running (process $pid)."
		exit 0
	fi
	echo "--- started $(date) ---" >> mirror.log
	nohup "$python" card-images.py mirror --dest "$PWD" --variants art_crop png >> mirror.log 2>&1 < /dev/null &
	echo $! > mirror.pid
	sleep 10
	if running; then
		echo "Started (process $(cat mirror.pid)). Its log so far:"
		tail -n 3 mirror.log | sed 's/^/  /'
	else
		echo "The mirror exited right after starting. Its log:"
		tail -n 25 mirror.log | sed 's/^/  /'
		exit 1
	fi
	;;
*)
	echo "Usage: $0 status | stop | start PYTHON" >&2
	exit 2
	;;
esac
