# Architecture

Zero-dependency vanilla JS. Twenty IIFE scripts expose the production globals
(`SND`, `SCENE`, `CAST`, `MEMORY`, `SIM`) plus the optional dev harness, loaded
in dependency order by `index.html`:

```
js/audio.js             → window.SND     (sound engine; no DOM, no sim knowledge)
js/scene-core.js        → window.SCENE   (layout, palette, shared renderer helpers)
js/scene-waterfront.js  → extends SCENE  (continuous exterior, sky/light geometry, terrace art)
js/scene-bg.js          → extends SCENE  (background cache + dynamic wall layer)
js/scene-furniture.js   → extends SCENE  (depth-sorted furniture)
js/scene-people.js      → extends SCENE  (people, cat, bubbles, icons)
js/scene-fx.js          → extends SCENE  (lighting, particles, captions, composeFrame)
js/scene-home.js        → extends SCENE  (apartment and plant work stages)
js/scene-intro.js       → extends SCENE  (speech bubbles, handmade sign and porch)
js/characters-roster.js → window.CAST    (regulars roster + story arcs, pure data)
js/memory.js            → window.MEMORY  (persistent cross-visit save; versioned)
js/sim-core.js          → window.SIM     (world + shared simulation systems)
js/sim-waterfront.js    → extends SIM    (boat/bird/plane timers, terrace guests and Lunafreya journeys)
js/sim-patrons.js       → extends SIM    (patron state machine)
js/sim-shop.js          → extends SIM    (opening/closing lifecycle factory)
js/sim-characters.js    → extends SIM    (barista, cat, update + draw bridge)
js/sim-life.js          → extends SIM    (home, plant, presentation, saved lifecycle)
js/sim-intro.js         → extends SIM    (first-morning dialogue and opening finale)
js/dev.js               → window.__dev   (dev harness; inert unless ?dev/console)
js/main.js              → (none)         (boot, loop, UI; orchestrates the others)
```

The intro controller attaches dialogue gates and an eight-stage finale to the
existing twelve-step first-opening routine. Saved `life.intro` owns its line
cursor, finale/time and sign location; transient reveal, pause and hidden state
belong to the world. Main supplies visibility/input and the renderer draws
through `composeFrame`. This one-time sequence holds when hidden; the normal
simulation keeps its elapsed-time clock. No separate cutscene engine is used.

There are **no ES modules on purpose**: `file://` + `<script>` tags means the
app runs by double-clicking `index.html` with zero tooling. Keep it that way.

## Shop lifecycle contract

`js/sim-shop.js` loads before `sim-characters.js`. The latter constructs one
`SIM._.createShopLifecycle({busRoute, fireTendRoute, refillRoute, leavePerch})`
using its existing private character helpers. The factory closes over helpers,
never a world; state remains in `world.shop` and the existing world entities.
It returns three synchronous, world-bound methods:

- `beforeClock(world, dt)` applies the late-closing clock hold before `world.t`
  advances and `updateClock` runs. Narrative and activity timers still receive dt.
- `update(world, dt)` runs after waterfront and door updates, before spawning.
  It advances rituals and the overnight skip, returning whether it owns Lunafreya
  for this tick. Ordinary service runs only when it returns false.
- `route(world, kind, index)` preserves `SIM._.shopRoute` for the dev audit.

Shared layout, movement, clock, captions, fire, sound and terrace cleanup come
from `SIM._`; the character file retains ordinary service/cat updates and all
entity drawing. Cat walking to Lunafreya and pausing while carried keep their
original position after patron updates. Every entry selects the supplied
world's services with `bindWorld`, including direct route inspection. No save
fields, phase names, task timing, paths or render behavior changed in the preparatory split. The subsequent life milestone is described below.

## Shared life and plant contract

The shop factory remains the owner of closing and opening. Its `night` phase
hands off through `SIM._.enterHome`; `beforeClock` also holds the home clock.
`SIM.update` still advances real time/narrative, but delegates the home tick to
`updateHome` rather than spawning or running café characters there. Departure
returns the same entities to the original `dawn`/`entering` contract. An optional
`plantMorning` task is fixed for that opening round; without a purchase, the
original routes and task order are preserved.

