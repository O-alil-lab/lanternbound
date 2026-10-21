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

| Action | Keyboard / mouse | Phone |
| --- | --- | --- |
| Move | WASD / arrows | Joystick |
| Attack (companion) | J or left-click (aims at the mouse) | A |
| Special move | K or right-click | SP |
| Dodge | Space / Shift | ⤳ |
| Lantern: aim, then throw | E, then E or click (R changes lantern type) | 🏮 |
| Capture ring | Space when the gold ring touches the circle (3 times) | any button |
| Switch companion / salve | Q or 1–6 / H | ⇄ / 🌿 |
| Talk | F / Enter | A near someone |

Wild companions flash red right before they attack — dodge! Knock one out and it is dazed for a few
seconds: throw a lantern and win the timing game to befriend it.

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
  Boot.js, Preloader.js, Title.js, Starter.js   start-up scenes
  World.js       real-time world: movement, companions, combat, lantern capture
  Hud.js         hearts, companion card, cooldowns
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
