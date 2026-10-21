# Lanternbound

An open-source creature RPG built with [Phaser 4](https://phaser.io/) — plain JavaScript, no build step.

Six trainers, eighteen wild companions, and crystal lanterns instead of capture balls. Explore the
world, battle in the tall grass, befriend companions with lanterns, beat the gatekeeper trainers,
and become a Lantern Warden.

## Play

- **Phaser Create:** the same `src/` files run as a Phaser Create project (entry file `Game.js`).
  Images load from this repo through jsDelivr.
- **Locally:** in this folder run `python3 -m http.server 8000` (or `npx serve .`) and open
  http://localhost:8000. Double-clicking `index.html` also works (Canvas mode, tints show white).

| Action | Keyboard | Phone |
| --- | --- | --- |
| Move | Arrow keys / WASD | D-pad |
| Talk, continue | Space / Enter | A button or tap the text |
| Battle choices | Click or 1–8 | Tap |

## Files

```
index.html          local launcher (loads the scripts below in order; Game.js last)
lib/phaser.min.js   Phaser 4.1.0 (MIT)
src/
  data.js      ★ companions, moves, types, lanterns, trainers, wild zones
  state.js       stats, XP, save / load
  audio.js       synthesized sound effects
  map.js       ★ world map + tileset painted in code
  ui.js          HTML overlays (top bar, dialog, party, journal, shop, touch pad)
  story.js     ★ dialogue and trainer battles
  Boot.js, Preloader.js, Title.js, Starter.js, World.js, Battle.js   Phaser scenes
  Game.js        entry: Phaser config
assets/
  trainers/*.png, companions/*_front.png, *_back.png
```

Every file starts with `window.LB = window.LB || {};` so they work in any load order (Phaser Create
loads project files in its own order and the entry file last).

## Changing things

- **Stats / moves:** `LB.MON` in `src/data.js` — `b: [HP, ATK, DEF, SPD]`, `m:` four move keys from `LB.MOVES`.
- **New companion:** add `Name_front.png` + `Name_back.png` to `assets/companions/`, an entry in `LB.MON`,
  its name in `LB.DEX`, and in a zone list in `LB.ZONES`.
- **Lanterns / shop:** `LB.LANTERNS`, `LB.SHOP`. **Encounter rate:** `LB.ENCOUNTER_RATE`.
- **Map:** `LB.buildMap()` in `src/map.js` (legend at the top of the file).
- **Dialogue / trainer teams:** `src/story.js`.
- **Image location:** `LB.ASSET_BASE` in `src/ui.js`.

## License

- Code (`src/`, `index.html`): MIT — see `LICENSE`.
- Phaser: MIT, © Phaser Studio Inc. — `lib/PHASER-LICENSE.md`.
- Character art in `assets/`: © the Lanternbound creator. Not covered by the MIT license; ask before reusing it.