Two new plain scripts extend the existing globals: `scene-home.js` (after
scene-fx) draws home and plant stages; `sim-life.js` (after sim-characters and
before dev/main) defines the home/job and persistence hooks. No second world,
renderer, simulation driver, library or framework is introduced.

`memory.life` (v7, migrated through v1–v6) contains `mode`, integer `savings`, `hour`,
`homeTime`, `daysCompleted`, `plant: {stage,time}`, `projects` (including `window`), `plannedTonight`, and a nullable lifecycle checkpoint containing
shop state and Lunafreya's position/path. Initial savings are 90 coins; the plant
price remains 30 coins; a completed ordinary pickup adds 1 coin. `SIM.plantProject` defines the original small plant. Stages are available → purchased → scheduled → carry
→ unpack → place → installed. Purchase and stage transitions flush immediately;
working checkpoints update in memory every tick and flush at most every ten
seconds, plus pagehide/hidden. Abrupt process death can lose the latest partial
seconds; completed committed stages cannot charge/install again. Boot adds no
offline time. Transient guests/orders are omitted on ritual restoration, and
ordinary open-café reloads seed only established furnished rooms. New cafés
restore an unfinished first greeting at the counter without another sale or visit.

`SIM.setMode(world, mode)`, `SIM.plan(world, open)`, `SIM.goToSleep(world)` and
`SIM.buyPlant(world)` are synchronous public actions. Sleep is accepted only
at home in game mode; it saves the shared morning transition immediately, so
repeated clicks cannot advance another day. Game mode holds at home independently
of planner openness, including after reload; idle departs automatically. Buying checks game mode, home, open planner,
availability and funds before changing both savings and job in one save.
Planner openness is presentation-only and is not restored as a blocking dialog.
Mode switching closes it when moving to idle and never changes world identity,
time, progress or ownership. Game mode exposes pending story invitations.

On supported desktop browsers, `main.js` acquires the origin's Web Lock
`cafe-hygge-life` before creating a production world. A second tab waits without
simulation or writes (including exit/hidden flushes); pagehide releases ownership
after the final save, and back/forward restores reacquire it. The waiting tab reloads the
latest memory before boot. Plain file/older-browser environments without Web
Locks retain single-view boot compatibility; concurrent writers there are not
supported. The `cafe-ready` event runs dev URL setup after asynchronous ownership
acquisition. Private worlds never acquire a browser lock.

## The world object

`SIM.create()` builds a single mutable `world` object; everything reads and
writes it. It is exposed as `window.__world` for console debugging. Key fields:

| Field | Meaning |
| --- | --- |
| `t` | simulation seconds since boot |
| `clockOffset` | wall-clock-only offset for the overnight skip and late-closing hold; never ages story or activity timers |
| `shop` | transient daily lifecycle, chore path/timer, curtain amounts, light switch, stock, admission gate, carried-cat/absence flags and fade |
| `hour` | in-world clock, 0–24 (day = 1440 real seconds, starts 08:24) |
| `pal` | current palette from `SCENE.dayPalette(hour)`: `{skyTop, skyBot, daylight, lamp}` |
| `rain` / `rainTarget` | current and target rain intensity 0–1 (lerped) |
| `door` | `{open: 0–1, target, jiggle}` — door swing + bell animation |
| `patrons[]` | live patron entities (see characters.md for the state machine) |
| `umbrellaStand[]` | visible parked umbrellas `{owner, color}`; owner links are audited and removed on collection |
| `regulars` / `sleeper` | per-id once-per-day arrival schedule for the roster (`CAST.regulars`, built by `buildRegulars`) and the single active dozing-patron reference |
| `waterfront` | Transient exterior: `boats/birds/planes`, spawn timers, and two tables with `owner/cup/dirty/cleaning`. Outdoor people stay in `patrons` and use `outside/exteriorX/terraceTable`; indoor coordinates stay at the door while their floor path is empty. |
| `queue[]` | patrons currently in the order line (index 0 = at the till) |
| `barista` | Lunafreya's entity |
| `cat` | the cat entity: core pose/path plus `surface`, `hopFrom/hopTo/hopT`, `hungerT`/`thirstT`, `gazeT/gazeFacing`, `lapPatron`, `sniffedPass`, and rare-event `counterT`/`ascentT`/`moteT` fields |
| `catBowls` | `{food, water}` levels (0–1); visible world state consumed by cat needs and restored by Lunafreya |
| `tables[]` | per-table `{x, y, tag, items[]}`; items are cups/plates and optional owner-linked laptops. The four dining tables come first, then the reading nook's two side tables (`small: true`), two tall window tables (`tall: true`), Nora's paint table (`artist: true`), and the piano lid (`piano: true`) |
| `seats[]` | all sittable spots `{x, y, facing, table, side, armchair, nook, taken}`; nook chairs point `table` at their side table. Window seats add perch geometry; the appended `artist: true` stool and `piano: true` bench each point at their dedicated service surface while preserving historical seeded indices |
| `counterCups[]` | finished orders waiting at the pass `{x, y, kind, owner}` |
| `particles[]` | steam wisps, fire sparks, and one-off dust motes |
| `brew` | `{active, stage}` — drives the espresso machine's light/stream drawing |
| `captionQueue[]` / `activeCaption` | ambient narration pipeline (soft cap 2) |
| `captionScript[]` | a story beat's caption run — drains ahead of `captionQueue`, never dropped by the cap (`captionRun`) |
| `memory` | the bound context store (production: `MEMORY.state`): `{version, lastSeen, arcs, bonds, flags, life}`. Set by `reconcileNarrative` at the end of `SIM.create` |
| `cat.scarf` | the scarf's hex once Gerda's arc completes (`cat-wore-scarf` flag), else `null`; read by `drawCat` |

