# Plan: Nora — more life

Executes the Nora bullet from roadmap.md § More life:

> Nora: watering the plants, chalking the menu (board doodle changes),
> lighting the candles at dusk (tie candle glow to an actual action),
> a quiet stretch when the café is empty.

Four independent slices, ordered smallest-first. Each slice ships on its own:
it ends with `__dev.audit()` → 0 problems and its doc updates in the same
change. The owner can cherry-pick; nothing below depends on a later slice.

**Design bar check:** all four are ambience — slow, periodic, interruptible,
no reader attention demanded. They deepen the one thing Nora is for: the café
feels *kept* because someone visibly keeps it.

---

## Why these four (the role, not just the actions)

Today Nora is a competent machine: orders, bussing, bowl care, and three
counter fidgets (wipe / polish / tidy). Everything she does is either service
or cleaning. The roadmap's four ideas each add a different *kind* of care:

- **Candles at dusk** — she tends the *light*. This is the big one: it takes
  an always-on lighting effect and turns it into a daily ritual you can
  catch happening. The café's dusk becomes an event instead of a fade.
- **Watering** — she tends the *living things* (the plants join the cat as
  things that receive care).
- **Chalking** — she tends the *board*, and the world visibly remembers it
  (the doodle is different afterwards). First Nora action with a persistent
  visible trace.
- **The stretch** — she gets one moment that serves nobody. A single
  off-duty beat makes the rest read as a person, not a routine.

---

## Shared infrastructure (built with the first slice that needs it)

### Idle-task priority ladder

`startIdleTask` in `js/sim-characters.js` grows from "bus > bowls > random
pool" to:

1. Bus an abandoned cup (unchanged, highest).
2. Refill low cat bowls (unchanged).
3. **Candle round pending** (dusk has passed, candles unlit — slice 4).
4. **Watering pending** (morning, not yet watered today — slice 3).
5. Probabilistic pool: wipe / polish / tidy case (existing weights, slightly
   renormalized) + **chalk the board** (timer-due, slice 2) + **stretch**
   (only when the café is empty, slice 1) + stand and watch the room.

Pending tasks are flags, not interrupts: Nora never abandons an order or a
queue for them. An order arriving mid-round parks the round; she resumes on a
later idle tick.

### Routes are declared and audit-walked

House rule: every new floor journey gets a declared, axis-aligned route
exported on `SIM._` and walked by `__dev.audit()` against the occluder and
footprint boxes — exactly like `busRoute` / `refillRoute` today
([dev.js:408-419](../../js/dev.js)). New exports: `SIM._.waterRoute(stop)`
(slice 3) and `SIM._.candleRoute(...)` legs (slice 4). dev.js's audit gains
one loop per new route family.

### `__dev.noraDo(task)`

Mirror of `__dev.catDo`: `__dev.noraDo('stretch'|'chalk'|'water'|'candles')`
sets the matching pending flag / zeroes the timer and forces `idleT = 0`, so
each behavior can be watched immediately instead of waiting out a timer.
Added in the slice that adds the first task; extended per slice. AGENTS.md's
dev-harness bullet and this repo's smoke-test note list it.

---

## Slice 1 — a quiet stretch when the café is empty

The smallest slice; pure sim + one pose.

**Trigger.** Track `b.emptyT` in `updateBarista`: accumulates while
`world.patrons.length === 0` and no queue/orders, resets otherwise. In the
idle pool, when `emptyT > 20` s, a ~30% pick becomes `stretch`.

**Behavior.** State `stretch`, 2.2 s: both arms raised overhead, a slight
lean (one new pose in `SCENE.drawPerson`, `js/scene-people.js` — reuse the
arm plumbing that `armUp` / `holding` already have). Afterwards she goes back
to standing, watching the room. No sound — the point is the hush.

**Caption** (gate 0.3, pick one of):
- `the café is empty; nora stretches, unhurried.`
- `nora stretches — the cat pretends it wasn't watching.`

**Files:** `js/sim-characters.js` (state + pool), `js/scene-people.js`
(pose), `js/dev.js` (`noraDo('stretch')`). Docs: characters.md idle table,
world.md caption list.

**Verify:** `?dev` → `__dev.noraDo('stretch')`; night hours
(`__dev.hour(3)` + `__dev.ff`) reach an empty café naturally. `__dev.audit()`
(no new routes, should be untouched).

---## Slice 2 — chalking the menu (the doodle changes)

**Board state.** The menu board lives in the static background cache
([scene-bg.js:94](../../js/scene-bg.js), `L.menu` = 820,104 108×68). Keep it
cached: add a module-local doodle id in scene-bg.js with
`SCENE.setMenuDoodle(i)` that stores it and calls `SCENE.invalidateBG()` —
the cache redraws once per chalking, which is rare. `drawMenuBoard` draws
doodle `i` where the little chalk heart sits today.

