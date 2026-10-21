window.LB = window.LB || {};
// ============================================================
// Lanternbound — sound engine (all synthesized with Web Audio, no files)
//  • adaptive music: each stage has its own theme (scale, tempo, instruments)
//    with a calm layer, a combat layer and a boss layer that fade in and out
//  • ambience beds: wind, birds, river, cave drips, lava rumble, crickets…
//  • footsteps by surface, richer weapon / creature / UI effects, reverb
// Sound button cycles: all on → music off → all off.
// ============================================================
LB.audioMode = 0;  // 0 all on, 1 music off, 2 all off
try { LB.audioMode = +(localStorage.getItem('lb_audio') || (localStorage.getItem('lb_mute') === '1' ? 2 : 0)) || 0; } catch (e) {}
LB.muted = LB.audioMode === 2;

const A = LB.audio = { ac: null, ready: false, stage: 'valley', intensity: 0 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- stage themes ----------
const THEMES = {
  valley:  { root: 62, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], bpm: 92,  lead: 'flute', pad: 'warm',  arp: 'pluck', wet: .22, penta: true },
  caverns: { root: 57, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 0, 6], bpm: 76,  lead: 'glass', pad: 'hollow', arp: 'bell', wet: .5 },
  ember:   { root: 52, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 0, 6], bpm: 108, lead: 'reed',  pad: 'dark',  arp: 'pluck', wet: .25, drumsCalm: true },
  lake:    { root: 60, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 5, 4], bpm: 66,  lead: 'box',   pad: 'airy',  arp: 'bell', wet: .45 }
};
const AMBIENCE = {
  valley:  { wind: .05, birds: 1, river: .03 },
  caverns: { wind: .03, drips: 1, drone: .04 },
  ember:   { rumble: .07, crackle: 1, wind: .02 },
  lake:    { crickets: 1, water: .05, wind: .03, owl: 1 }
};

