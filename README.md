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
| OK / Werfen | Space, Enter, Z | OK-Button oder Tap auf den Screen |
| Zurück | Esc, X | BACK-Button |
| Richtung | Pfeiltasten | D-Pad |
| Stats (jederzeit im Run) | S | STATS-Button |
| Ton an/aus | M | SOUND-Button |
| Hilfe (Popup) | H | HELP-Button |
| Optionen (auch im Run) | O | OPTIONS-Button |

Alles Auswählbare geht auch mit der Maus: Hover markiert, Linksklick wählt aus. In Richtungs-Minigames zählt, wohin du relativ zur Mitte klickst oder hältst (Spieler, Ball, Fadenkreuz); Klick auf die Mitte = OK. Unter dem Spiel gibt es Buttons für Hilfe, Optionen, Stats und Ton.

Sprache (Englisch/Deutsch/Bosnisch) und Farbschema (Classic, LA Special, Black/White, Spaceship, Storm) unter **Options**. Neue Sprache: `src/i18n/<lang>.js` + `cards.<lang>.js` anlegen und in `src/i18n/index.js` eintragen.

## Ablauf

`Titel -> Spieler erstellen -> [Offseason-Karte -> Season-Sim (unterbrochen von Events) -> Playoffs (Key Games) -> Awards -> Retire?] -> Legacy-Karte`

- **Spotlight-Spiele:** In der Regular Season gibt es Minigames, deren Ergebnis die Award-Chancen (MVP, All-Star, DPOY, Scoring Title) verschiebt. Playoff-Minigames zählen nur für Siegchance (Ring) und Finals MVP.
- **Spielstand:** Ein Run wird zu Beginn jeder Season automatisch im Browser gespeichert (ein Slot). Im Hauptmenü "Continue", im Run Optionen -> "Save & Quit".
- **Seeds:** Eigener Seed über "Enter Seed" im Hauptmenü (oder `?seed=`), um mit Freunden zu vergleichen.
- **Teamwahl:** Vor dem Draft das Team wählen: schwaches Team = früher Pick (mehr Talent), starkes Team = später Pick.
- **Training:** Im Hauptmenü alle 8 Minigames frei üben, mit einem zufällig generierten Spieler.
- **Unlocks:** 6 Archetypen- und 7 Perk-Freischaltungen über Erfolge (erstes All-Star-Team, DPOY, MVP, Titel, 100-Punkte-Spiel, Legacy 1000+, ...).
- **100-Punkte-Spiel:** extrem seltenes Event in der Regular Season.
- **All-Star Weekend:** Einladung zum Contest je nach Archetyp (Dreier, Dunk, Skills, Defense); Siege bringen Fame und Legacy-Punkte.
- **Teilen:** Am Ende Legacy-Karte teilen (Text kopieren, WhatsApp, Instagram, X, Facebook, Telegram, PNG).
- **Karten:** 313 Entscheidungs- und Event-Karten (viele starten danach ein Minigame) (Offseason, Saisonmitte, Saisonende), jede höchstens einmal pro Run.

- **Retire-Gamble:** Der Legacy-Score bleibt bis zum Retire verdeckt. Der Screen zeigt Multiplikator, Trend, Verletzungsrisiko und Resume. *Went Out On Top* (+25 %), *Last Dance* (+15 %), *Overstayed* (-10 % pro schwacher Season in Folge, kumulativ). Harter Cap: 15 Seasons oder Körper = 0.
- **Arcade-Momente** (Play-In, Conf Finals, Finals, 50-Punkte-Chance): Shot-Meter (mit And-One-Mitte), Buzzer-Beater, Fast-Break, Defense-Stop, Drive, Rebound, Playmaker, Freiwürfe, Standing Dunk. Jeder Archetyp bekommt alle, nur unterschiedlich gewichtet. Skills und Perks verändern Zonen und Zeitfenster.
- **Ende:** lokaler Rang, persönlicher Rekord und ein geschätztes Perzentil (Referenz: simulierte Karrieren in `src/data/scoreDist.js`). Hall of Fame und Rekorde liegen im `localStorage` des Browsers.
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
src/scenes/              title, options, help, create, card, sim, log (Playoffs), awards, perk, retire, legacy, hof, stats
src/i18n/                en.js, de.js, bs.js (+ cards.<lang>.js)
src/arcade/              shotMeter, clutch, fastBreak, defenseStop, drive, rebound, pass, freeThrow
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
