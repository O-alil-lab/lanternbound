// ============================================================
// StarterScene — choose the first companion
// ============================================================
class StarterScene extends Phaser.Scene {
  constructor() { super('Starter'); }
  create() {
    const W = this.scale.width;
    LB.paperBackground(this);
    this.add.text(W / 2, 64, 'Choose your first companion', { fontFamily: LB.FONT_TITLE, fontSize: '40px', fontStyle: '800', color: '#2b2418' }).setOrigin(.5);
    this.add.text(W / 2, 112, 'Choose wisely: your rival takes the one that beats yours.', { fontFamily: LB.FONT_BODY, fontSize: '18px', fontStyle: '800', color: '#6b5d48' }).setOrigin(.5);
    const cw = 280, gap = 22, x0 = W / 2 - cw - gap;
    LB.STARTERS.forEach((sp, i) => {
      const M = LB.MON[sp], x = x0 + i * (cw + gap), y = 400, c = this.add.container(x, y);
      const bg = this.add.graphics();
      const draw = h => { bg.clear(); bg.fillStyle(0xf5efe2, 1).fillRoundedRect(-cw / 2, -240, cw, 480, 16); bg.lineStyle(3, h ? 0xb8692e : 0xc9b892, 1).strokeRoundedRect(-cw / 2, -240, cw, 480, 16); };
      draw(false);
      const img = this.add.image(0, 20, 'f_' + sp).setOrigin(.5, 1); img.setScale(Math.min(230 / img.height, 250 / img.width));
      const nm = this.add.text(0, 50, sp, { fontFamily: LB.FONT_TITLE, fontSize: '28px', fontStyle: '800', color: '#2b2418' }).setOrigin(.5);
      const pill = this.add.graphics(); pill.fillStyle(Phaser.Display.Color.HexStringToColor(LB.TYPE_COLOR[M.t]).color, 1).fillRoundedRect(-44, 74, 88, 26, 13);
      const tt = this.add.text(0, 87, M.t.toUpperCase(), { fontFamily: LB.FONT_BODY, fontSize: '14px', fontStyle: '800', color: '#ffffff' }).setOrigin(.5);
      const d = this.add.text(0, 116, M.d, { fontFamily: LB.FONT_BODY, fontSize: '16px', fontStyle: '700', color: '#6b5d48', align: 'center', wordWrap: { width: cw - 36 } }).setOrigin(.5, 0);
      c.add([bg, img, nm, pill, tt, d]); c.setSize(cw, 480).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => { draw(true); this.tweens.add({ targets: c, y: y - 8, duration: 120 }); });
      c.on('pointerout', () => { draw(false); this.tweens.add({ targets: c, y, duration: 120 }); });
      c.on('pointerdown', () => {
        LB.SFX.caught();
        const G = LB.G; G.starter = sp; G.party = [LB.mk(sp, 6)]; G.caught[sp] = 1; G.seen[sp] = 1; G.items.lantern = 5;
        LB.introPending = true;
        this.scene.start('World');
      });
    });
  }
}
