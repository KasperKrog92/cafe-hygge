# World systems — time, weather, light, events

## Closing time and the next morning

At 21:30, new arrivals stop. Nora wishes the remaining guests a good night from the counter,
wipes the counter and makes a closing round. Existing orders are finished;
seated guests have another 12–22 seconds for their last cup before following
their usual departure (laptop, borrowed book, umbrella and lap cat included).
She waits for everyone to leave before clearing tables and snuffing their
candles in a room circuit: reading nook, lower dining tables, piano and artist
corner, then the upper tables and window ledges from left to right. Back at
the counter, she puts away the pastries. Her final round heads toward the
entrance: right curtain, hearth and mantel candles, then left curtain. She calls the cat down,
carries it to the door, switches off the interior lamps and leaves.

The clock holds at 22:30 if cleanup takes longer. A two-second fade out,
one-second dark pause and two-second fade in lead to 07:30. Nora comes back
with the cat and turns on the lamps at the entrance first. She puts the cat
down by its bowls, refills them, opens the left curtains, tends the hearth,
then opens the right curtains before reaching the counter to stock the pastry
case. She works across the room without returning to the till between these
chores. Cakes belong only in the counter display: Nora puts them away at night
and refills that display in the morning. Once it is ready, guests may enter
and the shop returns to its usual routines.

`world.shop` holds the transient phase, current chore and visual state.
`world.clockOffset` skips the sleeping hours without jumping `world.t`, so
caption, weather, movement and story timers receive only actual simulated
time. The normal arrival schedule rolls into the new café day. This sequence
needs no clicks, creates no obligations, and never consumes a story invitation.
No save-schema change: reloading still begins in an open café with saved stories.

The systems that make the room feel alive independent of any character.
All in the `js/sim-*.js` files (state) and the `js/scene-*.js` renderer files (appearance).

## Time

- The clock advances one hour per real minute (a base day is **1440 seconds**),
  with the late-closing hold and overnight skip described above. The sim boots
  at 08:24 so a fresh visit opens onto morning light.
- `world.hour` (0–24 float) drives everything: the sky, the lighting, the
  mantel clock's hands, spawn rates, music sparseness.
- Hour edges are tracked without replaying skipped time after `?hour=` or
  `__dev.hour()` jumps. The church rings four distant strikes at noon; the
  mantel clock gives one soft two-note chime at 09:00, 15:00, 18:00, and
  21:00. A back-room kettle whistles once per day at a slot rolled between
  19:00 and 21:30.
- The **regulars** each keep their own once-per-day schedule (`world.regulars`,
  one slot per roster id). Every café day their arrival hour is rolled fresh
  inside that regular's window — Holger ~09:00, Gerda ~10:00, Lunafreya
  ~11:00, Kasper ~13:30, Freya ~18:30 — and `updateRegulars` brings each in once, never two of the same
  face at once. Spread across the day, they rarely all overlap; only Freya sits
  late enough for the after-dark doze. See characters.md for the roster.
- The palette comes from `SCENE.dayPalette(hour)`, interpolating these
  keyframes (`DAYKEYS` in `scene-core.js`):

| Hour | Sky | daylight | lamp |
| --- | --- | --- | --- |
| 0.0–4.5 | deep night blues | 0.00 | 1.00 |
| 6.5 | dawn peach/amber | 0.50 | 0.50 |
| 9–16.5 | clear day blue | 1.00 | 0.00 |
| 18.5 | dusk orange | 0.55 | 0.45 |
| 20.5 | late blue-violet | 0.12 | 0.90 |
| 22–24 | deep night | 0.00 | 1.00 |

- `daylight` scales the multiply-tint over the whole scene and patron spawn
  rates; `lamp` scales the electric warm glows (hanging lamps, the two
  nook reading lamps, the studio floor lamp by the easel, and the little brass
  piano lamp) and the star/moon alpha. Candle light has its own
  per-flame state, tended by Nora.
- Threshold captions: lamps crossing on → "The streetlamps flicker on, one by
  one."; off → "Morning light spills across the floorboards."

## Weather

The renderer's `drawFloorLight` in scene-bg.js projects two gently widening
window panes onto the floor. Daylight controls intensity, rain softens it, and
the hour shifts the projection. Oval floor pools under the reading/studio lamps
follow `pal.lamp`. These draw **before** depth-sorted furniture and its contact
shadows; the existing scene-wide tint/glow pass still follows the objects.
A cached shadow at the wall/floor junction adds depth. These are visual cues,
with no new timers, simulation state or sound triggers.

