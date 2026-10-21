// ============================================================
// Lanternbound 3D — deeper combat.
//  • Perfect dodge: roll just as a hit lands → slow motion + your next hit is critical
//  • Type reactions: hit a foe with one type, then another type within 4 s
//    (Tide + Ember = Steam, Ember + Grove = Blaze, Tide + Gale = Storm, Stone + Tide = Mud, Glimmer + any = Prism…)
//  • Duo: you and your companion hit the same foe within a moment → bonus damage
//  • Sneak attack on sleeping companions
//  • Elite wild companions: bigger, golden aura, more health, faster attacks, better rewards
// ============================================================
import * as THREE from 'three';

const V3 = THREE.Vector3;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const TYPE_COL = { Grove: '#7fbf4a', Tide: '#4aa8e0', Ember: '#ff8a3c', Gale: '#dfe6ff', Stone: '#b9a88c', Glimmer: '#e4b8ff', Plain: '#ffffff' };

// reaction for a pair of types (order does not matter)
function reactionOf(a, b) {
  if (a === b || a === 'Plain' || b === 'Plain') return null;
  if (a === 'Glimmer' || b === 'Glimmer') return 'Prism';
  const k = [a, b].sort().join('+');
  return ({ 'Ember+Tide': 'Steam', 'Ember+Grove': 'Blaze', 'Ember+Gale': 'Firestorm', 'Stone+Tide': 'Mud', 'Grove+Stone': 'Mud',
    'Gale+Tide': 'Storm', 'Gale+Stone': 'Sandstorm', 'Grove+Tide': 'Bloom', 'Ember+Stone': 'Magma', 'Gale+Grove': 'Pollen' })[k] || null;
}

export class Combat {
  constructor(g) { this.g = g; this.critNext = false; }