function init() {
  if (A.ac) { if (A.ac.state === 'suspended') A.ac.resume(); return true; }
  try { A.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
  const ac = A.ac;
  A.master = ac.createGain(); A.master.gain.value = .9;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5;
  A.master.connect(comp).connect(ac.destination);
  A.sfxBus = ac.createGain(); A.sfxBus.connect(A.master);
  A.musicBus = ac.createGain(); A.musicBus.gain.value = .55; A.musicBus.connect(A.master);
  A.ambBus = ac.createGain(); A.ambBus.gain.value = .9; A.ambBus.connect(A.master);
  // reverb (generated impulse)
  A.verb = ac.createConvolver(); A.verb.buffer = impulse(2.8, 2.6);
  A.verbIn = ac.createGain(); A.verbIn.gain.value = .3; A.verbIn.connect(A.verb); A.verb.connect(A.master);
  // layers
  A.layer = { calm: ac.createGain(), combat: ac.createGain(), boss: ac.createGain() };
  A.layer.calm.gain.value = 1; A.layer.combat.gain.value = 0; A.layer.boss.gain.value = 0;
  Object.values(A.layer).forEach(g => { g.connect(A.musicBus); });
  A.musicSend = ac.createGain(); A.musicSend.gain.value = .25; A.musicBus.connect(A.musicSend); A.musicSend.connect(A.verbIn);
  A.sfxSend = ac.createGain(); A.sfxSend.gain.value = .18; A.sfxBus.connect(A.sfxSend); A.sfxSend.connect(A.verbIn);
  A.noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = A.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A.ready = true; applyMode();
  A.next = ac.currentTime + .1; A.step16 = 0; A.bar = 0;
  setInterval(schedule, 30);
  setInterval(ambienceTick, 250);
  setStageAudio(A.stage, true);
  return true;
}
function impulse(sec, decay) {
  const ac = A.ac, len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function applyMode() {
  if (!A.ready) return; const t = A.ac.currentTime;
  A.musicBus.gain.setTargetAtTime(LB.audioMode === 0 ? .55 : 0, t, .3);
  A.sfxBus.gain.setTargetAtTime(LB.audioMode === 2 ? 0 : 1, t, .05);
  A.ambBus.gain.setTargetAtTime(LB.audioMode === 2 ? 0 : .9, t, .3);
  A.verbIn.gain.setTargetAtTime(LB.audioMode === 2 ? 0 : .3, t, .05);
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => init(), { capture: true, passive: true }));

// ---------- building blocks ----------
function env(g, t, a, peak, dec, sus = 0, rel = .1, len = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (len) { g.gain.setTargetAtTime(Math.max(.0001, peak * sus), t + a, dec / 3); g.gain.setTargetAtTime(.0001, t + len, rel / 3); }
  else g.gain.exponentialRampToValueAtTime(.0001, t + a + dec);
}
function osc(type, f, t, dur, vol, out, o = {}) {
  const ac = A.ac, g = ac.createGain();
  const n = ac.createOscillator(); n.type = type; n.frequency.setValueAtTime(f, t);
  if (o.slide) n.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t + (o.slideT || dur));
  if (o.detune) n.detune.value = o.detune;
  if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * .012; l.connect(lg).connect(n.frequency); l.start(t + .15); l.stop(t + dur + .5); }
  let node = n;
  if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpEnd) f2.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur); f2.Q.value = o.q || .7; node.connect(f2); node = f2; }
  node.connect(g); g.connect(out);
  env(g, t, o.a ?? .005, vol, o.d ?? dur, o.s ?? 0, o.r ?? .1, o.len ?? 0);
  n.start(t); n.stop(t + dur + (o.r ?? .1) + .3);
  return n;
}
function noise(t, dur, vol, out, o = {}) {
  const ac = A.ac, s = ac.createBufferSource(); s.buffer = A.noise; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
  if (o.fEnd) f.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
  const g = ac.createGain(); s.connect(f).connect(g).connect(out);
  env(g, t, o.a ?? .003, vol, dur);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + .1);
}

// ---------- instruments ----------
const INST = {
  flute: (f, t, d, v, out) => { osc('sine', f, t, d, v, out, { a: .06, d: d, s: .7, len: d, r: .25, vib: 5 }); osc('triangle', f * 2, t, d, v * .12, out, { a: .08, len: d, s: .6, d, r: .2 }); noise(t, .08, v * .25, out, { f: f * 2, q: 2 }); },
  glass: (f, t, d, v, out) => { osc('sine', f, t, d * 2, v, out, { a: .01, d: d * 2 }); osc('sine', f * 2.76, t, d, v * .25, out, { a: .005, d: d * .6 }); },
  reed:  (f, t, d, v, out) => { osc('sawtooth', f, t, d, v * .6, out, { a: .03, len: d, s: .7, d, r: .15, lp: f * 3, q: 2, vib: 6 }); },
  box:   (f, t, d, v, out) => { osc('sine', f * 2, t, 1.2, v, out, { a: .002, d: 1.2 }); osc('sine', f * 6, t, .3, v * .2, out, { a: .002, d: .3 }); },
  pluck: (f, t, d, v, out) => { osc('triangle', f, t, .45, v, out, { a: .002, d: .45, lp: f * 6, lpEnd: f * 1.5 }); },
  bell:  (f, t, d, v, out) => { osc('sine', f, t, 1.4, v, out, { a: .002, d: 1.4 }); osc('sine', f * 3.01, t, .5, v * .3, out, { a: .002, d: .5 }); },
  pad: (kind, fs, t, d, v, out) => {
    const type = kind === 'dark' ? 'sawtooth' : kind === 'hollow' ? 'square' : 'triangle';
    const lp = kind === 'airy' ? 2600 : kind === 'dark' ? 700 : kind === 'hollow' ? 900 : 1600;
    fs.forEach((f, i) => [-7, 7].forEach(dt => osc(type, f, t, d, v / fs.length, out, { a: d * .3, len: d * .95, s: .9, d: d * .3, r: d * .4, detune: dt + i, lp })));
  },
  bass: (f, t, d, v, out, bright) => osc(bright ? 'sawtooth' : 'triangle', f, t, d, v, out, { a: .005, d, lp: bright ? 600 : 400, lpEnd: 160 }),
  kick: (t, v, out) => osc('sine', 130, t, .32, v, out, { a: .001, d: .3, slide: .3, slideT: .12 }),
  snare: (t, v, out) => { noise(t, .16, v, out, { type: 'highpass', f: 1800 }); osc('triangle', 210, t, .1, v * .5, out, { d: .1, slide: .6 }); },
  hat: (t, v, out) => noise(t, .04, v, out, { type: 'highpass', f: 7500 }),
  tom: (t, v, out, f = 90) => osc('sine', f, t, .45, v, out, { a: .001, d: .45, slide: .55, slideT: .3 }),
  taiko: (t, v, out) => { osc('sine', 70, t, .6, v, out, { a: .001, d: .6, slide: .6 }); noise(t, .08, v * .4, out, { type: 'lowpass', f: 900 }); }
};

