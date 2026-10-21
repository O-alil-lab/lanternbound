// ============================================================
// Lanternbound — sound effects (synthesized with Web Audio, no files needed)
// ============================================================
LB.muted = false;
try { LB.muted = localStorage.getItem('lb_mute') === '1'; } catch (e) {}
let _ac = null;
function tone(f, d, type = 'square', v = .06, slide = 0, delay = 0) {
  if (LB.muted) return;
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    const t = _ac.currentTime + delay, o = _ac.createOscillator(), g = _ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(_ac.destination); o.start(t); o.stop(t + d + .03);
  } catch (e) {}
}
LB.SFX = {
  sel:    () => tone(660, .05, 'square', .03),
  hit:    () => tone(190, .16, 'sawtooth', .07, -120),
  super:  () => { tone(240, .12, 'sawtooth', .08, -150); tone(560, .16, 'square', .05, -300, .08); },
  weak:   () => tone(150, .12, 'triangle', .06, -40),
  throw:  () => tone(380, .3, 'triangle', .05, 520),
  shake:  () => tone(300, .07, 'square', .035),
  caught: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, 'triangle', .07, 0, i * .11)),
  escape: () => tone(520, .22, 'triangle', .05, -320),
  lvl:    () => [392, 523, 659, 784].forEach((f, i) => tone(f, .13, 'square', .045, 0, i * .08)),
  heal:   () => [523, 784, 1046].forEach((f, i) => tone(f, .2, 'sine', .07, 0, i * .1)),
  stat:   () => tone(440, .18, 'sine', .05, 300),
  faint:  () => tone(420, .5, 'triangle', .06, -340),
  win:    () => [523, 523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'square', .045, 0, i * .12)),
  coin:   () => { tone(988, .07, 'square', .035); tone(1319, .16, 'square', .035, 0, .07); },
  enc:    () => [220, 330, 220, 330, 440].forEach((f, i) => tone(f, .07, 'square', .045, 0, i * .06)),
  bump:   () => tone(110, .06, 'square', .03)
};
LB.toggleMute = function () {
  LB.muted = !LB.muted;
  try { localStorage.setItem('lb_mute', LB.muted ? '1' : '0'); } catch (e) {}
  LB.updHud(); LB.SFX.sel();
};
