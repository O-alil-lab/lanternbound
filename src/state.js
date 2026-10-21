window.LB = window.LB || {};
// ============================================================
// Lanternbound — player state, stats and saving
// ============================================================
LB.G = null;         // the current save (party, items, position…)
LB.mode = 'title';   // title | world | dialog | battle | menu

LB.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
LB.wait = ms => new Promise(r => setTimeout(r, ms));

LB.statsOf = function (m) {
  const b = LB.MON[m.sp].b, L = m.lvl;
  return {
    hp: Math.floor(b[0] * 2 * L / 50) + L + 10,
    atk: Math.floor(b[1] * 2 * L / 50) + 5,
    def: Math.floor(b[2] * 2 * L / 50) + 5,
    spd: Math.floor(b[3] * 2 * L / 50) + 5
  };
};
LB.mk = function (sp, lvl) { const m = { sp, lvl, xp: 0 }; m.hp = LB.statsOf(m).hp; return m; };
LB.need = L => 8 * L + L * L;   // XP needed to go from level L to L+1
LB.healAll = () => LB.G.party.forEach(m => m.hp = LB.statsOf(m).hp);
LB.lanternTotal = () => Object.keys(LB.LANTERNS).reduce((a, k) => a + (LB.G.items[k] || 0), 0);

LB.newGame = function (player) {
  const roles = {};
  for (const r in LB.ROLE_PREF) roles[r] = LB.ROLE_PREF[r] === player ? 'Ivo' : LB.ROLE_PREF[r];
  LB.G = LB.norm({ player, roles, x: 6, y: 17, face: 'up', party: [], box: [], items: { salve: 3 },
    coins: 0, seen: {}, caught: {}, beat: {}, starter: null, done: false });
};
LB.norm = function (g) {
  g.items = Object.assign({ lantern: 0, moss: 0, tide: 0, ember: 0, sky: 0, dusk: 0, warden: 0, salve: 0 }, g.items || {});
  g.coins = g.coins || 0;
  return g;
};
LB.save = function (silent) {
  try { localStorage.setItem('lanternbound', JSON.stringify(LB.G)); if (!silent) LB.toast('Game saved'); }
  catch (e) { if (!silent) LB.toast('Saving is not available here'); }
};
LB.load = function () {
  try { const s = localStorage.getItem('lanternbound'); return s ? JSON.parse(s) : null; } catch (e) { return null; }
};

// Story helpers
LB.rivalStarter = () => ({ Bellmoss: 'Hearthusk', Puddlewick: 'Bellmoss', Hearthusk: 'Puddlewick' })[LB.G.starter];
LB.rangerTeam = () => ({
  Bellmoss: [LB.mk('Loomtail', 4), LB.mk('Quillora', 5)],
  Puddlewick: [LB.mk('Saffrill', 4), LB.mk('Clatterbud', 5)],
  Hearthusk: [LB.mk('Loomtail', 4), LB.mk('Clatterbud', 5)]
})[LB.G.starter];
