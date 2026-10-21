// ============================================================
// Lanternbound 3D — HTML HUD (hearts, companion, party, weapons, skills),
// title / starter screens, loading bar and the weapon shop.
// ============================================================
export const WEAPONS = {
  staff: { n: 'Crystal Staff', t: 'Plain', key: '1', d: 'Close-range swings. 3-hit combo, the last hit knocks enemies back.', buy: 0, base: 9 },
  sling: { n: 'Sling', t: 'Stone', key: '2', d: 'Throws stones in an arc. Stone type: strong vs Gale and Ember.', buy: 60, base: 8 },
  wand: { n: 'Crystal Wand', t: 'Glimmer', key: '3', d: 'Hold to charge a magic bolt that pierces. Glimmer type: strong vs Gale and Tide.', buy: 120, base: 7 }
};
export const UPGRADE_COST = [0, 80, 160];   // cost to reach level 2, 3

const ICON = {
  staff: '<svg viewBox="0 0 40 40"><path d="M10 34 L28 10" stroke="#7a4f26" stroke-width="4" stroke-linecap="round"/><path d="M30 4 l5 6 -5 6 -5 -6z" fill="#7fe6f5" stroke="#2a5f6a" stroke-width="1.5"/></svg>',
  sling: '<svg viewBox="0 0 40 40"><path d="M20 36 V22 M20 22 L11 8 M20 22 L29 8" stroke="#7a4f26" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M11 8 Q20 18 29 8" stroke="#5a3d2a" stroke-width="2" fill="none"/><circle cx="20" cy="13" r="3.5" fill="#9c968a"/></svg>',
  wand: '<svg viewBox="0 0 40 40"><path d="M9 33 L26 14" stroke="#e8dcc0" stroke-width="3.5" stroke-linecap="round"/><path d="M29 5 l4 7 -4 7 -4 -7z" fill="#b07cd6" stroke="#5a2f7a" stroke-width="1.5"/><circle cx="31" cy="11" r="9" fill="#e4b8ff" opacity=".25"/></svg>'
};

