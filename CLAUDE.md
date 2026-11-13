# CLAUDE.md – Hardwood Legacy

Projektwissen für Claude (und Menschen), die an diesem Repo arbeiten. Sprache im Team: Deutsch. Code-Kommentare: Deutsch, Bezeichner: Englisch.

## 1. Was ist das?

**Hardwood Legacy** ist ein Roguelike-Basketball-Karrierespiel im Browser. Ein Run = eine komplette Karriere (Draft bis Retire), jede Season ist ein Knoten. Look im Stil früher Game-Boy/Gen-1-Spiele (nur der Look, keine fremden Assets/Namen).

- Logische Auflösung **160x144**, ganzzahlig hochskaliert (`image-rendering: pixelated`)
- **Vanilla JS + Canvas, ES Modules, kein Framework, kein Build-Step**
- Sprachen: **Englisch (Standard), Deutsch, Bosnisch**
- Aktuelle Version: siehe `src/version.js` (wird unten links angezeigt)

## 2. Starten, Testen, Deployen

```bash
python3 -m http.server 8000      # ES Modules + fetch brauchen einen HTTP-Server (file:// geht nicht)
```
Dann `http://localhost:8000`. Eigener Seed: `?seed=ABC123`.

- **Kein Build, kein npm.** Alles, was im Repo liegt, wird so ausgeliefert.
- **Hosting:** Cloudflare, deployt automatisch von Branch `main` (Build-Command leer, Output `/`). Domain: `hardwood-legacy.samus-arcade.com`. `.nojekyll` ist noch von GitHub Pages vorhanden.
- **Domain-Umzug:** `src/migrate.js` (normales Script, im `<head>` zuerst geladen) leitet die alte Domain `hardwood-legacy.kowatschek-s.workers.dev` auf die neue weiter und nimmt die `hwl_*`-Spielstände im Link-Anker (`#hwlmigrate=`) mit; die neue Domain führt sie idempotent zusammen. Die alte Domain muss dafür weiter dieselbe Version ausliefern.
- **Workflow:** Entwickelt wird auf einem Feature-Branch (bisher `claude/gallant-fermi-p97hzi`), Merge nach `main` per Pull Request. Nicht direkt auf `main` committen.
- **Version:** Bei jedem Release `src/version.js` hochzählen (z. B. `v0.8.3` -> `v0.8.4`).
- **Tests:** Es gibt keine Test-Suite. Geprüft wird mit
  - `node --check` für jede geänderte Datei,
  - Node-Skripten, die Systeme direkt importieren (Sim, Karten, Namen; `globalThis.matchMedia` stubben, weil `input.js` es nutzt),
  - Playwright (Chromium vorinstalliert) gegen den lokalen Server: Szenen per `import('/src/main.js')` -> `game.set(...)` öffnen, Tasten drücken, Canvas-Screenshots ansehen.
- Die echten NBA-Namen (`data/nba_names.json`) neu erzeugen: `pip install nba_api && python3 tools/export_nba_names.py`.

## 3. Projektstruktur