## Frame flow (main.js)

```
advance(now), called by rAF / hidden interval / refocus:
  elapsed = min(90, seconds since previous call)
  repeat in steps dt <= 0.25 until elapsed is consumed:
    SIM.update(world, dt)      // clock → weather → outdoor life → door → shop → spawning → barista
                               // → patrons → cat → particles → captions
    SND.update(dt, world)      // rain/fire, music box + night pad + piano notes
requestAnimationFrame also calls render():  // all drawing targets the 960×600 master canvas
    SCENE.composeFrame(g, world)       // the whole frame, in one shared call:
      SCENE.drawScene(g, world)        //   blit static-background cache, then the
                                       //   incident floor light, then window/door/wall frame/
                                       //   lamps/flames/clock hands/candles
      drawables = SCENE.furnitureDrawables(world)  // tables, stools, wing chairs,
                   ++ SIM.entityDrawables(world)   // bookshelf, lamps, counter,
                                                   // plants + people, cat
      sort by baseline y, draw         //   painter's algorithm (see art.md)
      SCENE.drawParticles(g, world)
      SCENE.drawLighting(g, world)     //   multiply tint + additive glows + vignette
      bubbles, caption                 //   drawn after lighting so they stay legible
                                       //   (captions are thresholded to a bitmap
                                       //   once per text and blitted ×2 — see art.md)
    blit view rect of master → visible canvas   // see Rendering contracts
    // SCENE.composeFrame is the single source of the draw list: js/dev.js's
    // __dev.shot() calls it into an offscreen canvas for a headless PNG, so a
    // shot can never drift from what render() ships.
```

The **static-background cache** is an offscreen 960×600 canvas holding
everything wall-mounted that never changes (wall, floor, rugs, fireplace
masonry, menu, shelves, firewood). Day/night tinting happens in the lighting
pass, so the cache is render-once (call `SCENE.invalidateBG()` if a future
change makes it state-dependent). Per-frame static-background cost is one
`drawImage`; incident floor light and the dynamic wall layer follow it. Use
`tools/art-review.ps1 -Verify` for current warm composition timings (PNG export
and presentation are excluded), rather than relying on historical frame costs.

The sim runs on **one clock with many drivers**: `advance(now)` in main.js
ticks `SIM.update`/`SND.update` by the real elapsed time since the last tick,
chunked into ≤0.25 s steps. The rAF loop, a 250 ms `setInterval` (armed only
when `document.hidden`), and a refocus `visibilitychange` handler all call it,
so the café keeps real-time pace no matter how the browser throttles any one
driver (hidden-tab timers slow to ≥1 s, once a minute under Chrome's intensive
throttling; an occluded window can slow rAF without ever setting
`document.hidden`). A catch-up burst longer than ~2 s mutes its flood of
one-shots (the `__dev.ff` pattern). Catch-up is capped at 90 s per call: a
120 s gap advances 90 s and drops the remaining 30 s. It does not discard the
whole gap. This is a cap on an existing page's clock, not offline progress on
reload. See the [pre-development audit](predevelopment-audit.md) for coverage
needed before planner pauses and apartment time join this clock.

