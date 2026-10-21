/* ==========================================================================
   WILD SURVEY — content: types, creatures, moves, trainers
   All names/designs come from the user's 24 reference sheets.
   ========================================================================== */

const TYPES = {
  sap:     { name: 'Sap',     color: '#4c7a56', ink: '#2f5138', blurb: 'Moss, root & bloom' },
  tide:    { name: 'Tide',    color: '#2f6e93', ink: '#1d4a66', blurb: 'Spring, current & reef' },
  stone:   { name: 'Stone',   color: '#7c6a4c', ink: '#52432c', blurb: 'Quarry, cairn & ore' },
  gale:    { name: 'Gale',    color: '#7d99a7', ink: '#536d7a', blurb: 'Fog, wing & high wind' },
  glimmer: { name: 'Glimmer', color: '#7a5f9e', ink: '#503a72', blurb: 'Lantern-light, glass & dusk' },
  ember:   { name: 'Ember',   color: '#bd5f2c', ink: '#80391a', blurb: 'Sun, spark & dry grass' }
};

/* six-type wheel: each type strikes hard against the next two, and softly
   against the two that strike it. */
const WHEEL = ['ember', 'sap', 'tide', 'stone', 'gale', 'glimmer'];
const TYPE_CHART = (() => {
  const chart = {};
  WHEEL.forEach((t, i) => {
    chart[t] = {};
    for (let k = 1; k <= 5; k++) {
      const other = WHEEL[(i + k) % 6];
      chart[t][other] = k <= 2 ? 1.5 : (k >= 4 ? 0.65 : 1);
    }
  });
  return chart;
})();

const eff = (atkType, defType) => (TYPE_CHART[atkType] && TYPE_CHART[atkType][defType]) || 1;

/* --------------------------------------------------------------------------
   MOVES  — kind: phys | spec | status
   fx: heal (0-1 of max HP), buff/debuff {stat, stages}, status, ward, drain, recoil, crit
   -------------------------------------------------------------------------- */
const M = (id, name, type, kind, power, acc, pp, text, fx) =>
  ({ id, name, type, kind, power, acc, pp, text, fx: fx || {} });

