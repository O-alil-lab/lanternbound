window.LB = window.LB || {};
// ============================================================
// Lanternbound — HTML overlays drawn on top of the Phaser canvas:
// top bar, dialog box, toast, party / journal / shop windows, touch pad.
// LB.initUI() builds them (called from Game.js), so the game needs no HTML page of its own.
// ============================================================
const $ = id => document.getElementById(id);
LB.$ = $;

// Where character images live. A local copy of the repo sets window.LB_ASSET_BASE = 'assets/'.
LB.ASSET_BASE = window.LB_ASSET_BASE || 'https://cdn.jsdelivr.net/gh/O-alil-lab/lanternbound@main/assets/';
LB.compImg = (sp, side = 'front') => `${LB.ASSET_BASE}companions/${sp}_${side}.png`;
LB.trainerImg = n => `${LB.ASSET_BASE}trainers/${n}.png`;
// Extra views: 'q' three-quarter, 'side', 'back' (trainers) — companions use compImg(sp, 'q'|'side'|'back')
LB.trainerView = (n, v) => v === 'front' ? LB.trainerImg(n) : `${LB.ASSET_BASE}trainers/${n}_${v}.png`;

LB.LANTERN_SVG = (c = '#5fd6e6') => `<svg viewBox="0 0 46 60" width="100%" height="100%"><path d="M23 2v6" stroke="#5a3d1c" stroke-width="3"/><circle cx="23" cy="4" r="3" fill="none" stroke="#5a3d1c" stroke-width="2"/><rect x="11" y="8" width="24" height="6" rx="2" fill="#b8862e" stroke="#5a3d1c" stroke-width="1.5"/><rect x="12" y="14" width="22" height="34" rx="3" fill="#fff6d8" fill-opacity=".35" stroke="#b8862e" stroke-width="2.5"/><path d="M23 18l7 12-7 14-7-14z" fill="${c}" stroke="#2a5f6a" stroke-width="1.5"/><path d="M23 18l3 12-3 14" fill="#ffffff" opacity=".55"/><rect x="11" y="48" width="24" height="6" rx="2" fill="#b8862e" stroke="#5a3d1c" stroke-width="1.5"/></svg>`;
LB.typeTag = t => `<span class="type" style="background:${LB.TYPE_COLOR[t]}">${LB.t(t)}</span>`;

