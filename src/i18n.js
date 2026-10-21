window.LB = window.LB || {};
// ============================================================
// Lanternbound — languages: English (source), Français, العربية
// LB.t('English text', { name: value }) returns the text in the chosen
// language; {name} placeholders are filled in. Missing entries fall back
// to English. Elements with data-i18n / data-i18n-html / data-i18n-title
// are refreshed by LB.applyI18n() when the language changes.
// Companion and trainer names are proper names and stay the same.
// ============================================================
LB.LANGS = { en: 'English', fr: 'Français', ar: 'العربية' };
LB.lang = (() => {
  try { const s = localStorage.getItem('lb_lang'); if (s && LB.LANGS[s]) return s; } catch (e) {}
  const n = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
  return LB.LANGS[n] ? n : 'en';
})();

LB.t = function (s, p) {
  const d = LB.I18N[LB.lang];
  let r = (d && d[s] != null) ? d[s] : s;
  if (p) r = r.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m));
  return r;
};
LB.applyI18n = function (root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = LB.t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = LB.t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = LB.t(el.dataset.i18nTitle); });
};
LB.langHooks = [];
LB.setLang = function (l) {
  if (!LB.LANGS[l]) l = 'en';
  LB.lang = l;
  try { localStorage.setItem('lb_lang', l); } catch (e) {}
  const html = document.documentElement; html.lang = l;
  document.body && document.body.classList.toggle('rtl', l === 'ar');
  LB.applyI18n();
  if (LB.updHud) LB.updHud();
  LB.langHooks.forEach(f => { try { f(l); } catch (e) {} });
};
// Arabic: right-to-left text panels and an Arabic font (Cairo, loaded with the other fonts)
const RTL_CSS = `
body.rtl #lb-ui, body.rtl #hud3d, body.rtl #lb-screen, body.rtl #lb-labels, body.rtl #lb-stagecard,
body.rtl #lb-ui .nm, body.rtl #lb-ui h3, body.rtl #lb-ui h4, body.rtl #dialog .who, body.rtl #toast,
body.rtl #hud3d .lead .nm, body.rtl #hud3d .banner, body.rtl #lb-screen h2, body.rtl #lb-screen .tcard b, body.rtl #lb-stagecard b { font-family: Cairo, Nunito, sans-serif }
body.rtl #dialog, body.rtl #lb-ui .card, body.rtl #lb-screen p, body.rtl #lb-screen .tcard, body.rtl #hud3d .help, body.rtl #toast, body.rtl #hud3d .info, body.rtl #lb-stagecard { direction: rtl }
body.rtl #dialog .more { right: auto; left: 12px }
body.rtl #dialog .txt { font-size: 18px; line-height: 1.6 }
body.rtl #lb-stagecard small { letter-spacing: 0 }
`;
addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style'); st.textContent = RTL_CSS; document.head.appendChild(st);
  LB.setLang(LB.lang);
});

LB.I18N = { en: {} };

