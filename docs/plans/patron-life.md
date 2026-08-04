# Plan: patron life — umbrellas, laptops, a regular, couples, and a night sleeper

Executes the patron half of the roadmap's "More life" section: umbrellas
shaken at the door on rainy days, laptop workers with soft rare
keystrokes, a regular who always takes the same seat, couples sharing a
table, and someone who falls asleep over their book at night.

**Design bar check:** every feature is a scene beat, not a system. The
umbrella stand is glanceable state (like the cat bowls), never
inventory; the regular's taken-seat moment is one patient look, not a
conflict; the sleeper is never woken by staff, and nothing here asks the
reader to do anything. No meters, no UI, no urgency.

**Shape:** one groundwork phase plus five feature phases, each
independently shippable in any order, each ending the standard way —
smoke test, `?dev` + `__dev.audit()` → 0 problems, and characters.md /
world.md / sounds.md / art.md updated in the same change. Coordinates
below are derived from `SCENE.L` and the current art; every new spot
gets verified against a `?dev&overlay` screenshot and the audit sweep
before it ships.

---

## Current state (what we build on)

- Patron state machine: `updatePatron` / `updateSeated` in
  `js/sim-patrons.js` — `enter → queueing → ordering → waitDrink →
  pickup → (browse) → toSeat → seated ⇄ (fetchBook) → (returnBook) →
  (return) → exit`. At-the-table flavor (sipping, reading, chatting,
  window gazing) lives in `updateSeated` as dt-driven timers — the
  template for typing and dozing.
- Traits roll at spawn in `makePatron` (`js/sim-core.js`); spawn pacing
  and rain-aware arrival captions live in `updateSpawning` there.
- Drawing: `SCENE.drawPerson` (`js/scene-people.js`) already has held-item
  branches (cup / plate / book-under-arm / taper / can) to extend with
  umbrella and laptop variants; the `zzz` bubble icon already exists
  (the cat uses it). Table items render via `drawTableItem`
  (`js/scene-furniture.js:305`) keyed by `it.kind` — a `'laptop'` kind
  is a new branch.
- Precedents to reuse: the water-drop particle (`type: 'drop'`) for the
  umbrella shake; `busVia`-style declared route legs so the audit's
  journey checker can walk the door ↔ umbrella-stand hops; the cat's
  `doorGlanceT` hook in `ringDoor` for the sleeper's doorbell stir;
  couples at a window reuse the existing shared tall table (two perches
  per window already share one).
- Sounds on hand: `clink`, `cupDown`, `pageTurn`, `murmur`, `sip`.
  New synths needed: an umbrella shake and a keystroke cluster.
- Clock: 1 in-world hour = 60 real seconds; boot at 08:24.

---

## Phase 0 — shared groundwork (ships with whichever phase goes first)

1. **New patron fields**, defaulted in `makePatron`: `umbrella: null`
   (`{ color }` when carried), `laptop: false`, `partner: null`,
   `dozing: false`, `isRegular: false`. All inert until a phase uses
   them.
2. **Off-hand carry.** `drawPerson` gains under-arm tuck variants for a
   furled umbrella and a closed laptop that can coexist with
   cup-in-hand (drawn on the mirror side of the facing arm, like the
   book tuck). Needed by to-go umbrella patrons and bussing laptop
   workers; done once here so both phases share it.
3. **Dev helpers.** `__dev.spawn` accepts `{ umbrella, laptop, couple }`
   (couple spawns a linked pair); new `__dev.regular()` forces the
   regular's arrival next tick; `__dev.doze()` puts the first eligible
   reader to sleep. All documented in AGENTS.md's harness list.
4. **Audit additions.** The umbrella stand's footprint + deposit spot
   join the standard checks, and the two short door ↔ stand legs are
   declared (a `patronRoutes` sibling of `catRoutes` in `SCENE.L`) so
   the journey sweep walks them like every other declared route.

---

## Phase 1 — umbrellas on rainy days