LB.UI_CSS = "#lb-ui{\n  --paper:#f5efe2; --paper2:#ebe1cc; --ink:#2b2418; --ink2:#6b5d48; --line:#c9b892;\n  --accent:#b8692e; --teal:#2f7f86; \n  --hp:#5aa340; --hpmid:#d9a634; --hplow:#c8452f;\n}\n\n#lb-ui, #lb-ui #lb-ui, #lb-ui *{box-sizing:border-box}\n#lb-ui #lb-ui button{font-family:inherit;cursor:pointer;color:var(--ink)}\n\n/* top bar */\n#hud{position:absolute;top:8px;left:8px;right:8px;display:none;justify-content:space-between;gap:6px;pointer-events:none;z-index:10}\n#hud.on{display:flex}\n#hud .grp{display:flex;gap:6px;pointer-events:auto;flex-wrap:wrap}\n.chip{background:rgba(245,239,226,.94);border:2px solid #3b2f20;border-radius:10px;padding:4px 10px;font-weight:800;font-size:13px;display:flex;align-items:center;gap:5px}\nbutton.chip:hover{background:#fff}\n.coin{display:inline-block;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe7a0,#d9a634 60%,#a87a1c);border:1px solid #7a5a14;vertical-align:-1px}\n#toast{position:absolute;left:50%;top:52px;transform:translate(-50%,-8px);background:rgba(245,239,226,.95);border:2px solid #3b2f20;border-radius:10px;padding:5px 16px;font-family:Fraunces,serif;font-weight:800;font-size:16px;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;z-index:11}\n#toast.on{opacity:1;transform:translate(-50%,0)}\n\n/* dialog */\n#dialog{position:absolute;left:10px;right:10px;bottom:10px;display:none;background:var(--paper);border:3px solid #3b2f20;border-radius:12px;padding:12px 14px 12px 12px;gap:12px;align-items:flex-start;min-height:92px;box-shadow:0 4px 0 rgba(0,0,0,.25);cursor:pointer;z-index:30}\n#dialog.on{display:flex}\n#dialog .por{width:64px;height:84px;flex:none;background:var(--paper2);border-radius:8px;border:2px solid var(--line);display:flex;align-items:flex-start;overflow:hidden}\n#dialog .por img{width:170%;max-width:none;margin-left:-35%;margin-top:2px}\n#dialog .who{font-family:Fraunces,serif;font-weight:800;color:var(--accent);font-size:15px}\n#dialog .txt{font-size:17px;line-height:1.35;font-weight:700}\n#dialog .more{position:absolute;right:12px;bottom:6px;font-size:12px;color:var(--ink2);animation:bob 1s infinite}\n  #dialog .more .k{font-weight:800;border:1px solid currentColor;border-radius:4px;padding:0 3px;margin-left:4px;font-size:10px;vertical-align:1px}\n  html body.dev-phone #dialog .more .k,html body.dev-tablet #dialog .more .k{display:none}\n@keyframes bob{50%{transform:translateY(-3px)}}\n\n/* windows */\n.sheet{position:absolute;inset:0;background:rgba(20,25,25,.55);display:none;align-items:center;justify-content:center;z-index:40;padding:10px}\n.sheet.on{display:flex}\n.card{background:var(--paper);border:3px solid #3b2f20;border-radius:14px;width:100%;max-width:660px;max-height:100%;overflow:auto;padding:12px 14px}\n.card h3{font-family:Fraunces,serif;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center;font-size:20px}\n.card h4{font-family:Fraunces,serif;margin:12px 0 6px}\n.x{background:none;border:2px solid #3b2f20;border-radius:8px;font-weight:800;padding:2px 9px}\n.nm{font-family:Fraunces,serif;font-weight:800}\n.small{font-size:12px;color:var(--ink2);font-weight:800}\n.type{display:inline-block;color:#fff;font-weight:800;font-size:11px;padding:2px 8px;border-radius:99px;letter-spacing:.3px;text-transform:uppercase;font-family:Nunito,sans-serif}\n.plist{display:grid;gap:6px}\n.pm{display:flex;align-items:center;gap:10px;border:2px solid var(--line);border-radius:10px;padding:6px 8px;background:#fff;width:100%}\n.pm.sel{border-color:var(--accent)} .pm.fainted{opacity:.55}\n.pm img{width:58px;height:50px;object-fit:contain;flex:none}\n.pm .info{flex:1;min-width:0}\n.rowx{display:flex;justify-content:space-between;align-items:center}\n.pm .acts{display:flex;gap:5px;flex-wrap:wrap}\n.pm .acts button,.shoprow button{border:2px solid #3b2f20;background:var(--paper);border-radius:7px;font-weight:800;font-size:12px;padding:4px 9px}\n.shoprow button:disabled{opacity:.4;cursor:default}\n.bar{height:9px;background:#d8ccb2;border-radius:9px;overflow:hidden;margin-top:4px;border:1px solid #a89870}\n.bar i{display:block;height:100%}\n.shoprow{display:flex;align-items:center;gap:10px;border:2px solid var(--line);border-radius:10px;padding:6px 10px;background:#fff}\n.shoprow .ic{width:26px;height:34px;flex:none}\n.shoprow .info{flex:1;min-width:0;font-size:13px}\n.leafic{font-size:22px;line-height:34px;text-align:center}\n.jgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}\n.jgrid button{background:#fff;border:2px solid var(--line);border-radius:10px;padding:4px;display:flex;flex-direction:column;align-items:center;font-size:11px;font-weight:800;position:relative}\n.jgrid img{width:100%;height:56px;object-fit:contain}\n.jgrid img.sil{filter:brightness(0) opacity(.25)}\n.jgrid .got{position:absolute;top:2px;right:4px;font-size:12px}\n.jdetail{display:flex;gap:12px;align-items:center;margin-top:10px;border-top:2px dashed var(--line);padding-top:10px}\n.jdetail img{width:130px;height:120px;object-fit:contain;flex:none}\n.stat{display:grid;grid-template-columns:52px 1fr 28px;gap:6px;align-items:center;font-size:12px;font-weight:800}\n.stat .b{height:7px;background:#e2d8c2;border-radius:6px;overflow:hidden}\n.stat .b i{display:block;height:100%;background:var(--teal)}\n\n@media (max-width:560px){ .jgrid{grid-template-columns:repeat(4,1fr)} .chip{font-size:11px;padding:3px 7px} #dialog .txt{font-size:15px} }\n\n#lb-ui{position:fixed;pointer-events:none;z-index:5;font-family:Nunito,system-ui,sans-serif;color:var(--ink);overflow:hidden}\n#lb-ui #hud .grp, #lb-ui #dialog, #lb-ui .sheet.on, #lb-ui #pad.on #stick, #lb-ui #pad.on .ab{pointer-events:auto}\n#pad{position:absolute;inset:auto 0 14px 0;display:none;justify-content:space-between;align-items:flex-end;padding:0 18px;user-select:none;touch-action:none}\n#pad.on{display:flex}\n#stick{width:150px;height:150px;flex:none;border-radius:50%;background:rgba(245,239,226,.28);border:3px solid rgba(59,47,32,.55);position:relative;touch-action:none}\n#knob{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(58,75,72,.85);box-shadow:0 3px 0 #1e2b29}\n#pad .acts{display:grid;grid-template-columns:repeat(3,auto);gap:10px;align-items:end;justify-items:center}\n.ab{width:88px;height:88px;border-radius:50%;border:0;background:var(--accent);color:#fff;font-size:26px;font-weight:800;box-shadow:0 4px 0 #6d3a14;opacity:.9;touch-action:none}\n.ab.s{width:64px;height:64px;font-size:20px;background:#3a4b48;box-shadow:0 3px 0 #1e2b29}\n";
LB.UI_HTML = "<div id=\"hud\">\n  <div class=\"grp\"></div>\n  <div class=\"grp\">\n    <button class=\"chip\" id=\"bParty\" data-i18n=\"Party\">Party</button>\n    <button class=\"chip\" id=\"bJournal\" data-i18n=\"Journal\">Journal</button>\n    <button class=\"chip\" id=\"bQuest\" data-i18n-title=\"Quests\">📜</button>\n    <button class=\"chip\" id=\"bSave\" data-i18n=\"Save\">Save</button>\n    <button class=\"chip\" id=\"bCam\" data-i18n-title=\"Rotate camera (Z / X)\">⟳</button>\n    <button class=\"chip\" id=\"bFull\" data-i18n-title=\"Full screen\">⛶</button>\n    <button class=\"chip\" id=\"bLang\" data-i18n-title=\"Language\">EN</button>\n    <button class=\"chip\" id=\"bHelp\" data-i18n-title=\"Controls\">?</button><button class=\"chip\" id=\"bMute\" data-i18n-title=\"Sound on/off\">♪</button>\n  </div>\n</div>\n<div id=\"toast\"></div>\n<div id=\"dialog\"><div class=\"por\"><img id=\"dPor\" alt=\"\"></div><div><div class=\"who\" id=\"dWho\"></div><div class=\"txt\" id=\"dTxt\"></div></div><div class=\"more\">▼<span class=\"k\">Space</span></div></div>\n<div class=\"sheet\" id=\"partySheet\"><div class=\"card\"><h3><span id=\"partyTitle\">Party</span><button class=\"x\" id=\"partyX\">✕</button></h3><div class=\"plist\" id=\"plist\"></div><div id=\"boxWrap\"></div></div></div>\n<div class=\"sheet\" id=\"shopSheet\"><div class=\"card\"><h3><span><span data-i18n=\"Lantern Stall\">Lantern Stall</span> <span class=\"small\" id=\"shopCoins\"></span></span><button class=\"x\" id=\"shopX\">✕</button></h3><div class=\"plist\" id=\"shopList\"></div></div></div>\n<div class=\"sheet\" id=\"journalSheet\"><div class=\"card\"><h3><span><span data-i18n=\"Journal\">Journal</span> <span class=\"small\" id=\"jCount\"></span></span><button class=\"x\" id=\"journalX\">✕</button></h3><div class=\"jgrid\" id=\"jgrid\"></div><div id=\"jdetail\"></div></div></div>\n<div id=\"pad\">\n  <div id=\"stick\"><div id=\"knob\"></div></div>\n  <div class=\"acts\"><button class=\"ab s\" data-b=\"switch\">⇄</button><button class=\"ab s\" data-b=\"salve\">🌿</button><button class=\"ab s\" data-b=\"lantern\">🏮</button><button class=\"ab s\" data-b=\"spc\">SP</button><button class=\"ab s\" data-b=\"dodge\">⤳</button><button class=\"ab\" data-b=\"atk\" id=\"aBtn\">A</button></div>\n</div>";

