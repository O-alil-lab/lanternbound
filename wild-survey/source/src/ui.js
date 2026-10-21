/* ==========================================================================
   WILD SURVEY — interface
   ========================================================================== */
(function () {
  const E = window.WS_ENGINE, D = window.WS_DATA, ART = window.WS_ART;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const art = (key) => ART[key] || '';

  const state = {
    mode: 'world',
    wild: null,
    game: null,
    battle: null,
    busy: false,
    skip: false,
    fast: false,
    tab: 'moves',
    result: null,
    muted: false
  };

  /* ------------------------------------------------------------------ sound */
  let actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    return actx;
  }
  function tone(freq, dur, type, gain, slideTo) {
    if (state.muted) return;
    const ctx = ac(); if (!ctx) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), ctx.currentTime + dur);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(gain || 0.06, ctx.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur + 0.02);
    } catch (e) { /* audio may be blocked */ }
  }
  const sfx = {
    move: () => tone(320, 0.16, 'triangle', 0.05, 520),
    hit: (crit) => { tone(crit ? 150 : 190, 0.20, 'square', 0.06, 90); tone(crit ? 520 : 420, 0.10, 'sine', 0.03, 220); },
    miss: () => tone(260, 0.14, 'sine', 0.035, 170),
    heal: () => { tone(520, 0.18, 'sine', 0.05, 780); tone(780, 0.22, 'sine', 0.03, 980); },
    faint: () => tone(220, 0.5, 'triangle', 0.06, 70),
    levelup: () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.05), i * 110)),
    win: () => [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.05), i * 130)),
    click: () => tone(660, 0.05, 'sine', 0.02),
    boss: () => { tone(110, 0.9, 'sawtooth', 0.045, 55); tone(220, 0.9, 'triangle', 0.03, 110); }
  };

  /* ------------------------------------------------------------------ bits */
  const typeChip = (t) => `<span class="chip t-${t}"><i class="dot"></i>${D.TYPES[t].name}</span>`;
  const monName = (m) => E.CREATURES[m.cid].name;

  function hpClass(frac) { return frac < 0.25 ? 'low' : frac < 0.55 ? 'mid' : ''; }

  function hpBarHTML(mon, extra) {
    const frac = Math.max(0, mon.hp / mon.maxhp);
    return `<div class="hpbar ${hpClass(frac)} ${extra || ''}"><i style="width:${frac * 100}%"></i></div>`;
  }

  function go(name) {
    document.body.classList.toggle('world-mode', name === 'world');
    $$('.screen').forEach((s) => s.classList.remove('active'));
    const sc = $('#screen-' + name);
    if (sc) { sc.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    state.screen = name;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1900);
  }

  /* ------------------------------------------------------------- save/resume */
  const SAVE_KEY = 'wild-survey-save-v1';
  function saveGame() {
    const g = state.game; if (!g) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 2, mentor: g.mentor, chapter: g.chapter, route: g.route,
        recorded: g.recorded || [], defeated: g.defeated || [],
        velourayDefeated: !!g.velourayDefeated, pos: g._pos || null,
        team: g.team.map((m) => ({ cid: m.cid, level: m.level, xp: m.xp, hp: m.hp }))
      }));
    } catch (e) { /* storage may be unavailable in a sandboxed preview */ }
  }
  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.mentor || !Array.isArray(s.team) || !s.team.length) return null;
      if (!s.team.every((m) => E.CREATURES[m.cid])) return null;
      return s;
    } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function resumeGame(s) {
    const g = E.newGame(s.mentor);
    g.chapter = Math.min(s.chapter || 0, g.route.length);
    if (Array.isArray(s.route) && s.route.length === g.route.length) g.route = s.route;
    g.recorded = Array.isArray(s.recorded) && s.recorded.length ? s.recorded : g.recorded;
    g.defeated = Array.isArray(s.defeated) ? s.defeated : [];
    g.velourayDefeated = !!s.velourayDefeated;
    if (s.pos && isFinite(s.pos.x)) g._pos = s.pos;
    g.team = s.team.map((m) => {
      const mon = E.makeMon(m.cid, Math.max(2, m.level || 5));
      mon.xp = m.xp || 0;
      mon.hp = Math.min(mon.maxhp, Math.max(1, m.hp || mon.maxhp));
      return mon;
    });
    state.game = g;
    showWorld();
  }

  /* ------------------------------------------------------------------ title */
  function renderTitle() {
    const wrap = $('#mentors');
    wrap.innerHTML = D.MENTORS.map((id) => {
      const t = D.TRAINERS[id];
      const starter = E.CREATURES[D.STARTERS[id]];
      return `<button class="mentor" data-mentor="${id}">
        <div class="row">
          <img src="${art(id + '_front')}" alt="${esc(t.name)}">
          <div style="flex:1;min-width:0">
            <h3>${esc(t.name)}</h3>
            <p class="title">${esc(t.title)}</p>
            ${typeChip(t.type)}
            <div class="starterline">begins with <b>${esc(starter.name)}</b> &amp; <b>${esc(E.CREATURES[D.SECONDS[id]].name)}</b></div>
          </div>
        </div>
        <p class="quote">“${esc(t.quote)}”</p>
        <div class="pick">Study under ${esc(t.name)} →</div>
      </button>`;
    }).join('');
    $$('.mentor', wrap).forEach((b) => b.addEventListener('click', () => {
      sfx.click(); startGame(b.dataset.mentor);
    }));

    const saved = readSave();
    const host = $('#resume-host');
    if (saved) {
      const t = D.TRAINERS[saved.mentor];
      const where = saved.chapter >= (saved.route || []).length ? 'the twilight veil' : (D.TRAINERS[saved.route[saved.chapter]] || {}).name;
      host.innerHTML = `<div class="resume">
        <div>
          <div class="k">A survey already in progress</div>
          <div class="v">${esc(t.name)} · ${saved.chapter} of ${(saved.route || []).length} chapters cleared<br>
          <span style="font-size:12px;color:var(--ink-faint);font-style:italic">next: ${esc(where || '—')} · ${saved.team.length} companions</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ghost small" id="discard-save">Start fresh</button>
          <button class="btn primary small" id="resume-save">Resume the survey</button>
        </div>
      </div>`;
      $('#resume-save').onclick = () => { sfx.click(); resumeGame(saved); toast('Survey resumed'); };
      $('#discard-save').onclick = () => { clearSave(); host.innerHTML = ''; toast('Save cleared'); };
    } else host.innerHTML = '';
  }

  function startGame(mentor) {
    state.game = E.newGame(mentor);
    E.healAll(state.game.team);
    saveGame();
    showWorld();
  }

  /* ------------------------------------------------------------- the reach */
  function showWorld() {
    go('world');
    if (window.WS_WORLD) {
      window.WS_WORLD.start({
        state,
        startChapterBattle,
        startFinalBattle,
        startWildBattle,
        openPrebattle,
        worldPrompt: (t) => { const el = $('#w-prompt'); if (el) { el.textContent = t || ''; el.classList.toggle('on', !!t); } },
        worldObjective: (t) => { const el = $('#w-objective'); if (el) el.textContent = t ? 'objective · ' + t : ''; },
        saveGame,
        toast,
        openBestiary: () => openBestiary(),
        openRules: () => openRules(),
        showRoute: () => showRoute()
      });
      window.WS_WORLD.resume();
    }
    syncWorldHud();
    if (window.WS_WORLD) window.WS_WORLD.refresh();
  }

  function syncWorldHud() {
    const g = state.game; if (!g) return;
    const t = D.TRAINERS[g.mentor];
    const el = (id) => document.getElementById(id);
    if (el('w-trainer')) el('w-trainer').src = art(g.mentor + '_front');
    if (el('w-name')) el('w-name').textContent = t.name;
    if (el('w-chapter')) el('w-chapter').textContent = g.velourayDefeated ? 'survey complete' : `chapter ${Math.min(g.chapter + 1, g.route.length)} of ${g.route.length}`;
    if (el('w-recorded')) el('w-recorded').textContent = `${(g.recorded || []).length} / ${D.ORDER.length} recorded`;
    if (el('w-team')) {
      el('w-team').innerHTML = g.team.map((m) => `
        <div class="wt" title="${esc(monName(m))} · Lv ${m.level}">
          <img src="${art(m.cid + '_threeq')}" alt="">
          <span>${m.level}</span>
        </div>`).join('');
    }
  }

  /* ------------------------------------------------------------------ route */
  function showRoute() {
    const g = state.game;
    renderRoute();
    go('route');
  }

  function renderRoute() {
    const g = state.game;
    const nextIsWorld = state.mode === 'world';
    const list = $('#route-list');
    const rows = [];

    g.route.forEach((id, i) => {
      const tr = D.TRAINERS[id];
      const status = i < g.chapter ? 'done' : i === g.chapter ? 'next' : 'locked';
      const lvl = E.levelFor(g, i);
      rows.push(`<div class="stop ${status}">
        <div class="num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <h3>${esc(tr.name)} <span style="font-size:12px;color:var(--ink-faint);font-style:italic">${esc(tr.title)}</span></h3>
          <div class="meta">${typeChip(tr.type)}<span>${tr.team.length} companions · around Lv ${lvl}</span></div>
        </div>
        <div class="who">
          ${tr.team.slice(0, 2).map((c) => `<img class="mini" src="${art(c + '_threeq')}" alt="">`).join('')}
          <span class="tag">${status === 'done' ? 'cleared' : status === 'next' ? 'awaiting' : 'later'}</span>
        </div>
      </div>`);
    });

    const finalDone = g.chapter >= g.route.length;
    rows.push(`<div class="stop final ${finalDone ? 'next' : 'locked'}">
      <div class="num">✦</div>
      <div>
        <h3>${esc(D.FINAL.name)} <span style="font-size:12px;color:#6b4d86;font-style:italic">${esc(D.FINAL.title)}</span></h3>
        <div class="meta">${typeChip('glimmer')}<span>the one the survey has never recorded</span></div>
      </div>
      <div class="who">
        <img class="mini" src="${art('velouray_threeq')}" alt="">
        <span class="tag">${finalDone ? 'the veil' : 'unknown'}</span>
      </div>
    </div>`);

    list.innerHTML = rows.join('');
    $('#route-go').textContent = finalDone ? 'The twilight veil' : (nextIsWorld ? 'Walk to the map' : 'Set out');
    $('#route-go').onclick = () => {
      sfx.click();
      if (state.mode === 'world') { showWorld(); toast('Walk to the marked rival on the map'); }
      else openPrebattle();
    };

    // roster
    const roster = $('#roster');
    roster.innerHTML = g.team.map((m) => {
      const c = E.CREATURES[m.cid];
      return `<div class="mon">
        <img src="${art(m.cid + '_threeq')}" alt="">
        <div class="bars">
          <div class="nm">${esc(c.name)}</div>
          <div class="lv">Lv ${m.level} · ${esc(c.role)}</div>
          ${hpBarHTML(m)}
        </div>
      </div>`;
    }).join('');

    const mentor = D.TRAINERS[g.mentor];
    $('#mentor-note').innerHTML = `<b style="font-style:normal;letter-spacing:.14em;text-transform:uppercase;font-size:10px;color:var(--bronze)">Field mentor</b><br>
      ${esc(mentor.name)} — ${esc(mentor.note)}`;
    $('#chapter-count').textContent = `${Math.min(g.chapter, g.route.length)} / ${g.route.length}`;
  }

  /* -------------------------------------------------------------- prebattle */
  function openPrebattle() {
    const g = state.game;
    const nx = E.nextOpponent(g);
    const isFinal = nx.kind === 'final';

    if (isFinal) return openFinalIntro();

    const tr = D.TRAINERS[nx.id];
    const lvl = E.levelFor(g, g.chapter);
    $('#pre-title').textContent = tr.name;
    $('#pre-sub').textContent = tr.title;
    $('#pre-portrait').src = art(nx.id + '_front');
    $('#pre-quote').textContent = '“' + tr.quote + '”';
    $('#pre-note').textContent = tr.note;
    $('#pre-type').innerHTML = typeChip(tr.type);

    const myTypes = new Set(g.team.map((m) => E.CREATURES[m.cid].type));
    $('#foe-list').innerHTML = tr.team.map((cid) => {
      const c = E.CREATURES[cid];
      const beats = [...myTypes].some((t) => E.eff(c.type, t) > 1.2);
      const weak = [...myTypes].some((t) => E.eff(t, c.type) > 1.2);
      return `<div class="foe-row">
        <img src="${art(cid + '_front')}" alt="">
        <div>
          <div class="nm">${esc(c.name)}</div>
          <div class="lv">Lv ${lvl} · ${esc(c.role)}</div>
        </div>
        ${typeChip(c.type)}
        <div class="mults">
          ${beats ? '<span class="mk dn">presses you</span>' : ''}
          ${weak ? '<span class="mk up">you answer</span>' : ''}
        </div>
      </div>`;
    }).join('');

    // lineup
    $('#lineup').innerHTML = g.team.map((m, i) => `
      <div class="opt ${i === 0 ? 'sel' : ''}" data-idx="${i}">
        <div class="pick-mark">✓</div>
        <img src="${art(m.cid + '_front')}" alt="">
        <div>
          <div class="nm">${esc(monName(m))}</div>
          <div class="sub">Lv ${m.level} · ${m.hp}/${m.maxhp} hp</div>
        </div>
        <div class="lead">lead</div>
      </div>`).join('');
    $$('#lineup .opt').forEach((o) => o.addEventListener('click', () => {
      sfx.click();
      $$('#lineup .opt').forEach((x) => x.classList.remove('sel'));
      o.classList.add('sel');
      const idx = +o.dataset.idx;
      const [pick] = g.team.splice(idx, 1);
      g.team.unshift(pick);
      renderRoute();
      openPrebattle();
    }));

    $('#pre-begin').onclick = () => { sfx.click(); beginTrainerBattle(nx.id); };
    if (window.WS_WORLD) window.WS_WORLD.pause();
    go('prebattle');
  }

  function openFinalIntro() {
    $('#pre-title').textContent = D.FINAL.name;
    $('#pre-sub').textContent = D.FINAL.title;
    $('#pre-portrait').src = art('velouray_threeq');
    $('#pre-quote').textContent = '“...”';
    $('#pre-note').textContent = 'Eleven years of the survey, and this is the twelfth. The moth is exactly as large as the rumours, and much quieter.';
    $('#pre-type').innerHTML = typeChip('glimmer');
    const lvl = E.levelFor(state.game, 'boss');
    $('#foe-list').innerHTML = `<div class="foe-row">
      <img src="${art('velouray_front')}" alt="">
      <div><div class="nm">Velouray</div><div class="lv">Lv ${lvl} · Phantom · two phases</div></div>
      ${typeChip('glimmer')}
      <div class="mults"><span class="mk dn">the veil</span></div>
    </div>`;
    if ($('#lineup').children.length === 0 || $('#lineup').dataset.mode !== 'final') renderLineup();
    $('#pre-portrait').style.filter = 'drop-shadow(0 18px 26px rgba(74,50,102,.35))';
    $('#pre-begin').onclick = () => { sfx.click(); beginFinalBattle(); };
    if (window.WS_WORLD) window.WS_WORLD.pause();
    go('prebattle');
  }

  function renderLineup() {
    const g = state.game;
    $('#lineup').dataset.mode = 'final';
    $('#lineup').innerHTML = g.team.map((m, i) => `
      <div class="opt ${i === 0 ? 'sel' : ''}" data-idx="${i}">
        <div class="pick-mark">✓</div>
        <img src="${art(m.cid + '_front')}" alt="">
        <div><div class="nm">${esc(monName(m))}</div><div class="sub">Lv ${m.level} · ${m.hp}/${m.maxhp} hp</div></div>
        <div class="lead">lead</div>
      </div>`).join('');
    $$('#lineup .opt').forEach((o) => o.addEventListener('click', () => {
      sfx.click();
      $$('#lineup .opt').forEach((x) => x.classList.remove('sel'));
      o.classList.add('sel');
      const idx = +o.dataset.idx;
      const [pick] = g.team.splice(idx, 1);
      g.team.unshift(pick);
      renderLineup();
    }));
  }

  /* ----------------------------------------------------------------- battle */
  function startChapterBattle(trainerId) {
    const g = state.game;
    if (!g || g.route[g.chapter] !== trainerId) return;
    sfx.click();
    state.battle = E.trainerBattle(g, trainerId);
    state.foeMeta = { name: D.TRAINERS[trainerId].name, title: D.TRAINERS[trainerId].title, id: trainerId, kind: 'trainer' };
    $('#battle-where').textContent = `Chapter ${g.chapter + 1} · ${D.TRAINERS[trainerId].name}, ${D.TRAINERS[trainerId].title}`;
    state.battle.tonics = 4;
    if (window.WS_WORLD) window.WS_WORLD.pause();
    enterBattle();
  }

  function startFinalBattle() {
    const g = state.game;
    if (!g || g.chapter < g.route.length) return;
    sfx.click();
    beginFinalBattle();
  }

  function startWildBattle(cid, spr) {
    const g = state.game;
    if (!g) return;
    const lvl = E.wildLevel(g);
    state.battle = E.wildBattle(g, cid, lvl);
    state.foeMeta = { name: 'Wild ' + E.CREATURES[cid].name, title: 'Wild companion', id: cid, kind: 'wild', spr };
    $('#battle-where').textContent = `The Verdant Reach · a wild ${E.CREATURES[cid].name}`;
    state.battle.tonics = 4;
    if (window.WS_WORLD) window.WS_WORLD.pause();
    enterBattle();
  }

  function beginTrainerBattle(trainerId) {
    const g = state.game;
    const tr = D.TRAINERS[trainerId];
    state.battle = E.trainerBattle(g, trainerId);
    state.foeMeta = { name: tr.name, title: tr.title, id: trainerId, kind: 'trainer' };
    $('#battle-where').textContent = `Chapter ${g.chapter + 1} · ${tr.name}, ${tr.title}`;
    state.battle.tonics = 4;
    enterBattle();
  }

  function beginFinalBattle() {
    const g = state.game;
    state.battle = E.finalBattle(g);
    state.foeMeta = { name: D.FINAL.name, title: D.FINAL.title, id: 'velouray', kind: 'final' };
    $('#battle-where').textContent = 'The Twilight Veil · final record';
    state.battle.tonics = 4;
    enterBattle();
    sfx.boss();
  }

  function enterBattle() {
    state.tab = 'moves';
    state.busy = false;
    state.skip = false;
    $('#logbox').innerHTML = '';
    const b = state.battle;
    renderPlates(true);
    renderMoves();
    $('#turn-pill').textContent = 'Turn 1';
    $('#tonic-count').textContent = b.tonics;
    go('battle');
    const foe = b.foe.team[b.foe.active], me = b.player.team[b.player.active];
    pushLog(state.foeMeta.kind === 'final'
      ? 'The meadow goes quiet. <b>Velouray</b> opens its wings.'
      : state.foeMeta.kind === 'wild'
        ? `You crouch low in the grass. A wild <b>${esc(monName(foe))}</b> is close enough to study.`
        : `A challenge — ${esc(state.foeMeta.name)} sends out ${esc(monName(foe))}.`);
    pushLog(`You answer with ${esc(monName(me))}.`);
  }

  function renderPlates(animate) {
    const b = state.battle;
    const me = b.player.team[b.player.active], foe = b.foe.team[b.foe.active];
    $('#plate-foe').innerHTML = plateHTML(foe, 'foe');
    $('#plate-me').innerHTML = plateHTML(me, 'me');
    const sf = $('#sprite-foe'), sm = $('#sprite-me');
    const foeKey = foe.cid + '_front', meKey = me.cid + '_back';
    if (sf.dataset.key !== foeKey) {
      sf.dataset.key = foeKey; sf.src = art(foeKey);
      if (animate) { sf.classList.remove('enter-foe'); void sf.offsetWidth; sf.classList.add('enter-foe'); }
    }
    if (sm.dataset.key !== meKey) {
      sm.dataset.key = meKey; sm.src = art(meKey);
      if (animate) { sm.classList.remove('enter-me'); void sm.offsetWidth; sm.classList.add('enter-me'); }
    }
    sm.classList.add('bob');
    sf.classList.add('bob');
  }

  function plateHTML(mon, side) {
    const frac = Math.max(0, mon.hp / mon.maxhp);
    const c = E.CREATURES[mon.cid];
    const stages = Object.entries(mon.stages).filter(([, v]) => v !== 0);
    return `<div class="top"><span class="nm">${esc(c.name)}</span><span class="lv">Lv ${mon.level}</span></div>
      <div class="sub">${typeChip(c.type)}${mon.boss ? ' <span class="mk dn">veil</span>' : ''}</div>
      <div class="hprow">
        <span>HP</span>
        <div class="hpbar ${hpClass(frac)}"><b style="transform:scaleX(${frac})"></b><i style="width:${frac * 100}%"></i></div>
        <span class="hptext">${mon.hp}/${mon.maxhp}</span>
      </div>`;
  }

  function renderMoves() {
    const b = state.battle;
    const me = b.player.team[b.player.active], foe = b.foe.team[b.foe.active];
    const c = E.CREATURES[me.cid];
    const box = $('#moves');
    if (state.tab === 'moves') {
      box.className = 'moves';
      box.innerHTML = c.moves.map((id, i) => {
        const mv = D.MOVES[id];
        const pp = me.pp[id];
        const mult = mv.kind === 'status' ? null : E.eff(mv.type, E.CREATURES[foe.cid].type);
        const tag = mult === null ? '' : mult > 1.2 ? '<span class="eff up">▲ strong</span>' : mult < 0.85 ? '<span class="eff dn">▼ weak</span>' : '';
        return `<button class="move t-${mv.type}" data-move="${id}" ${pp <= 0 ? 'disabled' : ''}>
          <span class="fire"></span>
          <span class="nm"><i class="dot"></i>${esc(mv.name)} ${tag}</span>
          <span class="meta">
            <span>${mv.kind === 'status' ? 'status' : mv.power + ' pow · ' + mv.acc + '%'}</span>
            <span class="pp">${pp} pp</span>
          </span>
        </button>`;
      }).join('') + (c.moves.every((id) => me.pp[id] <= 0) ? `<button class="move" data-move="wearied"><span class="nm"><i class="dot"></i>Wearied Shove</span><span class="meta"><span>status</span><span class="pp">—</span></span></button>` : '');
      $$('#moves .move').forEach((btn) => btn.addEventListener('click', () => playerAction({ type: 'move', move: btn.dataset.move })));
    } else if (state.tab === 'team') {
      box.className = 'switchlist';
      box.innerHTML = b.player.team.map((m, i) => {
        const dead = m.hp <= 0, active = i === b.player.active;
        return `<div class="switchrow ${dead ? 'dead' : ''} ${active ? 'sel' : ''}" data-idx="${i}">
          <img src="${art(m.cid + '_threeq')}" alt="">
          <div class="bars">
            <div class="nm">${esc(monName(m))} <span class="lv" style="color:var(--ink-faint);font-size:10px;letter-spacing:.14em;text-transform:uppercase">Lv ${m.level}</span></div>
            ${hpBarHTML(m)}
          </div>
          <span class="tag" style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint)">${active ? 'in field' : dead ? 'resting' : 'ready'}</span>
        </div>`;
      }).join('');
      $$('#moves .switchrow').forEach((row) => row.addEventListener('click', () => {
        const i = +row.dataset.idx;
        if (i === b.player.active) return;
        if (b.player.team[i].hp <= 0) return;
        playerAction({ type: 'swap', index: i });
      }));
    }
    $('#tonic-count').textContent = b.tonics;
    $('#tab-tonic').disabled = b.tonics <= 0;
    $('#battle-hint').style.display = state.tab === 'moves' ? 'block' : 'none';
  }

  function pushLog(html, tone) {
    const box = $('#logbox');
    const p = document.createElement('p');
    p.className = 'line ' + (tone || '');
    p.innerHTML = html;
    box.appendChild(p);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  function floatText(side, text, cls) {
    const host = $('#fx');
    const arena = $('#arena').getBoundingClientRect();
    const fighter = $(side === 'foe' ? '.fighter.foe' : '.fighter.me').getBoundingClientRect();
    const n = document.createElement('div');
    n.className = 'float ' + (cls || '');
    n.textContent = text;
    n.style.left = (fighter.left - arena.left + fighter.width * 0.45) + 'px';
    n.style.top = (fighter.top - arena.top + fighter.height * 0.25) + 'px';
    host.appendChild(n);
    setTimeout(() => n.remove(), 1100);
  }

  function playMoveAnim(side, kind) {
    const el = $(side === 'foe' ? '#sprite-foe' : '#sprite-me');
    el.classList.remove('lunge-foe', 'lunge-me');
    void el.offsetWidth;
    el.classList.add(side === 'foe' ? 'lunge-foe' : 'lunge-me');
    sfx.move();
  }

  function hitAnim(side, crit) {
    const el = $(side === 'foe' ? '#sprite-foe' : '#sprite-me');
    el.classList.remove('hitflash', 'shake');
    void el.offsetWidth;
    el.classList.add('hitflash', 'shake');
    sfx.hit(crit);
  }

  async function animate(events) {
    const b = state.battle;
    const quick = () => state.skip || state.fast;
    for (const ev of events) {
      if (quick()) { await wait(0); } else { await wait(ev.t === 'text' ? 620 : 420); }
      switch (ev.t) {
        case 'text': {
          pushLog(esc(ev.text), ev.tone);
          break;
        }
        case 'move': {
          playMoveAnim(ev.side, ev.kind);
          break;
        }
        case 'damage': {
          const mon = ev.side === 'foe' ? b.foe.team[b.foe.active] : b.player.team[b.player.active];
          hitAnim(ev.side, ev.crit);
          floatText(ev.side, '-' + ev.amount, ev.crit ? 'crit' : '');
          updateHp(ev.side);
          if (ev.eff > 1.2 && !state.skip) { /* type flash handled by plate */ }
          break;
        }
        case 'heal': {
          floatText(ev.side, '+' + ev.amount, 'heal');
          updateHp(ev.side);
          sfx.heal();
          break;
        }
        case 'miss': {
          pushLog(esc(ev.text), 'weak');
          sfx.miss();
          break;
        }
        case 'item': {
          pushLog(esc(ev.text), 'good');
          break;
        }
        case 'swap': {
          pushLog(esc(ev.text));
          renderPlates(true);
          renderMoves();
          await wait(quick() ? 0 : 320);
          break;
        }
        case 'faint': {
          const el = $(ev.side === 'foe' ? '#sprite-foe' : '#sprite-me');
          el.classList.remove('bob'); el.classList.add('faint');
          pushLog(esc(ev.text), 'weak');
          sfx.faint();
          await wait(quick() ? 0 : 520);
          break;
        }
        case 'levelup': {
          pushLog(`<b>${esc(ev.mon.cid ? E.CREATURES[ev.mon.cid].name : '')}</b> reaches Lv ${ev.level}.`, 'good');
          sfx.levelup();
          break;
        }
        case 'end': {
          state.result = ev.winner;
          break;
        }
      }
    }
    if (b.over) await finishBattle();
  }

  function updateHp(side) {
    const b = state.battle;
    const mon = side === 'foe' ? b.foe.team[b.foe.active] : b.player.team[b.player.active];
    const plate = $(side === 'foe' ? '#plate-foe' : '#plate-me');
    const frac = Math.max(0, mon.hp / mon.maxhp);
    const bar = $('.hpbar', plate);
    if (!bar) return;
    bar.className = 'hpbar ' + hpClass(frac);
    $('i', bar).style.width = (frac * 100) + '%';
    $('.hptext', plate).textContent = `${mon.hp}/${mon.maxhp}`;
  }

  async function playerAction(action) {
    if (state.busy || !state.battle || state.battle.over) return;
    sfx.click();
    state.busy = true;
    const b = state.battle;
    try {
      const events = E.turn(b, action);
      $('#turn-pill').textContent = 'Turn ' + b.turn;
      await animate(events);
      if (!b.over) await resolveField(b);
    } catch (err) {
      console.error('turn failed', err);
      // never leave the field stuck: re-sync the interface
      if (!b.over) { renderPlates(); renderMoves(); }
    } finally {
      state.skip = false;
      state.busy = false;
    }
  }

  /* After a turn: bring in replacements for anyone who fainted, in order,
     until both sides have a living companion on the field. */
  async function resolveField(b) {
    let guard = 0;
    while (guard++ < 8) {
      const me = b.player.team[b.player.active];
      if (me && me.hp <= 0) {
        const next = b.player.team.findIndex((m) => m.hp > 0);
        if (next < 0) return;                       // whole team down: battle ends
        const forced = await chooseForcedSwitch();
        if (forced < 0) return;
        b.player.active = forced;
        await wait(state.skip || state.fast ? 0 : 180);
      }
      const foe = b.foe.team[b.foe.active];
      if (foe && foe.hp <= 0) {
        const next = b.foe.team.findIndex((m) => m.hp > 0);
        if (next < 0) return;
        b.foe.active = next;
        await wait(state.skip || state.fast ? 0 : 240);
        pushLog(`${esc(state.foeMeta.name)} sends out ${esc(monName(b.foe.team[next]))}.`);
        renderPlates(true);
      }
      const me2 = b.player.team[b.player.active], foe2 = b.foe.team[b.foe.active];
      if (me2.hp > 0 && foe2.hp > 0) break;
    }
    renderPlates();
    renderMoves();
  }

  let forcedSwitchOpen = false;
  function chooseForcedSwitch() {
    if (forcedSwitchOpen) return Promise.resolve(-1);
    forcedSwitchOpen = true;
    return new Promise((resolve) => {
      const b = state.battle;
      const alive = b.player.team.map((m, i) => ({ m, i })).filter((x) => x.m.hp > 0);
      if (alive.length === 0) { forcedSwitchOpen = false; return resolve(-1); }
      openModal(`<h2>Send out a companion</h2>
        <p class="sub">Your field companion is down. Choose who takes the field.</p>
        <div class="switchlist">${alive.map(({ m, i }) => `
          <div class="switchrow" data-pick="${i}">
            <img src="${art(m.cid + '_threeq')}" alt="">
            <div class="bars">
              <div class="nm">${esc(monName(m))} <span style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">Lv ${m.level}</span></div>
              ${hpBarHTML(m)}
            </div>
            <span style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--bronze)">take field</span>
          </div>`).join('')}
        </div>`, (root) => {
        $$('.switchrow', root).forEach((r) => r.addEventListener('click', () => {
          sfx.click();
          closeModal();
          forcedSwitchOpen = false;
          resolve(+r.dataset.pick);
        }));
      }, true);
    });
  }

  /* --------------------------------------------------------------- results */
  async function finishBattle() {
    const b = state.battle, g = state.game;
    const wild = state.foeMeta && state.foeMeta.kind === 'wild';

    if (b.winner === 'player') {
      const evs = [];
      E.awardBattle(b, evs);
      const levelups = evs.filter((e) => e.t === 'levelup');
      sfx.win();
      await wait(400);
      const gains = g.team.map((m) => ({ cid: m.cid, lv: m.level, hp: m.hp, maxhp: m.maxhp }));

      if (wild) { saveGame(); return showWildRecord(gains, levelups); }

      const isFinal = state.foeMeta.kind === 'final';
      if (isFinal) {
        g.velourayDefeated = true;
        if (!g.recorded.includes('velouray')) g.recorded.push('velouray');
        clearSave();
        return showEnding();
      }

      g.chapter += 1;
      g.defeated.push(state.foeMeta.id);
      E.healAll(g.team);
      saveGame();
      showVictory(gains, levelups);
    } else {
      if (wild) return showWildLoss();
      showDefeat();
    }
  }

  /* ------------------------------------------------ wild companion results */
  function showWildRecord(gains, levelups) {
    const g = state.game;
    const cid = state.foeMeta.id;
    const c = E.CREATURES[cid];
    const full = g.team.length >= 4;
    openModal(`<h2>${esc(c.name)} — study it?</h2>
      <p class="sub">A wild companion, calm enough to approach now that it has been bested.</p>
      <div class="grid3" style="grid-template-columns:1fr">
        <div class="card" style="cursor:default">
          <div class="typeflag">${typeChip(c.type)}</div>
          <img src="${art(cid + '_threeq')}" alt="" style="height:150px">
          <div class="nm">${esc(c.name)}</div>
          <div class="role">${esc(c.role)} · Lv ${E.wildLevel(g)}</div>
          <div class="why">${esc(c.lore)}</div>
        </div>
      </div>
      <div class="gains" style="margin-top:10px">${gains.map((x) => `
        <span class="gain"><img src="${art(x.cid + '_threeq')}" alt="">${esc(E.CREATURES[x.cid].name)}
        <b style="font-weight:400">Lv ${x.lv}</b>${levelups.some((l) => l.mon.cid === x.cid) ? '<span class="lv">↑</span>' : ''}</span>`).join('')}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" id="let-go">Let it go</button>
        <button class="btn primary" id="record-it">Record it${full ? ' (team full)' : ''}</button>
      </div>`, (root) => {
      $('#let-go', root).onclick = () => { closeModal(); returnToWorld(); };
      $('#record-it', root).onclick = () => {
        if (!g.recorded.includes(cid)) g.recorded.push(cid);
        if (!full) g.team.push(E.makeMon(cid, E.wildLevel(g)));
        saveGame();
        closeModal();
        toast(`${c.name} recorded${full ? ' in the journal' : ' — it joins you'}`);
        if (window.WS_WORLD) window.WS_WORLD.refresh();
        setTimeout(returnToWorld, 300);
      };
    });
  }

  function showWildLoss() {
    openModal(`<h2>You step back into the grass</h2>
      <p class="sub">The wild companion slips away. Your team is shaken — return to camp and rest before trying again.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
        <button class="btn primary" id="back-camp">Return to the reach</button>
      </div>`, (root) => {
      $('#back-camp', root).onclick = () => { closeModal(); returnToWorld(); };
    }, true);
  }

  function returnToWorld() {
    const g = state.game;
    if (!g) return;
    E.healAll(g.team);
    saveGame();
    showWorld();
    if (window.WS_WORLD) window.WS_WORLD.returnFromBattle();
    syncWorldHud();
  }

  function afterRecruit() {
    if (state.mode === 'world') returnToWorld();
    else showRoute();
  }

  function showVictory(gains, levelups) {
    sfx.click();
    openModal(`<h2>${esc(state.foeMeta.name)} concedes</h2>
      <p class="sub">The survey continues. Your companions catch their breath.</p>
      <div class="gains">${gains.map((x) => `
        <span class="gain"><img src="${art(x.cid + '_threeq')}" alt="">${esc(E.CREATURES[x.cid].name)}
        <b style="font-weight:400">Lv ${x.lv}</b>${levelups.some((l) => l.mon.cid === x.cid) ? '<span class="lv">↑</span>' : ''}</span>`).join('')}</div>
      <div style="text-align:right;margin-top:14px">
        <button class="btn primary" id="to-recruit">Record a companion</button>
      </div>`, (root) => {
      $('#to-recruit', root).onclick = () => { closeModal(); setTimeout(openRecruit, 120); };
    });
  }

  function showDefeat() {
    openModal(`<h2>Your notebook closes</h2>
      <p class="sub">${esc(state.foeMeta.name)} was too strong this time. The Reach is patient — and so is the survey.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px">
        <button class="btn ghost" id="give-up">Restart survey</button>
        <button class="btn primary" id="try-again">Try this chapter again</button>
      </div>`, (root) => {
      $('#try-again', root).onclick = () => {
        closeModal(); sfx.click();
        E.healAll(state.game.team);
        const isFinal = state.foeMeta.kind === 'final';
        if (isFinal) beginFinalBattle(); else beginTrainerBattle(state.foeMeta.id);
      };
      $('#give-up', root).onclick = () => { closeModal(); E.healAll(state.game.team); saveGame(); showWorld(); if (window.WS_WORLD) window.WS_WORLD.returnFromBattle(); };
    }, true);
  }

  function openRecruit() {
    const g = state.game;
    const choices = E.recruitChoices(g, state.foeMeta.id);
    const next = g.chapter < g.route.length ? D.TRAINERS[g.route[g.chapter]] : null;
    const lvl = E.recruitLevel(g, E.levelFor(g, g.chapter));
    const full = g.team.length >= 4;

    const why = (cid) => {
      const c = E.CREATURES[cid];
      const vs = next ? next.name : 'the veil';
      const nt = next ? next.type : 'glimmer';
      if (E.eff(c.type, nt) > 1.2) return `Strikes hard against ${vs}'s ${D.TYPES[nt].name.toLowerCase()} companions.`;
      if (E.eff(nt, c.type) < 0.85) return `Shrugs off ${vs} — their ${D.TYPES[nt].name.toLowerCase()} work barely lands.`;
      if (E.eff(nt, c.type) > 1.2) return `A risk against ${vs}, but a hard hitter in its own right.`;
      return `${c.detail.split(' · ')[0]} · steady all-rounder.`;
    };

    openModal(`<h2>Record a companion</h2>
      <p class="sub">${full ? 'Your satchel is full — choose one to release, or take nobody.' : 'A wild companion has been following the scent of your lantern. Take one into the survey.'}</p>
      <div class="grid3">
        ${choices.map((cid) => {
          const c = E.CREATURES[cid];
          return `<div class="card" data-take="${cid}">
            <div class="typeflag">${typeChip(c.type)}</div>
            <img src="${art(cid + '_threeq')}" alt="">
            <div class="nm">${esc(c.name)}</div>
            <div class="role">${esc(c.role)} · Lv ${lvl}</div>
            <div class="why">${esc(why(cid))}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
        <span style="font-size:11px;color:var(--ink-faint);font-style:italic">Team: ${g.team.length} / 4</span>
        <button class="btn ghost" id="skip-recruit">Continue alone</button>
      </div>`, (root) => {
      $$('.card', root).forEach((card) => card.addEventListener('click', () => {
        sfx.click();
        const cid = card.dataset.take;
        if (full) { closeModal(); setTimeout(() => openRelease(cid, lvl), 120); return; }
        g.team.push(E.makeMon(cid, lvl));
        saveGame();
        closeModal();
        toast(`${E.CREATURES[cid].name} joins the survey`);
        setTimeout(afterRecruit, 350);
      }));
      $('#skip-recruit', root).onclick = () => { closeModal(); afterRecruit(); };
    }, true);
  }

  function openRelease(cid, lvl) {
    const g = state.game;
    openModal(`<h2>Make room for ${esc(E.CREATURES[cid].name)}</h2>
      <p class="sub">Release one companion back to the Reach.</p>
      <div class="switchlist">
        ${g.team.map((m, i) => `<div class="switchrow" data-rel="${i}">
          <img src="${art(m.cid + '_threeq')}" alt="">
          <div class="bars"><div class="nm">${esc(monName(m))} <span style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">Lv ${m.level}</span></div>${hpBarHTML(m)}</div>
          <span style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--rose)">release</span>
        </div>`).join('')}
      </div>
      <div style="text-align:right;margin-top:14px"><button class="btn ghost" id="cancel-rel">Keep the team as it is</button></div>`,
      (root) => {
        $$('.switchrow', root).forEach((r) => r.addEventListener('click', () => {
          sfx.click();
          g.team.splice(+r.dataset.rel, 1);
          g.team.push(E.makeMon(cid, lvl));
          saveGame();
          closeModal();
          toast(`${E.CREATURES[cid].name} joins the survey`);
          setTimeout(afterRecruit, 350);
        }));
        $('#cancel-rel', root).onclick = () => { closeModal(); afterRecruit(); };
      });
  }

  /* ---------------------------------------------------------------- ending */
  function showEnding() {
    const g = state.game;
    clearSave();
    const team = g.team;
    openModal(`<h2 style="text-align:center;font-size:34px">The twelfth record</h2>
      <p class="sub" style="text-align:center">Velouray settles on your lantern arm, weighs nothing at all, and stays while you write.</p>
      <p class="lore" style="text-align:center;margin:10px 24px 0">
        “Wings the exact colour of a sky ten minutes after sunset. Two gold eye-spots, not four — the older drawings were wrong.
        It is not shy. It has simply never had a reason to stay.”
      </p>
      <div class="summary" style="margin-top:22px">
        <div class="stat-card"><div class="k">Mentor</div><div class="v">${esc(D.TRAINERS[g.mentor].name)}</div></div>
        <div class="stat-card"><div class="k">Chapters</div><div class="v">${g.route.length + 1}</div></div>
        <div class="stat-card"><div class="k">Companions recorded</div><div class="v">${team.length}</div></div>
      </div>
      <div class="gains" style="margin-top:4px">${team.map((m) => `<span class="gain"><img src="${art(m.cid + '_threeq')}" alt="">${esc(monName(m))} <b style="font-weight:400">Lv ${m.level}</b></span>`).join('')}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:18px">
        <button class="btn ghost" id="view-bestiary">Open the field journal</button>
        <button class="btn primary" id="again">Walk the survey again</button>
      </div>`, (root) => {
      $('#again', root).onclick = () => location.reload();
      $('#view-bestiary', root).onclick = () => { closeModal(); openBestiary(); };
    }, true);
    sfx.win();
  }

  /* -------------------------------------------------------------- bestiary */
  function openBestiary(initial) {
    const rec = (state.game && state.game.recorded) || [];
    const cards = D.ORDER.map((cid) => {
      const c = E.CREATURES[cid];
      const got = rec.includes(cid);
      return `<div class="card best-card ${got ? 'recorded' : ''}" data-cid="${cid}">
        <div class="typeflag">${typeChip(c.type)}</div>
        <img src="${art(cid + '_front')}" alt="">
        <div class="nm">${esc(c.name)}</div>
        <div class="role">${esc(c.role)}</div>
        ${got ? '<div class="stamp">recorded</div>' : ''}
      </div>`;
    }).join('');
    openModal(`<h2>The field journal</h2>
      <p class="sub">Eighteen wild companions across the Verdant Reach — you have recorded <b>${rec.length}</b>. Walk the map to find the rest.</p>
      <div class="grid3">${cards}</div>`, (root) => {
      $$('.best-card', root).forEach((c) => c.addEventListener('click', () => {
        sfx.click(); closeModal(); setTimeout(() => openDetail(c.dataset.cid), 100);
      }));
    });
    if (initial) openDetail(initial);
  }

  function openDetail(cid) {
    const c = E.CREATURES[cid];
    const stats = c.base;
    const rows = [['HP', stats.hp, 100], ['Atk', stats.atk, 80], ['Guard', stats.def, 80], ['Focus', stats.spa, 80], ['Poise', stats.res, 80], ['Speed', stats.spd, 80]];
    openModal(`<div class="detail">
      <div>
        <img class="hero" src="${art(cid + '_threeq')}" alt="">
        <div style="display:flex;gap:6px;justify-content:center;margin-top:6px">
          ${['front', 'threeq', 'side', 'back'].map((v) => `<img src="${art(cid + '_' + v)}" alt="" style="height:46px;opacity:.85">`).join('')}
        </div>
      </div>
      <div>
        <div class="kicker" style="font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--bronze)">Wild companion · ${esc(c.role)}</div>
        <h2 style="margin:4px 0 8px">${esc(c.name)}</h2>
        ${typeChip(c.type)}
        <p class="lore" style="margin-top:12px">${esc(c.lore)}</p>
        <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-top:12px">${esc(c.detail)}</p>
        <div style="margin-top:16px">
          ${rows.map(([k, v, max]) => `<div class="statrow"><span>${k}</span><div class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></div><span class="num">${v}</span></div>`).join('')}
        </div>
        <div class="movelist">
          ${c.moves.map((id) => {
            const mv = D.MOVES[id];
            return `<div class="moveline">
              ${typeChip(mv.type)}
              <span class="nm">${esc(mv.name)}</span>
              <span class="pw">${mv.kind === 'status' ? 'status' : mv.power + ' pow'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px">
      <button class="btn ghost small" id="back-journal">← Back to the journal</button>
      <span style="font-size:11px;color:var(--ink-faint);font-style:italic">sheet ${String(D.ORDER.indexOf(cid) + 7).padStart(2, '0')} of 24</span>
    </div>`, (root) => {
      $('#back-journal', root).onclick = () => { closeModal(); setTimeout(openBestiary, 90); };
    });
  }

  /* ----------------------------------------------------------------- modal */
  function openModal(html, bind, noClose) {
    const m = $('#modal');
    const sheet = $('#modal-sheet');
    sheet.innerHTML = (noClose ? '' : '<button class="close" aria-label="close">×</button>') + html;
    m.classList.add('open');
    if (!noClose) $('.close', sheet).addEventListener('click', closeModal);
    if (bind) bind(sheet);
    return sheet;
  }
  function closeModal() { $('#modal').classList.remove('open'); }
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal' && $('#modal-sheet .close')) closeModal();
  });

  /* ------------------------------------------------------------------ init */
  function bindChrome() {
    $('#tab-moves').addEventListener('click', () => { state.tab = 'moves'; setTabs(); renderMoves(); sfx.click(); });
    $('#tab-team').addEventListener('click', () => { state.tab = 'team'; setTabs(); renderMoves(); sfx.click(); });
    $('#tab-tonic').addEventListener('click', () => { if (state.battle && state.battle.tonics > 0) playerAction({ type: 'item' }); });
    $('#open-bestiary').addEventListener('click', () => openBestiary());
    $('#open-rules').addEventListener('click', () => { sfx.click(); openRules(); });
    $('#open-rules-route').addEventListener('click', () => { sfx.click(); openRules(); });
    const wb = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { sfx.click(); fn(); }); };
    const preBack = document.getElementById('pre-back');
    if (preBack) preBack.addEventListener('click', () => { sfx.click(); window.WS_UI_API.backFrom(); });
    wb('w-journal', () => openBestiary());
    wb('w-rules', () => openRules());
    wb('w-route', () => showRoute());
    const backMap = document.getElementById('route-back');
    if (backMap) backMap.addEventListener('click', () => { sfx.click(); showWorld(); });
    $('#open-journal-route').addEventListener('click', () => openBestiary());
    $('#mute').addEventListener('click', () => {
      state.muted = !state.muted;
      $('#mute').textContent = state.muted ? '✕' : '♪';
      if (!state.muted) sfx.click();
    });
    document.addEventListener('keydown', (e) => {
      if (state.screen !== 'battle' || state.busy) return;
      const b = state.battle; if (!b || b.over) return;
      const me = b.player.team[b.player.active];
      if (/^[1-4]$/.test(e.key)) {
        const id = E.CREATURES[me.cid].moves[+e.key - 1];
        if (id && me.pp[id] > 0) playerAction({ type: 'move', move: id });
      }
      if (e.key.toLowerCase() === 't' && b.tonics > 0) playerAction({ type: 'item' });
      if (e.key.toLowerCase() === 's') { state.tab = 'team'; setTabs(); renderMoves(); }
    });
    $('#arena').addEventListener('click', () => {
      state.fast = !state.fast;
      $('#arena').classList.toggle('fast', state.fast);
      toast(state.fast ? 'Fast forward on' : 'Fast forward off');
    });
  }
  function setTabs() {
    $('#tab-moves').classList.toggle('on', state.tab === 'moves');
    $('#tab-team').classList.toggle('on', state.tab === 'team');
  }

  function openRules() {
    openModal(`<h2>How the survey works</h2>
      <p class="sub">Six chapters, then the thing nobody has recorded.</p>
      <div class="rules">
        <div>
          <h3>The six-type wheel</h3>
          <div class="wheel">
            <span class="chip t-ember"><i class="dot"></i>Ember</span>▸
            <span class="chip t-sap"><i class="dot"></i>Sap</span>▸
            <span class="chip t-tide"><i class="dot"></i>Tide</span>▸
            <span class="chip t-stone"><i class="dot"></i>Stone</span>▸
            <span class="chip t-gale"><i class="dot"></i>Gale</span>▸
            <span class="chip t-glimmer"><i class="dot"></i>Glimmer</span>▸ Ember
          </div>
          <p style="margin-top:10px">Each type strikes hard against the <b>next two</b> on the wheel and softly against the two that hunt it.
          Moves are flagged <span class="mk up">▲ strong</span> or <span class="mk dn">▼ weak</span> before you commit.</p>
          <h3 style="margin-top:14px">Levels follow you</h3>
          <p>Rivals are pitched near your team's average level, so nobody falls behind — and nobody runs away with it. Every victory raises everyone who came along, even the ones that fainted.</p>
        </div>
        <div>
          <h3>The field tonic</h3>
          <p>Four tonics per chapter. Each restores about a third of your companion's health, but your rival still gets a free move while you uncork it.</p>
          <h3>Switching</h3>
          <p>Bringing in a fresh companion costs you the turn. Watch the <b>presses you / you answer</b> flags on the chapter page — that is the whole game, really.</p>
          <h3>Recording companions</h3>
          <p>After each victory you may record one of three wild companions. Your satchel holds four; release one to make room. Type coverage beats raw power, usually.</p>
        </div>
      </div>
      <div style="text-align:right;margin-top:8px"><button class="btn primary" id="rules-ok">Understood</button></div>`,
      (root) => { $('#rules-ok', root).onclick = closeModal; });
  }

  function boot() {
    renderTitle();
    bindChrome();
    go('title');
    if (!window.WS_ART) toast('Artwork failed to load');
  }

  window.WS_UI = { boot, startGame, debug: { state, beginFinalBattle, openBestiary, openRules } };
  window.WS_UI_API = {
    state, showWorld, showRoute, startChapterBattle, startFinalBattle, startWildBattle,
    saveGame, openBestiary, openRules, toast, syncWorldHud, openPrebattle,
    backFrom: () => { if (state.mode === 'world') { showWorld(); if (window.WS_WORLD) window.WS_WORLD.returnFromBattle(); } else showRoute(); }
  };
  boot();
})();
