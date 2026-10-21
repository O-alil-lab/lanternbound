window.LB = window.LB || {};
// ============================================================
// World — real-time action-adventure.
//   You move freely, your lead companion follows and fights where you aim,
//   wild companions roam the tall grass and attack (watch for the flash and dodge!),
//   weaken one until it's dazed, then throw a lantern and hit the timing ring to befriend it.
//
// Keyboard: WASD/arrows move · J or left-click attack · K or right-click special ·
//           Space/Shift dodge · E lantern (aim, then E/click to throw) · R lantern type ·
//           Q switch companion · H salve · F/Enter talk
// ============================================================
const TS = 32;   // tile size (same as LB.TS)
const SHOT_BLOCK = new Set(['T', 'R', 'H', 'W', 'S', 'P', 'M']);
const hexN = h => Phaser.Display.Color.HexStringToColor(h).color;
const PFX = {
  Grove: ['pt_leaf', [0x7fbf4a, 0xb5dd7a]], Tide: ['pt_drop', [0x4aa8e0, 0xa8e2ff]], Ember: ['pt_spark', [0xff8a3c, 0xffd27a]],
  Gale: ['pt_streak', [0xffffff, 0xc9d4ff]], Stone: ['pt_rock', [0x8a7560, 0xb9a88c]], Glimmer: ['pt_star', [0xe4b8ff, 0xfff3a8]],
  Plain: ['pt_dot', [0xffffff, 0xf3e3c0]]
};

// ---------- A creature or trainer in the world ----------
class Unit {
  constructor(scene, opts) {
    // opts: { kind:'player'|'ally'|'wild'|'boss', m (mon), key (trainer texture), x, y }
    this.s = scene; this.kind = opts.kind; this.m = opts.m; this.key = opts.key;
    this.p = scene.physics.add.image(opts.x, opts.y, 'px').setVisible(false);
    this.p.body.setSize(16, 10);
    this.p.unit = this;
    this.v = scene.add.container(opts.x, opts.y);
    this.shadow = scene.add.ellipse(0, 0, 22, 8, 0x000000, .22);
    const tex = opts.key || ('f_' + opts.m.sp);
    this.img = scene.add.image(0, 0, tex).setOrigin(.5, 1);
    const h = opts.key ? 46 : 44 * (LB.SIZE[opts.m.sp] || 1);
    this.baseScale = h / this.img.height; this.img.setScale(this.baseScale);
    this.v.add([this.shadow, this.img]);
    this.h = h;
    if (this.m) {
      this.t = LB.MON[this.m.sp].t; this.style = LB.STYLE[this.t];
      if (this.m.hpA == null) this.m.hpA = LB.unitMaxHp(this.m);
      if (opts.kind !== 'ally') {
        this.hpBar = scene.add.graphics(); this.v.add(this.hpBar);
        this.lvTxt = scene.add.text(0, -h - 15, 'Lv' + this.m.lvl, { fontFamily: 'Nunito, sans-serif', fontSize: '8px', fontStyle: '800', color: '#fff', stroke: '#2b2418', strokeThickness: 2 }).setOrigin(.5);
        this.v.add(this.lvTxt);
        this.drawHp();
      }
    }
    this.cd = 0; this.sp = 0; this.iframes = 0; this.kb = new Phaser.Math.Vector2(); this.state = 'idle';
    this.home = { x: opts.x, y: opts.y }; this.wanderT = 0; this.dead = false; this.bobT = Math.random() * 6;
  }
  get x() { return this.p.x; } get y() { return this.p.y; }
  maxHp() { return LB.unitMaxHp(this.m); }
  drawHp() {
    if (!this.hpBar) return;
    const w = 28, v = Math.max(0, this.m.hpA) / this.maxHp(), y = -this.h - 9;
    this.hpBar.clear().fillStyle(0x2b2418, .8).fillRect(-w / 2 - 1, y - 1, w + 2, 6)
      .fillStyle(this.kind === 'boss' ? 0xd9a634 : (v > .5 ? 0x5aa340 : v > .2 ? 0xd9a634 : 0xc8452f)).fillRect(-w / 2, y, w * v, 4);
  }
  sync(time, moving) {
    this.v.setPosition(this.p.x, this.p.y + 5).setDepth(this.p.y);
    const vx = this.p.body.velocity.x, vy = this.p.body.velocity.y;
    if (this.m && this.state !== 'dazed') {
      const back = vy < -15 && Math.abs(vy) > Math.abs(vx);
      const want = (back ? 'b_' : 'f_') + this.m.sp;
      if (this.img.texture.key !== want) this.img.setTexture(want);
    }
    if (Math.abs(vx) > 8) this.img.setFlipX(vx < 0);
    if (moving && this.state !== 'dazed') { this.bobT += .3; this.img.y = -Math.abs(Math.sin(this.bobT)) * 3; this.img.scaleY = this.baseScale * (1 - Math.abs(Math.sin(this.bobT)) * .05); }
    else { this.img.y = 0; this.img.scaleY = this.baseScale; }
  }
  flash(col = 0xffffff) {
    const TM = Phaser.TintModes;
    this.img.setTint(col); if (TM && this.img.setTintMode) this.img.setTintMode(TM.FILL);
    this.s.time.delayedCall(80, () => { if (!this.img.active) return; this.img.clearTint(); if (TM && this.img.setTintMode) this.img.setTintMode(TM.MULTIPLY); });
  }
  destroy() { this.dead = true; (this.cols || []).forEach(c => c.destroy()); this.p.destroy(); this.v.destroy(); }
}

