# Art — pixel style guide & layout map

All art is drawn programmatically in `js/scene.js` — no image assets. The
canvas is a fixed **480×270** back-buffer scaled up with
`image-rendering: pixelated` (16:9, letterboxed by CSS).

## Style rules

- **Whole pixels only.** Integer coordinates, `fillRect`-first drawing. The
  few ellipses (table tops, shadows, rug) read as soft shapes at this scale.
- **Chunky proportions.** People are ~11 px wide × 22 px tall (head nearly a
  third of that). The cat is ~12×9. Cuteness comes from big heads and tiny legs.
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
y=0 ─────────────────────────────────────────────── ceiling
  hanging lamps at x=159 and x=307 (cords from y=0)
y=24..88   window (x 62–150): sky, town silhouette, rain, sill plants
y=28..110  door (x 10–46), bell at (48,30)
y=28..110  fireplace breast (x 168–216): mantel y54 (clock, candles, plant),
           firebox x179–207 y66–106, hearth, firewood basket at x220
y=28..72   menu chalkboard (x 226–298) "CAFÉ HYGGE" + chalk doodle
y=34..62   two shelves (x 318–464): cups, jars, books, teapot, plates
y=86..112  espresso machine (x 322–358) — drawn in the background layer
y=110 ───────────────────────────────────────────── wall meets floor
y=112..156 counter (x 312–472): slab 112–126, front 126–156, baseline 156
           register x372, tip jar x394, pastry case x408–448, flowers x456
           serve spot (the pass) at (366,118)
y=122      Nora's walking line behind the counter (baristaHome 340,122)
y=166 ───── the walking lane (all pathing routes through here)
(348,168)  order spot; queue fans back-left; pickup at (366,168)
(158,174)  armchair (faces the fire), floor lamp at (143,166)
(96,192)   table 1 "by the window"     (205,200) table 2 "near the fire"
(130,242)  table 3                      (258,244) table 4
           each table: stools at ±22 x, seats face inward
rugs: fireplace rug (193,149), big rug (180,222)
plants: (296,174) and (462,184); coat stand near door at (56,148)
y=270 ───────────────────────────────────────────── bottom
```

## Depth model (painter's algorithm)

Every furniture piece and character is a `{y, draw}` drawable; the list is
sorted by baseline `y` (feet / front edge) each frame and drawn in order.
Rules that keep it looking right:

- **Background layer** (drawScene) = anything wall-mounted or behind
  everything: wall, window, door, fireplace, menu, shelves, machine, rugs.
- **Stools** get baseline just *under* their sitter (stable sort + furniture-
  first push order breaks the tie), so sitters overlap the stool.
- **Tables** get baseline `cy+16` so tabletops overlap a sitter's knees.
- **The counter** is one drawable at baseline 156: it hides the lower body of
  anyone standing behind it. That is why **Nora's y must stay 122** — head and
  torso above the slab (y 112–126), legs hidden. Lower and she vanishes.
- **The armchair is split**: back part (baseline 172) draws behind the sitter
  (y 174), the seat-front/armrest (baseline 180) draws in front — the sitter
  nestles *into* the chair.

## People (drawPerson)

Poses: `stand`, `walk` (2-frame leg swap + 1 px bob, 6 fps), `sit` (bent
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
   from `L`, and keep clear of the walking lane (y 166 ± 8).
4. Check occlusion at dawn/day/dusk/night (`__world.t` jumps) and with a
   patron seated nearby.
