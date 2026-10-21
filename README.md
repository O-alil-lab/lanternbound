# Lanternbound

An open-source **3D creature action-adventure** built with [Three.js](https://threejs.org/) — plain
JavaScript, no build step. Six trainers, eighteen companions drawn as paper-style characters in a
3D world, crystal lanterns instead of capture balls.

**Play:** https://o-alil-lab.github.io/lanternbound/ (GitHub Pages)

- Real-time fights: your companion follows you and fights; wild companions roam the tall grass and
  attack — a red shape on the ground shows where they will strike, roll away!
- Three weapons: **Crystal Staff** (3-hit combo), **Sling** (Stone type), **Crystal Wand** (hold to
  charge, Glimmer type). Buy and upgrade them at the Lantern Stall.
- Knock a wild companion out, it gets dazed: aim and throw a lantern, then hit the timing ring 3 times.
- Live trainer fights against Sana, Tavi, Elin and the Warden Nera.

## Controls

| Action | Keyboard / mouse | Phone |
| --- | --- | --- |
| Move | WASD / arrows | Joystick |
| Weapon | Left-click or J (hold to charge the wand) | A |
| Choose weapon | 1 Staff · 2 Sling · 3 Wand | tap the weapon slots |
| Companion attack / special | Right-click or K / L | SP (special) |
| Roll | Space / Shift | ⤳ |
| Lantern (aim, then throw) | E, then E or click · R changes lantern type | 🏮 |
| Capture ring | Space when the gold ring meets the white ring | any button |
| Switch companion / salve | Q / H | ⇄ / 🌿 |
| Talk | F / Enter | A near someone |

## Run locally

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```
(ES modules need a web server; opening index.html from disk won't work.)

## Files

```
index.html            page + import map for Three.js
lib/three.module.js   Three.js r160 (MIT)
src/                  shared plain scripts
  data.js           ★ companions, moves, types, lanterns, trainers, wild zones, combat tuning
  state.js            stats, XP, save / load, damage formula
  map.js            ★ the world layout (30×22 tile grid, legend at the top)
  story.js          ★ dialogue and trainer teams
  ui.js               dialog, party, journal, shop windows, touch controls
  audio.js            synthesized sound effects
src/3d/               the 3D game (ES modules)
  world.js            terrain, river, forest, grass (wind), buildings, light, fireflies, leaves
  actors.js           characters as 3D billboards, weapon and lantern models
  fx.js               particles, floating text, attack warnings, swing trails
  hud.js              HUD, title / starter screens, weapon shop
  game.js             input, movement, weapons, AI, capture, trainer fights, camera
assets/               character art (front / back views)
```

The 2D Phaser version lives on the `phaser-2d` branch.

## License

Code: MIT (`LICENSE`). Three.js: MIT (`lib/THREE-LICENSE`).
Character art in `assets/`: © the Lanternbound creator — not covered by the MIT license.
