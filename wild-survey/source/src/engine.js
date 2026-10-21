/* ==========================================================================
   WILD SURVEY — battle engine (pure logic, no DOM)
   ========================================================================== */
(function (root) {
  const D = (typeof module !== 'undefined' && typeof require === 'function')
    ? require('./data.js') : root.WS_DATA;

  const { MOVES, CREATURES, TRAINERS, TYPES, eff: rawEff } = D;
  const eff = (a, b) => (a === 'none' ? 1 : rawEff(a, b));

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const stageMul = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

  /* ---------- creature instances ---------- */
  function statsFor(cid, level) {
    const b = CREATURES[cid].base;
    const f = 1 + 0.07 * (level - 1);
    return {
      hp: Math.round(b.hp * f * 1.35),
      atk: Math.round(b.atk * f),
      def: Math.round(b.def * f),
      spa: Math.round(b.spa * f),
      res: Math.round(b.res * f),
      spd: Math.round(b.spd * f)
    };
  }

  function makeMon(cid, level, opts) {
    opts = opts || {};
    const c = CREATURES[cid];
    if (!c) throw new Error('unknown creature ' + cid);
    const st = statsFor(cid, level);
    const pp = {};
    c.moves.forEach((m) => { pp[m] = MOVES[m].pp; });
    return {
      uid: cid + '_' + Math.random().toString(36).slice(2, 8),
      cid, level, xp: 0, hp: st.hp, maxhp: st.hp,
      stats: st, pp,
      stages: { atk: 0, def: 0, spa: 0, res: 0, spd: 0, acc: 0 },
      scorch: 0, ward: false,
      boss: !!opts.boss
    };
  }

  const statOf = (mon, key) => {
    if (key === 'acc') return 1;
    return mon.stats[key] * stageMul(mon.stages[key] || 0);
  };

  const alive = (team) => team.filter((m) => m.hp > 0);
  const xpNeeded = (level) => 20 + 12 * level;

  function gainXp(mon, amount, events) {
    if (mon.hp <= 0) return;
    mon.xp += amount;
    while (mon.xp >= xpNeeded(mon.level) && mon.level < 40) {
      mon.xp -= xpNeeded(mon.level);
      mon.level += 1;
      const old = mon.maxhp;
      const st = statsFor(mon.cid, mon.level);
      mon.stats = st;
      mon.maxhp = st.hp;
      mon.hp = Math.min(mon.maxhp, mon.hp + (mon.maxhp - old));
      events && events.push({ t: 'levelup', mon, level: mon.level });
    }
  }

  function healAll(team) {
    team.forEach((m) => {
      m.hp = m.maxhp;
      m.stages = { atk: 0, def: 0, spa: 0, res: 0, spd: 0, acc: 0 };
      m.scorch = 0; m.ward = false;
      Object.keys(m.pp).forEach((k) => { m.pp[k] = MOVES[k].pp; });
    });
  }

  /* ---------- battle ---------- */
  function makeBattle(playerTeam, foeTeam, opts) {
    opts = opts || {};
    return {
      player: { team: playerTeam, active: 0, isPlayer: true },
      foe: { team: foeTeam, active: 0, isPlayer: false, trainer: opts.trainer || null },
      log: [],
      turn: 1,
      over: false,
      winner: null,
      bossPhase: 1,
      tonics: 4,
      events: []
    };
  }

  const act = (side) => side.team[side.active];
  const other = (b, side) => (side === b.player ? b.foe : b.player);

  function pushText(events, text, tone) { events.push({ t: 'text', text, tone: tone || 'plain' }); }

  function effectivenessWord(mult) {
    if (mult > 1.2) return { word: 'It lands hard — the survey margins note “especially effective”.', tone: 'good' };
    if (mult < 0.85) return { word: 'It barely troubles them.', tone: 'weak' };
    return null;
  }

  function applyStage(mon, stat, stages) {
    const before = mon.stages[stat] || 0;
    mon.stages[stat] = clamp(before + stages, -6, 6);
    return mon.stages[stat] !== before;
  }

  const STAT_WORD = { atk: 'attack', def: 'guard', spa: 'focus', res: 'poise', spd: 'speed', acc: 'aim' };

  function doMove(b, side, moveId, events) {
    const A = side, B = other(b, side);
    const atk = act(A), def = act(B);
    const mv = MOVES[moveId];
    if (!mv) return;
    if (atk.hp <= 0 || def.hp <= 0) return;

    // accuracy
    const accChance = (mv.acc / 100) * (mv.kind === 'status' ? 1 : stageMul(atk.stages.acc || 0));
    if (Math.random() > accChance) {
      events.push({ t: 'miss', side: A.isPlayer ? 'player' : 'foe', text: `${CREATURES[atk.cid].name}’s ${mv.name} goes wide.` });
      return;
    }

    events.push({
      t: 'move', side: A.isPlayer ? 'player' : 'foe', move: mv.id, type: mv.type,
      kind: mv.kind, name: mv.name
    });
    events.push({ t: 'text', text: `${CREATURES[atk.cid].name} uses ${mv.name}. ${mv.text}`, tone: 'move' });

    if (mv.kind !== 'status') {
      const atkStat = mv.kind === 'phys' ? 'atk' : 'spa';
      const defStat = mv.kind === 'phys' ? 'def' : 'res';
      let dmg = mv.power * (statOf(atk, atkStat) / Math.max(1, statOf(def, defStat)));
      dmg *= 0.28 + 0.014 * atk.level;
      const mult = eff(mv.type, CREATURES[def.cid].type);
      dmg *= mult;
      const crit = Math.random() < 0.07;
      if (crit) dmg *= 1.45;
      dmg *= rnd(0.88, 1.0) * (A.isPlayer ? 1.10 : 0.90);
      if (def.ward) { dmg *= 0.5; def.ward = false; }
      if (b.turn > 45) dmg *= 1 + Math.min(1.2, (b.turn - 45) * 0.07); // long battles must resolve
      dmg = Math.max(1, Math.round(dmg));
      def.hp = Math.max(0, def.hp - dmg);

      events.push({
        t: 'damage', side: B.isPlayer ? 'player' : 'foe', amount: dmg,
        eff: mult, crit, hp: def.hp, maxhp: def.maxhp
      });
      if (crit) pushText(events, 'A clean, lucky strike.', 'good');
      const ew = effectivenessWord(mult);
      if (ew) pushText(events, ew.word, ew.tone);

      if (mv.fx.drain) {
        const heal = Math.max(1, Math.round(dmg * mv.fx.drain));
        atk.hp = Math.min(atk.maxhp, atk.hp + heal);
        events.push({ t: 'heal', side: A.isPlayer ? 'player' : 'foe', amount: heal, hp: atk.hp, maxhp: atk.maxhp });
      }
      if (mv.fx.recoil) {
        const rec = Math.max(1, Math.round(dmg * mv.fx.recoil));
        atk.hp = Math.max(0, atk.hp - rec);
        events.push({ t: 'damage', side: A.isPlayer ? 'player' : 'foe', amount: rec, recoil: true, hp: atk.hp, maxhp: atk.maxhp });
      }
    }

    if (mv.fx.heal) {
      const heal = Math.max(1, Math.round(atk.maxhp * mv.fx.heal));
      const before = atk.hp;
      atk.hp = Math.min(atk.maxhp, atk.hp + heal);
      events.push({ t: 'heal', side: A.isPlayer ? 'player' : 'foe', amount: atk.hp - before, hp: atk.hp, maxhp: atk.maxhp });
    }
    if (mv.fx.buff && applyStage(atk, mv.fx.buff.stat, mv.fx.buff.stages)) {
      events.push({ t: 'text', text: `${CREATURES[atk.cid].name}’s ${STAT_WORD[mv.fx.buff.stat]} rises.`, tone: 'good' });
    }
    if (mv.fx.buff2 && applyStage(atk, mv.fx.buff2.stat, mv.fx.buff2.stages)) {
      events.push({ t: 'text', text: `${CREATURES[atk.cid].name}’s ${STAT_WORD[mv.fx.buff2.stat]} rises.`, tone: 'good' });
    }
    if (mv.fx.debuff && def.hp > 0 && applyStage(def, mv.fx.debuff.stat, mv.fx.debuff.stages)) {
      events.push({ t: 'text', text: `${CREATURES[def.cid].name}’s ${STAT_WORD[mv.fx.debuff.stat]} falls.`, tone: 'weak' });
    }
    if (mv.fx.debuff2 && def.hp > 0 && applyStage(def, mv.fx.debuff2.stat, mv.fx.debuff2.stages)) {
      events.push({ t: 'text', text: `${CREATURES[def.cid].name}’s ${STAT_WORD[mv.fx.debuff2.stat]} falls.`, tone: 'weak' });
    }
    if (mv.fx.status === 'scorch' && def.hp > 0) {
      def.scorch = 4;
      events.push({ t: 'text', text: `${CREATURES[def.cid].name} is scorched.`, tone: 'weak' });
    }
    if (mv.fx.ward) atk.ward = true;

    // PP
    if (atk.pp[moveId] !== undefined) atk.pp[moveId] = Math.max(0, atk.pp[moveId] - 1);

    checkFaint(b, events);
  }

  function endOfTurn(b, events) {
    ['player', 'foe'].forEach((s) => {
      const mon = act(b[s]);
      if (!mon || mon.hp <= 0) return;
      if (mon.scorch > 0) {
        mon.scorch -= 1;
        const dmg = Math.max(1, Math.round(mon.maxhp * 0.08));
        mon.hp = Math.max(0, mon.hp - dmg);
        events.push({ t: 'damage', side: s, amount: dmg, status: 'scorch', hp: mon.hp, maxhp: mon.maxhp });
        pushText(events, `${CREATURES[mon.cid].name} is scorched by lingering heat.`, 'weak');
      }
    });
    checkFaint(b, events);
  }

  function checkFaint(b, events) {
    ['player', 'foe'].forEach((s) => {
      const mon = act(b[s]);
      if (mon && mon.hp <= 0 && !mon._fainted) {
        mon._fainted = true;
        events.push({ t: 'faint', side: s, text: `${CREATURES[mon.cid].name} is down.` });
      }
    });
    if (alive(b.player.team).length === 0) { b.over = true; b.winner = 'foe'; }
    else if (alive(b.foe.team).length === 0) { b.over = true; b.winner = 'player'; }
  }

  function chooseAiMove(b) {
    const me = act(b.foe), foe = act(b.player);
    const c = CREATURES[me.cid];
    let moves = c.moves.filter((id) => (me.pp[id] || 0) > 0);
    if (!moves.length) return 'wearied';
    const hpFrac = me.hp / me.maxhp;

    const healMoves = moves.filter((id) => MOVES[id].fx.heal && MOVES[id].fx.heal >= 0.25);
    if (hpFrac < 0.4 && healMoves.length && Math.random() < 0.55) return healMoves[0];

    const buffMoves = moves.filter((id) => MOVES[id].fx.buff && (me.stages[MOVES[id].fx.buff.stat] || 0) < 2);
    if (buffMoves.length && Math.random() < 0.22) return buffMoves[0];

    const scored = moves.map((id) => {
      const mv = MOVES[id];
      if (mv.kind === 'status') return { id, s: 8 + Math.random() * 6 };
      const mult = eff(mv.type, CREATURES[foe.cid].type);
      return { id, s: mv.power * (mv.acc / 100) * mult * (0.9 + Math.random() * 0.25) };
    }).sort((a, c2) => c2.s - a.s);
    return scored[0].id;
  }

  /* Resolve one full turn. action = {type:'move', move:id} | {type:'swap', index:n} */
  function turn(b, action) {
    const events = [];
    if (b.over) return events;

    const pFirst = action.type === 'move'; // swaps always resolve first
    let swapEvent = null;

    if (action.type === 'swap') {
      const target = b.player.team[action.index];
      if (!target || target.hp <= 0) return events;
      b.player.active = action.index;
      swapEvent = { t: 'swap', side: 'player', index: action.index, text: `${CREATURES[target.cid].name} takes the field.` };
    }

    if (action.type === 'item') {
      if (!b.tonics) return events;
      const target = act(b.player);
      b.tonics -= 1;
      const heal = Math.round(target.maxhp * 0.35);
      const before = target.hp;
      target.hp = Math.min(target.maxhp, target.hp + heal);
      events.push({ t: 'item', side: 'player', text: `You uncork a field tonic. ${CREATURES[target.cid].name} recovers.` });
      events.push({ t: 'heal', side: 'player', amount: target.hp - before, hp: target.hp, maxhp: target.maxhp });
      swapEvent = null;
      doMove(b, b.foe, chooseAiMove(b), events);
      if (!b.over) endOfTurn(b, events);
      bossPhaseCheck(b, events);
      b.turn += 1;
      if (b.over) events.push({ t: 'end', winner: b.winner });
      return events;
    }

    const me = act(b.player), foe = act(b.foe);
    const mySpeed = statOf(me, 'spd');
    const foeSpeed = statOf(foe, 'spd');
    const playerGoesFirst = action.type === 'move' ? (mySpeed >= foeSpeed || Math.random() < 0.12) : false;

    if (action.type === 'move') {
      const foeMove = chooseAiMove(b);
      if (playerGoesFirst) {
        doMove(b, b.player, action.move, events);
        if (!b.over && act(b.foe).hp > 0 && !fainted(act(b.player))) doMove(b, b.foe, foeMove, events);
      } else {
        doMove(b, b.foe, foeMove, events);
        if (!b.over && act(b.player).hp > 0 && !fainted(act(b.foe))) doMove(b, b.player, action.move, events);
      }
    } else if (swapEvent) {
      events.push(swapEvent);
      if (!b.over) doMove(b, b.foe, chooseAiMove(b), events);
    }

    if (!b.over) endOfTurn(b, events);

    // training-bout XP incentive happens in campaign layer; boss second wind:
    bossPhaseCheck(b, events);

    b.turn += 1;
    if (b.winner === 'player') {
      const living = b.player.team.filter((m) => m.hp > 0);
      events.push({ t: 'end', winner: 'player' });
      void living;
    } else if (b.winner === 'foe') {
      events.push({ t: 'end', winner: 'foe' });
    }
    return events;
  }

  const fainted = (m) => !m || m.hp <= 0;

  function bossPhaseCheck(b, events) {
    const foe = act(b.foe);
    if (!foe || !foe.boss) return;
    if (b.bossPhase === 1 && foe.hp > 0 && foe.hp < foe.maxhp * 0.5) {
      b.bossPhase = 2;
      const heal = Math.round(foe.maxhp * 0.4);
      foe.hp = Math.min(foe.maxhp, foe.hp + heal);
      foe.stages.spa = 1; foe.stages.spd = 1;
      events.push({ t: 'heal', side: 'foe', amount: heal, hp: foe.hp, maxhp: foe.maxhp });
      events.push({ t: 'text', text: 'The twilight deepens — Velouray’s wings open to their full span.', tone: 'boss' });
    }
  }

  /* ---------- campaign ---------- */
  /* Route order is chosen from the type wheel: rivals your companions have an
     edge over come first, hard counters last. Same six trainers, different road. */
  function routeFor(mentorId) {
    const myType = TRAINERS[mentorId].type;
    const rivals = D.ROUTE.filter((id) => id !== mentorId);
    return rivals.sort((a, b) => {
      const ea = rawEff(myType, TRAINERS[a].type);
      const eb = rawEff(myType, TRAINERS[b].type);
      if (Math.abs(ea - eb) > 0.01) return eb - ea;
      const sa = TRAINERS[a].team.length, sb = TRAINERS[b].team.length;
      if (sa !== sb) return sa - sb;
      return TRAINERS[a].level - TRAINERS[b].level;
    });
  }

  function newGame(mentorId) {
    const pair = D.SECONDS[mentorId];
    const team = [makeMon(D.STARTERS[mentorId], 6), makeMon(pair, 5)];
    return {
      mentor: mentorId,
      team,
      route: routeFor(mentorId),
      chapter: 0,
      defeated: [],
      journal: [],
      recorded: [D.STARTERS[mentorId], D.SECONDS[mentorId]],
      velourayDefeated: false,
      started: Date.now(),
      recruitPending: null
    };
  }

  /* The survey adapts: each rival is pitched a step above your strongest
     companion, with a fixed floor so early chapters stay gentle. */
  /* chapters pitch the rivals a step apart, relative to YOUR strongest
     companion: gentle opener, level ground in the middle, a step up at the end */
  const CHAPTER_DELTA = [-1, 0, 0, 0, 0, 0];

  function levelFor(game, chapter) {
    const top = Math.round(game.team.reduce((s, m) => s + m.level, 0) / Math.max(1, game.team.length));
    const delta = chapter === 'boss' ? 1 : CHAPTER_DELTA[Math.min(chapter || 0, CHAPTER_DELTA.length - 1)];
    return Math.max(5, top + delta);
  }

  function trainerBattle(game, trainerId) {
    const tr = TRAINERS[trainerId];
    const lvl = levelFor(game, game.chapter);
    const foeTeam = tr.team.map((cid) => makeMon(cid, lvl));
    return makeBattle(game.team, foeTeam, { trainer: trainerId });
  }

  /* The Twilight Veil: no heralds, no crowd — one creature, two skies. */
  function finalBattle(game) {
    const bossLevel = Math.max(12, levelFor(game, 'boss'));
    const boss = makeMon('velouray', bossLevel, { boss: true });
    boss.stats = {
      hp: Math.round(boss.stats.hp * 1.42),
      atk: boss.stats.atk,
      def: Math.round(boss.stats.def * 1.1),
      spa: Math.round(boss.stats.spa * 1.06),
      res: Math.round(boss.stats.res * 1.1),
      spd: Math.round(boss.stats.spd * 1.04)
    };
    boss.maxhp = boss.stats.hp; boss.hp = boss.maxhp;
    return makeBattle(game.team, [boss], { trainer: 'velouray' });
  }

  /* A single wild companion, met on the map. Same engine, one foe. */
  function wildBattle(game, cid, level) {
    const mon = makeMon(cid, Math.max(3, level));
    return makeBattle(game.team, [mon], { trainer: null, wild: true });
  }

  function wildLevel(game) {
    const avg = Math.round(game.team.reduce((s, m) => s + m.level, 0) / Math.max(1, game.team.length));
    return Math.max(4, avg - 1);
  }

  function awardBattle(b, events) {
    const gains = [];
    if (b.winner !== 'player') return gains;
    const foeTeam = b.foe.team;
    foeTeam.forEach((m) => {
      const amount = Math.round((24 + 11 * m.level) * (m.boss ? 3.2 : 1));
      b.player.team.forEach((mine, i) => {
        const share = (i === b.player.active ? 1 : 0.65) * (mine.hp <= 0 ? 0.5 : 1);
        const before = mine.level;
        gainXp(mine, Math.round(amount * share), events);
        gains.push({ cid: mine.cid, amount: Math.round(amount * share), levelUp: mine.level > before });
      });
    });
    return gains;
  }

  function recruitLevel(game, trainerLevel) {
    const top = Math.max.apply(null, game.team.map((m) => m.level));
    return Math.max(trainerLevel, top - 1);
  }

  /* Three wild companions are offered after each victory: one that answers the
     next rival, one from the trainer you just bested, and one passing stranger. */
  function recruitChoices(game, defeatedTrainerId) {
    const owned = new Set(game.team.map((m) => m.cid));
    const next = (game.chapter < game.route.length) ? TRAINERS[game.route[game.chapter]] : null;
    const pool = Object.keys(CREATURES).filter((cid) => !owned.has(cid));
    const picks = [];
    const take = (cid) => { if (cid && !picks.includes(cid) && !owned.has(cid)) picks.push(cid); };

    if (next) {
      const good = pool.filter((cid) => rawEff(CREATURES[cid].type, next.type) > 1.2)
        .sort((a, b) => CREATURES[b].base.hp - CREATURES[a].base.hp);
      take(good[Math.floor(Math.random() * Math.min(3, good.length))]);
    }
    if (defeatedTrainerId && TRAINERS[defeatedTrainerId]) {
      const theirs = TRAINERS[defeatedTrainerId].team.filter((c) => !owned.has(c) && !picks.includes(c));
      take(theirs[Math.floor(Math.random() * theirs.length)]);
    }
    const rest = pool.filter((c) => !picks.includes(c));
    take(rest[Math.floor(Math.random() * rest.length)]);
    return picks.slice(0, 3);
  }

  function nextOpponent(game) {
    if (game.chapter < game.route.length) {
      const id = game.route[game.chapter];
      return { kind: 'trainer', id, trainer: TRAINERS[id] };
    }
    return { kind: 'final', id: 'velouray' };
  }

  const API = {
    makeMon, statsFor, makeBattle, turn, healAll, newGame, trainerBattle, finalBattle,
    awardBattle, nextOpponent, recruitChoices, recruitLevel, levelFor, routeFor, wildBattle, wildLevel, gainXp, xpNeeded, alive, statOf, stageMul, eff,
    CREATURES, MOVES, TRAINERS, TYPES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.WS_ENGINE = API;
})(typeof window !== 'undefined' ? window : globalThis);
