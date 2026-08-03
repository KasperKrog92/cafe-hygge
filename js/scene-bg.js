/* Café Hygge — background and dynamic wall-layer rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const W = R.W, H = R.H, L = R.L;
  const px = R.px, ell = R.ell, h2 = R.h2;
  const drawTinyPlant = R.drawTinyPlant;

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

    drawWindow(g, world, L.win, 0);
    drawWindow(g, world, L.win2, 1);
    drawDoor(g, world);
    drawWallFrame(g, 100, 120); // sits beside the window frame edge → paints after it
    drawHangingLamp(g, L.lamp1.x, world);
    drawHangingLamp(g, L.lamp2.x, world);
    drawFireDynamic(g, world);
    drawMachine(g, world);
  };

  function drawStaticBG(g) {
    // wall + wainscot + floor (wall runs to y=0: the top 36 px are overscan)
    px(g, 0, 0, W, 176, '#e3cfa7');
    // faint plaster mottling so the big wall field isn't dead flat
    for (let i = 0; i < 90; i++) {
      const mx = (h2(i, 3) * W) | 0, my = 34 + ((h2(i, 7) * 138) | 0);
      px(g, mx, my, 6 + ((h2(i, 11) * 10) | 0), 2, 'rgba(201,178,138,0.18)');
    }
    // picture rail in the overscan strip
    px(g, 0, 26, W, 4, '#c9b28a');
    px(g, 0, 30, W, 2, 'rgba(90,61,40,0.25)');
    // wainscot: raised top rail, bevelled panels every 48 px, shadowed base
    px(g, 0, 176, W, 56, '#6e4a33');
    px(g, 0, 176, W, 4, '#7d5334');
    px(g, 0, 180, W, 2, 'rgba(30,18,10,0.3)');
    for (let x0 = 0; x0 < W; x0 += 48) {
      px(g, x0 + 8, 188, 32, 2, '#5f402c');       // recessed panel: dark top/left
      px(g, x0 + 8, 188, 2, 32, '#5f402c');
      px(g, x0 + 38, 190, 2, 30, '#7d5334');      // lit bottom/right
      px(g, x0 + 10, 218, 30, 2, '#7d5334');
    }
    px(g, 0, 224, W, 2, 'rgba(30,18,10,0.25)');
    px(g, 0, 228, W, 4, '#4a3222');
    // floorboards: seams, staggered joints, then grain streaks and the odd knot
    px(g, 0, L.wallY, W, H - L.wallY, '#9c6b43');
    for (let y = L.wallY + 28; y < H; y += 32) px(g, 0, y, W, 2, '#7d5334');
    for (let y = L.wallY + 28, r = 0; y < H; y += 32, r++) {
      for (let x = (r % 2) * 40; x < W; x += 112) px(g, x, y - 16, 2, 14, 'rgba(125,83,52,0.55)');
    }
    for (let by = L.wallY + 2; by < H; by += 32) {
      for (let x = 0; x < W; x += 16) {
        const n = h2(x, by);
        if (n < 0.18) {
          px(g, x + ((n * 50) | 0) % 8, by + 6 + ((n * 90) | 0) % 16, 10 + ((n * 160) | 0) % 14, 2, 'rgba(125,83,52,0.35)');
        } else if (n > 0.985) {
          const ky = by + 10 + ((n * 700) | 0) % 8;
          px(g, x, ky, 6, 4, '#7d5334');          // knot
          px(g, x + 2, ky + 1, 2, 2, '#5f402c');
        }
      }
    }

    // rugs (the big rug reaches up under the walking lane to break the bare stripe)
    ell(g, 390, 450, 168, 74, '#a34d3b');
    ell(g, 390, 450, 148, 62, '#b25c46');
    ell(g, 390, 450, 118, 46, '#a34d3b');
    ell(g, 388, 290, 50, 16, '#8f5a3a');
    ell(g, 388, 290, 40, 11, '#a0693f');
    // reading nook rug under the wing chairs
    ell(g, L.library.rug.x, L.library.rug.y, L.library.rug.rx, L.library.rug.ry, '#8f5a3a');
    ell(g, L.library.rug.x, L.library.rug.y, L.library.rug.rx - 14, L.library.rug.ry - 7, '#a0693f');

    drawFireplaceStatic(g);
    drawMenuBoard(g);
    drawShelves(g);
    drawFirewood(g);
  }

  /* ---------- window with the world outside ----------
     Shared by both windows; `alt` picks the stretch of town seen through the
     glass (and keeps the moon in one sky only). */
  function drawWindow(g, world, w, alt) {
    const pal = world.pal, t = world.t;
    // outside: sky
    px(g, w.x, w.y, w.w, Math.round(w.h * 0.55), pal.skyTop);
    px(g, w.x, w.y + Math.round(w.h * 0.55), w.w, Math.round(w.h * 0.45), pal.skyBot);
    // stars & moon at night
    const nightA = Math.max(0, 1 - pal.daylight * 3);
    if (nightA > 0.05) {
      const stars = alt
        ? [[14, 6], [36, 12], [58, 4], [74, 16], [98, 8], [116, 18], [28, 22], [88, 26]]
        : [[10, 8], [30, 4], [52, 12], [78, 6], [102, 14], [20, 24], [90, 26], [62, 18]];
      for (let i = 0; i < stars.length; i++) {
        g.globalAlpha = nightA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i * 1.8 + alt * 2.3)));
        px(g, w.x + stars[i][0], w.y + stars[i][1], 2, 2, '#e8ecf5');
      }
      if (!alt) {   // one moon in the sky — it hangs in the first window only
        g.globalAlpha = nightA;
        ell(g, w.x + w.w - 20, w.y + 14, 7, 7, '#e8e4d0');
        ell(g, w.x + w.w - 23, w.y + 12, 6, 6, pal.skyTop);
      }
      g.globalAlpha = 1;
    }
    // town silhouette with lit windows — each window sees its own stretch
    g.fillStyle = '#2b3242';
    if (alt) {
      g.fillRect(w.x, w.y + 52, 24, 28);
      g.fillRect(w.x + 28, w.y + 60, 26, 20);
      // church tower up the street — kept clear of the central mullion
      g.fillRect(w.x + 70, w.y + 40, 14, 40);
      g.fillRect(w.x + 74, w.y + 34, 6, 6);           // its little spire
      g.fillRect(w.x + 90, w.y + 56, 26, 24);
      g.fillRect(w.x + 120, w.y + 62, 8, 18);
      px(g, w.x + 34, w.y + 54, 4, 6, '#2b3242');     // chimney
    } else {
      g.fillRect(w.x, w.y + 56, 28, 24);
      g.fillRect(w.x + 32, w.y + 48, 22, 32);
      g.fillRect(w.x + 60, w.y + 60, 30, 20);
      g.fillRect(w.x + 96, w.y + 52, 26, 28);
      px(g, w.x + 36, w.y + 42, 4, 6, '#2b3242');     // chimney
    }
    const lit = pal.lamp;
    if (lit > 0.05) {
      g.globalAlpha = lit;
      const townLit = alt
        ? [[6, 58], [14, 66], [36, 66], [74, 50], [96, 62], [104, 68], [122, 68]]
        : [[6, 62], [16, 68], [38, 54], [46, 62], [68, 66], [102, 58], [112, 66]];
      townLit.forEach(function (p) {
        px(g, w.x + p[0], w.y + p[1], 4, 4, '#f5c66a');
      });
      g.globalAlpha = 1;
    }
    // rain streaks — 1 px at native res, mixed lengths and speeds
    if (world.rain > 0.02) {
      g.globalAlpha = 0.3 * Math.min(1, world.rain * 1.6);
      g.fillStyle = '#cfe0ec';
      const n = Math.floor(8 + world.rain * 26);
      for (let i = 0; i < n; i++) {
        const sp = 150 + (i % 5) * 26;
        const rx = w.x + ((i * 37 + 13 + alt * 53) % w.w);
        const ry = w.y + ((t * sp + i * 61 + alt * 29) % w.h);
        const ln = 8 + (i % 3) * 3;
        g.fillRect(rx, ry, 1, ln);
        if (i % 4 === 0) g.fillRect(rx - 1, ry + ln, 1, 2);   // the odd streak kinks
      }
      g.globalAlpha = 1;
    }
    // glass sits recessed: soft shadow under the top/left of the frame
    px(g, w.x, w.y, w.w, 3, 'rgba(15,10,6,0.3)');
    px(g, w.x, w.y, 3, w.h, 'rgba(15,10,6,0.22)');
    // frame + mullions with a lit top bevel for depth
    g.fillStyle = '#5a3d28';
    g.fillRect(w.x - 8, w.y - 8, w.w + 16, 8);
    g.fillRect(w.x - 8, w.y + w.h, w.w + 16, 8);
    g.fillRect(w.x - 8, w.y, 8, w.h);
    g.fillRect(w.x + w.w, w.y, 8, w.h);
    px(g, w.x - 8, w.y - 8, w.w + 16, 2, '#6e4a33');
    px(g, w.x - 8, w.y - 2, w.w + 16, 2, '#4a3020');
    px(g, w.x + w.w / 2 - 2, w.y, 4, w.h, '#5a3d28');
    px(g, w.x + w.w / 2 - 2, w.y, 2, w.h, '#6e4a33');
    px(g, w.x, w.y + w.h / 2 - 2, w.w, 4, '#5a3d28');
    px(g, w.x, w.y + w.h / 2 - 2, w.w, 2, '#6e4a33');
    // deep sill: lit top, front face, shadow underneath
    px(g, w.x - 14, w.y + w.h + 8, w.w + 28, 8, '#6e4a33');
    px(g, w.x - 14, w.y + w.h + 8, w.w + 28, 2, '#8a6142');
    px(g, w.x - 14, w.y + w.h + 16, w.w + 28, 4, '#5a3d28');
    px(g, w.x - 12, w.y + w.h + 20, w.w + 24, 2, 'rgba(20,12,8,0.25)');
    drawTinyPlant(g, w.x + 8, w.y + w.h + 8);
    drawTinyPlant(g, w.x + w.w - 20, w.y + w.h + 8);
  }

  /* ---------- door with jingling bell ----------
     Two-frame hinged swing: closed leaf, or ajar — the leaf seen edge-on at
     the hinge with a lit edge (the old shrinking-width leaf read as sliding). */
  function drawDoor(g, world) {
    const d = L.door;
    // frame
    g.fillStyle = '#4a3020';
    g.fillRect(d.x - 6, d.y - 6, d.w + 12, 6);
    g.fillRect(d.x - 6, d.y, 6, d.h + 6);
    g.fillRect(d.x + d.w, d.y, 6, d.h + 6);
    // dark opening behind
    px(g, d.x, d.y, d.w, d.h, '#15100b');
    if (world.door.open < 0.5) {
      // closed leaf
      px(g, d.x, d.y, d.w, d.h, '#6b4a30');
      for (let i = 12; i < d.w - 4; i += 14) px(g, d.x + i, d.y + 4, 2, d.h - 8, '#5a3d26');
      // little window in the door showing the sky
      px(g, d.x + 8, d.y + 12, d.w - 16, 30, world.pal.skyBot);
      px(g, d.x + d.w / 2 - 2, d.y + 12, 4, 30, '#4a3020');
      px(g, d.x + 8, d.y + 25, d.w - 16, 4, '#4a3020');
      g.strokeStyle = '#4a3020'; g.lineWidth = 3;
      g.strokeRect(d.x + 8, d.y + 12, d.w - 16, 30);
      px(g, d.x + d.w - 10, d.y + 54, 4, 9, '#d9a33c'); // handle
    } else {
      // ajar — swung inward on its hinge, edge-on, a touch taller (perspective)
      px(g, d.x, d.y, 10, d.h + 4, '#57371f');
      px(g, d.x + 10, d.y, 3, d.h + 2, '#8a6142'); // lit edge
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
    // chimney breast: real coursing — 22×14 bricks on mortar, staggered, tint-varied
    px(g, f.x, 112, f.w, 120, '#5f3229');
    const BRICKS = ['#7d4437', '#86493c', '#744033', '#8a4d3d'];
    for (let row = 0, y = 112; y < 232; row++, y = 112 + row * 16) {
      const off = (row % 2) * 12;
      for (let x = f.x - 12 + off; x < f.x + f.w; x += 24) {
        const bx = Math.max(f.x, x);
        const bw = Math.min(f.x + f.w, x + 22) - bx;
        const bh = Math.min(232, y + 14) - y;
        if (bw > 0 && bh > 0) px(g, bx, y, bw, bh, BRICKS[(h2(x, y) * BRICKS.length) | 0]);
      }
    }
    // mantel on little corbels, shadow beneath
    px(g, f.x - 10, 132, f.w + 20, 10, '#5a3d28');
    px(g, f.x - 10, 132, f.w + 20, 4, '#7a5238');
    px(g, f.x - 10, 142, f.w + 20, 2, 'rgba(20,10,6,0.35)');
    px(g, f.x - 4, 144, 8, 8, '#5a3d28');
    px(g, f.x + f.w - 4, 144, 8, 8, '#5a3d28');
    // firebox
    px(g, f.boxX, f.boxTop, f.boxW, f.boxBot - f.boxTop, '#17100d');
    px(g, f.boxX - 4, f.boxTop - 4, f.boxW + 8, 4, '#4a2a22');
    px(g, f.boxX - 4, f.boxTop, 4, f.boxBot - f.boxTop, '#4a2a22');
    px(g, f.boxX + f.boxW, f.boxTop, 4, f.boxBot - f.boxTop, '#4a2a22');
    // logs: bark ticks + end-grain rings
    px(g, f.boxX + 6, f.boxBot - 12, 36, 7, '#5a3520');
    px(g, f.boxX + 12, f.boxBot - 12, 2, 7, '#4a2c1a');
    px(g, f.boxX + 24, f.boxBot - 12, 2, 7, '#4a2c1a');
    px(g, f.boxX + 34, f.boxBot - 12, 2, 7, '#4a2c1a');
    px(g, f.boxX + 10, f.boxBot - 17, 28, 5, '#6b4429');
    px(g, f.boxX + 16, f.boxBot - 17, 2, 5, '#57371f');
    px(g, f.boxX + 28, f.boxBot - 17, 2, 5, '#57371f');
    ell(g, f.boxX + 6, f.boxBot - 9, 3, 3, '#8a6142');
    px(g, f.boxX + 5, f.boxBot - 10, 2, 2, '#5a3520');
    ell(g, f.boxX + 38, f.boxBot - 15, 3, 2, '#8a6142');
    px(g, f.boxX + 37, f.boxBot - 16, 2, 2, '#57371f');
    // hearth stone with joints
    px(g, f.boxX - 8, f.boxBot, f.boxW + 16, 6, '#8a8378');
    px(g, f.boxX - 8, f.boxBot, f.boxW + 16, 2, '#a39c8f');
    px(g, f.boxX + 8, f.boxBot + 2, 2, 4, 'rgba(60,55,48,0.4)');
    px(g, f.boxX + 24, f.boxBot + 2, 2, 4, 'rgba(60,55,48,0.4)');
    px(g, f.boxX + 40, f.boxBot + 2, 2, 4, 'rgba(60,55,48,0.4)');
    // mantel clock (body + face; the hands are dynamic)
    px(g, 346, 110, 22, 22, '#6b4a30');
    px(g, 348, 106, 18, 4, '#5a3d26');
    ell(g, 357, 121, 7, 7, '#f0e8d5');
    // candle sticks (flames are dynamic)
    px(g, 378, 122, 5, 10, '#e8dfc9');
    px(g, 392, 122, 5, 10, '#e8dfc9');
    // tiny plant on mantel
    drawTinyPlant(g, 404, 132);
  }

  function drawFireDynamic(g, world) {
    const f = L.fire, t = world.t;
    // flames in three layers over a bed of glowing coals
    for (let i = 0; i < 3; i++) {                       // back layer: broad, slow, deep
      const fx = f.boxX + 5 + i * 14;
      const h = 20 + 8 * Math.sin(t * 3.3 + i * 2.2);
      const hh = Math.max(8, Math.round(h));
      px(g, fx, f.boxBot - 13 - hh, 12, hh, '#b5481c');
    }
    for (let i = 0; i < 5; i++) {                       // mid tongues + bright core
      const fx = f.boxX + 4 + i * 8.2;
      const h = 15 + 8 * Math.sin(t * 6.2 + i * 1.9) + 4 * Math.sin(t * 13 + i * 5.1);
      const hh = Math.max(5, Math.round(h));
      px(g, fx, f.boxBot - 15 - hh, 8, hh, '#e06a1e');
      px(g, fx + 2, f.boxBot - 15 - Math.round(hh * 0.62), 5, Math.round(hh * 0.62), '#f5a83c');
      px(g, fx + 3, f.boxBot - 15 - Math.round(hh * 0.3), 3, Math.round(hh * 0.3), '#f8dc8a');
    }
    for (let i = 0; i < 8; i++) {                       // coals under the logs
      const gl = 0.4 + 0.4 * Math.sin(t * 3.1 + i * 2.7);
      g.globalAlpha = Math.max(0.15, gl);
      px(g, f.boxX + 4 + i * 5, f.boxBot - 4, 4, 3, i % 2 ? '#e06a1e' : '#f5a83c');
      g.globalAlpha = 1;
    }
    // clock hands
    drawClockHands(g, 357, 121, world.hour);
    // candle flames
    drawCandleFlame(g, 378, 134, world, 0);
    drawCandleFlame(g, 392, 134, world, 1);
  }

  function drawClockHands(g, cx, cy, hour) {
    const ha = ((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = ((hour * 60) % 60) / 60 * Math.PI * 2 - Math.PI / 2;
    g.strokeStyle = '#3a2a1a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * 3.5, cy + Math.sin(ha) * 3.5);
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ma) * 5.5, cy + Math.sin(ma) * 5.5);
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
    px(g, 440, 214, 30, 24, '#7a5a3a');
    px(g, 442, 212, 26, 4, '#5f462d');
    ell(g, 448, 218, 4, 4, '#8a6142'); ell(g, 458, 216, 4, 4, '#6b4429');
    ell(g, 452, 224, 4, 4, '#6b4429'); ell(g, 462, 224, 4, 4, '#8a6142');
  }

  /* ---------- menu board, shelves, lamps ---------- */
  function drawMenuBoard(g) {
    const m = L.menu;
    px(g, m.x, m.y, m.w, m.h, '#5a3d28');
    px(g, m.x, m.y, m.w, 2, '#6e4a33');
    px(g, m.x + 4, m.y + 4, m.w - 8, m.h - 8, '#2c3038');
    px(g, m.x + 4, m.y + 4, m.w - 8, 2, 'rgba(0,0,0,0.4)');
    // chalk handwriting in the 6×10 hand
    SCENE.chalkText(g, m.x + 16, m.y + 9, 'CAFÉ HYGGE', '#e8dfc9');
    px(g, m.x + 16, m.y + 21, 76, 2, 'rgba(232,223,201,0.45)');
    SCENE.chalkText(g, m.x + 12, m.y + 27, 'KAFFE', 'rgba(220,214,196,0.75)');
    SCENE.chalkText(g, m.x + 12, m.y + 39, 'KAKAO', 'rgba(220,214,196,0.75)');
    SCENE.chalkText(g, m.x + 12, m.y + 51, 'BOLLER', 'rgba(220,214,196,0.75)');
    // chalk price dashes
    g.fillStyle = 'rgba(220,214,196,0.6)';
    g.fillRect(m.x + 82, m.y + 32, 10, 2);
    g.fillRect(m.x + 82, m.y + 44, 10, 2);
    g.fillRect(m.x + 82, m.y + 56, 10, 2);
    // a little chalk heart
    px(g, m.x + 96, m.y + 54, 2, 2, 'rgba(220,214,196,0.7)');
    px(g, m.x + 100, m.y + 54, 2, 2, 'rgba(220,214,196,0.7)');
    px(g, m.x + 96, m.y + 56, 6, 2, 'rgba(220,214,196,0.7)');
    px(g, m.x + 97, m.y + 58, 4, 2, 'rgba(220,214,196,0.7)');
    px(g, m.x + 98, m.y + 60, 2, 2, 'rgba(220,214,196,0.7)');
  }

  function drawShelves(g) {
    // shelf boards — shortened to make wall room for the menu chalkboard
    px(g, 636, 104, 164, 8, '#7d5334');
    px(g, 636, 148, 164, 8, '#7d5334');
    px(g, 644, 112, 4, 6, '#5f402c'); px(g, 788, 112, 4, 6, '#5f402c');
    px(g, 644, 156, 4, 6, '#5f402c'); px(g, 788, 156, 4, 6, '#5f402c');
    // shelf 1: cups, jar, books, plant
    const cupCols = ['#d9d2c0', '#a94f3f', '#4a7a5a', '#d9a05a', '#7a89a5'];
    for (let i = 0; i < 5; i++) {
      px(g, 648 + i * 18, 92, 10, 12, cupCols[i]);
      px(g, 658 + i * 18, 96, 2, 4, cupCols[i]);
    }
    px(g, 752, 84, 14, 20, '#d9973f'); px(g, 754, 80, 10, 4, '#8a611e');
    px(g, 770, 84, 6, 20, '#8a4a3a'); px(g, 778, 88, 6, 16, '#4a5a7a');
    drawTinyPlant(g, 786, 104);
    // shelf 2: teapot, plates, jars, mugs
    px(g, 648, 134, 22, 14, '#e8e0d0'); px(g, 670, 138, 6, 4, '#e8e0d0'); px(g, 656, 130, 6, 4, '#e8e0d0');
    px(g, 692, 140, 18, 8, '#c9c2b0'); px(g, 694, 136, 14, 2, '#b5aa92'); px(g, 694, 144, 14, 2, '#b5aa92');
    px(g, 724, 132, 12, 16, '#d9973f'); px(g, 726, 128, 8, 4, '#8a611e');
    px(g, 744, 136, 12, 12, '#a5763f'); px(g, 746, 132, 8, 4, '#6e4a26');
    const mugs2 = ['#a94f3f', '#4a7a5a'];
    for (let i = 0; i < 2; i++) px(g, 764 + i * 16, 136, 10, 12, mugs2[i]);
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
    // body with edge light/shade
    px(g, m.x, m.y, m.w, 40, '#b8bfc7');
    px(g, m.x, m.y + 10, 2, 30, '#d3d9de');
    px(g, m.x + m.w - 2, m.y + 10, 2, 30, '#8a919c');
    // warming tray on top, spare cups upside-down
    px(g, m.x, m.y, m.w, 10, '#3c414d');
    px(g, m.x + 4, m.y + 3, m.w - 8, 2, '#5a616e');
    px(g, m.x + 8, m.y - 5, 10, 5, '#e8e0d0');
    px(g, m.x + 22, m.y - 5, 10, 5, '#d9d2c0');
    px(g, m.x + 36, m.y - 5, 10, 5, '#e8e0d0');
    // group heads with portafilters + handles
    px(g, m.x + 10, m.y + 26, 12, 8, '#3c414d');
    px(g, m.x + 34, m.y + 26, 12, 8, '#3c414d');
    px(g, m.x + 11, m.y + 26, 10, 2, '#5a616e');
    px(g, m.x + 35, m.y + 26, 10, 2, '#5a616e');
    px(g, m.x + 13, m.y + 34, 6, 3, '#2a2e38'); px(g, m.x + 37, m.y + 34, 6, 3, '#2a2e38');
    px(g, m.x + 19, m.y + 34, 7, 2, '#4a3020'); px(g, m.x + 43, m.y + 34, 7, 2, '#4a3020');
    // pressure gauge (needle drawn with the brew state below)
    ell(g, m.x + 28, m.y + 16, 5, 5, '#3c414d');
    ell(g, m.x + 28, m.y + 16, 4, 4, '#e8e0d0');
    // drip tray grill along the base
    px(g, m.x + 4, m.y + 37, m.w - 8, 3, '#3c414d');
    for (let dx = m.x + 8; dx < m.x + m.w - 8; dx += 6) px(g, dx, m.y + 37, 2, 3, '#2a2e38');
    // steam wand
    px(g, m.x + m.w - 5, m.y + 22, 3, 3, '#8a919c');
    px(g, m.x + m.w - 2, m.y + 25, 3, 10, '#8a919c');
    px(g, m.x + m.w - 2, m.y + 35, 3, 2, '#5a616e');
    const brew = world.brew;
    if (brew && brew.active) {
      px(g, m.x + 5, m.y + 4, 4, 4, (world.t * 3 | 0) % 2 ? '#f5b942' : '#8a611e');
      px(g, m.x + 29, m.y + 13, 2, 2, '#a94f3f');            // needle swings up under pressure
      if (brew.stage === 'pull') {
        px(g, m.x + 11, m.y + 31, 10, 9, '#e8e0d0');         // cup under the spout
        px(g, m.x + 15, m.y + 26, 2, 6, '#6b4429');          // coffee stream
        px(g, m.x + 15, m.y + 30, 2, 2, '#c98f4a');          // crema where it lands
      }
    } else {
      px(g, m.x + 5, m.y + 4, 4, 4, '#4a5160');
      px(g, m.x + 26, m.y + 17, 2, 2, '#a94f3f');            // needle at rest
    }
  }

})();