// ---------- music sequencer (16th-note grid, look-ahead) ----------
function noteOf(T, deg, oct = 0) {
  const n = T.scale.length, o = Math.floor(deg / n), k = ((deg % n) + n) % n;
  return T.root + T.scale[k] + 12 * (o + oct);
}
function schedule() {
  if (!A.ready || LB.audioMode !== 0) { if (A.ready) A.next = Math.max(A.next, A.ac.currentTime + .05); return; }
  const T = THEMES[A.stage] || THEMES.valley, ac = A.ac, sp = 60 / T.bpm / 4;
  while (A.next < ac.currentTime + .15) {
    playStep(T, A.step16, A.next, sp);
    A.next += sp; A.step16 = (A.step16 + 1) % 16; if (A.step16 === 0) A.bar++;
  }
}
function playStep(T, s, t, sp) {
  const L = A.layer, deg = T.prog[A.bar % T.prog.length];
  if (!A.motif) A.motif = makeMotif(T);
  const chord = [0, 2, 4].map(i => noteOf(T, deg + i, -1));
  if (s === 0) {
    if (A.bar % 2 === 0) INST.pad(T.pad, chord.map(mtof), t, sp * 32, .09, L.calm);
    INST.bass(mtof(noteOf(T, deg, -2)), t, sp * 6, .16, L.calm);
    if (A.bar % 8 === 0) A.motif = makeMotif(T);
  }
  if (s === 8) INST.bass(mtof(noteOf(T, deg + 4, -2)), t, sp * 6, .12, L.calm);
  // arpeggio
  const arpPat = [0, 1, 2, 1, 3, 2, 1, 2];
  if (s % 2 === 0) { const i = arpPat[(s / 2) % 8]; INST[T.arp](mtof(noteOf(T, deg + [0, 2, 4, 7][i], 0)), t, sp * 2, .035, L.calm); }
  // melody: phrase of 2 bars on, 2 bars answer
  const m = A.motif[(A.bar % 2) * 16 + s];
  if (m != null && A.bar % 4 < 3) { const off = A.bar % 4 === 2 ? 2 : 0; INST[T.lead](mtof(noteOf(T, deg * 0 + m + off, 1)), t, sp * 3, .06, L.calm); }
  if (T.drumsCalm) { if (s === 0 || s === 10) INST.taiko(t, .14, L.calm); }
  // combat layer: drums + driving bass
  if (s % 4 === 0) INST.kick(t, s === 0 || s === 8 ? .5 : .3, L.combat);
  if (s === 4 || s === 12) INST.snare(t, .22, L.combat);
  if (s % 2 === 1) INST.hat(t, .06, L.combat);
  if (s % 2 === 0) INST.bass(mtof(noteOf(T, deg, -2)), t, sp * 1.6, .12, L.combat, true);
  // boss layer: low ostinato, toms, brass stabs
  if (s % 3 === 0) INST.bass(mtof(noteOf(T, [0, 1, 0, -1][Math.floor(s / 4)], -2)), t, sp * 2, .14, L.boss, true);
  if (s === 0 || s === 6 || s === 12) INST.tom(t, .4, L.boss, s === 12 ? 70 : 100);
  if (s === 0 && A.bar % 2 === 0) chord.forEach(n => osc('sawtooth', mtof(n + 12), t, sp * 6, .04, L.boss, { a: .02, len: sp * 5, s: .6, d: .2, r: .2, lp: 1400 }));
}
function makeMotif(T) {
  const steps = new Array(32).fill(null); let deg = Math.floor(rnd(0, 5));
  const rhythm = pick([[0, 3, 6, 8, 12], [0, 4, 6, 10, 12, 14], [0, 2, 4, 8, 11], [0, 6, 8, 12]]);
  for (let h = 0; h < 2; h++) rhythm.forEach(r => { deg += pick([-2, -1, -1, 1, 1, 2, 0]); deg = Math.max(-2, Math.min(7, deg)); if (T.penta && (deg % 7 === 3 || deg % 7 === 6)) deg++; steps[h * 16 + r] = deg; });
  return steps;
}

