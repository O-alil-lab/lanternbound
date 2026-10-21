// ============================================================
// Lanternbound — world map, tileset painting and NPC placement
// Map legend:  . grass   , meadow grass   ; reeds   g grove grass   r ridge grass
//              : path     ~ water   = bridge   T tree   R rock   H house   W fence
//              S shrine   P standing stone   M lantern stall   F flowers
// Tiles marked , ; g r trigger wild encounters.
// ============================================================
LB.TS = 32; LB.MW = 30; LB.MH = 22;
LB.SOLID = new Set(['T', 'R', 'H', 'S', 'W', '~', 'P', 'M']);

LB.buildMap = function () {
  const MW = LB.MW, MH = LB.MH;
  const M = Array.from({ length: MH }, () => Array(MW).fill('.'));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < MW && y < MH) M[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  rect(2, 2, 11, 11, ',');                                                     // Whisper Meadow
  [[4, 4], [5, 4], [4, 5], [9, 8], [3, 9], [10, 3]].forEach(([x, y]) => set(x, y, 'T'));
  rect(9, 18, 11, 20, ',');                                                    // village grass patch
  rect(16, 10, 19, 19, ';'); rect(16, 1, 19, 6, ';');                         // Rillbank Reeds
  rect(20, 1, 28, 7, 'r');                                                     // Cairn Ridge
  [[23, 4], [24, 5], [27, 6], [20, 6], [26, 3], [22, 6]].forEach(([x, y]) => set(x, y, 'R'));
  rect(21, 11, 28, 20, 'g');                                                   // Amberroot Grove
  [[22, 13], [25, 12], [27, 15], [23, 17], [26, 19], [21, 19]].forEach(([x, y]) => set(x, y, 'T'));
  rect(20, 10, 28, 10, 'T'); set(24, 10, '.'); set(25, 10, '.');
  rect(13, 1, 15, 20, '~');                                                    // river
  rect(1, 13, 12, 13, 'W'); set(6, 13, ':');                                   // village fence + gate
  for (let y = 14; y <= 20; y++) set(6, y, ':');
  set(3, 15, 'H'); set(8, 15, 'H'); set(4, 18, 'S');
  [[2, 19], [8, 19], [10, 15], [1, 15]].forEach(([x, y]) => set(x, y, 'F'));
  set(2, 17, 'M');
  for (let y = 8; y <= 12; y++) set(6, y, ':');                                // paths
  for (let x = 6; x <= 12; x++) set(x, 8, ':');
  for (let x = 13; x <= 15; x++) set(x, 8, '=');
  for (let x = 16; x <= 21; x++) set(x, 8, ':');
  for (let y = 2; y <= 9; y++) set(21, y, ':');
  for (let x = 21; x <= 25; x++) set(x, 2, ':');
  set(26, 2, 'P');
  for (let y = 9; y <= 14; y++) set(17, y, ':');
  rect(0, 0, MW - 1, 0, 'T'); rect(0, MH - 1, MW - 1, MH - 1, 'T'); rect(0, 0, 0, MH - 1, 'T'); rect(MW - 1, 0, MW - 1, MH - 1, 'T');
  LB.MAP = M;
  return M;
};

LB.zoneAt = function (x, y) {
  if (y >= 13 && x <= 12) return 'village';
  if (x <= 12) return 'meadow';
  if (x <= 19) return 'reeds';
  if (y <= 9) return 'ridge';
  return 'grove';
};

// NPCs move once beaten so the path opens.
LB.npcs = function () {
  const R = LB.G.roles, B = LB.G.beat;
  return [
    { id: 'mentor', who: R.mentor, x: 8, y: 17 },
    { id: 'ranger', who: R.ranger, x: B.ranger ? 7 : 6, y: 12 },
    { id: 'rival', who: R.rival, x: B.rival ? 16 : 13, y: B.rival ? 7 : 8 },
    { id: 'angler', who: R.angler, x: 18, y: 14 },
    { id: 'warden', who: R.warden, x: 25, y: 2 }
  ];
};
LB.npcAt = (x, y) => LB.npcs().find(n => n.x === x && n.y === y);

// ---------- Tileset (painted in code onto a canvas texture) ----------
function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
LB.hash = hash;

// Order of frames in the tileset texture
LB.TILE_KEYS = [];
['.', ',', ';', 'g', 'r', ':'].forEach(c => { for (let v = 0; v < 4; v++) LB.TILE_KEYS.push(c + v); });
['~0', '~1', '~2', '~3', '=', 'T.', 'Tg', 'Tr', 'R', 'H', 'W', 'S', 'P', 'M', 'F0', 'F1'].forEach(k => LB.TILE_KEYS.push(k));
LB.TILE_INDEX = Object.fromEntries(LB.TILE_KEYS.map((k, i) => [k, i]));

