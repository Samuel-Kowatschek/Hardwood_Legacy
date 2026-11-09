# Hardwood Legacy

Roguelike-Basketball-Karrierespiel im Browser. Ein Run = eine komplette Karriere (ca. 1-3 Min.), jede Season ein Knoten. Look im Stil früher Game-Boy-Spiele, 160x144 Pixel, nur Blau/Weiß/Orange.

## Starten

ES Modules brauchen einen lokalen HTTP-Server (kein Build-Step):

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen. Eigener Seed: `http://localhost:8000/?seed=ABC123`.

## Steuerung

| Aktion | Keyboard | Touch |
|---|---|---|
| A (OK / Werfen) | Space, Z, Enter | A-Button oder Tap auf den Screen |
| B (Zurück / Reroll) | X, Esc | B-Button |
| Richtung | Pfeiltasten / WASD | D-Pad |
| Ton an/aus | M | TON-Button |

## Ablauf

`Titel -> Spieler erstellen -> [Offseason-Karte -> Events -> Season-Sim -> Playoffs (Key Games) -> Awards -> Retire?] -> Legacy-Karte`

- **Retire-Gamble:** Nach jeder Season zeigt der Screen den Legacy-Score "wenn du jetzt retirest", Trend, Verletzungsrisiko und Multiplikator. *Went Out On Top* (+25 %), *Last Dance* (+15 %), *Overstayed* (-10 % pro schwacher Season in Folge, kumulativ). Harter Cap: 15 Seasons oder Körper = 0.
- **Arcade-Momente** (Play-In, Conf Finals, Finals, 50-Punkte-Chance): Shot-Meter, Buzzer-Beater (Clutch), Fast-Break, Defense-Stop. Ergebnis verschiebt die Siegchance, ist aber kein reines Pass/Fail.
- **Perks** nach Season 1, 3, 6, 9, 12 (1 aus 3) mit Synergien.
- **Meta-Progress:** Playmaker, Lockdown und einige Perks werden freigeschaltet; Hall of Fame (Top 10) in `localStorage`; frühere Spieler können als Rivalen zurückkehren.

## Projektstruktur

```
index.html
assets/fonts/            Press Start 2P (OFL, lokal eingebunden)
data/nba_names.json      Rohdaten für den Parodie-Generator
tools/export_nba_names.py  erzeugt data/nba_names.json aus nba_api
src/main.js              Game-Loop, Scaling, Szenen + Transitions
src/flow.js              Run-Ablauf (Season-Loop, Playoffs, Key Games)
src/gfx.js, src/ui.js    Pixel-Font, Mini-Font, Textboxen, Menüs
src/input.js             Keyboard + Touch
src/scenes/              title, create, card, sim, log (Playoffs), awards, perk, retire, legacy, hof
src/arcade/              shotMeter, clutch, fastBreak, defenseStop
src/sprites/             prozeduraler Sprite-Generator (Layer + Palette-Swap)
src/names/               nameGen.js + overrides.json
src/systems/             rng, league, sim, awards, legacy, save, audio
src/data/                archetypes, cards, perks, balance (alle Tuning-Werte)
```

## Namen

Echte NBA-Namen sind nur Rohmaterial (`data/nba_names.json`). `src/names/nameGen.js` erzeugt daraus Parodien (Buchstaben tauschen, Silben ändern, Wortwitz-Overrides, Namen mischen) und prüft, dass nie ein echter Name im UI landet. Neu exportieren:

```bash
pip install nba_api
python3 tools/export_nba_names.py
```

## Balancing

Alle Werte stehen in `src/data/balance.js` (Score-Formel, Tiers, Retire-Multiplikator, Sim-Konstanten).
