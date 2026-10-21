// ============================================================
// Lanternbound 3D — a living world.
//  • day and night in Hollow Valley (sun, sky, fog, stars, lamps glow at night)
//  • weather: clear, rain (with thunder at night), wind
//  • birds that peck and fly off, butterflies by day, fish jumping, lava bubbles
//  • village pets and villagers who stroll around
//  • wild companions with moods: sleeping at night, noticing you (!),
//    timid ones running away, grazing, herds, rare shiny ones (★)
// ============================================================
import * as THREE from 'three';
import { S, charAt, tileCenter, liquidAt } from './world.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const DAY_SECONDS = 600;                       // a full day lasts 10 minutes
export const SHINY_TINT = { Grove: '#ffe08a', Tide: '#ffc2e6', Ember: '#b8ccff', Gale: '#ffd0a0', Stone: '#b8f0ff', Glimmer: '#c8ffb0', Plain: '#ffe08a' };
const NIGHT_SPECIES = ['Saffrill', 'Glimmerell', 'Opaloom'];

export class Life {
  constructor(g) {
    this.g = g; this.critters = []; this.pets = []; this.fishT = 2; this.weather = 'clear'; this.weatherT = 60; this.rainK = 0; this.windK = 1;
    this.phase = ''; this.flash = 0;
    this.clock = document.createElement('div'); this.clock.id = 'lb-clock';
    const st = document.createElement('style'); st.textContent = `#lb-clock{position:absolute;left:176px;top:10px;background:rgba(245,239,226,.92);border:2px solid #3b2f20;border-radius:99px;padding:2px 10px;font:900 13px/20px Nunito,Cairo,sans-serif;color:#2b2418;display:flex;gap:6px;align-items:center}
#lb-clock b{font-size:15px}
html body.dev-phone #lb-clock{left:12px;top:auto;bottom:200px}
html body.dev-phone.portrait #lb-clock{bottom:auto;top:262px}`;
    document.head.appendChild(st);
  }
  get time() { return LB.G ? (LB.G.time ?? .3) : .3; }
  set time(v) { if (LB.G) LB.G.time = v; }
  cycles() { return LB.STAGE === 'valley'; }   // only the valley has a sky
  dayK() { if (!this.cycles()) return LB.STAGE === 'lake' ? 0 : 1; const e = Math.sin((this.time - .25) * Math.PI * 2); return smooth(-.12, .28, e); }
  isNight() { return this.dayK() < .35; }