const MOVES = {};
[
  /* ---- BELLMOSS (sap) ---- */
  M('moss_rush',  'Moss Rush',    'sap', 'phys', 42, 100, 20, 'Bellmoss barges forward, shedding a puff of spores.'),
  M('bell_toll',  'Bell Toll',    'sap', 'spec', 58,  95, 12, 'The pleated fan shivers and rings a low, green note.'),
  M('dew_sip',    'Dew Sip',      'sap', 'status', 0, 100, 8,  'It laps beads of dew from its own whiskers.', { heal: 0.34 }),
  M('root_grasp', 'Root Grasp',   'sap', 'phys', 64,  92, 10, 'Whisker-roots knot around the foe and pull.', { fx: {} }),

  /* ---- DRAPPLET (sap) ---- */
  M('shell_bubble','Shell Bubble','sap', 'spec', 46, 100, 18, 'A slow bubble of green glass drifts and pops.'),
  M('spore_puff', 'Spore Puff',   'sap', 'spec', 50,  95, 12, 'It huffs a cloud of drowsy spores.', { debuff: { stat: 'atk', stages: -1 } }),
  M('coil_retreat','Coil Retreat','sap', 'status', 0, 100, 10, 'It seals itself in, shell shining wetly.', { buff: { stat: 'def', stages: 2 } }),
  M('leech_dew',  'Leech Dew',    'sap', 'spec', 44,  95, 10, 'Dew crawls from the foe back to Drapplet.', { drain: 0.5 }),

  /* ---- OPALOOM (sap) ---- */
  M('opal_peck',  'Opal Peck',    'sap', 'phys', 46, 100, 20, 'A blunt, pearly beak snaps forward.'),
  M('bloom_burst','Bloom Burst',  'sap', 'spec', 74,  90, 6,  'Its feathers flare and burst into petals.', { recoil: 0.2 }),
  M('lull_hum',   'Lull Hum',     'sap', 'status', 0, 100, 8,  'A low hum; the meadow seems to lean in.', { heal: 0.26, debuff: { stat: 'spd', stages: -1 } }),
  M('feather_ward','Feather Ward','sap', 'status', 0, 100, 8,  'Opal scales lift like roof tiles.', { buff: { stat: 'res', stages: 2 } }),

  /* ---- PUDDLEWICK (tide) ---- */
  M('ripple_jet', 'Ripple Jet',   'tide', 'spec', 46, 100, 20, 'A needle of cold spring water.'),
  M('glass_fan',  'Glass Fan',    'tide', 'spec', 62,  95, 10, 'The frozen fan snaps open with a chime.'),
  M('hush_pool',  'Hush Pool',    'tide', 'status', 0, 100, 8,  'Still water beads along its back.', { heal: 0.3 }),
  M('mirage',     'Mirage',       'tide', 'status', 0, 95, 8,  'The air wavers; Puddlewick is not quite there.', { buff: { stat: 'spd', stages: 2 }, debuff: { stat: 'acc', stages: -1 } }),

  /* ---- RILLSPOOL (tide) ---- */
  M('skate_slash','Skate Slash',  'tide', 'phys', 40, 100, 22, 'A whipping stride across the surface film.'),
  M('thread_current','Thread Current','tide','spec',52, 100, 12, 'It spins the water into a tightening thread.', { debuff: { stat: 'spd', stages: -1 } }),
  M('skitter',    'Skitter',      'tide', 'status', 0, 100, 10, 'Eight feet, one nervous blur.', { buff: { stat: 'spd', stages: 2 }, buff2: { stat: 'def', stages: 1 } }),
  M('undertow',   'Undertow',     'tide', 'phys', 70,  88, 8,  'The current yanks the ground out from underfoot.'),

  /* ---- CORALUNE (tide) ---- */
  M('coral_grasp','Coral Grasp',  'tide', 'phys', 52,  95, 15, 'Warm polyps close around a limb.'),
  M('polyp_pulse','Polyp Pulse',  'tide', 'spec', 64,  92, 9,  'The whole reef lights and thumps.'),
  M('reef_mend',  'Reef Mend',    'tide', 'status', 0, 100, 7,  'Torn polyps knit themselves shut.', { heal: 0.38 }),
  M('brine_ink',  'Brine Ink',    'tide', 'status', 0, 100, 9,  'A cloud of salt ink blinds and stings.', { debuff: { stat: 'atk', stages: -1 }, debuff2: { stat: 'acc', stages: -1 } }),

  /* ---- BRISTLEFIN (tide) ---- */
  M('tail_swat',  'Tail Swat',    'tide', 'phys', 46, 100, 20, 'The broad rudder-tail cracks sideways.'),
  M('rudder_rush','Rudder Rush',  'tide', 'phys', 68,  92, 9,  'A full-bodied charge, tail steering.', { recoil: 0.18 }),
  M('pebble_toss','Pebble Toss',  'stone','phys', 45,  95, 12, 'It flings a polished river stone.'),
  M('sleek_dive', 'Sleek Dive',   'tide', 'status', 0, 100, 9,  'It slicks its fur flat and vanishes under.', { buff: { stat: 'spd', stages: 1 }, buff2: { stat: 'def', stages: 1 }, heal: 0.12 }),

  /* ---- CAIRNIB (stone) ---- */
  M('horn_ram',   'Horn Ram',     'stone','phys', 56,  96, 15, 'A short, terrible charge of stone wool.'),
  M('shale_fleece','Shale Fleece','stone','status', 0, 100, 10, 'Slate plates clatter down over its hide.', { buff: { stat: 'def', stages: 2 } }),
  M('quarry_slam','Quarry Slam',  'stone','phys', 74,  82, 7,  'It brings both forehooves down like a hammer.'),
  M('boulder_roll','Boulder Roll','stone','phys', 62,  95, 10, 'It tucks and rolls, wool grinding.'),

  /* ---- LOOMTAIL (stone) ---- */
  M('lash_coil',  'Lash Coil',    'stone','phys', 46, 100, 20, 'A flick of woven rope tail.'),
  M('weave_snare','Weave Snare',  'stone','status', 0, 96, 10, 'The tail unspools and knots around the foe.', { debuff: { stat: 'spd', stages: 2 } }),
  M('basket_guard','Basket Guard','stone','status', 0, 100, 9,  'It curls inside its own basket.', { buff: { stat: 'def', stages: 1 }, buff2: { stat: 'res', stages: 1 }, heal: 0.18 }),
  M('rope_whip',  'Rope Whip',    'stone','phys', 64,  92, 9,  'The braid cracks out like a rope end.'),

  /* ---- HEARTHUSK (stone) ---- */
  M('tusks',      'Tusks',        'stone','phys', 60,  96, 14, 'Copper tusks sweep in a wide arc.'),
  M('ember_trample','Ember Trample','ember','phys',62, 92, 10, 'The furnace-plates flare and it stamps down.'),
  M('hearth_glow','Hearth Glow',  'stone','status', 0, 100, 8,  'Banked heat rolls off its back.', { buff: { stat: 'def', stages: 1 }, buff2: { stat: 'atk', stages: 1 } }),
  M('quake_step', 'Quake Step',   'stone','phys', 76,  78, 6,  'One step. The whole field rings.'),

  /* ---- CLATTERBUD (gale) ---- */
  M('bell_peal',  'Bell Peal',    'gale', 'spec', 46, 100, 20, 'The filament bells answer all at once.'),
  M('marsh_step', 'Marsh Step',   'gale', 'status', 0, 100, 10, 'It lifts one long leg and simply steps away.', { buff: { stat: 'spd', stages: 2 } }),
  M('skewer_beak','Skewer Beak',  'gale', 'phys', 62,  94, 10, 'A stabbing thrust of the long bill.'),
  M('chime_ward', 'Chime Ward',   'gale', 'status', 0, 100, 8,  'A shimmering ring of chimes.', { buff: { stat: 'res', stages: 1 }, heal: 0.2 }),

  /* ---- NIMBROOK (gale) ---- */
  M('mist_wing',  'Mist Wing',    'gale', 'spec', 46, 100, 20, 'A buffet of fog-heavy feathers.'),
  M('vapor_veil', 'Vapor Veil',   'gale', 'status', 0, 100, 10, 'It wraps itself in gathered cloud.', { buff: { stat: 'spd', stages: 1 }, debuff: { stat: 'acc', stages: 1 } }),
  M('cloud_skewer','Cloud Skewer','gale','spec', 66,  94, 9,  'The beak punches through a bank of mist.'),
  M('drizzle_call','Drizzle Call','gale','status', 0, 100, 8,  'The heron calls and the sky answers softly.', { heal: 0.32 }),

  /* ---- TASSELK (ember) ---- */
  M('dune_dash',  'Dune Dash',    'ember','phys', 42, 100, 22, 'A flickering sprint on hot sand.'),
  M('heat_ribbon','Heat Ribbon',  'ember','spec', 58,  96, 12, 'The antler-ribbons stream out and burn.'),
  M('scorch_step','Scorch Step',  'ember','status', 0, 100, 10, 'It paws the ground into sparks.', { buff: { stat: 'spd', stages: 2 }, buff2: { stat: 'atk', stages: 1 } }),
  M('mirage_charge','Mirage Charge','ember','phys',72, 84, 7,  'Three shimmering bodies charge; only one is real.'),

  /* ---- TUMBLEFEN (ember) ---- */
  M('spark_roll', 'Spark Roll',   'ember','phys', 46, 100, 20, 'It rolls its warm sand-ball forward.'),
  M('gilded_shell','Gilded Shell','ember','status', 0, 100, 10, 'It settles, shell gleaming like a coin.', { buff: { stat: 'def', stages: 2 } }),
  M('scarab_snap','Scarab Snap',  'ember','phys', 62,  94, 10, 'Mandibles like hot pincers.'),
  M('sun_scrub',  'Sun Scrub',    'ember','spec', 52,  95, 12, 'It scours the foe with a blast of dry heat.', { debuff: { stat: 'atk', stages: 1 } }),

  /* ---- QUILLORA (ember) ---- */
  M('quill_flick','Quill Flick',  'ember','phys', 46, 100, 20, 'A handful of pointed quills.'),
  M('crown_bristle','Crown Bristle','ember','status',0, 100, 10, 'The crown fans wide and rattles.', { buff: { stat: 'def', stages: 1 }, buff2: { stat: 'atk', stages: 1 } }),
  M('ember_fan',  'Ember Fan',    'ember','spec', 66,  92, 9,  'Quills catch the last light and throw it.'),
  M('prickle_guard','Prickle Guard','ember','status',0, 100, 8,  'It balls up, quills out, breathing slow.', { heal: 0.24, buff: { stat: 'def', stages: 1 } }),

  /* ---- VELOURAY (glimmer) ---- */
  M('dusk_dust',  'Dusk Dust',    'glimmer','spec', 46, 100, 20, 'A drift of violet wing-dust.'),
  M('veil_wing',  'Veil Wing',    'glimmer','spec', 62,  96, 11, 'The huge wings fold and cut like scissors.'),
  M('lantern_lure','Lantern Lure','glimmer','status', 0, 100, 9,  'Two pale eyes become four, then six.', { buff: { stat: 'spd', stages: 1 }, buff2: { stat: 'spa', stages: 1 } }),
  M('moonfall',   'Moonfall',     'glimmer','spec', 82,  80, 5,  'A weight of pale light comes down like water.'),

  /* ---- GLIMMERELL (glimmer) ---- */
  M('braid_beam', 'Braid Beam',   'glimmer','spec', 46, 100, 20, 'A thread of cold light unspools.'),
  M('frost_loop', 'Frost Loop',   'tide', 'spec', 50,  96, 12, 'Its tail braids into a hoop of frost.'),
  M('prism_dance','Prism Dance',  'glimmer','status', 0, 100, 10, 'It dances, scattering small rainbows.', { buff: { stat: 'spd', stages: 1 }, buff2: { stat: 'spa', stages: 1 } }),
  M('shatterlight','Shatterlight','glimmer','spec', 72, 90, 7,  'The loop snaps; the light breaks into shards.'),

  /* ---- SAFFRILL (glimmer) ---- */
  M('glassdust',  'Glassdust',    'glimmer','spec', 46, 100, 20, 'Stained-glass scales flake away like sugar.'),
  M('sunscale',   'Sunscale',     'ember','spec', 56,  95, 12, 'Wings open flat to the sun and throw it back.'),
  M('wing_ward',  'Wing Ward',    'glimmer','status', 0, 100, 10, 'It folds itself into a lantern of wings.', { buff: { stat: 'res', stages: 2 } }),
  M('kaleido_blast','Kaleido Blast','glimmer','spec',76, 84, 6,  'Every scale a different colour, all at once.'),
  /* fallback used only when every other move is spent */
  M('wearied','Wearied Shove','none','phys', 34, 100, 999, 'Too tired for anything clever, it simply shoves.')
].reduce((acc, m) => { MOVES[m.id] = m; return acc; }, MOVES);