  // ---------- elites ----------
  onSpawn(u, Z) {
    if (u.kind !== 'wild' || u.alpha || u.spar || u.m.shiny) return;
    const lvMin = Z ? Z.lv[0] : 10;
    if (lvMin < 7 || Math.random() > .1) return;
    u.elite = true; u.timid = false;
    u.h *= 1.3; u.r *= 1.2; u.applyTexture(u.mat.map);
    u.maxHp = Math.round(LB.unitMaxHp(u.m) * 2.5); u.m.hpA = u.maxHp; u.rim = .95;
    const ring = new THREE.Mesh(new THREE.RingGeometry(.75, 1, 36), new THREE.MeshBasicMaterial({ color: '#ffb030', transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .06; ring.scale.setScalar(u.r * 1.6); u.obj.add(ring); u.aura = ring;
    if (u.label) { u.label.classList.add('boss'); u.label.querySelector('.lv').textContent = LB.t('ELITE') + ' ' + LB.t('Lv') + u.m.lvl; }
    this.g.fx.emote(u, '⚔', 1.8);
  }

  // ---------- status effects; returns true when the foe cannot act this frame ----------
  enemyStatus(u, dt) {
    const g = this.g;
    if (u.aura) { u.aura.material.opacity = .45 + Math.sin(g.t * 5) * .25; u.aura.rotation.z += dt; }
    if (u.mark && g.t - u.mark.at < 4 && (u.markT = (u.markT || 0) - dt) <= 0) { u.markT = .3; g.fx.glowAt(new V3(u.x, u.h + .35, u.z), TYPE_COL[u.mark.t], .55, .3); }
    u.speedMul = u.slowT > 0 ? .45 : 1;
    if (u.slowT > 0) { u.slowT -= dt; if (Math.random() < dt * 4) g.fx.dust(u.pos, 1); }
    if (u.burn) {
      u.burn.t -= dt; u.burn.tick -= dt;
      if (Math.random() < dt * 8) g.fx.burst('Ember', new V3(u.x, u.h * .6, u.z), 1, .4);
      if (u.burn.tick <= 0) { u.burn.tick = 1; this.g.damage(u, u.burn.src, { dmg: u.burn.dmg, e: 1, t: 'Ember', dot: true }, 0); }
      if (u.burn && u.burn.t <= 0) u.burn = null;
    }
    if (u.stunT > 0) {
      u.stunT -= dt; u.vel.set(0, 0); u.pivot.rotation.z = Math.sin(g.t * 9) * .12;
      if ((u.starT = (u.starT || 0) - dt) <= 0) { u.starT = .3; g.fx.burst('Gale', new V3(u.x, u.h + .2, u.z), 2, .3); }
      if (u.stunT <= 0) u.pivot.rotation.z = 0;
      return true;
    }
    return false;
  }

  // ---------- damage modifiers ----------
  beforeDamage(u, attacker, r) {
    const g = this.g; if (!u || !r || r.dot) return r;
    const enemy = u.kind === 'wild' || u.kind === 'boss';
    if (!enemy) return r;
    const who = attacker === g.player ? 'player' : attacker === g.ally ? 'ally' : null;
    if (!who) return r;
    let mult = 1, notes = [];
    if (who === 'ally' && LB.bond) mult *= LB.bond.damageMult(attacker.m);
    if (who === 'player' && this.critNext) { this.critNext = false; mult *= 1.8; r.crit = true; }
    if (u.state === 'sleep') { mult *= 2; notes.push([LB.t('Sneak attack!'), '#9feaf2']); }
    // duo: the other one hit this foe a moment ago
    const now = g.t, last = u.lastHit;
    if (last && last.who !== who && now - last.at < 1.2) {
      mult *= 1.25; notes.push([LB.t('Duo!'), '#ffd23f']);
      if (g.ally && LB.bond) LB.bond.gain(g.ally.m, .6);
      LB.quests && LB.quests.emit('duo', {});
    }
    u.lastHit = { who, at: now };
    // type reactions
    const t = r.t || 'Plain';
    if (t !== 'Plain') {
      const m = u.mark;
      if (m && m.t !== t && now - m.at < 4) { const re = reactionOf(m.t, t); if (re) { u.mark = null; mult *= this.react(re, u, attacker, r) || 1; } else u.mark = { t, at: now }; }
      else u.mark = { t, at: now };
    }
    r.dmg = Math.max(1, Math.round(r.dmg * mult));
    notes.forEach(([txt, c], i) => g.fx.text(new V3(u.x, u.h + 1.25 + i * .45, u.z), txt, c, 16));
    return r;
  }
  react(name, u, attacker, r) {
    const g = this.g, p = new V3(u.x, u.h * .6, u.z);
    LB.SFX.react(); g.fx.shake(.25, .2); g.hitStop = .08;
    g.fx.text(new V3(u.x, u.h + 1.9, u.z), LB.t(name) + '!', '#ffffff', 26);
    LB.quests && LB.quests.emit('reaction', { name });
    const others = g.enemies().filter(o => o !== u && dist(o.pos, u.pos) < 3.6);
    const splash = mult => others.forEach(o => g.damage(o, attacker, { dmg: Math.max(1, Math.round(r.dmg * mult)), e: 1, t: r.t, dot: true }, 4));
    switch (name) {
      case 'Steam': g.fx.burst('Plain', p, 30, 1.4); g.fx.ring(u.pos, '#e8f4ff', .4, 4.2, .5); splash(.6); u.stunT = .7; return 1.3;
      case 'Blaze': case 'Magma': g.fx.burst('Ember', p, 26, 1.3); u.burn = { t: 4, tick: 1, dmg: Math.max(1, Math.round(r.dmg * .3)), src: attacker }; return name === 'Magma' ? 1.35 : 1.1;
      case 'Firestorm': g.fx.burst('Ember', p, 34, 1.6); g.fx.ring(u.pos, '#ff8a3c', .4, 4.5, .5); splash(.5); u.burn = { t: 3, tick: 1, dmg: Math.max(1, Math.round(r.dmg * .25)), src: attacker }; return 1.15;
      case 'Mud': case 'Sandstorm': g.fx.burst('Stone', p, 24, 1.1); u.slowT = 4; others.forEach(o => o.slowT = 2.5); if (name === 'Sandstorm') splash(.35); return 1.1;
      case 'Storm': g.fx.burst('Gale', p, 30, 1.5); g.fx.glowAt(new V3(u.x, 3, u.z), '#ffffff', 5, .25); u.stunT = 1.6; LB.SFX.zap(); return 1.2;
      case 'Pollen': g.fx.burst('Grove', p, 26, 1.2); u.stunT = 1; others.forEach(o => o.stunT = .6); return 1.1;
      case 'Bloom': {
        g.fx.burst('Grove', g.player.pos.clone().setY(1), 20, 1);
        if (g.ally) { const m = g.ally.m, mx = LB.unitMaxHp(m); m.hpA = Math.min(mx, m.hpA + Math.round(mx * .18)); g.fx.text(new V3(g.ally.x, g.ally.h + .8, g.ally.z), '+' + Math.round(mx * .18), '#9fe86a', 18); }
        return 1.1;
      }
      case 'Prism': g.fx.burst('Glimmer', p, 34, 1.5); g.fx.ring(u.pos, '#e4b8ff', .3, 3.4, .4); return 1.7;
    }
    return 1;
  }

  // ---------- perfect dodge: called when something would hit you ----------
  dodgeCheck(attacker) {
    const g = this.g, P = g.player;
    const rolling = g.rollT > 0 || (g.t - (g.rollAt || -9)) < .35;
    if (!rolling || P.iframes <= 0 || (g.t - (this.perfectAt || -9)) < 1.5) return false;
    this.perfectAt = g.t; this.critNext = true; g.slowT = 1.1;
    LB.SFX.perfect(); g.fx.ring(P.pos, '#9feaf2', .3, 3.4, .45); g.fx.burst('Glimmer', P.pos.clone().setY(1), 18, 1.1);
    g.fx.text(new V3(P.x, 2.6, P.z), LB.t('Perfect dodge!'), '#9feaf2', 22);
    g.fx.text(new V3(P.x, 3.1, P.z), LB.t('Next hit is critical'), '#ffd23f', 14);
    LB.quests && LB.quests.emit('perfect', {});
    if (g.ally && LB.bond) LB.bond.gain(g.ally.m, .5);
    return true;
  }

  onKnockOut(u) {
    const g = this.g, G = LB.G;
    if (u.elite) {
      const bonus = u.m.lvl * 8; G.coins += bonus;
      const drop = ['salve', 'lantern', 'moss', 'tide', 'ember', 'sky', 'dusk'][Math.floor(rand(0, 7))]; G.items[drop] = (G.items[drop] || 0) + 1;
      g.fx.text(new V3(u.x, u.h + 2.2, u.z), LB.t('Elite reward: +{n} coins, {i}', { n: bonus, i: LB.t(drop === 'salve' ? 'Salve' : LB.LANTERNS[drop].n) }), '#ffd23f', 16);
      LB.SFX.chest();
    }
    LB.quests && LB.quests.emit('defeat', { sp: u.m.sp, type: u.t, elite: !!u.elite, kind: u.kind });
  }
}
