"""Score OCR text against manually annotated title regions in the multi-card photo.

The boxes are evaluation ground truth. They are never passed to the full-image or
tiled OCR runs, so this measures how much title text those runs actually found.
"""
import json
import re
import statistics
from pathlib import Path

ROOT = Path(__file__).parent
TRUTH = json.loads((ROOT / "multi-ground-truth.json").read_text())


def normalize(text):
    return re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()


def boxes_near_title(run, truth):
    x, y, width, height = truth["box"]
    matches = []
    for output in run["outputs"]:
        rx, ry = output["region"]["x"], output["region"]["y"]
        for item in output.get("items", []):
            px = item["poly"][0][0] + rx
            py = item["poly"][0][1] + ry
            if x - 20 <= px <= x + width + 20 and y - 15 <= py <= y + height + 15:
                matches.append((px, item["text"]))
    return [text for _, text in matches] + [" ".join(text for _, text in sorted(matches))]


def report(label, found, elapsed, load):
    unique = len({item["name"] for item, hit in zip(TRUTH, found) if hit})
    print(f"{label}: {sum(found)}/40 card instances, {unique}/26 distinct names; inference {elapsed:.0f} ms; setup {load:.0f} ms")
    print("  missed:", ", ".join(item["name"] for item, hit in zip(TRUTH, found) if not hit))


multi_path = ROOT / "results-multi.json"
if multi_path.exists():
    for run in json.loads(multi_path.read_text()):
        if run["engine"] != "paddle" or "outputs" not in run:
            continue
        hits = [
            any(normalize(item["name"]) in normalize(text) for text in boxes_near_title(run, item))
            for item in TRUTH
        ]
        report("PaddleOCR full image" if not run["tiled"] else "PaddleOCR 12 tiles", hits,
               sum(output["ms"] for output in run["outputs"]), run["loadMs"])

title_path = ROOT / "results-multi-titles.json"
if title_path.exists():
    for run in json.loads(title_path.read_text()):
        if "outputs" not in run:
            continue
        hits = [normalize(item["name"]) in normalize(item["output"]) for item in run["outputs"]]
        report(f"{run['engine']} annotated title crops", hits,
               sum(item["ms"] for item in run["outputs"]), run["loadMs"])
        print(f"  median per title: {statistics.median(item['ms'] for item in run['outputs']):.0f} ms")