- `world.rainTarget` re-rolls every 150–420 s: clear (34%), drizzle 0.4 (34%),
  rain 0.8 (24%), or storm 1.0 (8%). `world.rain` eases toward it at 0.18/s;
  `world.storm` lasts until the next non-storm roll.
- Rain drives: streak count/alpha on the window glass, window-tap density in
  the audio engine, arrival flavor, umbrellas — the patrons' and the
  passers-by's outside alike — and the entrance doormat, which darkens toward
  a damp coir tone with `world.rain` (with a rain-blue sheen in a downpour).
  Every arrival above `world.rain` 0.3 (`SIM._.WIPE_RAIN`) pauses on the mat
  to wipe the wet off their shoes (`wipeFeet` — a soft `shoeWipe` scuff and a
  few low water flecks), umbrella or not. Most wet-weather patrons then
  shake a furled umbrella at the door, park it in the stand, then collect it
  as their final departure stop. `world.umbrellaStand` stores the visible
  owner/color links; it is glanceable room state, never inventory.
- The 🌧️ toggle doesn't just mute rain audio — it forces the *weather* clear,
  because hearing rain that isn't on the glass (or vice versa) breaks the room.
  It also cancels storm wash, pending thunder, and lightning together.
- Transition captions fire only on meaningful changes: rain starting, easing
  to drizzle, stopping, or a storm settling over the street.
- During a storm, normal glass taps gain a dark continuous rain bed. Once the
  rain has risen above 0.6, lightning rolls every 25–75 s: `world.flash`
  briefly lifts the two window panes and door glass, then a 1–4 s distance gap
  ends in a low thunder rumble. The flash decays at 4/s and adds only faint
  cool pools below the windows after dark—never a full-screen strobe.

## The waterfront (terrace, lake and far quay)

Both windows look onto one continuous small city lake, inspired by the scale
and warm facades of Christianshavn. `L.waterfront` holds the banks, near footpath,
terrace anchors and worker's house. `scene-waterfront.js` draws the sky, far
apartment buildings, water, railings, lamps and terrace; the existing window
renderer clips it behind the glass, weather, mullions and curtains.

- One sun moves left to right from 06:00 to 20:00, on a shallow arc. The wall
  between the panes naturally hides it during the middle of its crossing.
  `SCENE.sunPosition` and `SCENE.windowLight` drive the visible sun, its water
  reflection, the direction/length of incident floor light, and the soft indoor
  glow. Rain attenuates all daylight; each curtain attenuates its own beam.
- Slow broad clouds cross that same sky. Stars and a moving moon fade in as
  daylight falls below 0.52. The far buildings' windows warm at staggered dusk
  thresholds; near-bank street lamps cast small pools and small pools on the path; lit far-bank windows reflect on the water.
- `world.waterfront` contains transient boat, bird and aircraft entities plus
  two outdoor tables. `sim-waterfront.js` updates them through `SIM.update`:
  hidden tabs use the same elapsed time, and a clock-only overnight skip does
  not teleport a boat. Rendering never spawns, consumes randomness or advances
  the painter's saved progress.
- Rowing boats and small sailboats pass in fair weather, usually 100–190 s
  apart, with at most two active. Birds cross in small groups every 45–100 s
  in daylight; a small silent airplane may pass every 7–12 minutes in clear
  daylight. Each entity leaves the entire shared view before disposal.
  Dev: `__dev.boat({dir, sail, x})`, `__dev.birds({dir, x})`, `__dev.plane({dir, x})`.
- The two bistro tables belong to real café guests who order inside and carry
  their drink through the door. Fair-weather walk-ins sometimes choose them
  between 08:00 and 20:30; readers can take their own book. Regulars keep their
  authored indoor seats. Guests linger, sip and read, then stroll away, leaving
  cups for Nora. A sustained shower brings the same guest and drink indoors;
  nobody is punished for rain or for the owner's absence.
- Nora walks through the room to the door, crosses the terrace, collects the
  abandoned cup, wipes, and carries the empties back to the counter. Table
  reservations prevent overlap or seating on an uncleared table. Queued orders
  take priority before a trip; a trip already started finishes before service
  resumes. Closing waits for outdoor guests and Nora's final terrace cleanup
  before the indoor closing round and curtains.