```
index.html                 Canvas, Touch-Pad, Button-Leiste, CSS (Popups, Layout, Farb-Variablen)
assets/fonts/              Press Start 2P (OFL, lokal eingebunden)
data/nba_names.json        Rohdaten (echte Namen) für den Parodie-Generator – erscheinen nie im UI
tools/export_nba_names.py  Export-Skript (nba_api)
src/
  main.js        Boot, Game-Loop (feste 60 Updates/s), Scaling, Szenen + Transitions, Overlays, globale Tasten
  flow.js        Run-Ablauf (async "Director"): Intro, Season-Loop, Regular Season, Spotlight/All-Star/50/100-Punkte, Playoffs
  gfx.js         Farbschemata, Pixel-Font (8px), Mini-Font (3x5), Boxen, Cursor, Pfeile, Balken, Ball
  ui.js          Typewriter, TextBox, Menu, Status-Leiste, Header (mit Zurück-Button), bigText
  input.js       Tastatur/Touch/Maus, klickbare Regionen, Richtungs-Pad für Maus in Minigames
  helpModal.js   HTML-Popups: How to Play, Unlocks, Seed-Eingabe, Teilen
  version.js     Versionsnummer
  migrate.js     Spielstände von der alten Domain übernehmen (Weiterleitung mit Daten im Link-Anker)
  config.js      Betreiber-Einstellungen: PayPal.me-Name für den Kaffee-/Trinkgeld-Button (leer = Button versteckt)
  i18n/          index.js (t()), en.js, de.js, bs.js + cards.<lang>.js (Kartentexte)
  scenes/        title, create, daily, teamselect, freeagency, card, sim, log (Playoffs), awards, perk, retire, legacy,
                 hof, options, practice, stats (Overlay), quit (Overlay), message, scene (Basisklasse)
  arcade/        arcadeScene (Rahmen), common (Battle-Layout, Meter), shotMeter, clutch, fastBreak,
                 defenseStop, drive, rebound, pass, freeThrow, post (Standing Dunk), block (Rim Protector), dunkContest
  sprites/       parts.js (Pixel-Layer als Strings), palette.js (Haut, Haare, Teamfarben), spriteGen.js
  names/         nameGen.js (Parodie-Generator), overrides.json (Wortspiele, Teamnamen, Städte)
  systems/       rng, league, freeagency, testmode (Run/Liga erzeugen, Speichern/Laden), sim, awards, legacy, save, audio
  data/          archetypes, perks, cards, balance (alle Tuning-Werte), scoreDist (Perzentil-Referenz)
```

## 4. Architektur

### Game-Loop und Szenen (`main.js`)
- `game.set(scene, transition)` wechselt die Szene (`'wipe'`, `'flash'` = Kampf-Blitz vor Key Games, `'none'`).
- `game.show(scene, transition)` gibt ein Promise zurück, das mit `scene.finish(value)` aufgelöst wird. Darauf baut der async `flow.js` auf.
- Szenen haben `enter(game)`, `update(game)`, `draw(ctx, game)`. `enter` kann mehrfach aufgerufen werden (z. B. Rückkehr aus Overlay/Arcade) – Zustand im Konstruktor anlegen oder in `enter` gegen Doppel-Init schützen.
- **Overlays** (`game.overlay`): Stats (S), Optionen (O), Hauptmenü-Rückfrage (Q). Solange ein Overlay offen ist, steht die Szene.
- `scene.noStats = true` verhindert das Stats-Overlay (Menüs, Minigames).
- `game.run` ist nur während eines Runs gesetzt.

### Run-Ablauf (`flow.js`)
`playRun(game, run, { resume })` -> Intro (Draft + Rivale) -> `seasons()`:
1. **Autosave** (Spielstand zu Beginn jeder Season)
2. Offseason-Karte
3. Regular Season (`SimScene`), unterbrochen bei ca. 28–38 % (Event-Karte, ggf. mit Minigame danach), 42–50 % (Spotlight-Spiel / 50-Punkte / sehr selten 100-Punkte), 56 % (All-Star Weekend), 66–80 % (Event-Karte, 60 %)
4. **Season Awards** (ROY, All-Star, MVP, DPOY, Scoring Title, All-Star-Contest). ROY, MVP und DPOY zeigen jedes Jahr den Gewinner, auch wenn man selbst verliert (Namen aus eigenem RNG-Teilstrom, Haupt-Seed bleibt gleich)
5. Playoffs (Play-In ab Platz 7–10, echtes Bracket; Key Games in Conf Finals/Finals)
6. **Postseason** (Ring, Finals MVP, Meilensteine, Alterung)
7. Retire-Entscheidung (Score verdeckt, Multiplikator sichtbar) -> ggf. Perk-Wahl (nach Season 1, 3, 6, 9, 12)
8. Am Ende `LegacyScene` (Score, Ranking, Unlocks, Teilen)

