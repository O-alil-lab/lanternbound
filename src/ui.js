// ============================================================
// Lanternbound — HTML overlays drawn on top of the Phaser canvas:
// top bar, dialog box, toast, party / journal / shop windows, touch pad.
// ============================================================
const $ = id => document.getElementById(id);
LB.$ = $;
LB.compImg = (sp, side = 'front') => `assets/companions/${sp}_${side}.png`;
LB.trainerImg = n => `assets/trainers/${n}.png`;

LB.LANTERN_SVG = (c = '#5fd6e6') => `<svg viewBox="0 0 46 60" width="100%" height="100%"><path d="M23 2v6" stroke="#5a3d1c" stroke-width="3"/><circle cx="23" cy="4" r="3" fill="none" stroke="#5a3d1c" stroke-width="2"/><rect x="11" y="8" width="24" height="6" rx="2" fill="#b8862e" stroke="#5a3d1c" stroke-width="1.5"/><rect x="12" y="14" width="22" height="34" rx="3" fill="#fff6d8" fill-opacity=".35" stroke="#b8862e" stroke-width="2.5"/><path d="M23 18l7 12-7 14-7-14z" fill="${c}" stroke="#2a5f6a" stroke-width="1.5"/><path d="M23 18l3 12-3 14" fill="#ffffff" opacity=".55"/><rect x="11" y="48" width="24" height="6" rx="2" fill="#b8862e" stroke="#5a3d1c" stroke-width="1.5"/></svg>`;
LB.typeTag = t => `<span class="type" style="background:${LB.TYPE_COLOR[t]}">${t}</span>`;

