// ============================================================
// Lanternbound 3D — characters as standing "paper" billboards with real
// shadows, plus 3D models for the weapons and the lantern.
// ============================================================
import * as THREE from 'three';

export const TEX = {};   // loaded character textures: f_<species>, b_<species>, tr_<trainer>

export function loadTextures(onProgress) {
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  const jobs = [];
  Object.keys(LB.TRAINERS).forEach(n => jobs.push(['tr_' + n, LB.trainerImg(n)]));
  Object.keys(LB.MON).forEach(sp => { jobs.push(['f_' + sp, LB.compImg(sp, 'front')]); jobs.push(['b_' + sp, LB.compImg(sp, 'back')]); });
  let done = 0;
  return Promise.all(jobs.map(([k, url]) => new Promise(res => {
    loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[k] = t; onProgress(++done / jobs.length); res(); },
      undefined, () => { onProgress(++done / jobs.length); res(); });
  })));
}

export class Actor {
  constructor(game, o) {
    // o: { kind: 'player'|'ally'|'wild'|'boss'|'npc', m, trainer, x, z }
    this.g = game; this.kind = o.kind; this.m = o.m; this.trainer = o.trainer;
    this.texKey = o.trainer ? 'tr_' + o.trainer : 'f_' + o.m.sp;
    const tex = TEX[this.texKey];
    const img = tex && tex.image;
    this.h = o.trainer ? 1.9 : 1.55 * (LB.SIZE[o.m.sp] || 1);
    const w = this.h * (img ? img.width / img.height : .6);
    this.w = w;
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .5, 0);
    this.mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide, roughness: 1, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .28 });
    this.body = new THREE.Mesh(geo, this.mat);
    this.body.scale.set(w, this.h, 1); this.body.castShadow = true;
    this.body.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .2, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = .03; this.blob.scale.setScalar(Math.max(.6, w * .55));
    this.pivot = new THREE.Group(); this.pivot.add(this.body);
    this.obj = new THREE.Group(); this.obj.add(this.pivot, this.blob);
    this.obj.position.set(o.x, 0, o.z); game.scene.add(this.obj);
    this.pos = this.obj.position;
    this.vel = new THREE.Vector2(); this.kb = new THREE.Vector2();
    this.r = o.trainer ? .38 : .35 * (LB.SIZE[o.m.sp] || 1) + .1;
    this.cd = 1 + Math.random(); this.state = 'idle'; this.iframes = 0; this.bob = Math.random() * 6; this.dead = false;
    this.home = { x: o.x, z: o.z }; this.wanderT = 0; this.lift = 0;
    if (this.m) { this.t = LB.MON[this.m.sp].t; this.style = LB.STYLE[this.t]; if (this.m.hpA == null) this.m.hpA = LB.unitMaxHp(this.m); }
    if (this.m && (this.kind === 'wild' || this.kind === 'boss')) {
      this.label = document.createElement('div'); this.label.className = 'ubar' + (this.kind === 'boss' ? ' boss' : '');
      this.label.innerHTML = `<span class="lv">Lv${this.m.lvl}</span><div class="b"><i></i></div><div class="pr"></div>`;
      document.getElementById('lb-labels').appendChild(this.label);
      this.fill = this.label.querySelector('i'); this.prompt = this.label.querySelector('.pr');
    }
  }
  get x() { return this.pos.x; } get z() { return this.pos.z; }
  setTexture(k) {
    if (this.texKey === k || !TEX[k]) return; this.texKey = k;
    this.mat.map = TEX[k]; this.mat.emissiveMap = TEX[k]; this.mat.needsUpdate = true;
    this.body.customDepthMaterial.map = TEX[k]; this.body.customDepthMaterial.needsUpdate = true;
  }
  flash() { this.mat.emissiveIntensity = 2.5; this.flashT = .09; }
  tint(c) { this.mat.color.set(c || '#ffffff'); }
  // visuals each frame
  animate(dt, moving) {
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.mat.emissiveIntensity = .28; }
    const vx = this.vel.x, vz = this.vel.y;
    if (this.m && this.state !== 'dazed') this.setTexture((vz < -.8 && Math.abs(vz) > Math.abs(vx) ? 'b_' : 'f_') + this.m.sp);
    if (Math.abs(vx) > .3) this.flip = vx < 0;
    const sx = this.flip ? -1 : 1;
    if (this.rolling) return;
    if (moving && this.state !== 'dazed') {
      this.bob += dt * 14;
      const b = Math.abs(Math.sin(this.bob));
      this.pivot.position.y = b * .16 + this.lift;
      this.body.scale.set(this.w * sx * (1 + b * .04), this.h * (1 - b * .05), 1);
      this.pivot.rotation.z = THREE.MathUtils.lerp(this.pivot.rotation.z, -vx * .025, .2);
    } else {
      this.bob += dt * 2.2;
      this.pivot.position.y = this.lift;
      this.body.scale.set(this.w * sx, this.h * (1 + Math.sin(this.bob) * .012), 1);
      this.pivot.rotation.z = THREE.MathUtils.lerp(this.pivot.rotation.z, 0, .15);
    }
  }
  updateLabel(fx) {
    if (!this.label) return;
    const p = fx.project(new THREE.Vector3(this.pos.x, this.h + .45, this.pos.z));
    this.label.style.display = p.vis && !this.hidden ? '' : 'none';
    this.label.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
    const v = Math.max(0, this.m.hpA) / LB.unitMaxHp(this.m);
    this.fill.style.width = (v * 100) + '%';
    this.fill.style.background = this.kind === 'boss' ? '#d9a634' : v > .5 ? '#5aa340' : v > .2 ? '#d9a634' : '#c8452f';
  }
  destroy() { this.dead = true; this.g.scene.remove(this.obj); this.mat.dispose(); if (this.label) this.label.remove(); }
}

