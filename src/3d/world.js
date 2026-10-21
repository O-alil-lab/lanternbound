// ============================================================
// Lanternbound 3D — the world: terrain, river, forest, tall grass,
// buildings, sky, light and ambient life (fireflies, falling leaves).
// Built from the same tile map as before (src/map.js): 1 tile = S world units.
// ============================================================
import * as THREE from 'three';

export const S = 2;              // world units per map tile
const PAD = 14;                  // tiles of forest drawn around the playable map
const RIVER_X = 14.5 * S;        // river centre (map columns 13–15)
const RIVER_HALF = 1.5 * S;

const rand = (a, b) => a + Math.random() * (b - a);
const hash = (x, y, s = 0) => LB.hash(x, y, s);
export const tileOf = (x, z) => [Math.floor(x / S), Math.floor(z / S)];
export const charAt = (x, z) => { const [tx, tz] = tileOf(x, z); return LB.MAP[tz] && LB.MAP[tz][tx]; };
export const tileCenter = (tx, tz) => ({ x: (tx + .5) * S, z: (tz + .5) * S });

// ---- smooth value noise for terrain ----
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi, 9), b = hash(xi + 1, zi, 9), c = hash(xi, zi + 1, 9), d = hash(xi + 1, zi + 1, 9);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// Ground height at a world position (flat where you play, river channel, hills around the edge)
export function heightAt(x, z) {
  const W = LB.MW * S, H = LB.MH * S;
  const out = Math.max(0, -x, x - W, -z, z - H);           // distance outside the playable map
  let h = 0;
  if (out > 0) h += Math.min(5, Math.pow(out / S, 1.3) * .35) + vnoise(x * .15, z * .15) * Math.min(1, out / 6) * 2.2;
  const dr = Math.abs(x - RIVER_X);
  h -= .75 * smooth(RIVER_HALF + .35, RIVER_HALF - .55, dr);
  if (out === 0) h += (vnoise(x * .35, z * .35) - .5) * .06;
  return h;
}

const GROUND_COL = {
  '.': '#7cab4c', ',': '#6a9a3c', ';': '#8eab5a', g: '#4d7c38', r: '#a8987a', ':': '#d3bc8c', F: '#7cab4c',
  '~': '#6f6a4c', '=': '#6f6a4c', T: '#557a37', R: '#a8987a', H: '#7cab4c', S: '#d3bc8c', W: '#7cab4c', M: '#7cab4c', P: '#a8987a'
};