**Doodle set** (all in the existing chalk whites, ~12 px, hand-wobbled like
`chalkText`):

0. the heart (current art — becomes doodle 0)
1. a curled sleeping cat
2. a steaming cup, three wisps
3. a sprig — stem + leaf pairs

Nora advances to a *different* random doodle each time (never repeats the
current one). Flourish, owner's call: when `world.rain > 0.3` at chalk time,
weight a 5th umbrella doodle heavily — the board answers the weather.

**Behavior.** New barista timer `b.chalkT` (rnd 600–1200 s real time). When
due and idle, `chalk` joins the pool: walk behind the counter to x≈862 (below
the board, still on the `baristaHome.y` rail — no new floor route, so no
audit route needed), face the wall, arm up 3 s, then `setMenuDoodle(next)`.

**Sound.** `SND.chalkTick()` — 2–3 short filtered-noise ticks over the 3 s,
peak ~0.025, sfx bus. New row in sounds.md's one-shot catalog.

**Captions** (gate 0.3, matched to the doodle):
- `nora chalks a little cat beside the prices.`
- `today the board gets a steaming cup.`
- `nora touches up the chalk heart.`

**Files:** `js/scene-bg.js` (doodle state + art), `js/audio.js` (chalkTick),
`js/sim-characters.js` (timer + state), `js/dev.js` (`noraDo('chalk')`).
Docs: characters.md, sounds.md, world.md captions, art.md (doodle art note).

**Verify:** `__dev.noraDo('chalk')` a few times — every doodle appears, cache
visibly updates, console clean. `__dev.audit()` → 0.

---

## Slice 3 — watering the plants

**Stops (3, in walk order):**

1. `L.counterPlant` (900, 264) — watered from behind the counter (stand
   x≈880 on the home rail, arm up). No floor route needed.
2. `L.plants[0]` (612, 262) — the wall plant by the counter's left end;
   stand just below it, right beside the counter gap (`baristaExitX`).
3. `L.plants[1]` (930, 322) — the front-corner plant; stand below its
   footprint (y ≈ 340), reached along the lane.

Window-sill and mantel tiny plants are out of reach and out of scope (they
can be "watered" off-screen forever). Route: one declared `waterRoute`
built like `refillRoute` — home rail → exit gap → lane → each stand spot,
every leg axis-aligned, exported on `SIM._`, walked by the audit. Exact
stand coordinates get tuned against `?dev&overlay` + audit output.

**Trigger.** Once per café day, in the bright morning: pending when
`world.hour` is in [9, 16] and `world.wateredDay !== current day index`;
cleared when the round completes. Sits below bowl care in the ladder — the
cat outranks the ficus.

**Behavior.** She carries a small watering can (`holding: 'can'`, new art in
`SCENE.drawPerson` — copper, spout forward). Per stop: 1.6 s pour, can
tilted (arm plumbing again). Optional flourish: 3–4 one-pixel droplets via
the particle system during the pour.

**Sound.** `SND.waterPour(dur)` — a darker, quieter cousin of `kettlePour`
(low-passed noise, peak ~0.03), sfx bus. New sounds.md row.

**Captions** (one per round, gate 0.4):
- `nora makes the rounds with the watering can.`
- `the plants get their morning drink.`

**Files:** `js/sim-characters.js` (states `waterOut`/`water`/`waterHome` +
route + ladder), `js/scene-people.js` (can), `js/audio.js` (waterPour),
`js/dev.js` (`noraDo('water')` + audit walks `waterRoute`). Docs:
characters.md, sounds.md, world.md.

**Verify:** `__dev.noraDo('water')` — full round, no furniture clipping;
`__dev.audit()` → 0 (the new route is now proven, not eyeballed).

---

## Slice 4 — lighting the candles at dusk

The biggest slice: it changes the lighting model, table art, and adds the
longest walk Nora takes. Also the highest payoff.

### State model

- Each non-tall table gets `tb.candle` ∈ [0,1] (lit amount; ramps 0→1 over
  ~2 s when lit, so the glow blooms instead of popping).
- `world.candles = { mantel: 0..1 }` for the mantel pair.
- **Lit band:** candles *should* be lit whenever `daylight < 0.5` (the
  palette crosses 0.5 falling around 18:45, rising around 06:30 —
  [scene-core.js:260-270](../../js/scene-core.js)).
- **Dusk:** when daylight falls below 0.5 and candles are unlit, the candle
  round becomes pending (ladder position 3).
- **Dawn:** no snuffing round — when daylight rises past 0.5 the candles
  fade out over ~60 s (burned down overnight; believable and free). One
  gated caption: `morning light; the candles get to rest.`
