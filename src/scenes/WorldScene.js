// ============================================================
// WorldScene — tilemap, grid movement, NPCs, wild encounters
// ============================================================
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  create() {
    const G = LB.G, TS = LB.TS;
    LB.world = this; LB.mode = 'world'; LB.showHud(true); LB.updHud();
    LB.buildMap();

    // ---- Tilemap ----
    const data = LB.MAP.map((row, y) => row.map((c, x) => LB.frameFor(c, x, y)));
    const map = this.make.tilemap({ data, tileWidth: TS, tileHeight: TS });
    const tileset = map.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0);
    this.layer = map.createLayer(0, tileset, 0, 0);
    // animate water
    this.waterTiles = this.layer.filterTiles(t => LB.MAP[t.y][t.x] === '~');
    let wf = 0;
    this.time.addEvent({ delay: 260, loop: true, callback: () => { wf = (wf + 1) % 4; this.waterTiles.forEach(t => t.index = LB.TILE_INDEX['~' + ((wf + t.x + t.y) % 4)]); } });

    // glowing shrine + standing stone
    [[4, 18, 0x7fe6f5], [26, 2, 0xffc46e]].forEach(([x, y, col]) => {
      const gl = this.add.image(x * TS + 16, y * TS + 10, 'glow').setTint(col).setScale(.45).setDepth(y * TS + 40).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: gl, alpha: .35, scale: .55, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ---- Characters ----
    this.npcSprites = {};
    LB.npcs().forEach(n => { this.npcSprites[n.id] = this.makeChar('tr_' + n.who, n.x, n.y); });
    this.player = this.makeChar('tr_' + G.player, G.x, G.y);
    this.moving = false;

    // ---- Camera ----
    const cam = this.cameras.main;
    cam.setBounds(0, 0, LB.MW * TS, LB.MH * TS).setZoom(2).startFollow(this.player, true, .25, .25);
    cam.setRoundPixels(true);
    cam.fadeIn(350);

    // ---- Input ----
    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER,Z');
    LB.onA = () => this.interact();
    this.lastZone = '';
    this.events.on('resume', () => { LB.showHud(true); LB.updHud(); this.refreshNpcs(); });

    if (LB.introPending) { LB.introPending = false; this.time.delayedCall(450, () => LB.story.intro()); }
    else LB.toast(LB.ZONE_NAMES[LB.zoneAt(G.x, G.y)]);
  }

  makeChar(key, tx, ty) {
    const TS = LB.TS, c = this.add.container(tx * TS + 16, ty * TS + 30);
    const sh = this.add.ellipse(0, -1, 22, 8, 0x000000, .22);
    const img = this.add.image(0, 0, key).setOrigin(.5, 1);
    img.setScale(46 / img.height);
    c.add([sh, img]); c.img = img; c.setDepth(c.y);
    return c;
  }

  refreshNpcs() {
    LB.npcs().forEach(n => {
      const s = this.npcSprites[n.id]; if (!s) return;
      s.setPosition(n.x * LB.TS + 16, n.y * LB.TS + 30).setDepth(s.y);
    });
  }

  update() {
    if (LB.mode !== 'world' || this.moving) return;
    const k = this.keys, J = Phaser.Input.Keyboard.JustDown;
    if ((J(k.SPACE) || J(k.ENTER) || J(k.Z)) && performance.now() - (LB.lastDialogEnd || 0) > 250) { this.interact(); return; }
    let dir = LB.held;
    if (k.UP.isDown || k.W.isDown) dir = 'up'; else if (k.DOWN.isDown || k.S.isDown) dir = 'down';
    else if (k.LEFT.isDown || k.A.isDown) dir = 'left'; else if (k.RIGHT.isDown || k.D.isDown) dir = 'right';
    if (dir) this.tryMove(dir);
  }

  tryMove(dir) {
    const G = LB.G, [dx, dy] = DIRS[dir], nx = G.x + dx, ny = G.y + dy;
    G.face = dir;
    if (dir === 'left') this.player.img.setFlipX(true); else if (dir === 'right') this.player.img.setFlipX(false);
    if (nx < 0 || ny < 0 || nx >= LB.MW || ny >= LB.MH || LB.SOLID.has(LB.MAP[ny][nx]) || LB.npcAt(nx, ny)) return;
    this.moving = true;
    this.tweens.add({ targets: this.player.img, y: -3, duration: 85, yoyo: true });
    this.tweens.add({
      targets: this.player, x: nx * LB.TS + 16, y: ny * LB.TS + 30, duration: 170,
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => { G.x = nx; G.y = ny; this.moving = false; this.arrive(); }
    });
  }

  async arrive() {
    const G = LB.G, z = LB.zoneAt(G.x, G.y);
    if (z !== this.lastZone) { this.lastZone = z; LB.toast(LB.ZONE_NAMES[z]); }
    const zt = LB.ZONES[LB.MAP[G.y][G.x]];
    if (zt && G.party.length && Math.random() < LB.ENCOUNTER_RATE) {
      LB.mode = 'busy';
      let sp = zt.t[LB.rnd(0, zt.t.length - 1)];
      if (sp === '*') sp = LB.STARTERS.filter(s => s !== G.starter && s !== LB.rivalStarter())[0];
      LB.SFX.enc();
      this.cameras.main.flash(250, 255, 255, 255);
      await LB.wait(300);
      await LB.battle([LB.mk(sp, LB.rnd(zt.lv[0], zt.lv[1]))], { wild: true, zone: zt });
    }
  }

  async interact() {
    if (this.moving || LB.mode !== 'world') return;
    const G = LB.G, [dx, dy] = DIRS[G.face], tx = G.x + dx, ty = G.y + dy;
    await LB.story.interact(tx, ty);
    this.refreshNpcs();
  }
}
