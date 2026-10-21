// ============================================================
// Lanternbound 3D — companion bond.
//  • every companion has a bond (0–100) that grows by walking together,
//    fighting side by side (duos, perfect dodges), and being petted (F / A next to it)
//  • 25 Friend (+5% damage), 50 Close friend (+10%), 100 Awakened:
//    golden aura, +20% damage, and the special move becomes BOND BURST
//  • emotes: ! when it spots a foe, 💦 when hurt, ♪ when happy, zzz when you idle, ❤ when petted
//  • when you stand still it plays around you instead of just waiting
// ============================================================
import * as THREE from 'three';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const TIERS = [[25, 'Friend'], [50, 'Close friend'], [100, 'Awakened']];

export class Bond {
  constructor(g) {
    this.g = g; this.walkT = 0; this.idleT = 0; this.burstCd = 0; LB.bond = this;
    const st = document.createElement('style');
    st.textContent = `#hud3d .lead .bondv{position:absolute;right:10px;bottom:-11px;background:#f5efe2;border:2px solid #3b2f20;border-radius:99px;padding:0 8px;font:900 11px/16px Nunito,Cairo,sans-serif;color:#c8452f}
#hud3d .lead .bondv.aw{color:#b8692e;box-shadow:0 0 0 2px #ffd23f}`;
    document.head.appendChild(st);
  }
  value(m) { return Math.round(m && m.bond || 0); }
  awakened(m) { return !!m && (m.bond || 0) >= 100; }
  tierName(m) { const v = this.value(m); let n = ''; TIERS.forEach(([t, k]) => { if (v >= t) n = k; }); return n; }
  damageMult(m) { const v = this.value(m); return 1 + (v >= 25 ? .05 : 0) + (v >= 50 ? .05 : 0) + (v >= 100 ? .1 : 0); }
  gain(m, n) {
    if (!m) return;
    const before = m.bond || 0; m.bond = Math.min(100, before + n);
    TIERS.forEach(([t, k]) => {
      if (before < t && m.bond >= t) {
        const a = this.g.ally && this.g.ally.m === m ? this.g.ally : null;
        LB.SFX.quest(); LB.toast(LB.t('{c} is now your {t}!', { c: m.sp, t: LB.t(k) }));
        if (a) { this.g.fx.emote(a, t >= 100 ? '★' : '❤', 2.2); this.g.fx.ring(a.pos, '#ffd23f', .3, 4, .6); this.g.fx.burst('Glimmer', new V3(a.x, a.h, a.z), 26, 1.2); }
        if (t >= 100) setTimeout(() => LB.toast(LB.t('Its special move is now BOND BURST')), 1800);
      }
    });
    LB.quests && LB.quests.emit('bond', { value: m.bond });
  }
  // something F can be used on: your companion
  interactables() {
    const a = this.g.ally; if (!a || this.idleT < 1.2 || a.state === 'lunge' || this.g.enemies().some(u => dist(u.pos, this.g.player.pos) < 8)) return [];
    return [{ x: a.x, z: a.z, r: 1.6, label: 'Pet', prio: -1, use: () => this.pet() }];
  }
  pet() {
    const g = this.g, a = g.ally; if (!a) return;
    a.lift = .35; setTimeout(() => { if (a) a.lift = 0; }, 260);
    g.fx.emote(a, '❤', 1.6); g.fx.burst('Glimmer', new V3(a.x, a.h * .8, a.z), 10, .5); LB.SFX.pet();
    const m = a.m; m.petAt = m.petAt || 0;
    if (g.t - m.petAt > 20 || m.petAt > g.t) { m.petAt = g.t; this.gain(m, 3); g.fx.text(new V3(a.x, a.h + 1.2, a.z), '❤ ' + this.value(m), '#ff8aa0', 16); }
    LB.quests && LB.quests.emit('pet', { sp: m.sp, mine: true });
  }
  onCapture(m) { m.bond = Math.max(m.bond || 0, 10); }
  onKnockOut(u) { const a = this.g.ally; if (a && u.lastHit) this.gain(a.m, .8); }
  // special move replacement once awakened
  tryBurst() {
    const g = this.g, a = g.ally; if (!a || !this.awakened(a.m) || this.burstCd > 0) return false;
    this.burstCd = 18; g.spcCd = 4;
    LB.SFX.burst(); g.fx.shake(.7, .45); g.hitStop = .12; g.slowT = .6;
    g.fx.text(new V3(a.x, a.h + 1.4, a.z), LB.t('BOND BURST!'), '#ffd23f', 30);
    g.fx.ring(a.pos, '#ffd23f', .4, 7, .7); g.fx.ring(g.player.pos, '#9feaf2', .4, 5, .6); g.fx.burst(a.t, new V3(a.x, 1, a.z), 50, 2); g.fx.burst('Glimmer', new V3(a.x, 1.5, a.z), 30, 1.6);
    const k = LB.specialMove(a.m.sp);
    g.enemies().forEach(u => { if (dist(u.pos, a.pos) < 7) g.hitBy(u, a, k, 2.2); });
    return true;
  }
  update(dt) {
    const g = this.g, P = g.player, a = g.ally; if (!P) return;
    this.burstCd -= dt;
    const moving = P.vel.length() > 1.5;
    this.idleT = moving || g.fight ? 0 : this.idleT + dt;
    if (!a) return;
    const m = a.m, foes = g.enemies().filter(u => dist(u.pos, a.pos) < 8);
    // walking together slowly builds the bond
    if (moving) { this.walkT += dt; if (this.walkT > 20) { this.walkT = 0; this.gain(m, 1); } }
    // emotes
    if (foes.length && !this.sawFoe) { this.sawFoe = true; g.fx.emote(a, '!', 1); }
    if (!foes.length) this.sawFoe = false;
    if (m.hpA < LB.unitMaxHp(m) * .25 && (this.hurtT = (this.hurtT || 0) - dt) <= 0) { this.hurtT = 6; g.fx.emote(a, '💦', 1.4); }
    if (this.idleT > 15 && (this.zT = (this.zT || 0) - dt) <= 0) { this.zT = 3; g.fx.emote(a, 'zzz', 2); }
    else if (this.idleT > 5 && this.value(m) >= 30 && Math.random() < dt * .2) g.fx.emote(a, '♪', 1.2);
    // play around you while you stand still
    if (this.idleT > 4 && !foes.length && a.state !== 'lunge') {
      if (!a.playTarget || (this.playT = (this.playT || 0) - dt) <= 0) { this.playT = rand(1.6, 3); const ang = rand(0, 6.28), r = rand(1.2, 2.6); a.playTarget = { x: P.x + Math.cos(ang) * r, z: P.z + Math.sin(ang) * r }; if (Math.random() < .3) { a.lift = .3; setTimeout(() => a.lift = 0, 200); } }
    } else a.playTarget = null;
    // awakened aura
    const aw = this.awakened(m);
    if (aw && !a.auraB) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.7, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .07; ring.scale.setScalar(a.r * 1.8); a.obj.add(ring); a.auraB = ring; a.rim = .8;
    }
    if (a.auraB) { a.auraB.rotation.z -= dt * 1.5; a.auraB.material.opacity = .4 + Math.sin(g.t * 4) * .2; if (Math.random() < dt * 3) g.fx.burst('Glimmer', new V3(a.x + rand(-.5, .5), rand(.3, a.h), a.z + rand(-.5, .5)), 1, .3); }
    // HUD: bond value on the lead card
    const lead = document.querySelector('#hud3d .lead');
    if (lead) {
      let b = lead.querySelector('.bondv'); if (!b) { b = document.createElement('span'); b.className = 'bondv'; lead.appendChild(b); }
      const txt = (aw ? '★ ' : '❤ ') + this.value(m); if (b.textContent !== txt) { b.textContent = txt; b.classList.toggle('aw', aw); b.title = LB.t(this.tierName(m) || 'Bond'); }
    }
  }
}
