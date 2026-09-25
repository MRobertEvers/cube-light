#!/usr/bin/env python3
"""Refresh the MTGJSON SQLite asset used by the server build, and the offline card pack."""

import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
import lzma
import os
from pathlib import Path
import re
import shutil
import sqlite3
import tempfile
from urllib.request import Request, urlopen


BASE_URL = "https://mtgjson.com/api/v5"
SERVER = Path(__file__).resolve().parents[2]
ASSETS = SERVER / "src" / "assets"
CARD_PACK = "CardPack.json.gz"
CARD_PACK_INFO = "CardPack.info.json"
# One face of a card, in pack order. Trailing empty fields are dropped from each face.
FACE_FIELDS = ["faceName", "manaCost", "type", "text", "power", "toughness", "loyalty", "defense"]


def fetch(url: str, destination: Path) -> None:
    with urlopen(Request(url, headers={"User-Agent": "cube-light/1.0"}), timeout=120) as source:
        with destination.open("wb") as target:
            shutil.copyfileobj(source, target, length=1024 * 1024)


def fetch_checksum(url: str) -> str:
    with urlopen(Request(url, headers={"User-Agent": "cube-light/1.0"}), timeout=30) as source:
        checksum = source.read().decode("ascii").strip()
    if not re.fullmatch(r"[0-9a-fA-F]{64}", checksum):
        raise ValueError(f"Invalid checksum from {url}")
    return checksum.lower()


def verify_checksum(path: Path, expected: str) -> None:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != expected:
        raise ValueError(f"SHA-256 mismatch for {path.name}")


def unpack(archive: Path, destination: Path) -> None:
    with lzma.open(archive, "rb") as source, destination.open("wb") as target:
        shutil.copyfileobj(source, target, length=1024 * 1024)


def validate_database(database: Path) -> tuple[tuple[str, str], int, int]:
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    try:
        if connection.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise ValueError("AllPrintings.sqlite failed quick_check")
        required = {"name", "uuid", "setCode", "types", "subtypes", "manaCost", "text"}
        columns = {row[1] for row in connection.execute("PRAGMA table_info(cards)")}
        identifiers = {row[1] for row in connection.execute("PRAGMA table_info(cardIdentifiers)")}
        if not required <= columns or not {"uuid", "scryfallId"} <= identifiers:
            raise ValueError("MTGJSON SQLite schema is incompatible with CardDatabase")
        date, version = connection.execute("SELECT date, version FROM meta").fetchone()
        missing = connection.execute(
            "SELECT COUNT(*) FROM cards c LEFT JOIN cardIdentifiers i ON i.uuid = c.uuid "
            "WHERE i.scryfallId IS NULL"
        ).fetchone()[0]
        if missing:
            raise ValueError(f"{missing} cards have no Scryfall ID")

        count, name_count = connection.execute(
            "SELECT COUNT(*), COUNT(DISTINCT name) FROM cards"
        ).fetchone()
        if not count:
            raise ValueError("AllPrintings.sqlite contains no cards")
        return (date, version), count, name_count
    finally:
        connection.close()