// ---- canvas textures used by effects ----
export function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Wind: bends geometry above the ground; `bend` = how much, uses world position for variety.
function addWind(mat, uniforms, bend, grass) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uPlayer = uniforms.uPlayer;
    sh.vertexShader = 'uniform float uTime;\nuniform vec3 uPlayer;\nvarying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float hgt = max(position.y, 0.0);
      vH = clamp(position.y, 0.0, 1.0);
      float w = sin(uTime * 1.7 + wp.x * 0.55 + wp.z * 0.35) * ${bend.toFixed(3)} * hgt;
      transformed.x += w; transformed.z += w * 0.45;
      ${grass ? `
      vec2 away = wp.xz - uPlayer.xz; float dd = length(away);
      float push = max(0.0, 1.0 - dd / 1.3) * 0.55 * hgt;
      if (dd > 0.001) { transformed.x += away.x / dd * push; transformed.z += away.y / dd * push; transformed.y -= push * 0.35; }` : ''}
    `);
    if (grass) sh.fragmentShader = 'varying float vH;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.55, 1.12, vH);');
  };
}

export function buildWorld(scene, renderer) {
  const MW = LB.MW, MH = LB.MH, W = MW * S, H = MH * S;
  const uniforms = { uTime: { value: 0 }, uPlayer: { value: new THREE.Vector3() } };
  const shadowCasters = [];
  const glowTex = glowTexture();

  // ---------- sky, fog, light ----------
  scene.background = new THREE.Color('#bfdce9');
  scene.fog = new THREE.Fog('#c9e0d6', 26, 78);
  const skyGeo = new THREE.SphereGeometry(180, 24, 12);
  const skyCols = []; const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 180; const c = new THREE.Color('#f6e7c8').lerp(new THREE.Color('#7fb4dc'), Math.max(0, y) ** .6); skyCols.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);

  scene.add(new THREE.HemisphereLight('#e4f2ff', '#5d5233', 1.35));
  const sun = new THREE.DirectionalLight('#fff0d4', 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);

  // ---------- terrain ----------
  const GW = W + PAD * 2 * S, GH = H + PAD * 2 * S, segX = (MW + PAD * 2) * 3, segZ = (MH + PAD * 2) * 3;
  const g = new THREE.PlaneGeometry(GW, GH, segX, segZ); g.rotateX(-Math.PI / 2); g.translate(W / 2, 0, H / 2);
  const gp = g.attributes.position, cols = [], col = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    gp.setY(i, heightAt(x, z));
    const c = charAt(x - .01, z - .01);
    if (c) col.set(GROUND_COL[c] || '#7cab4c'); else col.set('#4f6f33').lerp(new THREE.Color('#6e7a45'), vnoise(x * .2, z * .2) * .6);
    if (Math.abs(x - RIVER_X) < RIVER_HALF + .3) col.set('#6f6a4c');
    const n = (vnoise(x * .9, z * .9) - .5) * .16; col.offsetHSL(0, 0, n);
    cols.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }));
  ground.receiveShadow = true; scene.add(ground);

  // ---------- river ----------
  const wg = new THREE.PlaneGeometry(RIVER_HALF * 2 + 1.2, GH, 8, 160); wg.rotateX(-Math.PI / 2); wg.translate(RIVER_X, -.26, H / 2);
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: '#3e8fb8', transparent: true, opacity: .84, roughness: .12, metalness: .25 }));
  water.receiveShadow = true; scene.add(water);
  const wBase = Float32Array.from(wg.attributes.position.array);

  // ---------- instanced helpers ----------
  const dummy = new THREE.Object3D();
  function instanced(geo, mat, list, { cast = true, receive = true } = {}) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      dummy.scale.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      if (it.c) m.setColorAt(i, col.set(it.c));
    });
    m.count = list.length; m.castShadow = cast; m.receiveShadow = receive;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    scene.add(m); return m;
  }

  // ---------- trees: map trees + a dense forest around the map ----------
  const trunks = [], canA = [], canB = [], pine1 = [], pine2 = [], pine3 = [];
  const greens = ['#3f7a35', '#4c8a3b', '#5a9442', '#36692f', '#6a9c48', '#2f5f2c'];
  function addTree(x, z, s, kind) {
    const y = heightAt(x, z), gc = greens[Math.floor(Math.random() * greens.length)];
    if (kind === 'pine') {
      trunks.push({ x, y: y + .6 * s, z, sx: s * .8, sy: s * .9, sz: s * .8, c: '#5b3c22' });
      pine1.push({ x, y: y + 1.7 * s, z, s: s * 1.15, ry: rand(0, 6), c: gc });
      pine2.push({ x, y: y + 2.55 * s, z, s: s * .95, ry: rand(0, 6), c: gc });
      pine3.push({ x, y: y + 3.3 * s, z, s: s * .75, ry: rand(0, 6), c: gc });
    } else {
      trunks.push({ x, y: y + .8 * s, z, s, c: '#6b4528' });
      canA.push({ x, y: y + 2.2 * s, z, s: s * rand(1, 1.2), ry: rand(0, 6), c: gc });
      canB.push({ x: x + rand(-.4, .4) * s, y: y + 2.95 * s, z: z + rand(-.4, .4) * s, s: s * rand(.65, .85), ry: rand(0, 6), c: greens[(greens.indexOf(gc) + 1) % greens.length] });
    }
  }
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (LB.MAP[ty][tx] !== 'T') continue;
    const c = tileCenter(tx, ty); if (Math.abs(c.x - RIVER_X) < RIVER_HALF + .4) continue;
    const kind = (ty <= 8 && tx >= 20) || hash(tx, ty, 3) < .35 ? 'pine' : 'round';
    addTree(c.x + rand(-.3, .3), c.z + rand(-.3, .3), rand(.85, 1.15), kind);
  }
  for (let tz = -PAD; tz < MH + PAD; tz++) for (let tx = -PAD; tx < MW + PAD; tx++) {
    if (tx >= 0 && tx < MW && tz >= 0 && tz < MH) continue;
    if (hash(tx, tz, 5) > .62) continue;
    const x = (tx + .5) * S + rand(-.7, .7), z = (tz + .5) * S + rand(-.7, .7);
    if (Math.abs(x - RIVER_X) < RIVER_HALF + .8) continue;
    addTree(x, z, rand(.9, 1.5), hash(tx, tz, 6) < .45 ? 'pine' : 'round');
  }
  const treeMat = c => { const m = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .85 }); addWind(m, uniforms, c, false); return m; };
  const trunkGeo = new THREE.CylinderGeometry(.14, .22, 1.6, 6);
  instanced(trunkGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .9 }), trunks);
  instanced(new THREE.IcosahedronGeometry(1.05, 0), treeMat(.05), canA);
  instanced(new THREE.IcosahedronGeometry(.85, 0), treeMat(.07), canB);
  instanced(new THREE.ConeGeometry(1.05, 1.5, 7), treeMat(.04), pine1);
  instanced(new THREE.ConeGeometry(.85, 1.3, 7), treeMat(.06), pine2);
  instanced(new THREE.ConeGeometry(.6, 1.1, 7), treeMat(.08), pine3);

  // ---------- tall grass, reeds, short grass (wind + bends away from you) ----------
  const blade = new THREE.PlaneGeometry(.1, 1, 1, 4); blade.translate(0, .5, 0);
  const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y * .85)); }
  const grass = [];
  const GRASS = { ',': [16, .7, 1.05, ['#5f9a37', '#6fae42', '#4f8a2e', '#7ab64b']], ';': [12, 1.0, 1.5, ['#7d9a46', '#94a957', '#a8964f', '#6f8f3d']],
    g: [16, .7, 1.1, ['#3f7a2f', '#4b8a37', '#35672a', '#5c9441']], r: [6, .4, .7, ['#9a9a5c', '#a9a26a', '#8c8f52']], '.': [3, .22, .4, ['#7fb24f', '#8cbd58', '#6ea545']], F: [3, .22, .4, ['#7fb24f']] };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const conf = GRASS[LB.MAP[ty][tx]]; if (!conf) continue;
    const [n, h0, h1, cs] = conf;
    for (let i = 0; i < n; i++) {
      const x = (tx + Math.random()) * S, z = (ty + Math.random()) * S;
      grass.push({ x, y: heightAt(x, z) - .02, z, ry: rand(0, 6.28), rx: rand(-.15, .15), sx: rand(.8, 1.4), sy: rand(h0, h1), sz: 1, c: cs[Math.floor(Math.random() * cs.length)] });
    }
  }
  const grassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: .9 });
  addWind(grassMat, uniforms, .22, true);
  instanced(blade, grassMat, grass, { cast: false });

  // ---------- flowers & pebbles ----------
  const flowers = [], pebbles = [];
  const fcols = ['#e8c34a', '#e07a5f', '#f4f1e8', '#b58ad6', '#f29fc5'];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const c = LB.MAP[ty][tx];
    const nf = c === 'F' ? 10 : (c === '.' && hash(tx, ty, 11) < .18) ? 3 : 0;
    for (let i = 0; i < nf; i++) { const x = (tx + Math.random()) * S, z = (ty + Math.random()) * S; flowers.push({ x, y: .18, z, s: rand(.08, .13), c: fcols[Math.floor(Math.random() * fcols.length)] }); }
    if (c === ':') for (let i = 0; i < 3; i++) { const x = (tx + Math.random()) * S, z = (ty + Math.random()) * S; pebbles.push({ x, y: .03, z, sx: rand(.08, .16), sy: .05, sz: rand(.08, .14), ry: rand(0, 6), c: '#b9a888' }); }
  }
  instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: .6, emissive: '#222' }), flowers, { cast: false });
  instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true }), pebbles, { cast: false });

  // ---------- rocks ----------
  const rocks = [];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const c = LB.MAP[ty][tx], ctr = tileCenter(tx, ty);
    if (c === 'R') { rocks.push({ x: ctr.x, y: .35, z: ctr.z, sx: rand(.85, 1.05), sy: rand(.6, .9), sz: rand(.8, 1), ry: rand(0, 6), c: '#8f8a80' }); rocks.push({ x: ctr.x + rand(-.6, .6), y: .2, z: ctr.z + rand(.3, .7), s: rand(.3, .45), ry: rand(0, 6), c: '#a19b8f' }); }
    if (c === 'r' && hash(tx, ty, 13) < .25) rocks.push({ x: ctr.x + rand(-.6, .6), y: .1, z: ctr.z + rand(-.6, .6), s: rand(.18, .32), ry: rand(0, 6), c: '#9c968a' });
  }
  instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: .95 }), rocks);

  // ---------- distant mountains ----------
  const mts = [];
  for (let i = 0; i < 16; i++) { const a = -0.3 + i * .18; mts.push({ x: W / 2 + Math.cos(a) * rand(70, 90), y: -1, z: H / 2 - Math.sin(a) * rand(55, 75) - 10, sx: rand(14, 22), sy: rand(12, 22), sz: rand(14, 22), ry: rand(0, 6), c: ['#6f8a6a', '#7d9277', '#64806a'][i % 3] }); }
  instanced(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: 1 }), mts.map(m => ({ ...m, y: m.sy / 2 - 1 })), { cast: false, receive: false });

  // ---------- buildings & landmarks ----------
  const lights = [];
  const box = (w, h, d, c, opts = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: .85, flatShading: true, ...opts })); m.castShadow = true; m.receiveShadow = true; return m; };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const c = LB.MAP[ty][tx], { x, z } = tileCenter(tx, ty);
    if (c === 'H') {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const walls = box(1.8, 1.25, 1.6, '#efe2c4'); walls.position.y = .62;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.05, 4), new THREE.MeshStandardMaterial({ color: '#b5552f', flatShading: true, roughness: .8 }));
      roof.rotation.y = Math.PI / 4; roof.position.y = 1.75; roof.castShadow = true;
      const door = box(.42, .7, .06, '#6b4420'); door.position.set(0, .35, .81);
      const winL = box(.3, .28, .05, '#ffd877', { emissive: '#ffb84a', emissiveIntensity: .7 }); winL.position.set(-.55, .78, .81);
      const winR = winL.clone(); winR.position.x = .55;
      const chim = box(.22, .6, .22, '#8b5a3c'); chim.position.set(.45, 2.0, -.2);
      g.add(walls, roof, door, winL, winR, chim); scene.add(g);
    }
    if (c === 'W') {
      const post = box(.12, .7, .12, '#8a5e33'); post.position.set(x - .95, .35, z);
      const rail1 = box(2, .08, .07, '#9a6b3c'); rail1.position.set(x, .5, z);
      const rail2 = rail1.clone(); rail2.position.y = .25;
      scene.add(post, rail1, rail2);
    }
    if (c === '=') {
      for (let i = 0; i < 6; i++) { const p = box(.3, .1, 1.8, i % 2 ? '#a8743f' : '#9a6a38'); p.position.set(x - .85 + i * .34, .08, z); scene.add(p); }
      const r1 = box(2, .08, .08, '#6b4420'); r1.position.set(x, .55, z - .85); const r2 = r1.clone(); r2.position.z = z + .85; scene.add(r1, r2);
      [-.9, .9].forEach(dz => { const p = box(.1, .55, .1, '#6b4420'); p.position.set(x - .9, .3, z + dz); scene.add(p); });
    }
    if (c === 'S') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, .85, .35, 8), new THREE.MeshStandardMaterial({ color: '#9a9182', flatShading: true })); base.position.set(x, .17, z); base.castShadow = base.receiveShadow = true;
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .9, 6), new THREE.MeshStandardMaterial({ color: '#8a8173', flatShading: true })); pil.position.set(x, .75, z); pil.castShadow = true;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.35, 0), new THREE.MeshStandardMaterial({ color: '#7fe6f5', emissive: '#4fd0e6', emissiveIntensity: 1.6, flatShading: true }));
      crystal.position.set(x, 1.7, z); crystal.userData.spin = 1; crystal.userData.baseY = 1.7;
      const pl = new THREE.PointLight('#6fe0f0', 9, 7, 2); pl.position.set(x, 1.8, z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#7fe6f5', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(2.4, 2.4, 1); glow.position.copy(crystal.position);
      scene.add(base, pil, crystal, pl, glow); lights.push({ crystal, glow });
    }
    if (c === 'P') {
      const st = box(.7, 2.4, .45, '#7f7a70'); st.position.set(x, 1.2, z); st.rotation.z = .06;
      const rune = new THREE.Mesh(new THREE.CircleGeometry(.16, 12), new THREE.MeshBasicMaterial({ color: '#ffc46e' })); rune.position.set(x, 1.6, z + .24);
      const pl = new THREE.PointLight('#ffb35a', 7, 6, 2); pl.position.set(x, 1.6, z + .6);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc46e', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(1.6, 1.6, 1); glow.position.set(x, 1.6, z + .3);
      scene.add(st, rune, pl, glow); lights.push({ glow });
    }
    if (c === 'M') {
      const counter = box(1.6, .7, .7, '#c79a5b'); counter.position.set(x, .35, z + .2);
      [-.75, .75].forEach(dx => { const p = box(.1, 1.7, .1, '#8a5e33'); p.position.set(x + dx, .85, z - .1); scene.add(p); });
      for (let i = 0; i < 6; i++) { const a = box(.3, .06, 1.1, i % 2 ? '#f5efe2' : '#2f7f86'); a.position.set(x - .75 + i * .3, 1.72, z + .15); a.rotation.x = -.25; scene.add(a); }
      ['#5fd6e6', '#86c24e', '#f08a3c'].forEach((cc, i) => { const l = box(.16, .22, .16, cc, { emissive: cc, emissiveIntensity: 1.2 }); l.position.set(x - .45 + i * .45, .82, z + .2); scene.add(l); });
      scene.add(counter);
    }
  }

  // ---------- fireflies ----------
  const FF = 150, ffGeo = new THREE.BufferGeometry(), ffPos = new Float32Array(FF * 3), ffBase = [];
  for (let i = 0; i < FF; i++) {
    let x, z, tries = 0;
    do { x = rand(0, W); z = rand(0, H); tries++; } while (!(LB.ZONES[charAt(x, z)] || charAt(x, z) === 'T') && tries < 30);
    ffBase.push({ x, z, y: rand(.4, 2), p: rand(0, 6.28) });
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ map: glowTex, color: '#fff3a0', size: .32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(fireflies);

  // ---------- falling leaves around the player ----------
  const LEAVES = 70, leafMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.16, .1), new THREE.MeshStandardMaterial({ color: '#fff', side: THREE.DoubleSide }), LEAVES);
  const leaves = []; const lc = ['#d98a2b', '#c9b03a', '#8fb04a', '#b8562a'];
  for (let i = 0; i < LEAVES; i++) { leaves.push({ x: 0, y: -10, z: 0, vx: 0, vy: 0, r: 0, rs: rand(1, 4) }); leafMesh.setColorAt(i, col.set(lc[i % 4])); }
  leafMesh.instanceColor.needsUpdate = true; scene.add(leafMesh);

  // ---------- clouds ----------
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cg = new THREE.Group();
    for (let j = 0; j < 4; j++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(2, 3.5), 1), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, emissive: '#cfe0ea', emissiveIntensity: .35 })); p.position.set(j * 2.4 - 3.6, rand(-.5, .5), rand(-1, 1)); p.scale.y = .55; cg.add(p); }
    cg.position.set(rand(-40, W + 40), rand(26, 34), rand(-40, H + 20)); cg.userData.v = rand(.4, .9); scene.add(cg); clouds.push(cg);
  }

  // ---------- per-frame update ----------
  let ft = 0;
  function update(t, dt, player) {
    uniforms.uTime.value = t; uniforms.uPlayer.value.set(player.x, 0, player.z);
    // sun + shadow camera follow the player
    sun.position.set(player.x - 12, 22, player.z + 10); sun.target.position.set(player.x, 0, player.z);
    sky.position.set(player.x, 0, player.z);
    // water waves
    const a = wg.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = wBase[i * 3], z = wBase[i * 3 + 2]; a.setY(i, wBase[i * 3 + 1] + Math.sin(z * .9 + t * 2.2) * .05 + Math.sin(x * 2.1 + t * 1.3) * .03); }
    a.needsUpdate = true; if ((ft++ & 3) === 0) wg.computeVertexNormals();
    // fireflies
    for (let i = 0; i < FF; i++) { const f = ffBase[i]; ffPos[i * 3] = f.x + Math.sin(t * .6 + f.p) * .6; ffPos[i * 3 + 1] = f.y + Math.sin(t * 1.3 + f.p * 2) * .3; ffPos[i * 3 + 2] = f.z + Math.cos(t * .5 + f.p) * .6; }
    ffGeo.attributes.position.needsUpdate = true;
    fireflies.material.opacity = .55 + Math.sin(t * 3) * .25;
    // leaves
    leaves.forEach((l, i) => {
      if (l.y < 0) { l.x = player.x + rand(-11, 11); l.z = player.z + rand(-9, 7); l.y = rand(4, 7); l.vx = rand(-.3, .3); l.vy = rand(.4, .8); }
      l.y -= l.vy * dt; l.x += (l.vx + Math.sin(t * 1.5 + i) * .5) * dt; l.r += l.rs * dt;
      dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.r, l.r * .7, l.r * .3); dummy.scale.setScalar(1); dummy.updateMatrix(); leafMesh.setMatrixAt(i, dummy.matrix);
    });
    leafMesh.instanceMatrix.needsUpdate = true;
    lights.forEach(L => { if (L.crystal) { L.crystal.rotation.y += dt * 1.5; L.crystal.position.y = L.crystal.userData.baseY + Math.sin(t * 2) * .12; L.glow.position.y = L.crystal.position.y; } L.glow.material.opacity = .7 + Math.sin(t * 2.5) * .25; });
    clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > W + 60) c.position.x = -60; });
  }
  return { update, heightAt, glowTex };
}