// ---------- HUD ----------
LB.showHud = on => { const h = $('hud'); if (!h) return; h.classList.toggle('on', on); $('pad').classList.toggle('on', on && LB.touch); };
LB.updHud = function () {
  if ($('bLang')) $('bLang').textContent = (LB.lang || 'en').toUpperCase();
  if (!$('bMute')) return;
  $('bMute').textContent = ['♪', '♪ ' + LB.t('fx'), '♪ ' + LB.t('off')][LB.audioMode || 0];
};
LB.toast = function (s) {
  const t = $('toast'); t.textContent = s; t.classList.add('on');
  clearTimeout(LB._toastT); LB._toastT = setTimeout(() => t.classList.remove('on'), 1700);
};

// ---------- Dialog ----------
LB.advanceFn = null;
LB.advance = () => { if (LB.advanceFn) { LB.lastDialogEnd = performance.now(); const f = LB.advanceFn; LB.advanceFn = null; f(); return true; } return false; };
LB.dialog = function (lines, who) {
  return new Promise(res => {
    const prev = LB.mode; LB.mode = 'dialog';
    const d = $('dialog'); d.classList.add('on');
    const por = d.querySelector('.por');
    if (who && LB.TRAINERS[who]) { $('dPor').src = LB.trainerImg(who); por.style.display = ''; } else por.style.display = 'none';
    $('dWho').textContent = who || '';
    let i = 0;
    const show = () => { $('dTxt').textContent = lines[i]; LB.advanceFn = next; };
    const next = () => {
      i++;
      if (i < lines.length) { LB.SFX.sel(); show(); }
      else { d.classList.remove('on'); LB.advanceFn = null; LB.mode = prev === 'dialog' ? 'world' : prev; res(); }
    };
    d.onclick = () => LB.advance();
    show();
  });
};