- These tables and exterior positions are separate from indoor seats and the
  floor route planner. Outdoor people remain in `world.patrons` (the same total
  cap of seven); their original entity draws at half scale beyond the glass,
  never also in the room. No narrative save shape changes are required.
  Dev: `__dev.spawn({outdoor:true, pianist:false, wantsBook:true, ownBook:true})`
  in fair weather exercises the full ordering journey.

### People on the path and the worker across the water

- `world.passersby` holds the silhouettes crossing outside the glass. They
  walk in master-canvas x along the whole facade (`L.waterfront`),
  so a figure leaves the first pane, disappears behind the wall, and
  reappears in the second a few seconds later. Scenery, not characters: they
  never enter and never interact; `drawPassersby` (scene-bg.js) clips them
  inside each pane on the near path, behind terrace guests and under the rain on the glass.
- Cadence follows the day: every ~9–40 s in daylight, sparser toward dusk,
  only the odd night owl 22:30–06:00; storms halve the traffic. About one in
  five is a pair walking shoulder to shoulder (one object, drawn twice, so
  they can never drift apart).
- Rain above 0.15 raises umbrellas (patron umbrella colors via `shade(·,
  −0.28)`; a pair shares one wide canopy). In heavy rain most walkers hurry:
  faster steps, a lean, the canopy tilted into the weather.
- Unhurried strollers occasionally slow mid-pane for a look at the room —
  always at a pane still ahead of them, never behind the wall — and 18% of
  those pauses earn a caption. `__dev.passer({dir, umbrella, pair, pause})`
  forces one for testing.
- **The street painter** is the first persistent story told entirely beyond
  the glass. A weathered apartment building across the water in the door-side window is repainted from the
  top down over seven café days (`street-house` in `CAST.arcs`). Its warm,
  muted-brick band and the painter's ladder position are pure views of saved
  progress, so a glance after a few chapters simply finds the work further
  along. The painter figure works only in fair daylight (`daylight > 0.45`,
  `rain < 0.3`); at night or in wet weather the ladder waits by itself, while
  progress continues at the café's patient pace. The street remains silent.
- When the facade is complete, a brush invitation waits in the glass. Choosing
  it plays the short finishing beat and sets `street-house-painted`; thereafter
  the ladder and painter retire, the muted-brick facade remains on every boot,
  and one extra window glows there after dark. Gerda may add one line if she is
  sitting at that window when the beat is chosen, but her presence never gates
  it. Dev: `__dev.age(3)`, `__dev.arc('street-house', {ready:true})`, and
  `__dev.shot('window0')` expose the work states directly.

## Lighting (the pass that sells the coziness)

Applied after all sprites, in `SCENE.drawLighting`:

1. **Multiply tint** over the full canvas: night `rgb(112,120,172)` →
   day `rgb(255,250,242)`, lerped by `daylight`.
2. **Additive glows** (`lighter` composite): two counter pendants, each with
   a compact bloom below its shade and a pool directly beneath it on the bar
   (machine + pass, pastry case). Both use `L.pendants` and fade with `pal.lamp`;
   there are no ceiling-light halos across the windows. Also lit are the
   two reading lamps in the nook and the studio floor lamp beside the easel;
   the piano lamp's tight pool over the score,
   keys, and bench; the fireplace (never out — its glow pool grows and
   brightens with the live burn `world.fire.level` and shrinks to a small
   flickering ember glow when low); a candle jar on every dining and nook side
   table plus the mantel pair (each glow scaled by its live 0–1 flame state;
   window poseur tables carry no candle, cups only); a soft daylight pool
   below each window; and one deliberately tiny cool-blue radius-18 pool for
   each open laptop, scaled by `1 − daylight`. Storm lightning briefly adds a
   faint cool reflection below both windows, also scaled by darkness.
3. **Vignette**: radial darkening toward the edges, always.

Speech bubbles and captions draw **after** this pass so they stay readable at
midnight.

### Candle day cycle

When `daylight` falls below 0.5, unlit candles make Nora's dusk round pending;
the tables and mantel bloom one stop at a time as she reaches them. The round
waits behind orders, bussing, and bowl care, and can park at a stop for a new
queue. At dawn the targets drop to zero and the flames fade over about 60 s.
Clock jumps (`?hour=` / `__dev.hour`) snap all flames to the destination band,
so a jump to night does not replay a dusk that never elapsed.

### Hearth burn cycle