const CSS = `
#lb-labels{position:fixed;inset:0;pointer-events:none;z-index:3;overflow:hidden;font-family:Nunito,sans-serif}
.ftxt{position:absolute;left:0;top:0;font-weight:900;text-shadow:0 2px 0 #2b2418,0 0 4px #2b2418;white-space:nowrap;will-change:transform}
.ubar{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:2px;will-change:transform}
.ubar .lv{font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 0 #2b2418,0 0 3px #2b2418}
.ubar .b{width:54px;height:7px;background:rgba(43,36,24,.75);border-radius:4px;overflow:hidden;border:1px solid rgba(0,0,0,.4)}
.ubar.boss .b{width:80px;height:9px}
.ubar .b i{display:block;height:100%;width:100%}
.ubar .pr{font-size:12px;font-weight:900;color:#2b2418;background:#f5efe2;border:2px solid #3b2f20;border-radius:7px;padding:1px 6px;display:none}
#hud3d{position:fixed;inset:0;pointer-events:none;z-index:4;font-family:Nunito,sans-serif;color:#2b2418;display:none}
#hud3d.on{display:block}
#hud3d .hearts{position:absolute;left:14px;top:12px;display:flex;gap:4px}
#hud3d .hearts svg{width:26px;height:24px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
#hud3d .lead{position:absolute;left:12px;top:44px;width:300px;background:rgba(245,239,226,.95);border:3px solid #3b2f20;border-radius:14px;padding:6px 10px 8px 76px;min-height:70px;box-shadow:0 4px 0 rgba(0,0,0,.25)}
#hud3d .lead img{position:absolute;left:6px;bottom:4px;width:64px;height:62px;object-fit:contain}
#hud3d .lead .nm{font-family:Fraunces,serif;font-weight:800;font-size:19px;display:flex;justify-content:space-between;align-items:baseline}
#hud3d .lead .nm small{font-family:Nunito;font-size:13px;color:#6b5d48}
#hud3d .bar{height:10px;background:#d8ccb2;border-radius:6px;overflow:hidden;margin-top:4px}
#hud3d .bar i{display:block;height:100%}
#hud3d .xp{height:4px;background:#e2d8c2;border-radius:3px;overflow:hidden;margin-top:3px}
#hud3d .xp i{display:block;height:100%;background:#4c8fb0}
#hud3d .party{position:absolute;left:12px;top:126px;display:flex;gap:4px}
#hud3d .party div{width:42px;height:46px;background:rgba(245,239,226,.85);border:2px solid #c9b892;border-radius:8px;position:relative}
#hud3d .party div.on{border-color:#b8692e}
#hud3d .party img{width:38px;height:34px;object-fit:contain;margin:1px 0 0 1px}
#hud3d .party b{position:absolute;left:2px;top:0;font-size:10px;color:#6b5d48}
#hud3d .party i{position:absolute;left:3px;right:3px;bottom:3px;height:4px;border-radius:2px;background:#5aa340}
#hud3d .info{position:absolute;right:12px;top:52px;background:rgba(245,239,226,.94);border:2px solid #3b2f20;border-radius:10px;padding:5px 10px;font-weight:800;font-size:14px;text-align:right;line-height:1.35}
#hud3d .weapons{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:10px;pointer-events:auto}
#hud3d .wslot{width:70px;height:70px;border-radius:14px;background:rgba(245,239,226,.94);border:3px solid #3b2f20;position:relative;box-shadow:0 4px 0 rgba(0,0,0,.3);cursor:pointer}
#hud3d .wslot.sel{border-color:#b8692e;transform:translateY(-6px);box-shadow:0 0 0 3px #ffd23f,0 6px 0 rgba(0,0,0,.3)}
#hud3d .wslot.lock{opacity:.4}
#hud3d .wslot svg{position:absolute;inset:8px}
#hud3d .wslot .k{position:absolute;left:5px;top:1px;font-size:12px;font-weight:900}
#hud3d .wslot .lv{position:absolute;right:5px;bottom:1px;font-size:11px;font-weight:900;color:#b8692e}
#hud3d .wslot .cd{position:absolute;inset:0;border-radius:11px}
#hud3d .wslot .chg{position:absolute;left:6px;right:6px;bottom:-12px;height:6px;border-radius:3px;background:#3b2f20;overflow:hidden;display:none}
#hud3d .wslot .chg i{display:block;height:100%;background:linear-gradient(90deg,#b07cd6,#ffd23f)}
#hud3d .skills{position:absolute;right:14px;bottom:14px;display:flex;gap:10px}
#hud3d .sk{width:58px;height:58px;border-radius:50%;background:rgba(245,239,226,.94);border:3px solid #3b2f20;position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;font-weight:900;font-size:12px;line-height:1;box-shadow:0 3px 0 rgba(0,0,0,.3)}
#hud3d .sk small{font-size:9px;color:#6b5d48;margin-top:3px}
#hud3d .sk .cd{position:absolute;inset:0;border-radius:50%}
#hud3d .banner{position:absolute;left:50%;top:14px;transform:translateX(-50%);font-family:Fraunces,serif;font-weight:800;font-size:22px;color:#fff;text-shadow:0 2px 0 #2b2418,0 0 6px #2b2418;white-space:nowrap}
#hud3d .help{position:absolute;left:14px;bottom:14px;background:rgba(43,36,24,.78);color:#f5efe2;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700;line-height:1.55;max-width:330px;transition:opacity .6s}
#hud3d .help b{color:#ffd23f}
@media (pointer:coarse),(max-width:700px){ #hud3d .skills,#hud3d .help{display:none} #hud3d .weapons{bottom:auto;top:52px;left:auto;right:10px;transform:none;flex-direction:column;gap:6px} #hud3d .wslot{width:46px;height:46px;border-radius:10px} #hud3d .wslot.sel{transform:translateX(-6px)} #hud3d .wslot svg{inset:5px} #hud3d .lead{width:190px;padding-left:58px;min-height:58px} #hud3d .lead img{width:50px;height:50px} #hud3d .lead .nm{font-size:15px} #hud3d .party div{width:34px;height:38px} #hud3d .party img{width:30px;height:28px} #hud3d .info{left:12px;right:auto;top:auto;bottom:250px;font-size:11px;text-align:left} #hud3d .banner{font-size:15px;top:46px} }
#lb-screen{position:fixed;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;font-family:Nunito,sans-serif;padding:16px;text-align:center;background:linear-gradient(180deg,rgba(20,30,28,.15),rgba(20,30,28,.55))}
#lb-screen.on{display:flex}
#lb-screen h1{font-family:Fraunces,serif;font-weight:800;font-size:clamp(40px,8vw,84px);margin:0;color:#fff;text-shadow:0 4px 0 #2b2418,0 0 30px rgba(0,0,0,.4);letter-spacing:1px}
#lb-screen h1 span{color:#ffc46e}
#lb-screen h2{font-family:Fraunces,serif;color:#fff;margin:0 0 6px;font-size:clamp(24px,4vw,38px);text-shadow:0 3px 0 #2b2418}
#lb-screen p{color:#fff;font-weight:800;margin:6px 0 16px;text-shadow:0 2px 0 #2b2418}
#lb-screen .row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:1000px}
#lb-screen .tcard{background:rgba(245,239,226,.96);border:3px solid #3b2f20;border-radius:16px;padding:8px;cursor:pointer;transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column;align-items:center;box-shadow:0 5px 0 rgba(0,0,0,.3)}
#lb-screen .tcard:hover{transform:translateY(-6px);box-shadow:0 0 0 4px #ffc46e,0 8px 0 rgba(0,0,0,.3)}
#lb-screen .tcard img{height:clamp(110px,20vh,190px);max-width:150px;object-fit:contain}
#lb-screen .tcard b{font-family:Fraunces,serif;font-size:18px}
#lb-screen .tcard.big{width:250px}
#lb-screen .tcard.big img{height:clamp(130px,24vh,210px);max-width:230px}
#lb-screen .tcard .d{font-size:13px;color:#6b5d48;font-weight:700;margin-top:4px}
#lb-screen .pill{display:inline-block;color:#fff;font-weight:900;font-size:11px;padding:2px 10px;border-radius:99px;margin-top:4px}
#lb-screen .btn{margin-top:18px;background:#2f4f4c;color:#fff;border:0;border-radius:12px;padding:12px 24px;font-weight:900;font-size:17px;cursor:pointer;box-shadow:0 4px 0 #17302d}
#lb-screen .bar{width:340px;height:16px;border:3px solid #fff;border-radius:10px;overflow:hidden;background:rgba(0,0,0,.3)}
#lb-screen .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2f7f86,#7fe6f5)}
.wshop h4{font-family:Fraunces,serif;margin:12px 0 6px}
#lb-screen .tcard.stage{width:190px;padding:0 0 10px;overflow:hidden;gap:3px}
#lb-screen .tcard.stage .sw{width:100%;height:92px;margin-bottom:6px;border-bottom:3px solid #3b2f20}
#lb-screen .tcard.stage small{font-weight:800;color:#6b5a44;font-size:12px;padding:0 8px}
#lb-screen .tcard.stage.lock{filter:grayscale(.85) brightness(.8);cursor:not-allowed}
#lb-screen .tcard.stage.here{box-shadow:0 0 0 4px #9feaf2,0 5px 0 rgba(0,0,0,.3)}
.sw-valley{background:radial-gradient(circle at 70% 30%,#fff6c8 0 10%,transparent 11%),linear-gradient(180deg,#9fd0ec,#cfe8d0 55%,#6a9a3c 56%,#4d7c38)}
.sw-caverns{background:radial-gradient(circle at 30% 70%,#7fe6f5 0 6%,transparent 18%),radial-gradient(circle at 72% 60%,#b48cff 0 5%,transparent 16%),linear-gradient(180deg,#0a0a14,#25223a 60%,#3d3a4e)}
.sw-ember{background:radial-gradient(ellipse at 50% 80%,#ff7a2a 0 18%,transparent 40%),linear-gradient(180deg,#5a2414,#2a1410 60%,#3b3230)}
.sw-lake{background:radial-gradient(circle at 25% 25%,#f4f6ff 0 7%,transparent 8%),linear-gradient(180deg,#1a2a55,#0b1530 55%,#3a6ea8 56%,#22303a)}
#lb-screen .btn{margin-top:14px}
#lb-screen .langs{display:flex;gap:6px;margin:10px 0 0;flex-wrap:wrap;justify-content:center}
#lb-screen .lang{background:rgba(245,239,226,.92);border:2px solid #3b2f20;border-radius:99px;padding:5px 14px;font-weight:900;font-size:14px;cursor:pointer;font-family:Nunito,Cairo,sans-serif;color:#2b2418}
#lb-screen .lang.on{background:#2f4f4c;color:#fff;box-shadow:0 0 0 3px #ffc46e}
#lb-stagecard{position:fixed;left:50%;top:22%;transform:translate(-50%,-10px);z-index:12;pointer-events:none;text-align:center;opacity:0;transition:opacity .6s,transform .6s;font-family:Fraunces,serif;color:#fff;text-shadow:0 3px 0 #2b2418,0 0 24px rgba(0,0,0,.6)}
#lb-stagecard.on{opacity:1;transform:translate(-50%,0)}
#lb-stagecard b{display:block;font-size:clamp(30px,6vw,58px);font-weight:800;letter-spacing:1px}
#lb-stagecard span{display:block;font-family:Nunito,sans-serif;font-weight:800;font-size:16px;margin-top:4px}
#lb-stagecard small{display:block;font-family:Nunito,sans-serif;font-weight:800;letter-spacing:3px;text-transform:uppercase;font-size:12px;color:#ffc46e}
`;