## Movement

`walker(entity, dt)` advances an entity along `entity.path` (array of
waypoints), sets `pose` (`walk`/`stand`), `facing`, and `heading` (`'down'`
/ `'up'` on mostly-vertical legs longer than 24 px — the renderer's
front/back-view switch, cleared on horizontal legs and on arrival), and
returns `true` on arrival. `makePath(e, tx, ty)` takes a direct line where clear,
otherwise finds the shortest visible-corner route around `L.footprints` and
`L.occluders`. Obstacles include low tables and reserve 18 px on each side
and 14 px in floor depth; seats reserve 22 px on each side and 24 px in depth
for knees and personal space, occupied or empty. Wing chairs reserve 48 px
in front (`frontClearance`) so a standing walker does not overlap the reader
in the projected view. Only a footprint marked `seat: true` can admit its
own sitter, and only on the first or final leg. A destination in an obstacle's
clearance margin relaxes its outside edges on that leg; the solid
plant, lamp, or table remains blocked. The central lane (`L.lane = 368`) remains
open, but short trips no longer have to return to it. Door arrivals and
departures use `L.entryApproach` to enter the open floor instead of squeezing
along the wall behind the fireside readers. Both approach legs are planned
against the same obstacles. On each new patron/cat path,
`walker` also removes clear detours from authored routes; shortcuts never
cross any furniture, including endpoint furniture.

Lunafreya's new paths are planned from her actual position to the chore's final
anchor; intermediate chore-template waypoints are not walked. Her graph uses
12 px side clearance to fit the service gaps between nook lamps and chairs.
It preserves the counter's front barrier and its left exit at
`L.baristaExitX = 616`, while opening her projected work corridor at y ≤ 286.
At service stops, nearby clearance margins can shrink to the anchor, keeping
solid chairs, plants and lamps blocked; the low table being serviced admits
her approach. These adjusted bounds also supply graph corners, so overlapping
personal-space margins cannot trap an approach. An unreachable destination
keeps its path pending and sets `walkBlocked`, rather than completing a chore
remotely. The audit checks Lunafreya's actual planned legs and flags blocked chores.
Her door-to-switch trip is direct, before joining the floor routes.

Cat walks use `catRoute`: safe pairs keep a
straight line, while only the declared colliding pairs thread through clear
approach waypoints. `hop` interpolates a parabolic arc between declared
surface anchors instead of using `walker`.

## Rendering contracts

- Everything renders to an offscreen **960×600 (16:10) master canvas**
  (`SCENE.W × SCENE.H`); the sim and all draw code live in master
  coordinates and never learn about crops or scale.
- The **viewport manager** in main.js cover-fits the window each
  resize/fullscreen/DPR change: it picks a view rect inside the overscan
  budgets (visible width 936–960 via `SCENE.VIEW_MIN_W`, height 540–600; the
  designed 16:9 crop is rows 36–576, `SCENE.VIEW_Y`/`VIEW_H`), computes the
  scale in *device* pixels (CSS px × devicePixelRatio — so Windows display
  scaling still lands on clean integers; 1920×1080 and 1920×1200 fullscreen
  are both an exact ×2), and blits that rect to the visible canvas. Integer
  scales present with `image-rendering: pixelated`; fractional scales use
  sharp-bilinear (nearest-neighbour upscale to the next integer on the
  backing canvas, then a smooth CSS downscale) so windows fill edge-to-edge
  without uneven-pixel shimmer. Aspects outside the overscan budget get a
  minimal letterbox on one axis. Canvas clicks map back through the view rect.
- `SCENE.L` is the single source of truth for positions. Sim logic must
  reference it, never duplicate coordinates.
- `scene-core.js` creates `SCENE` and its private `SCENE._` renderer contract;
  each scene sibling reads that contract and adds public draw functions to the
  same global. Keep shared primitives in core so scene siblings never depend on
  one another. Load all five scene scripts in the documented order.
