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
    win2: { x: 460, y: 98, w: 128, h: 80 },   // second window, hearth ↔ counter
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
      // busVia: the clear column Nora descends through when bussing a side
      // table — a straight drop at the bus spot would cut through the wing
      // chairs / reading lamps (the audit's journey check proves each one).
      // 666 threads between reading lamp 1 and the first wing chair; 762
      // threads between the two wing chairs.
      sideTables: [{ x: 664, y: 520, busVia: 666 }, { x: 864, y: 542, busVia: 762 }],
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
    logPile: { x: 446, y: 252 },     // beside the hearth, leaning on the crate
    plants: [{ x: 612, y: 262 }, { x: 930, y: 322 }],
    menu: { x: 820, y: 104, w: 108, h: 68 },  // chalkboard on the wall behind the counter
    counter: { x: 640, w: 300, slabY: 264, frontY: 278, baseY: 306 }, // 0.7 CH tall
    machine: { x: 656, y: 224, w: 56 },       // hero prop: kept a notch above scale
    serveSpot: { x: 744, y: 266 },   // where finished cups land on the counter
    orderSpot: { x: 696, y: 316 },
    pickupSpot: { x: 744, y: 316 },
    returnSpot: { x: 792, y: 316 },  // where bussing patrons set their cup back
    baristaHome: { x: 706, y: 286 },
    baristaExitX: 616,               // where the barista slips out from behind the counter
    tables: [
      { x: 196, y: 412, tag: 'by the window' },
      { x: 414, y: 426, tag: 'near the fire' },
      { x: 260, y: 520, tag: '' },
      // x ≥ 548 keeps this table's left seat's lane descent clear of the
      // fire table's right stool (the audit's journey check proves it)
      { x: 548, y: 524, tag: '' }
    ],
    stoolDX: 52, stoolDY: 8
  });

  /* Occluders: tall furniture that fully hides a character whose baseline is
     above (less than) `baseline` while their feet are inside [x0, x1].
     One declaration shared by the art, the dev overlay, and __dev.audit() —
     walk targets must never land in these boxes (the bookshelf lesson). */
  L.occluders = [
    {
      name: 'bookshelf',
      x0: L.library.shelf.x - L.library.shelf.w / 2,
      x1: L.library.shelf.x + L.library.shelf.w / 2,
      top: L.library.shelf.y - L.library.shelf.h,
      baseline: L.library.shelf.y
    },
    {
      name: 'counter',
      x0: L.counter.x,
      x1: L.counter.x + L.counter.w,
      top: L.counter.slabY,
      baseline: L.counter.baseY
    }
  ];

  /* Footprints: the floor boxes furniture actually occupies ({x0,x1,y0,y1},
     in baseline space). Walk targets must never stand inside one, and no walk
     segment may cut through one — except boxes marked `passable`: torso-height
     tables whose behind/in-front passes the baseline depth sort renders
     correctly (only standing in them is wrong). Seats are never passable: a
     walker crossing one crosses whoever sits there. Derived here from the same
     L entries the art uses, drawn by the dev overlay, checked by
     __dev.audit()'s journey sweep. The counter and bookshelf are already
     occluders and stay out of this list. */
  L.footprints = [];
  L.tables.forEach(function (t, i) {
    L.footprints.push({ name: 'table ' + i, x0: t.x - 34, x1: t.x + 34, y0: t.y - 8, y1: t.y + 34, passable: true });
    [-1, 1].forEach(function (side) {
      const sx = t.x + side * L.stoolDX;   // the left seat is a chair with a back
      L.footprints.push({
        name: (side < 0 ? 'chair' : 'stool') + ' (table ' + i + ')',
        x0: sx - (side < 0 ? 17 : 13), x1: sx + 13, y0: t.y + 4, y1: t.y + 26
      });
    });
  });
  L.armchairs.concat(L.library.chairs).forEach(function (A, i) {
    L.footprints.push({ name: 'wing chair ' + i, x0: A.x - 32, x1: A.x + 32, y0: A.y - 16, y1: A.y + 14 });
  });
  L.library.sideTables.forEach(function (s, i) {
    L.footprints.push({ name: 'side table ' + i, x0: s.x - 16, x1: s.x + 16, y0: s.y - 4, y1: s.y + 12, passable: true });
  });
  L.library.lamps.forEach(function (p, i) {
    L.footprints.push({ name: 'reading lamp ' + i, x0: p.x - 9, x1: p.x + 11, y0: p.y - 7, y1: p.y + 1 });
  });
  L.plants.forEach(function (p, i) {
    L.footprints.push({ name: 'plant ' + i, x0: p.x - 13, x1: p.x + 13, y0: p.y - 23, y1: p.y + 1 });
  });
  L.footprints.push({ name: 'coat stand', x0: L.coatStand.x - 12, x1: L.coatStand.x + 10, y0: L.coatStand.y - 6, y1: L.coatStand.y + 2 });
  L.footprints.push({ name: 'magazine basket', x0: L.library.basket.x - 17, x1: L.library.basket.x + 17, y0: L.library.basket.y - 27, y1: L.library.basket.y + 1 });
  L.footprints.push({ name: 'log pile', x0: L.logPile.x - 18, x1: L.logPile.x + 18, y0: L.logPile.y - 20, y1: L.logPile.y + 2 });

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

  function drawTinyPlant(g, x, y) {
    px(g, x, y - 8, 12, 8, '#b5654a');
    px(g, x + 2, y - 10, 8, 2, '#8f4a35');
    px(g, x + 2, y - 16, 2, 6, '#4a7a4a');
    px(g, x + 6, y - 18, 2, 8, '#5a8a52');
    px(g, x + 8, y - 14, 2, 4, '#4a7a4a');
    px(g, x + 4, y - 14, 4, 4, '#5a8a52');
  }

  /* Private renderer contract shared by the scene siblings. */
  SCENE._ = {
    W: W, H: H, L: L,
    px: px, ell: ell, lerp: lerp, shade: shade, h2: h2,
    drawTinyPlant: drawTinyPlant
  };
})();
