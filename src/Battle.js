window.LB = window.LB || {};
// ============================================================
// BattleScene — turn-based battles and befriending with lanterns
// ============================================================
const hexNum = h => Phaser.Display.Color.HexStringToColor(h).color;
const PART = {
  Grove: ['pt_leaf', [0x7fbf4a, 0xb5dd7a]], Tide: ['pt_drop', [0x4aa8e0, 0xa8e2ff]], Ember: ['pt_spark', [0xff8a3c, 0xffd27a]],
  Gale: ['pt_streak', [0xffffff, 0xc9d4ff]], Stone: ['pt_rock', [0x8a7560, 0xb9a88c]], Glimmer: ['pt_star', [0xe4b8ff, 0xfff3a8]],
  Plain: ['pt_dot', [0xffffff, 0xf3e3c0]]
};

// Start a battle from anywhere. Resolves true on a win.
LB.battle = function (foes, opts) {
  return new Promise(res => {
    LB.mode = 'battle'; LB.showHud(false);
    LB.game.scene.pause('World');
    LB.game.scene.start('Battle', { foes, opts, done: res });
  }).then(async result => {
    const G = LB.G, w = LB.world;
    LB.game.scene.resume('World'); LB.mode = 'world';
    if (result === 'win' && opts.id) G.beat[opts.id] = true;
    if (result === 'lose') {
      LB.healAll(); G.x = 4; G.y = 19; G.face = 'up';
      if (w) { w.player.setPosition(G.x * LB.TS + 16, G.y * LB.TS + 30).setDepth(G.y * LB.TS + 30); w.cameras.main.fadeIn(400); }
      await LB.dialog(['All your companions are tired out…', 'You hurry back to the shrine. Everyone is rested now.']);
    }
    if (w) w.refreshNpcs();
    LB.updHud(); LB.save(true);
    return result === 'win';
  });
};

