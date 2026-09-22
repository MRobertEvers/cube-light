#!/usr/bin/env python3
"""Refresh the MTGJSON SQLite asset used by the server build."""

import argparse
import hashlib
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--use-local-archives", action="store_true",
        help="Use AllPrintings.sqlite.xz.download in src/assets instead of downloading again",
    )
    args = parser.parse_args()
    ASSETS.mkdir(parents=True, exist_ok=True)
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


if __name__ == "__main__":
    main()