The rain already drives arrivals ("Freja ducks in out of the rain.");
this gives the ritual a body: shake at the door, park the umbrella in a
stand beside the coat stand, collect it on the way out.

### Layout (`SCENE.L`)

```
umbrellaStand: { x: 74, y: 296 },        // baseline; drawn ~270–296
umbrellaSpot:  { x: 74, y: 312 }         // patron stands here to park/take
```

Footprint `{ x0: 66, x1: 82, y0: 288, y1: 298 }`, not passable.
Clearances: the door descent column at x = 54 stays 12 px clear; the
coat stand's footprint starts at x = 84 (2 px gap — pixel art tolerates
it, the overlay screenshot confirms); the cat corner starts at x = 102.
Route legs (declared, audited): door → stand is
`(54, 252) → (54, 312) → (74, 312)`; stand → door is the reverse. The
stand → queue leg uses the ordinary `makePath` via the lane.

### Art (`js/scene-furniture.js`)

A slatted wooden crock, ~26 px tall, warm wood from the art.md palette.
Holds up to 4 visible furled umbrellas (thin shafts, colored wraps at
staggered heights, hook handles) driven by `world.umbrellaStand` — an
array of colors, pushed on park, removed on collect. Umbrella colors
come from existing swatches: `#a94f3f`, `#4a7a5a`, `#3d4a5c`, `#c9a04a`.

### Behavior (`js/sim-patrons.js`, `js/sim-core.js`)

- **Spawn:** when `world.rain > 0.4`, 75% of new arrivals carry an
  umbrella (`p.umbrella = { color }`). Seeded boot patrons never have
  one. The existing "shakes off the rain at the door" arrival line
  moves to the shake beat so it never doubles up.
- **New state `shake`** between `enter` and the walk to the stand:
  0.9–1.3 s at the door spot — the held umbrella jitters ±1 px at
  ~10 Hz, 4–6 `drop` particles fall, `SND.umbrellaShake()` once.
  Caption gated 0.35: "Freja shakes the rain off her umbrella."
- **New state `parkUmbrella`:** walk the declared leg to
  `umbrellaSpot`, 0.6 s reach (reuse the `reach` pose), push the color
  to `world.umbrellaStand`, `clink(0.4, 0.025)` as a little wooden
  tock, then join the queue normally.
- **Departure:** patrons with a parked umbrella path via `umbrellaSpot`
  as their last stop before the door (after any book return / cup
  return — the stand is beside the exit, so the order reads naturally),
  0.5 s reach, color leaves the stand, walk out holding it. Gated 0.3:
  "Søren collects his umbrella at the door." Rain stopped meanwhile?
  They still take it — it's theirs.
- **Café-full to-go:** they collect the umbrella cup-in-hand (the
  phase-0 off-hand tuck).

### Sound (`js/audio.js`, sfx bus)

| Function | Recipe sketch | Peak gain |
| --- | --- | --- |
| `SND.umbrellaShake()` | 3–4 lowpassed (≈900 Hz) noise flaps, 60 ms each at ~11 Hz spacing | 0.03 |

### Docs

art.md (stand + palette), characters.md (states), world.md (captions,
`world.umbrellaStand` state), sounds.md (one-shot row).

---

## Phase 2 — laptop workers

A quiet typer at a dining table: lid open, soft rare keystroke bursts,
a faint screen glow after dark, lid closed and tucked under the arm on
the way out.

### Trait & seating

- Rolled at spawn (needs `world`, so applied in `updateSpawning` /
  `seedPatron` right after `makePatron`): `laptop = !wantsBook &&
  rnd < 0.16` in daytime, `0.06` between 21:00 and 07:00 (the night
  belongs to readers and the phase-5 sleeper).
- `freeSeat` prefers dining-table seats for laptop patrons (they need
  the surface). If only armchairs/nook/window remain, the laptop stays
  in the bag — the trait goes dormant, no special case downstream.

### Table item & art

