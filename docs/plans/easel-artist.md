# Plan: the easel artist — a regular who paints the café into its own walls

A fifth regular sets up an easel in the café and paints big canvases across
many café days (24 real minutes of running café each). The reader can glance
at the canvas any session and see it further along; patrons drift over to
watch; and when a painting is finished it waits — as a soft invitation — to be
unveiled and hung on the wall for good.
Over months the café accrues a very small gallery of its own life: the cat on
the sill, rain on the glass, the hearth.

This is Gerda's scarf at easel scale, plus one new piece of furniture and one
new regular. Everything else rides existing patterns: the roster
(`CAST.regulars`), arcs (`CAST.arcs` + `reconcileNarrative`), the piano-bench
seat precedent, the fetch-a-book mid-stay wander, the overheard/musing caption
seams, and the lasting-flag wall art (the scarf-on-cat precedent).

**Design bar check:** ignore her forever and the café is whole — she is simply
a quiet painter in the corner, ambience like the knitting. Progress is idle,
in café days; the unveiling never fires itself and never expires; the gallery
only ever *adds* warmth to the room. No badge, no count, brush sounds quieter
than the fire.

**Depends on:** [street-painter.md](street-painter.md) **Phase 0** — ✅ built
(café-day progression via `updateNarrative`, `stages` + per-stage `rows`; the
anchored-arc support is not needed here — this arc has a proper owner).

**Shape:** four phases, each shipping something lovely alone. Standard close
for every phase: smoke test, `?dev` + `__dev.audit()` → 0 problems, docs in the
same change.

---

## Current state (what we build on)

- **The piano bench proves "special seat with the full drink pipeline".** The
  bench is an appended seat whose drink goes to a dedicated saucer spot on the
  lid, so sipping, steam, abandoned-cup avoidance, and Nora's bussing all use
  the shared table machinery (characters.md §patrons). The artist's stool +
  paint table copy this exactly.
- **The `playing` pose proves "seated, arms reaching to a work surface".** The
  painting pose is its sibling: one forearm to the canvas, bouts with
  sit-backs, sipping pauses the hands (`updateSeated` timer-habit shape, like
  laptop typing).
- **`fetchBook` proves the mid-stay wander.** Seat and drink stay put while a
  patron walks somewhere, lingers, and returns — the exact shape of "go watch
  the painter for a minute".