- Drawables are `{y, draw(g)}` objects; the baseline `y` is the entity's feet.
  Tie-breaking relies on stable sort + push order (furniture before entities).
- Anything that must stay readable at night (bubbles, captions) draws **after**
  `drawLighting`.

## Audio contracts

- `SND.init()` may only be called from a user gesture (the overlay button).
- Every public sound function is wrapped in `guard()` — safe to call before
  init or while muted (it no-ops).
- Buses: `master → compressor → destination`, with `sfx`, `amb` (rain),
  `fireBus`, `musicBus` feeding master. Separate sfx/music feedback-delay
  returns feed their channel faders, so echoes respect the mix.
  See [sounds.md](sounds.md).
- Settings live in `SND.settings`, persisted to localStorage key
  `cafe-hygge-audio` by `SND.save()`.

## Narrative layer (MEMORY + arcs)

The soft-narrative loop (design contract: [narrative.md](narrative.md)) is
almost pure **data + state** riding existing primitives — the caption pipeline,
the bubble system, and the one click handler.

- **`MEMORY` (`js/memory.js`)** owns the save `cafe-hygge-save`:
  `{version, lastSeen, arcs, bonds, flags, life}`. `MEMORY.codec` is the pure
  decode/validate/migrate/encode boundary; only plain records and supported
  integer versions reach the simulation. The schema is v7; the v1/v2 migrations retain story history and apartment/plant progress. Each migration
  must explicitly advance one version; no missing step is skipped.
  `MEMORY.createStore(options)` separates state and serialization from injected
  storage, clock, debounce and persistence-request dependencies. Its default is
  private memory without browser effects; `MEMORY` delegates to the browser
  adapter. `saveNow()` flushes on `pagehide`/hidden; `status` exposes nonfatal
  errors, including rejected persistence promises. Invalid/unsupported development
  saves can be replaced with a fresh café under the owner's current direction.
  Bump `MEMORY.VERSION` **and** add a migration step when the shape changes.
- **Arc definitions** are pure data in `CAST.arcs` (an `owner` or a fixed
  `anchor`, `rows` café-day threshold — one number or one per `stages` —
  `glyph`, `beat`, `flag`, plus behavior fields). Multi-stage `beat`/`flag`
  values may be arrays with one caption run / lasting key per stage; `arcBeat`
  and `arcFlag` select the active row. Arc *state* lives in the save
  under `arcs[id]` as `{stage, progress, pendingBeat}`; progress accrues in
  `updateNarrative` (dt-driven, one row per 24-minute café day of running café).
- **`updateNarrative(world, dt)`** (in `SIM.update`) drips `dt / DAY_SECONDS`
  café days into every active arc via `advanceArcs` — **the only growth path**
  (`__dev.age` feeds the same function whole days) — and sets `pendingBeat`
  when progress crosses the stage's `rows`. Saves are quantized to the café
  hour plus every readied beat; the accumulator is `world.narrSaveT`.
- **`reconcileNarrative(world)`** (end of `SIM.create`) binds `world.memory`,
  clamps drift against the current definitions, raises any invitation a
  threshold-touching save is owed, re-applies completed marks (the cat's
  scarf), then invokes the context store (production stamps + saves). It adds no elapsed time — a closed café holds
  still.
- **The invitation** is a persistent bubble over a pending arc's seated owner
  (`pendingInvites` → `entityDrawables`), or at a café-owned arc's fixed
  `anchor` (`anchoredInvites`); it takes the owner's bubble slot and never
  expires. **The trigger** is `SIM.beatAt(world, x, y)`, which main.js's
  click handler calls before `petCat`; a hit plays the beat (`captionRun` + a
  heart + the flag + a bond bump for owned arcs) and advances the arc's `stage`.

The audit (`__dev.audit()`) guards the whole thing: arc definitions resolve,
the loaded save matches `version`, no stage/progress exceeds its arc, and no
completion flag is set without its beat having played.

## UI

One overlay (start gate for audio), one auto-fading control bar (presentation,
evening plan when available, mute, volume, settings, fullscreen), keyboard `m`
(mute) and `f` (fullscreen), and one
canvas click handler: a waiting story invitation takes the tap first
(`SIM.beatAt`), otherwise it pets the cat.

