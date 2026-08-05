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
| `matcha_hot` (matcha latte) | `L.matchaBar.x` scoop 0.8 s → 700 kettle pour 1.4 s → `L.matchaBar.x` whisk 2.2 s → 706 steam 1.8 s |
| `matcha_iced` (iced matcha) | `L.matchaBar.x` scoop 0.8 s → 700 kettle pour 1.0 s → `L.matchaBar.x` whisk 2.2 s → ice 1.0 s |
| `food` (bun, croissant) | 858 fetch from pastry case 1.4 s |

Then she carries the cup/glass/plate to the pass (`L.serveSpot` = 744, 266),
sets it down (clink), and rings the counter bell (*ding*). During machine-stage
steps the machine light blinks and steam particles rise (`world.brew`). Matcha
whisking instead animates the chasen and a pale-green surface in the chawan,
with sparser steam there; the iced finish visibly fills a glass at the matcha
bar.

### Idle life (only when nobody is queueing)

Every 6–15 s she picks a task. The priority ladder is service first, then
daily care, then small counter-life:

- **Bus a table** (priority if any table has an abandoned cup — `item.owner
  === null`): walks out and clears the whole table in one visit — every
  abandoned piece picked up a beat apart (a clink each, wipe swish once the
  stack is squared), then carried home together. Two or more pieces render
  as a saucer-and-cup stack in her hands; a rare caption (30%) marks the
  armful. Routes come from `SIM._.busRoute` (shared with `__dev.audit()`), every leg
  axis-aligned: big tables are approached by dropping from the lane at the
  bus spot; the nook side tables via their declared `busVia` columns, which
  thread between the wing chairs and reading lamps (a straight drop would
  cut through them — the audit's journey check proves each route); the tall
  window tables at a spot on their floor line (the tabletop itself is up at
  the sill).
- **Refill the cat bowls** (priority immediately below bussing): when food is
  below 0.34 or water below 0.2, follows the declared `refillRoute` to the
  cat corner, crouches for 1.6 s, pours quietly, and restores the low bowls
  to 1. The cat may supervise. The route is shared with `__dev.audit()`.
- **Light the candles** (next priority): when daylight falls below 0.5,
  carries one lit taper around every dining and nook table, then the mantel.
  Each flame blooms over about 2 s. A queue arrival lets her finish the
  current candle, park the round, serve, and resume at the next unlit stop.
  The chained `candleRoute` is shared with `__dev.audit()`.
- **Water the plants** (after candle and bowl care): once per café day between
  09:00 and 16:00, carries a copper can to the counter plant and both floor
  plants. A queue arrival parks the round after the current plant. The three
  cumulative `waterRoute` paths are shared with `__dev.audit()`.
- **Play the piano** (below plant care): after at least 30 truly empty seconds
  with daylight below 0.35, a 25% candidate roll may send her out through the
  lane and the piano's clear descent column. She sits and plays sparsely for
  60–120 s, then observes a 600–1200 s cooldown. A doorbell, queue, or order
  ends the phrase; she stands, returns behind the counter, and serves. The
  route is shared with `__dev.audit()`.
- **Chalk the menu** (due every 600–1200 s): reaches up behind the counter for
  3 s; the cached board then remembers a different heart, curled cat,
  steaming cup, sprig, umbrella, or bamboo whisk. Rain weights the umbrella
  heavily; the whisk's matching caption describes it appearing by the prices.
- **Stretch** (30% candidate after 20 quiet seconds with a truly empty café):
  both arms overhead for 2.2 s, then back to watching the room.
- **Wipe the counter** (35% of the ordinary pool): cloth in hand, three slow swishes.
- **Polish a cup** (22%): stands still, cup in hand.
- **Tidy the pastry case** (18%): walks to the case, soft clink.
- Otherwise just stands, watching the room (drawn in the front view, facing
  out from behind the counter).

If anyone is waiting in the queue she stays at the till, facing the room;
the patron at the front steps up and turns to face her across the counter
(their back view meeting her front view).

---

## Patrons

Generated on spawn from pools, so every visitor is a little different.

**Names (Danish):** a name style is selected first, with equal odds, then a
name from its pool. The feminine pool is Freja, Astrid, Ida, Clara, Sofie,
Maja, Ellen, Alma; the masculine pool is Søren, Mikkel, Emil, Anton, Johan,
Viggo, Oskar, Karl. Custom dev-harness names use a neutral `custom` style.

**Appearance rolls:** 5 skin tones, 8 hair colors, 9 top colors, 5 trouser
colors; 40% wear a scarf (knotted, with a hanging tail); 40% have long hair;
4 hair styles (classic / side-part / curly / bun, uniform roll). Patrons with
a masculine name style have a 30% beard roll; other styles do not, preserving
the former 15% overall rate while keeping names and facial hair coherent.
Walk speed 46–60 px/s, animated as a 4-frame cycle.

**Personality rolls:**

- `wantsBook` (35%) — a reader. 45% of readers brought their own book
  (`ownBook`); the rest borrow one from the nook bookshelf. Readers prefer
  the nook chairs / fireside armchairs; they read at tables too.
- `chatty` (55%) — will murmur with a table-mate.
- `murmurPitch` (125–235 Hz) — their voice in the murmur synth.
- `laptop` — 16% of non-readers by day, 6% from 21:00–07:00. They prefer a
  dining table; when only perches or wing chairs remain, the trait stays
  dormant and the visit proceeds normally.
- `pianist` — 10% of patrons who are neither readers nor laptop users; never
  a couple member or Holger. They take the piano bench only when it and the
  world-level 300–600 s music cooldown are free. Otherwise the trait stays
  dormant and the visit proceeds normally.

**Order:** weighted pick — cappuccino 3, cinnamon latte 2.5, flat white 2,
matcha latte 1.8, chamomile tea 1.6, hot chocolate 1.6, iced matcha 1.4,
espresso 1.2, cardamom bun 1.2, butter croissant 1.

### Patron lifecycle (states)

```
(enterDelay) → (shake → parkUmbrella) → enter → queueing → ordering
  → waitDrink → pickup → (browse) → toSeat → seated
  ⇄ (fetchBook → backToSeat) → (closeLaptop) → (returnBook)
  → (return) → (collectUmbrella) → exit
```

1. **enter** — appears at the door (bell jingle, door swings, thud ~1.1 s
   later), walks to the back of the queue. Queue slots fan out diagonally from
   the till (`L.orderSpot` 696, 316). In rain, 75% carry a furled umbrella:
   **shake** holds at the door for 1.1 s with five falling drops and a soft
   flap, then **parkUmbrella** follows the declared door-to-stand route and
   adds the umbrella to `world.umbrellaStand` before queueing.
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
   nook chairs / fireside armchairs / window perches; otherwise a random free
   seat. If the café is full they take it to go.
   **Window perches** are reached by walking to the seat's floor spot and
   hopping up onto the sill (win2's left perch first descends through its
   declared clear column, `seat.via`, so the walk never cuts the fireside
   armchair — and leaves the same way). Both perches at a window share the
   tall table under the glass for their drinks.
   A pianist may instead take the appended piano bench; its drink goes to the
   dedicated saucer spot on the lid, so sipping, steam, cup return, abandoned
   cup avoidance, and Nora's normal bussing all use the shared table pipeline.
5. **seated** — the long, cozy middle (stay 100–260 s):
   - **Sipping** (drinks only): every 9–22 s, a 1.3 s animation — the cup,
     handle-less matcha bowl, or iced glass rises from the table (the table
     item hides, the right vessel appears in hand), sip sound at the peak,
     then it is set down (soft clink). Readers lower the book for the sip and
     pick it back up. Steam rises while a drink is hot (first ~45 s); the iced
     matcha never steams. Either matcha may earn one first-sip caption check
     per visitor.
     Nook sitters rest their drink on their own little side table.
   - **Reading** (readers): page-turn sound every 12–26 s; occasional caption.
   - **Laptop work** (day-weighted non-readers at dining tables): an open
     16 px laptop shares the tabletop with the drink. Every 6–14 s they type
     for 2–3.5 s, with alternating forearms and sparse keystroke clusters;
     sipping pauses their hands. The open screen casts a very faint cool glow
     after dark. Before leaving they close the lid for 0.6 s and tuck it under
     the free arm.
   - **Piano playing** (active pianist trait at the bench): 1–3 quiet
     40–90 s bursts with 8–20 s sit-backs between them. The `playing` pose
     reaches both forearms sideways to the keys; sipping pauses the hands and
     felt-piano engine together, then resumes the same burst. The final burst
     starts the room-wide cooldown, and the music box yields while keys sound.
   - **Dozing** (only one at a time): after dark, a reader in a fireside or
     nook wing chair with more than a minute left may fall asleep over the
     lowered book for 40–110 s. Closed eyes, slow breathing, and an occasional
     `zzz` bubble carry the beat; page and sip clocks pause. They wake on their
     own, or on 25% of doorbells, and continue reading. Nora never intervenes.
   - **Fetching a book**: a seated non-reader at a table sometimes wanders to
     the bookshelf mid-stay (seat and drink stay put), browses, and walks
     back with the book tucked under an arm (`holding: 'book'`), then reads.
   - **Chatting** (chatty, with a seated table-mate): every 16–34 s, a "…"
     bubble + murmur; the mate replies 1.2–2 s later with their own pitch.
     Two window sitters share a table, so a window pair can murmur across
     the glass.
   - **Watching the window** (window sitters): every 20–50 s the street pulls
     their gaze for 3.5–8 s — the head turns toward the glass while the body
     keeps leaning on its cushion (`gazeFacing`); a sip turns the head back.
     Occasional caption, weather- and hour-aware (rain on the glass /
     streetlamps / the street drifting by).
6. **leaving** — 40% carry their cup back to the counter ("returns the cup —
   tak!"); the rest leave it for Nora. Anyone with a borrowed book stops at
   the shelf first to slide it home (**returnBook**, ~1.1 s — the spine
   reappears). Exit via the door (bell again). Armchair readers wander out
   cup-in-hand — the café allows it. A reader with the cat asleep on their
   lap waits while `SIM.dislodgeCat` hops the cat gently to the floor; one
   second later the patron stands and continues the normal departure.
   A parked umbrella is always collected last, after book and cup returns;
   the return route is declared in `L.patronRoutes`, and the furled umbrella
   shares the off hand with a carried drink or closed laptop.

**Spawning:** roughly every 26 s at full daylight stretching to ~80 s at
night. Caps: 7 patrons in daytime, 4 in the evening, 2 between 23:00 and 06:00
(the night owls). Four regulars are pre-seated at boot (one reading a
borrowed book in the nook, one perched on the first window sill) so the café
is never empty on arrival.

### Couples

When a normal spawn fires with room for two, 22% are a linked pair. The
second comes through the still-open door 1.2–1.8 s later without a second
bell. In rain they share the first patron's umbrella. They remain FIFO queue
neighbors and order individually, but the first pickup atomically reserves
both sides of one clean dining table, then both window perches if no dining
pair is free; without a pair of seats they both take their drinks to go.
At the table they murmur every 12–26 s, with a rare heart bubble. Their stays
share one 120–260 s roll with a small individual wobble; once both expire,
they leave 0.8 s apart and share one cup-bussing decision.

### Holger — the regular

Holger is the one fixed patron: grey hair and beard, forest-green jumper,
brown trousers, dark-red scarf, espresso, his own book, 46 px/s walk, and a
quiet 130 Hz murmur voice. Once each café day he arrives between 09:00 and
09:40 (the fresh 08:24 boot reaches this within its first real minute) and
stays 280–420 s. He prefers the left fireside chair, found by its flags rather
than an index. If it is free he settles into his usual armchair; if occupied,
he gives it one patient look and chooses by the normal reader rules. In rain
he reliably brings the same blue-grey umbrella.

---

## The cat

Orange tabby, no name (it has not told anyone yet). The café's true owner.

**Places and weights:** floor choices are the fireplace rug, the window-side
spot, the big rug, the armchair side, the reading-nook rug, and its own cushion
in `L.catCorner`. The cushion is strongly preferred after a meal; the fire
rug gains weight in the evening; the nook and shorter rests gain weight from
23:00–06:00. A weighted choice can instead lead to the middle of either
window sill (×2.5 in rain, ×2 at night) or the bookshelf top while the second
nook chair is free, or to the piano lid (weight 0.9, ×1.5 in the evening)
while the bench and piano voice are free. Safe pairs keep the old straight-line walk; the pairs that
clip furniture use the declared `catRoute` waypoints checked by the audit.

**Needs, without consequences:** `hungerT` rolls 420–720 s and `thirstT`
500–800 s. The cat walks to `L.catCorner.eatSpot`, eats for 6–10 s (0.34 food),
or drinks for 3–5 s (0.2 water); 80% of meals are followed by a drink. Food
and water are visible, quantized bowl art in `world.catBowls`. If a bowl is
empty, the cat sits beside it facing Nora, occasionally meows, and retries
after 60–120 s. Nothing harmful happens; Nora eventually performs her refill
task.

**Core states:** `sleep` (purrs, occasional "zzz"), `sit`, `groom`, `stretch`,
`walk`, and `loaf` remain the quiet loop. New states are `hop` (0.35–0.55 s
parabolic tween; silent up, `softThump` on the final floor landing), `eat`,
`drink`, `perch` (back view at the window), `knead`, `pounce`, and `lap`.
`cat.surface` (`floor`, `sill`, `shelfTop`, `counter`, `machine`, `backShelf`,
`pianoKeys`, `pianoTop`, or `lap`) prevents floor habits from firing in mid-caper.

**High places:** window visits hop from the declared stand spot to the middle
of the sill, where the cat watches the rain/streetlamp or curls to sleep.
Bookshelf visits use the nook chair back as a step, then settle for 60–180 s;
if that chair becomes occupied, the cat takes the declared direct escape hop.
On any high perch, its head occasionally tracks the nearest walking patron
for 2–4 s. `gazeFacing` changes the head/attention without changing the pose.

**Piano claim:** from its declared stand the cat hops onto the grouped keys
(2–3 soft accidental plinks), then to the lid for a 60–180 s loaf, sit, or
sleep with its tail draped over the edge. A pianist who arrives later does not
dislodge it—the shared tableau is intentional. The cat leaves by one direct,
silent-front hop to the declared floor dismount; only that landing gets the
usual `softThump`, so the keys never sound twice.

**Counter caper:** only in a quiet café with no queue, order, or active brew,
the cat rarely hops onto the counter's right end, pads along the slab, and
loafs (sniffing waiting cups for one second, never touching). Nora notices in
3–8 s when free, walks behind the counter, swishes, and shoos it down. The
rarer grand ascent goes counter → espresso-machine top → cleared back-bar
shelf gap; a 30% half-way catch aborts it. On the top shelf the cat loafs or
sits 60–180 s with its tail draped below the board.

**Small rituals:** on a rug or cushion, 30% of pre-sleep arrivals knead for
2.5–4 s and purr. In strong daylight a rare dust mote near the first window
starts a three-hop `pounce`, followed by a dignity-restoring groom. A reading
patron in a fireside or nook wing chair can attract a lap visit; the cat hops
to a derived lap anchor, curls, and purrs while sipping and page turns continue.
The door bell turns an awake floor cat's head toward the door for about 2 s.

**Petting:** clicking within ~36 px of the cat triggers `SIM.petCat` — heart
bubble, meow or purr, caption "The cat purrs happily." If asleep on a normal
surface, it sits up; lap cats stay settled. Walking, hopping, and pouncing are
not interrupted.
This is currently the café's only direct interaction. Any interaction the café
gains must stay this gentle — optional, never necessary, never nagging.

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