/* --------------------------------------------------------------------------
   CREATURES — 18 wild companions
   -------------------------------------------------------------------------- */
const C = (id, name, type, role, base, moves, lore, detail) =>
  ({ id, name, type, role, base, moves, lore, detail });

const CREATURES = [
  C('bellmoss', 'Bellmoss', 'sap', 'Bulwark',
    { hp: 78, atk: 48, def: 60, spa: 44, res: 54, spd: 26 },
    ['moss_rush', 'bell_toll', 'root_grasp', 'dew_sip'],
    'Grazes on dew and lichen in the shaded hollows. The bronze-ribbed fan is a bell: it rings a low wet note when the creature is content, and folds flat when it is not.',
    'Bronze-ribbed pleated fan · amber eyes · cream whiskers · soft mossy body'),
  C('drapplet', 'Drapplet', 'sap', 'Warden',
    { hp: 66, atk: 40, def: 56, spa: 52, res: 56, spd: 32 },
    ['shell_bubble', 'spore_puff', 'coil_retreat', 'leech_dew'],
    'A soft-bodied grazer under a shell that grows a fresh garden each season. It crosses meadows at a snail’s pace, leaving a trail of small green bubbles.',
    'Coral-like shell · bubble fringe · wet green glass lip'),
  C('opaloom', 'Opaloom', 'sap', 'Caretaker',
    { hp: 72, atk: 42, def: 52, spa: 56, res: 62, spd: 30 },
    ['opal_peck', 'bloom_burst', 'lull_hum', 'feather_ward'],
    'A patient, heavy companion whose feathers shift colour with its mood — rose when curious, ash when asleep. It hums at dusk and the meadow hums back.',
    'Iridescent petal-feathers · broad blunt beak · stout woolly legs'),
  C('puddlewick', 'Puddlewick', 'tide', 'Caster',
    { hp: 60, atk: 44, def: 46, spa: 62, res: 50, spd: 48 },
    ['ripple_jet', 'glass_fan', 'hush_pool', 'mirage'],
    'It sits in cold springs for hours, the great fan half-submerged. What looks like glass is a frozen ripple it can open and close like a hand.',
    'Frozen-ripple fan · deep indigo hide · pale tendril whiskers'),
  C('rillspool', 'Rillspool', 'tide', 'Skirmisher',
    { hp: 50, atk: 52, def: 38, spa: 46, res: 40, spd: 68 },
    ['skate_slash', 'thread_current', 'skitter', 'undertow'],
    'A skater, not a swimmer: it rides the surface film on eight light feet, spinning currents into thread. Naturalists count its legs twice and get two answers.',
    'Eight thin legs · pale green abdomen · surface-skimming gait'),
  C('coralune', 'Coralune', 'tide', 'Tidekeeper',
    { hp: 84, atk: 46, def: 54, spa: 60, res: 56, spd: 24 },
    ['coral_grasp', 'polyp_pulse', 'reef_mend', 'brine_ink'],
    'A walking reef. Its polyps light one by one as it dreams, and small fish follow it across the shallows as if it were a harbour.',
    'Living coral mantle · ringed pale eyes · hooked arm tips'),
  C('bristlefin', 'Bristlefin', 'tide', 'Bruiser',
    { hp: 68, atk: 66, def: 48, spa: 38, res: 44, spd: 52 },
    ['tail_swat', 'rudder_rush', 'pebble_toss', 'sleek_dive'],
    'An otter of the cold rivers, with a broad rudder-tail it uses like a tiller. It keeps a favourite pebble in each paw and will trade them, reluctantly.',
    'Rudder-fan tail · long white whiskers · chestnut river fur'),
  C('cairnib', 'Cairnib', 'stone', 'Bulwark',
    { hp: 74, atk: 64, def: 70, spa: 34, res: 52, spd: 28 },
    ['horn_ram', 'shale_fleece', 'quarry_slam', 'boulder_roll'],
    'Its fleece is flake-slate on stone skin. Rams use their horns to polish boulders, and a well-kept cairn is the surest sign one has been through.',
    'Spiral horns · slate-flake fleece · violet fetlock tufts'),
  C('loomtail', 'Loomtail', 'stone', 'Trickster',
    { hp: 58, atk: 52, def: 50, spa: 50, res: 48, spd: 56 },
    ['lash_coil', 'weave_snare', 'basket_guard', 'rope_whip'],
    'The tail is a living basket, woven from root-fibre and re-woven nightly. It sleeps curled inside itself and wakes already tangled.',
    'Woven rope tail · tall silk ears · narrow fox muzzle'),
  C('hearthusk', 'Hearthusk', 'stone', 'Colossus',
    { hp: 94, atk: 64, def: 66, spa: 44, res: 50, spd: 20 },
    ['tusks', 'ember_trample', 'hearth_glow', 'quake_step'],
    'A furnace on legs. The copper plates along its back bank heat through the cold nights, and it digs for warm springs with tusks worn smooth.',
    'Copper ember-plates · curved tusks · shaggy rust-coloured coat'),
  C('clatterbud', 'Clatterbud', 'gale', 'Warden',
    { hp: 62, atk: 50, def: 44, spa: 58, res: 52, spd: 50 },
    ['bell_peal', 'marsh_step', 'skewer_beak', 'chime_ward'],
    'A marsh wader hung with filament bells that ring before rain. It can stand on one leg for an hour, and does, mostly to be admired.',
    'Filament bells · teal wing-fan · long coral legs'),
  C('nimbrook', 'Nimbrook', 'gale', 'Caster',
    { hp: 56, atk: 44, def: 40, spa: 66, res: 50, spd: 60 },
    ['mist_wing', 'vapor_veil', 'cloud_skewer', 'drizzle_call'],
    'Its plumage gathers mist until the bird is mostly weather. Nests are only ever found in fog, and never twice in the same place.',
    'Cloud-plume wings · pale coral bill · slate-blue neck'),
  C('tasselk', 'Tasselk', 'ember', 'Skirmisher',
    { hp: 54, atk: 58, def: 40, spa: 54, res: 42, spd: 72 },
    ['dune_dash', 'heat_ribbon', 'scorch_step', 'mirage_charge'],
    'A dune-runner with ribboned antlers that trail heat. It crosses open sand at dusk, when the mirage makes three of it and the real one is the quietest.',
    'Twin ribbon antlers · rose-gold coat · indigo tail tuft'),
  C('tumblefen', 'Tumblefen', 'ember', 'Warden',
    { hp: 66, atk: 58, def: 58, spa: 44, res: 46, spd: 40 },
    ['spark_roll', 'gilded_shell', 'scarab_snap', 'sun_scrub'],
    'A scarab that rolls a ball of warm sand ahead of it all day. The gilt shell is polished by constant scrubbing and holds heat long after sunset.',
    'Gilded lattice shell · heavy amber mandibles · leaf-plate legs'),
  C('quillora', 'Quillora', 'ember', 'Bruiser',
    { hp: 70, atk: 62, def: 58, spa: 48, res: 48, spd: 38 },
    ['quill_flick', 'crown_bristle', 'ember_fan', 'prickle_guard'],
    'Its quills catch the last light of the day and hold it a moment. It shuffles through dry grass with great dignity, rattling softly, in no hurry at all.',
    'Crown of blue quills · ember-tipped spines · cream chest ruff'),
  C('velouray', 'Velouray', 'glimmer', 'Phantom',
    { hp: 66, atk: 50, def: 46, spa: 72, res: 56, spd: 62 },
    ['dusk_dust', 'veil_wing', 'lantern_lure', 'moonfall'],
    'The twilight companion. Its wings hold the exact colour of a sky ten minutes after sunset, which is why the survey has chased it for eleven years and recorded it twice.',
    'Dusk-violet wings · gold eye-spots · trailing pale silk-streamers'),
  C('glimmerell', 'Glimmerell', 'glimmer', 'Caster',
    { hp: 60, atk: 42, def: 44, spa: 68, res: 56, spd: 54 },
    ['braid_beam', 'frost_loop', 'prism_dance', 'shatterlight'],
    'A cave-dweller whose tail braids itself into frost-blue loops as it walks. It hums in the dark, and the humming keeps the loops perfectly round.',
    'Self-braiding tail · translucent blue ruff · violet speckled hide'),
  C('saffrill', 'Saffrill', 'glimmer', 'Caster',
    { hp: 62, atk: 46, def: 44, spa: 64, res: 54, spd: 52 },
    ['glassdust', 'sunscale', 'wing_ward', 'kaleido_blast'],
    'A sun-moth that dries its wings flat on warm stones each morning. Every scale is a different colour of glass, and every colour is slightly wrong for a moth.',
    'Stained-glass scales · four broad wings · feather-brush antennae')
].reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

