// ============================================================
// Lanternbound 3D — "HD-2D" picture finish: soft bloom on lights and
// lanterns, tilt-shift blur (miniature diorama look), vignette and a
// warm colour grade. Drops itself automatically on slow devices.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from '../../lib/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../lib/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../lib/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../../lib/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from '../../lib/jsm/postprocessing/OutputPass.js';

// tilt-shift + vignette + grade, applied after tone mapping (display colours)
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: .55 }, uBand: { value: .26 }, uBlur: { value: 1.5 },
    uVig: { value: .32 }, uTint: { value: new THREE.Color(1.03, 1.0, .95) }, uSat: { value: 1.08 }, uLift: { value: new THREE.Color(.012, .008, .03) }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFocus, uBand, uBlur, uVig, uSat; uniform vec3 uTint, uLift;
    varying vec2 vUv;
    void main(){
      float d = max(0.0, abs(vUv.y - uFocus) - uBand) / (1.0 - uBand);
      float r = d * d * uBlur * 4.0;
      vec4 c = texture2D(tDiffuse, vUv);
      if (r > 0.05) {
        vec4 acc = c; float n = 1.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 2.39996;               // golden-angle disc
          float rr = r * sqrt((float(i) + .5) / 12.0);
          acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * rr / uRes); n += 1.0;
        }
        c = acc / n;
      }
      vec3 col = c.rgb * uTint + uLift;
      float l = dot(col, vec3(.299, .587, .114));
      col = mix(vec3(l), col, uSat);
      vec2 q = vUv - .5; q.x *= uRes.x / uRes.y;
      col *= 1.0 - uVig * smoothstep(.35, 1.0, length(q));
      gl_FragColor = vec4(col, c.a);
    }`
};

export class Post {
  constructor(renderer, scene, camera) {
    this.r = renderer; this.scene = scene; this.camera = camera;
    this.enabled = true;
    try { const q = localStorage.getItem('lb-gfx'); if (q === 'low') this.enabled = false; this.forced = q; } catch (e) {}
    if (!this.forced && (LB.touch || matchMedia('(pointer: coarse)').matches) && devicePixelRatio > 2.5) this.enabled = false;
    try {
      this.composer = new EffectComposer(renderer);
      this.composer.addPass(new RenderPass(scene, camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .38, .55, .86);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.finish = new ShaderPass(FinishShader); this.composer.addPass(this.finish);
    } catch (e) { console.warn('post-processing off', e); this.composer = null; this.enabled = false; }
    this.resize();
    this.slow = 0; this.watch = 0;
  }
  resize() {
    if (!this.composer) return;
    this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(innerWidth, innerHeight);
    const pr = this.r.getPixelRatio(); this.finish.uniforms.uRes.value.set(innerWidth * pr, innerHeight * pr);
  }
  // stage mood: tint / bloom / vignette per area
  mood(m = {}) {
    if (!this.composer) return;
    const u = this.finish.uniforms;
    u.uTint.value.set(...(m.tint || [1.03, 1.0, .95])); u.uLift.value.set(...(m.lift || [.012, .008, .03]));
    u.uSat.value = m.sat ?? 1.08; u.uVig.value = m.vig ?? .32;
    this.bloom.strength = m.bloom ?? .38; this.bloom.threshold = m.threshold ?? .86;
  }
  // focus band follows how close the camera is (capture close-ups get stronger blur)
  focus(close) { if (this.finish) { this.finish.uniforms.uBlur.value = close ? 2.4 : 1.5; this.finish.uniforms.uBand.value = close ? .18 : .26; } }
  toggle() {
    this.enabled = !this.enabled && !!this.composer; this.forced = this.enabled ? 'high' : 'low';
    try { localStorage.setItem('lb-gfx', this.forced); } catch (e) {}
    return this.enabled;
  }
  render(dt) {
    if (this.enabled && this.composer) {
      this.composer.render(dt);
      // auto quality: if frames stay slow for ~4 s, switch the finish off (unless the player chose it)
      if (!this.forced) { this.watch += dt; if (dt > 1 / 34) this.slow += dt; if (this.watch > 4) { if (this.slow > 2.6) { this.enabled = false; LB.toast && LB.toast('Graphics: fast mode (G to change)'); } this.watch = this.slow = 0; } }
    } else this.r.render(this.scene, this.camera);
  }
}
