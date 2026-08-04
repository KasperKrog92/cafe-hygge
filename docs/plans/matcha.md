# Plan: matcha — warm and iced, whisked properly

The owner is a matcha devotee, so Café Hygge gets a proper matcha
program: a **matcha latte** (warm) and an **iced matcha**, each with its
own visible preparation ritual. That means a small matcha corner on the
counter (tin caddy, clay chawan, bamboo chasen), two new prep
choreographies for Nora (scoop → hot water → whisk → milk or ice), two
new drink renders (a wide handle-less green-surfaced cup; a tall glass
with a milk cap, ice, and a pink straw), a `MATCHA` line on the
chalkboard, and two new quiet sounds (the whisk's patter, ice against
glass).

**Design bar check:** nothing here asks for attention. The matcha corner
is three tiny props on an existing counter; the whisk is the most
ASMR-adjacent gesture the café could add (a soft dry patter, peak
≤ 0.028, house discipline); captions stay probability-gated behind the
shared limiter; the only UI-adjacent change is one more word on the
chalkboard, in chalk. No goals, no toggles, no noise.

**Shape:** three phases, shippable in order, each ending the standard
way — smoke test (full order cycle for both drinks), `?dev` +
`__dev.audit()` → 0 problems, console clean, and the matching docs
updated in the same change.

---

## Current state (what we build on)

- **The drink pipeline** is fully data-driven off one table. `DRINKS`
  (`js/sim-core.js:19`) rows are `{name, icon, prep, kind, w}`;
  `pickDrink()` rolls by weight at spawn. From there everything keys off
  the row: the order bubble shows `drink.icon`, the order caption uses
  `withArticle(drink.name)` ("an iced matcha" comes free — it
  vowel-checks), `barista.orders` carries the row to `PREP_STEPS`, and
  the served vessel is `drink.kind` all the way through counter cups,
  table items, and bussing.
- **Prep** (`PREP_STEPS`, `js/sim-characters.js:18`): a list of
  `{x, act, dur}` stations along the back of the counter; Nora walks to
  each `x` at `L.baristaHome.y` and `startStep` plays the act's sound
  (`grinder`, `tamp`, `espresso`, `steamWand`, `kettlePour`). While
  `pull`/`steam`/`kettle` run, the `prepping` state spawns steam
  particles at the machine and `world.brew.{active, stage}` drives the
  machine's blinking light and pressure needle (`drawMachine`,
  `js/scene-bg.js:468`). Then `serveWalk` pushes
  `{x, y, kind, owner}` onto `world.counterCups` at `L.serveSpot`,
  plays `cupDown()` + `ding()`, and captions at 0.6.
- **Vessel rendering is keyed off `kind`** ('cup' | 'teacup' | 'plate')
  in four places: table items (`drawTableItem`,
  `js/scene-furniture.js:327` — all cups get the same `#6b4429` coffee
  surface), the pass (`counterCups` loop in `drawCounter`,
  `js/scene-furniture.js:441`), the seated held cup
  (`js/scene-people.js:125`), and the standing held cup
  (`js/scene-people.js:199`, shared by patrons and Nora).
- **The `kind → holding` mapping** (`kind === 'plate' ? 'plate' :
  'cup'`) is repeated at `js/sim-patrons.js:232`, `:625`,
  `js/sim-characters.js:86`, `:111`, `:300`.
- **Hot drinks steam on tables**: items are pushed with `hot: 45`/`30`
  (`js/sim-patrons.js:334`, `js/sim-core.js:145`) and `js/sim-core.js:604`
  spawns table steam while `hot > 0` — an iced drink must opt out.
- **Sipping** (`js/sim-patrons.js:454`) works for any `kind !==
  'plate'`; the sip flips `p.holding` to a vessel for the lift.
- **Counter geography** (`SCENE.L`, `js/scene-core.js`): the slab runs
  x 632–948 at y 264. The stretch between the machine's right edge
  (x 712) and the pass is the one open gap: the serve saucer occupies
  ~740–758 (`L.serveSpot` 744), the register starts at 748, and the
  cat's counter perch pad is declared at 750–820 with its top-shelf hop
  landing on the slab at x 700. **Props must live inside x 714–738.**
- **The chalkboard** (`drawMenuBoard`, `js/scene-bg.js:376`; `L.menu` =
  108×68 at 820,104): title, rule, then KAFFE / KAKAO / BOLLER at
  y +27/+39/+51 with price dashes, and a rotating doodle at (+94, +50)
  that Nora re-chalks (`nextMenuDoodle` / `chalkCaption`,
  `js/sim-characters.js:510`; doodles 0–4 in `drawMenuDoodle`,
  `js/scene-bg.js:396`). The 6×10 chalk hand already has every glyph
  MATCHA needs. Below the board the wall is clear down to the pastry
  case top at y 224, so the board can grow taller.