**Minigame-Wirkung:** Regular-Season-Minigames verschieben nur die Award-Chancen (`applyRegularArcade` in `systems/awards.js`). Playoff-Minigames: `q >= 0.5` (`WIN_Q` in `playSeries`) = Spiel sicher gewonnen, sonst Sim mit Minigame-Bonus; zählen für den Finals MVP.

**Free Agency:** Kartenoption `pickTeam: true` (Karten `freeagency`, `optout`) öffnet `scenes/freeagency.js`. Konsequenzen je Team in `systems/freeagency.js` (`faProfile`: Rang 1–4 Superteam/Ringjagd, 5–10 Contender, 11–20 fair, Rest viel Geld; Großstadt +Fame; Team des Rivalen -> neuer Rivale).

**Daily Seed** (`scenes/daily.js`): Seed `D` + YYYYMMDD. Archetyp aus `fork('dailyarch')`, Stats/Draft/Rivale fest (`hof: []`, keine Teamwahl, keine Rerolls), nur Name (HTML-Popup) und Look änderbar. 1x pro Tag: `meta.dailyDone` wird beim Start gesetzt; ein eingetippter Tages-Seed zählt ebenfalls als Daily.

**Testmodus** (Seed `TESTING` eintippen oder `?seed=TESTING`): zufällige Liga, alle Archetypen frei, `run.test = true`, Run zählt nicht für Meta/Unlocks/HoF.
- `systems/testmode.js`: `odds(run)` schätzt Chancen analytisch aus denselben Formeln wie `awards.js`/`sim.js` (All-Star, MVP, DPOY, Scoring, ROY, Playoffs, Ring, FMVP); `analyzeOption`/`analyzeTeam` rechnen Entscheidungen auf einer Run-Kopie (`cloneRun`) durch.
- Anzeige: Karten zeigen genaue Werte statt `+/++`, Sim-Szene zeigt Live-Chancen, Free Agency zeigt Chancen-Änderung je Team. Stats-Overlay (S) hat Zusatzseiten (`scenes/testpages.js`, Links/Rechts): Chancen, Liga (KI-Messlatten, Power Ranking, Rivale), Entscheidung.
- Bei Formeländerungen in `awards.js`/`sim.js` auch `testmode.js` anpassen. `run.cur.st` (laufende Season) wird dafür in `regularSeason` gesetzt.

### Run-Objekt (`systems/league.js`)
`createRun(seed, names, { archId, look, name, hof, teamId })` erzeugt:
- `seed`, `rng` (RNG mit speicherbarem `state`), `teams[30]` (Parodie-Teams mit `base`-Stärke, `colors`, `star`), `p` (Spieler), `rival`
- `seasonNo`, `year`, `log[]`, `retire { weakStreak, overstay }`, `cur` (nur aktuelle Season, nicht gespeichert), `usedCards[]`, `lastKinds[]`, `daily`
- Teamwahl: `pickForTeam` – schwaches Team = früher Pick (mehr Talent).
- Speichern/Laden: `serializeRun(run)` / `restoreRun(data)`; `save.saveRun/loadRun/clearRun` (genau ein Slot).

### Simulation (`systems/sim.js`)
- `ovr(p)` = 50 % Form + 50 % gewichtete Skills (Gewichte je Archetyp).
- Season in Abschnitten: `startSeason` -> `simTo(run, st, game)` -> `finishSeason`. Verletzungen pro Abschnitt.
- Playoff-Spiele: `gameProb` aus Teamstärke (`myPower` inkl. OVR, Chemie, Perks, Karten-Boni).
- `applyAging` am Saisonende (Form-Wachstum bis zum verdeckten Potenzial, Körper-Abbau ab 27).

