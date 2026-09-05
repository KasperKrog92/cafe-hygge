# Architecture

Zero-dependency vanilla JS. Thirteen IIFE scripts expose the production globals
(`SND`, `SCENE`, `CAST`, `MEMORY`, `SIM`) plus the optional dev harness, loaded
in dependency order by `index.html`:

```
js/audio.js             → window.SND     (sound engine; no DOM, no sim knowledge)
js/scene-core.js        → window.SCENE   (layout, palette, shared renderer helpers)
js/scene-bg.js          → extends SCENE  (background cache + dynamic wall layer)
js/scene-furniture.js   → extends SCENE  (depth-sorted furniture)
js/scene-people.js      → extends SCENE  (people, cat, bubbles, icons)
js/scene-fx.js          → extends SCENE  (lighting, particles, captions, composeFrame)
js/characters-roster.js → window.CAST    (regulars roster + story arcs, pure data)
js/memory.js            → window.MEMORY  (persistent cross-visit save; versioned)
js/sim-core.js          → window.SIM     (world + shared simulation systems)
js/sim-patrons.js       → extends SIM    (patron state machine)
js/sim-characters.js    → extends SIM    (barista, cat, update + draw bridge)
js/dev.js               → window.__dev   (dev harness; inert unless ?dev/console)
js/main.js              → (none)         (boot, loop, UI; orchestrates the others)
```

There are **no ES modules on purpose**: `file://` + `<script>` tags means the
app runs by double-clicking `index.html` with zero tooling. Keep it that way.

## The world object

`SIM.create()` builds a single mutable `world` object; everything reads and
writes it. It is exposed as `window.__world` for console debugging. Key fields:

| Field | Meaning |
| --- | --- |
| `t` | simulation seconds since boot |
| `hour` | in-world clock, 0–24 (day = 1440 real seconds, starts 08:24) |
| `pal` | current palette from `SCENE.dayPalette(hour)`: `{skyTop, skyBot, daylight, lamp}` |
| `rain` / `rainTarget` | current and target rain intensity 0–1 (lerped) |
| `door` | `{open: 0–1, target, jiggle}` — door swing + bell animation |
| `patrons[]` | live patron entities (see characters.md for the state machine) |
| `umbrellaStand[]` | visible parked umbrellas `{owner, color}`; owner links are audited and removed on collection |
| `regulars` / `sleeper` | per-id once-per-day arrival schedule for the roster (`CAST.regulars`, built by `buildRegulars`) and the single active dozing-patron reference |
| `queue[]` | patrons currently in the order line (index 0 = at the till) |
| `barista` | Nora's entity |
| `cat` | the cat entity: core pose/path plus `surface`, `hopFrom/hopTo/hopT`, `hungerT`/`thirstT`, `gazeT/gazeFacing`, `lapPatron`, `sniffedPass`, and rare-event `counterT`/`ascentT`/`moteT` fields |
| `catBowls` | `{food, water}` levels (0–1); visible world state consumed by cat needs and restored by Nora |
| `tables[]` | per-table `{x, y, tag, items[]}`; items are cups/plates and optional owner-linked laptops. The four dining tables come first, then the reading nook's two side tables (`small: true`), two tall window tables (`tall: true`), Lunafreya's paint table (`artist: true`), and the piano lid (`piano: true`) |
| `seats[]` | all sittable spots `{x, y, facing, table, side, armchair, nook, taken}`; nook chairs point `table` at their side table. Window seats add perch geometry; the appended `artist: true` stool and `piano: true` bench each point at their dedicated service surface while preserving historical seeded indices |
| `counterCups[]` | finished orders waiting at the pass `{x, y, kind, owner}` |
| `particles[]` | steam wisps, fire sparks, and one-off dust motes |
| `brew` | `{active, stage}` — drives the espresso machine's light/stream drawing |
| `captionQueue[]` / `activeCaption` | ambient narration pipeline (soft cap 2) |
| `captionScript[]` | a story beat's caption run — drains ahead of `captionQueue`, never dropped by the cap (`captionRun`) |
| `memory` | the bound `MEMORY.state` save: `{version, lastSeen, arcs, bonds, flags}`. Set by `reconcileNarrative` at the end of `SIM.create` |
| `cat.scarf` | the scarf's hex once Gerda's arc completes (`cat-wore-scarf` flag), else `null`; read by `drawCat` |

## Frame flow (main.js)

