# Plan: cat life — a home, high places, and small rituals

Executes the cat half of the roadmap's "More life" section, plus two
owner requests: a dedicated cat corner (cushion + food and water bowls
that Nora refills) and high perches the cat climbs to sleep on or survey
the room from — the top of the bookshelf, the back-bar shelf, and the
middle of a window sill, looking out.

**Design bar check:** everything here is theater. The needs loop never
harms the cat — an empty bowl is a scene beat (the cat sits by it,
radiating patience), not a fail state. No meters, no UI, no urgency.
Petting stays the app's only direct interaction.

**Shape:** four phases, each independently shippable, each ending the
standard way — smoke test, `?dev` + `__dev.audit()` → 0 problems, docs
updated in the same change. Coordinates below are derived from `SCENE.L`
and the current art; every one gets verified against a `?dev&overlay`
screenshot and the new audit sweep before it ships.

---

## Current state (what we build on)

- Cat state machine: `updateCat` in `js/sim-characters.js` — states
  `sleep / sit / groom / stretch / walk / loaf`, uniform pick over five
  floor `CAT_SPOTS`, straight-line walks (no lane discipline; cats cut
  corners and always have).
- Sprite: `SCENE.drawCat` in `js/scene-people.js` — poses for all six
  states, ear flicks, tail sway, breathing.
- Precedents to reuse: window-seat patrons already hop from a floor spot
  to a sill perch (`perchUp` in `js/sim-patrons.js` — instant today; we
  add a small arc), and their `gazeFacing` head-turn is the model for
  perch gazing. Nora's idle-task picker (`startIdleTask`) is where the
  bowl refill slots in, and `busRoute`-style declared journeys are how
  her new route stays auditable.
- Sounds on hand: `SND.purr`, `SND.meow`. Clock: 1 in-world hour = 60
  real seconds.

---

## Phase 0 — shared groundwork (ships with phase 1)

Small mechanics every later phase uses.

1. **`hop` state.** `cat.state = 'hop'`: a 0.35–0.55 s parabolic tween
   from `(x0,y0)` to `(x1,y1)` (arc height ~0.4 × distance), stretched
   sprite mid-air (reuse the `stretch` pose drawn along the arc). Hops
   *up* are silent (cats); hops *down* land with a new `SND.softThump`.
2. **`cat.surface` field** — `'floor' | 'sill' | 'shelfTop' | 'counter'
   | 'machine' | 'backShelf' | 'lap'`. Guards which behaviors may fire
   (no grooming mid-counter-caper, no walking while on a lap) and which
   audit rules apply.
3. **Weighted spot picker.** Replace the uniform `pick` over `CAT_SPOTS`
   with weights, optionally hour/rain-aware (`weight(world)`), and give
   each spot a `kind: 'floor' | 'perch'` plus an optional hop route
   (floor spot → hop target list). Floor behavior is unchanged;
   perches append hops after the walk.
4. **Cat journey audit.** New `__dev.audit()` sweep: every cat floor
   spot (and bowl/hop stand-spot) lies outside all footprints and
   occluder boxes; every straight segment between floor-spot pairs cuts
   no impassable footprint (declare `via` points where one does — the
   busVia pattern); every aerial perch anchors exactly on its declared
   surface in `L` (sill y, shelf-top y, slab y). Aerial perches are
   explicitly exempt from the floor rules — that exemption is the new
   invariant, and gets one line in AGENTS.md.
5. **Dev helpers.** `__dev.catDo('eat'|'window'|'bookshelf'|'counter'|
   'topShelf'|'lap'|'mote'|'knead')` forces a behavior next tick;
   `__dev.bowls(food, water)` sets bowl levels. Both documented in
   AGENTS.md's harness list.

---

## Phase 1 — the cat's corner

A cushion and two bowls against the wall under window 1, between the
coat stand and the window perch's floor spot — the quiet strip nobody
walks through, next to the cat's existing favorite window spot.

### Layout (`SCENE.L`)

