/* ==========================================================================
   WILD SURVEY — the Verdant Reach (Phaser 3 overworld)
   A walkable map that drives the same battle engine as the journal UI.
   ========================================================================== */
(function () {
  const ART = () => window.WS_ART;
  const ENGINE = () => window.WS_ENGINE;
  const D = () => window.WS_DATA;

  const WORLD_W = 2600, WORLD_H = 1800;

  /* biome homes for the eighteen wild companions */
  const BIOMES = {
    sap:     { x: 640,  y: 540,  name: 'Mossgrove',     tint: 0x8fae7e },
    tide:    { x: 560,  y: 1120, name: 'Stillwater',    tint: 0x7fa8bd },
    stone:   { x: 1300, y: 1550, name: 'The Quarry',    tint: 0xb4a98e },
    gale:    { x: 2020, y: 430,  name: 'Reedmarsh',     tint: 0xa8bcc4 },
    ember:   { x: 2100, y: 1150, name: 'Dry Meadow',    tint: 0xd9b98c },
    glimmer: { x: 1350, y: 250,  name: 'Twilight Glade', tint: 0xb3a4c9 }
  };

  /* explicit spawn points keep each creature in a readable place */
  const SPAWNS = {
    bellmoss:  [600, 560], drapplet: [790, 700], opaloom: [430, 770],
    puddlewick:[470, 900], rillspool:[520, 1240], coralune: [760, 1080], bristlefin: [700, 1300],
    cairnib:   [1240, 1500], loomtail: [1440, 1620], hearthusk: [1120, 1660],
    clatterbud:[2000, 420], nimbrook: [2150, 600],
    tasselk:   [2060, 1040], tumblefen: [2220, 1240], quillora: [1980, 1300],
    velouray:  [1350, 340], glimmerell: [1210, 400], saffrill: [1500, 410]
  };

  const RIVAL_SPOTS = {
    tavi:  [900, 1180],
    sana:  [620, 940],
    nera:  [790, 470],
    oren:  [1560, 760],
    elin:  [1960, 900],
    ivo:   [1420, 1450]
  };

  const CAMP = { x: 340, y: 1500 };
  const GLADE = { x: 1350, y: 340 };

  let game = null, scene = null, uiApi = null;
  let keys = null, pad = { x: 0, y: 0 };

  /* ------------------------------------------------------------------ scene */
  class Reach extends Phaser.Scene {
    constructor() { super({ key: 'reach' }); }

    preload() {
      const art = ART();
      const ids = D().ORDER.concat(D().MENTORS).concat(['velouray']);
      const use = new Set();
      ids.forEach((id) => ['threeq', 'front', 'back', 'side'].forEach((v) => use.add(id + '_' + v)));
      use.forEach((k) => { if (art[k]) this.load.image(k, art[k]); });
      this.load.on('loaderror', () => {});
    }

    create() {
      scene = this;
      window.__WS_SCENE = this;
      this.g = () => uiApi.state.game;
      this.recorded = () => this.g().recorded || [];
      this.busy = false;
      this.encounterCooldown = 0;

      this.cameras.main.setBackgroundColor('#dfe7d0');
      this.groundGfx = this.make.graphics({ x: 0, y: 0, add: false });
      this.makeGround();
      this.makeDecor();
      this.bakeGround();
      this.makeProps();
      this.makeRivals();
      this.makeCreatures();
      this.makeAmbience();

      const g = this.g();
      const start = (g._pos && g._pos.x) ? g._pos : CAMP;
      const meKey = g.mentor + '_back';
      this.player = this.physics.add.sprite(start.x, start.y + 40, meKey);
      this.player.setOrigin(0.5, 0.94);
      this.fit(this.player, 112);
      this.player.body.setSize(this.player.width * 0.32, this.player.height * 0.14);
      this.player.body.setOffset(this.player.width * 0.34, this.player.height * 0.8);
      this.player.setCollideWorldBounds(true);
      this.player.setDepth(this.player.y);

      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      this.physics.add.collider(this.player, this.solid);
      this.physics.add.collider(this.player, this.water);

      this.physics.add.overlap(this.player, this.wild, (p, w) => this.onWild(w));

      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
      this.cameras.main.fadeIn(420, 242, 234, 217);

      keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ESC');
      const tap = () => this.actNow();
      this.input.keyboard.on('keydown-E', tap);
      this.input.keyboard.on('keydown-SPACE', tap);

      this.marker = this.add.text(0, 0, '!', {
        fontFamily: 'Georgia, serif', fontSize: '26px', color: '#8e2a1c'
      }).setOrigin(0.5).setDepth(99999);
      this.tweens.add({ targets: this.marker, y: '+=10', yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });

      this.scale.on('resize', () => this.applyZoom());
      this.applyZoom();
      this.refresh();
      this.paused = false;
      detectSoftwareGl(this);
    }

    /* ---------------------------------------------------------------- art */
    fit(sprite, targetH) {
      const src = sprite.texture && sprite.texture.getSourceImage ? sprite.texture.getSourceImage() : null;
      const h = (src && src.height) || 430;
      sprite.setScale(targetH / h);
      return sprite;
    }

    setArt(sprite, key, targetH) {
      sprite.setTexture(key);
      this.fit(sprite, targetH);
      return sprite;
    }

    /* ------------------------------------------------------------- ground */
    makeGround() {
      const gfx = this.groundGfx;

      // base grass wash with soft painterly blobs
      gfx.fillStyle(0xdfe7d0, 1).fillRect(0, 0, WORLD_W, WORLD_H);
      const blobs = [[0xc6d6b2, 0.55], [0xe9f0db, 0.55], [0xcdddb9, 0.45], [0xb9cda2, 0.35]];
      for (let i = 0; i < 220; i++) {
        const [col, alpha] = blobs[i % blobs.length];
        const x = Math.random() * WORLD_W, y = Math.random() * WORLD_H;
        gfx.fillStyle(col, alpha);
        gfx.fillEllipse(x, y, 160 + Math.random() * 420, 90 + Math.random() * 240);
      }

      // biome tints
      gfx.fillStyle(0x9dbb8a, 0.30).fillEllipse(BIOMES.sap.x, BIOMES.sap.y, 900, 700);
      gfx.fillStyle(0x9fc0cf, 0.22).fillEllipse(BIOMES.tide.x, BIOMES.tide.y, 820, 640);
      gfx.fillStyle(0xc3b89b, 0.30).fillEllipse(BIOMES.stone.x, BIOMES.stone.y, 900, 620);
      gfx.fillStyle(0xb6c6cc, 0.22).fillEllipse(BIOMES.gale.x, BIOMES.gale.y, 860, 640);
      gfx.fillStyle(0xe3c79c, 0.34).fillEllipse(2100, 1150, 920, 660);
      gfx.fillStyle(0xc3b6d4, 0.24).fillEllipse(GLADE.x, GLADE.y, 820, 560);

      // path network
      const path = [[CAMP.x, CAMP.y], [700, 1330], [900, 1180], [620, 940],
                    [790, 470], [1150, 380], [1560, 760], [1960, 900], [2100, 1150],
                    [1420, 1450], [1300, 1550], [980, 1520], [CAMP.x, CAMP.y]];
      gfx.lineStyle(84, 0xd8c6a2, 0.85);
      this.strokePath(gfx, path);
      gfx.lineStyle(58, 0xe4d5b6, 0.95);
      this.strokePath(gfx, path);

      // branches to the glade
      gfx.lineStyle(70, 0xd8c6a2, 0.8);
      this.strokePath(gfx, [[1150, 380], [1260, 300], [GLADE.x, GLADE.y]]);
      gfx.lineStyle(48, 0xe4d5b6, 0.9);
      this.strokePath(gfx, [[1150, 380], [1260, 300], [GLADE.x, GLADE.y]]);

      // the pond
      gfx.fillStyle(0xe6ddc4, 0.9).fillEllipse(BIOMES.tide.x, BIOMES.tide.y, 470, 300);
      gfx.fillStyle(0x8fb6c9, 0.95).fillEllipse(BIOMES.tide.x, BIOMES.tide.y, 420, 262);
      gfx.fillStyle(0x7ba7bd, 0.8).fillEllipse(BIOMES.tide.x + 18, BIOMES.tide.y + 12, 350, 205);
      gfx.fillStyle(0xa9ccd9, 0.7).fillEllipse(BIOMES.tide.x - 40, BIOMES.tide.y - 26, 180, 96);
      for (let i = 0; i < 9; i++) {
        gfx.lineStyle(2, 0xd6e9ee, 0.55);
        const y = BIOMES.tide.y - 80 + i * 20;
        gfx.beginPath(); gfx.moveTo(BIOMES.tide.x - 150 + Math.random() * 60, y);
        gfx.lineTo(BIOMES.tide.x + 90 + Math.random() * 60, y + 4); gfx.strokePath();
      }

      // dry grass streaks + quarry scree
      for (let i = 0; i < 90; i++) {
        const x = 1700 + Math.random() * 800, y = 850 + Math.random() * 560;
        gfx.lineStyle(2, 0xd8b478, 0.5);
        gfx.beginPath(); gfx.moveTo(x, y); gfx.lineTo(x + 8, y - 14); gfx.strokePath();
      }
      for (let i = 0; i < 70; i++) {
        const x = 1000 + Math.random() * 620, y = 1300 + Math.random() * 400;
        gfx.fillStyle(0xb9ad92, 0.5).fillEllipse(x, y, 10 + Math.random() * 12, 5 + Math.random() * 5);
      }

      // world edge hedges
      gfx.fillStyle(0x7f9a6b, 0.9);
      gfx.fillRect(0, 0, WORLD_W, 40); gfx.fillRect(0, WORLD_H - 40, WORLD_W, 40);
      gfx.fillRect(0, 0, 40, WORLD_H); gfx.fillRect(WORLD_W - 40, 0, 40, WORLD_H);
    }

    /* Phaser Graphics has no quadratic curve, so sample one by hand. */
    strokePath(gfx, pts) {
      const path = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const cx = (ax + bx) / 2 + (bx - ax) * 0.08;
        const cy = (ay + by) / 2 + (by - ay) * 0.08;
        for (let t = 0; t <= 1; t += 1 / 10) {
          const u = 1 - t;
          path.push([
            u * u * ax + 2 * u * t * cx + t * t * bx,
            u * u * ay + 2 * u * t * cy + t * t * by
          ]);
        }
      }
      gfx.beginPath();
      gfx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) gfx.lineTo(path[i][0], path[i][1]);
      gfx.strokePath();
    }

    /* One static texture for the whole reach: paths, washes, flowers and
       reeds are painted once instead of being re-tessellated every frame. */
    bakeGround() {
      const rt = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0).setDepth(-1000);
      rt.draw(this.groundGfx, 0, 0);
      rt.setVisible(true);
      this.groundGfx.destroy();
      this.groundGfx = null;
      this.groundRT = rt;
    }

    /* ------------------------------------------------------------- decor */
    /* Ground detail is painted into the static ground layer: hundreds of
       individual Graphics objects would cost a draw call each. */
    makeDecor() {
      const gfx = this.groundGfx;
      for (let i = 0; i < 520; i++) {
        const x = 70 + Math.random() * (WORLD_W - 140);
        const y = 70 + Math.random() * (WORLD_H - 140);
        const r = Math.random();
        if (r < 0.42) {
          const col = r < 0.2 ? 0xf6f2e4 : r < 0.32 ? 0xe9d3a2 : 0xd8b2bf;
          gfx.fillStyle(col, 0.85).fillCircle(x, y, 1.6 + Math.random() * 1.8);
        } else {
          gfx.lineStyle(2, 0x8fa87a, 0.65);
          for (let k = 0; k < 3; k++) {
            gfx.beginPath();
            gfx.moveTo(x + k * 3, y);
            gfx.lineTo(x + k * 3 - 3, y - 8 - Math.random() * 6);
            gfx.strokePath();
          }
        }
      }
      // reed beds in the marsh
      for (let i = 0; i < 40; i++) {
        const x = 1880 + Math.random() * 360, y = 280 + Math.random() * 340;
        gfx.lineStyle(3, 0x77936f, 0.85);
        for (let k = 0; k < 5; k++) {
          gfx.beginPath(); gfx.moveTo(x + k * 5, y); gfx.lineTo(x + k * 5 + 4, y - 24 - Math.random() * 18); gfx.strokePath();
        }
        gfx.fillStyle(0xb08a5e, 0.9).fillEllipse(x + 12, y - 38, 6, 15);
      }
    }

    /* ------------------------------------------------------------- props */
    treeTexture(key, canopy, canopy2, trunk) {
      if (this.textures.exists(key)) return;
      const w = 220, h = 260;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.10).fillEllipse(w / 2, h - 22, 150, 34);
      g.fillStyle(trunk, 1).fillRect(w / 2 - 9, h - 92, 18, 74);
      g.fillStyle(canopy, 1);
      g.fillCircle(w / 2, h - 150, 74);
      g.fillCircle(w / 2 - 52, h - 124, 52);
      g.fillCircle(w / 2 + 50, h - 128, 56);
      g.fillCircle(w / 2 - 18, h - 196, 46);
      g.fillStyle(canopy2, 0.85);
      g.fillCircle(w / 2 - 26, h - 174, 40);
      g.fillCircle(w / 2 + 30, h - 158, 44);
      g.fillStyle(0xffffff, 0.10);
      g.fillCircle(w / 2 - 40, h - 196, 26);
      g.generateTexture(key, w, h);
      g.destroy();
    }

    rockTexture(key, tone) {
      if (this.textures.exists(key)) return;
      const w = 150, h = 110;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.12).fillEllipse(w / 2, h - 14, 110, 22);
      g.fillStyle(tone, 1).fillEllipse(w / 2, h - 40, 120, 62);
      g.fillStyle(0xffffff, 0.14).fillEllipse(w / 2 - 18, h - 54, 56, 26);
      g.fillStyle(0x000000, 0.10).fillEllipse(w / 2 + 20, h - 30, 70, 20);
      g.generateTexture(key, w, h);
      g.destroy();
    }

    makeProps() {
      this.solid = this.physics.add.staticGroup();
      this.water = this.physics.add.staticGroup();

      this.treeTexture('tree_a', 0x5f8352, 0x799a63, 0x6f553d);
      this.treeTexture('tree_b', 0x4f7448, 0x6b8d5a, 0x5f4832);
      this.rockTexture('rock_a', 0x9d9482);
      this.rockTexture('rock_b', 0x8b8474);

      this.trees = [];
      const addTree = (x, y, key, s) => {
        const t = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(s).setDepth(y);
        t.canopy = 150 * s;
        this.trees.push(t);
        this.solid.add(t);
        const b = t.body;
        if (b) { b.setSize(t.displayWidth * 0.26, 26); b.setOffset(t.displayWidth * 0.37, t.displayHeight - 26); }
      };
      const addRock = (x, y, key, s) => {
        const r = this.add.image(x, y, key).setOrigin(0.5, 1).setScale(s).setDepth(y);
        this.solid.add(r);
        const b = r.body;
        if (b) { b.setSize(r.displayWidth * 0.7, 22); b.setOffset(r.displayWidth * 0.15, r.displayHeight - 22); }
      };

      // grove cluster
      const grove = [[420, 380], [520, 330], [640, 320], [760, 350], [860, 430], [470, 640], [660, 720], [850, 640], [380, 520], [900, 520]];
      grove.forEach(([x, y], i) => addTree(x, y, i % 2 ? 'tree_a' : 'tree_b', 0.85 + (i % 3) * 0.12));

      // scattered trees across the reach
      const spots = [[1180, 620], [1320, 520], [1680, 480], [1820, 620], [1660, 980], [1880, 1080],
                     [2240, 700], [2320, 900], [1180, 1260], [1560, 1320], [1780, 1520], [2060, 1420],
                     [760, 880], [420, 840], [560, 1400], [880, 1460], [1120, 900], [1480, 1040],
                     [2140, 260], [1760, 250], [980, 250], [640, 1180], [2300, 1300], [300, 1200]];
      spots.forEach(([x, y], i) => addTree(x, y, i % 2 ? 'tree_b' : 'tree_a', 0.9 + (i % 4) * 0.08));

      // quarry rocks
      [[1180, 1400], [1300, 1340], [1420, 1360], [1520, 1420], [1240, 1660], [1160, 1560],
       [1360, 1700], [1460, 1620], [1600, 1540]].forEach(([x, y], i) =>
        addRock(x, y, i % 2 ? 'rock_a' : 'rock_b', 0.9 + (i % 3) * 0.15));

      // glade stones
      const stoneGfx = this.add.graphics().setDepth(GLADE.y - 20);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = GLADE.x + Math.cos(a) * 190, y = GLADE.y + Math.sin(a) * 130;
        stoneGfx.fillStyle(0x8d84a8, 0.95).fillCircle(x, y, 13);
        stoneGfx.fillStyle(0xffffff, 0.18).fillCircle(x - 4, y - 4, 5);
        const body = this.add.rectangle(x, y, 26, 20, 0x000000, 0);
        this.physics.add.existing(body, true); this.solid.add(body);
      }

      // pond water bodies (block walking)
      const pond = { x: BIOMES.tide.x, y: BIOMES.tide.y };
      for (let i = 0; i < 5; i++) {
        const w = this.add.rectangle(pond.x, pond.y - 40 + i * 26, 380 - Math.abs(i - 2) * 40, 40, 0x000000, 0);
        this.physics.add.existing(w, true);
        this.water.add(w);
      }

      // camp
      this.makeCamp();
    }

    makeCamp() {
      const g = this.add.graphics().setDepth(CAMP.y - 2);
      g.fillStyle(0x000000, 0.10).fillEllipse(CAMP.x, CAMP.y + 30, 190, 46);
      g.fillStyle(0xd9c7a4, 1).fillEllipse(CAMP.x, CAMP.y + 26, 165, 40);
      // logs
      g.fillStyle(0x8a6a4c, 1); g.fillRect(CAMP.x - 44, CAMP.y + 6, 88, 12);
      g.fillStyle(0x9b7a58, 1); g.fillRect(CAMP.x - 30, CAMP.y - 6, 60, 12);
      // fire
      g.fillStyle(0xe39a3c, 0.9).fillCircle(CAMP.x, CAMP.y + 8, 14);
      g.fillStyle(0xf6d06a, 0.95).fillCircle(CAMP.x, CAMP.y + 4, 8);
      const glow = this.add.circle(CAMP.x, CAMP.y + 6, 90, 0xf6cf7a, 0.16).setDepth(CAMP.y - 3);
      this.tweens.add({ targets: glow, alpha: 0.28, scale: 1.08, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });

      const tent = this.add.graphics().setDepth(CAMP.y - 10);
      tent.fillStyle(0x000000, 0.10).fillEllipse(CAMP.x - 110, CAMP.y + 26, 90, 22);
      tent.fillStyle(0xe4d6b8, 1);
      tent.fillTriangle(CAMP.x - 150, CAMP.y + 24, CAMP.x - 70, CAMP.y + 24, CAMP.x - 110, CAMP.y - 58);
      tent.fillStyle(0xcbb896, 1);
      tent.fillTriangle(CAMP.x - 110, CAMP.y + 24, CAMP.x - 70, CAMP.y + 24, CAMP.x - 110, CAMP.y - 58);
      const body = this.add.rectangle(CAMP.x - 110, CAMP.y, 80, 26, 0x000000, 0);
      this.physics.add.existing(body, true); this.solid.add(body);
    }

    /* ------------------------------------------------------------ rivals */
    makeRivals() {
      this.rivals = {};
      Object.entries(RIVAL_SPOTS).forEach(([id, [x, y]]) => {
        const spr = this.add.image(x, y, id + '_front').setOrigin(0.5, 0.96).setDepth(y);
        this.fit(spr, 108);
        const tag = this.add.text(x, y + 12, D().TRAINERS[id].name, {
          fontFamily: 'Georgia, serif', fontSize: '15px', color: '#1d3448',
          backgroundColor: 'rgba(247,240,225,0.82)', padding: { x: 7, y: 3 }
        }).setOrigin(0.5, 0).setDepth(y + 1);
        const ring = this.add.circle(x, y + 6, 54, 0x1d3448, 0.05).setDepth(y - 1);
        this.rivals[id] = { spr, tag, ring, x, y };
      });

      // the glade: a veil of dusk light, standing stones and a sleeping silhouette
      this.veilGlow = this.add.ellipse(GLADE.x, GLADE.y + 40, 360, 220, 0x7a5f9e, 0.22).setDepth(-900);
      this.tweens.add({ targets: this.veilGlow, alpha: 0.42, scaleX: 1.08, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.easeInOut' });

      const stones = this.add.graphics().setDepth(GLADE.y - 30);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.15 + (i / 6) * Math.PI * 1.3;
        const x = GLADE.x + Math.cos(a) * 210, y = GLADE.y + Math.sin(a) * 120 + 20;
        const h = 54 + (i % 3) * 16;
        stones.fillStyle(0x000000, 0.10).fillEllipse(x, y + 6, 40, 12);
        stones.fillStyle(0x8b83a3, 1).fillRoundedRect(x - 11, y - h, 22, h, 5);
        stones.fillStyle(0xb3aac6, 0.75).fillRoundedRect(x - 8, y - h + 4, 7, h - 10, 3);
        this.physics.add.existing(this.add.rectangle(x, y - 6, 26, 18, 0x000000, 0).setDepth(y), true);
      }
      this.veilFig = this.add.image(GLADE.x, GLADE.y + 30, 'velouray_threeq')
        .setOrigin(0.5, 0.95).setAlpha(0.55).setDepth(GLADE.y);
      this.fit(this.veilFig, 92);
      this.tweens.add({ targets: this.veilFig, alpha: 0.78, y: GLADE.y + 22, yoyo: true, repeat: -1, duration: 3200, ease: 'Sine.easeInOut' });

      // a beacon ring that follows whichever objective is live
      if (!this.textures.exists('beacon_ring')) {
        const g = this.make.graphics({ add: false });
        g.lineStyle(4, 0xa8762f, 0.95).strokeCircle(40, 40, 30);
        g.lineStyle(2, 0xf6e3bd, 0.9).strokeCircle(40, 40, 22);
        g.generateTexture('beacon_ring', 80, 80);
        g.destroy();
      }
      this.beacon = this.add.image(0, 0, 'beacon_ring').setDepth(9500).setVisible(false);
      this.tweens.add({ targets: this.beacon, scaleX: 1.25, scaleY: 1.25, alpha: 0.55, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
    }

    /* --------------------------------------------------------- creatures */
    makeCreatures() {
      this.wild = this.physics.add.group();
      this.wildInfo = new Map();
      Object.entries(SPAWNS).forEach(([cid, [x, y]]) => {
        if (cid === 'velouray') return;              // the veil is not wandering
        const spr = this.physics.add.sprite(x, y, cid + '_threeq');
        spr.setOrigin(0.5, 0.95);
        const big = ENGINE().CREATURES[cid].base.hp >= 80;
        this.fit(spr, big ? 92 : 74);
        spr.body.setSize(spr.width * 0.5, spr.height * 0.22);
        spr.body.setOffset(spr.width * 0.25, spr.height * 0.72);
        spr.setCollideWorldBounds(true);
        spr.setDepth(spr.y);
        const info = { cid, home: { x, y }, spr, alive: true };
        this.wild.add(spr);
        this.wildInfo.set(spr, info);
        this.wander(info);

        // shadow
        info.shadow = this.add.ellipse(x, y + 4, 54, 14, 0x2b3c48, 0.16).setDepth(spr.y - 1);
      });
    }

    wander(info) {
      const spr = info.spr;
      if (!spr || !spr.active) return;
      const dist = 60 + Math.random() * 150;
      const ang = Math.random() * Math.PI * 2;
      const tx = Phaser.Math.Clamp(info.home.x + Math.cos(ang) * dist, 80, WORLD_W - 80);
      const ty = Phaser.Math.Clamp(info.home.y + Math.sin(ang) * dist, 80, WORLD_H - 80);
      this.physics.moveTo(spr, tx, ty, 26 + Math.random() * 18);
      spr.flipX = tx < spr.x;
      this.time.delayedCall(2200 + Math.random() * 2600, () => {
        if (!spr.active) return;
        spr.setVelocity(0, 0);
        this.time.delayedCall(600 + Math.random() * 1400, () => this.wander(info));
      });
    }

    onWild(spr) {
      if (this.busy || rebuilding || this.encounterCooldown > 0) return;
      const info = this.wildInfo.get(spr);
      if (!info || !info.alive) return;
      if (this.recorded().includes(info.cid)) return;
      this.busy = true;
      info.alive = false;
      spr.setVelocity(0, 0);
      this.cameras.main.flash(220, 255, 250, 235);
      this.tweens.add({ targets: spr, alpha: 0, scaleX: 0.9, scaleY: 0.9, duration: 220 });
      uiApi.startWildBattle(info.cid, spr, this);
    }

    /* ---------------------------------------------------------- ambience */
    makeAmbience() {
      this.fog = [];
      for (let i = 0; i < 3; i++) {
        const c = this.add.ellipse(Math.random() * WORLD_W, Math.random() * WORLD_H,
          620 + Math.random() * 420, 190 + Math.random() * 140, 0xffffff, 0.05)
          .setScrollFactor(0.9).setDepth(6000);
        this.tweens.add({ targets: c, x: '+=260', yoyo: true, repeat: -1, duration: 22000 + i * 4000, ease: 'Sine.easeInOut' });
        this.fog.push(c);
      }
      // dusk wash that deepens with chapters
      this.wash = this.add.rectangle(0, 0, 10, 10, 0xf2d9a8, 0).setOrigin(0).setScrollFactor(0).setDepth(9500);
      this.scale.on('resize', () => this.sizeWash());
      this.sizeWash();
    }

    sizeWash() {
      if (!this.wash) return;
      this.wash.setSize(this.scale.width, this.scale.height);
    }

    applyZoom() {
      if (!this.cameras || !this.cameras.main) return;
      const w = this.scale.width;
      const zoom = w < 560 ? 0.72 : w < 900 ? 0.86 : 1.02;
      this.cameras.main.setZoom(zoom);
    }

    /* ------------------------------------------------------------ update */
    update(time, delta) {
      if (this.paused || !this.player || this.busy) return;
      if (this.encounterCooldown > 0) this.encounterCooldown -= delta;
      const g = this.g();
      const speed = 210;
      let vx = 0, vy = 0;
      if (keys.A.isDown || keys.LEFT.isDown || pad.x < -0.2) vx -= 1;
      if (keys.D.isDown || keys.RIGHT.isDown || pad.x > 0.2) vx += 1;
      if (keys.W.isDown || keys.UP.isDown || pad.y < -0.2) vy -= 1;
      if (keys.S.isDown || keys.DOWN.isDown || pad.y > 0.2) vy += 1;
      const len = Math.hypot(vx, vy) || 1;
      this.player.setVelocity((vx / len) * speed, (vy / len) * speed);

      if (pad.act) { pad.act = false; this.actNow(); }
      const moved = vx || vy;
      const key = g.mentor + (vy < 0 ? '_back' : vy > 0 ? '_front' : '_side');
      if (moved) {
        if (this.player.texture.key !== key) this.setArt(this.player, key, 112);
        this.player.setFlipX(vx < 0);
        this.player.setDepth(this.player.y);
        g._pos = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
      }

      // shadows follow
      this.wildInfo.forEach((info) => {
        if (info.shadow && info.spr.active) info.shadow.setPosition(info.spr.x, info.spr.y + 4).setDepth(info.spr.y - 1);
      });

      this.updatePrompts();
      this.updateCanopies();
      this.updateWash();
    }

    /* Walk behind a tree and its crown softens so you never lose yourself. */
    updateCanopies() {
      const p = this.player;
      for (let i = 0; i < this.trees.length; i++) {
        const t = this.trees[i];
        const dx = Math.abs(p.x - t.x);
        const behind = p.y < t.y + 6 && p.y > t.y - t.canopy * 2.1 && dx < t.canopy * 0.62;
        const want = behind ? 0.55 : 1;
        if (t.alpha !== want) t.setAlpha(want);
      }
    }

    updateWash() {
      const g = this.g();
      const t = Math.min(1, (g.chapter + (g.velourayDefeated ? 1 : 0)) / 5);
      // cream morning -> warm afternoon -> violet dusk
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(255, 236, 196), new Phaser.Display.Color(150, 126, 186), 100, t * 100);
      this.wash.setFillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 0.10 + t * 0.24);
    }

    updatePrompts() {
      const g = this.g();
      const p = this.player;
      let prompt = '';

      // nearest rival
      let near = null, best = 1e9;
      Object.entries(this.rivals).forEach(([id, r]) => {
        if (g.defeated.includes(id)) return;
        const d = Phaser.Math.Distance.Between(p.x, p.y, r.x, r.y);
        if (d < best) { best = d; near = id; }
      });
      if (near && best < 120) {
        const nextId = g.route[g.chapter];
        prompt = near === nextId
          ? `Press E — challenge ${D().TRAINERS[near].name}, ${D().TRAINERS[near].title}`
          : `${D().TRAINERS[near].name} — “Not yet. ${D().TRAINERS[nextId] ? D().TRAINERS[nextId].name : 'The veil'} first.”`;
      }

      // the glade
      const dGlade = Phaser.Math.Distance.Between(p.x, p.y, GLADE.x, GLADE.y + 30);
      if (dGlade < 150 && g.chapter >= g.route.length) {
        prompt = 'Press E — the twilight veil';
      }

      // camp
      const dCamp = Phaser.Math.Distance.Between(p.x, p.y, CAMP.x, CAMP.y);
      if (dCamp < 110) prompt = 'Your camp. The lantern burns low — press E to rest and heal';

      const objective = g.chapter >= g.route.length
        ? 'the Twilight Glade, north'
        : `${D().TRAINERS[g.route[g.chapter]].name} — marked on the map`;
      if (objective !== this._objective) {
        this._objective = objective;
        uiApi.worldObjective(objective);
      }

      if (prompt !== this._prompt) {
        this._prompt = prompt;
        uiApi.worldPrompt(prompt);
      }

      // beacon: next rival, or the glade once every rival is done
      const nextId = g.route[g.chapter];
      if (!g.velourayDefeated && nextId && this.rivals[nextId]) {
        const r = this.rivals[nextId];
        this.beacon.setVisible(true).setPosition(r.x + 44, r.y - 118);
      } else if (!g.velourayDefeated) {
        this.beacon.setVisible(true).setPosition(GLADE.x + 40, GLADE.y - 110);
      } else {
        this.beacon.setVisible(false);
      }

      const nearRival = near && best < 120 && near === g.route[g.chapter];
      const nearGlade = dGlade < 150 && g.chapter >= g.route.length;
      if (nearRival) this.marker.setPosition(this.rivals[near].x + 62, this.rivals[near].y - 96).setVisible(true);
      else if (nearGlade) this.marker.setPosition(GLADE.x, GLADE.y - 70).setVisible(true);
      else this.marker.setVisible(false);

      this.context = { camp: dCamp < 110, rival: (near && best < 120) ? near : null, glade: nearGlade };
    }

    /* Actions come from keydown events (not JustDown polling) so a quick tap
       is never lost between frames - and so the touch pad behaves the same. */
    actNow() {
      if (!this.context || this.paused || this.busy || rebuilding) return;
      const g = this.g();
      const { camp, rival, glade } = this.context;

      if (camp) {
        ENGINE().healAll(g.team); uiApi.saveGame(); uiApi.worldPrompt('Your companions are rested.');
        this.cameras.main.flash(200, 255, 244, 214);
        return;
      }
      if (rival) {
        const near = rival;
        const nextId = g.route[g.chapter];
        if (near === nextId) {
          this.busy = true;
          if (uiApi.openPrebattle) uiApi.openPrebattle(); else uiApi.startChapterBattle(near);
        } else if (g.defeated.includes(near)) {
          uiApi.worldPrompt(`${D().TRAINERS[near].name} nods. “Good survey.”`);
        } else {
          uiApi.worldPrompt(`“Not yet — ${D().TRAINERS[nextId] ? D().TRAINERS[nextId].name : 'the veil'} comes first.”`);
        }
        return;
      }
      if (glade) {
        this.busy = true;
        if (uiApi.openPrebattle) uiApi.openPrebattle(); else uiApi.startFinalBattle();
      }
    }

    /* ------------------------------------------------------------ control */
    setPaused(v) {
      this.paused = v;
      if (v) this.physics.pause(); else this.physics.resume();
      if (v) this.player.setVelocity(0, 0);
    }

    refresh() {
      const g = this.g();
      Object.entries(this.rivals).forEach(([id, r]) => {
        const done = g.defeated.includes(id);
        r.spr.setAlpha(done ? 0.38 : 1);
        r.tag.setText(done ? D().TRAINERS[id].name + ' ✓' : D().TRAINERS[id].name);
        r.ring.setFillStyle(done ? 0x4c7a56 : 0x1d3448, done ? 0.10 : 0.05);
      });
      // recorded creatures leave the reach
      this.wildInfo.forEach((info) => {
        const rec = this.recorded().includes(info.cid);
        info.spr.setVisible(!rec);
        if (info.shadow) info.shadow.setVisible(!rec);
        info.spr.body.enable = !rec;
      });
      this.updateWash();
    }

    grassPuff(x, y) {
      const c = this.add.circle(x, y, 6, 0xffffff, 0.6).setDepth(y);
      this.tweens.add({ targets: c, alpha: 0, scale: 2.6, duration: 420, onComplete: () => c.destroy() });
    }
  }

  /* -------------------------------------------------------------- bootstrap */
  function start(api) {
    uiApi = api;
    if (game) { resume(); refresh(); return; }
    const forceCanvas = /(?:\?|&)renderer=canvas/.test(location.search) || !!window.__wsCanvasOnly;
    createGame(forceCanvas ? Phaser.CANVAS : Phaser.AUTO);
    watchdog(forceCanvas);
  }

  function createGame(type) {
    const parent = document.getElementById('game-canvas');
    game = new Phaser.Game({
      type,
      parent,
      width: parent.clientWidth || 1200,
      height: parent.clientHeight || 620,
      backgroundColor: '#dfe7d0',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
      render: { antialias: type !== Phaser.CANVAS, roundPixels: false, powerPreference: 'high-performance' },
      scene: [Reach]
    });
    window.__WS_GAME_OBJ = game;
    bindPad();
  }

  /* Software GL (SwiftShader, llvmpipe, Mesa softpipe) crawls with WebGL.
     Ask the driver directly - instant, and far safer than timing frames. */
  function detectSoftwareGl(s) {
    if (!game || game.renderer.type !== Phaser.WEBGL) return;
    let tag = '';
    try {
      const gl = game.renderer.gl;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      tag = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    } catch (e) { return; }
    const soft = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(tag);
    if (!soft) return;
    scheduleRebuild();
  }

  let rebuilding = false;
  function scheduleRebuild() {
    if (rebuilding || !game || game.renderer.type !== Phaser.WEBGL) return;
    const attempt = (n) => {
      const s = scene;
      const map = document.getElementById('screen-world');
      const onMap = map && map.classList.contains('active');
      if ((!s || s.busy || !onMap) && n < 20) return setTimeout(() => attempt(n + 1), 500);
      rebuilding = true;
      window.__wsCanvasOnly = true;
      try { game.destroy(true); } catch (e) { /* ignore */ }
      game = null; scene = null;
      createGame(Phaser.CANVAS);
      rebuilding = false;
    };
    setTimeout(() => attempt(0), 250);
  }

  /* Software-GL machines crawl on WebGL. Measure for a couple of seconds and,
     if the frame rate is poor, rebuild the same scene on the 2D renderer. */
  function watchdog(forceCanvas, attempt) {
    if (forceCanvas) return;
    attempt = attempt || 0;
    setTimeout(() => {
      const s = scene;
      const visible = document.getElementById('screen-world');
      const onMap = visible && visible.classList.contains('active');
      if (!s || !game || !onMap || s.busy) {
        if (attempt < 12) return watchdog(forceCanvas, attempt + 1);
        return;
      }
      let frames = 0;
      const tick = () => { frames += 1; };
      s.events.on('postupdate', tick);
      const t0 = performance.now();
      setTimeout(() => {
        s.events.off('postupdate', tick);
        const fps = frames / ((performance.now() - t0) / 1000);
        if (fps < 28 && game && game.renderer && game.renderer.type === Phaser.WEBGL) scheduleRebuild();
      }, 1800);
    }, 1400);
  }

  function resume() {
    if (!scene || !game) return;
    try { game.loop.wake(); } catch (e) { /* older builds */ }
    try { game.scale.refresh(); } catch (e) { /* ignore */ }
    scene.setPaused(false);
  }
  function pause() {
    if (scene) scene.setPaused(true);
    if (game) { try { game.loop.sleep(); } catch (e) { /* ignore */ } }
  }
  function refresh() { if (scene) scene.refresh(); }
  function returnFromBattle() {
    if (!scene) return;
    scene.busy = false;
    scene.encounterCooldown = 1600;
    scene.setPaused(false);
    scene.refresh();
    scene.cameras.main.fadeIn(500, 242, 234, 217);
  }
  function markWildGone(spr) {
    if (!scene || !spr) return;
    spr.destroy();
  }

  function bindPad() {
    const padEl = document.getElementById('w-pad');
    if (!padEl) return;
    const set = (dir, on) => {
      if (dir === 'up') pad.y = on ? -1 : 0;
      if (dir === 'down') pad.y = on ? 1 : 0;
      if (dir === 'left') pad.x = on ? -1 : 0;
      if (dir === 'right') pad.x = on ? 1 : 0;
      if (dir === 'act' && on) pad.act = true;
    };
    padEl.querySelectorAll('button[data-dir]').forEach((b) => {
      const d = b.dataset.dir;
      const down = (e) => { e.preventDefault(); set(d, true); b.classList.add('down'); };
      const up = (e) => { e.preventDefault(); if (d !== 'act') set(d, false); b.classList.remove('down'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    });
  }

  window.WS_WORLD = { start, resume, pause, refresh, returnFromBattle, markWildGone };
})();