### Zufall
- `systems/rng.js`: mulberry32 mit sichtbarem Zustand (`rng.state`), `fork(label)` für unabhängige Teilströme. Gleicher Seed + gleiche Entscheidungen = gleicher Run.
- Für den Spieler sichtbare Zufälle immer über `run.rng`, nie `Math.random()` (sonst sind Seeds nicht reproduzierbar).

## 5. Inhalte

### Karten (`data/cards.js` + `i18n/cards.<lang>.js`) – aktuell 313
- Definition: `{ id, when: 'off'|'mid'|'late'|'any', cond, w, opts: [...] }`
  - `cond`: Funktion oder Kurzname aus `COND` (`young`, `vet`, `hurt`, `s2`, `strong`, `weak`, `ath`, `fame30`…`fame55`)
  - Option: `fx` (Änderungen), `risk: { p, fx, msg, special }` (versteckt, Hinweis "RISK?"), `special` (z. B. `trade`, `superteam`, `maxdeal`, `joinrival`, `hometown`, `bigmarket`, `traderandom`, `mentor`, `coin`), `hint`, `mystery`
  - `fx`-Schlüssel: Kernwerte `form body chem fame`, Skills `sho pla def ath clu`, Team `base`, Season `power playoffPower usage injuryGames rivalBoost`
- Hinweise (`SHOT+`, `FAME++`, `RISK?`, `MINIGAME`) werden automatisch aus `fx` erzeugt (`hintFor`).
- **Karten mit Minigame:** Option mit `arcade: { kind, good: {fx}, bad: {fx}, shots?, contest?, need? }`. Nach der Entscheidung startet `showCard` (in `flow.js`) das Minigame; Ergebnis (`q >= need`, Standard 0,5) bestimmt `good`/`bad`. Wer die andere Option wählt, bekommt kein Minigame. Optionale Texte je Karte: `cards.<id>.p` (Einleitung), `.g` (Erfolg), `.b` (Misserfolg), sonst generische `cardx.play*`.
- Jede Karte kommt pro Run höchstens einmal (`run.usedCards`).
- **Textlimits** (sonst Überlauf/zu viele Seiten): Titel ≤ 17 Zeichen, Text ≤ 4 Zeilen à 17 Zeichen (mit langem `{name}` testen!), Optionen ≤ 17 Zeichen. Neue Karte = Eintrag in `cards.js` **und** in allen drei `cards.<lang>.js`.

### Minigames (`arcade/`)
| kind | Name | Steuerung |
|---|---|---|
| `shot` | Shot Meter (3 Würfe, Dreier-Contest 5 + Moneyball) | SPACE im Orange, Weiß = And One |
| `clutch` | Buzzer-Beater | 1 Wurf, Uhr, Fakes verschieben Zone |
| `fast` | Fast Break | SPACE hämmern -> Pause "DUNK IT NOW!" -> Timing |
| `defense` | Defense Stop | Pfeil im Takt |
| `drive` | Drive | Hoch/Runter Spur, Abschluss Dunk/Korbleger |
| `rebound` | Rebound | Links/Rechts, SPACE springen |
| `pass` | Playmaker | Pfeil zum freien Mitspieler |
| `ft` | Freiwürfe | Pfeile gegen Drift (mit Trägheit), Brett-Rechteck = Bank Shot |
| `post` | Standing Dunk | SPACE halten/loslassen, Block vermeiden |
| `block` | Rim Protector | Kreis schrumpft auf orange Zone zu, SPACE wenn er drin ist (Kreis zeigt echten Wurfzeitpunkt, Pumpfakes nur langsamer) |
| `dunkc` | Dunk Contest (nur All-Star Weekend / Karte / Training) | Dunk wählen (5 Stufen, schwerer = mehr Punkte), Marker stoppen; kein Verteidiger, nur Treffer oder Fehlversuch |