// ---------- ambience ----------
function startBed(kind, vol) {
  const ac = A.ac, s = ac.createBufferSource(); s.buffer = A.noise; s.loop = true;
  const f = ac.createBiquadFilter(), g = ac.createGain();
  if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = .6; const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = .07; lg.gain.value = 300; l.connect(lg).connect(f.frequency); l.start(); }
  if (kind === 'river' || kind === 'water') { f.type = 'lowpass'; f.frequency.value = kind === 'river' ? 1200 : 500; }
  if (kind === 'rumble') { f.type = 'lowpass'; f.frequency.value = 120; f.Q.value = 3; }
  if (kind === 'drone') { f.type = 'bandpass'; f.frequency.value = 180; f.Q.value = 8; }
  s.connect(f).connect(g).connect(A.ambBus); g.gain.value = 0; g.gain.setTargetAtTime(vol, ac.currentTime, 1.2);
  s.start(0, Math.random()); return { s, g };
}
function setStageAudio(id, force) {
  if (!THEMES[id]) id = 'valley';
  if (A.stage === id && !force) return; A.stage = id;
  if (!A.ready) return;
  const ac = A.ac, t = ac.currentTime;
  (A.beds || []).forEach(b => { b.g.gain.setTargetAtTime(0, t, .6); b.s.stop(t + 3); });
  const amb = AMBIENCE[id]; A.amb = amb;
  A.beds = ['wind', 'river', 'water', 'rumble', 'drone'].filter(k => amb[k]).map(k => startBed(k, amb[k]));
  A.musicSend.gain.setTargetAtTime(THEMES[id].wet, t, .5);
  A.motif = null; A.bar = 0;
}
function ambienceTick() {
  if (!A.ready || LB.audioMode === 2 || !A.amb || document.hidden) return;
  const t = A.ac.currentTime + rnd(0, .2), a = A.amb, out = A.ambBus;
  if (a.birds && Math.random() < .12) { const f = rnd(2200, 3800), n = Math.floor(rnd(2, 5)); for (let i = 0; i < n; i++) osc('sine', f * rnd(.9, 1.15), t + i * .09, .07, .018, out, { a: .005, d: .07, slide: rnd(.7, 1.4), slideT: .06 }); }
  if (a.drips && Math.random() < .14) { const f = rnd(900, 2000); osc('sine', f, t, .25, .05, A.verbIn, { a: .001, d: .25, slide: 1.6, slideT: .05 }); osc('sine', f, t, .12, .025, out, { a: .001, d: .12, slide: 1.6, slideT: .05 }); }
  if (a.crackle && Math.random() < .5) for (let i = 0; i < 3; i++) noise(t + rnd(0, .25), .015, rnd(.02, .06), out, { type: 'highpass', f: rnd(1500, 4000) });
  if (a.crackle && Math.random() < .03) { osc('sine', 60, t, 1.2, .12, out, { a: .05, d: 1.2, slide: .6 }); noise(t, .5, .05, out, { type: 'lowpass', f: 300 }); }
  if (a.crickets && Math.random() < .55) { const f = rnd(4200, 4800); for (let i = 0; i < 3; i++) osc('square', f, t + i * .05, .03, .006, out, { a: .002, d: .03, lp: 6000 }); }
  if (a.owl && Math.random() < .015) { osc('sine', 380, t, .35, .04, A.verbIn, { a: .05, d: .35, slide: .85 }); osc('sine', 360, t + .5, .5, .04, A.verbIn, { a: .05, d: .5, slide: .8 }); }
}

