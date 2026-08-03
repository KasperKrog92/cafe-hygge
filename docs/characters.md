# Characters

The café's cast: one barista, a rotating pool of patrons, and a cat. All
behavior is dt-driven state machines in `js/sim-patrons.js` and
`js/sim-characters.js`; all drawing is
`SCENE.drawPerson` / `SCENE.drawCat` in `js/scene-people.js`.

---

## Nora — the barista

The café's constant. She never leaves for the night (someone has to keep the
fire company). Sea-blue top, cream apron (neck straps, pocket, tie bow at the
back), long brown hair with a side-part fringe (`hairStyle: 1`).

**Home position:** behind the counter at `L.baristaHome` (706, 286) — the y
matters; see art.md. She exits the counter through the gap at x = 616 when she
needs to be out on the floor.

### Order flow

Orders queue in `barista.orders` (FIFO). For each order she walks to the right
station and works through timed steps (each with its own sound):

| Drink prep | Steps (station x → action, duration) |
| --- | --- |
| `coffee_milk` (cappuccino, cinnamon latte, flat white) | 664 grind 1.5 s → tamp 0.55 s → 678 pull 2.4 s → 706 steam 1.8 s |
| `coffee` (espresso) | grind → tamp → pull |
| `tea` (chamomile) | 700 kettle pour 2.0 s |
| `milk` (hot chocolate) | 706 steam 1.8 s |
| `food` (bun, croissant) | 858 fetch from pastry case 1.4 s |

Then she carries the cup/plate to the pass (`L.serveSpot` = 744, 266), sets it
down (clink), and rings the counter bell (*ding*). While pulling/steaming, the
machine light blinks and steam particles rise (`world.brew`).

### Idle life (only when nobody is queueing)

Every 6–15 s she picks a task:

