/* Café Hygge — patron state machine */
(function () {
  'use strict';

  const SIM = window.SIM;
  const R = SIM._;
  const L = R.L, LB = R.LB;
  const rnd = R.rnd, withArticle = R.withArticle, pick = R.pick;
  const caption = R.caption, makePath = R.makePath, walker = R.walker;
  const ringDoor = R.ringDoor, queueSlot = R.queueSlot, waitSpot = R.waitSpot;

  /* ---------- patron behaviour ---------- */

  function freeSeat(world, patron) {
    let free = world.seats.filter(function (s) { return !s.taken; });
    if (!free.length) return null;
    // skip spots where an abandoned drink still waits for Nora — a newcomer's
    // cup would land on the very same saucer spot (soak-test find)
    const clean = free.filter(function (s) {
      return s.table < 0 || !world.tables[s.table].items.some(function (it) {
        return it.owner === null && it.side === s.side;
      });
    });
    if (clean.length) free = clean;
    if (patron.wantsBook || patron.hasShelfBook) {
      const nook = free.filter(function (s) { return s.nook; });
      if (patron.hasShelfBook && nook.length) return pick(nook);   // settle near the shelf
      const reading = free.filter(function (s) { return s.nook || s.armchair; });
      if (reading.length) return pick(reading);
    }
    // prefer sitting opposite someone chatty, sometimes
    return pick(free);
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

  function updatePatron(world, p, dt) {
    p.animT += dt;
    p.stateT += dt;
    if (p.doorCloseT > 0) {
      p.doorCloseT -= dt;
      if (p.doorCloseT <= 0) SND.doorClose();
    }

    switch (p.state) {
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
          caption(world, p.name + ' orders ' + withArticle(p.drink.name) + '.');
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
          p.holding = p.drink.kind === 'plate' ? 'plate' : 'cup';
          SND.clink(0.9, 0.05);
          if (p.wantsBook && !p.ownBook) {
            // a borrower: browse the shelf before settling anywhere
            p.state = 'browse'; p.stateT = 0;
            p.browseDur = rnd(2.5, 5.5);
            makePath(p, LB.browseSpot.x, LB.browseSpot.y);
            if (Math.random() < 0.5) caption(world, p.name + ' drifts over to the bookshelf.');
            break;
          }
          const seat = freeSeat(world, p);
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
          const seat = freeSeat(world, p);
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
          perchUp(p);
          p.facing = p.seat.facing;
          p.state = 'seated'; p.stateT = 0;
          p.stay = rnd(100, 260);
          if (p.seat.table >= 0) {
            world.tables[p.seat.table].items.push({ side: p.seat.side, kind: p.drink.kind, owner: p.id, hot: 45, hidden: false });
            p.holding = null;
            SND.cupDown();
          }
          if (p.seat.armchair) {
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
          if (Math.random() < 0.5) caption(world, p.name + ' returns the cup — tak!');
          leaveCafe(world, p);
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
      ? world.tables[p.seat.table].items.find(function (it) { return it.owner === p.id; })
      : null;

    // sipping
    if (p.sipPhase > 0) {
      p.sipPhase -= dt;
      const tp = 1.3 - p.sipPhase;
      p.armUp = tp < 0.4 ? tp / 0.4 : tp < 0.9 ? 1 : Math.max(0, (1.3 - tp) / 0.4);
      if (tp > 0.45 && !p.sipPlayed) { p.sipPlayed = true; SND.sip(); }
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
        if (item) { item.hidden = true; p.holding = 'cup'; }
        else if (p.seat.armchair) { p.holding = 'cup'; }
        if (p.reading) { p.reading = false; p.resumeReading = true; }   // book down for the sip
        p.gazeDur = 0; p.gazeFacing = 0;                                // head back for the sip
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

    // chatting with a table-mate
    if (p.chatty && p.seat.table >= 0) {
      p.chatT -= dt;
      if (p.chatT <= 0) {
        p.chatT = rnd(16, 34);
        const mate = world.patrons.find(function (q) {
          return q !== p && q.state === 'seated' && q.seat.table === p.seat.table;
        });
        if (mate) {
          p.bubble = { icon: 'dots', until: world.t + 1.6 };
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
    if (!p.reading && !p.holding && p.sipPhase <= 0 && p.stay > 55 && p.seat.table >= 0 &&
        Math.random() < dt * 0.01) {
      p.pose = 'stand';
      stepDown(p, p.seat);
      p.state = 'fetchBook'; p.stateT = 0;
      p.browseDur = rnd(2.5, 4.5);
      pathFrom(p, p.seat, LB.browseSpot.x, LB.browseSpot.y);
      if (Math.random() < 0.5) caption(world, p.name + ' wanders over to the bookshelf.');
      return;
    }

    // time to go
    if (p.stay <= 0 && p.sipPhase <= 0) {
      if (p.catLeaveT > 0) {
        p.catLeaveT -= dt;
        return;
      }
      if (world.cat.lapPatron === p) {
        SIM.dislodgeCat(p);
        p.catLeaveT = 1;
        return;
      }
      p.pose = 'stand';
      p.reading = false;
      p.armUp = 0;
      p.seat.taken = false;
      let bussing = false;
      if (item) {
        bussing = Math.random() < 0.4;
        if (bussing) {
          const list = world.tables[p.seat.table].items;
          list.splice(list.indexOf(item), 1);
          p.holding = item.kind === 'plate' ? 'plate' : 'cup';
        } else {
          item.owner = null;   // left behind for Nora to collect
        }
      }
      const seat = p.seat;
      p.seat = null;
      stepDown(p, seat);
      if (p.hasShelfBook) {
        // the borrowed book goes home first
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
  }

  function leaveCafe(world, p, seat) {
    p.state = 'exit'; p.stateT = 0;
    p.rangBell = false;
    pathFrom(p, seat, L.doorSpot.x, L.doorSpot.y);
    if (Math.random() < 0.35) caption(world, p.name + ' heads back out into the ' + (world.rain > 0.4 ? 'rain' : (world.daylight < 0.3 ? 'night' : 'afternoon')) + '.');
  }

  R.freeSeat = freeSeat;
  R.updatePatron = updatePatron;
})();