// ---------- HUD ----------
LB.showHud = on => { $('hud').classList.toggle('on', on); $('pad').classList.toggle('on', on && LB.touch); };
LB.updHud = function () {
  if (!LB.G) return;
  $('nLan').textContent = LB.lanternTotal(); $('nSal').textContent = LB.G.items.salve; $('nCoin').textContent = LB.G.coins;
  $('bMute').textContent = LB.muted ? '♪ off' : '♪';
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
    $('partyTitle').textContent = ctx === 'forced' ? 'Choose who goes next' : ctx === 'battle' ? 'Switch companion' : 'Your companions';
    $('partyX').style.display = ctx === 'forced' ? 'none' : '';
    const close = v => { sh.classList.remove('on'); res(v); };
    $('partyX').onclick = () => close(null);
    const hpCol = p => p > .5 ? 'var(--hp)' : p > .2 ? 'var(--hpmid)' : 'var(--hplow)';
    const draw = () => {
      const L = $('plist'); L.innerHTML = '';
      G.party.forEach((m, i) => {
        const s = LB.statsOf(m), p = m.hp / s.hp, row = document.createElement('div');
        row.className = 'pm' + (m.hp <= 0 ? ' fainted' : '') + (m === current ? ' sel' : '');
        row.innerHTML = `<img src="${LB.compImg(m.sp)}" alt=""><div class="info"><div class="rowx"><span class="nm">${m.sp} ${LB.typeTag(LB.MON[m.sp].t)}</span><span class="small">Lv ${m.lvl}</span></div><div class="bar"><i style="width:${p * 100}%;background:${hpCol(p)}"></i></div><div class="small">${m.hp} / ${s.hp} HP · ATK ${s.atk} · DEF ${s.def} · SPD ${s.spd}</div></div><div class="acts"></div>`;
        const acts = row.querySelector('.acts');
        const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; acts.appendChild(b); };
        if (ctx === 'world') {
          if (i > 0) btn('Lead', () => { G.party.splice(i, 1); G.party.unshift(m); draw(); });
          if (G.items.salve > 0 && m.hp > 0 && m.hp < s.hp) btn('Salve', () => { G.items.salve--; m.hp = Math.min(s.hp, m.hp + 20 + Math.floor(s.hp * .25)); LB.SFX.heal(); LB.updHud(); draw(); });
        } else if (m.hp > 0 && m !== current) btn('Send out', () => close(i));
        L.appendChild(row);
      });
      const bw = $('boxWrap'); bw.innerHTML = '';
      if (ctx === 'world' && G.box.length) {
        bw.innerHTML = '<h4>Resting at the shrine</h4>';
        const L2 = document.createElement('div'); L2.className = 'plist';
        G.box.forEach((m, j) => {
          const r = document.createElement('div'); r.className = 'pm';
          r.innerHTML = `<img src="${LB.compImg(m.sp)}" alt=""><div class="info"><span class="nm">${m.sp}</span> <span class="small">Lv ${m.lvl}</span></div><div class="acts"></div>`;
          const b = document.createElement('button'); b.textContent = 'Swap in';
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
  $('jCount').textContent = `· ${Object.keys(G.caught).length} befriended · ${Object.keys(G.seen).length} seen / ${LB.DEX.length}`;
  const grid = $('jgrid'); grid.innerHTML = ''; $('jdetail').innerHTML = '';
  const detail = sp => {
    const M = LB.MON[sp];
    if (!(G.seen[sp] || G.caught[sp])) { $('jdetail').innerHTML = `<div class="jdetail"><div class="small">You haven't met this companion yet. Explore the tall grass!</div></div>`; return; }
    const lbl = ['HP', 'ATK', 'DEF', 'SPD'];
    const where = Object.values(LB.ZONES).filter(z => z.t.includes(sp)).map(z => LB.ZONE_NAMES[z.name]).join(', ') || 'Starter; rare in Amberroot Grove';
    $('jdetail').innerHTML = `<div class="jdetail"><img src="${LB.compImg(sp)}" alt=""><div style="flex:1"><div class="nm" style="font-size:20px">${sp} ${LB.typeTag(M.t)}</div><div style="font-size:14px;margin:4px 0 8px">${M.d}</div>${M.b.map((v, i) => `<div class="stat"><span>${lbl[i]}</span><span class="b"><i style="width:${v / 90 * 100}%"></i></span><span>${v}</span></div>`).join('')}<div class="small" style="margin-top:6px">Moves: ${M.m.map(k => LB.MOVES[k].n).join(', ')}</div><div class="small">Strong vs ${LB.STRONG[M.t].join(' & ')} · Found: ${where}</div></div></div>`;
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
      $('shopCoins').innerHTML = `· <span class="coin"></span> ${G.coins} coins`;
      const L = $('shopList'); L.innerHTML = '';
      LB.SHOP.forEach(([k, price]) => {
        const lan = LB.LANTERNS[k], r = document.createElement('div'); r.className = 'shoprow';
        r.innerHTML = `<div class="ic">${lan ? LB.LANTERN_SVG(lan.col) : '<div class="leafic">🌿</div>'}</div><div class="info"><b class="nm">${lan ? lan.n : 'Salve'}</b> <span class="small">· you have ${G.items[k]}</span><div>${lan ? lan.d : 'Restores about a quarter of HP plus 20.'}</div></div><button ${G.coins < price ? 'disabled' : ''}><span class="coin"></span> ${price}</button>`;
        r.querySelector('button').onclick = () => { if (G.coins < price) return; G.coins -= price; G.items[k]++; LB.SFX.coin(); draw(); };
        L.appendChild(r);
      });
    };
    draw();
  });
};

// ---------- Global keys + touch pad ----------
LB.touch = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
LB.held = null;
window.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'z') { if (LB.advance()) e.preventDefault(); }
});
document.querySelectorAll('#pad [data-d]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); LB.held = b.dataset.d; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (LB.held === b.dataset.d) LB.held = null; }));
});
$('aBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (!LB.advance() && LB.mode === 'world' && LB.onA) LB.onA(); });
$('bParty').onclick = async () => { if (LB.mode !== 'world') return; LB.mode = 'menu'; await LB.partySheet('world'); LB.mode = 'world'; };
$('bJournal').onclick = () => { if (LB.mode === 'world') LB.journal(); };
$('bSave').onclick = () => { if (LB.mode === 'world') LB.save(); };
$('bMute').onclick = () => LB.toggleMute();
$('lanIco').innerHTML = `<span style="display:inline-block;width:13px;height:17px">${LB.LANTERN_SVG()}</span>`;
