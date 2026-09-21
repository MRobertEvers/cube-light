"""Download stable local fixtures from Scryfall. Card images remain untracked."""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

NAMES = [
    "Lightning Bolt", "Counterspell", "Sol Ring", "Llanowar Elves",
    "Swords to Plowshares", "Thoughtseize", "Brainstorm", "Blood Moon",
    "Command Tower", "Mystic Remora", "Birds of Paradise", "Rhystic Study",
    "Path to Exile", "Teferi, Hero of Dominaria", "Esper Sentinel", "Urza's Saga",
]
ROOT = Path(__file__).parent
IMAGES = ROOT / "images"
IMAGES.mkdir(exist_ok=True)
manifest_path = ROOT / "manifest.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
headers = {"User-Agent": "CubeLightOCRBenchmark/1.0", "Accept": "application/json"}
if not manifest:
    for index, name in enumerate(NAMES):
        url = "https://api.scryfall.com/cards/named?" + urllib.parse.urlencode({"exact": name})
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as response:
            card = json.load(response)
        image_url = card.get("image_uris", card.get("card_faces", [{}])[0].get("image_uris", {}))["normal"]
        manifest.append({"name": name, "file": f"{index:02d}.jpg", "imageUrl": image_url, "scryfallId": card["id"]})
        time.sleep(0.12)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
for index, item in enumerate(manifest):
    file = item["file"]
    if (IMAGES / file).exists():
        continue
    image_url = item["imageUrl"]
    with urllib.request.urlopen(urllib.request.Request(image_url, headers={"User-Agent": headers["User-Agent"]})) as response:
        (IMAGES / file).write_bytes(response.read())
    print(index, item["name"], flush=True)
    time.sleep(0.12)