// ------------------------------------------------------------ Français
LB.I18N.fr = {
  // interface
  'Party': 'Équipe', 'Journal': 'Journal', 'Save': 'Sauver', 'Rotate camera (Z / X)': 'Tourner la caméra (Z / X)', 'Full screen': 'Plein écran',
  'Language': 'Langue', 'Sound on/off': 'Son', 'fx': 'effets', 'off': 'coupé', 'Lantern Stall': 'Échoppe des lanternes',
  'Choose who goes next': 'Qui passe ensuite ?', 'Switch companion': 'Changer de compagnon', 'Your companions': 'Vos compagnons',
  'Lv': 'Niv', 'HP': 'PV', 'ATK': 'ATQ', 'DEF': 'DÉF', 'SPD': 'VIT', 'Lead': 'En tête', 'Salve': 'Baume', 'Send out': 'Envoyer',
  'Resting at the shrine': 'Au repos au sanctuaire', 'Swap in': 'Échanger',
  '· {c} befriended · {s} seen / {n}': '· {c} amis · {s} vus / {n}',
  "You haven't met this companion yet. Explore the tall grass!": "Vous n'avez pas encore rencontré ce compagnon. Explorez les hautes herbes !",
  'Starter; rare in Amberroot Grove': 'Compagnon de départ ; rare dans le Bosquet des Racines d’Ambre',
  'Moves:': 'Attaques :', 'Strong vs': 'Fort contre', 'Found:': 'Où :', '{n} coins': '{n} pièces', 'you have {n}': 'vous en avez {n}',
  'Restores about a quarter of HP plus 20.': 'Rend environ un quart des PV, plus 20.',
  'Game saved': 'Partie sauvegardée', 'Saving is not available here': 'Sauvegarde impossible ici',
  'Sound: music + effects': 'Son : musique + effets', 'Sound: effects only': 'Son : effets seulement', 'Sound: off': 'Son : coupé',
  'Graphics: fast mode (G to change)': 'Graphismes : mode rapide (G pour changer)', 'Graphics: beautiful': 'Graphismes : beaux', 'Graphics: fast': 'Graphismes : rapides',
  'ALPHA': 'ALPHA', 'Companion': 'Compagnon', 'Special': 'Spécial', 'Roll': 'Roulade', 'Lantern': 'Lanterne', 'No companion': 'Aucun compagnon',
  'Salves': 'Baumes', 'Coins': 'Pièces', "{w}'s {c} · {n} left": '{c} de {w} · encore {n}',
  'Aim… E or click to throw': 'Visez… E ou clic pour lancer', 'Aim… tap 🏮 to throw': 'Visez… touchez 🏮 pour lancer',
  'Press SPACE when the gold ring meets the white ring!': 'ESPACE quand l’anneau doré touche l’anneau blanc !',
  'Tap when the gold ring meets the white ring!': 'Touchez quand l’anneau doré touche l’anneau blanc !',
  'Lighting the lanterns…': 'On allume les lanternes…', 'Choose your trainer': 'Choisissez votre dresseur', 'Continue as {n}': 'Continuer avec {n}',
  'Choose your first companion': 'Choisissez votre premier compagnon', 'Your rival will take the one that beats yours.': 'Votre rivale prendra celui qui bat le vôtre.',
  'Weapons': 'Armes', 'Buy': 'Acheter', 'Max': 'Max', 'Upgrade to Lv{n}': 'Améliorer niv {n}', 'not owned': 'pas à vous', '{t} type': 'type {t}',
  '<b>WASD</b> move · <b>Left-click / J</b> weapon (hold with the wand to charge) · <b>1 2 3</b> weapons<br><b>Right-click / K</b> companion attack · <b>L</b> special · <b>Space</b> roll<br><b>E</b> aim + throw lantern (<b>R</b> type) · <b>Q</b> switch companion · <b>H</b> salve · <b>F</b> talk / gate<br><b>Z X</b> turn camera · <b>G</b> graphics · <b>?</b> help':
    '<b>WASD</b> (AZERTY : <b>ZQSD</b>) bouger · <b>Clic gauche / J</b> arme (maintenir avec la baguette pour charger) · <b>1 2 3</b> armes<br><b>Clic droit / K</b> attaque du compagnon · <b>L</b> spécial · <b>Espace</b> roulade<br><b>E</b> viser + lancer une lanterne (<b>R</b> type) · <b>Q</b> (AZERTY : <b>A</b>) changer de compagnon · <b>H</b> baume · <b>F</b> parler / porte<br><b>Z X</b> (AZERTY : <b>W X</b>) tourner la caméra · <b>G</b> graphismes · <b>?</b> aide',
  // game messages
  "Welcome to Hollow Village, {p}. I'm {m}.": 'Bienvenue au Village du Creux, {p}. Je suis {m}.',
  '{s} has chosen you. It will follow you and fight by your side.': '{s} vous a choisi. Il vous suivra et se battra à vos côtés.',
  'Your Crystal Staff swings with left-click or J. Click three times for a combo. Your companion attacks with right-click or K, and L is its special move.':
    'Votre Bâton de Cristal frappe avec le clic gauche ou J. Cliquez trois fois pour un combo. Votre compagnon attaque avec le clic droit ou K, et L lance son attaque spéciale.',
  'Your Crystal Staff swings with the A button. Tap three times for a combo. Your companion fights on its own, and SP is its special move.':
    'Votre Bâton de Cristal frappe avec le bouton A. Touchez trois fois pour un combo. Votre compagnon se bat tout seul, et SP lance son attaque spéciale.',
  'Wild companions roam the tall grass. A red shape on the ground shows where they are about to strike, so roll away with Space!':
    'Des compagnons sauvages rôdent dans les hautes herbes. Une forme rouge au sol montre où ils vont frapper : roulez avec Espace !',
  'Wild companions roam the tall grass. A red shape on the ground shows where they are about to strike, so roll away with ⤳!':
    'Des compagnons sauvages rôdent dans les hautes herbes. Une forme rouge au sol montre où ils vont frapper : roulez avec ⤳ !',
  'Knock one out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the gold ring meets the white ring. Three hits and it joins you!':
    'Mettez-en un K.-O. et il sera étourdi. Appuyez sur E pour viser avec une lanterne, lancez-la, puis appuyez sur Espace chaque fois que l’anneau doré touche l’anneau blanc. Trois réussites et il vous rejoint !',
  'Knock one out and it gets dazed. Tap 🏮 to aim a lantern, tap again to throw, then tap each time the gold ring meets the white ring. Three hits and it joins you!':
    'Mettez-en un K.-O. et il sera étourdi. Touchez 🏮 pour viser, encore une fois pour lancer, puis touchez chaque fois que l’anneau doré touche l’anneau blanc. Trois réussites et il vous rejoint !',
  '{r} guards the meadow gate to the north. The Lantern Stall sells lanterns, a Sling and a Crystal Wand.':
    '{r} garde l’entrée de la prairie au nord. L’Échoppe des lanternes vend des lanternes, une Fronde et une Baguette de Cristal.',
  'Level {n}': 'Niveau {n}', 'Lantern Gate': 'Porte des Lanternes', 'Where should the gate take you?': 'Où la porte doit-elle vous emmener ?',
  'Alpha caught': 'Alpha capturé', 'Alpha beaten': 'Alpha vaincu', 'Alpha: {c}': 'Alpha : {c}', 'You are here': 'Vous êtes ici', 'Stay here': 'Rester ici',
  'It calls for help!': 'Il appelle à l’aide !', 'SLAM!': 'CHOC !', 'Go, {c}!': 'Vas-y, {c} !', 'No salves left': 'Plus de baumes', 'Everyone is healthy': 'Tout le monde va bien',
  '{w}: buy it at the Lantern Stall': '{w} : à acheter à l’Échoppe des lanternes', 'CRIT': 'CRITIQUE', 'SUPER!': 'SUPER !',
  '{c} is worn out!': '{c} est épuisé !', 'No companions left: run to the shrine!': 'Plus de compagnons : courez au sanctuaire !',
  'ALPHA DEFEATED!': 'ALPHA VAINCU !', 'A new path opened: {s}! Use the Lantern Gate.': 'Un nouveau chemin s’ouvre : {s} ! Prenez la Porte des Lanternes.',
  'You beat every alpha. You are a true Lanternbound!': 'Vous avez vaincu tous les alphas. Vous êtes un vrai Lanternbound !',
  'Dazed! Throw a lantern (E)': 'Étourdi ! Lancez une lanterne (E)', 'Dazed! Throw a lantern (🏮)': 'Étourdi ! Lancez une lanterne (🏮)',
  'LEVEL UP!': 'NIVEAU SUPÉRIEUR !', 'Everything went dark…': 'Tout devient noir…', 'You wake up beside the shrine. Everyone is rested now.': 'Vous vous réveillez près du sanctuaire. Tout le monde est reposé.',
  'It ran away…': 'Il s’est enfui…', 'No lanterns! Buy some at the stall': 'Plus de lanternes ! Achetez-en à l’échoppe',
  "Can't befriend a trainer's companion": 'Impossible de capturer le compagnon d’un dresseur', 'Too strong! Weaken it first': 'Trop fort ! Affaiblissez-le d’abord', 'Missed!': 'Raté !',
  'Good!': 'Bien !', 'Great!': 'Super !', 'Perfect!': 'Parfait !', '{c} joined you!': '{c} vous rejoint !', '{c} added to your journal!': '{c} ajouté à votre journal !',
  '{c} went to rest at the shrine (party full)': '{c} se repose au sanctuaire (équipe pleine)', 'It broke free!': 'Il s’est libéré !',
  'You beat {n}!': 'Vous avez battu {n} !', '{n} sends out {c}!': '{n} envoie {c} !', "{n}: Come back when you're ready!": '{n} : Revenez quand vous serez prêt !',
  'Talk': 'Parler', 'Lantern!': 'Lanterne !', 'Turn your phone sideways for a wider view': 'Tournez votre téléphone pour voir plus large',
  // story
  '{s} has chosen you, and its lantern glows brighter already.': '{s} vous a choisi, et sa lanterne brille déjà plus fort.',
  'Wild companions roam the tall grass, and they will attack you. Your companion fights where you aim.': 'Des compagnons sauvages rôdent dans les hautes herbes et vous attaqueront. Votre compagnon se bat là où vous visez.',
  'Attack with J or left-click, use a special move with K or right-click, and dodge with Space. When a wild one flashes red, it is about to strike!': 'Attaquez avec J ou le clic gauche, attaque spéciale avec K ou le clic droit, esquivez avec Espace. Quand un sauvage clignote en rouge, il va frapper !',
  'Knock a wild companion out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the golden ring touches the circle.': 'Mettez un compagnon sauvage K.-O. et il sera étourdi. Appuyez sur E pour viser, lancez une lanterne, puis appuyez sur Espace quand l’anneau doré touche le cercle.',
  "I've given you 5 crystal lanterns. Hit the ring three times and it joins you!": 'Je vous ai donné 5 lanternes de cristal. Réussissez l’anneau trois fois et il vous rejoint !',
  '{r} guards the meadow gate to the north. Show them your bond!': '{r} garde l’entrée de la prairie au nord. Montrez-lui votre lien !',
  'Rest at the shrine lantern beside the houses, and visit the Lantern Stall for special lanterns.': 'Reposez-vous à la lanterne du sanctuaire près des maisons, et passez à l’Échoppe pour des lanternes spéciales.',
  'The shrine lantern glows softly…': 'La lanterne du sanctuaire brille doucement…', 'Your companions are fully rested, and your journey has been saved.': 'Vos compagnons sont reposés et votre voyage est sauvegardé.',
  'Someone left 2 spare Crystal Lanterns at the shrine for you.': 'Quelqu’un vous a laissé 2 Lanternes de Cristal au sanctuaire.',
  'An ancient standing stone. Warm light pulses deep inside it.': 'Une ancienne pierre levée. Une lumière chaude bat tout au fond.',
  'The door is shut. Someone inside is humming.': 'La porte est fermée. Quelqu’un fredonne à l’intérieur.',
  '{p}! How is {c} doing?': '{p} ! Comment va {c} ?',
  'Weaken a wild companion first, then offer it a lantern. The weaker it is, the more likely it is to join you.': 'Affaiblissez d’abord un compagnon sauvage, puis offrez-lui une lanterne. Plus il est faible, plus il a de chances de vous rejoindre.',
  'Grove beats Tide and Stone. Tide beats Ember and Stone. Ember beats Grove and Glimmer.': 'Bosquet bat Marée et Pierre. Marée bat Braise et Pierre. Braise bat Bosquet et Éclat.',
  'Gale beats Grove and Glimmer. Stone beats Gale and Ember. Glimmer beats Gale and Tide.': 'Rafale bat Bosquet et Éclat. Pierre bat Rafale et Braise. Éclat bat Rafale et Marée.',
  'The meadow is yours to explore. Look for Loomtails in the tall grass!': 'La prairie est à vous. Cherchez des Loomtails dans les hautes herbes !',
  'Hold on! Nobody walks into Whisper Meadow without showing me their bond with their companion.': 'Halte ! Personne n’entre dans la Prairie des Murmures sans me montrer son lien avec son compagnon.',
  "Let's see what you've got!": 'Voyons ce que vous valez !', 'Well fought! Take these 3 lanterns. The meadow is open to you now.': 'Bien joué ! Prenez ces 3 lanternes. La prairie vous est ouverte.',
  'Tip: the Lantern Stall in the village sells special lanterns for coins.': 'Astuce : l’Échoppe du village vend des lanternes spéciales contre des pièces.',
  "Next time I'll win. The ridge is past the reeds to the north-east, and the Lantern Gate is in the grove to the south-east.": 'La prochaine fois, je gagnerai. La crête est après les roseaux au nord-est, et la Porte des Lanternes est dans le bosquet au sud-est.',
  'Hey {p}! I picked {c} because it beats yours.': 'Hé {p} ! J’ai pris {c} parce qu’il bat le tien.', 'Nobody crosses this bridge until I say so!': 'Personne ne traverse ce pont sans ma permission !',
  'Hmph… fine. Take 2 salves. Rumor says the Warden waits on top of Cairn Ridge.': 'Hmph… d’accord. Prends 2 baumes. On dit que le Gardien attend en haut de la Crête du Cairn.',
  'And… the old Lantern Gate in Amberroot Grove woke up when we fought. It leads to the Crystal Caverns. A giant alpha lives down there.': 'Et… la vieille Porte des Lanternes du Bosquet des Racines d’Ambre s’est réveillée pendant notre combat. Elle mène aux Grottes de Cristal. Un alpha géant vit là-dessous.',
  "The river told me you'd grow strong. Keep going.": 'La rivière m’a dit que tu deviendrais fort. Continue.',
  'The current here is strong, and so are my companions. Want to test yourself?': 'Le courant est fort ici, et mes compagnons aussi. Tu veux te mesurer à eux ?',
  'Like water around a stone. Take 3 lanterns.': 'Comme l’eau autour d’une pierre. Prends 3 lanternes.',
  'The lanterns of this land shine brighter with you, Warden.': 'Les lanternes de ce pays brillent plus fort grâce à toi, Gardien.',
  'So you climbed Cairn Ridge.': 'Tu as donc gravi la Crête du Cairn.', 'I am the Warden of the lanterns. Show me that your companions trust you.': 'Je suis le Gardien des lanternes. Montre-moi que tes compagnons te font confiance.',
  '…Your light is true. From today, you are a Lantern Warden too.': '…Ta lumière est sincère. Dès aujourd’hui, tu es toi aussi Gardien des lanternes.',
  'Take this Warden Lantern. Any companion will trust its light, so save it for one you truly want.': 'Prends cette Lanterne du Gardien. Tout compagnon se fie à sa lumière : garde-la pour celui que tu veux vraiment.',
  'Every companion you have not met yet is still out there. Fill your journal!': 'Tous les compagnons que tu n’as pas encore croisés t’attendent. Remplis ton journal !',
  'You finished Lanternbound! Keep exploring and fill all 18 journal entries.': 'Vous avez fini Lanternbound ! Continuez à explorer et remplissez les 18 pages du journal.',
  // types
  'Grove': 'Bosquet', 'Tide': 'Marée', 'Ember': 'Braise', 'Gale': 'Rafale', 'Stone': 'Pierre', 'Glimmer': 'Éclat', 'Plain': 'Neutre',
  // places and stages
  'Hollow Village': 'Village du Creux', 'Whisper Meadow': 'Prairie des Murmures', 'Rillbank Reeds': 'Roseaux du Ruisseau', 'Amberroot Grove': 'Bosquet des Racines d’Ambre',
  'Cairn Ridge': 'Crête du Cairn', 'Shimmer Fields': 'Champs Scintillants', 'Glowcap Beds': 'Tapis de Champignons Lumineux', 'Crystal Caverns': 'Grottes de Cristal',
  'Cinder Scrub': 'Broussailles de Cendre', 'Smoulder Rocks': 'Rochers Fumants', 'Ember Hollow': 'Creux des Braises', 'Mistfall Shore': 'Rive de Brume',
  'Moonlit Meadow': 'Prairie au Clair de Lune', 'Mistfall Lake': 'Lac de Brume', 'Alpha Arena': 'Arène de l’Alpha', 'Hollow Valley': 'Vallée du Creux',
  'Meadows, reeds and the old grove': 'Prairies, roseaux et vieux bosquet', 'Glowing crystals under the mountain': 'Des cristaux lumineux sous la montagne',
  'Rivers of lava and cinder scrub': 'Rivières de lave et broussailles de cendre', 'A silver lake under the moon': 'Un lac d’argent sous la lune',
  'Beat your rival in the valley': 'Battez votre rivale dans la vallée', 'Defeat the alpha of the Crystal Caverns': 'Battez l’alpha des Grottes de Cristal',
  'Defeat the alpha of Ember Hollow': 'Battez l’alpha du Creux des Braises',
  // weapons
  'Crystal Staff': 'Bâton de Cristal', 'Sling': 'Fronde', 'Crystal Wand': 'Baguette de Cristal',
  'Close-range swings. 3-hit combo, the last hit knocks enemies back.': 'Coups de près. Combo de 3 coups, le dernier repousse les ennemis.',
  'Throws stones in an arc. Stone type: strong vs Gale and Ember.': 'Lance des pierres en cloche. Type Pierre : fort contre Rafale et Braise.',
  'Hold to charge a magic bolt that pierces. Glimmer type: strong vs Gale and Tide.': 'Maintenez pour charger un trait magique perçant. Type Éclat : fort contre Rafale et Marée.',
  // lanterns
  'Crystal Lantern': 'Lanterne de Cristal', 'Moss Lantern': 'Lanterne de Mousse', 'Tide Lantern': 'Lanterne de Marée', 'Ember Lantern': 'Lanterne de Braise',
  'Sky Lantern': 'Lanterne Céleste', 'Dusk Lantern': 'Lanterne du Crépuscule', 'Warden Lantern': 'Lanterne du Gardien',
  'A reliable everyday lantern.': 'Une lanterne fiable de tous les jours.',
  'Twice as likely to befriend Grove companions.': 'Deux fois plus efficace sur les compagnons Bosquet.',
  'Twice as likely to befriend Tide companions.': 'Deux fois plus efficace sur les compagnons Marée.',
  'Twice as likely to befriend Ember companions.': 'Deux fois plus efficace sur les compagnons Braise.',
  'Twice as likely to befriend Gale companions.': 'Deux fois plus efficace sur les compagnons Rafale.',
  'Twice as likely to befriend Stone and Glimmer companions.': 'Deux fois plus efficace sur les compagnons Pierre et Éclat.',
  'Never fails. Only the Warden gives these.': 'Ne rate jamais. Seul le Gardien en donne.',
  // moves
  'Tackle': 'Charge', 'Quick Dart': 'Fléchette Vive', 'Pounce': 'Bond', 'Moss Lash': 'Fouet de Mousse', 'Thornfan': 'Éventail d’Épines', 'Bloom Mend': 'Soin Floral',
  'Spore Haze': 'Brume de Spores', 'Rill Spray': 'Jet du Ruisseau', 'Tidecrash': 'Raz-de-Marée', 'Mist Veil': 'Voile de Brume', 'Soak': 'Trempette',
  'Ember Nip': 'Morsure de Braise', 'Hearthblaze': 'Brasier du Foyer', 'Kindle': 'Attiser', 'Smoke Puff': 'Bouffée de Fumée', 'Gust Slice': 'Rafale Tranchante',
  'Skyfall': 'Chute du Ciel', 'Tailwind': 'Vent Arrière', 'Plume Shield': 'Bouclier de Plumes', 'Pebble Shot': 'Tir de Cailloux', 'Cairn Crash': 'Écrasement du Cairn',
  'Harden': 'Durcir', 'Quake Stomp': 'Piétinement', 'Prism Ray': 'Rayon Prisme', 'Lantern Flare': 'Éclat de Lanterne', 'Glow Mend': 'Soin Lumineux', 'Dazzle': 'Éblouir',
  // companions
  'A slow, patient grazer. Its bronze-ribbed fan hums softly when the forest is safe.': 'Un brouteur lent et patient. Son éventail aux côtes de bronze bourdonne doucement quand la forêt est sûre.',
  'Glides on warm air above the ridge, trailing ribbons of silk-like mist.': 'Plane sur l’air chaud au-dessus de la crête, en traînant des rubans de brume soyeuse.',
  'Weaves its own tail from willow strips and tucks treasures inside the loops.': 'Tresse sa propre queue en lanières de saule et cache des trésors dans ses boucles.',
  'Its looping copper horns catch moonlight. The blue tassel tail signals friends.': 'Ses cornes de cuivre en boucle captent la lune. Sa queue à pompon bleu fait signe aux amis.',
  'Lounges in shallow puddles, fanning its glassy dorsal sail to keep cool.': 'Paresse dans les flaques et agite sa voile dorsale de verre pour rester au frais.',
  'Wades the reeds on stilt legs. The bells on its crest clatter when it laughs.': 'Avance dans les roseaux sur ses pattes d’échassier. Les clochettes de sa crête tintent quand il rit.',
  'Skates across still water, winding river threads onto its spool-shaped body.': 'Patine sur l’eau calme et enroule des fils de rivière sur son corps en bobine.',
  'Its lacy crown glows with moon-spots. Curious and gentle, it loves shiny stones.': 'Sa couronne de dentelle brille de taches de lune. Curieux et doux, il adore les pierres brillantes.',
  'Amber plates on its back stay warm all winter. Villages once gathered around it.': 'Les plaques d’ambre de son dos restent chaudes tout l’hiver. Autrefois, les villages se réunissaient autour de lui.',
  'Its crystal tail coils like frost. Each scale refracts a different color.': 'Sa queue de cristal s’enroule comme le givre. Chaque écaille renvoie une couleur différente.',
  'Fans its blue-gold quills into a shield. Surprisingly fond of being petted.': 'Déploie ses piquants bleu et or en bouclier. Adore étonnamment les caresses.',
  'A fluffy moth whose wing patterns shimmer like embers at dusk.': 'Un papillon de nuit duveteux dont les ailes scintillent comme des braises au crépuscule.',
  'Slate plates grow along its spine. It stacks stones to mark safe paths.': 'Des plaques d’ardoise poussent sur son dos. Il empile des pierres pour marquer les chemins sûrs.',
  'Its woven shell is light but tough. It rolls downhill when excited.': 'Sa carapace tressée est légère mais solide. Il dévale les pentes quand il est content.',
  'A dewdrop snail with a frilled leaf collar. Leaves a sparkling, cooling trail.': 'Un escargot-goutte de rosée au col de feuilles. Il laisse une traînée fraîche et scintillante.',
  'A heron of cloud-soft feathers. Seen standing in mist on the highest rocks.': 'Un héron aux plumes douces comme les nuages, qu’on voit dans la brume sur les plus hauts rochers.',
  'A playful otter whose fan-tail bristles glow hot after a swim.': 'Une loutre joueuse dont la queue en éventail rougeoie après la baignade.',
  'Covered in opal scales. Calm creatures gather around it to rest.': 'Couvert d’écailles d’opale. Les créatures calmes se rassemblent autour de lui pour se reposer.'
};