The fire is a slow living thing (`world.fire`, `updateFire` in sim-core). Its
live burn `level` (0..1) eases toward a `target` that decays as the log spends
itself (`FIRE_BURN` ≈ a full log to embers in ~3 min), bottoming out at a warm
ember floor (`FIRE_EMBER` 0.16) rather than going dark — the flames, the glow
pool, the spark rate, and the crackle audio all read `level`, so the whole
hearth dims together. Once it has sat below `FIRE_LOW` (0.34) a patient random
grace (20–110 s), `wantsLog` goes up: it is fine for the fire to rest low a
while, and nothing nags. A fireside regular who carries the `tendsFire` trait
(Holger) gets first refusal, rising from the armchair to lay a log; otherwise
Nora reaches it on an idle roll (see characters.md). `addLog` sets the target to
full so the fire climbs over ~2 s, throws a burst of sparks, and plays
`fireCatch()`. `claimed` keeps the two tenders from both going. `__dev.fire(0.2)`
drops it near embers to watch the loop; the burn is independent of the clock, so
jumps neither snap nor replay it.

## Particles

- **Steam** (`type: 'steam'`): 1–2 px wisps with sinusoidal drift, rising from
  hot table cups (first ~45 s after serving), hot vessels at the pass, raised
  hot drinks mid-sip, and the espresso machine during pull/steam/kettle
  stages. Matcha whisking adds a sparser wisp above the chawan. Plates
  (pastries) and iced-matcha glasses never steam.
- **Sparks** (`type: 'spark'`): 1-px embers rising inside the firebox, scaled
  by the live burn — a blaze throws more and higher, embers only spit now and
  then, and a fresh log sends up a burst of a dozen as it catches.
- **Dust mote** (`type: 'mote'`): a single 2-px cream fleck with slow drift,
  spawned for the cat's daylight pounce ritual and removed with that beat.
- **Water drop** (`type: 'drop'`): tiny blue-grey pixels arc from Nora's
  watering-can spout during plant care and fall from a shaken umbrella.
- Spawned in `updateParticles` (sim), drawn in `SCENE.drawParticles`.

## Cat corner state

`world.catBowls = { food, water }` stores both visible levels from 0–1. Food
is consumed in 0.34 steps (roughly three meals), water in 0.2 steps (roughly
five drinks); the renderer quantizes those floats into glanceable kibble-pile
and water-highlight art. The values are ambience state, never UI or failure
meters. Nora restores a low bowl to 1 through her normal dt-driven idle loop.

## Captions (the narrator)

The quiet caption, bottom-left, that makes a glance feel like a story.
Long captions wrap; cream letters have a dark outline and subtle shadow for
contrast against the floor, with no backing rectangle.

- Pipeline: `caption(world, text)` → `captionQueue` (cap 2) → shown for 4.4 s
  with fade in/out → minimum 6 s gap between captions.
- Voice: warm, understated, present tense, no exclamation-mark enthusiasm
  (one "tak!" allowed). British-cozy rather than game-y.
- Current triggers: arrivals (rain-aware), orders (`withArticle` for correct
  a/an), Nora serving/tidying/clearing, seat choices ("sinks into the armchair
  by the fire", "curls up in the reading nook", "perches on the window
  seat"), window gazes (20% of them, weather/hour-aware: rain on the glass,
  streetlamps, the street drifting by), a passer-by slowing at the glass
  (18% of pauses), bookshelf moments (drifting
  over, picking a book out, slipping it back), page turns (12% of them),
  murmuring tables (15%), quiet laptop bouts (10%), cup returns, departures
  (rain/night-aware), shoes wiped on the doormat (28% of wet arrivals),
  umbrella shakes/collections, linked-pair arrivals,
  shared orders and seats, a regular settling into (or finding taken) their
  usual seat, a regular's weather- or recognition-aware arrival opener,
  falling asleep and finding the line again, cat
  movements and petting (including the cat's accidental piano plinks), Nora
  stretching/chalking/watering, her rare empty-night piano tune, a pianist
  settling at the bench / beginning a sparse burst, and the dusk/dawn
  candle ritual, weather changes, noon church bells, the evening kettle, lamp
  threshold moments, and occasional tip-jar coins. Cat-life
  lines cover the patient empty-bowl wait, Nora's refill/supervision, rain and
  streetlamp window watches, bookshelf survey, counter shoo, aborted ascent,
  Nora ignoring the top shelf, kneading, dust-mote battle, and gentle lap
  dislodging; every repeatable line remains probability-gated.
- The **regulars' own voices** ride those same seams. `regularLine` (in
  `sim-patrons.js`) sits at the window-gaze, page-turn, laptop-bout, and
  table-murmur seams: for a regular it may pull a bespoke line from that
  character's `lines` pool (`musing` at a solo beat, `overheard` at a shared
  table) and, when it does, it suppresses the generic caption so the words
  replace rather than double it. A solo musing has a 3.5% chance of surfacing a
  rarer `backstory` fragment instead — a life leaking out across many visits.
  Narrated fragments only, never quoted dialogue. Non-regulars are untouched;
  see characters.md for the pools and voice rules. While the street-house arc
  is unfinished, fair-daylight window gazes may instead follow the painter's
  brush; Gerda has three guarded painter musings of her own. They retire with
  the completed arc.
