/* Café Hygge — background and dynamic wall-layer rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const W = R.W, H = R.H, L = R.L;
  const px = R.px, ell = R.ell, h2 = R.h2, shade = R.shade;
  const drawTinyPlant = R.drawTinyPlant;

  /* ================= BACKGROUND ================= */

  /* Static background cache: everything wall-mounted that never changes is
     rendered once into an offscreen canvas and blitted per frame. Dynamic
     elements (window, door, lamps, flames, clock hands, candle flames,
     machine) are painted on top each frame — in the same relative order the
     one-pass renderer used, so nothing overlaps wrongly. */
  let bgCache = null;
  let menuDoodle = 0;

  SCENE.invalidateBG = function () { bgCache = null; };
  SCENE.setMenuDoodle = function (i) {
    i = Math.max(0, Math.min(5, i | 0));
    if (i === menuDoodle) return;
    menuDoodle = i;
    SCENE.invalidateBG();
  };
  SCENE.getMenuDoodle = function () { return menuDoodle; };

  SCENE.drawScene = function (g, world) {
    if (!bgCache) {
      bgCache = document.createElement('canvas');
      bgCache.width = W; bgCache.height = H;
      drawStaticBG(bgCache.getContext('2d'));
    }
    g.drawImage(bgCache, 0, 0);
    drawFloorLight(g, world); // incident light belongs UNDER objects and their contact shadows

    drawWindow(g, world, L.win, 0);
    drawWindow(g, world, L.win2, 1);
    drawDoor(g, world);
    drawLunafreyaGallery(g, world);
    drawDoormat(g, world);      // floor decor at the threshold; under people/furniture
    drawHangingLamp(g, L.lamp1.x, world);
    drawHangingLamp(g, L.lamp2.x, world);
    drawHangingLamp(g, L.lamp3.x, world);
    drawFireDynamic(g, world);
    drawMachine(g, world);
  };

  function drawFloorLight(g, world) {
    const d = world.pal.daylight, lamp = world.pal.lamp;
    g.save();
    if (d > 0.1) {
      [L.win, L.win2].forEach(function (w) {
        const y = L.wallY + 2, depth = 112;
        const shift = Math.round((world.hour - 12) * 5);
        const light = g.createLinearGradient(0, y, 0, y + depth);
        const a = (0.13 * d * (1 - world.rain * 0.8)).toFixed(3);
        light.addColorStop(0, 'rgba(245,226,174,' + a + ')');
        light.addColorStop(1, 'rgba(245,226,174,0)');
        g.fillStyle = light;
        // Two panes project a widening pool with a quiet mullion gap.
        for (let i = 0; i < 2; i++) {
          const x = w.x + 12 + i * (w.w / 2), width = w.w / 2 - 20;
          g.beginPath();
          g.moveTo(x, y); g.lineTo(x + width, y);
          g.lineTo(x + width + shift + 12, y + depth);
          g.lineTo(x + shift - 12, y + depth); g.closePath(); g.fill();
        }
      });
    }
    // Low, oval pools locate the reading lamps on the floor. The later
    // lighting pass supplies the bloom over fabric and faces.
    L.library.lamps.concat([L.artist.lamp]).forEach(function (lp) {
      if (lamp < 0.05) return;
      g.save(); g.translate(lp.x + 8, lp.y - 1); g.scale(1, 0.3);
      const light = g.createRadialGradient(0, 0, 3, 0, 0, 48);
      light.addColorStop(0, 'rgba(242,198,109,' + (0.16 * lamp).toFixed(3) + ')');
      light.addColorStop(1, 'rgba(242,198,109,0)');
      g.fillStyle = light; g.fillRect(-48, -48, 96, 96); g.restore();
    });
    g.restore();
  }

  /* Two honest wall spaces, and only two: Lunafreya's cat painting settles
     above the fireplace; her hearth study becomes the small warmth above the
     door. Both are lasting MEMORY flags, so a returning café redraws them
     before its first presented frame. */
  function drawLunafreyaGallery(g, world) {
    if (!world.memory || !world.memory.flags) return;
    const flags = world.memory.flags;
    if (flags['lunafreya-cat-painting']) {
      const x = 360, y = 70, w = 56, h = 34;
      px(g, x - 4, y - 4, w + 8, h + 8, '#4a3222');
      px(g, x - 2, y - 2, w + 4, h + 4, '#c9a04a');
      px(g, x, y, w, h, '#8fb5bf');
      px(g, x, y + 23, w, 5, '#6e4a33');
      px(g, x, y + 28, w, 6, '#c9b28a');
      // the café's own cat, curled on the sill
      px(g, x + 20, y + 12, 20, 14, '#c98f4a');
      px(g, x + 22, y + 8, 5, 6, '#c98f4a'); px(g, x + 35, y + 8, 5, 6, '#c98f4a');
      px(g, x + 25, y + 14, 3, 3, '#2a1a12'); px(g, x + 34, y + 14, 3, 3, '#2a1a12');
      px(g, x + 14, y + 22, 8, 4, '#b57c38'); px(g, x + 39, y + 24, 10, 3, '#b57c38');
      px(g, x + 4, y + 5, 3, 16, '#e8dfc9'); px(g, x + 49, y + 5, 3, 16, '#e8dfc9');
      if (flags['cat-wore-scarf']) px(g, x + 20, y + 18, 20, 4, '#a94f3f');
      px(g, x + 2, y + 2, w - 4, 2, 'rgba(255,244,220,0.22)');
    }
    if (flags['lunafreya-hearth-painting']) {
      const x = 36, y = 94, w = 40, h = 26;
      px(g, x - 4, y - 4, w + 8, h + 8, '#4a3222');
      px(g, x - 2, y - 2, w + 4, h + 4, '#c9a04a');
      px(g, x, y, w, h, '#7d4437');
      px(g, x + 7, y + 5, 26, 18, '#2a1a12');
      px(g, x + 10, y + 15, 20, 7, '#b5481c');
      px(g, x + 13, y + 8, 6, 12, '#e06a1e');
      px(g, x + 20, y + 11, 7, 10, '#f5a83c');
      px(g, x + 15, y + 16, 12, 5, '#f8dc8a');
      px(g, x + 3, y + 3, 34, 2, '#8a4d3d');
    }
  }

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
    // Quiet board-to-board variation follows the actual joints; all texture
    // is deterministic and baked once into the background cache.
    for (let row = 0, y = L.wallY; y < H; y += 32, row++) {
      for (let x = -112 + (row % 2) * 40; x < W; x += 112) {
        px(g, x + 2, y, 110, 28, R.shade('#9c6b43', (h2(x, y) - 0.5) * 0.09));
        px(g, x + 5, y + 2, 102, 2, 'rgba(232,201,153,0.075)');
      }
    }
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
    rugWeave(g, 390, 450, 168, 74, '#c9a04a');
    rugWeave(g, L.library.rug.x, L.library.rug.y, L.library.rug.rx, L.library.rug.ry, '#c9b28a');

    drawWallFrame(g, L.wallFrame.x, L.wallFrame.y);
    drawFireplaceStatic(g);
    drawMenuBoard(g);
    drawShelves(g);
    drawFirewood(g);
  }

  /* Sparse stitches in an elliptical border; the centre stays quiet behind
     readers. Pixel clusters, not high-frequency noise or animated texture. */
  function rugWeave(g, cx, cy, rx, ry, thread) {
    g.save();
    for (let y = -ry + 4; y < ry; y += 6) {
      for (let x = -rx + 4; x < rx; x += 8) {
        const r = x * x / (rx * rx) + y * y / (ry * ry);
        if (r > 0.91 || r < 0.65) continue;
        g.globalAlpha = 0.12 + h2(x, y) * 0.1;
        px(g, cx + x, cy + y, 4, 2, thread);
      }
    }
    const junction = g.createLinearGradient(0, L.wallY, 0, L.wallY + 18);
    junction.addColorStop(0, 'rgba(20,12,8,0.2)');
    junction.addColorStop(1, 'rgba(20,12,8,0)');
    g.fillStyle = junction; g.fillRect(0, L.wallY, W, 18);
    g.globalAlpha = 0.16;
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI * 2 / 24;
      const x = Math.round(cx + Math.cos(a) * (rx - 24));
      const y = Math.round(cy + Math.sin(a) * (ry - 11));
      px(g, x - 4, y, 8, 2, thread);
      px(g, x - 2, y - 2, 4, 6, thread);
    }
    g.restore();
  }

  /* ---------- window with the world outside ----------
     Shared by both windows; `alt` picks the stretch of town seen through the
     glass (and keeps the moon in one sky only). */
  function drawWindow(g, world, w, alt) {
    const pal = world.pal, t = world.t;
    // Clip the entire exterior: rain and town silhouettes cannot spill onto the sill.
    g.save();
    g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip();
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
    // town silhouette with lit windows — each window sees its own stretch.
    // The first pane has one named facade whose patient repaint is driven
    // entirely by the persisted street-house arc.
    g.fillStyle = '#2b3242';
    if (alt) {
      g.fillRect(w.x, w.y + 84, 28, w.h - 84);
      g.fillRect(w.x + 32, w.y + 94, 30, w.h - 94);
      // church tower up the street — kept clear of the central mullion
      g.fillRect(w.x + 72, w.y + 62, 16, w.h - 62);
      g.fillRect(w.x + 77, w.y + 54, 6, 8);           // its little spire
      g.fillRect(w.x + 94, w.y + 78, 34, w.h - 78);
      g.fillRect(w.x + 134, w.y + 90, 42, w.h - 90);
      px(g, w.x + 38, w.y + 86, 4, 8, '#2b3242');     // chimney
    } else {
      g.fillRect(w.x, w.y + 88, 30, w.h - 88);
      g.fillRect(w.x + 34, w.y + 56, 46, w.h - 56);   // the painter's house
      g.fillRect(w.x + 88, w.y + 94, 34, w.h - 94);
      g.fillRect(w.x + 128, w.y + 78, 48, w.h - 78);
      px(g, w.x + 40, w.y + 48, 5, 8, '#2b3242');     // chimney
      drawStreetHouse(g, world, w);
    }
    const lit = pal.lamp;
    if (lit > 0.05) {
      g.globalAlpha = lit;
      const townLit = alt
        ? [[8, 94], [18, 112], [40, 104], [78, 78], [102, 94], [116, 112], [144, 104], [162, 118]]
        : [[8, 104], [20, 122], [42, 80], [66, 108], [98, 112], [112, 126], [140, 94], [160, 116]];
      townLit.forEach(function (p) {
        px(g, w.x + p[0], w.y + p[1], 4, 4, '#f5c66a');
      });
      if (!alt && streetHouseDone(world)) {
        // The finished house gains one small warm light of its own.
        px(g, w.x + 58, w.y + 88, 6, 6, '#f5c66a');
      }
      g.globalAlpha = 1;
    }
    if (!alt) drawStreetPainter(g, world, w);
    drawPassersby(g, world, w);
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
    // Lightning catches on the glass rather than flashing the whole room.
    if (world.flash > 0) {
      g.fillStyle = 'rgba(214,229,255,' + (world.flash * 0.15).toFixed(3) + ')';
      g.fillRect(w.x, w.y, w.w, w.h);
    }
    g.restore();
    // glass sits recessed: soft shadow under the top/left of the frame
    px(g, w.x, w.y, w.w, 3, 'rgba(15,10,6,0.3)');
    px(g, w.x, w.y, 3, w.h, 'rgba(15,10,6,0.22)');
    // A quiet glass reflection, interrupted by the wooden glazing bars.
    px(g, w.x + 42, w.y + 8, 2, 42, 'rgba(232,236,245,0.13)');
    px(g, w.x + w.w - 48, w.y + 78, 2, 38, 'rgba(232,236,245,0.09)');
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
    // Small brass casement catch on the central stile.
    px(g, w.x + w.w / 2 + 2, w.y + w.h / 2 + 8, 3, 8, '#c9a04a');
    drawCurtains(g, w);
    // deep sill: lit top, front face, shadow underneath
    px(g, w.x - 14, w.y + w.h + 8, w.w + 28, 8, '#6e4a33');
    px(g, w.x - 14, w.y + w.h + 8, w.w + 28, 2, '#8a6142');
    px(g, w.x - 14, w.y + w.h + 16, w.w + 28, 4, '#5a3d28');
    px(g, w.x - 12, w.y + w.h + 20, w.w + 24, 2, 'rgba(20,12,8,0.25)');
    // window-seat back cushions against the side frames (perched sitters
    // render in front of them); one plant between the perches
    drawSillCushion(g, w.x + 2, w.y + w.h - 16, CUSHIONS[alt]);
    drawSillCushion(g, w.x + w.w - 14, w.y + w.h - 16, CUSHIONS[alt]);
    drawTinyPlant(g, w.x + w.w / 2 - 6, w.y + w.h + 8);
  }

  /* ---------- the street painter ----------
     A distant facade in the first window slowly warms from top to bottom.
     Progress, ladder position, and completion are pure views of MEMORY: the
     render never advances the story, so what the reader sees is exactly what
     the café saved. */
  const STREET_HOUSE = { dx: 34, dy: 56, w: 46 };
  const STREET_PAINT = '#4a3038';

  function streetHouseArc(world) {
    if (!world.memory || !world.memory.arcs) return null;
    const def = ((window.CAST && CAST.arcs) || []).find(function (a) { return a.id === 'street-house'; });
    const rec = world.memory.arcs['street-house'];
    if (!def || !rec) return null;
    const rows = Array.isArray(def.rows) ? def.rows[Math.min(rec.stage || 0, def.rows.length - 1)] : def.rows;
    return { def: def, rec: rec, rows: rows || 7 };
  }

  function streetHouseDone(world) {
    return !!(world.memory && world.memory.flags && world.memory.flags['street-house-painted']);
  }

  function streetFacade(w) {
    return { x: w.x + STREET_HOUSE.dx, y: w.y + STREET_HOUSE.dy,
      w: STREET_HOUSE.w, h: w.h - STREET_HOUSE.dy };
  }

  function drawStreetHouse(g, world, w) {
    const arc = streetHouseArc(world), f = streetFacade(w);
    if (!arc) return;
    // Faint, fixed scars make the cool-blue "before" read as weathered rather
    // than simply another clean town block.
    px(g, f.x + 7, f.y + 10, 13, 2, '#343746');
    px(g, f.x + 27, f.y + 24, 10, 2, '#252d3b');
    px(g, f.x + 4, f.y + 44, 8, 2, '#343746');
    px(g, f.x + 22, f.y + 58, 16, 2, '#252d3b');

    const done = streetHouseDone(world);
    const amount = done ? 1 : Math.max(0, Math.min(1, arc.rec.progress / arc.rows));
    const painted = Math.round(f.h * amount);
    if (painted > 0) {
      px(g, f.x, f.y, f.w, painted, STREET_PAINT);
      // Two uneven brush ends keep the moving edge hand-made without ever
      // drifting independently of saved progress.
      if (!done && painted < f.h) {
        px(g, f.x + 5, f.y + painted, 12, Math.min(3, f.h - painted), STREET_PAINT);
        px(g, f.x + 28, f.y + painted, 9, Math.min(2, f.h - painted), STREET_PAINT);
      }
    }
    px(g, f.x - 2, f.y, f.w + 4, 3, '#232936');        // shallow roof lip
  }

  function drawStreetPainter(g, world, w) {
    const arc = streetHouseArc(world);
    if (!arc || streetHouseDone(world) || arc.rec.stage >= 1) return;
    const f = streetFacade(w);
    const amount = Math.max(0, Math.min(1, arc.rec.progress / arc.rows));
    const lineY = f.y + Math.round((f.h - 5) * amount);
    const baseY = w.y + w.h + 7;
    const ladderTopY = Math.max(f.y + 5, Math.min(baseY - 28, lineY - 10));
    const ladderTopX = f.x + f.w - 10, ladderBaseX = f.x + f.w + 5;

    g.save();
    g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip();
    g.strokeStyle = '#8b7158'; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(ladderTopX - 3, ladderTopY); g.lineTo(ladderBaseX - 3, baseY);
    g.moveTo(ladderTopX + 3, ladderTopY); g.lineTo(ladderBaseX + 3, baseY);
    g.stroke();
    const rungs = Math.max(3, Math.floor((baseY - ladderTopY) / 7));
    for (let i = 1; i < rungs; i++) {
      const q = i / rungs;
      const rx = Math.round(ladderTopX + (ladderBaseX - ladderTopX) * q);
      const ry = Math.round(ladderTopY + (baseY - ladderTopY) * q);
      px(g, rx - 4, ry, 8, 1, '#8b7158');
    }

    // In fair daylight the painter works at the saved paint edge. At night or
    // in rain the same ladder waits against the wall, progress unchanged.
    if (world.daylight > 0.45 && world.rain < 0.3) {
      const feetY = Math.max(f.y + 22, Math.min(baseY - 8, lineY + 10));
      const cx = Math.round(ladderTopX + (ladderBaseX - ladderTopX) *
        ((feetY - ladderTopY) / Math.max(1, baseY - ladderTopY))) - 2;
      px(g, cx - 3, feetY - 13, 7, 9, PASSER);          // coat
      px(g, cx - 2, feetY - 19, 5, 5, PASSER);          // head
      px(g, cx - 2, feetY - 4, 2, 5, PASSER);           // feet on one rung
      px(g, cx + 2, feetY - 4, 2, 5, PASSER);
      const stroke = ((world.t * 2) | 0) % 2;
      px(g, cx - 8 - stroke * 2, feetY - 13 - stroke * 2, 7 + stroke * 2, 2, PASSER);
      px(g, cx - 10 - stroke * 2, feetY - 14 - stroke * 2, 2, 3, '#b88a62');
      px(g, ladderBaseX + 4, baseY - 7, 7, 5, STREET_PAINT);  // little paint tin
      px(g, ladderBaseX + 3, baseY - 8, 9, 2, '#8b7158');
    }
    g.restore();
  }

  /* back cushions for the window perches — red pair in the door-side window,
     green near the counter (the wing-chair swatches, so the room rhymes) */
  const CUSHIONS = [
    { body: '#8a3d3d', light: '#a05252', dark: shade('#8a3d3d', -0.16), seam: 'rgba(40,16,16,0.3)' },
    { body: '#4a7a5a', light: shade('#4a7a5a', 0.22), dark: shade('#4a7a5a', -0.16), seam: 'rgba(16,32,22,0.3)' }
  ];

  const CURTAIN = {
    body: '#9b4d43',
    light: '#b45e4e',
    shadow: '#74362f',
    deep: '#572923',
    tie: '#d2a14f'
  };

  /* Sill-length tied-back drapes frame the weather without crowding the little
     window seats. Their stepped hems keep the folds crisp at native scale. */
  function drawCurtains(g, w) {
    const rodY = w.y - 13;
    px(g, w.x - 13, rodY, w.w + 26, 3, '#4a3020');
    px(g, w.x - 13, rodY, w.w + 26, 1, '#7a5234');
    px(g, w.x - 16, rodY - 1, 3, 5, '#5a3d28');
    px(g, w.x + w.w + 13, rodY - 1, 3, 5, '#5a3d28');

    drawCurtainPanel(g, w.x - 6, w.y - 7, 1);
    drawCurtainPanel(g, w.x + w.w + 6, w.y - 7, -1);

    // four broad loops give the fuller panels enough weight on the rod
    [0, 8, 16, 24].forEach(function (dx) {
      px(g, w.x - 2 + dx, rodY + 2, 2, 5, CURTAIN.deep);
      px(g, w.x + w.w - dx, rodY + 2, 2, 5, CURTAIN.deep);
    });
  }

  function drawCurtainPanel(g, outerX, top, dir) {
    const p = function (n) { return outerX + n * dir; };

    g.fillStyle = CURTAIN.shadow;
    g.beginPath();
    g.moveTo(p(0), top);
    g.lineTo(p(40), top);
    g.lineTo(p(37), top + 24);
    g.lineTo(p(31), top + 48);
    g.lineTo(p(20), top + 66);
    g.lineTo(p(31), top + 148);
    g.lineTo(p(2), top + 148);
    g.closePath();
    g.fill();

    // broad fabric face, recessed edge, and two economical fold highlights
    g.fillStyle = CURTAIN.body;
    g.beginPath();
    g.moveTo(p(3), top + 2);
    g.lineTo(p(36), top + 2);
    g.lineTo(p(33), top + 24);
    g.lineTo(p(27), top + 47);
    g.lineTo(p(16), top + 65);
    g.lineTo(p(27), top + 144);
    g.lineTo(p(5), top + 144);
    g.closePath();
    g.fill();
    px(g, Math.min(p(8), p(10)), top + 4, 2, 54, CURTAIN.light);
    px(g, Math.min(p(19), p(21)), top + 4, 2, 42, CURTAIN.deep);
    px(g, Math.min(p(16), p(22)), top + 61, 6, 5, CURTAIN.tie);
    px(g, Math.min(p(18), p(24)), top + 66, 6, 2, '#9c6b36');
    px(g, Math.min(p(9), p(11)), top + 76, 2, 62, CURTAIN.light);
    px(g, Math.min(p(21), p(23)), top + 82, 2, 52, CURTAIN.deep);
  }

  function drawSillCushion(g, x, top, C) {
    px(g, x + 1, top, 10, 2, C.light);          // rounded, lit crown
    px(g, x, top + 2, 12, 20, C.body);
    px(g, x + 1, top + 22, 10, 2, C.dark);      // rounded base on the sill
    px(g, x + 2, top + 10, 8, 2, C.seam);       // tufting seam
  }

  /* ---------- passers-by beyond the glass ----------
     Silhouettes strolling the pavement, positioned in master-canvas x (state
     in updatePassersby, sim-core.js). Each pane clips its own view of the
     same street, drawn over the town and under the rain on the glass. Feet
     sit below the frame so the sill crops their shoes — the near pavement
     runs closer than the town across the street. */
  const PASSER = '#2c3038';        // existing trouser swatch, darker than the town
  const PASSER_GY = 212;           // pavement line, just below the lowered glass bottom

  function drawPassersby(g, world, w) {
    const list = world.passersby;
    if (!list || !list.length) return;
    g.save();
    g.beginPath();
    g.rect(w.x, w.y, w.w, w.h);
    g.clip();
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.x + 34 < w.x || p.x - 34 > w.x + w.w) continue;
      const stride = p.pausing ? 0 : Math.sin(p.animT * p.speed * 0.19);
      if (p.mate) drawPasserFigure(g, p.x + p.mate.dx, p.mate.h, -stride, p.dir, p.hurried);
      drawPasserFigure(g, p.x, p.h, stride, p.dir, p.hurried);
      if (p.umbrella) {
        const ux = p.mate ? p.x + p.mate.dx / 2 : p.x;
        const top = PASSER_GY - (p.mate ? Math.max(p.h, p.mate.h) : p.h);
        drawPasserUmbrella(g, ux, top, p);
      }
    }
    g.restore();
  }

  function drawPasserFigure(g, cx, h, stride, dir, hurried) {
    cx = Math.round(cx);
    const top = PASSER_GY - h;
    const legH = Math.round(h * 0.42);
    const hipY = PASSER_GY - legH;
    const bob = Math.round(Math.abs(stride));        // 1 px gait bob
    const lean = hurried ? dir * 2 : 0;              // leaning into the rain
    const spread = Math.round(legH * 0.4 * stride);
    passerLeg(g, cx, hipY, cx + spread);
    passerLeg(g, cx, hipY, cx - spread);
    // coat with a slight flare at the hem
    px(g, cx - 4 + lean, top + 7 + bob, 9, hipY - top - 5 - bob, PASSER);
    px(g, cx - 5 + lean, hipY - 4, 11, 6, PASSER);
    // head over shoulders, nudged the way they're going
    px(g, cx - 4 + lean, top + 6 + bob, 9, 3, PASSER);
    px(g, cx - 2 + lean + dir, top + bob, 5, 2, PASSER);
    px(g, cx - 3 + lean + dir, top + 2 + bob, 7, 5, PASSER);
  }

  /* one leg as two stacked segments: thigh toward the hip, shin to the foot */
  function passerLeg(g, hx, hipY, fx) {
    const half = Math.round((PASSER_GY - hipY) / 2);
    const mx = Math.round((hx + fx) / 2);
    px(g, mx - 1, hipY, 3, half, PASSER);
    px(g, fx - 1, hipY + half, 3, PASSER_GY - hipY - half, PASSER);
  }

  function drawPasserUmbrella(g, cx, headTop, p) {
    const c = shade(p.umbrella.color, -0.28);        // muted through the wet glass
    const wide = p.mate ? 30 : 22;                   // a pair shares one canopy
    const ux = Math.round(cx + (p.hurried ? p.dir * 3 : p.dir));
    const uy = headTop - 10;
    px(g, ux - wide / 2 + 7, uy, wide - 14, 2, c);
    px(g, ux - wide / 2 + 3, uy + 2, wide - 6, 2, c);
    px(g, ux - wide / 2, uy + 4, wide, 3, c);
    for (let sx = ux - wide / 2; sx <= ux + wide / 2 - 4; sx += 6) {
      px(g, sx, uy + 7, 4, 1, c);                    // scalloped edge
    }
    px(g, ux - 1, uy - 3, 2, 3, c);                  // ferrule
    px(g, ux, uy + 7, 1, headTop + 14 - (uy + 7), PASSER);   // shaft to the hand
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
      if (world.flash > 0) {
        g.fillStyle = 'rgba(214,229,255,' + (world.flash * 0.15).toFixed(3) + ')';
        g.fillRect(d.x + 8, d.y + 12, d.w - 16, 30);
      }
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

  /* ---------- doormat ----------
     A woven coir mat across the threshold. Its coir field and bristles are
     deterministic (h2) so they never flicker; the whole mat darkens toward a
     damp tone with world.rain, and a rain-blue sheen catches the light in a
     downpour — the visual half of the rainy-arrival "wipe your shoes" beat. */
  function drawDoormat(g, world) {
    const m = L.doormat;
    const wet = Math.max(0, Math.min(1, world.rain));
    const halfW = m.w >> 1, halfH = m.h >> 1;
    const x0 = m.x - halfW, y0 = m.y - halfH;
    const base = shade('#8a6142', -0.32 * wet);      // damp coir goes darker
    const edge = shade('#4a3222', -0.15 * wet);
    ell(g, m.x, y0 + m.h + 1, halfW, 4, 'rgba(20,12,8,0.18)');   // grounding shadow
    px(g, x0, y0, m.w, m.h, edge);                                // dark woven border
    px(g, x0 + 3, y0 + 3, m.w - 6, m.h - 6, base);               // coir field
    px(g, x0 + 3, y0 + 3, m.w - 6, 2, shade(base, 0.14));        // lit top plane
    // bristle rows: short dashes, deterministic so they never flicker
    for (let bx = x0 + 5; bx < x0 + m.w - 5; bx += 4) {
      const n = h2(bx, 21);
      const by = y0 + 5 + ((n * (m.h - 12)) | 0);
      px(g, bx, by, 2, 3 + ((h2(bx, 7) * 3) | 0), shade(base, n > 0.5 ? 0.12 : -0.16));
    }
    if (wet > 0.3) {                                              // rain catches the light
      g.globalAlpha = (wet - 0.3) * 0.45;
      px(g, x0 + 6, y0 + 6, m.w - 14, 2, '#cfe0ec');
      g.globalAlpha = 1;
    }
  }

  /* ---------- fireplace ---------- */
  function drawFireplaceStatic(g) {
    const f = L.fire;
    // Plastered flue continues to the ceiling; shallow side planes locate
    // the masonry in front of the wall instead of ending behind the clock.
    px(g, f.x + 3, 0, f.w, 232, 'rgba(50,30,20,0.14)');
    px(g, f.x, 0, f.w, 132, '#c9b28a');
    px(g, f.x + 3, 0, f.w - 9, 132, shade('#e3cfa7', -0.06));
    px(g, f.x, 0, 3, 132, '#e3cfa7');
    px(g, f.x + f.w - 6, 0, 6, 132, shade('#c9b28a', -0.08));
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
    // Recessed sides and a brick lintel give the opening a load-bearing surround.
    px(g, f.x, 144, 3, 88, '#744033');
    px(g, f.x + f.w - 4, 144, 4, 88, '#5f3229');
    px(g, f.boxX - 6, f.boxTop - 12, f.boxW + 12, 8, '#86493c');
    for (let x = f.boxX - 4; x < f.boxX + f.boxW + 6; x += 10)
      px(g, x, f.boxTop - 12, 2, 8, '#5f3229');
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
    px(g, f.x - 4, f.boxBot + 3, f.w + 8, 7, shade('#8a8378', -0.2));
    px(g, f.x - 6, f.boxBot, f.w + 12, 5, '#8a8378');
    px(g, f.x - 6, f.boxBot, f.w + 12, 2, '#a39c8f');
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
    // The live burn (0..1) scales the flames: a full log throws tall tongues,
    // embers leave only the glowing coal bed. `flame` is 0 at the ember floor.
    const lvl = world.fire ? world.fire.level : 1;
    const flame = Math.max(0, (lvl - 0.16) / 0.84);
    for (let i = 0; i < 3; i++) {                       // back layer: broad, slow, deep
      const fx = f.boxX + 5 + i * 14;
      const hh = Math.round((20 + 8 * Math.sin(t * 3.3 + i * 2.2)) * flame);
      if (hh >= 3) px(g, fx, f.boxBot - 13 - hh, 12, hh, '#b5481c');
    }
    for (let i = 0; i < 5; i++) {                       // mid tongues + bright core
      const fx = f.boxX + 4 + i * 8.2;
      const hh = Math.round((15 + 8 * Math.sin(t * 6.2 + i * 1.9) + 4 * Math.sin(t * 13 + i * 5.1)) * flame);
      if (hh >= 3) {
        px(g, fx, f.boxBot - 15 - hh, 8, hh, '#e06a1e');
        px(g, fx + 2, f.boxBot - 15 - Math.round(hh * 0.62), 5, Math.round(hh * 0.62), '#f5a83c');
        px(g, fx + 3, f.boxBot - 15 - Math.round(hh * 0.3), 3, Math.round(hh * 0.3), '#f8dc8a');
      }
    }
    for (let i = 0; i < 8; i++) {                       // coals under the logs — never dark
      const gl = 0.4 + 0.4 * Math.sin(t * 3.1 + i * 2.7);
      g.globalAlpha = Math.max(0.15, gl) * (0.55 + 0.45 * lvl);
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
    const lit = world.candles ? world.candles.mantel : 0;
    if (lit <= 0.03) return;
    const h = Math.max(2, Math.round(6 * lit));
    const a = (0.65 + 0.35 * Math.sin(world.t * 11 + seed * 2.6)) * lit;
    g.globalAlpha = a;
    px(g, x + 2, y - 12 - h, 2, h, '#f5b942');
    if (lit > 0.3) px(g, x + 2, y - 14 - h, 2, 2, '#f8dc8a');
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
    // A substantial oak frame sits off the wall, with recessed slate inside.
    px(g, m.x + 3, m.y + 4, m.w, m.h + 2, 'rgba(30,18,10,0.22)');
    px(g, m.x, m.y, m.w, m.h, '#5a3d28');
    px(g, m.x, m.y, m.w, 3, '#9c6b43');
    px(g, m.x, m.y + 3, 3, m.h - 3, '#7d5334');
    px(g, m.x + m.w - 3, m.y + 3, 3, m.h - 3, '#4a3222');
    px(g, m.x + 6, m.y + 6, m.w - 12, m.h - 12, '#2c3038');
    px(g, m.x + 6, m.y + 6, m.w - 12, 2, 'rgba(0,0,0,0.3)');
    px(g, m.x + 6, m.y + 8, 2, m.h - 14, 'rgba(0,0,0,0.18)');
    // The title and four rows have separate margins; even the widest doodle
    // fits beside the prices without touching the frame or the lettering.
    SCENE.chalkText(g, m.x + 23, m.y + 15, 'CAFÉ HYGGE', '#e8dfc9');
    px(g, m.x + 16, m.y + 28, m.w - 32, 2, 'rgba(232,223,201,0.35)');
    ['KAFFE', 'MATCHA', 'KAKAO', 'BOLLER'].forEach(function (label, i) {
      const y = m.y + 36 + i * 15;
      SCENE.chalkText(g, m.x + 16, y, label, 'rgba(220,214,196,0.82)');
      px(g, m.x + 78, y + 5, 10, 2, 'rgba(220,214,196,0.6)');
    });
    drawMenuDoodle(g, m.x + 94, m.y + 61, menuDoodle);
    // Projecting chalk tray: bright top, dark front, chalk and a little eraser.
    px(g, m.x - 3, m.y + m.h - 2, m.w + 6, 4, '#8a6142');
    px(g, m.x - 3, m.y + m.h + 2, m.w + 6, 3, '#5a3d28');
    px(g, m.x, m.y + m.h + 5, m.w + 3, 2, 'rgba(30,18,10,0.2)');
    px(g, m.x + 16, m.y + m.h - 4, 8, 2, '#e8dfc9');
    px(g, m.x + m.w - 26, m.y + m.h - 6, 14, 4, '#6e4a33');
    px(g, m.x + m.w - 26, m.y + m.h - 6, 14, 2, '#9c6b43');
  }

  function drawMenuDoodle(g, x, y, id) {
    const c = 'rgba(220,214,196,0.7)';
    if (id === 1) { // curled sleeping cat
      px(g, x + 2, y + 6, 10, 5, c); px(g, x + 7, y + 3, 5, 5, c);
      px(g, x + 8, y + 1, 2, 3, c); px(g, x + 11, y + 1, 2, 3, c);
      px(g, x, y + 8, 4, 2, c); px(g, x, y + 6, 2, 3, c);
      px(g, x + 8, y + 5, 3, 2, '#2c3038');
    } else if (id === 2) { // steaming cup
      px(g, x + 1, y + 6, 10, 6, c); px(g, x + 11, y + 7, 3, 3, c);
      px(g, x + 3, y + 3, 2, 2, c); px(g, x + 6, y + 1, 2, 3, c);
      px(g, x + 10, y + 2, 2, 3, c);
    } else if (id === 3) { // sprig
      px(g, x + 6, y + 1, 2, 12, c);
      px(g, x + 2, y + 3, 4, 2, c); px(g, x + 1, y + 1, 3, 2, c);
      px(g, x + 8, y + 5, 4, 2, c); px(g, x + 11, y + 3, 2, 2, c);
      px(g, x + 2, y + 8, 4, 2, c); px(g, x + 1, y + 10, 3, 2, c);
    } else if (id === 4) { // umbrella
      px(g, x + 2, y + 4, 12, 2, c); px(g, x + 4, y + 2, 8, 2, c);
      px(g, x + 7, y, 2, 10, c); px(g, x + 7, y + 9, 5, 2, c);
      px(g, x + 10, y + 8, 2, 2, c);
    } else if (id === 5) { // bamboo whisk
      px(g, x + 7, y, 2, 7, c);
      px(g, x + 4, y + 6, 8, 2, c);
      px(g, x + 2, y + 8, 2, 5, c); px(g, x + 5, y + 8, 2, 4, c);
      px(g, x + 9, y + 8, 2, 4, c); px(g, x + 12, y + 8, 2, 5, c);
    } else { // heart
      px(g, x + 2, y + 4, 2, 2, c); px(g, x + 6, y + 4, 2, 2, c);
      px(g, x + 2, y + 6, 6, 2, c); px(g, x + 3, y + 8, 4, 2, c);
      px(g, x + 4, y + 10, 2, 2, c);
    }
  }

  function drawShelves(g) {
    // shelf boards — shortened to make wall room for the menu chalkboard
    px(g, 636, 104, 164, 8, '#7d5334');
    px(g, 636, 148, 164, 8, '#7d5334');
    px(g, 644, 112, 4, 6, '#5f402c'); px(g, 788, 112, 4, 6, '#5f402c');
    px(g, 644, 156, 4, 6, '#5f402c'); px(g, 788, 156, 4, 6, '#5f402c');
    // Bevelled boards and proper wall brackets; dishes touch the top plane.
    [104, 148].forEach(function (y) {
      px(g, 636, y, 164, 2, '#9c6b43');
      px(g, 636, y + 6, 164, 2, '#5f402c');
      px(g, 638, y + 8, 162, 2, 'rgba(30,18,10,0.16)');
      [644, 788].forEach(function (x) {
        px(g, x, y + 8, 3, 12, '#5f402c');
        px(g, x + 3, y + 8, 5, 3, '#6e4a33');
        px(g, x + 3, y + 11, 3, 3, '#6e4a33');
      });
    });
    // shelf 1: cups only; the clear right end is the cat's long-established
    // high perch (at least 32 px of uninterrupted board).
    const cupCols = ['#d9d2c0', '#a94f3f', '#4a7a5a', '#d9a05a', '#7a89a5'];
    for (let i = 0; i < 5; i++) {
      px(g, 648 + i * 18, 92, 10, 12, cupCols[i]);
      px(g, 658 + i * 18, 96, 2, 4, cupCols[i]);
      px(g, 648 + i * 18, 92, 10, 2, shade(cupCols[i], 0.2));
      px(g, 648 + i * 18, 94, 2, 7, shade(cupCols[i], 0.12));
      px(g, 654 + i * 18, 95, 4, 9, shade(cupCols[i], -0.13));
    }
    // shelf 2: teapot, plates, jars, the displaced books, and one mug
    px(g, 648, 134, 22, 14, '#e8e0d0'); px(g, 670, 138, 6, 4, '#e8e0d0'); px(g, 656, 130, 6, 4, '#e8e0d0');
    px(g, 650, 134, 3, 10, shade('#e8e0d0', 0.12));
    px(g, 664, 140, 6, 8, '#d9d2c0');
    px(g, 651, 146, 16, 2, '#c9c2b0');
    px(g, 692, 140, 18, 8, '#c9c2b0'); px(g, 694, 136, 14, 2, '#b5aa92'); px(g, 694, 144, 14, 2, '#b5aa92');
    px(g, 724, 132, 12, 16, '#d9973f'); px(g, 726, 128, 8, 4, '#8a611e');
    px(g, 744, 136, 12, 12, '#a5763f'); px(g, 746, 132, 8, 4, '#6e4a26');
    px(g, 760, 128, 6, 20, '#8a4a3a'); px(g, 768, 132, 6, 16, '#4a5a7a');
    px(g, 780, 136, 10, 12, '#4a7a5a');
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
    px(g, x + 2, y + 3, 24, 30, 'rgba(50,30,20,0.18)');
    px(g, x, y, 24, 30, '#8a6142');
    px(g, x, y, 24, 2, '#c9b28a');
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
    px(g, m.x + 3, m.y + 11, m.w - 6, 2, '#d3d9de');
    px(g, m.x + 5, m.y + 15, 4, 18, 'rgba(255,255,255,0.16)');
    px(g, m.x + m.w - 8, m.y + 14, 5, 22, 'rgba(60,65,77,0.16)');
    px(g, m.x + 4, m.y + 35, m.w - 8, 2, '#8a919c');
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
    const machineStages = ['grind', 'tamp', 'pull', 'steam', 'kettle'];
    if (brew && brew.active && machineStages.indexOf(brew.stage) >= 0) {
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
