#!/usr/bin/env python3
"""Import Cricsheet IPL JSON ball-by-ball data into a versioned site stats file.
Usage: python3 scripts/import_ipl_cricsheet.py [path/to/ipl_json.zip]
If no ZIP is supplied, download the current archive from Cricsheet.
"""
import collections
import datetime
import io
import json
import pathlib
import urllib.request
import zipfile

SOURCE = "https://cricsheet.org/downloads/ipl_json.zip"
OUTPUT = pathlib.Path(__file__).resolve().parents[1] / "lib" / "data" / "ipl-stats.json"
NON_BOWLER_DISMISSALS = {"run out", "retired hurt", "retired out", "obstructing the field"}
def main():
    import sys
    if len(sys.argv) > 1:
        archive = pathlib.Path(sys.argv[1]).read_bytes()
    else:
        print("Downloading IPL archive from Cricsheet...")
        with urllib.request.urlopen(SOURCE, timeout=90) as response:
            archive = response.read()
    bat = collections.defaultdict(lambda: {"runs": 0, "balls": 0, "fours": 0, "sixes": 0})
    bowl = collections.defaultdict(lambda: {"wickets": 0, "runs": 0, "balls": 0})
    seasons = collections.defaultdict(lambda: {"matches": 0, "runs": 0, "wickets": 0})
    teams = collections.defaultdict(lambda: {"matches": 0, "wins": 0})
    match_ids = set()
    first_date, last_date = None, None
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        for filename in sorted(z.namelist()):
            if not filename.endswith(".json") or filename.startswith("__MACOSX/"):
                continue
            try:
                match = json.loads(z.read(filename))
            except (ValueError, UnicodeDecodeError):
                continue
            info = match.get("info", {})
            if not info.get("dates") or not info.get("innings"):
                pass
            if not match.get("innings"):
                continue
            mid = pathlib.Path(filename).stem
            if mid in match_ids:
                continue
            match_ids.add(mid)
            date = str(info["dates"][0])
            year = date[:4]
            first_date = min(first_date or date, date)
            last_date = max(last_date or date, date)
            seasons[year]["matches"] += 1
            for team in info.get("teams", []):
                teams[team]["matches"] += 1
            winner = info.get("outcome", {}).get("winner")
            if winner:
                teams[winner]["wins"] += 1
            registry = info.get("registry", {}).get("people", {})
            for innings in match["innings"]:
                # Super overs are excluded from career aggregates.
                if innings.get("super_over"):
                    continue
                for over in innings.get("overs", []):
                    for d in over.get("deliveries", []):
                        batter = registry.get(d["batter"], d["batter"])
                        bowler = registry.get(d["bowler"], d["bowler"])
                        br = int(d.get("runs", {}).get("batter", 0))
                        extras = d.get("extras", {})
                        bat[batter]["name"] = d["batter"]
                        bowl[bowler]["name"] = d["bowler"]
                        bat[batter]["runs"] += br
                        if "wides" not in extras:
                            bat[batter]["balls"] += 1
                        if not d.get("non_boundary"):
                            if br == 4:
                                bat[batter]["fours"] += 1
                            elif br == 6:
                                bat[batter]["sixes"] += 1
                        bowl[bowler]["runs"] += br + int(extras.get("wides", 0)) + int(extras.get("noballs", 0))
                        if "wides" not in extras and "noballs" not in extras:
                            bowl[bowler]["balls"] += 1
                        seasons[year]["runs"] += int(d.get("runs", {}).get("total", 0))
                        for wicket in d.get("wickets", []):
                            seasons[year]["wickets"] += 1
                            if wicket.get("kind") not in NON_BOWLER_DISMISSALS:
                                bowl[bowler]["wickets"] += 1
    if not match_ids:
        raise RuntimeError("No IPL match JSON files were found in the ZIP")
    batters = sorted((dict(id=k, **v) for k,v in bat.items()), key=lambda p:(-p["runs"],p["name"]))[:25]
    bowlers = sorted((dict(id=k, **v) for k,v in bowl.items()), key=lambda p:(-p["wickets"],p["name"]))[:25]
    payload = {
        "source": "Cricsheet", "sourceUrl": "https://cricsheet.org/",
        "license": "ODC-BY 1.0", "coverage": {"matches": len(match_ids), "firstDate": first_date, "lastDate": last_date},
        "batting": batters, "bowling": bowlers,
        "seasons": [{"year": int(k), **v} for k,v in sorted(seasons.items(), reverse=True)],
        "teams": [{"name": k, **v} for k,v in sorted(teams.items(), key=lambda item:-item[1]["wins"])],
        "note": "Derived from available Cricsheet ball-by-ball matches; coverage may be incomplete. Super-over deliveries excluded from player aggregates."
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    print(f"Saved {len(match_ids)} matches and IPL statistics to {OUTPUT}")
if __name__ == "__main__":
    main()