- **Regular continuity (Phase 3).** Two more seams carry a regular's continuity,
  driven by the persisted `bonds` count in the save (Nora's memory of them):
  `regularArrivalLine` chooses the **opener** — a wet-weather line, a
  recognition line for a face she already knows, or the plain arrival — and
  `specLine` supplies the once-per-visit **settle** line and the **usual-seat-
  taken** patient-look line, each falling back to a generic templated line.
  Every such line still stands alone. See characters.md (*Continuity*).
- **Story beats** use a second caption track, `captionScript` (fed by
  `captionRun`): the few deliberate lines a chosen beat plays queue in order,
  drain **ahead of** the ambient queue, and are never dropped by its 2-line cap
  — still paced by the same 6 s limiter so a beat reads as an unhurried run. Only
  the opt-in narrative beats use it (today Gerda's scarf, Lunafreya's two
  gallery unveilings, and the street painter's finished facade); ambient
  captions keep to `caption()`. The soft-narrative layer also adds one always-on
  visual: a **pending invitation** draws a persistent bubble (e.g. a yarn ball)
  over its owner or a brush at a fixed scene anchor via the ordinary bubble
  system — the only new standing UI it introduces. See
  [narrative.md](narrative.md), characters.md (Gerda's scarf and Lunafreya's
  gallery), and *The street* above (the painter).
- Matcha adds three limiter-paced lines: the whisk step may note the bamboo
  patter and pale-green foam (30%); the ice step may note ice singing against
  glass (25%); and only the first matcha sip of a visit checks for a slow,
  grassy-sweet sip line (20%). Nora's sixth chalk doodle, a bamboo whisk, may
  likewise be acknowledged when it appears beside the prices.
- When adding events, prefer **occasional** captions (probability-gated) —
  the narrator should feel like she only speaks when something is worth
  mentioning.

## Interaction surface (deliberately tiny)

- Click the cat → pet.
- Control bar: volume/mute, rain, fire-crackle audio, music, fullscreen.
- Keyboard: `m`, `f`.
- Everything else watches itself. New interactions must clear a high bar:
  silent-failure-proof, optional, and gentle (see overview.md).


## Motion refinements — 5 September 2026

The door leaf now narrows continuously around its left hinge as `door.open`
changes, keeping its window and handle attached. A small cached leaf canvas
is redrawn only when its sky/flash appearance changes and is blitted at an
integer width with nearest-neighbor sampling. Rain, window activity, fire,
candle flicker, bell motion and particles retain their existing quiet pacing.
Brewing steam and hot-drink steam retain fractional emission time instead of
throwing away the remainder on each emission. Steam from a raised mug starts
near the corrected cup rim. All of these remain simulation-clock driven.


Laptop tables place the drink nine pixels toward the front to keep it clear
of the keyboard. Table item rendering and hot-drink steam share
`SCENE.tableItemOffsetY`, including while the laptop is closed for departure.


## Occasional sailing ship

A two-masted wooden ship crosses the continuous lake in either direction at
2.6 master pixels per second. The first opportunity is after 6–12 running
minutes, then 12–24 minutes between opportunities; passage waits for fair
daylight (daylight > 0.4, rain < 0.35) and a free boat slot. At most one ship
and two boats total are present. Its position and timer use simulation dt,
including hidden tabs, and it is removed beyond the waterfront margins.
A single rate-limited caption announces its arrival: “a wooden sailing ship
glides across the lake, its sails full of afternoon light.”

Unhurried pedestrians without umbrellas pause in a visible pane for 6–11
seconds and wave once per passage, then continue walking. Up to two eligible
indoor guests can watch from the window floor spots; see characters.md. This
is ambient life, with no unlock, reward, saved event or required interaction.
Dev forcing: `__dev.ship({x: 210, dir: 1})`.