// ------------------------------------------------------------ العربية
LB.I18N.ar = {
  // interface
  'Party': 'الفريق', 'Journal': 'السجلّ', 'Save': 'حفظ', 'Rotate camera (Z / X)': 'تدوير الكاميرا (Z / X)', 'Full screen': 'ملء الشاشة',
  'Language': 'اللغة', 'Sound on/off': 'الصوت', 'fx': 'مؤثرات', 'off': 'مغلق', 'Lantern Stall': 'كشك الفوانيس',
  'Choose who goes next': 'من يدخل الآن؟', 'Switch companion': 'تبديل الرفيق', 'Your companions': 'رفاقك',
  'Lv': 'م', 'HP': 'صحة', 'ATK': 'هجوم', 'DEF': 'دفاع', 'SPD': 'سرعة', 'Lead': 'في المقدّمة', 'Salve': 'مرهم', 'Send out': 'أرسِل',
  'Resting at the shrine': 'يستريحون في المزار', 'Swap in': 'تبديل', ', ': '، ',
  '· {c} befriended · {s} seen / {n}': '· {c} أصدقاء · {s} شوهدوا / {n}',
  "You haven't met this companion yet. Explore the tall grass!": 'لم تلتقِ بهذا الرفيق بعد. استكشف العشب الطويل!',
  'Starter; rare in Amberroot Grove': 'رفيق البداية؛ نادر في أيكة الجذور الكهرمانية',
  'Moves:': 'الحركات:', 'Strong vs': 'قويّ ضد', 'Found:': 'يوجد في:', '{n} coins': '{n} قطعة نقدية', 'you have {n}': 'لديك {n}',
  'Restores about a quarter of HP plus 20.': 'يعيد ربع الصحة تقريبًا و20 إضافية.',
  'Game saved': 'تم حفظ اللعبة', 'Saving is not available here': 'الحفظ غير متاح هنا',
  'Sound: music + effects': 'الصوت: موسيقى + مؤثرات', 'Sound: effects only': 'الصوت: المؤثرات فقط', 'Sound: off': 'الصوت: مغلق',
  'Graphics: fast mode (G to change)': 'الرسوميات: الوضع السريع (G للتغيير)', 'Graphics: beautiful': 'الرسوميات: جميلة', 'Graphics: fast': 'الرسوميات: سريعة',
  'ALPHA': 'زعيم', 'Companion': 'الرفيق', 'Special': 'خاصّة', 'Roll': 'تدحرج', 'Lantern': 'فانوس', 'No companion': 'لا رفيق',
  'Salves': 'مراهم', 'Coins': 'نقود', "{w}'s {c} · {n} left": '{c} الخاص بـ{w} · بقي {n}',
  'Aim… E or click to throw': 'صوِّب… E أو انقر للرمي', 'Aim… tap 🏮 to throw': 'صوِّب… المس 🏮 للرمي',
  'Press SPACE when the gold ring meets the white ring!': 'اضغط المسافة عندما تلمس الحلقة الذهبية الحلقة البيضاء!',
  'Tap when the gold ring meets the white ring!': 'المس الشاشة عندما تلمس الحلقة الذهبية الحلقة البيضاء!',
  'Lighting the lanterns…': 'نُضيء الفوانيس…', 'Choose your trainer': 'اختر مدرّبك', 'Continue as {n}': 'متابعة باسم {n}',
  'Choose your first companion': 'اختر رفيقك الأول', 'Your rival will take the one that beats yours.': 'منافستك ستأخذ الرفيق الذي يتغلّب على رفيقك.',
  'Weapons': 'الأسلحة', 'Buy': 'شراء', 'Max': 'الأقصى', 'Upgrade to Lv{n}': 'ترقية إلى م{n}', 'not owned': 'غير مملوك', '{t} type': 'نوع {t}',
  '<b>WASD</b> move · <b>Left-click / J</b> weapon (hold with the wand to charge) · <b>1 2 3</b> weapons<br><b>Right-click / K</b> companion attack · <b>L</b> special · <b>Space</b> roll<br><b>E</b> aim + throw lantern (<b>R</b> type) · <b>Q</b> switch companion · <b>H</b> salve · <b>F</b> talk / gate<br><b>Z X</b> turn camera · <b>G</b> graphics · <b>?</b> help':
    '<b>WASD</b> تحرّك · <b>نقرة يسرى / J</b> السلاح (اضغط مطوّلًا بالعصا للشحن) · <b>1 2 3</b> الأسلحة<br><b>نقرة يمنى / K</b> هجوم الرفيق · <b>L</b> حركة خاصة · <b>المسافة</b> تدحرج<br><b>E</b> صوِّب وارمِ فانوسًا (<b>R</b> النوع) · <b>Q</b> تبديل الرفيق · <b>H</b> مرهم · <b>F</b> تحدّث / بوابة<br><b>Z X</b> تدوير الكاميرا · <b>G</b> الرسوميات · <b>?</b> مساعدة',
  // game messages
  "Welcome to Hollow Village, {p}. I'm {m}.": 'مرحبًا بك في قرية الجوف يا {p}. أنا {m}.',
  '{s} has chosen you. It will follow you and fight by your side.': 'لقد اختارك {s}. سيتبعك ويقاتل إلى جانبك.',
  'Your Crystal Staff swings with left-click or J. Click three times for a combo. Your companion attacks with right-click or K, and L is its special move.':
    'تضرب عصاك الكريستالية بالنقرة اليسرى أو J. انقر ثلاث مرات لسلسلة ضربات. يهاجم رفيقك بالنقرة اليمنى أو K، وL حركته الخاصة.',
  'Your Crystal Staff swings with the A button. Tap three times for a combo. Your companion fights on its own, and SP is its special move.':
    'تضرب عصاك الكريستالية بالزر A. المس ثلاث مرات لسلسلة ضربات. رفيقك يقاتل وحده، وSP حركته الخاصة.',
  'Wild companions roam the tall grass. A red shape on the ground shows where they are about to strike, so roll away with Space!':
    'الرفاق البرّيون يجوبون العشب الطويل. شكل أحمر على الأرض يُظهر أين سيضربون، فتدحرج بعيدًا بالمسافة!',
  'Wild companions roam the tall grass. A red shape on the ground shows where they are about to strike, so roll away with ⤳!':
    'الرفاق البرّيون يجوبون العشب الطويل. شكل أحمر على الأرض يُظهر أين سيضربون، فتدحرج بعيدًا بـ ⤳!',
  'Knock one out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the gold ring meets the white ring. Three hits and it joins you!':
    'أسقِط واحدًا فيصبح مذهولًا. اضغط E لتصويب فانوس وارمِه، ثم اضغط المسافة كلما لمست الحلقة الذهبية الحلقة البيضاء. ثلاث إصابات وينضمّ إليك!',
  'Knock one out and it gets dazed. Tap 🏮 to aim a lantern, tap again to throw, then tap each time the gold ring meets the white ring. Three hits and it joins you!':
    'أسقِط واحدًا فيصبح مذهولًا. المس 🏮 للتصويب ثم المس مجددًا للرمي، ثم المس كلما لمست الحلقة الذهبية الحلقة البيضاء. ثلاث إصابات وينضمّ إليك!',
  '{r} guards the meadow gate to the north. The Lantern Stall sells lanterns, a Sling and a Crystal Wand.':
    '{r} يحرس بوابة المرج في الشمال. كشك الفوانيس يبيع فوانيس ومقلاعًا وعصا سحرية كريستالية.',
  'Level {n}': 'المستوى {n}', 'Lantern Gate': 'بوابة الفوانيس', 'Where should the gate take you?': 'إلى أين تأخذك البوابة؟',
  'Alpha caught': 'تم أسر الزعيم', 'Alpha beaten': 'تمت هزيمة الزعيم', 'Alpha: {c}': 'الزعيم: {c}', 'You are here': 'أنت هنا', 'Stay here': 'ابقَ هنا',
  'It calls for help!': 'إنه يطلب النجدة!', 'SLAM!': 'ضربة!', 'Go, {c}!': 'هيا يا {c}!', 'No salves left': 'لم يبقَ أي مرهم', 'Everyone is healthy': 'الجميع بصحة جيدة',
  '{w}: buy it at the Lantern Stall': '{w}: اشترِه من كشك الفوانيس', 'CRIT': 'حرجة', 'SUPER!': 'رائع!',
  '{c} is worn out!': '{c} منهك!', 'No companions left: run to the shrine!': 'لم يبقَ رفاق: أسرِع إلى المزار!',
  'ALPHA DEFEATED!': 'هُزم الزعيم!', 'A new path opened: {s}! Use the Lantern Gate.': 'فُتح طريق جديد: {s}! استخدم بوابة الفوانيس.',
  'You beat every alpha. You are a true Lanternbound!': 'هزمت كل الزعماء. أنت حامل فوانيس حقيقي!',
  'Dazed! Throw a lantern (E)': 'مذهول! ارمِ فانوسًا (E)', 'Dazed! Throw a lantern (🏮)': 'مذهول! ارمِ فانوسًا (🏮)',
  'LEVEL UP!': 'مستوى جديد!', 'Everything went dark…': 'أظلم كل شيء…', 'You wake up beside the shrine. Everyone is rested now.': 'تستيقظ بجانب المزار. الجميع مرتاح الآن.',
  'It ran away…': 'لقد هرب…', 'No lanterns! Buy some at the stall': 'لا فوانيس! اشترِ بعضها من الكشك',
  "Can't befriend a trainer's companion": 'لا يمكن مصادقة رفيق مدرّب آخر', 'Too strong! Weaken it first': 'قويّ جدًا! أضعِفه أولًا', 'Missed!': 'أخطأت!',
  'Good!': 'جيد!', 'Great!': 'رائع!', 'Perfect!': 'ممتاز!', '{c} joined you!': 'انضمّ إليك {c}!', '{c} added to your journal!': 'أُضيف {c} إلى سجلّك!',
  '{c} went to rest at the shrine (party full)': 'ذهب {c} ليستريح في المزار (الفريق ممتلئ)', 'It broke free!': 'لقد أفلت!',
  'You beat {n}!': 'هزمت {n}!', '{n} sends out {c}!': '{n} يرسل {c}!', "{n}: Come back when you're ready!": '{n}: عُد عندما تكون مستعدًا!',
  'Talk': 'تحدّث', 'Lantern!': 'فانوس!', 'Turn your phone sideways for a wider view': 'أدِر هاتفك أفقيًا لرؤية أوسع',
  // story
  '{s} has chosen you, and its lantern glows brighter already.': 'لقد اختارك {s}، وفانوسه يتوهّج أكثر منذ الآن.',
  'Wild companions roam the tall grass, and they will attack you. Your companion fights where you aim.': 'الرفاق البرّيون يجوبون العشب الطويل وسيهاجمونك. رفيقك يقاتل حيث تصوّب.',
  'Attack with J or left-click, use a special move with K or right-click, and dodge with Space. When a wild one flashes red, it is about to strike!': 'هاجم بـ J أو النقرة اليسرى، واستعمل حركة خاصة بـ K أو النقرة اليمنى، وتفادَ بالمسافة. عندما يومض البرّي بالأحمر فهو على وشك الضرب!',
  'Knock a wild companion out and it gets dazed. Press E to aim a lantern, throw it, then press Space each time the golden ring touches the circle.': 'أسقِط رفيقًا برّيًا فيصبح مذهولًا. اضغط E للتصويب، ارمِ فانوسًا، ثم اضغط المسافة كلما لمست الحلقة الذهبية الدائرة.',
  "I've given you 5 crystal lanterns. Hit the ring three times and it joins you!": 'أعطيتك 5 فوانيس كريستالية. أصِب الحلقة ثلاث مرات وسينضمّ إليك!',
  '{r} guards the meadow gate to the north. Show them your bond!': '{r} يحرس بوابة المرج في الشمال. أرِه الرابط بينك وبين رفيقك!',
  'Rest at the shrine lantern beside the houses, and visit the Lantern Stall for special lanterns.': 'استرح عند فانوس المزار بجانب البيوت، وزُر كشك الفوانيس لشراء فوانيس خاصة.',
  'The shrine lantern glows softly…': 'فانوس المزار يتوهّج بهدوء…', 'Your companions are fully rested, and your journey has been saved.': 'رفاقك استراحوا تمامًا، وتم حفظ رحلتك.',
  'Someone left 2 spare Crystal Lanterns at the shrine for you.': 'ترك لك أحدهم فانوسين كريستاليين في المزار.',
  'An ancient standing stone. Warm light pulses deep inside it.': 'حجر قائم قديم. ينبض في أعماقه ضوء دافئ.',
  'The door is shut. Someone inside is humming.': 'الباب مغلق. أحدهم يدندن في الداخل.',
  '{p}! How is {c} doing?': '{p}! كيف حال {c}؟',
  'Weaken a wild companion first, then offer it a lantern. The weaker it is, the more likely it is to join you.': 'أضعِف الرفيق البرّي أولًا ثم قدّم له فانوسًا. كلما كان أضعف زادت فرصة انضمامه إليك.',
  'Grove beats Tide and Stone. Tide beats Ember and Stone. Ember beats Grove and Glimmer.': 'الغابة تغلب المدّ والحجر. المدّ يغلب الجمر والحجر. الجمر يغلب الغابة والبريق.',
  'Gale beats Grove and Glimmer. Stone beats Gale and Ember. Glimmer beats Gale and Tide.': 'الريح تغلب الغابة والبريق. الحجر يغلب الريح والجمر. البريق يغلب الريح والمدّ.',
  'The meadow is yours to explore. Look for Loomtails in the tall grass!': 'المرج لك فاستكشفه. ابحث عن Loomtail في العشب الطويل!',
  'Hold on! Nobody walks into Whisper Meadow without showing me their bond with their companion.': 'مهلًا! لا أحد يدخل مرج الهمسات قبل أن يُريني رابطه مع رفيقه.',
  "Let's see what you've got!": 'لنرَ ما لديك!', 'Well fought! Take these 3 lanterns. The meadow is open to you now.': 'أحسنت القتال! خذ هذه الفوانيس الثلاثة. المرج مفتوح لك الآن.',
  'Tip: the Lantern Stall in the village sells special lanterns for coins.': 'نصيحة: كشك الفوانيس في القرية يبيع فوانيس خاصة مقابل النقود.',
  "Next time I'll win. The ridge is past the reeds to the north-east, and the Lantern Gate is in the grove to the south-east.": 'في المرة القادمة سأفوز. المرتفع بعد القصب في الشمال الشرقي، وبوابة الفوانيس في الأيكة جنوبًا شرقًا.',
  'Hey {p}! I picked {c} because it beats yours.': 'مرحبًا {p}! اخترت {c} لأنه يتغلّب على رفيقك.', 'Nobody crosses this bridge until I say so!': 'لا أحد يعبر هذا الجسر حتى أسمح له!',
  'Hmph… fine. Take 2 salves. Rumor says the Warden waits on top of Cairn Ridge.': 'همف… حسنًا. خذ مرهمين. يقال إن الحارس ينتظر على قمة مرتفع الركام.',
  'And… the old Lantern Gate in Amberroot Grove woke up when we fought. It leads to the Crystal Caverns. A giant alpha lives down there.': 'و… بوابة الفوانيس القديمة في أيكة الجذور الكهرمانية استيقظت عندما تقاتلنا. إنها تقود إلى كهوف الكريستال. هناك يعيش زعيم عملاق.',
  "The river told me you'd grow strong. Keep going.": 'أخبرني النهر أنك ستصبح قويًا. واصِل.',
  'The current here is strong, and so are my companions. Want to test yourself?': 'التيار هنا قويّ، وكذلك رفاقي. أتريد أن تختبر نفسك؟',
  'Like water around a stone. Take 3 lanterns.': 'كالماء حول الحجر. خذ ثلاثة فوانيس.',
  'The lanterns of this land shine brighter with you, Warden.': 'فوانيس هذه الأرض تسطع أكثر بوجودك أيها الحارس.',
  'So you climbed Cairn Ridge.': 'إذن صعدت مرتفع الركام.', 'I am the Warden of the lanterns. Show me that your companions trust you.': 'أنا حارس الفوانيس. أرِني أن رفاقك يثقون بك.',
  '…Your light is true. From today, you are a Lantern Warden too.': '…نورك صادق. منذ اليوم أنت أيضًا حارس للفوانيس.',
  'Take this Warden Lantern. Any companion will trust its light, so save it for one you truly want.': 'خذ فانوس الحارس هذا. كل رفيق يثق بنوره، فاحتفظ به لمن تريده حقًا.',
  'Every companion you have not met yet is still out there. Fill your journal!': 'كل رفيق لم تلتقِ به بعد ما زال ينتظرك. املأ سجلّك!',
  'You finished Lanternbound! Keep exploring and fill all 18 journal entries.': 'أنهيت Lanternbound! واصل الاستكشاف واملأ صفحات السجلّ الثماني عشرة.',
  // types
  'Grove': 'غابة', 'Tide': 'مدّ', 'Ember': 'جمر', 'Gale': 'ريح', 'Stone': 'حجر', 'Glimmer': 'بريق', 'Plain': 'عادي',
  // places and stages
  'Hollow Village': 'قرية الجوف', 'Whisper Meadow': 'مرج الهمسات', 'Rillbank Reeds': 'قصب الجدول', 'Amberroot Grove': 'أيكة الجذور الكهرمانية',
  'Cairn Ridge': 'مرتفع الركام', 'Shimmer Fields': 'حقول اللمعان', 'Glowcap Beds': 'مروج الفطر المضيء', 'Crystal Caverns': 'كهوف الكريستال',
  'Cinder Scrub': 'أحراش الرماد', 'Smoulder Rocks': 'الصخور المتّقدة', 'Ember Hollow': 'وادي الجمر', 'Mistfall Shore': 'شاطئ الضباب',
  'Moonlit Meadow': 'مرج ضوء القمر', 'Mistfall Lake': 'بحيرة الضباب', 'Alpha Arena': 'حلبة الزعيم', 'Hollow Valley': 'وادي الجوف',
  'Meadows, reeds and the old grove': 'مروج وقصب وأيكة قديمة', 'Glowing crystals under the mountain': 'كريستال متوهّج تحت الجبل',
  'Rivers of lava and cinder scrub': 'أنهار من الحمم وأحراش الرماد', 'A silver lake under the moon': 'بحيرة فضية تحت القمر',
  'Beat your rival in the valley': 'اهزم منافستك في الوادي', 'Defeat the alpha of the Crystal Caverns': 'اهزم زعيم كهوف الكريستال',
  'Defeat the alpha of Ember Hollow': 'اهزم زعيم وادي الجمر',
  // weapons
  'Crystal Staff': 'العصا الكريستالية', 'Sling': 'المقلاع', 'Crystal Wand': 'العصا السحرية',
  'Close-range swings. 3-hit combo, the last hit knocks enemies back.': 'ضربات قريبة. سلسلة من 3 ضربات، والأخيرة تدفع الأعداء بعيدًا.',
  'Throws stones in an arc. Stone type: strong vs Gale and Ember.': 'يرمي الحجارة في قوس. نوع الحجر: قويّ ضد الريح والجمر.',
  'Hold to charge a magic bolt that pierces. Glimmer type: strong vs Gale and Tide.': 'اضغط مطوّلًا لشحن سهم سحري خارق. نوع البريق: قويّ ضد الريح والمدّ.',
  // lanterns
  'Crystal Lantern': 'فانوس الكريستال', 'Moss Lantern': 'فانوس الطحلب', 'Tide Lantern': 'فانوس المدّ', 'Ember Lantern': 'فانوس الجمر',
  'Sky Lantern': 'فانوس السماء', 'Dusk Lantern': 'فانوس الغسق', 'Warden Lantern': 'فانوس الحارس',
  'A reliable everyday lantern.': 'فانوس موثوق للاستعمال اليومي.',
  'Twice as likely to befriend Grove companions.': 'فرصته مضاعفة مع رفاق الغابة.',
  'Twice as likely to befriend Tide companions.': 'فرصته مضاعفة مع رفاق المدّ.',
  'Twice as likely to befriend Ember companions.': 'فرصته مضاعفة مع رفاق الجمر.',
  'Twice as likely to befriend Gale companions.': 'فرصته مضاعفة مع رفاق الريح.',
  'Twice as likely to befriend Stone and Glimmer companions.': 'فرصته مضاعفة مع رفاق الحجر والبريق.',
  'Never fails. Only the Warden gives these.': 'لا يفشل أبدًا. الحارس وحده يمنحه.',
  // moves
  'Tackle': 'اندفاع', 'Quick Dart': 'سهم خاطف', 'Pounce': 'انقضاض', 'Moss Lash': 'سوط الطحلب', 'Thornfan': 'مروحة الأشواك', 'Bloom Mend': 'شفاء الزهر',
  'Spore Haze': 'ضباب الأبواغ', 'Rill Spray': 'رذاذ الجدول', 'Tidecrash': 'موجة عاتية', 'Mist Veil': 'ستار الضباب', 'Soak': 'إغراق',
  'Ember Nip': 'لدغة الجمر', 'Hearthblaze': 'لهيب الموقد', 'Kindle': 'إشعال', 'Smoke Puff': 'نفخة دخان', 'Gust Slice': 'شفرة الريح',
  'Skyfall': 'سقوط السماء', 'Tailwind': 'ريح مواتية', 'Plume Shield': 'درع الريش', 'Pebble Shot': 'رمية الحصى', 'Cairn Crash': 'تحطيم الركام',
  'Harden': 'تصلّب', 'Quake Stomp': 'دوسة الزلزال', 'Prism Ray': 'شعاع الموشور', 'Lantern Flare': 'وهج الفانوس', 'Glow Mend': 'شفاء الضياء', 'Dazzle': 'إبهار',
  // companions
  'A slow, patient grazer. Its bronze-ribbed fan hums softly when the forest is safe.': 'راعٍ بطيء صبور. تدندن مروحته ذات الأضلاع البرونزية بهدوء عندما تكون الغابة آمنة.',
  'Glides on warm air above the ridge, trailing ribbons of silk-like mist.': 'ينساب على الهواء الدافئ فوق المرتفع، تتبعه أشرطة من ضباب كالحرير.',
  'Weaves its own tail from willow strips and tucks treasures inside the loops.': 'ينسج ذيله من شرائط الصفصاف ويخبّئ الكنوز داخل حلقاته.',
  'Its looping copper horns catch moonlight. The blue tassel tail signals friends.': 'قرناه النحاسيان الملتفّان يلتقطان ضوء القمر، وذيله ذو الشرّابة الزرقاء ينادي الأصدقاء.',
  'Lounges in shallow puddles, fanning its glassy dorsal sail to keep cool.': 'يسترخي في البرك الضحلة ويحرّك شراعه الظهري الزجاجي ليبقى باردًا.',
  'Wades the reeds on stilt legs. The bells on its crest clatter when it laughs.': 'يخوض بين القصب على ساقين طويلتين، وتجلجل الأجراس على عُرفه عندما يضحك.',
  'Skates across still water, winding river threads onto its spool-shaped body.': 'يتزلّج على الماء الساكن ويلفّ خيوط النهر حول جسمه الشبيه بالبكرة.',
  'Its lacy crown glows with moon-spots. Curious and gentle, it loves shiny stones.': 'تاجه المخرّم يتوهّج ببقع قمرية. فضوليّ ولطيف ويحب الحجارة اللامعة.',
  'Amber plates on its back stay warm all winter. Villages once gathered around it.': 'الصفائح الكهرمانية على ظهره تبقى دافئة طوال الشتاء. كانت القرى تجتمع حوله قديمًا.',
  'Its crystal tail coils like frost. Each scale refracts a different color.': 'ذيله الكريستالي يلتفّ كالصقيع، وكل حرشفة تعكس لونًا مختلفًا.',
  'Fans its blue-gold quills into a shield. Surprisingly fond of being petted.': 'ينشر أشواكه الزرقاء الذهبية درعًا. ويحب المداعبة على نحو مدهش.',
  'A fluffy moth whose wing patterns shimmer like embers at dusk.': 'فراشة ليلية زغباء تلمع نقوش جناحيها كالجمر عند الغسق.',
  'Slate plates grow along its spine. It stacks stones to mark safe paths.': 'تنمو صفائح أردوازية على طول ظهره، ويكدّس الحجارة ليعلّم الطرق الآمنة.',
  'Its woven shell is light but tough. It rolls downhill when excited.': 'صدفته المنسوجة خفيفة لكنها متينة، ويتدحرج على المنحدرات عندما يفرح.',
  'A dewdrop snail with a frilled leaf collar. Leaves a sparkling, cooling trail.': 'حلزون كقطرة ندى بطوق من الأوراق، يترك وراءه أثرًا لامعًا منعشًا.',
  'A heron of cloud-soft feathers. Seen standing in mist on the highest rocks.': 'مالك حزين بريش ناعم كالسحاب، يُرى واقفًا في الضباب على أعلى الصخور.',
  'A playful otter whose fan-tail bristles glow hot after a swim.': 'قضاعة مرحة يتوهّج شعر ذيلها المروحي حرارةً بعد السباحة.',
  'Covered in opal scales. Calm creatures gather around it to rest.': 'مغطّى بحراشف من الأوبال، وتجتمع الكائنات الهادئة حوله لتستريح.'
};