def build_card_pack(database: Path, directory: Path) -> dict:
    """
    Writes the compact offline card pack: one entry per card name with the text a player
    reads (faces, mana cost, type line, rules text, power/toughness, loyalty, defense), from
    the newest English printing of each face, and the card's default printing: the one the
    server's /sync/v1/resolve-card picks (its first front face), so a card added offline is
    the same printing it would be online. No other printings, images or legality.

    CardPack.json.gz: {"format": 1, "version", "fields": FACE_FIELDS,
                       "cards": [[name, [face, ...], uuid, setCode], ...]}
    CardPack.info.json: what the pack holds and its size, so a client can decide to download.
    """
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    try:
        date, version = connection.execute("SELECT date, version FROM meta").fetchone()
        rows = connection.execute(
            "SELECT c.name, COALESCE(c.side, ''), "
            + ", ".join(f"c.{field}" for field in FACE_FIELDS)
            + " FROM cards c LEFT JOIN sets s ON s.code = c.setCode "
            "ORDER BY c.name, COALESCE(c.side, ''), "
            "COALESCE(c.language, 'English') = 'English' DESC, s.releaseDate DESC"
        )
        # CardDatabase.queryCardsByName: front faces (side NULL or 'a') in rowid order.
        printings = {
            name: (uuid, set_code)
            for name, uuid, set_code in connection.execute(
                "SELECT c.name, c.uuid, c.setCode FROM cards c WHERE c.rowid IN ("
                "SELECT MIN(rowid) FROM cards WHERE side IS NULL OR side = 'a' GROUP BY name)"
            )
        }
        cards: list = []
        seen: set = set()
        for name, side, *face in rows:
            if (name, side) in seen:
                continue
            seen.add((name, side))
            while face and face[-1] in (None, ""):
                face.pop()
            if not cards or cards[-1][0] != name:
                uuid, set_code = printings.get(name, (None, None))
                cards.append([name, [], uuid, set_code])
            cards[-1][1].append(face)
    finally:
        connection.close()
    pack = {"format": 1, "version": version, "fields": FACE_FIELDS, "cards": cards}
    body = gzip.compress(json.dumps(pack, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9, mtime=0)
    info = {
        "format": 1,
        "version": version,
        "date": date,
        "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cards": len(cards),
        "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest(),
    }
    for filename, data in ((CARD_PACK, body), (CARD_PACK_INFO, (json.dumps(info, indent="\t") + "\n").encode())):
        staged = directory / f".{filename}.tmp"
        staged.write_bytes(data)
        os.replace(staged, directory / filename)
    return info


def card_pack_directory() -> Path:
    """Beside the installed database: src/assets/AllPrintings.sqlite is usually a link to it."""
    return (ASSETS / "AllPrintings.sqlite").resolve().parent


def link_card_pack(directory: Path) -> None:
    """Makes the pack reachable from src/assets when it was written somewhere else."""
    for filename in (CARD_PACK, CARD_PACK_INFO):
        link = ASSETS / filename
        if (directory / filename).resolve() == link.resolve() and link.exists():
            continue
        link.unlink(missing_ok=True)
        link.symlink_to(directory / filename)


def report_card_pack(info: dict) -> None:
    print(f"Built {CARD_PACK} for MTGJSON {info['version']}: {info['cards']} cards, {info['bytes'] / 1e6:.1f} MB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--use-local-archives", action="store_true",
        help="Use AllPrintings.sqlite.xz.download in src/assets instead of downloading again",
    )
    parser.add_argument(
        "--pack-only", action="store_true",
        help=f"Only rebuild {CARD_PACK} from the installed AllPrintings.sqlite",
    )
    args = parser.parse_args()
    ASSETS.mkdir(parents=True, exist_ok=True)
    if args.pack_only:
        directory = card_pack_directory()
        report_card_pack(build_card_pack(ASSETS / "AllPrintings.sqlite", directory))
        link_card_pack(directory)
        return
    with tempfile.TemporaryDirectory(prefix="mtgjson-", dir=ASSETS) as temporary:
        stage = Path(temporary)
        filename = "AllPrintings.sqlite.xz"
        archive = ASSETS / f"{filename}.download" if args.use_local_archives else stage / filename
        if not args.use_local_archives:
            print(f"Downloading {filename}...", flush=True)
            fetch(f"{BASE_URL}/{filename}", archive)
        verify_checksum(archive, fetch_checksum(f"{BASE_URL}/{filename}.sha256"))
        sqlite_output = stage / "AllPrintings.sqlite"
        unpack(archive, sqlite_output)

        sqlite_meta, count, name_count = validate_database(sqlite_output)

        journal = ASSETS / "AllPrintings.sqlite-wal"
        if journal.exists() and journal.stat().st_size:
            raise ValueError("Close the server and checkpoint AllPrintings.sqlite before refreshing")

        os.replace(sqlite_output, (ASSETS / "AllPrintings.sqlite").resolve())
        for suffix in ("-wal", "-shm"):
            (ASSETS / f"AllPrintings.sqlite{suffix}").unlink(missing_ok=True)
        print(f"Installed MTGJSON {sqlite_meta[1]}: {count} cards, {name_count} names")
    directory = card_pack_directory()
    report_card_pack(build_card_pack(ASSETS / "AllPrintings.sqlite", directory))
    link_card_pack(directory)


if __name__ == "__main__":
    main()