The native settings dialog contains five volume sliders, mute, a weather switch, sound defaults
and a separate start-over confirmation. Opening it leaves the simulation running.
Focus stays in the dialog and returns to its opener on close. Escape first
cancels an open reset confirmation, then closes settings; shortcuts ignore
dialogs, editable fields and modifier keys. The evening planner remains separate.

Confirmed reset calls `MEMORY.reset()`, checks storage errors, then stops
simulation advancement and marks persistence read-only before navigating to
the entry screen without scenario query parameters. This prevents pending
timers and unload saves from resurrecting the old world. A failed deletion
restores the old in-memory save and reports the failure in the dialog. Audio
preferences and unrelated localStorage keys are retained.

## Dev harness (js/dev.js)

`?morning` starts at 07:30 with an empty, closed room and Lunafreya entering with
the cat for the real opening sequence. `?night` starts at 21:30 with the
boot's guests present for closing. Both dismiss the start overlay like `?dev`
(audio still needs a click). These scenario flags override `?hour`; if both
are present, morning wins. They prepare transient world state, without aging
stories or changing saved invitations.

Agent/debug tooling behind `window.__dev` — **inert in normal use** and never
user-visible. It activates only via URL params (`?dev` boots past the start
overlay with audio still uninitialized; `?hour=20` starts the clock at 20:00;
`?overlay` turns the layout overlay on from frame one; `?audit` runs the sweep
after load and exposes its count/details as document-element data attributes;
`?arc=id&stage=n&progress=n&ready` boots an exact saved arc state for screenshots)
or console calls:

| Call | Does |
| --- | --- |
| `__dev.hour(h)` | jump the in-world clock (no arg: read it) |
| `__dev.study({hour, rain, seats})` | detached, fixed art world; optional seat-index array (up to seven, empty array for empty furniture). Clones existing layout, clears live activity, poses readers; never tick or bind it as `__world` |
| `__dev.review(opts)` / `__dev.poses()` | ten PNG data URLs for a fixed day/night scene, empty scene, six detail crops and character turnarounds / just the roster turnarounds |
| `__dev.ff(seconds)` | fast-forward the sim in 0.25 s ticks (`SND.update` skipped, one-shots muted) |
| `__dev.spawn(opts)` | a real patron through the front-door flow with chosen traits (`wantsBook`, `ownBook`, `chatty`, `drink`, `name`, `umbrella`, `laptop`, `pianist`); `couple: true` returns a linked pair |
| `__dev.regular(id)` / `__dev.doze()` | force a named regular's next arrival (`'holger'`, `'gerda'`, `'lunafreya'`, `'kasper'`, `'freya'`; defaults to `'holger'`) / put the first eligible seated reader to sleep |
| `__dev.piano(on)` | force or stop the dt-driven corner-piano sound engine |
| `__dev.send(name, x, y)` | path an entity through the real `makePath` (works while its state runs the walker; the cat is forced to walk) |
| `__dev.noraDo(action)` | wake Lunafreya's idle picker and force `stretch`, `chalk`, `water`, `candles`, or `piano`; candle forcing clears the current flames so the full round is visible |
| `__dev.catDo(action)` | reset the cat to a safe floor spot and force `eat`, `window`, `bookshelf`, `counter`, `topShelf`, `piano`, `lap`, `mote`, or `knead` on the next tick |
| `__dev.bowls(food, water)` | clamp and set both bowl levels (one argument sets both), then wake Lunafreya's idle picker |
| `__dev.overlay(on?)` | toggle the layout overlay: crop + content-safe bounds, lane, every `L` anchor, seats free/taken, queue/wait/bus/browse spots, occluder boxes, footprint boxes |
| `__dev.shot(target?, {scale}?)` | headless render → PNG data URL via `SCENE.composeFrame` (same draw list `render()` ships), independent of the rAF loop / tab visibility / preview pane. `target`: a named region from `__dev.regions` (`fireside`, `nook`, `counter`, `window0`, `window1`, `door`, `hearth`, `bookshelf`, `piano`, `artist`, all derived from `SCENE.L`), an entity name (`nora`, `cat`, a patron by name/regularId), a `{x,y,w,h,scale}` crop, or nothing for the whole 960×600 scene. Nearest-neighbour integer upscale |
| `__dev.audit()` | invariant sweep; warns and returns violations (bounds, whole pixels, walk targets vs. `L.occluders`, journeys vs. `L.footprints` — umbrella, Lunafreya and cat routes included — seat↔table wiring, anchors, barista y=286 / lane 368, plus live-world checks for seats, pairs, umbrellas, sleeper, queue, props, bowls/candles, and spawn cap) |

