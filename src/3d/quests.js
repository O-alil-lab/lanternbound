// ============================================================
// Lanternbound 3D — quests and exploration.
//  • villagers give quests (a ! floats over them; ? when you can hand one in)
//  • the notice board in the village has the Lantern Shards hunt and a daily challenge
//  • treasure chests, 8 hidden lantern shards across the four lands,
//    5 old lantern posts to relight, a lost Drapplet to bring home
//  • quest log (📜) and a tracker under the top bar
// ============================================================
import * as THREE from 'three';
import { tileCenter } from './world.js';

const V3 = THREE.Vector3;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export const QUESTS = [
  { id: 'friends', giver: 'mentor', title: 'First Friends', desc: 'Befriend 3 new companions with your lanterns.', goal: { ev: 'catch', n: 3 }, reward: { coins: 60, salve: 2 } },
  { id: 'night', giver: 'mentor', after: 'friends', title: 'Night Walkers', desc: 'Some companions only come out at night. Befriend a Saffrill, a Glimmerell or an Opaloom.', goal: { ev: 'catch', sp: ['Saffrill', 'Glimmerell', 'Opaloom'], n: 1 }, reward: { coins: 90, dusk: 1 } },
  { id: 'lamps', giver: 'mentor', after: 'friends', title: 'The Old Lanterns', desc: 'Relight the 5 old lantern posts hidden around Hollow Valley.', goal: { ev: 'lamp', n: 5, count: 'lamps' }, reward: { coins: 120, dusk: 2 } },
  { id: 'bestie', giver: 'mentor', after: 'lamps', title: 'Best Friends', desc: 'Reach bond 50 with a companion: walk together, fight together and pet it.', goal: { ev: 'bond', min: 50, n: 1 }, reward: { coins: 100, salve: 3 } },
  { id: 'lost', giver: 'ranger', beat: 'ranger', title: 'The Lost Drapplet', desc: 'A little Drapplet wandered off into Rillbank Reeds. Find it and send it home.', goal: { ev: 'lost', n: 1 }, reward: { coins: 80, moss: 2 } },
  { id: 'river', giver: 'angler', beat: 'angler', title: 'River Friends', desc: 'Befriend a Tide companion.', goal: { ev: 'catch', type: 'Tide', n: 1 }, reward: { coins: 50, tide: 2 } },
  { id: 'elements', giver: 'angler', after: 'river', title: 'Elements Together', desc: "Trigger 5 type reactions: hit a foe with one type, then another (your weapon + your companion's attacks).", goal: { ev: 'reaction', n: 5 }, reward: { coins: 100, salve: 3 } },
  { id: 'elites', giver: 'rival', beat: 'rival', title: 'Elite Hunt', desc: 'Defeat 3 elite companions (the ones with a golden aura).', goal: { ev: 'defeat', elite: true, n: 3 }, reward: { coins: 150, sky: 3 } },
  { id: 'shards', giver: 'board', title: 'Lantern Shards', desc: 'Find the 8 lantern shards hidden across the four lands. Two in each.', goal: { ev: 'shard', n: 8, count: 'shards' }, reward: { coins: 250, warden: 1 } }
];
const DAILY = [
  { ev: 'defeat', type: 'Grove', n: 6, text: 'Defeat {n} Grove companions' }, { ev: 'defeat', type: 'Tide', n: 6, text: 'Defeat {n} Tide companions' },
  { ev: 'defeat', type: 'Stone', n: 6, text: 'Defeat {n} Stone companions' }, { ev: 'defeat', n: 10, text: 'Defeat {n} wild companions' },
  { ev: 'catch', n: 2, text: 'Befriend {n} companions' }, { ev: 'perfect', n: 3, text: 'Make {n} perfect dodges' },
  { ev: 'reaction', n: 3, text: 'Trigger {n} type reactions' }, { ev: 'duo', n: 8, text: 'Land {n} duo hits with your companion' }, { ev: 'pet', n: 3, text: 'Pet companions {n} times' }
];
// places (map tiles) per stage
const SPOTS = {
  valley: { lamps: [[2, 2], [11, 11], [18, 2], [27, 9], [20, 16]], chests: [[12, 1], [28, 20], [1, 10]], shards: [[28, 1], [16, 20]], board: [11, 16], lost: [18, 18] },
  caverns: { chests: [[28, 1], [2, 20]], shards: [[14, 1], [26, 18]] },
  ember: { chests: [[1, 1], [28, 18]], shards: [[1, 8], [27, 15]] },
  lake: { chests: [[28, 1], [12, 20]], shards: [[15, 9], [27, 3]] }
};
const CHEST_LOOT = [{ coins: 60, salve: 1 }, { coins: 40, moss: 1, tide: 1 }, { coins: 80, ember: 1 }, { coins: 50, sky: 1, salve: 1 }, { coins: 100, dusk: 1 }];

