window.LB = window.LB || {};
// ============================================================
// Lanternbound — stages. Each stage has its own map (same tile size as
// the valley), its own look (sky, light, ground, trees, liquid, particles),
// music + ambience, wild zones and a giant ALPHA guardian.
// Portals (tile O) link the stages. Beating a stage's alpha unlocks the next.
//
// Extra tile letters used here:
//   O portal · A alpha arena · C crystal cluster · L lamp post
//   k crystal field · m mushroom beds · e ember scrub · h hot rocks
//   l lakeshore reeds · n moonlit meadow   (k m e h l n are wild zones)
// ============================================================
LB.SOLID.add('C'); LB.SOLID.add('L'); LB.SOLID.add('O');

Object.assign(LB.ZONES, {
  k: { name: 'crystal', lv: [13, 16], t: ['Glimmerell', 'Tasselk', 'Opaloom', 'Quillora'] },
  m: { name: 'mushroom', lv: [14, 17], t: ['Tumblefen', 'Cairnib', 'Drapplet', 'Loomtail'] },
  e: { name: 'scrub', lv: [17, 20], t: ['Saffrill', 'Bristlefin', 'Clatterbud', 'Hearthusk'] },
  h: { name: 'hotrocks', lv: [18, 21], t: ['Cairnib', 'Quillora', 'Saffrill', 'Nimbrook'] },
  l: { name: 'shore', lv: [21, 24], t: ['Rillspool', 'Coralune', 'Puddlewick', 'Drapplet'] },
  n: { name: 'moonmeadow', lv: [22, 25], t: ['Velouray', 'Nimbrook', 'Glimmerell', 'Bellmoss', 'Loomtail'] }
});
Object.assign(LB.ZONE_NAMES, {
  crystal: 'Shimmer Fields', mushroom: 'Glowcap Beds', caverns: 'Crystal Caverns',
  scrub: 'Cinder Scrub', hotrocks: 'Smoulder Rocks', ember: 'Ember Hollow',
  shore: 'Mistfall Shore', moonmeadow: 'Moonlit Meadow', lake: 'Mistfall Lake', arena: 'Alpha Arena'
});

function grid(fill = '.') { return Array.from({ length: LB.MH }, () => Array(LB.MW).fill(fill)); }
function tools(M) {
  const ok = (x, y) => x >= 0 && y >= 0 && x < LB.MW && y < LB.MH;
  const set = (x, y, c) => { if (ok(x, y)) M[y][x] = c; };
  const rect = (x1, y1, x2, y2, c) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(x, y, c); };
  const ell = (cx, cy, rx, ry, c, test) => { for (let y = 0; y < LB.MH; y++) for (let x = 0; x < LB.MW; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!test || test(M[y][x]))) M[y][x] = c; };
  const border = c => { rect(0, 0, LB.MW - 1, 0, c); rect(0, LB.MH - 1, LB.MW - 1, LB.MH - 1, c); rect(0, 0, 0, LB.MH - 1, c); rect(LB.MW - 1, 0, LB.MW - 1, LB.MH - 1, c); };
  const line = (pts, c) => { for (let i = 0; i < pts.length - 1; i++) { let [x, y] = pts[i]; const [x2, y2] = pts[i + 1]; while (x !== x2 || y !== y2) { set(x, y, c); if (x !== x2) x += Math.sign(x2 - x); else y += Math.sign(y2 - y); } set(x2, y2, c); } };
  return { set, rect, ell, border, line };
}