class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  init(d) { this.d = d; }

  create() {
    const W = 960, H = 704, AH = 470, z = this.d.opts.zone || LB.ZONES[LB.MAP[LB.G.y][LB.G.x]] || { bg: [0xf1e8d5, 0xcdbb94] };
    this.AH = AH;
    const bg = this.add.graphics();
    bg.fillGradientStyle(z.bg[0], z.bg[0], z.bg[1], z.bg[1], 1).fillRect(0, 0, W, AH);
    this.add.ellipse(720, 292, 380, 70, 0x3c2d19, .22);
    this.add.ellipse(250, 492, 440, 84, 0x3c2d19, .22);

    this.foeImg = this.add.image(720, 300, 'f_' + this.d.foes[0].sp).setOrigin(.5, 1);
    this.meImg = this.add.image(250, 505, 'b_Bellmoss').setOrigin(.5, 1);

    // message box + menu
    this.add.rectangle(0, AH, W, H - AH, 0xf5efe2).setOrigin(0).setDepth(20);
    this.add.rectangle(0, AH, W, 4, 0x3b2f20).setOrigin(0).setDepth(20);
    this.msg = this.add.text(28, AH + 24, '', { fontFamily: LB.FONT_BODY, fontSize: '25px', fontStyle: '800', color: '#2b2418', wordWrap: { width: 900 }, lineSpacing: 6 }).setDepth(21);
    this.buttons = [];

    this.foePanel = this.makePanel(28, 24, 400, false);
    this.mePanel = this.makePanel(532, 330, 400, true);

    this.input.on('pointerdown', (p, over) => { if (!over.length) LB.advance(); });
    this.input.keyboard.on('keydown', e => { if (/^[1-8]$/.test(e.key)) { const b = this.buttons[+e.key - 1]; if (b && b.input && b.input.enabled) b.emit('pointerdown'); } });
    this.run();
  }

  // ---------- UI pieces ----------
  makePanel(x, y, w, me) {
    const h = me ? 112 : 92, c = this.add.container(x, y).setDepth(15);
    const g = this.add.graphics();
    g.fillStyle(0x000000, .2).fillRoundedRect(3, 5, w, h, 12);
    g.fillStyle(0xf5efe2, .97).fillRoundedRect(0, 0, w, h, 12).lineStyle(3, 0x3b2f20).strokeRoundedRect(0, 0, w, h, 12);
    const nm = this.add.text(16, 10, '', { fontFamily: LB.FONT_TITLE, fontSize: '26px', fontStyle: '800', color: '#2b2418' });
    const lv = this.add.text(w - 16, 16, '', { fontFamily: LB.FONT_BODY, fontSize: '18px', fontStyle: '800', color: '#6b5d48' }).setOrigin(1, 0);
    const pill = this.add.graphics(), pt = this.add.text(0, 0, '', { fontFamily: LB.FONT_BODY, fontSize: '13px', fontStyle: '800', color: '#fff' }).setOrigin(.5);
    const barBg = this.add.graphics(); barBg.fillStyle(0xd8ccb2).fillRoundedRect(16, me ? 48 : 60, w - 32, 14, 7).lineStyle(1.5, 0xa89870).strokeRoundedRect(16, me ? 48 : 60, w - 32, 14, 7);
    const bar = this.add.graphics();
    const extra = this.add.text(w - 16, me ? 66 : 38, '', { fontFamily: LB.FONT_BODY, fontSize: '16px', fontStyle: '800', color: '#6b5d48' }).setOrigin(1, 0);
    const xpBg = me ? this.add.rectangle(16, 94, w - 32, 6, 0xe2d8c2).setOrigin(0) : null;
    const xp = me ? this.add.rectangle(16, 94, 0, 6, 0x4c8fb0).setOrigin(0) : null;
    c.add([g, nm, lv, pill, pt, barBg, bar, extra].concat(me ? [xpBg, xp] : []));
    const P = { c, nm, lv, pill, pt, bar, extra, xp, w, me, v: 1, barY: me ? 48 : 60 };
    P.drawBar = v => {
      P.v = v; bar.clear();
      bar.fillStyle(v > .5 ? 0x5aa340 : v > .2 ? 0xd9a634 : 0xc8452f).fillRoundedRect(17, P.barY + 1, Math.max(0, (w - 34) * v), 12, 6);
    };
    return P;
  }
  fillPanel(P, m, animate) {
    const t = LB.MON[m.sp].t, s = LB.statsOf(m);
    P.nm.setText(m.sp); P.lv.setText('Lv ' + m.lvl);
    const py = P.me ? 70 : 38;
    P.pill.clear().fillStyle(hexNum(LB.TYPE_COLOR[t])).fillRoundedRect(16, py, 86, 22, 11); P.pt.setPosition(59, py + 11).setText(t.toUpperCase());
    P.extra.setText(P.me ? `${Math.max(0, m.hp)} / ${s.hp}` : (this.d.opts.wild && LB.G.caught[m.sp] ? '🏮 befriended' : ''));
    const v = Math.max(0, m.hp) / s.hp;
    if (animate) return new Promise(r => this.tweens.addCounter({ from: P.v, to: v, duration: 450, onUpdate: tw => P.drawBar(tw.getValue()), onComplete: r }));
    P.drawBar(v);
    if (P.me) P.xp.width = (P.w - 32) * Math.min(1, m.xp / LB.need(m.lvl));
  }
  setSprite(side, m) {
    const img = side === 'me' ? this.meImg : this.foeImg;
    img.setTexture((side === 'me' ? 'b_' : 'f_') + m.sp);
    const maxH = side === 'me' ? 300 : 240, maxW = side === 'me' ? 420 : 380;
    img.baseScale = Math.min(maxH / img.height, maxW / img.width);
    img.setScale(img.baseScale).setAlpha(1).setY(side === 'me' ? 505 : 300);
  }
  refresh(animate) {
    const a = this.fillPanel(this.foePanel, this.B.foe, animate), b = this.fillPanel(this.mePanel, this.B.me, animate);
    return Promise.all([a, b]);
  }

  say(text, ms) {
    this.msg.setText(text);
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; if (LB.advanceFn === fin) LB.advanceFn = null; res(); };
      LB.advanceFn = fin;
      this.time.delayedCall(ms || Math.max(1100, text.length * 28), fin);
    });
  }
  clearMenu() { this.buttons.forEach(b => b.destroy()); this.buttons = []; this.msg.setWordWrapWidth(900); }
  menu(items) {
    this.clearMenu(); this.msg.setWordWrapWidth(460);
    return new Promise(res => {
      const bw = 206, bh = 44, x0 = 524 + bw / 2, y0 = this.AH + 18 + bh / 2;
      items.forEach((it, i) => {
        const x = x0 + (i % 2) * (bw + 12), y = y0 + Math.floor(i / 2) * (bh + 6);
        const b = LB.makeButton(this, x, y, bw, bh, it.label, () => { this.clearMenu(); res(it.val); },
          { sub: it.sub, size: 18, fill: it.fill, color: it.color, line: it.line, disabled: it.dis });
        b.setDepth(22); this.buttons.push(b);
      });
    });
  }
  tw(cfg) { return new Promise(r => this.tweens.add({ ...cfg, onComplete: r })); }

  burst(type, img, n = 16) {
    const [tex, cols] = PART[type], x = img.x, y = img.y - img.displayHeight * .5;
    const em = this.add.particles(x, y, tex, {
      speed: { min: 140, max: 330 }, angle: { min: 0, max: 360 }, lifespan: { min: 500, max: 900 },
      scale: { start: 1.15, end: .2 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 },
      gravityY: (type === 'Tide' || type === 'Stone') ? 520 : type === 'Ember' ? -260 : 0, tint: cols, emitting: false
    }).setDepth(30);
    em.explode(n);
    const ring = this.add.circle(x, y, 18).setStrokeStyle(6, cols[0]).setDepth(29);
    this.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
    this.time.delayedCall(1300, () => em.destroy());
  }

  // ---------- Battle flow ----------
  async run() {
    const G = LB.G, { foes, opts } = this.d;
    const lead = G.party.findIndex(m => m.hp > 0);
    this.B = { foes, fi: 0, foe: foes[0], me: G.party[lead], wild: !!opts.wild, coins: 0, heals: 0,
      st: { me: { atk: 0, def: 0, spd: 0 }, foe: { atk: 0, def: 0, spd: 0 } }, part: new Set([G.party[lead]]) };
    const B = this.B;
    G.seen[B.foe.sp] = 1;
    this.setSprite('foe', B.foe); this.setSprite('me', B.me); this.refresh(false);
    this.foeImg.x = 1100; this.meImg.x = -200;
    this.tweens.add({ targets: this.foeImg, x: 720, duration: 500, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this.meImg, x: 250, duration: 500, ease: 'Cubic.easeOut' });
    await this.say(B.wild ? `A wild ${B.foe.sp} appeared!` : `${opts.trainer} wants to battle!`);
    if (!B.wild) await this.say(`${opts.trainer} sends out ${B.foe.sp}!`);
    await this.say(`Go, ${B.me.sp}!`, 900);
    let result = null;
    while (!result) result = await this.turn(await this.chooseAction());
    if (result === 'win' && B.coins) { G.coins += B.coins; LB.SFX.coin(); await this.say(`You earned ${B.coins} coins.`, 1000); }
    this.cameras.main.fadeOut(250); await LB.wait(260);
    this.scene.stop();
    this.d.done(result);
  }

  async chooseAction() {
    const G = LB.G, B = this.B;
    while (true) {
      this.msg.setText(`What will ${B.me.sp} do?`);
      const c = await this.menu([
        { label: 'Fight', val: 'fight' },
        { label: 'Lantern', sub: `${LB.lanternTotal()} left`, val: 'lantern', dis: !B.wild || LB.lanternTotal() <= 0 },
        { label: 'Salve', sub: `${G.items.salve} left`, val: 'salve', dis: G.items.salve <= 0 },
        { label: 'Party', val: 'party' },
        { label: 'Run', val: 'run', dis: !B.wild }
      ]);
      if (c === 'fight') {
        const ft = LB.MON[B.foe.sp].t;
        const mv = await this.menu([...LB.MON[B.me.sp].m.map(k => {
          const M = LB.MOVES[k], e = M.p ? LB.eff(M.t, ft) : 1;
          const tag = M.p ? (e > 1 ? 'super!' : e < 1 ? 'weak' : `pow ${M.p}`) : (M.heal ? 'heal' : 'boost');
          return { label: M.n, sub: `${M.t} · ${tag}`, val: k, fill: hexNum(LB.TYPE_COLOR[M.t]), color: '#ffffff', line: 0x2b2418 };
        }), { label: 'Back', val: null }]);
        if (mv) return { k: 'move', mv };
      } else if (c === 'lantern') {
        const ft = LB.MON[B.foe.sp].t;
        const k = await this.menu([...Object.keys(LB.LANTERNS).filter(k => G.items[k] > 0).map(k => {
          const L = LB.LANTERNS[k];
          return { label: L.n.replace(' Lantern', ''), sub: `×${G.items[k]}${k === 'warden' ? ' · sure' : L.bonus(ft) > 1 ? ' · bonus!' : ''}`, val: k, line: hexNum(L.col) };
        }), { label: 'Back', val: null }]);
        if (k) return { k: 'lantern', kind: k };
      } else if (c === 'party') {
        this.msg.setText('Choose a companion…');
        const i = await LB.partySheet('battle', B.me); if (i != null) return { k: 'switch', i };
      } else return { k: c };
    }
  }

  stage(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }
  eStat(m, side, k) { return LB.statsOf(m)[k] * this.stage(this.B.st[side][k]); }

  foeMove() {
    const B = this.B; let best = null, bs = -1;
    for (const k of LB.MON[B.foe.sp].m) {
      const M = LB.MOVES[k]; let s;
      if (M.p) s = M.p * LB.eff(M.t, LB.MON[B.me.sp].t) * (M.t === LB.MON[B.foe.sp].t ? 1.5 : 1) * (M.a / 100);
      else if (M.heal) s = (B.heals < 2 && B.foe.hp < LB.statsOf(B.foe).hp * .45) ? 90 : 0;
      else { const [who, k2] = M.st; s = Math.abs(B.st[who === 'self' ? 'foe' : 'me'][k2]) >= 2 ? 0 : 35; }
      s *= .7 + Math.random() * .6;
      if (s > bs) { bs = s; best = k; }
    }
    return best;
  }

  async useMove(side, key) {
    const B = this.B, A = side === 'me' ? B.me : B.foe, D = side === 'me' ? B.foe : B.me, od = side === 'me' ? 'foe' : 'me';
    const M = LB.MOVES[key], aImg = side === 'me' ? this.meImg : this.foeImg, dImg = side === 'me' ? this.foeImg : this.meImg;
    await this.say(`${side === 'foe' ? (B.wild ? 'Wild ' : 'Foe ') : ''}${A.sp} used ${M.n}!`, 900);
    await this.tw({ targets: aImg, x: aImg.x + (side === 'me' ? 40 : -40), y: aImg.y + (side === 'me' ? -16 : 12), duration: 110, yoyo: true });
    if (M.heal) {
      if (side === 'foe') B.heals++;
      LB.SFX.heal(); this.burst(M.t, aImg, 12);
      const mx = LB.statsOf(A).hp; A.hp = Math.min(mx, A.hp + Math.max(1, Math.floor(mx * M.heal)));
      await this.refresh(true); await this.say(`${A.sp} recovered some strength.`, 900); return false;
    }
    if (M.st && !M.p) {
      const [who, k, v] = M.st, s = who === 'self' ? side : od, T = who === 'self' ? A : D;
      const nv = Math.max(-4, Math.min(4, B.st[s][k] + v));
      if (nv === B.st[s][k]) { await this.say('Nothing happened…', 800); return false; }
      B.st[s][k] = nv; LB.SFX.stat(); this.burst(M.t, who === 'self' ? aImg : dImg, 10);
      await this.say(`${T.sp}'s ${{ atk: 'attack', def: 'defense', spd: 'speed' }[k]} ${v > 0 ? (v > 1 ? 'rose sharply' : 'rose') : 'fell'}!`, 900);
      return false;
    }
    if (Math.random() * 100 > M.a) { await this.say(`${A.sp}'s attack missed!`, 900); return false; }
    const e = LB.eff(M.t, LB.MON[D.sp].t), stab = M.t === LB.MON[A.sp].t ? 1.5 : 1, crit = Math.random() < .0625 ? 1.5 : 1;
    const dmg = Math.max(1, Math.floor((((2 * A.lvl / 5 + 2) * M.p * this.eStat(A, side, 'atk') / this.eStat(D, od, 'def')) / 50 + 2) * stab * e * crit * (.85 + Math.random() * .15)));
    D.hp = Math.max(0, D.hp - dmg);
    this.burst(M.t, dImg, e > 1 ? 24 : 15); (e > 1 ? LB.SFX.super : e < 1 ? LB.SFX.weak : LB.SFX.hit)();
    this.tweens.add({ targets: dImg, alpha: .25, duration: 70, yoyo: true, repeat: 2 });
    if (side === 'foe') this.cameras.main.shake(220, .008);
    await this.refresh(true);
    if (crit > 1) await this.say('A critical hit!', 800);
    if (e > 1) await this.say("It's super effective!", 900); else if (e < 1) await this.say("It's not very effective…", 900);
    if (M.sec && D.hp > 0 && Math.random() < .5) { const [, k, v] = M.sec; B.st[od][k] = Math.max(-4, B.st[od][k] + v); await this.say(`${D.sp}'s speed fell!`, 800); }
    return D.hp <= 0;
  }

  async faintFoe() {
    const B = this.B, G = LB.G, opts = this.d.opts;
    LB.SFX.faint(); this.tweens.add({ targets: this.foeImg, y: this.foeImg.y + 40, alpha: 0, duration: 400 });
    await this.say(`${B.wild ? 'The wild ' : ''}${B.foe.sp} is worn out!`, 1000);
    B.coins += B.wild ? B.foe.lvl * 4 : B.foe.lvl * 10;
    const gain = Math.floor((B.foe.lvl * 10 + 8) * (B.wild ? 1 : 1.5));
    for (const m of G.party) { if (m.hp <= 0) continue; await this.giveXp(m, B.part.has(m) ? gain : Math.floor(gain / 2), m === B.me); }
    B.fi++;
    if (B.fi < B.foes.length) {
      B.foe = B.foes[B.fi]; G.seen[B.foe.sp] = 1; B.st.foe = { atk: 0, def: 0, spd: 0 }; B.heals = 0;
      await this.say(`${opts.trainer} sends out ${B.foe.sp}!`);
      this.setSprite('foe', B.foe); this.foePanel.v = 1; this.refresh(false); return null;
    }
    if (!B.wild) { LB.SFX.win(); await this.say(`You defeated ${opts.trainer}!`, 1200); }
    return 'win';
  }
  async giveXp(m, g, show) {
    m.xp += g;
    if (show) { this.refresh(false); await this.say(`${m.sp} gained ${g} experience.`, 900); }
    while (m.xp >= LB.need(m.lvl)) {
      m.xp -= LB.need(m.lvl); const before = LB.statsOf(m).hp; m.lvl++; m.hp += LB.statsOf(m).hp - before;
      LB.SFX.lvl(); if (m === this.B.me) { this.mePanel.v = Math.max(0, m.hp) / LB.statsOf(m).hp; this.burst('Glimmer', this.meImg, 12); }
      this.refresh(false); await this.say(`${m.sp} grew to level ${m.lvl}!`, 1100);
    }
  }
  async sendOut(i) {
    const B = this.B; B.me = LB.G.party[i]; B.part.add(B.me); B.st.me = { atk: 0, def: 0, spd: 0 };
    this.setSprite('me', B.me); this.mePanel.v = Math.max(0, B.me.hp) / LB.statsOf(B.me).hp; this.refresh(false);
    this.meImg.x = -200; this.tweens.add({ targets: this.meImg, x: 250, duration: 350, ease: 'Cubic.easeOut' });
    await this.say(`Go, ${B.me.sp}!`, 900);
  }
  async faintMe() {
    const B = this.B;
    LB.SFX.faint(); this.tweens.add({ targets: this.meImg, y: this.meImg.y + 40, alpha: 0, duration: 400 });
    await this.say(`${B.me.sp} is too tired to continue!`, 1000);
    if (LB.G.party.some(m => m.hp > 0)) {
      let i = null; while (i == null) i = await LB.partySheet('forced', B.me);
      await this.sendOut(i); return null;
    }
    await this.say('You have no companions left who can battle…', 1200);
    return 'lose';
  }

  async turn(act) {
    const B = this.B, G = LB.G, foeK = this.foeMove();
    if (act.k === 'run') {
      if (Math.random() < .5 + .5 * LB.statsOf(B.me).spd / (LB.statsOf(B.foe).spd + 1)) { await this.say('You got away safely!', 900); return 'run'; }
      await this.say("Couldn't get away!", 900);
    } else if (act.k === 'salve') {
      G.items.salve--; LB.SFX.heal(); this.burst('Grove', this.meImg, 10);
      const mx = LB.statsOf(B.me).hp; B.me.hp = Math.min(mx, B.me.hp + 20 + Math.floor(mx * .25));
      await this.refresh(true); await this.say(`You used a salve. ${B.me.sp} feels better.`, 1000);
    } else if (act.k === 'switch') {
      await this.say(`Come back, ${B.me.sp}!`, 700); await this.sendOut(act.i);
    } else if (act.k === 'lantern') {
      if (await this.throwLantern(act.kind)) return 'caught';
    } else if (act.k === 'move') {
      const pm = LB.MOVES[act.mv].pri || 0, pf = LB.MOVES[foeK].pri || 0;
      const meFirst = pm !== pf ? pm > pf : this.eStat(B.me, 'me', 'spd') >= this.eStat(B.foe, 'foe', 'spd') * (.95 + Math.random() * .1);
      for (const s of meFirst ? ['me', 'foe'] : ['foe', 'me']) {
        if (await this.useMove(s, s === 'me' ? act.mv : foeK)) return s === 'me' ? await this.faintFoe() : await this.faintMe();
      }
      return null;
    }
    if (await this.useMove('foe', foeK)) return await this.faintMe();
    return null;
  }

  async throwLantern(kind) {
    const B = this.B, G = LB.G, L = LB.LANTERNS[kind], col = hexNum(L.col), foe = this.foeImg;
    G.items[kind]--; LB.SFX.throw();
    await this.say(`You hold out a ${L.n}…`, 700);
    const glow = this.add.image(0, 0, 'glow').setTint(col).setScale(.6).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const lan = this.add.container(150, 560, [glow, this.add.image(0, 0, 'lantern_frame'), this.add.image(0, 0, 'lantern_gem').setTint(col)]).setDepth(25).setScale(1.3);
    const tx = foe.x, ty = foe.y - foe.displayHeight * .5;
    await new Promise(r => this.tweens.addCounter({ from: 0, to: 1, duration: 600, onUpdate: t => { const v = t.getValue(); lan.x = 150 + (tx - 150) * v; lan.y = 560 + (ty - 560) * v - Math.sin(v * Math.PI) * 200; lan.angle = v * 360; }, onComplete: r }));
    this.cameras.main.flash(220, 200, 245, 255);
    glow.setAlpha(.9);
    await this.tw({ targets: foe, scale: foe.baseScale * .05, alpha: 0, duration: 260 });
    await this.tw({ targets: lan, y: foe.y - 40, angle: 0, duration: 420, ease: 'Bounce.easeOut' });
    const mx = LB.statsOf(B.foe).hp;
    const p = Math.max(.06, (1 - (2 / 3) * B.foe.hp / mx) * LB.MON[B.foe.sp].cr * L.bonus(LB.MON[B.foe.sp].t) * (B.foe.lvl <= G.party[0].lvl + 2 ? 1 : .8));
    const shakeP = kind === 'warden' ? 1 : Math.pow(Math.min(1, p), 1 / 3);
    let ok = true;
    for (let i = 0; i < 3; i++) {
      LB.SFX.shake();
      await this.tw({ targets: lan, angle: { from: -20, to: 20 }, duration: 160, yoyo: true });
      lan.angle = 0; await LB.wait(380);
      if (Math.random() > shakeP) { ok = false; break; }
    }
    if (ok) {
      LB.SFX.caught(); this.burst('Glimmer', lan.list[1], 22);
      this.tweens.add({ targets: glow, scale: 1.4, alpha: 1, duration: 400, yoyo: true, repeat: 1 });
      await this.say(`${B.foe.sp} trusts you! It joined you in the lantern.`, 1500);
      const first = !G.caught[B.foe.sp]; G.caught[B.foe.sp] = 1;
      const m = B.foe; m.xp = 0;
      if (G.party.length < 6) G.party.push(m);
      else { G.box.push(m); await this.say(`Your party is full, so ${m.sp} went to rest at the shrine.`, 1300); }
      if (first) await this.say(`${m.sp} has been added to your journal.`, 1000);
      return true;
    }
    LB.SFX.escape(); lan.destroy();
    this.cameras.main.flash(150, 255, 255, 255);
    await this.tw({ targets: foe, scale: foe.baseScale, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    await this.say(['It slipped out of the lantern!', "Almost! It isn't ready yet.", 'It shook free!'][LB.rnd(0, 2)], 1000);
    return false;
  }
}
