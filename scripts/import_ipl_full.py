#!/usr/bin/env python3
"""Download and preserve every available Cricsheet IPL JSON match.

Creates a complete source archive and a searchable manifest. The original JSON
is retained without removing deliveries, wickets, innings, officials or metadata.
Usage: python3 scripts/import_ipl_full.py [local-ipl-json.zip]
"""
import datetime
import hashlib
import io
import json
import pathlib
import sys
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / "lib" / "data"
SOURCE = "https://cricsheet.org/downloads/ipl_json.zip"

def main():
    prefix = sys.argv[1] if len(sys.argv) > 1 else "ipl"
    source_url = sys.argv[2] if len(sys.argv) > 2 else SOURCE
    if len(sys.argv) > 2:
        with urllib.request.urlopen(source_url, timeout=120) as response:
            data = response.read()
    elif len(sys.argv) > 1 and pathlib.Path(sys.argv[1]).exists():
        data = pathlib.Path(sys.argv[1]).read_bytes()
    else:
        with urllib.request.urlopen(SOURCE, timeout=120) as response:
            data = response.read()
    manifest = []
    valid = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for member in sorted(archive.namelist()):
            if not member.lower().endswith(".json") or member.startswith("__MACOSX/"):
                continue
            obj = json.loads(archive.read(member))
            info = obj.get("info", {})
            if not isinstance(info, dict) or not obj.get("innings"):
                continue
            identifier = pathlib.PurePosixPath(member).stem
            if identifier in valid:
                raise ValueError("Duplicate match ID: " + identifier)
            valid[identifier + ".json"] = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            manifest.append({
                "id": identifier,
                "dates": info.get("dates", []),
                "season": info.get("season"),
                "teams": info.get("teams", []),
                "venue": info.get("venue"),
                "city": info.get("city"),
                "event": info.get("event"),
                "outcome": info.get("outcome"),
                "players": info.get("players", {}),
                "innings": len(obj["innings"])
            })
    if not valid:
        raise RuntimeError("No IPL JSON matches found")
    DEST.mkdir(parents=True, exist_ok=True)
    archive_path = DEST / (prefix + "-matches.zip")
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
        for filename, content in sorted(valid.items()):
            out.writestr(filename, content)
    metadata = {
        "source": "Cricsheet",
        "sourceUrl": "https://cricsheet.org/",
        "downloadUrl": source_url,
        "license": "ODC-BY 1.0",
        "matchCount": len(manifest),
        "matches": manifest,
        "note": "Original match JSON retained in ipl-matches.zip; data subject to Cricsheet coverage and corrections."
    }
    (DEST / (prefix + "-manifest.json")).write_text(json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")
    print(f"Imported {len(manifest)} IPL matches; {archive_path.stat().st_size} compressed bytes")

if __name__ == "__main__":
    main()