LB.frameFor = function (c, x, y) {
  const v = Math.floor(hash(x, y, 77) * 4);
  if ('.,;gr:'.includes(c)) return LB.TILE_INDEX[c + v];
  if (c === '~') return LB.TILE_INDEX['~0'];
  if (c === 'T') return LB.TILE_INDEX[(y >= 11 && x >= 20) ? 'Tg' : (y <= 8 && x >= 20 ? 'Tr' : 'T.')];
  if (c === 'F') return LB.TILE_INDEX['F' + (v % 2)];
  return LB.TILE_INDEX[c];
};

LB.paintTileset = function (ctx) {
  const TS = LB.TS;
  function grassBase(px, py, sx, sy, c1 = '#93b660', c2 = '#86aa55') {
    ctx.fillStyle = c1; ctx.fillRect(px, py, TS, TS);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? c2 : '#a3c470'; ctx.fillRect(px + hash(sx, sy, i) * 30, py + hash(sy, sx, i + 9) * 30, 2, 2); }
  }
  function blades(px, py, sx, sy, col, n = 7, h = 12) {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const bx = px + 3 + hash(sx, sy, i + 20) * 26, by = py + 10 + hash(sx, sy, i + 40) * 20;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 2, by - h / 2, bx + (hash(sx, sy, i) - .5) * 6, by - h); ctx.stroke();
    }
  }
  function ground(c, px, py, sx, sy) {
    switch (c) {
      case '.': grassBase(px, py, sx, sy); break;
      case ',': grassBase(px, py, sx, sy, '#7fa84e', '#6f9844'); blades(px, py, sx, sy, '#4f7a2c', 8, 13); break;
      case ';': grassBase(px, py, sx, sy, '#97b673', '#88a866'); blades(px, py, sx, sy, '#5f7d36', 6, 20);
        ctx.fillStyle = '#8a5a2b'; for (let i = 0; i < 3; i++) ctx.fillRect(px + 5 + hash(sx, sy, i + 60) * 22, py + 2 + hash(sx, sy, i + 70) * 8, 3, 7); break;
      case 'g': grassBase(px, py, sx, sy, '#5f8a47', '#55803f'); blades(px, py, sx, sy, '#3a6328', 9, 14); break;
      case 'r': ctx.fillStyle = '#c4b493'; ctx.fillRect(px, py, TS, TS);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ab9b7a'; ctx.fillRect(px + hash(sx, sy, i) * 28, py + hash(sy, sx, i) * 28, 3, 2); }
        blades(px, py, sx, sy, '#7d8250', 5, 10); break;
      case ':': ctx.fillStyle = '#dcc79d'; ctx.fillRect(px, py, TS, TS);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#c7b083'; ctx.beginPath(); ctx.arc(px + 4 + hash(sx, sy, i) * 24, py + 4 + hash(sy, sx, i) * 24, 1.6, 0, 7); ctx.fill(); } break;
    }
  }
  function water(px, py, f) {
    ctx.fillStyle = '#4d93b5'; ctx.fillRect(px, py, TS, TS);
    ctx.strokeStyle = 'rgba(220,245,255,.55)'; ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const o = (f * 8 + i * 16 + 5) % 32; ctx.beginPath(); ctx.moveTo(px + 4 + i * 10, py + o); ctx.lineTo(px + 14 + i * 10, py + o); ctx.stroke(); }
  }
  LB.TILE_KEYS.forEach((k, i) => {
    const px = i * TS, py = 0, c = k[0], v = +k[1] || 0, sx = v * 7 + 1, sy = v * 13 + 3;
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, TS, TS); ctx.clip();
    if ('.,;gr:'.includes(c) && k.length === 2) ground(c, px, py, sx, sy);
    else if (c === '~') water(px, py, +k[1]);
    else if (k === '=') {
      water(px, py, 0); ctx.fillStyle = '#a8743f'; ctx.fillRect(px, py + 3, TS, 26); ctx.strokeStyle = '#7a4f26'; ctx.lineWidth = 1.5;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(px + j * 8 + 4, py + 3); ctx.lineTo(px + j * 8 + 4, py + 29); ctx.stroke(); }
      ctx.fillStyle = '#6b4420'; ctx.fillRect(px, py + 2, TS, 3); ctx.fillRect(px, py + 27, TS, 3);
    } else if (c === 'T') {
      ground(k[1] === 'g' ? 'g' : k[1] === 'r' ? 'r' : '.', px, py, 5, 9);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 12, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(px + 13, py + 18, 6, 11);
      ctx.fillStyle = '#3e6b33'; ctx.beginPath(); ctx.arc(px + 16, py + 13, 13, 0, 7); ctx.fill();
      ctx.fillStyle = '#4f8240'; ctx.beginPath(); ctx.arc(px + 12, py + 10, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a9c4f'; ctx.beginPath(); ctx.arc(px + 10, py + 8, 3.5, 0, 7); ctx.fill();
    } else if (k === 'R') {
      ground('r', px, py, 3, 4); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 27, 13, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8f8a80'; ctx.beginPath(); ctx.moveTo(px + 3, py + 27); ctx.lineTo(px + 8, py + 9); ctx.lineTo(px + 19, py + 5); ctx.lineTo(px + 29, py + 15); ctx.lineTo(px + 29, py + 27); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b3ada2'; ctx.beginPath(); ctx.moveTo(px + 9, py + 11); ctx.lineTo(px + 19, py + 7); ctx.lineTo(px + 22, py + 14); ctx.lineTo(px + 12, py + 17); ctx.closePath(); ctx.fill();
    } else if (k === 'H') {
      ground('.', px, py, 2, 2); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(px + 3, py + 27, 28, 4);
      ctx.fillStyle = '#efe2c4'; ctx.fillRect(px + 4, py + 14, 24, 14);
      ctx.fillStyle = '#b5552f'; ctx.beginPath(); ctx.moveTo(px, py + 16); ctx.lineTo(px + 16, py + 2); ctx.lineTo(px + 32, py + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8b3f22'; ctx.fillRect(px, py + 15, 32, 2); ctx.fillStyle = '#6b4420'; ctx.fillRect(px + 13, py + 19, 7, 9);
      ctx.fillStyle = '#f6d36b'; ctx.fillRect(px + 6, py + 18, 5, 4); ctx.fillRect(px + 22, py + 18, 5, 4);
    } else if (k === 'W') {
      ground('.', px, py, 4, 1); ctx.fillStyle = '#8a5e33'; ctx.fillRect(px, py + 12, TS, 3); ctx.fillRect(px, py + 20, TS, 3); ctx.fillRect(px + 3, py + 9, 4, 17); ctx.fillRect(px + 19, py + 9, 4, 17);
    } else if (k === 'S') {
      ground(':', px, py, 1, 1); ctx.fillStyle = '#9a9182'; ctx.fillRect(px + 8, py + 20, 16, 9); ctx.fillStyle = '#7d7568'; ctx.fillRect(px + 12, py + 16, 8, 5);
      ctx.fillStyle = '#b8862e'; ctx.fillRect(px + 11, py + 3, 10, 13); ctx.fillStyle = '#5fd6e6';
      ctx.beginPath(); ctx.moveTo(px + 16, py + 5); ctx.lineTo(px + 19, py + 10); ctx.lineTo(px + 16, py + 15); ctx.lineTo(px + 13, py + 10); ctx.fill();
    } else if (k === 'P') {
      ground('r', px, py, 6, 6); ctx.fillStyle = '#7f7a70'; ctx.beginPath(); ctx.moveTo(px + 9, py + 29); ctx.lineTo(px + 11, py + 3); ctx.lineTo(px + 21, py + 1); ctx.lineTo(px + 24, py + 29); ctx.fill();
      ctx.fillStyle = '#f0b85a'; ctx.beginPath(); ctx.arc(px + 16, py + 11, 3, 0, 7); ctx.fill();
    } else if (k === 'M') {
      ground('.', px, py, 8, 8); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(px + 3, py + 27, 27, 4);
      ctx.fillStyle = '#8a5e33'; ctx.fillRect(px + 4, py + 10, 3, 18); ctx.fillRect(px + 25, py + 10, 3, 18);
      ctx.fillStyle = '#c79a5b'; ctx.fillRect(px + 3, py + 18, 26, 10);
      for (let j = 0; j < 4; j++) { ctx.fillStyle = j % 2 ? '#f5efe2' : '#2f7f86'; ctx.beginPath(); ctx.moveTo(px + 1 + j * 7.5, py + 11); ctx.lineTo(px + 4 + j * 7.5, py + 3); ctx.lineTo(px + 9 + j * 7.5, py + 3); ctx.lineTo(px + 8.5 + j * 7.5, py + 11); ctx.closePath(); ctx.fill(); }
      ['#5fd6e6', '#86c24e', '#f08a3c'].forEach((cc, j) => { ctx.fillStyle = '#b8862e'; ctx.fillRect(px + 6 + j * 7, py + 13, 5, 6); ctx.fillStyle = cc; ctx.fillRect(px + 7 + j * 7, py + 14, 3, 4); });
    } else if (c === 'F') {
      ground('.', px, py, v + 11, v + 3);
      ['#e8c34a', '#e07a5f', '#f4f1e8', '#b58ad6'].forEach((col, j) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px + 6 + hash(v, j, 3) * 20, py + 6 + hash(j, v, 5) * 20, 3, 0, 7); ctx.fill(); });
    }
    ctx.restore();
  });
};