Three contracts support it: `SIM._` (the private seam shared by the sim
siblings and consumed by dev.js; other app code must not touch it — includes
`busRoute`, `refillRoute`, `waterRoute`, `candleRoute`, `pianoRoute`, and `catRoute`, the path builders the audit
re-checks), `SCENE.L.occluders`
(declared boxes that fully hide characters) and `SCENE.L.footprints`
(furniture floor boxes; `passable: true` marks torso-height tables walkers
may pass behind/in front of but never stand in) — both box lists are shared
by the overlay and the audit. The harness wraps
`SIM.create` (to apply `?hour`) and `SCENE.drawCaption` (to draw the overlay
after everything else); it never changes behavior when dormant.

`__dev.shot(target, {world: fixture})` can render a detached study through the
same `composeFrame` as the live café; omitting `world` keeps the live-shot API.
`__dev.audit(fixture)` optionally checks that study's seat ownership and layout.
Studies are render fixtures, not resumable simulation saves. Their cloning uses
the browser's `structuredClone` only on explicit dev calls, including worlds
with circular partner/lap links. No new runtime script or package is required.

The optional `tools/art-review.ps1` opens a disposable agent-browser session,
waits for the harness, saves PNGs and audit JSON under ignored `.art-review/`,
and closes the session. `-Verify` runs `tools/verify-art.js`: deterministic
images, capture side effects, all seat groups at day/night, and warm frame
composition timings. Commands and limits: [art-workflow.md](art-workflow.md).

The rear coffee cabinet and animated espresso machine share a depth-sorted
furniture drawable (`SCENE.drawCoffeeStation`, defined in scene-bg.js and
registered by scene-furniture.js), behind Lunafreya and the serving counter.

## Isolated simulation worlds