```
catCorner: {
  cushion: { x: 126, y: 262 },          // baseline; drawn ~250–262
  food:    { x: 116, y: 278 },          // terracotta bowl, kibble pile
  water:   { x: 138, y: 278 },          // blue-grey bowl
  eatSpot: { x: 116, y: 286 },          // cat stands here, head down
  noraSpot:{ x: 127, y: 298 }           // Nora stands here to pour
}
```

One footprint box for the whole corner (`x0:102, x1:152, y0:248,
y1:284`, **not** passable — nobody steps in the cat's dinner). Clearances
that make this spot work: coat stand footprint ends at x=106; window 1's
left perch drops at x=158; entering patrons descend at x=54. All ≥6 px
clear — the overlay screenshot and the audit sweep confirm.

### Art (`js/scene-furniture.js`, drawable at baseline)

- Cushion: a flat oval pillow, warm red or mustard from the art.md
  palette, a couple of shade-darker creases, slightly squashed center
  (it is well used).
- Bowls with **glanceable levels**: kibble pile at 3/2/1/0 heights;
  water as an ellipse whose highlight shrinks. Levels quantized — no
  meters, just art.
- The cat's sleep/sit sprites already fit the cushion; sleeping here
  uses the existing curl.

### Needs loop (`updateCat`, all dt-driven)

- `world.catBowls = { food: 1, water: 1 }` (1.0 = 3 meals / ~5 drinks).
- `cat.hungerT = rnd(420, 720)` s (≈2 meals per in-world day),
  `cat.thirstT = rnd(500, 800)` s, plus an 80% chance to drink right
  after eating.
- Hungry → walk to `eatSpot`, new **`eat`** state 6–10 s (head-down
  sprite variant, kibble crunch ticks), `food -= 0.34`. Thirsty →
  **`drink`**, 3–5 s, soft laps. After eating: cushion gets a
  temporary weight boost (food coma).
- Bowl empty on arrival → the cat sits beside it facing Nora, one
  gated caption ("The cat sits by the empty bowl, radiating patience."),
  occasional quiet meow, retries in 60–120 s. Nothing bad ever happens.

### Nora refills (`startIdleTask` in `js/sim-characters.js`)

- New idle task, priority just below bussing: if `food < 0.34` or
  `water < 0.2`, walk `home → exit gap → lane → drop at x=127 →
  noraSpot` (declare the route beside `busRoute` so the audit's journey
  checker walks it), crouch 1.6 s, `SND.kibblePour` / a soft water
  pour, level back to 1, caption gated 0.5 ("Nora tops up the cat's
  bowl."). If the cat is waiting there, a rarer second line ("The cat
  supervises the refill closely.").

### Sounds (new, `js/audio.js`, sfx bus, quiet even by house standards)

| Function | Recipe sketch | Peak gain |
| --- | --- | --- |
| `SND.crunch()` | 3–5 bandpassed noise ticks ~1.2 kHz, 30 ms, pitch jitter | 0.02 |
| `SND.lapWater()` | tiny sine blip + filtered noise, ~4/s while drinking | 0.015 |
| `SND.kibblePour(0.9)` | granular noise bursts, density decaying, LP 3 kHz | 0.035 |
| `SND.softThump()` | 90 Hz sine thud + damped click (phase 0, used from phase 2) | 0.03 |

### Spot list change

`CAT_SPOTS` gains `{ x: 126, y: 262, name: 'its own cushion' }` with a
high sleep weight — the caption template ("The cat pads over to …")
composes naturally.

---

## Phase 2 — high places

Two dignified perches plus the shared gazing behavior.

### Window sill, middle of the glass

- Perch anchors: win 1 `(200, 190)`, win 2 `(524, 190)` — centered on
  the sill, *behind* the poseur tabletop (table y=196, base 248): the
  cat's baseline 190 draws before the table, so the slim top and any
  cups overlap its paw line correctly — cat framed in the glass,
  table in front. Patron perches (158/242, 482/566) stay clear on
  either side.
- Stand spots for the hop: `(224, 252)` and `(548, 252)` — beside the
  window tables' footprints, clear of patron floor spots.
- **New back-view sprite**: haunches, shoulder taper, ears from behind,
  tail curled on the sill with the pale tip flicking. The cat looks
  *out* — at night a silhouette against the streetlamp glow, in rain
  behind the runnels. Weight: ×2.5 while `world.rain > 0.3`, ×2 at
  night. Sleep is allowed here (existing curl, 24 px, fits the sill).
- Captions (gated 0.4, weather/hour aware, one per visit): "The cat
  watches the rain wander down the glass." / "The cat and the
  streetlamp keep watch together."

### Top of the bookshelf

- Route: floor spot `(770, 500)` → hop to nook wing chair's back
  `(818, 486)` → hop to shelf top `(896, 342)` (surface y = shelf.y −
  shelf.h = 338, baseline +4). Only offered while nook chair 2 is
  empty; if a patron claims the chair mid-visit the cat simply leaves
  by the down route: one jump to `(848, 472)` with a soft thump.
- Up there: `sit` facing the room (−1) or full `sleep`, 60–180 s. Depth
  is safe — every cat pixel sits above the shelf's top edge, and no
  patron sprite reaches y<420 in that column.
- Caption (0.5, once per visit): "The cat surveys the café from the
  bookshelf. All is well."

### Perch gazing (both perches, and phase 3's shelf)

Reuse the window-sitter `gazeFacing` pattern: every 15–40 s the cat's
head tracks the nearest *walking* patron below for 2–4 s, then drifts
back. On the window sill the default gaze is out the glass instead.

---

## Phase 3 — the counter caper and the top shelf

The naughty tier. Both gated to quiet moments (no orders, empty queue)
so they never collide with brewing, and both rare enough to feel like
events: counter roughly once per 20–40 real minutes, the full ascent
about once per in-world day.

### Counter-hopping (roadmap item, with the shoo)

- Hop up at the counter's right end: floor `(860, 314)` → slab
  `(860, 266)`; pad along the slab (walk pose, baseline 266 — the slab
  edge correctly covers the paw line, same trick as Nora at 286) to
  ~x 750–820; `loaf`. If cups wait at the pass, a 1 s sniff first,
  never a touch.
- **Nora shoos**: when idle, 3–8 s after noticing — she walks behind
  the counter to the cat's x, one `SND.swish`, caption "Nora shoos the
  cat off the counter — house rules." Cat hops down (thump), saunters
  off unbothered. If she's mid-order the cat lounges until she's free —
  earned lounging.

### The back-bar top shelf (owner request)

- **Art first**: clear ≥32 px at the right end of shelf 1 in
  `drawShelves` (`js/scene-bg.js`) — the books join shelf 2, the tiny
  plant moves to the counter top by the pastry case. The gap should
  read intentional: the staff gave up reclaiming it long ago.
- **The grand ascent** (each leg a `hop`): counter slab at `(700, 266)`
  → espresso machine top `(684, 228)` → one proud arc to the shelf gap
  `(782, 104)`. Entry gated on `!world.brew.active` plus the
  quiet-café gate, so steam never rises through a mid-leap cat. While
  in transit Nora may shoo (30%) — the ascent aborts down the same
  legs; comedy either way.
- Up top: `loaf` or `sit` facing the room, 60–180 s, **tail draped off
  the board edge, swaying below the shelf** (the detail that sells it).
  Nora, when idle, occasionally glances up: caption "Nora pretends not
  to see the cat on the shelf." Descent reverses the legs, one thump at
  the floor.
- Clearances checked: lamp 3's shade starts at x=796 (cat pixels end
  ~789), menu board starts at 820, steam column spans x 672–700 below a
  vacated route. All go in the perch-anchor audit.

---

## Phase 4 — small rituals

The roadmap's remaining cat lines plus cheap idle charm. Each is a
timer + a pose + at most one gated caption; none blocks another.

- **Kneading** (roadmap): arriving on a rug or the cushion before
  sleep, 30% chance: 2.5–4 s `knead` pose (loaf sprite + alternating
  front paws, 2 px), a purr, then the curl. Caption 0.3: "The cat
  kneads the rug into shape."
- **Dust mote** (roadmap): daylight > 0.6, near a window sunbeam zone
  (under win 1/win 2), rare. A 2 px cream fleck drifts (one-off
  particle); the cat's `pounce` state — three small hops and a bat —
  3–6 s, then sits and grooms, dignity restored. Captions alternate:
  "The cat does battle with a dust mote." / "The dust mote wins this
  round."
- **Lap-sitting** (roadmap): candidate = a patron seated in a wing
  chair (fireside or nook), `reading` true, no lap cat yet. From a
  nearby idle sit, ~15% per opportunity: walk to the chair front, hop
  to the lap anchor (`seat.x + dir*6, seat.y + 2`, baseline +1 past the
  patron so the curl draws over the lap), curled sleep, purring more
  often than usual. The patron's sips and page turns continue over the
  cat. **Departure coupling** is the one fiddly bit: a single
  `SIM.dislodgeCat(p)` helper, called at the patron's leave transition
  — cat hops down (thump, caption 0.4: "The cat is gently returned to
  the floor."), 1 s later the patron stands. Petting a lap cat works
  (hit test already uses cat.x/y).
- **Door-bell glance**: on the door bell, an awake floor-level cat
  turns its head toward the door for ~2 s. No caption, no sound — just
  awareness.
- **Hour/rain weights** (finishing pass on the phase-0 picker): fire
  rug up in the evening, window perch up in rain and at night, more
  walking between 23:00 and 06:00 (the café is the cat's at night —
  pairs with the roadmap's future closing-hour mood), cushion after
  meals.

---

## New cat fields (world data shape, for architecture.md)

`surface`, `hopFrom/hopTo/hopT`, `hungerT`, `thirstT`, `gazeT/gazeFacing`,
`lapPatron`, `sniffedPass`, plus `world.catBowls {food, water}` and the
rare-event timers (`counterT`, `ascentT`, `moteT`).

New states: `hop`, `eat`, `drink`, `perch` (back view), `knead`,
`pounce`, `lap` (a positioned sleep). All join the states table in
characters.md.

---

## Docs to update (each in its phase's change)

- **characters.md** — rewrite the cat section: spots + weights, needs
  loop, all new states, the shoo, lap rules; add the refill to Nora's
  idle list.
- **world.md** — new captions/events (the full caption list above),
  bowl levels as world state.
- **sounds.md** — four new one-shot rows (function, trigger, recipe,
  gain).
- **art.md** — cat corner in the layout map; new sprites (back view,
  eat/drink, knead, pounce, lap curl); the shelf-gap change; the
  aerial-perch depth notes (baseline-above-surface pattern).
- **architecture.md** — one line in data shapes for the new fields.
- **AGENTS.md** — the aerial-perch audit exemption invariant; the new
  `__dev.catDo` / `__dev.bowls` helpers.
- **roadmap.md** — move the cat line to "graduated & executed" when the
  final phase lands; this plan file is then deleted (git history keeps
  it).

## Explicitly out / judgment calls

- No needs UI, no hunger consequences, no cat sounds above 0.035 gain.
- No perch on the espresso machine except in transit (it's hot).
- The crockery shelves stay full except the one cleared gap — a cat
  threading between cups would need art surgery beyond the payoff.
- The café dog interaction waits for a dog.
- Cat walks stay straight-line (house precedent); the phase-0 audit
  sweep is the guard — if a new spot pair clips a footprint, that pair
  gets a `via` point, not a pathfinder.

## Verification recipe (every phase)

1. `?dev&overlay` screenshot — new anchors sit where the art says.
2. Force each new behavior via `__dev.catDo(...)` (+ `__dev.bowls(0)`
   for the empty-bowl beat and refill), watch a full cycle each.
3. One in-world day at `__dev.ff` speed: the cat eats ~2×, Nora
   refills, no state ever wedges (soak habit from the harness sweep).
4. Night check `__dev.hour(23)`: silhouette perch, night weights.
5. `__dev.audit()` → 0 problems. Console clean. Docs updated.
