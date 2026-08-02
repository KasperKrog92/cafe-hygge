# Characters

The café's cast: one barista, a rotating pool of patrons, and a cat. All
behavior is dt-driven state machines in `js/sim.js`; all drawing is
`SCENE.drawPerson` / `SCENE.drawCat` in `js/scene.js`.

---

## Nora — the barista

The café's constant. She never leaves for the night (someone has to keep the
fire company). Sea-blue top, cream apron, long brown hair.

**Home position:** behind the counter at `L.baristaHome` (340, 122) — the y
matters; see art.md. She exits the counter through the gap at x = 305 when she
needs to be out on the floor.

### Order flow

Orders queue in `barista.orders` (FIFO). For each order she walks to the right
station and works through timed steps (each with its own sound):

| Drink prep | Steps (station x → action, duration) |
| --- | --- |
| `coffee_milk` (cappuccino, cinnamon latte, flat white) | 330 grind 1.5 s → tamp 0.55 s → 338 pull 2.4 s → 352 steam 1.8 s |
| `coffee` (espresso) | grind → tamp → pull |
| `tea` (chamomile) | 350 kettle pour 2.0 s |
| `milk` (hot chocolate) | 352 steam 1.8 s |
| `food` (bun, croissant) | 428 fetch from pastry case 1.4 s |

Then she carries the cup/plate to the pass (`L.serveSpot` = 366, 118), sets it
down (clink), and rings the counter bell (*ding*). While pulling/steaming, the
machine light blinks and steam particles rise (`world.brew`).

### Idle life (only when nobody is queueing)

Every 6–15 s she picks a task:

- **Bus a table** (priority if any table has an abandoned cup — `item.owner
  === null`): walks out, collects it (clink + wipe swish), carries it home.
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
colors; 40% wear a scarf; 40% have long hair. Walk speed 23–30 px/s.

**Personality rolls:**

- `wantsBook` (35%) — a reader. Prefers the armchair; reads at tables too.
- `chatty` (55%) — will murmur with a table-mate.
- `murmurPitch` (125–235 Hz) — their voice in the murmur synth.

**Order:** weighted pick — cappuccino 3, cinnamon latte 2.5, flat white 2,
chamomile tea 1.6, hot chocolate 1.6, espresso 1.2, cardamom bun 1.2, butter
croissant 1.

### Patron lifecycle (states)

```
enter → queueing → ordering → waitDrink → pickup → toSeat → seated → (return) → exit
```

1. **enter** — appears at the door (bell jingle, door swings, thud ~1.1 s
   later), walks to the back of the queue. Queue slots fan out diagonally from
   the till (`L.orderSpot` 348, 168).
2. **ordering** — when at slot 0 and Nora is free: 2 s with a speech bubble
   showing their order icon; caption fires ("Freja orders a cappuccino.").
3. **waitDrink** — steps aside to a waiting spot until their cup appears at
   the pass with their id on it.
4. **pickup** — takes the cup (clink) and picks a seat: readers take the
   armchair if free; otherwise a random free stool. If the café is full they
   take it to go.
5. **seated** — the long, cozy middle (stay 100–260 s):
   - **Sipping** (drinks only): every 9–22 s, a 1.3 s animation — cup rises
     from the table (the table item hides, cup appears in hand), sip sound at
     the peak, cup set down (soft clink). Steam rises while the cup is hot
     (first ~45 s).
   - **Reading** (readers): page-turn sound every 12–26 s; occasional caption.
   - **Chatting** (chatty, with a seated table-mate): every 16–34 s, a "…"
     bubble + murmur; the mate replies 1.2–2 s later with their own pitch.
6. **leaving** — 40% carry their cup back to the counter ("returns the cup —
   tak!"); the rest leave it for Nora. Exit via the door (bell again). Armchair
   readers wander out cup-in-hand — the café allows it.

**Spawning:** roughly every 26 s at full daylight stretching to ~80 s at
night. Caps: 7 patrons in daytime, 4 in the evening, 2 between 23:00 and 06:00
(the night owls). Two regulars are pre-seated at boot so the café is never
empty on arrival.

---

## The cat

Orange tabby, no name (it has not told anyone yet). The café's true owner.

**Favorite spots:** the fireplace rug (196, 152), by the window (86, 172), the
big rug (168, 226), beside the armchair (144, 190).

**States:** `sleep` (35–100 s; purrs every 10–25 s; occasional "zzz" bubble)
→ `sit` (5–12 s) → sometimes `groom` (3–6 s) or `stretch` (1.6 s) → `walk` to
a new spot (16 px/s, sometimes a meow, usually a caption) → `sleep`/`loaf`/`sit`.
Sleeping shows a 1-px breathing animation; sitting sways the tail.

**Petting:** clicking within ~16 px of the cat triggers `SIM.petCat` — heart
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