// ---------- Party window ----------
// ctx: 'world' | 'battle' | 'forced'.  In battle it resolves with the chosen party index (or null).
LB.partySheet = function (ctx, current) {
  return new Promise(res => {
    const G = LB.G, sh = $('partySheet'); sh.classList.add('on');
    $('partyTitle').textContent = LB.t(ctx === 'forced' ? 'Choose who goes next' : ctx === 'battle' ? 'Switch companion' : 'Your companions');
    $('partyX').style.display = ctx === 'forced' ? 'none' : '';
    const close = v => { sh.classList.remove('on'); res(v); };
    $('partyX').onclick = () => close(null);
    const hpCol = p => p > .5 ? 'var(--hp)' : p > .2 ? 'var(--hpmid)' : 'var(--hplow)';
    const draw = () => {
      const L = $('plist'); L.innerHTML = '';
      G.party.forEach((m, i) => {
        const s = LB.statsOf(m), mxA = LB.unitMaxHp(m), p = Math.max(0, m.hpA ?? mxA) / mxA, row = document.createElement('div');
        row.className = 'pm' + ((m.hpA ?? 1) <= 0 ? ' fainted' : '') + (m === current ? ' sel' : '');
        row.innerHTML = `<img src="${LB.compImg(m.sp)}" alt=""><div class="info"><div class="rowx"><span class="nm">${m.sp} ${LB.typeTag(LB.MON[m.sp].t)}</span><span class="small">${m.shiny ? '★ ' : ''}${LB.t('Lv')} ${m.lvl} · <span style="color:#c8452f">${(m.bond || 0) >= 100 ? '★' : '❤'} ${Math.round(m.bond || 0)}</span></span></div><div class="bar"><i style="width:${p * 100}%;background:${hpCol(p)}"></i></div><div class="small">${Math.max(0, Math.round(m.hpA ?? mxA))} / ${mxA} ${LB.t('HP')} · ${LB.t('ATK')} ${s.atk} · ${LB.t('DEF')} ${s.def} · ${LB.t('SPD')} ${s.spd}</div></div><div class="acts"></div>`;
        const acts = row.querySelector('.acts');
        const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; acts.appendChild(b); };
        if (ctx === 'world') {
          if (i > 0) btn(LB.t('Lead'), () => { G.party.splice(i, 1); G.party.unshift(m); draw(); });
          if (G.items.salve > 0 && (m.hpA ?? mxA) < mxA) btn(LB.t('Salve'), () => { G.items.salve--; m.hpA = Math.min(mxA, Math.max(0, m.hpA) + Math.round(mxA * .45)); LB.SFX.heal(); LB.updHud(); draw(); });
        } else if (m.hp > 0 && m !== current) btn(LB.t('Send out'), () => close(i));
        L.appendChild(row);
      });
      const bw = $('boxWrap'); bw.innerHTML = '';
      if (ctx === 'world' && G.box.length) {
        bw.innerHTML = '<h4>' + LB.t('Resting at the shrine') + '</h4>';
        const L2 = document.createElement('div'); L2.className = 'plist';
        G.box.forEach((m, j) => {
          const r = document.createElement('div'); r.className = 'pm';
          r.innerHTML = `<img src="${LB.compImg(m.sp)}" alt=""><div class="info"><span class="nm">${m.sp}</span> <span class="small">${LB.t('Lv')} ${m.lvl}</span></div><div class="acts"></div>`;
          const b = document.createElement('button'); b.textContent = LB.t('Swap in');
          b.onclick = () => { if (G.party.length < 6) { G.party.push(m); G.box.splice(j, 1); } else { const out = G.party.pop(); G.party.push(m); G.box[j] = out; } draw(); };
          r.querySelector('.acts').appendChild(b); L2.appendChild(r);
        });
        bw.appendChild(L2);
      }
    };
    draw();
  });
};

