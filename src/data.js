// ============================================================
// Lanternbound — game data
// Edit this file to change companions, moves, lanterns and trainers.
// ============================================================
window.LB = window.LB || {};

// ---------- Types ----------
// Each type is strong against exactly two others.
LB.TYPE_COLOR = {
  Grove: '#5f8a3c', Tide: '#2f7fa8', Ember: '#c8602a',
  Gale: '#6f84c0', Stone: '#8a7560', Glimmer: '#a46cbd', Plain: '#8f8576'
};
LB.STRONG = {
  Tide: ['Ember', 'Stone'], Ember: ['Grove', 'Glimmer'], Grove: ['Tide', 'Stone'],
  Gale: ['Grove', 'Glimmer'], Stone: ['Gale', 'Ember'], Glimmer: ['Gale', 'Tide']
};
// Damage multiplier when a move of type `atk` hits a companion of type `def`.
LB.eff = function (atk, def) {
  if (atk === 'Plain') return 1;
  if (LB.STRONG[atk].includes(def)) return 2;
  if (LB.STRONG[def].includes(atk) || atk === def) return 0.5;
  return 1;
};

// ---------- Moves ----------
// p = power, a = accuracy %, pri = priority, heal = fraction of max HP,
// st = [target 'self'|'foe', stat, stages], sec = secondary effect (50% chance)
LB.MOVES = {
  tackle:   { n: 'Tackle', t: 'Plain', p: 40, a: 100 },
  dart:     { n: 'Quick Dart', t: 'Plain', p: 40, a: 100, pri: 1 },
  pounce:   { n: 'Pounce', t: 'Plain', p: 55, a: 95 },
  mosslash: { n: 'Moss Lash', t: 'Grove', p: 55, a: 100 },
  thornfan: { n: 'Thornfan', t: 'Grove', p: 80, a: 85 },
  bloom:    { n: 'Bloom Mend', t: 'Grove', heal: 0.4 },
  spore:    { n: 'Spore Haze', t: 'Grove', st: ['foe', 'atk', -1] },
  rill:     { n: 'Rill Spray', t: 'Tide', p: 55, a: 100 },
  tidecrash:{ n: 'Tidecrash', t: 'Tide', p: 80, a: 85 },
  mist:     { n: 'Mist Veil', t: 'Tide', st: ['self', 'def', 1] },
  soak:     { n: 'Soak', t: 'Tide', p: 40, a: 100, sec: ['foe', 'spd', -1] },
  embernip: { n: 'Ember Nip', t: 'Ember', p: 55, a: 100 },
  hearth:   { n: 'Hearthblaze', t: 'Ember', p: 80, a: 85 },
  kindle:   { n: 'Kindle', t: 'Ember', st: ['self', 'atk', 1] },
  smoke:    { n: 'Smoke Puff', t: 'Ember', st: ['foe', 'spd', -1] },
  gust:     { n: 'Gust Slice', t: 'Gale', p: 55, a: 100 },
  skyfall:  { n: 'Skyfall', t: 'Gale', p: 80, a: 85 },
  tailwind: { n: 'Tailwind', t: 'Gale', st: ['self', 'spd', 2] },
  plume:    { n: 'Plume Shield', t: 'Gale', st: ['self', 'def', 1] },
  pebble:   { n: 'Pebble Shot', t: 'Stone', p: 55, a: 100 },
  cairn:    { n: 'Cairn Crash', t: 'Stone', p: 80, a: 85 },
  harden:   { n: 'Harden', t: 'Stone', st: ['self', 'def', 1] },
  quake:    { n: 'Quake Stomp', t: 'Stone', p: 65, a: 95 },
  prism:    { n: 'Prism Ray', t: 'Glimmer', p: 55, a: 100 },
  flare:    { n: 'Lantern Flare', t: 'Glimmer', p: 80, a: 85 },
  glow:     { n: 'Glow Mend', t: 'Glimmer', heal: 0.4 },
  dazzle:   { n: 'Dazzle', t: 'Glimmer', st: ['foe', 'atk', -1] }
};

