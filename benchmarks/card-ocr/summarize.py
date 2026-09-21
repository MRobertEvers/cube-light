"""Score whether the known card name occurs in OCR output after basic normalization."""
import json
import re
import statistics
from pathlib import Path


def normalize(value):
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def title_text(item, engine, mode):
    output = item["output"]
    if mode in ("full", "photo"):
        if engine == "tesseract":
            output = " ".join([line for line in item["output"].splitlines() if line.strip()][:3])
        else:
            output = output.split("|")[0]
    return output.replace("|", " ")


for filename in ("results.json", "results-more.json", "results-photo.json"):
    path = Path(__file__).parent / filename
    if not path.exists():
        continue
    for run in json.loads(path.read_text()):
        if "error" in run:
            print(run["engine"], run["mode"], run["error"])
            continue
        times = sorted(item["ms"] for item in run["results"])
        missed = [
            item["name"] for item in run["results"]
            if normalize(item["name"]) not in normalize(title_text(item, run["engine"], run["mode"]))
        ]
        print(
            run["engine"], run["mode"],
            f"hits={len(times)-len(missed)}/{len(times)}",
            f"load={run['loadMs']:.0f}ms",
            f"median={statistics.median(times):.0f}ms",
            f"p90={times[int(0.9 * len(times) + 0.999) - 1]:.0f}ms",
            f"missed={missed}",
        )
