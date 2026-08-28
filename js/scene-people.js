/* Café Hygge — people, cat, bubbles, and icon rendering */
(function () {
  'use strict';

  const SCENE = window.SCENE;
  const R = SCENE._;
  const px = R.px, ell = R.ell, shade = R.shade;

  /* ================= PEOPLE ================= */

  /* A standing character is 60 px tall (the café ruler CH): legs 16,
     torso 24, head 16 + hair. Seated reads slightly hunched at ~52.
     Detail pass: brows + 3×4 eyes, actual hands, five hair styles
     (0 classic / 1 side-part / 2 curly / 3 bun / 4 wrapped long-hair bun), clothing folds, scarf
     knots, apron strings, a 4-frame walk and a subtle idle breathe.
     Standing/walking bodies come in three views: the classic side profile
     (facing ±1), a front view when `heading` is 'down' — walking toward
     the room, or Nora watching it from the till — and a back view when
     `heading` is 'up' — walking away up the room, or facing the counter
     to order. */
  function drawHead(g, x, hy, facing, c, closed) {
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
    } else if (st === 4) {                                 // Lunafreya's long hair, wound into a generous bun
      const bunX = bx + (facing > 0 ? -7 : 3);
      px(g, bunX, hy - 10, 10, 10, c.hair);
      px(g, bunX - 2, hy - 7, 14, 6, c.hair);
      px(g, bunX + 2, hy - 8, 5, 2, hairL);
      px(g, bunX, hy - 3, 4, 2, shade(c.hair, -0.12));
      // two deliberate loose strands frame the face without reading as a bob
      const frontX = facing > 0 ? x + 7 : x - 9;
      px(g, frontX, hy + 1, 2, 12, c.hair);
      px(g, frontX + facing, hy + 10, 2, 6, hairL);
    }
    if (c.longHair && st !== 3 && st !== 4) {
      px(g, facing > 0 ? x - 11 : x + 8, hy + 2, 5, 18, c.hair);
    }
    // brow + eye
    const ex = facing > 0 ? x + 5 : x - 8;
    px(g, ex, hy + 3, 4, 2, c.hair);
    if (closed) px(g, ex - 1, hy + 8, 5, 2, '#2a1a12');
    else px(g, ex, hy + 6, 3, 4, '#2a1a12');
    if (c.beard) {
      px(g, facing > 0 ? x - 1 : x - 8, hy + 12, 9, 4, c.hair);
      px(g, facing > 0 ? x + 3 : x - 4, hy + 13, 3, 2, shade(c.hair, -0.25));
    } else {
      px(g, facing > 0 ? x + 5 : x - 6, hy + 12, 3, 2, shade(c.skin, -0.22));   // mouth
      px(g, facing > 0 ? x - 1 : x - 2, hy + 10, 4, 2, 'rgba(214,106,90,0.3)'); // blush
    }
  }

  /* The front head is symmetric about the face centre (x+1): two brows and
     eyes, a centred mouth, blush on both cheeks, and front variants of the
     five hair styles. `facing` only picks which brow the side-part fringe
     sweeps across, so the view stays consistent with the profile. */
  function drawHeadFront(g, x, hy, facing, c) {
    const hairL = shade(c.hair, 0.18);
    const st = c.hairStyle || 0;
    // face framed by the cap and both temples
    px(g, x - 8, hy, 18, 16, c.skin);
    px(g, x - 8, hy - 4, 18, 6, c.hair);
    px(g, x - 2, hy - 3, 7, 2, hairL);
    px(g, x - 8, hy + 2, 3, 6, c.hair);
    px(g, x + 8, hy + 2, 3, 6, c.hair);
    if (st === 1) {                                        // side-part fringe
      px(g, facing > 0 ? x - 6 : x + 1, hy + 1, 8, 2, c.hair);
    } else if (st === 2) {                                 // curly: bumps + cheek curls
      px(g, x - 7, hy - 6, 5, 2, c.hair);
      px(g, x - 1, hy - 7, 6, 3, c.hair);
      px(g, x + 5, hy - 6, 5, 2, c.hair);
      px(g, x - 9, hy + 4, 3, 5, c.hair);
      px(g, x + 9, hy + 4, 3, 5, c.hair);
    } else if (st === 3) {                                 // bun peeking over the crown
      px(g, x - 2, hy - 9, 7, 5, c.hair);
      px(g, x - 1, hy - 8, 3, 2, hairL);
    } else if (st === 4) {                                 // high wrapped bun + face-framing strands
      px(g, x - 6, hy - 12, 14, 8, c.hair);
      px(g, x - 3, hy - 14, 8, 4, c.hair);
      px(g, x - 3, hy - 11, 7, 2, hairL);
      px(g, x - 9, hy + 3, 2, 13, c.hair);
      px(g, x + 9, hy + 3, 2, 13, c.hair);
      px(g, x - 8, hy + 13, 3, 4, hairL);
      px(g, x + 8, hy + 13, 3, 4, hairL);
    }
    if (c.longHair && st !== 3 && st !== 4) {
      px(g, x - 11, hy + 2, 4, 18, c.hair);
      px(g, x + 10, hy + 2, 4, 18, c.hair);
    }
    // two brows + eyes, a centred mouth
    px(g, x - 5, hy + 3, 4, 2, c.hair);
    px(g, x + 4, hy + 3, 4, 2, c.hair);
    px(g, x - 4, hy + 6, 3, 4, '#2a1a12');
    px(g, x + 4, hy + 6, 3, 4, '#2a1a12');
    if (c.beard) {
      px(g, x - 6, hy + 12, 15, 4, c.hair);
      px(g, x - 1, hy + 13, 4, 2, shade(c.hair, -0.25));
    } else {
      px(g, x - 1, hy + 12, 4, 2, shade(c.skin, -0.22));   // mouth
      px(g, x - 7, hy + 10, 3, 2, 'rgba(214,106,90,0.3)'); // blush, both cheeks
      px(g, x + 7, hy + 10, 3, 2, 'rgba(214,106,90,0.3)');
    }
  }

  /* The back head is hair all the way down to a narrow neck between two
     nape tapers. The bun sits as a darker blob mid-head, curls bump the
     crown and the nape, the side-part shows as a faint groove, and long
     hair falls in one sheet over the neck and onto the shoulders. */
  function drawHeadBack(g, x, hy, facing, c) {
    const hairL = shade(c.hair, 0.18);
    const st = c.hairStyle || 0;
    px(g, x - 8, hy, 18, 16, c.skin);                      // neck strip below the hair
    px(g, x - 8, hy - 4, 18, 16, c.hair);                  // the whole back of the head
    px(g, x - 8, hy + 12, 5, 4, c.hair);                   // nape tapers
    px(g, x + 5, hy + 12, 5, 4, c.hair);
    px(g, x - 2, hy - 3, 7, 2, hairL);                     // shine
    if (st === 1) {                                        // side-part groove
      px(g, x + (facing > 0 ? 3 : -3), hy - 4, 2, 5, shade(c.hair, -0.12));
    } else if (st === 2) {                                 // curly: crown + nape bumps
      px(g, x - 7, hy - 6, 5, 2, c.hair);
      px(g, x - 1, hy - 7, 6, 3, c.hair);
      px(g, x + 5, hy - 6, 5, 2, c.hair);
      px(g, x - 7, hy + 11, 4, 3, c.hair);
      px(g, x + 5, hy + 11, 4, 3, c.hair);
    } else if (st === 3) {                                 // the bun, seen properly
      px(g, x - 2, hy, 7, 7, shade(c.hair, -0.15));
      px(g, x - 1, hy + 1, 3, 2, hairL);
    } else if (st === 4) {                                 // the full coil of Lunafreya's pinned-up hair
      px(g, x - 7, hy - 11, 16, 11, c.hair);
      px(g, x - 9, hy - 7, 20, 7, c.hair);
      px(g, x - 4, hy - 9, 9, 2, hairL);
      px(g, x - 6, hy - 4, 5, 2, shade(c.hair, -0.12));
      px(g, x + 2, hy - 1, 6, 2, hairL);
    }
    if (c.longHair && st !== 3 && st !== 4) {
      px(g, x - 7, hy + 12, 16, 12, c.hair);               // one sheet over the neck
    }
  }

  function heldDrinkKind(p) {
    if (p.kind !== 'barista') return p.drink ? p.drink.kind : 'cup';
    if (p.state === 'serveWalk' && p.orders[0]) return p.orders[0].drink.kind;
    if (p.state === 'busHome' && p.busTarget) return p.busTarget.item.kind;
    return 'cup';
  }

  function drawOffhand(g, p, x, y, facing, c) {
    const side = -facing;
    if (p.umbrella && !p.umbrellaParked) {
      const shake = p.state === 'shake' ? Math.round(Math.sin(p.animT * 62)) : 0;
      const ux = x + side * (p.laptopPacked ? 17 : 12) + shake;
      px(g, ux - 1, y - 45, 2, 31, '#3a2a1c');
      px(g, ux - 3, y - 36, 6, 13, p.umbrella.color);
      px(g, ux - 2, y - 39, 4, 3, shade(p.umbrella.color, -0.18));
      px(g, ux - (side > 0 ? 0 : 5), y - 48, 6, 2, '#3a2a1c');
      px(g, ux + side * 4 - (side < 0 ? 2 : 0), y - 47, 2, 5, '#3a2a1c');
    }
    if (p.laptopPacked) {
      const lx = x + side * 11 - 6;
      px(g, lx, y - 31, 13, 10, '#363b45');
      px(g, lx + (side > 0 ? 0 : 11), y - 30, 2, 8, '#687080');
      px(g, x + side * 8 - (side < 0 ? 3 : 0), y - 23, 4, 4, c.skin);
    }
  }

  SCENE.drawPerson = function (g, p) {
    const facing = p.facing >= 0 ? 1 : -1;
    const walk = p.pose === 'walk';
    const front = p.heading === 'down' && (walk || p.pose === 'stand');
    const back = p.heading === 'up' && (walk || p.pose === 'stand');
    const cycle = walk ? (Math.floor(p.animT * 8) % 4) : 0;
    const pass = cycle === 1 || cycle === 3;               // passing frames bob up
    const y = p.y - (walk && pass ? 2 : 0);
    const stretchLean = p.pose === 'stretch' ? Math.round(Math.sin(p.animT * 1.4) * 2) : 0;
    const playSway = p.playing ? Math.round(Math.sin(p.animT * 1.15)) : 0;
    const x = Math.round(p.x) + stretchLean + playSway;
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
      if (c.smock) {
        // an apron, not a panel: narrow bib up top so the shoulders stay in
        // her own colour — a full-width pale block reads as a held-open book
        px(g, x - 3, y - 31, 6, 4, c.smock);
        px(g, x - 7, y - 27, 14, 15, c.smock);
        px(g, x - 6, y - 18, 12, 5, shade(c.smock, -0.08));
        px(g, x - 4, y - 17, 8, 2, shade(c.smock, 0.1));
        px(g, x - 5, y - 25, 2, 2, '#5a7a8a');
        px(g, x + 4, y - 22, 2, 2, '#a94f3f');
      }
      if (c.scarf) {
        px(g, x - 10, y - 32, 20, 5, c.scarf);
        const kx = facing > 0 ? x + 5 : x - 9;
        px(g, kx, y - 29, 4, 4, shade(c.scarf, -0.15));         // knot
        px(g, kx, y - 25, 4, 7, c.scarf);                       // tail
        px(g, kx, y - 19, 2, 2, shade(c.scarf, -0.15));         // fringe
      }
      // gazeFacing (window sitters looking out) turns the head — the body keeps
      // leaning on its cushion. The window is on the wall behind the seat, so a
      // real glance out shows the back of the head; a doze keeps its slumped
      // profile (eyes closed, chin down).
      const dozeDrop = p.dozing ? 2 + (Math.sin(p.animT * 1.15) > 0 ? 1 : 0) : 0;
      const hy = y - 48 + breathe + dozeDrop;
      if (p.gazeFacing && !p.dozing) drawHeadBack(g, x, hy, facing, c);
      else drawHead(g, x, hy, p.gazeFacing || facing, c, p.dozing);
      // arms + what they hold
      if (p.reading || p.dozing) {
        px(g, x + facing * 3 - 2, y - 24, 5, 8, c.top);
        const bx = x + facing * 10 - 9;
        const by = y - 29 + (p.dozing ? 6 : 0);
        px(g, bx, by, 18, 10, '#f5efdf');
        px(g, bx + 8, by, 2, 10, '#b5a888');
        px(g, bx, by - 2, 18, 2, '#c9b28a');
        px(g, bx - 2, by + 3, 3, 4, c.skin);                    // hands on the covers
        px(g, bx + 17, by + 3, 3, 4, c.skin);
      } else if (p.painting) {
        const stroke = Math.floor(p.animT * 5) % 2;
        if (p.paintMixing) {
          // mixing happens down at the tray
          px(g, x - 10, y - 29, 7, 11, c.top);
          px(g, x - 14, y - 24 + stroke, 8, 3, c.skin);
          px(g, x - 21, y - 25 + stroke, 9, 1, '#8b7158');
        } else {
          // the working arm lifts so the brush meets the canvas itself
          // (canvas panel bottoms out at y 424; the tray line is not a stroke)
          px(g, x - 10, y - 32, 7, 12, c.top);
          px(g, x - 17, y - 36 + stroke, 9, 4, c.skin);
          px(g, x - 29, y - 39 + stroke, 13, 2, '#8b7158');
          px(g, x - 31, y - 42 + stroke, 3, 3, '#5a7a8a');
          px(g, x + 2, y - 27, 6, 9, c.top);
          px(g, x + 2, y - 20, 5, 3, c.skin);
        }
      } else if (p.sketching) {
        px(g, x - 8, y - 28, 6, 10, c.top);
        px(g, x + 2, y - 28, 6, 10, c.top);
        // kraft cover round the pages so the sketchbook reads against the smock
        px(g, x - 10, y - 21, 20, 11, '#8b7158');
        px(g, x - 8, y - 20, 16, 9, '#f5efdf');
        px(g, x - 1, y - 20, 2, 9, '#b5a888');
        px(g, x - 5, y - 18, 8, 1, '#8b8070');
        px(g, x + 2, y - 25, 1, 10, '#8b7158');
      } else if (p.playing) {
        const keyBob = Math.floor(p.animT * 5) % 2;
        // A sideways version of the typing forearms: both hands reach left
        // from the backless bench to the upright's grouped keys.
        px(g, x - 10, y - 29 + keyBob, 7, 11, c.top);
        px(g, x - 5, y - 25 + (1 - keyBob), 7, 9, c.top);
        px(g, x - 15, y - 19 + keyBob, 6, 3, c.skin);
        px(g, x - 12, y - 16 + (1 - keyBob), 6, 3, c.skin);
      } else if (p.typing) {
        const keyBob = Math.floor(p.animT * 6) % 2;
        px(g, x - 9, y - 28 + keyBob, 7, 12, c.top);
        px(g, x + 2, y - 28 + (1 - keyBob), 7, 12, c.top);
        px(g, x - 7, y - 18 + keyBob, 5, 3, c.skin);
        px(g, x + 3, y - 17 + (1 - keyBob), 5, 3, c.skin);
      } else if (p.holding === 'cup' || p.holding === 'glass') {
        const up = p.armUp || 0;
        const hy = y - 26 - up * 17;
        const hx = x + facing * (13 - up * 5);
        const vessel = heldDrinkKind(p);
        px(g, x + facing * 5, y - 30, 5, Math.round(10 - up * 3), c.top);
        if (vessel === 'glass') {
          px(g, hx - 1, hy - 4, 2, 7, '#d9738a');
          px(g, hx - 3, hy, 8, 13, 'rgba(200,220,230,0.7)');
          px(g, hx - 2, hy + 5, 6, 7, '#8a9a4a');
          px(g, hx - 2, hy + 2, 6, 3, '#e8dfc9');
          px(g, hx - 1, hy + 7, 2, 2, 'rgba(255,255,255,0.5)');
          px(g, hx + 2, hy + 9, 2, 2, 'rgba(255,255,255,0.5)');
          px(g, hx + (facing > 0 ? -5 : 4), hy + 6, 3, 4, c.skin);
        } else if (vessel === 'matcha') {
          px(g, hx - 4, hy + 2, 12, 9, '#e8e0d0');
          px(g, hx - 2, hy + 2, 8, 2, '#8a9a4a');
          px(g, hx + (facing > 0 ? -6 : 7), hy + 5, 3, 4, c.skin);
        } else {
          px(g, hx - 3, hy, 10, 10, '#e8e0d0');
          px(g, hx + (facing > 0 ? 7 : -6), hy + 3, 3, 4, '#e8e0d0');
          px(g, hx + (facing > 0 ? -5 : 6), hy + 4, 3, 4, c.skin);  // hand on the cup
        }
      } else if (p.knitting) {
        // hands working in the lap, two needles crossing, the scarf growing by
        // row — its length reads the arc's saved progress (docs/narrative.md §8)
        px(g, x - 8, y - 28, 6, 9, c.top);                 // forearms into the lap
        px(g, x + 2, y - 28, 6, 9, c.top);
        px(g, x - 6, y - 20, 5, 3, c.skin);                // hands meeting
        px(g, x + 1, y - 20, 5, 3, c.skin);
        const scol = p.knitColor || '#a94f3f';
        const sw = 3 + Math.round(Math.max(0, Math.min(1, p.knitProgress)) * 11);
        px(g, x - sw, y - 16, sw * 2, 4, scol);            // the scarf across her lap
        px(g, x - sw, y - 16, sw * 2, 1, shade(scol, 0.16));
        px(g, x - sw, y - 13, sw * 2, 1, shade(scol, -0.16));
        px(g, x - 8, y - 24, 8, 1, '#d9c9a0');             // needles
        px(g, x, y - 25, 8, 1, '#d9c9a0');
        px(g, x - 9, y - 25, 2, 2, '#c9b28a');             // needle tips
        px(g, x + 7, y - 26, 2, 2, '#c9b28a');
      } else {
        px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 30, 5, 12, c.top);
        px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 20, 4, 3, c.skin); // resting hand
      }
      return;
    }

    // standing / walking legs (4-frame walk: stride, pass, stride, pass;
    // the front/back views step in place — the trailing shoe lifts 2 px
    // instead of the profile's horizontal stride)
    if (walk && (front || back)) {
      if (pass) {
        px(g, x - 10, y - 16, 8, 16, c.pants);
        px(g, x + 2, y - 16, 8, 16, c.pants);
        px(g, x - 10, y - 3, 8, 3, '#3a2a1c');
        px(g, x + 2, y - 3, 8, 3, '#3a2a1c');
      } else {
        const lLift = cycle === 0 ? 0 : 2, rLift = cycle === 0 ? 2 : 0;
        px(g, x - 10, y - 16, 8, 16 - lLift, c.pants);
        px(g, x + 2, y - 16, 8, 16 - rLift, c.pants);
        px(g, x - 10, y - 3 - lLift, 8, 3, '#3a2a1c');
        px(g, x + 2, y - 3 - rLift, 8, 3, '#3a2a1c');
      }
    } else if (walk) {
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
    if (c.smock) {
      // matching apron read: bib narrower than the shoulders (see sit pose)
      px(g, x - 3, y - 39, 6, 4, c.smock);
      px(g, x - 7, y - 35, 14, 18, c.smock);
      px(g, x - 6, y - 21, 12, 4, shade(c.smock, -0.08));
      px(g, x - 5, y - 31, 2, 2, '#5a7a8a');
      px(g, x + 3, y - 25, 2, 2, '#a94f3f');
    }
    if (c.scarf && back) {
      // from behind: just the wrap band, one tail tossed down the back
      px(g, x - 10, y - 40, 20, 5, c.scarf);
      const bkx = facing > 0 ? x + 3 : x - 7;
      px(g, bkx, y - 35, 4, 9, c.scarf);
      px(g, bkx, y - 27, 2, 2, shade(c.scarf, -0.15));     // fringe
    } else if (c.scarf) {
      px(g, x - 10, y - 40, 20, 5, c.scarf);
      const kx = front ? x - 1 : facing > 0 ? x + 5 : x - 9;   // knot centres up front
      px(g, kx, y - 37, 4, 4, shade(c.scarf, -0.15));      // knot
      px(g, kx, y - 33, 4, 8, c.scarf);                    // hanging tail
      px(g, kx, y - 26, 2, 2, shade(c.scarf, -0.15));      // fringe
    }
    if (c.apron && back) {
      // from behind: straps over the shoulders, waistband, and the tie bow
      px(g, x - 5, y - 39, 2, 3, '#c9b28a');
      px(g, x + 3, y - 39, 2, 3, '#c9b28a');
      px(g, x - 8, y - 32, 16, 2, '#c9b28a');
      px(g, x - 2, y - 31, 4, 3, '#e8dfc9');               // the bow, centre stage
      px(g, x - 1, y - 28, 2, 6, '#e8dfc9');
    } else if (c.apron) {
      px(g, x - 8, y - 32, 16, 16, '#e8dfc9');
      px(g, x - 3, y - 37, 6, 5, '#e8dfc9');
      px(g, x - 5, y - 39, 2, 3, '#c9b28a');               // neck straps
      px(g, x + 3, y - 39, 2, 3, '#c9b28a');
      px(g, x - 8, y - 32, 16, 2, '#c9b28a');              // waistband
      px(g, x - 5, y - 26, 10, 7, '#d9d2c0');              // pocket
      px(g, x - 5, y - 26, 10, 2, '#c9b28a');
      if (!front) {                                        // tie bow at the back
        const abx = facing > 0 ? x - 13 : x + 10;          // (hidden from the front)
        px(g, abx, y - 31, 4, 3, '#e8dfc9');
        px(g, abx + 1, y - 28, 2, 6, '#e8dfc9');
      }
    }
    if (front) drawHeadFront(g, x, y - 56 + breathe, facing, c);
    else if (back) drawHeadBack(g, x, y - 56 + breathe, facing, c);
    else drawHead(g, x, y - 56 + breathe, facing, c);
    // arm + held item, with actual hands
    const held = p.holding;
    const swing = walk && !pass ? (cycle === 0 ? 2 : -2) * facing : 0;
    if (p.pose === 'stretch') {
      // a long, unhurried reach: both shoulders lift and the hands nearly meet
      px(g, x - 11, y - 50, 5, 14, c.top); px(g, x + 6, y - 50, 5, 14, c.top);
      px(g, x - 8, y - 59, 4, 11, c.skin); px(g, x + 4, y - 59, 4, 11, c.skin);
      px(g, x - 8, y - 62, 4, 4, c.skin); px(g, x + 4, y - 62, 4, 4, c.skin);
    } else if (p.pose === 'reach' && !held) {
      const ax = x + facing * 7 - (facing < 0 ? 4 : 0);
      px(g, ax, y - 48, 5, 13, c.top);
      px(g, ax + facing * 2, y - 58, 4, 12, c.skin);
      px(g, ax + facing * 2, y - 61, 4, 4, c.skin);
    } else if (front || back) {
      // front/back views: both arms hang at the sides with a small
      // counter-swing; a held item rides at the hip in the near hand
      // (beside the body, so it reads from behind too)
      const fs = walk && !pass ? (cycle === 0 ? 1 : -1) : 0;
      px(g, x - 14, y - 38 + fs, 4, 14, c.top);
      px(g, x - 14, y - 25 + fs, 4, 4, c.skin);
      if (!held) {
        px(g, x + 10, y - 38 - fs, 4, 14, c.top);
        px(g, x + 10, y - 25 - fs, 4, 4, c.skin);
      } else {
        px(g, x + 10, y - 38, 4, 11, c.top);               // bent carrying arm
        const vessel = heldDrinkKind(p);
        if (held === 'glass') {
          px(g, x + 12, y - 33, 2, 6, '#d9738a');
          px(g, x + 9, y - 29, 8, 13, 'rgba(200,220,230,0.7)');
          px(g, x + 10, y - 23, 6, 7, '#8a9a4a');
          px(g, x + 10, y - 26, 6, 3, '#e8dfc9');
          px(g, x + 11, y - 21, 2, 2, 'rgba(255,255,255,0.5)');
          px(g, x + 9, y - 30, 4, 3, c.skin);
        } else if (held === 'cup' && vessel === 'matcha') {
          px(g, x + 7, y - 26, 12, 9, '#e8e0d0');
          px(g, x + 9, y - 26, 8, 2, '#8a9a4a');
          px(g, x + 10, y - 28, 4, 3, c.skin);
        } else if (held === 'cup') {
          px(g, x + 8, y - 27, 10, 10, '#e8e0d0');
          px(g, x + 10, y - 29, 4, 3, c.skin);
        } else if (held === 'plate') {
          px(g, x + 6, y - 25, 15, 5, '#e8e0d0');
          px(g, x + 9, y - 30, 10, 5, '#c98f4a');
          px(g, x + 10, y - 21, 5, 3, c.skin);             // palm under the plate
        } else if (held === 'stack') {                     // bussed empties
          px(g, x + 6, y - 25, 15, 5, '#e8e0d0');          // saucer at the bottom
          px(g, x + 8, y - 34, 10, 9, '#e8e0d0');          // cup riding on top
          px(g, x + 8, y - 26, 10, 1, '#c9b28a');          // seam between the two
          px(g, x + 10, y - 21, 5, 3, c.skin);             // palm under the stack
        } else if (held === 'cloth') {
          px(g, x + 8, y - 25, 10, 7, '#7a89a5');
          px(g, x + 10, y - 27, 4, 3, c.skin);
        } else if (held === 'can') {
          px(g, x + 7, y - 28, 12, 10, '#b5654a');
          px(g, x + 9, y - 32, 8, 4, '#c98f4a');
          if (front) px(g, x + 18, y - 26, 3, 4, '#b5654a');   // spout points at the room
          px(g, x + 10, y - 30, 4, 3, c.skin);
        } else if (held === 'taper') {
          px(g, x + 12, y - 43, 2, 17, '#e8dfc9');
          px(g, x + 11, y - 28, 4, 4, c.skin);
          if (p.taperLit) {
            px(g, x + 12, y - 47, 2, 4, '#f5b942');
            px(g, x + 12, y - 49, 2, 2, '#f8dc8a');
          }
        } else if (held === 'book') {
          px(g, x + 8, y - 26, 10, 8, '#a94f3f');
          px(g, x + 8, y - 26, 10, 2, shade('#a94f3f', -0.2));
          px(g, x + 16, y - 25, 2, 6, '#f5efdf');          // page edges
          px(g, x + 10, y - 19, 4, 3, c.skin);             // fingers curled under
        }
      }
    } else if (held === 'cup' || held === 'glass' || held === 'plate' || held === 'cloth' || held === 'stack') {
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 10, c.top);
      const hx = x + facing * 13 - (facing > 0 ? 0 : 8);
      const vessel = heldDrinkKind(p);
      if (held === 'glass') {
        px(g, hx + 6, y - 37, 2, 8, '#d9738a');
        px(g, hx + 1, y - 34, 8, 13, 'rgba(200,220,230,0.7)');
        px(g, hx + 2, y - 29, 6, 7, '#8a9a4a');
        px(g, hx + 2, y - 32, 6, 3, '#e8dfc9');
        px(g, hx + 3, y - 27, 2, 2, 'rgba(255,255,255,0.5)');
        px(g, hx + (facing > 0 ? -2 : 8), y - 28, 4, 4, c.skin);
      } else if (held === 'cup' && vessel === 'matcha') {
        px(g, hx - 1, y - 31, 12, 9, '#e8e0d0');
        px(g, hx + 1, y - 31, 8, 2, '#8a9a4a');
        px(g, hx + (facing > 0 ? -3 : 10), y - 28, 4, 4, c.skin);
      } else if (held === 'cup') {
        px(g, hx, y - 32, 10, 10, '#e8e0d0');
        px(g, hx + (facing > 0 ? 10 : -3), y - 29, 3, 5, '#e8e0d0');
        px(g, hx + (facing > 0 ? -3 : 9), y - 28, 4, 4, c.skin);
      } else if (held === 'plate') {
        px(g, hx - 3, y - 26, 15, 5, '#e8e0d0');
        px(g, hx, y - 31, 10, 5, '#c98f4a');
        px(g, hx + 3, y - 21, 5, 3, c.skin);               // palm under the plate
      } else if (held === 'stack') {                       // bussed empties
        px(g, hx - 3, y - 26, 15, 5, '#e8e0d0');           // saucer at the bottom
        px(g, hx, y - 35, 10, 9, '#e8e0d0');               // cup riding on top
        px(g, hx, y - 27, 10, 1, '#c9b28a');               // seam between the two
        px(g, hx + 3, y - 21, 5, 3, c.skin);               // palm under the stack
      } else {
        px(g, hx, y - 26, 10, 7, '#7a89a5');
        px(g, hx + 2, y - 29, 4, 3, c.skin);               // hand on the cloth
      }
    } else if (held === 'can') {
      const hx = x + facing * 9;
      px(g, x + facing * 7 - (facing > 0 ? 0 : 3), y - 36, 5, 12, c.top);
      if (p.pouring) {
        px(g, hx - 7, y - 43, 12, 9, '#b5654a');
        px(g, hx - 5, y - 46, 8, 3, '#c98f4a');
        px(g, hx + facing * 4 - (facing < 0 ? 8 : 0), y - 39, 10, 3, '#b5654a');
        px(g, hx + facing * 11 - (facing < 0 ? 3 : 0), y - 38, 3, 5, '#c98f4a');
      } else {
        px(g, hx - 6, y - 31, 12, 10, '#b5654a');
        px(g, hx - 4, y - 35, 8, 4, '#c98f4a');
        px(g, hx + facing * 5 - (facing < 0 ? 9 : 0), y - 28, 10, 3, '#b5654a');
      }
      px(g, hx - 2, p.pouring ? y - 36 : y - 24, 4, 4, c.skin);
    } else if (held === 'taper') {
      const tx = x + facing * 13;
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 36, 5, 12, c.top);
      px(g, tx - 1, y - 42, 2, 18, '#e8dfc9');
      px(g, tx - 2, y - 27, 4, 4, c.skin);
      if (p.taperLit) {
        px(g, tx - 1, y - 46, 2, 4, '#f5b942');
        px(g, tx - 1, y - 48, 2, 2, '#f8dc8a');
      }
    } else if (held === 'book') {
      // borrowed book tucked under the arm
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 12, c.top);
      const bkx = x + facing * 12 - (facing > 0 ? 0 : 10);
      px(g, bkx, y - 25, 10, 8, '#a94f3f');
      px(g, bkx, y - 25, 10, 2, shade('#a94f3f', -0.2));
      px(g, bkx + (facing > 0 ? 8 : 0), y - 24, 2, 6, '#f5efdf');   // page edges
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 22, 4, 4, c.skin);
    } else if (held === 'log') {
      // a split billet carried in the crook of the arm, off to the hearth
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3), y - 34, 5, 12, c.top);
      const lgx = x + facing * 11 - (facing > 0 ? 0 : 15);
      px(g, lgx, y - 30, 15, 6, '#6b4429');                          // the billet
      px(g, lgx, y - 30, 15, 2, '#7a5233');                          // lit top edge
      px(g, lgx + 3, y - 29, 2, 4, '#57371f');                       // bark tick
      px(g, lgx + 9, y - 29, 2, 4, '#57371f');
      px(g, lgx + (facing > 0 ? 13 : 0), y - 29, 2, 4, '#8a6142');   // end grain
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2), y - 23, 4, 4, c.skin);  // hand under
    } else {
      px(g, x + facing * 8 - (facing > 0 ? 0 : 3) + swing, y - 34, 5, 16, c.top);
      px(g, x + facing * 8 - (facing > 0 ? 0 : 2) + swing, y - 20, 4, 4, c.skin);
    }
    drawOffhand(g, p, x, y, facing, c);
  };

  /* ---------- the cat ---------- */
  SCENE.drawCat = function (g, cat) {
    const x = Math.round(cat.x), y = Math.round(cat.y);
    const t = cat.animT;
    const pose = cat.state === 'hop' ? 'stretch' : cat.state;
    // on the back-bar shelf the tail drapes off the board edge instead of the
    // pose's own tail (sleep keeps its tucked curl and skips the drape)
    const drapeTail = (cat.surface === 'backShelf' || cat.surface === 'pianoTop') &&
      (pose === 'loaf' || pose === 'sit' || pose === 'groom');
    const look = cat.gazeFacing || cat.facing;
    const f = look >= 0 ? 1 : -1;
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

    if (pose === 'sleep' || pose === 'lap') {
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
    } else if (pose === 'perch') {
      // Back view for the middle window sill: ears and shoulders against the
      // glass, with the pale tail tip making the smallest movement.
      const headShift = cat.gazeFacing ? f * 2 : 0;
      px(g, x - 8, y - 18, 16, 18, body);
      px(g, x - 6 + headShift, y - 24, 12, 9, body);
      px(g, x - 6 + headShift, y - 27, 4, 4, dark); px(g, x + 2 + headShift, y - 27, 4, 4, dark);
      px(g, x - 4, y - 16, 2, 8, dark); px(g, x + 2, y - 15, 2, 7, dark);
      const backSway = Math.round(Math.sin(t * 1.8) * 2);
      px(g, x - 14, y - 5, 11, 3, dark);
      px(g, x - 16 + backSway, y - 8, 4, 5, dark);
      px(g, x - 16 + backSway, y - 10, 4, 2, cream);
    } else if (pose === 'eat' || pose === 'drink') {
      px(g, x - 12, y - 11, 22, 9, body);
      px(g, x - 8, y - 4, 4, 4, dark); px(g, x + 5, y - 4, 4, 4, body);
      const dip = Math.round(Math.sin(t * (pose === 'drink' ? 12 : 7)) > 0 ? 1 : 0);
      px(g, x - 16, y - 9 + dip, 11, 8, body);
      ears(x - 16, 11, y - 9 + dip);
      if (pose === 'drink') px(g, x - 17, y - 1, 4, 1, pink);
      px(g, x + 10, y - 15, 4, 8, dark); px(g, x + 12, y - 19, 3, 5, dark);
      px(g, x + 12, y - 21, 3, 2, cream);
    } else if (pose === 'sit' || pose === 'groom') {
      px(g, x - 7, y - 17, 14, 17, body);
      px(g, x - 5, y - 5, 10, 5, cream);
      px(g, x - 7, y - 14, 2, 3, dark); px(g, x + 4, y - 15, 2, 3, dark);   // stripes
      const hy = pose === 'groom' ? y - 19 : y - 26;
      const hx = pose === 'groom' ? x + f * 2 : x;
      px(g, hx - 5, hy, 14, 9, body);
      ears(hx - 5, 14, hy);
      if (pose === 'sit') {
        px(g, hx + (f > 0 ? 4 : -5), hy + 3, 2, 2, '#3a5a2a');              // eye
        px(g, hx + (f > 0 ? 6 : -8), hy + 5, 3, 3, cream);                  // muzzle
        px(g, hx + (f > 0 ? 7 : -7), hy + 5, 2, 2, pink);                   // nose
      } else {
        px(g, hx + f * 4 - (f > 0 ? 0 : 3), hy + 7, 3, 4, body);            // raised grooming paw
      }
      // tail wrapped around the paws, tip curling and swaying
      if (!drapeTail) {
        const sway = Math.round(Math.sin(t * 2.2) * 2);
        px(g, x - f * 9 - 2, y - 7, 4, 7, dark);
        px(g, f > 0 ? x - 8 : x - 4, y - 3, 12, 3, dark);
        px(g, (f > 0 ? x + 2 : x - 8) + sway, y - 6, 3, 4, dark);
        px(g, (f > 0 ? x + 2 : x - 8) + sway, y - 7, 3, 2, cream);
      }
    } else if (pose === 'knead') {
      const paw = Math.floor(t * 6) % 2;
      px(g, x - 12, y - 12, 24, 10, body);
      px(g, x + 5, y - 19, 10, 9, body); ears(x + 5, 10, y - 19);
      px(g, x - 8 - paw * 2, y - 3, 7, 4, cream);
      px(g, x + 1 + paw * 2, y - 3, 7, 4, cream);
      px(g, x - 15, y - 8, 5, 6, dark); px(g, x - 16, y - 10, 4, 3, cream);
    } else if (pose === 'stretch') {
      px(g, x - 12, y - 7, 12, 7, body);
      px(g, x, y - 12, 12, 12, body);
      px(g, x + 8, y - 19, 10, 9, body);
      ears(x + 8, 10, y - 19);
      // tail curved up in two segments
      px(g, x - 15, y - 14, 4, 6, dark);
      px(g, x - 17, y - 19, 3, 5, dark);
      px(g, x - 17, y - 21, 3, 2, cream);
    } else { // walk / loaf / pounce
      const moving = pose === 'walk' || pose === 'pounce';
      const step = moving ? (Math.floor(t * (pose === 'pounce' ? 12 : 8)) % 2) : 0;
      px(g, x - 12, y - 12, 24, 9, body);
      px(g, x - 8, y - 12, 2, 4, dark); px(g, x - 2, y - 12, 2, 5, dark); px(g, x + 4, y - 12, 2, 4, dark);
      px(g, x - 10, y - 5, 7, 2, dark); px(g, x + 5, y - 5, 7, 2, dark);
      if (moving) {
        px(g, x - 10 + step * 2, y - 3, 3, 4, body); px(g, x + 7 - step * 2, y - 3, 3, 4, body);
        px(g, x - 3 - step * 2, y - 3, 3, 4, dark); px(g, x + 2 + step * 2, y - 3, 3, 4, dark);
      }
      const hx = x + f * 10 - (f > 0 ? 0 : 8);
      px(g, hx, y - 19, 10, 9, body);
      ears(hx, 10, y - 19);
      px(g, hx + (f > 0 ? 6 : 1), y - 16, 2, 2, '#3a5a2a');                 // eye
      if (pose === 'pounce') {
        px(g, x + f * 10 - (f > 0 ? 0 : 6), y - 9, 7, 3, body);             // batting paw
        px(g, x + f * 15 - (f > 0 ? 0 : 3), y - 9, 3, 3, cream);
      }
      // curved tail: base rises from the rump, tip sways the most
      if (!drapeTail) {
        const ts = Math.round(Math.sin(t * 5) * 2);
        px(g, f > 0 ? x - 15 : x + 11, y - 16, 4, 7, dark);
        px(g, f > 0 ? x - 17 : x + 14, y - 20 + ts, 3, 5, dark);
        px(g, f > 0 ? x - 17 : x + 14, y - 22 + ts, 3, 2, cream);
      }
    }

    if (drapeTail) {
      const tx = pose === 'loaf' ? x + 9 : x + 3;   // rooted at the haunch
      const drape = Math.round(Math.sin(t * 1.6) * 2);
      px(g, tx, y - 3, 4, 17, dark);
      px(g, tx + drape, y + 12, 4, 7, dark);
      px(g, tx + drape, y + 18, 4, 3, cream);
    }

    if (cat.scarf) catScarf(g, cat.scarf, x, y, f, pose);
  };

  /* A small band of wool around the cat's neck once Gerda's scarf arc has
     completed (docs/narrative.md §8) — the payoff, worn for good. Pose-aware
     anchors keep it near the neck across the poses the cat rests and moves in;
     a short tail hangs where the pose allows. */
  function catScarf(g, col, x, y, f, pose) {
    const hi = shade(col, 0.16), lo = shade(col, -0.16);
    function band(bx, by, bw) { px(g, bx, by, bw, 3, col); px(g, bx, by, bw, 1, hi); }
    function tail(tx, ty) { px(g, tx, ty, 3, 5, col); px(g, tx, ty + 4, 3, 1, lo); }
    if (pose === 'sleep' || pose === 'lap') { band(x, y - 12, 8); tail(x + 4, y - 10); }
    else if (pose === 'sit' || pose === 'groom') { band(x - 6, y - 18, 12); tail(f > 0 ? x + 3 : x - 6, y - 15); }
    else if (pose === 'eat' || pose === 'drink') { band(x - 12, y - 10, 8); tail(x - 11, y - 7); }
    else if (pose === 'knead') { band(x + 1, y - 13, 9); tail(x + 8, y - 10); }
    else if (pose === 'stretch') { band(x + 2, y - 10, 8); }
    else if (pose === 'perch') { band(x - 8, y - 16, 16); }
    else { const nx = f > 0 ? x + 3 : x - 12; band(nx, y - 13, 9); tail(f > 0 ? x + 5 : x - 6, y - 10); }
  }

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
      case 'matcha':
        px(g, x, y + 6, 14, 7, '#e8e0d0');
        px(g, x + 2, y + 6, 10, 2, '#8a9a4a');
        px(g, x - 1, y + 13, 16, 2, '#d9d2c0');
        px(g, x + 3, y + 1, 2, 3, '#b5aa92'); px(g, x + 8, y - 1, 2, 4, '#b5aa92');
        break;
      case 'icedmatcha':
        px(g, x + 5, y - 2, 2, 6, '#d9738a');
        px(g, x + 3, y + 2, 10, 14, 'rgba(200,220,230,0.7)');
        px(g, x + 5, y + 8, 6, 6, '#8a9a4a');
        px(g, x + 5, y + 5, 6, 3, '#e8dfc9');
        px(g, x + 6, y + 10, 2, 2, 'rgba(255,255,255,0.5)');
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
      case 'yarn':
        // a soft ball of wool with a loose strand — the scarf arc's invitation
        px(g, x + 2, y + 4, 12, 10, '#a94f3f');
        px(g, x + 4, y + 2, 8, 2, '#a94f3f');
        px(g, x + 4, y + 14, 8, 2, '#a94f3f');
        px(g, x + 3, y + 6, 10, 1, '#e0b7a6');           // wrap lines, catching the light
        px(g, x + 5, y + 9, 8, 1, '#e0b7a6');
        px(g, x + 4, y + 12, 9, 1, '#e0b7a6');
        px(g, x + 3, y + 5, 2, 8, '#8a3f33');            // shaded left edge
        px(g, x + 13, y + 8, 3, 1, '#a94f3f');           // the strand trailing off
        px(g, x + 15, y + 9, 1, 4, '#a94f3f');
        break;
      case 'brush':
        // a little loaded brush: muted, tool-like, and legible at bubble scale
        px(g, x + 1, y + 12, 12, 3, '#8b7158');
        px(g, x + 11, y + 10, 3, 5, '#c9b28a');
        px(g, x + 13, y + 7, 3, 6, '#4a3038');
        px(g, x + 14, y + 5, 2, 2, '#4a3038');
        break;
      case 'palette':
        px(g, x + 2, y + 4, 12, 10, '#b78355');
        px(g, x + 4, y + 2, 7, 3, '#b78355');
        px(g, x + 5, y + 6, 3, 3, '#e8dfc9');
        px(g, x + 10, y + 4, 3, 3, '#a94f3f');
        px(g, x + 12, y + 9, 3, 3, '#5a7a8a');
        px(g, x + 6, y + 12, 3, 3, '#c9a04a');
        break;
    }
  }

})();