- On sitting, alongside the drink item:
  `{ side, kind: 'laptop', owner, open: true }`. `drawTableItem` gets a
  `'laptop'` branch: base 16×3, screen 14×10 with a 1 px bezel, dark
  face `#2c3038`, two 1 px "text" lines `#8a9ab5` while open. The
  laptop sits at `side * 12` (toward the table center); the cup keeps
  its normal spot — both fit.
- **Night glow:** in `SCENE.drawLighting` (`js/scene-fx.js`), each open
  laptop adds a small cool glow (radius ~18, alpha scaled by
  `1 − daylight`, capped low) — the one cold light in the room, which
  is exactly why it reads cozy.

### Behavior (`updateSeated`)

- Typing bouts: every 6–14 s, a 2–3.5 s burst — `p.typing = true`,
  forearms drawn forward onto the table with a 2 px alternating bob
  (~6 Hz), `SND.keys()` 2–3 times per burst. Sipping pauses typing the
  same way it pauses reading. Chatting still works.
- Captions, gated 0.1: "Emil types a few quiet lines." /
  "Sofie frowns gently at her screen, then lets it go."
- **Departure beat:** 0.6 s lid close (`open = false`, item removed,
  `clink(0.45, 0.025)`), laptop tucked under the arm (phase-0 art) for
  the walk out — compatible with cup bussing.

### Sound

| Function | Recipe sketch | Peak gain |
| --- | --- | --- |
| `SND.keys()` | 2–4 tiny bandpassed (2–3 kHz) noise ticks, 15 ms, jittered spacing | 0.02 |

### Docs

characters.md (trait + seated habit), world.md (captions, glow note),
sounds.md (row), art.md (laptop item + glow).

---

## Phase 3 — Holger, the regular

One constant face besides Nora's. Same seat, same order, same hour —
the café's metronome.

### Identity (a hardcoded `REGULAR` in `js/sim-core.js`)

- **Holger** (deliberately not in the `NAMES` pool — no duplicate
  Holgers). Fixed appearance: grey hair `#d9d2c0`, beard, forest-green
  top `#4a7a5a`, brown trousers `#4a3222`, dark red scarf `#a94f3f`.
  Fixed traits: espresso, own book (`wantsBook`, `ownBook`), not
  chatty, `murmurPitch` 130, unhurried walk (speed 46).
- **His seat:** the left fireside armchair — found by flag
  (`armchair && facing === 1`), never by index. The cat's lap-visit
  logic already targets armchair readers; Holger plus the cat needs no
  new code and is the whole point.

### Scheduling (`updateSpawning` or a small `updateRegular` beside it)

- `world.regular = { lastDay: -1, hour: 0 }`. Each new `dayIndex` rolls
  a visit hour in 9:00–9:40. When the clock crosses it and he isn't
  present, he arrives (normal `enter` flow, own doorbell) — bypassing
  the spawn timer but respecting `spawnCap`; at cap he retries in
  ~120 s. Once per day. Stay 280–420 s. On a fresh boot (08:24) he
  walks in within the first minute or so of real time.
- He skips the umbrella roll's randomness: in rain he always has one
  (same black-coffee reliability), color `#3d4a5c`.

### Seat moment (`freeSeat` / the seat-choice sites)

- If his armchair is free → he takes it; once-per-visit caption
  (ungated): "Holger settles into his usual armchair."