// ---------- public API ----------
A.setStage = id => { A.stage = id in THEMES ? id : 'valley'; if (A.ready) setStageAudio(A.stage, true); };
A.setIntensity = lvl => {   // 0 explore, 1 combat, 2 boss
  if (A.intensity === lvl) return; A.intensity = lvl; if (!A.ready) return;
  const t = A.ac.currentTime;
  A.layer.combat.gain.setTargetAtTime(lvl >= 1 ? .9 : 0, t, lvl >= 1 ? .4 : 1.6);
  A.layer.boss.gain.setTargetAtTime(lvl >= 2 ? 1 : 0, t, lvl >= 2 ? .4 : 1.6);
  A.layer.calm.gain.setTargetAtTime(lvl >= 2 ? .45 : 1, t, .8);
};
// rain + gusts bed, level 0..1 (wind 1 = calm)
A.rain = (k, wind = 1) => {
  if (!A.ready) return;
  const ac = A.ac, t = ac.currentTime;
  if (!A.rainBed) {
    const mk = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = A.noise; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(A.ambBus); s.start(0, Math.random()); return g; };
    A.rainBed = mk('highpass', 1400, .5); A.gustBed = mk('bandpass', 380, .7);
  }
  if (Math.abs((A.rainLv || 0) - k) > .02) { A.rainLv = k; A.rainBed.gain.setTargetAtTime(k * .12, t, .5); }
  const gw = Math.max(0, wind - 1) * .05;
  if (Math.abs((A.gustLv || 0) - gw) > .004) { A.gustLv = gw; A.gustBed.gain.setTargetAtTime(gw, t, .8); }
};
A.step = surf => {   // footstep: grass, dirt, stone, wood, water, sand
  if (!A.ready || LB.audioMode === 2) return; const t = A.ac.currentTime, o = A.sfxBus;
  if (surf === 'water') { noise(t, .14, .05, o, { type: 'bandpass', f: rnd(700, 1100), q: 1.5, fEnd: 400 }); return; }
  if (surf === 'wood') { osc('triangle', rnd(150, 190), t, .07, .07, o, { d: .07, slide: .7 }); noise(t, .03, .03, o, { f: 1200 }); return; }
  if (surf === 'stone') { noise(t, .035, .05, o, { type: 'highpass', f: rnd(2500, 3500) }); osc('sine', rnd(240, 300), t, .04, .02, o, { d: .04 }); return; }
  if (surf === 'grass') { noise(t, .09, .035, o, { type: 'highpass', f: rnd(3000, 4500), fEnd: 2000 }); return; }
  noise(t, .07, .045, o, { type: 'bandpass', f: rnd(500, 900), q: .8 });
};

