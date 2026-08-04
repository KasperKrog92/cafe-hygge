# Plan: piano — a corner upright, played softly

The bottom-left corner of the café gets an **upright piano** with a small
bench: dark counter-wood body side-on against the corner, keyboard facing
right, the player seated facing left. Three lives use it. A rare **pianist
patron** orders as usual, then settles at the bench and plays part of their
stay, drink resting on the lid. **Nora**, on truly empty nights, slips out
from behind the counter and plays a few quiet minutes. And the **cat**
sometimes hops up via the keyboard — two or three soft accidental plinks —
and loafs on the lid, tail draped over the edge. A small **brass piano lamp**
at the right end of the lid arches over the sheet music and glows with the
café's other lamps at dusk, so the corner is never a dark hole — and Nora's
night tune happens in a warm pool of light.

The playing itself is **ostinato + drift**: a composed, slowly rocking
left-hand figure under a sparse generative right hand borrowed from the music
box's pentatonic world. It sounds intentional but never repeats exactly, and
the music box rests while anyone is at the keys.

**Design bar check:** the piano is diegetic furniture in an empty corner — no
UI, no goals. Sessions are occasional (a world-level cooldown keeps them a
treat, not a soundtrack), every note obeys the house gain law, the whole
voice routes through the existing 🎵 music bus so one toggle still means "no
melodic content", and captions stay probability-gated behind the shared
limiter. The corner sits fully above the caption line — the text at the
bottom keeps its clear strip.

**Shape:** four phases, shippable in order, each ending the standard way —
smoke test, `?dev` + `__dev.audit()` → 0 problems, console clean, matching
docs updated in the same change.

---

## Current state (what we build on)

- **The corner is open floorboards.** Its bounds: captions blit at (16, 540)
  (`SCENE.drawCaption`, `js/scene-fx.js:166`) and run 28 px tall, so the
  piano's baseline plus contact shadow must stay ≤ ~532; content-safe bounds
  keep everything at x ≥ 16 (12 px side overscan). Neighbors, from the
  derived footprints (`js/scene-core.js:204`): table 1's chair spans
  x 127–157 (y 416–438), table 3's chair x 191–221 (y 524–546), table 1's
  stool x 235–261. That leaves **one clear descent column at x ≈ 112** from
  the lane (y 368) to the corner, and a second cat-sized gap near x 232.
- **Seats** are built in `js/sim-core.js:94–126` as flagged entries
  (`armchair`, `nook`, `window`); the boot-seeded regulars reference **seats
  10 and 12 by index** (`js/sim-core.js:126`), so new seats must append at
  the end. `freeSeat` (`js/sim-patrons.js:14`) picks from all untaken seats
  with trait-preference filters (laptop dining filter at `:33`, reader
  filter at `:39`); `reserveCoupleSeats` skips `small`/`tall` tables
  (`js/sim-patrons.js:60`). The **dormant-trait law** exists for laptops
  (docs/characters.md): when the preferred spot isn't available, the trait
  stays dormant and the visit proceeds normally.
- **`world.tables` holds more than dining tables**: 4 dining + 2 nook side
  (`small: true`) + 2 window (`tall: true, reach: 12`) — built in
  `js/sim-core.js:69–76`. Tall tables draw their items up at sill height
  (`js/scene-furniture.js:241` → `drawTableItem` `:347` with a `reach`
  offset), and everything downstream — the sip animation
  (`js/sim-patrons.js:474`), abandoned-cup avoidance, the 40% cup return,
  Nora's bussing (routes shared with the audit's journey sweep,
  `js/dev.js:481`) — keys off the table entry. A new drink surface that
  joins this list inherits the whole pipeline.
- **The typing pose is the forearm template**: `updateSeated` runs the
  typing timers at `js/sim-patrons.js:518–531` (sipping pauses the hands),
  and `drawPerson` renders the alternating forearms at
  `js/scene-people.js:126`. Playing is the same mechanic reaching sideways.
