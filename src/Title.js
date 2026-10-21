window.LB = window.LB || {};
// ============================================================
// TitleScene — pick a trainer (or continue a saved game)
// ============================================================
LB.FONT_TITLE = 'Fraunces, Georgia, serif';
LB.FONT_BODY = 'Nunito, Arial, sans-serif';

// A reusable card-style button
LB.makeButton = function (scene, x, y, w, h, label, onClick, opts = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const draw = hover => {
    bg.clear();
    bg.fillStyle(opts.fill ?? (hover ? 0xfff7e6 : 0xffffff), 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(opts.lineWidth || 2.5, opts.line ?? (hover ? 0xb8692e : 0x3b2f20), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  };
  draw(false);
  const t = scene.add.text(0, opts.sub ? -9 : 0, label, { fontFamily: LB.FONT_BODY, fontSize: (opts.size || 20) + 'px', fontStyle: '800', color: opts.color || '#2b2418', align: 'center' }).setOrigin(.5);
  c.add([bg, t]);
  if (opts.sub) c.add(scene.add.text(0, 13, opts.sub, { fontFamily: LB.FONT_BODY, fontSize: '14px', fontStyle: '800', color: opts.color || '#6b5d48' }).setOrigin(.5).setAlpha(.9));
  c.setSize(w, h);
  if (!opts.disabled) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true)); c.on('pointerout', () => draw(false));
    c.on('pointerdown', () => { LB.SFX.sel(); onClick(); });
  } else c.setAlpha(.4);
  return c;
};
LB.paperBackground = function (scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0xfbf6ea, 0xfbf6ea, 0xd8c9a6, 0xd8c9a6, 1).fillRect(0, 0, scene.scale.width, scene.scale.height);
  return g;
};

class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    LB.mode = 'title'; LB.showHud(false);
    const W = this.scale.width;
    LB.paperBackground(this);
    for (let i = 0; i < 14; i++) {   // floating lantern lights
      const s = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 700), 'glow').setTint(0x9feaf2).setAlpha(.5).setScale(Phaser.Math.FloatBetween(.2, .6));
      this.tweens.add({ targets: s, y: s.y - 60, alpha: .1, duration: Phaser.Math.Between(2500, 5000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const t1 = this.add.text(0, 92, 'Lantern', { fontFamily: LB.FONT_TITLE, fontSize: '76px', fontStyle: '800', color: '#2b3b3a' }).setOrigin(0, .5);
    const t2 = this.add.text(0, 92, 'bound', { fontFamily: LB.FONT_TITLE, fontSize: '76px', fontStyle: '800', color: '#b8692e' }).setOrigin(0, .5);
    t1.x = W / 2 - (t1.width + t2.width) / 2; t2.x = t1.x + t1.width;
    this.add.text(W / 2, 160, 'Choose your trainer', { fontFamily: LB.FONT_BODY, fontSize: '22px', fontStyle: '800', color: '#6b5d48' }).setOrigin(.5);

    const names = Object.keys(LB.TRAINERS), cw = 140, gap = 12, x0 = W / 2 - (names.length * cw + (names.length - 1) * gap) / 2 + cw / 2;
    names.forEach((n, i) => {
      const x = x0 + i * (cw + gap), y = 360, c = this.add.container(x, y);
      const bg = this.add.graphics();
      const draw = h => { bg.clear(); bg.fillStyle(0xf5efe2, 1).fillRoundedRect(-cw / 2, -150, cw, 300, 14); bg.lineStyle(3, h ? 0xb8692e : 0xc9b892, 1).strokeRoundedRect(-cw / 2, -150, cw, 300, 14); };
      draw(false);
      const img = this.add.image(0, 110, 'tr_' + n).setOrigin(.5, 1); img.setScale(Math.min(240 / img.height, 120 / img.width));
      const nm = this.add.text(0, 130, n, { fontFamily: LB.FONT_TITLE, fontSize: '22px', fontStyle: '800', color: '#2b2418' }).setOrigin(.5);
      c.add([bg, img, nm]); c.setSize(cw, 300).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => { draw(true); this.tweens.add({ targets: c, y: y - 8, duration: 120 }); this.desc.setText(LB.TRAINERS[n]); });
      c.on('pointerout', () => { draw(false); this.tweens.add({ targets: c, y, duration: 120 }); });
      c.on('pointerdown', () => { LB.SFX.sel(); LB.newGame(n); this.scene.start('Starter'); });
    });
    this.desc = this.add.text(W / 2, 540, 'Every trainer carries a crystal lantern. Companions who trust you step into its light.', { fontFamily: LB.FONT_BODY, fontSize: '18px', fontStyle: '700', color: '#6b5d48', align: 'center', wordWrap: { width: 760 } }).setOrigin(.5);

    const s = LB.load();
    if (s && s.party && s.party.length) {
      LB.makeButton(this, W / 2, 620, 300, 56, `Continue as ${s.player}`, () => { LB.G = LB.norm(s); this.scene.start('World'); }, { fill: 0x2f4f4c, color: '#ffffff', line: 0x17302d });
    }
  }
}