// ---------- Lanterns (the capture device) ----------
LB.LANTERNS = {
  lantern: { n: 'Crystal Lantern', price: 20, col: '#5fd6e6', d: 'A reliable everyday lantern.', bonus: () => 1 },
  moss:    { n: 'Moss Lantern', price: 35, col: '#86c24e', d: 'Twice as likely to befriend Grove companions.', bonus: t => t === 'Grove' ? 2 : 1 },
  tide:    { n: 'Tide Lantern', price: 35, col: '#4aa8e0', d: 'Twice as likely to befriend Tide companions.', bonus: t => t === 'Tide' ? 2 : 1 },
  ember:   { n: 'Ember Lantern', price: 35, col: '#f08a3c', d: 'Twice as likely to befriend Ember companions.', bonus: t => t === 'Ember' ? 2 : 1 },
  sky:     { n: 'Sky Lantern', price: 35, col: '#b9c6f5', d: 'Twice as likely to befriend Gale companions.', bonus: t => t === 'Gale' ? 2 : 1 },
  dusk:    { n: 'Dusk Lantern', price: 45, col: '#b07cd6', d: 'Twice as likely to befriend Stone and Glimmer companions.', bonus: t => (t === 'Stone' || t === 'Glimmer') ? 2 : 1 },
  warden:  { n: 'Warden Lantern', price: 0, col: '#f2c35c', d: 'Never fails. Only the Warden gives these.', bonus: () => 99 }
};
LB.SHOP = [['lantern', 20], ['moss', 35], ['tide', 35], ['ember', 35], ['sky', 35], ['dusk', 45], ['salve', 15]];

// ---------- Companions ----------
// b = base stats [HP, ATK, DEF, SPD], m = four moves, cr = befriend ease (1 easy … 0.5 hard)
LB.MON = {
  Bellmoss:   { t: 'Grove', b: [70, 55, 75, 35], m: ['tackle', 'mosslash', 'bloom', 'thornfan'], cr: .5, d: 'A slow, patient grazer. Its bronze-ribbed fan hums softly when the forest is safe.' },
  Velouray:   { t: 'Gale', b: [50, 60, 45, 80], m: ['dart', 'gust', 'tailwind', 'skyfall'], cr: .6, d: 'Glides on warm air above the ridge, trailing ribbons of silk-like mist.' },
  Loomtail:   { t: 'Grove', b: [50, 55, 50, 70], m: ['dart', 'mosslash', 'spore', 'pounce'], cr: 1, d: 'Weaves its own tail from willow strips and tucks treasures inside the loops.' },
  Tasselk:    { t: 'Glimmer', b: [50, 60, 45, 75], m: ['dart', 'prism', 'dazzle', 'gust'], cr: .9, d: 'Its looping copper horns catch moonlight. The blue tassel tail signals friends.' },
  Puddlewick: { t: 'Tide', b: [65, 60, 60, 45], m: ['tackle', 'rill', 'mist', 'tidecrash'], cr: .5, d: 'Lounges in shallow puddles, fanning its glassy dorsal sail to keep cool.' },
  Clatterbud: { t: 'Gale', b: [50, 65, 45, 70], m: ['pounce', 'gust', 'plume', 'skyfall'], cr: .9, d: 'Wades the reeds on stilt legs. The bells on its crest clatter when it laughs.' },
  Rillspool:  { t: 'Tide', b: [45, 55, 50, 80], m: ['dart', 'soak', 'rill', 'tidecrash'], cr: .9, d: 'Skates across still water, winding river threads onto its spool-shaped body.' },
  Coralune:   { t: 'Tide', b: [65, 65, 55, 45], m: ['tackle', 'rill', 'dazzle', 'tidecrash'], cr: .7, d: 'Its lacy crown glows with moon-spots. Curious and gentle, it loves shiny stones.' },
  Hearthusk:  { t: 'Ember', b: [80, 65, 70, 25], m: ['tackle', 'embernip', 'harden', 'hearth'], cr: .5, d: 'Amber plates on its back stay warm all winter. Villages once gathered around it.' },
  Glimmerell: { t: 'Glimmer', b: [55, 70, 50, 65], m: ['dart', 'prism', 'glow', 'flare'], cr: .6, d: 'Its crystal tail coils like frost. Each scale refracts a different color.' },
  Quillora:   { t: 'Stone', b: [55, 55, 80, 40], m: ['pounce', 'pebble', 'harden', 'cairn'], cr: .9, d: 'Fans its blue-gold quills into a shield. Surprisingly fond of being petted.' },
  Saffrill:   { t: 'Ember', b: [50, 65, 45, 70], m: ['dart', 'embernip', 'smoke', 'gust'], cr: 1, d: 'A fluffy moth whose wing patterns shimmer like embers at dusk.' },
  Cairnib:    { t: 'Stone', b: [70, 70, 75, 30], m: ['tackle', 'pebble', 'quake', 'cairn'], cr: .6, d: 'Slate plates grow along its spine. It stacks stones to mark safe paths.' },
  Tumblefen:  { t: 'Stone', b: [60, 60, 75, 35], m: ['tackle', 'pebble', 'harden', 'mosslash'], cr: .8, d: 'Its woven shell is light but tough. It rolls downhill when excited.' },
  Drapplet:   { t: 'Grove', b: [65, 50, 65, 30], m: ['tackle', 'mosslash', 'bloom', 'rill'], cr: 1, d: 'A dewdrop snail with a frilled leaf collar. Leaves a sparkling, cooling trail.' },
  Nimbrook:   { t: 'Gale', b: [60, 70, 55, 65], m: ['pounce', 'gust', 'skyfall', 'rill'], cr: .6, d: 'A heron of cloud-soft feathers. Seen standing in mist on the highest rocks.' },
  Bristlefin: { t: 'Ember', b: [55, 70, 50, 70], m: ['dart', 'embernip', 'rill', 'hearth'], cr: .8, d: 'A playful otter whose fan-tail bristles glow hot after a swim.' },
  Opaloom:    { t: 'Glimmer', b: [80, 50, 65, 35], m: ['tackle', 'prism', 'glow', 'quake'], cr: .7, d: 'Covered in opal scales. Calm creatures gather around it to rest.' }
};
// Journal order
LB.DEX = ['Bellmoss', 'Puddlewick', 'Hearthusk', 'Loomtail', 'Tasselk', 'Saffrill', 'Drapplet', 'Quillora', 'Clatterbud',
  'Rillspool', 'Coralune', 'Bristlefin', 'Tumblefen', 'Opaloom', 'Glimmerell', 'Velouray', 'Cairnib', 'Nimbrook'];