```
requestAnimationFrame:
  dt = clamp(elapsed, 0, 0.1)
  SIM.update(world, dt)        // clock → weather → door → spawning → barista
                               // → patrons → cat → particles → captions
  SND.update(dt, world)        // rain/fire, music box + night pad + piano notes
  render():                    // all drawing targets the 960×600 master canvas
    SCENE.composeFrame(g, world)       // the whole frame, in one shared call:
      SCENE.drawScene(g, world)        //   blit static-background cache, then the
                                       //   incident floor light, then window/door/wall frame/
                                       //   lamps/flames/clock hands/candles/machine
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
one-shots (the `__dev.ff` pattern); a gap past 90 s (a frozen tab, a sleeping
laptop) is dropped — that café simply held still, which the narrative allows.

## Movement

`walker(entity, dt)` advances an entity along `entity.path` (array of
waypoints), sets `pose` (`walk`/`stand`), `facing`, and `heading` (`'down'`
/ `'up'` on mostly-vertical legs longer than 24 px — the renderer's
front/back-view switch, cleared on horizontal legs and on arrival), and
returns `true` on arrival. `makePath(e, tx, ty)` takes a direct line where clear,
otherwise finds the shortest visible-corner route around `L.footprints` and
`L.occluders`. Obstacles include low tables and have 10 px shoulder clearance
and 2 px floor clearance. Only a footprint marked `seat: true` can admit its
own sitter, and only on the first or final leg. A destination in an obstacle's
clearance margin relaxes just the nearest outside edge on that leg; the solid
plant, lamp, or table remains blocked. The central lane (`L.lane = 368`) remains
open, but short trips no longer have to return to it. On each new path,
`walker` also removes clear detours from authored routes; shortcuts never
cross any furniture, including endpoint furniture. The
barista has hand-built paths behind the counter (y = 286) and exits through
the gap at `L.baristaExitX = 616`. Cat walks use `catRoute`: safe pairs keep a
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
  `fireBus`, `musicBus` feeding master, plus a feedback-delay "room" send.
  See [sounds.md](sounds.md).
- Settings live in `SND.settings`, persisted to localStorage key
  `cafe-hygge-audio` by `SND.save()`.

## Narrative layer (MEMORY + arcs)

The soft-narrative loop (design contract: [narrative.md](narrative.md)) is
almost pure **data + state** riding existing primitives — the caption pipeline,
the bubble system, and the one click handler.

- **`MEMORY` (`js/memory.js`)** owns the save `cafe-hygge-save`:
  `{version, lastSeen, arcs, bonds, flags}`. `MEMORY.load()` parses + migrates +
  back-fills; a bad/missing/wrong-version save falls back to a **fresh café**.
  `MEMORY.save()` is a debounced write (flushed on `pagehide`/hidden);
  `MEMORY.reset()`, `MEMORY.stamp()`, and `MEMORY.requestPersist()` round it out.
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
  hour plus every readied beat.
- **`reconcileNarrative(world)`** (end of `SIM.create`) binds `world.memory`,
  clamps drift against the current definitions, raises any invitation a
  threshold-touching save is owed, re-applies completed marks (the cat's
  scarf), then stamps + saves. It adds no elapsed time — a closed café holds
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

One overlay (start gate for audio), one auto-fading control bar (volume, rain,
fire, music, fullscreen), keyboard `m` (mute) and `f` (fullscreen), and one
canvas click handler: a waiting story invitation takes the tap first
(`SIM.beatAt`), otherwise it pets the cat. Resist adding more UI.

## Dev harness (js/dev.js)

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
| `__dev.noraDo(action)` | wake Nora's idle picker and force `stretch`, `chalk`, `water`, `candles`, or `piano`; candle forcing clears the current flames so the full round is visible |
| `__dev.catDo(action)` | reset the cat to a safe floor spot and force `eat`, `window`, `bookshelf`, `counter`, `topShelf`, `piano`, `lap`, `mote`, or `knead` on the next tick |
| `__dev.bowls(food, water)` | clamp and set both bowl levels (one argument sets both), then wake Nora's idle picker |
| `__dev.overlay(on?)` | toggle the layout overlay: crop + content-safe bounds, lane, every `L` anchor, seats free/taken, queue/wait/bus/browse spots, occluder boxes, footprint boxes |
| `__dev.shot(target?, {scale}?)` | headless render → PNG data URL via `SCENE.composeFrame` (same draw list `render()` ships), independent of the rAF loop / tab visibility / preview pane. `target`: a named region from `__dev.regions` (`fireside`, `nook`, `counter`, `window0`, `window1`, `door`, `hearth`, `bookshelf`, `piano`, `artist`, all derived from `SCENE.L`), an entity name (`nora`, `cat`, a patron by name/regularId), a `{x,y,w,h,scale}` crop, or nothing for the whole 960×600 scene. Nearest-neighbour integer upscale |
| `__dev.audit()` | invariant sweep; warns and returns violations (bounds, whole pixels, walk targets vs. `L.occluders`, journeys vs. `L.footprints` — umbrella, Nora and cat routes included — seat↔table wiring, anchors, barista y=286 / lane 368, plus live-world checks for seats, pairs, umbrellas, sleeper, queue, props, bowls/candles, and spawn cap) |

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