// ---------- weapon models ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, flatShading: true, ...o });
export function makeWeapon(kind, level = 1) {
  const g = new THREE.Group(); const gem = ['#7fe6f5', '#86c24e', '#ffd23f'][level - 1] || '#7fe6f5';
  if (kind === 'staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, 1.35, 6), M('#7a4f26')); pole.position.y = .1;
    const band = new THREE.Mesh(new THREE.TorusGeometry(.07, .02, 6, 10), M('#c9a24a', { metalness: .6 })); band.position.y = .66; band.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.11, 0), M(gem, { emissive: gem, emissiveIntensity: 1.2 })); tip.position.y = .86;
    g.add(pole, band, tip); g.userData.tip = tip;
  } else if (kind === 'sling') {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .45, 6), M('#7a4f26')); h.position.y = 0;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .3, 6), M('#7a4f26')); l.position.set(-.08, .32, 0); l.rotation.z = .45;
    const r = l.clone(); r.position.x = .08; r.rotation.z = -.45;
    const band = new THREE.Mesh(new THREE.TorusGeometry(.12, .012, 4, 12, Math.PI), M('#5a3d2a')); band.position.y = .44; band.rotation.z = Math.PI;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(.05, 0), M(level > 1 ? gem : '#9c968a')); stone.position.y = .34;
    g.add(h, l, r, band, stone); g.userData.tip = stone;
  } else {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.022, .03, .85, 6), M('#e8dcc0', { metalness: .3 })); rod.position.y = .1;
    const coil = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 10), M('#c9a24a', { metalness: .7 })); coil.position.y = .48; coil.rotation.x = Math.PI / 2;
    const c = level >= 3 ? '#ffd23f' : level === 2 ? '#e4b8ff' : '#b07cd6';
    const crys = new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0), M(c, { emissive: c, emissiveIntensity: 1.6 })); crys.position.y = .62; crys.scale.y = 1.6;
    g.add(rod, coil, crys); g.userData.tip = crys;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makeLantern(color, glowTex) {
  const g = new THREE.Group();
  const gold = M('#b8862e', { metalness: .6, roughness: .4 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(.32, .06, .32), gold); top.position.y = .26;
  const bot = top.clone(); bot.position.y = -.26;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.06, .015, 6, 10), gold); ring.position.y = .34;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.03, .5, .03), gold); p.position.set(a * .14, 0, b * .14); g.add(p); });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.12, 0), M(color, { emissive: color, emissiveIntensity: 2 })); gem.scale.y = 1.4;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(1, 1, 1);
  g.add(top, bot, ring, gem, glow); g.userData.glow = glow; g.userData.gem = gem;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