LB.STARTERS = ['Bellmoss', 'Puddlewick', 'Hearthusk'];

// ---------- Trainers ----------
LB.TRAINERS = {
  Nera: 'A wandering lantern-keeper in a green cloak.',
  Ivo: 'A cheerful tinkerer who fixes broken lanterns.',
  Sana: 'A quiet ranger who knows every trail.',
  Tavi: 'A bold explorer with a crystal shard pendant.',
  Elin: 'A staff-bearer who reads the river currents.',
  Oren: 'A scholar who writes about every companion.'
};
// Default story roles; if the player picks one of these trainers, Ivo takes that role.
LB.ROLE_PREF = { mentor: 'Oren', rival: 'Tavi', ranger: 'Sana', angler: 'Elin', warden: 'Nera' };

// ---------- Wild zones (keyed by map tile character) ----------
LB.ZONES = {
  ',': { name: 'meadow', lv: [3, 6], t: ['Loomtail', 'Tasselk', 'Saffrill', 'Drapplet', 'Quillora'], bg: [0xe9f1cf, 0xbcd38f] },
  ';': { name: 'reeds', lv: [7, 10], t: ['Clatterbud', 'Rillspool', 'Coralune', 'Bristlefin', 'Drapplet'], bg: [0xdfeee8, 0x9cc4b4] },
  'g': { name: 'grove', lv: [9, 12], t: ['Tumblefen', 'Opaloom', 'Glimmerell', 'Velouray', 'Loomtail', '*'], bg: [0xdfe8cf, 0x7fa070] },
  'r': { name: 'ridge', lv: [11, 14], t: ['Cairnib', 'Nimbrook', 'Velouray', 'Quillora', 'Glimmerell'], bg: [0xefe6d6, 0xb9a98a] }
};
LB.ZONE_NAMES = { meadow: 'Whisper Meadow', reeds: 'Rillbank Reeds', grove: 'Amberroot Grove', ridge: 'Cairn Ridge', village: 'Hollow Village' };
LB.ENCOUNTER_RATE = 0.13;