export class Quests {
  constructor(g) {
    this.g = g; this.objs = []; LB.quests = this;
    const st = document.createElement('style');
    st.textContent = `#lb-track{position:absolute;left:50%;top:44px;transform:translateX(-50%);background:rgba(245,239,226,.92);border:2px solid #3b2f20;border-radius:10px;padding:3px 12px;font:800 13px/1.35 Nunito,Cairo,sans-serif;color:#2b2418;text-align:center;pointer-events:auto;cursor:pointer;max-width:min(420px,80vw)}
#lb-track b{color:#b8692e}
#lb-track.done{box-shadow:0 0 0 3px #ffd23f}
html body.dev-phone #lb-track{top:auto;bottom:208px;font-size:12px}
html body.dev-phone.portrait #lb-track{bottom:auto;top:296px}
.qlist{display:grid;gap:8px}
.qrow{border:2px solid var(--line);border-radius:10px;padding:8px 10px;background:#fff}
.qrow.done{opacity:.6}
.qrow .qt{font-family:Fraunces,Cairo,serif;font-weight:800;display:flex;justify-content:space-between;gap:8px}
.qrow .qp{font-weight:900;color:#b8692e;white-space:nowrap}
.qrow .qd{font-size:13px;margin:3px 0}
.qrow .qr{font-size:12px;color:#6b5d48;font-weight:800}
.qrow .bar{height:7px}`;
    document.head.appendChild(st);
    this.track = document.createElement('div'); this.track.id = 'lb-track'; this.track.onclick = () => this.openLog();
    LB.questLog = () => this.openLog();
    // villagers with quests speak about them first
    const orig = LB.story.interact.bind(LB.story);
    LB.story.interact = async (tx, ty) => { const n = LB.npcAt(tx, ty); if (n && await this.talk(n)) return; return orig(tx, ty); };
  }
  get S() { const G = LB.G; G.q = G.q || {}; G.lamps = G.lamps || {}; G.chests = G.chests || {}; G.shards = G.shards || {}; return G; }
  state(id) { return this.S.q[id] || null; }
  def(id) { return QUESTS.find(q => q.id === id); }
  progress(q) { const s = this.state(q.id); if (q.goal.count) return Object.keys(this.S[q.goal.count]).length; return s ? s.n || 0 : 0; }
  complete(q) { return this.progress(q) >= q.goal.n; }
  available(q) {
    const G = this.S; if (this.state(q.id)) return false;
    if (q.after && !(this.state(q.after) && this.state(q.after).s === 'done')) return false;
    if (q.beat && !(G.beat && G.beat[q.beat])) return false;
    return true;
  }
  active() { return QUESTS.filter(q => (this.state(q.id) || {}).s === 'active'); }

