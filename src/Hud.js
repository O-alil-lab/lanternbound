window.LB = window.LB || {};
// ============================================================
// Hud — on-screen info drawn over the world: hearts, lead companion,
// party, skill cooldowns, lanterns, coins and the trainer-fight banner.
// ============================================================
class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    const F = 'Nunito, sans-serif', FT = 'Fraunces, Georgia, serif';
    this.g = this.add.graphics();
    this.portrait = this.add.image(46, 104, 'f_Bellmoss').setOrigin(.5, 1);
    this.leadName = this.add.text(84, 62, '', { fontFamily: FT, fontSize: '19px', fontStyle: '800', color: '#2b2418' });
    this.leadLv = this.add.text(300, 66, '', { fontFamily: F, fontSize: '14px', fontStyle: '800', color: '#6b5d48' }).setOrigin(1, 0);
    this.leadHp = this.add.text(300, 102, '', { fontFamily: F, fontSize: '12px', fontStyle: '800', color: '#6b5d48' }).setOrigin(1, 0);
    this.partyIcons = [];
    for (let i = 0; i < 6; i++) {
      const im = this.add.image(32 + i * 44, 150, 'f_Bellmoss').setOrigin(.5, 1).setVisible(false);
      const n = this.add.text(14 + i * 44, 150, String(i + 1), { fontFamily: F, fontSize: '11px', fontStyle: '800', color: '#fff', stroke: '#2b2418', strokeThickness: 3 }).setVisible(false);
      this.partyIcons.push({ im, n });
    }
    this.info = this.add.text(944, 52, '', { fontFamily: F, fontSize: '15px', fontStyle: '800', color: '#2b2418', backgroundColor: 'rgba(245,239,226,0.92)', padding: { x: 8, y: 4 }, align: 'right' }).setOrigin(1, 0);
    this.banner = this.add.text(480, 18, '', { fontFamily: FT, fontSize: '20px', fontStyle: '800', color: '#ffffff', stroke: '#2b2418', strokeThickness: 5 }).setOrigin(.5, 0);
    // skill dials (keyboard / mouse players)
    this.dials = [['J', 'Attack'], ['K', 'Special'], ['Space', 'Dodge'], ['E', 'Lantern']].map(([key, label], i) => {
      const x = 640 + i * 78, y = 650;
      const t = this.add.text(x, y + 30, `${label}`, { fontFamily: F, fontSize: '12px', fontStyle: '800', color: '#fff', stroke: '#2b2418', strokeThickness: 3 }).setOrigin(.5, 0);
      const k = this.add.text(x, y, key, { fontFamily: F, fontSize: key.length > 1 ? '12px' : '18px', fontStyle: '800', color: '#2b2418' }).setOrigin(.5);
      return { x, y, t, k };
    });
    this.hint = this.add.text(14, 694, LB.touch ? '' : 'Move: WASD · Attack: J or click · Special: K or right-click\nDodge: Space · Lantern: E (R changes type) · Q switch · H salve · F talk',
      { fontFamily: F, fontSize: '12px', fontStyle: '800', color: '#ffffff', stroke: '#2b2418', strokeThickness: 3, lineSpacing: 2 }).setOrigin(0, 1);
    this.time.delayedCall(20000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
  }

  heart(g, x, y, s, full) {
    g.fillStyle(full ? 0xe0533f : 0x5c4a3a, 1);
    g.fillCircle(x - s * .25, y - s * .1, s * .3); g.fillCircle(x + s * .25, y - s * .1, s * .3);
    g.fillTriangle(x - s * .54, y - s * .02, x + s * .54, y - s * .02, x, y + s * .55);
  }

  update() {
    const W = LB.world, G = LB.G; if (!W || !G) return;
    const show = LB.mode !== 'title';
    this.cameras.main.setVisible(show);
    const g = this.g.clear();
    // hearts
    for (let i = 0; i < LB.MAX_HEARTS; i++) this.heart(g, 24 + i * 26, 26, 22, i < G.hearts);
    // lead card
    g.fillStyle(0x000000, .2).fillRoundedRect(13, 49, 300, 62, 12);
    g.fillStyle(0xf5efe2, .95).fillRoundedRect(10, 46, 300, 62, 12).lineStyle(2.5, 0x3b2f20).strokeRoundedRect(10, 46, 300, 62, 12);
    const a = W.ally && W.ally.m;
    if (a) {
      this.portrait.setTexture('f_' + a.sp).setVisible(true); this.portrait.setScale(Math.min(56 / this.portrait.height, 64 / this.portrait.width));
      this.leadName.setText(a.sp); this.leadLv.setText('Lv ' + a.lvl);
      const mx = LB.unitMaxHp(a), v = Math.max(0, a.hpA) / mx;
      g.fillStyle(0xd8ccb2).fillRoundedRect(84, 88, 216, 10, 5);
      g.fillStyle(v > .5 ? 0x5aa340 : v > .2 ? 0xd9a634 : 0xc8452f).fillRoundedRect(84, 88, 216 * v, 10, 5);
      g.fillStyle(0xe2d8c2).fillRect(84, 100, 216, 4).fillStyle(0x4c8fb0).fillRect(84, 100, 216 * Math.min(1, a.xp / LB.need(a.lvl)), 4);
      this.leadHp.setText('');
    } else { this.portrait.setVisible(false); this.leadName.setText('No companion'); this.leadLv.setText(''); }
    // party strip
    G.party.forEach((m, i) => {
      const P = this.partyIcons[i]; if (!P) return;
      P.im.setTexture('f_' + m.sp).setVisible(true); P.im.setScale(Math.min(34 / P.im.height, 38 / P.im.width)).setAlpha(m.hpA > 0 ? 1 : .35);
      P.n.setVisible(true);
      const v = Math.max(0, m.hpA) / LB.unitMaxHp(m);
      if (W.ally && m === W.ally.m) g.lineStyle(2, 0xb8692e).strokeRoundedRect(12 + i * 44, 114, 40, 42, 6);
      g.fillStyle(0x2b2418, .7).fillRect(14 + i * 44, 152, 36, 4).fillStyle(v > .5 ? 0x5aa340 : v > .2 ? 0xd9a634 : 0xc8452f).fillRect(14 + i * 44, 152, 36 * v, 4);
    });
    for (let i = G.party.length; i < 6; i++) { this.partyIcons[i].im.setVisible(false); this.partyIcons[i].n.setVisible(false); }
    // lanterns / coins / salves
    const L = LB.LANTERNS[G.lanternSel] || LB.LANTERNS.lantern;
    this.info.setText(`${L.n.replace(' Lantern', '')} lantern ×${G.items[G.lanternSel] || 0}   (all ${LB.lanternTotal()})\nSalves ${G.items.salve}   ·   Coins ${G.coins}`);
    // dials
    const cds = [[W.atkCd, .5], [W.spcCd, 4], [W.dodgeCd, .7], [0, 1]];
    this.dials.forEach((d, i) => {
      d.t.setVisible(!LB.touch); d.k.setVisible(!LB.touch); if (LB.touch) return;
      const [cd, max] = cds[i], ready = cd <= 0;
      g.fillStyle(0x000000, .25).fillCircle(d.x + 2, d.y + 3, 26);
      g.fillStyle(i === 3 ? Phaser.Display.Color.HexStringToColor(L.col).color : 0xf5efe2, 1).fillCircle(d.x, d.y, 26);
      g.lineStyle(3, ready ? 0x3b2f20 : 0x9a8f7e).strokeCircle(d.x, d.y, 26);
      if (!ready) { g.fillStyle(0x2b2418, .55); g.beginPath(); g.moveTo(d.x, d.y); g.slice(d.x, d.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, cd / max), false); g.closePath(); g.fillPath(); }
    });
    // trainer fight banner
    if (W.fight && W.fight.cur) this.banner.setText(`${W.fight.npc.who}'s ${W.fight.cur.m.sp}  ·  ${W.fight.team.length} left`);
    else if (W.aiming) this.banner.setText('Aim… E / click to throw');
    else this.banner.setText('');
  }
}
