/* Café Hygge — depth-sorted furniture rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const L = R.L;
  const px = R.px, ell = R.ell, shade = R.shade, h2 = R.h2;
  const drawTinyPlant = R.drawTinyPlant;

  /* ================= FURNITURE (depth-sorted) ================= */

  SCENE.furnitureDrawables = function (world) {
    const out = [];
    const C = L.counter;
    const SHADOW = 'rgba(20,12,8,0.2)';

    // The lid's depth stack is done with baselines: the lamp draws just below
    // the cat's anchor y so a lid cat covers its stem (the lamp stands at the
    // lid's back), while the case — and the drink on the saucer spot, drawn
    // with it — draws at the floor baseline, in front of the cat. The bench
    // and upright share that baseline; insertion order keeps the bench behind
    // the piano, and entity drawables place a sitter in front of both.
    const pianoTable = world.tables.find(function (tb) { return tb.piano; });
    const artistTable = world.tables.find(function (tb) { return tb.artist; });
    out.push({ y: L.piano.catAnchor.y - 1, draw: function (g) { drawPianoLamp(g, world); } });
    out.push({ y: L.piano.baseline, draw: function (g) { drawPianoBench(g); } });
    out.push({ y: L.piano.baseline, draw: function (g) { drawPiano(g, pianoTable, world); } });

    // Lunafreya's studio is a permanent part of the piano corner. The easel
    // sits behind her baseline; the little table lands just in front so a cup
    // can be shared with the normal service/bussing pipeline.
    out.push({ y: L.artist.easel.baseline, draw: function (g) { drawArtistEasel(g, world); } });
    out.push({ y: L.artist.stool.y, draw: function (g) { drawArtistStool(g); } });
    out.push({ y: L.artist.table.base, draw: function (g) { drawArtistTable(g, artistTable); } });

    // tables + their seats (chair with a back on the left, stool on the right);
    // the nook's small side tables carry items but seat no one themselves
    world.tables.forEach(function (tb, i) {
      const cx = tb.x, cy = tb.y;
      if (tb.piano || tb.artist) return;
      if (tb.small) {
        out.push({ y: cy + 12, draw: function (g) { drawSideTable(g, cx, cy, tb, world); } });
        return;
      }
      if (tb.tall) {
        out.push({ y: tb.base, draw: function (g) { drawTallTable(g, cx, cy, tb.base, tb.items); } });
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
        // candle jar stays visible while its flame follows the ritual state
        px(g, cx - 4, cy - 14, 8, 8, '#c9b28a');
        px(g, cx - 3, cy - 12, 6, 3, '#f0e0c8');
        if (tb.candle > 0.3) {
          g.globalAlpha = tb.candle * (0.6 + 0.4 * Math.sin(world.t * 9 + i * 2.1));
          px(g, cx - 1, cy - 17, 2, 4, '#f5b942');
          px(g, cx - 1, cy - 19, 2, 2, '#f8dc8a');
          g.globalAlpha = 1;
        }
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

    // The cat's corner is split by baseline: cushion behind the cat, bowls
    // in front when it lowers its head to eat or drink.
    out.push({ y: L.catCorner.cushion.y, draw: function (g) { drawCatCushion(g); } });
    out.push({ y: L.catCorner.food.y, draw: function (g) { drawCatBowls(g, world.catBowls); } });

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

    // A small slatted crock for rainy arrivals. The state is intentionally
    // only the umbrellas currently visible in the room, never inventory UI.
    const US = L.umbrellaStand;
    out.push({ y: US.y, draw: function (g) {
      const umbrellas = world.umbrellaStand || [];
      ell(g, US.x, US.y - 1, 10, 3, SHADOW);
      umbrellas.slice(-4).forEach(function (u, i) {
        const col = typeof u === 'string' ? u : u.color;
        const ux = US.x - 6 + i * 4, top = US.y - 30 - (i % 2) * 3;
        px(g, ux, top, 2, 25, '#3a2a1c');
        px(g, ux - 1, top + 7, 4, 9, col);
        px(g, ux, top - 3, 5, 2, '#3a2a1c');
        px(g, ux + 3, top - 2, 2, 4, '#3a2a1c');
      });
      px(g, US.x - 9, US.y - 20, 18, 18, '#6b4529');
      px(g, US.x - 11, US.y - 21, 22, 4, '#8a6142');
      px(g, US.x - 6, US.y - 18, 2, 14, '#4a3222');
      px(g, US.x - 1, US.y - 18, 2, 14, '#4a3222');
      px(g, US.x + 4, US.y - 18, 2, 14, '#4a3222');
      px(g, US.x - 9, US.y - 5, 18, 3, '#4a3222');
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
    const LP = L.logPile;
    out.push({ y: LP.y + 2, draw: function (g) {
      ell(g, LP.x, LP.y, 18, 5, SHADOW);
      px(g, LP.x - 15, LP.y - 6, 30, 6, '#6b4429'); ell(g, LP.x - 15, LP.y - 3, 3, 3, '#8a6142');
      px(g, LP.x - 13, LP.y - 12, 26, 6, '#5a3520'); ell(g, LP.x + 13, LP.y - 9, 3, 3, '#8a6142');
      px(g, LP.x - 9, LP.y - 18, 20, 6, '#6b4429'); ell(g, LP.x - 9, LP.y - 15, 3, 3, '#8a6142');
    } });

    // the counter itself
    out.push({ y: C.baseY, draw: function (g) { drawCounter(g, world); } });

    return out;
  };

  function drawPianoBench(g) {
    const B = L.piano.bench;
    ell(g, B.x, B.y + 2, 13, 4, 'rgba(20,12,8,0.2)');
    px(g, B.x - 9, B.y - 13, 3, 13, '#4a3222');
    px(g, B.x + 6, B.y - 13, 3, 13, '#4a3222');
    px(g, B.x - 7, B.y - 7, 14, 2, '#4a3222');            // stretcher
    px(g, B.x - 11, B.y - 18, 22, 5, '#6b4529');          // rectangular seat — a bench, not a stool
    px(g, B.x - 11, B.y - 18, 22, 2, shade('#6b4529', 0.16));
  }

  function artistArc(world) {
    if (!world.memory || !world.memory.arcs) return null;
    const def = ((window.CAST && CAST.arcs) || []).find(function (a) { return a.id === 'lunafreya-paintings'; });
    const rec = world.memory.arcs['lunafreya-paintings'];
    if (!def || !rec) return null;
    const rows = Array.isArray(def.rows) ? def.rows[Math.min(rec.stage, def.rows.length - 1)] : def.rows;
    return { def: def, rec: rec, amount: rec.pendingBeat ? 1 : Math.max(0, Math.min(1, rec.progress / rows)) };
  }

  function drawCanvasSubject(g, c, stage, amount, world) {
    // Each band only adds pixels. The image is therefore a pure, deterministic
    // reading of the persisted (stage, progress), with no per-frame randomness.
    if (amount >= 0.12) {
      const ink = '#8b8070';
      if (stage === 0) {
        px(g, c.x + 5, c.y + 10, 30, 2, ink);
        px(g, c.x + 7, c.y + 33, 27, 2, ink);
        px(g, c.x + 16, c.y + 19, 12, 14, ink);
        px(g, c.x + 17, c.y + 16, 3, 4, ink); px(g, c.x + 25, c.y + 16, 3, 4, ink);
      } else {
        px(g, c.x + 6, c.y + 8, 28, 2, ink);
        px(g, c.x + 8, c.y + 12, 2, 29, ink); px(g, c.x + 31, c.y + 12, 2, 29, ink);
        px(g, c.x + 10, c.y + 39, 21, 2, ink);
      }
    }
    if (amount >= 0.34) {
      if (stage === 0) {
        px(g, c.x + 5, c.y + 8, 30, 22, '#8fb5bf');
        px(g, c.x + 5, c.y + 28, 30, 8, '#6e4a33');
        px(g, c.x + 5, c.y + 35, 30, 10, '#c9b28a');
      } else {
        px(g, c.x + 5, c.y + 7, 30, 37, '#7d4437');
        px(g, c.x + 10, c.y + 16, 20, 25, '#33231d');
      }
    }
    if (amount >= 0.58) {
      if (stage === 0) {
        px(g, c.x + 15, c.y + 19, 14, 15, '#c98f4a');
        px(g, c.x + 17, c.y + 16, 4, 5, '#c98f4a'); px(g, c.x + 25, c.y + 16, 4, 5, '#c98f4a');
        px(g, c.x + 12, c.y + 29, 5, 4, '#c98f4a');
      } else {
        px(g, c.x + 12, c.y + 27, 16, 12, '#b5481c');
        px(g, c.x + 15, c.y + 20, 5, 14, '#e06a1e');
        px(g, c.x + 21, c.y + 23, 5, 13, '#f5a83c');
      }
    }
    if (amount >= 0.82) {
      if (stage === 0) {
        px(g, c.x + 18, c.y + 22, 2, 3, '#2a1a12'); px(g, c.x + 25, c.y + 22, 2, 3, '#2a1a12');
        px(g, c.x + 20, c.y + 28, 6, 2, '#e0b06a');
        px(g, c.x + 27, c.y + 31, 6, 2, '#b57c38');
        if (world.memory.flags['cat-wore-scarf']) px(g, c.x + 15, c.y + 26, 14, 3, '#a94f3f');
        px(g, c.x + 8, c.y + 13, 2, 12, '#e8dfc9');
        px(g, c.x + 32, c.y + 13, 2, 12, '#e8dfc9');
      } else {
        px(g, c.x + 13, c.y + 31, 14, 5, '#f8dc8a');
        px(g, c.x + 7, c.y + 11, 26, 2, '#8a4d3d');
        px(g, c.x + 7, c.y + 20, 26, 2, '#744033');
        px(g, c.x + 7, c.y + 42, 26, 2, '#5a3d28');
      }
    }
  }

  function drawArtistEasel(g, world) {
    const E = L.artist.easel, c = E.canvas;
    ell(g, E.x, E.baseline + 1, 27, 5, 'rgba(20,12,8,0.2)');
    px(g, E.x - 3, c.y - 6, 6, E.baseline - c.y + 5, '#6b4529');
    px(g, E.x - 20, E.trayY, 42, 5, '#5a3d28');
    px(g, E.x - 18, E.trayY, 38, 2, '#8a6142');
    px(g, E.x - 23, E.trayY + 4, 5, E.baseline - E.trayY - 1, '#5a3d28');
    px(g, E.x + 18, E.trayY + 4, 5, E.baseline - E.trayY - 1, '#5a3d28');
    px(g, c.x - 3, c.y - 3, c.w + 6, c.h + 6, '#5a3d28');
    px(g, c.x, c.y, c.w, c.h, '#e8e0cf');
    px(g, c.x + c.w, c.y + 3, 3, c.h, '#c9bfa8');
    const arc = artistArc(world);
    if (arc && arc.rec.stage < 2) drawCanvasSubject(g, c, arc.rec.stage, arc.amount, world);
    else {
      px(g, c.x + 6, c.y + 8, c.w - 12, 2, '#d9d0bc');
      px(g, c.x + 8, c.y + 14, 15, 2, '#d9d0bc');
    }
    // paint daubs and the water jar remain even after the gallery is complete
    ['#a94f3f', '#c9a04a', '#4a7a5a', '#5a7a8a'].forEach(function (col, i) {
      px(g, E.x - 14 + i * 8, E.trayY - 3, 5, 3, col);
    });
    px(g, E.x + 14, E.trayY - 11, 7, 11, 'rgba(170,196,202,0.72)');
    px(g, E.x + 16, E.trayY - 13, 2, 10, '#8b7158');
  }

  function drawArtistStool(g) {
    const s = L.artist.stool;
    ell(g, s.x, s.y + 3, 13, 4, 'rgba(20,12,8,0.2)');
    px(g, s.x - 8, s.y - 13, 3, 14, '#4a3222');
    px(g, s.x + 5, s.y - 13, 3, 14, '#4a3222');
    px(g, s.x - 8, s.y - 7, 16, 2, '#5a3d28');
    ell(g, s.x, s.y - 15, 13, 5, '#8a6142');
    px(g, s.x - 8, s.y - 18, 16, 2, '#a5764f');
  }

  function drawArtistTable(g, tb) {
    const t = L.artist.table;
    ell(g, t.x, t.base, 16, 4, 'rgba(20,12,8,0.2)');
    px(g, t.x - 3, t.y, 6, t.base - t.y - 3, '#5a3d28');
    px(g, t.x - 10, t.base - 5, 20, 4, '#4a3222');
    ell(g, t.x, t.y, 16, 6, '#6e4c30');
    ell(g, t.x, t.y - 3, 16, 6, '#8a6142');
    px(g, t.x - 12, t.y - 6, 18, 2, 'rgba(90,58,34,0.3)');
    if (tb) tb.items.forEach(function (it) { if (!it.hidden) drawTableItem(g, t.saucer.x, t.saucer.y - 2, it, 0); });
    px(g, t.x + 7, t.y - 18, 7, 14, '#b5654a');
    px(g, t.x + 9, t.y - 25, 2, 10, '#8b7158');
    px(g, t.x + 12, t.y - 23, 2, 8, '#8b7158');
  }

  /* The brass piano lamp is its own drawable, one baseline above the cat's
     lid anchor: it stands at the BACK of the lid, so a resting cat must cover
     its stem while the additive glow (drawLighting) still lands on top. */
  function drawPianoLamp(g, world) {
    const P = L.piano, lp = P.lamp, brass = '#c9a04a';
    px(g, P.x + 1, P.y - 6, 6, 2, brass);                 // base on the lid, at the back
    px(g, P.x + 2, P.y - 20, 2, 14, brass);               // stem
    px(g, P.x + 2, P.y - 22, lp.x - P.x - 2, 2, brass);   // arm arched toward the room
    px(g, lp.x - 4, lp.y - 1, 8, 3, world.pal.lamp > 0.2 ? '#f2c66d' : '#e8dfc9');
    px(g, lp.x - 3, lp.y + 2, 6, 2, shade('#e8dfc9', -0.2));
  }

  function drawPiano(g, tb, world) {
    const P = L.piano;
    const dark = '#4a3222', body = '#5a3d28', panel = '#6b4529', brass = '#c9a04a';
    ell(g, 36, P.baseline + 2, 24, 5, 'rgba(20,12,8,0.22)');
    // the profile: a tall narrow case, back to the room's edge, front lit
    px(g, P.x, P.y, P.w, P.baseline - P.y, dark);
    px(g, P.x + 2, P.y + 2, P.w - 4, P.baseline - P.y - 6, body);
    px(g, P.x + P.w - 4, P.y + 2, 2, P.baseline - P.y - 6, shade(body, 0.12));
    px(g, P.x + 5, P.y + 8, P.w - 10, 26, panel);         // recessed side panel
    px(g, P.x + 6, P.y + 10, P.w - 12, 2, shade(panel, 0.16));
    px(g, P.x + 6, P.y + 30, P.w - 12, 2, shade(panel, -0.2));
    px(g, P.x + 1, P.baseline - 7, P.w - 2, 5, shade(body, -0.18));   // plinth
    // lid, seen edge-on; the cat's paw line hides behind its light strip
    px(g, P.x - 2, P.y - 4, P.w + 6, 4, dark);
    px(g, P.x - 1, P.y - 4, P.w + 4, 2, shade(body, 0.18));
    // keybed stub toward the player — in profile the keys are a short shelf,
    // cream top peeking past the cheek, never a long row
    px(g, P.keyboardX, P.keyboardY - 4, P.keyboardW, 8, dark);
    px(g, P.keyboardX + 2, P.keyboardY - 4, P.keyboardW - 2, 3, '#e8e0d0');
    px(g, P.keyboardX + 5, P.keyboardY - 4, 2, 2, dark);  // black-key hints
    px(g, P.keyboardX + 9, P.keyboardY - 4, 2, 2, dark);
    px(g, P.keyboardX, P.keyboardY + 4, P.keyboardW, 2, 'rgba(20,12,8,0.18)');
    // the score's edge on the rest, above the fallboard
    px(g, P.keyboardX, P.y + 10, 2, 6, '#e8dfc9');
    // the toe block carries the keybed's line to the floor; one pedal in profile
    px(g, P.x + P.w - 2, P.baseline - 6, 10, 6, dark);
    px(g, P.x + P.w + 6, P.baseline - 5, 4, 2, brass);
    if (tb) tb.items.forEach(function (it) {
      if (!it.hidden) drawTableItem(g, P.saucer.x, P.saucer.y - 2, it, 0);
    });
  }

  /* ---------- armchairs (fireside red, reading-nook green) ----------
     Read from the SIDE, facing the way `dir` points. The backrest is the
     only vertical element and stands at the back (behind the sitter, on the
     side away from the facing direction). The near armrest is a horizontal
     roll that protrudes forward in the facing direction, drawn in the FRONT
     half so it passes in front of the sitter and hides their lap and legs —
     you see them from about the waist up. m() mirrors an x-offset for
     dir = -1; upholstery colors come in as a swatch so both pairs share it. */
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
    ell(g, A.x, A.y + 9, 32, 8, 'rgba(20,12,8,0.2)');           // floor shadow
    px(g, m(-16, 14), A.y - 52, 14, 58, C.body);                // backrest — the only vertical
    px(g, m(-16, 14), A.y - 52, 14, 4, C.light);                // rounded top roll
    px(g, m(-13, 2), A.y - 46, 2, 42, C.seam);                  // back seam
  }

  function wingChairFront(g, A, C) {
    const m = function (off, w) { return A.x + (A.dir > 0 ? off : -off - w); };
    // seat the sitter sinks into — drawn over the legs
    px(g, m(-16, 42), A.y - 6, 42, 12, C.cushion);             // seat cushion
    px(g, m(-16, 42), A.y - 6, 42, 3, C.light);                // cushion top light
    // near armrest: a horizontal roll protruding forward, passing in front
    // of the sitter so their lap and legs are hidden behind it
    px(g, m(-8, 36), A.y - 18, 36, 12, C.body);                // arm roll
    px(g, m(-8, 36), A.y - 18, 36, 4, C.light);                // arm top light
    px(g, m(26, 3), A.y - 16, 3, 9, C.front);                  // rounded front cap
    px(g, m(-8, 36), A.y - 8, 36, 2, C.piping);                // seam under the arm
    // front skirt + feet
    px(g, m(-16, 45), A.y + 6, 45, 8, C.front);
    px(g, m(-13, 7), A.y + 13, 7, 4, '#4a3222'); px(g, m(21, 7), A.y + 13, 7, 4, '#4a3222');
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
  function drawSideTable(g, sx, sy, tb, world) {
    ell(g, sx, sy + 10, 15, 4, 'rgba(20,12,8,0.2)');
    px(g, sx - 3, sy, 6, 10, '#5a3d28');             // pedestal
    px(g, sx - 3, sy, 2, 10, '#6e4c30');
    px(g, sx - 9, sy + 8, 18, 4, '#4a3222');         // foot
    ell(g, sx, sy + 1, 16, 6, '#6e4c30');
    ell(g, sx, sy - 2, 16, 6, '#8a6142');
    ell(g, sx, sy - 3, 12, 4, '#96704c');
    px(g, sx - 6, sy - 5, 10, 2, 'rgba(90,58,34,0.3)');   // grain
    tb.items.forEach(function (it) { if (!it.hidden) drawTableItem(g, sx, sy - 2, it); });
    const cx = sx + 7;
    px(g, cx - 3, sy - 12, 6, 6, '#c9b28a');
    px(g, cx - 2, sy - 10, 4, 2, '#f0e0c8');
    if (tb.candle > 0.3) {
      g.globalAlpha = tb.candle * (0.6 + 0.4 * Math.sin(world.t * 9 + sx * 0.01));
      px(g, cx - 1, sy - 15, 2, 3, '#f5b942');
      px(g, cx - 1, sy - 17, 2, 2, '#f8dc8a');
      g.globalAlpha = 1;
    }
  }

  /* a slim poseur table under each window, tall enough that its top meets
     the sill — both window perches set their drinks on it (reach 12) */
  function drawTallTable(g, x, top, base, items) {
    ell(g, x, base - 2, 13, 4, 'rgba(20,12,8,0.2)');
    px(g, x - 3, top + 2, 6, base - top - 8, '#5a3d28');    // slender column
    px(g, x - 3, top + 2, 2, base - top - 8, '#6e4c30');
    px(g, x - 9, base - 8, 18, 4, '#4a3222');               // cross foot
    px(g, x - 6, base - 4, 12, 4, '#4a3222');
    ell(g, x, top + 1, 18, 6, '#6e4c30');
    ell(g, x, top - 2, 18, 6, '#8a6142');
    ell(g, x, top - 3, 14, 4, '#96704c');
    px(g, x - 7, top - 5, 12, 2, 'rgba(90,58,34,0.3)');     // grain
    items.forEach(function (it) { if (!it.hidden) drawTableItem(g, x, top - 2, it, 12); });
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

  function drawMatchaCup(g, x, top) {
    ell(g, x + 5, top + 11, 10, 3, '#d9d2c0');
    px(g, x - 1, top + 1, 12, 10, '#e8e0d0');
    px(g, x + 1, top + 1, 8, 2, '#8a9a4a');
  }

  function drawIcedMatcha(g, x, top, fill) {
    fill = fill == null ? 1 : Math.max(0, Math.min(1, fill));
    px(g, x + 8, top - 5, 2, 9, '#d9738a');
    px(g, x + 1, top, 8, 13, 'rgba(200,220,230,0.7)');
    const bodyH = Math.max(1, Math.round(8 * fill));
    px(g, x + 2, top + 12 - bodyH, 6, bodyH, '#8a9a4a');
    if (fill > 0.55) px(g, x + 2, top + 2, 6, 3, '#e8dfc9');
    if (fill > 0.75) {
      px(g, x + 3, top + 6, 2, 2, 'rgba(255,255,255,0.5)');
      px(g, x + 6, top + 8, 2, 2, 'rgba(255,255,255,0.5)');
    }
    px(g, x + 1, top, 8, 2, 'rgba(255,255,255,0.5)');
  }

  function drawTableItem(g, cx, cy, it, reach) {
    const ix = cx + it.side * (it.kind === 'laptop' ? 12 : (reach || 24)) - 5;
    if (it.kind === 'laptop') {
      ell(g, ix + 5, cy, 10, 3, 'rgba(20,12,8,0.18)');
      px(g, ix - 3, cy - 4, 16, 3, '#424854');
      px(g, ix - 2, cy - 5, 14, 2, '#687080');
      if (it.open) {
        px(g, ix - 2, cy - 15, 14, 10, '#424854');
        px(g, ix, cy - 13, 10, 7, '#2c3038');
        px(g, ix + 2, cy - 11, 7, 1, '#8a9ab5');
        px(g, ix + 2, cy - 8, 5, 1, '#6f809b');
      }
    } else if (it.kind === 'plate') {
      ell(g, ix + 5, cy - 2, 12, 4, 'rgba(20,12,8,0.18)');   // contact shadow
      ell(g, ix + 5, cy - 4, 11, 4, '#e8e0d0');
      px(g, ix + 1, cy - 12, 10, 7, '#c98f4a');
      px(g, ix + 3, cy - 14, 6, 2, '#b57c38');
    } else if (it.kind === 'matcha') {
      ell(g, ix + 5, cy, 11, 3, 'rgba(20,12,8,0.18)');
      drawMatchaCup(g, ix, cy - 14);
    } else if (it.kind === 'glass') {
      ell(g, ix + 5, cy, 7, 3, 'rgba(20,12,8,0.18)');
      drawIcedMatcha(g, ix, cy - 15);
    } else {
      ell(g, ix + 5, cy, 10, 3, 'rgba(20,12,8,0.18)');       // contact shadow
      ell(g, ix + 5, cy - 2, 9, 3, '#e8e0d0');   // saucer
      px(g, ix, cy - 14, 10, 12, it.kind === 'teacup' ? '#d9d2c0' : '#e8e0d0');
      px(g, ix + 10, cy - 11, 3, 5, '#e8e0d0');   // handle
      px(g, ix + 2, cy - 14, 6, 2, '#6b4429');    // the drink
    }
  }

  function drawCatCushion(g) {
    const C = L.catCorner.cushion;
    ell(g, C.x, C.y, 22, 6, 'rgba(20,12,8,0.2)');
    ell(g, C.x, C.y - 3, 22, 8, '#8f4035');
    ell(g, C.x, C.y - 5, 19, 6, '#a94f3f');
    px(g, C.x - 13, C.y - 6, 6, 2, '#7a3535');
    px(g, C.x + 8, C.y - 4, 5, 2, '#7a3535');
    px(g, C.x - 2, C.y - 3, 4, 2, 'rgba(90,35,30,0.35)');
  }

  function drawCatBowls(g, bowls) {
    const F = L.catCorner.food, W = L.catCorner.water;
    const foodQ = Math.ceil(Math.max(0, Math.min(1, bowls.food)) * 3);
    const waterQ = Math.ceil(Math.max(0, Math.min(1, bowls.water)) * 4);
    ell(g, F.x, F.y + 1, 10, 3, 'rgba(20,12,8,0.18)');
    ell(g, F.x, F.y - 1, 10, 4, '#8f4a35');
    px(g, F.x - 8, F.y - 4, 16, 4, '#b5654a');
    ell(g, F.x, F.y - 4, 8, 3, '#6e3d2c');
    if (foodQ) {
      ell(g, F.x, F.y - 4 - foodQ, 6 + foodQ, 2 + foodQ, '#9b6a35');
      px(g, F.x - 3, F.y - 5 - foodQ, 2, 2, '#c08a48');
      px(g, F.x + 2, F.y - 3 - foodQ, 2, 2, '#6b4429');
    }
    ell(g, W.x, W.y + 1, 10, 3, 'rgba(20,12,8,0.18)');
    ell(g, W.x, W.y - 1, 10, 4, '#65758a');
    px(g, W.x - 8, W.y - 4, 16, 4, '#7a89a5');
    ell(g, W.x, W.y - 4, 8, 3, waterQ ? '#8fb2bf' : '#4d5968');
    if (waterQ) px(g, W.x - 5, W.y - 5, 2 + waterQ * 2, 1, 'rgba(232,244,240,0.8)');
  }

  function drawMatchaBar(g, world) {
    const M = L.matchaBar;
    const whisking = world.brew.active && world.brew.stage === 'whisk';
    // matcha caddy: green tin, lid band picked from the existing swatch
    px(g, M.x - 12, M.y - 10, 8, 10, '#4a7a5a');
    px(g, M.x - 12, M.y - 10, 8, 2, shade('#4a7a5a', 0.18));
    px(g, M.x - 12, M.y - 3, 8, 2, shade('#4a7a5a', -0.18));
    // clay chawan, with its tea surface revealed during whisking
    px(g, M.x - 6, M.y - 7, 12, 6, '#8f4a35');
    ell(g, M.x, M.y - 7, 6, 2, whisking ? '#8a9a4a' : shade('#8f4a35', -0.24));
    px(g, M.x - 4, M.y - 1, 8, 2, shade('#8f4a35', -0.14));
    if (whisking) {
      const j = ((world.t * 12) | 0) % 2 ? -1 : 1;
      px(g, M.x - 1 + j, M.y - 21, 2, 12, '#c9a04a');
      px(g, M.x - 4 + j, M.y - 10, 2, 4, '#e0b06a');
      px(g, M.x - 1 + j, M.y - 10, 2, 4, '#e0b06a');
      px(g, M.x + 2 + j, M.y - 10, 2, 4, '#e0b06a');
    } else {
      // bamboo chasen leaning between the tin and bowl
      px(g, M.x - 8, M.y - 20, 2, 11, '#c9a04a');
      px(g, M.x - 7, M.y - 10, 2, 5, '#e0b06a');
      px(g, M.x - 4, M.y - 9, 2, 4, '#e0b06a');
      px(g, M.x - 10, M.y - 9, 2, 4, '#e0b06a');
    }
    if (world.brew.active && world.brew.stage === 'ice') {
      drawIcedMatcha(g, M.x + 2, M.y - 13, world.brew.progress);
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
    // the tiny shelf plant migrated beside the pastry case when the cat
    // claimed the right end of the top shelf.
    drawTinyPlant(g, L.counterPlant.x, L.counterPlant.y);
    // the matcha kit lives in the narrow clear gap between machine and pass;
    // waiting orders paint after it so the pass remains immediately legible.
    drawMatchaBar(g, world);
    // orders waiting at the pass
    world.counterCups.forEach(function (c) {
      if (c.kind === 'plate') {
        ell(g, c.x + 5, c.y + 8, 11, 4, '#e8e0d0');
        px(g, c.x, c.y, 11, 7, '#c98f4a');
        px(g, c.x + 2, c.y - 2, 7, 2, '#b57c38');
      } else if (c.kind === 'matcha') {
        drawMatchaCup(g, c.x, c.y);
      } else if (c.kind === 'glass') {
        drawIcedMatcha(g, c.x, c.y - 3);
      } else {
        ell(g, c.x + 5, c.y + 10, 9, 3, '#d9d2c0');
        px(g, c.x, c.y, 10, 11, '#e8e0d0');
        px(g, c.x + 10, c.y + 2, 3, 5, '#e8e0d0');
        px(g, c.x + 2, c.y, 6, 2, '#6b4429');
      }
    });
  }

})();