- If taken → one gated line ("Holger's chair is taken; he gives it a
  patient look.") and the normal reader preference picks something
  else. No conflict, no hovering.

### Docs

characters.md gets a short "The regular" section (identity, schedule,
seat rule); world.md the captions.

---

## Phase 4 — couples sharing a table

Two arrive together, sit together, murmur more, leave together.

### Spawning (`updateSpawning`)

- When a spawn fires with room for two under `spawnCap`: 22% → a
  couple. Two `makePatron` rolls linked via `partner`; 50% share a
  scarf color. The second enters 1.2–1.8 s behind the first — no
  second doorbell (the door is still open), only the trailing
  `doorCloseT`. Arrival caption replaces the solo line:
  "Two come in together, shoulder to shoulder." (rain-aware variant:
  "…out of the rain, under one umbrella." — in rain the pair shares a
  single umbrella, carried by the first; a phase-1 garnish that
  degrades gracefully if phase 1 hasn't shipped).

### Ordering & seating

- They queue and order as normal FIFO neighbors (two bubbles is
  charming); one caption covers both ("Freja and Emil order
  together."), the partner's order caption is suppressed.
- **Pair seating**, resolved when the first is served: a dining table
  with both side seats free, else a window with both perches free
  (the two perches already share that window's tall table — built for
  this), else both take it to go. The first to sit reserves the
  partner's seat (`taken = true` immediately); the partner joins on
  their own pickup. Seat captions: "Freja and Emil share the table by
  the window." / "Two mugs on one window sill."
- The barista queue is FIFO, so the first to order is served first —
  no reservation can strand a drink.

### Seated & leaving

- Both act chatty regardless of roll; `chatT` runs 12–26 s and the
  existing mate-reply murmur does the rest. Rare (0.05 gate) heart
  bubble during a chat — the icon already exists.
- Stays roll once: a shared base 120–260 s ± 15 s each. Neither
  departs until both stays expire; then they stand together and exit
  0.8 s apart. One 50% roll decides whether the pair busses their cups
  (both walk the return leg in file) or leaves them for Nora.
- Cat-lap and doze interactions need no code: partners simply wait
  (their stay hasn't expired) like anyone else.

### Docs

characters.md (couple lifecycle notes in the patron section), world.md
(captions).

---

## Phase 5 — asleep over a book at night

The café's gentlest scene: after dark, a reader in a wing chair loses
the fight with a warm fire and a good chapter.

### Eligibility & trigger (`updateSeated`)

- Reading, in an armchair or nook chair, `daylight < 0.25`, more than
  60 s of stay remaining, no active sip, not a laptop worker. Only one
  sleeper at a time (`world.sleeper` ref) — it stays special.
- Eligible readers tick a `dozeT` (50–120 s). On zero: `dozing = true`,
  reading pauses, sip and page timers freeze, once-per-doze caption
  (ungated): "Astrid has fallen asleep over her book."

### The doze

- **Art (`drawPerson`):** head 2 px lower with the slow breathe sine,
  a 2 px closed-eye bar over the eye, the book flat in the lap
  (reading pose, lowered 6 px). No snore — silence is content.
- A `zzz` bubble (existing icon) for 1.6 s every 7–14 s.
- **Waking:** after 40–110 s they stir on their own; 25% of doorbells
  wake them early (a `ringDoor` hook beside the cat's door glance).
  Gated 0.5: "Mikkel blinks awake and finds his line again." Stay kept
  ticking through the doze — if it ran out, the normal departure flow
  begins (a touch sheepish is fine); otherwise they read on.
- A lap cat neither prevents nor ends a doze; the pair of them asleep
  by the fire is the target image. Departure already dislodges gently.
- Nora never wakes anyone. If the roadmap's 02:00 closing mood ships
  later, the sleeper is its natural centerpiece — noted there, not
  built here.

### Docs

characters.md (doze in the seated habits), world.md (captions +
doorbell stir).

---

## Verification (every phase)

1. Smoke test: full order cycle, console clean, `__dev.hour(20)` for
   the night look (glow, doze, umbrella-in-rain paths).
2. `?dev&overlay` screenshot for any new spot/footprint (phase 1's
   stand especially).
3. Forced runs: `__dev.spawn({umbrella: true})` in forced rain,
   `__dev.spawn({laptop: true})`, `__dev.regular()`,
   `__dev.spawn({couple: true})`, `__dev.doze()` — each with
   `__dev.ff()` to watch a full visit fast.
4. `__dev.audit()` → 0 problems, including the new declared legs.
5. Soak: one `__dev.ff(1800)` with rain forced on, then off — no
   stranded umbrellas in the stand, no reserved-but-empty seats, no
   patron stuck mid-state.