`SIM.create()` keeps the production browser services. `SIM.create({})` opts into
private memory, seeded randomness and silent sound; `memory`, `random` and
`sound` options inject explicit services. See [development.md](development.md#save-and-private-world-contracts).
Each world owns its narrative save timer; its context owns patron IDs and the
random stream. World-first exported helpers and `SIM.update` select a synchronous
service scope with `finally` restoration, without replacing global randomness
or audio. Internal helper calls inherit that scope. New world-first exports
must use `SIM._.bindWorld` when they consume random/audio services.
`SIM.dislodgeCat(world, patron)` no longer looks up `window.__world`.
Context services are non-enumerable so detached art clones remain render data.


## Interruptible project contract

`SIM.projects` defines the two prices, destinations, carry delivery and ordered
18-second work phases. `SIM.buyProject(world, id)` accepts one affordable choice
per home evening (shared with the plant). Savings and `plannedTonight` change
with the purchase in one immediate save. The flag resets only on entering the
next home evening. Unfinished work stays in a two-job queue; laid-out work
precedes another kit. No purchase occurs autonomously.

Each v3 `life.projects[id]` record is `{stage, step, time}`. Stages are
available → purchased → scheduled → arrived → working → installed. Morning
schedules the purchase; Lunafreya collects the single kit after opening. An arrived
kit is owned at its reserved site; a reload places it there rather than replaying
its transport. Work advances only while Lunafreya is at `L.projects[id].work`.
Every three-second fastening/stroke is a safe interruption and immediate save;
a visit lasts at most nine seconds before she returns for an 18-second break.
Orders and closing finish the current hand action; a carried kit is deposited
at its reserved site first. All walking uses the existing obstacle planner.

`updateProject` owns only `projectOut`, `projectWork` and `projectHome`; normal
service and care retain the existing barista states. Closing waits until she
returns. Open reloads resume the saved job from the ordinary counter boot;
closing checkpoints normalize a transient worker to the counter, preserving
partial work without stale tool/path ownership. No offline work is credited.
`installProjects` derives one appended table and two appended seats from the
installed flag, preserving historical seat/table indices. Repeated calls and
reloads cannot append duplicates. Art never installs anything.

`SCENE.hearthWork` shares the cleaning state across flame, glow, sparks, audio
and fire tending. Scheduled/arrived/working means a cold hearth; completion
allows the existing fire routine again. Other furnishings and stories remain.
The audit checks work anchors and table/seat equivalence. Its route check allows
exiting a service seat's clearance margin only when the solid furniture stays
clear, matching the path planner.

### Saved first opening and furniture

Version 4 adds `life.furniture` (stable availability keys) and
`life.firstOpening: {step, time}`. Fresh saves start empty with step zero; v3
migration marks the existing room furnished and setup complete. `settling` is
a resumable shop checkpoint. `sim-life.js` commits setup progress and furniture
together. `SCENE.activeGeometry` and layout keys rebuild private-world navigation
and background caches when availability changes. Tables and seats are installed
before ordinary simulation starts; optional routines share the same flags.

Version 5 adds `life.room` (`small` or `full`) independently of furniture.
Version 4 saves migrate according to their existing counter variant; earlier
furnished saves retain full size. `SCENE.room` supplies the navigation bounds,
while `SCENE.presentation` keeps the apartment full-size. Main refits on a room
change. Captions and default dev shots follow the active room extent.

## Conversation moments

`CAST.holgerIntroduction` owns the authored lines and branches. The attended
moment helpers at the end of `sim-intro.js` expose `startHolger`, `momentLine`,
`advanceMoment` and `leaveMoment`, alongside the generic `beginMoment` used by
existing arc payoffs. `SIM.update` holds obligation state while a moment is
active; main presents the camera crop and keyboard-accessible DOM choices.
The shared scene renderer suppresses transient speech/order bubbles and draws
standing idle poses during moments without changing saved actor positions.
The full-scene `__dev.shot()` remains uncropped; use a browser screenshot to
capture the presentation camera and dialogue together.

### Bubble presentation and rendezvous

Moment phases are `approach`, `talk`, `return`. Only the selected staff walk
runs during travel; the normal simulation remains held. A snapshot of the
interrupted staff position/path/pose is restored after a real return journey.
Targets derive from the existing table service route or nearby clear points;
all walks go through `makePath`/`walker` in the correct world context. Failed
approach planning does not consume an invitation.

`SIM.updateMoment` uses the intro's shared `SIM.revealDialogue` timing and voice
cadence. `SCENE.dialogueLayout` and `SCENE.drawIntroDialogue` render both the
first morning and conversations: same font, border, fill and stepped tail, with
extra rows for choices. `main.js` maps those exact canvas rectangles through
the presentation camera into transparent native button hit areas. There is no
separate HTML dialogue design. A sentence-level transcript supports screen
readers. Full-scene shots include the actual dialogue and choice bubble;
browser captures also show the camera crop and the put-aside control.


## First-day admission, repair and required greeting

`spawnCap`, `arrivalRoom` and `arrivalGap` in sim-core share one admission budget
between walk-ins and regulars. The budget includes pending seat demand and dirty
seats; familiarity derives from saved completed café days, never real-world age.
The one-time setup finale commits 17:30 with its completed step, so reload never
replays the afternoon jump. `enterHome` increments `daysCompleted` only once.

`SIM.canPlanProject` is shared by purchase validation and planner button state.
Window and table can be chosen together; every debit and purchase is committed
once. `updateWindowWorker` owns a transient, world-bound actor separate from
patrons and staff. Its durable phase/step/time is `life.projects.window`;
Lunafreya’s pending-work selector excludes contractor jobs. Work checkpoints
flush every three seconds and at phase transitions. On open-café reload, partial
hand work resumes at the work anchor; a saved arrival restarts its doorway route.
Closing preserves work and sends the actor out. `SCENE.windowOpen` is the shared
left/right view predicate for glass, sunlight and ship-watching eligibility.

`SIM.holgerRequired` identifies an unfinished introduction in the modest café.
At the counter, SIM.update holds service, arrivals and café time while breathing,
particles, captions and the invitation animation continue. Both modes expose the
same accessible invitation. Its two-second opacity cycle stops after the saved
`holger-invitation-opened` flag is set; reduced-motion users see a steady icon.
Completing the existing dialogue sets `holger-introduced` and releases service.
Putting it aside retains the counter hold and exact acknowledged choices.
