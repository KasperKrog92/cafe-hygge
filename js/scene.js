/* Café Hygge — pixel-art scene rendering (all drawn in code, no assets) */
(function () {
  'use strict';

  const SCENE = (window.SCENE = {});

  /* master canvas: 960×600 (16:10). The 16:9 presentation is a 960×540 crop
     starting at VIEW_Y — the top 36 px (upper wall) and bottom 24 px (front
     floor edge) are croppable overscan: texture only, never content. */
  const W = 960, H = 600;
  SCENE.W = W;
  SCENE.H = H;
  SCENE.VIEW_W = 960;
  SCENE.VIEW_H = 540;
  SCENE.VIEW_Y = 36;
  SCENE.VIEW_MIN_W = 936;  // horizontal overscan budget: up to 12 px may be
                           // cropped per side on near-16:10-but-taller windows

  /* ---------- layout, shared with the sim (master-canvas coordinates) ---------- */
  const L = (SCENE.L = {
    W: W, H: H,
    wallY: 256,               // where wall meets floor
    door: { x: 20, y: 92, w: 72, h: 164 },
    doorSpot: { x: 54, y: 280 },     // where people appear
    bell: { x: 96, y: 96 },
    win: { x: 124, y: 84, w: 176, h: 128 },
    fire: { x: 336, w: 96, boxX: 358, boxW: 56, boxTop: 168, boxBot: 248 },
    lane: 368,                // main walking corridor
    lamp1: { x: 318, y: 84 },
    lamp2: { x: 614, y: 84 },
    floorLamp: { x: 286, y: 368 },
    armchair: { x: 316, y: 384, seatX: 322, seatY: 384 },
    counter: { x: 624, w: 320, slabY: 260, frontY: 288, baseY: 348 },
    machine: { x: 644, y: 208, w: 72 },
    serveSpot: { x: 732, y: 272 },   // where finished cups land on the counter
    orderSpot: { x: 696, y: 372 },
    pickupSpot: { x: 732, y: 372 },
    baristaHome: { x: 680, y: 280 },
    baristaExitX: 610,               // where the barista slips out from behind the counter
    tables: [
      { x: 192, y: 420, tag: 'by the window' },
      { x: 410, y: 436, tag: 'near the fire' },
      { x: 260, y: 520, tag: '' },
      { x: 516, y: 524, tag: '' }
    ],
    stoolDX: 44, stoolDY: 8
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

  /* ---------- tiny 3x5 chalk font (each font pixel = 2×2 master px) ---------- */
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
      if (ch === 'É') px(g, cx + 2, y - 4, 2, 2, c);
      for (let i = 0; i < 15; i++) {
        if (bits[i] === '1') px(g, cx + (i % 3) * 2, y + ((i / 3) | 0) * 2, 2, 2, c);
      }
      cx += 8;
    }
    return cx - x;
  };

  /* ================= BACKGROUND ================= */

  /* Static background cache: everything wall-mounted that never changes is
     rendered once into an offscreen canvas and blitted per frame. Dynamic
     elements (window, door, lamps, flames, clock hands, candle flames,
     machine) are painted on top each frame — in the same relative order the
     one-pass renderer used, so nothing overlaps wrongly. */
  let bgCache = null;

  SCENE.invalidateBG = function () { bgCache = null; };

  SCENE.drawScene = function (g, world) {
    if (!bgCache) {
      bgCache = document.createElement('canvas');
      bgCache.width = W; bgCache.height = H;
      drawStaticBG(bgCache.getContext('2d'));
    }
    g.drawImage(bgCache, 0, 0);

    drawWindow(g, world);
    drawDoor(g, world);
    drawWallFrame(g, 100, 116); // overlaps the window frame edge → must paint after it
    drawHangingLamp(g, L.lamp1.x, world);
    drawHangingLamp(g, L.lamp2.x, world);
    drawFireDynamic(g, world);
    drawMachine(g, world);
  };

  function drawStaticBG(g) {
    // wall + wainscot + floor (wall runs to y=0: the top 36 px are overscan)
    px(g, 0, 0, W, 196, '#e3cfa7');
    // picture rail in the overscan strip
    px(g, 0, 26, W, 4, '#c9b28a');
    px(g, 0, 30, W, 2, 'rgba(90,61,40,0.25)');
    px(g, 0, 196, W, 60, '#6e4a33');
    for (let i = 0; i < W; i += 48) px(g, i, 200, 2, 52, '#5f402c');
    px(g, 0, 252, W, 4, '#4a3222');
    px(g, 0, L.wallY, W, H - L.wallY, '#9c6b43');
    for (let y = L.wallY + 28; y < H; y += 32) px(g, 0, y, W, 2, '#7d5334');
    for (let y = L.wallY + 28, r = 0; y < H; y += 32, r++) {
      for (let x = (r % 2) * 40; x < W; x += 112) px(g, x, y - 16, 2, 14, 'rgba(125,83,52,0.55)');
    }

    // rugs
    ell(g, 360, 480, 160, 54, '#a34d3b');
    ell(g, 360, 480, 140, 44, '#b25c46');
    ell(g, 360, 480, 112, 32, '#a34d3b');
    ell(g, 386, 334, 54, 18, '#8f5a3a');
    ell(g, 386, 334, 42, 12, '#a0693f');

    drawFireplaceStatic(g);
    drawMenuBoard(g);
    drawShelves(g);
    drawFirewood(g);
  }

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
      const stars = [[140, 96], [176, 88], [208, 104], [242, 94], [276, 110], [158, 124], [262, 130], [196, 118]];
      for (let i = 0; i < stars.length; i++) {
        g.globalAlpha = nightA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i * 1.8)));
        px(g, stars[i][0], stars[i][1], 2, 2, '#e8ecf5');
      }
      g.globalAlpha = nightA;
      ell(g, 264, 104, 10, 10, '#e8e4d0');
      ell(g, 260, 102, 8, 8, pal.skyTop);
      g.globalAlpha = 1;
    }
    // town silhouette with lit windows
    g.fillStyle = '#2b3242';
    g.fillRect(w.x, w.y + 84, 40, 44);
    g.fillRect(w.x + 48, w.y + 68, 32, 60);
    g.fillRect(w.x + 88, w.y + 92, 44, 36);
    g.fillRect(w.x + 140, w.y + 76, 36, 52);
    px(g, w.x + 54, w.y + 60, 6, 8, '#2b3242'); // chimney
    const lit = pal.lamp;
    if (lit > 0.05) {
      g.globalAlpha = lit;
      [[10, 96], [24, 104], [56, 80], [66, 92], [100, 100], [148, 88], [160, 104]].forEach(function (p) {
        px(g, w.x + p[0], w.y + p[1], 4, 4, '#f5c66a');
      });
      g.globalAlpha = 1;
    }
    // rain streaks
    if (world.rain > 0.02) {
      g.globalAlpha = 0.28 * Math.min(1, world.rain * 1.6);
      g.fillStyle = '#cfe0ec';
      const n = Math.floor(6 + world.rain * 22);
      for (let i = 0; i < n; i++) {
        const rx = w.x + ((i * 37 + 13) % (w.w / 2)) * 2;
        const ry = w.y + ((t * 85 + i * 61) % (w.h / 2)) * 2;
        g.fillRect(rx, ry, 2, 8);
      }
      g.globalAlpha = 1;
    }
    // frame + mullions
    g.fillStyle = '#5a3d28';
    g.fillRect(w.x - 10, w.y - 10, w.w + 20, 10);
    g.fillRect(w.x - 10, w.y + w.h, w.w + 20, 8);
    g.fillRect(w.x - 10, w.y, 10, w.h);
    g.fillRect(w.x + w.w, w.y, 10, w.h);
    px(g, w.x + w.w / 2 - 2, w.y, 6, w.h, '#5a3d28');
    px(g, w.x, w.y + w.h / 2 - 2, w.w, 6, '#5a3d28');
    // sill + plants
    px(g, w.x - 16, w.y + w.h + 8, w.w + 32, 10, '#6e4a33');
    drawTinyPlant(g, w.x + 16, w.y + w.h + 8);
    drawTinyPlant(g, w.x + w.w - 28, w.y + w.h + 8);
  }

  function drawTinyPlant(g, x, y) {
    px(g, x, y - 8, 12, 8, '#b5654a');
    px(g, x + 2, y - 10, 8, 2, '#8f4a35');
    px(g, x + 2, y - 16, 2, 6, '#4a7a4a');
    px(g, x + 6, y - 18, 2, 8, '#5a8a52');
    px(g, x + 8, y - 14, 2, 4, '#4a7a4a');
    px(g, x + 4, y - 14, 4, 4, '#5a8a52');
  }

  /* ---------- door with jingling bell ---------- */
  function drawDoor(g, world) {
    const d = L.door;
    // frame
    g.fillStyle = '#4a3020';
    g.fillRect(d.x - 6, d.y - 6, d.w + 12, 6);
    g.fillRect(d.x - 6, d.y, 6, d.h + 6);
    g.fillRect(d.x + d.w, d.y, 6, d.h + 6);
    // dark opening behind
    px(g, d.x, d.y, d.w, d.h, '#15100b');
    // the door leaf, sliding as it "swings"
    const open = world.door.open;
    const lw = Math.round(d.w * (1 - open * 0.82));
    if (lw > 4) {
      px(g, d.x, d.y, lw, d.h, '#6b4a30');
      for (let i = 12; i < lw - 4; i += 16) px(g, d.x + i, d.y + 4, 2, d.h - 8, '#5a3d26');
      // little window in the door showing the sky
      if (lw > 44) {
        px(g, d.x + 10, d.y + 16, 40, 40, world.pal.skyBot);
        px(g, d.x + 28, d.y + 16, 4, 40, '#4a3020');
        px(g, d.x + 10, d.y + 34, 40, 4, '#4a3020');
        g.strokeStyle = '#4a3020'; g.lineWidth = 4;
        g.strokeRect(d.x + 10, d.y + 16, 40, 40);
      }
      if (lw > 16) px(g, d.x + lw - 10, d.y + 88, 4, 10, '#d9a33c'); // handle
    }
    // bell above the door
    const jig = world.door.jiggle > 0 ? Math.round(Math.sin(world.door.jiggle * 22) * 3) : 0;
    px(g, L.bell.x + jig, L.bell.y, 10, 8, '#d9a33c');
    px(g, L.bell.x + 2 + jig, L.bell.y - 2, 6, 2, '#b5832a');
    px(g, L.bell.x + 4 + jig, L.bell.y + 8, 2, 2, '#8a611e');
  }

  /* ---------- fireplace ---------- */
  function drawFireplaceStatic(g) {
    const f = L.fire;
    // chimney breast
    px(g, f.x, 92, f.w, 164, '#7d4437');
    for (let row = 0, y = 100; y < 252; row++, y = 100 + row * 16) {
      for (let x = f.x + (row % 2 ? 0 : 12); x < f.x + f.w; x += 24) {
        px(g, x, y, 2, 2, '#5f3229');
      }
      px(g, f.x, y, f.w, 2, 'rgba(95,50,41,0.5)');
    }
    // mantel
    px(g, f.x - 10, 144, f.w + 20, 12, '#5a3d28');
    px(g, f.x - 10, 144, f.w + 20, 4, '#7a5238');
    // firebox
    px(g, f.boxX, f.boxTop, f.boxW, f.boxBot - f.boxTop, '#17100d');
    px(g, f.boxX - 4, f.boxTop - 4, f.boxW + 8, 4, '#4a2a22');
    px(g, f.boxX - 4, f.boxTop, 4, f.boxBot - f.boxTop, '#4a2a22');
    px(g, f.boxX + f.boxW, f.boxTop, 4, f.boxBot - f.boxTop, '#4a2a22');
    // logs
    px(g, f.boxX + 6, f.boxBot - 14, 44, 8, '#5a3520');
    px(g, f.boxX + 12, f.boxBot - 20, 32, 6, '#6b4429');
    px(g, f.boxX + 4, f.boxBot - 12, 4, 6, '#8a6142');
    // hearth stone
    px(g, f.boxX - 8, f.boxBot, f.boxW + 16, 8, '#8a8378');
    px(g, f.boxX - 8, f.boxBot, f.boxW + 16, 2, '#a39c8f');
    // mantel clock (body + face; the hands are dynamic)
    px(g, 342, 120, 24, 24, '#6b4a30');
    px(g, 344, 116, 20, 4, '#5a3d26');
    ell(g, 354, 132, 8, 8, '#f0e8d5');
    // candle sticks (flames are dynamic)
    px(g, 384, 128, 6, 12, '#e8dfc9');
    px(g, 398, 128, 6, 12, '#e8dfc9');
    // tiny plant on mantel
    drawTinyPlant(g, 412, 144);
  }

  function drawFireDynamic(g, world) {
    const f = L.fire, t = world.t;
    // flames
    for (let i = 0; i < 6; i++) {
      const fx = f.boxX + 4 + i * 8.4;
      const h = 18 + 10 * Math.sin(t * 6.2 + i * 1.9) + 5 * Math.sin(t * 13 + i * 5.1);
      const hh = Math.max(6, Math.round(h));
      px(g, fx, f.boxBot - 18 - hh, 10, hh, '#e06a1e');
      px(g, fx + 2, f.boxBot - 18 - Math.round(hh * 0.62), 6, Math.round(hh * 0.62), '#f5a83c');
      px(g, fx + 4, f.boxBot - 18 - Math.round(hh * 0.3), 4, Math.round(hh * 0.3), '#f8dc8a');
    }
    // clock hands
    drawClockHands(g, 354, 132, world.hour);
    // candle flames
    drawCandleFlame(g, 384, 140, world, 0);
    drawCandleFlame(g, 398, 140, world, 1);
  }

  function drawClockHands(g, cx, cy, hour) {
    const ha = ((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = ((hour * 60) % 60) / 60 * Math.PI * 2 - Math.PI / 2;
    g.strokeStyle = '#3a2a1a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * 4, cy + Math.sin(ha) * 4);
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ma) * 6.4, cy + Math.sin(ma) * 6.4);
    g.stroke();
  }

  function drawCandleFlame(g, x, y, world, seed) {
    const a = 0.65 + 0.35 * Math.sin(world.t * 11 + seed * 2.6);
    g.globalAlpha = a;
    px(g, x + 2, y - 18, 2, 6, '#f5b942');
    px(g, x + 2, y - 20, 2, 2, '#f8dc8a');
    g.globalAlpha = 1;
  }

  function drawFirewood(g) {
    px(g, 440, 228, 32, 28, '#7a5a3a');
    px(g, 442, 226, 28, 4, '#5f462d');
    ell(g, 450, 232, 4, 4, '#8a6142'); ell(g, 460, 230, 4, 4, '#6b4429');
    ell(g, 454, 238, 4, 4, '#6b4429'); ell(g, 464, 238, 4, 4, '#8a6142');
  }

  /* ---------- menu board, shelves, lamps ---------- */
  function drawMenuBoard(g) {
    px(g, 452, 92, 144, 88, '#5a3d28');
    px(g, 458, 98, 132, 76, '#2c3038');
    SCENE.tinyText(g, 484, 104, 'CAFÉ HYGGE', '#e8dfc9');
    // chalk menu lines
    g.fillStyle = 'rgba(220,214,196,0.75)';
    g.fillRect(466, 124, 44, 2); g.fillRect(568, 124, 12, 2);
    g.fillRect(466, 136, 54, 2); g.fillRect(568, 136, 12, 2);
    g.fillRect(466, 148, 36, 2); g.fillRect(568, 148, 12, 2);
    // chalk coffee cup doodle
    g.strokeStyle = 'rgba(220,214,196,0.8)';
    g.lineWidth = 2;
    g.strokeRect(475, 159, 14, 10);
    g.beginPath(); g.arc(492, 164, 4, -Math.PI / 2, Math.PI / 2); g.stroke();
    px(g, 478, 154, 2, 2, 'rgba(220,214,196,0.6)');
    px(g, 482, 152, 2, 2, 'rgba(220,214,196,0.6)');
  }

  function drawShelves(g) {
    // shelf boards
    px(g, 636, 104, 292, 8, '#7d5334');
    px(g, 636, 148, 292, 8, '#7d5334');
    px(g, 644, 112, 4, 6, '#5f402c'); px(g, 916, 112, 4, 6, '#5f402c');
    px(g, 644, 156, 4, 6, '#5f402c'); px(g, 916, 156, 4, 6, '#5f402c');
    // shelf 1: cups, jar, books, plant
    const cupCols = ['#d9d2c0', '#a94f3f', '#4a7a5a', '#d9a05a', '#7a89a5'];
    for (let i = 0; i < 5; i++) {
      px(g, 648 + i * 18, 92, 10, 12, cupCols[i]);
      px(g, 658 + i * 18, 96, 2, 4, cupCols[i]);
    }
    px(g, 752, 84, 14, 20, '#d9973f'); px(g, 754, 80, 10, 4, '#8a611e');
    px(g, 784, 84, 6, 20, '#8a4a3a'); px(g, 792, 88, 6, 16, '#4a5a7a'); px(g, 800, 86, 6, 18, '#c9a04a');
    px(g, 808, 88, 8, 16, '#6b7a55');
    drawTinyPlant(g, 888, 104);
    // shelf 2: teapot, plates, jars, mugs
    px(g, 648, 134, 22, 14, '#e8e0d0'); px(g, 670, 138, 6, 4, '#e8e0d0'); px(g, 656, 130, 6, 4, '#e8e0d0');
    px(g, 692, 140, 18, 8, '#c9c2b0'); px(g, 694, 136, 14, 2, '#b5aa92'); px(g, 694, 144, 14, 2, '#b5aa92');
    px(g, 724, 132, 12, 16, '#d9973f'); px(g, 726, 128, 8, 4, '#8a611e');
    px(g, 744, 136, 12, 12, '#a5763f'); px(g, 746, 132, 8, 4, '#6e4a26');
    const mugs2 = ['#a94f3f', '#d9d2c0', '#4a7a5a'];
    for (let i = 0; i < 3; i++) px(g, 776 + i * 16, 136, 10, 12, mugs2[i]);
    px(g, 832, 130, 20, 18, '#5a4a68'); px(g, 836, 134, 12, 10, '#d9cfc0');
  }

  function drawHangingLamp(g, x, world) {
    px(g, x, 0, 2, 68, '#3a2a1c');
    px(g, x - 14, 68, 30, 6, '#c9803c');
    px(g, x - 10, 74, 22, 8, '#b5702e');
    px(g, x - 14, 80, 30, 4, '#9c5f24');
    const on = world.pal.lamp;
    if (on > 0.03) {
      g.globalAlpha = 0.4 + on * 0.6;
      px(g, x - 4, 84, 10, 6, '#ffd98a');
      g.globalAlpha = 1;
    } else {
      px(g, x - 2, 84, 6, 4, '#d9cfb5');
    }
  }

  function drawWallFrame(g, x, y) {
    px(g, x, y, 24, 30, '#8a6142');
    px(g, x + 2, y + 2, 20, 26, '#3d4a5c');
    px(g, x + 6, y + 16, 12, 8, '#5a7a8a');
    px(g, x + 8, y + 6, 8, 6, '#e8dfc9');
  }

  /* ---------- espresso machine (behind the counter) ---------- */
  function drawMachine(g, world) {
    const m = L.machine;
    px(g, m.x, m.y, m.w, 52, '#b8bfc7');
    px(g, m.x, m.y, m.w, 12, '#3c414d');
    px(g, m.x + 4, m.y + 4, m.w - 8, 2, '#5a616e');
    // group heads + portafilters
    px(g, m.x + 14, m.y + 34, 14, 10, '#3c414d');
    px(g, m.x + 42, m.y + 34, 14, 10, '#3c414d');
    px(g, m.x + 18, m.y + 44, 6, 4, '#2a2e38'); px(g, m.x + 46, m.y + 44, 6, 4, '#2a2e38');
    // gauge + lights
    ell(g, m.x + 34, m.y + 20, 5, 5, '#e8e0d0');
    px(g, m.x + 34, m.y + 18, 2, 4, '#a94f3f');
    // steam wand
    px(g, m.x + m.w - 6, m.y + 28, 4, 4, '#8a919c');
    px(g, m.x + m.w - 2, m.y + 32, 4, 12, '#8a919c');
    const brew = world.brew;
    if (brew && brew.active) {
      px(g, m.x + 6, m.y + 6, 4, 4, (world.t * 3 | 0) % 2 ? '#f5b942' : '#8a611e');
      if (brew.stage === 'pull') {
        px(g, m.x + 18, m.y + 38, 12, 12, '#e8e0d0');       // cup under the spout
        px(g, m.x + 22, m.y + 30, 2, 8, '#6b4429');          // coffee stream
      }
    } else {
      px(g, m.x + 6, m.y + 6, 4, 4, '#4a5160');
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
        out.push({ y: sy + 4, draw: function (g) {
          px(g, sx - 8, sy, 4, 14, '#4a3222'); px(g, sx + 4, sy, 4, 14, '#4a3222');
          ell(g, sx, sy, 12, 6, '#7d5334');
          ell(g, sx, sy - 2, 12, 6, '#94684a');
        } });
      });
      out.push({ y: cy + 32, draw: function (g) {
        px(g, cx - 4, cy + 4, 8, 22, '#5a3d28');
        px(g, cx - 12, cy + 24, 24, 6, '#4a3222');
        ell(g, cx, cy + 2, 34, 14, '#6e4c30');
        ell(g, cx, cy, 34, 14, '#8a6142');
        ell(g, cx, cy - 2, 28, 10, '#96704c');
        // items left on the table
        tb.items.forEach(function (it) { if (!it.hidden) drawTableItem(g, cx, cy, it); });
        // small candle jar on each table
        px(g, cx - 2, cy - 8, 6, 6, '#c9b28a');
        if (world.pal.lamp > 0.2) {
          g.globalAlpha = 0.5 + 0.5 * Math.sin(world.t * 9 + i * 2);
          px(g, cx, cy - 10, 2, 2, '#f8dc8a');
          g.globalAlpha = 1;
        }
      } });
    });

    // armchair (split so a sitter nestles into it)
    const A = L.armchair;
    out.push({ y: A.y - 4, draw: function (g) {
      px(g, A.x - 20, A.y - 52, 14, 52, '#8a3d3d');
      px(g, A.x - 18, A.y - 54, 10, 4, '#9c4848');
      px(g, A.x - 18, A.y - 16, 42, 20, '#8a3d3d');
      px(g, A.x - 16, A.y - 18, 38, 6, '#a05252');
    } });
    out.push({ y: A.y + 12, draw: function (g) {
      px(g, A.x + 18, A.y - 28, 12, 32, '#8a3d3d');
      px(g, A.x + 20, A.y - 30, 8, 4, '#9c4848');
      px(g, A.x - 20, A.y + 2, 50, 8, '#7a3535');
      px(g, A.x - 18, A.y + 10, 6, 4, '#4a3222'); px(g, A.x + 22, A.y + 10, 6, 4, '#4a3222');
    } });

    // floor lamp next to the armchair
    const F = L.floorLamp;
    out.push({ y: F.y, draw: function (g) {
      px(g, F.x - 6, F.y - 4, 14, 4, '#4a3222');
      px(g, F.x, F.y - 68, 2, 64, '#4a3222');
      px(g, F.x - 10, F.y - 92, 22, 8, '#d9a05a');
      px(g, F.x - 8, F.y - 84, 18, 12, '#c98f4a');
      px(g, F.x - 10, F.y - 72, 22, 4, '#b57c38');
    } });

    // coat stand near the door
    out.push({ y: 332, draw: function (g) {
      px(g, 110, 244, 4, 88, '#5a3d28');
      px(g, 102, 248, 20, 4, '#5a3d28');
      px(g, 100, 236, 16, 10, '#6b5a3a');
      px(g, 102, 234, 12, 4, '#7d6a45');
      px(g, 118, 252, 6, 28, '#a94f3f');
      px(g, 120, 280, 4, 8, '#8f4035');
      px(g, 104, 328, 16, 4, '#4a3222');
    } });

    // potted plants
    out.push({ y: 384, draw: function (g) { drawBigPlant(g, 592, 384); } });
    out.push({ y: 404, draw: function (g) { drawBigPlant(g, 924, 404); } });

    // the counter itself
    out.push({ y: C.baseY, draw: function (g) { drawCounter(g, world); } });

    return out;
  };

  function drawBigPlant(g, x, y) {
    px(g, x - 10, y - 20, 20, 20, '#b5654a');
    px(g, x - 12, y - 22, 24, 4, '#8f4a35');
    px(g, x - 4, y - 44, 4, 24, '#4a7a4a');
    px(g, x - 12, y - 38, 6, 12, '#5a8a52');
    px(g, x + 6, y - 40, 6, 14, '#5a8a52');
    px(g, x - 8, y - 48, 6, 10, '#4a7a4a');
    px(g, x + 2, y - 52, 6, 12, '#5a8a52');
    px(g, x - 2, y - 54, 4, 8, '#6b9a5f');
  }

  function drawTableItem(g, cx, cy, it) {
    const ix = cx + it.side * 22 - 4;
    if (it.kind === 'plate') {
      ell(g, ix + 4, cy - 2, 10, 4, '#e8e0d0');
      px(g, ix, cy - 8, 10, 6, '#c98f4a');
      px(g, ix + 2, cy - 10, 6, 2, '#b57c38');
    } else {
      ell(g, ix + 4, cy, 8, 3, '#e8e0d0');   // saucer
      px(g, ix, cy - 10, 8, 10, it.kind === 'teacup' ? '#d9d2c0' : '#e8e0d0');
      px(g, ix + 8, cy - 8, 2, 4, '#e8e0d0');   // handle
      px(g, ix + 2, cy - 10, 4, 2, '#6b4429');   // the drink
    }
  }

  function drawCounter(g, world) {
    const C = L.counter;
    // front planks
    px(g, C.x, C.frontY, C.w, C.baseY - C.frontY, '#6b4529');
    for (let x = C.x + 20; x < C.x + C.w; x += 28) px(g, x, C.frontY + 4, 2, C.baseY - C.frontY - 8, '#57371f');
    px(g, C.x, C.baseY - 4, C.w, 4, '#4a2f1c');
    // top slab
    px(g, C.x - 8, C.slabY, C.w + 8, C.frontY - C.slabY, '#a8764a');
    px(g, C.x - 8, C.slabY, C.w + 8, 4, '#c08a58');
    px(g, C.x - 8, C.frontY - 4, C.w + 8, 4, '#7d5334');
    // register
    px(g, 744, 236, 32, 28, '#3c414d');
    px(g, 746, 232, 28, 6, '#2a2e38');
    px(g, 750, 242, 20, 8, '#8a919c');
    // tip jar
    px(g, 788, 248, 12, 16, 'rgba(200,220,230,0.7)');
    px(g, 790, 258, 8, 4, '#d9a33c');
    px(g, 788, 246, 12, 2, '#8a919c');
    // pastry case
    px(g, 816, 212, 80, 52, 'rgba(210,225,235,0.35)');
    g.strokeStyle = '#8a919c'; g.lineWidth = 2;
    g.strokeRect(817, 213, 78, 50);
    px(g, 816, 236, 80, 2, '#8a919c');
    // pastries inside
    px(g, 824, 226, 14, 8, '#d9a05a'); px(g, 826, 224, 10, 2, '#c08a48');
    px(g, 846, 226, 12, 8, '#c98f4a'); px(g, 862, 228, 14, 6, '#e0b06a');
    px(g, 824, 250, 14, 10, '#b5654a'); px(g, 842, 252, 12, 8, '#d9738a');
    px(g, 860, 250, 14, 10, '#c98f4a'); px(g, 862, 248, 10, 2, '#8a5a2a');
    // flowers in a vase
    px(g, 912, 240, 10, 24, '#7a89a5');
    px(g, 914, 228, 2, 12, '#4a7a4a'); px(g, 918, 230, 2, 10, '#4a7a4a');
    px(g, 912, 224, 6, 6, '#d9738a'); px(g, 916, 220, 6, 6, '#e8b04a');
    // orders waiting at the pass
    world.counterCups.forEach(function (c) {
      if (c.kind === 'plate') {
        ell(g, c.x + 4, c.y + 8, 10, 4, '#e8e0d0');
        px(g, c.x, c.y, 10, 6, '#c98f4a');
        px(g, c.x + 2, c.y - 2, 6, 2, '#b57c38');
      } else {
        ell(g, c.x + 4, c.y + 10, 8, 3, '#d9d2c0');
        px(g, c.x, c.y, 10, 10, '#e8e0d0');
        px(g, c.x + 10, c.y + 2, 2, 4, '#e8e0d0');
        px(g, c.x + 2, c.y, 6, 2, '#6b4429');
      }
    });
  }

  /* ================= PEOPLE ================= */

  SCENE.drawPerson = function (g, p) {
    const facing = p.facing >= 0 ? 1 : -1;
    const walk = p.pose === 'walk';
    const cycle = walk ? (Math.floor(p.animT * 6) % 2) : 0;
    const y = p.y - (walk && cycle ? 2 : 0);
    const x = Math.round(p.x);
    const c = p.colors;

    ell(g, x, p.y + 2, 12, 4, 'rgba(20,12,8,0.25)');

    if (p.pose === 'sit') {
      // bent legs
      px(g, x - 6, y - 8, 12, 8, c.pants);
      px(g, x + facing * 4 - (facing > 0 ? 0 : 4), y - 8, 6, 8, c.pants);
      px(g, x - 6, y - 2, 14, 2, '#3a2a1c');
      // torso
      px(g, x - 8, y - 26, 16, 18, c.top);
      if (c.scarf) px(g, x - 8, y - 26, 16, 4, c.scarf);
      // head
      px(g, x - 6, y - 38, 14, 12, c.skin);
      px(g, x - 6, y - 40, 14, 4, c.hair);
      px(g, x + (facing > 0 ? -6 : 4), y - 38, 4, 6, c.hair);
      if (c.longHair) px(g, x + (facing > 0 ? -8 : 6), y - 36, 4, 12, c.hair);
      px(g, x + (facing > 0 ? 4 : -6), y - 34, 2, 2, '#2a1a12');
      // arms + what they hold
      if (p.reading) {
        px(g, x + facing * 2 - 2, y - 18, 4, 6, c.top);
        const bx = x + facing * 8 - 6;
        px(g, bx, y - 22, 14, 8, '#f5efdf');
        px(g, bx + 6, y - 22, 2, 8, '#b5a888');
        px(g, bx, y - 24, 14, 2, '#c9b28a');
      } else if (p.holding === 'cup') {
        const up = p.armUp || 0;
        const hy = y - 20 - up * 14;
        const hx = x + facing * (10 - up * 4);
        px(g, x + facing * 4, y - 24, 4, 8 - up * 2, c.top);
        px(g, hx - 2, hy, 8, 8, '#e8e0d0');
        px(g, hx + (facing > 0 ? 6 : -4), hy + 2, 2, 4, '#e8e0d0');
      } else {
        px(g, x + facing * 6 - (facing > 0 ? 0 : 2), y - 24, 4, 10, c.top);
      }
      return;
    }

    // standing / walking legs
    if (walk) {
      const s = cycle ? 1 : -1;
      px(g, x - 8 + s * 2, y - 12, 6, 12, c.pants);
      px(g, x + 2 - s * 2, y - 12, 6, 12, c.pants);
      px(g, x - 8 + s * 2, y - 2, 6, 2, '#3a2a1c');
      px(g, x + 2 - s * 2, y - 2, 6, 2, '#3a2a1c');
    } else {
      px(g, x - 8, y - 12, 6, 12, c.pants);
      px(g, x + 2, y - 12, 6, 12, c.pants);
      px(g, x - 8, y - 2, 14, 2, '#3a2a1c');
    }
    // torso
    px(g, x - 8, y - 30, 16, 18, c.top);
    if (c.scarf) px(g, x - 8, y - 30, 16, 4, c.scarf);
    if (c.apron) {
      px(g, x - 6, y - 24, 12, 12, '#e8dfc9');
      px(g, x - 2, y - 28, 4, 4, '#e8dfc9');
    }
    // head
    px(g, x - 6, y - 42, 14, 12, c.skin);
    px(g, x - 6, y - 44, 14, 4, c.hair);
    px(g, x + (facing > 0 ? -6 : 4), y - 42, 4, 6, c.hair);
    if (c.longHair) px(g, x + (facing > 0 ? -8 : 6), y - 40, 4, 14, c.hair);
    px(g, x + (facing > 0 ? 4 : -6), y - 38, 2, 2, '#2a1a12');
    // arm + held item
    const held = p.holding;
    if (held === 'cup' || held === 'plate' || held === 'cloth') {
      px(g, x + facing * 6 - (facing > 0 ? 0 : 2), y - 26, 4, 8, c.top);
      const hx = x + facing * 10 - (facing > 0 ? 0 : 6);
      if (held === 'cup') {
        px(g, hx, y - 24, 8, 8, '#e8e0d0');
        px(g, hx + (facing > 0 ? 8 : -2), y - 22, 2, 4, '#e8e0d0');
      } else if (held === 'plate') {
        px(g, hx - 2, y - 20, 12, 4, '#e8e0d0');
        px(g, hx, y - 24, 8, 4, '#c98f4a');
      } else {
        px(g, hx, y - 20, 8, 6, '#7a89a5');
      }
    } else {
      px(g, x + facing * 6 - (facing > 0 ? 0 : 2), y - 26, 4, 12, c.top);
    }
  };

  /* ---------- the cat ---------- */
  SCENE.drawCat = function (g, cat) {
    const x = Math.round(cat.x), y = Math.round(cat.y);
    const t = cat.animT;
    const f = cat.facing >= 0 ? 1 : -1;
    const body = '#d98d4a', dark = '#b5702e', cream = '#f0e0c8';
    ell(g, x, y + 2, 12, 4, 'rgba(20,12,8,0.2)');

    if (cat.state === 'sleep') {
      const breathe = Math.sin(t * 1.7) > 0 ? 2 : 0;
      px(g, x - 10, y - 8 - breathe, 20, 8 + breathe, body);
      px(g, x - 10, y - 4, 20, 4, dark);
      px(g, x + 2, y - 12, 8, 6, body);
      px(g, x + 2, y - 14, 2, 2, dark); px(g, x + 8, y - 14, 2, 2, dark);
      px(g, x - 12, y - 6, 4, 6, dark); // tail tucked round
      px(g, x - 6, y - 8, 2, 4, dark); px(g, x, y - 8, 2, 4, dark);
    } else if (cat.state === 'sit' || cat.state === 'groom') {
      px(g, x - 6, y - 14, 12, 14, body);
      px(g, x - 4, y - 4, 8, 4, cream);
      const hy = cat.state === 'groom' ? y - 16 : y - 22;
      const hx = cat.state === 'groom' ? x + f * 2 : x;
      px(g, hx - 4, hy, 12, 8, body);
      px(g, hx - 4, hy - 2, 4, 2, dark); px(g, hx + 4, hy - 2, 4, 2, dark);
      if (cat.state === 'sit') {
        px(g, hx + (f > 0 ? 4 : -4), hy + 2, 2, 2, '#3a5a2a');
      }
      const sway = Math.round(Math.sin(t * 2.2) * 3);
      px(g, x - f * 10 + sway, y - 6, 4, 2, dark);
      px(g, x - f * 8 + sway, y - 4, 4, 4, dark);
      px(g, x - 6, y - 10, 2, 2, dark); px(g, x + 2, y - 12, 2, 2, dark);
    } else if (cat.state === 'stretch') {
      px(g, x - 10, y - 6, 10, 6, body);
      px(g, x, y - 10, 10, 10, body);
      px(g, x + 6, y - 16, 8, 8, body);
      px(g, x + 6, y - 18, 2, 2, dark); px(g, x + 12, y - 18, 2, 2, dark);
      px(g, x - 12, y - 12, 4, 8, dark);
    } else { // walk / loaf
      const step = cat.state === 'walk' ? (Math.floor(t * 8) % 2) : 0;
      px(g, x - 10, y - 10, 20, 8, body);
      px(g, x - 8, y - 4, 6, 2, dark); px(g, x + 4, y - 4, 6, 2, dark);
      if (cat.state === 'walk') {
        px(g, x - 8 + step * 2, y - 2, 2, 4, body); px(g, x + 6 - step * 2, y - 2, 2, 4, body);
        px(g, x - 2 - step * 2, y - 2, 2, 4, dark); px(g, x + 2 + step * 2, y - 2, 2, 4, dark);
      }
      px(g, x + f * 8 - (f > 0 ? 0 : 6), y - 16, 8, 8, body);
      px(g, x + f * 8 - (f > 0 ? 0 : 6), y - 18, 2, 2, dark);
      px(g, x + f * 8 + (f > 0 ? 6 : 0), y - 18, 2, 2, dark);
      const ts = Math.round(Math.sin(t * 5) * 3);
      px(g, x - f * 12, y - 16 + ts, 4, 8, dark);
      px(g, x - 4, y - 8, 2, 4, dark); px(g, x + 2, y - 10, 2, 4, dark);
    }
  };

  /* ---------- speech bubbles ---------- */
  SCENE.drawBubble = function (g, x, y, icon) {
    const bx = Math.round(x) - 18, by = Math.round(y) - 80;
    g.fillStyle = '#c9b28a';
    g.fillRect(bx - 2, by - 2, 40, 32);
    g.fillStyle = '#fdf8ec';
    g.fillRect(bx, by, 36, 28);
    px(g, bx + 14, by + 28, 6, 4, '#fdf8ec');
    px(g, bx + 16, by + 32, 2, 2, '#fdf8ec');
    drawIcon(g, bx + 10, by + 6, icon);
  };

  function drawIcon(g, x, y, icon) {
    switch (icon) {
      case 'coffee':
        px(g, x, y + 4, 12, 10, '#a94f3f');
        px(g, x + 12, y + 6, 4, 4, '#a94f3f');
        px(g, x + 2, y + 4, 8, 2, '#6b4429');
        px(g, x + 2, y, 2, 2, '#b5aa92'); px(g, x + 6, y - 2, 2, 2, '#b5aa92');
        break;
      case 'tea':
        px(g, x, y + 6, 14, 6, '#4a7a5a');
        px(g, x + 14, y + 6, 2, 4, '#4a7a5a');
        px(g, x + 2, y + 6, 10, 2, '#8a9a4a');
        px(g, x + 4, y, 2, 4, '#5a8a52'); px(g, x + 8, y - 2, 2, 4, '#5a8a52');
        break;
      case 'cocoa':
        px(g, x, y + 2, 12, 12, '#8a5a3a');
        px(g, x + 12, y + 4, 4, 4, '#8a5a3a');
        px(g, x + 2, y + 2, 8, 2, '#f0e0c8');
        break;
      case 'bun':
        ell(g, x + 6, y + 8, 8, 6, '#c98f4a');
        px(g, x + 2, y + 4, 8, 2, '#e0b06a');
        px(g, x + 4, y + 8, 2, 2, '#8a5a2a'); px(g, x + 8, y + 6, 2, 2, '#8a5a2a');
        break;
      case 'croissant':
        px(g, x, y + 6, 4, 6, '#d9a05a');
        px(g, x + 4, y + 4, 8, 8, '#e0b06a');
        px(g, x + 12, y + 6, 4, 6, '#d9a05a');
        px(g, x + 6, y + 2, 4, 2, '#d9a05a');
        break;
      case 'dots':
        px(g, x, y + 6, 4, 4, '#8a7a63');
        px(g, x + 6, y + 6, 4, 4, '#8a7a63');
        px(g, x + 12, y + 6, 4, 4, '#8a7a63');
        break;
      case 'heart':
        px(g, x + 2, y + 2, 4, 4, '#d96a6a'); px(g, x + 10, y + 2, 4, 4, '#d96a6a');
        px(g, x, y + 4, 16, 4, '#d96a6a');
        px(g, x + 2, y + 8, 12, 2, '#d96a6a');
        px(g, x + 4, y + 10, 8, 2, '#d96a6a');
        px(g, x + 6, y + 12, 4, 2, '#d96a6a');
        break;
      case 'zzz':
        px(g, x, y, 6, 2, '#8a9ab5'); px(g, x + 2, y + 2, 2, 2, '#8a9ab5'); px(g, x, y + 4, 6, 2, '#8a9ab5');
        px(g, x + 8, y + 6, 6, 2, '#8a9ab5'); px(g, x + 10, y + 8, 2, 2, '#8a9ab5'); px(g, x + 8, y + 10, 6, 2, '#8a9ab5');
        break;
      case 'note':
        px(g, x + 8, y, 2, 10, '#7a6ab5');
        px(g, x + 10, y, 4, 2, '#7a6ab5'); px(g, x + 12, y + 2, 2, 2, '#7a6ab5');
        px(g, x + 4, y + 8, 4, 4, '#7a6ab5');
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
    glow(g, L.lamp1.x, 96, 104, 255, 176, 84, 0.05 + 0.26 * lampA);
    glow(g, L.lamp2.x, 96, 104, 255, 176, 84, 0.05 + 0.26 * lampA);
    glow(g, L.floorLamp.x, L.floorLamp.y - 88, 76, 255, 190, 100, 0.04 + 0.3 * lampA);
    // fire, always flickering
    const flick = 0.2 + 0.06 * Math.sin(t * 8.7) + 0.04 * Math.sin(t * 23.3);
    glow(g, 386, 224, 92, 255, 140, 50, flick);
    glow(g, 386, 232, 40, 255, 190, 90, flick * 0.8);
    // candles on the mantel
    glow(g, 392, 128, 20, 255, 200, 110, 0.1 + 0.06 * Math.sin(t * 11));
    // daylight spilling in the window
    if (d > 0.1) glow(g, 212, 236, 140, 255, 245, 215, 0.06 * d);

    // vignette (centred on the 16:9 crop so the framing matches both views)
    g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(W / 2, 286, 220, W / 2, 306, 600);
    v.addColorStop(0, 'rgba(16,10,6,0)');
    v.addColorStop(1, 'rgba(16,10,6,0.42)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
  };

  function glow(g, x, y, r, cr, cg, cb, a) {
    if (a <= 0.005) return;
    const rad = g.createRadialGradient(x, y, 4, x, y, r);
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
        const s = p.age / p.life > 0.5 ? 4 : 2;
        g.fillRect(Math.round(p.x + Math.sin(p.age * 3 + p.seed) * 3), Math.round(p.y), s, s);
      } else if (p.type === 'spark') {
        g.fillStyle = 'rgba(255,180,70,' + (a * 0.8).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
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
    g.font = '16px monospace';
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(10,6,4,' + (a * 0.75).toFixed(3) + ')';
    g.fillText(c.text, 18, 562);
    g.fillStyle = 'rgba(240,225,195,' + (a * 0.9).toFixed(3) + ')';
    g.fillText(c.text, 16, 560);
  };
})();
