# Lanternbound

A turn-based creature RPG built with [Phaser 3](https://phaser.io/) — plain HTML + JavaScript, no build step.

Six original trainers, eighteen wild companions, and crystal lanterns instead of capture balls.
Explore the world, battle in the tall grass, befriend companions with lanterns, beat the gatekeeper
trainers, and become a Lantern Warden.

## Play it

**Easiest (best quality):** run a tiny local web server in this folder, then open the address it prints.

```bash
# Option A — Python (already on macOS / most Linux)
python3 -m http.server 8000        # then open http://localhost:8000

# Option B — Node.js
npx serve .
```

Or in **VS Code**, install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.

**Also works:** double-click `index.html`. Browsers block WebGL from reading local image files,
so the game switches to Phaser's Canvas renderer in that case. Everything plays the same, but
colored particle and lantern tints show as white.

### Controls

| Action | Keyboard | Phone |
| --- | --- | --- |
| Move | Arrow keys / WASD | D-pad |
| Talk, continue text | Space / Enter | A button or tap the text |
| Battle choices | Click or press 1–8 | Tap |

## Project layout

```
index.html            page + HTML overlays (top bar, dialog, windows)
style.css             look of the overlays
lib/phaser.min.js     Phaser 3.90 (MIT license, see lib/PHASER-LICENSE.md)
src/
  data.js             ★ companions, moves, types, lanterns, trainers, wild zones
  state.js            stats formulas, save / load
  audio.js            sound effects (synthesized, no audio files)
  map.js              ★ world map layout + painted tileset
  ui.js               dialog, party, journal and shop windows
  story.js            ★ what each character says and who you battle
  main.js             Phaser game configuration
  scenes/
    BootScene.js      loads images, paints tiles and effect textures
    TitleScene.js     choose a trainer
    StarterScene.js   choose the first companion
    WorldScene.js     tilemap, movement, NPCs, wild encounters
    BattleScene.js    battles, particles, lantern throw
assets/
  trainers/*.png      the 6 trainers (front view)
  companions/*_front.png / *_back.png   the 18 companions
```

★ = the files you'll edit most.

## How to change things

**A companion's stats or moves** — `src/data.js`, `LB.MON`:
```js
Bellmoss: { t: 'Grove', b: [70, 55, 75, 35], m: ['tackle','mosslash','bloom','thornfan'], cr: .5, d: '…' },
//          type         HP  ATK DEF SPD      four moves (keys from LB.MOVES)           befriend ease
```

**Add a new companion**
1. Put `Name_front.png` and `Name_back.png` (transparent PNG, ~280 px tall) in `assets/companions/`.
2. Add an entry to `LB.MON` and its name to `LB.DEX` in `src/data.js`.
3. Add the name to a zone's `t:` list in `LB.ZONES` so it appears in the wild.

**A new move** — add to `LB.MOVES` (`p` power, `a` accuracy, `heal`, `st` stat change, `pri` priority).

**Lantern prices / effects** — `LB.LANTERNS` and `LB.SHOP` in `src/data.js`.

**Encounter rate** — `LB.ENCOUNTER_RATE` (0.13 = 13% per step in tall grass).

**The map** — `LB.buildMap()` in `src/map.js` paints the 30×22 grid with characters
(`,` meadow grass, `;` reeds, `~` water, `T` tree …). The legend is at the top of the file.

**Dialogue and trainer teams** — `src/story.js`.

**Battle formulas** — `LB.statsOf` (stats), `LB.need` (XP) in `src/state.js`; damage and befriend
chance in `BattleScene.useMove` / `BattleScene.throwLantern`.

## Ideas for next steps

- A second region (new map + zone list + gatekeeper trainer)
- Drawn art for the seven lanterns (currently painted in code in `BootScene.js`)
- Walking animations for trainers (4-direction sprite sheets)
- Music per zone
- Evolutions

## License

- **Code** (everything in `src/`, `index.html`, `style.css`): MIT — see `LICENSE`.
- **Phaser**: MIT, © Phaser Studio Inc. — see `lib/PHASER-LICENSE.md`.
- **Character art** in `assets/`: © the Lanternbound creator. Not covered by the MIT license;
  ask before reusing it outside this project.