function play(fn) { if (LB.audioMode === 2) return; if (!init()) return; try { fn(A.ac.currentTime, A.sfxBus); } catch (e) {} }
// legacy simple tone (kept for old callers)
function tone(f, d, type = 'square', v = .06, slide = 0, delay = 0) { play((t, o) => osc(type, f, t + delay, d, v, o, { d, slide: slide ? Math.max(30, f + slide) / f : 0 })); }

LB.SFX = {
  sel:    () => play((t, o) => { osc('sine', 880, t, .06, .04, o, { d: .06 }); osc('sine', 1320, t + .03, .05, .02, o, { d: .05 }); }),
  hit:    () => play((t, o) => { noise(t, .09, .12, o, { type: 'lowpass', f: 1800, fEnd: 300 }); osc('sine', 160, t, .12, .14, o, { d: .12, slide: .5 }); }),
  super:  () => play((t, o) => { noise(t, .14, .16, o, { type: 'lowpass', f: 3000, fEnd: 400 }); osc('sawtooth', 240, t, .16, .07, o, { d: .16, slide: .4, lp: 2400 }); osc('sine', 880, t + .04, .25, .05, o, { d: .25, slide: 1.5 }); }),
  weak:   () => play((t, o) => { noise(t, .07, .06, o, { type: 'lowpass', f: 900 }); osc('triangle', 150, t, .1, .05, o, { d: .1, slide: .8 }); }),
  throw:  () => play((t, o) => { noise(t, .22, .07, o, { f: 600, fEnd: 2600, q: 2 }); }),
  swing:  () => play((t, o) => { noise(t, .16, .09, o, { f: 900, fEnd: 3200, q: 3 }); }),
  sling:  () => play((t, o) => { noise(t, .1, .06, o, { f: 1800, fEnd: 700, q: 4 }); osc('triangle', 520, t, .08, .03, o, { d: .08, slide: .6 }); }),
  zap:    () => play((t, o) => { osc('sawtooth', 300, t, .3, .06, o, { d: .3, slide: 4, lp: 3000 }); osc('sine', 1200, t, .35, .05, o, { d: .35, slide: .5 }); noise(t, .2, .05, o, { type: 'highpass', f: 5000 }); }),
  charge: () => play((t, o) => osc('sine', 400, t, .6, .03, o, { a: .1, d: .6, slide: 2.2 })),
  roll:   () => play((t, o) => { noise(t, .2, .06, o, { type: 'lowpass', f: 700, fEnd: 200 }); }),
  shake:  () => play((t, o) => { osc('square', 300, t, .06, .03, o, { d: .06, lp: 1500 }); noise(t, .04, .04, o, { f: 2500 }); }),
  caught: () => play((t, o) => { [523, 659, 784, 1046, 1318].forEach((f, i) => INST.bell(f, t + i * .09, 1, .07, o)); noise(t + .4, .6, .03, o, { type: 'highpass', f: 6000 }); }),
  escape: () => play((t, o) => { osc('triangle', 520, t, .25, .06, o, { d: .25, slide: .4 }); noise(t, .15, .05, o, { f: 1400 }); }),
  lvl:    () => play((t, o) => [392, 523, 659, 784, 1046].forEach((f, i) => INST.pluck(f, t + i * .07, .3, .08, o))),
  heal:   () => play((t, o) => [523, 784, 1046, 1568].forEach((f, i) => INST.bell(f, t + i * .1, 1, .05, o))),
  stat:   () => play((t, o) => osc('sine', 440, t, .2, .05, o, { d: .2, slide: 1.7 })),
  faint:  () => play((t, o) => { osc('triangle', 420, t, .6, .06, o, { d: .6, slide: .25 }); noise(t, .3, .04, o, { type: 'lowpass', f: 600 }); }),
  win:    () => play((t, o) => { [523, 659, 784].forEach(f => INST.pad('airy', [f], t, 1.4, .06, o)); [523, 659, 784, 1046, 1318].forEach((f, i) => INST.pluck(f, t + i * .1, .4, .08, o)); }),
  coin:   () => play((t, o) => { osc('square', 988, t, .07, .03, o, { d: .07, lp: 4000 }); osc('square', 1319, t + .07, .18, .03, o, { d: .18, lp: 4000 }); }),
  enc:    () => play((t, o) => { [220, 330, 440].forEach((f, i) => osc('sawtooth', f, t + i * .06, .12, .04, o, { d: .12, lp: 2000 })); INST.taiko(t, .3, o); }),
  bump:   () => play((t, o) => osc('sine', 110, t, .06, .05, o, { d: .06 })),
  boom:   () => play((t, o) => { osc('sine', 90, t, .8, .3, o, { a: .002, d: .8, slide: .35 }); noise(t, .6, .2, o, { type: 'lowpass', f: 1200, fEnd: 100 }); }),
  roar:   () => play((t, o) => { osc('sawtooth', 110, t, 1.1, .1, o, { a: .08, d: 1.1, slide: .6, lp: 900, vib: 9 }); osc('sawtooth', 165, t, 1, .06, o, { a: .1, d: 1, slide: .55, lp: 700 }); noise(t, .9, .07, o, { f: 400, q: 1.5, fEnd: 200 }); }),
  portal: () => play((t, o) => { [0, 4, 7, 11, 14].forEach((s, i) => INST.bell(mtof(72 + s), t + i * .06, 1, .05, o)); noise(t, 1, .05, o, { f: 800, fEnd: 5000, q: 2 }); }),
  splash: () => play((t, o) => noise(t, .3, .1, o, { f: 1200, fEnd: 300, q: .8 })),
  flutter: () => play((t, o) => { for (let i = 0; i < 6; i++) noise(t + i * .05, .04, .05, o, { f: 1800 + i * 200, q: 2 }); }),
  shiny: () => play((t, o) => { [1318, 1760, 2093, 2637].forEach((f, i) => INST.bell(f, t + i * .07, 1, .05, o)); }),
  pet: () => play((t, o) => { osc('sine', 660, t, .12, .05, o, { d: .12, slide: 1.3 }); osc('sine', 990, t + .1, .16, .04, o, { d: .16 }); }),
  perfect: () => play((t, o) => { osc('sine', 1760, t, .5, .06, o, { d: .5, slide: .5 }); noise(t, .3, .05, o, { f: 3000, fEnd: 800, q: 3 }); }),
  react: () => play((t, o) => { noise(t, .35, .12, o, { f: 600, fEnd: 2400, q: 1.5 }); osc('triangle', 330, t, .3, .06, o, { d: .3, slide: 2 }); }),
  quest: () => play((t, o) => { [523, 659, 784, 1046].forEach((f, i) => INST.bell(f, t + i * .12, 1.2, .06, o)); INST.pad('airy', [523, 659, 784], t, 1.6, .05, o); }),
  chest: () => play((t, o) => { osc('triangle', 220, t, .15, .08, o, { d: .15, slide: 1.5 }); [784, 988, 1175].forEach((f, i) => INST.pluck(f, t + .15 + i * .08, .3, .07, o)); }),
  burst: () => play((t, o) => { osc('sawtooth', 110, t, 1, .1, o, { a: .02, d: 1, slide: 4, lp: 3000 }); noise(t, .8, .12, o, { f: 400, fEnd: 4000, q: 1 }); [523, 784, 1046].forEach((f, i) => INST.bell(f, t + .2 + i * .06, 1, .05, o)); }),
  step:   s => A.step(s)
};

LB.toggleMute = function () {
  LB.audioMode = (LB.audioMode + 1) % 3; LB.muted = LB.audioMode === 2;
  try { localStorage.setItem('lb_audio', LB.audioMode); } catch (e) {}
  init(); applyMode();
  if (LB.updHud) LB.updHud();
  LB.toast && LB.toast(LB.t(['Sound: music + effects', 'Sound: effects only', 'Sound: off'][LB.audioMode]));
  LB.SFX.sel();
};