const HELP = '<b>WASD</b> move · <b>Left-click / J</b> weapon (hold with the wand to charge) · <b>1 2 3</b> weapons<br><b>Right-click / K</b> companion attack · <b>L</b> special · <b>Space</b> roll<br><b>E</b> aim + throw lantern (<b>R</b> type) · <b>Q</b> switch companion · <b>H</b> salve · <b>F</b> talk / gate<br><b>Z X</b> turn camera · <b>G</b> graphics · <b>?</b> help'.replace(/"/g, '&quot;');
const HEART = full => `<svg viewBox="0 0 26 24"><path d="M13 22 C4 15 1 11 1 7 A6 6 0 0 1 13 4 A6 6 0 0 1 25 7 C25 11 22 15 13 22Z" fill="${full ? '#e0533f' : '#5c4a3a'}" stroke="#2b2418" stroke-width="2"/></svg>`;

export function initHud(game) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const labels = document.createElement('div'); labels.id = 'lb-labels'; document.body.appendChild(labels);
  const hud = document.createElement('div'); hud.id = 'hud3d';
  hud.innerHTML = `<div class="hearts"></div>
    <div class="lead"><img alt=""><div class="nm"><span></span><small></small></div><div class="bar"><i></i></div><div class="xp"><i></i></div></div>
    <div class="party"></div><div class="info"></div><div class="banner"></div>
    <div class="weapons">${Object.keys(WEAPONS).map(k => `<div class="wslot" data-w="${k}"><span class="k">${WEAPONS[k].key}</span>${ICON[k]}<span class="lv"></span><div class="cd"></div><div class="chg"><i></i></div></div>`).join('')}</div>
    <div class="skills">
      <div class="sk" data-s="pet">K<small data-i18n="Companion">Companion</small><div class="cd"></div></div>
      <div class="sk" data-s="spc">L<small data-i18n="Special">Special</small><div class="cd"></div></div>
      <div class="sk" data-s="dodge">Space<small data-i18n="Roll">Roll</small><div class="cd"></div></div>
      <div class="sk" data-s="lan">E<small data-i18n="Lantern">Lantern</small><div class="cd"></div></div>
    </div>
    <div class="help" data-i18n-html="${HELP}"></div>`;
  document.body.appendChild(hud); LB.applyI18n(hud);
  hud.querySelectorAll('.wslot').forEach(el => el.addEventListener('pointerdown', e => { e.preventDefault(); game.selectWeapon(el.dataset.w); }));
  const screen = document.createElement('div'); screen.id = 'lb-screen'; document.body.appendChild(screen);
  setTimeout(() => { const h = hud.querySelector('.help'); if (h) h.style.opacity = 0; }, 30000);
  window.addEventListener('keydown', e => { if (e.key === '?') { const h = hud.querySelector('.help'); h.style.opacity = h.style.opacity === '0' ? 1 : 0; } });
  return { hud, screen, labels };
}

