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
  /* proportion pass: one café ruler — a standing character is 60 px (CH).
     Architecture sits at 1.2–2 CH, furniture at its real-ish height, and the
     wall line moved up so the floor (the life layer) dominates the frame. */
  const L = (SCENE.L = {
    W: W, H: H,
    wallY: 232,               // where wall meets floor
    door: { x: 28, y: 130, w: 52, h: 102 },   // 1.7 CH
    doorSpot: { x: 54, y: 252 },     // where people appear
    bell: { x: 86, y: 132 },
    win: { x: 136, y: 98, w: 128, h: 80 },    // 1.35 CH tall
    fire: { x: 344, w: 88, boxX: 364, boxW: 48, boxTop: 180, boxBot: 228 },
    lane: 368,                // main walking corridor
    lamp1: { x: 318, y: 84 },
    lamp2: { x: 614, y: 84 },
    // the reading nook (bottom right): a 2 CH bookshelf patrons borrow from,
    // green wing chairs each with a side table + reading lamp, on their own rug
    library: {
      shelf: { x: 900, y: 458, w: 88, h: 120 },
      browseSpot: { x: 834, y: 480 },   // where patrons stand to browse spines
      chairs: [
        { x: 712, y: 514, dir: 1 },
        { x: 812, y: 538, dir: -1 }
      ],
      sideTables: [{ x: 664, y: 520 }, { x: 864, y: 542 }],
      lamps: [{ x: 642, y: 504 }, { x: 848, y: 528 }],
      basket: { x: 924, y: 474 },
      rug: { x: 762, y: 528, rx: 96, ry: 28 }
    },
    // fireside pair flanking the hearth rug; dir = facing (+1 right, -1 left),
    // seat sits at x + 6*dir. Backs top out at y-58 = 238, just under the wall line.
    armchairs: [
      { x: 298, y: 296, dir: 1 },
      { x: 478, y: 296, dir: -1 }
    ],
    coatStand: { x: 96, y: 298 },
    plants: [{ x: 612, y: 262 }, { x: 930, y: 322 }],
    counter: { x: 640, w: 300, slabY: 264, frontY: 278, baseY: 306 }, // 0.7 CH tall
    machine: { x: 656, y: 224, w: 56 },       // hero prop: kept a notch above scale
    serveSpot: { x: 744, y: 266 },   // where finished cups land on the counter
    orderSpot: { x: 696, y: 316 },
    pickupSpot: { x: 744, y: 316 },
    baristaHome: { x: 706, y: 286 },
    baristaExitX: 616,               // where the barista slips out from behind the counter
    tables: [
      { x: 196, y: 412, tag: 'by the window' },
      { x: 414, y: 426, tag: 'near the fire' },
      { x: 260, y: 520, tag: '' },
      { x: 516, y: 524, tag: '' }
    ],
    stoolDX: 52, stoolDY: 8
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

  /* shade(hex, f): f < 0 darkens toward black, f > 0 lightens toward white.
     Memoized — called per frame on pool colors (clothing folds, hair shine). */
  const shadeCache = {};
  function shade(hex, f) {
    const key = hex + '|' + f;
    let v = shadeCache[key];
    if (!v) {
      const c = hexRGB(hex);
      const to = f < 0 ? 0 : 255, k = Math.abs(f);
      v = 'rgb(' + Math.round(lerp(c[0], to, k)) + ',' + Math.round(lerp(c[1], to, k)) + ',' + Math.round(lerp(c[2], to, k)) + ')';
      shadeCache[key] = v;
    }
    return v;
  }

  /* deterministic 2D hash for texture (grain, knots, brick tint) — the static
     background renders once, so the noise must be stable across renders */
  function h2(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
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

  /* ---------- 6×10 chalk hand (native-res successor to the old 3×5 font) ----------
     One font pixel = 1 master px; 2 px strokes keep the chalk-marker weight.
     Each glyph gets a tiny deterministic vertical jitter so lines of text sit
     slightly uneven — hand-written, never typeset. */
  const CHALK = {
    A: '.####.|##..##|##..##|##..##|######|######|##..##|##..##|##..##|##..##',
    B: '#####.|##..##|##..##|##..##|#####.|#####.|##..##|##..##|##..##|#####.',
    C: '.####.|##..##|##....|##....|##....|##....|##....|##....|##..##|.####.',
    D: '#####.|##..##|##..##|##..##|##..##|##..##|##..##|##..##|##..##|#####.',
    E: '######|######|##....|##....|#####.|#####.|##....|##....|######|######',
    F: '######|######|##....|##....|#####.|#####.|##....|##....|##....|##....',
    G: '.####.|##..##|##....|##....|##....|##.###|##.###|##..##|##..##|.####.',
    H: '##..##|##..##|##..##|##..##|######|######|##..##|##..##|##..##|##..##',
    I: '.####.|.####.|..##..|..##..|..##..|..##..|..##..|..##..|.####.|.####.',
    K: '##..##|##..##|##.##.|##.##.|####..|####..|##.##.|##.##.|##..##|##..##',
    L: '##....|##....|##....|##....|##....|##....|##....|##....|######|######',
    M: '##..##|######|######|##..##|##..##|##..##|##..##|##..##|##..##|##..##',
    N: '##..##|##..##|###.##|###.##|##.###|##.###|##..##|##..##|##..##|##..##',
    O: '.####.|##..##|##..##|##..##|##..##|##..##|##..##|##..##|##..##|.####.',
    R: '#####.|##..##|##..##|##..##|#####.|#####.|##.##.|##.##.|##..##|##..##',
    S: '.#####|######|##....|##....|#####.|.#####|....##|....##|######|#####.',
    T: '######|######|..##..|..##..|..##..|..##..|..##..|..##..|..##..|..##..',
    U: '##..##|##..##|##..##|##..##|##..##|##..##|##..##|##..##|##..##|.####.',
    Y: '##..##|##..##|##..##|.####.|..##..|..##..|..##..|..##..|..##..|..##..',
    'É': '######|######|##....|##....|#####.|#####.|##....|##....|######|######',
    ' ': '......|......|......|......|......|......|......|......|......|......'
  };
  SCENE.chalkText = function (g, x, y, str, c) {
    let cx = x, ci = 0;
    for (const ch of str.toUpperCase()) {
      const rows = (CHALK[ch] || CHALK[' ']).split('|');
      const jy = ((ci * 7919) % 3) - 1;   // hand-chalked wobble
      if (ch === 'É') { px(g, cx + 3, y + jy - 4, 2, 2, c); px(g, cx + 2, y + jy - 2, 2, 2, c); }
      for (let r = 0; r < 10; r++) {
        for (let col = 0; col < 6; col++) {
          if (rows[r][col] === '#') px(g, cx + col, y + jy + r, 1, 1, c);
        }
      }
      cx += 8;
      ci++;
    }
    return cx - x - 2;
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

  /* ---------- window with the world outside ---------- */
  function drawWindow(g, world) {
    const w = L.win, pal = world.pal, t = world.t;
    // outside: sky
    px(g, w.x, w.y, w.w, Math.round(w.h * 0.55), pal.skyTop);
    px(g, w.x, w.y + Math.round(w.h * 0.55), w.w, Math.round(w.h * 0.45), pal.skyBot);
    // stars & moon at night
    const nightA = Math.max(0, 1 - pal.daylight * 3);
    if (nightA > 0.05) {
      const stars = [[10, 8], [30, 4], [52, 12], [78, 6], [102, 14], [20, 24], [90, 26], [62, 18]];
      for (let i = 0; i < stars.length; i++) {
        g.globalAlpha = nightA * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + i * 1.8)));
        px(g, w.x + stars[i][0], w.y + stars[i][1], 2, 2, '#e8ecf5');
      }
      g.globalAlpha = nightA;
      ell(g, w.x + w.w - 20, w.y + 14, 7, 7, '#e8e4d0');
      ell(g, w.x + w.w - 23, w.y + 12, 6, 6, pal.skyTop);
      g.globalAlpha = 1;
    }
    // town silhouette with lit windows
    g.fillStyle = '#2b3242';
    g.fillRect(w.x, w.y + 56, 28, 24);
    g.fillRect(w.x + 32, w.y + 48, 22, 32);
    g.fillRect(w.x + 60, w.y + 60, 30, 20);
    g.fillRect(w.x + 96, w.y + 52, 26, 28);
    px(g, w.x + 36, w.y + 42, 4, 6, '#2b3242'); // chimney
    const lit = pal.lamp;
    if (lit > 0.05) {
      g.globalAlpha = lit;
      [[6, 62], [16, 68], [38, 54], [46, 62], [68, 66], [102, 58], [112, 66]].forEach(function (p) {
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
        const rx = w.x + ((i * 37 + 13) % w.w);
        const ry = w.y + ((t * sp + i * 61) % w.h);
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

  function drawTinyPlant(g, x, y) {
    px(g, x, y - 8, 12, 8, '#b5654a');
    px(g, x + 2, y - 10, 8, 2, '#8f4a35');
    px(g, x + 2, y - 16, 2, 6, '#4a7a4a');
    px(g, x + 6, y - 18, 2, 8, '#5a8a52');
    px(g, x + 8, y - 14, 2, 4, '#4a7a4a');
    px(g, x + 4, y - 14, 4, 4, '#5a8a52');
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
    px(g, 470, 104, 108, 68, '#5a3d28');
    px(g, 470, 104, 108, 2, '#6e4a33');
    px(g, 474, 108, 100, 60, '#2c3038');
    px(g, 474, 108, 100, 2, 'rgba(0,0,0,0.4)');
    // chalk handwriting in the 6×10 hand
    SCENE.chalkText(g, 486, 113, 'CAFÉ HYGGE', '#e8dfc9');
    px(g, 486, 125, 76, 2, 'rgba(232,223,201,0.45)');
    SCENE.chalkText(g, 482, 131, 'KAFFE', 'rgba(220,214,196,0.75)');
    SCENE.chalkText(g, 482, 143, 'KAKAO', 'rgba(220,214,196,0.75)');
    SCENE.chalkText(g, 482, 155, 'BOLLER', 'rgba(220,214,196,0.75)');
    // chalk price dashes
    g.fillStyle = 'rgba(220,214,196,0.6)';
    g.fillRect(552, 136, 10, 2);
    g.fillRect(552, 148, 10, 2);
    g.fillRect(552, 160, 10, 2);
    // a little chalk heart
    px(g, 566, 158, 2, 2, 'rgba(220,214,196,0.7)');
    px(g, 570, 158, 2, 2, 'rgba(220,214,196,0.7)');
    px(g, 566, 160, 6, 2, 'rgba(220,214,196,0.7)');
    px(g, 567, 162, 4, 2, 'rgba(220,214,196,0.7)');
    px(g, 568, 164, 2, 2, 'rgba(220,214,196,0.7)');
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

  /* ================= FURNITURE (depth-sorted) ================= */

  SCENE.furnitureDrawables = function (world) {
    const out = [];
    const C = L.counter;
    const SHADOW = 'rgba(20,12,8,0.2)';

    // tables + their seats (chair with a back on the left, stool on the right);
    // the nook's small side tables carry items but seat no one themselves
    world.tables.forEach(function (tb, i) {
      const cx = tb.x, cy = tb.y;
      if (tb.small) {
        out.push({ y: cy + 12, draw: function (g) { drawSideTable(g, cx, cy, tb.items); } });
        return;
      }
      [-1, 1].forEach(function (side) {
        const sx = cx + side * L.stoolDX, sy = cy + L.stoolDY;
        out.push({ y: sy + 4, draw: function (g) {
          ell(g, sx, sy + 14, 13, 4, SHADOW);
          if (side < 0) {
            px(g, sx - 16, sy - 36, 6, 38, '#5a3d28');   // chair back
            px(g, sx - 14, sy - 30, 2, 24, '#4a3222');   // slat groove
            px(g, sx - 17, sy - 38, 8, 4, '#6e4c30');    // top rail
            px(g, sx - 17, sy - 38, 8, 2, '#7d5334');
          }
          px(g, sx - 9, sy, 5, 14, '#4a3222'); px(g, sx + 4, sy, 5, 14, '#4a3222');
          px(g, sx - 4, sy + 8, 8, 2, '#5a3d28');        // cross-brace
          ell(g, sx, sy, 13, 6, '#7d5334');
          ell(g, sx, sy - 3, 13, 6, '#94684a');
          px(g, sx - 6, sy - 4, 12, 2, 'rgba(90,58,34,0.3)');  // seat grain
        } });
      });
      out.push({ y: cy + 32, draw: function (g) {
        ell(g, cx, cy + 30, 30, 7, SHADOW);
        px(g, cx - 5, cy - 2, 10, 28, '#5a3d28');                 // sturdier pedestal
        px(g, cx - 5, cy - 2, 2, 28, '#6e4c30');
        px(g, cx - 14, cy + 24, 28, 6, '#4a3222');
        px(g, cx - 16, cy + 28, 8, 4, '#4a3222'); px(g, cx + 8, cy + 28, 8, 4, '#4a3222'); // feet
        ell(g, cx, cy + 2, 32, 12, '#6e4c30');
        ell(g, cx, cy - 2, 32, 12, '#8a6142');
        ell(g, cx, cy - 4, 26, 9, '#96704c');
        px(g, cx - 18, cy - 8, 15, 2, 'rgba(90,58,34,0.3)');      // wood grain
        px(g, cx + 4, cy - 6, 16, 2, 'rgba(90,58,34,0.3)');
        px(g, cx - 8, cy - 2, 13, 2, 'rgba(90,58,34,0.22)');
        px(g, cx + 10, cy - 9, 2, 2, '#6e4c30');                  // a knot
        // items left on the table
        tb.items.forEach(function (it) { if (!it.hidden) drawTableItem(g, cx, cy, it); });
        // a lit candle jar on each table (its glow lives in drawLighting)
        px(g, cx - 4, cy - 14, 8, 8, '#c9b28a');
        px(g, cx - 3, cy - 12, 6, 3, '#f0e0c8');
        g.globalAlpha = 0.6 + 0.4 * Math.sin(world.t * 9 + i * 2.1);
        px(g, cx - 1, cy - 17, 2, 4, '#f5b942');
        px(g, cx - 1, cy - 19, 2, 2, '#f8dc8a');
        g.globalAlpha = 1;
      } });
    });

    // wing chairs: the fireside pair (red) and the reading nook pair (green).
    // Each is split so a sitter nestles into it; art is authored facing right.
    L.armchairs.forEach(function (A) {
      out.push({ y: A.y - 4, draw: function (g) { wingChairBack(g, A, CHAIR_RED); } });
      out.push({ y: A.y + 12, draw: function (g) { wingChairFront(g, A, CHAIR_RED); } });
    });
    L.library.chairs.forEach(function (A) {
      out.push({ y: A.y - 4, draw: function (g) { wingChairBack(g, A, CHAIR_GREEN); } });
      out.push({ y: A.y + 12, draw: function (g) { wingChairFront(g, A, CHAIR_GREEN); } });
    });

    // reading lamps, one leaning over each nook chair
    L.library.lamps.forEach(function (F) {
      out.push({ y: F.y, draw: function (g) { drawFloorLamp(g, F.x, F.y); } });
    });

    // the bookshelf — spines thin out while borrowed books are on loan
    out.push({ y: L.library.shelf.y, draw: function (g) { drawBookshelf(g, world); } });

    // coat stand just inside the door
    const CS = L.coatStand;
    out.push({ y: CS.y, draw: function (g) {
      ell(g, CS.x, CS.y - 2, 12, 4, SHADOW);
      px(g, CS.x - 2, CS.y - 62, 4, 58, '#5a3d28');
      px(g, CS.x - 10, CS.y - 56, 20, 4, '#5a3d28');
      px(g, CS.x - 12, CS.y - 72, 16, 10, '#6b5a3a');
      px(g, CS.x - 10, CS.y - 74, 12, 4, '#7d6a45');
      px(g, CS.x + 4, CS.y - 50, 7, 26, '#a94f3f');
      px(g, CS.x + 6, CS.y - 24, 5, 8, '#8f4035');
      px(g, CS.x - 10, CS.y - 4, 20, 4, '#4a3222');
    } });

    // potted plants anchoring the counter: one against the wall at its left
    // end, one tucked against its right front corner
    L.plants.forEach(function (P) {
      out.push({ y: P.y, draw: function (g) { ell(g, P.x, P.y - 2, 13, 4, SHADOW); drawBigPlant(g, P.x, P.y); } });
    });

    // magazine basket tucked at the bookshelf's foot
    const BK = L.library.basket;
    out.push({ y: BK.y, draw: function (g) {
      ell(g, BK.x, BK.y - 2, 17, 5, SHADOW);
      px(g, BK.x - 14, BK.y - 24, 28, 22, '#a5763f');
      px(g, BK.x - 10, BK.y - 20, 2, 14, '#8a5a2a'); px(g, BK.x - 2, BK.y - 20, 2, 14, '#8a5a2a'); px(g, BK.x + 6, BK.y - 20, 2, 14, '#8a5a2a');
      px(g, BK.x - 16, BK.y - 26, 32, 4, '#8a5a2a');
      px(g, BK.x - 10, BK.y - 40, 7, 16, '#7a89a5');   // magazines poking out
      px(g, BK.x - 1, BK.y - 42, 7, 18, '#a94f3f');
      px(g, BK.x + 1, BK.y - 38, 3, 4, '#e8dfc9');
    } });
    // log pile leaning on the firewood crate beside the hearth
    out.push({ y: 254, draw: function (g) {
      ell(g, 446, 252, 18, 5, SHADOW);
      px(g, 431, 246, 30, 6, '#6b4429'); ell(g, 431, 249, 3, 3, '#8a6142');
      px(g, 433, 240, 26, 6, '#5a3520'); ell(g, 459, 243, 3, 3, '#8a6142');
      px(g, 437, 234, 20, 6, '#6b4429'); ell(g, 437, 237, 3, 3, '#8a6142');
    } });

    // the counter itself
    out.push({ y: C.baseY, draw: function (g) { drawCounter(g, world); } });

    return out;
  };

  /* ---------- wing chairs (fireside red, reading-nook green) ----------
     m() mirrors an x-offset for dir = -1; upholstery colors come in as a
     swatch so both pairs share one construction. */
  const CHAIR_RED = {
    body: '#8a3d3d', light: '#9c4848', cushion: '#a05252', front: '#7a3535',
    seam: 'rgba(40,16,16,0.3)', piping: 'rgba(40,16,16,0.25)'
  };
  const CHAIR_GREEN = {
    body: '#4a7a5a', light: shade('#4a7a5a', 0.14), cushion: shade('#4a7a5a', 0.22),
    front: shade('#4a7a5a', -0.16),
    seam: 'rgba(16,32,22,0.3)', piping: 'rgba(16,32,22,0.25)'
  };

  function wingChairBack(g, A, C) {
    const m = function (off, w) { return A.x + (A.dir > 0 ? off : -off - w); };
    ell(g, A.x + 2 * A.dir, A.y + 8, 30, 8, 'rgba(20,12,8,0.2)');
    px(g, m(-21, 15), A.y - 56, 15, 56, C.body);
    px(g, m(-19, 11), A.y - 58, 11, 4, C.light);
    px(g, m(-16, 2), A.y - 48, 2, 30, C.seam);       // wing seam
    px(g, m(-19, 44), A.y - 16, 44, 20, C.body);
    px(g, m(-17, 40), A.y - 18, 40, 6, C.cushion);
    px(g, m(-17, 40), A.y - 11, 40, 2, C.piping);    // cushion piping
  }

  function wingChairFront(g, A, C) {
    const m = function (off, w) { return A.x + (A.dir > 0 ? off : -off - w); };
    px(g, m(19, 13), A.y - 30, 13, 34, C.body);
    px(g, m(21, 9), A.y - 32, 9, 4, C.light);
    px(g, m(21, 2), A.y - 18, 2, 18, C.seam);        // arm seam
    px(g, m(-21, 53), A.y + 2, 53, 8, C.front);
    px(g, m(-19, 7), A.y + 10, 7, 4, '#4a3222'); px(g, m(23, 7), A.y + 10, 7, 4, '#4a3222');
  }

  function drawFloorLamp(g, x, y) {
    ell(g, x + 1, y - 2, 12, 4, 'rgba(20,12,8,0.2)');
    px(g, x - 8, y - 6, 18, 6, '#4a3222');
    px(g, x - 1, y - 48, 4, 42, '#4a3222');
    px(g, x - 12, y - 68, 26, 8, '#d9a05a');
    px(g, x - 10, y - 60, 22, 10, '#c98f4a');
    px(g, x - 12, y - 50, 26, 4, '#b57c38');
  }

  /* a low round table beside each nook chair — just big enough for a cup */
  function drawSideTable(g, sx, sy, items) {
    ell(g, sx, sy + 10, 15, 4, 'rgba(20,12,8,0.2)');
    px(g, sx - 3, sy, 6, 10, '#5a3d28');             // pedestal
    px(g, sx - 3, sy, 2, 10, '#6e4c30');
    px(g, sx - 9, sy + 8, 18, 4, '#4a3222');         // foot
    ell(g, sx, sy + 1, 16, 6, '#6e4c30');
    ell(g, sx, sy - 2, 16, 6, '#8a6142');
    ell(g, sx, sy - 3, 12, 4, '#96704c');
    px(g, sx - 6, sy - 5, 10, 2, 'rgba(90,58,34,0.3)');   // grain
    items.forEach(function (it) { if (!it.hidden) drawTableItem(g, sx, sy - 2, it); });
  }

  /* ---------- the bookshelf ----------
     2 CH of warm wood and colorful spines, drawn deterministically via h2()
     so it never flickers. Three designated "loanable" spines vanish while
     patrons have books out (world.patrons[].hasShelfBook) and return with
     them — the shelf quietly tells the story. */
  const BOOKCOLS = ['#a94f3f', '#4a7a5a', '#7a89a5', '#c9a04a', '#8a6a9a', '#6b7a55', '#b5654a', '#5a7a8a', '#9c4848', '#d9a05a'];
  const LOAN_SLOTS = [
    { row: 0, off: 34, col: '#c9a04a' },
    { row: 1, off: 58, col: '#a94f3f' },
    { row: 2, off: 16, col: '#5a7a8a' }
  ];

  function drawBookshelf(g, world) {
    const S = L.library.shelf;
    const left = S.x - S.w / 2, top = S.y - S.h, w = S.w;
    let out = 0;
    world.patrons.forEach(function (p) { if (p.hasShelfBook) out++; });
    // ground shadow, carcass, crown, plinth
    px(g, left - 4, S.y, w + 8, 3, 'rgba(20,12,8,0.22)');
    px(g, left, top, w, S.h, '#5a3d28');
    px(g, left + 4, top + 4, w - 8, S.h - 12, '#2e1d12');   // interior
    px(g, left - 4, top - 8, w + 8, 10, '#6e4a33');         // crown
    px(g, left - 4, top - 8, w + 8, 2, '#7d5334');
    px(g, left, top + 2, w, 2, 'rgba(20,10,6,0.35)');       // shadow under crown
    px(g, left, S.y - 8, w, 8, '#4a3222');                  // plinth
    px(g, left, S.y - 8, w, 2, '#5a3d28');
    // shelf boards + four rows of spines
    for (let r = 0; r < 4; r++) {
      const bot = r < 3 ? top + 31 + 27 * r : S.y - 8;
      if (r < 3) {
        px(g, left + 2, bot, w - 4, 4, '#7d5334');
        px(g, left + 2, bot + 4, w - 4, 2, '#5f402c');
      }
      const loan = LOAN_SLOTS.find(function (s) { return s.row === r; });
      let loanDone = false;
      let cx = left + 6;
      const lim = left + w - 6;
      while (cx < lim - 4) {
        if (loan && !loanDone && cx >= left + loan.off) {
          loanDone = true;
          if (LOAN_SLOTS.indexOf(loan) >= out) {            // still on the shelf
            px(g, cx, bot - 20, 7, 20, loan.col);
            px(g, cx, bot - 20, 7, 2, shade(loan.col, -0.2));
            px(g, cx + 2, bot - 12, 3, 2, 'rgba(240,232,213,0.6)');
          }                                                 // else: the gap it left
          cx += 9;
          continue;
        }
        const n = h2(cx, r * 3 + 1);
        if (n < 0.1) { cx += 5; continue; }                 // breathing gap
        if (n > 0.92 && cx + 16 <= lim) {                   // a small flat stack
          px(g, cx, bot - 4, 16, 4, BOOKCOLS[(h2(cx, r + 40) * BOOKCOLS.length) | 0]);
          px(g, cx + 1, bot - 8, 14, 4, BOOKCOLS[(h2(cx, r + 41) * BOOKCOLS.length) | 0]);
          cx += 18;
          continue;
        }
        let bw = 5 + ((h2(cx, r * 7 + 2) * 4) | 0);
        if (cx + bw > lim) { if (lim - cx < 4) break; bw = lim - cx; }
        const bh = 14 + ((h2(cx, r * 5 + 3) * 8) | 0);
        const col = BOOKCOLS[(h2(cx, r * 11 + 4) * BOOKCOLS.length) | 0];
        px(g, cx, bot - bh, bw, bh, col);
        px(g, cx, bot - bh, bw, 2, shade(col, -0.2));
        if (h2(cx, r + 9) > 0.5) px(g, cx + 1, bot - (bh >> 1), bw - 2, 2, 'rgba(240,232,213,0.5)');
        cx += bw + 1;
      }
    }
    // on top: a trailing plant and a couple of books lying flat
    drawTinyPlant(g, left + 8, top - 8);
    px(g, left + w - 34, top - 12, 22, 4, '#7a89a5');
    px(g, left + w - 32, top - 16, 18, 4, '#a94f3f');
  }

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
    const ix = cx + it.side * 24 - 5;
    if (it.kind === 'plate') {
      ell(g, ix + 5, cy - 2, 12, 4, 'rgba(20,12,8,0.18)');   // contact shadow
      ell(g, ix + 5, cy - 4, 11, 4, '#e8e0d0');
      px(g, ix + 1, cy - 12, 10, 7, '#c98f4a');
      px(g, ix + 3, cy - 14, 6, 2, '#b57c38');
    } else {
      ell(g, ix + 5, cy, 10, 3, 'rgba(20,12,8,0.18)');       // contact shadow
      ell(g, ix + 5, cy - 2, 9, 3, '#e8e0d0');   // saucer
      px(g, ix, cy - 14, 10, 12, it.kind === 'teacup' ? '#d9d2c0' : '#e8e0d0');
      px(g, ix + 10, cy - 11, 3, 5, '#e8e0d0');   // handle
      px(g, ix + 2, cy - 14, 6, 2, '#6b4429');    // the drink
    }
  }

  function drawCounter(g, world) {
    const C = L.counter;
    // ground shadow
    px(g, C.x - 4, C.baseY, C.w + 8, 3, 'rgba(20,12,8,0.22)');
    // front planks with grain dashes
    px(g, C.x, C.frontY, C.w, C.baseY - C.frontY, '#6b4529');
    for (let x = C.x + 20; x < C.x + C.w; x += 28) px(g, x, C.frontY + 4, 2, C.baseY - C.frontY - 8, '#57371f');
    for (let x = C.x + 6; x < C.x + C.w - 6; x += 14) {
      const n = h2(x, 5);
      if (n < 0.4) px(g, x + ((n * 20) | 0) % 6, C.frontY + 8 + ((n * 90) | 0) % 12, 2, 5 + ((n * 40) | 0) % 5, 'rgba(0,0,0,0.12)');
    }
    px(g, C.x, C.baseY - 4, C.w, 4, '#4a2f1c');
    // footrail shadow line — anchors the counter at its new height
    px(g, C.x + 6, C.baseY - 10, C.w - 12, 3, 'rgba(30,18,10,0.35)');
    // top slab with long grain
    px(g, C.x - 8, C.slabY, C.w + 8, C.frontY - C.slabY, '#a8764a');
    px(g, C.x - 8, C.slabY, C.w + 8, 4, '#c08a58');
    px(g, C.x + 20, C.slabY + 6, 90, 2, 'rgba(125,83,52,0.4)');
    px(g, C.x + 150, C.slabY + 8, 70, 2, 'rgba(125,83,52,0.3)');
    px(g, C.x + 60, C.slabY + 10, 50, 2, 'rgba(125,83,52,0.25)');
    px(g, C.x - 8, C.frontY - 3, C.w + 8, 3, '#7d5334');
    // register
    px(g, 748, 242, 30, 22, '#3c414d');
    px(g, 750, 238, 26, 6, '#2a2e38');
    px(g, 752, 248, 22, 8, '#8a919c');
    // tip jar
    px(g, 794, 250, 12, 14, 'rgba(200,220,230,0.7)');
    px(g, 796, 258, 8, 4, '#d9a33c');
    px(g, 794, 248, 12, 2, '#8a919c');
    // pastry case (hero prop: deliberately a notch above strict scale)
    px(g, 820, 224, 76, 40, 'rgba(210,225,235,0.35)');
    g.strokeStyle = '#8a919c'; g.lineWidth = 2;
    g.strokeRect(821, 225, 74, 38);
    px(g, 820, 244, 76, 2, '#8a919c');
    // top shelf: croissant, cinnamon swirl, danish — each on doily paper
    px(g, 826, 241, 16, 2, 'rgba(232,224,208,0.5)');
    px(g, 826, 236, 4, 5, '#d9a05a'); px(g, 830, 233, 8, 8, '#e0b06a'); px(g, 838, 236, 4, 5, '#d9a05a');
    px(g, 832, 235, 2, 6, '#c08a48'); px(g, 836, 235, 2, 6, '#c08a48');
    px(g, 848, 241, 15, 2, 'rgba(232,224,208,0.5)');
    px(g, 848, 233, 14, 8, '#c98f4a');
    px(g, 850, 235, 8, 2, '#8a5a2a'); px(g, 854, 238, 6, 2, '#8a5a2a'); px(g, 850, 238, 2, 2, '#8a5a2a');
    px(g, 851, 231, 8, 2, '#e0b06a');
    px(g, 868, 241, 14, 2, 'rgba(232,224,208,0.5)');
    px(g, 868, 234, 13, 7, '#e0b06a'); px(g, 872, 236, 5, 3, '#b5654a'); px(g, 869, 234, 3, 2, '#e8dfc9');
    // bottom shelf: berry tart, pink-glazed bun, layer slice
    px(g, 828, 254, 13, 8, '#c98f4a');
    px(g, 830, 254, 3, 3, '#5a4a68'); px(g, 835, 255, 3, 3, '#a94f3f'); px(g, 832, 258, 3, 2, '#5a4a68');
    px(g, 846, 254, 11, 8, '#d9738a');
    px(g, 848, 252, 7, 2, '#e8b4c4'); px(g, 850, 254, 2, 3, '#e8b4c4');
    px(g, 862, 254, 13, 8, '#e8dfc9');
    px(g, 862, 257, 13, 2, '#c98f4a'); px(g, 862, 260, 13, 2, '#c98f4a');
    // glass shine
    px(g, 856, 227, 2, 14, 'rgba(255,255,255,0.12)');
    px(g, 860, 227, 2, 10, 'rgba(255,255,255,0.10)');
    // flowers in a vase
    px(g, 914, 246, 10, 18, '#7a89a5');
    px(g, 916, 234, 2, 12, '#4a7a4a'); px(g, 920, 236, 2, 10, '#4a7a4a');
    px(g, 914, 230, 6, 6, '#d9738a'); px(g, 918, 226, 6, 6, '#e8b04a');
    // orders waiting at the pass
    world.counterCups.forEach(function (c) {
      if (c.kind === 'plate') {
        ell(g, c.x + 5, c.y + 8, 11, 4, '#e8e0d0');
        px(g, c.x, c.y, 11, 7, '#c98f4a');
        px(g, c.x + 2, c.y - 2, 7, 2, '#b57c38');
      } else {
        ell(g, c.x + 5, c.y + 10, 9, 3, '#d9d2c0');
        px(g, c.x, c.y, 10, 11, '#e8e0d0');
        px(g, c.x + 10, c.y + 2, 3, 5, '#e8e0d0');
        px(g, c.x + 2, c.y, 6, 2, '#6b4429');
      }
    });
  }

  /* ================= PEOPLE ================= */

  /* A standing character is 60 px tall (the café ruler CH): legs 16,
     torso 24, head 16 + hair. Seated reads slightly hunched at ~52.
     Detail pass: brows + 3×4 eyes, actual hands, four hair styles
     (0 classic / 1 side-part / 2 curly / 3 bun), clothing folds, scarf
     knots, apron strings, a 4-frame walk and a subtle idle breathe. */
  function drawHead(g, x, hy, facing, c) {
    const hairL = shade(c.hair, 0.18);
    const st = c.hairStyle || 0;
    const bx = facing > 0 ? x - 8 : x + 6;                 // back of the head
    // face
    px(g, x - 8, hy, 18, 16, c.skin);
    // hair cap + shine
    px(g, x - 8, hy - 4, 18, 6, c.hair);
    px(g, x + (facing > 0 ? -5 : -1), hy - 3, 7, 2, hairL);
    px(g, bx, hy, 5, 8, c.hair);
    if (st === 1) {                                        // swept side-part fringe
      px(g, facing > 0 ? x - 2 : x - 6, hy + 2, 8, 2, c.hair);
      px(g, facing > 0 ? x + 4 : x - 6, hy + 4, 2, 2, c.hair);
    } else if (st === 2) {                                 // curly: bumps over the cap
      px(g, x - 7, hy - 6, 5, 2, c.hair);
      px(g, x - 1, hy - 7, 6, 3, c.hair);
      px(g, x + 5, hy - 6, 5, 2, c.hair);
      px(g, bx + (facing > 0 ? -1 : 2), hy + 7, 3, 4, c.hair);
    } else if (st === 3) {                                 // hair tied up in a bun
      px(g, bx + (facing > 0 ? -4 : 3), hy - 7, 7, 7, c.hair);
      px(g, bx + (facing > 0 ? -3 : 4), hy - 6, 3, 2, hairL);
    }
    if (c.longHair && st !== 3) {
      px(g, facing > 0 ? x - 11 : x + 8, hy + 2, 5, 18, c.hair);
    }
    // brow + eye
    const ex = facing > 0 ? x + 5 : x - 8;
    px(g, ex, hy + 3, 4, 2, c.hair);
    px(g, ex, hy + 6, 3, 4, '#2a1a12');
    if (c.beard) {
      px(g, facing > 0 ? x - 1 : x - 8, hy + 12, 9, 4, c.hair);
      px(g, facing > 0 ? x + 3 : x - 4, hy + 13, 3, 2, shade(c.hair, -0.25));
    } else {
      px(g, facing > 0 ? x + 5 : x - 6, hy + 12, 3, 2, shade(c.skin, -0.22));   // mouth
      px(g, facing > 0 ? x - 1 : x - 2, hy + 10, 4, 2, 'rgba(214,106,90,0.3)'); // blush
    }
  }

  SCENE.drawPerson = function (g, p) {
    const facing = p.facing >= 0 ? 1 : -1;
    const walk = p.pose === 'walk';
    const cycle = walk ? (Math.floor(p.animT * 8) % 4) : 0;
    const pass = cycle === 1 || cycle === 3;               // passing frames bob up
    const y = p.y - (walk && pass ? 2 : 0);
    const x = Math.round(p.x);
    const c = p.colors;
    const breathe = !walk && Math.sin(p.animT * 1.6) > 0.3 ? 1 : 0;
    const topD = shade(c.top, -0.18);

    ell(g, x, p.y + 2, 14, 5, 'rgba(20,12,8,0.25)');

    if (p.pose === 'sit') {
      // bent legs with a knee crease
      px(g, x - 8, y - 10, 16, 10, c.pants);
      px(g, x + facing * 5 - (facing > 0 ? 0 : 5), y - 10, 7, 10, c.pants);
      px(g, x + facing * 3 - (facing > 0 ? 0 : 4), y - 10, 2, 6, shade(c.pants, -0.2));
      px(g, x - 8, y - 3, 18, 3, '#3a2a1c');
      // torso, slightly hunched
      px(g, x - 10, y - 32, 20, 22, c.top);
      px(g, x - 1, y - 28, 2, 12, topD);                        // fold
      px(g, x - 10, y - 12, 20, 2, topD);                       // hem
      if (c.scarf) {
        px(g, x - 10, y - 32, 20, 5, c.scarf);
        const kx = facing > 0 ? x + 5 : x - 9;
        px(g, kx, y - 29, 4, 4, shade(c.scarf, -0.15));         // knot
        px(g, kx, y - 25, 4, 7, c.scarf);                       // tail
        px(g, kx, y - 19, 2, 2, shade(c.scarf, -0.15));         // fringe
      }
      drawHead(g, x, y - 48 + breathe, facing, c);
      // arms + what they hold
      if (p.reading) {
        px(g, x + facing * 3 - 2, y - 24, 5, 8, c.top);
        const bx = x + facing * 10 - 9;
        px(g, bx, y - 29, 18, 10, '#f5efdf');
        px(g, bx + 8, y - 29, 2, 10, '#b5a888');
        px(g, bx, y - 31, 18, 2, '#c9b28a');
        px(g, bx - 2, y - 26, 3, 4, c.skin);                    // hands on the covers
        px(g, bx + 17, y - 26, 3, 4, c.skin);
      } else if (p.holding === 'cup') {
        const up = p.armUp || 0;
        const hy = y - 26 - up * 17;
        const hx = x + facing * (13 - up * 5);
        px(g, x + facing * 5, y - 30, 5, Math.round(10 - up * 3), c.top);
        px(g, hx - 3, hy, 10, 10, '#e8e0d0');
        px(g, hx + (facing > 0 ? 7 : -6), hy + 3, 3, 4, '#e8e0d0');
        px(g, hx + (facing > 0 ? -5 : 6), hy + 4, 3, 4, c.skin);  // hand on the cup
      } else {
        px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 30, 5, 12, c.top);
        px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 20, 4, 3, c.skin); // resting hand
      }
      return;
    }

    // standing / walking legs (4-frame walk: stride, pass, stride, pass)
    if (walk) {
      if (pass) {
        px(g, x - 8, y - 16, 8, 16, c.pants);
        px(g, x + 1, y - 16, 7, 16, c.pants);
        px(g, x - 8, y - 3, 8, 3, '#3a2a1c');
        px(g, x + 1, y - 3, 7, 3, '#3a2a1c');
      } else {
        const s = cycle === 0 ? 1 : -1;
        px(g, x - 10 + s * 3, y - 16, 8, 16, c.pants);
        px(g, x + 2 - s * 3, y - 16, 8, 16, c.pants);
        px(g, x - 10 + s * 3, y - 3, 8, 3, '#3a2a1c');
        px(g, x + 2 - s * 3, y - 3, 8, 3, '#3a2a1c');
      }
    } else {
      px(g, x - 10, y - 16, 8, 16, c.pants);
      px(g, x + 2, y - 16, 8, 16, c.pants);
      px(g, x - 8, y - 12, 2, 8, shade(c.pants, -0.2));    // creases
      px(g, x + 4, y - 12, 2, 8, shade(c.pants, -0.2));
      px(g, x - 10, y - 3, 18, 3, '#3a2a1c');
    }
    // torso with shoulder light, centre fold and hem
    px(g, x - 10, y - 40, 20, 24, c.top);
    px(g, x - 10, y - 40, 20, 2, shade(c.top, 0.12));
    px(g, x - 1, y - 34, 2, 14, topD);
    px(g, x - 10, y - 18, 20, 2, topD);
    if (c.scarf) {
      px(g, x - 10, y - 40, 20, 5, c.scarf);
      const kx = facing > 0 ? x + 5 : x - 9;
      px(g, kx, y - 37, 4, 4, shade(c.scarf, -0.15));      // knot
      px(g, kx, y - 33, 4, 8, c.scarf);                    // hanging tail
      px(g, kx, y - 26, 2, 2, shade(c.scarf, -0.15));      // fringe
    }
    if (c.apron) {
      px(g, x - 8, y - 32, 16, 16, '#e8dfc9');
      px(g, x - 3, y - 37, 6, 5, '#e8dfc9');
      px(g, x - 5, y - 39, 2, 3, '#c9b28a');               // neck straps
      px(g, x + 3, y - 39, 2, 3, '#c9b28a');
      px(g, x - 8, y - 32, 16, 2, '#c9b28a');              // waistband
      px(g, x - 5, y - 26, 10, 7, '#d9d2c0');              // pocket
      px(g, x - 5, y - 26, 10, 2, '#c9b28a');
      const abx = facing > 0 ? x - 13 : x + 10;            // tie bow at the back
      px(g, abx, y - 31, 4, 3, '#e8dfc9');
      px(g, abx + 1, y - 28, 2, 6, '#e8dfc9');
    }
    drawHead(g, x, y - 56 + breathe, facing, c);
    // arm + held item, with actual hands
    const held = p.holding;
    const swing = walk && !pass ? (cycle === 0 ? 2 : -2) * facing : 0;
    if (held === 'cup' || held === 'plate' || held === 'cloth') {
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 10, c.top);
      const hx = x + facing * 13 - (facing > 0 ? 0 : 8);
      if (held === 'cup') {
        px(g, hx, y - 32, 10, 10, '#e8e0d0');
        px(g, hx + (facing > 0 ? 10 : -3), y - 29, 3, 5, '#e8e0d0');
        px(g, hx + (facing > 0 ? -3 : 9), y - 28, 4, 4, c.skin);
      } else if (held === 'plate') {
        px(g, hx - 3, y - 26, 15, 5, '#e8e0d0');
        px(g, hx, y - 31, 10, 5, '#c98f4a');
        px(g, hx + 3, y - 21, 5, 3, c.skin);               // palm under the plate
      } else {
        px(g, hx, y - 26, 10, 7, '#7a89a5');
        px(g, hx + 2, y - 29, 4, 3, c.skin);               // hand on the cloth
      }
    } else if (held === 'book') {
      // borrowed book tucked under the arm
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 12, c.top);
      const bkx = x + facing * 12 - (facing > 0 ? 0 : 10);
      px(g, bkx, y - 25, 10, 8, '#a94f3f');
      px(g, bkx, y - 25, 10, 2, shade('#a94f3f', -0.2));
      px(g, bkx + (facing > 0 ? 8 : 0), y - 24, 2, 6, '#f5efdf');   // page edges
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 22, 4, 4, c.skin);
    } else {
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3) + swing, y - 34, 5, 16, c.top);
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2) + swing, y - 20, 4, 4, c.skin);
    }
  };

  /* ---------- the cat ---------- */
  SCENE.drawCat = function (g, cat) {
    const x = Math.round(cat.x), y = Math.round(cat.y);
    const t = cat.animT;
    const f = cat.facing >= 0 ? 1 : -1;
    const body = '#d98d4a', dark = '#b5702e', cream = '#f0e0c8', pink = '#d9738a';
    const twitch = Math.sin(t * 0.9) > 0.97;    // an occasional ear flick
    ell(g, x, y + 2, 14, 4, 'rgba(20,12,8,0.2)');

    // ears that move: base + tip triangles, pink inner on the facing side
    function ears(hx, hw, hy) {
      const e1 = hx + 1, e2 = hx + hw - 5;
      px(g, e1, hy - 2, 4, 3, body);
      px(g, e1 + 1, hy - (twitch ? 3 : 4), 2, 2, dark);
      px(g, e2, hy - 2, 4, 3, body);
      px(g, e2 + 1, hy - 4, 2, 2, dark);
      px(g, (f > 0 ? e2 : e1) + 1, hy - 1, 2, 2, pink);
    }

    if (cat.state === 'sleep') {
      const breathe = Math.sin(t * 1.7) > 0 ? 2 : 0;
      px(g, x - 12, y - 9 - breathe, 24, 9 + breathe, body);
      px(g, x - 12, y - 4, 24, 4, dark);
      px(g, x - 7, y - 9 - breathe, 2, 5, dark); px(g, x, y - 9 - breathe, 2, 5, dark);
      px(g, x + 3, y - 14, 10, 7, body);
      ears(x + 3, 10, y - 14);
      px(g, x + 5, y - 11, 5, 2, '#8a6142');            // closed eye
      // tail curled right around the front, pale tip
      px(g, x - 15, y - 8, 4, 8, dark);
      px(g, x - 12, y - 3, 9, 3, dark);
      px(g, x - 4, y - 4, 3, 3, cream);
    } else if (cat.state === 'sit' || cat.state === 'groom') {
      px(g, x - 7, y - 17, 14, 17, body);
      px(g, x - 5, y - 5, 10, 5, cream);
      px(g, x - 7, y - 14, 2, 3, dark); px(g, x + 4, y - 15, 2, 3, dark);   // stripes
      const hy = cat.state === 'groom' ? y - 19 : y - 26;
      const hx = cat.state === 'groom' ? x + f * 2 : x;
      px(g, hx - 5, hy, 14, 9, body);
      ears(hx - 5, 14, hy);
      if (cat.state === 'sit') {
        px(g, hx + (f > 0 ? 4 : -5), hy + 3, 2, 2, '#3a5a2a');              // eye
        px(g, hx + (f > 0 ? 6 : -8), hy + 5, 3, 3, cream);                  // muzzle
        px(g, hx + (f > 0 ? 7 : -7), hy + 5, 2, 2, pink);                   // nose
      } else {
        px(g, hx + f * 4 - (f > 0 ? 0 : 3), hy + 7, 3, 4, body);            // raised grooming paw
      }
      // tail wrapped around the paws, tip curling and swaying
      const sway = Math.round(Math.sin(t * 2.2) * 2);
      px(g, x - f * 9 - 2, y - 7, 4, 7, dark);
      px(g, f > 0 ? x - 8 : x - 4, y - 3, 12, 3, dark);
      px(g, (f > 0 ? x + 2 : x - 8) + sway, y - 6, 3, 4, dark);
      px(g, (f > 0 ? x + 2 : x - 8) + sway, y - 7, 3, 2, cream);
    } else if (cat.state === 'stretch') {
      px(g, x - 12, y - 7, 12, 7, body);
      px(g, x, y - 12, 12, 12, body);
      px(g, x + 8, y - 19, 10, 9, body);
      ears(x + 8, 10, y - 19);
      // tail curved up in two segments
      px(g, x - 15, y - 14, 4, 6, dark);
      px(g, x - 17, y - 19, 3, 5, dark);
      px(g, x - 17, y - 21, 3, 2, cream);
    } else { // walk / loaf
      const step = cat.state === 'walk' ? (Math.floor(t * 8) % 2) : 0;
      px(g, x - 12, y - 12, 24, 9, body);
      px(g, x - 8, y - 12, 2, 4, dark); px(g, x - 2, y - 12, 2, 5, dark); px(g, x + 4, y - 12, 2, 4, dark);
      px(g, x - 10, y - 5, 7, 2, dark); px(g, x + 5, y - 5, 7, 2, dark);
      if (cat.state === 'walk') {
        px(g, x - 10 + step * 2, y - 3, 3, 4, body); px(g, x + 7 - step * 2, y - 3, 3, 4, body);
        px(g, x - 3 - step * 2, y - 3, 3, 4, dark); px(g, x + 2 + step * 2, y - 3, 3, 4, dark);
      }
      const hx = x + f * 10 - (f > 0 ? 0 : 8);
      px(g, hx, y - 19, 10, 9, body);
      ears(hx, 10, y - 19);
      px(g, hx + (f > 0 ? 6 : 1), y - 16, 2, 2, '#3a5a2a');                 // eye
      // curved tail: base rises from the rump, tip sways the most
      const ts = Math.round(Math.sin(t * 5) * 2);
      px(g, f > 0 ? x - 15 : x + 11, y - 16, 4, 7, dark);
      px(g, f > 0 ? x - 17 : x + 14, y - 20 + ts, 3, 5, dark);
      px(g, f > 0 ? x - 17 : x + 14, y - 22 + ts, 3, 2, cream);
    }
  };

  /* ---------- speech bubbles ---------- */
  SCENE.drawBubble = function (g, x, y, icon) {
    const bx = Math.round(x) - 22, by = Math.round(y) - 100;
    g.fillStyle = '#c9b28a';
    g.fillRect(bx - 2, by - 2, 48, 38);
    g.fillStyle = '#fdf8ec';
    g.fillRect(bx, by, 44, 34);
    px(g, bx + 18, by + 34, 6, 4, '#fdf8ec');
    px(g, bx + 20, by + 38, 2, 2, '#fdf8ec');
    drawIcon(g, bx + 14, by + 10, icon);
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
    L.library.lamps.forEach(function (lp) {
      glow(g, lp.x, lp.y - 58, 64, 255, 190, 100, 0.04 + 0.3 * lampA);
    });
    // fire, always flickering
    const flick = 0.2 + 0.06 * Math.sin(t * 8.7) + 0.04 * Math.sin(t * 23.3);
    glow(g, 388, 204, 92, 255, 140, 50, flick);
    glow(g, 388, 212, 40, 255, 190, 90, flick * 0.8);
    // candles on the mantel
    glow(g, 385, 118, 20, 255, 200, 110, 0.1 + 0.06 * Math.sin(t * 11));
    // candles on the tables — always lit, a touch stronger after dark
    world.tables.forEach(function (tb, i) {
      const a = 0.07 + 0.07 * (1 - d) + 0.025 * Math.sin(t * 9 + i * 2.1);
      glow(g, tb.x, tb.y - 14, 34, 255, 195, 105, a);
    });
    // daylight spilling in the window
    if (d > 0.1) glow(g, 200, 236, 130, 255, 245, 215, 0.06 * d);

    // vignette (centred on the 16:9 crop; deepens a touch after dark)
    g.globalCompositeOperation = 'source-over';
    const vA = 0.34 + 0.12 * (1 - d);
    const v = g.createRadialGradient(W / 2, 286, 240, W / 2, 306, 620);
    v.addColorStop(0, 'rgba(16,10,6,0)');
    v.addColorStop(0.6, 'rgba(16,10,6,' + (vA * 0.35).toFixed(3) + ')');
    v.addColorStop(1, 'rgba(16,10,6,' + vA.toFixed(3) + ')');
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
        const ph = p.age * 3 + p.seed;
        const sx = Math.round(p.x + Math.sin(ph) * 4), sy = Math.round(p.y);
        const grow = p.age / p.life;
        g.fillStyle = 'rgba(250,248,240,' + (a * 0.38).toFixed(3) + ')';
        if (grow < 0.3) {
          g.fillRect(sx, sy, 2, 2);
        } else {
          // little curl: head + trailing comma against the drift
          g.fillRect(sx, sy, 3, 3);
          g.fillRect(sx + (Math.cos(ph) > 0 ? -2 : 3), sy + 3, 2, 2);
          if (grow > 0.7) g.fillRect(sx + 1, sy - 2, 2, 2);
        }
      } else if (p.type === 'spark') {
        g.fillStyle = 'rgba(255,180,70,' + (a * 0.8).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        g.fillStyle = 'rgba(255,120,40,' + (a * 0.35).toFixed(3) + ')';
        g.fillRect(Math.round(p.x), Math.round(p.y) + 3, 2, 2);
      }
    });
  };

  /* ---------- captions ----------
     Pixel-look without assets: the caption renders once (per text) at 10 px
     into a small offscreen canvas, gets thresholded to crisp 1-bit glyphs in
     the caption cream + shadow colors, and is blitted ×2 nearest-neighbour —
     a 20 px bitmap-style line that matches the art. */
  let capCache = { text: null, fill: null, back: null, w: 0, h: 0 };

  function buildCaption(text) {
    const fs = 10, baseline = 10, ch = 14, pad = 2;
    const meas = document.createElement('canvas');
    let mg = meas.getContext('2d');
    mg.font = fs + 'px monospace';
    const cw = Math.ceil(mg.measureText(text).width) + pad * 2;
    meas.width = cw; meas.height = ch;             // resizing resets the ctx state
    mg = meas.getContext('2d');
    mg.font = fs + 'px monospace';
    mg.fillStyle = '#fff';
    mg.fillText(text, pad, baseline);
    const src = mg.getImageData(0, 0, cw, ch).data;
    const fill = document.createElement('canvas'); fill.width = cw; fill.height = ch;
    const back = document.createElement('canvas'); back.width = cw; back.height = ch;
    const fg = fill.getContext('2d'), bg = back.getContext('2d');
    const fi = fg.createImageData(cw, ch), bi = bg.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) {
      if (src[i * 4 + 3] > 100) {
        fi.data[i * 4] = 240; fi.data[i * 4 + 1] = 225; fi.data[i * 4 + 2] = 195; fi.data[i * 4 + 3] = 255;
        bi.data[i * 4] = 10; bi.data[i * 4 + 1] = 6; bi.data[i * 4 + 2] = 4; bi.data[i * 4 + 3] = 255;
      }
    }
    fg.putImageData(fi, 0, 0); bg.putImageData(bi, 0, 0);
    capCache = { text: text, fill: fill, back: back, w: cw, h: ch };
  }

  SCENE.drawCaption = function (g, world) {
    const c = world.activeCaption;
    if (!c) return;
    if (capCache.text !== c.text) buildCaption(c.text);
    const age = world.t - c.born;
    const dur = 4.4;
    let a = 1;
    if (age < 0.4) a = age / 0.4;
    else if (age > dur - 0.8) a = Math.max(0, (dur - age) / 0.8);
    g.globalAlpha = a * 0.75;
    g.drawImage(capCache.back, 18, 542, capCache.w * 2, capCache.h * 2);
    g.globalAlpha = a * 0.95;
    g.drawImage(capCache.fill, 16, 540, capCache.w * 2, capCache.h * 2);
    g.globalAlpha = 1;
  };
})();
