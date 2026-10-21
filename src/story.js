window.LB = window.LB || {};
// ============================================================
// Lanternbound — story: what happens when you talk to people or objects
// ============================================================
LB.story = {
  async intro() {
    const G = LB.G, R = G.roles;
    await LB.dialog([
      `Welcome to Hollow Village, ${G.player}. I'm ${R.mentor}.`,
      `${G.starter} has chosen you, and its lantern glows brighter already.`,
      "Wild companions roam the tall grass, and they will attack you. Your companion fights where you aim.",
      'Attack with J or left-click, use a special move with K or right-click, and dodge with Space. When a wild one flashes red, it is about to strike!',
      "Knock a wild companion out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the golden ring touches the circle.",
      "I've given you 5 crystal lanterns. Hit the ring three times and it joins you!",
      `${R.ranger} guards the meadow gate to the north. Show them your bond!`,
      'Rest at the shrine lantern beside the houses, and visit the Lantern Stall for special lanterns.'
    ], R.mentor);
    LB.save(true);
  },

  async interact(tx, ty) {
    const G = LB.G, tile = LB.MAP[ty] && LB.MAP[ty][tx];
    if (tile === 'S') {
      LB.healAll(); LB.SFX.heal();
      const lines = ['The shrine lantern glows softly…', 'Your companions are fully rested, and your journey has been saved.'];
      if (LB.lanternTotal() === 0) { G.items.lantern = 2; lines.push('Someone left 2 spare Crystal Lanterns at the shrine for you.'); }
      LB.updHud(); LB.save(true); await LB.dialog(lines); return;
    }
    if (tile === 'M') { await LB.shop(); return; }
    if (tile === 'P') { await LB.dialog(['An ancient standing stone. Warm light pulses deep inside it.']); return; }
    if (tile === 'H') { await LB.dialog(['The door is shut. Someone inside is humming.']); return; }
    const n = LB.npcAt(tx, ty); if (!n) return;
    const who = n.who, beat = G.beat;
    const reward = (k, v) => { if (k === 'coins') G.coins += v; else G.items[k] += v; LB.updHud(); };

    switch (n.id) {
      case 'mentor':
        await LB.dialog([`${G.player}! How is ${G.party[0].sp} doing?`,
          'Weaken a wild companion first, then offer it a lantern. The weaker it is, the more likely it is to join you.',
          'Grove beats Tide and Stone. Tide beats Ember and Stone. Ember beats Grove and Glimmer.',
          'Gale beats Grove and Glimmer. Stone beats Gale and Ember. Glimmer beats Gale and Tide.'], who);
        return;
      case 'ranger':
        if (beat.ranger) { await LB.dialog(['The meadow is yours to explore. Look for Loomtails in the tall grass!'], who); return; }
        await LB.dialog(['Hold on! Nobody walks into Whisper Meadow without showing me their bond with their companion.', "Let's see what you've got!"], who);
        if (await LB.world.trainerFight(n, LB.rangerTeam())) {
          reward('lantern', 3);
          await LB.dialog(['Well fought! Take these 3 lanterns. The meadow is open to you now.', 'Tip: the Lantern Stall in the village sells special lanterns for coins.'], who);
        }
        return;
      case 'rival':
        if (beat.rival) { await LB.dialog(["Next time I'll win. The ridge is past the reeds to the north-east, and the Lantern Gate is in the grove to the south-east."], who); return; }
        await LB.dialog([`Hey ${G.player}! I picked ${LB.rivalStarter()} because it beats yours.`, 'Nobody crosses this bridge until I say so!'], who);
        if (await LB.world.trainerFight(n, [LB.mk('Tasselk', 7), LB.mk(LB.rivalStarter(), 8)])) {
          reward('salve', 2);
          await LB.dialog(['Hmph… fine. Take 2 salves. Rumor says the Warden waits on top of Cairn Ridge.', 'And… the old Lantern Gate in Amberroot Grove woke up when we fought. It leads to the Crystal Caverns. A giant alpha lives down there.'], who);
        }
        return;
      case 'angler':
        if (beat.angler) { await LB.dialog(["The river told me you'd grow strong. Keep going."], who); return; }
        await LB.dialog(['The current here is strong, and so are my companions. Want to test yourself?'], who);
        if (await LB.world.trainerFight(n, [LB.mk('Rillspool', 10), LB.mk('Coralune', 11)])) {
          reward('lantern', 3);
          await LB.dialog(['Like water around a stone. Take 3 lanterns.'], who);
        }
        return;
      case 'warden':
        if (beat.warden) { await LB.dialog(['The lanterns of this land shine brighter with you, Warden.'], who); return; }
        await LB.dialog(['So you climbed Cairn Ridge.', 'I am the Warden of the lanterns. Show me that your companions trust you.'], who);
        if (await LB.world.trainerFight(n, [LB.mk('Cairnib', 12), LB.mk('Glimmerell', 13), LB.mk('Nimbrook', 14)])) {
          G.done = true; reward('warden', 1); LB.save(true);
          await LB.dialog(['…Your light is true. From today, you are a Lantern Warden too.',
            'Take this Warden Lantern. Any companion will trust its light, so save it for one you truly want.',
            'Every companion you have not met yet is still out there. Fill your journal!'], who);
          await LB.dialog(['You finished Lanternbound! Keep exploring and fill all 18 journal entries.']);
        }
        return;
    }
  }
};