export function showHud(on) { document.getElementById('hud3d').classList.toggle('on', on); LB.showHud(on); }

let lastSig = '';
export function updateHud(game) {
  const G = LB.G, hud = document.getElementById('hud3d'); if (!G || !hud.classList.contains('on')) return;
  const q = s => hud.querySelector(s);
  const a = game.ally && game.ally.m;
  const sig = [LB.lang, G.hearts, a && a.sp, G.party.map(m => m.sp + m.lvl).join(), G.weapon, JSON.stringify(G.weapons)].join('|');
  if (sig !== lastSig) {
    lastSig = sig;
    q('.hearts').innerHTML = Array.from({ length: LB.MAX_HEARTS }, (_, i) => HEART(i < G.hearts)).join('');
    q('.party').innerHTML = G.party.map((m, i) => `<div class="${a && m === a ? 'on' : ''}"><b>${i + 1}</b><img src="${LB.compImg(m.sp)}" alt=""><i></i></div>`).join('');
    hud.querySelectorAll('.wslot').forEach(el => {
      const k = el.dataset.w, lv = G.weapons[k] || 0;
      el.classList.toggle('sel', G.weapon === k); el.classList.toggle('lock', !lv);
      el.querySelector('.lv').textContent = lv ? LB.t('Lv') + lv : '🔒';
    });
  }
  if (a) {
    const img = q('.lead img'); const src = LB.compImg(a.sp); if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    q('.lead .nm span').textContent = a.sp; q('.lead .nm small').textContent = LB.t('Lv') + ' ' + a.lvl;
    const v = Math.max(0, a.hpA) / LB.unitMaxHp(a);
    q('.lead .bar i').style.width = v * 100 + '%'; q('.lead .bar i').style.background = v > .5 ? '#5aa340' : v > .2 ? '#d9a634' : '#c8452f';
    q('.lead .xp i').style.width = Math.min(1, a.xp / LB.need(a.lvl)) * 100 + '%';
  } else { q('.lead .nm span').textContent = LB.t('No companion'); q('.lead .nm small').textContent = ''; }
  hud.querySelectorAll('.party i').forEach((el, i) => { const m = G.party[i]; if (!m) return; const v = Math.max(0, m.hpA) / LB.unitMaxHp(m); el.style.width = 36 * v + 'px'; el.style.background = v > .5 ? '#5aa340' : v > .2 ? '#d9a634' : '#c8452f'; el.parentElement.style.opacity = m.hpA > 0 ? 1 : .45; });
  const L = LB.LANTERNS[G.lanternSel] || LB.LANTERNS.lantern;
  q('.info').innerHTML = `<span style="color:${L.col};text-shadow:0 0 1px #2b2418">◆</span> ${LB.t(L.n)} ×${G.items[G.lanternSel] || 0} <small>(R)</small><br>${LB.t('Salves')} ${G.items.salve} · ${LB.t('Coins')} ${G.coins}`;
  const cd = (el, v) => { el.style.background = v > 0 ? `conic-gradient(rgba(43,36,24,.6) ${v * 360}deg, transparent 0)` : 'none'; };
  hud.querySelectorAll('.wslot').forEach(el => { const k = el.dataset.w; cd(el.querySelector('.cd'), k === G.weapon ? Math.max(0, game.wCd / game.wCdMax) : 0);
    const chg = el.querySelector('.chg'); chg.style.display = k === 'wand' && game.charging ? 'block' : 'none'; if (game.charging) chg.firstChild.style.width = game.charge * 100 + '%'; });
  const sk = { pet: [game.petCd, 1], spc: [game.spcCd, 4], dodge: [game.rollCd, .75], lan: [0, 1] };
  hud.querySelectorAll('.sk').forEach(el => { const [c, m] = sk[el.dataset.s]; cd(el.querySelector('.cd'), Math.max(0, c / m)); });
  q('.banner').textContent = game.fight && game.fight.cur ? LB.t("{w}'s {c} · {n} left", { w: game.fight.npc.who, c: game.fight.cur.m.sp, n: game.fight.team.length }) : game.aiming ? LB.t(LB.touch ? 'Aim… tap 🏮 to throw' : 'Aim… E or click to throw') : game.capture ? LB.t(LB.touch ? 'Tap when the gold ring meets the white ring!' : 'Press SPACE when the gold ring meets the white ring!') : '';
}

