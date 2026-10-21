// ============================================================
// Lanternbound 3D — main game: input, movement, weapons, companions,
// wild AI, lantern capture, trainer fights, camera and the game loop.
// ============================================================
import * as THREE from 'three';
import { buildWorld, glowTexture, S, charAt, tileCenter } from './world.js';
import { FX } from './fx.js';
import { Post } from './post.js';
import { Actor, loadTextures, makeWeapon, makeLantern } from './actors.js';
import { initHud, showHud, updateHud, loading, titleScreen, starterScreen, hideScreen, installShop, WEAPONS } from './hud.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const rand = (a, b) => a + Math.random() * (b - a);
const CAM_OFF = new V3(0, 10.5, 9.5), CAM_CAPTURE = new V3(0, 5.2, 6.4);

class Game {
  constructor() {
    LB.useStage('valley');
    LB.initUI(null);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(LB.screen.pixelRatio());
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 400);
    this.camera.position.set(10, 12, 40);
    const fit = () => { this.renderer.setPixelRatio(LB.screen.pixelRatio()); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.post && this.post.resize(); };
    LB.screen.onResize.push(fit); addEventListener('resize', fit);
    this.post = new Post(this.renderer, this.scene, this.camera);
    initHud(this); installShop(this);
    this.glowTex = glowTexture();
    this.world = buildWorld(this.scene, this.renderer, this.glowTex);
    this.fx = new FX(this.scene, this.camera, this.glowTex); this.stageBuilt = true;
    this.clock = new THREE.Clock(); this.t = 0;
    this.camTarget = new V3(12, 0, 30); this.camOff = CAM_OFF.clone();
    this.wild = []; this.shots = []; this.npcs = {}; this.player = null; this.ally = null;
    this.wCd = 0; this.wCdMax = .3; this.combo = 0; this.comboT = 0; this.petCd = 0; this.spcCd = 0; this.rollCd = 0; this.rollT = 0;
    this.spawnT = 0; this.face = new V2(0, 1); this.yaw = 0; this.yawT = 0;
    this.setupInput();
    this.reticle = new THREE.Mesh(new THREE.RingGeometry(.45, .6, 32), new THREE.MeshBasicMaterial({ color: '#9feaf2', transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide }));
    this.reticle.rotation.x = -Math.PI / 2; this.reticle.visible = false; this.scene.add(this.reticle);
    this.arcDots = new THREE.InstancedMesh(new THREE.SphereGeometry(.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 16); this.arcDots.visible = false; this.scene.add(this.arcDots);
    this.promptEl = document.createElement('div'); this.promptEl.className = 'ubar'; this.promptEl.innerHTML = '<div class="pr" style="display:block"></div>'; this.promptEl.style.display = 'none';
    document.getElementById('lb-labels').appendChild(this.promptEl);
    this.fade = document.createElement('div'); Object.assign(this.fade.style, { position: 'fixed', inset: 0, background: '#000', opacity: 0, pointerEvents: 'none', transition: 'opacity .5s', zIndex: 15 }); document.body.appendChild(this.fade);
    LB.mode = 'title';
    this.loop();
    loading(0);
    loadTextures(p => loading(p)).then(() => { loading(null); this.title(); });
    LB.story.intro = () => this.intro();
  }

