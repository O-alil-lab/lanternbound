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
- **Four stages** linked by the Lantern Gate: Hollow Valley, **Crystal Caverns**, **Ember Hollow**
  (lava) and **Mistfall Lake** (night). Each has a giant **alpha** guardian (ground slams, shot rings,
  calls for help at half health) that you can capture after beating it. Beating an alpha opens the next stage.
- Characters turn to face where they go (front, three-quarter, side and back drawings, with an ink
  outline), and the camera can turn around you.
- "HD-2D" picture finish: bloom, tilt-shift blur, vignette and a colour grade per stage
  (switches itself off on slow devices; G toggles it).
- **Three languages**: English, Français, العربية (right-to-left layout), chosen on the title screen or with
  the language button in game. Texts live in `src/i18n.js`.
- **Fits every screen**: phones (upright or sideways), tablets and computers get their own HUD size,
  touch controls, camera distance and render resolution; notches and rounded corners are respected;
  full-screen button on phones.
- Adaptive synthesized music per stage (calm, combat and alpha layers), ambience (birds, river, cave
  drips, lava, crickets, owls), footsteps by surface, reverb.

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
| Talk / use the Lantern Gate | F / Enter | A near someone |
| Turn the camera | Z / X | ⟳ (top right) |
| Graphics quality | G | automatic |
| Sound: all → effects only → off | ♪ button | ♪ |

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
  map.js            ★ the valley layout (30×22 tile grid, legend at the top)
  i18n.js           ★ all texts in English, French and Arabic
  screen.js           device type, HUD scale, safe areas, camera distance, full screen
  stages.js         ★ the other stages: maps, looks, wild zones, alphas, unlock rules
  story.js          ★ dialogue and trainer teams
  ui.js               dialog, party, journal, shop windows, touch controls
  audio.js            sound engine: adaptive music, ambience, footsteps, effects (all synthesized)
src/3d/               the 3D game (ES modules)
  world.js            builds a stage: terrain, water/lava, trees/spires, grass, crystals, light, particles
  actors.js           characters as 3D billboards, weapon and lantern models
  fx.js               particles, floating text, attack warnings, swing trails
  post.js             bloom, tilt-shift, vignette, colour grade (lib/jsm = Three.js add-ons)
  hud.js              HUD, title / starter screens, weapon shop
  game.js             input, movement, weapons, AI, capture, trainer fights, camera
assets/               character art (front, three-quarter, side and back views)
```

The 2D Phaser version lives on the `phaser-2d` branch.

## License

Code: MIT (`LICENSE`). Three.js: MIT (`lib/THREE-LICENSE`).
Character art in `assets/`: © the Lanternbound creator — not covered by the MIT license.
