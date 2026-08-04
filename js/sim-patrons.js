/* Café Hygge — patron state machine */
(function () {
  'use strict';

  const SIM = window.SIM;
  const R = SIM._;
  const L = R.L, LB = R.LB;
  const rnd = R.rnd, withArticle = R.withArticle, pick = R.pick, holdingFor = R.holdingFor;
  const caption = R.caption, makePath = R.makePath, walker = R.walker;
  const ringDoor = R.ringDoor, queueSlot = R.queueSlot, waitSpot = R.waitSpot;

  /* ---------- patron behaviour ---------- */

  function freeSeat(world, patron) {
    let free = world.seats.filter(function (s) { return !s.taken; });
    if (!free.length) return null;
    // The piano trait is opportunistic: if the bench or the room-wide music
    // cooldown is unavailable, this visit proceeds as an ordinary one.
    if (patron.pianist) {
      const piano = free.find(function (s) { return s.piano; });
      const noraAway = world.barista.state.indexOf('piano') !== 0;
      if (piano && cleanSeat(world, piano) && world.t >= world.pianoNextT &&
          noraAway && !SND.pianoActive()) return piano;
    }
    free = free.filter(function (s) { return !s.piano; });
    if (!free.length) return null;
    // skip spots where an abandoned drink still waits for Nora — a newcomer's
    // cup would land on the very same saucer spot (soak-test find)
    const clean = free.filter(function (s) {
      return s.table < 0 || !world.tables[s.table].items.some(function (it) {
        return it.owner === null && it.side === s.side;
      });
    });
    if (clean.length) free = clean;
    if (patron.isRegular) {
      const usual = world.seats.find(function (s) { return s.armchair && s.facing === 1; });
      if (usual && !usual.taken) { patron.usualSeat = true; return usual; }
      if (usual && !patron.regularSeatNoted) {
        patron.regularSeatNoted = true;
        if (Math.random() < 0.7) caption(world, 'Holger\'s chair is taken; he gives it a patient look.');
      }
    }
    if (patron.laptop) {
      const dining = free.filter(function (s) {
        return s.table >= 0 && !s.armchair && !s.nook && !s.window && !s.piano;
      });
      if (dining.length) return pick(dining);
    }
    if (patron.wantsBook || patron.hasShelfBook) {
      const nook = free.filter(function (s) { return s.nook; });
      if (patron.hasShelfBook && nook.length) return pick(nook);   // settle near the shelf
      const reading = free.filter(function (s) { return s.nook || s.armchair; });
      if (reading.length) return pick(reading);
    }
    // prefer sitting opposite someone chatty, sometimes
    return pick(free);
  }

  function cleanSeat(world, seat) {
    return !seat.taken && (seat.table < 0 || !world.tables[seat.table].items.some(function (it) {
      return it.owner === null && it.side === seat.side;
    }));
  }

  function reserveCoupleSeats(world, p) {
    const mate = p.partner;
    if (!mate || p.seat || mate.seat) return !!p.seat;
    let pair = null;
    world.tables.forEach(function (tb, ti) {
      if (pair || tb.small || tb.tall || tb.piano) return;
      const seats = world.seats.filter(function (s) { return s.table === ti && cleanSeat(world, s); });
      if (seats.length >= 2) pair = seats.slice(0, 2);
    });
    if (!pair) {
      L.winTables.some(function (tb, wi) {
        const ti = L.tables.length + LB.sideTables.length + wi;
        const seats = world.seats.filter(function (s) { return s.table === ti && s.window && cleanSeat(world, s); });
        if (seats.length >= 2) { pair = seats.slice(0, 2); return true; }
        return false;
      });
    }
    if (!pair) {
      p.coupleToGo = true; mate.coupleToGo = true;
      return false;
    }
    pair[0].taken = true; pair[1].taken = true;
    p.seat = pair[0]; mate.seat = pair[1];
    const shared = rnd(120, 260);
    p.coupleStay = Math.max(80, shared + rnd(-15, 15));
    mate.coupleStay = Math.max(80, shared + rnd(-15, 15));
    return true;
  }

  /* Window seats live on the sill, not the floor: patrons walk to the seat's
     floor spot (seat.x/y), then hop up to the perch — and where an armchair
     blocks the straight drop from the lane, thread through the seat's
     declared clear column (seat.via, the winSeats twin of busVia). */
  function seatPath(p, seat) {
    makePath(p, seat.via || seat.x, seat.y);
    if (seat.via) p.path.push({ x: seat.x, y: seat.y });
  }

  function perchUp(p) {
    if (p.seat.window) { p.x = p.seat.perchX; p.y = p.seat.perchY; }
  }

  function stepDown(p, seat) {
    if (seat && seat.window) {
      p.x = seat.x; p.y = seat.y;
      p.gazeDur = 0; p.gazeFacing = 0;
    }
  }

  function pathFrom(p, seat, tx, ty) {
    makePath(p, tx, ty);
    if (seat && seat.window && seat.via) {
      p.path = [{ x: seat.via, y: seat.y }, { x: seat.via, y: L.lane }].concat(p.path.slice(1));
    }
  }

  function chairScrape(p, long) {
    if (p.seat && !p.seat.window && !p.seat.armchair && Math.random() < 0.8) {
      SND.chairScrape(long);
    }
  }

  function pathToUmbrella(p, seat) {
    pathFrom(p, seat, L.patronRoutes.umbrellaApproach[0].x, L.patronRoutes.umbrellaApproach[0].y);
    p.path.push(L.patronRoutes.umbrellaApproach[1], L.patronRoutes.umbrellaApproach[2]);
  }

  function joinQueue(p) {
    const slot = queueSlot(p.queueIdx);
    makePath(p, slot.x, slot.y);
    p.state = 'enter'; p.stateT = 0;
  }

  function updatePatron(world, p, dt) {
    p.animT += dt;
    p.stateT += dt;
    if (p.doorCloseT > 0) {
      p.doorCloseT -= dt;
      if (p.doorCloseT <= 0) SND.doorClose();
    }

    switch (p.state) {
      case 'enterDelay': {
        if (p.stateT >= 0) {
          if (p.umbrella) { p.state = 'shake'; p.stateT = 0; }
          else joinQueue(p);
        }
        break;
      }
      case 'shake': {
        p.pose = 'stand'; p.facing = 1;
        p.shakeDropT -= dt;
        if (p.shakeDropT <= 0 && p.shakeDrops < 5) {
          p.shakeDropT = rnd(0.13, 0.22); p.shakeDrops++;
          world.particles.push({ type: 'drop', x: p.x + rnd(-9, 9), y: p.y - rnd(26, 42),
            vx: rnd(-5, 5), vy: rnd(24, 36), age: 0, life: rnd(0.5, 0.8), seed: 0 });
        }
        if (!p.shakePlayed) { p.shakePlayed = true; SND.umbrellaShake(); }
        if (p.stateT > 1.1) {
          if (Math.random() < 0.35) caption(world, p.name + ' shakes the rain off the umbrella.');
          p.state = 'parkUmbrella'; p.stateT = 0;
          p.path = L.patronRoutes.doorToUmbrella.slice(1).map(function (q) { return { x: q.x, y: q.y }; });
        }
        break;
      }
      case 'parkUmbrella': {
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.pose = 'reach'; p.facing = 1;
        if (p.stateT > 0.6) {
          p.pose = 'stand'; p.umbrellaParked = true;
          world.umbrellaStand.push({ owner: p.id, color: p.umbrella.color });
          SND.clink(0.4, 0.025);
          joinQueue(p);
        }
        break;
      }
      case 'enter': {
        if (walker(p, dt)) { p.state = 'queueing'; }
        break;
      }
      case 'queueing': {
        walker(p, dt);
        const slot = queueSlot(p.queueIdx);
        if (Math.hypot(p.x - slot.x, p.y - slot.y) > 2 && (!p.path || !p.path.length)) {
          makePath(p, slot.x, slot.y);
        }
        if (p.queueIdx === 0 && (!p.path || !p.path.length) && world.barista.state === 'idle' && !world.barista.orders.length) {
          p.state = 'ordering'; p.stateT = 0;
          p.facing = 1;
          p.bubble = { icon: p.drink.icon, until: world.t + 1.9 };
          if (p.partner && !p.orderCaptioned) {
            p.orderCaptioned = true; p.partner.orderCaptioned = true;
            caption(world, p.name + ' and ' + p.partner.name + ' order together.');
          } else if (!p.orderCaptioned) {
            caption(world, p.name + ' orders ' + withArticle(p.drink.name) + '.');
          }
        }
        break;
      }
      case 'ordering': {
        if (p.stateT > 2.0) {
          world.barista.orders.push({ patron: p, drink: p.drink });
          // leave the queue
          world.queue.shift();
          world.queue.forEach(function (q, i) {
            q.queueIdx = i;
            const slot = queueSlot(i);
            makePath(q, slot.x, slot.y);
          });
          p.queueIdx = -1;
          p.state = 'waitDrink'; p.stateT = 0;
          // lowest wait spot no other waiter holds (spots free up on pickup)
          const used = {};
          world.patrons.forEach(function (q) {
            if (q !== p && q.state === 'waitDrink') used[q.waitIdx] = true;
          });
          let n = 0;
          while (used[n]) n++;
          p.waitIdx = n;
          const ws = waitSpot(n);
          makePath(p, ws.x, ws.y);
        }
        break;
      }
      case 'waitDrink': {
        walker(p, dt);
        const cup = world.counterCups.find(function (c) { return c.owner === p.id; });
        if (cup && (!p.path || !p.path.length)) {
          p.state = 'pickup'; p.stateT = 0;
          makePath(p, L.pickupSpot.x, L.pickupSpot.y);
        }
        break;
      }
      case 'pickup': {
        if (walker(p, dt)) {
          const idx = world.counterCups.findIndex(function (c) { return c.owner === p.id; });
          if (idx >= 0) world.counterCups.splice(idx, 1);
          p.holding = holdingFor(p.drink.kind);
          SND.clink(0.9, 0.05);
          if (p.coupleToGo || (p.partner && !p.seat && !reserveCoupleSeats(world, p))) {
            caption(world, p.name + ' and ' + p.partner.name + ' take their drinks to go.');
            leaveCafe(world, p);
            break;
          }
          if (p.wantsBook && !p.ownBook) {
            // a borrower: browse the shelf before settling anywhere
            p.state = 'browse'; p.stateT = 0;
            p.browseDur = rnd(2.5, 5.5);
            makePath(p, LB.browseSpot.x, LB.browseSpot.y);
            if (Math.random() < 0.5) caption(world, p.name + ' drifts over to the bookshelf.');
            break;
          }
          const seat = p.seat || freeSeat(world, p);
          if (!seat) {
            caption(world, p.name + ' takes it to go.');
            leaveCafe(world, p);
          } else {
            seat.taken = true;
            p.seat = seat;
            p.state = 'toSeat'; p.stateT = 0;
            seatPath(p, seat);
          }
        }
        break;
      }
      case 'browse': {
        // standing at the shelf, scanning spines (stateT only runs on arrival)
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.facing = 1;
        if (p.stateT > p.browseDur) {
          p.hasShelfBook = true;
          SND.pageTurn();
          if (Math.random() < 0.6) caption(world, p.name + pick([' picks out a well-worn book.', ' finds a book with a promising spine.']));
          const seat = p.seat || freeSeat(world, p);
          if (!seat) {
            p.hasShelfBook = false;
            caption(world, p.name + ' takes it to go.');
            leaveCafe(world, p);
          } else {
            seat.taken = true;
            p.seat = seat;
            p.state = 'toSeat'; p.stateT = 0;
            seatPath(p, seat);
          }
        }
        break;
      }
      case 'fetchBook': {
        // slipped away from their seat (still theirs) to borrow a book
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.facing = 1;
        if (p.stateT > p.browseDur) {
          p.hasShelfBook = true;
          p.holding = 'book';
          SND.pageTurn();
          if (Math.random() < 0.5) caption(world, p.name + pick([' picks out a well-worn book.', ' finds a book with a promising spine.']));
          p.state = 'backToSeat'; p.stateT = 0;
          seatPath(p, p.seat);
        }
        break;
      }
      case 'backToSeat': {
        if (walker(p, dt)) {
          p.pose = 'sit';
          chairScrape(p, false);
          perchUp(p);
          p.facing = p.seat.facing;
          p.holding = null;
          p.reading = true;
          p.state = 'seated'; p.stateT = 0;
        }
        break;
      }
      case 'returnBook': {
        // a moment at the shelf to slide the book home, then on their way
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.facing = 1;
        if (p.stateT > 1.1) {
          p.hasShelfBook = false;
          SND.pageTurn();
          if (Math.random() < 0.4) caption(world, p.name + ' slips the book back onto the shelf.');
          if (p.afterBook === 'return') {
            p.state = 'return'; p.stateT = 0;
            makePath(p, L.returnSpot.x, L.returnSpot.y);
          } else {
            leaveCafe(world, p);
          }
        }
        break;
      }
      case 'toSeat': {
        if (walker(p, dt)) {
          p.pose = 'sit';
          chairScrape(p, false);
          perchUp(p);
          p.facing = p.seat.facing;
          p.state = 'seated'; p.stateT = 0;
          p.stay = p.isRegular ? rnd(280, 420) : (p.coupleStay || rnd(100, 260));
          if (p.seat.table >= 0) {
            world.tables[p.seat.table].items.push({ side: p.seat.side, kind: p.drink.kind, owner: p.id,
              hot: p.drink.kind === 'glass' ? 0 : 45, hidden: false });
            p.holding = null;
            SND.cupDown();
            p.laptopActive = p.laptop && !p.seat.armchair && !p.seat.nook && !p.seat.window && !p.seat.piano;
            if (p.laptopActive) {
              world.tables[p.seat.table].items.push({ side: p.seat.side, kind: 'laptop', owner: p.id, open: true, hot: 0, hidden: false });
              p.typingT = rnd(6, 14);
            }
          }
          if (p.seat.piano) {
            p.pianoBursts = 1 + Math.floor(rnd(0, 3));
            p.pianoRestT = rnd(2, 6);
            p.reading = false;
            if (Math.random() < 0.7) caption(world, p.name + ' settles at the piano.');
          } else if (p.isRegular && p.usualSeat) {
            p.reading = true;
            caption(world, 'Holger settles into his usual armchair.');
          } else if (p.partner && !p.pairCaptioned) {
            p.pairCaptioned = true; p.partner.pairCaptioned = true;
            if (p.seat.window) caption(world, 'Two mugs on one window sill.');
            else caption(world, p.name + ' and ' + p.partner.name + ' share the table' +
              (world.tables[p.seat.table].tag ? ' ' + world.tables[p.seat.table].tag : '') + '.');
            if (p.wantsBook || p.seat.armchair) p.reading = true;
          } else if (p.partner) {
            if (p.wantsBook || p.seat.armchair) p.reading = true;
          } else if (p.seat.armchair) {
            p.reading = true;
            caption(world, p.name + ' sinks into the armchair by the fire.');
          } else if (p.seat.nook) {
            if (p.wantsBook || p.hasShelfBook) p.reading = true;
            if (Math.random() < 0.7) caption(world, p.name + (p.reading ? ' curls up in the reading nook.' : ' settles into the reading nook.'));
          } else if (p.wantsBook) {
            p.reading = true;
            if (Math.random() < 0.5) caption(world, p.name + ' settles in with a book.');
          } else if (p.seat.window) {
            if (Math.random() < 0.6) caption(world, p.name + pick([' perches on the window seat.', ' curls up on the window sill.']));
          } else if (world.tables[p.seat.table] && world.tables[p.seat.table].tag && Math.random() < 0.6) {
            caption(world, p.name + ' finds a seat ' + world.tables[p.seat.table].tag + '.');
          }
        }
        break;
      }
      case 'seated': {
        updateSeated(world, p, dt);
        break;
      }
      case 'return': {
        if (walker(p, dt)) {
          SND.clink(0.7, 0.04);
          p.holding = null;
          const tipped = Math.random() < 0.5;
          if (tipped) SND.coins();
          if (Math.random() < 0.5) {
            caption(world, tipped ? 'a coin in the tip jar — tak!' : p.name + ' returns the cup — tak!');
          }
          leaveCafe(world, p);
        }
        break;
      }
      case 'closeLaptop': {
        p.pose = 'sit';
        if (p.stateT > 0.6) {
          const list = world.tables[p.seat.table].items;
          const laptop = list.find(function (it) { return it.owner === p.id && it.kind === 'laptop'; });
          if (laptop) list.splice(list.indexOf(laptop), 1);
          p.laptopActive = false; p.laptopPacked = true; p.typing = false;
          SND.clink(0.45, 0.025);
          p.state = 'seated'; p.stateT = 0;
          beginDeparture(world, p, dt);
        }
        break;
      }
      case 'collectUmbrella': {
        if (!walker(p, dt)) { p.stateT = 0; break; }
        p.pose = 'reach'; p.facing = -1;
        if (p.stateT > 0.5) {
          const idx = world.umbrellaStand.findIndex(function (u) { return u.owner === p.id; });
          if (idx >= 0) world.umbrellaStand.splice(idx, 1);
          p.umbrellaParked = false; p.pose = 'stand';
          SND.clink(0.4, 0.025);
          if (Math.random() < 0.3) caption(world, p.name + ' collects the umbrella at the door.');
          p.state = 'exit'; p.stateT = 0; p.rangBell = false;
          p.path = L.patronRoutes.umbrellaToDoor.slice(1).map(function (q) { return { x: q.x, y: q.y }; });
        }
        break;
      }
      case 'exit': {
        if (walker(p, dt)) p.gone = true;
        if (Math.hypot(p.x - L.doorSpot.x, p.y - L.doorSpot.y) < 40 && !p.rangBell) {
          p.rangBell = true;
          ringDoor(world);
        }
        break;
      }
    }

    if (p.bubble && world.t > p.bubble.until) p.bubble = null;
  }

  function updateSeated(world, p, dt) {
    p.stay -= dt;

    const item = p.seat.table >= 0
      ? world.tables[p.seat.table].items.find(function (it) { return it.owner === p.id && it.kind !== 'laptop'; })
      : null;

    // One night reader at a time may drift off. Their stay keeps passing, but
    // the book, sip and page clocks rest with them.
    if (p.dozing) {
      p.dozeRemain -= dt; p.zzzT -= dt;
      if (p.zzzT <= 0) {
        p.zzzT = rnd(7, 14);
        p.bubble = { icon: 'zzz', until: world.t + 1.6 };
      }
      if (p.dozeRemain <= 0) wakeDozer(world, p);
      return;
    }
    const dozeEligible = p.reading && (p.seat.armchair || p.seat.nook) &&
      world.daylight < 0.25 && p.stay > 60 && p.sipPhase <= 0 && !p.laptop;
    if (dozeEligible && (!world.sleeper || world.sleeper === p)) {
      p.dozeT -= dt;
      if (p.dozeT <= 0) { startDoze(world, p); return; }
    }

    // sipping
    if (p.sipPhase > 0) {
      p.sipPhase -= dt;
      const tp = 1.3 - p.sipPhase;
      p.armUp = tp < 0.4 ? tp / 0.4 : tp < 0.9 ? 1 : Math.max(0, (1.3 - tp) / 0.4);
      if (tp > 0.45 && !p.sipPlayed) {
        p.sipPlayed = true;
        SND.sip();
        if (!p.matchaSipCaptioned && (p.drink.prep === 'matcha_hot' || p.drink.prep === 'matcha_iced')) {
          p.matchaSipCaptioned = true;
          if (Math.random() < 0.2) caption(world, p.name + ' takes a slow, grassy-sweet sip.');
        }
      }
      if (p.sipPhase <= 0) {
        p.armUp = 0;
        if (item) { item.hidden = false; p.holding = null; SND.cupDown(); }
        else if (p.seat.armchair) { p.holding = null; }
        if (p.resumeReading) { p.reading = true; p.resumeReading = false; }
      }
    } else {
      p.sipT -= dt;
      if (p.sipT <= 0 && p.drink.kind !== 'plate') {
        p.sipT = rnd(9, 22);
        p.sipPhase = 1.3;
        p.sipPlayed = false;
        if (item) { item.hidden = true; p.holding = holdingFor(p.drink.kind); }
        else if (p.seat.armchair) { p.holding = holdingFor(p.drink.kind); }
        if (p.reading) { p.reading = false; p.resumeReading = true; }   // book down for the sip
        p.typing = false;                                               // hands leave the keys
        p.gazeDur = 0; p.gazeFacing = 0;                                // head back for the sip
      }
    }

    // Pianists play a few composed-feeling bursts during an otherwise normal
    // stay. A sip pauses hands and sound together, then resumes the same burst.
    if (p.seat.piano) {
      if (p.playing && p.sipPhase > 0) {
        p.playing = false; p.pianoSipPaused = true; SND.pianoStop();
      } else if (p.pianoSipPaused && p.sipPhase <= 0) {
        p.pianoSipPaused = false; p.playing = true; SND.pianoStart('patron');
      }
      if (p.playing) {
        p.pianoPlayT -= dt;
        if (p.pianoPlayT <= 0) {
          p.playing = false; SND.pianoStop(); p.pianoBursts--;
          if (p.pianoBursts > 0) p.pianoRestT = rnd(8, 20);
          else world.pianoNextT = world.t + rnd(300, 600);
        }
      } else if (!p.pianoSipPaused && p.pianoBursts > 0) {
        p.pianoRestT -= dt;
        if (p.pianoRestT <= 0) {
          p.playing = true; p.pianoPlayT = rnd(40, 90);
          SND.pianoStart('patron');
          if (Math.random() < 0.12) caption(world, 'A soft tune drifts across the café.');
        }
      }
    }

    // the window pulls a perched sitter's gaze now and then (head only —
    // the body keeps leaning on its cushion)
    if (p.seat.window) {
      if (p.gazeDur > 0) {
        p.gazeDur -= dt;
        if (p.gazeDur <= 0) { p.gazeFacing = 0; p.gazeT = rnd(20, 50); }
      } else {
        p.gazeT -= dt;
        if (p.gazeT <= 0 && p.sipPhase <= 0) {
          p.gazeDur = rnd(3.5, 8);
          p.gazeFacing = -p.seat.facing;
          if (Math.random() < 0.2) {
            caption(world, p.name + (world.rain > 0.4 ? ' watches the rain run down the glass.'
              : world.daylight < 0.3 ? ' watches the streetlamps glow outside.'
              : ' watches the street drift by for a while.'));
          }
        }
      }
    }

    // reading
    if (p.reading) {
      p.pageT -= dt;
      if (p.pageT <= 0) {
        p.pageT = rnd(12, 26);
        SND.pageTurn();
        if (Math.random() < 0.12) caption(world, p.name + ' turns a page.');
      }
    }

    // Laptop work comes in short, soft bouts. The timer continues through a
    // sip, while the actual typing pose and sounds wait for the cup to settle.
    if (p.laptopActive) {
      if (p.typingRemain > 0) {
        if (p.sipPhase <= 0) {
          p.typing = true;
          p.typingRemain -= dt; p.keyT -= dt;
          if (p.keyT <= 0) { p.keyT = rnd(0.7, 1.25); SND.keys(); }
        }
        if (p.typingRemain <= 0) { p.typing = false; p.typingT = rnd(6, 14); }
      } else {
        p.typingT -= dt;
        if (p.typingT <= 0) {
          p.typingRemain = rnd(2, 3.5); p.keyT = 0;
          if (Math.random() < 0.1) caption(world, p.name + pick([
            ' types a few quiet lines.',
            ' frowns gently at the screen, then lets it go.'
          ]));
        }
      }
    }

    // chatting with a table-mate
    if (p.chatty && p.seat.table >= 0) {
      p.chatT -= dt;
      if (p.chatT <= 0) {
        p.chatT = p.partner ? rnd(12, 26) : rnd(16, 34);
        const mate = (p.partner && p.partner.state === 'seated') ? p.partner : world.patrons.find(function (q) {
          return q !== p && q.state === 'seated' && q.seat.table === p.seat.table;
        });
        if (mate) {
          p.bubble = { icon: p.partner && Math.random() < 0.05 ? 'heart' : 'dots', until: world.t + 1.6 };
          SND.murmur(p.murmurPitch);
          mate.chatReply = rnd(1.2, 2);
          if (Math.random() < 0.15) caption(world, 'Soft murmurs drift from the table ' + (world.tables[p.seat.table].tag || 'in the corner') + '.');
        }
      }
    }
    if (p.chatReply > 0) {
      p.chatReply -= dt;
      if (p.chatReply <= 0) {
        p.bubble = { icon: 'dots', until: world.t + 1.4 };
        SND.murmur(p.murmurPitch);
      }
    }

    // now and then the bookshelf calls (drink stays on the table, seat stays theirs)
    if (!p.seat.piano && !p.reading && !p.holding && !p.laptopActive && p.sipPhase <= 0 && p.stay > 55 && p.seat.table >= 0 &&
        Math.random() < dt * 0.01) {
      p.pose = 'stand';
      chairScrape(p, true);
      stepDown(p, p.seat);
      p.state = 'fetchBook'; p.stateT = 0;
      p.browseDur = rnd(2.5, 4.5);
      pathFrom(p, p.seat, LB.browseSpot.x, LB.browseSpot.y);
      if (Math.random() < 0.5) caption(world, p.name + ' wanders over to the bookshelf.');
      return;
    }

    // time to go
    if (p.stay <= 0 && p.sipPhase <= 0) {
      if (p.seat.piano && (p.playing || p.pianoSipPaused)) return;
      if (p.seat.piano && p.pianoBursts > 0) {
        p.pianoBursts = 0;
        world.pianoNextT = world.t + rnd(300, 600);
      }
      if (p.partner) {
        if (!p.coupleLeaveAt) {
          if (p.partner.state !== 'seated' || p.partner.stay > 0) return;
          const t = world.t;
          p.coupleLeaveAt = t + (p.id < p.partner.id ? 0 : 0.8);
          p.partner.coupleLeaveAt = t + (p.id < p.partner.id ? 0.8 : 0);
          const bus = Math.random() < 0.5;
          p.coupleBus = bus; p.partner.coupleBus = bus;
        }
        if (world.t < p.coupleLeaveAt) return;
      }
      if (p.laptopActive) {
        const laptop = world.tables[p.seat.table].items.find(function (it) {
          return it.owner === p.id && it.kind === 'laptop';
        });
        if (laptop) laptop.open = false;
        p.typing = false; p.state = 'closeLaptop'; p.stateT = 0;
        return;
      }
      beginDeparture(world, p, dt);
    }
  }

  function startDoze(world, p) {
    if (world.sleeper && world.sleeper !== p) return false;
    p.dozing = true; p.reading = false; p.resumeReading = true;
    p.dozeRemain = rnd(40, 110); p.zzzT = rnd(4, 8);
    world.sleeper = p;
    caption(world, p.name + ' has fallen asleep over their book.');
    return true;
  }

  function wakeDozer(world, p) {
    p.dozing = false; p.reading = true; p.resumeReading = false;
    p.dozeT = rnd(70, 140);
    if (world.sleeper === p) world.sleeper = null;
    if (Math.random() < 0.5) caption(world, p.name + ' blinks awake and finds the line again.');
  }

  function beginDeparture(world, p, dt) {
    if (p.catLeaveT > 0) { p.catLeaveT -= dt; return; }
    if (world.cat.lapPatron === p) {
      SIM.dislodgeCat(p); p.catLeaveT = 1; return;
    }
    if (p.seat && p.seat.piano) {
      if (p.playing || p.pianoSipPaused) SND.pianoStop();
      p.playing = false; p.pianoSipPaused = false;
      if (world.t >= world.pianoNextT) world.pianoNextT = world.t + rnd(300, 600);
    }
    p.pose = 'stand'; p.reading = false; p.dozing = false; p.armUp = 0; p.typing = false;
    chairScrape(p, true);
    if (world.sleeper === p) world.sleeper = null;
    p.seat.taken = false;
    const list = p.seat.table >= 0 ? world.tables[p.seat.table].items : null;
    const item = list ? list.find(function (it) { return it.owner === p.id && it.kind !== 'laptop'; }) : null;
    let bussing = p.partner ? !!p.coupleBus : false;
    if (!p.partner) bussing = Math.random() < 0.4;
    if (item) {
      if (bussing) {
        list.splice(list.indexOf(item), 1);
        p.holding = holdingFor(item.kind);
      } else item.owner = null;
    }
    const seat = p.seat;
    p.seat = null;
    stepDown(p, seat);
    if (p.hasShelfBook) {
      p.afterBook = bussing ? 'return' : 'exit';
      p.state = 'returnBook'; p.stateT = 0;
      pathFrom(p, seat, LB.browseSpot.x, LB.browseSpot.y);
      return;
    }
    if (bussing) {
      p.state = 'return'; p.stateT = 0;
      pathFrom(p, seat, L.returnSpot.x, L.returnSpot.y);
      return;
    }
    leaveCafe(world, p, seat);
  }

  function leaveCafe(world, p, seat) {
    p.stateT = 0; p.rangBell = false;
    if (p.umbrellaParked) {
      p.state = 'collectUmbrella';
      pathToUmbrella(p, seat);
    } else {
      p.state = 'exit';
      pathFrom(p, seat, L.doorSpot.x, L.doorSpot.y);
    }
    if (Math.random() < 0.35) caption(world, p.name + ' heads back out into the ' + (world.rain > 0.4 ? 'rain' : (world.daylight < 0.3 ? 'night' : 'afternoon')) + '.');
  }

  R.freeSeat = freeSeat;
  R.updatePatron = updatePatron;
  R.startDoze = startDoze;
})();
