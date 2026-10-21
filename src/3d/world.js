// ============================================================
// Lanternbound 3D — the world: terrain, river, forest, tall grass,
// buildings, sky, light and ambient life (fireflies, falling leaves).
// Built from the same tile map as before (src/map.js): 1 tile = S world units.
// ============================================================
import * as THREE from 'three';

export const S = 2;              // world units per map tile
const PAD = 14;                  // tiles of scenery drawn around the playable map

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

// ---- liquid mask (water or lava tiles), sampled smoothly so banks are soft ----
let LIQ = null, HILLS = 1;
function buildLiquidMask() {
  const MW = LB.MW, MH = LB.MH; LIQ = new Float32Array(MW * MH);
  const isL = (x, y) => LB.MAP[y] && (LB.MAP[y][x] === '~');
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    let v = isL(x, y) ? 1 : 0;
    // border tiles continue a river/lava flow out of the map
    if (!v && (x === 0 || x === MW - 1 || y === 0 || y === MH - 1)) { const ix = Math.min(MW - 2, Math.max(1, x)), iy = Math.min(MH - 2, Math.max(1, y)); if (isL(ix, iy)) v = 1; }
    LIQ[y * MW + x] = v;
  }
}
export function liquidAt(x, z) {
  if (!LIQ) return 0;
  const MW = LB.MW, MH = LB.MH;
  const fx = Math.min(MW - 1, Math.max(0, x / S - .5)), fz = Math.min(MH - 1, Math.max(0, z / S - .5));
  const x0 = Math.floor(fx), z0 = Math.floor(fz), x1 = Math.min(MW - 1, x0 + 1), z1 = Math.min(MH - 1, z0 + 1), u = fx - x0, v = fz - z0;
  const g = (a, b) => LIQ[b * MW + a];
  return (g(x0, z0) * (1 - u) + g(x1, z0) * u) * (1 - v) + (g(x0, z1) * (1 - u) + g(x1, z1) * u) * v;
}

