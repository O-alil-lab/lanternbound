// ============================================================
// Lanternbound 3D — characters as standing "paper" billboards with real
// shadows, plus 3D models for the weapons and the lantern.
// ============================================================
import * as THREE from 'three';

export const TEX = {};   // loaded character textures: <view>_<name>  (view = f, q, s, b)
const VIEWS = { f: 'front', q: 'q', s: 'side', b: 'back' };

export function loadTextures(onProgress) {
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  const jobs = [];
  Object.keys(LB.TRAINERS).forEach(n => Object.entries(VIEWS).forEach(([k, v]) => jobs.push([k + '_' + n, LB.trainerView(n, v)])));
  Object.keys(LB.MON).forEach(sp => Object.entries(VIEWS).forEach(([k, v]) => jobs.push([k + '_' + sp, LB.compImg(sp, v)])));
  let done = 0;
  return Promise.all(jobs.map(([k, url]) => new Promise(res => {
    loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[k] = t; onProgress(++done / jobs.length); res(); },
      undefined, () => { onProgress(++done / jobs.length); res(); });
  })));
}

const PAD = 1.06;   // the card is drawn 6% larger so the outline fits around the art

// Paper-cut look: dark ink outline around the art, soft self-light so colours stay bright.
function paperMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide, roughness: 1 });
  const u = { uGlow: { value: .3 }, uTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) }, uPad: { value: PAD }, uOutline: { value: new THREE.Color('#2b2418') }, uRim: { value: 0 } };
  mat.userData.u = u;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = 'uniform float uGlow; uniform vec2 uTexel; uniform float uPad; uniform vec3 uOutline; uniform float uRim;\n' +
      sh.fragmentShader.replace('#include <map_fragment>', `
        vec2 uvp = (vMapUv - 0.5) * uPad + 0.5;
        float inside = step(0.0, uvp.x) * step(uvp.x, 1.0) * step(0.0, uvp.y) * step(uvp.y, 1.0);
        vec4 texel = texture2D(map, uvp) * inside;
        float nb = 0.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          vec2 o = uvp + vec2(cos(a), sin(a)) * uTexel * 2.6;
          float ins = step(0.0, o.x) * step(o.x, 1.0) * step(0.0, o.y) * step(o.y, 1.0);
          nb = max(nb, texture2D(map, o).a * ins);
        }
        if (texel.a < 0.5 && nb > 0.5) texel = vec4(uOutline, 1.0);
        diffuseColor *= texel;
        float edge = (texel.a > 0.5) ? (1.0 - min(1.0, nb)) : 0.0;
        totalEmissiveRadiance += diffuseColor.rgb * uGlow + vec3(1.0, 0.95, 0.8) * uRim * edge;
      `);
  };
  return mat;
}

