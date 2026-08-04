# Architecture

Zero-dependency vanilla JS. Eleven IIFE scripts expose three production globals
plus the optional dev harness, loaded in dependency order by `index.html`:

```
js/audio.js             → window.SND     (sound engine; no DOM, no sim knowledge)
js/scene-core.js        → window.SCENE   (layout, palette, shared renderer helpers)
js/scene-bg.js          → extends SCENE  (background cache + dynamic wall layer)
js/scene-furniture.js   → extends SCENE  (depth-sorted furniture)
js/scene-people.js      → extends SCENE  (people, cat, bubbles, icons)
js/scene-fx.js          → extends SCENE  (lighting, particles, captions)
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
| `regular` / `sleeper` | Holger's once-per-day schedule and the single active dozing-patron reference |
| `queue[]` | patrons currently in the order line (index 0 = at the till) |
| `barista` | Nora's entity |
| `cat` | the cat entity: core pose/path plus `surface`, `hopFrom/hopTo/hopT`, `hungerT`/`thirstT`, `gazeT/gazeFacing`, `lapPatron`, `sniffedPass`, and rare-event `counterT`/`ascentT`/`moteT` fields |
| `catBowls` | `{food, water}` levels (0–1); visible world state consumed by cat needs and restored by Nora |
| `tables[]` | per-table `{x, y, tag, items[]}`; items are cups/plates and optional owner-linked laptops. The four dining tables come first, then the reading nook's two side tables (`small: true`), the two tall window tables (`tall: true`), and the piano lid (`piano: true`, its single saucer and bus surface) |
| `seats[]` | all sittable spots `{x, y, facing, table, side, armchair, nook, taken}`; nook chairs point `table` at their side table. Window seats add `window: true` and perch geometry; the final appended seat is the `piano: true` bench, preserving seeded seat indices |
| `counterCups[]` | finished orders waiting at the pass `{x, y, kind, owner}` |
| `particles[]` | steam wisps, fire sparks, and one-off dust motes |
| `brew` | `{active, stage}` — drives the espresso machine's light/stream drawing |
| `captionQueue[]` / `activeCaption` | narration pipeline |

## Frame flow (main.js)

```
requestAnimationFrame:
  dt = clamp(elapsed, 0, 0.1)
  SIM.update(world, dt)        // clock → weather → door → spawning → barista
                               // → patrons → cat → particles → captions
  SND.update(dt, world)        // rain/fire, music box + night pad + piano notes
  render():                    // all drawing targets the 960×600 master canvas
    SCENE.drawScene(g, world)          // blit static-background cache, then the
                                       // dynamic layer: window/door/wall frame/
                                       // lamps/flames/clock hands/candles/machine
    drawables = SCENE.furnitureDrawables(world)  // tables, stools, wing chairs,
                 ++ SIM.entityDrawables(world)   // bookshelf, lamps, counter,
                                                 // plants + people, cat
    sort by baseline y, draw           // painter's algorithm (see art.md)
    SCENE.drawParticles(g, world)
    SCENE.drawLighting(g, world)       // multiply tint + additive glows + vignette
    bubbles, caption                   // drawn after lighting so they stay legible
                                       // (captions are thresholded to a bitmap
                                       // once per text and blitted ×2 — see art.md)
    blit view rect of master → visible canvas   // see Rendering contracts
```

The **static-background cache** is an offscreen 960×600 canvas holding
everything wall-mounted that never changes (wall, floor, rugs, fireplace
masonry, menu, shelves, firewood). Day/night tinting happens in the lighting
pass, so the cache is render-once (call `SCENE.invalidateBG()` if a future
change makes it state-dependent). Per-frame background cost is one
`drawImage` — measured draw+present is ≈0.1 ms/frame at ×2 presentation.

A 250 ms `setInterval` runs `SIM.update`/`SND.update` (dt = 0.25) **only when
`document.hidden`** — the café keeps living and sounding when the tab is
hidden; rAF resumes seamlessly on return.

## Movement

`walker(entity, dt)` advances an entity along `entity.path` (array of
waypoints), sets `pose` (`walk`/`stand`) and `facing`, returns `true` on
arrival. `makePath(e, tx, ty)` builds L-shaped routes via the walking lane
(`L.lane = 368`): vertical to lane → horizontal → vertical to target. The
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

## UI

One overlay (start gate for audio), one auto-fading control bar (volume, rain,
fire, music, fullscreen), keyboard `m` (mute) and `f` (fullscreen), and a
canvas click handler whose only job is petting the cat. Resist adding more UI.

## Dev harness (js/dev.js)

Agent/debug tooling behind `window.__dev` — **inert in normal use** and never
user-visible. It activates only via URL params (`?dev` boots past the start
overlay with audio still uninitialized; `?hour=20` starts the clock at 20:00;
`?overlay` turns the layout overlay on from frame one; `?audit` runs the sweep
after load and exposes its count/details as document-element data attributes)
or console calls:

| Call | Does |
| --- | --- |
| `__dev.hour(h)` | jump the in-world clock (no arg: read it) |
| `__dev.ff(seconds)` | fast-forward the sim in 0.25 s ticks (`SND.update` skipped, one-shots muted) |
| `__dev.spawn(opts)` | a real patron through the front-door flow with chosen traits (`wantsBook`, `ownBook`, `chatty`, `drink`, `name`, `umbrella`, `laptop`, `pianist`); `couple: true` returns a linked pair |
| `__dev.regular()` / `__dev.doze()` | force Holger's next arrival / put the first eligible seated reader to sleep |
| `__dev.piano(on)` | force or stop the dt-driven corner-piano sound engine |
| `__dev.send(name, x, y)` | path an entity through the real `makePath` (works while its state runs the walker; the cat is forced to walk) |
| `__dev.noraDo(action)` | wake Nora's idle picker and force `stretch`, `chalk`, `water`, `candles`, or `piano`; candle forcing clears the current flames so the full round is visible |
| `__dev.catDo(action)` | reset the cat to a safe floor spot and force `eat`, `window`, `bookshelf`, `counter`, `topShelf`, `piano`, `lap`, `mote`, or `knead` on the next tick |
| `__dev.bowls(food, water)` | clamp and set both bowl levels (one argument sets both), then wake Nora's idle picker |
| `__dev.overlay(on?)` | toggle the layout overlay: crop + content-safe bounds, lane, every `L` anchor, seats free/taken, queue/wait/bus/browse spots, occluder boxes, footprint boxes |
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
