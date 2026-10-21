window.LB = window.LB || {};
// ============================================================
// Lanternbound — story: what happens when you talk to people or objects
// ============================================================
LB.story = {
  async intro() {
    const G = LB.G, R = G.roles;
    await LB.dialog([
      LB.t("Welcome to Hollow Village, {p}. I'm {m}.", { p: G.player, m: R.mentor }),
      LB.t('{s} has chosen you, and its lantern glows brighter already.', { s: G.starter }),
      LB.t("Wild companions roam the tall grass, and they will attack you. Your companion fights where you aim."),
      LB.t('Attack with J or left-click, use a special move with K or right-click, and dodge with Space. When a wild one flashes red, it is about to strike!'),
      LB.t("Knock a wild companion out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the golden ring touches the circle."),
      LB.t("I've given you 5 crystal lanterns. Hit the ring three times and it joins you!"),
      LB.t('{r} guards the meadow gate to the north. Show them your bond!', { r: R.ranger }),
      LB.t('Rest at the shrine lantern beside the houses, and visit the Lantern Stall for special lanterns.')
    ], R.mentor);
    LB.save(true);
  },

  async interact(tx, ty) {
    const G = LB.G, tile = LB.MAP[ty] && LB.MAP[ty][tx];
    if (tile === LB.t('S')) {
      LB.healAll(); LB.SFX.heal();
      const lines = [LB.t('The shrine lantern glows softly…'), LB.t('Your companions are fully rested, and your journey has been saved.')];
      if (LB.lanternTotal() === 0) { G.items.lantern = 2; lines.push(LB.t('Someone left 2 spare Crystal Lanterns at the shrine for you.')); }
      LB.updHud(); LB.save(true); await LB.dialog(lines); return;
    }
    if (tile === LB.t('M')) { await LB.shop(); return; }
    if (tile === LB.t('P')) { await LB.dialog([LB.t('An ancient standing stone. Warm light pulses deep inside it.')]); return; }
    if (tile === LB.t('H')) { await LB.dialog([LB.t('The door is shut. Someone inside is humming.')]); return; }
    const n = LB.npcAt(tx, ty); if (!n) return;
    const who = n.who, beat = G.beat;
    const reward = (k, v) => { if (k === 'coins') G.coins += v; else G.items[k] += v; LB.updHud(); };

    switch (n.id) {
      case 'mentor':
        await LB.dialog([LB.t('{p}! How is {c} doing?', { p: G.player, c: G.party[0].sp }),
          LB.t('Weaken a wild companion first, then offer it a lantern. The weaker it is, the more likely it is to join you.'),
          LB.t('Grove beats Tide and Stone. Tide beats Ember and Stone. Ember beats Grove and Glimmer.'),
          LB.t('Gale beats Grove and Glimmer. Stone beats Gale and Ember. Glimmer beats Gale and Tide.')], who);
        return;
      case 'ranger':
        if (beat.ranger) { await LB.dialog([LB.t('The meadow is yours to explore. Look for Loomtails in the tall grass!')], who); return; }
        await LB.dialog([LB.t('Hold on! Nobody walks into Whisper Meadow without showing me their bond with their companion.'), LB.t("Let's see what you've got!")], who);
        if (await LB.world.trainerFight(n, LB.rangerTeam())) {
          reward('lantern', 3);
          await LB.dialog([LB.t('Well fought! Take these 3 lanterns. The meadow is open to you now.'), LB.t('Tip: the Lantern Stall in the village sells special lanterns for coins.')], who);
        }
        return;
      case 'rival':
        if (beat.rival) { await LB.dialog([LB.t("Next time I'll win. The ridge is past the reeds to the north-east, and the Lantern Gate is in the grove to the south-east.")], who); return; }
        await LB.dialog([LB.t('Hey {p}! I picked {c} because it beats yours.', { p: G.player, c: LB.rivalStarter() }), LB.t('Nobody crosses this bridge until I say so!')], who);
        if (await LB.world.trainerFight(n, [LB.mk('Tasselk', 7), LB.mk(LB.rivalStarter(), 8)])) {
          reward('salve', 2);
          await LB.dialog([LB.t('Hmph… fine. Take 2 salves. Rumor says the Warden waits on top of Cairn Ridge.'), LB.t('And… the old Lantern Gate in Amberroot Grove woke up when we fought. It leads to the Crystal Caverns. A giant alpha lives down there.')], who);
        }
        return;
      case 'angler':
        if (beat.angler) { await LB.dialog([LB.t("The river told me you'd grow strong. Keep going.")], who); return; }
        await LB.dialog([LB.t('The current here is strong, and so are my companions. Want to test yourself?')], who);
        if (await LB.world.trainerFight(n, [LB.mk('Rillspool', 10), LB.mk('Coralune', 11)])) {
          reward('lantern', 3);
          await LB.dialog([LB.t('Like water around a stone. Take 3 lanterns.')], who);
        }
        return;
      case 'warden':
        if (beat.warden) { await LB.dialog([LB.t('The lanterns of this land shine brighter with you, Warden.')], who); return; }
        await LB.dialog([LB.t('So you climbed Cairn Ridge.'), LB.t('I am the Warden of the lanterns. Show me that your companions trust you.')], who);
        if (await LB.world.trainerFight(n, [LB.mk('Cairnib', 12), LB.mk('Glimmerell', 13), LB.mk('Nimbrook', 14)])) {
          G.done = true; reward('warden', 1); LB.save(true);
          await LB.dialog([LB.t('…Your light is true. From today, you are a Lantern Warden too.'),
            LB.t('Take this Warden Lantern. Any companion will trust its light, so save it for one you truly want.'),
            LB.t('Every companion you have not met yet is still out there. Fill your journal!')], who);
          await LB.dialog([LB.t('You finished Lanternbound! Keep exploring and fill all 18 journal entries.')]);
        }
        return;
    }
  }
};