- **The scarf proves the whole arc loop** — including "the visible thing reads
  the saved `progress`" (her lap scarf ↔ our canvas) and the lasting flag
  re-applied on boot (cat's scarf ↔ our hung paintings).
- **The roster is pure data.** A new regular is a row; `makeRegular` stamps
  it; `updateRegulars` schedules it; line pools give her a voice.

## Design decisions

- **The regular — placeholder name Agnes** (outside all random name pools;
  owner renames at will, the Villads→Kasper precedent). An older painter:
  grey-streaked bun, paint-flecked smock over a warm top, deliberate 42 px/s
  walk. Drink: cortado → nearest existing prep is `coffee_milk`; or chamomile
  refills — pick one existing prep, no new drink. Arrives ~11:00 (the roster
  gap between Gerda 10:00 and Kasper 13:30), stays long (fixed stay near the
  top of the range — painting is a day's work). `chatty: true` but soft: her
  `overheard` pool fires only at the watch-spot seam (Phase 4).
- **The easel is furniture, the canvas is arc state.** Easel + stool + a small
  paint table are `SCENE.L` entries with footprints, drawn in
  `js/scene-furniture.js` with correct baselines. The canvas *image* is a pure
  function of `(paintingIndex, progress)` — deterministic, so what you see is
  what is saved, on every device, every boot.
- **Placement — decided by overlay, not by this doc.** Two candidates, both
  needing a `?dev&overlay` pass + audit before committing:
  - **(a) x≈244, y≈318** — between window 1's perch floor spot (224, 252) and
    the left armchair (298, 296), canvas angled right so the room (and the
    reader) sees its face. North light from the window; the painter's classic
    spot. Risks: crowds the armchair's visual breathing room.
  - **(b) x≈600, y≈332** — between window 2 and the floor plant (612, 262),
    canvas angled left. Risks: plant footprint, lane clearance (`L.lane` 368
    ± 16), Nora's counter-exit path at x=616.
  Whichever wins: footprint + (if it can hide a walker — the easel is tall)
  an `L.occluders` entry, and seat/watch targets clear of lane and occluder
  spans.
- **Pacing: `rows: [10, 12]` café days** — four-plus hours of open café per
  painting, slower than the scarf; a painting should feel like many sessions
  of glances. Retune by feel.
- **The gallery is finite and that is fine.** Two honest wall piers exist in
  the back wall band: between window 1 and the fireplace (≈ x 240–340,
  y 100–180 — big canvas), and the narrow pier between fireplace and window 2
  (≈ x 436–468 — a small portrait). Two paintings, then the arc rests and
  Agnes keeps visiting as a familiar face who sketches in a notebook. (If the
  owner wants more later: rotation, or gifting a painting to a regular's
  table — separate plan.)
- **Subjects paint the café's own life.** Painting 1: the cat on the window
  sill — *wearing the little scarf if `cat-wore-scarf` is set* (the café
  painting its own history into its walls). Painting 2 (small): the hearth,
  or rain on the glass. Each subject readable at pixel scale from across the
  room; mock at 1× before wiring.

---

## Phase 1 — the corner exists (furniture only, ships alone)

1. **`SCENE.L` entries** (`js/scene-core.js`): `L.easel` (legs, tray,
   canvas rect + its face angle), `L.easelStool`, `L.paintTable` (with a
   saucer spot and a `busVia` if its approach needs threading). Footprints for
   all three (new furniture *kind* → own `L.footprints` entries; stool is a
   seat → never passable). Occluder entry if the easel's height demands it.
2. **Drawables** (`js/scene-furniture.js`): easel (a-frame legs, tray with
   tiny paint pots, canvas showing its current state — blank until Phase 3
   wires the arc; start it primed off-white `#e8e0cf`-family), stool, paint
   table with brush jar. Baselines correct for y-sort; canvas face toward the
   room.
3. **Empty-corner behavior:** none — it is simply set dressing this phase.
   The cat may not target it (no anchor declared).

Verify: `?dev&overlay` screenshot both candidate spots, pick one with the
owner's eye or the audit's; walk cycles (`__dev.send`) past it for occlusion;
`__dev.audit()` footprint/journey → 0. Docs: art.md (furniture table + layout
map), architecture.md if `L` grew a new shape.

## Phase 2 — Agnes paints (the regular, no arc yet)

1. **Roster row** (`js/characters-roster.js`): appearance, drink, ~11:00
   window, long fixed stay, `nameStyle`, umbrella color, `seat:
   'easelStool'` — a new `SEAT_PREFS` predicate (`js/sim-core.js`) targeting
   the appended stool seat. Fallback when somehow taken: normal seating rules
   plus one patient `usualTaken` line (she sketches at a table instead — the
   trait stays dormant, the pianist precedent).
2. **The stool seat** joins the seat list the piano-bench way: her drink lands
   on the paint table's saucer spot; sipping, steam, bussing, abandoned-cup
   logic all free.
3. **Painting bouts** (`updateSeated`, `js/sim-patrons.js`): every 8–18 s a
   2–4 s `painting` bout — new pose in `SCENE.drawPerson`
   (`js/scene-people.js`), seated, brush forearm to the canvas, small
   two-frame stroke; sipping pauses the bout (the pianist/laptop pattern). A
   rare palette-mixing variant (head down at the tray).
4. **Sound** (`js/audio.js`): `SND.brush()` — a filtered-noise swish, peak
   ≤ 0.03, sfx bus, triggered from bout code (dt-driven, hidden-tab safe);
   an even rarer soft glass `tink` of brush on the water jar (existing clink
   recipe, quieter). Gain-staged next to `SND.needle()` — if you can hear it
   over the fire, halve it.
5. **Voice:** `musing` pool (solo painter fragments, lowercase-cozy, each
   standing alone), small `backstory` drip (why she paints cafés), `arrival`/
   `settle`/`arrivalRain` lines. No `overheard` until Phase 4 gives it a seam.

Verify: `__dev.regular('agnes')` → walks in, settles, paints, sips, leaves;
order cycle unaffected; `__dev.ff` a full day; audit → 0. Docs: characters.md
(roster table + her section), sounds.md (brush row), world.md (captions).

## Phase 3 — the canvas remembers (the arc)

1. **Arc definition** (`CAST.arcs`): `{ id: 'agnes-paintings', owner: 'agnes',
   stages: 2, rows: [10, 12], glyph: 'palette', … }`. The `stages`/`rows`
   machinery exists (street-painter Phase 0); the one `playBeat` extension
   this arc still needs is **per-stage** `beat` and `flag` selection (today a
   definition carries one of each) — keep it data-shaped like everything else.
2. **Canvas reads `progress`** (`js/scene-furniture.js` easel draw): stage
   bands — blank → charcoal sketch lines → underpaint blocks → color masses →
   details — as a pure function of `(stage, progress)`. The cat-with-scarf
   conditional reads the `cat-wore-scarf` flag at draw time.
3. **Invitation + beat:** at `rows`, `pendingBeat` → palette-glyph bubble over
   Agnes whenever she is present (the scarf's exact loop — owner-attached, so
   nothing new). The beat: she stands, steps back, a 3–4 line caption run, a
   heart bubble; the painting leaves the easel (canvas → blank/primed for the
   next) and **appears on its wall pier for good** — a flag-keyed draw in the
   wall pass (`js/scene-bg.js`), re-applied every boot like the cat's scarf.
   Her bond warms.
4. **After both paintings:** arc `done`; bouts retire; she visits with a
   sketchbook instead (a `musing`-flavored idle, tiny pose reuse of reading).
   The two paintings glow very faintly warm under lamplight with the room
   (`drawLighting` only if screenshots say they need it — default: no glow).
5. **Audit:** stage ≤ stages; canvas-state function total (no progress value
   without a defined band); flags re-apply; beats only via invitation.

Verify: fresh boot → blank canvas; `__dev.age(4)` → sketch appears live;
`__dev.arc('agnes-paintings', {ready:true})` → bubble → tap → unveiling run →
reload → painting on the pier, easel primed for painting 2; night pass
`__dev.hour(20)` for pier legibility. Docs: narrative.md (status: third arc,
first multi-stage), characters.md (her arc section, the scarf's format),
art.md (wall piers).

## Phase 4 — company (watchers, last because it is pure garnish)

1. **Watch spot:** a declared floor spot near the easel (in `L`, clear of
   lane/occluders/footprints), audited like `busVia` routes.
2. **The wander** (`js/sim-patrons.js`): a seated, non-couple patron
   mid-stay may take a `toEasel → watching → backToSeat` trip (the `fetchBook`
   state shape) — 6–12 s standing at the watch spot, head toward the canvas —
   only while Agnes is present and painting; probability low (~the fetch-book
   rate); never more than one watcher.
3. **The chat seam:** while watched, a gated chance of one exchange — the
   watcher's murmur, Agnes's reply (`overheard` pool, its first and only
   seam), rare heart bubble. Rate-limited by the existing caption limiter;
   these lines stand alone.
4. **Nora, maybe:** on her idle ladder, far below care tasks, a rare stroll to
   the watch spot for a few seconds ("nora tilts her head at the canvas").
   Cheap if her walk-target machinery makes it free (`__dev.noraDo('easel')`);
   drop it if it needs new route plumbing — the patrons carry this phase.

Verify: `__dev.spawn` + `__dev.regular('agnes')` + `__dev.ff` until a wander
fires; journey audit on the watch route; captions stay sparse over a long
`ff`. Docs: characters.md (patron lifecycle diagram + her overheard seam),
world.md.

---

## Open questions for the owner

- **Her name and look** — Agnes is a placeholder; the smock and the bun are
  suggestions.
- **Placement (a) or (b)** — decided at the Phase 1 overlay screenshot.
- **Painting subjects** — cat-on-sill and the hearth proposed; happy to mock
  alternatives at pixel scale first.
- **After the gallery fills** — she rests as a sketching regular (default),
  or a later plan adds rotation / a gifted painting.