- **Audio**: every one-shot in `js/audio.js` is `guard()`-wrapped;
  `clink(pitch, vol)`, `kettlePour`, `steamWand` are reusable as-is.
  House gain law: one-shots 0.016–0.09 peak, through the compressor.
- **Dev harness**: `__dev.spawn({drink: '<name>'})` looks the row up by
  name, so both new drinks are force-testable with zero dev.js changes.

---

## Phase 1 — the matcha corner (art, inert)

Three props appear on the counter before any drink uses them. A café
this obsessed would own the kit either way.

- **`L.matchaBar`** in `js/scene-core.js`: `{ x: 726, y: 264 }` — the
  prop anchor *and* the station x Nora will stand at in Phase 2 (all
  positions come from `L`; the prep table will read this).
- **Props**, drawn in `drawCounter` (`js/scene-furniture.js`) just
  before the `counterCups` loop so finished drinks stack in front:
  - *Caddy*: ~8×10 tin at the left of the zone (~x 714), body
    `#4a7a5a` (the nook-chair green — reuse, don't invent) with a
    `shade()`-derived lid band.
  - *Chawan*: ~12×7 wide clay bowl centered near x 726, `#8f4a35`
    (already in the palette) with a darker inner-rim line.
  - *Chasen*: the bamboo whisk leaning against the caddy — 2 px handle
    `#c9a04a`, splayed tine pixels `#e0b06a`.
- **Constraints:** everything inside x 714–738 (serve saucer starts
  ~740; the cat's counter pad at 750–820 and its top-shelf hop landing
  at x 700 stay untouched). No new footprint or occluder — the counter
  already owns both. No glow: matcha kit doesn't light up.
- **Verify:** `?dev&overlay` screenshot (props clear of serveSpot and
  the cat pad); `__dev.catDo('counter')` and `__dev.catDo('topShelf')`
  still read right; `__dev.audit()` → 0.
- **Docs:** art.md — one line in the counter description of the layout
  map; confirm zero new hexes.

---

## Phase 2 — two drinks, end to end

The headline phase: order → prep → pass → table → sips, for both.

### The rows (`DRINKS`, `js/sim-core.js`)

| name | icon | prep | kind | w |
| --- | --- | --- | --- | --- |
| `matcha latte` | `matcha` | `matcha_hot` | `matcha` | 1.8 |
| `iced matcha` | `icedmatcha` | `matcha_iced` | `glass` | 1.4 |

Combined that's ~20% of all orders — a deliberate owner's-favorite
bias, while cappuccino stays the single most common drink. Holger keeps
his espresso.

### Prep choreography (`PREP_STEPS`, `js/sim-characters.js`)

Station x values read from `L` (`L.matchaBar.x`, plus the existing
kettle/steam stations):

- `matcha_hot`: **726 scoop 0.8 s → 700 kettle 1.4 s → 726 whisk
  2.2 s → 706 steam 1.8 s** (powder into the bowl, hot water, whisk to
  a foam, steamed milk on top).
- `matcha_iced`: **726 scoop 0.8 s → 700 kettle 1.0 s → 726 whisk
  2.2 s → 726 ice 1.0 s** (a short concentrate pour, whisk, then ice
  and cold milk into the glass at the station).

`startStep` sound wiring this phase uses stand-ins — `scoop` →
`clink(0.4, 0.02)` (tin lid), `whisk` → `swish()` (the counter-wipe
cloth, close enough until Phase 3), `ice` → `clink(1.35, 0.03)`. The
real voices land in Phase 3.

### Brew-state plumbing (`js/sim-characters.js`, `js/scene-bg.js`, `js/scene-furniture.js`)

- The `prepping` state's steam spawner currently fires at the machine
  for `pull`/`steam`/`kettle`. Keep that list, and add: `whisk` spawns
  steam at the chawan instead (`L.matchaBar`, every ~0.25 s — sparser
  than the machine's 0.12). `scoop` and `ice` spawn none.
- `drawMachine` currently blinks its light for *any* active brew. Gate
  it on machine stages (`grind`/`tamp`/`pull`/`steam`/`kettle`) so the
  espresso machine doesn't flash while Nora whisks two steps away.
- `drawCounter` gains the matcha-corner animation: while `brew.stage
  === 'whisk'`, the chasen stands upright in the chawan jittering ±1 px
  at ~12 Hz over a visible `#8a9a4a` tea surface; while `brew.stage ===
  'ice'`, the tall glass sits beside the bowl filling up. Render-only —
  all timing stays in the dt-driven sim.

### One mapping, five call sites

Add `holdingFor(kind)` ('plate' → `'plate'`, 'glass' → `'glass'`, else
`'cup'`) in `js/sim-core.js`, exposed through the `SIM._` contract, and
replace the five inline ternaries (`js/sim-patrons.js:232`, `:625`,
`js/sim-characters.js:86`, `:111`, `:300`). Table items for `kind:
'glass'` are pushed with **`hot: 0`** (both push sites) so an iced
drink never grows steam wisps.

### Vessel renders (all keyed off `kind`, same four sites as today)

- **`matcha`** (hot): a wide handle-less cup — crockery `#e8e0d0` on
  its `#d9d2c0` saucer, 2 px wider than the coffee cup, no handle, and
  the drink surface `#8a9a4a` instead of coffee brown. Reads as a bowl
  of green at a glance.
- **`glass`** (iced): ~8×13 tall glass in the tip-jar glass tone
  (`rgba(200,220,230,0.7)`), matcha body `#8a9a4a`, a 3 px milk cap
  `#e8dfc9`, two `rgba(255,255,255,0.5)` ice pixels, and a 2 px straw
  in pastry-glaze pink `#d9738a` poking above the rim.
- Branches added at: `drawTableItem`, the `counterCups` loop (pass and
  return spot), the seated held-vessel arm (`js/scene-people.js:125` —
  new `'glass'` case, sip lift identical to the cup), and the standing
  held-vessel arm (`:199` — covers patrons walking, couples taking
  drinks to go, and Nora carrying/bussing).
- **Icons** (`drawIcon`, `js/scene-people.js:397`): `matcha` — wide
  green-surfaced cup with steam ticks; `icedmatcha` — tall glass with
  green/cream bands and the pink straw.

### The board (`drawMenuBoard`, `js/scene-bg.js`; `L.menu`)

`L.menu.h` 68 → 80 (bottom lands at y 184, still 40 px clear of the
pastry case; lamp3's cord at x 810 is left of the board). Lines become
**KAFFE / MATCHA / KAKAO / BOLLER** at +27/+39/+51/+63 — matcha second
from the top, because it's that kind of café — with a fourth price
dash. The doodle stays at (+94, +50); check the fit on the taller
board in the overlay screenshot.

**Verify:** `__dev.spawn({drink: 'matcha latte'})` and
`__dev.spawn({drink: 'iced matcha'})` + `__dev.ff()` — watch the full
choreography for both (station order, steam at the bowl not the
machine, machine light dark throughout, glass at the pass, pickup,
table render, sips with the right vessel in hand, an abandoned glass
bussed home); a couple with `{couple: true, drink: 'iced matcha'}`
takes glasses to go; night pass at `__dev.hour(20)`; hidden-tab tick;
`__dev.audit()` → 0. **Docs:** characters.md (two prep rows),
art.md (board layout + the two vessel specs beside the crockery row),
world.md untouched until Phase 3.

---

## Phase 3 — the matcha voice, and flourishes

Replace the stand-in sounds, then let the café acknowledge its new
obsession quietly.

### `SND.whisk(dur)` (`js/audio.js`)

- Recipe: a dry tick train — 14–24 ms noise bursts bandpassed
  1.5–2.4 kHz (Q ≈ 2.5), one every 55–85 ms with jitter (a hand, not a
  motor), per-tick peak 0.012–0.02, the whole train inside a soft
  150 ms-in / 200 ms-out envelope. Combined peak **≤ 0.028**. No delay
  send — bamboo on ceramic is the closest, driest sound in the room.
- Trigger: `startStep` for `whisk` (dur 2.2 s).

### `SND.iceRattle()` (`js/audio.js`)

- Recipe: 3–4 glassy clinks — the `clink` partial stack (f, 1.51f,
  2.63f) around a 2.6–3.4 kHz base, 40–70 ms decays, loosely spaced
  60–120 ms, combined peak **≤ 0.03**, a small delay send (0.15, like
  `coins()` — glass is allowed a hint of room).
- Trigger: `startStep` for `ice`. The `scoop` stand-in
  (`clink(0.4, 0.02)`) is quiet and plausible enough to keep — a
  dedicated caddy tap is not worth a function.

### Captions (all via `caption()`, limiter-paced, lowercase-cozy)

- Whisk step start, gate 0.3: `'the bamboo whisk patters — a pale
  green foam comes up.'`
- Ice step start, gate 0.25: `'ice sings against the glass.'`
- First matcha sip of a visit (either kind), gate 0.2, once per patron
  (flag on the patron): `p.name + ' takes a slow, grassy-sweet sip.'`

### The sixth doodle

- `drawMenuDoodle` id 5: a chalk chasen — 2 px handle, splayed tines.
- `nextMenuDoodle` choices gain 5 (both weather branches);
  `chalkCaption` gains: `'A little bamboo whisk appears beside the
  prices.'`

**Verify:** listen at 50% volume next to an open book — the whisk
should be *almost* missable; force both drinks back-to-back and confirm
the limiter spaces the captions; `__dev.audit()` → 0. **Docs:**
sounds.md (two one-shot rows), world.md (three caption lines + the
doodle), characters.md (doodle list in Nora's chalk task).