class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    const G = LB.G;
    LB.world = this; LB.mode = 'world'; LB.showHud(true);
    LB.buildMap();
    this.physics.world.setBounds(0, 0, LB.MW * TS, LB.MH * TS);

    // ---- Tilemap ----
    const data = LB.MAP.map((row, y) => row.map((c, x) => LB.frameFor(c, x, y)));
    const map = this.make.tilemap({ data, tileWidth: TS, tileHeight: TS });
    const tileset = map.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0);
    this.layer = map.createLayer(0, tileset, 0, 0);
    const solidIdx = []; LB.TILE_KEYS.forEach((k, i) => { if (LB.SOLID.has(k[0]) && !(k[0] === 'F')) solidIdx.push(i); });
    this.layer.setCollision(solidIdx);
    this.waterTiles = this.layer.filterTiles(t => LB.MAP[t.y][t.x] === '~');
    let wf = 0;
    this.time.addEvent({ delay: 260, loop: true, callback: () => { wf = (wf + 1) % 4; this.waterTiles.forEach(t => t.index = LB.TILE_INDEX['~' + ((wf + t.x + t.y) % 4)]); } });
    [[4, 18, 0x7fe6f5], [26, 2, 0xffc46e]].forEach(([x, y, col]) => {
      const gl = this.add.image(x * TS + 16, y * TS + 10, 'glow').setTint(col).setScale(.6).setAlpha(.6).setDepth(y * TS + 40).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: gl, alpha: .25, scale: .75, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ---- Units ----
    this.player = new Unit(this, { kind: 'player', key: 'tr_' + G.player, x: G.x * TS + 16, y: G.y * TS + 22 });
    this.player.p.setCollideWorldBounds(true);
    this.physics.add.collider(this.player.p, this.layer);
    this.npcGroup = this.physics.add.staticGroup();
    this.npcUnits = {};
    LB.npcs().forEach(n => this.makeNpc(n));
    this.physics.add.collider(this.player.p, this.npcGroup);
    this.wild = [];       // wild + boss units
    this.shots = [];
    this.ally = null; this.spawnAlly();
    this.face = new Phaser.Math.Vector2(0, 1);
    this.dodgeCd = 0; this.dodgeT = 0; this.atkCd = 0; this.spcCd = 0; this.spawnT = 0;
    this.aiming = false; this.capture = null; this.fight = null;

    // ---- Camera ----
    const cam = this.cameras.main;
    cam.setBounds(0, 0, LB.MW * TS, LB.MH * TS).setZoom(2).startFollow(this.player.v, true, .15, .15);
    cam.fadeIn(350);

    // ---- Input ----
    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,J,K,SPACE,SHIFT,E,R,Q,H,F,ENTER,ONE,TWO,THREE,FOUR,FIVE,SIX');
    this.input.mouse && this.input.mouse.disableContextMenu();
    this.input.on('pointermove', () => { LB.mouseT = performance.now(); });
    this.input.on('pointerdown', p => {
      if (LB.mode === 'capture') { this.capturePress(); return; }
      if (LB.mode !== 'world' || LB.touch) return;
      LB.mouseT = performance.now();
      if (this.aiming) { this.throwLantern(); return; }
      if (p.rightButtonDown()) this.special(true); else this.attack(true);
    });
    this.reticle = this.add.image(0, 0, 'glow').setTint(0x9feaf2).setScale(.25).setDepth(9999).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.aimLine = this.add.graphics().setDepth(9998);
    this.prompt = this.add.text(0, 0, '', { fontFamily: 'Nunito, sans-serif', fontSize: '9px', fontStyle: '800', color: '#2b2418', backgroundColor: '#f5efe2', padding: { x: 3, y: 1 } }).setOrigin(.5, 1).setDepth(10000).setVisible(false);
    LB.onA = () => this.contextAction();
    this.lastZone = '';
    this.scene.launch('Hud');
    if (LB.introPending) { LB.introPending = false; this.time.delayedCall(450, () => LB.story.intro()); }
    else LB.toast(LB.ZONE_NAMES[LB.zoneAt(G.x, G.y)]);
  }

  // ---------- helpers ----------
  tileAt(x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return LB.MAP[ty] && LB.MAP[ty][tx]; }
  makeNpc(n) {
    const u = new Unit(this, { kind: 'npc', key: 'tr_' + n.who, x: n.x * TS + 16, y: n.y * TS + 22 });
    u.p.destroy(); u.p = this.npcGroup.create(n.x * TS + 16, n.y * TS + 22, 'px').setVisible(false);
    u.p.body.setSize(22, 14); u.p.refreshBody(); u.npc = n; u.sync(0, false);
    this.npcUnits[n.id] = u;
  }
  refreshNpcs() {
    LB.npcs().forEach(n => {
      const u = this.npcUnits[n.id]; if (!u) return;
      u.p.setPosition(n.x * TS + 16, n.y * TS + 22); u.p.refreshBody(); u.npc = n; u.sync(0, false);
    });
  }
  lead() { return LB.G.party.find(m => m.hpA > 0); }
  spawnAlly(fromSwitch) {
    if (this.ally) { this.ally.destroy(); this.ally = null; }
    const m = this.lead(); if (!m) return;
    const i = LB.G.party.indexOf(m); if (i > 0) { LB.G.party.splice(i, 1); LB.G.party.unshift(m); }
    this.ally = new Unit(this, { kind: 'ally', m, x: this.player.x - 20, y: this.player.y + 6 });
    this.ally.cols = [this.physics.add.collider(this.ally.p, this.layer)];
    if (fromSwitch) { this.burst('Glimmer', this.ally.x, this.ally.y - 20, 12); LB.toast(`Go, ${m.sp}!`); }
  }
  enemies() { return this.wild.filter(u => !u.dead && u.state !== 'dazed' && u.state !== 'captured'); }
  burst(type, x, y, n = 14) {
    const [tex, cols] = PFX[type] || PFX.Plain;
    const em = this.add.particles(x, y, tex, { speed: { min: 50, max: 150 }, angle: { min: 0, max: 360 }, lifespan: { min: 300, max: 600 },
      scale: { start: .55, end: .1 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, tint: cols,
      gravityY: (type === 'Tide' || type === 'Stone') ? 220 : type === 'Ember' ? -120 : 0, emitting: false }).setDepth(9000);
    em.explode(n); this.time.delayedCall(900, () => em.destroy());
  }
  floatText(x, y, txt, col = '#ffffff', size = 11) {
    const t = this.add.text(x, y, txt, { fontFamily: 'Nunito, sans-serif', fontSize: size + 'px', fontStyle: '800', color: col, stroke: '#2b2418', strokeThickness: 3 }).setOrigin(.5).setDepth(9500);
    this.tweens.add({ targets: t, y: y - 22, alpha: { from: 1, to: 0 }, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }
  aimPoint(useMouse) {
    // where the player is aiming: the mouse (for clicks), else nearest enemy, else facing direction
    if (useMouse && !LB.touch) { const p = this.input.activePointer.positionToCamera(this.cameras.main); return { x: p.x, y: p.y, mouse: true }; }
    const from = this.ally || this.player;
    let best = null, bd = 190;
    this.enemies().forEach(u => { const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, u.x, u.y); if (d < bd) { bd = d; best = u; } });
    if (best) return { x: best.x, y: best.y - 10, unit: best };
    return { x: from.x + this.face.x * 80, y: from.y + this.face.y * 80 };
  }
  nearestEnemyTo(x, y, r) {
    let best = null, bd = r;
    this.enemies().forEach(u => { const d = Phaser.Math.Distance.Between(x, y, u.x, u.y - 10); if (d < bd) { bd = d; best = u; } });
    return best;
  }

  // ---------- player actions ----------
  attack(useMouse) {
    const a = this.ally; if (!a || this.atkCd > 0 || a.state === 'lunge') return;
    const aim = this.aimPoint(useMouse); const tgt = aim.unit || this.nearestEnemyTo(aim.x, aim.y, 60);
    const tx = tgt ? tgt.x : aim.x, ty = tgt ? tgt.y - 10 : aim.y;
    const spd = LB.statsOf(a.m).spd; this.atkCd = Math.max(.28, .62 - spd / 260);
    const k = LB.basicMove(a.m.sp);
    if (a.style.kind === 'shot') this.fire(a, tx, ty, k, 1, false);
    else this.lunge(a, tx, ty, k, 1);
  }
  special(useMouse) {
    const a = this.ally; if (!a || this.spcCd > 0) return;
    const aim = this.aimPoint(useMouse); const tgt = aim.unit || this.nearestEnemyTo(aim.x, aim.y, 70);
    const tx = tgt ? tgt.x : aim.x, ty = tgt ? tgt.y - 10 : aim.y;
    const k = LB.specialMove(a.m.sp); this.spcCd = 4;
    this.floatText(a.x, a.y - a.h - 6, LB.MOVES[k].n + '!', '#ffe7a0', 10);
    if (a.style.kind === 'shot') { [-.28, 0, .28].forEach(o => this.fire(a, tx, ty, k, 1.1, true, o)); }
    else {
      this.lunge(a, tx, ty, k, 1.5, true);
    }
  }
  dodge() {
    if (this.dodgeCd > 0) return;
    let dx = 0, dy = 0; const k = this.keys;
    if (k.LEFT.isDown || k.A.isDown) dx -= 1; if (k.RIGHT.isDown || k.D.isDown) dx += 1;
    if (k.UP.isDown || k.W.isDown) dy -= 1; if (k.DOWN.isDown || k.S.isDown) dy += 1;
    if (LB.stick && (LB.stick.x || LB.stick.y)) { dx = LB.stick.x; dy = LB.stick.y; }
    if (!dx && !dy) { dx = this.face.x; dy = this.face.y; }
    const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(300);
    this.dodgeT = .18; this.dodgeCd = .7; this.player.iframes = .4; this.player.dash = v;
    LB.SFX.throw();
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 40, () => {
      const g = this.add.image(this.player.v.x, this.player.v.y, this.player.img.texture.key).setOrigin(.5, 1).setScale(this.player.baseScale).setAlpha(.45).setTint(0x9feaf2).setDepth(this.player.v.depth - 1).setFlipX(this.player.img.flipX);
      this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
    });
  }
  switchTo(i) {
    const G = LB.G; const m = G.party[i];
    if (!m || m === (this.ally && this.ally.m) || m.hpA <= 0) return;
    G.party.splice(i, 1); G.party.unshift(m); this.spawnAlly(true); LB.SFX.sel();
  }
  cycleAlly() {
    const G = LB.G; const alive = G.party.filter(m => m.hpA > 0); if (alive.length < 2) return;
    const m = alive[1]; this.switchTo(G.party.indexOf(m));
  }
  useSalve() {
    const G = LB.G, a = this.ally;
    if (G.items.salve <= 0) { LB.toast('No salves left'); return; }
    let target = a && a.m.hpA < a.maxHp() ? a.m : G.party.find(m => m.hpA < LB.unitMaxHp(m));
    if (!target && G.hearts >= LB.MAX_HEARTS) { LB.toast('Everyone is healthy'); return; }
    G.items.salve--; LB.SFX.heal();
    if (target) { const mx = LB.unitMaxHp(target); target.hpA = Math.min(mx, target.hpA + Math.round(mx * .45)); }
    G.hearts = Math.min(LB.MAX_HEARTS, G.hearts + 1);
    this.burst('Grove', this.player.x, this.player.y - 20, 12);
    if (a) a.drawHp();
  }
  cycleLantern() {
    const G = LB.G, ks = Object.keys(LB.LANTERNS).filter(k => G.items[k] > 0);
    if (!ks.length) { LB.toast('No lanterns'); return; }
    const i = ks.indexOf(G.lanternSel); G.lanternSel = ks[(i + 1) % ks.length]; LB.SFX.sel();
    LB.toast(LB.LANTERNS[G.lanternSel].n);
  }
  contextAction() {
    if (this.nearInteract()) { this.interact(); return; }
    if (this.aiming) { this.throwLantern(); return; }
    const dz = this.wild.find(u => u.state === 'dazed' && Phaser.Math.Distance.Between(this.player.x, this.player.y, u.x, u.y) < 150);
    if (dz) { this.startAim(); return; }
    this.attack();
  }

  // ---------- attacks ----------
  fire(owner, tx, ty, moveKey, mult, big, angOff = 0) {
    const sx = owner.x, sy = owner.y - owner.h * .5;
    const ang = Phaser.Math.Angle.Between(sx, sy, tx, ty) + angOff;
    const t = LB.MOVES[moveKey].t, [tex, cols] = PFX[t] || PFX.Plain;
    const spd = (LB.STYLE[t] && LB.STYLE[t].proj) || 220;
    const img = this.add.image(sx, sy, big ? 'glow' : 'pt_dot').setTint(cols[0]).setScale(big ? .22 : .7).setDepth(9000).setBlendMode(big ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    const core = this.add.image(sx, sy, tex).setTint(cols[1]).setScale(big ? .9 : .6).setDepth(9001);
    const trail = this.add.particles(0, 0, tex, { follow: core, lifespan: 260, speed: 8, scale: { start: .45, end: 0 }, alpha: { start: .8, end: 0 }, tint: cols, frequency: 35 }).setDepth(8999);
    this.shots.push({ img, core, trail, x: sx, y: sy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 1.3, owner, moveKey, mult, big, r: big ? 12 : 8, hit: new Set() });
    if (owner.kind === 'ally') LB.SFX.sel();
  }
  lunge(u, tx, ty, moveKey, mult, aoe) {
    const ang = Phaser.Math.Angle.Between(u.x, u.y, tx, ty + 10);
    const dist = Math.min(110, Phaser.Math.Distance.Between(u.x, u.y, tx, ty + 10));
    u.state = 'lunge'; u.lungeHit = new Set(); u.lungeKey = moveKey; u.lungeMult = mult; u.lungeAoe = aoe;
    const sp = Math.max(260, dist / .16);
    u.p.body.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
    u.lungeT = .17;
    this.tweens.add({ targets: u.img, scaleX: u.baseScale * 1.15, duration: 80, yoyo: true });
  }
  telegraph(u, done) {
    // enemy wind-up: flashes and shakes so the player can react
    u.state = 'windup';
    const tw = this.tweens.add({ targets: u.img, x: { from: -1.5, to: 1.5 }, duration: 45, yoyo: true, repeat: 4 });
    u.img.setTint(0xff6a5a);
    this.time.delayedCall(u.kind === 'boss' ? 330 : 430, () => { if (u.dead) return; tw.stop(); u.img.x = 0; u.img.clearTint(); if (u.state === 'windup') { u.state = 'chase'; done(); } });
  }
  hitUnit(target, attacker, moveKey, mult) {
    if (target.dead || target.state === 'dazed') return;
    if (target.kind === 'player') { this.hurtPlayer(attacker); return; }
    const r = LB.calcDmg(attacker.m, target.m, moveKey, mult);
    target.m.hpA = Math.max(0, target.m.hpA - r.dmg);
    target.flash(); target.drawHp();
    const ang = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
    target.kb.set(Math.cos(ang) * 170, Math.sin(ang) * 170);
    this.burst(LB.MOVES[moveKey].t, target.x, target.y - target.h * .5, r.e > 1 ? 18 : 10);
    const col = r.e > 1 ? '#ffd23f' : r.e < 1 ? '#c9c2b4' : '#ffffff';
    this.floatText(target.x + Phaser.Math.Between(-6, 6), target.y - target.h - 4, (r.crit ? 'CRIT ' : '') + r.dmg, col, r.e > 1 || r.crit ? 13 : 10);
    if (r.e > 1) this.floatText(target.x, target.y - target.h - 18, 'SUPER!', '#ffd23f', 9);
    (r.e > 1 ? LB.SFX.super : r.e < 1 ? LB.SFX.weak : LB.SFX.hit)();
    if (target.kind === 'ally') this.cameras.main.shake(120, .004);
    else this.cameras.main.shake(70, .0025);
    if (target.m.hpA <= 0) this.knockOut(target, attacker);
  }
  hurtPlayer(attacker) {
    const P = this.player; if (P.iframes > 0) return;
    LB.G.hearts--; P.iframes = 1.1; P.flash(0xff6a5a); LB.SFX.faint();
    this.cameras.main.shake(200, .008); this.cameras.main.flash(120, 255, 80, 60);
    const ang = Phaser.Math.Angle.Between(attacker.x, attacker.y, P.x, P.y); P.kb.set(Math.cos(ang) * 240, Math.sin(ang) * 240);
    this.floatText(P.x, P.y - 50, '-♥', '#ff6a5a', 12);
    if (LB.G.hearts <= 0) this.blackout();
  }
  knockOut(u, attacker) {
    const G = LB.G;
    if (u.kind === 'ally') {
      LB.SFX.faint(); this.floatText(u.x, u.y - 40, `${u.m.sp} is worn out!`, '#ffb3a8', 10);
      this.tweens.add({ targets: u.v, alpha: 0, duration: 300 });
      this.time.delayedCall(320, () => { this.spawnAlly(true); if (!this.ally) LB.toast('No companions left: run to the shrine!'); });
      return;
    }
    // wild / boss knocked out
    LB.SFX.faint();
    const gain = Math.floor((u.m.lvl * 10 + 8) * (u.kind === 'boss' ? 1.5 : 1));
    const coins = u.m.lvl * (u.kind === 'boss' ? 10 : 4);
    G.coins += coins; this.floatText(u.x, u.y - u.h - 20, `+${coins}`, '#ffd23f', 10);
    this.giveXp(gain);
    if (u.kind === 'boss') {
      u.state = 'captured';
      this.tweens.add({ targets: u.v, scale: 0, alpha: 0, duration: 350, onComplete: () => { u.destroy(); this.wild = this.wild.filter(w => w !== u); if (this.fight) this.fight.next(); } });
      return;
    }
    u.state = 'dazed'; u.dazeT = LB.DAZE_TIME; u.p.body.setVelocity(0, 0);
    u.stars = this.add.particles(0, 0, 'pt_star', { follow: u.v, followOffset: { x: 0, y: -u.h - 4 }, lifespan: 700, speed: 20, scale: { start: .3, end: 0 }, tint: [0xfff3a8, 0xffffff], frequency: 160 }).setDepth(9500);
    this.tweens.add({ targets: u.img, angle: { from: -8, to: 8 }, duration: 400, yoyo: true, repeat: -1 });
    this.floatText(u.x, u.y - u.h - 30, 'Dazed! Throw a lantern', '#9feaf2', 9);
  }
  giveXp(g) {
    const G = LB.G;
    G.party.forEach(m => {
      if (m.hpA <= 0) return;
      m.xp += (this.ally && m === this.ally.m) ? g : Math.floor(g / 2);
      while (m.xp >= LB.need(m.lvl)) {
        m.xp -= LB.need(m.lvl); const before = LB.unitMaxHp(m); m.lvl++;
        m.hp = LB.statsOf(m).hp; m.hpA = Math.min(LB.unitMaxHp(m), m.hpA + (LB.unitMaxHp(m) - before) + Math.round(LB.unitMaxHp(m) * .3));
        if (this.ally && m === this.ally.m) { LB.SFX.lvl(); this.burst('Glimmer', this.ally.x, this.ally.y - 20, 18); this.floatText(this.ally.x, this.ally.y - 50, 'LEVEL UP! Lv ' + m.lvl, '#9feaf2', 11); }
      }
    });
  }
  async blackout() {
    if (this.blacking) return; this.blacking = true;
    LB.mode = 'busy'; this.physics.pause();
    this.cameras.main.fadeOut(500, 0, 0, 0); await LB.wait(550);
    this.clearWild(); if (this.fight) this.fight.cancel(true);
    LB.healAll(); const G = LB.G; G.x = 4; G.y = 19;
    this.player.p.setPosition(4 * TS + 16, 19 * TS + 26); this.spawnAlly();
    this.physics.resume(); this.cameras.main.fadeIn(500); LB.mode = 'world'; this.blacking = false;
    await LB.dialog(['Everything went dark…', 'You wake up beside the shrine. Everyone is rested now.']);
    LB.save(true);
  }
  clearWild() { this.wild.forEach(u => { if (u.stars) u.stars.destroy(); u.destroy(); }); this.wild = []; this.shots.forEach(s => this.killShot(s)); this.shots = []; }
  killShot(s) { s.dead = true; s.img.destroy(); s.core.destroy(); s.trail.stop(); this.time.delayedCall(300, () => s.trail.destroy()); }

  // ---------- spawning ----------
  spawnWild(dt) {
    this.spawnT -= dt; if (this.spawnT > 0 || this.fight) return;
    this.spawnT = 1.2;
    const P = this.player;
    // despawn far ones
    this.wild.slice().forEach(u => { if (u.kind === 'wild' && Phaser.Math.Distance.Between(P.x, P.y, u.x, u.y) > 520) { if (u.stars) u.stars.destroy(); u.destroy(); this.wild = this.wild.filter(w => w !== u); } });
    if (this.wild.filter(u => u.kind === 'wild').length >= LB.WILD_CAP) return;
    for (let tries = 0; tries < 12; tries++) {
      const tx = Math.floor(P.x / TS) + Phaser.Math.Between(-9, 9), ty = Math.floor(P.y / TS) + Phaser.Math.Between(-7, 7);
      const c = LB.MAP[ty] && LB.MAP[ty][tx]; const z = LB.ZONES[c]; if (!z) continue;
      const d = Phaser.Math.Distance.Between(P.x, P.y, tx * TS + 16, ty * TS + 16); if (d < 120) continue;
      let sp = z.t[LB.rnd(0, z.t.length - 1)];
      if (sp === '*') sp = LB.STARTERS.filter(s => s !== LB.G.starter && s !== LB.rivalStarter())[0];
      const m = LB.mk(sp, LB.rnd(z.lv[0], z.lv[1])); m.hpA = LB.unitMaxHp(m);
      const u = new Unit(this, { kind: 'wild', m, x: tx * TS + 16, y: ty * TS + 20 });
      u.zoneChar = c; u.cols = [this.physics.add.collider(u.p, this.layer), this.physics.add.collider(u.p, this.npcGroup)];
      u.v.setAlpha(0); this.tweens.add({ targets: u.v, alpha: 1, duration: 400 });
      this.burst('Grove', u.x, u.y - 6, 8);
      LB.G.seen[sp] = 1; this.wild.push(u); return;
    }
  }

  // ---------- AI ----------
  updateEnemy(u, dt, time) {
    if (u.state === 'captured') return;
    if (u.state === 'dazed') {
      u.dazeT -= dt * 1000; u.p.body.setVelocity(0, 0);
      if (u.dazeT <= 0) { // it recovers and flees
        if (u.stars) u.stars.destroy();
        this.floatText(u.x, u.y - u.h, 'It ran away…', '#c9c2b4', 9);
        u.state = 'gone'; this.tweens.add({ targets: u.v, alpha: 0, duration: 400, onComplete: () => { u.destroy(); this.wild = this.wild.filter(w => w !== u); } });
      }
      return;
    }
    if (u.state === 'gone') return;
    u.cd -= dt;
    if (u.state === 'lunge') { this.updateLunge(u, dt, [this.player, this.ally]); return; }
    if (u.state === 'windup') { u.p.body.setVelocity(u.kb.x, u.kb.y); return; }
    const P = this.player, A = this.ally;
    const targets = [P, A].filter(t => t && !t.dead);
    let tgt = null, td = u.kind === 'boss' ? 300 : 120;
    targets.forEach(t => { const d = Phaser.Math.Distance.Between(u.x, u.y, t.x, t.y); if (d < td) { td = d; tgt = t; } });
    const base = 38 + LB.statsOf(u.m).spd * 1.1 * (u.kind === 'boss' ? 1.25 : 1);
    let vx = 0, vy = 0;
    if (!tgt) {
      u.wanderT -= dt;
      if (u.wanderT <= 0) { u.wanderT = Phaser.Math.FloatBetween(1.5, 3); const a = Math.random() * 6.28; u.wdir = Math.random() < .35 ? null : { x: Math.cos(a), y: Math.sin(a) }; }
      if (u.wdir) {
        const nx = u.x + u.wdir.x * 14, ny = u.y + u.wdir.y * 14, c = this.tileAt(nx, ny);
        if (u.kind === 'wild' && !LB.ZONES[c]) u.wdir = null; else { vx = u.wdir.x * base * .4; vy = u.wdir.y * base * .4; }
      }
    } else {
      const ang = Phaser.Math.Angle.Between(u.x, u.y, tgt.x, tgt.y);
      if (u.style.kind === 'shot') {
        const want = td > 130 ? 1 : td < 70 ? -1 : 0;
        const side = Math.sin(time / 600 + u.bobT) * .6;
        vx = (Math.cos(ang) * want - Math.sin(ang) * side) * base; vy = (Math.sin(ang) * want + Math.cos(ang) * side) * base;
        if (u.cd <= 0 && td < 190) {
          u.cd = (u.kind === 'boss' ? 1.15 : 1.9) + Math.random() * .5;
          this.telegraph(u, () => {
            const k = LB.basicMove(u.m.sp), tx = tgt.x, ty = tgt.y - 10;
            if (u.kind === 'boss') [-.22, 0, .22].forEach(o => this.fire(u, tx, ty, k, .9, false, o)); else this.fire(u, tx, ty, k, 1, false);
          });
        }
      } else {
        vx = Math.cos(ang) * base; vy = Math.sin(ang) * base;
        if (u.cd <= 0 && td < 60) {
          u.cd = (u.kind === 'boss' ? 1.1 : 1.7) + Math.random() * .5;
          this.telegraph(u, () => { const k = LB.basicMove(u.m.sp); this.lunge(u, tgt.x, tgt.y - 10, k, 1); });
        }
      }
    }
    u.p.body.setVelocity(vx + u.kb.x, vy + u.kb.y);
    u.kb.scale(Math.pow(.02, dt));
  }
  updateLunge(u, dt, foes) {
    u.lungeT -= dt;
    foes.forEach(t => {
      if (!t || t.dead || u.lungeHit.has(t)) return;
      if (Phaser.Math.Distance.Between(u.x, u.y, t.x, t.y) < (u.lungeAoe ? 34 : 24)) { u.lungeHit.add(t); this.hitUnit(t, u, u.lungeKey, u.lungeMult); }
    });
    if (u.lungeT <= 0) {
      u.state = 'chase'; u.p.body.setVelocity(0, 0);
      if (u.lungeAoe) { // shockwave
        const ring = this.add.circle(u.x, u.y - 6, 10).setStrokeStyle(4, (PFX[u.t] || PFX.Plain)[1][0]).setDepth(9000);
        this.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
        this.cameras.main.shake(140, .006);
        foes.forEach(t => { if (t && !t.dead && !u.lungeHit.has(t) && Phaser.Math.Distance.Between(u.x, u.y, t.x, t.y) < 60) this.hitUnit(t, u, u.lungeKey, u.lungeMult * .8); });
      }
    }
  }
  updateAlly(dt) {
    const a = this.ally; if (!a) return;
    if (a.state === 'lunge') { this.updateLunge(a, dt, this.enemies()); return; }
    const P = this.player;
    const tx = P.x - this.face.x * 26, ty = P.y - this.face.y * 18 + 4;
    const d = Phaser.Math.Distance.Between(a.x, a.y, tx, ty);
    if (d > 260) { a.p.setPosition(P.x, P.y + 4); return; }
    if (d > 10) { const ang = Phaser.Math.Angle.Between(a.x, a.y, tx, ty), sp = Math.min(200, d * 4); a.p.body.setVelocity(Math.cos(ang) * sp + a.kb.x, Math.sin(ang) * sp + a.kb.y); }
    else a.p.body.setVelocity(a.kb.x, a.kb.y);
    a.kb.scale(Math.pow(.02, dt));
  }
  updateShots(dt) {
    this.shots.forEach(s => {
      if (s.dead) return;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      s.img.setPosition(s.x, s.y); s.core.setPosition(s.x, s.y).setRotation(s.core.rotation + dt * 8);
      if (s.life <= 0 || SHOT_BLOCK.has(this.tileAt(s.x, s.y + 8))) { this.burst(LB.MOVES[s.moveKey].t, s.x, s.y, 5); this.killShot(s); return; }
      const foes = s.owner.kind === 'ally' ? this.enemies() : [this.player, this.ally].filter(Boolean);
      for (const t of foes) {
        if (t.dead || s.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y - t.h * .45) < s.r + 10) {
          s.hit.add(t); this.hitUnit(t, s.owner, s.moveKey, s.mult);
          if (!s.big) { this.killShot(s); return; }
        }
      }
    });
    this.shots = this.shots.filter(s => !s.dead);
  }

  // ---------- lanterns ----------
  startAim() {
    const G = LB.G;
    if (!(G.items[G.lanternSel] > 0)) { const k = Object.keys(LB.LANTERNS).find(k => G.items[k] > 0); if (!k) { LB.toast('No lanterns! Buy some at the stall'); return; } G.lanternSel = k; }
    this.aiming = true; this.physics.world.timeScale = 2.5; this.tweens.timeScale = .5;
    this.reticle.setVisible(true).setTint(hexN(LB.LANTERNS[G.lanternSel].col));
  }
  stopAim() { this.aiming = false; this.physics.world.timeScale = 1; this.tweens.timeScale = 1; this.reticle.setVisible(false); this.aimLine.clear(); }
  aimTarget() {
    if (!LB.touch && performance.now() - (LB.mouseT || -1e9) < 1500) { const p = this.input.activePointer.positionToCamera(this.cameras.main); return { x: p.x, y: p.y }; }
    let best = null, bd = 220;
    this.wild.forEach(u => { if (u.state !== 'dazed') return; const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, u.x, u.y); if (d < bd) { bd = d; best = u; } });
    if (best) return { x: best.x, y: best.y - 8 };
    return { x: this.player.x + this.face.x * 90, y: this.player.y + this.face.y * 90 };
  }
  drawAim() {
    const t = this.aimTarget(), P = this.player, sx = P.x, sy = P.y - 30;
    const d = Math.min(200, Phaser.Math.Distance.Between(sx, sy, t.x, t.y)), ang = Phaser.Math.Angle.Between(sx, sy, t.x, t.y);
    const ex = sx + Math.cos(ang) * d, ey = sy + Math.sin(ang) * d;
    this.aimEnd = { x: ex, y: ey };
    this.reticle.setPosition(ex, ey).setScale(.22 + Math.sin(this.time.now / 120) * .03);
    const g = this.aimLine.clear(); g.fillStyle(0xffffff, .85);
    for (let i = 1; i < 12; i++) { const v = i / 12; g.fillCircle(sx + (ex - sx) * v, sy + (ey - sy) * v - Math.sin(v * Math.PI) * d * .35, 1.6); }
  }
  throwLantern() {
    const G = LB.G, kind = G.lanternSel; if (!(G.items[kind] > 0)) { this.stopAim(); return; }
    const end = this.aimEnd || this.aimTarget(); this.stopAim();
    G.items[kind]--; LB.SFX.throw();
    const L = LB.LANTERNS[kind], col = hexN(L.col), P = this.player, sx = P.x, sy = P.y - 30;
    const lan = this.add.container(sx, sy, [this.add.image(0, 0, 'glow').setTint(col).setScale(.25).setBlendMode(Phaser.BlendModes.ADD), this.add.image(0, 0, 'lantern_frame'), this.add.image(0, 0, 'lantern_gem').setTint(col)]).setScale(.45).setDepth(9600);
    const d = Phaser.Math.Distance.Between(sx, sy, end.x, end.y);
    this.tweens.addCounter({ from: 0, to: 1, duration: 420, onUpdate: t => { const v = t.getValue(); lan.setPosition(sx + (end.x - sx) * v, sy + (end.y - sy) * v - Math.sin(v * Math.PI) * d * .35); lan.angle = v * 540; },
      onComplete: () => {
        lan.angle = 0;
        const hit = this.wild.find(u => !u.dead && Phaser.Math.Distance.Between(end.x, end.y, u.x, u.y - u.h * .4) < u.h * .55 + 10);
        if (hit && hit.state === 'dazed') { this.startCapture(hit, lan, kind); return; }
        if (hit && hit.kind === 'boss') this.floatText(end.x, end.y - 10, "Can't befriend a trainer's companion", '#ffb3a8', 9);
        else if (hit) this.floatText(end.x, end.y - 10, 'Too strong! Weaken it first', '#ffb3a8', 9);
        else this.floatText(end.x, end.y - 10, 'Missed!', '#c9c2b4', 9);
        LB.SFX.escape(); this.burst('Plain', end.x, end.y, 8); this.tweens.add({ targets: lan, alpha: 0, y: end.y + 8, duration: 300, onComplete: () => lan.destroy() });
      } });
  }
  startCapture(u, lan, kind) {
    LB.mode = 'capture'; this.physics.pause();
    if (u.stars) { u.stars.destroy(); u.stars = null; }
    this.tweens.killTweensOf(u.img);
    u.state = 'captured';
    this.cameras.main.flash(180, 200, 245, 255);
    this.tweens.add({ targets: u.v, scale: .05, alpha: 0, x: lan.x, y: lan.y + 10, duration: 280 });
    this.tweens.add({ targets: lan, y: u.y - 12, duration: 300, ease: 'Bounce.easeOut' });
    const L = LB.LANTERNS[kind], cr = LB.MON[u.m.sp].cr;
    const zone = kind === 'warden' ? 40 : Phaser.Math.Clamp(5 + 7 * cr * L.bonus(u.t), 5, 15);
    const dur = Math.max(560, 1050 - u.m.lvl * 25);
    const g = this.add.graphics().setDepth(9700);
    this.capture = { u, lan, kind, zone, dur, g, hits: 0, round: 0, r: 70, t: 0, cx: u.x, cy: u.y - 12, waiting: false };
    this.floatText(u.x, u.y - 52, 'Press SPACE / tap when the ring hits the circle!', '#9feaf2', 8);
    this.time.delayedCall(450, () => this.nextRound());
  }
  nextRound() { const c = this.capture; if (!c) return; c.r = 70; c.t = 0; c.waiting = true; }
  updateCapture(dt) {
    const c = this.capture; if (!c) return;
    const g = c.g.clear();
    const target = 22;
    g.lineStyle(c.zone, 0x5aa340, .35).strokeCircle(c.cx, c.cy, target);
    g.lineStyle(2, 0xffffff, .9).strokeCircle(c.cx, c.cy, target);
    for (let i = 0; i < 3; i++) g.fillStyle(i < c.hits ? 0x9feaf2 : 0x3b2f20, 1).fillCircle(c.cx - 10 + i * 10, c.cy + 34, 3);
    if (!c.waiting) return;
    c.t += dt * 1000; c.r = 70 * (1 - c.t / c.dur);
    g.lineStyle(3, 0xffd23f, 1).strokeCircle(c.cx, c.cy, Math.max(0, c.r));
    if (c.kind === 'warden' && Math.abs(c.r - target) < 2) this.capturePress();
    if (c.r <= 0) this.captureResult(false);
  }
  capturePress() {
    const c = this.capture; if (!c || !c.waiting) return;
    const ok = Math.abs(c.r - 22) <= c.zone / 2 + 2;
    this.captureResult(ok);
  }
  captureResult(ok) {
    const c = this.capture; c.waiting = false; LB.lastCapture = { ok, r: c.r, zone: c.zone };
    if (ok) {
      c.hits++; LB.SFX.shake(); this.tweens.add({ targets: c.lan, angle: { from: -22, to: 22 }, duration: 110, yoyo: true });
      this.floatText(c.cx, c.cy - 30, ['Good!', 'Great!', 'Perfect!'][c.hits - 1], '#9feaf2', 10);
      if (c.hits >= 3) { this.captureWin(); return; }
      this.time.delayedCall(380, () => this.nextRound());
    } else {
      this.captureFail();
    }
  }
  captureWin() {
    const c = this.capture, G = LB.G, m = c.u.m;
    LB.SFX.caught(); this.burst('Glimmer', c.cx, c.cy, 26);
    this.tweens.add({ targets: c.lan.list[0], scale: .9, alpha: 1, duration: 300, yoyo: true });
    const first = !G.caught[m.sp]; G.caught[m.sp] = 1;
    m.xp = 0; m.hpA = Math.round(LB.unitMaxHp(m) * .6); m.hp = LB.statsOf(m).hp;
    if (G.party.length < 6) G.party.push(m); else G.box.push(m);
    this.floatText(c.cx, c.cy - 40, `${m.sp} joined you!`, '#ffffff', 12);
    this.time.delayedCall(900, () => {
      c.g.destroy(); this.tweens.add({ targets: c.lan, alpha: 0, scale: .1, x: this.player.x, y: this.player.y - 20, duration: 350, onComplete: () => c.lan.destroy() });
      c.u.destroy(); this.wild = this.wild.filter(w => w !== c.u); this.capture = null;
      this.physics.resume(); LB.mode = 'world';
      if (first) LB.toast(`${m.sp} added to your journal!`);
      if (G.party.length >= 6 && !G.party.includes(m)) LB.toast(`${m.sp} went to rest at the shrine (party full)`);
      LB.save(true);
    });
  }
  captureFail() {
    const c = this.capture, u = c.u;
    LB.SFX.escape(); this.cameras.main.flash(120, 255, 255, 255);
    this.floatText(c.cx, c.cy - 30, 'It broke free!', '#ffb3a8', 11);
    c.g.destroy(); c.lan.destroy(); this.capture = null;
    u.state = 'dazed'; u.dazeT = Math.max(u.dazeT, 4500);
    this.tweens.add({ targets: u.v, scale: 1, alpha: 1, x: u.x, y: u.y + 5, duration: 260, ease: 'Back.easeOut' });
    u.stars = this.add.particles(0, 0, 'pt_star', { follow: u.v, followOffset: { x: 0, y: -u.h - 4 }, lifespan: 700, speed: 20, scale: { start: .3, end: 0 }, tint: [0xfff3a8, 0xffffff], frequency: 160 }).setDepth(9500);
    this.physics.resume(); LB.mode = 'world';
  }

  // ---------- trainer fights (called from story.js) ----------
  trainerFight(npc, team) {
    return new Promise(res => {
      const s = this, npcU = this.npcUnits[npc.id], cx = npcU.v.x, cy = npcU.v.y;
      this.clearWild();
      const f = this.fight = { npc, team: team.slice(), cur: null, res, cx, cy,
        next() {
          if (!s.fight) return;
          const m = f.team.shift();
          if (!m) { s.fight = null; LB.SFX.win(); LB.toast(`You beat ${npc.who}!`); res(true); return; }
          m.hpA = LB.unitMaxHp(m);
          const ang = Phaser.Math.Angle.Between(cx, cy, s.player.x, s.player.y);
          const u = new Unit(s, { kind: 'boss', m, x: cx + Math.cos(ang) * 40, y: cy + Math.sin(ang) * 40 });
          u.cols = [s.physics.add.collider(u.p, s.layer)]; u.cd = 1.2;
          s.wild.push(u); f.cur = u; LB.G.seen[m.sp] = 1;
          s.burst('Glimmer', u.x, u.y - 20, 18); LB.SFX.enc();
          LB.toast(`${npc.who} sends out ${m.sp}!`);
        },
        cancel(silent) { s.fight = null; s.wild.slice().forEach(u => { if (u.kind === 'boss') { u.destroy(); } }); s.wild = s.wild.filter(u => u.kind !== 'boss'); if (!silent) LB.toast(`${npc.who}: Come back when you're ready!`); res(false); }
      };
      LB.SFX.enc(); this.cameras.main.flash(200, 255, 255, 255);
      this.time.delayedCall(400, () => f.next());
    });
  }

  // ---------- interaction ----------
  nearInteract() {
    const P = this.player;
    for (const id in this.npcUnits) { const u = this.npcUnits[id]; if (Phaser.Math.Distance.Between(P.x, P.y, u.p.x, u.p.y) < 34) return { npc: u.npc }; }
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const tx = Math.floor(P.x / TS) + dx, ty = Math.floor((P.y - 4) / TS) + dy, c = LB.MAP[ty] && LB.MAP[ty][tx];
      if ('SMPH'.includes(c || '_')) return { tx, ty, c };
    }
    return null;
  }
  async interact() {
    const t = this.nearInteract(); if (!t || this.fight) return;
    this.player.p.body.setVelocity(0, 0);
    if (t.npc) await LB.story.interact(t.npc.x, t.npc.y);
    else await LB.story.interact(t.tx, t.ty);
    this.refreshNpcs();
  }

  // ---------- main loop ----------
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, G = LB.G, k = this.keys, J = Phaser.Input.Keyboard.JustDown, P = this.player;
    if (this.capture) {
      this.updateCapture(dt);
      const q0 = LB.btnQueue || []; LB.btnQueue = [];
      if (J(k.SPACE) || J(k.J) || J(k.ENTER) || J(k.E) || q0.length) this.capturePress();
      return;
    }
    if (LB.mode !== 'world') {
      if (!this.physics.world.isPaused && LB.mode !== 'busy') this.physics.pause();
      [P, this.ally, ...this.wild].forEach(u => u && !u.dead && u.sync(time, false));
      return;
    }
    if (this.physics.world.isPaused && !this.blacking) this.physics.resume();
    const fresh = performance.now() - (LB.lastDialogEnd || 0) > 250;
    const q = LB.btnQueue || []; LB.btnQueue = [];
    // --- buttons ---
    if (fresh && (J(k.F) || J(k.ENTER) || q.includes('talk'))) { if (this.nearInteract()) { this.interact(); return; } }
    if (J(k.E) || q.includes('lantern')) { if (this.aiming) this.throwLantern(); else this.startAim(); }
    if (fresh && (J(k.J) || q.includes('atk'))) { if (this.aiming) this.throwLantern(); else this.attack(); }
    if (J(k.K) || q.includes('spc')) this.special();
    if (J(k.SPACE) || J(k.SHIFT) || q.includes('dodge')) { if (fresh) this.dodge(); }
    if (J(k.Q) || q.includes('switch')) this.cycleAlly();
    if (J(k.R)) this.cycleLantern();
    if (J(k.H) || q.includes('salve')) this.useSalve();
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((n, i) => { if (J(k[n])) this.switchTo(i); });
    if (this.aiming) this.drawAim();

    // --- movement ---
    let dx = 0, dy = 0;
    if (k.LEFT.isDown || k.A.isDown) dx -= 1; if (k.RIGHT.isDown || k.D.isDown) dx += 1;
    if (k.UP.isDown || k.W.isDown) dy -= 1; if (k.DOWN.isDown || k.S.isDown) dy += 1;
    if (LB.stick && (Math.abs(LB.stick.x) > .2 || Math.abs(LB.stick.y) > .2)) { dx = LB.stick.x; dy = LB.stick.y; }
    else if (LB.held) { const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[LB.held]; dx = D[0]; dy = D[1]; }
    const mv = new Phaser.Math.Vector2(dx, dy); if (mv.lengthSq() > 1) mv.normalize();
    if (mv.lengthSq() > .04) { this.face.set(mv.x, mv.y).normalize(); }
    this.dodgeCd -= dt; this.atkCd -= dt; this.spcCd -= dt; P.iframes -= dt;
    if (this.dodgeT > 0) { this.dodgeT -= dt; P.p.body.setVelocity(P.dash.x, P.dash.y); }
    else { const sp = this.aiming ? 60 : 118; P.p.body.setVelocity(mv.x * sp + P.kb.x, mv.y * sp + P.kb.y); P.kb.scale(Math.pow(.02, dt)); }
    P.v.alpha = P.iframes > 0 && this.dodgeT <= 0 ? (Math.floor(time / 70) % 2 ? .45 : 1) : 1;

    const sdt = this.aiming ? dt * .4 : dt;   // slow motion while aiming a lantern
    this.updateAlly(sdt);
    this.wild.slice().forEach(u => !u.dead && this.updateEnemy(u, sdt, time));
    this.updateShots(sdt);
    this.spawnWild(dt);
    if (this.fight && Phaser.Math.Distance.Between(P.x, P.y, this.fight.cx, this.fight.cy) > 330) this.fight.cancel();

    // --- visuals ---
    P.sync(time, mv.lengthSq() > .04 || this.dodgeT > 0);
    if (this.ally) this.ally.sync(time, this.ally.p.body.speed > 15);
    this.wild.forEach(u => !u.dead && u.sync(time, u.p.body && u.p.body.speed > 15));
    Object.values(this.npcUnits).forEach(u => u.v.setDepth(u.p.y));
    G.x = Math.floor(P.x / TS); G.y = Math.floor(P.y / TS);
    const z = LB.zoneAt(G.x, G.y); if (z !== this.lastZone) { this.lastZone = z; LB.toast(LB.ZONE_NAMES[z]); }
    const ni = this.nearInteract();
    if (ni && !this.fight) { this.prompt.setText(LB.touch ? 'A: Talk' : 'F: Talk').setPosition(P.x, P.y - 50).setVisible(true); }
    else {
      const dz = this.wild.find(u => u.state === 'dazed' && Phaser.Math.Distance.Between(P.x, P.y, u.x, u.y) < 160);
      if (dz && !this.aiming) this.prompt.setText(LB.touch ? 'Lantern!' : 'E: Lantern').setPosition(dz.x, dz.y - dz.h - 22).setVisible(true);
      else this.prompt.setVisible(false);
    }
  }
}