// ---------- Journal ----------
LB.journal = function () {
  const G = LB.G, sh = $('journalSheet'); sh.classList.add('on'); LB.mode = 'menu';
  $('journalX').onclick = () => { sh.classList.remove('on'); LB.mode = 'world'; };
  $('jCount').textContent = LB.t('· {c} befriended · {s} seen / {n}', { c: Object.keys(G.caught).length, s: Object.keys(G.seen).length, n: LB.DEX.length });
  const grid = $('jgrid'); grid.innerHTML = ''; $('jdetail').innerHTML = '';
  const detail = sp => {
    const M = LB.MON[sp];
    if (!(G.seen[sp] || G.caught[sp])) { $('jdetail').innerHTML = `<div class="jdetail"><div class="small">${LB.t("You haven't met this companion yet. Explore the tall grass!")}</div></div>`; return; }
    const lbl = ['HP', 'ATK', 'DEF', 'SPD'].map(k => LB.t(k));
    const where = Object.values(LB.ZONES).filter(z => z.t.includes(sp)).map(z => LB.t(LB.ZONE_NAMES[z.name])).join(', ') || LB.t('Starter; rare in Amberroot Grove');
    $('jdetail').innerHTML = `<div class="jdetail"><img src="${LB.compImg(sp)}" alt=""><div style="flex:1"><div class="nm" style="font-size:20px">${sp} ${LB.typeTag(M.t)}</div><div style="font-size:14px;margin:4px 0 8px">${LB.t(M.d)}</div>${M.b.map((v, i) => `<div class="stat"><span>${lbl[i]}</span><span class="b"><i style="width:${v / 90 * 100}%"></i></span><span>${v}</span></div>`).join('')}<div class="small" style="margin-top:6px">${LB.t('Moves:')} ${M.m.map(k => LB.t(LB.MOVES[k].n)).join(LB.t(', '))}</div><div class="small">${LB.t('Strong vs')} ${LB.STRONG[M.t].map(x => LB.t(x)).join(' & ')} · ${LB.t('Found:')} ${where}</div></div></div>`;
  };
  LB.DEX.forEach((sp, i) => {
    const seen = G.seen[sp] || G.caught[sp], b = document.createElement('button');
    b.innerHTML = `<img src="${LB.compImg(sp)}" class="${seen ? '' : 'sil'}" alt=""><span>${seen ? sp : '#' + String(i + 1).padStart(2, '0')}</span>${G.caught[sp] ? '<span class="got">🏮</span>' : ''}`;
    b.onclick = () => detail(sp); grid.appendChild(b);
  });
};

