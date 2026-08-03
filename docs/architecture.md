# Architecture

Zero-dependency vanilla JS. Four files, each an IIFE exposing one global,
loaded in dependency order by `index.html`:

```
js/audio.js   → window.SND     (sound engine; no DOM, no sim knowledge)
js/scene.js   → window.SCENE   (rendering + layout constants; no sim knowledge)
js/sim.js     → window.SIM     (behavior; reads SCENE.L, calls SND.*)
js/main.js    → (none)         (boot, loop, UI; orchestrates the other three)
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
| `queue[]` | patrons currently in the order line (index 0 = at the till) |
| `barista` | Nora's entity |
| `cat` | the cat's entity |
| `tables[]` | per-table `{x, y, tag, items[]}`; items are cups/plates on the table |
| `seats[]` | all sittable spots `{x, y, facing, table, side, armchair, taken}` |
| `counterCups[]` | finished orders waiting at the pass `{x, y, kind, owner}` |
| `particles[]` | steam wisps and fire sparks |
| `brew` | `{active, stage}` — drives the espresso machine's light/stream drawing |
| `captionQueue[]` / `activeCaption` | narration pipeline |

## Frame flow (main.js)

```
requestAnimationFrame:
  dt = clamp(elapsed, 0, 0.1)
  SIM.update(world, dt)        // clock → weather → door → spawning → barista
                               // → patrons → cat → particles → captions
  SND.update(dt, world)        // rain gain, fire crackles, music box notes
  render():                    // all drawing targets the 960×600 master canvas
    SCENE.drawScene(g, world)          // blit static-background cache, then the
                                       // dynamic layer: window/door/wall frame/
                                       // lamps/flames/clock hands/candles/machine
    drawables = SCENE.furnitureDrawables(world)  // tables, stools, armchair,
                 ++ SIM.entityDrawables(world)   // counter, plants + people, cat
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
barista has hand-built paths behind the counter (y = 280) and exits through
the gap at `L.baristaExitX = 610`.

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
