# Art — pixel style guide & layout map

All art is drawn programmatically in `js/scene.js` — no image assets. The
scene renders to a **960×600 (16:10) master canvas**; a 16:9 window shows the
**960×540 crop starting at y=36**, and other aspects a variable crop (visible
height 540–600, width 936–960). The overscan strips — top 36 px (upper wall,
picture rail, lamp cords) and bottom 24 px (front floorboards) plus 12 px per
side — are **texture only, never content**. The viewport manager in main.js
cover-fits the window: integer device-pixel scales present pixelated
(1920×1080 and 1920×1200 fullscreen are both an exact ×2), fractional scales
via sharp-bilinear. The scene was migrated from the original 480×270 buffer
by the mechanical transform **x′ = 2x, y′ = 2y + 36** (see
docs/plans/native-resolution.md); art detail is still at the 480-era level
until the Phase 2 detail pass.

## Style rules

- **Whole pixels only.** Integer coordinates, `fillRect`-first drawing. The
  few ellipses (table tops, shadows, rug) read as soft shapes at this scale.
- **Chunky proportions.** People are ~22 px wide × 44 px tall (head nearly a
  third of that). The cat is ~24×18. Cuteness comes from big heads and tiny
  legs. Sprites are currently drawn on a 2 px grid (the mechanical ×2); the
  detail pass will start using the odd pixels.
- **Warm limited palette.** Woods and creams dominate; color accents come from
  clothing, the red armchair, plants, and pastry pinks. Reuse existing hexes
  before adding new ones.
- **Imperfection is charm**: flames wobble on layered sines, steam drifts on a
  sine, candles flicker with per-seed phase. Nothing should look mechanical.

## Core palette

| Use | Hex |
| --- | --- |
| Upper wall | `#e3cfa7` |
| Wainscot / window sill | `#6e4a33` (lines `#5f402c`) |
| Floor planks | `#9c6b43` (seams `#7d5334`) |
| Counter front / dark wood | `#6b4529`, `#5a3d28`, `#4a3222` |
| Counter slab / light wood | `#a8764a` (edge `#c08a58`) |
| Brick (fireplace) | `#7d4437` (mortar `#5f3229`) |
| Flames | `#e06a1e` → `#f5a83c` → `#f8dc8a` |
| Armchair | `#8a3d3d` (highlights `#a05252`) |
| Rugs | `#a34d3b` / `#8f5a3a` |
| Crockery | `#e8e0d0`, saucers `#d9d2c0` |
| Cat | `#d98d4a`, stripes `#b5702e`, chest `#f0e0c8` |
| Metal / machine | `#b8bfc7`, dark `#3c414d` |
| Chalk / caption text | `#e8dfc9` / `rgba(240,225,195,·)` |

Time-of-day sky colors live in the `DAYKEYS` table (see world.md).

## Layout map (`SCENE.L` — the single source of truth)

```
y=0 ─────────────────────────────────────────────── master top (16:9 overscan)
  picture rail at y≈28; hanging lamps at x=318 and x=614 (cords from y=0)
y=36 ────────────────────────────────────────────── 16:9 crop top
y=84..212  window (x 124–300): sky, town silhouette, rain, sill plants
y=92..256  door (x 20–92), bell at (96,96)
y=92..256  fireplace breast (x 336–432): mantel y144 (clock, candles, plant),
           firebox x358–414 y168–248, hearth, firewood basket at x440
y=92..180  menu chalkboard (x 452–596) "CAFÉ HYGGE" + chalk doodle
y=104..162 two shelves (x 636–928): cups, jars, books, teapot, plates
y=208..260 espresso machine (x 644–716) — drawn in the background layer
y=256 ───────────────────────────────────────────── wall meets floor
y=260..348 counter (x 624–944): slab 260–288, front 288–348, baseline 348
           register x744, tip jar x788, pastry case x816–896, flowers x912
           serve spot (the pass) at (732,272)
y=280      Nora's walking line behind the counter (baristaHome 680,280)
y=368 ───── the walking lane (all pathing routes through here)
(696,372)  order spot; queue fans back-left; pickup at (732,372)
(316,384)  armchair (faces the fire), floor lamp at (286,368)
(192,420)  table 1 "by the window"     (410,436) table 2 "near the fire"
(260,520)  table 3                      (516,524) table 4
           each table: stools at ±44 x, seats face inward
rugs: fireplace rug (386,334), big rug (360,480)
plants: (592,384) and (924,404); coat stand near door at (112,332)
y=576 ───────────────────────────────────────────── 16:9 crop bottom
y=600 ───────────────────────────────────────────── master bottom (overscan)
```

## Depth model (painter's algorithm)

Every furniture piece and character is a `{y, draw}` drawable; the list is
sorted by baseline `y` (feet / front edge) each frame and drawn in order.
Rules that keep it looking right:

- **Background layer** (drawScene) = anything wall-mounted or behind
  everything: wall, window, door, fireplace, menu, shelves, machine, rugs.
  Static parts render once into an offscreen cache; the window, door, wall
  frame, hanging lamps, flames, clock hands, candle flames and machine are
  painted over it every frame (in that order — it preserves the old one-pass
  overlap behavior; the wall frame must paint after the window frame edge).
- **Stools** get baseline just *under* their sitter (stable sort + furniture-
  first push order breaks the tie), so sitters overlap the stool.
- **Tables** get baseline `cy+32` so tabletops overlap a sitter's knees.
- **The counter** is one drawable at baseline 348: it hides the lower body of
  anyone standing behind it. That is why **Nora's y must stay 280** — head and
  torso above the slab (y 260–288), legs hidden. Lower and she vanishes.
- **The armchair is split**: back part (baseline 380) draws behind the sitter
  (y 384), the seat-front/armrest (baseline 396) draws in front — the sitter
  nestles *into* the chair.

## People (drawPerson)

Poses: `stand`, `walk` (2-frame leg swap + 2 px bob, 6 fps), `sit` (bent
legs, lowered head). Options per character: scarf row, long hair, apron
(Nora), `holding` (`cup`/`plate`/`cloth`), `armUp` 0–1 (sip animation lifts
the cup toward the face), `reading` (open book replaces held items while
seated). Facing is ±1 (side profile both ways); the eye pixel and hair-back
column flip with it.

## Lighting & effects

See world.md for the lighting pass. When adding art, remember: warm glows are
*additive* and cheap — a new lamp needs a `glow()` call in `drawLighting`
scaled by `pal.lamp`. Speech bubbles/captions draw after lighting on purpose.

## Adding furniture — checklist

1. Coordinates into `SCENE.L` (never inline).
2. Wall-mounted → draw in `drawScene`. Floor-standing → push a drawable with a
   correct baseline in `furnitureDrawables`.
3. If characters use it, add seat entries / path targets in sim.js reading
   from `L`, and keep clear of the walking lane (y 368 ± 16).
4. Keep it out of the overscan strips (y < 36, y > 576, x < 12, x > 948) —
   they may be cropped on 16:9 displays.
5. Check occlusion at dawn/day/dusk/night (`__world.t` jumps) and with a
   patron seated nearby.
