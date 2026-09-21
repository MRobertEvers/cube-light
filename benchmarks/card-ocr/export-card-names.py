"""Export distinct MTG card identities from the repository's MTGJSON database."""
import json
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[2]
database = root / "projects/server/src/assets/AllPrintings.sqlite"
connection = sqlite3.connect(database)
names = sorted({row[0] for row in connection.execute("SELECT DISTINCT name FROM cards") if "//" not in row[0]})
output = Path(__file__).parent / "res/card-names.json"
output.write_text(json.dumps(names, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Exported {len(names)} distinct names to {output}")