  // ---------- stage set-up ----------
  onStage() {
    this.critters.forEach(c => this.g.scene.remove(c.obj)); this.critters = [];
    this.pets.forEach(p => p.destroy()); this.pets = [];
    this.stars = null; this.rain = null;
    const W = this.g.world;
    this.base = { sun: W.sun.intensity, sunCol: W.sun.color.clone(), hemi: W.hemi.intensity, hemiCol: W.hemi.color.clone(), bg: this.g.scene.background.clone(), fog: this.g.scene.fog.color.clone(), fogNear: this.g.scene.fog.near, fogFar: this.g.scene.fog.far };
    if (this.cycles()) {
      // stars appear at night
      const sp = []; for (let i = 0; i < 600; i++) { const a = rand(0, 6.28), e = rand(.1, 1.4); sp.push(Math.cos(a) * Math.cos(e) * 170, Math.sin(e) * 170, Math.sin(a) * Math.cos(e) * 170); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#e8eeff', size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0 }));
      W.sky.add(this.stars);
      this.spawnPets();
    }
    if (this.cycles() || LB.STAGE === 'lake') {
      const N = 900, pos = new Float32Array(N * 6);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#b8c8e0', transparent: true, opacity: 0, depthWrite: false }));
      this.rain.frustumCulled = false; this.rainDrops = []; for (let i = 0; i < N; i++) this.rainDrops.push({ x: rand(-16, 16), y: rand(0, 18), z: rand(-16, 16), v: rand(16, 22) });
      W.add(this.rain);
    } else { this.weather = 'clear'; this.rainK = 0; }
    LB.audio.rain && LB.audio.rain(0);
    this.updateClock(true);
  }
  spawnPets() {
    // friendly companions living in the village (they are nobody's, you can pet them)
    [['Drapplet', 5, 17], ['Loomtail', 10, 19]].forEach(([sp, x, y]) => {
      const c = tileCenter(x, y), m = LB.mk(sp, 3);
      const a = new this.g.Actor(this.g, { kind: 'pet', m, x: c.x, z: c.z, scale: .85 });
      a.home = { x: c.x, z: c.z }; a.wanderT = 0; this.pets.push(a);
    });
  }

  // ---------- every frame (also on the title screen) ----------
  frame(dt) {
    const G = LB.G, W = this.g.world; if (!W || !this.base) return;
    if (G && this.cycles() && (LB.mode === 'world' || LB.mode === 'capture')) this.time = (this.time + dt / DAY_SECONDS) % 1;
    // weather
    if (LB.mode === 'world' && (this.cycles() || LB.STAGE === 'lake')) {
      this.weatherT -= dt;
      if (this.weatherT <= 0) {
        const r = Math.random(); this.weather = r < .55 ? 'clear' : r < .82 ? 'rain' : 'wind'; this.weatherT = rand(80, 170);
        if (this.weather === 'rain') LB.toast(LB.t('It starts to rain…')); else if (this.weather === 'wind') LB.toast(LB.t('The wind picks up'));
      }
    }
    this.rainK += ((this.weather === 'rain' ? 1 : 0) - this.rainK) * Math.min(1, dt * .4);
    this.windK += ((this.weather === 'wind' ? 2.3 : this.weather === 'rain' ? 1.6 : 1) - this.windK) * Math.min(1, dt * .5);
    W.uniforms.uWind.value = this.windK;
    LB.audio.rain && LB.audio.rain(this.rainK, this.windK);
    // light
    const day = this.dayK(), e = this.cycles() ? Math.sin((this.time - .25) * Math.PI * 2) : 1;
    const dusk = this.cycles() ? Math.max(0, 1 - Math.abs(e) * 3.2) * (day > .05 ? 1 : .5) : 0;
    const wet = 1 - this.rainK * .45;
    if (this.cycles()) {
      const night = new THREE.Color('#7f98e8'), warm = new THREE.Color('#ffae6a');
      W.sun.intensity = this.base.sun * (.18 + .82 * day) * wet + this.flash * 4;
      W.sun.color.copy(night).lerp(this.base.sunCol, day).lerp(warm, dusk * .7);
      W.hemi.intensity = this.base.hemi * (.42 + .58 * day) * (1 - this.rainK * .25) + this.flash * 2;
      const nightSky = new THREE.Color('#2a3660'), duskSky = new THREE.Color('#ffb090');
      W.sky.material.color.copy(nightSky).lerp(new THREE.Color('#ffffff'), day).lerp(duskSky, dusk * .55).multiplyScalar(1 - this.rainK * .35);
      const nb = new THREE.Color('#1a2444');
      this.g.scene.background.copy(nb).lerp(this.base.bg, day);
      this.g.scene.fog.color.copy(nb).lerp(this.base.fog, day).lerp(new THREE.Color('#e8a888'), dusk * .3).lerp(new THREE.Color('#8a96a8'), this.rainK * .5);
      if (this.stars) this.stars.material.opacity = (1 - day) * .9 * (1 - this.rainK);
      const P = this.g.player ? this.g.player.pos : this.g.camTarget, a = (this.time - .25) * Math.PI * 2;
      W.sun.position.set(P.x - Math.cos(a) * 18, 6 + Math.max(0, Math.sin(a)) * 18, P.z + 10);
      // night feel in the picture finish: cooler, lamps bloom more
      this.g.post.mood({ tint: [1.03 - .16 * (1 - day), 1 - .06 * (1 - day), .95 + .16 * (1 - day)], lift: [.012, .008 + .006 * (1 - day), .03 + .02 * (1 - day)], sat: 1.08 - .12 * (1 - day) - .1 * this.rainK, vig: .32 + .14 * (1 - day), bloom: .38 + .32 * (1 - day), threshold: .86 - .14 * (1 - day) });
    }
    this.g.scene.fog.near = this.base.fogNear * (1 - this.rainK * .35); this.g.scene.fog.far = this.base.fogFar * (1 - this.rainK * .3);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
    // rain drops around the camera target
    if (this.rain) {
      this.rain.material.opacity = this.rainK * .55;
      if (this.rainK > .02) {
        const c = this.g.camTarget, p = this.rain.geometry.attributes.position.array, wx = (this.windK - 1) * 3;
        this.rainDrops.forEach((d, i) => {
          d.y -= d.v * dt; d.x += wx * dt; if (d.y < 0) { d.y = rand(14, 18); d.x = rand(-16, 16); d.z = rand(-16, 16); }
          const x = c.x + d.x, z = c.z + d.z; p.set([x, d.y, z, x - wx * .04, d.y + .55, z], i * 6);
        });
        this.rain.geometry.attributes.position.needsUpdate = true;
        if (this.rainK > .6 && this.isNight() && Math.random() < dt * .03) { this.flash = 1; setTimeout(() => LB.SFX.boom(), rand(300, 1200)); }
      }
    }
    this.updateClock();
  }
  updateClock(force) {
    const hud = document.getElementById('hud3d'); if (!hud) return;
    if (!this.clock.parentNode) hud.appendChild(this.clock);
    this.clock.style.display = this.cycles() ? '' : 'none';
    if (!this.cycles()) return;
    const t = this.time, ph = t < .2 || t > .82 ? 'night' : t < .3 ? 'dawn' : t < .7 ? 'day' : 'dusk';
    const icon = { night: '☾', dawn: '☀', day: '☀', dusk: '☀' }[ph] + (this.weather === 'rain' ? ' ☂' : this.weather === 'wind' ? ' ≋' : '');
    if (ph !== this.phase || force) {
      if (this.phase && !force && LB.mode === 'world') LB.toast(LB.t({ night: 'Night falls. Some companions only come out now…', dawn: 'The sun rises over the valley', day: 'Full daylight', dusk: 'Evening light' }[ph]));
      this.phase = ph;
    }
    const txt = `<b>${icon}</b>${LB.t({ night: 'Night', dawn: 'Dawn', day: 'Day', dusk: 'Evening' }[ph])}`;
    if (this.clock.innerHTML !== txt) this.clock.innerHTML = txt;
  }

  // ---------- gameplay update (world mode) ----------
  update(dt) {
    const g = this.g, P = g.player; if (!P) return;
    this.updateCritters(dt);
    this.updatePets(dt);
    this.updateNpcs(dt);
    // shiny sparkle on any shiny character on screen
    if ((this.sparkT = (this.sparkT || 0) - dt) <= 0) {
      this.sparkT = .35;
      [g.ally, ...g.wild].forEach(a => { if (a && !a.dead && a.m && a.m.shiny && a.state !== 'captured') g.fx.burst('Glimmer', new V3(a.x + rand(-.4, .4), a.h * rand(.4, 1), a.z + rand(-.4, .4)), 1, .25); });
    }
  }

  // ---------- birds, butterflies, fish ----------
  updateCritters(dt) {
    const g = this.g, P = g.player, day = this.dayK();
    // keep a few bird flocks near you in the daytime valley
    if (this.cycles() && day > .5 && this.critters.filter(c => c.kind === 'bird' && !c.flying).length < 8 && Math.random() < dt * .6) this.spawnFlock();
    if ((this.cycles() || LB.STAGE === 'lake') && day > .5 && this.critters.filter(c => c.kind === 'fly').length < 8 && Math.random() < dt) this.spawnButterfly();
    this.fishT -= dt;
    if (this.fishT <= 0) { this.fishT = rand(2.5, 6); this.jump(); }
    this.critters = this.critters.filter(c => {
      c.t += dt;
      if (c.kind === 'bird') {
        const d = dist(P.pos, c.obj.position);
        if (!c.flying && (d < 4.5 || (P.vel.length() > 6 && d < 7) || day < .4)) { c.flying = true; c.vy = rand(4, 6); c.dir = new V2(c.obj.position.x - P.x, c.obj.position.z - P.z).normalize().rotateAround(new V2(), rand(-.6, .6)); if (d < 9) LB.SFX.flutter && LB.SFX.flutter(); }
        if (c.flying) {
          c.obj.position.x += c.dir.x * 7 * dt; c.obj.position.z += c.dir.y * 7 * dt; c.obj.position.y += c.vy * dt; c.vy = Math.max(1.5, c.vy - dt * 2);
          const f = Math.sin(c.t * 28) * .9; c.wl.rotation.z = f; c.wr.rotation.z = -f;
          c.obj.rotation.y = Math.atan2(c.dir.x, c.dir.y);
          if (c.obj.position.y > 16) { g.scene.remove(c.obj); return false; }
        } else {
          // peck and hop
          c.obj.position.y = Math.max(0, Math.sin(c.t * 7 + c.p) * .12);
          c.body.rotation.x = Math.sin(c.t * 5 + c.p) > .6 ? .6 : 0;
          if (Math.random() < dt * .4) c.obj.rotation.y = rand(0, 6.28);
          if (d > 40) { g.scene.remove(c.obj); return false; }
        }
        return true;
      }
      if (c.kind === 'fly') {
        c.obj.position.x = c.home.x + Math.sin(c.t * .7 + c.p) * 1.6; c.obj.position.z = c.home.z + Math.cos(c.t * .5 + c.p) * 1.6;
        c.obj.position.y = .7 + Math.sin(c.t * 2.3 + c.p) * .35;
        const f = Math.sin(c.t * 22) * 1.1; c.wl.rotation.z = f; c.wr.rotation.z = -f;
        c.obj.rotation.y = c.t * .7 + c.p;
        if (dist(P.pos, c.obj.position) > 36 || day < .4) { g.scene.remove(c.obj); return false; }
        return true;
      }
      if (c.kind === 'fish') {
        const k = c.t / .8; if (k >= 1) { g.scene.remove(c.obj); g.fx.burst(c.lava ? 'Ember' : 'Tide', c.obj.position.clone().setY(0), 6, .5); return false; }
        c.obj.position.set(c.a.x + (c.b.x - c.a.x) * k, -.2 + Math.sin(k * Math.PI) * 1.4, c.a.z + (c.b.z - c.a.z) * k);
        c.obj.rotation.z = (k - .5) * -2.2;
        return true;
      }
      return true;
    });
  }
  spawnFlock() {
    const g = this.g, P = g.player;
    for (let i = 0; i < 10; i++) {
      const x = P.x + rand(-20, 20), z = P.z + rand(-16, 14), c = charAt(x, z);
      if (!c || LB.SOLID.has(c) || dist(P.pos, { x, z }) < 9 || liquidAt(x, z) > .2) continue;
      const n = Math.floor(rand(3, 6)), col = ['#6b5a4a', '#4a5568', '#8a6a4a', '#3a3a44'][Math.floor(rand(0, 4))];
      for (let k = 0; k < n; k++) {
        const obj = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: col, flatShading: true, side: THREE.DoubleSide });
        const body = new THREE.Mesh(new THREE.ConeGeometry(.09, .32, 5), mat); body.rotation.x = Math.PI / 2; body.position.y = .12;
        const wing = new THREE.PlaneGeometry(.26, .12); wing.translate(.13, 0, 0);
        const wl = new THREE.Mesh(wing, mat), wr = new THREE.Mesh(wing, mat); wl.position.y = wr.position.y = .15; wr.rotation.y = Math.PI;
        obj.add(body, wl, wr); obj.position.set(x + rand(-1.2, 1.2), 0, z + rand(-1.2, 1.2)); obj.rotation.y = rand(0, 6.28);
        g.scene.add(obj); this.critters.push({ kind: 'bird', obj, body, wl, wr, t: 0, p: rand(0, 6) });
      }
      return;
    }
  }
  spawnButterfly() {
    const g = this.g, P = g.player;
    for (let i = 0; i < 6; i++) {
      const x = P.x + rand(-16, 16), z = P.z + rand(-12, 10), c = charAt(x, z);
      if (!c || LB.SOLID.has(c) || liquidAt(x, z) > .2) continue;
      const col = ['#ffd23f', '#ffffff', '#ff9fd0', '#9fd8ff', '#ffb36a'][Math.floor(rand(0, 5))];
      const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }), obj = new THREE.Group();
      const wing = new THREE.CircleGeometry(.1, 6); wing.translate(.09, 0, 0); wing.rotateX(-Math.PI / 2);
      const wl = new THREE.Mesh(wing, mat), wr = new THREE.Mesh(wing, mat); wr.rotation.y = Math.PI; obj.add(wl, wr);
      obj.position.set(x, .8, z); g.scene.add(obj);
      this.critters.push({ kind: 'fly', obj, wl, wr, t: 0, p: rand(0, 6), home: { x, z } });
      return;
    }
  }
  jump() {
    const g = this.g, P = g.player, lava = LB.STAGE === 'ember';
    for (let i = 0; i < 12; i++) {
      const x = P.x + rand(-15, 15), z = P.z + rand(-12, 10);
      if (liquidAt(x, z) < .85) continue;
      if (lava) { g.fx.burst('Ember', new V3(x, .1, z), 10, .8); g.fx.glowAt(new V3(x, .3, z), '#ff8a3c', 1.4, .5); return; }
      const obj = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshStandardMaterial({ color: LB.STAGE === 'caverns' ? '#9feaf2' : '#c8d8e8', metalness: .5, roughness: .3, emissive: LB.STAGE === 'caverns' ? '#3fa8c0' : '#000' }));
      obj.scale.set(1.8, .7, .7);
      const a = new V3(x, 0, z), ang = rand(0, 6.28), b = new V3(x + Math.cos(ang) * 1.6, 0, z + Math.sin(ang) * 1.6);
      obj.rotation.y = -ang; g.scene.add(obj); g.fx.burst('Tide', a.clone(), 5, .4);
      if (dist(P.pos, a) < 10) LB.SFX.splash();
      this.critters.push({ kind: 'fish', obj, a, b, t: 0 });
      return;
    }
  }

  // ---------- village pets and strolling villagers ----------
  updatePets(dt) {
    const g = this.g, P = g.player, night = this.isNight();
    this.pets.forEach(a => {
      const d = dist(P.pos, a.pos);
      if (night) { a.vel.set(0, 0); if (Math.random() < dt * .4) g.fx.emote(a, 'zzz', 1.4); }
      else if (d < 2.6) { a.vel.set(0, 0); a.lift = Math.abs(Math.sin(g.t * 6)) * .15; g.orient(a, new V2(P.x - a.x, P.z - a.z)); if (Math.random() < dt * .3) g.fx.emote(a, '♪', 1.2); }
      else {
        a.lift = 0; a.wanderT -= dt;
        if (a.wanderT <= 0) { a.wanderT = rand(1.5, 3.5); const ang = rand(0, 6.28); a.wdir = Math.random() < .4 ? null : new V2(Math.cos(ang), Math.sin(ang)); }
        if (a.wdir) { if (dist(a.pos, a.home) > 3.5) a.wdir.set(a.home.x - a.x, a.home.z - a.z).normalize(); a.vel.set(a.wdir.x * 1.6, a.wdir.y * 1.6); g.move(a, a.vel.x * dt, a.vel.y * dt); }
        else a.vel.set(0, 0);
      }
      if (a.vel.length() > .3) g.orient(a, a.vel);
      a.animate(dt, a.vel.length() > .3, g.yaw);
    });
  }
  updateNpcs(dt) {
    const g = this.g, P = g.player;
    ['mentor', 'angler'].forEach(id => {
      const a = g.npcs[id]; if (!a) return;
      const home = tileCenter(a.npc.x, a.npc.y);
      if (dist(P.pos, a.pos) < 4.5 || g.fight) { a.vel.set(0, 0); return; }
      a.wanderT = (a.wanderT || 0) - dt;
      if (a.wanderT <= 0) { a.wanderT = rand(2, 5); const ang = rand(0, 6.28), r = rand(0, 1.3); a.goal = Math.random() < .35 ? null : { x: home.x + Math.cos(ang) * r, z: home.z + Math.sin(ang) * r }; }
      if (a.goal) { const dx = a.goal.x - a.x, dz = a.goal.z - a.z, d = Math.hypot(dx, dz); if (d < .1) { a.goal = null; a.vel.set(0, 0); } else { a.vel.set(dx / d * 1.3, dz / d * 1.3); g.move(a, a.vel.x * dt, a.vel.y * dt); } }
      else a.vel.set(0, 0);
    });
  }
  // something F can be used on: the village pets
  interactables() {
    return this.pets.filter(p => !p.dead).map(p => ({ x: p.x, z: p.z, r: 1.7, label: 'Pet', use: () => {
      const g = this.g; g.fx.emote(p, '❤', 1.6); LB.SFX.heal(); g.fx.burst('Glimmer', new V3(p.x, p.h, p.z), 8, .4); p.lift = .3; setTimeout(() => p.lift = 0, 250);
      LB.quests && LB.quests.emit('pet', { sp: p.m.sp });
    } }));
  }

  // ---------- wild moods (called from the enemy AI; returns true when it handled the creature) ----------
  onSpawn(u) {
    if (u.kind !== 'wild' || u.alpha || u.spar) return;
    const M = LB.MON[u.m.sp];
    u.timid = M.cr >= .9 && !u.elite;
    if (this.cycles() && this.isNight() && Math.random() < .65) { u.state = 'sleep'; u.sleepHp = u.m.hpA; }
    if (Math.random() < 1 / 45) this.makeShiny(u);
  }
  makeShiny(u) {
    u.m.shiny = true; u.baseTint = SHINY_TINT[u.t]; u.tint(); u.rim = .7;
    if (u.label) u.label.querySelector('.lv').textContent = '★ ' + u.label.querySelector('.lv').textContent;
    LB.SFX.shiny && LB.SFX.shiny(); this.g.fx.emote(u, '★', 2.4);
    LB.toast(LB.t('A shiny {c} appeared!', { c: u.m.sp }));
  }
  pickSpecies(Z, sp) {   // night brings out different companions in the valley
    if (this.cycles() && this.isNight() && Math.random() < .35) return NIGHT_SPECIES[Math.floor(rand(0, NIGHT_SPECIES.length))];
    return sp;
  }
  wildAI(u, dt) {
    if (u.kind !== 'wild' || u.alpha || u.spar) return false;
    const g = this.g, P = g.player, d = dist(P.pos, u.pos);
    if (u.state === 'sleep') {
      u.vel.set(0, 0); u.pivot.rotation.z = Math.sin(g.t * 1.5 + u.bob) * .05;
      if ((u.zzzT = (u.zzzT || 0) - dt) <= 0) { u.zzzT = 2.6; g.fx.emote(u, 'zzz', 1.8); }
      const loud = P.vel.length() > 6 && d < 3.2;
      if (u.m.hpA < u.sleepHp || d < 1.3 || loud) { u.state = 'chase'; u.noticed = true; u.pivot.rotation.z = 0; g.fx.emote(u, '!', 1.2); u.cd = .8; }
      return true;
    }
    if (!u.noticed && d < 7.5) {
      u.noticed = true; g.fx.emote(u, u.timid && u.m.hpA >= LB.unitMaxHp(u.m) ? '!?' : '!', 1.2);
      if (u.timid && u.m.hpA >= LB.unitMaxHp(u.m)) u.fleeT = 2.2;
    }
    if (u.fleeT > 0) {
      if (u.m.hpA < LB.unitMaxHp(u.m)) { u.fleeT = 0; u.timid = false; return false; }
      u.fleeT -= dt;
      const dx = u.x - P.x, dz = u.z - P.z, dd = Math.hypot(dx, dz) || 1, sp = (38 + LB.statsOf(u.m).spd * 1.1) / 16 * 1.25;
      u.vel.set(dx / dd * sp, dz / dd * sp); g.move(u, u.vel.x * dt, u.vel.y * dt);
      if (u.fleeT <= 0) u.timid = false;      // cornered: it will fight now
      return true;
    }
    if (d > 9 && !u.wdir && Math.random() < dt * .25) g.fx.emote(u, '♪', 1.1);
    return false;
  }
}