- `dunkc` ist nicht im normalen Pool (`pickArcadeKind` schließt `clutch` und `dunkc` aus).
- **Buzzer-Beater in der Serie:** Treffer = Spiel gewonnen, Fehlwurf = Serie verloren (`playSeries` in `flow.js`).
- Jede Klasse: `constructor(s)`, `update()`, `draw(ctx, tt)`, setzt `done`, `q` (0..1), `resultText`.
- Registrieren in `arcade/arcadeScene.js` (`GAMES`, `MOD_KEYS`), Texte in `arcade.intro.<kind>`, `arcade.names.<kind>`.
- Häufigkeit je Archetyp: `games`-Gewichte in `data/archetypes.js` (`pickArcadeKind` in `flow.js`).
- Skills und Perks verändern Zonen/Fenster (`arcadeMods` in `data/perks.js`).
- Maus: Richtungsspiele registrieren `input.dirPad(x, y, dead, mode)` – Klick relativ zur Mitte = Richtung, Mitte = OK.

### Archetypen und Perks
- Archetypen (`data/archetypes.js`): Sharpshooter, Slasher, Big Man (frei); Playmaker (All-Star), Lockdown (DPOY), Stretch Big (MVP), Two-Way Wing (Titel), Bucket Getter (Legacy 1000+), Unicorn (100-Punkte-Spiel).
- Perks (`data/perks.js`) mit Synergien; freischaltbar: Signature Move (Hall of Famer), Ice Veins (Finals MVP), Leader (5 Karrieren), Clutch Gene (3 Ringe), Endless Motor (15 Seasons), Showtime (Contest-Sieg), Gym Rat (OVR 90).
- Erfolge werden am Run-Ende in `meta.ach` gespeichert (`scenes/legacy.js`), Unlock-Tests lesen `meta.ach`.

### Legacy-Score (`systems/legacy.js`, Werte in `data/balance.js`)
- Ring 100, MVP 60, FMVP 40, DPOY 25, Scoring 20, All-Star 8, Meilenstein 15, ROY 10, 100-Punkte-Spiel +60, Contest 10, One-Team-Bonus, Fame-Bonus, Ringjagd-Malus.
- × Retire-Multiplikator: Went Out On Top +25 %, Last Dance +15 %, Overstayed −10/20/30 % … (min. 0,4).
- Tiers: 0 Role Player, 100 All-Star, 300 Franchise Legend, 600 Hall of Famer, 1000 GOAT-Debatte.
- Perzentil am Ende = Schätzung gegen simulierte Karrieren (`data/scoreDist.js`), keine echte globale Rangliste.

### Namen (`names/`)
- Spieler/Teams sind immer **Parodien**; echte Namen dürfen nie im UI erscheinen.
- Strategien: Wortspiel (gleicher Anfang, z. B. Haliburton -> Halibut), Spaß-Endung, Buchstabenregeln, Override-Tabelle. Prüfung gegen echte Namen.
- Teamnamen kommen aus `overrides.json` (`nickname`), z. B. Magicians, Clickers, Fakers.

## 6. UI-Regeln (wichtig)

