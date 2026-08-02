/* Café Hygge — pixel-art scene rendering (all drawn in code, no assets) */
(function () {
  'use strict';

  const SCENE = (window.SCENE = {});
  const W = 480, H = 270;

  /* ---------- layout, shared with the sim ---------- */
  const L = (SCENE.L = {
    W: W, H: H,
    wallY: 110,               // where wall meets floor
    door: { x: 10, y: 28, w: 36, h: 82 },
    doorSpot: { x: 27, y: 122 },     // where people appear
    bell: { x: 48, y: 30 },
    win: { x: 62, y: 24, w: 88, h: 64 },
    fire: { x: 168, w: 48, boxX: 179, boxW: 28, boxTop: 66, boxBot: 106 },
    lane: 166,                // main walking corridor
    lamp1: { x: 159, y: 24 },
    lamp2: { x: 307, y: 24 },
    floorLamp: { x: 143, y: 166 },
    armchair: { x: 158, y: 174, seatX: 161, seatY: 174 },
    counter: { x: 312, w: 160, slabY: 112, frontY: 126, baseY: 156 },
    machine: { x: 322, y: 86, w: 36 },
    serveSpot: { x: 366, y: 118 },   // where finished cups land on the counter
    orderSpot: { x: 348, y: 168 },
    pickupSpot: { x: 366, y: 168 },
    baristaHome: { x: 340, y: 122 },
    baristaExitX: 305,               // where the barista slips out from behind the counter
    tables: [
      { x: 96,  y: 192, tag: 'by the window' },
      { x: 205, y: 200, tag: 'near the fire' },
      { x: 130, y: 242, tag: '' },
      { x: 258, y: 244, tag: '' }
    ],
    stoolDX: 22, stoolDY: 4
  });

  /* ---------- helpers ---------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); }

  function ell(g, cx, cy, rx, ry, c) {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  function hexRGB(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpHex(h1, h2, t) {
    const a = hexRGB(h1), b = hexRGB(h2);
    return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
  }

  /* ---------- time of day palette ---------- */
  // keyframes: [hour, skyTop, skyBottom, daylight, lampOn]
  const DAYKEYS = [
    [0,    '#10162b', '#1d2542', 0.00, 1.0],
    [4.5,  '#10162b', '#1d2542', 0.00, 1.0],
    [6.5,  '#c97f5e', '#e8b87a', 0.50, 0.5],
    [9,    '#8fc7e0', '#dcefe8', 1.00, 0.0],
    [16.5, '#8fc7e0', '#dcefe8', 1.00, 0.0],
    [18.5, '#d98a56', '#e8b87a', 0.55, 0.45],
    [20.5, '#2a3555', '#3a4670', 0.12, 0.9],
    [22,   '#10162b', '#1d2542', 0.00, 1.0],
    [24,   '#10162b', '#1d2542', 0.00, 1.0]
  ];

  SCENE.dayPalette = function (hour) {
    let a = DAYKEYS[0], b = DAYKEYS[DAYKEYS.length - 1];
    for (let i = 0; i < DAYKEYS.length - 1; i++) {
      if (hour >= DAYKEYS[i][0] && hour <= DAYKEYS[i + 1][0]) { a = DAYKEYS[i]; b = DAYKEYS[i + 1]; break; }
    }
    const t = b[0] === a[0] ? 0 : (hour - a[0]) / (b[0] - a[0]);
    return {
      skyTop: lerpHex(a[1], b[1], t),
      skyBot: lerpHex(a[2], b[2], t),
      daylight: lerp(a[3], b[3], t),
      lamp: lerp(a[4], b[4], t)
    };
  };

  /* ---------- tiny 3x5 chalk font ---------- */
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', K: '101110100110101', L: '100100100100100', M: '101111101101101',
    N: '110101101101101', O: '010101101101010', R: '110101110110101', S: '011100010001110',
    T: '111010010010010', U: '101101101101011', Y: '101101010010010', É: '111100110100111',
    ' ': '000000000000000'
  };
  SCENE.tinyText = function (g, x, y, str, c) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const bits = FONT[ch] || FONT[' '];
      if (ch === 'É') px(g, cx + 1, y - 2, 1, 1, c);
      for (let i = 0; i < 15; i++) {
        if (bits[i] === '1') px(g, cx + (i % 3), y + ((i / 3) | 0), 1, 1, c);
      }
      cx += 4;
    }
    return cx - x;
  };

  /* ================= BACKGROUND ================= */

  SCENE.drawScene = function (g, world) {
    const t = world.t;
    const pal = world.pal;

    // wall + wainscot + floor
    px(g, 0, 0, W, 80, '#e3cfa7');
    px(g, 0, 80, W, 30, '#6e4a33');
    for (let i = 0; i < W; i += 24) px(g, i, 82, 1, 26, '#5f402c');
    px(g, 0, 108, W, 2, '#4a3222');
    px(g, 0, L.wallY, W, H - L.wallY, '#9c6b43');
    for (let y = L.wallY + 14; y < H; y += 16) px(g, 0, y, W, 1, '#7d5334');
    for (let y = L.wallY + 14, r = 0; y < H; y += 16, r++) {
      for (let x = (r % 2) * 20; x < W; x += 56) px(g, x, y - 8, 1, 7, 'rgba(125,83,52,0.55)');
    }

    // rugs
    ell(g, 180, 222, 80, 27, '#a34d3b');
    ell(g, 180, 222, 70, 22, '#b25c46');
    ell(g, 180, 222, 56, 16, '#a34d3b');
    ell(g, 193, 149, 27, 9, '#8f5a3a');
    ell(g, 193, 149, 21, 6, '#a0693f');

    drawWindow(g, world);
    drawDoor(g, world);
    drawFireplace(g, world);
    drawMenuBoard(g);
    drawShelves(g);
    drawHangingLamp(g, L.lamp1.x, world);
    drawHangingLamp(g, L.lamp2.x, world);
    drawWallFrame(g, 50, 40);
    drawMachine(g, world);
    drawFirewood(g);
  };

  /* ---------- window with the world outside ---------- */
  function drawWindow(g, world) {
    const w = L.win, pal = world.pal, t = world.t;
    // outside: sky
    px(g, w.x, w.y, w.w, w.h * 0.55, pal.skyTop);
    px(g, w.x, w.y + w.h * 0.55, w.w, w.h * 0.45, pal.skyBot);
    // stars & moon at night
    const nightA = Math.max(0, 1 - pal.daylight * 3);
    if (nightA > 0.05) {
      g.globalAlpha = nightA;
      const stars = [[70, 30], [88, 26], [104, 34], [121, 29], [138, 37], [79, 44], [131, 47], [98, 41]];
      for (let i = 0; i < stars.length; i++) {
        g.globalAlpha = nightA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i * 1.8)));
        px(g, stars[i][0], stars[i][1], 1, 1, '#e8ecf5');
      }
      g.globalAlpha = nightA;
      ell(g, 132, 34, 5, 5, '#e8e4d0');
      ell(g, 130, 33, 4, 4, pal.skyTop);
      g.globalAlpha = 1;
    }
    // town silhouette with lit windows
    g.fillStyle = '#2b3242';
    g.fillRect(w.x, w.y + 42, 20, 22);
    g.fillRect(w.x + 24, w.y + 34, 16, 30);
    g.fillRect(w.x + 44, w.y + 46, 22, 18);
    g.fillRect(w.x + 70, w.y + 38, 18, 26);
    px(g, w.x + 27, w.y + 30, 3, 4, '#2b3242'); // chimney
    const lit = pal.lamp;
    if (lit > 0.05) {
      g.globalAlpha = lit;
      [[5, 48], [12, 52], [28, 40], [33, 46], [50, 50], [74, 44], [80, 52]].forEach(function (p) {
        px(g, w.x + p[0], w.y + p[1], 2, 2, '#f5c66a');
      });
      g.globalAlpha = 1;
    }
    // rain streaks
    if (world.rain > 0.02) {
      g.globalAlpha = 0.28 * Math.min(1, world.rain * 1.6);
      g.fillStyle = '#cfe0ec';
      const n = Math.floor(6 + world.rain * 22);
      for (let i = 0; i < n; i++) {
        const rx = w.x + ((i * 37 + 13) % w.w);
        const ry = w.y + ((t * 85 + i * 61) % w.h);
        g.fillRect(rx, ry, 1, 4);
      }
      g.globalAlpha = 1;
    }
    // frame + mullions
    g.fillStyle = '#5a3d28';
    g.fillRect(w.x - 5, w.y - 5, w.w + 10, 5);
    g.fillRect(w.x - 5, w.y + w.h, w.w + 10, 4);
    g.fillRect(w.x - 5, w.y, 5, w.h);
    g.fillRect(w.x + w.w, w.y, 5, w.h);
    px(g, w.x + w.w / 2 - 1, w.y, 3, w.h, '#5a3d28');
    px(g, w.x, w.y + w.h / 2 - 1, w.w, 3, '#5a3d28');
    // sill + plants
    px(g, w.x - 8, w.y + w.h + 4, w.w + 16, 5, '#6e4a33');
    drawTinyPlant(g, w.x + 8, w.y + w.h + 4);
    drawTinyPlant(g, w.x + w.w - 14, w.y + w.h + 4);
  }

  function drawTinyPlant(g, x, y) {
    px(g, x, y - 4, 6, 4, '#b5654a');
    px(g, x + 1, y - 5, 4, 1, '#8f4a35');
    px(g, x + 1, y - 8, 1, 3, '#4a7a4a');
    px(g, x + 3, y - 9, 1, 4, '#5a8a52');
    px(g, x + 4, y - 7, 1, 2, '#4a7a4a');
    px(g, x + 2, y - 7, 2, 2, '#5a8a52');
  }

  /* ---------- door with jingling bell ---------- */
  function drawDoor(g, world) {
    const d = L.door;
    // frame
    g.fillStyle = '#4a3020';
    g.fillRect(d.x - 3, d.y - 3, d.w + 6, 3);
    g.fillRect(d.x - 3, d.y, 3, d.h + 3);
    g.fillRect(d.x + d.w, d.y, 3, d.h + 3);
    // dark opening behind
    px(g, d.x, d.y, d.w, d.h, '#15100b');
    // the door leaf, sliding as it "swings"
    const open = world.door.open;
    const lw = Math.round(d.w * (1 - open * 0.82));
    if (lw > 2) {
      px(g, d.x, d.y, lw, d.h, '#6b4a30');
      for (let i = 6; i < lw - 2; i += 8) px(g, d.x + i, d.y + 2, 1, d.h - 4, '#5a3d26');
      // little window in the door showing the sky
      if (lw > 22) {
        px(g, d.x + 5, d.y + 8, 20, 20, world.pal.skyBot);
        px(g, d.x + 14, d.y + 8, 2, 20, '#4a3020');
        px(g, d.x + 5, d.y + 17, 20, 2, '#4a3020');
        g.strokeStyle = '#4a3020'; g.lineWidth = 2;
        g.strokeRect(d.x + 5, d.y + 8, 20, 20);
      }
      if (lw > 8) px(g, d.x + lw - 5, d.y + 44, 2, 5, '#d9a33c'); // handle
    }
    // bell above the door
    const jig = world.door.jiggle > 0 ? Math.round(Math.sin(world.door.jiggle * 22) * 1.5) : 0;
    px(g, L.bell.x + jig, L.bell.y, 5, 4, '#d9a33c');
    px(g, L.bell.x + 1 + jig, L.bell.y - 1, 3, 1, '#b5832a');
    px(g, L.bell.x + 2 + jig, L.bell.y + 4, 1, 1, '#8a611e');
  }

  /* ---------- fireplace ---------- */
  function drawFireplace(g, world) {
    const f = L.fire, t = world.t;
    // chimney breast
    px(g, f.x, 28, f.w, 82, '#7d4437');
    for (let y = 32; y < 108; y += 8) {
      for (let x = f.x + ((y / 8) % 2 ? 0 : 6); x < f.x + f.w; x += 12) {
        px(g, x, y, 1, 1, '#5f3229');
      }
      px(g, f.x, y, f.w, 1, 'rgba(95,50,41,0.5)');
    }
    // mantel
    px(g, f.x - 5, 54, f.w + 10, 6, '#5a3d28');
    px(g, f.x - 5, 54, f.w + 10, 2, '#7a5238');
    // firebox
    px(g, f.boxX, f.boxTop, f.boxW, f.boxBot - f.boxTop, '#17100d');
    px(g, f.boxX - 2, f.boxTop - 2, f.boxW + 4, 2, '#4a2a22');
    px(g, f.boxX - 2, f.boxTop, 2, f.boxBot - f.boxTop, '#4a2a22');
    px(g, f.boxX + f.boxW, f.boxTop, 2, f.boxBot - f.boxTop, '#4a2a22');
    // logs
    px(g, f.boxX + 3, f.boxBot - 7, 22, 4, '#5a3520');
    px(g, f.boxX + 6, f.boxBot - 10, 16, 3, '#6b4429');
    px(g, f.boxX + 2, f.boxBot - 6, 2, 3, '#8a6142');
    // flames
    for (let i = 0; i < 6; i++) {
      const fx = f.boxX + 2 + i * 4.2;
      const h = 9 + 5 * Math.sin(t * 6.2 + i * 1.9) + 2.5 * Math.sin(t * 13 + i * 5.1);
      const hh = Math.max(3, Math.round(h));
      px(g, fx, f.boxBot - 9 - hh, 5, hh, '#e06a1e');
      px(g, fx + 1, f.boxBot - 9 - Math.round(hh * 0.62), 3, Math.round(hh * 0.62), '#f5a83c');
      px(g, fx + 2, f.boxBot - 9 - Math.round(hh * 0.3), 2, Math.round(hh * 0.3), '#f8dc8a');
    }
    // hearth stone
    px(g, f.boxX - 4, f.boxBot, f.boxW + 8, 4, '#8a8378');
    px(g, f.boxX - 4, f.boxBot, f.boxW + 8, 1, '#a39c8f');
    // mantel clock
    px(g, 171, 42, 12, 12, '#6b4a30');
    px(g, 172, 40, 10, 2, '#5a3d26');
    ell(g, 177, 48, 4, 4, '#f0e8d5');
    drawClockHands(g, 177, 48, world.hour);
    // candles
    drawCandle(g, 192, 52, world, 0);
    drawCandle(g, 199, 52, world, 1);
    // tiny plant on mantel
    drawTinyPlant(g, 206, 54);
  }

  function drawClockHands(g, cx, cy, hour) {
    const ha = ((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = ((hour * 60) % 60) / 60 * Math.PI * 2 - Math.PI / 2;
    g.strokeStyle = '#3a2a1a';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * 2, cy + Math.sin(ha) * 2);
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ma) * 3.2, cy + Math.sin(ma) * 3.2);
    g.stroke();
  }

  function drawCandle(g, x, y, world, seed) {
    px(g, x, y - 6, 3, 6, '#e8dfc9');
    const a = 0.65 + 0.35 * Math.sin(world.t * 11 + seed * 2.6);
    g.globalAlpha = a;
    px(g, x + 1, y - 9, 1, 3, '#f5b942');
    px(g, x + 1, y - 10, 1, 1, '#f8dc8a');
    g.globalAlpha = 1;
  }

  function drawFirewood(g) {
    px(g, 220, 96, 16, 14, '#7a5a3a');
    px(g, 221, 95, 14, 2, '#5f462d');
    ell(g, 225, 98, 2, 2, '#8a6142'); ell(g, 230, 97, 2, 2, '#6b4429');
    ell(g, 227, 101, 2, 2, '#6b4429'); ell(g, 232, 101, 2, 2, '#8a6142');
  }

  /* ---------- menu board, shelves, lamps ---------- */
  function drawMenuBoard(g) {
    px(g, 226, 28, 72, 44, '#5a3d28');
    px(g, 229, 31, 66, 38, '#2c3038');
    SCENE.tinyText(g, 242, 34, 'CAFÉ HYGGE', '#e8dfc9');
    // chalk menu lines
    g.fillStyle = 'rgba(220,214,196,0.75)';
    g.fillRect(233, 44, 22, 1); g.fillRect(284, 44, 6, 1);
    g.fillRect(233, 50, 27, 1); g.fillRect(284, 50, 6, 1);
    g.fillRect(233, 56, 18, 1); g.fillRect(284, 56, 6, 1);
    // chalk coffee cup doodle
    g.strokeStyle = 'rgba(220,214,196,0.8)';
    g.lineWidth = 1;
    g.strokeRect(237.5, 61.5, 7, 5);
    g.beginPath(); g.arc(246, 64, 2, -Math.PI / 2, Math.PI / 2); g.stroke();
    px(g, 239, 59, 1, 1, 'rgba(220,214,196,0.6)');
    px(g, 241, 58, 1, 1, 'rgba(220,214,196,0.6)');
  }

  function drawShelves(g) {
    // shelf boards
    px(g, 318, 34, 146, 4, '#7d5334');
    px(g, 318, 56, 146, 4, '#7d5334');
    px(g, 322, 38, 2, 3, '#5f402c'); px(g, 458, 38, 2, 3, '#5f402c');
    px(g, 322, 60, 2, 3, '#5f402c'); px(g, 458, 60, 2, 3, '#5f402c');
    // shelf 1: cups, jar, books, plant
    const cupCols = ['#d9d2c0', '#a94f3f', '#4a7a5a', '#d9a05a', '#7a89a5'];
    for (let i = 0; i < 5; i++) {
      px(g, 324 + i * 9, 28, 5, 6, cupCols[i]);
      px(g, 329 + i * 9, 30, 1, 2, cupCols[i]);
    }
    px(g, 376, 24, 7, 10, '#d9973f'); px(g, 377, 22, 5, 2, '#8a611e');
    px(g, 392, 24, 3, 10, '#8a4a3a'); px(g, 396, 26, 3, 8, '#4a5a7a'); px(g, 400, 25, 3, 9, '#c9a04a');
    px(g, 404, 26, 4, 8, '#6b7a55');
    drawTinyPlant(g, 444, 34);
    // shelf 2: teapot, plates, jars, mugs
    px(g, 324, 49, 11, 7, '#e8e0d0'); px(g, 335, 51, 3, 2, '#e8e0d0'); px(g, 328, 47, 3, 2, '#e8e0d0');
    px(g, 346, 52, 9, 4, '#c9c2b0'); px(g, 347, 50, 7, 1, '#b5aa92'); px(g, 347, 54, 7, 1, '#b5aa92');
    px(g, 362, 48, 6, 8, '#d9973f'); px(g, 363, 46, 4, 2, '#8a611e');
    px(g, 372, 50, 6, 6, '#a5763f'); px(g, 373, 48, 4, 2, '#6e4a26');
    const mugs2 = ['#a94f3f', '#d9d2c0', '#4a7a5a'];
    for (let i = 0; i < 3; i++) px(g, 388 + i * 8, 50, 5, 6, mugs2[i]);
    px(g, 416, 47, 10, 9, '#5a4a68'); px(g, 418, 49, 6, 5, '#d9cfc0');
  }

  function drawHangingLamp(g, x, world) {
    px(g, x, 0, 1, 16, '#3a2a1c');
    px(g, x - 7, 16, 15, 3, '#c9803c');
    px(g, x - 5, 19, 11, 4, '#b5702e');
    px(g, x - 7, 22, 15, 2, '#9c5f24');
    const on = world.pal.lamp;
    if (on > 0.03) {
      g.globalAlpha = 0.4 + on * 0.6;
      px(g, x - 2, 24, 5, 3, '#ffd98a');
      g.globalAlpha = 1;
    } else {
      px(g, x - 1, 24, 3, 2, '#d9cfb5');
    }
  }

  function drawWallFrame(g, x, y) {
    px(g, x, y, 12, 15, '#8a6142');
    px(g, x + 1, y + 1, 10, 13, '#3d4a5c');
    px(g, x + 3, y + 8, 6, 4, '#5a7a8a');
    px(g, x + 4, y + 3, 4, 3, '#e8dfc9');
  }

  /* ---------- espresso machine (behind the counter) ---------- */
  function drawMachine(g, world) {
    const m = L.machine;
    px(g, m.x, m.y, m.w, 26, '#b8bfc7');
    px(g, m.x, m.y, m.w, 6, '#3c414d');
    px(g, m.x + 2, m.y + 2, m.w - 4, 1, '#5a616e');
    // group heads + portafilters
    px(g, m.x + 7, m.y + 17, 7, 5, '#3c414d');
    px(g, m.x + 21, m.y + 17, 7, 5, '#3c414d');
    px(g, m.x + 9, m.y + 22, 3, 2, '#2a2e38'); px(g, m.x + 23, m.y + 22, 3, 2, '#2a2e38');
    // gauge + lights
    ell(g, m.x + 17, m.y + 10, 2.5, 2.5, '#e8e0d0');
    px(g, m.x + 17, m.y + 9, 1, 2, '#a94f3f');
    // steam wand
    px(g, m.x + m.w - 3, m.y + 14, 2, 2, '#8a919c');
    px(g, m.x + m.w - 1, m.y + 16, 2, 6, '#8a919c');
    const brew = world.brew;
    if (brew && brew.active) {
      px(g, m.x + 3, m.y + 3, 2, 2, (world.t * 3 | 0) % 2 ? '#f5b942' : '#8a611e');
      if (brew.stage === 'pull') {
        px(g, m.x + 9, m.y + 19, 6, 6, '#e8e0d0');          // cup under the spout
        px(g, m.x + 11, m.y + 15, 1, 4, '#6b4429');          // coffee stream
      }
    } else {
      px(g, m.x + 3, m.y + 3, 2, 2, '#4a5160');
    }
  }

  /* ================= FURNITURE (depth-sorted) ================= */

  SCENE.furnitureDrawables = function (world) {
    const out = [];
    const C = L.counter;

    // tables + their stools
    world.tables.forEach(function (tb, i) {
      const cx = tb.x, cy = tb.y;
      [-1, 1].forEach(function (side) {
        const sx = cx + side * L.stoolDX, sy = cy + L.stoolDY;
        out.push({ y: sy + 2, draw: function (g) {
          px(g, sx - 4, sy, 2, 7, '#4a3222'); px(g, sx + 2, sy, 2, 7, '#4a3222');
          ell(g, sx, sy, 6, 3, '#7d5334');
          ell(g, sx, sy - 1, 6, 3, '#94684a');
        } });
      });
      out.push({ y: cy + 16, draw: function (g) {
        px(g, cx - 2, cy + 2, 4, 11, '#5a3d28');
        px(g, cx - 6, cy + 12, 12, 3, '#4a3222');
        ell(g, cx, cy + 1, 17, 7, '#6e4c30');
        ell(g, cx, cy, 17, 7, '#8a6142');
        ell(g, cx, cy - 1, 14, 5, '#96704c');
        // items left on the table
        tb.items.forEach(function (it) { if (!it.hidden) drawTableItem(g, cx, cy, it); });
        // small candle jar on each table
        px(g, cx - 1, cy - 4, 3, 3, '#c9b28a');
        if (world.pal.lamp > 0.2) {
          g.globalAlpha = 0.5 + 0.5 * Math.sin(world.t * 9 + i * 2);
          px(g, cx, cy - 5, 1, 1, '#f8dc8a');
          g.globalAlpha = 1;
        }
      } });
    });

    // armchair (split so a sitter nestles into it)
    const A = L.armchair;
    out.push({ y: A.y - 2, draw: function (g) {
      px(g, A.x - 10, A.y - 26, 7, 26, '#8a3d3d');
      px(g, A.x - 9, A.y - 27, 5, 2, '#9c4848');
      px(g, A.x - 9, A.y - 8, 21, 10, '#8a3d3d');
      px(g, A.x - 8, A.y - 9, 19, 3, '#a05252');
    } });
    out.push({ y: A.y + 6, draw: function (g) {
      px(g, A.x + 9, A.y - 14, 6, 16, '#8a3d3d');
      px(g, A.x + 10, A.y - 15, 4, 2, '#9c4848');
      px(g, A.x - 10, A.y + 1, 25, 4, '#7a3535');
      px(g, A.x - 9, A.y + 5, 3, 2, '#4a3222'); px(g, A.x + 11, A.y + 5, 3, 2, '#4a3222');
    } });

    // floor lamp next to the armchair
    const F = L.floorLamp;
    out.push({ y: F.y, draw: function (g) {
      px(g, F.x - 3, F.y - 2, 7, 2, '#4a3222');
      px(g, F.x, F.y - 34, 1, 32, '#4a3222');
      px(g, F.x - 5, F.y - 46, 11, 4, '#d9a05a');
      px(g, F.x - 4, F.y - 42, 9, 6, '#c98f4a');
      px(g, F.x - 5, F.y - 36, 11, 2, '#b57c38');
    } });

    // coat stand near the door
    out.push({ y: 148, draw: function (g) {
      px(g, 55, 104, 2, 44, '#5a3d28');
      px(g, 51, 106, 10, 2, '#5a3d28');
      px(g, 50, 100, 8, 5, '#6b5a3a');
      px(g, 51, 99, 6, 2, '#7d6a45');
      px(g, 59, 108, 3, 14, '#a94f3f');
      px(g, 60, 122, 2, 4, '#8f4035');
      px(g, 52, 146, 8, 2, '#4a3222');
    } });

    // potted plants
    out.push({ y: 174, draw: function (g) { drawBigPlant(g, 296, 174); } });
    out.push({ y: 184, draw: function (g) { drawBigPlant(g, 462, 184); } });

    // the counter itself
    out.push({ y: C.baseY, draw: function (g) { drawCounter(g, world); } });

    return out;
  };

  function drawBigPlant(g, x, y) {
    px(g, x - 5, y - 10, 10, 10, '#b5654a');
    px(g, x - 6, y - 11, 12, 2, '#8f4a35');
    px(g, x - 2, y - 22, 2, 12, '#4a7a4a');
    px(g, x - 6, y - 19, 3, 6, '#5a8a52');
    px(g, x + 3, y - 20, 3, 7, '#5a8a52');
    px(g, x - 4, y - 24, 3, 5, '#4a7a4a');
    px(g, x + 1, y - 26, 3, 6, '#5a8a52');
    px(g, x - 1, y - 27, 2, 4, '#6b9a5f');
  }

  function drawTableItem(g, cx, cy, it) {
    const ix = cx + it.side * 11 - 2;
    if (it.kind === 'plate') {
      ell(g, ix + 2, cy - 1, 5, 2, '#e8e0d0');
      px(g, ix, cy - 4, 5, 3, '#c98f4a');
      px(g, ix + 1, cy - 5, 3, 1, '#b57c38');
    } else {
      ell(g, ix + 2, cy, 4, 1.5, '#e8e0d0');   // saucer
      px(g, ix, cy - 5, 4, 5, it.kind === 'teacup' ? '#d9d2c0' : '#e8e0d0');
      px(g, ix + 4, cy - 4, 1, 2, '#e8e0d0');   // handle
      px(g, ix + 1, cy - 5, 2, 1, '#6b4429');   // the drink
    }
  }

  function drawCounter(g, world) {
    const C = L.counter;
    // front planks
    px(g, C.x, C.frontY, C.w, C.baseY - C.frontY, '#6b4529');
    for (let x = C.x + 10; x < C.x + C.w; x += 14) px(g, x, C.frontY + 2, 1, C.baseY - C.frontY - 4, '#57371f');
    px(g, C.x, C.baseY - 2, C.w, 2, '#4a2f1c');
    // top slab
    px(g, C.x - 4, C.slabY, C.w + 4, C.frontY - C.slabY, '#a8764a');
    px(g, C.x - 4, C.slabY, C.w + 4, 2, '#c08a58');
    px(g, C.x - 4, C.frontY - 2, C.w + 4, 2, '#7d5334');
    // register
    px(g, 372, 100, 16, 14, '#3c414d');
    px(g, 373, 98, 14, 3, '#2a2e38');
    px(g, 375, 103, 10, 4, '#8a919c');
    // tip jar
    px(g, 394, 106, 6, 8, 'rgba(200,220,230,0.7)');
    px(g, 395, 111, 4, 2, '#d9a33c');
    px(g, 394, 105, 6, 1, '#8a919c');
    // pastry case
    px(g, 408, 88, 40, 26, 'rgba(210,225,235,0.35)');
    g.strokeStyle = '#8a919c'; g.lineWidth = 1;
    g.strokeRect(408.5, 88.5, 39, 25);
    px(g, 408, 100, 40, 1, '#8a919c');
    // pastries inside
    px(g, 412, 95, 7, 4, '#d9a05a'); px(g, 413, 94, 5, 1, '#c08a48');
    px(g, 423, 95, 6, 4, '#c98f4a'); px(g, 431, 96, 7, 3, '#e0b06a');
    px(g, 412, 107, 7, 5, '#b5654a'); px(g, 421, 108, 6, 4, '#d9738a');
    px(g, 430, 107, 7, 5, '#c98f4a'); px(g, 431, 106, 5, 1, '#8a5a2a');
    // flowers in a vase
    px(g, 456, 102, 5, 12, '#7a89a5');
    px(g, 457, 96, 1, 6, '#4a7a4a'); px(g, 459, 97, 1, 5, '#4a7a4a');
    px(g, 456, 94, 3, 3, '#d9738a'); px(g, 458, 92, 3, 3, '#e8b04a');
    // orders waiting at the pass
    world.counterCups.forEach(function (c) {
      if (c.kind === 'plate') {
        ell(g, c.x + 2, c.y + 4, 5, 2, '#e8e0d0');
        px(g, c.x, c.y, 5, 3, '#c98f4a');
        px(g, c.x + 1, c.y - 1, 3, 1, '#b57c38');
      } else {
        ell(g, c.x + 2, c.y + 5, 4, 1.5, '#d9d2c0');
        px(g, c.x, c.y, 5, 5, '#e8e0d0');
        px(g, c.x + 5, c.y + 1, 1, 2, '#e8e0d0');
        px(g, c.x + 1, c.y, 3, 1, '#6b4429');
      }
    });
  }

  /* ================= PEOPLE ================= */

  SCENE.drawPerson = function (g, p) {
    const facing = p.facing >= 0 ? 1 : -1;
    const walk = p.pose === 'walk';
    const cycle = walk ? (Math.floor(p.animT * 6) % 2) : 0;
    const y = p.y - (walk && cycle ? 1 : 0);
    const x = Math.round(p.x);
    const c = p.colors;

    ell(g, x, p.y + 1, 6, 2, 'rgba(20,12,8,0.25)');

    if (p.pose === 'sit') {
      // bent legs
      px(g, x - 3, y - 4, 6, 4, c.pants);
      px(g, x + facing * 2 - (facing > 0 ? 0 : 2), y - 4, 3, 4, c.pants);
      px(g, x - 3, y - 1, 7, 1, '#3a2a1c');
      // torso
      px(g, x - 4, y - 13, 8, 9, c.top);
      if (c.scarf) px(g, x - 4, y - 13, 8, 2, c.scarf);
      // head
      px(g, x - 3, y - 19, 7, 6, c.skin);
      px(g, x - 3, y - 20, 7, 2, c.hair);
      px(g, x + (facing > 0 ? -3 : 2), y - 19, 2, 3, c.hair);
      if (c.longHair) px(g, x + (facing > 0 ? -4 : 3), y - 18, 2, 6, c.hair);
      px(g, x + (facing > 0 ? 2 : -3), y - 17, 1, 1, '#2a1a12');
      // arms + what they hold
      if (p.reading) {
        px(g, x + facing * 1 - 1, y - 9, 2, 3, c.top);
        const bx = x + facing * 4 - 3;
        px(g, bx, y - 11, 7, 4, '#f5efdf');
        px(g, bx + 3, y - 11, 1, 4, '#b5a888');
        px(g, bx, y - 12, 7, 1, '#c9b28a');
      } else if (p.holding === 'cup') {
        const up = p.armUp || 0;
        const hy = y - 10 - up * 7;
        const hx = x + facing * (5 - up * 2);
        px(g, x + facing * 2, y - 12, 2, 4 - up * 1, c.top);
        px(g, hx - 1, hy, 4, 4, '#e8e0d0');
        px(g, hx + (facing > 0 ? 3 : -2), hy + 1, 1, 2, '#e8e0d0');
      } else {
        px(g, x + facing * 3 - (facing > 0 ? 0 : 1), y - 12, 2, 5, c.top);
      }
      return;
    }

    // standing / walking legs
    if (walk) {
      const s = cycle ? 1 : -1;
      px(g, x - 4 + s, y - 6, 3, 6, c.pants);
      px(g, x + 1 - s, y - 6, 3, 6, c.pants);
      px(g, x - 4 + s, y - 1, 3, 1, '#3a2a1c');
      px(g, x + 1 - s, y - 1, 3, 1, '#3a2a1c');
    } else {
      px(g, x - 4, y - 6, 3, 6, c.pants);
      px(g, x + 1, y - 6, 3, 6, c.pants);
      px(g, x - 4, y - 1, 6 + 1, 1, '#3a2a1c');
    }
    // torso
    px(g, x - 4, y - 15, 8, 9, c.top);
    if (c.scarf) px(g, x - 4, y - 15, 8, 2, c.scarf);
    if (c.apron) {
      px(g, x - 3, y - 12, 6, 6, '#e8dfc9');
      px(g, x - 1, y - 14, 2, 2, '#e8dfc9');
    }
    // head
    px(g, x - 3, y - 21, 7, 6, c.skin);
    px(g, x - 3, y - 22, 7, 2, c.hair);
    px(g, x + (facing > 0 ? -3 : 2), y - 21, 2, 3, c.hair);
    if (c.longHair) px(g, x + (facing > 0 ? -4 : 3), y - 20, 2, 7, c.hair);
    px(g, x + (facing > 0 ? 2 : -3), y - 19, 1, 1, '#2a1a12');
    // arm + held item
    const held = p.holding;
    if (held === 'cup' || held === 'plate' || held === 'cloth') {
      px(g, x + facing * 3 - (facing > 0 ? 0 : 1), y - 13, 2, 4, c.top);
      const hx = x + facing * 5 - (facing > 0 ? 0 : 3);
      if (held === 'cup') {
        px(g, hx, y - 12, 4, 4, '#e8e0d0');
        px(g, hx + (facing > 0 ? 4 : -1), y - 11, 1, 2, '#e8e0d0');
      } else if (held === 'plate') {
        px(g, hx - 1, y - 10, 6, 2, '#e8e0d0');
        px(g, hx, y - 12, 4, 2, '#c98f4a');
      } else {
        px(g, hx, y - 10, 4, 3, '#7a89a5');
      }
    } else {
      px(g, x + facing * 3 - (facing > 0 ? 0 : 1), y - 13, 2, 6, c.top);
    }
  };

  /* ---------- the cat ---------- */
  SCENE.drawCat = function (g, cat) {
    const x = Math.round(cat.x), y = Math.round(cat.y);
    const t = cat.animT;
    const f = cat.facing >= 0 ? 1 : -1;
    const body = '#d98d4a', dark = '#b5702e', cream = '#f0e0c8';
    ell(g, x, y + 1, 6, 2, 'rgba(20,12,8,0.2)');

    if (cat.state === 'sleep') {
      const breathe = Math.sin(t * 1.7) > 0 ? 1 : 0;
      px(g, x - 5, y - 4 - breathe, 10, 4 + breathe, body);
      px(g, x - 5, y - 2, 10, 2, dark);
      px(g, x + 1, y - 6, 4, 3, body);
      px(g, x + 1, y - 7, 1, 1, dark); px(g, x + 4, y - 7, 1, 1, dark);
      px(g, x - 6, y - 3, 2, 3, dark); // tail tucked round
      px(g, x - 3, y - 4, 1, 2, dark); px(g, x, y - 4, 1, 2, dark);
    } else if (cat.state === 'sit' || cat.state === 'groom') {
      px(g, x - 3, y - 7, 6, 7, body);
      px(g, x - 2, y - 2, 4, 2, cream);
      const hy = cat.state === 'groom' ? y - 8 : y - 11;
      const hx = cat.state === 'groom' ? x + f : x;
      px(g, hx - 2, hy, 6, 4, body);
      px(g, hx - 2, hy - 1, 2, 1, dark); px(g, hx + 2, hy - 1, 2, 1, dark);
      if (cat.state === 'sit') {
        px(g, hx + (f > 0 ? 2 : -2), hy + 1, 1, 1, '#3a5a2a');
      }
      const sway = Math.round(Math.sin(t * 2.2) * 1.5);
      px(g, x - f * 5 + sway, y - 3, 2, 1, dark);
      px(g, x - f * 4 + sway, y - 2, 2, 2, dark);
      px(g, x - 3, y - 5, 1, 1, dark); px(g, x + 1, y - 6, 1, 1, dark);
    } else if (cat.state === 'stretch') {
      px(g, x - 5, y - 3, 5, 3, body);
      px(g, x, y - 5, 5, 5, body);
      px(g, x + 3, y - 8, 4, 4, body);
      px(g, x + 3, y - 9, 1, 1, dark); px(g, x + 6, y - 9, 1, 1, dark);
      px(g, x - 6, y - 6, 2, 4, dark);
    } else { // walk / loaf
      const step = cat.state === 'walk' ? (Math.floor(t * 8) % 2) : 0;
      px(g, x - 5, y - 5, 10, 4, body);
      px(g, x - 4, y - 2, 3, 1, dark); px(g, x + 2, y - 2, 3, 1, dark);
      if (cat.state === 'walk') {
        px(g, x - 4 + step, y - 1, 1, 2, body); px(g, x + 3 - step, y - 1, 1, 2, body);
        px(g, x - 1 - step, y - 1, 1, 2, dark); px(g, x + 1 + step, y - 1, 1, 2, dark);
      }
      px(g, x + f * 4 - (f > 0 ? 0 : 3), y - 8, 4, 4, body);
      px(g, x + f * 4 - (f > 0 ? 0 : 3), y - 9, 1, 1, dark);
      px(g, x + f * 4 + (f > 0 ? 3 : 0), y - 9, 1, 1, dark);
      const ts = Math.round(Math.sin(t * 5) * 1.5);
      px(g, x - f * 6, y - 8 + ts, 2, 4, dark);
      px(g, x - 2, y - 4, 1, 2, dark); px(g, x + 1, y - 5, 1, 2, dark);
    }
  };

  /* ---------- speech bubbles ---------- */
  SCENE.drawBubble = function (g, x, y, icon) {
    const bx = Math.round(x) - 9, by = Math.round(y) - 40;
    g.fillStyle = '#c9b28a';
    g.fillRect(bx - 1, by - 1, 20, 16);
    g.fillStyle = '#fdf8ec';
    g.fillRect(bx, by, 18, 14);
    px(g, bx + 7, by + 14, 3, 2, '#fdf8ec');
    px(g, bx + 8, by + 16, 1, 1, '#fdf8ec');
    drawIcon(g, bx + 5, by + 3, icon);
  };

  function drawIcon(g, x, y, icon) {
    switch (icon) {
      case 'coffee':
        px(g, x, y + 2, 6, 5, '#a94f3f');
        px(g, x + 6, y + 3, 2, 2, '#a94f3f');
        px(g, x + 1, y + 2, 4, 1, '#6b4429');
        px(g, x + 1, y, 1, 1, '#b5aa92'); px(g, x + 3, y - 1, 1, 1, '#b5aa92');
        break;
      case 'tea':
        px(g, x, y + 3, 7, 3, '#4a7a5a');
        px(g, x + 7, y + 3, 1, 2, '#4a7a5a');
        px(g, x + 1, y + 3, 5, 1, '#8a9a4a');
        px(g, x + 2, y, 1, 2, '#5a8a52'); px(g, x + 4, y - 1, 1, 2, '#5a8a52');
        break;
      case 'cocoa':
        px(g, x, y + 1, 6, 6, '#8a5a3a');
        px(g, x + 6, y + 2, 2, 2, '#8a5a3a');
        px(g, x + 1, y + 1, 4, 1, '#f0e0c8');
        break;
      case 'bun':
        ell(g, x + 3, y + 4, 4, 3, '#c98f4a');
        px(g, x + 1, y + 2, 4, 1, '#e0b06a');
        px(g, x + 2, y + 4, 1, 1, '#8a5a2a'); px(g, x + 4, y + 3, 1, 1, '#8a5a2a');
        break;
      case 'croissant':
        px(g, x, y + 3, 2, 3, '#d9a05a');
        px(g, x + 2, y + 2, 4, 4, '#e0b06a');
        px(g, x + 6, y + 3, 2, 3, '#d9a05a');
        px(g, x + 3, y + 1, 2, 1, '#d9a05a');
        break;
      case 'dots':
        px(g, x, y + 3, 2, 2, '#8a7a63');
        px(g, x + 3, y + 3, 2, 2, '#8a7a63');
        px(g, x + 6, y + 3, 2, 2, '#8a7a63');
        break;
      case 'heart':
        px(g, x + 1, y + 1, 2, 2, '#d96a6a'); px(g, x + 5, y + 1, 2, 2, '#d96a6a');
        px(g, x, y + 2, 8, 2, '#d96a6a');
        px(g, x + 1, y + 4, 6, 1, '#d96a6a');
        px(g, x + 2, y + 5, 4, 1, '#d96a6a');
        px(g, x + 3, y + 6, 2, 1, '#d96a6a');
        break;
      case 'zzz':
        px(g, x, y, 3, 1, '#8a9ab5'); px(g, x + 1, y + 1, 1, 1, '#8a9ab5'); px(g, x, y + 2, 3, 1, '#8a9ab5');
        px(g, x + 4, y + 3, 3, 1, '#8a9ab5'); px(g, x + 5, y + 4, 1, 1, '#8a9ab5'); px(g, x + 4, y + 5, 3, 1, '#8a9ab5');
        break;
      case 'note':
        px(g, x + 4, y, 1, 5, '#7a6ab5');
        px(g, x + 5, y, 2, 1, '#7a6ab5'); px(g, x + 6, y + 1, 1, 1, '#7a6ab5');
        px(g, x + 2, y + 4, 2, 2, '#7a6ab5');
        break;
    }
  }

  /* ================= LIGHTING & ATMOSPHERE ================= */

  SCENE.drawLighting = function (g, world) {
    const pal = world.pal, t = world.t;

    // day/night colour wash
    const nightC = [112, 120, 172], dayC = [255, 250, 242];
    const d = pal.daylight;
    const tint = [
      Math.round(lerp(nightC[0], dayC[0], d)),
      Math.round(lerp(nightC[1], dayC[1], d)),
      Math.round(lerp(nightC[2], dayC[2], d))
    ];
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(' + tint.join(',') + ')';
    g.fillRect(0, 0, W, H);

    // warm pools of light
    g.globalCompositeOperation = 'lighter';
    const lampA = pal.lamp;
    glow(g, L.lamp1.x, 30, 52, 255, 176, 84, 0.05 + 0.26 * lampA);
    glow(g, L.lamp2.x, 30, 52, 255, 176, 84, 0.05 + 0.26 * lampA);
    glow(g, L.floorLamp.x, L.floorLamp.y - 44, 38, 255, 190, 100, 0.04 + 0.3 * lampA);
    // fire, always flickering
    const flick = 0.2 + 0.06 * Math.sin(t * 8.7) + 0.04 * Math.sin(t * 23.3);
    glow(g, 193, 94, 46, 255, 140, 50, flick);
    glow(g, 193, 98, 20, 255, 190, 90, flick * 0.8);
    // candles on the mantel
    glow(g, 196, 46, 10, 255, 200, 110, 0.1 + 0.06 * Math.sin(t * 11));
    // daylight spilling in the window
    if (d > 0.1) glow(g, 106, 100, 70, 255, 245, 215, 0.06 * d);

    // vignette
    g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(W / 2, H / 2 - 10, 110, W / 2, H / 2, 300);
    v.addColorStop(0, 'rgba(16,10,6,0)');
    v.addColorStop(1, 'rgba(16,10,6,0.42)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
  };

  function glow(g, x, y, r, cr, cg, cb, a) {
    if (a <= 0.005) return;
    const rad = g.createRadialGradient(x, y, 2, x, y, r);
    rad.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + a + ')');
    rad.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
    g.fillStyle = rad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* ---------- particles ---------- */
  SCENE.drawParticles = function (g, world) {
    world.particles.forEach(function (p) {
      const a = Math.max(0, 1 - p.age / p.life);
      if (p.type === 'steam') {
        g.fillStyle = 'rgba(250,248,240,' + (a * 0.4).toFixed(3) + ')';
        const s = p.age / p.life > 0.5 ? 2 : 1;
        g.fillRect(Math.round(p.x + Math.sin(p.age * 3 + p.seed) * 1.5), Math.round(p.y), s, s);
      } else if (p.type === 'spark') {
        g.fillStyle = 'rgba(255,180,70,' + (a * 0.8).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    });
  };

  /* ---------- captions ---------- */
  SCENE.drawCaption = function (g, world) {
    const c = world.activeCaption;
    if (!c) return;
    const age = world.t - c.born;
    const dur = 4.4;
    let a = 1;
    if (age < 0.4) a = age / 0.4;
    else if (age > dur - 0.8) a = Math.max(0, (dur - age) / 0.8);
    g.font = '8px monospace';
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(10,6,4,' + (a * 0.75).toFixed(3) + ')';
    g.fillText(c.text, 9, 263);
    g.fillStyle = 'rgba(240,225,195,' + (a * 0.9).toFixed(3) + ')';
    g.fillText(c.text, 8, 262);
  };
})();
