# Wild Survey — the Verdant Reach

A turn-based creature-battler built from the 24 character reference sheets in your Drive folder
(`13qGEBXmWNfOe61bkV8w9pBFF1zQgwf3O`).

**Play it:** open `wild-survey.html` — one self-contained file (6.3 MB), no install, no internet needed.
Works in any modern browser, on desktop or phone.

**Phaser 3.90 is bundled inside** (vendored as `game/vendor/phaser.min.js`, not a CDN), so the
overworld runs offline and inside sandboxed previews too.

---

## What's in it

| | |
|---|---|
| **Walkable overworld** | The Verdant Reach, rendered with Phaser 3: 2 600 × 1 800 map, paths, pond, quarry, reed marsh, twilight glade, depth-sorted characters, fading canopies, touch pad on phones |
| **Six trainers** | Nera, Ivo, Sana, Tavi, Elin, Oren — pick one to study under, then find each rival standing on the map and challenge them |
| **Eighteen wild companions** | Bellmoss, Velouray, Loomtail, Tasselk, Puddlewick, Clatterbud, Rillspool, Coralune, Hearthusk, Glimmerell, Quillora, Saffrill, Cairnib, Tumblefen, Drapplet, Nimbrook, Bristlefin, Opaloom |
| **Six-type wheel** | Ember ▸ Sap ▸ Tide ▸ Stone ▸ Gale ▸ Glimmer ▸ Ember (each hits the next two hard, the two behind it softly) |
| **72 moves** | Four per creature, with status, drain, recoil, buffs, debuffs and scorch effects |
| **Campaign** | Six chapters (one rival each, ordered around your type matchup) then the finale: **Velouray, the Twilight Veil** — two phases, first one hidden |
| **Wild encounters** | All 18 companions roam their own biome — walk into one to study it, win, and it joins you or is stamped into the journal |
| **Camp** | Return to the tent to heal the team (or lose a fight and rest before trying again) |
| **Team building** | Record one of three wild companions after each chapter, four slots, swap the lead before every battle |
| **Journal** | Every creature has a full entry: lore, stat bars, moves, and all four views from the sheet |
| **Field tonic** | Four per battle — heals a third, but your rival gets a free move |
| **Fast forward** | Click the field during a battle to speed the whole thing up |
| **Save / resume** | Progress, team, journal and your position on the map are kept in the browser; the title screen offers *Resume the survey* |

## How the art was made

`game/tools/extract_art.py` pulls each 1586×992 sheet image out of the PDF, finds the four figures
(front / three-quarter / side / back) by connected-component analysis against the paper colour,
erases the annotation text baked into the raster, cuts the background by flood-filling from the
edges, and exports transparent 430 px WebP sprites.

- Front views → the rival's side of the field
- Back views → your side of the field (the sheets come with proper rear art)
- Three-quarter views → rosters, recruit cards, journal entries

That is **96 sprites** (24 characters × 4 views), 3.8 MB total, embedded as data URIs in the HTML.

Colours, layout and typography follow the reference sheets: cream paper, navy ink, bronze rules,
the same six-colour palette used for the type wheel.

## The map

| Place | Who / what |
|---|---|
| Mossgrove (NW) | Bellmoss, Drapplet, Opaloom |
| Stillwater (W pond) | Puddlewick, Rillspool, Coralune, Bristlefin |
| The Quarry (S) | Cairnib, Loomtail, Hearthusk |
| Reedmarsh (NE) | Clatterbud, Nimbrook |
| Dry Meadow (E) | Tasselk, Tumblefen, Quillora |
| Twilight Glade (N) | Velouray — the finale, behind standing stones |
| Camp (SW) | Your tent and lantern: rest to heal |

Controls: **WASD / arrows** to walk, **E** to speak, challenge, rest or enter the glade,
**click the arena** during a battle to fast-forward. On a phone, an on-screen D-pad and an
**E** button appear automatically.

The map hands everything to the same battle engine the journal screens use, so type matchups,
level scaling, recruits and the ending behave identically whichever way you get there.

## Renderer note

On machines with software GL (SwiftShader / llvmpipe) WebGL crawls, so the game detects that
at startup and rebuilds the scene on Phaser's Canvas renderer automatically. You can also force
it yourself by opening `wild-survey.html?renderer=canvas`.

## Rebuilding

```bash
cd game
python3 build.py          # writes ../wild-survey.html
```

Source is split for editing:

```
game/
  art/                96 transparent sprites (.webp)
  src/data.js         types, moves, creatures, trainers (all game content)
  src/engine.js       battle maths, AI, campaign and level scaling
  src/ui.js           screens, animation, sound, save/resume
  src/world.js        the Verdant Reach: Phaser 3 overworld, encounters, touch pad
  vendor/phaser.min.js  Phaser 3.90.0 (bundled inline at build time)
  src/style.css       the field-journal look
  src/template.html   page shell
  tools/extract_art.py  PDF → sprites
```

Balance was tuned by simulating thousands of battles headlessly; a naive bot clears about a quarter
of its runs, a human using type flags, tonics and switching does considerably better.

## Notes

- It is a fan-style original cast, not Pokémon IP — every design, name and colour here is yours.
- The interface is in English. Say the word and I can mirror it to French to match the sheets.
- Phaser is a framework, not an account — there was nothing to sign in to, so it is vendored
  straight into the build instead of loaded from a CDN.