- **Boot / clock jumps** (`?dev&hour=20`, `__dev.hour`): if the clock lands
  inside the lit band, candles initialize/jump to lit — no ghost round for
  time that never elapsed. `__dev.hour` snaps candle state to match the band.

### Rendering changes

- `js/scene-fx.js` `drawLighting`: table glow alpha × `tb.candle`; mantel
  glow × `world.candles.mantel`. (Daytime café loses the always-on candle
  pools — the windows carry daylight; verified by eye at hours 10/14.)
- `js/scene-furniture.js`: the jar flame pixels draw only when
  `tb.candle > 0.3` (the closure already captures `world`).
- `js/scene-bg.js` `drawCandleFlame` (mantel): scale flame + alpha by
  `world.candles.mantel` instead of always drawing.
- **Check first:** the nook side tables get lighting glow today but
  `drawSideTable` may not draw a jar. Resolve while implementing: give side
  tables a tiny jar (preferred — the nook wants candlelight) or exclude
  `tb.small` from candle glow. Whichever way, glow and art must agree.

### The round

One match, then a lit taper — struck once, carried table to table:

1. Pending + idle → `candleRound`. She picks up a taper
   (`holding: 'taper'`, small art: stick + flame dot once lit).
2. Route: tables ordered left-to-right. Table legs reuse the *proven
   geometry* of `busRoute` (drop from the lane at each table's bus spot /
   `busVia` column); between tables she returns to the lane. The chained
   legs are exported as `SIM._.candleRoute` so the audit walks the actual
   round, not just its pieces.
3. Per table: 1.1 s pause, flame transfers (`tb.candle` ramps up), a barely
   audible `SND.candlePop()` (soft airy fwip, peak ~0.02). At the *first*
   table only, `SND.matchStrike()` (short scratch + fizz, peak ~0.03).
4. Last stop: the mantel. Stand spot on the hearth rug (≈ 388, 300 — must
   clear the flanking armchair footprints; tuned via overlay + audit), arm
   up, both mantel candles bloom.
5. Taper down, walk home. Patrons at tables are fine — she lights around
   them (cozy, not awkward; they're regulars).

**Interruption:** an order or queue arrival finishes the current table,
parks the remaining stops, and releases her to the counter; the round
resumes from the next unlit table on a later idle tick. Unlit tables in the
meantime are just… unlit; nothing depends on them.

**Captions** (one per round, gate 0.6 — this is the day's most visible
ritual):
- `nora goes round with a lit taper; the tables glow one by one.`
- `dusk. nora lights the candles.`

**Sounds:** `matchStrike`, `candlePop` — both new sounds.md rows, sfx bus,
the quiet end of the gain range.

**Files:** `js/sim-core.js` (candle state on tables/world + dawn fade),
`js/sim-characters.js` (round states + route + ladder),
`js/scene-fx.js`, `js/scene-furniture.js`, `js/scene-bg.js` (lit-scaled
rendering), `js/audio.js` (two one-shots), `js/dev.js`
(`noraDo('candles')`, audit walks `candleRoute`, hour-jump snapping).
Docs: characters.md (the ritual), world.md (lighting model + captions),
sounds.md (two rows), art.md (taper, unlit jar, lighting-pass note).

**Verify:** `?dev&hour=18` + `__dev.ff` through dusk — round fires
naturally; `__dev.hour(12)` → candles out, no glow; `__dev.hour(20)` →
snapped lit; order arriving mid-round parks and resumes. `__dev.audit()` →
0 with the round route checked.

---

## Considered and parked (not in this plan)

- **Nora pauses to scratch the cat in passing** — lovely, but it wants the
  cat-interruption plumbing done carefully; candidate for a follow-up
  roadmap bullet.
- **Humming while she wipes** — audio-risk (repetition next to a reading
  owner); revisit with the generative lo-fi layer idea in § More sound.
- **Watering the sill/mantel plants** — out of reach; skipped rather than
  solving ladders.
- **A morning candle-snuffing round** — dawn burn-out is quieter and free;
  can be upgraded later if the owner misses it.
- **02:00 chair-stacking** — already its own roadmap bullet (§ More world);
  the candle-round machinery (chained stops, park/resume) is deliberately
  built so it can be reused there.

## Open questions for the owner

1. Rain-aware umbrella doodle on the chalkboard — flourish in, or keep the
   set to four?
2. Dusk candle captions at gate 0.6 (most rounds captioned) — right for the
   day's anchor ritual, or should it whisper like everything else (0.3)?
3. Any preference on slice order? Written smallest-first (stretch → chalk →
   water → candles); candles-first is fine too if the dusk ritual is the
   thing you want soonest.
