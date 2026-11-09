#!/usr/bin/env python3
"""Einmaliges Export-Skript: erzeugt data/nba_names.json aus den Static-Daten von nba_api.

    pip install nba_api
    python3 tools/export_nba_names.py

Die echten Namen sind nur Rohmaterial fuer den Parodie-Generator (src/names/nameGen.js)
und erscheinen im Spiel nie im Original.
"""
import json
import os
import unicodedata

from nba_api.stats.static import players, teams


def ascii(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").strip()


def main():
    out_players = []
    seen = set()
    for p in players.get_active_players():
        first, last = ascii(p["first_name"]), ascii(p["last_name"])
        if not first or not last:
            continue
        key = (first.lower(), last.lower())
        if key in seen:
            continue
        seen.add(key)
        out_players.append({"first": first, "last": last})

    out_teams = [
        {"city": ascii(t["city"]), "nickname": ascii(t["nickname"]), "abbr": t["abbreviation"]}
        for t in teams.get_teams()
    ]

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "data", "nba_names.json")
    with open(path, "w") as f:
        json.dump({"players": out_players, "teams": out_teams}, f, separators=(",", ":"))
    print(f"{len(out_players)} Spieler, {len(out_teams)} Teams -> {path}")


if __name__ == "__main__":
    main()