  // ---------------- screens ----------------
  title() {
    LB.mode = 'title'; showHud(false);
    titleScreen(n => { LB.newGame(n); this.initSave(); starterScreen(sp => {
      const G = LB.G; G.starter = sp; G.party = [LB.mk(sp, 6)]; G.caught[sp] = 1; G.seen[sp] = 1; G.items.lantern = 5;
      LB.norm(G); this.startWorld(true);
    }); }, save => { LB.G = LB.norm(save); this.initSave(); this.startWorld(false); });
  }
  initSave() { const G = LB.G; G.weapons = G.weapons || { staff: 1, sling: 0, wand: 0 }; G.weapon = G.weapon || 'staff'; }
  async intro() {
    const G = LB.G, R = G.roles;
    await LB.dialog([
      LB.t("Welcome to Hollow Village, {p}. I'm {m}.", { p: G.player, m: R.mentor }),
      LB.t('{s} has chosen you. It will follow you and fight by your side.', { s: G.starter }),
      LB.t(LB.touch ? 'Your Crystal Staff swings with the A button. Tap three times for a combo. Your companion fights on its own, and SP is its special move.' : 'Your Crystal Staff swings with left-click or J. Click three times for a combo. Your companion attacks with right-click or K, and L is its special move.'),
      LB.t(LB.touch ? 'Wild companions roam the tall grass. A red shape on the ground shows where they are about to strike, so roll away with ⤳!' : 'Wild companions roam the tall grass. A red shape on the ground shows where they are about to strike, so roll away with Space!'),
      LB.t(LB.touch ? 'Knock one out and it gets dazed. Tap 🏮 to aim a lantern, tap again to throw, then tap each time the gold ring meets the white ring. Three hits and it joins you!' : 'Knock one out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the gold ring meets the white ring. Three hits and it joins you!'),
      LB.t('{r} guards the meadow gate to the north. The Lantern Stall sells lanterns, a Sling and a Crystal Wand.', { r: R.ranger })
    ], R.mentor);
    LB.save(true);
  }
  startWorld(isNew) {
    hideScreen(); showHud(true);
    const G = LB.G; G.alphas = G.alphas || {}; G.alphaCaught = G.alphaCaught || {};
    this.setStage(G.stage || 'valley');
    if (LB.SOLID.has((LB.MAP[G.y] || [])[G.x]) || !LB.MAP[G.y]) { const e = LB.STAGES[LB.STAGE].entry; G.x = e[0]; G.y = e[1]; }
    const start = tileCenter(G.x, G.y);
    this.player = new Actor(this, { kind: 'player', trainer: G.player, x: start.x, z: start.z });
    Object.values(this.npcs).forEach(n => n.destroy()); this.npcs = {};
    LB.npcs().forEach(n => { const c = tileCenter(n.x, n.y); const a = new Actor(this, { kind: 'npc', trainer: n.who, x: c.x, z: c.z }); a.npc = n; this.npcs[n.id] = a; });
    this.spawnAlly(); this.refreshWeapon();
    this.camTarget.set(start.x, 0, start.z);
    LB.mode = 'world'; LB.world = this;
    this.lastZone = '';
    this.spawnAlpha();
    LB.screen.hintOrientation();
    if (isNew) setTimeout(() => this.intro(), 600);
  }
  // ---------------- stages ----------------
  setStage(id) {
    if (this.world && LB.STAGE === id && this.stageBuilt) return;
    const st = LB.useStage(id); this.stageBuilt = true;
    if (this.world) this.world.dispose();
    this.world = buildWorld(this.scene, this.renderer, this.glowTex);
    LB.G && (LB.G.stage = id);
    LB.audio.setStage(st.music); this.post.mood(st.mood);
  }
  async travel(id) {
    const st = LB.STAGES[id], G = LB.G; if (!st) return;
    LB.mode = 'busy'; this.fade.style.opacity = 1; LB.SFX.portal(); await LB.wait(550);
    this.clearWild(); Object.values(this.npcs).forEach(n => n.destroy()); this.npcs = {};
    this.setStage(id);
    const [ex, ey] = st.entry, c = tileCenter(ex, ey); G.x = ex; G.y = ey;
    this.player.pos.set(c.x, 0, c.z); this.player.vel.set(0, 0); this.camTarget.set(c.x, 0, c.z);
    if (this.ally) this.ally.pos.set(c.x - 1, 0, c.z + .6);
    LB.npcs().forEach(n => { const cc = tileCenter(n.x, n.y); const a = new Actor(this, { kind: 'npc', trainer: n.who, x: cc.x, z: cc.z }); a.npc = n; this.npcs[n.id] = a; });
    this.spawnAlpha(); this.lastZone = '';
    await LB.wait(250); this.fade.style.opacity = 0; LB.mode = 'world';
    this.stageCard(st); LB.save(true);
  }
  stageCard(st) {
    let el = document.getElementById('lb-stagecard');
    if (!el) { el = document.createElement('div'); el.id = 'lb-stagecard'; document.body.appendChild(el); }
    el.innerHTML = `<small>${st.lv ? LB.t('Level {n}', { n: st.lv }) : ''}</small><b>${LB.t(st.name)}</b><span>${LB.t(st.sub)}</span>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(this.cardT); this.cardT = setTimeout(() => el.classList.remove('on'), 3200);
  }
  portalMenu() {
    const G = LB.G, s = document.getElementById('lb-screen'); LB.mode = 'busy'; this.player.vel.set(0, 0);
    s.innerHTML = `<h2>${LB.t('Lantern Gate')}</h2><p>${LB.t('Where should the gate take you?')}</p><div class="row">${LB.STAGE_ORDER.map(id => {
      const st = LB.STAGES[id], open = st.unlocked(G), here = id === LB.STAGE, a = st.alpha;
      const badge = a ? (G.alphaCaught[id] ? '★ ' + LB.t('Alpha caught') : G.alphas[id] ? '✓ ' + LB.t('Alpha beaten') : LB.t('Alpha: {c}', { c: a.sp })) : '';
      return `<div class="tcard stage ${open ? '' : 'lock'} ${here ? 'here' : ''}" data-id="${id}"><div class="sw sw-${id}"></div><b>${LB.t(st.name)}</b><small>${LB.t('Lv')} ${st.lv}</small><small>${open ? (here ? LB.t('You are here') : badge) : '🔒 ' + LB.t(st.lockText)}</small></div>`;
    }).join('')}</div><button class="btn" id="gateX">${LB.t('Stay here')}</button>`;
    s.classList.add('on');
    const close = () => { s.classList.remove('on'); LB.mode = 'world'; LB.lastDialogEnd = performance.now(); };
    s.querySelector('#gateX').onclick = () => { LB.SFX.sel(); close(); };
    s.querySelectorAll('.tcard.stage').forEach(c => c.onclick = () => {
      const id = c.dataset.id;
      if (!LB.STAGES[id].unlocked(G)) { LB.SFX.bump(); LB.toast(LB.t(LB.STAGES[id].lockText)); return; }
      s.classList.remove('on');
      if (id === LB.STAGE) { close(); return; }
      this.travel(id);
    });
  }
  spawnAlpha() {
    const st = LB.STAGES[LB.STAGE], a = st.alpha, G = LB.G;
    if (!a || G.alphaCaught[st.id] || this.wild.some(u => u.alpha)) return;
    const m = LB.mk(a.sp, a.lvl), c = tileCenter(a.at[0], a.at[1]);
    const u = new Actor(this, { kind: 'wild', m, x: c.x, z: c.z, scale: 2.3, alpha: true });
    u.alpha = st.id; u.maxHp = LB.unitMaxHp(m) * 4; m.hpA = u.maxHp; u.specT = 3; u.home = { x: c.x, z: c.z };
    u.title = a.title; this.wild.push(u); G.seen[a.sp] = 1;
  }
  alphaSpecial(u, tgt) {
    const P = this.player;
    const pick = u.m.hpA < u.maxHp * .5 && !u.called ? 'call' : Math.random() < .5 ? 'slam' : 'nova';
    if (pick === 'call') {   // calls two helpers once, at half health
      u.called = true; LB.SFX.roar(); this.fx.shake(.4, .5); this.fx.text(new V3(u.x, u.h + 1.4, u.z), LB.t('It calls for help!'), '#ffb3a8', 18);
      const Z = Object.values(LB.ZONES).filter(z => z.lv[0] >= 13 && LB.MAP.flat().some(c => LB.ZONES[c] === z));
      for (let i = 0; i < 2; i++) { const z = Z[i % Z.length] || LB.ZONES[','], sp = z.t[LB.rnd(0, z.t.length - 1)]; const m = LB.mk(sp === '*' ? 'Loomtail' : sp, z.lv[0]); m.hpA = LB.unitMaxHp(m);
        const a = i * Math.PI + rand(-.4, .4), x = u.x + Math.cos(a) * 3, zz = u.z + Math.sin(a) * 3; if (this.solidAt(x, zz)) continue;
        const w = new Actor(this, { kind: 'wild', m, x, z: zz }); w.state = 'chase'; this.fx.burst(LB.MON[sp === '*' ? 'Loomtail' : sp].t, new V3(x, .5, zz), 14); this.wild.push(w); }
      return;
    }
    if (pick === 'slam') {   // ground slam: a big red circle where you stand, then a shockwave
      const p = tgt.pos.clone(), R = 3.2, dur = 1.0;
      const m = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(p.x, .08, p.z); this.scene.add(m);
      this.fx.temp.push({ m, life: dur, max: dur, upd: k => { m.material.opacity = .12 + .35 * k; m.scale.setScalar(.3 + .7 * Math.min(1, k * 1.6)); } });
      this.windup(u, dur * .7, () => {
        u.lift = 0; this.fx.text(new V3(u.x, u.h + 1, u.z), LB.t('SLAM!'), '#ffb3a8', 20);
        setTimeout(() => {
          if (u.dead) return;
          LB.SFX.boom(); this.fx.shake(.6, .35); this.fx.ring(p, '#ffb36a', .4, R + .6, .5); this.fx.burst(u.t, new V3(p.x, .3, p.z), 30, 1.4);
          if (dist(P.pos, p) < R && P.iframes <= 0) this.hurtPlayer({ x: p.x, z: p.z });
          if (this.ally && dist(this.ally.pos, p) < R) this.hitBy(this.ally, u, LB.specialMove(u.m.sp), 1.1);
        }, dur * 300);
      });
      return;
    }
    // nova: a ring of shots in every direction
    this.fx.ring(u.pos, '#ff4a3a', .5, 4, .8, .1);
    this.windup(u, .8, () => {
      LB.SFX.zap(); const k = LB.basicMove(u.m.sp), colr = { Ember: '#ff8a3c', Tide: '#4aa8e0', Gale: '#e8eeff', Glimmer: '#e4b8ff', Stone: '#b9a88c', Grove: '#9fd86a' }[u.t] || '#fff';
      const n = 14, off = rand(0, 1);
      for (let i = 0; i < n; i++) { const a = (i + off) / n * Math.PI * 2; this.shoot({ from: new V3(u.x, 1.2, u.z), dir: new V2(Math.cos(a), Math.sin(a)), speed: 9, owner: u, move: k, mult: .8, type: u.t, color: colr, size: .26 }); }
    });
  }
  refreshNpcs() { LB.npcs().forEach(n => { const a = this.npcs[n.id]; if (!a) return; const c = tileCenter(n.x, n.y); a.pos.set(c.x, 0, c.z); a.npc = n; }); }

  // ---------------- input ----------------
  setupInput() {
    this.keys = {}; this.pressed = new Set(); this.released = new Set();
    this.mouse = new V2(); this.mouseWorld = new V3(); this.ray = new THREE.Raycaster(); this.groundPlane = new THREE.Plane(new V3(0, 1, 0), 0);
    addEventListener('keydown', e => {
      if (LB.mode === 'world' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed.add(e.code); this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; this.released.add(e.code); });
    const cv = this.renderer.domElement;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointermove', e => { this.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); if (e.pointerType === 'mouse') LB.mouseT = performance.now(); });
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      this.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); LB.mouseT = performance.now();
      this.pressed.add(e.button === 2 ? 'MouseR' : 'MouseL'); if (e.button === 0) this.keys.MouseL = true;
    });
    addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) { this.keys.MouseL = false; this.released.add('MouseL'); } });
  }
  mouseRecent() { return !LB.touch && performance.now() - (LB.mouseT || -1e9) < 2500; }
  pointerGround() { this.ray.setFromCamera(this.mouse, this.camera); const p = new V3(); return this.ray.ray.intersectPlane(this.groundPlane, p) ? p : null; }

  // ---------------- collisions ----------------
  solidAt(x, z) { const c = charAt(x, z); return !c || LB.SOLID.has(c); }
  move(a, dx, dz) {
    const r = a.r * .9;
    const free = (x, z) => !this.solidAt(x - r, z - r * .6) && !this.solidAt(x + r, z - r * .6) && !this.solidAt(x - r, z + r * .6) && !this.solidAt(x + r, z + r * .6);
    if (free(a.pos.x + dx, a.pos.z)) a.pos.x += dx; else a.vel.x = 0;
    if (free(a.pos.x, a.pos.z + dz)) a.pos.z += dz; else a.vel.y = 0;
    if (a.kind === 'player' || a.kind === 'wild' || a.kind === 'boss') Object.values(this.npcs).forEach(n => {
      const d = dist(a.pos, n.pos), min = a.r + .45;
      if (d < min && d > .001) { a.pos.x += (a.pos.x - n.pos.x) / d * (min - d); a.pos.z += (a.pos.z - n.pos.z) / d * (min - d); }
    });
  }

  // ---------------- party ----------------
  lead() { return LB.G.party.find(m => m.hpA > 0); }
  spawnAlly(fromSwitch) {
    if (this.ally) { this.ally.destroy(); this.ally = null; }
    const m = this.lead(); if (!m) return;
    const i = LB.G.party.indexOf(m); if (i > 0) { LB.G.party.splice(i, 1); LB.G.party.unshift(m); }
    this.ally = new Actor(this, { kind: 'ally', m, x: this.player.x - 1, z: this.player.z + .6 });
    if (fromSwitch) { this.fx.burst('Glimmer', new V3(this.ally.x, 1, this.ally.z), 16); LB.toast(LB.t('Go, {c}!', { c: m.sp })); }
  }
  cycleAlly() { const G = LB.G, alive = G.party.filter(m => m.hpA > 0); if (alive.length < 2) return; const m = alive[1]; G.party.splice(G.party.indexOf(m), 1); G.party.unshift(m); this.spawnAlly(true); LB.SFX.sel(); }
  spawnAllyIfChanged() { if (!this.ally || this.ally.m !== this.lead()) this.spawnAlly(); }
  useSalve() {
    const G = LB.G; if (G.items.salve <= 0) { LB.toast(LB.t('No salves left')); return; }
    const a = this.ally && this.ally.m; const target = a && a.hpA < LB.unitMaxHp(a) ? a : G.party.find(m => m.hpA < LB.unitMaxHp(m));
    if (!target && G.hearts >= LB.MAX_HEARTS) { LB.toast(LB.t('Everyone is healthy')); return; }
    G.items.salve--; LB.SFX.heal();
    if (target) { const mx = LB.unitMaxHp(target); target.hpA = Math.min(mx, Math.max(0, target.hpA) + Math.round(mx * .45)); }
    G.hearts = Math.min(LB.MAX_HEARTS, G.hearts + 1);
    this.fx.burst('Grove', new V3(this.player.x, 1, this.player.z), 14);
  }

  // ---------------- weapons ----------------
  selectWeapon(k) {
    const G = LB.G; if (!G || !(G.weapons[k] > 0)) { if (G) LB.toast(LB.t('{w}: buy it at the Lantern Stall', { w: LB.t(WEAPONS[k].n) })); return; }
    G.weapon = k; this.refreshWeapon(); LB.SFX.sel();
  }
  refreshWeapon() {
    if (!this.player) return;
    if (this.weapon) this.player.obj.remove(this.weapon);
    const G = LB.G; this.weapon = makeWeapon(G.weapon, G.weapons[G.weapon] || 1);
    this.weaponPivot = new THREE.Group(); this.weaponPivot.add(this.weapon);
    this.player.obj.add(this.weaponPivot); this.weaponPivot.position.y = .95;
    this.swing = null;
  }
  aimDir(range = 5) {
    const P = this.player;
    if (this.mouseRecent()) { const g = this.pointerGround(); if (g) { const d = new V2(g.x - P.x, g.z - P.z); if (d.lengthSq() > .01) return { dir: d.normalize(), point: g }; } }
    let best = null, bd = range;
    this.enemies().forEach(u => { const d = dist(P.pos, u.pos); if (d < bd) { bd = d; best = u; } });
    if (best) return { dir: new V2(best.x - P.x, best.z - P.z).normalize(), unit: best, point: best.pos.clone() };
    return { dir: this.face.clone(), point: new V3(P.x + this.face.x * 5, 0, P.z + this.face.y * 5) };
  }
  weaponDamage(k, target, mult) {
    const G = LB.G, W = WEAPONS[k], lv = G.weapons[k] || 1;
    const avg = G.party.reduce((s, m) => s + m.lvl, 0) / Math.max(1, G.party.length);
    const e = LB.eff(W.t, target.t), crit = Math.random() < .1 ? 1.5 : 1;
    return { dmg: Math.max(1, Math.round(W.base * (.85 + avg * .07) * (1 + .35 * (lv - 1)) * e * crit * mult * rand(.9, 1.1))), e, crit: crit > 1, t: W.t };
  }
  weaponPress() {
    const G = LB.G, k = G.weapon; if (this.wCd > 0) return;
    if (k === 'wand') { this.charging = true; this.charge = 0; LB.SFX.charge(); return; }
    const { dir } = this.aimDir(k === 'staff' ? 3.2 : 12);
    this.face.copy(dir);
    if (k === 'staff') {
      this.combo = this.comboT > 0 && this.combo < 3 ? this.combo + 1 : 1; this.comboT = .85;
      const big = this.combo === 3; this.wCd = this.wCdMax = big ? .55 : .28;
      const ang = Math.atan2(-dir.y, dir.x), arc = big ? Math.PI * 1.25 : Math.PI * .85, R = big ? 2.6 : 2.1;
      const side = this.combo === 2 ? -1 : 1;
      this.swing = { t: 0, dur: .16, from: Math.atan2(dir.x, dir.y) + side * arc / 2, to: Math.atan2(dir.x, dir.y) - side * arc / 2 };
      this.fx.swing(this.player.pos, ang, arc, R, big ? '#ffd23f' : '#d8fbff');
      LB.SFX.swing();
      this.enemies().forEach(u => {
        const dx = u.x - this.player.x, dz = u.z - this.player.z, d = Math.hypot(dx, dz);
        if (d > R + u.r) return;
        const a = Math.acos(Math.max(-1, Math.min(1, (dx * dir.x + dz * dir.y) / (d || 1))));
        if (a <= arc / 2 + .2 || d < 1) this.damage(u, this.player, this.weaponDamage('staff', u, big ? 1.7 : 1), big ? 11 : 6);
      });
      if (big) this.fx.shake(.25, .15);
    } else if (k === 'sling') {
      this.wCd = this.wCdMax = .45;
      const P = this.player, from = new V3(P.x + dir.x * .5, 1.1, P.z + dir.y * .5);
      this.shoot({ from, dir, speed: 17, vy: 2.2, g: -7, owner: this.player, type: 'Stone', color: '#b9b2a4', size: .13, weapon: 'sling', range: 1.1, mesh: 'stone' });
      LB.SFX.sling();
    }
  }
  weaponRelease() {
    if (!this.charging) return;
    this.charging = false; const c = Math.min(1, this.charge || 0);
    const { dir } = this.aimDir(14); this.face.copy(dir);
    this.wCd = this.wCdMax = .45; LB.SFX.zap();
    const P = this.player, from = new V3(P.x + dir.x * .6, 1.2, P.z + dir.y * .6);
    this.shoot({ from, dir, speed: 15 + c * 6, vy: 0, g: 0, owner: this.player, type: 'Glimmer', color: c > .6 ? '#ffd23f' : '#e4b8ff', size: .16 + c * .3, weapon: 'wand', mult: .6 + c * 2.2, pierce: c > .6, range: 1.3 });
    if (c > .6) this.fx.shake(.15, .1);
    LB.SFX.stat();
  }

  // ---------------- projectiles ----------------
  shoot(o) {
    const mesh = new THREE.Mesh(o.mesh === 'stone' ? new THREE.DodecahedronGeometry(o.size, 0) : new THREE.SphereGeometry(o.size, 10, 8),
      new THREE.MeshStandardMaterial({ color: o.color, emissive: o.mesh === 'stone' ? '#000' : o.color, emissiveIntensity: o.mesh === 'stone' ? 0 : 1.6, flatShading: true }));
    mesh.position.copy(o.from); mesh.castShadow = true; this.scene.add(mesh);
    let glow = null;
    if (o.mesh !== 'stone') { glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.world.glowTex, color: o.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(o.size * 7); mesh.add(glow); }
    this.shots.push({ ...o, mesh, vel: new V3(o.dir.x * o.speed, o.vy || 0, o.dir.y * o.speed), life: 1.4, hit: new Set(), trailT: 0 });
  }
  updateShots(dt) {
    this.shots = this.shots.filter(s => {
      s.life -= dt; s.vel.y += (s.g || 0) * dt;
      s.mesh.position.addScaledVector(s.vel, dt); s.mesh.rotation.x += dt * 8; s.mesh.rotation.y += dt * 6;
      const p = s.mesh.position;
      s.trailT -= dt; if (s.trailT <= 0 && s.mesh.geometry.type !== 'DodecahedronGeometry') { s.trailT = .03; this.fx.glowAt(p.clone(), s.color, s.size * 4, .25); }
      const c = charAt(p.x, p.z);
      const blocked = !c || 'TRHWSPMCLO'.includes(c) && p.y < 2;
      if (s.life <= 0 || p.y < 0 || blocked) { this.fx.burst(s.type, p, 6, .6); this.removeShot(s); return false; }
      const foes = s.owner.kind === 'player' || s.owner.kind === 'ally' ? this.enemies() : [this.player, this.ally].filter(Boolean);
      for (const t of foes) {
        if (t.dead || s.hit.has(t)) continue;
        if (Math.hypot(p.x - t.x, p.z - t.z) < t.r + (s.range || 1) * .5 && p.y < t.h + .3) {
          s.hit.add(t);
          if (s.weapon) this.damage(t, this.player, this.weaponDamage(s.weapon, t, s.mult || 1), s.weapon === 'sling' ? 5 : 7);
          else this.hitBy(t, s.owner, s.move, s.mult || 1);
          if (!s.pierce) { this.removeShot(s); return false; }
        }
      }
      return true;
    });
  }
  removeShot(s) { this.scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }

  // ---------------- damage ----------------
  hitBy(target, attacker, moveKey, mult) {   // a creature's move hits a target
    if (target.kind === 'player') { this.hurtPlayer(attacker); return; }
    const r = LB.calcDmg(attacker.m, target.m, moveKey, mult);
    this.damage(target, attacker, { dmg: r.dmg, e: r.e, crit: r.crit, t: LB.MOVES[moveKey].t }, 6);
  }
  damage(u, attacker, r, kb) {
    if (u.dead || u.state === 'dazed' || u.state === 'captured') return;
    u.m.hpA = Math.max(0, u.m.hpA - r.dmg); u.flash();
    const dx = u.x - attacker.x, dz = u.z - attacker.z, d = Math.hypot(dx, dz) || 1;
    u.kb.set(dx / d * kb, dz / d * kb);
    const p = new V3(u.x, u.h * .55, u.z);
    this.fx.burst(r.t || 'Plain', p, r.e > 1 ? 20 : 11);
    this.fx.text(new V3(u.x + rand(-.3, .3), u.h + .3, u.z), (r.crit ? LB.t('CRIT') + ' ' : '') + r.dmg, r.e > 1 ? '#ffd23f' : r.e < 1 ? '#cfc8ba' : '#ffffff', r.e > 1 || r.crit ? 26 : 19);
    if (r.e > 1) this.fx.text(new V3(u.x, u.h + .9, u.z), LB.t('SUPER!'), '#ffd23f', 15);
    (r.e > 1 ? LB.SFX.super : r.e < 1 ? LB.SFX.weak : LB.SFX.hit)();
    this.fx.shake(u.kind === 'ally' ? .18 : .1, .1);
    this.hitStop = .045;
    if (u.m.hpA <= 0) this.knockOut(u);
  }
  hurtPlayer(attacker) {
    const P = this.player; if (P.iframes > 0) return;
    LB.G.hearts--; P.iframes = 1.1; P.flash(); LB.SFX.faint(); this.fx.shake(.45, .25);
    const dx = P.x - attacker.x, dz = P.z - attacker.z, d = Math.hypot(dx, dz) || 1; P.kb.set(dx / d * 9, dz / d * 9);
    this.fx.text(new V3(P.x, 2.4, P.z), '-♥', '#ff6a5a', 24);
    if (LB.G.hearts <= 0) this.blackout();
  }
  knockOut(u) {
    const G = LB.G;
    if (u.kind === 'ally') {
      LB.SFX.faint(); this.fx.text(new V3(u.x, 2, u.z), LB.t('{c} is worn out!', { c: u.m.sp }), '#ffb3a8', 16);
      setTimeout(() => { this.spawnAlly(true); if (!this.ally) LB.toast(LB.t('No companions left: run to the shrine!')); }, 300);
      u.dead = true; return;
    }
    LB.SFX.faint();
    const gain = Math.floor((u.m.lvl * 10 + 8) * (u.kind === 'boss' ? 1.5 : 1)), coins = u.m.lvl * (u.kind === 'boss' ? 10 : 4);
    G.coins += coins; this.fx.text(new V3(u.x, u.h + 1.2, u.z), '+' + LB.t('{n} coins', { n: coins }), '#ffd23f', 15);
    this.giveXp(gain);
    if (u.kind === 'boss') {
      u.state = 'captured'; this.fx.burst('Glimmer', new V3(u.x, 1, u.z), 22);
      u.vanish = .35;
      return;
    }
    u.state = 'dazed'; u.dazeT = LB.DAZE_TIME / 1000; u.vel.set(0, 0);
    if (u.alpha) {
      u.dazeT = 30; LB.SFX.roar(); this.fx.shake(.5, .4);
      const first = !G.alphas[u.alpha]; G.alphas[u.alpha] = 1;
      const nxt = LB.STAGE_ORDER[LB.STAGE_ORDER.indexOf(u.alpha) + 1];
      this.fx.text(new V3(u.x, u.h + 2.4, u.z), LB.t('ALPHA DEFEATED!'), '#ffd23f', 28);
      if (first) setTimeout(() => LB.toast(nxt ? LB.t('A new path opened: {s}! Use the Lantern Gate.', { s: LB.t(LB.STAGES[nxt].name) }) : LB.t('You beat every alpha. You are a true Lanternbound!')), 1200);
      G.items.salve += 2; LB.save(true);
    }
    this.fx.text(new V3(u.x, u.h + 1.6, u.z), LB.t(LB.touch ? 'Dazed! Throw a lantern (🏮)' : 'Dazed! Throw a lantern (E)'), '#9feaf2', 15);
  }
  giveXp(g) {
    LB.G.party.forEach(m => {
      if (m.hpA <= 0) return;
      m.xp += this.ally && m === this.ally.m ? g : Math.floor(g / 2);
      while (m.xp >= LB.need(m.lvl)) {
        m.xp -= LB.need(m.lvl); const before = LB.unitMaxHp(m); m.lvl++;
        m.hp = LB.statsOf(m).hp; m.hpA = Math.min(LB.unitMaxHp(m), m.hpA + (LB.unitMaxHp(m) - before) + Math.round(LB.unitMaxHp(m) * .3));
        if (this.ally && m === this.ally.m) { LB.SFX.lvl(); this.fx.burst('Glimmer', new V3(this.ally.x, 1, this.ally.z), 24, 1.2); this.fx.ring(this.ally.pos, '#9feaf2', .3, 3.5, .6); this.fx.text(new V3(this.ally.x, 2.6, this.ally.z), LB.t('LEVEL UP!') + '  ' + LB.t('Lv') + ' ' + m.lvl, '#9feaf2', 20); }
      }
    });
  }
  async blackout() {
    if (this.blacking) return; this.blacking = true; LB.mode = 'busy';
    this.fade.style.opacity = 1; await LB.wait(600);
    this.clearWild(); if (this.fight) this.fight.cancel(true);
    LB.healAll(); const G = LB.G, rp = LB.STAGES[LB.STAGE].respawn || [4, 19]; G.x = rp[0]; G.y = rp[1]; const c = tileCenter(rp[0], rp[1]);
    this.player.pos.set(c.x, 0, c.z); this.spawnAlly(); this.camTarget.set(c.x, 0, c.z); this.spawnAlpha();
    this.fade.style.opacity = 0; LB.mode = 'world'; this.blacking = false;
    await LB.dialog([LB.t('Everything went dark…'), LB.t('You wake up beside the shrine. Everyone is rested now.')]);
    LB.save(true);
  }
  clearWild() { this.wild.forEach(u => u.destroy()); this.wild = []; this.shots.forEach(s => this.removeShot(s)); this.shots = []; }
  enemies() { return this.wild.filter(u => !u.dead && u.state !== 'dazed' && u.state !== 'captured' && u.state !== 'gone'); }

  // ---------------- companion ----------------
  petAttack(target, point) {
    const a = this.ally; if (!a || a.state === 'lunge') return;
    const tx = target ? target.x : point.x, tz = target ? target.z : point.z;
    const k = LB.basicMove(a.m.sp);
    this.petCd = Math.max(.55, 1.15 - LB.statsOf(a.m).spd / 160);
    if (a.style.kind === 'shot') {
      const dir = new V2(tx - a.x, tz - a.z).normalize();
      const col = { Ember: '#ff8a3c', Tide: '#4aa8e0', Gale: '#e8eeff', Glimmer: '#e4b8ff' }[a.t] || '#ffffff';
      this.shoot({ from: new V3(a.x, a.h * .55, a.z), dir, speed: a.style.proj / 16, owner: a, move: k, mult: 1, type: a.t, color: col, size: .17 });
    } else this.lunge(a, tx, tz, k, 1);
  }
  petSpecial() {
    const a = this.ally; if (!a || this.spcCd > 0) return;
    const aim = this.aimDir(9); const tgt = aim.unit; const tx = tgt ? tgt.x : aim.point.x, tz = tgt ? tgt.z : aim.point.z;
    const k = LB.specialMove(a.m.sp); this.spcCd = 4;
    this.fx.text(new V3(a.x, a.h + .6, a.z), LB.t(LB.MOVES[k].n) + '!', '#ffe7a0', 18);
    if (a.style.kind === 'shot') {
      const base = Math.atan2(tz - a.z, tx - a.x);
      const col = { Ember: '#ff8a3c', Tide: '#4aa8e0', Gale: '#e8eeff', Glimmer: '#e4b8ff' }[a.t] || '#ffffff';
      [-.3, 0, .3].forEach(o => this.shoot({ from: new V3(a.x, a.h * .6, a.z), dir: new V2(Math.cos(base + o), Math.sin(base + o)), speed: a.style.proj / 15, owner: a, move: k, mult: 1.1, type: a.t, color: col, size: .3, pierce: true }));
    } else { this.lunge(a, tx, tz, k, 1.5, true); a.leap = .32; }
  }
  lunge(u, tx, tz, k, mult, aoe) {
    const dx = tx - u.x, dz = tz - u.z, d = Math.min(7, Math.hypot(dx, dz)) || 1;
    u.state = 'lunge'; u.lungeHit = new Set(); u.lungeKey = k; u.lungeMult = mult; u.lungeAoe = aoe;
    const sp = Math.max(15, d / .2); u.vel.set(dx / Math.hypot(dx, dz) * sp, dz / Math.hypot(dx, dz) * sp); u.lungeT = .2;
  }
  updateLunge(u, dt, foes) {
    u.lungeT -= dt; this.move(u, u.vel.x * dt, u.vel.y * dt);
    if (u.leap) { u.lift = Math.sin((1 - u.lungeT / .2) * Math.PI) * 1.2; }
    foes.forEach(t => { if (!t || t.dead || u.lungeHit.has(t)) return; if (dist(u.pos, t.pos) < u.r + t.r + (u.lungeAoe ? .6 : .2)) { u.lungeHit.add(t); this.hitBy(t, u, u.lungeKey, u.lungeMult); } });
    if (u.lungeT <= 0) {
      u.state = 'chase'; u.vel.set(0, 0); u.lift = 0;
      if (u.lungeAoe) {
        u.leap = 0; this.fx.ring(u.pos, '#ffe7a0', .4, 4.5, .45); this.fx.burst(u.t, new V3(u.x, .3, u.z), 26, 1.3); this.fx.shake(.35, .2);
        foes.forEach(t => { if (t && !t.dead && !u.lungeHit.has(t) && dist(u.pos, t.pos) < 3.6) this.hitBy(t, u, u.lungeKey, u.lungeMult * .8); });
      }
    }
  }
  updateAlly(dt) {
    const a = this.ally; if (!a) return;
    if (a.state === 'lunge') { this.updateLunge(a, dt, this.enemies()); return; }
    const P = this.player, tx = P.x - this.face.x * 1.6, tz = P.z - this.face.y * 1.2 + .3;
    const d = Math.hypot(tx - a.x, tz - a.z);
    if (dist(a.pos, P.pos) > 14) { a.pos.set(P.x - 1, 0, P.z + .5); return; }
    const sp = Math.min(9, d * 4);
    a.vel.set(d > .2 ? (tx - a.x) / d * sp : 0, d > .2 ? (tz - a.z) / d * sp : 0);
    this.move(a, (a.vel.x + a.kb.x) * dt, (a.vel.y + a.kb.y) * dt); a.kb.multiplyScalar(Math.pow(.02, dt));
    // fights on its own when enemies are close
    if (this.petCd <= 0) { let best = null, bd = 7; this.enemies().forEach(u => { const dd = dist(a.pos, u.pos); if (dd < bd) { bd = dd; best = u; } }); if (best) this.petAttack(best); }
  }

  // ---------------- wild companions ----------------
  spawnWild(dt) {
    this.spawnT -= dt; if (this.spawnT > 0 || this.fight) return; this.spawnT = 1.2;
    const P = this.player;
    this.wild.slice().forEach(u => { if (u.kind === 'wild' && !u.alpha && dist(P.pos, u.pos) > 34) { u.destroy(); this.wild.splice(this.wild.indexOf(u), 1); } });
    if (this.wild.filter(u => u.kind === 'wild').length >= LB.WILD_CAP) return;
    for (let i = 0; i < 14; i++) {
      const x = P.x + rand(-17, 17), z = P.z + rand(-14, 12), c = charAt(x, z), Z = LB.ZONES[c];
      if (!Z || Math.hypot(x - P.x, z - P.z) < 7) continue;
      let sp = Z.t[LB.rnd(0, Z.t.length - 1)]; if (sp === '*') sp = LB.STARTERS.filter(s => s !== LB.G.starter && s !== LB.rivalStarter())[0];
      const m = LB.mk(sp, LB.rnd(Z.lv[0], Z.lv[1])); m.hpA = LB.unitMaxHp(m);
      const u = new Actor(this, { kind: 'wild', m, x, z }); u.zoneChar = c; u.appear = 0;
      this.fx.burst('Grove', new V3(x, .4, z), 10, .7);
      LB.G.seen[sp] = 1; this.wild.push(u); return;
    }
  }
  updateEnemy(u, dt) {
    if (u.vanish != null) { u.vanish -= dt; u.obj.scale.setScalar(Math.max(.01, u.vanish / .35)); if (u.vanish <= 0) { u.destroy(); this.wild.splice(this.wild.indexOf(u), 1); if (this.fight) this.fight.next(); } return; }
    if (u.state === 'captured') return;
    if (u.state === 'dazed') {
      u.dazeT -= dt; u.vel.set(0, 0); u.pivot.rotation.z = Math.sin(this.t * 6) * .18;
      if ((u.starT = (u.starT || 0) - dt) <= 0) { u.starT = .25; this.fx.burst('Glimmer', new V3(u.x, u.h + .2, u.z), 2, .3); }
      if (u.dazeT <= 0) { u.state = 'gone'; this.fx.text(new V3(u.x, u.h, u.z), LB.t('It ran away…'), '#cfc8ba', 15); u.vanish = .35; }
      return;
    }
    if (u.state === 'gone') return;
    u.cd -= dt;
    if (u.state === 'lunge') { this.updateLunge(u, dt, [this.player, this.ally]); return; }
    if (u.state === 'windup') { u.windT -= dt; u.pivot.position.x = Math.sin(this.t * 60) * .05; if (u.windT <= 0) { u.pivot.position.x = 0; u.tint(); u.state = 'chase'; u.doAttack(); } this.move(u, u.kb.x * dt, u.kb.y * dt); u.kb.multiplyScalar(Math.pow(.02, dt)); return; }
    const P = this.player, targets = [P, this.ally].filter(t => t && !t.dead);
    let tgt = null, td = u.kind === 'boss' ? 18 : u.alpha ? 11 : 7.5;
    targets.forEach(t => { const d = dist(u.pos, t.pos); if (d < td) { td = d; tgt = t; } });
    const base = (38 + LB.statsOf(u.m).spd * 1.1) / 16 * (u.kind === 'boss' ? 1.25 : 1);
    let vx = 0, vz = 0;
    if (!tgt) {
      u.wanderT -= dt;
      if (u.wanderT <= 0) { u.wanderT = rand(1.5, 3); const a = rand(0, 6.28); u.wdir = Math.random() < .35 ? null : new V2(Math.cos(a), Math.sin(a)); }
      if (u.wdir) { const nc = charAt(u.x + u.wdir.x, u.z + u.wdir.y); if (u.alpha ? nc !== 'A' : (u.kind === 'wild' && !LB.ZONES[nc])) u.wdir = null; else { vx = u.wdir.x * base * .4; vz = u.wdir.y * base * .4; } }
    } else {
      if (u.alpha && (u.specT -= dt) <= 0) { u.specT = rand(3.2, 4.6); u.cd = Math.max(u.cd, 1.2); this.alphaSpecial(u, tgt); if (u.state === 'windup') return; }
      const dx = tgt.x - u.x, dz = tgt.z - u.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d;
      if (u.style.kind === 'shot') {
        const want = td > 8 ? 1 : td < 4.5 ? -1 : 0, side = Math.sin(this.t * 1.6 + u.bob) * .6;
        vx = (nx * want - nz * side) * base; vz = (nz * want + nx * side) * base;
        if (u.cd <= 0 && td < 12) {
          u.cd = (u.kind === 'boss' ? 1.15 : 1.9) + Math.random() * .5;
          const tp = tgt.pos.clone(), dur = u.kind === 'boss' ? .4 : .55;
          this.fx.telegraph(u.pos, tp, 'shot', dur);
          this.windup(u, dur, () => {
            const k = LB.basicMove(u.m.sp), col = { Ember: '#ff8a3c', Tide: '#4aa8e0', Gale: '#e8eeff', Glimmer: '#e4b8ff' }[u.t] || '#fff';
            const b = Math.atan2(tp.z - u.z, tp.x - u.x);
            (u.kind === 'boss' ? [-.25, 0, .25] : [0]).forEach(o => this.shoot({ from: new V3(u.x, u.h * .55, u.z), dir: new V2(Math.cos(b + o), Math.sin(b + o)), speed: u.style.proj / 22, owner: u, move: k, mult: u.kind === 'boss' ? .9 : 1, type: u.t, color: col, size: .2 }));
          });
        }
      } else {
        vx = nx * base; vz = nz * base;
        if (u.cd <= 0 && td < 3.4) {
          u.cd = (u.kind === 'boss' ? 1.1 : 1.7) + Math.random() * .5;
          const tp = tgt.pos.clone(), dur = u.kind === 'boss' ? .4 : .55;
          this.fx.telegraph(u.pos, tp, 'melee', dur);
          this.windup(u, dur, () => this.lunge(u, tp.x, tp.z, LB.basicMove(u.m.sp), 1));
        }
      }
    }
    u.vel.set(vx, vz);
    this.move(u, (vx + u.kb.x) * dt, (vz + u.kb.y) * dt); u.kb.multiplyScalar(Math.pow(.02, dt));
  }
  windup(u, dur, fn) { u.state = 'windup'; u.windT = dur; u.doAttack = fn; u.tint('#ff8a7a'); u.vel.set(0, 0); }

  // ---------------- lanterns & capture ----------------
  startAim() {
    const G = LB.G;
    if (!(G.items[G.lanternSel] > 0)) { const k = Object.keys(LB.LANTERNS).find(k => G.items[k] > 0); if (!k) { LB.toast(LB.t('No lanterns! Buy some at the stall')); return; } G.lanternSel = k; }
    this.aiming = true; this.reticle.visible = true; this.arcDots.visible = true;
    this.reticle.material.color.set(LB.LANTERNS[G.lanternSel].col);
  }
  stopAim() { this.aiming = false; this.reticle.visible = false; this.arcDots.visible = false; }
  aimLanding() {
    const P = this.player; let t = null;
    if (this.mouseRecent()) t = this.pointerGround();
    if (!t) { let best = null, bd = 11; this.wild.forEach(u => { if (u.state !== 'dazed') return; const d = dist(P.pos, u.pos); if (d < bd) { bd = d; best = u; } }); t = best ? best.pos.clone() : new V3(P.x + this.face.x * 6, 0, P.z + this.face.y * 6); }
    const d = Math.hypot(t.x - P.x, t.z - P.z); if (d > 10) { t.x = P.x + (t.x - P.x) / d * 10; t.z = P.z + (t.z - P.z) / d * 10; }
    return t;
  }
  drawAim() {
    const P = this.player, e = this.aimLanding(), s = new V3(P.x, 1.6, P.z);
    this.aimEnd = e; this.reticle.position.set(e.x, .08, e.z); this.reticle.scale.setScalar(1 + Math.sin(this.t * 8) * .08);
    const dm = new THREE.Object3D(), d = Math.hypot(e.x - s.x, e.z - s.z);
    for (let i = 0; i < 16; i++) { const k = (i + 1) / 17; dm.position.set(s.x + (e.x - s.x) * k, s.y * (1 - k) + Math.sin(k * Math.PI) * d * .35 + .1, s.z + (e.z - s.z) * k); dm.updateMatrix(); this.arcDots.setMatrixAt(i, dm.matrix); }
    this.arcDots.instanceMatrix.needsUpdate = true;
  }
  throwLantern() {
    const G = LB.G, kind = G.lanternSel; if (!(G.items[kind] > 0)) { this.stopAim(); return; }
    const end = this.aimEnd || this.aimLanding(); this.stopAim();
    G.items[kind]--; LB.SFX.throw();
    const L = LB.LANTERNS[kind], P = this.player, lan = makeLantern(L.col, this.world.glowTex);
    lan.position.set(P.x, 1.6, P.z); this.scene.add(lan);
    this.flying = { lan, kind, s: lan.position.clone(), e: end, t: 0, dur: .55, d: Math.hypot(end.x - P.x, end.z - P.z) };
  }
  updateFlying(dt) {
    const f = this.flying; if (!f) return;
    f.t += dt / f.dur; const k = Math.min(1, f.t);
    f.lan.position.set(f.s.x + (f.e.x - f.s.x) * k, f.s.y * (1 - k) + .35 + Math.sin(k * Math.PI) * f.d * .35, f.s.z + (f.e.z - f.s.z) * k);
    f.lan.rotation.y += dt * 12; f.lan.rotation.z = Math.sin(k * 9) * .4;
    if (k < 1) return;
    this.flying = null; f.lan.rotation.set(0, 0, 0);
    const hit = this.wild.find(u => !u.dead && Math.hypot(f.e.x - u.x, f.e.z - u.z) < u.r + .9);
    if (hit && hit.state === 'dazed') { this.startCapture(hit, f.lan, f.kind); return; }
    this.fx.text(new V3(f.e.x, 1.4, f.e.z), LB.t(hit ? (hit.kind === 'boss' ? "Can't befriend a trainer's companion" : 'Too strong! Weaken it first') : 'Missed!'), hit ? '#ffb3a8' : '#cfc8ba', 16);
    LB.SFX.escape(); this.fx.burst('Plain', f.lan.position, 8); this.scene.remove(f.lan);
  }
  startCapture(u, lan, kind) {
    LB.mode = 'capture'; u.state = 'captured';
    this.fx.burst('Glimmer', new V3(u.x, 1, u.z), 20); LB.SFX.caught();
    const L = LB.LANTERNS[kind], cr = LB.MON[u.m.sp].cr;
    const zone = kind === 'warden' ? 2 : Math.min(.75, Math.max(.25, (5 + 7 * cr * L.bonus(u.t)) / 22 * 1.1));
    const R0 = 1.1, mk = (geo, color, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(u.x, .1, u.z); this.scene.add(m); return m; };
    const zoneM = mk(new THREE.RingGeometry(R0 - zone / 2, R0 + zone / 2, 48), '#5aa340', .45);
    const targetM = mk(new THREE.RingGeometry(R0 - .03, R0 + .03, 48), '#ffffff', 1);
    const movingM = mk(new THREE.RingGeometry(.94, 1, 48), '#ffd23f', 1); movingM.position.y = .12;
    const pips = [0, 1, 2].map(i => { const p = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#3b2f20' })); p.position.set(u.x - .3 + i * .3, 2.4, u.z); this.scene.add(p); return p; });
    this.capture = { u, lan, kind, zone, R0, zoneM, targetM, movingM, pips, hits: 0, r: 3.2, t: 0, dur: Math.max(.56, 1.05 - u.m.lvl * .025), waiting: false, shrink: 0, wait: .5 };
    lan.position.set(u.x, .4, u.z);
  }
  updateCapture(dt) {
    const c = this.capture; if (!c) return;
    c.shrink = Math.min(1, c.shrink + dt * 3); const s = Math.max(.01, 1 - c.shrink); c.u.obj.scale.setScalar(s); c.u.pivot.position.y = c.shrink * .6;
    c.lan.position.y = .45 + Math.abs(Math.sin(this.t * 3)) * .05; c.lan.userData.glow.scale.setScalar(1 + c.hits * .35);
    if (c.wait > 0) { c.wait -= dt; if (c.wait <= 0) { c.waiting = true; c.t = 0; } return; }
    if (!c.waiting) return;
    c.t += dt; c.r = 3.2 * (1 - c.t / c.dur); c.movingM.scale.setScalar(Math.max(.01, c.r));
    if (c.kind === 'warden' && Math.abs(c.r - c.R0) < .06) this.capturePress();
    if (c.r <= 0) this.captureResult(false);
  }
  capturePress() { const c = this.capture; if (!c || !c.waiting) return; this.captureResult(Math.abs(c.r - c.R0) <= c.zone / 2 + .06); }
  captureResult(ok) {
    const c = this.capture; c.waiting = false;
    if (ok) {
      c.pips[c.hits].material.color.set('#9feaf2'); c.hits++; LB.SFX.shake();
      this.fx.text(new V3(c.u.x, 2.9, c.u.z), LB.t(['Good!', 'Great!', 'Perfect!'][c.hits - 1]), '#9feaf2', 20);
      this.fx.ring(c.u.pos, '#9feaf2', 1, 2, .3, .12);
      if (c.hits >= 3) { this.captureWin(); return; }
      c.wait = .35; c.movingM.scale.setScalar(3.2);
    } else this.captureEnd(false);
  }
  captureWin() {
    const c = this.capture, G = LB.G, m = c.u.m;
    LB.SFX.caught(); this.fx.burst('Glimmer', new V3(c.u.x, 1, c.u.z), 34, 1.3); this.fx.ring(c.u.pos, '#ffd23f', .5, 5, .6);
    const first = !G.caught[m.sp]; G.caught[m.sp] = 1; if (c.u.alpha) G.alphaCaught[c.u.alpha] = 1;
    m.xp = 0; m.hpA = Math.round(LB.unitMaxHp(m) * .6); m.hp = LB.statsOf(m).hp;
    const full = G.party.length >= 6; if (!full) G.party.push(m); else G.box.push(m);
    this.fx.text(new V3(c.u.x, 3.3, c.u.z), LB.t('{c} joined you!', { c: m.sp }), '#ffffff', 24);
    setTimeout(() => { if (first) LB.toast(LB.t('{c} added to your journal!', { c: m.sp })); if (full) LB.toast(LB.t('{c} went to rest at the shrine (party full)', { c: m.sp })); }, 900);
    this.captureEnd(true);
  }
  captureEnd(won) {
    const c = this.capture; this.capture = null;
    [c.zoneM, c.targetM, c.movingM, ...c.pips].forEach(m => { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
    if (won) {
      setTimeout(() => this.scene.remove(c.lan), 700);
      c.u.destroy(); this.wild.splice(this.wild.indexOf(c.u), 1); LB.save(true);
    } else {
      LB.SFX.escape(); this.fx.text(new V3(c.u.x, 2.4, c.u.z), LB.t('It broke free!'), '#ffb3a8', 20); this.fx.shake(.2, .15);
      this.scene.remove(c.lan); c.u.obj.scale.setScalar(1); c.u.pivot.position.y = 0;
      c.u.state = 'dazed'; c.u.dazeT = Math.max(c.u.dazeT, 4.5);
    }
    LB.mode = 'world';
  }

  // ---------------- trainer fights (used by story.js) ----------------
  trainerFight(npc, team) {
    return new Promise(res => {
      const g = this, npcA = this.npcs[npc.id];
      this.clearWild();
      const f = this.fight = { npc, team: team.slice(), cur: null, cx: npcA.x, cz: npcA.z,
        next() {
          if (g.fight !== f) return;
          const m = f.team.shift();
          if (!m) { g.fight = null; LB.SFX.win(); LB.toast(LB.t('You beat {n}!', { n: npc.who })); res(true); return; }
          m.hpA = LB.unitMaxHp(m);
          const a = Math.atan2(g.player.z - f.cz, g.player.x - f.cx);
          const u = new Actor(g, { kind: 'boss', m, x: f.cx + Math.cos(a) * 2.2, z: f.cz + Math.sin(a) * 2.2 }); u.cd = 1.3;
          g.wild.push(u); f.cur = u; LB.G.seen[m.sp] = 1;
          g.fx.burst('Glimmer', new V3(u.x, 1, u.z), 24); g.fx.ring(u.pos, '#ffd23f', .3, 3.5, .5); LB.SFX.enc();
          LB.toast(LB.t('{n} sends out {c}!', { n: npc.who, c: m.sp }));
        },
        cancel(silent) { g.fight = null; g.wild.filter(u => u.kind === 'boss').forEach(u => u.destroy()); g.wild = g.wild.filter(u => u.kind !== 'boss'); if (!silent) LB.toast(LB.t("{n}: Come back when you're ready!", { n: npc.who })); res(false); }
      };
      LB.SFX.enc(); this.fx.shake(.2, .2);
      setTimeout(() => f.next(), 500);
    });
  }

  // ---------------- interaction ----------------
  nearInteract() {
    const P = this.player; if (!P) return null;
    for (const id in this.npcs) { const n = this.npcs[id]; if (dist(P.pos, n.pos) < 1.9) return { npc: n.npc }; }
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]]) {
      const tx = Math.floor(P.x / S) + dx, tz = Math.floor(P.z / S) + dz, c = LB.MAP[tz] && LB.MAP[tz][tx];
      if (c && 'SMPHO'.includes(c)) { const cc = tileCenter(tx, tz); if (Math.hypot(cc.x - P.x, cc.z - P.z) < 2.1) return { tx, ty: tz, c }; }
    }
    return null;
  }
  async interact() {
    const t = this.nearInteract(); if (!t || this.fight) return;
    this.player.vel.set(0, 0);
    if (t.c === 'O') { this.portalMenu(); return; }
    if (t.npc) await LB.story.interact(t.npc.x, t.npc.y); else await LB.story.interact(t.tx, t.ty);
    this.refreshNpcs(); this.spawnAllyIfChanged(); this.refreshWeapon();
  }

  // ---------------- main loop ----------------
  loop() {
    requestAnimationFrame(() => this.loop());
    const raw = this.clock.getDelta(); let dt = Math.min(.05, raw); this.t += dt;
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= .15; }
    if (LB.mode === 'world' || LB.mode === 'capture') this.step(dt);
    else if (LB.mode === 'title') { const a = this.t * .06; this.camTarget.set(12 + Math.cos(a) * 3, 0, 32); this.camOff.set(Math.cos(a) * 14, 9, Math.sin(a) * 14 + 4); }
    // camera
    const P = this.player;
    if (P && LB.mode !== 'title') { this.camTarget.lerp(new V3(P.x, 0, P.z), Math.min(1, dt * 6)); this.camOff.lerp(this.capture ? CAM_CAPTURE : CAM_OFF, Math.min(1, dt * 3)); }
    const sh = this.fx.shakeOffset();
    const zoom = LB.screen.camZoom(this.camera.aspect);   // pull back on tall/narrow screens (see screen.js)
    this.yaw += (this.yawT - this.yaw) * Math.min(1, dt * 8);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const ox = this.camOff.x * cy + this.camOff.z * sy, oz = -this.camOff.x * sy + this.camOff.z * cy;
    this.camera.position.set(this.camTarget.x + ox * zoom + sh.x * cy, this.camTarget.y + this.camOff.y * zoom + sh.y, this.camTarget.z + oz * zoom - sh.x * sy);
    this.camera.lookAt(this.camTarget.x, .8, this.camTarget.z);
    this.world.update(this.t, dt, P ? P.pos : this.camTarget);
    this.fx.update(dt);
    if (P) { [P, this.ally, ...this.wild, ...Object.values(this.npcs)].forEach(a => a && !a.dead && a.updateLabel && a.updateLabel(this.fx)); updateHud(this); this.updatePrompt(); }
    this.pressed.clear(); this.released.clear();
    this.post.focus(!!this.capture); this.post.render(raw);
  }
  updatePrompt() {
    const P = this.player; let txt = '', at = null;
    if (LB.mode === 'world') {
      const ni = this.nearInteract();
      if (ni && !this.fight) { txt = LB.touch ? 'A: ' + LB.t('Talk') : 'F: ' + LB.t('Talk'); at = new V3(P.x, 2.6, P.z); }
      else { const dz = this.wild.find(u => u.state === 'dazed' && dist(P.pos, u.pos) < 10); if (dz && !this.aiming) { txt = (LB.touch ? '🏮 ' : 'E: ') + LB.t('Lantern!'); at = new V3(dz.x, dz.h + 1.2, dz.z); } }
    }
    if (!txt) { this.promptEl.style.display = 'none'; return; }
    const s = this.fx.project(at); this.promptEl.style.display = ''; this.promptEl.firstChild.textContent = txt;
    this.promptEl.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
  }
  step(rdt) {
    const G = LB.G, P = this.player, K = this.keys, Pr = this.pressed;
    const q = LB.btnQueue || []; LB.btnQueue = [];
    if (this.capture) {
      if (Pr.has('Space') || Pr.has('KeyJ') || Pr.has('Enter') || Pr.has('KeyE') || Pr.has('MouseL') || q.length) this.capturePress();
      this.updateCapture(rdt); return;
    }
    const fresh = performance.now() - (LB.lastDialogEnd || 0) > 250;
    const dt = this.aiming ? rdt * .35 : rdt;   // slow motion while aiming a lantern
    // --- actions ---
    if (fresh && (Pr.has('KeyF') || Pr.has('Enter') || q.includes('talk')) && this.nearInteract()) { this.interact(); return; }
    if (Pr.has('KeyE') || q.includes('lantern')) { if (this.aiming) this.throwLantern(); else this.startAim(); }
    if (this.aiming && Pr.has('MouseL')) this.throwLantern();
    else if (fresh && (Pr.has('KeyJ') || Pr.has('MouseL') || q.includes('atk'))) { if (this.aiming) this.throwLantern(); else this.weaponPress(); }
    if (this.charging) { this.charge = Math.min(1, (this.charge || 0) + rdt / 1.0); const tip = this.weapon.userData.tip; if (tip) tip.scale.setScalar(1 + this.charge * 1.5); if (Math.random() < .5) this.fx.glowAt(tip.getWorldPosition(new V3()), '#e4b8ff', .3 + this.charge * .6, .2); }
    if (this.charging && (this.released.has('KeyJ') || this.released.has('MouseL') || (!K.KeyJ && !K.MouseL && !q.includes('atk')))) { if (this.weapon.userData.tip) this.weapon.userData.tip.scale.setScalar(1); this.weaponRelease(); }
    if (Pr.has('KeyK') || Pr.has('MouseR')) { const a = this.aimDir(9); this.petAttack(a.unit, a.point); }
    if (Pr.has('KeyL') || q.includes('spc')) this.petSpecial();
    if ((Pr.has('Space') || Pr.has('ShiftLeft') || Pr.has('ShiftRight') || q.includes('dodge')) && fresh) this.roll();
    if (Pr.has('KeyQ') || q.includes('switch')) this.cycleAlly();
    if (Pr.has('KeyH') || q.includes('salve')) this.useSalve();
    if (Pr.has('KeyR')) { const ks = Object.keys(LB.LANTERNS).filter(k => G.items[k] > 0); if (ks.length) { G.lanternSel = ks[(ks.indexOf(G.lanternSel) + 1) % ks.length]; LB.SFX.sel(); } }
    ['Digit1', 'Digit2', 'Digit3'].forEach((d, i) => { if (Pr.has(d)) this.selectWeapon(['staff', 'sling', 'wand'][i]); });
    if (this.aiming) this.drawAim();

    // --- movement ---
    let ix = 0, iz = 0;
    if (K.KeyA || K.ArrowLeft) ix -= 1; if (K.KeyD || K.ArrowRight) ix += 1; if (K.KeyW || K.ArrowUp) iz -= 1; if (K.KeyS || K.ArrowDown) iz += 1;
    if (LB.stick && Math.hypot(LB.stick.x, LB.stick.y) > .2) { ix = LB.stick.x; iz = LB.stick.y; }
    if (Pr.has('KeyG')) LB.toast(LB.t(this.post.toggle() ? 'Graphics: beautiful' : 'Graphics: fast'));
    if (Pr.has('KeyZ') || q.includes('camL')) this.yawT -= Math.PI / 4;
    if (Pr.has('KeyX') || q.includes('camR')) this.yawT += Math.PI / 4;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);   // screen-right = (cy,-sy), toward camera = (sy,cy)
    const inp = new V2(ix * cy + iz * sy, -ix * sy + iz * cy); if (inp.lengthSq() > 1) inp.normalize();
    if (inp.lengthSq() > .04 && !this.swing) this.face.copy(inp).normalize();
    this.wCd -= rdt; this.comboT -= rdt; this.petCd -= dt; this.spcCd -= dt; this.rollCd -= rdt; P.iframes -= rdt;
    if (this.rollT > 0) {
      this.rollT -= rdt; const k = 1 - this.rollT / .24;
      this.move(P, this.rollDir.x * 15 * rdt, this.rollDir.y * 15 * rdt);
      P.pivot.rotation.z = (P.flip ? 1 : -1) * k * Math.PI * 2; P.pivot.position.y = Math.sin(k * Math.PI) * .35;
      if (this.rollT <= 0) { P.rolling = false; P.pivot.rotation.z = 0; }
    } else {
      const top = this.aiming ? 3.4 : this.charging ? 4.5 : 7.4;
      P.vel.lerp(new V2(inp.x * top, inp.y * top), Math.min(1, rdt * 12));
      this.move(P, (P.vel.x + P.kb.x) * rdt, (P.vel.y + P.kb.y) * rdt); P.kb.multiplyScalar(Math.pow(.02, rdt));
      if (P.vel.length() > 3 && (this.dustT = (this.dustT || 0) - rdt) <= 0) { this.dustT = .16; this.fx.dust(P.pos, 2); }
      if (P.vel.length() > 2.5 && (this.stepT = (this.stepT || 0) - rdt) <= 0) { this.stepT = .29; LB.audio.step(this.surfaceAt(P.x, P.z)); }
    }
    P.mat.opacity = 1; P.obj.visible = !(P.iframes > 0 && this.rollT <= 0 && Math.floor(this.t * 14) % 2);
    this.updateWeaponPose(rdt);
    this.updateAlly(dt);
    this.wild.slice().forEach(u => !u.dead && this.updateEnemy(u, dt));
    this.updateShots(dt);
    this.updateFlying(rdt);
    this.spawnWild(rdt);
    // music intensity: boss > combat (enemy close or hostile) > explore
    const hostile = this.wild.some(u => !u.dead && u.state !== 'dazed' && u.state !== 'captured' && (u.kind === 'boss' || ['chase', 'windup', 'lunge'].includes(u.state)) && dist(P.pos, u.pos) < 14);
    LB.audio.setIntensity(this.wild.some(u => !u.dead && u.alpha && u.state !== 'dazed' && dist(P.pos, u.pos) < 22) ? 2 : (this.fight || hostile) ? 1 : 0);
    if (this.fight && Math.hypot(P.x - this.fight.cx, P.z - this.fight.cz) > 20) this.fight.cancel();
    // --- visuals ---
    this.orient(P, this.swing || this.charging || this.aiming ? this.face : (P.vel.length() > .6 ? P.vel : null));
    P.animate(rdt, P.vel.length() > .6 || this.rollT > 0, this.yaw);
    if (this.ally) { this.orient(this.ally, this.ally.vel.length() > .6 ? this.ally.vel : null); this.ally.animate(dt, this.ally.vel.length() > .6, this.yaw); }
    this.wild.forEach(u => { if (u.dead || u.state === 'captured') return; this.orient(u, u.vel.length() > .4 ? u.vel : new V2(P.x - u.x, P.z - u.z)); u.animate(dt, u.vel.length() > .4, this.yaw); });
    Object.values(this.npcs).forEach(n => { this.orient(n, dist(P.pos, n.pos) < 5 ? new V2(P.x - n.x, P.z - n.z) : null); n.animate(rdt, false, this.yaw); });
    G.x = Math.floor(P.x / S); G.y = Math.floor(P.z / S);
    const z = LB.zoneAt(G.x, G.y); if (z !== this.lastZone) { this.lastZone = z; LB.toast(LB.t(LB.ZONE_NAMES[z])); }
  }
  // choose each character's drawing (front / ¾ / side / back) from its direction as seen by the camera
  orient(a, dir) {
    if (!a) return;
    if (dir) a.look.set(dir.x, dir.y).normalize();
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const sx = a.look.x * cy - a.look.y * sy, sz = a.look.x * sy + a.look.y * cy;
    a.sv = a.vel.x * cy - a.vel.y * sy; a.face(sx, sz);
  }
  surfaceAt(x, z) {
    const c = charAt(x, z);
    return ({ '=': 'wood', B: 'wood', '.': 'dirt', ':': 'dirt', '_': 'stone', '#': 'stone', c: 'stone', k: 'stone', w: 'water', ',': 'grass', ';': 'grass', g: 'grass', r: 'stone', G: 'grass', s: 'sand' })[c] || 'grass';
  }
  roll() {
    if (this.rollCd > 0 || this.rollT > 0) return;
    const P = this.player; this.rollDir = P.vel.length() > .5 ? P.vel.clone().normalize() : this.face.clone();
    this.rollT = .24; this.rollCd = .75; P.iframes = .4; P.rolling = true; LB.SFX.roll(); this.fx.dust(P.pos, 6);
  }
  updateWeaponPose(dt) {
    const w = this.weaponPivot; if (!w) return;
    const P = this.player;
    if (this.swing) {
      const s = this.swing; s.t += dt; const k = Math.min(1, s.t / s.dur), e = 1 - Math.pow(1 - k, 3);
      const a = s.from + (s.to - s.from) * e;
      w.position.set(Math.sin(a) * .75, .95, Math.cos(a) * .75); w.rotation.set(0, a, 0); this.weapon.rotation.set(Math.PI / 2 - .2, 0, 0);
      if (k >= 1) this.swing = null;
      return;
    }
    const side = P.flip ? -1 : 1, bob = Math.sin(this.t * (P.vel.length() > .6 ? 14 : 2)) * .04;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    w.position.set(.48 * side * cy + .12 * sy, .95 + bob, -.48 * side * sy + .12 * cy); w.rotation.set(0, this.yaw, 0);
    if (LB.G.weapon === 'staff') this.weapon.rotation.set(0, 0, -.25 * side);
    else if (LB.G.weapon === 'sling') this.weapon.rotation.set(-.3, 0, -.4 * side);
    else this.weapon.rotation.set(this.charging ? -1.1 : -.2, 0, -.3 * side);
  }
}

new Game();