export class Actor {
  constructor(game, o) {
    // o: { kind: 'player'|'ally'|'wild'|'boss'|'npc', m, trainer, x, z, scale }
    this.g = game; this.kind = o.kind; this.m = o.m; this.trainer = o.trainer;
    this.base = o.trainer || o.m.sp;
    this.texKey = 'f_' + this.base;
    const tex = TEX[this.texKey];
    this.size = (o.scale || 1) * (o.trainer ? 1 : (LB.SIZE[o.m.sp] || 1));
    this.h = o.trainer ? 1.9 : 1.55 * this.size;
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .5, 0);
    this.mat = paperMaterial(tex);
    this.body = new THREE.Mesh(geo, this.mat); this.body.castShadow = true;
    this.body.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .22, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = .03;
    this.pivot = new THREE.Group(); this.pivot.rotation.order = 'YXZ'; this.pivot.add(this.body);
    this.obj = new THREE.Group(); this.obj.add(this.pivot, this.blob);
    this.obj.position.set(o.x, 0, o.z); game.scene.add(this.obj);
    this.pos = this.obj.position;
    this.applyTexture(tex);
    this.vel = new THREE.Vector2(); this.kb = new THREE.Vector2(); this.look = new THREE.Vector2(0, 1);
    this.r = o.trainer ? .38 : .35 * this.size + .1;
    this.cd = 1 + Math.random(); this.state = 'idle'; this.iframes = 0; this.bob = Math.random() * 6; this.dead = false;
    this.home = { x: o.x, z: o.z }; this.wanderT = 0; this.lift = 0; this.flip = false;
    if (this.m) { this.t = LB.MON[this.m.sp].t; this.style = LB.STYLE[this.t]; if (this.m.hpA == null) this.m.hpA = LB.unitMaxHp(this.m); }
    if (this.m && (this.kind === 'wild' || this.kind === 'boss')) {
      this.label = document.createElement('div'); this.label.className = 'ubar' + (this.kind === 'boss' || o.alpha ? ' boss' : '');
      this.label.innerHTML = `<span class="lv">${o.alpha ? LB.t('ALPHA') + ' ' : ''}${LB.t('Lv')}${this.m.lvl}</span><div class="b"><i></i></div><div class="pr"></div>`;
      document.getElementById('lb-labels').appendChild(this.label);
      this.fill = this.label.querySelector('i'); this.prompt = this.label.querySelector('.pr');
    }
  }
  get x() { return this.pos.x; } get z() { return this.pos.z; }
  applyTexture(tex) {
    if (!tex) return;
    const img = tex.image, w = this.h * (img ? img.width / img.height : .6);
    this.w = w;
    this.mat.map = tex; this.mat.needsUpdate = true;
    if (img) this.mat.userData.u.uTexel.value.set(1 / img.width, 1 / img.height);
    this.body.customDepthMaterial.map = tex; this.body.customDepthMaterial.needsUpdate = true;
    this.blob.scale.setScalar(Math.max(.6, Math.min(w, this.h) * .5));
  }
  setTexture(k) { if (this.texKey === k || !TEX[k]) return; this.texKey = k; this.applyTexture(TEX[k]); }
  // pick the right drawing (front / three-quarter / side / back) for a direction seen from the camera
  face(sx, sz) {
    if (Math.hypot(sx, sz) < .05) return;
    const a = Math.atan2(sx, sz);              // 0 = toward camera, ±π = away
    const sector = Math.round(a / (Math.PI / 4)); // -4..4
    const fac = LB.FACING[this.base] || ['R', 'R'];
    let view = 'f', wantRight = sx >= 0, native = 'R';
    const abs = Math.abs(sector);
    if (abs === 0) view = 'f';
    else if (abs === 1) { view = 'q'; native = fac[0]; }
    else if (abs === 2) { view = 's'; native = fac[1]; }
    else view = 'b';
    if (this.state === 'dazed') view = 'f';
    this.setTexture(view + '_' + this.base);
    this.flip = (view === 'q' || view === 's') ? (wantRight !== (native === 'R')) : false;
  }
  flash() { this.mat.userData.u.uGlow.value = 2.4; this.flashT = .09; }
  tint(c) { this.mat.color.set(c || '#ffffff'); }
  // visuals each frame (yaw = camera yaw so the card faces the camera)
  animate(dt, moving, yaw = 0) {
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.mat.userData.u.uGlow.value = .3; }
    this.mat.userData.u.uRim.value = this.kind === 'boss' ? .9 : this.kind === 'player' ? .35 : .2;
    const sx = this.flip ? -1 : 1;
    this.pivot.rotation.y = yaw;
    if (this.rolling) return;
    const W = this.w * PAD, H = this.h * PAD;
    if (moving && this.state !== 'dazed') {
      this.bob += dt * 14;
      const b = Math.abs(Math.sin(this.bob));
      this.pivot.position.y = b * .16 + this.lift;
      this.body.scale.set(W * sx * (1 + b * .04), H * (1 - b * .05), 1);
      this.pivot.rotation.z = THREE.MathUtils.lerp(this.pivot.rotation.z, -this.sv * .025, .2);
    } else {
      this.bob += dt * 2.2;
      this.pivot.position.y = this.lift;
      this.body.scale.set(W * sx, H * (1 + Math.sin(this.bob) * .012), 1);
      this.pivot.rotation.z = THREE.MathUtils.lerp(this.pivot.rotation.z, 0, .15);
    }
    this.body.position.y = -this.h * (PAD - 1) / 2;
  }
  updateLabel(fx) {
    if (!this.label) return;
    const p = fx.project(new THREE.Vector3(this.pos.x, this.h + .45, this.pos.z));
    this.label.style.display = p.vis && !this.hidden ? '' : 'none';
    this.label.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
    const v = Math.max(0, this.m.hpA) / (this.maxHp || LB.unitMaxHp(this.m));
    this.fill.style.width = (v * 100) + '%';
    this.fill.style.background = this.kind === 'boss' || this.alpha ? '#d9a634' : v > .5 ? '#5aa340' : v > .2 ? '#d9a634' : '#c8452f';
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