// ---------- screens ----------
export function loading(p) {
  const s = document.getElementById('lb-screen');
  if (p === null) { s.classList.remove('on'); return; }
  if (!s.querySelector('.bar')) s.innerHTML = '<h2>' + LB.t('Lighting the lanterns…') + '</h2><div class="bar"><i></i></div>';
  s.classList.add('on'); s.querySelector('.bar i').style.width = p * 100 + '%';
}
const langPicker = () => `<div class="langs">${Object.entries(LB.LANGS).map(([k, n]) => `<button class="lang ${k === LB.lang ? 'on' : ''}" data-l="${k}">${n}</button>`).join('')}</div>`;
export function titleScreen(onPick, onContinue) {
  const s = document.getElementById('lb-screen'), save = LB.load();
  s.innerHTML = `<h1>Lantern<span>bound</span></h1>${langPicker()}<p>${LB.t('Choose your trainer')}</p><div class="row">${Object.keys(LB.TRAINERS).map(n => `<div class="tcard" data-n="${n}"><img src="${LB.trainerImg(n)}" alt=""><b>${n}</b></div>`).join('')}</div>${save && save.party && save.party.length ? `<button class="btn">${LB.t('Continue as {n}', { n: save.player })}</button>` : ''}`;
  s.classList.add('on');
  s.querySelectorAll(".tcard").forEach(c => c.onclick = () => { LB.SFX.sel(); onPick(c.dataset.n); });
  const b = s.querySelector('.btn'); if (b) b.onclick = () => { LB.SFX.sel(); onContinue(save); };
  s.querySelectorAll('.lang').forEach(x => x.onclick = () => { LB.SFX.sel(); LB.setLang(x.dataset.l); titleScreen(onPick, onContinue); });
}
export function starterScreen(onPick) {
  const s = document.getElementById('lb-screen');
  s.innerHTML = `<h2>${LB.t('Choose your first companion')}</h2><p>${LB.t('Your rival will take the one that beats yours.')}</p><div class="row">${LB.STARTERS.map(sp => { const M = LB.MON[sp]; return `<div class="tcard big" data-s="${sp}"><img src="${LB.compImg(sp)}" alt=""><b>${sp}</b><span class="pill" style="background:${LB.TYPE_COLOR[M.t]}">${LB.t(M.t)}</span><div class="d">${LB.t(M.d)}</div></div>`; }).join('')}</div>`;
  s.querySelectorAll(".tcard").forEach(c => c.onclick = () => { LB.SFX.caught(); onPick(c.dataset.s); });
}
export function hideScreen() { document.getElementById('lb-screen').classList.remove('on'); }

