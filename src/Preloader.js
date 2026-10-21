window.LB = window.LB || {};
// ============================================================
// Preloader — loads every character image, paints the tileset and the
// small effect textures, then opens the title screen.
//
// Phaser Create note: the block between the phaser:assets markers is
// auto-generated from the project's asset list. Don't edit inside it.
// ============================================================
class PreloaderScene extends Phaser.Scene {
  constructor() { super('Preloader'); }

  init() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor('#e9e0cc');
    this.add.text(w / 2, h / 2 - 40, 'Lighting the lanterns…', { fontFamily: 'Nunito, sans-serif', fontSize: '22px', color: '#2b2418', fontStyle: '800' }).setOrigin(.5);
    this.add.rectangle(w / 2, h / 2, 404, 20).setStrokeStyle(2, 0x3b2f20);
    const bar = this.add.rectangle(w / 2 - 200, h / 2, 4, 16, 0x2f7f86).setOrigin(0, .5);
    this.load.on('progress', p => bar.width = 4 + 396 * p);
  }

  preload() {
    /* phaser:assets:start */
    /* phaser:assets:end */

    this.load.setCORS('anonymous');
    Object.keys(LB.TRAINERS).forEach(n => this.load.image('tr_' + n, LB.trainerImg(n)));
    Object.keys(LB.MON).forEach(sp => {
      this.load.image('f_' + sp, LB.compImg(sp, 'front'));
      this.load.image('b_' + sp, LB.compImg(sp, 'back'));
    });
  }

  create() {
    /* phaser:assets:setup:start */
    /* phaser:assets:setup:end */

    // Tileset: one row of 32×32 tiles painted in code (see map.js)
    const tex = this.textures.createCanvas('tiles', LB.TS * LB.TILE_KEYS.length, LB.TS);
    LB.paintTileset(tex.getContext()); tex.refresh();

    // Particle shapes (white, tinted per type at runtime)
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const make = (key, w, h, draw) => { g.clear(); g.fillStyle(0xffffff, 1); draw(g); g.generateTexture(key, w, h); };
    make('px', 4, 4, g => g.fillRect(0, 0, 4, 4));
    make('pt_dot', 16, 16, g => g.fillCircle(8, 8, 8));
    make('pt_leaf', 24, 14, g => g.fillEllipse(12, 7, 24, 12));
    make('pt_drop', 14, 18, g => { g.fillCircle(7, 11, 7); g.fillTriangle(1, 9, 13, 9, 7, 0); });
    make('pt_spark', 12, 12, g => g.fillCircle(6, 6, 6));
    make('pt_streak', 44, 6, g => g.fillRoundedRect(0, 0, 44, 6, 3));
    make('pt_rock', 16, 13, g => g.fillPoints([{ x: 2, y: 13 }, { x: 0, y: 5 }, { x: 6, y: 0 }, { x: 14, y: 2 }, { x: 16, y: 10 }, { x: 11, y: 13 }], true));
    make('pt_star', 26, 26, g => {
      const pts = []; for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 13, a = i * Math.PI / 4 - Math.PI / 2; pts.push({ x: 13 + Math.cos(a) * r, y: 13 + Math.sin(a) * r }); }
      g.fillPoints(pts, true);
    });
    g.destroy();

    // Soft round glow (white, tinted at runtime)
    const gt = this.textures.createCanvas('glow', 128, 128), gc = gt.getContext();
    const grad = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    gc.fillStyle = grad; gc.fillRect(0, 0, 128, 128); gt.refresh();

    // Lantern: brass frame + white crystal (tinted to each lantern's color)
    const lf = this.textures.createCanvas('lantern_frame', 46, 60), c = lf.getContext();
    c.strokeStyle = '#5a3d1c'; c.lineWidth = 3; c.beginPath(); c.moveTo(23, 2); c.lineTo(23, 8); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(23, 4, 3, 0, 7); c.stroke();
    c.fillStyle = '#b8862e'; c.fillRect(11, 8, 24, 6); c.fillRect(11, 48, 24, 6);
    c.strokeStyle = '#b8862e'; c.lineWidth = 2.5; c.strokeRect(12, 14, 22, 34);
    c.fillStyle = 'rgba(255,246,216,.35)'; c.fillRect(13, 15, 20, 32); lf.refresh();
    const lg = this.textures.createCanvas('lantern_gem', 46, 60), c2 = lg.getContext();
    c2.fillStyle = '#ffffff'; c2.beginPath(); c2.moveTo(23, 18); c2.lineTo(30, 30); c2.lineTo(23, 44); c2.lineTo(16, 30); c2.closePath(); c2.fill(); lg.refresh();

    this.scene.start('Title');
  }
}