- **Music**: the music bus + 🎵 toggle (`js/audio.js:71`, `:97`); the music
  box's pentatonic `SCALE`, `playNote`, and random-walk scheduler
  (`js/audio.js:601`, `:605`, `:693–708`); the night pad (`:610–649`,
  `:711–719`) draws chords from the same pentatonic well an octave down.
  `SND.update(dt, world)` (`js/audio.js:652`) is dt-driven off the main
  loop *and* the hidden-tab interval, so a session engine there keeps
  playing when the tab is backgrounded. All one-shots are `guard()`-wrapped.
- **The cat already knows transit surfaces**: the topShelf grand ascent
  chains counter → machine → backShelf hops (`js/sim-characters.js:894–896`)
  and each hop step sets `cat.surface` (`:822`). Perches live in
  `L.catPerches` with `stand`/`anchor`/`surface`; approach corridors are the
  `CAT_VIA_PAIRS` list + `L.catRoutes` (`js/sim-characters.js:656–686`);
  destination weighting is `spotWeight` (`:716`); gated ascents have the
  `nookChairTwoFree` precedent (`:711`); dismounts declare their own steps
  (`:911–936`, `softThump` on the final landing). The audit checks aerial
  anchors against their declared surface (`js/dev.js:536–553`) and
  `__dev.catDo` has an allowed-id list (`js/dev.js:168`).
- **Nora's idle ladder** is `startIdleTask` (`js/sim-characters.js:592`),
  strictly below service; the candle round already proves the
  "interrupted mid-task → park, serve, resume/abandon" pattern, and she
  exits the counter at `L.baristaExitX`. `drawPerson`'s `sit` pose works for
  any person — she has simply never used it.

---

## Phase 1 — the corner upright (art, inert)

The piano and bench appear, fully grounded, before anything uses them.