// ---------- the four stages ----------
LB.STAGES = {
  valley: {
    id: 'valley', name: 'Hollow Valley', sub: 'Meadows, reeds and the old grove', lv: '3–14',
    entry: [24, 17], shrine: [4, 19], respawn: [4, 19],
    build() { const M = LB.buildMap(); M[18][24] = 'O'; return M; },
    unlocked: () => true,
    music: 'valley',
    mood: {},
    theme: {
      sky: ['#f6e7c8', '#7fb4dc'], bg: '#bfdce9', fog: ['#c9e0d6', 26, 78], hemi: ['#e4f2ff', '#5d5233', 1.35], sun: ['#fff0d4', 2.6], exposure: 1.05,
      ground: { '.': '#7cab4c', ',': '#6a9a3c', ';': '#8eab5a', g: '#4d7c38', r: '#a8987a', ':': '#d3bc8c', F: '#7cab4c', '~': '#6f6a4c', '=': '#6f6a4c', T: '#557a37', R: '#a8987a', H: '#7cab4c', S: '#d3bc8c', W: '#7cab4c', M: '#7cab4c', P: '#a8987a', O: '#b9a98a' },
      outside: ['#4f6f33', '#6e7a45'], bank: '#6f6a4c',
      liquid: { color: '#3e8fb8', opacity: .84, rough: .12, metal: .25, y: -.26 },
      trees: 'valley', greens: ['#3f7a35', '#4c8a3b', '#5a9442', '#36692f', '#6a9c48', '#2f5f2c'], trunk: '#6b4528',
      grass: { ',': [16, .7, 1.05, ['#5f9a37', '#6fae42', '#4f8a2e', '#7ab64b']], ';': [12, 1.0, 1.5, ['#7d9a46', '#94a957', '#a8964f', '#6f8f3d']],
        g: [16, .7, 1.1, ['#3f7a2f', '#4b8a37', '#35672a', '#5c9441']], r: [6, .4, .7, ['#9a9a5c', '#a9a26a', '#8c8f52']], '.': [3, .22, .4, ['#7fb24f', '#8cbd58', '#6ea545']], F: [3, .22, .4, ['#7fb24f']] },
      flowers: ['#e8c34a', '#e07a5f', '#f4f1e8', '#b58ad6', '#f29fc5'], rock: '#8f8a80',
      mountains: ['#6f8a6a', '#7d9277', '#64806a'], hills: 1,
      particles: { kind: 'fireflies', color: '#fff3a0', n: 150 }, falling: { kind: 'leaves', colors: ['#d98a2b', '#c9b03a', '#8fb04a', '#b8562a'] },
      clouds: '#ffffff', portal: '#9feaf2'
    }
  },

  caverns: {
    id: 'caverns', name: 'Crystal Caverns', sub: 'Glowing crystals under the mountain', lv: '13–17',
    entry: [4, 17], shrine: [7, 19], respawn: [6, 18],
    alpha: { sp: 'Opaloom', lvl: 20, at: [23, 5], title: 'Prismaw the Opaloom Alpha' },
    build() {
      const M = grid('.'), { set, rect, ell, border, line } = tools(M);
      ell(6, 5, 5, 3.6, 'k');                                  // crystal field (NW)
      ell(22, 16, 6, 3.6, 'm');                                // glowcap beds (SE)
      ell(13.5, 12, 2.6, 3.4, '~');                            // underground pool
      ell(22.5, 5, 5.2, 3.3, 'A');                             // alpha arena (NE)
      line([[4, 17], [4, 11], [9, 11], [9, 7]], ':'); line([[9, 7], [12, 7], [12, 5], [17, 5]], ':');
      line([[9, 11], [11, 11], [11, 15], [17, 15], [17, 9], [20, 9]], ':');
      rect(12, 15, 15, 15, '=');                               // stone walkway across the pool's end
      [[18, 2], [27, 2], [17, 7], [27, 8], [2, 10], [10, 2], [8, 14], [10, 19], [25, 11], [15, 3], [6, 9], [19, 19]].forEach(([x, y]) => set(x, y, 'C'));
      [[2, 13], [12, 18], [20, 12], [26, 13], [16, 19], [13, 3], [3, 3], [14, 9], [7, 15], [27, 19]].forEach(([x, y]) => set(x, y, 'T'));
      [[6, 13], [24, 13], [19, 2], [11, 9]].forEach(([x, y]) => set(x, y, 'R'));
      set(3, 18, 'O'); set(7, 19, 'S');
      border('T');
      return M;
    },
    unlocked: G => !!(G.beat && G.beat.rival),
    lockText: 'Beat your rival in the valley',
    music: 'caverns',
    mood: { tint: [.95, .98, 1.08], lift: [.01, .01, .04], sat: 1.12, vig: .45, bloom: .5, threshold: .82 },
    theme: {
      sky: ['#06060c', '#120f22'], bg: '#0a0a14', fog: ['#151430', 24, 72], hemi: ['#8a8fd0', '#2a2238', 1.25], sun: ['#b0c4ff', 1.4], exposure: 1.2,
      ground: { '.': '#3d3a4e', ':': '#5b556c', k: '#3a4560', m: '#33463f', '~': '#1c2334', '=': '#6a6478', T: '#2e2b3a', R: '#4a4558', C: '#3a4560', A: '#4a3f5e', O: '#5b556c', S: '#5b556c' },
      outside: ['#211f2c', '#2c2838'], bank: '#252233',
      liquid: { color: '#1f6f8f', emissive: '#0c3c55', opacity: .82, rough: .05, metal: .4, y: -.26 },
      trees: 'spire', greens: ['#3d3850', '#4a4360', '#352f48', '#55497a'], trunk: '#2e2a3a', tipGlow: '#8fe9ff',
      grass: { k: [8, .25, .55, ['#7fe6f5', '#b48cff', '#9fd8ff']], m: [10, .3, .7, ['#5fe0a8', '#7ff0c0', '#4fb890']], '.': [1, .15, .25, ['#4b5a6a']] }, grassGlow: .8,
      mushrooms: ['m', 'k'], flowers: null, rock: '#575168',
      mountains: null, hills: 3.2,
      particles: { kind: 'motes', color: '#9feaf2', n: 180 }, falling: null,
      clouds: null, portal: '#b48cff', crystals: ['#7fe6f5', '#b48cff', '#ff9fe0']
    }
  },

  ember: {
    id: 'ember', name: 'Ember Hollow', sub: 'Rivers of lava and cinder scrub', lv: '17–21',
    entry: [4, 17], shrine: [7, 19], respawn: [6, 18],
    alpha: { sp: 'Saffrill', lvl: 24, at: [22, 4], title: 'Cindermane the Saffrill Alpha' },
    build() {
      const M = grid('.'), { set, rect, ell, border, line } = tools(M);
      ell(7, 5, 5.5, 3.2, 'e');                                // cinder scrub (NW)
      ell(21, 16.5, 6.5, 3.4, 'h');                            // smoulder rocks (SE)
      for (let x = 0; x < LB.MW; x++) { const y = Math.round(10 + 1.6 * Math.sin(x / 3.2)); rect(x, y, x, y + 1, '~'); }   // lava river
      ell(22.5, 4, 5, 2.6, 'A');                               // caldera arena (NE)
      line([[4, 17], [4, 13], [8, 13]], ':'); line([[8, 13], [8, 8], [12, 8], [12, 5], [17, 5]], ':');
      line([[8, 13], [16, 13], [16, 15]], ':'); line([[17, 5], [17, 8], [21, 8], [21, 7]], ':');
      for (let x = 7; x <= 9; x++) for (let y = 8; y <= 13; y++) if (M[y][x] === '~') M[y][x] = '=';
      for (let x = 16; x <= 17; x++) for (let y = 5; y <= 13; y++) if (M[y][x] === '~') M[y][x] = '=';
      [[3, 3], [12, 2], [14, 7], [26, 8], [2, 14], [11, 17], [27, 13], [19, 20], [6, 20], [24, 20]].forEach(([x, y]) => set(x, y, 'T'));
      [[5, 7], [10, 4], [19, 15], [24, 17], [13, 18], [26, 2], [18, 2]].forEach(([x, y]) => set(x, y, 'R'));
      set(3, 18, 'O'); set(7, 19, 'S');
      border('T');
      return M;
    },
    unlocked: G => !!(G.alphas && G.alphas.caverns),
    lockText: 'Defeat the alpha of the Crystal Caverns',
    music: 'ember',
    mood: { tint: [1.08, .97, .9], lift: [.03, .01, 0], sat: 1.1, vig: .42, bloom: .5, threshold: .85 },
    theme: {
      sky: ['#5a2414', '#1a0d0c'], bg: '#2a1410', fog: ['#4a2216', 26, 76], hemi: ['#ffb894', '#3a2018', 1.15], sun: ['#ffa070', 2.0], exposure: 1.05,
      ground: { '.': '#3b3230', ':': '#6b5547', e: '#4a3a2c', h: '#55413a', '~': '#2a1410', '=': '#54504c', T: '#2b2422', R: '#3e3634', A: '#4d3328', O: '#6b5547', S: '#6b5547' },
      outside: ['#241c1a', '#3a2a24'], bank: '#1e1715',
      liquid: { color: '#ff6a1a', emissive: '#ff4a00', glow: 1.6, opacity: 1, rough: .6, metal: 0, y: -.3, lava: true },
      trees: 'dead', greens: ['#2a2120', '#352826', '#1f1a1c'], trunk: '#2a211d', tipGlow: '#ff8a3c',
      grass: { e: [10, .4, .8, ['#b5552f', '#d9763c', '#8f4a2a', '#c9a03a']], h: [4, .2, .4, ['#6a5a50', '#8a6a4a']], '.': [1, .15, .25, ['#5a4a40']] },
      flowers: null, rock: '#3e3634',
      mountains: ['#3a2420', '#2e1c1a', '#4a2a22'], hills: 2, volcano: true,
      particles: { kind: 'embers', color: '#ff9a4a', n: 200 }, falling: { kind: 'ash', colors: ['#8a817a', '#5c5550', '#a59a90'] },
      clouds: '#3a2a26', portal: '#ffb35a'
    }
  },

  lake: {
    id: 'lake', name: 'Mistfall Lake', sub: 'A silver lake under the moon', lv: '21–25',
    entry: [4, 17], shrine: [7, 19], respawn: [6, 18],
    alpha: { sp: 'Coralune', lvl: 28, at: [15, 9], title: 'Moonveil the Coralune Alpha' },
    build() {
      const M = grid('n'), { set, rect, ell, border, line } = tools(M);
      ell(15, 9.5, 9.5, 6.6, 'l');                             // reeds around the shore
      ell(15, 9.5, 7.6, 5.0, '~');                             // the lake
      ell(15, 9, 3, 2.1, 'A');                                 // moon island (alpha)
      rect(15, 11, 15, 15, '=');                               // pier to the island
      line([[4, 17], [4, 16], [15, 16]], ':'); line([[15, 16], [24, 16], [24, 13]], ':'); line([[4, 16], [4, 4], [8, 4]], ':');
      rect(1, 17, 9, 20, '.');                                 // quiet camp by the shrine
      [[8, 15], [13, 17], [19, 17], [3, 12], [3, 7], [25, 14]].forEach(([x, y]) => set(x, y, 'L'));
      [[2, 3], [6, 2], [25, 2], [27, 5], [2, 9], [27, 11], [9, 20], [21, 20], [27, 19], [11, 19], [2, 20], [26, 16]].forEach(([x, y]) => set(x, y, 'T'));
      [[7, 7], [23, 18], [17, 19]].forEach(([x, y]) => set(x, y, 'R'));
      set(3, 18, 'O'); set(7, 19, 'S');
      border('T');
      return M;
    },
    unlocked: G => !!(G.alphas && G.alphas.ember),
    lockText: 'Defeat the alpha of Ember Hollow',
    music: 'lake',
    mood: { tint: [.88, .95, 1.12], lift: [.0, .01, .04], sat: .95, vig: .5, bloom: .55, threshold: .8 },
    theme: {
      sky: ['#1a2a55', '#060a1a'], bg: '#0b1530', fog: ['#1c2c50', 26, 76], hemi: ['#94b0f0', '#202a3a', 1.25], sun: ['#c8dcff', 1.7], exposure: 1.1,
      ground: { '.': '#3a4a3a', n: '#2f4a3c', l: '#3a5240', ':': '#7a7a6a', '~': '#22303a', '=': '#4a4038', T: '#263c30', R: '#5a6070', L: '#2f4a3c', A: '#4c6a5c', O: '#7a7a6a', S: '#7a7a6a' },
      outside: ['#1b2c24', '#25382c'], bank: '#2a3530',
      liquid: { color: '#3a6ea8', emissive: '#0a1a3a', opacity: .86, rough: .04, metal: .6, y: -.26 },
      trees: 'pine', greens: ['#1f4034', '#25483c', '#1a3a30', '#2c5444'], trunk: '#3a2a20',
      grass: { n: [10, .5, .9, ['#3f6a50', '#4a7a5a', '#355c46', '#5a8a6a']], l: [12, 1, 1.6, ['#5a7a5a', '#6a8a64', '#4a6a50']] },
      flowers: ['#cfd8ff', '#9fb4ff', '#ffffff'], rock: '#5a6070',
      mountains: ['#1e2a40', '#26344c', '#1a2438'], hills: 1.4,
      particles: { kind: 'fireflies', color: '#d6ff9a', n: 260 }, falling: { kind: 'petals', colors: ['#cfd8ff', '#ffffff', '#b8c8ff'] }, mist: true,
      clouds: null, stars: true, moon: true, portal: '#cfd8ff'
    }
  }
};
LB.STAGE_ORDER = ['valley', 'caverns', 'ember', 'lake'];
LB.STAGE = 'valley';

// zone name shown when you walk into an area
const valleyZoneAt = LB.zoneAt;
LB.zoneAt = function (x, y) {
  if (LB.STAGE === 'valley') return valleyZoneAt(x, y);
  const c = LB.MAP[y] && LB.MAP[y][x];
  if (c === 'A') return 'arena';
  return (LB.ZONES[c] && LB.ZONES[c].name) || LB.STAGE;
};
// NPCs only live in the valley
const valleyNpcs = LB.npcs;
LB.npcs = function () { return LB.STAGE === 'valley' ? valleyNpcs() : []; };
LB.useStage = function (id) {
  LB.STAGE = LB.STAGES[id] ? id : 'valley';
  LB.MAP = LB.STAGES[LB.STAGE].build();
  return LB.STAGES[LB.STAGE];
};