// Ground height at a world position (flat where you play, liquid channels, hills/walls around the edge)
export function heightAt(x, z) {
  const W = LB.MW * S, H = LB.MH * S;
  const out = Math.max(0, -x, x - W, -z, z - H);
  let h = 0;
  if (out > 0) h += (Math.min(5, Math.pow(out / S, 1.3) * .35) + vnoise(x * .15, z * .15) * Math.min(1, out / 6) * 2.2) * HILLS;
  h -= .75 * smooth(.3, .72, liquidAt(x, z));
  if (out === 0) h += (vnoise(x * .35, z * .35) - .5) * .06;
  return h;
}

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
    sh.uniforms.uTime = uniforms.uTime; sh.uniforms.uPlayer = uniforms.uPlayer; sh.uniforms.uWind = uniforms.uWind;
    sh.vertexShader = 'uniform float uTime;\nuniform vec3 uPlayer;\nuniform float uWind;\nvarying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float hgt = max(position.y, 0.0);
      vH = clamp(position.y, 0.0, 1.0);
      float w = (sin(uTime * 1.7 * (0.6 + 0.4 * uWind) + wp.x * 0.55 + wp.z * 0.35) + (uWind - 1.0) * 0.8) * ${bend.toFixed(3)} * hgt * uWind;
      transformed.x += w; transformed.z += w * 0.45;
      ${grass ? `
      vec2 away = wp.xz - uPlayer.xz; float dd = length(away);
      float push = max(0.0, 1.0 - dd / 1.3) * 0.55 * hgt;
      if (dd > 0.001) { transformed.x += away.x / dd * push; transformed.z += away.y / dd * push; transformed.y -= push * 0.35; }` : ''}
    `);
    if (grass) sh.fragmentShader = 'varying float vH;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.55, 1.12, vH);');
  };
}

export function buildWorld(scene, renderer, glowTex) {
  const ST = LB.STAGES[LB.STAGE] || LB.STAGES.valley, TH = ST.theme;
  const MW = LB.MW, MH = LB.MH, W = MW * S, H = MH * S;
  const uniforms = { uTime: { value: 0 }, uPlayer: { value: new THREE.Vector3() }, uWind: { value: 1 } };
  glowTex = glowTex || glowTexture();
  const root = new THREE.Group(); scene.add(root);
  const add = (...o) => root.add(...o);
  buildLiquidMask(); HILLS = TH.hills || 1;
  const col = new THREE.Color();

  // ---------- sky, fog, light ----------
  scene.background = new THREE.Color(TH.bg);
  scene.fog = new THREE.Fog(TH.fog[0], TH.fog[1], TH.fog[2]);
  if (renderer) renderer.toneMappingExposure = TH.exposure || 1.05;
  const skyGeo = new THREE.SphereGeometry(180, 24, 12);
  const skyCols = []; const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 180; const c = new THREE.Color(TH.sky[0]).lerp(new THREE.Color(TH.sky[1]), Math.max(0, y) ** .6); skyCols.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  add(sky);
  if (TH.stars) {
    const sp = []; for (let i = 0; i < 700; i++) { const a = rand(0, 6.28), e = rand(.08, 1.4); sp.push(Math.cos(a) * Math.cos(e) * 170, Math.sin(e) * 170, Math.sin(a) * Math.cos(e) * 170); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sky.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#e8eeff', size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: .85 })));
  }
  if (TH.moon) {
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#eef3ff', fog: false, depthWrite: false })); moon.scale.set(26, 26, 1); moon.position.set(-60, 70, -120);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ color: '#f4f6ff', fog: false })); disc.position.set(-60, 70, -119.5); disc.lookAt(0, 0, 0);
    sky.add(moon, disc);
  }

  const hemi = new THREE.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]); add(hemi);
  const sun = new THREE.DirectionalLight(TH.sun[0], TH.sun[1]);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  add(sun, sun.target);

  // ---------- terrain ----------
  const GW = W + PAD * 2 * S, GH = H + PAD * 2 * S, segX = (MW + PAD * 2) * 3, segZ = (MH + PAD * 2) * 3;
  const g = new THREE.PlaneGeometry(GW, GH, segX, segZ); g.rotateX(-Math.PI / 2); g.translate(W / 2, 0, H / 2);
  const gp = g.attributes.position, cols = [];
  const out0 = new THREE.Color(TH.outside[0]), out1 = new THREE.Color(TH.outside[1]), bank = new THREE.Color(TH.bank);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    gp.setY(i, heightAt(x, z));
    const c = charAt(x - .01, z - .01);
    if (c) col.set(TH.ground[c] || TH.ground['.'] || '#7cab4c'); else col.copy(out0).lerp(out1, vnoise(x * .2, z * .2) * .6);
    const lq = liquidAt(x, z); if (lq > .25) col.lerp(bank, Math.min(1, (lq - .25) * 3));
    const n = (vnoise(x * .9, z * .9) - .5) * .16; col.offsetHSL(0, 0, n);
    cols.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }));
  ground.receiveShadow = true; add(ground);

  // ---------- liquid (water or lava) ----------
  const L = TH.liquid, hasLiquid = LIQ.some(v => v > 0);
  let wg = null, wBase = null, liquidMat = null;
  if (hasLiquid) {
    wg = new THREE.PlaneGeometry(GW, GH, 90, 66); wg.rotateX(-Math.PI / 2); wg.translate(W / 2, L.y, H / 2);
    liquidMat = new THREE.MeshStandardMaterial({ color: L.color, transparent: L.opacity < 1, opacity: L.opacity, roughness: L.rough, metalness: L.metal, emissive: L.emissive || '#000000', emissiveIntensity: L.glow || .6 });
    const water = new THREE.Mesh(wg, liquidMat); water.receiveShadow = !L.lava; add(water);
    wBase = Float32Array.from(wg.attributes.position.array);
  }

  // ---------- instanced helpers ----------
  const dummy = new THREE.Object3D();
  function instanced(geo, mat, list, { cast = true, receive = true } = {}) {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      dummy.scale.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      if (it.c) m.setColorAt(i, col.set(it.c));
    });
    m.castShadow = cast; m.receiveShadow = receive;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    add(m); return m;
  }
  const pickc = a => a[Math.floor(Math.random() * a.length)];

  // ---------- trees / spires: map tiles 'T' + a dense ring around the map ----------
  const trunks = [], canA = [], canB = [], pine1 = [], pine2 = [], pine3 = [], spires = [], spireTips = [];
  const greens = TH.greens;
  function addTree(x, z, s, kind) {
    const y = heightAt(x, z), gc = pickc(greens);
    if (kind === 'pine') {
      trunks.push({ x, y: y + .6 * s, z, sx: s * .8, sy: s * .9, sz: s * .8, c: TH.trunk });
      pine1.push({ x, y: y + 1.7 * s, z, s: s * 1.15, ry: rand(0, 6), c: gc });
      pine2.push({ x, y: y + 2.55 * s, z, s: s * .95, ry: rand(0, 6), c: gc });
      pine3.push({ x, y: y + 3.3 * s, z, s: s * .75, ry: rand(0, 6), c: gc });
    } else if (kind === 'spire') {
      const h = rand(2.2, 4.2) * s;
      spires.push({ x, y: y + h / 2 - .1, z, sx: s * rand(.7, 1), sy: h, sz: s * rand(.7, 1), ry: rand(0, 6), rx: rand(-.06, .06), c: gc });
      if (Math.random() < .5) spires.push({ x: x + rand(-.6, .6), y: y + h * .25, z: z + rand(-.6, .6), sx: s * .45, sy: h * .5, sz: s * .45, ry: rand(0, 6), c: pickc(greens) });
      if (TH.tipGlow && Math.random() < .35) spireTips.push({ x, y: y + h * .78, z, s: s * rand(.18, .28), ry: rand(0, 6), c: TH.tipGlow });
    } else if (kind === 'dead') {
      const h = rand(1.1, 1.6) * s;
      trunks.push({ x, y: y + .8 * h, z, sx: s * .7, sy: h, sz: s * .7, rz: rand(-.12, .12), c: TH.trunk });
      canB.push({ x: x + rand(-.3, .3), y: y + 1.75 * h, z: z + rand(-.3, .3), sx: s * .5, sy: s * .35, sz: s * .5, ry: rand(0, 6), c: gc });
      if (TH.tipGlow && Math.random() < .3) spireTips.push({ x, y: y + 1.55 * h, z, s: s * .14, c: TH.tipGlow });
    } else {
      trunks.push({ x, y: y + .8 * s, z, s, c: TH.trunk });
      canA.push({ x, y: y + 2.2 * s, z, s: s * rand(1, 1.2), ry: rand(0, 6), c: gc });
      canB.push({ x: x + rand(-.4, .4) * s, y: y + 2.95 * s, z: z + rand(-.4, .4) * s, s: s * rand(.65, .85), ry: rand(0, 6), c: greens[(greens.indexOf(gc) + 1) % greens.length] });
    }
  }
  const kindFor = (tx, ty, outside) => {
    if (TH.trees === 'valley') return outside ? (hash(tx, ty, 6) < .45 ? 'pine' : 'round') : ((ty <= 8 && tx >= 20) || hash(tx, ty, 3) < .35 ? 'pine' : 'round');
    if (TH.trees === 'dead') return hash(tx, ty, 6) < .45 ? 'spire' : 'dead';
    return TH.trees;
  };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (LB.MAP[ty][tx] !== 'T') continue;
    const c = tileCenter(tx, ty); if (liquidAt(c.x, c.z) > .3) continue;
    addTree(c.x + rand(-.3, .3), c.z + rand(-.3, .3), rand(.85, 1.15), kindFor(tx, ty, false));
  }
  const ringDensity = TH.trees === 'spire' ? .8 : .62;
  for (let tz = -PAD; tz < MH + PAD; tz++) for (let tx = -PAD; tx < MW + PAD; tx++) {
    if (tx >= 0 && tx < MW && tz >= 0 && tz < MH) continue;
    if (hash(tx, tz, 5) > ringDensity) continue;
    const x = (tx + .5) * S + rand(-.7, .7), z = (tz + .5) * S + rand(-.7, .7);
    if (liquidAt(x, z) > .15) continue;
    addTree(x, z, rand(.9, 1.5) * (TH.trees === 'spire' ? 1.4 : 1), kindFor(tx, tz, true));
  }
  const treeMat = c => { const m = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .85 }); addWind(m, uniforms, c, false); return m; };
  instanced(new THREE.CylinderGeometry(.14, .22, 1.6, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .9 }), trunks);
  instanced(new THREE.IcosahedronGeometry(1.05, 0), treeMat(.05), canA);
  instanced(new THREE.IcosahedronGeometry(.85, 0), treeMat(TH.trees === 'dead' ? 0 : .07), canB);
  instanced(new THREE.ConeGeometry(1.05, 1.5, 7), treeMat(.04), pine1);
  instanced(new THREE.ConeGeometry(.85, 1.3, 7), treeMat(.06), pine2);
  instanced(new THREE.ConeGeometry(.6, 1.1, 7), treeMat(.08), pine3);
  instanced(new THREE.ConeGeometry(.75, 1, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .7, metalness: .1 }), spires);
  instanced(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: TH.tipGlow || '#000', emissiveIntensity: 1.4, flatShading: true }), spireTips, { cast: false });

  // ---------- grass / reeds / glowing tufts (wind + bends away from you) ----------
  const blade = new THREE.PlaneGeometry(.1, 1, 1, 4); blade.translate(0, .5, 0);
  const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y * .85)); }
  const grass = [];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const conf = TH.grass[LB.MAP[ty][tx]]; if (!conf) continue;
    const [n, h0, h1, cs] = conf;
    for (let i = 0; i < n; i++) {
      const x = (tx + Math.random()) * S, z = (ty + Math.random()) * S;
      grass.push({ x, y: heightAt(x, z) - .02, z, ry: rand(0, 6.28), rx: rand(-.15, .15), sx: rand(.8, 1.4), sy: rand(h0, h1), sz: 1, c: pickc(cs) });
    }
  }
  const grassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: .9 });
  if (TH.grassGlow) { grassMat.emissive = new THREE.Color('#ffffff'); grassMat.emissiveIntensity = TH.grassGlow * .35; }
  addWind(grassMat, uniforms, .22, true);
  const gm = instanced(blade, grassMat, grass, { cast: false });
  if (gm && TH.grassGlow) { gm.material.onBeforeCompile = ((orig) => sh => { orig(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= diffuseColor.rgb;'); })(gm.material.onBeforeCompile); }

  // ---------- glowing mushrooms (caverns) ----------
  const caps = [], stems = [];
  if (TH.mushrooms) for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const c = LB.MAP[ty][tx]; if (!TH.mushrooms.includes(c) || hash(tx, ty, 21) > (c === 'm' ? .55 : .2)) continue;
    const n = Math.floor(rand(1, 4));
    for (let i = 0; i < n; i++) { const x = (tx + rand(.15, .85)) * S, z = (ty + rand(.15, .85)) * S, s = rand(.18, .4); stems.push({ x, y: s * .9, z, sx: s * .35, sy: s * 1.8, sz: s * .35, c: '#d8d0e8' }); caps.push({ x, y: s * 1.8, z, sx: s, sy: s * .55, sz: s, c: pickc(['#5fe0c0', '#7fb0ff', '#c08cff', '#ff8fd0']) }); }
  }
  instanced(new THREE.CylinderGeometry(.5, .6, 1, 6), new THREE.MeshStandardMaterial({ color: '#fff', roughness: .8 }), stems, { cast: false });
  const capMat = new THREE.MeshStandardMaterial({ color: '#fff', roughness: .5, emissive: '#ffffff', emissiveIntensity: .55 });
  capMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= diffuseColor.rgb;'); };
  instanced(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat, caps, { cast: false });

  // ---------- flowers & pebbles ----------
  const flowers = [], pebbles = [];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const c = LB.MAP[ty][tx];
    if (TH.flowers) {
      const nf = c === 'F' ? 10 : ((c === '.' || c === 'n') && hash(tx, ty, 11) < .18) ? 3 : 0;
      for (let i = 0; i < nf; i++) { const x = (tx + Math.random()) * S, z = (ty + Math.random()) * S; flowers.push({ x, y: .18, z, s: rand(.08, .13), c: pickc(TH.flowers) }); }
    }
    if (c === ':') for (let i = 0; i < 3; i++) { const x = (tx + Math.random()) * S, z = (ty + Math.random()) * S; pebbles.push({ x, y: .03, z, sx: rand(.08, .16), sy: .05, sz: rand(.08, .14), ry: rand(0, 6), c: TH.ground[':'] ? new THREE.Color(TH.ground[':']).offsetHSL(0, 0, -.08).getStyle() : '#b9a888' }); }
  }
  instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: .6, emissive: TH.stars ? '#556' : '#222' }), flowers, { cast: false });
  instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true }), pebbles, { cast: false });

  // ---------- rocks ----------
  const rocks = [];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const c = LB.MAP[ty][tx], ctr = tileCenter(tx, ty);
    if (c === 'R') { rocks.push({ x: ctr.x, y: .35, z: ctr.z, sx: rand(.85, 1.05), sy: rand(.6, .9), sz: rand(.8, 1), ry: rand(0, 6), c: TH.rock }); rocks.push({ x: ctr.x + rand(-.6, .6), y: .2, z: ctr.z + rand(.3, .7), s: rand(.3, .45), ry: rand(0, 6), c: new THREE.Color(TH.rock).offsetHSL(0, 0, .05).getStyle() }); }
    if ((c === 'r' || c === 'h') && hash(tx, ty, 13) < .25) rocks.push({ x: ctr.x + rand(-.6, .6), y: .1, z: ctr.z + rand(-.6, .6), s: rand(.18, .32), ry: rand(0, 6), c: TH.rock });
  }
  instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: .95 }), rocks);

  // ---------- distant mountains (a smoking volcano in Ember Hollow) ----------
  if (TH.mountains) {
    const mts = [];
    for (let i = 0; i < 16; i++) { const a = -0.3 + i * .18; mts.push({ x: W / 2 + Math.cos(a) * rand(70, 90), y: -1, z: H / 2 - Math.sin(a) * rand(55, 75) - 10, sx: rand(14, 22), sy: rand(12, 22), sz: rand(14, 22), ry: rand(0, 6), c: TH.mountains[i % TH.mountains.length] }); }
    if (TH.volcano) mts.push({ x: W / 2 + 10, y: -1, z: -62, sx: 34, sy: 36, sz: 34, ry: 0, c: '#2a1a18' });
    instanced(new THREE.ConeGeometry(1, 1, 6), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, roughness: 1 }), mts.map(m => ({ ...m, y: m.sy / 2 - 1 })), { cast: false, receive: false });
    if (TH.volcano) { const vg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff6a2a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); vg.scale.set(30, 18, 1); vg.position.set(W / 2 + 10, 34, -62); add(vg); }
  }

  // ---------- buildings & landmarks ----------
  const lights = []; let pointLights = 0; const MAXPL = 7;
  const plight = (c, i, d, x, y, z) => { if (pointLights >= MAXPL) return null; pointLights++; const l = new THREE.PointLight(c, i, d, 2); l.position.set(x, y, z); add(l); return l; };
  const glowSprite = (c, s, x, y, z, o = 1) => { const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })); gs.scale.set(s, s, 1); gs.position.set(x, y, z); add(gs); return gs; };
  const box = (w, h, d, c, opts = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: .85, flatShading: true, ...opts })); m.castShadow = true; m.receiveShadow = true; return m; };
  let portal = null, arena = null;
  // landmarks with lights first (shrine, portal) so they always get one
  const order = []; for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) order.push([tx, ty]);
  const prio = c => ({ S: 0, O: 1, P: 2, L: 3, C: 4 })[c] ?? 9;
  order.sort((a, b) => prio(LB.MAP[a[1]][a[0]]) - prio(LB.MAP[b[1]][b[0]]));
  let arenaSum = [0, 0, 0];
  for (const [tx, ty] of order) {
    const c = LB.MAP[ty][tx], { x, z } = tileCenter(tx, ty);
    if (c === 'A') { arenaSum[0] += x; arenaSum[1] += z; arenaSum[2]++; }
    if (c === 'H') {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const walls = box(1.8, 1.25, 1.6, '#efe2c4'); walls.position.y = .62;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 1.05, 4), new THREE.MeshStandardMaterial({ color: '#b5552f', flatShading: true, roughness: .8 }));
      roof.rotation.y = Math.PI / 4; roof.position.y = 1.75; roof.castShadow = true;
      const door = box(.42, .7, .06, '#6b4420'); door.position.set(0, .35, .81);
      const winL = box(.3, .28, .05, '#ffd877', { emissive: '#ffb84a', emissiveIntensity: .7 }); winL.position.set(-.55, .78, .81);
      const winR = winL.clone(); winR.position.x = .55;
      const chim = box(.22, .6, .22, '#8b5a3c'); chim.position.set(.45, 2.0, -.2);
      g.add(walls, roof, door, winL, winR, chim); add(g);
    }
    if (c === 'W') {
      const post = box(.12, .7, .12, '#8a5e33'); post.position.set(x - .95, .35, z);
      const rail1 = box(2, .08, .07, '#9a6b3c'); rail1.position.set(x, .5, z);
      const rail2 = rail1.clone(); rail2.position.y = .25;
      add(post, rail1, rail2);
    }
    if (c === '=') {
      const stone = LB.STAGE === 'ember' || LB.STAGE === 'caverns';
      const vert = LB.MAP[ty - 1] && LB.MAP[ty - 1][tx] === '=' || LB.MAP[ty + 1] && LB.MAP[ty + 1][tx] === '=';
      const grp = new THREE.Group(); grp.position.set(x, 0, z); if (vert && !(LB.MAP[ty][tx - 1] === '=' || LB.MAP[ty][tx + 1] === '=')) grp.rotation.y = Math.PI / 2;
      for (let i = 0; i < 6; i++) { const p = box(.3, stone ? .2 : .1, 1.8, stone ? (i % 2 ? '#5a5458' : '#4c474c') : (i % 2 ? '#a8743f' : '#9a6a38')); p.position.set(-.85 + i * .34, stone ? .02 : .08, 0); grp.add(p); }
      if (!stone) { const r1 = box(2, .08, .08, '#6b4420'); r1.position.set(0, .55, -.85); const r2 = r1.clone(); r2.position.z = .85; grp.add(r1, r2); [-.9, .9].forEach(dz => { const p = box(.1, .55, .1, '#6b4420'); p.position.set(-.9, .3, dz); grp.add(p); }); }
      add(grp);
    }
    if (c === 'S') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, .85, .35, 8), new THREE.MeshStandardMaterial({ color: '#9a9182', flatShading: true })); base.position.set(x, .17, z); base.castShadow = base.receiveShadow = true;
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .9, 6), new THREE.MeshStandardMaterial({ color: '#8a8173', flatShading: true })); pil.position.set(x, .75, z); pil.castShadow = true;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.35, 0), new THREE.MeshStandardMaterial({ color: '#7fe6f5', emissive: '#4fd0e6', emissiveIntensity: 1.6, flatShading: true }));
      crystal.position.set(x, 1.7, z); crystal.userData.baseY = 1.7;
      plight('#6fe0f0', 9, 7, x, 1.8, z);
      const glow = glowSprite('#7fe6f5', 2.4, x, 1.7, z);
      add(base, pil, crystal); lights.push({ crystal, glow });
    }
    if (c === 'O') {
      const pc = TH.portal || '#9feaf2';
      const grp = new THREE.Group(); grp.position.set(x, 0, z);
      const archMat = new THREE.MeshStandardMaterial({ color: '#8a8173', flatShading: true, roughness: .9 });
      [-1, 1].forEach(sx => { const p = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.6, .45), archMat); p.position.set(sx * 1.05, 1.3, 0); p.castShadow = true; grp.add(p); });
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, .35, .5), archMat); top.position.y = 2.7; top.castShadow = true; grp.add(top);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.85, .07, 8, 40), new THREE.MeshStandardMaterial({ color: pc, emissive: pc, emissiveIntensity: 1.3 })); ring.position.y = 1.3; grp.add(ring);
      const swirl = new THREE.Mesh(new THREE.CircleGeometry(.8, 40), new THREE.MeshBasicMaterial({ map: glowTex, color: pc, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); swirl.position.y = 1.3; grp.add(swirl);
      add(grp); plight(pc, 8, 7, x, 1.4, z + .8);
      portal = { grp, ring, swirl, x, z, glow: glowSprite(pc, 2.2, x, 1.3, z, .6) };
      lights.push({ glow: portal.glow });
    }
    if (c === 'P') {
      const st = box(.7, 2.4, .45, '#7f7a70'); st.position.set(x, 1.2, z); st.rotation.z = .06;
      const rune = new THREE.Mesh(new THREE.CircleGeometry(.16, 12), new THREE.MeshBasicMaterial({ color: '#ffc46e' })); rune.position.set(x, 1.6, z + .24);
      plight('#ffb35a', 7, 6, x, 1.6, z + .6);
      add(st, rune); lights.push({ glow: glowSprite('#ffc46e', 1.6, x, 1.6, z + .3) });
    }
    if (c === 'L') {   // lamp post
      const post = box(.12, 1.8, .12, '#2b2a30'); post.position.set(x, .9, z);
      const lamp = box(.3, .34, .3, '#ffd48a', { emissive: '#ffb84a', emissiveIntensity: 2 }); lamp.position.set(x, 1.95, z);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(.28, .22, 4), new THREE.MeshStandardMaterial({ color: '#2b2a30', flatShading: true })); cap.position.set(x, 2.22, z); cap.rotation.y = Math.PI / 4;
      add(post, lamp, cap); plight('#ffb35a', 6, 8, x, 1.9, z);
      lights.push({ glow: glowSprite('#ffc46e', 1.8, x, 1.95, z) });
    }
    if (c === 'C') {   // crystal cluster
      const cc = pickc(TH.crystals || ['#7fe6f5']);
      const mat = new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 1.1, flatShading: true, roughness: .2, metalness: .1, transparent: true, opacity: .92 });
      for (let i = 0; i < 5; i++) { const h = rand(.8, 1.9) * (i ? .7 : 1); const m = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat); m.scale.set(rand(.18, .3), h, rand(.18, .3)); m.position.set(x + (i ? rand(-.5, .5) : 0), h * .55, z + (i ? rand(-.5, .5) : 0)); m.rotation.set(rand(-.35, .35), rand(0, 6), rand(-.35, .35)); m.castShadow = true; add(m); }
      plight(cc, 5, 6, x, 1.2, z);
      lights.push({ glow: glowSprite(cc, 2.6, x, 1, z, .8) });
    }
    if (c === 'M') {
      const counter = box(1.6, .7, .7, '#c79a5b'); counter.position.set(x, .35, z + .2);
      [-.75, .75].forEach(dx => { const p = box(.1, 1.7, .1, '#8a5e33'); p.position.set(x + dx, .85, z - .1); add(p); });
      for (let i = 0; i < 6; i++) { const a = box(.3, .06, 1.1, i % 2 ? '#f5efe2' : '#2f7f86'); a.position.set(x - .75 + i * .3, 1.72, z + .15); a.rotation.x = -.25; add(a); }
      ['#5fd6e6', '#86c24e', '#f08a3c'].forEach((cc, i) => { const l = box(.16, .22, .16, cc, { emissive: cc, emissiveIntensity: 1.2 }); l.position.set(x - .45 + i * .45, .82, z + .2); add(l); });
      add(counter);
    }
  }
  // alpha arena: a rune circle on the ground
  if (arenaSum[2]) {
    const ax = arenaSum[0] / arenaSum[2], az = arenaSum[1] / arenaSum[2];
    const rc = document.createElement('canvas'); rc.width = rc.height = 256; const r = rc.getContext('2d');
    r.strokeStyle = '#fff'; r.lineWidth = 6; r.translate(128, 128);
    [118, 92].forEach(R => { r.beginPath(); r.arc(0, 0, R, 0, 7); r.stroke(); });
    for (let i = 0; i < 12; i++) { r.save(); r.rotate(i * Math.PI / 6); r.beginPath(); r.moveTo(0, -92); r.lineTo(10, -105); r.lineTo(0, -116); r.lineTo(-10, -105); r.closePath(); r.stroke(); r.restore(); }
    r.beginPath(); for (let i = 0; i < 7; i++) { const a = i * Math.PI * 4 / 7 - Math.PI / 2; r.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); } r.stroke();
    const tex = new THREE.CanvasTexture(rc);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: tex, color: TH.portal || '#ffc46e', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    decal.rotation.x = -Math.PI / 2; decal.position.set(ax, .05, az); add(decal); arena = { decal, x: ax, z: az };
  }

  // ---------- floating particles: fireflies / cave motes / rising embers ----------
  const PT = TH.particles || { kind: 'fireflies', color: '#fff3a0', n: 150 };
  const FF = PT.n, ffGeo = new THREE.BufferGeometry(), ffPos = new Float32Array(FF * 3), ffBase = [];
  for (let i = 0; i < FF; i++) {
    let x, z, tries = 0;
    do { x = rand(-6, W + 6); z = rand(-6, H + 6); tries++; } while (PT.kind === 'fireflies' && !(LB.ZONES[charAt(x, z)] || charAt(x, z) === 'T' || charAt(x, z) === '~') && tries < 30);
    ffBase.push({ x, z, y: rand(.4, PT.kind === 'embers' ? 6 : 2.4), p: rand(0, 6.28), v: rand(.6, 1.4) });
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ map: glowTex, color: PT.color, size: PT.kind === 'embers' ? .22 : .32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  add(fireflies);

  // ---------- falling leaves / ash / petals around the player ----------
  const FALL = TH.falling, LEAVES = FALL ? 70 : 0;
  let leafMesh = null; const leaves = [];
  if (FALL) {
    leafMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(FALL.kind === 'ash' ? .08 : .16, FALL.kind === 'ash' ? .08 : .1), new THREE.MeshStandardMaterial({ color: '#fff', side: THREE.DoubleSide, emissive: FALL.kind === 'petals' ? '#334' : '#000' }), LEAVES);
    for (let i = 0; i < LEAVES; i++) { leaves.push({ x: 0, y: -10, z: 0, vx: 0, vy: 0, r: 0, rs: rand(1, 4) }); leafMesh.setColorAt(i, col.set(FALL.colors[i % FALL.colors.length])); }
    leafMesh.instanceColor.needsUpdate = true; add(leafMesh);
  }

  // ---------- mist over the lake ----------
  const mists = [];
  if (TH.mist) for (let i = 0; i < 26; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#c8d8ff', transparent: true, opacity: .13, depthWrite: false }));
    const s = rand(6, 11); m.scale.set(s, s * .3, 1); let mx, mz, tries = 0; do { mx = rand(4, W - 4); mz = rand(4, H - 4); } while (liquidAt(mx, mz) < .6 && ++tries < 40); m.position.set(mx, rand(.3, .8), mz); m.userData.v = rand(.2, .5); add(m); mists.push(m);
  }

  // ---------- clouds / smoke ----------
  const clouds = [];
  if (TH.clouds) for (let i = 0; i < 9; i++) {
    const cg = new THREE.Group(), smoke = LB.STAGE === 'ember';
    for (let j = 0; j < 4; j++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(2, 3.5), 1), new THREE.MeshStandardMaterial({ color: TH.clouds, flatShading: true, roughness: 1, emissive: smoke ? '#2a1410' : '#cfe0ea', emissiveIntensity: .35, transparent: smoke, opacity: smoke ? .7 : 1 })); p.position.set(j * 2.4 - 3.6, rand(-.5, .5), rand(-1, 1)); p.scale.y = .55; cg.add(p); }
    cg.position.set(rand(-40, W + 40), rand(26, 34), rand(-40, H + 20)); cg.userData.v = rand(.4, .9); add(cg); clouds.push(cg);
  }

  // ---------- per-frame update ----------
  let ft = 0;
  function update(t, dt, player) {
    uniforms.uTime.value = t; uniforms.uPlayer.value.set(player.x, 0, player.z);
    sun.position.set(player.x - 12, 22, player.z + 10); sun.target.position.set(player.x, 0, player.z);
    sky.position.set(player.x, 0, player.z);
    if (wg) {
      const a = wg.attributes.position, sp = L.lava ? .6 : 2.2, amp = L.lava ? .07 : .05;
      // only animate vertices near the player (the rest is out of view)
      for (let i = 0; i < a.count; i++) { const x = wBase[i * 3], z = wBase[i * 3 + 2]; if (Math.abs(x - player.x) > 34 || Math.abs(z - player.z) > 28) continue; a.setY(i, wBase[i * 3 + 1] + Math.sin(z * .9 + t * sp) * amp + Math.sin(x * 2.1 + t * sp * .6) * amp * .6); }
      a.needsUpdate = true; if ((ft++ & 3) === 0) wg.computeVertexNormals();
      if (L.lava) liquidMat.emissiveIntensity = (L.glow || 1.6) * (.85 + Math.sin(t * 1.3) * .15);
    }
    for (let i = 0; i < FF; i++) {
      const f = ffBase[i];
      if (PT.kind === 'embers') { f.y += dt * f.v * 1.2; if (f.y > 7) { f.y = 0; f.x = player.x + rand(-18, 18); f.z = player.z + rand(-14, 10); } ffPos[i * 3] = f.x + Math.sin(t * 2 + f.p) * .3; ffPos[i * 3 + 1] = f.y; ffPos[i * 3 + 2] = f.z; }
      else { ffPos[i * 3] = f.x + Math.sin(t * .6 * f.v + f.p) * .6; ffPos[i * 3 + 1] = f.y + Math.sin(t * 1.3 + f.p * 2) * .3; ffPos[i * 3 + 2] = f.z + Math.cos(t * .5 + f.p) * .6; }
    }
    ffGeo.attributes.position.needsUpdate = true;
    fireflies.material.opacity = .6 + Math.sin(t * 3) * .25;
    if (leafMesh) {
      leaves.forEach((l, i) => {
        if (l.y < 0) { l.x = player.x + rand(-11, 11); l.z = player.z + rand(-9, 7); l.y = rand(4, 7); l.vx = rand(-.3, .3); l.vy = rand(.4, .8) * (FALL.kind === 'ash' ? .5 : 1); }
        l.y -= l.vy * dt; l.x += (l.vx + Math.sin(t * 1.5 + i) * .5) * dt; l.r += l.rs * dt;
        dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.r, l.r * .7, l.r * .3); dummy.scale.setScalar(1); dummy.updateMatrix(); leafMesh.setMatrixAt(i, dummy.matrix);
      });
      leafMesh.instanceMatrix.needsUpdate = true;
    }
    mists.forEach((m, i) => { m.material.opacity = .1 + Math.sin(t * .4 + i) * .04; m.position.x += Math.sin(t * .1 + i) * m.userData.v * dt; });
    lights.forEach(Lt => { if (Lt.crystal) { Lt.crystal.rotation.y += dt * 1.5; Lt.crystal.position.y = Lt.crystal.userData.baseY + Math.sin(t * 2) * .12; Lt.glow.position.y = Lt.crystal.position.y; } Lt.glow.material.opacity = .7 + Math.sin(t * 2.5 + Lt.glow.position.x) * .25; });
    if (portal) { portal.ring.rotation.z += dt * .8; portal.swirl.rotation.z -= dt * 2.4; portal.swirl.material.opacity = .35 + Math.sin(t * 3) * .12; }
    if (arena) arena.decal.rotation.z += dt * .1;
    clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > W + 60) c.position.x = -60; });
  }
  function dispose() {
    scene.remove(root);
    root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map && m.map !== glowTex) m.map.dispose(); m.dispose(); }); });
  }
  return { update, heightAt, glowTex, dispose, portal, arena, sun, hemi, sky, uniforms, add, root, theme: TH, lights };
}