const ORDER = ['bellmoss','drapplet','opaloom','puddlewick','rillspool','coralune','bristlefin',
               'cairnib','loomtail','hearthusk','clatterbud','nimbrook','tasselk','tumblefen',
               'quillora','velouray','glimmerell','saffrill'];

/* --------------------------------------------------------------------------
   TRAINERS — six, exactly as on the reference sheets
   -------------------------------------------------------------------------- */
const TRAINERS = {
  nera: {
    id: 'nera', name: 'Nera', type: 'glimmer', title: 'The Lantern-Bearer',
    team: ['glimmerell', 'saffrill'], level: 7,
    quote: 'Hold the light steady. Now — show me what follows it.',
    note: 'Gold-wrapped high bun, moss cloak, hexagonal crystal lantern. She has walked every hollow in the Reach twice, once by night.',
    from: 'Keeps a hexagonal crystal lantern and reads by it.'
  },
  ivo: {
    id: 'ivo', name: 'Ivo', type: 'stone', title: 'The Quarry-Hand',
    team: ['cairnib', 'loomtail', 'hearthusk'], level: 8,
    quote: 'Stone doesn’t hurry. Neither do I. Come on then.',
    note: 'Red curls, canvas overalls, a lantern and a satchel of survey stakes. He maps the mountain roads and is never lost, only diverted.',
    from: 'Maps the quarry roads with a stake and a grin.'
  },
  sana: {
    id: 'sana', name: 'Sana', type: 'tide', title: 'The Tide-Reader',
    team: ['puddlewick', 'coralune', 'bristlefin'], level: 13,
    quote: 'The water already knows you’re here. It told me before you climbed the bank.',
    note: 'Indigo scholar’s robe, magenta culottes, a dyed sash and a crystal jar at her hip. Reads currents the way other people read a page.',
    from: 'Reads currents; carries the tide in a stoppered jar.'
  },
  tavi: {
    id: 'tavi', name: 'Tavi', type: 'gale', title: 'The Wayfinder',
    team: ['clatterbud', 'nimbrook'], level: 6,
    quote: 'You saw the fog lift this morning? That was us. Well. Mostly them.',
    note: 'Mustard field-coat, green trousers, a compass-crystal held to the sky. Youngest of the six and the only one who never carries a map.',
    from: 'Holds up a compass-crystal and reads the wind.'
  },
  elin: {
    id: 'elin', name: 'Elin', type: 'ember', title: 'The Warden of Dry Grass',
    team: ['tasselk', 'tumblefen', 'quillora'], level: 10,
    quote: 'Dry season is a promise, not a threat. My companions keep it.',
    note: 'Beaded braids, long blue coat, a tall staff crowned with living crystal. She keeps the fire-lines and will not be hurried past them.',
    from: 'Plants her staff and lets the dry grass answer.'
  },
  oren: {
    id: 'oren', name: 'Oren', type: 'sap', title: 'The Field Naturalist',
    team: ['bellmoss', 'drapplet', 'opaloom'], level: 11,
    quote: 'Write down everything. Especially the parts you don’t believe yet.',
    note: 'Spectacles, coat pockets full of pencils, a notebook always open. Every creature in this survey was first described in his hand.',
    from: 'Writes everything down, including the weather.'
  }
};

const MENTORS = ['nera', 'ivo', 'sana', 'tavi', 'elin', 'oren'];
const SECONDS = { nera: 'saffrill', ivo: 'loomtail', sana: 'rillspool', tavi: 'nimbrook', elin: 'tumblefen', oren: 'drapplet' };
const STARTERS = { nera: 'glimmerell', ivo: 'cairnib', sana: 'puddlewick', tavi: 'clatterbud', elin: 'tasselk', oren: 'bellmoss' };
const ROUTE = ['tavi', 'nera', 'ivo', 'elin', 'oren', 'sana'];
const FINAL = { name: 'Velouray', title: 'The Twilight Veil', level: 17 };

if (typeof module !== 'undefined') {
  module.exports = { TYPES, TYPE_CHART, eff, MOVES, CREATURES, ORDER, TRAINERS, MENTORS, STARTERS, SECONDS, ROUTE, FINAL };
}