- **`L.piano`** in `js/scene-core.js` — all starting values, tuned under the
  overlay + audit: body x 26–82 with top at y 480, baseline 524 (~44 px
  ≈ 0.73 CH — honest upright scale against the ruler, no hero exception);
  keyboard cheek x 82–98 with the key strip at ~y 498 (0.43 CH, a real
  keyboard height for a bench sitter's hands); `bench: { x: 114, y: 524 }`;
  `lamp: { x: 84, y: 478 }` (the piano lamp's base at the right end of the
  lid, head arched left over the music rest); `saucer: { x: 60, y: 480 }`
  (the lid spot a drink lands on, mid-lid, within the player's reach);
  `catAnchor: { x: 40, y: 478 }` (left end of the lid); `keysStep:
  { x: 92, y: 498 }` (the cat's transit landing); `via: 112` (the clear
  descent column — the busVia twin). Lamp, drink, and cat share the ~60 px
  lid left-to-right in that reverse order — the three anchors are declared
  together in `L.piano` precisely so they can never overlap.
- **Art** (`js/scene-furniture.js`, two drawables pushed at baseline 524 —
  bench first so insertion order stacks bench < piano < sitter): body in the
  counter dark woods `#5a3d28`/`#4a3222` with `#6b4529` panels and
  `shade()` edge highlights; cream key strip `#e8e0d0` with 2 px dark key
  groups `#4a3222` (minimum feature 2 px — key *groups*, not single keys);
  small brass hinge and pedal glints `#c9a04a`; a sheet of music `#e8dfc9`
  on the rest. Bench = stool construction in the same wood. Contact
  ellipses under both.
- **The piano lamp**, drawn as part of the piano drawable at `L.piano.lamp`:
  a small brass stem `#c9a04a` rising from the right end of the lid, arched
  left so its little warm shade (`#e8dfc9` with a `shade()` underside) hangs
  over the music rest — the classic upright-piano lamp, ~14 px tall so it
  stays under the lid-height + 0.25 CH silhouette. It **glows**: a `glow()`
  call in `drawLighting` (`js/scene-fx.js`) centered under the shade,
  radius ~22 (between the laptop's 18 and the reading lamps), scaled by
  `pal.lamp` like every other lamp — it fades up at dusk and off after
  dawn with the room, no new state. The lit shade's visible warm pixel
  swaps with `pal.lamp` the way the other lamp heads do.
- **Footprints**: a new furniture kind → explicit `L.footprints` entries in
  `js/scene-core.js` (piano ~x 18–100, y 504–526; bench stool-style,
  ~x 101–127, y 516–528; neither passable — the bench is a seat).
- **Not an occluder**: a 44 px body cannot fully hide a 60 px walker;
  painter's sort handles the partial overlaps.
- **Verify**: `?dev&overlay` screenshot; walk checks on the lane behind it;
  caption clearance with a long caption on screen; `__dev.hour()` sweep
  including dusk/night for the lamp glow pooling on the keys and bench;
  `__dev.audit()` → 0. **Docs**: art.md (layout map bottom-left entry,
  ruler row, palette-reuse note), world.md (the lighting pass gains the
  piano lamp).

## Phase 2 — the piano's voice (audio, dev-triggered)

The sound exists and is tunable before any character sits down.

- **`pianoNote(f, vel)`** in `js/audio.js`: felt-piano voice — triangle
  fundamental + quiet sine octave + a faint ~2.9× partial, under a ~1.9 kHz
  lowpass, 6 ms soft attack, 1.6–2.4 s exponential decay, moderate room
  send, **per-note peak ≤ 0.03**, routed to `musicBus`. Routing through 🎵
  is deliberate: toggled off, sessions continue visually (captions and all)
  in silence — the toggle keeps meaning "no melodic content". The synth is
  also the natural swap point for a real felt-piano sample set later
  (roadmap.md's pipeline).
- **Session engine** in `SND.update` (dt-driven, hidden-tab safe), exposed
  as `SND.pianoStart()` / `SND.pianoStop()`:
  - *Left hand*: 2–3 hand-written rocking figures per chord (root – fifth –
    tenth, broken), one note every 0.9–1.4 s with ±40 ms humanizing, an
    octave below the music box, vel ~0.6×. A tiny progression graph walks
    C → Am → F → G-ish every 8–16 s, pentatonic-safe tones only.
  - *Right hand*: the music box's random walk transplanted an octave down —
    a note every 1.2–4 s, 25% rests, occasional dyad, longer decays.
  - Combined level sits at ambience (~0.05) — sparse by construction.
- **Interplay**: the music-box scheduler (`js/audio.js:694`) gains a
  `!pianoActive` guard; on `pianoStop`, `musicT` resets to 4–8 s so the box
  re-enters gently. **The night pad keeps playing** — it draws from the
  same pentatonic well, so it cannot clash, and stopping it would itself be
  an audible seam.
- **`pianoPlinks()`**: 2–3 quick upper-register notes 90–200 ms apart, one
  off-scale neighbor allowed, combined peak ≤ 0.025 — the cat's accident,
  triggered in Phase 4.
- **Dev**: `__dev.piano(on)` forces a session for tuning.
- **Docs**: sounds.md — a "corner piano" section beside the music box, a
  one-shot row for the plinks.

## Phase 3 — the pianist patron

- **Trait roll** in `makePatron` (`js/sim-core.js:162`): `pianist` — ~10% of
  patrons who rolled neither `wantsBook` nor `laptop`; never couple members
  or Holger. **Dormant-trait law**: at seat-choice time the trait acts only
  if the bench is free *and* `world.pianoNextT` has passed; otherwise a
  perfectly normal visit.
- **The bench joins `world.seats` last** (`{ piano: true, table: 8,
  side: 0, facing: -1 }`) so the seeded indices 10/12 stay stable, and **the
  lid joins `world.tables` as #8** (`{ piano: true, items: [], reach }`),
  drawn at lid height via the tall-table pattern
  (`js/scene-furniture.js:241`). That one entry buys the whole pipeline:
  drink set-down on the saucer spot, steam while hot, sips, abandoned-cup
  avoidance, the 40% cup return, and Nora's bussing — her bus spot is the
  bench spot, reached through the x 112 column and proven by the audit's
  journey sweep.
- **`freeSeat` exclusions**: `s.piano` leaves the general pool and the
  laptop dining filter (`js/sim-patrons.js:33`); `reserveCoupleSeats` skips
  `tb.piano` (`:60`).
- **At the bench**: within a normal 100–260 s stay, 1–3 play-bursts of
  40–90 s separated by 8–20 s sit-backs; `SND.pianoStart/Stop` wraps each
  burst; sipping pauses the hands exactly like the typing–sip truce
  (`js/sim-patrons.js:518`). On the final burst,
  `world.pianoNextT = now + rnd(300, 600)` — sessions stay occasional.
- **Pose**: a `playing` flag on `drawPerson` — seated facing −1, both
  forearms reaching to the keys with the typing bob turned sideways
  (`js/scene-people.js:126`), a 1 px slow torso sway, head tipped 1 px.
- **Captions** (shared limiter): "Freja settles at the piano." (0.7, once
  per visit); "A soft tune drifts across the café." (0.12 per burst).
- **Departure**: the standard machine — the bench is backless, so
  `chairScrape` stool rules apply unchanged.
- **Dev**: `__dev.spawn({ pianist: true })`.
- **Docs**: characters.md (trait roll, lifecycle branch, order-weights
  untouched), world.md (captions/events).

## Phase 4 — the quiet hours: Nora's tune, the cat's lid

**Nora, late** (`startIdleTask`, `js/sim-characters.js:592` — a new rung
below plant care):

- Conditions: zero patrons in the world, `daylight < 0.35`, a 600–1200 s
  cooldown, 25% candidate roll. She exits at `baristaExitX`, takes the lane
  and the x 112 column, sits — her first seated pose, `drawPerson` already
  supports it — and plays 60–120 s with the same engine (sparser right
  hand). A doorbell or queue arrival stops the burst mid-phrase: stand,
  walk home, serve (the candle-parking precedent, minus the resume — the
  moment has passed).
- Caption (0.7): "The café is empty; Nora plays a little."
- **Dev**: `__dev.noraDo('piano')`; her route joins the audit's journey
  sweep.

**The cat**:

- **`L.catPerches.piano`**: stand ~(136, 524) → **keys transit** at
  `L.piano.keysStep` (a `pianoKeys` transit surface — the machine-transit
  precedent, `js/sim-characters.js:894–896`; landing there fires
  `pianoPlinks()` and, at 0.5, "The cat pads up the keys and claims the
  piano lid.") → lid anchor, `surface: 'pianoTop'`, loaf/sit/sleep
  60–180 s, tail draped over the lid edge (the backShelf hanging-tail art,
  reused), head occasionally tracking the room (gaze precedent).
- **Gate**: ascends only while the bench seat is free and no session is
  active (`nookChairTwoFree` pattern, `:711`). If a pianist arrives while
  the cat is up — **the cat stays**; a cat on the piano while someone plays
  is the whole tableau. Plinks can't recur because the dismount never
  touches the keys: one declared hop to a front floor spot ~(60, 532) with
  `softThump`, then out by the declared route.
- **Routing**: a `pianoStand` id in `CAT_VIA_PAIRS` + `L.catRoutes`
  (starting shape: descend at x ≈ 232 between table 1's stool and table 3's
  chair, then west at y ≈ 510 — every leg audit-tuned). `spotWeight` entry
  ~0.9, ×1.5 in the evening. Petting works on the lid for free
  (`SIM.petCat` is position-based).
- **Audit**: a `pianoTop`-anchor-on-lid rule in the surface checks
  (`js/dev.js:536–553` family); `'piano'` joins `catDo`'s allowed list
  (`js/dev.js:168`).
- **Docs**: characters.md (cat section), art.md (cat variants note if the
  lid pose needs one), AGENTS.md (dev console: `__dev.piano`,
  `noraDo('piano')`, `catDo('piano')`, the spawn trait).

---

## Final verification

The standard smoke test, plus one full evening watched end to end: a
pianist session with the music box yielding and returning, drink on the
lid bussed by Nora, the cat's plink ascent and its silent front dismount,
the piano lamp fading up with the room at dusk and pooling on the keys
through Nora's empty-café tune (interrupted by a doorbell), captions never
crowding the limiter — and `__dev.audit()` → 0 problems at every phase
boundary.
