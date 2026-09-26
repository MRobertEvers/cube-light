#!/usr/bin/env python3
"""
Mirrors Scryfall card images, and builds the offline card art pack from the mirror.

  mirror    Downloads Scryfall's Default Cards bulk file (every printing), then each
            printing's images into DEST/<variant>/<face>/<scryfall id>.<ext>, faces
            "front" and "back" as Scryfall names them. Resumable: files already there
            are kept. Cards the offline card pack names (each card's default printing)
            download first, so the art pack can be built before the mirror finishes.
  art-pack  Builds the offline card art pack from the mirror's art crops: one small WebP
            per card (its default printing, as CardPack.json.gz names it), packed into
            a few chunk files and an index the client downloads on request.

Scryfall serves no image archives, only bulk JSON with each image's URL, so the images are
fetched one by one from its CDN. The CDN (*.scryfall.io) has no rate limit, unlike
api.scryfall.com, so many downloads run at once.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SERVER = Path(__file__).resolve().parents[2]
ASSETS = SERVER / "src" / "assets"
# Beside the installed card database: src/assets/AllPrintings.sqlite links to it.
DATA = (ASSETS / "AllPrintings.sqlite").resolve().parent
USER_AGENT = "cube-light/1.0 (card image mirror)"
EXTENSIONS = {"png": "png", "large": "jpg", "normal": "jpg", "small": "jpg", "art_crop": "jpg", "border_crop": "jpg",
              "art": "webp", "crop": "webp", "thumb": "webp", "grid": "webp", "display": "webp"}
ART_PACK_INDEX = "CardArt.index.json"
CHUNK_BYTES = 5_000_000


def get(url: str, timeout: int = 60) -> bytes:
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"}), timeout=timeout) as response:
        return response.read()


def bulk_cards(stage: Path, variants: list) -> list:
    """
    Scryfall's Default Cards (every card in English, or its printed language), as just what
    the mirror needs: [(scryfall id, [(face, {variant: url})])]. The file is read a line at
    a time: whole card objects for 100,000+ printings take gigabytes, more than a NAS has.
    """
    listing = json.loads(get("https://api.scryfall.com/bulk-data/default-cards"))
    url = listing.get("jsonl_download_uri") or listing["download_uri"]
    archive = stage / "default-cards.jsonl.gz"
    if not archive.exists() or archive.stat().st_size != listing.get("compressed_size", -1):
        print(f"Downloading {url} ...", flush=True)
        with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=300) as source, archive.open("wb") as target:
            shutil.copyfileobj(source, target, length=1024 * 1024)
    cards = []
    with gzip.open(archive, "rt", encoding="utf-8") as lines:
        for line in lines:
            if not line.strip():
                continue
            card = json.loads(line)
            faces = [(face, {variant: uris[variant] for variant in variants if variant in uris}) for face, uris in images_of(card)]
            cards.append((card["id"], faces))
    return cards


def images_of(card: dict) -> list:
    """(face, image_uris) for each face with its own images; single-image cards have one front."""
    if "image_uris" in card:
        return [("front", card["image_uris"])]
    faces = [face for face in card.get("card_faces", []) if "image_uris" in face]
    return [("front" if index == 0 else "back", face["image_uris"]) for index, face in enumerate(faces)]


def pack_printings() -> set:
    """Scryfall ids of the default printings the offline card pack names."""
    pack_path = ASSETS / "CardPack.json.gz"
    database = ASSETS / "AllPrintings.sqlite"
    # Run away from the server checkout (on a NAS, say), there is no pack: no priority order.
    if not pack_path.exists() or not database.exists():
        return set()
    uuids = {entry[2] for entry in json.loads(gzip.open(pack_path).read())["cards"] if len(entry) > 2 and entry[2]}
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    try:
        rows = connection.execute("SELECT uuid, scryfallId FROM cardIdentifiers").fetchall()
    finally:
        connection.close()
    return {scryfall for uuid, scryfall in rows if uuid in uuids and scryfall}


class Progress:
    """Counts checked, downloaded and failed images, and writes them as one log line."""

    def __init__(self, total: int):
        self.total = total
        self.done = 0
        self.fetched = 0
        self.bytes = 0
        self.failed = []
        self.lock = threading.Lock()
        self.started = time.time()

    def step(self, fetched: int, failure: str | None = None) -> None:
        with self.lock:
            self.done += 1
            if fetched:
                self.fetched += 1
                self.bytes += fetched
            if failure:
                self.failed.append(failure)
            if self.done % 500 == 0 or self.done == self.total:
                self.report_locked()

    def report(self, prefix: str = "") -> None:
        with self.lock:
            self.report_locked(prefix)

    def report_locked(self, prefix: str = "") -> None:
        rate = self.fetched / max(1.0, time.time() - self.started)
        stamp = time.strftime("%H:%M:%S")
        print(f"{stamp} {prefix}{self.done}/{self.total} checked, {self.fetched} downloaded ({self.bytes / 1e9:.2f} GB, {rate:.1f}/s), {len(self.failed)} failed", flush=True)


def fetch_to(url: str, path: Path, attempts: int = 4) -> int:
    """Downloads url to path through a temporary file; the byte count, or 0 when it was already there."""
    if path.exists() and path.stat().st_size > 0:
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(attempts):
        try:
            data = get(url)
            staged = path.with_name(f".{path.name}.part")
            staged.write_bytes(data)
            os.replace(staged, path)
            return len(data)
        except (HTTPError, URLError, TimeoutError, ConnectionError) as error:
            if isinstance(error, HTTPError) and error.code == 404:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError(f"gave up on {url}")


def mirror(args: argparse.Namespace) -> None:
    dest = Path(args.dest).expanduser()
    dest.mkdir(parents=True, exist_ok=True)
    print(f"Mirroring {', '.join(args.variants)} into {dest}", flush=True)
    cards = bulk_cards(dest, args.variants)
    first = pack_printings()
    # Default printings first: the art pack is built from them.
    cards.sort(key=lambda card: 0 if card[0] in first else 1)
    jobs = []
    for card_id, faces in cards:
        for face, uris in faces:
            for variant, url in uris.items():
                jobs.append((url, dest / variant / face / f"{card_id}.{EXTENSIONS[variant]}"))
    print(f"{len(cards)} printings, {len(jobs)} images ({', '.join(args.variants)}) into {dest}", flush=True)
    progress = Progress(len(jobs))
    stop = threading.Event()

    # Messages: TERM or Ctrl-C stops after the downloads in flight; USR1 writes progress
    # now, so `setup-tande-nas.sh --status` can tell a live mirror from a stuck one.
    def on_stop(signum, frame):
        stop.set()
        print(f"{time.strftime('%H:%M:%S')} Stopping after the downloads in flight ({signal.Signals(signum).name})…", flush=True)

    signal.signal(signal.SIGTERM, on_stop)
    signal.signal(signal.SIGINT, on_stop)
    if hasattr(signal, "SIGUSR1"):
        signal.signal(signal.SIGUSR1, lambda signum, frame: progress.report("status: "))

    pending = iter(jobs)
    pending_lock = threading.Lock()

    def worker():
        while not stop.is_set():
            with pending_lock:
                job = next(pending, None)
            if job is None:
                return
            url, path = job
            try:
                progress.step(fetch_to(url, path))
            except Exception as error:  # Keep going; failures are listed at the end.
                progress.step(0, f"{url}: {error}")

    workers = [threading.Thread(target=worker, daemon=True) for _ in range(args.workers)]
    for thread in workers:
        thread.start()
    # The main thread only waits, in short steps: Python runs signal handlers on it, and a
    # heartbeat every 30 s shows the mirror is alive even while it skips files it has.
    heartbeat = time.time()
    while any(thread.is_alive() for thread in workers):
        for thread in workers:
            thread.join(timeout=1)
        if time.time() - heartbeat >= 30:
            progress.report("heartbeat: ")
            heartbeat = time.time()

    (dest / "mirror.json").write_text(json.dumps({
        "finishedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "stopped": stop.is_set(),
        "printings": len(cards), "images": len(jobs), "variants": args.variants, "failed": progress.failed,
    }, indent="\t") + "\n")
    progress.report("final: ")
    if stop.is_set():
        print("Stopped. Run the mirror again to resume where it left off.", flush=True)
    else:
        print(f"Done: {progress.fetched} downloaded, {len(progress.failed)} failed (listed in mirror.json)", flush=True)


def art_pack(args: argparse.Namespace) -> None:
    """
    CardArt-NN.bin: WebP images back to back. CardArt.index.json: {"format": 1, "version",
    "width", "quality", "bytes", "chunks": [{"file", "bytes", "sha256"}],
    "art": {scryfall id: [chunk, offset, length]}} keyed by the default printing's Scryfall id,
    the id in its /images/art_crop/<id>.jpg URL, so the service worker can answer that URL.
    """
    source = Path(args.source).expanduser() / "art_crop" / "front"
    out = Path(args.out).expanduser()
    out.mkdir(parents=True, exist_ok=True)
    pack = json.loads(gzip.open(ASSETS / "CardPack.json.gz").read())
    connection = sqlite3.connect(f"file:{ASSETS / 'AllPrintings.sqlite'}?mode=ro", uri=True)
    try:
        scryfall = dict(connection.execute("SELECT uuid, scryfallId FROM cardIdentifiers").fetchall())
    finally:
        connection.close()
    cards = [entry for entry in pack["cards"] if len(entry) > 2 and entry[2] and scryfall.get(entry[2])]
    encoded: list = [None] * len(cards)
    missing = []

    def encode(index: int) -> None:
        uuid = cards[index][2]
        art = source / f"{scryfall[uuid]}.jpg"
        if not art.exists():
            missing.append(cards[index][0])
            return
        with tempfile.NamedTemporaryFile(suffix=".webp") as target:
            subprocess.run(["cwebp", "-quiet", "-q", str(args.quality), "-m", "6", "-resize", str(args.width), "0",
                            str(art), "-o", target.name], check=True)
            encoded[index] = (scryfall[uuid], Path(target.name).read_bytes())

    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        list(pool.map(encode, range(len(cards))))

    for stale in out.glob("CardArt-*.bin"):
        stale.unlink()
    chunks, index, current, offset = [], {}, bytearray(), 0

    def flush() -> None:
        name = f"CardArt-{len(chunks):02d}.bin"
        (out / name).write_bytes(current)
        chunks.append({"file": name, "bytes": len(current), "sha256": hashlib.sha256(current).hexdigest()})

    for item in encoded:
        if item is None:
            continue
        scryfall_id, data = item
        if current and len(current) + len(data) > CHUNK_BYTES:
            flush()
            current, offset = bytearray(), 0
        index[scryfall_id] = [len(chunks), offset, len(data)]
        current.extend(data)
        offset += len(data)
    if current:
        flush()
    total = sum(chunk["bytes"] for chunk in chunks)
    (out / ART_PACK_INDEX).write_text(json.dumps({
        "format": 1, "version": pack["version"], "width": args.width, "quality": args.quality,
        "cards": len(index), "bytes": total, "chunks": chunks, "art": index,
    }, separators=(",", ":")) + "\n")
    link = ASSETS / "card-art"
    if link.resolve() != out.resolve():
        if link.is_symlink() or link.exists():
            link.unlink()
        link.symlink_to(out)
    print(f"Built art pack: {len(index)} cards, {len(chunks)} chunks, {total / 1e6:.1f} MB; {len(missing)} cards had no art crop yet")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    mirror_parser = commands.add_parser("mirror", help="download card images from Scryfall")
    mirror_parser.add_argument("--dest", required=True, help="folder to mirror into, e.g. the NAS share")
    mirror_parser.add_argument("--variants", nargs="+", default=["art_crop", "png"], choices=sorted(EXTENSIONS))
    mirror_parser.add_argument("--workers", type=int, default=24, help="parallel downloads (default 24)")
    pack_parser = commands.add_parser("art-pack", help="build the offline card art pack from mirrored art crops")
    pack_parser.add_argument("--source", required=True, help="the mirror folder (with art_crop/front)")
    pack_parser.add_argument("--out", default=str(DATA / "card-art"), help="where to write CardArt-*.bin and the index")
    pack_parser.add_argument("--width", type=int, default=160)
    pack_parser.add_argument("--quality", type=int, default=31)
    args = parser.parse_args()
    if args.command == "mirror":
        mirror(args)
    else:
        if not shutil.which("cwebp"):
            sys.exit("art-pack needs cwebp (brew install webp)")
        art_pack(args)


if __name__ == "__main__":
    main()
