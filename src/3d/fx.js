// ============================================================
// Lanternbound 3D — visual effects: particle bursts, floating text,
// attack warnings on the ground, weapon swing trails, screen shake.
// ============================================================
import * as THREE from 'three';

export const TYPE_FX = {
  Grove: ['leaf', ['#7fbf4a', '#b5dd7a'], 0],   Tide: ['drop', ['#4aa8e0', '#a8e2ff'], 1],
  Ember: ['spark', ['#ff8a3c', '#ffd27a'], 2],  Gale: ['streak', ['#ffffff', '#c9d4ff'], 2],
  Stone: ['rock', ['#8a7560', '#b9a88c'], 0],   Glimmer: ['star', ['#e4b8ff', '#fff3a8'], 2],
  Plain: ['dot', ['#ffffff', '#f3e3c0'], 2]
};

function shapeTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.translate(16, 16);
  if (kind === 'leaf') { g.beginPath(); g.ellipse(0, 0, 13, 7, .5, 0, 7); g.fill(); }
  else if (kind === 'drop') { g.beginPath(); g.arc(0, 4, 9, 0, 7); g.moveTo(-8, 1); g.lineTo(0, -13); g.lineTo(8, 1); g.fill(); }
  else if (kind === 'rock') { g.beginPath(); g.moveTo(-10, 8); g.lineTo(-12, -2); g.lineTo(-3, -11); g.lineTo(10, -6); g.lineTo(11, 7); g.closePath(); g.fill(); }
  else if (kind === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 14, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }
  else if (kind === 'streak') { g.fillRect(-15, -3, 30, 6); }
  else { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-16, -16, 32, 32); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class FX {
  constructor(scene, camera, glowTex) {
    this.scene = scene; this.camera = camera; this.glowTex = glowTex;
    this.tex = {}; ['leaf', 'drop', 'spark', 'streak', 'rock', 'star', 'dot'].forEach(k => this.tex[k] = shapeTex(k));
    this.tex.spark = this.tex.dot;
    this.parts = []; this.pool = [];
    this.temp = []; // timed meshes (rings, trails, telegraphs)
    this.labels = []; this.layer = document.getElementById('lb-labels'); this.emotes = [];
    if (!document.getElementById('lb-emote-css')) { const st = document.createElement('style'); st.id = 'lb-emote-css'; st.textContent = '.emote{position:absolute;left:0;top:0;min-width:30px;height:30px;padding:0 7px;border-radius:15px;background:#f5efe2;border:2px solid #3b2f20;font:900 16px/26px Nunito,sans-serif;color:#b8692e;text-align:center;box-shadow:0 3px 0 rgba(0,0,0,.25);will-change:transform;white-space:nowrap}.emote:after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-5px;border:5px solid transparent;border-top-color:#3b2f20}.emote.pop{animation:emp .35s cubic-bezier(.3,1.6,.5,1)}@keyframes emp{from{scale:.2}to{scale:1}}'; document.head.appendChild(st); }
    this.shakeT = 0; this.shakeA = 0;
  }
  sprite(tex, color, additive) {
    let s = this.pool.pop();
    if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); this.scene.add(s); }
    s.material.map = tex; s.material.color.set(color); s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    s.material.opacity = 1; s.material.needsUpdate = true; s.visible = true; return s;
  }
  // burst of type-colored particles at a 3D point
  burst(type, p, n = 14, power = 1) {
    const [shape, cols, add] = TYPE_FX[type] || TYPE_FX.Plain;
    for (let i = 0; i < n; i++) {
      const s = this.sprite(this.tex[shape], cols[i % 2], add >= 1);
      s.position.set(p.x, p.y, p.z);
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 - .2, sp = (2 + Math.random() * 4) * power;
      const size = (.18 + Math.random() * .18) * (shape === 'streak' ? 1.4 : 1);
      s.scale.set(size, size, 1);
      this.parts.push({ s, vx: Math.cos(a) * sp, vy: Math.sin(e) * sp + 1.5, vz: Math.sin(a) * sp, life: .5 + Math.random() * .4, max: .9, size,
        g: type === 'Tide' || type === 'Stone' ? -12 : type === 'Ember' ? 4 : -3, rot: Math.random() * 6 });
    }
  }
  dust(p, n = 4) {
    for (let i = 0; i < n; i++) {
      const s = this.sprite(this.tex.dot, '#d8c8a0', false); s.material.opacity = .55;
      s.position.set(p.x + (Math.random() - .5) * .3, .12, p.z + (Math.random() - .5) * .3);
      const size = .25 + Math.random() * .2; s.scale.set(size, size, 1);
      this.parts.push({ s, vx: (Math.random() - .5) * .8, vy: .6, vz: (Math.random() - .5) * .8, life: .45, max: .45, size, g: 0, grow: 1.8, fadeFrom: .55 });
    }
  }
  glowAt(p, color, size, life = .3) {
    const s = this.sprite(this.glowTex, color, true); s.position.copy(p); s.scale.set(size, size, 1);
    this.parts.push({ s, vx: 0, vy: 0, vz: 0, life, max: life, size, g: 0, grow: 1.3 });
  }
  // flat ring that expands on the ground
  ring(p, color, r1 = .3, r2 = 3, life = .4, y = .06) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, y, p.z); m.scale.setScalar(r1); this.scene.add(m);
    this.temp.push({ m, life, max: life, upd: (k) => { m.scale.setScalar(r1 + (r2 - r1) * k); m.material.opacity = .9 * (1 - k); } });
  }
  // red warning shape on the ground before an enemy attack
  telegraph(from, to, kind, dur) {
    const ang = Math.atan2(to.x - from.x, to.z - from.z);
    let m;
    if (kind === 'melee') { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: .0, depthWrite: false })); m.geometry.translate(0, .5, 0); m.scale.set(1.1, 2.8, 1); }
    else { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: .0, depthWrite: false })); m.geometry.translate(0, .5, 0); m.scale.set(.28, 7, 1); }
    m.rotation.set(-Math.PI / 2, 0, ang + Math.PI); m.position.set(from.x, .07, from.z);
    this.scene.add(m);
    this.temp.push({ m, life: dur, max: dur, upd: k => { m.material.opacity = .15 + .4 * k; } });
    return m;
  }
  // bright arc showing a weapon swing
  swing(center, angle, arc, radius, color) {
    const geo = new THREE.RingGeometry(radius * .35, radius, 24, 1, 0, arc);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = angle - arc / 2; m.position.set(center.x, .9, center.z);
    this.scene.add(m);
    this.temp.push({ m, life: .18, max: .18, upd: k => { m.material.opacity = .75 * (1 - k); m.scale.setScalar(1 + k * .15); } });
  }
  // speech-bubble emote that follows a character: '❤', '!', '?', '♪', 'zzz', '💦', '★', '✦'
  emote(a, sym, dur = 1.6) {
    if (!a || a.dead) return;
    let e = this.emotes.find(x => x.a === a);
    if (!e) { const el = document.createElement('div'); el.className = 'emote'; this.layer.appendChild(el); e = { a, el }; this.emotes.push(e); }
    e.el.textContent = sym; e.life = e.max = dur; e.el.classList.remove('pop'); void e.el.offsetWidth; e.el.classList.add('pop');
  }
  shake(amount, time = .2) { this.shakeA = Math.max(this.shakeA, amount); this.shakeT = Math.max(this.shakeT, time); }

  // floating DOM text above a 3D point
  text(p, txt, color = '#fff', size = 18) {
    const el = document.createElement('div'); el.className = 'ftxt'; el.textContent = txt;
    el.style.color = color; el.style.fontSize = size + 'px'; this.layer.appendChild(el);
    this.labels.push({ el, p: p.clone ? p.clone() : new THREE.Vector3(p.x, p.y, p.z), life: .9, max: .9 });
  }
  project(p) {
    const v = p.clone().project(this.camera);
    return { x: (v.x * .5 + .5) * innerWidth, y: (-v.y * .5 + .5) * innerHeight, vis: v.z < 1 };
  }
  update(dt) {
    this.parts = this.parts.filter(q => {
      q.life -= dt; if (q.life <= 0) { q.s.visible = false; this.pool.push(q.s); return false; }
      q.vy += q.g * dt; q.s.position.x += q.vx * dt; q.s.position.y += q.vy * dt; q.s.position.z += q.vz * dt;
      if (q.s.position.y < .05) { q.s.position.y = .05; q.vy *= -.3; q.vx *= .7; q.vz *= .7; }
      const k = q.life / q.max;
      q.s.material.opacity = (q.fadeFrom || 1) * k; q.s.material.rotation = (q.rot += dt * 4);
      const sz = q.size * (q.grow ? 1 + (1 - k) * q.grow : .4 + .6 * k); q.s.scale.set(sz, sz, 1);
      return true;
    });
    this.temp = this.temp.filter(t => {
      t.life -= dt; if (t.life <= 0) { this.scene.remove(t.m); t.m.geometry.dispose(); t.m.material.dispose(); return false; }
      t.upd(1 - t.life / t.max); return true;
    });
    this.labels = this.labels.filter(l => {
      l.life -= dt; if (l.life <= 0) { l.el.remove(); return false; }
      l.p.y += dt * 1.4; const s = this.project(l.p);
      l.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%)`; l.el.style.opacity = Math.min(1, l.life / l.max * 2);
      return true;
    });
    this.emotes = this.emotes.filter(e => {
      e.life -= dt; if (e.life <= 0 || e.a.dead) { e.el.remove(); return false; }
      const s = this.project(new THREE.Vector3(e.a.pos.x, e.a.h + (e.a.label ? 1.15 : .7) + (e.a.lift || 0), e.a.pos.z));
      e.el.style.display = s.vis ? '' : 'none';
      e.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`; e.el.style.opacity = Math.min(1, e.life / .3);
      return true;
    });
    if (this.shakeT > 0) this.shakeT -= dt; else this.shakeA = 0;
  }
  shakeOffset() { if (this.shakeT <= 0) return { x: 0, y: 0 }; const a = this.shakeA; return { x: (Math.random() - .5) * a, y: (Math.random() - .5) * a }; }
}