// ---------- shop with weapons (replaces the lantern-only shop) ----------
export function installShop(game) {
  const baseShop = LB.shop;
  LB.shop = function () {
    const p = baseShop();
    const draw = () => {
      const G = LB.G, list = document.getElementById('shopList');
      let box = list.parentElement.querySelector('.wshop'); if (box) box.remove();
      box = document.createElement('div'); box.className = 'wshop'; box.innerHTML = '<h4>' + LB.t('Weapons') + '</h4><div class="plist"></div>';
      list.parentElement.appendChild(box);
      const L = box.querySelector('.plist');
      Object.keys(WEAPONS).forEach(k => {
        const W = WEAPONS[k], lv = G.weapons[k] || 0;
        const price = lv === 0 ? W.buy : UPGRADE_COST[lv];
        const label = lv === 0 ? LB.t('Buy') : lv >= 3 ? LB.t('Max') : LB.t('Upgrade to Lv{n}', { n: lv + 1 });
        const r = document.createElement('div'); r.className = 'shoprow';
        r.innerHTML = `<div class="ic">${ICON[k]}</div><div class="info"><b class="nm">${LB.t(W.n)}</b> <span class="small">· ${lv ? LB.t('Lv') + ' ' + lv : LB.t('not owned')} · ${LB.t('{t} type', { t: LB.t(W.t) })}</span><div>${LB.t(W.d)}</div></div><button ${lv >= 3 || G.coins < price ? 'disabled' : ''}>${label}${lv < 3 ? ` <span class="coin"></span> ${price}` : ''}</button>`;
        r.querySelector('button').onclick = () => {
          if (lv >= 3 || G.coins < price) return;
          G.coins -= price; G.weapons[k] = lv + 1; if (!lv) G.weapon = k; LB.SFX.coin(); game.refreshWeapon();
          document.getElementById('shopCoins').innerHTML = `· <span class="coin"></span> ${LB.t('{n} coins', { n: G.coins })}`; draw();
        };
        L.appendChild(r);
      });
    };
    draw();
    const coinsObs = setInterval(() => { if (!document.getElementById('shopSheet').classList.contains('on')) { clearInterval(coinsObs); } }, 500);
    return p;
  };
}