- **Farben nur über `C`** aus `gfx.js` (`C.BG`, `C.DARK`, `C.WHITE`, `C.ORANGE`) – niemals Hex-Werte im UI. Schemata: `classic` (Standard, Blau/Weiß/Orange), `la`, `mono`, `spaceship`, `storm`. Sprites dürfen eigene Farben (Haut, Trikots) haben.
- **Schrift:** `text()` = Press Start 2P 8px (Glyphen 4x gerendert und abgetastet, ganzzahlige Positionen), `tiny()` = eigene 3x5-Schrift (nur Großbuchstaben, Umlaute -> AE/OE/UE, Akzente entfernt). Großbuchstaben mit Akzent (Ć, Š, Ž, Đ, Ü …) zeichnet `text()` selbst.
- **Zeilenlängen:** 8px-Text max. ~17–18 Zeichen pro Zeile; TextBox = 4 Zeilen à 17 Zeichen.
- **Innenabstand:** Text nicht direkt an Rahmen (Doppelrahmen ist 3px breit) – mind. ~5px Luft lassen.
- **Alle UI-Texte über `t('pfad', params)`** und in **en, de, bs** pflegen. Fehlende Keys fallen auf Englisch zurück. Tastennamen über `{ok}`, `{back}`, `{stats}` (Tastatur SPACE/ESC/S, Touch OK/BACK/STATS).
- **Maus/Touch:** Klickbares beim Zeichnen mit `input.region(x, y, w, h, hover, click)` registrieren (Menu-Widget macht das selbst). Gibt es keine Regionen, wirkt ein Klick wie OK. Menüs bekommen oben links einen Zurück-Button über `header(ctx, title, right, onBack)`.
- **Kaffee-Button:** `#tip-bar` (Desktop-Leiste) und `#tip-pad` (Touch) in `index.html`, Popup `openTip()` in `helpModal.js` mit PayPal.me-Links (`paypal.com/paypalme/<name>/<betrag><währung>`), Beträge in `src/config.js`.
- **Popups** (Hilfe, Unlocks, Seed, Teilen, Kaffee) sind HTML in `helpModal.js`; solange eines offen ist, ist `input.blocked` gesetzt.

## 7. Steuerung

| Aktion | Tastatur | Touch / Maus |
|---|---|---|
| OK | Space, Enter, Z | OK-Button, Klick/Tap |
| Zurück | Esc, X | BACK-Button, Zurück-Pfeil oben links |
| Richtung | Pfeiltasten | D-Pad, in Minigames Klick um die Mitte |
| Stats | S | STATS-Button, Klick auf "S=STATS" |
| Hilfe / Optionen / Hauptmenü | H / O / Q | Buttons unter dem Spiel bzw. im Pad |
| Ton | M | SOUND-Button |

## 8. Speicherung (`localStorage`, alles in try/catch)

| Key | Inhalt |
|---|---|
| `hwl_meta_v1` | runs, best, scores[], ach{}, unlocked[], totalRings, fmvps, bestTier, dailyDone |
| `hwl_hof_v1` | Hall of Fame (Top 10) |
| `hwl_settings_v1` | Sprache, Farbschema, Ton |
| `hwl_run_v1` | gespeicherter Run (ein Slot, Autosave zu Season-Beginn; Continue im Hauptmenü) |

Daten liegen pro Browser und Domain – kein Server, keine globale Rangliste.

## 9. Häufige Aufgaben – Checkliste

- **Neue Karte:** `data/cards.js` + Texte in `cards.en.js`, `cards.de.js`, `cards.bs.js`; Textlimits prüfen.
- **Neuer UI-Text:** Key in `en.js`, `de.js`, `bs.js`.
- **Neues Minigame:** Datei in `arcade/`, in `arcadeScene.js` registrieren, `arcade.intro/names` in allen Sprachen, Gewichte in `archetypes.js`, Hilfe-Seite "Minigames" ergänzen. Erscheint automatisch im Training.
- **Neuer Archetyp/Perk mit Unlock:** `unlock: { key, test: m => !!m.ach?.x }`, Erfolg in `scenes/legacy.js` setzen, Texte `unlock.<key>`, `arch.<id>`/`perks.<id>`.
- **Balancing:** nur `data/balance.js` (+ ggf. `scoreDist.js` neu erzeugen).
- **Release:** `src/version.js` hochzählen, committen, auf den Feature-Branch pushen, PR nach `main`.

## 10. Bekannte Grenzen

- Speichern nur zu Season-Beginn – Fortschritt innerhalb der Season geht beim Beenden verloren.
- Perzentil ist eine Schätzung; echte globale Ranglisten bräuchten einen Server (z. B. Supabase/Workers).
- Instagram-Teilen nur über das System-Teilen-Menü (Handy) bzw. Bild speichern.
- Bosnische Texte sind nicht muttersprachlich gegengelesen.