  // ---------- events from the game ----------
  emit(ev, d = {}) {
    if (!LB.G) return;
    this.active().forEach(q => {
      const g = q.goal; if (g.ev !== ev || g.count) return;
      if (g.type && d.type !== g.type) return;
      if (g.sp && !g.sp.includes(d.sp)) return;
      if (g.elite && !d.elite) return;
      if (g.min && (d.value || 0) < g.min) return;
      if (ev === 'defeat' && d.kind === 'boss') return;
      const s = this.state(q.id), was = this.complete(q); s.n = Math.min(g.n, (s.n || 0) + 1);
      if (!was && this.complete(q)) this.readyToast(q);
    });
    if (['lamp', 'shard'].includes(ev)) this.active().forEach(q => { if (q.goal.ev === ev && this.complete(q) && !this.state(q.id).told) this.readyToast(q); });
    // daily challenge
    const D = this.daily(); if (D && !D.done) {
      const t = DAILY[D.i];
      if (t.ev === ev && (!t.type || d.type === t.type) && !(ev === 'defeat' && d.kind === 'boss')) {
        D.n++; if (D.n >= t.n) { D.done = true; this.giveReward({ coins: 80, [['lantern', 'moss', 'tide', 'ember', 'sky', 'dusk'][D.i % 6]]: 2 }, LB.t('Daily challenge complete!')); }
      }
    }
    this.renderTrack();
  }
  readyToast(q) {
    const s = this.state(q.id); s.told = true; LB.SFX.quest();
    if (q.giver === 'board') { this.finish(q); return; }
    LB.toast(LB.t('Quest complete: {q}! Go back to {n}.', { q: LB.t(q.title), n: this.giverName(q) }));
  }
  giverName(q) { return q.giver === 'board' ? LB.t('the notice board') : (LB.G.roles[q.giver] || q.giver); }
  daily() {
    const G = this.S, today = new Date().toISOString().slice(0, 10);
    if (!G.daily || G.daily.date !== today) {
      let h = 0; for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      G.daily = { date: today, i: h % DAILY.length, n: 0, done: false, seen: false };
    }
    return G.daily.seen ? G.daily : null;
  }
  giveReward(r, title) {
    const G = LB.G, parts = [];
    Object.entries(r).forEach(([k, v]) => {
      if (k === 'coins') { G.coins += v; parts.push(LB.t('{n} coins', { n: v })); }
      else { G.items[k] = (G.items[k] || 0) + v; parts.push(v + ' × ' + LB.t(k === 'salve' ? 'Salve' : LB.LANTERNS[k].n)); }
    });
    LB.SFX.quest(); LB.toast((title ? title + ' ' : '') + parts.join(', '));
    this.g.fx.burst('Glimmer', this.g.player.pos.clone().setY(1.5), 24, 1.2);
    LB.updHud && LB.updHud(); LB.save(true);
    return parts.join(', ');
  }
  finish(q) {
    const s = this.state(q.id); s.s = 'done';
    const txt = this.giveReward(q.reward);
    this.renderTrack();
    return txt;
  }

  // ---------- talking to quest givers ----------
  async talk(n) {
    const who = n.who;
    // hand in
    for (const q of this.active()) if (q.giver === n.id && this.complete(q)) {
      const r = this.finish(q);
      await LB.dialog([LB.t('You did it: {q}!', { q: LB.t(q.title) }), LB.t('Here is your reward: {r}.', { r })], who);
      return true;
    }
    // offer a new one
    const q = QUESTS.find(x => x.giver === n.id && this.available(x));
    if (q) {
      await LB.dialog([LB.t('I have a favour to ask…'), LB.t(q.desc)], who);
      this.S.q[q.id] = { s: 'active', n: 0 }; LB.SFX.quest(); LB.toast(LB.t('New quest: {q}', { q: LB.t(q.title) }));
      this.renderTrack(); LB.save(true); return true;
    }
    return false;
  }

