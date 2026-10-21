window.LB = window.LB || {};
// ============================================================
// Lanternbound — teaching layer.
//   LB.coach     : one-line, action-gated hints that appear when they are
//                  useful and disappear the moment the player does the thing.
//   LB.help      : the full control sheet, openable at any time with ? / the
//                  "?" button, on desktop and on touch.
//   LB.firstFight: the guided fight-and-capture encounter. Weaken -> daze ->
//                  lantern -> timing ring, taught one step at a time.
// Everything is saved in LB.G.flags so a returning player is never re-taught.
// ============================================================
(function () {
  const F = () => (LB.G.flags = LB.G.flags || {});
  const seen = id => !!F()[id];
  const mark = id => { F()[id] = 1; try { LB.save(true); } catch (e) {} };
  const touch = () => !!LB.touch;

  // ---------------------------------------------------------
  // shared styles
  // ---------------------------------------------------------
  const CSS = `
#lb-coach{position:absolute;left:50%;bottom:104px;transform:translateX(-50%) translateY(8px);
  display:none;align-items:center;gap:10px;width:min(470px,92vw);box-sizing:border-box;padding:10px 14px;
  background:rgba(245,239,226,.97);border:3px solid #3b2f20;border-radius:14px;
  box-shadow:0 5px 0 rgba(0,0,0,.3);font-family:Nunito,sans-serif;color:#2b2418;
  pointer-events:none;opacity:0;transition:opacity .22s,transform .22s;z-index:22}
#lb-coach.on{display:flex;opacity:1;transform:translateX(-50%) translateY(0)}
#lb-coach .k{flex:none;min-width:30px;height:30px;padding:0 8px;border-radius:8px;background:#3b2f20;color:#f5efe2;
  font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center;letter-spacing:.4px;
  box-shadow:0 2px 0 rgba(0,0,0,.35)}
#lb-coach .tx{flex:1;font-weight:800;font-size:15px;line-height:1.25}
#lb-coach .tx small{display:block;font-weight:700;font-size:12px;color:#6b5d48;margin-top:2px}
#lb-coach .dot{flex:none;width:9px;height:9px;border-radius:50%;background:#b8692e;animation:lbpulse 1.3s infinite}
@keyframes lbpulse{50%{opacity:.25;transform:scale(.8)}}
html body.dev-phone #lb-coach,html body.dev-tablet #lb-coach{bottom:calc(env(safe-area-inset-bottom,0px) + 176px);font-size:14px}
html body.short #lb-coach{bottom:calc(env(safe-area-inset-bottom,0px) + 132px)}

#lb-help{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;
  background:rgba(20,25,25,.62);padding:16px;font-family:Nunito,sans-serif;color:#2b2418}
#lb-help.on{display:flex}
#lb-help .card{width:100%;max-width:620px;max-height:86vh;overflow:auto;background:#f5efe2;
  border:3px solid #3b2f20;border-radius:16px;padding:16px 18px;box-shadow:0 8px 0 rgba(0,0,0,.35)}
#lb-help h2{font-family:Fraunces,serif;margin:0 0 2px;font-size:24px;display:flex;justify-content:space-between;align-items:center}
#lb-help .sub{color:#6b5d48;font-weight:800;font-size:13px;margin:0 0 12px}
#lb-help h3{font-family:Fraunces,serif;font-size:16px;margin:14px 0 6px;color:#b8692e}
#lb-help dl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0;font-size:14px;font-weight:700}
#lb-help dt{justify-self:start}
#lb-help kbd{display:inline-block;min-width:18px;text-align:center;background:#3b2f20;color:#f5efe2;
  border-radius:6px;padding:2px 7px;font:800 12px Nunito,sans-serif;box-shadow:0 2px 0 rgba(0,0,0,.35)}
#lb-help .x{background:none;border:2px solid #3b2f20;border-radius:8px;font-weight:900;padding:2px 10px;cursor:pointer;color:#2b2418}
#lb-help .foot{margin-top:14px;font-size:12px;color:#6b5d48;font-weight:800}
html body.dev-phone #lb-help .card{padding:14px}
html body.dev-phone #lb-help dl{font-size:13px}
`;
  function style() {
    if (document.getElementById('lb-teach-css')) return;
    const s = document.createElement('style'); s.id = 'lb-teach-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------------------------------------------------------
  // coach mark
  // ---------------------------------------------------------
  let el = null, cur = null, holdUntil = 0;
  function ensure() {
    style();
    if (el) return el;
    el = document.createElement('div'); el.id = 'lb-coach';
    el.innerHTML = '<span class="dot"></span><span class="k"></span><span class="tx"></span>';
    document.body.appendChild(el);
    return el;
  }
  const K = { move: touch() ? '◉' : 'WASD', camera: 'Z / X', talk: touch() ? 'A' : 'F', attack: touch() ? 'A' : 'J',
    special: touch() ? 'SP' : 'K', dodge: touch() ? '⤳' : 'Space', lantern: 'E', ring: touch() ? 'TAP' : 'Space',
    salve: touch() ? '🌿' : 'H', help: '?', none: '' };

  const coach = {
    step: null,
    // show a hint until it is dismissed or its action is done
    show(id, text, sub, keyId) {
      ensure();
      if (cur === id) return;
      cur = id; this.step = id;
      el.querySelector('.k').textContent = K[keyId || id] || '';
      el.querySelector('.k').style.display = (K[keyId || id] || '') === '' ? 'none' : 'flex';
      el.querySelector('.tx').innerHTML = LB.t(text) + (sub ? '<small>' + LB.t(sub) + '</small>' : '');
      el.classList.add('on');
    },
    hide() { if (el) el.classList.remove('on'); cur = null; this.step = null; },
    // hide for a beat (e.g. while a dialogue box is up) without forgetting the step
    pause(ms) { holdUntil = performance.now() + ms; if (el) el.classList.remove('on'); },
    active() { return !!cur; },
    clear(id) { if (!seen(id)) mark(id); if (cur === id) this.hide(); }
  };
  LB.coach = coach;

  // ---------------------------------------------------------
  // help sheet
  // ---------------------------------------------------------
  let helpEl = null;
  const rows = () => {
    const t = touch();
    return [
      [LB.t('Moving'), t
        ? [['◉', LB.t('drag the left stick to walk')], ['⟳', LB.t('rotate the camera')]]
        : [['W A S D', LB.t('walk')], ['Z / X', LB.t('rotate the camera')]]],
      [LB.t('Combat'), [
        [t ? 'A' : 'J / ' + LB.t('left-click'), LB.t('swing your weapon — three quick hits make a combo')],
        [t ? 'SP' : 'K / ' + LB.t('right-click'), LB.t('send your companion to attack')],
        [t ? 'SP' : 'L', LB.t('companion special move')],
        [t ? '⤳' : 'Space', LB.t('roll — you cannot be hit while rolling')]
      ]],
      [LB.t('Capture'), [
        [t ? '🏮' : 'E', LB.t('aim a lantern; press again to throw')],
        ['R', LB.t('change lantern type')],
        [t ? 'TAP' : 'Space', LB.t('hit the ring when the gold circle meets the white one')]
      ]],
      [LB.t('Around the world'), [
        [t ? 'A' : 'F', LB.t('talk, read, open a gate')],
        [t ? '🌿' : 'H', LB.t('use a salve and restore a heart')],
        [t ? '⇄' : 'Q', LB.t('switch companion')],
        ['?', LB.t('open this sheet')]
      ]]
    ];
  };
  function buildHelp() {
    style();
    if (helpEl) return helpEl;
    helpEl = document.createElement('div'); helpEl.id = 'lb-help';
    helpEl.innerHTML = '<div class="card" role="dialog" aria-modal="true" aria-label="' + LB.t('Controls') + '">' +
      '<h2><span>' + LB.t('Controls') + '</span><button class="x" aria-label="' + LB.t('Close') + '">✕</button></h2>' +
      '<p class="sub">' + LB.t('Everything you can do, any time.') + '</p><div class="body"></div>' +
      '<div class="foot">' + LB.t('Press ? again to close.') + '</div></div>';
    document.body.appendChild(helpEl);
    helpEl.addEventListener('click', e => { if (e.target === helpEl) LB.help(false); });
    helpEl.querySelector('.x').addEventListener('click', () => LB.help(false));
    return helpEl;
  }
  LB.help = function (open) {
    const h = buildHelp();
    const on = open == null ? !h.classList.contains('on') : !!open;
    h.classList.toggle('on', on);
    if (on) {
      const body = h.querySelector('.body');
      body.innerHTML = rows().map(([title, list]) =>
        '<h3>' + title + '</h3><dl>' + list.map(([k, txt]) =>
          '<dt>' + (k ? '<kbd>' + k + '</kbd>' : '') + '</dt><dd>' + txt + '</dd>').join('') + '</dl>').join('');
      h.querySelector('.x').focus();
    }
    return on;
  };
  LB.helpOpen = () => !!helpEl && helpEl.classList.contains('on');

  // ---------------------------------------------------------
  // contextual hints during normal play
  // ---------------------------------------------------------
  let moved = 0, walked = 0, yawSeen = 0, t = 0;
  coach.update = function (game, dt) {
    const P = game.player; if (!P || !LB.G) return;
    if (LB.mode !== 'world' || LB.helpOpen() || (LB.firstFight && LB.firstFight.active)) return;
    if (performance.now() < holdUntil) return;
    t += dt;

    // frame-rate independent counters
    const speed = Math.hypot(P.vel.x, P.vel.y);
    moved += speed * dt;
    if (speed > .5) walked += dt;
    this._moved = moved; this._walked = walked;
    if (Math.abs(game.yaw - yawSeen) > .2) { yawSeen = game.yaw; coach.clear('camera'); }

    // after the guided encounter the beginner hints are done for good
    if (seen('firstfight')) { ['t.move', 't.camera', 't.meadow'].forEach(mark); }

    const ni = game.nearInteract && game.nearInteract();
    let shown = null;

    if (!seen('t.move')) {
      if (walked > .35) { mark('t.move'); }
      else shown = 'move';
    }
    if (!shown && !seen('t.move')) {
      // still waiting on the walk lesson
    } else if (!shown && !touch() && !seen('t.camera') && t > 1.5) {
      shown = 'camera';
    } else if (!shown && !seen('t.meadow') && !seen('firstfight') && walked > .35) {
      shown = 'meadow';
    } else if (!shown && ni && !seen('t.talk')) {
      shown = 'talk';
    } else if (!shown && LB.G.hearts <= 3 && LB.G.items.salve > 0 && !seen('t.salve')) {
      shown = 'salve';
    } else if (!shown && seen('firstfight') && !seen('t.help')) {
      mark('t.help');
      shown = 'help';
    }

    if (shown === 'move') coach.show('move', touch() ? 'Drag the left stick to walk' : 'Walk with WASD', 'Your companion follows you.', 'move');
    else if (shown === 'camera') coach.show('camera', 'Turn the camera with Z and X', 'W walks toward the top of the screen.', 'camera');
    else if (shown === 'meadow') coach.show('meadow', 'Walk east into the tall grass', 'Something is rustling in the village meadow.', 'none');
    else if (shown === 'talk') coach.show('talk', touch() ? 'Tap A to talk' : 'Press F to talk', '', 'talk');
    else if (shown === 'salve') coach.show('salve', touch() ? 'Tap 🌿 to use a salve' : 'Press H to use a salve', 'It restores one heart.', 'salve');
    else if (shown === 'help') coach.show('help', touch() ? 'Tap ? for the full controls' : 'Press ? for the full controls', 'You can reopen this any time.', 'help');

    // nothing to say this frame: drop any stale hint
    if (!shown && cur && !['ff-approach', 'ff-strike', 'ff-combo', 'ff-daze', 'ff-ring', 'ff-retry', 'ff-done', 'ff-throw'].includes(cur)) coach.hide();
  };

  // ---------------------------------------------------------
  // the guided first encounter
  // ---------------------------------------------------------
  const MEADOW = { x0: 9, x1: 11, y0: 18, y1: 20 };   // the grass patch beside the village
  const TS = () => LB.tileSize || 2;                   // world units per map tile (set by the game)
  const inMeadow = (gx, gy) => gx >= MEADOW.x0 && gx <= MEADOW.x1 && gy >= MEADOW.y0 && gy <= MEADOW.y1;

  const ff = {
    active: false, stage: '', mon: null, hits: 0, attempts: 0, stageT: 0, startHp: 0, finished: false,

    // difficulty for this capture: generous on the first throw, still fair after
    captureOpts() {
      if (this.attempts === 0) return { zone: .85, dur: 1.7, assist: true };
      if (this.attempts === 1) return { zone: .62, dur: 1.45, assist: true };
      return { zone: .5, dur: 1.25, assist: true };
    },

    trigger(game) {
      if (this.active || this.finished || !LB.G || seen('firstfight')) return false;
      const P = game.player; if (!P) return false;
      const gx = Math.floor(P.x / TS()), gy = Math.floor(P.z / TS());
      return inMeadow(gx, gy) && LB.mode === 'world' && !game.fight;
    },

    start(game) {
      const P = game.player;
      this.active = true; this.finished = false; this.hits = 0; this.attempts = 0;
      game.clearWild();
      // a calm spot in front of the player, inside the grass
      const T = TS(), cx = (MEADOW.x0 + MEADOW.x1 + 1) / 2 * T, cz = (MEADOW.y0 + MEADOW.y1 + 1) / 2 * T;
      const ang = Math.atan2(cz - P.z, cx - P.x) || 0;
      const dist = Math.max(3.6, Math.min(5.2, Math.hypot(cx - P.x, cz - P.z) || 4.2));
      let x = P.x + Math.cos(ang) * dist, z = P.z + Math.sin(ang) * dist;
      if (game.solidAt(x, z)) { x = cx; z = cz; }
      const mon = game.spawnSparring('Loomtail', 3, x, z);
      this.mon = mon; this.startHp = mon.m.hpA;
      this.mon.spar = true; this.mon.state = 'idle';
      LB.G.seen.Loomtail = 1;
      this.setStage(game, 'approach');
      game.fx.burst('Grove', mon.pos.clone(), 18, 1.1);
      LB.SFX.sel();
    },

    setStage(game, s) {
      this.stage = s; this.stageT = 0;
      const C = LB.coach, t = touch();
      const say = (id, text, sub, key) => C.show(id, text, sub, key);
      if (s === 'approach') say('ff-approach', 'Walk up to the Loomtail', 'It is watching you. It will not attack yet.', 'move');
      if (s === 'strike') say('ff-strike', t ? 'Tap A to swing your staff' : 'Press J to swing your staff', 'Stand close and hit it once.', 'attack');
      if (s === 'combo') say('ff-combo', 'Two more swings — three in a row make a combo', 'The third hit knocks it back.', 'attack');
      if (s === 'daze') say('ff-daze', 'It is dazed! Now use a lantern', t ? 'Tap 🏮 to aim.' : 'Press E to aim, then E again to throw.', 'lantern');
      if (s === 'ring') say('ff-ring', t ? 'Tap when the gold ring meets the white ring' : 'Press Space when the gold ring meets the white ring', 'Three good hits and it joins you.', 'ring');
      if (s === 'retry') say('ff-retry', 'Almost! Try the ring again', 'It is still dazed — throw another lantern.', 'lantern');
      if (s === 'done') say('ff-done', 'That is the whole loop: weaken, daze, lantern', 'Open ? any time to see every control.', 'help');
    },

    update(game, dt) {
      if (!this.active) { if (!this.finished && this.trigger(game)) this.start(game); return; }
      this.stageT += dt;
      const P = game.player, mon = this.mon;
      const alive = mon && !mon.dead;
      if (!alive && this.stage !== 'done') { this.finish(game, false); return; }
      const d = alive ? Math.hypot(mon.x - P.x, mon.z - P.z) : 99;

      // never let the player lose the lesson: keep the sparring partner nearby
      if (alive && d > 17 && this.stage !== 'ring') {
        const a = Math.atan2(P.z - mon.z, P.x - mon.x);
        mon.pos.set(P.x + Math.cos(a) * 4, 0, P.z + Math.sin(a) * 4);
      }

      if (this.stage === 'approach') {
        mon.state = 'idle';
        if (d < 3.1) this.setStage(game, 'strike');
      } else if (this.stage === 'strike') {
        if (mon.m.hpA < this.startHp) {
          this.hits = 1; this.lastHp = mon.m.hpA;
          this.setStage(game, 'combo');
          game.fx.ring(mon.pos, '#ffd23f', .3, 2.2, .35);
        }
      } else if (this.stage === 'combo') {
        // count real swings, not frames: a hit is a drop in HP
        if (mon.m.hpA < this.lastHp) { this.hits++; this.lastHp = mon.m.hpA; }
        const done = this.hits >= 3 || this.stageT > 6 || mon.m.hpA <= 0;
        if (done) {
          // guarantee the daze here — the lesson has to land
          if (mon.m.hpA > 0) { mon.m.hpA = 0; game.knockOut(mon); }
          if (mon.state === 'dazed') mon.dazeT = 90;
          this.setStage(game, 'daze');
        }
      } else if (this.stage === 'daze') {
        if (mon.state === 'dazed') mon.dazeT = Math.max(mon.dazeT, 20);
        if (game.capture) this.setStage(game, 'ring');
        else if (game.aiming) LB.coach.show('ff-throw', touch() ? 'Now tap 🏮 to throw it' : 'Now press E again to throw it', '', 'lantern');
      } else if (this.stage === 'ring') {
        if (!game.capture) {
          if (mon.dead || mon.state === 'captured' || mon.state === 'gone') this.finish(game, true);
          else {
            this.attempts++;
            if (mon.state === 'dazed') mon.dazeT = 90;
            this.setStage(game, 'retry');
          }
        }
      } else if (this.stage === 'retry') {
        if (mon.state === 'dazed') mon.dazeT = Math.max(mon.dazeT, 20);
        if (game.capture) this.setStage(game, 'ring');
        else if (game.aiming) LB.coach.show('ff-throw', touch() ? 'Now tap 🏮 to throw it' : 'Now press E again to throw it', '', 'lantern');
      } else if (this.stage === 'done') {
        if (this.stageT > 4.2) { LB.coach.clear('ff-done'); this.active = false; this.finished = true; mark('firstfight'); }
      }
    },

    finish(game, won) {
      this.stage = 'done'; this.stageT = 0;
      if (won) {
        LB.G.flags.firstCaught = 1;
        mark('firstfight'); mark('t.move'); mark('t.camera'); mark('t.meadow');
        this.setStage(game, 'done');
        game.fx.burst('Glimmer', game.player.pos.clone(), 30, 1.4);
        setTimeout(() => LB.toast(LB.t('Loomtail joined your party — open Party to see it.')), 700);
      } else {
        LB.coach.clear('ff-done'); this.active = false; this.finished = true; mark('firstfight');
      }
    }
  };
  LB.firstFight = ff;
})();
