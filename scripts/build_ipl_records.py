#!/usr/bin/env python3
"""Build full IPL season and player records from the retained Cricsheet match archive."""
import collections
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "lib" / "data"
NON_BOWLER = {"run out", "retired hurt", "retired out", "obstructing the field"}

def player():
    return {"runs": 0, "balls": 0, "fours": 0, "sixes": 0, "wickets": 0,
            "conceded": 0, "legalBalls": 0, "dismissals": 0, "matches": 0, "innings": 0, "bowlingInnings": 0, "highest": 0, "hundreds": 0, "fifties": 0, "nineties": 0, "fiveWickets": 0, "bestWickets": 0, "bestRuns": 0}

def main():
    by_season = collections.defaultdict(lambda: collections.defaultdict(player))
    all_players = collections.defaultdict(player)
    names = {}
    matches = []
    with zipfile.ZipFile(DATA / "ipl-matches.zip") as archive:
        for path in sorted(archive.namelist()):
            if not path.endswith(".json"):
                continue
            match = json.loads(archive.read(path))
            info = match["info"]
            season = str(info.get("season") or str(info["dates"][0])[:4])
            registry = info.get("registry", {}).get("people", {})
            names.update({identifier: name for name, identifier in registry.items()})
            match_id = pathlib.PurePosixPath(path).stem
            matches.append({"id": match_id, "season": season, "date": str(info["dates"][0]),
                            "teams": info.get("teams", []), "venue": info.get("venue", ""),
                            "outcome": info.get("outcome", {})})
            participating = set(registry.get(n, n) for members in info.get("players", {}).values() for n in members)
            for pid in participating:
                for target in (by_season[season][pid], all_players[pid]):
                    target["matches"] += 1
            for innings in match.get("innings", []):
                if innings.get("super_over"):
                    continue
                innings_bat = collections.defaultdict(int)
                innings_bowl = collections.defaultdict(lambda: {"wickets": 0, "runs": 0})
                for over in innings.get("overs", []):
                    for delivery in over.get("deliveries", []):
                        batter = registry.get(delivery["batter"], delivery["batter"])
                        bowler = registry.get(delivery["bowler"], delivery["bowler"])
                        runs = int(delivery["runs"]["batter"])
                        innings_bat[batter] += runs
                        extras = delivery.get("extras", {})
                        for target in (by_season[season][batter], all_players[batter]):
                            target["runs"] += runs
                            target["balls"] += int("wides" not in extras)
                            if not delivery.get("non_boundary"):
                                target["fours"] += int(runs == 4)
                                target["sixes"] += int(runs == 6)
                        innings_bowl[bowler]["runs"] += runs + int(extras.get("wides", 0)) + int(extras.get("noballs", 0))
                        for target in (by_season[season][bowler], all_players[bowler]):
                            target["conceded"] += runs + int(extras.get("wides", 0)) + int(extras.get("noballs", 0))
                            target["legalBalls"] += int("wides" not in extras and "noballs" not in extras)
                        for wicket in delivery.get("wickets", []):
                            dismissed = registry.get(wicket["player_out"], wicket["player_out"])
                            for target in (by_season[season][dismissed], all_players[dismissed]):
                                target["dismissals"] += 1
                            if wicket.get("kind") not in NON_BOWLER:
                                innings_bowl[bowler]["wickets"] += 1
                                for target in (by_season[season][bowler], all_players[bowler]):
                                    target["wickets"] += 1
                for pid, score in innings_bat.items():
                    for target in (by_season[season][pid], all_players[pid]):
                        target["innings"] += 1
                        target["highest"] = max(target["highest"], score)
                        target["hundreds"] += int(score >= 100)
                        target["fifties"] += int(50 <= score < 100)
                        target["nineties"] += int(90 <= score < 100)
                for pid, figures in innings_bowl.items():
                    for target in (by_season[season][pid], all_players[pid]):
                        target["bowlingInnings"] += 1
                        target["fiveWickets"] += int(figures["wickets"] >= 5)
                        if figures["wickets"] > target["bestWickets"] or (figures["wickets"] == target["bestWickets"] and figures["runs"] < target["bestRuns"]):
                            target["bestWickets"] = figures["wickets"]
                            target["bestRuns"] = figures["runs"]
    def formatted(items):
        return sorted(({"id": pid, "name": names.get(pid, pid), **v} for pid,v in items.items()),
                      key=lambda p: (-p["runs"], p["name"]))
    output = {"source": "Cricsheet", "license": "ODC-BY 1.0",
              "note": "Derived from available IPL ball-by-ball matches; season and career aggregates exclude Super Overs.",
              "players": formatted(all_players),
              "seasons": {season: formatted(items) for season, items in sorted(by_season.items(), reverse=True)},
              "matches": sorted(matches, key=lambda m: (m["date"], m["id"]), reverse=True)}
    (DATA / "ipl-records.json").write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Saved {len(matches)} matches, {len(all_players)} player profiles and {len(by_season)} seasons")

if __name__ == "__main__":
    main()