  // ---------- objects in the world ----------
  onStage() {
    this.objs = []; const W = this.g.world, sp = SPOTS[LB.STAGE] || {}, G = this.S, id = LB.STAGE;
    if (this.lost) { this.lost.destroy(); this.lost = null; }
    (sp.lamps || []).forEach(([x, y], i) => this.addLamp(W, `${id}-l${i}`, x, y));
    (sp.chests || []).forEach(([x, y], i) => this.addChest(W, `${id}-c${i}`, x, y, i));
    (sp.shards || []).forEach(([x, y], i) => { if (!G.shards[`${id}-s${i}`]) this.addShard(W, `${id}-s${i}`, x, y); });
    if (sp.board) this.addBoard(W, sp.board[0], sp.board[1]);
    this.renderTrack();
  }
  addLamp(W, key, tx, ty) {
    const { x, z } = tileCenter(tx, ty), lit = !!this.S.lamps[key];
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 1.9, 6), new THREE.MeshStandardMaterial({ color: '#4a3a2a', flatShading: true })); post.position.set(x, .95, z); post.castShadow = true;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(.32, .38, .32), new THREE.MeshStandardMaterial({ color: lit ? '#ffd48a' : '#5a5a5a', emissive: lit ? '#ffb84a' : '#000', emissiveIntensity: lit ? 2 : 0, transparent: true, opacity: .9 }));
    glass.position.set(x, 2.05, z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ffc46e', transparent: true, opacity: lit ? .9 : 0, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(2.2); glow.position.copy(glass.position);
    W.add(post, glass, glow);
    const o = { kind: 'lamp', key, x, z, glass, glow, r: 1.6, label: 'Light', done: () => !!this.S.lamps[key], use: () => {
      if (this.S.lamps[key]) return; this.S.lamps[key] = 1;
      glass.material.color.set('#ffd48a'); glass.material.emissive.set('#ffb84a'); glass.material.emissiveIntensity = 2; glow.material.opacity = .9;
      LB.SFX.portal(); this.g.fx.burst('Ember', glass.position.clone(), 20, .8);
      const n = Object.keys(this.S.lamps).length; LB.toast(LB.t('Old lantern relit ({n}/5)', { n }));
      this.emit('lamp'); LB.save(true);
    } };
    this.objs.push(o);
  }
  addChest(W, key, tx, ty, i) {
    const { x, z } = tileCenter(tx, ty), open = !!this.S.chests[key];
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = (i % 4) * .7;
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5a2a', flatShading: true }), band = new THREE.MeshStandardMaterial({ color: '#d9a634', metalness: .6, roughness: .4, flatShading: true });
    const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .5, .6), wood); base.position.y = .25; base.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, .5, -.3);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .9, 8, 1, false, 0, Math.PI), wood); lidM.rotation.z = Math.PI / 2; lidM.position.z = .3; lid.add(lidM);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(.08, .52, .62), band); b1.position.set(-.3, .25, 0); const b2 = b1.clone(); b2.position.x = .3;
    g.add(base, lid, b1, b2); if (open) lid.rotation.x = -1.9;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#ffd23f', transparent: true, opacity: open ? 0 : .5, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(1.6); sp.position.y = .6; g.add(sp);
    W.add(g);
    this.objs.push({ kind: 'chest', key, x, z, r: 1.7, label: 'Open', glow: sp, done: () => !!this.S.chests[key], use: () => {
      if (this.S.chests[key]) return; this.S.chests[key] = 1;
      lid.rotation.x = -1.9; sp.material.opacity = 0; LB.SFX.chest(); this.g.fx.burst('Glimmer', new V3(x, .8, z), 26, 1.1);
      this.giveReward(CHEST_LOOT[(key.length + i) % CHEST_LOOT.length], LB.t('Treasure!'));
      this.emit('chest');
    } });
  }
  addShard(W, key, tx, ty) {
    const { x, z } = tileCenter(tx, ty);
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(.28, 0), new THREE.MeshStandardMaterial({ color: '#9feaf2', emissive: '#4fd0e6', emissiveIntensity: 1.8, flatShading: true }));
    m.position.set(x, 1, z); m.scale.y = 1.6;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, color: '#9feaf2', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.8); glow.position.copy(m.position);
    W.add(m, glow);
    this.objs.push({ kind: 'shard', key, x, z, mesh: m, glow, auto: true });
  }
  addBoard(W, tx, ty) {
    const { x, z } = tileCenter(tx, ty);
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5230', flatShading: true });
    const g = new THREE.Group(); g.position.set(x, 0, z);
    [-.55, .55].forEach(dx => { const p = new THREE.Mesh(new THREE.BoxGeometry(.1, 1.6, .1), wood); p.position.set(dx, .8, 0); p.castShadow = true; g.add(p); });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, .8, .08), wood); b.position.y = 1.25; b.castShadow = true; g.add(b);
    ['#f5efe2', '#ffe7a0', '#f5efe2'].forEach((c, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(.32, .4), new THREE.MeshStandardMaterial({ color: c })); p.position.set(-.38 + i * .38, 1.27, .05); p.rotation.z = (i - 1) * .08; g.add(p); });
    W.add(g);
    this.objs.push({ kind: 'board', x, z, r: 1.8, label: 'Read', use: () => this.readBoard() });
  }
  async readBoard() {
    const G = this.S, lines = [];
    const sh = this.def('shards');
    if (!this.state('shards')) { G.q.shards = { s: 'active', n: 0 }; lines.push(LB.t('NOTICE: Lantern shards have been seen glowing in all four lands. Whoever brings back all 8 earns a Warden Lantern.')); LB.toast(LB.t('New quest: {q}', { q: LB.t(sh.title) })); }
    G.daily = G.daily || null; const D0 = this.daily() || (G.daily.seen = true, G.daily);
    const t = DAILY[D0.i];
    lines.push(LB.t('Daily challenge: {t}', { t: LB.t(t.text, { n: t.n }) }) + (D0.done ? ' ✓' : ` (${D0.n}/${t.n})`));
    lines.push(LB.t('A new challenge is posted every day.'));
    await LB.dialog(lines);
    this.renderTrack(); LB.save(true);
  }
  // shards are picked up by walking over them; lost Drapplet appears while its quest runs
  update(dt) {
    const g = this.g, P = g.player; if (!P) return;
    this.objs.forEach(o => {
      if (o.kind === 'shard' && !o.taken) {
        o.mesh.rotation.y += dt * 2; o.mesh.position.y = 1 + Math.sin(g.t * 2 + o.x) * .15; o.glow.position.y = o.mesh.position.y; o.glow.material.opacity = .6 + Math.sin(g.t * 3) * .3;
        if (dist(P.pos, o) < 1.2) {
          o.taken = true; this.S.shards[o.key] = 1; o.mesh.visible = o.glow.visible = false;
          LB.SFX.shiny(); g.fx.burst('Glimmer', new V3(o.x, 1, o.z), 30, 1.3); g.fx.ring(P.pos, '#9feaf2', .3, 3, .5);
          LB.toast(LB.t('Lantern shard found! ({n}/8)', { n: Object.keys(this.S.shards).length }));
          this.emit('shard'); LB.save(true);
        }
      }
      if (o.kind === 'chest' && !o.done()) o.glow.material.opacity = .35 + Math.sin(g.t * 3) * .2;
    });
    // the lost Drapplet
    const lostQ = this.state('lost');
    if (LB.STAGE === 'valley' && lostQ && lostQ.s === 'active' && !lostQ.n && !this.lost) {
      const [lx, ly] = SPOTS.valley.lost, c = tileCenter(lx, ly);
      this.lost = new g.Actor(g, { kind: 'pet', m: LB.mk('Drapplet', 2), x: c.x, z: c.z, scale: .7 });
    }
    if (this.lost) {
      const a = this.lost; a.vel.set(0, 0); g.orient(a, { x: P.x - a.x, y: P.z - a.z }); a.animate(dt, false, g.yaw);
      if ((this.lostT = (this.lostT || 0) - dt) <= 0) { this.lostT = 2.4; g.fx.emote(a, dist(P.pos, a.pos) < 6 ? '!' : '?', 1.6); }
    }
    // quest markers over villagers
    if ((this.markT = (this.markT || 0) - dt) <= 0) {
      this.markT = 2; this.renderTrack();
      Object.entries(g.npcs).forEach(([id, a]) => {
        const hand = this.active().some(q => q.giver === id && this.complete(q)), offer = QUESTS.some(q => q.giver === id && this.available(q));
        if (hand) g.fx.emote(a, '?', 2.1); else if (offer) g.fx.emote(a, '!', 2.1);
      });
      const board = this.objs.find(o => o.kind === 'board');
      if (board && (!this.state('shards') || !(this.S.daily && this.S.daily.seen && this.S.daily.date === new Date().toISOString().slice(0, 10)))) g.fx.text(new V3(board.x, 2.3, board.z), '!', '#ffd23f', 22);
    }
  }
  interactables() {
    const list = this.objs.filter(o => o.use && !(o.done && o.done())).map(o => ({ x: o.x, z: o.z, r: o.r, label: o.label, use: o.use }));
    if (this.lost) {
      const a = this.lost;
      list.push({ x: a.x, z: a.z, r: 1.7, label: 'Talk', use: () => {
        g_emote(this.g, a, '❤'); LB.SFX.pet(); this.g.fx.burst('Grove', new V3(a.x, .6, a.z), 16, .8);
        LB.toast(LB.t('The Drapplet hops happily back home!')); this.emit('lost');
        setTimeout(() => { if (this.lost) { this.lost.destroy(); this.lost = null; } }, 700);
      } });
    }
    return list;
  }

  // ---------- tracker + log ----------
  renderTrack() {
    const hud = document.getElementById('hud3d'); if (!hud || !LB.G) return;
    if (!this.track.parentNode) hud.appendChild(this.track);
    const q = this.active().find(x => !this.complete(x)) || this.active()[0];
    if (!q) { this.track.style.display = 'none'; return; }
    const done = this.complete(q);
    this.track.style.display = '';
    this.track.classList.toggle('done', done);
    this.track.innerHTML = `📜 <b>${LB.t(q.title)}</b> · ${done ? LB.t('Return to {n}', { n: this.giverName(q) }) : this.progress(q) + '/' + q.goal.n}`;
  }
  openLog() {
    if (LB.mode !== 'world') return;
    LB.mode = 'menu';
    let sh = document.getElementById('questSheet');
    if (!sh) { sh = document.createElement('div'); sh.className = 'sheet'; sh.id = 'questSheet'; document.getElementById('lb-ui').appendChild(sh); }
    const D = this.S.daily && this.S.daily.seen && this.S.daily.date === new Date().toISOString().slice(0, 10) ? this.S.daily : null;
    const rows = [];
    const rw = r => Object.entries(r).map(([k, v]) => k === 'coins' ? LB.t('{n} coins', { n: v }) : v + ' × ' + LB.t(k === 'salve' ? 'Salve' : LB.LANTERNS[k].n)).join(', ');
    QUESTS.forEach(q => {
      const s = this.state(q.id); if (!s) return;
      const p = this.progress(q), done = s.s === 'done';
      rows.push(`<div class="qrow ${done ? 'done' : ''}"><div class="qt"><span>${done ? '✓ ' : ''}${LB.t(q.title)}</span><span class="qp">${done ? LB.t('Done') : this.complete(q) ? LB.t('Return to {n}', { n: this.giverName(q) }) : p + '/' + q.goal.n}</span></div><div class="qd">${LB.t(q.desc)}</div><div class="bar"><i style="width:${Math.min(1, p / q.goal.n) * 100}%;background:#2f7f86"></i></div><div class="qr">${LB.t('Reward')}: ${rw(q.reward)} · ${LB.t('From')}: ${this.giverName(q)}</div></div>`);
    });
    if (D) { const t = DAILY[D.i]; rows.unshift(`<div class="qrow ${D.done ? 'done' : ''}"><div class="qt"><span>☀ ${LB.t('Daily challenge')}</span><span class="qp">${D.done ? '✓' : D.n + '/' + t.n}</span></div><div class="qd">${LB.t(t.text, { n: t.n })}</div></div>`); }
    const G = this.S, found = `${LB.t('Lantern shards')}: ${Object.keys(G.shards).length}/8 · ${LB.t('Chests')}: ${Object.keys(G.chests).length}/9 · ${LB.t('Old lanterns')}: ${Object.keys(G.lamps).length}/5`;
    sh.innerHTML = `<div class="card"><h3><span>${LB.t('Quests')}</span><button class="x">✕</button></h3><div class="small" style="margin-bottom:8px">${found}</div><div class="qlist">${rows.join('') || `<div class="small">${LB.t('No quests yet. Talk to villagers with a ! above their head, and read the notice board in the village.')}</div>`}</div></div>`;
    sh.classList.add('on');
    const close = () => { sh.classList.remove('on'); LB.mode = 'world'; };
    sh.querySelector('.x').onclick = close; sh.onclick = e => { if (e.target === sh) close(); };
  }
}
function g_emote(g, a, s) { g.fx.emote(a, s, 1.6); }