- **Bus a table** (priority if any table has an abandoned cup — `item.owner
  === null`): walks out, collects it (clink + wipe swish), carries it home.
  Routes come from `SIM._.busRoute` (shared with `__dev.audit()`), every leg
  axis-aligned: big tables are approached by dropping from the lane at the
  bus spot; the nook side tables via their declared `busVia` columns, which
  thread between the wing chairs and reading lamps (a straight drop would
  cut through them — the audit's journey check proves each route).
- **Wipe the counter** (40%): cloth in hand, three slow swishes.
- **Polish a cup** (25%): stands still, cup in hand.
- **Tidy the pastry case** (20%): walks to the case, soft clink.
- Otherwise just stands, watching the room.

If anyone is waiting in the queue she stays at the till and faces them.

---

## Patrons

Generated on spawn from pools, so every visitor is a little different.

**Names (Danish):** Freja, Søren, Astrid, Mikkel, Ida, Emil, Clara, Anton,
Sofie, Johan, Maja, Viggo, Ellen, Oskar, Alma, Karl.

**Appearance rolls:** 5 skin tones, 8 hair colors, 9 top colors, 5 trouser
colors; 40% wear a scarf (knotted, with a hanging tail); 40% have long hair;
4 hair styles (classic / side-part / curly / bun, uniform roll); 15% wear a
beard. Walk speed 46–60 px/s, animated as a 4-frame cycle.

**Personality rolls:**

- `wantsBook` (35%) — a reader. 45% of readers brought their own book
  (`ownBook`); the rest borrow one from the nook bookshelf. Readers prefer
  the nook chairs / fireside armchairs; they read at tables too.
- `chatty` (55%) — will murmur with a table-mate.
- `murmurPitch` (125–235 Hz) — their voice in the murmur synth.

**Order:** weighted pick — cappuccino 3, cinnamon latte 2.5, flat white 2,
chamomile tea 1.6, hot chocolate 1.6, espresso 1.2, cardamom bun 1.2, butter
croissant 1.

### Patron lifecycle (states)

```
enter → queueing → ordering → waitDrink → pickup → (browse) → toSeat
  → seated ⇄ (fetchBook → backToSeat) → (returnBook) → (return) → exit
```

1. **enter** — appears at the door (bell jingle, door swings, thud ~1.1 s
   later), walks to the back of the queue. Queue slots fan out diagonally from
   the till (`L.orderSpot` 696, 316).
2. **ordering** — when at slot 0 and Nora is free: 2 s with a speech bubble
   showing their order icon; caption fires ("Freja orders a cappuccino.").
3. **waitDrink** — steps aside to the lowest free waiting spot (the cluster
   drifts down-left from the pass; spots free up on pickup) until their cup
   appears at the pass with their id on it.
4. **pickup** — takes the cup (clink). Book-borrowers (`wantsBook` without
   `ownBook`) first **browse** the bookshelf (2.5–5.5 s at the browse spot,
   page-turn sound, `hasShelfBook = true` — a spine visibly leaves the shelf),
   then pick a seat. Seat choice: spots where an abandoned drink still waits
   for Nora are avoided while cleaner seats exist (two cups would share one
   saucer spot); borrowers prefer the nook chairs; readers in general prefer
   nook chairs / fireside armchairs; otherwise a random free seat. If the
   café is full they take it to go.
5. **seated** — the long, cozy middle (stay 100–260 s):
   - **Sipping** (drinks only): every 9–22 s, a 1.3 s animation — cup rises
     from the table (the table item hides, cup appears in hand), sip sound at
     the peak, cup set down (soft clink). Readers lower the book for the sip
     and pick it back up. Steam rises while the cup is hot (first ~45 s).
     Nook sitters rest their drink on their own little side table.
   - **Reading** (readers): page-turn sound every 12–26 s; occasional caption.
   - **Fetching a book**: a seated non-reader at a table sometimes wanders to
     the bookshelf mid-stay (seat and drink stay put), browses, and walks
     back with the book tucked under an arm (`holding: 'book'`), then reads.
   - **Chatting** (chatty, with a seated table-mate): every 16–34 s, a "…"
     bubble + murmur; the mate replies 1.2–2 s later with their own pitch.
6. **leaving** — 40% carry their cup back to the counter ("returns the cup —
   tak!"); the rest leave it for Nora. Anyone with a borrowed book stops at
   the shelf first to slide it home (**returnBook**, ~1.1 s — the spine
   reappears). Exit via the door (bell again). Armchair readers wander out
   cup-in-hand — the café allows it.

**Spawning:** roughly every 26 s at full daylight stretching to ~80 s at
night. Caps: 7 patrons in daytime, 4 in the evening, 2 between 23:00 and 06:00
(the night owls). Three regulars are pre-seated at boot (one of them reading
a borrowed book in the nook) so the café is never empty on arrival.

---

## The cat

Orange tabby, no name (it has not told anyone yet). The café's true owner.

**Favorite spots:** the fireplace rug (390, 294), by the window (168, 378), the
big rug (340, 468), beside the left armchair (252, 312), the reading nook rug
(768, 550).

**States:** `sleep` (35–100 s; purrs every 10–25 s; occasional "zzz" bubble)
→ `sit` (5–12 s) → sometimes `groom` (3–6 s, with a raised paw) or `stretch`
(1.6 s) → `walk` to a new spot (32 px/s, sometimes a meow, usually a caption)
→ `sleep`/`loaf`/`sit`. Sleeping shows a 2-px breathing animation (stripes
ride the breath) with the tail curled around the front; sitting wraps the
tail around the paws with the pale tip swaying; an ear flicks occasionally in
every pose. See art.md for the sprite details.

**Petting:** clicking within ~36 px of the cat triggers `SIM.petCat` — heart
bubble, meow or purr, caption "The cat purrs happily." If asleep, it sits up.
This is the app's only direct interaction; keep it that way unless a new
interaction is equally gentle.

---

## Adding characters (guidance)

- New patron *variety* (outfits, hairstyles, accessories) goes in the
  appearance pools + `SCENE.drawPerson`.
- New patron *behavior* belongs in `updateSeated` as another timer-driven
  habit (like sipping/reading), with a quiet sound and an occasional caption.
- A second staff member or a café dog would need their own entity + drawables
  entry in `SIM.entityDrawables` — follow the cat as the template.
- Every character action should be **slow, periodic, and interruptible** —
  nothing urgent, nothing that demands watching.