// ------------------------------------------------------------ teaching layer, pickers, trainers
Object.assign(LB.I18N.fr, {
  'A wandering lantern-keeper in a green cloak.': 'Une gardienne de lanternes vagabonde, en cape verte.',
  'A cheerful tinkerer who fixes broken lanterns.': 'Un bricoleur joyeux qui répare les lanternes cassées.',
  'A quiet ranger who knows every trail.': 'Une pisteuse discrète qui connaît chaque sentier.',
  'A bold explorer with a crystal shard pendant.': 'Un explorateur audacieux au pendentif d’éclat de cristal.',
  'A staff-bearer who reads the river currents.': 'Une porteuse de bâton qui lit les courants de la rivière.',
  'A scholar who writes about every companion.': 'Une érudite qui écrit sur chaque compagnon.',
  'Choose {n}': 'Choisir {n}', '{n} selected.': '{n} sélectionné.', 'Press Enter to confirm.': 'Appuyez sur Entrée pour confirmer.', 'Selected': 'Sélectionné',
  'Begin as {n}': 'Commencer avec {n}', 'Choose again': 'Choisir à nouveau', 'Mentor': 'Mentor', 'Rival': 'Rivale', 'Warden': 'Gardien',
  'Strong against': 'Fort contre', 'Your rival takes': 'Votre rivale prend', 'type': 'type',
  '{s} has chosen you. It will walk beside you from now on.': '{s} vous a choisi. Il marchera désormais à vos côtés.',
  'There is something in the tall grass east of here. Go and meet it.': 'Il y a quelque chose dans les hautes herbes à l’est. Allez à sa rencontre.',
  'Controls': 'Commandes', 'Everything you can do, any time.': 'Tout ce que vous pouvez faire, à tout moment.', 'Close': 'Fermer',
  'Moving': 'Se déplacer', 'Combat': 'Combat', 'Capture': 'Capture', 'Around the world': 'Dans le monde',
  'drag the left stick to walk': 'glissez le joystick gauche pour marcher', 'rotate the camera': 'tourner la caméra', 'walk': 'marcher',
  'left-click': 'clic gauche', 'right-click': 'clic droit', 'swing your weapon — three quick hits make a combo': 'frapper avec votre arme — trois coups rapides font un combo',
  'send your companion to attack': 'envoyer votre compagnon attaquer', 'companion special move': 'attaque spéciale du compagnon',
  'roll — you cannot be hit while rolling': 'roulade — on ne peut pas vous toucher pendant la roulade',
  'aim a lantern; press again to throw': 'viser avec une lanterne ; appuyez encore pour lancer', 'change lantern type': 'changer de type de lanterne',
  'hit the ring when the gold circle meets the white one': 'réussir l’anneau quand le cercle doré touche le blanc',
  'talk, read, open a gate': 'parler, lire, ouvrir une porte', 'use a salve and restore a heart': 'utiliser un baume et regagner un cœur',
  'switch companion': 'changer de compagnon', 'open this sheet': 'ouvrir cette fiche', 'Press ? again to close.': 'Appuyez encore sur ? pour fermer.',
  'Walk with WASD': 'Marchez avec WASD (ZQSD en AZERTY)', 'Drag the left stick to walk': 'Glissez le joystick gauche pour marcher', 'Your companion follows you.': 'Votre compagnon vous suit.',
  'Turn the camera with Z and X': 'Tournez la caméra avec Z et X (W et X en AZERTY)', 'W walks toward the top of the screen.': 'Avancer va toujours vers le haut de l’écran.',
  'Walk east into the tall grass': 'Marchez vers l’est, dans les hautes herbes', 'Something is rustling in the village meadow.': 'Quelque chose bruisse dans le pré du village.',
  'Press F to talk': 'Appuyez sur F pour parler', 'Tap A to talk': 'Touchez A pour parler',
  'Press H to use a salve': 'Appuyez sur H pour un baume', 'Tap 🌿 to use a salve': 'Touchez 🌿 pour un baume', 'It restores one heart.': 'Il rend un cœur.',
  'Press ? for the full controls': 'Appuyez sur ? pour toutes les commandes', 'Tap ? for the full controls': 'Touchez ? pour toutes les commandes', 'You can reopen this any time.': 'Vous pouvez la rouvrir à tout moment.',
  'Walk up to the Loomtail': 'Approchez-vous du Loomtail', 'It is watching you. It will not attack yet.': 'Il vous observe. Il n’attaquera pas encore.',
  'Press J to swing your staff': 'Appuyez sur J pour frapper avec le bâton', 'Tap A to swing your staff': 'Touchez A pour frapper avec le bâton', 'Stand close and hit it once.': 'Approchez-vous et frappez une fois.',
  'Two more swings — three in a row make a combo': 'Encore deux coups — trois d’affilée font un combo', 'The third hit knocks it back.': 'Le troisième coup le repousse.',
  'It is dazed! Now use a lantern': 'Il est étourdi ! Utilisez une lanterne', 'Tap 🏮 to aim.': 'Touchez 🏮 pour viser.', 'Press E to aim, then E again to throw.': 'Appuyez sur E pour viser, puis encore E pour lancer.',
  'Now press E again to throw it': 'Appuyez encore sur E pour la lancer', 'Now tap 🏮 to throw it': 'Touchez encore 🏮 pour la lancer',
  'Press Space when the gold ring meets the white ring': 'Espace quand l’anneau doré touche l’anneau blanc', 'Tap when the gold ring meets the white ring': 'Touchez quand l’anneau doré touche l’anneau blanc',
  'Three good hits and it joins you.': 'Trois réussites et il vous rejoint.', 'Almost! Try the ring again': 'Presque ! Retentez l’anneau', 'It is still dazed — throw another lantern.': 'Il est encore étourdi — lancez une autre lanterne.',
  'That is the whole loop: weaken, daze, lantern': 'Voilà tout le principe : affaiblir, étourdir, lanterne', 'Open ? any time to see every control.': 'Ouvrez ? à tout moment pour voir toutes les commandes.',
  'Safe — this one is only training you': 'Pas de danger — celui-ci vous entraîne seulement', 'Loomtail joined your party — open Party to see it.': 'Loomtail a rejoint votre équipe — ouvrez Équipe pour le voir.'
});
Object.assign(LB.I18N.ar, {
  'A wandering lantern-keeper in a green cloak.': 'حارسة فوانيس رحّالة بعباءة خضراء.',
  'A cheerful tinkerer who fixes broken lanterns.': 'مُصلح مرح يرمّم الفوانيس المكسورة.',
  'A quiet ranger who knows every trail.': 'جوّالة هادئة تعرف كل درب.',
  'A bold explorer with a crystal shard pendant.': 'مستكشف جريء يتدلّى من عنقه قلادة من شظية كريستال.',
  'A staff-bearer who reads the river currents.': 'حاملة عصا تقرأ تيارات النهر.',
  'A scholar who writes about every companion.': 'عالمة تكتب عن كل رفيق.',
  'Choose {n}': 'اختر {n}', '{n} selected.': 'تم اختيار {n}.', 'Press Enter to confirm.': 'اضغط Enter للتأكيد.', 'Selected': 'مُختار',
  'Begin as {n}': 'ابدأ باسم {n}', 'Choose again': 'اختر من جديد', 'Mentor': 'المرشد', 'Rival': 'المنافسة', 'Warden': 'الحارس',
  'Strong against': 'قويّ ضد', 'Your rival takes': 'منافستك تأخذ', 'type': 'نوع',
  '{s} has chosen you. It will walk beside you from now on.': 'لقد اختارك {s}. سيمشي بجانبك من الآن فصاعدًا.',
  'There is something in the tall grass east of here. Go and meet it.': 'هناك شيء في العشب الطويل شرق هذا المكان. اذهب وقابله.',
  'Controls': 'التحكّم', 'Everything you can do, any time.': 'كل ما يمكنك فعله، في أي وقت.', 'Close': 'إغلاق',
  'Moving': 'الحركة', 'Combat': 'القتال', 'Capture': 'الأسر', 'Around the world': 'في العالم',
  'drag the left stick to walk': 'اسحب عصا التحكم اليسرى للمشي', 'rotate the camera': 'تدوير الكاميرا', 'walk': 'المشي',
  'left-click': 'نقرة يسرى', 'right-click': 'نقرة يمنى', 'swing your weapon — three quick hits make a combo': 'اضرب بسلاحك — ثلاث ضربات سريعة تصنع سلسلة',
  'send your companion to attack': 'أرسل رفيقك للهجوم', 'companion special move': 'الحركة الخاصة للرفيق',
  'roll — you cannot be hit while rolling': 'تدحرج — لا يمكن إصابتك أثناء التدحرج',
  'aim a lantern; press again to throw': 'صوِّب فانوسًا؛ اضغط مجددًا للرمي', 'change lantern type': 'تغيير نوع الفانوس',
  'hit the ring when the gold circle meets the white one': 'أصِب الحلقة عندما تلمس الدائرة الذهبية الدائرة البيضاء',
  'talk, read, open a gate': 'تحدّث، اقرأ، افتح بوابة', 'use a salve and restore a heart': 'استعمل مرهمًا واستعِد قلبًا',
  'switch companion': 'تبديل الرفيق', 'open this sheet': 'فتح هذه الصفحة', 'Press ? again to close.': 'اضغط ? مجددًا للإغلاق.',
  'Walk with WASD': 'امشِ بالأزرار WASD', 'Drag the left stick to walk': 'اسحب عصا التحكم اليسرى للمشي', 'Your companion follows you.': 'رفيقك يتبعك.',
  'Turn the camera with Z and X': 'أدِر الكاميرا بـ Z وX', 'W walks toward the top of the screen.': 'الزر W يمشي دائمًا نحو أعلى الشاشة.',
  'Walk east into the tall grass': 'امشِ شرقًا نحو العشب الطويل', 'Something is rustling in the village meadow.': 'شيء ما يتحرّك في مرج القرية.',
  'Press F to talk': 'اضغط F للتحدّث', 'Tap A to talk': 'المس A للتحدّث',
  'Press H to use a salve': 'اضغط H لاستعمال مرهم', 'Tap 🌿 to use a salve': 'المس 🌿 لاستعمال مرهم', 'It restores one heart.': 'يعيد قلبًا واحدًا.',
  'Press ? for the full controls': 'اضغط ? لرؤية كل أزرار التحكّم', 'Tap ? for the full controls': 'المس ? لرؤية كل أزرار التحكّم', 'You can reopen this any time.': 'يمكنك فتحها مجددًا في أي وقت.',
  'Walk up to the Loomtail': 'اقترب من Loomtail', 'It is watching you. It will not attack yet.': 'إنه يراقبك. لن يهاجم بعد.',
  'Press J to swing your staff': 'اضغط J لتضرب بعصاك', 'Tap A to swing your staff': 'المس A لتضرب بعصاك', 'Stand close and hit it once.': 'اقترب واضربه مرة واحدة.',
  'Two more swings — three in a row make a combo': 'ضربتان أخريان — ثلاث متتالية تصنع سلسلة', 'The third hit knocks it back.': 'الضربة الثالثة تدفعه إلى الخلف.',
  'It is dazed! Now use a lantern': 'إنه مذهول! استعمل فانوسًا الآن', 'Tap 🏮 to aim.': 'المس 🏮 للتصويب.', 'Press E to aim, then E again to throw.': 'اضغط E للتصويب، ثم E مجددًا للرمي.',
  'Now press E again to throw it': 'اضغط E مجددًا لرميه', 'Now tap 🏮 to throw it': 'المس 🏮 مجددًا لرميه',
  'Press Space when the gold ring meets the white ring': 'اضغط المسافة عندما تلمس الحلقة الذهبية الحلقة البيضاء', 'Tap when the gold ring meets the white ring': 'المس عندما تلمس الحلقة الذهبية الحلقة البيضاء',
  'Three good hits and it joins you.': 'ثلاث إصابات جيدة وينضمّ إليك.', 'Almost! Try the ring again': 'كدت تنجح! جرّب الحلقة مجددًا', 'It is still dazed — throw another lantern.': 'ما زال مذهولًا — ارمِ فانوسًا آخر.',
  'That is the whole loop: weaken, daze, lantern': 'هذه هي الطريقة كلها: أضعِف، اذهِل، ثم الفانوس', 'Open ? any time to see every control.': 'افتح ? في أي وقت لرؤية كل أزرار التحكّم.',
  'Safe — this one is only training you': 'لا خطر — هذا الرفيق يدرّبك فقط', 'Loomtail joined your party — open Party to see it.': 'انضمّ Loomtail إلى فريقك — افتح «الفريق» لتراه.'
});