// ---------- Shop ----------
LB.shop = function () {
  return new Promise(res => {
    const G = LB.G; LB.mode = 'menu'; const sh = $('shopSheet'); sh.classList.add('on');
    $('shopX').onclick = () => { sh.classList.remove('on'); LB.mode = 'world'; LB.updHud(); LB.save(true); res(); };
    const draw = () => {
      $('shopCoins').innerHTML = `· <span class="coin"></span> ${LB.t('{n} coins', { n: G.coins })}`;
      const L = $('shopList'); L.innerHTML = '';
      LB.SHOP.forEach(([k, price]) => {
        const lan = LB.LANTERNS[k], r = document.createElement('div'); r.className = 'shoprow';
        r.innerHTML = `<div class="ic">${lan ? LB.LANTERN_SVG(lan.col) : '<div class="leafic">🌿</div>'}</div><div class="info"><b class="nm">${LB.t(lan ? lan.n : 'Salve')}</b> <span class="small">· ${LB.t('you have {n}', { n: G.items[k] })}</span><div>${LB.t(lan ? lan.d : 'Restores about a quarter of HP plus 20.')}</div></div><button ${G.coins < price ? 'disabled' : ''}><span class="coin"></span> ${price}</button>`;
        r.querySelector('button').onclick = () => { if (G.coins < price) return; G.coins -= price; G.items[k]++; LB.SFX.coin(); draw(); };
        L.appendChild(r);
      });
    };
    draw();
  });
};

// ---------- Build the overlay and wire it up ----------
if (LB.touch == null) LB.touch = matchMedia('(pointer:coarse)').matches;
LB.held = null;
LB.initUI = function (game) {
  if ($('lb-ui')) return;
  const font = document.createElement('link'); font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Nunito:wght@500;700;800&family=Cairo:wght@600;700;800&display=swap';
  document.head.appendChild(font);
  const st = document.createElement('style'); st.textContent = LB.UI_CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'lb-ui'; root.innerHTML = LB.UI_HTML; document.body.appendChild(root);
  if (LB.applyI18n) LB.applyI18n(root);

  // keep the overlay exactly on top of the canvas (or fill the window when there is no Phaser game)
  if (!game) { Object.assign(root.style, { left: '0', top: '0', width: '100%', height: '100%', zIndex: 10 }); }
  const sync = () => {
    if (!game) return;
    const c = game.canvas; if (!c) return;
    // The overlay is laid out at the game's own size (960×704) and scaled to match the canvas,
    // so the top bar and windows shrink and grow together with the game.
    const r = c.getBoundingClientRect(), k = r.width / 960;
    Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: '960px', height: '704px', transform: `scale(${k})`, transformOrigin: '0 0' });
  };
  if (game) game.scale.on('resize', sync); window.addEventListener('resize', sync); setInterval(sync, 500); setTimeout(sync, 50);

  window.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'f' || e.key === 'F') { if (LB.advance()) e.preventDefault(); } });
  // touch: virtual joystick + action buttons
  LB.btnQueue = []; LB.stick = { x: 0, y: 0 };
  const stick = $('stick'), knob = $('knob'); let sid = null;
  const moveStick = e => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const max = r.width * .38, d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    const k = 150 / r.width; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; LB.stick = { x: dx / max, y: dy / max };
  };
  stick.addEventListener('pointerdown', e => { e.preventDefault(); sid = e.pointerId; stick.setPointerCapture(sid); moveStick(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) moveStick(e); });
  ['pointerup', 'pointercancel'].forEach(ev => stick.addEventListener(ev, e => { if (e.pointerId === sid) { sid = null; LB.stick = { x: 0, y: 0 }; knob.style.transform = ''; } }));
  document.querySelectorAll('#pad [data-b]').forEach(b => b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (LB.advance()) return;
    const k = b.dataset.b;
    if (k === 'atk' && LB.world && LB.world.nearInteract && LB.world.nearInteract() && LB.mode === 'world') LB.btnQueue.push('talk');
    else LB.btnQueue.push(k);
  }));
  $('bParty').onclick = async () => { if (LB.mode !== 'world') return; LB.mode = 'menu'; await LB.partySheet('world'); LB.mode = 'world'; if (LB.world) LB.world.spawnAlly(); };
  $('bJournal').onclick = () => { if (LB.mode === 'world') LB.journal(); };
  $('bSave').onclick = () => { if (LB.mode === 'world') LB.save(); };
  $('bMute').onclick = () => LB.toggleMute();
  if ($('bQuest')) $('bQuest').onclick = () => LB.questLog && LB.questLog();
  $('bHelp').onclick = () => { if (LB.help) LB.help(); };
  if ($('bCam')) $('bCam').onclick = () => { LB.btnQueue.push('camR'); };
  if ($('bLang')) $('bLang').onclick = () => { const L = Object.keys(LB.LANGS), i = L.indexOf(LB.lang); LB.setLang(L[(i + 1) % L.length]); LB.toast(LB.LANGS[LB.lang]); };
  if ($('bFull')) $('bFull').onclick = () => LB.toggleFullscreen && LB.toggleFullscreen();
  LB.updHud();
  };
